# Offline PWA Round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Math Memory becomes an offline installable PWA, and a root service worker makes the portfolio SPA shell (and thus the game subdomains) load offline with install-from-subdomain support.

**Architecture:** Part A reuses the merged round-1 pattern verbatim (canonical `sw.js` at `portfolio/public/games/card-drawer/sw.js`, shared harness `portfolio/public/games/pwa.test.mjs`). Part B adds `portfolio/public/sw.js` (scope `/`, network-first navigations + cache-first `/static/`, `/games/` untouched) plus `/pwa/<game>.webmanifest` top-level manifests swapped in by hostname. Spec: `docs/superpowers/specs/2026-07-17-offline-pwa-round2-design.md`.

**Tech Stack:** Vanilla SW API, web app manifest, `node --test`, headless Chrome + `sips` for icons.

## Global Constraints

- Branch `worktree-offline-pwa-2` in worktree `.claude/worktrees/offline-pwa-2`; run ALL commands from the worktree root. Base: `76ccbde`.
- **No emoji anywhere** — SVG geometry only.
- Every SW's `CACHE`/`ASSETS`/`PRECACHE` consts: **strict JSON** (double quotes, no trailing commas), declaration ends `;` + newline — `pwa.test.mjs` JSON.parses them.
- Game SW registration string exactly `navigator.serviceWorker.register('./sw.js')`; shell uses `navigator.serviceWorker.register('/sw.js')`.
- Keep the three existing game `sw.js` files byte-identical to math-memory's except header comment + the two consts (round-1 invariant, now across four games).
- `node --test "portfolio/public/games/pwa.test.mjs"` (glob/path form; Node 22.22).
- Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Headless Chrome: `--headless=new --disable-gpu --hide-scrollbars`, launch with trailing `&` (never exits), sleep, `pkill -f <profile-dir-name>`; the screenshot IS written. Each Bash call is a fresh shell — redefine vars per call; servers use PID files.
- Scratch dir: `/private/tmp/claude-501/-Users-hillmanchan-Desktop-HillmanChan-portfolio/9a9441af-6154-430d-b8b2-7218d3b2ac83/scratchpad`
- Push + PR at the end; **NO merge without explicit user instruction.** PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

### Task 1: Generalize the font-fetch script + self-host Math Memory fonts

**Files:**
- Create: `portfolio/scripts/fetch-game-fonts.mjs`
- Delete: `portfolio/scripts/fetch-connect4-fonts.mjs` (git rm — superseded)
- Create (generated): `portfolio/public/games/math-memory/fonts/fonts.css` + `f*.woff2`
- Modify: `portfolio/public/games/math-memory/index.html` (lines 12–14: two preconnects + Google Fonts link)
- Test: `portfolio/public/games/pwa.test.mjs` (append one test)

**Interfaces:**
- Produces: `fonts/` whose actual woff2 names Task 2 lists in ASSETS (read from disk). Script contract: `node portfolio/scripts/fetch-game-fonts.mjs <connect4|math-memory>`; connect4's existing `fonts/` output is NOT regenerated this round.

- [ ] **Step 1: Append the failing fonts test** (bottom of `pwa.test.mjs`; helpers `read`, `GAMES_DIR`, `existsSync`, `join`, `test`, `assert` already exist — no new imports):

```js
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
```

- [ ] **Step 2: Run — must FAIL** (`fonts.googleapis.com` still present): `node --test "portfolio/public/games/pwa.test.mjs"`

- [ ] **Step 3: Create `portfolio/scripts/fetch-game-fonts.mjs`:**

```js
/* Downloads a game's Google Fonts CSS (latin subsets only), stores the woff2
   files locally, emits fonts/fonts.css with local URLs.
   Usage: node portfolio/scripts/fetch-game-fonts.mjs <game>
   Re-run only if that game's font families change. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CSS_URLS = {
  'connect4': 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=JetBrains+Mono:wght@400;600&display=swap',
  'math-memory': 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=Spline+Sans+Mono:wght@400;500;600&display=swap',
};

const game = process.argv[2];
if (!CSS_URLS[game]) throw new Error(`usage: fetch-game-fonts.mjs <${Object.keys(CSS_URLS).join('|')}>`);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'games', game, 'fonts');

const css = await (await fetch(CSS_URLS[game], { headers: { 'User-Agent': UA } })).text();
const parts = css.split(/\/\* ([a-z-]+) \*\//).slice(1);
let out = '';
const files = new Map();
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

Then: `git rm portfolio/scripts/fetch-connect4-fonts.mjs`

- [ ] **Step 4: Run it + sanity-check:** `node portfolio/scripts/fetch-game-fonts.mjs math-memory` then `ls -la portfolio/public/games/math-memory/fonts/` — expect fonts.css + ~2 woff2 (variable fonts dedupe to one file per family; 20–80KB each), no `https://` left in fonts.css.

