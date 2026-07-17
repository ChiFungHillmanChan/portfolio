# Offline (PWA) Support for Card Drawer, Connect 4, and Never Have I Ever

**Date:** 2026-07-17
**Branch:** worktree-games-offline-pwa (worktree, independent of feat/dealer-glb-character)
**Scope:** `portfolio/public/games/card-drawer/`, `portfolio/public/games/connect4/`, `portfolio/public/games/card-game/`

## 1. Summary

Make three static mini games fully playable with no network, and installable to
a phone home screen ("Add to Home Screen"). Each game already runs 100%
client-side after its files load; the only missing piece is telling the browser
to keep those files on the device. We add a per-game service worker plus a web
app manifest inside each game's folder.

Approved by user 2026-07-17 (full installable PWA + AWS billing alert; work in
a separate worktree, pushed as its own PR).

## 2. Current state (verified in repo)

- All three games are static bundles under `portfolio/public/games/<name>/`,
  served from S3 (`hillmanportfolio1`) via CloudFront (E2SYHEFLV89R32), and
  embedded by the React SPA in an iframe (`/games/<name>/index.html`).
- Game subdomains (`card-drawer.hillmanchan.com`, `connect4.hillmanchan.com`,
  …) serve the SAME SPA from the same CloudFront distribution — `App.js`
  routes by hostname and renders the same iframe. Each subdomain is a distinct
  browser origin, so it gets its own SW registration and its own cache; using
  relative paths in registration + manifest makes the identical files work on
  every entry point without per-origin configuration.
- **Card Drawer** (84KB): vanilla JS + SVG. Zero external requests.
- **Connect 4** (356KB): single-file HTML app + `connect4-solver.wasm`
  (fetched relatively at `index.html:550`). External: Google Fonts (Fraunces,
  JetBrains Mono) and Firebase SDK from `www.gstatic.com` for the leaderboard.
  Firebase init failure already degrades gracefully (`index.html:360`,
  "leaderboard offline") — the game vs AI is fully client-side.
- **Never Have I Ever / card-game** (640KB): built Vite/React app. Firebase
  RTDB sync is a lazily imported chunk (`FirebaseSyncManager-*.js`) used only
  for cross-device rooms; local pass-the-phone play is client-side. Folder
  already contains `manifest.json`, `logo192.png`, `logo512.png`,
  `favicon.ico`.
- No service worker exists anywhere in the portfolio today (nothing registered
  in `portfolio/src/index.js`).

## 3. Approach decision

**Chosen: per-game service worker + manifest inside each game folder.**

Rejected alternatives:

- *Site-wide CRA/Workbox service worker* — would make the portfolio shell
  offline too, but drags the 56MB build (casino 3D assets) into caching
  decisions, touches the CRA build config, and one bug affects the whole site.
- *One shared SW at `/games/` scope* — couples all games to one cache version;
  deploying one game would churn the others' caches.

Per-game SWs are small, isolated, need no build-tool changes, and one game's
update cannot break another.

## 4. Design

### 4.1 Files per game

Each of the three folders gets:

| File | Purpose |
|------|---------|
| `sw.js` | Service worker: precache + cache-first fetch handler |
| `manifest.webmanifest` | Installability: name, icons, `start_url`, `scope` |
| icons | 192px + 512px PNG (SVG-designed, rasterized — **no emoji**) |
| `index.html` edits | manifest `<link>`, `theme-color` meta, `apple-touch-icon`, SW registration snippet |

card-game reuses its existing `logo192.png`/`logo512.png` and its existing
`manifest.json` (edited in place: relative `start_url`/`scope`,
`display: standalone`) — no new `manifest.webmanifest` there, since the built
`index.html` already links `manifest.json`. Only card-drawer and connect4 get
a new `manifest.webmanifest`.

### 4.2 Service worker behavior (identical pattern, per-game file list)

```js
const CACHE = '<game>-v1';            // bump to invalidate after any file change
const ASSETS = [ './index.html', ... ]; // full same-folder file list
```

- **install:** `cache.addAll(ASSETS)`, then `skipWaiting()`.
- **activate:** delete caches whose name ≠ `CACHE`; `clients.claim()`.
- **fetch:** only handle same-origin GET requests whose URL falls inside the
  SW scope. Cache-first, network fallback; successful network responses for
  in-scope URLs are written back to the cache. Navigation requests fall back
  to cached `./index.html` when offline. Cross-origin requests (gstatic
  Firebase SDK, Google APIs, RTDB) are NOT intercepted — no `respondWith`,
  browser default behavior, so online features keep working and offline
  failures surface to each game's existing error handling.

Registration (in each game's `index.html`, relative so it works on any
origin/entry point):

```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}
```

### 4.3 Manifest (per game)

- `start_url: "./index.html"`, `scope: "./"` — relative, valid on
  `hillmanchan.com/games/<name>/` and on subdomains.
