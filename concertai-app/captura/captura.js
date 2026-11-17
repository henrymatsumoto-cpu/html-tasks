// Ícones Lucide 0.460.0 (ISC) embutidos: a PWA funciona sem internet e sem CDN no campo.
const ICONES = {
  'aperture': '<circle cx="12" cy="12" r="10"/> <path d="m14.31 8 5.74 9.94"/> <path d="M9.69 8h11.48"/> <path d="m7.38 12 5.74-9.94"/> <path d="M9.69 16 3.95 6.06"/> <path d="M14.31 16H2.83"/> <path d="m16.62 12-5.74 9.94"/>',
  'calendar-clock': '<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/> <path d="M16 2v4"/> <path d="M8 2v4"/> <path d="M3 10h5"/> <path d="M17.5 17.5 16 16.3V14"/> <circle cx="16" cy="16" r="6"/>',
  'camera': '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/> <circle cx="12" cy="13" r="3"/>',
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'hourglass': '<path d="M5 22h14"/> <path d="M5 2h14"/> <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/> <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
  'list-checks': '<path d="m3 17 2 2 4-4"/> <path d="m3 7 2 2 4-4"/> <path d="M13 6h8"/> <path d="M13 12h8"/> <path d="M13 18h8"/>',
  'package-plus': '<path d="M16 16h6"/> <path d="M19 13v6"/> <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/> <path d="m7.5 4.27 9 5.15"/> <polyline points="3.29 7 12 12 20.71 7"/> <line x1="12" x2="12" y1="22" y2="12"/>',
  'receipt': '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/> <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/> <path d="M12 17.5v-11"/>',
  'circle-check-big': '<path d="M21.801 10A10 10 0 1 1 17 3.335"/> <path d="m9 11 3 3L22 4"/>',
  'clock': '<circle cx="12" cy="12" r="10"/> <polyline points="12 6 12 12 16 14"/>',
  'cloud-upload': '<path d="M12 13v8"/> <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/> <path d="m8 17 4-4 4 4"/>',
  'hash': '<line x1="4" x2="20" y1="9" y2="9"/> <line x1="4" x2="20" y1="15" y2="15"/> <line x1="10" x2="8" y1="3" y2="21"/> <line x1="16" x2="14" y1="3" y2="21"/>',
  'image-off': '<line x1="2" x2="22" y1="2" y2="22"/> <path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/> <line x1="13.5" x2="6" y1="13.5" y2="21"/> <line x1="18" x2="21" y1="12" y2="15"/> <path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59"/> <path d="M21 15V5a2 2 0 0 0-2-2H9"/>',
  'loader-circle': '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',
  'map-pin-off': '<path d="M12.75 7.09a3 3 0 0 1 2.16 2.16"/> <path d="M17.072 17.072c-1.634 2.17-3.527 3.912-4.471 4.727a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 1.432-4.568"/> <path d="m2 2 20 20"/> <path d="M8.475 2.818A8 8 0 0 1 20 10c0 1.183-.31 2.377-.81 3.533"/> <path d="M9.13 9.13a3 3 0 0 0 3.74 3.74"/>',
  'map-pin': '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/> <circle cx="12" cy="10" r="3"/>',
  'navigation': '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
  'rotate-cw': '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/> <path d="M21 3v5h-5"/>',
  'send': '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/> <path d="m21.854 2.147-10.94 10.939"/>',
  'wifi-off': '<path d="M12 20h.01"/> <path d="M8.5 16.429a5 5 0 0 1 7 0"/> <path d="M5 12.859a10 10 0 0 1 5.17-2.69"/> <path d="M19 12.859a10 10 0 0 0-2.007-1.523"/> <path d="M2 8.82a15 15 0 0 1 4.177-2.643"/> <path d="M22 8.82a15 15 0 0 0-11.288-3.764"/> <path d="m2 2 20 20"/>',
  'x': '<path d="M18 6 6 18"/> <path d="m6 6 12 12"/>',
}

/* PWA de captura do prestador (A17, CZT-056 + CZT-119): chegada por GPS, câmera ao vivo com código do pedido,
   ângulo sorteado pelo servidor, fila offline, checklist do item, item extra (aditivo) e foto da nota da peça. Regras: docs/spec-jornada-c-execucao.md (C5, C7);
   design: docs/design-prestador.md. Não existe caminho para a galeria: a foto sai do <video> da câmera,
   vai para um <canvas> com o carimbo e ganha a marca do disparo (comentário do JPEG) que o servidor confere. */

const ic = (n, cls = '') => `<svg class="lucide ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[n] || ''}</svg>`
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const FUSO = 'America/Sao_Paulo'
const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO }).replace(':00', 'h').replace(':', 'h')
const dia = (iso) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: FUSO }).replace('.', '')
const distTexto = (m) => m >= 1000 ? `${(m / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km` : `${m} m`
const ROTULO = { antes: 'Antes', angulo: 'Ângulo pedido', depois: 'Depois', nf_peca: 'Nota da peça', extra: 'Item extra' }
const reais = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
/** vaga de foto pelo tipo/índice: as da prova e a do item extra */
const acharVaga = (tipo, indice) => estado && [...estado.vagas, ...(estado.aditivo?.vaga ? [estado.aditivo.vaga] : [])].find((v) => v.tipo === tipo && v.indice === indice)

const app = document.getElementById('app')
const camada = document.getElementById('camada')
const token = new URLSearchParams(location.hash.slice(1)).get('t') || ''
let estado = null
let ocupado = false
// tela da etapa de fotos: 'fotos' (lista + checklist) ou 'extra' (pedir item extra)
let telaAtual = 'fotos'
let rascunhoExtra = { tipo: 'material', descricao: '', valor: '', servico: '' }
let faltaMostrada = null

