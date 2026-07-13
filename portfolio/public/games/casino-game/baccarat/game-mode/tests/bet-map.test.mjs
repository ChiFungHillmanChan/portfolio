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
