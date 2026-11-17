// ConcertAI · casca do site: roteador por hash, cabeçalho, notificações e troca de papel (demo).
//
// Rotas: #/<papel>/<tela>/<param>. Sem papel (`#/` ou `#/inicio`) = página de visita (telas/visita.js);
// no modo real, `#/` com sessão leva direto à área do papel. Cada papel tem um módulo em telas/ que exporta
// `rotas` = { '<tela>': async (ctx) => void } e opcional `abas` = [{ id, rotulo, icone }].
// ctx = { el, param, query, sessao, ir(hash), recarregar() }.
import { LOGO_SEAZONE } from './logo.js?v=79617c8'
import * as api from './api.js?v=79617c8'
import { $, ic, icones, esc, toast, abrirSheet, falha, fmtDiaRel } from './ui.js?v=79617c8'
import * as proprietario from './telas/proprietario.js?v=79617c8'
import * as franquia from './telas/franquia.js?v=79617c8'
import * as prestador from './telas/prestador.js?v=79617c8'
import * as login from './telas/login.js?v=79617c8'
import * as visita from './telas/visita.js?v=79617c8'
import * as admin from './telas/admin.js?v=79617c8'
import * as anfitriao from './telas/anfitriao.js?v=79617c8'
import * as cadastro from './telas/cadastro-anfitriao.js?v=79617c8'
import * as auth from './auth.js?v=79617c8'

const PAPEIS = { proprietario, franquia, prestador, anfitriao }
const NOMES = { proprietario: 'Proprietário', franquia: 'Franquia', prestador: 'Prestador', anfitriao: 'Anfitrião avulso' }

let sessaoAtual = null

