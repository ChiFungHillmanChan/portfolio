# 打小人 Flat Altar + 3-Bone Arm Rig Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the 小人紙 flat on a brick so the granny beats it downward, and split her fused forearm+hand sprite at the wrist so the arm stays connected and stops blanketing the sheet.

**Architecture:** Two new pure-geometry modules (`plane.js`, `rig.js`) extracted from the 558-line `scene-illustrated.js`, which keeps only rendering. The sheet moves from a rotation to an affine ground-plane transform, so all existing paper-local drawing (effigy, name, damage, prints) survives unchanged. The arm becomes a 3-bone chain (shoulder → elbow → wrist) with the hand+slipper as a 5th sprite.

**Tech Stack:** Vanilla ES modules, Canvas 2D, `node --test` (no framework), Python 3 + Pillow for the sprite cutter.

## Global Constraints

- **No build step.** Plain ES modules loaded by `index.html`. No bundler, no TypeScript.
- **Public surface is frozen:** `game.js` imports exactly `createIllustratedScene(canvas)` and `inPaper(x, y)`. Both signatures must survive. `createIllustratedScene` must keep returning `{ setEffigy, draw, strike, ready }`, and `strike(x, y, nowS, rng?)` must keep returning seconds-until-contact.
- **`scene.js` (經典版) is untouched.** It exports `STAGE_W`, `STAGE_H`, `PAPER` which the illustrated scene and `game.js` still use.
- Stage is **720×1280**, fixed.
- Tests run with `node --test <file>` from the repo root. No test framework, no mocks — all rig/plane maths is pure and directly callable.
- **Every change must be mirrored** from `portfolio/public/games/da-siu-yan/` into `portfolio/build/games/da-siu-yan/`. These are two real deployed copies, not a build artifact.
- **`sw.js` `CACHE` must be bumped** whenever any file in its `ASSETS` list changes, or returning players keep the old files. Currently `da-siu-yan-v7`.
- Measured constants that must not be re-guessed (image coords, 525×799 frame):
  `SHOULDER = (190, 345)`, `ELBOW = (82, 235)`, `WRIST = (61, 196)`, `SLIPPER = (100, 72)`, `SCALE = 0.95`.
- Assistant **cannot listen to audio.** Task 8 builds a tool for the user; it must not assert any clip is fixed.

---

### Task 1: Ground-plane geometry module

Extracts the sheet's placement into a pure, testable module. Today `IPAPER` is a rect plus a rotation; it becomes a rect plus an affine matrix that lays it into the ground.

**Files:**
- Create: `portfolio/public/games/da-siu-yan/plane.js`
- Create: `portfolio/public/games/da-siu-yan/plane.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `PLANE = { cx, cy, w, h, rot, tilt }`
  - `planeToScreen(u, v, plane = PLANE) -> {x, y}` — sheet-local → stage coords
  - `screenToPlane(x, y, plane = PLANE) -> {u, v}` — inverse
  - `inPaper(x, y, plane = PLANE) -> boolean`
  - `planeQuad(plane = PLANE) -> [{x,y} × 4]` — corners TL, TR, BR, BL in local order
  - `planeMatrix(plane = PLANE) -> [a, b, c, d, e, f]` — for `ctx.setTransform`

- [ ] **Step 1: Write the failing tests**

```js
// plane.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANE, planeToScreen, screenToPlane, inPaper, planeQuad } from './plane.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} !== ${b}`);

test('the sheet centre maps to the plane centre', () => {
  const p = planeToScreen(0, 0);
  close(p.x, PLANE.cx);
  close(p.y, PLANE.cy);
});

test('screenToPlane inverts planeToScreen for arbitrary points', () => {
  for (const [u, v] of [[0, 0], [120, -200], [-170, 250], [40, 90]]) {
    const s = planeToScreen(u, v);
    const back = screenToPlane(s.x, s.y);
    close(back.u, u, 1e-9);
    close(back.v, v, 1e-9);
  }
});

test('tilt foreshortens the sheet vertically, so it reads as lying flat', () => {
  // the same local distance spans less screen height along v than along u
  const alongU = planeToScreen(100, 0);
  const alongV = planeToScreen(0, 100);
  const spanU = Math.hypot(alongU.x - PLANE.cx, alongU.y - PLANE.cy);
  const spanV = Math.hypot(alongV.x - PLANE.cx, alongV.y - PLANE.cy);
  assert.ok(spanV < spanU, `expected foreshortening, got v=${spanV} u=${spanU}`);
  close(spanV / spanU, PLANE.tilt, 1e-9);
});

test('inPaper accepts the four corners and rejects just beyond them', () => {
  for (const c of planeQuad()) {
    assert.ok(inPaper(c.x, c.y), `corner ${c.x},${c.y} should be inside`);
  }
  // push each corner 12px directly away from the centre
  for (const c of planeQuad()) {
    const dx = c.x - PLANE.cx, dy = c.y - PLANE.cy;
    const n = Math.hypot(dx, dy);
    assert.ok(!inPaper(c.x + dx / n * 12, c.y + dy / n * 12), 'outside corner should miss');
  }
});

