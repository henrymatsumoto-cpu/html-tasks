// ConcertAI · página de visita (tela inicial sem login, REGRA 17/11): o que é, como funciona,
// serviços com preço, para quem é e como entrar. Na demo os botões abrem a área de cada papel;
// no real levam ao login (ou à área de quem já entrou).
import { LOGO_SEAZONE } from '../logo.js?v=79617c8'
import * as api from '../api.js?v=79617c8'
import { ic, esc, brl, icones } from '../ui.js?v=79617c8'

const PAPEIS = { proprietario: 'Proprietário', franquia: 'Franquia', prestador: 'Prestador' }

/** Destinos dos botões conforme o modo e a sessão. */
function destinos(sessao) {
  if (api.MODO !== 'supabase') {
    return { principal: { href: '#/proprietario/contratar', rotulo: 'Contratar um serviço' }, entrar: { href: '#/proprietario', rotulo: 'Entrar na demo' }, papel: (p) => `#/${p}`, rotPapel: (p) => `Ver como ${PAPEIS[p].toLowerCase()}` }
  }
  if (sessao) {
    const area = `#/${sessao.papel}`
    return { principal: { href: sessao.papel === 'prestador' ? area : `${area}/contratar`, rotulo: sessao.papel === 'prestador' ? 'Ver meus pedidos' : 'Contratar um serviço' }, entrar: { href: area, rotulo: 'Minha área' }, papel: () => area, rotPapel: () => 'Ir para minha área' }
  }
  return { principal: { href: '#/login', rotulo: 'Entrar e contratar' }, entrar: { href: '#/login', rotulo: 'Entrar' }, papel: () => '#/login', rotPapel: () => 'Entrar' }
}

const PASSOS = [
  ['home', 'Escolha o imóvel e o serviço', 'Chuveiro sem esquentar, torneira pingando, ar sem gelar. Cada serviço tem preço fechado, o que inclui e quanto tempo leva.'],
  ['calendar-clock', 'Marque o dia e o horário', 'Janelas de 1h, das 8h às 17h, com pelo menos 3h de antecedência. Se tiver hóspede no dia, a gente avisa (dá para marcar mesmo assim).'],
  ['users', 'Escolha quem vai fazer', 'Só aparecem profissionais livres nesse horário e que atendem o bairro do imóvel, os mais bem avaliados primeiro.'],
  ['camera', 'Acompanhe até o fim', 'O profissional confirma em até 1h (se não confirmar, você troca). Fotos do antes e depois, 90 dias de garantia e pagamento descontado do repasse.'],
]

const PUBLICOS = [
  { papel: 'proprietario', icone: 'key-round', titulo: 'Para proprietários', itens: ['Seus imóveis e as reservas no mesmo lugar', 'Preço fechado antes de confirmar', 'Aprova pedidos da franquia por botão', 'Paga descontado do repasse, sem boleto'] },
  { papel: 'franquia', icone: 'building-2', titulo: 'Para franquias', itens: ['Contrata para qualquer imóvel da carteira', 'Acima de R$ 300, o proprietário aprova antes', 'Visitas do dia com o que você precisa fazer', 'Menos ligação para achar quem conserte'] },
  { papel: 'prestador', icone: 'wrench', titulo: 'Para prestadores', itens: ['Pedidos no seu bairro e no seu horário', 'Perfil com serviços, área e agenda', 'Confirma ou recusa em até 1h', 'Recebe com CNPJ e nota fiscal do serviço'] },
]

const FAQ = [
  ['As peças estão inclusas?', 'Não. Nenhum serviço inclui peça ou material: na troca de resistência, por exemplo, a resistência é à parte. Se precisar, o profissional informa o valor antes e você aprova ou compra.'],
  ['E se o profissional não confirmar?', 'Ele tem até 1h para confirmar. Se recusar ou não responder, você escolhe outro profissional livre no mesmo horário.'],
  ['Posso marcar com hóspede no imóvel?', 'Pode. A agenda não bloqueia dias com reserva, só avisa: às vezes o conserto não pode esperar. A franquia combina o acesso.'],
  ['Quem paga e como?', 'Sempre o proprietário do imóvel. O valor sai como despesa no próximo repasse, igual às manutenções de hoje.'],
  ['Por que pelo menos 3h antes?', 'Para dar tempo de o profissional confirmar e se deslocar. Pedido em cima da hora acaba sem ninguém.'],
]