/* ---------------------------------------------------------------- API */
async function api(caminho, corpo) {
  const r = await fetch('/api/captura/' + caminho, {
    method: corpo ? 'POST' : 'GET',
    headers: { authorization: 'Bearer ' + token, ...(corpo ? { 'content-type': 'application/json' } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: 'no-store',
    // rede ruim não pode prender a tela: foto tem 60 s, o resto 20 s
    signal: AbortSignal.timeout(corpo && corpo.imagem ? 60000 : 20000),
  })
  const dado = await r.json().catch(() => ({}))
  return { status: r.status, dado }
}

/* ---------------------------------------------------------------- fila offline (IndexedDB) */
// A foto tirada sem internet fica guardada no aparelho e sobe sozinha quando a conexão volta.
// O disparo da vaga vale até o prazo da prova, então a foto guardada continua válida.
const FILA = (() => {
  let db
  const abrir = () => db || (db = new Promise((ok, falha) => {
    const r = indexedDB.open('concertai-captura', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('fila', { keyPath: 'disparo' })
    r.onsuccess = () => ok(r.result)
    r.onerror = () => falha(r.error)
  }))
  const tx = async (modo, fn) => {
    const banco = await abrir()
    return new Promise((ok, falha) => {
      const t = banco.transaction('fila', modo)
      const req = fn(t.objectStore('fila'))
      t.oncomplete = () => ok(req && req.result)
      t.onerror = () => falha(t.error)
    })
  }
  return {
    por: (item) => tx('readwrite', (s) => s.put(item)),
    tirar: (disparo) => tx('readwrite', (s) => s.delete(disparo)),
    todos: () => tx('readonly', (s) => s.getAll()).then((l) => l || []),
  }
})()

// a fila é por pedido (não por token): se o link for reemitido, as fotos guardadas sobem com o link novo
const meus = (lista) => lista.filter((i) => estado && i.pedido === estado.pedido.codigo)
let enviando = false
let deNovo = false
let timerRetentar = null
function retentarEm(ms) {
  if (timerRetentar) return
  timerRetentar = setTimeout(() => { timerRetentar = null; enviarFila() }, ms)
}
async function enviarFila() {
  if (enviando) { deNovo = true; return }
  enviando = true
  let mudou = false
  try {
    do {
      deNovo = false
      // na ordem em que foram tiradas (o IndexedDB devolve pela chave): o antes sobe primeiro
      const itens = meus(await FILA.todos()).sort((a, b) => (a.em || 0) - (b.em || 0))
      for (const item of itens) {
      let r
      try {
        r = await api('foto', item.corpo)
      } catch {
        mostrarOffline(true)
        retentarEm(5000) // sem rede (ou o 'online' chegou antes da rede de fato): tenta de novo logo
        break
      }
      mostrarOffline(false)
      if (r.dado?.error?.code === 'antes_primeiro') {
        continue // fica na fila: sobe depois que o antes subir
      } else if (r.status === 201 || r.dado?.error?.code === 'vaga_preenchida') {
        await FILA.tirar(item.disparo); mudou = true
      } else if (r.status >= 400 && r.status < 500 && r.status !== 401 && r.status !== 408 && r.status !== 429) {
        // recusada pelo servidor (galeria, hora, foto ruim): a vaga volta a ficar vazia
        await FILA.tirar(item.disparo); mudou = true
        toast(r.dado?.error?.message || 'A foto não foi aceita. Tire de novo.', 'image-off', true)
      } else {
        break
      }
      }
    } while (deNovo && navigator.onLine)
  } finally {
    enviando = false
  }
  if (mudou) await carregar()
}
addEventListener('online', () => enviarFila())
// rede que volta sem o evento 'online' (troca de antena, 3G fraco): tenta de novo a cada 30 s
setInterval(() => { FILA.todos().then((l) => { if (meus(l).length) enviarFila() }).catch(() => {}) }, 30000)

function mostrarOffline(sim) {
  document.querySelector('.offline')?.remove()
  if (sim) app.insertAdjacentHTML('afterbegin', `<div class="offline" role="status">${ic('wifi-off', 'i16')}<span>Sem internet. As fotos ficam guardadas aqui e sobem sozinhas quando voltar.</span></div>`)
}

/* ---------------------------------------------------------------- telas */
function faixa(titulo, sub = '', passo = 0, total = 0) {
  const barras = total ? `<div class="passos" role="img" aria-label="Passo ${passo} de ${total}">${Array.from({ length: total }, (_, i) => `<i class="${i + 1 < passo ? 'ok' : i + 1 === passo ? 'agora' : ''}"></i>`).join('')}</div>` : ''
  return `<header class="faixa"><div class="lin"><span class="marca">Concert<b>AI</b></span>${estado ? `<span class="ped tn">${esc(estado.pedido.codigo)}</span>` : ''}</div>
    ${barras}<div><h1 tabindex="-1">${titulo}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div></header>`
}
const rodape = (html, nota = '') => `<div class="rodape"><div class="in">${html}${nota ? `<p class="nota">${nota}</p>` : ''}</div></div>`

function desenhar(html) {
  app.innerHTML = html
  const rod = app.querySelector('.rodape')
  document.documentElement.style.setProperty('--rod', rod ? rod.offsetHeight + 'px' : '0px')
  app.querySelector('h1')?.focus({ preventScroll: true })
}

function telaResultado(titulo, texto, icone, tom = 'neutro') {
  desenhar(`${faixa(titulo)}<main><div class="resultado"><span class="selo ${tom}">${ic(icone, 'i28')}</span><h2>${titulo}</h2><p>${texto}</p></div></main>`)
}

function telaAntesDoDia() {
  const e = estado
  desenhar(`${faixa(`${esc(dia(e.pedido.janela.inicio))} · chegada ${hora(e.pedido.janela.inicio)}–${hora(e.pedido.janela.fim)}`, esc(e.pedido.servico), 1, 3)}
  <main>
    ${e.pedido.endereco ? `<section class="bloco"><h3>Onde</h3><p>${esc(e.pedido.endereco)}</p></section>` : ''}
    <div class="aviso info">${ic('calendar-clock')}<span>O <b>Cheguei</b> abre às ${hora(e.checkin.abre_em)} do dia do serviço. Abra este link de novo quando estiver no imóvel.</span></div>
  </main>`)
}

function telaCheckin(recusa) {
  const e = estado
  const titulo = recusa ? 'Ainda não deu para registrar' : `Hoje · chegada ${hora(e.pedido.janela.inicio)}–${hora(e.pedido.janela.fim)}`
  let aviso = ''
  if (recusa) {
    const d = recusa.details?.distancia_m
    const primeira = recusa.code === 'fora_do_raio' && typeof d === 'number'
      ? `<b>Você está a ${distTexto(d)} do imóvel.</b> A chegada só vale a até ${e.checkin.raio_m} m da porta.`
      : esc(recusa.message)
    aviso = `<div class="aviso erro" role="alert">${ic('map-pin-off')}<span>${primeira}</span></div>
    <section class="bloco"><h3>O que fazer</h3><ul class="lista">
      ${e.pedido.endereco ? `<li>${ic('navigation')}<span>Confira o endereço: ${esc(e.pedido.endereco)}.</span></li>` : ''}
      <li>${ic('map-pin')}<span>Ligue a localização do celular e chegue perto da entrada.</span></li>
      <li>${ic('map-pin-off')}<span>Localização bloqueada? Toque no cadeado da barra do navegador e permita a localização.</span></li></ul></section>`
  }
  desenhar(`${faixa(titulo, esc(e.pedido.servico), 1, 3)}
  <main>
    ${aviso}
    ${!recusa && e.pedido.endereco ? `<section class="bloco"><h3>Onde</h3><p>${esc(e.pedido.endereco)}</p></section>` : ''}
    ${!recusa ? `<div class="aviso info">${ic('map-pin')}<span>Quando estiver no imóvel, toque em <b>Cheguei</b>. Vale a até ${e.checkin.raio_m} m da porta, até ${hora(e.checkin.fecha_em)}.</span></div>` : ''}
  </main>
  ${rodape(`<button class="bt pri cheio" data-acao="checkin">${ic(recusa ? 'rotate-cw' : 'map-pin')}${recusa ? 'Tentar de novo' : 'Cheguei'}</button>`, 'Usamos a sua localização só para registrar a chegada.')}`)
}

/* ---------------------------------------------------------------- checklist (fica no aparelho até o envio) */
const chaveCheck = () => 'concertai-captura-check:' + token.slice(-24)
// cópia em memória: sem localStorage (aba anônima, bloqueado) o checklist vale enquanto a página estiver aberta
let checkMemoria = null
function marcados() {
  try { return new Set(JSON.parse(localStorage.getItem(chaveCheck()) || '[]')) } catch { return new Set(checkMemoria || []) }
}
function marcar(id, sim) {
  const m = marcados()
  if (sim) m.add(id); else m.delete(id)
  checkMemoria = [...m]
  try { localStorage.setItem(chaveCheck(), JSON.stringify(checkMemoria)) } catch { /* fica só na memória */ }
}

/** o que falta para enviar, pela visão do aparelho (o servidor confere de novo) */
function faltaLocal(fila) {
  const e = estado
  const naFila = (v) => fila.some((i) => i.tipo === v.tipo && i.indice === v.indice)
  const pend = []
  for (const tipo of ['antes', 'angulo', 'depois', 'nf_peca']) {
    const n = e.vagas.filter((v) => v.tipo === tipo && !v.preenchida && !naFila(v)).length
    if (n) pend.push(tipo === 'nf_peca' ? 'a foto da nota da peça' : tipo === 'angulo' ? 'a foto do ângulo pedido' : `${n} foto${n > 1 ? 's' : ''} do ${tipo}`)
  }
  if (e.prova?.checklist_obrigatorio) {
    const m = marcados()
    const n = (e.checklist || []).filter((c) => !m.has(c.id)).length
    if (n) pend.push(`${n} ponto${n > 1 ? 's' : ''} do checklist`)
  }
  return pend
}

const STATUS_EXTRA = {
  pendente: ['hourglass', 'Aguardando quem paga'], aprovado: ['circle-check-big', 'Aprovado'], recusado: ['x', 'Recusado: faça só o contratado'],
  sem_resposta: ['clock', 'Sem resposta: faça só o contratado'], expirado: ['clock', 'Sem resposta: faça só o contratado'],
}

async function telaFotos() {
  telaAtual = 'fotos'
  const e = estado
  const fila = meus(await FILA.todos())
  const naFila = (v) => fila.some((i) => i.tipo === v.tipo && i.indice === v.indice)
  const antes = e.vagas.filter((v) => v.tipo === 'antes')
  const antesOk = antes.every((v) => v.preenchida || naFila(v))
  const grupo = (tipo, vagas, titulo, sub) => {
    const feitas = vagas.filter((v) => v.preenchida).length
    const guardadas = vagas.filter((v) => !v.preenchida && naFila(v)).length
    // o antes vem primeiro: ângulo e depois abrem quando as fotos do antes estão tiradas
    const livre = (tipo === 'antes' || antesOk) ? vagas.find((v) => !v.preenchida && !naFila(v) && v.disparo) : undefined
    const completo = feitas + guardadas >= vagas.length
    const linha = tipo !== 'antes' && !antesOk ? '<span>Depois das fotos do antes</span>'
      : guardadas ? `<span class="fila">${guardadas} na fila para subir</span>` : sub ? `<span>${sub}</span>` : ''
    const cls = completo ? 'feito' : faltaMostrada && !completo ? 'falta' : ''
    return `<li><button class="etapa ${cls}" ${livre ? `data-acao="camera" data-tipo="${tipo}" data-indice="${livre.indice}"` : 'aria-disabled="true"'}>
      <span class="bola">${ic(completo ? 'check' : tipo === 'angulo' ? 'aperture' : tipo === 'nf_peca' ? 'receipt' : 'camera')}</span>
      <span><b>${titulo}</b>${linha}</span><span class="cont tn">${feitas + guardadas}/${vagas.length}</span></button></li>`
  }
  const grupos = ['antes', 'angulo', 'depois'].map((tipo) => grupo(tipo, e.vagas.filter((v) => v.tipo === tipo), ROTULO[tipo],
    tipo === 'angulo' ? esc(e.desafio || '') : '')).join('')
    + e.vagas.filter((v) => v.tipo === 'nf_peca').map((v) => {
      const ad = (e.aditivo?.lista || []).find((a) => a.ordem === v.indice)
      return grupo('nf_peca', [v], 'Nota da peça', ad ? `${esc(ad.descricao)} · a nota inteira, sem cortar` : 'A nota inteira, sem cortar')
    }).join('')
  const m = marcados()
  const check = (e.checklist || []).length ? `<section class="bloco"><h3>Checklist do serviço</h3>
      ${e.prova?.checklist_obrigatorio ? '' : '<p class="txt2">Marque só o que você fez: o resto fica registrado como não feito.</p>'}
      <div class="check">${e.checklist.map((c) => `<label><input type="checkbox" data-check="${esc(c.id)}" ${m.has(c.id) ? 'checked' : ''}><span>${esc(c.texto)}</span></label>`).join('')}</div>
    </section>` : ''
  const lista = e.aditivo?.lista || []
  const extras = lista.length ? `<section class="bloco"><h3>Item extra</h3><ul class="lista">${lista.map((a) => {
    const [icone, txt] = STATUS_EXTRA[a.status] || ['clock', a.status]
    const quem = a.status === 'pendente' ? ` · ${a.aprovador === 'franquia' ? 'a franquia' : 'o proprietário'} decide até ${hora(a.expira_em)}` : ''
    return `<li>${ic(icone)}<span><b>${esc(a.descricao)} · ${reais(a.valor_cents)}${a.tipo === 'material' ? ' (peça)' : ''}</b>${txt}${quem}</span></li>`
  }).join('')}</ul></section>` : ''
  const aguardando = e.estado === 'ADITIVO_SOLICITADO'
    ? `<div class="aviso alerta" role="status">${ic('hourglass')}<span><b>Não compre ainda.</b> O item extra está esperando quem paga. Sem resposta, faça só o que foi contratado.</span></div>` : ''
  const botaoExtra = e.aditivo?.pode_pedir
    ? `<button class="etapa" data-acao="extra"><span class="bola">${ic('package-plus')}</span><span><b>Precisou de algo fora do pedido?</b><span>Peça ou serviço a mais vai para aprovação</span></span>${ic('chevron-right')}</button>` : ''
  const pend = faltaLocal(fila)
  const podeEnviar = e.prova?.pode_enviar && !aguardando
  // depois de um "Enviar" com falta: mostra o que ainda falta agora (ou o que o servidor disse)
  const mostrar = faltaMostrada ? (pend.length ? pend : faltaMostrada) : null
  const aviso = mostrar && mostrar.length
    ? `<div class="aviso erro" role="alert">${ic('list-checks')}<span><b>Falta para enviar:</b> ${esc(mostrar.join(', '))}.</span></div>` : ''
  let rod = ''
  if (podeEnviar) {
    const comFila = !pend.length && fila.length
    rod = rodape(`<button class="bt pri cheio" data-acao="enviar" ${comFila ? 'aria-disabled="true"' : ''}>${ic(comFila ? 'cloud-upload' : 'send')}${comFila ? 'Esperando as fotos subirem' : 'Enviar fotos'}</button>`,
      pend.length ? `Falta: ${esc(pend.join(', '))}.` : comFila ? 'As fotos guardadas sobem sozinhas quando a internet voltar.' : 'A nota fiscal do serviço pode ir agora ou depois.')
  }
  desenhar(`${faixa('Fotos e checklist', `Envie até ${hora(e.prazo_prova)} (fim da janela + 4h)`, 2, 3)}
  <main>
    ${aviso}${aguardando}
    ${e.desafio ? `<div class="desafio-grande">${ic('aperture')}<span><b>Ângulo pedido:</b> ${esc(e.desafio)}</span></div>` : ''}
    <ol class="etapas">${grupos}</ol>
    ${check}${extras}${botaoExtra}
    <p class="txt2">Só vale foto tirada aqui, na hora: o código do pedido, a hora e o local vão na foto.</p>
  </main>${rod}`)
}

async function telaExtra() {
  telaAtual = 'extra'
  const e = estado
  if (!e.aditivo?.pode_pedir) return telaFotos()
  const r = rascunhoExtra
  const fila = meus(await FILA.todos())
  const v = e.aditivo.vaga
  const fotoOk = v && (v.preenchida || fila.some((i) => i.tipo === 'extra' && i.indice === v.indice))
  const fotoSubiu = v && v.preenchida
  const ehPeca = r.tipo === 'material'
  const catalogo = e.aditivo.catalogo || []
  const campos = ehPeca ? `
    <div class="campo"><label for="peca">Qual peça ou material</label><input id="peca" data-campo="descricao" maxlength="120" autocomplete="off" value="${esc(r.descricao)}" placeholder="Ex.: resistência 220 V 5.500 W"></div>
    <div class="campo"><label for="vpeca">Valor da peça</label><input id="vpeca" data-campo="valor" inputmode="decimal" autocomplete="off" value="${esc(r.valor)}" placeholder="R$ 0,00"><span class="ajuda">Reembolso pelo custo, sem taxa. A foto mostra a peça e o orçamento.</span></div>`
    : `<fieldset class="opcoes"><legend class="leg">Serviço do catálogo · preço da tabela</legend>${catalogo.map((c) => `<label><input type="radio" name="servico" data-servico="${esc(c.codigo)}" ${r.servico === c.codigo ? 'checked' : ''}><span>${esc(c.nome)}</span><b class="tn">${reais(c.preco_cents)}</b></label>`).join('') || '<p class="txt2">Nenhum serviço desta categoria no catálogo.</p>'}</fieldset>`
  desenhar(`${faixa('Item extra', 'Peça ou serviço fora do pedido', 2, 3)}
  <main>
    <button class="bt txt" data-acao="voltar">${ic('chevron-left')}Voltar às fotos</button>
    <div class="seg" role="group" aria-label="Tipo do item extra">
      <button data-acao="tipo-extra" data-tipo="material" aria-pressed="${ehPeca}">Peça ou material</button>
      <button data-acao="tipo-extra" data-tipo="escopo" aria-pressed="${!ehPeca}">Serviço do catálogo</button>
    </div>
    ${campos}
    <button class="etapa ${fotoOk ? 'feito' : ''}" ${v && !fotoOk && v.disparo ? `data-acao="camera" data-tipo="extra" data-indice="${v.indice}"` : 'aria-disabled="true"'}>
      <span class="bola">${ic(fotoOk ? 'check' : ehPeca ? 'receipt' : 'camera')}</span>
      <span><b>${ehPeca ? 'Foto da peça ou do orçamento' : 'Foto do que precisa ser feito'}</b><span>${fotoOk && !fotoSubiu ? '<span class="fila">Na fila para subir</span>' : 'Pela câmera do link'}</span></span>
      <span class="cont tn">${fotoOk ? '1/1' : '0/1'}</span></button>
    <div class="aviso info">${ic('clock')}<span>Quem paga aprova por botão em até 2h. Sem resposta, faça só o que já foi pago.</span></div>
  </main>
  ${rodape(`<button class="bt pri cheio" data-acao="pedir-extra" ${fotoSubiu ? '' : 'aria-disabled="true"'}>${ic('package-plus')}Pedir aprovação</button>`,
    fotoSubiu ? 'Só compre a peça depois do aprovado.' : fotoOk ? 'Espere a foto subir para pedir.' : 'Tire a foto antes de pedir.')}`)
}

/** "48", "48,5", "R$ 1.234,56" → centavos (ou NaN) */
function centavos(t) {
  const limpo = String(t || '').replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return NaN
  return Math.round(Number(limpo) * 100)
}

async function pedirExtra(botao) {
  const r = rascunhoExtra
  let corpo
  if (r.tipo === 'material') {
    const valor = centavos(r.valor)
    if (r.descricao.trim().length < 3) return toast('Diga qual é a peça.', 'receipt', true)
    if (!Number.isFinite(valor) || valor < 100) return toast('Informe o valor da peça, ex.: 48,00.', 'receipt', true)
    corpo = { tipo: 'material', descricao: r.descricao.trim(), valor_cents: valor }
  } else {
    if (!r.servico) return toast('Escolha o serviço da lista.', 'package-plus', true)
    corpo = { tipo: 'escopo', servico: r.servico }
  }
  botao.setAttribute('aria-disabled', 'true')
  botao.innerHTML = `<span class="gira">${ic('loader-circle')}</span>Enviando…`
  let resp
  try { resp = await api('aditivo', corpo) } catch {
    toast('Sem internet agora. O pedido do item extra precisa de conexão.', 'wifi-off', true)
    return telaExtra()
  }
  if (resp.status === 201) {
    rascunhoExtra = { tipo: 'material', descricao: '', valor: '', servico: '' }
    toast('Pedido enviado para aprovação. Não compre ainda.', 'hourglass')
    telaAtual = 'fotos'
    return carregar()
  }
  toast(resp.dado?.error?.message || 'Não deu para pedir agora. Tente de novo.', 'package-plus', true)
  return carregar()
}

async function enviarProva(botao) {
  const fila = meus(await FILA.todos())
  const pend = faltaLocal(fila)
  if (pend.length) { faltaMostrada = pend; return telaFotos() }
  botao.setAttribute('aria-disabled', 'true')
  botao.innerHTML = `<span class="gira">${ic('loader-circle')}</span>Enviando…`
  let r
  try { r = await api('prova', { checklist: [...marcados()] }) } catch {
    toast('Sem internet agora. Envie quando a conexão voltar.', 'wifi-off', true)
    return telaFotos()
  }
  if (r.status === 200) {
    faltaMostrada = null
    try { localStorage.removeItem(chaveCheck()) } catch { /* nada */ }
    return carregar()
  }
  if (r.dado?.error?.code === 'prova_incompleta') {
    faltaMostrada = (r.dado.error.details?.faltando || []).map((f) => f.texto)
    if (!faltaMostrada.length) faltaMostrada = ['abra o link de novo']
    return carregar()
  }
  toast(r.dado?.error?.message || 'Não deu para enviar agora. Tente de novo.', 'send', true)
  return carregar()
}

function telaProvaEnviada() {
  const e = estado
  const [titulo, texto, icone, tom] = e.estado === 'PROVA_ENVIADA'
    ? ['Recebemos a prova', 'A conferência sai em até 15 min. Se faltar algo, avisamos aqui e no WhatsApp.', 'circle-check-big', 'ok']
    : e.estado === 'CONTESTADO' || e.estado === 'RETRABALHO'
      ? ['Reclamação aberta', 'O cliente abriu uma reclamação deste serviço. Os próximos passos chegam pelo WhatsApp.', 'clock', 'neutro']
      : ['Prova aprovada', 'A conferência deste serviço já terminou. O pagamento segue pelo WhatsApp.', 'circle-check-big', 'ok']
  desenhar(`${faixa('Fotos enviadas', esc(e.pedido.servico), 3, 3)}
  <main>
    <div class="resultado"><span class="selo ${tom}">${ic(icone, 'i28')}</span><h2>${titulo}</h2>
    <p>${texto}</p></div>
    <div class="aviso info">${ic('receipt')}<span>A nota fiscal do serviço pode ir agora ou depois, pelo link que chega no WhatsApp.</span></div>
  </main>`)
}

async function carregar() {
  if (!token) return telaResultado('Link incompleto', 'Abra o link que chegou no WhatsApp do ConcertAI, sem cortar.', 'image-off', 'erro')
  const chaveLocal = 'concertai-captura-estado:' + token.slice(-24)
  let r
  try {
    r = await api('estado')
  } catch {
    mostrarOffline(true)
    // sem internet ao abrir: usa o último estado deste link (os disparos valem até o prazo da prova)
    if (!estado) { try { estado = JSON.parse(localStorage.getItem(chaveLocal) || 'null') } catch { estado = null } }
    if (estado && (estado.etapa === 'fotos' || estado.etapa === 'fotos_completas')) { await (telaAtual === 'extra' ? telaExtra() : telaFotos()); mostrarOffline(true); return }
    if (estado && estado.etapa === 'prova_enviada') { telaProvaEnviada(); mostrarOffline(true); return }
    // antes do dia ou do Cheguei: mostra a tela guardada; o Cheguei avisa que precisa de conexão
    if (estado && estado.etapa === 'antes_do_dia') { telaAntesDoDia(); mostrarOffline(true); return }
    if (estado && estado.etapa === 'checkin') { telaCheckin(); mostrarOffline(true); return }
    if (estado) return telaResultado('Sem internet', 'Conecte o celular e abra o link de novo.', 'wifi-off')
    return telaResultado('Sem internet', 'Conecte o celular e abra o link de novo.', 'wifi-off')
  }
  if (r.status !== 200) {
    return telaResultado(r.status === 401 ? 'Este link já foi usado ou venceu' : 'Não deu para abrir',
      esc(r.dado?.error?.message || 'Tente de novo em instantes.'), 'image-off', 'erro')
  }
  estado = r.dado
  try { localStorage.setItem(chaveLocal, JSON.stringify(estado)) } catch { /* sem armazenamento: só perde o modo offline */ }
  if (estado.etapa === 'antes_do_dia') return telaAntesDoDia()
  if (estado.etapa === 'checkin') return telaCheckin()
  if (estado.etapa === 'fotos' || estado.etapa === 'fotos_completas') return telaAtual === 'extra' ? telaExtra() : telaFotos()
  if (estado.etapa === 'prova_enviada') return telaProvaEnviada()
  return telaResultado('Este link não aceita mais registros', 'Se precisar de algo deste pedido, fale com o ConcertAI no WhatsApp.', 'clock')
}

/* ---------------------------------------------------------------- check-in */
function posicaoAtual() {
  return new Promise((ok, falha) => {
    if (!navigator.geolocation) return falha({ code: 'sem_gps' })
    navigator.geolocation.getCurrentPosition(ok, (e) => falha({ code: e.code === 1 ? 'negado' : 'sem_gps' }),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 })
  })
}

async function fazerCheckin(botao) {
  botao.setAttribute('aria-disabled', 'true')
  botao.innerHTML = `<span class="gira">${ic('loader-circle')}</span>Pegando a localização…`
  let pos
  try {
    pos = await posicaoAtual()
  } catch (e) {
    return telaCheckin({ code: 'sem_gps', message: e.code === 'negado'
      ? 'A localização está bloqueada. Toque no cadeado da barra do navegador, permita a localização e tente de novo.'
      : 'Não conseguimos a sua localização. Ligue o GPS do celular e tente de novo.' })
  }
  let r
  try {
    r = await api('checkin', { lat: pos.coords.latitude, lng: pos.coords.longitude, precisao_m: pos.coords.accuracy })
  } catch {
    return telaCheckin({ code: 'rede', message: 'Sem internet agora. A chegada precisa de conexão: tente de novo em instantes.' })
  }
  if (r.status === 200) {
    toast('Chegada registrada.', 'check')
    return carregar()
  }
  if (r.status === 422) return telaCheckin(r.dado.error)
  return carregar()
}

/* ---------------------------------------------------------------- câmera ao vivo */
let fluxo = null
let vigiaGps = null
let ultimaPos = null
let relogio = null

function fecharCamera() {
  fluxo?.getTracks().forEach((t) => t.stop())
  fluxo = null
  if (vigiaGps !== null) navigator.geolocation?.clearWatch(vigiaGps)
  vigiaGps = null
  clearInterval(relogio)
  camada.innerHTML = ''
  app.inert = false
  document.body.style.overflow = ''
}

async function abrirCamera(tipo, indice) {
  const vaga = acharVaga(tipo, indice)
  if (!vaga?.disparo) return
  ultimaPos = null // GPS da foto anterior não vale para esta
  const instrucao = { angulo: estado.desafio, antes: 'O local do serviço como você encontrou', depois: 'O serviço pronto, funcionando',
    nf_peca: 'A nota da peça inteira, sem cortar, com o valor legível',
    extra: rascunhoExtra.tipo === 'material' ? 'A peça e o orçamento, com o valor legível' : 'O que precisa ser feito a mais' }[tipo]
  camada.innerHTML = `<div class="camera" role="dialog" aria-modal="true" aria-label="Câmera ao vivo">
    <div class="topo"><button data-acao="fechar-camera" aria-label="Fechar câmera">${ic('x')}</button><span class="titulo">${ROTULO[tipo]}${tipo === 'antes' || tipo === 'depois' ? ` · foto ${indice + 1}` : ''}</span></div>
    <div class="visor">
      <video autoplay playsinline muted></video>
      <div class="aguarde" data-aguarde>Abrindo a câmera…</div>
      <div class="desafio">${ic('aperture')}<span>Agora: <b>${esc(instrucao)}</b></span></div>
      <div class="mira" aria-hidden="true"></div>
      <div class="carimbo" role="img" aria-label="Carimbo da foto"><span class="tn">${ic('hash', 'i16')}${esc(estado.pedido.codigo)}</span><span class="tn" data-hora>${ic('clock', 'i16')}--:--</span><span data-gps>${ic('map-pin', 'i16')}Buscando local…</span></div>
    </div>
    <div class="disparo"><span class="lado">Só câmera ao vivo.<br>Galeria não vale.</span><button class="obturador" data-acao="foto" data-tipo="${tipo}" data-indice="${indice}" aria-label="Tirar foto" disabled></button><span class="lado dir">Código, hora e local vão na foto.</span></div>
  </div>`
  app.inert = true
  document.body.style.overflow = 'hidden'
  const tique = () => { const el = camada.querySelector('[data-hora]'); if (el) el.innerHTML = ic('clock', 'i16') + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO }) }
  tique(); relogio = setInterval(tique, 1000)
  if (navigator.geolocation) {
    vigiaGps = navigator.geolocation.watchPosition((p) => {
      ultimaPos = p
      const el = camada.querySelector('[data-gps]')
      if (el) el.innerHTML = ic('map-pin', 'i16') + `±${Math.round(p.coords.accuracy)} m`
    }, () => {}, { enableHighAccuracy: true, maximumAge: 10000 })
  }
  try {
    fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
  } catch {
    const ag = camada.querySelector('[data-aguarde]')
    if (ag) ag.textContent = 'A câmera está bloqueada. Toque no cadeado da barra do navegador e permita a câmera. Foto da galeria não vale.'
    return
  }
  const video = camada.querySelector('video')
  if (!video) { fluxo.getTracks().forEach((t) => t.stop()); return }
  video.srcObject = fluxo
  await video.play().catch(() => {})
  camada.querySelector('[data-aguarde]')?.remove()
  const ob = camada.querySelector('.obturador')
  if (ob) { ob.disabled = false; ob.focus() }
}

