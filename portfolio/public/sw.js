/* Portfolio shell service worker — keeps the SPA shell (and therefore the
   game-subdomain entry pages) loadable offline. Game folders under /games/
   run their own service workers; this one never touches their requests.
   Install fetches PRECACHE[0], caches it, then parses its hashed
   /static/ href|src references and precaches those too — the first visit's
   HTML was already fetched by the page before the SW activated, so those
   bundles must be discovered and cached explicitly or offline breaks after
   exactly one visit. Navigations are network-first (shell HTML never goes
   stale online); /static/ hashed CRA bundles are cache-first (immutable
   names). Bump the version in CACHE to force a clean shell cache. CACHE and
   PRECACHE must stay strict JSON (double quotes) — pwa.test.mjs parses them. */
const CACHE = "portfolio-shell-v1";
const PRECACHE = [
  "/index.html"
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const resp = await fetch(new Request(PRECACHE[0], { cache: "reload" }));
    if (!resp.ok) throw new Error('shell precache failed: ' + resp.status);
    await cache.put(PRECACHE[0], resp.clone());
    const html = await resp.text();
    const assets = [...new Set([...html.matchAll(/(?:href|src)="(\/static\/[^"]+)"/g)].map((m) => m[1]))];
    await cache.addAll(assets.map((u) => new Request(u, { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("portfolio-shell-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/games/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((resp) => {
        if (resp.ok && (resp.headers.get('content-type') || '').includes('text/html')) {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
        }
        return resp;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (url.pathname.startsWith('/static/') && /\.[0-9a-f]{8}\./.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((resp) => {
          if (resp.status === 200) {
            const copy = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return resp;
        });
      })
    );
  }
});
