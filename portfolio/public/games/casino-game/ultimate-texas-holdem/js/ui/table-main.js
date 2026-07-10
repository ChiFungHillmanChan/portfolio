// table-main.js — the Ultimate Texas Hold'em live table.
//
// One onSnapshot on the public table doc + one on my private hole-card doc
// drive a single render() pass. All money decisions happen server-side; this
// file only draws state and POSTs intents (/uth/*).

import { auth, googleProvider } from "../../../js/auth/firebase-init.js";
import {
  onAuthStateChanged,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { uthCall } from "../net/uth-api.js";
import { watchTable } from "../state/table-store.js";
import { cardLabel, cardSuit, evaluate5, evaluate7 } from "../core/engine.js";

const CHIPS = [25, 100, 500, 1000];
const BET_KEYS = [
  { key: "ante", label: "ANTE", required: true },
  { key: "trips", label: "TRIPS" },
  { key: "holeCard", label: "HOLE CARD" },
  { key: "badBeat", label: "BAD BEAT" },
];
const PHASE_MS = { betting: 30000, preflop: 30000, flop: 30000, river: 30000, showdown: 10000 };

const code = (new URLSearchParams(location.search).get("code") || "")
  .toUpperCase()
  .replace(/^UTH-/, "");

const $ = (id) => document.getElementById(id);
const el = {
  leaveBtn: $("leaveBtn"),
  roomCode: $("roomCode"),
  roundLabel: $("roundLabel"),
  dealerCards: $("dealerCards"),
  dealerStatus: $("dealerStatus"),
  communityCards: $("communityCards"),
  seatsArc: $("seatsArc"),
  dock: $("dock"),
  dockContent: $("dockContent"),
  timerFill: $("timerFill"),
  toast: $("toast"),
  overlay: $("overlay"),
  overlayCard: $("overlayCard"),
};

let myUid = null;
let table = null;
let myCards = null; // {holeCards, roundNo}
let unsub = null;
let selChip = 100;
let pendingBets = { ante: 0, trips: 0, holeCard: 0, badBeat: 0 };
let sendingReady = false;
let lastTickAt = 0;
let toastTimer = null;

// ── Small helpers ────────────────────────────────────────────────────────────

const fmt = (n) => n.toLocaleString("en-US");
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

function cardHtml(c, { back = false, slot = false } = {}) {
  if (slot) return `<div class="uth-card uth-card-slot"></div>`;
  if (back) return `<div class="uth-card uth-card-back"></div>`;
  const red = cardSuit(c) === 1 || cardSuit(c) === 2;
  return `<div class="uth-card${red ? " red" : ""}">${cardLabel(c)}</div>`;
}

function showToast(msg) {
  el.toast.textContent = msg;
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.toast.hidden = true), 3200);
}

function showOverlay(html) {
  el.overlayCard.innerHTML = html;
  el.overlay.hidden = false;
}

function hideOverlay() {
  el.overlay.hidden = true;
}

const ERROR_COPY = {
  "no-table": "This table no longer exists.",
  "table-full": "This table is full.",
  "insufficient-stack": "Not enough chips for that.",
  "bad-bet": "Invalid bet — ante 25 to 1,000, side bets up to your ante, in chips of 25.",
  "bad-move": "That move isn't available right now.",
  "cannot-rebuy": "Rebuy is only available when you're broke, between hands.",
};
const errMsg = (err) => ERROR_COPY[err.code] || `Error: ${err.code || err.message}`;

