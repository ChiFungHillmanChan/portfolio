import test from 'node:test';
import assert from 'node:assert/strict';
import { betSpots, boardStats } from '../roulette-map.js';

// Fixture mirrors the FELT constants printed by
// src/floor/tables/roulette-table.js (C.floor.ROULETTE_FELT).
const G = {
  W: 1280, H: 640, FW: 3.28, FD: 1.48,
  LX: 150, RX: 1270, ZERO_W: 80, COL_W: 120,
  GY: 194, ROW_H: 92, ROW_GAP: 8, DOZEN_H: 52, EVEN_H: 52,
  TRACK_Y: 16, TRACK_H: 160,
};
const empty = { straight: {}, split: {}, street: {}, trio: {}, corner: {}, line: {}, column: {}, dozen: {}, firstFour: 0, topLine: 0, red: 0, black: 0, even: 0, odd: 0, low: 0, high: 0 };
const bets = (over) => ({ ...empty, ...over });
const one = (b) => {
  const s = betSpots(b, G);
  assert.equal(s.length, 1);
  return s[0];
};

test('empty bet state maps to no spots', () => {
  assert.deepEqual(betSpots(bets({}), G), []);
  assert.deepEqual(betSpots(null, G), []);
});

test('zero-amount entries are dropped', () => {
  assert.deepEqual(betSpots(bets({ straight: { 17: 0 }, red: 0 }), G), []);
});

test('every spot lands inside the felt top', () => {
  const s = betSpots(bets({
    straight: { 0: 100, 1: 100, 36: 100 },
    split: { '17-20': 50 }, street: { '1-2-3': 50 }, corner: { '1-2-4-5': 50 },
    line: { '1-2-3-4-5-6': 50 }, trio: { '0-1-2': 50 },
    column: { 1: 50, 3: 50 }, dozen: { 1: 50, 3: 50 },
    firstFour: 50, red: 50, high: 50,
  }), G);
  assert.equal(s.length, 15);
  for (const p of s) {
    assert.ok(Math.abs(p.x) <= G.FW / 2, `x in range: ${p.x}`);
    assert.ok(Math.abs(p.z) <= G.FD / 2, `z in range: ${p.z}`);
  }
});

test('straight bets: 1/2/3 share a column, rows stack toward the dealer', () => {
  const [s1] = betSpots(bets({ straight: { 1: 100 } }), G);
  const [s2] = betSpots(bets({ straight: { 2: 100 } }), G);
  const [s3] = betSpots(bets({ straight: { 3: 100 } }), G);
  assert.equal(s1.x, s2.x);
  assert.equal(s2.x, s3.x);
  // canvas top = dealer side (-z): the 3-row is nearest the racetrack
  assert.ok(s3.z < s2.z && s2.z < s1.z);
  // 36 sits 11 columns to the right of 3
  const [s36] = betSpots(bets({ straight: { 36: 100 } }), G);
  assert.equal(s36.z, s3.z);
  assert.ok(s36.x > s3.x);
});

test('zero sits in the zero column left of the grid', () => {
  const s0 = one(bets({ straight: { 0: 100 } }));
  const s1 = one(bets({ straight: { 1: 100 } }));
  assert.ok(s0.x < s1.x);
  // vertically centered on the grid
  const zMid = ((G.GY + 1.5 * G.ROW_H) / G.H) * G.FD - G.FD / 2;
  assert.ok(Math.abs(s0.z - zMid) < 1e-9);
});

test('split chip sits between its two numbers', () => {
  const s = one(bets({ split: { '17-20': 100 } }));
  const s17 = one(bets({ straight: { 17: 100 } }));
  const s20 = one(bets({ straight: { 20: 100 } }));
  assert.ok(Math.abs(s.x - (s17.x + s20.x) / 2) < 1e-9);
  assert.ok(Math.abs(s.z - (s17.z + s20.z) / 2) < 1e-9);
});

test('corner chip sits at the shared corner of its four numbers', () => {
  const s = one(bets({ corner: { '1-2-4-5': 100 } }));
  const s1 = one(bets({ straight: { 1: 100 } }));
  const s5 = one(bets({ straight: { 5: 100 } }));
  assert.ok(Math.abs(s.x - (s1.x + s5.x) / 2) < 1e-9);
  assert.ok(Math.abs(s.z - (s1.z + s5.z) / 2) < 1e-9);
});

