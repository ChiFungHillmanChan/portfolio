// stake-picker.js — the shared full-screen stake-tier chooser, used by every
// tiered wallet game. A game page loads with ?stake=<key>; when the param is
// missing or unknown the page mounts THIS picker instead of booting
// createGameSession(). Each tier card is a plain link to ?stake=<key> (full
// reload → the game's *-wallet.js re-runs and boots that tier's table), so
// keyboard/back-button behaviour comes for free.
//
// stakeFromUrl() and pickerModel() are pure (node --test); mountStakePicker()
// is DOM-only and dynamic-imports wallet-bootstrap.js (Firebase CDN) purely as
// a best-effort balance line, so this module stays importable under node.

import { gameStakes, resolveStake, getTable, formatChips } from "./table-config.js";

// Resolves the ?stake= param from a location.search string (null → picker).
export function stakeFromUrl(game, search) {
  let key = null;
  try { key = new URLSearchParams(search || "").get("stake"); } catch { key = null; }
  return resolveStake(game, key);
}

// Pure view-model for the picker cards (one per tier, low → high).
export function pickerModel(game) {
  const stakes = gameStakes(game) || [];
  return stakes.map((s) => {
    const table = getTable(s.gameId);
    return {
      key: s.key,
      name: s.name,
      limitsText: s.limitsText,
      blurb: s.blurb,
      maxTotalBet: table ? table.maxTotalBet : null,
    };
  });
}

// Full-screen overlay with one card per tier. opts:
//   { game, title, container = document.body, lobbyHref = "../index.html" }
// Returns { unmount() }.
export function mountStakePicker({ game, title = "", container = document.body, lobbyHref = "../index.html" }) {
  const model = pickerModel(game);
  const overlay = document.createElement("div");
  overlay.className = "stake-picker-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "Choose your stakes");
  overlay.innerHTML = `
    <div class="stake-picker">
      <h1 class="stake-picker-title">${title || "Choose Your Stakes"}</h1>
      <p class="stake-picker-sub">Pick a table — you can switch tiers any time.</p>
      <p class="stake-picker-balance" hidden></p>
      <div class="stake-picker-cards">
        ${model.map((c) => `
        <a class="stake-card" href="?stake=${c.key}">
          <span class="stake-card-name">${c.name}</span>
          <span class="stake-card-limits">${c.limitsText}</span>
          <span class="stake-card-blurb">${c.blurb}</span>
        </a>`).join("")}
      </div>
      <a class="stake-picker-lobby" href="${lobbyHref}">← Back to lobby</a>
    </div>`;
  container.appendChild(overlay);

  // Best-effort balance line so a signed-in player can see what they can
  // afford before picking. Signed-out / offline → the line just stays hidden.
  import("./wallet-bootstrap.js")
    .then(({ default: bootstrap }) => {
      const el = overlay.querySelector(".stake-picker-balance");
      const paint = () => {
        const bal = bootstrap.walletClient.getBalance();
        if (typeof bal === "number" && el) {
          el.textContent = `Your balance: ${formatChips(bal)} chips`;
          el.hidden = false;
        }
      };
      bootstrap.walletClient.subscribe(paint);
      paint();
    })
    .catch(() => { /* picker works without a balance line */ });

  return { unmount: () => overlay.remove() };
}
