// ConcertAI · pagamento no ato (T807, REGRA 17/11): anfitrião avulso sempre; proprietário e franquia em imóvel fora
// da Seazone. O pedido nasce em aguardando_pagamento; a pessoa escolhe Pix (QR + copia e cola) ou cartão; pago, o
// pedido vai ao profissional (1h para confirmar). O valor fica guardado (cobrança retida) e só vai para o profissional
// quando o serviço terminar. Demo e gateway 'simulado': botão "Simular pagamento aprovado".
// Contrato: docs/ui-contrato-dados.md, seção "Anfitrião avulso" (pagamento_iniciar, pagamento_confirmar_simulado).
import * as api from '../api.js?v=79617c8'
import { $, esc, ic, icones, brl, toast, falha } from '../ui.js?v=79617c8'

export const TEXTO_GUARDADO = 'O valor fica guardado e só vai para o profissional quando o serviço terminar.'

const hhmm = (iso) => { const d = new Date(iso); return `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}` }

/** QR "de mentira" desenhado a partir do texto (demo/simulado). No real, o gateway devolve a imagem (pix_qr_url). */
function qrSvg(texto) {
  const n = 29; let h = 2166136261
  const bit = (x, y) => { h ^= (x * 31 + y * 17 + texto.charCodeAt((x * n + y) % texto.length)); h = Math.imul(h, 16777619); return (h >>> 7) & 1 }
  const finder = (x, y) => { for (const [a, b] of [[0, 0], [n - 7, 0], [0, n - 7]]) { const dx = x - a; const dy = y - b; if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) return { dentro: true, on: dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) } } return { dentro: false } }
  let r = ''
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const f = finder(x, y)
    if (f.dentro ? f.on : bit(x, y)) r += `<rect x="${x}" y="${y}" width="1" height="1"/>`
  }
  return `<svg class="pg-qr" viewBox="-2 -2 ${n + 4} ${n + 4}" role="img" aria-label="QR Code do Pix"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><g fill="#0b1f3a">${r}</g></svg>`
}

/** Faixa de status do pagamento para o detalhe do pedido (pago/retido/liberado/reembolsado). '' se não há cobrança. */
export function faixaPago(p, cob) {
  if (!cob || cob.status === 'pendente' || cob.status === 'cancelada') return ''
  const metodo = cob.metodo === 'cartao' ? 'cartão' : 'Pix'
  if (cob.status === 'reembolsado') return `<div class="pg-faixa pg-no">${ic('undo-2')}<div><b>Reembolsado: ${brl(cob.reembolso_cents || cob.valor_cents)}</b><p>O valor voltou para o seu ${metodo}.</p></div></div>`
  if (cob.status === 'liberado') return `<div class="pg-faixa pg-ok">${ic('circle-check')}<div><b>Pago ${brl(cob.valor_cents)} no ${metodo}</b><p>Serviço concluído: o valor foi para o profissional.</p></div></div>`
  const titulo = p.status === 'aguardando_prestador' ? 'Pago, aguardando o profissional confirmar' : 'Pago, valor guardado'
  return `<div class="pg-faixa pg-ok">${ic('shield-check')}<div><b>${esc(titulo)}</b><p>${brl(cob.valor_cents)} no ${metodo}. ${esc(TEXTO_GUARDADO)}</p></div></div>`
}

/**
 * Passo de pagamento dentro de `alvo` (elemento). Recarrega sozinho entre escolher, pagar e pago.
 * @param o.aoPago () => void, chamado depois do pagamento aprovado (ex.: recarregar a tela)
 */
