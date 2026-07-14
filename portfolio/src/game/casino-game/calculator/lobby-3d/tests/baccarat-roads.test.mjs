import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/baccarat-roads.js');
const R = globalThis.CASINO.baccaratRoads;

// deterministic rng for reproducible shoes
const mulberry32 = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

test('bacValue: A=1, 10/J/Q/K=0, pips face value', () => {
  assert.equal(R.bacValue({ r: 14, s: 0 }), 1);
  assert.equal(R.bacValue({ r: 10, s: 0 }), 0);
  assert.equal(R.bacValue({ r: 11, s: 1 }), 0);
  assert.equal(R.bacValue({ r: 13, s: 3 }), 0);
  assert.equal(R.bacValue({ r: 2, s: 2 }), 2);
  assert.equal(R.bacValue({ r: 9, s: 1 }), 9);
  assert.equal(R.total([{ r: 9, s: 0 }, { r: 5, s: 1 }]), 4); // 14 -> 4
});

test('bankerDraws implements the full third-card table', () => {
  // player stood (null): banker draws 0-5, stands 6-7
  for (let bt = 0; bt <= 5; bt++) assert.equal(R.bankerDraws(bt, null), true, `bt ${bt} stood`);
  assert.equal(R.bankerDraws(6, null), false);
  assert.equal(R.bankerDraws(7, null), false);
  // banker 0-2 always draws
  for (let bt = 0; bt <= 2; bt++)
    for (let p3 = 0; p3 <= 9; p3++) assert.equal(R.bankerDraws(bt, p3), true);
  // banker 3: draws unless player third card is 8
  for (let p3 = 0; p3 <= 9; p3++) assert.equal(R.bankerDraws(3, p3), p3 !== 8);
  // banker 4: draws vs 2-7
  for (let p3 = 0; p3 <= 9; p3++) assert.equal(R.bankerDraws(4, p3), p3 >= 2 && p3 <= 7);
  // banker 5: draws vs 4-7
  for (let p3 = 0; p3 <= 9; p3++) assert.equal(R.bankerDraws(5, p3), p3 >= 4 && p3 <= 7);
  // banker 6: draws vs 6-7
  for (let p3 = 0; p3 <= 9; p3++) assert.equal(R.bankerDraws(6, p3), p3 === 6 || p3 === 7);
  // banker 7 stands
  for (let p3 = 0; p3 <= 9; p3++) assert.equal(R.bankerDraws(7, p3), false);
});

test('simulateShoe deals legal rounds from an 8-deck shoe', () => {
  const rounds = R.simulateShoe(mulberry32(42));
  assert.ok(rounds.length >= 55 && rounds.length <= 95, `round count ${rounds.length}`);
  for (const r of rounds) {
    assert.ok(r.playerCards.length >= 2 && r.playerCards.length <= 3);
    assert.ok(r.bankerCards.length >= 2 && r.bankerCards.length <= 3);
    assert.equal(r.playerTotal, R.total(r.playerCards));
    assert.equal(r.bankerTotal, R.total(r.bankerCards));
    const expect = r.playerTotal > r.bankerTotal ? 'P' : r.bankerTotal > r.playerTotal ? 'B' : 'T';
    assert.equal(r.outcome, expect);
    assert.equal(r.playerPair, r.playerCards[0].r === r.playerCards[1].r);
    assert.equal(r.bankerPair, r.bankerCards[0].r === r.bankerCards[1].r);
    // naturals end with 2 cards each
    if (r.natural) {
      assert.equal(r.playerCards.length, 2);
      assert.equal(r.bankerCards.length, 2);
      assert.ok(r.playerTotal >= 8 || r.bankerTotal >= 8);
    }
    // player only draws on 0-5
    if (r.playerCards.length === 3)
      assert.ok(R.total(r.playerCards.slice(0, 2)) <= 5, 'player drew on 0-5');
    // banker third card obeys the table
    if (!r.natural) {
      const bt2 = R.total(r.bankerCards.slice(0, 2));
      const p3 = r.playerCards.length === 3 ? R.bacValue(r.playerCards[2]) : null;
      assert.equal(r.bankerCards.length === 3, R.bankerDraws(bt2, p3));
    }
  }
  // same seed -> same shoe (determinism for tests)
  assert.deepEqual(R.simulateShoe(mulberry32(42)), rounds);
});

