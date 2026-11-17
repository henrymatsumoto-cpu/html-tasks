// ConcertAI · PORTAL DO PRESTADOR (Marcos T., MEI). Textos: docs/textos/site-e-telas.md seção 5.
// Ele vê só os pedidos dele e nunca os que ainda esperam aprovação do proprietário
// (a fonte já filtra; aqui conferimos de novo no detalhe).
// Rotas: '' = Seus pedidos (novos, hoje, próximos, concluídos; cada card é um <article> com "PED-{n}"
//             e o próximo passo inline: Aceitar/Recusar → Confirmar presença → Cheguei → fotos → Concluir)
//        'pedido/<id>' = detalhe com os mesmos passos · 'agenda' = próximos 14 dias · 'ganhos' = líquido
//        'perfil' = empresa, serviços, onde atende e horários (prestador-perfil.js), reflete na vitrine.
//        'garantia' = serviços concluídos há menos de 90 dias (prestador-pagamento.js).
// 17/11: sem NF não recebe. "Concluir" abre a folha da NF (arquivo, número, valor = preço do serviço, data) com a
// confirmação dos dados de pagamento; sem NF o valor fica bloqueado em Ganhos com o botão "Enviar NF".
// 17/11: pedido novo tem 1h para Confirmar (contagem na tela); recusa tira 0,1 da nota e expiração 0,2.
import * as api from '../api.js?v=79617c8'
import {
  $, esc, ic, icones, brl, fmtDia, fmtDiaRel, fmtJanela, fmtDuracao, img, badgeStatus,
  linhaDoTempo, vazio, carregando, abrirSheet, toast, falha, calendario, ligarCalendario,
  cabecalhoPasso, isoDia, somarDias, paraData, MESES,
} from '../ui.js?v=79617c8'
import { carregarContato, blocoContato } from './contato-whatsapp.js?v=79617c8'
import { blocoChecklist, blocoMaterial, ligarExtras, totalMateriaisAprovados } from './prestador-extras.js?v=79617c8'
import { sheetNF, blocoPagamento, ligarEnviarNF, telaGarantia } from './prestador-pagamento.js?v=79617c8'
import { rotasPerfil, nota1 } from './prestador-perfil.js?v=79617c8'

const BASE = '#/prestador'
const AGENDADOS = ['confirmado', 'em_execucao']
const FEITOS = ['prova_enviada', 'concluido']
const ROTULO_FOTO = { antes: 'Antes', depois: 'Depois', material: 'Item extra' }
const TXT_AGUARDANDO = 'O cliente confere as fotos (ou confirma sozinho em 72h). Depois disso, o Pix cai em até 1 dia útil.'
const TXT_LOCAL = 'Usamos a sua localização só para registrar a chegada.'

/** "Confirmar presença" (D-1): ainda sem RPC no contrato, então fica anotado só neste aparelho (localStorage).
 *  O aviso ao cliente entra quando existir a função no backend (T624/T625). */
const CHAVE_PRESENCA = 'concertai.presenca.v1'
const presencaConfirmada = new Set((() => { try { return JSON.parse(localStorage.getItem(CHAVE_PRESENCA) || '[]') } catch { return [] } })())
function anotarPresenca(id) { presencaConfirmada.add(id); try { localStorage.setItem(CHAVE_PRESENCA, JSON.stringify([...presencaConfirmada])) } catch { /* sem storage */ } }

export const abas = [
  { id: '', rotulo: 'Pedidos', icone: 'inbox', ativas: ['pedido'] },
  { id: 'agenda', rotulo: 'Agenda', icone: 'calendar-days' },
  { id: 'ganhos', rotulo: 'Ganhos', icone: 'wallet' },
  { id: 'garantia', rotulo: 'Garantia', icone: 'shield-check' },
  { id: 'perfil', rotulo: 'Perfil', icone: 'user-round' },
]

/** Nº de pedidos novos (aguardando você) na aba Pedidos. */
export async function contadores(topoEl) {
  const novos = await api.listarPedidos({ status: ['aguardando_prestador'] })
  const aba = topoEl.querySelector(`.tab[href="${BASE}/"]`)
  if (aba && novos.length) aba.insertAdjacentHTML('beforeend', `<span class="ct">${novos.length}</span>`)
}

