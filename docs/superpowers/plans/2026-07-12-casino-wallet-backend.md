# Casino Wallet Backend Implementation Plan (Plan 1 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Server-authoritative chip wallet (`casinoWallet/{uid}`) with signup grant, two-phase bet/payout settlement, capped payouts, cooldown bust-reset, and admin tooling — as new actions on the existing cg-poker Lambda.

**Architecture:** Pure state-transition functions in a new `wallet-logic.mjs` (tested with `node --test`, no Firebase imports) are wrapped by thin transaction handlers in `wallet.mjs` (ctx-injected, same pattern as `live-share.mjs`), dispatched from `index.mjs`. Firestore doc `casinoWallet/{uid}` is the single source of truth; clients may read their own doc, never write.

**Tech Stack:** Node 22 ESM Lambda, firebase-admin (Firestore transactions), `node --test` + `node:assert`.

**Spec:** `docs/superpowers/specs/2026-07-12-casino-lobby-credits-design.md`

## Global Constraints

- Signup grant **100,000** chips (env `WALLET_SIGNUP_CHIPS`); bust reset **5,000** chips (env `WALLET_RESET_CHIPS`); reset cooldown **6 hours** (env `WALLET_RESET_COOLDOWN_HOURS`); reset only when balance < **100**.
- All chip amounts are **positive integers** (payout may be 0). All wallet mutations happen inside `db().runTransaction`.
- Two repos: Lambda code in `/Users/hillmanchan/Desktop/system-architecture` (NOT the portfolio repo); Firestore rules in the portfolio repo. Commit to the right repo per task.
- The system-architecture repo has stale uncommitted files in `lambda/poker/` — Task 1 checkpoints them FIRST; never `git add -A`.
- gameIds for wallet-bet/payout: `roulette`, `blackjack`, `blackjack-shoe`, `baccarat`. UTH does NOT use these actions (Plan 4 gives cg-uth direct escrow transactions on the same doc).
- Rate limit: a NEW roundId within **2s** of the previous new round for the same game is rejected (`too-fast`); same-roundId top-ups are exempt.
- Error responses follow the existing cg-poker convention: `respond(status, { ok: false, error: "kebab-code", ... }, origin)`.

## Firestore Document Contract (`casinoWallet/{uid}`)

Later plans (2, 3, 4) build against this exact shape — do not rename fields:

```js
{
  balance: 100000,              // integer chips
  createdAt: "2026-07-12T…Z",
  updatedAt: "2026-07-12T…Z",
  lastResetAt: null,            // ISO string | null
  resetCount: 0,
  totalWagered: 0,              // lifetime debits via wallet-bet
  totalWon: 0,                  // lifetime credits via wallet-payout
  openRounds: {},               // { [gameId]: { roundId, bets, wager, at } }  (at = epoch ms)
  lastRounds: {},               // { [gameId]: lastSettledRoundId }
  lastNewRoundAt: {},           // { [gameId]: epoch ms }  (rate limiting)
}
```

---

### Task 1: Checkpoint dirty repo state + pure wallet config & `applyBet`

**Files:**
- Create: `/Users/hillmanchan/Desktop/system-architecture/lambda/poker/wallet-logic.mjs`
- Create: `/Users/hillmanchan/Desktop/system-architecture/lambda/poker/wallet-logic.test.mjs`
- Modify: `/Users/hillmanchan/Desktop/system-architecture/lambda/poker/package.json` (add test script)

**Interfaces:**
- Produces: `WALLET_DEFAULTS`, `GAME_TABLES`, `initialWallet(nowMs)`, `applyBet(wallet, {gameId, roundId, bets}, nowMs)` → `{error, retryAt?}` | `{wallet, debited, forfeited?}`. Consumed by Tasks 2–4.

- [ ] **Step 1: Checkpoint the stale uncommitted lambda/poker state**

```bash
cd /Users/hillmanchan/Desktop/system-architecture
git status --short lambda/poker/
git diff lambda/poker/index.mjs | head -50   # eyeball: should be live-share related, nothing destructive
git add lambda/poker/index.mjs lambda/poker/share-stats.mjs lambda/poker/live-share.mjs
git commit -m "chore(cg-poker): checkpoint deployed live-share/share-stats state"
```

If the diff shows anything other than live-share/share-stats wiring, STOP and ask the user before committing.

- [ ] **Step 2: Add the test script to package.json**

In `/Users/hillmanchan/Desktop/system-architecture/lambda/poker/package.json`, add to `"scripts"`:

```json
"test": "node --test"
```

- [ ] **Step 3: Write the failing tests for config, initialWallet, applyBet**

