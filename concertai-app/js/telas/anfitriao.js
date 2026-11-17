// ConcertAI · telas do ANFITRIÃO AVULSO (T807, REGRA 17/11): pessoa com imóvel fora da Seazone que contrata e paga no ato.
// Rotas: '' (início: dropdown de imóveis + "O que precisa de conserto?"), 'contratar' (fluxo compartilhado + pagamento),
// 'pedidos', 'pedido/<id>', 'imoveis', 'imovel/<id|novo>', 'perfil', 'verificar' (código do celular).
// Dados só via api.js (contrato: docs/ui-contrato-dados.md, seção "Anfitrião avulso").
import * as api from '../api.js?v=79617c8'
import { $, esc, ic, icones, brl, avatar, vazio, carregando, toast, falha, cardPedido, linhaDoTempo, avisoMaterial, fmtDiaRel, fmtDia, fmtJanela, badgeStatus } from '../ui.js?v=79617c8'
import { fluxoContratar, duracaoFaixa, avisoPeca } from './contratar.js?v=79617c8'
import { seletorImovel, ligarSeletorImovel } from './seletor-imovel.js?v=79617c8'
import { formImovelAvulso, resumoAcesso, TIPOS } from './imovel-avulso.js?v=79617c8'
import { montarPagamento, faixaPago, TEXTO_GUARDADO } from './pagamento.js?v=79617c8'

const BASE = '#/anfitriao'
const PAPEL = 'anfitriao'
const ABERTOS = ['aguardando_pagamento', 'aguardando_prestador', 'confirmado', 'em_execucao', 'prova_enviada']
const VITRINE = ['EL-01', 'HI-02', 'AR-01', 'HI-04', 'MA-01', 'EL-03']

export const abas = [
  { id: '', rotulo: 'Início', icone: 'home' },
  { id: 'pedidos', rotulo: 'Pedidos', icone: 'clipboard-list', ativas: ['pedido'] },
  { id: 'imoveis', rotulo: 'Meus imóveis', icone: 'building-2', ativas: ['imovel'] },
  { id: 'perfil', rotulo: 'Perfil', icone: 'user-round', ativas: ['verificar'] },
]

/** Contador da aba Pedidos = aguardando pagamento. */
export async function contadores(topoEl) {
  const n = (await api.listarPedidos()).filter((p) => p.status === 'aguardando_pagamento').length
  const aba = topoEl.querySelector(`a.tab[href="${BASE}/pedidos"]`)
  if (!aba || !n) return
  const ct = document.createElement('span'); ct.className = 'ct'; ct.textContent = String(n); aba.appendChild(ct)
  aba.setAttribute('aria-label', `Pedidos, ${n} aguardando pagamento`)
}

const contratarHref = (q) => `${BASE}/contratar?${new URLSearchParams(Object.entries(q).filter(([, v]) => v != null && v !== '')).toString()}`
const cabecalho = (titulo, sub = '', acao = '') => `<div class="prop-cab anf-cab"><div><h1>${esc(titulo)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>${acao}</div>`
const erroCarga = (el, e, titulo = 'Não deu para carregar') => { falha(e); el.innerHTML = `<div class="wrap">${vazio({ icone: 'wifi-off', titulo, texto: 'Algo deu errado do nosso lado. Tente de novo em alguns minutos.' })}</div>`; icones() }

/** Aviso fixo de celular não verificado (pagar exige celular confirmado). */
const avisoCelular = (pf) => pf && !pf.celular_verificado ? `<a class="card anf-aviso" href="${BASE}/verificar">${ic('smartphone')}<span><b>Confirme o seu celular</b><span class="sub">Mandamos um código por WhatsApp. Sem ele você não consegue pagar os pedidos.</span></span>${ic('chevron-right')}</a>` : ''