// Best-hand hint for 5/6/7 known cards.
function handName(cards) {
  if (cards.length < 5) return null;
  if (cards.length === 5) {
    const CAT_NAMES = ["High Card", "Pair", "Two Pair", "Three of a Kind", "Straight", "Flush", "Full House", "Four of a Kind", "Straight Flush", "Royal Flush"];
    return CAT_NAMES[evaluate5(cards).cat];
  }
  if (cards.length === 6) {
    let best = null;
    for (let i = 0; i < 6; i++) {
      const five = cards.filter((_, k) => k !== i);
      const e = evaluate5(five);
      if (!best || e.value > best.value) best = e;
    }
    const CAT_NAMES = ["High Card", "Pair", "Two Pair", "Three of a Kind", "Straight", "Flush", "Full House", "Four of a Kind", "Straight Flush", "Royal Flush"];
    return CAT_NAMES[best.cat];
  }
  return evaluate7(cards.slice(0, 7)).name;
}

const mySeat = () => table?.seats.find((s) => s.uid === myUid) || null;
const myHole = () =>
  myCards && myCards.roundNo === table?.roundNo && mySeat()?.inHand ? myCards.holeCards : null;

// ── Boot ─────────────────────────────────────────────────────────────────────

if (!code) location.replace("index.html");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    showOverlay(`
      <h2>Sign in to join the table</h2>
      <p class="uth-muted">Room ${esc(code)}</p>
      <button class="uth-btn uth-btn-primary" data-action="sign-in">Sign in with Google</button>
    `);
    return;
  }
  if (!myUid) {
    myUid = user.uid;
    start();
  }
});

async function start() {
  showOverlay(`<h2>Joining table ${esc(code)}…</h2>`);
  try {
    await uthCall("join-table", { code });
  } catch (err) {
    if (err.code !== "already-seated") {
      showOverlay(`
        <h2>Couldn't join</h2>
        <p class="uth-muted">${esc(errMsg(err))}</p>
        <a class="uth-btn uth-btn-primary" href="index.html">Back to lobby</a>
      `);
      return;
    }
  }
  hideOverlay();
  unsub = watchTable(code, myUid, {
    onTable: (t) => {
      table = t;
      render();
    },
    onMyCards: (d) => {
      myCards = d;
      render();
    },
    onError: (err) => {
      if (err.code === "no-table" || err.code === "permission-denied") {
        unsub?.();
        showOverlay(`
          <h2>Table closed</h2>
          <p class="uth-muted">The table was closed or you left your seat.</p>
          <a class="uth-btn uth-btn-primary" href="index.html">Back to lobby</a>
        `);
      }
    },
  });
  setInterval(tickLoop, 500);
}

// ── Tick / timer loop ────────────────────────────────────────────────────────

function tickLoop() {
  if (!table) return;
  const deadline = table.actionDeadline;
  if (!deadline) {
    el.timerFill.style.width = "0%";
    return;
  }
  const total = PHASE_MS[table.phase] || 30000;
  const left = Math.max(0, deadline - Date.now());
  el.timerFill.style.width = `${Math.min(100, (left / total) * 100)}%`;
  el.timerFill.classList.toggle("urgent", left < 8000 && table.phase !== "showdown");

  // any client may drive expired deadlines; server re-validates the clock
  if (left === 0 && Date.now() - lastTickAt > 2000) {
    lastTickAt = Date.now();
    uthCall("tick", { code }).catch(() => {});
  }
}

// ── Render ───────────────────────────────────────────────────────────────────

function render() {
  if (!table) return;
  const seat = mySeat();
  const phase = table.phase;

  el.roomCode.textContent = `UTH-${table.code}`;
  el.roundLabel.textContent = `Round ${table.roundNo} · ${table.seats.length}/6 seats`;

  renderDealer(phase);
  renderCommunity();
  renderSeats(seat, phase);
  renderDock(seat, phase);
}

function renderDealer(phase) {
  const d = table.dealer;
  if (d.holeCards) {
    el.dealerCards.innerHTML = d.holeCards.map((c) => cardHtml(c)).join("");
    el.dealerStatus.innerHTML = d.qualifies
      ? `<span class="uth-dealer-hand">${esc(d.name)}</span>`
      : `<span class="uth-dealer-hand">${esc(d.name)}</span><span class="uth-noqualify">Dealer does not qualify — Antes push</span>`;
  } else if (phase === "betting") {
    el.dealerCards.innerHTML = cardHtml(0, { slot: true }) + cardHtml(0, { slot: true });
    el.dealerStatus.textContent = "";
  } else {
    el.dealerCards.innerHTML = cardHtml(0, { back: true }) + cardHtml(0, { back: true });
    el.dealerStatus.textContent = "";
  }
}

