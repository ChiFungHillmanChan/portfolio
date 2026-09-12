import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { FACE_ORDER, applyAlgorithm, isF2LSolved, isOLLSolved, makeCase, solvedCube, validateCube } from './cube-engine.js';
import { cubeNet } from './cube-view.js';
import { applyFaceColors, editableIndices, inputFaces, isLastLayerStage, prepareInputCube } from './input-model.js';

const cases = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));

test('last-layer input uses only the top face and the four side top rows', () => {
  for (const stage of ['O', 'P']) {
    assert.equal(isLastLayerStage(stage), true);
    assert.deepEqual(inputFaces(stage), ['U', 'F', 'R', 'B', 'L']);
    const indices = editableIndices(stage);
    assert.equal(indices.length, 21);
    assert.equal(new Set(indices).size, 21);
    for (const index of indices) {
      const face = FACE_ORDER[Math.floor(index / 9)];
      assert.ok(face === 'U' || (face !== 'D' && index % 9 < 3));
    }
  }
  for (const stage of ['C', 'F']) {
    assert.equal(isLastLayerStage(stage), false);
    assert.deepEqual(inputFaces(stage), ['U', 'F', 'R', 'B', 'L', 'D']);
    assert.equal(editableIndices(stage).length, 54);
    const scrambled = applyAlgorithm(solvedCube(), "R U F2 D' L");
    const prepared = prepareInputCube(scrambled, stage);
    assert.deepEqual(prepared, scrambled);
    assert.notEqual(prepared, scrambled);
  }
});

test('all OLL and PLL cases reconstruct exactly from five partial faces, including AUF and alternatives', () => {
  let checked = 0;
  for (const item of cases.filter(record => isLastLayerStage(record.stage))) {
    for (const algorithm of [item.algorithm, ...item.alternatives]) {
      for (const setup of ['', 'U', 'U2', "U'"]) {
        const original = applyAlgorithm(makeCase(algorithm), setup);
        const partial = original.map((value, index) => editableIndices(item.stage).includes(index) ? value : '?');
        const restored = prepareInputCube(partial, item.stage);
        assert.deepEqual(restored, original, `${item.id}: ${algorithm}, ${setup}`);
        assert.equal(validateCube(restored).valid, true);
        assert.equal(isF2LSolved(restored), true);
        if (item.stage === 'P') assert.equal(isOLLSolved(restored), true);
        let captured = solvedCube();
        for (const face of inputFaces(item.stage)) {
          const offset = FACE_ORDER.indexOf(face) * 9;
          captured = applyFaceColors(captured, face, original.slice(offset, offset + 9), item.stage);
        }
        assert.deepEqual(captured, original);
        checked += 1;
      }
    }
  }
  assert.ok(checked > 300);
});

test('partial entry preserves invalid top-layer colors for physical validation', () => {
  const flipped = solvedCube();
  [flipped[5], flipped[10]] = [flipped[10], flipped[5]];
  const prepared = prepareInputCube(flipped, 'O');
  assert.deepEqual(prepared, flipped);
  assert.match(validateCube(prepared).error, /flip/i);
  assert.notEqual(prepared, flipped);
});

test('photo application never changes centers or ignored lower layers', () => {
  const original = applyAlgorithm(solvedCube(), 'R F');
  const source = [...original];
  const sampled = Array(9).fill('U');
  const lastLayer = applyFaceColors(source, 'F', sampled, 'O');
  assert.deepEqual(lastLayer.slice(18, 27), ['U', 'U', 'U', 'F', 'F', 'F', 'F', 'F', 'F']);
  const fullCube = applyFaceColors(source, 'F', sampled, 'C');
  assert.deepEqual(fullCube.slice(18, 27), ['U', 'U', 'U', 'U', 'F', 'U', 'U', 'U', 'U']);
  assert.deepEqual(source, original);
  assert.deepEqual(sampled, Array(9).fill('U'));
  assert.deepEqual(applyFaceColors(source, 'D', sampled, 'O'), prepareInputCube(source, 'O'));
  assert.throws(() => applyFaceColors(source, 'X', sampled, 'O'), /face/i);
  assert.throws(() => applyFaceColors(source, 'U', ['U'], 'O'), /nine/i);
  assert.throws(() => applyFaceColors(source, 'U', Array(9).fill('purple'), 'O'), /color/i);
});

test('last-layer editor omits the bottom and prevents painting the unused rows', () => {
  for (const stage of ['O', 'P']) {
    const dom = new JSDOM(cubeNet(solvedCube(), undefined, true, { stage, photoFaces: ['F'] }));
    const document = dom.window.document;
    assert.equal(document.querySelector('.face-D'), null);
    assert.equal(document.querySelectorAll('.sticker').length, 45);
    assert.equal(document.querySelectorAll('.ignored-sticker').length, 20);
    for (const sticker of document.querySelectorAll('.ignored-sticker')) {
      assert.equal(sticker.disabled, true);
      assert.equal(sticker.hasAttribute('data-action'), false);
    }
    for (const reference of document.querySelectorAll('.color-reference')) {
      assert.equal(reference.disabled, false);
      assert.equal(reference.dataset.action, 'paint');
      assert.match(reference.getAttribute('aria-label'), /color reference/);
    }
    assert.equal(document.querySelectorAll('.color-reference').length, 4);
    assert.equal(document.querySelectorAll('[data-action="capture-face"]').length, 5);
    assert.equal(document.querySelectorAll('.photo-captured').length, 1);
    assert.equal(document.querySelector('.photo-captured').dataset.face, 'F');
    dom.window.close();
  }
});

test('full-cube editor keeps all 54 cells; non-editor diagrams remain unchanged', () => {
  for (const [editable, options, paintCount, captureCount] of [
    [true, { stage: 'C' }, 54, 6],
    [true, { stage: 'F' }, 54, 6],
    [true, {}, 54, 0],
    [false, { stage: 'O' }, 0, 0],
  ]) {
    const dom = new JSDOM(cubeNet(solvedCube(), undefined, editable, options));
    assert.equal(dom.window.document.querySelectorAll('.sticker').length, 54);
    assert.equal(dom.window.document.querySelectorAll('[data-action="paint"]').length, paintCount);
    assert.equal(dom.window.document.querySelectorAll('[data-action="capture-face"]').length, captureCount);
    assert.equal(dom.window.document.querySelectorAll('.ignored-sticker').length, 0);
    dom.window.close();
  }
});