// ---------- pedaços ----------
const ped = (p) => `PED-${esc(p.numero)}`
const aceito = (p) => p.status !== 'aguardando_prestador'
/** Antes do aceite só o bairro; depois, imóvel + endereço (o código de acesso só no dia). */
const ondeFica = (p) => {
  const im = p.imovel
  if (!aceito(p)) return `${esc(im.bairro)}, ${esc(im.cidade)}`
  return `${esc(im.nome)}${im.endereco ? ` · ${esc(im.endereco)}` : ''} · ${esc(im.bairro)}, ${esc(im.cidade)}`
}
const quando = (p) => `${esc(fmtDiaRel(p.data))} · ${esc(fmtJanela(p.janela_inicio, p.janelas))}`
const temFoto = (p, tipo) => (p.fotos || []).some((f) => f.tipo === tipo)
const avisoHospedePrestador = () => `<div class="info pst-info">${ic('bed-double')}<span>Tem hóspede nesse dia. Combine o acesso com a operação antes de ir.</span></div>`
/** Nenhuma peça entra no preço (regra de 17/11): aviso da peça do serviço + aviso fixo. */
const linhaMaterial = (sv) => `<div class="mline">${ic('package')}<span><b>Nenhuma peça está inclusa.</b> ${sv?.aviso_peca ? `${esc(sv.aviso_peca)} ` : ''}Se precisar de peça ou material, mande a foto e o valor pelo pedido: o cliente aprova antes de você comprar.</span></div>`
const pecaCurta = (sv) => sv?.aviso_peca ? `<div class="mline">${ic('package')}<span>${esc(sv.aviso_peca)}</span></div>` : ''
/** Contagem do prazo de 1h para confirmar (atualiza sozinha, ver ligarPrazos). */
function prazoTexto(min) {
  if (min === null) return ''
  if (min <= 0) return 'Prazo de 1h venceu'
  return min >= 60 ? 'Confirme em até 1h' : `Confirme em ${min} min`
}
const chipPrazo = (p) => {
  const min = api.minutosParaConfirmar(p)
  if (min === null) return ''
  return `<span class="pst-prazo${min <= 15 ? ' urg' : ''}" data-prazo="${esc(p.confirmar_ate)}" role="timer">${ic('timer')}<span>${prazoTexto(min)}</span></span>`
}
const TXT_EFEITO = `Recusar tira ${nota1(api.PENALIDADE.recusou)} da sua nota. Sem resposta em 1h, o pedido sai da sua agenda e tira ${nota1(api.PENALIDADE.expirou)}.`
const badgePrestador = (p) => p.status === 'aguardando_prestador' ? '<span class="badge b-in">Novo</span>'
  : p.status === 'recusado_prestador' ? `<span class="badge b-no">${p.recusa_tipo === 'expirou' ? 'Expirou sem resposta' : 'Você recusou'}</span>`
  : p.status === 'prova_enviada' ? '<span class="badge b-in">Fotos enviadas, aguardando confirmação</span>' : badgeStatus(p)

function blocoRecebe(p, detalhe = true) {
  return `<div class="pst-recebe">
    <b class="tn">Você recebe ${brl(p.liquido_cents)}</b>
    ${detalhe ? `<span class="cap tn">Preço do serviço ${brl(p.preco_cents)} · comissão fixa ConcertAI ${brl(p.taxa_cents)}</span>` : ''}
  </div>`
}

/**
 * Botões do próximo passo do pedido (lista e detalhe usam o mesmo HTML, com data-*).
 * cta() devolve 'cta' só na 1ª chamada da tela (1 botão coral por tela) e 'pri' depois.
 * ids = true no detalhe (#pst-checkin / #pst-presenca, usados pelo teste próprio).
 */
function acoes(p, cta, { ids = false } = {}) {
  const id = esc(p.id)
  if (p.status === 'aguardando_prestador') {
    return `<div class="pst-acoes">
        <button type="button" class="btn ${cta()}" data-aceitar="${id}"${ids ? ' id="pst-confirmar"' : ''}>${ic('check')}Confirmar</button>
        <button type="button" class="btn out" data-recusar="${id}">Recusar</button>
      </div>
      <p class="cap pst-nota">${TXT_EFEITO}</p>`
  }
  if (p.status === 'confirmado') {
    const ok = presencaConfirmada.has(p.id)
    // Cheguei fica sempre disponível: confirmar presença é o lembrete do D-1, não trava a chegada
    const presenca = ok
      ? `<span class="pst-chip">${ic('circle-check')}Presença confirmada</span>`
      : `<button type="button" class="btn ${cta()}" data-presenca="${id}"${ids ? ' id="pst-presenca"' : ''}>${ic('calendar-check')}Confirmar presença</button>`
    return `<div class="pst-passo">
        ${presenca}
        <button type="button" class="btn ${ok ? cta() : 'out'}" data-checkin="${id}"${ids ? ' id="pst-checkin"' : ''}>${ic('map-pin')}Cheguei</button>
        <p class="cap pst-nota">${TXT_LOCAL}</p>
      </div>`
  }
  if (p.status === 'em_execucao') {
    const depois = temFoto(p, 'depois')
    // DOM: depois antes do antes (o upload genérico do E2E pega o 1º input); na tela a ordem é antes → depois
    return `<div class="pst-passo">
        <p class="pst-ok">${ic('map-pin-check')}Check-in feito. Em atendimento.</p>
        <div class="pst-addrow">
          <label class="btn ${depois ? 'out' : 'pri'} pst-add pst-depois">${ic(depois ? 'circle-check' : 'camera')}Foto do depois<input type="file" accept="image/*" capture="environment" data-tipo="depois" data-pedido="${id}" class="pst-arq"></label>
          <label class="btn out pst-add pst-antes">${ic(temFoto(p, 'antes') ? 'circle-check' : 'camera')}Foto do antes<input type="file" accept="image/*" capture="environment" data-tipo="antes" data-pedido="${id}" class="pst-arq"></label>
        </div>
        ${ids ? '' : `<button type="button" class="btn ${depois ? cta() : 'pri'}" data-concluir="${id}" ${depois ? '' : 'disabled'}>${ic('circle-check')}Concluir</button>`}
        ${depois ? '' : '<p class="cap pst-nota">Mande a foto do depois para concluir.</p>'}
      </div>`
  }
  if (p.status === 'prova_enviada') {
    const semNF = api.situacaoPagamento(p).bloqueado
    return `<div class="pst-pago">${ic('circle-check')}<div><b>Fotos enviadas, aguardando confirmação</b><p>${semNF ? 'Falta a NF: sem ela o Pix não sai.' : TXT_AGUARDANDO}</p></div></div>
      ${semNF ? `<button type="button" class="btn ${cta()}" data-enviar-nf="${id}">${ic('file-up')}Enviar NF para receber</button>` : ''}`
  }
  return ''
}

