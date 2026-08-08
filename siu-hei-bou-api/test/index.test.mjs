import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchRoute, makeRateLimiter } from '../src/index.mjs';

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
