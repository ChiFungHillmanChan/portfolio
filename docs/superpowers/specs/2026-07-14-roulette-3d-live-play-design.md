# 3D Lobby — Live Roulette Play (2D game bridged into the 3D floor)

**Date:** 2026-07-14
**Depends on:** 2026-07-14-roulette-3d-table-uiux-design.md (spinnable wheel rig, live tote board, felt geometry)

## The flow

1. Standing at a roulette table (signed in), the sit-down card offers **"Play at this table"** instead of navigating away.
2. The camera glides to the player's side of that table and a **bottom-sheet iframe** opens running the REAL 2D roulette game (`roulette/index.html?stake=<key>&embed=3d`). Movement input is locked for the session.
3. Every chip placed in the 2D game **appears as a 3D chip stack on the printed felt** at the exact spot a dealer would place it (all bet types: straight/split/street/trio/corner/six-line/dozens/columns/even-money; racetrack call bets decompose into inside bets upstream, so they mirror for free).
4. On SPIN, the sheet slides away, the camera turns to the wheel, and the **real 3D wheel spins** — the ball orbits the bowl apron and drops into the exact winning pocket the game pre-decided.
5. The result is **appended to the table's tote board** (history column, hot/cold, percentages all recompute) and announced in a banner ("22 · Black · Even").
6. The game is told to reveal → it settles the shared server wallet, shows its result overlay, clears bets (which clears the 3D chips), and the camera returns with the sheet for the next round.
7. **Leave table** (or sign-out, or quicknav navigation) ends the session: sheet removed, 3D bets cleared, input unlocked, camera back to the aisle.

## Authority model

The 2D game keeps FULL authority: bets, RNG (`generateSpinData` decides the result BEFORE animating), wallet commit/settle. The lobby is a pure visualizer. No game logic is duplicated.

## Pieces

| Piece | File | Role |
|---|---|---|
| Embed bridge | `roulette/js/embed-3d.js` | No-op without `?embed=3d`. Patches the two funnel globals: `renderPlacedChips` (posts `bets` after every mutation incl. post-settle clear) and `animateWheelSpin` (posts `spin{result}`, holds SPINNING until the lobby's `reveal`, 12s safety timeout so a dead parent can't hang the wallet round). |
| Embed stylesheet | `roulette/css/embed-3d.css` | Scoped under `html.embed-3d` (class set by an inline head snippet before first paint): hides header/menus/wheel/stats — the 3D scene provides those. Wallet gate + stake picker stay. |
| Session module | `lobby-3d/roulette-live.js` | Owns the sheet DOM, postMessage bridge (same-origin checked both ways), camera poses (computed via `rig.localToWorld`), spin choreography, close/cleanup. Exported guards (`rouletteLiveActive`) keep proximity cards and quicknav from fighting the session. |
| Bet mapping | `lobby-3d/roulette-map.js` | Pure: 2D `getAllBets()` state → felt-local chip positions, parameterized by `C.floor.ROULETTE_FELT` (the exact constants the felt texture is printed with). `node --test tests/roulette-map.test.mjs` (11 tests). |
| Table rig | `src/floor/tables/roulette-table.js` | `group.userData.{spinTo, pushResult, setBets}`. Wheel split into static bowl + spinning rotor (v1 spin math: result-first, ball counter-rotates and parks at world angle 0). Tote board redraws its canvas on `pushResult`. Bet layer disposes chip textures on every update. |
| Engine | `src/engine/app.js` | `C.app.inputLocked` — walk/look/tap ignored during a session. |
| Wiring | `platform.js`, `ui.js` | Sit-down card `onPlay` for roulette tables (full-page link kept as secondary); session closed on sign-out and quicknav navigation. |

## Message protocol (same-origin only, both directions checked)

- game → lobby: `{source:'cg-roulette', type:'bets', bets, total}` · `{type:'spin', result}` · `{type:'ready'|'hello'}`
- lobby → game: `{source:'cg-lobby', type:'reveal'}`

## Tote board: real records only (added same day)

The board no longer fabricates history. It boots EMPTY (dim placeholder
slots, muted pennants, "NEW SESSION") and shows only real records:

- Feeds: live spins at this table (pushed when the 3D ball lands) AND the
  embedded game's **Skip 100** feature (each `recordSpinOnly` is forwarded as
  a `stat-spin` message by embed-3d.js — same records the 2D stats panel gets).
- Semantics mirror the 2D `stats-state.js` exactly, implemented in the pure,
  node-tested `roulette-map.js#boardStats`: hot = hit frequency
  (getHotNumbers), cold = spins since last hit with never-hit counting as the
  whole session (spinsSinceHit), percentages over all spins with zero in
  neither bucket. A SESSION SPINS counter shows the record size.
- Freshness: each sit-down resets the board (`setBoardStats(null)`); records
  linger after leaving and clear on the next entry — and every page load
  starts clean, matching the 2D game's ephemeral per-load stats.
- Engine board is a dumb display (`userData.setStats`), redraws coalesced
  (100 ms) so a Skip-100 burst paints a few frames, not a hundred.

## Known gap (future polish)

The lobby's wallet pill holds its own client; balance changes settled inside the iframe show up on its 30s refresh rather than instantly. Bridging `wallet:balance` events across would make it immediate.

## Verification

- 33/33 lobby tests (`node --test tests/*.test.mjs`), bundle builds clean.
- Browser e2e (console-driven bridge messages — byte-identical to what the game sends, contract verified against `handleSpinClick`): 10 bet types land on the correct printed cells; spin lands the ball on the requested pocket; board history/stats update (verified isolated per table); sheet/camera round-trip; leave-table cleanup; input lock/unlock.
- Embed page verified standalone: chrome stripped, gate intact, zero console errors.
- The full signed-in loop (Google auth + real wallet) needs a production-domain pass — localhost can't complete Google sign-in.
