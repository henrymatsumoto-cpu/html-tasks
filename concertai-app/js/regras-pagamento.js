// ConcertAI · regras puras do pagamento ao prestador, da NF e da garantia (REGRAS de 17/11 do Henry).
// Iguais às do banco (supabase/migrations/20261117_13_pagamento_nf_garantia.sql): a demo e as telas usam estas;
// no real quem decide é o banco (enviar_nf, salvar_dados_pagamento, triggers de pagamento).
//
// Valor da NF: NF do serviço = preço cheio do pedido (P = preco_cents), tomador = proprietário (modelo A da CZT-002).
// O prestador recebe o líquido (P − taxa); a Seazone emite a NF da taxa contra ele. Item extra (peça) tem nota própria.

export const GARANTIA_DIAS = 90
export const CARENCIA_DADOS_H = 72
export const PIX_TIPOS = { cnpj: 'CNPJ', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Chave aleatória' }
export const CONTA_TIPOS = { corrente: 'Conta corrente PJ', pagamento: 'Conta de pagamento PJ' }
export const GARANTIA_COBRE = 'A mão de obra do serviço feito: o mesmo defeito, no mesmo ponto. Se voltar, você refaz sem custo em até 72h.'
export const GARANTIA_NAO_COBRE = 'Peça fornecida pelo cliente, mau uso ou dano de hóspede, item diferente do contratado e desgaste natural de consumível.'

function erro(code, message) { const e = new Error(message); e.code = code; return e }
const digitos = (v) => String(v ?? '').replace(/\D/g, '')

/** Valor que a NF do serviço tem de ter (centavos). */
export const valorEsperadoNF = (p) => p.preco_cents

/** Confere e normaliza os dados de pagamento (lança Error com .code, mesmos textos do banco). */
export function validarDadosPagamento(d = {}, { cnpj, razao_social, nome } = {}) {
  const doc = digitos(cnpj)
  if (doc.length !== 14) throw erro('sem_cnpj', 'Cadastre o CNPJ da empresa no perfil antes dos dados de pagamento.')
  const tipo = String(d.pix_tipo || '').trim().toLowerCase()
  let chave = String(d.pix_chave || '').trim()
  if (!PIX_TIPOS[tipo]) throw erro('pix_tipo_invalido', 'Escolha o tipo da chave Pix: CNPJ, e-mail, telefone ou aleatória.')
  if (tipo === 'cnpj') {
    chave = digitos(chave)
    if (chave !== doc) throw erro('pix_titular_divergente', 'A chave Pix CNPJ tem que ser o CNPJ da sua empresa.')
  } else if (tipo === 'email') {
    chave = chave.toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(chave) || chave.length > 77) throw erro('pix_chave_invalida', 'E-mail da chave Pix inválido.')
  } else if (tipo === 'telefone') {
    chave = digitos(chave)
    if (chave.length === 13 && chave.startsWith('55')) chave = chave.slice(2)
    if (![10, 11].includes(chave.length)) throw erro('pix_chave_invalida', 'Telefone da chave Pix com DDD (10 ou 11 números).')
    chave = `+55${chave}`
  } else {
    chave = chave.toLowerCase()
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(chave)) throw erro('pix_chave_invalida', 'Chave aleatória inválida (formato 0000aaaa-0000-...).')
  }
  const banco = String(d.banco || '').trim()
  const agencia = digitos(d.agencia)
  const conta = String(d.conta || '').replace(/[^0-9xX-]/g, '').toUpperCase()
  const conta_tipo = d.conta_tipo || 'corrente'
  if (banco.length < 3 || banco.length > 80) throw erro('banco_invalido', 'Informe o banco (código e nome).')
  if (agencia.length < 3 || agencia.length > 5) throw erro('agencia_invalida', 'Agência com 3 a 5 números.')
  if (!/^[0-9]{3,13}-?[0-9X]?$/.test(conta)) throw erro('conta_invalida', 'Conta com dígito, ex.: 12345-6.')
  if (!CONTA_TIPOS[conta_tipo]) throw erro('conta_tipo_invalido', 'Tipo de conta: corrente ou pagamento (PJ).')
  return { pix_tipo: tipo, pix_chave: chave, banco, agencia, conta, conta_tipo, titular_nome: razao_social || nome || '', titular_documento: doc }
}

