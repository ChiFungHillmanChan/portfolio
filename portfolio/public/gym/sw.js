/* global importScripts, self, caches */
importScripts('./precache.js');

const SCOPE = self.registration.scope;
const CACHE_PREFIX = `gym-offline:${encodeURIComponent(SCOPE)}:`;
const CACHE_NAME = `${CACHE_PREFIX}${self.GYM_VERSION}`;
const ASSETS = self.GYM_ASSETS.map(asset => new URL(asset, SCOPE).href);
const INDEX_URL = new URL('./index.html', SCOPE).href;
let filling = null;

async function announce(message, target) {
  if (target?.postMessage) {
    target.postMessage(message);
    return;
  }
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    if (client.url.startsWith(SCOPE)) client.postMessage(message);
  }
}

async function complete(cache) {
  const keys = new Set((await cache.keys()).map(request => request.url));
  return ASSETS.length > 0 && ASSETS.every(url => keys.has(url));
}

async function fillCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    if (!(await complete(cache))) {
      let cursor = 0;
      let done = 0;
      let failure = null;
      await announce({ type: 'CACHE_PROGRESS', done, total: ASSETS.length });
      async function download() {
        while (!failure && cursor < ASSETS.length) {
          const url = ASSETS[cursor++];
          try {
            const response = await fetch(new Request(url, { cache: 'reload', credentials: 'same-origin' }));
            if (!response.ok || response.status === 206 || response.type === 'opaque') {
              throw new Error(`Could not download ${url}`);
            }
            await cache.put(url, response);
            done += 1;
            await announce({ type: 'CACHE_PROGRESS', done, total: ASSETS.length });
          } catch (error) {
            failure = error;
          }
        }
      }
      // Wait for every in-flight download before deleting a failed cache.
      await Promise.all(Array.from({ length: Math.min(4, ASSETS.length) }, download));
      if (failure) throw failure;
      if (!(await complete(cache))) throw new Error('Offline cache is incomplete.');
    }
    await announce({ type: 'CACHE_READY' });
  } catch (error) {
    await caches.delete(CACHE_NAME).catch(() => {});
    await announce({ type: 'CACHE_ERROR' });
    throw error;
  }
}

function ensureCache() {
  if (!filling) filling = fillCache().finally(() => { filling = null; });
  return filling;
}

self.addEventListener('install', event => {
  event.waitUntil(ensureCache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (!(await complete(cache))) {
      await announce({ type: 'CACHE_ERROR' });
      throw new Error('Cannot activate an incomplete offline cache.');
    }
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
    await announce({ type: 'CACHE_READY' });
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'CHECK_READY') return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      if (await complete(cache)) await announce({ type: 'CACHE_READY' }, event.source);
      else await ensureCache();
    } catch {
      // Opening CacheStorage can fail before fillCache has a chance to report it.
      await announce({ type: 'CACHE_ERROR' }, event.source);
    }
  })());
});

async function rangedResponse(request, response) {
  const bytes = await response.arrayBuffer();
  const size = bytes.byteLength;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(request.headers.get('range').trim());
  const unsatisfiable = () => new Response(null, {
    status: 416,
    headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' }
  });
  if (!match || (!match[1] && !match[2]) || size === 0) return unsatisfiable();
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix < 1) return unsatisfiable();
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    const requestedEnd = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd)) return unsatisfiable();
    end = Math.min(requestedEnd, size - 1);
    if (start >= size || start > end) return unsatisfiable();
  }
  const headers = new Headers(response.headers);
  headers.delete('Content-Encoding');
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');
  return new Response(bytes.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(SCOPE)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return request.headers.has('range') ? rangedResponse(request, cached) : cached;
    try {
      return await fetch(request);
    } catch (error) {
      if (request.mode === 'navigate') {
        const index = await cache.match(INDEX_URL);
        if (index) return index;
      }
      throw error;
    }
  })());
});
