import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function setup({ reduced = false } = {}) {
  let now = 0;
  const context = vm.createContext({ performance: { now: () => now } });
  const load = (path) => vm.runInContext(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), context);
  load('vendor/three-0.149.0.min.js');
  load('src/logic/hand-paths.js');
  load('src/engine/service-motion.js');
  const T = context.THREE, C = context.CASINO;
  const hooks = new Set(), calls = [];
  const palms = { R: new T.Vector3(-0.2, 1.1, 0), L: new T.Vector3(0.2, 1.1, 0) };
  const app = { roomGen: 1, REDUCED: reduced, onFrame: (fn) => hooks.add(fn), offFrame: (fn) => hooks.delete(fn) };
  const space = new T.Group();
  const rig = {
    handContactWorld: (side) => palms[side].clone(),
    play(app, name, options = {}) {
      let finish;
      const result = new Promise((resolve) => { finish = resolve; });
      const call = { name, options, finish,
        event(event, side, pos) {
          palms[side].copy(pos);
          options.on?.[event]?.(pos.clone(), { side, contactWorld: pos.clone() });
        },
      };
      calls.push(call);
      return result;
    },
    stop() {},
  };
  const motion = C.serviceMotion.create(app, rig, space);
  const frame = (time) => { now = time; for (const fn of [...hooks]) fn(); };
  return { T, C, hooks, app, space, rig, palms, calls, motion, frame };
}

const close = (actual, expected, message) => assert.ok(actual.distanceTo(expected) < 1e-8, message);

test('service paths are fixed valid palm paths and preserve the other hand', () => {
  const { C } = setup();
  for (const side of ['L', 'R']) for (const action of ['Pick', 'Pose', 'Place']) {
    const path = C.handPaths.PATHS['service' + action + side];
    assert.ok(path);
    assert.deepEqual([...C.handPaths.validatePath(path)], []);
    assert.equal(path.continuous, true);
    assert.equal(path.anchor, 'palm');
    assert.equal(path.grip, 'service');
    assert.ok(path.hands.L && path.hands.R, 'a held prop in the other hand must not drop to neutral');
  }
  assert.deepEqual([...C.handPaths.validatePath(C.handPaths.PATHS.serviceRest)], []);
});

test('pickup waits for contact then follows the actual palm through a rotated station', async () => {
  const { T, space, motion, calls, palms, frame } = setup();
  space.position.set(3, 0, -2); space.rotation.y = Math.PI / 2;
  const prop = new T.Group(); prop.position.set(0.25, 0.9, 0.1); space.add(prop);
  const original = prop.position.clone(), grip = new T.Vector3(0, 0.2, 0);
  const picked = motion.pick(prop, { grip: grip.toArray(), target: [0.25, 1.25, 0.1] });
  close(prop.position, original, 'prop stays on the counter before grab');
  const call = calls.at(-1), source = prop.localToWorld(grip.clone());
  close(new T.Vector3(...call.options.refs.shoe), source, 'shoe ref is the real prop grip');
  call.event('grab', 'R', source);
  close(prop.position, original, 'contact itself does not teleport the prop');
  palms.R.set(3.2, 1.25, -2.4); frame(500);
  close(prop.localToWorld(grip.clone()), palms.R, 'grip remains exactly on the moving palm');
  call.finish(); assert.equal(await picked, true);
  palms.R.y += 0.05; frame(600);
  close(prop.localToWorld(grip.clone()), palms.R, 'completed pickup retains the held prop');
  motion.cancel();
});

