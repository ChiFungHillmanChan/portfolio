// tests/manifest.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'assets/manifest.json'), 'utf8'));

test('manifest lists both dealer asset files within budget', () => {
  const names = manifest.files.map((f) => f.name);
  assert.ok(names.includes('dealer-characters.glb'));
  assert.ok(names.includes('dealer-clips.glb'));
  const total = manifest.files.reduce((s, f) => s + f.bytes, 0);
  assert.ok(total <= 5 * 1024 * 1024, `assets total ${total} bytes exceeds 5MB budget`);
});

test('character file is rigged and clips file has a library', () => {
  const chars = manifest.files.find((f) => f.name === 'dealer-characters.glb');
  const clips = manifest.files.find((f) => f.name === 'dealer-clips.glb');
  assert.ok(chars.bones.length >= 20, `expected a humanoid skeleton, got ${chars.bones.length} bones`);
  assert.ok(clips.clips.length >= 20, `expected an animation library, got ${clips.clips.length} clips`);
});