Create `wallet-logic.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WALLET_DEFAULTS,
  GAME_TABLES,
  initialWallet,
  applyBet,
} from "./wallet-logic.mjs";

const NOW = 1_800_000_000_000; // fixed epoch ms

function fundedWallet(balance = 100_000) {
  return { ...initialWallet(NOW - 60_000), balance };
}

test("initialWallet grants signup chips with clean state", () => {
  const w = initialWallet(NOW);
  assert.equal(w.balance, WALLET_DEFAULTS.signupChips);
  assert.equal(w.resetCount, 0);
  assert.equal(w.lastResetAt, null);
  assert.deepEqual(w.openRounds, {});
  assert.deepEqual(w.lastRounds, {});
  assert.equal(w.createdAt, new Date(NOW).toISOString());
});

test("GAME_TABLES covers exactly the four client games", () => {
  assert.deepEqual(
    Object.keys(GAME_TABLES).sort(),
    ["baccarat", "blackjack", "blackjack-shoe", "roulette"]
  );
});

test("applyBet debits a valid roulette bet and opens the round", () => {
  const r = applyBet(fundedWallet(), {
    gameId: "roulette",
    roundId: "r1",
    bets: { straight: 100, evenMoney: 500 },
  }, NOW);
  assert.equal(r.error, undefined);
  assert.equal(r.debited, 600);
  assert.equal(r.wallet.balance, 99_400);
  assert.equal(r.wallet.totalWagered, 600);
  assert.deepEqual(r.wallet.openRounds.roulette.bets, { straight: 100, evenMoney: 500 });
  assert.equal(r.wallet.openRounds.roulette.wager, 600);
  assert.equal(r.wallet.lastNewRoundAt.roulette, NOW);
});

test("applyBet rejects unknown game / bad roundId / empty or unknown betTypes", () => {
  assert.equal(applyBet(fundedWallet(), { gameId: "craps", roundId: "r1", bets: { main: 100 } }, NOW).error, "unknown-game");
  assert.equal(applyBet(fundedWallet(), { gameId: "roulette", roundId: "", bets: { straight: 100 } }, NOW).error, "bad-round-id");
  assert.equal(applyBet(fundedWallet(), { gameId: "roulette", roundId: "r1", bets: {} }, NOW).error, "bad-bets");
  assert.equal(applyBet(fundedWallet(), { gameId: "roulette", roundId: "r1", bets: { kettle: 100 } }, NOW).error, "bad-bets");
  assert.equal(applyBet(fundedWallet(), { gameId: "roulette", roundId: "r1", bets: { straight: 99.5 } }, NOW).error, "bad-bets");
  assert.equal(applyBet(fundedWallet(), { gameId: "roulette", roundId: "r1", bets: { straight: -100 } }, NOW).error, "bad-bets");
});

test("applyBet enforces per-betType min/max and table max total", () => {
  // below min (roulette straight min 100)
  assert.equal(applyBet(fundedWallet(), { gameId: "roulette", roundId: "r1", bets: { straight: 50 } }, NOW).error, "bad-bets");
  // above per-type max (5,000)
  assert.equal(applyBet(fundedWallet(), { gameId: "roulette", roundId: "r1", bets: { straight: 5_100 } }, NOW).error, "bad-bets");
  // above table total (20,000): five evenMoney spots can't exceed it in one round
  assert.equal(applyBet(fundedWallet(1_000_000), {
    gameId: "roulette", roundId: "r1",
    bets: { straight: 5_000, split: 5_000, corner: 5_000, evenMoney: 5_000, dozen: 5_000 },
  }, NOW).error, "over-table-max");
  // blackjack main min is 500
  assert.equal(applyBet(fundedWallet(), { gameId: "blackjack", roundId: "r1", bets: { main: 400 } }, NOW).error, "bad-bets");
});

test("applyBet rejects insufficient balance", () => {
  const r = applyBet(fundedWallet(400), { gameId: "roulette", roundId: "r1", bets: { straight: 500 } }, NOW);
  assert.equal(r.error, "insufficient-balance");
});

test("applyBet same-roundId top-up merges bets, debits only the delta, skips rate limit", () => {
  const first = applyBet(fundedWallet(), { gameId: "blackjack", roundId: "h1", bets: { main: 500 } }, NOW);
  // double 1s later: top up main by 500 — within the 2s window but allowed
  const topUp = applyBet(first.wallet, { gameId: "blackjack", roundId: "h1", bets: { main: 500 } }, NOW + 1_000);
  assert.equal(topUp.error, undefined);
  assert.equal(topUp.debited, 500);
  assert.equal(topUp.wallet.openRounds.blackjack.wager, 1_000);
  assert.deepEqual(topUp.wallet.openRounds.blackjack.bets, { main: 1_000 });
  // merged amount must still respect the per-type max
  const over = applyBet(topUp.wallet, { gameId: "blackjack", roundId: "h1", bets: { main: 9_500 } }, NOW + 1_500);
  assert.equal(over.error, "bad-bets");
});

test("applyBet new round within 2s of previous new round is rejected", () => {
  const first = applyBet(fundedWallet(), { gameId: "roulette", roundId: "r1", bets: { straight: 100 } }, NOW);
  const fast = applyBet(first.wallet, { gameId: "roulette", roundId: "r2", bets: { straight: 100 } }, NOW + 1_000);
  assert.equal(fast.error, "too-fast");
  assert.equal(fast.retryAt, NOW + WALLET_DEFAULTS.minRoundIntervalMs);
});

test("applyBet new roundId forfeits the previous open round (wager stays gone)", () => {
  const first = applyBet(fundedWallet(), { gameId: "roulette", roundId: "r1", bets: { straight: 100 } }, NOW);
  const second = applyBet(first.wallet, { gameId: "roulette", roundId: "r2", bets: { straight: 200 } }, NOW + 5_000);
  assert.equal(second.error, undefined);
  assert.equal(second.forfeited, 100);
  assert.equal(second.wallet.openRounds.roulette.roundId, "r2");
  assert.equal(second.wallet.balance, 100_000 - 100 - 200);
});

test("applyBet rejects a roundId that was already settled", () => {
  const w = fundedWallet();
  w.lastRounds = { roulette: "r1" };
  const r = applyBet(w, { gameId: "roulette", roundId: "r1", bets: { straight: 100 } }, NOW);
  assert.equal(r.error, "round-already-settled");
});

test("applyBet does not mutate the input wallet", () => {
  const w = fundedWallet();
  const before = JSON.stringify(w);
  applyBet(w, { gameId: "roulette", roundId: "r1", bets: { straight: 100 } }, NOW);
  assert.equal(JSON.stringify(w), before);
});
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/poker && npm test
```

Expected: FAIL — `Cannot find module './wallet-logic.mjs'`.

- [ ] **Step 5: Implement `wallet-logic.mjs` (config + initialWallet + applyBet)**

