// ConcertAI · telas do PROPRIETÁRIO (Carla Mendes na demo).
// Rotas: '' (início), 'contratar' (fluxo compartilhado), 'pedidos', 'pedido/<id>', 'aprovacoes', 'imoveis', 'perfil'.
// Dados só via api.js. Visual: docs/direcao-visual.md (1 CTA coral por tela, Lucide, sem emoji).
import * as api from '../api.js?v=79617c8'
import {
  $, $$, esc, ic, icones, brl, fmtDia, fmtDiaRel, fmtJanela, img, avatar, estrela,
  avisoMaterial, linhaDoTempo, vazio, carregando, abrirSheet, toast, falha,
  calendario, ligarCalendario, cardPedido, isoDia, somarDias, paraData, MESES,
} from '../ui.js?v=79617c8'
import { carregarContato, blocoContato } from './contato-whatsapp.js?v=79617c8'
import { blocoMateriaisComprador, ligarMateriaisComprador } from './prestador-extras.js?v=79617c8'
import { fluxoContratar, proximoDiaLivre, duracaoFaixa, avisoPeca, blocoConfirmacao, ligarTroca, linhaCalendario } from './contratar.js?v=79617c8'
import { seletorImovel, ligarSeletorImovel } from './seletor-imovel.js?v=79617c8'
import { formImovelAvulso } from './imovel-avulso.js?v=79617c8'

const BASE = '#/proprietario'
const PAPEL = 'proprietario'
const ATIVOS = ['aguardando_aprovacao', 'aguardando_prestador', 'confirmado', 'em_execucao', 'prova_enviada']
const CANCELAVEIS = ['aguardando_prestador', 'confirmado']
const VITRINE = ['EL-01', 'HI-02', 'AR-01', 'HI-04', 'MA-01', 'EL-03'] // 6 do Lote 1, uma mistura de categorias

export const abas = [
  { id: '', rotulo: 'Início', icone: 'home' },
  { id: 'pedidos', rotulo: 'Pedidos', icone: 'clipboard-list', ativas: ['pedido', 'extrato'] },
  { id: 'aprovacoes', rotulo: 'Aprovações', icone: 'circle-check-big' },
  { id: 'imoveis', rotulo: 'Imóveis', icone: 'building-2' },
  { id: 'perfil', rotulo: 'Perfil', icone: 'user-round' },
]

/** Preenche o contador da aba Aprovações com as pendentes (chamado pela casca depois de desenhar o topo). */
export async function contadores(topoEl) {
  const n = (await pendentes()).length
  const aba = topoEl.querySelector(`a.tab[href="${BASE}/aprovacoes"]`)
  if (!aba) return
  let ct = aba.querySelector('.ct')
  if (!n) { ct && ct.remove(); return }
  if (!ct) { ct = document.createElement('span'); ct.className = 'ct'; aba.appendChild(ct) }
  ct.textContent = String(n)
  aba.setAttribute('aria-label', `Aprovações, ${n} pendente${n > 1 ? 's' : ''}`)
}

async function pendentes() {
  const l = await api.listarPedidos({ status: ['aguardando_aprovacao'] })
  return l.filter((p) => p.comprador_papel === 'franquia')
}

// ---------- helpers locais ----------
const mesCurto = (iso) => MESES[paraData(iso).getMonth()].slice(0, 3)
const diaNum = (iso) => String(paraData(iso).getDate()).padStart(2, '0')
/** "22–26/nov" ou "29/nov–03/dez" */
function fmtIntervalo(a, b) {
  return mesCurto(a) === mesCurto(b) ? `${diaNum(a)}–${diaNum(b)}/${mesCurto(b)}` : `${diaNum(a)}/${mesCurto(a)}–${diaNum(b)}/${mesCurto(b)}`
}
/** "hoje, 14h" a partir de um ISO datetime */
function fmtPrazo(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `${fmtDiaRel(dia)}, ${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`
}
const contratarHref = (q) => `${BASE}/contratar?${new URLSearchParams(Object.entries(q).filter(([, v]) => v != null && v !== '')).toString()}`
function rodape(html) {
  document.querySelector('#rodape').innerHTML = `<div class="cartbar"><div class="in">${html}</div></div>`
  document.body.classList.add('hascart')
  icones()
}
function limparRodape() { document.querySelector('#rodape').innerHTML = ''; document.body.classList.remove('hascart') }
const cabecalho = (titulo, sub = '') => `<div class="prop-cab"><h1>${esc(titulo)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>`

/** Sheet de confirmação. Resolve true/false. */
function confirmar({ titulo, texto, ok, perigo = false, comMotivo = false }) {
  return new Promise((resolve) => {
    let feito = false
    const s = abrirSheet(`<h2>${esc(titulo)}</h2><p class="sub mt8">${esc(texto)}</p>
      ${comMotivo ? '<label class="prop-lbl mt16" for="prop-motivo">Motivo (opcional)</label><textarea id="prop-motivo" rows="3" maxlength="300" placeholder="Conte o que mudou"></textarea>' : ''}
      <div class="prop-acoes mt24"><button type="button" class="btn out" data-r="0">Voltar</button><button type="button" class="btn ${perigo ? 'prop-perigo' : 'pri'}" data-r="1">${esc(ok)}</button></div>`,
    { aoFechar: () => { if (!feito) resolve(false) } })
    s.el.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', () => {
      feito = true
      const motivo = comMotivo ? s.el.querySelector('#prop-motivo').value.trim() : ''
      s.fechar()
      resolve(b.dataset.r === '1' ? { motivo } : false)
    }))
  })
}

async function decidir(p, decisao, ctx) {
  if (decisao === 'recusado') {
    const ok = await confirmar({ titulo: 'Recusar este pedido?', texto: `A franquia é avisada e "${p.servico.nome}" não é agendado. Você não paga nada.`, ok: 'Recusar', perigo: true })
    if (!ok) return
  }
  try {
    await api.decidirAprovacao({ pedido_id: p.id, decisao })
    toast(decisao === 'aprovado' ? 'Aprovado. Avisamos a franquia e o profissional.' : 'Recusado. A franquia foi avisada.')
    ctx.recarregar()
  } catch (e) { falha(e) }
}

