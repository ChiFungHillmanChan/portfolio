import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function setup() {
  let now = 0;
  const ctx = vm.createContext({ CASINO: { assets: {} }, performance: { now: () => now } });
  vm.runInContext(readFileSync(new URL('../vendor/three-0.149.0.min.js', import.meta.url), 'utf8'), ctx);
  vm.runInContext(readFileSync(new URL('../src/engine/chips3d.js', import.meta.url), 'utf8'), ctx);
  const hooks = new Set();
  const app = { roomGen: 1, REDUCED: false, onFrame: (fn) => hooks.add(fn), offFrame: (fn) => hooks.delete(fn) };
  return { C: ctx.CASINO, THREE: ctx.THREE, app, hooks, tick(t) { now = t; [...hooks].forEach((fn) => fn()); } };
}

test('chip stack slides in the felt plane, decelerates and keeps its shape', async () => {
  const { C, THREE, app, tick, hooks } = setup();
  const stack = new THREE.Group(); stack.position.set(0, 0.845, 0);
  const slide = C.chips.slideStack(app, stack, [1, 0.845, 0.5], { ms: 1000 });
  tick(250); const x1 = stack.position.x;
  assert.equal(stack.position.y, 0.845, 'no airborne arc');
  tick(500); const x2 = stack.position.x;
  tick(750); const x3 = stack.position.x;
  assert.ok(x1 > 0 && x1 < x2 && x2 < x3 && x3 < 1);
  assert.ok(x3 - x2 < x2 - x1, 'decelerates under surface friction');
  assert.deepEqual([...stack.scale.toArray()], [1, 1, 1]);
  tick(1000); assert.equal(await slide, true);
  assert.deepEqual([...stack.position.toArray()], [1, 0.845, 0.5]);
  assert.equal(hooks.size, 0);
});

test('superseding, cancellation and room change settle every chip animation promise', async () => {
  const { C, THREE, app, tick, hooks } = setup();
  const stack = new THREE.Group();
  const first = C.chips.slideStack(app, stack, [1, 0, 0]);
  tick(80);
  const next = C.chips.slideStack(app, stack, [-1, 0, 0]);
  assert.equal(await first, false);
  next.cancel(); assert.equal(await next, false); assert.equal(hooks.size, 0);
  const third = C.chips.slideStack(app, stack, [0, 0, 0]);
  app.roomGen++; tick(100);
  assert.equal(await third, false); assert.equal(hooks.size, 0);
});

test('reduced motion lands exactly once with no frame hooks', async () => {
  const { C, THREE, app, hooks } = setup();
  app.REDUCED = true;
  let count = 0;
  const stack = new THREE.Group();
  const slide = C.chips.slideStack(app, stack, [1, 2, 3], { onDone: () => count++ });
  assert.equal(await slide, true); assert.equal(count, 1);
  assert.deepEqual([...stack.position.toArray()], [1, 2, 3]); assert.equal(hooks.size, 0);
});

test('leaving during a payout disposes wager and payout meshes and resolves settlement', async () => {
  const { C, THREE, app, tick, hooks } = setup();
  C.assets.canvasTexture = () => new THREE.Texture();
  C.layouts = { chipBreakdown: () => [100, 100] };
  app.scene = new THREE.Scene();
  const bets = C.chips.createBetStacks(app, {
    getSpotPos: () => [0, 0.84, 0.5], source: [0, 0.84, 1], dealerPos: [0, 0.84, 0],
  });
  bets.add('main', 100); tick(400);
  const settlement = bets.settle('main', 'win', 200);
  assert.equal(app.scene.children.length, 3);
  bets.disposeAll();
  await settlement;
  assert.equal(app.scene.children.length, 0);
  assert.equal(hooks.size, 0);
});
