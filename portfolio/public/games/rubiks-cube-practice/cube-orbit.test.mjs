import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

let source = '';
try { source = await readFile(new URL('./cube-orbit.js', import.meta.url), 'utf8'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const { resolveCubeView, orbitCubeView, createCubeOrbit } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

// Node has no pointer-enabled canvas. Use a real EventTarget for dispatch while
// representing only the browser's pointer capture and style boundaries here.
function orbitCanvas() {
  const canvas = new EventTarget();
  canvas.style = { touchAction: 'pan-y', cursor: 'crosshair' };
  canvas.captured = new Set();
  canvas.setPointerCapture = id => canvas.captured.add(id);
  canvas.hasPointerCapture = id => canvas.captured.has(id);
  canvas.releasePointerCapture = id => canvas.captured.delete(id);
  canvas.focus = () => {};
  canvas.send = (type, fields = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: 1, button: 0, clientX: 0, clientY: 0, isPrimary: true }, fields);
    canvas.dispatchEvent(event);
    return event;
  };
  return canvas;
}

function orbitSession(initialView = 'front') {
  const canvas = orbitCanvas();
  let view = initialView;
  let updates = 0;
  const orbit = createCubeOrbit(canvas, { getView: () => view, onChange: next => { view = next; updates += 1; } });
  return { canvas, orbit, get view() { return view; }, get updates() { return updates; } };
}

test('orbit angles preserve the default perspective and safely inspect both poles', () => {
  assert.equal(typeof resolveCubeView, 'function');
  assert.equal(typeof orbitCubeView, 'function');
  const front = resolveCubeView('front');
  assert.ok(Math.abs(front.yaw - Math.PI / 4) < 1e-10);
  assert.ok(Math.abs(Math.sin(front.pitch) - 0.56) < 1e-10);
  assert.ok(Math.sin(resolveCubeView('back').yaw) < 0);
  assert.equal(orbitCubeView(front, 20 * Math.PI, 10).pitch, Math.PI / 2);
  assert.equal(orbitCubeView(front, 0, -10).pitch, -Math.PI / 2);
  assert.ok(Math.abs(orbitCubeView(front, 20 * Math.PI, 0).yaw - front.yaw) < 1e-10);
  const invalid = resolveCubeView({ yaw: NaN, pitch: Infinity });
  assert.ok(Number.isFinite(invalid.yaw) && Number.isFinite(invalid.pitch));
});

test('dragging captures one pointer and changes only the camera until release', () => {
  assert.equal(typeof createCubeOrbit, 'function');
  const session = orbitSession();
  const { canvas, orbit } = session;
  canvas.send('pointerdown', { clientX: 30, clientY: 50, pointerType: 'touch' });
  assert.equal(canvas.style.touchAction, 'none');
  assert.ok(canvas.captured.has(1));
  canvas.send('pointermove', { pointerId: 2, clientX: 90, clientY: 90 });
  assert.equal(session.updates, 0);
  canvas.send('pointermove', { clientX: 70, clientY: 80 });
  assert.ok(session.view.yaw < Math.PI / 4);
  assert.ok(session.view.pitch > Math.asin(0.56));
  assert.equal(session.updates, 1);
  canvas.send('pointerup');
  assert.equal(canvas.captured.size, 0);
  canvas.send('pointermove', { clientX: 100, clientY: 100 });
  assert.equal(session.updates, 1);
  orbit.destroy();
});

test('a new drag starts from the current preset and a cancelled drag stops updating', () => {
  assert.equal(typeof createCubeOrbit, 'function');
  const session = orbitSession('back');
  session.canvas.send('pointerdown');
  session.canvas.send('pointermove', { clientX: 10 });
  assert.ok(Math.sin(session.view.yaw) < 0);
  session.canvas.send('pointercancel');
  session.canvas.send('pointermove', { clientX: 30 });
  assert.equal(session.updates, 1);
  assert.equal(session.canvas.captured.size, 0);
  session.orbit.destroy();
});

test('arrows rotate the view and Home resets it without consuming other shortcuts', () => {
  assert.equal(typeof createCubeOrbit, 'function');
  const session = orbitSession();
  assert.equal(session.canvas.send('keydown', { key: 'ArrowRight' }).defaultPrevented, true);
  assert.ok(session.view.yaw < Math.PI / 4);
  session.canvas.send('keydown', { key: 'ArrowUp' });
  assert.ok(session.view.pitch > Math.asin(0.56));
  assert.equal(session.canvas.send('keydown', { key: 'Enter' }).defaultPrevented, false);
  assert.equal(session.canvas.send('keydown', { key: 'ArrowLeft', ctrlKey: true }).defaultPrevented, false);
  assert.equal(session.updates, 2);
  session.canvas.send('keydown', { key: 'Home' });
  assert.equal(session.view, 'front');
  session.orbit.destroy();
});

test('right clicks and secondary pointers do not start an orbit; cleanup releases active input', () => {
  assert.equal(typeof createCubeOrbit, 'function');
  const session = orbitSession();
  session.canvas.send('pointerdown', { button: 2 });
  session.canvas.send('pointerdown', { isPrimary: false });
  session.canvas.send('pointermove', { clientX: 20 });
  assert.equal(session.updates, 0);
  session.canvas.send('pointerdown');
  session.orbit.destroy();
  assert.equal(session.canvas.captured.size, 0);
  assert.equal(session.canvas.style.touchAction, 'pan-y');
  assert.equal(session.canvas.style.cursor, 'crosshair');
  session.canvas.send('pointermove', { clientX: 20 });
  session.canvas.send('keydown', { key: 'ArrowLeft' });
  assert.equal(session.updates, 0);
});
