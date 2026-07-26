import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANE, planeToScreen, screenToPlane, inPaper, planeQuad } from './plane.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} !== ${b}`);

test('the sheet centre maps to the plane centre', () => {
  const p = planeToScreen(0, 0);
  close(p.x, PLANE.cx);
  close(p.y, PLANE.cy);
});

test('screenToPlane inverts planeToScreen for arbitrary points', () => {
  for (const [u, v] of [[0, 0], [120, -200], [-170, 250], [40, 90]]) {
    const s = planeToScreen(u, v);
    const back = screenToPlane(s.x, s.y);
    close(back.u, u, 1e-9);
    close(back.v, v, 1e-9);
  }
});

test('tilt foreshortens the sheet vertically, so it reads as lying flat', () => {
  // the same local distance spans less screen height along v than along u
  const alongU = planeToScreen(100, 0);
  const alongV = planeToScreen(0, 100);
  const spanU = Math.hypot(alongU.x - PLANE.cx, alongU.y - PLANE.cy);
  const spanV = Math.hypot(alongV.x - PLANE.cx, alongV.y - PLANE.cy);
  assert.ok(spanV < spanU, `expected foreshortening, got v=${spanV} u=${spanU}`);
  close(spanV / spanU, PLANE.tilt, 1e-9);
});

test('inPaper accepts the four corners and rejects just beyond them', () => {
  for (const c of planeQuad()) {
    assert.ok(inPaper(c.x, c.y), `corner ${c.x},${c.y} should be inside`);
  }
  // push each corner 12px directly away from the centre
  for (const c of planeQuad()) {
    const dx = c.x - PLANE.cx, dy = c.y - PLANE.cy;
    const n = Math.hypot(dx, dy);
    assert.ok(!inPaper(c.x + dx / n * 12, c.y + dy / n * 12), 'outside corner should miss');
  }
});

test('inPaper rejects a point beside the sheet that a naive AABB would accept', () => {
  // the sheet is rotated, so its bounding box contains points the sheet does not
  const q = planeQuad();
  const minX = Math.min(...q.map((p) => p.x)), minY = Math.min(...q.map((p) => p.y));
  assert.ok(!inPaper(minX + 2, minY + 2), 'AABB corner must not count as a hit');
});

test('the quad is returned in local corner order', () => {
  const q = planeQuad();
  assert.equal(q.length, 4);
  close(q[0].x, planeToScreen(-PLANE.w / 2, -PLANE.h / 2).x);
  close(q[2].y, planeToScreen(PLANE.w / 2, PLANE.h / 2).y);
});
