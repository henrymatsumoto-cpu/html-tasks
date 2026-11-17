// ConcertAI · telas da FRANQUIA (carteira de imóveis, pedidos, detalhe e agenda notificada).
// Dados só via ../api.js; componentes via ../ui.js. CSS: bloco "franquia.js" no fim do app.css.
import * as api from '../api.js?v=79617c8'
import {
  $, esc, ic, icones, brl, fmtDia, fmtDiaRel, fmtJanela, img, avatar, estrela, badgeStatus,
  avisoMaterial, linhaDoTempo, vazio, carregando, abrirSheet, toast, falha, calendario, ligarCalendario,
  cabecalhoPasso, cardPedido, isoDia, somarDias, paraData,
} from '../ui.js?v=79617c8'
import { carregarContato, blocoContato } from './contato-whatsapp.js?v=79617c8'
import { blocoMateriaisComprador, ligarMateriaisComprador } from './prestador-extras.js?v=79617c8'
import { fluxoContratar, proximoDiaLivre, fmtDiaLivre, linhaCalendario, duracaoFaixa, avisoPeca, blocoConfirmacao, ligarTroca } from './contratar.js?v=79617c8'
import { seletorImovel, ligarSeletorImovel } from './seletor-imovel.js?v=79617c8'
import { formImovelAvulso } from './imovel-avulso.js?v=79617c8'

const PAPEL = 'franquia'

const AGENDA_STATUS = ['aguardando_aprovacao', 'aguardando_prestador', 'confirmado', 'em_execucao']
const ANDAMENTO = ['aguardando_prestador', 'confirmado', 'em_execucao', 'prova_enviada']
const CANCELAVEL = ['aguardando_aprovacao', 'aguardando_prestador', 'confirmado']

export const abas = [
  { id: '', rotulo: 'Carteira', icone: 'building-2', ativas: ['contratar'] },
  { id: 'pedidos', rotulo: 'Pedidos', icone: 'clipboard-list', ativas: ['pedido'] },
  { id: 'agenda', rotulo: 'Visitas', icone: 'calendar-check' },
]

/** Contador de pedidos esperando o proprietário na aba Pedidos. */
export async function contadores(topoEl) {
  const l = await api.listarPedidos({ status: ['aguardando_aprovacao'] })
  const aba = topoEl.querySelector('a.tab[href="#/franquia/pedidos"]')
  if (!aba || !l.length) return
  aba.insertAdjacentHTML('beforeend', `<span class="ct" aria-label="${l.length} aguardando aprovação">${l.length}</span>`)
}

