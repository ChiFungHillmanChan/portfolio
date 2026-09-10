import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/layouts.js');
globalThis.CASINO.assets = {};
await import('../src/engine/cards.js');
const C = globalThis.CASINO;

test('a released card slides monotonically, stays near the felt and stops without rebound', () => {
  assert.equal(typeof C.cards.sampleCardSlide, 'function');
  const from = [0.4, 0.87, 0.2], to = [-0.5, 0.833, 0.8];
  let lastDistance = Infinity;
  for (let i = 0; i <= 100; i++) {
    const p = C.cards.sampleCardSlide(from, to, i / 100);
    const distance = Math.hypot(p[0] - to[0], p[2] - to[2]);
    assert.ok(distance <= lastDistance + 1e-9, 'no overshoot or backward correction');
    assert.ok(p[1] >= to[1] && p[1] <= from[1] + 0.006, 'no airborne arc');
    if (i >= 35) assert.ok(p[1] - to[1] < 0.001, 'slide contacts felt early');
    lastDistance = distance;
  }
  assert.deepEqual(C.cards.sampleCardSlide(from, to, 1), to);
  assert.deepEqual(C.cards.sampleCardSlide(from, to, 2), to);
});

function harness() {
  const hooks = new Set(), added = [];
  const app = {
    roomGen: 1, REDUCED: false,
    scene: { add: (mesh) => { added.push(mesh); } },
    onFrame: (f) => hooks.add(f), offFrame: (f) => hooks.delete(f),
  };
  const mesh = {
    position: { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } },
    rotation: { z: 0 }, userData: {}, visible: true,
  };
  return { app, mesh, hooks, added, frame: () => [...hooks].forEach((f) => f()) };
}

test('card is present at the shoe, follows the contacting palm, then releases and waits for recovery', async () => {
  assert.equal(typeof C.cards.dealCardWithDealer, 'function');
  const h = harness();
  let now = 0, events, finishPlay, finished = false;
  const timer = mock.method(performance, 'now', () => now);
  let contact = { x: 0.5, y: 0.855, z: 0.25 };
  const rig = {
    play(app, name, options) {
      events = options.on;
      return new Promise((resolve) => { finishPlay = resolve; });
    },
    handContactWorld: () => contact,
  };
  try {
    const done = C.cards.dealCardWithDealer(h.app, rig, h.mesh, [0.6, 0.855, 0.2], [-0.3, 0.833, 0.7], { ms: 300 });
    done.then(() => { finished = true; });
    assert.equal(h.added.length, 1, 'card already sits in the shoe mouth');
    assert.equal(h.mesh.position.x, 0.6);
    events.grab(contact, { side: 'L', contactWorld: contact });
    contact = { x: 0.2, y: 0.85, z: 0.4 };
    h.frame();
    assert.equal(h.mesh.position.x, 0.2, 'held card follows the actual palm');
    events.release(contact, { side: 'L', contactWorld: contact });
    now = 350; h.frame();
    await Promise.resolve();
    assert.equal(h.mesh.position.x, -0.3);
    assert.equal(h.mesh.position.y, 0.833);
    assert.equal(finished, false, 'next card waits until the dealer recovers');
    finishPlay(); await done;
    assert.equal(h.hooks.size, 0);
  } finally { timer.mock.restore(); }
});

test('cancelled room stops a held card without launching a fallback into the new room', async () => {
  assert.equal(typeof C.cards.dealCardWithDealer, 'function');
  const h = harness();
  let finishPlay;
  const rig = { play: () => new Promise((r) => { finishPlay = r; }) };
  const done = C.cards.dealCardWithDealer(h.app, rig, h.mesh, [0, 0.86, 0], [1, 0.833, 0.5]);
  h.app.roomGen++; h.frame(); finishPlay();
  await done;
  assert.equal(h.mesh.position.x, 0);
  assert.equal(h.hooks.size, 0);
});

