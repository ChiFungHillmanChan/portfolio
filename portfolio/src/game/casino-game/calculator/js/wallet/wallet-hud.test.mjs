import { test } from "node:test";
import assert from "node:assert/strict";
import { formatHud } from "./wallet-hud.js";

const NOW = 1_800_000_000_000;

test("loading state when balance is null", () => {
  const h = formatHud({ balance: null, canReset: false, resetAvailableAt: null }, NOW);
  assert.equal(h.state, "loading");
  assert.equal(h.balanceText, "—");
  assert.equal(h.showReset, false);
});

test("ok state formats the balance and hides reset", () => {
  const h = formatHud({ balance: 100000, canReset: false, resetAvailableAt: null }, NOW);
  assert.equal(h.state, "ok");
  assert.equal(h.balanceText, "100,000");
  assert.equal(h.showReset, false);
  assert.equal(h.cooldownText, null);
});

test("bust state below 100 shows reset when available", () => {
  const h = formatHud({ balance: 40, canReset: true, resetAvailableAt: null }, NOW);
  assert.equal(h.state, "bust");
  assert.equal(h.showReset, true);
  assert.equal(h.cooldownText, null);
});

test("bust state on cooldown shows a countdown, not the button", () => {
  const readyAt = new Date(NOW + 2 * 3600_000 + 5 * 60_000).toISOString(); // 2h5m out
  const h = formatHud({ balance: 0, canReset: false, resetAvailableAt: readyAt }, NOW);
  assert.equal(h.state, "bust");
  assert.equal(h.showReset, false);
  assert.equal(h.cooldownText, "2h 5m");
});

test("cooldown that has elapsed shows the reset button", () => {
  const past = new Date(NOW - 1000).toISOString();
  const h = formatHud({ balance: 0, canReset: true, resetAvailableAt: past }, NOW);
  assert.equal(h.showReset, true);
  assert.equal(h.cooldownText, null);
});

test("cooldown under a minute reads in minutes (rounds up to 1m)", () => {
  const readyAt = new Date(NOW + 30_000).toISOString();
  const h = formatHud({ balance: 0, canReset: false, resetAvailableAt: readyAt }, NOW);
  assert.equal(h.cooldownText, "1m");
});

test("boundary: balance exactly 100 is ok state, not bust", () => {
  const h = formatHud({ balance: 100, canReset: false, resetAvailableAt: null }, NOW);
  assert.equal(h.state, "ok");
  assert.equal(h.showReset, false);
});

test("canReset ignored: stale server flag does not suppress button when cooldown is null", () => {
  const h = formatHud({ balance: 0, canReset: false, resetAvailableAt: null }, NOW);
  assert.equal(h.state, "bust");
  assert.equal(h.showReset, true);
  assert.equal(h.cooldownText, null);
});

test("malformed cooldown: bad ISO string renders no countdown, shows reset", () => {
  const h = formatHud({ balance: 0, canReset: false, resetAvailableAt: "not-a-date" }, NOW);
  assert.equal(h.state, "bust");
  assert.equal(h.cooldownText, null);
  assert.equal(h.showReset, true);
});

// ---------- dual balance: chips (balance) + wallet cash ----------

test("cashText renders when cash is present, null otherwise (back-compat)", () => {
  const dual = formatHud({ balance: 3500, cash: 12000, canReset: false, resetAvailableAt: null }, NOW);
  assert.equal(dual.balanceText, "3,500");
  assert.equal(dual.cashText, "12,000");
  const legacy = formatHud({ balance: 3500, canReset: false, resetAvailableAt: null }, NOW);
  assert.equal(legacy.cashText, null);
});

test("bust is judged on cash + chips: chips 0 with cash in the wallet is NOT bust", () => {
  const h = formatHud({ balance: 0, cash: 12000, canReset: false, resetAvailableAt: null }, NOW);
  assert.equal(h.state, "ok");
  assert.equal(h.showReset, false);
});

test("bust when cash + chips together are below the threshold", () => {
  const h = formatHud({ balance: 40, cash: 20, canReset: false, resetAvailableAt: null }, NOW);
  assert.equal(h.state, "bust");
  assert.equal(h.showReset, true);
});

test("resetLabel follows the server-configured resetChips (default 5,000)", () => {
  const dflt = formatHud({ balance: 0, canReset: true, resetAvailableAt: null }, NOW);
  assert.equal(dflt.resetLabel, "Reset +5,000");
  const tuned = formatHud({ balance: 0, canReset: true, resetAvailableAt: null, resetChips: 2000 }, NOW);
  assert.equal(tuned.resetLabel, "Reset +2,000");
});
