// ConcertAI · aba Perfil do prestador (pedido do Henry de 17/11).
// Ele edita o que aparece na vitrine de quem contrata: nome de exibição, empresa (razão social, MEI/ME, CNPJ),
// descrição, serviços que faz, onde atende (cidade toda ou bairros) e dias/horários de atendimento.
// Dados: api.perfilPrestador() / api.salvarPerfilPrestador() / api.areasConhecidas() (as duas fontes, contrato em
// docs/ui-contrato-dados.md seção 17/11). A vitrine (prestadoresDisponiveis) lê os mesmos campos: salvou, refletiu.
// Dados de pagamento (Pix + conta, titular = CNPJ, troca com carência de 72h): seção própria, prestador-pagamento.js.
import * as api from '../api.js?v=79617c8'
import { $, esc, ic, icones, avatar, estrela, vazio, carregando, toast, falha } from '../ui.js?v=79617c8'
import { secaoDadosPagamento, ligarDadosPagamento } from './prestador-pagamento.js?v=79617c8'

const CSS = `.pf-raiz{container-type:inline-size}
.pf-grid{display:grid;gap:16px;margin-top:8px}
.pf-sec{display:flex;flex-direction:column;gap:12px}
.pf-sec h2{font-size:18px;line-height:24px;font-weight:700;display:flex;align-items:center;gap:8px}
.pf-sec h2 svg{color:var(--brand)}
.pf-campo{display:flex;flex-direction:column;gap:4px}
.pf-campo>span{font-size:13px;line-height:18px;font-weight:600;color:var(--fg-2)}
.pf-campo select,.pf-sel{height:44px;border:1px solid var(--border);border-radius:12px;padding:0 12px;background:var(--surface);color:var(--fg);font:inherit;font-size:15px}
.pf-campo input[aria-invalid=true]{border-color:var(--error);box-shadow:0 0 0 3px var(--error-100)}
.pf-erro{font-size:12px;line-height:16px;color:var(--error);font-weight:600}
.pf-dica{font-size:12px;line-height:16px;color:var(--fg-2)}
.pf-2{display:grid;grid-template-columns:1fr 140px;gap:12px}
.pf-cat{border:1px solid var(--border);border-radius:12px;padding:12px}
.pf-cat h3{font-size:14px;line-height:20px;font-weight:700;margin-bottom:6px;display:flex;justify-content:space-between;gap:8px}
.pf-cat h3 button{font-size:12px;font-weight:600;color:var(--brand)}
.pf-svs{display:flex;flex-direction:column;gap:2px}
.pf-sv{display:grid;grid-template-columns:20px 1fr;gap:10px;align-items:start;padding:8px 4px;border-radius:8px;cursor:pointer}
.pf-sv:hover{background:var(--muted)}
.pf-sv input{width:18px;height:18px;margin-top:2px;accent-color:var(--brand)}
.pf-sv b{font-size:14px;line-height:20px;font-weight:600;display:block}
.pf-sv small{font-size:12px;line-height:16px;color:var(--fg-2);display:flex;gap:4px;align-items:flex-start}
.pf-sv small svg{width:14px;height:14px;margin-top:1px;color:var(--warning)}
.pf-chips{display:flex;flex-wrap:wrap;gap:8px}
.pf-chip{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 6px 0 12px;border-radius:9999px;background:var(--brand-100);font-size:13px;font-weight:600}
.pf-chip button{width:24px;height:24px;border-radius:50%;display:grid;place-items:center}
.pf-chip button:hover{background:var(--brand-200)}
.pf-chip button svg{width:14px;height:14px}
.pf-addarea{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end}
.pf-dias{display:flex;flex-direction:column;gap:6px}
.pf-dia{display:grid;grid-template-columns:120px 1fr;gap:12px;align-items:center;min-height:44px;padding:4px 8px;border-radius:10px}
.pf-dia.on{background:var(--muted)}
.pf-dia label{display:flex;gap:8px;align-items:center;font-weight:600;font-size:14px;cursor:pointer}
.pf-dia input[type=checkbox]{width:18px;height:18px;accent-color:var(--brand)}
.pf-horas{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--fg-2)}
.pf-horas select{height:36px;border:1px solid var(--border);border-radius:10px;padding:0 8px;background:var(--surface);color:var(--fg);font:inherit;font-size:14px}
.pf-salvar{position:sticky;bottom:0;z-index:5;background:linear-gradient(transparent,var(--bg) 24%);padding:20px 0 16px;display:flex;flex-direction:column;gap:6px}
.pf-salvar .cap{text-align:center}
.pf-prev{display:flex;flex-direction:column;gap:12px}
.pf-prev .pro{cursor:default}
.pf-prev .pro .r{flex-wrap:wrap}
.pf-bio{font-size:13px;line-height:18px;color:var(--fg-2);display:block;margin-top:4px}
.pf-nota{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center}
.pf-nota b.big{font-size:32px;line-height:36px;font-weight:800}
.pf-nota .cap{display:block}
.pf-pen{font-size:13px;line-height:18px;color:var(--fg-2);background:var(--muted);border-radius:10px;padding:8px 12px}
.pf-pen b{color:var(--warning)}
.pf-tit{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}
@container (min-width:860px){
  .pf-grid{grid-template-columns:minmax(0,1fr) 360px;align-items:start;gap:24px}
  .pf-prev{position:sticky;top:88px}
}
@container (max-width:520px){.pf-2,.pf-addarea{grid-template-columns:1fr}.pf-dia{grid-template-columns:1fr}.pf-horas{padding-left:26px}}`
if (typeof document !== 'undefined' && !document.getElementById('css-prestador-perfil')) {
  const st = document.createElement('style'); st.id = 'css-prestador-perfil'; st.textContent = CSS; document.head.appendChild(st)
}