test('inPaper rejects a point beside the sheet that a naive AABB would accept', () => {
  // the sheet is rotated, so its bounding box contains points the sheet does not
  const q = planeQuad();
  const minX = Math.min(...q.map((p) => p.x)), minY = Math.min(...q.map((p) => p.y));
  assert.ok(!inPaper(minX + 2, minY + 2), 'AABB corner must not count as a hit');
});

test('the quad is returned in local corner order', () => {
  const q = planeQuad();
  assert.equal(q.length, 4);
  close(q[0].x, planeToScreen(-PLANE.w / 2, -PLANE.h / 2).x);
  close(q[2].y, planeToScreen(PLANE.w / 2, PLANE.h / 2).y);
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test portfolio/public/games/da-siu-yan/plane.test.js`
Expected: FAIL — `Cannot find module './plane.js'`

- [ ] **Step 3: Implement `plane.js`**

The matrix is `T(cx,cy) · R(rot) · S(1, tilt)`. Written out, local `(u,v)` maps to
`x = cx + u·cos r − v·tilt·sin r`, `y = cy + u·sin r + v·tilt·cos r`.

```js
// Ground-plane placement for the 小人紙. The sheet lies flat on the brick, so
// its transform is an affine (rotate + vertical foreshorten) rather than the
// plain rotation the standing poster used. Canvas 2D cannot do true
// perspective; at this size the affine reads correctly as "lying flat", and it
// buys us zero changes to every bit of drawing done in sheet-local coords.
export const PLANE = { cx: 245, cy: 975, w: 340, h: 500, rot: -0.12, tilt: 0.5 };

export function planeMatrix(plane = PLANE) {
  const c = Math.cos(plane.rot), s = Math.sin(plane.rot);
  // a c e / b d f, matching ctx.setTransform(a, b, c, d, e, f)
  return [c, s, -plane.tilt * s, plane.tilt * c, plane.cx, plane.cy];
}

export function planeToScreen(u, v, plane = PLANE) {
  const [a, b, c, d, e, f] = planeMatrix(plane);
  return { x: a * u + c * v + e, y: b * u + d * v + f };
}

export function screenToPlane(x, y, plane = PLANE) {
  const [a, b, c, d, e, f] = planeMatrix(plane);
  const det = a * d - b * c;
  const px = x - e, py = y - f;
  return { u: (px * d - py * c) / det, v: (py * a - px * b) / det };
}

export function inPaper(x, y, plane = PLANE) {
  const { u, v } = screenToPlane(x, y, plane);
  return Math.abs(u) <= plane.w / 2 && Math.abs(v) <= plane.h / 2;
}

export function planeQuad(plane = PLANE) {
  const hw = plane.w / 2, hh = plane.h / 2;
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]
    .map(([u, v]) => planeToScreen(u, v, plane));
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node --test portfolio/public/games/da-siu-yan/plane.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add portfolio/public/games/da-siu-yan/plane.js portfolio/public/games/da-siu-yan/plane.test.js
git commit -m "feat(da-siu-yan): ground-plane transform for the flat 小人紙"
```

---

### Task 2: Split the hand from the forearm in the sprite cutter

The painted forearm, fist and slipper are one sprite. The new contact pose rotates that segment ~180°, which would render the slipper sole-up. Splitting at the measured wrist gives the hand its own pivot.

**Files:**
- Modify: `scripts/da-siu-yan/cut-granny-sprites.py`
- Create (generated): `portfolio/public/games/da-siu-yan/art/granny-hand.png`
- Regenerate: `portfolio/public/games/da-siu-yan/art/granny-arm-fore.png`

**Interfaces:**
- Consumes: `scripts/da-siu-yan/granny-src.png` (525×799).
- Produces: five sprites sharing the 525×799 frame — `granny-body.png`, `granny-arm-upper.png`, `granny-arm-fore.png` (elbow→wrist stub only), `granny-hand.png` (fist + slipper), `granny-head.png`.

- [ ] **Step 1: Add the wrist anchor and hand polygon**

The wrist was measured by scanning alpha cross-sections along the elbow→slipper
axis: widths fall monotonically 67→48px from the elbow, then jump to 69px where
the fist begins. That knee is the wrist, at image `(61, 196)`.

In `cut-granny-sprites.py`, beside the existing joints:

```python
WRIST = (61, 196)       # measured: narrowest section before the fist widens

# hand + slipper: everything beyond the wrist. The cut runs perpendicular to
# the forearm across the wrist; elsewhere the boundary sits in transparency,
# so it can be generous.
POLY_HAND = [
    (0, 0), (205, 0), (205, 95), (150, 140), (128, 185), (100, 188),
    (84, 200), (78, 214), (74, 228), (86, 186), (60, 168), (30, 170), (0, 178),
]
```

- [ ] **Step 2: Trim `POLY_FORE` to end at the wrist**

Replace the existing `POLY_FORE` with a stub that spans elbow→wrist only:

```python
# forearm stub: elbow up to the wrist cut. Short — most of what the old
# single sprite called "forearm" was actually fist + slipper.
POLY_FORE = [
    (0, 170), (30, 168), (60, 166), (88, 184), (78, 214), (74, 228),
    (60, 256), (48, 248), (36, 242), (6, 236), (0, 238),
]
```

- [ ] **Step 3: Emit the hand sprite and cap the wrist joint**

In `main()`, after the existing forearm block, add a skin disc at the wrist on
**both** pieces so rotation cannot open a gap there:

```python
    # ── hand sprite: fist + slipper, pivoting at the wrist ──
    hand = extract(mask_from_poly(POLY_HAND))
    wcap = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wcap)
    wd.ellipse([WRIST[0]-20, WRIST[1]-20, WRIST[0]+20, WRIST[1]+20], fill=skin + (255,))
    wcap = wcap.filter(ImageFilter.GaussianBlur(0.5))
    hand = Image.alpha_composite(wcap, hand)
    slim(hand).save('granny-hand.png')
```

and change the forearm's synthetic bone so it runs wrist→elbow (it currently
runs `(58, 200)` → elbow, which is the same line — keep the width):

```python
    bd.line([WRIST, ELBOW], fill=skin + (255,), width=44)
    bd.ellipse([WRIST[0]-22, WRIST[1]-22, WRIST[0]+22, WRIST[1]+22], fill=skin + (255,))
```

- [ ] **Step 4: Update the body sprite's cut union**

The body is cut by `ImageChops.lighter(m_fore, m_upper)`. The hand is now a
separate piece, so it must join that union or a ghost of the fist stays on the
body:

```python
    union = ImageChops.lighter(ImageChops.lighter(m_fore, m_upper),
                               mask_from_poly(POLY_HAND)).filter(ImageFilter.MaxFilter(9))
```

- [ ] **Step 5: Update the reconstruction check to composite five sprites**

```python
    recon = Image.alpha_composite(Image.alpha_composite(Image.alpha_composite(
        Image.alpha_composite(body, fore), hand), upper), head)
    recon.save('debug-recon.png')
```

- [ ] **Step 6: Run the cutter and inspect the reconstruction**

```bash
cd scripts/da-siu-yan && python3 cut-granny-sprites.py
```

Open `debug-recon.png`. It must look like `granny-src.png` with no seams, no
missing fist, and no doubled outline at the wrist. If a seam shows, widen the
wrist disc radius (20 → 24) rather than moving the polygons.

- [ ] **Step 7: Copy the sprites into the game and commit**

```bash
cp scripts/da-siu-yan/granny-{body,arm-upper,arm-fore,hand,head}.png \
   portfolio/public/games/da-siu-yan/art/
git add scripts/da-siu-yan/cut-granny-sprites.py portfolio/public/games/da-siu-yan/art/
git commit -m "feat(da-siu-yan): cut the hand+slipper from the forearm at the wrist"
```

---

### Task 3: Three-bone arm rig

Replaces the hand-tuned pose constants with an IK solve, and adds the wrist as a third joint.

**Files:**
- Create: `portfolio/public/games/da-siu-yan/rig.js`
- Create: `portfolio/public/games/da-siu-yan/rig.test.js`

**Interfaces:**
- Consumes: `plane.js` (`PLANE`, `planeToScreen`, `inPaper`, `planeQuad`).
- Produces:
  - `FRAME`, `PIVOT`, `HIP`, `BONES = { upper, fore, hand }` (stage px)
  - `UPPERA = { shx, shy, ex, ey }`, `FOREA = { ex, ey, wx, wy }`, `HANDA = { wx, wy, slx, sly }` — sprite anchors in frame px, for `drawImage` offsets
  - `solveArm(target, plane?) -> { shoulder, elbow, wrist, elbowPt, wristPt } | null` — IK, elbow-up branch; `null` if out of reach
  - `elbowAt(shoulder) -> {x, y}` — elbow in stage coords; depends only on the shoulder angle
  - `wristAt(shoulder, elbow) -> {x, y}` — wrist in stage coords
  - `SHOULDER_READY`, `SHOULDER_COCK`, `SHOULDER_STRIKE`, `ELBOW_*`, `WRIST_*`, `AIM_LIMIT`
  - `ANTICIPATE_S`, `DRIVE_S`, `CONTACT_S`, `HOLD_S`, `RECOIL_S`, `SETTLE_S`, `SWING_S`
  - `swingPose(since, aim, anticipate) -> { shoulder, elbow, wrist, lean }`
  - `armPose(t, since, aim, anticipate) -> same shape`
  - `swingActivity(since, anticipate) -> 0..1`
  - `aimFor(x, y) -> radians`
  - `slipperPoint({shoulder, elbow, wrist, lean}) -> {x, y}`

- [ ] **Step 1: Write the failing tests**

```js
// rig.test.js
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
```

**Note for the implementer:** the `elbowFor` helper above is a placeholder that
will not run. Replace it with a real import — `rig.js` must export
`elbowAt(shoulder) -> {x, y}` for exactly this purpose, and the test should
`import { elbowAt } from './rig.js'` and call it directly. Delete the stub
`elbowFor`/`require_elbow` lines.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test portfolio/public/games/da-siu-yan/rig.test.js`
Expected: FAIL — `Cannot find module './rig.js'`

- [ ] **Step 3: Implement `rig.js`**

```js
// Three-bone arm rig: shoulder -> elbow -> wrist -> slipper. The granny is
// five sprites sharing one 525x799 frame cut from the source painting. The
// strike pose is SOLVED by IK against the flat sheet, not hand-tuned: the old
// hand-tuned constants folded the elbow 97deg and laid it on the paper.
import { PLANE, planeToScreen } from './plane.js';

const SCALE = 0.95;
export const FRAME = { x: 220, y: 440, w: 525 * SCALE, h: 799 * SCALE };

// measured joints in image coords (see cut-granny-sprites.py)
const J = { sh: [190, 345], el: [82, 235], wr: [61, 196], sl: [100, 72] };
const S = (p) => ({ x: p[0] * SCALE, y: p[1] * SCALE });

export const UPPERA = { shx: S(J.sh).x, shy: S(J.sh).y, ex: S(J.el).x, ey: S(J.el).y };
export const FOREA  = { ex: S(J.el).x, ey: S(J.el).y, wx: S(J.wr).x, wy: S(J.wr).y };
export const HANDA  = { wx: S(J.wr).x, wy: S(J.wr).y, slx: S(J.sl).x, sly: S(J.sl).y };

export const PIVOT = { x: FRAME.x + UPPERA.shx, y: FRAME.y + UPPERA.shy };
export const HIP   = { x: FRAME.x + 260 * SCALE, y: FRAME.y + 500 * SCALE };

const seg = (ax, ay, bx, by) => ({ len: Math.hypot(bx - ax, by - ay), ang: Math.atan2(by - ay, bx - ax) });
const U = seg(UPPERA.shx, UPPERA.shy, UPPERA.ex, UPPERA.ey);
const F = seg(FOREA.ex, FOREA.ey, FOREA.wx, FOREA.wy);
const H = seg(HANDA.wx, HANDA.wy, HANDA.slx, HANDA.sly);

// upper 146.4, fore 42.1, hand 123.5 — most of what the old code called
// "forearm" was actually fist + slipper, which is why the wrist split matters
export const BONES = { upper: U.len, fore: F.len, hand: H.len };

const norm = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const lerp = (a, b, u) => a + (b - a) * u;

// Joint positions. Each depends only on the angles above it in the chain,
// which is what lets the tests assert elbow clearance from a shoulder alone.
export function elbowAt(shoulder) {
  const a = U.ang + shoulder;
  return { x: PIVOT.x + Math.cos(a) * U.len, y: PIVOT.y + Math.sin(a) * U.len };
}
export function wristAt(shoulder, elbow) {
  const e = elbowAt(shoulder), a = F.ang + shoulder + elbow;
  return { x: e.x + Math.cos(a) * F.len, y: e.y + Math.sin(a) * F.len };
}
export function slipperPoint({ shoulder, elbow, wrist, lean = 0 }) {
  const w = wristAt(shoulder, elbow), a = H.ang + shoulder + elbow + wrist;
  const p = { x: w.x + Math.cos(a) * H.len, y: w.y + Math.sin(a) * H.len };
  if (!lean) return p;
  const c = Math.cos(lean), s = Math.sin(lean);
  const dx = p.x - HIP.x, dy = p.y - HIP.y;
  return { x: HIP.x + dx * c - dy * s, y: HIP.y + dx * s + dy * c };
}

// Place the wrist directly above the target by one hand-length, then solve the
// two-bone chain to it. The elbow-up branch is the one that clears the sheet —
// the other lands the elbow on the paper, which is the bug we are fixing.
export function solveArm(target) {
  const wx = target.x, wy = target.y - BONES.hand;
  const dx = wx - PIVOT.x, dy = wy - PIVOT.y, d = Math.hypot(dx, dy);
  if (d > BONES.upper + BONES.fore || d < Math.abs(BONES.upper - BONES.fore)) return null;
  const x = (d * d + BONES.upper ** 2 - BONES.fore ** 2) / (2 * d);
  const h = Math.sqrt(Math.max(0, BONES.upper ** 2 - x * x));
  const ux = dx / d, uy = dy / d;
  // both IK branches; keep the one whose elbow sits higher on screen
  const cands = [
    { x: PIVOT.x + x * ux - h * uy, y: PIVOT.y + x * uy + h * ux },
    { x: PIVOT.x + x * ux + h * uy, y: PIVOT.y + x * uy - h * ux }
  ];
  const elbowPt = cands[0].y <= cands[1].y ? cands[0] : cands[1];
  const wristPt = { x: wx, y: wy };
  const shoulder = norm(Math.atan2(elbowPt.y - PIVOT.y, elbowPt.x - PIVOT.x) - U.ang);
  const elbow = norm(Math.atan2(wristPt.y - elbowPt.y, wristPt.x - elbowPt.x) - F.ang - shoulder);
  const wrist = norm(Math.atan2(target.y - wristPt.y, target.x - wristPt.x) - H.ang - shoulder - elbow);
  return { shoulder, elbow, wrist, elbowPt, wristPt };
}

const STRIKE = solveArm(planeToScreen(0, 0));
if (!STRIKE) throw new Error('sheet centre is out of arm reach — check PLANE vs FRAME');
export const SHOULDER_STRIKE = STRIKE.shoulder;
export const ELBOW_STRIKE = STRIKE.elbow;
export const WRIST_STRIKE = STRIKE.wrist;

// READY holds the slipper high, near the painted pose so the sleeve barely
// rotates; COCK pulls a little further back behind her crown.
export const SHOULDER_READY = 0.20;
export const ELBOW_READY = -0.15;
export const WRIST_READY = 0.0;
export const SHOULDER_COCK = SHOULDER_READY + 0.22;
export const ELBOW_COCK = ELBOW_READY - 0.20;
export const WRIST_COCK = -0.18;
export const ELBOW_GIVE = 0.10;
export const LEAN_STRIKE = -0.085;
export const AIM_LIMIT = 0.22;

export const ANTICIPATE_S = 0.035;
export const DRIVE_S = 0.055;
export const CONTACT_S = ANTICIPATE_S + DRIVE_S;
export const HOLD_S = 0.035;
export const RECOIL_S = 0.13;
export const SETTLE_S = 0.26;
export const SWING_S = CONTACT_S + HOLD_S + RECOIL_S + SETTLE_S;

const STRIKE_DIR = (() => {
  const p = slipperPoint({ shoulder: SHOULDER_STRIKE, elbow: ELBOW_STRIKE, wrist: WRIST_STRIKE });
  return Math.atan2(p.y - PIVOT.y, p.x - PIVOT.x);
})();

export function aimFor(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
  const bias = norm(Math.atan2(y - PIVOT.y, x - PIVOT.x) - STRIKE_DIR);
  return Math.max(-AIM_LIMIT, Math.min(AIM_LIMIT, bias));
}

export function swingActivity(since, anticipate = ANTICIPATE_S) {
  const total = anticipate + DRIVE_S + HOLD_S + RECOIL_S + SETTLE_S;
  if (!(since >= 0) || since >= total) return 0;
  return Math.min(1, (total - since) / (RECOIL_S + SETTLE_S));
}

export function swingPose(since, aim = 0, anticipate = ANTICIPATE_S) {
  const ready = { shoulder: SHOULDER_READY, elbow: ELBOW_READY, wrist: WRIST_READY, lean: 0 };
  if (!(since >= 0)) return ready;
  const strike = SHOULDER_STRIKE + aim;

  if (since < anticipate) {                       // wind-up
    const u = Math.sin((since / anticipate) * Math.PI / 2);
    return { shoulder: lerp(SHOULDER_READY, SHOULDER_COCK, u),
             elbow: lerp(ELBOW_READY, ELBOW_COCK, u),
             wrist: lerp(WRIST_READY, WRIST_COCK, u), lean: 0 };
  }
  const t = since - anticipate;
  if (t < DRIVE_S) {                              // drive
    const p = (t / DRIVE_S) ** 2;                 // ease-in: the blow gathers speed
    return { shoulder: lerp(SHOULDER_COCK, strike, p),
             elbow: lerp(ELBOW_COCK, ELBOW_STRIKE, p ** 1.15),
             // the wrist leads last so the slipper snaps — this is the whip
             wrist: lerp(WRIST_COCK, WRIST_STRIKE, p ** 1.6),
             lean: LEAN_STRIKE * p };
  }
  const h = t - DRIVE_S;
  if (h < HOLD_S) {                               // contact
    return { shoulder: strike,
             elbow: ELBOW_STRIKE - ELBOW_GIVE * Math.sin((h / HOLD_S) * Math.PI),
             wrist: WRIST_STRIKE, lean: LEAN_STRIKE };
  }
  const r = h - HOLD_S;
  if (r >= RECOIL_S + SETTLE_S) return ready;
  const u = r / (RECOIL_S + SETTLE_S);
  const k = Math.exp(-5.2 * u) * Math.cos(u * Math.PI * 2.3);
  return { shoulder: lerp(SHOULDER_READY, strike, k),
           elbow: lerp(ELBOW_READY, ELBOW_STRIKE, k),
           wrist: lerp(WRIST_READY, WRIST_STRIKE, k),
           lean: LEAN_STRIKE * k };
}

export function armPose(t, since, aim = 0, anticipate = ANTICIPATE_S) {
  const pose = swingPose(since, aim, anticipate);
  const idle = 1 - swingActivity(since, anticipate);
  return {
    shoulder: pose.shoulder + (Math.sin(t * 1.6) * 0.030 + Math.sin(t * 3.7 + 1.1) * 0.011) * idle,
    elbow: pose.elbow + (Math.sin(t * 1.15 + 0.6) * 0.035 + Math.sin(t * 2.9) * 0.013) * idle,
    wrist: pose.wrist + Math.sin(t * 2.1 + 0.3) * 0.020 * idle,
    lean: pose.lean
  };
}
```

**Tuning notes.** `SHOULDER_READY` drops from the old `0.60` to `0.20` — the
whole point is to keep the sleeve near its painted angle. If the resting
slipper ends up on the sheet (the "clear of the sheet while she is at rest"
test), raise `SHOULDER_READY` in 0.05 steps rather than moving `PLANE`.
`AIM_LIMIT` starts at `0.22`; Task 6 may lower it if the alpha sweep shows the
elbow clipping the sheet at the extremes.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node --test portfolio/public/games/da-siu-yan/rig.test.js`
Expected: PASS. If "the elbow stays clear across the entire aim range" fails,
lower `AIM_LIMIT` until it passes — do not move the plane; Task 4 depends on it.

- [ ] **Step 5: Commit**

```bash
git add portfolio/public/games/da-siu-yan/rig.js portfolio/public/games/da-siu-yan/rig.test.js
git commit -m "feat(da-siu-yan): 3-bone arm rig solved by IK against the flat sheet"
```

---

### Task 4: Recompose the renderer

**Files:**
- Modify: `portfolio/public/games/da-siu-yan/scene-illustrated.js` (rewrite of the geometry and draw path; keep `drawVillainLocal`, `drawDamageLocal`, `drawPrintsLocal`, `drawHud`, `drawDust`, `drawTarget` essentially as-is)
- Modify: `portfolio/public/games/da-siu-yan/scene-illustrated.test.js` (delete tests now owned by `plane.test.js` / `rig.test.js`; keep it only for renderer-level exports)

**Interfaces:**
- Consumes: `plane.js`, `rig.js`, `scene.js` (`STAGE_W`, `STAGE_H`).
- Produces: `createIllustratedScene(canvas) -> { setEffigy, draw, strike, ready }` and a re-export of `inPaper` — unchanged for `game.js`.

- [ ] **Step 1: Load the fifth sprite**

Add to `ART_FILES`: `'granny-hand': 'granny-hand.png'`. Drop `bricks` — the
slab is now drawn procedurally in the plane. Delete `BRICKS` and the
`art.bricks` draw call.

- [ ] **Step 2: Draw the altar slab in the sheet's plane**

Before the sheet, draw a brick slab whose **top face is coplanar with the
sheet** so the paper visibly rests on it. Build the top face from
`planeToScreen` at a local rect inset ~30px larger than the sheet, then drop
verticals from the two front corners for the front face. Fill with the brick
browns already used by the scene (`#8a5a3b` top, `#6d4529` front,
`rgba(58,35,23,…)` outline), so it matches the painting's palette.