// ---------- início ----------
async function inicio(ctx) {
  ctx.el.innerHTML = `<div class="wrap mt16">${carregando(3)}</div>`
  try {
    const [imoveis, cats, servicos, pedidos, pf] = await Promise.all([api.imoveisDoComprador(), api.listarCategorias(), api.listarServicos({ lote: 1 }), api.listarPedidos(), api.anfitriaoPerfil().catch(() => null)])
    if (!imoveis.length) {
      ctx.el.innerHTML = `<div class="wrap mt24">${avisoCelular(pf)}${vazio({ icone: 'home', titulo: 'Cadastre o seu primeiro imóvel', texto: 'Com o endereço e como o profissional entra, você já pode contratar.', acao: `<a class="btn cta mt16" href="${BASE}/imovel/novo">${ic('plus')}Cadastrar imóvel</a>` })}</div>`
      icones(); return
    }
    const im = imoveis.find((i) => i.id === ctx.query.imovel) || imoveis[0]
    const categorias = cats.filter((c) => servicos.some((s) => s.categoria_codigo === c.codigo))
    const porCodigo = Object.fromEntries(servicos.map((s) => [s.codigo, s]))
    const vitrine = [...VITRINE.map((c) => porCodigo[c]).filter(Boolean)].slice(0, 6)
    const pagar = pedidos.filter((p) => p.status === 'aguardando_pagamento')
    const visitas = pedidos.filter((p) => ABERTOS.includes(p.status) && p.status !== 'aguardando_pagamento').slice(0, 3)
    ctx.el.innerHTML = `
      <section class="hero prop-hero anf-hero"><div class="in">
        ${seletorImovel({ imoveis, atual: im.id, rotulo: 'Seu imóvel', escuro: true })}
        <h1>O que precisa de conserto?</h1>
        <form class="search" role="search" id="anf-busca">${ic('search')}<input type="search" name="q" placeholder="Ex.: chuveiro não esquenta" aria-label="Buscar serviço" autocomplete="off" enterkeyhint="search"></form>
        <p class="nx">${ic('lock', 'i14')}<span>Você paga no ato por Pix ou cartão. ${esc(TEXTO_GUARDADO)}</span></p>
        <div class="prop-hero-ac"><a class="btn cta" href="${contratarHref({ imovel: im.id })}">Ver serviços deste imóvel</a><a class="prop-hero-como" href="${BASE}/imovel/novo">${ic('plus', 'i14')}Cadastrar outro imóvel</a></div>
      </div></section>
      <div class="wrap">
        ${avisoCelular(pf) ? `<div class="mt24">${avisoCelular(pf)}</div>` : ''}
        ${pagar.length ? `<a class="card prop-apr mt24" href="${BASE}/pedido/${encodeURIComponent(pagar[0].id)}">
          <span class="prop-apr-ic">${ic('wallet')}</span>
          <span class="prop-apr-tx"><b>${pagar.length === 1 ? 'Um pedido aguardando seu pagamento' : `${pagar.length} pedidos aguardando seu pagamento`}</b>
            <span class="sub">${esc(pagar[0].servico.nome)} · ${brl(pagar[0].preco_cents)} · ${esc(pagar[0].imovel.nome)}. O profissional só recebe o pedido depois do pagamento.</span>
            <span class="lnk mt8">Pagar agora${ic('arrow-right', 'i14')}</span></span></a>` : ''}
        <div class="prop-sech"><h2 class="sec">Os mais pedidos, já com preço</h2></div>
        <div class="cats" role="list">
          ${categorias.map((c) => `<a class="cat" role="listitem" href="${contratarHref({ imovel: im.id, cat: c.codigo })}"><span class="ci">${ic(c.icone || 'wrench')}</span>${esc(c.nome)}</a>`).join('')}
          <a class="cat" role="listitem" href="${contratarHref({ imovel: im.id })}"><span class="ci">${ic('layout-grid')}</span>Todos</a>
        </div>
        <div class="list mt16">${vitrine.map((s) => `<a class="card svc prop-svc" href="${contratarHref({ imovel: im.id, servico: s.codigo, etapa: 'data' })}">
            <div><div class="nm">${esc(s.nome)}</div><div class="ds">${esc(s.descricao)}</div>
              <div class="meta"><span>${ic('clock')}${esc(duracaoFaixa(s))}</span><span>${ic('shield-check')}90 dias de garantia</span><span>${ic('package')}Peças à parte</span></div>${avisoPeca(s)}</div>
            <div class="pr"><span class="ap">preço fechado</span><b>${brl(s.preco_cents)}</b><span class="prop-go">${ic('chevron-right')}</span></div></a>`).join('')}</div>
        ${avisoMaterial(true)}
        <div class="prop-sech"><h2 class="sec">Próximas visitas</h2>${visitas.length ? `<a class="lnk" href="${BASE}/pedidos">Ver todas</a>` : ''}</div>
        ${visitas.length ? `<div class="list">${visitas.map((p) => cardPedido(p, { link: `${BASE}/pedido/${encodeURIComponent(p.id)}`, papel: PAPEL })).join('')}</div>`
          : `<div class="card prop-vazio-linha">${ic('calendar-check')}<span class="sub">Nenhuma visita marcada.</span></div>`}
        <h2 class="sec">Como funciona o pagamento</h2>
        <ol class="prop-passos">
          <li><i>1</i><div><b>Você paga ao pedir.</b> Pix ou cartão, com o preço fechado do serviço.</div></li>
          <li><i>2</i><div><b>O valor fica guardado.</b> O profissional confirma em até 1h; se ninguém puder ir ou você cancelar antes, o valor volta.</div></li>
          <li><i>3</i><div><b>Serviço feito, o profissional recebe.</b> Você vê as fotos do antes e depois, e tem 90 dias de garantia.</div></li>
        </ol>
        <p class="cap mt24 prop-rodape-tx">ConcertAI é um serviço da Seazone. · Ajuda pela SIA</p>
      </div>`
    icones()
    ligarSeletorImovel(ctx.el, { imoveis, atual: im.id, aoEscolher: (novo) => ctx.ir(`${BASE}?imovel=${encodeURIComponent(novo.id)}`) })
    $('#anf-busca', ctx.el).addEventListener('submit', (e) => { e.preventDefault(); ctx.ir(contratarHref({ imovel: im.id, q: new FormData(e.target).get('q').toString().trim() })) })
  } catch (e) { erroCarga(ctx.el, e) }
}

