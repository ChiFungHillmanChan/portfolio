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
