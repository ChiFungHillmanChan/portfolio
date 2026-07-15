// tests/character-ik.test.mjs
//
// Committed regression test for Task 7's IK action layer in
// src/engine/character.js (armChains / aimBone / applyArmIK / playPath /
// applyArmPath) — the load-bearing math of the whole project: does a
// hand-path actually move the GLB dealer's hand bone to the resolved world
// ref? Runs the REAL, unmodified engine code (character.js + the REAL
// C.ik.solveTwoBone + the REAL C.handPaths.PATHS data) against the REAL
// committed GLBs inside a node:vm sandbox, exactly like
// tests/character-dressing.test.mjs's harness — see that file's header
// comment for why each load-list entry is needed.
//
// Load list (mirrors build.mjs's SRC_ORDER, trimmed to what character.js's
// IK path actually touches):
//   1-2. vendor three + addons        — THREE, GLTFLoader, SkeletonUtils.
//   3. src/engine/tween.js            — C.tween.easings (playPath reads
//      C.tween.easings[w.ease] per waypoint; .to() itself is never called,
//      so no requestAnimationFrame stub is needed).
//   4. src/engine/assets.js           — C.assets.goldMaterial() (bow tie,
//      build-time only).
//   5. src/engine/rig.js              — C.rigPalettes (buildCharacter tint).
//   6. src/engine/character.js        — the module under test.
//   7. src/logic/ik.js                — C.ik.solveTwoBone (the analytic
//      two-bone solver applyArmIK calls every frame).
//   8. src/logic/hand-paths.js        — C.handPaths.PATHS (dealCard, etc).
//
// `performance.now()` is a MOCK the test drives directly (a plain closure
// variable), not wall-clock time: playPath/applyArmPath time everything off
// `performance.now() - t0` in real milliseconds, and the test needs to land
// EXACT waypoint fractions (e.g. "just past the grab waypoint's st>=0.995
// event threshold") without sleeping or racing real time.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const EPS = 0.01;   // 1cm — generous vs. the ~1mm residual from arc/ease at st>=0.995, tight vs. a real bug

function bytesToContextArrayBuffer(context, nodeBuffer) {
  context.__xferBytes = nodeBuffer;
  const arrayBuffer = vm.runInContext(
    `(function () {
      const src = globalThis.__xferBytes;
      const len = src.length;
      const u8 = new Uint8Array(len);
      for (let i = 0; i < len; i++) u8[i] = src[i];
      delete globalThis.__xferBytes;
      return u8.buffer;
    })()`,
    context,
  );
  return arrayBuffer;
}

function loadScript(context, path) {
  const script = new vm.Script(read(path), { filename: path });
  script.runInContext(context);
}

let sandbox, CTX_THREE, CTX_CASINO;
let mockNow = 0;
const warnLog = [];

before(async () => {
  sandbox = {
    console: { log: console.log, error: console.error, warn: (...args) => warnLog.push(args) },
    AbortController,
    setTimeout,
    clearTimeout,
    navigator: { userAgent: 'node-test-harness' },
    performance: { now: () => mockNow },
    TextDecoder,
  };
  vm.createContext(sandbox);

  loadScript(sandbox, 'vendor/three-0.149.0.min.js');
  loadScript(sandbox, 'vendor/three-addons-0.149.js');
  loadScript(sandbox, 'src/engine/tween.js');
  loadScript(sandbox, 'src/engine/assets.js');
  loadScript(sandbox, 'src/engine/rig.js');
  loadScript(sandbox, 'src/engine/character.js');
  loadScript(sandbox, 'src/logic/ik.js');
  loadScript(sandbox, 'src/logic/hand-paths.js');

  CTX_THREE = sandbox.THREE;
  CTX_CASINO = sandbox.CASINO;
  assert.ok(CTX_CASINO.ik && CTX_CASINO.handPaths, 'ik.js + hand-paths.js registered');

  sandbox.fetch = async (url) => {
    const name = String(url).includes('dealer-clips') ? 'dealer-clips.glb' : 'dealer-characters.glb';
    const nodeBuf = readFileSync(join(ROOT, 'assets', name));
    const arrayBuffer = bytesToContextArrayBuffer(sandbox, nodeBuf);
    return { ok: true, status: 200, arrayBuffer: async () => arrayBuffer };
  };

  await CTX_CASINO.character.preload('./assets/');
  assert.equal(CTX_CASINO.character.ready, 'ready', 'preload must succeed against the real committed GLBs');
});

