import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RED, colorOf, parityOf, bannerSub, numberWords, resultSpeech, NO_MORE_BETS }
  from '../roulette-call.js';

test('colorOf follows the European wheel: 0 green, RED set red, rest black', () => {
  assert.equal(colorOf(0), 'Green');
  assert.equal(colorOf(32), 'Red');
  assert.equal(colorOf(17), 'Black');
  assert.equal(RED.size, 18);
  for (const n of RED) assert.equal(colorOf(n), 'Red');
});

test('parityOf: zero is neither even nor odd', () => {
  assert.equal(parityOf(0), null);
  assert.equal(parityOf(32), 'Even');
  assert.equal(parityOf(17), 'Odd');
});

test('bannerSub omits parity for zero', () => {
  assert.equal(bannerSub(0), 'Green');
  assert.equal(bannerSub(32), 'Red · Even');
  assert.equal(bannerSub(17), 'Black · Odd');
});

test('numberWords covers the whole wheel 0..36', () => {
  assert.equal(numberWords(0), 'zero');
  assert.equal(numberWords(7), 'seven');
  assert.equal(numberWords(15), 'fifteen');
  assert.equal(numberWords(20), 'twenty');
  assert.equal(numberWords(32), 'thirty-two');
  assert.equal(numberWords(36), 'thirty-six');
  for (let n = 0; n <= 36; n++) assert.ok(numberWords(n).length > 0);
});

test('resultSpeech reads like a dealer call, no parity on zero', () => {
  assert.equal(resultSpeech(32), 'thirty-two, red, even');
  assert.equal(resultSpeech(17), 'seventeen, black, odd');
  assert.equal(resultSpeech(0), 'zero, green');
});

test('NO_MORE_BETS is the shared dealer line', () => {
  assert.equal(NO_MORE_BETS, 'No more bets');
});
