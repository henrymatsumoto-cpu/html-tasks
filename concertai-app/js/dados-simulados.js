// ConcertAI · FONTE DE DADOS SIMULADA (único arquivo com dado de mentira).
//
// Espelha o schema `concertai` do Supabase (T620, branch feat/t620-base-supabase):
// mesmas tabelas (snake_case, plural), mesmas colunas, mesmos status e as mesmas
// RPCs de escrita (criar_pedido, decidir_aprovacao, responder_pedido, avancar_pedido,
// cancelar_pedido, avaliar_pedido, janelas_disponiveis).
//
// Pra ligar no backend: criar `fonte-supabase.js` exportando AS MESMAS funções
// (assinaturas e formato de retorno iguais) e trocar o import em `api.js`.
// As telas nunca importam este arquivo direto: só `api.js`.
//
// Regras de negócio aqui são só pra demo navegar; no backend elas são código no
// banco/RPC (preço, permissão e aprovação nunca vêm da tela).

import { validarDadosPagamento, validarNF, mascararPix, garantiaDe, GARANTIA_COBRE, GARANTIA_NAO_COBRE, CARENCIA_DADOS_H } from './regras-pagamento.js?v=79617c8'
import { motivoIndisponivel, filtrarDisponiveis, horariosDoDia, ordenarMelhores, notaComPenalidade, confirmacaoExpirada,
  prazoConfirmacao, documentoValido, formatarCnpj, respeitaAntecedencia, PENALIDADE, HORA_ABRE, HORA_FECHA } from './regras-agenda.js?v=79617c8'
import { semearExtrasDemo } from './fonte-prestador.js?v=79617c8'
import { celularWhatsApp, janelaContato } from './whatsapp.js?v=79617c8'

const CHAVE = 'concertai.demo.v1'
const VERSAO = 7 // v7: anfitrião avulso e imóveis fora da Seazone; sobe quando a semente muda (v4: um exemplo de cada estado em cada tela das 3 visões; v5: pagamento, NF e garantia; v6: celulares e endereço)
const LIMITE_APROVACAO_CENTS = 30000 // pedido da franquia acima de R$ 300 = proprietário aprova
const VERSAO_TERMOS = 'v1'
const CHECK_IN_H = 15
const CHECK_OUT_H = 11

// ---------- datas (sempre relativas a hoje, pra demo nunca envelhecer) ----------
const hoje0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
export function isoDia(offset = 0, base = hoje0()) {
  const d = new Date(base); d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const paraData = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d) }
const agoraIso = () => new Date().toISOString()
const emHoras = (h) => new Date(Date.now() + h * 3600e3).toISOString()
const haMin = (m) => new Date(Date.now() - m * 60e3).toISOString()
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
/** 1º dia a partir de hoje+min que cai num dos dias da semana pedidos (0 = domingo). */
function diaDaSemana(min, dias = [1, 2, 3, 4, 5]) { let d = min; while (!dias.includes(paraData(isoDia(d)).getDay())) d++; return d }

// ---------- catálogo (Lote 1 do MVP, docs/descricoes.md + docs/catalogo.md) ----------
const categorias = [
  { codigo: 'AR', nome: 'Ar-condicionado', icone: 'air-vent' },
  { codigo: 'EL', nome: 'Elétrica', icone: 'zap' },
  { codigo: 'HI', nome: 'Hidráulica', icone: 'droplets' },
  { codigo: 'MA', nome: 'Marcenaria', icone: 'hammer' },
  { codigo: 'VI', nome: 'Vidraçaria', icone: 'app-window' },
]

const servicos = [
  {"codigo":  "AR-01", "categoria_codigo":  "AR", "nome":  "Limpeza de ar-condicionado até 12.000 BTU", "descricao":  "Lavagem completa do aparelho para tirar mofo, poeira e mau cheiro e o ar voltar a gelar bem.", "inclui":  ["Lavagem da parte interna e do filtro com bomba", "Produto bactericida e limpeza da bandeja", "Teste de dreno e de funcionamento", "Foto de antes e depois"], "nao_inclui":  ["Peças de reposição (peça à parte: você compra ou aprova o valor antes)", "Parte externa em altura sem acesso seguro", "Recarga de gás", "Conserto de defeito"], "preco_cents":  27200, "duracao_min":  60, "duracao_max":  90, "janelas":  2, "taxa_cents":  7000, "liquido_cents":  20200, "lote":  1, "aviso_peca":  "Não inclui peças de reposição: qualquer peça é comprada à parte (você compra ou aprova o valor antes)."},
  {"codigo":  "AR-03", "categoria_codigo":  "AR", "nome":  "Ar-condicionado pingando", "descricao":  "Desentope a saída de água do aparelho para ele parar de pingar dentro do imóvel.", "inclui":  ["Limpeza da mangueira de saída de água", "Limpeza da bandeja", "Teste de escoamento"], "nao_inclui":  ["Mangueira ou bomba de dreno nova (peça à parte: você compra ou aprova o valor antes)", "Troca de mangueira embutida na parede", "Bomba de dreno", "Limpeza completa do aparelho"], "preco_cents":  24100, "duracao_min":  45, "duracao_max":  60, "janelas":  1, "taxa_cents":  6000, "liquido_cents":  18100, "lote":  1, "aviso_peca":  "Não inclui mangueira ou bomba de dreno nova: qualquer peça é comprada à parte (você compra ou aprova o valor antes)."},
  {"codigo":  "EL-01", "categoria_codigo":  "EL", "nome":  "Troca de resistência do chuveiro", "descricao":  "Chuveiro sem esquentar? Troca a resistência e a água volta quente.", "inclui":  ["Desligamento do disjuntor", "Mão de obra da troca da resistência", "Teste com água"], "nao_inclui":  ["A resistência nova (peça à parte: você compra ou aprova o valor antes)", "Chuveiro novo", "Troca de fiação"], "preco_cents":  18200, "duracao_min":  30, "duracao_max":  45, "janelas":  1, "taxa_cents":  5000, "liquido_cents":  13200, "lote":  1, "aviso_peca":  "Não inclui a resistência nova: qualquer peça é comprada à parte (você compra ou aprova o valor antes)."},
  {"codigo":  "EL-02", "categoria_codigo":  "EL", "nome":  "Instalação ou troca de chuveiro elétrico", "descricao":  "Tira o chuveiro antigo e instala o novo com segurança.", "inclui":  ["Retirada do chuveiro antigo", "Instalação e vedação do chuveiro novo (você fornece)", "Teste e checagem do disjuntor"], "nao_inclui":  ["O chuveiro novo (peça à parte: você compra ou aprova o valor antes)", "Fiação nova ou mais grossa", "Troca de disjuntor", "Chuveiro a gás"], "preco_cents":  23300, "duracao_min":  45, "duracao_max":  60, "janelas":  1, "taxa_cents":  3000, "liquido_cents":  20300, "lote":  1, "aviso_peca":  "Não inclui o chuveiro novo: qualquer peça é comprada à parte (você compra ou aprova o valor antes)."},
  {"codigo":  "EL-03", "categoria_codigo":  "EL", "nome":  "Troca de tomada ou interruptor", "descricao":  "Troca uma tomada ou interruptor com defeito no mesmo lugar.", "inclui":  ["Mão de obra da troca da tomada ou interruptor e do espelho no ponto que já existe", "Teste de funcionamento"], "nao_inclui":  ["A tomada ou o interruptor novo (peça à parte: você compra ou aprova o valor antes)", "Ponto novo", "Passagem de fio nova", "Conserto de curto no circuito"], "preco_cents":  18000, "duracao_min":  20, "duracao_max":  40, "janelas":  1, "taxa_cents":  6000, "liquido_cents":  12000, "lote":  1, "aviso_peca":  "Não inclui a tomada ou o interruptor novo: qualquer peça é comprada à parte (você compra ou aprova o valor antes)."},
  {"codigo":  "EL-06", "categoria_codigo":  "EL", "nome":  "Troca de disjuntor", "descricao":  "Troca um disjuntor que desarma à toa ou não liga mais.", "inclui":  ["Mão de obra da troca de 1 disjuntor no quadro", "Reaperto das conexões", "Teste"], "nao_inclui":  ["O disjuntor novo (peça à parte: você compra ou aprova o valor antes)", "Troca do quadro de luz", "Instalação de DR (proteção contra choque)"], "preco_cents":  20000, "duracao_min":  30, "duracao_max":  45, "janelas":  1, "taxa_cents":  5000, "liquido_cents":  15000, "lote":  1, "aviso_peca":  "Não inclui o disjuntor novo: qualquer peça é comprada à parte (você compra ou aprova o valor antes)."},
  {"codigo":  "HI-01", "categoria_codigo":  "HI", "nome":  "Conserto de vazamento aparente", "descricao":  "Resolve vazamento que dá para ver: em cano, conexão ou mangueira.", "inclui":  ["Mão de obra da troca de vedação, conexão ou mangueira visível", "Teste sem vazamento"], "nao_inclui":  ["Conexão, vedação ou mangueira nova (peça à parte: você compra ou aprova o valor antes)", "Vazamento dentro da parede ou do piso (precisa de avaliação no local)", "Quebrar azulejo"], "preco_cents":  18700, "duracao_min":  45, "duracao_max":  90, "janelas":  2, "taxa_cents":  6000, "liquido_cents":  12700, "lote":  1, "aviso_peca":  "Não inclui conexão, vedação ou mangueira nova: qualquer peça é comprada à parte (você compra ou aprova o valor antes)."},
  {"codigo":  "HI-02", "categoria_codigo":  "HI", "nome":  "Desentupimento de pia, ralo ou vaso", "descricao":  "Desentope um ponto da casa e deixa a água descendo normal.", "inclui":  ["1 ponto (pia, ralo ou vaso)", "Desentupidor ou mola manual", "Teste de escoamento"], "nao_inclui":  ["Sifão, mangueira ou outra peça nova (peça à parte: você compra ou aprova o valor antes)", "Esgoto ou caixa de gordura", "Cano geral do prédio"], "preco_cents":  18300, "duracao_min":  45, "duracao_max":  60, "janelas":  1, "taxa_cents":  6000, "liquido_cents":  12300, "lote":  1, "aviso_peca":  "Não inclui sifão, mangueira ou outra peça nova: qualquer peça é comprada à parte (você compra ou aprova o valor antes)."},
  {"codigo":  "HI-04", "categoria_codigo":  "HI", "nome":  "Troca de torneira ou sifão", "descricao":  "Troca a torneira ou o sifão com defeito por um novo.", "inclui":  ["Retirada da peça antiga", "Instalação e vedação da torneira ou sifão novo (você fornece)", "Teste"], "nao_inclui":  ["A torneira ou o sifão novo (peça à parte: você compra ou aprova o valor antes)", "Troca de bancada ou cuba", "Conserto de vazamento na parede"], "preco_cents":  17500, "duracao_min":  30, "duracao_max":  60, "janelas":  1, "taxa_cents":  5000, "liquido_cents":  12500, "lote":  1, "aviso_peca":  "Não inclui a torneira ou o sifão novo: qualquer peça é comprada à parte (você compra ou aprova o valor antes)."},
  {"codigo":  "HI-06", "categoria_codigo":  "HI", "nome":  "Instalação de ducha higiênica", "descricao":  "Instala a ducha ao lado do vaso no ponto de água que já existe.", "inclui":  ["Instalação da ducha (você fornece) no ponto existente", "Vedação", "Teste"], "nao_inclui":  ["A ducha higiênica (peça à parte: você compra ou aprova o valor antes)", "Ponto de água novo", "Quebrar azulejo"], "preco_cents":  17200, "duracao_min":  30, "duracao_max":  45, "janelas":  1, "taxa_cents":  4500, "liquido_cents":  12700, "lote":  1, "aviso_peca":  "Não inclui a ducha higiênica: qualquer peça é comprada à parte (você compra ou aprova o valor antes)."},
  {"codigo":  "HI-05", "categoria_codigo":  "HI", "nome":  "Conserto de descarga", "descricao":  "Descarga que não para ou não funciona: conserta ou troca o mecanismo.", "inclui":  ["Mão de obra do reparo ou da troca do mecanismo", "Regulagem", "Teste"], "nao_inclui":  ["O reparo ou mecanismo novo da descarga (peça à parte: você compra ou aprova o valor antes)", "Troca do vaso", "Válvula embutida que exige quebrar parede"], "preco_cents":  20700, "duracao_min":  45, "duracao_max":  75, "janelas":  2, "taxa_cents":  5000, "liquido_cents":  15700, "lote":  1, "aviso_peca":  "Não inclui o reparo ou mecanismo novo da descarga: qualquer peça é comprada à parte (você compra ou aprova o valor antes)."},
  {"codigo":  "MA-01", "categoria_codigo":  "MA", "nome":  "Ajuste de porta, dobradiça ou trilho", "descricao":  "Porta arrastando, caída ou sem fechar: ajusta e deixa fechando bem.", "inclui":  ["Regulagem da porta", "Mão de obra da troca de dobradiça ou roldana", "Plaina quando precisar"], "nao_inclui":  ["Dobradiça, roldana ou trilho novo (peça à parte: você compra ou aprova o valor antes)", "Porta nova", "Batente novo"], "preco_cents":  16700, "duracao_min":  45, "duracao_max":  60, "janelas":  1, "taxa_cents":  4500, "liquido_cents":  12200, "lote":  1, "aviso_peca":  "Não inclui dobradiça, roldana ou trilho novo: qualquer peça é comprada à parte (você compra ou aprova o valor antes)."},
  {"codigo":  "MA-02", "categoria_codigo":  "MA", "nome":  "Conserto simples de móvel", "descricao":  "Conserta mecanismo de sofá, braço solto ou gaveta com problema.", "inclui":  ["Reaperto e cola", "Mão de obra da troca de corrediça ou mecanismo simples"], "nao_inclui":  ["Corrediça, mecanismo ou ferragem nova (peça à parte: você compra ou aprova o valor antes)", "Reforma do móvel", "Troca de estofado"], "preco_cents":  17000, "duracao_min":  45, "duracao_max":  60, "janelas":  1, "taxa_cents":  4500, "liquido_cents":  12500, "lote":  1, "aviso_peca":  "Não inclui corrediça, mecanismo ou ferragem nova: qualquer peça é comprada à parte (você compra ou aprova o valor antes)."},
  {"codigo":  "VI-03", "categoria_codigo":  "VI", "nome":  "Pequeno conserto em janela ou vidraça", "descricao":  "Conserta fecho, vedação, silicone ou puxador de janela e vidraça.", "inclui":  ["Reparo no local", "Mão de obra da troca de fecho, vedação ou puxador"], "nao_inclui":  ["Fecho, vedação, silicone ou puxador novo (peça à parte: você compra ou aprova o valor antes)", "Vidro novo", "Esquadria nova"], "preco_cents":  17700, "duracao_min":  45, "duracao_max":  60, "janelas":  1, "taxa_cents":  4500, "liquido_cents":  13200, "lote":  1, "aviso_peca":  "Não inclui fecho, vedação, silicone ou puxador novo: qualquer peça é comprada à parte (você compra ou aprova o valor antes)."}
]

const FOTO = {
  lagoa: 'https://jjdulakciihexvezfdcq.supabase.co/storage/v1/object/public/spots/lagoa-spot-ambiente-27.11.25-007-scaled.jpg',
  rosa: 'https://jjdulakciihexvezfdcq.supabase.co/storage/v1/object/public/spots/rosa-spot-ambiente-11-12-25-003-scaled.jpg',
  manh: 'https://jjdulakciihexvezfdcq.supabase.co/storage/v1/object/public/spots/manhattan-capa.jpg',
  e26: 'https://vqwgsgwbetfyoybdjmbs.supabase.co/storage/v1/object/public/spot-photos/covers/emp_26.jpg',
  e21: 'https://vqwgsgwbetfyoybdjmbs.supabase.co/storage/v1/object/public/spot-photos/covers/emp_21.jpg',
  e22: 'https://vqwgsgwbetfyoybdjmbs.supabase.co/storage/v1/object/public/spot-photos/covers/emp_22.jpg',
}

