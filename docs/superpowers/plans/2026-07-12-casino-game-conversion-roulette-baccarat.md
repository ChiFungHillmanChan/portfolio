# Casino Game Conversion — Roulette + Baccarat (Plan 3 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Roulette and Baccarat from local custom-bankroll play to the shared server wallet (debit at bet-lock, credit at settle, fixed table limits, login gate), via a reusable game-session adapter — plus the backend prerequisites (open-round reconciliation + bet-table adjustments) and moving Blackjack Normal Shoe to Practice.

**Architecture:** A new pure adapter `js/wallet/game-session.js` wraps the Plan-2 wallet client + game gate + HUD, exposing `commitBet / topUp / settle / getBalance / hasOpenRound` to a game page. Each game supplies a pure `mapBets(gameBetState) → {serverBetType: amount}` collapsing its rich bet keys into the server's payout-class buckets. Roulette and Baccarat each get surgical edits at their single debit/settle seams. The client keeps computing payouts; the server caps them (unchanged threat model).

**Tech Stack:** Vanilla ES modules, `node --test`, existing `js/wallet/` platform (Plan 2), deployed cg-poker wallet API (Plan 1).

**Spec:** `docs/superpowers/specs/2026-07-12-casino-lobby-credits-design.md`
**Depends on:** Plan 1 (backend, deployed) + Plan 2 (frontend platform: wallet-client, game-gate, wallet-hud, wallet-bootstrap, table-config — all merged on this branch). Plan 4 = Blackjack game-mode; Plan 5 = UTH escrow.

## Global Constraints

- **No sync to `public/`.** Everything stays in `src/`; the whole redesign ships together after Plan 5. No task runs the public sync.
- **Wallet tests run via** `node --test js/wallet/*.test.mjs` (GLOB form) from the `calculator/` dir. Game tests live under each game's `tests/` dir with its own dev `package.json` `{"type":"module"}` (mirror `ultimate-texas-holdem/`), run via `node --test <game>/tests/*.test.mjs`.
- **Server is authoritative; client computes-and-caps.** The client sends its computed payout with a per-betType breakdown; the server caps it at `Σ amount × maxReturn`. Never trust a client balance — always apply the server-confirmed `balance` from each response.
- **gameIds:** `roulette`, `baccarat` (Plan 3). `blackjack` is Plan 4; `blackjack-shoe` is dropped from the wallet (→ Practice).
- **Server bet-table caps (post-Task-1 values, client mirror must match exactly):**
  - Roulette: every betType `{min:100, max:20000}` (per-class aggregate ceiling = maxTotalBet; per-spot 5,000 is CLIENT-side UX only), `maxTotalBet:20000`, maxReturns: straight 36, split 18, street 12, corner 9, sixline 6, column 3, dozen 3, evenMoney 2.
  - Baccarat: player/banker `{min:500,max:10000}` (×2 / ×1.95), tie `{100,1000}` ×9, playerPair/bankerPair `{100,1000}` ×12, dragonBonus `{100,2000}` ×31, egalite `{100,10000}` ×226, `maxTotalBet:25000`.
