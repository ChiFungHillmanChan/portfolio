import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GAME_TABLES,
  getTable,
  betTypeSpec,
  formatChips,
  LOBBY_GAMES,
  PRACTICE_GAMES,
  BLACKJACK_STAKES,
  ROULETTE_STAKES,
  BACCARAT_STAKES,
  GAME_STAKES,
  gameStakes,
  resolveStake,
  blackjackStake,
} from "./table-config.js";

test("GAME_TABLES mirrors the server gameIds (incl. every game's stake tiers)", () => {
  assert.deepEqual(
    Object.keys(GAME_TABLES).sort(),
    [
      "baccarat", "baccarat-high", "baccarat-micro", "baccarat-mini",
      "blackjack", "blackjack-high", "blackjack-micro", "blackjack-mini", "blackjack-shoe",
      "roulette", "roulette-high", "roulette-micro", "roulette-mini",
    ]
  );
});

test("roulette stake tiers mirror the server: min/total scale, per-class pay fixed", () => {
  const tiers = {
    "roulette-micro": { min: 10, total: 2000 },
    "roulette-mini":  { min: 50, total: 5000 },
    roulette:         { min: 100, total: 20000 },
    "roulette-high":  { min: 500, total: 100000 },
  };
  for (const [gameId, exp] of Object.entries(tiers)) {
    const t = GAME_TABLES[gameId];
    assert.equal(t.maxTotalBet, exp.total, `${gameId} maxTotalBet`);
    assert.equal(Object.keys(t.betTypes).length, 8, `${gameId} bet classes`);
    for (const [type, spec] of Object.entries(t.betTypes)) {
      assert.equal(spec.min, exp.min, `${gameId}.${type}.min`);
      assert.equal(spec.max, exp.total, `${gameId}.${type}.max = total`);
      assert.equal(spec.maxReturn, GAME_TABLES.roulette.betTypes[type].maxReturn, `${gameId}.${type} pay`);
      assert.equal(spec.mergeFactor, 1, `${gameId}.${type} mergeFactor`);
    }
  }
});

test("baccarat stake tiers mirror the server: limits scale, every class's pay fixed", () => {
  const tiers = {
    "baccarat-micro": { pb: [50, 1000],     side: [10, 100],    dragon: 200,  egalite: 1000,  total: 2500 },
    "baccarat-mini":  { pb: [100, 2500],    side: [25, 250],    dragon: 500,  egalite: 2500,  total: 6000 },
    baccarat:         { pb: [500, 10000],   side: [100, 1000],  dragon: 2000, egalite: 10000, total: 25000 },
    "baccarat-high":  { pb: [1000, 20000],  side: [200, 2000],  dragon: 4000, egalite: 20000, total: 50000 },
  };
  for (const [gameId, exp] of Object.entries(tiers)) {
    const t = GAME_TABLES[gameId];
    assert.equal(t.maxTotalBet, exp.total, `${gameId} maxTotalBet`);
    for (const type of ["player", "banker"]) {
      assert.equal(t.betTypes[type].min, exp.pb[0], `${gameId}.${type}.min`);
      assert.equal(t.betTypes[type].max, exp.pb[1], `${gameId}.${type}.max`);
    }
    for (const type of ["tie", "playerPair", "bankerPair"]) {
      assert.equal(t.betTypes[type].min, exp.side[0], `${gameId}.${type}.min`);
      assert.equal(t.betTypes[type].max, exp.side[1], `${gameId}.${type}.max`);
    }
    assert.equal(t.betTypes.dragonBonus.max, exp.dragon, `${gameId}.dragonBonus.max`);
    assert.equal(t.betTypes.egalite.max, exp.egalite, `${gameId}.egalite.max`);
    for (const [type, spec] of Object.entries(t.betTypes)) {
      assert.equal(spec.maxReturn, GAME_TABLES.baccarat.betTypes[type].maxReturn, `${gameId}.${type} pay`);
    }
  }
});

test("blackjack stake tiers mirror the server: scaled limits, shared pay table", () => {
  const tiers = {
    "blackjack-micro": { main: [50, 1000], side: 250, maxTotal: 1750 },
    "blackjack-mini":  { main: [100, 2500], side: 500, maxTotal: 4000 },
    blackjack:         { main: [500, 10000], side: 2500, maxTotal: 17500 },
    "blackjack-high":  { main: [1000, 20000], side: 5000, maxTotal: 35000 },
  };
  for (const [gameId, exp] of Object.entries(tiers)) {
    const t = GAME_TABLES[gameId];
    assert.deepEqual(t.betTypes.main, { min: exp.main[0], max: exp.main[1], maxReturn: 2.5, mergeFactor: 8 }, `${gameId} main`);
    assert.equal(t.betTypes.perfectPair.max, exp.side, `${gameId} side max`);
    assert.equal(t.betTypes.perfectPair.maxReturn, 26, `${gameId} pp pay`);
    assert.equal(t.betTypes.twentyOnePlus3.maxReturn, 101, `${gameId} 21+3 pay`);
    assert.equal(t.betTypes.top3.maxReturn, 271, `${gameId} top3 pay`);
    assert.equal(t.maxTotalBet, exp.maxTotal, `${gameId} maxTotalBet`);
    assert.equal(t.maxTotalBet, exp.main[1] + 3 * exp.side, `${gameId} maxTotal = main.max + 3×side`);
  }
});

