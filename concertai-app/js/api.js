// ConcertAI · fachada de dados. As telas importam SÓ daqui.
//
// As duas fontes (dados-simulados.js e fonte-supabase.js) exportam as mesmas funções
// (contrato em docs/ui-contrato-dados.md). Nenhuma tela muda ao trocar.
// Fonte escolhida pela config pública (config.js gerado no build, scripts/build-front.sh, carregado
// como <script> antes dos módulos): com supabaseUrl + supabaseAnonKey = banco real (fonte-supabase.js,
// T623) e login real (auth.js, T621); sem config = demo simulada. `?demo=1` na URL força a demo.
if (!globalThis.CONCERTAI_CONFIG) { try { await import('../config.js?v=79617c8') } catch { /* sem config.js: demo */ } }
const CFG = globalThis.CONCERTAI_CONFIG || {}
const forcarDemo = typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo')
export const MODO = CFG.supabaseUrl && CFG.supabaseAnonKey && !forcarDemo ? 'supabase' : 'simulado'
const dados = MODO === 'supabase' ? await import('./fonte-supabase.js?v=79617c8') : await import('./dados-simulados.js?v=79617c8')
// No modo real, sessão e "ver como" (só admin) vêm do auth.js da T621; o resto, da fonte de dados.
const auth = MODO === 'supabase' ? await import('./auth.js?v=79617c8') : null
const fonte = auth ? { ...dados, sessao: auth.sessao, entrarComo: auth.entrarComo } : dados
/** Quem pode "ver como" (faixa do topo e tela #/admin): todos na demo (admin simulado); no real, só o admin. */
export const podeTrocarPapel = (s) => MODO === 'simulado' || Boolean(s && s.admin)
export const LIMITE_APROVACAO_CENTS = 30000

export const {
  sessao, entrarComo,
  listarCategorias, listarServicos, listarImoveis, listarReservas, listarPrestadores,
  janelasDisponiveis, listarPedidos, obterPedido,
  criarPedido, decidirAprovacao, responderPedido, avancarPedido, enviarFoto, avaliarPedido, cancelarPedido,
  listarNotificacoes, marcarLida, assinar,
  // 17/11 (pedidos do Henry): imóvel do comprador, quem está livre, troca de profissional, perfis
  imoveisDoComprador, horariosDisponiveis, prestadoresDisponiveis, trocarPrestador,
  perfilProprietario, salvarPerfilProprietario, perfilPrestador, salvarPerfilPrestador, areasConhecidas,
  // 17/11 (pedidos do Henry): dados de pagamento, NF obrigatória para receber, garantia
  dadosPagamento, salvarDadosPagamento, cancelarTrocaPagamento, enviarNF, garantiasPrestador,
  // 17/11 (pedido do Henry): WhatsApp entre quem contratou e o profissional, do aceite até o fim da garantia
  contatoDoPedido, meuCelular, salvarMeuCelular,
  // 17/11 (T807): anfitrião avulso, imóvel fora da Seazone e pagamento no ato (cobrança retida)
  anfitriaoCadastrar, anfitriaoVerificarCelular, anfitriaoReenviarCodigo, anfitriaoPerfil, anfitriaoSalvarPerfil,
  meusImoveisAvulsos, imovelAvulsoSalvar, imovelAvulsoArquivar,
  pagamentoIniciar, pagamentoConfirmarSimulado, cobrancaDoPedido, anfitriaoCobrancas, adminAnfitrioesListar,
} = fonte
/** Quem paga no ato (Pix/cartão): o anfitrião sempre; proprietário e franquia em imóvel fora da Seazone. */
export const pagaNoAto = (papel, imovel) => papel === 'anfitriao' || Boolean(imovel && imovel.fora_seazone)
/** Rótulos da cobrança (cobrancas.status) para quem pagou. */
export const STATUS_COBRANCA = {
  pendente: { rotulo: 'Aguardando seu pagamento', tom: 'ap' },
  pago: { rotulo: 'Pago, valor guardado', tom: 'ok' },
  retido: { rotulo: 'Pago, valor guardado', tom: 'ok' },
  liberado: { rotulo: 'Pago ao profissional', tom: 'ok' },
  reembolsado: { rotulo: 'Reembolsado', tom: 'no' },
  cancelada: { rotulo: 'Cobrança cancelada', tom: 'no' },
}
/** Regras puras (3h, 1h, penalidade, área, horário) e textos dos motivos, iguais às do banco. */
export {
  ANTECEDENCIA_MIN_H, PRAZO_CONFIRMACAO_MIN, PENALIDADE, DIAS_SEMANA, MOTIVOS,
  respeitaAntecedencia, primeiraHoraPermitida, minutosParaConfirmar, podeTrocarPrestador, confirmacaoExpirada, documentoValido, formatarCnpj,
} from './regras-agenda.js?v=79617c8'
/** Contato por WhatsApp: celular no formato do wa.me, janela e mensagens prontas (iguais às da migration 20261117_16). */
export { celularWhatsApp, fmtCelular, janelaContato, mensagemParaPrestador, mensagemParaComprador, linkWhatsApp, linkDoContato } from './whatsapp.js?v=79617c8'
/** Regras puras de pagamento, NF e garantia (iguais às da migration 20261117_13). */
export {
  GARANTIA_DIAS, CARENCIA_DADOS_H, PIX_TIPOS, CONTA_TIPOS, GARANTIA_COBRE, GARANTIA_NAO_COBRE,
  valorEsperadoNF, validarDadosPagamento, validarNF, mascararPix, pagamentoLiberado, garantiaDe,
} from './regras-pagamento.js?v=79617c8'