test('animate recomputes a tilted scaled grip after caller updates and keeps the base free', async () => {
  const { T, space, motion, calls, palms, frame } = setup();
  const prop = new T.Group(); prop.position.set(0, 1, 0); prop.scale.set(1.2, 0.9, 1); space.add(prop);
  const grip = new T.Vector3(0, 0.2, 0);
  const picked = motion.pick(prop, { grip: grip.toArray() });
  calls.at(-1).event('grab', 'R', prop.localToWorld(grip.clone()));
  calls.at(-1).finish(); await picked;
  const animated = motion.animate({ ms: 1000, onFrame: (t) => { prop.rotation.z = -Math.PI / 2 * t; } });
  frame(500);
  close(prop.localToWorld(grip.clone()), palms.R, 'tilting must not pull the neck out of the hand');
  frame(1000); assert.equal(await animated, true);
  assert.ok(Math.abs(prop.rotation.z + Math.PI / 2) < 1e-9);
  close(prop.localToWorld(grip.clone()), palms.R, 'final frame is aligned before resolution');
  motion.cancel();
});

test('place targets the prop base, releases before arm rest and settles without a release jump', async () => {
  const { T, space, motion, calls, palms, frame } = setup();
  const prop = new T.Group(); prop.position.set(0, 1, 0); prop.rotation.z = 0.2; space.add(prop);
  const grip = new T.Vector3(0, 0.15, 0);
  const picked = motion.pick(prop, { grip: grip.toArray() });
  calls.at(-1).event('grab', 'R', prop.localToWorld(grip.clone()));
  calls.at(-1).finish(); await picked;
  const placed = motion.place({ target: [0.3, 0.95, 0.1], ms: 900 });
  const call = calls.at(-1);
  const offset = grip.clone().applyQuaternion(prop.quaternion);
  const target = new T.Vector3(0.3, 0.95, 0.1);
  close(new T.Vector3(...call.options.refs.target), target.clone().add(offset), 'hand target includes transformed grip');
  const contact = target.clone().add(offset).add(new T.Vector3(0.004, 0.002, 0));
  palms.R.copy(contact); frame(500);
  const before = prop.position.clone(); call.event('release', 'R', contact);
  close(prop.position, before, 'release does not snap to the ideal target');
  palms.R.set(-0.2, 1.2, -0.1); frame(800); call.finish();
  assert.equal(await placed, true);
  close(prop.position, target, 'prop base rests at the requested surface');
  frame(900); close(prop.position, target, 'resting hand cannot drag the released prop');
  motion.cancel();
});

test('cancel resolves pending actions, stops tracking and makes subsequent actions inert', async () => {
  const { T, app, space, motion, calls, hooks, frame } = setup();
  const prop = new T.Group(); prop.position.set(0, 1, 0); space.add(prop);
  const pending = motion.pick(prop);
  const original = prop.position.clone(), call = calls.at(-1);
  motion.cancel();
  assert.equal(await pending, false);
  call.event('grab', 'R', new T.Vector3(5, 5, 5)); call.finish(); frame(1000);
  close(prop.position, original, 'late rig callbacks cannot resurrect a cancelled pickup');
  assert.equal(hooks.size, 0);
  assert.equal(await motion.pose({ target: [0, 1, 0] }), false);
  assert.equal(await motion.place({ target: [0, 1, 0] }), false);
  assert.equal(await motion.animate({ ms: 1, onFrame() { throw Error('must not execute'); } }), false);
  assert.equal(await motion.rest(), false);
  assert.equal(calls.length, 1);
  app.roomGen++;
});

test('room change interrupts an animation and releases controller frame hooks', async () => {
  const { app, motion, hooks, frame } = setup();
  let ticks = 0;
  const pending = motion.animate({ ms: 1000, onFrame: () => ticks++ });
  frame(200); const before = ticks;
  app.roomGen++; frame(300);
  assert.equal(await pending, false);
  assert.equal(ticks, before);
  assert.equal(hooks.size, 0);
});

test('room hook cancellation resolves an animation without needing another rendered frame', async () => {
  const { motion, hooks } = setup();
  const pending = motion.animate({ ms: 1000 });
  for (const hook of [...hooks]) hook.cancel();
  assert.equal(await pending, false);
  assert.equal(hooks.size, 0);
});

