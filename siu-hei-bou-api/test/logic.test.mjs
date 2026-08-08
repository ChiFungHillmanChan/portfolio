import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stampSum, canOpenCard, validateFriend, validateGrudge, genShareToken } from '../src/logic.mjs';

test('stampSum adds severities', () => {
  assert.equal(stampSum([]), 0);
  assert.equal(stampSum([{ severity: 1 }, { severity: 3 }, { severity: 2 }]), 6);
});

test('canOpenCard needs stamps >= threshold', () => {
  assert.equal(canOpenCard(9, 10), false);
  assert.equal(canOpenCard(10, 10), true);
  assert.equal(canOpenCard(15, 10), true);
});

test('validateFriend accepts minimal input and applies defaults', () => {
  const r = validateFriend({ name: '  阿明  ' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { name: '阿明', colour: '#e8a0a0', threshold: 10, reward: '請食飯' });
});

test('validateFriend rejects bad input', () => {
  assert.equal(validateFriend({ name: '' }).ok, false);
  assert.equal(validateFriend({ name: 'x'.repeat(31) }).ok, false);
  assert.equal(validateFriend({ name: 'ok', threshold: 0 }).ok, false);
  assert.equal(validateFriend({ name: 'ok', threshold: 101 }).ok, false);
  assert.equal(validateFriend({ name: 'ok', threshold: 5.5 }).ok, false);
  assert.equal(validateFriend({ name: 'ok', colour: 'red' }).ok, false);
  assert.equal(validateFriend({ name: 'ok', reward: 'x'.repeat(31) }).ok, false);
});

test('validateFriend partial mode only validates provided keys', () => {
  const r = validateFriend({ threshold: 12 }, { partial: true });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { threshold: 12 });
  assert.equal(validateFriend({}, { partial: true }).ok, false); // nothing to update
});

test('validateGrudge accepts full input', () => {
  const r = validateGrudge({ friend_id: 3, content: '遲到一個鐘', severity: 2, occurred_at: '2026-08-08' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { friend_id: 3, content: '遲到一個鐘', severity: 2, occurred_at: '2026-08-08' });
});

test('validateGrudge rejects bad input', () => {
  assert.equal(validateGrudge({ friend_id: 1, content: '', severity: 1, occurred_at: '2026-08-08' }).ok, false);
  assert.equal(validateGrudge({ friend_id: 1, content: 'x'.repeat(501), severity: 1, occurred_at: '2026-08-08' }).ok, false);
  assert.equal(validateGrudge({ friend_id: 1, content: 'ok', severity: 4, occurred_at: '2026-08-08' }).ok, false);
  assert.equal(validateGrudge({ friend_id: 1, content: 'ok', severity: 1, occurred_at: '08/08/2026' }).ok, false);
  assert.equal(validateGrudge({ friend_id: 1, content: 'ok', severity: 1, occurred_at: '2026-13-40' }).ok, false);
});

/* ---- client_id (offline idempotency key) ---- */

const CID = '3f2b7c10-4d5e-4a6b-8c9d-0e1f2a3b4c5d';
// uppercase hex, one digit short, trailing junk, leading space, no dashes, wrong type
const BAD_CIDS = [CID.toUpperCase(), CID.slice(0, -1), `${CID}0`, ` ${CID}`,
  CID.replace(/-/g, ''), '', 'not-a-uuid', 42, null, {}, []];

test('validateFriend takes an optional client_id', () => {
  const withId = validateFriend({ name: '阿明', client_id: CID });
  assert.equal(withId.ok, true);
  assert.deepEqual(withId.value, { name: '阿明', colour: '#e8a0a0', threshold: 10, reward: '請食飯', client_id: CID });

  // absent → unchanged behaviour, and no client_id key to write
  assert.equal('client_id' in validateFriend({ name: '阿明' }).value, false);

  for (const bad of BAD_CIDS) {
    assert.deepEqual(validateFriend({ name: '阿明', client_id: bad }),
      { ok: false, error: 'bad-request' }, `accepted ${JSON.stringify(bad)}`);
  }
});

test('validateGrudge takes an optional client_id', () => {
  const full = { friend_id: 3, content: '遲到一個鐘', severity: 2, occurred_at: '2026-08-08' };
  const withId = validateGrudge({ ...full, client_id: CID });
  assert.equal(withId.ok, true);
  assert.deepEqual(withId.value, { ...full, client_id: CID });

  assert.equal('client_id' in validateGrudge(full).value, false);

  for (const bad of BAD_CIDS) {
    assert.deepEqual(validateGrudge({ ...full, client_id: bad }),
      { ok: false, error: 'bad-request' }, `accepted ${JSON.stringify(bad)}`);
  }
});

test('partial mode validates client_id but never puts it in the patch', () => {
  // An UPDATE must not rewrite the idempotency key of a row that already has one.
  const f = validateFriend({ threshold: 12, client_id: CID }, { partial: true });
  assert.deepEqual(f.value, { threshold: 12 });
  const g = validateGrudge({ content: '改咗字', client_id: CID }, { partial: true });
  assert.deepEqual(g.value, { content: '改咗字' });

  // still rejected when malformed, rather than quietly ignored
  assert.equal(validateFriend({ threshold: 12, client_id: 'junk' }, { partial: true }).ok, false);
  assert.equal(validateGrudge({ content: 'x', client_id: 'junk' }, { partial: true }).ok, false);
});

test('genShareToken is 24 url-safe chars and unique', () => {
  const a = genShareToken();
  const b = genShareToken();
  assert.match(a, /^[A-Za-z0-9_-]{24}$/);
  assert.notEqual(a, b);
});
