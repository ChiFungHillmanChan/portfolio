import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// A data URL keeps these browser ES modules testable without changing the CRA package type.
const source = await readFile(new URL('./cube-engine.js', import.meta.url), 'utf8');
const engine = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const { solvedCube, applyAlgorithm, invertAlgorithm, validateCube, makeCase,
  isCrossSolved, isF2LSolved, isOLLSolved, isSolved, findCrossSolution,
  matchOLL, matchPLL, matchF2L, parseAlgorithm, normalizeCenters } = engine;
const cases = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
const byStage = stage => cases.filter(record => record.stage === stage);

test('all supported turns have correct order and invert without mutating input', () => {
  const solved = solvedCube();
  for (const move of 'U R F D L B M E S x y z u r f d l b Uw Rw Fw Dw Lw Bw'.split(' ')) {
    assert.deepEqual(applyAlgorithm(solved, `${move} ${move} ${move} ${move}`), solved, move);
    assert.deepEqual(applyAlgorithm(solved, `${move} ${move}'`), solved, move);
    assert.deepEqual(applyAlgorithm(solved, `${move}2 ${move}2`), solved, move);
  }
  assert.deepEqual(solved, solvedCube());
  assert.deepEqual(applyAlgorithm(solved, 'r'), applyAlgorithm(solved, "R M'"));
  assert.deepEqual(applyAlgorithm(solved, 'x'), applyAlgorithm(solved, "R M' L'"));
  assert.deepEqual(applyAlgorithm(solved, 'y'), applyAlgorithm(solved, "U E' D'"));
  assert.deepEqual(applyAlgorithm(solved, 'z'), applyAlgorithm(solved, "F S B'"));
});

test('algorithm parsing supports grouped repetitions and typography, rejects invalid input', () => {
  assert.deepEqual(parseAlgorithm('(R U R’ U′)2'), ['R', 'U', "R'", "U'", 'R', 'U', "R'", "U'"]);
  assert.deepEqual(applyAlgorithm(solvedCube(), '(R U)3'), applyAlgorithm(solvedCube(), 'R U R U R U'));
  const algorithm = "r U R' U' M2 x y' z2 Fw2";
  assert.deepEqual(applyAlgorithm(applyAlgorithm(solvedCube(), algorithm), invertAlgorithm(algorithm)), solvedCube());
  assert.throws(() => applyAlgorithm(solvedCube(), 'R banana'));
});

test('legal face, slice, wide and rotation scrambles validate', () => {
  let state = solvedCube();
  const moves = ['R', 'U2', "F'", 'L', 'D', 'B2', 'M', 'r', "E'", 'S2', 'x', 'y2', "z'"];
  for (let index = 0; index < 120; index += 1) {
    state = applyAlgorithm(state, moves[(index * 17 + index * index) % moves.length]);
    assert.equal(validateCube(state).valid, true, `after move ${index}: ${validateCube(state).error}`);
  }
});

test('validation rejects color counts, flipped edges, twisted corners and parity errors', () => {
  const count = solvedCube(); count[0] = 'R';
  assert.equal(validateCube(count).valid, false);
  const edge = solvedCube(); [edge[5], edge[10]] = [edge[10], edge[5]];
  assert.match(validateCube(edge).error, /flip/i);
  const corner = solvedCube(); [corner[8], corner[9], corner[20]] = [corner[20], corner[8], corner[9]];
  assert.match(validateCube(corner).error, /twist/i);
  const parity = solvedCube(); [parity[5], parity[7]] = [parity[7], parity[5]];
  [parity[10], parity[19]] = [parity[19], parity[10]];
  assert.match(validateCube(parity).error, /parity|swap/i);
  const mirrored = solvedCube().map(color => color === 'R' ? 'L' : color === 'L' ? 'R' : color);
  assert.match(validateCube(mirrored).error, /center/i);
  const duplicate = solvedCube();
  [duplicate[10], duplicate[25]] = [duplicate[25], duplicate[10]];
  assert.match(validateCube(duplicate).error, /appears twice/i);
});

test('stage checks reflect actual solved pieces', () => {
  assert.equal(isSolved(solvedCube()), true);
  const sune = makeCase("R U R' U R U2 R'");
  assert.equal(isCrossSolved(sune), true);
  assert.equal(isF2LSolved(sune), true);
  assert.equal(isOLLSolved(sune), false);
  const tPerm = makeCase("R U R' U' R' F R2 U' R' U' R U R' F'");
  assert.equal(isOLLSolved(tPerm), true);
  assert.equal(isSolved(tPerm), false);
  assert.equal(isSolved(applyAlgorithm(solvedCube(), 'x y')), true);
});

