import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GAMES_DIR = dirname(fileURLToPath(import.meta.url)); // portfolio/public/games
const PUBLIC_DIR = resolve(GAMES_DIR, '..');               // portfolio/public

const GAMES = [
  { dir: 'card-drawer', manifest: 'manifest.webmanifest' },
  { dir: 'connect4', manifest: 'manifest.webmanifest' },
  { dir: 'card-game', manifest: 'manifest.json' },
  { dir: 'math-memory', manifest: 'manifest.webmanifest' },
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

test('connect4: every self-hosted font file is precached', () => {
  const assets = extractJsonConst(read(GAMES_DIR, 'connect4', 'sw.js'), 'ASSETS');
  assert.ok(assets.includes('./fonts/fonts.css'));
  const css = read(GAMES_DIR, 'connect4', 'fonts', 'fonts.css');
  for (const [, f] of css.matchAll(/url\(([^)]+\.woff2)\)/g)) {
    assert.ok(assets.includes(`./fonts/${f}`), `font ${f} missing from ASSETS`);
  }
});

test('card-game: every runtime chunk is precached (root /assets drift guard)', () => {
  const html = read(GAMES_DIR, 'card-game', 'index.html');
  const assets = extractJsonConst(read(GAMES_DIR, 'card-game', 'sw.js'), 'ASSETS');
  const refs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length >= 2, 'expected root-absolute /assets refs in card-game index.html');
  const entryName = refs.find((r) => r.endsWith('.js')).slice('/assets/'.length);
  const entryJs = read(PUBLIC_DIR, 'assets', entryName);
  const lazy = [...entryJs.matchAll(/import\("\.\/([^"]+)"\)/g)].map((m) => `/assets/${m[1]}`);
  assert.ok(lazy.length >= 2, 'expected lazy sync-manager chunks');
  for (const ref of [...refs, ...lazy]) {
    assert.ok(assets.includes(ref), `${ref} is loaded at runtime but not in ASSETS`);
  }
  assert.ok(!existsSync(join(GAMES_DIR, 'card-game', 'assets')), 'stale card-game/assets/ must stay deleted');
});

test('card-drawer: runtime references are precached (reverse drift guard)', () => {
  const assets = extractJsonConst(read(GAMES_DIR, 'card-drawer', 'sw.js'), 'ASSETS');
  const html = read(GAMES_DIR, 'card-drawer', 'index.html');
  const htmlRefs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => !u.startsWith('http') && !u.startsWith('#'));
  const js = read(GAMES_DIR, 'card-drawer', 'game.js');
  const imports = [...js.matchAll(/from '\.\/([^']+)'/g), ...js.matchAll(/import\('\.\/([^']+)'\)/g)]
    .map((m) => m[1]);
  for (const ref of [...htmlRefs, ...imports]) {
    assert.ok(assets.includes(`./${ref}`), `${ref} referenced at runtime but not in ASSETS`);
  }
});

test('connect4: runtime references are precached (reverse drift guard)', () => {
  const assets = extractJsonConst(read(GAMES_DIR, 'connect4', 'sw.js'), 'ASSETS');
  const html = read(GAMES_DIR, 'connect4', 'index.html');
  const htmlRefs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => !u.startsWith('http') && !u.startsWith('#'));
  const fetches = [...html.matchAll(/fetch\('\.\/([^']+)'\)/g)].map((m) => m[1]);
  for (const ref of [...htmlRefs, ...fetches]) {
    assert.ok(assets.includes(`./${ref}`), `${ref} referenced at runtime but not in ASSETS`);
  }
});

