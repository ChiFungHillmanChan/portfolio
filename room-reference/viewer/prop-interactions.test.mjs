import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as THREE from './vendor/build/three.module.js';
import { JSDOM } from '../../portfolio/node_modules/jsdom/lib/api.js';

const source = (await readFile(new URL('./prop-interactions.js', import.meta.url), 'utf8'))
  .replace("from 'three'", `from '${new URL('./vendor/build/three.module.js', import.meta.url).href}'`);
const { createPropInteractions, scoreStopwatch } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const computerSource = (await readFile(new URL('./computer-detail.js', import.meta.url), 'utf8'))
  .replace("from 'three'", `from '${new URL('./vendor/build/three.module.js', import.meta.url).href}'`);
const { refineComputers } = await import(`data:text/javascript;base64,${Buffer.from(computerSource).toString('base64')}`);

function fixture() {
  const model = new THREE.Group();
  function mesh(name, position = [0, 0, 0], size = [.1, .1, .1], parent = model) {
    const object = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial());
    object.name = name; object.position.fromArray(position); parent.add(object); return object;
  }
  const chair = new THREE.Group(); chair.name = 'Chair / clean black gaming chair'; model.add(chair);
  mesh('Chair / contoured tapered bucket back', [0, .7, 0], [.15, .7, .4], chair);
  const base = mesh('Chair / five-star hub', [0, .1, 0], [.1, .1, .1], chair);
  const row = new THREE.Group(); row.name = 'Bed / photographed dolls on windowsill'; model.add(row);
  for (let i = 0; i < 3; i++) {
    const toy = new THREE.Group(); toy.name = `Bed / Plush ${i}`; row.add(toy);
    mesh(`Toy ${i} body`, [i * .2, .85, -3.7], [.1, .15, .1], toy);
  }
  mesh('Bed / full charcoal warm white striped cotton pillow', [.3, .85, -3.1], [.45, .14, .55]);
  const blind = mesh('Dark_grey_roller_blind', [1, 1.45, -3.88], [1.8, 1.3, .015]);
  mesh('Blind_lower_weighted_bar', [1, .8, -3.88], [1.8, .02, .02]);
  const pendant = mesh('Warm_hanging_bulb', [1, 2.2, -2]);
  const leaf = mesh('Oak_entrance_door', [.025, 1.02, -.5], [.045, 2, .8]);
  leaf.userData.closedEntranceDoor = true;
  mesh('Lever_handle', [.06, 1, -.77], [.025, .015, .12]).userData.closedEntranceDoor = true;
  model.userData.closedEntranceDoor = { hinge: [.025, 0, -.1] };
  mesh('Laptop_illuminated_document', [1.7, 1.05, -2.15]);
  mesh('Monitor_illuminated_display', [1.84, 1.1, -1.6]);
  mesh('Desk_laminate_surface', [1.7, .75, -1.8], [.58, .04, 1.2]);
  model.updateWorldMatrix(true, true);
  return { model, chair, base, row, blind, pendant, leaf };
}

const settle = (props, seconds = 5) => {
  for (let i = 0; i < seconds * 60; i++) props.update(1 / 60);
  assert.equal(props.update(1 / 60), false, 'idle objects must release the render scheduler');
};

test('chair repeated clicks stay bounded, settle at the starting orientation and leave its base fixed', () => {
  const { model, base } = fixture();
  const props = createPropInteractions(model);
  const entry = props.entries.find(item => item.id === 'chair');
  const baseMatrix = base.matrixWorld.clone();
  entry.activate();
  for (let i = 0; i < 90; i++) { entry.activate(); props.update(1 / 60); }
  settle(props);
  model.updateWorldMatrix(true, true);
  assert.deepEqual(base.matrixWorld.elements, baseMatrix.elements);
  assert.equal(model.getObjectByName('Interactions / chair swivel').rotation.y, 0);
  props.dispose();
});

