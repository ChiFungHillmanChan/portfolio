import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as THREE from './vendor/build/three.module.js';

const threeUrl = new URL('./vendor/build/three.module.js', import.meta.url).href;
async function productionModule(name) {
  const source = (await readFile(new URL(name, import.meta.url), 'utf8')).replace("from 'three'", `from '${threeUrl}'`);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { createFurnitureInteractions } = await productionModule('./furniture-interactions.js');
const { applyLayout } = await productionModule('./layout.js');
const { refineWardrobe } = await productionModule('./wardrobe-detail.js');
const { addStorage } = await productionModule('./storage.js');

// Use GLB metadata bounds and original node transforms for the real wardrobe,
// without making Node decode unrelated room photographs.
const glb = await readFile(new URL('./room.glb', import.meta.url));
const metadata = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
function wardrobeModel() {
  const model = new THREE.Group();
  for (const node of metadata.nodes.filter((value) => /wardrobe|towel/i.test(value.name))) {
    if (node.mesh === undefined) continue;
    const bounds = metadata.accessors[metadata.meshes[node.mesh].primitives[0].attributes.POSITION];
    const min = new THREE.Vector3(...bounds.min), max = new THREE.Vector3(...bounds.max);
    const size = max.clone().sub(min), center = max.clone().add(min).multiplyScalar(.5);
    const shape = new THREE.BoxGeometry(...size.toArray()); shape.translate(...center.toArray());
    const object = new THREE.Mesh(shape, new THREE.MeshStandardMaterial()); object.name = THREE.PropertyBinding.sanitizeNodeName(node.name);
    if (node.translation) object.position.set(...node.translation);
    if (node.rotation) object.quaternion.set(...node.rotation);
    if (node.scale) object.scale.set(...node.scale);
    model.add(object);
  }
  applyLayout(model, { width: 2, depth: 3.9 });
  refineWardrobe(model, { width: 2, depth: 3.9 });
  return model;
}
function fabricModel() {
  const model = new THREE.Group(), storage = new THREE.Group();
  storage.name = 'Storage • 30 cm fabric drawers'; storage.position.set(1.73, 0, -2.55); model.add(storage);
  // Boundary matches the actual shelf including its steel frame/tray.
  const frame = new THREE.Mesh(new THREE.BoxGeometry(.503, 1.05, .300), new THREE.MeshStandardMaterial());
  frame.position.y = .525; storage.add(frame);
  for (let row = 1; row <= 5; row++) {
    const drawer = new THREE.Group(); drawer.userData.fabricDrawer = row;
    drawer.name = `Storage / fabric drawer ${row}`;
    const face = new THREE.Mesh(new THREE.BoxGeometry(.01, .16, .269), new THREE.MeshStandardMaterial());
    face.position.set(-.239, .131 + (row - 1) * .185, 0); drawer.add(face); storage.add(drawer);
  }
  return model;
}
function addBedFixture(model) {
  const bed = new THREE.Group(); bed.name = 'Bed • photographed bedding and plush row'; model.add(bed);
  const box = (name, position, dimensions) => {
    const value = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), new THREE.MeshStandardMaterial());
    value.name = 'Bed / ' + name; value.position.set(...position); bed.add(value);
  };
  box('storage bed carcass', [1, .338, -3.335], [1.914, .556, 1.105]);
  box('dark gaps behind four drawers', [1, .3, -2.762], [1.87, .49, .012]);
  for (let column = 0; column < 2; column++) for (let row = 0; row < 2; row++) {
    const x = .069 + .915 / 2 + column * (.915 + .032), y = .183 + row * .235, suffix = `${column + 1}-${row + 1}`;
    box('white storage drawer ' + suffix, [x, y, -2.734], [.915, .212, .032]);
    box('recessed dark drawer pull ' + suffix, [x, y + .091, -2.716], [.126, .023, .002]);
    box('rounded drawer pull lower lip ' + suffix, [x, y + .081, -2.714], [.11, .007, .004]);
  }
}
function settle(furniture) { for (let i = 0; i < 50; i++) furniture.update(1 / 60); }
const entry = (furniture, id) => furniture.entries.find((value) => value.id === id);