test('math-memory: fonts are self-hosted (no Google Fonts requests)', () => {
  const html = read(GAMES_DIR, 'math-memory', 'index.html');
  assert.ok(!html.includes('fonts.googleapis.com'), 'Google Fonts CSS link must be gone');
  assert.ok(!html.includes('fonts.gstatic.com'), 'gstatic preconnect must be gone');
  assert.match(html, /href="fonts\/fonts\.css"/);
  const css = read(GAMES_DIR, 'math-memory', 'fonts', 'fonts.css');
  assert.match(css, /font-family: ?'Fraunces'/);
  assert.match(css, /font-family: ?'Spline Sans Mono'/);
  const files = [...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map((m) => m[1]);
  assert.ok(files.length >= 2, 'expected at least one woff2 per family');
  for (const f of files) {
    assert.ok(existsSync(join(GAMES_DIR, 'math-memory', 'fonts', f)), `missing font file ${f}`);
  }
});

test('math-memory: runtime references are precached (reverse drift guard)', () => {
  const assets = extractJsonConst(read(GAMES_DIR, 'math-memory', 'sw.js'), 'ASSETS');
  const html = read(GAMES_DIR, 'math-memory', 'index.html');
  const htmlRefs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => !u.startsWith('http') && !u.startsWith('#'));
  for (const ref of htmlRefs) {
    assert.ok(assets.includes(`./${ref}`), `${ref} referenced at runtime but not in ASSETS`);
  }
  const css = read(GAMES_DIR, 'math-memory', 'fonts', 'fonts.css');
  for (const [, f] of css.matchAll(/url\(([^)]+\.woff2)\)/g)) {
    assert.ok(assets.includes(`./fonts/${f}`), `font ${f} missing from ASSETS`);
  }
});

test('shell: root service worker precaches the app shell', () => {
  const sw = read(PUBLIC_DIR, 'sw.js');
  const cacheName = extractJsonConst(sw, 'CACHE');
  assert.match(cacheName, /^portfolio-shell-v\d+$/);
  const precache = extractJsonConst(sw, 'PRECACHE');
  assert.ok(precache.includes('/index.html'), 'PRECACHE must include /index.html');

  assert.match(sw, /pathname\.startsWith\('\/games\/'\)/, 'shell SW must bypass /games/');
  assert.match(sw, /mode === 'navigate'/, 'shell SW must special-case navigations');
  assert.ok(sw.includes('/\\.[0-9a-f]{8}\\./'), 'shell SW must only cache hashed /static/ files');
  assert.match(sw, /req\.headers\.has\('range'\)/, 'shell SW must skip range requests');
  assert.match(sw, /text\/html/, 'shell SW must only cache HTML under the fallback key');
});

test('shell: index.html registers /sw.js and maps game subdomains to /pwa/ manifests', () => {
  const html = read(PUBLIC_DIR, 'index.html');
  assert.match(html, /register\('\/sw\.js'\)/);
  const mapped = [...html.matchAll(/'([a-z0-9-]+)': 1/g)].map((m) => m[1]);
  const manifests = readdirSync(join(PUBLIC_DIR, 'pwa'))
    .filter((f) => f.endsWith('.webmanifest'))
    .map((f) => f.replace(/\.webmanifest$/, ''));
  assert.ok(manifests.length >= 4, 'expected a /pwa manifest per PWA game');
  assert.deepEqual(mapped.sort(), manifests.sort());
});

test('shell: subdomain install manifests are valid and icons exist', () => {
  for (const f of readdirSync(join(PUBLIC_DIR, 'pwa')).filter((n) => n.endsWith('.webmanifest'))) {
    const m = JSON.parse(read(PUBLIC_DIR, 'pwa', f));
    assert.equal(m.start_url, '/', `${f}: start_url must be /`);
    assert.equal(m.scope, '/', `${f}: scope must be /`);
    assert.equal(m.display, 'standalone');
    assert.ok(m.name && m.short_name, `${f}: name/short_name required`);
    for (const icon of m.icons) {
      assert.ok(icon.src.startsWith('/'), `${f}: icon src must be root-absolute`);
      assert.ok(existsSync(join(PUBLIC_DIR, icon.src.slice(1))), `${f}: missing icon ${icon.src}`);
    }
  }
});

test('game service workers share one canonical body (parity guard)', () => {
  function normalize(src) {
    return src
      .replace(/^\/\*[\s\S]*?\*\//, '')
      .replace(/const CACHE = [^\n]*;\n/, '')
      .replace(/const ASSETS = \[[\s\S]*?\];\n/, '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');
  }
  const canonical = normalize(read(GAMES_DIR, 'card-drawer', 'sw.js'));
  for (const game of GAMES) {
    if (game.dir === 'card-drawer') continue;
    const body = normalize(read(GAMES_DIR, game.dir, 'sw.js'));
    assert.equal(body, canonical, `${game.dir}/sw.js body diverges from card-drawer's canonical body`);
  }
});
