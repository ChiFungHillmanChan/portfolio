# 3D Lobby — Roulette Table Realism (UI/UX) Design

**Date:** 2026-07-14
**Scope:** `portfolio/src/game/casino-game/calculator/lobby-3d/src/floor/tables/roulette-table.js` only (decorative floor prop — no gameplay logic). Built output re-synced to `portfolio/public/games/casino-game/lobby-3d/`.

User provided two references: a real dealer's-eye photo of a roulette table (wheel recessed in a bowl, chip bank between wheel and layout, racetrack printed by the wheel end) and a casino LED tote board (recent-numbers column, min/max header, HIGH/LOW/ODD/EVEN percentage arrows, HOT/COLD numbers, "PLACE YOUR BETS" footer).

## 1. Tote board (history / statistics display)

New `makeToteBoard(opts)` inside roulette-table.js. One per table (4 tables on the floor), placed at the wheel end beside the table, screen facing the aisle.

- Physical: dark casing (~0.62 m × 1.06 m portrait) on a black pole + base; total top ≈ 2.0 m.
- Screen: 512×896 canvas → `MeshBasicMaterial` (unlit, `fog:false`) so it reads as an LED panel, matching the neon-sign idiom in assets.js.
- Content (mirrors the reference board):
  - Left column: last 13 winning numbers, latest at top in a larger cell, red/black/green cell colors.
  - Header: "ROULETTE" + tier name; big min-bet figure; "MAXIMUM <max>" bar. Min/max parsed from the tier's real `limitsText` ("100 – 20,000") so each table's board shows its own limits.
  - HIGH / LOW / ODD / EVEN columns with percentage arrows.
  - HOT / COLD: 4 hot + 4 cold numbers.
  - Footer: green "PLACE YOUR BETS" bar.
- Data integrity: each board generates ~130 random spins at build time and computes ALL stats (history column, percentages, hot/cold) from that same history — numbers are self-consistent, and each table shows different data.

## 2. Felt layout: racetrack + dozens + columns

`makeFeltLayoutTexture()` rewritten (canvas 1280×640, built once and cached — the 4 tables share one texture):

- Left apron strip (~0.35 m of plain felt at the wheel end) — clear space for the chip bank (fix 3).
- Racetrack oval band along the dealer-side edge, ported from the 2D game's `render-racetrack.js`: same rotated EU wheel sequence (top/bottom rows + 4-number end curves), stadium center split TIER / ORPHELINS / VOISINS DU ZERO with gold dividers, same French-casino palette.
- Below it the betting grid: zero wedge, 12×3 number grid, "2 TO 1" column boxes at the grid's far end, then a dozens row (1st 12 / 2nd 12 / 3rd 12) and the even-money row (1-18 EVEN RED BLACK ODD 19-36) nearest the players.

## 3. Chip bank next to the wheel

The dealer rack + 4 denomination stacks move from the middle of the layout (was `(0.2, -0.56)`, sitting on the printed grid) to the plain apron between the wheel and the betting layout (`x ≈ -1.42`, long axis across the table) — matching the reference photo. The two ghost player-bet stacks stay on the grid but are repositioned to legal bet spots of the new layout.

## 4. Recessed wheel bowl

The wheel currently floats proud of a flat-topped cylinder (and the parked ball is buried inside the base cone — invisible). Fix:

- `LatheGeometry` rim on top of the bowl: outer wall rising to ~0.24 above the mount, rolling over into an inward-sloping ball apron that descends to just outside the number ring — the "small going down" so the wheel visibly sits inside and the ball can't escape.
- Parked ball moved onto a pocket at the ring surface (r 0.41, on top of the ring plane).
- Drop marker relocated onto the new rim.

## Non-goals

- No gameplay/spin logic (the hub is decorative; play happens in the 2D games).
- No changes to other tables, sections.js call signature, or the floor model.

## Verification

- `node --test` in lobby-3d (build + model tests).
- `node build.mjs`, serve, and visually inspect the roulette row in Chrome (screenshots) — check racetrack orientation (dealer side), board readability, wheel recess, no z-fighting.
- Sync `src/.../lobby-3d` → `public/games/casino-game/lobby-3d`.