function renderCommunity() {
  const cc = table.community || [];
  let html = cc.map((c) => cardHtml(c)).join("");
  for (let i = cc.length; i < 5; i++) html += cardHtml(0, { slot: true });
  el.communityCards.innerHTML = html;
}

function renderSeats(seat, phase) {
  // my seat pinned to position 0 (bottom centre), others follow clockwise
  const seats = [...table.seats].sort((a, b) => a.seatIndex - b.seatIndex);
  const myIdx = seat ? seats.findIndex((s) => s.uid === myUid) : 0;
  const ordered = seats.map((_, i) => seats[(myIdx + i) % seats.length]);

  el.seatsArc.innerHTML = ordered
    .map((s, pos) => {
      const isMe = s.uid === myUid;
      const badges = [];
      if (s.sittingOut) badges.push(`<span class="uth-badge">SITTING OUT</span>`);
      else if (phase === "betting" && s.ready) badges.push(`<span class="uth-badge ok">READY</span>`);
      else if (s.inHand && s.folded) badges.push(`<span class="uth-badge bad">FOLDED</span>`);
      else if (s.inHand && s.playBet > 0) badges.push(`<span class="uth-badge gold">BET ${fmt(s.playBet)}</span>`);
      else if (["preflop", "flop", "river"].includes(phase) && s.inHand && s.acted)
        badges.push(`<span class="uth-badge ok">✓</span>`);

      let cardsHtml = "";
      let resultHtml = "";
      if (phase === "showdown" && s.inHand && s.result) {
        if (s.holeCards) cardsHtml = `<div class="uth-seat-cards">${s.holeCards.map((c) => cardHtml(c)).join("")}</div>`;
        const net = s.result.net;
        resultHtml = `<div class="uth-seat-result ${net >= 0 ? "pos" : "neg"}">${net >= 0 ? "+" : "−"}${fmt(Math.abs(net))}${s.result.hand ? ` · ${esc(s.result.hand)}` : ""}</div>`;
      } else if (s.inHand && !s.folded && phase !== "betting" && !isMe) {
        cardsHtml = `<div class="uth-seat-cards">${cardHtml(0, { back: true })}${cardHtml(0, { back: true })}</div>`;
      }

      const anteTotal = s.bets.ante + s.bets.blind + s.bets.trips + s.bets.holeCard + s.bets.badBeat;
      const betLine =
        s.inHand || (phase === "betting" && s.ready)
          ? `<div class="uth-seat-bets">staked ${fmt(anteTotal + (s.playBet || 0))}</div>`
          : "";

      return `
        <div class="uth-seat uth-seat-pos-${pos}${isMe ? " me" : ""}">
          <div class="uth-seat-name">${esc(isMe ? "You" : s.name)}</div>
          <div class="uth-seat-stack">${fmt(s.stack)}</div>
          ${betLine}
          ${cardsHtml}
          ${resultHtml}
          <div class="uth-seat-badges">${badges.join("")}</div>
        </div>`;
    })
    .join("");
}