// ---------- estado inicial (dados fictícios: nomes, CNPJs e imóveis não são reais) ----------
function semente() {
  // celulares fictícios (55489999xxxx) para o contato por WhatsApp depois do aceite (REGRA de 17/11)
  const franquias = [{ id: 'fr-1', nome: 'Franquia Norte da Ilha', cidade: 'Florianópolis', celular: '554899990100' }]
  const proprietarios = [
    { id: 'pr-1', nome: 'Carla Mendes', email: 'carla@exemplo.com', telefone: '48999990001', documento: null },
    { id: 'pr-2', nome: 'Paulo Reis', email: 'paulo@exemplo.com', telefone: '4899990002', documento: null },
    { id: 'pr-3', nome: 'Rui Tavares', email: 'rui@exemplo.com', telefone: null, documento: null }, // sem celular: "contato indisponível"
    // anfitriões avulsos (T807): proprietarios.tipo = 'anfitriao', sem imóvel na Seazone, pagam no ato
    { id: 'anf-1', tipo: 'anfitriao', nome: 'Lúcia Ferraz', email: 'anfitriao1@demo.concertai.dev', telefone: '48999990011', documento: '52998224725', documento_tipo: 'cpf', telefone_verificado_em: haMin(9 * 1440), criado_em: haMin(30 * 1440) },
    { id: 'anf-2', tipo: 'anfitriao', nome: 'Rodrigo Alves', email: 'anfitriao2@demo.concertai.dev', telefone: '48999990022', documento: '11222333000181', documento_tipo: 'cnpj', telefone_verificado_em: haMin(4 * 1440), criado_em: haMin(12 * 1440) },
  ]
  const imoveis = [
    { id: 'im-1', codigo: 'FLN0412', nome: 'Apto Jurerê 2q', bairro: 'Jurerê', cidade: 'Florianópolis', quartos: 2, franquia_id: 'fr-1', proprietario_id: 'pr-1', foto_url: FOTO.lagoa },
    { id: 'im-2', codigo: 'FLN0219', nome: 'Apto Lagoa 2q', bairro: 'Lagoa da Conceição', cidade: 'Florianópolis', quartos: 2, franquia_id: 'fr-1', proprietario_id: 'pr-1', foto_url: FOTO.e26 },
    { id: 'im-3', codigo: 'FLN0388', nome: 'Apto Canasvieiras 1q', bairro: 'Canasvieiras', cidade: 'Florianópolis', quartos: 1, franquia_id: 'fr-1', proprietario_id: 'pr-2', foto_url: FOTO.rosa },
    { id: 'im-4', codigo: 'FLN0631', nome: 'Casa Campeche 3q', bairro: 'Campeche', cidade: 'Florianópolis', quartos: 3, franquia_id: 'fr-1', proprietario_id: 'pr-3', foto_url: FOTO.manh },
    // fora da Seazone (sem franquia no anfitrião; paga no ato): 2 da Lúcia, 1 do Rodrigo, 1 da Carla (proprietária) e 1 da franquia
    { id: 'av-1', codigo: 'AV-1', nome: 'Apto Campeche', tipo: 'apartamento', bairro: 'Campeche', cidade: 'Florianópolis', uf: 'SC', quartos: 2, franquia_id: null, proprietario_id: 'anf-1', foto_url: null, fora_seazone: true, ativo: true, lat: -27.6766, lng: -48.4862 },
    { id: 'av-2', codigo: 'AV-2', nome: 'Casa Ingleses', tipo: 'casa', bairro: 'Ingleses', cidade: 'Florianópolis', uf: 'SC', quartos: 3, franquia_id: null, proprietario_id: 'anf-1', foto_url: null, fora_seazone: true, ativo: true, lat: -27.4361, lng: -48.3946 },
    { id: 'av-3', codigo: 'AV-3', nome: 'Studio Trindade', tipo: 'studio', bairro: 'Trindade', cidade: 'Florianópolis', uf: 'SC', quartos: 1, franquia_id: null, proprietario_id: 'anf-2', foto_url: null, fora_seazone: true, ativo: true, lat: -27.5885, lng: -48.5224 },
    { id: 'av-4', codigo: 'AV-4', nome: 'Casa de praia Canasvieiras', tipo: 'casa', bairro: 'Canasvieiras', cidade: 'Florianópolis', uf: 'SC', quartos: 3, franquia_id: null, proprietario_id: 'pr-1', foto_url: null, fora_seazone: true, ativo: true },
    { id: 'av-5', codigo: 'AV-5', nome: 'Apto Centro (cliente particular)', tipo: 'apartamento', bairro: 'Centro', cidade: 'Florianópolis', uf: 'SC', quartos: 1, franquia_id: 'fr-1', proprietario_id: null, foto_url: null, fora_seazone: true, ativo: true },
  ]
  // endereço completo (no banco: cz_imoveis_privado, só por função; o prestador vê a partir do aceite)
  const imoveis_privado = {
    'im-1': { logradouro: 'Rua das Gaivotas, 120, apto 302' },
    'im-2': { logradouro: 'Rua Laurindo Januário da Silveira, 2450, casa 4' },
    'im-3': { logradouro: 'Av. das Nações, 515, apto 104' },
    'im-4': { logradouro: 'Rua Pequeno Príncipe, 88' },
    'av-1': { cep: '88063-000', logradouro: 'Av. Pequeno Príncipe', numero: '1200', complemento: 'apto 204', acesso_tipo: 'cofre', acesso_quem_abre: 'eu', acesso_instrucoes: 'Cofre de chave no portão, código 4821.', ical_url: 'https://www.airbnb.com.br/calendar/ical/123456.ics' },
    'av-2': { cep: '88058-000', logradouro: 'Rua das Gaivotas', numero: '77', complemento: '', acesso_tipo: 'presencial', acesso_quem_abre: 'vizinho_zelador', acesso_instrucoes: 'Seu Jair (vizinho da casa 79) abre o portão.', ical_url: null },
    'av-3': { cep: '88036-000', logradouro: 'Rua Lauro Linhares', numero: '900', complemento: 'sala 3', acesso_tipo: 'portaria', acesso_quem_abre: 'portaria', acesso_instrucoes: 'Avisar na portaria, nome do Rodrigo.', ical_url: null },
    'av-4': { cep: '88054-000', logradouro: 'Rua Hermes Guedes da Fonseca', numero: '310', complemento: '', acesso_tipo: 'chave', acesso_quem_abre: 'eu', acesso_instrucoes: 'Chave com a Carla.', ical_url: null },
    'av-5': { cep: '88010-400', logradouro: 'Rua Felipe Schmidt', numero: '515', complemento: 'apto 802', acesso_tipo: 'portaria', acesso_quem_abre: 'portaria', acesso_instrucoes: 'Portaria 24h.', ical_url: null },
  }
  const r = (id, imovel_id, a, b) => ({ id, imovel_id, check_in: isoDia(a), check_out: isoDia(b) })
  const reservas = [
    r('rs-1', 'im-1', -3, 1), r('rs-2', 'im-1', 4, 8), r('rs-3', 'im-1', 12, 16), r('rs-4', 'im-1', 20, 27),
    r('rs-5', 'im-2', 1, 4), r('rs-6', 'im-2', 9, 14), r('rs-7', 'im-2', 19, 22),
    r('rs-8', 'im-3', -1, 3), r('rs-9', 'im-3', 7, 11), r('rs-10', 'im-3', 15, 19),
    r('rs-11', 'im-4', 0, 5), r('rs-12', 'im-4', 8, 12), r('rs-13', 'im-4', 17, 23),
  ]
  // prestadores com áreas e horários diferentes (pra demo mostrar o filtro "quem está livre")
  const FLN = 'Florianópolis'
  const area = (cidade, ...bairros) => (bairros.length ? bairros.map((bairro) => ({ cidade, uf: 'SC', bairro })) : [{ cidade, uf: 'SC', bairro: null }])
  const horario = (dias, hora_inicio, hora_fim) => dias.map((dia_semana) => ({ dia_semana, hora_inicio, hora_fim }))
  const prestadores = [
    { id: 'pt-1', celular: '554899990101', nome: 'Marcos T.', razao_social: 'MT Climatização e Elétrica MEI', tipo_pj: 'MEI', nota_base: 4.9, n_servicos: 312, bio: 'Técnico em refrigeração e eletricista. Responde em 15 min.', cats: ['AR', 'EL'],
      areas: area(FLN, 'Jurerê', 'Canasvieiras', 'Ingleses', 'Cachoeira do Bom Jesus', 'Ponta das Canas', 'Santo Antônio de Lisboa', 'Praia Brava', 'Daniela'),
      disp: [...horario([1, 2, 3, 4, 5], 8, 17), ...horario([6], 8, 12)] },
    { id: 'pt-2', celular: '554899990201', nome: 'Rafaela S.', razao_social: 'RS Ar Condicionado ME', tipo_pj: 'ME', nota_base: 4.8, n_servicos: 184, bio: 'Pontual em 98% das visitas.', cats: ['AR'],
      areas: area(FLN), disp: horario([2, 3, 4, 5, 6], 9, 17) },
    { id: 'pt-3', celular: '554899990301', nome: 'Jonas P.', razao_social: 'Jonas Reparos MEI', tipo_pj: 'MEI', nota_base: 4.7, n_servicos: 203, bio: 'Atende o Centro e a região da UFSC, só de manhã.', cats: ['EL', 'HI'],
      areas: area(FLN, 'Centro', 'Trindade', 'Córrego Grande', 'Itacorubi', 'Pantanal', 'Agronômica', 'Carvoeira', 'Saco Grande', 'Coqueiros', 'Estreito'),
      disp: horario([1, 2, 3, 4, 5], 8, 13) },
    { id: 'pt-4', celular: '554899990401', nome: 'Elisa M.', razao_social: 'EM Manutenção Residencial MEI', tipo_pj: 'MEI', nota_base: 4.9, n_servicos: 97, bio: 'Fotos caprichadas de antes e depois. Leste e sul da Ilha.', cats: ['HI', 'MA', 'VI'],
      areas: area(FLN, 'Lagoa da Conceição', 'Barra da Lagoa', 'Campeche', 'Rio Tavares', 'Morro das Pedras', 'Armação', 'Ribeirão da Ilha', 'Porto da Lagoa', 'Canto da Lagoa'),
      disp: [...horario([1, 2, 3, 4, 5], 13, 17), ...horario([6], 8, 13)] },
    { id: 'pt-5', celular: '554899990501', nome: 'Diego A.', razao_social: 'DA Serviços Hidráulicos MEI', tipo_pj: 'MEI', nota_base: 4.6, n_servicos: 256, bio: 'Atende a Ilha toda, inclusive domingo de manhã.', cats: ['EL', 'HI'],
      areas: area(FLN), disp: [...horario([1, 2, 3, 4, 5, 6], 8, 17), ...horario([0], 9, 13)] },
    { id: 'pt-6', nome: 'Bruno L.', razao_social: 'BL Esquadrias ME', tipo_pj: 'ME', nota_base: 4.6, n_servicos: 141, bio: 'Responde em 20 min.', cats: ['MA', 'VI'],
      areas: area(FLN), disp: horario([1, 3, 5], 8, 17) },
    { id: 'pt-7', celular: '554899990701', nome: 'Tiago R.', razao_social: 'TR Manutenção Serrana MEI', tipo_pj: 'MEI', nota_base: 4.5, n_servicos: 64, bio: 'Anitápolis e sul da Ilha.', cats: ['AR', 'EL', 'HI'],
      areas: [...area('Anitápolis'), ...area(FLN, 'Campeche', 'Rio Tavares')], disp: horario([1, 2, 3, 4, 5], 8, 17) },
    { id: 'pt-8', celular: '554899990801', nome: 'Paula C.', razao_social: 'PC Reparos e Montagens MEI', tipo_pj: 'MEI', nota_base: 4.8, n_servicos: 58, bio: 'Norte da Ilha, elétrica e marcenaria leve.', cats: ['EL', 'MA'],
      areas: area(FLN, 'Ingleses', 'Santinho', 'Canasvieiras', 'Jurerê'), disp: [...horario([1, 2, 3, 4, 5], 9, 16), ...horario([6], 8, 12)] },
  ]
  const prestador_servicos = []; const prestador_areas = []; const disponibilidades = []
  prestadores.forEach((p, i) => {
    for (const s of servicos) if (p.cats.includes(s.categoria_codigo)) prestador_servicos.push({ prestador_id: p.id, servico_codigo: s.codigo })
    for (const a of p.areas) prestador_areas.push({ prestador_id: p.id, ...a })
    for (const d of p.disp) disponibilidades.push({ prestador_id: p.id, ...d })
    Object.assign(p, { cidade: p.areas[0].cidade, cnpj: cnpjDemo(i + 1), foto_url: null, atualizado_em: null })
    delete p.cats; delete p.areas; delete p.disp
  })

  const perfis = [
    { user_id: 'u-prop', papel: 'proprietario', nome: 'Carla Mendes', proprietario_id: 'pr-1' },
    { user_id: 'u-fra', papel: 'franquia', nome: 'Franquia Norte da Ilha', franquia_id: 'fr-1' },
    { user_id: 'u-pres', papel: 'prestador', nome: 'Marcos T.', prestador_id: 'pt-1' },
    { user_id: 'u-anf1', papel: 'anfitriao', nome: 'Lúcia Ferraz', proprietario_id: 'anf-1' },
    { user_id: 'u-anf2', papel: 'anfitriao', nome: 'Rodrigo Alves', proprietario_id: 'anf-2' },
  ]

  const st = { franquias, proprietarios, imoveis, imoveis_privado, reservas, categorias, servicos, prestadores, prestador_servicos, prestador_areas, disponibilidades, perfis, termos_aceites: [], pedidos: [], aprovacoes: [], transicoes: [], fotos: [], avaliacoes: [], penalidades: [], notificacoes: [], cobrancas: [], codigos: {}, seq: 1037, sessao: 'u-prop' }

  // pedidos de exemplo, um em cada status relevante
  const p = (o) => criarInterno(st, o, { semNotificar: true })
  p({ imovel_id: 'im-1', servico_codigo: 'EL-01', prestador_id: 'pt-8', comprador_papel: 'proprietario', data: isoDia(-6), janela_inicio: 14, status: 'concluido' })
  st.avaliacoes.push({ pedido_id: st.pedidos.at(-1).id, nota: 5, comentario: 'Rápido e deixou tudo limpo.', criado_em: agoraIso() })
  p({ imovel_id: 'im-1', servico_codigo: 'HI-06', prestador_id: 'pt-5', comprador_papel: 'proprietario', data: isoDia(-1), janela_inicio: 10, status: 'prova_enviada' })
  st.fotos.push({ id: 'ft-1', pedido_id: st.pedidos.at(-1).id, tipo: 'antes', storage_path: FOTO.e21 }, { id: 'ft-2', pedido_id: st.pedidos.at(-1).id, tipo: 'depois', storage_path: FOTO.e22 })
  p({ imovel_id: 'im-1', servico_codigo: 'AR-01', prestador_id: 'pt-1', comprador_papel: 'proprietario', data: isoDia(3), janela_inicio: 9, status: 'confirmado' })
  p({ imovel_id: 'im-1', servico_codigo: 'AR-03', prestador_id: 'pt-2', comprador_papel: 'franquia', data: isoDia(5), janela_inicio: 10, observacao: 'Ar da sala pingando no piso, hóspede reclamou.' })
  p({ imovel_id: 'im-2', servico_codigo: 'MA-01', prestador_id: 'pt-4', comprador_papel: 'franquia', data: isoDia(2), janela_inicio: 13, status: 'confirmado' })
  p({ imovel_id: 'im-1', servico_codigo: 'EL-03', prestador_id: 'pt-1', comprador_papel: 'proprietario', data: isoDia(1), janela_inicio: 14 })
  st.pedidos.at(-1).confirmar_ate = new Date(Date.now() + 45 * 60e3).toISOString() // chegou há 15 min: falta 45 min para confirmar
  p({ imovel_id: 'im-3', servico_codigo: 'EL-03', prestador_id: 'pt-1', comprador_papel: 'franquia', data: isoDia(0), janela_inicio: 15, status: 'confirmado' })
  p({ imovel_id: 'im-4', servico_codigo: 'HI-02', prestador_id: 'pt-5', comprador_papel: 'franquia', data: isoDia(1), janela_inicio: 8, status: 'aguardando_prestador' })
  st.pedidos.at(-1).confirmar_ate = new Date(Date.now() - 10 * 60e3).toISOString() // passou 1h sem resposta: expira ao abrir e a franquia troca
  const pdNovo = st.pedidos.find((x) => x.id === 'pd-1043'); pdNovo.demo_prazo_min = 45; pdNovo.criado_em = haMin(15)

  // 17/11 (pagamento, NF e garantia): serviços do Marcos (pt-1), um em cada situação do pagamento
  st.dados_pagamento = { 'pt-1': { atual: { pix_tipo: 'cnpj', pix_chave: prestadores[0].cnpj.replace(/\D/g, ''), banco: '260 Nu Pagamentos', agencia: '0001', conta: '8812345-6',
    conta_tipo: 'corrente', titular_nome: prestadores[0].razao_social, titular_documento: prestadores[0].cnpj.replace(/\D/g, '') }, pendente: null, atualizado_em: agoraIso() } }
  const comNF = (x, nf, pagoDias = null) => {
    if (!nf) return x
    const dp = st.dados_pagamento['pt-1'].atual
    Object.assign(x, { nf_path: `NF-${x.numero}.pdf`, nf_numero: String(x.numero - 900), nf_valor_cents: x.preco_cents, nf_emitida_em: x.data, nf_enviada_em: `${x.data}T18:00:00`,
      nf_status: nf, pagamento_dados_confirmados_em: `${x.data}T18:00:00`, pagamento_dados_ref: { pix_tipo: dp.pix_tipo, pix_chave_mascarada: mascararPix(dp.pix_tipo, dp.pix_chave), banco: dp.banco, titular_documento: dp.titular_documento } })
    if (x.status === 'concluido' && !x.concluido_em) x.concluido_em = x.data
    if (pagoDias !== null) x.prestador_pago_em = haMin(pagoDias * 1440)
    return x
  }
  const feito = (o, nf = null) => {
    p({ prestador_id: 'pt-1', comprador_papel: 'proprietario', ...o })
    const x = st.pedidos.at(-1)
    if (o.status === 'concluido') x.concluido_em = o.data
    st.fotos.push({ id: `ft-a${x.numero}`, pedido_id: x.id, tipo: 'antes', storage_path: FOTO.e21 }, { id: `ft-d${x.numero}`, pedido_id: x.id, tipo: 'depois', storage_path: FOTO.e22 })
    return comNF(x, nf)
  }
  feito({ imovel_id: 'im-2', servico_codigo: 'AR-01', data: isoDia(-120), janela_inicio: 9, status: 'concluido' }, 'aprovada').prestador_pago_em = `${isoDia(-118)}T10:00:00`
  feito({ imovel_id: 'im-4', servico_codigo: 'EL-03', data: isoDia(-45), janela_inicio: 10, status: 'concluido' }, 'aprovada').prestador_pago_em = `${isoDia(-43)}T10:00:00`
  feito({ imovel_id: 'im-1', servico_codigo: 'AR-01', data: isoDia(-25), janela_inicio: 13, status: 'concluido' }, 'em_conferencia')
  feito({ imovel_id: 'im-3', servico_codigo: 'EL-01', data: isoDia(-12), janela_inicio: 9, status: 'concluido' })
  feito({ imovel_id: 'im-2', servico_codigo: 'EL-03', data: isoDia(-1), janela_inicio: 9, status: 'prova_enviada' })
  // em atendimento agora: já tem a foto do depois, falta concluir com a NF
  feito({ imovel_id: 'im-4', servico_codigo: 'AR-01', data: isoDia(0), janela_inicio: 8, status: 'em_execucao' })

  // ---- v4: um exemplo de cada estado em cada tela (pedido do Henry, 17/11). Datas relativas a hoje/agora. ----
  // Marcos T. (pt-1) é o prestador logado na demo: ele precisa ter novo, hoje, em andamento, próximos, concluídos,
  // recusado, expirado e ganhos de mais de um mês. Os ids pd-1038..pd-1045 acima ficam fixos (E2E).
  const extras = {}
  const ex = (o, mais = {}) => { const x = p(o); Object.assign(x, mais); return x }
  const fotos = (ped, ...tipos) => tipos.forEach(([tipo, url], i) => st.fotos.push({ id: `ft-${ped.id}-${i}`, pedido_id: ped.id, tipo, storage_path: url }))
  const avaliar = (ped, nota, comentario, dias) => st.avaliacoes.push({ pedido_id: ped.id, nota, comentario, criado_em: haMin(dias * 1440) })
  const pago = (ped) => ({ pagamento_status: 'descontado', repasse_mes: MESES[paraData(ped.data).getMonth()] })
  const ck = (ped, feitos) => (ped.servico_codigo && st.servicos.find((s) => s.codigo === ped.servico_codigo).inclui.map((item, i) => ({ item, feito: i < feitos })))
  const mat = (ped, descricao, valor_cents, status, min) => ({ id: `mt-${ped.id}-${valor_cents}`, pedido_id: ped.id, descricao, valor_cents, foto_id: null, status, created_at: haMin(min) })
  const nf = (dias) => ({ caminho: 'nf-servico.pdf', url: '', enviada_em: haMin(dias * 1440) })
  const horaAgora = new Date().getHours()

  // pedido novo URGENTE (12 min para vencer), franquia, proprietário já aprovou (> R$ 300), com recado do cliente
  const dNovo = diaDaSemana(2)
  const novoUrg = ex({ imovel_id: 'im-3', servico_codigo: 'AR-03', prestador_id: 'pt-1', comprador_papel: 'franquia', data: isoDia(dNovo), janela_inicio: 14, status: 'aguardando_prestador',
    observacao: 'Ar do quarto pingando em cima da cama. Hóspede chega no dia seguinte.' }, { demo_prazo_min: 12, criado_em: haMin(48) })

  // em andamento AGORA (check-in feito) com peça esperando aprovação da proprietária
  const emAnd = ex({ imovel_id: 'im-1', servico_codigo: 'EL-01', prestador_id: 'pt-1', comprador_papel: 'proprietario', data: isoDia(0), janela_inicio: Math.min(13, Math.max(8, horaAgora - 1)), status: 'em_execucao',
    observacao: 'Chuveiro do banheiro da suíte não esquenta.' })
  fotos(emAnd, ['antes', FOTO.e21])
  extras[emAnd.id] = { checklist: ck(emAnd, 1), materiais: [mat(emAnd, 'Resistência 220V 6800W (Lorenzetti)', 4890, 'pendente', 10)], nf: null }

  // próximo com hóspede no dia (aviso), franquia, abaixo de R$ 300
  const dHosp = [8, 9, 10].find((d) => paraData(isoDia(d)).getDay() >= 1 && paraData(isoDia(d)).getDay() <= 5) ?? 8
  ex({ imovel_id: 'im-3', servico_codigo: 'EL-02', prestador_id: 'pt-1', comprador_papel: 'franquia', data: isoDia(dHosp), janela_inicio: 10, status: 'confirmado' })

  // fotos enviadas ontem (franquia confere)
  const prova = ex({ imovel_id: 'im-3', servico_codigo: 'EL-06', prestador_id: 'pt-1', comprador_papel: 'franquia', data: isoDia(-1), janela_inicio: 9, status: 'prova_enviada' })
  fotos(prova, ['antes', FOTO.e22], ['depois', FOTO.e21])
  extras[prova.id] = { checklist: ck(prova, 3), materiais: [], nf: nf(1) }
  comNF(prova, 'em_conferencia')

  // concluídos (Ganhos): a receber (este mês) e pagos (este mês e meses anteriores), com fotos, NF e avaliação
  const c1 = ex({ imovel_id: 'im-1', servico_codigo: 'AR-01', prestador_id: 'pt-1', comprador_papel: 'proprietario', data: isoDia(-3), janela_inicio: 9, status: 'concluido' }, { pagamento_status: 'a_descontar_repasse' })
  fotos(c1, ['antes', FOTO.e21], ['depois', FOTO.e22])
  avaliar(c1, 5, 'Ar gelando de novo e deixou tudo limpo. Mandou foto de tudo.', 2)
  extras[c1.id] = { checklist: ck(c1, 4), materiais: [mat(c1, 'Filtro de ar novo', 3990, 'aprovado', 3 * 1440)], nf: nf(3) }
  comNF(c1, 'em_conferencia')
  const c2 = ex({ imovel_id: 'im-3', servico_codigo: 'EL-03', prestador_id: 'pt-1', comprador_papel: 'franquia', data: isoDia(-9), janela_inicio: 14, status: 'concluido' })
  Object.assign(c2, pago(c2)); fotos(c2, ['depois', FOTO.e22])
  avaliar(c2, 4, 'Bom serviço, chegou 20 min depois do horário.', 8)
  extras[c2.id] = { checklist: ck(c2, 2), materiais: [mat(c2, 'Espelho de tomada dourado', 5500, 'recusado', 9 * 1440)], nf: nf(9) }
  comNF(c2, 'aprovada', 8)
  const c3 = ex({ imovel_id: 'im-1', servico_codigo: 'EL-06', prestador_id: 'pt-1', comprador_papel: 'proprietario', data: isoDia(-20), janela_inicio: 10, status: 'concluido' })
  Object.assign(c3, pago(c3)); fotos(c3, ['depois', FOTO.e21]) // sem avaliação: a proprietária ainda pode avaliar
  if (!c3.concluido_em) c3.concluido_em = c3.data // sem NF: o valor do Marcos fica bloqueado em Ganhos
  const c4 = ex({ imovel_id: 'im-3', servico_codigo: 'AR-01', prestador_id: 'pt-1', comprador_papel: 'franquia', data: isoDia(-38), janela_inicio: 8, status: 'concluido' })
  Object.assign(c4, pago(c4)); fotos(c4, ['depois', FOTO.e22]); avaliar(c4, 5, 'Excelente, muito caprichoso.', 37); comNF(c4, 'aprovada', 36)
  const c5 = ex({ imovel_id: 'im-1', servico_codigo: 'EL-01', prestador_id: 'pt-1', comprador_papel: 'proprietario', data: isoDia(-52), janela_inicio: 15, status: 'concluido' })
  Object.assign(c5, pago(c5)); fotos(c5, ['depois', FOTO.e21]); avaliar(c5, 5, null, 51); comNF(c5, 'aprovada', 50)

  // Marcos RECUSOU (−0,1) e a franquia já passou para a Paula (pedido novo confirmado, ligado ao antigo)
  const dRec = diaDaSemana(5)
  const rec = ex({ imovel_id: 'im-3', servico_codigo: 'EL-06', prestador_id: 'pt-1', comprador_papel: 'franquia', data: isoDia(dRec), janela_inicio: 10, status: 'recusado_prestador' },
    { recusa_tipo: 'recusou', observacao_prestador: 'Estou sem carro nesse dia.', pagamento_status: 'nao_cobrado', criado_em: haMin(2 * 1440) })
  penalizar(st, rec, 'recusou'); st.penalidades.at(-1).criado_em = haMin(2 * 1440)
  ex({ imovel_id: 'im-3', servico_codigo: 'EL-06', prestador_id: 'pt-8', comprador_papel: 'franquia', data: isoDia(dRec), janela_inicio: 10, status: 'confirmado', substitui_pedido_id: rec.id })

  // Marcos deixou EXPIRAR (−0,2): a proprietária ainda pode trocar o profissional (botão Trocar profissional)
  const dExp = diaDaSemana(3, [2, 3, 4, 5]) // terça a sexta: a Rafaela (ar) atende e aparece na troca
  const exp = ex({ imovel_id: 'im-1', servico_codigo: 'AR-03', prestador_id: 'pt-1', comprador_papel: 'proprietario', data: isoDia(dExp), janela_inicio: 13, status: 'recusado_prestador' },
    { recusa_tipo: 'expirou', pagamento_status: 'nao_cobrado', criado_em: haMin(130) })
  penalizar(st, exp, 'expirou'); st.penalidades.at(-1).criado_em = haMin(70)

  // compradores: recusado pela proprietária e cancelado
  const recProp = ex({ imovel_id: 'im-2', servico_codigo: 'AR-01', prestador_id: 'pt-2', comprador_papel: 'franquia', data: isoDia(diaDaSemana(6, [2, 3, 4, 5, 6])), janela_inicio: 9, status: 'recusado_proprietario',
    observacao: 'Limpeza preventiva antes da alta temporada.' }, { pagamento_status: 'nao_cobrado' })
  Object.assign(st.aprovacoes.find((a) => a.pedido_id === recProp.id), { decisao: 'recusado', decidido_em: haMin(26 * 60) })
  ex({ imovel_id: 'im-2', servico_codigo: 'HI-04', prestador_id: 'pt-4', comprador_papel: 'proprietario', data: isoDia(diaDaSemana(4)), janela_inicio: 14, status: 'cancelado' },
    { motivo_cancelamento: 'O hóspede trocou a torneira por conta própria.', pagamento_status: 'nao_cobrado' })

  // avisos do sino (lidos e não lidos), um de cada tipo
  const fr = (ped) => `${fmtCurto(ped.data)}, ${ped.janela_inicio}h–${ped.janela_inicio + ped.janelas}h`
  const nt = (id, user_id, min, titulo, corpo, link, lida = false) => st.notificacoes.push({ id, user_id, titulo, corpo, link, lida_em: lida ? haMin(Math.max(0, min - 5)) : null, criado_em: haMin(min) })
  nt('nt-1', 'u-fra', 30, 'Visita agendada · FLN0412', `Marcos T. vai em ${fmtCurto(isoDia(3))}, 9h–11h · Limpeza de ar-condicionado. Pedido feito pela proprietária.`, '#/franquia/agenda')
  nt('nt-2', 'u-prop', 20, 'Aprovação pendente · Apto Jurerê 2q', 'A franquia pediu "Ar-condicionado pingando" (R$ 335). Pedidos acima de R$ 300 precisam do seu ok.', '#/proprietario/aprovacoes')
  nt('nt-3', 'u-pres', 15, 'Pedido novo · FLN0412', `Troca de tomada ou interruptor em ${fmtCurto(isoDia(1))}, 14h–15h. Confirme em até 1h.`, '#/prestador/pedido/pd-1043')
  nt('nt-4', 'u-pres', 48, 'Pedido novo · FLN0388', `Ar-condicionado pingando em ${fr(novoUrg)}. Confirme em até 1h.`, `#/prestador/pedido/${novoUrg.id}`)
  nt('nt-5', 'u-pres', 70, 'Pedido expirado · FLN0412', 'Passou 1h sem confirmação. Pedido sem resposta baixa um pouco a sua nota (−0,2).', `#/prestador/pedido/${exp.id}`)
  nt('nt-6', 'u-pres', 9, 'Peça enviada para aprovação · FLN0412', 'Resistência 220V 6800W (R$ 48,90). Compre só depois que a cliente aprovar.', `#/prestador/pedido/${emAnd.id}`)
  nt('nt-7', 'u-pres', 2 * 1440, 'Nova avaliação: 5 estrelas', '"Ar gelando de novo e deixou tudo limpo." · Limpeza de ar-condicionado, FLN0412.', `#/prestador/pedido/${c1.id}`, true)
  nt('nt-8', 'u-pres', 8 * 1440, 'Pix enviado · R$ 212', `Pagamento do PED-${c2.numero} (Troca de tomada ou interruptor) caiu na sua conta.`, '#/prestador/ganhos', true)
  nt('nt-9', 'u-pres', 2 * 1440, 'Você recusou · FLN0388', 'Recusa baixa um pouco a sua nota (−0,1). A franquia escolheu outro profissional.', `#/prestador/pedido/${rec.id}`, true)
  nt('nt-10', 'u-prop', 10, 'Peça para aprovar · FLN0412', 'Marcos T. precisa de uma resistência 220V 6800W (R$ 48,90) para terminar o serviço.', `#/proprietario/pedido/${emAnd.id}`)
  nt('nt-11', 'u-prop', 40, 'Profissional chegou · FLN0412', 'Check-in feito no imóvel · Troca de resistência do chuveiro.', `#/proprietario/pedido/${emAnd.id}`)
  nt('nt-12', 'u-prop', 70, 'O profissional não confirmou em 1h · FLN0412', 'Escolha outro profissional para o mesmo horário.', `#/proprietario/pedido/${exp.id}`)
  nt('nt-13', 'u-prop', 22 * 60, 'Serviço concluído · FLN0412', 'Veja as fotos e confirme.', '#/proprietario/pedido/pd-1039', true)
  nt('nt-14', 'u-fra', 50, 'Aprovado · FLN0388', 'O proprietário aprovou "Ar-condicionado pingando". Agora o profissional confirma em até 1h.', `#/franquia/pedido/${novoUrg.id}`)
  nt('nt-15', 'u-fra', 20 * 60, 'Serviço concluído · FLN0388', 'Veja as fotos e confirme.', `#/franquia/pedido/${prova.id}`)
  nt('nt-16', 'u-fra', 26 * 60, 'Recusado · FLN0219', 'O proprietário recusou "Limpeza de ar-condicionado até 12.000 BTU".', `#/franquia/pedido/${recProp.id}`, true)
  nt('nt-17', 'u-fra', 2 * 1440, 'Profissional não pode ir · FLN0388', 'Marcos T. recusou. Você já passou o pedido para a Paula C.', `#/franquia/pedido/${rec.id}`, true)
  semearAnfitriao(st, p)
  st.notificacoes.sort((a, b) => b.criado_em.localeCompare(a.criado_em))
  st.extras_demo = extras
  return st
}

