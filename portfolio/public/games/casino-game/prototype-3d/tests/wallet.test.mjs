import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/wallet.js');
const { wallet } = globalThis.CASINO;

beforeEach(() => wallet._reset());

test('starts at 100,000', () => assert.equal(wallet.balance, 100000));

test('debit reduces balance and notifies', () => {
  let seen = null;
  const off = wallet.onChange((b, d) => (seen = [b, d]));
  assert.equal(wallet.debit(1500), true);
  assert.equal(wallet.balance, 98500);
  assert.deepEqual(seen, [98500, -1500]);
  off();
});

test('debit refuses overdraft / zero / non-integers', () => {
  assert.equal(wallet.debit(100001), false);
  assert.equal(wallet.debit(0), false);
  assert.equal(wallet.debit(10.5), false);
  assert.equal(wallet.balance, 100000);
});

test('credit adds and allows zero (losing round)', () => {
  assert.equal(wallet.credit(0), true);
  assert.equal(wallet.credit(2500), true);
  assert.equal(wallet.balance, 102500);
  assert.equal(wallet.credit(-5), false);
});
