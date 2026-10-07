import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from './vendor/build/three.module.js';
import { createFrameScheduler } from './frame-scheduler.mjs';
import { calculateRenderSize, fitCameraDistance } from './viewer-sizing.mjs';

const threeURL = new URL('./vendor/build/three.module.js', import.meta.url).href;
async function productionModule(file) {
  const source = (await readFile(new URL(file, import.meta.url), 'utf8')).replace("from 'three'", `from '${threeURL}'`);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const cameraFocus = await productionModule('./camera-focus.js');
const cameraInterior = await productionModule('./camera-interior.js');
const { OrbitControls } = await productionModule('./vendor/examples/jsm/controls/OrbitControls.js');
const { refineComputers } = await productionModule('./computer-detail.js');
const { createPropInteractions } = await productionModule('./prop-interactions.js');
const app = (await readFile(new URL('./app.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '').replace('export function setLayout', 'function setLayout');
const frameStart = app.indexOf('scheduler = createFrameScheduler(');
const frameEnd = app.indexOf("document.addEventListener('visibilitychange'", frameStart);
assert(frameStart > 0 && frameEnd > frameStart, 'exercise the production render callback instead of a copied approximation');
const schedulerSetup = app.slice(frameStart, frameEnd);

function viewer() {
  const sent = [], elements = new Map(), pending = new Map();
  const dimensions = { width: 1440, height: 900 };
  let requestId = 0, time = 0;
  const element = name => {
    if (!elements.has(name)) elements.set(name, { hidden: false, style: { setProperty() {} }, classList: { remove() {} }, setAttribute() {}, getBoundingClientRect: () => ({ ...dimensions, left: 0, top: 0 }) });
    return elements.get(name);
  };
  const parent = { postMessage: message => sent.push(message) };
  const context = vm.createContext({
    THREE, OrbitControls, ...cameraFocus, ...cameraInterior, calculateRenderSize, fitCameraDistance, refineComputers, createPropInteractions,
    structuredClone, performance, innerWidth: 1440,
    createFrameScheduler: options => createFrameScheduler({ ...options, request: callback => { const id = ++requestId; pending.set(id, callback); return id; }, cancel: id => pending.delete(id) }),
    document: { body: { dataset: {} }, hidden: false, getElementById: element, querySelector: () => null, querySelectorAll: () => [] },
    matchMedia: () => ({ matches: false }), getComputedStyle: () => ({ getPropertyValue: () => '0' }),
    window: { parent, devicePixelRatio: 1 }, parent, location: { protocol: 'file:', origin: 'http://room.test' },
  });
  const run = code => vm.runInContext(code, context);
  run(app);
  run(`
    renderer = { renders: 0, shadowMap: {}, setDrawingBufferSize() {}, render() { this.renders++; model.updateWorldMatrix(true, true); } };
    renderLimits = { maxWidth: 8192, maxHeight: 8192 };
    scene = new THREE.Scene(); ground = new THREE.Object3D(); model = new THREE.Group();
    camera = new THREE.PerspectiveCamera(48, 1440/900, .025, 100);
    controls = new OrbitControls(camera, null); controls.enableDamping = false;
    const geometry = new THREE.PlaneGeometry(.5, .3);
    for (let i = 0; i < geometry.attributes.uv.count; i++) geometry.attributes.uv.setY(i, 1-geometry.attributes.uv.getY(i));
    const display = new THREE.Mesh(geometry); display.name = 'Monitor__illuminated_display';
    display.position.set(1.79, 1.1, -1.6); display.rotation.y = -Math.PI/2; model.add(display);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(.025,.35,.6)); housing.name = 'Monitor__rear_housing';
    housing.position.set(1.82,1.1,-1.6); model.add(housing);
    refineComputers(model);
    props = createPropInteractions(model, { invalidate });
    for (const entry of props.entries) { entries.set(entry.id, entry); for (const object of entry.objects) actionObjects.set(object, entry); }
    viewport = { width: 1440, height: 900 };
    const pose = poseFor('projects'); activeScreen = pose.screen;
    camera.position.copy(pose.position); camera.quaternion.copy(pose.quaternion); camera.up.copy(pose.up); camera.fov = pose.fov; camera.updateProjectionMatrix();
    model.updateWorldMatrix(true,true); view = 'focused'; loadFinished = true; hostPaused = true; setInputPaused(true);
  `);
  run(schedulerSetup);
  run('scheduler.setPaused(true)');
  const dispatch = (overrides = {}) => {
    context.testEvent = { origin: 'http://room.test', source: parent, data: { source: 'hillman-portfolio', type: 'command', command: 'webcam' }, ...overrides };
    run('receiveCommand(testEvent)');
  };
  const tick = () => {
    const next = pending.entries().next().value;
    if (!next) return false;
    pending.delete(next[0]); time += 1000 / 60; next[1](time); return true;
  };
  const settle = () => {
    for (let i = 0; i < 120 && pending.size; i++) tick();
    assert.equal(pending.size, 0, 'the webcam returns the shared scheduler to idle');
    assert.equal(run('scheduler.pending'), false);
  };
  return { run, dispatch, tick, settle, sent, dimensions, parent };
}

test('only the authenticated parent may toggle a visible webcam through a paused computer page', () => {
  const { run, dispatch, sent } = viewer();
  assert(run('projectedWebcam()'), 'fixture exposes the real webcam beside the monitor');
  for (const event of [
    { origin: 'https://untrusted.example' }, { source: {} },
    { data: null }, { data: 'webcam' }, { data: [] },
    { data: { source: 'other', type: 'command', command: 'webcam' } },
    { data: { source: 'hillman-portfolio', type: 'action', command: 'webcam' } },
    { data: { source: 'hillman-portfolio', type: 'command', command: 'unknown' } },
  ]) {
    dispatch(event);
    assert.equal(run('props.webcam.open'), false);
    assert.equal(run('scheduler.pending'), false);
  }
  assert.equal(sent.length, 0);
});

test('webcam commands reject unpaused, hidden, occluded and transitioning scene states', () => {
  for (const state of [
    'hostPaused=false', 'activeScreen=null', 'cameraTransition={}', 'document.hidden=true',
    "entries.get('webcam').objects[0].position.z += 10; model.updateWorldMatrix(true,true)",
    `const blocker = new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.12));
      blocker.position.copy(model.getObjectByName('Computers / Logitech Brio / graphite rounded horizontal body').getWorldPosition(new THREE.Vector3())).lerp(camera.position,.5);
      model.add(blocker); model.updateWorldMatrix(true,true);`,
  ]) {
    const { run, dispatch } = viewer();
    run(state); dispatch();
    assert.equal(run('props.webcam.open'), false, state);
    assert.equal(run('scheduler.pending'), false, state);
  }
});

test('a valid webcam command animates only its cover without unlocking input or moving the camera, then becomes idle', () => {
  const { run, dispatch, tick, settle, sent } = viewer();
  const camera = run('camera.position.toArray().concat(camera.quaternion.toArray(),camera.up.toArray(),camera.fov)');
  dispatch();
  assert.equal(run('props.webcam.open'), true);
  assert.equal(run('hostPaused && inputPaused && !controls.enabled'), true);
  assert.equal(sent.at(-1).type, 'screen');
  assert.equal(sent.at(-1).webcam.open, true);
  for (let i = 0; i < 6; i++) tick();
  assert(run('props.webcam.amount > 0 && props.webcam.amount < 1'));
  const partial = run('props.webcam.amount');
  dispatch();
  assert.equal(run('props.webcam.amount'), partial, 'rapid clicks reverse from the visible intermediate position');
  settle();
  assert.equal(run('props.webcam.amount'), 0);
  assert.equal(run('props.webcam.open'), false);
  assert.deepEqual(run('camera.position.toArray().concat(camera.quaternion.toArray(),camera.up.toArray(),camera.fov)'), camera);
  assert.equal(run('hostPaused && inputPaused && !controls.enabled'), true);
  assert.equal(run("activateEntry('projects')"), false, 'general scene picking remains locked');
  dispatch(); settle();
  assert.equal(run('props.webcam.amount'), 1);
  assert.deepEqual(run('camera.position.toArray().concat(camera.quaternion.toArray(),camera.up.toArray(),camera.fov)'), camera);
  assert(run('metrics.frames > 0 && metrics.frames < 90'));
});

test('project resizing retains the extra top space and re-emits a visible webcam target', () => {
  const { run, dimensions, sent } = viewer();
  for (const [width, height] of [[390,844], [844,390], [1440,900]]) {
    dimensions.width = width; dimensions.height = height; run('resize()');
    assert.equal(sent.at(-1).type, 'screen');
    assert.equal(sent.at(-1).action, 'projects');
    assert(sent.at(-1).webcam, 'the monitor webcam remains reachable after resize');
    const { x, y, width: w, height: h } = sent.at(-1).webcam.rect;
    assert(x >= 0 && y >= 0 && x + w <= 1 && y + h <= 1);
    assert(run("camera.position.distanceTo(computerPose(activeScreen.frame,'projects').position) < 1e-9"), 'resize uses the Projects framing reservation');
  }
});
