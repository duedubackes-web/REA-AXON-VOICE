import { createRenderLedger, reserveRender, applyRenderEvent, renderQuoteFingerprint, renderSupportSnapshot } from '../agent/lib/render-jobs.ts';

// Synthetic values only: this demo calls no provider and moves no real credits.
const quote = {
  id: 'demo-quote', provider: 'local-simulation', model: 'example-model', channel: 'api' as const,
  durationSeconds: 5, resolution: '720p', costCredits: 10,
  expiresAt: 2000, policyVersion: 'demo-v1', parametersHash: 'b'.repeat(64),
};
let ledger = reserveRender(createRenderLedger(100), {
  jobId: 'demo-job', operationKey: 'demo-operation', quote,
  approvedQuoteId: quote.id, approvedQuoteFingerprint: renderQuoteFingerprint(quote),
  maximumCredits: 10, now: 1000,
}).state;
const stages: unknown[] = [];
const record = (label: string) => stages.push({
  label, status: ledger.jobs[0].status,
  available: ledger.availableCredits, held: ledger.heldCredits, captured: ledger.capturedCredits,
});
record('Reserva local');
ledger = applyRenderEvent(ledger, { eventId: 'dispatch', jobId: 'demo-job', kind: 'dispatch', at: 1100 });
ledger = applyRenderEvent(ledger, { eventId: 'timeout', jobId: 'demo-job', kind: 'timeout', at: 1200 });
record('Timeout simulado: consultar o provedor antes de repetir');
ledger = applyRenderEvent(ledger, { eventId: 'late-result', jobId: 'demo-job', kind: 'succeeded', at: 1300, providerJobId: 'simulated-provider-job' });
record('Sucesso tardio simulado');
ledger = applyRenderEvent(ledger, { eventId: 'duplicate-result', jobId: 'demo-job', kind: 'succeeded', at: 1400, providerJobId: 'simulated-provider-job' });
record('Notificação duplicada: captura não se repete');
console.log(JSON.stringify({ notice: 'Simulação local. Nenhuma chamada externa, cobrança ou geração real.', stages, support: renderSupportSnapshot(ledger, 'demo-job') }, null, 2));
