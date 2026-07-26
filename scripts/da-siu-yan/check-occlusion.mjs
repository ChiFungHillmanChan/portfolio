#!/usr/bin/env node
// Occlusion gate for da-siu-yan, verified by rendered sprite alpha rather
// than joint coordinates. Project memory records point-clearance checks
// giving false passes twice on this exact rig: "the hand graphic is ~35px
// wide; point clearance lied twice" — a joint that clears the sheet by 35px
// can still sit under a sprite that is 35px wide at that point. This script
// cannot make that mistake: it decodes the real PNG alpha channels for the
// forearm and hand sprites, poses them through the SAME transform chain
// scene-illustrated.js uses to draw them (elbow/wrist IK from rig.js, the
// lean-in wrap, the contact squash), and counts opaque pixels that land
// inside the sheet's actual screen quad from plane.js.
//
// Usage:  node scripts/da-siu-yan/check-occlusion.mjs
// Exit code: 0 = PASS, 1 = FAIL (gate is CI-ready once this repo has one).
// Test:   node --test scripts/da-siu-yan/check-occlusion.test.js
//         (exercises the pure evaluate() gate below with synthetic series,
//         including a reconstruction of the ORIGINAL "arm parked on the
//         paper" bug — no Python/sprite decoding involved, so it's fast.)
//
// This file is read-only tooling: it imports rig.js/plane.js but never
// modifies them. It does NOT run scene-illustrated.js (that file drives an
// HTMLCanvasElement, which Node doesn't have) — instead it mirrors the two
// draw calls (drawGrannyFront's forearm and hand branches) by hand. Two
// details in scene-illustrated.js are NOT structural constants exported by
// rig.js, so they are re-derived here and cross-checked against the source
// text so this script cannot silently drift from what actually renders:
//   - FLIP_HAND: read straight out of scene-illustrated.js's source (see
//     readFlipHand below), instead of being hard-coded.
//   - the contact squash factor (1 - 0.10*sin(pi*hc/HOLD_S)) and HAND_ANG
//     (the wrist->slipper axis it squashes about): these true canvas calls
//     can't be introspected the same way, so they are transcribed here by
//     hand from scene-illustrated.js's drawGrannyFront. If that function's
//     squash math changes, this script's mirror has to change with it.
//
// Deliberately NOT modelled: the small clipped "joint stub" re-draws at the
// elbow (r=26) and shoulder (r=50) that plug the sleeve socket (see
// scene-illustrated.js's jointStub calls). Those are tiny discs anchored at
// the joints specifically so they stay under the sleeve; they are not the
// "arm swings across the paper" failure mode this gate targets. If a future
// change moves those joints down near the sheet, this is a known gap — see
// the report's self-review.
//
// ── Fix Round 1 (2026-07-26) ────────────────────────────────────────────
// The first cut of this gate used the plan's original thresholds (forearm
// <=2% anywhere, hand <=22% "outside the contact window" where the window
// was JUST [CONTACT_S, CONTACT_S+HOLD_S], i.e. no liftoff time at all). Both
// failed against real geometry — but the failure was a coordinate error in
// the *gate*, not the rig: a shoe cannot teleport off the paper the instant
// HOLD_S ends, and the measured breach was entirely a spike 11ms after the
// window closed, gone again by 38ms after. The window below adds a budgeted
// liftoff grace instead of assuming instantaneous liftoff.
//
// ── Fix Round 2 (2026-07-26) ────────────────────────────────────────────
// Re-verifying Round 1's fix surfaced the mirror-image error: the window's
// LEADING edge sat at exactly CONTACT_S, with the same "instantaneous"
// assumption Round 1 had already corrected on the trailing edge — except
// here it's the sprite's leading edge reaching the sheet before the wrist
// anchor's own scripted timestamp, not liftoff travel time. APPROACH_GRACE_S
// budgets that. Two independently measured, independently justified grace
// constants are the limit here — a third would mean the motion itself needs
// fixing, not the gate. See task-6-report.md's Fix Round 1 and Fix Round 2
// sections for the full adjudication and evidence on both.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(HERE, '../../portfolio/public/games/da-siu-yan');
const ART = path.join(GAME, 'art');

