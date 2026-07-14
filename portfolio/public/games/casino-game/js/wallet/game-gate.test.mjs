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
    { authReady: true, signedIn: true, balance: 0, cash: 100000, minBet: 500 },
  ]) {
    assert.ok(computeGateState(s).message.length > 0);
  }
});

// ---------- dual balance: wallet cash + chips ----------

test("not bust when the wallet still holds cash — offer buy-in instead", () => {
  const s = computeGateState({ authReady: true, signedIn: true, balance: 0, cash: 100000, minBet: 500 });
  assert.equal(s.mode, "buy-in");
  assert.equal(s.suggestedBuyIn, 5000);   // min(cash, 10× minBet)
});

test("buy-in suggestion is capped at the available cash", () => {
  const s = computeGateState({ authReady: true, signedIn: true, balance: 0, cash: 800, minBet: 500 });
  assert.equal(s.mode, "buy-in");
  assert.equal(s.suggestedBuyIn, 800);
});

test("bust only when cash + chips together are below the threshold", () => {
  assert.equal(computeGateState({ authReady: true, signedIn: true, balance: 40, cash: 20, minBet: 500 }).mode, "bust");
});

test("insufficient when even cash + chips cannot reach the table minimum", () => {
  assert.equal(computeGateState({ authReady: true, signedIn: true, balance: 100, cash: 100, minBet: 500 }).mode, "insufficient");
});

test("legacy call without cash behaves exactly as before", () => {
  assert.equal(computeGateState({ authReady: true, signedIn: true, balance: 40, minBet: 500 }).mode, "bust");
  assert.equal(computeGateState({ authReady: true, signedIn: true, balance: 300, minBet: 500 }).mode, "insufficient");
  assert.equal(computeGateState({ authReady: true, signedIn: true, balance: 500, minBet: 500 }).mode, "ready");
});
