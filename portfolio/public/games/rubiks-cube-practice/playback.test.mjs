import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAlgorithm, invertAlgorithm, solvedCube } from './cube-engine.js';
import { createPlayback, SPEEDS } from './playback.js';

function harness(options = {}) {
  let time = 0;
  let nextId = 0;
  const pending = new Map();
  const frames = [];
  const changes = [];
  const playback = createPlayback({
    now: () => time,
    requestFrame: (callback) => { pending.set(++nextId, callback); return nextId; },
    cancelFrame: (id) => pending.delete(id),
    onFrame: (frame) => frames.push(frame),
    onChange: (snapshot) => changes.push(snapshot),
    ...options,
  });
  return {
    playback, frames, changes, pending,
    advance(ms, frame = true) {
      time += ms;
      if (!frame) return;
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach((callback) => callback(time));
    },
  };
}

test('starts at 0.5× and exposes exactly the seven requested speeds', () => {
  assert.deepEqual(SPEEDS, [.25, .5, .75, 1, 1.25, 1.5, 2]);
  const h = harness();
  h.playback.setSequence(solvedCube(), 'R U2');
  assert.equal(h.playback.snapshot().speed, .5);
  assert.equal(h.playback.snapshot().step, 0);
  assert.equal(h.pending.size, 0);
});

for (const speed of [.25, .5, .75, 1, 1.25, 1.5, 2]) {
  test(`${speed}× scales quarter turns, half turns and the readable gap`, () => {
    const h = harness();
    h.playback.setSequence(solvedCube(), 'R U2');
    h.playback.setSpeed(speed);
    h.playback.play();
    h.advance(500 / speed);
    assert.equal(h.playback.snapshot().progress, .5);
    assert.equal(h.playback.snapshot().step, 0);
    assert.equal(h.frames.at(-1).move, 'R');
    assert.deepEqual(h.frames.at(-1).cube, solvedCube());
    h.advance(500 / speed);
    assert.equal(h.playback.snapshot().step, 1);
    assert.equal(h.playback.snapshot().move, null);
    const count = h.frames.length;
    h.advance(449 / speed);
    assert.equal(h.frames.length, count);
    h.advance(1 / speed);
    assert.equal(h.playback.snapshot().move, 'U2');
    h.advance(700 / speed);
    assert.equal(h.playback.snapshot().progress, .5);
    h.advance(700 / speed);
    assert.equal(h.playback.snapshot().step, 2);
    assert.equal(h.playback.snapshot().playing, false);
    assert.deepEqual(h.playback.snapshot().cube, applyAlgorithm(solvedCube(), 'R U2'));
    assert.equal(h.pending.size, 0);
  });
}

test('pause keeps the fractional turn, performs no idle drawing, and resumes once', () => {
  const h = harness();
  h.playback.setSequence(solvedCube(), 'R');
  h.playback.setSpeed(1);
  h.playback.play();
  h.advance(300);
  h.advance(100, false);
  h.playback.pause();
  assert.equal(h.playback.snapshot().progress, .4);
  assert.equal(h.playback.snapshot().move, 'R');
  assert.equal(h.playback.snapshot().animating, false);
  assert.equal(h.pending.size, 0);
  const count = h.frames.length;
  h.advance(20000);
  assert.equal(h.frames.length, count);
  h.playback.play();
  h.playback.play();
  assert.equal(h.pending.size, 1);
  h.advance(600);
  assert.equal(h.playback.snapshot().step, 1);
  assert.equal(h.pending.size, 0);
});

test('changing speed accounts for elapsed time without restarting or applying twice', () => {
  const h = harness();
  h.playback.setSequence(solvedCube(), 'R U');
  h.playback.setSpeed(1);
  h.playback.play();
  h.advance(250);
  h.advance(250, false);
  h.playback.setSpeed(2);
  assert.equal(h.playback.snapshot().progress, .5);
  assert.equal(h.pending.size, 1);
  h.advance(125);
  assert.equal(h.playback.snapshot().progress, .75);
  h.advance(125);
  assert.equal(h.playback.snapshot().step, 1);
  assert.deepEqual(h.playback.snapshot().cube, applyAlgorithm(solvedCube(), 'R'));
});

test('next and previous animate one correct forward or inverse turn then stop', () => {
  const h = harness();
  h.playback.setSequence(solvedCube(), 'r M2 x\'');
  h.playback.setSpeed(1);
  h.playback.next();
  assert.equal(h.playback.snapshot().playing, false);
  assert.equal(h.playback.snapshot().animating, true);
  h.advance(1000);
  assert.equal(h.playback.snapshot().step, 1);
  assert.equal(h.pending.size, 0);
  h.playback.previous();
  assert.equal(h.playback.snapshot().move, "r'");
  assert.equal(h.playback.snapshot().activeIndex, 0);
  assert.deepEqual(h.frames.at(-1).cube, applyAlgorithm(solvedCube(), 'r'));
  h.advance(1000);
  assert.equal(h.playback.snapshot().step, 0);
  assert.deepEqual(h.playback.snapshot().cube, solvedCube());
  assert.equal(h.pending.size, 0);
});

test('seek cancels a turn instantly and playback at the end restarts', () => {
  const h = harness();
  h.playback.setSequence(solvedCube(), 'R U');
  h.playback.play();
  h.advance(100);
  h.playback.seek(2);
  assert.equal(h.pending.size, 0);
  assert.equal(h.playback.snapshot().move, null);
  assert.deepEqual(h.playback.snapshot().cube, applyAlgorithm(solvedCube(), 'R U'));
  h.playback.play();
  assert.equal(h.playback.snapshot().step, 0);
  assert.equal(h.playback.snapshot().move, 'R');
  assert.equal(h.pending.size, 1);
});