test('plush ripple and pillow return all original world transforms after settling', () => {
  const { model } = fixture();
  const original = new Map(); model.traverse(object => { if (object.isMesh) original.set(object, object.matrixWorld.clone()); });
  const props = createPropInteractions(model);
  props.entries.find(item => item.id === 'plush-ripple').activate();
  props.entries.find(item => item.id === 'pillow').activate();
  settle(props);
  model.updateWorldMatrix(true, true);
  for (const [object, matrix] of original) object.matrixWorld.elements.forEach((value, i) => assert.ok(Math.abs(value - matrix.elements[i]) < 1e-10, object.name));
  props.dispose();
});

test('rapid door toggles reverse from their current pose and preserve the closed transform on disposal', () => {
  const { model, leaf } = fixture(); const original = leaf.matrixWorld.clone();
  const actions = []; const props = createPropInteractions(model, { onAction: action => actions.push(action) });
  const entry = props.entries.find(item => item.id === 'door');
  entry.activate(); props.update(.1); entry.activate(); settle(props);
  assert.deepEqual(actions, ['door', 'door']);
  assert.equal(model.getObjectByName('Interactions / entrance hinge').rotation.y, 0);
  props.dispose(); model.updateWorldMatrix(true, true);
  assert.deepEqual(leaf.matrixWorld.elements, original.elements);
});

test('blind rolls toward its top anchor and lighting callbacks stay consistent with overall controls', () => {
  const { model, blind } = fixture(); const lighting = [];
  const closed = new THREE.Box3().setFromObject(blind);
  const props = createPropInteractions(model, { onLightingChange: state => lighting.push(state) });
  props.entries.find(item => item.id === 'blind').activate(); settle(props);
  model.updateWorldMatrix(true, true);
  const open = new THREE.Box3().setFromObject(blind);
  assert.ok(open.min.y > closed.min.y + .8);
  assert.ok(Math.abs(open.max.y - closed.max.y) < .0001);
  assert.equal(lighting.at(-1).blindOpen, true);
  props.setLighting({ warmOn: false, blindOpen: false }); settle(props);
  assert.deepEqual(props.lighting, { warmOn: false, blindOpen: false });
  props.entries.find(item => item.id === 'pendant').activate();
  assert.deepEqual(lighting.at(-1), { warmOn: true, blindOpen: false });
  props.dispose();
});

test('content props emit only their stable action identifiers and reduced motion never schedules animation', () => {
  const { model } = fixture(); const actions = [];
  const props = createPropInteractions(model, { reducedMotion: true, onAction: action => actions.push(action) });
  for (const id of ['experience', 'projects', 'contact', 'rubiks', 'siuheibou', 'dasiuyan']) props.entries.find(item => item.id === id).activate();
  assert.deepEqual(actions, ['experience', 'projects', 'contact', 'rubiks', 'siuheibou', 'dasiuyan']);
  for (const id of ['chair', 'pillow', 'blind', 'plush-ripple', 'door']) props.entries.find(item => item.id === id).activate();
  assert.equal(props.update(.016), false);
  props.dispose();
});

test('five-second scoring uses the elapsed clock and gives replayable early/late feedback', () => {
  assert.deepEqual(scoreStopwatch(5000), { seconds: '5.00', difference: '0.00', message: 'Exactly five seconds. Perfect timing!' });
  assert.match(scoreStopwatch(4360).message, /early/);
  assert.match(scoreStopwatch(5610).message, /late/);
  assert.equal(scoreStopwatch(5610).difference, '0.61');
});

