import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function setup({ motionFactory } = {}) {
  const ctx = vm.createContext({ console, performance: { now: () => 0 } });
  const run = (file) => vm.runInContext(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), ctx);
  run('vendor/three-0.149.0.min.js');
  const T = ctx.THREE;
  const app = { roomGen: 1, REDUCED: true, onFrame() {}, offFrame() {} };
  let dealerOptions;
  const C = ctx.CASINO = { app, assets: {
    canvasTexture: () => new T.Texture(),
    woodMaterial: () => new T.MeshStandardMaterial(),
    goldMaterial: () => new T.MeshStandardMaterial(),
    makeDealer: (opts) => {
      dealerOptions = opts;
      const g = new T.Group();
      g.userData.idle = () => {};
      g.userData.rig = { play: async () => {}, stop() {}, lookAt() {} };
      return g;
    },
  } };
  if (motionFactory) C.serviceMotion = { create: motionFactory };
  run('src/logic/layouts.js');
  run('src/logic/hand-paths.js');
  if (!motionFactory) run('src/engine/service-motion.js');
  run('src/engine/chips3d.js');
  run('src/floor/cashier.js');
  const station = C.floor.buildCashierStation({ app, standalone: true });
  station.updateMatrixWorld(true);
  return { T, C, app, station, dealerOptions };
}

test('cashier has an open face window and a reachable service counter', () => {
  const { T, station, dealerOptions } = setup();
  assert.equal(dealerOptions.walkIn, undefined);
  const teller = station.getObjectByName('cashier-attendant');
  assert.ok(teller);
  assert.ok(teller.position.z < -0.3);
  const top = new T.Box3().setFromObject(station.getObjectByName('cashier-countertop'));
  assert.ok(top.max.y <= 1, 'counter allows arms to reach without shoulder elevation');
  assert.ok(top.min.z > teller.position.z + 0.25, 'counter clears the torso');
  const bars = station.children.filter((child) => /cashier-window/.test(child.name));
  const ray = new T.Raycaster(new T.Vector3(0, 1.55, 2), new T.Vector3(0, 0, -1));
  assert.equal(ray.intersectObjects(bars, true).length, 0, 'no grille through the attendant face');
});

test('cashier models cash counting, real chip storage, and interior equipment', () => {
  const { station } = setup();
  for (const name of ['cashier-note-counter', 'cashier-counter-feed', 'cashier-counter-output',
    'cashier-chip-bank', 'cashier-service-tray', 'cashier-receipt-printer', 'cashier-monitor',
    'cashier-safe', 'cashier-cash-drawer', 'cashier-ledger-sign']) {
    assert.ok(station.getObjectByName(name), name + ' is visible geometry');
  }
  assert.equal(station.getObjectByName('cashier-counter-roller-0').geometry.type, 'CylinderGeometry');
  const service = station.userData.service;
  assert.equal(service.busy, false);
  assert.equal(typeof service.demo, 'function');
  assert.equal(typeof service.dispose, 'function');
});

test('cashier output represents the transaction amount and separates chips from cash', async () => {
  const { station } = setup();
  const service = station.userData.service;
  assert.equal(await service.demo('buyIn', 475), true);
  assert.equal(service.status, 'Chips ready · 475 credits');
  assert.equal(service.busy, false);
  const tray = station.getObjectByName('cashier-service-tray');
  assert.equal(tray.userData.kind, 'chips');
  assert.equal(tray.userData.amount, 475);
  assert.equal(tray.userData.chipValues.reduce((sum, value) => sum + value, 0), 475);
  assert.equal(await service.demo('cashOut', 1250.5), true);
  assert.equal(tray.userData.kind, 'cash');
  assert.equal(tray.userData.amount, 1250.5);
  assert.equal(tray.userData.noteValues.reduce((sum, value) => sum + value, 0), 1250.5);
  assert.equal(service.status, 'Cash ready · 1,250.5 credits');
});

test('invalid or disposed cashier work cannot mutate the completed presentation', async () => {
  const { station } = setup();
  const service = station.userData.service;
  await service.demo('buyIn', 100);
  const tray = station.getObjectByName('cashier-service-tray');
  for (const amount of [0, -1, NaN, Infinity]) assert.equal(await service.demo('buyIn', amount), false);
  assert.equal(await service.demo('other', 500), false);
  assert.equal(tray.userData.amount, 100);
  service.dispose();
  assert.equal(await service.demo('cashOut', 500), false);
  assert.equal(service.busy, false);
});

