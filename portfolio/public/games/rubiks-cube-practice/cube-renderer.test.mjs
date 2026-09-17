import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const moduleUrls = new Map();
async function browserModule(name) {
  if (moduleUrls.has(name)) return moduleUrls.get(name);
  let source;
  try { source = await readFile(new URL(name, import.meta.url), 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; source = ''; }
  for (const match of [...source.matchAll(/from ['"](.\/[^'"]+)['"]/g)]) {
    source = source.replace(match[0], `from '${await browserModule(match[1])}'`);
  }
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  moduleUrls.set(name, url);
  return url;
}
const { buildCubeFrame, projectPoint, createCubeRenderer } = await import(await browserModule('./cube-renderer.js'));
const { applyAlgorithm, solvedCube, parseAlgorithm, makeCase } = await import(await browserModule('./cube-engine.js'));
const cases = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
const uniqueStickers = Array.from({ length: 54 }, (_, index) => index);
const rounded = value => Math.round(value * 1e7) / 1e7 || 0;
const vectorKey = vector => vector.map(rounded).join(',');
const pose = surface => `${vectorKey(surface.center)}/${vectorKey(surface.normal)}/${surface.vertices.map(vectorKey).sort().join(';')}`;
const stickerMap = frame => new Map(frame.filter(surface => surface.sticker >= 0).map(surface => [pose(surface), surface.color]));

test('the cube renderer provides real geometric frames', () => {
  assert.equal(typeof buildCubeFrame, 'function');
  assert.equal(typeof projectPoint, 'function');
});

test('animated endpoints match engine permutations for every turn, inverse, double and wide alias', () => {
  for (const base of 'U R F D L B M E S x y z u r f d l b Uw Rw Fw Dw Lw Bw'.split(' ')) {
    for (const suffix of ['', "'", '2']) {
      const move = base + suffix;
      const animated = stickerMap(buildCubeFrame(uniqueStickers, move, 1));
      const expected = stickerMap(buildCubeFrame(applyAlgorithm(uniqueStickers, move)));
      assert.deepEqual(animated, expected, move);
    }
  }
});

test('a half-finished R turn moves only its layer through a real 45 degree rotation', () => {
  const before = buildCubeFrame(uniqueStickers).filter(surface => surface.sticker >= 0);
  const midway = buildCubeFrame(uniqueStickers, 'R', 0.5).filter(surface => surface.sticker >= 0);
  const changed = midway.filter((surface, index) => pose(surface) !== pose(before[index]));
  assert.equal(changed.length, 21);
  const upperFrontRight = midway.find(surface => surface.sticker === 8);
  assert.ok(Math.abs(upperFrontRight.normal[1] - Math.SQRT1_2) < 1e-10);
  assert.ok(Math.abs(upperFrontRight.normal[2] + Math.SQRT1_2) < 1e-10);
  assert.equal(upperFrontRight.center[0], 1);
  assert.ok(upperFrontRight.center[1] > 1.7);
  assert.ok(upperFrontRight.center[2] < -0.3);
  assert.deepEqual(uniqueStickers, Array.from({ length: 54 }, (_, index) => index));
});

test('prime turns take the short reverse path and doubles turn through 180 degrees', () => {
  const normal = move => buildCubeFrame(uniqueStickers, move, 0.5).find(surface => surface.sticker === 8).normal;
  assert.ok(normal("R'")[2] > 0.7);
  assert.deepEqual(normal('R2').map(rounded), [0, 0, -1]);
});

test('all catalog algorithms and alternatives keep rendered states synchronized after every move', () => {
  for (const record of cases) {
    for (const algorithm of [record.algorithm, ...(record.alternatives || [])]) {
      let cube = makeCase(algorithm);
      for (const move of parseAlgorithm(algorithm)) {
        const next = applyAlgorithm(cube, move);
        assert.deepEqual(stickerMap(buildCubeFrame(cube, move, 1)), stickerMap(buildCubeFrame(next)), `${record.id}: ${move}`);
        cube = next;
      }
    }
  }
});

test('cubies retain dark interior faces during a slice turn', () => {
  const frame = buildCubeFrame(solvedCube(), 'M', 0.5);
  const plastic = frame.filter(surface => surface.sticker < 0);
  assert.equal(frame.filter(surface => surface.sticker >= 0).length, 54);
  assert.equal(plastic.length, 26 * 6);
  assert.ok(plastic.some(surface => surface.normal.some(value => Math.abs(value - Math.SQRT1_2) < 1e-10)));
  assert.ok(plastic.every(surface => surface.vertices.length === 4));
});

test('front and back projections show the intended face arrangement and fit turns inside the canvas', () => {
  assert.ok(projectPoint([0, 1, 0])[1] < 150);
  assert.ok(projectPoint([0, 0, 1])[0] < 160);
  assert.ok(projectPoint([1, 0, 0])[0] > 160);
  assert.ok(projectPoint([0, 0, -1], 'back')[0] < 160);
  assert.ok(projectPoint([-1, 0, 0], 'back')[0] > 160);
  for (const move of ['R', 'U', 'F', 'D', 'L', 'B', 'M', 'x', 'y', 'z']) {
    for (let step = 0; step <= 8; step += 1) {
      for (const surface of buildCubeFrame(solvedCube(), move, step / 8)) {
        for (const vertex of surface.vertices) {
          const [x, y] = projectPoint(vertex);
          assert.ok(x > 5 && x < 315 && y > 5 && y < 285, `${move} at ${step / 8}: ${x}, ${y}`);
        }
      }
    }
  }
});

test('camera angles can inspect a face head-on without changing its cube coordinates', () => {
  const view = { yaw: 0, pitch: 0 };
  assert.deepEqual(projectPoint([1, 0, 0], view), [212, 144]);
  assert.deepEqual(projectPoint([0, 1, 0], view), [160, 92]);
  assert.deepEqual(projectPoint([0, 0, 1], view), [160, 144]);
  assert.ok(Math.abs(projectPoint([0, 1, 0], 'top')[1] - 144) < 1e-10);
  assert.ok(projectPoint([0, 0, 1], 'bottom')[1] < 144);
  assert.ok(projectPoint([0, 0, 1], 'left')[0] > 160);
  assert.ok(projectPoint([1, 0, 0], 'right')[0] < 160);
});

// Node has no Canvas2D or ResizeObserver. Record the renderer's graphics/resource
// boundary while exercising the complete production draw and lifecycle logic.
function canvasRecorder() {
  const fills = [];
  let allocations = 0;
  const context = { fillStyle: '', strokeStyle: '', lineWidth: 0,
    setTransform() {}, clearRect() { fills.length = 0; }, beginPath() {},
    ellipse() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, closePath() {},
    fill() { fills.push(this.fillStyle); }, stroke() {} };
  let width = 320;
  let height = 300;
  return { fills, get allocations() { return allocations; },
    get width() { return width; }, set width(value) { width = value; allocations += 1; },
    get height() { return height; }, set height(value) { height = value; allocations += 1; },
    getContext() { return context; }, getBoundingClientRect() { return { width: 320, height: 300 }; } };
}

test('camera movement reveals the chosen faces while preserving the current turn pose', () => {
  const canvas = canvasRecorder();
  const renderer = createCubeRenderer(canvas);
  const cube = solvedCube();
  const before = [...cube];
  renderer.draw(cube, undefined, null, 0, { yaw: 0, pitch: 0 });
  assert.equal(canvas.fills.filter(color => color === '#35b78a').length, 9);
  assert.ok(!canvas.fills.includes('#ffd643'));
  assert.ok(!canvas.fills.includes('#ee5c5b'));
  renderer.draw(cube, undefined, null, 0, 'bottom');
  assert.equal(canvas.fills.filter(color => color === '#ffffff').length, 9);
  renderer.draw(cube, undefined, 'R', 0.5, 'left');
  const turned = [...canvas.fills];
  renderer.draw(cube, undefined, 'R', 0.5, 'right');
  assert.notDeepEqual(canvas.fills, turned);
  renderer.draw(cube, undefined, 'R', 0.5, 'left');
  assert.deepEqual(canvas.fills, turned);
  assert.deepEqual(cube, before);
  renderer.destroy();
});

test('mobile rendering caps its pixel buffer and does not allocate new buffers or schedule animation per draw', () => {
  const oldRatio = globalThis.devicePixelRatio;
  const oldRaf = globalThis.requestAnimationFrame;
  const oldObserver = globalThis.ResizeObserver;
  globalThis.devicePixelRatio = 4;
  globalThis.requestAnimationFrame = () => { throw new Error('The renderer must not run an animation loop.'); };
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  try {
    const canvas = canvasRecorder();
    const renderer = createCubeRenderer(canvas);
    assert.deepEqual([canvas.width, canvas.height], [640, 600]);
    const allocations = canvas.allocations;
    let maximumFills = 0;
    for (const move of 'U R F D L B M E S x y z u r f d l b'.split(' ')) {
      for (let step = 0; step <= 10; step += 1) {
        renderer.draw(solvedCube(), undefined, move, step / 10);
        maximumFills = Math.max(maximumFills, canvas.fills.length);
      }
    }
    assert.equal(canvas.allocations, allocations);
    assert.ok(maximumFills <= 130, `Expected bounded visible geometry; received ${maximumFills} fills.`);
    renderer.draw(solvedCube());
    assert.ok(canvas.fills.includes('#ffd643'));
    assert.ok(canvas.fills.includes('#35b78a'));
    assert.ok(canvas.fills.includes('#ee5c5b'));
    renderer.destroy();
  } finally {
    globalThis.devicePixelRatio = oldRatio;
    globalThis.requestAnimationFrame = oldRaf;
    globalThis.ResizeObserver = oldObserver;
  }
});

test('resizing repaints the current pose and destroying releases its observer and prevents further rendering', () => {
  const oldRatio = globalThis.devicePixelRatio;
  const oldObserver = globalThis.ResizeObserver;
  let observedCanvas;
  let onResize;
  globalThis.devicePixelRatio = 2;
  globalThis.ResizeObserver = class {
    constructor(callback) { onResize = callback; }
    observe(canvas) { observedCanvas = canvas; }
    disconnect() { observedCanvas = null; }
  };
  try {
    const canvas = canvasRecorder();
    const renderer = createCubeRenderer(canvas);
    const scheme = { U: 'blue', R: 'orange', F: 'white', D: 'yellow', L: 'red', B: 'green' };
    renderer.draw(solvedCube(), scheme, 'R', 0.5);
    const poseFills = [...canvas.fills];
    onResize([{ contentRect: { width: 280, height: 262.5 } }]);
    assert.deepEqual([canvas.width, canvas.height], [560, 525]);
    assert.deepEqual(canvas.fills, poseFills);
    assert.ok(canvas.fills.includes('#5388ee'));
    renderer.destroy();
    assert.equal(observedCanvas, null);
    const allocations = canvas.allocations;
    renderer.draw(solvedCube(), scheme, 'U', 1);
    onResize([{ contentRect: { width: 500, height: 500 } }]);
    assert.equal(canvas.allocations, allocations);
    assert.deepEqual(canvas.fills, poseFills);
  } finally {
    globalThis.devicePixelRatio = oldRatio;
    globalThis.ResizeObserver = oldObserver;
  }
});
