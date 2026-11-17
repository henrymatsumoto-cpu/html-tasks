// ConcertAI · seletor de imóvel (REGRA 17/11): dropdown com busca, sempre no topo do fluxo de contratar e na tela
// inicial do proprietário/franquia. Lista os imóveis da carteira do comprador (imoveisDoComprador): código, nome,
// bairro, cidade e o selo "Hóspede hoje" (campo hospede_hoje). Na demo do proprietário vêm os dele e depois os da Seazone.
//
// Acessível (padrão combobox do WAI-ARIA): o gatilho é um botão (aria-haspopup="listbox"); aberto, o foco vai para o
// campo de busca (role="combobox") e as setas andam pela lista (aria-activedescendant). Enter escolhe, Esc fecha.
import { esc, ic, icones } from '../ui.js?v=79617c8'

const LIMITE = 60 // opções desenhadas de uma vez (a demo tem 1.011 imóveis); o resto aparece buscando
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const local = (im) => [im.bairro, im.cidade].filter(Boolean).join(', ')
const selo = () => `<span class="simv-hosp">${ic('bed-double', 'i14')}Hóspede hoje</span>`
let seq = 0

/** Conteúdo do gatilho (imóvel escolhido ou o convite para escolher). */
function resumo(im, vazio) {
  if (!im) return `<span class="simv-ic">${ic('home')}</span><span class="simv-tx"><b class="simv-nm simv-ph">${esc(vazio)}</b><span class="simv-sub">Busque por código, bairro ou cidade</span></span>`
  return `<span class="simv-ic">${ic('home')}</span><span class="simv-tx"><span class="simv-l1"><span class="simv-cod">${esc(im.codigo)}</span><b class="simv-nm">${esc(im.nome)}</b></span>
    <span class="simv-sub">${esc(local(im))}${im.hospede_hoje ? selo() : ''}</span></span>`
}

/**
 * HTML do seletor. Ligue com ligarSeletorImovel() depois de pôr na tela.
 * @param o.imoveis   lista de imoveisDoComprador() (com meu / demo_seazone / hospede_hoje)
 * @param o.atual     id do imóvel escolhido ('' = nenhum)
 * @param o.rotulo    rótulo visível acima do campo
 * @param o.escuro    true quando fica sobre fundo escuro (hero do proprietário)
 */
export function seletorImovel({ imoveis, atual = '', rotulo = 'Imóvel', escuro = false, vazio = 'Escolha o imóvel', cadastrar = '' }) {
  const id = `simv${++seq}`
  const im = imoveis.find((i) => i.id === atual) || null
  const fixo = imoveis.length <= 1 && !cadastrar
  return `<div class="simv${escuro ? ' simv-escuro' : ''}" data-simv="${id}">
    <span class="simv-rot" id="${id}-rot">${esc(rotulo)}</span>
    <button type="button" class="simv-gat" id="${id}-gat" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}-pop"
      aria-labelledby="${id}-rot ${id}-gat" ${fixo ? 'disabled' : ''}>${resumo(im, vazio)}${fixo ? '' : `<span class="simv-chev">${ic('chevron-down')}</span>`}</button>
    <div class="simv-pop" id="${id}-pop" hidden>
      <label class="simv-busca">${ic('search')}<input type="text" id="${id}-q" role="combobox" aria-expanded="true" aria-autocomplete="list"
        aria-controls="${id}-lista" aria-label="Buscar imóvel por código, bairro ou cidade" placeholder="Código, bairro ou cidade" autocomplete="off" enterkeyhint="search"></label>
      <div class="simv-lista" id="${id}-lista" role="listbox" aria-label="${esc(rotulo)}"></div>
      <p class="simv-rod cap" id="${id}-rod" aria-live="polite"></p>
      ${cadastrar ? `<a class="simv-cad" href="${esc(cadastrar)}">${ic('plus')}<span>${/anfitriao/.test(cadastrar) ? 'Cadastrar outro imóvel' : 'Cadastrar imóvel fora da Seazone'}</span></a>` : ''}
    </div>
  </div>`
}

