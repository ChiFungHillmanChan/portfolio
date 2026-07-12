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
