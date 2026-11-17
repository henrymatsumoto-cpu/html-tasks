// ConcertAI · fluxo de contratar (compartilhado por proprietário e franquia).
//
// Estado inteiro na query do hash (#/<papel>/contratar?imovel=&servico=&data=&janela=&prestador=&etapa=),
// então voltar/recarregar sempre cai no passo certo. Depois de criar: ?pedido=<id> (tela de confirmação).
// Passos (REGRA 17/11): imóvel → serviço → data e horário → profissional (só quem está livre nesse momento, atende
// a região do imóvel e trabalha nesse horário, melhores primeiro) → revisar → confirmação.
// Pedido só com 3h de antecedência do início da janela; o profissional tem 1h para confirmar (senão o comprador troca).
// O "carrinho" guarda 1 serviço (pedidos.servico_codigo é único): adicionar outro troca.
// Textos: docs/textos/site-e-telas.md (seções 3 e 4). Os marcados com cadeado lá são lidos pelo E2E.
//
// Imóveis (REGRA 17/11): vêm de imoveisDoComprador(). Na demo o proprietário vê os dele e depois TODOS os imóveis da
// Seazone; no real, só os dele (RLS), com o calendário de reservas sincronizado (calendario.origem/sincronizado_em).
// A escolha do imóvel é um dropdown com busca (seletor-imovel.js) no topo de todos os passos; trocar o imóvel
// recarrega o passo com os serviços, horários e profissionais dele (o profissional escolhido cai: a área muda).
// Ponto de integração do calendário real: o job da Stays (src/integracoes/stays.ts) grava concertai.reservas
// (origem 'stays') e marca imoveis.calendario_sincronizado_em; esta tela só lê.
import {
  listarCategorias, listarServicos, listarReservas, listarPedidos, imoveisDoComprador,
  horariosDisponiveis, prestadoresDisponiveis, trocarPrestador, criarPedido, obterPedido, termosAceitos, aceitarTermos,
  LIMITE_APROVACAO_CENTS, ANTECEDENCIA_MIN_H, MOTIVOS, DIAS_SEMANA, minutosParaConfirmar, podeTrocarPrestador,
} from '../api.js?v=79617c8'
import {
  $, esc, ic, icones, brl, fmtDia, fmtDiaRel, fmtJanela, img, avatar, estrela, badgeStatus,
  avisoMaterial, vazio, carregando, abrirSheet, toast, falha, calendario, ligarCalendario, avisoHospede,
  cabecalhoPasso, isoDia, somarDias, paraData,
} from '../ui.js?v=79617c8'
import { seletorImovel, ligarSeletorImovel } from './seletor-imovel.js?v=79617c8'
import { montarPagamento, faixaPago, TEXTO_GUARDADO } from './pagamento.js?v=79617c8'
import { pagaNoAto, cobrancaDoPedido } from '../api.js?v=79617c8'

const CHAVES = ['imovel', 'servico', 'data', 'janela', 'prestador', 'etapa']
const ATIVOS = ['aguardando_aprovacao', 'aguardando_prestador', 'confirmado', 'em_execucao']
const PARADAS = new Set(['de', 'da', 'do', 'das', 'dos', 'nao', 'no', 'na', 'com', 'um', 'uma', 'para', 'pra', 'que', 'meu', 'minha', 'esta', 'ta'])
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const isoValido = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '')
const isoMes = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
const fimMes = (d) => { const x = new Date(d.getFullYear(), d.getMonth() + 1, 0); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
const notaFmt = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const precisaAprovar = (papel, sv) => papel === 'franquia' && sv.preco_cents > LIMITE_APROVACAO_CENTS
const dm = (iso) => { const d = paraData(iso); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` }
/** nome sem o ponto final da abreviação ("Elisa M." → "Elisa M"), para não sair "M.." na frase */
const semPonto = (s) => String(s || '').replace(/\.$/, '')
/** nome da franquia sem o prefixo "Franquia" (para "em nome da franquia Norte da Ilha") */
const nomeFranquia = (s) => String(s || '').replace(/^franquia\s+/i, '')
/** "14h05" de um ISO datetime, no fuso do navegador */
const hhmm = (iso) => { const d = new Date(iso); return `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}` }
/** Erros de horário que mandam o comprador escolher outro horário (demo: janela_ocupada; banco: janela_indisponivel). */
const ERROS_HORARIO = ['janela_ocupada', 'janela_indisponivel', 'antecedencia_minima', 'janela_invalida', 'fora_da_area']

/** "30 a 45 min" · "45 min a 1h" · "1h a 1h30" (duracao_min/duracao_max do serviço) */
export function duracaoFaixa(sv) {
  const f = (m) => m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`
  const a = sv.duracao_min; const b = sv.duracao_max || a
  if (!b || a === b) return f(a || b)
  if (a < 60 && b < 60) return `${a} a ${b} min`
  return `${f(a)} a ${f(b)}`
}

/** Aviso da peça do serviço (REGRA 17/11: nenhuma peça está inclusa). Usa servicos.aviso_peca; sem ele, o texto geral. */
export function avisoPeca(sv, cls = '') {
  const t = sv && sv.aviso_peca ? sv.aviso_peca : 'Não inclui peças: qualquer peça é comprada à parte (você compra ou aprova o valor antes).'
  return `<p class="cap ctr-peca ${cls}">${ic('package', 'i14')}<span>${esc(t)}</span></p>`
}

/** Primeiro dia (a partir de hoje) sem hóspede no imóvel. reservas = [{check_in, check_out}] */
export function proximoDiaLivre(reservas, aPartir = isoDia(0)) {
  for (let i = 0, d = aPartir; i < 180; i++, d = somarDias(d, 1)) {
    if (!reservas.some((r) => d >= r.check_in && d <= r.check_out)) return d
  }
  return null
}
export const fmtDiaLivre = (d) => d ? maiuscula(fmtDiaRel(d)) + (fmtDiaRel(d) === fmtDia(d) ? '' : ` (${dm(d)})`) : 'nenhum nos próximos meses'

/** Linha "Calendário sincronizado" do imóvel (calendario: { origem, sincronizado_em }). */
export function linhaCalendario(im) {
  const c = im && im.calendario
  if (!c) return ''
  if (c.origem === 'demo') return `<div class="cap ctr-ib ctr-sync">${ic('refresh-cw', 'i14')}Calendário de teste</div>`
  const fonte = c.origem === 'stays' ? 'Stays' : c.origem === 'sapron' ? 'Sapron' : 'cadastro'
  return c.sincronizado_em
    ? `<div class="cap ctr-ib ctr-sync">${ic('refresh-cw', 'i14')}Reservas sincronizadas (${fonte}) ${esc(fmtDiaRel(String(c.sincronizado_em).slice(0, 10)))}, ${esc(hhmm(c.sincronizado_em))}</div>`
    : `<div class="cap ctr-ib ctr-sync">${ic('calendar-x', 'i14')}Reservas ainda não sincronizadas</div>`
}