// =====================================================================
// INÍCIO
// =====================================================================
async function inicio(ctx) {
  ctx.el.innerHTML = `<div class="wrap mt16">${carregando(3)}</div>`
  try {
    // mesma lista do fluxo de contratar (na demo: os seus e depois os da Seazone), escolhida no dropdown do topo
    const [imoveis, todasCategorias, servicos, pedidos] = await Promise.all([api.imoveisDoComprador(), api.listarCategorias(), api.listarServicos({ lote: 1 }), api.listarPedidos()])
    // o catálogo tem 20 categorias (CZT-018), mas só mostra as que têm serviço à venda
    const categorias = todasCategorias.filter((c) => servicos.some((s) => s.categoria_codigo === c.codigo))
    if (!imoveis.length) { ctx.el.innerHTML = `<div class="wrap">${vazio({ icone: 'home', titulo: 'Meus imóveis', texto: 'Não achamos imóveis no seu nome. Se isso estiver errado, fale com a gente pela SIA.' })}</div>`; icones(); return }
    const idx = Math.max(0, imoveis.findIndex((i) => i.id === ctx.query.imovel))
    const im = imoveis[idx]
    const hoje = isoDia(0)
    const reservas = (await api.listarReservas({ imovel_id: im.id, de: hoje, ate: somarDias(hoje, 180) }).catch(() => [])).slice().sort((a, b) => a.check_in.localeCompare(b.check_in))
    const atual = reservas.find((r) => r.check_in <= hoje && r.check_out >= hoje)
    const seguinte = reservas.find((r) => r.check_in > hoje)
    const linhaReserva = atual
      ? `Hóspede no ${im.nome} até ${diaNum(atual.check_out)}/${mesCurto(atual.check_out)} · você pode marcar mesmo assim`
      : seguinte ? `Próxima reserva no ${im.nome}: ${fmtIntervalo(seguinte.check_in, seguinte.check_out)}`
        : `Sem reservas nos próximos dias no ${im.nome}`
    const aprov = pedidos.filter((p) => p.status === 'aguardando_aprovacao' && p.comprador_papel === 'franquia')
    const visitas = pedidos.filter((p) => ATIVOS.includes(p.status) && p.status !== 'aguardando_aprovacao').slice(0, 3)
    const porCodigo = Object.fromEntries(servicos.map((s) => [s.codigo, s]))
    const vitrine = [...VITRINE.map((c) => porCodigo[c]).filter(Boolean), ...servicos.filter((s) => !VITRINE.includes(s.codigo))].slice(0, 6)
    const precos = servicos.map((s) => s.preco_cents)

    ctx.el.innerHTML = `
      <section class="hero prop-hero">
        ${im.foto_url ? `<img class="bgimg" src="${esc(im.foto_url)}" alt="" onerror="this.remove()">` : ''}
        <div class="in">
          ${seletorImovel({ imoveis, atual: im.id, rotulo: 'Seu imóvel', escuro: true, cadastrar: `${BASE}/imovel-fora` })}
          <h1>O que precisa de conserto?</h1>
          <form class="search" role="search" id="prop-busca">${ic('search')}<input type="search" name="q" placeholder="Ex.: chuveiro não esquenta" aria-label="Buscar serviço no ${esc(im.nome)}" autocomplete="off" enterkeyhint="search"></form>
          <p class="nx">${ic('bed-double', 'i14')}<span>${esc(linhaReserva)}</span></p>
          <div class="prop-hero-ac">
            <a class="btn cta" href="${contratarHref({ imovel: im.id })}" aria-label="Ver serviços do ${esc(im.nome)}">Ver serviços deste imóvel</a>
            <a class="prop-hero-como" href="#prop-como" id="prop-ir-como">Como funciona</a>
          </div>
        </div>
      </section>
      <div class="wrap">
        ${aprov.length ? `
          <a class="card prop-apr mt24" href="${BASE}/aprovacoes">
            <span class="prop-apr-ic">${ic('circle-alert')}</span>
            <span class="prop-apr-tx"><b>${aprov.length === 1 ? 'Um pedido para você aprovar' : `${aprov.length} pedidos para você aprovar`}</b>
              <span class="sub">${aprov.length === 1 ? `${esc(aprov[0].servico.nome)} · ${brl(aprov[0].preco_cents)} · ${esc(aprov[0].imovel.nome)}` : 'Acima de R$ 300, a franquia precisa da sua aprovação.'}</span>
              <span class="lnk mt8">Ver e decidir${ic('arrow-right', 'i14')}</span></span>
          </a>` : ''}

        <div class="prop-sech"><h2 class="sec">Os mais pedidos, já com preço</h2></div>
        <p class="sub">${categorias.map((c) => esc(c.nome)).join(' · ')}. ${servicos.length} serviços para começar, de ${brl(Math.min(...precos))} a ${brl(Math.max(...precos))}.</p>
        <div class="cats" role="list">
          ${categorias.map((c) => `<a class="cat" role="listitem" href="${contratarHref({ imovel: im.id, cat: c.codigo })}"><span class="ci">${ic(c.icone || 'wrench')}</span>${esc(c.nome)}</a>`).join('')}
          <a class="cat" role="listitem" href="${contratarHref({ imovel: im.id })}"><span class="ci">${ic('layout-grid')}</span>Todos</a>
        </div>
        <div class="list mt16">
          ${vitrine.map((s) => `<a class="card svc prop-svc" href="${contratarHref({ imovel: im.id, servico: s.codigo, etapa: 'data' })}">
            <div><div class="nm">${esc(s.nome)}</div><div class="ds">${esc(s.descricao)}</div>
              <div class="meta"><span>${ic('clock')}${esc(duracaoFaixa(s))}</span><span>${ic('shield-check')}90 dias de garantia</span><span>${ic('package')}Peças à parte</span></div>${avisoPeca(s)}</div>
            <div class="pr"><span class="ap">preço fechado</span><b>${brl(s.preco_cents)}</b><span class="prop-go">${ic('chevron-right')}</span></div>
          </a>`).join('')}
        </div>
        ${avisoMaterial(true)}

        <div class="prop-sech"><h2 class="sec">Próximas visitas</h2>${visitas.length ? `<a class="lnk" href="${BASE}/pedidos">Ver todas</a>` : ''}</div>
        ${visitas.length
          ? `<div class="list">${visitas.map((p) => cardPedido(p, { link: `${BASE}/pedido/${encodeURIComponent(p.id)}`, papel: PAPEL })).join('')}</div>`
          : `<div class="card prop-vazio-linha">${ic('calendar-check')}<span class="sub">Nenhuma visita marcada. Quando você ou a franquia contratarem, aparece aqui.</span></div>`}


        <h2 class="sec" id="prop-como">Como funciona</h2>
        <ol class="prop-passos">
          <li><i>1</i><div><b>Escolha o serviço.</b> Chuveiro sem esquentar, torneira pingando, porta arrastando: cada serviço tem preço, o que inclui e quanto tempo leva.</div></li>
          <li><i>2</i><div><b>Escolha quando e quem.</b> Marque o dia e o horário (com pelo menos 3h de antecedência) e veja só os profissionais livres nesse momento que atendem a região do imóvel, com nome, nota e quantos serviços já fizeram. Se tiver hóspede no dia, a gente avisa antes.</div></li>
          <li><i>3</i><div><b>Pronto, é com a gente.</b> O profissional confirma em até 1h (se não confirmar, você troca por outro), a franquia é avisada, você recebe as fotos do antes e depois e o serviço fica 90 dias na garantia.</div></li>
        </ol>

        <section class="prop-benef mt24" aria-labelledby="prop-porque">
          <h2 class="prop-benef-h" id="prop-porque">Por que usar</h2>
          <div>${ic('badge-check')}<b>Preço fechado.</b><span>Você sabe quanto vai pagar antes de confirmar. Sai do seu repasse, sem boleto novo.</span></div>
          <div>${ic('shield-check')}<b>Garantia de 90 dias.</b><span>Deu problema no que foi feito? O profissional volta sem custo.</span></div>
          <div>${ic('camera')}<b>Acompanhe pelo app.</b><span>Profissional avaliado, andamento do pedido e fotos do antes e depois.</span></div>
        </section>

        <h2 class="sec">Perguntas frequentes</h2>
        <div class="prop-faq">${FAQ.map(([pq, rs]) => `<details><summary>${esc(pq)}${ic('chevron-down', 'i14')}</summary><p>${esc(rs)}</p></details>`).join('')}</div>
        <p class="cap mt24 prop-rodape-tx">ConcertAI é um serviço da Seazone. · Ajuda pela SIA</p>
      </div>`
    icones()
    ligarSeletorImovel(ctx.el, { imoveis, atual: im.id, aoEscolher: (novo) => ctx.ir(`${BASE}?imovel=${encodeURIComponent(novo.id)}`) })
    $('#prop-busca', ctx.el).addEventListener('submit', (e) => {
      e.preventDefault()
      const q = new FormData(e.target).get('q').toString().trim()
      ctx.ir(contratarHref({ imovel: im.id, q }))
    })
    $('#prop-ir-como', ctx.el).addEventListener('click', (e) => { e.preventDefault(); $('#prop-como', ctx.el).scrollIntoView({ behavior: 'smooth' }) })
  } catch (e) { falha(e); ctx.el.innerHTML = vazio({ icone: 'wifi-off', titulo: 'Não deu para carregar', texto: 'Algo deu errado do nosso lado. Tente de novo em alguns minutos.' }) }
}

