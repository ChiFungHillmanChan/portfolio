import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { prepareGym } from '../prepare-gym.mjs';

const scope = 'https://example.test/gym/';
const workerSource = await readFile(new URL('../../portfolio/public/gym/sw.js', import.meta.url), 'utf8');

function workerHarness({ assets = ['./index.html', './app.mjs', './media/demo.mp4'], fetcher } = {}) {
  const listeners = {};
  const buckets = new Map();
  const messages = [];
  let fetches = 0;
  const urlOf = input => typeof input === 'string' ? new URL(input, scope).href : input.url;
  const caches = {
    async keys() { return [...buckets.keys()]; },
    async delete(name) { return buckets.delete(name); },
    async open(name) {
      if (!buckets.has(name)) buckets.set(name, new Map());
      const bucket = buckets.get(name);
      return {
        async keys() { return [...bucket.keys()].map(url => new Request(url)); },
        async match(request) { return bucket.get(urlOf(request))?.clone(); },
        async put(request, response) { bucket.set(urlOf(request), response.clone()); }
      };
    }
  };
  const client = { url: scope, postMessage(message) { messages.push(JSON.parse(JSON.stringify(message))); } };
  const self = {
    GYM_VERSION: 'test-version', GYM_ASSETS: assets,
    registration: { scope },
    addEventListener(type, callback) { listeners[type] = callback; },
    async skipWaiting() {},
    clients: { async matchAll() { return [client]; }, async claim() {} }
  };
  vm.runInNewContext(workerSource, {
    self, caches, URL, Request, Response, Headers, console,
    importScripts() {},
    async fetch(request) {
      fetches += 1;
      return fetcher ? fetcher(request) : new Response(urlOf(request).endsWith('.mp4') ? '0123456789' : 'app shell', {
        headers: { 'Content-Type': urlOf(request).endsWith('.mp4') ? 'video/mp4' : 'text/html' }
      });
    }
  });
  return {
    caches, buckets, messages, client,
    get fetches() { return fetches; },
    async dispatch(type, detail = {}) {
      assert.equal(typeof listeners[type], 'function', `The worker must handle ${type}`);
      const work = [];
      let response;
      listeners[type]({ ...detail, waitUntil(promise) { work.push(promise); }, respondWith(promise) { response = promise; } });
      await Promise.all(work);
      return response && await response;
    }
  };
}

test('install caches every asset with bounded parallel downloads before announcing ready', async () => {
  let active = 0;
  let peak = 0;
  const assets = Array.from({ length: 9 }, (_, index) => `./asset-${index}.txt`);
  const worker = workerHarness({
    assets,
    async fetcher() {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 3));
      active -= 1;
      return new Response('asset');
    }
  });
  await worker.dispatch('install');
  assert.equal(peak, 4);
  assert.equal(worker.fetches, 9);
  assert.equal([...worker.buckets.values()][0].size, 9);
  assert.deepEqual(worker.messages.at(-1), { type: 'CACHE_READY' });
  assert.ok(worker.messages.some(message => message.type === 'CACHE_PROGRESS' && message.done === 9 && message.total === 9));
});

test('one failed asset rejects installation and removes the incomplete cache', async () => {
  const worker = workerHarness({ fetcher(request) {
    return new Response('asset', { status: request.url.endsWith('app.mjs') ? 503 : 200 });
  } });
  await assert.rejects(worker.dispatch('install'));
  assert.equal(worker.buckets.size, 0);
  assert.equal(worker.messages.some(message => message.type === 'CACHE_READY'), false);
  assert.equal(worker.messages.at(-1).type, 'CACHE_ERROR');
});

test('CHECK_READY inspects every expected cache key and repairs evicted assets', async () => {
  const worker = workerHarness();
  await worker.dispatch('install');
  worker.messages.length = 0;
  const bucket = [...worker.buckets.values()][0];
  bucket.delete(`${scope}media/demo.mp4`);
  await worker.dispatch('message', { data: { type: 'CHECK_READY' }, source: worker.client });
  assert.ok(worker.fetches > 3);
  assert.equal([...worker.buckets.values()][0].size, 3);
  assert.equal(worker.messages.at(-1).type, 'CACHE_READY');
  const fetches = worker.fetches;
  await worker.dispatch('message', { data: { type: 'CHECK_READY' }, source: worker.client });
  assert.equal(worker.fetches, fetches);
});

test('CHECK_READY never reports an incomplete cache ready when repair fails', async () => {
  let offline = false;
  const worker = workerHarness({ fetcher() {
    if (offline) throw new Error('Offline');
    return new Response('asset');
  } });
  await worker.dispatch('install');
  offline = true;
  [...worker.buckets.values()][0].delete(`${scope}app.mjs`);
  worker.messages.length = 0;
  await worker.dispatch('message', { data: { type: 'CHECK_READY' }, source: worker.client });
  assert.equal(worker.messages.some(message => message.type === 'CACHE_READY'), false);
  assert.equal(worker.messages.at(-1).type, 'CACHE_ERROR');
});

test('cache-access denial reports an error even when cache cleanup is also denied', async () => {
  const worker = workerHarness();
  worker.caches.open = async () => { throw new Error('Access denied'); };
  worker.caches.delete = async () => { throw new Error('Access denied'); };
  await assert.rejects(worker.dispatch('install'));
  assert.equal(worker.messages.at(-1)?.type, 'CACHE_ERROR');
  worker.messages.length = 0;
  await worker.dispatch('message', { data: { type: 'CHECK_READY' }, source: worker.client });
  assert.equal(worker.messages.at(-1)?.type, 'CACHE_ERROR');
});