/**
 * Liga o seletor que está dentro de `raiz`.
 * @param o.aoEscolher (imovel) => void, chamado só quando o imóvel muda
 * @param o.abrir      abre a lista já na entrada (passo "Qual imóvel?")
 */
export function ligarSeletorImovel(raiz, { imoveis, atual = '', aoEscolher, abrir = false }) {
  const box = raiz.querySelector('[data-simv]')
  if (!box) return
  const id = box.dataset.simv
  const gat = box.querySelector('.simv-gat'); const pop = box.querySelector('.simv-pop')
  const q = box.querySelector('input'); const lista = box.querySelector('[role="listbox"]'); const rod = box.querySelector('.simv-rod')
  const temTeste = imoveis.some((i) => i.demo_seazone)
  const st = { busca: '', ativo: -1, vis: [] }
  const optId = (k) => `${id}-o${k}`

  const opcao = (im, k) => `<div class="simv-op${im.id === atual ? ' on' : ''}" role="option" id="${optId(k)}" data-k="${k}" aria-selected="${im.id === atual}">
    <span class="simv-op-tx"><span class="simv-l1"><span class="simv-cod">${esc(im.codigo)}</span><span class="simv-nm">${esc(im.nome)}</span></span>
      <span class="simv-sub">${esc(local(im))}${im.hospede_hoje ? selo() : ''}</span></span>
    ${im.id === atual ? `<span class="simv-ok">${ic('check')}</span>` : ''}</div>`

  const desenhar = () => {
    const toks = norm(st.busca).split(/\s+/).filter(Boolean)
    const casa = (im) => { const h = norm(`${im.codigo} ${im.nome} ${im.bairro} ${im.cidade}`); return toks.every((t) => h.includes(t)) }
    const achados = imoveis.filter(casa)
    st.vis = [...achados.filter((i) => !i.demo_seazone), ...achados.filter((i) => i.demo_seazone)].slice(0, LIMITE)
    if (!st.vis.length) {
      lista.innerHTML = `<div class="simv-nada">${ic('search-x')}<span>Nenhum imóvel com “${esc(st.busca.trim())}”. Tente o código (ex.: JUR201), o bairro ou a cidade.</span></div>`
    } else if (st.vis.some((i) => i.fora_seazone) && st.vis.some((i) => !i.fora_seazone)) {
      // T807: imóveis cadastrados fora da Seazone (pagam no ato) num grupo à parte
      const fora = st.vis.filter((i) => i.fora_seazone)
      const seaz = st.vis.filter((i) => !i.fora_seazone && !i.demo_seazone); const teste = st.vis.filter((i) => !i.fora_seazone && i.demo_seazone)
      st.vis = [...seaz, ...fora, ...teste]
      let k = 0
      const grupo = (g, titulo, l, tag = '') => l.length ? `<div role="group" aria-labelledby="${id}-${g}"><div class="simv-grp" role="presentation" id="${id}-${g}">${esc(titulo)}${tag}</div>${l.map((im) => opcao(im, k++)).join('')}</div>` : ''
      lista.innerHTML = grupo('gz', temTeste ? 'Seus imóveis na Seazone' : 'Imóveis da Seazone', seaz) + grupo('gf', 'Imóveis fora da Seazone', fora, '<span class="simv-tag">Paga no ato</span>') + grupo('gs', 'Todos os imóveis da Seazone', teste, '<span class="simv-tag">Modo teste</span>')
    } else if (temTeste) {
      // demo do proprietário: os dele primeiro, depois os da Seazone (modo teste)
      const meus = st.vis.filter((i) => !i.demo_seazone); const outros = st.vis.filter((i) => i.demo_seazone)
      let k = 0
      const grupo = (g, titulo, l, tag = '') => l.length ? `<div role="group" aria-labelledby="${id}-${g}"><div class="simv-grp" role="presentation" id="${id}-${g}">${esc(titulo)}${tag}</div>${l.map((im) => opcao(im, k++)).join('')}</div>` : ''
      lista.innerHTML = grupo('gm', 'Seus imóveis', meus) + grupo('gs', 'Todos os imóveis da Seazone', outros, '<span class="simv-tag">Modo teste</span>')
    } else {
      lista.innerHTML = st.vis.map(opcao).join('')
    }
    const n = achados.length
    rod.textContent = n > LIMITE ? `Mostrando ${LIMITE} de ${n.toLocaleString('pt-BR')}. Digite para achar o seu.` : st.busca ? `${n} imóve${n === 1 ? 'l' : 'is'}` : ''
    if (temTeste && !st.busca) rod.textContent = `${rod.textContent} No teste aparecem todos os imóveis da Seazone; na versão real, só os seus.`.trim()
    marcar(st.vis.findIndex((i) => i.id === atual))
    icones()
  }
  const marcar = (k) => {
    st.ativo = st.vis.length ? Math.max(-1, Math.min(k, st.vis.length - 1)) : -1
    lista.querySelectorAll('.simv-op').forEach((o) => o.classList.toggle('foco', Number(o.dataset.k) === st.ativo))
    if (st.ativo >= 0) {
      q.setAttribute('aria-activedescendant', optId(st.ativo))
      const o = lista.querySelector(`#${optId(st.ativo)}`)
      if (o) o.scrollIntoView({ block: 'nearest' })
    } else q.removeAttribute('aria-activedescendant')
  }
  const aberto = () => !pop.hidden
  const abrirPop = (focar = true) => {
    if (gat.disabled) return
    pop.hidden = false; gat.setAttribute('aria-expanded', 'true'); box.classList.add('aberto')
    st.busca = ''; q.value = ''; desenhar()
    if (focar) q.focus({ preventScroll: true })
    document.addEventListener('pointerdown', fora, true)
  }
  const fechar = (devolverFoco = true) => {
    if (!aberto()) return
    pop.hidden = true; gat.setAttribute('aria-expanded', 'false'); box.classList.remove('aberto')
    document.removeEventListener('pointerdown', fora, true)
    if (devolverFoco) gat.focus({ preventScroll: true })
  }
  function fora(e) { if (!box.contains(e.target)) fechar(false) }
  const escolher = (k) => {
    const im = st.vis[k]
    if (!im) return
    fechar()
    if (im.id !== atual) aoEscolher(im)
  }

  gat.addEventListener('click', () => (aberto() ? fechar() : abrirPop()))
  gat.addEventListener('keydown', (e) => { if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); abrirPop() } })
  q.addEventListener('input', () => { st.busca = q.value; desenhar(); marcar(0) })
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); marcar(st.ativo + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); marcar(st.ativo - 1) }
    else if (e.key === 'Home' && e.ctrlKey) { e.preventDefault(); marcar(0) }
    else if (e.key === 'End' && e.ctrlKey) { e.preventDefault(); marcar(st.vis.length - 1) }
    else if (e.key === 'PageDown') { e.preventDefault(); marcar(st.ativo + 8) }
    else if (e.key === 'PageUp') { e.preventDefault(); marcar(Math.max(0, st.ativo - 8)) }
    else if (e.key === 'Enter') { e.preventDefault(); escolher(st.ativo >= 0 ? st.ativo : 0) }
    else if (e.key === 'Escape') { e.preventDefault(); fechar() }
    else if (e.key === 'Tab') fechar(false)
  })
  // pointerdown + preventDefault: o campo não perde o foco antes do clique (no celular o teclado não pisca)
  lista.addEventListener('pointerdown', (e) => { if (e.target.closest('.simv-op')) e.preventDefault() })
  lista.addEventListener('click', (e) => { const o = e.target.closest('.simv-op'); if (o) escolher(Number(o.dataset.k)) })
  lista.addEventListener('pointermove', (e) => { const o = e.target.closest('.simv-op'); if (o && Number(o.dataset.k) !== st.ativo) marcar(Number(o.dataset.k)) })
  if (abrir) abrirPop(false)
}
