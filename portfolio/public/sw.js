/* Portfolio shell service worker — keeps the SPA shell (and therefore the
   game-subdomain entry pages) loadable offline. Game folders under /games/
   run their own service workers; this one never touches their requests.
   Navigations are network-first (shell HTML never goes stale online);
   /static/ hashed CRA bundles are cache-first (immutable names). Bump the
   version in CACHE to force a clean shell cache. CACHE and PRECACHE must
   stay strict JSON (double quotes) — pwa.test.mjs parses them. */
const CACHE = "portfolio-shell-v1";
const PRECACHE = [
  "/index.html"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
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
