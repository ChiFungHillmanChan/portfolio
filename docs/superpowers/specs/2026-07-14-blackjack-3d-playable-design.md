# Blackjack 3D Playable Table — Design

**Date:** 2026-07-14
**Status:** Approved (user)
**Depends on:** 3D Lobby v2 (`2026-07-13-3d-lobby-v2-design.md`), casino lobby credits (`2026-07-12-casino-lobby-credits-design.md`), blackjack stake tiers (`2026-07-13-blackjack-stake-tiers-design.md`)

## Goal

Make the four blackjack tables on the 3D casino floor **playable in 3D**: sit at a
seat, bet on a 2D board that mirrors real 3D chips on the felt, watch a real
European-style deal with casino-accurate card placement, act (hit / stand /
double / split), and get paid with chips animating between the dealer's chip
station and your bet spots. Bets and payouts use the **real shared chip wallet**
(server-authoritative `casinoWallet` via `wallet-bet` / `wallet-payout`) — the
same balance as every 2D game.

This supersedes the "all play stays in the 2D pages" scope line of the 3D Lobby
v2 design **for blackjack only**. Other games keep deep-linking to their 2D pages.

## Player experience

1. **Sit.** Near a blackjack table, the existing sit-down card appears. Its
   primary button becomes **"Sit & play"**; a secondary link **"Open 2D table"**
   keeps the old deep-link (`../blackjack/game-mode/index.html?stake=<key>`).
   Sit & play glides the camera to a first-person pose at the **nearest free
   seat** (seats 0, 2, 3, 5 — ghosts keep 1 and 4) and opens the betting board.
   The floor is already login-gated, so a seated player is always signed in.
