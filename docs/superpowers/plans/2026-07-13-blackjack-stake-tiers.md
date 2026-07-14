# Plan (HANDOFF): Blackjack game-mode → wallet + stake tiers

**Design spec:** `docs/superpowers/specs/2026-07-13-blackjack-stake-tiers-design.md` (read it first).
**Project:** casino-lobby-credits Plan 4 (this supersedes the one-table "Plan 4" bullet).
**Branches:** portfolio `feat/casino-lobby-credits`; backend `feat/casino-wallet` in the
separate repo `/Users/hillmanchan/Desktop/system-architecture` (LOCAL-ONLY, held undeployed).

---

## STATUS — 2026-07-13 (evening session: ALL STEPS DONE)

> **This plan is COMPLETE** (steps 1–4 built + stub-browser-verified; suites
> green). Scope grew mid-session: stake tiers were added for EVERY game via a
> SHARED picker (`js/wallet/stake-picker.js` + `GAME_STAKES`/`resolveStake()`
> in table-config.js) — roulette (`roulette-micro/-mini/-high`, min 10/50/500,
> totals 2k/5k/100k, per-spot UX caps 500/1k/5k/25k in ROULETTE_STAKES) and
> baccarat (`baccarat-micro/-mini/-high`, P/B 50–1k / 100–2.5k / 1k–20k,
> totals 2.5k/6k/50k; per-spot caps now DERIVED from window.baccaratTable in
> state.js#getBetTypeMax) got tiers too (numbers user-approved 2026-07-13).
> UTH tiers (ante 25/100/500/1k, buy-in 100 antes) are SPEC-ONLY — folded into
> the parent spec's UTH section for Plan 5. Lobby cards + LOBBY_GAMES limits
> updated; hamburger-menu.css closed-menu links removed from tab order
> (visibility:hidden) so the picker is keyboard-reachable.
> REMAINING (deploy-gated, end of Plan 5): real signed-in run against the
> deployed backend (new gameIds 404 as unknown-game until cg-poker deploys) —
> use the verification checklist below.

### ✅ Done + tested (do NOT redo)
| Piece | File(s) | Test |
|---|---|---|
| Backend: 3 tier tables (`blackjack-micro/-mini/-high`) + dead-zone test | `system-architecture/lambda/poker/wallet-logic.mjs` (+ `.test.mjs`) | `node --test wallet-logic.test.mjs` → **35 pass** |
| Client table-config mirror + `BLACKJACK_STAKES` + `blackjackStake()` | `…/calculator/js/wallet/table-config.js` (+ `.test.mjs`) | `node --test js/wallet/*.test.mjs` → **53 pass** |
| Pure `mapBlackjackBets` + package.json + tests | `…/blackjack/game-mode/js/wallet/bet-map.js`, `tests/bet-map.test.mjs` | `node --test blackjack/game-mode/tests/bet-map.test.mjs` → **6 pass** |
| Design spec | `docs/superpowers/specs/2026-07-13-blackjack-stake-tiers-design.md` | — |

### ⏳ TODO (this handoff)
1. `blackjack/game-mode/js/wallet/blackjack-wallet.js` — stake-param resolve + picker + boot.
2. `blackjack/game-mode/js/game-mode.js` — 4 wallet seams + limits-from-table + retire local bankroll/setup/bust.
3. `blackjack/game-mode/index.html` — `#walletHudHost`, stake-picker markup, wallet module script.
4. `blackjack/game-mode/css/game-mode.css` — stake-picker styling.
5. Verify (signed-in browser) + deploy.

### Working-tree state (uncommitted, nothing committed yet)
- **portfolio** `feat/casino-lobby-credits`: the 3 DONE client files above are modified/new; ALSO
  `portfolio/public/games/casino-game/**` was synced from `src/…/calculator/**` in step (a) of the
  parent session (mirror; not deployed). The `public/` copy is STALE for anything you change in
  `src/` — re-run the sync before any deploy (see Deploy below).
- **system-architecture** `feat/casino-wallet`: `wallet-logic.mjs` + `.test.mjs` modified, held undeployed.
- No commits made. Follow the repo's PR-only workflow when the user asks to commit.

---

## Reference: how the wallet API works (already built — just call it)

`createGameSession({ gameId, mapBets, minBet, gameEl, hudHost, lobbyHref, onReady, onSignedOut })`
returns a session with:
- `commitBet(gameBets)` → maps + opens a round (debits full stake). Throws `WalletError` (codes:
  `insufficient-balance`, `too-fast`, `over-table-max`, `bad-bets`, `round-in-progress`, `empty-bet`).
- `topUp(gameBets)` → grows the OPEN round (double/split). Same throws. **Only `main` may grow**
  (server `validateTopUp` rejects a betType not already in the round).
- `settle(payout)` → credits GROSS winnings; server caps at Σ(mergedAmount × maxReturn).
- `getBalance()`, `hasOpenRound()`, `openRound()`.
Bootstrap calls `walletClient.load()`/`.clear()` on auth changes itself — never call them here.

**Precedent to copy:** `baccarat/game-mode/js/wallet/baccarat-wallet.js` and `…/js/init.js` are the
closest working example (setup-screen → gate, `wallet:ready`/`wallet:balance`, `betCommitInFlight`,
`WALLET_ERR_MSG`, local-bust removal). Roulette is a second example. **Blackjack is the FIRST game to
use `topUp`** — no existing precedent for the async double/split seam; follow step 2 carefully.

---

## Step 1 — `blackjack-wallet.js` (new, ES module)

Mirror `baccarat-wallet.js`, but pick the wallet table from `?stake=` and show a picker if absent.

```js
import { createGameSession } from "../../../../js/wallet/game-session.js";
import bootstrap from "../../../../js/wallet/wallet-bootstrap.js";
import { mapBlackjackBets } from "./bet-map.js";
import { blackjackStake, betTypeSpec } from "../../../../js/wallet/table-config.js";

window.blackjackWallet = null;
window.blackjackTable = null;   // active tier's table config → game-mode reads limits from it

const params = new URLSearchParams(location.search);
const stake = blackjackStake(params.get("stake"));   // null if missing/unknown

if (!stake) {
  // Render the picker overlay (markup in index.html, step 3). Each button sets
  // location.search = "?stake=<key>" (reload → this module re-runs with a valid stake).
  document.dispatchEvent(new CustomEvent("blackjack:need-stake"));
} else {
  window.blackjackTable = { gameId: stake.gameId, ...betTypeSpecsFor(stake.gameId) };
  createGameSession({
    gameId: stake.gameId,
    mapBets: mapBlackjackBets,
    minBet: betTypeSpec(stake.gameId, "main").min,   // 50/100/500/1000 per tier
    gameEl: document.body,
    hudHost: document.getElementById("walletHudHost"),
    lobbyHref: "../../index.html",   // game-mode/ is TWO dirs below the lobby (same as baccarat)
    onReady: (session) => {
      window.blackjackWallet = session;
      if (session.hasOpenRound()) console.warn("[blackjack] resuming open round:", session.openRound());
      document.dispatchEvent(new CustomEvent("wallet:ready"));
    },
    onSignedOut: () => { window.blackjackWallet = null; document.dispatchEvent(new CustomEvent("wallet:signedout")); },
  }).catch((e) => console.error("[blackjack] wallet session failed:", e));

  bootstrap.walletClient.subscribe(() => {
    if (window.blackjackWallet) document.dispatchEvent(new CustomEvent("wallet:balance"));
  });
}
```
Expose the active tier's limits to the classic game script via `window.blackjackTable`
(build a small `{ main:{min,max}, perfectPair:{min,max}, twentyOnePlus3:{…}, top3:{…}, maxTotalBet }`
from `getTable(gameId)`). game-mode.js reads THESE instead of its hardcoded `config.minBet/maxBet/maxSideBet`.

## Step 2 — `game-mode.js` four seams (classic non-module script)

`GameState.bankroll.{initial,current}` becomes a MIRROR of the wallet balance. Add a
`syncBankrollFromWallet(bal)` helper (sets both, re-renders HUD) and a `WALLET_ERR_MSG` map + a
`betCommitInFlight` flag (copy from baccarat init.js). Add a second flag `topUpInFlight` for double/split.

| Seam | Anchor | Change |
|---|---|---|
| **Deal → commit** | `startDeal()` L555; debit `bankroll.current -= getTotalBets()` L567; wired at L208 + L325 (`dealBtn`/`dealBtnInline` → `startDeal`) | Make the deal path async. Guard `if (isAutoDealing‖betCommitInFlight) return;`. Set `betCommitInFlight=true`, disable both deal buttons, `await window.blackjackWallet.commitBet({ main: Σ seat.bet, perfectPair, twentyOnePlus3, top3 })`, `syncBankrollFromWallet(balance)`. On throw → `showToast(WALLET_ERR_MSG[e.code]‖'Bet rejected')`, clear flag, stay in betting. **Delete** the L567 local debit. Then proceed with the existing reset-hands/deal flow. Simplest: rename current `startDeal` body to `beginDealtRound()` (no debit) and make `startDeal` the async committer that calls it on success. |
| **Double → topUp** | `playerDouble()` L775; debit L784; wired L876 (`doubleBtn.onclick`) | Make async. Guard `topUpInFlight`. Keep the local `bankroll.current < hand.bet` pre-check (UX). Replace L784 with `await window.blackjackWallet.topUp({ main: hand.bet })` **before** `hand.bet *= 2` and before drawing the card. On throw → `showToast(...)`, `return` WITHOUT doubling/drawing (abort). `syncBankrollFromWallet(balance)` on success. |
| **Split → topUp** | `playerSplit()` L803; debit L815; wired L887 (`splitBtn.onclick`) | Make async. Guard `topUpInFlight`. Replace L815 with `await window.blackjackWallet.topUp({ main: hand.bet })` **before** creating `newHand`/drawing. On throw → abort (no split). |
| **Settle → settle** | `resolveRound()` L968; credit `bankroll.current += totalWinnings` L1024; called from `startDealerTurn` (L910/922/933 setTimeouts) + `resolveDealerBlackjack()` L961 | Make `resolveRound` async. Replace L1024 with `await window.blackjackWallet.settle(totalWinnings)` then `syncBankrollFromWallet(balance)`. `totalWinnings` is already GROSS (push=bet, win=2×bet, blackjack=2.5×bet, + side wins) — matches the server cap. Callers use `setTimeout(resolveRound,…)`; `resolveRound().catch()` is fine (fire-and-forget the async). |

Also in game-mode.js:
- **Limits:** `placeBetOnSpot()` L341 uses `config.maxBet` (main) / `config.maxSideBet` (side) — switch to
  `window.blackjackTable` per-spot max, and enforce the aggregate at deal time (Σ main ∈ [main.min, main.max],
  each side ≤ its max, grand total ≤ maxTotalBet). `canAffordBet()` L396 already checks `bankroll.current`
  (= wallet balance) — keep, but the authoritative reject is the server (commit/topUp throw).
- **Retire setup screen:** `DOMContentLoaded` L67 currently drives `initializeSetup()`/seat-select/buy-in.
  Replace with: on `wallet:ready` → `startNewGame(window.blackjackWallet.getBalance())` + show game screen
  (copy baccarat init.js `wallet:ready` handler). Add `wallet:balance` handler → `syncBankrollFromWallet`.
  Handle `blackjack:need-stake` → reveal the picker overlay.
- **Remove local bust/game-over dead-ends** (any `bankroll.current <= 0` → game-over). The wallet game-gate
  (mounted on `document.body`) is the sole bust authority. Leave dead wiring inert like roulette/baccarat did.

## Step 3 — `index.html`

- Add `<div id="walletHudHost"></div>` in the header area (see baccarat/game-mode/index.html placement).
- Add a stake-picker overlay (hidden by default; revealed on `blackjack:need-stake`): 4 buttons built from
  `BLACKJACK_STAKES` (name + limitsText + blurb). Each button → `location.search = "?stake=" + key`.
  (Can build statically or in blackjack-wallet.js.)
- The `#setupScreen` (L65) is retired — the gate overlay covers the page until signed in. Leave the element
  or remove it; ensure nothing depends on it being shown.
- Add `<script type="module" src="js/wallet/blackjack-wallet.js"></script>` AFTER the classic
  `js/game-mode.js` (L287) so `window.blackjack*` globals exist before events fire. (Module scripts are
  deferred; classic scripts run first — matches baccarat's ordering.)

## Step 4 — `css/game-mode.css`

Stake-picker overlay styling (full-screen center, 4 cards). Match the game's neon/felt theme.

---

## Verification (definition of done)

`node --test` covers the pure/config layer only. The real gate is a **signed-in browser run** — Firebase
blocks localhost referrers, so use a deploy or the custom-token trick (see `[[project-uth-multiplayer]]`).
Exercise, on the **Micro** tier (to hit the reset path):
1. Lobby → Blackjack → stake picker → Micro. HUD shows balance; gate gone once signed in.
2. Place main + a side bet across 1 seat AND 2 seats; deal. Balance debits by exactly the total.
3. **Double** a hand → balance debits one more base; win → gross credited; server balance matches.
4. **Split** a pair, then split again to ~4 hands, double a couple → each top-up debits; settle → no cap clip.
5. Bet-reject: try a main below the tier min / above max → blocked (client) or `bad-bets` toast (server).
6. Grind to < 100 → gate offers reset → reset to 5,000. Confirm no 100–499 dead-zone on Micro.
7. Refresh mid-hand → open round reconciles (warns, next commit blocks until settled).
Repeat a smoke pass on High to confirm limits scale.

## Deploy (all held for the casino-lobby-credits "one release at end")

1. **Backend** (system-architecture, held branch): deploy cg-poker so the new tier tables exist server-side —
   `cd lambda/poker && npm run deploy` (or the zip+`aws lambda update-function-code` in CLAUDE.md). The new
   gameIds route through the existing `wallet-bet`/`wallet-payout` actions (no new API Gateway routes needed).
2. **Frontend**: re-sync `src/…/calculator/` → `public/games/casino-game/` (the mirror; `rsync -a --delete`
   per parent session), then the portfolio CRA deploy (`npm run deploy`).
3. Merge `feat/casino-lobby-credits` → main via PR (repo is PR-only — never push main directly).

---

## Gotchas / decisions (don't re-litigate)

- **Multi-seat is safe with mergeFactor 8.** Payout cap = Σ(merged bucket × maxReturn); merged `main` = all
  seats' base + all doubles/splits. Worst case = 8 × main.max = `main.max × mergeFactor` = the top-up cap,
  and blackjack's max return (2.5, natural) ≥ any doubled hand (2×) → wins never clip. The only client duty is
  mirroring the server's INITIAL `validateBets` caps (Σ main ≤ main.max, each side ≤ side.max, total ≤ maxTotalBet).
- **Insurance does not exist** in this game (only a cosmetic "PAYS 2 TO 1" label). Don't add it — there is no
  server `insurance` bucket and its 3× return would exceed the 2.5 main cap.
- **Async double/split**: a rejected top-up must NOT draw a card / create a hand. Guard with `topUpInFlight`
  and abort-on-throw. This is the one genuinely new bit vs roulette/baccarat.
- **Dead-zone removed** by Micro min 50 < resetThreshold 100. Higher tiers still show "insufficient" below
  their min, but the escape is "back to lobby → pick a lower stake" (gate's lobby link).
- **Stats/history are ephemeral** per page-load (server balance persists) — accepted in Plan 3.
- **Side-bet client payouts** (25:1 / 100:1 / 270:1) exactly equal server maxReturn (26/101/271) — no clip.

## Test commands (run from `…/calculator/`)
```
node --test js/wallet/*.test.mjs                              # client platform + table-config parity (53)
node --test blackjack/game-mode/tests/bet-map.test.mjs        # bet-map (6)
# backend, from system-architecture/lambda/poker:
node --test wallet-logic.test.mjs                             # tier tables + cap (35)
```
