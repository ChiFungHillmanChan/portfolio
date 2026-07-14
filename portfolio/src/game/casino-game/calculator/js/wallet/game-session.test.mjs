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
