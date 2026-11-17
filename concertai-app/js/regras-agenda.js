// ConcertAI · regras de agenda e de confirmação (puras, sem DOM nem banco): as mesmas do banco
// (supabase/migrations/20261117_12_perfil_disponibilidade.sql), usadas pela demo (dados-simulados.js) e pelos testes.
//   - pedido só com 3h de antecedência do início da janela;
//   - prestador confirma em até 1h depois que o pedido chega nele; recusa ou expiração baixa a nota;
//   - só aparece prestador que faz o serviço, atende a cidade/bairro do imóvel, atende no dia/horário e está livre.
// Horas são inteiras (janelas de 1h entre 8h e 17h); datas em ISO AAAA-MM-DD no fuso do navegador (BRT).

export const ANTECEDENCIA_MIN_H = 3
export const PRAZO_CONFIRMACAO_MIN = 60
export const PENALIDADE = { recusou: 0.1, expirou: 0.2 }
export const HORA_ABRE = 8
export const HORA_FECHA = 17
/** Status que ocupam a agenda do prestador (igual a concertai.ocupa_agenda). */
export const OCUPA_AGENDA = ['aguardando_pagamento', 'aguardando_aprovacao', 'aguardando_prestador', 'confirmado', 'em_execucao']
export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

/** Início da janela (data ISO + hora) como Date local. */
export function inicioJanela(data, hora) {
  const [a, m, d] = data.split('-').map(Number)
  return new Date(a, m - 1, d, hora, 0, 0, 0)
}

/** O início da janela está a pelo menos 3h de `agora`? */
export function respeitaAntecedencia(data, hora, agora = new Date()) {
  return inicioJanela(data, hora).getTime() >= agora.getTime() + ANTECEDENCIA_MIN_H * 3600e3
}

/** Primeira janela (hora cheia) que respeita a antecedência num dia, ou null se o dia já não tem nenhuma. */
export function primeiraHoraPermitida(data, agora = new Date()) {
  for (let h = HORA_ABRE; h < HORA_FECHA; h++) if (respeitaAntecedencia(data, h, agora)) return h
  return null
}

/** Prazo (ISO) para o prestador confirmar, contado de quando o pedido chegou nele. */
export function prazoConfirmacao(chegouEm = new Date()) {
  return new Date(new Date(chegouEm).getTime() + PRAZO_CONFIRMACAO_MIN * 60e3).toISOString()
}

/** Pedido esperando o prestador com o prazo de 1h vencido? */
export function confirmacaoExpirada(pedido, agora = new Date()) {
  return pedido.status === 'aguardando_prestador' && Boolean(pedido.confirmar_ate) && new Date(pedido.confirmar_ate).getTime() < agora.getTime()
}

/** Minutos que faltam para o prazo de confirmação (0 se venceu; null se não está esperando o prestador). */
export function minutosParaConfirmar(pedido, agora = new Date()) {
  if (pedido.status !== 'aguardando_prestador' || !pedido.confirmar_ate) return null
  return Math.max(0, Math.ceil((new Date(pedido.confirmar_ate).getTime() - agora.getTime()) / 60e3))
}

/** O comprador pode trocar o profissional? (recusou, ou 1h sem confirmar) */
export function podeTrocarPrestador(pedido, agora = new Date()) {
  return !pedido.substituido_por && (pedido.status === 'recusado_prestador' || confirmacaoExpirada(pedido, agora))
}

/** Nota com penalidades: nota base − soma dos pontos, nunca abaixo de 1,0 (base nula fica nula). */
export function notaComPenalidade(notaBase, penalidades = []) {
  if (notaBase === null || notaBase === undefined) return null
  const pontos = penalidades.reduce((s, p) => s + (typeof p === 'number' ? p : (p.pontos ?? PENALIDADE[p.tipo] ?? 0)), 0)
  return Math.max(1, Math.round((notaBase - pontos) * 10) / 10)
}

/** Texto sem acento, minúsculo e com espaço simples (bairro do Sapron vem "Jurere", "Ingleses Do Rio Vermelho"). */
export function normaliza(t) {
  return String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
}

/** O prestador atende o imóvel? areas: [{ cidade, bairro|null }] (bairro null = cidade toda; bairro casa pelo começo do nome).
 *  Sem área cadastrada: atende a cidade do cadastro (`cidadePadrao`). */
export function atendeArea(areas, imovel, cidadePadrao = null) {
  const cid = normaliza(imovel.cidade); const bai = normaliza(imovel.bairro)
  if (!areas || !areas.length) return Boolean(cidadePadrao) && normaliza(cidadePadrao) === cid
  return areas.some((a) => normaliza(a.cidade) === cid && (!a.bairro || bai.startsWith(normaliza(a.bairro))))
}

/** Dia da semana (0 = domingo) de uma data ISO. */
export function diaSemana(data) { return inicioJanela(data, 12).getDay() }

/** A janela [hora, hora+janelas) cabe no atendimento do prestador nesse dia? disponibilidade: [{ dia_semana, hora_inicio, hora_fim }] */
export function atendeHorario(disponibilidade, data, hora, janelas) {
  const d = (disponibilidade || []).find((x) => x.dia_semana === diaSemana(data))
  return Boolean(d) && hora >= d.hora_inicio && hora + janelas <= d.hora_fim
}