/** Prazo de 1h dos pedidos novos de exemplo: conta a partir de quando a página abre (a demo sempre mostra um pedido
 *  novo dentro da 1h). Só os da semente (demo_prazo_min) e só enquanto ninguém respondeu. */
let ancorado = false
function ancorarPrazos(st) {
  for (const p of st.pedidos) if (p.demo_prazo_min && p.status === 'aguardando_prestador') p.confirmar_ate = new Date(Date.now() + p.demo_prazo_min * 60e3).toISOString()
}
function novaSemente() {
  const st = semente(); st.versao = VERSAO; st.semeado_dia = isoDia(0)
  semearExtrasDemo(st.extras_demo); delete st.extras_demo
  ancorarPrazos(st)
  return st
}

/** CNPJ fictício com dígito verificador válido (00.000.00n/0001-dv). */
function cnpjDemo(n) {
  const base = `00000${String(n).padStart(3, '0')}0001`
  for (let dv = 0; dv < 100; dv++) { const c = base + String(dv).padStart(2, '0'); if (documentoValido(c)) return formatarCnpj(c) }
  return formatarCnpj(base + '00')
}

function fmtCurto(iso) { const d = paraData(iso); return `${['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` }

// ---------- persistência local (só a demo; some se o navegador limpar) ----------
let S
function carregar() {
  if (!S) {
    // semente de outro dia é refeita: os exemplos são relativos a hoje (hoje, amanhã, ontem) e não podem envelhecer
    try { const t = localStorage.getItem(CHAVE); if (t) { const x = JSON.parse(t); if (x.versao === VERSAO && x.semeado_dia === isoDia(0)) S = x } } catch { /* sem storage */ }
    if (!S) { S = novaSemente(); ancorado = true; salvar() }
  }
  if (!ancorado) { ancorado = true; ancorarPrazos(S); salvar() }
  // no real é o cron concertai_expirar_confirmacoes (1 min); na demo, a cada leitura
  if (expirarVencidos(S)) salvar()
  return S
}
function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(S)) } catch { /* sem storage */ } }
const ouvintes = new Set()
function mudou(evento) { salvar(); for (const f of ouvintes) { try { f(evento) } catch { /* tela */ } } }

