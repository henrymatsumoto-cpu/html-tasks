// ConcertAI · cliente do Supabase (T621).
//
// A configuração vem do `config.js` que o scripts/build-front.sh gera no site publicado:
//   window.CONCERTAI_CONFIG = { supabaseUrl, supabaseAnonKey, ambiente, versao }
// Só a chave PÚBLICA (anon) chega aqui; quem decide o que cada um vê é o RLS do schema `concertai`.
// Sem config (rodando local sem build) o site fica no modo simulado e este módulo nem carrega o SDK.

const cfg = (typeof window !== 'undefined' && window.CONCERTAI_CONFIG) || {}

export const CONFIGURADO = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey)
export const AMBIENTE = cfg.ambiente || 'local'

let cliente = null

/** Cliente único do supabase-js, apontado pro schema `concertai`. */
export async function supabase() {
  if (!CONFIGURADO) throw Object.assign(new Error('Site sem configuração do Supabase'), { code: 'sem_config' })
  if (cliente) return cliente
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm')
  cliente = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    db: { schema: 'concertai' },
    auth: {
      // PKCE: o link do e-mail volta com ?code= (query), sem brigar com o roteador por hash (#/...)
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'concertai.auth',
    },
  })
  return cliente
}