function rodape(html) {
  $('#rodape').innerHTML = `<div class="cartbar"><div class="in">${html}</div></div>`
  document.body.classList.add('hascart')
  icones()
}

/**
 * Desenha o passo certo do fluxo de contratar a partir de ctx.query.
 * @param ctx  contexto do roteador ({ el, query, sessao, ir, ... })
 * @param opts { papel: 'proprietario'|'franquia', voltar: hash de saída do fluxo }
 */
export async function fluxoContratar(ctx, { papel, voltar = '' } = {}) {
  const sair = voltar || `#/${papel}`
  const base = `#/${papel}/contratar`
  const q = ctx.query || {}
  /** hash do fluxo com as escolhas dadas (só as chaves conhecidas, na ordem) */
  const link = (o = {}) => {
    const p = new URLSearchParams()
    for (const k of CHAVES) if (o[k] != null && o[k] !== '') p.set(k, o[k])
    const s = p.toString()
    return s ? `${base}?${s}` : base
  }
  ctx.el.innerHTML = `<div class="wrap mt16">${carregando(3)}</div>`

  try {
    if (q.pedido) return await passoFeito(ctx, { papel, sair, base, pedidoId: q.pedido })

    const imoveis = await imoveisDoComprador()
    if (!imoveis.length) {
      ctx.el.innerHTML = `<div class="wrap">${vazio({ icone: 'home', titulo: 'Nenhum imóvel por aqui', texto: 'Não achamos imóveis no seu nome. Se isso estiver errado, fale com a gente pela SIA.', acao: `<a class="btn out sm mt8" href="${esc(sair)}">Voltar</a>` })}</div>`
      return
    }
    const imovel = imoveis.find((i) => i.id === q.imovel) || (imoveis.length === 1 ? imoveis[0] : null)
    const fra = papel === 'franquia'
    const nav = {
      papel, sair, link, total: 4, sessao: ctx.sessao,
      /** dropdown do imóvel no topo do passo */
      seletor: (im) => `<div class="ctr-topo-imv">${seletorImovel({ imoveis, atual: im ? im.id : '', rotulo: fra ? 'Imóvel da carteira' : 'Seu imóvel', vazio: fra ? 'Escolha o imóvel da carteira' : 'Escolha o seu imóvel', cadastrar: papel === 'anfitriao' ? `#/anfitriao/imovel/novo` : `#/${papel}/imovel-fora` })}${im ? linhaCalendario(im) : ''}</div>`,
      /** destino(im) = hash do mesmo passo com o imóvel novo */
      ligarSeletor: (im, destino, o = {}) => ligarSeletorImovel(ctx.el, { imoveis, atual: im ? im.id : '', aoEscolher: (novo) => ctx.ir(destino(novo)), ...o }),
    }

    if (!imovel) return passoImovel(ctx, nav)
    const sel = { imovel: imovel.id }

    const [servicos, categorias] = await Promise.all([listarServicos(), listarCategorias()])
    const servico = servicos.find((s) => s.codigo === q.servico) || null
    const etapa = servico ? q.etapa : ''
    if (!etapa || !['data', 'pro', 'revisar'].includes(etapa)) return await passoServico(ctx, nav, { imovel, servicos, categorias, servico, q })
    sel.servico = servico.codigo

    const data = isoValido(q.data) && q.data >= isoDia(0) ? q.data : ''
    const janela = Number.parseInt(q.janela, 10)
    const janelaOk = data && Number.isInteger(janela) && janela >= 8 && janela + servico.janelas <= 17
    if (etapa === 'data' || !janelaOk) return passoAgenda(ctx, nav, { imovel, servico, sel, data, janela: janelaOk ? janela : null })
    sel.data = data; sel.janela = janela

    if (etapa === 'pro' || !q.prestador) return await passoProfissional(ctx, nav, { imovel, servico, sel, prestadorId: q.prestador || '' })
    return await passoRevisar(ctx, nav, { imovel, servico, sel, prestadorId: q.prestador })
  } catch (e) { falha(e); ctx.el.innerHTML = `<div class="wrap">${vazio({ icone: 'wifi-off', titulo: 'Não deu para carregar', texto: 'Algo deu errado do nosso lado. Tente de novo em alguns minutos.' })}</div>` }
}

// ---------- 1. imóvel (3.1): só o dropdown, já aberto ----------
function passoImovel(ctx, nav) {
  const fra = nav.papel === 'franquia'
  ctx.el.innerHTML = `${cabecalhoPasso(fra ? 'Para qual imóvel?' : 'Qual imóvel?', { voltar: nav.sair })}
    <div class="wrap ctr-imvs">
      <p class="sub ctr-lead">${fra ? 'Escolha o imóvel da carteira que precisa do serviço.' : 'Escolha o imóvel que precisa do serviço.'} Depois mostramos os serviços, os horários e os profissionais que atendem a região dele.</p>
      ${nav.seletor(null)}
    </div>`
  icones()
  nav.ligarSeletor(null, (im) => nav.link({ imovel: im.id }), { abrir: true })
}

