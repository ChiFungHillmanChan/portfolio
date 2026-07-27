import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createConsent } from './consent.js';

test('no photo: the ritual starts freely', () => {
  const c = createConsent();
  assert.equal(c.canStart(), true);
  assert.deepEqual(c.state(), { hasPhoto: false, confirmed: false });
});

test('photo loaded but unconfirmed: blocked', () => {
  const c = createConsent();
  c.photoChanged(true);
  assert.equal(c.canStart(), false);
});

test('photo loaded and confirmed: allowed', () => {
  const c = createConsent();
  c.photoChanged(true);
  c.setConfirmed(true);
  assert.equal(c.canStart(), true);
});

test('swapping the photo resets a previous confirmation', () => {
  const c = createConsent();
  c.photoChanged(true);
  c.setConfirmed(true);
  c.photoChanged(true);                 // a DIFFERENT image
  assert.equal(c.canStart(), false);
  assert.deepEqual(c.state(), { hasPhoto: true, confirmed: false });
});

test('a failed decode clears the photo and its confirmation', () => {
  const c = createConsent();
  c.photoChanged(true);
  c.setConfirmed(true);
  c.photoChanged(false);
  assert.equal(c.canStart(), true);
  assert.deepEqual(c.state(), { hasPhoto: false, confirmed: false });
});

test('confirming with no photo records the flag without inventing a photo', () => {
  const c = createConsent();
  c.setConfirmed(true);
  assert.equal(c.canStart(), true);
  assert.deepEqual(c.state(), { hasPhoto: false, confirmed: true });
});
