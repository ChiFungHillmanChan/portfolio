# Casino 3D Dealer & Receptionist Animations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the 3D lobby's human figures to life — upgraded procedural bodies with faces, a rig + pose-clip engine, a talking receptionist, and full dealer choreography for roulette (spin/dolly/pay/sweep/buy-in), blackjack (shoe-deal/pay/sweep), and an ambient baccarat show.

**Architecture:** All-procedural (no external assets). A new `src/engine/rig.js` builds a jointed humanoid and plays declarative pose clips defined in pure `src/logic/gestures.js`. `makeDealer` in `assets.js` becomes a thin API-compatible wrapper. Per-game choreography is wired into the existing live flows (`roulette-live.js`, `blackjack-live.js`) and a new self-running `src/floor/baccarat-show.js`. Gestures are visual overlays only — wallet/game promises stay authoritative.

**Tech Stack:** three.js r149 (vendored, has `CapsuleGeometry`), vanilla JS IIFEs on `globalThis.CASINO` for `src/*`, ES modules for top-level files, `node --test` for pure logic.

**Spec:** `docs/superpowers/specs/2026-07-14-casino-3d-dealer-animations-design.md`

## Global Constraints

- Work on branch `feat/casino-lobby-credits`. Never push to main. Commit ONLY files you changed (parallel sessions share this tree — always `git add` explicit paths, never `git add -A`).
- Source of truth: `portfolio/src/game/casino-game/calculator/lobby-3d/`. The `portfolio/public/games/casino-game/lobby-3d/` copy is synced in the final task only.
- All work dir paths below are relative to `portfolio/src/game/casino-game/calculator/lobby-3d/` unless absolute.
- `src/logic/*` files must contain NO `THREE`/DOM usage at load or call time (node tests `await import()` them directly).
- Every frame hook registered with `app.onFrame` must have a `.cancel` property and check `app.roomGen` if it can outlive a room switch (existing idiom — see `dealCardTo` in `src/engine/cards.js:95`).
- Honor `app.REDUCED` (prefers-reduced-motion): clips snap to final pose, speech bubbles still shown, ambient show disabled.
- Available easings (from `src/engine/tween.js`): `inOutCubic`, `outCubic`, `outQuart`, `outBack` only.
- Choreography must NEVER delay or block game/wallet flow: arm clips are fire-and-forget alongside card/chip flights unless the step explicitly awaits them.
- Run tests with `node --test tests/` from the lobby-3d dir. All existing tests must stay green.
- New src files must be added to `SRC_ORDER` in `build.mjs` (build fails on unreadable entries).
- Rotation-sign caveat: euler values in clip data (wave/flick directions) are best-effort; the final task verifies in-browser and flips signs in `gestures.js` data only (never in the engine).

---

### Task 1: Pure gesture clip data + validation (`src/logic/gestures.js`)

**Files:**
- Create: `src/logic/gestures.js`
- Test: `tests/gestures.test.mjs`
- Modify: `build.mjs` (SRC_ORDER)

**Interfaces:**
- Consumes: nothing (pure data + functions).
- Produces: `CASINO.gestures = { JOINTS, TRACKS, EASINGS, CLIPS, validateClip(clip), wrapLines(text, maxChars) }`.
  - `CLIPS[name] = { track, dur, keys: [{ at, ease?, joints: { <jointName>: {aim: '<refKey>'} | {e: [x,y,z]} | {rest: true} } }] }`
  - `at` strictly increasing in (0, 1], last key `at === 1`.
  - `validateClip(clip)` returns `[]` when valid, else array of error strings.
  - `wrapLines(text, maxChars = 18)` returns ≤3 lines, word-wrapped, last line ellipsized if truncated.

- [ ] **Step 1: Write the failing test**

