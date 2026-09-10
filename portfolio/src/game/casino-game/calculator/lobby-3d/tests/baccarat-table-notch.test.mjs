import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function setup({ withDealer = false } = {}) {
  const ctx = vm.createContext({});
  const run = (file) => vm.runInContext(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), ctx);
  run('vendor/three-0.149.0.min.js');
  const T = ctx.THREE;
  let dealerOptions = null, dealer = null;
  const C = ctx.CASINO = {
    assets: {
      canvasTexture: () => new T.Texture(), woodMaterial: () => new T.MeshStandardMaterial(),
      goldMaterial: () => new T.MeshStandardMaterial(), makeStool: () => new T.Group(),
      makeGlowPad: () => { const g = new T.Group(); g.userData.setBright = () => {}; return g; },
      makeDealer: (opts) => {
        dealerOptions = opts; dealer = new T.Group();
        dealer.userData.idle = () => {};
        dealer.userData.rig = {};
        return dealer;
      },
    },
    chips: { makeChipStack: () => new T.Group() },
    cards: { makeCardBoxDecal: () => new T.Group(), makeShoe: () => new T.Group(), makeDiscardTray: () => new T.Group() },
  };
  run('src/logic/layouts.js');
  run('src/logic/baccarat-roads.js');
  run('src/floor/tables/baccarat-table.js');
  const table = C.floor.tables.baccarat({ withDealer });
  table.updateMatrixWorld(true);
  return { C, T, table, dealer, dealerOptions };
}

test('baccarat apron and felt leave the actual dealer leg/hip envelope empty', () => {
  const { T, table } = setup();
  const apron = table.getObjectByName('baccarat-apron');
  const felt = table.getObjectByName('baccarat-felt');
  const rail = table.getObjectByName('baccarat-edge');
  const armRail = table.getObjectByName('baccarat-arm-rail');
  const trim = table.getObjectByName('baccarat-apron-trim');
  const seam = table.getObjectByName('baccarat-rail-seam');
  const topPlate = table.getObjectByName('baccarat-top-plate');
  const layers = [apron, felt, rail, armRail, trim, seam, topPlate];
  assert.ok(layers.every(Boolean), 'all surface layers use the dealer contour');
  for (const mesh of layers) {
    for (const value of mesh.geometry.attributes.position.array) assert.ok(Number.isFinite(value));
  }
  const railTop = new T.Raycaster(new T.Vector3(0, 1, 0.824), new T.Vector3(0, -1, 0)).intersectObject(armRail);
  assert.ok(railTop.length > 0 && railTop[0].point.y > 0.84, 'padded rail faces up and rises above the felt');
  for (const x of [-0.24, -0.12, 0, 0.12, 0.24]) {
    for (const z of [-0.84, -0.70, -0.64]) {
      const ray = new T.Raycaster(new T.Vector3(x, 1, z), new T.Vector3(0, -1, 0));
      assert.equal(ray.intersectObjects(layers).length, 0, `surface intrudes at ${x}, ${z}`);
    }
  }
  const bounds = new T.Box3().setFromObject(apron);
  assert.ok(Math.abs(bounds.min.y - 0.64) < 1e-6);
  assert.ok(Math.abs(bounds.max.y - 0.806) < 1e-6);
  // CPU-skinned samples across all nine character sizes and an idle cycle:
  // the largest dealer at z=-.74 reaches z=-.531 at thigh height and
  // z=-.596 at felt height. Probe those envelopes with a small margin.
  for (const x of [-0.22, -0.1, 0, 0.1, 0.22]) {
    const thighRay = new T.Raycaster(new T.Vector3(x, 0.80, -0.52), new T.Vector3(0, -1, 0));
    assert.equal(thighRay.intersectObjects([apron, trim]).length, 0, 'knee recess clears the largest dealer');
    const hipRay = new T.Raycaster(new T.Vector3(x, 1, -0.595), new T.Vector3(0, -1, 0));
    assert.equal(hipRay.intersectObjects(layers).length, 0, 'felt and piping clear the largest dealer hip');
  }
  const rackBounds = new T.Box3().setFromObject(table.getObjectByName('baccarat-chip-rack'));
  assert.ok(rackBounds.min.z >= -0.601, 'chip rack stays in front of the torso envelope');
  for (const x of [-0.335, 0, 0.335]) {
    const ray = new T.Raycaster(new T.Vector3(x, 0.2, -0.477), new T.Vector3(0, -1, 0));
    assert.equal(ray.intersectObjects(table.children, true).length, 0, 'feet remain clear beneath apron');
  }
});

test('notching does not remap the felt print and existing rack/card/betting centres remain supported', () => {
  const { C, T, table } = setup();
  const felt = table.getObjectByName('baccarat-felt');
  assert.ok(felt);
  const p = felt.geometry.attributes.position, uv = felt.geometry.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    assert.ok(Math.abs(uv.getX(i) - (0.5 + p.getX(i) / (2 * C.layouts.baccarat.feltRx))) < 1e-6);
    assert.ok(Math.abs(uv.getY(i) - (0.5 + p.getY(i) / (2 * C.layouts.baccarat.feltRz))) < 1e-6);
  }
  const L = C.layouts.baccarat;
  const wagers = L.seatAngles.flatMap((_, seat) => Object.keys(L.betFracs).map((kind) => {
    const [x, z] = L.seatSpot(seat, kind);
    return [x, L.feltY, z];
  }));
  const supported = [L.rackPos, ...L.playerSlots, ...L.bankerSlots, ...wagers];
  for (const [x, , z] of supported) {
    const ray = new T.Raycaster(new T.Vector3(x, 1, z), new T.Vector3(0, -1, 0));
    assert.ok(ray.intersectObject(felt).length > 0, `layout centre lost felt support at ${x}, ${z}`);
    assert.equal(ray.intersectObject(table.getObjectByName('baccarat-arm-rail')).length, 0,
      `padded rail covers active felt at ${x}, ${z}`);
  }
});

test('approaching a running baccarat round cannot trigger a dealer entrance', () => {
  const { dealer, dealerOptions } = setup({ withDealer: true });
  assert.equal(dealerOptions.walkIn, undefined, 'a proximity entrance would teleport the active dealer away from the shoe');
  assert.deepEqual([dealer.position.x, dealer.position.y, dealer.position.z], [0, 0, -0.74]);
});
