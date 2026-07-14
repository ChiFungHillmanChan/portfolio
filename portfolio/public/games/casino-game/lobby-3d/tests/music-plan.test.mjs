import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/music-plan.js');
const M = globalThis.CASINO.musicPlan;

// deterministic rng for reproducible plans (same idiom as baccarat-roads tests)
const mulberry32 = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

test('buildTrackPlan: shape and ranges', () => {
  for (let s = 0; s < 30; s++) {
    const p = M.buildTrackPlan(mulberry32(s));
    assert.ok(p.bpm >= 72 && p.bpm <= 92, `bpm ${p.bpm}`);
    assert.ok(p.swing >= 0.60 && p.swing <= 0.70, `swing ${p.swing}`);
    assert.equal(p.beatsPerBar, 4);
    assert.equal(p.bars, 8);
    assert.ok(p.events.length > 0);
    assert.ok(['major', 'minor'].includes(p.mode));
  }
});

test('events are time-sorted and inside the track', () => {
  const p = M.buildTrackPlan(mulberry32(7));
  const total = p.bars * p.beatsPerBar;
  let prev = -1;
  for (const e of p.events) {
    assert.ok(e.at >= prev - 1e-9, `event at ${e.at} after ${prev}`);
    prev = e.at;
    assert.ok(e.at >= 0 && e.at < total, `event at ${e.at} outside 0..${total}`);
    assert.ok(e.dur > 0);
    assert.ok(['chord', 'bass', 'brush'].includes(e.type));
  }
});

test('all pitched frequencies are audible-range Hz', () => {
  for (let s = 0; s < 30; s++) {
    const p = M.buildTrackPlan(mulberry32(s));
    for (const e of p.events) {
      const freqs = e.type === 'chord' ? e.freqs : e.type === 'bass' ? [e.freq] : [];
      for (const f of freqs) assert.ok(f >= 30 && f <= 2000, `${e.type} freq ${f}`);
    }
  }
});

test('every bar has exactly one chord and four bass quarter notes', () => {
  const p = M.buildTrackPlan(mulberry32(11));
  for (let bar = 0; bar < p.bars; bar++) {
    const inBar = (e) => e.at >= bar * 4 - 1e-9 && e.at < (bar + 1) * 4 - 1e-9;
    const chords = p.events.filter((e) => e.type === 'chord' && inBar(e));
    const bass = p.events.filter((e) => e.type === 'bass' && inBar(e));
    assert.equal(chords.length, 1, `bar ${bar} chords`);
    assert.equal(bass.length, 4, `bar ${bar} bass notes`);
    assert.ok(chords[0].freqs.length >= 3, 'chord has at least 3 voices');
  }
});

test('deterministic under the same seed, varied across seeds', () => {
  const a = M.buildTrackPlan(mulberry32(5));
  const b = M.buildTrackPlan(mulberry32(5));
  assert.deepEqual(a, b);
  const c = M.buildTrackPlan(mulberry32(6));
  assert.notDeepEqual(a, c);
});

test('progression degrees come from the published pool', () => {
  for (let s = 0; s < 20; s++) {
    const p = M.buildTrackPlan(mulberry32(s));
    const pool = M.PROGRESSIONS[p.mode];
    assert.ok(pool.some((prog) => JSON.stringify(prog) === JSON.stringify(p.progression)),
      `progression ${JSON.stringify(p.progression)} not in ${p.mode} pool`);
  }
});