test('speakers load the official player only on Play and remove it on stop, hidden, error or close', (t) => {
  const dom = new JSDOM('<!doctype html><body><button id="actions-button">Explore objects</button></body>', { url: 'https://portfolio.example/room-viewer/', pretendToBeVisual: true });
  const previousDocument = globalThis.document;
  globalThis.document = dom.window.document;
  dom.window.HTMLCanvasElement.prototype.getContext = () => null;
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  let hidden = false;
  Object.defineProperty(document, 'hidden', { get: () => hidden });
  t.after(() => { if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument; dom.window.close(); });
  const { model } = fixture();
  const speaker = new THREE.Mesh(new THREE.BoxGeometry(.1, .2, .1), new THREE.MeshStandardMaterial());
  speaker.name = 'Speaker_1_cabinet'; model.add(speaker);
  const props = createPropInteractions(model);
  props.entries.find(entry => entry.id === 'speakers').activate();
  assert.equal(document.querySelector('iframe'), null, 'opening the speakers makes no external media request');
  const play = [...document.querySelectorAll('button')].find(button => button.textContent === 'Play Sk8er Boi');
  assert.ok(play);
  const fallback = document.querySelector('a[href="https://www.youtube.com/watch?v=TIy3n2b7V9k"]');
  assert.ok(fallback, 'the official watch link is always available');
  assert.equal(fallback.target, '_blank');
  play.click();
  const frame = document.querySelector('iframe'), url = new URL(frame.src);
  assert.equal(url.origin, 'https://www.youtube-nocookie.com');
  assert.equal(url.pathname, '/embed/TIy3n2b7V9k');
  assert.equal(url.searchParams.get('autoplay'), '1');
  assert.equal(url.searchParams.get('controls'), '1', 'YouTube keeps its own pause, mute and volume controls');
  assert.match(frame.title, /Avril Lavigne.*Sk8er Boi/);
  assert.equal(props.update(.016), false, 'media never starts the scene render loop');
  props.suspendAudio();
  assert.equal(document.querySelector('iframe'), null);
  assert.equal(play.textContent, 'Play Sk8er Boi');
  play.click();
  document.querySelector('iframe').dispatchEvent(new dom.window.Event('error'));
  assert.equal(document.querySelector('iframe'), null);
  assert.match(document.querySelector('[role="status"]').textContent, /official YouTube link/);
  play.click(); hidden = true; document.dispatchEvent(new dom.window.Event('visibilitychange'));
  assert.equal(document.querySelector('iframe'), null, 'hidden rooms cannot keep playing');
  hidden = false; document.dispatchEvent(new dom.window.Event('visibilitychange'));
  assert.equal(document.querySelector('iframe'), null, 'returning to the page does not restart playback');
  play.click(); props.closeDialog();
  assert.equal(document.querySelector('iframe'), null);
  assert.equal(document.querySelector('dialog'), null);
  props.entries.find(entry => entry.id === 'speakers').activate();
  assert.equal(document.querySelector('iframe'), null, 'reopening starts silent');
  props.dispose(); props.dispose();
  assert.equal(document.querySelector('dialog'), null);
});

