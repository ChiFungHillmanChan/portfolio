// tests/local-table.test.mjs — the solo "reset-session" action.
// local-table.js runs under plain Node: its localStorage access is
// try/catch-wrapped, so persistence is simply skipped here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { localCall, watchLocalTable, LOCAL_UID } from "../js/state/local-table.js";

const flush = () => new Promise((r) => setTimeout(r, 0));

test("reset-session rebuilds a pristine table after a deal", async () => {
  const seen = { table: null, myCards: null };
  const un = watchLocalTable("SOLO", {
    onTable: (t) => (seen.table = t),
    onMyCards: (d) => (seen.myCards = d),
  });

  await localCall("SOLO", "place-bets", { ante: 100, trips: 25 });
  await flush();
  assert.equal(seen.table.phase, "preflop");
  assert.equal(seen.myCards?.holeCards?.length, 2);
  const before = seen.table.seats.find((s) => s.uid === LOCAL_UID);
  assert.ok(before.stack < 10000);

  await localCall("SOLO", "reset-session");
  await flush();
  const t = seen.table;
  const seat = t.seats.find((s) => s.uid === LOCAL_UID);
  assert.equal(t.phase, "betting");
  assert.equal(t.roundNo, 1);
  assert.deepEqual(t.community, []);
  assert.equal(t.dealer.holeCards, null);
  assert.equal(t.actionDeadline, null);
  assert.equal(seat.stack, 10000);
  assert.equal(seat.sessionNet, 0);
  assert.equal(seat.handsWon, 0);
  assert.equal(seat.handsPlayed, 0);
  assert.deepEqual(seat.bets, { ante: 0, blind: 0, trips: 0, holeCard: 0, badBeat: 0, jackpot: 0 });
  assert.equal(seen.myCards, null);
  un();
});

test("reset-session on an online code rejects with bad-code", async () => {
  await assert.rejects(localCall("8K3F", "reset-session"), (e) => e.code === "bad-code");
});
