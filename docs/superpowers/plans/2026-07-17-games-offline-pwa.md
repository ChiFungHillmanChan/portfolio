# Games Offline PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make card-drawer, connect4, and card-game (Never Have I Ever) fully playable offline and installable to a phone home screen, via a per-game service worker + web app manifest.

**Architecture:** Each game folder under `portfolio/public/games/<name>/` gets its own `sw.js` (versioned precache, cache-first fetch) and manifest + icons, registered from the game's own `index.html` with relative paths so it works on `hillmanchan.com/games/<name>/` and on the game subdomains (each subdomain is its own origin/cache). A single node test file validates precache-list/manifest/registration integrity for all three games. Connect4's Google Fonts get self-hosted. Spec: `docs/superpowers/specs/2026-07-17-games-offline-pwa-design.md`.

**Tech Stack:** Vanilla service worker API, W3C web app manifest, `node --test`, headless Chrome + `sips` for icon rasterization.

## Global Constraints

- Branch: `worktree-games-offline-pwa` in worktree `.claude/worktrees/games-offline-pwa`. Never touch `feat/dealer-glb-character`. Run ALL commands from the worktree root.
- **No emoji anywhere** (icons, UI copy) — SVG geometry only (user rule).
- In every `sw.js`, `CACHE` and `ASSETS` MUST be declared in **strict JSON style** (double quotes, no trailing commas): `const CACHE = "card-drawer-v1";` — the test suite JSON.parses them.
- SW registration is exactly `navigator.serviceWorker.register('./sw.js')` in all three games (test asserts this string).
- `node --test` needs explicit glob form on this Node 22.22 (`node --test "*.test.js"` — bare directory discovery is broken).
- Scratch dir for temp files: `/private/tmp/claude-501/-Users-hillmanchan-Desktop-HillmanChan-portfolio/9a9441af-6154-430d-b8b2-7218d3b2ac83/scratchpad`
- Push branch + open PR at the end; **NO merge without explicit user instruction.**
- PR bodies end with: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`; commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: PWA test harness + Card Drawer PWA

**Files:**
- Create: `portfolio/public/games/pwa.test.mjs`
- Create: `portfolio/public/games/card-drawer/sw.js`
- Create: `portfolio/public/games/card-drawer/manifest.webmanifest`
- Create: `portfolio/public/games/card-drawer/icon.svg`, `icon-512.png`, `icon-192.png`
- Modify: `portfolio/public/games/card-drawer/index.html`

**Interfaces:**
- Produces: `pwa.test.mjs` with a `GAMES` array of `{ dir, manifest }` entries — Tasks 3 and 4 append their game to it. Helpers other tests reuse: `read(...pathParts)`, `extractJsonConst(source, name)`, `assetFile(gameDir, entry)` ('./x' → `games/<dir>/x`, '/x' → `public/x`), `pngSize(file)` → `{width, height}`.
- Produces: the canonical `sw.js` pattern Tasks 3/4 copy (only `CACHE`/`ASSETS` differ).

- [ ] **Step 1: Write the failing test harness**

Create `portfolio/public/games/pwa.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test — must fail (no sw.js yet)**

```bash
node --test "portfolio/public/games/pwa.test.mjs"
```
Expected: FAIL — `ENOENT ... card-drawer/sw.js`.

- [ ] **Step 3: Create the icon**

Create `portfolio/public/games/card-drawer/icon.svg` (navy felt, fanned cards, spade — matches `--felt-900: #111830`):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#111830"/>
  <g transform="rotate(-12 256 280)">
    <rect x="150" y="130" width="180" height="260" rx="20" fill="#e8ecf7" opacity="0.5"/>
  </g>
  <g transform="rotate(8 256 280)">
    <rect x="166" y="118" width="180" height="260" rx="20" fill="#ffffff"/>
    <path d="M256 170 C 226 214 196 236 196 268 A 30 30 0 0 0 250 286 C 248 306 240 320 228 332 L 284 332 C 272 320 264 306 262 286 A 30 30 0 0 0 316 268 C 316 236 286 214 256 170 Z" fill="#182140"/>
  </g>
</svg>
```

Rasterize (headless Chrome never exits → background + pkill; the file IS written):

```bash
cd portfolio/public/games/card-drawer
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --user-data-dir=/tmp/chrome-profile-icons \
  --window-size=512,512 --virtual-time-budget=2000 \
  --screenshot="$PWD/icon-512.png" "file://$PWD/icon.svg" &