// ---------- regras auxiliares (no backend: RPCs da migration 20261117_12) ----------
// Latência fake de 120 ms para mostrar os estados de carregamento. Sob automação (navigator.webdriver,
// ex.: E2E do PR #8, que trata o protótipo como síncrono) ou com ?atraso=0 na URL, responde na hora.
const SEM_ATRASO = (() => { try { return navigator.webdriver === true || new URLSearchParams(location.search).get('atraso') === '0' } catch { return false } })()
const atraso = (v) => SEM_ATRASO ? Promise.resolve(structuredClone(v)) : new Promise((ok) => setTimeout(() => ok(structuredClone(v)), 120))
function erro(code, message) { const e = new Error(message); e.code = code; return e }

/** A janela [inicio, inicio+janelas) cruza uma estadia? (check-out 11h, check-in 15h) */
function cruzaReserva(st, imovel_id, data, inicio, janelas) {
  const fim = inicio + janelas
  return reservasDe(st, imovel_id).some((r) => (
    (data > r.check_in && data < r.check_out) ||
    (data === r.check_in && fim > CHECK_IN_H) ||
    (data === r.check_out && inicio < CHECK_OUT_H)))
}

// ---------- imóveis da Seazone (demo: o proprietário de teste vê TODOS; no real, só os dele) ----------
let seazone = null
async function imoveisSeazone() {
  if (!seazone) seazone = (await import('./imoveis-seazone-demo.js?v=79617c8')).IMOVEIS_SEAZONE
  return seazone
}
const TIPO_NOME = { apto: 'Apto', studio: 'Studio', casa: 'Casa' }
function imovelSeazone([codigo, bairro, cidade, quartos, tipo, status, franquia_id]) {
  return { id: codigo.toLowerCase(), codigo, nome: `${TIPO_NOME[tipo] || 'Apto'} ${bairro} ${quartos}q`, bairro, cidade, uf: 'SC', quartos,
    franquia_id, proprietario_id: null, foto_url: null, status, calendario_origem: 'demo', demo_seazone: true }
}
/** Imóvel por id: os da semente/materializados ou um dos imóveis da Seazone (gf-nnnn). */
async function imovelPorId(st, id) {
  const i = st.imoveis.find((x) => x.id === id)
  if (i) return i
  const x = (await imoveisSeazone()).find((l) => l[0].toLowerCase() === id)
  return x ? imovelSeazone(x) : null
}
/** Na 1ª compra num imóvel da Seazone, ele entra na carteira do proprietário de teste (com o calendário gerado). */
async function materializar(st, id, pf) {
  let i = st.imoveis.find((x) => x.id === id)
  if (i) return i
  i = await imovelPorId(st, id)
  if (!i) return null
  if (pf.papel === 'proprietario') i.proprietario_id = pf.proprietario_id
  st.imoveis.push(i)
  st.reservas.push(...reservasGeradas(i.id))
  return i
}
/** Calendário fictício e estável de um imóvel da Seazone (estadias de 2 a 5 noites, de 10 dias atrás a 60 à frente). */
function reservasGeradas(imovel_id) {
  let h = 0; for (const c of imovel_id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const out = []; let d = -10 + (h % 4); let k = 0
  while (d < 60) {
    const noites = 2 + ((h >> (k % 16)) + k) % 4; const folga = 1 + ((h >> ((k + 3) % 16)) + k) % 4
    out.push({ id: `rs-${imovel_id}-${k}`, imovel_id, check_in: isoDia(d), check_out: isoDia(d + noites), origem: 'demo' })
    d += noites + folga; k += 1
  }
  return out
}
function reservasDe(st, imovel_id) {
  return st.imoveis.some((i) => i.id === imovel_id) ? st.reservas.filter((r) => r.imovel_id === imovel_id) : reservasGeradas(imovel_id)
}
function comCalendario(i) {
  return { ...i, calendario: { origem: i.calendario_origem || 'demo', sincronizado_em: agoraIso() } }
}

// ---------- prestador: vitrine, área, horário ----------
const userDoPrestador = (st, prestador_id) => st.perfis.find((x) => x.prestador_id === prestador_id)?.user_id || null
const userDoComprador = (ped) => ped.criado_por || (ped.comprador_papel === 'franquia' ? 'u-fra' : 'u-prop')
const linkComprador = (ped) => (ped.comprador_papel === 'franquia' ? '#/franquia/pedidos' : '#/proprietario/pedidos')
function vitrineDemo(st, p) {
  const pen = st.penalidades.filter((x) => x.prestador_id === p.id)
  return {
    id: p.id, nome: p.nome, razao_social: p.razao_social, tipo_pj: p.tipo_pj, cidade: p.cidade, foto_url: p.foto_url, bio: p.bio,
    nota_media: notaComPenalidade(p.nota_base, pen), n_servicos: p.n_servicos,
    n_avaliacoes: st.avaliacoes.filter((a) => st.pedidos.some((x) => x.id === a.pedido_id && x.prestador_id === p.id)).length,
    penalidade: Math.round(pen.reduce((s, x) => s + x.pontos, 0) * 100) / 100,
    servicos: st.prestador_servicos.filter((x) => x.prestador_id === p.id).map((x) => x.servico_codigo).sort(),
    areas: st.prestador_areas.filter((x) => x.prestador_id === p.id).map(({ cidade, uf, bairro }) => ({ cidade, uf, bairro })),
    disponibilidade: st.disponibilidades.filter((x) => x.prestador_id === p.id).map(({ dia_semana, hora_inicio, hora_fim }) => ({ dia_semana, hora_inicio, hora_fim }))
      .sort((a, b) => a.dia_semana - b.dia_semana),
  }
}
const vitrineDe = (st, id) => { const p = st.prestadores.find((x) => x.id === id); return p ? vitrineDemo(st, p) : null }
function motivoDemo(st, prestador_id, imovel, data, hora, janelas, ignorar = null) {
  return motivoIndisponivel({ prestador: vitrineDe(st, prestador_id), imovel, data, hora, janelas, pedidos: st.pedidos, ignorar })
}
/** Mesmos códigos e textos do banco (concertai._erro_janela). */
function erroJanela(motivo) {
  if (motivo === 'menos_de_3h') return erro('antecedencia_minima', 'Pedidos precisam de pelo menos 3h de antecedência. Escolha um horário mais tarde.')
  if (motivo === 'fora_da_area') return erro('fora_da_area', 'Este profissional não atende a região do imóvel.')
  if (motivo === 'profissional_ocupado') return erro('janela_ocupada', 'Esse horário acabou de ser ocupado. Escolha outro.')
  return erro('janela_indisponivel', 'Esse horário não está mais livre. Escolha outro.')
}
function penalizar(st, ped, tipo) {
  if (st.penalidades.some((x) => x.pedido_id === ped.id)) return
  st.penalidades.push({ id: `pn-${ped.id}`, prestador_id: ped.prestador_id, pedido_id: ped.id, tipo, pontos: PENALIDADE[tipo], criado_em: agoraIso() })
}
function expirarInterno(st, ped) {
  mover(st, ped, 'recusado_prestador'); ped.recusa_tipo = 'expirou'
  penalizar(st, ped, 'expirou')
  const im = st.imoveis.find((i) => i.id === ped.imovel_id)
  notificar(st, userDoComprador(ped), `O profissional não confirmou em 1h · ${im?.codigo || ''}`, 'Escolha outro profissional para o mesmo horário.', linkComprador(ped))
  const up = userDoPrestador(st, ped.prestador_id)
  if (up) notificar(st, up, `Pedido expirado · ${im?.codigo || ''}`, 'Passou 1h sem confirmação. Pedido sem resposta baixa um pouco a sua nota.', '#/prestador')
}
function expirarVencidos(st) {
  let n = 0
  for (const p of st.pedidos) if (confirmacaoExpirada(p)) { expirarInterno(st, p); n++ }
  return n
}

function criarInterno(st, e, { semNotificar = false } = {}) {
  const sv = st.servicos.find((s) => s.codigo === e.servico_codigo)
  const im = st.imoveis.find((i) => i.id === e.imovel_id)
  const noAto = pagaNoAto(e.comprador_papel, im)
  const precisaAprovar = !noAto && e.comprador_papel === 'franquia' && sv.preco_cents > LIMITE_APROVACAO_CENTS
  const status = e.status || (noAto ? 'aguardando_pagamento' : precisaAprovar ? 'aguardando_aprovacao' : 'aguardando_prestador')
  st.seq += 1
  const ped = {
    id: `pd-${st.seq}`, numero: st.seq, imovel_id: im.id, servico_codigo: sv.codigo, prestador_id: e.prestador_id,
    comprador_papel: e.comprador_papel, criado_por: e.criado_por || (e.comprador_papel === 'franquia' ? 'u-fra' : e.comprador_papel === 'anfitriao' ? (st.perfis.find((x) => x.proprietario_id === im.proprietario_id)?.user_id || 'u-anf1') : 'u-prop'),
    data: e.data, janela_inicio: e.janela_inicio, janelas: sv.janelas,
    preco_cents: sv.preco_cents, taxa_cents: sv.taxa_cents, liquido_cents: sv.liquido_cents, status,
    aviso_reserva: cruzaReserva(st, im.id, e.data, e.janela_inicio, sv.janelas),
    pagamento_status: noAto ? 'cobranca_no_ato' : status === 'concluido' ? 'a_descontar_repasse' : ['cancelado', 'recusado_proprietario', 'recusado_prestador'].includes(status) ? 'nao_cobrado' : 'pendente', observacao: e.observacao || null, criado_em: agoraIso(),
    confirmar_ate: status === 'aguardando_prestador' ? prazoConfirmacao() : null, recusa_tipo: null, substitui_pedido_id: e.substitui_pedido_id || null,
  }
  st.pedidos.push(ped)
  st.transicoes.push({ pedido_id: ped.id, de: null, para: status, em: agoraIso() })
  // exemplo da demo em estado de aprovação (status explícito) também tem a aprovação: desde 17/11 (comissão fixa) nenhum
  // item do Lote 1 passa de R$ 300 sozinho, então a tela de aprovação só aparece pelos exemplos
  if (precisaAprovar || ['aguardando_aprovacao', 'recusado_proprietario'].includes(status)) {
    st.aprovacoes.push({ pedido_id: ped.id, decisao: status === 'aguardando_aprovacao' ? 'pendente' : 'aprovado', expira_em: emHoras(48) })
  }
  if (!semNotificar && status !== 'aguardando_pagamento') {
    const quem = st.prestadores.find((p) => p.id === ped.prestador_id)
    const jan = `${ped.janela_inicio}h–${ped.janela_inicio + ped.janelas}h`
    if (e.comprador_papel === 'proprietario' && im.franquia_id === 'fr-1') notificar(st, 'u-fra', `Visita agendada · ${im.codigo}`, `${quem.nome} vai em ${fmtCurto(ped.data)}, ${jan} · ${sv.nome}. Pedido feito pelo proprietário.`, '#/franquia/agenda')
    if (status === 'aguardando_aprovacao') notificar(st, 'u-prop', `Aprovação pendente · ${im.nome}`, `A franquia pediu "${sv.nome}" (R$ ${sv.preco_cents / 100}). Pedidos acima de R$ 300 precisam do seu ok.`, '#/proprietario/aprovacoes')
    else { const up = userDoPrestador(st, ped.prestador_id); if (up) notificar(st, up, `Pedido novo · ${im.codigo}`, `${sv.nome} em ${fmtCurto(ped.data)}, ${jan}. Confirme em até 1h.`, `#/prestador/pedido/${ped.id}`) }
  }
  return ped
}
function notificar(st, user_id, titulo, corpo, link) {
  st.notificacoes.unshift({ id: `nt-${Date.now()}-${Math.round(Math.random() * 1e4)}`, user_id, titulo, corpo, link, lida_em: null, criado_em: agoraIso() })
}
function mover(st, ped, para) {
  st.transicoes.push({ pedido_id: ped.id, de: ped.status, para, em: agoraIso() })
  ped.status = para
  if (para === 'aguardando_prestador') ped.confirmar_ate = prazoConfirmacao()
}
function pedidoOuErro(st, pedido_id) {
  const p = st.pedidos.find((x) => x.id === pedido_id)
  if (!p) throw erro('nao_encontrado', 'Pedido não encontrado')
  return p
}
function perfilAtual(st) { return st.perfis.find((p) => p.user_id === st.sessao) }

/** pedido com as relações embutidas, igual ao select do Supabase:
 *  pedidos.select('*, imovel:imoveis(*), servico:servicos(*), prestador:prestadores(*), aprovacao:aprovacoes(*), fotos(*), avaliacao:avaliacoes(*)')
 *  + substituido_por (id do pedido que trocou o profissional deste, ou null). */
function comRelacoes(st, p) {
  return {
    ...p,
    imovel: st.imoveis.find((i) => i.id === p.imovel_id),
    servico: st.servicos.find((s) => s.codigo === p.servico_codigo),
    prestador: vitrineDe(st, p.prestador_id),
    aprovacao: st.aprovacoes.find((a) => a.pedido_id === p.id) || null,
    fotos: st.fotos.filter((f) => f.pedido_id === p.id),
    avaliacao: st.avaliacoes.find((a) => a.pedido_id === p.id) || null,
    substituido_por: st.pedidos.find((x) => x.substitui_pedido_id === p.id)?.id || null,
    cobranca: cobrancaDe(st, p.id),
  }
}

// =====================================================================
// INTERFACE (é isto que `fonte-supabase.js` precisa exportar igual)
// =====================================================================

/** Usuário logado: { user_id, papel, nome, proprietario_id? , franquia_id?, prestador_id? } */
export async function sessao() { return atraso(perfilAtual(carregar())) }

/** Só na demo: troca o usuário (no real é o login, T621). */
export async function entrarComo(papel) {
  const st = carregar(); const p = st.perfis.find((x) => x.papel === papel)
  if (!p) throw erro('papel_invalido', 'Papel inválido')
  st.sessao = p.user_id; mudou({ tipo: 'sessao' }); return atraso(p)
}

// ---------- admin "ver como" (demo = admin simulado, mesma UX do real: escolhe o papel e depois QUEM) ----------
const NOME_DE = { franquia: 'franquias', proprietario: 'proprietarios', prestador: 'prestadores', anfitriao: 'proprietarios' }
const CAMPO_ID = { franquia: 'franquia_id', proprietario: 'proprietario_id', prestador: 'prestador_id', anfitriao: 'proprietario_id' }
/** [{ id, nome, detalhe, n_imoveis, n_pedidos, origem }] do papel, filtrado por nome/cidade; mais imóveis/pedidos primeiro. */
export async function verComoBuscar({ papel, busca = '', limite = 30 }) {
  const st = carregar(); const lista = (st[NOME_DE[papel]] || []).filter((x) => papel === 'anfitriao' ? x.tipo === 'anfitriao' : papel !== 'proprietario' || x.tipo !== 'anfitriao')
  if (!NOME_DE[papel]) throw erro('papel_invalido', 'Escolha franquia, proprietário ou prestador.')
  const b = String(busca || '').trim().toLowerCase()
  const out = lista.filter((x) => !b || `${x.nome} ${x.cidade || ''}`.toLowerCase().includes(b)).map((x) => {
    const ims = papel === 'prestador'
      ? new Set(st.pedidos.filter((p) => p.prestador_id === x.id).map((p) => p.imovel_id))
      : new Set(st.imoveis.filter((i) => i[CAMPO_ID[papel]] === x.id).map((i) => i.id))
    const n_pedidos = st.pedidos.filter((p) => (papel === 'prestador' ? p.prestador_id === x.id : ims.has(p.imovel_id))).length
    const cidades = [...new Set(st.imoveis.filter((i) => ims.has(i.id)).map((i) => i.cidade))].join(', ')
    return { id: x.id, nome: x.nome, detalhe: papel === 'prestador' ? (x.cidade || '') : (x.cidade || cidades), n_imoveis: ims.size, n_pedidos, origem: 'demo' }
  })
  out.sort((a, c) => (papel === 'prestador' ? c.n_pedidos - a.n_pedidos : c.n_imoveis - a.n_imoveis) || a.nome.localeCompare(c.nome))
  return atraso(out.slice(0, limite))
}
/** Contexto atual: { papel, alvo_id, nome } (na demo sempre há alguém sendo visto). */
export async function verComoAtual() {
  const pf = perfilAtual(carregar())
  return atraso(pf ? { papel: pf.papel, alvo_id: pf[CAMPO_ID[pf.papel]], nome: pf.nome } : null)
}
/** Passa a ver como a pessoa: usa o login de teste dela, se houver, ou cria um perfil de teste para ela. */
export async function verComoDefinir({ papel, alvo_id }) {
  const st = carregar(); const alvo = (st[NOME_DE[papel]] || []).find((x) => x.id === alvo_id)
  if (!alvo) throw erro('alvo_invalido', 'Não encontrei essa pessoa.')
  let pf = st.perfis.find((x) => x.papel === papel && x[CAMPO_ID[papel]] === alvo_id)
  if (!pf) { pf = { user_id: `u-vc-${alvo_id}`, papel, nome: alvo.nome, [CAMPO_ID[papel]]: alvo_id }; st.perfis.push(pf) }
  st.sessao = pf.user_id; mudou({ tipo: 'sessao' })
  return atraso({ papel, alvo_id, nome: pf.nome })
}
/** Na demo não há "admin puro" com dados: sair do ver como só volta para a escolha (feito pela tela). */
export async function verComoSair() {}

/** Só na demo: volta tudo ao estado inicial. */
export async function reiniciarDemo() { S = novaSemente(); ancorado = true; mudou({ tipo: 'reinicio' }) }

/** Só na demo: cai um pedido novo agora para o prestador da demo (Marcos T.), com aviso no sino e 1h para confirmar.
 *  Acha o 1º horário livre dele (área, dia, horário, agenda e 3h) num imóvel da semente. */
export async function simularPedidoNovo() {
  const st = carregar(); const pid = 'pt-1'
  const meus = st.prestador_servicos.filter((x) => x.prestador_id === pid).map((x) => x.servico_codigo)
  const opcoes = [['im-1', 'proprietario', 'EL-03'], ['im-3', 'franquia', 'EL-06'], ['im-1', 'proprietario', 'AR-01'], ['im-3', 'franquia', 'AR-03']].filter(([, , sv]) => meus.includes(sv))
  const n = st.pedidos.filter((x) => x.prestador_id === pid).length
  for (let d = 1; d <= 10; d++) {
    for (let k = 0; k < opcoes.length; k++) {
      const [imovel_id, comprador_papel, servico_codigo] = opcoes[(n + k) % opcoes.length]
      const sv = st.servicos.find((x) => x.codigo === servico_codigo); const im = st.imoveis.find((x) => x.id === imovel_id)
      for (let h = HORA_ABRE + 1; h + sv.janelas <= HORA_FECHA; h++) {
        if (motivoDemo(st, pid, im, isoDia(d), h, sv.janelas)) continue
        const ped = criarInterno(st, { imovel_id, servico_codigo, prestador_id: pid, comprador_papel, data: isoDia(d), janela_inicio: h, status: 'aguardando_prestador' })
        mudou({ tipo: 'pedido', id: ped.id }); return atraso(comRelacoes(st, ped))
      }
    }
  }
  throw erro('sem_horario', 'O prestador da demo não tem horário livre nos próximos 10 dias.')
}

export async function listarCategorias() { return atraso(carregar().categorias) }

/** servicos where lote = ? order by categoria_codigo, codigo */
export async function listarServicos({ lote = 1 } = {}) {
  return atraso(carregar().servicos.filter((s) => !lote || s.lote === lote))
}

/** Imóveis que o usuário enxerga (RLS): proprietário = os dele; franquia = a carteira; prestador = os dos pedidos dele. */
export async function listarImoveis() {
  const st = carregar(); const pf = perfilAtual(st)
  let l = st.imoveis
  if (pf.papel === 'proprietario' || pf.papel === 'anfitriao') l = l.filter((i) => i.proprietario_id === pf.proprietario_id)
  if (pf.papel === 'franquia') l = l.filter((i) => i.franquia_id === pf.franquia_id)
  if (pf.papel !== 'prestador') l = l.filter((i) => i.ativo !== false)
  if (pf.papel === 'prestador') { const ids = new Set(st.pedidos.filter((p) => p.prestador_id === pf.prestador_id).map((p) => p.imovel_id)); l = l.filter((i) => ids.has(i.id)) }
  return atraso(l.map((i) => ({ ...comCalendario(i), proprietario: st.proprietarios.find((p) => p.id === i.proprietario_id) })))
}

/** Imóveis para quem COMPRA escolher. Demo: o proprietário de teste vê os dele primeiro e depois TODOS os imóveis da
 *  Seazone (1.011 anonimizados, campo demo_seazone); a franquia vê a carteira. Real: só os dele (RLS), com calendário
 *  sincronizado. Cada um vem com calendario: { origem, sincronizado_em } e hospede_hoje (reserva tocando hoje). */
export async function imoveisDoComprador() {
  const st = carregar(); const pf = perfilAtual(st)
  const hoje = isoDia(0)
  const hospede = (i) => ({ ...i, hospede_hoje: reservasDe(st, i.id).some((r) => r.check_in <= hoje && r.check_out >= hoje) })
  if (pf.papel !== 'proprietario') return (await listarImoveis()).map(hospede)
  const meus = st.imoveis.filter((i) => i.proprietario_id === pf.proprietario_id && i.ativo !== false)
  const ja = new Set(meus.map((i) => i.codigo))
  const todos = (await imoveisSeazone()).filter((x) => !ja.has(x[0])).map(imovelSeazone)
  return atraso([...meus.map((i) => ({ ...comCalendario(i), meu: true })), ...todos.map(comCalendario)].map(hospede))
}

/** reservas do imóvel que tocam [de, ate] (datas ISO AAAA-MM-DD) */
export async function listarReservas({ imovel_id, de, ate }) {
  return atraso(reservasDe(carregar(), imovel_id).filter((r) => (!ate || r.check_in <= ate) && (!de || r.check_out >= de)))
}

/** Prestadores que fazem o serviço (prestador_servicos), melhor nota primeiro. Formato da vitrine. */
export async function listarPrestadores({ servico_codigo } = {}) {
  const st = carregar()
  const l = st.prestadores.map((p) => vitrineDemo(st, p)).filter((p) => !servico_codigo || p.servicos.includes(servico_codigo))
  return atraso(ordenarMelhores(l))
}

/** RPC janelas_disponiveis(prestador_id, imovel_id, data, servico_codigo)
 *  → [{ janela_inicio (8..16), janela_fim, disponivel, motivo, aviso_reserva }] — a reserva só AVISA, nunca bloqueia. */
export async function janelasDisponiveis({ prestador_id, imovel_id, data, servico_codigo }) {
  const st = carregar(); const sv = st.servicos.find((s) => s.codigo === servico_codigo)
  const im = await imovelPorId(st, imovel_id)
  if (!im) throw erro('imovel_invalido', 'Imóvel não encontrado.')
  const out = []
  for (let h = HORA_ABRE; h + sv.janelas <= HORA_FECHA; h++) {
    const motivo = motivoDemo(st, prestador_id, im, data, h, sv.janelas)
    out.push({ janela_inicio: h, janela_fim: h + sv.janelas, disponivel: motivo === null, motivo, aviso_reserva: cruzaReserva(st, imovel_id, data, h, sv.janelas) })
  }
  return atraso(out)
}

/** RPC horarios_disponiveis(imóvel, serviço, dia) → [{ janela_inicio, janela_fim, n_prestadores, motivo, aviso_reserva }].
 *  motivo: null | 'passou' | 'menos_de_3h' | 'sem_profissional'. A tela mostra como livre só n_prestadores > 0. */
export async function horariosDisponiveis({ imovel_id, servico_codigo, data }) {
  const st = carregar(); const sv = st.servicos.find((s) => s.codigo === servico_codigo)
  if (!sv) throw erro('servico_invalido', 'Serviço não encontrado.')
  const im = await imovelPorId(st, imovel_id)
  if (!im) throw erro('imovel_invalido', 'Imóvel não encontrado.')
  const prestadores = st.prestadores.map((p) => vitrineDemo(st, p))
  const l = horariosDoDia({ prestadores, imovel: im, servico: sv, data, pedidos: st.pedidos })
  return atraso(l.map((j) => ({ ...j, aviso_reserva: cruzaReserva(st, imovel_id, data, j.janela_inicio, sv.janelas) })))
}

/** RPC prestadores_disponiveis(imóvel, serviço, dia, janela): quem faz o serviço, atende a área do imóvel, atende nesse
 *  dia/horário e está com a agenda livre, melhores primeiro (nota, nº de serviços). Erro antecedencia_minima se < 3h. */
export async function prestadoresDisponiveis({ imovel_id, servico_codigo, data, janela_inicio }) {
  const st = carregar(); const sv = st.servicos.find((s) => s.codigo === servico_codigo)
  if (!sv) throw erro('servico_invalido', 'Serviço não encontrado.')
  const im = await imovelPorId(st, imovel_id)
  if (!im) throw erro('imovel_invalido', 'Imóvel não encontrado.')
  if (janela_inicio < HORA_ABRE || janela_inicio + sv.janelas > HORA_FECHA) throw erro('janela_invalida', 'Escolha um horário entre 8h e 17h.')
  if (!respeitaAntecedencia(data, janela_inicio)) throw erroJanela('menos_de_3h')
  const prestadores = st.prestadores.map((p) => vitrineDemo(st, p))
  const aviso_reserva = cruzaReserva(st, imovel_id, data, janela_inicio, sv.janelas)
  const l = filtrarDisponiveis({ prestadores, imovel: im, servico: sv, data, hora: janela_inicio, pedidos: st.pedidos })
  return atraso(l.map((p) => ({ ...p, janela_inicio, janela_fim: janela_inicio + sv.janelas, aviso_reserva })))
}

/** Pedidos que o usuário enxerga (RLS), com relações. Filtro opcional por status (lista). */
export async function listarPedidos({ status } = {}) {
  const st = carregar(); const pf = perfilAtual(st)
  let l = st.pedidos
  if (pf.papel === 'proprietario' || pf.papel === 'anfitriao') { const ids = new Set(st.imoveis.filter((i) => i.proprietario_id === pf.proprietario_id).map((i) => i.id)); l = l.filter((p) => ids.has(p.imovel_id)) }
  if (pf.papel === 'franquia') { const ids = new Set(st.imoveis.filter((i) => i.franquia_id === pf.franquia_id).map((i) => i.id)); l = l.filter((p) => ids.has(p.imovel_id)) }
  if (pf.papel === 'prestador') l = l.filter((p) => p.prestador_id === pf.prestador_id && !['aguardando_aprovacao', 'aguardando_pagamento'].includes(p.status))
  if (status) l = l.filter((p) => status.includes(p.status))
  return atraso(l.map((p) => comRelacoes(st, p)).sort((a, b) => (a.data + a.janela_inicio).localeCompare(b.data + b.janela_inicio)))
}

export async function obterPedido(pedido_id) { const st = carregar(); return atraso(comRelacoes(st, pedidoOuErro(st, pedido_id))) }

/** RPC criar_pedido. Franquia + preço > R$ 300 → aguardando_aprovacao (proprietário aprova).
 *  Regras: 3h de antecedência, prestador faz o serviço, atende a área, atende no horário e está livre. */
export async function criarPedido({ imovel_id, servico_codigo, prestador_id, data, janela_inicio, observacao }) {
  const st = carregar(); const pf = perfilAtual(st)
  if (!['proprietario', 'franquia', 'anfitriao'].includes(pf.papel)) throw erro('sem_permissao', 'Só proprietário, franquia ou anfitrião contratam')
  if (pf.papel === 'anfitriao') {
    const dono = st.proprietarios.find((x) => x.id === pf.proprietario_id)
    if (!dono?.telefone_verificado_em) throw erro('celular_nao_verificado', 'Confirme o seu celular antes de contratar.')
    const abertos = st.pedidos.filter((x) => x.criado_por === pf.user_id && !['concluido', 'cancelado', 'recusado_prestador', 'recusado_proprietario'].includes(x.status))
    const jaConcluiu = st.pedidos.some((x) => x.criado_por === pf.user_id && x.status === 'concluido')
    if (!jaConcluiu && abertos.length) throw erro('limite_primeira_compra', 'Na primeira compra, um pedido por vez. Conclua ou cancele o pedido aberto para fazer outro.')
  }
  const sv = st.servicos.find((s) => s.codigo === servico_codigo)
  if (!sv) throw erro('servico_invalido', 'Serviço não encontrado')
  if (!st.prestador_servicos.some((x) => x.prestador_id === prestador_id && x.servico_codigo === servico_codigo)) throw erro('prestador_invalido', 'Este profissional não faz este serviço.')
  const im = await imovelPorId(st, imovel_id)
  if (!im) throw erro('imovel_invalido', 'Imóvel não encontrado.')
  if (pf.papel === 'franquia' && im.franquia_id !== pf.franquia_id) throw erro('sem_permissao', 'Você não pode contratar para este imóvel.')
  if (pf.papel === 'anfitriao' && im.proprietario_id !== pf.proprietario_id) throw erro('sem_permissao', 'Você não pode contratar para este imóvel.')
  const motivo = motivoDemo(st, prestador_id, im, data, janela_inicio, sv.janelas)
  if (motivo) throw erroJanela(motivo)
  await materializar(st, imovel_id, pf)
  const ped = criarInterno(st, { imovel_id, servico_codigo, prestador_id, data, janela_inicio, observacao, comprador_papel: pf.papel, criado_por: pf.user_id })
  mudou({ tipo: 'pedido', id: ped.id }); return atraso(comRelacoes(st, ped))
}

/** RPC decidir_aprovacao (proprietário). decisao: 'aprovado' | 'recusado' */
export async function decidirAprovacao({ pedido_id, decisao }) {
  const st = carregar(); const ped = pedidoOuErro(st, pedido_id); const ap = st.aprovacoes.find((a) => a.pedido_id === pedido_id)
  if (!ap || ap.decisao !== 'pendente') throw erro('sem_aprovacao_pendente', 'Esse pedido não está esperando aprovação')
  ap.decisao = decisao; ap.decidido_em = agoraIso()
  const im = st.imoveis.find((i) => i.id === ped.imovel_id); const sv = st.servicos.find((s) => s.codigo === ped.servico_codigo)
  if (decisao === 'aprovado') {
    mover(st, ped, 'aguardando_prestador')
    notificar(st, 'u-fra', `Aprovado · ${im.codigo}`, `O proprietário aprovou "${sv.nome}". Agora o profissional confirma em até 1h.`, '#/franquia/pedidos')
    const up = userDoPrestador(st, ped.prestador_id)
    if (up) notificar(st, up, `Pedido novo · ${im.codigo}`, `${sv.nome} em ${fmtCurto(ped.data)}, ${ped.janela_inicio}h–${ped.janela_inicio + ped.janelas}h. Confirme em até 1h.`, '#/prestador')
  } else {
    mover(st, ped, 'recusado_proprietario')
    notificar(st, 'u-fra', `Recusado · ${im.codigo}`, `O proprietário recusou "${sv.nome}".`, '#/franquia/pedidos')
  }
  mudou({ tipo: 'pedido', id: ped.id }); return atraso(comRelacoes(st, ped))
}

/** RPC responder_pedido (prestador): aceitar true → confirmado; false → recusado_prestador (recusa_tipo 'recusou' + penalidade).
 *  Passou 1h: o pedido expira (recusado_prestador, recusa_tipo 'expirou' + penalidade) e volta assim, sem erro. */
export async function responderPedido({ pedido_id, aceitar, motivo }) {
  const st = carregar(); const ped = pedidoOuErro(st, pedido_id)
  if (ped.status !== 'aguardando_prestador') throw erro('status_invalido', 'Esse pedido não está esperando você')
  const im = st.imoveis.find((i) => i.id === ped.imovel_id)
  if (confirmacaoExpirada(ped)) expirarInterno(st, ped)
  else {
    mover(st, ped, aceitar ? 'confirmado' : 'recusado_prestador')
    if (aceitar) { const c = cobrancaDe(st, ped.id, true); if (c && c.status === 'pago') { c.status = 'retido'; c.updated_at = agoraIso() } }
    if (!aceitar) { ped.recusa_tipo = 'recusou'; penalizar(st, ped, 'recusou') }
    if (motivo) ped.observacao_prestador = motivo
    notificar(st, userDoComprador(ped), aceitar ? `Profissional confirmado · ${im.codigo}` : `Profissional não pode ir · ${im.codigo}`,
      aceitar ? 'O profissional confirmou a visita.' : 'Escolha outro profissional para o mesmo horário.', linkComprador(ped))
  }
  mudou({ tipo: 'pedido', id: ped.id }); return atraso(comRelacoes(st, ped))
}

/** RPC trocar_prestador (comprador): o profissional recusou ou não confirmou em 1h → pedido novo (mesmo imóvel, serviço,
 *  dia e janela) com outro profissional, ligado por substitui_pedido_id. Aprovação do proprietário já dada vale para a troca. */
export async function trocarPrestador({ pedido_id, prestador_id }) {
  const st = carregar(); const pf = perfilAtual(st); const old = pedidoOuErro(st, pedido_id)
  if (!['proprietario', 'franquia', 'anfitriao'].includes(pf.papel)) throw erro('sem_permissao', 'Você não pode mexer neste pedido.')
  if (old.status !== 'recusado_prestador') throw erro('troca_indisponivel', 'Só dá para trocar o profissional quando ele recusa ou não confirma em 1h.')
  if (st.pedidos.some((x) => x.substitui_pedido_id === old.id)) throw erro('ja_trocado', 'Este pedido já foi passado para outro profissional.')
  if (prestador_id === old.prestador_id) throw erro('mesmo_prestador', 'Escolha um profissional diferente.')
  if (!st.prestador_servicos.some((x) => x.prestador_id === prestador_id && x.servico_codigo === old.servico_codigo)) throw erro('prestador_invalido', 'Este profissional não faz este serviço.')
  const sv = st.servicos.find((s) => s.codigo === old.servico_codigo)
  const im = st.imoveis.find((i) => i.id === old.imovel_id)
  const motivo = motivoDemo(st, prestador_id, im, old.data, old.janela_inicio, sv.janelas)
  if (motivo) throw erroJanela(motivo)
  const aprovado = st.aprovacoes.find((a) => a.pedido_id === old.id)?.decisao === 'aprovado'
  const ped = criarInterno(st, { imovel_id: old.imovel_id, servico_codigo: old.servico_codigo, prestador_id, data: old.data, janela_inicio: old.janela_inicio,
    observacao: old.observacao, comprador_papel: old.comprador_papel, criado_por: pf.user_id, substitui_pedido_id: old.id,
    status: aprovado || cobrancaDe(st, old.id, true)?.status === 'pago' ? 'aguardando_prestador' : undefined })
  const cob = cobrancaDe(st, old.id, true)
  if (cob && cob.status === 'pago') { cob.pedido_id = ped.id; cob.updated_at = agoraIso() } // o valor pago segue para o pedido novo
  mudou({ tipo: 'pedido', id: ped.id }); return atraso(comRelacoes(st, ped))
}

/** RPC avancar_pedido (prestador): confirmado → em_execucao (check-in) → prova_enviada (fotos + concluir);
 *  comprador: prova_enviada → concluido (no real também fecha sozinho em 72h). */
export async function avancarPedido({ pedido_id, para }) {
  const st = carregar(); const ped = pedidoOuErro(st, pedido_id)
  const ok = { confirmado: 'em_execucao', em_execucao: 'prova_enviada', prova_enviada: 'concluido' }
  if (ok[ped.status] !== para) throw erro('transicao_invalida', 'Não dá pra ir pra esse passo agora')
  if (para === 'prova_enviada' && !st.fotos.some((f) => f.pedido_id === ped.id && f.tipo === 'depois')) throw erro('sem_foto', 'Mande ao menos uma foto do depois')
  mover(st, ped, para)
  const im = st.imoveis.find((i) => i.id === ped.imovel_id)
  const quem = userDoComprador(ped)
  if (para === 'em_execucao') notificar(st, quem, `Profissional chegou · ${im.codigo}`, 'Check-in feito no imóvel.', '#/')
  if (para === 'prova_enviada') notificar(st, quem, `Serviço concluído · ${im.codigo}`, 'Veja as fotos e confirme.', '#/')
  if (para === 'concluido') { ped.pagamento_status = 'liberado'; ped.concluido_em = isoDia(0) }
  mudou({ tipo: 'pedido', id: ped.id }); return atraso(comRelacoes(st, ped))
}

/** Foto do pedido (storage bucket + linha em `fotos`). tipo: 'antes' | 'depois' | 'material'. arquivo: File */
export async function enviarFoto({ pedido_id, tipo, arquivo }) {
  const st = carregar(); pedidoOuErro(st, pedido_id)
  let storage_path = FOTO.e21
  if (arquivo) storage_path = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => ok(FOTO.e21); fr.readAsDataURL(arquivo) })
  const f = { id: `ft-${Date.now()}`, pedido_id, tipo, storage_path }
  st.fotos.push(f); mudou({ tipo: 'foto', id: pedido_id }); return atraso(f)
}

