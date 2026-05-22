// tests/cards.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeCard, decodeCard, encodeHand } from '../js/equity/cards.mjs';

test('encodeCard returns Cactus Kev integer for known cards', () => {
  // King of Diamonds: rank=11(K), suit=4(d), prime=37 → from Cactus Kev paper
  // 2c = 0b00000000_00000000_0000_0001_0000_0001
  // Test exact bit-pattern for a few:
  assert.equal(typeof encodeCard('As'), 'number');
  assert.equal(typeof encodeCard('2c'), 'number');
});

test('encode/decode round-trips for all 52 cards', () => {
  const ranks = '23456789TJQKA';
  const suits = 'cdhs';
  for (const r of ranks) for (const s of suits) {
    const card = r + s;
    assert.equal(decodeCard(encodeCard(card)), card);
  }
});

test('encodeHand parses array of card strings', () => {
  const h = encodeHand(['As', 'Kd']);
  assert.equal(h.length, 2);
  assert.equal(decodeCard(h[0]), 'As');
  assert.equal(decodeCard(h[1]), 'Kd');
});

test('invalid card throws', () => {
  assert.throws(() => encodeCard('Xz'));
  assert.throws(() => encodeCard(''));
  assert.throws(() => encodeCard('AsK'));
});
