/* Service worker da PWA de captura (CZT-056): guarda só a casca (HTML, JS, CSS, ícone) para o link abrir
   sem internet. A API nunca passa por cache: estado, check-in e fotos sempre vão à rede (a fila de fotos
   offline fica no IndexedDB da página). Troque VERSAO a cada mudança da casca. */
const VERSAO = 'captura-v1'
const CASCA = ['/captura/', '/captura/captura.js', '/captura/captura.css', '/captura/manifest.webmanifest', '/captura/icone.svg']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(CASCA)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith('/captura')) return
  // rede primeiro (versão nova assim que houver internet); sem rede, a casca guardada
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(url.pathname, copia)) }
    return r
  }).catch(() => caches.match(url.pathname === '/captura' ? '/captura/' : url.pathname)))
})