const { PLANE, planeQuad, inPaper } = await import(pathToFileURL(path.join(GAME, 'plane.js')).href);
const {
  FRAME, PIVOT, HIP, FOREA, HANDA,
  elbowAt, wristAt, armPose, swingActivity,
  AIM_LIMIT, SWING_S, CONTACT_S, HOLD_S, ANTICIPATE_S
} = await import(pathToFileURL(path.join(GAME, 'rig.js')).href);

// ── the gate window and thresholds ──────────────────────────────────────
// STRIKE_WINDOW = when the slipper touching the sheet is the FEATURE, not a
// bug. CONTACT_S..CONTACT_S+HOLD_S is the scripted contact + hold, widened
// on BOTH sides for real sprite extent — CONTACT_S/HOLD_S describe the IK
// wrist anchor's schedule, not the moment the painted slipper's silhouette
// (which has real size, ~123px) actually starts or stops touching the sheet.
//
// LIFTOFF_GRACE_S (trailing edge): the shoe cannot teleport off the paper
// the instant HOLD_S ends — recoil has to physically carry it clear of the
// sheet's footprint, which takes real time. Measured (and visually
// confirmed against a headless-Chrome render, see task-6-report.md) the
// slipper is still resting on the sheet's corner 25ms after HOLD_S ends and
// fully clear by 38ms after, so 40ms gives that with a small margin.
// Fix Round 1: the original gate gave zero grace here, which made this
// physically-necessary travel time look like the "hand parked on the
// sheet" bug it was actually meant to catch.
//
// APPROACH_GRACE_S (leading edge): the mirror-image error, found while
// re-verifying Round 1's fix. The slipper sprite's leading edge reaches the
// sheet before the wrist anchor hits the nominal CONTACT_S timestamp — the
// sprite has extent, the anchor is a point. The 200-step confirmation sweep
// measured the true onset at since=0.0813, i.e. 8.7ms before CONTACT_S
// (0.090); 12ms budgets that with margin. Fix Round 2: the Round 1 window
// set STRIKE_LO to exactly CONTACT_S with no grace on this side either,
// which made this same category of error look like a NEW bug rather than
// the mirror of the one just fixed.
//
// WHY THIS IS NOT "WIDEN UNTIL GREEN": the window still requires ZERO
// coverage across since=[0, 0.078) and (0.165, SWING_S] — roughly 68% of
// the swing's 0.515s, including the entire wind-up, most of the drive, and
// most of the recoil and settle. The ORIGINAL defect (a broad forearm
// plateau across since~0.05 through ~0.20, not a spike — see
// check-occlusion.test.js's "broad-plateau" case) lands substantial
// coverage in BOTH forbidden zones and still fails this gate. Only the
// narrow interval where the shoe is genuinely in contact with the paper is
// exempted, and by design that interval is bounded by the two independently
// measured, independently justified grace constants above — not tuned to
// swallow whatever the current geometry happens to produce.
const LIFTOFF_GRACE_S = 0.040;
const APPROACH_GRACE_S = 0.012;
export const STRIKE_LO = CONTACT_S - APPROACH_GRACE_S;
export const STRIKE_HI = CONTACT_S + HOLD_S + LIFTOFF_GRACE_S;

// Inside the strike window, the shoe (and a sliver of forearm right at
// contact) touching the sheet is the slap landing — these caps only catch a
// grossly oversized overlap (e.g. the whole hand buried in the sheet), not
// contact itself.
export const HAND_IN_WINDOW_MAX_PCT = 40;
export const FOREARM_IN_WINDOW_MAX_PCT = 5;

// Outside the strike window there is no legitimate reason for either sprite
// to touch the sheet — this IS the "arm/hand parked on the paper" bug the
// whole task exists to catch, so the cap is as close to zero as floating
// point and sprite antialiasing allow, not a lenient allowance. 0.02% of the
// sheet (~10px of a 51,000px sheet) is sized for a stray antialiased edge
// pixel, not for real coverage: every genuine overlap measured on this rig
// so far — inside or outside any window — has been >=0.8% (415px+), two
// orders of magnitude above this tolerance, so it cannot hide one.
export const OUTSIDE_WINDOW_TOLERANCE_PCT = 0.02;

