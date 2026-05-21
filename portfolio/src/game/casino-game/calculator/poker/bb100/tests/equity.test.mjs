// tests/equity.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeHand } from '../js/equity/cards.mjs';
import { equity } from '../js/equity/equity.mjs';

test('river: hero best hand wins 100%', () => {
  // Hero: KdQd makes royal flush (AdKdQdJdTd). Villain: 2c3c has only pair of 2s.
  const hero = encodeHand(['Kd', 'Qd']);
  const villain = encodeHand(['2c', '3c']);
  const board = encodeHand(['Ad', 'Jd', 'Td', '5h', '2h']);
  assert.equal(equity(hero, villain, board), 1.0);
});

test('river: chop = 0.5', () => {
  // Both players have nothing better than the board's AAAKK (full house).
  const board3 = encodeHand(['Ah', 'Ac', 'Ad', 'Kh', 'Kc']); // AAA+KK on board = full house
  assert.equal(equity(encodeHand(['2c', '3c']), encodeHand(['2d', '3d']), board3), 0.5);
});

test('turn: 46-card river enumeration', () => {
  // Hero: AhAd on flop+turn 7c2d5h9s. Villain: KsKc.
  // 46 unseen cards (52 - 4 hole - 4 board). KK improves to set on K (2 cards).
  // Hero AA wins 44/46 ≈ 0.9565 (no chops possible — different ranks).
  const hero = encodeHand(['Ah', 'Ad']);
  const villain = encodeHand(['Ks', 'Kc']);
  const board = encodeHand(['7c', '2d', '5h', '9s']);
  const e = equity(hero, villain, board);
  assert.ok(e > 0.95 && e < 0.96, `expected ~0.9565, got ${e}`);
});

test('flop: AA vs KK on 7c2d5h flop ≈ 91%', () => {
  // PokerStove: AA vs KK on 7c2d5h ≈ 91.20% (KK needs a K)
  const hero = encodeHand(['Ah', 'Ad']);
  const villain = encodeHand(['Ks', 'Kc']);
  const board = encodeHand(['7c', '2d', '5h']);
  const e = equity(hero, villain, board);
  assert.ok(e > 0.91 && e < 0.92, `expected ~0.912, got ${e}`);
});

test('preflop: AA vs KK (specific suits: As,Ah vs Kc,Kd) ≈ 0.8126', () => {
  // Note: published 0.8171 is the RANGE-vs-RANGE average across all AA/KK suit combos.
  // Specific rainbow combo (As,Ah vs Kc,Kd — no shared suits) computes to ~0.8126.
  // Shared-suit combos (e.g. Ah,Ac vs Kh,Kc) are higher (~0.826) because flush draws
  // partially block each other. This is the correct exhaustive value for this holding.
  const hero = encodeHand(['As', 'Ah']);
  const villain = encodeHand(['Kc', 'Kd']);
  const e = equity(hero, villain, []);
  assert.ok(e > 0.812 && e < 0.814, `expected ~0.8126, got ${e}`);
});

test('preflop: AKs vs QQ ≈ 0.4627', () => {
  const hero = encodeHand(['As', 'Ks']);
  const villain = encodeHand(['Qc', 'Qd']);
  const e = equity(hero, villain, []);
  assert.ok(e > 0.460 && e < 0.465, `expected ~0.4627, got ${e}`);
});

test('preflop: deterministic across calls', () => {
  const e1 = equity(encodeHand(['As', 'Ah']), encodeHand(['Kc', 'Kd']), []);
  const e2 = equity(encodeHand(['As', 'Ah']), encodeHand(['Kc', 'Kd']), []);
  assert.equal(e1, e2);
});