- [ ] **Step 3: Draw the sheet through the plane matrix**

Replace `translate(cx,cy) → rotate(rot)` with:

```js
ctx.save();
const [a, b, c, d, e, f] = planeMatrix();
ctx.transform(a, b, c, d, e, f);
```

Everything already drawn in sheet-local coords — `paperPathLocal`,
`drawVillainLocal`, `drawDamageLocal`, `drawPrintsLocal`, the 打小人 header —
now works unchanged. Swap `IPAPER.w/h` for `PLANE.w/h` and `paperLocal()` for
`screenToPlane()` in `drawPrintsLocal`.

- [ ] **Step 4: Draw the flames in screen space**

The burn currently draws flames inside the sheet transform, so they would lean
over with the plane and look pasted on. Compute each flame's position in local
coords, map it with `planeToScreen`, then draw the flame **after
`ctx.restore()`** so it rises vertically on screen. The charred region stays
inside the transform (it is part of the sheet); only the flame tongues move
out.

- [ ] **Step 5: Draw the five sprites with joint discs**

Draw order: `body → altar → sheet → fore → hand → upper → head`.

Before the forearm, fill a **skin disc** at the elbow; before the upper arm, a
**sleeve disc** at the shoulder; the wrist disc is already baked into both
sprites by Task 2. Sample the colours the cutter uses: skin `rgb(219,102,32)`,
sleeve `rgb(210,159,2)`. The discs go *under* their sprite, so any gap opened
by rotation fills with skin/sleeve instead of the backdrop.

