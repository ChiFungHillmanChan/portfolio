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
  const grudges = [{ id: 10, severity: 3 }, { id: 11, severity: 3 }, { id: 12, severity: 3 }];
  let opened;
  const db = {
    getFriend: async () => FRIEND,
    listOpenGrudges: async () => grudges,
    openCard: async (uid, friend, token, total, grudgeIds) => { opened = { token, total, grudgeIds }; return { id: 20, share_token: token, stamp_total: total, status: 'open' }; },
  };
  const notYet = await handlers.openCard({ db, uid: 'u1' }, { body: { friend_id: 3 } });
  assert.equal(notYet.status, 409);
  assert.equal(notYet.body.error, 'threshold-not-met');
  grudges.push({ id: 13, severity: 1 });  // now 10 stamps
  const res = await handlers.openCard({ db, uid: 'u1' }, { body: { friend_id: 3 } });
  assert.equal(res.status, 200);
  assert.match(opened.token, /^[A-Za-z0-9_-]{24}$/);
  assert.equal(opened.total, 10);
  assert.deepEqual(opened.grudgeIds, [10, 11, 12, 13]);
});

test('publicCard 404s on bad token and returns card on good token', async () => {
  const stubCard = { uid: 'u1', id: 20, friend_id: 3, share_token: 'tok', status: 'open', stamp_total: 10, reward: '請食飯', created_at: '2026-08-08' };
  const db = { getPublicCard: async (t) => (t === 'good' ? { card: stubCard, friendName: '阿明', grudges: [] } : null) };
  assert.equal((await handlers.publicCard({ db }, { params: { token: 'bad' } })).status, 404);
  const res = await handlers.publicCard({ db }, { params: { token: 'good' } });
  assert.equal(res.status, 200);
  assert.equal(res.body.card.status, 'open');
  assert.equal(res.body.card.stamp_total, 10);
  assert.equal(res.body.card.reward, '請食飯');
  assert.equal(res.body.card.created_at, '2026-08-08');
  assert.equal('uid' in res.body.card, false);
  assert.equal('id' in res.body.card, false);
  assert.equal('friend_id' in res.body.card, false);
  assert.equal('share_token' in res.body.card, false);
});

test('publicAck is one-way and idempotent', async () => {
  let calls = 0;
  const stubCard = { uid: 'u1', id: 20, friend_id: 3, share_token: 'tok', status: 'acknowledged', stamp_total: 10, reward: '請食飯', created_at: '2026-08-08' };
  const db = { ackCardByToken: async () => { calls += 1; return stubCard; } };
  const res = await handlers.publicAck({ db }, { params: { token: 'good' } });
  assert.equal(res.status, 200);
  assert.equal(calls, 1);
  assert.equal(res.body.status, 'acknowledged');
  assert.equal(res.body.stamp_total, 10);
  assert.equal(res.body.reward, '請食飯');
  assert.equal(res.body.created_at, '2026-08-08');
  assert.equal('uid' in res.body, false);
  assert.equal('id' in res.body, false);
  assert.equal('friend_id' in res.body, false);
  assert.equal('share_token' in res.body, false);
  const missing = await handlers.publicAck({ db: { ackCardByToken: async () => null } }, { params: { token: 'x' } });
  assert.equal(missing.status, 404);
});

const adminDb = (rows) => ({
  adminCountUsers: async (q) => rows.filter((r) => !q || r.email.includes(q) || (r.display_name || '').includes(q)).length,
  adminListUsers: async (limit, offset, q) =>
    rows.filter((r) => !q || r.email.includes(q) || (r.display_name || '').includes(q)).slice(offset, offset + limit),
});

