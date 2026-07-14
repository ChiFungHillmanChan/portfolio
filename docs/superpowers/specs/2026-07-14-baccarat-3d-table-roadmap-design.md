# 3D Lobby — Baccarat Table Realism + Roadmap Scoreboard Design

**Date:** 2026-07-14
**Scope:** `portfolio/src/game/casino-game/calculator/lobby-3d/` — decorative floor props only, no gameplay logic. Play still happens in the 2D games. Companion to the same-day roulette table realism spec (`2026-07-14-roulette-3d-table-uiux-design.md`) and follows its idioms (canvas-texture LED display, self-consistent simulated history, per-table different data).

User provided three references: a proper baccarat felt layout (dealer chip rack at the dealer edge, card-dealing area between the rack and the betting arcs, per-seat betting zones), an online mini-baccarat table graphic (6 seats, per-seat PLAYER/BANKER/TIE + pair circles, numbered commission row), and a photo of a real Macau bilingual baccarat display board (百家樂 BACCARAT: stats, 下局預告, current-round card panel, bead plate, big road, big eye boy, small road, cockroach pig).

## Decisions (with rationale)

- **Lobby prop upgrade only** — decorative, same treatment the roulette table received. No betting/dealing interactivity.
- **Macau full felt style** — chip rack, card area, commission boxes, TIE+pair circles, BANKER/PLAYER arcs, 6 numbered seats (richest authentic look; user picked over the simpler 8-seat arc).
- **Bilingual Macau board** — 庄/閒/和 characters throughout, faithful to the reference photo.
- **Pure logic module** (`baccarat-roads.js`) for shoe simulation + all road derivations, unit-tested with `node --test` — the derived-road rules are the most error-prone scoreboard logic in casino gaming and wrong output looks plausibly right. Module is DOM/THREE-free so the 2D trainer can adopt it later (explicitly out of scope now).

## 1. Felt layout (Macau full style)

`makeFeltTexture()` rewritten: **2048×1024 canvas, built once and module-cached** — the 4 floor tables share one texture (current code builds one per table). Base green `#0b5d3b`; the old three vertical PLAYER/TIE/BANKER band tints are removed. Zones from dealer edge (−Z / canvas top) to player edge (+Z / canvas bottom):

