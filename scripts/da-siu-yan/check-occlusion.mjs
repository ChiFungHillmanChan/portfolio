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

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(HERE, '../../portfolio/public/games/da-siu-yan');
const ART = path.join(GAME, 'art');

const { PLANE, planeQuad, inPaper } = await import(pathToFileURL(path.join(GAME, 'plane.js')).href);
const {
  FRAME, PIVOT, HIP, FOREA, HANDA,
  elbowAt, wristAt, armPose, swingActivity,
  AIM_LIMIT, SWING_S, CONTACT_S, HOLD_S, ANTICIPATE_S
} = await import(pathToFileURL(path.join(GAME, 'rig.js')).href);

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
const FLIP_HAND = readFlipHand();
if (FLIP_HAND) {
  throw new Error(
    'scene-illustrated.js now sets FLIP_HAND = true. This script only mirrors ' +
    'the FLIP_HAND = false path (mirror across HAND_ANG is not modelled) — ' +
    'update countHandCoverage() before trusting its numbers.'
  );
}
const HAND_ANG = Math.atan2(HANDA.sly - HANDA.wy, HANDA.slx - HANDA.wx);

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

const FORE = decodeAlpha('forearm', 'granny-arm-fore.png');
const HAND = decodeAlpha('hand', 'granny-hand.png');

// FRAME.w/h are the on-screen sprite size (525x799 source * SCALE); the
// scale actually used by ctx.drawImage(img, dx, dy, FRAME.w, FRAME.h) is
// FRAME.{w,h} / the image's own natural size — computed from the decoded
// size rather than assumed, so this can't drift from SCALE in rig.js.
const foreScaleX = FRAME.w / FORE.w, foreScaleY = FRAME.h / FORE.h;
const handScaleX = FRAME.w / HAND.w, handScaleY = FRAME.h / HAND.h;

// A pixel counts as "opaque sprite" at alpha >= 128 (majority-opaque): the
// cut sprites have a few px of antialiased feather at every silhouette edge,
// and a pixel that's e.g. 8/255 opaque is not visually "the hand covering
// the sheet" — it is imperceptible against the sheet's own colour. 128 is
// the standard >50% cut used to separate real coverage from AA fringe.
const OPAQUE_THRESHOLD = 128;

const rot = (x, y, a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: x * c - y * s, y: x * s + y * c };
};

// leanIn(): scene-illustrated.js wraps both the forearm and hand draws in a
// rotate-about-HIP by pose.lean before anything else in drawGrannyFront.
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
// order listed, so undoing them to reach world space applies rotate(-HAND_ANG)
// first (closest to drawImage), then the scale, then rotate(HAND_ANG), then theta.
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

// ── the sheet's true screen area, from the same quad inPaper hit-tests ─────
function polygonArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}
const sheetAreaPx = polygonArea(planeQuad(PLANE));

// ── the sweep ────────────────────────────────────────────────────────────
// t = since throughout: a single clean, unmashed blow thrown at t=0 (the
// same convention scripts/da-siu-yan/filmstrip.html and the design harness
// it was adapted from both use), so armPose's idle-wobble term and bob are
// evaluated at the same clock as the swing itself.
const AIMS = [-AIM_LIMIT, 0, AIM_LIMIT];
const STEPS = 20;
const SINCE_VALUES = Array.from({ length: STEPS }, (_, i) => (i / (STEPS - 1)) * SWING_S);
const contactLo = CONTACT_S, contactHi = CONTACT_S + HOLD_S;

const rows = [];
for (const aim of AIMS) {
  for (const since of SINCE_VALUES) {
    const pose = armPose(since, since, aim, ANTICIPATE_S);
    const bob = Math.sin(since * 1.7) * 3 * (1 - swingActivity(since, ANTICIPATE_S));
    const hc = since - CONTACT_S;
    const inContact = since >= contactLo && since <= contactHi;
    const fore = countForearmCoverage(pose, bob);
    const hand = countHandCoverage(pose, bob, hc);
    rows.push({
      aim, since, inContact,
      forePct: (fore.covered / sheetAreaPx) * 100,
      forePx: fore.covered,
      handPct: (hand.covered / sheetAreaPx) * 100,
      handPx: hand.covered
    });
  }
}

