# Ultimate Texas Hold'em — Online Multiplayer Casino Game

**Date:** 2026-07-10
**Status:** Approved (brainstorm with user, Cantonese session)
**Decisions made by user:** real online multiplayer · private room + room code · fixed per-table buy-in (no persistent wallet) · side bets: Trips + Hole Card Bonus + Bad Beat Bonus · architecture A (Firestore listeners + Lambda), must stay within free tiers ($0).

## 1. Overview

A new game in the casino-game suite (`calculator/ultimate-texas-holdem/`): Ultimate
Texas Hold'em, played online at a shared table of up to 6 players against a
server-run dealer. Players create a private table, get a room code (e.g.
`UTH-8K3F`), friends join with the code. All chips are virtual, fixed buy-in per
seat, entertainment only.

Matches the existing casino-game UI/UX: vanilla JS, shared `variables.css`
design tokens (gold accent, Orbitron/Rajdhani), hamburger menu, settings modal
(sign-in entry), CSS/text playing cards (`A♠` divs), chip-rack betting.

## 2. Game rules (verified against Wizard of Odds, 2026-07-10)

### Core flow

1. Each player posts equal **Ante** and **Blind** (+ optional side bets).
2. Two hole cards to each player and dealer (face down).
3. **Pre-flop decision:** check, or Play bet of **3x or 4x** ante.
4. Flop (3 community cards). **Flop decision** (only if checked): check, or Play **2x**.
5. Turn + river together. **River decision** (only if checked twice): Play **1x** or **fold**.
6. Showdown: best 5-of-7 for player and dealer. Dealer needs **a pair or better to
   qualify ("open")**.

### Settlement

| Bet | Rule |
|---|---|
| Ante | Even money vs dealer. **Pushes if dealer doesn't qualify.** |
| Play | Even money vs dealer (always live, qualification irrelevant). |
| Blind | Wins only if player beats dealer; pays by table below (below straight = push when winning). Loses if dealer wins. Pushes on tie. |
| Tie (equal 5-card hands) | Ante/Play/Blind all push. |
| Fold at river | Forfeits Ante, Blind, Trips. (Hole Card Bonus still resolves — it is fixed at the deal. Bad Beat loses — requires showdown.) |

**Blind pay table:** Royal flush 500:1 · Straight flush 50:1 · Four of a kind
10:1 · Full house 3:1 · Flush 3:2 · Straight 1:1 · less = push.
(3:2 can be fractional — all payouts are `Math.floor`ed to whole chips, casino
style; min ante 25 makes remainders negligible.)

### Side bets (all optional, resolved at showdown)