/** Card do pedido (lista e agenda): <article> com PED-{n}, serviço, bairro/endereço, quando, valor e o próximo passo. */
function cardPedido(p, cta, { mostrarDia = true } = {}) {
  return `<article class="card pst-card" aria-label="${ped(p)} · ${esc(p.servico.nome)}">
    <div class="pst-hd">
      <div><b>${esc(p.servico.nome)}</b><div class="cap"><span class="tn">${ped(p)}</span> · ${esc(fmtDuracao(p.servico))}</div></div>
      ${badgePrestador(p)}
    </div>
    <div class="meta">
      <span>${ic('calendar-check')}${mostrarDia ? quando(p) : esc(fmtJanela(p.janela_inicio, p.janelas))}</span>
      <span>${ic('map-pin')}${ondeFica(p)}</span>
    </div>
    ${p.status === 'aguardando_prestador' ? chipPrazo(p) : ''}
    ${blocoRecebe(p, false)}
    ${p.status === 'aguardando_prestador' ? pecaCurta(p.servico) : ''}
    ${p.aviso_reserva && !FEITOS.includes(p.status) ? avisoHospedePrestador() : ''}
    ${p.status === 'aguardando_prestador' && p.observacao ? `<div class="pst-obs">${ic('message-circle')}<div><span class="cap">O cliente escreveu</span><p>${esc(p.observacao)}</p></div></div>` : ''}
    ${acoes(p, cta)}
    <a class="pst-ver" href="${BASE}/pedido/${encodeURIComponent(p.id)}">Ver detalhes do pedido${ic('chevron-right')}</a>
  </article>`
}

/** Fábrica do "1 coral por tela": a 1ª ação principal da tela leva coral, as outras azul. */
function umCoral() { let usado = false; return () => { if (usado) return 'pri'; usado = true; return 'cta' } }

/** Liga todos os botões de passo (lista e detalhe). */
function ligarAcoes(ctx) {
  const el = ctx.el
  const botaoQue = (sel, fn) => el.querySelectorAll(sel).forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true
    try { await fn(b) } catch (e) { b.disabled = false; falha(e) }
  }))
  botaoQue('[data-aceitar]', async (b) => {
    try {
      await api.confirmarPedido({ pedido_id: b.dataset.aceitar })
      toast('Pedido confirmado. O cliente já foi avisado.')
    } catch (e) {
      if (e?.code !== 'prazo_expirado') throw e
      toast('Passou 1h sem confirmação: o pedido saiu da sua agenda.')
    }
    ctx.recarregar()
  })
  el.querySelectorAll('[data-recusar]').forEach((b) => b.addEventListener('click', () => sheetRecusar(ctx, b.dataset.recusar)))
  botaoQue('[data-presenca]', async (b) => {
    anotarPresenca(b.dataset.presenca)
    toast('Anotado. No dia, toque em "Cheguei" ao entrar no imóvel.')
    ctx.recarregar()
  })
  botaoQue('[data-checkin]', async (b) => {
    await api.avancarPedido({ pedido_id: b.dataset.checkin, para: 'em_execucao' })
    toast('Check-in feito. Bom trabalho!')
    ctx.recarregar()
  })
  // Concluir abre a folha da NF (conclui e envia a NF, ou conclui sem NF e o valor fica bloqueado)
  botaoQue('[data-concluir]', async (b) => {
    const p = await api.obterPedido(b.dataset.concluir)
    await sheetNF(ctx, p, { concluir: true })
    b.disabled = false
  })
  ligarEnviarNF(ctx)
  el.querySelectorAll('input[type=file][data-tipo]').forEach((inp) => inp.addEventListener('change', async () => {
    const arquivo = inp.files && inp.files[0]
    if (!arquivo) return
    if (!/^image\//.test(arquivo.type)) { toast('Escolha uma foto.'); inp.value = ''; return }
    const tipo = inp.dataset.tipo
    el.querySelectorAll('input[type=file]').forEach((x) => { x.disabled = true })
    toast('Enviando foto...')
    try {
      await api.enviarFoto({ pedido_id: inp.dataset.pedido, tipo, arquivo })
      toast(tipo === 'material' ? 'Foto do item extra enviada. Quem paga aprova antes da compra.' : `Foto do ${tipo} enviada.`)
      ctx.recarregar()
    } catch (e) { el.querySelectorAll('input[type=file]').forEach((x) => { x.disabled = false }); falha(e) }
  }))
}

const MOTIVOS_RECUSA = ['Já tenho outro serviço nesse horário', 'Fica longe para mim nesse dia', 'Não faço esse tipo de serviço', 'Outro motivo']

