import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/gestures.js');
const G = globalThis.CASINO.gestures;

test('every built-in clip validates clean', () => {
  for (const [name, clip] of Object.entries(G.CLIPS)) {
    assert.deepEqual(G.validateClip(clip), [], `clip ${name}`);
  }
});

test('the choreography set exists', () => {
  for (const name of ['dealCard', 'sweepChips', 'payChips', 'spinReach', 'spinFollow',
    'placeDolly', 'tapRack', 'wave', 'welcomeSweep', 'nod', 'headShake',
    'washCards', 'shuffleRiffle', 'armsRest']) {
    assert.ok(G.CLIPS[name], name);
  }
});

test('validateClip catches bad clips', () => {
  assert.ok(G.validateClip({ track: 'nope', dur: 100, keys: [] }).length > 0);
  assert.ok(G.validateClip({ track: 'arms', dur: 0,
    keys: [{ at: 1, joints: { shoulderR: { rest: true } } }] }).length > 0);
  // non-increasing keyframe times
  assert.ok(G.validateClip({ track: 'arms', dur: 100, keys: [
    { at: 0.5, joints: { shoulderR: { rest: true } } },
    { at: 0.4, joints: { shoulderR: { rest: true } } },
  ] }).length > 0);
  // last key must land at 1
  assert.ok(G.validateClip({ track: 'arms', dur: 100,
    keys: [{ at: 0.5, joints: { shoulderR: { rest: true } } }] }).length > 0);
  // unknown joint / unknown ease / conflicting target
  assert.ok(G.validateClip({ track: 'arms', dur: 100,
    keys: [{ at: 1, joints: { pinky: { rest: true } } }] }).length > 0);
  assert.ok(G.validateClip({ track: 'arms', dur: 100,
    keys: [{ at: 1, ease: 'bounce', joints: { shoulderR: { rest: true } } }] }).length > 0);
  assert.ok(G.validateClip({ track: 'arms', dur: 100,
    keys: [{ at: 1, joints: { shoulderR: { rest: true, aim: 'x' } } }] }).length > 0);
});

test('wrapLines wraps and caps at 3 lines', () => {
  assert.deepEqual(G.wrapLines('Welcome!'), ['Welcome!']);
  assert.deepEqual(G.wrapLines('May I see your member card?', 14),
    ['May I see your', 'member card?']);
  const long = G.wrapLines('one two three four five six seven eight nine ten', 8);
  assert.equal(long.length, 3);
  assert.ok(long[2].endsWith('…'));
});
