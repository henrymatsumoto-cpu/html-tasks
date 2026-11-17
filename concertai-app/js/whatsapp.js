// ConcertAI · contato por WhatsApp entre quem contratou e o profissional (REGRA de 17/11 do Henry).
// Regras puras, iguais às do banco (supabase/migrations/20261117_16_contato_whatsapp.sql): celular no formato do
// wa.me (55 + DDD + número), janela do contato (do aceite até o fim da garantia) e as mensagens prontas.
// O contato em si vem de api.contatoDoPedido(pedido_id) (RPC pedido_contato); aqui só se monta o link.
import { garantiaDe } from './regras-pagamento.js?v=79617c8'

/** '48 99999-0001' → '5548999990001'; '+55 (48) 9999-0001' → '554899990001'; inválido ou vazio → null. */
export function celularWhatsApp(t) {
  const d = String(t ?? '').replace(/\D/g, '').replace(/^0+/, '')
  if (/^55[1-9][0-9]\d{8,9}$/.test(d)) return d
  if (/^[1-9][0-9]\d{8,9}$/.test(d)) return `55${d}`
  return null
}

/** '5548999990001' → '(48) 99999-0001' */
export function fmtCelular(c) {
  const d = String(c ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return d
}

const STATUS_ABERTOS = ['confirmado', 'em_execucao', 'prova_enviada']
const STATUS_ANTES = ['aguardando_aprovacao', 'aguardando_prestador', 'aguardando_pagamento']
/** Janela do contato: { aberto, motivo?, garantia_ate? }. Concluído: até o fim da garantia (90 dias). */
export function janelaContato(p, hoje) {
  if (STATUS_ABERTOS.includes(p.status)) return { aberto: true }
  if (p.status === 'concluido') {
    const g = garantiaDe(p.concluido_em || p.data, hoje)
    return g.dias_restantes >= 0 ? { aberto: true, garantia_ate: g.fim } : { aberto: false, motivo: 'garantia_encerrada' }
  }
  if (STATUS_ANTES.includes(p.status)) return { aberto: false, motivo: 'aguardando_confirmacao' }
  return { aberto: false, motivo: 'encerrado' }
}

const primeiroNome = (n) => String(n || '').trim().split(/\s+/)[0] || ''
const ddMm = (iso) => { const [, m, d] = String(iso).split('-'); return `${d}/${m}` }
const fimJanela = (c) => Number(c.janela_inicio) + Number(c.janelas || 1)
const imovelTxt = (c) => (c.imovel_nome && c.imovel_nome !== c.imovel_codigo ? `${c.imovel_codigo} (${c.imovel_nome})` : c.imovel_codigo)
const franquiaTxt = (n) => (/^franquia\b/i.test(n) ? n : `franquia ${n}`)

/** Quem contratou se apresentando: "Marina Exemplo, responsável pelo imóvel" ou "a Franquia Norte da Ilha". */
function apresentacaoComprador(c) {
  return c.comprador_tipo === 'franquia' ? `a ${franquiaTxt(c.comprador_nome)}` : `${c.comprador_nome}, responsável pelo imóvel`
}

/** Mensagem de quem contratou para o profissional. */
export function mensagemParaPrestador(c) {
  return `Oi, ${primeiroNome(c.prestador_nome)}! Aqui é ${apresentacaoComprador(c)}. `
    + `Te contratei pelo ConcertAI para ${c.servico_nome} no imóvel ${imovelTxt(c)}${c.endereco ? `, ${c.endereco}` : ''}, `
    + `no dia ${ddMm(c.data)} das ${c.janela_inicio}h às ${fimJanela(c)}h. Pedido PED-${c.numero}. Qualquer coisa, me chama por aqui!`
}

/** Mensagem do profissional para quem contratou. */
export function mensagemParaComprador(c) {
  const oi = c.comprador_tipo === 'franquia' ? `pessoal da ${franquiaTxt(c.comprador_nome)}` : primeiroNome(c.comprador_nome)
  return `Oi, ${oi}! Sou ${c.prestador_nome}, do ConcertAI. Confirmei o serviço ${c.servico_nome} no imóvel ${imovelTxt(c)}, `
    + `dia ${ddMm(c.data)} às ${c.janela_inicio}h (pedido PED-${c.numero}). Tem alguma orientação de acesso?`
}

/** https://wa.me/<celular>?text=<mensagem> (null sem celular válido). */
export function linkWhatsApp(celular, mensagem) {
  const c = celularWhatsApp(celular)
  return c ? `https://wa.me/${c}?text=${encodeURIComponent(mensagem)}` : null
}

/** Link pronto para o contato devolvido por contatoDoPedido (null fora da janela ou sem celular). */
export function linkDoContato(c) {
  if (!c || !c.aberto || !c.celular) return null
  return linkWhatsApp(c.celular, c.lado === 'prestador' ? mensagemParaPrestador(c) : mensagemParaComprador(c))
}