function sheetRecusar(ctx, pedido_id) {
  const s = abrirSheet(`<h2>Recusar o pedido?</h2>
    <p class="sub mt8">Recusar tira <b>${nota1(api.PENALIDADE.recusou)}</b> da sua nota (deixar passar 1h sem responder tira ${nota1(api.PENALIDADE.expirou)}). Conte o motivo e o cliente escolhe outro profissional.</p>
    <div class="pst-motivos mt16" role="radiogroup" aria-label="Motivo">
      ${MOTIVOS_RECUSA.map((m, i) => `<label class="pst-motivo"><input type="radio" name="pst-motivo" value="${i}"><span>${esc(m)}</span></label>`).join('')}
    </div>
    <textarea class="mt16" id="pst-motivo-txt" rows="3" maxlength="300" placeholder="Quer explicar melhor? (opcional)"></textarea>
    <div class="pst-acoes mt16">
      <button type="button" class="btn pri" id="pst-enviar-recusa" disabled>Recusar pedido</button>
      <button type="button" class="btn out" data-fechar-sheet="1">Voltar</button>
    </div>`)
  const enviar = $('#pst-enviar-recusa', s.el)
  s.el.querySelectorAll('input[name="pst-motivo"]').forEach((r) => r.addEventListener('change', () => { enviar.disabled = false }))
  enviar.addEventListener('click', async () => {
    const sel = $('input[name="pst-motivo"]:checked', s.el)
    if (!sel) return
    const extra = $('#pst-motivo-txt', s.el).value.trim().slice(0, 300)
    const motivo = MOTIVOS_RECUSA[Number(sel.value)] + (extra ? `: ${extra}` : '')
    enviar.disabled = true
    try {
      await api.recusarPedido({ pedido_id, motivo })
      s.fechar()
      toast('Pedido recusado. O cliente já pode escolher outro profissional.')
      ctx.recarregar()
    } catch (e) { enviar.disabled = false; falha(e) }
  })
}

/** Atualiza a contagem de 1h a cada 15 s; quando um prazo vence, recarrega (o pedido sai de Novos). */
let relogio = null
function ligarPrazos(ctx) {
  clearInterval(relogio)
  if (!ctx.el.querySelector('[data-prazo]')) return
  relogio = setInterval(() => {
    const chips = [...ctx.el.querySelectorAll('[data-prazo]')]
    if (!ctx.el.isConnected || !chips.length) { clearInterval(relogio); return }
    let venceu = false
    for (const c of chips) {
      const min = Math.max(0, Math.ceil((new Date(c.dataset.prazo).getTime() - Date.now()) / 60e3))
      c.querySelector('span').textContent = prazoTexto(min)
      c.classList.toggle('urg', min <= 15)
      if (min <= 0) venceu = true
    }
    if (venceu) { clearInterval(relogio); ctx.recarregar() }
  }, 15e3)
}

/** Faixa da nota (aba Pedidos): nota atual e quanto recusa/expiração já tiraram. */
function faixaNota(f) {
  if (!f) return ''
  const pen = Number(f.penalidade || 0)
  return `<a class="card pst-nota-faixa" href="${BASE}/perfil">
    <span class="pst-nota-n tn">${ic('star', 'star')}${esc(nota1(f.nota))}</span>
    <span class="pst-nota-tx"><b>Sua nota na vitrine</b><span class="cap">${pen ? `Recusas e pedidos sem resposta já tiraram −${esc(nota1(pen))}. ` : ''}Confirme em até 1h para não perder ponto.</span></span>
    ${ic('chevron-right')}
  </a>`
}

/** Pedido que você recusou ou deixou expirar (só leitura, com o efeito na nota). */
function cardRecusado(p) {
  const exp = p.recusa_tipo === 'expirou'
  return `<article class="card pst-card pst-rec" aria-label="${ped(p)} · ${esc(p.servico.nome)}">
    <div class="pst-hd"><div><b>${esc(p.servico.nome)}</b><div class="cap"><span class="tn">${ped(p)}</span> · ${quando(p)} · ${esc(p.imovel.bairro)}</div></div>${badgePrestador(p)}</div>
    <p class="cap">${exp ? 'Passou 1h sem confirmação. O cliente pode escolher outro profissional.' : 'Você recusou. O cliente pode escolher outro profissional.'} <b class="pst-menos tn">−${esc(nota1(exp ? api.PENALIDADE.expirou : api.PENALIDADE.recusou))} na nota</b></p>
  </article>`
}