// A tickable app stub: onFrame/offFrame back a real Set (so acquireDrive's
// temp drive hook — and setIdle's hook, if used — actually get invoked), and
// `tick(dt)` drives every registered hook synchronously (no real rAF).
function makeTickApp() {
  const hooks = new Set();
  const app = {
    REDUCED: false,
    roomGen: 1,
    onFrame(fn) { hooks.add(fn); },
    offFrame(fn) { hooks.delete(fn); },
  };
  app.tick = (dt) => { for (const fn of [...hooks]) fn(dt); };
  return app;
}

function buildDealer(seed, app) {
  let impl;
  const root = new CTX_THREE.Group();
  CTX_CASINO.character.attach(app, root, { seed }, (i) => { impl = i; });
  assert.ok(impl, `attach() must synchronously build once preload is ready (seed ${seed})`);
  return impl;
}

// Picks a shoe/target pair that is safely INSIDE the R arm's reach (never
// clamped by solveTwoBone — see ik.js's maxR/minR), using the SAME
// upperLen/foreLen math character.js's own armChains build uses, so the
// test's expectations don't depend on guessed numbers.
function reachRefs(impl) {
  const upper = impl.bones.upperArmR, fore = impl.bones.foreArmR, hand = impl.bones.handR;
  const scratch = new CTX_THREE.Vector3();
  const upperLen = fore.position.length() * upper.getWorldScale(scratch).x;
  const foreLen = hand.position.length() * fore.getWorldScale(scratch).x;
  const reach = upperLen + foreLen;
  const shoulder = new CTX_THREE.Vector3();
  upper.getWorldPosition(shoulder);
  const rootQ = new CTX_THREE.Quaternion();
  impl.group.getWorldQuaternion(rootQ);
  const shoeDir = new CTX_THREE.Vector3(0.20, -0.30, 0.40).normalize().multiplyScalar(reach * 0.55).applyQuaternion(rootQ);
  const targetDir = new CTX_THREE.Vector3(-0.20, -0.25, 0.35).normalize().multiplyScalar(reach * 0.60).applyQuaternion(rootQ);
  return {
    shoe: shoulder.clone().add(shoeDir).toArray(),
    target: shoulder.clone().add(targetDir).toArray(),
  };
}

function vecClose(actual, expectedArr, label) {
  const d = Math.hypot(actual.x - expectedArr[0], actual.y - expectedArr[1], actual.z - expectedArr[2]);
  assert.ok(d < EPS, `${label}: hand at [${actual.x.toFixed(4)},${actual.y.toFixed(4)},${actual.z.toFixed(4)}], `
    + `expected ~[${expectedArr.map((v) => v.toFixed(4))}] (dist ${d.toFixed(4)}m, eps ${EPS}m)`);
}

test('dealCard: hand bone reaches the shoe ref (+offset) at the grab waypoint, the target ref (+offset) at release, fires both events, and resolves at completion', async () => {
  const app = makeTickApp();
  const impl = buildDealer('ik-dealcard', app);
  const { shoe, target } = reachRefs(impl);
  const handPos = new CTX_THREE.Vector3();

  const events = {};
  mockNow = 0;
  const p = impl.play(app, 'dealCard', {
    refs: { shoe, target },
    on: {
      grab: (v) => { events.grab = v.clone(); },
      release: (v) => { events.release = v.clone(); },
    },
  });

  // dealCard: dur 520ms, hands.R = [
  //   {at:0.28, ref:'shoe',   offset:[0,0.03,0], ease:'outCubic', event:'grab'},
  //   {at:0.72, ref:'target', offset:[0,0.04,0], arc:0.10, event:'release'},
  //   {at:1.00, rest:true},
  // ]
  // Grab: land just past st=(t-0)/0.28 >= 0.995 while staying <= the 0.28
  // waypoint boundary (t_frac in (0.2786, 0.28]) — full IK weight (w=1, see
  // the RAMP math: ramp-in done by 120ms, ramp-out hasn't started yet at
  // t=0.28 of a 520ms path) and arc=0 for this waypoint, so the hand should
  // sit almost exactly on shoe+offset.
  mockNow = 0.2795 * 520;
  app.tick(1 / 60);
  handPos.copy(impl.bones.handR.getWorldPosition(new CTX_THREE.Vector3()));
  vecClose(handPos, [shoe[0], shoe[1] + 0.03, shoe[2]], 'grab waypoint');
  assert.ok(events.grab, 'grab event must have fired by st>=0.995 into the first segment');

  // Release: land just past st=(t-0.28)/0.44 >= 0.995 while staying <= 0.72
  // (t_frac in (0.7178, 0.72]) — full weight again (ramp-out hasn't started:
  // remaining time at t=0.719 is (1-0.719)*520=146ms, still > RAMP's 120ms
  // window... close to the edge, but comfortably inside the 1cm epsilon).
  mockNow = 0.719 * 520;
  app.tick(1 / 60);
  handPos.copy(impl.bones.handR.getWorldPosition(new CTX_THREE.Vector3()));
  vecClose(handPos, [target[0], target[1] + 0.04, target[2]], 'release waypoint');
  assert.ok(events.release, 'release event must have fired by st>=0.995 into the second segment');

  // Completion: t=1 -> playPath's promise must resolve (not hang).
  mockNow = 520;
  app.tick(1 / 60);
  let resolved = false;
  p.then(() => { resolved = true; });
  await p;
  assert.ok(resolved || true);   // await above already proves resolution; assert.ok is belt-and-braces
});

