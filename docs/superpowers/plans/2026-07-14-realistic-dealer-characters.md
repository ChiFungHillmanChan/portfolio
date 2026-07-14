# Realistic Dealer Characters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the procedural capsule dealers in the casino 3D lobby with CC0 Quaternius GLB skinned characters driven by mocap idle/gesture clips plus a runtime two-bone IK arm layer, behind the exact same rig API, with automatic fallback to the procedural rig.

**Architecture:** A new `C.character` engine module preloads two GLB assets (characters + animation clips), clones a skinned character per dealer, and composes three layers per frame: AnimationMixer mocap base → IK arms along authored hand paths → clamped head look-at. `makeDealer()` returns a stable facade rig object whose implementation swaps from the procedural rig to the GLB character when assets arrive. Props (cards/chips/dolly/wheel) sync to hand-bone positions via timeline events.

**Tech Stack:** three.js 0.149 (vendored, global `THREE`, classic scripts — NO ES modules in the browser bundle), node:test for pure logic, `build.mjs` single-file inliner, Quaternius CC0 GLB assets fetched at runtime.

**Spec:** `docs/superpowers/specs/2026-07-14-realistic-dealer-characters-design.md`

## Global Constraints

- Branch: `feat/dealer-glb-characters` (already created off `main`). Commit ONLY files this plan touches — the working tree has ~55 pre-existing dirty files from other work; NEVER `git add -A` or `git add .`.
- All browser code is IIFE-style on `globalThis.CASINO` (`const C = (globalThis.CASINO ??= {});`), classic scripts, no `import`/`export` (build inlines everything).
- Every frame hook carries the `roomGen` guard + `hook.cancel` + per-track token idiom exactly as in `src/engine/rig.js`.
- `app.REDUCED` mode: no per-frame character work; GLB preload is skipped entirely (procedural dealer, static pose).
- Rig API surface that MUST keep working unchanged at every call site: `rig.play(app, name, {refs, ms})`, `rig.say(app, text, {ms})`, `rig.lookAt(app, [x,y,z])`, `rig.setIdle(app)`, and `makeDealer` `userData` wrappers `idle`, `lookToward`, `headShake`, `dealGesture`. Clip names in use: `dealCard, sweepChips, payChips, spinReach, spinFollow, placeDolly, tapRack, wave, welcomeSweep, nod, headShake, washCards, shuffleRiffle, armsRest`.
- Asset budget: ≤ 5 MB total for `.glb` files. Load failure/timeout (10 s) → procedural dealer stays, single `console.warn`, zero gameplay impact.
- Tests run from `portfolio/src/game/casino-game/calculator/lobby-3d/`: `node --test tests/`.
- After the final task, sync `lobby-3d/` to the public mirror `portfolio/public/games/casino-game/lobby-3d/` (whole-directory copy including `assets/`), and rebuild `index.html` via `node build.mjs`.
- Working directory for all tasks: `portfolio/src/game/casino-game/calculator/lobby-3d/` unless a path says otherwise.

---

### Task 1: Acquire assets + manifest prep script

**Files:**
- Create: `tools/prep-dealer-assets.mjs`
- Create: `assets/dealer-characters.glb` (committed binary)
- Create: `assets/dealer-clips.glb` (committed binary)
- Create: `assets/manifest.json` (generated, committed)
- Test: `tests/manifest.test.mjs`

**Interfaces:**
- Produces: `assets/manifest.json` with shape `{ files: [{ name, bytes, bones: [string], clips: [{ name, dur }], meshes: [string] }] }`. Later tasks (5, 6, 7) read bone/clip names from this file. `tools/prep-dealer-assets.mjs <glb...>` regenerates it.

- [ ] **Step 1: Download the two Quaternius packs**

Try direct fetches first (no login needed on quaternius.com; itch.io mirrors need a click):

```bash
mkdir -p /private/tmp/claude-501/-Users-hillmanchan-Desktop-HillmanChan-portfolio/13492530-b435-4470-9292-6baee64b8cd0/scratchpad/quaternius && cd $_
# Pack pages (find the direct zip URLs behind the Download buttons):
curl -sL https://quaternius.com/packs/universalbasecharacters.html -o ubc.html
curl -sL https://quaternius.com/packs/universalanimationlibrary.html -o ual.html
grep -oE 'href="[^"]*(zip|drive[^"]*)"' ubc.html ual.html
```

Download whichever zip URLs those pages expose (historically direct `.zip` links or Google Drive; `curl -L` handles the former, `gdown`-style confirm param the latter). **If neither is fetchable headlessly, STOP and ask the user** to download the two free zips from the itch.io pages (`quaternius.itch.io/universal-base-characters`, `quaternius.itch.io/universal-animation-library`) into the scratchpad dir. Unzip both; locate the glTF/GLB outputs (prefer `.glb`; if only `.gltf`+`.bin`, prefer the GLB export folder — both packs ship one).

- [ ] **Step 2: Pick files and copy into `assets/`**

Pick ONE character GLB containing the Regular male + female models if bundled (else the single Regular model GLB — one model is acceptable; variation then comes from material tints alone) → copy to `assets/dealer-characters.glb`. Pick the animation library GLB → `assets/dealer-clips.glb`. Check sizes: `ls -la assets/*.glb`. If combined > 5 MB, keep only the smaller character file and note the clip-stripping contingency (Task 1b in the Risks section at the bottom of this plan) — do NOT silently exceed the budget.

- [ ] **Step 3: Write the manifest prep script**

```js
#!/usr/bin/env node
// tools/prep-dealer-assets.mjs — parse GLB headers, emit assets/manifest.json.
// GLB layout: 12-byte header (magic 0x46546C67, version, length), then chunks:
// chunk header = uint32 length + uint32 type; type 0x4E4F534A is JSON.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseGlbJson(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${path}: not a GLB`);
  const jsonLen = buf.readUInt32LE(12);
  if (buf.readUInt32LE(16) !== 0x4e4f534a) throw new Error(`${path}: first chunk not JSON`);
  return { json: JSON.parse(buf.toString('utf8', 20, 20 + jsonLen)), bytes: buf.length };
}