// ---------- telas ----------
async function telaPedidos(ctx) {
  ctx.el.innerHTML = `<div class="wrap">${carregando(3)}</div>`
  try {
    const [todos, perfil] = await Promise.all([
      api.listarPedidos({ status: ['aguardando_prestador', ...AGENDADOS, 'prova_enviada', 'recusado_prestador'] }),
      api.perfilPrestador().catch(() => null),
    ])
    const hoje = isoDia(0)
    const novos = todos.filter((p) => p.status === 'aguardando_prestador' && !api.confirmacaoExpirada(p))
    // recusados/expirados dos últimos 14 dias (pelo dia da visita), mais recente primeiro
    const recusados = todos.filter((p) => p.status === 'recusado_prestador' && p.data >= somarDias(hoje, -14)).reverse()
    const agend = todos.filter((p) => AGENDADOS.includes(p.status))
    const deHoje = agend.filter((p) => p.data <= hoje)
    const proximos = agend.filter((p) => p.data > hoje)
    // concluídos dos últimos 7 dias, mais recente primeiro (o resto fica em Ganhos)
    const feitos = todos.filter((p) => p.status === 'prova_enviada' && p.data >= somarDias(hoje, -7)).reverse()
    const cta = umCoral()
    const lista = (l, o) => `<div class="list pst-list">${l.map((p) => cardPedido(p, cta, o)).join('')}</div>`

    ctx.el.innerHTML = `<div class="wrap pst-raiz">
      <h1 class="pst-titulo">Seus pedidos</h1>
      ${faixaNota(perfil)}
      <h2 class="sec pst-sec">Novos${novos.length ? ` <span class="pst-qt">${novos.length}</span>` : ''}</h2>
      ${novos.length ? `<p class="sub pst-apoio">Você tem até 1h depois que o pedido chega para confirmar. Depois disso ele sai da sua agenda e o cliente escolhe outro profissional. O preço é da Seazone e não inclui nenhuma peça.</p>${lista(novos)}` : `<div class="card">${vazio({ icone: 'inbox', titulo: 'Nenhum pedido novo', texto: 'Quando alguém escolher você, o pedido aparece aqui e no aviso do sino.' })}</div>`}

      <h2 class="sec pst-sec">Hoje</h2>
      ${deHoje.length ? lista(deHoje) : '<p class="sub">Nenhuma visita hoje.</p>'}

      <h2 class="sec pst-sec">Próximos</h2>
      ${proximos.length ? lista(proximos) : '<p class="sub">Nada agendado para os próximos dias.</p>'}

      ${feitos.length ? `<h2 class="sec pst-sec">Concluídos</h2>${lista(feitos)}` : ''}

      ${recusados.length ? `<h2 class="sec pst-sec">Recusados ou expirados</h2><div class="list pst-list">${recusados.map(cardRecusado).join('')}</div>` : ''}
    </div>`
    icones()
    ligarAcoes(ctx)
    ligarPrazos(ctx)
  } catch (e) { ctx.el.innerHTML = `<div class="wrap">${vazio({ icone: 'cloud-off', titulo: 'Não deu pra carregar seus pedidos', texto: 'Confira a internet e tente de novo.' })}</div>`; icones(); falha(e) }
}

function passos(p) {
  const at = p.status === 'confirmado' ? (presencaConfirmada.has(p.id) ? 1 : 0)
    : { em_execucao: 2, prova_enviada: 4, concluido: 4 }[p.status] ?? 0
  const nomes = ['Presença', 'Chegada', 'Fotos', 'Concluir']
  return `<ol class="pst-passos">${nomes.map((n, i) => `<li class="${i < at ? 'ok' : i === at ? 'at' : ''}"><span class="pst-bola">${i < at ? ic('check') : i + 1}</span>${n}</li>`).join('')}</ol>`
}

function gradeFotos(fotos) {
  if (!fotos.length) return '<p class="sub">Nenhuma foto ainda.</p>'
  return `<div class="fotos">${fotos.map((f) => `<div class="ft">${img(f.storage_path, '', `Foto ${ROTULO_FOTO[f.tipo] || f.tipo}`)}<span class="lbl">${esc(ROTULO_FOTO[f.tipo] || f.tipo)}</span></div>`).join('')}</div>`
}

function blocoServico(p) {
  const sv = p.servico
  return `<section class="card pst-servico">
    <h3>O serviço</h3>
    <p class="note">${esc(sv.descricao)}</p>
    <div class="meta"><span>${ic('clock')}Duração ${esc(fmtDuracao(sv))}</span><span>${ic('calendar-check')}${p.janelas} ${p.janelas > 1 ? 'janelas' : 'janela'} de 1h</span></div>
    <div class="pst-listas">
      <div><h4>Inclui</h4><ul class="pst-ul">${(sv.inclui || []).map((x) => `<li class="sim">${ic('check')}<span>${esc(x)}</span></li>`).join('')}</ul></div>
      <div><h4>Não inclui</h4><ul class="pst-ul">${(sv.nao_inclui || []).map((x) => `<li class="nao">${ic('x')}<span>${esc(x)}</span></li>`).join('')}</ul></div>
    </div>
    ${linhaMaterial(sv)}
  </section>`
}

function rodapeCta({ titulo, apoio, botao, id, pedido, desabilitado = false }) {
  $('#rodape').innerHTML = `<div class="cartbar"><div class="in"><div class="tt"><b class="tn">${titulo}</b><span>${apoio}</span></div><button type="button" class="btn cta" id="${id}" data-concluir="${esc(pedido)}" ${desabilitado ? 'disabled' : ''}>${botao}</button></div></div>`
  document.body.classList.add('hascart')
}

