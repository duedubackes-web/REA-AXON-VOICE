import { z } from 'zod';

const cents = z.number().int().min(0).max(1_000_000_000);
const bps = z.number().int().min(0).max(9999);
export const costInputSchema = z.object({
  generationCents: cents, editingMinutes: z.number().int().min(0).max(100000),
  hourlyRateCents: cents, otherCents: cents, contingencyBps: bps,
  paymentFeeBps: bps, taxBps: bps, targetMarginBps: bps,
  salePriceCents: cents.nullable(), depositBps: z.number().int().min(0).max(10000),
}).strict();
export type CostInput = z.infer<typeof costInputSchema>;
export const scopeSchema = z.object({
  clips: z.number().int().min(1).max(100), seconds: z.number().int().min(1).max(180),
  formats: z.array(z.enum(['9:16', '1:1', '16:9'])).min(1).max(3),
  revisions: z.number().int().min(0).max(10), deliveryBusinessDays: z.number().int().min(1).max(90),
}).strict();
export type Scope = z.infer<typeof scopeSchema>;
export const segmentSchema = z.enum(['business', 'agency', 'creator']);
export type Stage = 'lead' | 'proposal' | 'accepted' | 'production' | 'review' | 'delivered' | 'lost';
export const stageLabels: Record<Stage, string> = {
  lead: 'Briefing', proposal: 'Proposta', accepted: 'Aceito', production: 'Produção',
  review: 'Revisão', delivered: 'Entregue', lost: 'Não fechado',
};