// tira os segmentos APP1 (EXIF/XMP) que algum navegador (Safari) põe no JPEG do canvas: a imagem é nossa,
// não tem dado do aparelho, e o servidor recusa APP1 como sinal de arquivo de galeria
function semApp1(b) {
  const partes = [b.subarray(0, 2)]
  let i = 2
  while (i + 4 <= b.length && b[i] === 0xff) {
    const m = b[i + 1]
    if (m === 0xda) break // daqui em diante são os dados
    const tam = (b[i + 2] << 8) | b[i + 3]
    if (m !== 0xe1) partes.push(b.subarray(i, i + 2 + tam))
    i += 2 + tam
  }
  partes.push(b.subarray(i))
  const out = new Uint8Array(partes.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of partes) { out.set(p, o); o += p.length }
  return out
}

// comentário do JPEG (marcador COM, 0xFFFE) logo depois do SOI: o servidor exige o nonce do disparo aqui
function comMarca(bytes, texto) {
  bytes = semApp1(bytes)
  const dado = new TextEncoder().encode(texto)
  const tam = dado.length + 2
  const out = new Uint8Array(bytes.length + 4 + dado.length)
  out.set([0xff, 0xd8, 0xff, 0xfe, tam >> 8, tam & 0xff], 0)
  out.set(dado, 6)
  out.set(bytes.subarray(2), 6 + dado.length)
  return out
}

