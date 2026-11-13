import { emptyDesk, importSnapshot, createOpportunity, calculateQuote, addProposal, moveStage, recordReceipt, setActualCost, latestProposal, receivedCents, deskMetrics, proposalText, stageLabels, parseMoney, parsePercent, brl, businessDate } from './src/domain.ts';

const key = 'axon-voice.commercial.v1';
const $ = selector => document.querySelector(selector);
let state = emptyDesk(), selectedId = null, filter = 'all', deliveryTarget = 'review';
let loadBlocked = false, rawStored = null;
let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 6500); }
function explain(error) { return error?.name === 'ZodError' ? 'Verifique os campos, limites e valores preenchidos.' : error?.message || 'Não foi possível concluir a operação.'; }
try { rawStored = localStorage.getItem(key); if (rawStored) state = importSnapshot(JSON.parse(rawStored)); }
catch { loadBlocked = true; toast('Não foi possível carregar o armazenamento. Exporte os dados originais e importe um backup válido antes de registrar novos dados.'); }
function persist(next, recovery = false) {
  if (loadBlocked && !recovery) throw new Error('O armazenamento precisa de recuperação. Exporte os dados originais e importe um backup válido.');
  const valid = importSnapshot(next);
  try { localStorage.setItem(key, JSON.stringify(valid)); }
  catch { throw new Error('Não foi possível salvar no navegador. Exporte um backup e verifique o espaço e as permissões de armazenamento.'); }
  state = valid; loadBlocked = false; render();
}
function replaceOpportunity(next) { persist({ ...state, opportunities: state.opportunities.map(o => o.id === next.id ? next : o) }); }
const selected = () => state.opportunities.find(o => o.id === selectedId);
const now = () => new Date().toISOString();
const dateLabel = value => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
function el(tag, className = '', text = '') { const node = document.createElement(tag); node.className = className; node.textContent = text; return node; }
function button(text, className, action) { const node = el('button', className, text); node.type = 'button'; node.addEventListener('click', () => { try { action(); } catch (error) { toast(explain(error)); } }); return node; }
function badge(stage) { return el('span', 'badge badge-' + stage, stageLabels[stage]); }
function download(name, content, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function openDialog(id) { const dialog = $(id); dialog.querySelector('.form-error').textContent = ''; dialog.showModal(); }
function openLead() { if (loadBlocked) { toast('Recupere o armazenamento importando um backup válido.'); return; } $('#lead-form').reset(); openDialog('#lead-dialog'); }
document.querySelectorAll('[data-close]').forEach(node => node.addEventListener('click', () => node.closest('dialog').close()));
$('#new-opportunity').addEventListener('click', openLead);
document.querySelectorAll('[data-view]').forEach(node => node.addEventListener('click', () => {
  document.querySelectorAll('[data-view]').forEach(n => n.classList.toggle('active', n === node));
  $('#desk-view').hidden = node.dataset.view !== 'desk'; $('#plan-view').hidden = node.dataset.view !== 'plan';
}));
$('#today').textContent = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
const fold = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
$('#search').addEventListener('input', renderList);

function render() {
  const m = deskMetrics(state.opportunities);
  $('#metric-contracted').textContent = brl(m.contractedCents); $('#metric-received').textContent = brl(m.receivedCents);
  $('#metric-balance').textContent = brl(m.openBalanceCents);
  $('#metric-contribution').textContent = m.measuredDeliveries ? brl(m.realizedContributionCents) : '—';
  $('#metric-contribution').classList.toggle('negative', m.realizedContributionCents < 0);
  $('#metric-measured').textContent = m.measuredDeliveries ? `${m.measuredDeliveries} entrega(s) com custo total informado` : 'Informe o custo total de uma entrega';
  $('#active-count').textContent = String(m.activeCount);
  const filters = $('#stage-filters'); filters.replaceChildren();
  for (const value of ['all', ...Object.keys(stageLabels)]) {
    const count = value === 'all' ? state.opportunities.length : state.opportunities.filter(o => o.stage === value).length;
    const node = button(value === 'all' ? 'Todas' : stageLabels[value], 'filter' + (filter === value ? ' active' : ''), () => { filter = value; selectedId = null; render(); });
    node.setAttribute('aria-pressed', String(filter === value)); node.append(el('small', '', String(count))); filters.append(node);
  }
  const pilot = $('#pilot-results'); pilot.replaceChildren();
  pilot.append(el('strong', '', `${state.opportunities.filter(o => o.proposals.length).length} / 3`), el('small', '', 'oportunidades com proposta'), el('strong', '', `${m.measuredDeliveries} / 1`), el('small', '', 'entregas com custo medido'));
  renderList(); renderDetail();
}
function renderList() {
  const list = $('#opportunity-list'); list.replaceChildren();
  const query = fold($('#search').value);
  const opportunities = state.opportunities.filter(o => (filter === 'all' || o.stage === filter) && fold(o.clientName + ' ' + o.title).includes(query)).toReversed();
  if (!opportunities.length) {
    const empty = el('article', 'empty-state');
    empty.append(el('div', 'empty-icon', '↗'), el('h3', '', state.opportunities.length ? 'Nenhuma oportunidade neste filtro.' : 'Vamos registrar a primeira oportunidade?'), el('p', '', state.opportunities.length ? 'Altere o filtro ou a busca para encontrar seus projetos.' : 'Comece com um cliente, um objetivo e os materiais disponíveis. Depois, transforme o briefing em uma proposta com escopo.'));
    if (!state.opportunities.length) empty.append(button('＋ Registrar briefing', 'button secondary', openLead)); list.append(empty); return;
  }
  for (const o of opportunities) {
    const card = button('', 'opportunity-card' + (selectedId === o.id ? ' selected' : ''), () => { selectedId = o.id; renderList(); renderDetail(); });
    const top = el('div', 'card-top'); top.append(el('span', 'client-name', o.clientName), badge(o.stage));
    const bottom = el('div', 'card-bottom'); const p = latestProposal(o);
    bottom.append(el('span', '', p ? `Proposta v${p.version}` : 'Aguardando proposta'), el('strong', '', p ? brl(p.totals.priceCents) : '—'));
    card.append(top, el('h3', '', o.title), bottom); list.append(card);
  }
}
function detailValue(grid, label, value) { const item = el('div'); item.append(el('dt', '', label), el('dd', '', value)); grid.append(item); }
function renderDetail() {
  const detail = $('#detail'); detail.replaceChildren(); const o = selected();
  detail.className = 'detail' + (o ? '' : ' empty');
  if (!o) { detail.append(el('div', 'empty-icon', '◈'), el('h3', '', 'Cada projeto tem seu próximo passo.'), el('p', '', 'Selecione uma oportunidade para preparar uma proposta, registrar o aceite e acompanhar a entrega.')); return; }
  detail.append(badge(o.stage), el('h2', '', o.title), el('div', 'small muted', o.clientName + (o.contact ? ' · ' + o.contact : '')), el('p', 'brief', o.brief));
  const p = latestProposal(o); const grid = el('dl', 'details-grid');
  if (p) {
    detailValue(grid, 'Pacote proposto', brl(p.totals.priceCents)); detailValue(grid, 'Recebido informado', brl(receivedCents(o)));
    detailValue(grid, 'Saldo', brl(p.totals.priceCents - receivedCents(o))); detailValue(grid, 'Entrada combinada', brl(p.totals.depositCents));
    detailValue(grid, 'Custo estimado + reserva', brl(p.totals.totalCostCents)); detailValue(grid, 'Contribuição estimada', brl(p.totals.contributionCents));
    detailValue(grid, 'Escopo', `${p.scope.clips} vídeo(s) · ${p.scope.seconds}s · ${p.scope.formats.join(' / ')}`);
    detailValue(grid, 'Prazo de produção', `${p.scope.deliveryBusinessDays} dias úteis após materiais e entrada`);
    detailValue(grid, 'Custo total realizado', o.actualCostCents === null ? 'Não informado' : brl(o.actualCostCents));
    detail.append(grid);
  }
  if (o.deliveryUrl) { const link = el('a', 'text-button', 'Abrir material registrado ↗'); link.href = o.deliveryUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; detail.append(link); }
  const actions = el('div', 'detail-actions');
  if (['lead', 'proposal'].includes(o.stage)) actions.append(button(p ? 'Nova versão da proposta' : 'Preparar proposta →', 'button primary', openQuote));
  if (p) actions.append(button('Baixar proposta ↓', 'button secondary', () => download(`axon-proposta-${o.id}-v${p.version}.txt`, proposalText(o))));
  if (o.stage === 'proposal') actions.append(button('Registrar aceite', 'button primary', () => { replaceOpportunity(moveStage(o, 'accepted', now())); toast('Aceite registrado pelo operador. Nenhum pagamento foi verificado.'); }));
  if (['accepted', 'production', 'review'].includes(o.stage)) actions.append(button('Informar recebimento', 'button secondary', () => { $('#receipt-form').reset(); openDialog('#receipt-dialog'); }));
  if (o.stage === 'accepted') actions.append(button('Iniciar produção', 'button primary', () => replaceOpportunity(moveStage(o, 'production', now()))));
  if (o.stage === 'production') actions.append(button('Registrar revisão', 'button primary', () => openDelivery('review')));
  if (o.stage === 'review') actions.append(button('Registrar entrega final', 'button primary', () => openDelivery('delivered')));
  if (o.stage === 'delivered') actions.append(button('Atualizar custo / link', 'button secondary', () => openDelivery('delivered')));
  if (['lead', 'proposal'].includes(o.stage)) actions.append(button('Marcar não fechado', 'button secondary', () => replaceOpportunity(moveStage(o, 'lost', now()))));
  detail.append(actions);
  if (p) detail.append(el('p', 'notice', 'Aceites e recebimentos são informados pelo operador. Produção e revisão acontecem nas ferramentas escolhidas; este painel não gera mídia nem cobra o cliente.'));
  detail.append(el('h4', '', 'Histórico de operação'));
  const history = el('ol', 'history');
  for (const entry of o.history.toReversed().slice(0, 10)) { const item = el('li', '', entry.action); const time = el('time', '', dateLabel(entry.at)); time.dateTime = entry.at; item.append(time); history.append(item); }
  detail.append(history);
}
function formAction(formId, action) {
  $(formId).addEventListener('submit', event => {
    event.preventDefault(); const form = event.currentTarget; form.querySelector('.form-error').textContent = '';
    try { action(form); form.closest('dialog').close(); } catch (error) { form.querySelector('.form-error').textContent = explain(error); }
  });
}
formAction('#lead-form', form => {
  const data = new FormData(form); const o = createOpportunity({ id: crypto.randomUUID(), clientName: data.get('clientName'), contact: data.get('contact'), title: data.get('title'), brief: data.get('brief'), segment: data.get('segment') }, now());
  selectedId = o.id; filter = 'all'; persist({ ...state, opportunities: [...state.opportunities, o] }); toast('Briefing registrado. O próximo passo é preparar a proposta.');
});
function quoteInput(form) {
  const value = name => form.elements.namedItem(name).value.trim();
  return {
    scope: { clips: Number(value('clips')), seconds: Number(value('seconds')), formats: new FormData(form).getAll('format'), revisions: Number(value('revisions')), deliveryBusinessDays: Number(value('deliveryBusinessDays')) },
    validUntil: value('validUntil'),
    costs: { generationCents: parseMoney(value('generation')), editingMinutes: Number(value('editingMinutes')), hourlyRateCents: parseMoney(value('hourlyRate')), otherCents: parseMoney(value('other')), contingencyBps: parsePercent(value('contingency')), paymentFeeBps: parsePercent(value('paymentFee')), taxBps: parsePercent(value('tax')), targetMarginBps: parsePercent(value('targetMargin')), salePriceCents: value('salePrice') ? parseMoney(value('salePrice')) : null, depositBps: parsePercent(value('deposit')) },
  };
}
function openQuote() {
  const form = $('#quote-form'); form.reset();
  const date = new Date(businessDate(now()) + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + 7);
  form.elements.validUntil.value = date.toISOString().slice(0, 10);
  const p = latestProposal(selected());
  if (p) {
    for (const name of ['clips', 'seconds', 'revisions', 'deliveryBusinessDays']) form.elements.namedItem(name).value = p.scope[name];
    for (const input of form.querySelectorAll('[name="format"]')) input.checked = p.scope.formats.includes(input.value);
    for (const [name, field] of [['generation', 'generationCents'], ['hourlyRate', 'hourlyRateCents'], ['other', 'otherCents']]) form.elements.namedItem(name).value = (p.costs[field] / 100).toFixed(2);
    for (const [name, field] of [['contingency', 'contingencyBps'], ['paymentFee', 'paymentFeeBps'], ['tax', 'taxBps'], ['targetMargin', 'targetMarginBps'], ['deposit', 'depositBps']]) form.elements.namedItem(name).value = p.costs[field] / 100;
    form.elements.editingMinutes.value = p.costs.editingMinutes;
    form.elements.salePrice.value = p.costs.salePriceCents === null ? '' : (p.costs.salePriceCents / 100).toFixed(2);
  }
  previewQuote(); openDialog('#quote-dialog');
}
function previewQuote() {
  const target = $('#quote-preview'); target.replaceChildren();
  try {
    const raw = quoteInput($('#quote-form')); const q = calculateQuote(raw.costs);
    target.append(el('h3', '', brl(q.priceCents)), el('p', '', 'Preço do pacote inteiro'));
    const list = el('dl');
    for (const [label, value] of [['Produção + reserva', brl(q.totalCostCents)], ['Taxas + tributos estimados', brl(q.feeAndTaxCents)], ['Contribuição estimada', brl(q.contributionCents)], ['Margem estimada', (q.marginBps / 100).toFixed(2) + '%'], ['Entrada combinada', brl(q.depositCents)], ['Preço sugerido', brl(q.minimumPriceCents)]]) { const row = el('div'); row.append(el('dt', '', label), el('dd', '', value)); list.append(row); }
    target.append(list); if (q.belowTarget) target.append(el('p', 'negative', 'Preço abaixo da margem-alvo. Ajuste o preço ou a meta antes de salvar.'));
  } catch (error) { target.append(el('p', '', error?.name === 'ZodError' ? 'Verifique as estimativas e os percentuais.' : error?.message)); }
}
$('#quote-form').addEventListener('input', previewQuote);
formAction('#quote-form', form => { replaceOpportunity(addProposal(selected(), quoteInput(form), now())); toast('Versão da proposta salva. Você pode baixar o documento para revisar e enviar.'); });
formAction('#receipt-form', form => {
  replaceOpportunity(recordReceipt(selected(), { id: crypto.randomUUID(), at: now(), amountCents: parseMoney(form.elements.amount.value), reference: form.elements.reference.value })); toast('Recebimento informado manualmente.');
});
function openDelivery(target) {
  deliveryTarget = target; const form = $('#delivery-form'); form.reset(); const o = selected();
  $('#delivery-title').textContent = target === 'review' ? 'Registrar revisão.' : o.stage === 'delivered' ? 'Atualizar entrega.' : 'Registrar entrega final.';
  form.elements.url.value = o.deliveryUrl;
  form.elements.actualCost.value = o.actualCostCents === null ? '' : (o.actualCostCents / 100).toFixed(2);
  openDialog('#delivery-dialog');
}
formAction('#delivery-form', form => {
  let o = selected(); if (form.elements.actualCost.value.trim()) o = setActualCost(o, parseMoney(form.elements.actualCost.value), now());
  replaceOpportunity(moveStage(o, deliveryTarget, now(), form.elements.url.value.trim())); toast('Etapa registrada. Nenhum arquivo foi enviado automaticamente.');
});
$('#export-backup').addEventListener('click', () => { download(`axon-comercial-${businessDate(now())}.json`, loadBlocked && rawStored ? rawStored : JSON.stringify(state, null, 2), 'application/json'); toast('Backup preparado. Guarde-o em um local privado.'); });
$('#import-backup').addEventListener('click', () => $('#backup-file').click());
$('#backup-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('O backup deve ter até 5 MB.');
    const imported = importSnapshot(JSON.parse(await file.text()));
    const merged = new Map(state.opportunities.map(o => [o.id, o]));
    for (const o of imported.opportunities) {
      const prior = merged.get(o.id);
      if (prior && JSON.stringify(prior) !== JSON.stringify(o)) throw new Error('Há uma versão diferente de um projeto já salvo. Importe em um navegador vazio para evitar sobrescrever seus registros.');
      merged.set(o.id, o);
    }
    persist(importSnapshot({ version: 1, opportunities: [...merged.values()] }), true); toast('Backup importado sem sobrescrever versões diferentes.');
  } catch (error) { toast(explain(error)); }
  event.target.value = '';
});
render();