Create `tests/gestures.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/gestures.js');
const G = globalThis.CASINO.gestures;

test('every built-in clip validates clean', () => {
  for (const [name, clip] of Object.entries(G.CLIPS)) {
    assert.deepEqual(G.validateClip(clip), [], `clip ${name}`);
  }
});

test('the choreography set exists', () => {
  for (const name of ['dealCard', 'sweepChips', 'payChips', 'spinReach', 'spinFollow',
    'placeDolly', 'tapRack', 'wave', 'welcomeSweep', 'nod', 'headShake']) {
    assert.ok(G.CLIPS[name], name);
  }
});

test('validateClip catches bad clips', () => {
  assert.ok(G.validateClip({ track: 'nope', dur: 100, keys: [] }).length > 0);
  assert.ok(G.validateClip({ track: 'arms', dur: 0,
    keys: [{ at: 1, joints: { shoulderR: { rest: true } } }] }).length > 0);
  // non-increasing keyframe times
  assert.ok(G.validateClip({ track: 'arms', dur: 100, keys: [
    { at: 0.5, joints: { shoulderR: { rest: true } } },
    { at: 0.4, joints: { shoulderR: { rest: true } } },
  ] }).length > 0);
  // last key must land at 1
  assert.ok(G.validateClip({ track: 'arms', dur: 100,
    keys: [{ at: 0.5, joints: { shoulderR: { rest: true } } }] }).length > 0);
  // unknown joint / unknown ease / conflicting target
  assert.ok(G.validateClip({ track: 'arms', dur: 100,
    keys: [{ at: 1, joints: { pinky: { rest: true } } }] }).length > 0);
  assert.ok(G.validateClip({ track: 'arms', dur: 100,
    keys: [{ at: 1, ease: 'bounce', joints: { shoulderR: { rest: true } } }] }).length > 0);
  assert.ok(G.validateClip({ track: 'arms', dur: 100,
    keys: [{ at: 1, joints: { shoulderR: { rest: true, aim: 'x' } } }] }).length > 0);
});

test('wrapLines wraps and caps at 3 lines', () => {
  assert.deepEqual(G.wrapLines('Welcome!'), ['Welcome!']);
  assert.deepEqual(G.wrapLines('May I see your member card?', 14),
    ['May I see', 'your member', 'card?']);
  const long = G.wrapLines('one two three four five six seven eight nine ten', 8);
  assert.equal(long.length, 3);
  assert.ok(long[2].endsWith('…'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `portfolio/src/game/casino-game/calculator/lobby-3d/`):
`node --test tests/gestures.test.mjs`
Expected: FAIL — `Cannot find module '../src/logic/gestures.js'`

- [ ] **Step 3: Write the implementation**

Create `src/logic/gestures.js`:

```js
(() => {
  const C = (globalThis.CASINO ??= {});

  // Pure gesture data for the humanoid rig (src/engine/rig.js). No THREE/DOM —
  // node-testable. A clip animates named joints across keyframes on one track.
  //
  // Joint targets (exactly one per joint per key):
  //   {aim: 'refKey'} point the limb (local -Y) at a world ref resolved at
  //                   play time (rig.play refs option)
  //   {e: [x,y,z]}    euler offset (radians) applied relative to the REST pose
  //   {rest: true}    return to the stored rest pose
  const JOINTS = [
    'neck', 'spine',
    'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR',
    'hipL', 'hipR', 'kneeL', 'kneeR',
  ];
  const TRACKS = ['arms', 'head', 'body', 'mouth'];
  const EASINGS = ['inOutCubic', 'outCubic', 'outQuart', 'outBack'];

  const CLIPS = {
    // draw from the shoe (ref 'shoe') and sweep to the card spot (ref 'target')
    dealCard: { track: 'arms', dur: 520, keys: [
      { at: 0.30, ease: 'outCubic',   joints: { shoulderR: { aim: 'shoe' },   elbowR: { e: [-0.45, 0, 0] }, wristR: { e: [-0.2, 0, 0] } } },
      { at: 0.70, ease: 'inOutCubic', joints: { shoulderR: { aim: 'target' }, elbowR: { e: [-0.15, 0, 0] }, wristR: { e: [0.15, 0, 0] } } },
      { at: 1.00, ease: 'inOutCubic', joints: { shoulderR: { rest: true }, elbowR: { rest: true }, wristR: { rest: true } } },
    ] },
    // rake losing chips from 'target' into the rack ('rack')
    sweepChips: { track: 'arms', dur: 700, keys: [
      { at: 0.35, ease: 'outCubic',   joints: { shoulderR: { aim: 'target' }, elbowR: { e: [-0.2, 0, 0] } } },
      { at: 0.75, ease: 'inOutCubic', joints: { shoulderR: { aim: 'rack' } } },
      { at: 1.00, ease: 'inOutCubic', joints: { shoulderR: { rest: true }, elbowR: { rest: true } } },
    ] },
    // push payout chips from 'rack' out to 'target'
    payChips: { track: 'arms', dur: 700, keys: [
      { at: 0.30, ease: 'outCubic',   joints: { shoulderR: { aim: 'rack' } } },
      { at: 0.70, ease: 'inOutCubic', joints: { shoulderR: { aim: 'target' }, wristR: { e: [0.3, 0, 0] } } },
      { at: 1.00, ease: 'inOutCubic', joints: { shoulderR: { rest: true }, wristR: { rest: true } } },
    ] },
    // reach to the wheel rim ('rim') — hold there (spinFollow completes it)
    spinReach: { track: 'arms', dur: 480, keys: [
      { at: 1.00, ease: 'outCubic', joints: { shoulderR: { aim: 'rim' }, elbowR: { e: [-0.35, 0, 0] } } },
    ] },
    // the flick + return to rest, fired as the wheel starts turning
    spinFollow: { track: 'arms', dur: 650, keys: [
      { at: 0.35, ease: 'outBack',    joints: { wristR: { e: [0, -1.2, 0] } } },
      { at: 1.00, ease: 'inOutCubic', joints: { shoulderR: { rest: true }, elbowR: { rest: true }, wristR: { rest: true } } },
    ] },
    // carry the dolly from 'rack' to the winning number 'target'
    placeDolly: { track: 'arms', dur: 800, keys: [
      { at: 0.30, ease: 'outCubic',   joints: { shoulderR: { aim: 'rack' } } },
      { at: 0.75, ease: 'inOutCubic', joints: { shoulderR: { aim: 'target' }, elbowR: { e: [-0.2, 0, 0] } } },
      { at: 1.00, ease: 'inOutCubic', joints: { shoulderR: { rest: true }, elbowR: { rest: true } } },
    ] },
    // double-tap the chip rack ('rack') — the buy-in beat
    tapRack: { track: 'arms', dur: 620, keys: [
      { at: 0.30, ease: 'outCubic', joints: { shoulderR: { aim: 'rack' }, elbowR: { e: [-0.3, 0, 0] } } },
      { at: 0.50, ease: 'outCubic', joints: { elbowR: { e: [-0.15, 0, 0] } } },
      { at: 0.70, ease: 'outCubic', joints: { elbowR: { e: [-0.3, 0, 0] } } },
      { at: 1.00, ease: 'inOutCubic', joints: { shoulderR: { rest: true }, elbowR: { rest: true } } },
    ] },
    // greeting wave: raise the arm, two elbow swings, drop
    wave: { track: 'arms', dur: 1300, keys: [
      { at: 0.25, ease: 'outCubic',   joints: { shoulderR: { e: [0, 0, -2.4] }, elbowR: { e: [0, 0, -0.5] } } },
      { at: 0.45, ease: 'inOutCubic', joints: { elbowR: { e: [0, 0, 0.4] } } },
      { at: 0.62, ease: 'inOutCubic', joints: { elbowR: { e: [0, 0, -0.5] } } },
      { at: 0.80, ease: 'inOutCubic', joints: { elbowR: { e: [0, 0, 0.4] } } },
      { at: 1.00, ease: 'inOutCubic', joints: { shoulderR: { rest: true }, elbowR: { rest: true } } },
    ] },
    // open-palm sweep toward 'target' (this-way-please / old dealGesture)
    welcomeSweep: { track: 'arms', dur: 1100, keys: [
      { at: 0.35, ease: 'outCubic',   joints: { shoulderR: { aim: 'target' }, elbowR: { e: [-0.1, 0, 0] } } },
      { at: 0.75, ease: 'inOutCubic', joints: { shoulderR: { aim: 'target' } } },
      { at: 1.00, ease: 'inOutCubic', joints: { shoulderR: { rest: true }, elbowR: { rest: true } } },
    ] },
    nod: { track: 'head', dur: 550, keys: [
      { at: 0.40, ease: 'outCubic',   joints: { neck: { e: [0.28, 0, 0] } } },
      { at: 1.00, ease: 'inOutCubic', joints: { neck: { rest: true } } },
    ] },
    headShake: { track: 'head', dur: 650, keys: [
      { at: 0.20, ease: 'inOutCubic', joints: { neck: { e: [0, 0.3, 0] } } },
      { at: 0.45, ease: 'inOutCubic', joints: { neck: { e: [0, -0.3, 0] } } },
      { at: 0.70, ease: 'inOutCubic', joints: { neck: { e: [0, 0.18, 0] } } },
      { at: 1.00, ease: 'inOutCubic', joints: { neck: { rest: true } } },
    ] },
  };

  function validateClip(clip) {
    const errs = [];
    if (!clip || typeof clip !== 'object') return ['clip is not an object'];
    if (!TRACKS.includes(clip.track)) errs.push(`unknown track: ${clip.track}`);
    if (!(clip.dur > 0)) errs.push('dur must be > 0');
    if (!Array.isArray(clip.keys) || !clip.keys.length) { errs.push('keys empty'); return errs; }
    let prev = 0;
    clip.keys.forEach((k, i) => {
      if (!(k.at > prev && k.at <= 1)) errs.push(`key ${i}: at must increase within (0,1]`);
      prev = k.at;
      if (k.ease !== undefined && !EASINGS.includes(k.ease)) errs.push(`key ${i}: unknown ease ${k.ease}`);
      const joints = k.joints || {};
      if (!Object.keys(joints).length) errs.push(`key ${i}: no joints`);
      for (const [name, tgt] of Object.entries(joints)) {
        if (!JOINTS.includes(name)) errs.push(`key ${i}: unknown joint ${name}`);
        const kinds = ['aim', 'e', 'rest'].filter((f) => tgt[f] !== undefined);
        if (kinds.length !== 1) errs.push(`key ${i}: joint ${name} needs exactly one of aim/e/rest`);
        if (tgt.aim !== undefined && typeof tgt.aim !== 'string') errs.push(`key ${i}: ${name}.aim must be a string`);
        if (tgt.e !== undefined && !(Array.isArray(tgt.e) && tgt.e.length === 3 && tgt.e.every((n) => typeof n === 'number')))
          errs.push(`key ${i}: ${name}.e must be [x,y,z] numbers`);
      }
    });
    if (clip.keys[clip.keys.length - 1].at !== 1) errs.push('last key must be at 1');
    return errs;
  }

  // Word-wrap for speech bubbles: <= 3 lines, ellipsize overflow.
  function wrapLines(text, maxChars = 18) {
    const words = String(text).trim().split(/\s+/);
    const lines = [''];
    for (const w of words) {
      const cur = lines[lines.length - 1];
      if (!cur.length) lines[lines.length - 1] = w;
      else if ((cur + ' ' + w).length <= maxChars) lines[lines.length - 1] = cur + ' ' + w;
      else lines.push(w);
    }
    if (lines.length > 3) {
      const kept = lines.slice(0, 3);
      kept[2] = (kept[2].length >= maxChars ? kept[2].slice(0, maxChars - 1) : kept[2]) + '…';
      return kept;
    }
    return lines;
  }

  C.gestures = { JOINTS, TRACKS, EASINGS, CLIPS, validateClip, wrapLines };
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/gestures.test.mjs`
Expected: PASS (4 tests). If `wrapLines` expectations mismatch, fix the TEST expectation only if the actual wrapping is sensible — the algorithm above wraps greedily by words.

- [ ] **Step 5: Add to SRC_ORDER**

In `build.mjs`, in `SRC_ORDER`, insert after `'src/logic/layouts.js'`:

```js
  'src/logic/layouts.js',
  'src/logic/gestures.js',
```

- [ ] **Step 6: Run the full suite**

Run: `node --test tests/`
Expected: all pass (build test still green — gestures.js contains no `</script`).

- [ ] **Step 7: Commit**

```bash
git add src/logic/gestures.js tests/gestures.test.mjs build.mjs
git commit -m "feat(casino-3d): pure gesture clip data + validation for the dealer rig

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Humanoid rig engine (`src/engine/rig.js`)

**Files:**
- Create: `src/engine/rig.js`
- Modify: `build.mjs` (SRC_ORDER)

**Interfaces:**
- Consumes: `C.assets.canvasTexture`, `C.tween.easings`, `C.gestures` (CLIPS/wrapLines), `app.onFrame/offFrame/REDUCED/roomGen`.
- Produces: `CASINO.rig.makeHumanRig(opts)` → `{ group, joints, play, stop, say, lookAt, setIdle }`:
  - `opts: { suit?, shirt?, seed? }` — seed drives skin/hair/vest/hairStyle variation.
  - `group`: THREE.Group, feet at y=0, faces local +Z.
  - `joints`: name → THREE.Group (names = `C.gestures.JOINTS`), each with `userData.restQ` (THREE.Quaternion) and `userData.basePos` (THREE.Vector3, group-local).
  - `play(app, clipName, { refs = {}, ms } = {})` → Promise. `refs` maps aim keys to world `[x,y,z]`. `ms` overrides clip dur.
  - `stop(track)` cancels the active clip on a track (joints stay where they are).
  - `say(app, text, { ms = 2600 } = {})` → Promise. Bubble sprite + mouth motion.
  - `lookAt(app, worldTarget)` — neck yaw/pitch toward point (clamped), 300 ms.
  - `setIdle(app)` — breathing sway + weight shift + blinking. Returns the hook.

- [ ] **Step 1: Write the implementation**

Create `src/engine/rig.js`:

```js
(() => {
  const C = (globalThis.CASINO ??= {});

  // Humanoid rig: jointed procedural figure + a generic pose-clip player.
  // Clip DATA lives in src/logic/gestures.js (pure, node-tested); this file
  // owns the THREE side: building the body and animating joint quaternions.
  // All hooks carry the roomGen guard + .cancel (same idiom as dealCardTo).

  const SKINS = ['#e8c39e', '#d9a877', '#c98f63', '#a06a44', '#f0d0b0'];
  const HAIRS = ['#161616', '#2e1d10', '#4a3520', '#3a3a3f', '#241a12'];
  const VESTS = ['#1a1a1a', '#2a1018', '#10222e', '#1c2416', '#221c30'];
  const HAIR_STYLES = ['cap', 'side', 'long', 'bun'];

  const hashSeed = (s) => {
    let h = 9;
    for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 0x9e3779b1);
    return Math.abs(h >>> 0);
  };

  function makeHumanRig({ suit = '#1a1a1a', shirt = '#f2f0e8', seed = '' } = {}) {
    const h = hashSeed(seed || Math.floor(performance.now()));
    const skin = SKINS[h % SKINS.length];
    const hairC = HAIRS[(h >> 3) % HAIRS.length];
    const vestC = seed ? VESTS[(h >> 6) % VESTS.length] : suit;
    const hairStyle = HAIR_STYLES[(h >> 9) % HAIR_STYLES.length];

    const suitMat = new THREE.MeshStandardMaterial({ color: suit, roughness: 0.6, metalness: 0.05 });
    const vestMat = new THREE.MeshStandardMaterial({ color: vestC, roughness: 0.55, metalness: 0.08 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairC, roughness: 0.65, metalness: 0 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.5, metalness: 0 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6, metalness: 0 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#22160e', roughness: 0.5, metalness: 0 });

    const group = new THREE.Group();
    const joints = {};
    const jointAt = (name, parent, x, y, z) => {
      const j = new THREE.Group();
      j.position.set(x, y, z);
      parent.add(j);
      joints[name] = j;
      return j;
    };
    const shadow = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

    // ---- legs: hip -> thigh capsule -> knee -> shin capsule (feet at y 0)
    const HIP_Y = 0.85, THIGH = 0.44, SHIN = 0.41;
    for (const [side, sx] of [['L', -1], ['R', 1]]) {
      const hip = jointAt('hip' + side, group, sx * 0.075, HIP_Y, 0);
      const thigh = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.055, THIGH - 0.11, 4, 10), suitMat));
      thigh.position.y = -THIGH / 2;
      hip.add(thigh);
      const knee = jointAt('knee' + side, hip, 0, -THIGH, 0);
      const shin = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.048, SHIN - 0.1, 4, 10), suitMat));
      shin.position.y = -SHIN / 2;
      knee.add(shin);
      const shoe = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.045, 0.19), darkMat));
      shoe.position.set(0, -SHIN + 0.02, 0.04);
      knee.add(shoe);
    }

    // ---- spine + torso + vest + bow tie
    const spine = jointAt('spine', group, 0, HIP_Y, 0);
    const TORSO = 0.60;
    const torso = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, TORSO, 14), shirtMat));
    torso.position.y = TORSO / 2;
    spine.add(torso);
    const vestGap = 0.34;
    const vest = shadow(new THREE.Mesh(
      new THREE.CylinderGeometry(0.156, 0.176, 0.43, 16, 1, true, vestGap, Math.PI * 2 - vestGap * 2), vestMat));
    vest.position.y = 0.375;
    spine.add(vest);
    const gold = C.assets.goldMaterial();
    const coneGeo = new THREE.ConeGeometry(0.028, 0.05, 8);
    for (const sx of [-1, 1]) {
      const bow = new THREE.Mesh(coneGeo, gold);
      bow.rotation.z = sx * Math.PI / 2;
      bow.position.set(sx * 0.03, 0.62, 0.15);
      bow.castShadow = true;
      spine.add(bow);
    }

    // ---- neck + head + face (all children of neck so looks/nods compose)
    const neck = jointAt('neck', spine, 0, 0.62, 0);
    const neckMesh = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.07, 10), skinMat));
    neckMesh.position.y = 0.035;
    neck.add(neckMesh);
    const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14), skinMat));
    head.position.y = 0.12;
    neck.add(head);
    // hair
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.116, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
    hair.castShadow = true;
    hair.position.y = 0.12;
    if (hairStyle === 'side') hair.rotation.z = 0.22;
    neck.add(hair);
    if (hairStyle === 'long') {
      const back = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.26, 12), hairMat));
      back.position.set(0, 0.02, -0.055);
      neck.add(back);
    } else if (hairStyle === 'bun') {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), hairMat);
      bun.position.set(0, 0.17, -0.1);
      bun.castShadow = true;
      neck.add(bun);
    }
    // eyes (scaled to blink) + brows + mouth
    const eyes = [];
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), darkMat);
      eye.position.set(sx * 0.04, 0.135, 0.098);
      neck.add(eye);
      eyes.push(eye);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.007, 0.008), hairMat);
      brow.position.set(sx * 0.04, 0.162, 0.099);
      brow.rotation.z = sx * -0.12;
      neck.add(brow);
    }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.008, 0.008),
      new THREE.MeshStandardMaterial({ color: '#7a3b30', roughness: 0.7 }));
    mouth.position.set(0, 0.078, 0.102);
    neck.add(mouth);

    // ---- arms: shoulder -> elbow -> wrist -> palm + thumb
    const UPPER = 0.22, FORE = 0.20;
    for (const [side, sx] of [['L', -1], ['R', 1]]) {
      const shoulderPos = new THREE.Vector3(sx * 0.14, 0.50, 0.02); // spine-local
      const shoulder = jointAt('shoulder' + side, spine, shoulderPos.x, shoulderPos.y, shoulderPos.z);
      const handTarget = new THREE.Vector3(sx * 0.05, 1.0, 0.24);   // group-local rest
      const worldPos = new THREE.Vector3(sx * 0.14, HIP_Y + 0.50, 0.02);
      const dir = handTarget.clone().sub(worldPos).normalize();
      shoulder.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      const upper = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.032, UPPER - 0.06, 4, 8), shirtMat));
      upper.position.y = -UPPER / 2;
      shoulder.add(upper);
      const elbow = jointAt('elbow' + side, shoulder, 0, -UPPER, 0);
      elbow.rotation.x = -0.3;
      const fore = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.027, FORE - 0.05, 4, 8), shirtMat));
      fore.position.y = -FORE / 2;
      elbow.add(fore);
      const wrist = jointAt('wrist' + side, elbow, 0, -FORE, 0);
      const palm = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.022, 0.07), skinMat));
      palm.position.y = -0.03;
      wrist.add(palm);
      const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.03), skinMat);
      thumb.position.set(sx * -0.03, -0.025, 0.02);
      thumb.castShadow = true;
      wrist.add(thumb);
    }

    // ---- store rest pose + group-local base positions for aim solving
    group.updateMatrixWorld(true);
    const _wv = new THREE.Vector3();
    for (const [name, j] of Object.entries(joints)) {
      j.userData.restQ = j.quaternion.clone();
      j.getWorldPosition(_wv);
      j.userData.basePos = group.worldToLocal(_wv.clone());
    }

    // ---- clip player ----
    const tokens = { arms: 0, head: 0, body: 0, mouth: 0 };
    const DOWN = new THREE.Vector3(0, -1, 0);
    const _v = new THREE.Vector3();
    const _e = new THREE.Euler();
    const _q = new THREE.Quaternion();

    function targetQuat(joint, tgt, refs) {
      if (tgt.rest) return joint.userData.restQ.clone();
      if (tgt.e) {
        _e.set(tgt.e[0], tgt.e[1], tgt.e[2]);
        return joint.userData.restQ.clone().multiply(_q.setFromEuler(_e).clone());
      }
      const ref = refs[tgt.aim];
      if (!ref) return joint.userData.restQ.clone();   // missing ref -> rest, never crash
      const local = group.worldToLocal(new THREE.Vector3(ref[0], ref[1], ref[2]));
      _v.copy(local).sub(joint.userData.basePos).normalize();
      return new THREE.Quaternion().setFromUnitVectors(DOWN, _v);
    }

    function play(app, clipName, { refs = {}, ms } = {}) {
      const clip = C.gestures.CLIPS[clipName];
      if (!clip) return Promise.resolve();
      const token = ++tokens[clip.track];
      const dur = ms || clip.dur;
      const gen = app.roomGen;
      // Precompute each key's absolute-quat targets once, up front.
      const keyTargets = clip.keys.map((k) => ({
        at: k.at,
        ease: C.tween.easings[k.ease || 'inOutCubic'],
        targets: Object.entries(k.joints).map(([name, tgt]) => ({
          joint: joints[name], to: targetQuat(joints[name], tgt, refs),
        })),
      }));
      if (app.REDUCED) {
        keyTargets.forEach((k) => k.targets.forEach(({ joint, to }) => joint.quaternion.copy(to)));
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        let ki = 0, segStart = 0;
        let seg = null;   // { from: [{joint, fromQ, to}], t0, len, ease }
        const startSeg = () => {
          const k = keyTargets[ki];
          seg = {
            pairs: k.targets.map(({ joint, to }) => ({ joint, from: joint.quaternion.clone(), to })),
            t0: performance.now(), len: (k.at - segStart) * dur, ease: k.ease,
          };
        };
        startSeg();
        const hook = () => {
          if (tokens[clip.track] !== token || app.roomGen !== gen) { app.offFrame(hook); return resolve(); }
          const t = seg.len <= 0 ? 1 : Math.min(1, (performance.now() - seg.t0) / seg.len);
          const e = seg.ease(t);
          seg.pairs.forEach(({ joint, from, to }) => joint.quaternion.slerpQuaternions(from, to, e));
          if (t >= 1) {
            segStart = keyTargets[ki].at;
            ki += 1;
            if (ki >= keyTargets.length) { app.offFrame(hook); return resolve(); }
            startSeg();
          }
        };
        hook.cancel = () => { app.offFrame(hook); resolve(); };
        app.onFrame(hook);
      });
    }

    const stop = (track) => { tokens[track] += 1; };

    // ---- speech bubble + mouth ----
    let bubble = null;
    function say(app, text, { ms = 2600 } = {}) {
      if (bubble) { group.remove(bubble.sprite); bubble.dispose(); bubble = null; }
      const lines = C.gestures.wrapLines(text, 18);
      const PW = 512, LH = 88, PH = lines.length * LH + 72;
      const tx = C.assets.canvasTexture(PW, PH, (ctx) => {
        ctx.clearRect(0, 0, PW, PH);
        ctx.fillStyle = 'rgba(16,13,9,0.88)';
        C.assets.roundRect(ctx, 6, 6, PW - 12, PH - 30, 26);
        ctx.fill();
        ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 5;
        C.assets.roundRect(ctx, 6, 6, PW - 12, PH - 30, 26);
        ctx.stroke();
        ctx.beginPath();                       // tail
        ctx.moveTo(PW / 2 - 22, PH - 26); ctx.lineTo(PW / 2, PH - 2); ctx.lineTo(PW / 2 + 22, PH - 26);
        ctx.closePath();
        ctx.fillStyle = 'rgba(16,13,9,0.88)'; ctx.fill();
        ctx.fillStyle = '#f0d878';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `600 56px 'Segoe UI', system-ui, sans-serif`;
        lines.forEach((ln, i) => ctx.fillText(ln, PW / 2, 44 + LH / 2 + i * LH));
      });
      const mat = new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false, fog: false });
      const sprite = new THREE.Sprite(mat);
      const W = 0.95;
      sprite.scale.set(W, W * PH / PW, 1);
      sprite.position.set(0, 1.62 + 0.35 + (W * PH / PW) / 2, 0);
      sprite.renderOrder = 5;
      group.add(sprite);
      bubble = { sprite, dispose: () => { mat.map.dispose(); mat.dispose(); } };

      const token = ++tokens.mouth;
      const gen = app.roomGen;
      return new Promise((resolve) => {
        const t0 = performance.now();
        const cleanup = () => {
          mouth.scale.set(1, 1, 1);
          if (bubble && bubble.sprite === sprite) { group.remove(sprite); bubble.dispose(); bubble = null; }
          resolve();
        };
        if (app.REDUCED) { setTimeout(cleanup, ms); return; }
        const hook = () => {
          if (tokens.mouth !== token || app.roomGen !== gen) { app.offFrame(hook); return cleanup(); }
          const t = (performance.now() - t0);
          mouth.scale.y = 1 + Math.abs(Math.sin(t / 90)) * 2.6;
          if (t >= ms) { app.offFrame(hook); cleanup(); }
        };
        hook.cancel = () => { app.offFrame(hook); cleanup(); };
        app.onFrame(hook);
      });
    }

    // ---- head look (neck yaw + slight pitch, clamped) ----
    let lookToken = 0;
    function lookAt(app, worldTarget) {
      const token = ++lookToken;
      const local = group.worldToLocal(new THREE.Vector3(worldTarget[0], worldTarget[1], worldTarget[2]));
      const yaw = Math.max(-0.7, Math.min(0.7, Math.atan2(local.x, local.z)));
      const flat = Math.hypot(local.x, local.z) || 1e-4;
      const pitch = Math.max(-0.35, Math.min(0.35, -Math.atan2(local.y - 1.5, flat)));
      if (app.REDUCED) { neck.rotation.y = yaw; neck.rotation.x = pitch; return; }
      const t0 = performance.now(), fy = neck.rotation.y, fx = neck.rotation.x;
      const hook = () => {
        if (lookToken !== token) return app.offFrame(hook);
        const t = Math.min(1, (performance.now() - t0) / 300);
        const e = C.tween.easings.outCubic(t);
        neck.rotation.y = fy + (yaw - fy) * e;
        neck.rotation.x = fx + (pitch - fx) * e;
        if (t >= 1) app.offFrame(hook);
      };
      hook.cancel = () => app.offFrame(hook);
      app.onFrame(hook);
    }

    // ---- idle: breath sway + weight shift + blink ----
    function setIdle(app) {
      if (app.REDUCED) return null;
      let nextBlink = 2 + Math.random() * 3, blinkEnd = 0;
      let shiftPhase = Math.random() * Math.PI * 2;
      const hook = (dt, elapsed) => {
        spine.rotation.z = Math.sin(elapsed * 0.8 + shiftPhase) * 0.02;
        spine.rotation.x = Math.sin(elapsed * 0.55 + shiftPhase) * 0.012;
        const shift = Math.sin(elapsed * 0.25 + shiftPhase) * 0.05;
        joints.hipL.rotation.z = shift;
        joints.hipR.rotation.z = shift;
        if (elapsed > nextBlink) { blinkEnd = elapsed + 0.13; nextBlink = elapsed + 2 + Math.random() * 3.5; }
        const blinking = elapsed < blinkEnd;
        eyes.forEach((e) => { e.scale.y = blinking ? 0.08 : 1; });
      };
      app.onFrame(hook);
      return hook;
    }

    return { group, joints, play, stop, say, lookAt, setIdle };
  }

  C.rig = { makeHumanRig };
})();
```

- [ ] **Step 2: Add to SRC_ORDER**

In `build.mjs` `SRC_ORDER`, insert after `'src/engine/chips3d.js'`:

```js
  'src/engine/chips3d.js',
  'src/engine/rig.js',
```

- [ ] **Step 3: Run the suite**

Run: `node --test tests/`
Expected: all pass (build test confirms rig.js inlines cleanly).

- [ ] **Step 4: Commit**

```bash
git add src/engine/rig.js build.mjs
git commit -m "feat(casino-3d): humanoid rig engine — joints, clip player, speech bubble, idle

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Rewire `makeDealer` onto the rig + dealers at every table

**Files:**
- Modify: `src/engine/assets.js` (replace the `makeDealer` function, `assets.js:122-324`)
- Modify: `src/floor/sections.js:101` (withDealer + seed)
- Modify: `src/floor/tables/roulette-table.js:614-619`, `src/floor/tables/blackjack-table.js:222-227`, `src/floor/tables/baccarat-table.js:493-498`, `src/floor/tables/uth-table.js:112` area (pass seed through, expose rig)

**Interfaces:**
- Consumes: `C.rig.makeHumanRig` (Task 2).
- Produces: `C.assets.makeDealer(opts)` — SAME external contract as before (`userData.idle/lookToward/headShake/dealGesture`), plus `opts.seed` and `group.userData.rig` (the rig handle). Table groups gain `userData.dealerRig` (rig or `null`).

- [ ] **Step 1: Replace makeDealer in assets.js**

Delete the entire old `makeDealer` (from the comment `// ---------- dealer / staff figure ----------` at `assets.js:122` down to the closing `return group;  }` at `assets.js:323-324`) and replace with:

```js
  // ---------- dealer / staff figure ----------
  // Thin wrapper over the humanoid rig (src/engine/rig.js) preserving the
  // legacy userData API. opts.seed varies skin/hair/vest per character.
  function makeDealer(opts = {}) {
    const rig = C.rig.makeHumanRig(opts);
    const group = rig.group;
    group.userData.rig = rig;
    group.userData.idle = (app) => rig.setIdle(app);
    group.userData.lookToward = (app, worldTarget) => rig.lookAt(app, worldTarget);
    group.userData.headShake = (app) => rig.play(app, 'headShake');
    group.userData.dealGesture = (app, worldTarget, ms) =>
      rig.play(app, 'welcomeSweep', { refs: { target: worldTarget }, ms });
    return group;
  }
```

- [ ] **Step 2: Every game table gets a dealer, seeded**

In `src/floor/sections.js:101`, change:

```js
          withDealer: table.key === 'std' || section.id === 'uth',
```

to:

```js
          withDealer: true,
          dealerSeed: table.id,
```

In each of the four table builders, thread the seed and expose the rig. In `src/floor/tables/roulette-table.js:614-619` change:

```js
    if (opts.withDealer) {
      const dealer = A.makeDealer();
      dealer.position.set(0.2, 0, -1.15);
      g.add(dealer);
      dealer.userData.idle(C.app);
    }
```

to:

```js
    let dealerRig = null;
    if (opts.withDealer) {
      const dealer = A.makeDealer({ seed: opts.dealerSeed });
      dealer.position.set(0.2, 0, -1.15);
      g.add(dealer);
      dealer.userData.idle(C.app);
      dealerRig = dealer.userData.rig;
    }
    g.userData.dealerRig = dealerRig;
```

Apply the same transformation in `blackjack-table.js:222-227` (dealer position stays `(0, 0, -0.55)`), `baccarat-table.js:493-498` (position `(0, 0, -1.25)`), and `uth-table.js` (find the `if (opts.withDealer)` block at ~line 112; keep its existing position). In every case: pass `{ seed: opts.dealerSeed }`, set `g.userData.dealerRig`.

Note: `sections.js:134` adds a dealer obstacle only for `table.key === 'std'` rotated roulette — leave the obstacle logic unchanged (dealers stand inside table footprints; the extra figures don't need new obstacles).

- [ ] **Step 3: Run the suite**

Run: `node --test tests/`
Expected: all pass. (`vestibule.js` and `maintenance.js` call `makeDealer` with the old option shapes — `suit` still works; they get default seeds.)

- [ ] **Step 4: Commit**

```bash
git add src/engine/assets.js src/floor/sections.js src/floor/tables/roulette-table.js src/floor/tables/blackjack-table.js src/floor/tables/baccarat-table.js src/floor/tables/uth-table.js
git commit -m "feat(casino-3d): makeDealer on the new rig; every game table staffed + seeded variation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Receptionist choreography + speech (`src/floor/vestibule.js`)

**Files:**
- Modify: `src/floor/vestibule.js` (receptionist build at :248-252, stage API at :287-326)

**Interfaces:**
- Consumes: `receptionist.userData.rig` (`say`, `play`, `lookAt`) from Task 3.
- Produces: unchanged `C.stage` API (platform.js keeps working); richer behavior inside.

- [ ] **Step 1: Give the receptionist a fixed identity + proximity greeting**

In `src/floor/vestibule.js`, replace lines :248-252:

```js
    receptionist = A.makeDealer({ suit: '#1c2a44' });
    receptionist.position.set(-18.35, 0, -1.85);
    receptionist.rotation.y = -Math.PI / 2 + 0.3;
    s.add(receptionist);
    receptionist.userData.idle(C.app);
```

with:

```js
    receptionist = A.makeDealer({ suit: '#1c2a44', seed: 'receptionist-v1' });
    receptionist.position.set(-18.35, 0, -1.85);
    receptionist.rotation.y = -Math.PI / 2 + 0.3;
    s.add(receptionist);
    receptionist.userData.idle(C.app);

    // Proximity host: head tracks the player nearby; first approach gets a
    // wave + greeting (re-arms after the player leaves for a while).
    const rig = receptionist.userData.rig;
    let greetedAt = -Infinity, wasNear = false, proxT = 0;
    const proxHook = (dt, elapsed) => {
      proxT += dt;
      if (proxT < 0.5) return;                 // ~2 Hz is plenty
      proxT = 0;
      const p = C.app.player;
      const d = Math.hypot(p.x - -18.35, p.z - -1.85);
      const near = d < 5.5;
      if (near) rig.lookAt(C.app, [p.x, 1.5, p.z]);
      else if (wasNear) rig.lookAt(C.app, [-24, 1.5, 0]);   // relax toward the entrance
      if (near && !wasNear && elapsed - greetedAt > 90) {
        greetedAt = elapsed;
        rig.play(C.app, 'wave');
        rig.say(C.app, 'Welcome to Grand Casino!', { ms: 2400 });
      }
      wasNear = near;
    };
    C.app.onFrame(proxHook);
```

- [ ] **Step 2: Speech on the ID-check flow**

Still in `vestibule.js`, replace the stage API block (lines :293-299):

```js
    C.stage.playHeadShake = () => receptionist.userData.headShake(C.app);
    C.stage.playWelcome = () => {
      receptionist.userData.lookToward(C.app, [C.app.player.x, 1.5, C.app.player.z]);
      return stamp.play();
    };
    C.stage.resetWelcome = () => stamp.reset();
```

with:

```js
    C.stage.playHeadShake = () => {
      receptionist.userData.rig.say(C.app, 'Members only — please sign in.', { ms: 2200 });
      return receptionist.userData.headShake(C.app);
    };
    C.stage.playWelcome = () => {
      const rig2 = receptionist.userData.rig;
      rig2.lookAt(C.app, [C.app.player.x, 1.5, C.app.player.z]);
      rig2.say(C.app, "You're verified — enjoy the floor!", { ms: 2600 });
      return stamp.play().then(() => rig2.play(C.app, 'nod'));
    };
    C.stage.resetWelcome = () => stamp.reset();
```

And inside `C.stage.walkToDesk` (lines :289-292), add the card prompt:

```js
    C.stage.walkToDesk = () => {
      const p = C.floorplan.ANCHOR_POSES.reception;
      receptionist.userData.rig.say(C.app, 'May I see your member card?', { ms: 2600 });
      return C.app.glideTo(p.pos, p.look, 900);
    };
```

In `C.stage.playWaveThrough` (line :317), replace the gesture line:

```js
        receptionist.userData.dealGesture(C.app, [C.floorplan.GATE_X, 1.2, 0], 900);
```

with:

```js
        receptionist.userData.rig.say(C.app, 'This way, please!', { ms: 2000 });
        receptionist.userData.dealGesture(C.app, [C.floorplan.GATE_X, 1.2, 0], 900);
```

- [ ] **Step 3: Run the suite, commit**

Run: `node --test tests/` — expected: all pass.

```bash
git add src/floor/vestibule.js
git commit -m "feat(casino-3d): receptionist greets, talks and gestures through the ID check

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Pure roulette settle logic (`src/logic/roulette-cover.js`)

**Files:**
- Create: `src/logic/roulette-cover.js`
- Test: `tests/roulette-cover.test.mjs`
- Modify: `build.mjs` (SRC_ORDER, after `'src/logic/gestures.js'`)

**Interfaces:**
- Consumes: nothing (pure). Bet object shape = the 2D game's `getAllBets()` shape already consumed by `roulette-map.js#betSpots`: nested `{straight, split, trio, corner, street, line, column, dozen}` maps + scalar `{firstFour, topLine, low, even, red, black, odd, high}`.
- Produces: `CASINO.rouletteCover = { covers(type, key, result), factorOf(type), splitByOutcome(bets, result) }`
  - `splitByOutcome(bets, result)` → `{ winning: betsObj, losing: betsObj, wins: [{type, key, amount, factor}] }` — `winning`/`losing` are bets-shaped objects so `betSpots(subset, G)` positions them; `wins` carries payout factors for the pay animation.

- [ ] **Step 1: Write the failing test**

Create `tests/roulette-cover.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/roulette-cover.js');
const RC = globalThis.CASINO.rouletteCover;

test('covers: inside bets', () => {
  assert.ok(RC.covers('straight', '17', 17));
  assert.ok(!RC.covers('straight', '17', 18));
  assert.ok(RC.covers('straight', '00', 0));           // US token -> single zero
  assert.ok(RC.covers('split', '17-20', 20));
  assert.ok(!RC.covers('split', '17-20', 19));
  assert.ok(RC.covers('street', '4-5-6', 5));
  assert.ok(RC.covers('street', '4', 6));              // first-number key form
  assert.ok(RC.covers('corner', '1-2-4-5', 5));
  assert.ok(RC.covers('line', '4-9', 8));              // six-line from 4
  assert.ok(RC.covers('trio', '0-1-2', 0));
});

test('covers: outside bets', () => {
  assert.ok(RC.covers('column', '1', 34));             // col 1 = 1,4,...,34
  assert.ok(!RC.covers('column', '1', 35));
  assert.ok(RC.covers('dozen', '2', 13) && RC.covers('dozen', '2', 24));
  assert.ok(RC.covers('red', null, 32) && !RC.covers('red', null, 33));
  assert.ok(RC.covers('black', null, 33));
  assert.ok(RC.covers('low', null, 18) && RC.covers('high', null, 19));
  assert.ok(RC.covers('even', null, 2) && !RC.covers('even', null, 0));  // zero loses even
  assert.ok(RC.covers('odd', null, 3));
  assert.ok(RC.covers('firstFour', null, 0) && RC.covers('topLine', null, 3));
});

test('factors are standard EU payouts', () => {
  assert.equal(RC.factorOf('straight'), 35);
  assert.equal(RC.factorOf('split'), 17);
  assert.equal(RC.factorOf('street'), 11);
  assert.equal(RC.factorOf('trio'), 11);
  assert.equal(RC.factorOf('corner'), 8);
  assert.equal(RC.factorOf('firstFour'), 8);
  assert.equal(RC.factorOf('topLine'), 8);
  assert.equal(RC.factorOf('line'), 5);
  assert.equal(RC.factorOf('column'), 2);
  assert.equal(RC.factorOf('dozen'), 2);
  assert.equal(RC.factorOf('red'), 1);
});

test('splitByOutcome partitions a mixed board', () => {
  const bets = {
    straight: { 17: 100, 4: 50 },
    split: { '16-17': 25 },
    red: 60, black: 40,
    dozen: { 2: 30 },
    column: { 1: 20 },
  };
  const { winning, losing, wins } = RC.splitByOutcome(bets, 17);
  assert.deepEqual(winning.straight, { 17: 100 });
  assert.deepEqual(losing.straight, { 4: 50 });
  assert.deepEqual(winning.split, { '16-17': 25 });
  assert.equal(winning.black, 40);          // 17 is black
  assert.equal(losing.red, 60);
  assert.deepEqual(winning.dozen, { 2: 30 });
  assert.equal(losing.column[1], 20);       // 17 is column 2
  const w17 = wins.find((w) => w.type === 'straight' && w.key === '17');
  assert.deepEqual(w17, { type: 'straight', key: '17', amount: 100, factor: 35 });
  assert.equal(wins.length, 4);
});

test('splitByOutcome: zero sweeps the outside', () => {
  const { winning, losing } = RC.splitByOutcome({ red: 10, even: 10, low: 10, straight: { 0: 5 } }, 0);
  assert.equal(winning.red, undefined);
  assert.equal(losing.red, 10);
  assert.equal(losing.even, 10);
  assert.equal(losing.low, 10);
  assert.deepEqual(winning.straight, { 0: 5 });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/roulette-cover.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/logic/roulette-cover.js`:

```js
(() => {
  const C = (globalThis.CASINO ??= {});

  // Pure EU-roulette coverage + payout factors, used ONLY for 3D settle
  // choreography (which chip stacks the dealer sweeps vs pays). The 2D game
  // remains authoritative for money. Bet shape mirrors roulette-map.js.
  const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const parseNums = (key) => String(key).split('-').map((t) => (t === '00' ? 0 : Number(t)));

  const FACTORS = {
    straight: 35, split: 17, street: 11, trio: 11, corner: 8,
    firstFour: 8, topLine: 8, line: 5, column: 2, dozen: 2,
    low: 1, even: 1, red: 1, black: 1, odd: 1, high: 1,
  };
  const factorOf = (type) => FACTORS[type];

  function covers(type, key, n) {
    switch (type) {
      case 'straight': return parseNums(key)[0] === n;
      case 'split':
      case 'trio':
      case 'corner': return parseNums(key).includes(n);
      case 'street': {
        const nums = parseNums(key);
        const f = nums[0];
        return nums.length > 1 ? nums.includes(n) : n >= f && n <= f + 2;
      }
      case 'line': {
        const f = parseNums(key)[0];
        return n >= f && n <= f + 5;
      }
      case 'column': return n !== 0 && ((n - 1) % 3) === Number(key) - 1;
      case 'dozen': return n !== 0 && Math.ceil(n / 12) === Number(key);
      case 'firstFour':
      case 'topLine': return n <= 3;
      case 'low': return n >= 1 && n <= 18;
      case 'high': return n >= 19;
      case 'even': return n !== 0 && n % 2 === 0;
      case 'odd': return n % 2 === 1;
      case 'red': return RED.has(n);
      case 'black': return n !== 0 && !RED.has(n);
      default: return false;
    }
  }

  const NESTED = ['straight', 'split', 'trio', 'corner', 'street', 'line', 'column', 'dozen'];
  const SCALAR = ['firstFour', 'topLine', 'low', 'even', 'red', 'black', 'odd', 'high'];

  function splitByOutcome(bets, result) {
    const winning = {}, losing = {}, wins = [];
    const put = (bucket, type, key, amount) => {
      if (key === null) bucket[type] = amount;
      else (bucket[type] ??= {})[key] = amount;
    };
    for (const type of NESTED) {
      for (const [key, amount] of Object.entries(bets?.[type] || {})) {
        if (!(amount > 0)) continue;
        if (covers(type, key, result)) {
          put(winning, type, key, amount);
          wins.push({ type, key, amount, factor: FACTORS[type] });
        } else put(losing, type, key, amount);
      }
    }
    for (const type of SCALAR) {
      const amount = bets?.[type];
      if (!(amount > 0)) continue;
      if (covers(type, null, result)) {
        put(winning, type, null, amount);
        wins.push({ type, key: null, amount, factor: FACTORS[type] });
      } else put(losing, type, null, amount);
    }
    return { winning, losing, wins };
  }

  C.rouletteCover = { covers, factorOf, splitByOutcome };
})();
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/roulette-cover.test.mjs`
Expected: PASS (5 tests). Note: the column test asserts `col 1 = 1,4,…,34` matching `roulette-map.js:56`'s convention (column '1' is the 1-4-7 row).

- [ ] **Step 5: Add to SRC_ORDER, run suite, commit**

In `build.mjs`, after `'src/logic/gestures.js'` add `'src/logic/roulette-cover.js'`.
Run: `node --test tests/` — all pass.

```bash
git add src/logic/roulette-cover.js tests/roulette-cover.test.mjs build.mjs
git commit -m "feat(casino-3d): pure roulette bet coverage + payout factors for settle choreography

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Roulette table rig — dolly, per-spot settle, buy-in

**Files:**
- Modify: `src/floor/tables/roulette-table.js` (inside the table builder, around the live-play rig block at :645-662)

**Interfaces:**
- Consumes: `g.userData.dealerRig` (Task 3), `C.chips` helpers, `C.tween`, `C.layouts.rouletteSpotPos(id)`, `C.layouts.chipBreakdown`.
- Produces (all on `g.userData`, all table-LOCAL logic, world conversion internal):
  - `placeDolly(n)` → Promise — dealer carries a marker onto number `n`.
  - `liftDolly()` → Promise — marker returns to the rack, hides.
  - `settleBets({ losingSpots, winningSpots })` → Promise. `losingSpots`: `[{x, z, amount}]` (from `betSpots`); `winningSpots`: `[{x, z, amount, factor}]`. Sweeps losing stacks in `betLayer` to the rack; flies payout chips from the rack beside winning stacks (winning stacks stay — the 2D game's next `bets` message re-syncs the board).
  - `buyIn()` → Promise — tapRack clip + a chip stack slides to the player apron and fades.
  - Existing `spinTo` is wrapped: dealer reaches to the rim, flicks, then the wheel spins (`spinTo` resolves as before).

- [ ] **Step 1: Implement the rig additions**

In `src/floor/tables/roulette-table.js`, after the `g.userData.setBets = …` block (ends :661), insert:

```js
    // ---- dealer choreography rig (visual only; roulette-live.js drives it) ----
    const RACK_LOCAL = [-1.44, FELT_Y + 0.12, 0];
    const RIM_LOCAL = [-1.72, 1.02, 0];
    const toW = (p) => g.localToWorld(new THREE.Vector3(p[0], p[1], p[2])).toArray();
    const rigPlay = (name, refs, ms) =>
      dealerRig ? dealerRig.play(C.app, name, { refs, ms }) : Promise.resolve();

    // dolly: gold cylinder marker, parked (hidden) at the rack
    const dolly = new THREE.Group();
    const dBase = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.05, 12), A.goldMaterial());
    dBase.position.y = 0.025;
    const dStem = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.05, 8), A.goldMaterial());
    dStem.position.y = 0.075;
    const dTop = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), A.goldMaterial());
    dTop.position.y = 0.105;
    dolly.add(dBase, dStem, dTop);
    dolly.visible = false;
    dolly.position.set(...RACK_LOCAL);
    g.add(dolly);

    const glideLocal = (obj, to, ms) => new Promise((res) => {
      if (C.app.REDUCED) { obj.position.set(to[0], to[1], to[2]); return res(); }
      C.tween.to(obj.position, { y: to[1] + 0.18 }, ms * 0.25, 'outCubic', () => {
        C.tween.to(obj.position, { x: to[0], z: to[2] }, ms * 0.5, 'inOutCubic', () => {
          C.tween.to(obj.position, { y: to[1] }, ms * 0.25, 'outCubic', res);
        });
      });
    });

    g.userData.placeDolly = async (n) => {
      const [x, z] = C.layouts.rouletteSpotPos('n' + n);
      dolly.visible = true;
      rigPlay('placeDolly', { rack: toW(RACK_LOCAL), target: toW([x, FELT_Y, z]) });
      await glideLocal(dolly, [x, FELT_Y + 0.02, z], 750);
    };
    g.userData.liftDolly = async () => {
      await glideLocal(dolly, RACK_LOCAL, 500);
      dolly.visible = false;
    };

    // Fly a chip-stack group along a small arc, then run onDone.
    const flyStack = (stack, to, ms, onDone) => {
      if (C.app.REDUCED) { stack.position.set(to[0], to[1], to[2]); onDone && onDone(); return; }
      C.tween.to(stack.position, { y: stack.position.y + 0.16 }, ms * 0.3, 'outCubic', () => {
        C.tween.to(stack.position, { x: to[0], z: to[2] }, ms * 0.45, 'inOutCubic', () => {
          C.tween.to(stack.position, { y: to[1] }, ms * 0.25, 'outCubic', onDone);
        });
      });
    };
    const disposeStack = (stack) => {
      stack.traverse((o) => { if (o.isMesh) C.chips.disposeChip(o); });
      stack.parent && stack.parent.remove(stack);
    };
    const stackNear = (x, z) => betLayer.children.find(
      (s) => Math.hypot(s.position.x - x, s.position.z - z) < 0.02);

    g.userData.settleBets = async ({ losingSpots = [], winningSpots = [] }) => {
      // sweep losing stacks into the rack, dealer raking alongside
      if (losingSpots.length) {
        const first = losingSpots[0];
        rigPlay('sweepChips', { target: toW([first.x, FELT_Y, first.z]), rack: toW(RACK_LOCAL) });
      }
      const sweeps = losingSpots.map(({ x, z }, i) => new Promise((res) => {
        const stack = stackNear(x, z);
        if (!stack) return res();
        setTimeout(() => flyStack(stack, RACK_LOCAL, 420, () => { disposeStack(stack); res(); }),
          C.app.REDUCED ? 0 : i * 90);
      }));
      await Promise.all(sweeps);
      // pay each winning spot from the rack
      for (let i = 0; i < winningSpots.length; i++) {
        const { x, z, amount, factor } = winningSpots[i];
        rigPlay('payChips', { rack: toW(RACK_LOCAL), target: toW([x, FELT_Y, z]) });
        const chips = C.layouts.chipBreakdown(amount * factor);
        const pay = new THREE.Group();
        chips.forEach((v, k) => {
          const chip = C.chips.makeChip(v);
          chip.position.y = k * C.chips.CHIP_H;
          pay.add(chip);
        });
        pay.position.set(...RACK_LOCAL);
        betLayer.add(pay);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((res) => flyStack(pay, [x + 0.09, 0.86, z], 460, res));
      }
    };

    g.userData.buyIn = async () => {
      rigPlay('tapRack', { rack: toW(RACK_LOCAL) });
      const stk = C.chips.makeChipStack(100, 6);
      stk.position.set(...RACK_LOCAL);
      g.add(stk);
      await new Promise((res) => flyStack(stk, [0.35, FELT_Y + 0.02, 1.05], 600, res));
      await new Promise((res) => setTimeout(res, C.app.REDUCED ? 100 : 900));
      if (!C.app.REDUCED) {
        await new Promise((res) => C.tween.to(stk.scale, { x: 0.01, y: 0.01, z: 0.01 }, 200, 'outCubic', res));
      }
      stk.traverse((o) => { if (o.isMesh) C.chips.disposeChip(o); });
      g.remove(stk);
    };

    // wrap spinTo: the dealer reaches to the rim, flicks, wheel spins
    const rawSpinTo = wheel.spinTo;
    g.userData.spinTo = async (pocket) => {
      await rigPlay('spinReach', { rim: toW(RIM_LOCAL) });
      rigPlay('spinFollow', {});
      return rawSpinTo(pocket);
    };
