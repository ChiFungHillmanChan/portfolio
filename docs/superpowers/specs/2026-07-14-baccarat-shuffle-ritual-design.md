# Baccarat Shoe Reset + Shuffle Ritual (3D Lobby Ambient Show)

**Date:** 2026-07-14
**Scope:** `portfolio/src/game/casino-game/calculator/lobby-3d/` (synced to `portfolio/public/games/casino-game/lobby-3d/`)

## Problem

The ambient baccarat show (`src/floor/baccarat-show.js`) deals real rounds but
never visibly resets: when the shoe runs low it silently swaps in a fresh
array mid-round, and the roads scoreboard never clears (it just rolls off
rounds past 80). Real baccarat: a yellow cut card comes out of the shoe →
the dealer finishes the round, then performs a shuffle ritual and the
electronic board wipes for the new shoe.

## Decisions (confirmed with user)

- **Cut depth: show-friendly.** Cut card at ~72–96 cards drawn (~12–15
  rounds ≈ 3 min of watching), not the realistic ~400 (which nobody would
  ever witness).
- **Ritual duration: ~90 s** condensed ceremony.
- **Walk-away: ritual runs to completion** once started (like a real
  casino). Rounds still only *start* while the player is near.
- **No persistence.** Fresh shoe every page load; everything is
  rAF-driven so a hidden/closed tab halts the show — both already true.

## Design

### Cut card logic
- `C.baccaratRoads.pickCutIndex(rng)` — pure, returns 72–96. Node-tested.
- Show keeps `cutIndex`; after each round, if `si >= cutIndex` the loop
  runs `runShuffle()` instead of the next round. The silent rebuild in
  `draw()` stays as a never-hit safety net.

### Ritual choreography (`runShuffle`, ~80–90 s)
1. **Cut card out (~5 s)** — dealer deals the yellow card from the shoe
   onto the felt, announces; scoreboard switches to a 洗牌中 SHUFFLING splash.
2. **Cards out (~8 s)** — 8 card "bricks" (deck-sized blocks; 416 real
   meshes would blow the frame budget) fly from shoe + discard tray to two
   piles on the felt.
3. **Wash (~24 s)** — dealer loops a two-arm `washCards` clip while the
   bricks swirl around the felt.
4. **Detailed riffle (~25 s)** — ~21 face-down card meshes (1/20 of the
   shoe) split into two packets and interleave one card at a time, ×3,
   synced to a `shuffleRiffle` clip.
5. **Rebuild (~10 s)** — bricks restack, yellow cut card inserted into the
   stack, stack slides into the shoe, first card burned face-up.
6. **Reset (~4 s)** — scoreboard wipes to an empty board (0 games), dealer
   nods 「新靴開始 New shoe」, fresh shoe + fresh `cutIndex`, dealing resumes.

### Components
- `src/logic/gestures.js` — new pure clips `washCards`, `shuffleRiffle`,
  `armsRest` (validated by the existing clip validator test).
- `src/logic/baccarat-roads.js` — `pickCutIndex`.
- `src/engine/cards.js` — `makeCutCard()` (plain yellow, card-sized).
- `src/floor/tables/baccarat-table.js` — scoreboard gains
  `resetRounds()` + `setShuffling(on)`; `drawBoardCanvas` renders cleanly
  with 0 rounds (guards the last-round panel).
- `src/floor/baccarat-show.js` — cut detection + `runShuffle`, with the
  same catch-with-backoff guard as `runRound`. Bricks and riffle cards use
  shared cached geometry/materials (remove-only cleanup); the cut card owns
  its resources (full dispose).

### Error handling
- `runShuffle` failures are caught with a 1.5 s backoff (no hot spin).
- Room switch mid-ritual: existing `roomGen` guards resolve rig/deal tweens
  immediately; a gen check between phases bails out and cleans up meshes.

## Testing
- `node --test tests/` — new `pickCutIndex` bounds test, gesture clips
  covered by the existing validate-all-clips test.
- Manual: temporarily force a tiny `cutIndex` in the browser to watch the
  full ritual, then verify normal pacing.