test('webcam leaves slide vertically behind the aperture and reverse without rotation or drift', () => {
  const { model } = fixture();
  refineComputers(model);
  const leaves = ['upper', 'lower'].map(side => model.getObjectByName(`Computers / Logitech Brio / privacy shutter ${side} leaf`));
  assert.ok(leaves.every(Boolean), 'the cover has separate upper and lower leaves');
  const body = model.getObjectByName('Computers / Logitech Brio / graphite rounded horizontal body');
  const closed = leaves.map(leaf => ({ parent: leaf.parent, position: leaf.position.clone(), matrix: leaf.matrixWorld.clone() }));
  const bodyMatrix = body.matrixWorld.clone();
  const actions = [];
  const props = createPropInteractions(model, { onAction: action => actions.push(action) });
  const entry = props.entries.find(item => item.id === 'webcam');
  assert.ok(entry, 'the webcam is a separately discoverable physical action');
  assert.deepEqual(props.webcam, { open: false, amount: 0 });
  entry.activate(); props.update(.1);
  const partial = leaves.map(leaf => leaf.position.y);
  assert.ok(partial[0] > closed[0].position.y && partial[1] < closed[1].position.y);
  entry.activate();
  assert.deepEqual(leaves.map(leaf => leaf.position.y), partial, 'reversing does not jump to an endpoint');
  settle(props);
  assert.deepEqual(props.webcam, { open: false, amount: 0 });
  leaves.forEach((leaf, i) => assert.deepEqual(leaf.position, closed[i].position));
  const center = body.getWorldPosition(new THREE.Vector3());
  const ray = new THREE.Raycaster(new THREE.Vector3(center.x - .2, center.y, center.z), new THREE.Vector3(1, 0, 0));
  const physicalHit = offsetY => {
    ray.ray.origin.y = center.y + offsetY;
    return ray.intersectObject(entry.objects[0], true).find(hit => hit.object.material.visible)?.object;
  };
  model.updateWorldMatrix(true, true);
  assert.equal(physicalHit(.001), leaves[0], 'closed upper leaf covers the lens');
  assert.equal(physicalHit(-.001), leaves[1], 'closed lower leaf covers the lens');
  entry.activate(); settle(props); model.updateWorldMatrix(true, true);
  assert.equal(props.webcam.open, true);
  assert.equal(physicalHit(0)?.name, 'Computers / Logitech Brio / dark glass lens', 'open leaves expose the real lens');
  for (const [i, direction] of [[0, 1], [1, -1]]) {
    const leaf = leaves[i];
    assert.ok(Math.abs(leaf.position.y - closed[i].position.y - direction * .0037) < 1e-10);
    assert.equal(physicalHit(direction * .0047), leaf, 'a pale leaf edge stays visible inside the aperture');
    assert.equal(physicalHit(direction * .007)?.name, 'Computers / Logitech Brio / recessed lens face', 'the extended leaf is hidden behind the surrounding face');
    leaf.matrixWorld.elements.forEach((value, j) => {
      if (j !== 13) assert.equal(value, closed[i].matrix.elements[j], 'all rotation and nonvertical translation stays unchanged');
    });
  }
  assert.deepEqual(body.matrixWorld.elements, bodyMatrix.elements, 'only the privacy cover moves');
  assert.deepEqual(actions, [], 'toggling does not open a portfolio page or modal');
  for (let i = 0; i < 20; i++) { entry.activate(); props.update(.016); }
  settle(props);
  assert.equal(props.webcam.open, true);
  props.dispose(); model.updateWorldMatrix(true, true);
  leaves.forEach((leaf, i) => {
    assert.equal(leaf.parent, closed[i].parent);
    assert.deepEqual(leaf.matrixWorld.elements, closed[i].matrix.elements);
  });
});

test('webcam touch target stays above the monitor and reduced motion releases the scheduler immediately', () => {
  const { model } = fixture();
  refineComputers(model);
  const props = createPropInteractions(model, { reducedMotion: true });
  const entry = props.entries.find(item => item.id === 'webcam');
  assert.ok(entry);
  const target = model.getObjectByName('Interactions / webcam touch target');
  assert.ok(target, 'a generous target supplements the tiny cover');
  const bounds = new THREE.Box3().setFromObject(target);
  assert.ok(bounds.min.y > 1.276, 'the invisible target cannot cover the monitor display');
  const ray = new THREE.Raycaster(new THREE.Vector3(bounds.min.x - .1, bounds.getCenter(new THREE.Vector3()).y, bounds.max.z - .002), new THREE.Vector3(1, 0, 0));
  assert.ok(ray.intersectObject(target).length, 'the extra space beside the body can be tapped');
  const screen = model.getObjectByName('Monitor_illuminated_display');
  ray.ray.origin.set(.5, screen.position.y, screen.position.z);
  assert.equal(ray.intersectObject(target).length, 0, 'a monitor click never hits the webcam target');
  assert.ok(ray.intersectObject(screen).length);
  entry.activate();
  assert.deepEqual(props.webcam, { open: true, amount: 1 });
  assert.equal(props.update(.016), false);
  entry.activate();
  assert.deepEqual(props.webcam, { open: false, amount: 0 });
  let disposals = 0; target.geometry.addEventListener('dispose', () => disposals++);
  props.dispose(); props.dispose();
  assert.equal(target.parent, null);
  assert.equal(disposals, 1);
});