// ---------- 2. vitrine + carrinho (3.2, 3.3) ----------
async function passoServico(ctx, nav, { imovel, servicos, categorias, servico, q }) {
  const catsUsadas = categorias.filter((c) => servicos.some((s) => s.categoria_codigo === c.codigo))
  const porCodigo = Object.fromEntries(categorias.map((c) => [c.codigo, c]))
  const st = { cat: catsUsadas.some((c) => c.codigo === q.cat) ? q.cat : '', busca: q.q || '', carrinho: servico ? servico.codigo : '', outroProblema: new Set() }
  // pedidos ativos do imóvel, para avisar pedido em dobro (não bloqueia)
  const ativos = (await listarPedidos().catch(() => [])).filter((p) => p.imovel_id === imovel.id && ATIVOS.includes(p.status))
  const quemFez = (p) => p.comprador_papel === nav.papel ? 'você' : p.comprador_papel === 'franquia' ? 'a franquia' : 'o proprietário'

  ctx.el.innerHTML = `${cabecalhoPasso('O que precisa?', { voltar: nav.sair, passo: 1, total: nav.total })}
    <div class="wrap">
      ${nav.seletor(imovel)}
      ${avisoMaterial(true)}
      <label class="search ctr-busca mt16">${ic('search')}<input id="ctr-q" type="search" placeholder="Ex.: chuveiro não esquenta" value="${esc(st.busca)}" aria-label="Buscar serviço" autocomplete="off"></label>
      <div class="ctr-chips" role="group" aria-label="Categorias">
        <button type="button" class="ctr-chip" data-cat="" aria-pressed="${!st.cat}">${ic('layout-grid')}Todos</button>
        ${catsUsadas.map((c) => `<button type="button" class="ctr-chip" data-cat="${esc(c.codigo)}" aria-pressed="${st.cat === c.codigo}">${ic(c.icone || 'wrench')}${esc(c.nome)}</button>`).join('')}
      </div>
      <p class="sub ctr-cont" id="ctr-cont"></p>
      <div class="list" id="ctr-lista"></div>
    </div>`

  const lista = $('#ctr-lista', ctx.el)
  const dobroDe = (codigo) => st.outroProblema.has(codigo) ? null : ativos.find((p) => p.servico_codigo === codigo) || null

  const desenharRodape = () => {
    const sv = servicos.find((s) => s.codigo === st.carrinho)
    if (!sv) { $('#rodape').innerHTML = ''; document.body.classList.remove('hascart'); return }
    rodape(`<div class="tt"><b class="tn">1 serviço · ${brl(sv.preco_cents)}</b><span>${esc(sv.nome)}</span></div>
      <button type="button" class="btn cta" id="ctr-ir">Escolher data e horário</button>`)
    $('#ctr-ir').onclick = () => { if (st.carrinho) ctx.ir(nav.link({ imovel: imovel.id, servico: st.carrinho, etapa: 'data' })) }
  }

  const desenharLista = () => {
    const toks = norm(st.busca).split(/\s+/).filter((t) => t.length > 1 && !PARADAS.has(t))
    const l = servicos
      .filter((s) => !st.cat || s.categoria_codigo === st.cat)
      .map((s) => {
        const palheiro = norm(`${s.nome} ${s.descricao} ${(porCodigo[s.categoria_codigo] || {}).nome || ''}`)
        return { s, n: toks.filter((t) => palheiro.includes(t)).length }
      })
      .filter((x) => !toks.length || x.n > 0)
      .sort((a, b) => b.n - a.n)
      .map((x) => x.s)
    $('#ctr-cont', ctx.el).textContent = l.length ? `${l.length} serviço${l.length === 1 ? '' : 's'} · preço fechado pela Seazone` : ''
    lista.innerHTML = l.length
      ? l.map((s) => cardServico(s, porCodigo[s.categoria_codigo], { noCarrinho: st.carrinho === s.codigo, dobro: st.carrinho === s.codigo ? dobroDe(s.codigo) : null, quemFez, papel: nav.papel })).join('')
      : vazio({ icone: 'search-x', titulo: 'Não achamos esse serviço', texto: 'Tente outra palavra ou descreva o problema para a gente pela SIA.', acao: '<button type="button" class="btn out sm mt8" id="ctr-limpar">Ver todos</button>' })
    icones()
    const limpar = $('#ctr-limpar', lista)
    if (limpar) limpar.onclick = () => { st.busca = ''; st.cat = ''; $('#ctr-q', ctx.el).value = ''; marcarChips(); desenharLista() }
  }
  const marcarChips = () => ctx.el.querySelectorAll('[data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === st.cat)))
  const lembrarUrl = () => history.replaceState(null, '', nav.link({ imovel: imovel.id, servico: st.carrinho }))

  const adicionar = (codigo) => {
    if (st.carrinho === codigo) { st.carrinho = ''; lembrarUrl(); desenharLista(); desenharRodape(); return }
    if (st.carrinho) toast('Por enquanto é um serviço por pedido')
    st.carrinho = codigo
    lembrarUrl(); desenharLista(); desenharRodape()
  }
  const detalhe = (codigo) => {
    const s = servicos.find((x) => x.codigo === codigo)
    if (!s) return
    const sh = abrirSheet(`<h2>${esc(s.nome)}</h2>
      <p class="sub mt8">${esc(s.descricao)}</p>
      <div class="meta"><span>${ic('clock')}Duração: ${esc(duracaoFaixa(s))}</span><span>${ic('shield-check')}Garantia de 90 dias</span><span class="tn">${ic('badge-check')}${brl(s.preco_cents)}</span></div>
      <h4>O que inclui</h4>
      <ul class="yes">${(s.inclui || []).map((t) => `<li>${ic('check')}<span>${esc(t)}</span></li>`).join('')}</ul>
      <h4>O que não inclui</h4>
      <ul class="no">${(s.nao_inclui || []).map((t) => `<li>${ic('x')}<span>${esc(t)}</span></li>`).join('')}</ul>
      ${avisoPeca(s)}
      ${avisoMaterial()}
      <button type="button" class="btn pri w" id="ctr-sheet-ok">${st.carrinho === codigo ? 'Já está no pedido' : `Adicionar · ${brl(s.preco_cents)}`}</button>`)
    $('#ctr-sheet-ok', sh.el).onclick = () => { sh.fechar(); if (st.carrinho !== codigo) adicionar(codigo) }
  }

  ctx.el.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { st.cat = b.dataset.cat; marcarChips(); desenharLista() }))
  $('#ctr-q', ctx.el).addEventListener('input', (e) => { st.busca = e.target.value; desenharLista() })
  lista.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]'); if (add) { adicionar(add.dataset.add); return }
    const det = e.target.closest('[data-det]'); if (det) { detalhe(det.dataset.det); return }
    const outro = e.target.closest('[data-outro]'); if (outro) { st.outroProblema.add(outro.dataset.outro); desenharLista(); ctx.ir(nav.link({ imovel: imovel.id, servico: outro.dataset.outro, etapa: 'data' })) }
  })
  nav.ligarSeletor(imovel, (im) => nav.link({ imovel: im.id, servico: st.carrinho }))
  desenharLista()
  desenharRodape()
}

function cardServico(s, c, { noCarrinho, dobro, quemFez, papel }) {
  return `<article class="card ctr-svc${noCarrinho ? ' sel' : ''}">
    <div class="ctr-svc-hd">
      <div class="ctr-min"><div class="nm">${esc(s.nome)}</div><div class="ds">${esc(s.descricao)}</div></div>
      <div class="pr"><span class="ap">preço fechado</span><b>${brl(s.preco_cents)}</b></div>
    </div>
    <div class="meta"><span>${ic('clock')}${esc(duracaoFaixa(s))}</span>${c ? `<span>${ic(c.icone || 'wrench')}${esc(c.nome)}</span>` : ''}<span>${ic('shield-check')}90 dias de garantia</span><span>${ic('package')}Peças à parte</span></div>
    ${avisoPeca(s)}
    <div class="ctr-svc-ac">
      <button type="button" class="lnk" data-det="${esc(s.codigo)}">${ic('info', 'i14')}O que inclui</button>
      ${noCarrinho
        ? `<button type="button" class="btn sm ctr-added" data-add="${esc(s.codigo)}" aria-pressed="true" aria-label="Tirar ${esc(s.nome)} do pedido">${ic('check')}Adicionado</button>`
        : `<button type="button" class="btn out sm" data-add="${esc(s.codigo)}" aria-label="Adicionar ${esc(s.nome)}">${ic('plus')}Adicionar</button>`}
    </div>
    ${dobro ? `<div class="warnbox ctr-dobro">${ic('copy')}<div><span>Já existe um pedido de ${esc(s.nome)} nesse imóvel em ${esc(dm(dobro.data))}, feito por ${esc(quemFez(dobro))}. É outro problema?</span>
      <div class="row mt8"><a class="btn out sm" href="#/${esc(papel)}/pedido/${encodeURIComponent(dobro.id)}">Ver pedido</a><button type="button" class="btn out sm" data-outro="${esc(s.codigo)}">É outro problema, continuar</button></div></div></div>` : ''}
  </article>`
}