const FAQ = [
  ['Quem paga?', 'Sempre o proprietário do imóvel. O valor é lançado como despesa e descontado do próximo repasse, igual às manutenções de hoje.'],
  ['E o material?', 'Nenhuma peça está inclusa no preço: a troca de resistência, por exemplo, não inclui a resistência. Qualquer peça ou material é comprado à parte, e o profissional informa o valor antes para você aprovar.'],
  ['Com quanta antecedência posso pedir?', 'Pelo menos 3h antes do horário escolhido, para dar tempo de o profissional se organizar.'],
  ['E se o profissional não confirmar?', 'Ele tem até 1h para confirmar. Se recusar ou não responder, você escolhe outro profissional para o mesmo horário.'],
  ['Posso cancelar?', 'Pode, sem custo, até o profissional começar o serviço.'],
  ['E se tiver hóspede no dia?', 'A gente avisa quando você escolhe a data. Você decide: tem conserto que não pode esperar.'],
  ['E se o serviço der problema depois?', 'Ele fica 90 dias na garantia: o profissional volta sem custo. Se ele não puder, você escolhe outro.'],
  ['Como reclamo?', 'Pela SIA. Você recebe um número de protocolo e o prazo de resposta.'],
  ['A franquia pode contratar no meu imóvel?', 'Pode. Até R$ 300 você é avisado; acima disso, você aprova antes por um botão.'],
]

// =====================================================================
// PEDIDOS (lista) · aba "Pedidos" (3.8)
// =====================================================================
const FILTROS = [
  { id: 'ativos', rotulo: 'Ativos', ok: (p) => ATIVOS.includes(p.status) || api.podeTrocarPrestador(p) }, // recusado/expirado sem troca ainda pede ação
  { id: 'concluidos', rotulo: 'Concluídos', ok: (p) => p.status === 'concluido' },
  { id: 'todos', rotulo: 'Todos', ok: () => true },
]
const pendenteDeMim = (p) => p.status === 'aguardando_aprovacao' && p.comprador_papel === 'franquia' && p.aprovacao && p.aprovacao.decisao === 'pendente'
/** ações de aprovação dentro do <article> do pedido (lista e Aprovações) */
const acoesAprovacao = (p) => `<p class="cap prop-prazo">${ic('hourglass', 'i14')}Pedido da franquia aguardando aprovação${p.aprovacao.expira_em ? ` · responda até ${esc(fmtPrazo(p.aprovacao.expira_em))}` : ''}</p>
  <div class="ord-acoes"><button type="button" class="btn out" data-acao="recusado" data-id="${esc(p.id)}">Recusar</button><button type="button" class="btn pri" data-acao="aprovado" data-id="${esc(p.id)}">${ic('check')}Aprovar</button></div>`