/** RPC avaliar_pedido (comprador, depois de concluído). nota 1..5 */
export async function avaliarPedido({ pedido_id, nota, comentario }) {
  const st = carregar(); const ped = pedidoOuErro(st, pedido_id)
  if (ped.status !== 'concluido') throw erro('status_invalido', 'Só dá pra avaliar depois de concluído')
  st.avaliacoes = st.avaliacoes.filter((a) => a.pedido_id !== pedido_id)
  st.avaliacoes.push({ pedido_id, nota, comentario: comentario || null, criado_em: agoraIso() })
  mudou({ tipo: 'pedido', id: ped.id }); return atraso(comRelacoes(st, ped))
}

/** RPC cancelar_pedido (comprador, antes do check-in). */
export async function cancelarPedido({ pedido_id, motivo }) {
  const st = carregar(); const ped = pedidoOuErro(st, pedido_id)
  if (!['aguardando_pagamento', 'aguardando_aprovacao', 'aguardando_prestador', 'confirmado'].includes(ped.status)) throw erro('status_invalido', 'Esse pedido não pode mais ser cancelado')
  mover(st, ped, 'cancelado'); ped.motivo_cancelamento = motivo || null
  cobrancaAoCancelar(st, ped)
  mudou({ tipo: 'pedido', id: ped.id }); return atraso(comRelacoes(st, ped))
}

