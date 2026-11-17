// Ícones Lucide 0.460.0 (ISC) embutidos: sem CDN (CSP só 'self').
const ICONES = {
  'arrow-right-left': '<path d="m16 3 4 4-4 4" /> <path d="M20 7H4" /> <path d="m8 21-4-4 4-4" /> <path d="M4 17h16" />',
  'badge-check': '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" /> <path d="m9 12 2 2 4-4" />',
  'bed-double': '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" /> <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" /> <path d="M12 4v6" /> <path d="M2 18h20" />',
  'calendar': '<path d="M8 2v4" /> <path d="M16 2v4" /> <rect width="18" height="18" x="3" y="4" rx="2" /> <path d="M3 10h18" />',
  'check': '<path d="M20 6 9 17l-5-5" />',
  'check-check': '<path d="M18 6 7 17l-5-5" /> <path d="m22 10-7.5 7.5L13 16" />',
  'chevron-down': '<path d="m6 9 6 6 6-6" />',
  'circle-x': '<circle cx="12" cy="12" r="10" /> <path d="m15 9-6 6" /> <path d="m9 9 6 6" />',
  'clock': '<circle cx="12" cy="12" r="10" /> <polyline points="12 6 12 12 16 14" />',
  'file-lock-2': '<path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v1" /> <path d="M14 2v4a2 2 0 0 0 2 2h4" /> <rect width="8" height="5" x="2" y="13" rx="1" /> <path d="M8 13v-2a2 2 0 1 0-4 0v2" />',
  'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /> <path d="M14 2v4a2 2 0 0 0 2 2h4" /> <path d="M10 9H8" /> <path d="M16 13H8" /> <path d="M16 17H8" />',
  'hourglass': '<path d="M5 22h14" /> <path d="M5 2h14" /> <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" /> <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />',
  'info': '<circle cx="12" cy="12" r="10" /> <path d="M12 16v-4" /> <path d="M12 8h.01" />',
  'landmark': '<line x1="3" x2="21" y1="22" y2="22" /> <line x1="6" x2="6" y1="18" y2="11" /> <line x1="10" x2="10" y1="18" y2="11" /> <line x1="14" x2="14" y1="18" y2="11" /> <line x1="18" x2="18" y1="18" y2="11" /> <polygon points="12 2 20 7 4 7" />',
  'link-2-off': '<path d="M9 17H7A5 5 0 0 1 7 7" /> <path d="M15 7h2a5 5 0 0 1 4 8" /> <line x1="8" x2="12" y1="12" y2="12" /> <line x1="2" x2="22" y1="2" y2="22" />',
  'loader-circle': '<path d="M21 12a9 9 0 1 1-6.219-8.56" />',
  'lock': '<rect width="18" height="11" x="3" y="11" rx="2" ry="2" /> <path d="M7 11V7a5 5 0 0 1 10 0v4" />',
  'map-pin': '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /> <circle cx="12" cy="10" r="3" />',
  'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />',
  'package': '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" /> <path d="M12 22V12" /> <path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7" /> <path d="m7.5 4.27 9 5.15" />',
  'shield-alert': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /> <path d="M12 8v4" /> <path d="M12 16h.01" />',
  'shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /> <path d="m9 12 2 2 4-4" />',
  'sparkles': '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /> <path d="M20 3v4" /> <path d="M22 5h-4" /> <path d="M4 17v2" /> <path d="M5 18H3" />',
  'timer-off': '<path d="M10 2h4" /> <path d="M4.6 11a8 8 0 0 0 1.7 8.7 8 8 0 0 0 8.7 1.7" /> <path d="M7.4 7.4a8 8 0 0 1 10.3 1 8 8 0 0 1 .9 10.2" /> <path d="m2 2 20 20" /> <path d="M12 12v-2" />',
  'wallet': '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /> <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />',
  'x': '<path d="M18 6 6 18" /> <path d="m6 6 12 12" />',
}