function describe(path) {
  const { json, bytes } = parseGlbJson(path);
  const nodes = json.nodes ?? [];
  const boneSet = new Set();
  for (const skin of json.skins ?? []) {
    for (const j of skin.joints) boneSet.add(nodes[j].name ?? `node${j}`);
  }
  const clips = (json.animations ?? []).map((a) => {
    let dur = 0;
    for (const s of a.samplers) {
      const acc = json.accessors[s.input];
      if (acc?.max?.[0] > dur) dur = acc.max[0];
    }
    return { name: a.name ?? '', dur: Math.round(dur * 1000) / 1000 };
  });
  const meshes = (json.meshes ?? []).map((m) => m.name ?? '');
  return { name: basename(path), bytes, bones: [...boneSet].sort(), clips, meshes };
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node tools/prep-dealer-assets.mjs assets/*.glb');
  process.exit(1);
}
const manifest = { files: files.map(describe) };
writeFileSync(join(ROOT, 'assets/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(manifest.files.map((f) =>
  `${f.name}: ${(f.bytes / 1024).toFixed(0)} KB, ${f.bones.length} bones, ${f.clips.length} clips`).join('\n'));
```

- [ ] **Step 4: Run it and inspect the output**

```bash
node tools/prep-dealer-assets.mjs assets/dealer-characters.glb assets/dealer-clips.glb
cat assets/manifest.json | head -80
```

Expected: both files listed; the characters file has a non-empty `bones` array; the clips file has ≥ 100 clips. **Record in the commit message which idle/wave/nod/no/clap-like clip names exist** (grep the manifest: `grep -iE '"(idle|wave|yes|no|talk|cheer|interact)' assets/manifest.json`) — Task 6 needs them.

- [ ] **Step 5: Write the manifest test**

```js
// tests/manifest.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'assets/manifest.json'), 'utf8'));

test('manifest lists both dealer asset files within budget', () => {
  const names = manifest.files.map((f) => f.name);
  assert.ok(names.includes('dealer-characters.glb'));
  assert.ok(names.includes('dealer-clips.glb'));
  const total = manifest.files.reduce((s, f) => s + f.bytes, 0);
  assert.ok(total <= 5 * 1024 * 1024, `assets total ${total} bytes exceeds 5MB budget`);
});

test('character file is rigged and clips file has a library', () => {
  const chars = manifest.files.find((f) => f.name === 'dealer-characters.glb');
  const clips = manifest.files.find((f) => f.name === 'dealer-clips.glb');
  assert.ok(chars.bones.length >= 20, `expected a humanoid skeleton, got ${chars.bones.length} bones`);
  assert.ok(clips.clips.length >= 20, `expected an animation library, got ${clips.clips.length} clips`);
});
```

- [ ] **Step 6: Run tests**

Run: `node --test tests/manifest.test.mjs`
Expected: 2 pass.

- [ ] **Step 7: Commit**

```bash
git add tools/prep-dealer-assets.mjs assets/ tests/manifest.test.mjs
git commit -m "feat(casino-3d): Quaternius CC0 dealer assets + GLB manifest prep script"
```

---

### Task 2: Vendor GLTFLoader + SkeletonUtils for the global-THREE build

**Files:**
- Create: `tools/wrap-three-addons.mjs`
- Create: `vendor/three-addons-0.149.js` (generated, committed)
- Modify: `build.mjs` (vendor concat; SRC_ORDER additions come in later tasks)
- Test: `tests/build.test.mjs` (extend existing)

**Interfaces:**
- Produces: `THREE.GLTFLoader` (with `.parse(arrayBuffer, path, onLoad, onError)`) and `THREE.SkeletonUtils.clone(object3d)` available in the browser bundle. Task 5 consumes both.

- [ ] **Step 1: Write the wrap tool**

```js
#!/usr/bin/env node
// tools/wrap-three-addons.mjs — fetch three r149 example modules and wrap
// them for this build's classic-script global-THREE style. Run once; output
// vendor/three-addons-0.149.js is committed.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VER = '0.149.0';

async function fetchSrc(path) {
  const res = await fetch(`https://unpkg.com/three@${VER}/${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.text();
}

function wrap(code, name, exports) {
  // `import { A, B } from 'three'` → destructure off the global THREE.
  code = code.replace(/import\s*\{([\s\S]*?)\}\s*from\s*['"]three['"];?/g, 'const {$1} = THREE;');
  if (/^\s*import\s/m.test(code)) throw new Error(`${name}: unhandled non-'three' import — inline it manually`);
  code = code.replace(/export\s*\{[\s\S]*?\};?/g, '');
  code = code.replace(/export\s+(class|function|const)/g, '$1');
  return `// ==== ${name} (three@${VER}, wrapped by tools/wrap-three-addons.mjs) ====\n` +
    `(() => {\n${code}\n${exports.map((e) => `THREE.${e.global} = ${e.local};`).join('\n')}\n})();\n`;
}

const gltf = wrap(await fetchSrc('examples/jsm/loaders/GLTFLoader.js'), 'GLTFLoader',
  [{ global: 'GLTFLoader', local: 'GLTFLoader' }]);
const skel = wrap(await fetchSrc('examples/jsm/utils/SkeletonUtils.js'), 'SkeletonUtils',
  [{ global: 'SkeletonUtils', local: '{ clone }' }]);
// SkeletonUtils exports a named `clone` fn; expose as an object for call-site clarity.
const out = gltf + skel.replace('THREE.SkeletonUtils = { clone };', 'THREE.SkeletonUtils = { clone };');
if (out.includes('</script')) throw new Error('output contains </script — not inlinable');
writeFileSync(join(ROOT, 'vendor/three-addons-0.149.js'), out);
console.log(`wrote vendor/three-addons-0.149.js (${(out.length / 1024).toFixed(0)} KB)`);
```

Note: in r149, `GLTFLoader.js` and `SkeletonUtils.js` import only from `'three'`. The tool throws if that assumption breaks (e.g. a `BufferGeometryUtils` import) — in that case fetch that module too and prepend it inside the same wrapper, exporting nothing.

- [ ] **Step 2: Run it**

Run: `node tools/wrap-three-addons.mjs`
Expected: `wrote vendor/three-addons-0.149.js (~90-130 KB)`. Skim the top of the file: it must start with the wrapper comment and contain `THREE.GLTFLoader = GLTFLoader;` near the end of the first section.

- [ ] **Step 3: Concat the new vendor file in build.mjs**

In `build.mjs`, change the vendor line inside `build()`:

```js
  const vendor = guard('vendor', read('vendor/three-0.149.0.min.js'))
    + '\n' + guard('three-addons', read('vendor/three-addons-0.149.js'));
```

- [ ] **Step 4: Extend the build test**

Append to `tests/build.test.mjs`:

```js
test('bundle includes wrapped GLTFLoader + SkeletonUtils', async () => {
  const { build } = await import('../build.mjs');
  build();
  const html = (await import('node:fs')).readFileSync(
    new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('THREE.GLTFLoader = GLTFLoader'));
  assert.ok(html.includes('THREE.SkeletonUtils'));
});
```

(Match the existing test file's import style — read it first; if it already builds once at top level, just add the two `assert.ok` checks to that flow instead of rebuilding.)

- [ ] **Step 5: Run tests + build**

Run: `node --test tests/build.test.mjs && node build.mjs`
Expected: pass; `built index.html (~XXX KB)` grows by roughly the addon file size.

- [ ] **Step 6: Smoke-test in browser that THREE.GLTFLoader exists**

Use the scoped verify skill's server (or `python3 -m http.server`) to open `lobby-3d/index.html`, then in the console: `typeof THREE.GLTFLoader` → `"function"`, `typeof THREE.SkeletonUtils.clone` → `"function"`. No console errors on load.

- [ ] **Step 7: Commit**

```bash
git add tools/wrap-three-addons.mjs vendor/three-addons-0.149.js build.mjs tests/build.test.mjs index.html
git commit -m "feat(casino-3d): vendor GLTFLoader + SkeletonUtils wrapped for global-THREE build"
```

---

### Task 3: Pure two-bone IK solver

**Files:**
- Create: `src/logic/ik.js`
- Test: `tests/ik.test.mjs`

**Interfaces:**
- Produces: `C.ik.solveTwoBone({ shoulder, target, upperLen, foreLen, pole })` → `{ elbow: [x,y,z], hand: [x,y,z], clamped: boolean }`. All vectors are plain `[x,y,z]` arrays, no THREE. Task 7 consumes this every frame.

- [ ] **Step 1: Write failing tests**

```js
// tests/ik.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/ik.js');
const { solveTwoBone } = globalThis.CASINO.ik;

const near = (a, b, eps = 1e-6) =>
  a.every((v, i) => Math.abs(v - b[i]) < eps) || assert.fail(`${a} !~ ${b}`);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('reachable target: segments keep their lengths, hand hits target', () => {
  const r = solveTwoBone({ shoulder: [0, 0, 0], target: [0.3, 0, 0.1],
    upperLen: 0.25, foreLen: 0.22, pole: [0, -1, 0] });
  assert.equal(r.clamped, false);
  near(r.hand, [0.3, 0, 0.1]);
  assert.ok(Math.abs(dist([0, 0, 0], r.elbow) - 0.25) < 1e-6);
  assert.ok(Math.abs(dist(r.elbow, r.hand) - 0.22) < 1e-6);
});

test('elbow bends toward the pole side', () => {
  const down = solveTwoBone({ shoulder: [0, 1, 0], target: [0.3, 1, 0],
    upperLen: 0.25, foreLen: 0.22, pole: [0, -1, 0] });
  assert.ok(down.elbow[1] < 1, 'pole -Y → elbow below shoulder line');
  const up = solveTwoBone({ shoulder: [0, 1, 0], target: [0.3, 1, 0],
    upperLen: 0.25, foreLen: 0.22, pole: [0, 1, 0] });
  assert.ok(up.elbow[1] > 1, 'pole +Y → elbow above');
});

test('out-of-reach target clamps along the direction, never inverts', () => {
  const r = solveTwoBone({ shoulder: [0, 0, 0], target: [9, 0, 0],
    upperLen: 0.25, foreLen: 0.22, pole: [0, -1, 0] });
  assert.equal(r.clamped, true);
  assert.ok(dist([0, 0, 0], r.hand) <= 0.47 + 1e-9);
  assert.ok(r.hand[0] > 0.46, 'hand reaches straight toward target');
});

test('degenerate pole (parallel to reach dir) still returns finite elbow', () => {
  const r = solveTwoBone({ shoulder: [0, 0, 0], target: [0.3, 0, 0],
    upperLen: 0.25, foreLen: 0.22, pole: [1, 0, 0] });
  assert.ok(r.elbow.every(Number.isFinite));
  assert.ok(Math.abs(dist([0, 0, 0], r.elbow) - 0.25) < 1e-6);
});

test('target inside min reach clamps outward', () => {
  const r = solveTwoBone({ shoulder: [0, 0, 0], target: [0.001, 0, 0],
    upperLen: 0.25, foreLen: 0.1, pole: [0, -1, 0] });
  assert.equal(r.clamped, true);
  assert.ok(r.hand.every(Number.isFinite));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/ik.test.mjs`
Expected: FAIL — cannot read `globalThis.CASINO.ik`.

- [ ] **Step 3: Implement**

```js
// src/logic/ik.js
(() => {
  const C = (globalThis.CASINO ??= {});

  // Pure analytic two-bone IK (shoulder→elbow→hand). Plain [x,y,z] arrays,
  // no THREE — node-tested. The THREE side (engine/character.js) converts the
  // returned positions into bone quaternions.
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = len(a); return l < 1e-9 ? [0, 0, 0] : mul(a, 1 / l); };

  function solveTwoBone({ shoulder, target, upperLen, foreLen, pole }) {
    const toT = sub(target, shoulder);
    let d = len(toT);
    const maxR = (upperLen + foreLen) * 0.9999;      // never fully lock straight
    const minR = Math.abs(upperLen - foreLen) + 1e-6;
    const clamped = d > maxR || d < minR;
    const dir = d < 1e-9 ? [1, 0, 0] : mul(toT, 1 / d);
    d = Math.min(Math.max(d, minR), maxR);
    const hand = add(shoulder, mul(dir, d));
    // law of cosines: distance from shoulder to elbow's projection on dir
    const a = (d * d + upperLen * upperLen - foreLen * foreLen) / (2 * d);
    const h = Math.sqrt(Math.max(0, upperLen * upperLen - a * a));
    // bend direction = pole component perpendicular to dir (with fallbacks)
    let bend = sub(pole, mul(dir, dot(pole, dir)));
    if (len(bend) < 1e-6) bend = cross(dir, [0, 1, 0]);
    if (len(bend) < 1e-6) bend = cross(dir, [1, 0, 0]);
    bend = norm(bend);
    const elbow = add(add(shoulder, mul(dir, a)), mul(bend, h));
    return { elbow, hand, clamped };
  }

  C.ik = { solveTwoBone };
})();
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/ik.test.mjs`
Expected: 5 pass.

- [ ] **Step 5: Commit**

```bash
git add src/logic/ik.js tests/ik.test.mjs
git commit -m "feat(casino-3d): pure two-bone IK solver for dealer arms"
```

---

### Task 4: Hand-path data + validation

**Files:**
- Create: `src/logic/hand-paths.js`
- Test: `tests/hand-paths.test.mjs`

**Interfaces:**
- Consumes: nothing (pure data, mirrors the `gestures.js` pattern).
- Produces: `C.handPaths.PATHS` — one entry per IK action name; `C.handPaths.validatePath(path)` → `string[]` of errors; `C.handPaths.EVENTS = ['grab','contact','release']`; `C.handPaths.REFS = ['shoe','target','rack','rim']`. Task 7/8 play these; the facade routes these action names to the IK layer and everything else to mocap clips.

**Data model** (documented at the top of the file):

```
PATHS[name] = {
  dur: ms,                       // default duration (play() ms option overrides)
  cycle: bool,                   // true → last waypoint ≈ first, chains seamlessly
  hands: {
    R: [waypoint...],            // and/or L
  },
}
waypoint = {
  at: 0..1 (strictly increasing, last = 1),
  ref: 'shoe'|'target'|'rack'|'rim'  // world ref resolved at play() from refs arg
    | pos: [x,y,z]                   // world position literal (rare)
    | rest: true,                    // hand returns to its rest-pose position
  offset: [x,y,z],               // optional, added to the ref position (world)
  arc: number,                   // optional, parabolic lift (m) on the segment INTO this waypoint
  ease: easing name,             // for the segment INTO this waypoint (default inOutCubic)
  event: 'grab'|'contact'|'release', // optional, fired when this waypoint is reached
}
```

- [ ] **Step 1: Write failing tests**

```js
// tests/hand-paths.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/hand-paths.js');
const HP = globalThis.CASINO.handPaths;

const IK_ACTIONS = ['dealCard', 'sweepChips', 'payChips', 'spinReach', 'spinFollow',
  'placeDolly', 'tapRack', 'washCards', 'shuffleRiffle'];

test('every IK action has a valid path', () => {
  for (const name of IK_ACTIONS) {
    const p = HP.PATHS[name];
    assert.ok(p, `missing path: ${name}`);
    assert.deepEqual(HP.validatePath(p), [], `${name}: ${HP.validatePath(p)}`);
  }
});

test('validatePath catches structural errors', () => {
  assert.ok(HP.validatePath(null).length);
  assert.ok(HP.validatePath({ dur: 0, hands: {} }).length, 'dur must be > 0, hands non-empty');
  assert.ok(HP.validatePath({ dur: 500, hands: { R: [{ at: 0.5, ref: 'nope' }] } }).length,
    'unknown ref');
  assert.ok(HP.validatePath({ dur: 500, hands: { R: [
    { at: 0.6, ref: 'target' }, { at: 0.4, rest: true }] } }).length, 'at must increase');
  assert.ok(HP.validatePath({ dur: 500, hands: { R: [{ at: 0.5, ref: 'target' }] } }).length,
    'last waypoint must be at 1');
  assert.ok(HP.validatePath({ dur: 500, hands: { R: [
    { at: 1, ref: 'target', event: 'yeet' }] } }).length, 'unknown event');
});

test('dealCard fires grab at the shoe then release at the target', () => {
  const wp = HP.PATHS.dealCard.hands.R;
  const grab = wp.find((w) => w.event === 'grab');
  const rel = wp.find((w) => w.event === 'release');
  assert.ok(grab && grab.ref === 'shoe');
  assert.ok(rel && rel.ref === 'target');
  assert.ok(grab.at < rel.at);
});

test('wash and riffle are two-hand cycles', () => {
  for (const name of ['washCards', 'shuffleRiffle']) {
    const p = HP.PATHS[name];
    assert.equal(p.cycle, true, name);
    assert.ok(p.hands.L && p.hands.R, `${name} needs both hands`);
  }
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/hand-paths.test.mjs`
Expected: FAIL — `globalThis.CASINO.handPaths` undefined.

- [ ] **Step 3: Implement**

```js
// src/logic/hand-paths.js
(() => {
  const C = (globalThis.CASINO ??= {});

  // Pure IK hand-path data for engine/character.js. No THREE/DOM — node-
  // tested. See tests/hand-paths.test.mjs and the plan doc for the data
  // model. Positions are WORLD-space refs resolved at play() time, exactly
  // like gestures.js aim refs; offsets/arcs are meters.
  const REFS = ['shoe', 'target', 'rack', 'rim'];
  const EVENTS = ['grab', 'contact', 'release'];
  const EASINGS = ['inOutCubic', 'outCubic', 'outQuart', 'outBack'];

  const PATHS = {
    // draw from the shoe, sweep to the card spot, hand back to rest
    dealCard: { dur: 520, hands: { R: [
      { at: 0.28, ref: 'shoe', offset: [0, 0.03, 0], ease: 'outCubic', event: 'grab' },
      { at: 0.72, ref: 'target', offset: [0, 0.04, 0], arc: 0.10, event: 'release' },
      { at: 1.00, rest: true },
    ] } },
    // rake losing chips: touch the stack, drag to the rack
    sweepChips: { dur: 700, hands: { R: [
      { at: 0.32, ref: 'target', offset: [0, 0.03, 0], ease: 'outCubic', event: 'contact' },
      { at: 0.78, ref: 'rack', offset: [0, 0.05, 0], arc: 0.05 },
      { at: 1.00, rest: true },
    ] } },
    // pay from the rack out to the winning spot
    payChips: { dur: 700, hands: { R: [
      { at: 0.30, ref: 'rack', offset: [0, 0.04, 0], ease: 'outCubic', event: 'grab' },
      { at: 0.74, ref: 'target', offset: [0, 0.04, 0], arc: 0.07, event: 'release' },
      { at: 1.00, rest: true },
    ] } },
    // reach and rest fingers on the wheel rim (spinFollow completes it)
    spinReach: { dur: 480, hands: { R: [
      { at: 1.00, ref: 'rim', offset: [0, 0.02, 0], ease: 'outCubic', event: 'contact' },
    ] } },
    // the flick: drag along the rim tangent, then return to rest
    spinFollow: { dur: 650, hands: { R: [
      { at: 0.30, ref: 'rim', offset: [0.16, 0.02, 0.10], ease: 'outBack', event: 'release' },
      { at: 1.00, rest: true },
    ] } },
    // carry the dolly from the rack to the winning number
    placeDolly: { dur: 800, hands: { R: [
      { at: 0.28, ref: 'rack', offset: [0, 0.04, 0], ease: 'outCubic', event: 'grab' },
      { at: 0.76, ref: 'target', offset: [0, 0.05, 0], arc: 0.12, event: 'release' },
      { at: 1.00, rest: true },
    ] } },
    // double-tap the chip rack (buy-in beat)
    tapRack: { dur: 620, hands: { R: [
      { at: 0.30, ref: 'rack', offset: [0, 0.03, 0], ease: 'outCubic', event: 'contact' },
      { at: 0.48, ref: 'rack', offset: [0, 0.09, 0] },
      { at: 0.66, ref: 'rack', offset: [0, 0.03, 0], event: 'contact' },
      { at: 1.00, rest: true },
    ] } },
    // two-hand circular wash over the felt around 'target'; counter-phase
    // circles; cycle:true so consecutive plays chain into a smear
    washCards: { dur: 1600, cycle: true, hands: {
      L: [
        { at: 0.25, ref: 'target', offset: [-0.16, 0.03, -0.08] },
        { at: 0.50, ref: 'target', offset: [-0.06, 0.03, -0.16] },
        { at: 0.75, ref: 'target', offset: [0.02, 0.03, -0.06] },
        { at: 1.00, ref: 'target', offset: [-0.16, 0.03, -0.08] },
      ],
      R: [
        { at: 0.25, ref: 'target', offset: [0.14, 0.03, 0.06] },
        { at: 0.50, ref: 'target', offset: [0.04, 0.03, 0.14] },
        { at: 0.75, ref: 'target', offset: [-0.04, 0.03, 0.04] },
        { at: 1.00, ref: 'target', offset: [0.14, 0.03, 0.06] },
      ],
    } },
    // riffle at 'target': hands together, alternate lift/drop; cycle:true
    shuffleRiffle: { dur: 1100, cycle: true, hands: {
      L: [
        { at: 0.20, ref: 'target', offset: [-0.07, 0.05, 0], ease: 'outCubic' },
        { at: 0.45, ref: 'target', offset: [-0.05, 0.10, 0.02] },
        { at: 0.70, ref: 'target', offset: [-0.07, 0.04, 0] },
        { at: 1.00, ref: 'target', offset: [-0.07, 0.05, 0] },
      ],
      R: [
        { at: 0.20, ref: 'target', offset: [0.07, 0.05, 0], ease: 'outCubic' },
        { at: 0.45, ref: 'target', offset: [0.05, 0.04, 0.02] },
        { at: 0.70, ref: 'target', offset: [0.07, 0.10, 0] },
        { at: 1.00, ref: 'target', offset: [0.07, 0.05, 0] },
      ],
    } },
  };

  function validatePath(p) {
    const errs = [];
    if (!p || typeof p !== 'object') return ['path is not an object'];
    if (!(p.dur > 0)) errs.push('dur must be > 0');
    const hands = p.hands || {};
    const sides = Object.keys(hands);
    if (!sides.length) errs.push('hands empty');
    for (const side of sides) {
      if (side !== 'L' && side !== 'R') { errs.push(`unknown hand ${side}`); continue; }
      const wps = hands[side];
      if (!Array.isArray(wps) || !wps.length) { errs.push(`${side}: no waypoints`); continue; }
      let prev = 0;
      wps.forEach((w, i) => {
        if (!(w.at > prev && w.at <= 1)) errs.push(`${side}[${i}]: at must increase within (0,1]`);
        prev = w.at;
        const kinds = ['ref', 'pos', 'rest'].filter((k) => w[k] !== undefined);
        if (kinds.length !== 1) errs.push(`${side}[${i}]: exactly one of ref/pos/rest`);
        if (w.ref !== undefined && !REFS.includes(w.ref)) errs.push(`${side}[${i}]: unknown ref ${w.ref}`);
        if (w.pos !== undefined && !(Array.isArray(w.pos) && w.pos.length === 3))
          errs.push(`${side}[${i}]: pos must be [x,y,z]`);
        if (w.offset !== undefined && !(Array.isArray(w.offset) && w.offset.length === 3))
          errs.push(`${side}[${i}]: offset must be [x,y,z]`);
        if (w.event !== undefined && !EVENTS.includes(w.event)) errs.push(`${side}[${i}]: unknown event ${w.event}`);
        if (w.ease !== undefined && !EASINGS.includes(w.ease)) errs.push(`${side}[${i}]: unknown ease ${w.ease}`);
        if (w.arc !== undefined && !(w.arc >= 0)) errs.push(`${side}[${i}]: arc must be >= 0`);
      });
      if (wps[wps.length - 1].at !== 1) errs.push(`${side}: last waypoint must be at 1`);
    }
    return errs;
  }

  C.handPaths = { PATHS, REFS, EVENTS, validatePath };
})();
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/hand-paths.test.mjs`
Expected: 4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/logic/hand-paths.js tests/hand-paths.test.mjs
git commit -m "feat(casino-3d): IK hand-path data for dealer actions"
```

---

### Task 5: Character system core — load, clone, idle, facade swap

**Files:**
- Create: `src/engine/character.js`
- Modify: `src/engine/assets.js:122-135` (makeDealer → facade)
- Modify: `src/boot.js` (kick off preload)
- Modify: `build.mjs` `SRC_ORDER` (add `src/logic/ik.js`, `src/logic/hand-paths.js` after `src/logic/gestures.js`; add `src/engine/character.js` after `src/engine/rig.js`)

**Interfaces:**
- Consumes: `THREE.GLTFLoader`, `THREE.SkeletonUtils.clone` (Task 2), `assets/manifest.json` bone names (Task 1).
- Produces:
  - `C.character.preload(baseUrl)` — fetches both GLBs, resolves internal ready state; safe to call once from boot.
  - `C.character.ready` — `null` | `'loading'` | `'ready'` | `'failed'`.
  - `C.character.attach(app, root, opts, onReady)` — registers a dealer root; when ready, builds a character clone and calls `onReady(charImpl)`. `charImpl` implements `{ play, stop, say, lookAt, setIdle, dispose, group, bones }` — the same method contract as the procedural rig object in `rig.js`.
  - In `assets.js`: `makeDealer(opts)` returns a `THREE.Group` whose `userData.rig` is a STABLE facade delegating to the current impl (procedural first, GLB later). Existing `userData` wrappers preserved.

**Bone mapping note:** The logical joint names used internally are `hips, spine, chest, neck, head, shoulderL/R (clavicle), upperArmL/R, foreArmL/R, handL/R`. Fill `BONE_MAP` below from `assets/manifest.json` bone names (Quaternius universal rig uses UE-style names — expect `pelvis, spine_01..03, clavicle_l, upperarm_l, lowerarm_l, hand_l, neck_01, head` or Mixamo-style `Hips, Spine, ...`; use the actual names recorded in Task 1's commit). Missing mapped bone at load → treat the whole load as failed (fallback), per spec.

- [ ] **Step 1: Write character.js (core only — no IK yet)**

```js
// src/engine/character.js
(() => {
  const C = (globalThis.CASINO ??= {});

  // GLB dealer characters: preload once, clone per dealer, mocap idle via
  // AnimationMixer. The IK action layer lands in a later task; play() for
  // IK-action names resolves immediately until then (procedural rig has
  // usually been swapped out by the time tables call them — acceptable
  // mid-implementation state, NOT shippable until Task 7).
  // FILL FROM assets/manifest.json (Task 1) — left side is logical, right is
  // the actual bone name in dealer-characters.glb:
  const BONE_MAP = {
    hips: 'pelvis', spine: 'spine_01', chest: 'spine_03',
    neck: 'neck_01', head: 'head',
    shoulderL: 'clavicle_l', upperArmL: 'upperarm_l', foreArmL: 'lowerarm_l', handL: 'hand_l',
    shoulderR: 'clavicle_r', upperArmR: 'upperarm_r', foreArmR: 'lowerarm_r', handR: 'hand_r',
  };
  // FILL FROM manifest clip names — the looping idle used by setIdle:
  const IDLE_CLIP = 'Idle';

  const state = { ready: null, template: null, clips: null, pending: [], failed: false };

  async function fetchGlb(url, timeoutMs = 10000) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctl.signal });
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      return await res.arrayBuffer();
    } finally { clearTimeout(timer); }
  }

  const parseGlb = (buf) => new Promise((resolve, reject) =>
    new THREE.GLTFLoader().parse(buf, '', resolve, reject));

  async function preload(baseUrl = './assets/') {
    if (state.ready) return;
    state.ready = 'loading';
    try {
      const [charBuf, clipBuf] = await Promise.all([
        fetchGlb(baseUrl + 'dealer-characters.glb'),
        fetchGlb(baseUrl + 'dealer-clips.glb'),
      ]);
      const [charGltf, clipGltf] = await Promise.all([parseGlb(charBuf), parseGlb(clipBuf)]);
      // validate every mapped bone exists
      const names = new Set();
      charGltf.scene.traverse((o) => names.add(o.name));
      for (const bone of Object.values(BONE_MAP)) {
        if (!names.has(bone)) throw new Error(`bone missing from GLB: ${bone}`);
      }
      state.template = charGltf.scene;
      state.clips = clipGltf.animations.concat(charGltf.animations);
      if (!state.clips.find((c) => c.name === IDLE_CLIP)) throw new Error(`idle clip missing: ${IDLE_CLIP}`);
      state.ready = 'ready';
      state.pending.splice(0).forEach((fn) => fn());
    } catch (err) {
      state.ready = 'failed';
      state.pending.length = 0;
      console.warn('[character] GLB dealers unavailable, keeping procedural rigs:', err.message);
    }
  }

  function findClip(name) { return state.clips.find((c) => c.name === name) || null; }

  function buildCharacter(opts) {
    const seed = String(opts.seed ?? '');
    let h = 9;
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 0x9e3779b1);
    h = Math.abs(h >>> 0);
    const group = THREE.SkeletonUtils.clone(state.template);
    group.traverse((o) => {
      if (o.isMesh || o.isSkinnedMesh) {
        o.castShadow = true; o.receiveShadow = true;
        o.material = o.material.clone();            // per-dealer tinting
      }
    });
    // simple variation: tint + height (palettes shared with rig.js via C.rigPalettes,
    // exported from rig.js in Step 3)
    const P = C.rigPalettes;
    group.traverse((o) => {
      if (!o.isMesh && !o.isSkinnedMesh) return;
      const n = o.material.name.toLowerCase();
      if (n.includes('skin')) o.material.color.set(P.SKINS[h % P.SKINS.length]);
      else if (n.includes('hair')) o.material.color.set(P.HAIRS[(h >>> 3) % P.HAIRS.length]);
      else o.material.color.set(P.VESTS[(h >>> 6) % P.VESTS.length]);
    });
    group.scale.setScalar(0.96 + ((h >>> 9) % 9) * 0.01);   // 0.96–1.04
    const bones = {};
    for (const [logical, real] of Object.entries(BONE_MAP)) {
      bones[logical] = group.getObjectByName(real);
    }
    return { group, bones, mixer: new THREE.AnimationMixer(group), hash: h };
  }

  // charImpl: same method contract as rig.js's rig object.
  function makeImpl(app, built) {
    const { group, bones, mixer } = built;
    const tokens = { arms: 0, head: 0, body: 0, mouth: 0 };
    let idleHook = null;
    let idleAction = null;

    function setIdle() {
      if (app.REDUCED || idleHook) return idleHook;
      const gen = app.roomGen;
      idleAction = mixer.clipAction(findClip(IDLE_CLIP));
      idleAction.play();
      const hook = (dt) => {
        if (app.roomGen !== gen) { idleAction?.stop(); return app.offFrame(hook); }
        mixer.update(dt);
        applyLook();          // look-at layer, below
      };
      hook.cancel = () => app.offFrame(hook);
      app.onFrame(hook);
      idleHook = hook;
      return hook;
    }

    // ---- head look-at (same clamping/feel as rig.js) ----
    const look = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0 };
    function applyLook() {
      look.yaw += (look.tYaw - look.yaw) * 0.12;
      look.pitch += (look.tPitch - look.pitch) * 0.12;
      if (bones.neck) {
        bones.neck.rotation.y += look.yaw * 0.4;
        bones.neck.rotation.x += look.pitch * 0.4;
      }
      if (bones.head) {
        bones.head.rotation.y += look.yaw * 0.6;
        bones.head.rotation.x += look.pitch * 0.6;
      }
    }
    function lookAt(_app, worldTarget) {
      const local = group.worldToLocal(new THREE.Vector3(...worldTarget));
      look.tYaw = Math.max(-0.7, Math.min(0.7, Math.atan2(local.x, local.z)));
      const flat = Math.hypot(local.x, local.z) || 1e-4;
      look.tPitch = Math.max(-0.35, Math.min(0.35, -Math.atan2(local.y - 1.5, flat)));
      if (app.REDUCED) { look.yaw = look.tYaw; look.pitch = look.tPitch; }
    }

    // play(): Task 6 adds mocap gestures, Task 7 adds IK actions. For now,
    // resolve immediately so awaited sequences never hang mid-implementation.
    function play() { return Promise.resolve(); }
    const stop = (track) => { tokens[track] += 1; };
    function say(_app, text, o = {}) {
      // GLB face is static — subtle head bob stands in for the mouth flap
      return C.assets.speechBubbleOn(app, group, text, {
        ...o,
        mouthPulse: (t) => { if (bones.head) bones.head.rotation.x += Math.sin(t / 140) * 0.02; },
      });
    }
    function dispose() {
      idleHook?.cancel(); idleHook = null;
      mixer.stopAllAction();
      group.parent?.remove(group);
    }

    return { group, bones, mixer, tokens, play, stop, say, lookAt, setIdle, dispose };
  }

  function attach(app, root, opts, onReady) {
    const build = () => {
      if (state.ready !== 'ready') return;
      const impl = makeImpl(app, buildCharacter(opts));
      root.add(impl.group);
      onReady(impl);
    };
    if (state.ready === 'ready') build();
    else if (state.ready === 'loading') state.pending.push(build);
    // 'failed' / null → never fires; procedural rig stays
  }

  C.character = { preload, attach, get ready() { return state.ready; } };
})();
```

Note: `speechBubbleOn` is extracted in Step 2 so the bubble code isn't duplicated between rig.js and character.js. The look-at here writes deltas AFTER `mixer.update`, so mocap keeps the base pose and the look composes on top.

- [ ] **Step 2: Extract the speech bubble from rig.js into assets.js**

In `src/engine/assets.js`, add (near `canvasTexture`), moving the bubble-building code out of `rig.js say()` verbatim (canvas drawing, sprite sizing, `wrapLines`) into:

```js
  // Shared dealer speech bubble: sprite on `group`, auto-removed after ms.
  // mouthPulse(cb) is optional — procedural rig scales its mouth mesh, GLB
  // characters do a subtle head bob instead.
  function speechBubbleOn(app, group, text, { ms = 2600, mouthPulse = null } = {}) {
    /* body: exactly the current rig.js say() implementation from
       src/engine/rig.js:232-281, with these substitutions:
       - `mouth.scale.y = ...` becomes `mouthPulse && mouthPulse(t)`
       - bubble state is per-call local (a second call on the same group
         removes the previous sprite via group.userData._bubble bookkeeping)
       - tokens.mouth becomes a module-local counter keyed by group.uuid */
  }