function ligarAprovacoes(ctx, lista) {
  $$('[data-acao]', ctx.el).forEach((b) => b.addEventListener('click', () => {
    const p = lista.find((x) => x.id === b.dataset.id)
    if (p) decidir(p, b.dataset.acao, ctx)
  }))
}

async function pedidos(ctx) {
  const f = FILTROS.find((x) => x.id === ctx.query.f) || FILTROS[0]
  const titulo = cabecalho('Meus pedidos', 'Serviços dos seus imóveis, feitos por você ou pela franquia.')
  ctx.el.innerHTML = `${titulo}<div class="wrap">${carregando(3)}</div>`
  try {
    const [todos, matPend] = await Promise.all([api.listarPedidos(), api.listarMateriaisPendentes().catch(() => [])])
    const comPeca = new Set(matPend.map((m) => m.pedido_id))
    const lista = todos.filter(f.ok)
    if (f.id !== 'ativos') lista.reverse() // concluídos/todos: mais recente primeiro
    const n = Object.fromEntries(FILTROS.map((x) => [x.id, todos.filter(x.ok).length]))
    ctx.el.innerHTML = `${titulo}
      <div class="wrap">
        <div class="prop-chips" role="group" aria-label="Filtrar pedidos">
          ${FILTROS.map((x) => `<a class="prop-chip" href="${BASE}/pedidos?f=${x.id}" aria-pressed="${x.id === f.id}">${esc(x.rotulo)}<span class="tn">${n[x.id]}</span></a>`).join('')}
        </div>
        ${lista.length
          ? `<div class="list mt16">${lista.map((p) => cardPedido(p, {
              link: `${BASE}/pedido/${encodeURIComponent(p.id)}`,
              papel: PAPEL,
              extra: pendenteDeMim(p) ? acoesAprovacao(p) : comPeca.has(p.id) ? `<span class="cap prop-quem">${ic('package', 'i14')}Peça esperando sua aprovação: abra para ver</span>` : api.podeTrocarPrestador(p) ? `<span class="cap prop-quem">${ic('repeat', 'i14')}O profissional não pode ir: abra para trocar</span>` : p.comprador_papel === 'franquia' ? `<span class="cap prop-quem">${ic('building', 'i14')}Pedido pela franquia</span>` : '',
            })).join('')}</div>`
          : vazio({
              icone: f.id === 'concluidos' ? 'circle-check' : 'clipboard-list',
              titulo: f.id === 'concluidos' ? 'Nenhum serviço concluído ainda' : 'Nenhum pedido por aqui',
              texto: 'Contrate um serviço e acompanhe cada passo nesta tela.',
              acao: `<a class="btn pri mt8" href="${BASE}/contratar">${ic('plus')}Contratar serviço</a>`,
            })}
        <a class="lnk mt24 prop-centro" href="${BASE}/extrato">${ic('receipt', 'i14')}Ver extrato</a>
      </div>`
    icones()
    ligarAprovacoes(ctx, lista)
  } catch (e) { falha(e) }
}