function lerHash() {
  const [caminho, qs = ''] = (location.hash.replace(/^#\/?/, '') || '').split('?')
  const [papel, tela = '', ...resto] = caminho.split('/').filter(Boolean)
  return { papel, tela, param: resto.join('/') || '', query: Object.fromEntries(new URLSearchParams(qs)) }
}
export function ir(hash) { if (location.hash === hash) render(); else location.hash = hash }

// Só a navegação mais recente desenha: render() é assíncrono e uma tela lenta (ex.: a Carteira logo depois do
// login) terminava DEPOIS da seguinte e cobria o pedido aberto. Cada render ganha um número; o antigo para.
let geracao = 0
async function render() {
  const gen = ++geracao
  const vivo = () => gen === geracao
  try {
    let { papel, tela, param, query } = lerHash()
    if (!papel || papel === 'inicio') { await mostrarVisita(papel, vivo); return }
    if (papel === 'cadastro') { await mostrarCadastro(vivo); return }
    document.body.classList.remove('pg-visita')
    if (await rotaDeLogin(papel)) return
    if (!vivo()) return
    const ehAdmin = papel === 'admin'
    if (ehAdmin && !api.podeTrocarPapel(sessaoAtual)) { ir(`#/${sessaoAtual.papel}`); return } // "ver como" só do admin
    if (!ehAdmin && !PAPEIS[papel]) { ir(`#/${sessaoAtual.papel}`); return }
    if (!ehAdmin && papel !== sessaoAtual.papel) {
      if (!api.podeTrocarPapel(sessaoAtual)) { ir(`#/${sessaoAtual.papel}`); return } // cada um só vê a sua área
      // real: o admin escolhe QUEM ver antes (tela #/admin); demo: entra no perfil de teste do papel
      if (api.MODO === 'supabase') { ir(`#/admin?papel=${papel}`); return }
      sessaoAtual = await api.entrarComo(papel)
      if (!vivo()) return
    }
    const mod = ehAdmin ? admin : PAPEIS[papel]
    const fn = mod.rotas[tela] || mod.rotas['']
    document.body.classList.remove('hascart')
    $('#rodape').innerHTML = ''
    if (!(await desenharTopo(papel, tela, mod, vivo))) return
    $('#pilula').innerHTML = ''
    if (api.podeTrocarPapel(sessaoAtual) && !ehAdmin) desenharFaixa(papel); else limparFaixa()
    // cada tela desenha num contêiner novo dentro do #tela: se outra navegação começar, o antigo sai do DOM
    // e o que a tela velha ainda escrever nele não aparece
    const el = document.createElement('div')
    $('#tela').replaceChildren(el)
    await fn({ el, param, query, sessao: sessaoAtual, ir, recarregar: render })
    if (!vivo()) return
    icones()
  } catch (e) {
    if (!vivo()) return
    if (api.MODO === 'supabase' && ['sem_acesso', 'sem_sessao'].includes(e?.code)) { await mostrarLogin(e.message); return }
    falha(e)
  }
}

// ---------- login (T621): sem sessão vai pro #/login; com sessão, #/login volta pra área do papel ----------
async function rotaDeLogin(papel) {
  if (api.MODO !== 'supabase') { sessaoAtual = await api.sessao(); return false }
  if (papel === 'login') {
    const s = await api.sessao().catch(() => null)
    if (s) { sessaoAtual = s; ir(`#/${s.papel}`); return true }
    await mostrarLogin()
    return true
  }
  sessaoAtual = await api.sessao()
  if (!sessaoAtual) {
    if (papel && papel !== 'login') try { sessionStorage.setItem('concertai.destino', location.hash) } catch { /* ignora */ }
    ir('#/login'); return true
  }
  return false
}

// ---------- página de visita (REGRA 17/11): tela inicial sem login ----------
async function mostrarVisita(papel, vivo) {
  const s = api.MODO === 'supabase' ? await api.sessao().catch(() => null) : null
  if (!vivo()) return
  if (s && !papel) { ir(`#/${s.papel}`); return } // quem já entrou cai na própria área; #/inicio continua abrindo a visita
  $('#topo').innerHTML = ''; $('#rodape').innerHTML = ''; $('#pilula').innerHTML = ''; limparFaixa()
  document.body.classList.remove('hascart')
  document.body.classList.add('pg-visita')
  const el = document.createElement('div')
  $('#tela').replaceChildren(el)
  await visita.tela({ el, sessao: s })
}

// ---------- cadastro do anfitrião avulso (T807): sem login na demo; no real pede login antes ----------
async function mostrarCadastro(vivo) {
  const s = api.MODO === 'supabase' ? await api.sessao().catch(() => null) : null
  if (!vivo()) return
  $('#topo').innerHTML = ''; $('#rodape').innerHTML = ''; $('#pilula').innerHTML = ''; limparFaixa()
  document.body.classList.remove('hascart')
  document.body.classList.add('pg-visita')
  const el = document.createElement('div')
  $('#tela').replaceChildren(el)
  await cadastro.tela({ el, ir, sessao: s })
}

async function mostrarLogin(aviso = '') {
  document.body.classList.remove('pg-visita')
  if (aviso) await auth.sair().catch(() => {})
  $('#topo').innerHTML = ''; $('#rodape').innerHTML = ''; $('#pilula').innerHTML = ''; limparFaixa()
  document.body.classList.remove('hascart')
  await login.tela({ el: $('#tela'), aviso, aoEntrar: (s) => {
    let destino = ''
    try { destino = sessionStorage.getItem('concertai.destino') || ''; sessionStorage.removeItem('concertai.destino') } catch { /* ignora */ }
    // só volta pro link guardado se ele for da área do papel de quem entrou
    ir(destino.startsWith(`#/${s.papel}`) ? destino : `#/${s.papel}`)
  } })
}

async function desenharTopo(papel, tela, mod, vivo = () => true) {
  const notifs = await api.listarNotificacoes()
  if (!vivo()) return false
  const novas = notifs.filter((n) => !n.lida_em).length
  const abas = mod.abas || []
  $('#topo').innerHTML = `<header class="top">
      <a class="logo" href="#/${papel}" aria-label="Início">${LOGO_SEAZONE}<span class="sep"></span><span class="wm">Concert<span>AI</span></span></a>
      <div class="who"><button type="button" class="sino" id="sino" aria-label="Avisos${novas ? `, ${novas} novos` : ''}">${ic('bell')}${novas ? `<span class="ct">${novas}</span>` : ''}</button><span>${esc(sessaoAtual.nome)}</span><div class="av">${esc(sessaoAtual.nome.split(/\s+/).map((s) => s[0]).join('').slice(0, 2))}</div>${api.MODO === 'supabase' ? `<button type="button" class="lg-sair" id="sair" aria-label="Sair" title="Sair">${ic('log-out')}</button>` : ''}</div>
    </header>
    ${abas.length ? `<nav class="tabs" role="tablist">${abas.map((a) => `<a class="tab" role="tab" href="#/${papel}/${a.id}" aria-selected="${(tela || '') === a.id || (a.ativas || []).includes(tela)}">${a.icone ? ic(a.icone) : ''}${esc(a.rotulo)}${a.contador ? `<span class="ct">${a.contador}</span>` : ''}</a>`).join('')}</nav>` : ''}`
  if (mod.contadores) {
    // contadores é assíncrono: conta numa cópia do topo e só troca se esta ainda for a navegação atual
    const copia = $('#topo').cloneNode(true)
    try { await mod.contadores(copia) } catch { /* opcional */ }
    if (!vivo()) return false
    $('#topo').replaceChildren(...copia.childNodes)
  }
  $('#sino').onclick = () => abrirAvisos(notifs)
  if ($('#sair')) $('#sair').onclick = async () => { await auth.sair(); ir('#/login') }
  return vivo()
}

function abrirAvisos(notifs) {
  const s = abrirSheet(`<h2>Avisos</h2><div class="list mt16">${notifs.length ? notifs.map((n) => `<a class="card ntf ${n.lida_em ? '' : 'new'}" href="${esc(n.link || '#')}" data-id="${n.id}"><div class="ic">${ic(n.lida_em ? 'bell' : 'bell-ring')}</div><div><b>${esc(n.titulo)}</b><p class="note">${esc(n.corpo)}</p><span class="code">${fmtDiaRel(n.criado_em.slice(0, 10))}</span></div></a>`).join('') : '<p class="sub">Nenhum aviso.</p>'}</div>`)
  s.el.querySelectorAll('[data-id]').forEach((a) => a.addEventListener('click', async () => { await api.marcarLida(a.dataset.id); s.fechar() }))
}

function limparFaixa() { $('#faixa-vc').innerHTML = ''; document.body.classList.remove('vc') }
// Faixa fixa "Vendo como: <nome> · Trocar · Sair" (admin no real; admin simulado na demo).
function desenharFaixa(papel) {
  const nome = sessaoAtual.ver_como?.nome || sessaoAtual.nome
  const demo = api.MODO !== 'supabase'
  document.body.classList.add('vc')
  $('#faixa-vc').innerHTML = `<div class="vc-faixa" role="region" aria-label="Ver como">
      <span class="vc-lb">${ic('eye')}<span>Vendo como</span></span><b class="vc-nome">${esc(nome)}</b><span class="vc-papel">${NOMES[papel]}</span>
      <a class="vc-bt" href="#/admin?papel=${papel}" id="vc-trocar">${ic('repeat')}<span>Trocar</span></a>
      ${demo && papel === 'prestador' && api.simularPedidoNovo ? `<button type="button" class="vc-bt" id="simular-novo" title="Simular pedido novo chegando" aria-label="Simular pedido novo">${ic('bell-plus')}</button>` : ''}
      ${demo ? `<button type="button" class="vc-bt" id="reiniciar" title="Voltar a demo ao início" aria-label="Reiniciar demo">${ic('rotate-ccw')}</button>` : ''}
      <button type="button" class="vc-bt" id="vc-sair" title="Parar de ver como">${ic('x')}<span>Sair</span></button>
    </div>`
  $('#vc-sair').onclick = async () => { try { await api.verComoSair(); ir('#/admin') } catch (e) { falha(e) } }
  if ($('#reiniciar')) $('#reiniciar').onclick = async () => { await api.reiniciarDemo(); toast('Demo reiniciada'); render() }
  // demo: mostra como fica quando cai um pedido novo (aviso no sino + card em Novos com 1h para confirmar)
  const sim = $('#simular-novo')
  if (sim) sim.onclick = async () => {
    sim.disabled = true
    try { const p = await api.simularPedidoNovo(); toast(`Pedido novo · PED-${p.numero}: confirme em até 1h`); ir('#/prestador') } catch (e) { falha(e) } finally { sim.disabled = false }
  }
  icones()
}

window.addEventListener('hashchange', () => { window.scrollTo(0, 0); render() })
if (api.MODO === 'supabase') auth.aoMudarSessao((ev) => { if (ev === 'SIGNED_OUT' && lerHash().papel !== 'login') ir('#/login') }).catch(() => {})
render()
