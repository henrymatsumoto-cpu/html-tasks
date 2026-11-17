// ConcertAI · login e sessão de verdade (T621), no Supabase Auth.
//
// - Sem senha: link de acesso por e-mail (signInWithOtp, PKCE). Só entra quem JÁ tem cadastro
//   (shouldCreateUser: false): o Auth é compartilhado com outros apps da Seazone.
// - Com senha: só para os usuários demo (senha fora do repo, ver docs/acesso-login.md).
// - Papel e "a quem pertence" vêm de `concertai.perfis` (RLS: cada um lê só o próprio perfil).
//   Usuário do Auth sem perfil no ConcertAI = sem acesso (erro `sem_acesso`).
// - Admin vê tudo (RLS) e pode "ver como" uma franquia/proprietário/prestador ESPECÍFICO (contexto no banco,
//   migration 20261117_14): RLS e RPCs passam a responder como aquela pessoa. Os outros papéis não trocam.
//
// Mesmo contrato da fonte simulada: sessao() devolve
//   { user_id, papel, nome, email, proprietario_id, franquia_id, prestador_id, termos_aceitos_em, admin, papel_real, ver_como? }
// ou null quando não há login.
import { supabase } from './supabase.js?v=79617c8'

const PAPEIS_TELA = ['proprietario', 'franquia', 'prestador']
let cache = null // { user_id, perfil }

function erro(code, message) { return Object.assign(new Error(message), { code }) }

/** Traduz o erro do Auth para a pessoa (nunca mostra detalhe interno). */
function traduzir(e) {
  const msg = String(e?.message || '')
  const status = e?.status
  if (/invalid login credentials/i.test(msg)) return erro('credenciais', 'E-mail ou senha não conferem. Tente de novo.')
  if (/signups? not allowed|user not found/i.test(msg)) return erro('sem_cadastro', 'Esse e-mail ainda não tem acesso ao ConcertAI. Use o mesmo e-mail cadastrado na Seazone.')
  if (status === 429 || /rate limit|security purposes/i.test(msg)) return erro('muitas_tentativas', 'Muitos pedidos de acesso agora. Espere alguns minutos e tente de novo.')
  if (/email not confirmed/i.test(msg)) return erro('nao_confirmado', 'Confirme o seu e-mail pelo link que mandamos antes de entrar.')
  if (/failed to fetch|network/i.test(msg)) return erro('sem_rede', 'Você está sem internet. Assim que voltar, a gente continua de onde parou.')
  return erro('auth', 'Algo deu errado do nosso lado. Tente de novo em alguns minutos.')
}

function emailValido(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) }

/** Tira o ?code= do link do e-mail da barra de endereço, mantendo a rota (#/...). */
function limparUrl() {
  const u = new URL(location.href)
  if (!u.searchParams.has('code') && !u.searchParams.has('error_description')) return
  u.searchParams.delete('code'); u.searchParams.delete('error'); u.searchParams.delete('error_code'); u.searchParams.delete('error_description')
  history.replaceState(null, '', u.pathname + u.search + u.hash)
}

// Erro que veio no link do e-mail (ex.: link vencido): lido no carregamento, antes de a URL ser limpa.
const ERRO_LINK = (() => {
  try {
    const u = new URL(location.href)
    return u.searchParams.get('error_description') || new URLSearchParams(location.hash.split('?')[1] || '').get('error_description')
  } catch { return null }
})()
let erroLinkLido = false

/** Mensagem do erro do link do e-mail, uma vez só (null se não houve). */
export function erroDoLink() {
  if (!ERRO_LINK || erroLinkLido) return null
  erroLinkLido = true
  limparUrl()
  return /expired|invalid/i.test(ERRO_LINK) ? 'Esse link de acesso venceu ou já foi usado. Peça outro.' : 'Não deu para entrar por esse link. Peça outro.'
}

async function perfilDe(user) {
  if (cache?.user_id === user.id) return cache.perfil
  const sb = await supabase()
  const { data, error } = await sb.from('perfis')
    .select('user_id, papel, nome, proprietario_id, franquia_id, prestador_id, termos_aceitos_em')
    .eq('user_id', user.id).maybeSingle()
  if (error) throw traduzir(error)
  if (!data) throw erro('sem_acesso', 'Seu e-mail entrou, mas ainda não tem acesso ao ConcertAI. Fale com a franquia ou com a Seazone.')
  cache = { user_id: user.id, perfil: { ...data, email: user.email } }
  return cache.perfil
}