function integer(value: bigint) {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Valor fora do limite de cálculo.');
  return Number(value);
}
const ceilRatio = (a: number, b: number, d: number) => integer((BigInt(a) * BigInt(b) + BigInt(d) - 1n) / BigInt(d));
export function parseMoney(value: string): number {
  const clean = value.trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(clean)) throw new Error('Informe um valor válido, sem separador de milhar.');
  const [whole, fraction = ''] = clean.replace(',', '.').split('.');
  return cents.parse(integer(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))));
}
export const parsePercent = (value: string) => z.number().int().min(0).max(10000).parse(parseMoney(value));
export const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
export function businessDate(at: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(at));
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function calculateQuote(raw: CostInput) {
  const input = costInputSchema.parse(raw);
  const deductionBps = input.paymentFeeBps + input.taxBps;
  const denominator = 10000 - deductionBps - input.targetMarginBps;
  if (denominator <= 0) throw new Error('Taxas, tributos e margem devem somar menos de 100%.');
  const laborCents = ceilRatio(input.editingMinutes, input.hourlyRateCents, 60);
  const baseCostCents = input.generationCents + laborCents + input.otherCents;
  if (!Number.isSafeInteger(baseCostCents) || baseCostCents <= 0) throw new Error('Informe os custos estimados de produção.');
  const contingencyCents = ceilRatio(baseCostCents, input.contingencyBps, 10000);
  const totalCostCents = baseCostCents + contingencyCents;
  function amounts(price: number) {
    const feeAndTaxCents = ceilRatio(price, deductionBps, 10000);
    const contributionCents = price - feeAndTaxCents - totalCostCents;
    const marginBps = contributionCents < 0 ? -Math.ceil(-contributionCents * 10000 / price) : integer(BigInt(contributionCents) * 10000n / BigInt(price));
    return { feeAndTaxCents, contributionCents, marginBps };
  }
  let minimumPriceCents = ceilRatio(totalCostCents, 10000, denominator);
  // Reconcile cent rounding with the displayed contribution margin.
  while (amounts(minimumPriceCents).marginBps < input.targetMarginBps) minimumPriceCents++;
  cents.parse(minimumPriceCents);
  const priceCents = input.salePriceCents ?? minimumPriceCents;
  if (priceCents <= 0) throw new Error('O preço da proposta deve ser maior que zero.');
  const totals = amounts(priceCents);
  return {
    laborCents, baseCostCents, contingencyCents, totalCostCents, minimumPriceCents, priceCents,
    ...totals, belowTarget: totals.marginBps < input.targetMarginBps,
    depositCents: ceilRatio(priceCents, input.depositBps, 10000),
  };
}
export type QuoteTotals = ReturnType<typeof calculateQuote>;
const totalsSchema = z.object({
  laborCents: cents, baseCostCents: cents, contingencyCents: cents, totalCostCents: cents,
  minimumPriceCents: cents, priceCents: cents, feeAndTaxCents: cents,
  contributionCents: z.number().int(), marginBps: z.number().int(), belowTarget: z.boolean(), depositCents: cents,
}).strict();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => {
  const parsed = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === s;
}, 'Data inválida.');
const timestamp = z.string().datetime();
const proposalSchema = z.object({
  version: z.number().int().positive(), createdAt: timestamp, validUntil: date,
  clientName: z.string().trim().min(1).max(160), title: z.string().trim().min(1).max(180), brief: z.string().trim().min(1).max(5000),
  scope: scopeSchema, costs: costInputSchema, totals: totalsSchema,
}).strict();
const receiptSchema = z.object({ id: z.string().min(1), at: timestamp, amountCents: cents, reference: z.string().trim().min(1).max(300) }).strict();
export const opportunitySchema = z.object({
  id: z.string().min(1).max(160), createdAt: timestamp, clientName: z.string().trim().min(1).max(160),
  contact: z.string().max(300), title: z.string().trim().min(1).max(180), brief: z.string().trim().min(1).max(5000),
  segment: segmentSchema, stage: z.enum(['lead', 'proposal', 'accepted', 'production', 'review', 'delivered', 'lost']),
  proposals: z.array(proposalSchema).max(100),
  receipts: z.array(receiptSchema).max(1000),
  deliveryUrl: z.string().max(2000), actualCostCents: cents.nullable(),
  history: z.array(z.object({ at: timestamp, action: z.string().max(200), source: z.literal('operator') }).strict()).max(5000),
}).strict();
export type Opportunity = z.infer<typeof opportunitySchema>;
export const snapshotSchema = z.object({ version: z.literal(1), opportunities: z.array(opportunitySchema).max(2000) }).strict();
export type DeskSnapshot = z.infer<typeof snapshotSchema>;
export const emptyDesk = (): DeskSnapshot => ({ version: 1, opportunities: [] });
export const latestProposal = (o: Opportunity) => o.proposals.at(-1) ?? null;
export const receivedCents = (o: Opportunity) => o.receipts.reduce((total, r) => total + r.amountCents, 0);