/** Chave mascarada (igual ao _mascarar_pix do banco). */
export function mascararPix(tipo, chave) {
  if (!chave) return ''
  if (tipo === 'email') { const i = chave.indexOf('@'); return `${chave[0]}***${chave.slice(i)}` }
  if (chave.length <= 4) return '****'
  return '*'.repeat(Math.min(chave.length - 4, 8)) + chave.slice(-4)
}

/** Confere a NF antes de mandar (lança Error com .code). hoje = 'AAAA-MM-DD'. */
export function validarNF({ arquivo, numero, valor_cents, emitida_em, confirmo_dados }, p, hoje) {
  if (!arquivo) throw erro('sem_arquivo', 'Envie o arquivo da NF (PDF, XML ou foto).')
  if (arquivo.size > 5 * 1024 * 1024) throw erro('arquivo_grande', 'A NF passa de 5 MB. Mande um PDF menor.')
  if (!/^[0-9A-Za-z./-]{1,20}$/.test(String(numero ?? '').trim())) throw erro('nf_numero_invalido', 'Informe o número da NF.')
  if (valor_cents !== valorEsperadoNF(p)) {
    throw erro('nf_valor_divergente', `O valor da NF tem que ser R$ ${(valorEsperadoNF(p) / 100).toFixed(2).replace('.', ',')}, o preço do serviço (a taxa da Seazone sai depois).`)
  }
  if (!emitida_em || emitida_em > hoje || emitida_em < p.data) throw erro('nf_data_invalida', 'A data de emissão tem que ser do dia do serviço até hoje.')
  if (!confirmo_dados) throw erro('dados_nao_confirmados', 'Confirme os dados de pagamento para receber.')
}

const FEITOS = ['prova_enviada', 'concluido']
/**
 * Situação do pagamento ao prestador.
 * chave: agendado | aguardando_nf | nf_recusada | nf_em_conferencia | nf_aprovada | liberado | pago
 * bloqueado = true quando o dinheiro está parado por falta de NF (ou NF recusada).
 */
export function situacaoPagamento(p) {
  if (!FEITOS.includes(p.status)) return { chave: 'agendado', rotulo: 'Agendado', tom: 'in', bloqueado: false }
  if (p.prestador_pago_em) return { chave: 'pago', rotulo: 'Pago', tom: 'ok', bloqueado: false }
  if (p.nf_status === 'recusada') return { chave: 'nf_recusada', rotulo: 'NF recusada: envie de novo', tom: 'no', bloqueado: true }
  if (!p.nf_status || !p.nf_path || !p.pagamento_dados_confirmados_em) return { chave: 'aguardando_nf', rotulo: 'Aguardando NF', tom: 'ap', bloqueado: true }
  if (p.nf_status === 'em_conferencia') return { chave: 'nf_em_conferencia', rotulo: 'NF enviada, em conferência', tom: 'in', bloqueado: false }
  if (p.status !== 'concluido') return { chave: 'nf_aprovada', rotulo: 'NF aprovada, cliente conferindo', tom: 'in', bloqueado: false }
  return { chave: 'liberado', rotulo: 'Liberado: Pix em até 1 dia útil', tom: 'ok', bloqueado: false }
}

/** Pagamento pode sair? (a mesma condição do trigger do banco) */
export function pagamentoLiberado(p) {
  return p.status === 'concluido' && Boolean(p.nf_path && p.nf_numero) && p.nf_status === 'aprovada'
    && p.nf_valor_cents === p.preco_cents && Boolean(p.pagamento_dados_confirmados_em)
}

function diasEntre(a, b) { const [x, y] = [a, b].map((s) => { const [ano, m, d] = s.split('-').map(Number); return Date.UTC(ano, m - 1, d) }); return Math.round((y - x) / 864e5) }
function maisDias(iso, n) { const [a, m, d] = iso.split('-').map(Number); const x = new Date(Date.UTC(a, m - 1, d + n)); return x.toISOString().slice(0, 10) }

/** Garantia de um pedido concluído: { inicio, fim, dias_restantes } (fim = conclusão + 90 dias). */
export function garantiaDe(concluido_em, hoje) {
  const fim = maisDias(concluido_em, GARANTIA_DIAS)
  return { inicio: concluido_em, fim, dias_restantes: diasEntre(hoje, fim) }
}