// ---------- meus imóveis ----------
async function imoveis(ctx) {
  const cab = cabecalho('Meus imóveis', 'Os imóveis onde você contrata. Endereço e acesso só o profissional confirmado vê.', `<a class="btn pri sm" href="${BASE}/imovel/novo">${ic('plus')}Cadastrar</a>`)
  ctx.el.innerHTML = `${cab}<div class="wrap">${carregando(2)}</div>`
  try {
    const l = await api.meusImoveisAvulsos()
    const tipo = (t) => TIPOS.find(([k]) => k === t)?.[1] || 'Imóvel'
    ctx.el.innerHTML = `${cab}<div class="wrap"><div class="list">${l.length ? l.map((i) => `<article class="card anf-imv">
        <span class="anf-imv-ic">${ic(i.tipo === 'casa' ? 'house' : 'building')}</span>
        <div class="anf-imv-tx"><div class="anf-imv-l1"><b>${esc(i.nome)}</b><span class="code">${esc(i.codigo)}</span></div>
          <span class="sub">${esc([i.logradouro && `${i.logradouro}, ${i.numero || 's/n'}`, i.complemento, i.bairro, `${i.cidade}/${i.uf}`].filter(Boolean).join(' · '))}</span>
          <span class="cap anf-imv-meta">${ic('bed-double', 'i14')}${esc(tipo(i.tipo))} · ${i.quartos} quarto${i.quartos === 1 ? '' : 's'}<span>${ic('key-round', 'i14')}${esc(resumoAcesso(i))}</span><span>${ic(i.tem_ical ? 'calendar-check' : 'calendar-x', 'i14')}${i.tem_ical ? 'Calendário ligado' : 'Sem calendário'}</span>${i.pedidos_abertos ? `<span>${ic('clipboard-list', 'i14')}${i.pedidos_abertos} pedido${i.pedidos_abertos > 1 ? 's' : ''} em aberto</span>` : ''}</span></div>
        <div class="anf-imv-ac"><a class="btn cta sm" href="${contratarHref({ imovel: i.id })}">Contratar</a><a class="btn out sm" href="${BASE}/imovel/${encodeURIComponent(i.id)}">${ic('pencil')}Editar</a></div>
      </article>`).join('') : vazio({ icone: 'home', titulo: 'Nenhum imóvel ainda', texto: 'Cadastre o primeiro para contratar.', acao: `<a class="btn cta mt16" href="${BASE}/imovel/novo">Cadastrar imóvel</a>` })}</div></div>`
    icones()
  } catch (e) { erroCarga(ctx.el, e) }
}

