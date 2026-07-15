import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/ik.js');
const { solveTwoBone } = globalThis.CASINO.ik;

const near = (a, b, eps = 1e-6) =>
  a.every((v, i) => Math.abs(v - b[i]) < eps) || assert.fail(`${a} !~ ${b}`);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('reachable target: segments keep their lengths, hand hits target', () => {
  const r = solveTwoBone({ shoulder: [0, 0, 0], target: [0.3, 0, 0.1],
    upperLen: 0.25, foreLen: 0.22, pole: [0, -1, 0] });
  assert.equal(r.clamped, false);
  near(r.hand, [0.3, 0, 0.1]);
  assert.ok(Math.abs(dist([0, 0, 0], r.elbow) - 0.25) < 1e-6);
  assert.ok(Math.abs(dist(r.elbow, r.hand) - 0.22) < 1e-6);
});

test('elbow bends toward the pole side', () => {
  const down = solveTwoBone({ shoulder: [0, 1, 0], target: [0.3, 1, 0],
    upperLen: 0.25, foreLen: 0.22, pole: [0, -1, 0] });
  assert.ok(down.elbow[1] < 1, 'pole -Y → elbow below shoulder line');
  const up = solveTwoBone({ shoulder: [0, 1, 0], target: [0.3, 1, 0],
    upperLen: 0.25, foreLen: 0.22, pole: [0, 1, 0] });
  assert.ok(up.elbow[1] > 1, 'pole +Y → elbow above');
});

test('out-of-reach target clamps along the direction, never inverts', () => {
  const r = solveTwoBone({ shoulder: [0, 0, 0], target: [9, 0, 0],
    upperLen: 0.25, foreLen: 0.22, pole: [0, -1, 0] });
  assert.equal(r.clamped, true);
  assert.ok(dist([0, 0, 0], r.hand) <= 0.47 + 1e-9);
  assert.ok(r.hand[0] > 0.46, 'hand reaches straight toward target');
});

test('degenerate pole (parallel to reach dir) still returns finite elbow', () => {
  const r = solveTwoBone({ shoulder: [0, 0, 0], target: [0.3, 0, 0],
    upperLen: 0.25, foreLen: 0.22, pole: [1, 0, 0] });
  assert.ok(r.elbow.every(Number.isFinite));
  assert.ok(Math.abs(dist([0, 0, 0], r.elbow) - 0.25) < 1e-6);
});

test('target inside min reach clamps outward', () => {
  const r = solveTwoBone({ shoulder: [0, 0, 0], target: [0.001, 0, 0],
    upperLen: 0.25, foreLen: 0.1, pole: [0, -1, 0] });
  assert.equal(r.clamped, true);
  assert.ok(r.hand.every(Number.isFinite));
});
