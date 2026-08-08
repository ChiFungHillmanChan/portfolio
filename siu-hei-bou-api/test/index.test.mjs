import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { matchRoute, makeRateLimiter } from '../src/index.mjs';

test('matchRoute maps every API route', () => {
  assert.deepEqual(matchRoute('GET', '/api/state'), { name: 'getState', params: {}, public: false });
  assert.deepEqual(matchRoute('POST', '/api/friends'), { name: 'createFriend', params: {}, public: false });
  assert.deepEqual(matchRoute('PATCH', '/api/friends/7'), { name: 'updateFriend', params: { id: '7' }, public: false });
  assert.deepEqual(matchRoute('DELETE', '/api/friends/7'), { name: 'deleteFriend', params: { id: '7' }, public: false });
  assert.deepEqual(matchRoute('GET', '/api/grudges'), { name: 'listGrudges', params: {}, public: false });
  assert.deepEqual(matchRoute('POST', '/api/grudges'), { name: 'createGrudge', params: {}, public: false });
  assert.deepEqual(matchRoute('PATCH', '/api/grudges/5'), { name: 'updateGrudge', params: { id: '5' }, public: false });
  assert.deepEqual(matchRoute('DELETE', '/api/grudges/5'), { name: 'deleteGrudge', params: { id: '5' }, public: false });
  assert.deepEqual(matchRoute('POST', '/api/cards'), { name: 'openCard', params: {}, public: false });
  assert.deepEqual(matchRoute('POST', '/api/cards/2/settle'), { name: 'settleCard', params: { id: '2' }, public: false });
  assert.deepEqual(matchRoute('GET', '/api/cards'), { name: 'listCards', params: {}, public: false });
  assert.deepEqual(matchRoute('GET', '/api/me'), { name: 'getMe', params: {}, public: false });
  assert.deepEqual(matchRoute('DELETE', '/api/me'), { name: 'deleteMe', params: {}, public: false });
  assert.deepEqual(matchRoute('GET', '/public/cards/abc123'), { name: 'publicCard', params: { token: 'abc123' }, public: true });
  assert.deepEqual(matchRoute('POST', '/public/cards/abc123/ack'), { name: 'publicAck', params: { token: 'abc123' }, public: true });
  assert.equal(matchRoute('GET', '/nope'), null);
  assert.equal(matchRoute('PUT', '/api/friends/7'), null);
});

// Nothing this API returns may sit in a shared cache. The unauthenticated error
// paths matter as much as the authenticated ones: Cloudflare's "skip cache when
// Authorization is present" rule does not cover them, and a stale 404 for a
// not-yet-deployed route was observed being served from the edge.
const call = (method, path, headers = {}) => worker.fetch(
  new Request(`https://api.test${path}`, { method, headers }), {},
);

test('every response carries Cache-Control: no-store', async () => {
  const notFound = await call('GET', '/api/nope');
  assert.equal(notFound.status, 404);
  assert.equal(notFound.headers.get('cache-control'), 'no-store');

  // 401 path: an empty/malformed token is rejected before any network call
  const unauth = await call('GET', '/api/me');
  assert.equal(unauth.status, 401);
  assert.equal(unauth.headers.get('cache-control'), 'no-store');

  const badToken = await call('DELETE', '/api/me', { authorization: 'Bearer not.a.token' });
  assert.equal(badToken.status, 401);
  assert.equal(badToken.headers.get('cache-control'), 'no-store');
});

test('CORS preflight keeps its max-age and stays uncached-by-content', async () => {
  const pre = await call('OPTIONS', '/api/me');
  assert.equal(pre.status, 204);
  // browser preflight cache is not a shared cache, and carries no body
  assert.equal(pre.headers.get('Access-Control-Max-Age'), '86400');
  assert.equal(pre.headers.get('Access-Control-Allow-Headers'), 'content-type,authorization');
});

test('rate limiter allows N per window then blocks, per IP', () => {
  let t = 0;
  const allow = makeRateLimiter(3, 60_000, () => t);
  assert.equal(allow('1.1.1.1'), true);
  assert.equal(allow('1.1.1.1'), true);
  assert.equal(allow('1.1.1.1'), true);
  assert.equal(allow('1.1.1.1'), false);
  assert.equal(allow('2.2.2.2'), true);   // different IP unaffected
  t = 61_000;
  assert.equal(allow('1.1.1.1'), true);   // window rolled over
});
