import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialReception, receptionReduce, canPassTurnstile } from '../reception-model.js';

const seq = (evs, from = initialReception) => evs.reduce((s, e) => receptionReduce(s, e), from);

test('cold load signed out → out; signed in → wave → floor', () => {
  assert.equal(seq([{ type: 'AUTH_READY', signedIn: false }]).phase, 'out');
  const s = seq([{ type: 'AUTH_READY', signedIn: true }]);
  assert.equal(s.phase, 'wave');
  assert.equal(seq([{ type: 'WAVE_DONE' }], s).phase, 'floor');
});

test('check-in happy path: out → checkin → authing → welcome → floor', () => {
  let s = seq([{ type: 'AUTH_READY', signedIn: false }, { type: 'OPEN_CHECKIN' }, { type: 'SIGNIN_START' }]);
  assert.equal(s.phase, 'authing');
  s = receptionReduce(s, { type: 'SIGNED_IN' });
  assert.equal(s.phase, 'welcome');
  assert.equal(receptionReduce(s, { type: 'WELCOME_DONE' }).phase, 'floor');
});

test('sign-in failure returns to checkin with the error code', () => {
  const s = seq([
    { type: 'AUTH_READY', signedIn: false }, { type: 'OPEN_CHECKIN' },
    { type: 'SIGNIN_START' }, { type: 'SIGNIN_ERROR', code: 'auth/popup-blocked' },
  ]);
  assert.deepEqual(s, { phase: 'checkin', error: 'auth/popup-blocked' });
});

test('closing the card clears the error; reopening keeps it closed until OPEN_CHECKIN', () => {
  const errored = seq([
    { type: 'AUTH_READY', signedIn: false }, { type: 'OPEN_CHECKIN' },
    { type: 'SIGNIN_START' }, { type: 'SIGNIN_ERROR', code: 'x' },
  ]);
  const closed = receptionReduce(errored, { type: 'CLOSE_CHECKIN' });
  assert.deepEqual(closed, { phase: 'out', error: null });
});

test('sign-out from any signed-in phase returns to out and closes the floor', () => {
  const onFloor = seq([{ type: 'AUTH_READY', signedIn: true }, { type: 'WAVE_DONE' }]);
  const out = receptionReduce(onFloor, { type: 'SIGNED_OUT' });
  assert.equal(out.phase, 'out');
  assert.equal(canPassTurnstile(out), false);
});

test('turnstile passes only for welcome/wave/floor', () => {
  for (const [phase, want] of [['boot', false], ['out', false], ['checkin', false],
    ['authing', false], ['welcome', true], ['wave', true], ['floor', true], ['unavailable', false]]) {
    assert.equal(canPassTurnstile({ phase, error: null }), want, phase);
  }
});

test('signed-in from another tab while the card is open still welcomes', () => {
  const s = seq([{ type: 'AUTH_READY', signedIn: false }, { type: 'OPEN_CHECKIN' }, { type: 'SIGNED_IN' }]);
  assert.equal(s.phase, 'welcome');
});

test('irrelevant events are no-ops; AUTH_UNAVAILABLE is sticky', () => {
  const out = seq([{ type: 'AUTH_READY', signedIn: false }]);
  assert.equal(receptionReduce(out, { type: 'WELCOME_DONE' }), out);
  assert.equal(receptionReduce(out, { type: 'WAVE_DONE' }), out);
  assert.equal(seq([{ type: 'AUTH_UNAVAILABLE' }]).phase, 'unavailable');
});
