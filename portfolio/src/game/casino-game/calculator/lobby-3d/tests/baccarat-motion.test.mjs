import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
await import('../src/logic/layouts.js');
await import('../src/logic/hand-paths.js');
await import('../src/floor/baccarat-motion.js');
const C = globalThis.CASINO;
globalThis.THREE = { Vector3: class {
  constructor(x, y, z) { Object.assign(this, { x, y, z }); }
  toArray() { return [this.x, this.y, this.z]; }
} };

test('baccarat routes every displayed slot through a reachable service point and reveals in hand', async () => {
  const app = { roomGen: 1, REDUCED: false };
  const table = { userData: { dealerRig: {} }, localToWorld: p => ({ toArray: () => [4 + p.z, p.y, 7 - p.x] }) };
  let flips = 0;
  const calls = [];
  C.cards = { async dealCardWithDealer(a, rig, mesh, from, to, options) {
    calls.push({ from, to, options, rotationAtShoe: { ...mesh.rotation } });
    options.onTransfer(); options.onTransfer();
  } };
  for (const hand of ['player', 'banker']) for (let index = 0; index < 3; index++) {
    const mesh = { rotation: { set(x, y, z) { Object.assign(this, { x, y, z }); } }, userData: { flip: () => { flips++; } } };
    await C.baccaratMotion.deal(app, table, mesh, { hand, index, pos: C.layouts.baccarat[hand + 'Slots'][index], sideways: index === 2 });
  }
  assert.equal(flips, 6, 'each card exposed once at handoff');
  assert.equal(new Set(calls.map(c => JSON.stringify(c.options.rigTarget))).size, 1, 'outboard cards never stretch either arm across the body');
  for (const call of calls) {
    assert.equal(call.options.action, 'baccaratDeal');
    assert.equal(call.rotationAtShoe.z, 0, 'third cards leave shoe straight');
    assert.equal(call.rotationAtShoe.y, Math.PI, 'shoe card starts face down');
    assert.ok(call.options.gestureMs >= 1500, 'deliberate two-hand cadence');
    assert.deepEqual(call.options.rigTarget, [4 + C.baccaratMotion.RELEASE[2], C.baccaratMotion.RELEASE[1], 7 - C.baccaratMotion.RELEASE[0]]);
    assert.notDeepEqual(call.options.rigTarget, call.to, 'display slot and reachable hand release are distinct');
  }
  assert.equal(calls[2].options.rotationZ, Math.PI / 2);
  assert.equal(calls[5].options.rotationZ, Math.PI / 2);
});

test('reduced-motion baccarat still lays exposed cards and stale transfer cannot flip disposed cards', async () => {
  const app = { roomGen: 1, REDUCED: true };
  const table = { userData: { dealerRig: {} }, localToWorld: p => p };
  let transfer, flips = 0;
  C.cards = { async dealCardWithDealer(a, r, m, f, t, options) { transfer = options.onTransfer; } };
  const mesh = { rotation: { set(x, y, z) { Object.assign(this, { x, y, z }); } }, userData: { flip: () => { flips++; } } };
  await C.baccaratMotion.deal(app, table, mesh, { hand: 'player', pos: C.layouts.baccarat.playerSlots[0] });
  assert.equal(mesh.rotation.y, 0);
  app.roomGen++;
  transfer();
  assert.equal(flips, 0);
});

function sceneHarness() {
  const context = vm.createContext({ console });
  vm.runInContext(readFileSync(new URL('../vendor/three-0.149.0.min.js', import.meta.url), 'utf8'), context);
  const T = globalThis.THREE = context.THREE;
  const scene = new T.Scene(), table = new T.Group(), played = [];
  scene.add(table); table.position.set(5, 0, -3); table.rotation.y = Math.PI / 2;
  table.userData.dealerRig = { play: async (app, name) => { played.push(name); } };
  const app = { roomGen: 1, scene };
  return { T, app, table, played };
}

test('baccarat collection carries one packet to the rotated table discard and detaches its cards', async () => {
  const h = sceneHarness(), dealt = [];
  for (let i = 0; i < 6; i++) { const card = new h.T.Group(); card.position.set(i * 0.1, 0.823, 0); h.app.scene.add(card); dealt.push(card); }
  let carried = 0;
  C.cards = {
    async dealCardTo(app, mesh, from, to) { mesh.position.set(...to); },
    async dealCardWithDealer(app, rig, packet, from, to, opts) {
      assert.equal(opts.action, 'baccaratCollect');
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(packet.children.length, 6);
      carried++; packet.position.set(...to);
    },
  };
  await C.baccaratMotion.collect(h.app, h.table, dealt);
  assert.equal(carried, 1);
  const destination = h.table.localToWorld(new h.T.Vector3(...C.layouts.baccarat.discardPos));
  for (const card of dealt) {
    assert.equal(card.parent, h.app.scene);
    assert.ok(Math.abs(card.position.x - destination.x) < 1e-7);
    assert.ok(Math.abs(card.position.z - destination.z) < 1e-7);
  }
  assert.equal(h.app.scene.children.length, 7, 'temporary packet removed');
  assert.deepEqual(h.played, ['baccaratRest']);
});

test('room cancellation during collection does not restore old cards or start another pose', async () => {
  const h = sceneHarness(), card = new h.T.Group(); h.app.scene.add(card);
  C.cards = {
    async dealCardTo(app, mesh, from, to) { mesh.position.set(...to); },
    async dealCardWithDealer(app) { await new Promise(resolve => setImmediate(resolve)); app.roomGen++; },
  };
  await C.baccaratMotion.collect(h.app, h.table, [card]);
  assert.notEqual(card.parent, h.app.scene, 'old card is not resurrected in scene');
  assert.deepEqual(h.played, []);
  assert.equal(h.app.scene.children.length, 1);
});

test('baccarat Banker payout accounts for commission and cancels without a later gesture', async () => {
  const h = sceneHarness(), stake = new h.T.Group();
  stake.position.set(0.5, 0.825, 0.4); h.table.add(stake);
  C.chips = {
    CHIP_H: 0.005,
    makeChip(value) { const chip = new h.T.Group(); chip.userData.value = value; return chip; },
    async slideStack(app, mesh, to) { mesh.position.set(...to); },
  };
  const paid = await C.baccaratMotion.settle(h.app, h.table, stake, true, 475);
  assert.equal(paid.children.reduce((sum, chip) => sum + chip.userData.value, 0), 475);
  assert.equal(paid.position.x, 0.565);
  assert.equal(stake.position.x, 0.5, 'original stake remains in place');
  h.played.length = 0;
  C.chips.slideStack = async app => { app.roomGen++; };
  assert.equal(await C.baccaratMotion.settle(h.app, h.table, stake, false, 0), null);
  assert.deepEqual(h.played, [], 'no rig action after canceled slide');
});
