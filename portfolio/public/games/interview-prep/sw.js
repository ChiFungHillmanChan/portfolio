// Offline cache for the interview cheatsheet: network-first for the page, cache-first for static assets.
// Template: build.py fills in the cache name (a hash of the page, every recording and these assets) and the
// viz/<file>.<hash>.js paths, so every recording is precached on install and a new build always gets a new cache name.
const CACHE = 'ic-c233d61dee';
const ASSETS = ['./', 'manifest.webmanifest', 'manifest.zh.webmanifest', 'icon.svg', 'icon-192.png', 'icon-180.png', 'viz/00-plan.000355ab9a.js', 'viz/05-python.b887d0bdda.js', 'viz/10-arrays-twoptr-window-stack.92d7e147c1.js', 'viz/11-binsearch-linkedlist.6ee9ccc64d.js', 'viz/12-trees-tries.ca81cf5d28.js', 'viz/13-heap-backtracking-graphs.a78ff82ef6.js', 'viz/14-advgraphs-dp.1d6aabe34d.js', 'viz/15-greedy-intervals-math-bits.957dd23e5c.js', 'viz/20-algorithms.d284bd09ff.js', 'viz/40-roku.a9c6b5b71c.js', 'viz/50-system-design.2edae9e39e.js', 'viz/60-behavioral.573375f0cd.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('./', c)); return r; })
      .catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
