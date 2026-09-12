import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAlgorithm, solvedCube } from './cube-engine.js';
import { parseCubeText } from './full-solve-input.js';

const solvedFaces = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
const solvedColors = 'YYYYYYYYY RRRRRRRRR GGGGGGGGG WWWWWWWWW OOOOOOOOO BBBBBBBBB';

test('color initials import the six faces in URFDLB order', () => {
  assert.deepEqual(parseCubeText(solvedColors), [...solvedFaces]);
});

test('face labels import a scrambled cube without reordering its stickers', () => {
  const scrambled = applyAlgorithm(solvedCube(), "R U F2 D' L B2");
  const input = Array.from({ length: 6 }, (_, face) => scrambled.slice(face * 9, face * 9 + 9).join('')).join('\n');
  assert.deepEqual(parseCubeText(input), scrambled);
});

test('compact input and lower-case letters accept whitespace and comma separators', () => {
  assert.deepEqual(parseCubeText(solvedFaces.toLowerCase()), [...solvedFaces]);
  const input = solvedColors.toLowerCase().replaceAll(' ', ',\n').split('').join(' ');
  assert.deepEqual(parseCubeText(input), [...solvedFaces]);
});

test('color initials follow the selected center color scheme', () => {
  const scheme = { U: 'white', R: 'red', F: 'blue', D: 'yellow', L: 'orange', B: 'green' };
  assert.deepEqual(parseCubeText('WWWWWWWWW RRRRRRRRR BBBBBBBBB YYYYYYYYY OOOOOOOOO GGGGGGGGG', scheme), [...solvedFaces]);
  assert.deepEqual(parseCubeText(solvedFaces, scheme), [...solvedFaces]);
  assert.deepEqual(scheme, { U: 'white', R: 'red', F: 'blue', D: 'yellow', L: 'orange', B: 'green' });
});

test('incomplete and oversized entries ask for all 54 stickers', () => {
  for (const input of ['', '   ', null, solvedFaces.slice(1), `${solvedFaces}B`]) {
    assert.throws(() => parseCubeText(input), /54.*9|9.*54/i);
  }
});

test('move notation and unsupported symbols are rejected as sticker input', () => {
  for (const input of ["R U R' U'", 'F2 R2 U2', solvedFaces.replace('U', 'X'), solvedFaces.replace('U', '?')]) {
    assert.throws(() => parseCubeText(input), /sticker letters|move notation/i);
  }
});

test('mixed alphabets cannot silently interpret a color as a face', () => {
  assert.throws(() => parseCubeText(solvedColors.replace('Y', 'U')), /mix/i);
  assert.throws(() => parseCubeText('R'.repeat(27) + 'B'.repeat(27)), /six colors|six faces/i);
});

test('entry centers must match the selected scheme and fixed face order', () => {
  const rotated = applyAlgorithm(solvedCube(), 'x');
  assert.throws(() => parseCubeText(rotated.join('')), /center.*scheme.*order/i);
  const scheme = { U: 'white', R: 'red', F: 'green', D: 'yellow', L: 'orange', B: 'blue' };
  assert.throws(() => parseCubeText(solvedColors, scheme), /center.*scheme.*order/i);
});

test('invalid color counts are checked before sending a cube to the solver', () => {
  assert.throws(() => parseCubeText(solvedFaces.replace('U', 'R')), /exactly 9/i);
});

test('physically impossible flips, twists and swaps cannot be imported', () => {
  const flipped = [...solvedFaces];
  [flipped[5], flipped[10]] = [flipped[10], flipped[5]];
  assert.throws(() => parseCubeText(flipped.join('')), /flip/i);
  const twisted = [...solvedFaces];
  [twisted[8], twisted[9], twisted[20]] = [twisted[20], twisted[8], twisted[9]];
  assert.throws(() => parseCubeText(twisted.join('')), /twist/i);
  const swapped = [...solvedFaces];
  [swapped[10], swapped[19]] = [swapped[19], swapped[10]];
  assert.throws(() => parseCubeText(swapped.join('')), /parity|swap/i);
});

test('invalid or duplicate color-scheme values cannot drop stickers during mapping', () => {
  for (const scheme of [null, {}, { U: 'yellow', R: 'red', F: 'green', D: 'white', L: 'red', B: 'blue' }]) {
    assert.throws(() => parseCubeText(solvedColors, scheme), /scheme.*exactly once/i);
  }
});
