import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/wallet.js');
await import('../src/logic/tables.js');
const { wallet, validate, tables } = globalThis.CASINO;

beforeEach(() => wallet._reset());

test('limits match the spec', () => {
  assert.deepEqual(tables.roulette, { minPerSpot: 100, maxPerSpot: 5000, maxTotal: 20000 });
  assert.deepEqual(tables.blackjack, { main: { min: 500, max: 10000 }, side: { min: 100, max: 2500 } });
  assert.deepEqual(tables.baccarat, { main: { min: 500, max: 10000 }, side: { min: 100, max: 1000 } });
  assert.deepEqual(tables.uth, { ante: { min: 100, max: 1000, step: 100 }, trips: { min: 100, max: 5000 }, jackpot: 100 });
});

test('roulette validator', () => {
  assert.deepEqual(validate.roulette({ n17: 500, red: 1000 }), { ok: true, total: 1500 });
  assert.equal(validate.roulette({}).reason, 'no-bets');
  assert.equal(validate.roulette({ n17: 50 }).reason, 'spot-min');
  assert.equal(validate.roulette({ n17: 5100 }).reason, 'spot-max');
  assert.equal(validate.roulette({ red: 5000, black: 5000, odd: 5000, even: 5000, n5: 100 }).reason, 'table-max');
  wallet._reset(1000);
  assert.equal(validate.roulette({ red: 1100 }).reason, 'balance');
});

test('blackjack validator', () => {
  assert.deepEqual(validate.blackjack({ main: 500 }), { ok: true, total: 500 });
  assert.deepEqual(validate.blackjack({ main: 10000, perfectPair: 2500, twentyOnePlusThree: 100 }), { ok: true, total: 12600 });
  assert.equal(validate.blackjack({ main: 400 }).reason, 'main-range');
  assert.equal(validate.blackjack({ main: 500, perfectPair: 50 }).reason, 'side-range');
});

test('baccarat validator', () => {
  assert.deepEqual(validate.baccarat({ banker: 500 }), { ok: true, total: 500 });
  assert.deepEqual(validate.baccarat({ player: 500, tie: 500, pPair: 1000 }), { ok: true, total: 2000 });
  assert.equal(validate.baccarat({}).reason, 'no-bets');
  assert.equal(validate.baccarat({ pPair: 100 }).reason, 'no-bets');
  assert.equal(validate.baccarat({ banker: 500, bPair: 1500 }).reason, 'side-range');
});

test('uth validator', () => {
  assert.deepEqual(validate.uth({ ante: 300 }), { ok: true, total: 600 });
  assert.deepEqual(validate.uth({ ante: 1000, trips: 5000, jackpot: true }), { ok: true, total: 7100 });
  assert.equal(validate.uth({ ante: 150 }).reason, 'ante-step');
  assert.equal(validate.uth({ ante: 1100 }).reason, 'ante-range');
  assert.equal(validate.uth({ ante: 100, trips: 50 }).reason, 'trips-range');
});
