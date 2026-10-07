import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from './vendor/build/three.core.js';
import { calculateRenderSize, fitCameraDistance } from './viewer-sizing.mjs';

// Use the shipped camera and orbit implementation, with only browser rendering
// and element measurements replaced. The app's actual resize/reset functions run.
const threeUrl = new URL('./vendor/build/three.core.js', import.meta.url).href;
const orbitSource = (await readFile(new URL('./vendor/examples/jsm/controls/OrbitControls.js', import.meta.url), 'utf8')).replace("from 'three'", `from '${threeUrl}'`);
const { OrbitControls } = await import(`data:text/javascript;base64,${Buffer.from(orbitSource).toString('base64')}`);
const interiorSource = (await readFile(new URL('./camera-interior.js', import.meta.url), 'utf8')).replace("from 'three'", `from '${threeUrl}'`);
const interior = await import(`data:text/javascript;base64,${Buffer.from(interiorSource).toString('base64')}`);
const appSource = (await readFile(new URL('./app.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '').replace('export function setLayout', 'function setLayout');

test('rotation preserves near/far zoom through real OrbitControls distance clamping', () => {
  let dimensions = { width: 390, height: 844 };
  const elements = new Map();
  const element = (name) => {
    if (!elements.has(name)) elements.set(name, {
      style: { setProperty() {} },
      getBoundingClientRect() {
        const portrait = dimensions.height > dimensions.width;
        return { ...dimensions, left: 0, top: name === '.bottom-ui' ? dimensions.height - (portrait ? 210 : 62) : 0, bottom: name === '.view-state' ? (portrait ? 114 : 94) : 78 };
      },
    });
    return elements.get(name);
  };
  const context = vm.createContext({
    THREE, OrbitControls, ...interior, calculateRenderSize, fitCameraDistance, structuredClone, performance, innerWidth: 1440,
    document: { getElementById: element, querySelector: element, querySelectorAll: () => [] },
    matchMedia: () => ({ matches: false }),
    getComputedStyle: () => ({ paddingLeft: '16', paddingRight: '16' }),
    window: { devicePixelRatio: 3 }, location: { protocol: 'file:' },
  });
  vm.runInContext(appSource, context);
  vm.runInContext(`
    renderer = { shadowMap: {}, setDrawingBufferSize() {} };
    renderLimits = { maxWidth: 8192, maxHeight: 8192 };
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(52);
    camera.position.set(-3, 3, 3);
    controls = new OrbitControls(camera, null);
    controls.addEventListener('change', constrainOverviewCamera);
    resize(); resetView(); controls.enableDamping = false;
  `, context);
  for (const initial of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    dimensions = initial;
    vm.runInContext('resize(); resetView(); controls.enableDamping = false', context);
    for (const bound of ['minDistance', 'maxDistance']) {
      vm.runInContext(`camera.position.sub(controls.target).setLength(controls.${bound}).add(controls.target); controls.update();`, context);
      const before = vm.runInContext('({ position: camera.position.clone(), min: controls.minDistance, max: controls.maxDistance })', context);
      dimensions = { width: initial.height, height: initial.width };
      vm.runInContext('resize()', context);
      dimensions = initial;
      vm.runInContext('resize()', context);
      const after = vm.runInContext('({ position: camera.position.clone(), min: controls.minDistance, max: controls.maxDistance })', context);
      assert.ok(before.position.distanceTo(after.position) < 1e-10, `${bound} camera position drifted`);
      assert.ok(Math.abs(before.min - after.min) < 1e-10);
      assert.ok(Math.abs(before.max - after.max) < 1e-10);
    }
  }
  dimensions = { width: 844, height: 390 };
  vm.runInContext('resize(); resetView()', context);
  assert.equal(vm.runInContext('controls.minDistance', context), .55);
});
