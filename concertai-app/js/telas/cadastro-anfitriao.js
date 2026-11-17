// ConcertAI · cadastro do ANFITRIÃO AVULSO (T807): CTA "Sou anfitrião e quero contratar" da página de visita.
// Nome, celular (WhatsApp), CPF/CNPJ e aceite dos termos → anfitriao_cadastrar → código do celular (#/anfitriao/verificar).
// Demo: cria a conta e entra nela; o código aparece na tela. Real: precisa estar logado (o login cria o usuário).
import { LOGO_SEAZONE } from '../logo.js?v=79617c8'
import * as api from '../api.js?v=79617c8'
import { $, $$, esc, ic, icones, falha, abrirSheet } from '../ui.js?v=79617c8'

const CAMPO_ERRO = { nome_invalido: 'nome', celular_invalido: 'celular', documento_invalido: 'documento', documento_ja_cadastrado: 'documento', termos_pendentes: 'termos' }
const mascCel = (v) => { const d = v.replace(/\D/g, '').slice(0, 11); return d.length > 7 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d }
const mascDoc = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
}

export async function tela({ el, ir, sessao = null }) {
  const real = api.MODO === 'supabase'
  if (real && !sessao) { try { sessionStorage.setItem('concertai.destino', '#/cadastro') } catch { /* ignora */ } ir('#/login'); return }
  if (real && sessao && sessao.papel !== 'anfitriao' && !sessao.admin) { ir(`#/${sessao.papel}`); return }
  el.innerHTML = `<div class="cad">
    <header class="vs-top"><div class="vs-in"><a class="logo" href="#/inicio" aria-label="ConcertAI, início">${LOGO_SEAZONE}<span class="sep"></span><span class="wm">ConcertAI</span></a><a class="lnk" href="#/inicio">${ic('arrow-left', 'i14')}Voltar</a></div></header>
    <div class="cad-g">
      <aside class="cad-lado">
        <span class="vs-eyebrow">Para anfitriões</span>
        <h1>Conserto no seu imóvel de temporada, mesmo fora da Seazone.</h1>
        <ul>
          <li>${ic('badge-check')}<span><b>Preço fechado</b> antes de pedir</span></li>
          <li>${ic('users')}<span><b>Profissionais avaliados</b> e livres no seu bairro</span></li>
          <li>${ic('lock')}<span><b>Pagamento protegido:</b> o valor fica guardado e só vai para o profissional quando o serviço terminar</span></li>
          <li>${ic('shield-check')}<span><b>90 dias de garantia</b> no serviço</span></li>
        </ul>
      </aside>
      <form class="card cad-form" id="cad-f" novalidate>
        <ol class="cad-passos" aria-label="Etapas"><li class="on">Seus dados</li><li>Código do celular</li><li>Seu imóvel</li></ol>
        <h2>Crie sua conta</h2>
        <p class="sub">Leva 1 minuto. Depois você cadastra o imóvel e já contrata.</p>
        <div class="cad-campo" data-campo="nome"><label class="prop-lbl" for="cad-nome">Nome completo</label><input id="cad-nome" name="nome" type="text" autocomplete="name"><p class="cap cad-d"></p></div>
        <div class="cad-campo" data-campo="celular"><label class="prop-lbl" for="cad-cel">Celular com WhatsApp</label><input id="cad-cel" name="celular" type="tel" inputmode="tel" autocomplete="tel" placeholder="(48) 99999-0000"><p class="cap cad-d">Mandamos um código para confirmar.</p></div>
        <div class="cad-campo" data-campo="documento"><label class="prop-lbl" for="cad-doc">CPF ou CNPJ</label><input id="cad-doc" name="documento" type="text" inputmode="numeric" placeholder="000.000.000-00"><p class="cap cad-d">Para a nota do serviço. Não muda depois.</p></div>
        <div class="cad-campo" data-campo="termos"><label class="ctr-termos"><input type="checkbox" id="cad-termos" name="termos"><span>Li e aceito os <a href="#" id="cad-ver-termos">termos de uso</a> do ConcertAI.</span></label><p class="cap cad-d"></p></div>
        <button type="submit" class="btn cta" id="cad-ok">Criar conta e receber o código</button>
        ${real ? '' : `<p class="cap cad-demo">${ic('flask-conical', 'i14')}Demonstração: o código aparece na próxima tela. CPF de teste: 390.533.447-05</p>`}
      </form>
    </div></div>`
  icones()
  const cel = $('#cad-cel', el); const doc = $('#cad-doc', el)
  cel.addEventListener('input', () => { cel.value = mascCel(cel.value) })
  doc.addEventListener('input', () => { doc.value = mascDoc(doc.value) })
  $('#cad-ver-termos', el).addEventListener('click', (e) => {
    e.preventDefault()
    abrirSheet(`<h2>Termos de uso do ConcertAI</h2><ul class="yes mt16">${['O preço de cada serviço é fechado e aparece antes de você pedir.', 'Você paga no ato, por Pix ou cartão. O valor fica guardado e só vai para o profissional quando o serviço terminar.', 'Cancelou antes do profissional começar, ou ninguém pôde ir: o valor volta integral.', 'Nenhuma peça está inclusa no preço: o profissional informa o valor antes para você aprovar.', 'Pedidos com pelo menos 3h de antecedência; o profissional confirma em até 1h.', 'O serviço fica 90 dias na garantia.'].map((t) => `<li>${ic('check')}<span>${esc(t)}</span></li>`).join('')}</ul><button type="button" class="btn out w mt16" data-fechar-sheet>Fechar</button>`)
  })
  $('#cad-f', el).addEventListener('submit', async (e) => {
    e.preventDefault()
    $$('.cad-campo', el).forEach((c) => c.classList.remove('erro'))
    const bt = $('#cad-ok', el); bt.disabled = true
    try {
      const r = await api.anfitriaoCadastrar({ nome: $('#cad-nome', el).value, celular: cel.value, documento: doc.value, termos: $('#cad-termos', el).checked })
      ir(`#/anfitriao/verificar${r.codigo_demo ? `?c=${r.codigo_demo}` : ''}`)
    } catch (err) {
      bt.disabled = false
      const c = err && CAMPO_ERRO[err.code] && $(`[data-campo="${CAMPO_ERRO[err.code]}"]`, el)
      if (c) { c.classList.add('erro'); c.querySelector('.cad-d').textContent = err.message; c.querySelector('input').focus() } else falha(err)
    }
  })
}