2. **Bet.** Bottom-panel betting board: MAIN, PP, 21+3 circles, a chip rack
   (denominations from the tier's chip list), UNDO / CLEAR / DEAL, and a live
   total validated against the tier limits from `table-config.js`
   (`blackjack-micro` 50–1,000 · `blackjack-mini` 100–2,500 · `blackjack`
   500–10,000 · `blackjack-high` 1,000–20,000; sides 100–2,500). Every board
   click adds/removes a real 3D chip on the corresponding felt spot at the
   player's seat — one shared denomination history drives both, so they can
   never drift apart (prototype `makeOverlay` + `createBetStacks` pattern).
3. **Deal (European, no hole card).** DEAL debits the full stake up front via
   `walletClient.bet(gameId, bets)` (opens the server round). Camera moves to a
   deal pose. Deal order: **player card 1 → dealer up-card → player card 2**.
   The dealer has **no hole card**; they draw the rest of their hand only after
   the player finishes.
4. **Act.**
   - **HIT** — new card flies from the shoe onto the **top** of the player's
     stack. Repeatable until bust or stand.
   - **STAND** — ends the hand.
   - **DOUBLE** — only on a 2-card unsplit hand; `walletClient.topUp` debits an
     equal main bet, then exactly one card lands **sideways (rotated 90°)** on
     top: the visual signature for "last card".
   - **SPLIT** — only on a 2-card pair (10/J/Q/K all count as tens, same as 2D);
     `topUp` debits a second main bet; the stack splits into **left and right
     hands**, played left-to-right in turn. **Max one split (2 hands), no
     double-after-split, split aces may be hit** — mirrors the 2D rules (except
     the 2D 7-hand re-split cap, reduced to 2 for 3D space).
   - Bust ends the hand immediately.
5. **Dealer play.** After all player hands finish (skip if every hand busted):
   dealer draws to their **horizontal row**, one card at a time, **standing on
   all 17s (S17)** — same as 2D.
6. **Settle.** Per-hand main returns (win 2×, push 1×, blackjack 3:2 — a
   2-card 21 on an unsplit hand only), plus PP / 21+3 side returns using the 2D
   paytables (PP 25/12/6:1; 21+3 100/40/30/10/5:1), evaluated from the initial
   deal. One `walletClient.payout(gameId, grossReturn)` credits the wallet
   (server caps at Σ amount × maxReturn; send `payout(gameId, 0)` when the
   gross return is zero so the round closes server-side).
7. **Chip animation.** Purely visual, intentionally approximate
   (`chipBreakdown`, capped stack sizes):
   - **Win:** chips fly **from the dealer chip-station tray** to the bet spot,
     then the whole pile slides off toward the player.
   - **Lose:** the bet chips fly from the spot **into the tray**.
   - **Push:** chips slide back to the player unchanged.
8. **Repeat / leave.** A result banner shows; meshes are cleaned up; the board
   pops back up with the refreshed balance for the next round. **Leave seat**
   (button, or movement input while un-dealt) returns the camera to the floor
   pose and hides the board. Leaving mid-round is blocked by the UI; closing
   the tab mid-round forfeits the wager (identical to the 2D debit-at-bet
   model — `walletClient` persists the open round for reconciliation on next
   load).

## Card placement language

- **Player hand:** vertical overlapping stack anchored at the seat's card zone
  (radius ≈ 1.02 on the seat's radial line, from the felt redesign). Each new
  card offsets **toward the dealer** (radially inward) by ~0.06 and +0.003 in y,
  newest card physically on top; the previous card's bottom-right jumbo index
  stays visible. Small per-card rotation jitter for a hand-dealt look.
- **Double card:** same stack, rotated 90° in the felt plane.
- **Split hands:** two stacks at tangential offsets (≈ ±0.14) from the seat's
  radial line; the active hand gets a subtle highlight decal; each hand has its
  own main-bet chip stack under it (original + the top-up).
- **Dealer hand:** horizontal row at the dealer card boxes, growing to the
  right by ~0.17 per card (existing `dealerSlots` + fan), all face up.
- Cards fly from the **shoe** position with the existing `dealCardTo` tween;
  the dealer mesh's `dealGesture` / `lookToward` hooks fire per card when the
  table has a dealer figure.

## Rules summary

| Rule | Value |
|---|---|
| Deal | European: P1, dealer up-card, P2; no hole card, no peek, no insurance |
| Dealer | Stands on all 17 (S17) |
| Blackjack | Pays 3:2, unsplit 2-card 21 only. Player BJ skips actions; dealer still completes their hand — a dealer 2-card 21 pushes, anything else pays 3:2 (matches 2D settle) |
| Double | 2-card unsplit hand, one card, equal top-up |
| Split | Equal-value pair, once (2 hands max), no DAS, aces hittable |
| Side bets | PP + 21+3 only (felt spots); resolved from initial deal |
| Surrender / Top3 | Not offered |

## Wallet integration

- `gameId` = the table's stake key (`blackjack-micro`, `blackjack-mini`,
  `blackjack`, `blackjack-high`) — identical to the 2D game's, so server
  betType limits, `mergeFactor` top-ups, and `maxReturn` caps all apply as-is.
- Engine never touches Firebase: `platform.js` (which owns `walletClient`)
  passes a session adapter `{ bet, topUp, payout, getBalance, subscribe }`
  into the round controller.
- **Failure handling:** `bet` rejection (network / `insufficient` /
  `too-fast`) → board error line, no cards dealt, bets stay placed. `topUp`
  rejection → banner, the double/split silently downgrades to a plain hit/stand
  continuation (no extra card commitment happened). `payout` rejection → one
  retry, then a warning banner (balance reconciles on next `wallet-get`, same
  recovery posture as 2D).

## Architecture

```
lobby-3d/
├── src/logic/outcomes.js        ← ported from prototype-3d: makeShoe, handValue,
│                                   dealerPlay(S17), per-hand settle, PP/21+3 returns
│                                   (extended: settleHands for double/split)
├── src/engine/cards.js          ← + dealCardTo, flipFlatCard (ported tweens)
├── src/engine/chips3d.js        ← + createBetStacks (adapted: per-seat spot
│                                   positions, source = player side, dealer = tray)
├── src/play/blackjack-round.js  ← NEW: betting board DOM, round state machine,
│                                   card layout math, action buttons, settlement
│                                   choreography. Exposes C.play.blackjack
│                                   .sit({table, seatIndex, session, onLeave})
├── src/style.css                ← board / action / banner styles
├── src/floor/tables/blackjack-table.js ← exposes per-seat anchor math + tray
│                                   position via group.userData for the controller
├── platform.js                  ← session adapter; sit-down card wiring
├── ui.js                        ← sitdownCard: "Sit & play" primary + 2D link
└── floor-model.js               ← blackjack tables gain playable3d: true
```

The round controller is engine-side (inlined by `build.mjs`, no imports);
platform passes wallet + table config in, receives `onRoundEnd` /
`onLeave` events out — same handshake style as `C.boot.start`.

## Testing

- `tests/outcomes.test.mjs` (ported + extended): shoe integrity, hand values,
  S17 dealer, European settle matrix (win/lose/push/BJ), double/split
  settlement, PP / 21+3 paytables vs the 2D `side-bets.js` numbers.
- `tests/blackjack-play.test.mjs` (new): card layout math (stack offsets stay
  on the felt for 7 hits at every seat; split stacks don't collide with
  neighbouring seats), betting-board validation against every tier's limits,
  round state machine transitions (bet → deal → act → dealer → settle → bet),
  session-adapter failure paths (bet reject keeps board open, payout retry).
- Existing 21 tests must stay green; `node build.mjs` must inline the new file
  (add to `SRC_ORDER`).
- Manual visual QA in Chrome with `?cam=` poses at each tier table.

## Out of scope

- Insurance, surrender, Top3, re-splits beyond 2 hands.
- Multi-seat / multi-hand betting (one seat, the seat you sit at).
- Playable 3D roulette / baccarat / UTH (still deep-link to 2D).
- Ghost players acting in the round (they stay decorative).
- Mobile-specific board layout beyond the existing responsive overlay styles.
