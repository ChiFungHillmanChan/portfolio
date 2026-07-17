import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GAMES_DIR = dirname(fileURLToPath(import.meta.url)); // portfolio/public/games
const PUBLIC_DIR = resolve(GAMES_DIR, '..');               // portfolio/public

const GAMES = [
  { dir: 'card-drawer', manifest: 'manifest.webmanifest' },
];

const read = (...p) => readFileSync(join(...p), 'utf8');

function extractJsonConst(source, name) {
  const m = source.match(new RegExp(`const ${name} = ([\\s\\S]*?);\\n`));
  assert.ok(m, `const ${name} not found in strict-JSON form`);
  return JSON.parse(m[1]);
}

function assetFile(gameDir, entry) {
  if (entry.startsWith('./')) return join(GAMES_DIR, gameDir, entry.slice(2));
  if (entry.startsWith('/')) return join(PUBLIC_DIR, entry.slice(1));
  assert.fail(`ASSETS entry must start with './' or '/': ${entry}`);
}

function pngSize(file) {
  const buf = readFileSync(file);
  assert.equal(buf.readUInt32BE(0), 0x89504e47, `${file} is not a PNG`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

for (const game of GAMES) {
  test(`${game.dir}: service worker precache is complete and versioned`, () => {
    const sw = read(GAMES_DIR, game.dir, 'sw.js');
    const cacheName = extractJsonConst(sw, 'CACHE');
    assert.match(cacheName, new RegExp(`^${game.dir}-v\\d+$`));
    const assets = extractJsonConst(sw, 'ASSETS');
    assert.ok(assets.includes('./index.html'), 'ASSETS must include ./index.html');
    for (const entry of assets) {
      assert.ok(existsSync(assetFile(game.dir, entry)), `missing file for ASSETS entry ${entry}`);
    }
  });

  test(`${game.dir}: index.html registers the service worker and links the manifest`, () => {
    const html = read(GAMES_DIR, game.dir, 'index.html');
    assert.match(html, /register\('\.\/sw\.js'\)/);
    assert.ok(html.includes(game.manifest), `index.html must link ${game.manifest}`);
    assert.match(html, /theme-color/);
    assert.match(html, /apple-touch-icon/);
  });

  test(`${game.dir}: manifest is installable`, () => {
    const manifest = JSON.parse(read(GAMES_DIR, game.dir, game.manifest));
    assert.equal(manifest.start_url, './index.html');
    assert.equal(manifest.scope, './');
    assert.equal(manifest.display, 'standalone');
    assert.ok(manifest.name && manifest.short_name, 'name and short_name required');
    assert.ok(manifest.background_color && manifest.theme_color, 'colors required');
    const sizes = manifest.icons.map((i) => i.sizes);
    assert.ok(sizes.includes('192x192') && sizes.includes('512x512'), 'need 192 + 512 icons');
    for (const icon of manifest.icons) {
      const file = join(GAMES_DIR, game.dir, icon.src.replace(/^\.\//, ''));
      assert.ok(existsSync(file), `missing icon ${icon.src}`);
      if (icon.type === 'image/png') {
        const [w, h] = icon.sizes.split('x').map(Number);
        assert.deepEqual(pngSize(file), { width: w, height: h });
      }
    }
  });

  test(`${game.dir}: manifest icons are precached`, () => {
    const assets = extractJsonConst(read(GAMES_DIR, game.dir, 'sw.js'), 'ASSETS');
    const manifest = JSON.parse(read(GAMES_DIR, game.dir, game.manifest));
    for (const icon of manifest.icons) {
      assert.ok(assets.includes(icon.src), `icon ${icon.src} missing from ASSETS`);
    }
  });
}

test('connect4: fonts are self-hosted (no Google Fonts requests)', () => {
  const html = read(GAMES_DIR, 'connect4', 'index.html');
  assert.ok(!html.includes('fonts.googleapis.com'), 'Google Fonts CSS link must be gone');
  assert.ok(!html.includes('fonts.gstatic.com'), 'gstatic preconnect must be gone');
  assert.match(html, /href="fonts\/fonts\.css"/);
  const css = read(GAMES_DIR, 'connect4', 'fonts', 'fonts.css');
  assert.match(css, /font-family: ?'Fraunces'/);
  assert.match(css, /font-family: ?'JetBrains Mono'/);
  const files = [...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map((m) => m[1]);
  assert.ok(files.length >= 2, 'expected at least one woff2 per family');
  for (const f of files) {
    assert.ok(existsSync(join(GAMES_DIR, 'connect4', 'fonts', f)), `missing font file ${f}`);
  }
});