const nota1 = (n) => (n === null || n === undefined) ? 'Sem nota' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const soDigitos = (v) => String(v ?? '').replace(/\D/g, '')
/** Máscara do CNPJ enquanto digita: 00.000.000/0000-00 */
function mascaraCnpj(v) {
  const d = soDigitos(v).slice(0, 14)
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
}
const rotArea = (a) => a.bairro ? `${a.bairro} · ${a.cidade}` : `${a.cidade} (cidade toda)`
const horasDe = (de, ate) => Array.from({ length: ate - de + 1 }, (_, i) => de + i)

/** Card da vitrine como quem contrata vê (mesmos campos de prestadoresDisponiveis). */
function cardVitrine(f, nomesServicos) {
  return `<div class="card pro" aria-label="Prévia na vitrine">
    ${avatar(f.nome_exibicao || '?', 'lg ok')}
    <span style="min-width:0"><span class="n">${esc(f.nome_exibicao || 'Seu nome')}${ic('badge-check')}</span>
      <span class="r">${estrela()}${esc(nota1(f.nota))} · ${Number(f.n_servicos || 0).toLocaleString('pt-BR')} serviços · ${esc(f.tipo_pj || '')}</span>
      ${f.descricao ? `<span class="pf-bio">${esc(f.descricao)}</span>` : '<span class="pf-bio">Sem descrição. Conte o que você faz de melhor.</span>'}
      <span class="pf-bio">${esc(nomesServicos)}</span>
    </span>
    <span></span>
  </div>`
}

function blocoNota(f) {
  const pen = Number(f.penalidade || 0)
  return `<section class="card pf-sec" id="pf-nota">
    <div class="pf-nota">
      <b class="big tn">${esc(nota1(f.nota))}</b>
      <div><b>Sua nota na vitrine</b><span class="cap">${Number(f.n_servicos || 0).toLocaleString('pt-BR')} serviços feitos · quem contrata vê os melhores primeiro</span></div>
    </div>
    <p class="pf-pen">Recusar um pedido tira <b>${nota1(api.PENALIDADE.recusou)}</b> da nota. Deixar passar 1h sem confirmar tira <b>${nota1(api.PENALIDADE.expirou)}</b>.${pen ? ` Até agora: <b class="tn">−${nota1(pen)}</b>.` : ' Até agora você não perdeu nada.'}</p>
  </section>`
}

