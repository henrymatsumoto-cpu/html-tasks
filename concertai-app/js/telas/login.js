// ConcertAI · tela de login (T621). Rota #/login.
//
// Sem senha: digita o e-mail e "Entrar" manda o link de acesso por e-mail.
// Contas de teste (demo): e-mail + senha e "Entrar" entra na hora.
// Depois do login, cada um cai na área do seu papel (o app.js decide).
// Textos: docs/textos/site-e-telas.md §2 (PR #10). Rótulos "E-mail", "Senha" e "Entrar" são contrato do E2E.
import * as auth from '../auth.js?v=79617c8'
import { AMBIENTE } from '../supabase.js?v=79617c8'
import { $, ic, esc, icones } from '../ui.js?v=79617c8'

// e-mails fictícios do seed (scripts/seed-demo-usuarios.mjs); a senha não fica no site
const DEMO = [
  ['Proprietária', 'proprietaria1@demo.concertai.dev'],
  ['Franquia', 'franquia.norte@demo.concertai.dev'],
  ['Prestador', 'prestador3@demo.concertai.dev'],
  ['Admin', 'admin@demo.concertai.dev'],
]

/** Desenha o login em `el`. `aoEntrar(sessao)` é chamado depois do login com senha. */
export async function tela({ el, aoEntrar, aviso = '' }) {
  const erroLink = auth.erroDoLink()
  el.innerHTML = `<div class="lg-wrap">
    <form class="lg-card" id="lg-form" novalidate>
      <div class="lg-marca"><span class="wm">Concert<span>AI</span></span><span class="lg-por">por Seazone</span></div>
      ${AMBIENTE === 'stg' ? '<p class="lg-stg">Ambiente de teste · nada aqui é cobrado</p>' : ''}
      <h1>Entrar no ConcertAI</h1>
      <p class="sub">Serviços de manutenção para os imóveis da Seazone.</p>
      <div class="lg-msg" id="lg-msg" role="alert" ${erroLink || aviso ? '' : 'hidden'}>${esc(erroLink || aviso)}</div>
      <label class="lg-lbl" for="lg-email">E-mail</label>
      <input class="lg-inp" id="lg-email" name="email" type="email" autocomplete="email" inputmode="email" required placeholder="voce@email.com">
      <label class="lg-lbl" for="lg-senha">Senha <span class="lg-opc">(só contas de teste)</span></label>
      <input class="lg-inp" id="lg-senha" name="senha" type="password" autocomplete="current-password" placeholder="Deixe em branco para receber o link">
      <button type="submit" class="btn pri w lg-btn" id="lg-entrar">Entrar</button>
      <p class="lg-dica">${ic('mail', 'i14')}<span>Sem senha? Deixe em branco: mandamos um link de acesso para o seu e-mail.</span></p>
      <p class="lg-rod">Primeiro acesso? Use o mesmo e-mail cadastrado na Seazone.</p>
      <details class="lg-demo"><summary>Contas de teste</summary>
        <p class="note">Dados fictícios. A senha das contas de teste é passada pelo time do projeto.</p>
        <div class="lg-demo-l">${DEMO.map(([p, e]) => `<button type="button" class="lg-chip" data-email="${esc(e)}"><b>${esc(p)}</b><span>${esc(e)}</span></button>`).join('')}</div>
      </details>
    </form>
    <div class="lg-ok" id="lg-ok" hidden></div>
  </div>`
  icones()

  const form = $('#lg-form', el)
  const email = $('#lg-email', el)
  const senha = $('#lg-senha', el)
  const botao = $('#lg-entrar', el)
  const msg = $('#lg-msg', el)
  const mostrar = (t) => { msg.textContent = t; msg.hidden = !t }

  el.querySelectorAll('[data-email]').forEach((b) => b.addEventListener('click', () => { email.value = b.dataset.email; senha.focus() }))

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    mostrar('')
    botao.disabled = true
    botao.textContent = 'Só um instante…'
    try {
      if (senha.value) {
        const s = await auth.entrarComSenha(email.value, senha.value)
        await aoEntrar(s)
        return
      }
      await auth.enviarLink(email.value)
      form.hidden = true
      const ok = $('#lg-ok', el)
      ok.hidden = false
      ok.innerHTML = `<div class="lg-card">${ic('mail-check', 'lg-ok-ic')}<h1>Confira o seu e-mail</h1>
        <p class="sub">Mandamos um link de acesso para <b>${esc(email.value.trim().toLowerCase())}</b>. Abra o link neste mesmo navegador. Ele vale por 1 hora.</p>
        <p class="note">Não chegou? Olhe a caixa de spam ou peça de novo em alguns minutos.</p>
        <button type="button" class="btn out w" id="lg-voltar">Usar outro e-mail</button></div>`
      icones()
      $('#lg-voltar', el).onclick = () => tela({ el, aoEntrar })
    } catch (e) {
      mostrar(e?.message || 'Algo deu errado do nosso lado. Tente de novo em alguns minutos.')
      if (e?.code === 'credenciais') senha.select()
    } finally {
      botao.disabled = false
      botao.textContent = 'Entrar'
    }
  })
  email.focus()
}
