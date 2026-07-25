import test from 'node:test';
import assert from 'node:assert/strict';
import {
  swingPose, armPose, swingActivity, slipperPoint, aimFor,
  ANTICIPATE_S, DRIVE_S, CONTACT_S, HOLD_S, RECOIL_S, SETTLE_S, SWING_S,
  SHOULDER_READY, SHOULDER_COCK, SHOULDER_STRIKE,
  ELBOW_READY, ELBOW_COCK, ELBOW_STRIKE, AIM_LIMIT, LEAN_STRIKE, PIVOT,
  IPAPER, paperLocal, inPaper
} from './scene-illustrated.js';

// ── rig: resting stance ────────────────────────────────────────────────────

test('swingPose rests in the ready stance before, outside and long after a swing', () => {
  for (const since of [-1, NaN, Infinity, SWING_S, SWING_S + 10]) {
    const p = swingPose(since);
    assert.equal(p.shoulder, SHOULDER_READY, `shoulder at since=${since}`);
    assert.equal(p.elbow, ELBOW_READY, `elbow at since=${since}`);
    assert.equal(p.lean, 0, `lean at since=${since}`);
  }
});

test('the blow is thrown from the stance, not held at it', () => {
  // the sprite bakes a natural bend into the authored arm, so the guard is
  // stance-vs-strike separation: the elbow must travel to deliver the blow
  assert.ok(Math.abs(ELBOW_READY - ELBOW_STRIKE) > 0.8,
    `ready elbow ${ELBOW_READY} already sits at the strike pose ${ELBOW_STRIKE}`);
});

test('armPose idles around the ready stance with only a small waggle', () => {
  for (const t of [0, 1.3, 7.7, 42]) {
    const p = armPose(t, Infinity);
    assert.ok(Math.abs(p.shoulder - SHOULDER_READY) < 0.08, `shoulder drifted: ${p.shoulder}`);
    assert.ok(Math.abs(p.elbow - ELBOW_READY) < 0.08, `elbow drifted: ${p.elbow}`);
  }
});

test('the two joints do not breathe in lockstep', () => {
  // identical waggle on both joints would read as one rigid piece again
  let differing = 0;
  for (let i = 0; i < 200; i++) {
    const t = i * 0.05;
    const p = armPose(t, Infinity);
    if (Math.abs((p.shoulder - SHOULDER_READY) - (p.elbow - ELBOW_READY)) > 0.01) differing++;
  }
  assert.ok(differing > 150, `joints moved together on ${200 - differing}/200 samples`);
});

// ── rig: the blow ──────────────────────────────────────────────────────────

test('the wind-up lifts the slipper up and back, away from the paper', () => {
  const peak = swingPose(ANTICIPATE_S * 0.999);
  assert.ok(peak.shoulder > SHOULDER_READY, 'shoulder should rock back, not straight down');
  assert.ok(Math.abs(peak.shoulder - SHOULDER_COCK) < 0.01);
  assert.ok(Math.abs(peak.elbow - ELBOW_COCK) < 0.01);
  // what the player actually sees: the blow visibly loads before it lands.
  // The rest pose already holds the slipper near the top of the arm's reach,
  // so the lift margin is smaller than the pull-back margin.
  const rest = slipperPoint(swingPose(Infinity));
  const cocked = slipperPoint(peak);
  assert.ok(cocked.y < rest.y - 12, `wind-up barely lifted the slipper (${rest.y - cocked.y})`);
  assert.ok(cocked.x > rest.x + 20, `wind-up barely pulled the slipper back (${cocked.x - rest.x})`);
});

test('contact lands exactly on the strike pose', () => {
  const p = swingPose(CONTACT_S);
  assert.ok(Math.abs(p.shoulder - SHOULDER_STRIKE) < 1e-9);
  assert.ok(Math.abs(p.elbow - ELBOW_STRIKE) < 1e-9);
  assert.ok(Math.abs(p.lean - LEAN_STRIKE) < 1e-9);
});

test('an aimed blow shifts the contact shoulder angle by exactly the aim', () => {
  for (const aim of [-AIM_LIMIT, -0.1, 0, 0.13, AIM_LIMIT]) {
    const p = swingPose(CONTACT_S, aim);
    assert.ok(Math.abs(p.shoulder - (SHOULDER_STRIKE + aim)) < 1e-9, `aim ${aim}`);
  }
});

test('the forearm trails the upper arm through the drive, then snaps open', () => {
  // whip: mid-drive the elbow must be further from its contact value than the
  // shoulder is from its own, or the arm is moving as one rigid piece
  for (const u of [0.3, 0.5, 0.7]) {
    const p = swingPose(ANTICIPATE_S + DRIVE_S * u);
    const shoulderDone = (p.shoulder - SHOULDER_COCK) / (SHOULDER_STRIKE - SHOULDER_COCK);
    const elbowDone = (p.elbow - ELBOW_COCK) / (ELBOW_STRIKE - ELBOW_COCK);
    assert.ok(elbowDone < shoulderDone, `elbow led the shoulder at u=${u}`);
  }
});

test('the slipper is held on the paper through the contact hold', () => {
  for (let i = 0; i <= 10; i++) {
    const p = swingPose(CONTACT_S + (i / 10) * HOLD_S * 0.999);
    assert.ok(Math.abs(p.shoulder - SHOULDER_STRIKE) < 1e-9, 'shoulder must not slide during contact');
    assert.ok(Math.abs(p.lean - LEAN_STRIKE) < 1e-9);
  }
});

