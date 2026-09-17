import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const engineSource = await readFile(new URL('./cube-engine.js', import.meta.url), 'utf8');
const engineUrl = `data:text/javascript;base64,${Buffer.from(engineSource).toString('base64')}`;
const engine = await import(engineUrl);
const source = (await readFile(new URL('./daily-exam.js', import.meta.url), 'utf8'))
  .replace("'./cube-engine.js'", JSON.stringify(engineUrl));
const exam = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const cases = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
function seededRandom(seed = 419) {
  return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
}

test('daily records use the learner’s local calendar date', () => {
  assert.equal(typeof exam.localDateKey, 'function');
  assert.equal(exam.localDateKey(new Date(2026, 0, 2, 0, 5)), '2026-01-02');
  assert.equal(exam.localDateKey(new Date(2026, 11, 31, 23, 55)), '2026-12-31');
});

test('each reference setup reproduces its preview and preserves the earlier CFOP stages', () => {
  assert.equal(typeof exam.createExamQuestions, 'function');
  const questions = exam.createExamQuestions(cases, new Set(), ['F', 'O', 'P'], 200, seededRandom());
  assert.equal(questions.length, 119);
  assert.equal(new Set(questions.map(question => question.caseId)).size, 119);
  let changedGrip = 0;
  for (const question of questions) {
    assert.equal(question.id, question.caseId);
    assert.equal(engine.validateCube(question.cube).valid, true, question.id);
    assert.equal(engine.isSolved(question.startCube), true, question.id);
    assert.deepEqual(engine.applyAlgorithm(question.startCube, question.scramble), question.cube, question.id);
    assert.equal(({ F: engine.isCrossSolved, O: engine.isF2LSolved, P: engine.isOLLSolved })[question.stage](question.cube), true, question.id);
    assert.equal(({ F: engine.isF2LSolved, O: engine.isOLLSolved, P: engine.isSolved })[question.stage](question.cube), false, question.id);
    assert.equal(engine.isSolved(engine.applyAlgorithm(question.cube, question.solution)), true, question.id);
    if (question.startCube.join('') !== engine.solvedCube().join('')) changedGrip += 1;
  }
  assert.ok(changedGrip > 0, 'Rotated holding instructions are exercised');
});

test('known cases are never selected and small pools finish without repeating questions', () => {
  assert.equal(typeof exam.createExamQuestions, 'function');
  const remaining = new Set(['f2l-1', 'oll-27', 'pll-t']);
  const learned = new Set(cases.filter(record => !remaining.has(record.id)).map(record => record.id));
  const questions = exam.createExamQuestions(cases, learned, ['F', 'O', 'P'], 10, seededRandom());
  assert.deepEqual(new Set(questions.map(question => question.caseId)), remaining);
  assert.equal(questions.length, 3);
  for (const question of questions) assert.equal(learned.has(question.caseId), false);
  assert.deepEqual(exam.createExamQuestions(cases, new Set(cases.map(record => record.id)), ['F', 'O', 'P'], 10), []);
  assert.deepEqual(exam.createExamQuestions(cases, learned, [], 10), []);
  assert.deepEqual(exam.createExamQuestions(cases, learned, ['F'], 0), []);
});

test('daily selections balance available stages and keep randomness reproducible', () => {
  assert.equal(typeof exam.createExamQuestions, 'function');
  const first = exam.createExamQuestions(cases, new Set(), ['F', 'O', 'P'], 12, seededRandom());
  const repeated = exam.createExamQuestions(cases, new Set(), ['F', 'O', 'P'], 12, seededRandom());
  assert.deepEqual(first, repeated);
  assert.deepEqual(['F', 'O', 'P'].map(stage => first.filter(question => question.stage === stage).length), [4, 4, 4]);
  const other = exam.createExamQuestions(cases, new Set(), ['F', 'O', 'P'], 12, seededRandom(777));
  assert.notDeepEqual(first.map(question => question.id), other.map(question => question.id));
  const onlyPLL = exam.createExamQuestions(cases, new Set(), ['P', 'P', 'invalid'], 6, seededRandom());
  assert.equal(onlyPLL.length, 6);
  assert.ok(onlyPLL.every(question => question.stage === 'P'));
});

test('cross questions are fresh legal scrambles with an unfinished cross and deferred solution', () => {
  assert.equal(typeof exam.createExamQuestions, 'function');
  const learned = new Set(cases.map(record => record.id));
  const questions = exam.createExamQuestions(cases, learned, ['C', 'F', 'O', 'P'], 12, seededRandom());
  assert.equal(questions.length, 12);
  assert.equal(new Set(questions.map(question => question.id)).size, 12);
  assert.equal(new Set(questions.map(question => question.scramble)).size, 12);
  for (const question of questions) {
    assert.equal(question.stage, 'C');
    assert.equal(question.caseId, null);
    assert.equal(question.solution, null);
    assert.equal(engine.validateCube(question.cube).valid, true);
    assert.equal(engine.isCrossSolved(question.cube), false);
    assert.deepEqual(engine.applyAlgorithm(question.startCube, question.scramble), question.cube);
    const moves = engine.parseAlgorithm(question.scramble);
    assert.ok(moves.length >= 20);
    assert.ok(moves.every((move, index) => !index || move[0] !== moves[index - 1][0]));
  }
  const constant = exam.createExamQuestions(cases, new Set(), ['C'], 2, () => 0);
  assert.equal(constant.length, 2, 'An unvarying random source cannot stall generation');
  assert.equal(new Set(constant.map(question => question.id)).size, 2);
});
