import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import worker, { matchRoute, makeRateLimiter } from '../src/index.mjs';
import { makeDb } from '../src/db.mjs';
import { makeSqliteD1 } from './helpers/d1-sqlite.mjs';

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
  // if-none-match must be allowed or the conditional GET dies at the preflight,
  // and ETag must be exposed or JS cross-origin cannot read it back.
  assert.equal(pre.headers.get('Access-Control-Allow-Headers'), 'content-type,authorization,if-none-match');
  assert.equal(pre.headers.get('Access-Control-Expose-Headers'), 'ETag');
});

/* ---- GET /api/state ETag round-trip ----
   Goes through the real auth path: index.mjs calls verifyFirebaseToken with its
   own defaults, so the test mints an RS256 token with a throwaway key pair and
   stubs the JWKS fetch, rather than putting a bypass seam in production code. */

const PROJECT = 'system-design-c84d3';
const ORIGIN = 'https://siu-hei-bou.hillmanchan.com';
const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

let token;

before(async () => {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify'],
  );
  const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const jwks = { keys: [{ ...jwk, kid: 'test-kid', alg: 'RS256', use: 'sig' }] };
  globalThis.fetch = async () => new Response(JSON.stringify(jwks), { headers: { 'content-type': 'application/json' } });

  const nowSec = Math.floor(Date.now() / 1000);
  const signingInput = `${enc({ alg: 'RS256', kid: 'test-kid', typ: 'JWT' })}.${enc({
    iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT,
    sub: 'uid-123', email: 'a@b.com', name: '阿明', email_verified: true,
    iat: nowSec - 10, exp: nowSec + 3600,
  })}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyPair.privateKey, new TextEncoder().encode(signingInput));
  token = `${signingInput}.${Buffer.from(sig).toString('base64url')}`;
});

const getState = (env, headers = {}) => worker.fetch(new Request('https://api.test/api/state', {
  headers: { authorization: `Bearer ${token}`, origin: ORIGIN, ...headers },
}), env);

test('GET /api/state carries an ETag and answers If-None-Match with a bodyless 304', async () => {
  const env = { DB: makeSqliteD1() };

  const fresh = await getState(env);
  assert.equal(fresh.status, 200);
  const etag = fresh.headers.get('etag');
  assert.match(etag, /^"[0-9a-f]{64}"$/);
  assert.equal(fresh.headers.get('cache-control'), 'no-store');
  assert.deepEqual(Object.keys(await fresh.json()).sort(), ['cards', 'friends', 'grudges', 'openCards']);

  const unchanged = await getState(env, { 'if-none-match': etag });
  assert.equal(unchanged.status, 304);
  assert.equal(await unchanged.text(), '');                       // 304 carries no body
  assert.equal(unchanged.headers.get('etag'), etag);
  assert.equal(unchanged.headers.get('cache-control'), 'no-store');
  // without these the browser hides the 304 from JS and the pull silently fails
  assert.equal(unchanged.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.equal(unchanged.headers.get('Access-Control-Expose-Headers'), 'ETag');

  // a stale etag is not a 304
  const stale = await getState(env, { 'if-none-match': '"deadbeef"' });
  assert.equal(stale.status, 200);
});

test('the ETag follows the content, not the request', async () => {
  const env = { DB: makeSqliteD1() };
  const before1 = (await getState(env)).headers.get('etag');

  await makeDb(env.DB).createFriend('uid-123', { name: '阿明', colour: '#e8a0a0', threshold: 10, reward: '請食飯' });

  const after = await getState(env, { 'if-none-match': before1 });
  assert.equal(after.status, 200);                                 // book changed → full body
  assert.notEqual(after.headers.get('etag'), before1);
  assert.equal((await after.json()).friends.length, 1);
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
