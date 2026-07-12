# Casino Frontend Platform Implementation Plan (Plan 2 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the client-side wallet platform (config, wallet client, HUD, game gate) and restructure the casino landing page into a login-aware GAME LOBBY + open PRACTICE split — WITHOUT converting any game's internals (that is Plan 3).

**Architecture:** Vanilla-JS ES modules under `calculator/js/wallet/`. Each module is a **pure, dependency-injected core** (tested with `node --test`) plus a thin DOM/wiring layer (browser-verified). The pure cores never import Firebase or touch `document` at import time, so Node can load them. One wiring module (`wallet-bootstrap.js`) constructs the real singleton from Firebase auth + the deployed Plan-1 wallet API.

**Tech Stack:** Vanilla ES modules, `node --test` + `node:assert`, existing `js/auth/` Firebase wrappers, CSS custom properties from `css/variables.css`.

**Spec:** `docs/superpowers/specs/2026-07-12-casino-lobby-credits-design.md`
**Depends on:** Plan 1 (wallet backend) — DEPLOYED. Actions live at `POST https://api.system-design.hillmanchan.com/poker/wallet-{get,bet,payout,reset}`.

## Global Constraints

- **No sync to `public/`.** Everything stays in `portfolio/src/game/casino-game/calculator/`. The whole redesign ships as one release at the end of Plan 4. Do NOT run the `public/games/casino-game/` sync in this plan.
- **Pure cores stay Node-loadable:** wallet-logic-style modules must not `import` from `https://…` and must not reference `document`/`window`/`localStorage`/`crypto` at module top level — only inside function bodies (mirrors `ultimate-texas-holdem/js/state/local-table.js`). All browser globals are injected as dependencies so tests pass fakes.
- **Tests run via** `node --test js/wallet/` from the `calculator/` dir. A dev-only `js/wallet/package.json` = `{"type":"module"}` makes Node treat the `.js` modules as ESM (mirrors `ultimate-texas-holdem/package.json`). That file is inert in browsers.
- **Server is authoritative.** `table-config.js` GAME_TABLES is a *mirror* of the Plan-1 server `GAME_TABLES` — the numbers must match exactly (roulette straight 100–5,000 ×36; blackjack main 500–10,000 ×2.5 mergeFactor 8; blackjack-shoe main 100–2,000 mergeFactor 8; baccarat player/banker 500–10,000, banker maxReturn 1.95; side bets per the server). gameIds: `roulette`, `blackjack`, `blackjack-shoe`, `baccarat`. UTH is not wallet-served here.
- **Error contract from Plan 1** (wallet-client must surface, not swallow): `{ok:false, error, retryAt?}` with HTTP 429 `too-fast` (retryAt ISO), 403 `cooldown`/`round-in-progress`/`not-busted` (retryAt ISO on cooldown), 400 for `bad-bets`/`bad-round-id`/`insufficient-balance`/`over-table-max`/`payout-exceeds-cap`/`no-open-round`. `apiCall` in `js/auth/api-client.js` throws away 4xx bodies — wallet-client MUST use its own token+fetch that parses the body on every status.
- **Signup grant is server-side.** The client never sets balance; first `wallet-get` returns 100,000 automatically.
- **Chip amounts are integers** everywhere in the client too.
- **Game gate lands here but is only MOUNTED in Plan 3.** Build + unit-test `computeGateState`; `mountGameGate` is browser-verified in Plan 3 when game pages load it.

## Module Structure (`calculator/js/wallet/`)

| File | Responsibility | Node-tested? |
|---|---|---|
| `package.json` | `{"type":"module"}` dev shim | — |
| `table-config.js` | GAME_TABLES mirror, LOBBY_GAMES/PRACTICE_GAMES card data, `getTable`, `formatChips` | ✅ pure |
| `wallet-client.js` | `createWalletClient({post,storage,now,randomId})` factory + `WalletError`; balance state, roundId lifecycle, subscribe, payout retry | ✅ pure (fake deps) |
| `wallet-hud.js` | `formatHud(state, now)` (pure) + `mountWalletHud(el, client, deps)` (DOM) | ✅ formatHud |
| `game-gate.js` | `computeGateState(input)` (pure) + `mountGameGate(opts)` (DOM, mounted in Plan 3) | ✅ computeGateState |
| `wallet-bootstrap.js` | Real singleton: `postWallet` (token+fetch, parses error bodies) + `walletClient` + auth wiring | browser only |
| `lobby.js` | Lobby entry: mount HUD in GAME LOBBY zone, sign-in-aware | browser only |
| `css/wallet.css` | HUD + lobby-zone + gate styling (new file) | browser only |

---

### Task 1: `table-config.js` — config mirror + helpers

**Files:**
- Create: `calculator/js/wallet/package.json`
- Create: `calculator/js/wallet/table-config.js`
- Create: `calculator/js/wallet/table-config.test.mjs`

**Interfaces:**
- Produces: `GAME_TABLES` (object), `getTable(gameId)`, `betTypeSpec(gameId, betType)`, `formatChips(n)`, `LOBBY_GAMES` (array), `PRACTICE_GAMES` (array). Consumed by wallet-hud, game-gate, lobby, and Plan 3 games.

- [ ] **Step 1: Create the dev-only ESM shim**

Create `calculator/js/wallet/package.json`:

```json
{
  "//": "dev-only — lets `node --test` import the browser ES modules. Inert in browsers, not relied on by public/.",
  "type": "module"
}
```

- [ ] **Step 2: Write the failing tests**

Create `calculator/js/wallet/table-config.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GAME_TABLES,
  getTable,
  betTypeSpec,
  formatChips,
  LOBBY_GAMES,
  PRACTICE_GAMES,
} from "./table-config.js";

test("GAME_TABLES mirrors the four server gameIds", () => {
  assert.deepEqual(Object.keys(GAME_TABLES).sort(), ["baccarat", "blackjack", "blackjack-shoe", "roulette"]);
});

test("GAME_TABLES numbers match the Plan-1 server mirror exactly", () => {
  assert.deepEqual(GAME_TABLES.roulette.betTypes.straight, { min: 100, max: 5000, maxReturn: 36, mergeFactor: 1 });
  assert.equal(GAME_TABLES.roulette.maxTotalBet, 20000);
  assert.deepEqual(GAME_TABLES.blackjack.betTypes.main, { min: 500, max: 10000, maxReturn: 2.5, mergeFactor: 8 });
  assert.deepEqual(GAME_TABLES.blackjack.betTypes.twentyOnePlus3, { min: 100, max: 2500, maxReturn: 101, mergeFactor: 1 });
  assert.deepEqual(GAME_TABLES["blackjack-shoe"].betTypes.main, { min: 100, max: 2000, maxReturn: 2.5, mergeFactor: 8 });
  assert.equal(GAME_TABLES.baccarat.betTypes.banker.maxReturn, 1.95);
  assert.deepEqual(GAME_TABLES.baccarat.betTypes.egalite, { min: 100, max: 1000, maxReturn: 226, mergeFactor: 1 });
});

test("getTable returns the table or null", () => {
  assert.equal(getTable("roulette").maxTotalBet, 20000);
  assert.equal(getTable("craps"), null);
});

test("betTypeSpec returns a spec or null (own-property only)", () => {
  assert.equal(betTypeSpec("roulette", "straight").min, 100);
  assert.equal(betTypeSpec("roulette", "toString"), null);
  assert.equal(betTypeSpec("craps", "straight"), null);
});

test("formatChips groups thousands, rejects non-finite", () => {
  assert.equal(formatChips(0), "0");
  assert.equal(formatChips(100000), "100,000");
  assert.equal(formatChips(1234567), "1,234,567");
  assert.equal(formatChips(null), "0");
  assert.equal(formatChips(NaN), "0");
});

test("LOBBY_GAMES has the 5 playable lobby entries with hrefs + limit text", () => {
  const ids = LOBBY_GAMES.map((g) => g.id);
  assert.deepEqual(ids, ["roulette", "blackjack", "blackjack-shoe", "baccarat", "uth"]);
  for (const g of LOBBY_GAMES) {
    assert.ok(g.name && g.href && g.blurb && g.limitsText, `${g.id} fields`);
    assert.ok(Array.isArray(g.tags) && g.tags.length > 0);
  }
});

test("PRACTICE_GAMES lists the non-game tools with hrefs", () => {
  assert.ok(PRACTICE_GAMES.length >= 5);
  for (const g of PRACTICE_GAMES) {
    assert.ok(g.name && g.href, `${g.name} fields`);
  }
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator && node --test js/wallet/table-config.test.mjs`
Expected: FAIL — `Cannot find module './table-config.js'`.

