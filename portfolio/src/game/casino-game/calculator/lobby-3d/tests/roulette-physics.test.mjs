import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/roulette-physics.js');
const P = globalThis.CASINO.roulettePhysics;
const angleError = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

test('European wheel contains exactly the 37 unique pockets in physical order', () => {
  assert.equal(P.EU_WHEEL.length, 37);
  assert.equal(new Set(P.EU_WHEEL).size, 37);
  assert.deepEqual(P.EU_WHEEL.slice(0, 7), [0, 32, 15, 19, 4, 21, 2]);
  assert.deepEqual(P.EU_WHEEL.slice(-5), [28, 12, 35, 3, 26]);
});

test('ball and rotor counter-rotate with independent monotonically slowing track speeds', () => {
  const spin = P.createSpin({ pocket: 17, wheelAngle: 1.24, seed: 42 });
  let previousBallSpeed = Infinity;
  let previousWheelSpeed = Infinity;
  for (let t = 0; t < spin.dropAt; t += 0.1) {
    const s = spin.sample(t);
    assert.ok(s.ballVelocity > 0);
    assert.ok(s.wheelVelocity > 0); // positive THREE rotation moves pockets toward negative world angle
    assert.ok(s.ballVelocity <= previousBallSpeed);
    assert.ok(s.wheelVelocity <= previousWheelSpeed);
    assert.equal(s.phase, 'track');
    assert.ok(Math.abs(s.radius - P.GEOMETRY.trackRadius) < 0.003);
    previousBallSpeed = s.ballVelocity;
    previousWheelSpeed = s.wheelVelocity;
  }
});

test('every authoritative result is captured continuously and carried by the coasting rotor', () => {
  for (let pocket = 0; pocket <= 36; pocket++) {
    const spin = P.createSpin({ pocket, wheelAngle: 0.73, seed: pocket + 1 });
    const end = spin.sample(spin.duration);
    const later = spin.sample(spin.duration + 0.6);
    const expected = P.EU_WHEEL.indexOf(pocket) * P.STEP;
    assert.ok(Math.abs(angleError(end.ballAngle + end.wheelAngle, expected)) < 1e-9);
    assert.ok(Math.abs(angleError(later.ballAngle + later.wheelAngle, expected)) < 1e-9);
    assert.equal(end.radius, P.GEOMETRY.pocketRadius);
    assert.equal(end.y, P.GEOMETRY.pocketFloor + P.GEOMETRY.ballRadius);
    assert.ok(later.wheelAngle > end.wheelAngle, 'rotor keeps coasting after capture');
    assert.ok(later.ballAngle < end.ballAngle, 'captured ball travels with rotor');
    for (const time of [spin.dropAt, spin.captureAt, spin.duration]) {
      const a = spin.sample(time - 0.00001);
      const b = spin.sample(time + 0.00001);
      const distance = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      assert.ok(distance < 0.001, `${pocket}: continuous at ${time}: ${distance}`);
    }
  }
});

test('trajectory is deterministic, independent of render frame cadence, and remains inside its bowl', () => {
  const args = { pocket: 32, wheelAngle: -7.8, seed: 1234 };
  const slow = P.createSpin(args);
  const fast = P.createSpin(args);
  for (let frame = 0; frame <= 600; frame++) fast.sample(frame / 120);
  for (let t = 0; t <= slow.duration + 1; t += 1 / 30) {
    const s = slow.sample(t);
    assert.deepEqual(s, fast.sample(t));
    for (const key of ['x', 'y', 'z', 'radius', 'ballAngle', 'wheelAngle']) assert.ok(Number.isFinite(s[key]));
    assert.ok(s.radius >= P.GEOMETRY.pocketInner + P.GEOMETRY.ballRadius);
    assert.ok(s.radius <= P.GEOMETRY.trackRadius + 0.003);
    assert.ok(s.y >= P.surfaceHeight(s.radius) + P.GEOMETRY.ballRadius - 0.0001);
  }
});

test('bad outcomes are rejected and presentation seeds cannot alter the requested pocket', () => {
  for (const pocket of [-1, 37, null, '17', NaN]) assert.throws(() => P.createSpin({ pocket }), /pocket/);
  for (const seed of [0, 1, 127, 0xffffffff]) {
    const spin = P.createSpin({ pocket: 0, seed });
    const s = spin.sample(spin.duration);
    assert.ok(Math.abs(angleError(s.ballAngle + s.wheelAngle, 0)) < 1e-9);
  }
});

test('the ball clears solid pocket dividers before settling between them', () => {
  const G = P.GEOMETRY;
  for (let seed = 0; seed < 997; seed += 17) {
    const spin = P.createSpin({ pocket: seed % 37, seed, launchAngle: -Math.PI / 3 });
    for (let t = spin.captureAt; t < spin.duration; t += 1 / 240) {
      const state = spin.sample(t);
      const relative = state.ballAngle + state.wheelAngle;
      const offset = Math.abs(((relative + P.STEP / 2) % P.STEP + P.STEP) % P.STEP - P.STEP / 2);
      const gap = Math.max(0, (P.STEP / 2 - offset) * state.radius - 0.002);
      if (gap >= G.ballRadius) continue;
      const clearance = G.pocketFloor + G.separatorHeight + Math.sqrt(G.ballRadius ** 2 - gap ** 2);
      assert.ok(state.y >= clearance - 0.0001, `seed ${seed}: sphere intersects a divider`);
    }
  }
});
