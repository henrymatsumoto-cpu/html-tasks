// ConcertAI · blocos do portal do prestador (T624) que entram na tela de execução do pedido
// (web/js/telas/prestador.js, da T629): checklist, material com aprovação do comprador e NF do serviço.
// E um bloco para o comprador (proprietário/franquia, T622/T623) aprovar o material: `blocoMateriaisComprador`.
//
// Uso na tela:  const x = await api.extrasDoPedido(p)
//               html += blocoChecklist(p, x) + blocoMaterial(p, x) + blocoNF(p, x)
//               depois do innerHTML: ligarExtras(ctx, p, x)
import * as api from '../api.js?v=79617c8'
import { $, esc, ic, brl, toast, falha } from '../ui.js?v=79617c8'

// estilos próprios destes blocos (não mexe no app.css da T629)
const CSS = `.pst-chk{list-style:none;display:flex;flex-direction:column;gap:4px;margin-top:8px}
.pst-chk label{display:flex;gap:12px;align-items:center;min-height:44px;padding:0 12px;border-radius:12px;background:var(--muted);cursor:pointer;font-size:15px}
.pst-chk input{width:20px;height:20px;accent-color:var(--brand);flex:none}
.pst-chk input:checked+span{color:var(--fg-2);text-decoration:line-through}
.pst-bloco h3 .cap{font-weight:500;margin-left:6px}
.pst-mat-in{flex:1;min-width:0}
.pst-mats{list-style:none;display:flex;flex-direction:column;gap:8px;margin-top:8px}
.pst-mats li{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;font-size:14px}
.pst-matform{display:grid;grid-template-columns:1fr 120px;gap:8px;align-items:end}
.pst-matform label{display:flex;flex-direction:column;gap:4px}
.pst-matform input[type=text]{height:40px;border:1px solid var(--border);border-radius:10px;padding:0 12px;background:var(--surface);color:var(--fg);font:inherit}
.pst-acoes-mat{display:flex;gap:6px}
.pst-prazo{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:9999px;background:var(--warning-100);color:var(--warning);font-size:13px;font-weight:700}
.pst-prazo svg{width:16px;height:16px}
.pst-prazo.urg{background:var(--error-100);color:var(--error)}
a.pst-nota-faixa{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;margin-top:16px;color:var(--fg);text-decoration:none}
.pst-nota-n{display:inline-flex;align-items:center;gap:4px;font-size:22px;line-height:28px;font-weight:800}
.pst-nota-n svg{color:#F5B400;fill:#F5B400}
.pst-nota-tx{display:flex;flex-direction:column;min-width:0}
.pst-rec{gap:8px;opacity:.9}
.pst-menos{color:var(--warning);white-space:nowrap}
.pst-raiz{container-type:inline-size}
@container (min-width:860px){.pst-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}}
@media (max-width:420px){.pst-matform{grid-template-columns:1fr}.pst-mats li{grid-template-columns:1fr auto}}`
if (typeof document !== 'undefined' && !document.getElementById('css-prestador-extras')) {
  const st = document.createElement('style'); st.id = 'css-prestador-extras'; st.textContent = CSS; document.head.appendChild(st)
}

const ROT_MAT = { pendente: ['Esperando o cliente', 'b-ap'], aprovado: ['Aprovado', 'b-ok'], recusado: ['Recusado', 'b-no'] }
const EM_ATENDIMENTO = ['confirmado', 'em_execucao']

/** Checklist do serviço (vem do "inclui" do catálogo). Editável do aceite até mandar as fotos. */
export function blocoChecklist(p, x) {
  if (!x.checklist.length) return ''
  const edita = EM_ATENDIMENTO.includes(p.status)
  const feitos = x.checklist.filter((i) => i.feito).length
  return `<section class="pst-bloco" id="pst-checklist">
    <h3>Checklist <span class="cap">${feitos} de ${x.checklist.length}</span></h3>
    <ul class="pst-chk">${x.checklist.map((i, n) => `<li><label><input type="checkbox" data-chk="${n}" ${i.feito ? 'checked' : ''} ${edita ? '' : 'disabled'}><span>${esc(i.item)}</span></label></li>`).join('')}</ul>
  </section>`
}

/** Materiais já informados + formulário (só em atendimento). */
export function blocoMaterial(p, x) {
  const lista = x.materiais.length ? `<ul class="pst-mats">${x.materiais.map((m) => {
    const [rot, tom] = ROT_MAT[m.status] || [m.status, 'b-no']
    return `<li><span>${esc(m.descricao)}</span><b class="tn">${brl(m.valor_cents)}</b><span class="badge ${tom}">${rot}</span></li>`
  }).join('')}</ul>` : ''
  if (!EM_ATENDIMENTO.includes(p.status)) {
    return lista ? `<section class="pst-bloco"><h3>Item extra</h3>${lista}</section>` : ''
  }
  return `<section class="mat pst-mat" id="pst-material">${ic('package')}<div class="pst-mat-in">
    <b>Precisou de algo fora do pedido?</b>
    <p>Material e peças não estão inclusos. Diga o que precisa, o valor e mande a foto: vai para aprovação de quem paga antes de você comprar.</p>
    ${lista}
    <div class="pst-matform mt8">
      <label><span class="cap">O que precisa</span><input type="text" id="pst-mat-desc" maxlength="200" placeholder="Ex.: resistência 220V 6800W"></label>
      <label><span class="cap">Valor</span><input type="text" inputmode="decimal" id="pst-mat-valor" maxlength="12" placeholder="R$ 0,00"></label>
      <label class="btn out sm pst-add">${ic('camera')}<span id="pst-mat-foto-rot">Foto (opcional)</span><input type="file" accept="image/*" capture="environment" id="pst-mat-foto" hidden></label>
      <button type="button" class="btn pri sm" id="pst-mat-enviar">Pedir item extra</button>
    </div>
  </div></section>`
}