- `display: "standalone"`, game-appropriate `name`/`short_name`,
  `background_color`/`theme_color` matched to each game's existing palette.
- Icons: SVG source designed per game (suit glyphs for the card games, disc
  grid for Connect 4 — consistent with the codebase's SVG-only icon rule),
  rasterized to 192/512 PNG via headless Chrome or sharp at authoring time.
  PNG is required for Android/iOS install surfaces.

### 4.4 Precache lists

- **card-drawer:** `index.html`, `styles.css`, `game.js`, `card-svg.js`,
  `hand-eval.js`, manifest, icons. (Test files and `package.json` excluded.)
- **connect4:** `index.html`, `connect4-solver.wasm`, `fonts/*.woff2`,
  `fonts.css`, manifest, icons. (Opening-book JSONs are build-time inputs, not
  fetched at runtime — verified no runtime fetch besides the wasm; `.mjs`
  files are dev scripts.)
- **card-game:** `index.html`, `assets/index-*.js`, `assets/index-*.css`,
  `assets/FirebaseSyncManager-*.js`, `assets/TempSyncManager-*.js`,
  `favicon.ico`, `logo192.png`, `logo512.png`, manifest. The lazy Firebase
  chunk is precached so `import()` resolves offline; actual RTDB traffic still
  requires network and fails into the app's existing error paths.
  `sw.js` carries a comment: **regenerate ASSETS whenever the built app is
  re-synced into this folder** (hashed filenames change).

### 4.5 Connect 4 font self-hosting

Replace the two Google Fonts `<link>` tags with a local `fonts.css`:

- Download latin woff2 subsets: Fraunces (variable, opsz 9–144 / wght used:
  400, 600, 900) and JetBrains Mono (400, 600).
- `@font-face` with `font-display: swap`, files under
  `public/games/connect4/fonts/`.
- Without this, offline reload falls back to system fonts (or blocks on
  Safari) — typography is part of "works offline".

### 4.6 Explicit limitation (accepted)

Offline entry points are: the installed home-screen icon, or the game's direct
URL (`/games/<name>/index.html`). The portfolio lobby and the SPA shell served
at subdomain roots stay online-only — that is approach-2 scope, deliberately
excluded.

### 4.7 Deployment notes (documented in PR description)

- `sw.js` files must upload to S3 with `Cache-Control: no-cache` (same
  treatment as `index.html` in the existing `upload:index` script) so new
  service workers propagate promptly. Add an `upload:sw` npm script mirroring
  `upload:index` (`aws s3 cp` per games `sw.js`, `--content-type
  "application/javascript"`, `--cache-control "no-cache, no-store,
  must-revalidate"`).
- Manifest files upload with `--content-type "application/manifest+json"`.
- CloudFront invalidation on deploy as usual.
- Cache busting for players = bump the `CACHE` version constant in the changed
  game's `sw.js`.

## 5. Error handling

- SW registration failure (old browsers, private mode): game works exactly as
  today — registration is wrapped so a rejection is logged, never thrown.
- Offline + not-yet-cached: browser's normal offline page (nothing cached to
  serve); first visit must be online — inherent to any offline scheme.
- Partial precache failure: `install` rejects atomically (`addAll`), the old
  SW/cache stays active; next visit retries.
- connect4 offline: leaderboard buttons keep their existing "Leaderboard
  unavailable." path; game unaffected.
- card-game offline: joining/hosting online rooms fails at the RTDB layer into
  existing UI error handling; local mode unaffected.

## 6. Verification (done = works for a user)

Per game, in Chrome (via claude-in-chrome or headless):

1. Serve the folder (or full portfolio) locally, load the game.
2. Confirm SW active + cache populated (`navigator.serviceWorker`, Cache
   Storage keys).
3. DevTools → offline, hard reload → game loads and a full round is playable
   (connect4: vs AI including WASM moves; card-drawer: deal cards; card-game:
   local mode).
4. connect4 offline shows correct fonts (self-hosted) and graceful leaderboard
   message.
5. `node --test` in `card-drawer/` still passes (`hand-eval.test.js`,
   `card-svg.test.js`).
6. Lighthouse PWA installability check passes per game (manifest + SW + icons).

## 7. Out of band (not in the PR)

AWS Budgets alert: monthly cost budget, US$5 threshold, email notification to
hillmanchan709@gmail.com, created once via `aws budgets create-budget` against
account 575108933055. Account-level action, run from CLI after the code work;
not part of the worktree/PR.

## 8. Delivery

- All work on branch `worktree-games-offline-pwa` in
  `.claude/worktrees/games-offline-pwa` (rebased onto origin/main `78505ee`,
  which includes card-drawer v2 — file list unchanged, still no network calls).
- Push branch, open PR to `main`; **no merge without explicit instruction**
  (established workflow). The user's `feat/dealer-glb-character` branch is
  untouched.