export function createOpportunity(raw: { id: string; clientName: string; contact: string; title: string; brief: string; segment: z.infer<typeof segmentSchema> }, at: string): Opportunity {
  return opportunitySchema.parse({ ...raw, createdAt: at, stage: 'lead', proposals: [], receipts: [], deliveryUrl: '', actualCostCents: null, history: [{ at, action: 'Briefing registrado', source: 'operator' }] });
}
export function addProposal(opportunity: Opportunity, raw: { scope: Scope; costs: CostInput; validUntil: string }, at: string): Opportunity {
  const next = opportunitySchema.parse(structuredClone(opportunity));
  if (!['lead', 'proposal'].includes(next.stage)) throw new Error('A proposta aceita está congelada. Registre novos escopos em outra oportunidade.');
  date.parse(raw.validUntil); timestamp.parse(at);
  if (raw.validUntil < businessDate(at)) throw new Error('A validade da proposta já passou.');
  const scope = scopeSchema.parse(raw.scope); scope.formats = [...new Set(scope.formats)];
  const costs = costInputSchema.parse(raw.costs);
  const totals = calculateQuote(costs);
  if (totals.belowTarget) throw new Error('O preço está abaixo da margem-alvo. Ajuste o preço ou a meta.');
  next.proposals.push({ version: next.proposals.length + 1, createdAt: at, validUntil: raw.validUntil, clientName: next.clientName, title: next.title, brief: next.brief, scope, costs, totals });
  next.stage = 'proposal';
  next.history.push({ at, action: `Proposta v${next.proposals.length} preparada`, source: 'operator' });
  return opportunitySchema.parse(next);
}
export function recordReceipt(opportunity: Opportunity, receipt: { id: string; at: string; amountCents: number; reference: string }): Opportunity {
  const next = opportunitySchema.parse(structuredClone(opportunity));
  receipt = receiptSchema.parse(receipt);
  if (!['accepted', 'production', 'review'].includes(next.stage)) throw new Error('Registre o aceite antes de informar recebimentos.');
  const proposal = latestProposal(next)!;
  const duplicate = next.receipts.find(r => r.id === receipt.id);
  if (duplicate) {
    if (JSON.stringify(duplicate) !== JSON.stringify(receipt)) throw new Error('Registro de recebimento em conflito.');
    return next;
  }
  cents.positive().parse(receipt.amountCents);
  if (receivedCents(next) + receipt.amountCents > proposal.totals.priceCents) throw new Error('O recebimento excede o saldo da proposta.');
  next.receipts.push(receipt);
  next.history.push({ at: receipt.at, action: 'Recebimento informado manualmente', source: 'operator' });
  return opportunitySchema.parse(next);
}
function validateDelivery(url: string) {
  try { const parsed = new URL(url); if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error(); }
  catch { throw new Error('Informe um link HTTPS de revisão ou entrega.'); }
}
export function moveStage(opportunity: Opportunity, stage: Stage, at: string, deliveryUrl?: string): Opportunity {
  const next = opportunitySchema.parse(structuredClone(opportunity)); timestamp.parse(at);
  if (next.stage === stage) {
    if (deliveryUrl && deliveryUrl !== next.deliveryUrl && ['review', 'delivered'].includes(stage)) {
      validateDelivery(deliveryUrl); next.deliveryUrl = deliveryUrl;
      next.history.push({ at, action: 'Link do material atualizado', source: 'operator' });
    }
    return next;
  }
  const allowed: Record<Stage, Stage[]> = { lead: ['lost'], proposal: ['accepted', 'lost'], accepted: ['production'], production: ['review'], review: ['delivered'], delivered: [], lost: [] };
  if (!allowed[next.stage].includes(stage)) throw new Error('Conclua as etapas anteriores antes de avançar.');
  const proposal = latestProposal(next);
  if (stage === 'accepted' && (!proposal || proposal.validUntil < businessDate(at))) throw new Error('A proposta venceu. Prepare uma nova versão.');
  if (stage === 'production' && receivedCents(next) < proposal!.totals.depositCents) throw new Error('Registre a entrada combinada antes de iniciar a produção.');
  if (stage === 'review' || stage === 'delivered') {
    validateDelivery(deliveryUrl || next.deliveryUrl);
    next.deliveryUrl = deliveryUrl || next.deliveryUrl;
  }
  if (stage === 'delivered' && receivedCents(next) < proposal!.totals.priceCents) throw new Error('Existe saldo em aberto. Registre o recebimento antes da entrega final.');
  next.stage = stage;
  next.history.push({ at, action: `${stageLabels[stage]} registrado manualmente`, source: 'operator' });
  return opportunitySchema.parse(next);
}
export function setActualCost(opportunity: Opportunity, actualCostCents: number, at: string): Opportunity {
  timestamp.parse(at);
  const next = opportunitySchema.parse({ ...structuredClone(opportunity), actualCostCents: cents.parse(actualCostCents) });
  next.history.push({ at, action: 'Custo realizado informado manualmente', source: 'operator' });
  return next;
}
export function importSnapshot(raw: unknown): DeskSnapshot {
  const parsed = snapshotSchema.parse(raw);
  if (new Set(parsed.opportunities.map(o => o.id)).size !== parsed.opportunities.length) throw new Error('O arquivo contém IDs repetidos.');
  for (const o of parsed.opportunities) {
    if (o.stage !== 'lead' && o.stage !== 'lost' && !o.proposals.length) throw new Error('Oportunidade sem proposta.');
    for (const [index, p] of o.proposals.entries()) {
      if (p.version !== index + 1 || p.totals.belowTarget || JSON.stringify(calculateQuote(p.costs)) !== JSON.stringify(p.totals)) throw new Error('A proposta contém cálculos inconsistentes.');
    }
    const proposal = latestProposal(o);
    if (o.receipts.length && (!proposal || receivedCents(o) > proposal.totals.priceCents)) throw new Error('Recebimentos inconsistentes.');
    if (new Set(o.receipts.map(r => r.id)).size !== o.receipts.length) throw new Error('Recebimento duplicado.');
    if (o.receipts.length && ['lead', 'proposal', 'lost'].includes(o.stage)) throw new Error('Recebimento sem aceite.');
    if (['production', 'review', 'delivered'].includes(o.stage) && receivedCents(o) < proposal!.totals.depositCents) throw new Error('Produção sem entrada informada.');
    if (['review', 'delivered'].includes(o.stage)) validateDelivery(o.deliveryUrl);
    if (o.stage === 'delivered' && receivedCents(o) !== proposal!.totals.priceCents) throw new Error('Entrega com saldo em aberto.');
  }
  return parsed;
}
export function deskMetrics(opportunities: Opportunity[]) {
  const contracted = opportunities.filter(o => ['accepted', 'production', 'review', 'delivered'].includes(o.stage));
  return {
    activeCount: opportunities.filter(o => !['delivered', 'lost'].includes(o.stage)).length,
    contractedCents: contracted.reduce((sum, o) => sum + latestProposal(o)!.totals.priceCents, 0),
    receivedCents: opportunities.reduce((sum, o) => sum + receivedCents(o), 0),
    openBalanceCents: contracted.reduce((sum, o) => sum + latestProposal(o)!.totals.priceCents - receivedCents(o), 0),
    realizedContributionCents: opportunities.filter(o => o.stage === 'delivered' && o.actualCostCents !== null).reduce((sum, o) => sum + receivedCents(o) - o.actualCostCents!, 0),
    measuredDeliveries: opportunities.filter(o => o.stage === 'delivered' && o.actualCostCents !== null).length,
  };
}
export function proposalText(o: Opportunity): string {
  const p = latestProposal(o); if (!p) throw new Error('Prepare uma proposta primeiro.');
  return [
    'AXON VOICE — PROPOSTA DE PRODUÇÃO AUDIOVISUAL', `Proposta ${o.id} / versão ${p.version}`,
    `Cliente: ${p.clientName}`, `Projeto: ${p.title}`, '', 'OBJETIVO', p.brief, '', 'ESCOPO',
    `${p.scope.clips} vídeo(s) de até ${p.scope.seconds} segundos. Formatos: ${p.scope.formats.join(', ')}.`,
    `${p.scope.revisions} rodada(s) de ajustes dentro do briefing aprovado.`,
    `Prazo: ${p.scope.deliveryBusinessDays} dias úteis após briefing, materiais e entrada combinada.`,
    'Produção assistida por IA, com seleção e revisão humana. Não inclui veiculação ou verba de anúncios.', '',
    `Valor total: ${brl(p.totals.priceCents)}`, `Entrada: ${brl(p.totals.depositCents)}`,
    `Saldo antes da entrega final: ${brl(p.totals.priceCents - p.totals.depositCents)}`,
    `Proposta válida até: ${p.validUntil.split('-').reverse().join('/')}`, '',
    'Mudanças de escopo, materiais ou quantidade de revisões exigem nova negociação.',
    'O cliente deve fornecer materiais autorizados e revisar informações de marca e oferta.',
    'O início da produção depende da confirmação das condições. Este documento não confirma aceite nem pagamento.',
  ].join('\n');
}
