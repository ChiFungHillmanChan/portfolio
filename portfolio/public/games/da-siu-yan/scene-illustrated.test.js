import test from 'node:test';
import assert from 'node:assert/strict';
import * as scene from './scene-illustrated.js';
import { PLANE, planeToScreen } from './plane.js';

// The rig and the sheet geometry are now owned by rig.test.js / plane.test.js.
// What is left here is the one thing only this module can break: the surface
// game.js imports. It calls exactly `createIllustratedScene(canvas)` and
// `inPaper(x, y)`; the module also has to stay importable outside a browser,
// which is what catches a bad import path or a dropped re-export.

test('the module exposes exactly what game.js imports', () => {
  assert.deepEqual(Object.keys(scene).sort(), ['createIllustratedScene', 'inPaper']);
  assert.equal(typeof scene.createIllustratedScene, 'function');
  assert.equal(scene.createIllustratedScene.length, 1, 'takes the canvas');
});

test('the re-exported inPaper is the sheet plane, not the retired poster rect', () => {
  assert.ok(scene.inPaper(PLANE.cx, PLANE.cy), 'sheet centre must be tappable');
  const nearCorner = planeToScreen(PLANE.w / 2 - 2, PLANE.h / 2 - 2);
  assert.ok(scene.inPaper(nearCorner.x, nearCorner.y), 'a foreshortened corner must hit');
  const beyond = planeToScreen(PLANE.w, PLANE.h);
  assert.ok(!scene.inPaper(beyond.x, beyond.y), 'off the sheet must miss');
});
