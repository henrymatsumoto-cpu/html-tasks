// ConcertAI · fonte de dados REAL (Supabase, schema `concertai`, T620).
// Exporta as mesmas funções de dados-simulados.js (contrato em docs/ui-contrato-dados.md),
// então nenhuma tela muda. Regras (preço, aprovação > R$ 300, agenda, foto) ficam no banco:
// aqui só leitura com RLS + chamadas às funções (RPC). Erro = Error com .code (detail do banco)
// e .message em linguagem de quem usa.
//
// Config pública: window.CONCERTAI_CONFIG = { supabaseUrl, supabaseAnonKey } (config.js gerado
// no build, scripts/build-front.sh). Só a chave anon/publishable; nunca service_role.

const BUCKET = 'concertai-fotos'

let cliente = null
/** Cliente supabase-js (schema concertai): o mesmo do login (supabase.js, T621).
 *  Node/testes injetam `globalThis.CONCERTAI_CREATE_CLIENT` e `globalThis.CONCERTAI_CONFIG`. */
export async function cli() {
  if (cliente) return cliente
  if (globalThis.CONCERTAI_CREATE_CLIENT) {
    const cfg = globalThis.CONCERTAI_CONFIG || {}
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) throw erro('sem_config', 'O site está sem configuração do banco.')
    cliente = globalThis.CONCERTAI_CREATE_CLIENT(cfg.supabaseUrl, cfg.supabaseAnonKey, { db: { schema: 'concertai' }, auth: { persistSession: false } })
  } else {
    cliente = await (await import('./supabase.js?v=79617c8')).supabase()
  }
  return cliente
}

