import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('build produces the lobby index.html', async () => {
  const { build } = await import(join(ROOT, 'build.mjs'));
  const bytes = build();
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  assert.ok(bytes > 500 * 1024, 'vendor inlined (>500KB)');
  assert.ok(html.includes('GRAND CASINO'));
  assert.ok(html.includes('<script type="module" src="./platform.js">'), 'platform module layered on top');
  assert.ok(!html.includes('__VENDOR__'), 'vendor marker replaced');
  assert.ok(!html.includes('/*__CSS__*/'), 'css marker replaced');
  assert.ok(!html.includes('//__APP__'), 'app marker replaced');
  assert.ok(!/src\s*=\s*"http/.test(html), 'no external resources');
});
