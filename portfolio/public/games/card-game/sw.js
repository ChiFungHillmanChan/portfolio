/* Never Have I Ever service worker — offline cache.
   Bump the version in CACHE whenever ANY file listed in ASSETS changes,
   otherwise returning players keep the old files. CACHE and ASSETS must
   stay strict JSON (double quotes) — pwa.test.mjs parses them.
   If the built app is ever re-synced here, the /assets hashes change —
   update ASSETS and bump CACHE (pwa.test.mjs will fail until you do). */
const CACHE = "card-game-v1";
const ASSETS = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "/assets/index-DNDvMiOj.js",
  "/assets/index-_EUB7mlz.css",
  "/assets/FirebaseSyncManager-Bkfq24lo.js",
  "/assets/TempSyncManager-B5kJ8VAi.js"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE.replace(/v\d+$/, "")) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // Cross-origin (Firebase, gstatic, analytics): browser default behavior.
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const resp = await fetch(req);
      if (resp.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, resp.clone());
      }
      return resp;
    } catch (err) {
      if (req.mode === 'navigate') {
        const index = await caches.match('./index.html');
        if (index) return index;
      }
      throw err;
    }
  })());
});