```js
// wallet-logic.mjs — pure state transitions for the shared casino chip wallet.
// No Firebase imports: everything here takes a wallet doc + request + nowMs and
// returns either { error } or { wallet: <next doc> }. wallet.mjs wraps these in
// Firestore transactions. Tested by wallet-logic.test.mjs (node --test).

const envInt = (name, fallback) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

export const WALLET_DEFAULTS = {
  signupChips: envInt("WALLET_SIGNUP_CHIPS", 100_000),
  resetChips: envInt("WALLET_RESET_CHIPS", 5_000),
  resetCooldownMs: envInt("WALLET_RESET_COOLDOWN_HOURS", 6) * 3_600_000,
  resetThreshold: 100,        // reset offered only below the lowest table min
  minRoundIntervalMs: 2_000,  // new rounds only; same-round top-ups exempt
  staleRoundMs: 10 * 60_000,  // open rounds older than this don't block reset
};

// Server-side mirror of the client's table-config.js (client copy is cosmetic;
// THIS table is authoritative). maxReturn = total return per chip wagered on
// that betType, including stake — from each game's published pay table.
export const GAME_TABLES = {
  roulette: {
    maxTotalBet: 20_000,
    betTypes: {
      straight:  { min: 100, max: 5_000, maxReturn: 36 },   // 35:1
      split:     { min: 100, max: 5_000, maxReturn: 18 },   // 17:1
      street:    { min: 100, max: 5_000, maxReturn: 12 },   // 11:1
      corner:    { min: 100, max: 5_000, maxReturn: 9 },    // 8:1
      sixline:   { min: 100, max: 5_000, maxReturn: 6 },    // 5:1
      column:    { min: 100, max: 5_000, maxReturn: 3 },    // 2:1
      dozen:     { min: 100, max: 5_000, maxReturn: 3 },    // 2:1
      evenMoney: { min: 100, max: 5_000, maxReturn: 2 },    // 1:1
    },
  },
  blackjack: {
    maxTotalBet: 17_500, // main 10k + three 2.5k side bets
    betTypes: {
      main:           { min: 500, max: 10_000, maxReturn: 2.5 }, // natural 3:2; splits/doubles are same-round top-ups
      perfectPair:    { min: 100, max: 2_500, maxReturn: 26 },   // 25:1
      twentyOnePlus3: { min: 100, max: 2_500, maxReturn: 101 },  // 100:1
      top3:           { min: 100, max: 2_500, maxReturn: 271 },  // 270:1
    },
  },
  "blackjack-shoe": {
    maxTotalBet: 2_000,
    betTypes: {
      main: { min: 100, max: 2_000, maxReturn: 2.5 },
    },
  },
  baccarat: {
    maxTotalBet: 14_000, // main 10k + four 1k side bets
    betTypes: {
      player:      { min: 500, max: 10_000, maxReturn: 2 },   // 1:1
      banker:      { min: 500, max: 10_000, maxReturn: 2 },   // 0.95:1 → 1.95
      tie:         { min: 100, max: 1_000, maxReturn: 9 },    // 8:1
      playerPair:  { min: 100, max: 1_000, maxReturn: 12 },   // 11:1
      bankerPair:  { min: 100, max: 1_000, maxReturn: 12 },   // 11:1
      dragonBonus: { min: 100, max: 1_000, maxReturn: 31 },   // 30:1 top
      egalite:     { min: 100, max: 1_000, maxReturn: 226 },  // tie-2 pays 225:1
    },
  },
};

export function initialWallet(nowMs) {
  const iso = new Date(nowMs).toISOString();
  return {
    balance: WALLET_DEFAULTS.signupChips,
    createdAt: iso,
    updatedAt: iso,
    lastResetAt: null,
    resetCount: 0,
    totalWagered: 0,
    totalWon: 0,
    openRounds: {},
    lastRounds: {},
    lastNewRoundAt: {},
  };
}

const isPosInt = (n) => Number.isInteger(n) && n > 0;

// Validates a merged bets object against a game table. Returns null when
// valid, else an error code string.
function validateBets(table, bets) {
  const entries = Object.entries(bets);
  if (entries.length === 0) return "bad-bets";
  let total = 0;
  for (const [type, amount] of entries) {
    const spec = table.betTypes[type];
    if (!spec) return "bad-bets";
    if (!isPosInt(amount)) return "bad-bets";
    if (amount < spec.min || amount > spec.max) return "bad-bets";
    total += amount;
  }
  if (total > table.maxTotalBet) return "over-table-max";
  return null;
}

export function applyBet(wallet, { gameId, roundId, bets } = {}, nowMs) {
  const table = GAME_TABLES[gameId];
  if (!table) return { error: "unknown-game" };
  if (typeof roundId !== "string" || roundId.length < 1 || roundId.length > 64) {
    return { error: "bad-round-id" };
  }
  if (typeof bets !== "object" || bets === null || Array.isArray(bets)) {
    return { error: "bad-bets" };
  }
  // amounts must be positive integers even before merging
  for (const amount of Object.values(bets)) {
    if (!isPosInt(amount)) return { error: "bad-bets" };
  }
  if (wallet.lastRounds?.[gameId] === roundId) {
    return { error: "round-already-settled" };
  }

  const open = wallet.openRounds?.[gameId];
  const isTopUp = open && open.roundId === roundId;

  if (!isTopUp) {
    const lastNew = wallet.lastNewRoundAt?.[gameId] || 0;
    if (nowMs - lastNew < WALLET_DEFAULTS.minRoundIntervalMs) {
      return { error: "too-fast", retryAt: lastNew + WALLET_DEFAULTS.minRoundIntervalMs };
    }
  }

  const merged = { ...(isTopUp ? open.bets : {}) };
  for (const [type, amount] of Object.entries(bets)) {
    merged[type] = (merged[type] || 0) + amount;
  }
  const invalid = validateBets(table, merged);
  if (invalid) return { error: invalid };

  const debited = Object.values(bets).reduce((a, b) => a + b, 0);
  if (debited > wallet.balance) return { error: "insufficient-balance" };

  const wager = Object.values(merged).reduce((a, b) => a + b, 0);
  const next = {
    ...wallet,
    balance: wallet.balance - debited,
    totalWagered: (wallet.totalWagered || 0) + debited,
    openRounds: {
      ...wallet.openRounds,
      [gameId]: {
        roundId,
        bets: merged,
        wager,
        at: isTopUp ? open.at : nowMs,
      },
    },
    lastNewRoundAt: isTopUp
      ? wallet.lastNewRoundAt
      : { ...wallet.lastNewRoundAt, [gameId]: nowMs },
  };

  const result = { wallet: next, debited };
  if (open && !isTopUp) result.forfeited = open.wager; // already debited; house keeps it
  return result;
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/poker && npm test
```

Expected: all tests in `wallet-logic.test.mjs` PASS.

- [ ] **Step 7: Commit**

```bash
cd /Users/hillmanchan/Desktop/system-architecture
git add lambda/poker/wallet-logic.mjs lambda/poker/wallet-logic.test.mjs lambda/poker/package.json
git commit -m "feat(cg-poker): wallet config + applyBet pure logic"
```

---

### Task 2: `applyPayout`

**Files:**
- Modify: `/Users/hillmanchan/Desktop/system-architecture/lambda/poker/wallet-logic.mjs`
- Modify: `/Users/hillmanchan/Desktop/system-architecture/lambda/poker/wallet-logic.test.mjs`

**Interfaces:**
- Consumes: `applyBet`, `initialWallet`, `GAME_TABLES` from Task 1.
- Produces: `applyPayout(wallet, {gameId, roundId, payout}, nowMs)` → `{error}` | `{wallet, duplicate?: true}`. Consumed by Task 4.

- [ ] **Step 1: Write the failing tests**

