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
