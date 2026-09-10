import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

function setup() {
  const dom = new JSDOM('<!doctype html><canvas id="stage"></canvas><button id="nav">Cashier</button><a href="#bar">Bar</a><input><textarea></textarea><select><option>Drink</option></select><div contenteditable="true" tabindex="0"><span>Editable</span></div>',
    { url: 'https://casino.test/lobby-3d/', runScripts: 'outside-only' });
  const { window } = dom, context = dom.getInternalVMContext();
  let now = 0, nextFrame;
  window.matchMedia = () => ({ matches: false });
  window.requestAnimationFrame = fn => { nextFrame = fn; };
  Object.defineProperty(window.performance, 'now', { value: () => now });
  const load = file => vm.runInContext(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), context, { filename: file });
  load('vendor/three-0.149.0.min.js');
  window.THREE.WebGLRenderer = class {
    constructor() { this.shadowMap = {}; }
    setPixelRatio() {}
    setSize() {}
    render(scene, camera) { scene.updateMatrixWorld(); camera.updateMatrixWorld(); }
  };
  window.CASINO = {
    floorplan: { WALK_RECTS: [{ id: 'floor', x0: -100, x1: 100, z0: -100, z1: 100 }], ZONES: [], EYE: 1.65 },
    world: { gateOpen: true, obstacles: [], anchors: [] },
  };
  load('src/engine/app.js');
  const app = window.CASINO.app, T = window.THREE;
  app.init();
  const frame = (ms = 50) => { now += ms; const callback = nextFrame; nextFrame = null; callback(now); };
  const key = (code, { type = 'keydown', target = window.document.activeElement, ...options } = {}) => {
    const event = new window.KeyboardEvent(type, { code, bubbles: true, cancelable: true, ...options });
    target.dispatchEvent(event); return event;
  };
  function start(yaw = 0) {
    window.dispatchEvent(new window.Event('blur'));
    Object.assign(app.player, { x: 0, z: 0, yaw, pitch: 0.3 }); frame(0);
  }
  start();
  return { window, dom, app, T, frame, key, start, distance: () => Math.hypot(app.player.x, app.player.z) };
}

test('WASD and arrow movement follows the real camera forward/right axes at every heading', () => {
  const h = setup();
  try {
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.73, -2.1]) {
      for (const [code, axis, sign] of [
        ['KeyW', 'forward', 1], ['KeyS', 'forward', -1], ['KeyD', 'right', 1], ['KeyA', 'right', -1],
        ['ArrowUp', 'forward', 1], ['ArrowDown', 'forward', -1], ['ArrowRight', 'right', 1], ['ArrowLeft', 'right', -1],
      ]) {
        h.start(yaw);
        const expected = axis === 'forward' ? h.app.camera.getWorldDirection(new h.T.Vector3())
          : new h.T.Vector3(1, 0, 0).applyQuaternion(h.app.camera.getWorldQuaternion(new h.T.Quaternion()));
        expected.y = 0; expected.normalize().multiplyScalar(sign);
        h.key(code); h.frame();
        const actual = new h.T.Vector3(h.app.player.x, 0, h.app.player.z);
        assert.ok(actual.clone().normalize().distanceTo(expected) < 1e-8, `${code} at yaw ${yaw} follows camera ${axis}`);
        assert.ok(Math.abs(actual.length() - 3.2 * 0.05) < 1e-8);
      }
    }
  } finally { h.dom.window.close(); }
});

test('diagonal movement is normalized and opposite steering keys cancel', () => {
  const h = setup();
  try {
    h.key('KeyW'); h.key('KeyD'); h.frame();
    assert.ok(Math.abs(h.distance() - 0.16) < 1e-8);
    h.start(); h.key('KeyW'); h.key('KeyS'); h.key('KeyA'); h.key('KeyD'); h.frame();
    assert.equal(h.distance(), 0);
  } finally { h.dom.window.close(); }
});

test('Shift runs faster while buttons/links retain focus and native activation keys', () => {
  const h = setup();
  try {
    for (const selector of ['button', 'a']) for (const code of ['ShiftLeft', 'ShiftRight']) {
      h.start(); const control = h.window.document.querySelector(selector); control.focus();
      assert.equal(h.key('Enter').defaultPrevented, false);
      assert.equal(h.key('Space').defaultPrevented, false);
      h.key(code, { shiftKey: true }); h.key('KeyW', { shiftKey: true }); h.frame();
      assert.ok(Math.abs(h.distance() - 0.16 * 1.8) < 1e-8, selector + ': Shift runs after navigation focus');
    }
    h.start(); h.key('KeyE'); h.key('KeyW'); h.frame();
    assert.ok(Math.abs(h.distance() - 0.16) < 1e-8, 'E is not an undocumented run modifier');
  } finally { h.dom.window.close(); }
});

test('typing and editable arrow navigation are never captured, including nested editable elements', () => {
  const h = setup();
  try {
    for (const selector of ['input', 'textarea', 'select', '[contenteditable]']) {
      h.start(); const field = h.window.document.querySelector(selector); field.focus();
      const target = field.querySelector('span') || field;
      h.key('KeyW', { target });
      assert.equal(h.key('ArrowRight', { target }).defaultPrevented, false, selector);
      h.key('ShiftLeft', { target, shiftKey: true }); h.frame();
      assert.equal(h.distance(), 0, selector + ': editing does not move the camera');
    }
  } finally { h.dom.window.close(); }
});

test('steering arrows prevent scrolling and focus/blur clears held movement and sprint', () => {
  const h = setup();
  try {
    assert.equal(h.key('ArrowRight').defaultPrevented, true);
    h.frame(); assert.ok(h.distance() > 0);
    h.window.document.querySelector('input').focus();
    const stopped = h.distance(); h.frame();
    assert.equal(h.distance(), stopped, 'focus entering an editor stops previously held movement');
    h.window.document.querySelector('button').focus(); h.start();
    h.key('ShiftLeft', { shiftKey: true }); h.key('KeyW', { shiftKey: true });
    h.window.dispatchEvent(new h.window.Event('blur')); h.frame();
    assert.equal(h.distance(), 0);
    h.key('KeyW'); h.frame();
    assert.ok(Math.abs(h.distance() - 0.16) < 1e-8, 'blur also clears sprint state');
  } finally { h.dom.window.close(); }
});

test('Shift state is recovered from the movement event after leaving a text field', () => {
  const h = setup();
  try {
    h.window.document.querySelector('input').focus();
    h.key('ShiftLeft', { shiftKey: true });
    h.window.document.querySelector('button').focus();
    h.key('KeyW', { shiftKey: true }); h.frame();
    assert.ok(Math.abs(h.distance() - 0.16 * 1.8) < 1e-8);
    h.key('ShiftLeft', { type: 'keyup', shiftKey: false });
    const prior = h.distance(); h.frame();
    assert.ok(Math.abs(h.distance() - prior - 0.16) < 1e-8, 'releasing Shift resumes walk speed');
  } finally { h.dom.window.close(); }
});
