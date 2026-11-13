import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMoney, calculateQuote, createOpportunity, addProposal, moveStage, recordReceipt, setActualCost, deskMetrics, importSnapshot, proposalText, businessDate, type CostInput, type Opportunity } from '../web/commercial/src/domain.ts';
const at = '2026-11-13T15:00:00.000Z';
const costs: CostInput = { generationCents: 3000, editingMinutes: 120, hourlyRateCents: 5000, otherCents: 1000, contingencyBps: 1000, paymentFeeBps: 300, taxBps: 600, targetMarginBps: 3500, salePriceCents: null, depositBps: 5000 };
const scope = { clips: 3, seconds: 15, formats: ['9:16'] as ('9:16')[], revisions: 1, deliveryBusinessDays: 5 };
const lead = () => createOpportunity({ id: 'project-one', clientName: 'Cliente de teste', contact: 'Contato informado pelo operador', title: 'Lançamento', brief: 'Apresentar produto com material autorizado.', segment: 'business' }, at);
const proposed = () => addProposal(lead(), { scope, costs, validUntil: '2026-11-20' }, at);
const accepted = () => moveStage(proposed(), 'accepted', at);
const receipt = (amountCents: number, id = 'receipt-one') => ({ id, at, amountCents, reference: 'Recebimento conferido pelo operador' });
const snapshot = (o: Opportunity) => ({ version: 1, opportunities: [o] });

test('money parser accepts decimal comma without binary rounding and rejects ambiguous values', () => {
  assert.equal(parseMoney('123,45'), 12345);
  assert.equal(parseMoney('0.01'), 1);
  for (const bad of ['1.234,56', '1,234', '-1', '1e3', 'Infinity', '']) assert.throws(() => parseMoney(bad));
});
test('pricing includes labor, contingency and gross percentage deductions; suggestion meets margin', () => {
  const q = calculateQuote(costs);
  assert.equal(q.laborCents, 10000);
  assert.equal(q.baseCostCents, 14000);
  assert.equal(q.contingencyCents, 1400);
  assert.equal(q.totalCostCents, 15400);
  assert.ok(q.marginBps >= costs.targetMarginBps);
  assert.equal(q.priceCents, q.feeAndTaxCents + q.contributionCents + q.totalCostCents);
  assert.equal(q.depositCents, Math.ceil(q.priceCents / 2));
  assert.equal(calculateQuote({ ...costs, salePriceCents: 100 }).belowTarget, true);
});
test('impossible margins and zero costs do not produce attractive but invalid quotes', () => {
  assert.throws(() => calculateQuote({ ...costs, targetMarginBps: 9100 }), /menos de 100/);
  assert.throws(() => calculateQuote({ ...costs, generationCents: 0, editingMinutes: 0, otherCents: 0 }), /custos estimados/);
  assert.throws(() => addProposal(lead(), { scope, costs: { ...costs, salePriceCents: 100 }, validUntil: '2026-11-20' }, at), /margem-alvo/);
});
test('proposals are versioned and accepted terms cannot be silently replaced', () => {
  const first = proposed();
  const second = addProposal(first, { scope: { ...scope, clips: 4 }, costs, validUntil: '2026-11-21' }, at);
  assert.equal(first.proposals.length, 1);
  assert.equal(second.proposals.length, 2);
  assert.equal(second.proposals[0].scope.clips, 3);
  assert.throws(() => addProposal(accepted(), { scope, costs, validUntil: '2026-11-20' }, at), /congelada/);
});
test('quote expiry follows Sao Paulo date, including after UTC midnight', () => {
  const late = '2026-11-14T01:00:00.000Z';
  assert.equal(businessDate(late), '2026-11-13');
  const p = addProposal(lead(), { scope, costs, validUntil: '2026-11-13' }, late);
  assert.equal(moveStage(p, 'accepted', late).stage, 'accepted');
  assert.throws(() => moveStage(p, 'accepted', '2026-11-14T15:00:00.000Z'), /venceu/);
});
test('production and final delivery require the recorded agreed receipts', () => {
  let o = accepted(); const p = o.proposals[0];
  assert.throws(() => moveStage(o, 'production', at), /entrada/);
  o = recordReceipt(o, receipt(p.totals.depositCents));
  o = moveStage(o, 'production', at);
  assert.throws(() => moveStage(o, 'review', at, 'javascript:alert(1)'), /HTTPS/);
  o = moveStage(o, 'review', at, 'https://example.com/review');
  assert.throws(() => moveStage(o, 'delivered', at), /saldo em aberto/);
  o = recordReceipt(o, receipt(p.totals.priceCents - p.totals.depositCents, 'receipt-two'));
  o = setActualCost(o, 17000, at);
  o = moveStage(o, 'delivered', at);
  const metrics = deskMetrics([o]);
  assert.equal(metrics.openBalanceCents, 0);
  assert.equal(metrics.measuredDeliveries, 1);
  assert.equal(metrics.realizedContributionCents, p.totals.priceCents - 17000);
});
test('duplicate manual receipt is idempotent and overpayment is rejected', () => {
  const a = accepted(); const r = receipt(1000);
  const once = recordReceipt(a, r);
  assert.deepEqual(recordReceipt(once, { reference: r.reference, amountCents: r.amountCents, at: r.at, id: r.id }), once);
  assert.throws(() => recordReceipt(once, { ...r, amountCents: 1001 }), /conflito/);
  assert.throws(() => recordReceipt(once, receipt(a.proposals[0].totals.priceCents, 'over')), /excede/);
});
test('customer proposal exports scope and price without internal costs or margin', () => {
  const p = proposed(); const document = proposalText(p);
  assert.match(document, /3 vídeo/);
  assert.match(document, /Entrada:/);
  assert.match(document, /não confirma aceite nem pagamento/);
  assert.doesNotMatch(document, /margem|hourlyRate|generationCents|15400|reserva de imprevistos/i);
});
test('backup import checks recalculation, duplicate IDs and impossible delivery state', () => {
  const o = proposed();
  assert.deepEqual(importSnapshot(JSON.parse(JSON.stringify(snapshot(o)))).opportunities[0], o);
  const tampered = structuredClone(o); tampered.proposals[0].totals.priceCents = 1;
  assert.throws(() => importSnapshot(snapshot(tampered)), /inconsistentes/);
  assert.throws(() => importSnapshot({ version: 1, opportunities: [o, o] }), /IDs repetidos/);
  assert.throws(() => importSnapshot(snapshot({ ...o, stage: 'delivered', deliveryUrl: 'https://example.com/final' })), /entrada/);
});
test('unaccepted proposals are not counted as contracts, receipts or realized contribution', () => {
  const metrics = deskMetrics([proposed()]);
  assert.equal(metrics.contractedCents, 0); assert.equal(metrics.receivedCents, 0);
  assert.equal(metrics.openBalanceCents, 0); assert.equal(metrics.measuredDeliveries, 0);
});
