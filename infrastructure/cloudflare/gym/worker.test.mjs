import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './worker.mjs';

test('serves the gym index from S3 without forwarding credentials or S3 query parameters', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(String(url), 'https://hillmanportfolio1.s3.eu-west-2.amazonaws.com/gym/index.html');
    assert.equal(options.headers.get('authorization'), null);
    assert.equal(options.headers.get('cookie'), null);
    return new Response('<h1>Gym</h1>', { headers: { 'content-type': 'text/html' } });
  });
  const response = await worker.fetch(new Request('https://gym.hillmanchan.com/?acl', {
    headers: { authorization: 'Bearer client-session', cookie: 'session=client-session' },
  }));
  assert.equal(await response.text(), '<h1>Gym</h1>');
  assert.equal(response.headers.get('cache-control'), 'no-cache');
});

test('serves executable modules and service worker updates with usable MIME and revalidation', async (t) => {
  const paths = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    paths.push(new URL(url).pathname);
    return new Response('export {};', { headers: { 'content-type': 'application/octet-stream' } });
  });
  for (const path of ['app.mjs', 'sw.js', 'precache.js']) {
    const response = await worker.fetch(new Request(`https://gym.hillmanchan.com/${path}?v=2`));
    assert.equal(response.headers.get('content-type'), 'application/javascript; charset=utf-8');
    assert.equal(response.headers.get('cache-control'), 'no-cache');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
  assert.deepEqual(paths, ['/gym/app.mjs', '/gym/sw.js', '/gym/precache.js']);
});

test('preserves range requests and image bytes for efficient media loading', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(String(url), 'https://hillmanportfolio1.s3.eu-west-2.amazonaws.com/gym/media/demo.webp');
    assert.equal(options.headers.get('range'), 'bytes=0-3');
    return new Response(new Uint8Array([1, 2, 3, 4]), {
      status: 206,
      headers: { 'content-type': 'image/webp', 'content-range': 'bytes 0-3/10' },
    });
  });
  const response = await worker.fetch(new Request('https://gym.hillmanchan.com/media/demo.webp', {
    headers: { range: 'bytes=0-3' },
  }));
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 0-3/10');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=86400');
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [1, 2, 3, 4]);
});

test('missing assets stay 404 and are not cached as an application shell', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<Error>NoSuchKey</Error>', { status: 404 }));
  const response = await worker.fetch(new Request('https://gym.hillmanchan.com/missing.mjs'));
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(await response.text(), 'Not found');
});

test('does not send writes or encoded traversal requests to the shared S3 bucket', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => assert.fail('Unexpected request to S3'));
  const write = await worker.fetch(new Request('https://gym.hillmanchan.com/app.mjs', { method: 'POST' }));
  assert.equal(write.status, 405);
  assert.equal(write.headers.get('allow'), 'GET, HEAD');
  const traversal = await worker.fetch(new Request('https://gym.hillmanchan.com/%2e%2e%2findex.html'));
  assert.equal(traversal.status, 400);
});

test('HEAD requests preserve response metadata without a body', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.method, 'HEAD');
    return new Response(null, { headers: { 'content-length': '200', etag: '"release"' } });
  });
  const response = await worker.fetch(new Request('https://gym.hillmanchan.com/manifest.webmanifest', { method: 'HEAD' }));
  assert.equal(response.headers.get('content-type'), 'application/manifest+json; charset=utf-8');
  assert.equal(response.headers.get('etag'), '"release"');
  assert.equal(await response.text(), '');
});
