# UTH — Strategy Coach, Card Reveal, Bet Visibility, Session Leaderboard

**Date:** 2026-07-10
**Status:** Implemented (autonomous session; requirements given fully by user)
**Builds on:** `2026-07-10-ultimate-texas-holdem-design.md`

## 1. What the user asked for

1. Teach **perfect strategy** (Wizard of Odds) inside the game.
2. State the **win rate when 6 players share their hands** (collusion analysis).
3. Let a player optionally **reveal their hole cards to the table in real time**
   by clicking their own cards; shared cards show an **eye icon**.
4. Every player can see the others' **bets and remaining buy-in**.
5. At the end of each hand, show a **group leaderboard** — who has won or
   lost the most this session.

## 2. The maths being taught (verified vs wizardofodds.com, 2026-07-10)

### Basic ("perfect practical") strategy

- **Pre-flop — raise 4x** with: any pair 3-3 or better · any Ace · any suited
  King · K-5 offsuit or better · Q-6 suited+ / Q-8 offsuit+ · J-8 suited /
  J-T offsuit. Otherwise **check** (never 3x).
- **Flop — raise 2x** with: two pair or better · a hidden pair (a pair using a
  hole card) except pocket 2-2 · four to a flush with a hole card T or higher
  of that suit. Otherwise check.
- **River — bet 1x** with: a hidden pair or better, **or** fewer than 21 of the
  45 unseen cards would, as a single dealer card + board, beat your hand
  ("dealer outs"). Otherwise **fold**.

House edge 2.185% of the Ante (optimal); this basic strategy ≈ 2.43%.
Element of risk ≈ 0.53% of total money bet. SD ≈ 4.94 antes.

### 6 players sharing hands (collusion)

Wizard of Odds simulation: knowing all 10 other hole cards at a 6-player table
and playing computer-perfect still **loses ≈ 0.64% of the Ante** — an actual
player edge only appears from ~16 known cards, impossible at a 6-max table.
(Eliot Jacobson's claimed +2.5% is disputed by the Wizard.) So the reveal
feature is social fun, not an exploit — we say so in the guide.

## 3. Design

### Strategy module — `lambda/uth/strategy.mjs` (tested) → client copy `js/core/strategy.js`

Pure functions over the existing `engine` evaluator (same sync-copy pattern as
`logic.mjs`; server never imports it, but the test harness lives in lambda/uth):

- `preflopAdvice(hole)` → `{ move: '4x'|'check', reason }`
- `flopAdvice(hole, flop3)` → `{ move: '2x'|'check', reason }`
- `riverAdvice(hole, board5)` → `{ move: '1x'|'fold', outs, reason }`
  - outs = count of the 45 unseen cards c where best-5-of-(board+c) beats
    the player's best-5-of-7. Bet on hidden pair OR outs < 21.

### Coach + guide (client only, `table-main.js`)

- **COACH toggle** (persisted `localStorage.uthCoach`) — when a decision is
  owed and the reveal sequencer has caught up, a hint strip above the action
  buttons shows the recommended move + one-line reason. Works in solo and
  online (uses only your own cards — nothing leaks).
- **Strategy guide overlay** — "STRATEGY" button in the table top bar and a
  lobby section: the 4x chart, flop/river rules, house-edge numbers, and the
  6-player card-sharing verdict.

### Card reveal (server-authoritative)

- `logic.mjs revealCards(table, dealerDoc, uid, now)`: legal during
  preflop/flop/river/showdown for a seat `inHand`; copies
  `dealerDoc.holes[uid]` into the public `seat.holeCards`, sets
  `seat.revealed = true`. One-way for the hand (like exposing cards on a real
  felt); cleared in `resetRound`/`newSeat`. A folded+revealed seat keeps its
  cards face-up at showdown.
- `index.mjs`: new action `reveal-cards` (needDealer). No rules change —
  the public table doc is already readable by all seated players.
- UI: your hole cards in the dock get a "show to table" affordance (tap card →
  confirm overlay → reveal). Once shared, an **eye badge** sits on the cards —
  yours and on every other player's revealed cards. Not offered on solo
  tables (nobody to show).

### Bet + stack visibility

Public seat data already carries `bets`, `playBet`, `stack`. Seat pills gain a
compact per-bet line — `A ante · P play · S sides` — replacing the single
"staked" total; stack (buy-in left) stays as-is.

### Session leaderboard

- `logic.mjs showdown()`: per seat accumulate `sessionNet += result.net`,
  `handsPlayed += 1`, `handsWon += net > 0` (undefined-safe so pre-deploy
  tables keep working).
- UI: at showdown (results shown), the dock renders a ranked list —
  👑 biggest winner on top, biggest loser flagged — name · net · won/played.
  Solo shows the same numbers as a one-line session summary.

## 4. Testing

- `strategy.test.mjs`: chart edge cases (2-2 check / 3-3 raise, K5o raise vs
  K4o check, Q6s vs Q7o, J8s vs J8o, JTo), flop rules (hidden pair vs board
  pair, pocket 2s exception, 4-flush hidden T rule), river outs counting on
  hand-constructed boards (known outs counts), hidden-pair river bets.
- `logic.test.mjs` additions: reveal in each phase, reveal illegal in betting,
  folded reveal persists at showdown, sessionNet/handsWon accumulation across
  two rounds, resetRound clears `revealed`.
- Manual: solo table in browser (coach + guide + summary), online round-trip
  via deployed Lambda.

## 5. Deploy

Lambda `cg-uth` lives in **ap-northeast-1** (Tokyo, colocated with Firestore
asia-east1). Frontend: sync `calculator/ultimate-texas-holdem/` →
`public/games/casino-game/ultimate-texas-holdem/`, PR to main (no direct push).

## 6. Out of scope

Seeing other players' un-revealed cards (never) · reveal-based strategy hints
(dead-card adjustments) · lifetime cross-table stats · chat.