// ---------- perfis ----------
const soDigitos = (t) => String(t ?? '').replace(/\D/g, '')
function perfilProprietarioDe(st, pf) {
  const p = st.proprietarios.find((x) => x.id === pf.proprietario_id)
  return { id: p.id, nome: p.nome, email: p.email, telefone: p.telefone || null, documento: p.documento || null, atualizado_em: p.atualizado_em || null,
    n_imoveis: st.imoveis.filter((i) => i.proprietario_id === p.id).length }
}

/** RPC meu_perfil_proprietario → { id, nome, email, telefone, documento, atualizado_em, n_imoveis } */
export async function perfilProprietario() {
  const st = carregar(); const pf = perfilAtual(st)
  if (pf.papel !== 'proprietario') throw erro('sem_permissao', 'Só o proprietário tem este perfil.')
  return atraso(perfilProprietarioDe(st, pf))
}

/** RPC salvar_perfil_proprietario(dados): só as chaves enviadas mudam. Valida nome, e-mail, telefone (DDD) e CPF/CNPJ. */
export async function salvarPerfilProprietario(dados = {}) {
  const st = carregar(); const pf = perfilAtual(st)
  if (pf.papel !== 'proprietario') throw erro('sem_permissao', 'Só o proprietário edita este perfil.')
  const p = st.proprietarios.find((x) => x.id === pf.proprietario_id); const novo = {}
  if ('nome' in dados) { const n = String(dados.nome ?? '').trim(); if (n.length < 2 || n.length > 120) throw erro('nome_invalido', 'Informe o seu nome.'); novo.nome = n }
  if ('email' in dados) { const e = String(dados.email ?? '').trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw erro('email_invalido', 'E-mail inválido.'); novo.email = e }
  if ('telefone' in dados) { const t = soDigitos(dados.telefone) || null; if (t && (t.length < 10 || t.length > 13)) throw erro('telefone_invalido', 'Telefone com DDD, só números.'); novo.telefone = t }
  if ('documento' in dados) { const d = soDigitos(dados.documento) || null; if (d && !documentoValido(d)) throw erro('documento_invalido', 'CPF ou CNPJ inválido.'); novo.documento = d }
  Object.assign(p, novo, { atualizado_em: agoraIso() })
  if (novo.nome) pf.nome = novo.nome
  mudou({ tipo: 'perfil' }); return atraso(perfilProprietarioDe(st, pf))
}

function perfilPrestadorDe(st, id) {
  const p = st.prestadores.find((x) => x.id === id); const v = vitrineDemo(st, p)
  return { id: p.id, nome_exibicao: p.nome, razao_social: p.razao_social, cnpj: p.cnpj, tipo_pj: p.tipo_pj, descricao: p.bio || null,
    foto_url: p.foto_url, cidade: p.cidade, atualizado_em: p.atualizado_em || null, servicos: v.servicos, areas: v.areas,
    disponibilidade: v.disponibilidade, nota: v.nota_media, n_servicos: v.n_servicos, penalidade: v.penalidade }
}

/** RPC meu_perfil_prestador → { id, nome_exibicao, razao_social, cnpj, tipo_pj, descricao, foto_url, cidade, atualizado_em,
 *  servicos: [codigo], areas: [{ cidade, uf, bairro|null }], disponibilidade: [{ dia_semana, hora_inicio, hora_fim }], nota, n_servicos, penalidade } */
export async function perfilPrestador() {
  const st = carregar(); const pf = perfilAtual(st)
  if (pf.papel !== 'prestador') throw erro('sem_permissao', 'Só o prestador tem este perfil.')
  return atraso(perfilPrestadorDe(st, pf.prestador_id))
}

/** RPC salvar_perfil_prestador(dados): só as chaves enviadas mudam; listas enviadas substituem as antigas.
 *  dados: { nome_exibicao?, razao_social?, cnpj?, tipo_pj?, descricao?, servicos?, areas?, disponibilidade? } */
export async function salvarPerfilPrestador(dados = {}) {
  const st = carregar(); const pf = perfilAtual(st)
  if (pf.papel !== 'prestador') throw erro('sem_permissao', 'Só o prestador edita este perfil.')
  const id = pf.prestador_id; const p = st.prestadores.find((x) => x.id === id); const novo = {}
  if ('nome_exibicao' in dados) { const n = String(dados.nome_exibicao ?? '').trim(); if (n.length < 2 || n.length > 60) throw erro('nome_invalido', 'Nome de exibição com 2 a 60 letras.'); novo.nome = n }
  if ('razao_social' in dados) { const n = String(dados.razao_social ?? '').trim(); if (n.length < 2 || n.length > 150) throw erro('razao_social_invalida', 'Informe o nome da empresa (razão social).'); novo.razao_social = n }
  if ('descricao' in dados) { const d = String(dados.descricao ?? '').trim() || null; if (d && d.length > 500) throw erro('descricao_longa', 'A descrição pode ter até 500 letras.'); novo.bio = d }
  if ('tipo_pj' in dados) { if (!['MEI', 'ME'].includes(dados.tipo_pj)) throw erro('tipo_pj_invalido', 'Tipo de empresa: MEI ou ME.'); novo.tipo_pj = dados.tipo_pj }
  if ('cnpj' in dados) {
    const c = soDigitos(dados.cnpj)
    if (c.length !== 14 || !documentoValido(c)) throw erro('cnpj_invalido', 'CNPJ inválido.')
    if (st.prestadores.some((x) => x.id !== id && soDigitos(x.cnpj) === c)) throw erro('cnpj_em_uso', 'Este CNPJ já está em outro cadastro. Fale com a Seazone.')
    novo.cnpj = formatarCnpj(c)
  }
  let servicos = null; let areas = null; let disp = null
  if ('servicos' in dados) {
    servicos = [...new Set(dados.servicos || [])]
    if (!servicos.length) throw erro('servicos_vazio', 'Escolha pelo menos um serviço que você faz.')
    if (servicos.some((c) => !st.servicos.some((s) => s.codigo === c))) throw erro('servico_invalido', 'Algum serviço escolhido não existe.')
  }
  if ('areas' in dados) {
    areas = (dados.areas || []).map((a) => ({ cidade: String(a.cidade ?? '').trim(), uf: String(a.uf || 'SC').trim().toUpperCase(), bairro: String(a.bairro ?? '').trim() || null }))
    if (!areas.length) throw erro('areas_vazio', 'Diga pelo menos uma cidade onde você atende.')
    if (areas.some((a) => a.cidade.length < 2)) throw erro('area_invalida', 'Informe a cidade de cada área.')
    areas = areas.filter((a, i) => areas.findIndex((b) => b.cidade === a.cidade && b.bairro === a.bairro) === i)
  }
  if ('disponibilidade' in dados) {
    disp = (dados.disponibilidade || []).map((d) => ({ dia_semana: Number(d.dia_semana), hora_inicio: Number(d.hora_inicio), hora_fim: Number(d.hora_fim) }))
    if (!disp.length) throw erro('disponibilidade_vazia', 'Escolha pelo menos um dia de atendimento.')
    for (const d of disp) {
      if (!(d.dia_semana >= 0 && d.dia_semana <= 6 && d.hora_inicio >= 8 && d.hora_inicio <= 16 && d.hora_fim >= 9 && d.hora_fim <= 17 && d.hora_fim > d.hora_inicio)) throw erro('horario_invalido', 'Horário de atendimento entre 8h e 17h, com início antes do fim.')
    }
    if (new Set(disp.map((d) => d.dia_semana)).size !== disp.length) throw erro('dia_repetido', 'Cada dia da semana aparece uma vez só.')
  }
  Object.assign(p, novo, { atualizado_em: agoraIso() })
  if (novo.nome) pf.nome = novo.nome
  if (servicos) st.prestador_servicos = [...st.prestador_servicos.filter((x) => x.prestador_id !== id), ...servicos.map((c) => ({ prestador_id: id, servico_codigo: c }))]
  if (areas) { st.prestador_areas = [...st.prestador_areas.filter((x) => x.prestador_id !== id), ...areas.map((a) => ({ prestador_id: id, ...a }))]; p.cidade = areas[0].cidade }
  if (disp) st.disponibilidades = [...st.disponibilidades.filter((x) => x.prestador_id !== id), ...disp.map((d) => ({ prestador_id: id, ...d }))]
  mudou({ tipo: 'perfil' }); return atraso(perfilPrestadorDe(st, id))
}

// ---------- contato por WhatsApp (REGRA de 17/11; banco: migration 20261117_16, RPC pedido_contato) ----------
function enderecoDemo(st, im) {
  const rua = st.imoveis_privado?.[im.id]?.logradouro || null
  const local = [im.bairro, `${im.cidade}/${im.uf || 'SC'}`].filter(Boolean).join(', ')
  return [rua, local].filter(Boolean).join(' - ')
}

/** RPC pedido_contato(pedido): contato do outro lado do pedido, só do aceite até o fim da garantia.
 *  Fora da janela: { aberto: false, motivo }. Dentro: { aberto: true, lado: 'prestador'|'comprador', contato_nome,
 *  celular (null = contato indisponível), comprador_nome, comprador_tipo, prestador_nome, numero, servico_nome,
 *  imovel_codigo, imovel_nome, endereco, data, janela_inicio, janelas, garantia_ate? } */
export async function contatoDoPedido(pedido_id) {
  const st = carregar(); const pf = perfilAtual(st); const p = pedidoOuErro(st, pedido_id)
  const im = st.imoveis.find((i) => i.id === p.imovel_id) || {}
  let lado
  if (pf.papel === 'prestador') {
    if (pf.prestador_id !== p.prestador_id) throw erro('sem_permissao', 'Este pedido não é seu.')
    lado = 'comprador'
  } else if ((pf.proprietario_id && im.proprietario_id === pf.proprietario_id) || (pf.franquia_id && im.franquia_id === pf.franquia_id)) {
    lado = 'prestador'
  } else throw erro('sem_permissao', 'Este pedido não é seu.')
  const jan = janelaContato(p, isoDia(0))
  if (!jan.aberto) return atraso(jan)
  const pr = st.prestadores.find((x) => x.id === p.prestador_id) || {}
  const sv = st.servicos.find((s) => s.codigo === p.servico_codigo) || {}
  const fr = st.franquias.find((x) => x.id === im.franquia_id)
  const dono = st.proprietarios.find((x) => x.id === im.proprietario_id)
  const daFranquia = ['franquia', 'admin'].includes(p.comprador_papel) && fr
  const comprador = daFranquia ? { tipo: 'franquia', nome: fr.nome, celular: celularWhatsApp(fr.celular) }
    : { tipo: p.comprador_papel === 'anfitriao' ? 'anfitriao' : 'proprietario', nome: dono?.nome || 'Proprietário', celular: celularWhatsApp(dono?.telefone) }
  return atraso({
    ...jan, lado,
    contato_nome: lado === 'prestador' ? pr.nome : comprador.nome,
    celular: lado === 'prestador' ? celularWhatsApp(pr.celular) : comprador.celular,
    comprador_nome: comprador.nome, comprador_tipo: comprador.tipo, prestador_nome: pr.nome,
    numero: p.numero, servico_nome: sv.nome, imovel_codigo: im.codigo, imovel_nome: im.nome, endereco: enderecoDemo(st, im),
    data: p.data, janela_inicio: p.janela_inicio, janelas: p.janelas,
  })
}

/** RPC meu_celular → { celular } (55 + DDD + número, ou null). */
export async function meuCelular() {
  const st = carregar(); const pf = perfilAtual(st)
  const v = pf.prestador_id ? st.prestadores.find((x) => x.id === pf.prestador_id)?.celular
    : pf.franquia_id ? st.franquias.find((x) => x.id === pf.franquia_id)?.celular
      : pf.proprietario_id ? st.proprietarios.find((x) => x.id === pf.proprietario_id)?.telefone : null
  return atraso({ celular: celularWhatsApp(v) })
}

