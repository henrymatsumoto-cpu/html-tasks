'use strict'
// Painel interno de exceções do ConcertAI (CZT-015, A34). JS puro, sem build: tudo vem da API /api/painel/*
// (fila, item com as saídas permitidas, decidir, switches, decididas). Design: docs/design-painel-excecoes.md e o
// protótipo aprovado prototipo/design-painel-excecoes.html (CZT-111). Login: link pessoal #t=<token> (src/supervisor/token.ts).
// CSP do servidor: sem script nem estilo inline; ícones Lucide (ISC) como SVG gerado aqui.
;(() => {
// ícones Lucide v0.460.0 (lucide-static, licença ISC): só o miolo de cada SVG
const ICONES = {
  'alarm-clock': '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/><path d="M6.38 18.7 4 21"/><path d="M17.64 18.67 20 21"/>',
  'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  'check-check': '<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>',
  'check-circle-2': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  'filter-x': '<path d="M13.013 3H2l8 9.46V19l4 2v-8.54l.9-1.055"/><path d="m22 3-5 5"/><path d="m17 3 5 5"/>',
  'history': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  'image': '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  'inbox': '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  'info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  'lock': '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  'moon': '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  'power': '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>',
  'refresh-cw': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  'search-x': '<path d="m13.5 8.5-5 5"/><path d="m8.5 8.5 5 5"/><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'shield-alert': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  'siren': '<path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"/><path d="M21 12h1"/><path d="M18.5 4.5 18 5"/><path d="M2 12h1"/><path d="M12 2v1"/><path d="m4.929 4.929.707.707"/><path d="M12 12v6"/>',
  'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'wifi-off': '<path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/>',
  'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'x-circle': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  'zap': '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
}

// ======================= rótulos da interface (os dados vêm todos da API) =======================
const NOME_PAPEL = {
  lideranca: 'Liderança da Operação', central: 'Central de Manutenção', plantonista: 'Plantonista da Operação',
  cs_proprietarios: 'CS Proprietários', suporte_franquias: 'Suporte Franquias', financeiro: 'Financeiro',
}
const CURTO_PAPEL = { lideranca: 'Liderança', central: 'Central', plantonista: 'Plantonista', cs_proprietarios: 'CS Proprietários', suporte_franquias: 'Suporte Franquias', financeiro: 'Financeiro' }
const ORDEM_PAPEL = ['central', 'plantonista', 'cs_proprietarios', 'suporte_franquias', 'financeiro', 'lideranca']
const NOME_FILA = { urgente: 'urgente', comum: 'comum', conferencia: 'conferência', reclamacao: 'reclamação', plantao: 'plantão', aprovacao: 'aprovação', cancelamento: 'cancelamento', pagamento: 'pagamento', disputa: 'disputa' }
// o que cada switch barra (docs/seguranca.md §7); o estado (ligado, quem, quando) vem da API
const INFO_SWITCH = {
  EXTERNAL_WRITES_ENABLED: ['Escrita em sistemas externos', 'Sapron, card espelho e despesa no repasse'],
  PAGAMENTOS_ENABLED: ['Pagamentos', 'Pix ao prestador e estornos'],
  MENSAGENS_ENABLED: ['Mensagens', 'WhatsApp e SIA para todos os atores'],
  MARKETING_ENABLED: ['Marketing', 'Campanhas e ofertas; depende de Mensagens'],
  STAYS_BLOQUEIO_ENABLED: ['Bloqueio na Stays', 'Reserva da janela no calendário; por regra a agenda só avisa'],
  PILOTO_IMOVEIS: ['Imóveis do piloto', 'Fora da lista, nenhum efeito acontece (policy nega com fora_do_piloto)'],
}
const SO_DEPLOY = new Set(['MARKETING_ENABLED', 'STAYS_BLOQUEIO_ENABLED', 'PILOTO_IMOVEIS'])
// rótulos dos campos do contexto que o painel sabe mostrar; o resto aparece em "Mais dados"
const CAMPOS_PEDIDO = [['servico', 'Serviço'], ['imovel', 'Imóvel'], ['comprador', 'Comprador'], ['profissional', 'Profissional'], ['valor', 'Valor'], ['estado_anterior', 'Estado de antes']]
const CONHECIDOS = new Set(['pedido', 'porque', 'gatilho', 'aviso', 'fotos', 'vereditos', 'historico', 'conferido', 'regra', 'politica', 'command', 'urgente', 'command_id', ...CAMPOS_PEDIDO.map((c) => c[0])])
const CHAVE_TOKEN = 'concertai.painel.token'
const CHAVE_TEMA = 'concertai.painel.tema'
const ATUALIZA_MS = 30000

// ======================= estado =======================
const est = {
  token: null, eu: null, vencido: false,
  fila: [], filaOk: false, erroFila: false, decN: null, decididas: null, switches: null, atualizadoEm: null,
  filtro: 'todas', papel: 'todos', origem: 'fila', empilhou: false, hashAnt: null,
  // gaveta aberta
  itemId: null, item: null, modo: null, escolha: null, motivo: '', nota: '', enviando: false, decisao: null, erroDec: null, conflito: null, pre: null,
  focoInicial: null, voltarFoco: null, toast: null, rotulos: new Map(),
}
let quemAbriu = null
const $ = (s) => document.querySelector(s)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const lider = () => est.eu && est.eu.papel === 'lideranca'
const aberto = (i) => i.status === 'aberta' || i.status === 'em_analise'
const ehUrgente = (i) => i.fila === 'urgente' || (i.contexto && i.contexto.urgente === true)
const ehPlantao = (i) => i.fila === 'plantao' || i.fila === 'urgente'
const ehAprov = (i) => i.tipo === 'aprovacao'
const texto = (v) => (typeof v === 'string' || typeof v === 'number') ? String(v) : ''

function ic (nome, cls = '') {
  const p = ICONES[nome]
  if (!p) return ''
  return `<svg class="lucide${cls ? ' ' + cls : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`
}
function iconesEstaticos (raiz = document) {
  raiz.querySelectorAll('[data-ic]').forEach((e) => { e.outerHTML = ic(e.dataset.ic) })
}

// ======================= armazenamento (pode falhar: aba anônima, site bloqueado) =======================
function guardar (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch { /* só conveniência */ } }
function ler (k) { try { return localStorage.getItem(k) } catch { return null } }

// ======================= tempo =======================
const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const fmtDia = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
function hora (iso) {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  const h = fmtHora.format(d).replace(':', 'h')
  return fmtDia.format(d) === fmtDia.format(new Date()) ? h : `${fmtDia.format(d)} ${h}`
}
function dur (m) {
  m = Math.max(0, Math.round(m))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60), r = m % 60
  if (h >= 24) { const d = Math.floor(h / 24), hh = h % 24; return hh ? `${d} d ${hh}h` : `${d} d` }
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`
}
function slaTxt (m) {
  if (m == null) return { cls: '', b: '–', s: 'sem prazo', sr: 'sem prazo definido' }
  if (m < 0) return { cls: 'no', b: `+${dur(-m)}`, s: 'SLA estourado', sr: `SLA estourado há ${dur(-m)}` }
  if (m <= 30) return { cls: 'warn', b: dur(m), s: 'para o SLA', sr: `vence em ${dur(m)}` }
  return { cls: '', b: dur(m), s: 'para o SLA', sr: `vence em ${dur(m)}` }
}
function uuid () {
  if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

// ======================= API =======================
class ErroRede extends Error {}
async function api (metodo, caminho, corpo) {
  const headers = { Authorization: `Bearer ${est.token}` }
  if (corpo !== undefined) headers['Content-Type'] = 'application/json'
  let r
  try {
    r = await fetch(caminho, { method: metodo, headers, cache: 'no-store', credentials: 'omit', ...(corpo !== undefined && { body: JSON.stringify(corpo) }) })
  } catch { throw new ErroRede('sem conexão') }
  let j
  try { j = await r.json() } catch { j = null }
  if (r.status === 401) { linkVencido(); throw new ErroRede('sessão vencida') }
  return { status: r.status, corpo: j || {} }
}
// geração de cada leitura: uma resposta só é aplicada se o pedido dela for mais novo que o da última aplicada
// (uma resposta lenta e velha não desfaz o que veio depois, ex.: o item decidido voltando para a fila)
const seq = { fila: 0, dec: 0, sw: 0 }
const aplicada = { fila: 0, dec: 0, sw: 0 }
function novaLeitura (k) { return ++seq[k] }
function aplicar (k, g) { if (g < aplicada[k]) return false; aplicada[k] = g; return true }
async function carregar () {
  const gf = novaLeitura('fila'), gd = novaLeitura('dec')
  const [f, d] = await Promise.allSettled([api('GET', '/api/painel/fila'), api('GET', '/api/painel/decididas')])
  if (est.vencido) return
  if (gf >= aplicada.fila) {
    if (f.status === 'fulfilled' && f.value.status === 200 && Array.isArray(f.value.corpo.itens)) {
      aplicar('fila', gf)
      est.fila = f.value.corpo.itens; est.filaOk = true; est.erroFila = false
      est.atualizadoEm = new Date().toISOString()
    } else est.erroFila = true
  }
  if (d.status === 'fulfilled' && d.value.status === 200 && Array.isArray(d.value.corpo.itens) && aplicar('dec', gd)) {
    est.decididas = d.value.corpo.itens; est.decN = est.decididas.length
  }
}

// ======================= sessão =======================
/** false = sem token no hash; 'ok' = token lido e guardado; 'ruim' = fragmento malformado (link cortado) */
function lerTokenDoHash () {
  const h = location.hash
  if (!h.startsWith('#t=')) return false
  // tira o token da barra de endereço ANTES de qualquer coisa que possa falhar
  history.replaceState(null, '', location.pathname + location.search + '#fila')
  let t
  try { t = decodeURIComponent(h.slice(3)).trim() } catch { t = '' }
  if (!t) { est.token = null; guardar(CHAVE_TOKEN, null); return 'ruim' }
  est.token = t; guardar(CHAVE_TOKEN, t)
  return 'ok'
}
function linkVencido () {
  if (est.vencido) return
  est.vencido = true; est.token = null; guardar(CHAVE_TOKEN, null)
  $('#camada').innerHTML = ''; $('#app').inert = false
  document.querySelectorAll('[data-ct]').forEach((e) => { e.hidden = true })
  $('#tela').innerHTML = `<div class="vencido">${cab('Painel interno', 'Link vencido')}<div class="empty erro"><span class="c">${ic('lock')}</span><b>Link vencido, peça um novo</b>O link do painel é pessoal e vale por poucas horas. Peça um novo à Liderança da Operação. As decisões já feitas estão salvas.</div></div>`
  $('#tela h1')?.focus()
}
function preencherEu () {
  const e = est.eu
  $('#eu-nome').textContent = e.nome
  const papel = NOME_PAPEL[e.papel] || e.papel_nome || e.papel
  $('#eu-papel').textContent = papel; $('#eu-papel').title = papel
  $('#eu-av').textContent = String(e.nome).split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

// ======================= telas =======================
const TELAS = { fila: () => telaFila(), aprovacoes: () => telaFila('aprov'), plantao: () => telaFila('plantao'), barrados: telaSwitches, decididas: telaDecididas }
function cab (eb, h1, p) { return `<div class="ph"><div><span class="eyebrow">${esc(eb)}</span><h1 tabindex="-1">${esc(h1)}</h1>${p ? `<p class="d">${esc(p)}</p>` : ''}</div></div>` }
const meus = () => est.fila
const doPapel = (l) => (est.papel === 'todos' || !lider()) ? l : l.filter((i) => i.papel === est.papel)

function telaFila (modo) {
  if (est.erroFila && !est.filaOk) { telaErro(); return }
  const todos = meus()
  let lista = todos
  if (modo === 'aprov') lista = lista.filter(ehAprov)
  if (modo === 'plantao') lista = lista.filter(ehPlantao)
  const base = modo ? lista : doPapel(lista)
  if (!modo) {
    lista = base
    if (est.filtro === 'urg') lista = lista.filter(ehUrgente)
    if (est.filtro === 'exc') lista = lista.filter((i) => !ehAprov(i))
    if (est.filtro === 'aprov') lista = lista.filter(ehAprov)
  }
  lista = lista.slice().sort((a, b) => (a.sla_min ?? Infinity) - (b.sla_min ?? Infinity))
  const titulo = modo === 'aprov' ? 'Aprovações de alçada' : modo === 'plantao' ? 'Plantão' : 'Fila de exceções'
  const desc = modo === 'aprov' ? 'Ações que um agente propôs e passaram do limite dele. Nada acontece sem o seu clique.'
    : modo === 'plantao' ? 'Urgentes e casos do plantão (emergência e dependência caída). Fora do horário comercial eles são do Plantonista.'
      : 'O que os agentes não podem decidir sozinhos. A fila vem ordenada pelo prazo: o que vence primeiro fica em cima.'
  let h = cab('Painel interno', titulo, desc)
  if (est.erroFila) h += `<div class="note warn mb16" role="status">${ic('wifi-off')}<div><b>Sem atualizar agora</b>Mostrando a fila de ${esc(hora(est.atualizadoEm))}. O painel tenta de novo sozinho.</div></div>`
  if (!modo) {
    const cont = [['todas', 'Todas', base.length], ['urg', 'Urgentes', base.filter(ehUrgente).length], ['exc', 'Exceções', base.filter((i) => !ehAprov(i)).length], ['aprov', 'Aprovações', base.filter(ehAprov).length]]
    const nomeP = est.papel !== 'todos' && lider() ? ' de ' + (CURTO_PAPEL[est.papel] || est.papel) : ''
    h += `<section class="g-kpi" aria-label="Resumo da fila${esc(nomeP)}">
      <div class="kpi main-k"><span>SLA estourado</span><b class="tn">${base.filter((i) => i.sla_min != null && i.sla_min < 0).length}</b><small>Liderança é avisada em 2× o SLA</small></div>
      <div class="kpi"><span>Na fila</span><b class="tn">${base.length}</b><small>${base.filter(ehAprov).length} aprovações</small></div>
      <div class="kpi"><span>Urgentes</span><b class="tn">${base.filter(ehUrgente).length}</b><small>itens urgentes do MGO</small></div>
      <a class="kpi" href="#decididas"><span>Decididas</span><b class="tn">${est.decN ?? '–'}</b><small>hoje; ver o histórico</small></a>
    </section>
    <div class="filtros">
      <div class="seg" role="group" aria-label="Filtrar a fila">${cont.map(([c, t, n]) => `<button type="button" data-filtro="${c}" aria-pressed="${est.filtro === c}">${t}<span class="ct tn">${n}</span></button>`).join('')}</div>
      <label class="sel mob">Mostrar<select id="filtro-m">${cont.map(([c, t, n]) => `<option value="${c}"${est.filtro === c ? ' selected' : ''}>${t} (${n})</option>`).join('')}</select></label>
      ${lider() ? `<label class="sel">Fila de<select id="papel">${['todos', ...ORDEM_PAPEL].map((p) => `<option value="${p}"${est.papel === p ? ' selected' : ''}>${p === 'todos' ? 'Todos' : esc(CURTO_PAPEL[p])}</option>`).join('')}</select></label>` : `<span class="sel">Fila de ${esc(CURTO_PAPEL[est.eu.papel])}</span>`}
    </div>`
  }
  if (!lista.length) {
    if (!todos.length) h += `<div class="empty"><span class="c">${ic('check-circle-2')}</span><b>Fila zerada</b>Nada esperando uma pessoa agora. Quando um caso chegar, ele aparece aqui e no Slack.<a class="btn sec" href="#decididas">Ver as decididas hoje</a></div>`
    else if (modo) h += `<div class="empty"><span class="c">${ic('check-circle-2')}</span><b>${modo === 'aprov' ? 'Nenhuma aprovação esperando' : 'Nada no plantão agora'}</b>Há ${todos.length} ${todos.length === 1 ? 'item' : 'itens'} na fila geral.<a class="btn sec" href="#fila">Ver a fila</a></div>`
    else h += `<div class="empty"><span class="c">${ic('filter-x')}</span><b>Nenhum item com estes filtros</b>Há ${todos.length} ${todos.length === 1 ? 'item' : 'itens'} na fila em outros filtros ou papéis.<button class="btn sec" type="button" data-limpar>Limpar filtros</button></div>`
  } else {
    h += `<div class="lista" role="list">${lista.map(linha).join('')}</div>`
  }
  if (est.atualizadoEm) h += `<p class="atualizado mb16">Atualizado às ${esc(hora(est.atualizadoEm))}; atualiza sozinho a cada 30 s.</p>`
  $('#tela').innerHTML = `<div class="tela-fila">${h}</div>`
}
function chipUrg () { return `<span class="chip warn">${ic('zap', 'i16')}Urgente</span>` }
function linha (i) {
  const s = slaTxt(i.sla_min)
  const c = i.contexto || {}
  const tags = [`<span class="chip d">${esc(i.codigo)} · ${esc(i.nome)}</span>`]
  if (ehUrgente(i)) tags.push(chipUrg())
  if (ehAprov(i)) tags.push('<span class="chip info">Aprovação</span>')
  if (i.retido) tags.push(`<span class="chip n">Retido${i.decisao ? ' · nota das ' + esc(hora(i.decisao.decidido_em)) : ''}</span>`)
  const id = esc(i.id)
  const acoes = ehAprov(i) && i.pode_decidir
    ? `<button class="btn sec sm" type="button" data-abrir="${id}" data-pre="reprovar" aria-label="Reprovar: ${esc(i.titulo)}">Reprovar</button><button class="btn pri sm" type="button" data-abrir="${id}" data-pre="aprovar" aria-label="Aprovar: ${esc(i.titulo)}">Aprovar</button>`
    : `<button class="btn sec sm" type="button" data-abrir="${id}" aria-label="${i.pode_decidir ? 'Decidir' : 'Ver'}: ${esc(i.titulo)}">${i.pode_decidir ? 'Decidir' : 'Ver'}</button>`
  const meta = [texto(c.pedido), texto(c.servico)].filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join('')
  return `<article class="xrow" role="listitem" aria-label="${esc([i.codigo + ' ' + i.titulo, texto(c.pedido)].filter(Boolean).join(', '))}">
    <div class="sla ${s.cls}"><b class="tn" aria-hidden="true">${i.sla_min != null && i.sla_min < 0 ? ic('alarm-clock', 'i16') : ''}${esc(s.b)}</b><span aria-hidden="true">${esc(s.s)}</span><span class="sr">${esc(s.sr)}</span></div>
    <div class="meio"><div class="tags">${tags.join('')}</div>
      <h2>${esc(i.titulo)}</h2>
      <div class="meta">${meta}<span>${ic('users', 'i16')}${esc(CURTO_PAPEL[i.papel] || i.papel)} · fila ${esc(NOME_FILA[i.fila] || i.fila)}${i.sla_em ? ' · prazo ' + esc(hora(i.sla_em)) : ''}</span></div></div>
    <div class="acoes">${acoes}</div></article>`
}
function telaErro () {
  $('#tela').innerHTML = cab('Painel interno', 'Fila de exceções') + `<div class="empty erro"><span class="c">${ic('wifi-off')}</span><b>Não deu para carregar a fila</b>As decisões já feitas estão salvas. Enquanto isso, os cards continuam chegando no Slack (#concertai-excecoes).<button class="btn pri" type="button" data-recarrega>Tentar de novo</button></div>`
}
function naoAchou () {
  $('#tela').innerHTML = cab('Painel interno', 'Caso não encontrado') + `<div class="empty"><span class="c">${ic('search-x')}</span><b>Caso não encontrado ou já saiu da fila</b>O link pode ser antigo. Confira a fila ou as decididas de hoje.<span class="acoes-v"><a class="btn sec" href="#fila">Ver a fila</a><a class="btn ghost" href="#decididas">Decididas hoje</a></span></div>`
  $('#tela h1')?.focus()
}

// ---------- switches ----------
async function buscarSwitches () {
  const g = novaLeitura('sw')
  try {
    const r = await api('GET', '/api/painel/switches')
    if (g < aplicada.sw) return true // resposta velha: já vale uma mais nova
    if (r.status === 200 && Array.isArray(r.corpo.itens) && aplicar('sw', g)) { est.switches = r.corpo.itens; return true }
  } catch { /* cai no aviso */ }
  return false
}
async function telaSwitches (recarregar = true) {
  const desenha = (erro) => {
    if (rotaBase() !== 'barrados') return
    let h = cab('Controle', 'Switches e ações barradas', 'O efeito só acontece com os dois cadeados ligados: o valor no deploy e a linha daqui. Qualquer papel desliga para todos em menos de 1 minuto; religar é da Liderança, com motivo, e não dispara nada sozinho.')
    if (!est.switches) {
      h += erro ? `<div class="empty erro"><span class="c">${ic('wifi-off')}</span><b>Não deu para carregar os switches</b>Nada mudou. Tente de novo em instantes.<button class="btn pri" type="button" data-recarrega>Tentar de novo</button></div>` : '<div class="carregando" role="status">Carregando os switches…</div>'
      $('#tela').innerHTML = h; return
    }
    const piloto = est.switches.find((w) => w.chave === 'PILOTO_IMOVEIS')
    const lista = est.switches.filter((w) => w.chave !== 'PILOTO_IMOVEIS')
    h += `<div class="g2"><section class="bl" aria-labelledby="t-sw"><h3 id="t-sw">Switches</h3>${lista.map(htmlSwitch).join('')}</section>`
    const imoveis = piloto && Array.isArray(piloto.valor) ? piloto.valor.filter((x) => typeof x === 'string') : []
    h += `<section class="bl" aria-labelledby="t-pil"><h3 id="t-pil" tabindex="-1">Imóveis do piloto (${imoveis.length})</h3>
      <p class="txt-2">${esc(INFO_SWITCH.PILOTO_IMOVEIS[1])}. Tirar um imóvel vale em menos de 1 minuto; incluir é <span class="chip n">Só por deploy</span></p>
      ${imoveis.length ? imoveis.map((cod) => `<div class="sw"><b>${esc(cod)}</b><small>No piloto: efeitos permitidos</small><button class="btn dng sm" type="button" data-piloto="${esc(cod)}" aria-label="Tirar ${esc(cod)} do piloto">Tirar</button></div>`).join('') : '<p class="piloto-vazio">Nenhum imóvel no piloto: nenhum efeito acontece.</p>'}</section></div>`
    // a API do painel ainda não lista as ações BARRADO_SWITCH nem reprocessa (lacuna registrada na CZT-015): o painel diz isso em vez de prometer
    h += `<section class="bl mt16" aria-labelledby="t-barr"><h3 id="t-barr">Ações barradas</h3>
      <div class="note mat" role="note">${ic('info')}<div><b>Ainda fora do painel</b>A lista das ações barradas e o Reprocessar ainda não estão aqui. Uma aprovação feita com o switch desligado fica parada; ligar o switch não dispara nada sozinho. Para reprocessar, fale com a Liderança da Operação.</div></div></section>`
    if (erro) h = `<div class="note warn mb16" role="status">${ic('wifi-off')}<div><b>Sem atualizar agora</b>Mostrando o último estado carregado.</div></div>` + h
    $('#tela').innerHTML = h
  }
  desenha(false)
  if (recarregar || !est.switches) { const ok = await buscarSwitches(); desenha(!ok) }
}
function htmlSwitch (w) {
  const [nome, x] = INFO_SWITCH[w.chave] || [w.chave, '']
  const bt = w.ligado ? `<button class="btn dng sm" type="button" data-sw="${esc(w.chave)}" data-acao="desligar" aria-label="Desligar ${esc(nome)}">Desligar</button>`
    : SO_DEPLOY.has(w.chave) ? '<span class="chip n">Só por deploy</span>'
      : lider() ? `<button class="btn sec sm" type="button" data-sw="${esc(w.chave)}" data-acao="religar" aria-label="Religar ${esc(nome)}">Religar</button>` : '<span class="chip n">Só a Liderança religa</span>'
  const quem = [w.motivo, w.alterado_por ? `por ${w.alterado_por}${w.alterado_em ? ' às ' + hora(w.alterado_em) : ''}` : ''].filter(Boolean).join(' · ')
  return `<div class="sw"><b>${esc(nome)} <span class="chip ${w.ligado ? 'ok' : 'n'}">${w.ligado ? 'Ligado' : 'Desligado'}</span></b><small>${esc(x)}${quem ? ' · ' + esc(quem) : ''}<br><span class="tec">${esc(w.chave)}</span></small>${bt}</div>`
}

// ---------- decididas ----------
async function rotulosDe (lista) {
  const faltam = [...new Set(lista.filter((d) => !est.rotulos.has(d.saida)).map((d) => d.excecao_id))].slice(0, 40)
  await Promise.all(faltam.map(async (id) => {
    try {
      const r = await api('GET', '/api/painel/item?id=' + encodeURIComponent(id))
      if (r.status === 200) for (const s of r.corpo.item.saidas || []) est.rotulos.set(s.id, s.rotulo)
    } catch { /* fica o id */ }
  }))
}
async function telaDecididas () {
  const desenha = (erro) => {
    if (rotaBase() !== 'decididas') return
    let h = cab('Histórico', 'Decididas hoje', 'Cada decisão humana vira um caso de eval: é assim que os agentes ganham autonomia por degrau.')
    if (!est.decididas) {
      h += erro ? `<div class="empty erro"><span class="c">${ic('wifi-off')}</span><b>Não deu para carregar as decididas</b>As decisões estão salvas.<button class="btn pri" type="button" data-recarrega>Tentar de novo</button></div>` : '<div class="carregando" role="status">Carregando…</div>'
    } else if (!est.decididas.length) {
      h += `<div class="empty"><span class="c">${ic('history')}</span><b>Nenhuma decisão hoje ainda</b>Quando alguém decidir pelo painel ou pelo Slack, aparece aqui com o nº do caso de eval.<a class="btn sec" href="#fila">Ver a fila</a></div>`
    } else {
      h += `<section class="bl" aria-label="Decisões de hoje">${est.decididas.map((d) => {
        const c = d.contexto || {}
        const ped = c.contexto && texto(c.contexto.pedido)
        const via = d.canal === 'slack' ? 'Slack' : 'painel'
        return `<div class="dec"><time>${esc(hora(d.em))}</time><span><b>${esc(est.rotulos.get(d.saida) || d.saida)}</b><small>${esc(d.codigo)}${c.titulo ? ' · ' + esc(c.titulo) : ''}${ped ? ' · ' + esc(ped) : ''} · ${esc(d.decidido_por)} pelo ${via}</small></span><span class="chip n">Caso nº ${esc(d.caso)}</span></div>`
      }).join('')}</section>`
    }
    $('#tela').innerHTML = h
  }
  desenha(false)
  const g = novaLeitura('dec')
  try {
    const r = await api('GET', '/api/painel/decididas')
    if (r.status !== 200 || !Array.isArray(r.corpo.itens)) throw new Error('falhou')
    if (aplicar('dec', g)) { est.decididas = r.corpo.itens; est.decN = est.decididas.length }
    // resposta velha: não sobrescreve; desenha a lista mais nova que já chegou
    await rotulosDe(est.decididas)
    desenha(false); contadores()
  } catch { if (!est.vencido && !est.decididas) desenha(true) }
}

// ======================= gaveta de decisão =======================
function saidaEscolhida () { return est.item && est.escolha != null ? est.item.saidas[est.escolha] : null }
function falta (s) {
  if (!s) return { t: 'Escolha uma opção', alvo: '#opcoes input' }
  if (s.motivos && !est.motivo) return { t: 'Escolha o motivo', alvo: '#motivo' }
  const precisa = s.nota_obrigatoria || est.motivo === 'Outro motivo'
  const n = est.nota.trim().length
  if (precisa && n < 5) return { t: `Escreva a nota (faltam ${5 - n} caracteres)`, alvo: '#nota' }
  return null
}
function switchesDesligados (i) { return (i.switches || []).filter((w) => !w.ligado) }
function nomeSw (ch) { return (INFO_SWITCH[ch] || [ch])[0] }
function efeito (i, s) {
  const off = switchesDesligados(i)
  if (/\.aprovar$/.test(s.id) && off.length) return `Aprovado, mas fica barrado enquanto ${off.map((w) => nomeSw(w.chave)).join(' e ')} estiver${off.length > 1 ? 'em' : ''} desligado${off.length > 1 ? 's' : ''}. Ligar não dispara nada sozinho: reprocessar é com a Liderança (ainda fora do painel).`
  return s.efeito
}
function decisaoVista (i) {
  if (est.conflito) return est.conflito
  if (!aberto(i) && i.decisao) return i.decisao
  return null
}
function htmlGaveta (i) {
  const c = i.contexto || {}
  const dec = decisaoVista(i)
  const fechado = !!dec || !aberto(i)
  const alheio = !fechado && !i.pode_decidir
  const versao = est.modo === 'versao'
  const bloq = fechado || alheio || versao
  const s = bloq ? null : saidaEscolhida()
  const rotuloDe = (id) => (i.saidas.find((x) => x.id === id) || {}).rotulo || est.rotulos.get(id) || id
  let topo = ''
  if (dec) {
    const via = dec.canal === 'slack' ? 'Slack' : 'painel'
    topo = `<div class="note ${est.conflito ? 'warn' : 'ok'}" role="${est.conflito ? 'alert' : 'status'}">${ic(est.conflito ? 'users' : 'check-circle-2')}<div><b>Já decidido</b>${esc(dec.decidido_por)} pelo ${via} às ${esc(hora(dec.decidido_em))}: "${esc(rotuloDe(dec.saida))}" (caso de eval nº ${esc(dec.caso)}).${est.conflito ? ' A sua escolha não foi aplicada e nada mudou duas vezes.' : ''}</div></div>`
  } else if (!aberto(i)) {
    topo = `<div class="note mat" role="status">${ic('lock')}<div><b>Este caso não está mais aberto</b>Nada a decidir aqui.</div></div>`
  } else if (alheio) {
    topo = `<div class="note mat" role="status">${ic('lock')}<div><b>Este caso é da fila ${esc(NOME_PAPEL[i.papel] || i.papel)}</b>Você vê o contexto, mas só quem tem esse papel (ou a Liderança) decide.</div></div>`
  } else if (versao) {
    topo = `<div class="note warn" role="alert">${ic('refresh-cw')}<div><b>O caso mudou</b>Ele foi atualizado enquanto você olhava. Os botões desta tela não valem mais: veja a proposta nova antes de decidir.</div></div>`
  } else if (i.retido && i.decisao) {
    topo = `<div class="note mat" role="status">${ic('info')}<div><b>Retido</b>${esc(i.decisao.decidido_por)} manteve retido às ${esc(hora(i.decisao.decidido_em))} (caso de eval nº ${esc(i.decisao.caso)}). O prazo foi renovado.</div></div>`
  }
  let fs = `<fieldset id="opcoes"${bloq ? ' disabled' : ''}><legend>O que fazer</legend>`
  if (!i.saidas.length) fs += '<p class="txt-2">Este código não tem saída no catálogo. Fale com a Liderança da Operação.</p>'
  i.saidas.forEach((op, k) => {
    const marcado = !bloq && est.escolha === k
    fs += `<label class="opt"><input type="radio" name="dec" value="${k}"${marcado ? ' checked' : ''}><span><b>${esc(op.rotulo)}</b><span class="ef">${esc(efeito(i, op))}</span><span class="tec">${esc(op.id)}${op.fica_na_fila ? ' · continua na fila' : ''}</span></span></label>`
    if (marcado && op.motivos) fs += `<label class="campo">Motivo (obrigatório)<select id="motivo" aria-required="true"><option value="">Escolha o motivo</option>${op.motivos.map((m) => `<option${est.motivo === m ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select><small>Vai para o comprador e para o caso de eval.</small></label>`
    if (marcado && (op.nota_obrigatoria || op.motivos)) {
      const obrig = op.nota_obrigatoria || est.motivo === 'Outro motivo'
      fs += `<label class="campo">Nota${obrig ? ' (obrigatória, mínimo 5 caracteres)' : ' (opcional)'}<textarea id="nota" maxlength="1000"${obrig ? ' aria-required="true"' : ''} placeholder="O que você viu e por quê">${esc(est.nota)}</textarea><small>Só a equipe vê. Não muda valor nem pedido.</small></label>`
    }
  })
  fs += '</fieldset>'
  let corpo = topo
  const pedidoKv = CAMPOS_PEDIDO.filter(([k]) => texto(c[k])).map(([k, r]) => `<dt>${r}</dt><dd${k === 'valor' ? ' class="tn"' : ''}>${esc(texto(c[k]))}</dd>`).join('')
  if (ehAprov(i)) {
    const conf = (Array.isArray(c.conferido) ? c.conferido : []).map((x) => typeof x === 'string' ? [x, true] : [texto(x && x.texto), !(x && x.ok === false)]).filter((x) => x[0])
    for (const w of i.switches || []) conf.push(w.ligado ? [`Switch ${nomeSw(w.chave).toLowerCase()} ligado`, true] : [`Switch ${nomeSw(w.chave).toLowerCase()} desligado: se aprovar, fica barrado (reprocessar é com a Liderança)`, false])
    const kvProp = `<dl class="kv">${texto(c.pedido) ? `<dt>Pedido</dt><dd>${esc(c.pedido)}</dd>` : ''}${pedidoKv}</dl>
      <p class="tec">Command ${esc(texto(c.command) || i.codigo)} · valor calculado pelo código, não pelo agente</p>`
    // no celular a proposta vira 1 linha (valor + pedido) e o resto vai para "Mais", para a 1ª opção aparecer sem rolar
    const curta = [texto(c.pedido), texto(c.servico)].filter(Boolean).join(' · ')
    corpo += `<section class="bl prop" aria-labelledby="t-prop"><h3 id="t-prop">O que o agente propõe</h3>
      <div class="so-desk">${kvProp}</div>
      <div class="so-mob"><p class="prop-curta">${texto(c.valor) ? `<b class="tn">${esc(c.valor)}</b>` : ''}${curta ? `<span>${esc(curta)}</span>` : ''}</p>
        <details class="mais"><summary>Mais da proposta</summary>${kvProp}</details></div></section>`
    if (conf.length) corpo += `<section class="bl conf" aria-labelledby="t-chk"><h3 id="t-chk">O que o código já conferiu</h3><ul class="chk">${conf.map(([t, ok]) => `<li>${ok ? ic('check-circle-2') : ic('alert-triangle', 'c-warn')}<span><span class="sr">${ok ? 'Conferido: ' : 'Atenção: '}</span>${esc(t)}</span></li>`).join('')}</ul></section>`
    corpo += fs
    if (texto(c.regra) || texto(c.porque)) corpo += `<section class="bl" aria-labelledby="t-por"><h3 id="t-por">Por que veio para você</h3><p class="txt">${esc(texto(c.regra) || texto(c.porque))}</p>${texto(c.politica) ? `<p class="tec">${esc(c.politica)}</p>` : ''}</section>`
  } else {
    if (texto(c.porque) || texto(c.gatilho)) corpo += `<section class="bl" aria-labelledby="t-por"><h3 id="t-por">Por que chegou aqui</h3>${texto(c.porque) ? `<p class="txt">${esc(c.porque)}</p>` : ''}${texto(c.gatilho) ? `<p class="tec">${esc(c.gatilho)}</p>` : ''}</section>`
    corpo += fs
    if (c.aviso && typeof c.aviso === 'object' && texto(c.aviso.texto)) {
      const t = c.aviso.tipo === 'warn' ? 'warn' : 'mat'
      corpo += `<div class="note ${t}">${ic(t === 'warn' ? 'alert-triangle' : 'info')}<div><b>${esc(texto(c.aviso.titulo))}</b>${esc(c.aviso.texto)}</div></div>`
    }
    if (pedidoKv || texto(c.pedido)) corpo += `<section class="bl" aria-labelledby="t-ped"><h3 id="t-ped">Pedido</h3><dl class="kv">${texto(c.pedido) ? `<dt>Pedido</dt><dd>${esc(c.pedido)}</dd>` : ''}${pedidoKv}</dl></section>`
    const fotos = Array.isArray(c.fotos) ? c.fotos.filter((f) => texto(f)) : []
    const ver = Array.isArray(c.vereditos) ? c.vereditos.filter((f) => texto(f)) : []
    if (fotos.length || ver.length) corpo += `<section class="bl" aria-labelledby="t-fot"><h3 id="t-fot">Fotos</h3>${fotos.length ? `<p class="mut">As fotos ainda não abrem no painel (chegam com a prova da CZT-119/120): confira pelo pedido. Fotos registradas: ${fotos.map((f) => esc(f)).join(', ')}.</p>` : ''}${ver.length ? `<ul class="chk">${ver.map((q) => `<li>${ic('x-circle', 'c-no')}<span><span class="sr">Veredito: </span>${esc(q)}</span></li>`).join('')}</ul>` : ''}</section>`
  }
  const extra = Object.entries(c).filter(([k, v]) => !CONHECIDOS.has(k) && texto(v))
  if (extra.length) corpo += `<section class="bl" aria-labelledby="t-mais"><h3 id="t-mais">Mais dados</h3><dl class="kv">${extra.map(([k, v]) => `<dt>${esc(k.replace(/_/g, ' '))}</dt><dd>${esc(texto(v))}</dd>`).join('')}</dl></section>`
  const hist = Array.isArray(c.historico) ? c.historico.filter((x) => x && texto(x.texto)) : []
  if (hist.length) corpo += `<section class="bl" aria-labelledby="t-his"><h3 id="t-his">Histórico</h3><ol class="tl">${hist.map((x) => `<li><time>${esc(texto(x.em))}</time><span>${esc(x.texto)}<small>${esc(texto(x.ator))}</small></span></li>`).join('')}</ol></section>`
  corpo += `<p class="tec">Caso ${esc(i.id)} · versão ${esc(i.versao)}${c.command_id ? ' · command ' + esc(texto(c.command_id)) : ''}</p>`

  const fl = bloq ? null : falta(s)
  const pe = bloq
    ? (versao ? '<button class="btn pri lg full" type="button" data-recarregar>Ver a proposta nova</button>' : '<button class="btn sec lg full" type="button" data-fechar="1">Voltar para a fila</button>')
    : `${est.erroDec ? `<p class="erro-dec" role="alert" id="erro-dec">${esc(est.erroDec)}</p>` : ''}
       <p class="resumo-dec" id="resumo-dec"${s ? '' : ' hidden'}>${s ? `Você vai: <b>${esc(s.rotulo)}</b>` : 'Nenhuma opção escolhida'}</p>
       ${fl ? `<button class="falta" type="button" id="falta" data-alvo="${fl.alvo}">${esc(fl.t)}</button>` : '<button class="falta" type="button" id="falta" hidden></button>'}
       <button class="btn cta lg full" type="button" id="confirmar"${fl || est.enviando ? ' disabled' : ''} aria-describedby="resumo-dec falta">${est.enviando ? 'Gravando…' : 'Confirmar decisão'}</button>
       <p class="nota">Decidir aqui fecha o mesmo card no Slack e vira caso de eval.${ehAprov(i) ? '' : ' Você nunca escolhe profissional nem data pelo comprador.'}</p>`
  const sl = slaTxt(i.sla_min)
  const prazo = fechado ? '' : `<span class="tn${sl.cls === 'no' ? ' c-no' : ''}">${esc(sl.sr[0].toUpperCase() + sl.sr.slice(1))}</span>`
  const sub = [texto(c.pedido) ? esc(c.pedido) : '', prazo, `${esc(NOME_PAPEL[i.papel] || i.papel)} · fila ${esc(NOME_FILA[i.fila] || i.fila)}`].filter(Boolean).join(' · ')
  const chipDec = dec ? `<span class="chip ok">Decidido às ${esc(hora(dec.decidido_em))}</span>` : ''
  return `<header><div class="lin"><h2 id="g-tit" tabindex="-1">${esc(i.titulo)}</h2><button class="icbtn" type="button" data-fechar="1" aria-label="Fechar">${ic('x')}</button></div>
      <div class="tags"><span class="chip d">${esc(i.codigo)} · ${esc(i.nome)}</span>${ehUrgente(i) ? chipUrg() : ''}${ehAprov(i) ? '<span class="chip info">Aprovação</span>' : ''}${i.retido && !dec ? '<span class="chip n">Retido</span>' : ''}${chipDec}</div>
      <span class="sub">${sub}</span></header>
    <div class="corpo" tabindex="0" role="region" aria-label="Detalhes do caso">${corpo}</div><footer>${pe}</footer>`
}
function gavetaCarregando () {
  $('#camada').innerHTML = `<div class="veu" data-veu><div class="gav" role="dialog" aria-modal="true" aria-labelledby="g-tit"><header><div class="lin"><h2 id="g-tit" tabindex="-1">Abrindo o caso…</h2><button class="icbtn" type="button" data-fechar="1" aria-label="Fechar">${ic('x')}</button></div></header><div class="carregando" role="status">Carregando o contexto do caso…</div></div></div>`
  $('#app').inert = true
  $('#camada [data-fechar]').focus()
}
async function abrirItem (id) {
  est.itemId = id; est.item = null; est.modo = null; est.escolha = null; est.motivo = ''; est.nota = ''; est.erroDec = null; est.conflito = null; est.enviando = false; est.decisao = null
  gavetaCarregando()
  let r
  try { r = await api('GET', '/api/painel/item?id=' + encodeURIComponent(id)) } catch {
    if (est.vencido || itemAtual() !== id) return
    $('.gav .carregando').textContent = 'Sem conexão. Feche e tente de novo.'
    return
  }
  if (itemAtual() !== id) return
  if (r.status !== 200 || !r.corpo.item) {
    $('#camada').innerHTML = ''; $('#app').inert = false
    naoAchou(); return
  }
  const i = r.corpo.item
  est.item = i
  for (const s of i.saidas) est.rotulos.set(s.id, s.rotulo)
  if (est.pre && est.pre.id === id && i.pode_decidir && aberto(i)) {
    const k = i.saidas.findIndex((s) => s.id.endsWith('.' + est.pre.saida))
    if (k >= 0) { est.escolha = k; est.focoInicial = est.pre.saida === 'aprovar' ? '#confirmar' : '#nota' }
  }
  est.pre = null
  $('.gav').innerHTML = htmlGaveta(i)
  const f = est.focoInicial; est.focoInicial = null
  ;((f && $(f)) || $('#camada [data-fechar]') || $('#g-tit')).focus()
}
function refazGaveta (foco) {
  const gav = $('.gav'); if (!gav || !est.item) return
  const rolagem = $('.gav .corpo')?.scrollTop || 0
  gav.innerHTML = htmlGaveta(est.item)
  const corpo = $('.gav .corpo'); if (corpo) corpo.scrollTop = rolagem
  if (foco) ($(foco) || $('#g-tit'))?.focus()
}
function itemAtual () { return (location.hash.match(/^#item\/([^/?#]+)$/) || [])[1] || null }
function navegarItem (id, gatilho) {
  quemAbriu = gatilho && gatilho.dataset.abrir ? `[data-abrir="${CSS.escape(id)}"]` + (gatilho.dataset.pre ? `[data-pre="${gatilho.dataset.pre}"]` : ':not([data-pre])') : null
  est.pre = gatilho && gatilho.dataset.pre ? { id, saida: gatilho.dataset.pre } : null
  location.hash = '#item/' + id
}
function fechar () {
  const id = itemAtual()
  est.voltarFoco = quemAbriu || (id ? `[data-abrir="${CSS.escape(id)}"]:not([data-pre="reprovar"])` : null)
  if (id && est.empilhou) { history.back(); return }
  if (id) { location.hash = '#' + est.origem; return }
  $('#camada').innerHTML = ''; $('#app').inert = false
  focaVolta()
}
function focaVolta () {
  let v = est.voltarFoco; est.voltarFoco = null; quemAbriu = null
  if (typeof v === 'string') { try { v = $(v) } catch { v = null } }
  ;(v && document.contains(v) ? v : $('#tela h1'))?.focus()
}
/** nota só vai quando a saída escolhida mostra o campo (nota digitada noutra opção nunca vai junto) */
function notaDe (s) { return (s.nota_obrigatoria || s.motivos) ? est.nota.trim() : '' }
async function confirmar () {
  const i = est.item, s = saidaEscolhida()
  if (!i || !s || falta(s) || est.enviando || !i.pode_decidir || est.modo === 'versao' || est.conflito) return
  est.enviando = true; est.erroDec = null
  const b = $('#confirmar'); if (b) { b.disabled = true; b.textContent = 'Gravando…' }
  const corpo = { excecao_id: i.id, versao: i.versao, saida: s.id }
  if (s.motivos) corpo.motivo = est.motivo
  const nota = notaDe(s); if (nota) corpo.nota = nota
  // o MESMO decisao_id em todo reenvio do mesmo Confirmar (mesma saída, motivo, nota e versão): o servidor grava uma vez só
  const chave = JSON.stringify(corpo)
  if (!est.decisao || est.decisao.chave !== chave) est.decisao = { chave, id: uuid() }
  corpo.decisao_id = est.decisao.id
  let r
  try { r = await api('POST', '/api/painel/decidir', corpo) } catch {
    if (est.item === i) est.enviando = false
    if (est.vencido) return
    const msg = 'Sem conexão: não sabemos se gravou. Tente de novo (o mesmo clique não grava duas vezes).'
    if (itemAtual() !== i.id) { toast(msg, 'wifi-off'); return }
    est.erroDec = msg; refazGaveta('#confirmar'); return
  }
  if (est.item === i) est.enviando = false
  const code = r.corpo.error && r.corpo.error.code
  // reenvio de uma decisão que já tinha gravado (a resposta da 1ª tentativa se perdeu): é sucesso, não conflito
  const minha = r.status === 409 && code === 'ja_decidido' && r.corpo.saida === s.id && r.corpo.canal === 'painel' && est.eu && r.corpo.decidido_por === est.eu.nome
  if (r.status === 200 || minha) {
    est.rotulos.set(s.id, s.rotulo)
    const fica = r.status === 200 ? !!r.corpo.fica_na_fila : !!s.fica_na_fila
    const msg = `Decisão gravada · caso de eval nº ${r.corpo.caso}${fica ? ' · o caso continua na fila' : ''}`
    if (itemAtual() !== i.id) {
      // a gaveta foi fechada com o POST em andamento: avisa e atualiza a tela de baixo mesmo assim
      toast(msg)
      await carregar()
      if (!est.vencido) { contadores(); redesenharBase() }
      return
    }
    est.toast = msg
    est.decisao = null
    await carregar()
    if (itemAtual() !== i.id) { if (est.toast) { toast(est.toast); est.toast = null } contadores(); redesenharBase(); return }
    quemAbriu = null
    est.voltarFoco = fica ? `[data-abrir="${CSS.escape(i.id)}"]` : '.xrow [data-abrir]:not([data-pre="reprovar"])'
    if (est.empilhou) history.back(); else location.hash = '#' + est.origem
    return
  }
  if (itemAtual() !== i.id) return // erro com a gaveta já fechada: nada foi gravado e nada a mostrar
  if (r.status === 409 && code === 'ja_decidido') {
    const x = r.corpo
    est.conflito = { decidido_por: x.decidido_por, canal: x.canal, decidido_em: x.decidido_em, caso: x.caso, saida: x.saida }
    refazGaveta('#g-tit')
    carregar().then(() => { if (!est.vencido) contadores() })
    return
  }
  if (r.status === 409 && code === 'versao') { est.modo = 'versao'; refazGaveta('[data-recarregar]'); return }
  if (r.status === 404) { $('#camada').innerHTML = ''; $('#app').inert = false; naoAchou(); return }
  est.erroDec = r.status === 403 ? 'Este caso é de outra fila. Nada foi gravado.' : ((r.corpo.error && r.corpo.error.message) || 'Não foi possível decidir. Nada foi gravado.')
  refazGaveta('#erro-dec')
}
async function recarregarItem () {
  const id = est.item && est.item.id; if (!id) return
  try {
    const r = await api('GET', '/api/painel/item?id=' + encodeURIComponent(id))
    if (itemAtual() !== id) return
    if (r.status !== 200) { $('#camada').innerHTML = ''; $('#app').inert = false; naoAchou(); return }
    est.item = r.corpo.item; est.modo = null; est.escolha = null; est.motivo = ''; est.nota = ''; est.erroDec = null; est.conflito = null; est.decisao = null
    refazGaveta('#g-tit')
  } catch { /* fica como está */ }
}

// ======================= modal pequeno (switch e piloto) =======================
function modal (titulo, txt, botao, cls, comMotivo, ok) {
  quemAbriu = document.activeElement
  $('#camada').innerHTML = `<div class="veu centro" data-veu><div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-tit"><h2 id="m-tit">${esc(titulo)}</h2><p>${esc(txt)}</p>
    ${comMotivo ? '<label class="campo">Motivo (obrigatório, mínimo 5 caracteres)<textarea id="m-motivo" maxlength="300" aria-required="true" placeholder="O que aconteceu e por que é seguro"></textarea></label>' : ''}
    <p class="erro-dec" id="m-erro" role="alert" hidden></p>
    <div class="par"><button class="btn sec" type="button" data-fechar="1">Voltar</button><button class="btn ${cls}" type="button" id="m-ok"${comMotivo ? ' disabled' : ''}>${esc(botao)}</button></div></div></div>`
  $('#app').inert = true; $('#camada [data-fechar]').focus()
  const m = $('#m-motivo'); if (m) m.addEventListener('input', () => { $('#m-ok').disabled = m.value.trim().length < 5 })
  $('#m-ok').addEventListener('click', async () => {
    const bt = $('#m-ok'); bt.disabled = true
    const erro = await ok(m ? m.value.trim() : '')
    if (est.vencido) return
    // fechado (Esc/Voltar) com o POST em andamento: o erro vira aviso e nada mexe no que estiver aberto agora
    if (!document.contains(bt)) { if (erro) toast(erro, 'alert-triangle'); return }
    if (erro) { const p = $('#m-erro'); p.textContent = erro; p.hidden = false; bt.disabled = false; return }
    $('#camada').innerHTML = ''; $('#app').inert = false
  })
}
function modalSwitch (chave, acao) {
  const nome = nomeSw(chave), liga = acao === 'religar'
  modal(liga ? `Religar ${nome.toLowerCase()}?` : `Desligar ${nome.toLowerCase()} para todos?`,
    liga ? 'O que foi barrado continua parado. Religar não dispara nada sozinho.' : 'Vale em menos de 1 minuto para todos os pedidos. O que depender dele fica barrado até alguém da Liderança religar.',
    liga ? 'Religar' : 'Desligar para todos', liga ? 'pri' : 'dng', true, async (motivo) => {
      let r
      try { r = await api('POST', '/api/painel/switch', { chave, acao, motivo }) } catch { return 'Sem conexão. Nada mudou; tente de novo.' }
      if (r.status !== 200) return (r.corpo.error && r.corpo.error.message) || 'Não foi possível mudar o switch.'
      await buscarSwitches(); await telaSwitches(false)
      toast(`${nome}: ${liga ? 'religado' : 'desligado para todos'}.`)
      setTimeout(() => { if (!$('#camada [role="dialog"]')) ($(`[data-sw="${CSS.escape(chave)}"]`) || $('#t-sw'))?.focus() }, 0)
      return null
    })
}
function modalPiloto (cod) {
  modal(`Tirar ${cod} do piloto?`, 'Vale em menos de 1 minuto: nenhum efeito novo acontece neste imóvel. Voltar com ele é por deploy.', 'Tirar do piloto', 'dng', false, async () => {
    let r
    try { r = await api('POST', '/api/painel/piloto/tirar', { imovel: cod }) } catch { return 'Sem conexão. Nada mudou; tente de novo.' }
    if (r.status !== 200) return (r.corpo.error && r.corpo.error.message) || 'Não foi possível tirar do piloto.'
    await buscarSwitches(); await telaSwitches(false)
    toast(`${cod} saiu do piloto.`)
    setTimeout(() => { if (!$('#camada [role="dialog"]')) $('#t-pil')?.focus() }, 0)
    return null
  })
}
function toast (t, icone = 'check-circle-2') {
  $('#aviso').innerHTML = `<div class="toast${icone === 'check-circle-2' ? '' : ' alerta'}" role="status">${ic(icone)}${esc(t)}</div>`
  clearTimeout(toast.t); toast.t = setTimeout(() => { $('#aviso').innerHTML = '' }, 4000)
}

// ======================= roteador e eventos =======================
function contadores () {
  if (est.vencido) return
  const a = meus(), n = { fila: a.length, aprov: a.filter(ehAprov).length, urg: a.filter(ehPlantao).length, dec: est.decN || 0 }
  const estourado = a.some((i) => i.sla_min != null && i.sla_min < 0)
  document.querySelectorAll('[data-ct]').forEach((e) => {
    const k = e.dataset.ct, alerta = k === 'fila' && estourado
    e.textContent = n[k] || ''; e.hidden = !n[k]; e.classList.toggle('alerta', alerta)
    if (alerta) e.setAttribute('aria-label', `${n[k]} na fila, com SLA estourado`); else e.removeAttribute('aria-label')
  })
  const ctx = $('#ctx-atualizado'); if (ctx) ctx.textContent = est.atualizadoEm ? `Atualizado às ${hora(est.atualizadoEm)}` : 'Sem dados ainda'
}
function rota () { return location.hash.slice(1) || 'fila' }
function rotaBase () { const h = rota(); return h.startsWith('item/') ? est.origem : (TELAS[h] ? h : 'fila') }
function render () {
  if (est.vencido) return
  const h = rota(), ant = est.hashAnt
  const ehItem = h.startsWith('item/')
  // entrada empilhada: veio de uma tela para um item nesta visita; o Voltar fecha a gaveta
  if (ehItem && ant !== null && !ant.startsWith('item/')) est.empilhou = true
  if (!ehItem) est.empilhou = false
  est.hashAnt = h
  if (!ehItem) est.origem = TELAS[h] ? h : 'fila'
  const base = rotaBase()
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === base) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current')
  })
  $('#camada').innerHTML = ''; $('#app').inert = false
  TELAS[base]()
  contadores()
  if (ehItem) abrirItem(h.slice(5))
}
/** chave estável do elemento com foco na tela de baixo, para devolver o foco depois de redesenhar */
function chaveFoco () {
  const a = document.activeElement
  if (!a || a === document.body || !$('#tela').contains(a)) return null
  if (a.id) return { sel: '#' + CSS.escape(a.id), n: 0 }
  const attrs = ['data-abrir', 'data-pre', 'data-filtro', 'data-limpar', 'data-recarrega', 'href'].filter((k) => a.hasAttribute(k))
  const sel = a.tagName.toLowerCase() + [...a.classList].map((c) => '.' + CSS.escape(c)).join('') +
    attrs.map((k) => `[${k}="${CSS.escape(a.getAttribute(k))}"]`).join('') + (a.dataset.abrir && !a.dataset.pre ? ':not([data-pre])' : '')
  return { sel, n: [...$('#tela').querySelectorAll(sel)].indexOf(a) }
}
/** redesenha a tela de baixo (fila/aprovações/plantão) sem roubar o foco de quem está nela */
function redesenharBase () {
  const base = rotaBase()
  if (!['fila', 'aprovacoes', 'plantao'].includes(base)) return
  const a = document.activeElement
  if (a && a.tagName === 'SELECT' && $('#tela').contains(a)) return // um select aberto fecharia no meio da escolha
  const k = chaveFoco()
  TELAS[base]()
  if (k) { const l = $('#tela').querySelectorAll(k.sel); (l[k.n] || l[0])?.focus() }
}
async function atualizar () {
  if (est.vencido || !est.token) return
  await carregar()
  if (est.vencido) return
  contadores()
  redesenharBase()
}
function trocarTema () {
  const r = document.documentElement
  const escuro = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
  r.dataset.theme = escuro ? 'light' : 'dark'
  guardar(CHAVE_TEMA, r.dataset.theme)
}

window.addEventListener('hashchange', () => {
  const lido = lerTokenDoHash()
  if (lido === 'ruim') { linkVencido(); return }
  if (lido) { location.reload(); return }
  const vindoDeItem = (est.hashAnt || '').startsWith('item/')
  render()
  if (!$('#camada').innerHTML) {
    if (est.toast) { toast(est.toast); est.toast = null }
    if (vindoDeItem && !est.voltarFoco) est.voltarFoco = quemAbriu
    focaVolta()
  }
})
document.addEventListener('click', (e) => {
  const t = e.target.closest('button,a')
  if (!t) { if (e.target.matches('[data-veu]')) fechar(); return }
  if (t.dataset.abrir) { navegarItem(t.dataset.abrir, t); return }
  if (t.tagName === 'A' && (t.getAttribute('href') || '').startsWith('#item/')) { quemAbriu = `a[href="${CSS.escape(t.getAttribute('href'))}"]`; return }
  if (t.dataset.fechar) { if ($('.modal')) { $('#camada').innerHTML = ''; $('#app').inert = false; est.voltarFoco = quemAbriu; focaVolta() } else fechar(); return }
  if (t.dataset.filtro) { est.filtro = t.dataset.filtro; telaFila(); $(`[data-filtro="${est.filtro}"]`).focus(); return }
  if (t.dataset.limpar != null) { est.filtro = 'todas'; est.papel = 'todos'; telaFila(); $('#tela h1').focus(); return }
  if (t.id === 'confirmar') { confirmar(); return }
  if (t.id === 'falta') { const r = $(t.dataset.alvo); if (r) { r.scrollIntoView({ block: 'center' }); r.focus() } return }
  if (t.dataset.recarregar != null) { recarregarItem(); return }
  if (t.dataset.sw) { modalSwitch(t.dataset.sw, t.dataset.acao); return }
  if (t.dataset.piloto) { modalPiloto(t.dataset.piloto); return }
  if (t.dataset.tema != null) { trocarTema(); return }
  if (t.dataset.recarrega != null) { if (!est.eu) { location.reload(); return } carregar().then(() => { render(); $('#tela h1')?.focus() }) }
})
document.addEventListener('change', (e) => {
  const t = e.target
  if (t.name === 'dec' && est.item) { est.escolha = +t.value; est.motivo = ''; est.nota = ''; est.erroDec = null; refazGaveta(`input[name=dec][value="${t.value}"]`) }
  if (t.id === 'motivo' && est.item) { est.motivo = t.value; refazGaveta('#motivo') }
  if (t.id === 'papel') { est.papel = t.value; telaFila(); $('#papel').focus() }
  if (t.id === 'filtro-m') { est.filtro = t.value; telaFila(); $('#filtro-m').focus() }
})
document.addEventListener('input', (e) => {
  if (e.target.id !== 'nota' || !est.item) return
  est.nota = e.target.value
  const fl = falta(saidaEscolhida())
  const b = $('#confirmar'); if (b) b.disabled = !!fl || est.enviando
  const p = $('#falta'); if (p) { p.hidden = !fl; if (fl) { p.textContent = fl.t; p.dataset.alvo = fl.alvo } }
})
document.addEventListener('keydown', (e) => {
  const dlg = $('#camada [role="dialog"]'); if (!dlg) return
  if (e.key === 'Escape') { e.preventDefault(); if ($('.modal')) { $('#camada').innerHTML = ''; $('#app').inert = false; est.voltarFoco = quemAbriu; focaVolta() } else fechar(); return }
  if (e.key !== 'Tab') return
  const f = [...dlg.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select,textarea,[tabindex="0"]')].filter((x) => x.offsetParent && !x.hidden)
  if (!f.length) return
  // foco fora da lista (fora do diálogo ou no título #g-tit, que tem tabindex=-1): o ciclo recomeça dentro dele
  if (!f.includes(document.activeElement)) { e.preventDefault(); (e.shiftKey ? f[f.length - 1] : f[0]).focus(); return }
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus() } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
})

async function iniciar () {
  iconesEstaticos()
  const tema = ler(CHAVE_TEMA); if (tema === 'light' || tema === 'dark') document.documentElement.dataset.theme = tema
  if (lerTokenDoHash() === 'ruim') { linkVencido(); return }
  if (!est.token) est.token = ler(CHAVE_TOKEN)
  if (!est.token) { linkVencido(); return }
  let r
  try { r = await api('GET', '/api/painel/eu') } catch { if (!est.vencido) telaErro(); return }
  if (r.status !== 200 || !r.corpo.papel) { telaErro(); return }
  est.eu = r.corpo
  preencherEu()
  await carregar()
  if (est.vencido) return
  render()
  setInterval(atualizar, ATUALIZA_MS)
}
iniciar()
})()