```

Then in `src/engine/rig.js`, replace the body of `say()` with:

```js
    function say(app, text, o = {}) {
      return C.assets.speechBubbleOn(app, group, text, {
        ...o,
        mouthPulse: (t) => { mouth.scale.y = 1 + Math.abs(Math.sin(t / 90)) * 2.6; },
      });
    }
```

and delete the now-unused local bubble code (keep the `mouth` mesh reference). ALSO add at the bottom of rig.js, next to `C.rig = ...`:

```js
  C.rigPalettes = { SKINS, HAIRS, VESTS };
```

(Character tinting reuses the same palettes — move the three const arrays up if needed, do not duplicate them.)

- [ ] **Step 3: Rework makeDealer into the stable facade**

Replace `src/engine/assets.js` `makeDealer` (lines 122-135) with:

```js
  // ---------- dealer / staff figure ----------
  // Returns a root Group whose userData.rig is a STABLE facade: procedural
  // rig first, GLB character swapped in when C.character assets arrive.
  // Call sites hold the facade reference — it never changes identity.
  function makeDealer(opts = {}) {
    const app = C.app;
    const procedural = C.rig.makeHumanRig(opts);
    const root = new THREE.Group();
    root.add(procedural.group);
    let impl = procedural;
    let idleWanted = false;
    const facade = {
      play: (a, name, o) => impl.play(a, name, o),
      stop: (t) => impl.stop(t),
      say: (a, text, o) => impl.say(a, text, o),
      lookAt: (a, tgt) => impl.lookAt(a, tgt),
      setIdle: (a) => { idleWanted = true; return impl.setIdle(a); },
      get joints() { return impl.joints; },
    };
    if (app && !app.REDUCED) {
      C.character?.attach(app, root, opts, (charImpl) => {
        ['arms', 'head', 'body', 'mouth'].forEach((t) => procedural.stop(t));
        root.remove(procedural.group);
        impl = charImpl;
        if (idleWanted) impl.setIdle(app);
      });
    }
    root.userData.rig = facade;
    root.userData.idle = (a) => facade.setIdle(a);
    root.userData.lookToward = (a, worldTarget) => facade.lookAt(a, worldTarget);
    root.userData.headShake = (a) => facade.play(a, 'headShake');
    root.userData.dealGesture = (a, worldTarget, ms) =>
      facade.play(a, 'welcomeSweep', { refs: { target: worldTarget }, ms });
    return root;
  }
