# Casino 3D Lobby — Bar & Cashier Redesign

**Date:** 2026-07-15
**Branch:** `feat/dealer-glb-character`
**Scope:** `portfolio/{src/game/casino-game/calculator,public/games/casino-game}/lobby-3d`

## Problem

Two floor features sit in the wrong place:

- **Cashier** is buried on the *south wall* (`x 2.6, z 9.65`), behind the baccarat/UTH
  tables — you have to walk around tables to reach it. Real casinos put the cage at
  the back of the floor, prominent and dead-ahead.
- **Bar** sits at the far *east wall* (`x 16.6, z 0`) — the natural "back of house"
  spot that the cage should own — and it is **pure scenery** with no purpose.

## World frame (recap)

`+X` = east (deeper in), `+Z` = south. Player enters from the **west** vestibule,
through the turnstile gate (`x -16.2, z 0`), down the central aisle (`z -3.4..3.4`)
heading east. Facing east, **left = north (−Z)**. Gaming hall spans `x -16.2..18`,
`z -10.5..10.5`. North field (`z -10.5..-3.4`) = roulette (NW) + blackjack (NE);
south field = baccarat (SW) + UTH (SE).

## Design

### 1. Cashier → east wall, recessed real-casino cage

Relocate to the **east wall, centered on the aisle** (`x ≈ 16.8, z 0`) — the focal
point straight down the aisle as you enter. Built as a **recessed cage set into the
wall**, real-casino format:

- Standing **teller NPC** (reuse `C.assets.makeDealer`) behind the counter.
- **Brass grille + central service window** (keep/upgrade current cage bars).
- **Back wall of chip trays / vault** — stacked chip cylinders and rack geometry,
  visible through the grille. All geometry/SVG, **no emoji**.
- Marble counter, warm downlight, "CASHIER" neon over the opening.

**Function is preserved.** The cashier is the wallet cage — its DOM card
(`UI.cashierCard`: buy-in / cash-out / reset) is unchanged. Only its **anchor
position** and **`ANCHOR_POSES.cashier` approach pose** change so the camera lands in
the aisle looking east into the cage. `anchor.kind` stays `'cashier'` →
`platform.js` shows the same card.

### 2. Bar → NW floor lounge (left as you enter)

Relocate to a **lounge on the north side by the gate** — first thing on your left
walking in, open floor in front. To make room, the **roulette row shifts east and
tightens pitch**, keeping **all 4 tables** (table count is data-driven from the stake
tiers — we do not drop a tier). This opens a **~4.5 m bar bay** at the west end of the
north field (`x −14.6 .. ≈ −9.5`).

- Bar counter runs along the **north wall** within the bay, facing south (into the
  floor), with stools on the aisle side — so it reads front-on as you come in.
- Keep the backbar, emissive bottles, pendant lamps, warm light, "BAR" neon —
  re-placed for the new bay.
- Add a **bartender NPC** behind the counter.

Roulette changes are localized to `sections.js`: `ROWS.roulette.xs` (new x centers)
and `SIGN_X.roulette` (new sign center). Obstacles, live-play rigs, per-table
spotlights and anchors are all derived from `xs` in the build loop, so they follow
automatically. **Exact pitch/positions must be validated in-browser** for
walkability and no visual crowding (target pitch ~2.9–3.2).

### 3. Bar purpose — bartender's tip → Practice

The bar earns its place with a light, on-brand, **fully client-side** interaction
(no backend):

- Approaching the bar triggers the bartender to **speak a rotating strategy tip**
  in-world via the dealer rig `.say()` (same proximity pattern as the vestibule
  receptionist).
- A **`UI.barCard`** appears (new `anchor.kind === 'bar'`, wired in `platform.js`
  next to the cashier/practice branches) showing the tip text and a
  **"Try it in Practice →"** button that routes to the existing Practice zone
  (`stage.goTo('practice')`).
- Tips rotate each visit (basic strategy, odds facts). SVG/CSS only, **no emoji**.

## Files touched

| File | Change |
|------|--------|
| `src/floor/layout.js` | Update `ANCHOR_POSES.cashier`; add `ANCHOR_POSES.bar` |
| `src/floor/sections.js` | `ROWS.roulette.xs` shift+compress; `SIGN_X.roulette` |
| `src/floor/decor.js` | Rewrite `buildBar` (NW lounge + bartender + `bar` anchor + proximity tip); rewrite `buildCashier` (east-wall recessed cage + teller + chip vault); adjust plants/obstacles |
| `ui.js` | Add `barCard({ onPractice })` (SVG, no emoji) |
| `platform.js` | Add `anchor.kind === 'bar'` → show `barCard`; add `'bar'` to card-hide list |

## Build & mirror

The repo keeps **two mirrored trees**: `src/.../calculator/lobby-3d` (dev) and
`public/games/casino-game/lobby-3d` (production). The 3D engine (`src/*`) is inlined
into `index.html` by `build.mjs`; `ui.js` and `platform.js` load as separate modules.

Workflow: edit the **src** tree → `node build.mjs` (regenerates `index.html`) → copy
the **specific** changed files (`floor/*.js`, `ui.js`, `platform.js`, `index.html`)
to the **public** tree. Do **not** bulk-copy — the tree has unrelated uncommitted
changes (blackjack min-bet work) that must be left untouched.

## Verification

- `node --test tests/` in the src tree (`build.test.mjs` guards build integrity).
- Open `index.html` in the browser and confirm: cage at the east end dead-ahead;
  bar lounge on the north-left by the gate with the bartender; roulette shifted with
  no collisions or crowding; walking to the bar shows the tip + Practice button;
  cashier card still buys in / cashes out.

## Out of scope

- No backend/wallet changes. No new stake tiers. No changes to other games.
- Dealer GLB character work (separate spec) — this reuses the current `makeDealer`
  rig for the teller/bartender.