async function telaPedido(ctx) {
  ctx.el.innerHTML = `${cabecalhoPasso('Pedido', { voltar: BASE })}<div class="wrap">${carregando(2)}</div>`
  let p
  try { p = await api.obterPedido(ctx.param) } catch (e) { p = null; falha(e) }
  if (!p || p.prestador_id !== ctx.sessao.prestador_id || p.status === 'aguardando_aprovacao') {
    ctx.el.innerHTML = `${cabecalhoPasso('Pedido', { voltar: BASE })}<div class="wrap">${vazio({ icone: 'search-x', titulo: 'Pedido não encontrado', texto: 'Ele pode ter sido cancelado ou passado para outro profissional.', acao: `<a class="btn cta mt16" href="${BASE}">Ver seus pedidos</a>` })}</div>`
    icones(); return
  }

  // checklist, item extra (material) e NF (T624, prestador-extras.js); se falhar, a tela segue sem esses blocos
  const x = await api.extrasDoPedido(p).catch((e) => { console.warn(e); return { checklist: [], materiais: [], nf: null } })
  const matAprovado = totalMateriaisAprovados(x)
  // WhatsApp de quem contratou: do aceite até o fim da garantia (REGRA de 17/11)
  const contato = await carregarContato(p)
  const depois = temFoto(p, 'depois')
  // em execução o coral é o "Concluir" do rodapé; nos outros passos, o 1º botão do corpo
  const cta = p.status === 'em_execucao' ? () => 'pri' : umCoral()
  let corpo = ''

  if (p.status === 'aguardando_prestador') {
    corpo = `<div class="info pst-info">${ic('info')}<span>Esse pedido está esperando sua resposta. O endereço aparece depois que você confirmar.</span></div>
      ${chipPrazo(p)}
      ${acoes(p, cta, { ids: true })}`
  } else if (p.status === 'confirmado') {
    corpo = `<section class="pst-bloco">
      <h3>Como entrar</h3>
      <div class="pst-onde-d">${ic('map-pin')}<span>${ondeFica(p)}</span></div>
      <div class="pst-onde-d">${ic('key-round')}<span>Código de acesso aparece aqui na hora da visita.</span></div>
    </section>
    <section class="pst-bloco">
      <h3>${presencaConfirmada.has(p.id) ? 'No dia' : 'Um dia antes'}</h3>
      <p class="note">${presencaConfirmada.has(p.id) ? 'Toque em "Cheguei" assim que entrar. O cliente e a operação recebem o aviso na hora.' : 'Confirme sua presença para o cliente saber que você vai.'}</p>
      ${acoes(p, cta, { ids: true })}
    </section>
    ${blocoChecklist(p, x)}${blocoMaterial(p, x)}`
  } else if (p.status === 'em_execucao') {
    corpo = `<section class="pst-bloco">
      <h3>Fotos do serviço</h3>
      <p class="note">Tire a foto do antes ao começar e a do depois quando terminar. É a sua prova de que ficou pronto.</p>
      <div class="mt8">${gradeFotos(p.fotos.filter((f) => f.tipo !== 'material'))}</div>
      <div class="mt8">${acoes(p, cta, { ids: true })}</div>
    </section>
    ${blocoChecklist(p, x)}
    ${blocoMaterial(p, x)}
    <div class="mline">${ic('file-text')}<span><b>Sem NF não há pagamento.</b> Ao concluir, você envia a NF do serviço (valor ${brl(api.valorEsperadoNF(p))}) e confirma seus dados de pagamento.</span></div>`
    rodapeCta({
      titulo: `Você recebe ${brl(p.liquido_cents)}`,
      apoio: depois ? 'Tudo pronto para concluir' : 'Mande a foto do depois para concluir',
      botao: `${ic('circle-check')}Concluir`, id: 'pst-concluir', pedido: p.id, desabilitado: !depois,
    })
  } else if (FEITOS.includes(p.status)) {
    const av = p.avaliacao
    corpo = `${p.status === 'prova_enviada' ? `<div class="info pst-info">${ic('info')}<span>Fotos enviadas. ${TXT_AGUARDANDO}</span></div>` : ''}
      ${blocoPagamento(p, matAprovado)}
      ${matAprovado ? `<div class="mline">${ic('package')}<span>Mais <b class="tn">${brl(matAprovado)}</b> de item extra aprovado, reembolsado junto.</span></div>` : ''}
      ${x.nf?.url ? `<p class="note">${ic('file-check', 'i14')} <a href="${esc(x.nf.url)}" target="_blank" rel="noopener">Abrir a NF enviada</a></p>` : ''}
      ${blocoMaterial(p, x)}
      <section class="pst-bloco"><h3>Suas fotos</h3><div class="mt8">${gradeFotos(p.fotos)}</div></section>
      ${av ? `<section class="pst-bloco"><h3>Avaliação do cliente</h3><div class="pst-estrelas" aria-label="Nota ${esc(av.nota)} de 5">${[1, 2, 3, 4, 5].map((n) => ic('star', n <= av.nota ? 'star' : 'star pst-star-off')).join('')}</div>${av.comentario ? `<p class="note mt8">${esc(av.comentario)}</p>` : ''}</section>` : ''}`
  } else if (p.status === 'recusado_prestador') {
    const exp = p.recusa_tipo === 'expirou'
    corpo = `<div class="info pst-info">${ic('info')}<span>${exp ? 'Passou 1h sem confirmação e o pedido saiu da sua agenda.' : 'Você recusou esse pedido.'} O cliente pode escolher outro profissional. Isso tirou <b class="tn">${esc(nota1(exp ? api.PENALIDADE.expirou : api.PENALIDADE.recusou))}</b> da sua nota.</span></div>`
  } else {
    corpo = `<div class="info pst-info">${ic('info')}<span>Esse pedido não está mais com você.</span></div>`
  }

  ctx.el.innerHTML = `${cabecalhoPasso(p.servico.nome, { voltar: BASE })}
  <article class="wrap gap16 pst-exec" aria-label="${ped(p)} · ${esc(p.servico.nome)}">
    <section class="pst-hero">
      <div class="pst-hero-hd"><span class="cap tn">Pedido ${ped(p)}</span>${badgePrestador(p)}</div>
      <b class="pst-quando tn">${quando(p)}</b>
      <div class="pst-onde">${ic('map-pin')}<span>${ondeFica(p)}</span></div>
      <div class="pst-onde">${ic('wallet')}<span>Você recebe <b class="tn">${brl(p.liquido_cents)}</b></span></div>
    </section>
    ${['confirmado', 'em_execucao', ...FEITOS].includes(p.status) ? passos(p) : ''}
    ${p.aviso_reserva && !FEITOS.includes(p.status) ? avisoHospedePrestador() : ''}
    ${p.observacao ? `<div class="pst-obs">${ic('message-circle')}<div><span class="cap">O cliente escreveu</span><p>${esc(p.observacao)}</p></div></div>` : ''}
    ${corpo}
    ${blocoContato(contato)}
    ${blocoRecebe(p)}
    ${blocoServico(p)}
    <section class="pst-bloco"><h3>Andamento</h3>${linhaDoTempo(p)}</section>
  </article>`
  icones()
  ligarAcoes(ctx)
  ligarPrazos(ctx)
  ligarExtras(ctx, p, x)
  // o botão do rodapé fica fora de ctx.el
  const concluir = $('#pst-concluir')
  if (concluir) concluir.addEventListener('click', async () => {
    concluir.disabled = true
    try { await sheetNF(ctx, p, { concluir: true }) } catch (e) { falha(e) }
    concluir.disabled = false
  })
}

