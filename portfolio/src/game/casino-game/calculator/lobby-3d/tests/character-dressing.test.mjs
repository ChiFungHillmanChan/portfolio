// tests/character-dressing.test.mjs
//
// Committed regression test for the dealer-dressing logic in
// src/engine/character.js (bakeUniformColors / regionForBoneName /
// resolveBoneRegion / computeBibBounds / attachBowTie — see
// .superpowers/sdd/task-5b-report.md for the original throwaway node:vm
// harnesses this replaces). Runs the REAL, unmodified engine code against
// the REAL committed GLBs (assets/dealer-characters.glb,
// assets/dealer-clips.glb) inside a node:vm sandbox — no mocking of THREE,
// no fake geometry.
//
// Load list (mirrors build.mjs's SRC_ORDER, trimmed to only what
// character.js actually touches at load- or call-time):
//   1. vendor/three-0.149.0.min.js   — THREE itself.
//   2. vendor/three-addons-0.149.js — adds THREE.GLTFLoader (GLB parsing)
//      and THREE.SkeletonUtils (SkeletonUtils.clone, used by buildCharacter).
//   3. src/engine/assets.js         — defines C.assets. character.js's
//      attachBowTie() calls C.assets.goldMaterial() at build time; nothing
//      else in assets.js is exercised (goldMaterial doesn't touch `document`,
//      so no DOM stub is needed for this file to load or run).
//   4. src/engine/rig.js            — defines C.rigPalettes (SKINS/HAIRS/
//      VESTS), which buildCharacter() reads via `C.rigPalettes` as `P`.
//      rig.js's own procedural-rig builder is never invoked.
//   5. src/engine/character.js      — the module under test.
// Everything else in build.mjs's SRC_ORDER (tween/sound/music/app/cards/
// chips3d, all src/logic + src/floor files, boot.js) is untouched by
// character.js's module scope or by preload()/attach()/buildCharacter(), so
// it is intentionally NOT loaded — keeps the sandbox minimal and the
// failure surface small.
//
// `globalThis.CASINO.app` is NOT stubbed: preload()/buildCharacter() never
// read `C.app` (confirmed by reading character.js top to bottom — the only
// app-shaped object either function touches is the `app` PARAMETER passed
// into attach(), not any global). attach()'s build() step also never invokes
// setIdle()/lookAt() automatically, so the `app` stub handed to attach() can
// be an inert placeholder object.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// v2 dressing (2026-07-17 spec): the tuxedo lives in the TEXTURE; the baked
// per-vertex 'color' attribute is a TINT multiplied over it. Expected tint
// values mirror character.js's buildCharacter(): WHITE [1,1,1] for regions
// painted final in the texture (shirt/cuffs/shoes), SKINS[pick]/skinBase for
// skin, VESTS[pick]*2.2 (clamped) for the suit, fixed charcoal for trousers.
const COLOR_EPS = 0.01;

// Same seed hash as character.js's buildCharacter() / rig.js's hashSeed() —
// duplicated here (plain arithmetic, no engine internals needed) purely to
// compute which SKINS/VESTS palette entry a given seed resolves to, so the
// test can assert against the *correct* per-seed expectation rather than a
// hardcoded guess.
function hashSeed(seed) {
  let h = 9;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 0x9e3779b1);
  return Math.abs(h >>> 0);
}

// Copies a Node Buffer's bytes into a Uint8Array/ArrayBuffer constructed
// FROM WITHIN the vm context's own realm (via vm.runInContext), then returns
// that context-realm ArrayBuffer. This is load-bearing: GLTFLoader.parse()
// does `data instanceof ArrayBuffer`, and `instanceof` is realm-sensitive —
// an ArrayBuffer built in Node's host realm and merely handed into the
// sandbox object would fail that check. Building it via a script executed
// IN the context (so `Uint8Array`/`ArrayBuffer` resolve to the context's own
// bindings) is the only way to get an ArrayBuffer that GLTFLoader accepts.
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

