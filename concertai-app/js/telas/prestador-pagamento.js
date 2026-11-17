// ConcertAI · pagamento do prestador (REGRAS de 17/11 do Henry):
// - Perfil > Dados de pagamento: chave Pix (tipo + chave) e conta PJ (banco, agência, conta), titular = CNPJ do perfil;
//   trocar o que já está cadastrado só vale depois de 72h (carência do Pix, migration 11) e dá para cancelar.
// - Sem NF não recebe: ao concluir (ou depois, em Ganhos/no pedido) ele manda a NF do serviço (arquivo + número +
//   valor + data de emissão) e confirma os dados de pagamento. Valor da NF = preço do serviço (modelo A da CZT-002).
// - Aba Garantia: serviços concluídos há menos de 90 dias, com dias restantes e o que cobre.
// Dados: api.dadosPagamento / salvarDadosPagamento / cancelarTrocaPagamento / enviarNF / garantiasPrestador.
import * as api from '../api.js?v=79617c8'
import { $, esc, ic, icones, brl, fmtDia, isoDia, vazio, carregando, abrirSheet, toast, falha } from '../ui.js?v=79617c8'

const CSS = `.pg-dados{display:flex;flex-direction:column;gap:12px}
.pg-3{display:grid;grid-template-columns:1fr 110px 150px;gap:12px}
.pg-tit{display:flex;flex-direction:column;gap:2px;font-size:14px;line-height:20px;background:var(--muted);border-radius:12px;padding:10px 12px}
.pg-tit .cap{display:block}
.pg-pend{display:flex;gap:10px;align-items:flex-start;background:var(--warning-100);border-radius:12px;padding:12px;font-size:14px;line-height:20px}
.pg-pend>svg{color:var(--warning);flex:none;margin-top:2px}
.pg-pend .btn{margin-top:8px}
.pg-acoes{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.pg-sheet{display:flex;flex-direction:column;gap:12px;margin-top:8px}
.pg-sheet .pf-campo input[type=date],.pg-sheet .pf-campo input[type=file]{height:44px;border:1px solid var(--border);border-radius:12px;padding:0 12px;background:var(--surface);color:var(--fg);font:inherit;font-size:15px;width:100%}
.pg-sheet .pf-campo input[type=file]{padding:9px 12px}
.pg-valor{display:flex;justify-content:space-between;gap:12px;align-items:baseline;flex-wrap:wrap;background:var(--brand-100);border-radius:12px;padding:12px;font-size:14px;line-height:20px}
.pg-valor b{font-size:18px}
.pg-conta{border:1px solid var(--border);border-radius:12px;padding:12px;font-size:14px;line-height:20px;display:flex;flex-direction:column;gap:2px}
.pg-conta .cap a{color:var(--brand);font-weight:600}
.pg-chk{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:20px;cursor:pointer}
.pg-chk input{width:20px;height:20px;accent-color:var(--brand);flex:none;margin-top:1px}
.pg-sit{display:flex;gap:12px;align-items:flex-start;border-radius:12px;padding:16px;font-size:14px;line-height:20px}
.pg-sit>svg{flex:none;margin-top:2px}
.pg-sit p{margin-top:2px}
.pg-sit .btn{margin-top:10px}
.pg-sit.ok{background:var(--success-100)}.pg-sit.ok>svg{color:var(--success-ink)}
.pg-sit.ap{background:var(--warning-100)}.pg-sit.ap>svg{color:var(--warning)}
.pg-sit.no{background:var(--error-100)}.pg-sit.no>svg{color:var(--error)}
.pg-sit.in{background:var(--brand-100)}.pg-sit.in>svg{color:var(--brand)}
.pg-nf-dl{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin-top:6px;font-size:13px}
.pg-nf-dl dt{color:var(--fg-2)}
.pst-g-item{display:flex;flex-direction:column;gap:2px}
.pst-g-item.bloq .pst-gl{padding-bottom:6px}
.pst-g-bloq{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:0 0 12px}
.pst-g-bloq .cap{display:inline-flex;align-items:center;gap:4px;color:var(--warning);font-weight:600}
.pst-g-bloq .cap svg{width:14px;height:14px}
.kpi.bloq b{color:var(--warning)}
.gar-lista{display:flex;flex-direction:column;gap:12px}
.gar-card{display:flex;flex-direction:column;gap:8px}
.gar-hd{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.gar-dias{flex:none;display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:9999px;background:var(--success-100);color:var(--success-ink);font-size:13px;font-weight:700}
.gar-dias.fim{background:var(--warning-100);color:var(--warning)}
.gar-dias svg{width:16px;height:16px}
.gar-barra{height:6px;border-radius:9999px;background:var(--muted);overflow:hidden}
.gar-barra span{display:block;height:100%;background:var(--brand);border-radius:9999px}
.gar-regras{display:grid;gap:12px}
.gar-regras ul{list-style:none;display:flex;flex-direction:column;gap:6px;margin-top:6px}
.gar-regras li{display:flex;gap:8px;font-size:14px;line-height:20px}
.gar-regras li svg{width:16px;height:16px;flex:none;margin-top:2px}
.gar-regras .sim svg{color:var(--success)}.gar-regras .nao svg{color:var(--fg-3)}
.gar-raiz{container-type:inline-size}
@container (min-width:860px){.gar-lista{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.gar-regras{grid-template-columns:1fr 1fr}}
.pst-hd .badge{white-space:normal;text-align:right}
@media (max-width:1023px){.tabs:has(.tab:nth-child(5)){gap:2px;padding-left:8px;padding-right:8px}.tabs:has(.tab:nth-child(5)) .tab{padding:0 2px;font-size:13px;min-width:0}}
@media (max-width:520px){.pg-3{grid-template-columns:1fr 1fr}.pg-3 .pg-banco{grid-column:1/-1}}`
if (typeof document !== 'undefined' && !document.getElementById('css-prestador-pagamento')) {
  const st = document.createElement('style'); st.id = 'css-prestador-pagamento'; st.textContent = CSS; document.head.appendChild(st)
}