Append to `wallet-logic.test.mjs`:

```js
import { applyPayout } from "./wallet-logic.mjs"; // merge into the existing import block

function walletWithOpenRound() {
  return applyBet(fundedWallet(), {
    gameId: "roulette",
    roundId: "r1",
    bets: { straight: 100, evenMoney: 500 },
  }, NOW).wallet; // balance 99,400
}

test("applyPayout credits a win, closes the round, records lastRounds", () => {
  const r = applyPayout(walletWithOpenRound(), { gameId: "roulette", roundId: "r1", payout: 3_600 }, NOW + 10_000);
  assert.equal(r.error, undefined);
  assert.equal(r.wallet.balance, 99_400 + 3_600);
  assert.equal(r.wallet.totalWon, 3_600);
  assert.equal(r.wallet.openRounds.roulette, undefined);
  assert.equal(r.wallet.lastRounds.roulette, "r1");
});

test("applyPayout accepts a zero payout (loss)", () => {
  const r = applyPayout(walletWithOpenRound(), { gameId: "roulette", roundId: "r1", payout: 0 }, NOW + 10_000);
  assert.equal(r.error, undefined);
  assert.equal(r.wallet.balance, 99_400);
  assert.equal(r.wallet.lastRounds.roulette, "r1");
});

test("applyPayout caps payout at the per-betType max return", () => {
  // cap = 100×36 + 500×2 = 4,600
  const ok = applyPayout(walletWithOpenRound(), { gameId: "roulette", roundId: "r1", payout: 4_600 }, NOW + 10_000);
  assert.equal(ok.error, undefined);
  const over = applyPayout(walletWithOpenRound(), { gameId: "roulette", roundId: "r1", payout: 4_601 }, NOW + 10_000);
  assert.equal(over.error, "payout-exceeds-cap");
});

test("applyPayout duplicate roundId is a no-op signal, not an error", () => {
  const settled = applyPayout(walletWithOpenRound(), { gameId: "roulette", roundId: "r1", payout: 0 }, NOW + 10_000).wallet;
  const dup = applyPayout(settled, { gameId: "roulette", roundId: "r1", payout: 999_999 }, NOW + 11_000);
  assert.equal(dup.duplicate, true);
  assert.equal(dup.wallet.balance, settled.balance); // no double credit
});

test("applyPayout rejects unknown game, bad payout, and missing open round", () => {
  assert.equal(applyPayout(walletWithOpenRound(), { gameId: "craps", roundId: "r1", payout: 0 }, NOW).error, "unknown-game");
  assert.equal(applyPayout(walletWithOpenRound(), { gameId: "roulette", roundId: "r1", payout: -1 }, NOW).error, "bad-payout");
  assert.equal(applyPayout(walletWithOpenRound(), { gameId: "roulette", roundId: "r1", payout: 1.5 }, NOW).error, "bad-payout");
  assert.equal(applyPayout(walletWithOpenRound(), { gameId: "roulette", roundId: "rX", payout: 0 }, NOW).error, "no-open-round");
  assert.equal(applyPayout(fundedWallet(), { gameId: "roulette", roundId: "r1", payout: 0 }, NOW).error, "no-open-round");
});

test("applyPayout fractional maxReturn caps use ceil (blackjack 3:2)", () => {
  const w = applyBet(fundedWallet(), { gameId: "blackjack", roundId: "h1", bets: { main: 505 } }, NOW).wallet;
  // cap = ceil(505 × 2.5) = 1,263
  assert.equal(applyPayout(w, { gameId: "blackjack", roundId: "h1", payout: 1_263 }, NOW + 5_000).error, undefined);
  assert.equal(applyPayout(w, { gameId: "blackjack", roundId: "h1", payout: 1_264 }, NOW + 5_000).error, "payout-exceeds-cap");
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/poker && npm test
```

Expected: FAIL — `applyPayout` is not exported.

- [ ] **Step 3: Implement `applyPayout` in `wallet-logic.mjs`**

```js
export function applyPayout(wallet, { gameId, roundId, payout } = {}, nowMs) {
  const table = GAME_TABLES[gameId];
  if (!table) return { error: "unknown-game" };
  if (!Number.isInteger(payout) || payout < 0) return { error: "bad-payout" };

  if (wallet.lastRounds?.[gameId] === roundId) {
    return { wallet, duplicate: true }; // idempotent retry — already settled
  }

  const open = wallet.openRounds?.[gameId];
  if (!open || open.roundId !== roundId) return { error: "no-open-round" };

  const cap = Object.entries(open.bets).reduce(
    (sum, [type, amount]) => sum + Math.ceil(amount * table.betTypes[type].maxReturn),
    0
  );
  if (payout > cap) return { error: "payout-exceeds-cap" };

  const openRounds = { ...wallet.openRounds };
  delete openRounds[gameId];

  return {
    wallet: {
      ...wallet,
      balance: wallet.balance + payout,
      totalWon: (wallet.totalWon || 0) + payout,
      openRounds,
      lastRounds: { ...wallet.lastRounds, [gameId]: roundId },
    },
  };
}
```

(`nowMs` is accepted for signature symmetry; `updatedAt` stamping happens in the transaction wrapper.)

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/poker && npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/hillmanchan/Desktop/system-architecture
git add lambda/poker/wallet-logic.mjs lambda/poker/wallet-logic.test.mjs
git commit -m "feat(cg-poker): applyPayout with per-betType return caps + idempotency"
```

---

### Task 3: `applyReset`, `resetAvailability`, `applyAdminAdjust`

**Files:**
- Modify: `/Users/hillmanchan/Desktop/system-architecture/lambda/poker/wallet-logic.mjs`
- Modify: `/Users/hillmanchan/Desktop/system-architecture/lambda/poker/wallet-logic.test.mjs`

**Interfaces:**
- Produces:
  - `applyReset(wallet, nowMs)` → `{error, retryAt?}` | `{wallet}`
  - `resetAvailability(wallet, nowMs)` → `{canReset: boolean, resetAvailableAt: string|null}`
  - `applyAdminAdjust(walletOrNull, {set?, add?}, nowMs)` → `{error}` | `{wallet}`
- Consumed by Task 4.

- [ ] **Step 1: Write the failing tests**

Append to `wallet-logic.test.mjs` (merge `applyReset, resetAvailability, applyAdminAdjust` into the import block):

```js
test("applyReset tops a busted wallet up to resetChips and stamps cooldown", () => {
  const w = fundedWallet(40);
  const r = applyReset(w, NOW);
  assert.equal(r.error, undefined);
  assert.equal(r.wallet.balance, WALLET_DEFAULTS.resetChips);
  assert.equal(r.wallet.resetCount, 1);
  assert.equal(r.wallet.lastResetAt, new Date(NOW).toISOString());
});

