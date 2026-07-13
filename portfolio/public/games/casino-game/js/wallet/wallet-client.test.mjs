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

test("clear() resets balance to null and notifies subscribers", async () => {
  const post = fakePost([{ status: 200, body: { ok: true, balance: 100000, canReset: true, resetAvailableAt: null } }]);
  const c = createWalletClient(deps(post));
  await c.load();
  const seen = [];
  c.subscribe((b) => seen.push(b));
  c.clear();
  assert.equal(c.getBalance(), null);
  assert.deepEqual(c.getResetInfo(), { canReset: false, resetAvailableAt: null });
  assert.deepEqual(seen, [null]);
});

test("bet() surfaces forfeited chips from a stale round replacement", async () => {
  const post = fakePost([{ status: 200, body: { ok: true, balance: 99400, roundId: "rid-fixed", forfeited: 100 } }]);
  const c = createWalletClient(deps(post));
  const r = await c.bet("roulette", { straight: 100 });
  assert.equal(r.forfeited, 100);
});

test("reset() cooldown stores retryAt before rejecting", async () => {
  const post = fakePost([{ status: 403, body: { ok: false, error: "cooldown", retryAt: "2027-01-15T14:00:00.000Z" } }]);
  const c = createWalletClient(deps(post));
  await assert.rejects(() => c.reset(), (e) => e instanceof WalletError && e.code === "cooldown");
  assert.deepEqual(c.getResetInfo(), { canReset: false, resetAvailableAt: "2027-01-15T14:00:00.000Z" });
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

test("load() skips a malformed round (missing roundId) and does not throw", async () => {
  const post = fakePost([{ status: 200, body: {
    ok: true, balance: 100000, canReset: false, resetAvailableAt: null,
    openRounds: { roulette: { bets: { straight: 100 } } }, // missing roundId
  }}]);
  const c = createWalletClient(deps(post));
  await c.load(); // should not throw
  assert.equal(c.openRound("roulette"), null); // malformed round was skipped, not written
});