- [ ] **Step 4: Implement `table-config.js`**

```js
// table-config.js — client mirror of the server (cg-poker wallet-logic.mjs)
// GAME_TABLES, plus the lobby/practice card metadata and display helpers.
// PURE: no imports, no browser globals. The SERVER is authoritative — these
// numbers exist only for optimistic UI and must be kept in lockstep with
// lambda/poker/wallet-logic.mjs (a drift here is caught by the matching test).

export const GAME_TABLES = {
  roulette: {
    maxTotalBet: 20000,
    betTypes: {
      straight:  { min: 100, max: 5000, maxReturn: 36, mergeFactor: 1 },
      split:     { min: 100, max: 5000, maxReturn: 18, mergeFactor: 1 },
      street:    { min: 100, max: 5000, maxReturn: 12, mergeFactor: 1 },
      corner:    { min: 100, max: 5000, maxReturn: 9,  mergeFactor: 1 },
      sixline:   { min: 100, max: 5000, maxReturn: 6,  mergeFactor: 1 },
      column:    { min: 100, max: 5000, maxReturn: 3,  mergeFactor: 1 },
      dozen:     { min: 100, max: 5000, maxReturn: 3,  mergeFactor: 1 },
      evenMoney: { min: 100, max: 5000, maxReturn: 2,  mergeFactor: 1 },
    },
  },
  blackjack: {
    maxTotalBet: 17500,
    betTypes: {
      main:           { min: 500, max: 10000, maxReturn: 2.5, mergeFactor: 8 },
      perfectPair:    { min: 100, max: 2500,  maxReturn: 26,  mergeFactor: 1 },
      twentyOnePlus3: { min: 100, max: 2500,  maxReturn: 101, mergeFactor: 1 },
      top3:           { min: 100, max: 2500,  maxReturn: 271, mergeFactor: 1 },
    },
  },
  "blackjack-shoe": {
    maxTotalBet: 2000,
    betTypes: {
      main: { min: 100, max: 2000, maxReturn: 2.5, mergeFactor: 8 },
    },
  },
  baccarat: {
    maxTotalBet: 14000,
    betTypes: {
      player:      { min: 500, max: 10000, maxReturn: 2,    mergeFactor: 1 },
      banker:      { min: 500, max: 10000, maxReturn: 1.95, mergeFactor: 1 },
      tie:         { min: 100, max: 1000,  maxReturn: 9,    mergeFactor: 1 },
      playerPair:  { min: 100, max: 1000,  maxReturn: 12,   mergeFactor: 1 },
      bankerPair:  { min: 100, max: 1000,  maxReturn: 12,   mergeFactor: 1 },
      dragonBonus: { min: 100, max: 1000,  maxReturn: 31,   mergeFactor: 1 },
      egalite:     { min: 100, max: 1000,  maxReturn: 226,  mergeFactor: 1 },
    },
  },
};

export function getTable(gameId) {
  return Object.prototype.hasOwnProperty.call(GAME_TABLES, gameId) ? GAME_TABLES[gameId] : null;
}

export function betTypeSpec(gameId, betType) {
  const table = getTable(gameId);
  if (!table) return null;
  return Object.prototype.hasOwnProperty.call(table.betTypes, betType) ? table.betTypes[betType] : null;
}

export function formatChips(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "0";
  return Math.trunc(n).toLocaleString("en-US");
}

// Lobby cards — playable games (credits). blackjack-shoe is a second blackjack
// entry per the design. UTH links to its own online lobby (buy-in escrow is
// Plan 4); it carries no fixed-bet table here.
export const LOBBY_GAMES = [
  { id: "roulette", name: "Roulette", href: "roulette/index.html",
    blurb: "European & American wheel. One house table, live stats.",
    limitsText: "100 – 5,000 / spot", tags: ["Wheel", "Live Stats"] },
  { id: "blackjack", name: "Blackjack", href: "blackjack/game-mode/index.html",
    blurb: "Dealt hands with Perfect Pair, 21+3 and Top-3 side bets.",
    limitsText: "500 – 10,000", tags: ["Side Bets", "Double / Split"] },
  { id: "blackjack-shoe", name: "Blackjack — Normal Shoe", href: "blackjack/normal-shoe/index.html",
    blurb: "Realistic shoe dealing for card-counting play.",
    limitsText: "100 – 2,000", tags: ["Full Shoe"] },
  { id: "baccarat", name: "Baccarat", href: "baccarat/game-mode/index.html",
    blurb: "Player / Banker / Tie with pairs, Dragon Bonus and Egalité.",
    limitsText: "500 – 10,000", tags: ["Side Bets", "Egalité"] },
  { id: "uth", name: "Ultimate Texas Hold'em", href: "ultimate-texas-holdem/index.html",
    blurb: "Online multiplayer vs the dealer. 10,000 buy-in from your chips.",
    limitsText: "Ante 100 – 1,000", tags: ["Multiplayer", "Room Codes"] },
];

// Practice cards — non-game tools (no login, no credits).
export const PRACTICE_GAMES = [
  { name: "Roulette Dealer Trainer", href: "roulette/trainer/index.html",
    blurb: "Practice calculating dealer payouts, four difficulties." },
  { name: "Blackjack Card Counting", href: "blackjack/index.html",
    blurb: "Hi-Lo counting trainers, easy → hard, with progress tracking." },
  { name: "Baccarat Card Counting", href: "baccarat/card-counting/index.html",
    blurb: "Road maps and an EV calculator for baccarat counting." },
  { name: "Poker Hand Recorder", href: "poker/bb100/index.html",
    blurb: "Drop GG hand histories → bb/100, EV curves, cloud save." },
  { name: "Ultimate Hold'em Odds", href: "ultimate-texas-holdem/odds.html",
    blurb: "Full payout table and house-edge reference." },
];
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator && node --test js/wallet/table-config.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/casino-game/calculator/js/wallet/package.json \
        portfolio/src/game/casino-game/calculator/js/wallet/table-config.js \
        portfolio/src/game/casino-game/calculator/js/wallet/table-config.test.mjs
git commit -m "feat(casino): wallet table-config — server mirror + lobby/practice card data"
```

