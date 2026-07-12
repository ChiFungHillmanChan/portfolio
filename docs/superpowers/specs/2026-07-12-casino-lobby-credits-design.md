# Casino Game Lobby + Credits Redesign

**Date:** 2026-07-12
**Status:** Approved design, pending implementation plan
**Depends on:** UTH jackpot side bet (merged via PR #60)

## Summary

Restructure the casino app (`portfolio/src/game/casino-game/calculator/`) from a
collection of independent tools into two top-level sections:

- **GAME LOBBY** — real playable games, sharing one per-account chip wallet
  ("credits"), fixed casino-style table limits, Google sign-in required.
- **PRACTICE** — every non-game tool (trainers, card counting, hand recorder,
  odds/theory pages), unchanged, no sign-in required.

First sign-in grants **100,000 chips**. When a player busts they can claim a
free reset to **5,000 chips** once per **6-hour** cooldown. Chip purchases are
a follow-up project (Stripe), out of scope here — but the wallet is designed
server-authoritative so purchases are meaningful when they arrive.

## Decisions (with rationale)

| Decision | Choice |
|---|---|
| Wallet authority | Server wallet (Firestore via Lambda) + client-computed game outcomes with server-side caps. Full server engines rejected (too large); client-only wallet rejected (DevTools-editable chips make purchases meaningless). |
| Lobby contents | 5 playable entries: Roulette, Blackjack, Blackjack Normal Shoe, Baccarat, Ultimate Hold'em. Poker bb100 is a stats tool → Practice. A playable poker game is a future project. |
| Stakes | ONE fixed table per game (no custom bankroll/limits, setup panels removed). Tiered tables possible later. |
| Bust reset | Free 5,000 top-up when balance < 100 (lowest table min), cooldown 6h, server-enforced, env-tunable. |
| Login scope | Lobby games only. Practice stays open (free funnel). bb100 keeps its existing on-demand sign-in for cloud saves. |
| Practice scope | Existing non-game tools only. No free-play variants of lobby games (may add later). |
| Backend home | Extend **cg-poker** Lambda (existing `/poker/{action}` route, auth, deploy pipeline). No new infrastructure. |
| Rollout | One release: nav restructure + wallet + all 5 game conversions ship together. |
| UTH | Goes fully server-side (solo = single-player cg-uth table). Buy-in escrowed from wallet. |

## 1. Structure & Navigation

### Landing page (`calculator/index.html`)

Two zones on one page:

1. **GAME LOBBY** — 5 cards (Roulette, Blackjack, Blackjack Normal Shoe,
   Baccarat, Ultimate Hold'em), each showing its fixed limits. Signed in: a
   wallet HUD (chip balance) heads the zone. Signed out: "Sign in to play"
   state; clicking a card triggers the Google popup.
2. **PRACTICE** — cards for Roulette Dealer Trainer, Blackjack Card Counting
   (easy/medium/hard + progress), Baccarat Card Counting, Poker Hand Recorder
   (bb100), UTH Odds & Strategy.

Hamburger menu regrouped into the same two sections.

**No files physically move.** The lobby/practice split is purely
navigational — existing URLs, bookmarks, and internal links keep working.
Game hub pages (`blackjack/index.html`, `baccarat/index.html`,
`poker/index.html`, `ultimate-texas-holdem/index.html`) are retitled/trimmed to
match the new grouping (playable modes link into the gated game; practice
modes link as today).

### Login gate

New module `js/wallet/game-gate.js`, loaded ONLY by the 5 lobby game pages:

- Waits for `onAuthStateChanged` (loading state meanwhile).
- Signed out → full-screen overlay with "Sign in with Google" (protects deep
  links). No navigation redirect; overlay clears on sign-in.
- Signed in → `wallet-get` → exposes balance to the game and dismisses.
- Balance below the game's minimum → "insufficient for this table" overlay
  linking back to the lobby/cheaper tables; below 100 → bust overlay with the
  reset button (or countdown to `resetAvailableAt`).
- Sign-out mid-game re-displays the gate.

Practice pages do not load the gate and never require sign-in.

## 2. Wallet Backend

### Firestore: `casinoWallet/{uid}`

```
balance: number                 — integer chips
createdAt / updatedAt: ISO
lastResetAt: ISO | null
resetCount: number
totalWagered / totalWon: number — lifetime counters (anomaly review, stats)
openRounds: { [gameId]: { roundId, bets, wager, at } }  — max one per game (at = epoch ms)
lastRounds: { [gameId]: roundId }                  — idempotent retries
lastNewRoundAt: { [gameId]: epochMs }  — rate limiting (new rounds only)
```

Security rules: client may READ its own doc only (same pattern as
`users/{uid}`); ALL writes via Admin SDK (Lambda). `firestore.rules` in
`portfolio/src/game/system-design/` gains the `casinoWallet` block.

### Lambda actions (added to cg-poker)

All actions: Bearer Firebase ID token, Firestore transactions.

| Action | Contract |
|---|---|
| `wallet-get` | → `{balance, resetAvailableAt}`. Creates doc with 100,000 chips on first call (idempotent transaction). |
| `wallet-bet` | `{gameId, roundId, bets: {betType: amount, …}}` (wager = sum of amounts) → debits wager up front, records the open round with its bet breakdown. Same-roundId calls are additive top-ups (blackjack double/split) merging into the stored breakdown; top-ups may only grow betTypes already present in the open round (no post-deal side-bet additions), bounded per type by max × mergeFactor (8 for blackjack mains, 1 otherwise). Rejects: wager > balance, any initial amount outside that betType's fixed limits, or a NEW roundId < 2s after the previous new round (top-ups exempt from the rate limit). Opening a new roundId while another is open forfeits the old open wager (already debited — house keeps it). |
| `wallet-payout` | `{gameId, payout, roundId}` → credits payout, closes round, updates `lastRounds`. Validates: roundId matches the open round; payout ≤ Σ(betType amount × that betType's max return from the game's published pay table). Duplicate roundId (retry) → returns current balance, no double-credit. |
| `wallet-reset` | Allowed iff balance < 100 AND now − lastResetAt ≥ 6h (env `WALLET_RESET_COOLDOWN_HOURS`, default 6). Sets balance = 5,000 (env `WALLET_RESET_CHIPS`), stamps lastResetAt, resetCount++. Otherwise 403 with `retryAt` (ISO). |
| `admin-adjust-wallet` | Superadmin only (same `assertSuperadmin` as other admin actions): set or add chips for `targetUid`. `admin-list-users` additionally returns wallet balance. |

Signup grant (env `WALLET_SIGNUP_CHIPS`, default 100,000).

### Why two-phase (bet → payout)

Outcomes are computed in the browser. A single after-the-round settle could be
selectively skipped on losses (close the tab, keep the chips). Debiting at bet
time makes abandonment lose the wager — like walking away from a live table —
so no exploit is profitable. Honest crashes recover: games persist the
in-progress round (with roundId) to localStorage and complete the payout on
reload.

### Integrity posture

Not un-cheatable (client computes outcomes for 4 of 5 games), but every path is
capped or unprofitable: server-enforced wager limits, payout-multiplier caps,
idempotent roundIds, per-game bet rate limit (~2s), lifetime wagered/won
counters surfaced to the admin panel for anomaly review. UTH is fully
server-authoritative. Tightening further (server engines per game) is a
possible future step, per game, without changing the wallet contract.

## 3. Frontend Wallet Modules

New `calculator/js/wallet/`:

| Module | Purpose |
|---|---|
| `wallet-client.js` | `getWallet() / bet() / payout() / reset()` over the existing `js/auth/api-client.js` Bearer wrapper. Holds in-memory balance, emits `wallet:balance` CustomEvents, retries failed payouts with the same roundId, and blocks starting the next round until the current one settles. |
| `wallet-hud.js` | Chip-balance pill injected into each lobby game header and the lobby zone. Shows bust-reset button + cooldown countdown when applicable. |
| `game-gate.js` | Section 1's auth + wallet bootstrap overlay. |
| `table-config.js` | Single source of the fixed limits below; the same numbers are mirrored server-side in cg-poker (server is authoritative). |

## 4. Fixed Tables

| Game | gameId | Limits |
|---|---|---|
| Roulette | `roulette` | 100 min per spot · 5,000 max per spot · 20,000 max total per spin |
| Blackjack | `blackjack` | main 500–10,000 · side bets (Perfect Pair / 21+3 / Top3) 100–2,500 each |
| Blackjack Normal Shoe | `blackjack-shoe` | 100–2,000 |
| Baccarat | `baccarat` | main 500–10,000 · side bets 100–1,000 |
| Ultimate Hold'em | `uth` | ante = blind 100–1,000 (step 100) · trips 100–5,000 · jackpot flat 100 · buy-in 10,000 (escrowed from wallet) |

Payout caps derive from each game's published pay tables (e.g. roulette
straight-up 35:1 → cap ×36 return; baccarat Dragon Bonus 30:1 → ×31; blackjack
3:2 with split/double top-ups already debited via `wallet-bet`).

All stake numbers are constants in `table-config.js` + the cg-poker mirror —
tunable without structural change.

## 5. Per-Game Conversion

Common changes for Roulette, Blackjack game-mode, Blackjack normal-shoe,
Baccarat:

- Remove the setup panel (custom bankroll + custom limits). Game boots
  straight from the gate with wallet balance + fixed limits.
- Replace the local bankroll with the wallet: chip placement validates against
  live balance; committing bets calls `wallet-bet`; round end calls
  `wallet-payout` with the bet breakdown. Optimistic UI, reconciled from API
  responses.
- Keep round-in-progress persistence in localStorage (crash → reload →
  finish round → collect payout with the stored roundId).
- Existing per-game localStorage bankrolls are simply ignored (no migration —
  everyone starts fresh with the 100,000 signup grant).

### Ultimate Hold'em (server-side, cross-repo)

Lobby UTH — solo AND multiplayer — runs on the existing cg-uth Lambda
(`/Users/hillmanchan/Desktop/system-architecture/lambda/uth/`). Solo becomes a
single-player server table; the in-browser `local-table.js` engine is no longer
used by the lobby (code retained for a potential future practice mode).

cg-uth changes:

- `create-table` / `join-table`: debit 10,000 buy-in from `casinoWallet/{uid}`
  in the same Firestore transaction that seats the player. Insufficient wallet
  → clear error.
- `rebuy`: debits another 10,000 from the wallet (replaces free minting).
- `leave-table` / `sit-out` removal / stale-table GC: credit the seat's
  remaining stack back to the wallet.
- Ante limits change to 100–1,000 step 100 (`logic.mjs` constants), jackpot
  side bet costs 100 chips.

During play the HUD shows the seat stack (escrow), not the wallet. A 5,000
bust-reset intentionally cannot afford the 10,000 UTH buy-in — players grind
cheaper tables back up (and later, purchase).

## 6. Edge Cases

- **Two tabs, same game:** one open round per game — a new `wallet-bet`
  roundId forfeits the previous open wager. Documented, acceptable.
- **Balance 100–499:** can play Roulette/Normal Shoe but not Blackjack or
  Baccarat mains; those tables show "insufficient for this table" and link to
  cheaper games. Reset only offered below 100.
- **Network failure at payout:** wallet-client retries with the same roundId
  (idempotent); next round blocked until settled.
- **Sign-out mid-game:** gate overlay returns; no wallet calls possible
  (no token).
- **Legacy users:** old localStorage bankrolls ignored; practice tools keep
  their own storage untouched.

## 7. Testing

- **cg-poker wallet actions:** `node --test` unit tests (mocked Firestore
  transaction layer) — signup grant idempotency, bet/top-up/forfeit rules,
  payout caps + idempotency, reset cooldown, rate limit, admin adjust.
- **cg-uth escrow:** `node --test` additions to the existing suite — buy-in
  debit, rebuy debit, leave/GC refund, insufficient-wallet rejection.
- **Frontend:** manual end-to-end checklist per game — first-login grant,
  fixed limits enforced, bet/payout round-trip, crash-mid-round recovery,
  bust → reset → cooldown, UTH buy-in/leave refund, practice pages fully
  functional signed out.

## 8. Deploy & Rollout

Single release (no half-converted lobby in production):

1. cg-poker Lambda (wallet actions) + cg-uth Lambda (escrow) —
   `system-architecture` repo.
2. Firestore rules (`casinoWallet` read-own block).
3. Frontend branch `feat/casino-lobby-credits` → PR → merge → sync
   `src/game/casino-game/calculator/` → `public/games/casino-game/`.
4. Admin panel: wallet balance column + adjust control.

## Out of Scope (explicit)

- Chip purchases (Stripe) — next project; the wallet contract already leaves
  room (`wallet-purchase` action, balance credits).
- Playable poker game for the lobby — future project.
- Free-play/practice variants of lobby games.
- Tiered tables (low/mid/high) per game.
- Server-side engines for Roulette/Blackjack/Baccarat.