// =====================================================================
// PEDIDO (detalhe)
// =====================================================================
const ddMm = (iso) => { const d = paraData(iso); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` }
const ROTULO_FOTO = { antes: 'Antes', depois: 'Depois', material: 'Material' }

async function pedido(ctx) {
  ctx.el.innerHTML = `<div class="wrap mt16">${carregando(2)}</div>`
  let p
  try { p = await api.obterPedido(ctx.param) } catch (e) {
    ctx.el.innerHTML = vazio({ icone: 'search-x', titulo: 'Pedido não encontrado', texto: 'Ele pode ter sido removido.', acao: `<a class="btn out mt8" href="${BASE}/pedidos">Voltar aos pedidos</a>` })
    icones(); return
  }
  // imóvel fora da Seazone (T807): pedido esperando pagamento abre o passo de pagamento
  if (p.status === 'aguardando_pagamento') { ctx.ir(`${BASE}/contratar?pedido=${encodeURIComponent(p.id)}`); return }
  const s = p.servico; const im = p.imovel; const pt = p.prestador
  const antes = p.fotos.filter((f) => f.tipo === 'antes'); const depois = p.fotos.filter((f) => f.tipo === 'depois'); const material = p.fotos.filter((f) => f.tipo === 'material')
  const fotos = [...antes, ...depois, ...material]
  const pendAprov = pendenteDeMim(p)
  const avaliar = p.status === 'concluido' && !p.avaliacao
  const garantiaAte = p.status === 'concluido' ? somarDias(p.data, 90) : ''
  // material pedido pelo profissional (T624): aprovar/recusar aqui
  const extras = await api.extrasDoPedido(p).catch(() => ({ materiais: [] }))
  // WhatsApp do profissional: só depois que ele confirma, até o fim da garantia (REGRA de 17/11)
  const contato = await carregarContato(p)

  ctx.el.innerHTML = `<article class="prop-ped">
    <div class="steph"><a class="back" href="${BASE}/pedidos" aria-label="Voltar">${ic('arrow-left')}</a><h1>Pedido PED-${esc(p.numero)}</h1></div>
    <div class="wrap gap16">
      <section class="prop-topo">
        <span class="prop-topo-et">${esc(api.rotuloStatus(p.status, PAPEL))}</span>
        <h2>${esc(s.nome)}</h2>
        <div class="prop-topo-pro">${avatar(pt.nome)}<div><b>${esc(pt.nome)}</b><span>${estrela()} ${String(pt.nota_media).replace('.', ',')} · ${pt.n_servicos} serviços</span></div></div>
        ${['confirmado', 'aguardando_prestador', 'em_execucao'].includes(p.status) ? `<p class="prop-topo-chega">Chega entre ${p.janela_inicio}h e ${p.janela_inicio + 1}h</p>` : ''}
        <div class="prop-topo-qd">${ic('calendar-check')}<span>${esc(fmtDiaRel(p.data))} · ${fmtJanela(p.janela_inicio, p.janelas)}</span></div>
      </section>

      ${p.aviso_reserva && ATIVOS.includes(p.status) ? `<div class="info">${ic('bed-double')}<span>Tem hóspede nesse dia. A franquia combina o acesso.</span></div>` : ''}

      ${pendAprov ? `<div class="info">${ic('user-check')}<div><b>A franquia quer contratar para o ${esc(im.nome)}.</b><br>Acima de R$ 300, a franquia precisa da sua aprovação. A data fica reservada por 48h${p.aprovacao.expira_em ? ` (responda até ${esc(fmtPrazo(p.aprovacao.expira_em))})` : ''}.</div></div>` : ''}

      ${blocoConfirmacao(p, PAPEL)}

      ${['recusado_proprietario', 'cancelado'].includes(p.status) || (p.status === 'recusado_prestador' && !api.podeTrocarPrestador(p) && !p.substituido_por) ? `<div class="mat">${ic('circle-x')}<div><b>${esc(api.rotuloStatus(p.status, PAPEL))}</b><p>${p.status === 'recusado_prestador' ? 'O profissional não pode ir nesse horário. Contrate de novo para ver outro profissional ou outra data. Nada foi cobrado.' : 'Nada foi cobrado.'}</p></div></div>` : p.status === 'recusado_prestador' ? '' : `<div class="card"><h3>Andamento</h3>${linhaDoTempo(p)}${garantiaAte ? `<p class="cap prop-prazo">${ic('shield-check', 'i14')}Na garantia até ${esc(ddMm(garantiaAte))}</p>` : ''}</div>`}

      ${blocoContato(contato)}

      <div class="card">
        <h3>Detalhes</h3>
        <div class="imgrow mt8">${img(im.foto_url, '', im.nome)}<div><b>${esc(im.nome)}</b><div class="cap">${esc(im.bairro)} · <span class="code">${esc(im.codigo)}</span></div></div></div>
        <div class="divider"></div>
        <p class="note mt8">${esc(s.descricao)}</p>
        <div class="meta"><span>${ic('clock')}${esc(duracaoFaixa(s))}</span><span>${ic('shield-check')}90 dias de garantia</span><span>${ic(p.comprador_papel === 'franquia' ? 'building' : 'user')}Pedido por ${p.comprador_papel === 'franquia' ? 'franquia' : 'você'}</span></div>
        ${p.observacao ? `<blockquote class="prop-quote mt16">${ic('message-circle', 'i14')}<span>${esc(p.observacao)}</span></blockquote>` : ''}
        <div class="sumrow tot"><span>Total</span><span class="tn">${brl(p.preco_cents)}</span></div>
        <p class="cap">${p.pagamento_status === 'descontado' ? 'Já descontado do seu repasse.' : 'O valor é descontado do seu próximo repasse.'}</p>
      </div>
      ${avisoPeca(s, 'ctr-peca-box')}
      ${avisoMaterial()}
      ${blocoMateriaisComprador(p, extras)}

      ${fotos.length ? `<div class="card"><h3>Antes e depois</h3><p class="sub">Toque para ampliar.</p><div class="fotos mt16">${fotos.map((f) => `<button type="button" class="ft" data-foto="${esc(f.storage_path)}" data-tipo="${esc(ROTULO_FOTO[f.tipo] || 'Foto')}" aria-label="Ver foto ${esc(ROTULO_FOTO[f.tipo] || '')}">${img(f.storage_path, '', ROTULO_FOTO[f.tipo] || 'Foto')}<span class="lbl">${esc(ROTULO_FOTO[f.tipo] || 'Foto')}</span></button>`).join('')}</div></div>` : ''}

      ${avaliar ? `<div class="card" id="prop-avaliar"><h3>Como foi o ${esc(s.nome)} no ${esc(im.nome)}?</h3>
          <div class="stars mt16" role="radiogroup" aria-label="Nota de 1 a 5">${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="false" data-nota="${n}" aria-label="${n} estrela${n > 1 ? 's' : ''}">${ic('star')}</button>`).join('')}</div>
          <label class="prop-lbl mt16" for="prop-coment">Quer contar mais? <span class="cap">(opcional)</span></label>
          <textarea id="prop-coment" rows="3" maxlength="500"></textarea></div>` : ''}
      ${p.avaliacao ? `<div class="card"><h3>Sua avaliação</h3><div class="prop-nota mt8">${[1, 2, 3, 4, 5].map((n) => `<span class="${n <= p.avaliacao.nota ? 'on' : ''}">${ic('star')}</span>`).join('')}</div>${p.avaliacao.comentario ? `<p class="note mt8">${esc(p.avaliacao.comentario)}</p>` : ''}</div>` : ''}

      ${['concluido', 'prova_enviada', 'em_execucao'].includes(p.status) ? `<button type="button" class="btn out w" id="prop-reclamar">${ic('message-circle')}Reclamar</button>` : ''}
      ${CANCELAVEIS.includes(p.status) ? `<button type="button" class="btn out w" id="prop-cancelar">${ic('x')}Cancelar pedido</button><p class="cap prop-centro">Cancele sem custo até o profissional começar o serviço.</p>` : ''}
    </div>
  </article>`
  icones()
  ligarMateriaisComprador(ctx)
  ligarTroca(ctx, p, PAPEL)

  // fotos ampliadas
  $$('[data-foto]', ctx.el).forEach((b) => b.addEventListener('click', () => {
    abrirSheet(`<h2>${esc(b.dataset.tipo)}</h2><div class="prop-fotog mt16">${img(b.dataset.foto, '', b.dataset.tipo)}</div><button type="button" class="btn out w mt16" data-fechar-sheet>Fechar</button>`)
  }))

  const br = $('#prop-reclamar', ctx.el)
  if (br) br.addEventListener('click', () => toast(`A reclamação é pela SIA: cite o pedido PED-${p.numero}. Você recebe protocolo e prazo.`))

  // cancelar
  const bc = $('#prop-cancelar', ctx.el)
  if (bc) bc.addEventListener('click', async () => {
    const r = await confirmar({ titulo: 'Cancelar este pedido?', texto: `${s.nome} em ${fmtDia(p.data)}, ${fmtJanela(p.janela_inicio, p.janelas)}. O profissional e a franquia são avisados. Não há cobrança.`, ok: 'Cancelar pedido', perigo: true, comMotivo: true })
    if (!r) return
    try { await api.cancelarPedido({ pedido_id: p.id, motivo: r.motivo || undefined }); toast('Pedido cancelado'); ctx.recarregar() } catch (e) { falha(e) }
  })

  // rodapé com a ação principal (1 CTA coral)
  if (pendAprov) {
    rodape(`<div class="tt"><b class="tn">${brl(p.preco_cents)}</b><span>Pedido da franquia</span></div>
      <button type="button" class="btn prop-out-esc" id="prop-recusar">Recusar</button><button type="button" class="btn cta" id="prop-aprovar">${ic('check')}Aprovar</button>`)
    $('#prop-aprovar').onclick = () => decidir(p, 'aprovado', ctx)
    $('#prop-recusar').onclick = () => decidir(p, 'recusado', ctx)
  } else if (p.status === 'prova_enviada') {
    rodape(`<div class="tt"><b>Ficou bom?</b><span>Confira as fotos antes de confirmar</span></div><button type="button" class="btn cta" id="prop-concluir">${ic('circle-check')}Confirmar conclusão</button>`)
    $('#prop-concluir').onclick = async () => {
      try { await api.avancarPedido({ pedido_id: p.id, para: 'concluido' }); toast('Serviço concluído. Obrigado!'); ctx.recarregar() } catch (e) { falha(e) }
    }
  } else if (avaliar) {
    let nota = 0
    rodape(`<div class="tt"><b>Avaliar ${esc(pt.nome)}</b><span>Escolha de 1 a 5 estrelas</span></div><button type="button" class="btn cta" id="prop-enviar" disabled>Enviar</button>`)
    const enviar = $('#prop-enviar')
    $$('[data-nota]', ctx.el).forEach((b) => b.addEventListener('click', () => {
      nota = Number(b.dataset.nota)
      $$('[data-nota]', ctx.el).forEach((x) => { const on = Number(x.dataset.nota) <= nota; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(Number(x.dataset.nota) === nota)) })
      enviar.disabled = false
    }))
    enviar.onclick = async () => {
      if (!nota) return
      enviar.disabled = true
      try { await api.avaliarPedido({ pedido_id: p.id, nota, comentario: $('#prop-coment', ctx.el).value.trim() }); toast('Avaliação enviada. Obrigado!'); ctx.recarregar() } catch (e) { enviar.disabled = false; falha(e) }
    }
  } else {
    limparRodape()
  }
}

