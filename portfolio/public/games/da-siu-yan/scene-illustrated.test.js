import test from 'node:test';
import assert from 'node:assert/strict';
import {
  swingPhase, armAngle, ARM_IDLE, ARM_STRIKE, SWING_DOWN_S, SWING_BACK_S,
  IPAPER, paperLocal, inPaper
} from './scene-illustrated.js';

test('swingPhase is 0 before a strike and for invalid input', () => {
  assert.equal(swingPhase(-1), 0);
  assert.equal(swingPhase(NaN), 0);
  assert.equal(swingPhase(Infinity), 0);
});

test('swingPhase rises monotonically to 1 during the down-swing', () => {
  let prev = -1;
  for (let i = 0; i <= 10; i++) {
    const p = swingPhase((i / 10) * SWING_DOWN_S);
    assert.ok(p >= prev, `phase must not decrease (t=${i})`);
    assert.ok(p >= 0 && p <= 1);
    prev = p;
  }
  assert.equal(swingPhase(SWING_DOWN_S), 1);
});

test('swingPhase falls monotonically back to 0 during the return', () => {
  let prev = 2;
  for (let i = 0; i <= 10; i++) {
    const p = swingPhase(SWING_DOWN_S + (i / 10) * SWING_BACK_S);
    assert.ok(p <= prev, `phase must not increase on return (t=${i})`);
    assert.ok(p >= 0 && p <= 1);
    prev = p;
  }
  assert.equal(swingPhase(SWING_DOWN_S + SWING_BACK_S), 0);
  assert.equal(swingPhase(SWING_DOWN_S + SWING_BACK_S + 5), 0);
});

test('armAngle hits full strike angle at the bottom of the swing', () => {
  assert.equal(armAngle(123.4, SWING_DOWN_S), ARM_STRIKE);
});

test('armAngle idles near ARM_IDLE with only a small waggle', () => {
  for (const t of [0, 1.3, 7.7, 42]) {
    const a = armAngle(t, Infinity);
    assert.ok(Math.abs(a - ARM_IDLE) < 0.08, `idle angle drifted: ${a}`);
  }
});

test('paperLocal maps the paper centre to itself', () => {
  const p = paperLocal(IPAPER.cx, IPAPER.cy);
  assert.ok(Math.abs(p.x - IPAPER.cx) < 1e-9);
  assert.ok(Math.abs(p.y - IPAPER.cy) < 1e-9);
});

test('inPaper accepts the rotated corners and rejects beyond them', () => {
  // corner of the unrotated rect, pushed through the forward rotation =
  // a point that lies exactly on the drawn (rotated) paper corner
  const hw = IPAPER.w / 2 - 1, hh = IPAPER.h / 2 - 1;
  const c = Math.cos(IPAPER.rot), s = Math.sin(IPAPER.rot);
  for (const [dx, dy] of [[hw, hh], [-hw, hh], [hw, -hh], [-hw, -hh]]) {
    const x = IPAPER.cx + dx * c - dy * s;
    const y = IPAPER.cy + dx * s + dy * c;
    assert.ok(inPaper(x, y), `rotated corner (${dx},${dy}) should hit`);
  }
  const far = IPAPER.w / 2 + IPAPER.h / 2;
  assert.ok(!inPaper(IPAPER.cx + far, IPAPER.cy + far));
  assert.ok(!inPaper(IPAPER.cx - far, IPAPER.cy - far));
});

test('inPaper still hits when the paper centre is untouched by rotation direction', () => {
  assert.ok(inPaper(IPAPER.cx, IPAPER.cy));
});