async function imovel(ctx) {
  const novo = !ctx.param || ctx.param === 'novo'
  let im = null
  if (!novo) {
    try { im = (await api.meusImoveisAvulsos()).find((i) => i.id === ctx.param) } catch (e) { erroCarga(ctx.el, e); return }
    if (!im) { ctx.el.innerHTML = `<div class="wrap">${vazio({ icone: 'search-x', titulo: 'Imóvel não encontrado' })}</div>`; icones(); return }
  }
  formImovelAvulso(ctx.el, { imovel: im, voltar: `${BASE}/imoveis`, aoSalvar: (r) => ctx.ir(novo ? `${BASE}?imovel=${encodeURIComponent(r.imovel_id)}` : `${BASE}/imoveis`),
    sub: novo ? 'Leva 1 minuto. Depois é só escolher o serviço.' : '' })
  if (im) {
    const ac = document.createElement('div'); ac.className = 'wrap'
    ac.innerHTML = `<button type="button" class="btn out w mt16" id="anf-arquivar">${ic('archive')}Arquivar imóvel</button>`
    ctx.el.appendChild(ac); icones()
    $('#anf-arquivar', ctx.el).onclick = async () => { try { await api.imovelAvulsoArquivar(im.id); toast('Imóvel arquivado'); ctx.ir(`${BASE}/imoveis`) } catch (e) { falha(e) } }
  }
}

// ---------- pedidos ----------
async function pedidos(ctx) {
  const cab = cabecalho('Pedidos', 'Tudo o que você contratou, com o pagamento de cada um.')
  ctx.el.innerHTML = `${cab}<div class="wrap">${carregando(3)}</div>`
  try {
    const [l, cobs] = await Promise.all([api.listarPedidos(), api.anfitriaoCobrancas().catch(() => [])])
    const cob = Object.fromEntries(cobs.map((c) => [c.pedido_id, c]))
    const pago = cobs.filter((c) => ['pago', 'retido', 'liberado'].includes(c.status)).reduce((s, c) => s + c.valor_cents, 0)
    const grupos = [['Aguardando seu pagamento', l.filter((p) => p.status === 'aguardando_pagamento')], ['Em andamento', l.filter((p) => ABERTOS.includes(p.status) && p.status !== 'aguardando_pagamento')], ['Concluídos e cancelados', l.filter((p) => !ABERTOS.includes(p.status))]]
    const linhaPg = (p) => {
      const c = cob[p.id]; const r = c && api.STATUS_COBRANCA[c.status]
      if (p.status === 'aguardando_pagamento') return `<span class="cap anf-pg">${ic('wallet', 'i14')}Pague para o profissional receber o pedido</span><a class="btn cta sm anf-pagar" href="${BASE}/pedido/${encodeURIComponent(p.id)}">Pagar ${brl(p.preco_cents)}</a>`
      return r ? `<span class="cap anf-pg">${ic(c.status === 'reembolsado' ? 'undo-2' : 'shield-check', 'i14')}${esc(c.status === 'pago' && p.status === 'aguardando_prestador' ? 'Pago, aguardando o profissional confirmar' : r.rotulo)} · ${c.metodo === 'cartao' ? 'cartão' : 'Pix'}</span>` : ''
    }
    ctx.el.innerHTML = `${cab}<div class="wrap">
      <div class="anf-kpis"><div class="card"><span class="cap">Pedidos</span><b class="tn">${l.length}</b></div><div class="card"><span class="cap">Aguardando pagamento</span><b class="tn">${grupos[0][1].length}</b></div><div class="card"><span class="cap">Total pago</span><b class="tn">${brl(pago)}</b></div></div>
      ${l.length ? grupos.filter(([, g]) => g.length).map(([t, g]) => `<h2 class="sec">${esc(t)}</h2><div class="list">${g.map((p) => cardPedido(p, { link: `${BASE}/pedido/${encodeURIComponent(p.id)}`, papel: PAPEL, extra: linhaPg(p) })).join('')}</div>`).join('')
        : vazio({ icone: 'clipboard-list', titulo: 'Nenhum pedido ainda', acao: `<a class="btn cta mt16" href="${BASE}/contratar">Contratar um serviço</a>` })}
    </div>`
    icones()
  } catch (e) { erroCarga(ctx.el, e) }
}