- **Bet-type mapping (game keys → server buckets), pure, unit-tested per game:**
  - Roulette: straight→straight, split→split, street & trio→street, corner & firstFour & topLine→corner, line→sixline, column→column, dozen→dozen, red/black/even/odd/low/high→evenMoney. (Amounts summed per bucket. topLine's true 6:1 ×7 < corner cap ×9 — loose-but-safe.)
  - Baccarat: player→player, banker→banker, tie→tie, playerPair→playerPair, bankerPair→bankerPair, dragonPlayer & dragonBanker→dragonBonus, egalite0..egalite9→egalite. (Amounts summed per bucket.)
- **Integer chips** everywhere.
- **Parallel session note:** a separate Claude session commits `casino-3d` work to this same branch. Every task: `git status --short` first, stage ONLY the task's own files, never `git add -A`.

## Money-flow seams (from exploration — cite when editing)

| Game | Debit seam (lock bets) | Settle seam (single credit point) | Bankroll seed to remove |
|---|---|---|---|
| Roulette | `roulette/js/ui/event-handlers.js` `handleSpinClick()` (~:377), just before `setGamePhase(SPINNING)` (~:399) | `updateBankroll(resolution.netResult)` at `event-handlers.js:422` | setup panel + `initializeBankroll` (`game-state.js:62`) |
| Baccarat | `baccarat/game-mode/js/init.js` `handleDeal()` BETTING branch (~:288) around `startNewRound()` | `updateBankroll(netChange)` at `baccarat/game-mode/js/game-logic.js:311` | setup panel + `initializeBankroll` (`state.js:76`) |

Both settlement functions (`resolveAllBets`, `calculateWinnings`) are already pure and stay client-side (client-computes/server-caps).

---

### Task 1: Backend — open-round reconciliation in `wallet-get` + roulette/baccarat table caps

**Files (system-architecture repo, LOCAL-ONLY, branch feat/casino-wallet):**
- Modify: `lambda/poker/wallet-logic.mjs` (GAME_TABLES roulette + baccarat)
- Modify: `lambda/poker/wallet.mjs` (`actWalletGet` returns openRounds)
- Modify: `lambda/poker/wallet-logic.test.mjs` + `lambda/poker/wallet.test.mjs`

**Interfaces:**
- Produces: `actWalletGet` response gains `openRounds: { [gameId]: { roundId, bets } }` (the `at`/`wager` fields stripped). Consumed by Task 2's `wallet-client.load()`.
- GAME_TABLES roulette/baccarat caps updated per Global Constraints.

- [ ] **Step 1: Write failing wallet-logic tests for the new caps**

Add to `lambda/poker/wallet-logic.test.mjs`:

```js
test("roulette per-betType max is the table total (aggregating spots)", () => {
  assert.equal(GAME_TABLES.roulette.betTypes.evenMoney.max, 20000);
  assert.equal(GAME_TABLES.roulette.betTypes.straight.max, 20000);
  assert.equal(GAME_TABLES.roulette.maxTotalBet, 20000);
  // aggregate evenMoney bet up to the total is accepted
  const w = { ...initialWallet(NOW), balance: 100000 };
  const r = applyBet(w, { gameId: "roulette", roundId: "r1", bets: { evenMoney: 20000 } }, NOW);
  assert.equal(r.error, undefined);
  // its payout cap is 20000 × 2 = 40000
  const p = applyPayout(r.wallet, { gameId: "roulette", roundId: "r1", payout: 40000 }, NOW + 5000);
  assert.equal(p.error, undefined);
  const over = applyPayout(r.wallet, { gameId: "roulette", roundId: "r1", payout: 40001 }, NOW + 5000);
  assert.equal(over.error, "payout-exceeds-cap");
});

test("baccarat dragonBonus and egalite maxes hold aggregated bets", () => {
  assert.equal(GAME_TABLES.baccarat.betTypes.dragonBonus.max, 2000);
  assert.equal(GAME_TABLES.baccarat.betTypes.egalite.max, 10000);
  assert.equal(GAME_TABLES.baccarat.maxTotalBet, 25000);
  const w = { ...initialWallet(NOW), balance: 100000 };
  const r = applyBet(w, { gameId: "baccarat", roundId: "b1", bets: { egalite: 10000, dragonBonus: 2000 } }, NOW);
  assert.equal(r.error, undefined);
  // egalite cap ×226 dominates: 10000×226 + 2000×31 = 2,260,000 + 62,000
  const p = applyPayout(r.wallet, { gameId: "baccarat", roundId: "b1", payout: 2_322_000 }, NOW + 5000);
  assert.equal(p.error, undefined);
});
```

- [ ] **Step 2: Run — verify the new tests fail**

`cd /Users/hillmanchan/Desktop/system-architecture/lambda/poker && npm test` → FAIL (evenMoney.max is still 5000, dragonBonus.max still 1000, etc.).

- [ ] **Step 3: Update GAME_TABLES in `wallet-logic.mjs`**

Replace the `roulette` and `baccarat` entries with:

```js
  roulette: {
    maxTotalBet: 20000,
    betTypes: {
      // Per-class max = the table total: many same-class spots aggregate into
      // one bucket, so the only hard ceiling is maxTotalBet. Per-SPOT limits
      // (e.g. 5,000/straight) are enforced client-side as a UX rule; they are
      // not an anti-mint control — the payout cap is. maxReturn is unchanged.
      straight:  { min: 100, max: 20000, maxReturn: 36 },
      split:     { min: 100, max: 20000, maxReturn: 18 },
      street:    { min: 100, max: 20000, maxReturn: 12 },
      corner:    { min: 100, max: 20000, maxReturn: 9 },
      sixline:   { min: 100, max: 20000, maxReturn: 6 },
      column:    { min: 100, max: 20000, maxReturn: 3 },
      dozen:     { min: 100, max: 20000, maxReturn: 3 },
      evenMoney: { min: 100, max: 20000, maxReturn: 2 },
    },
  },
  baccarat: {
    maxTotalBet: 25000,
    betTypes: {
      player:      { min: 500, max: 10000, maxReturn: 2 },
      banker:      { min: 500, max: 10000, maxReturn: 1.95 },
      tie:         { min: 100, max: 1000,  maxReturn: 9 },
      playerPair:  { min: 100, max: 1000,  maxReturn: 12 },
      bankerPair:  { min: 100, max: 1000,  maxReturn: 12 },
      dragonBonus: { min: 100, max: 2000,  maxReturn: 31 },  // dragonPlayer + dragonBanker aggregate
      egalite:     { min: 100, max: 10000, maxReturn: 226 }, // egalite0..9 aggregate
    },
  },
```

(Leave `blackjack` and `blackjack-shoe` entries unchanged — Plan 4 handles blackjack; blackjack-shoe stays defined but the client never calls it.)

- [ ] **Step 4: Write failing wallet.mjs test for openRounds in wallet-get**

Add to `lambda/poker/wallet.test.mjs`:

```js
test("wallet-get returns open rounds (roundId + bets, stripped) for reconciliation", async () => {
  const seed = {
    "casinoWallet/u1": {
      balance: 50000, createdAt: "x", updatedAt: "x", lastResetAt: null, resetCount: 0,
      totalWagered: 600, totalWon: 0,
      openRounds: { roulette: { roundId: "r9", bets: { straight: 100 }, wager: 100, at: 123 } },
      lastRounds: {}, lastNewRoundAt: {},
    },
  };
  const { dbFn } = fakeDb(seed);
  const res = await actWalletGet(ctxFor(dbFn));
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload.openRounds, { roulette: { roundId: "r9", bets: { straight: 100 } } });
});

test("wallet-get returns empty openRounds object when none", async () => {
  const { dbFn } = fakeDb();
  const res = await actWalletGet(ctxFor(dbFn));
  assert.deepEqual(res.payload.openRounds, {});
});
```

- [ ] **Step 5: Run — verify it fails**

`npm test` → FAIL (`openRounds` undefined in the response).

- [ ] **Step 6: Add openRounds to `actWalletGet` in `wallet.mjs`**

Replace `actWalletGet` with:

```js
export async function actWalletGet(ctx) {
  const result = await withWallet(ctx, ctx.uid, (wallet, nowMs, exists) => ({
    wallet,
    skipWrite: exists,
  }));
  const { canReset, resetAvailableAt } = resetAvailability(result.wallet, result.nowMs);
  // Strip each open round to the fields the client needs to reconcile
  // (roundId + bets); the server's `at`/`wager` are internal.
  const openRounds = {};
  for (const [gameId, round] of Object.entries(result.wallet.openRounds || {})) {
    openRounds[gameId] = { roundId: round.roundId, bets: round.bets };
  }
  return ctx.respond(
    200,
    { ok: true, balance: result.wallet.balance, canReset, resetAvailableAt, openRounds },
    ctx.origin
  );
}
```

- [ ] **Step 7: Run full suite green + syntax check**

`node --check wallet.mjs && node --check wallet-logic.mjs && npm test` → all PASS.

- [ ] **Step 8: Commit**

```bash
cd /Users/hillmanchan/Desktop/system-architecture
git add lambda/poker/wallet-logic.mjs lambda/poker/wallet.mjs lambda/poker/wallet-logic.test.mjs lambda/poker/wallet.test.mjs
git commit -m "feat(cg-poker): wallet-get returns open rounds + roulette/baccarat aggregate caps"
```

(Deploy happens in Task 7, gated on user confirmation.)

---

### Task 2: Client — `load()` reconciliation + table-config mirror

**Files (portfolio repo, branch feat/casino-lobby-credits):**
- Modify: `calculator/js/wallet/wallet-client.js` (`load()` reconciles storage with server openRounds)
- Modify: `calculator/js/wallet/wallet-client.test.mjs`
- Modify: `calculator/js/wallet/table-config.js` (GAME_TABLES roulette + baccarat mirror)
- Modify: `calculator/js/wallet/table-config.test.mjs`

**Interfaces:**
- Consumes: Task-1 wallet-get `openRounds` shape.
- Produces: after `load()`, local stored rounds exactly mirror the server's open rounds (server authoritative). `getBalance()` unchanged. Consumed by Task 3 adapter.

- [ ] **Step 1: Write failing reconciliation tests**

Add to `calculator/js/wallet/wallet-client.test.mjs` (uses existing fakePost/fakeStorage/deps helpers):

```js
test("load() adopts a server open round the client didn't know about", async () => {
  const storage = fakeStorage(); // client has no local round
  const post = fakePost([{ status: 200, body: {
    ok: true, balance: 99400, canReset: false, resetAvailableAt: null,
    openRounds: { roulette: { roundId: "r9", bets: { straight: 100, evenMoney: 500 } } },
  }}]);
  const c = createWalletClient(deps(post, storage));
  await c.load();
  assert.deepEqual(c.openRound("roulette"), { roundId: "r9", bets: { straight: 100, evenMoney: 500 } });
});

test("load() clears a local round the server no longer has open", async () => {
  const storage = fakeStorage();
  storage.setItem("casinoWallet:round:roulette", JSON.stringify({ roundId: "stale", bets: { straight: 100 } }));
  const post = fakePost([{ status: 200, body: {
    ok: true, balance: 100000, canReset: false, resetAvailableAt: null, openRounds: {},
  }}]);
  const c = createWalletClient(deps(post, storage));
  await c.load();
  assert.equal(c.openRound("roulette"), null);
});

test("load() tolerates a wallet-get without openRounds (back-compat)", async () => {
  const storage = fakeStorage();
  storage.setItem("casinoWallet:round:roulette", JSON.stringify({ roundId: "keep", bets: { straight: 100 } }));
  const post = fakePost([{ status: 200, body: { ok: true, balance: 100000, canReset: false, resetAvailableAt: null } }]);
  const c = createWalletClient(deps(post, storage));
  await c.load();
  // no openRounds key → don't touch local rounds
  assert.deepEqual(c.openRound("roulette"), { roundId: "keep", bets: { straight: 100 } });
});
```

- [ ] **Step 2: Run — verify fail**

`cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator && node --test js/wallet/wallet-client.test.mjs` → FAIL (load doesn't reconcile).

- [ ] **Step 3: Reconcile in `load()`**

In `wallet-client.js`, replace `load()` with:

```js
    async load() {
      const body = settleResponse(await post("wallet-get", {}));
      balance = body.balance;
      canReset = !!body.canReset;
      resetAvailableAt = body.resetAvailableAt || null;
      // Reconcile local open rounds with the server (authoritative): adopt any
      // round the server has open (e.g. a bet whose response we lost), and drop
      // any local round the server no longer has (settled/forfeited elsewhere).
      // Only when the server actually sends openRounds (back-compat guard).
      if (body.openRounds && typeof body.openRounds === "object") {
        const serverGames = new Set(Object.keys(body.openRounds));
        for (const [gameId, round] of Object.entries(body.openRounds)) {
          if (round && typeof round.roundId === "string" && round.bets) {
            writeRound(gameId, { roundId: round.roundId, bets: round.bets });
          }
        }
        // Drop stale local rounds for known wallet games not in the server set.
        for (const gameId of ["roulette", "baccarat", "blackjack"]) {
          if (!serverGames.has(gameId) && readRound(gameId)) clearRound(gameId);
        }
      }
      notify();
      return { balance, canReset, resetAvailableAt };
    },
```

- [ ] **Step 4: Run — verify pass**

`node --test js/wallet/wallet-client.test.mjs` → PASS.

- [ ] **Step 5: Write failing table-config mirror tests**

In `calculator/js/wallet/table-config.test.mjs`, update/extend the numbers test:

```js
test("roulette mirror uses aggregate caps (max = total)", () => {
  for (const bt of Object.values(GAME_TABLES.roulette.betTypes)) {
    assert.equal(bt.max, 20000);
    assert.equal(bt.min, 100);
  }
  assert.equal(GAME_TABLES.roulette.betTypes.straight.maxReturn, 36);
  assert.equal(GAME_TABLES.roulette.betTypes.evenMoney.maxReturn, 2);
  assert.equal(GAME_TABLES.roulette.maxTotalBet, 20000);
});

test("baccarat mirror matches the server aggregate caps", () => {
  assert.deepEqual(GAME_TABLES.baccarat.betTypes.dragonBonus, { min: 100, max: 2000, maxReturn: 31, mergeFactor: 1 });
  assert.deepEqual(GAME_TABLES.baccarat.betTypes.egalite, { min: 100, max: 10000, maxReturn: 226, mergeFactor: 1 });
  assert.equal(GAME_TABLES.baccarat.maxTotalBet, 25000);
});
```

(Remove/adjust any prior assertion that pinned roulette max to 5000 or baccarat egalite to 1000.)

- [ ] **Step 6: Update `table-config.js` GAME_TABLES roulette + baccarat**

Match the server exactly (keep the existing `mergeFactor: 1` on every betType for shape parity with blackjack):

```js
  roulette: {
    maxTotalBet: 20000,
    betTypes: {
      straight:  { min: 100, max: 20000, maxReturn: 36, mergeFactor: 1 },
      split:     { min: 100, max: 20000, maxReturn: 18, mergeFactor: 1 },
      street:    { min: 100, max: 20000, maxReturn: 12, mergeFactor: 1 },
      corner:    { min: 100, max: 20000, maxReturn: 9,  mergeFactor: 1 },
      sixline:   { min: 100, max: 20000, maxReturn: 6,  mergeFactor: 1 },
      column:    { min: 100, max: 20000, maxReturn: 3,  mergeFactor: 1 },
      dozen:     { min: 100, max: 20000, maxReturn: 3,  mergeFactor: 1 },
      evenMoney: { min: 100, max: 20000, maxReturn: 2,  mergeFactor: 1 },
    },
  },
  baccarat: {
    maxTotalBet: 25000,
    betTypes: {
      player:      { min: 500, max: 10000, maxReturn: 2,    mergeFactor: 1 },
      banker:      { min: 500, max: 10000, maxReturn: 1.95, mergeFactor: 1 },
      tie:         { min: 100, max: 1000,  maxReturn: 9,    mergeFactor: 1 },
      playerPair:  { min: 100, max: 1000,  maxReturn: 12,   mergeFactor: 1 },
      bankerPair:  { min: 100, max: 1000,  maxReturn: 12,   mergeFactor: 1 },
      dragonBonus: { min: 100, max: 2000,  maxReturn: 31,   mergeFactor: 1 },
      egalite:     { min: 100, max: 10000, maxReturn: 226,  mergeFactor: 1 },
    },
  },
```

Also update the `LOBBY_GAMES` roulette `limitsText` to `"100 – 5,000 / spot"` (unchanged) and baccarat to `"500 – 10,000"` (unchanged) — the per-spot UX numbers, not the aggregate caps.

- [ ] **Step 7: Run all wallet tests green**

`node --test js/wallet/*.test.mjs` → all PASS.

- [ ] **Step 8: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/casino-game/calculator/js/wallet/wallet-client.js \
        portfolio/src/game/casino-game/calculator/js/wallet/wallet-client.test.mjs \
        portfolio/src/game/casino-game/calculator/js/wallet/table-config.js \
        portfolio/src/game/casino-game/calculator/js/wallet/table-config.test.mjs
git commit -m "feat(casino): wallet-client load() reconciles server open rounds + table caps mirror"
```

---

### Task 3: Shared game-session adapter

**Files:**
- Create: `calculator/js/wallet/game-session.js`
- Create: `calculator/js/wallet/game-session.test.mjs`

**Interfaces:**
- Consumes: `walletClient`, `onAuth`, `signIn` from `wallet-bootstrap.js`; `computeGateState`, `mountGameGate` from `game-gate.js`; `mountWalletHud` from `wallet-hud.js`; `getTable` from `table-config.js`; `WalletError` from `wallet-client.js`.
- Produces: `createGameSession({ gameId, mapBets, walletClient, gate, minBet })` → session object:
  - `commitBet(gameBets) → Promise<{roundId, balance}>` — maps gameBets → server breakdown via `mapBets`, calls `walletClient.bet(gameId, breakdown)`. Throws `WalletError` (insufficient-balance / too-fast / bad-bets / over-table-max / round-in-progress).
  - `topUp(gameBets) → Promise<{balance}>` — maps + `walletClient.topUp` (used by Plan 4 blackjack; harmless here).
  - `settle(payout) → Promise<{balance}>` — `walletClient.payout(gameId, payout)`.
  - `getBalance() → number | null`, `hasOpenRound() → boolean`, `openRound() → {roundId, bets} | null`.
  - `mapBets` is a pure `(gameBetState) → { serverBetType: integerAmount }` supplied by each game (only positive amounts included).
  - The pure, tested core is `sessionCore({ mapBets, walletClient, gameId })`; the DOM (`mountGate`, HUD) is a thin wrapper verified in the game tasks.

- [ ] **Step 1: Write failing tests**

Create `calculator/js/wallet/game-session.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { sessionCore } from "./game-session.js";
import { WalletError } from "./wallet-client.js";

// Minimal fake wallet client capturing calls.
function fakeWallet() {
  const calls = [];
  return {
    calls,
    _balance: 100000,
    getBalance() { return this._balance; },
    openRound(g) { return this._open || null; },
    async bet(gameId, bets) { calls.push(["bet", gameId, bets]); this._open = { roundId: "R", bets }; this._balance -= 600; return { balance: this._balance, roundId: "R" }; },
    async topUp(gameId, bets) { calls.push(["topUp", gameId, bets]); return { balance: this._balance }; },
    async payout(gameId, payout) { calls.push(["payout", gameId, payout]); this._open = null; this._balance += payout; return { balance: this._balance }; },
  };
}

const rouletteMap = (state) => {
  // demo mapper: state is {evenMoney, straight}
  const out = {};
  for (const [k, v] of Object.entries(state)) if (v > 0) out[k] = v;
  return out;
};

test("commitBet maps game bets and debits via wallet.bet", async () => {
  const w = fakeWallet();
  const s = sessionCore({ gameId: "roulette", mapBets: rouletteMap, walletClient: w });
  const r = await s.commitBet({ straight: 100, evenMoney: 500, red: 0 });
  assert.deepEqual(w.calls[0], ["bet", "roulette", { straight: 100, evenMoney: 500 }]);
  assert.equal(r.balance, 99400);
  assert.equal(r.roundId, "R");
});

test("commitBet rejects an empty bet before hitting the server", async () => {
  const w = fakeWallet();
  const s = sessionCore({ gameId: "roulette", mapBets: rouletteMap, walletClient: w });
  await assert.rejects(() => s.commitBet({ straight: 0 }), (e) => e instanceof WalletError && e.code === "empty-bet");
  assert.equal(w.calls.length, 0);
});

test("settle credits via wallet.payout", async () => {
  const w = fakeWallet();
  const s = sessionCore({ gameId: "roulette", mapBets: rouletteMap, walletClient: w });
  await s.commitBet({ straight: 100 });
  const r = await s.settle(3600);
  assert.deepEqual(w.calls[1], ["payout", "roulette", 3600]);
  assert.equal(r.balance, 99400 - 100 + 3600 + 100); // fake adds payout to post-bet balance
});

test("hasOpenRound reflects the wallet client", async () => {
  const w = fakeWallet();
  const s = sessionCore({ gameId: "roulette", mapBets: rouletteMap, walletClient: w });
  assert.equal(s.hasOpenRound(), false);
  await s.commitBet({ straight: 100 });
  assert.equal(s.hasOpenRound(), true);
});

test("commitBet surfaces WalletError from the client (e.g. insufficient)", async () => {
  const w = fakeWallet();
  w.bet = async () => { throw new WalletError("insufficient-balance", { status: 400 }); };
  const s = sessionCore({ gameId: "roulette", mapBets: rouletteMap, walletClient: w });
  await assert.rejects(() => s.commitBet({ straight: 100 }), (e) => e.code === "insufficient-balance");
});
```

- [ ] **Step 2: Run — verify fail**

`node --test js/wallet/game-session.test.mjs` → FAIL (module missing).

- [ ] **Step 3: Implement `game-session.js`**

```js
// game-session.js — reusable glue between a wallet game page and the wallet
// platform. sessionCore() is pure (tested with a fake wallet client); the
// default createGameSession() wires the real singleton + DOM gate + HUD.
//
// Each game supplies a pure mapBets(gameBetState) → { serverBetType: amount }
// that collapses the game's rich bet keys into the server's payout-class
// buckets (only positive integer amounts included). The client keeps computing
// payouts; settle() sends the computed number and the server caps it.

import { WalletError } from "./wallet-client.js";

export function sessionCore({ gameId, mapBets, walletClient }) {
  const buildBreakdown = (gameBets) => {
    const raw = mapBets(gameBets) || {};
    const breakdown = {};
    let total = 0;
    for (const [type, amount] of Object.entries(raw)) {
      if (Number.isInteger(amount) && amount > 0) { breakdown[type] = amount; total += amount; }
    }
    return { breakdown, total };
  };

  return {
    getBalance() { return walletClient.getBalance(); },
    hasOpenRound() { return walletClient.openRound(gameId) !== null; },
    openRound() { return walletClient.openRound(gameId); },

    async commitBet(gameBets) {
      const { breakdown, total } = buildBreakdown(gameBets);
      if (total <= 0) throw new WalletError("empty-bet", { status: 0 });
      return walletClient.bet(gameId, breakdown);
    },

    async topUp(gameBets) {
      const { breakdown, total } = buildBreakdown(gameBets);
      if (total <= 0) throw new WalletError("empty-bet", { status: 0 });
      return walletClient.topUp(gameId, breakdown);
    },

    async settle(payout) {
      const p = Number.isInteger(payout) && payout > 0 ? payout : 0;
      return walletClient.payout(gameId, p);
    },
  };
}

// Real wiring: gate + HUD + auth, returning the sessionCore plus mount helpers.
// gameEl = the game's root; hudHost = where the balance pill goes; onReady is
// called with the session once signed in + wallet loaded (balance known).
export async function createGameSession({ gameId, mapBets, minBet, gameEl, hudHost, onReady, onSignedOut }) {
  const bootstrap = (await import("./wallet-bootstrap.js")).default;
  const { walletClient } = bootstrap;
  const { mountGameGate, computeGateState } = await import("./game-gate.js");
  const { mountWalletHud } = await import("./wallet-hud.js");

  const core = sessionCore({ gameId, mapBets, walletClient });
  const gate = mountGameGate({
    container: gameEl,
    onSignIn: () => bootstrap.signIn().catch((e) => { console.error(e); alert("Sign-in failed: " + (e?.code || e?.message || "try again")); }),
    onReset: () => walletClient.reset().catch((e) => {
      const when = e && e.retryAt ? ` (try again after ${new Date(e.retryAt).toLocaleTimeString()})` : "";
      alert("Reset unavailable" + when);
    }),
  });

  let hudMounted = false, readyFired = false;
  const refresh = (signedIn) => {
    const state = computeGateState({
      authReady: true, signedIn,
      balance: walletClient.getBalance(), minBet,
    });
    gate.update(state);
    if (signedIn && hudHost && !hudMounted) { mountWalletHud(hudHost, walletClient, {}); hudMounted = true; }
    if (state.mode === "ready" && !readyFired) { readyFired = true; onReady && onReady(core); }
    if (!signedIn) { readyFired = false; onSignedOut && onSignedOut(); }
  };

  bootstrap.onAuth(({ signedIn }) => refresh(signedIn));
  walletClient.subscribe(() => refresh(!!walletClient.getBalance() || walletClient.getBalance() === 0));
  return core;
}
```

- [ ] **Step 4: Run — verify pass**

`node --test js/wallet/game-session.test.mjs` → PASS. `node --check js/wallet/game-session.js` clean.

- [ ] **Step 5: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/casino-game/calculator/js/wallet/game-session.js \
        portfolio/src/game/casino-game/calculator/js/wallet/game-session.test.mjs
git commit -m "feat(casino): game-session adapter — sessionCore (pure) + gate/HUD wiring"
```

---

### Task 4: Roulette conversion

**Files:**
- Create: `roulette/js/wallet/bet-map.js` + `roulette/tests/bet-map.test.mjs` + `roulette/tests/package.json`
- Modify: `roulette/index.html` (drop setup panel include; add gate host + hud host + wallet module)
- Modify: `roulette/js/state/game-state.js` (remove local bankroll seed; balance comes from wallet)
- Modify: `roulette/js/ui/event-handlers.js` (debit at spin-lock; credit at settle)
- Create: `roulette/js/wallet/roulette-wallet.js` (boots the game-session for roulette)

**Interfaces:**
- Consumes: `sessionCore`/`createGameSession` (Task 3), `getTable` (table-config).
- Produces: `mapRouletteBets(betState) → { serverBetType: amount }` (pure). Roulette plays from the wallet; no setup panel.

- [ ] **Step 1: Write failing bet-map test**

Create `roulette/tests/package.json`:
```json
{ "//": "dev-only — node --test imports the ES modules. Not synced to public/.", "type": "module" }
```

Create `roulette/tests/bet-map.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mapRouletteBets } from "../js/wallet/bet-map.js";

test("collapses game bet keys into server payout-class buckets", () => {
  const betState = {
    straight: { "17": 100, "23": 200 },   // → straight 300
    split: { "17-20": 100 },               // → split 100
    street: { "1-2-3": 100 },              // → street 100
    trio: { "0-1-2": 50 },                 // → street (+50) = 150
    corner: { "1-2-4-5": 100 },            // → corner 100
    firstFour: 100,                        // → corner (+100) = 200
    topLine: 50,                           // → corner (+50) = 250
    line: { "1-2-3-4-5-6": 100 },          // → sixline 100
    column: { "1": 100 },                  // → column 100
    dozen: { "2": 100 },                   // → dozen 100
    red: 100, black: 50, even: 25, odd: 0, low: 0, high: 0, // → evenMoney 175
  };
  assert.deepEqual(mapRouletteBets(betState), {
    straight: 300, split: 100, street: 150, corner: 250,
    sixline: 100, column: 100, dozen: 100, evenMoney: 175,
  });
});

test("omits zero/empty buckets", () => {
  assert.deepEqual(mapRouletteBets({ red: 100 }), { evenMoney: 100 });
  assert.deepEqual(mapRouletteBets({}), {});
});

test("rounds/ignores non-positive amounts", () => {
  assert.deepEqual(mapRouletteBets({ straight: { "5": 0 }, red: 100 }), { evenMoney: 100 });
});
```

- [ ] **Step 2: Run — verify fail**

`cd roulette && node --test tests/bet-map.test.mjs` → FAIL (module missing).

- [ ] **Step 3: Implement `roulette/js/wallet/bet-map.js`**

```js
// bet-map.js — collapses roulette's rich betState into the server's 8
// payout-class buckets (pure; unit-tested). Object-map bet types
// (straight/split/street/trio/corner/line/column/dozen) hold {spotKey: amount};
// firstFour/topLine and the even-money flags hold flat amounts.
// Grouping is by payout class:
//   straight→straight, split→split, street&trio→street,
//   corner&firstFour&topLine→corner, line→sixline, column→column,
//   dozen→dozen, red/black/even/odd/low/high→evenMoney.

const sumMap = (m) => Object.values(m || {}).reduce((a, b) => a + (b > 0 ? b : 0), 0);

export function mapRouletteBets(betState) {
  const b = betState || {};
  const buckets = {
    straight: sumMap(b.straight),
    split: sumMap(b.split),
    street: sumMap(b.street) + sumMap(b.trio),
    corner: sumMap(b.corner) + (b.firstFour > 0 ? b.firstFour : 0) + (b.topLine > 0 ? b.topLine : 0),
    sixline: sumMap(b.line),
    column: sumMap(b.column),
    dozen: sumMap(b.dozen),
    evenMoney: ["red", "black", "even", "odd", "low", "high"].reduce((a, k) => a + (b[k] > 0 ? b[k] : 0), 0),
  };
  const out = {};
  for (const [k, v] of Object.entries(buckets)) if (v > 0) out[k] = v;
  return out;
}
```

- [ ] **Step 4: Run — verify pass**

`node --test tests/bet-map.test.mjs` → PASS.

- [ ] **Step 5: Boot module — `roulette/js/wallet/roulette-wallet.js`**

```js
// roulette-wallet.js — wires the roulette game to the shared wallet. Replaces
// the old setup panel: the game gate handles sign-in/insufficient/bust, and the
// player's chips ARE the wallet balance. Exposes window.rouletteWallet for the
// game code (event-handlers.js) to call at the debit/settle seams.

import { createGameSession } from "../../../js/wallet/game-session.js";
import { mapRouletteBets } from "./bet-map.js";

const LOWEST_MIN = 100; // lowest per-spot minimum

window.rouletteWallet = null;

createGameSession({
  gameId: "roulette",
  mapBets: mapRouletteBets,
  minBet: LOWEST_MIN,
  gameEl: document.body,
  hudHost: document.getElementById("walletHudHost"),
  onReady: (session) => {
    window.rouletteWallet = session;
    // If the server had an open round we didn't finish, the game can offer to
    // collect; for now, surface it so the player isn't silently charged.
    if (session.hasOpenRound()) {
      console.warn("[roulette] resuming an open round:", session.openRound());
    }
    document.dispatchEvent(new CustomEvent("wallet:ready"));
  },
  onSignedOut: () => { window.rouletteWallet = null; },
}).catch((e) => console.error("[roulette] wallet session failed:", e));
```

- [ ] **Step 6: Edit `roulette/index.html`** — remove the setup-panel injection; add gate/HUD hosts + the wallet module. Specifically: delete the `<div id="setup-container">` block (and any script that fetches `html/setup-panel.html` into it), add near the top of `<body>` `<div id="walletHudHost" class="game-wallet-hud"></div>`, and before `</body>` after the existing game scripts add:
```html
    <script type="module" src="js/wallet/roulette-wallet.js"></script>
```
Ensure `css/wallet.css` is linked (add `<link rel="stylesheet" href="../css/wallet.css">` in `<head>` if not present — the game pages are one directory below the lobby).

- [ ] **Step 7: Edit `game-state.js`** — remove the custom-bankroll seed. In `initializeBankroll` (`game-state.js:62`), stop seeding from a setup config; instead the displayed bankroll mirrors `window.rouletteWallet?.getBalance()`. Replace `gameState.bankroll.current` reads in the render path with the wallet balance. Concretely: keep `gameState.bankroll` for the in-round display but set `initial/current` from `window.rouletteWallet.getBalance()` when `wallet:ready` fires (add a listener in `init.js`), and have `canAffordBet` (`calculations.js:379`) check against `window.rouletteWallet.getBalance() - getTotalWagered()`.

- [ ] **Step 8: Edit the debit seam in `event-handlers.js` `handleSpinClick()`** (~:377). Before generating spin data / setting SPINNING phase, commit the bet to the wallet and abort on rejection:
```js
  // Wallet debit at bet-lock (replaces the old net-only settlement model).
  const session = window.rouletteWallet;
  if (!session) return; // not signed in / not ready — gate is showing
  try {
    await session.commitBet(getAllBets());
  } catch (err) {
    // insufficient-balance / too-fast / over-table-max / bad-bets → stay in BETTING
    showBetError(err.code || "bet-rejected");
    return;
  }
```
(`showBetError` = a small toast; if none exists, `alert("Bet rejected: " + code)`.) Make `handleSpinClick` `async` and `await` the commit.

- [ ] **Step 9: Edit the settle seam in `event-handlers.js`** (~:422). Replace `updateBankroll(resolution.netResult)` with a wallet settle sending the GROSS winnings, then apply the server-confirmed balance:
```js
  // Credit the wallet with gross winnings; the server caps at the published odds.
  try {
    await session.settle(Math.round(resolution.totalWinnings));
  } catch (err) {
    console.error("[roulette] settle failed:", err);
    // payout retries with the same roundId on next load (idempotent).
  }
  // Bankroll display now reflects the wallet (updated via its subscribe()).
```

- [ ] **Step 10: Run the bet-map test + node --check the new modules**

`node --test tests/bet-map.test.mjs` PASS; `node --check js/wallet/bet-map.js js/wallet/roulette-wallet.js` clean.

- [ ] **Step 11: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/casino-game/calculator/roulette/js/wallet/ \
        portfolio/src/game/casino-game/calculator/roulette/tests/ \
        portfolio/src/game/casino-game/calculator/roulette/index.html \
        portfolio/src/game/casino-game/calculator/roulette/js/state/game-state.js \
        portfolio/src/game/casino-game/calculator/roulette/js/core/calculations.js \
        portfolio/src/game/casino-game/calculator/roulette/js/ui/event-handlers.js \
        portfolio/src/game/casino-game/calculator/roulette/js/ui/init.js
git commit -m "feat(casino): roulette plays from the wallet — debit at lock, credit at settle"
```

- [ ] **Step 12: Browser verification (controller-assisted).** Serve `calculator/` and load `roulette/index.html`. Signed out → the gate overlay shows "Sign in to play with chips." Signed in with chips → gate dismisses, HUD shows balance, placing bets + spinning debits the wallet at lock and credits at settle (balance in the HUD moves, and matches a `wallet-get` in the network tab). Because a real Google sign-in is blocked in the local harness (API-key referrer), the CONTROLLER completes this against a real signed-in session or a deployed origin; the implementer verifies the signed-OUT gate + no console errors + that `getAllBets()`/`window.rouletteWallet` wire up (no ReferenceError). Note what was and wasn't verified in the report.

---

### Task 5: Baccarat conversion

**Files:**
- Create: `baccarat/game-mode/js/wallet/bet-map.js` + `baccarat/game-mode/tests/bet-map.test.mjs` + `baccarat/game-mode/tests/package.json`
- Modify: `baccarat/game-mode/index.html`
- Modify: `baccarat/game-mode/js/state.js` (remove local bankroll seed)
- Modify: `baccarat/game-mode/js/init.js` (debit at deal-lock)
- Modify: `baccarat/game-mode/js/game-logic.js` (credit at settle)
- Create: `baccarat/game-mode/js/wallet/baccarat-wallet.js`

**Interfaces:**
- Consumes: `createGameSession` (Task 3).
- Produces: `mapBaccaratBets(betState) → { serverBetType: amount }` (pure).

- [ ] **Step 1: Write failing bet-map test**

Create `baccarat/game-mode/tests/package.json`:
```json
{ "//": "dev-only — node --test imports the ES modules. Not synced to public/.", "type": "module" }
```

Create `baccarat/game-mode/tests/bet-map.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mapBaccaratBets } from "../js/wallet/bet-map.js";

test("maps flat baccarat bets to server buckets, aggregating dragon + egalite", () => {
  const betState = {
    player: 500, banker: 0, tie: 100,
    playerPair: 100, bankerPair: 0,
    dragonPlayer: 100, dragonBanker: 200,     // → dragonBonus 300
    egalite0: 100, egalite5: 200, egalite9: 100, // → egalite 400
  };
  assert.deepEqual(mapBaccaratBets(betState), {
    player: 500, tie: 100, playerPair: 100, dragonBonus: 300, egalite: 400,
  });
});

test("omits zero buckets and empty state", () => {
  assert.deepEqual(mapBaccaratBets({ banker: 500 }), { banker: 500 });
  assert.deepEqual(mapBaccaratBets({}), {});
});
```

- [ ] **Step 2: Run — verify fail**

`cd baccarat/game-mode && node --test tests/bet-map.test.mjs` → FAIL.

- [ ] **Step 3: Implement `baccarat/game-mode/js/wallet/bet-map.js`**

```js
// bet-map.js — collapses baccarat's flat betState into the server's buckets
// (pure; unit-tested). player/banker/tie/playerPair/bankerPair map 1:1;
// dragonPlayer + dragonBanker aggregate into dragonBonus; egalite0..egalite9
// aggregate into egalite.

const pos = (n) => (typeof n === "number" && n > 0 ? n : 0);

export function mapBaccaratBets(betState) {
  const b = betState || {};
  let egalite = 0;
  for (let i = 0; i <= 9; i++) egalite += pos(b["egalite" + i]);
  const buckets = {
    player: pos(b.player),
    banker: pos(b.banker),
    tie: pos(b.tie),
    playerPair: pos(b.playerPair),
    bankerPair: pos(b.bankerPair),
    dragonBonus: pos(b.dragonPlayer) + pos(b.dragonBanker),
    egalite,
  };
  const out = {};
  for (const [k, v] of Object.entries(buckets)) if (v > 0) out[k] = v;
  return out;
}
```

- [ ] **Step 4: Run — verify pass**

`node --test tests/bet-map.test.mjs` → PASS.

- [ ] **Step 5: Boot module — `baccarat/game-mode/js/wallet/baccarat-wallet.js`**

```js
// baccarat-wallet.js — wires baccarat to the shared wallet (mirrors
// roulette-wallet.js). window.baccaratWallet is the session the game calls at
// the deal-lock debit + settle credit seams.

import { createGameSession } from "../../../../js/wallet/game-session.js";
import { mapBaccaratBets } from "./bet-map.js";

const LOWEST_MIN = 100; // lowest bucket minimum (tie/pairs/dragon/egalite)

window.baccaratWallet = null;

createGameSession({
  gameId: "baccarat",
  mapBets: mapBaccaratBets,
  minBet: LOWEST_MIN,
  gameEl: document.body,
  hudHost: document.getElementById("walletHudHost"),
  onReady: (session) => {
    window.baccaratWallet = session;
    if (session.hasOpenRound()) console.warn("[baccarat] resuming open round:", session.openRound());
    document.dispatchEvent(new CustomEvent("wallet:ready"));
  },
  onSignedOut: () => { window.baccaratWallet = null; },
}).catch((e) => console.error("[baccarat] wallet session failed:", e));
```

(Note the `../../../../js/wallet/` depth — baccarat/game-mode/js/wallet/ is four levels below `calculator/`.)

- [ ] **Step 6: Edit `baccarat/game-mode/index.html`** — remove the setup-panel include/injection; add `<div id="walletHudHost" class="game-wallet-hud"></div>` near the top of `<body>`, link `../../css/wallet.css` in `<head>`, and before `</body>` after the game scripts:
```html
    <script type="module" src="js/wallet/baccarat-wallet.js"></script>
```

- [ ] **Step 7: Edit `state.js`** — remove the custom-bankroll seed. `initializeBankroll` (`state.js:76`) no longer takes a setup stack; the display mirrors `window.baccaratWallet?.getBalance()`. `addBet`'s affordability check (`state.js:300`) uses `window.baccaratWallet.getBalance() - getTotalWagered()`. Seed the display from the wallet on a `wallet:ready` listener (added in `init.js`).

- [ ] **Step 8: Edit the debit seam in `init.js` `handleDeal()`** BETTING branch (~:288). Before `startNewRound()` flips to DEALING, commit the bet:
```js
  const session = window.baccaratWallet;
  if (!session) return; // gate is showing
  try {
    await session.commitBet(getAllBetsForServer()); // returns the flat betState
  } catch (err) {
    showBetError(err.code || "bet-rejected");
    return;
  }
```
Make `handleDeal` `async`. `getAllBetsForServer()` returns the flat `betState` object the mapper expects (the current `betState` snapshot).

- [ ] **Step 9: Edit the settle seam in `game-logic.js` `resolveRound()`** (`:311`). Replace `updateBankroll(netChange)` with a wallet settle sending gross winnings:
```js
  // Credit the wallet with gross winnings; the server caps at published odds.
  const session = window.baccaratWallet;
  if (session) {
    session.settle(Math.round(winnings.totalWin)).catch((e) => console.error("[baccarat] settle failed:", e));
  }
  // Display reflects the wallet via its subscribe().
```

- [ ] **Step 10: Run the bet-map test + node --check**

`node --test tests/bet-map.test.mjs` PASS; `node --check js/wallet/bet-map.js js/wallet/baccarat-wallet.js` clean.

- [ ] **Step 11: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/casino-game/calculator/baccarat/game-mode/js/wallet/ \
        portfolio/src/game/casino-game/calculator/baccarat/game-mode/tests/ \
        portfolio/src/game/casino-game/calculator/baccarat/game-mode/index.html \
        portfolio/src/game/casino-game/calculator/baccarat/game-mode/js/state.js \
        portfolio/src/game/casino-game/calculator/baccarat/game-mode/js/init.js \
        portfolio/src/game/casino-game/calculator/baccarat/game-mode/js/game-logic.js
git commit -m "feat(casino): baccarat plays from the wallet — debit at deal, credit at settle"
```

- [ ] **Step 12: Browser verification (controller-assisted)** — same protocol as roulette Task 4 Step 12, for `baccarat/game-mode/index.html`.

---

### Task 6: Move Blackjack Normal Shoe to Practice

**Files:**
- Modify: `calculator/js/wallet/table-config.js` (LOBBY_GAMES − blackjack-shoe; PRACTICE_GAMES + normal shoe)
- Modify: `calculator/js/wallet/table-config.test.mjs`
- Modify: `calculator/index.html` (remove the Normal Shoe lobby card; add it to the Practice zone; hamburger)

**Interfaces:**
- Produces: LOBBY_GAMES = roulette, blackjack, baccarat, uth (4 entries); PRACTICE_GAMES includes Blackjack Normal Shoe.

- [ ] **Step 1: Update the table-config test**

In `table-config.test.mjs`, change the LOBBY_GAMES id assertion to:
```js
test("LOBBY_GAMES has the 4 playable lobby entries", () => {
  assert.deepEqual(LOBBY_GAMES.map((g) => g.id), ["roulette", "blackjack", "baccarat", "uth"]);
});

test("PRACTICE_GAMES includes the normal-shoe counting trainer", () => {
  assert.ok(PRACTICE_GAMES.some((g) => /normal shoe/i.test(g.name)));
});
```

- [ ] **Step 2: Run — verify fail**

`node --test js/wallet/table-config.test.mjs` → FAIL (blackjack-shoe still in LOBBY_GAMES).

- [ ] **Step 3: Update `table-config.js`** — remove the `blackjack-shoe` entry from `LOBBY_GAMES`; add to `PRACTICE_GAMES`:
```js
  { name: "Blackjack Normal Shoe", href: "blackjack/normal-shoe/index.html",
    blurb: "Full-shoe card-counting trainer — Hi-Lo count, true count, optimal play." },
```

- [ ] **Step 4: Run — verify pass**

`node --test js/wallet/*.test.mjs` → PASS.

- [ ] **Step 5: Edit `calculator/index.html`** — delete the Blackjack Normal Shoe card from the GAME LOBBY grid (`id=gameLobby`); add a Normal Shoe card to the PRACTICE grid (`id=practiceZone`):
```html
                <a href="blackjack/normal-shoe/index.html" class="game-card blackjack available">
                    <h3 class="game-name">Blackjack Normal Shoe</h3>
                    <p class="game-description">Full-shoe counting trainer — Hi-Lo, true count, optimal play.</p>
                </a>
```
In the hamburger dropdown, move the Normal Shoe / Blackjack link so the Game Lobby section lists only Roulette, Blackjack (game-mode), Baccarat, Ultimate Hold'em, and the Practice section gains "Blackjack Normal Shoe".

- [ ] **Step 6: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/casino-game/calculator/js/wallet/table-config.js \
        portfolio/src/game/casino-game/calculator/js/wallet/table-config.test.mjs \
        portfolio/src/game/casino-game/calculator/index.html
git commit -m "feat(casino): move Blackjack Normal Shoe from lobby to Practice (no betting loop)"
```

---

### Task 7: Deploy backend + integration verification

Deployment changes production. Confirm with the user before running.

- [ ] **Step 1: Deploy the cg-poker Lambda** (open-round reconciliation + new caps)

```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/poker
npm run deploy
aws lambda wait function-updated --function-name cg-poker --region eu-west-2
```
Expected: `LastUpdateStatus: Successful`.

- [ ] **Step 2: Smoke test — wallet-get now returns openRounds**

Use the authed round-trip harness (custom token + Referer header, per Plan-1's verification) OR a real browser session: call `wallet-get` and confirm the response includes an `openRounds` object. Confirm a roulette `wallet-bet` with `{evenMoney: 20000}` is accepted (aggregate cap) and a payout of `40000` is accepted while `40001` is rejected (`payout-exceeds-cap`).

- [ ] **Step 3: End-to-end game verification (controller-assisted)** — with the backend deployed and a real signed-in session, play one roulette round and one baccarat round: confirm the balance debits at bet-lock, credits at settle, the HUD tracks it, and a mid-round reload recovers the open round (reconciliation) instead of forfeiting. Because a real Google sign-in isn't drivable in the local harness, the controller does this against the deployed origin or a user session; otherwise document it as pending user confirmation.

- [ ] **Step 4: Report** — summarize: tests green, Lambda deployed, smoke results, what was browser-verified vs pending. Production impact: the new caps + openRounds are backward-compatible (existing wallets unaffected; the frontend isn't synced to public/ yet, so no user hits the converted games until the final release).

---

## Self-Review Notes

- **Spec coverage:** Section 5 per-game conversion (roulette, baccarat) ✓ (Tasks 4-5); fixed limits ✓ (Tasks 1-2 caps + client mirror); setup-panel removal ✓ (Tasks 4-5); round-in-progress persistence + reconciliation ✓ (Tasks 1-2); Normal Shoe → Practice ✓ (Task 6, spec updated). Blackjack game-mode = Plan 4; UTH escrow = Plan 5. Edge cases §6 (two tabs / balance bands / network failure at payout) handled by the Plan-1/2 mechanisms these tasks reuse.
- **Type consistency:** `commitBet/topUp/settle/getBalance/hasOpenRound/openRound` (Task 3) used identically in Tasks 4-5; `mapBets` signature `(gameBetState) → {serverBetType:int}` matches both `mapRouletteBets`/`mapBaccaratBets`; server caps (Task 1) mirrored exactly in the client (Task 2).
- **Known verification boundary:** the signed-IN game flows (debit/settle in the browser) need a real Google sign-in — not autonomously drivable in the local harness (Firebase API-key referrer). Each game task's Step 12 + Task 7 Step 3 defer that to the controller against a real session / deploy. The unit-tested pieces (bet maps, sessionCore, reconciliation, caps) carry the automated coverage.
- **Client-computes/server-caps preserved:** games still compute payouts (`resolveAllBets`/`calculateWinnings` stay client-side, pure); the server only debits, caps, and confirms balance.