test('disposing during service blocks late animation continuation and concurrent transactions', async () => {
  let resume;
  let picks = 0;
  const { station } = setup({ motionFactory: () => ({
    animate: () => new Promise((resolve) => { resume = resolve; }),
    pick: async () => { picks++; return true; },
    place: async () => true,
    rest: async () => true,
    cancel() {},
  }) });
  const service = station.userData.service;
  const pending = service.demo('buyIn', 1000);
  assert.equal(service.busy, true);
  assert.equal(await service.demo('cashOut', 500), false, 'never interleave two teller transactions');
  service.dispose();
  resume(true); // A late hook may still resolve after a room transition.
  assert.equal(await pending, false);
  assert.equal(picks, 0, 'the teller cannot create or pick a new prop after disposal');
  assert.equal(service.status, 'Closed');
  assert.equal(service.busy, false);
});

test('cashier pickups and placements meet the actual dressed character palms within 1 cm', async () => {
  let now = 0;
  const ctx = vm.createContext({ console, performance: { now: () => now }, TextDecoder, Blob,
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    createImageBitmap: async () => ({ width: 2, height: 2, close() {} }),
    setTimeout, clearTimeout, AbortController, navigator: { userAgent: 'node-test' },
  });
  ctx.self = ctx;
  const run = (file) => vm.runInContext(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), ctx);
  for (const file of ['vendor/three-0.149.0.min.js', 'vendor/three-addons-0.149.js',
    'src/engine/tween.js', 'src/engine/assets.js', 'src/engine/rig.js', 'src/engine/character.js',
    'src/logic/ik.js', 'src/logic/layouts.js', 'src/logic/hand-paths.js', 'src/engine/chips3d.js',
    'src/engine/service-motion.js', 'src/floor/cashier.js']) run(file);
  ctx.fetch = async (url) => {
    if (String(url).startsWith('blob:')) return { ok: true, blob: async () => new Blob() };
    const file = String(url).includes('dealer-clips') ? 'dealer-clips.glb' : 'dealer-characters.glb';
    ctx.bytes = readFileSync(new URL('../assets/' + file, import.meta.url));
    const arrayBuffer = vm.runInContext('Uint8Array.from(bytes).buffer', ctx);
    delete ctx.bytes;
    return { ok: true, arrayBuffer: async () => arrayBuffer };
  };
  const T = ctx.THREE, C = ctx.CASINO;
  await C.character.preload('./assets/');
  assert.equal(C.character.ready, 'ready');
  const hooks = new Set(), contacts = [];
  const app = C.app = { REDUCED: false, roomGen: 1,
    onFrame: (fn) => hooks.add(fn), offFrame: (fn) => hooks.delete(fn) };
  C.assets.canvasTexture = () => new T.Texture();
  C.assets.woodMaterial = (color) => new T.MeshStandardMaterial({ color });
  C.assets.makeDealer = (options) => {
    const group = new T.Group();
    C.character.attach(app, group, options, (rig) => {
      const play = rig.play;
      rig.play = (a, name, opts = {}) => play(a, name, { ...opts, on: {
        ...opts.on, grab: (wrist, meta) => {
          contacts.push({ name, gap: meta.contactWorld.distanceTo(new T.Vector3(...opts.refs.shoe)),
            source: opts.refs.shoe, contact: meta.contactWorld.toArray() });
          opts.on?.grab?.(wrist, meta);
        },
        release: (wrist, meta) => {
          contacts.push({ name, gap: meta.contactWorld.distanceTo(new T.Vector3(...opts.refs.target)),
            source: opts.refs.target, contact: meta.contactWorld.toArray() });
          opts.on?.release?.(wrist, meta);
        },
      } });
      group.userData.rig = rig; group.userData.idle = () => rig.setIdle(app);
    });
    return group;
  };
  const station = C.floor.buildCashierStation({ app, standalone: true });
  for (const kind of ['buyIn', 'cashOut']) {
    let finished = false, success;
    station.userData.service.demo(kind, 1000).then((value) => { finished = true; success = value; });
    for (let i = 0; i < 2000 && !finished; i++) {
      now += 1000 / 60;
      for (const hook of [...hooks]) hook(1 / 60, now / 1000);
      await Promise.resolve(); await Promise.resolve();
    }
    assert.equal(finished, true);
    assert.equal(success, true);
  }
  assert.equal(contacts.length, 8);
  assert.ok(contacts.every((contact) => contact.gap < 0.01), JSON.stringify(contacts));
  station.userData.service.dispose();
});