- [ ] **Step 5: Swap the links in math-memory/index.html.** Replace exactly these three lines (12–14):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=Spline+Sans+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

with:

```html
<link href="fonts/fonts.css" rel="stylesheet">
```

- [ ] **Step 6: Run tests — pass.** Also visual check (same as round 1): serve `portfolio/public` on 8901 (PID file), screenshot `http://localhost:8901/games/math-memory/index.html`, Read it — the display serif (Fraunces) must render in headings; kill server after.

- [ ] **Step 7: Commit:**

```bash
git add portfolio/scripts/fetch-game-fonts.mjs portfolio/public/games/math-memory portfolio/public/games/pwa.test.mjs
git commit -m "feat(math-memory): self-host Fraunces + Spline Sans Mono; generalize font-fetch script

Replaces fetch-connect4-fonts.mjs with a per-game-config fetch-game-fonts.mjs.
connect4's existing fonts/ output is untouched.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
(the git rm is already staged)

---

### Task 2: Math Memory PWA

**Files:**
- Create: `portfolio/public/games/math-memory/sw.js`, `manifest.webmanifest`, `icon.svg`, `icon-512.png`, `icon-192.png`
- Modify: `portfolio/public/games/math-memory/index.html`
- Test: `portfolio/public/games/pwa.test.mjs` (GAMES entry + reverse drift guard)

**Interfaces:**
- Consumes: canonical sw.js from `portfolio/public/games/card-drawer/sw.js` (copy; change ONLY header comment + `CACHE`/`ASSETS`); registration script block copied verbatim from card-drawer/index.html; Task 1's `fonts/` actual file names (from `ls`).

- [ ] **Step 1: Register math-memory in GAMES + append the reverse guard (failing).** In `pwa.test.mjs`, GAMES gains `{ dir: 'math-memory', manifest: 'manifest.webmanifest' }`. Append:

```js
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
```

Run — math-memory tests FAIL (no sw.js).

- [ ] **Step 2: Icon.** Create `portfolio/public/games/math-memory/icon.svg` (2×2 memory tiles, "7 + 2 ?" in mono type, palette from the game; the "?" tile uses the accent so it pops):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0e1014"/>
  <g font-family="Courier New, monospace" font-weight="bold" font-size="110" text-anchor="middle">
    <rect x="76" y="76" width="170" height="170" rx="28" fill="#1f2530"/>
    <text x="161" y="199" fill="#e8ecf7">7</text>
    <rect x="266" y="76" width="170" height="170" rx="28" fill="#1f2530"/>
    <text x="351" y="199" fill="#e8ecf7">+</text>
    <rect x="76" y="266" width="170" height="170" rx="28" fill="#1f2530"/>
    <text x="161" y="389" fill="#e8ecf7">2</text>
    <rect x="266" y="266" width="170" height="170" rx="28" fill="#7fd8a4"/>
    <text x="351" y="389" fill="#0e1014">?</text>
  </g>
</svg>
```

Rasterize from `portfolio/public/games/math-memory` (Chrome 512 screenshot → `sips -z 192 192`), Read the 512 PNG to verify (dark tile, 4 rounded squares, glyphs crisp, green "?" tile).

- [ ] **Step 3: Manifest.** `portfolio/public/games/math-memory/manifest.webmanifest`:

```json
{
  "name": "Maths Memory",
  "short_name": "Maths Memory",
  "description": "Memorise five ahead, answer five behind — a timed working-memory drill.",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0e1014",
  "theme_color": "#0e1014",
  "icons": [
    { "src": "./icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "./icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 4: Service worker.** Copy `card-drawer/sw.js` verbatim; header comment → "Maths Memory service worker — offline cache." (keep the bump-version + strict-JSON warning lines); consts (fix woff2 names to actual `ls` output):

```js
const CACHE = "math-memory-v1";
const ASSETS = [
  "./index.html",
  "./fonts/fonts.css",
  "./fonts/f0.woff2",
  "./fonts/f1.woff2",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];