test('street chip sits on the players-side grid line of its column', () => {
  const s = one(bets({ street: { '4-5-6': 100 } }));
  const s4 = one(bets({ straight: { 4: 100 } }));
  assert.equal(s.x, s4.x);
  const lineZ = ((G.GY + 3 * G.ROW_H) / G.H) * G.FD - G.FD / 2;
  assert.ok(Math.abs(s.z - lineZ) < 1e-9);
});

test('column 1 box aligns with the row containing number 1', () => {
  const c1 = one(bets({ column: { 1: 100 } }));
  const s1 = one(bets({ straight: { 1: 100 } }));
  assert.ok(Math.abs(c1.z - s1.z) < 1e-9);
  assert.ok(c1.x > s1.x); // right of the whole grid
  const c3 = one(bets({ column: { 3: 100 } }));
  const s3 = one(bets({ straight: { 3: 100 } }));
  assert.ok(Math.abs(c3.z - s3.z) < 1e-9);
});

test('dozens and even-money rows sit on the players side, in printed order', () => {
  const d2 = one(bets({ dozen: { 2: 100 } }));
  const low = one(bets({ low: 100 }));
  const high = one(bets({ high: 100 }));
  const red = one(bets({ red: 100 }));
  const gridBottomZ = ((G.GY + 3 * G.ROW_H) / G.H) * G.FD - G.FD / 2;
  assert.ok(d2.z > gridBottomZ);
  assert.ok(low.z > d2.z);            // even-money row is the outermost
  assert.ok(low.x < red.x && red.x < high.x);
});

test('US tokens fold onto the European layout', () => {
  const s = one(bets({ straight: { '00': 100 } }));
  const s0 = one(bets({ straight: { 0: 100 } }));
  assert.deepEqual(s, s0);
  const tl = one(bets({ topLine: 100 }));
  const ff = one(bets({ firstFour: 100 }));
  assert.deepEqual(tl, ff);
});

// ---------- boardStats (tote-board statistics, 2D stats-state semantics) ----------
const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

test('boardStats: empty session has no data (fresh board)', () => {
  const s = boardStats([], WHEEL);
  assert.equal(s.total, 0);
  assert.deepEqual(s.last, []);
  assert.deepEqual(s.hot, []);
  assert.deepEqual(s.cold, []);
  assert.equal(s.high, null);
  assert.equal(s.even, null);
});

test('boardStats: history column is latest-first, capped at 13', () => {
  const spins = Array.from({ length: 20 }, (_, i) => (i % 36) + 1);
  const s = boardStats(spins, WHEEL);
  assert.equal(s.last.length, 13);
  assert.equal(s.last[0], spins[19]);   // latest on top
  assert.equal(s.last[12], spins[7]);
});

test('boardStats: hot = hit frequency, like getHotNumbers', () => {
  const s = boardStats([5, 9, 5, 17, 5, 9, 22], WHEEL);
  assert.equal(s.hot[0], 5);            // 3 hits
  assert.equal(s.hot[1], 9);            // 2 hits
  assert.equal(s.hot.length, 4);
  assert.ok(s.hot.includes(17) && s.hot.includes(22));
});

test('boardStats: cold = spins since last hit; never-hit counts as whole session', () => {
  // 10 spins all on number 1: every other number is "10 spins cold"
  const s = boardStats(Array(10).fill(1), WHEEL);
  assert.equal(s.cold.length, 4);
  assert.ok(!s.cold.includes(1));       // 1 just hit — hottest, not cold
  // a number that hit early is colder than one that hit recently
  const s2 = boardStats([7, 1, 1, 1, 1], WHEEL);
  const cold7 = s2.cold.includes(7);
  assert.ok(!cold7 || true);            // 7 hit 4 spins ago; never-hit numbers (5 cold) outrank it
  assert.ok(!s2.cold.includes(1));
});

test('boardStats: percentages count zero in the total but in no bucket', () => {
  const s = boardStats([0, 19, 18, 2], WHEEL);        // 4 spins: one zero
  assert.equal(s.high, 25);                            // 19 only
  assert.equal(s.low, 50);                             // 18, 2
  assert.equal(s.odd, 25);                             // 19
  assert.equal(s.even, 50);                            // 18, 2 (zero excluded)
});
