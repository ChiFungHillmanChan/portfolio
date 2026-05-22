// static-replay.js — render a hand's extracted actions as a readable text log,
// inside a modal overlay. Pure DOM; no animation. Phase 5a deliverable.

import { extractActions } from "./action-extractor.js";

const MODAL_ID = "replayModal";

function fmtMoney(amount) {
  return "$" + Number(amount).toFixed(2);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Inline star icon for all-in markers. Pre-escaped trusted markup.
const STAR_SVG = `<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><polygon points="12 2 14.85 8.5 22 9.27 16.5 14 18 21 12 17.5 6 21 7.5 14 2 9.27 9.15 8.5"/></svg>`;

function fmtCards(cards) {
  const span = document.createElement("span");
  span.className = "replay-cards";
  for (const c of cards) {
    const card = document.createElement("span");
    card.className = "replay-card";
    if (c.length >= 2) {
      const suit = c[c.length - 1];
      card.classList.add("suit-" + suit);
    }
    card.textContent = c;
    span.appendChild(card);
  }
  return span;
}

function appendLine(container, parts) {
  const line = document.createElement("div");
  line.className = "replay-line";
  for (const p of parts) {
    if (typeof p === "string") line.appendChild(document.createTextNode(p));
    else line.appendChild(p);
  }
  container.appendChild(line);
}

function appendSection(container, title, className = "") {
  const h = document.createElement("div");
  h.className = "replay-section " + className;
  h.textContent = title;
  container.appendChild(h);
}

function renderEvents(container, { meta, seats, events, summary }) {
  // Header
  appendSection(container, `Hand #${meta.handId}`, "replay-header");
  appendLine(container, [
    `${meta.gameType || "Hold'em"} · `,
    `Blinds ${fmtMoney(meta.stake.sb)}/${fmtMoney(meta.stake.bb)} · `,
    `Table '${meta.tableName || "?"}' · `,
    meta.date || "",
  ]);

  // Seats
  appendSection(container, "Seats", "");
  for (const s of seats) {
    const isButton = s.seat === meta.buttonSeat;
    appendLine(container, [
      `Seat ${s.seat}${isButton ? " (Button)" : ""}: ${s.name} — ${fmtMoney(s.stack)}`,
    ]);
  }

  // Events
  for (const ev of events) {
    switch (ev.type) {
      case "street":
        appendSection(container, ev.name.toUpperCase());
        if (ev.cards) appendLine(container, ["Flop: ", fmtCards(ev.cards)]);
        else if (ev.card) appendLine(container, [ev.name === "turn" ? "Turn: " : "River: ", fmtCards([ev.card])]);
        break;
      case "deal-hole":
        appendLine(container, [`${ev.player} is dealt `, fmtCards(ev.cards)]);
        break;
      case "post-blind":
        appendLine(container, [`${ev.player} posts ${ev.blind} ${fmtMoney(ev.amount)}`]);
        break;
      case "action": {
        let txt;
        if (ev.verb === "folds") txt = `${ev.player} folds`;
        else if (ev.verb === "checks") txt = `${ev.player} checks`;
        else if (ev.verb === "calls") txt = `${ev.player} calls ${fmtMoney(ev.amount || 0)}`;
        else if (ev.verb === "bets") txt = `${ev.player} bets ${fmtMoney(ev.amount || 0)}`;
        else if (ev.verb === "raises") txt = `${ev.player} raises ${fmtMoney(ev.raiseBy || 0)} to ${fmtMoney(ev.to || 0)}`;
        else txt = `${ev.player} ${ev.verb}`;
        const line = document.createElement("div");
        line.className = "replay-line replay-action" + (ev.allIn ? " replay-allin" : "");
        if (ev.player === "Hero") line.classList.add("replay-hero");
        // Switched from textContent to innerHTML so the all-in star icon
        // renders. `txt` contains user-derived player names so it MUST be
        // escaped; STAR_SVG is trusted markup.
        line.innerHTML = escapeHtml(txt) + (ev.allIn ? `  ${STAR_SVG} ALL-IN` : "");
        container.appendChild(line);
        break;
      }
      case "uncalled":
        appendLine(container, [`Uncalled bet (${fmtMoney(ev.amount)}) returned to ${ev.player}`]);
        break;
      case "shows":
        appendLine(container, [`${ev.player} shows `, fmtCards(ev.cards)]);
        break;
      case "mucks":
        appendLine(container, [`${ev.player} mucks`]);
        break;
      case "collect":
        appendLine(container, [`${ev.player} collected ${fmtMoney(ev.amount)} from ${ev.pot} pot`]);
        break;
      case "cash-drop":
        appendLine(container, [`Cash Drop: +${fmtMoney(ev.amount)} into pot`]);
        break;
    }
  }

  // Summary
  appendSection(container, "Summary");
  appendLine(container, [`Total pot: ${fmtMoney(summary.totalPot)} · Rake: ${fmtMoney(summary.rake)}` + (summary.jackpot ? ` · Jackpot: ${fmtMoney(summary.jackpot)}` : "") + (summary.cashDrop ? ` · Cash Drop: ${fmtMoney(summary.cashDrop)}` : "")]);
}

function ensureModal() {
  let modal = document.getElementById(MODAL_ID);
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = MODAL_ID;
  modal.className = "replay-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="replay-modal-backdrop"></div>
    <div class="replay-modal-panel" role="dialog" aria-modal="true">
      <div class="replay-modal-header">
        <h3 class="replay-modal-title">Hand Replay</h3>
        <button type="button" class="replay-modal-close" aria-label="Close"><svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>
      </div>
      <div class="replay-modal-body"></div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector(".replay-modal-backdrop").addEventListener("click", closeModal);
  modal.querySelector(".replay-modal-close").addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });
  return modal;
}

export function showReplay(handText, { title } = {}) {
  const modal = ensureModal();
  const extracted = extractActions(handText);
  const body = modal.querySelector(".replay-modal-body");
  body.replaceChildren();
  renderEvents(body, extracted);
  modal.querySelector(".replay-modal-title").textContent = title || `Hand Replay — #${extracted.meta.handId || ""}`;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

export function closeModal() {
  const modal = document.getElementById(MODAL_ID);
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = "";
}