```

- [ ] **Step 5: Wire index.html.** After the `<link href="fonts/fonts.css" rel="stylesheet">` line add:

```html
<link rel="manifest" href="manifest.webmanifest" />
<link rel="apple-touch-icon" href="icon-192.png" />
```

(`theme-color` already exists at line 6 — do not duplicate it.) Before `</body>` add the registration `<script>` block copied verbatim from `card-drawer/index.html` (the one with `navigator.serviceWorker.register('./sw.js')` and the `.catch` warn).

- [ ] **Step 6: Run tests — all pass** (round-1 17 + fonts test + 4 generic math-memory + reverse guard = 23): `node --test "portfolio/public/games/pwa.test.mjs"`. Verify sw.js parity: `diff portfolio/public/games/card-drawer/sw.js portfolio/public/games/math-memory/sw.js` → only header + consts differ.

- [ ] **Step 7: Commit:**

```bash
git add portfolio/public/games/math-memory portfolio/public/games/pwa.test.mjs
git commit -m "feat(math-memory): offline PWA — service worker, manifest, icons

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Portfolio shell service worker + subdomain install manifests

**Files:**
- Create: `portfolio/public/sw.js`
- Create: `portfolio/public/pwa/card-drawer.webmanifest`, `connect4.webmanifest`, `card-game.webmanifest`, `math-memory.webmanifest`
- Modify: `portfolio/public/index.html` (one inline script after the manifest `<link>`)
- Test: `portfolio/public/games/pwa.test.mjs` (extend fs import with `readdirSync`; append three shell tests)

**Interfaces:**
- Consumes: game icons at `/games/<game>/icon-{192,512}.png` (exist from round 1 + Task 2).
- Produces: shell SW consts `CACHE` (`^portfolio-shell-v\d+$`) + `PRECACHE` (strict JSON) that the tests parse.

- [ ] **Step 1: Append the failing shell tests.** In `pwa.test.mjs`: change the fs import line to `import { readFileSync, existsSync, readdirSync } from 'node:fs';` and append:

```js
test('shell: root service worker precaches the app shell', () => {
  const sw = read(PUBLIC_DIR, 'sw.js');
  const cacheName = extractJsonConst(sw, 'CACHE');
  assert.match(cacheName, /^portfolio-shell-v\d+$/);
  const precache = extractJsonConst(sw, 'PRECACHE');
  assert.ok(precache.includes('/index.html'), 'PRECACHE must include /index.html');
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
```

Run — shell tests FAIL.

- [ ] **Step 2: Create `portfolio/public/sw.js`:**

```js
/* Portfolio shell service worker — keeps the SPA shell (and therefore the
   game-subdomain entry pages) loadable offline. Game folders under /games/
   run their own service workers; this one never touches their requests.
   Navigations are network-first (shell HTML never goes stale online);
   /static/ hashed CRA bundles are cache-first (immutable names). Bump the
   version in CACHE to force a clean shell cache. CACHE and PRECACHE must
   stay strict JSON (double quotes) — pwa.test.mjs parses them. */
const CACHE = "portfolio-shell-v1";
const PRECACHE = [
  "/index.html"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("portfolio-shell-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/games/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((resp) => {
        if (resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
        }
        return resp;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (url.pathname.startsWith('/static/')) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return resp;
        });
      })
    );
  }
});
```

- [ ] **Step 3: The four `/pwa` manifests.** Create `portfolio/public/pwa/<name>.webmanifest`, identical shape, per-game values:

| file | name | short_name | background_color | theme_color |
|------|------|------------|------------------|-------------|
| card-drawer.webmanifest | Card Drawer | Card Drawer | #111830 | #111830 |
| connect4.webmanifest | Connect IV — human vs machine | Connect IV | #0a0e1a | #0a0e1a |
| card-game.webmanifest | Never Have I Ever | NHIE Cards | #f0f8ff | #0b2c4a |
| math-memory.webmanifest | Maths Memory | Maths Memory | #0e1014 | #0e1014 |

Template (substitute name/short_name/colors/`<game>`):

```json
{
  "name": "Card Drawer",
  "short_name": "Card Drawer",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#111830",
  "theme_color": "#111830",
  "icons": [
    { "src": "/games/card-drawer/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/games/card-drawer/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 4: Shell index.html wiring.** In `portfolio/public/index.html`, immediately AFTER the `<link rel="manifest" href="%PUBLIC_URL%/manifest.json" />` line, insert:

```html
    <script>
      (function () {
        var gameSubdomains = { 'card-drawer': 1, 'connect4': 1, 'card-game': 1, 'math-memory': 1 };
        var sub = window.location.hostname.split('.')[0];
        if (gameSubdomains[sub]) {
          var link = document.querySelector('link[rel="manifest"]');
          if (link) link.setAttribute('href', '/pwa/' + sub + '.webmanifest');
        }
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js').catch(function (err) {
              console.warn('[pwa] shell service worker registration failed:', err);
            });
          });
        }
      })();
    </script>