test('wall guide reveals its invitation and opens the guide while reusing one texture', (t) => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => {
    const text = [];
    const context = new Proxy({ fillText: value => text.push(value) }, { get: (target, key) => target[key] ?? (() => {}) });
    return { width: 0, height: 0, text, getContext: () => context };
  } };
  t.after(() => { if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument; });
  const { model } = fixture();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(.12, 2.65, 4), new THREE.MeshStandardMaterial());
  wall.name = 'Shell_Right'; wall.position.set(2.06, 1.325, -1.95); model.add(wall);
  let invalidations = 0;
  const actions = [];
  const props = createPropInteractions(model, { invalidate: () => invalidations++, onAction: action => actions.push(action) });
  const entry = props.entries.find(item => item.id === 'wall-guide');
  assert.ok(entry, 'a discoverable guide action exists');
  const sign = entry.objects[0], face = model.getObjectByName('Interactions / wall guide printed face');
  const texture = face.material.map;
  assert.ok(texture.image.text.includes('CLICK ME'));
  assert.equal(sign.userData.guideExpanded, false);
  assert.ok(sign.position.x < 2 && sign.position.x > 1.97, 'sign sits just inside the measured right wall');
  assert.ok(sign.position.y - .3 > 1.3, 'sign clears the computer screens');
  const marker = texture.image.text.length;
  entry.activate();
  assert.equal(sign.userData.guideExpanded, true);
  assert.ok(texture.image.text.slice(marker).includes('Hi! I’m Hillman'));
  assert.ok(texture.image.text.slice(marker).some(line => line.includes('Experience')));
  assert.ok(texture.image.text.slice(marker).includes('Make your own house'));
  assert.equal(face.material.map, texture, 'opening the guide updates its existing texture');
  entry.activate();
  assert.equal(sign.userData.guideExpanded, true);
  assert.equal(invalidations, 2);
  assert.equal(props.update(.016), false, 'a static sign never keeps rendering');
  assert.deepEqual(actions, ['guide', 'guide'], 'every sign click can reopen the interactive guide');
  let disposals = 0; texture.addEventListener('dispose', () => disposals++);
  props.dispose(); props.dispose();
  assert.equal(disposals, 1);
});

test('accessory lids reverse without drift and disposal restores the original case geometry and parents', () => {
  const { model } = fixture();
  const airpods = new THREE.Group(); airpods.name = 'Storage / White AirPods Pro case'; model.add(airpods);
  const body = new THREE.Mesh(new THREE.BoxGeometry(.045, .033, .065), new THREE.MeshStandardMaterial());
  body.name = 'Storage / AirPods Pro charging case'; body.position.set(-.16, 1.039, .085); airpods.add(body);
  const original = body.geometry;
  const hugo = new THREE.Group(); hugo.name = 'Storage / Stacked red HUGO eyewear boxes'; model.add(hugo);
  const base = new THREE.Mesh(new THREE.BoxGeometry(.086, .041, .149), new THREE.MeshStandardMaterial());
  base.name = 'Storage / red HUGO case base'; base.position.set(.161, 1.091, .066); hugo.add(base);
  const originalBase = base.geometry;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(.09, .008, .153), new THREE.MeshStandardMaterial());
  lid.name = 'Storage / red HUGO hinged lid'; lid.position.set(.161, 1.112, .066); hugo.add(lid);
  const props = createPropInteractions(model);
  assert.notEqual(body.geometry, original);
  assert.notEqual(base.geometry, originalBase);
  model.updateWorldMatrix(true, true);
  const raycaster = new THREE.Raycaster(new THREE.Vector3(.161, 2, .066), new THREE.Vector3(0, -1, 0));
  assert.equal(raycaster.intersectObject(base).length, 0, 'open HUGO base has a real opening through its top surface');
  for (const id of ['hugo', 'airpods']) {
    const entry = props.entries.find(item => item.id === id);
    entry.activate(); props.update(.1); entry.activate(); settle(props);
  }
  assert.equal(model.getObjectByName('Interactions / HUGO lid').rotation.z, 0);
  assert.equal(model.getObjectByName('Interactions / AirPods hinge').rotation.z, 0);
  model.traverse(object => {
    const positions = object.geometry?.attributes.position;
    if (positions) assert.ok([...positions.array].every(Number.isFinite), object.name);
  });
  props.dispose(); props.dispose();
  assert.equal(body.geometry, original);
  assert.equal(base.geometry, originalBase);
  assert.equal(lid.parent, hugo);
  assert.equal(airpods.children.length, 1);
  assert.equal(hugo.children.length, 2);
  assert.equal(model.getObjectByName('Interactions / room discoveries'), undefined);
});
