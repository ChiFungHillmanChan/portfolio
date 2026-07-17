# Card Drawer v2 — Design Spec

**Date:** 2026-07-17
**Status:** Approved for planning
**Baseline:** Card Drawer as shipped 2026-07-14 (spec `2026-07-13-card-drawer-design.md`)
**Live at:** `card-drawer.hillmanchan.com`

## 1. Summary

Three changes to the existing pass-and-play Card Drawer:

1. **Blind face-down pick** replaces the face-up manual card grid.
2. **Ranked hand row** — each player's cards display sorted, best-5 first and
   highlighted, instead of draw-order.
3. **Leaderboard outs** — every non-leader row shows how many cards left in the
   deck would put that player strictly ahead of the current leader.

Everything else (setup screen, random deal, jokers-wild evaluation, undo, reset,
resume, no-backend architecture) is unchanged.

## 2. Feature 1 — Blind face-down pick

**Behavior**

- The draw-mode toggle keeps two buttons, relabeled **Random | Pick**. The
  stored value stays `drawMode: 'manual'` — no `localStorage` schema change, so
  in-progress saves resume without migration.
- Tapping "Pick for [player]" opens the existing bottom sheet, now showing
  **only the remaining cards, all face-down** (card backs) in a grid. No suit
  sections, no dimmed taken cards — the grid simply shrinks as the deck does.
- Sheet header: "Pick a card for [player]" with subline "N face-down cards —
  tap one".
- Tapping slot *i* takes `deck[i]` (splice), assigns it to the player, closes
  the sheet, and reveals the card in the player's hand with the existing flip
  animation (the `justDrawn` flip, not the `pop`).

**Why `deck[i]`, not a re-roll:** the deck is already Fisher–Yates shuffled at
start, so position *i* is uniformly random. The card you touch is the card you
get — honest, and undo (push back onto the deck) keeps working unmodified.

**Removals:** the face-up `pickButton()` grid, suit section headers, and the
"drawn cards are dimmed" sheet copy. `renderCardSVG`'s `dimmed` option stays in
`card-svg.js` (pure, tested) even though the game no longer calls it; spare-card
dimming in the ranked row is done with CSS on the wrapper, not the SVG option.

## 3. Feature 2 — Ranked hand row (best 5 first)

**`hand-eval.js` contract change (additive)**

`evaluateHand(cards)` returns `{ category, score, name, bestFive }` where
`bestFive` is an array of the **actual card objects from the pile** (same
references) forming the best 5-card hand, ordered by score priority (e.g. Full
House Kings over 9s → `[K, K, K, 9, 9]`). With fewer than 5 cards, `bestFive`
is every card, best-first. Jokers used as wilds appear in `bestFive` **as the
joker cards themselves**.

**Implementation**

- `evaluatePlain` gains selection tracking: every category branch also picks
  the concrete cards it used (quads = the four + top kicker; flush = top 5 of
  the winning suit; straight = one card per run rank, ace counts low for the
  wheel; etc.).
- The wild brute-force loop stays **score-only** for speed. After it finds the
  winning wild assignment, one final selection pass runs on
  `naturals + winningExtras`; each selected synthetic extra is mapped back to
  the joker it stands for. (Post-hoc subset search — O(C(54,5)) ≈ 3.2M — was
  rejected.)

**Player panel rendering**

- One row, sorted: `bestFive` first with a highlight treatment (lift + accent
  ring), then the leftover cards sorted by rank descending (suit order for
  ties), slightly smaller and dimmed.
- The row re-sorts automatically after every draw and undo; flip/pop animations
  key off card id, so the new card animates wherever it lands in the order.
- The existing hand-name label stays under the row.

## 4. Feature 3 — Leaderboard outs

**Definition:** for each player **not ranked #1**, count cards still in the
deck that — added to that player's pile as one more card — make their hand
**strictly beat** the current leader's hand (leader's hand as it stands now).

- New exported pure function in `hand-eval.js`:
  `countOuts(playerCards, leaderScore, deck) → number`.
- Leaderboard row (non-leaders only) gains a small line under the hand label:
  - `"12 cards can take the lead"` (count ≥ 1)
  - `"No single card takes the lead"` (count 0)
- Rank-1 entries (leader and anyone tied with them) show no outs line.
- Line omitted entirely when the deck is empty or when nobody has cards yet
  (no leader hand to beat).

**Cost:** ≤ 54 `evaluateHand` calls per non-leader per state change. Only a
player holding both jokers is expensive (~54 × 2 704 plain evals ≈ 0.3 s worst
case). Computed inside `rankedEntries()` on render — render only runs on state
change, never per frame. No web worker, no caching layer.

## 5. Files touched

All inside `portfolio/public/games/card-drawer/` (the live source — the React
iframe wrapper in `portfolio/src/game/card-drawer/` is untouched):

| File | Change |
|------|--------|
| `hand-eval.js` | `bestFive` selection tracking; `countOuts()` |
| `game.js` | face-down sheet; ranked hand row; outs line; toggle label |
| `styles.css` | face-down grid, best-five highlight, spare-card dimming, outs line |
| `hand-eval.test.js` | `bestFive` per category + joker mapping; `countOuts` cases |

`card-svg.js`, `card-svg.test.js`, `index.html`, `package.json`: unchanged.

## 6. Edge cases

- **Undo after blind pick:** card returns to the deck (existing behavior); the
  face-down grid regains a slot.
- **Deck empty:** Pick button disabled (existing "Deck empty" state); outs line
  omitted.
- **< 5 cards held:** whole pile renders in the highlighted group; no spares.
- **Ties at rank 1:** all tied entries are leader-styled, none show outs.
- **0-card players:** still sort last; their outs are computed normally (a
  single drawn card vs. the leader's hand — usually 0).
- **Saved games:** state shape is identical; v1 saves resume in v2 without
  migration.

## 7. Verification (done = works for a user)

- `node --test portfolio/public/games/card-drawer/hand-eval.test.js` — existing
  suite still green; new cases: `bestFive` for every category, wheel + joker
  mapping (`{A,2,3,4,Joker}` → bestFive contains the joker), `countOuts`
  (known-answer cases incl. 0-outs, joker candidate card, empty deck).
- `node --test portfolio/public/games/card-drawer/card-svg.test.js` — untouched
  but re-run.
- Real-browser drive: both modes, blind pick with jokers, undo after blind
  pick, resume of a v1 save, leaderboard outs update after every draw — no
  console errors.

## 8. Out of scope

- Showing *which* cards would take the lead (count only).
- Any change to the random-deal flow, setup screen, or persistence schema.
- Web-worker/async evaluation.
