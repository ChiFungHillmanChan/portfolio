import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'game.js'), 'utf8');
const anchor = source.match(/<a id="coffee-btn"[\s\S]*?<\/a>/);

test('the support anchor exists', () => {
  assert.ok(anchor, 'coffee-btn anchor not found in game.js');
});

test('it opens in a new tab without handing over window.opener', () => {
  const tag = anchor[0].match(/<a id="coffee-btn"[^>]*>/)[0];
  assert.match(tag, /href="https:\/\/buymeacoffee\.com\/hillmanchan709"/);
  assert.match(tag, /target="_blank"/);
  // rel is the whole point of this test: target=_blank without noopener hands
  // buymeacoffee.com a live window.opener onto the game.
  assert.match(tag, /rel="noopener noreferrer"/);
});

test('it states no currency or amount', () => {
  // The account has multiple-currency enabled, so Buy Me a Coffee shows each
  // visitor their own currency (HKD in HK, GBP in the UK). Any hard-coded
  // amount here would contradict what they see at checkout.
  assert.doesNotMatch(anchor[0], /\$|USD|HKD|GBP|EUR|£|€/,
    'the support link must not name a price — currency is per-visitor');
});
