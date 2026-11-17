// ConcertAI · formulário do imóvel FORA da Seazone (T807, REGRA 17/11): usado pelo anfitrião avulso ("Meus imóveis")
// e por proprietário/franquia ("Cadastrar imóvel fora da Seazone"). Apelido, CEP (ViaCEP preenche rua/bairro/cidade/UF,
// com fallback manual), número/complemento, tipo e quartos, como entrar (quem abre, cofre/código/portaria) e link iCal
// opcional. Grava por api.imovelAvulsoSalvar (RPC anfitriao_imovel_salvar).
import * as api from '../api.js?v=79617c8'
import { $, $$, esc, ic, icones, toast, falha } from '../ui.js?v=79617c8'

export const TIPOS = [['apartamento', 'Apartamento'], ['casa', 'Casa'], ['studio', 'Studio'], ['outro', 'Outro']]
export const ACESSOS = [['presencial', 'Alguém recebe'], ['chave', 'Chave com alguém'], ['cofre', 'Cofre de chave'], ['fechadura', 'Fechadura com código'], ['portaria', 'Portaria'], ['outro', 'Outro']]
export const QUEM_ABRE = [['eu', 'Eu mesmo'], ['vizinho_zelador', 'Vizinho ou zelador'], ['portaria', 'Portaria'], ['outro', 'Outra pessoa']]
const CAMPO_ERRO = { cep_invalido: 'cep', uf_invalida: 'uf', cidade_invalida: 'cidade', bairro_invalido: 'bairro', endereco_invalido: 'logradouro', numero_invalido: 'numero', tipo_invalido: 'tipo', quartos_invalido: 'quartos', ical_invalido: 'ical_url' }
const fmtCep = (c) => { const d = String(c || '').replace(/\D/g, '').slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d }

