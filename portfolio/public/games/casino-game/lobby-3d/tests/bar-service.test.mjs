import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function harness({ cancelAt = Infinity, actualMotion = false } = {}) {
  const context = vm.createContext({ console, performance });
  const load = path => vm.runInContext(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), context);
  load('vendor/three-0.149.0.min.js');
  vm.runInContext(`
    globalThis.CASINO = { app: { roomGen: 1 }, assets: {
      canvasTexture: () => new THREE.Texture(),
      woodMaterial: color => new THREE.MeshStandardMaterial({ color }),
      ledStrip: () => new THREE.Group(), makeStool: () => new THREE.Group(),
      makeDealer: () => { const actor = new THREE.Group(); actor.userData.rig = {}; actor.userData.idle = () => {}; return actor; },
    } };
  `, context);
  const T = context.THREE, C = context.CASINO, calls = [], hooks = new Set();
  let n = 0, active = true;
  C.serviceMotion = { create(app, rig, space) {
    const held = new Map();
    const operation = async (type, data, run) => {
      calls.push({ type, ...data });
      if (!active || ++n === cancelAt) { active = false; app.roomGen++; return false; }
      run?.(); await Promise.resolve(); return true;
    };
    const updateHeld = () => {
      for (const { prop, grip, palm } of held.values()) {
        const offset = new T.Vector3(...grip).multiply(prop.scale).applyEuler(prop.rotation);
        prop.position.set(...palm).sub(offset);
      }
    };
    return {
      pick(prop, { side, target, grip }) { return operation('pick', { prop: prop.name, side, target }, () => { held.set(side, { prop, grip, palm: target }); updateHeld(); }); },
      pose({ side, target }) { return operation('pose', { side, target }, () => { const h = held.get(side); if (h) h.palm = target; updateHeld(); }); },
      place({ side, target }) { return operation('place', { side, target }, () => { const h = held.get(side); if (h) h.prop.position.set(...target); held.delete(side); }); },
      animate({ onFrame }) { return operation('animate', {}, () => { for (const t of [0, 0.25, 0.5, 0.75, 1]) { onFrame(t); updateHeld(); } }); },
      rest() { return operation('rest', {}); },
      cancel() { active = false; held.clear(); },
    };
  } };
  if (actualMotion) {
    C.app.REDUCED = true; C.app.onFrame = hook => hooks.add(hook); C.app.offFrame = hook => hooks.delete(hook);
    load('src/logic/hand-paths.js'); load('src/engine/service-motion.js');
  }
  load('src/floor/bar.js');
  const station = C.floor.buildBarStation({ app: C.app, standalone: true });
  return { T, C, station, calls, hooks, service: station.userData.service };
}

test('bar has actual spirit bottles, a clear staff workwell and a working barback', () => {
  const { station, T } = harness();
  const kinds = new Set();
  station.traverse(part => { if (part.userData.kind) kinds.add(part.userData.kind); });
  for (const kind of ['WHISKY', 'GIN', 'RUM', 'VODKA', 'TEQUILA', 'ORANGE LIQUEUR', 'DRY VERMOUTH']) assert.ok(kinds.has(kind), kind);
  station.traverse(part => {
    if (part.name !== 'bottle-glass') return;
    assert.equal(part.geometry.type, 'LatheGeometry');
    assert.ok(part.material.transparent);
    assert.equal(part.material.emissive.getHex(), 0, 'bottles are not neon cylinders');
    const box = new T.Box3().setFromObject(part);
    assert.ok(box.max.y - box.min.y > 0.12);
  });
  for (const name of ['bar-sink-basin', 'bar-faucet-arch', 'bar-speed-rail', 'bar-ice-bin', 'cocktail-jigger', 'hawthorne-strainer', 'cocktail-shaker', 'garnish-tray']) assert.ok(station.getObjectByName(name), name);
  const actor = station.getObjectByName('professional-bartender');
  const front = new T.Box3().setFromObject(station.getObjectByName('bar-counter-front'));
  assert.ok(front.min.z - actor.position.z >= 0.63, 'counter does not intersect the stationary bartender');
  assert.ok(station.userData.dimensions.workY < station.userData.dimensions.counterY);
});

for (const [drink, glass, garnish, tools] of [
  ['old-fashioned', 'rocks', 'orange', ['aromatic-bitters', 'service-spirit-bottle', 'bar-spoon']],
  ['martini', 'coupe', 'olive', ['service-spirit-bottle', 'service-dry-vermouth', 'cocktail-shaker']],
  ['highball', 'highball', 'lemon', ['service-spirit-bottle', 'soda-siphon']],
]) test(`${drink} is poured, finished and presented with its recipe tools`, async () => {
  const { service, station, calls } = harness();
  assert.equal(await service.demo(drink), true);
  assert.equal(service.busy, false);
  assert.equal(service.drink.name, `drink-glass-${glass}`);
  assert.equal(service.drink.userData.drink, drink);
  assert.ok(service.drink.userData.fillLevel > 0.06);
  assert.ok(service.drink.userData.fillLevel < service.drink.userData.rimHeight, 'liquid stays below the rim');
  assert.equal(service.drink.parent, station);
  assert.ok(service.drink.getObjectByName(`served-${garnish}-garnish`), 'garnish remains attached to the presented glass');
  assert.ok(Math.abs(service.drink.position.y - 1.089) < 1e-9, 'glass sits on the countertop napkin');
  assert.ok(Math.abs(service.drink.position.z - 0.49) < 1e-9);
  assert.equal(station.userData.models.stream.visible, false);
  for (const name of tools) assert.ok(calls.some(call => call.type === 'pick' && call.prop === name), `${name} handled by bartender`);
  assert.equal(calls.at(-1).type, 'rest');
  for (const call of calls.filter(call => call.type === 'pose')) {
    assert.ok(Math.abs(call.target[0]) <= 0.36, 'no arm reaches across the bar');
    assert.ok(call.target[2] <= 0.18, 'glass is handed to the near counter edge before sliding outward');
  }
});

