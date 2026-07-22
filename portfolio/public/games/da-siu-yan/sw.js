/* 打小人 service worker — offline cache.
   Bump the version in CACHE whenever ANY file listed in ASSETS changes,
   otherwise returning players keep the old files. CACHE and ASSETS must
   stay strict JSON (double quotes) — pwa.test.mjs parses them. */
const CACHE = "da-siu-yan-v1";
const ASSETS = [
  "./index.html",
  "./styles.css",
  "./game.js",
  "./scene.js",
  "./audio.js",
  "./recorder.js",
  "./chant-sequencer.js",
  "./damage-model.js",
  "./chant-lines.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./voice/manifest.json",
  "./voice/std/finale.mp3",
  "./voice/std/intro.mp3",
  "./voice/std/line-01.mp3",
  "./voice/std/line-02.mp3",
  "./voice/std/line-03.mp3",
  "./voice/std/line-04.mp3",
  "./voice/std/line-05.mp3",
  "./voice/std/line-06.mp3",
  "./voice/std/line-07.mp3",
  "./voice/std/line-08.mp3",
  "./voice/std/line-09.mp3",
  "./voice/std/line-10.mp3",
  "./voice/std/line-11.mp3",
  "./voice/std/line-12.mp3",
  "./voice/std/line-13.mp3",
  "./voice/std/line-14.mp3",
  "./voice/std/line-15.mp3",
  "./voice/std/line-16.mp3",
  "./voice/std/line-17.mp3",
  "./voice/low/finale.mp3",
  "./voice/low/intro.mp3",
  "./voice/low/line-01.mp3",
  "./voice/low/line-02.mp3",
  "./voice/low/line-03.mp3",
  "./voice/low/line-04.mp3",
  "./voice/low/line-05.mp3",
  "./voice/low/line-06.mp3",
  "./voice/low/line-07.mp3",
  "./voice/low/line-08.mp3",
  "./voice/low/line-09.mp3",
  "./voice/low/line-10.mp3",
  "./voice/low/line-11.mp3",
  "./voice/low/line-12.mp3",
  "./voice/low/line-13.mp3",
  "./voice/low/line-14.mp3",
  "./voice/low/line-15.mp3",
  "./voice/low/line-16.mp3",
  "./voice/low/line-17.mp3"
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