// ---------- helpers locais ----------
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1)
/** ISO datetime → "amanhã, 14h" no fuso local */
function fmtQuando(isoDt) {
  const d = new Date(isoDt)
  const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `${fmtDiaRel(dia)}, ${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`
}
const fmtDm = (iso) => { const d = paraData(iso); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` }
/** segunda e domingo da semana de hoje */
function semanaAtual() {
  const hoje = isoDia(0); const dow = paraData(hoje).getDay()
  const seg = somarDias(hoje, dow === 0 ? -6 : 1 - dow)
  return [seg, somarDias(seg, 6)]
}
const chipQuemPediu = (p) => p.comprador_papel === 'proprietario'
  ? `<span class="fra-chip-neutro">${ic('user-round', 'i14')}Pedido do proprietário</span>`
  : `<span class="fra-chip-neutro">${ic('building-2', 'i14')}Pedido da franquia</span>`

// ======================================================================
// CARTEIRA: o imóvel se escolhe no dropdown do topo (REGRA 17/11); embaixo, o resumo dele e o botão de contratar
// ======================================================================
async function telaCarteira(ctx) {
  ctx.el.innerHTML = `<div class="wrap">${carregando(4)}</div>`
  try {
    const hoje = isoDia(0)
    const [imoveis, pedidos] = await Promise.all([api.imoveisDoComprador(), api.listarPedidos()])
    if (!imoveis.length) {
      ctx.el.innerHTML = `<div class="wrap">${vazio({ icone: 'building-2', titulo: 'Carteira vazia', texto: 'Nenhum imóvel na carteira da franquia. Se isso estiver errado, fale com a gente pela SIA.' })}</div>`
      icones(); return
    }
    const im = imoveis.find((i) => i.id === ctx.query.imovel) || imoveis[0]
    const rs = (await api.listarReservas({ imovel_id: im.id, de: hoje, ate: somarDias(hoje, 180) }).catch(() => [])).slice().sort((a, b) => a.check_in.localeCompare(b.check_in))
    const [seg, dom] = semanaAtual()
    const visitasSemana = pedidos.filter((p) => AGENDA_STATUS.includes(p.status) && p.data >= seg && p.data <= dom).length
    const aguardando = pedidos.filter((p) => p.status === 'aguardando_aprovacao').length
    const linha = {
      im,
      agora: rs.find((r) => r.check_in <= hoje && r.check_out >= hoje),
      prox: rs.find((r) => r.check_in > hoje),
      ativos: pedidos.filter((p) => p.imovel_id === im.id && [...AGENDA_STATUS, 'prova_enviada'].includes(p.status)),
      livre: proximoDiaLivre(rs),
    }

    ctx.el.innerHTML = `<div class="wrap">
      <h1 class="fra-h1">Carteira</h1>
      <p class="sub">${esc(ctx.sessao.nome)} · ${imoveis.length} imóve${imoveis.length === 1 ? 'l' : 'is'}</p>
      <div class="fra-escolha mt16">
        ${seletorImovel({ imoveis, atual: im.id, rotulo: 'Imóvel da carteira', cadastrar: '#/franquia/imovel-fora' })}
        ${cardImovel(linha)}
        <a class="btn cta" href="#/franquia/contratar?imovel=${encodeURIComponent(im.id)}" aria-label="Ver serviços do ${esc(im.nome)}">Ver serviços deste imóvel</a>
      </div>
      <div class="fra-kpis mt24">
        <div class="card kpi"><b>${imoveis.length}</b><span>Imóveis</span></div>
        <a class="card kpi" href="#/franquia/agenda"><b>${visitasSemana}</b><span>Visitas esta semana</span></a>
        <a class="card kpi" href="#/franquia/pedidos"><b>${aguardando}</b><span>Aguardando o proprietário</span></a>
      </div>
      ${avisoMaterial(true)}
    </div>`
    icones()
    ligarSeletorImovel(ctx.el, { imoveis, atual: im.id, aoEscolher: (novo) => ctx.ir(`#/franquia?imovel=${encodeURIComponent(novo.id)}`) })
  } catch (e) { falha(e); ctx.el.innerHTML = `<div class="wrap">${vazio({ icone: 'wifi-off', titulo: 'Não deu pra carregar a carteira', texto: 'Algo deu errado do nosso lado. Tente de novo em alguns minutos.' })}</div>` }
}

/** Resumo do imóvel escolhido: proprietário, hóspede, próximo dia livre e pedidos ativos. */
function cardImovel({ im, agora, prox, ativos, livre }) {
  const reserva = agora
    ? `<span>${ic('bed-double')}Hóspede agora, sai ${fmtDm(agora.check_out)}</span>`
    : prox ? `<span>${ic('bed-double')}Próxima reserva ${fmtDm(prox.check_in)}–${fmtDm(prox.check_out)}</span>`
      : `<span>${ic('bed-double')}Sem reserva próxima</span>`
  const ped = ativos.length
    ? `<a class="lnk" href="#/franquia/agenda?imovel=${encodeURIComponent(im.id)}">${ic('calendar-check', 'i14')}${ativos.length} pedido${ativos.length > 1 ? 's' : ''} ativo${ativos.length > 1 ? 's' : ''}</a>`
    : ''
  return `<article class="card fra-imv">
    ${img(im.foto_url, '', im.nome)}
    <div class="fra-imv-tx">
      ${im.proprietario ? `<div class="cap fra-ib">${ic('user', 'i14')}Proprietário: ${esc(im.proprietario.nome)}</div>` : ''}
      ${linhaCalendario(im)}
      <div class="meta">${reserva}<span>${ic('calendar')}Próximo dia livre: ${esc(fmtDiaLivre(livre))}</span></div>
      ${ped ? `<div class="mt8">${ped}</div>` : ''}
    </div>
  </article>`
}

