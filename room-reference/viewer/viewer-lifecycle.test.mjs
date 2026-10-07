import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from './vendor/build/three.module.js';
import { calculateRenderSize } from './viewer-sizing.mjs';

// Run the production lifecycle and staged loader with controllable browser
// frames/network completion. Geometry/material disposal uses real Three objects.
const app = (await readFile(new URL('./app.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/gm, '').replace('export function setLayout', 'function setLayout');
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

function viewer({ holdDownload = false, holdCompile = false } = {}) {
  const events = new Map(), elements = new Map(), frames = new Map(), sent = [], errors = [], stages = [];
  const download = deferred(), compile = deferred(), dimensions = { width: 1440, height: 900 };
  const counts = { abort: 0, render: 0, rendererDispose: 0, geometryDispose: 0, materialDispose: 0, textureDispose: 0, audioPause: 0, schedulerDispose: 0 };
  let frameId = 0;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: new THREE.Texture() }));
  mesh.geometry.addEventListener('dispose', () => counts.geometryDispose++);
  mesh.material.addEventListener('dispose', () => counts.materialDispose++);
  mesh.material.map.addEventListener('dispose', () => counts.textureDispose++);
  const loaded = new THREE.Group(); loaded.add(mesh);
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      hidden: false, textContent: '', style: {}, classList: { remove() {} }, append() {},
      getBoundingClientRect: () => ({ ...dimensions }),
      addEventListener: (type, callback) => events.set(`${id}:${type}`, callback),
      removeEventListener: (type, callback) => { if (events.get(`${id}:${type}`) === callback) events.delete(`${id}:${type}`); },
    });
    return elements.get(id);
  };
  const parent = { postMessage: message => sent.push(message) };
  const window = {
    parent, devicePixelRatio: 1,
    addEventListener: (type, callback) => events.set(`window:${type}`, callback),
    removeEventListener: (type, callback) => { if (events.get(`window:${type}`) === callback) events.delete(`window:${type}`); },
    visualViewport: { removeEventListener() {} },
  };
  const renderer = {
    shadowMap: {}, capabilities: { getMaxAnisotropy: () => 4 },
    drawingBuffers: [], setDrawingBufferSize(...size) { this.drawingBuffers.push(size); },
    initTexture() {}, compileAsync() { stages.push('compile'); return holdCompile ? compile.promise : Promise.resolve(); },
    render() { counts.render++; }, dispose() { counts.rendererDispose++; },
  };
  class LoadingManager extends THREE.LoadingManager {
    constructor() { super(); const abort = this.abort.bind(this); this.abort = () => { counts.abort++; return abort(); }; }
  }
  class GLTFLoader { loadAsync() { return holdDownload ? download.promise : Promise.resolve({ scene: loaded }); } }
  const context = vm.createContext({
    THREE: { ...THREE, LoadingManager }, GLTFLoader, calculateRenderSize, structuredClone, performance, innerWidth: 1440,
    console: { error: error => errors.push(error), log() {} }, window, parent,
    document: { hidden: false, body: { dataset: {} }, getElementById: element, querySelector: () => null, removeEventListener() {} },
    location: { protocol: 'file:', origin: 'http://room.test' },
    matchMedia: () => ({ matches: false }), getComputedStyle: () => ({ getPropertyValue: () => '0' }),
    requestAnimationFrame: callback => { const id = ++frameId; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id), clearTimeout() {},
    ROOM_CONFIG: {}, ROOM_FEATURES: { characterRoutine: false },
    ...Object.fromEntries(['applyLayout', 'tidyRoom', 'closeEntranceDoor', 'refineWindow', 'refineDesk', 'refineComputers', 'addStorage', 'addChair', 'addBed', 'refineWardrobe'].map(name => [name, () => stages.push(name)])),
    createFurnitureInteractions: () => ({ entries: [], dispose() {} }),
    createPropInteractions: () => ({ entries: [], setLighting() {}, suspendAudio() { counts.audioPause++; }, dispose() {} }),
    batchStaticSiblings: () => ({}),
    fixtureRenderer: renderer, fixtureCounts: counts,
  });
  const run = source => vm.runInContext(source, context);
  run(app);
  run(`
    renderer = fixtureRenderer; scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(74, 1.6);
    controls = { enabled: true, dispose() {} }; renderLimits = { maxWidth: 8192, maxHeight: 8192 };
    scheduler = { paused: false, invalidate() {}, setPaused(value) { this.paused = value; }, dispose() { fixtureCounts.schedulerDispose++; } };
    props = { suspendAudio() { fixtureCounts.audioPause++; }, dispose() {} };
    setLayout = () => {}; updateWalls = () => {};
  `);
  // Register exactly the application's event handlers, without constructing WebGL.
  for (const pattern of [/window\.addEventListener\('pagehide'.*;/, /canvas\.addEventListener\('webglcontextlost'.*;/]) {
    const registration = app.match(pattern)?.[0]; assert(registration, 'production lifecycle handler exists'); run(registration);
  }
  const tick = async () => {
    const next = frames.entries().next().value;
    if (next) { frames.delete(next[0]); next[1](performance.now()); }
    await flush();
  };
  const settle = async () => { for (let i = 0; i < 20 && frames.size; i++) await tick(); };
  const hide = () => events.get('window:pagehide')({ persisted: true });
  const loseContext = () => events.get('scene:webglcontextlost')({ preventDefault() {} });
  const resume = () => run("receiveCommand({origin:location.origin,source:parent,data:{source:'hillman-portfolio',type:'command',command:'resume'}})");
  return { run, counts, renderer, loaded, sent, errors, stages, frames, dimensions, download, compile, tick, settle, hide, loseContext, resume };
}

test('a CSS-hidden zero-size room retains its camera and drawing buffer until it is visible again', () => {
  const { run, dimensions, renderer } = viewer();
  run('resize()'); const before = run('camera.projectionMatrix.elements.slice()');
  dimensions.width = 0; dimensions.height = 0; run('resize()');
  assert.equal(renderer.drawingBuffers.length, 1, 'hidden iframe must not allocate a 1×1 buffer');
  assert.deepEqual(run('camera.projectionMatrix.elements.slice()'), before);
  dimensions.width = 390; dimensions.height = 844; run('resize()');
  assert.equal(renderer.drawingBuffers.length, 2, 'showing the room resizes normally');
});

for (const completedFrames of [0, 1, 2, 3, 4, 5]) {
  test(`pagehide cancels preparation after ${completedFrames} frames and disposes detached model resources`, async () => {
    const subject = viewer(); const loading = subject.run('loadModel()'); await flush();
    for (let i = 0; i < completedFrames; i++) await subject.tick();
    const countBeforeHide = subject.stages.length;
    subject.hide(); subject.hide();
    assert.equal(subject.frames.size, 0, 'pagehide cancels every pending preparation frame');
    await loading;
    assert.equal(subject.stages.length, countBeforeHide, 'no preparation continues after disposal');
    assert.equal(subject.counts.geometryDispose, 1);
    assert.equal(subject.counts.materialDispose, 1);
    assert.equal(subject.counts.textureDispose, 1);
    assert.equal(subject.counts.rendererDispose, 1, 'cleanup is idempotent');
    assert.equal(subject.counts.schedulerDispose, 1);
    assert.equal(subject.sent.some(message => message.type === 'ready'), false);
    assert.deepEqual(subject.errors, []);
  });
}

test('pagehide aborts an owned model request and suppresses its expected rejection', async () => {
  const subject = viewer({ holdDownload: true }); const loading = subject.run('loadModel()');
  subject.hide(); subject.hide();
  assert.equal(subject.counts.abort, 1);
  subject.download.reject(new DOMException('Stopped loading', 'AbortError')); await loading;
  assert.deepEqual(subject.errors, []);
  assert.equal(subject.sent.some(message => message.type === 'error'), false);
});

test('a model that finishes decoding after pagehide is released without initialization', async () => {
  const subject = viewer({ holdDownload: true }); const loading = subject.run('loadModel()');
  subject.hide(); subject.download.resolve({ scene: subject.loaded }); await loading;
  assert.equal(subject.counts.geometryDispose, 1);
  assert.equal(subject.counts.materialDispose, 1);
  assert.equal(subject.counts.textureDispose, 1);
  assert.deepEqual(subject.stages, []);
  assert.equal(subject.frames.size, 0);
});

test('context loss during shader compilation pauses the room and cannot become ready or resume', async () => {
  const subject = viewer({ holdCompile: true }); const loading = subject.run('loadModel()'); await flush();
  await subject.settle(); assert(subject.stages.includes('compile'));
  subject.loseContext(); subject.resume();
  assert.equal(subject.run('scheduler.paused'), true);
  assert.equal(subject.run('controls.enabled'), false);
  assert.equal(subject.counts.audioPause, 1);
  subject.compile.resolve(); await flush(); await subject.settle(); await loading;
  assert.equal(subject.counts.render, 0, 'late compile does not draw into a failed renderer');
  assert.equal(subject.sent.some(message => message.type === 'ready'), false);
  assert.equal(subject.sent.filter(message => message.type === 'error').length, 1);
});

test('ordinary preparation still sends ready exactly once and remains resumable', async () => {
  const subject = viewer(); const loading = subject.run('loadModel()'); await flush(); await subject.settle(); await loading;
  assert.equal(subject.sent.filter(message => message.type === 'ready').length, 1);
  assert.equal(subject.counts.render, 1);
  subject.resume(); assert.equal(subject.run('scheduler.paused'), false);
});