1. **Dealer strip** — plain felt with a painted gold outline marking the chip-rack footprint (the physical rack prop sits on it).
2. **Card-dealing area** (center) — two painted boxes: `閒 PLAYER` (yellow border, left, matching player x<0 in layouts) and `庄 BANKER` (red border, right), gold divider between them. Card meshes lie here — between the chip rack and the betting arcs, per the user's reference.
3. **Commission-box row** — an arc of 6 numbered boxes `1…6` with a small circle each (dealer's 5% commission markers).
4. **Betting arcs** — three concentric arcs split into 6 sectors by white radial divider lines. Inside → out (Image #1 order):
   - **TIE arc**: green `和 TIE 8:1` boxes; each flanked by two small circles — `庄對` BANKER PAIR (red) and `閒對` PLAYER PAIR (yellow), labelled `11:1`.
   - **BANKER arc**: red `庄 BANKER` outlined boxes.
   - **PLAYER arc**: yellow `閒 PLAYER` outlined boxes.
   - **Seat numbers** `1–6` painted large on the outer rim, seat 1 at the right (viewed from the player side).
5. **Gold ellipse border ring** kept from the current version.

Arc text is rotated per sector so it reads toward the seated player. Payout text stays small; the arc labels are the readability priority from lobby camera height.

## 2. 3D props on the table

- **Chip rack** (new prop): dark tray ~0.72 × 0.05 × 0.26 with gold rails and dividers, filled with 6–8 `C.chips.makeChipStack` stacks, centered on the dealer strip.
- **Shoe**: kept, repositioned beside the rack. **Discard holder** (new): small dark tray on the rack's other side.
- **Cards on the felt**: the *actual last round* from the table's simulated shoe — 2–3 player cards on the PLAYER box, 2–3 banker cards on the BANKER box, third card laid sideways (`rotation.z = ±π/2`), faces rendered with `C.cards.makeCard(card)`. These are the same cards the scoreboard's gold panel shows, and the round's outcome matches the newest big-road cell.
- **Ghost seats**: 6 stools aligned to the 6 felt sectors; 3–4 randomly "occupied" seats get a chip stack placed on that seat's painted PLAYER/BANKER/TIE box. The current floating face-down card per seat is **removed** (players never hold cards in mini-baccarat).
- `C.layouts.baccarat` playerSlots/bankerSlots/spots updated to the new painted zones so bet-spot decals land on printed boxes.
- Plaque, glow pad, dealer figure (`withDealer`) unchanged. `userData.radius` bumped 2.3 → 2.4 to cover the new board.

## 3. Scoreboard display (百家樂 roadmap board)

`makeScoreBoard(opts)` in baccarat-table.js, one per table:

- **Physical**: landscape LED panel — dark casing ~1.16 m wide × 0.92 m tall on a black pole + base, screen top ≈ 2.0 m. Placed at the table end opposite the plaque (x ≈ −2.35), rotated to face the aisle.
- **Screen**: 1024×800 canvas → `MeshBasicMaterial` (unlit, `fog: false`), the LED idiom shared with the roulette tote board.
- **Content** (faithful to the reference photo):

| Zone | Content |
|---|---|
| Top-left | 百家樂 **BACCARAT** gold-serif title on dark-red gradient banner |
| Top-middle | Stats rows: `庄 BANKER n` (red bead), `閒 PLAYER n` (blue), `和 TIE n` (green), `庄對 BANKER PAIR n`, `閒對 PLAYER PAIR n`, `例牌 NATURAL n`, `局數 GAME NUMBER n` |
| Top-right | **下局預告** panel: 庄/閒 header buttons; under each, the three symbols Big Eye Boy / Small Road / Cockroach Pig would print if the next result were Banker vs Player — computed by running the real derivation one step ahead |
| Mid-left | **珠盤路 bead plate** — 6 rows × 12 columns, filled circles with the character inside (red 庄 / blue 閒 / green 和); pair markers as small corner dots (red top-left = banker pair, blue bottom-right = player pair) |
| Mid-right | Gold **閒 PLAYER ｜ 庄 BANKER** panel with the current round's mini card faces (third card sideways) |
| Wide band | **大路 big road** — 6 rows × 26 columns, hollow red/blue rings; ties as green slashes on the previous ring with a count digit when >1; dragon-tail wrap |
| Band below | **大眼仔 big eye boy** — 6 rows, half-width hollow red/blue rings |
| Bottom-left | **小路 small road** — solid red/blue dots |
| Bottom-right | **曱甴路 cockroach pig** — red/blue diagonal slashes |
| Footer | Bilingual disclaimer strip: 路盤所顯示之資料，只供參考，如有錯漏，本公司概不負責。 / "Results displayed are provided as a service only…" |

Fonts: system CJK stack (`'PingFang TC', 'Microsoft JhengHei', 'Noto Sans TC', sans-serif`) — glyphs render on all target platforms without bundling a font. Each of the 4 tables simulates its own shoe, so every board differs but is internally consistent.

Grids that overflow keep the **most recent** columns (scroll-left behavior, like real boards).

## 4. Logic module — `src/logic/baccarat-roads.js`

Pure, dependency-free (no THREE/DOM/globals beyond the `CASINO` namespace registration). API:

```js
C.baccaratRoads = {
  simulateShoe(rng),            // → rounds[]
  buildBigRoad(rounds),         // → { cells: [{col,row,outcome,ties}], colDepths: [] }
  deriveRoad(bigRoad, offset),  // offset 1|2|3 → placed red/blue cells on a 6-row grid
  beadPlate(rounds, cols),      // → grid cells
  stats(rounds),                // → { banker, player, tie, bPair, pPair, natural, games }
  predictNext(bigRoad),         // → { banker: [beb, small, roach], player: [...] }
};
```

### 4a. Shoe simulation

- 8 shuffled decks, cut card 14 cards from the end (~60–75 rounds/shoe).
- Real tableau per round: both sides get 2 cards; natural 8/9 ends the round. Player draws on 0–5, stands 6–7. Banker third card follows the full dependency table keyed on the Player's third card (3: draws unless P3rd = 8; 4: draws vs P3rd 2–7; 5: draws vs P3rd 4–7; 6: draws vs P3rd 6–7; 0–2 always draw; 7 stands; if Player stood, Banker draws on 0–5).
- Round record: `outcome 'B'|'P'|'T'`, `playerCards[]`, `bankerCards[]` (rank+suit), totals, `playerPair`/`bankerPair` (first two cards same rank), `natural`.
- `rng` injected (defaults to `Math.random` at the call site) so tests can seed deterministic shoes.

### 4b. Big road

- New column on B/P outcome change; same outcome stacks down.
- Ties never occupy a cell — they increment `ties` on the previous cell; leading ties (before any B/P) are held and attached to the first cell.
- Dragon tail: stacking past row 6, or into an occupied cell, turns right along the current row. The module also records each column's **logical depth** (unwrapped stack length) because derived roads compare logical lengths, not wrapped display positions. Display wrapping is render-time only.

### 4c. Derived roads (offset 1 = big eye boy, 2 = small road, 3 = cockroach pig)

For each big-road entry at logical (col `c`, row `r`), once the road has started (big road reaches column `offset+1` row 0 or column `offset` row 1, 0-indexed):

- **`r === 0`**: compare logical depths of columns `c−1` and `c−1−offset` → equal = red, different = blue.
- **`r ≥ 1`**: inspect column `c−offset` — entry at row `r` → red; column ends exactly at row `r−1` → blue; column ended before `r−1` → red.

The resulting red/blue sequence is placed on its own 6-row grid with the same column-change + dragon-tail rules as the big road (color change = new column).

### 4d. Prediction (下局預告)

Append a hypothetical Banker result to a copy of the big road and compute the next symbol for each offset; repeat for Player. Returns the 2×3 symbol matrix the panel draws. Must agree with what `deriveRoad` produces when that outcome actually lands (tested).

## 5. Files touched

| File | Change |
|---|---|
| `lobby-3d/src/logic/baccarat-roads.js` | New — module above |
| `lobby-3d/tests/baccarat-roads.test.mjs` | New — unit tests |
| `lobby-3d/src/floor/tables/baccarat-table.js` | Felt rewrite, chip rack + discard tray, 6 ghost seats, last-round cards, `makeScoreBoard()` |
| `lobby-3d/src/logic/layouts.js` | `baccarat` slots/spots moved to the new painted zones |
| `lobby-3d/index.html` + `build.mjs` script list | Add `baccarat-roads.js` — **shared with the in-flight roulette session; re-check file state immediately before editing and add only that line** |

## 6. Verification

1. `node --test` in lobby-3d — new road tests plus existing build/model/layout tests all pass. Road fixtures include hand-worked sequences with documented expected big-eye-boy/small/cockroach output, tie-handling edge cases, dragon-tail collisions, and every Banker third-card branch.
2. `node build.mjs`, serve, inspect the baccarat row in Chrome (screenshots): felt zones readable from lobby camera height, board legible from the aisle, CJK glyphs render, felt cards match the board's card panel and newest big-road cell, no z-fighting, no console errors.
3. Sync `src/.../lobby-3d` → `public/games/casino-game/lobby-3d/` only after confirming the parallel roulette session's changes are committed (the bundle includes both tables); otherwise flag and wait.

## Non-goals

- No gameplay, betting, or wallet integration (hub stays decorative; play is in the 2D games).
- No 2D baccarat trainer changes — `baccarat-roads.js` is written to be adoptable there later as a separate task.
- No changes to other tables, `sections.js` call signature, or the floor model.