async function telaAgenda(ctx) {
  ctx.el.innerHTML = `<div class="wrap">${carregando(3)}</div>`
  let visitas
  try { visitas = await api.listarPedidos({ status: AGENDADOS }) } catch (e) { ctx.el.innerHTML = `<div class="wrap">${vazio({ icone: 'cloud-off', titulo: 'Não deu pra carregar sua agenda' })}</div>`; icones(); falha(e); return }
  const hoje = isoDia(0); const fim = somarDias(hoje, 13)
  const marcados = new Set(visitas.map((p) => p.data))
  const janela = visitas.filter((p) => p.data <= fim)
  const porDia = new Map()
  for (const p of janela) { const d = p.data < hoje ? hoje : p.data; if (!porDia.has(d)) porDia.set(d, []); porDia.get(d).push(p) }

  const h = paraData(hoje)
  let mes = new Date(h.getFullYear(), h.getMonth(), 1)
  let selecionado = ''
  const cta = umCoral()

  ctx.el.innerHTML = `<div class="wrap">
    <section class="card mt8" id="pst-cal"></section>
    <h2 class="sec pst-sec">Próximos 14 dias</h2>
    ${porDia.size ? [...porDia.keys()].sort().map((d) => `<section class="pst-dia" id="pst-d-${d}">
        <h3 class="pst-dia-t"><span>${esc(fmtDiaRel(d))}</span>${d === hoje || d === somarDias(hoje, 1) ? `<span class="cap">${esc(fmtDia(d))}</span>` : ''}<span class="cap pst-dia-n">${porDia.get(d).length} ${porDia.get(d).length > 1 ? 'visitas' : 'visita'}</span></h3>
        <div class="list">${porDia.get(d).map((p) => cardPedido(p, cta, { mostrarDia: false })).join('')}</div>
      </section>`).join('') : vazio({ icone: 'calendar-x', titulo: 'Nenhuma visita confirmada', texto: 'Aceite pedidos novos e eles aparecem aqui.', acao: `<a class="btn cta mt16" href="${BASE}">Ver seus pedidos</a>` })}
  </div>`

  const desenharCal = () => {
    const box = $('#pst-cal', ctx.el)
    const o = {
      mes, reservas: [], marcados, disponiveis: null, selecionado,
      aoEscolher: (iso) => {
        selecionado = iso; desenharCal()
        const alvo = document.getElementById(`pst-d-${iso}`)
        if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' })
        else toast(marcados.has(iso) ? `Visita em ${fmtDia(iso)}, fora dos próximos 14 dias.` : 'Nenhuma visita nesse dia.')
      },
      aoMudarMes: (d) => { mes = new Date(mes.getFullYear(), mes.getMonth() + d, 1); desenharCal() },
    }
    box.innerHTML = calendario(o)
    ligarCalendario(box, o)
    icones()
  }
  desenharCal()
  icones()
  ligarAcoes(ctx)
}