function renderDock(seat, phase) {
  if (!seat) {
    el.dockContent.innerHTML = `<p class="uth-muted">Connecting…</p>`;
    return;
  }

  if (phase === "betting") {
    renderBettingDock(seat);
    return;
  }

  if (phase === "showdown") {
    renderShowdownDock(seat);
    return;
  }

  // decision streets
  const hole = myHole();
  const holeHtml = hole
    ? `<div class="uth-my-cards">${hole.map((c) => cardHtml(c)).join("")}</div>`
    : "";
  const hint = hole && table.community.length
    ? `<div class="uth-hint">You have: <strong>${esc(handName([...hole, ...table.community]) || "")}</strong></div>`
    : hole
      ? `<div class="uth-hint">Your hole cards</div>`
      : "";

  if (!seat.inHand) {
    el.dockContent.innerHTML = `<p class="uth-muted">Hand in progress — you'll join the next round.</p>`;
    return;
  }
  if (seat.folded) {
    el.dockContent.innerHTML = `${holeHtml}<p class="uth-muted">Folded — waiting for showdown.</p>`;
    return;
  }

  const pending = !seat.acted && (phase === "preflop" || seat.playBet === 0);
  let buttons = "";
  if (pending) {
    if (phase === "preflop") {
      buttons = `
        <button class="uth-btn uth-btn-act" data-action="act" data-move="check">CHECK</button>
        <button class="uth-btn uth-btn-raise" data-action="act" data-move="3x">BET 3x</button>
        <button class="uth-btn uth-btn-raise" data-action="act" data-move="4x">BET 4x</button>`;
    } else if (phase === "flop") {
      buttons = `
        <button class="uth-btn uth-btn-act" data-action="act" data-move="check">CHECK</button>
        <button class="uth-btn uth-btn-raise" data-action="act" data-move="2x">BET 2x</button>`;
    } else {
      buttons = `
        <button class="uth-btn uth-btn-fold" data-action="act" data-move="fold">FOLD</button>
        <button class="uth-btn uth-btn-raise" data-action="act" data-move="1x">BET 1x</button>`;
    }
    el.dockContent.innerHTML = `${holeHtml}${hint}<div class="uth-actions">${buttons}</div>`;
  } else {
    const status = seat.playBet > 0 ? `Play bet ${fmt(seat.playBet)} placed.` : "Checked.";
    el.dockContent.innerHTML = `${holeHtml}${hint}<p class="uth-muted">${status} Waiting for other players…</p>`;
  }
}

function renderBettingDock(seat) {
  const broke = seat.stack < table.minAnte * 2;

  if (seat.sittingOut) {
    el.dockContent.innerHTML = `
      <p class="uth-muted">You're sitting out.</p>
      <div class="uth-actions">
        ${broke
          ? `<button class="uth-btn uth-btn-primary" data-action="rebuy">REBUY ${fmt(table.buyIn)}</button>`
          : `<button class="uth-btn uth-btn-primary" data-action="sit-in">SIT IN</button>`}
      </div>`;
    return;
  }

  if (seat.ready) {
    el.dockContent.innerHTML = `<p class="uth-muted">Bets locked — waiting for the other players to ready up…</p>`;
    return;
  }

  const circles = BET_KEYS.map(({ key, label, required }) => {
    const amount = pendingBets[key];
    return `
      <button class="uth-bet-circle${amount ? " has-bet" : ""}${required ? " required" : ""}"
              data-action="add-bet" data-bet="${key}" title="Tap to add ${fmt(selChip)}">
        <span class="uth-bet-label">${label}</span>
        <span class="uth-bet-amount">${amount ? fmt(amount) : "—"}</span>
      </button>`;
  }).join("");

  const chips = CHIPS.map(
    (v) => `
      <button class="uth-chip uth-chip-${v}${selChip === v ? " selected" : ""}"
              data-action="chip" data-chip="${v}">${v >= 1000 ? "1K" : v}</button>`
  ).join("");

  const total = pendingBets.ante * 2 + pendingBets.trips + pendingBets.holeCard + pendingBets.badBeat;

  el.dockContent.innerHTML = `
    <div class="uth-bet-circles">${circles}</div>
    <div class="uth-bet-note uth-muted">Blind matches your Ante automatically${total ? ` · total stake ${fmt(total)}` : ""}</div>
    <div class="uth-chip-rack">${chips}</div>
    <div class="uth-actions">
      <button class="uth-btn uth-btn-ghost" data-action="clear-bets">CLEAR</button>
      <button class="uth-btn uth-btn-primary" data-action="ready" ${pendingBets.ante >= table.minAnte ? "" : "disabled"}>READY</button>
      <button class="uth-btn uth-btn-ghost" data-action="sit-out">SIT OUT</button>
    </div>`;
}

