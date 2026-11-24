import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const origin = 'https://portfolio.example';
const workerSource = await readFile(new URL('../../portfolio/public/sw.js', import.meta.url), 'utf8');
const shell = '<main>Standard portfolio</main>';
const presentScript = '/static/js/main.53b11898.js';
const missingScript = '/static/js/2.0472380b.chunk.js';
const scriptBody = 'console.log("page script")';

function workerHarness() {
  const listeners = {};
  const buckets = new Map();
  let offline = false;
  let fetches = 0;
  const urlOf = request => typeof request === 'string' ? new URL(request, origin).href : request.url;
  const caches = {
    async keys() { return [...buckets.keys()]; },
    async delete(name) { return buckets.delete(name); },
    async match(request) {
      for (const bucket of buckets.values()) {
        const response = bucket.get(urlOf(request));
        if (response) return response.clone();
      }
    },
    async open(name) {
      if (!buckets.has(name)) buckets.set(name, new Map());
      const bucket = buckets.get(name);
      return {
        async match(request) { return bucket.get(urlOf(request))?.clone(); },
        async put(request, response) { bucket.set(urlOf(request), response.clone()); },
        async addAll(requests) { assert.equal(requests.length, 0); }
      };
    }
  };
  class ScopedRequest extends Request {
    constructor(input, options) {
      super(typeof input === 'string' ? new URL(input, origin) : input, options);
    }
  }
  vm.runInNewContext(workerSource, {
    self: {
      location: { origin },
      addEventListener(type, listener) { listeners[type] = listener; },
      async skipWaiting() {},
      clients: { async claim() {} }
    },
    caches, URL, Request: ScopedRequest,
    async fetch(request) {
      fetches += 1;
      if (offline) throw new Error('Offline');
      const { pathname } = new URL(urlOf(request));
      if (pathname === presentScript) return new Response(scriptBody, { headers: { 'Content-Type': 'application/javascript' } });
      // Like the real host, a file that does not exist is answered with the HTML shell and status 200.
      const body = pathname.startsWith('/room-viewer') ? '<canvas>Standalone room viewer</canvas>' : shell;
      return new Response(body, { headers: { 'Content-Type': 'text/html' } });
    }
  });
  return {
    caches, buckets,
    get fetches() { return fetches; },
    setOffline() { offline = true; },
    async dispatch(type, detail = {}) {
      const pending = [];
      let response;
      listeners[type]({
        ...detail,
        waitUntil(promise) { pending.push(promise); },
        respondWith(promise) { response = promise; }
      });
      await Promise.all(pending);
      return response && await response;
    },
    asset(pathname) {
      return this.dispatch('fetch', {
        request: { url: new URL(pathname, origin).href, method: 'GET', mode: 'no-cors', headers: new Headers() }
      });
    },
    navigate(pathname) {
      return this.dispatch('fetch', {
        request: { url: new URL(pathname, origin).href, method: 'GET', mode: 'navigate', headers: new Headers() }
      });
    }
  };
}

test('room viewer and game navigations bypass the SPA cache online and offline', async () => {
  const worker = workerHarness();
  await worker.dispatch('install');
  const fetches = worker.fetches;
  for (const pathname of ['/room-viewer', '/room-viewer/', '/room-viewer/index.html?embedded=1', '/games/connect4/index.html']) {
    assert.equal(await worker.navigate(pathname), undefined, `${pathname} must use its own document`);
  }
  assert.equal(worker.fetches, fetches, 'the shell worker must not fetch excluded documents');
  assert.equal(await (await worker.caches.match('/index.html')).text(), shell);
  worker.setOffline();
  assert.equal(await worker.navigate('/room-viewer/index.html'), undefined, 'never substitute the SPA shell inside its room iframe');
});

test('standard homepage and React room route retain the SPA fallback offline', async () => {
  const worker = workerHarness();
  await worker.dispatch('install');
  for (const pathname of ['/', '/room', '/room?from=home']) {
    assert.equal(await (await worker.navigate(pathname)).text(), shell);
  }
  worker.setOffline();
  for (const pathname of ['/', '/room']) {
    assert.equal(await (await worker.navigate(pathname)).text(), shell);
  }
});

test('activation replaces a contaminated v2 shell cache and preserves game caches', async () => {
  const worker = workerHarness();
  const oldShell = await worker.caches.open('portfolio-shell-v2');
  await oldShell.put('/index.html', new Response('<canvas>Incorrect old viewer cache</canvas>'));
  const game = await worker.caches.open('connect4-v1');
  await game.put('/games/connect4/index.html', new Response('Connect four'));
  await worker.dispatch('install');
  await worker.dispatch('activate');
  assert.equal(worker.buckets.has('portfolio-shell-v2'), false, 'the contaminated shell cache must be retired');
  assert.equal(await (await game.match('/games/connect4/index.html')).text(), 'Connect four');
  assert.equal(worker.buckets.has('connect4-v1'), true);
  worker.setOffline();
  assert.equal(await (await worker.navigate('/')).text(), shell);
});

test('a hashed script is cached after its first load', async () => {
  const worker = workerHarness();
  await worker.dispatch('install');
  assert.equal(await (await worker.asset(presentScript)).text(), scriptBody);
  await new Promise(resolve => setTimeout(resolve));
  worker.setOffline();
  assert.equal(await (await worker.asset(presentScript)).text(), scriptBody);
});

test('the HTML shell answered for a missing script is never cached under the script name', async () => {
  const worker = workerHarness();
  await worker.dispatch('install');
  const first = await worker.asset(missingScript);
  assert.match(first.headers.get('content-type'), /text\/html/, 'the page still receives what the host answered');
  await new Promise(resolve => setTimeout(resolve));
  assert.equal(await worker.caches.match(missingScript), undefined, 'cache-first would serve this HTML as the script forever');
  const fetches = worker.fetches;
  await worker.asset(missingScript);
  assert.equal(worker.fetches, fetches + 1, 'the next request must go back to the network');
});

test('activation retires a v3 shell cache that may hold HTML under a script name', async () => {
  const worker = workerHarness();
  const oldShell = await worker.caches.open('portfolio-shell-v3');
  await oldShell.put(missingScript, new Response(shell, { headers: { 'Content-Type': 'text/html' } }));
  await worker.dispatch('install');
  await worker.dispatch('activate');
  assert.equal(worker.buckets.has('portfolio-shell-v3'), false);
  assert.equal(await worker.caches.match(missingScript), undefined);
});
