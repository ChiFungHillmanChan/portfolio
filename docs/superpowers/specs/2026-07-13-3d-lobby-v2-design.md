# 3D Lobby v2 — Modern Casino Floor (real entry hub)

**Date:** 2026-07-13
**Status:** Approved design (user-confirmed choices below), pending implementation plan
**Relates to:**
- `2026-07-12-casino-3d-preview-design.md` (v1 "Grand Hall" prototype — this evolves it)
- `2026-07-12-casino-lobby-credits-design.md` (wallet + login model — unchanged by this work)
- `2026-07-13-blackjack-stake-tiers-design.md` (stake tiers — the 3D floor is a second *front-end* to the same `GAME_STAKES` data)

## Summary

The v1 Grand Hall prototype graduates from a self-contained demo into a **real,
optional 3D entry hub**: one big, open, **modern** casino floor the player can
walk around. A **reception desk performs the ID check** (Google sign-in) at the
entrance; beyond it, four **game sections** (Roulette, Blackjack, Baccarat,
Ultimate Hold'em) each hold **one physical table per stake tier**. Walking up
to a table and sitting down leaves the 3D hub and opens that game's existing
**2D page with `?stake=<key>`**. All real play stays 2D; the 2D games are not
modified. Stakes never change the game's UI/UX — only the table limits.

## User-confirmed decisions

| Decision | Choice |
|---|---|
| V2 role | **Real entry hub** — real Google login + real `casinoWallet` balance in the HUD; play stays in the existing 2D games. |
| Entry point | **2D lobby stays the default.** It gains one prominent "Enter 3D Casino" card. Hub lives at `calculator/lobby-3d/` (evolve `prototype-3d/` in place + rename; git history preserves the v1 demo). |
| Space | **No doors / no separate rooms.** ONE continuous open floor, modern-casino style. Players walk between sections. |
| Stake selection | **Physical stake tables** — each game section contains one table per tier (like a real casino floor: the 50-min table next to the 1,000-min table). Sitting at a table deep-links to the 2D game with `?stake=<key>`. |
| Login | **Reception / ID check** at the entrance vestibule (diegetic gate — see §3). |
| Demo play | **Removed.** No fake rounds, no demo chips — the 3D hub never shows a balance that isn't the real one. |
| Visual style | **Modern casino** (contemporary Vegas/Macau floor: dark neutral palette, LED strip lighting, glass/steel, neon accent signage per section) — replaces v1's classic mahogany/gold. Assets stay **100% procedural** (no GLTF/image/font downloads). |
| Fidelity budget | The **four game tables are the hero assets** — modeled "perfectly" (correct proportions, printed felt layouts, chip racks, bevels, per-tier signage). Ambient décor (slots, bar, cashier, plants) stays deliberately simple. |

## 1. Deliverable & location

- `portfolio/src/game/casino-game/calculator/lobby-3d/` — `git mv` of
  `prototype-3d/` plus the v2 changes (same `build.mjs` + local Three.js
  vendor; keep `src/engine|logic|rooms` module layout, `rooms/` becomes
  `floor/` sections).
- v2 **must be served from the site** (Firebase auth + wallet module imports).
  The v1 `file://` self-contained constraint is retired (v1 remains in git
  history if a standalone demo is ever wanted).
- Imports the real shared modules — no copies:
  - `../js/wallet/wallet-bootstrap.js` (auth singleton: `onAuth`, `signIn`, `walletClient`)
  - `../js/wallet/table-config.js` (`GAME_STAKES`, `LOBBY_GAMES`, `formatChips`)
- The 2D lobby (`calculator/index.html`) gains one "Enter 3D Casino" card in
  the GAME LOBBY zone linking to `lobby-3d/index.html`. **No other 2D file
  changes.** The 2D games, gates, and pickers are untouched.

## 2. The floor (scene layout)

One scene, one camera, walkable:

```
                    ┌──────────────────────────────────────────────┐
                    │                 MAIN FLOOR                   │
                    │  ROULETTE        BLACKJACK                   │
                    │  ▢▢▢▢ (4 tbl)    ▢▢▢▢ (4 tbl)                │
                    │                                              │
   VESTIBULE        │       [slot banks]   [bar/lounge]            │
 ┌───────────┐      │                                              │
 │ PRACTICE  │      │  BACCARAT        ULTIMATE HOLD'EM            │
 │ corner    │ ID   │  ▢▢▢▢ (4 tbl)    ▢ (1 tbl; 4 reserved       │
 │           │─────▶│                     spots for Plan 5 tiers)  │
 │ RECEPTION │check │            [CASHIER cage]                    │
 └───────────┘      └──────────────────────────────────────────────┘
```

- **Vestibule** (before the ID check): reception desk + the **Practice
  corner** — a signed corner (arcade-style trainer cabinets or a study
  lounge) with a DOM link to the 2D Practice zone. Practice requires no
  login, so it sits *before* reception — the 3D geography enforces the same
  rule as the 2D lobby.
- **Main floor** (after the ID check): four game sections, each with overhead
  **neon section signage** (ROULETTE / BLACKJACK / BACCARAT / ULTIMATE
  HOLD'EM) and its stake tables in a row, cheapest nearest the aisle.
- **Ambient décor** ("a big casino inside"): banks of simple slot machines
  with idle light loops (non-interactive), a bar/lounge corner, plants,
  columns, LED ceiling features. Décor is atmosphere only — low-poly, no
  interactions, no patron NPCs.
- **Cashier cage** (diegetic wallet services): walking up shows a DOM card
  with the real balance; when the balance is bust (< 100) it offers the same
  `walletClient.reset()` the 2D HUD has (+ cooldown countdown). Reserved
  space for future chip purchases (Stripe — separate project).

## 3. Reception & ID check (login flow)

Scene order: **Splash → Vestibule (reception) → Main floor.**

- The reception desk: modern counter, brass bell, "RECEPTION — ID CHECK"
  sign, one low-poly procedural **receptionist** (idle sway, same style as
  v1 dealers). Behind it, a **light barrier / glass turnstile** (modern
  replacement for v1's doors) blocks the floor.
- **Signed out:** the player can wander the vestibule and use Practice, but
  the turnstile is red. Approaching it or clicking the desk walks the camera
  to a counter POV, and a DOM **check-in card** slides up: *"Please verify
  your identity — Sign in with Google"* → real `bootstrap.signIn()` popup
  (auth popups need a user gesture, so the trigger stays DOM).
  - **Success:** stamp animation on a member-card prop, *"Welcome, ⟨name⟩ —
    your chips are ready: ⟨balance⟩"*, turnstile turns green and opens, the
    camera glides onto the floor.
  - **Failure / popup blocked:** receptionist head-shake + retry button
    (same error copy as the 2D lobby). Firebase unreachable → banner with a
    link back to the 2D lobby.
- **Already signed in on load:** the receptionist waves you through — a
  ~1.5 s pass-by greeting, click-to-skip — straight onto the floor.
- **Sign-out** (HUD menu): camera returns to the vestibule; turnstile closes;
  balance clears (auth state is the single source — `bootstrap.onAuth`).
- `prefers-reduced-motion`: every walk/fly/stamp animation becomes an
  instant cut; flows are identical.

## 4. Stake tables (selection = sitting down)

- Each section renders **one table per tier from `GAME_STAKES`** — the
  registry drives count, order, names, and limits, so the floor can never
  drift from the real tables (adding a tier in table-config adds a table on
  the floor). Currently: roulette ×4, blackjack ×4, baccarat ×4.
- **UTH:** one table (ante 100–1,000 · buy-in 10,000) linking to
  `ultimate-texas-holdem/index.html` with **no** `?stake=` param; the section
  reserves floor space for the four Plan 5 ante tiers (25/100/500/1,000 —
  already specced in the parent doc's UTH section).
- Every table has a **table sign** (tier name + limits text + min chip) and a
  fidelity-first model of its game: roulette wheel + printed layout,
  blackjack arc + printed insurance band, baccarat oval + printed
  player/banker/tie boxes, UTH layout with ante/blind/trips circles. Ghost
  chips/cards keep tables from looking abandoned (v1 precedent).
- **Interaction:** walk near a table → it highlights + a DOM **"Sit down"
  card** appears (game, tier, limits, current balance, insufficient-balance
  hint if balance < tier min — mirroring `computeGateState` copy). Confirm →
  `location.href = "../<game path>?stake=<key>"`. The 2D page's own gate
  still protects the deep link (defence in depth).
- **Stakes never alter the 2D game's UI/UX** — one game page per game, the
  tier only sets the limits (already how `?stake=` works).

## 5. Navigation & controls

- **Primary: click/tap-to-move.** Click a floor spot, section sign, or table
  → the camera glides there (nav-mesh-free: a flat walkable rectangle with
  prop exclusion zones). Works identically on touch.
- **Desktop enhancement: WASD + mouse-look** (pointer-lock optional), for the
  "walk around a casino" feel. Mobile gets tap-to-move only.
- **DOM quick-nav**: a slim bottom bar with section shortcuts (Roulette /
  Blackjack / Baccarat / UTH / Cashier / Practice) for players who don't
  want to walk — accessibility fallback and mobile convenience. Fully
  keyboard operable (the DOM layer, incl. check-in and sit-down cards, is
  the accessible path; the WebGL canvas is decorative).
- HUD (DOM, always on top): wallet pill (real balance / "Sign in" state),
  current-section label, "2D lobby" exit link.

## 6. Fallbacks, performance, compatibility

- **WebGL init failure or context loss** → automatic redirect to the 2D
  lobby with a small toast param (never a black screen).
- Target 60 fps desktop / 30 fps mobile: single scene with per-section
  frustum + distance fog culling, instanced meshes for chips/slot banks,
  `pixelRatio ≤ 2`, shadows on key lights only.
- Mobile: reduced DPR, tap-to-move, same DOM cards; the hub is *navigation*,
  so a modest phone only needs it to be workable, not showcase-grade.
- No sound in v2 (kept out of scope, as in v1).

## 7. Testing

- **Pure (`node --test`)**: a `floor-model.mjs` that builds the section/table
  registry from `GAME_STAKES` (counts, keys, hrefs with `?stake=`, limits
  text, UTH special case) — asserts parity so a table-config change breaks a
  test, not the floor. Reception/auth state machine as a pure reducer
  (signed-out → checking-in → signed-in → signed-out) if practical.
- **Browser pass (screenshots)**: vestibule signed-out (turnstile red,
  Practice reachable), check-in card, floor overview, each section + its
  stake tables, sit-down card (incl. insufficient-balance hint), cashier
  card, WebGL-fallback redirect, mobile width, reduced-motion. Signed-in
  flows can use the stub-session harness pattern from the stake-tiers
  session; the real-auth run is deploy-gated as usual (Firebase blocks
  localhost referrers).
- Existing suites stay green (`js/wallet/*.test.mjs`, per-game tests,
  backend `wallet-logic.test.mjs`) — v2 must not touch them.

## 8. Out of scope (explicit)

- Playing any game inside 3D (all play is the 2D pages).
- Sound design; patron NPCs; multiplayer presence on the floor.
- Chip purchases at the cashier (reserved space only — Stripe is a later
  project).
- UTH stake tiers (Plan 5 builds them; the floor reserves the spots).
- Any modification to the 2D games, their gates, or the shared wallet
  platform (the 2D lobby's single new "Enter 3D Casino" card is the only 2D
  edit).

## 9. Rollout

- Frontend-only: no backend changes, no new API routes, nothing to deploy in
  `system-architecture`.
- Branch `feat/casino-lobby-credits`; mirror-sync `src/…/calculator/` →
  `public/games/casino-game/` before any deploy; rides the same
  one-release-at-end train as the stake-tiers work (PR-only, never push
  main).