// =====================================================================
// APROVAÇÕES (3.9)
// =====================================================================
async function aprovacoes(ctx) {
  const titulo = cabecalho('Pedidos para você aprovar', 'Acima de R$ 300, a franquia precisa da sua aprovação. A data fica reservada por 48h.')
  ctx.el.innerHTML = `${titulo}<div class="wrap">${carregando(2)}</div>`
  try {
    const l = (await pendentes()).filter(pendenteDeMim)
    if (!l.length) {
      ctx.el.innerHTML = `${titulo}<div class="wrap">${vazio({ icone: 'circle-check-big', titulo: 'Tudo em dia', texto: 'Nenhum pedido esperando a sua aprovação. A gente avisa quando a franquia pedir algo acima de R$ 300.', acao: `<a class="lnk mt8" href="${BASE}/pedidos">Ver meus pedidos${ic('arrow-right', 'i14')}</a>` })}</div>`
      icones(); return
    }
    ctx.el.innerHTML = `${titulo}
      <div class="wrap">
        <div class="list">${l.map((p, k) => `<article class="card prop-apcard" data-id="${esc(p.id)}">
          <p class="sub">A franquia quer contratar para o ${esc(p.imovel.nome)}: <span class="code">PED-${esc(p.numero)}</span></p>
          <div class="imgrow mt8">${img(p.imovel.foto_url, '', p.imovel.nome)}<div class="prop-min0"><b>${esc(p.servico.nome)}</b><div class="cap">${esc(p.imovel.nome)} · <span class="code">${esc(p.imovel.codigo)}</span></div></div></div>
          <div class="meta"><span>${ic('calendar-check')}${esc(fmtDiaRel(p.data))} · ${fmtJanela(p.janela_inicio, p.janelas)}</span><span>${ic('clock')}${esc(duracaoFaixa(p.servico))}</span><span>${ic('user')}${esc(p.prestador.nome)}</span>${p.aviso_reserva ? `<span>${ic('bed-double')}Tem hóspede</span>` : ''}</div>
          ${p.observacao ? `<blockquote class="prop-quote mt16">${ic('message-circle', 'i14')}<span><b>Franquia:</b> ${esc(p.observacao)}</span></blockquote>` : ''}
          <div class="sumrow tot"><span>Total</span><span class="tn">${brl(p.preco_cents)}</span></div>
          ${p.aprovacao && p.aprovacao.expira_em ? `<p class="cap prop-prazo">${ic('hourglass', 'i14')}A data fica reservada até ${esc(fmtPrazo(p.aprovacao.expira_em))}</p>` : ''}
          <div class="prop-acoes mt16"><button type="button" class="btn out" data-acao="recusado" data-id="${esc(p.id)}">Recusar</button><button type="button" class="btn ${k === 0 ? 'cta' : 'pri'}" data-acao="aprovado" data-id="${esc(p.id)}">${ic('check')}Aprovar</button></div>
          <a class="lnk prop-centro mt8" href="${BASE}/pedido/${encodeURIComponent(p.id)}">Ver detalhes</a>
        </article>`).join('')}</div>
        ${avisoMaterial(true)}
        <p class="cap mt16 prop-rodape-tx">${ic('wallet', 'i14')}Aprovando, o valor é descontado do seu repasse depois do serviço feito.</p>
      </div>`
    icones()
    ligarAprovacoes(ctx, l)
  } catch (e) { falha(e) }
}