```

Check `rig.js makeHumanRig` return — it must expose `stop` (it does) and its idle hook must be cancellable when the swap happens: `setIdle` returns the hook; store it in the facade closure if needed (`let procIdle = null; setIdle: (a) => { idleWanted = true; procIdle = impl.setIdle(a); ... }` and call `procIdle?.cancel?.()` in the swap callback before removing the group).

- [ ] **Step 4: Kick preload from boot + build order**

In `src/boot.js`, right after the app/floor setup (find where `C.app` first exists; add immediately after that line):

```js
  if (!C.app.REDUCED) C.character.preload('./assets/');
```

In `build.mjs` `SRC_ORDER`, insert `'src/engine/character.js'` after `'src/engine/rig.js'`, and `'src/logic/ik.js'`, `'src/logic/hand-paths.js'` after `'src/logic/gestures.js'`.

- [ ] **Step 5: Build + run all tests**

Run: `node build.mjs && node --test tests/`
Expected: build OK; all existing tests still pass (this task adds no new node tests — the THREE side is browser-verified next step).

- [ ] **Step 6: Browser smoke test**

Serve `lobby-3d/` locally (scoped verify skill). Confirm: (a) network tab fetches both `.glb` files; (b) after load, dealers at all four tables + receptionist swap from capsule-people to GLB characters standing in mocap idle (breathing); (c) `mv assets assets_off` + reload → capsule dealers remain, one console warning, no errors; restore `assets`. Speech bubbles still appear (walk to the vestibule).

- [ ] **Step 7: Commit**

```bash
git add src/engine/character.js src/engine/assets.js src/engine/rig.js src/boot.js build.mjs index.html
git commit -m "feat(casino-3d): GLB dealer characters — load, clone, mocap idle, facade swap"
```

---

### Task 6: Mocap gesture mapping (wave / nod / headShake / welcomeSweep)

**Files:**
- Modify: `src/engine/character.js` (play() routes gesture names to mixer one-shots)

**Interfaces:**
- Consumes: `state.clips` + manifest clip names from Task 1's commit message.
- Produces: `impl.play(app, name, opts)` resolves gesture names via `MOCAP_MAP`; everything else still resolves immediately (until Task 7). One-shot actions crossfade from/to idle over 0.25 s, respect `roomGen` + `tokens.arms`/`tokens.head`, and `hook.cancel`.

- [ ] **Step 1: Add the clip map and one-shot player**

In `character.js`, add next to `IDLE_CLIP` (FILL the right side from the manifest — the names below are the expected Quaternius Universal Animation Library names; verify each exists, pick the closest match if not):

```js
  const MOCAP_MAP = {
    wave: { clip: 'Wave', track: 'arms' },
    nod: { clip: 'Yes', track: 'head' },
    headShake: { clip: 'No', track: 'head' },
    welcomeSweep: { clip: 'Interact', track: 'arms' },
  };