---

### Task 2: `wallet-client.js` — factory core

**Files:**
- Create: `calculator/js/wallet/wallet-client.js`
- Create: `calculator/js/wallet/wallet-client.test.mjs`

**Interfaces:**
- Consumes: nothing at import (deps injected).
- Produces:
  - `class WalletError extends Error` with `.code` (string) and `.retryAt` (ISO string | null).
  - `createWalletClient({ post, storage, now, randomId })` → client object:
    - `post(action, payload) → Promise<{status:number, body:object}>`
    - `storage` — localStorage-like `{getItem, setItem, removeItem}`
    - `now() → epochMs`; `randomId() → string`
    - Returns `{ load, getBalance, getResetInfo, bet, topUp, payout, reset, openRound, subscribe }`.
  - Behaviour contract consumed by wallet-hud, lobby, Plan 3 games:
    - `load()` → `Promise<{balance, canReset, resetAvailableAt}>` (calls `wallet-get`, updates state, notifies).
    - `getBalance()` → `number | null`; `getResetInfo()` → `{canReset, resetAvailableAt}`.
    - `bet(gameId, bets)` → `Promise<{balance, roundId}>`; opens a NEW round (throws `WalletError('round-in-progress')` if one is already open for that game locally); persists the open round to storage; updates balance.
    - `topUp(gameId, bets)` → `Promise<{balance, roundId}>`; adds to the current open round (same roundId).
    - `payout(gameId, payout)` → `Promise<{balance}>`; settles the open round; safe to retry (same roundId, server-idempotent); clears the stored round on success.
    - `reset()` → `Promise<{balance}>`; throws `WalletError('cooldown', retryAt)` on 403.
    - `openRound(gameId)` → `{roundId, bets} | null` from storage (crash recovery).
    - `subscribe(cb)` → unsubscribe; `cb(balance)` fires on every balance change.

- [ ] **Step 1: Write the failing tests**

Create `calculator/js/wallet/wallet-client.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createWalletClient, WalletError } from "./wallet-client.js";

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _dump: () => Object.fromEntries(m),
  };
}

// Scripts a queue of responses; records the calls made.
function fakePost(responses) {
  const calls = [];
  const q = [...responses];
  const post = async (action, payload) => {
    calls.push({ action, payload });
    const next = q.shift();
    if (!next) throw new Error("no scripted response for " + action);
    return next;
  };
  post.calls = calls;
  return post;
}

const deps = (post, storage) => ({
  post,
  storage: storage || fakeStorage(),
  now: () => 1_800_000_000_000,
  randomId: () => "rid-fixed",
});

test("load() fetches balance and notifies subscribers", async () => {
  const post = fakePost([{ status: 200, body: { ok: true, balance: 100000, canReset: false, resetAvailableAt: null } }]);
  const c = createWalletClient(deps(post));
  const seen = [];
  c.subscribe((b) => seen.push(b));
  const r = await c.load();
  assert.equal(r.balance, 100000);
  assert.equal(c.getBalance(), 100000);
  assert.deepEqual(c.getResetInfo(), { canReset: false, resetAvailableAt: null });
  assert.deepEqual(seen, [100000]);
  assert.deepEqual(post.calls[0], { action: "wallet-get", payload: {} });
});

test("bet() opens a round, debits, persists open round", async () => {
  const post = fakePost([{ status: 200, body: { ok: true, balance: 99400, roundId: "rid-fixed" } }]);
  const storage = fakeStorage();
  const c = createWalletClient(deps(post, storage));
  const r = await c.bet("roulette", { straight: 100, evenMoney: 500 });
  assert.equal(r.balance, 99400);
  assert.equal(r.roundId, "rid-fixed");
  assert.equal(c.getBalance(), 99400);
  assert.deepEqual(post.calls[0], { action: "wallet-bet", payload: { gameId: "roulette", roundId: "rid-fixed", bets: { straight: 100, evenMoney: 500 } } });
  assert.deepEqual(c.openRound("roulette"), { roundId: "rid-fixed", bets: { straight: 100, evenMoney: 500 } });
});

test("bet() refuses a second open round for the same game locally", async () => {
  const post = fakePost([{ status: 200, body: { ok: true, balance: 99400, roundId: "rid-fixed" } }]);
  const c = createWalletClient(deps(post));
  await c.bet("roulette", { straight: 100 });
  await assert.rejects(() => c.bet("roulette", { straight: 100 }), (e) => e instanceof WalletError && e.code === "round-in-progress");
});

test("topUp() adds to the open round with the same roundId", async () => {
  const post = fakePost([
    { status: 200, body: { ok: true, balance: 99500, roundId: "rid-fixed" } },
    { status: 200, body: { ok: true, balance: 99000, roundId: "rid-fixed" } },
  ]);
  const c = createWalletClient(deps(post));
  await c.bet("blackjack", { main: 500 });
  const r = await c.topUp("blackjack", { main: 500 });
  assert.equal(r.balance, 99000);
  assert.deepEqual(post.calls[1], { action: "wallet-bet", payload: { gameId: "blackjack", roundId: "rid-fixed", bets: { main: 500 } } });
  assert.deepEqual(c.openRound("blackjack"), { roundId: "rid-fixed", bets: { main: 1000 } });
});

test("topUp() with no open round throws", async () => {
  const post = fakePost([]);
  const c = createWalletClient(deps(post));
  await assert.rejects(() => c.topUp("blackjack", { main: 500 }), (e) => e instanceof WalletError && e.code === "no-open-round");
});

test("payout() settles, clears the stored round, updates balance", async () => {
  const post = fakePost([
    { status: 200, body: { ok: true, balance: 99400, roundId: "rid-fixed" } },
    { status: 200, body: { ok: true, balance: 103500 } },
  ]);
  const storage = fakeStorage();
  const c = createWalletClient(deps(post, storage));
  await c.bet("roulette", { straight: 100, evenMoney: 500 });
  const r = await c.payout("roulette", 4100);
  assert.equal(r.balance, 103500);
  assert.equal(c.getBalance(), 103500);
  assert.equal(c.openRound("roulette"), null);
  assert.deepEqual(post.calls[1], { action: "wallet-payout", payload: { gameId: "roulette", roundId: "rid-fixed", payout: 4100 } });
});

test("payout() with no open round throws without calling the server", async () => {
  const post = fakePost([]);
  const c = createWalletClient(deps(post));
  await assert.rejects(() => c.payout("roulette", 100), (e) => e instanceof WalletError && e.code === "no-open-round");
  assert.equal(post.calls.length, 0);
});

test("bet() surfaces a 429 too-fast as WalletError with retryAt and keeps no open round", async () => {
  const post = fakePost([{ status: 429, body: { ok: false, error: "too-fast", retryAt: "2027-01-15T08:00:02.000Z" } }]);
  const c = createWalletClient(deps(post));
  await assert.rejects(() => c.bet("roulette", { straight: 100 }), (e) =>
    e instanceof WalletError && e.code === "too-fast" && e.retryAt === "2027-01-15T08:00:02.000Z");
  assert.equal(c.openRound("roulette"), null);
});

test("bet() surfaces a 400 bad-bets and does not persist a round", async () => {
  const post = fakePost([{ status: 400, body: { ok: false, error: "bad-bets" } }]);
  const c = createWalletClient(deps(post));
  await assert.rejects(() => c.bet("roulette", { straight: 5 }), (e) => e instanceof WalletError && e.code === "bad-bets");
  assert.equal(c.openRound("roulette"), null);
});

test("reset() surfaces a 403 cooldown with retryAt", async () => {
  const post = fakePost([{ status: 403, body: { ok: false, error: "cooldown", retryAt: "2027-01-15T14:00:00.000Z" } }]);
  const c = createWalletClient(deps(post));
  await assert.rejects(() => c.reset(), (e) => e instanceof WalletError && e.code === "cooldown" && e.retryAt === "2027-01-15T14:00:00.000Z");
});

test("reset() success updates balance and reset info", async () => {
  const post = fakePost([{ status: 200, body: { ok: true, balance: 5000 } }]);
  const c = createWalletClient(deps(post));
  const r = await c.reset();
  assert.equal(r.balance, 5000);
  assert.equal(c.getBalance(), 5000);
});

test("openRound survives a fresh client (crash recovery via storage)", async () => {
  const storage = fakeStorage();
  const post1 = fakePost([{ status: 200, body: { ok: true, balance: 99400, roundId: "rid-fixed" } }]);
  const c1 = createWalletClient(deps(post1, storage));
  await c1.bet("roulette", { straight: 100 });
  // simulate reload: brand-new client, same storage
  const post2 = fakePost([{ status: 200, body: { ok: true, balance: 103500 } }]);
  const c2 = createWalletClient(deps(post2, storage));
  assert.deepEqual(c2.openRound("roulette"), { roundId: "rid-fixed", bets: { straight: 100 } });
  await c2.payout("roulette", 4100);
  assert.equal(c2.openRound("roulette"), null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator && node --test js/wallet/wallet-client.test.mjs`
