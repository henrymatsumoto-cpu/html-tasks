// ConcertAI · tela do ADMIN: "ver como" (REGRA 17/11/2026, PR #95).
// O admin escolhe o tipo (franquia, proprietário, prestador) e depois QUEM (busca por nome, com nº de imóveis e de
// pedidos). Daí em diante o app mostra exatamente as telas daquela pessoa, com os dados dela (no real, o banco
// responde como ela: migration 20261117_14). A faixa "Vendo como" no topo (app.js) troca ou sai.
// Rota: #/admin?papel=franquia|proprietario|prestador. CSS: bloco "admin.js" no fim do app.css.
import * as api from '../api.js?v=79617c8'
import { $, esc, ic, icones, avatar, vazio, carregando, falha, toast, brl } from '../ui.js?v=79617c8'

const TIPOS = [
  { id: 'franquia', rotulo: 'Franquia', icone: 'building-2', dica: 'Nome, código ou cidade da franquia' },
  { id: 'proprietario', rotulo: 'Proprietário', icone: 'user', dica: 'Nome do proprietário' },
  { id: 'prestador', rotulo: 'Prestador', icone: 'wrench', dica: 'Nome ou cidade do prestador' },
  { id: 'anfitriao', rotulo: 'Anfitrião avulso', icone: 'key-round', dica: 'Nome ou 4 dígitos do celular' },
]
const plural = (n, um, varios) => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`

export const abas = []

export const rotas = {
  '': async ({ el, query, ir }) => {
    const tipo = TIPOS.find((t) => t.id === query.papel) || TIPOS[0]
    el.innerHTML = `<section class="wrap adm">
      <h1 class="h1">Ver como</h1>
      <p class="sub">Escolha quem você quer ver. Você passa a ver as telas e os dados dessa pessoa. O que você fizer fica registrado no seu nome.</p>
      <div class="tabs adm-tipos" role="tablist" aria-label="Tipo">${TIPOS.map((t) => `<a class="tab" role="tab" href="#/admin?papel=${t.id}" aria-selected="${t.id === tipo.id}">${ic(t.icone)}${t.rotulo}</a>`).join('')}</div>
      <label class="search ctr-busca">${ic('search')}<input id="adm-busca" type="search" autocomplete="off" placeholder="${esc(tipo.dica)}" aria-label="${esc(tipo.dica)}"></label>
      <div id="adm-lista" class="list mt16" aria-live="polite">${carregando(4)}</div>
    </section>`
    icones()
    const lista = $('#adm-lista', el)
    let pedido = 0
    async function buscar(busca) {
      const n = ++pedido
      try {
        if (tipo.id === 'anfitriao') { await listarAnfitrioes(busca, n); return }
        const l = await api.verComoBuscar({ papel: tipo.id, busca, limite: 40 })
        if (n !== pedido) return
        lista.innerHTML = l.length
          ? l.map((x) => `<button type="button" class="card adm-item" data-id="${esc(x.id)}" data-nome="${esc(x.nome)}">
              ${avatar(x.nome)}
              <span class="adm-txt"><b>${esc(x.nome)}</b>${x.detalhe ? `<span class="note">${esc(x.detalhe)}</span>` : ''}
                <span class="adm-num">${tipo.id === 'prestador' ? '' : `${ic('home')}${plural(x.n_imoveis, 'imóvel', 'imóveis')}`}${ic('clipboard-list')}${plural(x.n_pedidos, 'pedido', 'pedidos')}</span></span>
              ${ic('chevron-right', 'adm-ir')}
            </button>`).join('')
          : vazio({ icone: 'search-x', titulo: 'Ninguém com esse nome', texto: 'Tente outra parte do nome ou a cidade.' })
        icones()
      } catch (e) { if (n === pedido) { lista.innerHTML = ''; falha(e) } }
    }
    // T807: anfitriões avulsos (admin_anfitrioes_listar): imóveis, pedidos e quanto pagaram
    async function listarAnfitrioes(busca, n) {
      const l = await api.adminAnfitrioesListar({ busca })
      if (n !== pedido) return
      const total = l.reduce((s, x) => s + (x.pago_cents || 0), 0)
      lista.innerHTML = l.length
        ? `<div class="adm-anf-res cap">${plural(l.length, 'anfitrião', 'anfitriões')} · ${brl(total)} pagos no ato</div>` + l.map((x) => `<button type="button" class="card adm-item" data-id="${esc(x.anfitriao_id)}" data-nome="${esc(x.nome)}">
            ${avatar(x.nome)}
            <span class="adm-txt"><b>${esc(x.nome)}</b><span class="note">${esc(x.celular_mascarado || 'sem celular')}${x.celular_verificado ? ' · confirmado' : ' · não confirmado'} · ${esc((x.documento_tipo || '').toUpperCase())} ${esc(x.documento_mascarado || '')}</span>
              <span class="adm-num">${ic('home')}${plural(x.imoveis_qtd, 'imóvel', 'imóveis')}${ic('clipboard-list')}${plural(x.pedidos_qtd, 'pedido', 'pedidos')}${ic('wallet')}${brl(x.pago_cents || 0)} pago</span></span>
            ${ic('chevron-right', 'adm-ir')}
          </button>`).join('')
        : vazio({ icone: 'search-x', titulo: 'Nenhum anfitrião', texto: 'Busque pelo nome ou por 4 dígitos do celular.' })
      icones()
    }
    let t = null
    $('#adm-busca', el).addEventListener('input', (ev) => { clearTimeout(t); t = setTimeout(() => buscar(ev.target.value), 250) })
    lista.addEventListener('click', async (ev) => {
      const b = ev.target.closest('.adm-item')
      if (!b || b.disabled) return
      b.disabled = true
      try {
        // anfitrião: no banco o alvo é o proprietário (tipo 'anfitriao'); tenta o papel próprio e cai no proprietário
        if (tipo.id === 'anfitriao') await api.verComoDefinir({ papel: 'anfitriao', alvo_id: b.dataset.id }).catch(() => api.verComoDefinir({ papel: 'proprietario', alvo_id: b.dataset.id }))
        else await api.verComoDefinir({ papel: tipo.id, alvo_id: b.dataset.id })
        toast(`Vendo como ${b.dataset.nome}`)
        ir(`#/${tipo.id}`)
      } catch (e) { b.disabled = false; falha(e) }
    })
    await buscar('')
  },
}