function makeSandbox() {
  const sandbox = {
    console,
    AbortController,
    setTimeout,
    clearTimeout,
    navigator: { userAgent: 'node-test-harness' },
    performance: { now: () => Date.now() },
    TextDecoder,
    // v2 GLBs embed PNG textures; GLTFLoader's ImageBitmapLoader path needs
    // these to exist. The stubs never decode pixels — tests only touch
    // geometry/bones/tints, never rendered texels.
    Blob,
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL() {} },
    createImageBitmap: async () => ({ width: 2, height: 2, close() {} }),
  };
  sandbox.self = sandbox;   // GLTFLoader's loaders reference `self`
  vm.createContext(sandbox);
  return sandbox;
}

function loadScript(context, path) {
  const script = new vm.Script(read(path), { filename: path });
  script.runInContext(context);
}

function findBodyMesh(root) {
  // The body SkinnedMesh carries material MI_Superhero_Male on this asset
  // pack (see task-5-report.md / task-5b-report.md) — the only mesh that
  // gets a baked 'color' attribute. Matched by material name (stable across
  // both the untouched template and every per-dealer clone) rather than by
  // presence of the 'color' attribute, so the same finder works on the
  // template too (which must NOT have a color attribute).
  let found = null;
  root.traverse((o) => {
    if (found || !o.isSkinnedMesh) return;
    const name = (o.material && o.material.name) || '';
    if (/superhero/i.test(name)) found = o;
  });
  return found;
}

function dominantBoneIndexAt(i, iArr, wArr, size) {
  let bestW = -1, bestIdx = -1;
  for (let k = 0; k < size; k++) {
    const w = wArr[i * size + k];
    if (w > bestW) { bestW = w; bestIdx = iArr[i * size + k]; }
  }
  return bestIdx;
}

// Finds a vertex with FULL (>=0.99) skin weight to the named bone — the
// original task-5b-report.md harness found real full-weight vertices for
// every bone it probed (foot_l, spine_02, Head, clavicle_l, ...), so this
// mirrors that same "unambiguous probe" approach rather than picking an
// arbitrary blended vertex.
function findFullWeightVertexForBone(mesh, boneName) {
  const boneIdx = mesh.skeleton.bones.findIndex((b) => b.name === boneName);
  assert.notEqual(boneIdx, -1, `bone ${boneName} not present in skeleton.bones`);
  const skinIndexAttr = mesh.geometry.attributes.skinIndex;
  const skinWeightAttr = mesh.geometry.attributes.skinWeight;
  const iArr = skinIndexAttr.array, wArr = skinWeightAttr.array;
  const size = skinIndexAttr.itemSize;
  const count = mesh.geometry.attributes.position.count;
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < size; k++) {
      if (iArr[i * size + k] === boneIdx && wArr[i * size + k] >= 0.99) return i;
    }
  }
  return -1;
}

function vertexColor(mesh, i) {
  const c = mesh.geometry.attributes.color.array;
  return { r: c[i * 3], g: c[i * 3 + 1], b: c[i * 3 + 2] };
}

function assertColorApprox(actual, expected, label) {
  assert.ok(
    Math.abs(actual.r - expected.r) < COLOR_EPS
      && Math.abs(actual.g - expected.g) < COLOR_EPS
      && Math.abs(actual.b - expected.b) < COLOR_EPS,
    `${label}: got {r:${actual.r.toFixed(4)},g:${actual.g.toFixed(4)},b:${actual.b.toFixed(4)}}, `
      + `expected ~{r:${expected.r.toFixed(4)},g:${expected.g.toFixed(4)},b:${expected.b.toFixed(4)}}`,
  );
}