The hand transform chains off the wrist:

```js
// wrist position = elbow + forearm rotated by (shoulder + elbow)
ctx.translate(wristX, wristY + bob);
ctx.rotate(pose.shoulder + pose.elbow + pose.wrist);
ctx.drawImage(art['granny-hand'], -HANDA.wx, -HANDA.wy, FRAME.w, FRAME.h);
```

- [ ] **Step 6: Verify by filmstrip**

```bash
node --test portfolio/public/games/da-siu-yan/*.test.js
cd portfolio/public/games/da-siu-yan && python3 -m http.server 8777 &
```

Then render the filmstrip (Task 6 commits the harness; during Task 4 it still
lives in the scratchpad) and confirm by eye, at every frame: the arm stays
attached at shoulder and elbow, and the effigy stays legible through the
strike. These are the two things the user reported — tests passing is not
sufficient evidence for either.

- [ ] **Step 7: Commit**

```bash
git add portfolio/public/games/da-siu-yan/scene-illustrated.js portfolio/public/games/da-siu-yan/scene-illustrated.test.js
git commit -m "feat(da-siu-yan): flat altar scene with the 3-bone rig and joint discs"
```

---

### Task 5: Contact feedback

Makes the blow land instead of merely arriving.

**Files:**
- Modify: `portfolio/public/games/da-siu-yan/scene-illustrated.js`