test("applyReset refuses when balance is at or above the threshold", () => {
  assert.equal(applyReset(fundedWallet(100), NOW).error, "not-busted");
  assert.equal(applyReset(fundedWallet(5_000), NOW).error, "not-busted");
});

test("applyReset enforces the cooldown with retryAt", () => {
  const first = applyReset(fundedWallet(0), NOW).wallet;
  first.balance = 0; // busted again immediately
  const again = applyReset(first, NOW + 60_000);
  assert.equal(again.error, "cooldown");
  assert.equal(again.retryAt, new Date(NOW + WALLET_DEFAULTS.resetCooldownMs).toISOString());
  const later = applyReset(first, NOW + WALLET_DEFAULTS.resetCooldownMs);
  assert.equal(later.error, undefined);
  assert.equal(later.wallet.resetCount, 2);
});

test("applyReset blocks on a fresh open round, forfeits a stale one", () => {
  const fresh = applyBet(fundedWallet(150), { gameId: "roulette", roundId: "r1", bets: { straight: 150 } }, NOW).wallet;
  assert.equal(applyReset(fresh, NOW + 30_000).error, "round-in-progress");
  const afterStale = applyReset(fresh, NOW + WALLET_DEFAULTS.staleRoundMs + 1_000);
  assert.equal(afterStale.error, undefined);
  assert.deepEqual(afterStale.wallet.openRounds, {}); // stale round cleared, wager forfeited
});

test("resetAvailability reports the HUD state", () => {
  assert.deepEqual(resetAvailability(fundedWallet(50_000), NOW), { canReset: false, resetAvailableAt: null });
  assert.deepEqual(resetAvailability(fundedWallet(0), NOW), { canReset: true, resetAvailableAt: null });
  const cooled = applyReset(fundedWallet(0), NOW).wallet;
  cooled.balance = 0;
  assert.deepEqual(resetAvailability(cooled, NOW + 1_000), {
    canReset: false,
    resetAvailableAt: new Date(NOW + WALLET_DEFAULTS.resetCooldownMs).toISOString(),
  });
});