async function pedido(ctx) {
  ctx.el.innerHTML = `<div class="wrap mt16">${carregando(2)}</div>`
  try {
    const p = await api.obterPedido(ctx.param)
    const cob = await api.cobrancaDoPedido(p.id).catch(() => null)
    const s = p.servico
    ctx.el.innerHTML = `<div class="prop-cab"><a class="lnk" href="${BASE}/pedidos">${ic('arrow-left', 'i14')}Pedidos</a></div>
      <div class="wrap gap16 anf-ped">
        <article class="card">
          <div class="ctr-done-hd"><b class="tn">PED-${esc(p.numero)}</b>${badgeStatus(p, PAPEL)}</div>
          <h1 class="anf-ped-h">${esc(s.nome)}</h1>
          <div class="sumrow"><span class="l">Imóvel</span><b>${esc(p.imovel.nome)} <span class="code">${esc(p.imovel.codigo)}</span></b></div>
          <div class="sumrow"><span class="l">Data e horário</span><b class="tn">${esc(fmtDia(p.data))} · ${fmtJanela(p.janela_inicio, p.janelas)}</b></div>
          <div class="sumrow"><span class="l">Profissional</span><b>${esc(p.prestador.nome)}</b></div>
          <div class="sumrow tot"><span>Total</span><span class="tn">${brl(p.preco_cents)}</span></div>
        </article>
        <div id="anf-pg"></div>
        ${p.status !== 'aguardando_pagamento' ? faixaPago(p, cob) : ''}
        ${!['cancelado', 'aguardando_pagamento'].includes(p.status) ? `<section class="card"><h2 class="ctr-h">Andamento</h2>${linhaDoTempo(p)}</section>` : ''}
        ${p.motivo_cancelamento ? `<p class="cap">${ic('info', 'i14')}Cancelado: ${esc(p.motivo_cancelamento)}</p>` : ''}
        ${avisoMaterial(true)}
        ${['aguardando_pagamento', 'aguardando_prestador', 'confirmado'].includes(p.status) ? `<button type="button" class="btn out w" id="anf-cancelar">${ic('x')}Cancelar pedido${cob && ['pago', 'retido'].includes(cob.status) ? ' (o valor volta)' : ''}</button>` : ''}
      </div>`
    icones()
    if (p.status === 'aguardando_pagamento') await montarPagamento($('#anf-pg', ctx.el), p, { aoPago: () => ctx.recarregar() })
    const bc = $('#anf-cancelar', ctx.el)
    if (bc) bc.onclick = async () => {
      if (!confirm('Cancelar este pedido?')) return
      try { await api.cancelarPedido({ pedido_id: p.id, motivo: 'Cancelado pelo anfitrião' }); toast('Pedido cancelado'); ctx.recarregar() } catch (e) { falha(e) }
    }
  } catch (e) { erroCarga(ctx.el, e, 'Pedido não encontrado') }
}