// ---------- 3. data e horário (3.5): ANTES do profissional (REGRA 17/11) ----------
/** Pílulas de horário com quantos profissionais estão livres. horarios = retorno de horariosDisponiveis. */
function pilulasHorario(horarios, selecionada) {
  if (!horarios.length) return '<p class="sub mt8">Sem horário nesse dia.</p>'
  return `<div class="slots ctr-slots">${horarios.map((j) => {
    const livre = !j.motivo && j.n_prestadores > 0
    const sub = livre ? `${j.n_prestadores} livre${j.n_prestadores > 1 ? 's' : ''}` : j.motivo === 'menos_de_3h' ? 'menos de 3h' : j.motivo === 'passou' ? 'passou' : 'lotado'
    return `<button type="button" class="slot ctr-slot ${j.janela_inicio === selecionada ? 'on' : ''}" data-janela="${j.janela_inicio}" ${livre ? '' : 'disabled'}
      title="${esc(livre ? (j.aviso_reserva ? 'Entra durante a estadia' : `${j.n_prestadores} profissional(is) livre(s)`) : MOTIVOS[j.motivo] || '')}"
      aria-label="${fmtJanela(j.janela_inicio, j.janela_fim - j.janela_inicio)}, ${esc(livre ? sub : MOTIVOS[j.motivo] || sub)}">
      <span class="ctr-slot-h">${j.aviso_reserva ? '<span class="bd"></span>' : ''}${fmtJanela(j.janela_inicio, j.janela_fim - j.janela_inicio)}</span><span class="ctr-slot-n">${esc(sub)}</span></button>`
  }).join('')}</div>`
}

function passoAgenda(ctx, nav, { imovel, servico, sel, data, janela }) {
  const st = { data, janela, mes: data ? paraData(data) : paraData(isoDia(0)), reservas: [] }
  st.mes = new Date(st.mes.getFullYear(), st.mes.getMonth(), 1)
  const horas = servico.janelas
  ctx.el.innerHTML = `${cabecalhoPasso('Quando?', { voltar: nav.link({ imovel: sel.imovel, servico: sel.servico }), passo: 2, total: nav.total })}
    <div class="wrap ctr-quando">
      ${nav.seletor(imovel)}
      <p class="sub">${esc(servico.nome)} · ${esc(duracaoFaixa(servico))}</p>
      <p class="cap ctr-ib ctr-regra">${ic('info', 'i14')}Escolha o dia e o horário primeiro: depois mostramos só os profissionais livres nesse momento que atendem ${esc(imovel.bairro || imovel.cidade || 'a região do imóvel')}. Pedidos com pelo menos ${ANTECEDENCIA_MIN_H}h de antecedência.</p>
      <div class="ctr-quando-g">
        <div class="card" id="ctr-cal"><div class="ctr-calskel skel"></div></div>
        <div id="ctr-hor"></div>
      </div>
    </div>`

  const desenharRodape = () => {
    rodape(`<div class="tt"><b class="tn">1 serviço · ${brl(servico.preco_cents)}</b><span>${st.data && st.janela != null ? `${esc(maiuscula(fmtDia(st.data)))} · ${fmtJanela(st.janela, horas)}` : 'Escolha o dia e o horário'}</span></div>
      <button type="button" class="btn cta" id="ctr-ir" ${st.data && st.janela != null ? '' : 'disabled'}>Ver profissionais livres</button>`)
    $('#ctr-ir').onclick = () => { if (st.data && st.janela != null) ctx.ir(nav.link({ ...sel, data: st.data, janela: st.janela, etapa: 'pro' })) }
  }

  const cabHorario = () => `<h3 class="ctr-h">Horário</h3><p class="sub">${esc(maiuscula(fmtDiaRel(st.data)))} · janelas de 1h, das 8h às 17h.</p>`
  const desenharHorarios = async () => {
    const box = $('#ctr-hor', ctx.el)
    if (!box) return
    if (!st.data) { box.innerHTML = '<p class="sub">Escolha um dia para ver os horários com profissional livre.</p>'; return }
    box.innerHTML = `${cabHorario()}<div class="ctr-slotskel skel mt8"></div>`
    const pedido = st.data
    const hs = await horariosDisponiveis({ imovel_id: imovel.id, servico_codigo: servico.codigo, data: pedido })
    if (pedido !== st.data || !box.isConnected) return
    const livre = (j) => !j.motivo && j.n_prestadores > 0
    if (st.janela != null && !hs.some((j) => j.janela_inicio === st.janela && livre(j))) st.janela = null
    const algum3h = hs.some((j) => j.motivo === 'menos_de_3h')
    const pintar = () => {
      const j = hs.find((x) => x.janela_inicio === st.janela)
      box.querySelector('#ctr-slots').innerHTML = pilulasHorario(hs, st.janela) +
        (st.janela != null && horas > 1 ? `<p class="cap mt8">Ocupa das ${st.janela}h às ${st.janela + horas}h.</p>` : '') +
        (j && j.aviso_reserva ? avisoHospede() : '')
      box.querySelectorAll('[data-janela]').forEach((b) => b.addEventListener('click', () => {
        st.janela = Number(b.dataset.janela)
        history.replaceState(null, '', nav.link({ ...sel, data: st.data, janela: st.janela, etapa: 'data' }))
        pintar(); desenharRodape()
      }))
      icones()
    }
    box.innerHTML = `${cabHorario()}
      ${hs.some(livre) ? '' : '<p class="sub mt8">Nenhum profissional livre nesse dia. Escolha outro.</p>'}
      ${algum3h ? `<p class="cap ctr-ib mt8 ctr-3h">${ic('timer', 'i14')}${esc(MOTIVOS.menos_de_3h)} Horários antes disso ficam bloqueados.</p>` : ''}
      <div id="ctr-slots"></div>
      <p class="cap mt8">O horário é a hora em que o profissional chega. O número embaixo é quantos profissionais estão livres.</p>`
    pintar()
  }

  const desenharCalendario = async () => {
    const box = $('#ctr-cal', ctx.el)
    if (!box) return
    const de0 = isoMes(st.mes); const ate = fimMes(st.mes)
    const de = de0 < isoDia(0) ? isoDia(0) : de0
    const alvoMes = de0
    const dias = []
    for (let d = de; d <= ate; d = somarDias(d, 1)) dias.push(d)
    const [reservas, partes, peds] = await Promise.all([
      listarReservas({ imovel_id: imovel.id, de: de0, ate }).catch(() => []),
      Promise.all(dias.map((d) => horariosDisponiveis({ imovel_id: imovel.id, servico_codigo: servico.codigo, data: d }).then((hs) => hs.some((j) => !j.motivo && j.n_prestadores > 0)).catch(() => true))),
      listarPedidos().catch(() => []),
    ])
    if (alvoMes !== isoMes(st.mes) || !box.isConnected) return
    st.reservas = reservas
    const disponiveis = Object.fromEntries(dias.map((d, i) => [d, partes[i]]))
    const opts = {
      mes: st.mes, reservas, disponiveis, marcados: new Set(peds.filter((p) => p.imovel_id === imovel.id && ATIVOS.includes(p.status) && p.status !== 'aguardando_aprovacao').map((p) => p.data)), selecionado: st.data, minimo: isoDia(0),
      aoEscolher: (iso) => {
        st.data = iso; st.janela = null
        history.replaceState(null, '', nav.link({ ...sel, data: iso, etapa: 'data' }))
        pintarCal(); desenharHorarios().catch(falha); desenharRodape()
      },
      aoMudarMes: (delta) => { st.mes = new Date(st.mes.getFullYear(), st.mes.getMonth() + delta, 1); box.innerHTML = '<div class="ctr-calskel skel"></div>'; desenharCalendario().catch(falha) },
    }
    const pintarCal = () => {
      opts.selecionado = st.data
      const hosp = st.data && st.reservas.some((r) => st.data >= r.check_in && st.data <= r.check_out)
      box.innerHTML = calendario(opts) + (hosp ? avisoHospede() : '') +
        (dias.some((d) => disponiveis[d]) ? '' : '<p class="sub mt8">Nenhum profissional livre nesse mês para esse imóvel. Veja o próximo.</p>')
      ligarCalendario(box, opts)
      icones()
    }
    pintarCal()
  }

  nav.ligarSeletor(imovel, (im) => nav.link({ imovel: im.id, servico: servico.codigo, data: st.data, janela: st.janela, etapa: 'data' }))
  desenharRodape()
  Promise.all([desenharCalendario(), desenharHorarios()]).catch(falha)
}

