import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRitualSchedule, createSequencer, createShuffleLooper, RITUAL_SECONDS, BURN_AT } from './chant-sequencer.js';

const mkClips = (dur) => [
  { id: 'intro', duration: dur },
  ...Array.from({ length: 17 }, (_, i) => ({ id: `line-${String(i + 1).padStart(2, '0')}`, duration: dur })),
  { id: 'finale', duration: dur }
];

test('ritual schedule: intro first, ordered non-overlapping lines, finale last', () => {
  const sched = buildRitualSchedule(mkClips(3), () => 0.5);
  assert.deepEqual(sched[0], { id: 'intro', at: 0.8 });
  assert.equal(sched[sched.length - 1].id, 'finale');
  assert.equal(sched[sched.length - 1].at, 52.5);
  const lines = sched.slice(1, -1);
  assert.equal(lines.length, 11); // 3s clips + 0.9s gap fit 11 between 7 and 51
  const nums = lines.map((s) => parseInt(s.id.slice(5), 10));
  assert.deepEqual(nums, [...nums].sort((a, b) => a - b), 'line order preserved');
  assert.ok(lines[0].at >= 7);
  assert.ok(RITUAL_SECONDS === 60 && BURN_AT === 53);
});

test('ritual schedule adapts to long clips — fewer lines, still no overlap', () => {
  const sched = buildRitualSchedule(mkClips(6.5), () => 0.99);
  const lines = sched.slice(1, -1);
  assert.ok(lines.length >= 4 && lines.length <= 7, `got ${lines.length}`);
  for (let i = 1; i < lines.length; i++) {
    assert.ok(lines[i].at >= lines[i - 1].at + 6.5, 'clips must not overlap');
  }
  const last = lines[lines.length - 1];
  assert.ok(last.at + 6.5 <= 52.5, 'last line must finish before the finale');
});

test('sequencer fires each clip once, in order, respecting pause', () => {
  const seq = createSequencer([{ id: 'a', at: 1 }, { id: 'b', at: 2 }]);
  seq.start(100);
  assert.deepEqual(seq.tick(100.5), []);
  assert.deepEqual(seq.tick(101.1), ['a']);
  seq.pause(101.2);
  assert.deepEqual(seq.tick(300), []);        // frozen while paused
  seq.resume(300);
  assert.deepEqual(seq.tick(300.1), []);      // elapsed ~1.3s
  assert.deepEqual(seq.tick(300.9), ['b']);   // elapsed ~2.1s
  assert.equal(seq.done(), true);
});

test('shuffle looper yields every id before repeating', () => {
  const next = createShuffleLooper(['a', 'b', 'c'], Math.random);
  const first = new Set([next(), next(), next()]);
  assert.equal(first.size, 3);
  assert.ok(['a', 'b', 'c'].includes(next()));
});