/* Links do prestador (CZT-113): uma página para todo link com token de uso único que chega no WhatsApp.
   - oferta: Aceitar/Recusar (termos novos bloqueiam só o Aceitar);
   - termos: ler e aceitar a versão vigente;
   - troca_pix / pix_cancelar: trocar a chave (CNPJ do cadastro ou CPF do titular do MEI), que só vale 72h depois,
     e cancelar enquanto não vale.
   O token fica no fragmento (#t=...), que o navegador não manda ao servidor nem ao log.
   Regras: docs/spec-jornada-a-oferta.md (A-5, A-6), spec D (D11); design: docs/design-prestador.md. */

const ic = (n, cls = '') => `<svg class="lucide ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[n] || ''}</svg>`
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const FUSO = 'America/Sao_Paulo'
const brl = (cents) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: cents % 100 ? 2 : 0 })
const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO }).replace(':', 'h')
const diaMes = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: FUSO })
const hojeSP = () => new Date().toLocaleDateString('pt-BR', { timeZone: FUSO })
const quando = (iso) => (new Date(iso).toLocaleDateString('pt-BR', { timeZone: FUSO }) === hojeSP() ? 'hoje' : diaMes(iso)) + ' às ' + hora(iso)
// data do pedido é dia civil (AAAA-MM-DD), sem fuso
const diaPedido = (d) => { const [a, m, dd] = d.split('-').map(Number); const x = new Date(Date.UTC(a, m - 1, dd, 12)); return x.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).replace('.', '').replace(/^./, (c) => c.toUpperCase()) }
const MOTIVOS = [['agenda_cheia', 'Agenda cheia'], ['longe', 'Fica longe'], ['nao_faz', 'Não faço esse serviço'], ['valor_baixo', 'Valor baixo'], ['outro', 'Outro']]
const LIMITE_MEI_CENTS = 8100000

const app = document.getElementById('app')
const camada = document.getElementById('camada')
const anuncio = document.getElementById('anuncio')
// o token sai da barra de endereço (print, histórico, compartilhar a tela) e fica só nesta aba (sessionStorage),
// para recarregar ou o celular restaurar a aba não virar "link vencido"
const guardado = (k) => { try { return sessionStorage.getItem(k) || '' } catch { return '' } }
const guardar = (k, v) => { try { if (v) sessionStorage.setItem(k, v); else sessionStorage.removeItem(k) } catch { /* sem storage: segue só em memória */ } }
const doLink = new URLSearchParams(location.hash.slice(1)).get('t') || ''
if (doLink && doLink !== guardado('cz_t')) guardar('cz_tc', '')
const token = doLink || guardado('cz_t')
if (token) { guardar('cz_t', token); history.replaceState(null, '', location.pathname) }
let dado = null
let ocupado = false
let motivo = null
let tipoPix = 'cnpj'
let cancelarToken = guardado('cz_tc') || null
let relogio = null