/** Serviços do Lote 1 agrupados por categoria; se o catálogo não carregar, a seção some (a página continua). */
async function catalogo() {
  try {
    const [cats, svcs] = await Promise.all([api.listarCategorias(), api.listarServicos({ lote: 1 })])
    return cats.map((c) => ({ ...c, servicos: svcs.filter((s) => s.categoria_codigo === c.codigo) })).filter((c) => c.servicos.length)
  } catch { return [] }
}

function duracao(s) {
  const f = (m) => m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`
  return s.duracao_max && s.duracao_max !== s.duracao_min ? `${f(s.duracao_min)} a ${f(s.duracao_max)}` : f(s.duracao_min || s.duracao_max || 60)
}

export async function tela({ el, sessao = null }) {
  const d = destinos(sessao)
  const cats = await catalogo()
  const precos = cats.flatMap((c) => c.servicos.map((s) => s.preco_cents))
  const faixa = precos.length ? `de ${brl(Math.min(...precos))} a ${brl(Math.max(...precos))}` : ''
  const demo = api.MODO !== 'supabase'
  const exemplo = cats.flatMap((c) => c.servicos).find((s) => s.codigo === 'EL-01')

  el.innerHTML = `<div class="vs">
    <header class="vs-top"><div class="vs-in">
      <a class="logo" href="#/inicio" aria-label="ConcertAI, início">${LOGO_SEAZONE}<span class="sep"></span><span class="wm">ConcertAI</span></a>
      <nav class="vs-nav" aria-label="Seções"><a href="#vs-como" data-ancora="vs-como">Como funciona</a><a href="#vs-servicos" data-ancora="vs-servicos">Serviços</a><a href="#vs-quem" data-ancora="vs-quem">Para quem</a><a href="#vs-faq" data-ancora="vs-faq">Dúvidas</a></nav>
      <a class="btn pri sm vs-entrar" href="${d.entrar.href}">${esc(d.entrar.rotulo)}</a>
    </div></header>

    <section class="vs-hero"><div class="vs-in vs-hero-g">
      <div class="vs-hero-tx">
        <span class="vs-eyebrow">Manutenção para imóveis da Seazone${demo ? ' · demonstração' : ''}</span>
        <h1>Conserto no seu imóvel, com preço fechado e profissional avaliado.</h1>
        <p class="vs-lead">Escolha o serviço, o dia e o horário. A gente mostra só quem está livre e atende o bairro do imóvel. Você acompanha por foto e paga descontado do repasse.</p>
        <div class="vs-ctas"><a class="btn cta vs-cta" href="${d.principal.href}">${esc(d.principal.rotulo)}${ic('arrow-right')}</a><a class="btn vs-sec" href="#vs-como" data-ancora="vs-como">Como funciona</a></div>
        <a class="vs-anf" href="#/cadastro">${ic('key-round')}<span><b>Sou anfitrião e quero contratar</b><small>Imóvel fora da Seazone? Você paga no ato e o valor fica guardado até o serviço terminar.</small></span>${ic('arrow-right')}</a>
        <ul class="vs-selos">
          <li>${ic('badge-check')}Preço fechado antes</li><li>${ic('shield-check')}90 dias de garantia</li><li>${ic('file-check-2')}Profissional com CNPJ</li>
        </ul>
      </div>
      <div class="vs-hero-vis" aria-hidden="true">
        <div class="vs-mock">
          <div class="vs-mock-h"><span class="vs-mock-ic">${ic('zap')}</span><div><b>Troca de resistência do chuveiro</b><span>Apto Jurerê · quinta, 14h–15h</span></div></div>
          <p class="vs-mock-l">3 profissionais livres nesse horário em Jurerê</p>
          ${[['Joana Elétrica', '4,9', '128'], ['Volt Ilha', '4,8', '76'], ['Marcos T.', '4,7', '54']].map(([n, nt, q], i) => `<div class="vs-mock-p${i === 0 ? ' on' : ''}"><span class="av">${n.split(' ').map((x) => x[0]).join('').slice(0, 2)}</span><div><b>${n}</b><span>${ic('star', 'star')}${nt} · ${q} serviços</span></div>${i === 0 ? ic('circle-check') : ''}</div>`).join('')}
          <div class="vs-mock-f"><span>${ic('package', 'i14')}Resistência não inclusa</span>${exemplo ? `<b class="tn">${brl(exemplo.preco_cents)}</b>` : ''}</div>
        </div>
        <div class="vs-mock-tag">${ic('clock', 'i14')}Confirma em até 1h</div>
      </div>
    </div></section>

    <section class="vs-sec-b" id="vs-como"><div class="vs-in">
      <span class="vs-eyebrow">Como funciona</span>
      <h2 class="vs-h2">Do pedido ao conserto, em quatro passos</h2>
      <ol class="vs-passos">${PASSOS.map(([icone, t, tx], i) => `<li><span class="vs-n">${i + 1}</span><span class="vs-pi">${ic(icone)}</span><h3>${esc(t)}</h3><p>${esc(tx)}</p></li>`).join('')}</ol>
    </div></section>

    ${cats.length ? `<section class="vs-sec-b vs-alt" id="vs-servicos"><div class="vs-in">
      <span class="vs-eyebrow">Serviços</span>
      <h2 class="vs-h2">Os mais pedidos, já com preço</h2>
      <p class="vs-sub">${cats.length} categorias, ${precos.length} serviços para começar${faixa ? `, ${faixa}` : ''}. Preço fechado do serviço; peça e material sempre à parte.</p>
      <div class="vs-cats">${cats.map((c) => `<div class="vs-cat"><div class="vs-cat-h"><span class="vs-cat-ic">${ic(c.icone || 'wrench')}</span><h3>${esc(c.nome)}</h3></div>
        <ul>${c.servicos.map((s) => `<li><div><b>${esc(s.nome)}</b><span>${ic('clock', 'i14')}${esc(duracao(s))}</span></div><b class="tn">${brl(s.preco_cents)}</b></li>`).join('')}</ul></div>`).join('')}</div>
      <div class="mat vs-peca">${ic('package')}<div><b>Nenhuma peça está inclusa</b><p>Na troca de resistência, a resistência é à parte; na instalação de chuveiro, o chuveiro novo também. Qualquer peça ou material você compra ou aprova o valor antes, quando o profissional informar.</p></div></div>
    </div></section>` : ''}

    <section class="vs-sec-b" id="vs-quem"><div class="vs-in">
      <span class="vs-eyebrow">Para quem</span>
      <h2 class="vs-h2">Um lugar só para quem cuida do imóvel</h2>
      <div class="vs-quem">${PUBLICOS.map((p) => `<article class="vs-pub"><span class="vs-pub-ic">${ic(p.icone)}</span><h3>${esc(p.titulo)}</h3>
        <ul>${p.itens.map((x) => `<li>${ic('check', 'i14')}${esc(x)}</li>`).join('')}</ul>
        <a class="btn out vs-pub-bt" href="${d.papel(p.papel)}">${esc(d.rotPapel(p.papel))}${ic('arrow-right')}</a></article>`).join('')}</div>
    </div></section>

    <section class="vs-sec-b vs-anf-b"><div class="vs-in vs-anf-g">
      <div><span class="vs-eyebrow">Para anfitriões</span><h2 class="vs-h2">Tem imóvel de temporada fora da Seazone?</h2>
        <p class="vs-sub">Crie sua conta com nome, celular e CPF ou CNPJ, cadastre o imóvel e contrate os mesmos profissionais. Você paga por Pix ou cartão e o valor fica guardado até o serviço terminar.</p></div>
      <a class="btn cta vs-cta" href="#/cadastro">Sou anfitrião e quero contratar${ic('arrow-right')}</a>
    </div></section>

    <section class="vs-sec-b vs-alt" id="vs-faq"><div class="vs-in vs-faq-g">
      <div><span class="vs-eyebrow">Dúvidas</span><h2 class="vs-h2">Perguntas frequentes</h2><p class="vs-sub">Outra dúvida? Fale com a SIA, a assistente da Seazone.</p></div>
      <div class="prop-faq vs-faq">${FAQ.map(([q, r]) => `<details><summary>${esc(q)}${ic('chevron-down', 'i14')}</summary><p>${esc(r)}</p></details>`).join('')}</div>
    </div></section>

    <section class="vs-final"><div class="vs-in">
      <h2>Precisa de um conserto no imóvel?</h2>
      <p>Escolha o serviço e o horário. O resto a gente acompanha com você.</p>
      <a class="btn cta vs-cta" href="${d.principal.href}">${esc(d.principal.rotulo)}${ic('arrow-right')}</a>
    </div></section>

    <footer class="vs-rod"><div class="vs-in"><span>ConcertAI é um serviço da Seazone.</span><span>Ajuda pela SIA</span></div></footer>
  </div>`

  // âncoras internas sem mexer no hash (o hash é a rota)
  el.querySelectorAll('[data-ancora]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault()
    el.querySelector(`#${a.dataset.ancora}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }))
  icones()
}
