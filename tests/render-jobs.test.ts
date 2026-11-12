import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRenderEvent, createRenderLedger, reserveRender, renderSupportSnapshot, renderQuoteFingerprint, type RenderLedger, type RenderEvent } from '../agent/lib/render-jobs.ts';

const quote = { id: 'q1', provider: 'test-provider', model: 'test-model', channel: 'api' as const, durationSeconds: 5, resolution: '720p', costCredits: 10, expiresAt: 2000, policyVersion: 'v1', parametersHash: 'a'.repeat(64) };
const request = { jobId: 'j1', operationKey: 'op1', quote, approvedQuoteId: 'q1', approvedQuoteFingerprint: renderQuoteFingerprint(quote), maximumCredits: 10, now: 1000 };
const reserve = () => reserveRender(createRenderLedger(100), request).state;
const event = (kind: RenderEvent['kind'], eventId: string = kind): RenderEvent => ({ eventId, jobId: 'j1', kind, at: 1100, ...(['queued', 'processing', 'succeeded', 'failed', 'cancelled'].includes(kind) ? { providerJobId: 'remote-1' } : {}) });
const dispatch = (state = reserve()) => applyRenderEvent(state, event('dispatch'));
const assertBalance = (state: RenderLedger, available: number, held: number, captured: number) => {
  assert.deepEqual([state.availableCredits, state.heldCredits, state.capturedCredits], [available, held, captured]);
  assert.equal(available + held + captured, state.fundedCredits);
};

test('reservation is not a charge and repeated click reserves only once', () => {
  const first = reserveRender(createRenderLedger(100), request);
  assertBalance(first.state, 90, 10, 0);
  const again = reserveRender(first.state, { ...request, jobId: 'another-ui-id' });
  assert.equal(again.reused, true);
  assert.equal(again.job.id, 'j1');
  assert.equal(again.state.jobs.length, 1);
  assertBalance(again.state, 90, 10, 0);
});
test('changed quote or API channel cannot reuse the prior operation', () => {
  assert.throws(() => reserveRender(reserve(), { ...request, quote: { ...quote, channel: 'web' } }), /idempotency_conflict/);
  assert.throws(() => reserveRender(reserve(), { ...request, quote: { ...quote, costCredits: 20 } }), /idempotency_conflict/);
});
test('quotes expire at the deadline and require approval of the exact quote', () => {
  assert.throws(() => reserveRender(createRenderLedger(100), { ...request, now: 2000 }), /quote_expired/);
  assert.throws(() => reserveRender(createRenderLedger(100), { ...request, approvedQuoteId: 'other' }), /quote_not_approved/);
  assert.throws(() => reserveRender(createRenderLedger(100), { ...request, quote: { ...quote, costCredits: 9 } }), /quote_not_approved/);
});
test('budget, available credits and safe integer amounts are enforced before reservation', () => {
  assert.throws(() => reserveRender(createRenderLedger(100), { ...request, maximumCredits: 9 }), /budget_exceeded/);
  assert.throws(() => reserveRender(createRenderLedger(9), request), /insufficient_credits/);
  assert.throws(() => createRenderLedger(0.5));
  assert.throws(() => createRenderLedger(Number.MAX_SAFE_INTEGER + 1));
});
test('reserved local work can cancel before dispatch, releasing once', () => {
  const state = applyRenderEvent(reserve(), event('cancel'));
  assert.equal(state.jobs[0].status, 'cancelled');
  assertBalance(state, 100, 0, 0);
  assert.deepEqual(applyRenderEvent(state, event('cancel')), state);
});
test('cancellation after dispatch keeps the hold until provider confirmation', () => {
  const requested = applyRenderEvent(dispatch(), event('cancel'));
  assert.equal(requested.jobs[0].status, 'cancel_requested');
  assertBalance(requested, 90, 10, 0);
  assertBalance(applyRenderEvent(requested, event('cancelled')), 100, 0, 0);
});
test('timeout does not release credits or allow another submission', () => {
  const unknown = applyRenderEvent(dispatch(), event('timeout'));
  assert.equal(unknown.jobs[0].status, 'unknown');
  assertBalance(unknown, 90, 10, 0);
  assert.throws(() => applyRenderEvent(unknown, event('dispatch', 'retry')), /dispatch_not_allowed/);
  assert.equal(renderSupportSnapshot(unknown, 'j1').nextAction, 'reconcile_with_provider_do_not_resubmit');
});
test('late success after timeout captures the approved price once', () => {
  const unknown = applyRenderEvent(dispatch(), event('timeout'));
  const success = applyRenderEvent(unknown, event('succeeded'));
  assertBalance(success, 90, 0, 10);
  assert.deepEqual(applyRenderEvent(success, event('succeeded')), success);
  assertBalance(applyRenderEvent(success, event('succeeded', 'duplicate-notification')), 90, 0, 10);
});
test('confirmed failure releases the reservation once, even across JSON restoration', () => {
  const failed = applyRenderEvent(JSON.parse(JSON.stringify(dispatch())), event('failed'));
  assertBalance(failed, 100, 0, 0);
  assertBalance(applyRenderEvent(failed, event('failed', 'failure-again')), 100, 0, 0);
});
test('conflicting terminal result or reused event ID is rejected without modifying input', () => {
  const success = applyRenderEvent(dispatch(), event('succeeded'));
  assert.throws(() => applyRenderEvent(success, event('failed')), /terminal_result_conflict/);
  assert.throws(() => applyRenderEvent(success, { ...event('succeeded'), at: 1200 }), /event_id_conflict/);
  assertBalance(success, 90, 0, 10);
});
test('provider job binding and dispatch ordering are checked', () => {
  const queued = applyRenderEvent(dispatch(), event('queued'));
  assert.throws(() => applyRenderEvent(queued, { ...event('succeeded'), providerJobId: 'wrong-job' }), /provider_job_conflict/);
  assert.throws(() => applyRenderEvent(reserve(), event('succeeded')), /provider_result_before_dispatch/);
});
test('support snapshot includes policy and credit timeline without prompt or credentials', () => {
  const snapshot = renderSupportSnapshot(applyRenderEvent(dispatch(), event('processing')), 'j1');
  assert.equal(snapshot.policyVersion, 'v1');
  assert.equal(snapshot.channel, 'api');
  assert.equal(snapshot.creditStatus, 'held');
  assert.equal(snapshot.timeline[0].heldDelta, 10);
  assert.equal('prompt' in snapshot, false);
  assert.equal('credentials' in snapshot, false);
});