sleep 5 && pkill -f chrome-profile-icons
sips -z 192 192 icon-512.png --out icon-192.png
cd ../../../..
```

Then **Read `icon-512.png` visually** — must show navy tile + white cards + spade, no scrollbars/white margins. If margins appear, screenshot again with `--hide-scrollbars`.

- [ ] **Step 4: Create the manifest**

`portfolio/public/games/card-drawer/manifest.webmanifest`:

```json
{
  "name": "Card Drawer",
  "short_name": "Card Drawer",
  "description": "Pass-and-play card dealer and poker-hand scorepad.",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#111830",
  "theme_color": "#111830",
  "icons": [
    { "src": "./icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "./icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 5: Create the service worker**

`portfolio/public/games/card-drawer/sw.js` (this is the canonical pattern — Tasks 3/4 copy it changing only the two consts):

```js
/* Card Drawer service worker — offline cache.
   Bump the version in CACHE whenever ANY file listed in ASSETS changes,
   otherwise returning players keep the old files. CACHE and ASSETS must
   stay strict JSON (double quotes) — pwa.test.mjs parses them. */
const CACHE = "card-drawer-v1";
const ASSETS = [
  "./index.html",
  "./styles.css",
  "./game.js",
  "./card-svg.js",
  "./hand-eval.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // Cross-origin (Firebase, gstatic, analytics): browser default behavior.
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const resp = await fetch(req);
      if (resp.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, resp.clone());
      }
      return resp;
    } catch (err) {
      if (req.mode === 'navigate') {
        const index = await caches.match('./index.html');
        if (index) return index;
      }
      throw err;
    }
  })());
});
```

- [ ] **Step 6: Wire up index.html**

In `portfolio/public/games/card-drawer/index.html`, after the existing `<link rel="stylesheet" href="styles.css" />` line add:

```html
  <link rel="manifest" href="manifest.webmanifest" />
  <meta name="theme-color" content="#111830" />
  <link rel="apple-touch-icon" href="icon-192.png" />
```

Before `</body>` add:

```html
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').catch(function (err) {
          console.warn('[pwa] service worker registration failed:', err);
        });
      });
    }
  </script>
```

- [ ] **Step 7: Run tests — all pass, and card-drawer's own tests still pass**

```bash
node --test "portfolio/public/games/pwa.test.mjs"
cd portfolio/public/games/card-drawer && node --test "*.test.js" && cd ../../../..
```
Expected: PASS (4 pwa tests; all existing card-drawer tests green).

- [ ] **Step 8: Commit**

```bash
git add portfolio/public/games/pwa.test.mjs portfolio/public/games/card-drawer
git commit -m "feat(card-drawer): offline PWA — service worker, manifest, icons + pwa test harness

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Connect 4 — self-host Google Fonts

**Files:**
- Create: `portfolio/scripts/fetch-connect4-fonts.mjs`
- Create: `portfolio/public/games/connect4/fonts/fonts.css` + `f*.woff2` (generated)
- Modify: `portfolio/public/games/connect4/index.html` (lines 7–9: the two preconnect links + Google Fonts stylesheet link)
- Test: `portfolio/public/games/pwa.test.mjs` (append one test)

**Interfaces:**
- Consumes: nothing from Task 1 except the test file's `read`/`GAMES_DIR` helpers.
- Produces: `fonts/fonts.css` + woff2 files whose names Task 3 lists in `ASSETS` (Task 3 reads the actual generated names from `fonts.css`).

- [ ] **Step 1: Append the failing fonts test**

Add at the bottom of `portfolio/public/games/pwa.test.mjs`:

```js
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
```

- [ ] **Step 2: Run it — must fail** (`fonts.googleapis.com` still present)

```bash
node --test "portfolio/public/games/pwa.test.mjs"
```

- [ ] **Step 3: Write the fetch script**

Create `portfolio/scripts/fetch-connect4-fonts.mjs`:

```js
/* One-shot: download the exact Google Fonts CSS connect4 uses (latin subsets
   only), store woff2 files locally, emit fonts/fonts.css with local URLs.
   Re-run only if the font families in connect4/index.html ever change. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CSS_URL = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=JetBrains+Mono:wght@400;600&display=swap';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'games', 'connect4', 'fonts');

const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text();
const parts = css.split(/\/\* ([a-z-]+) \*\//).slice(1); // [subset, block, subset, block, ...]
let out = '';
const files = new Map(); // remote url -> local name
for (let i = 0; i < parts.length; i += 2) {
  if (parts[i] !== 'latin') continue;
  let block = parts[i + 1];
  for (const url of block.match(/https:\/\/[^)]+\.woff2/g) ?? []) {
    if (!files.has(url)) files.set(url, `f${files.size}.woff2`);
    block = block.split(url).join(files.get(url));
  }
  out += `/* latin */${block}`;
}
if (files.size === 0) throw new Error('no latin woff2 URLs found — Google CSS format changed?');
mkdirSync(OUT, { recursive: true });
for (const [url, name] of files) {
  writeFileSync(join(OUT, name), Buffer.from(await (await fetch(url)).arrayBuffer()));
}
writeFileSync(join(OUT, 'fonts.css'), out);
console.log(`wrote ${files.size} woff2 files + fonts.css to ${OUT}`);
```

- [ ] **Step 4: Run it and sanity-check output**

```bash
node portfolio/scripts/fetch-connect4-fonts.mjs
ls -la portfolio/public/games/connect4/fonts/
head -20 portfolio/public/games/connect4/fonts/fonts.css
```
Expected: `fonts.css` + N woff2 files (typically 5: 3 Fraunces weights + 2 JetBrains Mono); each woff2 20–80KB; fonts.css has `@font-face` blocks with local `url(fN.woff2)` and both family names.

- [ ] **Step 5: Swap the links in connect4/index.html**

Replace these three lines (7–9):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
```

with:

```html
<link href="fonts/fonts.css" rel="stylesheet">
```

- [ ] **Step 6: Run tests — pass**

```bash
node --test "portfolio/public/games/pwa.test.mjs"
```

- [ ] **Step 7: Visual font check**

```bash
cd portfolio/public && python3 -m http.server 8901 &
sleep 1
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --user-data-dir=/tmp/chrome-profile-fontchk \
  --window-size=900,700 --virtual-time-budget=6000 \
  --screenshot=/private/tmp/claude-501/-Users-hillmanchan-Desktop-HillmanChan-portfolio/9a9441af-6154-430d-b8b2-7218d3b2ac83/scratchpad/c4-fonts.png \
  http://localhost:8901/games/connect4/index.html &
sleep 8; pkill -f chrome-profile-fontchk; kill %1
```
Read the screenshot: the serif display font (Fraunces) must render in the title — if headings show a generic sans fallback, the @font-face blocks are wrong; stop and fix before committing.

- [ ] **Step 8: Commit**

```bash
git add portfolio/scripts/fetch-connect4-fonts.mjs portfolio/public/games/connect4 portfolio/public/games/pwa.test.mjs
git commit -m "feat(connect4): self-host Fraunces + JetBrains Mono (offline typography)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Connect 4 PWA

**Files:**
- Create: `portfolio/public/games/connect4/sw.js`, `manifest.webmanifest`, `icon.svg`, `icon-512.png`, `icon-192.png`
- Modify: `portfolio/public/games/connect4/index.html`
- Test: `portfolio/public/games/pwa.test.mjs` (GAMES entry + one cross-check test)

**Interfaces:**
- Consumes: Task 1's sw.js pattern and test helpers; Task 2's `fonts/` output (list actual woff2 names via `ls portfolio/public/games/connect4/fonts/`).
- Produces: nothing downstream.

- [ ] **Step 1: Register connect4 in the test + add fonts-precached cross-check (failing)**

In `pwa.test.mjs` change `GAMES` to:

```js
const GAMES = [
  { dir: 'card-drawer', manifest: 'manifest.webmanifest' },
  { dir: 'connect4', manifest: 'manifest.webmanifest' },
];
```

Append:

```js
test('connect4: every self-hosted font file is precached', () => {
  const assets = extractJsonConst(read(GAMES_DIR, 'connect4', 'sw.js'), 'ASSETS');
  assert.ok(assets.includes('./fonts/fonts.css'));
  const css = read(GAMES_DIR, 'connect4', 'fonts', 'fonts.css');
  for (const [, f] of css.matchAll(/url\(([^)]+\.woff2)\)/g)) {
    assert.ok(assets.includes(`./fonts/${f}`), `font ${f} missing from ASSETS`);
  }
});
```

Run `node --test "portfolio/public/games/pwa.test.mjs"` — connect4 tests FAIL (no sw.js).

- [ ] **Step 2: Icon**

Create `portfolio/public/games/connect4/icon.svg` (board grid + discs in the game's palette `#0a0e1a`/`#1e2742`/`#e63946`/`#f4c542`):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0a0e1a"/>
  <rect x="72" y="72" width="368" height="368" rx="40" fill="#1e2742"/>
  <circle cx="148" cy="148" r="44" fill="#0a0e1a"/>
  <circle cx="256" cy="148" r="44" fill="#0a0e1a"/>
  <circle cx="364" cy="148" r="44" fill="#f4c542"/>
  <circle cx="148" cy="256" r="44" fill="#f4c542"/>
  <circle cx="256" cy="256" r="44" fill="#e63946"/>
  <circle cx="364" cy="256" r="44" fill="#0a0e1a"/>
  <circle cx="148" cy="364" r="44" fill="#e63946"/>
  <circle cx="256" cy="364" r="44" fill="#f4c542"/>
  <circle cx="364" cy="364" r="44" fill="#e63946"/>
</svg>
```

Rasterize + downsize exactly as Task 1 Step 3 (same commands, run from `portfolio/public/games/connect4`). Read the 512 PNG to confirm.

- [ ] **Step 3: Manifest**

`portfolio/public/games/connect4/manifest.webmanifest`:

```json
{
  "name": "Connect IV — human vs machine",
  "short_name": "Connect IV",
  "description": "Connect Four against a WASM perfect-play solver.",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0a0e1a",
  "theme_color": "#0a0e1a",
  "icons": [
    { "src": "./icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "./icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 4: Service worker**

Create `portfolio/public/games/connect4/sw.js`: copy Task 1 Step 5's file verbatim, then change ONLY the two consts (replace `fN.woff2` entries with the ACTUAL files from `ls portfolio/public/games/connect4/fonts/`):

```js
const CACHE = "connect4-v1";
const ASSETS = [
  "./index.html",
  "./connect4-solver.wasm",
  "./fonts/fonts.css",
  "./fonts/f0.woff2",
  "./fonts/f1.woff2",
  "./fonts/f2.woff2",
  "./fonts/f3.woff2",
  "./fonts/f4.woff2",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];
```

Also update the header comment's game name to "Connect 4". (The `fetch` handler's cross-origin bypass is what keeps the gstatic Firebase SDK + Firestore leaderboard untouched online, and lets them fail into the existing `index.html:360` graceful path offline.)

- [ ] **Step 5: Wire up index.html**

After the `<link href="fonts/fonts.css" rel="stylesheet">` line from Task 2 add:

```html
<link rel="manifest" href="manifest.webmanifest" />
<meta name="theme-color" content="#0a0e1a" />
<link rel="apple-touch-icon" href="icon-192.png" />
```

Before `</body>` add the identical registration `<script>` block from Task 1 Step 6.

- [ ] **Step 6: Run tests — pass**

```bash
node --test "portfolio/public/games/pwa.test.mjs"
```
Expected: PASS (card-drawer 4 + connect4 4 + 2 font tests).

- [ ] **Step 7: Commit**

```bash
git add portfolio/public/games/connect4 portfolio/public/games/pwa.test.mjs
git commit -m "feat(connect4): offline PWA — service worker, manifest, icons

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Card-game (Never Have I Ever) PWA + stale-asset cleanup

**Files:**
- Create: `portfolio/public/games/card-game/sw.js`, `icon.svg`, `icon-192.png`, `icon-512.png`
- Modify: `portfolio/public/games/card-game/manifest.json` (full rewrite — currently CRA boilerplate)
- Modify: `portfolio/public/games/card-game/index.html` (built Vite artifact — this IS the served file; its source app is not in this repo)
- Delete: `portfolio/public/games/card-game/assets/` (stale, unreferenced copy — live chunks are in root `public/assets/`), `logo192.png`, `logo512.png`, `favicon.ico` (unlinked CRA React-logo boilerplate)
- Test: `portfolio/public/games/pwa.test.mjs` (GAMES entry + drift-guard test)

**Interfaces:**
- Consumes: Task 1's sw.js pattern and test helpers.
- Key fact: card-game loads root-absolute `/assets/index-DNDvMiOj.js` + `/assets/index-_EUB7mlz.css`; the entry JS lazily `import()`s exactly `./FirebaseSyncManager-Bkfq24lo.js` and `./TempSyncManager-B5kJ8VAi.js`. A SW scoped to `/games/card-game/` still intercepts these (scope limits which PAGES it controls, not which same-origin URLs those pages fetch).

- [ ] **Step 1: Register card-game in the test + add drift guard (failing)**

`GAMES` becomes:

```js
const GAMES = [
  { dir: 'card-drawer', manifest: 'manifest.webmanifest' },
  { dir: 'connect4', manifest: 'manifest.webmanifest' },
  { dir: 'card-game', manifest: 'manifest.json' },
];
```

Append:

```js
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
```

Run — card-game tests FAIL.

- [ ] **Step 2: Icon**

Create `portfolio/public/games/card-game/icon.svg` (light-blue palette from the app's CSS `#f0f8ff`/`#78c8ff`/`#0b2c4a`; fanned cards + question-mark badge — the mark is drawn with `<text>` using Georgia, rasterized once on this Mac so device font variance doesn't matter):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#f0f8ff"/>
  <g transform="rotate(-10 236 276)">
    <rect x="146" y="146" width="180" height="260" rx="20" fill="#ffffff" stroke="#0b2c4a" stroke-width="8" opacity="0.6"/>
  </g>
  <g transform="rotate(6 256 276)">
    <rect x="170" y="130" width="180" height="260" rx="20" fill="#ffffff" stroke="#0b2c4a" stroke-width="8"/>
  </g>
  <circle cx="352" cy="352" r="86" fill="#78c8ff"/>
  <text x="352" y="392" font-family="Georgia, serif" font-size="120" font-weight="bold" fill="#0b2c4a" text-anchor="middle">?</text>
</svg>
```

Rasterize + downsize exactly as Task 1 Step 3 (run from `portfolio/public/games/card-game`). Read the 512 PNG.

- [ ] **Step 3: Rewrite manifest.json**

Replace the whole file `portfolio/public/games/card-game/manifest.json` with:

```json
{
  "name": "Never Have I Ever",
  "short_name": "NHIE Cards",
  "description": "Never Have I Ever party card game — local pass-and-play or synced rooms.",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#f0f8ff",
  "theme_color": "#0b2c4a",
  "icons": [
    { "src": "./icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "./icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 4: Service worker**

Create `portfolio/public/games/card-game/sw.js`: copy Task 1 Step 5 verbatim, header comment "Never Have I Ever service worker", plus this extra warning line in the comment: `If the built app is ever re-synced here, the /assets hashes change — update ASSETS and bump CACHE (pwa.test.mjs will fail until you do).` Consts:

```js
const CACHE = "card-game-v1";
const ASSETS = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "/assets/index-DNDvMiOj.js",
  "/assets/index-_EUB7mlz.css",
  "/assets/FirebaseSyncManager-Bkfq24lo.js",
  "/assets/TempSyncManager-B5kJ8VAi.js"
];
```

- [ ] **Step 5: Wire up the built index.html**

In `portfolio/public/games/card-game/index.html`, after the `<link rel="stylesheet" crossorigin href="/assets/index-_EUB7mlz.css">` line add:

```html
    <link rel="manifest" href="manifest.json" />
    <meta name="theme-color" content="#0b2c4a" />
    <link rel="apple-touch-icon" href="icon-192.png" />
```

Before `</body>` add the identical registration `<script>` block from Task 1 Step 6.

- [ ] **Step 6: Delete stale files**

```bash
git rm -r portfolio/public/games/card-game/assets
git rm portfolio/public/games/card-game/logo192.png portfolio/public/games/card-game/logo512.png portfolio/public/games/card-game/favicon.ico
```
(Verified unreferenced: no file in the repo mentions `index-Bb2xmmzs`/`index-DQDnql7j`, and the built index.html links neither the logos nor favicon. `upload:root:other` uses `aws s3 sync --delete`, so the removal propagates to S3 on next deploy.)

- [ ] **Step 7: Run tests — pass**

```bash
node --test "portfolio/public/games/pwa.test.mjs"
```
Expected: PASS — 3 games × 4 generic tests + 2 connect4 font tests + 1 card-game drift guard = 15.

- [ ] **Step 8: Commit**

```bash
git add portfolio/public/games/card-game portfolio/public/games/pwa.test.mjs
git commit -m "feat(card-game): offline PWA — service worker, manifest, icons; drop stale asset copy

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Deployment upload scripts for sw.js + manifests

**Files:**
- Modify: `portfolio/package.json` (scripts block)

**Interfaces:** none downstream; consumed by the human deploy flow (`npm run deploy`).

- [ ] **Step 1: Add scripts**

In `portfolio/package.json`, after the `"upload:index"` line add:

```json
    "upload:sw": "aws s3 cp build/games/ s3://$S3_BUCKET/games/ --recursive --exclude \"*\" --include \"*/sw.js\" --content-type \"application/javascript\" --cache-control \"no-cache, no-store, must-revalidate\" --metadata-directive REPLACE",
    "mime:webmanifest": "aws s3 cp build/ s3://$S3_BUCKET/ --recursive --exclude \"*\" --include \"*.webmanifest\" --content-type \"application/manifest+json\" --metadata-directive REPLACE",
```

And in the `"deploy"` script, insert `npm run upload:sw && ` immediately before `npm run invalidate` so it reads:

```
... && npm run upload:index && npm run upload:sw && npm run invalidate
```

Rationale (put in the commit body): browsers re-check `sw.js` on every load; if S3/CloudFront served it with a long default TTL, players could be pinned to an old precache list. `no-cache` on `sw.js` + bumping `CACHE` per change is the update path.

- [ ] **Step 2: Validate JSON + commit**

```bash
node -e "JSON.parse(require('node:fs').readFileSync('portfolio/package.json','utf8')); console.log('package.json OK')"
git add portfolio/package.json
git commit -m "chore(deploy): upload sw.js with no-cache + webmanifest MIME script

Browsers re-check sw.js each load; a long CDN TTL would pin players to an
old precache list. no-cache on sw.js + CACHE version bumps is the update path.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: End-to-end offline verification (browser)

**Files:** none (verification only). Uses the scratchpad dir for screenshots.

The real test: install the SW online, kill the server, reload — the game must still render from cache. Headless Chrome with a persistent profile keeps SW registrations + Cache Storage between launches; `http://localhost` is a secure context.

- [ ] **Step 1: Serve the public folder** (PID file, not `%1` — each Bash call is a fresh shell, job IDs don't carry over)

```bash
SCRATCH=/private/tmp/claude-501/-Users-hillmanchan-Desktop-HillmanChan-portfolio/9a9441af-6154-430d-b8b2-7218d3b2ac83/scratchpad
nohup python3 -m http.server 8901 --directory portfolio/public > /dev/null 2>&1 &
echo $! > $SCRATCH/server.pid
sleep 1
curl -sf http://localhost:8901/games/card-drawer/index.html > /dev/null && echo "server up"
```

- [ ] **Step 2: Online pass per game (installs the SW)**

```bash
SCRATCH=/private/tmp/claude-501/-Users-hillmanchan-Desktop-HillmanChan-portfolio/9a9441af-6154-430d-b8b2-7218d3b2ac83/scratchpad
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for g in card-drawer connect4 card-game; do
  # (CHROME must be re-defined in the same shell as this loop if steps run separately)
  "$CHROME" --headless=new --disable-gpu --user-data-dir=/tmp/chrome-profile-pwa-$g \
    --window-size=420,760 --virtual-time-budget=8000 \
    --screenshot=$SCRATCH/$g-online.png \
    http://localhost:8901/games/$g/index.html &
  sleep 9; pkill -f chrome-profile-pwa-$g
done
```

Read all three `-online.png` screenshots — each must show the game's real UI (card-drawer setup screen; connect4 board with Fraunces headings; card-game menu).

- [ ] **Step 3: Kill the server, offline pass**

```bash
SCRATCH=/private/tmp/claude-501/-Users-hillmanchan-Desktop-HillmanChan-portfolio/9a9441af-6154-430d-b8b2-7218d3b2ac83/scratchpad
kill $(cat $SCRATCH/server.pid) && rm $SCRATCH/server.pid
curl -sf --max-time 2 http://localhost:8901/ > /dev/null && echo "SERVER STILL UP — abort" || echo "server down, proceeding"
for g in card-drawer connect4 card-game; do
  "$CHROME" --headless=new --disable-gpu --user-data-dir=/tmp/chrome-profile-pwa-$g \
    --window-size=420,760 --virtual-time-budget=8000 \
    --screenshot=$SCRATCH/$g-offline.png \
    http://localhost:8901/games/$g/index.html &
  sleep 9; pkill -f chrome-profile-pwa-$g
done
```

Read all three `-offline.png` screenshots. PASS = identical game UI to the online pass (connect4 may legitimately show its leaderboard-unavailable state). FAIL = Chrome's "site can't be reached" page → the SW didn't install or the precache list is wrong; debug with the systematic-debugging skill before proceeding. Note: if a screenshot shows a blank/partial page in BOTH passes, that's a headless-timing artifact, not an offline failure — re-run with a larger `--virtual-time-budget`.

- [ ] **Step 4: Clean up profiles + re-run the full unit suite**

```bash
rm -rf /tmp/chrome-profile-pwa-* /tmp/chrome-profile-icons /tmp/chrome-profile-fontchk
node --test "portfolio/public/games/pwa.test.mjs"
cd portfolio/public/games/card-drawer && node --test "*.test.js" && cd ../../../..
```
Expected: all PASS. Nothing to commit (verification-only task) — if fixes were needed, commit them with a descriptive message.

---

### Task 7: Branch rename, push, PR

- [ ] **Step 1: Rename to repo convention and push**

```bash
git branch -m worktree-games-offline-pwa feat/games-offline-pwa
git push -u origin feat/games-offline-pwa
```

- [ ] **Step 2: Open the PR (do NOT merge — user merges on their own instruction)**

```bash
gh pr create --title "feat(games): offline PWA — card-drawer, connect4, never-have-i-ever" --body "$(cat <<'EOF'
## What

Per-game service worker + web app manifest + designed icons for the three static mini games. After one online visit, each game is fully playable with no network and installable via Add to Home Screen.

- **card-drawer** — precaches its 6 files; zero external deps.
- **connect4** — Fraunces + JetBrains Mono now self-hosted (`fonts/`, latin subsets); WASM solver precached; gstatic Firebase leaderboard stays network-only with its existing graceful offline fallback.
- **card-game (NHIE)** — precaches the root `/assets/` Vite chunks incl. both lazy sync managers; local play works offline, room sync correctly needs network. Rewrote CRA-boilerplate manifest, replaced React-logo icons, deleted the stale unreferenced `games/card-game/assets/` copy.
- `pwa.test.mjs` guards precache/manifest/registration integrity (15 tests) — including a drift guard that fails if card-game's built hashes ever change without a `sw.js` update.
- `npm run deploy` now uploads `sw.js` files with `no-cache` (browsers re-check sw.js each load; a long TTL would pin players to stale precache lists).

## Update path

Change a game's files → bump `CACHE` version in that game's `sw.js` → deploy.

## Verification

- `node --test portfolio/public/games/pwa.test.mjs` — 15 pass; card-drawer suite still green.
- Headless-Chrome e2e: loaded each game with a local server, killed the server, reloaded — all three render + play from SW cache (screenshots in session).

Spec: `docs/superpowers/specs/2026-07-17-games-offline-pwa-design.md`
Plan: `docs/superpowers/plans/2026-07-17-games-offline-pwa.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

### Task 8: AWS billing alert (out-of-band — NOT part of the PR)

Account-level, idempotent-ish (fails harmlessly with `DuplicateRecordException` if re-run). Run from anywhere with AWS credentials:

- [ ] **Step 1: Create the US$5 monthly cost budget with 80% + 100% email alerts**

```bash
aws budgets create-budget --account-id 575108933055 \
  --budget '{"BudgetName":"monthly-usd5-alert","BudgetLimit":{"Amount":"5","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}' \
  --notifications-with-subscribers '[
    {"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80,"ThresholdType":"PERCENTAGE"},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"hillmanchan709@gmail.com"}]},
    {"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":100,"ThresholdType":"PERCENTAGE"},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"hillmanchan709@gmail.com"}]}
  ]'
```

- [ ] **Step 2: Verify**

```bash
aws budgets describe-budgets --account-id 575108933055 --query 'Budgets[].{Name:BudgetName,Limit:BudgetLimit.Amount,Unit:TimeUnit}'
```
Expected: `monthly-usd5-alert`, `5`, `MONTHLY`. AWS sends a confirmation email to hillmanchan709@gmail.com.