Expected: FAIL — `Cannot find module './wallet-client.js'`.

- [ ] **Step 3: Implement `wallet-client.js`**

```js
// wallet-client.js — client-side wallet state machine. PURE + dependency-
// injected: `post`, `storage`, `now`, `randomId` are all passed in so this
// runs under node --test with fakes. wallet-bootstrap.js wires the real ones.
//
// Open-round lifecycle: bet() opens a round and persists {roundId, bets} to
// storage so a crash mid-hand can still collect via payout() after reload.
// One open round per game is enforced locally (the server forfeits a second),
// so the UI blocks a new bet until the current round settles.

export class WalletError extends Error {
  constructor(code, { status = 0, retryAt = null } = {}) {
    super(code);
    this.name = "WalletError";
    this.code = code;
    this.status = status;
    this.retryAt = retryAt;
  }
}

const ROUND_KEY = (gameId) => `casinoWallet:round:${gameId}`;

export function createWalletClient({ post, storage, now, randomId }) {
  let balance = null;
  let canReset = false;
  let resetAvailableAt = null;
  const subs = new Set();

  const notify = () => { for (const cb of subs) cb(balance); };

  const readRound = (gameId) => {
    const raw = storage.getItem(ROUND_KEY(gameId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.roundId === "string" && parsed.bets) {
        return { roundId: parsed.roundId, bets: parsed.bets };
      }
    } catch { /* corrupt — treat as none */ }
    return null;
  };
  const writeRound = (gameId, round) => storage.setItem(ROUND_KEY(gameId), JSON.stringify(round));
  const clearRound = (gameId) => storage.removeItem(ROUND_KEY(gameId));

  // Resolves a scripted/real response into either an updated state or a throw.
  const settleResponse = ({ status, body }) => {
    if (status >= 200 && status < 300 && body && body.ok) return body;
    const code = (body && body.error) || `http-${status}`;
    throw new WalletError(code, { status, retryAt: body && body.retryAt ? body.retryAt : null });
  };

  const applyBalance = (body) => {
    if (typeof body.balance === "number") { balance = body.balance; notify(); }
  };

  return {
    subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
    getBalance() { return balance; },
    getResetInfo() { return { canReset, resetAvailableAt }; },
    openRound(gameId) { return readRound(gameId); },

    async load() {
      const body = settleResponse(await post("wallet-get", {}));
      balance = body.balance;
      canReset = !!body.canReset;
      resetAvailableAt = body.resetAvailableAt || null;
      notify();
      return { balance, canReset, resetAvailableAt };
    },

    async bet(gameId, bets) {
      if (readRound(gameId)) throw new WalletError("round-in-progress");
      const roundId = randomId();
      const body = settleResponse(await post("wallet-bet", { gameId, roundId, bets }));
      writeRound(gameId, { roundId, bets: { ...bets } });
      applyBalance(body);
      return { balance, roundId };
    },

    async topUp(gameId, bets) {
      const round = readRound(gameId);
      if (!round) throw new WalletError("no-open-round");
      const body = settleResponse(await post("wallet-bet", { gameId, roundId: round.roundId, bets }));
      const merged = { ...round.bets };
      for (const [k, v] of Object.entries(bets)) merged[k] = (merged[k] || 0) + v;
      writeRound(gameId, { roundId: round.roundId, bets: merged });
      applyBalance(body);
      return { balance, roundId: round.roundId };
    },

    async payout(gameId, payoutChips) {
      const round = readRound(gameId);
      if (!round) throw new WalletError("no-open-round");
      const body = settleResponse(await post("wallet-payout", { gameId, roundId: round.roundId, payout: payoutChips }));
      clearRound(gameId);
      applyBalance(body);
      return { balance };
    },

    async reset() {
      const body = settleResponse(await post("wallet-reset", {}));
      balance = body.balance;
      canReset = false;
      resetAvailableAt = null;
      notify();
      return { balance };
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator && node --test js/wallet/wallet-client.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/casino-game/calculator/js/wallet/wallet-client.js \
        portfolio/src/game/casino-game/calculator/js/wallet/wallet-client.test.mjs
git commit -m "feat(casino): wallet-client factory — balance state, round lifecycle, typed errors"
```

---

### Task 3: `wallet-hud.js` — balance pill

**Files:**
- Create: `calculator/js/wallet/wallet-hud.js`
- Create: `calculator/js/wallet/wallet-hud.test.mjs`

**Interfaces:**
- Consumes: `formatChips` from `table-config.js`.
- Produces:
  - `formatHud({ balance, canReset, resetAvailableAt }, nowMs)` → `{ balanceText, state, showReset, cooldownText }` where `state` ∈ `'loading'|'ok'|'bust'`. Pure.
  - `mountWalletHud(container, walletClient, { now, onReset })` → `unmount()`. DOM; browser-verified.

- [ ] **Step 1: Write the failing tests**