test('cancelling a deal in the same room prevents late grab/release and fallback motion', async () => {
  const h = harness();
  let finishPlay, events;
  const rig = { play(app, name, options) {
    events = options.on;
    return new Promise((r) => { finishPlay = r; });
  } };
  const done = C.cards.dealCardWithDealer(h.app, rig, h.mesh, [0, 0.86, 0], [1, 0.833, 0.5]);
  const tracking = [...h.hooks][0];
  tracking.cancel();
  events.grab({ x: 0.4, y: 0.85, z: 0.3 });
  events.release({ x: 0.6, y: 0.85, z: 0.4 });
  finishPlay(); await done;
  assert.equal(h.mesh.position.x, 0, 'disposed card cannot be moved by a late event');
  assert.equal(h.hooks.size, 0, 'no fallback animation was added');
});

test('disposing a released card cancels its slide before the next frame', async () => {
  const h = harness();
  let now = 0, finishPlay, events;
  const timer = mock.method(performance, 'now', () => now);
  const rig = { play(app, name, options) {
    events = options.on; return new Promise((r) => { finishPlay = r; });
  } };
  try {
    const done = C.cards.dealCardWithDealer(h.app, rig, h.mesh, [0, 0.86, 0], [1, 0.833, 0.5]);
    events.release({ x: 0.2, y: 0.85, z: 0.1 });
    assert.equal(typeof h.mesh.userData.cancelCardDeal, 'function');
    h.mesh.userData.cancelCardDeal();
    now = 500; h.frame(); finishPlay(); await done;
    assert.equal(h.mesh.position.x, 0.2);
    assert.equal(h.hooks.size, 0);
  } finally { timer.mock.restore(); }
});

test('a held card samples the current frame palm after the procedural rig updates', async () => {
  const h = harness();
  let events, finishPlay;
  const contact = { x: 0, y: 0.85, z: 0.2 };
  const updatePalm = () => { contact.x += 0.04; };
  const rig = {
    handContactWorld: () => contact,
    play(app, name, opts) {
      events = opts.on;
      app.onFrame(updatePalm);
      return new Promise((r) => { finishPlay = r; });
    },
  };
  const done = C.cards.dealCardWithDealer(h.app, rig, h.mesh, [0, 0.85, 0.2], [1, 0.833, 0.5]);
  events.grab(contact);
  h.frame();
  const x = h.mesh.position.x;
  h.mesh.userData.cancelCardDeal(); h.app.offFrame(updatePalm); finishPlay(); await done;
  assert.equal(x, 0.04, 'card must stay on palm rather than trail by one frame');
});

test('baccarat handoff preserves card position and transfers grip before releasing', async () => {
  const h = harness();
  let now = 0, events, finishPlay, action, transferCount = 0;
  const timer = mock.method(performance, 'now', () => now);
  const palms = { L: { x: 0.045, y: 0.945, z: -0.29 }, R: { x: -0.045, y: 0.945, z: -0.29 } };
  const rig = {
    handContactWorld: (side) => palms[side],
    play(app, name, options) { action = name; events = options.on; return new Promise(r => { finishPlay = r; }); },
  };
  try {
    const done = C.cards.dealCardWithDealer(h.app, rig, h.mesh, [0.49, 0.848, -0.45], [-0.45, 0.823, -0.14], {
      action: 'baccaratDeal', refs: { rack: [0, 0.945, -0.29] },
      onTransfer: () => { transferCount++; }, rotationZ: Math.PI / 2, fromRotationZ: 0, ms: 400,
    });
    assert.equal(action, 'baccaratDeal');
    events.grab(palms.L, { side: 'L', contactWorld: palms.L }); h.frame();
    events.contact(palms.R, { side: 'R', contactWorld: palms.R }); h.frame();
    assert.equal(h.mesh.position.x, palms.L.x, 'grip change must not teleport card between hands');
    now = 160; h.frame();
    assert.equal(h.mesh.position.x, palms.R.x, 'receiving hand now owns card');
    assert.equal(transferCount, 1);
    events.release(palms.R, { side: 'R', contactWorld: palms.R });
    assert.equal(h.mesh.rotation.z, 0, 'third card turns sideways during slide, not in the shoe');
    now = 600; h.frame(); finishPlay(); await done;
    assert.equal(h.mesh.rotation.z, Math.PI / 2);
    assert.equal(h.mesh.position.x, -0.45);
    assert.equal(h.hooks.size, 0);
  } finally { timer.mock.restore(); }
});
