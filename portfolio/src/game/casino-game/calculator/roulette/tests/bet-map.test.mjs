import { test } from "node:test";
import assert from "node:assert/strict";
import { mapRouletteBets, findMinViolation } from "../js/wallet/bet-map.js";

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

// --- findMinViolation: client mirror of the server's per-class min rule ---
// (wallet-logic.mjs validateBets rejects any payout-class aggregate < min).

// Standard-tier shape — only `min` matters to the validator.
const MIN100 = Object.fromEntries(
  ["straight", "split", "street", "corner", "sixline", "column", "dozen", "evenMoney"]
    .map((t) => [t, { min: 100, max: 20000 }]),
);

test("flags a single sub-min chip (default $1 chip on red)", () => {
  assert.deepEqual(findMinViolation({ red: 1 }, MIN100), {
    type: "evenMoney", amount: 1, min: 100,
  });
});

test("flags a small class even when another class is well over min", () => {
  assert.deepEqual(findMinViolation({ red: 500, straight: { "17": 25 } }, MIN100), {
    type: "straight", amount: 25, min: 100,
  });
});

test("same-class spots aggregate before the min check", () => {
  // 4 × 25 straights = 100 → meets the class min even though each spot is under it
  const bets = { straight: { "1": 25, "2": 25, "3": 25, "4": 25 } };
  assert.equal(findMinViolation(bets, MIN100), null);
});

test("trio/firstFour/topLine fold into their payout class before the check", () => {
  // street class = street 60 + trio 40 = 100 → OK; corner class = firstFour 50 + topLine 50 = 100 → OK
  const bets = {
    street: { "1-2-3": 60 }, trio: { "0-1-2": 40 },
    firstFour: 50, topLine: 50,
  };
  assert.equal(findMinViolation(bets, MIN100), null);
});

test("passes when every class meets its min; empty bets pass", () => {
  assert.equal(findMinViolation({ red: 100, dozen: { "2": 150 } }, MIN100), null);
  assert.equal(findMinViolation({}, MIN100), null);
});
