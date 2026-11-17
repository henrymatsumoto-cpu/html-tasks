// ConcertAI · helpers e componentes de interface (sem dado nenhum aqui).
// Visual: docs/direcao-visual.md. Ícones: Lucide 0.460.0 (window.lucide).
import { STATUS, ETAPAS, etapaDe, somarDias, isoDia, rotuloStatus } from './api.js?v=79617c8'

export const $ = (s, el = document) => el.querySelector(s)
export const $$ = (s, el = document) => [...el.querySelectorAll(s)]

/** escapa texto vindo de dado (nome, observação) antes de pôr no HTML */
export function esc(v) { return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]) }

export const ic = (nome, cls = '') => `<i data-lucide="${nome}"${cls ? ` class="${cls}"` : ''}></i>`
export function icones() { try { window.lucide && window.lucide.createIcons() } catch { /* sem lucide */ } }

export const brl = (cents) => 'R$ ' + (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })
export const iniciais = (n) => String(n || '').split(/\s+/).filter(Boolean).map((s) => s[0]).join('').slice(0, 2).toUpperCase()
const DOW = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const paraData = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d) }
/** "seg 24/11" */
export const fmtDia = (iso) => { const d = paraData(iso); return `${DOW[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` }
/** "hoje" / "amanhã" / "seg 24/11" */
export const fmtDiaRel = (iso) => iso === isoDia(0) ? 'hoje' : iso === isoDia(1) ? 'amanhã' : iso === isoDia(-1) ? 'ontem' : fmtDia(iso)
/** "13h–15h" */
export const fmtJanela = (inicio, janelas) => `${inicio}h–${inicio + janelas}h`
/** "~1h" / "~45 min" a partir de duracao_min/duracao_max do serviço */
export function fmtDuracao(sv) {
  const m = sv.duracao_max || sv.duracao_min
  if (m < 60) return `~${m} min`
  const h = Math.floor(m / 60); const r = m % 60
  return r ? `~${h}h${String(r).padStart(2, '0')}` : `~${h}h`
}

/** <img> com fallback (bloco azul-claro com ícone home), nunca retângulo cinza */
export const img = (src, cls = '', alt = '') => src ? `<img src="${esc(src)}" class="${cls}" alt="${esc(alt)}" loading="lazy" onerror="window.__fbImg(this)">` : `<div class="${cls} fb">${ic('home')}</div>`
window.__fbImg = (el) => { const d = document.createElement('div'); d.className = (el.className || '') + ' fb'; d.innerHTML = ic('home'); el.replaceWith(d); icones() }

export const avatar = (nome, cls = '') => `<div class="av ${cls}" aria-hidden="true">${esc(iniciais(nome))}</div>`
export const estrela = () => ic('star', 'star')

/** papel (opcional) = quem está vendo: muda o rótulo de aguardando_aprovacao */
export function badgeStatus(p, papel) {
  const s = STATUS[p.status] || { tom: 'no' }
  return `<span class="badge b-${s.tom}">${esc(rotuloStatus(p.status, papel))}</span>`
}

/** Aviso fixo de material (nunca escondido). compacto = uma linha 12px. */
export function avisoMaterial(compacto = false) {
  if (compacto) return `<div class="mline">${ic('package')}<span>Material e peças não estão inclusos: se precisar, o profissional informa o valor antes e você aprova.</span></div>`
  return `<div class="mat">${ic('package')}<div><b>Material e peças não estão inclusos</b><p>Se precisar, o profissional informa o valor antes e você aprova.</p></div></div>`
}

/** Linha do tempo do pedido */
export function linhaDoTempo(p) {
  const at = etapaDe(p)
  return `<div class="tl">${ETAPAS.map((e, i) => `<div class="${i < at || (i === at && p.status === 'concluido' && i === 4) ? 'd' : i === at ? 'c' : ''}"><span class="pt">${i < at ? ic('check') : ''}</span>${esc(e)}</div>`).join('')}</div>`
}

