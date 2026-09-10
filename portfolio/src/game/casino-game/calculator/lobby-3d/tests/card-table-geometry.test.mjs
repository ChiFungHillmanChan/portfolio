import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const context = vm.createContext({ console });
const load = (path) => vm.runInContext(readFileSync(new URL(path, root), 'utf8'), context, { filename: path });
load('vendor/three-0.149.0.min.js');
load('src/logic/layouts.js');
// The real Three meshes are under test. Canvas rendering and room dressing
// are unrelated to their bounds, so only those external services are stubbed.
vm.runInContext(`
  CASINO.assets = {
    canvasTexture: () => new THREE.Texture(),
    woodMaterial: (color) => new THREE.MeshStandardMaterial({ color }),
    goldMaterial: () => new THREE.MeshStandardMaterial({ color: '#b78b35' }),
    makeStool: () => new THREE.Group(),
    makeGlowPad: () => {
      const g = new THREE.Group(); g.userData.setBright = () => {}; return g;
    },
  };
`, context);
load('src/engine/cards.js');
load('src/engine/chips3d.js');
load('src/floor/tables/blackjack-table.js');

test('blackjack skirt and felt occupy the same player-facing half-disc', () => {
  const bounds = vm.runInContext(`(() => {
    const table = CASINO.floor.tables.blackjack();
    const skirt = table.children.find((part) => part.geometry?.type === 'CylinderGeometry');
    const felt = table.children.find((part) => part.geometry?.type === 'CircleGeometry');
    return [skirt, felt].map((part) => {
      const box = new THREE.Box3().setFromObject(part);
      return { min: box.min.toArray(), max: box.max.toArray() };
    });
  })()`, context);
  for (const [i, box] of bounds.entries()) {
    assert.ok(box.min[2] >= -1e-6, `${i ? 'felt' : 'skirt'} does not extend behind the dealer edge`);
    assert.ok(box.max[2] > 1.59, 'extends toward the player arc');
    assert.ok(box.min[0] < -1.59 && box.max[0] > 1.59, 'full left/right table width');
  }
});

test('shoe mouth mesh transform exactly matches each table card draw origin', () => {
  const measurements = vm.runInContext(`(() => [CASINO.layouts.blackjack, CASINO.layouts.baccarat].map((layout) => {
    const shoe = CASINO.cards.makeShoe();
    shoe.position.set(...layout.shoePos); shoe.rotation.y = layout.shoeYaw;
    const mouth = shoe.localToWorld(new THREE.Vector3(...shoe.userData.mouthLocal));
    const bounds = new THREE.Box3().setFromObject(shoe);
    return { distance: mouth.distanceTo(new THREE.Vector3(...layout.shoeMouth)),
      bottom: bounds.min.y, feltY: layout.feltY };
  }))()`, context);
  for (const measurement of measurements) {
    assert.ok(measurement.distance < 1e-9, 'card starts in the modeled dispensing mouth');
    assert.ok(measurement.bottom >= measurement.feltY - 1e-6, 'shoe sits on top of the felt');
  }
});

test('blackjack apron leaves leg space below the rail and supports stay inside the player arc', () => {
  const bounds = vm.runInContext(`(() => {
    const table = CASINO.floor.tables.blackjack();
    return table.children.filter((part) => part.geometry).slice(0, 2).map((part) => {
      const box = new THREE.Box3().setFromObject(part);
      return { bottom: box.min.y, top: box.max.y };
    });
  })()`, context);
  for (const part of bounds) {
    assert.ok(part.bottom >= 0.64, 'table apron cannot fill the player/dealer knee space');
    assert.ok(Math.abs(part.top - 0.83) < 1e-5, 'apron still supports the felt');
  }
  const supports = vm.runInContext(`(() => {
    const table = CASINO.floor.tables.blackjack();
    return table.children.filter((part) => part.name === 'blackjack-pedestal-foot').map((part) => {
      const box = new THREE.Box3().setFromObject(part);
      return { farX: Math.max(Math.abs(box.min.x), Math.abs(box.max.x)), farZ: box.max.z };
    });
  })()`, context);
  assert.equal(supports.length, 2, 'the apron rests on two floor supports');
  for (const support of supports) assert.ok(Math.hypot(support.farX, support.farZ) < 1.3,
    'pedestals remain away from seated players at the 1.6m rail');
});