Create `calculator/js/wallet/wallet-hud.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatHud } from "./wallet-hud.js";

const NOW = 1_800_000_000_000;

test("loading state when balance is null", () => {
  const h = formatHud({ balance: null, canReset: false, resetAvailableAt: null }, NOW);
  assert.equal(h.state, "loading");
  assert.equal(h.balanceText, "—");
  assert.equal(h.showReset, false);
});

test("ok state formats the balance and hides reset", () => {
  const h = formatHud({ balance: 100000, canReset: false, resetAvailableAt: null }, NOW);
  assert.equal(h.state, "ok");
  assert.equal(h.balanceText, "100,000");
  assert.equal(h.showReset, false);
  assert.equal(h.cooldownText, null);
});

test("bust state below 100 shows reset when available", () => {
  const h = formatHud({ balance: 40, canReset: true, resetAvailableAt: null }, NOW);
  assert.equal(h.state, "bust");
  assert.equal(h.showReset, true);
  assert.equal(h.cooldownText, null);
});

test("bust state on cooldown shows a countdown, not the button", () => {
  const readyAt = new Date(NOW + 2 * 3600_000 + 5 * 60_000).toISOString(); // 2h5m out
  const h = formatHud({ balance: 0, canReset: false, resetAvailableAt: readyAt }, NOW);
  assert.equal(h.state, "bust");
  assert.equal(h.showReset, false);
  assert.equal(h.cooldownText, "2h 5m");
});

test("cooldown that has elapsed shows the reset button", () => {
  const past = new Date(NOW - 1000).toISOString();
  const h = formatHud({ balance: 0, canReset: true, resetAvailableAt: past }, NOW);
  assert.equal(h.showReset, true);
  assert.equal(h.cooldownText, null);
});

test("cooldown under a minute reads in minutes (rounds up to 1m)", () => {
  const readyAt = new Date(NOW + 30_000).toISOString();
  const h = formatHud({ balance: 0, canReset: false, resetAvailableAt: readyAt }, NOW);
  assert.equal(h.cooldownText, "1m");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator && node --test js/wallet/wallet-hud.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `wallet-hud.js`**

```js
// wallet-hud.js — the chip-balance pill. formatHud() is pure (tested);
// mountWalletHud() renders + subscribes (browser-verified). Below 100 chips the
// pill flips to a bust state showing either a Reset button (when available) or
// a cooldown countdown.

import { formatChips } from "./table-config.js";

const BUST_THRESHOLD = 100;

function cooldownText(resetAvailableAt, nowMs) {
  if (!resetAvailableAt) return null;
  const ms = Date.parse(resetAvailableAt) - nowMs;
  if (ms <= 0) return null;
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatHud({ balance, canReset, resetAvailableAt }, nowMs) {
  if (typeof balance !== "number") {
    return { state: "loading", balanceText: "—", showReset: false, cooldownText: null };
  }
  const cd = cooldownText(resetAvailableAt, nowMs);
  if (balance < BUST_THRESHOLD) {
    return {
      state: "bust",
      balanceText: formatChips(balance),
      showReset: cd === null && (canReset || balance < BUST_THRESHOLD),
      cooldownText: cd,
    };
  }
  return { state: "ok", balanceText: formatChips(balance), showReset: false, cooldownText: null };
}

const CHIP_SVG = `<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="3" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="21" y2="12"/></svg>`;

// Renders the pill into `container` and keeps it live. `onReset` is called when
// the user clicks Reset; it should call walletClient.reset() and handle errors.
export function mountWalletHud(container, walletClient, { now = () => Date.now(), onReset } = {}) {
  const el = document.createElement("div");
  el.className = "wallet-hud";
  container.appendChild(el);

  const render = () => {
    const info = walletClient.getResetInfo();
    const h = formatHud({ balance: walletClient.getBalance(), ...info }, now());
    el.dataset.state = h.state;
    el.innerHTML = `
      <span class="wallet-hud-chip">${CHIP_SVG}</span>
      <span class="wallet-hud-balance">${h.balanceText}</span>
      ${h.showReset ? `<button type="button" class="wallet-hud-reset">Reset +5,000</button>` : ""}
      ${h.cooldownText ? `<span class="wallet-hud-cooldown">Reset in ${h.cooldownText}</span>` : ""}
    `;
    const btn = el.querySelector(".wallet-hud-reset");
    if (btn && onReset) btn.addEventListener("click", () => onReset());
  };

  render();
  const unsub = walletClient.subscribe(render);
  const timer = setInterval(render, 30000); // refresh cooldown countdown
  return function unmount() {
    unsub();
    clearInterval(timer);
    el.remove();
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator && node --test js/wallet/wallet-hud.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/casino-game/calculator/js/wallet/wallet-hud.js \
        portfolio/src/game/casino-game/calculator/js/wallet/wallet-hud.test.mjs
git commit -m "feat(casino): wallet HUD pill — formatHud (pure) + live mount"
```

---

### Task 4: `game-gate.js` — access-gate state (mounted in Plan 3)

**Files:**
- Create: `calculator/js/wallet/game-gate.js`
- Create: `calculator/js/wallet/game-gate.test.mjs`

**Interfaces:**
- Consumes: nothing at import.
- Produces:
  - `computeGateState({ authReady, signedIn, balance, minBet })` → `{ mode, message }` where `mode` ∈ `'loading'|'signin'|'bust'|'insufficient'|'ready'`. Pure.
  - `mountGameGate(opts)` → `{ update, unmount }`. DOM overlay; browser-verified in Plan 3.

- [ ] **Step 1: Write the failing tests**

Create `calculator/js/wallet/game-gate.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeGateState } from "./game-gate.js";

test("loading until auth resolves", () => {
  assert.equal(computeGateState({ authReady: false, signedIn: false, balance: null, minBet: 500 }).mode, "loading");
});

test("signin overlay when signed out", () => {
  assert.equal(computeGateState({ authReady: true, signedIn: false, balance: null, minBet: 500 }).mode, "signin");
});

test("loading while signed in but balance not yet fetched", () => {
  assert.equal(computeGateState({ authReady: true, signedIn: true, balance: null, minBet: 500 }).mode, "loading");
});

test("bust below 100 regardless of table minimum", () => {
  assert.equal(computeGateState({ authReady: true, signedIn: true, balance: 40, minBet: 500 }).mode, "bust");
  assert.equal(computeGateState({ authReady: true, signedIn: true, balance: 99, minBet: 100 }).mode, "bust");
});

test("insufficient when 100 <= balance < minBet", () => {
  assert.equal(computeGateState({ authReady: true, signedIn: true, balance: 300, minBet: 500 }).mode, "insufficient");
});

test("ready when balance meets the table minimum", () => {
  assert.equal(computeGateState({ authReady: true, signedIn: true, balance: 500, minBet: 500 }).mode, "ready");
  assert.equal(computeGateState({ authReady: true, signedIn: true, balance: 100, minBet: 100 }).mode, "ready");
});

test("every non-ready mode carries a user-facing message", () => {
  for (const s of [
    { authReady: false, signedIn: false, balance: null, minBet: 500 },
    { authReady: true, signedIn: false, balance: null, minBet: 500 },
    { authReady: true, signedIn: true, balance: 40, minBet: 500 },
    { authReady: true, signedIn: true, balance: 300, minBet: 500 },
  ]) {
    assert.ok(computeGateState(s).message.length > 0);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator && node --test js/wallet/game-gate.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `game-gate.js`**

```js
// game-gate.js — the full-screen overlay a wallet game shows until the player
// is signed in AND has enough chips for the table. computeGateState() is pure
// (tested); mountGameGate() renders the overlay and is wired by Plan 3 game
// pages. Below 100 chips is "bust" (offer reset); 100..minBet is "insufficient"
// (send them to a cheaper table); >= minBet is "ready" (dismiss).

const BUST_THRESHOLD = 100;

export function computeGateState({ authReady, signedIn, balance, minBet }) {
  if (!authReady) return { mode: "loading", message: "Loading…" };
  if (!signedIn) return { mode: "signin", message: "Sign in with Google to play with chips." };
  if (typeof balance !== "number") return { mode: "loading", message: "Loading your chips…" };
  if (balance < BUST_THRESHOLD) return { mode: "bust", message: "You're out of chips. Claim a free reset to keep playing." };
  if (balance < minBet) return { mode: "insufficient", message: `You need at least ${minBet.toLocaleString("en-US")} chips for this table. Try a lower-limit game.` };
  return { mode: "ready", message: "" };
}

// Overlay renderer. `opts`: { container, onSignIn, onReset, lobbyHref }.
// Returns { update(state), unmount() }. `state` is a computeGateState() result.
export function mountGameGate({ container, onSignIn, onReset, lobbyHref = "../index.html" }) {
  const overlay = document.createElement("div");
  overlay.className = "game-gate-overlay";
  container.appendChild(overlay);

  const update = (state) => {
    overlay.dataset.mode = state.mode;
    overlay.hidden = state.mode === "ready";
    if (state.mode === "ready") { overlay.innerHTML = ""; return; }
    const action =
      state.mode === "signin" ? `<button type="button" class="game-gate-btn" data-act="signin">Sign in with Google</button>`
      : state.mode === "bust" ? `<button type="button" class="game-gate-btn" data-act="reset">Reset +5,000 chips</button>`
      : state.mode === "insufficient" ? `<a class="game-gate-btn" href="${lobbyHref}">Back to lobby</a>`
      : "";
    overlay.innerHTML = `<div class="game-gate-card"><p class="game-gate-msg">${state.message}</p>${action}</div>`;
    const signinBtn = overlay.querySelector('[data-act="signin"]');
    if (signinBtn && onSignIn) signinBtn.addEventListener("click", () => onSignIn());
    const resetBtn = overlay.querySelector('[data-act="reset"]');
    if (resetBtn && onReset) resetBtn.addEventListener("click", () => onReset());
  };

  return { update, unmount: () => overlay.remove() };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator && node --test js/wallet/game-gate.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/casino-game/calculator/js/wallet/game-gate.js \
        portfolio/src/game/casino-game/calculator/js/wallet/game-gate.test.mjs
git commit -m "feat(casino): game-gate state machine + overlay (mounted in Plan 3)"
```

---

### Task 5: `wallet-bootstrap.js` — real singleton wiring

**Files:**
- Create: `calculator/js/wallet/wallet-bootstrap.js`

**Interfaces:**
- Consumes: `getIdToken` from `../auth/api-client.js`; `POKER_API_BASE`, `auth`, `googleProvider` from `../auth/firebase-init.js`; `onAuthStateChanged`, `signInWithPopup` from the Firebase CDN; `createWalletClient` from `./wallet-client.js`.
- Produces: default export `{ walletClient, onAuth(cb), signIn() }`.
  - `walletClient` — the singleton built with the real `postWallet`, `localStorage`, `Date.now`, `crypto.randomUUID`.
  - `onAuth(cb)` → unsubscribe; `cb({ signedIn, user })` on every auth change; on sign-in it auto-calls `walletClient.load()`, on sign-out it clears local open-round keys.
  - `signIn()` → `signInWithPopup(auth, googleProvider)`.

No unit test (pure wiring around the Firebase CDN + `fetch`). Verified in Task 6 in a browser. Verification for THIS task is `node --check` on the file (syntax) — it cannot be imported by Node because of the `https://` Firebase import, so do NOT `node --test` it.

- [ ] **Step 1: Implement `wallet-bootstrap.js`**

```js
// wallet-bootstrap.js — constructs the real, shared wallet client from Firebase
// auth + the deployed cg-poker wallet API, and broadcasts auth changes. Browser
// only (imports the Firebase CDN). Game pages and the lobby import this.
//
// postWallet() intentionally does NOT use api-client.js#apiCall — that helper
// throws away 4xx bodies, but the wallet needs the {error, retryAt} payload on
// every status. So it does its own token + fetch and returns {status, body}.

import { onAuthStateChanged, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { auth, googleProvider, POKER_API_BASE } from "../auth/firebase-init.js";
import { getIdToken } from "../auth/api-client.js";
import { createWalletClient } from "./wallet-client.js";

async function postWallet(action, payload) {
  const token = await getIdToken();
  if (!token) return { status: 401, body: { ok: false, error: "not-signed-in" } };
  let res;
  try {
    res = await fetch(`${POKER_API_BASE}/poker/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return { status: 0, body: { ok: false, error: "network-error" } };
  }
  let body = {};
  try { body = await res.json(); } catch { body = { ok: false, error: `http-${res.status}` }; }
  return { status: res.status, body };
}

const ROUND_PREFIX = "casinoWallet:round:";
function clearLocalRounds() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(ROUND_PREFIX)) localStorage.removeItem(k);
    }
  } catch { /* storage unavailable — nothing to clear */ }
}

