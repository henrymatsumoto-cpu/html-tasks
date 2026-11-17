// ConcertAI · funções do portal do prestador que não existem no contrato base (T624):
// checklist do serviço, material com aprovação do comprador, NF do serviço e resumo de ganhos.
// Banco: migration supabase/migrations/20261117_04_prestador.sql (RPCs salvar_checklist, informar_material,
// decidir_material, anexar_nf; tabela materiais; bucket privado concertai-nf).
//
// Arquivo separado de fonte-supabase.js (T623) de propósito: não mexe no SELECT_PEDIDO dela.
// As telas pegam os extras do pedido com `extrasDoPedido(p)`.
// Modo demo (sem config do Supabase): guarda tudo no localStorage, pra demonstrar sem banco.

const BUCKET_NF = 'concertai-nf'
const CHAVE_DEMO = 'concertai.demo.prestador.v1'

let modoReal = null
async function real() {
  if (modoReal === null) {
    const cfg = globalThis.CONCERTAI_CONFIG || {}
    const forcarDemo = typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo')
    modoReal = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && !forcarDemo)
  }
  return modoReal
}
async function cli() { return (await import('./fonte-supabase.js?v=79617c8')).cli() }

function erro(code, message) { const e = new Error(message); e.code = code; return e }
async function ok(promessa) {
  const { data, error } = await promessa
  if (error) {
    if (error.code === 'P0001') throw erro(error.details || 'regra', error.message)
    throw erro(error.code || 'erro', error.message || 'Algo deu errado. Tente de novo.')
  }
  return data
}
async function rpc(nome, args) { const c = await cli(); return ok(c.rpc(nome, args)) }

// ---------- demo (localStorage) ----------
function demo() { try { return JSON.parse(localStorage.getItem(CHAVE_DEMO)) || {} } catch { return {} } }
/** Zera os extras da demo (chamado pelo reiniciarDemo do api.js). */
export function limparExtrasDemo() { try { localStorage.removeItem(CHAVE_DEMO) } catch { /* sem storage */ } }
/** Troca os extras da demo pelos da semente ({ [pedido_id]: { checklist, materiais, nf } }), chamado quando a semente nasce. */
export function semearExtrasDemo(mapa = {}) { salvarDemo(structuredClone(mapa)) }
function salvarDemo(d) { try { localStorage.setItem(CHAVE_DEMO, JSON.stringify(d)) } catch { /* sem storage */ } }
function doPedidoDemo(d, id) { return (d[id] ||= { checklist: [], materiais: [], nf: null }) }
const novoId = () => (globalThis.crypto?.randomUUID?.() || `m-${Math.random().toString(36).slice(2)}`)

/** Valor digitado ("45,90", "R$ 1.200", "45.9") → centavos. null se inválido. */
export function centavos(txt) {
  let s = String(txt ?? '').replace(/[^\d.,]/g, '')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/\.\d{3}$/.test(s)) s = s.replace(/\./g, '')
  const v = Math.round(Number(s) * 100)
  return Number.isFinite(v) && v > 0 ? v : null
}

/** Checklist sugerido = o que o serviço inclui (o prestador marca o que fez). */
export function checklistPadrao(servico) {
  return (servico?.inclui || []).map((item) => ({ item, feito: false }))
}

/** { checklist, materiais, nf: { caminho, url, enviada_em } | null } do pedido. */
export async function extrasDoPedido(p) {
  if (!(await real())) {
    const x = doPedidoDemo(demo(), p.id)
    const nf = p.nf_path ? { caminho: p.nf_path, url: '', enviada_em: p.nf_enviada_em } : x.nf
    return { checklist: x.checklist.length ? x.checklist : checklistPadrao(p.servico), materiais: x.materiais, nf }
  }
  const c = await cli()
  const [linha, materiais] = await Promise.all([
    ok(c.from('pedidos').select('checklist, nf_path, nf_enviada_em').eq('id', p.id).maybeSingle()),
    ok(c.from('materiais').select('*').eq('pedido_id', p.id).order('created_at')),
  ])
  let nf = null
  if (linha?.nf_path) {
    const { data } = await c.storage.from(BUCKET_NF).createSignedUrl(linha.nf_path, 3600)
    nf = { caminho: linha.nf_path, url: data?.signedUrl || '', enviada_em: linha.nf_enviada_em }
  }
  const cl = Array.isArray(linha?.checklist) && linha.checklist.length ? linha.checklist : checklistPadrao(p.servico)
  return { checklist: cl, materiais: materiais || [], nf }
}