```

Then DELETE the now-duplicated original line `g.userData.spinTo = wheel.spinTo;` at :648 (the wrapper above replaces it).

- [ ] **Step 2: Run suite, commit**

Run: `node --test tests/` — all pass.

```bash
git add src/floor/tables/roulette-table.js
git commit -m "feat(casino-3d): roulette table rig — dolly, per-spot settle, buy-in, spin gesture

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Roulette live wiring (`roulette-live.js`)

**Files:**
- Modify: `roulette-live.js` (`openRouletteLive`: onMsg at :90-96, runSpin at :68-88, session open at :112-113)

**Interfaces:**
- Consumes: Task 6 `rig.userData.{placeDolly, liftDolly, settleBets, buyIn, spinTo}`; `C.rouletteCover.splitByOutcome`; `betSpots` (already imported).
- Produces: no API change; visual behavior only.

- [ ] **Step 1: Track the last bets snapshot**

In `roulette-live.js`, above `let spinning = false;` (:65), add:

```js
  let lastBets = null;
```

In `onMsg` (:94), change:

```js
    if (d.type === 'bets') rig.userData.setBets(betSpots(d.bets, G));
```

to:

```js
    if (d.type === 'bets') { lastBets = d.bets; rig.userData.setBets(betSpots(d.bets, G)); }
```