// ---------- 4. profissional (3.4): só quem está livre no dia/horário escolhido ----------
/** "Seg a sex, 8h–17h" a partir da disponibilidade [{ dia_semana, hora_inicio, hora_fim }] */
export function resumoAtendimento(disp) {
  if (!disp || !disp.length) return ''
  const curto = (d) => DIAS_SEMANA[d].slice(0, 3).toLowerCase()
  const ds = disp.map((d) => d.dia_semana).sort((a, b) => a - b)
  const seguidos = ds.every((d, i) => i === 0 || d === ds[i - 1] + 1)
  const dias = ds.length === 7 ? 'Todos os dias' : seguidos && ds.length > 2 ? `${maiuscula(curto(ds[0]))} a ${curto(ds.at(-1))}` : maiuscula(ds.map(curto).join(', '))
  const hi = Math.min(...disp.map((d) => d.hora_inicio)); const hf = Math.max(...disp.map((d) => d.hora_fim))
  return `${dias}, ${hi}h–${hf}h`
}
/** "Atende Jurerê, Canasvieiras" ou "Atende Florianópolis toda" para o imóvel */
function resumoArea(p, imovel) {
  const areas = p.areas || []
  if (!areas.length) return p.cidade ? `Atende ${p.cidade}` : ''
  const naCidade = areas.filter((a) => norm(a.cidade) === norm(imovel.cidade))
  if (naCidade.some((a) => !a.bairro)) return `Atende ${imovel.cidade} toda`
  const bairros = naCidade.map((a) => a.bairro)
  return bairros.length ? `Atende ${bairros.slice(0, 3).join(', ')}${bairros.length > 3 ? ` e mais ${bairros.length - 3}` : ''}` : ''
}

async function passoProfissional(ctx, nav, { imovel, servico, sel, prestadorId }) {
  const voltar = nav.link({ ...sel, etapa: 'data' })
  let prestadores
  try {
    prestadores = await prestadoresDisponiveis({ imovel_id: imovel.id, servico_codigo: servico.codigo, data: sel.data, janela_inicio: sel.janela })
  } catch (e) {
    if (e && ERROS_HORARIO.includes(e.code)) { toast(e.message || MOTIVOS.menos_de_3h); ctx.ir(voltar); return }
    throw e
  }
  let escolhido = prestadores.some((p) => p.id === prestadorId) ? prestadorId : ''
  const quando = `${maiuscula(fmtDiaRel(sel.data))}${fmtDiaRel(sel.data) === fmtDia(sel.data) ? '' : ` (${dm(sel.data)})`} · ${fmtJanela(sel.janela, servico.janelas)}`
  ctx.el.innerHTML = `${cabecalhoPasso('Quem vai fazer', { voltar, passo: 3, total: nav.total })}
    <div class="wrap ctr-pros-w">
      ${nav.seletor(imovel)}
      <a class="card ctr-quando-sel" href="${esc(voltar)}" aria-label="Trocar dia e horário"><span class="ctr-ib">${ic('calendar-check')}<b class="tn">${esc(quando)}</b></span><span class="lnk">Trocar</span></a>
      <p class="sub ctr-lead mt16">${esc(servico.nome)} · ${esc(duracaoFaixa(servico))} · ${brl(servico.preco_cents)}. O preço é o mesmo com qualquer profissional.</p>
      <h2 class="ctr-h">Escolha o profissional</h2>
      <p class="cap ctr-regra">Só aparece quem atende ${esc(imovel.bairro || imovel.cidade || 'a região do imóvel')}, trabalha nesse horário e está com a agenda livre. Melhores primeiro (nota e serviços feitos).</p>
      <div class="list mt8 ctr-grid" id="ctr-pros">${prestadores.length ? prestadores.map((p) => cardPro(p, p.id === escolhido, imovel)).join('')
      : vazio({ icone: 'user-x', titulo: 'Ninguém livre nesse horário', texto: 'Nenhum profissional que atende a região do imóvel está livre nesse dia e horário. Escolha outro horário.', acao: `<a class="btn out sm mt8" href="${esc(voltar)}">Escolher outro horário</a>` })}</div>
      <p class="cap ctr-ib mt16">${ic('hourglass', 'i14')}O profissional tem até 1h para confirmar. Se ele recusar ou não responder, você escolhe outro.</p>
      ${avisoMaterial(true)}
    </div>`
  icones()
  nav.ligarSeletor(imovel, (im) => nav.link({ ...sel, imovel: im.id, etapa: 'pro' }))

  const desenharRodape = () => {
    const p = prestadores.find((x) => x.id === escolhido)
    rodape(`<div class="tt"><b class="tn">1 serviço · ${brl(servico.preco_cents)}</b><span>${p ? `Com ${esc(p.nome)}` : 'Escolha quem vai fazer'}</span></div>
      <button type="button" class="btn cta" id="ctr-ir" ${p ? '' : 'disabled'}>Revisar pedido</button>`)
    $('#ctr-ir').onclick = () => { if (escolhido) ctx.ir(nav.link({ ...sel, prestador: escolhido, etapa: 'revisar' })) }
  }
  $('#ctr-pros', ctx.el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-pro]')
    if (!b) return
    escolhido = b.dataset.pro
    ctx.el.querySelectorAll('[data-pro]').forEach((x) => {
      const on = x.dataset.pro === escolhido
      x.setAttribute('aria-pressed', String(on)); x.classList.toggle('sel', on)
      const tag = x.querySelector('.ctr-esc'); if (tag) tag.innerHTML = on ? `${ic('check', 'i14')}Escolhido` : `Escolher ${esc(prestadores.find((p) => p.id === x.dataset.pro).nome)}`
    })
    icones()
    history.replaceState(null, '', nav.link({ ...sel, prestador: escolhido, etapa: 'pro' }))
    desenharRodape()
  })
  desenharRodape()
}