/** NF do serviço: o prestador PJ emite e anexa (PDF, XML ou foto). */
export function blocoNF(p, x) {
  if (!['em_execucao', 'prova_enviada', 'concluido'].includes(p.status)) return ''
  const tem = x.nf
  return `<section class="pst-bloco" id="pst-nf">
    <h3>Nota fiscal do serviço</h3>
    ${tem
      ? `<p class="note">${ic('file-check', 'i14')} NF anexada${tem.enviada_em ? ` em ${new Date(tem.enviada_em).toLocaleDateString('pt-BR')}` : ''}. ${tem.url ? `<a href="${esc(tem.url)}" target="_blank" rel="noopener">Abrir</a>` : ''}</p>`
      : '<p class="note">Emita a NF no CNPJ da sua empresa para o tomador indicado no pedido.</p>'}
    <label class="btn out sm pst-add mt8">${ic('file-up')}${tem ? 'Trocar NF' : 'Enviar NF'}<input type="file" accept="application/pdf,.pdf,.xml,text/xml,image/*" id="pst-nf-arq" hidden></label>
  </section>`
}

/** Ganhos: serviço + material aprovado (reembolso). */
export function totalMateriaisAprovados(x) { return x.materiais.filter((m) => m.status === 'aprovado').reduce((s, m) => s + m.valor_cents, 0) }

/** Liga os eventos dos 3 blocos. */
export function ligarExtras(ctx, p, x) {
  const el = ctx.el
  el.querySelectorAll('[data-chk]').forEach((cb) => cb.addEventListener('change', async () => {
    const itens = x.checklist.map((i, n) => ({ item: i.item, feito: n === Number(cb.dataset.chk) ? cb.checked : i.feito }))
    try { x.checklist = await api.salvarChecklist({ pedido_id: p.id, itens }); const cap = $('#pst-checklist .cap', el); if (cap) cap.textContent = `${x.checklist.filter((i) => i.feito).length} de ${x.checklist.length}` } catch (e) { cb.checked = !cb.checked; falha(e) }
  }))

  const foto = $('#pst-mat-foto', el)
  if (foto) foto.addEventListener('change', () => { const r = $('#pst-mat-foto-rot', el); if (r) r.textContent = foto.files?.[0] ? 'Foto escolhida' : 'Foto (opcional)' })
  const enviar = $('#pst-mat-enviar', el)
  if (enviar) enviar.addEventListener('click', async () => {
    const descricao = $('#pst-mat-desc', el).value.trim()
    const valor_cents = api.centavos($('#pst-mat-valor', el).value)
    if (!descricao) { toast('Diga qual peça ou material precisa.'); return }
    if (!valor_cents) { toast('Informe o valor do material.'); return }
    enviar.disabled = true
    try {
      let foto_id = null
      const arq = foto?.files?.[0]
      if (arq) foto_id = (await api.enviarFoto({ pedido_id: p.id, tipo: 'material', arquivo: arq })).id
      await api.informarMaterial({ pedido_id: p.id, descricao, valor_cents, foto_id })
      toast('Enviado ao cliente. Compre só depois que ele aprovar.')
      ctx.recarregar()
    } catch (e) { enviar.disabled = false; falha(e) }
  })

  const nf = $('#pst-nf-arq', el)
  if (nf) nf.addEventListener('change', async () => {
    const arquivo = nf.files?.[0]
    if (!arquivo) return
    nf.disabled = true; toast('Enviando a NF...')
    try { await api.anexarNF({ pedido_id: p.id, arquivo }); toast('NF anexada.'); ctx.recarregar() } catch (e) { nf.disabled = false; falha(e) }
  })
}

// ---------- lado do comprador (T622 proprietário, T623 franquia) ----------
/** Bloco "Aprovar material" no detalhe do pedido do comprador. x = await api.extrasDoPedido(p). */
export function blocoMateriaisComprador(p, x) {
  if (!x.materiais.length) return ''
  return `<section class="card" id="cmp-materiais"><h3>Material pedido pelo profissional</h3>
    <ul class="pst-mats">${x.materiais.map((m) => {
      const [rot, tom] = ROT_MAT[m.status] || [m.status, 'b-no']
      return `<li><span>${esc(m.descricao)}</span><b class="tn">${brl(m.valor_cents)}</b>${m.status === 'pendente'
        ? `<span class="pst-acoes-mat"><button type="button" class="btn pri sm" data-mat-aprovar="${esc(m.id)}">Aprovar</button><button type="button" class="btn out sm" data-mat-recusar="${esc(m.id)}">Recusar</button></span>`
        : `<span class="badge ${tom}">${rot}</span>`}</li>`
    }).join('')}</ul>
    <p class="cap mt8">O valor do material é somado ao serviço e descontado no repasse.</p></section>`
}
export function ligarMateriaisComprador(ctx) {
  ctx.el.querySelectorAll('[data-mat-aprovar],[data-mat-recusar]').forEach((b) => b.addEventListener('click', async () => {
    const aprovar = !!b.dataset.matAprovar
    b.disabled = true
    try { await api.decidirMaterial({ material_id: b.dataset.matAprovar || b.dataset.matRecusar, aprovar }); toast(aprovar ? 'Material aprovado. O profissional foi avisado.' : 'Material recusado.'); ctx.recarregar() } catch (e) { b.disabled = false; falha(e) }
  }))
}