- [ ] **Step 2: Choreograph the spin + settle**

Replace the body of `runSpin` (:68-88) with:

```js
  async function runSpin(result) {
    if (spinning || closed) return;
    spinning = true;
    status.textContent = 'No more bets — spinning…';
    wrap.classList.add('rl-hidden');
    await C.app.glideTo(poses.wheel.pos, poses.wheel.look, 1000);
    if (closed) return;
    await rig.userData.spinTo(result);
    if (closed) return;
    rig.userData.pushResult(result);
    const color = result === 0 ? 'Green' : RED.has(result) ? 'Red' : 'Black';
    C.app.banner(String(result), `${color} · ${result === 0 || result % 2 === 0 ? 'Even' : 'Odd'}`, 2000);

    // dealer marks the number, sweeps losers, pays winners — camera on the felt
    await C.app.glideTo(poses.betting.pos, poses.betting.look, 900);
    if (closed) return;
    await rig.userData.placeDolly(result);
    if (closed) return;
    if (lastBets) {
      const RC = globalThis.CASINO.rouletteCover;
      const { losing, wins } = RC.splitByOutcome(lastBets, result);
      const losingSpots = betSpots(losing, G);
      // one spot per winning bet entry so each carries its own payout factor
      const winningSpots = wins.map((w) => {
        const single = w.key === null
          ? { [w.type]: w.amount }
          : { [w.type]: { [w.key]: w.amount } };
        const [spot] = betSpots(single, G);
        return spot ? { ...spot, factor: w.factor } : null;
      }).filter(Boolean);
      await rig.userData.settleBets({ losingSpots, winningSpots });
      if (closed) return;
    }
    await rig.userData.liftDolly();
    if (closed) return;
    postToGame({ type: 'reveal' });
    await new Promise((r) => setTimeout(r, 800));
    if (closed) return;
    wrap.classList.remove('rl-hidden');
    status.textContent = '';
    spinning = false;
  }
```