/** Busca o CEP no ViaCEP (3s de limite). null = não achou ou sem rede (a pessoa preenche à mão). */
export async function buscarCep(cep) {
  const d = String(cep || '').replace(/\D/g, '')
  if (d.length !== 8) return null
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 3000)
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`, { signal: ctl.signal }); clearTimeout(t)
    const j = await r.json()
    if (!j || j.erro) return null
    return { logradouro: j.logradouro || '', bairro: j.bairro || '', cidade: j.localidade || '', uf: j.uf || '' }
  } catch { return null }
}

/**
 * Desenha o formulário em `el`.
 * @param o.imovel   imóvel a editar (de meusImoveisAvulsos) ou null para cadastrar
 * @param o.voltar   hash de saída
 * @param o.aoSalvar ({ imovel_id, codigo }) => void
 * @param o.titulo   título da página
 */
export function formImovelAvulso(el, { imovel = null, voltar, aoSalvar, titulo, sub = '' }) {
  const v = imovel || {}
  const sel = (nome, opcoes, atual, vazio = '') => `<select id="ima-${nome}" name="${nome}">${vazio ? `<option value="">${esc(vazio)}</option>` : ''}${opcoes.map(([k, r]) => `<option value="${k}" ${k === atual ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>`
  const campo = (nome, rotulo, html, dica = '', cls = '') => `<div class="ima-campo ${cls}" data-campo="${nome}"><label class="prop-lbl" for="ima-${nome}">${esc(rotulo)}</label>${html}<p class="cap ima-dica">${esc(dica)}</p></div>`
  const inp = (nome, valor, o = '') => `<input type="text" id="ima-${nome}" name="${nome}" value="${esc(valor ?? '')}" ${o}>`
  el.innerHTML = `<div class="prop-cab"><a class="lnk ima-voltar" href="${esc(voltar)}">${ic('arrow-left', 'i14')}Voltar</a><h1>${esc(titulo || (imovel ? 'Editar imóvel' : 'Cadastrar imóvel'))}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>
    <div class="wrap">
    <form class="ima" id="ima-form" novalidate>
      <section class="card ima-sec"><h2 class="ctr-h">${ic('home')}O imóvel</h2>
        <div class="ima-grid">
          ${campo('nome', 'Apelido', inp('nome', v.nome, 'placeholder="Ex.: Apto Campeche" maxlength="80"'), 'Como você chama o imóvel. Aparece no seletor.', 'ima-l2')}
          ${campo('tipo', 'Tipo', sel('tipo', TIPOS, v.tipo || '', 'Escolha'))}
          ${campo('quartos', 'Quartos', `<input type="number" id="ima-quartos" name="quartos" min="0" max="20" inputmode="numeric" value="${esc(v.quartos ?? '')}">`, '0 para studio/kitnet')}
        </div>
      </section>
      <section class="card ima-sec"><h2 class="ctr-h">${ic('map-pin')}Endereço</h2>
        <div class="ima-grid">
          ${campo('cep', 'CEP', inp('cep', fmtCep(v.cep), 'inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" maxlength="9"'), 'Preenche a rua sozinho.')}
          ${campo('logradouro', 'Rua', inp('logradouro', v.logradouro, 'autocomplete="address-line1"'), '', 'ima-l2')}
          ${campo('numero', 'Número', inp('numero', v.numero, 'placeholder="ou s/n"'))}
          ${campo('complemento', 'Complemento', inp('complemento', v.complemento, 'placeholder="Apto, bloco (opcional)"'))}
          ${campo('bairro', 'Bairro', inp('bairro', v.bairro))}
          ${campo('cidade', 'Cidade', inp('cidade', v.cidade))}
          ${campo('uf', 'UF', inp('uf', v.uf, 'maxlength="2" style="text-transform:uppercase"'))}
        </div>
        <p class="cap ima-cep-st" id="ima-cep-st" aria-live="polite"></p>
      </section>
      <section class="card ima-sec"><h2 class="ctr-h">${ic('key-round')}Como o profissional entra</h2>
        <p class="cap">Só o profissional que confirmar o pedido vê, e só perto do horário.</p>
        <div class="ima-grid mt8">
          ${campo('acesso_quem_abre', 'Quem abre', sel('acesso_quem_abre', QUEM_ABRE, v.acesso_quem_abre || '', 'Escolha'))}
          ${campo('acesso_tipo', 'Como entra', sel('acesso_tipo', ACESSOS, v.acesso_tipo || '', 'Escolha'))}
          ${campo('acesso_instrucoes', 'Instruções', `<textarea id="ima-acesso_instrucoes" name="acesso_instrucoes" rows="2" maxlength="500" placeholder="Ex.: cofre no portão, código 4821. Interfone 204.">${esc(v.acesso_instrucoes || '')}</textarea>`, '', 'ima-l3')}
        </div>
      </section>
      <section class="card ima-sec"><h2 class="ctr-h">${ic('calendar-sync')}Calendário de reservas <span class="cap">(opcional)</span></h2>
        ${campo('ical_url', 'Link iCal do Airbnb ou Booking', inp('ical_url', v.ical_url, 'inputmode="url" placeholder="https://www.airbnb.com.br/calendar/ical/....ics"'), 'Com ele, a agenda avisa quando tiver hóspede no dia do conserto.')}
      </section>
      <button type="submit" class="btn cta" id="ima-salvar">${imovel ? 'Salvar alterações' : 'Cadastrar imóvel'}</button>
    </form></div>`
  icones()
  const form = $('#ima-form', el)
  const st = $('#ima-cep-st', el)
  const cep = $('#ima-cep', el)
  let ultimo = ''
  cep.addEventListener('input', async () => {
    cep.value = fmtCep(cep.value)
    const d = cep.value.replace(/\D/g, '')
    if (d.length !== 8 || d === ultimo) return
    ultimo = d
    st.textContent = 'Buscando o CEP…'
    const r = await buscarCep(d)
    if (!r) { st.textContent = 'Não achamos esse CEP. Preencha o endereço à mão.'; return }
    for (const k of ['logradouro', 'bairro', 'cidade', 'uf']) if (r[k]) $(`#ima-${k}`, el).value = r[k]
    st.textContent = `${r.cidade}/${r.uf}: confira e informe o número.`
    $('#ima-numero', el).focus()
  })
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    $$('.ima-campo', form).forEach((c) => c.classList.remove('erro'))
    const f = Object.fromEntries(new FormData(form))
    const bt = $('#ima-salvar', el); bt.disabled = true
    try {
      const r = await api.imovelAvulsoSalvar({ ...f, uf: String(f.uf || '').toUpperCase(), ...(imovel ? { id: imovel.id } : {}) })
      toast(imovel ? 'Imóvel atualizado' : `Imóvel cadastrado (${r.codigo})`)
      aoSalvar && aoSalvar(r)
    } catch (err) {
      bt.disabled = false
      const c = err && CAMPO_ERRO[err.code] && $(`[data-campo="${CAMPO_ERRO[err.code]}"]`, form)
      if (c) { c.classList.add('erro'); c.querySelector('.ima-dica').textContent = err.message; c.querySelector('input,select,textarea').focus() } else falha(err)
    }
  })
}

/** Linha "como entra" curta para listas. */
export function resumoAcesso(i) {
  const q = QUEM_ABRE.find(([k]) => k === i.acesso_quem_abre)?.[1]
  const a = ACESSOS.find(([k]) => k === i.acesso_tipo)?.[1]
  return [a, q && `abre: ${q.toLowerCase()}`].filter(Boolean).join(' · ') || 'Acesso não informado'
}