/** Estado vazio */
export function vazio({ icone = 'inbox', titulo, texto = '', acao = '' }) {
  return `<div class="empty"><div class="c">${ic(icone)}</div><h3>${esc(titulo)}</h3>${texto ? `<p class="sub">${esc(texto)}</p>` : ''}${acao}</div>`
}

export function carregando(n = 3) { return `<p class="sub" role="status">Só um instante…</p><div class="list mt8">${Array.from({ length: n }, () => '<div class="card skel" style="height:88px"></div>').join('')}</div>` }

// ---------- sheet, toast ----------
export function abrirSheet(html, { aoFechar } = {}) {
  const raiz = $('#sheet')
  raiz.innerHTML = `<div class="backdrop" data-fechar="1"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`
  icones()
  const fechar = () => { raiz.innerHTML = ''; aoFechar && aoFechar() }
  raiz.onclick = (e) => { if (e.target.dataset.fechar || e.target.closest('[data-fechar-sheet]')) fechar() }
  const b = $('.sheet button', raiz); b && b.focus()
  return { fechar, el: $('.sheet', raiz) }
}
export function fecharSheet() { $('#sheet').innerHTML = '' }

let tToast
export function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(tToast); tToast = setTimeout(() => el.classList.remove('show'), 3000) }

/** Mostra erro da API como toast (mensagem já é pra pessoa; nada de detalhe técnico) */
export const ERRO_GENERICO = 'Algo deu errado do nosso lado. Tente de novo em alguns minutos.'
/** Erro com `code` vem da API com mensagem pra pessoa; o resto (bug, rede) vira a mensagem genérica. */
export function falha(e) { console.warn(e); toast(e && e.code && e.message ? e.message : ERRO_GENERICO) }

// ---------- calendário com aviso de reserva (não bloqueia) ----------
/**
 * Calendário de um mês. Reserva = barra azul na base (dia continua clicável).
 * opts: { mes: Date(1º dia), reservas: [{check_in, check_out}], marcados: Set(ISO com visita), disponiveis: {ISO:bool}|null,
 *         selecionado: ISO, minimo: ISO, aoEscolher(iso), aoMudarMes(delta) }
 * Devolve HTML; ligue os eventos com ligarCalendario(el, opts).
 */
