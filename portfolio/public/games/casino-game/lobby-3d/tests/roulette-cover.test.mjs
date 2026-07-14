import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/roulette-cover.js');
const RC = globalThis.CASINO.rouletteCover;

test('covers: inside bets', () => {
  assert.ok(RC.covers('straight', '17', 17));
  assert.ok(!RC.covers('straight', '17', 18));
  assert.ok(RC.covers('straight', '00', 0));           // US token -> single zero
  assert.ok(RC.covers('split', '17-20', 20));
  assert.ok(!RC.covers('split', '17-20', 19));
  assert.ok(RC.covers('street', '4-5-6', 5));
  assert.ok(RC.covers('street', '4', 6));              // first-number key form
  assert.ok(RC.covers('corner', '1-2-4-5', 5));
  assert.ok(RC.covers('line', '4-9', 8));              // six-line from 4
  assert.ok(RC.covers('trio', '0-1-2', 0));
});

test('covers: outside bets', () => {
  assert.ok(RC.covers('column', '1', 34));             // col 1 = 1,4,...,34
  assert.ok(!RC.covers('column', '1', 35));
  assert.ok(RC.covers('dozen', '2', 13) && RC.covers('dozen', '2', 24));
  assert.ok(RC.covers('red', null, 32) && !RC.covers('red', null, 33));
  assert.ok(RC.covers('black', null, 33));
  assert.ok(RC.covers('low', null, 18) && RC.covers('high', null, 19));
  assert.ok(RC.covers('even', null, 2) && !RC.covers('even', null, 0));  // zero loses even
  assert.ok(RC.covers('odd', null, 3));
  assert.ok(RC.covers('firstFour', null, 0) && RC.covers('topLine', null, 3));
});

test('factors are standard EU payouts', () => {
  assert.equal(RC.factorOf('straight'), 35);
  assert.equal(RC.factorOf('split'), 17);
  assert.equal(RC.factorOf('street'), 11);
  assert.equal(RC.factorOf('trio'), 11);
  assert.equal(RC.factorOf('corner'), 8);
  assert.equal(RC.factorOf('firstFour'), 8);
  assert.equal(RC.factorOf('topLine'), 8);
  assert.equal(RC.factorOf('line'), 5);
  assert.equal(RC.factorOf('column'), 2);
  assert.equal(RC.factorOf('dozen'), 2);
  assert.equal(RC.factorOf('red'), 1);
});

test('splitByOutcome partitions a mixed board', () => {
  const bets = {
    straight: { 17: 100, 4: 50 },
    split: { '16-17': 25 },
    red: 60, black: 40,
    dozen: { 2: 30 },
    column: { 1: 20 },
  };
  const { winning, losing, wins } = RC.splitByOutcome(bets, 17);
  assert.deepEqual(winning.straight, { 17: 100 });
  assert.deepEqual(losing.straight, { 4: 50 });
  assert.deepEqual(winning.split, { '16-17': 25 });
  assert.equal(winning.black, 40);          // 17 is black
  assert.equal(losing.red, 60);
  assert.deepEqual(winning.dozen, { 2: 30 });
  assert.equal(losing.column[1], 20);       // 17 is column 2
  const w17 = wins.find((w) => w.type === 'straight' && w.key === '17');
  assert.deepEqual(w17, { type: 'straight', key: '17', amount: 100, factor: 35 });
  assert.equal(wins.length, 4);
});

test('splitByOutcome: zero sweeps the outside', () => {
  const { winning, losing } = RC.splitByOutcome({ red: 10, even: 10, low: 10, straight: { 0: 5 } }, 0);
  assert.equal(winning.red, undefined);
  assert.equal(losing.red, 10);
  assert.equal(losing.even, 10);
  assert.equal(losing.low, 10);
  assert.deepEqual(winning.straight, { 0: 5 });
});
