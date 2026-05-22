// tests/money.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dollarsToUC, ucToDollars, sumUC, formatUSD } from '../js/stats/money.mjs';

test('dollarsToUC handles 2-decimal input exactly', () => {
  assert.equal(dollarsToUC('0.02'), 20000n);
  assert.equal(dollarsToUC('1.50'), 1500000n);
  assert.equal(dollarsToUC('0'),    0n);
  assert.equal(dollarsToUC('123.45'), 123450000n);
});

test('dollarsToUC handles negative', () => {
  assert.equal(dollarsToUC('-0.05'), -50000n);
});

test('sumUC sums BigInts without drift', () => {
  const items = Array.from({ length: 1815 }, () => dollarsToUC('0.02'));
  assert.equal(sumUC(items), 36300000n); // 1815 * 0.02 = 36.30
});

test('ucToDollars round-trips at 6 decimals', () => {
  assert.equal(ucToDollars(8500000n), 8.5);
  assert.equal(ucToDollars(11000000n), 11);
  assert.equal(ucToDollars(123456n), 0.123456);
});

test('formatUSD rounds 6-decimal to 2-decimal display', () => {
  assert.equal(formatUSD(8499999n), '$8.50');   // 8.499999 rounds to 8.50
  assert.equal(formatUSD(11000000n), '$11.00');
  assert.equal(formatUSD(-50000n), '-$0.05');
});
