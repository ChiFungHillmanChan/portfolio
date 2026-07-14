# HANDOFF PROMPT — 3D Lobby v2: modern casino floor (reception ID-check + walkable stake tables)

> Paste everything below the line into a fresh Claude Code session started in
> `/Users/hillmanchan/Desktop/HillmanChan_portfolio`.

---

You are building **3D Lobby v2** for the casino-game suite: the v1 "Grand Hall"
prototype becomes a REAL entry hub — one open, **modern** casino floor with a
**reception desk that does the ID check** (Google sign-in), four walkable game
sections, and **one physical table per stake tier** in each section. Sitting at
a table deep-links to that game's existing **2D page with `?stake=<key>`**.
All real play stays 2D; the 2D games are NOT modified. Work on branch
`feat/casino-lobby-credits`. Frontend-only (no backend repo changes).

## 0 — ORIENT (read first, in this order)

1. **Design spec (authoritative, user-approved):**
   `docs/superpowers/specs/2026-07-13-3d-lobby-v2-design.md` — floor layout,
   reception flow, stake-table interaction, navigation, fallbacks, testing.
2. **V1 prototype you are evolving:** `portfolio/src/game/casino-game/calculator/prototype-3d/`
   - `build.mjs` inlines `vendor/` (Three.js) + css + `SRC_ORDER` js into `index.html`; `template.html` is the shell.
   - `src/engine/` (app, assets, tween, hud, cards, chips3d), `src/logic/`
     (wallet [demo — DELETE in v2], tables, layouts, outcomes), `src/rooms/`
     (lobby, roulette, blackjack, baccarat, uth), `tests/*.test.mjs` (node --test).
