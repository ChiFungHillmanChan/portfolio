import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANE, planeToScreen, planeQuad, inPaper } from './plane.js';
import {
  PIVOT, BONES, solveArm, elbowAt, slipperPoint, swingPose, armPose, swingActivity,
  aimFor, AIM_LIMIT, SHOULDER_READY, ELBOW_READY, WRIST_READY,
  ANTICIPATE_S, DRIVE_S, CONTACT_S, HOLD_S, SWING_S
} from './rig.js';

const CONTACT = planeToScreen(0, 0);

// Sheet top edge as a function of screen x, for elbow-clearance assertions.
function topEdgeY(x) {
  const [tl, tr] = planeQuad();
  return tl.y + (x - tl.x) / (tr.x - tl.x) * (tr.y - tl.y);
}

test('the arm can reach the sheet centre without full extension', () => {
  const s = solveArm(CONTACT);
  assert.ok(s, 'sheet centre must be reachable');
  const reach = Math.hypot(CONTACT.x - PIVOT.x, CONTACT.y - PIVOT.y);
  assert.ok(reach < BONES.upper + BONES.fore + BONES.hand,
    'must not need a locked-straight arm');
});

test('the elbow stays clear of the sheet at contact — the whole point of the recompose', () => {
  const s = solveArm(CONTACT);
  assert.ok(s.elbowPt.y < topEdgeY(s.elbowPt.x),
    `elbow ${s.elbowPt.y.toFixed(0)} must sit above the sheet edge ${topEdgeY(s.elbowPt.x).toFixed(0)}`);
});

test('the elbow stays clear across the entire aim range, not just dead centre', () => {
  for (let aim = -AIM_LIMIT; aim <= AIM_LIMIT + 1e-9; aim += AIM_LIMIT / 8) {
    const el = elbowAt(swingPose(CONTACT_S, aim).shoulder);
    assert.ok(el.y < topEdgeY(el.x), `aim ${aim.toFixed(3)} put the elbow on the sheet`);
  }
});

test('the slipper lands inside the sheet for every aim in range', () => {
  for (let aim = -AIM_LIMIT; aim <= AIM_LIMIT + 1e-9; aim += AIM_LIMIT / 8) {
    const p = slipperPoint(swingPose(CONTACT_S, aim));
    assert.ok(inPaper(p.x, p.y), `aim ${aim.toFixed(3)} landed off the sheet`);
  }
});

test('the slipper stays on the sheet for the whole contact hold', () => {
  for (let t = CONTACT_S; t <= CONTACT_S + HOLD_S; t += HOLD_S / 6) {
    const p = slipperPoint(swingPose(t));
    assert.ok(inPaper(p.x, p.y), `slipper left the sheet at t=${t.toFixed(3)}`);
  }
});

test('the slipper is clear of the sheet while she is at rest', () => {
  const p = slipperPoint({ shoulder: SHOULDER_READY, elbow: ELBOW_READY, wrist: WRIST_READY });
  assert.ok(!inPaper(p.x, p.y), 'the resting slipper must not sit on the sheet');
});

test('swingPose rests in the ready stance before and long after a swing', () => {
  for (const since of [-1, NaN, SWING_S + 0.5]) {
    const p = swingPose(since);
    assert.equal(p.shoulder, SHOULDER_READY);
    assert.equal(p.elbow, ELBOW_READY);
  }
});

test('the pose is continuous across every phase handoff', () => {
  const bounds = [ANTICIPATE_S, CONTACT_S, CONTACT_S + HOLD_S];
  for (const b of bounds) {
    const before = swingPose(b - 1e-4), after = swingPose(b + 1e-4);
    for (const k of ['shoulder', 'elbow', 'wrist']) {
      assert.ok(Math.abs(after[k] - before[k]) < 0.02,
        `${k} jumps ${(after[k] - before[k]).toFixed(4)} at ${b}`);
    }
  }
});

test('the wind-up loads the blow away from the sheet', () => {
  const ready = slipperPoint(swingPose(0));
  const cocked = slipperPoint(swingPose(ANTICIPATE_S));
  const target = slipperPoint(swingPose(CONTACT_S));
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  assert.ok(d(cocked, target) > d(ready, target), 'the cock must retreat from the sheet');
});

test('a mid-swing restrike skips the wind-up and lands sooner', () => {
  assert.ok(swingActivity(0.05) > 0, 'mid-swing should report activity');
  const fresh = swingPose(0, 0, ANTICIPATE_S);
  const rushed = swingPose(0, 0, 0);
  assert.notDeepEqual(fresh, rushed);
});

test('swingActivity is 0 at rest and positive while the blow is thrown', () => {
  assert.equal(swingActivity(-1), 0);
  assert.equal(swingActivity(NaN), 0);
  assert.equal(swingActivity(SWING_S + 1), 0);
  assert.ok(swingActivity(DRIVE_S) > 0);
});

test('armPose idles around the ready stance with only a small waggle', () => {
  for (let t = 0; t < 6; t += 0.13) {
    const p = armPose(t, -1);
    assert.ok(Math.abs(p.shoulder - SHOULDER_READY) < 0.08);
    assert.ok(Math.abs(p.elbow - ELBOW_READY) < 0.08);
  }
});

test('the two joints do not breathe in lockstep', () => {
  const diffs = new Set();
  for (let t = 0; t < 4; t += 0.21) {
    const p = armPose(t, -1);
    diffs.add(((p.shoulder - SHOULDER_READY) - (p.elbow - ELBOW_READY)).toFixed(3));
  }
  assert.ok(diffs.size > 8, 'joints must not move as one');
});

test('aimFor clamps to the reachable arc and ignores rubbish input', () => {
  assert.equal(aimFor(NaN, 10), 0);
  assert.equal(aimFor(10, undefined), 0);
  for (const [x, y] of [[0, 0], [720, 1280], [PLANE.cx, PLANE.cy]]) {
    assert.ok(Math.abs(aimFor(x, y)) <= AIM_LIMIT + 1e-9);
  }
});

test('aimFor leans the blow toward where the player tapped', () => {
  const left = aimFor(planeToScreen(-140, 0).x, planeToScreen(-140, 0).y);
  const right = aimFor(planeToScreen(140, 0).x, planeToScreen(140, 0).y);
  assert.notEqual(left, right);
});
