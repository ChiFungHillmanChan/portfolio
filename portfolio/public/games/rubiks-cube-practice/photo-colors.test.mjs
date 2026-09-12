import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyColor, sampleFace, validateCorners } from './photo-colors.js';

const scheme = { U: 'yellow', R: 'red', F: 'green', D: 'white', L: 'orange', B: 'blue' };
const palette = { U: [246, 216, 22], R: [205, 35, 42], F: [27, 151, 69], D: [238, 238, 238], L: [244, 114, 23], B: [31, 87, 211] };
const corners = [{ x: 0, y: 0 }, { x: 119, y: 0 }, { x: 119, y: 119 }, { x: 0, y: 119 }];
function image(width, height, paint) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set([...paint(x, y), 255], (y * width + x) * 4);
  return { width, height, data };
}

test('detects six standard colors under different light levels', () => {
  for (const [face, rgb] of Object.entries(palette)) {
    for (const light of [0.4, 0.7, 1]) {
      const result = classifyColor(rgb.map(value => Math.round(value * light)), scheme);
      assert.equal(result.color, face, `${face} at ${light}`);
      assert.ok(result.confidence > 0.45, `${face} confidence at ${light}: ${result.confidence}`);
    }
  }
});

test('uses face-color schemes and measured center colors', () => {
  const reversed = { U: 'white', D: 'yellow', F: 'blue', B: 'green', R: 'orange', L: 'red' };
  assert.equal(classifyColor(palette.D, reversed).color, 'U');
  assert.equal(classifyColor(palette.R, reversed).color, 'L');
  const references = { R: [210, 62, 22], L: [249, 154, 30] };
  assert.equal(classifyColor([150, 44, 16], scheme, references).color, 'R');
  assert.equal(classifyColor([174, 108, 21], scheme, references).color, 'L');
});

test('distinguishes shaded white from yellow and flags dark or ambiguous samples', () => {
  assert.equal(classifyColor([104, 108, 110], scheme).color, 'D');
  assert.equal(classifyColor([161, 147, 19], scheme).color, 'U');
  assert.ok(classifyColor([4, 4, 4], scheme).confidence < 0.3);
  assert.ok(classifyColor([240, 73, 0], scheme).confidence < 0.7);
});

test('validates convex clockwise face corners and image bounds', () => {
  assert.equal(validateCorners(corners, 120, 120), true);
  assert.equal(validateCorners([{ x: 10, y: 5 }, { x: 110, y: 25 }, { x: 98, y: 112 }, { x: 3, y: 83 }], 120, 120), true);
  for (const bad of [null, [], [...corners].reverse(), [corners[0], corners[2], corners[1], corners[3]], [{ x: -1, y: 0 }, ...corners.slice(1)], corners.map(p => ({ x: p.x / 100, y: p.y / 100 })), [{ x: NaN, y: 0 }, ...corners.slice(1)]]) {
    assert.equal(validateCorners(bad, 120, 120), false);
  }
});

test('samples row-major stickers and ignores grid lines and isolated glare', () => {
  const pattern = ['R', 'U', 'B', 'L', 'F', 'D', 'D', 'R', 'U'];
  const data = image(120, 120, (x, y) => {
    if (x % 40 < 4 || y % 40 < 4) return [8, 8, 8];
    if (x % 40 > 14 && x % 40 < 20 && y % 40 > 14 && y % 40 < 20) return [255, 255, 255];
    return palette[pattern[Math.floor(y / 40) * 3 + Math.floor(x / 40)]];
  });
  const result = sampleFace(data, corners, { scheme, face: 'F' });
  assert.deepEqual(result.colors, pattern);
  assert.equal(result.samples.length, 9);
  assert.ok(result.confidence.every(value => value >= 0 && value <= 1));
  assert.deepEqual(result.samples[0], palette.R);
});

test('perspective sampling maps sticker centers correctly', () => {
  // A trapezoid with top corners (20,10)/(100,10), bottom (110,110)/(10,110).
  // Its inverse is v=(y-10)/(80+0.2*(y-10)); u=(x*(1-0.2*v)-20+12*v)/80.
  const pattern = ['B', 'R', 'U', 'D', 'F', 'L', 'R', 'U', 'B'];
  const data = image(120, 120, (x, y) => {
    const v = (y - 10) / (80 + 0.2 * (y - 10));
    const u = (x * (1 - 0.2 * v) - 20 + 12 * v) / 80;
    if (u < 0 || v < 0 || u >= 1 || v >= 1) return [0, 0, 0];
    return palette[pattern[Math.floor(v * 3) * 3 + Math.floor(u * 3)]];
  });
  const result = sampleFace(data, [{ x: 20, y: 10 }, { x: 100, y: 10 }, { x: 110, y: 110 }, { x: 10, y: 110 }], { scheme });
  assert.deepEqual(result.colors, pattern);
});

test('pins the known face center while retaining its raw sample and flags mismatch', () => {
  const data = image(120, 120, () => palette.R);
  const result = sampleFace(data, corners, { scheme, face: 'U' });
  assert.equal(result.colors[4], 'U');
  assert.deepEqual(result.samples[4], palette.R);
  assert.ok(result.confidence[4] < 0.5);
});

test('rejects malformed inputs without mutating caller data', () => {
  const data = image(120, 120, () => palette.L);
  const before = new Uint8ClampedArray(data.data);
  const savedCorners = JSON.stringify(corners);
  const savedScheme = JSON.stringify(scheme);
  sampleFace(data, corners, { scheme });
  assert.deepEqual(data.data, before);
  assert.equal(JSON.stringify(corners), savedCorners);
  assert.equal(JSON.stringify(scheme), savedScheme);
  assert.throws(() => sampleFace({ width: 120, height: 120, data: [] }, corners, { scheme }), /image/i);
  assert.throws(() => sampleFace(data, [], { scheme }), /corners/i);
  assert.throws(() => classifyColor([NaN, 0, 0], scheme), /RGB/);
  assert.throws(() => classifyColor(palette.R, { U: 'red' }), /scheme/i);
});
