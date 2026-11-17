// ConcertAI · bloco "Falar no WhatsApp" do detalhe do pedido (REGRA de 17/11 do Henry).
// Quem contratou (proprietário, franquia ou anfitrião) vê o profissional; o profissional vê quem contratou.
// Só do aceite até o fim da garantia: fora disso o bloco não aparece. Sem celular: "Contato indisponível".
// O botão abre https://wa.me/<celular>?text=<mensagem pronta> (web/js/whatsapp.js).
import * as api from '../api.js?v=79617c8'
import { esc, ic, avatar } from '../ui.js?v=79617c8'

const CSS = `.wpp{display:flex;flex-direction:column;gap:12px}
.wpp-hd{display:flex;align-items:center;gap:12px;min-width:0}
.wpp-hd>div{min-width:0}
.wpp-hd b{display:block;font-size:15px;line-height:20px;overflow-wrap:anywhere}
.wpp-hd .cap{display:block}
.wpp-num{font-variant-numeric:tabular-nums}
.wpp-btn{width:100%;text-decoration:none}
.wpp-btn:focus-visible{outline:3px solid var(--ring);outline-offset:2px}
.wpp-btn svg{width:18px;height:18px}
.wpp-off{display:flex;gap:8px;align-items:flex-start;font-size:14px;line-height:20px;color:var(--fg-2);background:var(--muted);border-radius:12px;padding:10px 12px}
.wpp-off svg{width:16px;height:16px;flex:none;margin-top:2px}
@media (min-width:860px){.wpp-btn{width:auto;align-self:flex-start}}`
if (typeof document !== 'undefined' && !document.getElementById('css-contato-whatsapp')) {
  const st = document.createElement('style'); st.id = 'css-contato-whatsapp'; st.textContent = CSS; document.head.appendChild(st)
}

const ddMm = (iso) => { const [, m, d] = String(iso).split('-'); return `${d}/${m}` }
const ROTULO_COMPRADOR = { franquia: 'Franquia', proprietario: 'Proprietário do imóvel', anfitriao: 'Anfitrião do imóvel' }

/** Contato do pedido (null se der erro: a tela segue sem o bloco). */
export async function carregarContato(p) {
  return api.contatoDoPedido(p.id).catch((e) => { console.warn(e); return null })
}

/** HTML do bloco. Fora da janela (antes do aceite, cancelado, garantia vencida) = ''. */
export function blocoContato(c) {
  if (!c || !c.aberto) return ''
  const doPrestador = c.lado === 'prestador'
  const titulo = doPrestador ? 'Fale com o profissional' : 'Fale com quem contratou'
  const papel = doPrestador ? 'Profissional do pedido' : (ROTULO_COMPRADOR[c.comprador_tipo] || 'Quem contratou')
  const link = api.linkDoContato(c)
  const prazo = c.garantia_ate ? `até o fim da garantia (${esc(ddMm(c.garantia_ate))})` : 'até o fim da garantia'
  return `<section class="card wpp" id="contato-whatsapp" aria-label="${esc(titulo)}">
    <h3>${esc(titulo)}</h3>
    <div class="wpp-hd">${avatar(c.contato_nome)}<div><b>${esc(c.contato_nome)}</b><span class="cap">${esc(papel)}${c.celular ? ` · <span class="wpp-num">${esc(api.fmtCelular(c.celular))}</span>` : ''}</span></div></div>
    ${link
      ? `<a class="btn pri wpp-btn" id="contato-whats" href="${esc(link)}" target="_blank" rel="noopener">${ic('message-circle')}Falar no WhatsApp</a>
         <p class="cap">A mensagem já vai pronta, com o pedido, o imóvel e o horário. O contato fica aqui ${prazo}.</p>`
      : `<p class="wpp-off" id="contato-indisponivel">${ic('phone-off')}<span><b>Contato indisponível.</b> ${doPrestador ? 'O profissional' : 'Quem contratou'} ainda não cadastrou o celular. Fale pela SIA citando o pedido PED-${esc(c.numero)}.</span></p>`}
  </section>`
}