test('superseding a released placement cannot leave a stale settle dragging the prop', async () => {
  const { T, space, motion, calls, frame } = setup();
  const prop = new T.Group(); prop.position.set(0, 1, 0); space.add(prop);
  const picked = motion.pick(prop);
  calls.at(-1).event('grab', 'R', prop.position.clone()); calls.at(-1).finish(); await picked;
  const placed = motion.place({ target: [0.2, 1, 0] });
  calls.at(-1).event('release', 'R', new T.Vector3(0.18, 1, 0));
  const pose = motion.pose({ target: [0, 1.2, 0] });
  assert.equal(await placed, false);
  frame(300);
  close(prop.position, new T.Vector3(0.18, 1, 0), 'superseded settle stays cancelled');
  calls.at(-1).finish(); assert.equal(await pose, true);
  motion.cancel();
});

test('two-hand service preserves the first grip and superseded callbacks stay inert', async () => {
  const { T, space, motion, calls, palms, frame } = setup();
  const right = new T.Group(), left = new T.Group();
  right.position.set(-0.2, 1, 0); left.position.set(0.2, 1, 0); space.add(right, left);
  const pickedRight = motion.pick(right, { grip: [0, 0.1, 0] });
  calls.at(-1).event('grab', 'R', right.localToWorld(new T.Vector3(0, 0.1, 0)));
  calls.at(-1).finish(); await pickedRight;
  const pickedLeft = motion.pick(left, { side: 'L', grip: [0, 0.1, 0] });
  const leftCall = calls.at(-1);
  close(new T.Vector3(...leftCall.options.refs.rack), palms.R, 'the other palm is kept at its current position');
  leftCall.event('grab', 'L', left.localToWorld(new T.Vector3(0, 0.1, 0)));
  leftCall.finish(); await pickedLeft;
  frame(100);
  close(right.localToWorld(new T.Vector3(0, 0.1, 0)), palms.R);
  close(left.localToWorld(new T.Vector3(0, 0.1, 0)), palms.L);
  const firstPose = motion.pose({ target: [-0.2, 1.3, 0] });
  const oldCall = calls.at(-1);
  const latestPose = motion.pose({ side: 'L', target: [0.2, 1.3, 0] });
  assert.equal(await firstPose, false);
  oldCall.finish(); calls.at(-1).finish();
  assert.equal(await latestPose, true);
  motion.cancel();
});

test('reduced motion completes a rotated service sequence without event or frame waits', async () => {
  const { T, space, motion, hooks, calls } = setup({ reduced: true });
  space.position.set(2, 0, 3); space.rotation.y = 0.6;
  const prop = new T.Group(); prop.position.set(-0.2, 1, 0); space.add(prop);
  assert.equal(await motion.pick(prop, { grip: [0, 0.15, 0] }), true);
  assert.equal(await motion.pose({ target: [-0.1, 1.3, 0.1] }), true);
  assert.equal(await motion.animate({ ms: 1000, onFrame(t) { prop.rotation.z = t * 0.6; } }), true);
  const target = new T.Vector3(0.2, 1, 0.2);
  assert.equal(await motion.place({ target: target.toArray() }), true);
  close(prop.position, target);
  assert.equal(await motion.rest(), true);
  assert.equal(calls.length, 0);
  assert.equal(hooks.size, 0);
});