// ======================================================================
// PEDIDOS
// ======================================================================
async function telaPedidos(ctx) {
  ctx.el.innerHTML = `<div class="wrap">${carregando(4)}</div>`
  try {
    const [pedidos, imoveis, matPend] = await Promise.all([api.listarPedidos(), api.listarImoveis({ todos: true }), api.listarMateriaisPendentes().catch(() => [])])
    const comPeca = new Set(matPend.map((m) => m.pedido_id))
    const dono = Object.fromEntries(imoveis.map((i) => [i.id, i.proprietario?.nome || 'o proprietário']))
    const aguard = pedidos.filter((p) => p.status === 'aguardando_aprovacao')
    const andamento = pedidos.filter((p) => ANDAMENTO.includes(p.status))
    const fim = pedidos.filter((p) => !AGENDA_STATUS.includes(p.status) && !ANDAMENTO.includes(p.status) && !api.podeTrocarPrestador(p)).reverse()
    const link = (p) => `#/franquia/pedido/${encodeURIComponent(p.id)}`

    if (!pedidos.length) {
      ctx.el.innerHTML = `<div class="wrap">${vazio({ icone: 'clipboard-list', titulo: 'Nenhum pedido ainda', texto: 'Os pedidos da carteira aparecem aqui.', acao: '<a class="btn cta mt16" href="#/franquia">Contratar serviço</a>' })}</div>`
      return
    }
    const extraAguard = (p) => `<div class="fra-linha">${ic('hourglass', 'i14')}<span>${esc(dono[p.imovel_id])} decide até ${p.aprovacao?.expira_em ? esc(fmtQuando(p.aprovacao.expira_em)) : 'em 48h'}. Sem resposta, o pedido é cancelado e a data liberada.</span></div>`
    const trocar = pedidos.filter((p) => api.podeTrocarPrestador(p))
    const extraTroca = () => `<div class="fra-linha">${ic('repeat', 'i14')}<span>O profissional não pode ir. Abra o pedido e escolha outro para o mesmo horário.</span></div>`
    const extraAnd = (p) => `<div class="row">${chipQuemPediu(p)}${p.status === 'prova_enviada' && p.comprador_papel === 'franquia' ? `<span class="badge b-in fra-ib">${ic('camera', 'i14')}Confira as fotos</span>` : ''}${comPeca.has(p.id) ? `<span class="badge b-ap fra-ib">${ic('package', 'i14')}Peça esperando aprovação</span>` : ''}</div>`

    ctx.el.innerHTML = `<div class="wrap">
      <h1 class="fra-h1">Pedidos</h1>
      ${aguard.length ? `<h2 class="sec">Aguardando aprovação do proprietário</h2>
        <div class="info">${ic('info')}<span>Acima de R$ 300, o proprietário aprova antes. A data fica reservada por 48h.</span></div>
        <div class="list mt16">${aguard.map((p) => cardPedido(p, { link: link(p), extra: extraAguard(p), papel: PAPEL })).join('')}</div>` : ''}
      ${trocar.length ? `<h2 class="sec">Escolha outro profissional</h2>
        <div class="list">${trocar.map((p) => cardPedido(p, { link: link(p), extra: extraTroca(p), papel: PAPEL })).join('')}</div>` : ''}
      <h2 class="sec">Em andamento</h2>
      ${andamento.length ? `<div class="list">${andamento.map((p) => cardPedido(p, { link: link(p), extra: extraAnd(p), papel: PAPEL })).join('')}</div>` : '<p class="sub">Nada em andamento agora.</p>'}
      ${fim.length ? `<h2 class="sec">Concluídos e encerrados</h2><div class="list">${fim.map((p) => cardPedido(p, { link: link(p), papel: PAPEL })).join('')}</div>` : ''}
    </div>`
  } catch (e) { falha(e); ctx.el.innerHTML = `<div class="wrap">${vazio({ icone: 'wifi-off', titulo: 'Não deu pra carregar os pedidos' })}</div>` }
}