test('bar refuses duplicate orders and cancellation cannot finish a stale drink', async () => {
  const { service, station, calls } = harness({ cancelAt: 4 });
  const order = service.demo('old-fashioned');
  assert.equal(await service.demo('martini'), false, 'only one order can run at a time');
  assert.equal(await order, false);
  assert.equal(calls.length, 4, 'room cancellation prevents later poses and service');
  assert.equal(service.busy, false);
  assert.equal(station.userData.models.stream.visible, false);
  assert.equal(service.drink.userData.drink, undefined);
  service.dispose();
  assert.equal(await service.demo('highball'), false);
  assert.equal(service.drink, null);
});

test('martini preparation carries the empty shaker before pouring and shakes with forearm strokes', async () => {
  const { service, calls } = harness();
  assert.equal(await service.demo('martini'), true);
  assert.equal(calls[0].type, 'pick');
  assert.equal(calls[0].prop, 'cocktail-shaker', 'shaker is picked up from its resting position');
  assert.equal(calls[2].type, 'place');
  assert.deepEqual([...calls[2].target], [-0.055, 0.977, 0.08], 'shaker reaches the mixing position through a place action');
  const spiritPick = calls.findIndex(call => call.type === 'pick' && call.prop === 'service-spirit-bottle');
  assert.ok(spiritPick > 2, 'bottle pickup happens after the shaker is set down');
  const strokes = calls.filter(call => call.type === 'pose' && call.side === 'R' && (
    JSON.stringify(call.target) === JSON.stringify([-0.04, 1.26, 0.015]) ||
    JSON.stringify(call.target) === JSON.stringify([-0.09, 1.35, -0.065])));
  assert.equal(strokes.length, 8, 'shaking changes the hand target rather than rotating the tool under a stationary palm');
  for (let i = 1; i < strokes.length; i++) assert.notDeepEqual(strokes[i].target, strokes[i - 1].target);
});

test('bar rejects unknown recipes and replaces the previous glass without prop accumulation', async () => {
  const { service, station } = harness();
  assert.equal(await service.demo('not-a-drink'), false);
  assert.equal(service.busy, false);
  assert.equal(await service.demo('highball'), true);
  const first = service.drink;
  assert.equal(await service.demo('martini'), true);
  assert.equal(first.parent, null);
  assert.equal(station.children.filter(child => child.userData.drink).length, 1);
});

test('all recipes integrate with the real shared controller in reduced motion without frame leaks', async () => {
  const { service, hooks, station } = harness({ actualMotion: true });
  for (const drink of ['old-fashioned', 'martini', 'highball']) {
    assert.equal(await service.demo(drink), true);
    assert.equal(service.drink.userData.drink, drink);
    assert.equal(service.busy, false);
    assert.equal(station.userData.models.stream.visible, false);
    assert.equal(hooks.size, 0, 'completed drink leaves no service frame hooks');
  }
});

test('replacing a drink disposes its nested GPU resources while retaining shared bar materials', async () => {
  const { service, station } = harness({ actualMotion: true });
  const bottle = station.userData.models.bottle;
  const oldBottleMaps = [];
  bottle.traverse(part => { if (part.material?.map) oldBottleMaps.push(part.material.map); });
  let mapsDisposed = 0;
  for (const map of oldBottleMaps) map.addEventListener('dispose', () => mapsDisposed++);
  assert.equal(await service.demo('old-fashioned'), true);
  assert.equal(mapsDisposed, oldBottleMaps.length, 'replaced bottle label textures are released');
  const oldGlass = service.drink, geometries = new Set();
  oldGlass.traverse(part => { if (part.geometry) geometries.add(part.geometry); });
  let geometryDisposals = 0, liquidDisposals = 0, sharedDisposals = 0;
  for (const geometry of geometries) geometry.addEventListener('dispose', () => geometryDisposals++);
  oldGlass.userData.liquid.material.addEventListener('dispose', () => liquidDisposals++);
  oldGlass.getObjectByName('drink-glass-shell').material.addEventListener('dispose', () => sharedDisposals++);
  assert.equal(await service.demo('highball'), true);
  assert.equal(geometryDisposals, geometries.size, 'includes garnish and ice geometry below the glass');
  assert.equal(liquidDisposals, 1);
  assert.equal(sharedDisposals, 0, 'other displayed glasses still use the shared glass material');
  service.dispose();
  assert.equal(service.drink, null);
});