// Finds a "central-front chest" vertex actually painted the bib color — i.e.
// dominated by spine_02/spine_03, near the lateral centerline, and on the
// front shell (established +Z-forward convention — see character.js's
// attachBowTie doc comment and task-5b-report.md's v2 section for how that
// convention was derived). Deliberately independent of computeBibBounds()'s
// own exact thresholds — this asserts the OUTCOME (a real bib patch exists,
// roughly where expected), not a re-derivation of the implementation's math.
function findBibVertex(mesh, bibColorExpected) {
  const bones = mesh.skeleton.bones;
  const spine02 = bones.findIndex((b) => b.name === 'spine_02');
  const spine03 = bones.findIndex((b) => b.name === 'spine_03');
  const posAttr = mesh.geometry.attributes.position;
  const colorAttr = mesh.geometry.attributes.color;
  const skinIndexAttr = mesh.geometry.attributes.skinIndex;
  const skinWeightAttr = mesh.geometry.attributes.skinWeight;
  const pArr = posAttr.array, cArr = colorAttr.array;
  const iArr = skinIndexAttr.array, wArr = skinWeightAttr.array;
  const size = skinIndexAttr.itemSize;
  const count = posAttr.count;
  for (let i = 0; i < count; i++) {
    const bi = dominantBoneIndexAt(i, iArr, wArr, size);
    if (bi !== spine02 && bi !== spine03) continue;
    const x = pArr[i * 3], z = pArr[i * 3 + 2];
    if (Math.abs(x) > 0.15) continue;   // roughly central (loose bound, see comment above)
    if (z <= 0) continue;               // front shell (+Z forward)
    const r = cArr[i * 3], g = cArr[i * 3 + 1], b = cArr[i * 3 + 2];
    if (Math.abs(r - bibColorExpected.r) < COLOR_EPS
      && Math.abs(g - bibColorExpected.g) < COLOR_EPS
      && Math.abs(b - bibColorExpected.b) < COLOR_EPS) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------
// Shared fixture: one sandbox, one preload(), two seeded builds, built once
// in `before()` and reused across every assertion (keeps the whole suite
// well under the 10s budget — GLB parse + bake happens exactly 3 times
// total: preload's own validation pass doesn't bake anything, then one bake
// per buildCharacter() call).
// ---------------------------------------------------------------------
let sandbox, CTX_THREE, CTX_CASINO;
let implA, implB, capturedTemplate;
const SEED_A = 'dealer-A';
const SEED_B = 'dealer-B';

before(async () => {
  sandbox = makeSandbox();
  loadScript(sandbox, 'vendor/three-0.149.0.min.js');
  loadScript(sandbox, 'vendor/three-addons-0.149.js');
  loadScript(sandbox, 'src/engine/assets.js');
  loadScript(sandbox, 'src/engine/rig.js');
  loadScript(sandbox, 'src/engine/character.js');

  CTX_THREE = sandbox.THREE;
  CTX_CASINO = sandbox.CASINO;
  assert.ok(CTX_THREE && CTX_THREE.GLTFLoader && CTX_THREE.SkeletonUtils, 'vendor + addons loaded');
  assert.ok(CTX_CASINO && CTX_CASINO.character && CTX_CASINO.rigPalettes, 'engine modules registered');

  // fetch shim: reads the two committed GLBs from disk, hands GLTFLoader a
  // same-realm ArrayBuffer (see bytesToContextArrayBuffer doc comment).
  sandbox.fetch = async (url) => {
    const name = String(url).includes('dealer-clips') ? 'dealer-clips.glb' : 'dealer-characters.glb';
    const nodeBuf = readFileSync(join(ROOT, 'assets', name));
    const arrayBuffer = bytesToContextArrayBuffer(sandbox, nodeBuf);
    return { ok: true, status: 200, arrayBuffer: async () => arrayBuffer };
  };

  await CTX_CASINO.character.preload('./assets/');
  assert.equal(CTX_CASINO.character.ready, 'ready', 'preload must succeed against the real committed GLBs');

  // Spy on SkeletonUtils.clone to capture the actual `state.template` scene
  // object buildCharacter() clones from — state.template itself is private
  // module state, never exposed via C.character's public API (preload/
  // attach/ready only). This is the one supported way to reach it without
  // touching character.js's public surface: clone's sole argument IS
  // state.template, by reference.
  const realClone = CTX_THREE.SkeletonUtils.clone;
  CTX_THREE.SkeletonUtils.clone = function spyClone(source) {
    capturedTemplate = source;
    return realClone.call(this, source);
  };

  const appStub = { REDUCED: false, onFrame() {}, offFrame() {} };
  const rootA = new CTX_THREE.Group();
  const rootB = new CTX_THREE.Group();
  CTX_CASINO.character.attach(appStub, rootA, { seed: SEED_A }, (impl) => { implA = impl; });
  CTX_CASINO.character.attach(appStub, rootB, { seed: SEED_B }, (impl) => { implB = impl; });

  CTX_THREE.SkeletonUtils.clone = realClone; // restore, tidy

  assert.ok(implA && implB, 'attach() must synchronously build once preload is ready');
  assert.ok(capturedTemplate, 'SkeletonUtils.clone spy must have captured state.template');
});

function expectedColor(hex) {
  const c = new CTX_THREE.Color(hex);
  return { r: c.r, g: c.g, b: c.b };
}

test('body geometry carries a per-dealer color attribute (itemSize 3), and the two dealers do not share it', () => {
  const meshA = findBodyMesh(implA.group);
  const meshB = findBodyMesh(implB.group);
  assert.ok(meshA, 'dealer A body mesh found (material name matching /superhero/i)');
  assert.ok(meshB, 'dealer B body mesh found');

  const colorA = meshA.geometry.attributes.color;
  const colorB = meshB.geometry.attributes.color;
  assert.ok(colorA, 'dealer A body geometry has a color attribute');
  assert.ok(colorB, 'dealer B body geometry has a color attribute');
  assert.equal(colorA.itemSize, 3);
  assert.equal(colorB.itemSize, 3);

  // The regression this guards against (task-5b-report.md "per-dealer
  // geometry clone" note): SkeletonUtils.clone() only duplicates the scene
  // graph + materials, NOT geometry. Without character.js's own
  // `o.geometry = o.geometry.clone()` step, every dealer would share (and
  // stomp) the same BufferGeometry's color attribute.
  assert.notEqual(meshA.geometry, meshB.geometry, 'per-dealer geometry must not be the same object');
  assert.notEqual(colorA, colorB, 'per-dealer color attribute must not be the same object');

  const templateMesh = findBodyMesh(capturedTemplate);
  assert.ok(templateMesh, 'template body mesh found');
  // The raw GLB itself ships a native COLOR_0 accessor on this mesh (an
  // all-white itemSize-4 normalized Uint8Array — an artifact of the
  // Blender→glTF export, unrelated to dressing; confirmed by inspecting
  // `capturedTemplate`, which is the untouched `charGltf.scene` straight out
  // of GLTFLoader.parse(), before buildCharacter() ever runs). So "no leak"
  // is NOT "attributes.color is undefined" — it's "attributes.color is not
  // OUR baked Float32Array(itemSize 3) attribute", which is the actual
  // signature bakeUniformColors() writes (see character.js's
  // `geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))`,
  // where colors is a Float32Array).
  const templateColor = templateMesh.geometry.attributes.color;
  const leaked = !!templateColor && templateColor.itemSize === 3 && templateColor.array instanceof Float32Array;
  assert.ok(
    !leaked,
    'the shared template geometry must never carry the baked per-dealer Float32Array(itemSize 3) color ' +
    'attribute — a leak here means a future change stopped cloning geometry before baking',
  );
});

test('shoe region (foot_l-dominant vertex) tints near-black — dark shoes hide the mesh toe shading', () => {
  const mesh = findBodyMesh(implA.group);
  const vi = findFullWeightVertexForBone(mesh, 'foot_l');
  assert.notEqual(vi, -1, 'expected a full-weight foot_l vertex (asset pack should have clean skinning)');
  assertColorApprox(vertexColor(mesh, vi), { r: 0.05, g: 0.05, b: 0.055 }, 'foot_l vertex');
});

test('skin region (Head-dominant vertex) tints to SKINS[pick]/skinBase (texture re-tone ratio)', () => {
  const L = capturedTemplate.userData.dealerLandmarks;
  assert.ok(L && L.skinBase, 'landmarks travel in the GLB scene extras');
  for (const [impl, seed] of [[implA, SEED_A], [implB, SEED_B]]) {
    const mesh = findBodyMesh(impl.group);
    const vi = findFullWeightVertexForBone(mesh, 'Head');
    assert.notEqual(vi, -1, `expected a full-weight Head vertex for ${seed}`);
    const h = hashSeed(seed);
    const skin = expectedColor(CTX_CASINO.rigPalettes.SKINS[h % CTX_CASINO.rigPalettes.SKINS.length]);
    const expected = {
      r: Math.min(1.35, skin.r * 255 / L.skinBase[0]),
      g: Math.min(1.35, skin.g * 255 / L.skinBase[1]),
      b: Math.min(1.35, skin.b * 255 / L.skinBase[2]),
    };
    assertColorApprox(vertexColor(mesh, vi), expected, `Head vertex (${seed})`);
  }
});

test('sleeve region (upperarm-dominant vertex) tints to the lifted VESTS pick (suit sleeves, not bare skin)', () => {
  for (const [impl, seed] of [[implA, SEED_A], [implB, SEED_B]]) {
    const mesh = findBodyMesh(impl.group);
    const vi = findFullWeightVertexForBone(mesh, 'upperarm_l');
    assert.notEqual(vi, -1, `expected a full-weight upperarm_l vertex for ${seed}`);
    const h = hashSeed(seed);
    const vest = expectedColor(CTX_CASINO.rigPalettes.VESTS[(h >>> 6) % CTX_CASINO.rigPalettes.VESTS.length]);
    const expected = { r: Math.min(1, vest.r * 2.2), g: Math.min(1, vest.g * 2.2), b: Math.min(1, vest.b * 2.2) };
    assertColorApprox(vertexColor(mesh, vi), expected, `upperarm_l vertex (${seed})`);
  }
});

test('the two seeds yield different vest colors (per-dealer variation actually varies)', () => {
  const meshA = findBodyMesh(implA.group);
  const meshB = findBodyMesh(implB.group);
  const viA = findFullWeightVertexForBone(meshA, 'upperarm_l');
  const viB = findFullWeightVertexForBone(meshB, 'upperarm_l');
  const colorA = vertexColor(meshA, viA);
  const colorB = vertexColor(meshB, viB);
  const different = Math.abs(colorA.r - colorB.r) > COLOR_EPS
    || Math.abs(colorA.g - colorB.g) > COLOR_EPS
    || Math.abs(colorA.b - colorB.b) > COLOR_EPS;
  assert.ok(different, `expected dealer-A vest ${JSON.stringify(colorA)} != dealer-B vest ${JSON.stringify(colorB)}`);
});

test('shirt placket: a central-front vertex between belt and V-bottom tints WHITE (texture shows the shirt)', () => {
  const L = capturedTemplate.userData.dealerLandmarks;
  for (const [impl, seed] of [[implA, SEED_A], [implB, SEED_B]]) {
    const mesh = findBodyMesh(impl.group);
    const pos = mesh.geometry.attributes.position;
    const col = mesh.geometry.attributes.color.array;
    let found = -1;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (Math.abs(x) >= L.placketHalf || z <= L.frontZMin) continue;
      if (y <= L.beltTop || y >= L.vBottomY) continue;
      if (Math.abs(col[i * 3] - 1) < COLOR_EPS && Math.abs(col[i * 3 + 1] - 1) < COLOR_EPS
        && Math.abs(col[i * 3 + 2] - 1) < COLOR_EPS) { found = i; break; }
    }
    assert.notEqual(found, -1, `expected at least one WHITE-tinted placket vertex for ${seed}`);
  }
});

test('bow tie: 3 gold children parented to each clone\'s neck_01 bone, absent from the shared template', () => {
  const goldExpected = expectedColor('#c9a227');
  for (const [impl, seed] of [[implA, SEED_A], [implB, SEED_B]]) {
    const neckBone = impl.group.getObjectByName('neck_01');
    assert.ok(neckBone, `neck_01 bone found on ${seed} clone`);
    const bow = neckBone.children.find((c) => c.name === 'BowTie');
    assert.ok(bow, `BowTie group found under neck_01 for ${seed}`);
    assert.equal(bow.children.length, 3, `BowTie should have 3 children (2 cones + knot) for ${seed}`);
    for (const child of bow.children) {
      assert.equal(child.castShadow, true, `bow tie child casts shadow for ${seed}`);
      const c = child.material.color;
      assertColorApprox({ r: c.r, g: c.g, b: c.b }, goldExpected, `bow tie child color (${seed})`);
    }
  }

  const templateNeck = capturedTemplate.getObjectByName('neck_01');
  assert.ok(templateNeck, 'template has a neck_01 bone');
  const templateBow = templateNeck.children.find((c) => c.name === 'BowTie');
  assert.equal(templateBow, undefined, 'the shared template must never get its own BowTie attached');
});

// ---------------------------------------------------------------------
// Regression test: playMocap's cached-AnimationAction timeScale bleed (see
// task-6-report.md "Fix: timeScale bleed"). mixer.clipAction(clip) returns a
// CACHED THREE.AnimationAction per (clip, root) pair — see
// vendor/three-0.149.0.min.js's clipAction(): it keys
// `_actionsByClip[clip.uuid].actionByRoot[root.uuid]` and returns the SAME
// action object on a repeat call — and action.reset() does NOT touch
// timeScale. `wave` and `welcomeSweep` both map to the same 'Interact' clip
// (see MOCAP_MAP above): a `welcomeSweep` played with `ms:900` sets
// timeScale ~= clip.duration*1000/900 (~2.22) on that SHARED action; a LATER
// `wave` with no `ms` override must reset timeScale back to 1, not inherit
// the stale sped-up value (reachable in the app via the vestibule
// re-greeting after its 90s cooldown).
// ---------------------------------------------------------------------
test('playMocap resets a shared cached AnimationAction\'s timeScale on a later un-timed play (no stale speed bleed between welcomeSweep and wave)', () => {
  // A fresh character via the SAME attach() route the app uses, but with a
  // tickable app stub: the shared before() appStub's onFrame/offFrame are
  // no-ops (none of the OTHER tests in this file ever drive the mixer), so
  // playMocap's acquireDrive() -> driveFrame() -> mixer.update() path needs
  // an app stub that actually stores + can re-invoke frame hooks.
  const hooks = new Set();
  const tickApp = {
    REDUCED: false,
    roomGen: 1,
    onFrame(fn) { hooks.add(fn); },
    offFrame(fn) { hooks.delete(fn); },
  };
  const tick = (dt) => { for (const fn of [...hooks]) fn(dt); };

  let implC;
  const rootC = new CTX_THREE.Group();
  CTX_CASINO.character.attach(tickApp, rootC, { seed: 'dealer-timescale' }, (impl) => { implC = impl; });
  assert.ok(implC, 'attach() must synchronously build once preload is ready');

  // Spy on AnimationMixer.prototype.clipAction (same technique before()
  // already uses for THREE.SkeletonUtils.clone) to capture the actual cached
  // action object playMocap operates on for the 'Interact' clip.
  // character.js's `findClip`/`state.clips` are module-private closure state,
  // never exposed on C.character's public surface (preload/attach/ready
  // only), so this is the supported way to reach the same object mixer
  // .clipAction(clip) resolves to internally, without changing character.js
  // beyond the one-line fix.
  const AnimationMixer = CTX_THREE.AnimationMixer;
  const realClipAction = AnimationMixer.prototype.clipAction;
  const captured = [];
  AnimationMixer.prototype.clipAction = function spyClipAction(clip, ...rest) {
    const action = realClipAction.call(this, clip, ...rest);
    if (this === implC.mixer && clip && clip.name === 'Interact') captured.push(action);
    return action;
  };

  try {
    // welcomeSweep sped up (ms:900) sets timeScale ~= 2.22 on the SHARED
    // 'Interact' action.
    implC.play(tickApp, 'welcomeSweep', { ms: 900 });
    tick(1 / 30);
    tick(1 / 30);
    // A later un-timed wave must reset that SAME action back to timeScale 1,
    // not inherit the stale sped-up value.
    implC.play(tickApp, 'wave');

    assert.equal(captured.length, 2, 'both plays must resolve to the Interact clip via the spy');
    assert.equal(
      captured[0], captured[1],
      'welcomeSweep and wave must reuse the SAME cached AnimationAction (mixer.clipAction caches per '
      + 'clip+root) — this identity is what makes the timeScale bleed possible in the first place',
    );
    assert.equal(
      captured[1].timeScale, 1,
      'wave (no ms override) must reset the shared action\'s timeScale to 1, not inherit welcomeSweep\'s '
      + 'stale ~2.22x speed',
    );
  } finally {
    AnimationMixer.prototype.clipAction = realClipAction;
  }
});
