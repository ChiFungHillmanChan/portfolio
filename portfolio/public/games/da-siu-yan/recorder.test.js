import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickMimeType, extFor } from './recorder.js';

test('prefers mp4, falls back to webm, null when nothing works', () => {
  assert.equal(pickMimeType((m) => m.startsWith('video/mp4')), 'video/mp4;codecs=avc1');
  assert.equal(pickMimeType((m) => m === 'video/webm'), 'video/webm');
  assert.equal(pickMimeType(() => false), null);
});

test('extFor maps container correctly', () => {
  assert.equal(extFor('video/mp4;codecs=avc1'), 'mp4');
  assert.equal(extFor('video/webm;codecs=vp9,opus'), 'webm');
});