export const walletClient = createWalletClient({
  post: postWallet,
  storage: {
    getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
    removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  },
  now: () => Date.now(),
  randomId: () => (crypto?.randomUUID ? crypto.randomUUID() : `r${Date.now()}${Math.random().toString(36).slice(2)}`),
});

const authSubs = new Set();
let lastUid = null;

onAuthStateChanged(auth, (user) => {
  const signedIn = !!user;
  if (user && user.uid !== lastUid) {
    lastUid = user.uid;
    walletClient.load().catch((err) => console.error("[casino wallet] load failed:", err));
  }
  if (!user) {
    lastUid = null;
    clearLocalRounds();
  }
  for (const cb of authSubs) cb({ signedIn, user: user || null });
});

export function onAuth(cb) { authSubs.add(cb); return () => authSubs.delete(cb); }
export function signIn() { return signInWithPopup(auth, googleProvider); }

export default { walletClient, onAuth, signIn };
```

- [ ] **Step 2: Syntax-check (cannot node --test — Firebase CDN import)**

Run: `cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator && node --check js/wallet/wallet-bootstrap.js`
Expected: no output, exit 0 (syntax valid). Behaviour is verified in Task 6.

- [ ] **Step 3: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/casino-game/calculator/js/wallet/wallet-bootstrap.js
git commit -m "feat(casino): wallet-bootstrap — real singleton (token+fetch, auth wiring)"
```

---

### Task 6: Lobby / Practice restructure + HUD mount + browser verification

**Files:**
- Modify: `calculator/index.html` (games grid → GAME LOBBY + PRACTICE zones; hamburger dropdown regroup; add wallet.css link + lobby.js module)
- Create: `calculator/js/wallet/lobby.js`
- Create: `calculator/css/wallet.css`

**Interfaces:**
- Consumes: `LOBBY_GAMES`, `PRACTICE_GAMES` from `table-config.js`; default export from `wallet-bootstrap.js`; `mountWalletHud` from `wallet-hud.js`.
- Produces: the new landing page. No new exports.

- [ ] **Step 1: Create `calculator/js/wallet/lobby.js`**

