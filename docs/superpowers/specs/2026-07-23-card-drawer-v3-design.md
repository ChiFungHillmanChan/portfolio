# Card Drawer v3 — Effects Mode, Tile-Grid Board, Pre-Game Draw Mode

**Date:** 2026-07-23
**Status:** Approved (brainstorm with visual companion; user selected tile grid + rank-grid config)
**Code:** `portfolio/public/games/card-drawer/`

## Goals

1. **Custom card effects**: an optional game mode where ranks carry special abilities
   (e.g. 2 = destroy an opponent's card, 7 = extra draw, J = burn a deck card).
2. **No scrolling in play**: replace the vertical panel stack with a tile grid so all
   players (up to 10) are visible on one phone screen.
3. **Draw mode is a pre-game setting**: move the Random/Pick toggle from the in-game
   dealer bar to the setup screen; locked during play.

Non-goals: turn enforcement (the table self-organizes, as today), networked play,
win/end-screen changes, new art assets.

## 1. Setup screen

Section order: **Players** (unchanged) → **Draw mode** → **Deck** → **Card effects** → Start game.

- **Draw mode**: Random / Pick segmented control. Persisted like the joker toggle.
  Not changeable in-game; Reset returns to setup where it can be changed.
- **Card effects**: master toggle, **off by default**. When on, a grid of 13 rank chips
  (2–A; jokers never carry effects — they are already wild in hand-eval) shows the
  current mapping. Ranks with an effect are highlighted and dotted with the effect's
  color. Tapping a chip opens an inline picker: **None + the 6 effects**, each with a
  one-line description. Selecting closes the picker and updates the chip.
- **Default preset** (loaded the first time effects are enabled):
  `2 = Sabotage, 7 = Bonus draw, J = Deck burn`, all other ranks None.
- The whole effects config (`effectsEnabled` + `effectMap`) persists in localStorage
  across games and resets, like the joker toggle.

## 2. Effects engine

All effects **auto-trigger on draw**, in both Random and Pick modes. The drawn card
**always stays in the drawer's hand** and counts toward their poker hand.

| Effect | Resolution |
|---|---|
| Sabotage | Drawer picks an opponent; a **random** card from that hand is destroyed (→ graveyard) |
| Bonus draw | Drawer immediately draws one more card from the deck |
| Deck burn | A **random** deck card is revealed face-up, then destroyed (→ graveyard) |
| Steal | Drawer picks an opponent; a **random** card from that hand moves to the drawer's hand |
| Swap hands | Drawer picks an opponent; the two hands trade completely |
| Shield | Drawer gains a shield; the **next** Sabotage/Steal/Swap targeting them is absorbed and the shield breaks. Non-stacking: gaining a shield while shielded does nothing |

Rules:

- **Only deck draws trigger effects.** Cards acquired via Steal or Swap, and cards
  destroyed by Sabotage or Deck burn, never fire their effects. The extra card from
  Bonus draw IS a deck draw, so **chains resolve recursively** (7 → 7 → 2 is possible);
  bounded by deck contents.
- **Targeting overlay**: lists opponents with card counts and shield markers.
  Shielded opponents are targetable; the shield absorbs the effect (attacker's card
  still stays in their hand — only the effect fizzles, and the shield breaks).
- **Fizzle cases** (effect completes as a no-op with a short note in the resolution
  overlay): Sabotage/Steal/Swap with no opponent holding cards; Bonus draw / Deck burn
  with an empty deck.
- **Destroyed cards are gone for the rest of the game** (graveyard, never reshuffled).
  Dealer bar shows `N left · M burned` when M > 0.
- `countOuts` (leaderboard "outs" hints) keeps reading the live deck, so burns and
  bonus draws are automatically reflected.
- Every resolution reuses the existing reveal-overlay pattern (flip → result → Done):
  the drawn card first, then one overlay step per effect consequence (e.g. Sabotage
  shows the destroyed card face-up with victim name; Deck burn shows the burned card).
  Chained draws queue additional reveal steps.

## 3. Game board — tile grid

- **Dealer bar** (slimmer): deck stack + `N left · M burned`, Undo, Reset. No mode toggle.
- **Player tiles** in a CSS grid: 2 columns on phones, wider screens may use 3–4
  (`auto-fit, minmax`). **Seat order, never re-sorts.**
- Tile contents: rank badge (gold + crown for the leader), player name, mini-fan of
  best cards (overlapping, smaller than today's), hand name, outs hint (when ranked
  2+ and deck non-empty), shield marker when shielded, Deal/Pick button.
- The separate **leaderboard section is deleted** — rank badges replace it. Tie ranks
  match today's semantics (stable, ties share rank).
- Tapping a tile's fan opens the existing full-screen viewer (unchanged).
- Tiles grow with fewer players (grid rows share the viewport height); 10 players
  = 2×5 within one phone viewport. The board must fit `100dvh` without vertical
  scroll during play.

## 4. State, undo, persistence

New state shape (storage key bumps to `card-drawer:v2`):

```js
{
  phase: 'setup' | 'playing',
  includeJokers: boolean,
  drawMode: 'random' | 'manual',
  effectsEnabled: boolean,
  effectMap: { [rankLabel]: 'sabotage'|'bonus'|'burn'|'steal'|'swap'|'shield' }, // absent = none
  players: [{ id, name, cards, shield: boolean }],
  deck: [],
  graveyard: [],
  history: [ActionRecord],
}
```

- **Typed history**: one draw + its complete effect resolution (including chained
  bonus draws) is **one atomic ActionRecord** capturing exactly which cards moved
  where (drawn card, victim id, destroyed/stolen card ids, swap membership, shield
  gained/broken). Undo replays the record in reverse deterministically — random
  choices were already materialized, so nothing re-randomizes.
- **Migration**: a `card-drawer:v1` save (old key) is read once and, if valid,
  loaded as a v2 state with effects off, empty graveyard, no shields; the legacy
  draw history maps to simple draw records. Invalid saves are discarded as today.
- `normalizeState` extends the card-integrity check: every card in the universe
  must appear in **exactly one** of deck / a hand / graveyard (when playing), and
  `effectMap` values must be known effect ids on real ranks.

## 5. Code shape & testing

- New pure module **`effects.js`**: given state snapshots, computes resolution
  results — effect lookup, target legality, shield application, fizzle detection,
  the materialized ActionRecord, and `undoAction(state, actionRecord)` reversal.
  `game.js` applies the results to its state (same mutate-then-render style as
  today). No DOM in `effects.js`. Tested by **`effects.test.js`**
  (`node --test`, same pattern as `hand-eval.test.js`).
- `game.js` wires UI only: setup sections, rank-chip picker, tile grid, targeting
  overlay, reveal queue, dealer bar.
- `hand-eval.js`, `card-svg.js` untouched.
- Test coverage: each effect happy path; shield absorb + break + non-stack; chain
  resolution (7→7→2); all fizzle cases; atomic undo of a chained, multi-victim
  record; v1→v2 migration; normalizeState rejection of duplicated/missing cards
  including graveyard.
- **Ship checklist**: bump `CACHE` version in `sw.js` (PWA rule — required for the
  update to reach installed clients); sync build to the card-drawer subdomain;
  no new binary assets.

## Design decisions log

- Effects config: per-rank mapping with default preset (not preset-only, not free-form).
- Trigger: auto on draw (not optional, not hold-for-later).
- Card fate: stays in hand (no discard-on-use).
- Destroy targeting: attacker picks the player, the card is random.
- Effect menu: 6 effects (user's 3 + Steal, Swap hands, Shield).
- Board: tile grid (chosen over roster rows and shrunken panels).
- Effects config UI: rank-chip grid (chosen over effect-first list).
- No turn order exists, so all effects are turn-agnostic.
