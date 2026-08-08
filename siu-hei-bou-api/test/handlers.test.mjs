import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handlers } from '../src/handlers.mjs';
import { makeDb } from '../src/db.mjs';
import { makeSqliteD1 } from './helpers/d1-sqlite.mjs';

const FRIEND = { id: 3, uid: 'u1', name: '阿明', colour: '#e8a0a0', threshold: 10, reward: '請食飯', archived: 0 };

test('getState returns db state', async () => {
  const db = {
    getState: async () => ({ friends: [{ ...FRIEND, stamps: 4 }], openCards: [] }),
    listAllGrudges: async () => [],
    listAllCards: async () => [],
  };
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

/* ---- 書末 ·個人檔案 ---- */

test('getMe returns the profile and the three counts', async () => {
  const db = {
    getMe: async (uid) => {
      assert.equal(uid, 'u1');
      return {
        user: { email: 'a@x.com', display_name: '阿明', created_at: '2026-08-08 10:00:00' },
        counts: { friends: 3, grudges: 12, cards: 2 },
      };
    },
  };
  const res = await handlers.getMe({ db, uid: 'u1', user: { email: 'a@x.com' } }, {});
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, {
    email: 'a@x.com',
    name: '阿明',
    created_at: '2026-08-08 10:00:00',
    counts: { friends: 3, grudges: 12, cards: 2 },
  });
});

test('getMe falls back to the verified token when the users row is missing', async () => {
  const db = { getMe: async () => ({ user: null, counts: null }) };
  const res = await handlers.getMe(
    { db, uid: 'u1', user: { email: 'tok@x.com', name: '阿token' } }, {});
  assert.equal(res.status, 200);
  assert.equal(res.body.email, 'tok@x.com');
  assert.equal(res.body.name, '阿token');
  assert.equal(res.body.created_at, null);
  assert.deepEqual(res.body.counts, { friends: 0, grudges: 0, cards: 0 });
});

test('deleteMe wipes only the caller uid', async () => {
  const wiped = [];
  const db = { deleteMe: async (uid) => { wiped.push(uid); } };
  const res = await handlers.deleteMe({ db, uid: 'u1' }, {});
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { deleted: true });
  assert.deepEqual(wiped, ['u1']);   // never a uid from the request body
});

test('deleteMe ignores any uid the client tries to smuggle in', async () => {
  let seen = null;
  const db = { deleteMe: async (uid) => { seen = uid; } };
  await handlers.deleteMe({ db, uid: 'u1' }, { body: { uid: 'victim' }, params: { uid: 'victim' } });
  assert.equal(seen, 'u1');
});

/* ---- offline sync: real SQL against real schema.sql ----
   These run the actual statements from db.mjs through node:sqlite. The
   idempotency guarantee lives inside an ON CONFLICT clause, so a stub db would
   only ever prove the stub. */

const CID  = '3f2b7c10-4d5e-4a6b-8c9d-0e1f2a3b4c5d';
const CID2 = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const GRUDGE = (friendId, extra = {}) =>
  ({ friend_id: friendId, content: '遲到一個鐘', severity: 2, occurred_at: '2026-08-08', ...extra });

// A book with one 罪人 and whatever grudges the caller asks for.
async function seedBook(uid = 'u1', friendBody = { name: '阿明' }) {
  const db = makeDb(makeSqliteD1());
  const friend = await handlers.createFriend({ db, uid }, { body: friendBody });
  return { db, uid, friend: friend.body };
}

test('the same client_id twice writes one grudge and returns the same id', async () => {
  const { db, uid, friend } = await seedBook();
  const body = GRUDGE(friend.id, { client_id: CID });

  const first = await handlers.createGrudge({ db, uid }, { body });
  const retry = await handlers.createGrudge({ db, uid }, { body });

  assert.equal(first.status, 200);
  assert.equal(retry.status, 200);
  assert.equal(retry.body.id, first.body.id);        // the retry gets the existing row back...
  assert.equal(retry.body.client_id, CID);
  const rows = await db.listAllGrudges(uid);
  assert.equal(rows.length, 1);                      // ...and did not write a second one
});