test('cross solver finds shortest solutions on shallow states and solves diverse scrambles', () => {
  for (const [scramble, length] of [['', 0], ['R', 1], ['F2', 1], ['R F', 2], ['R L', 2]]) {
    const state = applyAlgorithm(solvedCube(), scramble);
    const result = findCrossSolution(state);
    assert.equal(parseAlgorithm(result.algorithm).length, length, scramble);
    assert.equal(isCrossSolved(applyAlgorithm(state, result.algorithm)), true);
  }
  for (const scramble of ["R U2 F' L D B2 R2 U' F2 D' L2 B", "F R U R' U' F' L2 D2 B U2 R", "D R D' F2 L U B' R2 D"] ) {
    const state = applyAlgorithm(solvedCube(), scramble);
    const result = findCrossSolution(state);
    assert.equal(isCrossSolved(applyAlgorithm(state, result.algorithm)), true, result.algorithm);
    assert.ok(result.moves <= 8);
  }
});

test('OLL, PLL and F2L matching includes the setup in a executable answer', () => {
  const oll = [{ id: 'sune', algorithm: "R U R' U R U2 R'" }];
  const pll = [{ id: 'T', algorithm: "R U R' U' R' F R2 U' R' U' R U R' F'" }];
  const f2l = [{ id: 'insert', algorithm: "U R U' R'" }];
  for (const setup of ['', 'U', 'U2', "U'"]) {
    const oState = applyAlgorithm(makeCase(oll[0].algorithm), setup);
    const oResult = matchOLL(oState, oll);
    assert.equal(oResult.case.id, 'sune');
    assert.equal(isOLLSolved(applyAlgorithm(oState, oResult.algorithm)), true);
    const pState = applyAlgorithm(makeCase(pll[0].algorithm), `${setup} U`);
    const pResult = matchPLL(pState, pll);
    assert.equal(pResult.case.id, 'T');
    assert.equal(isSolved(applyAlgorithm(pState, pResult.algorithm)), true);
    const fState = applyAlgorithm(makeCase(f2l[0].algorithm), setup);
    const fResult = matchF2L(fState, f2l);
    assert.equal(fResult.case.id, 'insert');
    assert.equal(isF2LSolved(applyAlgorithm(fState, fResult.algorithm)), true);
  }
});

test('all 119 reference cases are legal, keep their prerequisite, and their displayed algorithms solve', () => {
  assert.equal(byStage('F').length, 41);
  assert.equal(byStage('O').length, 57);
  assert.equal(byStage('P').length, 21);
  for (const record of cases) {
    const state = makeCase(record.algorithm);
    assert.equal(validateCube(state).valid, true, record.id);
    assert.equal(isSolved(applyAlgorithm(state, record.algorithm)), true, record.id);
    const prerequisite = { F: isCrossSolved, O: isF2LSolved, P: isOLLSolved }[record.stage];
    assert.equal(prerequisite(state), true, record.id);
    const match = { F: matchF2L, O: matchOLL, P: matchPLL }[record.stage](state, byStage(record.stage));
    assert.ok(match?.case, record.id);
    assert.equal(match.case.id, record.id);
    assert.equal(isSolved(applyAlgorithm(state, match.algorithm)), true, record.id);
  }
});

test('all 95 alternative algorithms preserve their stage and match the exact documented case', () => {
  let checked = 0;
  for (const record of cases) {
    for (const [index, algorithm] of record.alternatives.entries()) {
      const label = `${record.id}, alternative ${index + 1}`;
      const state = makeCase(algorithm);
      assert.equal(validateCube(state).valid, true, label);
      assert.equal(isSolved(applyAlgorithm(state, algorithm)), true, label);
      const prerequisite = { F: isCrossSolved, O: isF2LSolved, P: isOLLSolved }[record.stage];
      assert.equal(prerequisite(state), true, label);
      const match = { F: matchF2L, O: matchOLL, P: matchPLL }[record.stage](state, byStage(record.stage));
      assert.equal(match?.case?.id, record.id, label);
      const stageSolved = { F: isF2LSolved, O: isOLLSolved, P: isSolved }[record.stage];
      assert.equal(stageSolved(normalizeCenters(applyAlgorithm(state, match.algorithm))), true, label);
      checked += 1;
    }
  }
  assert.equal(checked, 95);
});

test('solved-endpoint holding instructions recreate all primary and alternative cases exactly', () => {
  let rotatedEndpoints = 0;
  for (const record of cases) {
    for (const algorithm of [record.algorithm, ...record.alternatives]) {
      const state = makeCase(algorithm);
      const endpoint = applyAlgorithm(state, algorithm);
      assert.equal(isSolved(endpoint), true, record.id);
      // The UI tells the learner to hold the solved cube like this endpoint.
      // Assuming the default solved orientation is incorrect for unclosed rotations.
      const heldSolvedCube = engine.FACE_ORDER.flatMap((_, face) => Array(9).fill(endpoint[face * 9 + 4]));
      assert.deepEqual(applyAlgorithm(heldSolvedCube, invertAlgorithm(algorithm)), state, record.id);
      assert.deepEqual(normalizeCenters(endpoint), solvedCube(), record.id);
      if (endpoint[4] !== 'U' || endpoint[22] !== 'F') rotatedEndpoints += 1;
    }
  }
  assert.ok(rotatedEndpoints > 20, `rotated setup endpoints exercised ${rotatedEndpoints} times`);
});