test('playPath with a missing ref resolves immediately, warns exactly once per path name, and never hands NaN to the IK solver', async () => {
  const app = makeTickApp();
  const impl = buildDealer('ik-missingref', app);
  const { shoe } = reachRefs(impl);   // deliberately omit 'target'
  const before = impl.bones.handR.getWorldPosition(new CTX_THREE.Vector3());

  warnLog.length = 0;
  mockNow = 0;
  const p1 = impl.play(app, 'dealCard', { refs: { shoe } });
  await p1;   // must resolve promptly, not hang waiting on a frame that never advances anything

  assert.equal(warnLog.length, 1, 'exactly one console.warn for the missing ref');
  assert.match(warnLog[0][0], /dealCard/);
  assert.match(warnLog[0][0], /target/);

  // tokens.arms must NOT have been bumped by a call that can't resolve —
  // a bad refs argument must not cancel whatever arm action is running.
  assert.equal(impl.tokens.arms, 0, 'a missing-ref call must not touch tokens.arms');

  // A frame tick must be harmless (no activePath was ever installed, so no
  // NaN target ever reached applyArmIK / the bone quaternions).
  app.tick(1 / 60);
  const after = impl.bones.handR.getWorldPosition(new CTX_THREE.Vector3());
  assert.ok(Number.isFinite(after.x) && Number.isFinite(after.y) && Number.isFinite(after.z), 'hand position stays finite');
  assert.ok(Math.abs(after.x - before.x) < 1e-6 && Math.abs(after.y - before.y) < 1e-6 && Math.abs(after.z - before.z) < 1e-6,
    'hand must not have moved at all — no path ever ran');

  // Same missing ref again -> no second warning (dedup is per path name).
  const p2 = impl.play(app, 'dealCard', { refs: { shoe } });
  await p2;
  assert.equal(warnLog.length, 1, 'a repeat call with the same missing ref must not warn again');
});

test('armsRest bumps tokens.arms and resolves an in-flight path\'s promise on the next frame (cancellation, not a hang)', async () => {
  const app = makeTickApp();
  const impl = buildDealer('ik-armsrest', app);
  const { shoe, target } = reachRefs(impl);

  mockNow = 0;
  const p = impl.play(app, 'dealCard', { refs: { shoe, target } });
  const tokenAtStart = impl.tokens.arms;

  mockNow = 0.2795 * 520;
  app.tick(1 / 60);   // mid-flight, past the grab waypoint

  await impl.play(app, 'armsRest');
  assert.equal(impl.tokens.arms, tokenAtStart + 1, 'armsRest must bump tokens.arms exactly once');

  mockNow += 16;
  app.tick(1 / 60);   // next frame: applyArmPath must see the token mismatch and finish()
  await p;            // must resolve promptly, not hang forever
});

test('a mocap one-shot (wave) is cleanly cancelled by a subsequent dealCard IK path on the same arm track', async () => {
  const app = makeTickApp();
  const impl = buildDealer('ik-wave-interrupt', app);
  const { shoe, target } = reachRefs(impl);

  mockNow = 0;
  const wavePromise = impl.play(app, 'wave');
  app.tick(1 / 60);   // let wave's mocap action actually start

  const dealPromise = impl.play(app, 'dealCard', { refs: { shoe, target } });
  app.tick(1 / 60);   // wave's watch hook should see tokens.arms bumped and resolve

  await wavePromise;   // must not hang — dealCard's token bump cancels the wave one-shot

  mockNow = 520;
  app.tick(1 / 60);
  await dealPromise;   // dealCard itself must still complete normally
});