test('drawers reverse mid-motion, settle without continuous work and keep game props inaccessible when closed', () => {
  const model = fabricModel(), actions = []; let frames = 0;
  const furniture = createFurnitureInteractions(model, { invalidate: () => frames++, onAction: (id) => actions.push(id) });
  const drawer = entry(furniture, 'fabric-5'), cards = entry(furniture, 'cards');
  cards.activate(); assert.deepEqual(actions, []); assert.equal(cards.available(), false);
  drawer.activate(); furniture.update(.1); assert.ok(drawer.objects[0].position.x < 0);
  drawer.activate(); settle(furniture); assert.equal(drawer.objects[0].position.x, 0);
  assert.equal(furniture.update(.1), false);
  drawer.activate(); settle(furniture);
  assert.equal(drawer.objects[0].position.x, -.29); assert.equal(cards.available(), true); assert.equal(cards.objects[0].visible, true);
  cards.activate(); assert.deepEqual(actions, ['cards']);
  assert.ok(cards.objects[0].parent === drawer.objects[0]);
  drawer.activate(); settle(furniture); cards.activate(); assert.deepEqual(actions, ['cards']);
  assert.equal(cards.objects[0].visible, false); assert.equal(frames, 4);
  furniture.dispose(); assert.equal(furniture.update(.1), false);
});

