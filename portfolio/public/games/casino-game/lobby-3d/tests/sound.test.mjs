import { test } from 'node:test';
import assert from 'node:assert/strict';

// sound.js is an inlined engine module (IIFE on globalThis.CASINO). In node
// there is no AudioContext / speechSynthesis / localStorage — importing it
// must not throw, and every API must safely no-op before unlock().
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
await import('../src/engine/sound.js');
const sound = globalThis.CASINO.sound;

test('module loads headless and exposes the full API surface', () => {
  for (const fn of ['unlock', 'play', 'say', 'sayResult', 'sayNoMoreBets', 'ballSpin', 'ambience', 'setMuted'])
    assert.equal(typeof sound[fn], 'function', fn);
  assert.equal(typeof sound.muted, 'boolean');
});

test('every call is a safe no-op before unlock (no AudioContext in node)', () => {
  assert.doesNotThrow(() => {
    sound.play('chip');
    sound.say('hello');
    sound.sayResult(32, 'red', 'even');
    sound.sayNoMoreBets();
    sound.ambience(true);
    const spin = sound.ballSpin(4000);
    spin.stop();
    sound.unlock();       // no AudioContext available — must degrade silently
    sound.play('card');
  });
});

test('mute preference persists via localStorage', () => {
  sound.setMuted(true);
  assert.equal(sound.muted, true);
  assert.equal(store.get('cg3d.soundMuted'), '1');
  sound.setMuted(false);
  assert.equal(sound.muted, false);
  assert.equal(store.get('cg3d.soundMuted'), '0');
});
