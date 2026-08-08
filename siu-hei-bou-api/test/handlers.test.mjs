import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handlers } from '../src/handlers.mjs';

const FRIEND = { id: 3, uid: 'u1', name: '阿明', colour: '#e8a0a0', threshold: 10, reward: '請食飯', archived: 0 };

test('getState returns db state', async () => {
  const db = { getState: async (uid) => ({ friends: [{ ...FRIEND, stamps: 4 }], openCards: [] }) };
  const res = await handlers.getState({ db, uid: 'u1' }, {});
  assert.equal(res.status, 200);
  assert.equal(res.body.friends[0].stamps, 4);
});

test('createFriend validates then inserts with defaults', async () => {
  let inserted;
  const db = { createFriend: async (uid, v) => { inserted = { uid, ...v }; return { id: 9, uid, ...v }; } };
  const res = await handlers.createFriend({ db, uid: 'u1' }, { body: { name: ' 阿明 ' } });
  assert.equal(res.status, 200);
  assert.deepEqual(inserted, { uid: 'u1', name: '阿明', colour: '#e8a0a0', threshold: 10, reward: '請食飯' });
  const bad = await handlers.createFriend({ db, uid: 'u1' }, { body: { name: '' } });
  assert.equal(bad.status, 400);
});

test('createGrudge checks friend ownership', async () => {
  const db = {
    getFriend: async (uid, id) => (id === 3 ? FRIEND : null),
    createGrudge: async (uid, v) => ({ id: 1, uid, ...v, card_id: null }),
  };
  const ok = await handlers.createGrudge({ db, uid: 'u1' },
    { body: { friend_id: 3, content: '遲到', severity: 2, occurred_at: '2026-08-08' } });
  assert.equal(ok.status, 200);
  const notMine = await handlers.createGrudge({ db, uid: 'u1' },
    { body: { friend_id: 7, content: '遲到', severity: 2, occurred_at: '2026-08-08' } });
  assert.equal(notMine.status, 404);
});

test('updateGrudge refuses claimed grudges', async () => {
  const db = { getGrudge: async () => ({ id: 5, uid: 'u1', card_id: 11 }) };
  const res = await handlers.updateGrudge({ db, uid: 'u1' }, { params: { id: '5' }, body: { content: '改字' } });
  assert.equal(res.status, 409);
  assert.equal(res.body.error, 'card-claimed');
});

test('openCard enforces threshold and claims grudges', async () => {
  const grudges = [{ severity: 3 }, { severity: 3 }, { severity: 3 }];
  let opened;
  const db = {
    getFriend: async () => FRIEND,
    listOpenGrudges: async () => grudges,
    openCard: async (uid, friend, token, total) => { opened = { token, total }; return { id: 20, share_token: token, stamp_total: total, status: 'open' }; },
  };
  const notYet = await handlers.openCard({ db, uid: 'u1' }, { body: { friend_id: 3 } });
  assert.equal(notYet.status, 409);
  assert.equal(notYet.body.error, 'threshold-not-met');
  grudges.push({ severity: 1 });  // now 10 stamps
  const res = await handlers.openCard({ db, uid: 'u1' }, { body: { friend_id: 3 } });
  assert.equal(res.status, 200);
  assert.match(opened.token, /^[A-Za-z0-9_-]{24}$/);
  assert.equal(opened.total, 10);
});

test('publicCard 404s on bad token and returns card on good token', async () => {
  const db = { getPublicCard: async (t) => (t === 'good' ? { card: { status: 'open' }, friendName: '阿明', grudges: [] } : null) };
  assert.equal((await handlers.publicCard({ db }, { params: { token: 'bad' } })).status, 404);
  assert.equal((await handlers.publicCard({ db }, { params: { token: 'good' } })).status, 200);
});

test('publicAck is one-way and idempotent', async () => {
  let calls = 0;
  const db = { ackCardByToken: async () => { calls += 1; return { status: 'acknowledged' }; } };
  const res = await handlers.publicAck({ db }, { params: { token: 'good' } });
  assert.equal(res.status, 200);
  assert.equal(calls, 1);
  const missing = await handlers.publicAck({ db: { ackCardByToken: async () => null } }, { params: { token: 'x' } });
  assert.equal(missing.status, 404);
});