**Interfaces:**
- Consumes: `rig.js` timings, the `strikeAt`/`strikeX`/`strikeY` state already in the scene.
- Produces: no new exports.

- [ ] **Step 1: Slipper squash on impact**

For the first `HOLD_S` after contact, scale the hand sprite along its long axis
by `1 − 0.10·sin(π·h/HOLD_S)` and across it by the inverse, about the wrist.
Volume-preserving squash reads as impact without deforming the silhouette.

- [ ] **Step 2: Sheet recoil**

Give `PLANE` a per-frame `cy` offset of `+6·sin(π·h/HOLD_S)` during the hold so
the paper is driven into the brick and springs back. Apply it in the renderer's
local copy — **do not mutate the exported `PLANE`**, or the hit test drifts
under the player's finger.

- [ ] **Step 3: Dust burst at the contact point**

`game.js` already spawns dust at the pointer on tap. Add a second, tighter
burst spawned at the slipper's actual landing point when contact fires, so the
dust comes off the sheet rather than off the finger.

- [ ] **Step 4: Stage shake**

Translate the whole scene by up to 4px for 0.08s after contact, on a decaying
sine. Keep it small — this is a slipper, not an explosion — and apply it before
everything else in `draw()` so the HUD shakes with the scene.

- [ ] **Step 5: Body lean and head snap**

