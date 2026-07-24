import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildRitualSchedule, createSequencer, createShuffleLooper,
  RITUAL_SECONDS, BURN_AT, LINE_GAP
} from './chant-sequencer.js';

// Every clip carries ~0.2s of generated padding at each end, so this is what a
// player actually hears between two lines.
const CLIP_PADDING = 0.4;
const gapsOf = (sched, dur) => sched.slice(1).map((s, i) =>
  s.at - (sched[i].at + dur));

const mkClips = (dur) => [
  { id: 'intro', duration: dur },
  // 28 lines, matching chant-lines.js — the pool size decides whether the
  // window can be tiled without dead air
  ...Array.from({ length: 28 }, (_, i) => ({ id: `line-${String(i + 1).padStart(2, '0')}`, duration: dur })),
  { id: 'finale', duration: dur }
];

test('ritual schedule: intro first, ordered non-overlapping lines, finale last', () => {
  const sched = buildRitualSchedule(mkClips(3), () => 0.5);
  assert.deepEqual(sched[0], { id: 'intro', at: 0.8 });
  assert.equal(sched[sched.length - 1].id, 'finale');
  assert.equal(sched[sched.length - 1].at, 52.5);
  const lines = sched.slice(1, -1);
  assert.equal(lines.length, 14); // 3s clips + a ~0.45s gap fill the window
  const nums = lines.map((s) => parseInt(s.id.slice(5), 10));
  assert.deepEqual(nums, [...nums].sort((a, b) => a - b), 'line order preserved');
  assert.ok(RITUAL_SECONDS === 60 && BURN_AT === 53);
});

test('she starts chanting straight after the intro, not seconds later', () => {
  // the old fixed 7s start left a 4s hole once the clips got faster
  const sched = buildRitualSchedule(mkClips(3), () => 0.5);
  const introEnd = 0.8 + 3;
  assert.ok(sched[1].at - introEnd <= 1.0,
    `${(sched[1].at - introEnd).toFixed(2)}s of dead air after the intro`);
});

test('gaps are evenly spaced whatever the clip length', () => {
  for (const clipLen of [2, 2.7, 3, 4.5]) {
    const gaps = gapsOf(buildRitualSchedule(mkClips(clipLen), () => 0.5), clipLen);
    const spread = Math.max(...gaps) - Math.min(...gaps);
    assert.ok(spread < 0.05, `clip ${clipLen}s: gaps uneven by ${spread.toFixed(2)}s`);
  }
});

test('the voice clips we actually ship chant with a 0.5-1s breath', () => {
  // guards the real artifact: re-speeding the voice must not reopen the holes
  const manifest = JSON.parse(readFileSync(new URL('./voice/manifest.json', import.meta.url)));
  for (const [variant, clips] of Object.entries(manifest)) {
    const dur = new Map(clips.map((c) => [c.id, c.duration]));
    const sched = buildRitualSchedule(clips, () => 0.5);
    const heard = sched.slice(1).map((s, i) =>
      s.at - (sched[i].at + dur.get(sched[i].id)) + CLIP_PADDING);
    assert.ok(Math.min(...heard) >= 0.5,
      `${variant}: ${Math.min(...heard).toFixed(2)}s gap runs the lines together`);
    assert.ok(Math.max(...heard) <= 1.0,
      `${variant}: ${Math.max(...heard).toFixed(2)}s gap reads as her trailing off`);
    assert.ok(sched.length - 2 >= 10, `${variant}: only ${sched.length - 2} lines fit`);
  }
});

test('no gap ever falls below the minimum, even when slack is spread', () => {
  for (const clipLen of [2, 3, 5, 6.5]) {
    const gaps = gapsOf(buildRitualSchedule(mkClips(clipLen), () => 0.5), clipLen);
    assert.ok(Math.min(...gaps) >= LINE_GAP - 1e-9,
      `clip ${clipLen}s: gap ${Math.min(...gaps).toFixed(3)}s undercuts LINE_GAP`);
  }
});

test('long clips stay evenly spaced instead of pooling into one void', () => {
  // 6.5s clips cannot tile the window neatly; the slack must still be shared
  const gaps = gapsOf(buildRitualSchedule(mkClips(6.5), () => 0.5), 6.5);
  const spread = Math.max(...gaps) - Math.min(...gaps);
  assert.ok(spread < 0.05, `slack pooled into one gap (spread ${spread.toFixed(2)}s)`);
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