**Trips** (player's own best 5-of-7, dealer irrelevant):
Royal 50:1 · Straight flush 40:1 · Quads 30:1 · Full house 9:1 · Flush 7:1 ·
Straight 4:1 · Trips 3:1 · else lose.

**Hole Card Bonus** (player's 2 hole cards; top award uses dealer's too):
Player + dealer both pocket aces 1000:1 · Pocket aces 30:1 · AK suited 25:1 ·
AQ/AJ suited 20:1 · AK offsuit 15:1 · Pair JJ–KK 10:1 · AQ/AJ offsuit 5:1 ·
Pair 22–TT 3:1 · else lose.

**Bad Beat Bonus** (pays when the player **loses at showdown** with three of a
kind or better — consolation bet):
Lose with straight flush 7500:1 · quads 500:1 · full house 50:1 · flush 30:1 ·
straight 20:1 · trips 9:1 · else lose.
(Wizard of Odds lists "player or dealer loses" variants; we implement the
player-side version: pays on the player's own losing hand only. Folding = no
showdown = lose.)

## 3. Architecture

```
Browser (calculator/ultimate-texas-holdem/)
  ├─ Firebase Auth (Google, existing; sign-in REQUIRED to play)
  ├─ Firestore onSnapshot  ← uthTables/{code}          (public table state)
  │                        ← uthTables/{code}/private/{uid}  (own hole cards)
  └─ POST api.system-design.hillmanchan.com/uth/{action}
        → NEW Lambda "cg-uth" (nodejs22.x, firebase-admin)
        → Admin SDK writes Firestore (clients have ZERO write access)
```

- **Server-authoritative:** deck, dealer hole cards, all state transitions and
  settlement live in the Lambda. The undealt deck and dealer cards are stored in
  `uthTables/{code}/private/_dealer`, unreadable by any client → no cheating.
- **Reads are push:** every seated player holds one `onSnapshot` on the table doc
  (+ one on their private hole-cards doc). Latency ~100–300 ms.
- **Free tier check (verified):** Firestore Spark = 50k reads/20k writes/day.
  One 6-player round ≈ 160 listener reads + ~30 writes. A heavy evening
  (4 tables × 30 rounds) ≈ 19k reads / 3.6k writes — comfortably free.
  Lambda 1M req/month always-free; API Gateway pennies at worst.

### Firestore schema

```
uthTables/{code}                      code = 4-char room code (A-Z minus ambiguous, e.g. "8K3F")
  status: 'open' | 'closed'
  hostUid, createdAt, lastActivityAt, roundNo
  buyIn: 10000, minAnte: 25, maxAnte: 1000
  phase: 'waiting'|'betting'|'preflop'|'flop'|'river'|'showdown'
  actionDeadline: ISO string (server-set, per phase)
  seatUids: [uid, ...]                ← parallel array for security rules
  seats: [ { uid, seatIndex, name, photoURL, stack, sittingOut,
             bets: {ante, blind, trips, holeCard, badBeat},
             ready, playBet, playStage: null|'preflop'|'flop'|'river',
             folded, timeoutsInARow,
             holeCards: null | [c,c]      ← null until showdown
             result: null | {perBet payouts, handRank, net} } ]
  community: [c, ...]                 ← [] → 3 (flop) → 5 (river)
  dealer: { holeCards: null|[c,c], handRank: null, qualifies: null }  ← null until showdown

uthTables/{code}/private/{uid}
  holeCards: [c, c]                   ← written at deal, readable by that uid only

uthTables/{code}/private/_dealer
  deck: [c, ...], dealerHole: [c, c]  ← NEVER client-readable
```

Card encoding: integers 0–51 (`rank = c % 13`, `suit = Math.floor(c / 13)`), same
suit-color convention as existing games when rendered.

### Security rules (append to `portfolio/src/game/system-design/firestore.rules`)

```
match /uthTables/{code} {
  allow read:  if request.auth != null && request.auth.uid in resource.data.seatUids;
  allow write: if false;
  match /private/{uid} {
    allow read:  if request.auth != null && request.auth.uid == uid;   // '_dealer' can never match a uid
    allow write: if false;
  }
}
```

### Lambda `cg-uth` (new, in system-architecture repo: `lambda/uth/`)

Route: `POST /uth/{action}` on the existing `sa-api` API Gateway → cg-uth.
Auth: Firebase ID token Bearer on every action (same pattern as cg-poker).
Runtime nodejs22.x · 256 MB · 15 s · deps: `firebase-admin` only.
Env: `FIREBASE_SERVICE_ACCOUNT`, `ALLOWED_ORIGINS` (same values as cg-poker).

| Action | Body | Effect |
|---|---|---|
| `create-table` | — | New table, host seated with buyIn stack, returns `{code}` |
| `join-table` | `{code}` | Seat player if open seat + status open |
| `leave-table` | `{code}` | Free seat; last player out → delete table docs |
| `place-bets` | `{code, ante, trips, holeCard, badBeat}` | Validate limits/stack, blind=ante, mark ready. All active players ready → shuffle, deal, phase=preflop |
| `play-action` | `{code, move}` `move ∈ check·4x·3x·2x·1x·fold` | Validate legal for phase/player. All acted → advance phase (deal flop / turn+river / showdown+settle) |
| `rebuy` | `{code}` | stack=buyIn when stack < minAnte, between rounds only |
| `sit-out` / `sit-in` | `{code}` | Toggle sitting out (skips betting round) |
| `tick` | `{code}` | Anyone may call after `actionDeadline`; server verifies clock, applies auto-action (betting: sit out · preflop/flop: check · river: fold), advances. 2 consecutive timeouts → auto sit-out |

All state transitions run inside Firestore transactions on the table doc
(prevents double-advance when two clients tick simultaneously).

**Timers without servers:** `actionDeadline` (now + 30 s betting/decisions,
now + 10 s showdown display) is written with each phase change. Every client
runs a countdown; when it hits zero any client calls `tick`. Server re-checks
`Date.now() > actionDeadline` before acting, so early ticks are no-ops.

**Stale tables:** `create-table` lazily deletes tables with
`lastActivityAt > 24h` old (query limit 5 per call) — no cron needed.

### Game engine (pure JS, single source of truth)

`lambda/uth/engine.mjs` — deck/shuffle (crypto RNG), 7-card evaluator
(rank category + kickers, comparable tuples), pay tables, per-seat settlement
`settleSeat(seat, playerRank, dealerRank, holeCards, dealerHole)`.
A byte-identical copy ships to the client at
`calculator/ultimate-texas-holdem/js/core/engine.js` (ES module) for display
hints ("You have Two Pair") — the client copy never decides money. A comment
header in both files states the sync requirement.

## 4. Frontend

```
calculator/ultimate-texas-holdem/
├── index.html          lobby: rules summary, Create Table / Join with code, sign-in gate
├── table.html          the game table
├── css/                table.css, cards.css, bets.css (reuses ../css/variables.css etc.)
└── js/
    ├── core/engine.js          (copy of lambda engine — display only)
    ├── net/firestore-init.js   (getFirestore(app) — ONLY loaded on UTH pages,
    │                            so poker pages keep their no-Firestore behaviour)
    ├── net/uth-api.js          (apiCall clone posting to /uth/{action})
    ├── state/table-store.js    (onSnapshot subscriptions → local state + events)
    └── ui/                     render-table.js, render-seats.js, render-cards.js,
                                render-bets.js, render-actions.js, countdown.js, main.js
```

- **Table layout:** dealer arc at top (2 cards + rank label), 5 community cards
  centre, 6 seats around a semicircular green-felt table (CSS only), own seat bottom
  centre with bet circles: Ante · Blind · Trips · HCB · BBB.
- **Betting UI:** chip rack `[25, 100, 500, 1000]`, click chips onto bet circles,
  blind auto-mirrors ante; READY button locks bets.
- **Decisions:** big action buttons (CHECK / BET 4x / BET 3x → CHECK / BET 2x →
  BET 1x / FOLD) with 30 s countdown ring; other seats show ✓ acted.
- **Showdown:** dealer + all player hole cards revealed from table doc; per-bet
  win/lose/push chips animate; net result banner; 10 s → next betting round.
- Nav/lobby integration: game card in `calculator/index.html` grid, dropdown
  item added to the nav of all 4 existing games' index pages.
- Mobile-first responsive like existing games (min 44px touch targets).
- English UI text (matches existing casino suite).

## 5. Error handling

- Lambda validation errors → `{error: code}` with 4xx; client toasts and
  re-syncs from snapshot (snapshot is always truth).
- Listener disconnect → Firestore SDK auto-reconnects; UI shows "reconnecting".
- Auth token expiry → existing getIdToken(forceRefresh) retry once on 401.
- Player closes tab mid-hand → timeouts auto-check/fold, 2 in a row → sit-out;
  seat freed if they never return (leave or 24 h GC).
- Race conditions → all transitions in Firestore transactions keyed on phase +
  roundNo (idempotent ticks).

## 6. Testing

- `lambda/uth/engine.test.mjs` (`node --test`): evaluator (all 9 categories,
  kickers, wheel straight A-2-3-4-5, 7-card selection), each pay table,
  settlement matrix (qualify × win/lose/tie × fold), side-bet edge cases.
- State machine tests on a pure `advance(tableState, event)` layer extracted
  from the Lambda handlers.
- Manual: two browser profiles, full rounds incl. timeout, fold, rebuy, leave.

## 7. Deployment

1. Lambda: `cd lambda/uth && npm i --omit=dev && zip → aws lambda create-function cg-uth` (role `sa-lambda-role`), set env vars.
2. API Gateway: add route `POST /uth/{action}` → cg-uth on sa-api.
3. Firestore rules deploy (`npx firebase deploy --only firestore:rules`).
4. Frontend sync `calculator/` → `public/games/casino-game/`.
5. Portfolio repo: PR to main (never direct push, per workflow).
   ⚠️ system-architecture repo currently has uncommitted work on
   `feat/poker-share-graphs` — new `lambda/uth/` files are added untracked and
   left for the user to commit.

## 8. Out of scope (YAGNI)

Public lobby/matchmaking · persistent wallets · spectator mode · chat ·
6-Card Bonus · progressive jackpots · paid tiers (`games-registry.js` untouched).