3. **Wallet platform (import, don't copy):** `calculator/js/wallet/`
   - `wallet-bootstrap.js` — auth singleton: `onAuth(cb)`, `signIn()`, `walletClient` (`getBalance()`, `getResetInfo()`, `subscribe()`, `reset()`).
   - `table-config.js` — `GAME_STAKES` (roulette/blackjack/baccarat × micro/mini/std/high: key, gameId, name, limitsText, blurb; roulette entries also carry `perSpotMax`), `LOBBY_GAMES`, `formatChips`.
   - `stake-picker.js`/`game-gate.js` — 2D precedents for copy/tone (gate copy for the insufficient-balance hint).
4. **Prior session context:** `docs/superpowers/plans/2026-07-13-blackjack-stake-tiers.md`
   STATUS section (stake tiers shipped code-complete, held release) and memory
   `[[project-casino-lobby-credits]]`.
5. Repo rules: PR-only (never push main); parallel sessions share the tree —
   `git status` before committing; nothing deploys except the one release at
   the end of Plan 5; keep every `node --test` suite green.

## 1 — PLAN FIRST

Use `superpowers:writing-plans` to turn the spec into a step-by-step
implementation plan (save under `docs/superpowers/plans/`) BEFORE coding.
Suggested job breakdown for the plan:

1. **Rename + rewire:** `git mv prototype-3d lobby-3d`. Decide the build
   strategy: keep `build.mjs` inlining for the 3D engine/floor code, but the
   wallet/auth integration must be a separate NON-inlined
   `<script type="module">` that imports `../js/wallet/*` at runtime (those
   import the Firebase CDN — they cannot be inlined; mirrors how the 2D game
   pages layer wallet modules over classic scripts). Delete `src/logic/wallet.js`
   (demo wallet) + demo-round code in rooms.
2. **Restyle + floor:** one continuous modern floor scene (vestibule → main
   floor), per the spec's layout map. Rooms/*.js become floor sections; the
   four GAME tables are the hero assets (fidelity budget there), décor stays
   simple (slot banks, bar, cashier cage, plants, neon section signs).
3. **Reception / ID check:** vestibule + receptionist + turnstile; DOM
   check-in card → `bootstrap.signIn()`; stamp + welcome (name + balance) on
   success; wave-through when already signed in; sign-out returns to the
   vestibule; Practice corner BEFORE reception (links to the 2D practice
   zone); `prefers-reduced-motion` = instant cuts everywhere.
4. **Stake tables:** build a pure `floor-model.mjs` registry FROM `GAME_STAKES`
   (sections → tables → `{key, name, limitsText, href}`), UTH special-cased to
   one table (no `?stake=`, space reserved for Plan 5 tiers). Walk-near →
   highlight + DOM "Sit down" card (tier, limits, balance,
   insufficient-balance hint) → navigate. Hrefs from lobby-3d/:
   `../roulette/index.html?stake=<key>`, `../blackjack/game-mode/index.html?stake=<key>`,
   `../baccarat/game-mode/index.html?stake=<key>`, `../ultimate-texas-holdem/index.html`.
5. **Navigation + HUD:** click/tap-to-move (camera glide), desktop WASD
   enhancement, DOM quick-nav bar (sections/cashier/practice, keyboard
   operable), HUD wallet pill driven by `walletClient.subscribe`.
6. **Cashier cage:** DOM card with real balance; bust (<100) → `walletClient.reset()`
   + cooldown countdown (reuse `wallet-hud.js` copy); placeholder for future purchases.
7. **Fallback + 2D entry card:** WebGL failure/context-loss → redirect to the
   2D lobby; add ONE "Enter 3D Casino" card to `calculator/index.html`'s GAME
   LOBBY zone (the only 2D edit allowed).
8. **Tests + UI/UX pass:** update/extend `tests/` (floor-model parity vs
   GAME_STAKES, build test, reception state reducer); run ALL suites from
   `calculator/` (`node --test js/wallet/*.test.mjs`, game tests,
   `lobby-3d/tests/*.test.mjs`) + backend suite untouched-but-verify. Browser
   pass with screenshots per spec §7 (signed-out flows on a local static
   server; signed-in via the stub-session harness pattern from the stake-tiers
   session — Firebase blocks localhost referrers; real-auth run is
   deploy-gated). Re-sync `src/…/calculator/` → `public/games/casino-game/`
   (`rsync -a --delete`) after changes.

## QUALITY BAR & AUTONOMY (how to run)

- **Run autonomously, as long as it takes.** The spec's decisions are final —
  do not stop to re-confirm them. Only interrupt for a genuine scope change or
  a destructive action. Prefer MORE polish iterations over finishing fast.
- **The bar is a realistic MODERN casino, not a tech demo.** After every
  visual milestone (vestibule, reception, floor shell, each section, each
  hero table, cashier, signage/lighting pass), screenshot the actual scene in
  the browser and self-critique it like an art director before moving on:
  - **Scale & proportions** — table heights/widths vs. the camera's eye
    height; chairs, rails, chip racks at believable sizes; aisle widths a
    person would walk.
  - **Lighting** — dark ambient floor + warm pools of light over each table,
    LED strips/neon signage as accents, no flat uniform lighting.
  - **Materials** — felt reads as felt (printed layouts legible), metal has
    specular, floor carpet vs. marble zones differ; no untextured default-gray.
  - **Table fidelity (the 4 hero games)** — roulette wheel geometry + correct
    layout print; blackjack arc + insurance band; baccarat boxes; UTH
    ante/blind/trips circles. A player must recognize each game AT A GLANCE
    from across the floor.
  - **Ambience & composition** — slot banks glowing, section signage legible
    from the entrance, negative space so the floor feels grand not cluttered;
    cohesive palette (dark neutrals + gold/neon accents).
  If a screenshot fails any point, iterate BEFORE moving to the next milestone.
- **UI/UX verification is end-to-end, evidence-first** (screenshot each):
  reception ID-check flow signed-out AND the wave-through signed-in (stub the
  auth/wallet in-page — see the stub-session harness pattern in the stake-tiers
  session notes — since Firebase blocks localhost); tap-to-move + WASD;
  every section reachable; EVERY stake table's highlight + sit-down card
  (correct tier limits + balance + insufficient hint) and its deep link landing
  on the right 2D `?stake=` page; cashier card incl. bust/reset state;
  practice corner without login; quick-nav bar by keyboard only; mobile width
  (~390px) with no horizontal scroll; `prefers-reduced-motion` instant cuts;
  WebGL-failure redirect; console clean on every page.
- **Done means:** the spec's §7 checklist passes, all suites are green, the
  mirror is re-synced, and the final report includes the milestone screenshots
  and a self-assessed confidence ≥ 85% that the floor reads as a real casino.

## CONSTRAINTS

- **Do NOT touch** the 2D games, their gates/pickers, `js/wallet/` platform
  code, or the backend repo (the single 2D-lobby card is the one exception).
- Stakes must never alter 2D game UI/UX — the table choice only sets `?stake=`.
- Demo chips/fake balances must not exist anywhere in v2 — the only balance on
  screen is the real server-confirmed one (or the "Sign in" state).
- Assets stay 100% procedural (no GLTF/images/fonts in-canvas); Three.js stays
  vendored locally; `pixelRatio ≤ 2`; 60 fps desktop / 30 fps mobile targets.
- The DOM layer (check-in, sit-down, cashier, quick-nav) is the accessible
  path: keyboard operable, focus-visible, ≥44px touch targets.
- HELD RELEASE: commit on `feat/casino-lobby-credits` only when the user asks;
  no deploy; merges via PR only.