test('sequence replacement and stop cancel pending turns without stale progress', () => {
  const h = harness();
  h.playback.setSequence(solvedCube(), 'R U');
  h.playback.play();
  h.advance(500);
  h.playback.setSequence(solvedCube(), 'F');
  h.advance(5000);
  assert.equal(h.playback.snapshot().step, 0);
  assert.equal(h.playback.snapshot().move, null);
  assert.equal(h.pending.size, 0);
  h.playback.play();
  h.advance(300);
  h.playback.stop();
  assert.equal(h.pending.size, 0);
  assert.equal(h.playback.snapshot().move, null);
  assert.deepEqual(h.frames.at(-1).cube, solvedCube());
  h.playback.play();
  h.playback.destroy();
  const count = h.frames.length;
  h.advance(5000);
  h.playback.play();
  assert.equal(h.frames.length, count);
  assert.equal(h.pending.size, 0);
});

test('reduced motion retains ordered readable steps without intermediate drawings', () => {
  const h = harness({ reducedMotion: true });
  h.playback.setSequence(solvedCube(), 'R U');
  h.playback.setSpeed(1);
  h.playback.play();
  const count = h.frames.length;
  for (let i = 0; i < 9; i++) h.advance(100);
  assert.equal(h.frames.length, count);
  assert.equal(h.playback.snapshot().step, 0);
  h.advance(100);
  assert.equal(h.playback.snapshot().step, 1);
  assert.equal(h.frames.at(-1).move, null);
  h.advance(450);
  h.advance(1000);
  assert.equal(h.playback.snapshot().step, 2);
  assert.equal(h.pending.size, 0);
});

test('reduced motion can change mid-turn and discrete updates do not fire each frame', () => {
  const h = harness();
  h.playback.setSequence(solvedCube(), 'R');
  h.playback.setSpeed(1);
  h.playback.play();
  const changes = h.changes.length;
  h.advance(100);
  h.advance(100);
  assert.equal(h.changes.length, changes);
  h.playback.setReducedMotion(true);
  const frames = h.frames.length;
  h.advance(100);
  assert.equal(h.frames.length, frames);
  h.playback.setReducedMotion(false);
  assert.equal(h.frames.at(-1).move, 'R');
  assert.equal(h.frames.at(-1).progress, .3);
  h.advance(700);
  assert.equal(h.playback.snapshot().step, 1);
});

test('all face, slice, wide and cube moves settle to cached engine states', () => {
  const algorithm = "U R F D L B M E S r u f d l b x y z U2 M2 r2 x2 R' M' r' x'";
  const h = harness();
  const initial = applyAlgorithm(solvedCube(), invertAlgorithm(algorithm));
  h.playback.setSequence(initial, algorithm);
  h.playback.setSpeed(2);
  for (const move of h.playback.snapshot().moves) {
    h.playback.next();
    h.advance(move.includes('2') ? 700 : 500);
  }
  assert.deepEqual(h.playback.snapshot().cube, solvedCube());
  for (const move of [...h.playback.snapshot().moves].reverse()) {
    h.playback.previous();
    h.advance(move.includes('2') ? 700 : 500);
  }
  assert.deepEqual(h.playback.snapshot().cube, initial);
  assert.equal(h.pending.size, 0);
});

test('empty sequences and boundary navigation remain idle', () => {
  const h = harness();
  h.playback.setSequence(solvedCube(), '');
  h.playback.play();
  h.playback.next();
  h.playback.previous();
  h.playback.seek(100);
  assert.equal(h.playback.snapshot().step, 0);
  assert.equal(h.pending.size, 0);
  assert.equal(h.playback.snapshot().playing, false);
});

test('a speed change that settles the final turn leaves no scheduled frame', () => {
  const h = harness();
  h.playback.setSequence(solvedCube(), 'R');
  h.playback.setSpeed(1);
  h.playback.play();
  h.advance(1000, false);
  h.playback.setSpeed(2);
  assert.equal(h.playback.snapshot().step, 1);
  assert.equal(h.pending.size, 0);
});

test('pausing during the gap preserves the remaining gap without idle drawings', () => {
  const h = harness();
  h.playback.setSequence(solvedCube(), 'R U');
  h.playback.setSpeed(1);
  h.playback.play();
  h.advance(1000);
  h.advance(200);
  h.playback.pause();
  const count = h.frames.length;
  h.advance(50000);
  assert.equal(h.frames.length, count);
  h.playback.play();
  h.advance(249);
  assert.equal(h.playback.snapshot().move, null);
  h.advance(1);
  assert.equal(h.playback.snapshot().move, 'U');
});

test('a stale cancelled callback cannot advance a replacement sequence', () => {
  const h = harness();
  h.playback.setSequence(solvedCube(), 'R');
  h.playback.play();
  const stale = [...h.pending.values()][0];
  h.playback.setSequence(solvedCube(), 'U');
  h.playback.play();
  h.advance(1000, false);
  stale();
  assert.equal(h.playback.snapshot().progress, 0);
  assert.equal(h.pending.size, 1);
  h.advance(0);
  assert.equal(h.playback.snapshot().progress, .5);
});