// ── the gate itself: a pure function over pre-measured samples ─────────────
// Deliberately has no I/O and touches nothing but its argument, so it can be
// unit-tested (check-occlusion.test.js) against synthetic series — including
// a reconstruction of the original bug — without paying for Python/PNG
// decoding or the sprite sweep on every test run.
export function evaluate(samples) {
  const failures = [];
  for (const s of samples) {
    const inWindow = s.since >= STRIKE_LO && s.since <= STRIKE_HI;
    // "before" vs "after" only matters for the failure message: a breach on
    // the low side is the swing's incoming approach, not liftoff/recoil —
    // conflating the two in the text would misdescribe exactly the kind of
    // failure this gate is meant to name precisely.
    const side = s.since < STRIKE_LO ? 'before the window opens (windup approach)' : 'after the window closes (recoil)';
    const foreLimit = inWindow ? FOREARM_IN_WINDOW_MAX_PCT : OUTSIDE_WINDOW_TOLERANCE_PCT;
    const handLimit = inWindow ? HAND_IN_WINDOW_MAX_PCT : OUTSIDE_WINDOW_TOLERANCE_PCT;
    if (s.forearmPct > foreLimit) {
      failures.push({
        metric: 'forearm', aim: s.aim, since: s.since, inWindow, pct: s.forearmPct, limit: foreLimit,
        reason: `forearm ${s.forearmPct.toFixed(3)}% > ${foreLimit}% cap at aim=${s.aim}, since=${s.since} ` +
          (inWindow ? '(inside strike window)' : `(arm on the paper ${side})`)
      });
    }
    if (s.handPct > handLimit) {
      failures.push({
        metric: 'hand', aim: s.aim, since: s.since, inWindow, pct: s.handPct, limit: handLimit,
        reason: `hand ${s.handPct.toFixed(3)}% > ${handLimit}% cap at aim=${s.aim}, since=${s.since} ` +
          (inWindow ? '(inside strike window)' : `(hand on the paper ${side})`)
      });
    }
  }
  return { pass: failures.length === 0, failures };
}

