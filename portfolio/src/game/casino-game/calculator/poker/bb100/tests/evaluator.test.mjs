// tests/evaluator.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeHand } from '../js/equity/cards.mjs';
import { evaluate5, evaluate7 } from '../js/equity/evaluator.mjs';

test('5-card: royal flush is rank 1', () => {
  const h = encodeHand(['As', 'Ks', 'Qs', 'Js', 'Ts']);
  assert.equal(evaluate5(h), 1);
});

test('5-card: 7-high straight flush is rank 8', () => {
  const h = encodeHand(['3c', '4c', '5c', '6c', '7c']);
  assert.equal(evaluate5(h), 8); // CK: royal=1, king=2, ..., seven=8, six=9, wheel=10, quads start at 11
});

test('5-card: quad aces with king kicker is rank 11', () => {
  const h = encodeHand(['As', 'Ah', 'Ad', 'Ac', 'Ks']);
  assert.equal(evaluate5(h), 11);
});

test('5-card: worst high card (7-5-4-3-2 unsuited) is rank 7462', () => {
  const h = encodeHand(['7s', '5h', '4d', '3c', '2s']);
  assert.equal(evaluate5(h), 7462);
});

test('5-card: lower rank means better hand', () => {
  const better = evaluate5(encodeHand(['As', 'Ks', 'Qs', 'Js', 'Ts'])); // royal
  const worse  = evaluate5(encodeHand(['2c', '3d', '4h', '5s', '7c'])); // junk
  assert.ok(better < worse);
});

test('7-card: best-of-21 picks the flush from 7 cards', () => {
  // Has 6 hearts: should evaluate to flush rank
  const h = encodeHand(['Ah', 'Kh', 'Qh', '7h', '5h', '2c', '3d']);
  const r = evaluate7(h);
  // Ace-high flush, K-Q-7-5 kickers: should be a high flush rank
  assert.ok(r > 322 && r < 1600); // flush range is 323-1599
});

test('7-card: 7 random cards always return rank in [1, 7462]', () => {
  const h = encodeHand(['As', '2c', '7d', 'Th', 'Jh', 'Qh', 'Ks']);
  const r = evaluate7(h);
  assert.ok(r >= 1 && r <= 7462);
});