test('a retry returns server truth, not the body it replayed', async () => {
  // The outbox re-sends the payload it queued. If the other device has since
  // edited the row, the retry must not quietly stamp the stale text back on.
  const { db, uid, friend } = await seedBook();
  const first = await handlers.createGrudge({ db, uid }, { body: GRUDGE(friend.id, { client_id: CID }) });
  await handlers.updateGrudge({ db, uid }, { params: { id: String(first.body.id) }, body: { content: '改咗字' } });

  const retry = await handlers.createGrudge({ db, uid }, { body: GRUDGE(friend.id, { client_id: CID }) });
  assert.equal(retry.body.content, '改咗字');
  assert.equal((await db.listAllGrudges(uid)).length, 1);
});

test('the same client_id twice writes one friend and returns the same id', async () => {
  const db = makeDb(makeSqliteD1());
  const first = await handlers.createFriend({ db, uid: 'u1' }, { body: { name: '阿明', client_id: CID } });
  const retry = await handlers.createFriend({ db, uid: 'u1' }, { body: { name: '阿明', client_id: CID } });
  assert.equal(retry.body.id, first.body.id);
  const state = await handlers.getState({ db, uid: 'u1' }, {});
  assert.equal(state.body.friends.length, 1);
});

test('client_id dedup is per uid and never collapses rows without one', async () => {
  const d1 = makeSqliteD1();
  const db = makeDb(d1);
  const mine = await handlers.createFriend({ db, uid: 'u1' }, { body: { name: '阿明' } });
  const theirs = await handlers.createFriend({ db, uid: 'u2' }, { body: { name: '阿明' } });

  // two different keys → two rows
  await handlers.createGrudge({ db, uid: 'u1' }, { body: GRUDGE(mine.body.id, { client_id: CID }) });
  await handlers.createGrudge({ db, uid: 'u1' }, { body: GRUDGE(mine.body.id, { client_id: CID2 }) });
  // an old client sending none at all → still a new row every time
  await handlers.createGrudge({ db, uid: 'u1' }, { body: GRUDGE(mine.body.id) });
  await handlers.createGrudge({ db, uid: 'u1' }, { body: GRUDGE(mine.body.id) });
  assert.equal((await db.listAllGrudges('u1')).length, 4);

  // another account reusing the identical key is a different row, not a collision
  const other = await handlers.createGrudge({ db, uid: 'u2' }, { body: GRUDGE(theirs.body.id, { client_id: CID }) });
  assert.equal(other.status, 200);
  assert.equal((await db.listAllGrudges('u2')).length, 1);
  assert.equal((await db.listAllGrudges('u1')).length, 4);
});

test('a claimed grudge still 409s, and the card claimed only what the server knew', async () => {
  const { db, uid, friend } = await seedBook('u1', { name: '阿明', threshold: 4 });
  const claimed = await handlers.createGrudge({ db, uid }, { body: GRUDGE(friend.id, { severity: 3, client_id: CID }) });
  await handlers.createGrudge({ db, uid }, { body: GRUDGE(friend.id, { severity: 1, client_id: CID2 }) });

  const card = await handlers.openCard({ db, uid }, { body: { friend_id: friend.id } });
  assert.equal(card.status, 200);
  assert.equal(card.body.stamp_total, 4);

  const id = String(claimed.body.id);
  const edit = await handlers.updateGrudge({ db, uid }, { params: { id }, body: { content: '改咗字' } });
  assert.equal(edit.status, 409);
  assert.equal(edit.body.error, 'card-claimed');
  const del = await handlers.deleteGrudge({ db, uid }, { params: { id } });
  assert.equal(del.status, 409);
  assert.equal(del.body.error, 'card-claimed');

  // a grudge that lands after the card counts toward the NEXT one (spec §7 #2)
  const late = await handlers.createGrudge({ db, uid }, { body: GRUDGE(friend.id, { severity: 2 }) });
  assert.equal(late.body.card_id, null);
  const state = await handlers.getState({ db, uid }, {});
  assert.equal(state.body.friends[0].stamps, 2);
});