/** Algum pedido ativo do prestador cruza a janela? pedidos: [{ id, prestador_id, data, janela_inicio, janelas, status }] */
export function conflitaAgenda(pedidos, prestador_id, data, hora, janelas, ignorar = null) {
  return pedidos.some((p) => p.id !== ignorar && p.prestador_id === prestador_id && p.data === data && OCUPA_AGENDA.includes(p.status) &&
    hora < p.janela_inicio + p.janelas && p.janela_inicio < hora + janelas)
}

/** Por que o prestador não pode nessa janela (null = pode). Mesma ordem do banco (_motivo_indisponivel). */
export function motivoIndisponivel({ prestador, imovel, data, hora, janelas, pedidos = [], agora = new Date(), ignorar = null }) {
  if (inicioJanela(data, hora).getTime() <= agora.getTime()) return 'passou'
  if (!respeitaAntecedencia(data, hora, agora)) return 'menos_de_3h'
  if (!atendeArea(prestador.areas, imovel, prestador.cidade)) return 'fora_da_area'
  if (!atendeHorario(prestador.disponibilidade, data, hora, janelas)) return 'fora_do_horario_do_profissional'
  if (conflitaAgenda(pedidos, prestador.id, data, hora, janelas, ignorar)) return 'profissional_ocupado'
  return null
}

/** Ordem da vitrine: maior nota, depois mais serviços, depois nome. */
export function ordenarMelhores(lista) {
  return [...lista].sort((a, b) => (b.nota_media ?? -1) - (a.nota_media ?? -1) || (b.n_servicos ?? 0) - (a.n_servicos ?? 0) || String(a.nome).localeCompare(String(b.nome)))
}

/** Prestadores livres para (imóvel, serviço, dia, hora), melhores primeiro.
 *  prestadores: [{ id, nome, cidade, servicos: [codigo], areas, disponibilidade, nota_media, n_servicos }] */
export function filtrarDisponiveis({ prestadores, imovel, servico, data, hora, pedidos = [], agora = new Date() }) {
  const livres = prestadores.filter((p) => (p.servicos || []).includes(servico.codigo) &&
    motivoIndisponivel({ prestador: p, imovel, data, hora, janelas: servico.janelas, pedidos, agora }) === null)
  return ordenarMelhores(livres)
}

/** Janelas do dia para (imóvel, serviço) com quantos prestadores livres: [{ janela_inicio, janela_fim, n_prestadores, motivo }] */
export function horariosDoDia({ prestadores, imovel, servico, data, pedidos = [], agora = new Date() }) {
  const out = []
  for (let h = HORA_ABRE; h + servico.janelas <= HORA_FECHA; h++) {
    let motivo = null; let n = 0
    if (inicioJanela(data, h).getTime() <= agora.getTime()) motivo = 'passou'
    else if (!respeitaAntecedencia(data, h, agora)) motivo = 'menos_de_3h'
    else {
      n = filtrarDisponiveis({ prestadores, imovel, servico, data, hora: h, pedidos, agora }).length
      if (!n) motivo = 'sem_profissional'
    }
    out.push({ janela_inicio: h, janela_fim: h + servico.janelas, n_prestadores: n, motivo })
  }
  return out
}

/** Texto curto para cada motivo (as telas mostram). */
export const MOTIVOS = {
  passou: 'Esse horário já passou.',
  menos_de_3h: 'Pedidos precisam de pelo menos 3h de antecedência.',
  fora_da_area: 'O profissional não atende essa região.',
  fora_do_horario_do_profissional: 'Fora do horário de atendimento do profissional.',
  profissional_ocupado: 'O profissional já tem outro serviço nesse horário.',
  sem_profissional: 'Nenhum profissional livre nesse horário.',
}

/** CPF (11) ou CNPJ (14) com dígitos verificadores (igual a concertai.documento_valido). */
export function documentoValido(doc) {
  const d = String(doc ?? '').replace(/\D/g, '')
  if (d.length === 11) {
    if (/^(\d)\1{10}$/.test(d)) return false
    for (const k of [10, 11]) {
      let s = 0
      for (let i = 1; i < k; i++) s += Number(d[i - 1]) * (k + 1 - i)
      let r = (s * 10) % 11; if (r === 10) r = 0
      if (r !== Number(d[k - 1])) return false
    }
    return true
  }
  if (d.length === 14) {
    if (/^(\d)\1{13}$/.test(d)) return false
    for (const k of [13, 14]) {
      const pesos = k === 13 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      let s = 0
      for (let i = 0; i < k - 1; i++) s += Number(d[i]) * pesos[i]
      const r = s % 11 < 2 ? 0 : 11 - (s % 11)
      if (r !== Number(d[k - 1])) return false
    }
    return true
  }
  return false
}

/** CNPJ só dígitos → 00.000.000/0000-00 */
export function formatarCnpj(c) {
  const d = String(c ?? '').replace(/\D/g, '')
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : c
}
