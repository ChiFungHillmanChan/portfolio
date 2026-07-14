import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/layouts.js');
const L = globalThis.CASINO.layouts;

test('card dimensions are poker-ratio and ~1.55x the old size', () => {
  assert.equal(L.CARD_W, 0.14);
  assert.equal(L.CARD_H, 0.196);
  assert.ok(Math.abs(L.CARD_W / L.CARD_H - 0.714) < 0.01);
});

test('chipBreakdown is greedy, rounds remainders up to one 100, caps at 20 chips', () => {
  assert.deepEqual(L.chipBreakdown(1600), [1000, 500, 100]);
  assert.deepEqual(L.chipBreakdown(100), [100]);
  assert.deepEqual(L.chipBreakdown(750), [500, 100, 100, 100]);   // 50 remainder -> one extra 100
  assert.deepEqual(L.chipBreakdown(475), [100, 100, 100, 100, 100]); // banker 0.95 on 500
  assert.deepEqual(L.chipBreakdown(0), []);
  assert.ok(L.chipBreakdown(1e9).length <= 20);
});

test('blackjack slots + spots sit on the half-disc table (radius 1.6, +Z side)', () => {
  const bj = L.blackjack;
  const onTable = ([x, , z]) => Math.hypot(x, z) < 1.6 - L.CARD_H / 2;
  bj.playerSlots.forEach((p) => assert.ok(onTable(p)));
  bj.dealerSlots.forEach((p) => assert.ok(onTable(p)));
  Object.values(bj.spots).forEach(({ pos, r }) =>
    assert.ok(Math.hypot(pos[0], pos[2]) + r < 1.6));
  // hit cards keep fanning right and must stay on the felt up to 7 cards
  const x7 = bj.playerSlots[1][0] + 5 * bj.fanDx;
  assert.ok(Math.hypot(x7 + L.CARD_W / 2, bj.playerSlots[1][2]) < 1.6);
  // the felt is a HALF-disc: flat (dealer) edge at z = 0, arc toward +Z.
  // Card footprints, the shoe, and chip endpoints must sit fully at z >= 0
  // (the original room constants floated the dealer's cards off the table).
  [...bj.playerSlots, ...bj.dealerSlots].forEach((p) =>
    assert.ok(p[2] - L.CARD_H / 2 >= 0, 'card footprint on the +Z felt'));
  assert.ok(bj.shoePos[2] > 0, 'shoe on the felt');
  assert.ok(bj.dealerChipPos[2] >= 0, 'dealer chip endpoint on the felt');
  assert.ok(bj.chipSource[2] > 0, 'chip source on the felt');
  Object.values(bj.spots).forEach(({ pos }) =>
    assert.ok(pos[2] > 0, 'bet spot on the +Z felt'));
});

test('baccarat + uth slots/spots sit inside their felt ellipses', () => {
  const inEllipse = (rx, rz) => ([x, , z], pad = 0) =>
    (x / (rx - pad)) ** 2 + (z / (rz - pad)) ** 2 < 1;
  const bacIn = inEllipse(1.8 * 0.94, 0.85 * 0.94);
  L.baccarat.playerSlots.forEach((p) => assert.ok(bacIn(p)));
  L.baccarat.bankerSlots.forEach((p) => assert.ok(bacIn(p)));
  Object.values(L.baccarat.spots).forEach(({ pos }) => assert.ok(bacIn(pos)));
  const uthIn = inEllipse(1.6 * 0.94, 0.9 * 0.94);
  L.uth.playerSlots.forEach((p) => assert.ok(uthIn(p)));
  L.uth.dealerSlots.forEach((p) => assert.ok(uthIn(p)));
  L.uth.boardSlots.forEach((p) => assert.ok(uthIn(p)));
  Object.values(L.uth.spots).forEach(({ pos }) => assert.ok(uthIn(pos)));
});