function erroApi(code, message) { const e = new Error(message); e.code = code; return e }
/** Prestador confirma o pedido (até 1h depois que chegou). Passou 1h: o pedido expira e dá erro prazo_expirado. */
export async function confirmarPedido({ pedido_id }) {
  const p = await fonte.responderPedido({ pedido_id, aceitar: true })
  if (p.status !== 'confirmado') throw erroApi('prazo_expirado', 'Passou 1h sem confirmação: o pedido saiu da sua agenda.')
  return p
}
/** Prestador recusa o pedido (baixa um pouco a nota). */
export async function recusarPedido({ pedido_id, motivo }) { return fonte.responderPedido({ pedido_id, aceitar: false, motivo }) }
/** Reservas de vários imóveis, na mesma ordem da lista: [[reserva do imóvel 0], [do 1], ...]. Erro = listas vazias. */
export async function reservasDosImoveis(imoveis, { de, ate } = {}) {
  const ids = imoveis.map((i) => i.id)
  let l
  try {
    l = fonte.listarReservasLote ? await fonte.listarReservasLote({ imovel_ids: ids, de, ate })
      : (await Promise.all(ids.map((imovel_id) => fonte.listarReservas({ imovel_id, de, ate })))).flat()
  } catch { l = [] }
  const por = new Map(ids.map((id) => [id, []]))
  for (const r of l) por.get(r.imovel_id)?.push(r)
  return ids.map((id) => por.get(id))
}
// ---------- admin "ver como" (franquia, proprietário ou prestador ESPECÍFICO) ----------
// Real: contexto no banco (migration 20261117_14), só para o admin; RLS/RPCs passam a responder como o alvo.
// Demo: admin simulado com a mesma UX (troca para o perfil de teste do alvo).
/** [{ id, nome, detalhe, n_imoveis, n_pedidos, origem }] */
export const verComoBuscar = (o) => fonte.verComoBuscar(o)
/** { papel, alvo_id, nome } ou null */
export const verComoAtual = () => fonte.verComoAtual()
export async function verComoDefinir(o) { const r = await fonte.verComoDefinir(o); auth?.esquecerSessao(); return r }
export async function verComoSair() { await fonte.verComoSair(); auth?.esquecerSessao() }

import { limparExtrasDemo } from './fonte-prestador.js?v=79617c8'
/** Reinicia a demo e também os extras do prestador (checklist, material, NF): limpa antes, porque a semente da demo
 *  grava os extras de exemplo dela (peça esperando aprovação, NF, checklist). */