test('the recoil lifts back past neutral before settling', () => {
  let overshot = false;
  for (let i = 0; i <= 60; i++) {
    const p = swingPose(CONTACT_S + HOLD_S + (i / 60) * (RECOIL_S + SETTLE_S));
    if (p.shoulder > SHOULDER_READY + 0.02) overshot = true;
  }
  assert.ok(overshot, 'recoil never rose past the ready stance — no follow-through');
});

test('the pose is continuous across every phase handoff', () => {
  // the shoulder sweeps ~2.4 rad through the 55ms drive, so a fast
  // frame-to-frame step is intended — the cap only catches real teleports
  const step = 0.001;
  let prev = swingPose(0);
  for (let s = step; s <= SWING_S + 0.05; s += step) {
    const p = swingPose(s);
    for (const k of ['shoulder', 'elbow', 'lean']) {
      assert.ok(Math.abs(p[k] - prev[k]) < 0.12,
        `${k} jumped ${Math.abs(p[k] - prev[k]).toFixed(4)} at since=${s.toFixed(3)}`);
    }
    prev = p;
  }
});

test('a mid-swing restrike skips the wind-up and lands sooner', () => {
  const p = swingPose(0, 0, 0);
  assert.ok(Math.abs(p.shoulder - SHOULDER_COCK) < 1e-9, 'restrike should start from the cocked pose');
  const contact = swingPose(DRIVE_S, 0, 0);
  assert.ok(Math.abs(contact.shoulder - SHOULDER_STRIKE) < 1e-9);
  assert.ok(Math.abs(contact.elbow - ELBOW_STRIKE) < 1e-9);
});

// ── rig: swing activity gate ───────────────────────────────────────────────

test('swingActivity is 0 at rest and full while the blow is thrown', () => {
  for (const since of [-1, NaN, Infinity, SWING_S, SWING_S + 5]) {
    assert.equal(swingActivity(since), 0, `activity at since=${since}`);
  }
  assert.equal(swingActivity(CONTACT_S * 0.5), 1);
  assert.equal(swingActivity(CONTACT_S + HOLD_S * 0.5), 1);
  const fading = swingActivity(CONTACT_S + HOLD_S + RECOIL_S);
  assert.ok(fading > 0 && fading < 1, `recoil should fade, got ${fading}`);
});

// ── rig: forward kinematics guards the landing-point contract ──────────────

test('the slipper lands inside the paper for every aim in range', () => {
  for (let i = -20; i <= 20; i++) {
    const aim = (i / 20) * AIM_LIMIT;
    const p = slipperPoint(swingPose(CONTACT_S, aim));
    assert.ok(inPaper(p.x, p.y),
      `aim ${aim.toFixed(3)} landed off the paper at (${p.x.toFixed(0)},${p.y.toFixed(0)})`);
  }
});

test('the slipper stays on the paper for the whole contact hold', () => {
  for (const aim of [-AIM_LIMIT, 0, AIM_LIMIT]) {
    for (let i = 0; i <= 10; i++) {
      const p = slipperPoint(swingPose(CONTACT_S + (i / 10) * HOLD_S * 0.999, aim));
      assert.ok(inPaper(p.x, p.y), `aim ${aim} hold ${i} left the paper`);
    }
  }
});

test('the slipper is clear of the paper while she is at rest', () => {
  const p = slipperPoint(swingPose(Infinity));
  assert.ok(!inPaper(p.x, p.y), `resting slipper sits on the paper at (${p.x},${p.y})`);
  assert.ok(p.y < IPAPER.cy - IPAPER.h / 2, 'resting slipper should be held up above the paper');
});

test('slipperPoint respects the reach the two bones actually have', () => {
  // bones are ~146px (shoulder→elbow) and ~156px (elbow→slipper); the strike
  // lands with the elbow bent, so contact reach sits well inside |L1-L2|..L1+L2
  const p = slipperPoint({ shoulder: SHOULDER_STRIKE, elbow: ELBOW_STRIKE });
  const reach = Math.hypot(p.x - PIVOT.x, p.y - PIVOT.y);
  assert.ok(reach > 120 && reach < 290, `reach ${reach.toFixed(1)} is outside the rig's bent-arm range`);
});

// ── rig: aiming ────────────────────────────────────────────────────────────

test('aimFor clamps to the reachable arc and ignores rubbish input', () => {
  assert.equal(aimFor(NaN, 700), 0);
  assert.equal(aimFor(300, undefined), 0);
  for (const [x, y] of [[0, 0], [720, 1280], [0, 1280], [720, 0]]) {
    assert.ok(Math.abs(aimFor(x, y)) <= AIM_LIMIT + 1e-9, `aim at (${x},${y}) exceeded the clamp`);
  }
});

test('aimFor leans the blow toward where the player tapped', () => {
  const high = aimFor(IPAPER.cx, IPAPER.cy - IPAPER.h / 2 + 20);
  const low = aimFor(IPAPER.cx, IPAPER.cy + IPAPER.h / 2 - 20);
  assert.notEqual(high, low, 'the aim must respond to where the player tapped');
  // what matters is the landing, not the sign of the bias
  const landHigh = slipperPoint(swingPose(CONTACT_S, high));
  const landLow = slipperPoint(swingPose(CONTACT_S, low));
  assert.ok(landHigh.y < landLow.y,
    `a high tap should land the slipper higher (${landHigh.y.toFixed(0)} vs ${landLow.y.toFixed(0)})`);
  // and both must still be blows that land on the paper
  assert.ok(inPaper(landHigh.x, landHigh.y) && inPaper(landLow.x, landLow.y));
});

// ── paper geometry (unchanged) ─────────────────────────────────────────────

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
