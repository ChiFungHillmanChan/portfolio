import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/layouts.js');
const L = globalThis.CASINO.layouts;

test('card shoes expose an inward mouth above the felt and away from the rack', () => {
  for (const table of [L.blackjack, L.baccarat]) {
    assert.ok(Array.isArray(table.shoeMouth), 'actual mouth drives the dealer and card');
    const [x, y, z] = table.shoeMouth;
    assert.ok(x < table.shoePos[0], 'shoe opens toward the dealer');
    assert.ok(y > table.feltY && y - table.feltY < 0.045, 'mouth just above felt');
    assert.ok(Math.hypot(x - table.rackPos[0], z - table.rackPos[2]) > 0.4);
  }
});

test('baccarat deal plan alternates the first four cards and draws player third before banker', () => {
  assert.equal(typeof L.baccarat.dealSequence, 'function');
  const round = { playerCards: ['P1', 'P2', 'P3'], bankerCards: ['B1', 'B2', 'B3'] };
  const plan = L.baccarat.dealSequence(round);
  assert.deepEqual(plan.map((p) => p.card), ['P1', 'B1', 'P2', 'B2', 'P3', 'B3']);
  assert.deepEqual(plan.map((p) => p.sideways), [false, false, false, false, true, true]);
  assert.deepEqual(plan.map((p) => p.faceDown), [true, true, true, true, false, false]);
  assert.equal(L.baccarat.dealSequence({ playerCards: ['P1', 'P2'], bankerCards: ['B1', 'B2'] }).length, 4);
});

test('all baccarat card corners fit their printed hand zone without covering its title', () => {
  const bac = L.baccarat;
  assert.ok(bac.cardAreas, 'felt areas and card slots share one layout');
  for (const hand of ['player', 'banker']) {
    const area = bac.cardAreas[hand];
    bac[hand + 'Slots'].forEach(([x, y, z], i) => {
      const hw = (i === 2 ? L.CARD_H : L.CARD_W) / 2;
      const hz = (i === 2 ? L.CARD_W : L.CARD_H) / 2;
      assert.ok(x - hw > area.x0 && x + hw < area.x1, hand + ' horizontal containment');
      assert.ok(z - hz > area.titleZ + 0.025 && z + hz < area.z1, hand + ' clear title');
      assert.ok(y - bac.feltY < 0.006, 'card rests directly on felt');
    });
  }
});

test('card dimensions are poker-ratio and ~1.55x the old size', () => {
  assert.equal(L.CARD_W, 0.14);
  assert.equal(L.CARD_H, 0.196);
  assert.ok(Math.abs(L.CARD_W / L.CARD_H - 0.714) < 0.01);
});

test('chipBreakdown preserves fractional and side-bet payout amounts exactly in cents', () => {
  assert.deepEqual(L.chipBreakdown(1600), [1000, 500, 100]);
  assert.deepEqual(L.chipBreakdown(100), [100]);
  for (const amount of [475, 750, 175, 37.5, 0.01, 12.34, 999.99]) {
    const chips = L.chipBreakdown(amount);
    assert.equal(chips.reduce((sum, chip) => sum + Math.round(chip * 100), 0), Math.round(amount * 100),
      `${amount} must not visually overpay or lose its remainder`);
    assert.ok(chips.every((chip) => Number.isFinite(chip) && chip > 0));
    assert.ok(chips.length <= 20);
  }
  assert.deepEqual(L.chipBreakdown(175), [100, 50, 25]);
  assert.deepEqual(L.chipBreakdown(37.5), [25, 10, 1, 1, 0.5]);
});

test('chipBreakdown preserves large payouts with one counted remainder at the object cap', () => {
  const chips = L.chipBreakdown(1e9);
  assert.ok(chips.length <= 20);
  assert.equal(chips.reduce((sum, chip) => sum + chip, 0), 1e9);
  assert.ok(chips.at(-1) > 5000, 'large remainder is a counted plaque, not discarded');
});

test('chipBreakdown rejects invalid/nonpositive amounts and handles decimal arithmetic noise', () => {
  for (const amount of [0, -1, NaN, Infinity, -Infinity, null, undefined, '475', {}, 1e100]) {
    assert.deepEqual(L.chipBreakdown(amount), [], String(amount));
  }
  const chips = L.chipBreakdown(0.1 + 0.2);
  assert.equal(chips.reduce((sum, chip) => sum + Math.round(chip * 100), 0), 30);
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