// ======================================================================
// DETALHE DO PEDIDO
// ======================================================================
async function telaPedido(ctx) {
  ctx.el.innerHTML = `${cabecalhoPasso('Pedido', { voltar: '#/franquia/pedidos' })}<div class="wrap">${carregando(2)}</div>`
  try {
    const [p, imoveis] = await Promise.all([api.obterPedido(ctx.param), api.listarImoveis({ todos: true })])
    if (p.status === 'aguardando_pagamento') { ctx.ir(`#/franquia/contratar?pedido=${encodeURIComponent(p.id)}`); return } // imóvel fora da Seazone (T807)
    const im = imoveis.find((i) => i.id === p.imovel_id)
    if (!im) { ctx.el.innerHTML = `${cabecalhoPasso('Pedido', { voltar: '#/franquia/pedidos' })}<div class="wrap">${vazio({ icone: 'search-x', titulo: 'Pedido não encontrado', texto: 'Esse pedido não é de um imóvel da sua carteira.' })}</div>`; return }
    const sv = p.servico; const pr = p.prestador
    const donoNome = im.proprietario?.nome || 'o proprietário'
    const daFranquia = p.comprador_papel === 'franquia'
    const podeCancelar = CANCELAVEL.includes(p.status)
    const podeConfirmar = p.status === 'prova_enviada' && daFranquia
    const encerrado = ['recusado_proprietario', 'recusado_prestador', 'cancelado'].includes(p.status)
    const trocavel = api.podeTrocarPrestador(p) || Boolean(p.substituido_por)
    const msgEnc = {
      recusado_proprietario: `${donoNome} recusou esse pedido. Nada foi cobrado.`,
      recusado_prestador: 'O profissional não pôde ir. Contrate de novo para ver outro profissional ou outro horário. Nada foi cobrado.',
      cancelado: `Pedido cancelado${p.motivo_cancelamento ? `: ${p.motivo_cancelamento}` : ''}. Nada foi cobrado.`,
    }[p.status]
    const antes = p.fotos.filter((f) => f.tipo === 'antes'); const depois = p.fotos.filter((f) => f.tipo !== 'antes')
    const rotuloFoto = { antes: 'Antes', depois: 'Depois', material: 'Material' }
    const extras = await api.extrasDoPedido(p).catch(() => ({ materiais: [] })) // material pedido pelo profissional (T624)
    const contato = await carregarContato(p) // WhatsApp do profissional: do aceite até o fim da garantia (REGRA de 17/11)

    ctx.el.innerHTML = `<article class="fra-ped">${cabecalhoPasso(sv.nome, { voltar: '#/franquia/pedidos' })}
    <div class="wrap gap16">
      <div class="row fra-topo">${badgeStatus(p, PAPEL)}<span class="code">PED-${esc(p.numero)}</span>${chipQuemPediu(p)}</div>

      ${p.status === 'aguardando_aprovacao' ? `<div class="info">${ic('info')}<span>Acima de ${brl(api.LIMITE_APROVACAO_CENTS)}, quem aprova é ${esc(donoNome)}, que paga pelo repasse. A data fica reservada até ${p.aprovacao?.expira_em ? esc(fmtQuando(p.aprovacao.expira_em)) : '48h depois do pedido'}.</span></div>` : ''}
      ${blocoConfirmacao(p, PAPEL)}
      ${encerrado && trocavel ? '' : encerrado ? `<div class="mat">${ic('circle-x')}<div><b>${esc(badgeTexto(p))}</b><p>${esc(msgEnc)}</p></div></div>` : `<div class="card"><h3>Acompanhamento</h3>${linhaDoTempo(p)}</div>`}

      <div class="card">
        <div class="imgrow">${img(im.foto_url, '', im.nome)}<div><b>${esc(im.nome)}</b> <span class="code">${esc(im.codigo)}</span><div class="cap">Proprietário: ${esc(donoNome)}</div></div></div>
        <div class="sumrow"><span class="l fra-ib">${ic('calendar-check', 'i14')} Quando</span><b class="tn">${esc(capital(fmtDiaRel(p.data)))} · ${fmtJanela(p.janela_inicio, p.janelas)}</b></div>
        <div class="sumrow"><span class="l fra-ib">${ic('clock', 'i14')} Duração estimada</span><span class="tn">${esc(duracaoFaixa(sv))}</span></div>
        <div class="sumrow"><span class="l fra-ib">${ic('user-round', 'i14')} Quem pediu</span><span>${daFranquia ? 'Franquia' : `Proprietário (${esc(donoNome)})`}</span></div>
        <div class="sumrow"><span class="l fra-ib">${ic('wallet', 'i14')} Quem paga</span><span>${esc(donoNome)}, pelo repasse</span></div>
        ${p.observacao ? `<p class="note mt8 fra-ib">${ic('message-square', 'i14')}${esc(p.observacao)}</p>` : ''}
        <div class="divider mt16"></div>
        <p class="note mt16">${esc(sv.descricao)}</p>
        <div class="sumrow tot"><span>Total</span><span class="tn">${brl(p.preco_cents)}</span></div>
      </div>
      ${p.aviso_reserva && !encerrado ? `<div class="info">${ic('bed-double')}<span>Tem hóspede nesse dia. Combine o acesso com o hóspede e o profissional.</span></div>` : ''}
      ${avisoPeca(sv, 'ctr-peca-box')}
      ${avisoMaterial()}
      ${blocoMateriaisComprador(p, extras)}

      <div class="card fra-pro">${avatar(pr.nome, 'lg ok')}<div><b>${esc(pr.nome)}</b><div class="sub">${estrela()} ${pr.nota_media.toLocaleString('pt-BR')} · ${pr.n_servicos} serviços</div>${pr.bio ? `<div class="cap">${esc(pr.bio)}</div>` : ''}</div></div>
      ${blocoContato(contato)}

      ${p.fotos.length ? `<div class="card"><h3>Fotos do serviço</h3><div class="fotos mt8">${[...antes, ...depois].map((f) => `<div class="ft">${img(f.storage_path, '', rotuloFoto[f.tipo] || 'Foto')}<span class="lbl">${esc(rotuloFoto[f.tipo] || 'Foto')}</span></div>`).join('')}</div></div>` : ''}

      ${p.avaliacao ? `<div class="card"><h3>Avaliação</h3><div class="stars mt8" aria-label="Nota ${p.avaliacao.nota} de 5">${Array.from({ length: 5 }, (_, i) => `<span class="${i < p.avaliacao.nota ? 'fra-st-on' : 'fra-st'}">${ic('star')}</span>`).join('')}</div>${p.avaliacao.comentario ? `<p class="note mt8">${esc(p.avaliacao.comentario)}</p>` : ''}</div>` : ''}

      ${podeConfirmar ? `<div class="gap8"><p class="sub">Confira as fotos. Se está tudo certo, confirme para liberar o pagamento do profissional.</p><button type="button" class="btn cta" id="fra-confirmar">${ic('circle-check')}Confirmar conclusão</button></div>` : ''}
      ${p.status === 'prova_enviada' && !daFranquia ? `<p class="sub">O proprietário confere as fotos e confirma a conclusão.</p>` : ''}
      ${podeCancelar ? `<button type="button" class="btn out w" id="fra-cancelar">${ic('x')}Cancelar pedido</button><p class="cap fra-centro">Cancele sem custo até o profissional começar o serviço.</p>` : ''}
    </div></article>`

    ligarMateriaisComprador(ctx)
    ligarTroca(ctx, p, PAPEL)
    icones()
    const bConf = $('#fra-confirmar', ctx.el)
    if (bConf) bConf.addEventListener('click', async () => {
      bConf.disabled = true
      try { await api.avancarPedido({ pedido_id: p.id, para: 'concluido' }); toast('Serviço concluído. Pagamento liberado'); ctx.recarregar() } catch (e) { bConf.disabled = false; falha(e) }
    })
    const bCanc = $('#fra-cancelar', ctx.el)
    if (bCanc) bCanc.addEventListener('click', () => abrirCancelar(ctx, p))
  } catch (e) { falha(e); ctx.el.innerHTML = `${cabecalhoPasso('Pedido', { voltar: '#/franquia/pedidos' })}<div class="wrap">${vazio({ icone: 'search-x', titulo: 'Pedido não encontrado' })}</div>` }
}
function badgeTexto(p) { return api.rotuloStatus(p.status, PAPEL) }