async function characterSetup({ fallback = false } = {}) {
  let now = 0;
  const context = vm.createContext({ console: { log() {}, warn() {}, error() {} },
    performance: { now: () => now }, AbortController, setTimeout, clearTimeout, TextDecoder, Blob,
    navigator: { userAgent: 'node' }, URL: { createObjectURL: () => 'blob:stub', revokeObjectURL() {} },
    createImageBitmap: async () => ({ width: 2, height: 2, close() {} }) });
  context.self = context;
  for (const file of ['vendor/three-0.149.0.min.js', 'vendor/three-addons-0.149.js',
    'src/engine/tween.js', 'src/engine/assets.js', 'src/engine/rig.js', 'src/engine/character.js',
    'src/logic/ik.js', 'src/logic/gestures.js', 'src/logic/hand-paths.js', 'src/engine/service-motion.js']) {
    vm.runInContext(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), context, { filename: file });
  }
  context.fetch = async url => {
    if (fallback) return { ok: false, status: 503 };
    const name = String(url).includes('dealer-clips') ? 'dealer-clips.glb' : 'dealer-characters.glb';
    context.bytes = readFileSync(new URL('../assets/' + name, import.meta.url));
    const buffer = vm.runInContext('Uint8Array.from(bytes).buffer', context);
    return { ok: true, arrayBuffer: async () => buffer };
  };
  const T = context.THREE, C = context.CASINO;
  await C.character.preload('./assets/');
  assert.equal(C.character.ready, fallback ? 'failed' : 'ready');
  const hooks = new Set();
  const app = { roomGen: 1, REDUCED: false, onFrame: f => hooks.add(f), offFrame: f => hooks.delete(f) };
  C.app = app;
  const space = new T.Group(), dealer = C.assets.makeDealer({ seed: 'service-reach' });
  dealer.position.z = -0.4; space.add(dealer);
  const rig = dealer.userData.rig;
  rig.setIdle?.(app);
  const idleHooks = hooks.size;
  const tick = ms => { now = ms; for (const f of [...hooks]) f(1 / 60, ms / 1000); };
  return { T, C, app, space, rig, hooks, tick, idleHooks };
}

for (const fallback of [false, true]) test(`${fallback ? 'procedural' : 'GLB'} service reaches props, holds them and releases frame hooks`, async () => {
  const { T, C, app, space, rig, hooks, tick, idleHooks } = await characterSetup({ fallback });
  const motion = C.serviceMotion.create(app, rig, space);
  const props = [
    { side: 'R', base: [-0.28, 0.96, -0.04], grip: [0, 0.15, 0], destination: [-0.2, 1.31, 0.035] },
    { side: 'L', base: [0.065, 0.977, 0.08], grip: [0, 0.058, 0], destination: [0.2, 1.19, 0.18] },
  ];
  let time = 0;
  for (const spec of props) {
    const prop = new T.Group(); prop.position.set(...spec.base); space.add(prop);
    const grip = new T.Vector3(...spec.grip), source = prop.localToWorld(grip.clone());
    const picked = motion.pick(prop, { side: spec.side, grip: spec.grip, target: spec.destination, ms: 900 });
    for (let dt = 0; dt < 378; dt += 14) tick(time + dt);
    tick(time + 378);
    const error = rig.handContactWorld(spec.side).distanceTo(source);
    assert.ok(error < 0.012, `${spec.side} pickup contact error ${error.toFixed(4)}m`);
    for (let dt = 392; dt <= 896; dt += 14) tick(time + dt);
    tick(time + 900); assert.equal(await picked, true);
    close(prop.localToWorld(grip.clone()), rig.handContactWorld(spec.side), 'tracking runs after the rig frame');
    time += 900;
    const placed = motion.place({ side: spec.side, target: spec.base, ms: 900 });
    for (let dt = 14; dt <= 896; dt += 14) tick(time + dt);
    tick(time + 900); assert.equal(await placed, true);
    close(prop.position, new T.Vector3(...spec.base));
    time += 900;
  }
  const resting = motion.rest();
  for (let dt = 16; dt < 600; dt += 16) tick(time + dt);
  tick(time + 600); assert.equal(await resting, true);
  motion.cancel(); rig.stop(); tick(time + 616);
  assert.equal(hooks.size, idleHooks, 'service drive hooks are released; idle animation stays owned by the actor');
});