/** timestamptz (UTC) → 'AAAA-MM-DDTHH:mm:ss' no fuso do navegador (as telas leem o dia pelos 10 primeiros caracteres). */
function isoLocal(ts) {
  if (!ts) return ts
  const d = new Date(ts); const z = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`
}

function erro(code, message) { const e = new Error(message); e.code = code; return e }
/** Erro do PostgREST/Storage/Auth → Error com .code estável e texto pra pessoa. */
function traduzir(e) {
  if (!e) return erro('desconhecido', 'Algo deu errado. Tente de novo.')
  if (e.code === 'PGRST116') return erro('nao_encontrado', 'Não encontrado.')
  if (e.code === 'P0001') return erro(e.details || 'regra', e.message)
  if (/JWT|token/i.test(e.message || '')) return erro('sessao_expirada', 'Sua sessão expirou. Entre de novo.')
  if (/fetch|network/i.test(e.message || '')) return erro('rede', 'Sem conexão com o servidor. Tente de novo.')
  return erro(e.code || 'erro', e.message || 'Algo deu errado. Tente de novo.')
}
async function ok(promessa) {
  const { data, error } = await promessa
  if (error) throw traduzir(error)
  return data
}
async function rpc(nome, args) { const c = await cli(); return ok(c.rpc(nome, args)) }

// ---------- sessão / login ----------
let perfilCache = null

/** Usuário logado: { user_id, papel, nome, email, proprietario_id?, franquia_id?, prestador_id?, termos_aceitos_em } ou null. */
export async function sessao() {
  const c = await cli()
  const { data: { session } } = await c.auth.getSession()
  if (!session) { perfilCache = null; return null }
  if (perfilCache && perfilCache.user_id === session.user.id) return perfilCache
  // perfil EFETIVO (perfil_atual): igual ao da tabela, exceto o admin em "ver como", que recebe o perfil do alvo
  const g = geracaoPerfil
  const pf = await rpc('perfil_atual')
  if (!pf?.user_id) throw erro('sem_perfil', 'Seu login ainda não tem acesso ao ConcertAI. Fale com a Seazone.')
  const s = { ...pf, email: session.user.email }
  if (g === geracaoPerfil) perfilCache = s // leitura de antes da troca do "ver como" não grava
  return s
}
let geracaoPerfil = 0

/** Login por e-mail e senha (Supabase Auth). Devolve o perfil. */
export async function entrar({ email, senha }) {
  const c = await cli()
  const { error } = await c.auth.signInWithPassword({ email: String(email || '').trim(), password: senha || '' })
  if (error) throw erro('login_invalido', /invalid/i.test(error.message) ? 'E-mail ou senha incorretos.' : error.message)
  perfilCache = null; servicosCache = null; vitrineCache = null
  return sessao()
}

export async function sair() { const c = await cli(); perfilCache = null; vitrineCache = null; await c.auth.signOut() }

/** No real não troca de papel: devolve o perfil logado (troca de papel só existe na demo). */
export async function entrarComo() { return sessao() }
/** Só existe na demo. */
export async function reiniciarDemo() { }

// ---------- admin "ver como" (migration 20261117_14): só o admin; o banco recusa os outros (sem_permissao) ----------
/** Candidatos de um papel ('franquia' | 'proprietario' | 'prestador'): [{ id, nome, detalhe, n_imoveis, n_pedidos, origem }]. */
export async function verComoBuscar({ papel, busca = '', limite = 30 }) {
  return (await rpc('ver_como_buscar', { p_papel: papel, p_busca: busca || null, p_limite: limite })) || []
}
/** Contexto atual do admin: { papel, alvo_id, nome, desde } ou null. */
export async function verComoAtual() { return rpc('ver_como_atual') }
/** Passa a ver como a pessoa escolhida. Escritas daqui em diante ficam registradas com o admin como autor. */
export async function verComoDefinir({ papel, alvo_id }) {
  const r = await rpc('ver_como_definir', { p_papel: papel, p_alvo: alvo_id })
  perfilCache = null; vitrineCache = null; geracaoPerfil++
  return r
}
/** Volta a ser admin (vê tudo). */
export async function verComoSair() { await rpc('ver_como_sair'); perfilCache = null; vitrineCache = null; geracaoPerfil++ }

/** Aceite dos termos de uso (1ª compra). criarPedido também aceita com { aceito_termos: true }. */
export async function aceitarTermos() {
  const em = await rpc('aceitar_termos')
  if (perfilCache) perfilCache.termos_aceitos_em = em
  return em
}

// ---------- catálogo ----------
let servicosCache = null
export async function listarCategorias() {
  const c = await cli()
  return ok(c.from('categorias').select('codigo, nome, icone').order('ordem'))
}
async function todosServicos() {
  if (!servicosCache) {
    const c = await cli()
    servicosCache = await ok(c.from('servicos').select('*').eq('ativo', true).order('categoria_codigo').order('codigo'))
  }
  return servicosCache
}
export async function listarServicos({ lote = 1 } = {}) {
  return (await todosServicos()).filter((s) => !lote || s.lote === lote)
}
const servicoPor = async (codigo) => (await todosServicos()).find((s) => s.codigo === codigo)

// vitrine = o que o comprador pode ver do prestador (sem CNPJ/razão social)
let vitrineCache = null
async function vitrine() {
  if (!vitrineCache) {
    const c = await cli()
    const l = await ok(c.from('prestadores_vitrine').select('*'))
    vitrineCache = new Map(l.map((p) => [p.id, paraPrestador(p)]))
  }
  return vitrineCache
}
function paraPrestador(p) {
  return { id: p.id, nome: p.nome, tipo_pj: p.tipo_pj, cidade: p.cidade, foto_url: p.foto_url, bio: p.bio,
    nota_media: p.nota === null || p.nota === undefined ? null : Number(p.nota), n_servicos: Number(p.n_servicos ?? 0),
    n_avaliacoes: Number(p.n_avaliacoes ?? 0), servicos: p.servicos || [], areas: p.areas || [],
    disponibilidade: p.disponibilidade || [], penalidade: Number(p.penalidade ?? 0) }
}

/** Prestadores que fazem o serviço, melhor nota primeiro. */
export async function listarPrestadores({ servico_codigo } = {}) {
  vitrineCache = null // nota e nº de serviços mudam a cada pedido
  const l = [...(await vitrine()).values()].filter((p) => !servico_codigo || p.servicos.includes(servico_codigo))
  return l.sort((a, b) => (b.nota_media ?? -1) - (a.nota_media ?? -1) || b.n_servicos - a.n_servicos)
}

// ---------- carteira ----------
/** Imóveis que o usuário enxerga (RLS), com o proprietário. Só os ativos: imóvel que saiu do Sapron (sync de hora
 *  em hora, scripts/snapshot-real.mjs) ou foi arquivado fica no banco com ativo = false e some da carteira.
 *  `todos: true` traz também os inativos (achar o imóvel de um pedido antigo). */
export async function listarImoveis({ todos = false } = {}) {
  const c = await cli()
  let consulta = c.from('imoveis').select('*, proprietario:proprietarios(id, nome, tipo)')
  if (!todos) consulta = consulta.eq('ativo', true)
  const l = await ok(consulta.order('codigo'))
  return l.map((i) => ({ ...i, calendario: { origem: i.calendario_origem || 'manual', sincronizado_em: i.calendario_sincronizado_em || null } }))
}

/** Imóveis para quem COMPRA escolher. No real: proprietário = só os dele (RLS, carga do Sapron), franquia = a carteira.
 *  Calendário: reservas sincronizadas da Stays/Sapron em concertai.reservas (origem 'stays', ver migration 20261117_12).
 *  (Na demo o proprietário de teste vê todos os imóveis da Seazone.) */
export async function imoveisDoComprador() {
  const hoje = isoLocal(Date.now()).slice(0, 10)
  const c = await cli()
  const [pf, l, hosp] = await Promise.all([
    sessao(), listarImoveis(),
    // uma consulta só para o selo "Hóspede hoje" do seletor (RLS limita às reservas da carteira)
    ok(c.from('reservas').select('imovel_id').lte('check_in', hoje).gte('check_out', hoje)).catch(() => []),
  ])
  const comHospede = new Set(hosp.map((r) => r.imovel_id))
  // imóvel de dono tipo 'anfitriao' = cadastrado fora da Seazone (T807): paga no ato
  return l.filter((i) => i.ativo !== false).map((i) => ({ ...i, fora_seazone: pf?.papel === 'anfitriao' || i.proprietario?.tipo === 'anfitriao', hospede_hoje: comHospede.has(i.id), ...(pf?.papel === 'proprietario' ? { meu: true } : {}) }))
}

/** Reservas do imóvel que tocam [de, ate] (prestador não vê: RLS devolve vazio). */
export async function listarReservas({ imovel_id, de, ate }) {
  const c = await cli()
  let q = c.from('reservas').select('id, imovel_id, check_in, check_out, hospedes').eq('imovel_id', imovel_id)
  if (ate) q = q.lte('check_in', ate)
  if (de) q = q.gte('check_out', de)
  return ok(q.order('check_in'))
}

/** Reservas de VÁRIOS imóveis numa ida só (franquia/proprietário do retrato real têm até ~170 imóveis: uma consulta
 *  por imóvel derrubava a tela). Lotes de 80 ids e páginas de 1000 linhas (corte do PostgREST). → [reserva] */
export async function listarReservasLote({ imovel_ids, de, ate }) {
  const c = await cli(); const out = []
  for (let i = 0; i < imovel_ids.length; i += 80) {
    const ids = imovel_ids.slice(i, i + 80)
    for (let pg = 0; ; pg += 1000) {
      let q = c.from('reservas').select('id, imovel_id, check_in, check_out, hospedes').in('imovel_id', ids)
      if (ate) q = q.lte('check_in', ate)
      if (de) q = q.gte('check_out', de)
      const l = await ok(q.order('check_in').order('id').range(pg, pg + 999))
      out.push(...l)
      if (l.length < 1000) break
    }
  }
  return out
}

/** RPC janelas_disponiveis → [{ janela_inicio, janela_fim, disponivel, aviso_reserva, motivo, reserva }]. Reserva só avisa. */
export async function janelasDisponiveis({ prestador_id, imovel_id, data, servico_codigo }) {
  const [l, sv] = await Promise.all([
    rpc('janelas_disponiveis', { p_prestador: prestador_id, p_imovel: imovel_id, p_data: data, p_servico: servico_codigo }),
    servicoPor(servico_codigo),
  ])
  const n = sv?.janelas || 1
  return l.map((j) => ({ janela_inicio: j.hora, janela_fim: j.hora + n, disponivel: j.disponivel, motivo: j.motivo, reserva: j.reserva, aviso_reserva: !!j.reserva }))
}

/** RPC horarios_disponiveis → [{ janela_inicio, janela_fim, n_prestadores, motivo, aviso_reserva, reserva }].
 *  motivo: null | 'passou' | 'menos_de_3h' | 'sem_profissional'. */
export async function horariosDisponiveis({ imovel_id, servico_codigo, data }) {
  const l = await rpc('horarios_disponiveis', { p_imovel: imovel_id, p_servico: servico_codigo, p_data: data })
  return l.map((j) => ({ janela_inicio: j.hora, janela_fim: j.hora_fim, n_prestadores: j.n_prestadores, motivo: j.motivo, reserva: j.reserva, aviso_reserva: !!j.reserva }))
}

/** RPC prestadores_disponiveis: livres para (imóvel, serviço, dia, janela), melhores primeiro. Erro antecedencia_minima se < 3h. */
export async function prestadoresDisponiveis({ imovel_id, servico_codigo, data, janela_inicio }) {
  const l = await rpc('prestadores_disponiveis', { p_imovel: imovel_id, p_servico: servico_codigo, p_data: data, p_janela: janela_inicio })
  return l.map((p) => ({ ...paraPrestador(p), janela_inicio: p.janela_inicio, janela_fim: p.janela_fim, reserva: p.reserva, aviso_reserva: !!p.reserva }))
}

// ---------- pedidos ----------
const SELECT_PEDIDO = '*, imovel:imoveis(*), servico:servicos(*), aprovacao:aprovacoes(*), fotos(*), avaliacao:avaliacoes(*)'
const um = (x) => (Array.isArray(x) ? x[0] || null : x || null)

/** Monta o pedido no formato das telas: prestador da vitrine, fotos com link assinado. */
async function montar(lista) {
  const c = await cli()
  const vit = await vitrine()
  const caminhos = lista.flatMap((p) => (p.fotos || []).map((f) => f.storage_path))
  const urls = new Map()
  if (caminhos.length) {
    const data = await ok(c.storage.from(BUCKET).createSignedUrls(caminhos, 3600)) // falha de acesso = erro, não "sem fotos"
    for (const u of data || []) if (u.signedUrl) urls.set(u.path, u.signedUrl)
  }
  // pedido que trocou o profissional deste (substitui_pedido_id), quando houver
  const ids = lista.filter((p) => p.status === 'recusado_prestador').map((p) => p.id)
  const subs = new Map()
  if (ids.length) {
    const l = await ok(c.from('pedidos').select('id, substitui_pedido_id').in('substitui_pedido_id', ids))
    for (const x of l || []) subs.set(x.substitui_pedido_id, x.id)
  }
  return lista.map((p) => ({
    ...p,
    substituido_por: subs.get(p.id) || null,
    // pedidos de exemplo do seed 07 levam a marca '[demo-exemplo]' no começo da observação (é por ela que o reset acha): não mostrar
    observacao: (p.observacao || '').replace(/^\[demo-exemplo\]\s*/, '') || null,
    criado_em: isoLocal(p.created_at),
    aprovacao: um(p.aprovacao),
    avaliacao: um(p.avaliacao),
    prestador: vit.get(p.prestador_id) || { id: p.prestador_id, nome: 'Profissional', nota_media: 0, n_servicos: 0 },
    fotos: (p.fotos || []).sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((f) => ({ ...f, caminho: f.storage_path, storage_path: urls.get(f.storage_path) || '' }))
      .filter((f) => f.storage_path), // linha sem arquivo no Storage (órfã) não vira <img> quebrada
  }))
}

/** Pedidos que o usuário enxerga (RLS), com relações; filtro opcional por status (lista). */
export async function listarPedidos({ status } = {}) {
  const c = await cli()
  let q = c.from('pedidos').select(SELECT_PEDIDO)
  if (status?.length) q = q.in('status', status)
  const pf = await sessao()
  if (pf?.papel === 'prestador') q = q.neq('status', 'aguardando_aprovacao')
  const l = await ok(q.order('data').order('janela_inicio'))
  vitrineCache = null // nota muda com avaliação e penalidade
  return montar(l)
}

export async function obterPedido(pedido_id) {
  const c = await cli()
  const p = await ok(c.from('pedidos').select(SELECT_PEDIDO).eq('id', pedido_id).maybeSingle())
  if (!p) throw erro('nao_encontrado', 'Pedido não encontrado.')
  return (await montar([p]))[0]
}

/** RPC criar_pedido. Franquia + preço > R$ 300 → aguardando_aprovacao. 1ª compra exige aceito_termos. */
export async function criarPedido({ imovel_id, servico_codigo, prestador_id, data, janela_inicio, observacao, aceito_termos = false }) {
  const p = await rpc('criar_pedido', {
    p_imovel: imovel_id, p_servico: servico_codigo, p_prestador: prestador_id, p_data: data,
    p_janela: janela_inicio, p_observacao: observacao || null, p_aceito_termos: !!aceito_termos,
  })
  if (aceito_termos && perfilCache && !perfilCache.termos_aceitos_em) perfilCache.termos_aceitos_em = new Date().toISOString()
  return obterPedido(p.id)
}

/** RPC decidir_aprovacao (proprietário). decisao: 'aprovado' | 'recusado' */
export async function decidirAprovacao({ pedido_id, decisao, motivo }) {
  await rpc('decidir_aprovacao', { p_pedido: pedido_id, p_aprovar: decisao === 'aprovado', p_motivo: motivo || null })
  return obterPedido(pedido_id)
}

/** RPC responder_pedido (prestador). */
export async function responderPedido({ pedido_id, aceitar, motivo }) {
  await rpc('responder_pedido', { p_pedido: pedido_id, p_aceitar: !!aceitar, p_motivo: motivo || null })
  return obterPedido(pedido_id)
}

/** RPC trocar_prestador (comprador): recusou ou 1h sem confirmar → pedido novo com outro profissional (mesmo dia e janela). */
export async function trocarPrestador({ pedido_id, prestador_id }) {
  const p = await rpc('trocar_prestador', { p_pedido: pedido_id, p_prestador: prestador_id })
  return obterPedido(p.id)
}

/** RPC avancar_pedido: em_execucao (check-in, só no dia), prova_enviada (exige foto depois), concluido; ajuste = volta a em_execucao com motivo. */
export async function avancarPedido({ pedido_id, para, motivo }) {
  await rpc('avancar_pedido', { p_pedido: pedido_id, p_para: para, p_motivo: motivo || null })
  return obterPedido(pedido_id)
}

/** Foto: arquivo no bucket privado (pasta = id do pedido) + linha em `fotos`. Devolve com link assinado. */
export async function enviarFoto({ pedido_id, tipo, arquivo }) {
  if (!arquivo) throw erro('sem_arquivo', 'Escolha uma foto.')
  const c = await cli()
  const ext = (String(arquivo.name || '').match(/\.([a-z0-9]{2,5})$/i)?.[1] || (arquivo.type || 'image/jpeg').split('/')[1] || 'jpg').toLowerCase()
  const caminho = `${pedido_id}/${tipo}-${Date.now()}.${ext}`
  await ok(c.storage.from(BUCKET).upload(caminho, arquivo, { contentType: arquivo.type || 'image/jpeg', upsert: false }))
  const f = await ok(c.from('fotos').insert({ pedido_id, tipo, storage_path: caminho }).select().single())
  const { data } = await c.storage.from(BUCKET).createSignedUrl(caminho, 3600)
  return { ...f, caminho, storage_path: data?.signedUrl || '' }
}

/** RPC avaliar_pedido (comprador, depois de concluído). */
export async function avaliarPedido({ pedido_id, nota, comentario }) {
  await rpc('avaliar_pedido', { p_pedido: pedido_id, p_nota: nota, p_comentario: comentario || null })
  vitrineCache = null
  return obterPedido(pedido_id)
}

/** RPC cancelar_pedido (comprador, até o check-in). */
export async function cancelarPedido({ pedido_id, motivo }) {
  await rpc('cancelar_pedido', { p_pedido: pedido_id, p_motivo: motivo || null })
  return obterPedido(pedido_id)
}

// ---------- perfis ----------
/** RPC meu_perfil_proprietario → { id, nome, email, telefone, documento, atualizado_em, n_imoveis } */
export async function perfilProprietario() { return rpc('meu_perfil_proprietario') }

/** RPC salvar_perfil_proprietario({ nome?, email?, telefone?, documento? }): só as chaves enviadas mudam. */
export async function salvarPerfilProprietario(dados = {}) {
  const p = await rpc('salvar_perfil_proprietario', { p_dados: dados })
  if (perfilCache && 'nome' in dados) perfilCache.nome = p.nome
  return p
}

/** RPC meu_perfil_prestador → { id, nome_exibicao, razao_social, cnpj, tipo_pj, descricao, foto_url, cidade, atualizado_em,
 *  servicos, areas, disponibilidade, nota, n_servicos, penalidade } */
export async function perfilPrestador() {
  const p = await rpc('meu_perfil_prestador', {})
  return { ...p, nota: p.nota === null ? null : Number(p.nota), penalidade: Number(p.penalidade || 0) }
}

/** RPC salvar_perfil_prestador({ nome_exibicao?, razao_social?, cnpj?, tipo_pj?, descricao?, servicos?, areas?, disponibilidade? }). */
export async function salvarPerfilPrestador(dados = {}) {
  const p = await rpc('salvar_perfil_prestador', { p_dados: dados })
  vitrineCache = null
  if (perfilCache && 'nome_exibicao' in dados) perfilCache.nome = p.nome_exibicao
  return { ...p, nota: p.nota === null ? null : Number(p.nota), penalidade: Number(p.penalidade || 0) }
}

/** RPC areas_conhecidas → [{ cidade, uf, bairros: [..] }] (onde há imóvel; o prestador marca onde atende). */
export async function areasConhecidas() {
  const l = await rpc('areas_conhecidas')
  return (l || []).map((a) => ({ ...a, bairros: [...(a.bairros || [])].sort((x, y) => x.localeCompare(y)) }))
}

// ---------- 17/11: dados de pagamento, NF obrigatória e garantia (migration 20261117_13) ----------
const BUCKET_NF = 'concertai-nf'
/** RPC meus_dados_pagamento → { atual, pendente: {..., solicitada_em, vale_a_partir} | null, carencia_horas } */
export async function dadosPagamento() { return rpc('meus_dados_pagamento', {}) }
/** RPC salvar_dados_pagamento: 1º cadastro vale na hora; troca só depois da carência de 72h. */
export async function salvarDadosPagamento(dados = {}) { return rpc('salvar_dados_pagamento', { p_dados: dados }) }
/** RPC cancelar_troca_pagamento */
export async function cancelarTrocaPagamento() { return rpc('cancelar_troca_pagamento', {}) }

/** Sobe o arquivo da NF no bucket privado (pasta = id do pedido) e devolve o caminho. */
export async function subirNF(pedido_id, arquivo) {
  if (!arquivo) throw erro('sem_arquivo', 'Escolha o arquivo da NF.')
  if (arquivo.size > 5 * 1024 * 1024) throw erro('arquivo_grande', 'A NF passa de 5 MB. Mande um PDF menor.')
  const ext = (String(arquivo.name || '').match(/\.([a-z0-9]{2,5})$/i)?.[1] || 'pdf').toLowerCase()
  const c = await cli()
  const caminho = `${pedido_id}/nf-${Date.now()}.${ext}`
  const tipo = arquivo.type || (ext === 'xml' ? 'text/xml' : ext === 'pdf' ? 'application/pdf' : 'image/jpeg')
  await ok(c.storage.from(BUCKET_NF).upload(caminho, arquivo, { contentType: tipo, upsert: false }))
  return caminho
}

/** NF do serviço + confirmação dos dados de pagamento: upload + RPC enviar_nf. Devolve o pedido atualizado. */
export async function enviarNF({ pedido_id, arquivo, numero, valor_cents, emitida_em, confirmo_dados }) {
  const caminho = await subirNF(pedido_id, arquivo)
  await rpc('enviar_nf', { p_pedido: pedido_id, p_caminho: caminho, p_numero: String(numero ?? '').trim(), p_valor_cents: valor_cents,
    p_emitida_em: emitida_em, p_confirmo_dados: Boolean(confirmo_dados) })
  return obterPedido(pedido_id)
}

/** RPC minhas_garantias → serviços concluídos há menos de 90 dias, com dias restantes e o que cobre. */
export async function garantiasPrestador() { return (await rpc('minhas_garantias', {})) || [] }

// ---------- contato por WhatsApp (REGRA de 17/11; migration 20261117_16) ----------
/** RPC pedido_contato: contato do outro lado do pedido, só do aceite até o fim da garantia (o banco confere). */
export async function contatoDoPedido(pedido_id) { return rpc('pedido_contato', { p_pedido: pedido_id }) }
/** RPC meu_celular → { celular } */
export async function meuCelular() { return rpc('meu_celular', {}) }
/** RPC salvar_meu_celular(celular) → { celular }. Erro celular_invalido. */
export async function salvarMeuCelular({ celular }) { return rpc('salvar_meu_celular', { p_celular: celular ?? '' }) }

// ---------- notificações ----------
/** Avisos do usuário logado, mais novos primeiro. O link do banco (#/pedidos/<id>) vira a rota do papel. */
export async function listarNotificacoes() {
  const pf = await sessao()
  if (!pf) return []
  const c = await cli()
  const l = await ok(c.from('notificacoes').select('*').order('created_at', { ascending: false }).limit(50))
  return l.map((n) => ({ ...n, criado_em: isoLocal(n.created_at), link: linkDoPapel(n, pf.papel) }))
}
function linkDoPapel(n, papel) {
  const base = papel === 'admin' ? 'franquia' : papel
  return n.pedido_id ? `#/${base}/pedido/${n.pedido_id}` : (n.link || `#/${base}`)
}
export async function marcarLida(id) { await rpc('marcar_notificacoes_lidas', { p_ids: id ? [id] : null }) }