function renderShowdownDock(seat) {
  if (!seat.inHand || !seat.result) {
    el.dockContent.innerHTML = `<p class="uth-muted">Next round starting soon…</p>`;
    return;
  }
  const r = seat.result;
  const rows = [
    ["Ante", r.ante],
    ["Blind", r.blind],
    ["Play", r.play],
    ["Trips", r.trips],
    ["Hole Card", r.holeCard],
    ["Bad Beat", r.badBeat],
  ]
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `<span class="uth-payline ${v > 0 ? "pos" : "neg"}">${k} ${v > 0 ? "+" : "−"}${fmt(Math.abs(v))}</span>`)
    .join("");

  el.dockContent.innerHTML = `
    <div class="uth-result-banner ${r.net >= 0 ? "pos" : "neg"}">
      ${r.net > 0 ? "YOU WIN" : r.net === 0 ? "PUSH" : "YOU LOSE"}
      <strong>${r.net >= 0 ? "+" : "−"}${fmt(Math.abs(r.net))}</strong>
    </div>
    <div class="uth-paylines">${rows || `<span class="uth-payline">All bets pushed</span>`}</div>
    <p class="uth-muted">Next round starting soon…</p>`;
}

// ── Actions (event delegation) ───────────────────────────────────────────────

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn || btn.disabled) return;
  const action = btn.dataset.action;
  const seat = mySeat();

  try {
    switch (action) {
      case "sign-in":
        await signInWithPopup(auth, googleProvider).catch((err) => {
          if (err.code !== "auth/popup-closed-by-user") showToast(errMsg(err));
        });
        break;
      case "chip":
        selChip = Number(btn.dataset.chip);
        render();
        break;
      case "add-bet": {
        if (!seat) break;
        const key = btn.dataset.bet;
        const next = { ...pendingBets, [key]: pendingBets[key] + selChip };
        if (key !== "ante" && next[key] > next.ante) {
          showToast("Side bets can't exceed your Ante.");
          break;
        }
        if (next.ante > table.maxAnte) {
          showToast(`Max ante is ${fmt(table.maxAnte)}.`);
          break;
        }
        const total = next.ante * 2 + next.trips + next.holeCard + next.badBeat;
        if (total > seat.stack) {
          showToast("Not enough chips (Blind matches your Ante).");
          break;
        }
        pendingBets = next;
        render();
        break;
      }
      case "clear-bets":
        pendingBets = { ante: 0, trips: 0, holeCard: 0, badBeat: 0 };
        render();
        break;
      case "ready":
        if (sendingReady) break;
        sendingReady = true;
        try {
          await uthCall("place-bets", { code, ...pendingBets });
          pendingBets = { ante: 0, trips: 0, holeCard: 0, badBeat: 0 };
        } finally {
          sendingReady = false;
        }
        break;
      case "act":
        await uthCall("play-action", { code, move: btn.dataset.move });
        break;
      case "sit-out":
        await uthCall("sit-out", { code, sittingOut: true });
        break;
      case "sit-in":
        await uthCall("sit-out", { code, sittingOut: false });
        break;
      case "rebuy":
        await uthCall("rebuy", { code });
        break;
    }
  } catch (err) {
    showToast(errMsg(err));
  }
});

el.leaveBtn.addEventListener("click", async () => {
  el.leaveBtn.disabled = true;
  unsub?.();
  try {
    await uthCall("leave-table", { code });
  } catch { /* leaving a dead table is fine */ }
  location.href = "index.html";
});

el.roomCode.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(table?.code || code);
    showToast("Room code copied — send it to a friend!");
  } catch {
    showToast(`Room code: ${table?.code || code}`);
  }
});