export async function reiniciarDemo() { limparExtrasDemo(); await fonte.reiniciarDemo() }
/** Só na demo: cai um pedido novo agora para o prestador da demo. null no modo real. */
export const simularPedidoNovo = fonte.simularPedidoNovo || null
/** Só no modo supabase (login real, T621): entrar({ email, senha }), sair(), aceitarTermos(). Na demo não existem. */
export const entrar = fonte.entrar || (async () => sessao())
export const sair = fonte.sair || (async () => {})
export const aceitarTermos = fonte.aceitarTermos || (async () => new Date().toISOString())
/** Já aceitou os termos? Demo: termosAceitos() da fonte; real: perfis.termos_aceitos_em. */
export const termosAceitos = fonte.termosAceitos || (async () => Boolean((await dados.sessao())?.termos_aceitos_em))

/** Data ISO (AAAA-MM-DD) de hoje + offset dias, no fuso do navegador. */
export function isoDia(offset = 0) { return somarDias(hojeIso(), offset) }
function hojeIso() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// ---------- composições (montadas só com as funções acima; valem pras duas fontes) ----------

/** Próxima janela livre do prestador a partir de `aPartir` (ISO), olhando até `dias` dias. */
export async function proximaJanela({ prestador_id, imovel_id, servico_codigo, aPartir = isoDia(0), dias = 14 }) {
  for (let i = 0; i < dias; i++) {
    const data = somarDias(aPartir, i)
    const js = await janelasDisponiveis({ prestador_id, imovel_id, data, servico_codigo })
    const j = js.find((x) => x.disponivel)
    if (j) return { data, ...j }
  }
  return null
}

/** Mapa dia(ISO) → true para os dias do intervalo em que o prestador tem alguma janela livre. */
export async function diasComJanela({ prestador_id, imovel_id, servico_codigo, de, ate }) {
  const out = {}
  for (let d = de; d <= ate; d = somarDias(d, 1)) {
    const js = await janelasDisponiveis({ prestador_id, imovel_id, data: d, servico_codigo })
    out[d] = js.some((x) => x.disponivel)
  }
  return out
}

export function somarDias(iso, n) {
  const [a, m, d] = iso.split('-').map(Number)
  const x = new Date(a, m - 1, d + n)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

/** Rótulos dos status do pedido (schema da T620), textos de docs/textos/site-e-telas.md 3.8.
 *  aguardando_aprovacao muda com quem olha: use rotuloStatus(status, papel). */
export const STATUS = {
  aguardando_pagamento: { rotulo: 'Aguardando seu pagamento', prestador: 'Aguardando pagamento do cliente', tom: 'ap' },
  aguardando_aprovacao: { rotulo: 'Aguardando aprovação do proprietário', proprietario: 'Aguardando sua aprovação', tom: 'ap' },
  aguardando_prestador: { rotulo: 'Aguardando o profissional confirmar', prestador: 'Confirme em até 1h', tom: 'in' },
  confirmado: { rotulo: 'Confirmado', tom: 'ok' },
  em_execucao: { rotulo: 'Em andamento', tom: 'in' },
  prova_enviada: { rotulo: 'Fotos enviadas, conferindo', tom: 'ok' },
  concluido: { rotulo: 'Concluído', tom: 'ok' },
  recusado_proprietario: { rotulo: 'Recusado pelo proprietário', tom: 'no' },
  recusado_prestador: { rotulo: 'Profissional não pode ir', prestador: 'Recusado ou expirado', tom: 'no' },
  cancelado: { rotulo: 'Cancelado', tom: 'no' },
}
/** Rótulo do status para o papel que está vendo ('proprietario' | 'franquia' | 'prestador'). */
export function rotuloStatus(status, papel) {
  const s = STATUS[status]
  return s ? (s[papel] || s.rotulo) : status
}

/** Etapas da linha do tempo (rastreio) e em qual o status está. */
export const ETAPAS = ['Aguardando o profissional confirmar', 'Confirmado', 'Em andamento', 'Fotos enviadas, conferindo', 'Concluído']
export function etapaDe(p) {
  return ({ aguardando_aprovacao: 0, aguardando_prestador: 0, confirmado: 1, em_execucao: 2, prova_enviada: 3, concluido: 4 })[p.status] ?? -1
}

/** Portal do prestador (T624): checklist, material com aprovação do comprador, NF e situação do pagamento. */
export * from './fonte-prestador.js?v=79617c8'