// Admin: papel 'admin' até escolher QUEM ver (tela #/admin). Com contexto no banco (ver_como_atual), a sessão é a do
// alvo (perfil_atual: papel + proprietario_id/franquia_id/prestador_id) e ganha `ver_como` para a faixa do topo.
async function verComo(perfil) {
  if (perfil.papel !== 'admin') return { ...perfil, admin: false, papel_real: perfil.papel }
  const sb = await supabase()
  const { data: vc, error } = await sb.rpc('ver_como_atual')
  if (error) throw traduzir(error)
  if (!vc) return { ...perfil, admin: true, papel_real: 'admin', ver_como: null }
  const { data: ef, error: e2 } = await sb.rpc('perfil_atual')
  if (e2) throw traduzir(e2)
  return { ...perfil, ...ef, email: perfil.email, admin: true, papel_real: 'admin', ver_como: vc }
}

/** Sessão atual (ou null). Renova o token sozinho; lê o perfil uma vez por usuário. */
export async function sessao() {
  const sb = await supabase()
  const { data, error } = await sb.auth.getSession()
  limparUrl()
  if (error) throw traduzir(error)
  const user = data.session?.user
  if (!user) { cache = null; esquecerSessao(); return null }
  const pf = await perfilDe(user)
  if (efetivo?.user_id === user.id) return efetivo.s
  const g = geracao
  const s = await verComo(pf)
  if (g === geracao) efetivo = { user_id: user.id, s } // leitura que começou antes de trocar o "ver como" não grava
  return s
}
let efetivo = null // { user_id, s }: sessão já com o "ver como" resolvido
let geracao = 0
/** Esquece a sessão montada (depois de trocar o "ver como"). */
export function esquecerSessao() { efetivo = null; geracao++ }

/** Admin escolhendo pelo papel (sem dizer quem): manda para a busca. Os outros papéis recebem `sem_permissao`. */
export async function entrarComo(papel) {
  const s = await sessao()
  if (!s) throw erro('sem_sessao', 'Sua sessão expirou. Entre de novo.')
  if (!s.admin) throw erro('sem_permissao', 'Você não tem acesso a essa área.')
  if (!PAPEIS_TELA.includes(papel)) throw erro('papel_invalido', 'Papel inválido')
  if (s.papel === papel) return s
  throw erro('escolher_quem', 'Escolha quem você quer ver.')
}

/** No site real não há demo para reiniciar. */
export async function reiniciarDemo() {}

/** Entrar com e-mail e senha (usuários demo). */
export async function entrarComSenha(email, senha) {
  email = String(email || '').trim().toLowerCase()
  if (!emailValido(email)) throw erro('email_invalido', 'Digite um e-mail válido.')
  if (!senha) throw erro('senha_vazia', 'Digite a senha ou peça o link de acesso por e-mail.')
  const sb = await supabase()
  const { error } = await sb.auth.signInWithPassword({ email, password: senha })
  if (error) throw traduzir(error)
  esquecerSessao()
  try { return await sessao() } catch (e) { await sb.auth.signOut(); cache = null; throw e }
}

/** Manda o link de acesso (sem senha) para quem já tem cadastro. */
export async function enviarLink(email) {
  email = String(email || '').trim().toLowerCase()
  if (!emailValido(email)) throw erro('email_invalido', 'Digite um e-mail válido.')
  const sb = await supabase()
  const volta = location.origin + location.pathname // a rota (#/...) é decidida pelo papel depois do login
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: volta } })
  if (error) throw traduzir(error)
}

export async function sair() {
  cache = null; esquecerSessao()
  const sb = await supabase()
  await sb.auth.signOut()
}

/** Avisa quando a sessão muda (login em outra aba, token renovado, saiu). Devolve função de cancelar. */
export async function aoMudarSessao(fn) {
  const sb = await supabase()
  const { data } = sb.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT' || evento === 'SIGNED_IN' || evento === 'USER_UPDATED') { cache = null; esquecerSessao(); fn(evento) }
  })
  return () => data.subscription.unsubscribe()
}