// Everything below only runs when this file is executed directly, not when
// check-occlusion.test.js imports evaluate() from it — see the isMain check
// at the very bottom of the file (it has to come after every const/function
// this depends on: main() is a hoisted function declaration so it's safe to
// define here, but calling it before PY_DECODE's `const` below has been
// evaluated would throw a temporal-dead-zone ReferenceError).
async function main() {
  // ── cross-check FLIP_HAND against the actual renderer source ─────────────
  const FLIP_HAND = readFlipHand();
  if (FLIP_HAND) {
    throw new Error(
      'scene-illustrated.js now sets FLIP_HAND = true. This script only mirrors ' +
      'the FLIP_HAND = false path (mirror across HAND_ANG is not modelled) — ' +
      'update countHandCoverage() before trusting its numbers.'
    );
  }
  const HAND_ANG = Math.atan2(HANDA.sly - HANDA.wy, HANDA.slx - HANDA.wx);

  const FORE = decodeAlpha('forearm', 'granny-arm-fore.png');
  const HAND = decodeAlpha('hand', 'granny-hand.png');

  // FRAME.w/h are the on-screen sprite size (525x799 source * SCALE); the
  // scale actually used by ctx.drawImage(img, dx, dy, FRAME.w, FRAME.h) is
  // FRAME.{w,h} / the image's own natural size — computed from the decoded
  // size rather than assumed, so this can't drift from SCALE in rig.js.
  const foreScaleX = FRAME.w / FORE.w, foreScaleY = FRAME.h / FORE.h;
  const handScaleX = FRAME.w / HAND.w, handScaleY = FRAME.h / HAND.h;

  // A pixel counts as "opaque sprite" at alpha >= 128 (majority-opaque): the
  // cut sprites have a few px of antialiased feather at every silhouette
  // edge, and a pixel that's e.g. 8/255 opaque is not visually "the hand
  // covering the sheet" — it is imperceptible against the sheet's own
  // colour. 128 is the standard >50% cut used to separate real coverage
  // from AA fringe. (Sensitivity-checked down to alpha>=1: changes the
  // measured maxima by <1 percentage point — see task-6-report.md.)
  const OPAQUE_THRESHOLD = 128;

  const rot = (x, y, a) => {
    const c = Math.cos(a), s = Math.sin(a);
    return { x: x * c - y * s, y: x * s + y * c };
  };

  // leanIn(): scene-illustrated.js wraps both the forearm and hand draws in
  // a rotate-about-HIP by pose.lean before anything else in drawGrannyFront.
  function leanIn(x, y, lean) {
    const c = Math.cos(lean), s = Math.sin(lean);
    const dx = x - HIP.x, dy = y - HIP.y;
    return { x: HIP.x + dx * c - dy * s, y: HIP.y + dx * s + dy * c };
  }

  // Mirrors scene-illustrated.js#drawGrannyFront's forearm branch:
  //   jointStub(...)  <- NOT modelled, see file header
  //   ctx.translate(el.x, el.y + bob);
  //   ctx.rotate(pose.shoulder + pose.elbow);
  //   ctx.drawImage(art['granny-arm-fore'], -FOREA.ex, -FOREA.ey, FRAME.w, FRAME.h);
  // all inside leanIn(pose).
  function countForearmCoverage(pose, bob) {
    const theta = pose.shoulder + pose.elbow;
    const el = elbowAt(pose.shoulder);
    const originX = el.x, originY = el.y + bob;
    const { alpha, w, h } = FORE;
    let covered = 0, opaque = 0;
    for (let y = 0; y < h; y++) {
      const ly = -FOREA.ey + y * foreScaleY;
      const row = y * w;
      for (let x = 0; x < w; x++) {
        if (alpha[row + x] < OPAQUE_THRESHOLD) continue;
        opaque++;
        const lx = -FOREA.ex + x * foreScaleX;
        const r = rot(lx, ly, theta);
        const p = leanIn(originX + r.x, originY + r.y, pose.lean);
        if (inPaper(p.x, p.y)) covered++;
      }
    }
    return { covered, opaque };
  }

  // Mirrors scene-illustrated.js#drawGrannyFront's hand branch:
  //   ctx.translate(wr.x, wr.y + bob);
  //   ctx.rotate(pose.shoulder + pose.elbow + pose.wrist);
  //   [FLIP_HAND is false — mirror not modelled, checked above]
  //   if (hc in [0, HOLD_S)):
  //     ctx.rotate(HAND_ANG); ctx.scale(squash, 1/squash); ctx.rotate(-HAND_ANG);
  //   ctx.drawImage(art['granny-hand'], -HANDA.wx, -HANDA.wy, FRAME.w, FRAME.h);
  // all inside leanIn(pose). Canvas transforms compose local-to-parent in the
  // order listed, so undoing them to reach world space applies
  // rotate(-HAND_ANG) first (closest to drawImage), then the scale, then
  // rotate(HAND_ANG), then theta.
  function countHandCoverage(pose, bob, hc) {
    const theta = pose.shoulder + pose.elbow + pose.wrist;
    const wr = wristAt(pose.shoulder, pose.elbow);
    const originX = wr.x, originY = wr.y + bob;
    const squashActive = hc >= 0 && hc < HOLD_S;
    const squash = squashActive ? 1 - 0.10 * Math.sin(Math.PI * hc / HOLD_S) : 1;
    const { alpha, w, h } = HAND;
    let covered = 0, opaque = 0;
    for (let y = 0; y < h; y++) {
      const ly0 = -HANDA.wy + y * handScaleY;
      const row = y * w;
      for (let x = 0; x < w; x++) {
        if (alpha[row + x] < OPAQUE_THRESHOLD) continue;
        opaque++;
        let lx = -HANDA.wx + x * handScaleX, ly = ly0;
        if (squashActive) {
          let p = rot(lx, ly, -HAND_ANG);
          p = { x: p.x * squash, y: p.y / squash };
          p = rot(p.x, p.y, HAND_ANG);
          lx = p.x; ly = p.y;
        }
        const r = rot(lx, ly, theta);
        const p2 = leanIn(originX + r.x, originY + r.y, pose.lean);
        if (inPaper(p2.x, p2.y)) covered++;
      }
    }
    return { covered, opaque };
  }

  // ── the sheet's true screen area, from the same quad inPaper hit-tests ───
  function polygonArea(pts) {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      a += p.x * q.y - q.x * p.y;
    }
    return Math.abs(a) / 2;
  }
  const sheetAreaPx = polygonArea(planeQuad(PLANE));

  function measure(aim, since) {
    const pose = armPose(since, since, aim, ANTICIPATE_S);
    const bob = Math.sin(since * 1.7) * 3 * (1 - swingActivity(since, ANTICIPATE_S));
    const hc = since - CONTACT_S;
    const fore = countForearmCoverage(pose, bob);
    const hand = countHandCoverage(pose, bob, hc);
    return {
      aim, since,
      forearmPct: (fore.covered / sheetAreaPx) * 100,
      forearmPx: fore.covered,
      handPct: (hand.covered / sheetAreaPx) * 100,
      handPx: hand.covered
    };
  }

  // ── the required sweep: aim in {-AIM_LIMIT, 0, AIM_LIMIT}, since stepped
  // across [0, SWING_S] in 20 steps. t = since throughout: a single clean,
  // unmashed blow thrown at t=0 (the same convention filmstrip.html uses),
  // so armPose's idle-wobble term and bob are evaluated at the same clock as
  // the swing itself. ──────────────────────────────────────────────────────
  const AIMS = [-AIM_LIMIT, 0, AIM_LIMIT];
  const STEPS = 20;
  const SINCE_VALUES = Array.from({ length: STEPS }, (_, i) => (i / (STEPS - 1)) * SWING_S);
  const rows = [];
  for (const aim of AIMS) for (const since of SINCE_VALUES) rows.push(measure(aim, since));

  // ── a finer confirmation sweep across the FULL range (200 steps), so the
  // 20-step grid's maxima aren't an artefact of stepping over a narrow spike
  // (e.g. right as the hand lifts off after the strike window closes). This
  // does not replace the required 20-step table above — evaluate() gates on
  // BOTH independently, and the report below shows both. ────────────────────
  const FINE_STEPS = 200;
  const fineRows = [];
  for (const aim of AIMS) {
    for (let i = 0; i < FINE_STEPS; i++) {
      fineRows.push(measure(aim, (i / (FINE_STEPS - 1)) * SWING_S));
    }
  }

  // ── report ─────────────────────────────────────────────────────────────
  const fmt = (n, d = 3) => n.toFixed(d);
  console.log(`sheet area: ${sheetAreaPx.toFixed(0)} px  |  forearm sprite: ${FORE.w}x${FORE.h}  |  hand sprite: ${HAND.w}x${HAND.h}`);
  console.log(`strike window: since in [${STRIKE_LO.toFixed(3)}, ${STRIKE_HI.toFixed(3)}]  |  SWING_S=${SWING_S.toFixed(3)}  |  AIM_LIMIT=${AIM_LIMIT}`);
  console.log('');
  console.log('aim      since    inWindow  forearm%   forearmPx   hand%      handPx');
  for (const r of rows) {
    const inWindow = r.since >= STRIKE_LO && r.since <= STRIKE_HI;
    console.log(
      `${fmt(r.aim, 3).padStart(7)}  ${fmt(r.since, 3).padStart(6)}  ${String(inWindow).padStart(8)}  ` +
      `${fmt(r.forearmPct, 4).padStart(8)}  ${String(r.forearmPx).padStart(9)}  ` +
      `${fmt(r.handPct, 4).padStart(8)}  ${String(r.handPx).padStart(8)}`
    );
  }

  const allRows = [...rows, ...fineRows];
  const maxOf = (arr, key, pred = () => true) =>
    arr.filter(pred).reduce((m, r) => (!m || r[key] > m[key]) ? r : m, null);
  const inWin = (r) => r.since >= STRIKE_LO && r.since <= STRIKE_HI;
  const maxForeIn = maxOf(allRows, 'forearmPct', inWin);
  const maxForeOut = maxOf(allRows, 'forearmPct', (r) => !inWin(r));
  const maxHandIn = maxOf(allRows, 'handPct', inWin);
  const maxHandOut = maxOf(allRows, 'handPct', (r) => !inWin(r));

  console.log('');
  console.log('── summary (20-step + 200-step confirmation combined) ─────────────────');
  console.log(`max forearm INSIDE window:  ${fmt(maxForeIn.forearmPct, 4)}%  at aim=${fmt(maxForeIn.aim, 3)}, since=${fmt(maxForeIn.since, 3)}`);
  console.log(`max forearm OUTSIDE window: ${fmt(maxForeOut.forearmPct, 4)}%  at aim=${fmt(maxForeOut.aim, 3)}, since=${fmt(maxForeOut.since, 3)}`);
  console.log(`max hand    INSIDE window:  ${fmt(maxHandIn.handPct, 4)}%  at aim=${fmt(maxHandIn.aim, 3)}, since=${fmt(maxHandIn.since, 3)}`);
  console.log(`max hand    OUTSIDE window: ${fmt(maxHandOut.handPct, 4)}%  at aim=${fmt(maxHandOut.aim, 3)}, since=${fmt(maxHandOut.since, 3)}`);

  // ── the gate: required 20-step grid is the primary gate; the 200-step
  // sweep must ALSO pass (confirmation), otherwise a defect a coarser grid
  // stepped over would silently ship. ───────────────────────────────────────
  const primary = evaluate(rows);
  const confirmation = evaluate(fineRows);
  const pass = primary.pass && confirmation.pass;

  console.log('');
  console.log(`gate (required 20-step grid):        ${primary.pass ? 'pass' : 'FAIL'}`);
  for (const f of primary.failures) console.log(`  - ${f.reason}`);
  console.log(`gate (200-step confirmation sweep):  ${confirmation.pass ? 'pass' : 'FAIL'}`);
  for (const f of confirmation.failures) console.log(`  - ${f.reason}`);

  console.log('');
  console.log(pass ? 'PASS' : 'FAIL');
  process.exit(pass ? 0 : 1);
}