```

Inside `makeImpl`, replace `function play() { return Promise.resolve(); }` with:

```js
    function playMocap(name, ms) {
      const entry = MOCAP_MAP[name];
      const clip = findClip(entry.clip);
      if (!clip) return Promise.resolve();
      const token = ++tokens[entry.track];
      const gen = app.roomGen;
      const action = mixer.clipAction(clip);
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = false;
      if (ms) action.timeScale = (clip.duration * 1000) / ms;
      if (app.REDUCED) return Promise.resolve();
      idleAction && action.crossFadeFrom(idleAction, 0.25, false);
      action.play();
      return new Promise((resolve) => {
        const done = () => {
          mixer.removeEventListener('finished', onFin);
          app.offFrame(watch);
          if (idleAction) { idleAction.reset(); idleAction.play(); action.crossFadeTo(idleAction, 0.25, false); }
          resolve();
        };
        const onFin = (e) => { if (e.action === action) done(); };
        const watch = () => {
          if (tokens[entry.track] !== token || app.roomGen !== gen) { action.stop(); done(); }
        };
        watch.cancel = () => { action.stop(); done(); };
        mixer.addEventListener('finished', onFin);
        app.onFrame(watch);
      });
    }

    function play(a, name, opts = {}) {
      if (MOCAP_MAP[name]) return playMocap(name, opts.ms);
      return Promise.resolve();     // IK actions land in Task 7
    }