function abrirCancelar(ctx, p) {
  const s = abrirSheet(`<h2>Cancelar pedido?</h2>
    <p class="sub mt8">${esc(p.servico.nome)} · ${esc(capital(fmtDiaRel(p.data)))}, ${fmtJanela(p.janela_inicio, p.janelas)}. O profissional e o proprietário são avisados.</p>
    <label class="cap mt16" for="fra-motivo" style="display:block">Motivo (opcional)</label>
    <textarea id="fra-motivo" rows="3" class="mt8" placeholder="Ex.: o problema já foi resolvido"></textarea>
    <div class="gap8 mt16"><button type="button" class="btn pri w" id="fra-sim">Sim, cancelar</button><button type="button" class="btn out w" data-fechar-sheet>Voltar</button></div>`)
  const b = $('#fra-sim', s.el)
  b.addEventListener('click', async () => {
    b.disabled = true
    try { await api.cancelarPedido({ pedido_id: p.id, motivo: $('#fra-motivo', s.el).value.trim() }); s.fechar(); toast('Pedido cancelado'); ctx.recarregar() } catch (e) { b.disabled = false; falha(e) }
  })
}

// ======================================================================
// AGENDA NOTIFICADA
// ======================================================================
async function telaAgenda(ctx) {
  ctx.el.innerHTML = `<div class="wrap">${carregando(3)}</div>`
  let imoveis, visitas, notifs, reservasPorImovel
  const hoje = isoDia(0)
  try {
    ;[imoveis, visitas, notifs] = await Promise.all([api.listarImoveis(), api.listarPedidos({ status: AGENDA_STATUS }), api.listarNotificacoes()])
    const rs = await Promise.all(imoveis.map((i) => api.listarReservas({ imovel_id: i.id, de: somarDias(hoje, -30), ate: somarDias(hoje, 180) }).catch(() => [])))
    reservasPorImovel = Object.fromEntries(imoveis.map((i, k) => [i.id, rs[k]]))
  } catch (e) { falha(e); ctx.el.innerHTML = `<div class="wrap">${vazio({ icone: 'wifi-off', titulo: 'Não deu pra carregar as visitas', texto: 'Algo deu errado do nosso lado. Tente de novo em alguns minutos.' })}</div>`; return }
  visitas = visitas.filter((p) => p.data >= hoje || p.status === 'em_execucao').sort((a, b) => a.data.localeCompare(b.data) || a.janela_inicio - b.janela_inicio)
  const dono = Object.fromEntries(imoveis.map((i) => [i.id, i.proprietario?.nome || 'o proprietário']))
  const cientes = new Set()
  const est = {
    imovel: imoveis.some((i) => i.id === ctx.query.imovel) ? ctx.query.imovel : '',
    dia: '',
    mes: (() => { const d = paraData(hoje); return new Date(d.getFullYear(), d.getMonth(), 1) })(),
  }

  ctx.el.innerHTML = `<div class="wrap">
    <h1 class="fra-h1">Visitas marcadas</h1>
    <p class="sub">Todas as visitas da carteira, inclusive as que o proprietário contratou.</p>
    <div class="fra-chips mt16" role="group" aria-label="Filtrar por imóvel" id="fra-chips"></div>
    <div class="card mt16" id="fra-cal"></div>
    <div id="fra-visitas"></div>
    <h2 class="sec">Avisos recentes</h2>
    <div class="list" id="fra-avisos"></div>
  </div>`

  const chips = () => {
    $('#fra-chips', ctx.el).innerHTML = [{ id: '', nome: 'Todos' }, ...imoveis].map((i) => `<button type="button" class="fra-chip" data-imv="${esc(i.id)}" aria-pressed="${est.imovel === i.id}">${esc(i.nome)}</button>`).join('')
    ctx.el.querySelectorAll('[data-imv]').forEach((b) => b.addEventListener('click', () => { est.imovel = b.dataset.imv; est.dia = ''; chips(); cal(); lista() }))
  }
  const filtradas = () => visitas.filter((p) => !est.imovel || p.imovel_id === est.imovel)

  let pedidoCal = 0
  const cal = async () => {
    const meu = ++pedidoCal
    const reservas = est.imovel ? reservasPorImovel[est.imovel] || [] : []
    if (meu !== pedidoCal) return
    const opts = {
      mes: est.mes, reservas, marcados: new Set(filtradas().map((p) => p.data)), selecionado: est.dia,
      aoEscolher: (d) => { est.dia = est.dia === d ? '' : d; cal(); lista() },
      aoMudarMes: (n) => { est.mes = new Date(est.mes.getFullYear(), est.mes.getMonth() + n, 1); cal() },
    }
    const el = $('#fra-cal', ctx.el)
    el.innerHTML = calendario(opts) + (est.imovel ? '' : '<p class="cap mt8">Escolha um imóvel para ver as reservas dele no calendário.</p>')
    ligarCalendario(el, opts); icones()
  }

  /** "O que você precisa fazer" de cada visita (o código preenche; 4.3) */
  const tarefas = (p) => {
    const rs = reservasPorImovel[p.imovel_id] || []
    const t = ['Liberar o acesso ao profissional no dia e horário da visita']
    if (rs.some((r) => r.check_out === p.data)) t.push('Avisar a limpeza: o serviço cai no dia do check-out')
    if (p.aviso_reserva || rs.some((r) => p.data > r.check_in && p.data < r.check_out)) t.push('Avisar o hóspede: tem reserva nesse dia')
    return t
  }

  const lista = () => {
    let l = filtradas()
    if (est.dia) l = l.filter((p) => p.data === est.dia)
    const porDia = new Map()
    for (const p of l) { if (!porDia.has(p.data)) porDia.set(p.data, []); porDia.get(p.data).push(p) }
    const filtro = est.dia ? `<div class="fra-filtro"><span class="sub">Mostrando ${esc(fmtDia(est.dia))}</span><button type="button" class="lnk" id="fra-limpa">${ic('x', 'i14')}Ver todos os dias</button></div>` : ''
    const corpo = porDia.size
      ? [...porDia.entries()].map(([d, ps]) => `<h2 class="fra-dia">${esc(capital(fmtDiaRel(d)))}${fmtDiaRel(d) !== fmtDia(d) ? ` <span class="code">${esc(fmtDia(d))}</span>` : ''}</h2>
          <div class="list">${ps.map((p) => itemVisita(p, { tarefas: tarefas(p), quem: p.comprador_papel === 'franquia' ? 'Pedido da franquia' : `Pedido de ${dono[p.imovel_id]}`, ciente: cientes.has(p.id) })).join('')}</div>`).join('')
      : vazio({ icone: 'calendar', titulo: est.dia ? 'Nenhuma visita nesse dia' : 'Nenhuma visita marcada', texto: 'Quando alguém contratar um serviço para a carteira, a visita aparece aqui.' })
    $('#fra-visitas', ctx.el).innerHTML = filtro + corpo
    const lb = $('#fra-limpa', ctx.el); if (lb) lb.addEventListener('click', () => { est.dia = ''; cal(); lista() })
    ctx.el.querySelectorAll('[data-ciente]').forEach((b) => b.addEventListener('click', () => { cientes.add(b.dataset.ciente); toast('Combinado. Obrigado por confirmar.'); lista() }))
    ctx.el.querySelectorAll('[data-problema]').forEach((b) => b.addEventListener('click', () => abrirProblema(visitas.find((p) => p.id === b.dataset.problema))))
    icones()
  }

  const avisos = () => {
    const ult = notifs.slice(0, 5)
    $('#fra-avisos', ctx.el).innerHTML = ult.length
      ? ult.map((n) => `<a class="card ntf ${n.lida_em ? '' : 'new'}" href="${esc(n.link || '#/franquia/agenda')}" data-ntf="${esc(n.id)}"><div class="ic">${ic(n.lida_em ? 'bell' : 'bell-ring')}</div><div><b>${esc(n.titulo)}</b><p class="note">${esc(n.corpo)}</p><span class="code">${esc(fmtDiaRel(n.criado_em.slice(0, 10)))}</span></div></a>`).join('')
      : '<p class="sub">Nenhum aviso por enquanto.</p>'
    ctx.el.querySelectorAll('[data-ntf]').forEach((a) => a.addEventListener('click', () => { api.marcarLida(a.dataset.ntf).catch(() => {}) }))
  }

  chips(); await cal(); lista(); avisos(); icones()
}