// ---------- perfil e verificação do celular ----------
const fmtCel = (c) => { const d = String(c || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d }
async function perfil(ctx) {
  const cab = cabecalho('Meu perfil', 'Seus dados e os pagamentos que você fez.')
  ctx.el.innerHTML = `${cab}<div class="wrap">${carregando(2)}</div>`
  try {
    const [pf, cobs] = await Promise.all([api.anfitriaoPerfil(), api.anfitriaoCobrancas().catch(() => [])])
    ctx.el.innerHTML = `${cab}<div class="wrap prf">
      <section class="card prf-cartao">${avatar(pf.nome, 'lg')}<div><b>${esc(pf.nome)}</b><div class="cap">${esc(pf.email || '')}</div>
        <div class="cap prf-ib">${ic('building-2', 'i14')}${pf.n_imoveis} imóve${pf.n_imoveis === 1 ? 'l' : 'is'} · ${esc((pf.documento_tipo || '').toUpperCase())} ${esc(pf.documento_mascarado || '')}</div></div></section>
      ${avisoCelular(pf)}
      <form class="card prf-form" id="anf-pf" novalidate><h2 class="ctr-h">Dados de contato</h2>
        <div class="prf-grid">
          <div class="prf-campo"><label class="prop-lbl" for="anf-nome">Nome</label><input id="anf-nome" name="nome" type="text" value="${esc(pf.nome)}" autocomplete="name"></div>
          <div class="prf-campo"><label class="prop-lbl" for="anf-cel">Celular com WhatsApp</label><input id="anf-cel" name="celular" type="tel" inputmode="tel" value="${esc(fmtCel(pf.celular))}"><p class="cap prf-dica">${pf.celular_verificado ? `${ic('badge-check', 'i14')}Confirmado` : 'Ainda não confirmado'}. Trocar o número pede um código novo.</p></div>
        </div>
        <p class="cap">${ic('lock', 'i14')}O CPF/CNPJ não muda depois do cadastro. Precisa trocar? Fale com a gente pela SIA.</p>
        <button type="submit" class="btn cta prf-salvar">Salvar alterações</button></form>
      <h2 class="sec">Pagamentos</h2>
      <div class="list">${cobs.length ? cobs.map((c) => { const r = api.STATUS_COBRANCA[c.status] || { rotulo: c.status, tom: 'no' }; return `<a class="card anf-cob" href="${BASE}/pedido/${encodeURIComponent(c.pedido_id)}"><span class="anf-imv-ic">${ic(c.metodo === 'cartao' ? 'credit-card' : 'qr-code')}</span><span class="anf-imv-tx"><b>${esc(c.servico_nome || '')}</b><span class="cap">PED-${esc(c.pedido_numero)} · ${esc(c.imovel_nome || '')}</span></span><span class="anf-cob-v"><b class="tn">${brl(c.valor_cents)}</b><span class="badge b-${r.tom}">${esc(r.rotulo)}</span></span></a>` }).join('') : `<div class="card prop-vazio-linha">${ic('wallet')}<span class="sub">Nenhum pagamento ainda.</span></div>`}</div>
    </div>`
    icones()
    $('#anf-pf', ctx.el).addEventListener('submit', async (e) => {
      e.preventDefault()
      const f = Object.fromEntries(new FormData(e.target))
      try {
        const r = await api.anfitriaoSalvarPerfil({ nome: f.nome, celular: f.celular })
        toast('Perfil salvo')
        if (!r.celular_verificado) { ctx.ir(`${BASE}/verificar${r.codigo_demo ? `?c=${r.codigo_demo}` : ''}`); return }
        ctx.recarregar()
      } catch (err) { falha(err) }
    })
  } catch (e) { erroCarga(ctx.el, e) }
}

/** Tela do código do celular. `?c=` traz o código da demo/simulado (mostrado na tela, como pede o contrato). */
export async function verificar(ctx, { depois = BASE } = {}) {
  let codigoDemo = ctx.query.c || ''
  let pf = null
  try { pf = await api.anfitriaoPerfil() } catch { /* segue */ }
  if (pf?.celular_verificado) { ctx.ir(depois); return }
  ctx.el.innerHTML = `<section class="anf-ver"><div class="card anf-ver-c">
      <span class="anf-ver-ic">${ic('message-square-lock')}</span>
      <h1>Confirme o seu celular</h1>
      <p class="sub">Mandamos um código de 6 números por WhatsApp para <b>${esc(fmtCel(pf?.celular) || 'o seu celular')}</b>. Ele vale por 10 minutos.</p>
      ${codigoDemo ? `<p class="anf-demo-cod" id="anf-demo-cod">${ic('flask-conical', 'i14')}Modo teste: o seu código é <b class="tn">${esc(codigoDemo)}</b></p>` : ''}
      <form id="anf-ver-f" novalidate><label class="prop-lbl" for="anf-cod">Código</label>
        <input id="anf-cod" class="anf-cod" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000">
        <p class="cap anf-ver-err" id="anf-ver-err" aria-live="polite"></p>
        <button type="submit" class="btn cta">Confirmar</button></form>
      <button type="button" class="btn out w mt8" id="anf-reenviar">${ic('rotate-ccw')}Mandar outro código</button>
    </div></section>`
  icones()
  const err = $('#anf-ver-err', ctx.el)
  $('#anf-ver-f', ctx.el).addEventListener('submit', async (e) => {
    e.preventDefault()
    try {
      const r = await api.anfitriaoVerificarCelular({ codigo: $('#anf-cod', ctx.el).value })
      if (r.verificado) { toast('Celular confirmado'); ctx.ir(depois); return }
      err.textContent = r.error?.message || 'Código errado.'
    } catch (e2) { falha(e2) }
  })
  $('#anf-reenviar', ctx.el).onclick = async () => {
    try {
      const r = await api.anfitriaoReenviarCodigo()
      if (r.verificado) { ctx.ir(depois); return }
      toast('Código novo enviado')
      if (r.codigo_demo) { codigoDemo = r.codigo_demo; const b = $('#anf-demo-cod b', ctx.el); if (b) b.textContent = codigoDemo; else ctx.ir(`${BASE}/verificar?c=${codigoDemo}`) }
    } catch (e) { falha(e) }
  }
}

export const rotas = {
  '': inicio,
  contratar: (ctx) => fluxoContratar(ctx, { papel: PAPEL, voltar: BASE }),
  pedidos,
  pedido,
  imoveis,
  imovel,
  perfil,
  verificar: (ctx) => verificar(ctx),
}