export async function montarPagamento(alvo, p, { aoPago } = {}) {
  let cob = await api.cobrancaDoPedido(p.id).catch(() => null)
  const st = { metodo: cob?.status === 'pendente' ? cob.metodo : 'pix' }
  const simulado = api.MODO !== 'supabase' || cob?.gateway === 'simulado'

  const desenhar = () => {
    const pend = cob && cob.status === 'pendente' && cob.metodo === st.metodo
    const opc = (id, icone, tit, sub) => `<label class="pg-op${st.metodo === id ? ' on' : ''}"><input type="radio" name="pg-metodo" value="${id}" ${st.metodo === id ? 'checked' : ''}>
      <span class="pg-op-ic">${ic(icone)}</span><span><b>${tit}</b><small>${sub}</small></span>${st.metodo === id ? ic('circle-check', 'pg-op-ok') : ''}</label>`
    alvo.innerHTML = `<section class="card pg" aria-labelledby="pg-tit">
      <div class="pg-hd"><h3 id="pg-tit">Pagamento</h3><b class="tn">${brl(p.preco_cents)}</b></div>
      <p class="pg-guard">${ic('lock')}<span><b>Pagamento protegido.</b> ${esc(TEXTO_GUARDADO)} Se o pedido for cancelado antes, o valor volta para você.</span></p>
      <div class="pg-ops" role="radiogroup" aria-label="Forma de pagamento">
        ${opc('pix', 'qr-code', 'Pix', 'Aprovação na hora')}
        ${opc('cartao', 'credit-card', 'Cartão de crédito', 'Visa, Master, Elo')}
      </div>
      <div id="pg-corpo">${pend ? corpoPendente() : `<button type="button" class="btn cta mt16" id="pg-iniciar">${st.metodo === 'pix' ? `${ic('qr-code')}Gerar Pix` : `${ic('credit-card')}Pagar com cartão`}</button>`}</div>
      ${cob?.expira_em && pend ? `<p class="cap pg-prazo">${ic('hourglass', 'i14')}Pague até ${esc(hhmm(cob.expira_em))}. Depois disso o pedido é cancelado e o horário liberado.</p>` : ''}
    </section>`
    icones(); ligar()
  }

  const corpoPendente = () => {
    if (st.metodo === 'pix') {
      const cc = cob.pix_copia_cola || ''
      return `<div class="pg-pix">
        ${cob.pix_qr_url ? `<img class="pg-qr" src="${esc(cob.pix_qr_url)}" alt="QR Code do Pix">` : qrSvg(cc || cob.id)}
        <div class="pg-pix-tx"><p class="sub">Abra o app do seu banco, escolha Pix e leia o QR Code. Ou copie o código:</p>
          <div class="pg-cc"><code>${esc(cc.slice(0, 46))}…</code><button type="button" class="btn out sm" id="pg-copiar">${ic('copy')}Copiar</button></div>
          <p class="cap">${ic('info', 'i14')}Assim que o banco confirmar, o pedido vai para o profissional.</p></div>
      </div>${simulado ? botaoSimular() : ''}`
    }
    return `<div class="pg-cartao">
      ${cob.checkout_url ? `<a class="btn pri w" href="${esc(cob.checkout_url)}" target="_blank" rel="noopener">${ic('external-link')}Abrir pagamento seguro</a>` : `<div class="pg-cartao-mock" aria-hidden="true"><span>${ic('credit-card')}</span><div><b>•••• •••• •••• 4242</b><small>Ambiente de teste: nenhum cartão é cobrado.</small></div></div>`}
    </div>${simulado ? botaoSimular() : ''}`
  }
  const botaoSimular = () => `<div class="pg-sim"><span class="cap">${ic('flask-conical', 'i14')}Modo teste</span><button type="button" class="btn pri w" id="pg-simular">${ic('badge-check')}Simular pagamento aprovado</button></div>`

  const ligar = () => {
    alvo.querySelectorAll('input[name="pg-metodo"]').forEach((r) => r.addEventListener('change', () => { st.metodo = r.value; desenhar() }))
    const ini = $('#pg-iniciar', alvo)
    if (ini) ini.onclick = async () => {
      ini.disabled = true
      try { cob = await api.pagamentoIniciar({ pedido_id: p.id, metodo: st.metodo }); desenhar() } catch (e) { falha(e); ini.disabled = false }
    }
    const cp = $('#pg-copiar', alvo)
    if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(cob.pix_copia_cola || '') } catch { /* sem permissão */ } toast('Código Pix copiado') }
    const sim = $('#pg-simular', alvo)
    if (sim) sim.onclick = async () => {
      sim.disabled = true
      try {
        await api.pagamentoConfirmarSimulado({ cobranca_id: cob.id })
        toast('Pagamento aprovado. Agora o profissional confirma em até 1h.')
        aoPago && aoPago()
      } catch (e) { falha(e); sim.disabled = false }
    }
  }
  desenhar()
}
