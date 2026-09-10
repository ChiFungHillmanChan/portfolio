import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/hand-paths.js');
const HP = globalThis.CASINO.handPaths;

const IK_ACTIONS = ['dealCard', 'sweepChips', 'payChips', 'spinReach', 'spinFollow',
  'placeDolly', 'tapRack', 'washCards', 'shuffleRiffle',
  'baccaratDeal', 'baccaratRest', 'baccaratCollect'];

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

test('baccarat hands draw, transfer, reveal, and release in a deliberate sequence', () => {
  const p = HP.PATHS.baccaratDeal;
  const grab = p.hands.L.find(w => w.event === 'grab');
  const transfer = p.hands.R.find(w => w.event === 'contact');
  const release = p.hands.R.find(w => w.event === 'release');
  const transferHold = p.hands.R.find(w => w.at > transfer.at);
  assert.equal(p.continuous, true);
  assert.ok(grab.at < transfer.at && transfer.at < release.at);
  assert.ok((transferHold.at - transfer.at) * p.dur >= 250,
    'a card needs time to turn over while held by the receiving hand');
  assert.ok((1 - release.at) * p.dur >= 300, 'return must not whip back to neutral');
  assert.ok(p.hands.L.find(w => w.ref === 'rack').offset[0] > 0);
  assert.ok(transfer.offset[0] < 0, 'hands meet opposite edges of the card');
});
