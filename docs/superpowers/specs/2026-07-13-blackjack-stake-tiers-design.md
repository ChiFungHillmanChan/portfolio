# Blackjack game-mode → wallet, with stake tiers (Micro / Mini / Std / High)

Date: 2026-07-13
Branch: `feat/casino-lobby-credits` (frontend) + `feat/casino-wallet` (backend, system-architecture)
Supersedes the "Plan 4" bullet in the casino-lobby-credits project (single blackjack table).

## Goal

Convert `blackjack/game-mode/` from its local `bankroll` buy-in into the shared
casino wallet (same two-phase debit→payout model as roulette + baccarat), AND
offer four stake tiers like a real casino so low-balance players can still play.

## Why tiers

The wallet bust-reset only fires server-side at balance `< 100`, but the
original blackjack table's main min is 500. A balance of 100–499 could neither
deal (no affordable main) nor reset — a dead-zone. Adding a Micro table
(main min 50) removes it: any balance ≥ 50 can play Micro, and `< 100` can reset.
Higher tiers keep an escape hatch via "back to lobby → pick a lower stake".

## Stake tables (each is its own wallet gameId, mirroring `blackjack-shoe`)

| Tier | gameId | main min–max | side min–max | maxTotalBet | mergeFactor |
|---|---|---|---|---|---|
| Micro | `blackjack-micro` | 50 – 1,000 | 50 – 250 | 1,750 | 8 |
| Mini | `blackjack-mini` | 100 – 2,500 | 100 – 500 | 4,000 | 8 |
| Standard | `blackjack` (existing) | 500 – 10,000 | 100 – 2,500 | 17,500 | 8 |
| High | `blackjack-high` | 1,000 – 20,000 | 200 – 5,000 | 35,000 | 8 |

`main.maxReturn = 2.5` (natural 3:2). Side bets keep their payout ratios across
tiers — only the limits scale: `perfectPair 26 (25:1)`, `twentyOnePlus3 101
(100:1)`, `top3 271 (270:1)`. `maxTotalBet = main.max + 3 × sideMax`.

## Wallet wiring (four seams in game-mode.js)

| Seam | Was | Becomes |
|---|---|---|
| Deal (`startDeal`) | `bankroll.current -= getTotalBets()` | `await session.commitBet({main: Σseat, perfectPair, twentyOnePlus3, top3})` + `betCommitInFlight` guard; reject → stay in betting |
| Double (`playerDouble`) | `bankroll.current -= hand.bet` | `await session.topUp({main: hand.bet})`; reject → abort (no card) |
| Split (`playerSplit`) | `bankroll.current -= hand.bet` | `await session.topUp({main: hand.bet})`; reject → abort (no split) |
| Settle (`resolveRound`) | `bankroll.current += totalWinnings` | `await session.settle(totalWinnings)` (gross; server caps at Σ merged×maxReturn) |

`bankroll` becomes a mirror of the server-confirmed balance
(`syncBankrollFromWallet` + `wallet:balance` event). Setup/buy-in screen retired;
wallet game-gate (on `document.body`) + HUD replace it. Local bust/game-over
dead-ends removed (gate is the sole bust authority). Double/split become async
with in-flight guards so a rejected top-up never deals a phantom card/hand.

## Multi-seat safety

Client mirrors the server `validateBets` at bet-placement: Σ main ∈ [min, max],
each side-bet ≤ its max, grand total ≤ maxTotalBet (all read from the active
tier's table). Worst case (every seat split-to-4 × doubled = 8× base) = 8 × main.max
= `main.max × mergeFactor(8)` = the top-up cap, and the payout cap scales with
merged main → wins are never clipped.

## Stake selection flow (one lobby card → pick inside)

Lobby "Blackjack" card → `blackjack/game-mode/index.html`. On load,
`blackjack-wallet.js` reads `?stake=` (micro|mini|std|high). Missing/invalid →
render a stake-picker overlay (4 buttons) and DO NOT boot; clicking sets
`location.search=?stake=<key>` (reload) → wallet boots with the mapped gameId +
that table's limits. `window.blackjackWallet` (session) + `window.blackjackTable`
(active table config) drive game-mode's bet limits.

## New / changed files

- `js/wallet/table-config.js` — add 3 tables + `BLACKJACK_STAKES` metadata (client mirror; parity test).
- `blackjack/game-mode/js/wallet/bet-map.js` (+ test, package.json) — pure `mapBlackjackBets`.
- `blackjack/game-mode/js/wallet/blackjack-wallet.js` — stake param + picker + boot.
- `blackjack/game-mode/js/game-mode.js` — four seams + limits-from-table.
- `blackjack/game-mode/index.html` — `#walletHudHost`, picker markup hook, wallet module script.
- `blackjack/game-mode/css/game-mode.css` — stake-picker styling.
- Backend `lambda/poker/wallet-logic.mjs` (system-architecture, held branch) — 3 new tables (+ test).

## Testing

Pure: `mapBlackjackBets`, `table-config` server-parity, `wallet-logic` tier
validation/cap. Full signed-in browser run (deal → double → split-to-4 → settle →
bust-reset, on Micro to exercise the reset) is the definition of done — needs a
deploy/custom-token (Firebase blocks localhost).

## Carried decisions (from Plan 3)

Stats/history ephemeral per page-load; per-spot table limits are client UX (the
payout cap Σ amount×maxReturn is the anti-mint control).
