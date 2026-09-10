import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function fixture() {
  let time = 0;
  const hooks = new Set();
  const app = { roomGen: 1, REDUCED: false, onFrame: fn => hooks.add(fn), offFrame: fn => hooks.delete(fn) };
  const context = vm.createContext({ console: { warn() {} }, performance: { now: () => time }, AbortController, setTimeout, clearTimeout,
    fetch: async () => ({ ok: false, status: 503 }) });
  for (const file of ['vendor/three-0.149.0.min.js', 'src/logic/gestures.js', 'src/logic/ik.js', 'src/logic/hand-paths.js',
    'src/engine/tween.js', 'src/engine/assets.js', 'src/engine/rig.js', 'src/engine/character.js']) {
    vm.runInContext(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), context);
  }
  context.CASINO.app = app;
  return { app, context, hooks, tick(ms) { time = ms; for (const fn of [...hooks]) fn(1 / 60, ms / 1000); } };
}

test('asset failure keeps a complete clothed dealer with five digits on each hand', async () => {
  const { context } = fixture();
  await context.CASINO.character.preload();
  assert.equal(context.CASINO.character.ready, 'failed');
  const dealer = context.CASINO.assets.makeDealer({ seed: 'fallback' });
  assert.ok(dealer.getObjectByName('TailoredJacket'));
  assert.ok(dealer.getObjectByName('Nose'));
  for (const side of ['L', 'R']) {
    const wrist = dealer.userData.rig.joints['wrist' + side];
    const digits = wrist.children.filter(child => /^(Finger[0-3]|Thumb)/.test(child.name));
    assert.equal(digits.length, 5);
    const hand = dealer.userData.rig.handContactWorld(side);
    assert.ok(hand.y > 1.0 && hand.z > 0.15, 'fallback hands should rest in front above table height');
  }
});

test('fallback dealing reaches its shoe with a palm-down hand and delivers grab/release metadata', async () => {
  const { app, context, tick, hooks } = fixture();
  await context.CASINO.character.preload();
  const dealer = context.CASINO.assets.makeDealer({ seed: 'fallback-path' });
  const rig = dealer.userData.rig;
  const shoe = [0.23, 1.03, 0.26];
  const events = [];
  const p = rig.play(app, 'dealCard', { refs: { shoe, target: [-0.02, 1.03, 0.4] },
    on: { grab: (_w, meta) => events.push(['grab', meta]), release: (_w, meta) => events.push(['release', meta]) } });
  const path = context.CASINO.handPaths.PATHS.dealCard;
  tick(path.dur * 0.30);
  assert.equal(events.length, 1, 'fallback must deliver shoe pickup, not silently skip events');
  assert.equal(events[0][1].side, 'L');
  const contact = events[0][1].contactWorld;
  assert.ok(contact.distanceTo(new context.THREE.Vector3(...shoe)) < 0.012, 'palm physically touches the shoe');
  const palm = new context.THREE.Vector3(0, -1, 0).applyQuaternion(rig.joints.wristL.getWorldQuaternion(new context.THREE.Quaternion()));
  assert.ok(palm.y < -0.97);
  tick(path.dur * 0.74);
  assert.deepEqual(events.map(e => e[0]), ['grab', 'release']);
  tick(path.dur); await p;
  rig.stop('arms'); tick(path.dur + 16);
  assert.equal(hooks.size, 0, 'finished/cancelled fallback hand actions release hooks');
});

test('fallback sleeves have outward-facing surfaces and the dealer can walk to a world-space station', async () => {
  const { app, context, tick, hooks } = fixture();
  await context.CASINO.character.preload();
  const dealer = context.CASINO.assets.makeDealer({ seed: 'fallback-walk' });
  dealer.position.set(3, 0, -2); dealer.rotation.y = Math.PI / 2;
  const sleeve = dealer.getObjectByName('JacketSleeveL').geometry;
  const normals = sleeve.attributes.normal;
  assert.ok(normals.getX(0) > 0.8, 'sleeve winding must expose its outer surface');
  const rig = dealer.userData.rig;
  const destination = [3.6, 0, -2.2];
  const p = rig.walkTo(app, destination, { ms: 800 });
  tick(300);
  assert.ok(Math.abs(rig.joints.hipL.rotation.x) > 0.05, 'fallback walks with articulated legs');
  tick(800); await p;
  const origin = rig.joints.spine.parent.getWorldPosition(new context.THREE.Vector3());
  assert.ok(origin.distanceTo(new context.THREE.Vector3(...destination)) < 1e-6);
  assert.equal(hooks.size, 0);
});