// ── cross-check FLIP_HAND against the actual renderer source ───────────────
function readFlipHand() {
  const src = readFileSync(path.join(GAME, 'scene-illustrated.js'), 'utf8');
  const m = src.match(/const\s+FLIP_HAND\s*=\s*(true|false)\s*;/);
  if (!m) {
    throw new Error(
      'check-occlusion.mjs: could not find "const FLIP_HAND = true|false;" in ' +
      'scene-illustrated.js. That file changed shape — update the FLIP_HAND ' +
      'regex (and re-check the squash/HAND_ANG mirror below) before trusting ' +
      'this script\'s numbers.'
    );
  }
  return m[1] === 'true';
}

// ── decode the two sprites' alpha channels via Pillow ───────────────────────
// No npm image-decoding dependency exists in this repo (by design — see
// task brief); Python 3 + Pillow is already a build-time dependency of
// cut-granny-sprites.py, so this shells out to it rather than hand-rolling a
// PNG inflate/defilter in JS.
const PY_DECODE = `
import sys, json
from PIL import Image
jobs = json.loads(sys.argv[1])
out = []
for job in jobs:
    im = Image.open(job['src']).convert('RGBA')
    w, h = im.size
    alpha = im.split()[3].tobytes()
    with open(job['out'], 'wb') as f:
        f.write(alpha)
    out.append({'name': job['name'], 'w': w, 'h': h})
print(json.dumps(out))
`;

function decodeAlpha(name, file) {
  const outPath = path.join(os.tmpdir(), `da-siu-yan-occlusion-${name}.alpha`);
  const stdout = execFileSync('python3', ['-c', PY_DECODE, JSON.stringify([
    { name, src: path.join(ART, file), out: outPath }
  ])], { encoding: 'utf8' });
  const [meta] = JSON.parse(stdout);
  const buf = readFileSync(outPath);
  return { alpha: buf, w: meta.w, h: meta.h };
}

// ── entry point: only runs when this file is executed directly, not when
// check-occlusion.test.js imports evaluate()/STRIKE_LO/etc. from it. ───────
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  await main();
}