```js
// lobby.js — landing-page entry. Mounts the wallet HUD in the GAME LOBBY zone
// and makes that zone sign-in-aware: signed out shows a "Sign in to play"
// prompt; signed in shows the live balance HUD. Practice zone is untouched
// (always open). Game-card internals are unchanged here — Plan 3 converts them.

import bootstrap, { walletClient } from "./wallet-bootstrap.js";
import { mountWalletHud } from "./wallet-hud.js";

function init() {
  const zone = document.getElementById("gameLobbyAccount");
  if (!zone) return;

  const signedOut = zone.querySelector(".lobby-signin");
  const hudHost = zone.querySelector(".lobby-hud-host");
  let unmountHud = null;

  const signInBtn = zone.querySelector(".lobby-signin-btn");
  if (signInBtn) signInBtn.addEventListener("click", () => bootstrap.signIn().catch((e) => console.error(e)));

  bootstrap.onAuth(({ signedIn }) => {
    if (signedOut) signedOut.hidden = signedIn;
    if (hudHost) hudHost.hidden = !signedIn;
    if (signedIn && !unmountHud && hudHost) {
      unmountHud = mountWalletHud(hudHost, walletClient, {
        onReset: () => walletClient.reset().catch((e) => {
          const when = e && e.retryAt ? ` (try again after ${new Date(e.retryAt).toLocaleTimeString()})` : "";
          alert("Reset unavailable" + when);
        }),
      });
    }
    if (!signedIn && unmountHud) { unmountHud(); unmountHud = null; }
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
```

- [ ] **Step 2: Create `calculator/css/wallet.css`**

```css
/* wallet.css — lobby account zone, wallet HUD pill, and game-gate overlay.
   Uses the shared design tokens from variables.css. */

/* Lobby zone header holding the account state */
.lobby-account {
  display: flex; align-items: center; justify-content: flex-end;
  gap: var(--spacing-md); min-height: 44px; margin-bottom: var(--spacing-md);
}
.lobby-signin { display: flex; align-items: center; gap: var(--spacing-sm); }
.lobby-signin-btn {
  font-family: var(--font-body); font-weight: 600; font-size: 0.95rem;
  color: var(--bg-primary); background: var(--accent-gold);
  border: none; border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer;
  transition: background var(--transition-fast);
}
.lobby-signin-btn:hover { background: var(--accent-gold-dim); }
.lobby-signin-note { color: var(--text-secondary); font-size: 0.85rem; }

/* Balance pill */
.wallet-hud {
  display: inline-flex; align-items: center; gap: var(--spacing-sm);
  font-family: var(--font-mono); font-size: 1.05rem; font-weight: 600;
  color: var(--accent-gold); background: var(--bg-card);
  border: 1px solid var(--border-active); border-radius: var(--radius-md);
  padding: 8px 14px;
}
.wallet-hud[data-state="bust"] { color: var(--accent-red); border-color: var(--accent-red); }
.wallet-hud-chip { display: inline-flex; }
.wallet-hud-reset {
  font-family: var(--font-body); font-weight: 600; font-size: 0.85rem;
  color: var(--bg-primary); background: var(--accent-green);
  border: none; border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer;
}
.wallet-hud-cooldown { font-family: var(--font-body); font-size: 0.8rem; color: var(--text-secondary); }

/* Section labels for the two zones */
.zone-title { font-family: var(--font-display); }
.zone-subtitle { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: var(--spacing-md); }
.game-card .game-limits {
  margin-top: var(--spacing-sm); font-family: var(--font-mono);
  font-size: 0.85rem; color: var(--accent-gold);
}

/* Game-gate overlay (mounted by Plan 3 game pages) */
.game-gate-overlay {
  position: fixed; inset: 0; z-index: 9000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(10, 10, 15, 0.92); backdrop-filter: blur(4px);
}
.game-gate-overlay[hidden] { display: none; }
.game-gate-card {
  background: var(--bg-card); border: 1px solid var(--border-active);
  border-radius: var(--radius-lg); padding: var(--spacing-xl);
  max-width: 380px; text-align: center;
}
.game-gate-msg { color: var(--text-primary); margin-bottom: var(--spacing-lg); }
.game-gate-btn {
  display: inline-block; font-family: var(--font-body); font-weight: 600;
  color: var(--bg-primary); background: var(--accent-gold);
  border: none; border-radius: var(--radius-sm); padding: 10px 20px;
  cursor: pointer; text-decoration: none;
}
```

- [ ] **Step 2b: Restructure `calculator/index.html`**

Two edits. **First**, split the games section into two labelled zones. Replace the existing `<section class="games-section">…</section>` block (the `<h2 class="section-title">Select Game</h2>` heading through the closing `</section>` of the games grid) with:

```html
        <section class="games-section" id="gameLobby">
            <h2 class="section-title zone-title">Game Lobby</h2>
            <p class="zone-subtitle">Play with your chip balance. Real casino table limits.</p>

            <div class="lobby-account" id="gameLobbyAccount">
                <div class="lobby-signin">
                    <span class="lobby-signin-note">Sign in to play with chips</span>
                    <button type="button" class="lobby-signin-btn">Sign in with Google</button>
                </div>
                <div class="lobby-hud-host" hidden></div>
            </div>

            <div class="games-grid">
                <a href="roulette/index.html" class="game-card roulette available">
                    <span class="game-icon"><svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="3" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/></svg></span>
                    <h3 class="game-name">Roulette</h3>
                    <p class="game-description">European & American wheel with live statistics.</p>
                    <div class="game-limits">100 – 5,000 / spot</div>
                </a>
                <a href="blackjack/game-mode/index.html" class="game-card blackjack available">
                    <span class="game-icon"><svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="11" height="15" rx="1.5"/><rect x="10" y="3" width="11" height="15" rx="1.5"/></svg></span>
                    <h3 class="game-name">Blackjack</h3>
                    <p class="game-description">Dealt hands with Perfect Pair, 21+3 and Top-3 side bets.</p>
                    <div class="game-limits">500 – 10,000</div>
                </a>
                <a href="blackjack/normal-shoe/index.html" class="game-card blackjack available">
                    <span class="game-icon"><svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="11" height="15" rx="1.5"/><rect x="10" y="3" width="11" height="15" rx="1.5"/></svg></span>
                    <h3 class="game-name">Blackjack — Normal Shoe</h3>
                    <p class="game-description">Realistic shoe dealing for card-counting play.</p>
                    <div class="game-limits">100 – 2,000</div>
                </a>
                <a href="baccarat/game-mode/index.html" class="game-card baccarat available">
                    <span class="game-icon"><svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="11" height="15" rx="1.5"/><rect x="10" y="3" width="11" height="15" rx="1.5"/><circle cx="8.5" cy="13.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.5" cy="10.5" r="1.5" fill="currentColor" stroke="none"/></svg></span>
                    <h3 class="game-name">Baccarat</h3>
                    <p class="game-description">Player / Banker / Tie with pairs, Dragon Bonus and Egalité.</p>
                    <div class="game-limits">500 – 10,000</div>
                </a>
                <a href="ultimate-texas-holdem/index.html" class="game-card uth available">
                    <span class="game-icon"><svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="11" height="15" rx="1.5"/><rect x="10" y="3" width="11" height="15" rx="1.5"/><path d="M15.5 7l2.2 2.8-2.2 2.8-2.2-2.8z" fill="currentColor" stroke="none"/></svg></span>
                    <h3 class="game-name">Ultimate Texas Hold'em</h3>
                    <p class="game-description">Online multiplayer vs the dealer. 10,000 buy-in from your chips.</p>
                    <div class="game-limits">Ante 100 – 1,000</div>
                </a>
            </div>
        </section>

        <section class="games-section" id="practiceZone">
            <h2 class="section-title zone-title">Practice</h2>
            <p class="zone-subtitle">Trainers, counting and theory. Free, no sign-in.</p>
            <div class="games-grid">
                <a href="roulette/trainer/index.html" class="game-card roulette available">
                    <h3 class="game-name">Roulette Dealer Trainer</h3>
                    <p class="game-description">Practice calculating dealer payouts, four difficulties.</p>
                </a>
                <a href="blackjack/index.html" class="game-card blackjack available">
                    <h3 class="game-name">Blackjack Card Counting</h3>
                    <p class="game-description">Hi-Lo counting trainers, easy → hard, with progress.</p>
                </a>
                <a href="baccarat/card-counting/index.html" class="game-card baccarat available">
                    <h3 class="game-name">Baccarat Card Counting</h3>
                    <p class="game-description">Road maps and an EV calculator for baccarat counting.</p>
                </a>
                <a href="poker/bb100/index.html" class="game-card poker available">
                    <h3 class="game-name">Poker Hand Recorder</h3>
                    <p class="game-description">Drop GG hand histories → bb/100, EV curves, cloud save.</p>
                </a>
                <a href="ultimate-texas-holdem/odds.html" class="game-card uth available">
                    <h3 class="game-name">Ultimate Hold'em Odds</h3>
                    <p class="game-description">Full payout table and house-edge reference.</p>
                </a>
            </div>
        </section>
```