function base64(bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

async function tirarFoto(tipo, indice) {
  const vaga = acharVaga(tipo, indice)
  const video = camada.querySelector('video')
  if (!vaga?.disparo || !video || !video.videoWidth) return
  const agora = new Date()
  const escala = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight))
  const w = Math.round(video.videoWidth * escala), h = Math.round(video.videoHeight * escala)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, w, h)
  // carimbo gravado na imagem: código do pedido, data/hora, GPS e o selo do disparo
  const pos = ultimaPos?.coords
  const quando = agora.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: FUSO })
  const linha1 = `${estado.pedido.codigo} · ${quando}`
  const linha2 = `${pos ? `${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)} ±${Math.round(pos.accuracy)} m` : 'sem GPS'} · selo ${vaga.selo}`
  const fs = Math.max(14, Math.round(h / 32))
  ctx.fillStyle = 'rgba(8,14,50,.78)'
  ctx.fillRect(0, h - fs * 3.2, w, fs * 3.2)
  ctx.fillStyle = '#fff'
  ctx.font = `600 ${fs}px Inter, Arial, sans-serif`
  ctx.fillText(linha1, fs * 0.6, h - fs * 1.85)
  ctx.fillText(linha2, fs * 0.6, h - fs * 0.6)
  const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.85))
  if (!blob) return toast('Não deu para gravar a foto. Tente de novo.', 'image-off', true)
  const bytes = comMarca(new Uint8Array(await blob.arrayBuffer()), vaga.marca)
  const item = {
    disparo: vaga.disparo, pedido: estado.pedido.codigo, tipo, indice, em: agora.getTime(),
    corpo: {
      disparo: vaga.disparo, imagem: base64(bytes), capturado_em: agora.toISOString(),
      ...(pos ? { lat: pos.latitude, lng: pos.longitude, precisao_m: pos.accuracy } : {}),
    },
  }
  await FILA.por(item)
  fecharCamera()
  if (!navigator.onLine) toast('Foto guardada no aparelho. Sobe quando voltar a internet.', 'check')
  else if (pos) toast('Foto salva com código, hora e local.', 'check')
  else toast('Foto salva sem a localização. Libere o GPS do navegador nas próximas.', 'map-pin-off', true)
  await (telaAtual === 'extra' ? telaExtra() : telaFotos())
  // o envio corre em segundo plano: a tela não fica travada esperando o upload (a fila já evita envio duplo)
  enviarFila().catch(() => {})
}

