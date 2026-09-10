import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { betSpots } from '../roulette-map.js';

function setup() {
  const hooks = new Set();
  let now = 0;
  const ctx = vm.createContext({ performance: { now: () => now }, setTimeout, clearTimeout, crypto });
  const run = (path) => vm.runInContext(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), ctx);
  run('vendor/three-0.149.0.min.js');
  const T = ctx.THREE;
  const C = ctx.CASINO = {
    assets: {
      canvasTexture: () => new T.Texture(),
      woodMaterial: () => new T.MeshStandardMaterial(), goldMaterial: () => new T.MeshStandardMaterial(),
      makeGlowPad: () => { const g = new T.Group(); g.userData.setBright = () => {}; return g; },
    },
    character: { ready: 'unavailable' },
    app: { roomGen: 1, REDUCED: true, onFrame: (fn) => hooks.add(fn), offFrame: (fn) => hooks.delete(fn) },
    tween: { to: (obj, values, ms, ease, done) => { Object.assign(obj, values); done?.(); } },
  };
  run('src/engine/chips3d.js');
  run('src/logic/layouts.js');
  run('src/logic/roulette-physics.js');
  run('src/floor/tables/roulette-table.js');
  const table = C.floor.tables.roulette();
  return { C, T, table, hooks, tick(time) { now = time; [...hooks].forEach((hook) => hook()); } };
}

test('roulette marker and live chip mapping agree on all 37 printed cells', async () => {
  const { C, table } = setup();
  const felt = C.floor.ROULETTE_FELT;
  for (let n = 0; n <= 36; n++) {
    const spot = betSpots({ straight: { [n]: 100 } }, felt)[0];
    const [x, z] = felt.numberCenter(n);
    assert.ok(Math.abs(x - spot.x) < 1e-10);
    assert.ok(Math.abs(z - spot.z) < 1e-10);
    await table.userData.placeDolly(n);
    const marker = table.getObjectByName('roulette-dolly');
    assert.equal(marker.position.x, x);
    assert.equal(marker.position.z, z);
  }
});

test('wheel meshes provide 37 correctly oriented recessed pockets and matching solid walls', () => {
  const { C, table } = setup();
  const rotor = table.getObjectByName('roulette-rotor');
  const W = C.roulettePhysics.GEOMETRY;
  const pockets = [], dividers = [];
  rotor.traverse((mesh) => {
    if (mesh.userData.roulettePocket !== undefined) pockets.push(mesh);
    if (mesh.userData.rouletteDivider !== undefined) dividers.push(mesh);
  });
  assert.equal(pockets.length, 37);
  assert.equal(dividers.length, 37);
  pockets.forEach((mesh, i) => {
    assert.equal(mesh.userData.roulettePocket, C.roulettePhysics.EU_WHEEL[i]);
    assert.equal(mesh.geometry.parameters.innerRadius, W.pocketInner);
    assert.equal(mesh.geometry.parameters.outerRadius, W.pocketOuter);
    assert.ok(Math.abs(mesh.position.y - W.pocketFloor) < 0.001);
    const positions = mesh.geometry.attributes.position;
    let cx = 0, cz = 0;
    for (let vertex = 0; vertex < positions.count; vertex++) {
      cx += positions.getX(vertex); cz -= positions.getY(vertex);
    }
    const delta = Math.atan2(cz, cx) - i * C.roulettePhysics.STEP;
    assert.ok(Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta))) < 1e-6);
  });
  dividers.forEach((mesh) => {
    assert.equal(mesh.geometry.parameters.height, W.separatorHeight);
    assert.ok(Math.abs(mesh.position.y + W.separatorHeight / 2 - W.pocketFloor - W.separatorHeight) < 1e-12);
  });
  const ball = table.getObjectByName('roulette-ball');
  assert.equal(ball.geometry.parameters.radius, W.ballRadius);
  assert.equal(ball.position.y - W.ballRadius, W.pocketFloor);
  assert.equal(ball.parent.name, '', 'ball belongs to stationary mount, never reparented at capture');
});