function cardPro(p, on, imovel) {
  const novo = Number(p.n_servicos || 0) <= 5
  const area = imovel ? resumoArea(p, imovel) : ''
  const horario = resumoAtendimento(p.disponibilidade)
  return `<button type="button" class="card pro ctr-pro${on ? ' sel' : ''}" data-pro="${esc(p.id)}" aria-pressed="${on}">
    ${p.foto_url ? img(p.foto_url, 'av lg', p.nome) : avatar(p.nome, 'lg ok')}
    <span class="ctr-min ctr-pro-tx"><span class="n">${esc(p.nome)}${ic('badge-check')}${novo ? '<span class="ctr-novo" title="Profissional novo na ConcertAI, já verificado. Os primeiros serviços têm acompanhamento da nossa equipe.">Novo</span>' : ''}</span>
      <span class="r">${estrela()}${notaFmt(p.nota_media)} · ${Number(p.n_servicos || 0).toLocaleString('pt-BR')} serviços</span>
      ${p.bio ? `<span class="ctr-bio">${esc(p.bio)}</span>` : ''}
      ${area || horario ? `<span class="ctr-pro-meta">${area ? `<span>${ic('map-pin', 'i14')}${esc(area)}</span>` : ''}${horario ? `<span>${ic('clock', 'i14')}${esc(horario)}</span>` : ''}</span>` : ''}
      <span class="ctr-esc">${on ? `${ic('check', 'i14')}Escolhido` : `Escolher ${esc(p.nome)}`}</span></span>
    <span class="wnd tn ctr-wnd"><span class="cap">Livre</span><span>${p.janela_inicio}h–${p.janela_fim}h</span></span>
  </button>`
}

// ---------- 5. revisar e confirmar (3.6 / 4.2) ----------
async function passoRevisar(ctx, nav, { imovel, servico, sel, prestadorId }) {
  const janela = sel.janela
  const voltar = nav.link({ ...sel, prestador: prestadorId, etapa: 'pro' })
  const voltarData = nav.link({ ...sel, etapa: 'data' })
  let livres
  try {
    livres = await prestadoresDisponiveis({ imovel_id: imovel.id, servico_codigo: servico.codigo, data: sel.data, janela_inicio: janela })
  } catch (e) {
    if (e && ERROS_HORARIO.includes(e.code)) { toast(e.message || MOTIVOS.menos_de_3h); ctx.ir(voltarData); return }
    throw e
  }
  const prestador = livres.find((p) => p.id === prestadorId)
  if (!prestador) { toast('Esse profissional não está mais livre nesse horário. Escolha outro.'); ctx.ir(voltar); return }
  const [reservas, aceitos] = await Promise.all([
    listarReservas({ imovel_id: imovel.id, de: sel.data, ate: sel.data }).catch(() => []),
    termosAceitos(),
  ])
  const hospede = prestador.aviso_reserva || reservas.some((r) => sel.data >= r.check_in && sel.data <= r.check_out)
  const noAto = pagaNoAto(nav.papel, imovel)
  const aprova = !noAto && precisaAprovar(nav.papel, servico)
  const fra = nav.papel === 'franquia'
  const pedeTermos = !aceitos

  ctx.el.innerHTML = `${cabecalhoPasso('Revisar pedido', { voltar, passo: 4, total: nav.total })}
    <div class="wrap gap16">
      ${nav.seletor(imovel)}
      <div class="card">${resumo({ imovel, servico, prestador, data: sel.data, janela_inicio: janela, janelas: servico.janelas, preco_cents: servico.preco_cents })}</div>
      ${avisoPeca(servico, 'ctr-peca-box')}
      ${avisoMaterial()}
      <p class="cap ctr-ib">${ic('hourglass', 'i14')}${esc(semPonto(prestador.nome))} tem até 1h para confirmar. Se recusar ou não responder, você escolhe outro profissional para o mesmo horário.</p>
      ${pedeTermos ? `<label class="ctr-termos"><input type="checkbox" id="ctr-termos"><span>Li e aceito os <a href="#" id="ctr-ver-termos">termos de uso</a> do ConcertAI${fra ? ` em nome da franquia ${esc(nomeFranquia(nav.sessao && nav.sessao.nome))}` : ''}.</span></label>` : ''}
      ${hospede ? avisoHospede() : ''}
      ${aprova ? `<div class="info">${ic('user-check')}<span><b>Precisa da aprovação do proprietário.</b> Acima de R$ 300, o proprietário aprova antes. A data fica reservada por 48h.</span></div>` : ''}
      <p class="ctr-pay">${ic(noAto ? 'lock' : 'wallet')}<span>${noAto ? `<b>Pagamento no ato, por Pix ou cartão.</b> ${esc(TEXTO_GUARDADO)}${nav.papel === 'anfitriao' ? '' : ' Imóvel fora da Seazone: não entra no repasse.'}` : fra ? 'O valor é descontado do repasse do proprietário.' : 'O valor é descontado do seu próximo repasse.'}</span></p>
      <div class="ctr-obs"><label for="ctr-obs">O que está acontecendo? <span class="cap">(opcional)</span></label>
        <textarea id="ctr-obs" rows="3" maxlength="500" placeholder="Ex.: o chuveiro do banheiro da suíte parou de esquentar ontem."></textarea></div>
      <p class="cap ctr-ib">${ic('info', 'i14')}Cancele sem custo até o profissional começar o serviço.</p>
    </div>`
  icones()
  nav.ligarSeletor(imovel, (im) => nav.link({ ...sel, imovel: im.id, etapa: 'pro' }))

  const subRodape = noAto ? 'Pix ou cartão no próximo passo' : fra ? 'Pago pelo proprietário, no repasse' : 'Descontado do seu repasse'
  rodape(`<div class="tt"><b class="tn">Total ${brl(servico.preco_cents)}</b><span id="ctr-sub">${pedeTermos ? 'Aceite os termos' : subRodape}</span></div>
    <button type="button" class="btn cta" id="ctr-confirmar" ${pedeTermos ? 'disabled' : ''}>${aprova ? 'Enviar para aprovação' : noAto ? 'Ir para o pagamento' : 'Confirmar pedido'}</button>`)
  const bt = $('#ctr-confirmar')
  const caixa = $('#ctr-termos', ctx.el)
  if (caixa) caixa.addEventListener('change', () => { bt.disabled = !caixa.checked; $('#ctr-sub').textContent = caixa.checked ? subRodape : 'Aceite os termos' })
  const verTermos = $('#ctr-ver-termos', ctx.el)
  if (verTermos) verTermos.addEventListener('click', (e) => { e.preventDefault(); abrirTermos() })

  bt.onclick = async () => {
    if (bt.disabled || (caixa && !caixa.checked)) return
    bt.disabled = true
    try {
      if (caixa) await aceitarTermos()
      const obs = ($('#ctr-obs', ctx.el)?.value || '').trim()
      const p = await criarPedido({ imovel_id: imovel.id, servico_codigo: servico.codigo, prestador_id: prestador.id, data: sel.data, janela_inicio: janela, observacao: obs || null })
      ctx.ir(`#/${nav.papel}/contratar?pedido=${encodeURIComponent(p.id)}`)
    } catch (e) {
      falha(e)
      bt.disabled = false
      if (e && ['antecedencia_minima', 'janela_invalida'].includes(e.code)) ctx.ir(voltarData)
      else if (e && ERROS_HORARIO.includes(e.code)) ctx.ir(voltar)
    }
  }
}