test('adminUsers rejects everyone except the verified superadmin', async () => {
  const db = adminDb([{ display_name: 'A', email: 'a@x.com', created_at: '2026-08-08' }]);
  const superadminEmail = 'boss@x.com';

  const stranger = await handlers.adminUsers(
    { db, superadminEmail, user: { email: 'a@x.com', emailVerified: true } }, {});
  assert.equal(stranger.status, 403);

  const unverified = await handlers.adminUsers(
    { db, superadminEmail, user: { email: 'boss@x.com', emailVerified: false } }, {});
  assert.equal(unverified.status, 403);

  const noEnv = await handlers.adminUsers(
    { db, superadminEmail: '', user: { email: 'boss@x.com', emailVerified: true } }, {});
  assert.equal(noEnv.status, 403);

  const boss = await handlers.adminUsers(
    { db, superadminEmail, user: { email: 'boss@x.com', emailVerified: true } }, {});
  assert.equal(boss.status, 200);
  assert.equal(boss.body.total, 1);
  assert.deepEqual(boss.body.users[0], { name: 'A', email: 'a@x.com', created_at: '2026-08-08' });
});

test('adminUsers falls back to email when display_name is empty', async () => {
  const db = adminDb([{ display_name: '', email: 'b@x.com', created_at: '2026-08-08' }]);
  const res = await handlers.adminUsers(
    { db, superadminEmail: 'boss@x.com', user: { email: 'boss@x.com', emailVerified: true } }, {});
  assert.equal(res.body.users[0].name, null);
});

const BOSS = { superadminEmail: 'boss@x.com', user: { email: 'boss@x.com', emailVerified: true } };
const manyUsers = Array.from({ length: 45 }, (_, i) => (
  { display_name: `U${i}`, email: `u${i}@x.com`, created_at: '2026-08-08' }));

test('adminUsers pages 20 at a time and reports the full total', async () => {
  const db = adminDb(manyUsers);
  const p1 = await handlers.adminUsers({ db, ...BOSS }, { query: {} });
  assert.deepEqual(
    { total: p1.body.total, page: p1.body.page, pages: p1.body.pages, pageSize: p1.body.pageSize, n: p1.body.users.length },
    { total: 45, page: 1, pages: 3, pageSize: 20, n: 20 });
  assert.equal(p1.body.users[0].email, 'u0@x.com');

  const p3 = await handlers.adminUsers({ db, ...BOSS }, { query: { page: '3' } });
  assert.equal(p3.body.users.length, 5);
  assert.equal(p3.body.users[0].email, 'u40@x.com');
});

test('adminUsers clamps hostile paging params', async () => {
  const db = adminDb(manyUsers);
  const past = await handlers.adminUsers({ db, ...BOSS }, { query: { page: '999' } });
  assert.equal(past.body.page, 3);            // lands on the last page, not empty
  assert.equal(past.body.users.length, 5);

  const huge = await handlers.adminUsers({ db, ...BOSS }, { query: { page_size: '999999' } });
  assert.equal(huge.body.pageSize, 100);      // ceiling, not a table dump

  for (const bad of [{ page: '0' }, { page: '-4' }, { page: 'abc' }, { page_size: '0' }, { page_size: 'x' }]) {
    const res = await handlers.adminUsers({ db, ...BOSS }, { query: bad });
    assert.equal(res.body.page >= 1 && res.body.pageSize >= 1, true, JSON.stringify(bad));
  }
});

test('adminUsers search narrows both the page and the total', async () => {
  const db = adminDb(manyUsers);
  const res = await handlers.adminUsers({ db, ...BOSS }, { query: { q: '  U4  ' } });
  assert.equal(res.body.q, 'U4');             // trimmed before it reaches SQL
  assert.equal(res.body.total, 6);            // U4, U40..U44
  assert.equal(res.body.pages, 1);

  const none = await handlers.adminUsers({ db, ...BOSS }, { query: { q: 'nobody' } });
  assert.equal(none.body.total, 0);
  assert.deepEqual(none.body.users, []);
  assert.equal(none.body.pages, 1);           // never 0 — the UI renders "1 / 1"
});