// =====================================================================
// IMÓVEIS (3.1)
// =====================================================================
async function imoveis(ctx) {
  const titulo = cabecalho('Meus imóveis', 'Reservas e visitas de cada imóvel. Dia com hóspede não bloqueia a agenda.')
  ctx.el.innerHTML = `${titulo}<div class="wrap">${carregando(2)}</div>`
  try {
    const [lista, peds] = await Promise.all([api.listarImoveis(), api.listarPedidos()])
    if (!lista.length) { ctx.el.innerHTML = `${titulo}<div class="wrap">${vazio({ icone: 'home', titulo: 'Nenhum imóvel', texto: 'Não achamos imóveis no seu nome. Se isso estiver errado, fale com a gente pela SIA.' })}</div>`; icones(); return }
    const hoje = isoDia(0)
    const reservasDe = await Promise.all(lista.map((i) => api.listarReservas({ imovel_id: i.id, de: hoje, ate: somarDias(hoje, 180) }).catch(() => [])))
    const ativos = peds.filter((p) => ATIVOS.includes(p.status))
    ctx.el.innerHTML = `${titulo}<div class="wrap list prop-imvs">${lista.map((im, k) => {
      const vs = ativos.filter((p) => p.imovel_id === im.id)
      const livre = proximoDiaLivre(reservasDe[k])
      return `<article class="card prop-imv" data-imv="${esc(im.id)}">
        <div class="prop-imv-foto">${img(im.foto_url, '', im.nome)}</div>
        <div class="prop-imv-hd"><div><h3>${esc(im.nome)}</h3><div class="cap">${esc(im.bairro)} · ${esc(im.cidade)} · <span class="code">${esc(im.codigo)}</span></div>
          ${linhaCalendario(im)}
          <div class="cap mt8">Próximo dia livre: ${livre ? esc(fmtDiaRel(livre) === fmtDia(livre) ? fmtDia(livre) : `${fmtDiaRel(livre)} (${ddMm(livre)})`) : 'nenhum nos próximos meses'}</div></div>
          ${vs.length ? `<span class="vis">${vs.length} visita${vs.length > 1 ? 's' : ''}</span>` : ''}</div>
        <div class="prop-cal mt16" data-cal></div>
        ${vs.length ? `<div class="prop-visitas mt8">${vs.map((p) => `<a href="${BASE}/pedido/${encodeURIComponent(p.id)}">${ic('calendar-check', 'i14')}<span><b>${esc(fmtDiaRel(p.data))} · ${fmtJanela(p.janela_inicio, p.janelas)}</b> ${esc(p.servico.nome)}</span>${ic('chevron-right', 'i14')}</a>`).join('')}</div>` : '<p class="sub mt8">Nenhuma visita marcada.</p>'}
        <a class="btn pri w mt16" role="button" href="${contratarHref({ imovel: im.id })}" aria-label="Ver serviços do ${esc(im.nome)}">Ver serviços</a>
      </article>`
    }).join('')}</div>`
    icones()

    for (const im of lista) {
      const alvo = ctx.el.querySelector(`[data-imv="${CSS.escape(im.id)}"] [data-cal]`)
      const marcados = new Set(ativos.filter((p) => p.imovel_id === im.id).map((p) => p.data))
      let mes = (() => { const d = paraData(isoDia(0)); return new Date(d.getFullYear(), d.getMonth(), 1) })()
      const desenhar = async () => {
        const de = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}-01`
        const ate = somarDias(de, new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate() - 1)
        let reservas = []
        try { reservas = await api.listarReservas({ imovel_id: im.id, de, ate }) } catch (e) { falha(e) }
        const o = {
          mes, reservas, marcados,
          aoEscolher: (dia) => {
            const vs = ativos.filter((p) => p.imovel_id === im.id && p.data === dia)
            if (vs.length === 1) { ctx.ir(`${BASE}/pedido/${encodeURIComponent(vs[0].id)}`); return }
            ctx.ir(contratarHref({ imovel: im.id }))
          },
          aoMudarMes: (d) => { mes = new Date(mes.getFullYear(), mes.getMonth() + d, 1); desenhar() },
        }
        alvo.innerHTML = calendario(o)
        ligarCalendario(alvo, o)
        icones()
      }
      desenhar()
    }
  } catch (e) { falha(e) }
}

// =====================================================================
// EXTRATO (3.10)
// =====================================================================
async function extrato(ctx) {
  const titulo = cabecalho('Extrato', 'O que foi e o que vai ser descontado do seu repasse.')
  ctx.el.innerHTML = `${titulo}<div class="wrap">${carregando(3)}</div>`
  try {
    const l = (await api.listarPedidos()).filter((p) => ['concluido', 'prova_enviada', 'em_execucao', 'confirmado', 'aguardando_prestador'].includes(p.status)).reverse()
    ctx.el.innerHTML = `${titulo}<div class="wrap">${l.length ? `<div class="card prop-extrato">${l.map((p) => `<article class="prop-ext">
        <div class="prop-ext-l"><b>${esc(p.servico.nome)}</b>
          <span class="cap">${esc(fmtDia(p.data))} · ${esc(p.imovel.nome)} · <span class="code">PED-${esc(p.numero)}</span></span>
          <span class="cap">Pedido por ${p.comprador_papel === 'franquia' ? 'franquia' : 'você'} · ${p.pagamento_status === 'descontado' ? `descontado no repasse${p.repasse_mes ? ` de ${esc(p.repasse_mes)}` : ''}` : `previsto para o próximo repasse`}</span></div>
        <b class="tn">${brl(p.preco_cents)}</b>
      </article>`).join('')}</div>` : vazio({ icone: 'receipt', titulo: 'Nada no extrato ainda', texto: 'Os serviços contratados aparecem aqui com o repasse em que foram descontados.' })}</div>`
    icones()
  } catch (e) { falha(e) }
}

// =====================================================================
// PERFIL (REGRA 17/11): dados do proprietário, editáveis
// =====================================================================
const soDigitos = (t) => String(t || '').replace(/\D/g, '')
/** (48) 99999-0000 / (48) 3333-0000 */
function fmtTelefone(t) {
  const d = soDigitos(t)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return t || ''
}
/** 000.000.000-00 ou 00.000.000/0000-00 */
function fmtDocumento(t) {
  const d = soDigitos(t)
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  if (d.length === 14) return api.formatarCnpj(d)
  return t || ''
}
const CAMPO_ERRO = { nome_invalido: 'nome', email_invalido: 'email', telefone_invalido: 'telefone', documento_invalido: 'documento' }

async function perfil(ctx) {
  const titulo = cabecalho('Meu perfil', 'Seus dados de contato e de cobrança. A Seazone usa para falar com você sobre os serviços.')
  ctx.el.innerHTML = `${titulo}<div class="wrap">${carregando(2)}</div>`
  let pf
  try { pf = await api.perfilProprietario() } catch (e) { falha(e); ctx.el.innerHTML = `${titulo}<div class="wrap">${vazio({ icone: 'wifi-off', titulo: 'Não deu para carregar o perfil', texto: 'Algo deu errado do nosso lado. Tente de novo em alguns minutos.' })}</div>`; icones(); return }
  const campo = (id, rotulo, valor, { tipo = 'text', dica = '', auto = '', modo = '' } = {}) => `<div class="prf-campo">
      <label class="prop-lbl" for="prf-${id}">${esc(rotulo)}</label>
      <input id="prf-${id}" name="${id}" type="${tipo}" value="${esc(valor || '')}" ${auto ? `autocomplete="${auto}"` : ''} ${modo ? `inputmode="${modo}"` : ''} aria-describedby="prf-${id}-d">
      <p class="cap prf-dica" id="prf-${id}-d">${esc(dica)}</p>
    </div>`
  ctx.el.innerHTML = `${titulo}
    <div class="wrap prf">
      <section class="card prf-cartao">
        ${avatar(pf.nome, 'lg')}
        <div><b>${esc(pf.nome)}</b><div class="cap">${esc(pf.email || '')}</div>
          <div class="cap prf-ib">${ic('building-2', 'i14')}${pf.n_imoveis} imóve${pf.n_imoveis === 1 ? 'l' : 'is'} no seu nome${pf.atualizado_em ? ` · atualizado ${esc(fmtDiaRel(String(pf.atualizado_em).slice(0, 10)))}` : ''}</div></div>
      </section>
      <form class="card prf-form" id="prf-form" novalidate>
        <h2 class="ctr-h">Dados pessoais</h2>
        <div class="prf-grid">
          ${campo('nome', 'Nome completo', pf.nome, { auto: 'name' })}
          ${campo('email', 'E-mail', pf.email, { tipo: 'email', auto: 'email', dica: 'Recebe os avisos dos pedidos e das aprovações.' })}
          ${campo('telefone', 'Celular com DDD', fmtTelefone(pf.telefone), { tipo: 'tel', auto: 'tel', modo: 'tel', dica: 'Para o WhatsApp da SIA. Só números ou (48) 99999-0000.' })}
          ${campo('documento', 'CPF ou CNPJ', fmtDocumento(pf.documento), { modo: 'numeric', dica: 'De quem recebe o repasse. Usado no extrato.' })}
        </div>
        <button type="submit" class="btn cta prf-salvar" id="prf-salvar">Salvar alterações</button>
      </form>
      <div class="info">${ic('refresh-cw')}<span>Seus imóveis vêm do cadastro da Seazone e as reservas são sincronizadas com o calendário do ConcertAI. Imóvel faltando? Fale com a gente pela SIA.</span></div>
    </div>`
  icones()
  const form = $('#prf-form', ctx.el)
  const bt = $('#prf-salvar', ctx.el)
  const limparErros = () => $$('.prf-campo', form).forEach((c) => { c.classList.remove('erro'); c.querySelector('input').removeAttribute('aria-invalid') })
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    limparErros()
    const f = new FormData(form)
    const dados = { nome: String(f.get('nome') || '').trim(), email: String(f.get('email') || '').trim(), telefone: soDigitos(f.get('telefone')) || null, documento: soDigitos(f.get('documento')) || null }
    // confere o CPF/CNPJ aqui antes (o banco confere de novo)
    if (dados.documento && !api.documentoValido(dados.documento)) { marcarErro('documento', 'CPF ou CNPJ inválido.'); return }
    bt.disabled = true
    try {
      await api.salvarPerfilProprietario(dados)
      toast('Perfil salvo')
      ctx.recarregar()
    } catch (err) {
      bt.disabled = false
      if (err && CAMPO_ERRO[err.code]) marcarErro(CAMPO_ERRO[err.code], err.message)
      else falha(err)
    }
  })
  function marcarErro(id, msg) {
    const c = $(`#prf-${id}`, form).closest('.prf-campo')
    c.classList.add('erro')
    c.querySelector('input').setAttribute('aria-invalid', 'true')
    c.querySelector('.prf-dica').textContent = msg
    c.querySelector('input').focus()
  }
}

// =====================================================================
export const rotas = {
  '': inicio,
  contratar: (ctx) => fluxoContratar(ctx, { papel: 'proprietario', voltar: BASE }),
  'imovel-fora': (ctx) => formImovelAvulso(ctx.el, { voltar: BASE, titulo: 'Cadastrar imóvel fora da Seazone', sub: 'Imóvel que não é administrado pela Seazone. Os pedidos dele são pagos no ato (Pix ou cartão), não entram no repasse.', aoSalvar: (r) => ctx.ir(`${BASE}/contratar?imovel=${encodeURIComponent(r.imovel_id)}`) }),
  pedidos,
  pedido,
  aprovacoes,
  imoveis,
  extrato,
  perfil,
}
