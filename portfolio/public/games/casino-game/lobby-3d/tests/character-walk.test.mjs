// tests/character-walk.test.mjs
//
// Shift-change walk (v2 spec, 2026-07-17): charImpl.walkIn() teleports the
// dealer to the pit-lane entry point (local -x), walks it back to its post
// at stride speed facing the travel direction, then settles the yaw back
// toward the table and resolves. Exercises the REAL engine code against the
// REAL committed GLBs in a node:vm sandbox — same harness as
// character-ik.test.mjs.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

function bytesToContextArrayBuffer(context, nodeBuffer) {
  context.__xferBytes = nodeBuffer;
  const arrayBuffer = vm.runInContext(
    `(function () {
      const src = globalThis.__xferBytes;
      const u8 = new Uint8Array(src.length);
      for (let i = 0; i < src.length; i++) u8[i] = src[i];
      delete globalThis.__xferBytes;
      return u8.buffer;
    })()`,
    context,
  );
  return arrayBuffer;
}

let sandbox, CTX_THREE, CTX_CASINO;
let mockNow = 0;

before(async () => {
  sandbox = {
    console,
    AbortController, setTimeout, clearTimeout,
    navigator: { userAgent: 'node-test-harness' },
    performance: { now: () => mockNow },
    TextDecoder,
    Blob,
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL() {} },
    createImageBitmap: async () => ({ width: 2, height: 2, close() {} }),
  };
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  const load = (p) => new vm.Script(read(p), { filename: p }).runInContext(sandbox);
  load('vendor/three-0.149.0.min.js');
  load('vendor/three-addons-0.149.js');
  load('src/engine/tween.js');
  load('src/engine/assets.js');
  load('src/engine/rig.js');
  load('src/engine/character.js');
  load('src/logic/ik.js');
  load('src/logic/hand-paths.js');

  CTX_THREE = sandbox.THREE;
  CTX_CASINO = sandbox.CASINO;

  sandbox.fetch = async (url) => {
    const name = String(url).includes('dealer-clips') ? 'dealer-clips.glb' : 'dealer-characters.glb';
    const nodeBuf = readFileSync(join(ROOT, 'assets', name));
    const arrayBuffer = bytesToContextArrayBuffer(sandbox, nodeBuf);
    return { ok: true, status: 200, arrayBuffer: async () => arrayBuffer };
  };

  await CTX_CASINO.character.preload('./assets/');
  assert.equal(CTX_CASINO.character.ready, 'ready', 'preload must succeed against the real committed GLBs');
});

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

test('walkIn: enters from local -x facing the travel direction, arrives at its post at stride speed, settles yaw, resolves, and releases its frame hook', async () => {
  const app = makeTickApp();
  let impl;
  const root = new CTX_THREE.Group();
  CTX_CASINO.character.attach(app, root, { seed: 'walk-test' }, (i) => { impl = i; });
  assert.ok(impl, 'attach() must synchronously build once preload is ready');

  mockNow = 0;
  impl.setIdle(app);
  const baseline = app.hookCount();
  const postX = impl.group.position.x;

  const p = impl.walkIn();
  assert.ok(Math.abs(impl.group.position.x - (postX - 3.2)) < 1e-6,
    'walkIn teleports to the entry point 3.2m down the pit lane (local -x)');
  assert.ok(Math.abs(impl.group.rotation.y - Math.PI / 2) < 1e-6,
    'the dealer faces +x (the travel direction) while walking');
  assert.equal(app.hookCount(), baseline + 1, 'the walk holds exactly one extra frame hook');

  // mid-walk probe: after ~1s at 1.25 m/s the dealer has covered ~1.25m
  for (let i = 0; i < 10; i++) { mockNow += 100; app.tick(0.1); }
  const covered = impl.group.position.x - (postX - 3.2);
  assert.ok(covered > 1.0 && covered < 1.5,
    `~1.25m covered after 1s of walking (got ${covered.toFixed(2)}m)`);

  // run to arrival + yaw settle (2.56s walk + ~30 settle frames)
  let resolved = false;
  p.then(() => { resolved = true; });
  for (let i = 0; i < 120 && !resolved; i++) {
    mockNow += 50;
    app.tick(0.05);
    await Promise.resolve();
  }
  assert.ok(resolved, 'walkIn resolves after arrival + yaw settle');
  assert.ok(Math.abs(impl.group.position.x - postX) < 1e-6, 'dealer ends exactly at its post');
  assert.ok(Math.abs(impl.group.rotation.y) < 1e-6, 'dealer ends facing the table again');
  assert.equal(app.hookCount(), baseline, 'the walk frame hook is released — no leak');
});

test('walkIn: a roomGen change mid-walk cancels — snaps to post, resolves, releases the hook', async () => {
  const app = makeTickApp();
  let impl;
  const root = new CTX_THREE.Group();
  CTX_CASINO.character.attach(app, root, { seed: 'walk-cancel' }, (i) => { impl = i; });

  mockNow = 0;
  impl.setIdle(app);
  const baseline = app.hookCount();
  const postX = impl.group.position.x;

  const p = impl.walkIn();
  for (let i = 0; i < 5; i++) { mockNow += 100; app.tick(0.1); }

  app.roomGen = 2;   // room switch mid-walk
  mockNow += 16;
  app.tick(1 / 60);
  await p;
  assert.ok(Math.abs(impl.group.position.x - postX) < 1e-6, 'cancellation snaps the dealer to its post');
  // the roomGen change tears down BOTH the walk hook and setIdle's own hook
  // (idle's gen guard) — zero hooks left, not baseline
  assert.equal(app.hookCount(), 0, 'cancelled walk (and the stale idle) release their frame hooks');
});