async function telaPerfil(ctx) {
  ctx.el.innerHTML = `<div class="wrap">${carregando(3)}</div>`
  let f, servicos, categorias, areasBase, dp, cel
  try {
    ;[f, servicos, categorias, areasBase, dp, cel] = await Promise.all([
      api.perfilPrestador(), api.listarServicos(), api.listarCategorias(), api.areasConhecidas().catch(() => []),
      api.dadosPagamento().catch((e) => { falha(e); return null }),
      api.meuCelular().catch(() => ({ celular: null })),
    ])
  } catch (e) {
    ctx.el.innerHTML = `<div class="wrap">${vazio({ icone: 'cloud-off', titulo: 'Não deu pra carregar seu perfil', texto: 'Confira a internet e tente de novo.' })}</div>`
    icones(); falha(e); return
  }

  // estado do formulário (salva tudo de uma vez)
  const sel = new Set(f.servicos || [])
  let areas = (f.areas || []).map((a) => ({ cidade: a.cidade, uf: a.uf || 'SC', bairro: a.bairro || null }))
  const disp = new Map((f.disponibilidade || []).map((d) => [d.dia_semana, { ...d }]))
  const cats = categorias.filter((c) => servicos.some((s) => s.categoria_codigo === c.codigo))
  const nomeDe = (c) => servicos.find((s) => s.codigo === c)?.nome || c
  const resumoServicos = () => { const n = [...sel].map(nomeDe); return n.length ? `Faz: ${n.slice(0, 3).join(', ')}${n.length > 3 ? ` e mais ${n.length - 3}` : ''}` : 'Nenhum serviço marcado' }

  const ordemDias = [1, 2, 3, 4, 5, 6, 0]
  ctx.el.innerHTML = `<div class="wrap pf-raiz">
    <div class="pf-tit"><h1 class="pst-titulo">Seu perfil</h1><span class="cap">${f.atualizado_em ? `Atualizado em ${new Date(f.atualizado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : 'É isso que quem contrata vê'}</span></div>
    <div class="pf-grid">
      <div class="pf-col">
      <form class="pf-form" id="pf-form" novalidate>
        <section class="card pf-sec">
          <h2>${ic('building-2')}Você e a sua empresa</h2>
          <label class="pf-campo"><span>Nome na vitrine</span><input type="text" id="pf-nome" maxlength="60" value="${esc(f.nome_exibicao || '')}" placeholder="Ex.: Marcos T."><small class="pf-dica">Seu nome ou o nome fantasia. É o que aparece para quem contrata.</small></label>
          <label class="pf-campo"><span>Razão social</span><input type="text" id="pf-razao" maxlength="150" value="${esc(f.razao_social || '')}" placeholder="Como está no cartão CNPJ"></label>
          <div class="pf-2">
            <label class="pf-campo"><span>CNPJ</span><input type="text" id="pf-cnpj" inputmode="numeric" maxlength="18" value="${esc(mascaraCnpj(f.cnpj || ''))}" placeholder="00.000.000/0000-00" aria-describedby="pf-cnpj-erro"><small class="pf-erro" id="pf-cnpj-erro" hidden>CNPJ inválido. Confira os números.</small></label>
            <label class="pf-campo"><span>Tipo</span><select id="pf-tipo">${['MEI', 'ME'].map((t) => `<option ${f.tipo_pj === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          </div>
          <label class="pf-campo"><span>Descrição <span class="cap" id="pf-desc-n"></span></span><textarea id="pf-desc" rows="3" maxlength="500" placeholder="Ex.: Técnico em refrigeração há 10 anos. Respondo rápido e deixo tudo limpo.">${esc(f.descricao || '')}</textarea></label>
          <label class="pf-campo"><span>Celular com WhatsApp</span><input type="tel" id="pf-celular" inputmode="tel" maxlength="20" autocomplete="tel" value="${esc(cel?.celular ? api.fmtCelular(cel.celular) : '')}" placeholder="(48) 99999-0000" aria-describedby="pf-celular-dica"><small class="pf-dica" id="pf-celular-dica">Quem contratou vê este número depois que você confirma o pedido, até o fim da garantia. Nunca na vitrine.</small></label>
        </section>

        <section class="card pf-sec mt16" id="pf-servicos">
          <h2>${ic('wrench')}Serviços que você faz</h2>
          <p class="note">Você só recebe pedido dos serviços marcados. O preço é da Seazone e é o mesmo para qualquer profissional.</p>
          <div class="mline" style="margin-top:0">${ic('package')}<span><b>Nenhuma peça está inclusa no preço.</b> Ex.: na troca de resistência, a resistência nova é à parte. Se precisar de peça, mande foto e valor pelo pedido: quem paga aprova antes de você comprar.</span></div>
          ${cats.map((c) => {
            const svs = servicos.filter((s) => s.categoria_codigo === c.codigo)
            return `<div class="pf-cat"><h3><span>${esc(c.nome)}</span><button type="button" data-todos="${esc(c.codigo)}">Marcar todos</button></h3>
              <div class="pf-svs">${svs.map((s) => `<label class="pf-sv"><input type="checkbox" data-sv="${esc(s.codigo)}" ${sel.has(s.codigo) ? 'checked' : ''}><span><b>${esc(s.nome)}</b>${s.aviso_peca ? `<small>${ic('package')}${esc(s.aviso_peca)}</small>` : ''}</span></label>`).join('')}</div></div>`
          }).join('')}
        </section>

        <section class="card pf-sec mt16" id="pf-areas">
          <h2>${ic('map-pinned')}Onde você atende</h2>
          <p class="note">Quem contrata só vê você quando o imóvel fica numa dessas regiões. "Cidade toda" cobre todos os bairros.</p>
          <div class="pf-chips" id="pf-chips"></div>
          <div class="pf-addarea">
            <label class="pf-campo"><span>Cidade</span><select id="pf-cidade">${areasBase.map((a) => `<option value="${esc(a.cidade)}" data-uf="${esc(a.uf || 'SC')}">${esc(a.cidade)}</option>`).join('')}</select></label>
            <label class="pf-campo"><span>Bairro</span><select id="pf-bairro"></select></label>
            <button type="button" class="btn out" id="pf-add-area">${ic('plus')}Adicionar</button>
          </div>
        </section>

        <section class="card pf-sec mt16" id="pf-horario">
          <h2>${ic('clock')}Dias e horários de atendimento</h2>
          <p class="note">Você só aparece para quem contrata nos dias e horários marcados, e nunca em cima de outro serviço seu. Visitas entre 8h e 17h.</p>
          <div class="pf-dias">${ordemDias.map((d) => {
            const x = disp.get(d)
            return `<div class="pf-dia${x ? ' on' : ''}" data-dia="${d}">
              <label><input type="checkbox" data-dia-on="${d}" ${x ? 'checked' : ''}>${esc(api.DIAS_SEMANA[d])}</label>
              <div class="pf-horas" ${x ? '' : 'hidden'}>das <select data-de="${d}" aria-label="${esc(api.DIAS_SEMANA[d])}: começa">${horasDe(8, 16).map((h) => `<option value="${h}" ${(x?.hora_inicio ?? 8) === h ? 'selected' : ''}>${h}h</option>`).join('')}</select>
                às <select data-ate="${d}" aria-label="${esc(api.DIAS_SEMANA[d])}: termina">${horasDe(9, 17).map((h) => `<option value="${h}" ${(x?.hora_fim ?? 17) === h ? 'selected' : ''}>${h}h</option>`).join('')}</select></div>
            </div>`
          }).join('')}</div>
        </section>

        <div class="pf-salvar">
          <button type="submit" class="btn cta" id="pf-salvar">${ic('save')}Salvar perfil</button>
          <span class="cap">Salvou, a vitrine já mostra as mudanças.</span>
        </div>
      </form>
      ${secaoDadosPagamento(f, dp)}
      </div>

      <aside class="pf-prev">
        <h2 class="sec" style="margin:0">Como você aparece</h2>
        <div id="pf-previa"></div>
        ${blocoNota(f)}
      </aside>
    </div>
  </div>`

  const el = ctx.el
  const nome = $('#pf-nome', el); const razao = $('#pf-razao', el); const cnpj = $('#pf-cnpj', el)
  const tipo = $('#pf-tipo', el); const desc = $('#pf-desc', el)
  const cnpjErro = $('#pf-cnpj-erro', el)

  const previa = () => {
    $('#pf-previa', el).innerHTML = cardVitrine({ ...f, nome_exibicao: nome.value.trim(), descricao: desc.value.trim(), tipo_pj: tipo.value }, resumoServicos())
    $('#pf-desc-n', el).textContent = `${desc.value.length}/500`
    icones()
  }
  const checarCnpj = () => {
    const d = soDigitos(cnpj.value)
    const ruim = d.length > 0 && (d.length !== 14 || !api.documentoValido(d))
    cnpj.setAttribute('aria-invalid', String(ruim)); cnpjErro.hidden = !ruim
    return !ruim && d.length === 14
  }
  nome.addEventListener('input', previa); desc.addEventListener('input', previa); tipo.addEventListener('change', previa)
  cnpj.addEventListener('input', () => { cnpj.value = mascaraCnpj(cnpj.value); if (soDigitos(cnpj.value).length === 14) checarCnpj(); else { cnpj.removeAttribute('aria-invalid'); cnpjErro.hidden = true } })
  cnpj.addEventListener('blur', checarCnpj)

  // serviços
  el.querySelectorAll('[data-sv]').forEach((cb) => cb.addEventListener('change', () => { if (cb.checked) sel.add(cb.dataset.sv); else sel.delete(cb.dataset.sv); previa() }))
  el.querySelectorAll('[data-todos]').forEach((b) => b.addEventListener('click', () => {
    const cbs = [...el.querySelectorAll(`.pf-cat [data-sv]`)].filter((cb) => servicos.find((s) => s.codigo === cb.dataset.sv)?.categoria_codigo === b.dataset.todos)
    const marcar = cbs.some((cb) => !cb.checked)
    cbs.forEach((cb) => { cb.checked = marcar; if (marcar) sel.add(cb.dataset.sv); else sel.delete(cb.dataset.sv) })
    previa()
  }))

  // áreas
  const selCidade = $('#pf-cidade', el); const selBairro = $('#pf-bairro', el)
  const desenharBairros = () => {
    const a = areasBase.find((x) => x.cidade === selCidade.value)
    selBairro.innerHTML = `<option value="">Cidade toda</option>${(a?.bairros || []).map((b) => `<option>${esc(b)}</option>`).join('')}`
  }
  const desenharChips = () => {
    $('#pf-chips', el).innerHTML = areas.length
      ? areas.map((a, i) => `<span class="pf-chip">${esc(rotArea(a))}<button type="button" data-rm-area="${i}" aria-label="Tirar ${esc(rotArea(a))}">${ic('x')}</button></span>`).join('')
      : '<p class="pf-erro">Adicione pelo menos uma região.</p>'
    el.querySelectorAll('[data-rm-area]').forEach((b) => b.addEventListener('click', () => { areas.splice(Number(b.dataset.rmArea), 1); desenharChips() }))
    icones()
  }
  if (selCidade.options.length) {
    const cid0 = areas[0]?.cidade
    if (cid0 && areasBase.some((a) => a.cidade === cid0)) selCidade.value = cid0
    desenharBairros()
  }
  selCidade.addEventListener('change', desenharBairros)
  $('#pf-add-area', el).addEventListener('click', () => {
    const cidade = selCidade.value; if (!cidade) return
    const uf = selCidade.selectedOptions[0]?.dataset.uf || 'SC'
    const bairro = selBairro.value || null
    if (!bairro) { areas = areas.filter((a) => a.cidade !== cidade); areas.push({ cidade, uf, bairro: null }) }
    else if (areas.some((a) => a.cidade === cidade && !a.bairro)) { toast(`Você já atende ${cidade} inteira.`); return }
    else if (areas.some((a) => a.cidade === cidade && a.bairro === bairro)) { toast('Essa região já está na lista.'); return }
    else areas.push({ cidade, uf, bairro })
    desenharChips()
  })

  // dias
  el.querySelectorAll('[data-dia-on]').forEach((cb) => cb.addEventListener('change', () => {
    const linha = cb.closest('.pf-dia'); linha.classList.toggle('on', cb.checked); $('.pf-horas', linha).hidden = !cb.checked
  }))
  const lerDias = () => [...el.querySelectorAll('[data-dia-on]:checked')].map((cb) => {
    const d = Number(cb.dataset.diaOn)
    return { dia_semana: d, hora_inicio: Number($(`[data-de="${d}"]`, el).value), hora_fim: Number($(`[data-ate="${d}"]`, el).value) }
  })

  // salvar
  $('#pf-form', el).addEventListener('submit', async (ev) => {
    ev.preventDefault()
    const dias = lerDias()
    if (nome.value.trim().length < 2) { toast('Escreva o nome que aparece na vitrine.'); nome.focus(); return }
    if (!checarCnpj()) { toast('Confira o CNPJ.'); cnpj.focus(); return }
    if (!sel.size) { toast('Marque pelo menos um serviço que você faz.'); $('#pf-servicos', el).scrollIntoView({ block: 'start' }); return }
    if (!areas.length) { toast('Adicione pelo menos uma região onde você atende.'); $('#pf-areas', el).scrollIntoView({ block: 'start' }); return }
    if (!dias.length) { toast('Marque pelo menos um dia de atendimento.'); $('#pf-horario', el).scrollIntoView({ block: 'start' }); return }
    const ruim = dias.find((d) => d.hora_fim <= d.hora_inicio)
    if (ruim) { toast(`${api.DIAS_SEMANA[ruim.dia_semana]}: o fim tem que ser depois do começo.`); return }
    const celular = $('#pf-celular', el)
    if (soDigitos(celular.value) && !api.celularWhatsApp(celular.value)) { toast('Celular com DDD, só números. Ex.: (48) 99999-0000.'); celular.setAttribute('aria-invalid', 'true'); celular.focus(); return }
    celular.removeAttribute('aria-invalid')
    const bt = $('#pf-salvar', el); bt.disabled = true
    try {
      if (api.celularWhatsApp(celular.value) !== (cel?.celular || null)) await api.salvarMeuCelular({ celular: celular.value })
      await api.salvarPerfilPrestador({
        nome_exibicao: nome.value.trim(), razao_social: razao.value.trim(), cnpj: soDigitos(cnpj.value), tipo_pj: tipo.value,
        descricao: desc.value.trim(), servicos: [...sel], areas, disponibilidade: dias,
      })
      toast('Perfil salvo. A vitrine já mostra as mudanças.')
      ctx.recarregar()
    } catch (e) { bt.disabled = false; falha(e) }
  })

  desenharChips()
  previa()
  ligarDadosPagamento(ctx, f)
  icones()
  // link direto (#/prestador/perfil?sec=pagamento, vindo da NF ou de Ganhos)
  if (ctx.query?.sec === 'pagamento') $('#pf-pagamento', el)?.scrollIntoView({ block: 'start' })
}

export const rotasPerfil = { perfil: telaPerfil }
// usado pela aba Pedidos: faixa curta com a nota e o efeito da recusa
export { nota1, blocoNota }