/** RPC salvar_meu_celular(celular): vazio apaga; inválido = erro celular_invalido. */
export async function salvarMeuCelular({ celular }) {
  const st = carregar(); const pf = perfilAtual(st); const v = celularWhatsApp(celular)
  if (soDigitos(celular) && !v) throw erro('celular_invalido', 'Celular com DDD, só números. Ex.: 48 99999-0000.')
  if (pf.prestador_id) Object.assign(st.prestadores.find((x) => x.id === pf.prestador_id), { celular: v, atualizado_em: agoraIso() })
  else if (pf.franquia_id) st.franquias.find((x) => x.id === pf.franquia_id).celular = v
  else if (pf.proprietario_id) Object.assign(st.proprietarios.find((x) => x.id === pf.proprietario_id), { telefone: v ? v.slice(2) : null, atualizado_em: agoraIso() })
  else throw erro('sem_permissao', 'Este perfil não tem celular.')
  mudou({ tipo: 'perfil' }); return atraso({ celular: v })
}

/** Cidades e bairros onde a Seazone tem imóvel (para o prestador marcar onde atende): [{ cidade, uf, bairros: [..] }] */
export async function areasConhecidas() {
  const st = carregar(); const m = new Map()
  const add = (cidade, bairro) => { if (!m.has(cidade)) m.set(cidade, new Set()); if (bairro) m.get(cidade).add(bairro) }
  for (const i of st.imoveis) add(i.cidade, i.bairro)
  for (const x of await imoveisSeazone()) add(x[2], x[1])
  return atraso([...m].map(([cidade, b]) => ({ cidade, uf: 'SC', bairros: [...b].sort((a, c) => a.localeCompare(c)) })).sort((a, b) => a.cidade.localeCompare(b.cidade)))
}

/** Termos de uso: o usuário logado já aceitou? (1ª compra pede o aceite por clique)
 *  No backend: select 1 from termos_aceites where user_id = auth.uid() and versao = <vigente>. */
export async function termosAceitos() {
  const st = carregar(); st.termos_aceites ||= []
  return atraso(st.termos_aceites.some((t) => t.user_id === st.sessao && t.versao === VERSAO_TERMOS))
}

/** Registra o aceite dos termos pelo usuário logado: insert em termos_aceites (user_id, aceito_em, versao). */
export async function aceitarTermos() {
  const st = carregar(); st.termos_aceites ||= []
  if (!st.termos_aceites.some((t) => t.user_id === st.sessao && t.versao === VERSAO_TERMOS)) {
    st.termos_aceites.push({ user_id: st.sessao, aceito_em: agoraIso(), versao: VERSAO_TERMOS })
    mudou({ tipo: 'termos' })
  }
  return atraso(true)
}

// ---------- 17/11: dados de pagamento, NF obrigatória e garantia (RPCs da migration 20261117_13) ----------
function prestadorDaSessao(st) {
  const pf = perfilAtual(st)
  if (pf.papel !== 'prestador') throw erro('sem_permissao', 'Só o prestador vê os próprios dados de pagamento.')
  return pf.prestador_id
}
/** Troca vencida (passou a carência) vira a vigente. */
function efetivarDados(st, id) {
  st.dados_pagamento ||= {}
  const d = st.dados_pagamento[id]
  if (d?.pendente && new Date(d.pendente.vale_a_partir) <= new Date()) { d.atual = { ...d.pendente }; delete d.atual.vale_a_partir; delete d.atual.solicitada_em; d.pendente = null }
  return d || null
}
const dadosJson = (d) => ({ atual: d?.atual || null, pendente: d?.pendente || null, carencia_horas: CARENCIA_DADOS_H, atualizado_em: d?.atualizado_em || null })

/** RPC meus_dados_pagamento → { atual: {pix_tipo, pix_chave, banco, agencia, conta, conta_tipo, titular_nome, titular_documento} | null,
 *  pendente: {..., solicitada_em, vale_a_partir} | null, carencia_horas } */
export async function dadosPagamento() {
  const st = carregar(); const id = prestadorDaSessao(st)
  return atraso(dadosJson(efetivarDados(st, id)))
}

/** RPC salvar_dados_pagamento: 1º cadastro vale na hora; troca do que já existe só vale depois de 72h (dá para cancelar). */
export async function salvarDadosPagamento(dados = {}) {
  const st = carregar(); const id = prestadorDaSessao(st)
  const pr = st.prestadores.find((x) => x.id === id)
  const novo = validarDadosPagamento(dados, pr)
  const d = efetivarDados(st, id)
  if (!d?.atual) st.dados_pagamento[id] = { atual: novo, pendente: null, atualizado_em: agoraIso() }
  else if (JSON.stringify(d.atual) === JSON.stringify(novo)) { d.pendente = null; d.atualizado_em = agoraIso() }
  else {
    const vale = emHoras(CARENCIA_DADOS_H)
    d.pendente = { ...novo, solicitada_em: agoraIso(), vale_a_partir: vale }; d.atualizado_em = agoraIso()
    const up = userDoPrestador(st, id)
    if (up) notificar(st, up, 'Troca dos dados de pagamento', `Os dados novos valem a partir de ${new Date(vale).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}. Não foi você? Cancele a troca no Perfil.`, '#/prestador/perfil')
  }
  mudou({ tipo: 'perfil' }); return atraso(dadosJson(st.dados_pagamento[id]))
}

/** RPC cancelar_troca_pagamento */
export async function cancelarTrocaPagamento() {
  const st = carregar(); const id = prestadorDaSessao(st)
  const d = efetivarDados(st, id)
  if (!d?.pendente) throw erro('sem_troca_pendente', 'Não há troca de dados para cancelar.')
  d.pendente = null; d.atualizado_em = agoraIso()
  mudou({ tipo: 'perfil' }); return atraso(dadosJson(d))
}

/** RPC enviar_nf (+ upload no bucket concertai-nf): arquivo + número + valor (= preço do serviço) + data de emissão
 *  + confirmação dos dados de pagamento. Pedido vai para "NF enviada, em conferência". */
export async function enviarNF({ pedido_id, arquivo, numero, valor_cents, emitida_em, confirmo_dados }) {
  const st = carregar(); const id = prestadorDaSessao(st); const ped = pedidoOuErro(st, pedido_id)
  if (ped.prestador_id !== id) throw erro('sem_permissao', 'Este pedido não é seu.')
  if (!['em_execucao', 'prova_enviada', 'concluido'].includes(ped.status)) throw erro('status_invalido', 'A NF entra depois do check-in.')
  if (ped.prestador_pago_em) throw erro('ja_pago', 'Este serviço já foi pago: a NF não muda mais.')
  if (ped.nf_status === 'aprovada') throw erro('nf_aprovada', 'A NF deste serviço já foi conferida e aprovada.')
  validarNF({ arquivo, numero, valor_cents, emitida_em, confirmo_dados }, ped, isoDia(0))
  const dp = efetivarDados(st, id)?.atual
  if (!dp) throw erro('sem_dados_pagamento', 'Cadastre a chave Pix e a conta no Perfil antes de enviar a NF.')
  Object.assign(ped, { nf_path: arquivo.name || 'nf.pdf', nf_enviada_em: agoraIso(), nf_numero: String(numero).trim(), nf_valor_cents: valor_cents, nf_emitida_em: emitida_em,
    nf_status: 'em_conferencia', nf_motivo: null, pagamento_dados_confirmados_em: agoraIso(),
    pagamento_dados_ref: { pix_tipo: dp.pix_tipo, pix_chave_mascarada: mascararPix(dp.pix_tipo, dp.pix_chave), banco: dp.banco, titular_documento: dp.titular_documento } })
  const im = st.imoveis.find((i) => i.id === ped.imovel_id)
  notificar(st, 'u-fra', `NF do serviço enviada · ${im.codigo}`, `PED-${ped.numero} · NF ${ped.nf_numero}`, '#/franquia/pedidos')
  mudou({ tipo: 'pedido', id: ped.id }); return atraso(comRelacoes(st, ped))
}

/** RPC minhas_garantias → serviços concluídos do prestador há menos de 90 dias:
 *  [{ pedido_id, numero, servico_codigo, servico_nome, imovel_codigo, imovel_nome, bairro, cidade, concluido_em, fim, dias_restantes, status, cobre, nao_cobre }] */
export async function garantiasPrestador() {
  const st = carregar(); const id = prestadorDaSessao(st); const hoje = isoDia(0)
  const l = st.pedidos.filter((p) => p.prestador_id === id && p.status === 'concluido').map((p) => {
    const sv = st.servicos.find((s) => s.codigo === p.servico_codigo); const im = st.imoveis.find((i) => i.id === p.imovel_id)
    const g = garantiaDe(p.concluido_em || p.data, hoje)
    return { pedido_id: p.id, numero: p.numero, servico_codigo: sv.codigo, servico_nome: sv.nome, imovel_codigo: im.codigo, imovel_nome: im.nome,
      bairro: im.bairro, cidade: im.cidade, concluido_em: g.inicio, fim: g.fim, dias_restantes: g.dias_restantes, status: 'ativa', cobre: GARANTIA_COBRE, nao_cobre: GARANTIA_NAO_COBRE }
  }).filter((g) => g.dias_restantes >= 0).sort((a, b) => a.fim.localeCompare(b.fim))
  return atraso(l)
}

/** notificacoes do usuário logado, mais novas primeiro */
export async function listarNotificacoes() { const st = carregar(); return atraso(st.notificacoes.filter((n) => n.user_id === st.sessao)) }
export async function marcarLida(id) { const st = carregar(); const n = st.notificacoes.find((x) => x.id === id); if (n) n.lida_em = agoraIso(); mudou({ tipo: 'notificacao' }) }

/** Avisa a tela quando algo muda (no real: Supabase Realtime). Devolve a função de cancelar. */
export function assinar(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn) }

// =====================================================================
// ANFITRIÃO AVULSO e imóvel FORA DA SEAZONE (T807, REGRAS de 17/11): paga no ato (Pix ou cartão), valor retido até
// o fim do serviço. Banco: migrations 20261117_14_anfitriao_avulso + _15_cobrancas; contrato em docs/ui-contrato-dados.md.
// Na demo o pagamento é sempre SIMULADO (switch PAGAMENTO_SIMULADO): código do celular na tela e "Simular pagamento".
// =====================================================================
const ABERTO_COB = ['pendente', 'pago', 'retido', 'liberado', 'reembolsado']
/** Quem paga no ato: o anfitrião sempre; proprietário e franquia quando o imóvel é fora da Seazone (sem repasse). */
function pagaNoAto(papel, im) { return papel === 'anfitriao' || Boolean(im && im.fora_seazone) }
/** Cobrança vigente do pedido (a mais nova não cancelada; com `qualquer`, a mais nova). */
function cobrancaDe(st, pedido_id, qualquer = false) {
  const l = (st.cobrancas || []).filter((c) => c.pedido_id === pedido_id && (qualquer || ABERTO_COB.includes(c.status)))
  return l.length ? l[l.length - 1] : null
}
function cobrancaAoCancelar(st, ped) {
  const c = cobrancaDe(st, ped.id, true)
  if (!c) return
  if (c.status === 'pendente') c.status = 'cancelada'
  else if (['pago', 'retido'].includes(c.status)) { c.status = 'reembolsado'; c.reembolsado_em = agoraIso(); c.reembolso_cents = c.valor_cents; c.motivo = 'pedido cancelado' }
  c.updated_at = agoraIso()
}
const pixFake = (id, cents) => `00020126580014br.gov.bcb.pix0136concertai-demo-${id}520400005303986540${String((cents / 100).toFixed(2)).length}${(cents / 100).toFixed(2)}5802BR5909CONCERTAI6013FLORIANOPOLIS62070503***6304D3M0`
/** Vence no que vier primeiro: 30 min depois de criada ou 3h antes do início da janela. */
function prazoCobranca(ped) {
  const [a, m, d] = ped.data.split('-').map(Number)
  const janela = new Date(a, m - 1, d, ped.janela_inicio - 3).getTime()
  return new Date(Math.max(Date.now() + 5 * 60e3, Math.min(Date.now() + 30 * 60e3, janela))).toISOString()
}
function novaCobranca(st, ped, metodo, status = 'pendente', extra = {}) {
  const dono = st.imoveis.find((i) => i.id === ped.imovel_id)
  const c = { id: `cb-${ped.id}-${(st.cobrancas.length + 1)}`, pedido_id: ped.id, aditivo_id: null, proprietario_id: dono?.proprietario_id || null, franquia_id: dono?.franquia_id || null,
    tipo: 'servico', metodo, valor_cents: ped.preco_cents, taxa_cents: ped.taxa_cents, liquido_cents: ped.liquido_cents, status, gateway: 'simulado', gateway_id: null,
    pix_copia_cola: metodo === 'pix' ? pixFake(ped.numero, ped.preco_cents) : null, checkout_url: null, expira_em: prazoCobranca(ped),
    pago_em: status !== 'pendente' ? haMin(60) : null, liberar_apos: null, liberado_em: status === 'liberado' ? haMin(1440) : null,
    reembolsado_em: status === 'reembolsado' ? haMin(1440) : null, reembolso_cents: status === 'reembolsado' ? ped.preco_cents : 0, motivo: null,
    created_at: haMin(90), updated_at: agoraIso(), ...extra }
  st.cobrancas.push(c)
  return c
}

/** Exemplos da demo: Lúcia (2 imóveis, pedidos em cada estado do pagamento), Rodrigo (1 imóvel) e um imóvel fora da
 *  Seazone na Carla (proprietária) e na franquia. Prestadores que atendem a Ilha toda (Diego, Rafaela, Elisa, Paula). */
function semearAnfitriao(st, p) {
  const ped = (o, cobStatus, metodo = 'pix', extra = {}) => {
    const x = p(o)
    Object.assign(x, extra)
    if (o.status === 'concluido') x.concluido_em = o.data
    if (cobStatus) novaCobranca(st, x, metodo, cobStatus)
    return x
  }
  const dU = (min) => diaDaSemana(min, [1, 2, 3, 4, 5])
  // Lúcia (anf-1)
  ped({ imovel_id: 'av-1', servico_codigo: 'EL-01', prestador_id: 'pt-5', comprador_papel: 'anfitriao', criado_por: 'u-anf1', data: isoDia(dU(2)), janela_inicio: 10, status: 'aguardando_pagamento',
    observacao: 'Chuveiro do banheiro social não esquenta.' }, 'pendente')
  ped({ imovel_id: 'av-2', servico_codigo: 'HI-02', prestador_id: 'pt-5', comprador_papel: 'anfitriao', criado_por: 'u-anf1', data: isoDia(dU(3)), janela_inicio: 14, status: 'aguardando_prestador' }, 'pago', 'cartao', { demo_prazo_min: 50 })
  ped({ imovel_id: 'av-1', servico_codigo: 'AR-01', prestador_id: 'pt-2', comprador_papel: 'anfitriao', criado_por: 'u-anf1', data: isoDia(diaDaSemana(4, [2, 3, 4, 5, 6])), janela_inicio: 9, status: 'confirmado' }, 'retido')
  const c1 = ped({ imovel_id: 'av-2', servico_codigo: 'EL-03', prestador_id: 'pt-8', comprador_papel: 'anfitriao', criado_por: 'u-anf1', data: isoDia(-10), janela_inicio: 10, status: 'concluido' }, 'liberado')
  st.avaliacoes.push({ pedido_id: c1.id, nota: 5, comentario: 'Rápida e cuidadosa.', criado_em: haMin(9 * 1440) })
  ped({ imovel_id: 'av-1', servico_codigo: 'HI-04', prestador_id: 'pt-4', comprador_papel: 'anfitriao', criado_por: 'u-anf1', data: isoDia(-5), janela_inicio: 14, status: 'cancelado' }, 'reembolsado', 'pix', { motivo_cancelamento: 'Resolvi com o síndico.' })
  // Rodrigo (anf-2)
  ped({ imovel_id: 'av-3', servico_codigo: 'EL-03', prestador_id: 'pt-5', comprador_papel: 'anfitriao', criado_por: 'u-anf2', data: isoDia(-20), janela_inicio: 9, status: 'concluido' }, 'liberado', 'cartao')
  ped({ imovel_id: 'av-3', servico_codigo: 'HI-02', prestador_id: 'pt-5', comprador_papel: 'anfitriao', criado_por: 'u-anf2', data: isoDia(dU(5)), janela_inicio: 9, status: 'confirmado' }, 'retido')
  // proprietária (Carla) e franquia: imóvel fora da Seazone também paga no ato
  ped({ imovel_id: 'av-4', servico_codigo: 'HI-02', prestador_id: 'pt-5', comprador_papel: 'proprietario', criado_por: 'u-prop', data: isoDia(dU(4)), janela_inicio: 15, status: 'aguardando_pagamento' }, 'pendente')
  ped({ imovel_id: 'av-5', servico_codigo: 'EL-03', prestador_id: 'pt-5', comprador_papel: 'franquia', criado_por: 'u-fra', data: isoDia(dU(3)), janela_inicio: 9, status: 'aguardando_pagamento' }, 'pendente')
  const nt = (id, user_id, min, titulo, corpo, link) => st.notificacoes.push({ id, user_id, titulo, corpo, link, lida_em: null, criado_em: haMin(min) })
  nt('nt-a1', 'u-anf1', 12, 'Falta pagar · AV-1', 'Pague para o pedido ir ao profissional. O valor fica guardado até o serviço terminar.', '#/anfitriao/pedidos')
  nt('nt-a2', 'u-anf1', 60, 'Pagamento aprovado · AV-2', 'Agora o profissional confirma em até 1h.', '#/anfitriao/pedidos')
}