test("BLACKJACK_STAKES lists the 4 tiers low→high, each mapping to a real table", () => {
  assert.deepEqual(BLACKJACK_STAKES.map((s) => s.key), ["micro", "mini", "std", "high"]);
  for (const s of BLACKJACK_STAKES) {
    assert.ok(s.name && s.limitsText && s.blurb, `${s.key} fields`);
    assert.ok(GAME_TABLES[s.gameId], `${s.key} → real gameId ${s.gameId}`);
  }
});

test("blackjackStake resolves a key or returns null", () => {
  assert.equal(blackjackStake("high").gameId, "blackjack-high");
  assert.equal(blackjackStake("std").gameId, "blackjack");
  assert.equal(blackjackStake("nope"), null);
  assert.equal(blackjackStake(undefined), null);
});

test("GAME_STAKES registers all three tiered games with 4 tiers each, low→high", () => {
  assert.deepEqual(Object.keys(GAME_STAKES).sort(), ["baccarat", "blackjack", "roulette"]);
  for (const [game, stakes] of Object.entries(GAME_STAKES)) {
    assert.deepEqual(stakes.map((s) => s.key), ["micro", "mini", "std", "high"], `${game} keys`);
    for (const s of stakes) {
      assert.ok(s.name && s.limitsText && s.blurb, `${game}/${s.key} fields`);
      assert.ok(GAME_TABLES[s.gameId], `${game}/${s.key} → real gameId ${s.gameId}`);
    }
    // The std tier is the game's original (Standard) table.
    assert.equal(stakes.find((s) => s.key === "std").gameId, game, `${game} std = house table`);
  }
  assert.equal(GAME_STAKES.roulette, ROULETTE_STAKES);
  assert.equal(GAME_STAKES.baccarat, BACCARAT_STAKES);
  assert.equal(GAME_STAKES.blackjack, BLACKJACK_STAKES);
});

test("gameStakes/resolveStake resolve tiered games and reject unknown ones", () => {
  assert.equal(gameStakes("roulette").length, 4);
  assert.equal(gameStakes("craps"), null);
  assert.equal(gameStakes("toString"), null); // own-property only
  assert.equal(resolveStake("roulette", "micro").gameId, "roulette-micro");
  assert.equal(resolveStake("baccarat", "high").gameId, "baccarat-high");
  assert.equal(resolveStake("baccarat", "nope"), null);
  assert.equal(resolveStake("craps", "micro"), null);
});

test("GAME_TABLES numbers match the Plan-3 server mirror exactly", () => {
  assert.deepEqual(GAME_TABLES.roulette.betTypes.straight, { min: 100, max: 20000, maxReturn: 36, mergeFactor: 1 });
  assert.equal(GAME_TABLES.roulette.maxTotalBet, 20000);
  assert.deepEqual(GAME_TABLES.blackjack.betTypes.main, { min: 500, max: 10000, maxReturn: 2.5, mergeFactor: 8 });
  assert.deepEqual(GAME_TABLES.blackjack.betTypes.twentyOnePlus3, { min: 100, max: 2500, maxReturn: 101, mergeFactor: 1 });
  assert.deepEqual(GAME_TABLES["blackjack-shoe"].betTypes.main, { min: 100, max: 2000, maxReturn: 2.5, mergeFactor: 8 });
  assert.equal(GAME_TABLES.baccarat.betTypes.banker.maxReturn, 1.95);
  assert.deepEqual(GAME_TABLES.baccarat.betTypes.egalite, { min: 100, max: 10000, maxReturn: 226, mergeFactor: 1 });
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

test("LOBBY_GAMES has the 4 playable lobby entries with hrefs + limit text", () => {
  const ids = LOBBY_GAMES.map((g) => g.id);
  assert.deepEqual(ids, ["roulette", "blackjack", "baccarat", "uth"]);
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

test("PRACTICE_GAMES includes the normal-shoe counting trainer", () => {
  assert.ok(PRACTICE_GAMES.some((g) => /normal shoe/i.test(g.name)));
});

test("roulette mirror uses aggregate caps (max = total)", () => {
  for (const bt of Object.values(GAME_TABLES.roulette.betTypes)) {
    assert.equal(bt.max, 20000);
    assert.equal(bt.min, 100);
  }
  assert.equal(GAME_TABLES.roulette.betTypes.straight.maxReturn, 36);
  assert.equal(GAME_TABLES.roulette.betTypes.evenMoney.maxReturn, 2);
  assert.equal(GAME_TABLES.roulette.maxTotalBet, 20000);
});

test("baccarat mirror matches the server aggregate caps", () => {
  assert.deepEqual(GAME_TABLES.baccarat.betTypes.dragonBonus, { min: 100, max: 2000, maxReturn: 31, mergeFactor: 1 });
  assert.deepEqual(GAME_TABLES.baccarat.betTypes.egalite, { min: 100, max: 10000, maxReturn: 226, mergeFactor: 1 });
  assert.equal(GAME_TABLES.baccarat.maxTotalBet, 25000);
});