const mk = (str) => [...str].map((ch) => ({
  outcome: ch, playerCards: [], bankerCards: [],
  playerTotal: 0, bankerTotal: 0, playerPair: false, bankerPair: false, natural: false,
}));

test('buildBigRoad: streak columns, ties annotate the previous cell', () => {
  const big = R.buildBigRoad(mk('BTTBPT'));
  assert.equal(big.leadingTies, 0);
  assert.deepEqual(big.cols, [
    { outcome: 'B', cells: [{ ties: 2 }, { ties: 0 }] },
    { outcome: 'P', cells: [{ ties: 1 }] },
  ]);
});

test('buildBigRoad: leading ties are held separately', () => {
  const big = R.buildBigRoad(mk('TTB'));
  assert.equal(big.leadingTies, 2);
  assert.deepEqual(big.cols, [{ outcome: 'B', cells: [{ ties: 0 }] }]);
});

test('layoutRoad: stacks, new columns, dragon tail at row 6', () => {
  const seq = (s) => [...s].map((k) => ({ key: k }));
  // simple stack + column change
  assert.deepEqual(R.layoutRoad(seq('BBBP')).map(({ col, row }) => [col, row]),
    [[0, 0], [0, 1], [0, 2], [1, 0]]);
  // 8-long streak wraps right along the bottom row
  assert.deepEqual(R.layoutRoad(seq('BBBBBBBB')).map(({ col, row }) => [col, row]),
    [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 5], [2, 5]]);
  // next column starts at col 1 row 0 (start col advances by 1, not past the tail)
  const cells = R.layoutRoad(seq('BBBBBBBBP'));
  assert.deepEqual(cells[8], { col: 1, row: 0, key: 'P' });
  // a stack that hits an old tail slides right on its own row
  const c2 = R.layoutRoad(seq('BBBBBBBBPPPPPP')).map(({ col, row }) => [col, row]);
  // P stack: (1,0)..(1,4) then (1,5) is occupied by the B tail -> (2,4)
  assert.deepEqual(c2.slice(8), [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [2, 4]]);
});

test('bigRoadCells carries outcome + ties through layout', () => {
  const cells = R.bigRoadCells(R.buildBigRoad(mk('BTTBPT')));
  assert.deepEqual(cells, [
    { col: 0, row: 0, key: 'B', outcome: 'B', ties: 2 },
    { col: 0, row: 1, key: 'B', outcome: 'B', ties: 0 },
    { col: 1, row: 0, key: 'P', outcome: 'P', ties: 1 },
  ]);
});

test('beadPlate fills columns top-to-bottom and keeps the newest columns', () => {
  const cells = R.beadPlate(mk('BPT'), 12);
  assert.deepEqual(cells.map((c) => [c.col, c.row, c.outcome]),
    [[0, 0, 'B'], [0, 1, 'P'], [0, 2, 'T']]);
  // 80 rounds = 14 columns of 6 -> drop the 2 oldest columns (12 rounds)
  const many = mk('B'.repeat(80));
  const c = R.beadPlate(many, 12);
  assert.equal(c.length, 80 - 12);
  assert.deepEqual([c[0].col, c[0].row], [0, 0]);
  const lastCell = c[c.length - 1];
  assert.deepEqual([lastCell.col, lastCell.row], [Math.floor(67 / 6), 67 % 6]);
});

test('stats counts outcomes, pairs, naturals, games', () => {
  const rounds = R.simulateShoe(mulberry32(7));
  const s = R.stats(rounds);
  assert.equal(s.games, rounds.length);
  assert.equal(s.banker + s.player + s.tie, s.games);
  assert.equal(s.banker, rounds.filter((r) => r.outcome === 'B').length);
  assert.equal(s.bPair, rounds.filter((r) => r.bankerPair).length);
  assert.equal(s.pPair, rounds.filter((r) => r.playerPair).length);
  assert.equal(s.natural, rounds.filter((r) => r.natural).length);
});