const BASE = '#/prestador'
const soDigitos = (v) => String(v ?? '').replace(/\D/g, '')
const fmtCnpj = (v) => { const d = soDigitos(v); return d.length === 14 ? api.formatarCnpj(d) : (v || '') }
const dataHora = (iso) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const dataCurta = (iso) => fmtDia(String(iso).slice(0, 10))
/** "R$ 335,00" para o campo de valor (sempre com centavos). */
const valorCampo = (c) => `R$ ${(c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
/** Linha curta da conta: "Pix CNPJ ********0136 · 260 Nu Pagamentos ag 0001 c/c 8812345-6" */
const resumoConta = (d) => `Pix ${esc(api.PIX_TIPOS[d.pix_tipo] || d.pix_tipo)} <b class="tn">${esc(api.mascararPix(d.pix_tipo, d.pix_chave))}</b> · ${esc(d.banco)} · ag ${esc(d.agencia)} · conta ${esc(d.conta)}`

// =====================================================================
// Perfil > Dados de pagamento
// =====================================================================
/** Seção do Perfil. f = perfil do prestador (CNPJ e razão social), dp = api.dadosPagamento(). */
export function secaoDadosPagamento(f, dp) {
  const a = dp?.atual || null
  const pend = dp?.pendente || null
  const tipo = a?.pix_tipo || 'cnpj'
  const ch = a ? (a.pix_tipo === 'cnpj' ? fmtCnpj(a.pix_chave) : a.pix_chave) : fmtCnpj(f.cnpj)
  return `<section class="card pf-sec mt16" id="pf-pagamento" aria-labelledby="pf-pag-h">
    <h2 id="pf-pag-h">${ic('landmark')}Dados de pagamento</h2>
    <p class="note">É para onde vai o Pix de cada serviço. A conta tem que ser da sua empresa: o titular é o CNPJ do perfil.</p>
    ${pend ? `<div class="pg-pend" role="status" id="pf-pag-pend">${ic('shield-alert')}<div>
        <b>Troca pedida em ${esc(dataHora(pend.solicitada_em))}</b>
        <p>Os dados novos (${resumoConta(pend)}) valem a partir de <b class="tn">${esc(dataHora(pend.vale_a_partir))}</b>. Até lá, o Pix vai para os dados atuais. É uma trava contra golpe.</p>
        <button type="button" class="btn out sm" id="pf-pag-cancelar">${ic('undo-2')}Cancelar troca</button>
      </div></div>` : ''}
    ${a ? `<div class="pg-tit"><span class="cap">Recebendo hoje em</span><span>${resumoConta(a)}</span></div>` : '<div class="pg-pend" role="status">' + ic('alert-triangle') + '<div><b>Sem dados de pagamento.</b><p>Cadastre para receber: sem chave Pix e conta, a NF não pode ser enviada.</p></div></div>'}
    <form class="pg-dados" id="pf-pag-form" novalidate>
      <div class="pf-2">
        <label class="pf-campo"><span>Chave Pix</span><input type="text" id="pf-pix-chave" maxlength="80" value="${esc(ch)}" ${tipo === 'cnpj' ? 'readonly' : ''} autocomplete="off"></label>
        <label class="pf-campo"><span>Tipo da chave</span><select id="pf-pix-tipo">${Object.entries(api.PIX_TIPOS).map(([v, r]) => `<option value="${v}" ${v === tipo ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></label>
      </div>
      <div class="pg-3">
        <label class="pf-campo pg-banco"><span>Banco</span><input type="text" id="pf-banco" maxlength="80" list="pf-bancos" value="${esc(a?.banco || '')}" placeholder="Ex.: 260 Nu Pagamentos"></label>
        <label class="pf-campo"><span>Agência</span><input type="text" id="pf-agencia" inputmode="numeric" maxlength="5" value="${esc(a?.agencia || '')}" placeholder="0001"></label>
        <label class="pf-campo"><span>Conta com dígito</span><input type="text" id="pf-conta" maxlength="16" value="${esc(a?.conta || '')}" placeholder="12345-6"></label>
      </div>
      <datalist id="pf-bancos">${['001 Banco do Brasil', '033 Santander', '077 Inter', '104 Caixa Econômica Federal', '237 Bradesco', '260 Nu Pagamentos', '290 PagSeguro', '323 Mercado Pago', '336 C6 Bank', '341 Itaú Unibanco', '748 Sicredi', '756 Sicoob'].map((b) => `<option value="${b}">`).join('')}</datalist>
      <label class="pf-campo"><span>Tipo de conta</span><select id="pf-conta-tipo">${Object.entries(api.CONTA_TIPOS).map(([v, r]) => `<option value="${v}" ${v === (a?.conta_tipo || 'corrente') ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></label>
      <div class="pg-tit"><span class="cap">Titular (do seu perfil)</span><span>${esc(f.razao_social || f.nome_exibicao || '')} · CNPJ <span class="tn">${esc(fmtCnpj(f.cnpj))}</span></span></div>
      <div class="pg-acoes">
        <button type="submit" class="btn pri" id="pf-pag-salvar">${ic('save')}Salvar dados de pagamento</button>
        <span class="cap">${a ? `Trocar o que já está cadastrado só vale ${esc(dp.carencia_horas || api.CARENCIA_DADOS_H)}h depois, e você recebe aviso.` : 'O 1º cadastro vale na hora.'}</span>
      </div>
    </form>
  </section>`
}

/** Liga a seção (salvar e cancelar troca). */
export function ligarDadosPagamento(ctx, f) {
  const el = ctx.el
  const tipo = $('#pf-pix-tipo', el); const chave = $('#pf-pix-chave', el)
  if (!tipo) return
  tipo.addEventListener('change', () => {
    const cnpj = tipo.value === 'cnpj'
    chave.readOnly = cnpj
    chave.value = cnpj ? fmtCnpj(f.cnpj) : ''
    chave.placeholder = { email: 'financeiro@suaempresa.com', telefone: '(48) 99999-0000', aleatoria: '0000aaaa-0000-0000-0000-000000000000' }[tipo.value] || ''
    if (!cnpj) chave.focus()
  })
  $('#pf-pag-form', el).addEventListener('submit', async (ev) => {
    ev.preventDefault()
    const dados = { pix_tipo: tipo.value, pix_chave: chave.value, banco: $('#pf-banco', el).value, agencia: $('#pf-agencia', el).value,
      conta: $('#pf-conta', el).value, conta_tipo: $('#pf-conta-tipo', el).value }
    try { api.validarDadosPagamento(dados, f) } catch (e) { toast(e.message); return }
    const bt = $('#pf-pag-salvar', el); bt.disabled = true
    try {
      const r = await api.salvarDadosPagamento(dados)
      toast(r.pendente ? `Troca registrada. Vale a partir de ${dataHora(r.pendente.vale_a_partir)}.` : 'Dados de pagamento salvos.')
      ctx.recarregar()
    } catch (e) { bt.disabled = false; falha(e) }
  })
  const canc = $('#pf-pag-cancelar', el)
  if (canc) canc.addEventListener('click', async () => {
    canc.disabled = true
    try { await api.cancelarTrocaPagamento(); toast('Troca cancelada. Seguem valendo os dados atuais.'); ctx.recarregar() } catch (e) { canc.disabled = false; falha(e) }
  })
}

// =====================================================================
// NF do serviço + confirmação dos dados (no concluir, no pedido e em Ganhos)
// =====================================================================
/**
 * Abre a folha da NF. concluir = true: é o "Concluir" do serviço em atendimento (conclui e manda a NF,
 * ou conclui sem NF e o valor fica bloqueado). Depois de tudo, chama ctx.recarregar().
 */
export async function sheetNF(ctx, p, { concluir = false } = {}) {
  let dp = null
  try { dp = await api.dadosPagamento() } catch (e) { falha(e) }
  const a = dp?.atual || null
  const hoje = isoDia(0)
  const s = abrirSheet(`<h2>${concluir ? 'Concluir o serviço' : 'Enviar a NF do serviço'}</h2>
    <p class="sub mt8"><b>Sem NF não há pagamento.</b> Emita a NF de serviço no CNPJ da sua empresa, para o tomador indicado no pedido, no valor do serviço.</p>
    <form class="pg-sheet" id="nf-form" novalidate>
      <div class="pg-valor"><span>Valor da NF <b class="tn">${brl(api.valorEsperadoNF(p))}</b></span><span class="cap">Você recebe ${brl(p.liquido_cents)} · a comissão fixa de ${brl(p.taxa_cents)} sai com NF da Seazone</span></div>
      <label class="pf-campo"><span>Arquivo da NF (PDF, XML ou foto)</span><input type="file" id="nf-arq" accept="application/pdf,.pdf,.xml,text/xml,image/*"></label>
      <div class="pf-2">
        <label class="pf-campo"><span>Número da NF</span><input type="text" id="nf-numero" maxlength="20" inputmode="numeric" placeholder="Ex.: 123"></label>
        <label class="pf-campo"><span>Emitida em</span><input type="date" id="nf-data" value="${hoje}" min="${esc(p.data)}" max="${hoje}"></label>
      </div>
      <label class="pf-campo"><span>Valor da NF</span><input type="text" id="nf-valor" inputmode="decimal" maxlength="14" value="${valorCampo(api.valorEsperadoNF(p))}"><small class="pf-dica">Tem que ser o preço do serviço. Item extra (peça) tem nota própria.</small></label>
      <div class="pg-conta" id="nf-conta">
        <span class="cap">O Pix vai para</span>
        ${a ? `<span>${resumoConta(a)}</span><span class="cap">Titular ${esc(a.titular_nome || '')} · CNPJ ${esc(fmtCnpj(a.titular_documento))} · <a href="${BASE}/perfil?sec=pagamento" data-fechar-sheet="1">Mudar no Perfil</a></span>
          ${dp.pendente ? `<span class="cap">Troca pedida vale a partir de ${esc(dataHora(dp.pendente.vale_a_partir))}.</span>` : ''}`
        : `<span><b>Você ainda não tem dados de pagamento.</b></span><span class="cap"><a href="${BASE}/perfil?sec=pagamento" data-fechar-sheet="1">Cadastre a chave Pix e a conta no Perfil</a> e volte para enviar a NF.</span>`}
      </div>
      <label class="pg-chk"><input type="checkbox" id="nf-confirmo" ${a ? '' : 'disabled'}><span>Confirmo que o pagamento deste serviço vai para estes dados.</span></label>
      <div class="pst-acoes nf-acoes">
        <button type="submit" class="btn cta" id="nf-enviar" ${a ? '' : 'disabled'}>${ic('file-check')}${concluir ? 'Concluir e enviar NF' : 'Enviar NF'}</button>
        ${concluir ? `<button type="button" class="btn out" id="nf-sem">Concluir sem NF agora</button>` : '<button type="button" class="btn out" data-fechar-sheet="1">Agora não</button>'}
      </div>
      ${concluir ? '<p class="cap">Sem NF o valor fica bloqueado em Ganhos até você enviar.</p>' : ''}
    </form>`)
  const el = s.el
  const enviar = $('#nf-enviar', el)
  // conclui uma vez só: se a NF falhar depois, tentar de novo não repete o concluir
  const concluirSemNF = async () => {
    if (p.status !== 'em_execucao') return
    await api.avancarPedido({ pedido_id: p.id, para: 'prova_enviada' })
    p.status = 'prova_enviada'
  }
  $('#nf-form', el).addEventListener('submit', async (ev) => {
    ev.preventDefault()
    const dados = {
      pedido_id: p.id, arquivo: $('#nf-arq', el).files?.[0] || null, numero: $('#nf-numero', el).value.trim(),
      valor_cents: api.centavos($('#nf-valor', el).value), emitida_em: $('#nf-data', el).value, confirmo_dados: $('#nf-confirmo', el).checked,
    }
    try { api.validarNF(dados, p, hoje) } catch (e) { toast(e.message); return }
    enviar.disabled = true
    try {
      if (concluir) await concluirSemNF()
      await api.enviarNF(dados)
      s.fechar()
      toast(concluir ? 'Serviço concluído e NF enviada. Conferimos e o Pix cai em até 1 dia útil.' : 'NF enviada. Conferimos e o Pix cai em até 1 dia útil.')
      ctx.recarregar()
    } catch (e) { enviar.disabled = false; falha(e); if (concluir) ctx.recarregar() }
  })
  const sem = $('#nf-sem', el)
  if (sem) sem.addEventListener('click', async () => {
    sem.disabled = true
    try { await concluirSemNF(); s.fechar(); toast('Concluído. Envie a NF para receber: o valor fica bloqueado em Ganhos.'); ctx.recarregar() } catch (e) { sem.disabled = false; falha(e) }
  })
}

/** Situação do pagamento no detalhe do pedido (serviço feito): bloqueado sem NF, em conferência, liberado, pago. */
export function blocoPagamento(p, matAprovado = 0) {
  const s = api.situacaoPagamento(p)
  const valor = brl(p.liquido_cents + matAprovado)
  const nf = p.nf_numero ? `<dl class="pg-nf-dl"><dt>NF</dt><dd class="tn">${esc(p.nf_numero)} · ${brl(p.nf_valor_cents)}${p.nf_emitida_em ? ` · emitida ${esc(fmtDia(p.nf_emitida_em))}` : ''}</dd>
    ${p.pagamento_dados_ref ? `<dt>Pix</dt><dd>${esc(api.PIX_TIPOS[p.pagamento_dados_ref.pix_tipo] || '')} <span class="tn">${esc(p.pagamento_dados_ref.pix_chave_mascarada || '')}</span> · ${esc(p.pagamento_dados_ref.banco || '')}</dd>` : ''}</dl>` : ''
  const botao = (t) => `<button type="button" class="btn cta" data-enviar-nf="${esc(p.id)}" id="pst-enviar-nf">${ic('file-up')}${t}</button>`
  const corpo = {
    aguardando_nf: [ic('lock'), `<b>${valor} bloqueado: falta a NF</b><p>Sem NF não há pagamento. Envie a NF do serviço e confirme seus dados de pagamento.</p>${botao('Enviar NF para receber')}`],
    nf_recusada: [ic('file-x'), `<b>NF recusada: envie de novo</b><p>${esc(p.nf_motivo || 'A NF não bateu com o pedido.')}</p>${botao('Enviar NF de novo')}`],
    nf_em_conferencia: [ic('file-clock'), `<b>NF enviada, em conferência</b><p>Conferimos a NF e, com o serviço confirmado, o Pix de ${valor} cai em até 1 dia útil.</p>${nf}`],
    nf_aprovada: [ic('file-check'), `<b>NF aprovada</b><p>O cliente confere as fotos (ou confirma sozinho em 72h). Depois disso, o Pix de ${valor} cai em até 1 dia útil.</p>${nf}`],
    liberado: [ic('wallet'), `<b>Pagamento liberado: ${valor}</b><p>O Pix cai em até 1 dia útil.</p>${nf}`],
    pago: [ic('circle-check'), `<b>Pago: ${valor}</b><p>O Pix já caiu${p.prestador_pago_em ? ` em ${esc(dataCurta(p.prestador_pago_em))}` : ''}.</p>${nf}`],
  }[s.chave]
  if (!corpo) return ''
  return `<section class="pg-sit ${s.tom}" id="pst-pagamento" aria-label="Pagamento">${corpo[0]}<div>${corpo[1]}</div></section>`
}

/** Liga os botões "Enviar NF" (detalhe, lista e Ganhos): busca o pedido e abre a folha. */
export function ligarEnviarNF(ctx) {
  ctx.el.querySelectorAll('[data-enviar-nf]').forEach((b) => b.addEventListener('click', async (ev) => {
    ev.preventDefault()
    b.disabled = true
    try { const p = await api.obterPedido(b.dataset.enviarNf); await sheetNF(ctx, p) } catch (e) { falha(e) }
    b.disabled = false
  }))
}

// =====================================================================
// Aba Garantia
// =====================================================================
export async function telaGarantia(ctx) {
  ctx.el.innerHTML = `<div class="wrap">${carregando(3)}</div>`
  let l
  try { l = await api.garantiasPrestador() } catch (e) {
    ctx.el.innerHTML = `<div class="wrap">${vazio({ icone: 'cloud-off', titulo: 'Não deu pra carregar suas garantias', texto: 'Confira a internet e tente de novo.' })}</div>`; icones(); falha(e); return
  }
  const N = api.GARANTIA_DIAS
  ctx.el.innerHTML = `<div class="wrap gar-raiz">
    <h1 class="pst-titulo">Em garantia</h1>
    <p class="sub mt8">Todo serviço tem ${N} dias de garantia da mão de obra, contados da conclusão. ${l.length ? `Você tem <b class="tn">${l.length}</b> ${l.length > 1 ? 'serviços' : 'serviço'} em garantia.` : ''}</p>
    ${l.length ? `<div class="gar-lista mt16">${l.map((g) => {
      const fim = g.dias_restantes <= 15
      const pct = Math.max(0, Math.min(100, Math.round((g.dias_restantes / N) * 100)))
      return `<article class="card gar-card" aria-label="PED-${esc(g.numero)} · ${esc(g.servico_nome)}">
        <div class="gar-hd"><div><b>${esc(g.servico_nome)}</b><div class="cap"><span class="tn">PED-${esc(g.numero)}</span> · concluído ${esc(fmtDia(g.concluido_em))}</div></div>
          <span class="gar-dias${fim ? ' fim' : ''}">${ic('shield-check')}<span class="tn">${g.dias_restantes === 0 ? 'Último dia' : `${g.dias_restantes} ${g.dias_restantes === 1 ? 'dia' : 'dias'}`}</span></span></div>
        <div class="meta"><span>${ic('home')}${esc(g.imovel_nome)} · ${esc(g.bairro)}, ${esc(g.cidade)}</span><span>${ic('calendar-clock')}Garantia até ${esc(fmtDia(g.fim))}</span></div>
        <div class="gar-barra" role="progressbar" aria-label="Dias restantes" aria-valuemin="0" aria-valuemax="${N}" aria-valuenow="${esc(g.dias_restantes)}"><span style="width:${pct}%"></span></div>
        ${g.status === 'acionada' ? `<div class="pg-pend">${ic('alert-triangle')}<span><b>Garantia acionada.</b> O cliente relatou o mesmo defeito: a operação vai te chamar para refazer.</span></div>` : ''}
        <a class="pst-ver" href="${BASE}/pedido/${encodeURIComponent(g.pedido_id)}">Ver o serviço${ic('chevron-right')}</a>
      </article>`
    }).join('')}</div>` : `<div class="card mt16">${vazio({ icone: 'shield-check', titulo: 'Nenhum serviço em garantia', texto: `Os serviços que você concluir ficam aqui por ${N} dias.` })}</div>`}
    <section class="card mt16 gar-regras" id="gar-regras">
      <div><h3>O que a garantia cobre</h3><ul><li class="sim">${ic('check')}<span>${esc(api.GARANTIA_COBRE)}</span></li></ul></div>
      <div><h3>O que não cobre</h3><ul>${api.GARANTIA_NAO_COBRE.replace(/\.$/, '').split(/, | e (?=desgaste)/).map((x) => `<li class="nao">${ic('x')}<span>${esc(x.charAt(0).toUpperCase() + x.slice(1))}</span></li>`).join('')}</ul></div>
    </section>
  </div>`
  icones()
}