// ── a finer confirmation sweep around the post-hold recoil, so the 20-step
// grid's "max hand % outside contact" isn't an artefact of stepping over a
// narrow spike right as the hand lifts off. This does not replace the
// required 20-step table above; it only tightens the reported maxima. ──────
const FINE_STEPS = 200;
const fineRows = [];
for (const aim of AIMS) {
  for (let i = 0; i < FINE_STEPS; i++) {
    const since = (i / (FINE_STEPS - 1)) * SWING_S;
    const inContact = since >= contactLo && since <= contactHi;
    if (inContact) continue;
    const pose = armPose(since, since, aim, ANTICIPATE_S);
    const bob = Math.sin(since * 1.7) * 3 * (1 - swingActivity(since, ANTICIPATE_S));
    const hc = since - CONTACT_S;
    const hand = countHandCoverage(pose, bob, hc);
    fineRows.push({ aim, since, handPct: (hand.covered / sheetAreaPx) * 100 });
  }
}

// ── report ───────────────────────────────────────────────────────────────
const fmt = (n, d = 3) => n.toFixed(d);
console.log(`sheet area: ${sheetAreaPx.toFixed(0)} px  |  forearm sprite: ${FORE.w}x${FORE.h}  |  hand sprite: ${HAND.w}x${HAND.h}`);
console.log(`contact window: since in [${contactLo.toFixed(3)}, ${contactHi.toFixed(3)}]  |  SWING_S=${SWING_S.toFixed(3)}  |  AIM_LIMIT=${AIM_LIMIT}`);
console.log('');
console.log('aim      since    inContact  forearm%   forearmPx   hand%      handPx');
for (const r of rows) {
  console.log(
    `${fmt(r.aim, 3).padStart(7)}  ${fmt(r.since, 3).padStart(6)}  ${String(r.inContact).padStart(9)}  ` +
    `${fmt(r.forePct, 4).padStart(8)}  ${String(r.forePx).padStart(9)}  ` +
    `${fmt(r.handPct, 4).padStart(8)}  ${String(r.handPx).padStart(8)}`
  );
}

const maxFore = rows.reduce((m, r) => r.forePct > m.forePct ? r : m, rows[0]);
const maxHandIn = rows.filter(r => r.inContact).reduce((m, r) => !m || r.handPct > m.handPct ? r : m, null);
const maxHandOut20 = rows.filter(r => !r.inContact).reduce((m, r) => !m || r.handPct > m.handPct ? r : m, null);
const maxHandOutFine = fineRows.reduce((m, r) => !m || r.handPct > m.handPct ? r : m, null);
const maxHandOut = (maxHandOutFine && maxHandOutFine.handPct > maxHandOut20.handPct) ? maxHandOutFine : maxHandOut20;

console.log('');
console.log('── summary ─────────────────────────────────────────────────────────────');
console.log(`max forearm coverage:            ${fmt(maxFore.forePct, 4)}%  at aim=${fmt(maxFore.aim, 3)}, since=${fmt(maxFore.since, 3)}`);
console.log(`max hand coverage IN contact:     ${maxHandIn ? fmt(maxHandIn.handPct, 4) + '%  at aim=' + fmt(maxHandIn.aim, 3) + ', since=' + fmt(maxHandIn.since, 3) : 'n/a (no sample fell in the window)'}`);
console.log(`max hand coverage OUTSIDE (20-step grid): ${fmt(maxHandOut20.handPct, 4)}%  at aim=${fmt(maxHandOut20.aim, 3)}, since=${fmt(maxHandOut20.since, 3)}`);
console.log(`max hand coverage OUTSIDE (200-step confirmation): ${fmt(maxHandOutFine.handPct, 4)}%  at aim=${fmt(maxHandOutFine.aim, 3)}, since=${fmt(maxHandOutFine.since, 3)}`);

// ── the gate ─────────────────────────────────────────────────────────────
// Thresholds as proposed in task-6-brief.md step 3. These are NOT re-tuned
// by this script under any circumstance — if the measured numbers exceed
// them, this exits non-zero and the plan owner adjudicates whether the
// threshold or the geometry (AIM_LIMIT / RECOIL_S in rig.js) was wrong.
const FOREARM_GATE_PCT = 2;
const HAND_OUT_OF_CONTACT_GATE_PCT = 22;

const foreFail = maxFore.forePct > FOREARM_GATE_PCT;
const handFail = maxHandOut.handPct > HAND_OUT_OF_CONTACT_GATE_PCT;

console.log('');
console.log(`gate: forearm <= ${FOREARM_GATE_PCT}% anywhere           -> ${foreFail ? 'FAIL' : 'pass'} (max ${fmt(maxFore.forePct, 4)}%)`);
console.log(`gate: hand <= ${HAND_OUT_OF_CONTACT_GATE_PCT}% outside contact window -> ${handFail ? 'FAIL' : 'pass'} (max ${fmt(maxHandOut.handPct, 4)}%)`);

if (foreFail || handFail) {
  console.log('');
  console.log('FAIL');
  process.exit(1);
} else {
  console.log('');
  console.log('PASS');
  process.exit(0);
}