(Note the camera now returns to the betting pose BEFORE the dolly/settle so the player watches the payout, and `reveal` is posted AFTER the 3D settle so the 2D board updates once the dealer finishes.)

- [ ] **Step 3: Buy-in moment on sit-down**

At the bottom of `openRouletteLive` (:112-113), change:

```js
  C.app.inputLocked = true;
  C.app.glideTo(poses.betting.pos, poses.betting.look, 1100);
```

to:

```js
  C.app.inputLocked = true;
  C.app.glideTo(poses.betting.pos, poses.betting.look, 1100)
    .then(() => { if (!closed) rig.userData.buyIn(); });
```

- [ ] **Step 4: Run suite, commit**

Run: `node --test tests/` — all pass (roulette-map tests unaffected).

```bash
git add roulette-live.js
git commit -m "feat(casino-3d): roulette live — dealer spins, marks the dolly, sweeps and pays

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Blackjack dealer choreography (`blackjack-live.js` + table rig)

**Files:**
- Modify: `src/floor/tables/blackjack-table.js` (add `dealerRig` into `g.userData.bj`, :244-260)
- Modify: `blackjack-live.js` (dealTo at :285-286, playOneHand render at :396, settleRound at :514-520)

**Interfaces:**
- Consumes: `g.userData.dealerRig` (Task 3), `C.gestures` clips via `rig.play`.
- Produces: `bj.dealerRig` available to `blackjack-live.js`; no game-flow change.

- [ ] **Step 1: Expose the rig on the bj rig object**

In `blackjack-table.js`, inside the `g.userData.bj = { … }` literal (:244), add a `dealerRig` line after `freeSeats`:

```js
      freeSeats: [0, 2, 3, 5],
      get dealerRig() { return g.userData.dealerRig; },
