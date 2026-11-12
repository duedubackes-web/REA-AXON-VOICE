import { createHash } from 'node:crypto';
import { z } from 'zod';

const credits = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const identifier = z.string().trim().min(1).max(160);
export const renderQuoteSchema = z.object({
  id: identifier,
  provider: identifier,
  model: identifier,
  channel: z.enum(['web', 'api', 'mcp']),
  durationSeconds: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  resolution: z.string().trim().min(1).max(80),
  costCredits: credits,
  expiresAt: credits,
  policyVersion: identifier,
  parametersHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type RenderQuote = z.infer<typeof renderQuoteSchema>;
export type RenderStatus = 'reserved' | 'dispatching' | 'queued' | 'processing' | 'unknown' | 'cancel_requested' | 'succeeded' | 'failed' | 'cancelled';
export interface RenderJob {
  id: string; operationKey: string; fingerprint: string; quote: RenderQuote;
  status: RenderStatus; providerJobId: string | null;
}
export interface AuditEntry {
  jobId: string; event: string; at: number;
  availableDelta: number; heldDelta: number; capturedDelta: number;
}
export interface RenderLedger {
  fundedCredits: number; availableCredits: number; heldCredits: number; capturedCredits: number;
  jobs: RenderJob[]; appliedEvents: { id: string; fingerprint: string }[]; audit: AuditEntry[];
}
const reserveInput = z.object({
  jobId: identifier, operationKey: identifier, quote: renderQuoteSchema,
  approvedQuoteId: identifier, approvedQuoteFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  maximumCredits: credits, now: credits,
}).strict();
export const renderEventSchema = z.object({
  eventId: identifier, jobId: identifier, at: credits,
  kind: z.enum(['dispatch', 'queued', 'processing', 'timeout', 'cancel', 'cancelled', 'succeeded', 'failed']),
  providerJobId: identifier.optional(),
}).strict();
export type RenderEvent = z.infer<typeof renderEventSchema>;
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const terminal = (status: RenderStatus) => ['succeeded', 'failed', 'cancelled'].includes(status);
export const renderQuoteFingerprint = (quote: RenderQuote) => digest(renderQuoteSchema.parse(quote));

export function createRenderLedger(fundedCredits: number): RenderLedger {
  credits.parse(fundedCredits);
  return { fundedCredits, availableCredits: fundedCredits, heldCredits: 0, capturedCredits: 0, jobs: [], appliedEvents: [], audit: [] };
}

/** Pure domain transitions, not a wallet service. The host must persist each
 * transition atomically per account, authenticate provider events and validate
 * provider quotes and human consent before calling these functions.
 * No tool exposes funding, approval or authoritative provider events to the model.
 */
export function reserveRender(state: RenderLedger, raw: z.infer<typeof reserveInput>) {
  const input = reserveInput.parse(raw);
  const fingerprint = digest(input.quote);
  const prior = state.jobs.find(j => j.operationKey === input.operationKey);
  if (prior) {
    if (prior.fingerprint !== fingerprint) throw new Error('idempotency_conflict');
    return { state: structuredClone(state), job: structuredClone(prior), reused: true };
  }
  if (state.jobs.some(j => j.id === input.jobId)) throw new Error('job_id_conflict');
  if (input.approvedQuoteId !== input.quote.id || input.approvedQuoteFingerprint !== fingerprint) throw new Error('quote_not_approved');
  if (input.now >= input.quote.expiresAt) throw new Error('quote_expired');
  if (input.quote.costCredits > input.maximumCredits) throw new Error('budget_exceeded');
  if (input.quote.costCredits > state.availableCredits) throw new Error('insufficient_credits');
  const next = structuredClone(state);
  const job: RenderJob = {
    id: input.jobId, operationKey: input.operationKey, fingerprint, quote: input.quote,
    status: 'reserved', providerJobId: null,
  };
  next.jobs.push(job);
  next.availableCredits -= input.quote.costCredits;
  next.heldCredits += input.quote.costCredits;
  next.audit.push({ jobId: job.id, event: 'reserved', at: input.now, availableDelta: -input.quote.costCredits, heldDelta: input.quote.costCredits, capturedDelta: 0 });
  return { state: next, job: structuredClone(job), reused: false };
}

export function applyRenderEvent(state: RenderLedger, raw: RenderEvent): RenderLedger {
  const event = renderEventSchema.parse(raw);
  const fingerprint = digest(event);
  const applied = state.appliedEvents.find(e => e.id === event.eventId);
  if (applied) {
    if (applied.fingerprint !== fingerprint) throw new Error('event_id_conflict');
    return structuredClone(state);
  }
  const next = structuredClone(state);
  const job = next.jobs.find(j => j.id === event.jobId);
  if (!job) throw new Error('job_not_found');
  if (event.providerJobId && job.providerJobId && event.providerJobId !== job.providerJobId) throw new Error('provider_job_conflict');
  const before = job.status;
  let after: RenderStatus;
  switch (event.kind) {
    case 'dispatch':
      if (before !== 'reserved') throw new Error('dispatch_not_allowed');
      after = 'dispatching'; break;
    case 'queued':
      if (!['dispatching', 'queued'].includes(before)) throw new Error('invalid_transition');
      if (!event.providerJobId && !job.providerJobId) throw new Error('provider_job_required');
      after = 'queued'; break;
    case 'processing':
      if (!['dispatching', 'queued', 'processing'].includes(before)) throw new Error('invalid_transition');
      if (!event.providerJobId && !job.providerJobId) throw new Error('provider_job_required');
      after = 'processing'; break;
    case 'timeout':
      if (before === 'reserved' || terminal(before)) throw new Error('invalid_transition');
      after = 'unknown'; break;
    case 'cancel':
      if (terminal(before)) throw new Error('invalid_transition');
      after = before === 'reserved' ? 'cancelled' : 'cancel_requested'; break;
    default:
      if (before === 'reserved') throw new Error('provider_result_before_dispatch');
      after = event.kind;
      if (!event.providerJobId && !job.providerJobId) throw new Error('provider_job_required');
      if (terminal(before) && before !== after) throw new Error('terminal_result_conflict');
  }
  let availableDelta = 0;
  let heldDelta = 0;
  let capturedDelta = 0;
  if (!terminal(before) && terminal(after)) {
    heldDelta = -job.quote.costCredits;
    if (after === 'succeeded') capturedDelta = job.quote.costCredits;
    else availableDelta = job.quote.costCredits;
    next.availableCredits += availableDelta;
    next.heldCredits += heldDelta;
    next.capturedCredits += capturedDelta;
  }
  job.status = after;
  if (event.providerJobId) job.providerJobId = event.providerJobId;
  next.appliedEvents.push({ id: event.eventId, fingerprint });
  next.audit.push({ jobId: job.id, event: event.kind, at: event.at, availableDelta, heldDelta, capturedDelta });
  if (next.availableCredits < 0 || next.heldCredits < 0 || next.capturedCredits < 0 ||
      next.availableCredits + next.heldCredits + next.capturedCredits !== next.fundedCredits) throw new Error('credit_invariant_failed');
  return next;
}

export function renderSupportSnapshot(state: RenderLedger, jobId: string) {
  const job = state.jobs.find(j => j.id === jobId);
  if (!job) throw new Error('job_not_found');
  return {
    jobId: job.id, providerJobId: job.providerJobId, status: job.status,
    provider: job.quote.provider, model: job.quote.model, channel: job.quote.channel,
    durationSeconds: job.quote.durationSeconds, resolution: job.quote.resolution,
    quotedCredits: job.quote.costCredits, policyVersion: job.quote.policyVersion,
    creditStatus: job.status === 'succeeded' ? 'captured' : terminal(job.status) ? 'released' : 'held',
    nextAction: job.status === 'unknown' || job.status === 'cancel_requested' ? 'reconcile_with_provider_do_not_resubmit' : 'inspect_timeline',
    timeline: state.audit.filter(e => e.jobId === jobId).map(e => ({ ...e })),
  };
}