test('GLB service fingers hold their grip through pouring, then clear on rest and cancel', async () => {
  const { T, C, app, space, rig, tick } = await characterSetup();
  const fingers = ['index_02_r', 'middle_02_r', 'ring_02_r', 'pinky_02_r', 'thumb_02_r']
    .map(name => space.getObjectByName(name));
  assert.ok(fingers.every(Boolean));
  tick(0);
  const relaxed = fingers.map(bone => bone.quaternion.clone());
  const snapshot = () => fingers.map(bone => bone.quaternion.clone());
  const same = (expected, label) => fingers.forEach((bone, i) => {
    assert.ok(bone.quaternion.angleTo(expected[i]) < 1e-7, label + ': ' + bone.name);
  });
  const motion = C.serviceMotion.create(app, rig, space);
  const prop = new T.Group(); prop.position.set(-0.28, 0.977, 0.025); space.add(prop);
  const picked = motion.pick(prop, { grip: [0, 0.15, 0] });
  tick(378);
  const gripping = snapshot();
  assert.ok(gripping[0].angleTo(relaxed[0]) > 0.15, 'service index must visibly curl beyond relaxed');
  tick(900); assert.equal(await picked, true);
  same(gripping, 'completed pickup retains finger grip');
  const posed = motion.pose({ target: [-0.075, 1.29, 0.08] });
  tick(1500); assert.equal(await posed, true);
  const pouring = motion.animate({ ms: 1000, onFrame(t) { prop.rotation.z = -1.67 * t; } });
  for (const ms of [1516, 1800, 2100, 2500]) { tick(ms); same(gripping, 'animate retains service grip'); }
  assert.equal(await pouring, true);
  const resting = motion.rest();
  tick(3100); assert.equal(await resting, true); same(relaxed, 'rest clears service grip');
  const posedAgain = motion.pose({ target: [-0.2, 1.2, 0] });
  tick(3700); assert.equal(await posedAgain, true); same(gripping, 'service pose reinstates grip');
  motion.cancel(); tick(3716); same(relaxed, 'cancel clears service grip');
  const card = rig.play(app, 'baccaratCollect', { refs: {
    shoe: [-0.25, 1.1, -0.05], target: [-0.15, 1.1, 0.05],
  } });
  tick(4136);
  assert.ok(fingers[0].quaternion.angleTo(gripping[0]) > 0.2, 'baccarat uses its card grip after service');
  tick(5116); await card;
});

test('service workstation reachable-point audit', async () => {
  for (const fallback of [false, true]) {
    const { T, C, app, space, rig, tick } = await characterSetup({ fallback });
    const points = [
      ['bottle', 'R', [-0.28, 1.127, 0.025]], ['pour', 'R', [-0.075, 1.29, 0.08]],
      ['bitters', 'R', [-0.46, 1.055, 0]], ['spoon', 'L', [0.35, 1.147, -0.045]],
      ['garnish', 'L', [0.33, 1.014, -0.015]], ['glass', 'L', [0.065, 1.035, 0.08]],
      ['present', 'L', [0.2, 1.19, 0.18]], ['packet', 'R', [-0.1, 1.014, 0.1]],
      ['shaker', 'R', [-0.39, 1.052, 0.085]], ['carry', 'R', [-0.19, 1.14, 0.08]],
      ['shakeLow', 'R', [-0.04, 1.26, 0.015]], ['shakeHigh', 'R', [-0.09, 1.35, -0.065]],
      ['shakeSupport', 'L', [0.14, 1.21, -0.13]],
      ['feed', 'R', [-0.38, 1.145, -0.173]], ['cashout', 'R', [-0.38, 1.054, 0.007]],
      ['chips', 'L', [0.38, 1.078, 0.08]],
    ];
    let time = 0;
    for (const [label, side, point] of points) {
      const prop = new T.Group(); prop.position.set(...point); space.add(prop);
      const motion = C.serviceMotion.create(app, rig, space);
      const picked = motion.pick(prop, { side, target: point, ms: 900 });
      for (let dt = 0; dt < 378; dt += 14) tick(time + dt);
      tick(time + 378);
      const error = rig.handContactWorld(side).distanceTo(new T.Vector3(...point));
      assert.ok(error < 0.012, `${fallback ? 'fallback' : 'GLB'} ${label} palm misses by ${error.toFixed(4)}m`);
      motion.cancel(); assert.equal(await picked, false); time += 1000; tick(time);
    }
  }
});
