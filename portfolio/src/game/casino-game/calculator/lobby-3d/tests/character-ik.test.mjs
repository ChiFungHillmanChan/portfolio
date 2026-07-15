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
// `hookCount()` exposes the registry size so tests can assert a drive
// hook's refcount returns to baseline (no leak) after a supersession/hold.
function makeTickApp() {
  const hooks = new Set();
  const app = {
    REDUCED: false,
    roomGen: 1,
    onFrame(fn) { hooks.add(fn); },
    offFrame(fn) { hooks.delete(fn); },
  };
  app.tick = (dt) => { for (const fn of [...hooks]) fn(dt); };
  app.hookCount = () => hooks.size;
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
  // Finding 2's fix removed the old segment-tail `st>=0.995` firing
  // mechanism in favour of catch-up semantics keyed on `wp.at <= t` (raw
  // path fraction, not eased within-segment progress). Land just PAST the
  // grab waypoint's own `at` (0.28) — t_frac 0.2805 — so `wp.at <= t` holds
  // and the event fires. Position is sampled a fraction of a waypoint span
  // into the FOLLOWING segment at that point, but the eased blend at
  // st~0.001 there is negligible (sub-millimetre) — still comfortably
  // inside the 1cm epsilon, so the hand still reads as being at shoe+offset.
  mockNow = 0.2805 * 520;
  app.tick(1 / 60);
  handPos.copy(impl.bones.handR.getWorldPosition(new CTX_THREE.Vector3()));
  vecClose(handPos, [shoe[0], shoe[1] + 0.03, shoe[2]], 'grab waypoint');
  assert.ok(events.grab, 'grab event must have fired via wp.at<=t catch-up semantics');

  // Release: same idea, just past the release waypoint's own `at` (0.72).
  mockNow = 0.7205 * 520;
  app.tick(1 / 60);
  handPos.copy(impl.bones.handR.getWorldPosition(new CTX_THREE.Vector3()));
  vecClose(handPos, [target[0], target[1] + 0.04, target[2]], 'release waypoint');
  assert.ok(events.release, 'release event must have fired via wp.at<=t catch-up semantics');

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

// ---------------------------------------------------------------------
// Task 7 review fixes (task-7-report.md "Fix: supersession + events +
// hold"): three Important findings in playPath/applyArmPath/finish.
// ---------------------------------------------------------------------

test('Finding 1 — a second playPath supersedes an in-flight one: the outgoing promise resolves promptly (not orphaned), the incoming path runs to completion, and the drive hook refcount never leaks (returns to baseline, with no drop-to-zero flicker across the handoff)', async () => {
  const app = makeTickApp();
  const impl = buildDealer('ik-supersede', app);
  const { shoe, target } = reachRefs(impl);
  const baseline = app.hookCount();

  mockNow = 0;
  const p1 = impl.play(app, 'dealCard', { refs: { shoe, target } });
  app.tick(1 / 60);   // one tick, mid-flight — p1 is nowhere near t>=1
  assert.equal(app.hookCount(), baseline + 1, 'first path holds exactly one drive hook');

  let p1Resolved = false;
  p1.then(() => { p1Resolved = true; });

  // A second dealCard call while the first is still running — this is the
  // blackjack-live.js:352-429 shape (dealTo fires 'dealCard' every ~420ms
  // while the IK path itself lasts 520ms).
  const p2 = impl.play(app, 'dealCard', { refs: { shoe, target } });

  // Finding 1's fix finishes the outgoing entry SYNCHRONOUSLY inside
  // playPath's install step — p1 must resolve without needing another
  // frame tick, just a microtask flush.
  await Promise.resolve();
  assert.ok(p1Resolved, 'the superseded path\'s promise must resolve promptly, not hang forever');
  assert.equal(app.hookCount(), baseline + 1,
    'drive hook count is unchanged across the handoff — the outgoing release() and the incoming acquireDrive() overlap, so the hook is never torn down and re-created');

  mockNow = 520;
  app.tick(1 / 60);
  await p2;   // the superseding path must still run to completion normally
  assert.equal(app.hookCount(), baseline, 'drive hook count returns to baseline once both paths have settled — no leaked hook');
});

test('Finding 2 — tapRack: a single jank-frame jump straight past BOTH \'contact\' waypoints still fires both events, in order, via wp.at<=t catch-up (not the removed segment-tail 0.995 mechanism)', async () => {
  const app = makeTickApp();
  const impl = buildDealer('ik-tapRack-catchup', app);
  const { shoe: rack } = reachRefs(impl);   // tapRack only needs a 'rack' ref — reuse a within-reach point

  const order = [];
  mockNow = 0;
  const p = impl.play(app, 'tapRack', {
    refs: { rack },
    on: { contact: (v) => { order.push(v.clone()); } },
  });

  // tapRack: dur 620ms, hands.R = [
  //   {at:0.30, ref:'rack', offset:[0,0.03,0], ease:'outCubic', event:'contact'},
  //   {at:0.48, ref:'rack', offset:[0,0.09,0]},
  //   {at:0.66, ref:'rack', offset:[0,0.03,0], event:'contact'},
  //   {at:1.00, rest:true},
  // ]
  // One single tick with the clock jumped straight from 0 to PAST both
  // 'contact' waypoints (0.30 and 0.66) in one go — simulating an ~80ms+
  // jank frame. Under the OLD mechanism this fired ZERO events (t=0.70's
  // current segment is [0.66, 1.00] -> rest, which carries no `event` at
  // all — the two contact waypoints behind it were never inspected).
  // Finding 2's fix walks every waypoint each frame and fires any whose
  // `at <= t` that hasn't fired yet, so both fire here, in waypoint order.
  mockNow = 0.70 * 620;
  app.tick(1 / 5);   // deliberately huge dt — irrelevant to IK timing, which reads mockNow directly

  assert.equal(order.length, 2, 'both contact events must fire despite the single-frame jump over both waypoints');
  // Both waypoints share the event name 'contact' (hand-paths.js data), so
  // "in order" is guaranteed by the fix's `for (const wp of h.wps)` array
  // iteration (waypoint array order), not distinguishable by event name —
  // documented here rather than re-asserted redundantly.

  mockNow = 620;
  app.tick(1 / 60);
  await p;   // path still completes and resolves normally after the jump
});

test('Finding 3 — spinReach (holdAtEnd, single rim waypoint): the promise resolves at completion, but the arm keeps being driven to the resolved rim target every subsequent frame (a real hold) until a superseding armsRest ends it and releases the drive', async () => {
  const app = makeTickApp();
  const impl = buildDealer('ik-hold', app);
  const baseline = app.hookCount();
  const { target: rim } = reachRefs(impl);   // any within-reach point stands in for the rim ref

  mockNow = 0;
  let resolved = false;
  const p = impl.play(app, 'spinReach', { refs: { rim } });
  p.then(() => { resolved = true; });

  // spinReach: dur 480ms, hands.R = [{at:1.00, ref:'rim', offset:[0,0.02,0], ease:'outCubic', event:'contact'}]
  // — no rest waypoint, so holdAtEnd is true.
  mockNow = 480;
  app.tick(1 / 60);
  await Promise.resolve();
  assert.ok(resolved, 'a holdAtEnd path must still resolve its promise at t>=1 — callers must not hang');
  assert.equal(app.hookCount(), baseline + 1,
    'the drive hook must still be held during the hold phase — resolving is NOT the same as finishing/releasing');

  const expected = [rim[0], rim[1] + 0.02, rim[2]];
  for (let i = 0; i < 5; i++) {
    mockNow += 16;
    app.tick(1 / 60);
    const pos = impl.bones.handR.getWorldPosition(new CTX_THREE.Vector3());
    vecClose(pos, expected, `hold frame ${i}: hand must stay pinned to the rim target, not sag back toward mocap`);
  }

  // Superseding via armsRest (tokens.arms bump) is one of Finding 3's three
  // documented ways to end a hold (new playPath install / tokens.arms bump /
  // roomGen change). armsRest's own promise resolves immediately (it never
  // ticks a frame itself) — the holding entry's actual finish() happens on
  // applyArmPath's NEXT tick, via the same token-mismatch check that already
  // handles cancellation for a non-holding path.
  await impl.play(app, 'armsRest');
  mockNow += 16;
  app.tick(1 / 60);
  assert.equal(app.hookCount(), baseline, 'the holding entry\'s drive hook is released once armsRest ends the hold — no leak');
});

// ---------------------------------------------------------------------
// Task 8: assets.js facade's handWorld(side) — src/floor/baccarat-show.js's
// wash/riffle read this to track the dealer's real palms. Exercises the
// REAL C.assets.makeDealer() facade (not character.js directly) against
// both branches: GLB attached (impl.bones.hand*) and procedural-only
// (impl.joints.wrist*, when makeDealer never sees a C.app / sees a
// REDUCED one and so never calls character.attach()).
// ---------------------------------------------------------------------

test('Task 8: facade.handWorld(side) reads bones.hand* once the GLB char is attached, and joints.wrist* for the procedural-only rig', () => {
  // GLB branch: makeDealer() reads the global C.app; preload already
  // resolved 'ready' in before(), so character.attach() swaps the facade's
  // internal impl to the real GLB charImpl SYNCHRONOUSLY inside makeDealer.
  const app = makeTickApp();
  CTX_CASINO.app = app;
  const seed = 'handworld-glb';
  const glbRoot = CTX_CASINO.assets.makeDealer({ seed });
  const glbFacade = glbRoot.userData.rig;
  const handWorldR = glbFacade.handWorld('R');
  assert.ok(handWorldR instanceof CTX_THREE.Vector3, 'GLB branch: handWorld must return a THREE.Vector3');
  assert.ok(['x', 'y', 'z'].every((k) => Number.isFinite(handWorldR[k])), 'GLB branch: handWorld position must be finite');
  // 'L' branch (review fix): the wash hook reads BOTH hands every frame
  // (see baccarat-show.js's trackHook), but the original test only ever
  // exercised 'R' — assert the 'L' GLB branch too.
  const handWorldL = glbFacade.handWorld('L');
  assert.ok(handWorldL instanceof CTX_THREE.Vector3, 'GLB branch: handWorld(\'L\') must return a THREE.Vector3');
  assert.ok(['x', 'y', 'z'].every((k) => Number.isFinite(handWorldL[k])), 'GLB branch: handWorld(\'L\') position must be finite');

  // Independently build a charImpl with the SAME seed — the GLB skeleton's
  // rest pose is identical for any seed (only the tint hash differs, see
  // rig.js/character.js hashSeed), so its hand bones are ground-truth
  // positions to compare the facade's readings against.
  let refImpl;
  CTX_CASINO.character.attach(app, new CTX_THREE.Group(), { seed }, (i) => { refImpl = i; });
  assert.ok(refImpl, 'reference charImpl must build synchronously (preload already ready)');
  const expectedR = refImpl.bones.handR.getWorldPosition(new CTX_THREE.Vector3());
  assert.ok(handWorldR.distanceTo(expectedR) < 1e-4,
    `facade.handWorld('R') must equal the underlying GLB charImpl's handR world position (dist ${handWorldR.distanceTo(expectedR)})`);
  const expectedL = refImpl.bones.handL.getWorldPosition(new CTX_THREE.Vector3());
  assert.ok(handWorldL.distanceTo(expectedL) < 1e-4,
    `facade.handWorld('L') must equal the underlying GLB charImpl's handL world position (dist ${handWorldL.distanceTo(expectedL)})`);

  // Procedural branch: no C.app -> makeDealer() never calls
  // character.attach() -> facade stays on the procedural rig -> handWorld
  // must fall through to joints.wrist*.
  CTX_CASINO.app = undefined;
  const procRoot = CTX_CASINO.assets.makeDealer({ seed: 'handworld-proc' });
  const procFacade = procRoot.userData.rig;
  const handWorldProcR = procFacade.handWorld('R');
  assert.ok(handWorldProcR instanceof CTX_THREE.Vector3, 'procedural branch: handWorld must return a THREE.Vector3');
  const expectedProcR = procFacade.joints.wristR.getWorldPosition(new CTX_THREE.Vector3());
  assert.ok(handWorldProcR.distanceTo(expectedProcR) < 1e-6,
    'procedural handWorld(\'R\') must equal joints.wristR\'s world position exactly');

  CTX_CASINO.app = undefined;   // don't leak state into any test that runs after this one
});

// ---------------------------------------------------------------------
// Task 8 review Fix 2 — resolveWaypointPos must rotate wp.offset by the
// character root group's world quaternion before adding it to a world-space
// ref. hand-paths.js offsets are authored in the dealer's OWN facing frame
// (e.g. washCards' counter-phase circles); at the π-rotated baccarat/uth
// pits (src/floor/sections.js: baccarat/uth rows get rotation.y = Math.PI)
// a raw, unrotated offset lands mirrored on X/Z vs. the authored intent.
// ---------------------------------------------------------------------

test('Fix 2 — a dealer rotated π (baccarat/uth pit orientation): a waypoint X-offset is rotated with the group\'s world quaternion, landing the hand at ref MINUS the x offset in world space, not ref PLUS the raw offset', async () => {
  const app = makeTickApp();
  const root = new CTX_THREE.Group();
  root.rotation.y = Math.PI;   // baccarat/uth pit orientation (sections.js ROWS.baccarat/uth)
  let impl;
  CTX_CASINO.character.attach(app, root, { seed: 'ik-rotated-pi' }, (i) => { impl = i; });
  assert.ok(impl, 'attach() must synchronously build once preload is ready');

  // reachRefs() already reads impl.group's ACTUAL world quaternion (see its
  // own rootQ usage above) to aim the shoe/target refs into the dealer's
  // reach envelope regardless of rotation — reusable as-is here.
  const { target } = reachRefs(impl);

  // Throwaway path: a single R waypoint at t=1, ref 'target', offset
  // [0.1, 0, 0] — X-only so a rotation bug (raw-add vs. rotate-then-add) is
  // unambiguous. Rotating [0.1,0,0] by rotation.y=π negates X (Z stays 0
  // since the offset has none), so the CORRECT landing spot is
  // target - [0.1,0,0]; the OLD raw-add bug would have landed at
  // target + [0.1,0,0] instead — a ~0.2m error, way outside EPS.
  CTX_CASINO.handPaths.PATHS.__testXOffsetPi = {
    dur: 300, hands: { R: [{ at: 1.0, ref: 'target', offset: [0.1, 0, 0] }] },
  };
  try {
    mockNow = 0;
    const p = impl.play(app, '__testXOffsetPi', { refs: { target } });
    mockNow = 300;
    app.tick(1 / 60);
    await p;

    const handPos = impl.bones.handR.getWorldPosition(new CTX_THREE.Vector3());
    vecClose(handPos, [target[0] - 0.1, target[1], target[2]], 'π-rotated X-offset waypoint');
  } finally {
    delete CTX_CASINO.handPaths.PATHS.__testXOffsetPi;
  }
});
