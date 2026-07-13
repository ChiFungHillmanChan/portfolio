// wallet-hud.js — the chip-balance pill. formatHud() is pure (tested);
// mountWalletHud() renders + subscribes (browser-verified). Below 100 chips the
// pill flips to a bust state showing either a Reset button (when available) or
// a cooldown countdown.

import { formatChips } from "./table-config.js";

const BUST_THRESHOLD = 100;

function cooldownText(resetAvailableAt, nowMs) {
  if (!resetAvailableAt) return null;
  const ms = Date.parse(resetAvailableAt) - nowMs;
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return null;
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatHud({ balance, canReset, resetAvailableAt }, nowMs) {
  if (typeof balance !== "number") {
    return { state: "loading", balanceText: "—", showReset: false, cooldownText: null };
  }
  const cd = cooldownText(resetAvailableAt, nowMs);
  if (balance < BUST_THRESHOLD) {
    return {
      state: "bust",
      balanceText: formatChips(balance),
      // showReset is gated on the LOCALLY-recomputed cooldown (cd), so the button flips live
      // as the cooldown elapses without needing a fresh server fetch; canReset from the
      // server is a stale snapshot and intentionally not used here.
      showReset: cd === null,
      cooldownText: cd,
    };
  }
  return { state: "ok", balanceText: formatChips(balance), showReset: false, cooldownText: null };
}

const CHIP_SVG = `<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="3" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="21" y2="12"/></svg>`;

// Renders the pill into `container` and keeps it live. `onReset` is called when
// the user clicks Reset; it should call walletClient.reset() and handle errors.
export function mountWalletHud(container, walletClient, { now = () => Date.now(), onReset } = {}) {
  const el = document.createElement("div");
  el.className = "wallet-hud";
  container.appendChild(el);

  const render = () => {
    const info = walletClient.getResetInfo();
    const h = formatHud({ balance: walletClient.getBalance(), ...info }, now());
    el.dataset.state = h.state;
    el.innerHTML = `
      <span class="wallet-hud-chip">${CHIP_SVG}</span>
      <span class="wallet-hud-balance">${h.balanceText}</span>
      ${h.showReset ? `<button type="button" class="wallet-hud-reset">Reset +5,000</button>` : ""}
      ${h.cooldownText ? `<span class="wallet-hud-cooldown">Reset in ${h.cooldownText}</span>` : ""}
    `;
    const btn = el.querySelector(".wallet-hud-reset");
    if (btn && onReset) btn.addEventListener("click", () => onReset());
  };

  render();
  const unsub = walletClient.subscribe(render);
  const timer = setInterval(render, 30000); // refresh cooldown countdown
  return function unmount() {
    unsub();
    clearInterval(timer);
    el.remove();
  };
}
