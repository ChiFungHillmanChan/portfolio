import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from './vendor/build/three.module.js';
import { calculateRenderSize, fitCameraDistance } from './viewer-sizing.mjs';

const threeUrl = new URL('./vendor/build/three.module.js', import.meta.url).href;
async function productionModule(file) {
  const source = (await readFile(new URL(file, import.meta.url), 'utf8')).replace("from 'three'", `from '${threeUrl}'`);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const focus = await productionModule('./camera-focus.js');
const interior = await productionModule('./camera-interior.js');
const { OrbitControls } = await productionModule('./vendor/examples/jsm/controls/OrbitControls.js');
const app = (await readFile(new URL('./app.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '').replace('export function setLayout', 'function setLayout');

function viewer() {
  const sent = [], elements = new Map();
  const dimensions = { width: 1440, height: 900 };
  const element = (name) => {
    if (!elements.has(name)) elements.set(name, { hidden: true, style: { setProperty() {} }, classList: { remove() {} }, setAttribute() {}, getBoundingClientRect: () => ({ ...dimensions, left: 0, top: 0 }) });
    return elements.get(name);
  };
  const parent = { postMessage: (message) => sent.push(message) };
  const context = vm.createContext({
    THREE, OrbitControls, ...focus, ...interior, calculateRenderSize, fitCameraDistance, structuredClone, performance, innerWidth: 1440,
    document: { body: { dataset: {} }, hidden: false, getElementById: element, querySelector: () => null, querySelectorAll: () => [] },
    matchMedia: () => ({ matches: false }), getComputedStyle: () => ({ getPropertyValue: () => '0' }),
    window: { parent, devicePixelRatio: 1 }, parent, location: { protocol: 'file:', origin: 'http://room.test' },
  });
  vm.runInContext(app, context);
  vm.runInContext(`
    renderer = { renders: 0, shadowMap: {}, setDrawingBufferSize() {}, render() { this.renders++; } };
    renderLimits = { maxWidth: 8192, maxHeight: 8192 };
    scene = new THREE.Scene(); ground = new THREE.Object3D(); model = new THREE.Group();
    camera = new THREE.PerspectiveCamera(52); camera.position.set(-3, 3, 3);
    controls = new OrbitControls(camera, null);
    controls.addEventListener('change', () => { if(view === 'overview' && !cameraTransition) constrainOverviewCamera(); });
    scheduler = { invalidate() {}, setPaused() {} };
    const screenGeometry = new THREE.PlaneGeometry(.5, .3);
    for (let i = 0; i < screenGeometry.attributes.uv.count; i++) screenGeometry.attributes.uv.setY(i, 1 - screenGeometry.attributes.uv.getY(i));
    const screen = new THREE.Mesh(screenGeometry); screen.name = 'Laptop__illuminated_document'; screen.position.set(1.7, 1.1, -2); screen.rotation.y = -Math.PI / 2; model.add(screen);
    const drawer = new THREE.Mesh(new THREE.BoxGeometry(.2, .2, .2)); drawer.position.set(1.4, .8, -2.5); model.add(drawer);
    entries.set('experience', {objects:[screen], activate:() => openAction('experience')});
    entries.set('fabric-5', {objects:[drawer], activate() {}});
    loadFinished = true; resize(); resetView(); controls.enableDamping = false;
  `, context);
  const run = (code) => vm.runInContext(code, context);
  const settle = () => run(`for (let i=0; i<35; i++) { updateCameraTransition(.1); if(afterFocusRender){ const callback=afterFocusRender; afterFocusRender=null; callback(); } }`);
  return { context, sent, run, settle, dimensions };
}

test('screen messages wait for camera completion and closing content restores a previous physical focus before Back restores the room', () => {
  const { run, settle, sent } = viewer();
  const overview = run('captureCamera()');
  run("activateEntry('fabric-5')"); settle();
  const drawer = run('captureCamera()');
  run("activateEntry('experience')");
  assert.equal(sent.length, 0);
  run('updateCameraTransition(.1)'); assert.equal(sent.length, 0);
  settle();
  assert.deepEqual(sent.map((message) => message.type), ['screen', 'action']);
  assert.equal(sent[0].action, 'experience');
  assert.ok(sent[0].rect.x >= 0 && sent[0].rect.x + sent[0].rect.width <= 1);
  run('restoreCamera()'); settle();
  const after = run('captureCamera()');
  assert.ok(after.position.distanceTo(drawer.position) < 1e-9);
  assert.ok(after.quaternion.angleTo(drawer.quaternion) < 1e-7);
  assert.ok(after.up.distanceTo(drawer.up) < 1e-9);
  assert.equal(after.action, 'fabric-5');
  run('returnToRoom()'); settle();
  const returned = run('captureCamera()');
  assert.ok(returned.position.distanceTo(overview.position) < 1e-9);
  assert.equal(returned.view, 'overview');
  assert.equal(returned.action, null);
});

test('rotating while the host pauses a screen renders its new fit and publishes a matching rectangle', () => {
  const { run, settle, sent, dimensions } = viewer();
  run("activateEntry('experience')"); settle();
  run("receiveCommand({origin:location.origin,source:parent,data:{source:'hillman-portfolio',type:'command',command:'pause'}})");
  const before = run('renderer.renders');
  dimensions.width = 390; dimensions.height = 844;
  run('resize()');
  assert.equal(run('hostPaused'), true);
  assert.equal(run('renderer.renders'), before + 1);
  assert.equal(sent.at(-1).type, 'screen');
  const { x, y, width, height } = sent.at(-1).rect;
  assert.ok(x >= 0 && y >= 0 && x + width <= 1 && y + height <= 1);
  assert.ok(Math.abs(width - .9) < 1e-6);
});

test('device rotation during a return tween updates its destination and does not jump on the next resize', () => {
  const { run, settle, dimensions } = viewer();
  run("activateEntry('experience')"); settle();
  run('restoreCamera();updateCameraTransition(.1)');
  dimensions.width = 390; dimensions.height = 844; run('resize()'); settle();
  const returned = run('captureCamera()');
  run('resize()');
  assert.ok(run('camera.position.clone()').distanceTo(returned.position) < 1e-9);
  assert.equal(run('previousFit'), run('overviewDistance()'));
});

test('focus consumes outstanding orbit damping without changing the visible return pose', () => {
  const { run, settle } = viewer();
  // These are the shipped OrbitControls accumulators that a fast drag leaves.
  run('controls.enableDamping=true;controls._sphericalDelta.theta=.24;controls._sphericalDelta.phi=.035;controls._panOffset.set(.02,0,0);controls.update()');
  const visible = run('captureCamera()');
  run("activateEntry('experience')"); settle(); run('restoreCamera()'); settle();
  run('for(let i=0;i<80;i++)controls.update()');
  assert.ok(run('camera.position.clone()').distanceTo(visible.position) < 1e-9);
  assert.ok(run('controls.target.clone()').distanceTo(visible.target) < 1e-9);
});

test('webcam focus shows the small privacy cover close up and can return to the room', () => {
  const { run, settle } = viewer();
  run(`
    const webcam = new THREE.Mesh(new THREE.BoxGeometry(.06, .06, .10));
    webcam.position.set(1.84, 1.31, -1.59); model.add(webcam);
    entries.set('webcam', {objects:[webcam], activate() {}});
  `);
  const overview = run('captureCamera()');
  run("activateEntry('webcam')"); settle();
  assert.ok(run("camera.position.distanceTo(objectCenter('webcam'))") < .6, 'small webcam is framed close enough to see its cover');
  assert.ok(run("camera.position.x < objectCenter('webcam').x"), 'look at the front of the webcam');
  assert.equal(run("$('back-to-room').hidden"), false);
  run('returnToRoom()'); settle();
  assert.ok(run('camera.position.clone()').distanceTo(overview.position) < 1e-9);
});

test('return control is hidden during general exploration and visible only after focusing an object', () => {
  const { run, settle } = viewer();
  run("setView('overview')");
  assert.equal(run("$('back-to-room').hidden"), true);
  run('camera.position.set(.6,1.5,-.5);controls.update()');
  assert.equal(run("$('back-to-room').hidden"), true, 'orbiting does not create an object focus');
  run("activateEntry('fabric-5')"); settle();
  assert.equal(run("$('back-to-room').hidden"), false);
  run('returnToRoom()'); settle();
  assert.equal(run("$('back-to-room').hidden"), true);
  // A host computer page supplies its own accessible copy while the iframe is inert.
  run("activateEntry('experience')"); settle();
  run('hostPaused=true;setInputPaused(true)');
  assert.equal(run("$('back-to-room').hidden"), true);
  run('hostPaused=false;setInputPaused(false)');
  assert.equal(run("$('back-to-room').hidden"), false);
});

test('initial overview starts at standing eye height with a near-level gaze', () => {
  const { run } = viewer();
  assert.ok(run('camera.position.y >= 1.5 && camera.position.y <= 1.65'));
  const direction = run('camera.getWorldDirection(new THREE.Vector3())');
  assert.ok(direction.y < 0 && direction.y > -.18, 'initial gaze looks gently into the room instead of down from above');
});

test('overview, focused camera paths, and orbit limits stay inside the unchanged room shell', () => {
  const { run, settle, dimensions } = viewer();
  const inside = () => assert.equal(run('camera.position.x >= .075 && camera.position.x <= roomLayout.width-.075 && camera.position.y >= .075 && camera.position.y <= roomLayout.height-.075 && camera.position.z <= -.075 && camera.position.z >= -roomLayout.depth+.075'), true);
  inside();
  dimensions.width = 390; dimensions.height = 844; run('resize()'); inside();
  run("activateEntry('fabric-5')");
  for (let i = 0; i < 40; i++) { run('updateCameraTransition(.04)'); inside(); }
  settle(); run('returnToRoom()'); settle(); inside();
  run('camera.position.set(-20,20,20);constrainOverviewCamera()'); inside();
  assert.equal(run('camera.position.x >= .1 && camera.position.y >= 1.4'), true);
  run("shells.push({object:new THREE.Object3D(),side:'ceiling'});updateWalls()");
  assert.equal(run('shells.at(-1).object.visible'), true, 'the ceiling never cuts away around an interior camera');
});

test('door focus stays in the clear aisle independent of the previous camera direction', () => {
  const { run, dimensions } = viewer();
  run("const door = new THREE.Mesh(new THREE.BoxGeometry(.035,2.2,.8));door.position.set(.04,1.1,-.5);model.add(door);entries.set('door',{objects:[door]})");
  dimensions.width = 390; dimensions.height = 844; run('resize()');
  const first = run("physicalPose('door')");
  run('camera.position.set(.3,2.3,-3.5);camera.lookAt(1.8,.7,-3.7)');
  const second = run("physicalPose('door')");
  assert.ok(first.position.distanceTo(second.position) < 1e-12);
  assert.ok(first.quaternion.angleTo(second.quaternion) < 1e-7);
  assert.ok(first.position.x <= 1.15 && first.position.z > -.9, 'camera cannot retreat into the wardrobe');
});

test('portrait wardrobe focus keeps its camera behind the entrance door sweep', () => {
  const { run, dimensions } = viewer();
  run(`
    const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(.6,2.3,1.1));
    wardrobe.position.set(1.7,1.15,-.6); model.add(wardrobe);
    entries.set('wardrobe-left',{objects:[wardrobe]});
  `);
  dimensions.width = 390; dimensions.height = 844; run('resize()');
  const pose = run("physicalPose('wardrobe-left')");
  // Measured closed/ajar entrance leaf occupies z=-.89..-.096, x=-.027...229.
  const entranceSweep = new THREE.Box3(new THREE.Vector3(-.027,0,-.89), new THREE.Vector3(.229,2.1,-.096)).expandByScalar(.075);
  assert.equal(entranceSweep.containsPoint(pose.position), false);
  assert.ok(pose.position.z <= -1.15, 'portrait fitting cannot back the eye into the open entrance leaf');
  assert.ok(pose.position.x >= .35 && pose.position.x <= .5, 'eye stays in the aisle, clear of the wardrobe itself');
});