const topCorners = [[8, 9, 20], [6, 18, 38], [0, 36, 47], [2, 45, 11]];
const topEdges = [[5, 10], [7, 19], [3, 37], [1, 46]];
const topCornerColors = ['URF', 'UFL', 'ULB', 'UBR'];
const topEdgeColors = ['UR', 'UF', 'UL', 'UB'];
function lastLayer(cp, co, ep, eo) {
  const state = solvedCube();
  topCorners.forEach((indices, index) => indices.forEach((_, face) => {
    state[indices[(face + co[index]) % 3]] = topCornerColors[cp[index]][face];
  }));
  topEdges.forEach((indices, index) => indices.forEach((_, face) => {
    state[indices[(face + eo[index]) % 2]] = topEdgeColors[ep[index]][face];
  }));
  return state;
}

test('OLL recognizes all 216 legal last-layer orientation states', () => {
  const records = byStage('O');
  const identity = [0, 1, 2, 3];
  for (let code = 0; code < 27; code += 1) {
    const co = [code % 3, Math.floor(code / 3) % 3, Math.floor(code / 9)];
    co.push((3 - co.reduce((sum, value) => sum + value, 0) % 3) % 3);
    for (let edgeCode = 0; edgeCode < 8; edgeCode += 1) {
      const eo = [edgeCode & 1, (edgeCode >> 1) & 1, (edgeCode >> 2) & 1];
      eo.push(eo.reduce((sum, value) => sum + value, 0) % 2);
      const state = lastLayer(identity, co, identity, eo);
      assert.equal(validateCube(state).valid, true);
      const result = matchOLL(state, records);
      assert.ok(result, `orientation ${code}/${edgeCode}`);
      assert.equal(isOLLSolved(applyAlgorithm(state, result.algorithm)), true);
    }
  }
});

function permutations(values) {
  if (!values.length) return [[]];
  return values.flatMap((value, index) => permutations(values.filter((_, at) => at !== index)).map(rest => [value, ...rest]));
}

test('PLL recognizes all 288 legal last-layer permutations, including AUF after regrips', () => {
  const records = byStage('P');
  const positions = permutations([0, 1, 2, 3]);
  let checked = 0;
  for (const cp of positions) {
    for (const ep of positions) {
      const state = lastLayer(cp, [0, 0, 0, 0], ep, [0, 0, 0, 0]);
      if (!validateCube(state).valid) continue;
      const result = matchPLL(state, records);
      assert.ok(result, `permutation ${cp}/${ep}`);
      assert.equal(isSolved(applyAlgorithm(state, result.algorithm)), true);
      checked += 1;
    }
  }
  assert.equal(checked, 288);
});

test('100 deterministic scrambles solve full CFOP with the UI center normalization after every stage', () => {
  let seed = 9137;
  const random = count => { seed = (1664525 * seed + 1013904223) >>> 0; return seed % count; };
  const turns = ['R', 'U', 'F', 'D', 'L', 'B'].flatMap(face => [face, `${face}2`, `${face}'`]);
  const f2l = byStage('F'), oll = byStage('O'), pll = byStage('P');
  let extractions = 0;
  for (let index = 0; index < 100; index += 1) {
    let state = applyAlgorithm(solvedCube(), Array.from({ length: 22 }, () => turns[random(18)]).join(' '));
    state = normalizeCenters(applyAlgorithm(state, findCrossSolution(state).algorithm));
    assert.equal(isCrossSolved(state), true);
    for (const slot of ['FR', 'FL', 'BR', 'BL']) {
      const result = matchF2L(state, f2l, slot);
      assert.ok(result, `scramble ${index}, slot ${slot}`);
      if (result.extraction) extractions += 1;
      state = normalizeCenters(applyAlgorithm(state, result.algorithm));
      assert.deepEqual([4, 13, 22, 31, 40, 49].map(at => state[at]), ['U', 'R', 'F', 'D', 'L', 'B']);
      assert.equal(isCrossSolved(state), true);
    }
    assert.equal(isF2LSolved(state), true, `scramble ${index}`);
    const orientation = matchOLL(state, oll);
    assert.ok(orientation);
    state = normalizeCenters(applyAlgorithm(state, orientation.algorithm));
    const permutation = matchPLL(state, pll);
    assert.ok(permutation);
    state = normalizeCenters(applyAlgorithm(state, permutation.algorithm));
    assert.equal(isSolved(state), true, `scramble ${index}`);
  }
  assert.ok(extractions > 20, `buried-pair extraction exercised ${extractions} times`);
});
