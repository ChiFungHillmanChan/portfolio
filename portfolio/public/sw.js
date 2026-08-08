/* Portfolio shell service worker — keeps the SPA shell (and therefore the
   game-subdomain entry pages) loadable offline. Game folders under /games/
   run their own service workers; this one never touches their requests.
   Install fetches PRECACHE[0], caches it, then parses its hashed
   /static/ href|src references and precaches those too — the first visit's
   HTML was already fetched by the page before the SW activated, so those
   bundles must be discovered and cached explicitly or offline breaks after
   exactly one visit. Navigations are network-first (shell HTML never goes
   stale online); /static/ hashed CRA bundles are cache-first (immutable
   names). Bump the version in CACHE to force a clean shell cache (that also
   sweeps the cached fonts). CACHE, PRECACHE and FONT_HOSTS must stay strict
   JSON (double quotes) — pwa.test.mjs parses them.

   FONT_HOSTS is the single cross-origin exception: 小氣簿 is set in the Google
   font LXGW WenKai TC, and without it the whole real-book design collapses to a
   system font the moment you go offline. It is written as a positive two-host
   allowlist on purpose. Do NOT "simplify" it by removing or inverting the
   cross-origin early return below — that would hand this worker the
   authenticated, per-user JSON of the notebook API, which must never sit in a
   shared cache. IndexedDB is that data's cache. Nothing else cross-origin is
   touched. */
const CACHE = "portfolio-shell-v2";
const PRECACHE = [
  "/index.html"
];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

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

/* Cache-first for the two font hosts. The stylesheet <link> carries no
   crossorigin attribute, so the browser asks for it in no-cors mode and a plain
   fetch() hands back an opaque response — status 0, indistinguishable from a
   404 or a captive-portal page, which we would then serve as the font forever.
   Both hosts answer with `access-control-allow-origin: *`, so re-ask in cors
   mode, check the real status, and only store a success. (The woff2 requests the
   CSS then makes are already cors — fonts always are.) If the cors ask fails,
   fall back to the plain request and cache nothing. */
async function fontCacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const resp = await fetch(new Request(req.url, { mode: 'cors', credentials: 'omit' }));
    if (resp.ok) await cache.put(req, resp.clone());
    return resp;
  } catch {
    return fetch(req);
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return;
  const url = new URL(req.url);
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(fontCacheFirst(req));
    return;
  }
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