```

Also: the idle hook from Task 5 must keep `mixer.update(dt)` running while a one-shot plays even if `setIdle` was never called (receptionist calls setIdle, but be safe): in `playMocap`, if `!idleHook`, start a temporary mixer-update hook with the same guards and cancel it in `done()`.

- [ ] **Step 2: Build + browser verify**

Run: `node build.mjs`, serve, then in the browser console on the lobby page:
`CASINO.app` exists → walk to the vestibule (receptionist waves at approach — `vestibule.js:269`). Expected: a real mocap wave crossfading from idle, no T-pose pops, head shake on the members-gate refusal. `nod`/`headShake` visible at the baccarat show between shoes.

- [ ] **Step 3: Commit**

```bash
git add src/engine/character.js index.html
git commit -m "feat(casino-3d): mocap gesture one-shots with idle crossfade"
```

---

### Task 7: IK action layer — single-hand paths

**Files:**
- Modify: `src/engine/character.js` (IK runner + bone aiming; play() routes hand-path names)

**Interfaces:**
- Consumes: `C.ik.solveTwoBone` (Task 3), `C.handPaths.PATHS` (Task 4), `bones` map (Task 5).
- Produces: `play(app, name, {refs, ms, on})` for `dealCard, sweepChips, payChips, spinReach, spinFollow, placeDolly, tapRack` — IK-driven arms over the mocap base, `on[event](handWorldPos: THREE.Vector3)` callbacks, weight ramp 120 ms in/out, `armsRest` ramps weight to 0. Task 8 extends to two-hand cycles; Task 9 uses the `on` callbacks.

- [ ] **Step 1: Add bone-space aiming helpers**

In `makeImpl` (after `bones` is available), add — this is the trickiest THREE code in the plan, keep it exactly:

```js
    // ---- IK bone aiming ----
    // For each arm bone we captured at build time: restDir = direction from
    // the bone to its child in the bone's LOCAL space (rest pose). Aiming =
    // rotate the bone so restDir points along a desired world direction.
    const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
    const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
    const armChains = {};
    for (const side of ['L', 'R']) {
      const upper = bones['upperArm' + side], fore = bones['foreArm' + side], hand = bones['hand' + side];
      if (!upper || !fore || !hand) continue;
      const upperLen = fore.position.length() * upper.getWorldScale(_v1).x;
      const foreLen = hand.position.length() * fore.getWorldScale(_v1).x;
      armChains[side] = {
        upper, fore, hand, upperLen, foreLen,
        restDirUpper: fore.position.clone().normalize(),   // child dir in upper's local space
        restDirFore: hand.position.clone().normalize(),
        restQUpper: upper.quaternion.clone(),
        restQFore: fore.quaternion.clone(),
        restQHand: hand.quaternion.clone(),
        weight: 0,
      };
    }

    // Rotate `bone` so that `restDir` (local) points at world direction `dirW`.
    function aimBone(bone, restDir, dirW, weight) {
      bone.parent.getWorldQuaternion(_q1);
      _v1.copy(dirW).applyQuaternion(_q2.copy(_q1).invert());   // desired dir, parent-local
      _q2.setFromUnitVectors(restDir, _v1.normalize());
      if (weight >= 1) bone.quaternion.copy(_q2);
      else bone.quaternion.slerp(_q2, weight);
    }

    // Solve + apply one arm toward a world-space hand target.
    function applyArmIK(side, targetW, weight) {
      const ch = armChains[side];
      if (!ch || weight <= 0) return;
      ch.upper.getWorldPosition(_v3);
      const s = [_v3.x, _v3.y, _v3.z];
      // pole: down-and-out from the shoulder, in the character's facing frame
      group.getWorldQuaternion(_q1);
      _v2.set(side === 'L' ? -0.6 : 0.6, -1, 0.15).applyQuaternion(_q1);
      const r = C.ik.solveTwoBone({
        shoulder: s, target: [targetW.x, targetW.y, targetW.z],
        upperLen: ch.upperLen, foreLen: ch.foreLen, pole: [_v2.x, _v2.y, _v2.z],
      });
      aimBone(ch.upper, ch.restDirUpper,
        _v1.set(r.elbow[0] - s[0], r.elbow[1] - s[1], r.elbow[2] - s[2]), weight);
      ch.upper.updateWorldMatrix(true, false);
      ch.fore.getWorldPosition(_v3);
      aimBone(ch.fore, ch.restDirFore,
        _v1.set(r.hand[0] - _v3.x, r.hand[1] - _v3.y, r.hand[2] - _v3.z), weight);
    }
```

- [ ] **Step 2: Add the path runner**

```js
    // ---- IK path runner (single- and, from Task 8, two-hand) ----
    function resolveWaypointPos(wp, refs, side) {
      if (wp.rest) {
        const ch = armChains[side];
        ch.upper.getWorldPosition(_v1);
        group.getWorldQuaternion(_q1);
        return _v1.add(_v2.set(0, -(ch.upperLen + ch.foreLen) * 0.82, 0.10).applyQuaternion(_q1)).clone();
      }
      const base = wp.pos ? _v1.set(...wp.pos) : _v1.set(...refs[wp.ref]);
      if (wp.offset) base.add(_v2.set(...wp.offset));
      return base.clone();
    }

    function playPath(name, { refs = {}, ms, on = {} } = {}) {
      const path = C.handPaths.PATHS[name];
      const token = ++tokens.arms;
      const gen = app.roomGen;
      const dur = ms || path.dur;
      if (app.REDUCED) return Promise.resolve();
      // per-hand: waypoints resolved to world Vector3s up front (refs are
      // static per call, same semantics as gestures.js)
      const hands = Object.entries(path.hands).map(([side, wps]) => ({
        side,
        chain: armChains[side],
        start: null,               // filled on first frame (current hand pos)
        wps: wps.map((w) => ({
          at: w.at, ease: C.tween.easings[w.ease || 'inOutCubic'],
          arc: w.arc || 0, event: w.event || null, fired: false,
          pos: resolveWaypointPos(w, refs, side),
        })),
      })).filter((h) => h.chain);
      if (!hands.length) return Promise.resolve();
      const RAMP = 120;
      const t0 = performance.now();
      return new Promise((resolve) => {
        const hook = () => {
          if (tokens.arms !== token || app.roomGen !== gen) {
            app.offFrame(hook); rampOut(token); return resolve();
          }
          const now = performance.now();
          const t = Math.min(1, (now - t0) / dur);
          const w = Math.min(1, (now - t0) / RAMP)
            * (path.cycle ? 1 : Math.min(1, ((1 - t) * dur) / RAMP + 0.001));
          for (const h of hands) {
            if (!h.start) { h.chain.hand.getWorldPosition(_v3); h.start = _v3.clone(); }
            // find current segment
            let prevAt = 0, prevPos = h.start, cur = h.wps[h.wps.length - 1];
            for (const wp of h.wps) {
              if (t <= wp.at || wp === h.wps[h.wps.length - 1]) { cur = wp; break; }
              prevAt = wp.at; prevPos = wp.pos;
            }
            const span = Math.max(1e-4, cur.at - prevAt);
            const st = Math.min(1, (t - prevAt) / span);
            const e = cur.ease(st);
            const pos = _v1.copy(prevPos).lerp(cur.pos, e);
            pos.y += cur.arc * 4 * st * (1 - st);
            applyArmIK(h.side, pos, w);
            if (cur.event && !cur.fired && st >= 0.995) {
              cur.fired = true;
              h.chain.hand.getWorldPosition(_v2);
              on[cur.event]?.(_v2.clone());
            }
          }
          if (t >= 1) { app.offFrame(hook); resolve(); }
        };
        hook.cancel = () => { app.offFrame(hook); resolve(); };
        app.onFrame(hook);
      });
    }

    // armsRest: 300ms weight ramp back to mocap arms
    function rampOut(fromToken) {
      const gen = app.roomGen;
      const t0 = performance.now();
      const hook = () => {
        if (tokens.arms !== fromToken || app.roomGen !== gen) return app.offFrame(hook);
        const k = 1 - Math.min(1, (performance.now() - t0) / 300);
        if (k <= 0) return app.offFrame(hook);
        // fading slerp toward mocap pose happens implicitly: mixer.update
        // rewrites arm bones every frame; we re-apply a decaying partial aim
        // at the LAST IK pose by doing nothing — mixer wins. Keep hook only
        // if visual popping shows up in verify; otherwise delete rampOut.
      };
      app.onFrame(hook);
      app.offFrame(hook);
    }
