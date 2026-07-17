# Offline PWA Round 2 — Math Memory + Portfolio Shell

**Date:** 2026-07-17
**Branch:** worktree-offline-pwa-2 (worktree, base origin/main `76ccbde`)
**Builds on:** `docs/superpowers/specs/2026-07-17-games-offline-pwa-design.md` (PR #68, merged) — the per-game SW pattern, `pwa.test.mjs` harness, and deploy scripts from that round are reused, not redesigned.

## 1. Scope (user-approved 2026-07-17)

- **Part A:** Math Memory becomes an offline installable PWA — the round-1 recipe.
- **Part B:** the portfolio SPA shell gets a root service worker so the game
  subdomains (`card-drawer.hillmanchan.com` etc.) load offline, plus per-game
  top-level manifests so "Add to Home Screen" works FROM the subdomains.
- **Deferred:** casino-game offline practice (own project). **Rejected:**
  prompt-hunter (AI backend is the product), observation-report (pure API
  client for an Evoke server), hourglass (empty husk — `src/game/hourglass/`
  contains only `node_modules`, no source, no route; not deployed).

## 2. Verified facts

- **math-memory:** single self-contained `public/games/math-memory/index.html`
  (only file in folder); external deps = Google Fonts only (Fraunces same axes
  as connect4 + Spline Sans Mono 400;500;600). Palette `#0e1014` (bg),
  tiles `#171a21`/`#1f2530`. Subdomain wired in `App.js`
  (`'math-memory': MathMemoryGame`). Already ships `theme-color` +
  apple-mobile-web-app metas.
- **Shell:** CRA template `portfolio/public/index.html`; CSP meta allows
  `worker-src 'self'` and inline scripts, so a root SW + inline registration
  need no CSP change. Links root `manifest.json` (portfolio's own) +
  `port_logo.png`. `%PUBLIC_URL%` is empty at build (root deploy).
- Install-from-subdomain fails today because the top-level page has no
  manifest whose scope contains it — the game manifest lives inside the
  iframe document.
- Hashed CRA bundles live under `/static/` and are immutable
  (`max-age=31536000` on upload) — safe for cache-first runtime caching; the
  build output isn't committed, so the shell SW must not rely on a build-time
  precache manifest.

## 3. Design

### Part A — Math Memory (round-1 recipe)

- `portfolio/scripts/fetch-connect4-fonts.mjs` → generalized
  `fetch-game-fonts.mjs` with a per-game CSS-URL config (`connect4`,
  `math-memory`); connect4's existing `fonts/` output is untouched. Each game
  keeps its own font copy (isolation over ~100KB dedup, per round-1 decision).
- `sw.js` = canonical round-1 copy, `CACHE "math-memory-v1"`, ASSETS =
  index.html + fonts + manifest + icons.
- `manifest.webmanifest` (#0e1014), designed geometric icon (memory-tiles
  motif: 2×2 rounded tiles on dark bg showing "7 + 2 ?" in mono type — no
  emoji), index.html wiring identical to connect4's.
- Google Fonts links removed from math-memory `index.html`, replaced by
  `fonts/fonts.css`.
- Tests: math-memory joins `GAMES`; fonts self-hosted test + reverse drift
  guard mirroring connect4's.

### Part B — Shell service worker + subdomain install manifests

**`portfolio/public/sw.js`** (served at `/sw.js`, scope `/`):
- install: precache `/index.html` with `cache: "reload"`; skipWaiting.
- activate: delete only `portfolio-shell-*` caches ≠ current; clients.claim.
- fetch (same-origin GET only):
  - pathname starts `/games/` → return untouched (game SWs own those pages;
    casino assets stay uncached; on a first-ever visit where no game SW is
    registered yet, falling through to network is correct).
  - `mode === "navigate"` → network-first; fresh response also `cache.put`
    under the `/index.html` key (SPA serves the same shell for every route);
    offline → cached `/index.html`.
  - pathname starts `/static/` → cache-first with runtime `cache.put` on ok
    (immutable hashed bundles).
  - everything else → untouched (browser default).
- Update path: shell HTML is network-first (never stale online); bump
  `CACHE` (`portfolio-shell-vN`) to force a clean sweep.

**Subdomain install manifests** `portfolio/public/pwa/<game>.webmanifest` for
card-drawer, connect4, card-game, math-memory: `start_url "/"`, `scope "/"`,
`display standalone`, game name/colors, icons referencing the game's existing
`/games/<game>/icon-*.png`. An inline script in `public/index.html` (placed
after the manifest `<link>`) swaps the manifest href to
`/pwa/<subdomain>.webmanifest` when `location.hostname`'s first label matches
a game, then registers `/sw.js` on load (with `.catch` logging, as in
round 1). Main domain keeps the portfolio's own `manifest.json`.

**Deploy:** new `upload:sw:root` (build/sw.js → `/sw.js`, JS content-type,
`no-cache, no-store, must-revalidate`), chained into `deploy` after
`upload:sw`. `/pwa/*.webmanifest` ride the existing sync + `mime:webmanifest`.

### Tests (pwa.test.mjs additions)

- math-memory: full GAMES coverage + fonts + reverse guard.
- shell: `public/sw.js` exists with strict-JSON `CACHE`
  (`^portfolio-shell-v\d+$`) and `PRECACHE` including `/index.html`;
  `public/index.html` registers `/sw.js` and references `/pwa/`; every
  `public/pwa/*.webmanifest` parses with scope `/`, start_url `/`, and icons
  that exist on disk; the hostname-map script lists exactly the games that
  have a `/pwa/` manifest.

### Error handling

Round-1 semantics carry over (registration `.catch`, atomic `addAll`,
cross-origin untouched). Shell-specific: a navigation that was never cached
(first visit offline) falls through to the browser's offline page — inherent.
`/static/` cache-first can never serve stale-after-deploy JS against fresh
HTML: HTML is network-first and hashed bundle names change per build, so a
fresh shell always references fetchable (then cached) new hashes.

## 4. Verification (done = works for a user)

1. `node --test "portfolio/public/games/pwa.test.mjs"` — all pass (round-1
   17 + new).
2. math-memory e2e (round-1 procedure): online load → server killed → offline
   reload renders and plays; Fraunces/Spline Sans Mono render offline.
3. Shell e2e against a real build: `npm run build`, serve `build/` — online
   load `/index.html` (SW installs), kill server, offline reload
   `/index.html` renders the shell; offline navigate to `/card-drawer`
   falls back to the cached shell.
4. Multi-SW coexistence: same-profile visit of shell + two games online, then
   offline — all still load (no cache interference; shell cache prefix is
   disjoint from game prefixes).
5. Manifest-swap: with a hosts-file-free check — static assertion via tests,
   plus manual/DevTools spot check documented in the PR (hostname can't be
   faked under localhost e2e).

## 5. Delivery

Branch `worktree-offline-pwa-2` → rename `feat/offline-pwa-2`, push, PR to
main; **no merge without explicit instruction**. Deploy reminder in PR: run
`npm run deploy` after merge; shell changes take effect on next visit
(network-first HTML), game caches on their own `CACHE` bumps.