function abrirTermos() {
  abrirSheet(`<h2>Termos de uso do ConcertAI</h2>
    <p class="sub mt8">Resumo do que você aceita ao contratar.</p>
    <ul class="yes mt16">
      ${['O preço de cada serviço é fechado pela Seazone e aparece antes de você confirmar.',
        'Quem paga é sempre o proprietário: o valor é descontado do próximo repasse.',
        'Nenhuma peça está inclusa no preço (ex.: a troca de resistência não inclui a resistência): qualquer peça ou material é comprado à parte, e o profissional informa o valor antes para você aprovar.',
        `Pedidos com pelo menos ${ANTECEDENCIA_MIN_H}h de antecedência. O profissional confirma em até 1h; se recusar ou não responder, você escolhe outro.`,
        'Cancele sem custo até o profissional começar o serviço.',
        'O serviço fica 90 dias na garantia: deu problema no que foi feito, o profissional volta sem custo.',
        'Pedido da franquia acima de R$ 300 só segue com a aprovação do proprietário.',
        'Reclamações pela SIA, com protocolo e prazo de resposta.'].map((t) => `<li>${ic('check')}<span>${esc(t)}</span></li>`).join('')}
    </ul>
    <button type="button" class="btn out w mt16" data-fechar-sheet>Fechar</button>`)
}

function resumo({ imovel, servico, prestador, data, janela_inicio, janelas, preco_cents }) {
  return `<div class="imgrow">${img(imovel.foto_url, '', imovel.nome)}<div class="ctr-min"><span class="cap">Imóvel</span><b style="display:block">${esc(imovel.nome)}</b><div class="code">${esc(imovel.codigo)}</div></div></div>
    <div class="sumrow"><span class="l">${esc(servico.nome)}<br><span class="cap">${ic('clock', 'i14')} ${esc(duracaoFaixa(servico))}</span></span><span class="tn ctr-preco">${brl(preco_cents)}</span></div>
    <div class="sumrow"><span class="l">Profissional</span><b>${esc(prestador.nome)}</b></div>
    <div class="sumrow"><span class="l">Data e horário</span><b class="tn">${esc(maiuscula(fmtDia(data)))} · ${fmtJanela(janela_inicio, janelas)}</b></div>
    <div class="sumrow tot"><span>Total</span><span class="tn">${brl(preco_cents)}</span></div>`
}

// ---------- 6. confirmação (3.7 / 4.2) ----------
async function passoFeito(ctx, { papel, base, pedidoId }) {
  const p = await obterPedido(pedidoId)
  if (p.status === 'aguardando_pagamento') return passoPagamento(ctx, { papel, p })
  const cob = pagaNoAto(papel, p.imovel) || p.comprador_papel === 'anfitriao' ? await cobrancaDoPedido(p.id).catch(() => null) : null
  const aprova = p.status === 'aguardando_aprovacao'
  const fra = papel === 'franquia'
  const titulo = aprova ? 'Enviado ao proprietário.' : 'Pedido confirmado'
  const texto = aprova
    ? 'Avisamos você quando ele aprovar. Sem resposta em 48h, o pedido é cancelado e a data liberada.'
    : `${fra ? 'O proprietário foi avisado. ' : ''}Enviamos o pedido para ${semPonto(p.prestador.nome)}, que tem até 1h para confirmar${p.confirmar_ate ? ` (até ${hhmm(p.confirmar_ate)})` : ''}. Se ele recusar ou não responder, você escolhe outro profissional.${fra ? '' : ' A franquia já foi avisada da visita.'}`

  ctx.el.innerHTML = `<section class="done">
      <div class="ok">${ic(aprova ? 'send' : 'check')}</div>
      <h1>${esc(cob ? 'Pago, aguardando o profissional confirmar' : titulo)}</h1>
      <p class="ctr-donesub">${esc(texto)}</p>
      ${faixaPago(p, cob)}
      <article class="card">
        <div class="ctr-done-hd"><b class="tn">PED-${esc(p.numero)}</b>${badgeStatus(p, papel)}</div>
        ${resumo({ imovel: p.imovel, servico: p.servico, prestador: p.prestador, data: p.data, janela_inicio: p.janela_inicio, janelas: p.janelas, preco_cents: p.preco_cents })}
        ${p.aviso_reserva ? `<p class="cap ctr-nota mt8">${ic('bed-double')}Tem hóspede nesse horário: a franquia combina o acesso.</p>` : ''}
      </article>
      ${avisoMaterial(true)}
      <div class="steps3" aria-label="O que acontece agora">
        <h2 class="ctr-h">O que acontece agora</h2>
        ${(aprova
    ? ['O proprietário aprova ou recusa por um botão, em até 48h.', 'Aprovado, o profissional confirma o horário.', 'No dia, você acompanha o andamento e recebe as fotos do antes e depois.']
    : ['O profissional confirma em até 1h. Se não confirmar, você troca por outro em Pedidos.', 'No dia, você acompanha o andamento por aqui.', 'Você recebe as fotos do antes e depois, e o serviço fica 90 dias na garantia.']
  ).map((t, i) => `<div><i>${i + 1}</i><span>${esc(t)}</span></div>`).join('')}
      </div>
      <a class="btn cta mt16" href="#/${esc(papel)}/pedidos">Ver meus pedidos</a>
      <a class="btn ctr-sair" href="${esc(base)}?imovel=${encodeURIComponent(p.imovel_id)}">Contratar outro serviço</a>
    </section>`
  icones()
}