```

(Must be after the link so `querySelector` finds it; CSP already allows inline scripts + `worker-src 'self'`.)

- [ ] **Step 5: Run tests — all pass** (23 + 3 = 26).

- [ ] **Step 6: Commit:**

```bash
git add portfolio/public/sw.js portfolio/public/pwa portfolio/public/index.html portfolio/public/games/pwa.test.mjs
git commit -m "feat(portfolio): shell service worker + subdomain install manifests

Root SW: network-first navigations with cached-shell fallback, cache-first
/static/ (immutable hashes), /games/ untouched (game SWs own those pages).
/pwa/<game>.webmanifest + hostname map make Add-to-Home-Screen work from the
game subdomains themselves.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Deploy script for the root sw.js

**Files:**
- Modify: `portfolio/package.json`

- [ ] **Step 1:** After the `"upload:sw"` line add:

```json
    "upload:sw:root": "aws s3 cp build/sw.js s3://$S3_BUCKET/sw.js --content-type \"application/javascript\" --cache-control \"no-cache, no-store, must-revalidate\" --metadata-directive REPLACE",
```

In `"deploy"`, insert `npm run upload:sw:root && ` immediately after `npm run upload:sw && ` (so: `... upload:sw && npm run upload:sw:root && npm run mime:webmanifest && npm run invalidate`).

- [ ] **Step 2: Validate + commit:**

```bash
node -e "JSON.parse(require('node:fs').readFileSync('portfolio/package.json','utf8')); console.log('OK')"
node --test "portfolio/public/games/pwa.test.mjs"
git add portfolio/package.json
git commit -m "chore(deploy): upload root shell sw.js with no-cache

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: End-to-end offline verification

**Files:** none (verification-only; fixes committed if needed). All screenshots to the scratch dir.

- [ ] **Step 1: Math-memory game e2e** (round-1 procedure, serve `portfolio/public` on 8901 with a PID file): online load `http://localhost:8901/games/math-memory/index.html` in profile `/tmp/chrome-profile-pwa-mm` (screenshot), kill server, reload offline (screenshot). Offline shot must show the game UI with Fraunces headings.

- [ ] **Step 2: Build the shell:** `cd portfolio && npm run build` (build/ output; takes minutes; warnings tolerated, errors are BLOCKED). Then `cd ..`.

- [ ] **Step 3: Shell + coexistence e2e** — serve the BUILD: `nohup python3 -m http.server 8902 --directory portfolio/build > /dev/null 2>&1 & echo $! > <SCRATCH>/server2.pid`. One profile `/tmp/chrome-profile-pwa-shell`:
  1. Online: load `http://localhost:8902/index.html` (shell SW installs; screenshot — real portfolio UI).
  2. Online: load `http://localhost:8902/games/math-memory/index.html` (game SW registers too; screenshot).
  3. Kill server; confirm down with curl.
  4. Offline: reload `http://localhost:8902/index.html` → portfolio shell renders (screenshot).
  5. Offline: load `http://localhost:8902/card-drawer` → must ALSO render the shell (SPA navigate fallback to cached /index.html; python has no SPA rewrite so this only works offline via the SW — that's the point of the check).
  6. Offline: reload `http://localhost:8902/games/math-memory/index.html` → game renders (coexistence: shell SW didn't interfere).
  Read every screenshot; any Chrome error page = diagnose (which URL missed cache), fix, re-run. Clean up profiles, PID files, stray servers.

- [ ] **Step 4: Full unit suite:** `node --test "portfolio/public/games/pwa.test.mjs"` (26) and `cd portfolio/public/games/card-drawer && node --test "*.test.js"`.

---

### Task 6: Push + PR

- [ ] **Step 1:** `git branch -m worktree-offline-pwa-2 feat/offline-pwa-2 && git push -u origin feat/offline-pwa-2`

- [ ] **Step 2:** `gh pr create` — title `feat(pwa): math-memory offline + portfolio shell service worker`; body covers: Math Memory PWA (recipe reuse, fonts self-hosted, 4th game in harness), shell SW semantics (network-first nav / cache-first static / games untouched), install-from-subdomain manifests, deploy addition, verification summary (26 tests + build-served offline e2e incl. SPA-fallback and coexistence checks), update-path note (shell HTML auto-fresh; bump `portfolio-shell-vN` for a clean sweep), reminder that `npm run deploy` is needed post-merge. Footer: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. **Do NOT merge.**
