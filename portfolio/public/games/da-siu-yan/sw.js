// The lite copy of 打小人 retired 2026-07-30 — the game lives at
// https://da-siu-yan.hillmanchan.com now (its own repo, da_siu_yan_proj).
// This worker's only job is to clean up after the old one: returning players
// hold a cache-first worker that would otherwise serve the dead game forever.
// It drops every cache, unregisters itself, and reloads open pages so the
// redirect index.html can do its work.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) {
      client.navigate(client.url);
    }
  })());
});