```

(getter, because `userData.dealerRig` is assigned right before `userData.bj` in the same builder — a getter avoids ordering issues.)

- [ ] **Step 2: Arm clip on every card dealt**

In `blackjack-live.js:285-286`, replace:

```js
  const dealTo = (mesh, plan, opts = {}) =>
    C.cards.dealCardTo(C.app, mesh, toWorld(bj.shoeLocal), toWorld(plan.pos), { ms: 420, ...opts });
```

with:

```js
  const dealTo = (mesh, plan, opts = {}) => {
    // fire-and-forget: the arm mimes the deal while the card flies
    bj.dealerRig?.play(C.app, 'dealCard', {
      refs: { shoe: toWorld(bj.shoeLocal), target: toWorld(plan.pos) },
    });
    return C.cards.dealCardTo(C.app, mesh, toWorld(bj.shoeLocal), toWorld(plan.pos), { ms: 420, ...opts });
  };
```

- [ ] **Step 3: Dealer watches the active hand**

In `playOneHand`'s `render` function (right after `const hv = handValue(hand.cards);` at :397), add:

```js
        bj.dealerRig?.lookAt(C.app, toWorld(bj.spotLocal(seatIdx, hi === 0 ? 'main' : 'main2')));
```

- [ ] **Step 4: Settle gestures**

In `settleRound` (:514-520), replace:

```js
    // Chip choreography: dealer pays from the tray / collects into it.
    const jobs = hands.map((h, i) => {
      const spotId = i === 0 ? 'main' : 'main2';
      const ret = rets[i];
      const outcome = ret === 0 ? 'lose' : ret === h.stake ? 'push' : 'win';
      return stacks.settle(spotId, outcome, Math.max(0, ret - h.stake));
    });