test("applyAdminAdjust sets or adds, clamps at zero, creates a zero-based wallet when missing", () => {
  assert.equal(applyAdminAdjust(fundedWallet(1_000), { set: 250_000 }, NOW).wallet.balance, 250_000);
  assert.equal(applyAdminAdjust(fundedWallet(1_000), { add: -5_000 }, NOW).wallet.balance, 0);
  assert.equal(applyAdminAdjust(fundedWallet(1_000), { add: 500 }, NOW).wallet.balance, 1_500);
  const created = applyAdminAdjust(null, { set: 7_000 }, NOW).wallet;
  assert.equal(created.balance, 7_000);
  assert.equal(created.resetCount, 0);
  // exactly one of set/add, integers only, set must be >= 0
  assert.equal(applyAdminAdjust(fundedWallet(), {}, NOW).error, "bad-adjust");
  assert.equal(applyAdminAdjust(fundedWallet(), { set: 100, add: 100 }, NOW).error, "bad-adjust");
  assert.equal(applyAdminAdjust(fundedWallet(), { set: -1 }, NOW).error, "bad-adjust");
  assert.equal(applyAdminAdjust(fundedWallet(), { add: 0.5 }, NOW).error, "bad-adjust");
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/poker && npm test
```

Expected: FAIL — missing exports.

- [ ] **Step 3: Implement in `wallet-logic.mjs`**

```js
export function resetAvailability(wallet, nowMs) {
  if (wallet.balance >= WALLET_DEFAULTS.resetThreshold) {
    return { canReset: false, resetAvailableAt: null };
  }
  const last = wallet.lastResetAt ? Date.parse(wallet.lastResetAt) : 0;
  const readyAt = last + WALLET_DEFAULTS.resetCooldownMs;
  if (nowMs >= readyAt) return { canReset: true, resetAvailableAt: null };
  return { canReset: false, resetAvailableAt: new Date(readyAt).toISOString() };
}

export function applyReset(wallet, nowMs) {
  if (wallet.balance >= WALLET_DEFAULTS.resetThreshold) return { error: "not-busted" };

  for (const round of Object.values(wallet.openRounds || {})) {
    if (nowMs - round.at < WALLET_DEFAULTS.staleRoundMs) {
      return { error: "round-in-progress" };
    }
  }

  const last = wallet.lastResetAt ? Date.parse(wallet.lastResetAt) : 0;
  const readyAt = last + WALLET_DEFAULTS.resetCooldownMs;
  if (nowMs < readyAt) {
    return { error: "cooldown", retryAt: new Date(readyAt).toISOString() };
  }

  return {
    wallet: {
      ...wallet,
      balance: WALLET_DEFAULTS.resetChips,
      lastResetAt: new Date(nowMs).toISOString(),
      resetCount: (wallet.resetCount || 0) + 1,
      openRounds: {}, // stale leftovers are forfeited
    },
  };
}

export function applyAdminAdjust(wallet, { set, add } = {}, nowMs) {
  const hasSet = set !== undefined;
  const hasAdd = add !== undefined;
  if (hasSet === hasAdd) return { error: "bad-adjust" }; // exactly one
  if (hasSet && (!Number.isInteger(set) || set < 0)) return { error: "bad-adjust" };
  if (hasAdd && !Number.isInteger(add)) return { error: "bad-adjust" };

  const base = wallet || { ...initialWallet(nowMs), balance: 0 };
  const balance = hasSet ? set : Math.max(0, base.balance + add);
  return { wallet: { ...base, balance } };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/poker && npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/hillmanchan/Desktop/system-architecture
git add lambda/poker/wallet-logic.mjs lambda/poker/wallet-logic.test.mjs
git commit -m "feat(cg-poker): wallet reset with cooldown + admin adjust pure logic"
```

---

### Task 4: `wallet.mjs` transaction handlers + dispatch wiring

**Files:**
- Create: `/Users/hillmanchan/Desktop/system-architecture/lambda/poker/wallet.mjs`
- Create: `/Users/hillmanchan/Desktop/system-architecture/lambda/poker/wallet.test.mjs`
- Modify: `/Users/hillmanchan/Desktop/system-architecture/lambda/poker/index.mjs` (imports ~line 45, dispatch switch ~line 1790)
- Modify: `/Users/hillmanchan/Desktop/system-architecture/lambda/poker/package.json` (deploy zip must include all `.mjs` modules)

**Interfaces:**
- Consumes: all Task 1–3 exports; cg-poker's existing `respond/badRequest/forbidden/serverError`, `db`, `assertSuperadmin` (injected via ctx, mirroring `liveShareCtx()` at `index.mjs:1712`).
- Produces HTTP actions: `wallet-get`, `wallet-bet`, `wallet-payout`, `wallet-reset`, `admin-adjust-wallet`. Response shapes (consumed by Plan 2's `wallet-client.js`):
  - `wallet-get` → `{ok, balance, canReset, resetAvailableAt}`
  - `wallet-bet` → `{ok, balance, roundId, forfeited?}` | errors as `{ok:false, error}` (429 for `too-fast` with `retryAt`)
  - `wallet-payout` → `{ok, balance, duplicate?}`
  - `wallet-reset` → `{ok, balance}` | 403 `{ok:false, error:"cooldown", retryAt}`
  - `admin-adjust-wallet` → `{ok, balance}`

- [ ] **Step 1: Write the failing handler tests with a fake Firestore**

Create `wallet.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  actWalletGet,
  actWalletBet,
  actWalletPayout,
  actWalletReset,
  actAdminAdjustWallet,
} from "./wallet.mjs";
import { WALLET_DEFAULTS } from "./wallet-logic.mjs";

// Minimal in-memory stand-in for the bits of Firestore the handlers touch.
function fakeDb(seed = {}) {
  const store = new Map(Object.entries(seed)); // key: "casinoWallet/<uid>"
  const dbFn = () => ({
    collection: (col) => ({
      doc: (id) => ({ _key: `${col}/${id}` }),
    }),
    runTransaction: async (fn) =>
      fn({
        get: async (ref) => {
          const data = store.get(ref._key);
          return { exists: data !== undefined, data: () => data };
        },
        set: (ref, data) => {
          store.set(ref._key, data);
        },
      }),
  });
  return { dbFn, store };
}

function ctxFor(dbFn, { uid = "u1", body = {}, superadmin = false } = {}) {
  const respond = (statusCode, payload) => ({ statusCode, payload });
  return {
    uid,
    email: "t@example.com",
    body,
    origin: "https://casino-game.hillmanchan.com",
    db: dbFn,
    respond,
    badRequest: (msg) => respond(400, { ok: false, error: msg }),
    forbidden: (msg) => respond(403, { ok: false, error: msg }),
    serverError: (msg) => respond(500, { ok: false, error: msg }),
    assertSuperadmin: async () => superadmin,
  };
}

test("wallet-get creates the wallet with the signup grant on first call", async () => {
  const { dbFn, store } = fakeDb();
  const res = await actWalletGet(ctxFor(dbFn));
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.balance, WALLET_DEFAULTS.signupChips);
  assert.equal(res.payload.canReset, false);
  assert.equal(store.get("casinoWallet/u1").balance, WALLET_DEFAULTS.signupChips);
});

test("wallet-get is idempotent for an existing wallet", async () => {
  const { dbFn } = fakeDb();
  await actWalletGet(ctxFor(dbFn));
  const again = await actWalletGet(ctxFor(dbFn));
  assert.equal(again.payload.balance, WALLET_DEFAULTS.signupChips); // not double-granted
});

test("wallet-bet debits and persists; validation errors map to 400", async () => {
  const { dbFn, store } = fakeDb();
  const ok = await actWalletBet(ctxFor(dbFn, {
    body: { gameId: "roulette", roundId: "r1", bets: { straight: 100 } },
  }));
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.payload.balance, WALLET_DEFAULTS.signupChips - 100);
  assert.equal(store.get("casinoWallet/u1").openRounds.roulette.roundId, "r1");

  const bad = await actWalletBet(ctxFor(dbFn, {
    body: { gameId: "roulette", roundId: "r2", bets: { straight: 5 } },
  }));
  assert.equal(bad.statusCode, 400);
  assert.equal(bad.payload.error, "bad-bets");
});

test("wallet-bet rate limit maps to 429 with retryAt", async () => {
  const { dbFn } = fakeDb();
  await actWalletBet(ctxFor(dbFn, { body: { gameId: "roulette", roundId: "r1", bets: { straight: 100 } } }));
  const fast = await actWalletBet(ctxFor(dbFn, { body: { gameId: "roulette", roundId: "r2", bets: { straight: 100 } } }));
  assert.equal(fast.statusCode, 429);
  assert.equal(fast.payload.error, "too-fast");
  assert.ok(fast.payload.retryAt);
});

test("wallet-payout settles and duplicate retry returns 200", async () => {
  const { dbFn } = fakeDb();
  await actWalletBet(ctxFor(dbFn, { body: { gameId: "roulette", roundId: "r1", bets: { straight: 100 } } }));
  const win = await actWalletPayout(ctxFor(dbFn, { body: { gameId: "roulette", roundId: "r1", payout: 3_600 } }));
  assert.equal(win.statusCode, 200);
  assert.equal(win.payload.balance, WALLET_DEFAULTS.signupChips - 100 + 3_600);
  const dup = await actWalletPayout(ctxFor(dbFn, { body: { gameId: "roulette", roundId: "r1", payout: 3_600 } }));
  assert.equal(dup.statusCode, 200);
  assert.equal(dup.payload.duplicate, true);
  assert.equal(dup.payload.balance, win.payload.balance);
});

test("wallet-reset busts path and cooldown maps to 403", async () => {
  const { dbFn, store } = fakeDb({ "casinoWallet/u1": { balance: 0, openRounds: {}, lastRounds: {}, lastNewRoundAt: {}, lastResetAt: null, resetCount: 0, totalWagered: 0, totalWon: 0, createdAt: "x", updatedAt: "x" } });
  const ok = await actWalletReset(ctxFor(dbFn));
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.payload.balance, WALLET_DEFAULTS.resetChips);
  store.get("casinoWallet/u1").balance = 0;
  const cooled = await actWalletReset(ctxFor(dbFn));
  assert.equal(cooled.statusCode, 403);
  assert.equal(cooled.payload.error, "cooldown");
  assert.ok(cooled.payload.retryAt);
});

