import { test } from "node:test";
import assert from "node:assert/strict";
import { stakeFromUrl, pickerModel } from "./stake-picker.js";
import { GAME_STAKES, GAME_TABLES } from "./table-config.js";

test("stakeFromUrl resolves a valid ?stake= key to its stake entry", () => {
  assert.equal(stakeFromUrl("blackjack", "?stake=micro").gameId, "blackjack-micro");
  assert.equal(stakeFromUrl("blackjack", "?stake=std").gameId, "blackjack");
  assert.equal(stakeFromUrl("blackjack", "?stake=high&x=1").gameId, "blackjack-high");
});

test("stakeFromUrl returns null for missing/unknown keys or untired games", () => {
  assert.equal(stakeFromUrl("blackjack", ""), null);
  assert.equal(stakeFromUrl("blackjack", "?stake=nope"), null);
  assert.equal(stakeFromUrl("blackjack", "?other=1"), null);
  assert.equal(stakeFromUrl("craps", "?stake=micro"), null);
  assert.equal(stakeFromUrl("blackjack", undefined), null);
});

test("pickerModel exposes one card per tier with limits + a real table", () => {
  for (const [game, stakes] of Object.entries(GAME_STAKES)) {
    const model = pickerModel(game);
    assert.equal(model.length, stakes.length, `${game} card count`);
    for (const card of model) {
      assert.ok(card.name && card.limitsText && card.blurb, `${game}/${card.key} fields`);
      assert.ok(Number.isInteger(card.maxTotalBet) && card.maxTotalBet > 0, `${game}/${card.key} table`);
    }
  }
});

test("pickerModel of an untired game is empty", () => {
  assert.deepEqual(pickerModel("craps"), []);
});

test("every stake gameId has a table and tiers are ordered low → high", () => {
  for (const [game, stakes] of Object.entries(GAME_STAKES)) {
    let prevMax = 0;
    for (const s of stakes) {
      const table = GAME_TABLES[s.gameId];
      assert.ok(table, `${game}/${s.key} → ${s.gameId}`);
      assert.ok(table.maxTotalBet > prevMax, `${game}/${s.key} ascending maxTotalBet`);
      prevMax = table.maxTotalBet;
    }
  }
});
