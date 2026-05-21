// tests/validator.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateFile } from '../js/parser/validator.mjs';

const fix = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');

test('valid GG hand passes', () => {
  const r = validateFile('hand-walk-bb.txt', fix('hand-walk-bb.txt'));
  assert.equal(r.valid, true);
});

test('non-.txt extension rejected', () => {
  const r = validateFile('hand.csv', 'Poker Hand #RC1: blah');
  assert.equal(r.valid, false);
  assert.match(r.reason, /extension/i);
});

test('missing GG header rejected', () => {
  const r = validateFile('weird.txt', 'random text\nno header here');
  assert.equal(r.valid, false);
  assert.match(r.reason, /header/i);
});

test('binary content rejected', () => {
  const r = validateFile('binary.txt', 'Poker Hand #RC1: \x00\x01\x02\x03blah');
  assert.equal(r.valid, false);
  assert.match(r.reason, /binary/i);
});

test('oversized file rejected', () => {
  const huge = 'Poker Hand #RC1: blah\n' + 'x'.repeat(11 * 1024 * 1024);
  const r = validateFile('big.txt', huge);
  assert.equal(r.valid, false);
  assert.match(r.reason, /size/i);
});
