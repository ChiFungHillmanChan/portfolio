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

// v2 trims the clip file to exactly the clips the lobby uses (spec
// 2026-07-17-dealer-glb-v2-fixes-design.md) — assert the exact set so a
// future re-run of build-dealer-assets.mjs can't silently drop one.
const KEEP_CLIPS = ['Idle_Loop', 'Idle_Talking_Loop', 'Interact', 'PickUp_Table', 'Walk_Formal_Loop', 'Walk_Loop'];

test('character file is rigged, dressed, and haired; clips file has exactly the lobby set', () => {
  const chars = manifest.files.find((f) => f.name === 'dealer-characters.glb');
  const clips = manifest.files.find((f) => f.name === 'dealer-clips.glb');
  assert.ok(chars.bones.length >= 20, `expected a humanoid skeleton, got ${chars.bones.length} bones`);
  for (const hair of ['Hair_Buzzed', 'Hair_SimpleParted', 'Hair_Buns', 'Hair_Long', 'Hair_Beard']) {
    assert.ok(chars.meshes.includes(hair), `hairstyle mesh missing from GLB: ${hair}`);
  }
  assert.deepEqual(clips.clips.map((c) => c.name).sort(), [...KEEP_CLIPS].sort(),
    'clips file must carry exactly the lobby clip set');
});