// ---------- tempo real ----------
/** Avisa a tela quando muda pedido ou aviso do usuário (Supabase Realtime). Devolve a função de cancelar. */
export function assinar(fn) {
  let canal = null; let vivo = true
  cli().then((c) => {
    if (!vivo) return
    canal = c.channel('concertai-mudancas')
      .on('postgres_changes', { event: '*', schema: 'concertai', table: 'pedidos' }, (m) => fn({ tipo: 'pedido', id: m.new?.id || m.old?.id }))
      .on('postgres_changes', { event: 'INSERT', schema: 'concertai', table: 'notificacoes' }, () => fn({ tipo: 'notificacao' }))
      .subscribe()
  }).catch(() => { /* sem realtime: as telas recarregam ao navegar */ })
  return () => { vivo = false; if (canal) canal.unsubscribe() }
}

// ---------- anfitrião avulso e pagamento no ato (T807; migrations 20261117_14_anfitriao_avulso e _15_cobrancas) ----------
// Contrato: docs/ui-contrato-dados.md, seção "Anfitrião avulso". Admin no "ver como" lê como o anfitrião (o banco usa
// o contexto do ver_como), então as leituras não precisam passar p_proprietario_id.
const limparPerfil = () => { perfilCache = null; vitrineCache = null; geracaoPerfil++ }
export async function anfitriaoCadastrar({ nome, celular, documento, termos }) {
  if (!termos) throw erro('termos_pendentes', 'Leia e aceite os termos para criar a conta.')
  const t = (await rpc('termos_vigentes', { p_documento: 'termos_comprador' }))?.[0]
  const r = await rpc('anfitriao_cadastrar', { p_nome: nome, p_celular: celular, p_documento: documento, p_termos_versao: t?.versao ?? 1 })
  limparPerfil()
  return r
}
export async function anfitriaoVerificarCelular({ codigo }) { return rpc('anfitriao_verificar_celular', { p_codigo: String(codigo || '').trim() }) }
export async function anfitriaoReenviarCodigo() { return rpc('anfitriao_reenviar_codigo') }
export async function anfitriaoPerfil() { return rpc('anfitriao_meu_perfil', {}) }
export async function anfitriaoSalvarPerfil(dados = {}) { const r = await rpc('anfitriao_salvar_perfil', { p_dados: dados }); limparPerfil(); return r }
export async function meusImoveisAvulsos() {
  const l = (await rpc('anfitriao_imoveis', {})) || []
  return l.filter((i) => i.ativo !== false).map((i) => ({ ...i, fora_seazone: true }))
}
export async function imovelAvulsoSalvar(d = {}) {
  const p = { ...d, cep: String(d.cep || '').replace(/\D/g, ''), quartos: Number(d.quartos) }
  for (const k of Object.keys(p)) if (p[k] === '' || p[k] == null) delete p[k]
  return rpc('anfitriao_imovel_salvar', { p })
}
export async function imovelAvulsoArquivar(imovel_id) { return rpc('anfitriao_imovel_arquivar', { p_imovel: imovel_id }) }
export async function pagamentoIniciar({ pedido_id, metodo }) { return rpc('pagamento_iniciar', { p_pedido: pedido_id, p_metodo: metodo }) }
export async function pagamentoConfirmarSimulado({ cobranca_id }) { return rpc('pagamento_confirmar_simulado', { p_cobranca: cobranca_id }) }
export async function cobrancaDoPedido(pedido_id) {
  const c = await cli()
  const l = await ok(c.from('cobrancas').select('*').eq('pedido_id', pedido_id).neq('status', 'cancelada').order('created_at', { ascending: false }).limit(1))
  return l[0] || null
}
export async function anfitriaoCobrancas() { return (await rpc('anfitriao_cobrancas', {})) || [] }
export async function adminAnfitrioesListar({ busca = '' } = {}) { return (await rpc('admin_anfitrioes_listar', { p_busca: busca || null })) || [] }