test('settlement clears losers, preserves winning stakes, pays net winnings, and cleans rake hooks', async () => {
  const { C, table, hooks } = setup();
  const losing = { x: -0.2, z: 0.1, amount: 100 };
  const winning = { x: 0.4, z: 0.2, amount: 100, factor: 2 };
  table.userData.setBets([losing, winning]);
  const bets = table.getObjectByName('roulette-bets');
  const winner = bets.children.find((stack) => stack.position.x === winning.x);
  await table.userData.settleBets({ losingSpots: [losing], winningSpots: [winning] });
  assert.equal(bets.children.length, 2);
  assert.ok(bets.children.includes(winner), 'original winning wager remains');
  const payout = bets.children.find((stack) => stack !== winner);
  assert.equal(payout.children.reduce((total, chip) => total + chip.userData.value, 0), 200);
  assert.equal(payout.position.y, 0.86 + C.chips.CHIP_H / 2);
  assert.deepEqual([...payout.scale.toArray()], [1, 1, 1]);
  assert.equal(table.getObjectByName('roulette-rake').visible, false);
  assert.equal(hooks.size, 0);
});

test('small wagers and their winnings keep their exact printed chip values', async () => {
  const { table } = setup();
  const winning = { x: 0.4, z: 0.2, amount: 5, factor: 35 };
  table.userData.setBets([winning]);
  const bets = table.getObjectByName('roulette-bets');
  const value = (bundle) => bundle.children.reduce((total, chip) => total + chip.userData.value, 0);
  assert.equal(value(bets.children[0]), 5);
  await table.userData.settleBets({ winningSpots: [winning] });
  assert.equal(value(bets.children[0]), 5);
  assert.equal(value(bets.children[1]), 175);
});

test('cancelling while the dealer retrieves the ball cannot restart a spin afterward', async () => {
  const { C, table, hooks, tick } = setup();
  C.app.REDUCED = false;
  const spin = table.userData.spinTo(17);
  tick(180);
  table.userData.cancelSpin();
  await spin;
  assert.equal(hooks.size, 0);
  const ball = table.getObjectByName('roulette-ball');
  const stopped = ball.position.toArray();
  tick(8000);
  assert.deepEqual(ball.position.toArray(), stopped);
});

test('replacing bets during a collection cancels later payouts', async () => {
  const { C, table, hooks, tick } = setup();
  C.app.REDUCED = false;
  const losing = { x: -0.2, z: 0.1, amount: 100 };
  const winning = { x: 0.4, z: 0.2, amount: 100, factor: 2 };
  table.userData.setBets([losing, winning]);
  const settlement = table.userData.settleBets({ losingSpots: [losing], winningSpots: [winning] });
  tick(200);
  table.userData.setBets([]);
  await settlement;
  assert.equal(table.getObjectByName('roulette-bets').children.length, 0);
  assert.equal(hooks.size, 0);
});

test('a superseding spin owns the final pocket and all older animation promises resolve', async () => {
  const { C, table, hooks, tick } = setup();
  C.app.REDUCED = false;
  const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
  const first = table.userData.spinTo(17);
  await flush(); tick(200);
  const second = table.userData.spinTo(32);
  await flush();
  await first;
  tick(900); await flush();
  tick(9500); await second;
  const ball = table.getObjectByName('roulette-ball');
  const rotor = table.getObjectByName('roulette-rotor');
  const actual = Math.atan2(ball.position.z, ball.position.x) + rotor.rotation.y;
  const expected = C.roulettePhysics.EU_WHEEL.indexOf(32) * C.roulettePhysics.STEP;
  assert.ok(Math.abs(Math.atan2(Math.sin(actual - expected), Math.cos(actual - expected))) < 1e-9);
  assert.equal(hooks.size, 1, 'only the latest rotor coast remains');
  table.userData.cancelSpin();
  assert.equal(hooks.size, 0);
});
