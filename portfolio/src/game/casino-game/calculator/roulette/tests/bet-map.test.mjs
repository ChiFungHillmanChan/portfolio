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