// ---------- 5. pagamento no ato (T807): anfitrião e imóvel fora da Seazone ----------
async function passoPagamento(ctx, { papel, p }) {
  ctx.el.innerHTML = `${cabecalhoPasso('Pagamento', { voltar: `#/${papel}/pedidos`, passo: 5, total: 5 })}
    <div class="wrap gap16">
      <div class="info">${ic('calendar-clock')}<span><b>Horário reservado.</b> O pedido só vai para ${esc(semPonto(p.prestador.nome))} depois do pagamento.</span></div>
      <div class="card">${resumo({ imovel: p.imovel, servico: p.servico, prestador: p.prestador, data: p.data, janela_inicio: p.janela_inicio, janelas: p.janelas, preco_cents: p.preco_cents })}</div>
      <div id="ctr-pg"></div>
      <div class="steps3" aria-label="O que acontece agora"><h2 class="ctr-h">Depois de pagar</h2>
        ${['O profissional confirma em até 1h. Se ninguém puder ir, o valor volta.', 'No dia, você acompanha o andamento e recebe as fotos do antes e depois.', 'Serviço terminado, o valor vai para o profissional. 90 dias de garantia.'].map((t, i) => `<div><i>${i + 1}</i><span>${esc(t)}</span></div>`).join('')}
      </div>
    </div>`
  icones()
  await montarPagamento($('#ctr-pg', ctx.el), p, { aoPago: () => ctx.recarregar() })
}

// ---------- confirmação em 1h e troca de profissional (REGRA 17/11), usado no detalhe do pedido ----------
/** O pedido terminou com o profissional recusando ou deixando passar 1h? (para não mostrar "não pode ir" genérico) */
export const terminouSemProfissional = (p) => p.status === 'recusado_prestador'

/** Bloco do detalhe do pedido para quem comprou: aguardando confirmação (até 1h), recusado/expirado com
 *  "Trocar profissional", ou já trocado (link para o pedido novo). '' quando não se aplica. */
export function blocoConfirmacao(p, papel) {
  const nome = semPonto(p.prestador && p.prestador.nome)
  if (p.substituido_por) {
    return `<div class="info ctr-troca">${ic('repeat')}<div><b>Este pedido passou para outro profissional.</b>
      <p class="mt8"><a class="lnk" href="#/${esc(papel)}/pedido/${encodeURIComponent(p.substituido_por)}">Ver o pedido novo${ic('arrow-right', 'i14')}</a></p></div></div>`
  }
  if (podeTrocarPrestador(p)) {
    const motivo = p.recusa_tipo === 'expirou' || p.status === 'aguardando_prestador'
      ? `${esc(nome)} não confirmou em 1h.`
      : `${esc(nome)} recusou o pedido.`
    return `<div class="warnbox ctr-troca">${ic('user-x')}<div><b>${motivo}</b>
      <p>Escolha outro profissional para o mesmo dia e horário. O preço não muda.</p>
      <button type="button" class="btn pri sm mt8" data-trocar="${esc(p.id)}">${ic('repeat')}Trocar profissional</button></div></div>`
  }
  if (p.status === 'aguardando_prestador') {
    const min = minutosParaConfirmar(p)
    return `<div class="info ctr-espera">${ic('hourglass')}<div><b>Aguardando ${esc(nome)} confirmar (até 1h)</b>
      <p>${p.confirmar_ate ? `Prazo até ${esc(hhmm(p.confirmar_ate))}${min != null ? ` · faltam ${min} min` : ''}. ` : ''}Se não confirmar ou recusar, você pode trocar de profissional aqui.</p></div></div>`
  }
  return ''
}

/** Liga o botão "Trocar profissional": abre a lista de quem está livre no mesmo dia/horário (sem o atual) e cria o pedido novo. */
export function ligarTroca(ctx, p, papel) {
  ctx.el.querySelectorAll('[data-trocar]').forEach((b) => b.addEventListener('click', () => abrirTroca(ctx, p, papel)))
}

async function abrirTroca(ctx, p, papel) {
  const sv = p.servico
  const quando = `${maiuscula(fmtDiaRel(p.data))} · ${fmtJanela(p.janela_inicio, p.janelas)}`
  const novoPedido = `#/${papel}/contratar?${new URLSearchParams({ imovel: p.imovel_id, servico: p.servico_codigo, etapa: 'data' })}`
  const sh = abrirSheet(`<h2>Trocar profissional</h2><p class="sub mt8">${esc(sv.nome)} · ${esc(quando)}</p><div id="ctr-troca-l" class="mt16">${carregando(2)}</div>`)
  const box = $('#ctr-troca-l', sh.el)
  let lista
  try {
    lista = (await prestadoresDisponiveis({ imovel_id: p.imovel_id, servico_codigo: p.servico_codigo, data: p.data, janela_inicio: p.janela_inicio }))
      .filter((x) => x.id !== p.prestador_id)
  } catch (e) {
    if (e && ERROS_HORARIO.includes(e.code)) {
      box.innerHTML = `<div class="warnbox">${ic('timer')}<span>${esc(e.code === 'antecedencia_minima' ? `Não dá mais tempo para esse horário: pedidos precisam de pelo menos ${ANTECEDENCIA_MIN_H}h de antecedência.` : e.message)} Faça um pedido novo em outro horário.</span></div>
        <a class="btn cta mt16" href="${esc(novoPedido)}" data-fechar-sheet>Escolher outro horário</a>`
      icones(); return
    }
    falha(e); sh.fechar(); return
  }
  if (!lista.length) {
    box.innerHTML = `${vazio({ icone: 'user-x', titulo: 'Ninguém livre nesse horário', texto: 'Nenhum outro profissional que atende a região está livre nesse dia e horário.' })}
      <a class="btn cta mt16" href="${esc(novoPedido)}" data-fechar-sheet>Escolher outro horário</a>`
    icones(); return
  }
  let escolhido = ''
  box.innerHTML = `<p class="cap">Livres nesse horário e que atendem a região do imóvel, melhores primeiro.</p>
    <div class="list mt8" id="ctr-troca-pros">${lista.map((x) => cardPro(x, false, p.imovel)).join('')}</div>
    <button type="button" class="btn cta mt16" id="ctr-troca-ok" disabled>Escolha o profissional</button>`
  icones()
  const ok = $('#ctr-troca-ok', sh.el)
  $('#ctr-troca-pros', sh.el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-pro]')
    if (!b) return
    escolhido = b.dataset.pro
    sh.el.querySelectorAll('[data-pro]').forEach((x) => { const on = x.dataset.pro === escolhido; x.classList.toggle('sel', on); x.setAttribute('aria-pressed', String(on)) })
    ok.disabled = false
    ok.textContent = `Passar para ${lista.find((x) => x.id === escolhido).nome}`
  })
  ok.addEventListener('click', async () => {
    if (!escolhido) return
    ok.disabled = true
    try {
      const novo = await trocarPrestador({ pedido_id: p.id, prestador_id: escolhido })
      sh.fechar()
      toast(`Pedido passado para ${semPonto(novo.prestador ? novo.prestador.nome : 'o novo profissional')}. Ele tem até 1h para confirmar.`)
      ctx.ir(`#/${papel}/pedido/${encodeURIComponent(novo.id)}`)
    } catch (e) { ok.disabled = false; falha(e) }
  })
}
