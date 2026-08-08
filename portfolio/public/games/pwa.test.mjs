import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GAMES_DIR = dirname(fileURLToPath(import.meta.url)); // portfolio/public/games
const PUBLIC_DIR = resolve(GAMES_DIR, '..');               // portfolio/public

// Live games: served from /games/<dir>/, each with its own precaching worker.
const GAMES = [
  { dir: 'card-drawer', manifest: 'manifest.webmanifest' },
  { dir: 'connect4', manifest: 'manifest.webmanifest' },
  { dir: 'card-game', manifest: 'manifest.json' },
  { dir: 'math-memory', manifest: 'manifest.webmanifest' },
];

/* Games that have moved to their own repo + subdomain. What stays behind under
   /games/<dir>/ is a redirect index.html and a TOMBSTONE sw.js whose only job
   is to evict the cache-first worker returning players still hold — it has no
   CACHE and no ASSETS by design. So they are excluded from every live-game
   guard above and covered by the tombstone contract below instead. Retiring
   another game is one line here. */
const RETIRED = [
  { dir: 'da-siu-yan', movedTo: 'https://da-siu-yan.hillmanchan.com/' },
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

/* A retired game's sw.js is the ONLY thing that gets returning players off the
   old cache-first worker they still hold — without it their browser serves the
   dead game from cache forever and never sees the redirect. Every step below is
   load-bearing, so pin all of them. */
for (const game of RETIRED) {
  const quoted = game.movedTo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  test(`${game.dir} (retired): service worker is a tombstone that evicts the old worker`, () => {
    const sw = read(GAMES_DIR, game.dir, 'sw.js');
    assert.match(sw, /addEventListener\('install',[^\n]*skipWaiting\(\)/,
      'must skipWaiting on install, or the old worker stays in control');
    assert.match(sw, /for \(const key of await caches\.keys\(\)\) await caches\.delete\(key\)/,
      'must delete every cache key — a surviving cache serves the dead game forever');
    assert.match(sw, /await self\.registration\.unregister\(\)/,
      'must unregister itself once the caches are gone');
    assert.match(sw, /self\.clients\.matchAll\(\{ type: 'window' \}\)/,
      'must reach every open window');
    assert.match(sw, /client\.navigate\(client\.url\)/,
      'must reload open pages so the redirect index.html can run');
    assert.ok(!/const (?:CACHE|ASSETS) =/.test(sw),
      'a tombstone must never precache anything — cleanup is its whole job');
  });

  test(`${game.dir} (retired): index.html redirects and registers no service worker`, () => {
    const html = read(GAMES_DIR, game.dir, 'index.html');
    assert.match(html, new RegExp(`http-equiv="refresh" content="0;url=${quoted}"`),
      'needs a meta refresh so the redirect survives JS being blocked');
    assert.match(html, new RegExp(`location\\.replace\\('${quoted}'\\)`),
      'needs the scripted redirect for the instant path');
    assert.ok(html.includes(`href="${game.movedTo}"`), 'needs a clickable fallback link');
    assert.ok(!/register\(/.test(html),
      're-registering a worker here would resurrect the one that just unregistered itself');
  });
}

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

test('shell: root service worker caches Google Fonts via an explicit two-host allowlist', () => {
  const sw = read(PUBLIC_DIR, 'sw.js');
  const hosts = extractJsonConst(sw, 'FONT_HOSTS');
  assert.deepEqual([...hosts].sort(), ['fonts.googleapis.com', 'fonts.gstatic.com'],
    'the shell SW cross-origin exception must stay exactly these two font hosts');
  assert.match(sw, /FONT_HOSTS\.includes\(url\.hostname\)/,
    'fonts must be matched by exact hostname against the allowlist, never by pattern');
  assert.match(sw, /mode: 'cors'/,
    'the no-cors stylesheet must be re-fetched in cors mode so an opaque 404 is not cached as the font');
});

test('shell: root service worker never intercepts the API (cross-origin allowlist is fonts-only)', () => {
  const sw = read(PUBLIC_DIR, 'sw.js');
  const code = sw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const fontBranch = code.indexOf('FONT_HOSTS.includes(url.hostname)');
  const crossOrigin = code.indexOf('url.origin !== self.location.origin');
  const rangeGuard = code.indexOf("req.headers.has('range')");
  assert.ok(crossOrigin > 0, 'shell SW must keep the cross-origin early return');
  assert.ok(rangeGuard > 0 && rangeGuard < fontBranch, 'range requests must still bail before font handling');
  assert.ok(fontBranch > 0 && fontBranch < crossOrigin,
    'the font allowlist must sit before the cross-origin return, which still drops every other origin');

  for (const host of extractJsonConst(sw, 'FONT_HOSTS')) {
    assert.ok(host.startsWith('fonts.') && host.endsWith('.com'),
      `${host} is not a font host — the shell SW must never cache another origin's responses`);
  }
  assert.ok(!/hillmanchan\.com/.test(code), 'shell SW must not special-case any API host');
  assert.ok(!/['"`/]api\//.test(code), 'shell SW must never touch /api/ — those responses are per-user and authenticated');
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

  // The apple-touch-icon href is built in JS ('/games/' + sub + '/icon-192.png')
  // rather than read from the manifest, so nothing else proves it resolves.
  assert.match(html, /'\/games\/' \+ sub \+ '\/icon-192\.png'/);
  for (const sub of mapped) {
    const icon = join(GAMES_DIR, sub, 'icon-192.png');
    assert.ok(existsSync(icon), `${sub}: apple-touch-icon /games/${sub}/icon-192.png is missing`);
    assert.deepEqual(pngSize(icon), { width: 192, height: 192 }, `${sub}: apple-touch-icon must be 192x192`);
  }
});

test('shell: subdomain install manifests are valid and icons exist', () => {
  for (const f of readdirSync(join(PUBLIC_DIR, 'pwa')).filter((n) => n.endsWith('.webmanifest'))) {
    const m = JSON.parse(read(PUBLIC_DIR, 'pwa', f));
    assert.equal(m.start_url, '/', `${f}: start_url must be /`);
    assert.equal(m.scope, '/', `${f}: scope must be /`);
    assert.equal(m.display, 'standalone');
    assert.ok(m.name && m.short_name, `${f}: name/short_name required`);
    const sizes = m.icons.map((i) => i.sizes);
    assert.ok(sizes.includes('192x192') && sizes.includes('512x512'), `${f}: need 192 + 512 icons`);
    for (const icon of m.icons) {
      assert.ok(icon.src.startsWith('/'), `${f}: icon src must be root-absolute`);
      const file = join(PUBLIC_DIR, icon.src.slice(1));
      assert.ok(existsSync(file), `${f}: missing icon ${icon.src}`);
      if (icon.type === 'image/png') {
        const [w, h] = icon.sizes.split('x').map(Number);
        assert.deepEqual(pngSize(file), { width: w, height: h }, `${f}: ${icon.src} is not ${icon.sizes}`);
      }
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
