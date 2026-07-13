import { test } from "node:test";
import assert from "node:assert/strict";
import { mapBlackjackBets } from "../js/wallet/bet-map.js";

test("maps main + three side bets 1:1, dropping zero/absent buckets", () => {
  assert.deepEqual(
    mapBlackjackBets({ main: 500, perfectPair: 100, twentyOnePlus3: 0, top3: 250 }),
    { main: 500, perfectPair: 100, top3: 250 }
  );
});

test("main only (no side bets) → just main", () => {
  assert.deepEqual(mapBlackjackBets({ main: 1000 }), { main: 1000 });
});

test("a double/split top-up delta maps to a lone main bucket", () => {
  assert.deepEqual(mapBlackjackBets({ main: 600 }), { main: 600 });
});

test("empty / all-zero / nullish → empty object", () => {
  assert.deepEqual(mapBlackjackBets({}), {});
  assert.deepEqual(mapBlackjackBets({ main: 0, perfectPair: 0 }), {});
  assert.deepEqual(mapBlackjackBets(null), {});
  assert.deepEqual(mapBlackjackBets(undefined), {});
});

test("non-positive / non-finite amounts are ignored; fractions truncate", () => {
  assert.deepEqual(mapBlackjackBets({ main: -500, perfectPair: NaN, top3: 100.9 }), { top3: 100 });
});

test("ignores unknown keys — only the four server buckets are emitted", () => {
  assert.deepEqual(
    mapBlackjackBets({ main: 500, insurance: 250, toString: 100 }),
    { main: 500 }
  );
});