function anfitriaoDaSessao(st) {
  const pf = perfilAtual(st)
  if (!pf || pf.papel !== 'anfitriao') throw erro('sem_permissao', 'Só o anfitrião acessa esta área.')
  return { pf, dono: st.proprietarios.find((x) => x.id === pf.proprietario_id) }
}
const mascCel = (t) => { const d = soDigitos(t); return d ? `(${d.slice(0, 2)}) •••••-${d.slice(-4)}` : '' }
const mascDoc = (d) => { d = soDigitos(d); return d.length === 14 ? `${d.slice(0, 2)}.•••.•••/••••-${d.slice(-2)}` : d.length === 11 ? `•••.•••.${d.slice(6, 9)}-${d.slice(-2)}` : '' }
const codigo6 = () => String(Math.floor(100000 + Math.random() * 900000))
function perfilAnfitriaoDe(st, dono) {
  return { anfitriao_id: dono.id, nome: dono.nome, email: dono.email || null, celular: dono.telefone ? `55${dono.telefone}` : null, celular_verificado: Boolean(dono.telefone_verificado_em),
    documento_tipo: dono.documento_tipo || null, documento_mascarado: mascDoc(dono.documento), criado_em: dono.criado_em || agoraIso(),
    n_imoveis: st.imoveis.filter((i) => i.proprietario_id === dono.id && i.ativo !== false).length }
}

/** RPC anfitriao_cadastrar. Na demo: cria a conta nova (perfil anfitrião) e entra nela; devolve o código na tela. */
export async function anfitriaoCadastrar({ nome, celular, documento, termos }) {
  const st = carregar()
  const n = String(nome ?? '').trim()
  if (n.length < 2 || n.length > 120) throw erro('nome_invalido', 'Informe o seu nome.')
  const cel = soDigitos(celular).replace(/^55(?=\d{10,11}$)/, '')
  if (!/^\d{2}9\d{8}$/.test(cel)) throw erro('celular_invalido', 'Celular com DDD e WhatsApp. Ex.: 48 99999-0000.')
  const doc = soDigitos(documento)
  if (![11, 14].includes(doc.length) || !documentoValido(doc)) throw erro('documento_invalido', 'CPF ou CNPJ inválido. Confira os números.')
  if (st.proprietarios.some((x) => soDigitos(x.documento) === doc)) throw erro('documento_ja_cadastrado', 'Já existe uma conta com esse documento. Entre com o e-mail dela.')
  if (!termos) throw erro('termos_pendentes', 'Leia e aceite os termos para criar a conta.')
  const k = st.proprietarios.filter((x) => x.tipo === 'anfitriao').length + 1
  const dono = { id: `anf-n${k}`, tipo: 'anfitriao', nome: n, email: `anfitriao${k}@demo.concertai.dev`, telefone: cel, documento: doc, documento_tipo: doc.length === 11 ? 'cpf' : 'cnpj', telefone_verificado_em: null, criado_em: agoraIso() }
  st.proprietarios.push(dono)
  const pf = { user_id: `u-anf-n${k}`, papel: 'anfitriao', nome: n, proprietario_id: dono.id }
  st.perfis.push(pf); st.sessao = pf.user_id
  st.termos_aceites ||= []; st.termos_aceites.push({ user_id: pf.user_id, aceito_em: agoraIso(), versao: VERSAO_TERMOS })
  const c = codigo6(); st.codigos[pf.user_id] = { codigo: c, expira: Date.now() + 10 * 60e3, tentativas: 0 }
  mudou({ tipo: 'sessao' })
  return atraso({ anfitriao_id: dono.id, celular_verificado: false, celular_mascarado: mascCel(cel), codigo_demo: c })
}
/** RPC anfitriao_verificar_celular: { verificado } ou { verificado: false, tentativas_restantes, error } (sem lançar). */
export async function anfitriaoVerificarCelular({ codigo }) {
  const st = carregar(); const { pf, dono } = anfitriaoDaSessao(st)
  if (dono.telefone_verificado_em) return atraso({ verificado: true })
  const c = st.codigos[pf.user_id]
  if (!c || Date.now() > c.expira) return atraso({ verificado: false, error: { code: 'codigo_expirado', message: 'O código venceu. Peça outro.' } })
  if (String(codigo).trim() !== c.codigo) {
    c.tentativas += 1; salvar()
    const resta = Math.max(0, 5 - c.tentativas)
    return atraso({ verificado: false, tentativas_restantes: resta, error: { code: resta ? 'codigo_invalido' : 'codigo_expirado', message: resta ? `Código errado. Você ainda tem ${resta} tentativa${resta === 1 ? '' : 's'}.` : 'Acabaram as tentativas. Peça outro código.' } })
  }
  dono.telefone_verificado_em = agoraIso(); delete st.codigos[pf.user_id]
  mudou({ tipo: 'perfil' }); return atraso({ verificado: true })
}
export async function anfitriaoReenviarCodigo() {
  const st = carregar(); const { pf, dono } = anfitriaoDaSessao(st)
  if (dono.telefone_verificado_em) return atraso({ verificado: true })
  const c = codigo6(); st.codigos[pf.user_id] = { codigo: c, expira: Date.now() + 10 * 60e3, tentativas: 0 }
  salvar(); return atraso({ verificado: false, codigo_demo: c })
}
export async function anfitriaoPerfil() { const st = carregar(); const { dono } = anfitriaoDaSessao(st); return atraso(perfilAnfitriaoDe(st, dono)) }
export async function anfitriaoSalvarPerfil({ nome, celular } = {}) {
  const st = carregar(); const { pf, dono } = anfitriaoDaSessao(st); let codigo_demo
  if (nome != null) { const n = String(nome).trim(); if (n.length < 2 || n.length > 120) throw erro('nome_invalido', 'Informe o seu nome.'); dono.nome = n; pf.nome = n }
  if (celular != null) {
    const cel = soDigitos(celular).replace(/^55(?=\d{10,11}$)/, '')
    if (!/^\d{2}9\d{8}$/.test(cel)) throw erro('celular_invalido', 'Celular com DDD e WhatsApp. Ex.: 48 99999-0000.')
    if (cel !== dono.telefone) { dono.telefone = cel; dono.telefone_verificado_em = null; codigo_demo = codigo6(); st.codigos[pf.user_id] = { codigo: codigo_demo, expira: Date.now() + 10 * 60e3, tentativas: 0 } }
  }
  mudou({ tipo: 'perfil' }); return atraso({ ...perfilAnfitriaoDe(st, dono), ...(codigo_demo ? { codigo_demo } : {}) })
}

/** Imóveis fora da Seazone de quem está logado (anfitrião; proprietário/franquia: os que cadastraram), com endereço e acesso. */
export async function meusImoveisAvulsos() {
  const st = carregar(); const pf = perfilAtual(st)
  const meu = (i) => i.fora_seazone && i.ativo !== false && (pf.franquia_id ? i.franquia_id === pf.franquia_id : i.proprietario_id === pf.proprietario_id)
  return atraso(st.imoveis.filter(meu).map((i) => {
    const pv = st.imoveis_privado[i.id] || {}
    return { ...i, ...pv, tem_ical: Boolean(pv.ical_url), pedidos_abertos: st.pedidos.filter((x) => x.imovel_id === i.id && !['concluido', 'cancelado', 'recusado_prestador', 'recusado_proprietario'].includes(x.status)).length }
  }))
}
const TIPOS_IMOVEL = ['apartamento', 'casa', 'studio', 'outro']
const TIPO_ROTULO = { apartamento: 'Apto', casa: 'Casa', studio: 'Studio', outro: 'Imóvel' }
/** RPC anfitriao_imovel_salvar (e, para proprietário/franquia, o cadastro do imóvel fora da Seazone). → { imovel_id, codigo } */
export async function imovelAvulsoSalvar(d = {}) {
  const st = carregar(); const pf = perfilAtual(st)
  if (!['anfitriao', 'proprietario', 'franquia'].includes(pf.papel)) throw erro('sem_permissao', 'Você não pode cadastrar imóvel.')
  const cep = soDigitos(d.cep)
  if (cep.length !== 8) throw erro('cep_invalido', 'CEP com 8 números.')
  const t = (v) => String(v ?? '').trim()
  if (t(d.logradouro).length < 3) throw erro('endereco_invalido', 'Informe a rua.')
  if (!t(d.numero)) throw erro('numero_invalido', 'Informe o número (ou "s/n").')
  if (t(d.bairro).length < 2) throw erro('bairro_invalido', 'Informe o bairro.')
  if (t(d.cidade).length < 2) throw erro('cidade_invalida', 'Informe a cidade.')
  if (!/^[A-Z]{2}$/.test(t(d.uf).toUpperCase())) throw erro('uf_invalida', 'UF com 2 letras.')
  if (!TIPOS_IMOVEL.includes(d.tipo)) throw erro('tipo_invalido', 'Escolha o tipo do imóvel.')
  const quartos = Number(d.quartos)
  if (!(Number.isInteger(quartos) && quartos >= 0 && quartos <= 20)) throw erro('quartos_invalido', 'Quartos de 0 a 20.')
  if (t(d.ical_url) && !/^https:\/\//.test(t(d.ical_url))) throw erro('ical_invalido', 'O link do calendário começa com https://')
  let im = d.id ? st.imoveis.find((i) => i.id === d.id) : null
  if (d.id && (!im || !im.fora_seazone)) throw erro('nao_encontrado', 'Imóvel não encontrado.')
  if (!im) {
    const n = st.imoveis.filter((i) => i.fora_seazone).length + 1
    im = { id: `av-n${n}-${Date.now() % 1e5}`, codigo: `AV-${n + 100}`, foto_url: null, fora_seazone: true, ativo: true,
      proprietario_id: pf.papel === 'franquia' ? null : pf.proprietario_id, franquia_id: pf.papel === 'franquia' ? pf.franquia_id : null }
    st.imoveis.push(im)
  }
  const nome = t(d.nome) || `${TIPO_ROTULO[d.tipo]} ${t(d.bairro)}`
  Object.assign(im, { nome, tipo: d.tipo, quartos, bairro: t(d.bairro), cidade: t(d.cidade), uf: t(d.uf).toUpperCase(), lat: d.lat ?? null, lng: d.lng ?? null })
  st.imoveis_privado[im.id] = { cep: `${cep.slice(0, 5)}-${cep.slice(5)}`, logradouro: t(d.logradouro), numero: t(d.numero), complemento: t(d.complemento),
    acesso_tipo: d.acesso_tipo || null, acesso_quem_abre: d.acesso_quem_abre || null, acesso_instrucoes: t(d.acesso_instrucoes) || null, ical_url: t(d.ical_url) || null }
  mudou({ tipo: 'imovel', id: im.id }); return atraso({ imovel_id: im.id, codigo: im.codigo })
}
export async function imovelAvulsoArquivar(imovel_id) {
  const st = carregar(); const im = st.imoveis.find((i) => i.id === imovel_id)
  if (!im || !im.fora_seazone) throw erro('nao_encontrado', 'Imóvel não encontrado.')
  if (st.pedidos.some((x) => x.imovel_id === imovel_id && !['concluido', 'cancelado', 'recusado_prestador', 'recusado_proprietario'].includes(x.status))) throw erro('imovel_com_pedido', 'Esse imóvel tem pedido em aberto. Conclua ou cancele antes de arquivar.')
  im.ativo = false; mudou({ tipo: 'imovel', id: im.id }); return atraso({ imovel_id, ativo: false })
}

/** RPC pagamento_iniciar(pedido, 'pix'|'cartao'): cria ou reaproveita a cobrança pendente; outro método cancela a anterior. */
export async function pagamentoIniciar({ pedido_id, metodo }) {
  const st = carregar(); const pf = perfilAtual(st); const ped = pedidoOuErro(st, pedido_id)
  if (!['pix', 'cartao'].includes(metodo)) throw erro('metodo_invalido', 'Escolha Pix ou cartão.')
  if (pf.papel === 'anfitriao' && !st.proprietarios.find((x) => x.id === pf.proprietario_id)?.telefone_verificado_em) throw erro('celular_nao_verificado', 'Confirme o seu celular antes de pagar.')
  if (ped.status !== 'aguardando_pagamento') throw erro(cobrancaDe(st, ped.id)?.status === 'pago' ? 'ja_pago' : 'status_invalido', 'Esse pedido não está esperando pagamento.')
  let c = cobrancaDe(st, ped.id)
  if (c && c.status === 'pendente' && new Date(c.expira_em) < new Date()) { c.status = 'cancelada'; c = null; mover(st, ped, 'cancelado'); ped.motivo_cancelamento = 'pagamento não feito'; mudou({ tipo: 'pedido' }); throw erro('cobranca_vencida', 'O prazo para pagar acabou e o pedido foi cancelado. Faça um pedido novo.') }
  if (c && c.status === 'pendente' && c.metodo !== metodo) { c.status = 'cancelada'; c.updated_at = agoraIso(); c = null }
  if (!c || c.status !== 'pendente') c = novaCobranca(st, ped, metodo, 'pendente', { created_at: agoraIso() })
  mudou({ tipo: 'cobranca', id: c.id }); return atraso(c)
}
/** RPC pagamento_confirmar_simulado: pendente → pago e o pedido vai ao profissional (aguardando_prestador, 1h para confirmar). */
export async function pagamentoConfirmarSimulado({ cobranca_id }) {
  const st = carregar(); const c = (st.cobrancas || []).find((x) => x.id === cobranca_id)
  if (!c) throw erro('nao_encontrado', 'Cobrança não encontrada.')
  if (c.gateway !== 'simulado') throw erro('gateway_nao_simulado', 'Só pagamento simulado.')
  if (c.status !== 'pendente') return atraso({ ...c, pedido_status: pedidoOuErro(st, c.pedido_id).status })
  const ped = pedidoOuErro(st, c.pedido_id)
  Object.assign(c, { status: 'pago', pago_em: agoraIso(), updated_at: agoraIso() })
  mover(st, ped, 'aguardando_prestador')
  const im = st.imoveis.find((i) => i.id === ped.imovel_id); const sv = st.servicos.find((s) => s.codigo === ped.servico_codigo)
  const up = userDoPrestador(st, ped.prestador_id)
  if (up) notificar(st, up, `Pedido novo · ${im.codigo}`, `${sv.nome} em ${fmtCurto(ped.data)}, ${ped.janela_inicio}h–${ped.janela_inicio + ped.janelas}h. Já pago. Confirme em até 1h.`, `#/prestador/pedido/${ped.id}`)
  mudou({ tipo: 'cobranca', id: c.id }); return atraso({ ...c, pedido_status: ped.status })
}
/** Cobrança vigente do pedido (ou null). No real: select em cobrancas (RLS: dono e admin). */
export async function cobrancaDoPedido(pedido_id) { return atraso(cobrancaDe(carregar(), pedido_id)) }
/** RPC anfitriao_cobrancas: pagamentos do anfitrião (sem as canceladas). */
export async function anfitriaoCobrancas() {
  const st = carregar(); const { dono } = anfitriaoDaSessao(st)
  return atraso((st.cobrancas || []).filter((c) => c.proprietario_id === dono.id && c.status !== 'cancelada').map((c) => {
    const ped = st.pedidos.find((x) => x.id === c.pedido_id) || {}
    return { ...c, pedido_numero: ped.numero, servico_nome: st.servicos.find((s) => s.codigo === ped.servico_codigo)?.nome, imovel_nome: st.imoveis.find((i) => i.id === ped.imovel_id)?.nome }
  }))
}
/** RPC admin_anfitrioes_listar(busca): nome, celular e documento mascarados, nº de imóveis e pedidos, valor pago. */
export async function adminAnfitrioesListar({ busca = '' } = {}) {
  const st = carregar(); const b = String(busca || '').trim().toLowerCase(); const dig = soDigitos(b)
  const out = st.proprietarios.filter((x) => x.tipo === 'anfitriao')
    .filter((x) => !b || x.nome.toLowerCase().includes(b) || (dig.length >= 4 && soDigitos(x.telefone).includes(dig)))
    .map((x) => {
      const ims = st.imoveis.filter((i) => i.proprietario_id === x.id)
      const ids = new Set(ims.map((i) => i.id))
      const pago = (st.cobrancas || []).filter((c) => ids.has(st.pedidos.find((p) => p.id === c.pedido_id)?.imovel_id) && ['pago', 'retido', 'liberado'].includes(c.status))
        .reduce((s, c) => s + c.valor_cents - (c.reembolso_cents || 0), 0)
      return { anfitriao_id: x.id, nome: x.nome, celular_mascarado: mascCel(x.telefone), celular_verificado: Boolean(x.telefone_verificado_em), documento_mascarado: mascDoc(x.documento),
        documento_tipo: x.documento_tipo, imoveis_qtd: ims.filter((i) => i.ativo !== false).length, pedidos_qtd: st.pedidos.filter((p) => ids.has(p.imovel_id)).length, pago_cents: pago, criado_em: x.criado_em || agoraIso() }
    })
  return atraso(out.sort((a, c) => c.pago_cents - a.pago_cents || a.nome.localeCompare(c.nome)))
}