test('baccarat Macau layout: seat spots on the felt, card slots in the dealing area', () => {
  const bac = L.baccarat;
  assert.equal(bac.seatAngles.length, 6);
  // seat betting spots stay inside the felt ellipse with margin for a chip
  for (let s = 0; s < 6; s++) {
    for (const kind of ['tie', 'banker', 'player']) {
      const [x, z] = bac.seatSpot(s, kind);
      assert.ok((x / (bac.feltRx - 0.06)) ** 2 + (z / (bac.feltRz - 0.06)) ** 2 < 1, `seat ${s} ${kind}`);
      assert.ok(z > 0, 'betting arcs are on the player (+z) side');
    }
  }
  // seat 1 (index 0) is on the right (+x), seat 6 on the left
  assert.ok(bac.seatSpot(0, 'player')[0] > 0);
  assert.ok(bac.seatSpot(5, 'player')[0] < 0);
  // card slots sit between the rack (z ~ -0.5) and the arcs (z > 0)
  [...bac.playerSlots, ...bac.bankerSlots].forEach((p) => {
    assert.ok(p[2] > bac.rackPos[2] + 0.15 && p[2] < 0, 'card row in the dealing area');
  });
  // rack + discard + shoe on the dealer strip
  assert.ok(bac.rackPos[2] < -0.3 && bac.shoePos[2] < -0.3 && bac.discardPos[2] < -0.3);
});

test('blackjack seat layout: stacks, splits and spots stay on the felt', () => {
  const bj = L.blackjack, s = bj.seat;
  assert.ok(s && s.count === 6);
  const angle = (i) => ((s.angleStart - i * s.angleStep) * Math.PI) / 180;
  for (let i = 0; i < s.count; i++) {
    const a = angle(i);
    for (const [radius, tangent] of [
      [s.mainR, 0], [s.sideR, -s.sideDx], [s.sideR, s.sideDx],       // bet spots
      [s.cardsR, s.splitDx], [s.cardsR, -s.splitDx],                 // split bases
      [s.cardsR - 6 * s.stackDr, 0],                                 // 7th hit card
      [bj.seat.mainR, -s.splitDx],                                   // split bet stack
    ]) {
      const [x, z] = bj.seatPoint(a, radius, tangent);
      assert.ok(Math.hypot(x, z) < 1.6 - 0.05, `inside rim seat ${i}`);
      assert.ok(z - L.CARD_H / 2 > -0.02, `on +Z felt seat ${i}`);
    }
  }
  // deepest stack card never collides with the dealer's card row (z 0.16)
  const deep = bj.seatPoint(angle(2), s.cardsR - 6 * s.stackDr, 0);
  assert.ok(Math.hypot(deep[0], deep[1]) > 0.45);
});

test('rouletteSpotPos maps every overlay spot id onto the felt box', () => {
  const ids = ['n0', ...Array.from({ length: 36 }, (_, i) => 'n' + (i + 1)),
    'c1', 'c2', 'c3', 'd1', 'd2', 'd3', 'low', 'even', 'red', 'black', 'odd', 'high'];
  const seen = new Set();
  for (const id of ids) {
    const [x, z] = L.rouletteSpotPos(id);
    assert.ok(Math.abs(x) < 3.28 / 2 && Math.abs(z) < 1.48 / 2, id + ' on felt');
    const key = x.toFixed(3) + ',' + z.toFixed(3);
    assert.ok(!seen.has(key), id + ' distinct');
    seen.add(key);
  }
  // x ordering is unambiguous (texture u runs along +x): 0 column left of numbers,
  // number columns increase with column index, column bets right of numbers.
  assert.ok(L.rouletteSpotPos('n0')[0] < L.rouletteSpotPos('n1')[0]);
  assert.ok(L.rouletteSpotPos('n1')[0] < L.rouletteSpotPos('n4')[0]);
  assert.ok(L.rouletteSpotPos('c1')[0] > L.rouletteSpotPos('n36')[0]);
  // rows within one column share x
  assert.equal(L.rouletteSpotPos('n1')[0], L.rouletteSpotPos('n3')[0]);
});
