import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDamage } from './damage-model.js';

test('stages advance at 15/40/80 hits', () => {
  const d = createDamage();
  let last;
  for (let i = 0; i < 14; i++) last = d.hit(100, 100, i * 1000);
  assert.equal(last.stage, 0);
  assert.equal(d.hit(0, 0, 99000).stage, 1);        // 15th
  for (let i = 15; i < 40; i++) last = d.hit(0, 0, 100000 + i * 1000);
  assert.equal(last.stage, 2);                       // 40th
  for (let i = 40; i < 80; i++) last = d.hit(0, 0, 200000 + i * 1000);
  assert.equal(last.stage, 3);                       // 80th
});

test('prints capped at 14, oldest dropped, seq increases', () => {
  const d = createDamage();
  for (let i = 0; i < 20; i++) d.hit(i, i, i * 1000);
  const prints = d.state().prints;
  assert.equal(prints.length, 14);
  assert.equal(prints[0].x, 6); // hits 0..5 dropped
  assert.ok(prints[13].seq > prints[0].seq);
});

test('combo counts fast hits and bursts at 5', () => {
  const d = createDamage();
  let r;
  for (let i = 0; i < 5; i++) r = d.hit(0, 0, i * 400); // 400ms gaps
  assert.equal(r.combo, 5);
  assert.equal(r.comboBurst, true);
  r = d.hit(0, 0, 5 * 400 + 100);
  assert.equal(r.combo, 6);
  assert.equal(r.comboBurst, false);
  r = d.hit(0, 0, 60000);       // slow hit resets
  assert.equal(r.combo, 1);
});