**Second**, regroup the hamburger dropdown: in the `<nav class="dropdown-menu">`, change the existing single `<div class="dropdown-label">Games</div>` section so the five items are split — keep Roulette, Blackjack, Baccarat, Poker, Ultimate Hold'em under a `GAME LOBBY` label pointing at the same hrefs used above (`blackjack/game-mode/index.html`, `baccarat/game-mode/index.html` for the playable ones), and add a second `dropdown-section` labelled `PRACTICE` linking the trainer/recorder/odds pages. Change the `<div class="dropdown-label">Games</div>` text to `Game Lobby`, update the Blackjack href to `blackjack/game-mode/index.html` and Baccarat href to `baccarat/game-mode/index.html`, then after that section's closing `</div>` and before the `dropdown-divider`, insert:

```html
        <div class="dropdown-divider"></div>
        <div class="dropdown-section">
            <div class="dropdown-label">Practice</div>
            <a href="roulette/trainer/index.html" class="dropdown-item"><span>Roulette Trainer</span></a>
            <a href="blackjack/index.html" class="dropdown-item"><span>Blackjack Counting</span></a>
            <a href="baccarat/card-counting/index.html" class="dropdown-item"><span>Baccarat Counting</span></a>
            <a href="poker/bb100/index.html" class="dropdown-item"><span>Hand Recorder</span></a>
            <a href="ultimate-texas-holdem/odds.html" class="dropdown-item"><span>Hold'em Odds</span></a>
        </div>
```

**Third**, add the stylesheet and lobby module. In `<head>`, after `<link rel="stylesheet" href="css/admin.css">`, add:

```html
    <link rel="stylesheet" href="css/wallet.css">
```

And before `</body>`, after the existing `<script type="module" src="js/settings-modal.js"></script>`, add:

```html
    <script type="module" src="js/wallet/lobby.js"></script>
```

- [ ] **Step 3: Verify the full test suite is green**

Run: `cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator && node --test js/wallet/ && node --check js/wallet/lobby.js && node --check js/wallet/wallet-bootstrap.js`
Expected: all `js/wallet/*.test.mjs` PASS (table-config, wallet-client, wallet-hud, game-gate); both `node --check` clean.

- [ ] **Step 4: Browser end-to-end verification**

Use the `/run` skill (or the casino run pattern) to serve `calculator/` locally and open `index.html`. Verify with a real Google sign-in (the deployed Plan-1 backend is live):

1. **Signed out:** landing page shows two zones — "Game Lobby" (with a "Sign in to play with chips" prompt + Sign in button) and "Practice" (5 tool cards). Practice links open without login.
2. **Sign in with Google** (the popup account chooser appears): the sign-in prompt is replaced by the wallet HUD pill showing a real balance (100,000 for a fresh account, or the current balance for a returning one). Check the browser console: no errors; a `wallet-get` request to `api.system-design.hillmanchan.com` returns 200.
3. **Reset affordance:** (only if the test account is genuinely < 100 chips — do NOT spend real balance to force this; it's covered by unit tests). Confirm the HUD renders the balance without a reset button when funded.
4. **Sign out** (via the Settings modal): the HUD disappears and the "Sign in to play" prompt returns; console shows the local round keys cleared (no error).
5. Confirm the game cards still navigate to their existing pages (unchanged internals — Plan 3 converts them) and the hamburger menu shows the Game Lobby / Practice split.

Capture a screenshot or GIF of the signed-in lobby with the balance pill for the report. If sign-in is blocked by the API-key referrer restriction in the local harness, note it and verify via the deployed origin instead (`casino-game.hillmanchan.com`) — do NOT weaken the referrer allowlist.

- [ ] **Step 5: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/casino-game/calculator/index.html \
        portfolio/src/game/casino-game/calculator/js/wallet/lobby.js \
        portfolio/src/game/casino-game/calculator/css/wallet.css
git commit -m "feat(casino): lobby/practice split + live wallet HUD on landing page"
```

---

## Self-Review Notes

- **Spec coverage (Section 1 nav + gate, Section 3 modules):** landing split ✓ (Task 6), login-aware Game Lobby ✓ (Task 6), Practice open ✓ (Task 6), `wallet-client.js` ✓ (Task 2), `wallet-hud.js` ✓ (Task 3), `game-gate.js` ✓ (Task 4, mounted Plan 3), `table-config.js` mirror ✓ (Task 1), `wallet-bootstrap` wiring ✓ (Task 5). Deferred to Plan 3 (correctly): mounting the gate on the 5 game pages, converting game bankrolls to the wallet, `checkBet` optimistic validation. Deferred to Plan 4: UTH buy-in escrow.
- **Cross-task type consistency:** `post(action,payload)→{status,body}`, `WalletError.code/.retryAt`, `formatChips`, `getResetInfo()`, `openRound()`, `bootstrap.onAuth/signIn`, `walletClient` — all defined in Task 2/5 and consumed with the same shapes in Tasks 3/6.
- **No sync to public/** — every task stays in `src/`; confirmed no task runs the public sync.
- **Server-authority preserved:** the client mirror is optimistic only; the test in Task 1 pins the numbers to the Plan-1 server values so drift fails CI. The wallet-client never computes balance — it only reflects server responses.
- **Known follow-ups for Plan 3 (recorded, not silently dropped):** game-gate `mountGameGate` browser verification; per-game `checkBet`; the game cards still link to un-gated pages until Plan 3 mounts the gate.