test('all five fabric drawers reveal labelled discoveries without launching them on opening', () => {
  const previous = globalThis.document, printed = [];
  const context = new Proxy({
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    fillText: (text) => printed.push(text),
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
  try {
    const model = new THREE.Group(), actions = [];
    addStorage(model, { width: 2, depth: 3.9 });
    const furniture = createFurnitureInteractions(model, { onAction: id => actions.push(id) });
    const ids = ['drawer-rubiks', 'drawer-connect4', 'drawer-siuheibou', 'drawer-dasiuyan', 'cards'];
    assert.equal(new Set(furniture.entries.map(item => item.id)).size, furniture.entries.length, 'each action has one owner');
    for (const [index, id] of ids.entries()) {
      const drawer = entry(furniture, `fabric-${index + 1}`), discovery = entry(furniture, id);
      assert.ok(discovery, `${id} is discoverable in its own drawer`);
      assert.equal(discovery.focusAction, `fabric-${index + 1}`);
      assert.equal(discovery.available(), false); discovery.activate();
      drawer.activate(); settle(furniture); model.updateWorldMatrix(true, true);
      assert.deepEqual(actions, ids.slice(0, index), 'opening a drawer never launches its discovery');
      assert.equal(discovery.available(), true);
      assert.equal(discovery.objects[0].parent, drawer.objects[0]);
      const inverse = drawer.objects[0].matrixWorld.clone().invert(), bounds = new THREE.Box3();
      discovery.objects[0].traverse(object => {
        if (!object.isMesh) return;
        object.geometry.computeBoundingBox();
        bounds.union(object.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(object.matrixWorld)));
      });
      const y = .131 + index * .185;
      assert.ok(bounds.min.x > -.23 && bounds.max.x < .212, 'discovery stays between front and back walls');
      assert.ok(bounds.min.z > -.126 && bounds.max.z < .126, 'discovery stays between the cloth sides');
      assert.ok(bounds.min.y > y - .0745 && bounds.max.y < y + .077, 'discovery rests above the floor and below the rim');
      let printedLid;
      discovery.objects[0].traverse(object => { if (/printed lid/.test(object.name)) printedLid = object; });
      assert.ok(printedLid, 'each physical discovery has a readable printed top');
      const center = new THREE.Vector3().setFromMatrixPosition(printedLid.matrixWorld);
      const eye = new THREE.Vector3(.66, Math.max(.90, y + .80), -2.12);
      const ray = new THREE.Raycaster(eye, center.clone().sub(eye).normalize());
      const hit = ray.intersectObject(model, true).find(({ object }) => {
        for (let node = object; node; node = node.parent) if (!node.visible) return false;
        return true;
      });
      let owner = hit?.object;
      while (owner && !owner.userData.actionId) owner = owner.parent;
      assert.equal(owner?.userData.actionId, id, 'the printed discovery is physically clickable from drawer focus');
      discovery.activate(); assert.deepEqual(actions, ids.slice(0, index + 1));
      drawer.activate(); settle(furniture);
      assert.equal(discovery.available(), false); assert.equal(discovery.objects[0].visible, false);
    }
    assert.ok(printed.includes('RUBIK’S CUBE') && printed.includes('CONNECT 4') && printed.includes('SIU HEI BOU') && printed.includes('DA SIU YAN') && printed.includes('CARD DRAWER'));
    assert.equal(printed.filter(text => text === 'CLICK TO EXPLORE').length, 5);
    const leftovers = [];
    model.getObjectByName('Storage • 30 cm fabric drawers').traverse(object => { if (/Folded clothing|Rolled socks|Coiled charging cable|Small charging adapter/.test(object.name)) leftovers.push(object.name); });
    assert.deepEqual(leftovers, [], 'fabric drawers contain discoveries instead of filler clothing or cables');
    furniture.dispose();
  } finally { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; }
});

test('bed drawer bodies and contents move together while right drawers stop before the shelf', () => {
  const model = fabricModel(); addBedFixture(model);
  const furniture = createFurnitureInteractions(model);
  for (let id = 1; id <= 4; id++) entry(furniture, `bed-drawer-${id}`).activate();
  settle(furniture); model.updateWorldMatrix(true, true);
  for (const id of [1, 2]) assert.equal(furniture.state[`bed-drawer-${id}`].travel, .37);
  for (const id of [3, 4]) {
    assert.ok(furniture.state[`bed-drawer-${id}`].travel <= .0181);
    const face = entry(furniture, `bed-drawer-${id}`).objects[0].children.find((object) => object.name.includes('white storage drawer'));
    const front = new THREE.Box3().setFromObject(face).max.z;
    assert.ok(front < -2.7, 'drawer must remain behind the shelf back');
  }
  const connect4 = entry(furniture, 'connect4'); assert.equal(connect4.available(), true);
  assert.equal(connect4.objects[0].parent, entry(furniture, 'bed-drawer-2').objects[0]);
  assert.equal(model.getObjectByName('Bed / storage bed carcass').visible, false);
  furniture.dispose();
  assert.equal(model.getObjectByName('Bed / storage bed carcass').visible, true);
  assert.equal(model.getObjectByName('Bed / white storage drawer 1-1').parent.name, 'Bed • photographed bedding and plush row');
});

test('wardrobe uses original measured pivots, keeps hardware and all towel folds on the anchor door, and restores originals on dispose', () => {
  const model = wardrobeModel(); model.updateWorldMatrix(true, true);
  const originals = new Map();
  model.traverse((object) => { if (object.isMesh && object.visible) originals.set(object, object.matrixWorld.clone()); });
  const furniture = createFurnitureInteractions(model, { reducedMotion: true });
  model.updateWorldMatrix(true, true);
  for (const [object, matrix] of originals) {
    if (!object.visible) continue;
    assert.ok(matrix.elements.every((value, i) => Math.abs(value - object.matrixWorld.elements[i]) < 1e-6), `${object.name} moved during setup`);
  }
  const left = entry(furniture, 'wardrobe-left'), right = entry(furniture, 'wardrobe-right');
  assert.equal(left.objects[0].children.filter((object) => /towel|pink wire|triangular wire|twisted wire/.test(object.name)).length > 10, true);
  assert.equal(right.objects[0].children.filter((object) => /towel|pink wire|triangular wire|twisted wire/.test(object.name)).length, 0);
  assert.ok(left.objects[0].children.some((object) => /straight black wardrobe grip 1/.test(object.name)));
  assert.ok(right.objects[0].children.some((object) => /straight black wardrobe grip 2/.test(object.name)));
  left.activate(); right.activate();
  assert.equal(left.objects[0].rotation.y, -1.12); assert.equal(right.objects[0].rotation.y, 1.12);
  assert.equal(furniture.update(.1), false, 'reduced motion completes in the activation');
  const cabinet = model.getObjectByName('Wardrobe_cabinet'); assert.equal(cabinet.visible, false);
  assert.ok(model.getObjectByName('Wardrobe / hanging shirt'));
  furniture.dispose(); model.updateWorldMatrix(true, true);
  assert.equal(cabinet.visible, true);
  for (const [object, matrix] of originals) assert.ok(matrix.elements.every((value, i) => Math.abs(value - object.matrixWorld.elements[i]) < 1e-6), object.name);
  furniture.dispose();
});

test('production storage groups each complete fabric drawer without taking the fixed tray or accessories', () => {
  const previous = globalThis.document;
  const context = new Proxy({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (target, key) => key in target ? target[key] : () => {} });
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
  try {
    const model = new THREE.Group(); addStorage(model, { width: 2, depth: 3.9 });
    const storage = model.getObjectByName('Storage • 30 cm fabric drawers');
    const drawers = storage.children.filter((object) => object.userData.fabricDrawer);
    assert.equal(drawers.length, 5);
    for (const drawer of drawers) {
      assert.ok(drawer.children.some((object) => /soft front/.test(object.name)));
      assert.ok(drawer.children.some((object) => /eyelet/.test(object.name)));
      assert.ok(drawer.children.some((object) => /fabric floor/.test(object.name)));
      assert.equal(drawer.children.some((object) => /tray|HUGO|AirPods/.test(object.name)), false);
    }
    assert.equal(storage.getObjectByName('Storage / padded tray base').parent, storage);
  } finally { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; }
});