async function telaGanhos(ctx) {
  ctx.el.innerHTML = `<div class="wrap">${carregando(3)}</div>`
  let lista
  try { lista = await api.listarPedidos({ status: [...FEITOS, ...AGENDADOS] }) } catch (e) { ctx.el.innerHTML = `<div class="wrap">${vazio({ icone: 'cloud-off', titulo: 'Não deu pra carregar seus ganhos' })}</div>`; icones(); falha(e); return }
  const feitos = lista.filter((p) => FEITOS.includes(p.status)).sort((a, b) => (b.data + b.janela_inicio).localeCompare(a.data + a.janela_inicio))
  // item extra (material) aprovado (T624) é reembolsado junto com o serviço
  const mat = new Map(await Promise.all(feitos.map(async (p) => [p.id, totalMateriaisAprovados(await api.extrasDoPedido(p).catch(() => ({ materiais: [] })))])))
  const valor = (p) => p.liquido_cents + (mat.get(p.id) || 0)
  const soma = (l) => l.reduce((t, p) => t + valor(p), 0)
  const sit = new Map(feitos.map((p) => [p.id, api.situacaoPagamento(p)]))
  const total = soma(feitos)
  const bloqueados = feitos.filter((p) => sit.get(p.id).bloqueado)
  const aReceber = soma(feitos.filter((p) => !sit.get(p.id).bloqueado && sit.get(p.id).chave !== 'pago'))
  const bloq = soma(bloqueados)
  const previsto = lista.filter((p) => AGENDADOS.includes(p.status)).reduce((t, p) => t + p.liquido_cents, 0)
  const totalMat = [...mat.values()].reduce((t, v) => t + v, 0)
  const recebido = soma(feitos.filter((p) => sit.get(p.id).chave === 'pago'))
  const taxa = feitos.reduce((t, p) => t + (p.taxa_cents || 0), 0)
  // por mês (do dia do serviço), mais recente primeiro
  const porMes = new Map()
  for (const p of feitos) { const k = p.data.slice(0, 7); if (!porMes.has(k)) porMes.set(k, []); porMes.get(k).push(p) }
  const nomeMes = (k) => { const d = paraData(`${k}-01`); const m = MESES[d.getMonth()]; return `${m.charAt(0).toUpperCase()}${m.slice(1)} de ${d.getFullYear()}` }
  const linha = (p) => {
    const s = sit.get(p.id)
    return `<article class="pst-g-item${s.bloqueado ? ' bloq' : ''}" aria-label="${ped(p)} · ${esc(p.servico.nome)}" data-situacao="${s.chave}"><a class="pst-gl" href="${BASE}/pedido/${encodeURIComponent(p.id)}">
          <div class="pst-meio"><b>${esc(p.servico.nome)}</b><div class="cap"><span class="tn">${ped(p)}</span> · ${esc(fmtDia(p.data))} · ${esc(p.imovel.nome)}</div>
            <div class="cap tn">Preço ${brl(p.preco_cents)} − comissão ${brl(p.taxa_cents)}${mat.get(p.id) ? ` + item extra ${brl(mat.get(p.id))}` : ''}</div></div>
          <div class="pst-gv"><b class="tn">${brl(valor(p))}</b><span class="badge b-${s.tom}">${esc(s.rotulo)}</span></div>
        </a>${s.bloqueado ? `<div class="pst-g-bloq"><span class="cap">${ic('lock')}Bloqueado até enviar a NF</span><button type="button" class="btn pri sm" data-enviar-nf="${esc(p.id)}">${ic('file-up')}Enviar NF</button></div>` : ''}</article>`
  }

  ctx.el.innerHTML = `<div class="wrap gap16 mt8">
    <div class="kpis pst-kpis">
      <div class="card kpi"><b class="tn">${brl(total)}</b><span>Ganho nos serviços feitos${totalMat ? ` (inclui ${brl(totalMat)} de item extra)` : ''}</span></div>
      <div class="card kpi"><b class="tn">${brl(aReceber)}</b><span>A receber</span></div>
      <div class="card kpi"><b class="tn">${brl(recebido)}</b><span>Já recebido</span></div>
      ${bloq ? `<div class="card kpi bloq" id="pst-kpi-bloq"><b class="tn">${brl(bloq)}</b><span>Bloqueado: falta NF em ${bloqueados.length} ${bloqueados.length > 1 ? 'serviços' : 'serviço'}</span></div>` : ''}
    </div>
    ${bloq ? `<div class="warnbox" role="status">${ic('lock')}<span><b>Sem NF não há pagamento.</b> Envie a NF dos serviços marcados com o cadeado para liberar ${brl(bloq)}.</span></div>` : ''}
    <p class="sub">${taxa ? `Comissão fixa ConcertAI já descontada: <b class="tn">${brl(taxa)}</b>.` : ''}${previsto ? ` ${ic('calendar-check', 'i14')} Mais <b class="tn">${brl(previsto)}</b> nas visitas já agendadas.` : ''}</p>
    <section>
      <h2 class="sec pst-sec">Serviços feitos</h2>
      ${feitos.length ? [...porMes].map(([k, l]) => `<h3 class="pst-mes"><span>${esc(nomeMes(k))}</span><b class="tn">${brl(soma(l))}</b></h3>
        <div class="card pst-ganhos">${l.map((p, i) => `${i ? '<div class="divider"></div>' : ''}${linha(p)}`).join('')}</div>`).join('') : `<div class="card">${vazio({ icone: 'wallet', titulo: 'Nenhum serviço concluído ainda', texto: 'Quando você concluir um serviço com fotos, o valor aparece aqui.' })}</div>`}
    </section>
    <div class="mline">${ic('file-text')}<span>Para receber, emita a NF de serviço no CNPJ da sua empresa, no valor do serviço, e confirme seus dados de pagamento. Conferimos a NF e o Pix cai em até 1 dia útil. <a href="${BASE}/perfil?sec=pagamento">Dados de pagamento</a></span></div>
  </div>`
  icones()
  ligarEnviarNF(ctx)
}

export const rotas = {
  '': telaPedidos,
  pedido: telaPedido,
  agenda: telaAgenda,
  ganhos: telaGanhos,
  garantia: telaGarantia,
  ...rotasPerfil,
}