test('getState returns the whole book and keeps friends/openCards shape', async () => {
  const { db, uid, friend } = await seedBook('u1', { name: '阿明', threshold: 4 });
  await handlers.createGrudge({ db, uid }, { body: GRUDGE(friend.id, { severity: 3, occurred_at: '2026-08-01' }) });
  await handlers.createGrudge({ db, uid }, { body: GRUDGE(friend.id, { severity: 1, occurred_at: '2026-08-02' }) });
  await handlers.openCard({ db, uid }, { body: { friend_id: friend.id } });
  await handlers.createGrudge({ db, uid }, { body: GRUDGE(friend.id, { severity: 2, occurred_at: '2026-08-09' }) });

  const res = await handlers.getState({ db, uid }, {});
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(res.body).sort(), ['cards', 'friends', 'grudges', 'openCards']);

  // friends: every field the deployed frontend already reads, plus stamps
  const f = { ...res.body.friends[0] };
  assert.equal(f.id, friend.id);
  assert.equal(f.uid, uid);
  assert.equal(f.name, '阿明');
  assert.equal(f.colour, '#e8a0a0');
  assert.equal(f.threshold, 4);
  assert.equal(f.reward, '請食飯');
  assert.equal(f.archived, 0);
  assert.equal(typeof f.created_at, 'string');
  assert.equal(f.stamps, 2);                       // only the unclaimed grudge

  // openCards: still the whole card row, incl. the share token the UI links to
  assert.equal(res.body.openCards.length, 1);
  const card = { ...res.body.openCards[0] };
  assert.equal(card.status, 'open');
  assert.equal(card.stamp_total, 4);
  assert.match(card.share_token, /^[A-Za-z0-9_-]{24}$/);

  // new: the whole book, so every chapter reads offline
  assert.equal(res.body.grudges.length, 3);
  assert.deepEqual(res.body.grudges.map((g) => g.occurred_at), ['2026-08-09', '2026-08-02', '2026-08-01']);
  assert.equal(res.body.cards.length, 1);
  assert.equal(res.body.cards[0].id, card.id);
});

// The flusher's crash recovery rebuilds its clientId -> server id map by matching
// client_id on the rows /api/state returned, so that column MUST survive the
// response. Nothing else forces it to: it rides along on `SELECT *`, and the day
// someone field-projects these rows the offline path degrades silently — every
// create that had already landed gets buried into 未寄出 instead of resolving.
// The client fails safe rather than duplicating (sync.test.js pins that end), but
// this is where the guarantee actually lives.
test('getState keeps client_id on friends and grudges', async () => {
  const db = makeDb(makeSqliteD1());
  const uid = 'u1';
  const friend = await handlers.createFriend({ db, uid }, { body: { name: '阿明', client_id: CID } });
  await handlers.createGrudge({ db, uid }, { body: GRUDGE(friend.body.id, { client_id: CID2 }) });

  const res = await handlers.getState({ db, uid }, {});
  assert.equal(res.body.friends[0].client_id, CID);
  assert.equal(res.body.grudges[0].client_id, CID2);
});

test('getState never reaches another uid book', async () => {
  const d1 = makeSqliteD1();
  const db = makeDb(d1);
  const theirs = await handlers.createFriend({ db, uid: 'u2' }, { body: { name: '阿強' } });
  await handlers.createGrudge({ db, uid: 'u2' }, { body: GRUDGE(theirs.body.id) });

  const res = await handlers.getState({ db, uid: 'u1' }, {});
  assert.deepEqual(res.body, { friends: [], openCards: [], grudges: [], cards: [] });
});
