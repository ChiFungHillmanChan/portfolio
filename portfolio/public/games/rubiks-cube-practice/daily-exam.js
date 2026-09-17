import { FACE_ORDER, solvedCube, applyAlgorithm, invertAlgorithm, makeCase, isCrossSolved } from './cube-engine.js';

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shuffled(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function caseQuestion(record) {
  const cube = makeCase(record.algorithm);
  const endpoint = applyAlgorithm(cube, record.algorithm);
  // Algorithms with an unclosed cube rotation need a different starting grip.
  // Its center colors make the inverse recreate the exact canonical preview.
  const startCube = FACE_ORDER.flatMap((_, face) => Array(9).fill(endpoint[face * 9 + 4]));
  return {
    id: record.id, stage: record.stage, caseId: record.id,
    scramble: invertAlgorithm(record.algorithm), cube, solution: record.algorithm, startCube,
  };
}

function crossQuestion(random, index) {
  const moves = [];
  for (let turn = 0; turn < 20; turn += 1) {
    const faces = FACE_ORDER.filter(face => face !== moves[turn - 1]?.[0]);
    moves.push(faces[Math.floor(random() * faces.length)] + ['', "'", '2'][Math.floor(random() * 3)]);
  }
  const startCube = solvedCube();
  let cube = applyAlgorithm(startCube, moves.join(' '));
  // Avoid a trivial exercise without retry loops, even for an unvarying RNG.
  if (isCrossSolved(cube)) {
    const move = moves.at(-1)[0] === 'R' ? 'F' : 'R';
    moves.push(move);
    cube = applyAlgorithm(cube, move);
  }
  const scramble = moves.join(' ');
  return { id: `cross:${index}:${scramble}`, stage: 'C', caseId: null, scramble, cube, solution: null, startCube };
}

export function createExamQuestions(cases, learned, stages, count, random = Math.random) {
  const limit = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  // Shuffle the stage order too, so a one-question exam can choose any stage.
  const selected = shuffled([...new Set(stages)].filter(stage => ['C', 'F', 'O', 'P'].includes(stage)), random);
  const pools = new Map(selected.map(stage => [stage, shuffled(cases.filter(record => record.stage === stage && !learned.has(record.id)), random)]));
  const questions = [];
  while (questions.length < limit) {
    let added = false;
    for (const stage of selected) {
      if (questions.length === limit) break;
      if (stage === 'C') {
        questions.push(crossQuestion(random, questions.length));
        added = true;
      } else {
        const record = pools.get(stage).pop();
        if (record) { questions.push(caseQuestion(record)); added = true; }
      }
    }
    if (!added) break;
  }
  return questions;
}
