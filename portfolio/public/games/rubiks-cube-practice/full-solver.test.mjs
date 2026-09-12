import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function browserModule(relative, imports = []) {
  let source = await readFile(new URL(relative, import.meta.url), 'utf8');
  for (const [path, url] of imports) source = source.replaceAll(`'${path}'`, `'${url}'`);
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
}

const engineUrl = await browserModule('./cube-engine.js');
const engine = await import(engineUrl);
let solver;
try {
  const cubeUrl = await browserModule('./vendor/cubejs/cube.js');
  const searchUrl = await browserModule('./vendor/cubejs/solve.js');
  const solverUrl = await browserModule('./full-solver.js', [
    ['./cube-engine.js', engineUrl], ['./vendor/cubejs/cube.js', cubeUrl], ['./vendor/cubejs/solve.js', searchUrl],
  ]);
  solver = await import(solverUrl);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

test('full solver supplies the complete cube solving adapter', () => {
  assert.equal(typeof solver?.solveFullCube, 'function');
  assert.equal(typeof solver?.initializeFullSolver, 'function');
});

test('a solved cube needs no moves, including a rotated grip', () => {
  for (const rotation of ['', 'x y', 'z2']) {
    assert.deepEqual(solver.solveFullCube(engine.applyAlgorithm(engine.solvedCube(), rotation)), {
      algorithm: '', moves: 0, solved: true,
    });
  }
});

test('a literal U-turn facelet fixture solves in the existing animation convention', () => {
  // U clockwise moves the four side top rows: F -> L -> B -> R -> F.
  const input = [...'UUUUUUUUUBBBRRRRRRRRRFFFFFFDDDDDDDDDFFFLLLLLLLLLBBBBBB'];
  assert.equal(engine.validateCube(input).valid, true);
  const original = [...input];
  const result = solver.solveFullCube(input);
  assert.equal(engine.isSolved(engine.applyAlgorithm(input, result.algorithm)), true);
  assert.deepEqual(input, original);
  assert.equal(result.solved, false);
  assert.equal(result.moves, engine.parseAlgorithm(result.algorithm).length);
});

test('full solver handles diverse long scrambles and rotated centers', () => {
  const scrambles = [
    "R U2 F' L D B2 R2 U' F2 D2 L' B R U F D' R' B' U2 L2 F' D",
    "F2 U L2 B2 D R2 F' U2 B L D' F R' U B2 L' D2 R F2 U' L B",
    "R U R' U' F2 D L2 B' U2 R2 F L' D2 B R U' F' L2 D B2 R' U",
    "D2 L' U F2 R B' D U2 L2 F R' B2 U' D2 F' L U R2 B D' L2 F2",
  ];
  for (const [index, scramble] of scrambles.entries()) {
    const input = engine.applyAlgorithm(engine.solvedCube(), `${scramble} ${['', 'x', 'y z2', 'x2 y'][index]}`);
    const result = solver.solveFullCube(input);
    assert.equal(engine.isSolved(engine.applyAlgorithm(input, result.algorithm)), true, scramble);
    assert.ok(result.moves > 0 && result.moves <= 22, result.algorithm);
    assert.equal(result.solved, false);
  }
});

test('impossible and incomplete stickers are rejected before searching', () => {
  assert.throws(() => solver.solveFullCube(['U']), /54 stickers/i);
  const count = engine.solvedCube(); count[0] = 'R';
  assert.throws(() => solver.solveFullCube(count), /9 stickers/i);
  const flipped = engine.solvedCube(); [flipped[5], flipped[10]] = [flipped[10], flipped[5]];
  assert.throws(() => solver.solveFullCube(flipped), /flip/i);
  const twisted = engine.solvedCube(); [twisted[8], twisted[9], twisted[20]] = [twisted[20], twisted[8], twisted[9]];
  assert.throws(() => solver.solveFullCube(twisted), /twist/i);
  const swapped = engine.solvedCube(); [swapped[10], swapped[19]] = [swapped[19], swapped[10]];
  assert.throws(() => solver.solveFullCube(swapped), /parity/i);
});
