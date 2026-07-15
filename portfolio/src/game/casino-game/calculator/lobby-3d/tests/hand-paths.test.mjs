import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/hand-paths.js');
const HP = globalThis.CASINO.handPaths;

const IK_ACTIONS = ['dealCard', 'sweepChips', 'payChips', 'spinReach', 'spinFollow',
  'placeDolly', 'tapRack', 'washCards', 'shuffleRiffle'];

test('every IK action has a valid path', () => {
  for (const name of IK_ACTIONS) {
    const p = HP.PATHS[name];
    assert.ok(p, `missing path: ${name}`);
    assert.deepEqual(HP.validatePath(p), [], `${name}: ${HP.validatePath(p)}`);
  }
});

test('validatePath catches structural errors', () => {
  assert.ok(HP.validatePath(null).length);
  assert.ok(HP.validatePath({ dur: 0, hands: {} }).length, 'dur must be > 0, hands non-empty');
  assert.ok(HP.validatePath({ dur: 500, hands: { R: [{ at: 0.5, ref: 'nope' }] } }).length,
    'unknown ref');
  assert.ok(HP.validatePath({ dur: 500, hands: { R: [
    { at: 0.6, ref: 'target' }, { at: 0.4, rest: true }] } }).length, 'at must increase');
  assert.ok(HP.validatePath({ dur: 500, hands: { R: [{ at: 0.5, ref: 'target' }] } }).length,
    'last waypoint must be at 1');
  assert.ok(HP.validatePath({ dur: 500, hands: { R: [{ at: 1, ref: 'target', event: 'yeet' }] } }).length,
    'unknown event');
});

test('dealCard fires grab at the shoe then release at the target', () => {
  const wp = HP.PATHS.dealCard.hands.R;
  const grab = wp.find((w) => w.event === 'grab');
  const rel = wp.find((w) => w.event === 'release');
  assert.ok(grab && grab.ref === 'shoe');
  assert.ok(rel && rel.ref === 'target');
  assert.ok(grab.at < rel.at);
});

test('wash and riffle are two-hand cycles', () => {
  for (const name of ['washCards', 'shuffleRiffle']) {
    const p = HP.PATHS[name];
    assert.equal(p.cycle, true, name);
    assert.ok(p.hands.L && p.hands.R, `${name} needs both hands`);
  }
});