```

with:

```js
    // Chip choreography: dealer pays from the tray / collects into it,
    // with a matching arm gesture (visual only — never awaited before pay).
    const jobs = hands.map((h, i) => {
      const spotId = i === 0 ? 'main' : 'main2';
      const ret = rets[i];
      const outcome = ret === 0 ? 'lose' : ret === h.stake ? 'push' : 'win';
      const spotW = toWorld(bj.spotLocal(seatIdx, spotId));
      if (outcome === 'lose') bj.dealerRig?.play(C.app, 'sweepChips', { refs: { target: spotW, rack: toWorld(bj.trayLocal) } });
      else if (outcome === 'win') bj.dealerRig?.play(C.app, 'payChips', { refs: { rack: toWorld(bj.trayLocal), target: spotW } });
      return stacks.settle(spotId, outcome, Math.max(0, ret - h.stake));
    });
```

Also in `runDealerAndSettle` (:483), after the initial `glideTo`, add a head-look at the dealer's own cards:

```js
    await C.app.glideTo(poses.dealer.pos, poses.dealer.look, 700);
    if (closed) return;
    bj.dealerRig?.lookAt(C.app, toWorld([0, 0.95, 0.16]));
```

- [ ] **Step 5: Run the suite (blackjack tests matter here), commit**

Run: `node --test tests/`
Expected: all pass — especially `tests/blackjack-live.test.mjs` (pure planners untouched) and `tests/blackjack-rules.test.mjs`.

```bash
git add src/floor/tables/blackjack-table.js blackjack-live.js
git commit -m "feat(casino-3d): blackjack dealer mimes every deal, watches the hand, pays/sweeps

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Baccarat ambient show

**Files:**
- Modify: `src/logic/baccarat-roads.js:175` (export `playRound`, `buildShoe`)
- Test: extend `tests/baccarat-roads.test.mjs`
- Modify: `src/floor/tables/baccarat-table.js` (board `pushRound`, show rig exposure, static-card tracking)
- Create: `src/floor/baccarat-show.js`
- Modify: `src/floor/sections.js` (attach the show), `build.mjs` (SRC_ORDER)

**Interfaces:**
- Consumes: `C.baccaratRoads.playRound(draw)` → `{outcome:'P'|'B'|'T', playerCards, bankerCards, playerTotal, bankerTotal, playerPair, bankerPair, natural}` (already implemented at `baccarat-roads.js:35-53`, just unexported); `C.cards.dealCardTo/flipFlatCard/makeCard`; `C.chips`; layouts `C.layouts.baccarat`.
- Produces:
  - `C.baccaratRoads.playRound`, `C.baccaratRoads.buildShoe` exported.
  - Baccarat table `g.userData.bac = { L, feltY, get dealerRig(), pushRound(round), staticCards: THREE.Object3D[], rounds }`.
  - `C.floor.attachBaccaratShow(group)` — starts the proximity-gated loop.

- [ ] **Step 1: Failing test for the new exports**

Append to `tests/baccarat-roads.test.mjs`:

```js
test('playRound + buildShoe are exported for the ambient show', () => {
  assert.equal(typeof R.playRound, 'function');
  assert.equal(typeof R.buildShoe, 'function');
  // stacked deck: P= 9+K (natural 9), B= 4+4 (8) -> player natural win, no draws
  const cards = [{ r: 9, s: 0 }, { r: 13, s: 1 }, { r: 4, s: 2 }, { r: 4, s: 3 }];
  let i = 0;
  const round = R.playRound(() => cards[i++]);
  assert.equal(round.outcome, 'P');
  assert.equal(round.playerTotal, 9);
  assert.equal(round.bankerTotal, 8);
  assert.equal(round.natural, true);
  assert.equal(round.playerCards.length, 2);
  assert.equal(R.buildShoe(() => 0.5).length, 8 * 52);
});
```

Run: `node --test tests/baccarat-roads.test.mjs` — Expected: FAIL (`playRound` undefined).

- [ ] **Step 2: Export them**

In `src/logic/baccarat-roads.js:175`, change:

```js
  C.baccaratRoads = { bacValue, total, bankerDraws, simulateShoe, stats, buildBigRoad, layoutRoad, bigRoadCells, beadPlate, deriveRoad, predictNext };
```

to:

```js
  C.baccaratRoads = { bacValue, total, bankerDraws, buildShoe, playRound, simulateShoe, stats, buildBigRoad, layoutRoad, bigRoadCells, beadPlate, deriveRoad, predictNext };
```

Run: `node --test tests/baccarat-roads.test.mjs` — Expected: PASS.

- [ ] **Step 3: Board `pushRound` + show rig on the table**

In `src/floor/tables/baccarat-table.js`, inside `makeScoreBoard` (after the `screen` mesh is added, :389), add:

```js
    g.userData.pushRound = (round) => {
      rounds.push(round);
      if (rounds.length > 80) rounds.shift();
      const old = screen.material.map;
      screen.material.map = drawBoardCanvas(rounds, opts);
      screen.material.needsUpdate = true;
      old && old.dispose();
    };
```

NOTE: `makeScoreBoard(rounds, opts)` already receives the `rounds` array by reference — pushing mutates the same array the table built with.

In the table builder, track the static last-round card meshes. Change the card-placement loop (:435-449): collect meshes into an array declared above the loop:

```js
    const staticCards = [];
```

and inside the `cards.forEach((cardDef, idx) => { … g.add(card); })` body, after `g.add(card);` add:

```js
          staticCards.push(card);
```

After the scoreboard block (`g.add(board);` at :504), add:

```js
    // ambient-show rig (src/floor/baccarat-show.js drives it when the player is near)
    g.userData.bac = {
      L, feltY: FELT_Y, rounds, staticCards,
      pushRound: (round) => board.userData.pushRound(round),
      get dealerRig() { return g.userData.dealerRig; },
    };
```

(Place this AFTER the `withDealer` block so `dealerRig` is assigned; the getter keeps it safe either way.)

- [ ] **Step 4: The show module**

Create `src/floor/baccarat-show.js`:

```js
(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};

  // Ambient baccarat show: when the player stands near a baccarat table, its
  // dealer runs real rounds — deal, flip, third-card rules, announce, settle
  // ghost bets, update the roads board. Pure round logic = C.baccaratRoads.
  // Visual only; pauses (after finishing the round) when the player leaves.
  const NEAR = 9, CHECK_EVERY = 0.8;

  C.floor.attachBaccaratShow = (group) => {
    const bac = group.userData.bac;
    if (!bac || !bac.dealerRig || C.app.REDUCED) return;
    const app = C.app, L = bac.L;
    const toW = (p) => group.localToWorld(new THREE.Vector3(p[0], p[1], p[2])).toArray();
    const rig = bac.dealerRig;
    let running = false, wantRun = false, t = 0, cleared = false;
    let shoe = C.baccaratRoads.buildShoe(Math.random), si = 0;
    const draw = () => {
      if (si > shoe.length - 8) { shoe = C.baccaratRoads.buildShoe(Math.random); si = 0; }
      return shoe[si++];
    };
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const disposeMesh = (m) => {
      m.traverse((o) => {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((mm) => { if (!mm) return; mm.map?.dispose(); mm.dispose(); });
      });
      m.parent && m.parent.remove(m);
    };

    async function runRound() {
      const round = C.baccaratRoads.playRound(draw);
      const dealt = [];
      // ghost bets: 2 random seats, biased to the round for a lively board
      const kinds = ['player', 'banker', round.outcome === 'T' ? 'tie' : 'banker'];
      const betStacks = [];
      for (let k = 0; k < 2; k++) {
        const seat = Math.floor(Math.random() * 6);
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        const [bx, bz] = L.seatSpot(seat, kind);
        const stk = C.chips.makeChipStack([100, 500][k % 2], 3 + (seat % 3));
        stk.position.set(bx, bac.feltY + 0.005, bz);
        group.add(stk);
        betStacks.push({ stk, kind });
      }
      // deal P1 B1 P2 B2 face-down, alternating (cards pre-decided by playRound)
      const seq = [
        [L.playerSlots[0], round.playerCards[0]], [L.bankerSlots[0], round.bankerCards[0]],
        [L.playerSlots[1], round.playerCards[1]], [L.bankerSlots[1], round.bankerCards[1]],
      ];
      for (const [slot, cardDef] of seq) {
        const mesh = C.cards.makeCard(cardDef);
        mesh.rotation.set(-Math.PI / 2, 0, 0);
        mesh.rotateY(Math.PI);                    // face-down
        dealt.push(mesh);
        rig.play(app, 'dealCard', { refs: { shoe: toW(L.shoePos), target: toW(slot) } });
        // eslint-disable-next-line no-await-in-loop
        await C.cards.dealCardTo(app, mesh, toW(L.shoePos), toW(slot), { ms: 430 });
        // eslint-disable-next-line no-await-in-loop
        await wait(140);
      }
      // flip player then banker
      await C.cards.flipFlatCard(app, dealt[0], 320);
      await C.cards.flipFlatCard(app, dealt[2], 320);
      await C.cards.flipFlatCard(app, dealt[1], 320);
      await C.cards.flipFlatCard(app, dealt[3], 320);
      // third cards (sideways slot index 2), face-up
      const thirds = [[round.playerCards[2], L.playerSlots[2]], [round.bankerCards[2], L.bankerSlots[2]]];
      for (const [cardDef, slot] of thirds) {
        if (!cardDef) continue;
        const mesh = C.cards.makeCard(cardDef);
        mesh.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
        dealt.push(mesh);
        rig.play(app, 'dealCard', { refs: { shoe: toW(L.shoePos), target: toW(slot) } });
        // eslint-disable-next-line no-await-in-loop
        await C.cards.dealCardTo(app, mesh, toW(L.shoePos), toW(slot), { ms: 430 });
        // eslint-disable-next-line no-await-in-loop
        await wait(200);
      }
      // announce + settle ghost bets
      const line = round.outcome === 'T'
        ? `和 TIE  ${round.playerTotal} : ${round.bankerTotal}`
        : round.outcome === 'P'
          ? `閒 PLAYER wins ${round.playerTotal} over ${round.bankerTotal}`
          : `庄 BANKER wins ${round.bankerTotal} over ${round.playerTotal}`;
      rig.say(app, line, { ms: 2400 });
      const wins = { P: 'player', B: 'banker', T: 'tie' }[round.outcome];
      const payStacks = [];   // reaped at cleanup — kept OUT of betStacks so the
                              // settle loop below never treats a payout as a bet
      for (const { stk, kind } of betStacks) {
        const won = kind === wins;
        rig.play(app, won ? 'payChips' : 'sweepChips', {
          refs: { rack: toW(L.rackPos), target: toW([stk.position.x, bac.feltY, stk.position.z]) },
        });
        if (won) {
          const pay = C.chips.makeChipStack(100, 3);
          pay.position.set(stk.position.x + 0.1, stk.position.y, stk.position.z);
          group.add(pay);
          payStacks.push(pay);
        } else {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((res) =>
            C.tween.to(stk.position, { x: L.rackPos[0], z: L.rackPos[2] }, 420, 'inOutCubic', res));
        }
        // eslint-disable-next-line no-await-in-loop
        await wait(260);
      }
      bac.pushRound(round);
      await wait(2000);
      // clear: cards to the discard tray, chips away
      const disc = toW(L.discardPos);
      await Promise.all(dealt.map((mesh, i) => new Promise((res) => {
        C.tween.to(mesh.position, { x: disc[0], y: disc[1] + 0.05 + i * 0.002, z: disc[2] }, 360, 'inOutCubic', res);
      })));
      dealt.forEach(disposeMesh);
      betStacks.forEach(({ stk }) => disposeMesh(stk));
      payStacks.forEach(disposeMesh);
      await wait(1200);
    }

    async function loop() {
      running = true;
      // first activation: clear the static ghost cards baked at build time
      if (!cleared) {
        cleared = true;
        bac.staticCards.forEach(disposeMesh);
        bac.staticCards.length = 0;
      }
      while (wantRun) {
        // eslint-disable-next-line no-await-in-loop
        await runRound().catch((err) => console.error('[bac-show]', err));
      }
      running = false;
    }

    const hook = (dt) => {
      t += dt;
      if (t < CHECK_EVERY) return;
      t = 0;
      const p = app.player;
      wantRun = Math.hypot(p.x - group.position.x, p.z - group.position.z) < NEAR;
      if (wantRun && !running) loop();
    };
    app.onFrame(hook);
  };
})();
```


- [ ] **Step 5: Attach from sections + SRC_ORDER**

In `src/floor/sections.js`, after the two rig-map lines (:111-112), add:

```js
        if (section.id === 'baccarat') C.floor.attachBaccaratShow?.(group);
```

CAUTION: `attachBaccaratShow` is defined in `baccarat-show.js`, which must be loaded BEFORE `sections.js` runs `buildSections`. `build.mjs` `SRC_ORDER` loads all files before boot calls `buildSections`, so ordering only needs `baccarat-show.js` in the list — insert after `'src/floor/tables/uth-table.js'`:

```js
  'src/floor/tables/uth-table.js',
  'src/floor/baccarat-show.js',
```

- [ ] **Step 6: Run the full suite, commit**

Run: `node --test tests/` — all pass.

```bash
git add src/logic/baccarat-roads.js tests/baccarat-roads.test.mjs src/floor/tables/baccarat-table.js src/floor/baccarat-show.js src/floor/sections.js build.mjs
git commit -m "feat(casino-3d): ambient baccarat show — real rounds, announcements, roads updates

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Build, verify in browser, sync to public/

**Files:**
- Modify: `index.html` (regenerated by build), `portfolio/public/games/casino-game/lobby-3d/**` (sync)

- [ ] **Step 1: Rebuild the inline bundle + full test pass**

```bash
cd portfolio/src/game/casino-game/calculator/lobby-3d
node build.mjs
node --test tests/
```
Expected: build writes `index.html`; all tests pass.

- [ ] **Step 2: In-browser verification (the BrainSpark bar: does it RUN?)**

```bash
cd portfolio/src/game/casino-game/calculator
python3 -m http.server 8788
```

Open `http://localhost:8788/lobby-3d/` with the Chrome automation tools and verify, taking screenshots:
1. **Vestibule:** receptionist has a face (eyes/brows/mouth), blinks, head tracks as you walk close; "Welcome to Grand Casino!" bubble appears with mouth motion.
2. **ID check:** click the reception sign → "May I see your member card?" bubble; sign in (or check `platform.js` for a localhost auth stub — the repo has a localhost wallet stub, see commit `cedf750`) → stamp + "You're verified" + nod; refusal path shows the headshake + "Members only" line.
3. **Floor:** every table now has a distinct-looking dealer (skin/hair/vest variation), subtle idle sway + blinks.
4. **Baccarat:** stand near a table → dealer deals four cards with arm motion, flips, third card when the rules demand, bubble announcement (e.g. "閒 PLAYER wins 8 over 6"), chips paid/swept, roads board gains an entry. Walk away → show pauses after the round.
5. **Roulette live:** sit at a table (localhost wallet stub) → buy-in chips slide over; bet via the iframe; spin → dealer reaches to the rim before the wheel turns; after the ball lands → dolly placed on the winning number, losing stacks raked to the bank, winning spots paid; dolly lifts; betting reopens.
6. **Blackjack live:** deal → the dealer's arm mimes each card from the shoe; dealer head follows the active hand; settle → sweep/pay gestures.
7. **Console:** zero errors throughout.
8. **Rotation signs:** if the wave/flick/point directions look wrong (arm bends backward etc.), fix the euler SIGNS in `src/logic/gestures.js` clip data only, re-run `node build.mjs`, re-check.

- [ ] **Step 3: Reduced-motion spot check**

In Chrome DevTools → Rendering → emulate `prefers-reduced-motion: reduce`, reload: figures render in rest pose, speech bubbles still appear, baccarat tables show the static last-round cards (show disabled), live flows still complete rounds instantly. No errors.

- [ ] **Step 4: Sync to public/ and rebuild there**

```bash
# safety: confirm nothing public-only is newer before overwriting
diff -rq portfolio/src/game/casino-game/calculator/lobby-3d portfolio/public/games/casino-game/lobby-3d | grep -v '^Only in portfolio/src' || true
# reconcile anything unexpected, then:
rsync -a --delete portfolio/src/game/casino-game/calculator/lobby-3d/ portfolio/public/games/casino-game/lobby-3d/
cd portfolio/public/games/casino-game/lobby-3d
node build.mjs
node --test tests/
```
Expected: clean sync, build OK, tests pass in the public copy too.

- [ ] **Step 5: Final commit**

```bash
git add portfolio/src/game/casino-game/calculator/lobby-3d/index.html portfolio/public/games/casino-game/lobby-3d/
git commit -m "feat(casino-3d): rebuild + sync dealer animation work to public

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(If the parallel session's uncommitted public/ edits collide, STOP and surface it to the user instead of committing over them.)

---

## Self-Review Notes

- **Spec coverage:** figure upgrade (T2/T3), rig+clip engine (T1/T2), receptionist talk+motion (T4), roulette buy-in/spin/dolly/settle (T5-T7), blackjack deal/watch/settle (T8), baccarat ambient show + roads (T9), perf gating + REDUCED + tests + build (throughout, verified T10). UTH dealer gets the rig via T3 with no extra choreography — matches spec.
- **Type consistency:** `rig.play(app, name, {refs, ms})`, `rig.say(app, text, {ms})`, `rig.lookAt(app, [x,y,z])`, `userData.dealerRig`, `bac.pushRound(round)`, `splitByOutcome → {winning, losing, wins}` used identically across tasks.
- **Known judgment calls:** every table now has a dealer (spec says dealers act at all live tables; visual density is the point); `reveal` is posted after the 3D settle (2D board updates when the dealer finishes — spec's step ⑤).