test('activation removes only old caches owned by this gym scope', async () => {
  const worker = workerHarness();
  await worker.dispatch('install');
  const current = [...worker.buckets.keys()][0];
  const old = current.slice(0, current.lastIndexOf(':') + 1) + 'previous';
  await worker.caches.open(old);
  await worker.caches.open('other-app-cache');
  await worker.caches.open(`gym-offline:${encodeURIComponent('https://example.test/another-gym/')}:previous`);
  await worker.dispatch('activate');
  assert.equal(worker.buckets.has(old), false);
  assert.equal(worker.buckets.has(current), true);
  assert.equal(worker.buckets.has('other-app-cache'), true);
  assert.equal(worker.buckets.size, 3);
});

test('cached MP4 responses support bounded, open, and suffix byte ranges offline', async () => {
  const worker = workerHarness();
  await worker.dispatch('install');
  for (const [range, body, contentRange] of [
    ['bytes=2-5', '2345', 'bytes 2-5/10'],
    ['bytes=7-', '789', 'bytes 7-9/10'],
    ['bytes=-3', '789', 'bytes 7-9/10'],
    ['bytes=8-100', '89', 'bytes 8-9/10']
  ]) {
    const response = await worker.dispatch('fetch', { request: new Request(`${scope}media/demo.mp4`, { headers: { Range: range } }) });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('Content-Range'), contentRange);
    assert.equal(response.headers.get('Content-Length'), String(body.length));
    assert.equal(response.headers.get('Content-Type'), 'video/mp4');
    assert.equal(await response.text(), body);
  }
  assert.equal(worker.fetches, 3);
});

test('invalid, multiple, and unsatisfiable ranges return 416 without a network request', async () => {
  const worker = workerHarness();
  await worker.dispatch('install');
  for (const range of ['bytes=10-', 'bytes=5-2', 'bytes=-0', 'bytes=0-1,4-5', 'items=0-2', 'bytes=-', 'bytes=9007199254740992-']) {
    const response = await worker.dispatch('fetch', { request: new Request(`${scope}media/demo.mp4`, { headers: { Range: range } }) });
    assert.equal(response.status, 416, range);
    assert.equal(response.headers.get('Content-Range'), 'bytes */10');
  }
  assert.equal(worker.fetches, 3);
});

test('offline navigation falls back to the cached app index', async () => {
  let offline = false;
  const worker = workerHarness({ fetcher() {
    if (offline) throw new Error('Offline');
    return new Response('cached app');
  } });
  await worker.dispatch('install');
  offline = true;
  const response = await worker.dispatch('fetch', {
    request: { url: `${scope}?day=2026-09-18`, method: 'GET', mode: 'navigate', headers: new Headers() }
  });
  assert.equal(await response.text(), 'cached app');
});

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'gym-offline-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'media'));
  await mkdir(path.join(root, '.hidden'));
  for (const [name, contents] of Object.entries({
    'index.html': '<main>Gym</main>', 'app.mjs': '// app', 'styles.css': 'body {}',
    'store.mjs': '// store', 'manifest.webmanifest': '{}', 'sw.js': '// worker',
    'data.mjs': 'export const EXERCISES = [{media:"media/demo.mp4",poster:"media/demo.jpg"}];',
    'media/demo.mp4': 'video', 'media/demo.jpg': 'poster', 'media-credits.md': 'Credit',
    '.hidden/private.txt': 'hidden', 'ignored.test.js': '// test'
  })) await writeFile(path.join(root, name), contents);
  return root;
}

test('preparation includes every local asset and produces a stable content version', async t => {
  const root = await fixture(t);
  const first = await prepareGym(root);
  assert.ok(first.assets.includes('./media/demo.mp4'));
  assert.ok(first.assets.includes('./media-credits.md'));
  assert.equal(first.assets.some(asset => /hidden|\.test\.|sw\.js|precache\.js/.test(asset)), false);
  assert.deepEqual(await prepareGym(root), first);
  await writeFile(path.join(root, 'sw.js'), '// worker changed');
  assert.notEqual((await prepareGym(root)).version, first.version);
  const context = { self: {} };
  vm.runInNewContext(await readFile(path.join(root, 'precache.js'), 'utf8'), context);
  assert.equal(context.self.GYM_ASSETS.length, first.assets.length);
  assert.equal(typeof context.self.GYM_VERSION, 'string');
});

test('preparation rejects missing, remote, and escaped media references before writing', async t => {
  const root = await fixture(t);
  for (const field of ['media', 'poster', 'gif']) {
    for (const media of ['media/missing.mp4', 'https://example.com/demo.mp4', '../demo.mp4']) {
      await writeFile(path.join(root, 'data.mjs'), `export const EXERCISES = [{${field}:${JSON.stringify(media)}}];`);
      await assert.rejects(prepareGym(root), /media|local|missing|outside/i);
    }
  }
  await assert.rejects(readFile(path.join(root, 'precache.js')));
  await writeFile(path.join(root, 'data.mjs'), 'export const EXERCISES = [{id:"in-progress",media:"",poster:""}];');
  assert.ok((await prepareGym(root)).assets.length > 0);
});