export function calendario(o) {
  const ano = o.mes.getFullYear(); const m = o.mes.getMonth()
  const primeiro = new Date(ano, m, 1).getDay(); const total = new Date(ano, m + 1, 0).getDate()
  const hoje = isoDia(0); const min = o.minimo || hoje
  const iso = (d) => `${ano}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const naEstadia = (x) => (o.reservas || []).find((r) => x >= r.check_in && x <= r.check_out)
  let cel = ''
  for (let i = 0; i < primeiro; i++) cel += '<div></div>'
  for (let d = 1; d <= total; d++) {
    const x = iso(d); const r = naEstadia(x)
    const passado = x < min; const semJanela = o.disponiveis && o.disponiveis[x] === false
    const cls = ['day']
    if (passado || semJanela) cls.push('dis')
    if (x === hoje) cls.push('today')
    if (x === o.selecionado) cls.push('on')
    if (r) { cls.push('stay'); if (x === r.check_in || d === 1) cls.push('s0'); if (x === r.check_out || d === total) cls.push('s1') }
    const bed = r && x === r.check_in ? `<span class="bed">${ic('bed-double')}</span>` : ''
    const dot = o.marcados && o.marcados.has(x) ? '<span class="dot"></span>' : ''
    cel += `<button type="button" class="${cls.join(' ')}" data-dia="${x}" ${passado || semJanela ? 'disabled' : ''} aria-label="${fmtDia(x)}${r ? ', tem hóspede' : ''}"><span class="nb">${d}</span>${bed}${dot}</button>`
  }
  const podeVoltar = new Date(ano, m, 1) > paraData(hoje)
  return `<div class="calwrap">
    <div class="calh"><button type="button" data-mes="-1" ${podeVoltar ? '' : 'disabled'} aria-label="Mês anterior">${ic('chevron-left')}</button><b>${MESES[m]} ${ano}</b><button type="button" data-mes="1" aria-label="Próximo mês">${ic('chevron-right')}</button></div>
    <div class="cal">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((x) => `<div class="dw">${x}</div>`).join('')}${cel}</div>
    <div class="legend"><span><i style="width:14px;height:6px;border-radius:9999px;background:var(--stay-bar)"></i>Reserva</span>${o.marcados ? '<span><i style="width:6px;height:6px;border-radius:50%;background:var(--visit-dot)"></i>Tem agenda</span>' : ''}</div>
  </div>`
}
export function ligarCalendario(el, o) {
  el.querySelectorAll('[data-dia]').forEach((b) => b.addEventListener('click', () => o.aoEscolher && o.aoEscolher(b.dataset.dia)))
  el.querySelectorAll('[data-mes]').forEach((b) => b.addEventListener('click', () => o.aoMudarMes && o.aoMudarMes(Number(b.dataset.mes))))
}

/** Aviso inline (não modal) quando o dia escolhido tem hóspede */
export function avisoHospede() { return `<div class="info" role="status">${ic('bed-double')}<span><b>Tem hóspede nesse dia.</b> Dá para marcar mesmo assim (às vezes o conserto não pode esperar). A franquia combina o acesso.</span></div>` }

/** Pílulas de janela de 1h. janelas = retorno de janelasDisponiveis. */
export function pilulasJanela(janelas, selecionada) {
  if (!janelas.length) return '<p class="sub mt8">Sem horário nesse dia.</p>'
  return `<div class="slots">${janelas.map((j) => `<button type="button" class="slot ${j.janela_inicio === selecionada ? 'on' : ''}" data-janela="${j.janela_inicio}" ${j.disponivel ? '' : 'disabled'} ${j.aviso_reserva ? 'title="Entra durante a estadia"' : ''}>${j.aviso_reserva ? '<span class="bd"></span>' : ''}${fmtJanela(j.janela_inicio, j.janela_fim - j.janela_inicio)}</button>`).join('')}</div>`
}

/** Cabeçalho de passo com voltar + título + pontos de progresso */
export function cabecalhoPasso(titulo, { voltar = '', passo = 0, total = 0 } = {}) {
  return `<div class="steph">${voltar ? `<a class="back" href="${voltar}" aria-label="Voltar">${ic('arrow-left')}</a>` : ''}<h1>${esc(titulo)}</h1></div>${total ? `<div class="dots">${Array.from({ length: total }, (_, i) => `<i class="${i < passo ? 'on' : ''}"></i>`).join('')}</div>` : ''}`
}

/** Card de pedido usado nas listas: sempre <article> com "PED-{n}". link = o card inteiro abre o detalhe
 *  (link esticado; botões em `extra` ficam clicáveis por cima). papel = quem vê (rótulo do status). */
export function cardPedido(p, { extra = '', link = '', mostrarImovel = true, mostrarPrestador = true, papel } = {}) {
  const titulo = link ? `<a class="ord-lnk" href="${esc(link)}">${esc(p.servico.nome)}</a>` : esc(p.servico.nome)
  return `<article class="card ord${link ? ' ord-click' : ''}">
    <div class="hd"><div><b>${titulo}</b><div class="cap"><span class="code">PED-${esc(p.numero)}</span>${mostrarImovel ? ` · ${esc(p.imovel.nome)} <span class="code">${esc(p.imovel.codigo)}</span>` : ''}</div></div>${badgeStatus(p, papel)}</div>
    <div class="meta"><span>${ic('calendar-check')}${fmtDiaRel(p.data)} · ${fmtJanela(p.janela_inicio, p.janelas)}</span>${mostrarPrestador ? `<span>${ic('user')}${esc(p.prestador.nome)}</span>` : ''}<span class="tn">${ic('badge-check')}${brl(p.preco_cents)}</span>${p.aviso_reserva ? `<span>${ic('bed-double')}Tem hóspede</span>` : ''}</div>
    ${extra ? `<div class="ord-extra">${extra}</div>` : ''}
  </article>`
}

export { somarDias, isoDia }