test("admin-adjust-wallet requires superadmin and targets another uid", async () => {
  const { dbFn, store } = fakeDb();
  const denied = await actAdminAdjustWallet(ctxFor(dbFn, { body: { targetUid: "u2", set: 9_000 } }));
  assert.equal(denied.statusCode, 403);
  const ok = await actAdminAdjustWallet(ctxFor(dbFn, { body: { targetUid: "u2", set: 9_000 }, superadmin: true }));
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.payload.balance, 9_000);
  assert.equal(store.get("casinoWallet/u2").balance, 9_000);
  const bad = await actAdminAdjustWallet(ctxFor(dbFn, { body: { set: 9_000 }, superadmin: true }));
  assert.equal(bad.statusCode, 400); // missing targetUid
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/poker && npm test
```

Expected: FAIL — `Cannot find module './wallet.mjs'`.

- [ ] **Step 3: Implement `wallet.mjs`**

```js
// wallet.mjs — casinoWallet action handlers for cg-poker. Pure decision logic
// lives in wallet-logic.mjs; this file only wraps it in Firestore transactions
// and maps results to HTTP responses. Handlers receive an injected ctx (same
// decoupling pattern as live-share.mjs) so they unit-test with a fake db.

import {
  initialWallet,
  applyBet,
  applyPayout,
  applyReset,
  applyAdminAdjust,
  resetAvailability,
} from "./wallet-logic.mjs";

const walletRef = (ctx, uid) => ctx.db().collection("casinoWallet").doc(uid);

const ERROR_STATUS = {
  "too-fast": 429,
  cooldown: 403,
  "round-in-progress": 403,
  "not-busted": 403,
};

function errorResponse(ctx, result) {
  const status = ERROR_STATUS[result.error] || 400;
  const body = { ok: false, error: result.error };
  if (result.retryAt) body.retryAt = result.retryAt;
  return ctx.respond(status, body, ctx.origin);
}

// Runs `transition(wallet)` on the caller's wallet inside a transaction,
// creating the doc with the signup grant if it doesn't exist yet.
async function withWallet(ctx, uid, transition) {
  return ctx.db().runTransaction(async (txn) => {
    const ref = walletRef(ctx, uid);
    const snap = await txn.get(ref);
    const nowMs = Date.now();
    const wallet = snap.exists ? snap.data() : initialWallet(nowMs);
    const result = transition(wallet, nowMs, snap.exists);
    if (!result.error) {
      txn.set(ref, { ...result.wallet, updatedAt: new Date(nowMs).toISOString() });
    }
    return { ...result, nowMs };
  });
}

export async function actWalletGet(ctx) {
  const result = await withWallet(ctx, ctx.uid, (wallet) => ({ wallet }));
  const { canReset, resetAvailableAt } = resetAvailability(result.wallet, result.nowMs);
  return ctx.respond(
    200,
    { ok: true, balance: result.wallet.balance, canReset, resetAvailableAt },
    ctx.origin
  );
}

export async function actWalletBet(ctx) {
  const { gameId, roundId, bets } = ctx.body || {};
  const result = await withWallet(ctx, ctx.uid, (wallet, nowMs) =>
    applyBet(wallet, { gameId, roundId, bets }, nowMs)
  );
  if (result.error) return errorResponse(ctx, result);
  const body = { ok: true, balance: result.wallet.balance, roundId };
  if (result.forfeited) body.forfeited = result.forfeited;
  return ctx.respond(200, body, ctx.origin);
}

export async function actWalletPayout(ctx) {
  const { gameId, roundId, payout } = ctx.body || {};
  const result = await withWallet(ctx, ctx.uid, (wallet, nowMs) =>
    applyPayout(wallet, { gameId, roundId, payout }, nowMs)
  );
  if (result.error) return errorResponse(ctx, result);
  const body = { ok: true, balance: result.wallet.balance };
  if (result.duplicate) body.duplicate = true;
  return ctx.respond(200, body, ctx.origin);
}

export async function actWalletReset(ctx) {
  const result = await withWallet(ctx, ctx.uid, (wallet, nowMs) =>
    applyReset(wallet, nowMs)
  );
  if (result.error) return errorResponse(ctx, result);
  return ctx.respond(200, { ok: true, balance: result.wallet.balance }, ctx.origin);
}

export async function actAdminAdjustWallet(ctx) {
  if (!(await ctx.assertSuperadmin({ uid: ctx.uid, email: ctx.email }))) {
    return ctx.forbidden("not-superadmin", ctx.origin);
  }
  const { targetUid, set, add } = ctx.body || {};
  if (typeof targetUid !== "string" || !targetUid) {
    return ctx.badRequest("missing-target-uid", ctx.origin);
  }
  const result = await ctx.db().runTransaction(async (txn) => {
    const ref = walletRef(ctx, targetUid);
    const snap = await txn.get(ref);
    const nowMs = Date.now();
    const out = applyAdminAdjust(snap.exists ? snap.data() : null, { set, add }, nowMs);
    if (!out.error) {
      txn.set(ref, { ...out.wallet, updatedAt: new Date(nowMs).toISOString() });
    }
    return out;
  });
  if (result.error) return errorResponse(ctx, result);
  return ctx.respond(200, { ok: true, balance: result.wallet.balance }, ctx.origin);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/poker && npm test
```

Expected: PASS (wallet-logic + wallet handler tests).

- [ ] **Step 5: Wire dispatch in `index.mjs`**

Add the import after the existing live-share import block (~line 45):

```js
import {
  actWalletGet,
  actWalletBet,
  actWalletPayout,
  actWalletReset,
  actAdminAdjustWallet,
} from "./wallet.mjs";
```

Inside `handler`, next to `liveShareCtx` (~line 1712), add:

```js
const walletCtx = () => ({
  uid: user.uid,
  email: user.email,
  body,
  origin,
  db,
  respond,
  badRequest,
  forbidden,
  serverError,
  assertSuperadmin,
});
```

Add cases to the dispatch switch, before `default:` (~line 1791):

```js
      case "wallet-get":
        return await actWalletGet(walletCtx());
      case "wallet-bet":
        return await actWalletBet(walletCtx());
      case "wallet-payout":
        return await actWalletPayout(walletCtx());
      case "wallet-reset":
        return await actWalletReset(walletCtx());
      case "admin-adjust-wallet":
        return await actAdminAdjustWallet(walletCtx());
```

- [ ] **Step 6: Fix the deploy zip to include every runtime module**

In `package.json`, replace the `deploy` script's zip list (it currently omits `live-share.mjs`/`share-stats.mjs` — stale):

```json
"deploy": "npm install --omit=dev && zip -r /tmp/cg-poker.zip index.mjs wallet.mjs wallet-logic.mjs live-share.mjs share-stats.mjs package.json node_modules/ && aws lambda update-function-code --function-name cg-poker --zip-file fileb:///tmp/cg-poker.zip --region eu-west-2"
```

- [ ] **Step 7: Syntax-check index.mjs and run the full suite**

```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/poker
node --check index.mjs && npm test
```

Expected: no syntax errors; all tests PASS.

- [ ] **Step 8: Commit**

```bash
cd /Users/hillmanchan/Desktop/system-architecture
git add lambda/poker/wallet.mjs lambda/poker/wallet.test.mjs lambda/poker/index.mjs lambda/poker/package.json
git commit -m "feat(cg-poker): wallet-get/bet/payout/reset + admin-adjust-wallet actions"
```

---

### Task 5: Wallet balance in `admin-list-users`

**Files:**
- Modify: `/Users/hillmanchan/Desktop/system-architecture/lambda/poker/index.mjs:446-484` (`actAdminListUsers`)

**Interfaces:**
- Produces: each user object in the `admin-list-users` response gains `wallet: { balance: number|null }` (null = no wallet yet). Consumed by the admin panel in Plan 2.

- [ ] **Step 1: Extend the parallel Firestore reads**

In `actAdminListUsers`, change the two-way `Promise.all` (~line 448) to three-way:

```js
  const [userDocs, pokerDocs, walletDocs] = await Promise.all([
    Promise.all(uids.map((id) => db().doc(`users/${id}`).get())),
    Promise.all(uids.map((id) => db().doc(`pokerStorage/${id}`).get())),
    Promise.all(uids.map((id) => db().doc(`casinoWallet/${id}`).get())),
  ]);
```

After `pokerMap` (~line 454) add:

```js
  const walletMap = new Map(walletDocs.map((s, i) => [uids[i], s.exists ? s.data() : null]));
```

In the `users` map callback, after the `plans` block (~line 482), add:

```js
      wallet: {
        balance: walletMap.get(u.uid)?.balance ?? null,
      },
```

- [ ] **Step 2: Syntax-check and run tests**

```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/poker
node --check index.mjs && npm test
```

Expected: PASS (existing tests unaffected; this action has no unit test — verified via admin panel in Plan 2).

- [ ] **Step 3: Commit**

```bash
cd /Users/hillmanchan/Desktop/system-architecture
git add lambda/poker/index.mjs
git commit -m "feat(cg-poker): include casinoWallet balance in admin-list-users"
```

---

### Task 6: Firestore rules for `casinoWallet` (portfolio repo)

**Files:**
- Modify: `/Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/system-design/firestore.rules` (after the `pokerSessions` block, ~line 60)

- [ ] **Step 1: Add the rules block**

Insert after the `pokerSessions` match block:

```
    // casinoWallet/{uid} — shared casino chip wallet (Game Lobby credits).
    // Client may read its OWN balance (wallet HUD); every mutation goes
    // through cg-poker wallet-* actions or cg-uth escrow (Admin SDK bypasses
    // these rules). Client writes are never allowed — chips would be forgeable.
    match /casinoWallet/{uid} {
      allow read:  if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }
```

- [ ] **Step 2: Validate rules compile (dry-run deploy)**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/system-design
npx firebase deploy --only firestore:rules --dry-run 2>&1 | tail -5
```

Expected: `Dry run complete!` (or rules compiled successfully). If the CLI needs login, ask the user to run `! npx firebase login` and retry.

- [ ] **Step 3: Commit (portfolio repo, branch `feat/casino-lobby-credits`)**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git status --short   # verify only firestore.rules changed (parallel sessions share this tree)
git add portfolio/src/game/system-design/firestore.rules
git commit -m "feat(casino): casinoWallet Firestore rules — read own, write never"
```

---

### Task 7: Deploy + smoke test

Deployment changes production. Confirm with the user before running this task.

- [ ] **Step 1: Deploy Firestore rules**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/system-design
npx firebase deploy --only firestore:rules
```

Expected: `Deploy complete!`

- [ ] **Step 2: Deploy the cg-poker Lambda**

```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/poker
npm run deploy
```

Expected: JSON output with `"LastUpdateStatus": "InProgress"` (or Successful) and no errors.

- [ ] **Step 3: Smoke test — unauthenticated calls are rejected, action is routed**

```bash
curl -s -X POST https://api.system-design.hillmanchan.com/poker/wallet-get \
  -H "content-type: application/json" -d '{}' | python3 -m json.tool
```

Expected: `{"ok": false, "error": "invalid or missing Firebase ID token"}` with HTTP 401 — proves the action routes to the new handler and auth gating works. (A full authed round-trip happens in Plan 2 when `wallet-client.js` exists; alternatively the user can test from the browser console on casino-game.hillmanchan.com once signed in.)

```bash
curl -s -X POST https://api.system-design.hillmanchan.com/poker/wallet-nonexistent \
  -H "content-type: application/json" -d '{}'
```

Expected: 401 as well (auth runs before dispatch) — confirms no accidental public exposure.

- [ ] **Step 4: Report deploy state to the user**

Summarize: tests green, Lambda deployed, rules deployed, smoke results. Production impact so far: zero (no frontend calls these actions until Plan 2 ships).

---

## Self-Review Notes

- **Spec coverage:** wallet-get/bet/payout/reset/admin-adjust ✓, signup grant ✓, 6h cooldown env-tunable ✓, per-betType caps from real pay tables (`side-bets.js:10-30`, baccarat `constants.js:42-89`) ✓, rate limit new-rounds-only ✓, idempotent retries ✓, admin-list-users balance ✓, Firestore rules ✓. UTH escrow + `resetThreshold`-vs-UTH-buy-in interplay is Plan 4. Frontend `table-config.js` mirror is Plan 2.
- **Numbers pinned here, verified in Plan 3:** each game conversion task must assert its client pay table matches `GAME_TABLES` maxReturns (e.g. if baccarat egalité config was customized, the 226 cap is checked against `EGALITE_PAYOUTS`).
- **Known trade-off:** `wallet-get` performs a write-on-read for new users (signup grant). Idempotent by transaction; acceptable.