/* ---------------------------------------------------------------- avisos */
let tt
function toast(msg, icone = 'check', erro = false) {
  document.querySelector('.toast')?.remove()
  const el = document.createElement('div')
  el.className = 'toast' + (erro ? ' erro' : '')
  el.setAttribute('role', erro ? 'alert' : 'status')
  el.innerHTML = ic(icone) + `<span>${esc(msg)}</span>`
  document.body.appendChild(el)
  document.getElementById('anuncio').textContent = msg
  clearTimeout(tt); tt = setTimeout(() => el.remove(), 4000)
}

/* ---------------------------------------------------------------- eventos */
document.addEventListener('click', async (e) => {
  const alvo = e.target.closest('[data-acao]')
  if (!alvo || alvo.getAttribute('aria-disabled') === 'true' || alvo.disabled) return
  const acao = alvo.dataset.acao
  // fechar a câmera sempre funciona, mesmo com ela ainda abrindo
  if (acao === 'fechar-camera') return fecharCamera()
  if (ocupado) return
  ocupado = true
  try {
    if (acao === 'checkin') await fazerCheckin(alvo)
    else if (acao === 'extra') await telaExtra()
    else if (acao === 'voltar') await telaFotos()
    else if (acao === 'tipo-extra') { rascunhoExtra.tipo = alvo.dataset.tipo === 'escopo' ? 'escopo' : 'material'; await telaExtra() }
    else if (acao === 'pedir-extra') await pedirExtra(alvo)
    else if (acao === 'enviar') await enviarProva(alvo)
    else if (acao === 'camera') await abrirCamera(alvo.dataset.tipo, Number(alvo.dataset.indice))
    else if (acao === 'foto') {
      alvo.disabled = true
      try { await tirarFoto(alvo.dataset.tipo, Number(alvo.dataset.indice)) } catch { toast('Não deu para gravar a foto. Tente de novo.', 'image-off', true) }
      // foto não saiu e a câmera continua aberta: libera o obturador de novo
      if (alvo.isConnected) alvo.disabled = false
    }
  } finally {
    ocupado = false
  }
})
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && fluxo) fecharCamera() })
// checklist e campos do item extra: guardam no aparelho sem redesenhar a tela (o foco não pula)
document.addEventListener('change', (e) => {
  const el = e.target
  if (el.matches?.('input[data-check]')) {
    marcar(el.dataset.check, el.checked)
    // atualiza o que falta (nota do rodapé e o aviso vermelho, se aberto) sem redesenhar a tela
    FILA.todos().then((l) => {
      if (telaAtual !== 'fotos' || !estado) return
      const p = faltaLocal(meus(l))
      const n = app.querySelector('.rodape .nota')
      if (n) n.textContent = p.length ? `Falta: ${p.join(', ')}.` : 'A nota fiscal do serviço pode ir agora ou depois.'
      if (faltaMostrada) {
        faltaMostrada = p.length ? p : null
        const av = app.querySelector('main > .aviso.erro span')
        if (av && p.length) av.innerHTML = `<b>Falta para enviar:</b> ${esc(p.join(', '))}.`
        else app.querySelector('main > .aviso.erro')?.remove()
      }
    }).catch(() => {})
  } else if (el.matches?.('input[data-servico]')) rascunhoExtra.servico = el.dataset.servico
})
document.addEventListener('input', (e) => {
  const el = e.target
  if (el.matches?.('input[data-campo]')) rascunhoExtra[el.dataset.campo] = el.value
})
// imagem arrastada ou colada nunca vira foto: a página não tem nenhum caminho de arquivo
for (const ev of ['dragover', 'drop', 'paste']) document.addEventListener(ev, (e) => e.preventDefault())

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/captura/sw.js', { scope: '/captura/' }).catch(() => {})
carregar().then(() => enviarFila())
