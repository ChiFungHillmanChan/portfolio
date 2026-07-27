import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRecorder, pickMimeType, extFor, isAndroid } from './recorder.js';

test('prefers mp4, falls back to webm, null when nothing works', () => {
  assert.equal(pickMimeType((m) => m.startsWith('video/mp4')), 'video/mp4;codecs=avc1');
  assert.equal(pickMimeType((m) => m === 'video/webm'), 'video/webm');
  assert.equal(pickMimeType(() => false), null);
});

test('Android prefers VP8 WebM instead of Chrome fragmented MP4', () => {
  const supportsEverything = () => true;
  assert.equal(
    pickMimeType(supportsEverything, true),
    'video/webm;codecs=vp8,opus'
  );
  assert.equal(isAndroid('Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/138'), true);
  assert.equal(isAndroid('Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)'), false);
});

test('Android recording is returned with repaired duration metadata', async (t) => {
  const originalMediaRecorder = globalThis.MediaRecorder;
  t.after(() => { globalThis.MediaRecorder = originalMediaRecorder; });

  let fixedDuration = null;
  class FakeMediaRecorder {
    static isTypeSupported() { return true; }

    constructor(stream, options) {
      this.mimeType = options.mimeType;
      this.state = 'inactive';
    }

    start() { this.state = 'recording'; }

    pause() { this.state = 'paused'; }

    resume() { this.state = 'recording'; }

    stop() {
      this.ondataavailable({
        data: new Blob(['recorded'], { type: this.mimeType })
      });
      this.state = 'inactive';
      this.onstop();
    }
  }
  globalThis.MediaRecorder = FakeMediaRecorder;

  let now = 1_000;
  const recorder = createRecorder({}, {
    userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9)',
    now: () => now,
    fixWebmDuration: async (blob, duration) => {
      fixedDuration = duration;
      return new Blob([blob, '-fixed'], { type: blob.type });
    }
  });

  recorder.start();
  now = 61_000;
  const blob = await recorder.stop();

  assert.equal(blob.type, 'video/webm;codecs=vp8,opus');
  assert.equal(fixedDuration, 60_000);
  assert.equal(await blob.text(), 'recorded-fixed');
});

test('browser loads the duration repair helper before the game module', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const helperAt = html.indexOf('vendor/fix-webm-duration.js');
  const gameAt = html.indexOf('type="module" src="game.js"');
  assert.ok(helperAt >= 0 && helperAt < gameAt);

  const source = readFileSync(
    new URL('./vendor/fix-webm-duration.js', import.meta.url),
    'utf8'
  );
  const browser = { window: {} };
  runInNewContext(source, browser);
  assert.equal(typeof browser.window.ysFixWebmDuration, 'function');
});

test('extFor maps container correctly', () => {
  assert.equal(extFor('video/mp4;codecs=avc1'), 'mp4');
  assert.equal(extFor('video/webm;codecs=vp9,opus'), 'webm');
});