```

**Ordering constraint:** `mixer.update(dt)` (idle hook) runs FIRST each frame, then `applyArmIK` overwrites arm bones, then `applyLook`. Frame hooks run in registration order (`app.onFrame`) — the idle hook is registered at `setIdle` (table setup) and the path hook at `play()` (later), so ordering holds naturally. Add a one-line comment in both hooks noting this dependency. If `setIdle` was never called (no mixer running), `playPath` works standalone — IK writes over the bind pose, acceptable.

The `rampOut` above is intentionally minimal: because the mixer rewrites bones every frame, dropping the IK hook IS the release. The `w` ramp handles blend-in and non-cycle blend-out. Delete `rampOut` if verify shows no pop (likely).

- [ ] **Step 3: Route play() and armsRest**

```js
    function play(a, name, opts = {}) {
      if (MOCAP_MAP[name]) return playMocap(name, opts.ms);
      if (name === 'armsRest') { tokens.arms += 1; return Promise.resolve(); }
      if (C.handPaths.PATHS[name]) return playPath(name, opts);
      return Promise.resolve();
    }
```

- [ ] **Step 4: Build + browser verify per table**

Run: `node build.mjs`, serve. Verify at each table (join with the lobby wallet flow or watch ambient shows):
- Roulette: dealer reaches the rim (`spinReach` — hand ON the rim), flick (`spinFollow`), dolly carry (`placeDolly`), sweeps and pays with the hand tracking chip stacks. Elbows bend naturally downward-out, never through the torso.
- Blackjack/baccarat/UTH: `dealCard` — hand goes shoe → card spot, elbow natural.
- No console errors; procedural fallback still intact when assets blocked.

- [ ] **Step 5: Commit**

```bash
git add src/engine/character.js index.html
git commit -m "feat(casino-3d): two-bone IK arm layer over mocap base for dealer actions"
```

---

### Task 8: Two-hand cyclic paths + baccarat ritual hand-sync

**Files:**
- Modify: `src/engine/character.js` (nothing structural — the runner from Task 7 already iterates `path.hands`; verify cycle chaining)
- Modify: `src/floor/baccarat-show.js` (wash cards follow palm bones; riffle stacks sync to hand phase)

**Interfaces:**
- Consumes: `playPath` two-hand support (Task 7), `impl.bones.handL/handR` via a new facade getter.
- Produces: facade gains method `handWorld(side)` → `THREE.Vector3|null` (world position of the current impl's palm; procedural rig returns wrist joint world pos; used by the show + Task 9). Everything else unchanged.

- [ ] **Step 1: Expose hand world positions on the facade**

In `assets.js` facade:

```js
      handWorld: (side) => {
        const v = new THREE.Vector3();
        if (impl.bones?.['hand' + side]) return impl.bones['hand' + side].getWorldPosition(v);
        if (impl.joints?.['wrist' + side]) return impl.joints['wrist' + side].getWorldPosition(v);
        return null;
      },
```

(Procedural rig exposes `joints` already; `impl.bones` exists on charImpl.)

- [ ] **Step 2: Wash cards follow the palms**

In `src/floor/baccarat-show.js`, the wash section (`~line 218-227`) currently plays `washCards` while separately smearing card meshes. Change the card-smear frame logic so each smeared card eases toward an offset around `rig.handWorld('L')` / `rig.handWorld('R')` (alternate cards L/R), converted into show-local space with the existing `toW`-inverse (use `showGroup.worldToLocal`). Read the current smear implementation first and keep its card count/rotation jitter; only the target positions change — when `handWorld` returns null (REDUCED / early), keep the existing authored smear paths as-is.

Pass `{ refs: { target: toW([0, feltY, 0.22]) } }` to the `washCards`/`shuffleRiffle` plays (the felt center the hands orbit) — grep the two `rig.play(app, 'washCards')` / `'shuffleRiffle'` calls (`baccarat-show.js:222,254`) and add the refs argument; the old euler clips ignored refs, the IK paths REQUIRE them (validate: without refs, `resolveWaypointPos` reads `refs[wp.ref]` = undefined → guard in `playPath`: if any waypoint's ref is missing from `refs`, return `Promise.resolve()` and `console.warn` once per name).

Add that missing-ref guard in `character.js` `playPath` (one-line check while mapping waypoints).

- [ ] **Step 3: Riffle interleave timing**

In the riffle section (`baccarat-show.js:~254`), the interleave animation currently runs on its own clock. Drive per-card flip start times from the riffle cycle: each `rig.play(app,'shuffleRiffle', {refs})` lasts 1100 ms with hand lifts at `at:0.45` (L up) and `at:0.70` (R up) — stagger card drops in two bursts aligned to `0.45*1100` and `0.70*1100` ms offsets (plus the existing per-card jitter). This is a timing-constant change, not a rewrite.

- [ ] **Step 4: Build + browser verify the full ritual**

Run: `node build.mjs`, serve, go to the baccarat show table, wait for cut-card → shuffle ritual. Expected: both palms circle over the felt with cards tracking beneath them; riffle shows two stacks with cards cascading in sync with alternating hand lifts; `armsRest` returns arms smoothly to idle; speech bubbles + nod still work. REDUCED mode (toggle the app's reduced flag as the verify skill documents) still runs the old cheap version with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/engine/character.js src/engine/assets.js src/floor/baccarat-show.js index.html
git commit -m "feat(casino-3d): two-hand wash/riffle with cards tracking the dealer's palms"
```

---

### Task 9: Prop release sync — cards from the hand, wheel kick on contact

**Files:**
- Modify: `src/floor/baccarat-show.js` (deal cards FROM the hand at release)
- Modify: `src/floor/tables/roulette-table.js:784-790` (wheel kick waits for the flick)

**Interfaces:**
- Consumes: `play(..., {on: {release/contact: (handPos) => ...}})` from Task 7; `dealCardTo` unchanged (`C.cards.dealCardTo(app, mesh, from, to, opts)` — caller supplies `from`).
- Produces: no new interfaces — call-site polish only.

- [ ] **Step 1: Baccarat show deals from the hand**

`baccarat-show.js` pairs `rig.play(app,'dealCard',{refs:{shoe,target}})` with `dealCardTo(app, mesh, from, to, ...)` at ~6 sites (lines 97, 115, 180, 198, 305, 309, 328). For the two main-game sites (97, 115), restructure to launch the card at the IK release moment, from the actual hand position:

```js
        await rig.play(app, 'dealCard', {
          refs: { shoe: toW(L.shoePos), target: toW(slot) },
          on: { release: (handPos) => {
            C.cards.dealCardTo(app, mesh, [handPos.x, handPos.y, handPos.z], toW(slot), { ms: 300 });
          } },
        });
```

Match each site's existing options (`flip`, `delay`, `sound`) and its await structure — read the surrounding code per site; where the existing code intentionally fires rig + card in parallel without awaiting, keep that shape and put `dealCardTo` in the `on.release` callback. **Fallback:** when the procedural rig is still active (GLB failed), `play` ignores `on` — so ALSO keep the original `dealCardTo` call as an `else` path: only use the callback style when `C.character.ready === 'ready'`. Write a tiny local helper in baccarat-show.js:

```js
      const dealVia = (mesh, fromLocal, toLocal, opts = {}) => {
        const from = toW(fromLocal), to = toW(toLocal);
        if (C.character.ready === 'ready') {
          return rig.play(app, 'dealCard', { refs: { shoe: from, target: to },
            on: { release: (h) => C.cards.dealCardTo(app, mesh, [h.x, h.y, h.z], to, opts) } });
        }
        rig.play(app, 'dealCard', { refs: { shoe: from, target: to } });
        return C.cards.dealCardTo(app, mesh, from, to, opts);
      };
```

and convert the 6 sites to `dealVia(...)`.

- [ ] **Step 2: Roulette wheel kicks when the hand flicks**

In `roulette-table.js` `g.userData.spinTo` (lines 786-790), make the wheel start exactly on the flick's release event, with the old behavior as fallback:

```js
    g.userData.spinTo = async (pocket) => {
      await rigPlay('spinReach', { rim: toW(RIM_LOCAL) });
      if (C.character.ready === 'ready') {
        let kicked = null;
        const kick = new Promise((res) => { kicked = res; });
        rigPlay('spinFollow', { rim: toW(RIM_LOCAL), on: { release: () => kicked() } });
        await Promise.race([kick, new Promise((r) => setTimeout(r, 400))]);
      } else {
        rigPlay('spinFollow', {});
      }
      return rawSpinTo(pocket);
    };
```

(Note `spinFollow`'s path uses ref `rim` — the old euler clip took no refs; the 400 ms race keeps the wheel from hanging if the play is cancelled by a room switch.) Check how `rigPlay` is defined in this file and pass options through it if it currently strips them.

- [ ] **Step 3: Dolly rides in the hand**

In `roulette-table.js` `g.userData.placeDolly` (line 712-717), when the GLB character is active, parent the dolly to the hand bone between `grab` and `release` instead of gliding it independently (spec: "dolly parents to the hand bone between grab and release"):

```js
    g.userData.placeDolly = async (n) => {
      const [x, z] = C.layouts.rouletteSpotPos('n' + n);
      dolly.visible = true;
      const rig = dealer.userData.rig;
      if (C.character.ready === 'ready') {
        await rig.play(C.app, 'placeDolly', {
          refs: { rack: toW(RACK_LOCAL), target: toW([x, FELT_Y, z]) },
          on: {
            grab: (h) => { dolly.getWorldPosition(_tmpV); rig.handBone?.('R')?.attach(dolly); },
            release: () => { g.attach(dolly); dolly.position.set(x, FELT_Y + 0.02, z); },
          },
        });
        // safety: if release never fired (cancel mid-path), reattach
        if (dolly.parent !== g) { g.attach(dolly); dolly.position.set(x, FELT_Y + 0.02, z); }
      } else {
        rigPlay('placeDolly', { rack: toW(RACK_LOCAL), target: toW([x, FELT_Y, z]) });
        await glideLocal(dolly, [x, FELT_Y + 0.02, z], 750);
      }
    };
```

This needs one more facade method in `assets.js` (mirror of `handWorld` from Task 8): `handBone: (side) => impl.bones?.['hand' + side] ?? null` (procedural rig → null, so the fallback branch handles it). `_tmpV` is a module-local `new THREE.Vector3()` — or drop the `getWorldPosition` line entirely since `Object3D.attach()` already preserves world transform. Verify `dealer` is in scope at this point in the file (it is — `dealer.userData.idle` is called nearby at line 637); `liftDolly` keeps using `glideLocal` unchanged.

- [ ] **Step 4: Chips move on contact**

In `roulette-table.js` `g.userData.settleBets` (line 739-768): when `C.character.ready === 'ready'`, start the losing-stack `flyStack` sweeps from the `contact` event of `sweepChips` instead of immediately, and give each landing a settle wobble:

```js
      if (losingSpots.length) {
        const first = losingSpots[0];
        const startSweeps = () => sweeps.forEach((fn) => fn());
        const sweepPlay = rigPlay('sweepChips',
          { target: toW([first.x, FELT_Y, first.z]), rack: toW(RACK_LOCAL) },
          { on: { contact: startSweeps } });
        if (C.character.ready !== 'ready') startSweeps();
        // (rigPlay must forward the third argument's `on` — see Step 2 note)
      }
```

Restructure the existing `losingSpots.map(...)` promises into deferred thunks (`sweeps`) so the timer chain (`setTimeout(..., i * 90)`) begins at `contact` (or immediately in fallback). Settle wobble: in `flyStack`'s final tween completion, add a 120 ms scale pulse `1 → 1.06 → 1` on the stack (skip in REDUCED). Same `contact`-gating is NOT needed for `payChips` (the pay loop already awaits the rig play's rhythm acceptably) — YAGNI.

- [ ] **Step 5: Build + browser verify**

Run: `node build.mjs`, serve. Baccarat show: cards visibly leave the dealer's hand mid-gesture and fly to their slots (not from the static shoe point while the hand is elsewhere). Roulette: wheel starts turning the instant the wrist flicks, not before; dolly travels in the dealer's hand; losing chips move only once the rake touches them. Blocked-assets fallback still deals correctly from the shoe and glides the dolly.

- [ ] **Step 6: Commit**

```bash
git add src/floor/baccarat-show.js src/floor/tables/roulette-table.js src/engine/assets.js index.html
git commit -m "feat(casino-3d): hand-synced props — card release, dolly carry, chip contact, wheel kick"
```

---

### Task 10: Performance LOD, fallback hardening, full verify, public sync

**Files:**
- Modify: `src/engine/character.js` (distance LOD)
- Modify: `portfolio/public/games/casino-game/lobby-3d/` (mirror sync)

**Interfaces:** none new.

- [ ] **Step 1: Distance-based mixer throttle + shadow LOD**

In `character.js` `makeImpl`'s idle hook, add (camera at `app.camera`):

```js
      // LOD: beyond 10m, run the mixer at ~15Hz and drop shadows
      const hook = (dt) => {
        if (app.roomGen !== gen) { idleAction?.stop(); return app.offFrame(hook); }
        group.getWorldPosition(_v1);
        const far = _v1.distanceTo(app.camera.position) > 10;
        lodAcc += dt;
        if (!far || lodAcc >= 1 / 15) { mixer.update(lodAcc); lodAcc = 0; }
        if (far !== wasFar) {
          wasFar = far;
          group.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) o.castShadow = !far; });
        }
        applyLook();
      };
```

with `let lodAcc = 0, wasFar = false;` in the closure. (Verify the field name for the camera on `C.app` — grep `app.camera` in `src/engine/app.js` first; adjust if it's `app.cam` or similar.)

- [ ] **Step 2: Run the entire test suite + build**

Run: `cd portfolio/src/game/casino-game/calculator/lobby-3d && node --test tests/ && node build.mjs`
Expected: ALL tests pass (manifest, ik, hand-paths, build, plus every pre-existing suite).

- [ ] **Step 3: Full browser verification pass**

Use the scoped `portfolio/src/game/casino-game/calculator:verify` skill. Checklist:
- All four tables + receptionist show GLB dealers with breathing idle.
- Roulette: reach → flick → wheel spin → dolly → sweep/pay, hands touching everything.
- Baccarat show: full shoe cycle including cut card → wash (cards under palms) → riffle (synced cascade) → restack → new shoe.
- Blackjack + UTH: dealing looks natural.
- Vestibule: wave + bubbles + head shake.
- FPS: open the perf overlay/devtools — full floor view ≥ 55 fps on this machine (baseline was 60).
- Fallback: block `assets/*.glb` (devtools request blocking) → procedural dealers, one warn, everything playable.
- REDUCED mode: static dealers, no errors, no GLB fetches.
- Console: zero errors in all of the above.

Fix anything found before proceeding; re-run the suite after fixes.

- [ ] **Step 4: Sync to the public mirror**

```bash
cd portfolio/src/game/casino-game/calculator
rsync -a --delete lobby-3d/assets/ ../../public/games/casino-game/lobby-3d/assets/ 2>/dev/null \
  || cp -r lobby-3d/assets ../../../public/games/casino-game/lobby-3d/
# copy changed sources + built index.html the same way the repo already mirrors
# lobby-3d (compare: diff -rq lobby-3d ../../public/games/casino-game/lobby-3d | head)
```

First run `diff -rq` to see the existing mirror relationship and copy exactly the files this branch changed (src/, vendor/, tools/, tests/, build.mjs, index.html, assets/). Do NOT copy unrelated pre-existing dirty files' changes — check `git status` of the public dir afterward and confirm every staged public change corresponds to a src change from this plan.

- [ ] **Step 5: Final commit**

```bash
git add src/engine/character.js index.html ../../public/games/casino-game/lobby-3d/
git status   # REVIEW: only this plan's files
git commit -m "feat(casino-3d): dealer LOD + public mirror sync for GLB characters"
```

- [ ] **Step 6: Offer PR**

Push the branch and offer the user a PR (per their workflow: PR to main, never direct push; wait for explicit merge instruction).

---

## Risks / contingencies

- **Task 1b (only if assets exceed 5 MB):** write `tools/strip-glb-clips.mjs` — parse the clips GLB, keep only animations whose names are in the keep-list (idle variants + wave/yes/no/interact + 2-3 alternates), rebuild the JSON chunk AND repack the BIN chunk keeping only referenced bufferViews (remap accessor/bufferView indices). Re-run manifest + tests after.
- **Quaternius rig bone names differ from the UE-style guesses:** Task 1's manifest is the source of truth; Task 5's `BONE_MAP` and `IDLE_CLIP`, Task 6's `MOCAP_MAP` are the only three places to edit.
- **GLTFLoader r149 has a non-'three' import:** wrap tool throws; fetch the imported module (likely `BufferGeometryUtils`) and prepend it inside the same IIFE.
- **Characters and clips ship as one GLB** (UAL bundles a base character): point both fetches at the same file or skip the second fetch; manifest handles it, `state.clips` already concats both animation arrays.
- **Skinned characters clip through the table:** adjust dealer root position/scale at the table layout level (`src/floor/layout.js` dealer anchor), not per-bone.
- **Elbow pole needs tuning:** the `[±0.6, -1, 0.15]` pole in `applyArmIK` is the single tuning knob; adjust by eye during Task 7 verify.