/** Grava o checklist ([{ item, feito }]). Só o profissional, de confirmado até em_execucao. */
export async function salvarChecklist({ pedido_id, itens }) {
  if (!(await real())) { const d = demo(); doPedidoDemo(d, pedido_id).checklist = itens; salvarDemo(d); return itens }
  return (await rpc('salvar_checklist', { p_pedido: pedido_id, p_itens: itens })).checklist
}

/** Profissional informa peça/material (valor em centavos + foto opcional já enviada com enviarFoto tipo 'material'). */
export async function informarMaterial({ pedido_id, descricao, valor_cents, foto_id = null }) {
  if (!descricao || !String(descricao).trim()) throw erro('descricao_obrigatoria', 'Diga qual peça ou material precisa.')
  if (!valor_cents || valor_cents < 100) throw erro('valor_invalido', 'Informe o valor do material.')
  if (!(await real())) {
    const d = demo()
    const m = { id: novoId(), pedido_id, descricao: String(descricao).trim(), valor_cents, foto_id, status: 'pendente', created_at: new Date().toISOString() }
    doPedidoDemo(d, pedido_id).materiais.push(m); salvarDemo(d); return m
  }
  return rpc('informar_material', { p_pedido: pedido_id, p_descricao: descricao, p_valor_cents: valor_cents, p_foto: foto_id })
}

/** Comprador (proprietário/franquia) aprova ou recusa o material. Para as telas T622/T623. */
export async function decidirMaterial({ material_id, aprovar, motivo }) {
  if (!(await real())) {
    const d = demo()
    for (const x of Object.values(d)) {
      const m = (x.materiais || []).find((y) => y.id === material_id)
      if (m) { m.status = aprovar ? 'aprovado' : 'recusado'; m.motivo = motivo || null; salvarDemo(d); return m }
    }
    throw erro('nao_encontrado', 'Material não encontrado.')
  }
  return rpc('decidir_material', { p_material: material_id, p_aprovar: !!aprovar, p_motivo: motivo || null })
}

/** Materiais esperando decisão do comprador (RLS limita aos imóveis dele). */
export async function listarMateriaisPendentes() {
  if (!(await real())) return Object.values(demo()).flatMap((x) => (x.materiais || []).filter((m) => m.status === 'pendente'))
  const c = await cli()
  return ok(c.from('materiais').select('*').eq('status', 'pendente').order('created_at'))
}

/** NF do serviço (PDF, XML ou foto): sobe no bucket privado e grava no pedido (só o arquivo; a NF completa,
 *  com número, valor, data e confirmação dos dados, é api.enviarNF). */
export async function anexarNF({ pedido_id, arquivo }) {
  if (!arquivo) throw erro('sem_arquivo', 'Escolha o arquivo da NF.')
  if (arquivo.size > 5 * 1024 * 1024) throw erro('arquivo_grande', 'A NF passa de 5 MB. Mande um PDF menor.')
  const ext = (String(arquivo.name || '').match(/\.([a-z0-9]{2,5})$/i)?.[1] || 'pdf').toLowerCase()
  if (!(await real())) {
    const d = demo(); doPedidoDemo(d, pedido_id).nf = { caminho: arquivo.name || `nf.${ext}`, url: '', enviada_em: new Date().toISOString() }
    salvarDemo(d); return d[pedido_id].nf
  }
  const fs = await import('./fonte-supabase.js?v=79617c8')
  const caminho = await fs.subirNF(pedido_id, arquivo)
  const p = await rpc('anexar_nf', { p_pedido: pedido_id, p_caminho: caminho })
  const { data } = await (await cli()).storage.from(BUCKET_NF).createSignedUrl(caminho, 3600)
  return { caminho, url: data?.signedUrl || '', enviada_em: p.nf_enviada_em }
}

/** Situação do pagamento ao prestador (aguardando NF, NF em conferência, pago...): regras-pagamento.js. */
export { situacaoPagamento } from './regras-pagamento.js?v=79617c8'