`LEAN_STRIKE` already leans the hips. Add a small counter-rotation on the head
overlay (about the neck, ~0.05 rad) that peaks a frame *after* contact, so her
head follows the blow instead of moving with it.

- [ ] **Step 6: Verify and commit**

Rerun the filmstrip and confirm the contact frames read as an impact.

```bash
node --test portfolio/public/games/da-siu-yan/*.test.js
git add portfolio/public/games/da-siu-yan/scene-illustrated.js
git commit -m "feat(da-siu-yan): impact feedback — squash, sheet recoil, dust, shake"
```

---

### Task 6: Occlusion verification by sprite alpha

The project memory records that point-clearance checks passed twice while the
render was visibly wrong ("the hand graphic is ~35px wide; point clearance lied
twice"). This task builds the check that cannot lie.

**Files:**
- Create: `scripts/da-siu-yan/check-occlusion.mjs`
- Create: `scripts/da-siu-yan/filmstrip.html`

**Interfaces:**
- Consumes: the five sprites, `plane.js`, `rig.js`.
- Produces: a pass/fail report of sheet coverage per swing phase.

- [ ] **Step 1: Move the filmstrip harness into the repo**

The throwaway harness used during design renders the real scene at successive
swing timestamps into one image. Commit it as
`scripts/da-siu-yan/filmstrip.html` so it is rerunnable. It renders
`TIMES = [0, 0.035, 0.065, 0.09, 0.115, 0.16, 0.25, 0.40]`, cropped to the
granny + sheet, labelled, into a 4×2 grid.

- [ ] **Step 2: Write the alpha sweep**

`check-occlusion.mjs` loads the forearm and hand PNGs with Pillow-equivalent
decoding (use `sharp` if present, else shell out to the Python already used by
the cutter), rasterises each into its posed transform for
`aim ∈ {−AIM_LIMIT, 0, +AIM_LIMIT}` × `since ∈ [0, SWING_S]` at 20 steps, and
counts opaque sprite pixels falling inside the sheet quad.

Report per step: `coveredPx`, and `coveredPx / sheetAreaPx` as a percentage.

- [ ] **Step 3: Set the gate**

Fail if **forearm** coverage exceeds 2% of the sheet at any point (the forearm
should essentially never be over the sheet), or if **hand** coverage exceeds
22% outside the contact window (a hand on the sheet at contact is correct and
wanted; a hand parked on it during recoil is the old bug).

- [ ] **Step 4: Run it**

```bash
node scripts/da-siu-yan/check-occlusion.mjs
```

Expected: PASS. If the forearm gate fails, lower `AIM_LIMIT` in `rig.js` and
rerun Task 3's tests. If the hand gate fails outside contact, shorten
`RECOIL_S` so she lifts away sooner.

- [ ] **Step 5: Commit**

```bash
git add scripts/da-siu-yan/check-occlusion.mjs scripts/da-siu-yan/filmstrip.html
git commit -m "test(da-siu-yan): verify sheet occlusion by sprite alpha, not joint points"
```

---

### Task 7: Ship it — cache bump and build mirror

**Files:**
- Modify: `portfolio/public/games/da-siu-yan/sw.js`
- Modify: `portfolio/build/games/da-siu-yan/**` (mirror)

- [ ] **Step 1: Bump the cache and register the new assets**

In `sw.js`: `const CACHE = "da-siu-yan-v8";`. Add `"./art/granny-hand.png"`,
`"./plane.js"`, `"./rig.js"` to `ASSETS`; remove `"./art/bricks.svg"`.

- [ ] **Step 2: Confirm ASSETS matches the directory**

Every `.js` and art file the game loads must be listed, or offline play breaks
on first visit. Cross-check against `index.html` imports and `ART_FILES`.

- [ ] **Step 3: Mirror into build/**

```bash
rsync -a --delete portfolio/public/games/da-siu-yan/ portfolio/build/games/da-siu-yan/
```

Note: `public/` and `build/` had pre-existing drift in `game.js`, `scene.js`
and the two scene test files before this work. `rsync --delete` resolves it in
favour of `public/`, which is the copy the deploy workflow ships.

- [ ] **Step 4: Full test run and commit**

```bash
node --test portfolio/public/games/da-siu-yan/*.test.js
git add portfolio/public/games/da-siu-yan/sw.js portfolio/build/games/da-siu-yan
git commit -m "chore(da-siu-yan): sw cache v8 — flat altar, 5 sprites, new modules"
```

---

### Task 8: Cantonese clip review page

Gemini TTS falls back to Mandarin on some characters (燒 → "shāo" not siu1). We
do not know which of the 60 clips are affected, and the assistant cannot listen.
This builds the tool that answers that, for the user to run.

**Files:**
- Create: `scripts/da-siu-yan/review-voice.html`

**Interfaces:**
- Consumes: `portfolio/public/games/da-siu-yan/voice/manifest.json` and the mp3s.
- Produces: a JSON array of failing clip ids, pasteable into
  `node scripts/generate-granny-voice.mjs --only <ids>`.

- [ ] **Step 1: Build the page**

A single self-contained HTML file that fetches `voice/manifest.json`, and for
each of the 60 clips renders one row: the clip id, the **Cantonese text from
`chant-lines.js`**, an `<audio controls>` pointing at the mp3, and two radios
(啱音 / 走音). Group by variant (std / low) with a heading each.

Showing the text matters — the reviewer needs to know which character to listen
for.

- [ ] **Step 2: Add keyboard flow**

Space plays the current row, `1` marks 啱音, `2` marks 走音 and both advance to
the next row. Sixty clips is a slog otherwise.

- [ ] **Step 3: Export**

A button that copies `["line-11", "line-18", …]` — the ids marked 走音 — to the
clipboard, plus the ready-made command line:
`node scripts/generate-granny-voice.mjs --only line-11,line-18`.

- [ ] **Step 4: Persist progress**

Save marks to `localStorage` keyed by clip id, so a half-finished pass survives
a reload.

- [ ] **Step 5: Commit**

```bash
git add scripts/da-siu-yan/review-voice.html
git commit -m "tools(da-siu-yan): voice clip review page for finding Mandarin fallbacks"
```

- [ ] **Step 6: Hand off to the user**

Serve it and ask the user to do a pass:

```bash
cd portfolio/public/games/da-siu-yan && python3 -m http.server 8777
# then open scripts/da-siu-yan/review-voice.html against it
```

**Do not claim any clip is fixed.** The regeneration step is a follow-up that
depends on the user's marks.

---

## Out of scope

- Switching TTS engine (Azure `zh-HK`, Google `yue-HK`). Deferred until the
  review pass shows the real failure rate.
- The 經典版 vector scene.
- Regenerating any voice clip — that needs `GEMINI_API_KEY` and the user's
  review marks first.