/* ---------------------------------------------------------------- API */
async function api(caminho, corpo, tk = token) {
  try {
    const r = await fetch('/api/link' + caminho, {
      method: corpo ? 'POST' : 'GET',
      headers: { authorization: 'Bearer ' + tk, ...(corpo ? { 'content-type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    })
    return { status: r.status, dado: await r.json().catch(() => ({})) }
  } catch {
    return { status: 0, dado: { error: { code: 'sem_rede', message: 'Sem internet agora. Tente de novo.' } } }
  }
}

/* ---------------------------------------------------------------- moldura */
const faixa = (titulo, sub = '', ped = '') => `<header class="faixa">
  <div class="lin"><span class="marca">Concert<b>AI</b></span>${ped ? `<span class="ped tn">${esc(ped)}</span>` : ''}</div>
  <div><h1 tabindex="-1">${esc(titulo)}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div></header>`
const rodape = (html, nota = '') => `<div class="rodape"><div class="in">${html}${nota ? `<p class="nota">${nota}</p>` : ''}</div></div>`
const resultado = (selo, icone, titulo, texto) => `<div class="resultado"><span class="selo ${selo}">${ic(icone, 'i28')}</span><h2>${titulo}</h2><p>${texto}</p></div>`

function desenhar(html) {
  clearInterval(relogio)
  fecharSheet()
  app.innerHTML = html
  const temRodape = !!app.querySelector('.rodape')
  document.documentElement.classList.toggle('com-rodape', temRodape)
  const h1 = app.querySelector('h1')
  if (h1) { h1.focus(); document.title = 'ConcertAI · ' + h1.textContent }
}

function toast(texto, icone = 'info') {
  document.querySelector('.toast')?.remove()
  const t = document.createElement('div')
  t.className = 'toast'
  t.setAttribute('role', 'status')
  t.innerHTML = ic(icone) + '<span>' + esc(texto) + '</span>'
  document.body.appendChild(t)
  anuncio.textContent = texto
  setTimeout(() => t.remove(), 4000)
}

/* ---------------------------------------------------------------- telas comuns */
function telaLinkUsado() {
  desenhar(faixa('Link vencido') + `<main>${resultado('neutro', 'link-2-off', 'Este link já foi usado ou venceu', 'Por segurança, cada link vale uma vez e por pouco tempo. Peça um novo no WhatsApp do ConcertAI.')}</main>`)
}

function telaErroRede() {
  desenhar(faixa('Sem conexão') + `<main>${resultado('neutro', 'info', 'Não conseguimos abrir o link agora', 'Confira a internet e toque em tentar de novo.')}<button class="bt sec cheio" data-acao="recarregar">Tentar de novo</button></main>`)
}

function falha(r) {
  const code = r.dado?.error?.code
  if (code === 'link_invalido') return telaLinkUsado()
  if (code === 'oferta_expirada') return telaOfertaExpirada()
  toast(r.dado?.error?.message || 'Não deu certo. Tente de novo.', 'circle-x')
}

/* ---------------------------------------------------------------- oferta */
function blocoOferta(o, curto = false) {
  const dur = o.duracao_min === o.duracao_max ? `${o.duracao_min} min` : `${o.duracao_min} a ${o.duracao_max} min`
  const janela = `${o.janela_inicio}h–${o.janela_inicio + 1}h`
  const meta = [['calendar', 'Dia', diaPedido(o.data)], ['clock', 'Chegada', janela]]
  if (!curto) meta.push(['map-pin', 'Bairro', o.bairro || o.cidade], ['hourglass', 'Duração', dur])
  return `<section class="bloco" aria-labelledby="t-serv">
    <div class="valor"><small>Você recebe</small><strong class="tn">${brl(o.liquido_cents)}</strong>${curto ? '' : '<span class="det">já sem a comissão da Seazone · Pix depois da conferência e da NF</span>'}</div>
    <h2 id="t-serv">${esc(o.servico)}</h2>
    <div class="meta">${meta.map(([i, r, v]) => `<div><span>${ic(i, 'i16')}${r}</span><b class="tn">${esc(v)}</b></div>`).join('')}</div>
  </section>`
}

function telaOferta() {
  const o = dado.oferta
  const sub = `Responda até ${quando(dado.expira_em)}`
  const ped = 'PED-' + o.numero
  if (dado.termos_pendentes) {
    desenhar(faixa('Pedido novo para você', sub, ped) + `<main>
      <div class="aviso alerta">${ic('file-lock-2')}<span id="aviso-termos"><b>Os termos mudaram.</b> Para aceitar pedidos novos, leia e aceite a versão ${dado.termos ? dado.termos.versao : 'nova'}. Seus pedidos já confirmados continuam valendo.</span></div>
      ${blocoOferta(o, true)}</main>` +
      rodape(`${dado.termos ? `<button class="bt azul cheio" data-acao="ler-termos">${ic('file-text')}Ler os termos v${dado.termos.versao}</button>` : '<p class="nota">Os termos novos ainda não estão disponíveis. Tente mais tarde.</p>'}
        <div class="par"><button class="bt sec" data-acao="recusar">Recusar</button><button class="bt" aria-disabled="true" aria-describedby="aviso-termos" data-acao="bloqueado">Aceitar pedido</button></div>`))
    return
  }
  const inclui = (o.inclui || []).map((t) => `<li>${ic('check')}<span>${esc(t)}</span></li>`).join('')
  const nao = (o.nao_inclui || []).map((t) => `<li>${ic('x')}<span>Não inclui: ${esc(t)}</span></li>`).join('')
  desenhar(faixa('Pedido novo para você', sub, ped) + `<main>
    ${blocoOferta(o)}
    ${o.aviso_reserva ? `<div class="aviso info">${ic('bed-double')}<span>Tem hóspede nesse dia. Você combina a entrada pelo link, no dia.</span></div>` : ''}
    <section class="bloco"><h3>O que inclui</h3><ul class="lista">${inclui}${nao}
      <li>${ic('package')}<span>Precisou de peça? Informe o valor pelo link antes de comprar. Quem paga aprova por botão.</span></li></ul></section>
    <div class="aviso info">${ic('lock')}<span>O endereço completo e o acesso aparecem depois que você aceitar.</span></div>
  </main>` + rodape('<div class="par"><button class="bt sec" data-acao="recusar">Recusar</button><button class="bt pri" data-acao="aceitar">Aceitar pedido</button></div>', 'Recusar não tira ponto.'))
}

function abrirRecusa() {
  motivo = null
  abrirSheet(`<h2 id="sh-t">Recusar este pedido?</h2>
    <p class="txt2">Sua nota e sua posição não mudam. Se quiser, diga o motivo.</p>
    <div class="chips" role="group" aria-label="Motivo (opcional)">${MOTIVOS.map(([c, t]) => `<button class="chip" aria-pressed="false" data-motivo="${c}">${t}</button>`).join('')}</div>
    <div class="par"><button class="bt sec" data-fechar>Voltar</button><button class="bt pri" data-acao="confirmar-recusa">Recusar pedido</button></div>`)
}

async function responder(aceitar) {
  if (ocupado) return
  ocupado = true
  const r = await api('/oferta', { acao: aceitar ? 'aceitar' : 'recusar', ...(motivo && !aceitar ? { motivo } : {}) })
  ocupado = false
  if (r.status !== 200) {
    if (r.dado?.error?.code === 'termos_pendentes') { await carregar(); return }
    return falha(r)
  }
  if (r.dado.resultado === 'repetida') return telaRespondida(r.dado.resposta, r.dado.respondida_em)
  if (r.dado.resposta === 'aceita') {
    desenhar(faixa('Pedido aceito', '', 'PED-' + dado.oferta.numero) + `<main>${resultado('ok', 'badge-check', 'Combinado!', 'Avisamos o cliente. O endereço completo, o acesso e o checklist chegam no link do dia do serviço.')}
      <div class="aviso info">${ic('message-circle')}<span>Na véspera você recebe um lembrete para confirmar que vai.</span></div></main>`)
  } else {
    desenhar(faixa('Pedido recusado') + `<main>${resultado('neutro', 'check', 'Tudo certo', 'Avisamos o cliente. Sua nota e sua posição continuam iguais.')}</main>`)
  }
}

function telaRespondida(resposta, em) {
  const txt = resposta === 'aceita' ? 'Aceito' : 'Recusado'
  desenhar(faixa('Você já respondeu') + `<main>${resultado(resposta === 'aceita' ? 'ok' : 'neutro', 'check-check', `${txt} em ${diaMes(em)} às ${hora(em)}`, 'Tocar de novo não muda nada e não manda mensagem repetida ao cliente.')}</main>`)
}

function telaOfertaExpirada() {
  desenhar(faixa('O prazo para responder acabou') + `<main>${resultado('neutro', 'timer-off', 'O cliente vai escolher outra opção', 'Não tem problema: não responder não tira ponto. O próximo pedido chega no seu WhatsApp.')}</main>`)
}

/* ---------------------------------------------------------------- termos */
function telaTermos() {
  const t = dado.termos
  if (!t) {
    desenhar(faixa('Termos do profissional') + `<main>${resultado('neutro', 'file-text', 'Os termos ainda não estão disponíveis', 'Tente de novo mais tarde. Avisamos no WhatsApp quando estiverem prontos.')}</main>`)
    return
  }
  const voltar = dado.finalidade === 'oferta' ? '<button class="bt txt" data-acao="voltar-oferta">Voltar ao pedido</button>' : ''
  desenhar(faixa('Termos do profissional', `Versão ${t.versao}${t.provisorio ? ' · rascunho de teste' : ''}`) + `<main>
    ${dado.termos_ja_aceitos ? `<div class="aviso ok">${ic('badge-check')}<span>Você já aceitou esta versão.</span></div>` : ''}
    <section class="bloco"><h2>Leia antes de aceitar</h2><div class="termos-texto" tabindex="0" aria-label="Texto dos termos">${esc(t.texto)}</div>${voltar}</section>
  </main>` + rodape(`<button class="bt pri cheio" data-acao="aceitar-termos">Li e aceito a versão ${t.versao}</button>`, 'Guardamos a versão, a data, a hora, o IP e o seu WhatsApp como prova.'))
}

async function aceitarTermos() {
  if (ocupado) return
  ocupado = true
  const r = await api('/termos', { versao: dado.termos.versao })
  ocupado = false
  if (r.status !== 200) {
    if (r.dado?.error?.code === 'termos_mudaram') { toast('Os termos mudaram enquanto você lia. Leia a versão nova.', 'file-text'); return carregar() }
    return falha(r)
  }
  if (dado.finalidade === 'oferta') { toast('Termos aceitos. Agora você pode aceitar o pedido.', 'badge-check'); return carregar() }
  // confirmação neutra: serve para quem está chegando e para quem só aceitou a versão nova
  guardar('cz_t', '')
  desenhar(faixa('Termos aceitos', `Versão ${r.dado.versao} · ${quando(r.dado.aceito_em)}`) + `<main>${resultado('ok', 'badge-check', 'Tudo certo', `Você aceitou a versão ${r.dado.versao} dos termos. Os pedidos chegam no seu WhatsApp.`)}
    <div class="aviso info">${ic('hourglass')}<span>Se você está começando: nos 5 primeiros serviços os pedidos são de até R$ 300 e o Pix sai no 1º dia útil depois de 72h da conferência.</span></div></main>`)
}

/* ---------------------------------------------------------------- Pix */
function telaPix() {
  const p = dado.pix
  // o próprio link (troca em andamento ou o de cancelar) cancela; cancelarToken só serve logo depois do pedido
  if (p.troca && p.troca.em_carencia) return telaCarencia(p.troca, token)
  if (dado.finalidade === 'pix_cancelar') {
    desenhar(faixa('Troca de chave Pix') + `<main>${resultado('neutro', 'shield-check', 'Não há troca para cancelar', 'Sua chave continua a mesma. Nenhuma troca está esperando para valer.')}</main>`)
    return
  }
  const atual = p.atual ? `<div class="chave"><span class="ic">${ic('landmark')}</span><span><b class="tn">${esc(p.atual.mascara)}</b><span>Todo pagamento do ConcertAI vai só para esta chave.</span></span></div>`
    : `<p class="txt2">Você ainda não tem chave cadastrada.</p>`
  const mei = dado.prestador?.tipo_pj === 'MEI'
  desenhar(faixa('Sua chave Pix', esc(dado.prestador?.nome || '') + (mei ? ' · MEI' : '')) + `<main>
    <section class="bloco"><h3>Chave atual</h3>${atual}</section>
    ${mei ? `<section class="bloco"><h3>Recebido no ano</h3><p class="valor"><strong class="tn medio">${brl(p.recebido_ano_cents || 0)}</strong><span class="det">de ${brl(LIMITE_MEI_CENTS)} do limite do MEI</span></p></section>` : ''}
    <div class="aviso info">${ic('shield-check')}<span>Por segurança, uma chave nova só vale 72h depois da troca. Nunca trocamos chave por mensagem.</span></div>
    ${p.pix_ligado ? '' : `<div class="aviso alerta">${ic('info')}<span>A troca de chave não está disponível agora. Fale com o suporte.</span></div>`}
  </main>` + (p.pix_ligado ? rodape(`<button class="bt sec cheio" data-acao="trocar">${ic('arrow-right-left')}Trocar chave</button>`) : ''))
}

function telaTroca(erroTexto = '', valor = '') {
  const mei = dado.prestador?.tipo_pj === 'MEI'
  if (!mei) tipoPix = 'cnpj'
  const rot = tipoPix === 'cnpj' ? 'CNPJ' : 'CPF'
  desenhar(faixa('Nova chave Pix', 'Só do titular do cadastro') + `<main>
    <div class="campo"><span class="tp" id="tp">Tipo de chave</span>
      <div class="seg" role="group" aria-labelledby="tp"><button data-tipo="cnpj" aria-pressed="${tipoPix === 'cnpj'}">CNPJ da empresa</button>${mei ? `<button data-tipo="cpf" aria-pressed="${tipoPix === 'cpf'}">CPF do titular do MEI</button>` : ''}</div></div>
    <div class="campo"><label for="nchave">${rot}</label><input id="nchave" inputmode="numeric" autocomplete="off" maxlength="18" value="${esc(valor)}" ${erroTexto ? 'aria-invalid="true" aria-describedby="erro-chave"' : ''}>
      ${erroTexto ? `<span class="erro-campo" id="erro-chave" role="alert">${esc(erroTexto)}</span>` : ''}
      <span class="ajuda">${tipoPix === 'cnpj' ? 'Tem que ser o CNPJ do seu cadastro.' : 'Conferimos no Banco Central se a chave é do titular do MEI antes do primeiro Pix.'}</span></div>
    <section class="bloco"><h3>Como funciona</h3><ol class="tempo">
      <li class="agora"><span class="p">1</span><span><b>Hoje</b><span>Você pede a troca e recebe o aviso no WhatsApp.</span></span></li>
      <li><span class="p">2</span><span><b>Durante 72h</b><span>Os pagamentos seguem na chave atual. Dá para cancelar.</span></span></li>
      <li><span class="p">3</span><span><b>Depois de 72h</b><span>A chave nova passa a valer.</span></span></li></ol></section>
  </main>` + rodape('<button class="bt pri cheio" data-acao="pedir-troca">Pedir troca</button>'))
  if (erroTexto) document.getElementById('nchave')?.focus()
}

async function pedirTroca() {
  if (ocupado) return
  const chave = document.getElementById('nchave')?.value || ''
  if (!chave.replace(/\D/g, '')) return telaTroca('Digite a chave.', chave)
  ocupado = true
  const r = await api('/pix', { tipo: tipoPix, chave })
  ocupado = false
  if (r.status !== 200) {
    if (r.status === 422) return telaTroca(r.dado?.error?.message || 'Confira a chave.', chave)
    // caiu a rede no meio: a troca pode ter sido gravada; o próprio link reabre a carência (com o Cancelar)
    if (r.status === 0 || r.dado?.error?.code === 'link_invalido') return carregar()
    return falha(r)
  }
  cancelarToken = r.dado.cancelar
  guardar('cz_tc', cancelarToken)
  telaCarencia({ chave_mascarada: r.dado.chave_mascarada, solicitada_em: new Date().toISOString(), vale_a_partir: r.dado.vale_a_partir }, cancelarToken)
}

function restante(iso) {
  const ms = Math.max(0, new Date(iso).getTime() - Date.now())
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${String(m).padStart(2, '0')}min`
}

function telaCarencia(troca, tkCancelar) {
  cancelarToken = tkCancelar
  desenhar(faixa('Troca de chave em andamento', 'Pedida ' + quando(troca.solicitada_em)) + `<main>
    <section class="bloco" aria-labelledby="t-car"><h3 id="t-car">A chave nova vale em</h3>
      <p class="valor"><strong class="tn" id="carencia">${restante(troca.vale_a_partir)}</strong><span class="det">${esc(diaPedido(new Date(troca.vale_a_partir).toLocaleDateString('sv-SE', { timeZone: FUSO })))} às ${hora(troca.vale_a_partir)}</span></p>
      <div class="chave"><span class="ic">${ic('arrow-right-left')}</span><span><b class="tn">${esc(troca.chave_mascarada)}</b><span>Até lá, o Pix vai para a chave atual.</span></span></div></section>
    <div class="aviso alerta">${ic('shield-alert')}<span><b>Não foi você?</b> Cancele agora. Ninguém da Seazone pede troca de chave por mensagem.</span></div>
  </main>` + rodape(`<button class="bt sec cheio" data-acao="cancelar-troca">${ic('x')}Cancelar a troca</button>`))
  relogio = setInterval(() => { const el = document.getElementById('carencia'); if (el) el.textContent = restante(troca.vale_a_partir) }, 30000)
}

async function cancelarTroca() {
  if (ocupado) return
  ocupado = true
  const r = await api('/pix/cancelar', {}, cancelarToken || token)
  ocupado = false
  if (r.status !== 200) return falha(r)
  guardar('cz_tc', '')
  desenhar(faixa('Troca cancelada') + `<main>${resultado('ok', 'shield-check', 'Sua chave continua a mesma', 'A troca foi cancelada e os pagamentos seguem na chave atual. Se não foi você que pediu, fale com o suporte.')}</main>`)
}

/* ---------------------------------------------------------------- sheet */
let focoAntes = null
function abrirSheet(html) {
  focoAntes = document.activeElement
  camada.innerHTML = `<div class="veu" data-fechar><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-t"><div class="alca"></div>${html}</div></div>`
  app.inert = true
  camada.querySelector('.sheet button')?.focus()
}
function fecharSheet() {
  if (!camada.innerHTML) return
  camada.innerHTML = ''
  app.inert = false
  focoAntes?.focus?.()
}

/* ---------------------------------------------------------------- eventos */
document.addEventListener('click', (e) => {
  const alvo = e.target.closest('button, [data-fechar]')
  if (!alvo) return
  if (alvo.matches('[data-fechar]') && (e.target === alvo || alvo.tagName === 'BUTTON')) return fecharSheet()
  if (alvo.dataset.motivo) {
    motivo = motivo === alvo.dataset.motivo ? null : alvo.dataset.motivo
    camada.querySelectorAll('[data-motivo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.motivo === motivo)))
    return
  }
  if (alvo.dataset.tipo) { const v = document.getElementById('nchave')?.value || ''; tipoPix = alvo.dataset.tipo; return telaTroca('', v) }
  const acao = alvo.dataset.acao
  if (acao === 'aceitar') return responder(true)
  if (acao === 'recusar') return abrirRecusa()
  if (acao === 'confirmar-recusa') return responder(false)
  if (acao === 'bloqueado') return toast('Leia e aceite os termos novos para aceitar pedidos.', 'file-lock-2')
  if (acao === 'ler-termos') return telaTermos()
  if (acao === 'voltar-oferta') return telaOferta()
  if (acao === 'aceitar-termos') return aceitarTermos()
  if (acao === 'trocar') return telaTroca()
  if (acao === 'pedir-troca') return pedirTroca()
  if (acao === 'cancelar-troca') return cancelarTroca()
  if (acao === 'recarregar') return carregar()
})
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharSheet() })

/* ---------------------------------------------------------------- início */
async function carregar() {
  if (!token) return telaLinkUsado()
  const r = await api('')
  if (r.status !== 200) return telaErroRede()
  dado = r.dado
  if (dado.situacao === 'respondida') return telaRespondida(dado.resposta, dado.respondida_em)
  if (dado.situacao === 'expirada') return telaOfertaExpirada()
  if (dado.situacao !== 'ativo') return telaLinkUsado()
  if (dado.finalidade === 'oferta') return telaOferta()
  if (dado.finalidade === 'termos') return telaTermos()
  if (dado.finalidade === 'troca_pix' || dado.finalidade === 'pix_cancelar') return telaPix()
  telaLinkUsado()
}
carregar()