/** "Tem um problema" → "O que aconteceu?" (na demo só confirma com toast) */
function abrirProblema(p) {
  if (!p) return
  const s = abrirSheet(`<h2>O que aconteceu?</h2>
    <p class="sub mt8">${esc(p.servico.nome)} · ${esc(p.imovel.nome)} · ${esc(capital(fmtDiaRel(p.data)))}, ${fmtJanela(p.janela_inicio, p.janelas)}</p>
    <div class="pst-motivos mt16" role="radiogroup" aria-label="O que aconteceu">
      ${['Acesso não vai dar', 'Data não serve', 'Outro'].map((m, i) => `<label class="pst-motivo"><input type="radio" name="fra-prob" value="${esc(m)}" ${i === 0 ? 'checked' : ''}>${esc(m)}</label>`).join('')}
    </div>
    <textarea id="fra-prob-tx" rows="3" class="mt8" maxlength="300" placeholder="Conte o que aconteceu (opcional)"></textarea>
    <button type="button" class="btn pri w mt16" id="fra-prob-ok">Enviar</button>`)
  $('#fra-prob-ok', s.el).addEventListener('click', () => { s.fechar(); toast('Recebemos. A gente fala com você pela SIA.') })
}

function itemVisita(p, { tarefas, quem, ciente }) {
  return `<article class="card ord fra-vis2">
    <div class="fra-vis-hd"><b><a class="ord-lnk" href="#/franquia/pedido/${encodeURIComponent(p.id)}">${esc(p.servico.nome)}</a></b>${badgeStatus(p, PAPEL)}</div>
    <div class="cap">${esc(p.imovel.nome)} <span class="code">${esc(p.imovel.codigo)}</span> · <span class="code">PED-${esc(p.numero)}</span></div>
    <div class="meta"><span class="tn">${ic('calendar-check')}${esc(capital(fmtDiaRel(p.data)))} · ${fmtJanela(p.janela_inicio, p.janelas)}</span><span>${ic('clock')}${esc(duracaoFaixa(p.servico))}</span></div>
    <div class="fra-pro-l">${avatar(p.prestador.nome)}<span><b>${esc(p.prestador.nome)}</b><span class="cap">${esc(quem)}</span></span></div>
    <div class="ord-extra">
      <div class="fra-todo"><b>O que você precisa fazer:</b><ul>${tarefas.map((t) => `<li>${ic('square-check', 'i14')}<span>${esc(t)}</span></li>`).join('')}</ul></div>
      <div class="ord-acoes">${ciente
        ? `<span class="badge b-ok fra-ib fra-ciente">${ic('check', 'i14')}Ciente</span>`
        : `<button type="button" class="btn pri sm" data-ciente="${esc(p.id)}">Ciente</button>`}<button type="button" class="btn out sm" data-problema="${esc(p.id)}">Tem um problema</button></div>
    </div>
  </article>`
}

// ======================================================================
export const rotas = {
  '': telaCarteira,
  contratar: (ctx) => fluxoContratar(ctx, { papel: 'franquia', voltar: '#/franquia' }),
  'imovel-fora': (ctx) => formImovelAvulso(ctx.el, { voltar: '#/franquia', titulo: 'Cadastrar imóvel fora da Seazone', sub: 'Imóvel de um cliente que não é administrado pela Seazone. Os pedidos dele são pagos no ato (Pix ou cartão), não entram em repasse.', aoSalvar: (r) => ctx.ir(`#/franquia/contratar?imovel=${encodeURIComponent(r.imovel_id)}`) }),
  pedidos: telaPedidos,
  pedido: telaPedido,
  agenda: telaAgenda,
}

