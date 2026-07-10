// table-main.js — the Ultimate Texas Hold'em live table(s).
//
// Supports up to MAX_TABLES concurrent tables (multi-tabling): each open
// table keeps its own Firestore subscriptions; a tab strip switches which
// one is rendered. Badges light up when a table needs your action.
//
// One onSnapshot on each table doc + one on your private hole-card doc drive
// a single render() pass for the active table. All money decisions happen
// server-side; this file only draws state and POSTs intents (/uth/*).

import { auth, googleProvider } from "../../../js/auth/firebase-init.js";
import {
  onAuthStateChanged,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { uthCall } from "../net/uth-api.js";
import { watchTable } from "../state/table-store.js";
import { cardLabel, cardSuit, evaluate5, evaluate7 } from "../core/engine.js";

const CHIPS = [25, 100, 500, 1000];
const SIDE_BETS = [
  { key: "trips", label: "TRIPS" },
  { key: "holeCard", label: "HOLE CARD" },
  { key: "badBeat", label: "BAD BEAT" },
];
const PHASE_MS = { betting: 30000, preflop: 30000, flop: 30000, river: 30000, showdown: 10000 };
const MAX_TABLES = 4;
const LS_OPEN_TABLES = "uthOpenTables";

const urlParams = new URLSearchParams(location.search);
const urlCode = (urlParams.get("code") || "").toUpperCase().replace(/^UTH-/, "");
const inviteMode = urlParams.get("invite") === "1";

const $ = (id) => document.getElementById(id);
const el = {
  leaveBtn: $("leaveBtn"),
  roomCode: $("roomCode"),
  roundLabel: $("roundLabel"),
  tabsBar: $("tabsBar"),
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
let activeCode = null;
let selChip = 100;
let sendingReady = false;
let coreJustChanged = false; // pulse ante+blind together on change
let toastTimer = null;

// code → { table, myCards, lastTickAt, pending: {ante,trips,holeCard,badBeat} }
const tables = new Map();
// code → unsubscribe()
const unsubs = new Map();

// ── Small helpers ────────────────────────────────────────────────────────────

const fmt = (n) => n.toLocaleString("en-US");
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const zeroBets = () => ({ ante: 0, trips: 0, holeCard: 0, badBeat: 0 });

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
  "no-table": "Table not found.",
  "table-full": "That table is full.",
  "insufficient-stack": "Not enough chips for that.",
  "bad-bet": "Invalid bet — ante 25 to 1,000, side bets up to your ante, in chips of 25.",
  "bad-move": "That move isn't available right now.",
  "bad-code": "Room codes are 4 letters/numbers, e.g. 8K3F.",
  "cannot-rebuy": "Rebuy is only available when you're broke, between hands.",
  "not-solo": "The next hand starts when the shared timer ends.",
};
const errMsg = (err) => ERROR_COPY[err.code] || `Error: ${err.code || err.message}`;

const CAT_NAMES = ["High Card", "Pair", "Two Pair", "Three of a Kind", "Straight", "Flush", "Full House", "Four of a Kind", "Straight Flush", "Royal Flush"];

// Best-hand hint for 5/6/7 known cards.
function handName(cards) {
  if (cards.length < 5) return null;
  if (cards.length === 5) return CAT_NAMES[evaluate5(cards).cat];
  if (cards.length === 6) {
    let best = null;
    for (let i = 0; i < 6; i++) {
      const e = evaluate5(cards.filter((_, k) => k !== i));
      if (!best || e.value > best.value) best = e;
    }
    return CAT_NAMES[best.cat];
  }
  return evaluate7(cards.slice(0, 7)).name;
}

const activeInfo = () => tables.get(activeCode) || null;
const seatOf = (info) => info?.table?.seats.find((s) => s.uid === myUid) || null;
function myHole(info) {
  const seat = seatOf(info);
  return info?.myCards && info.myCards.roundNo === info.table?.roundNo && seat?.inHand
    ? info.myCards.holeCards
    : null;
}

// Is a decision/bet owed by me at this table right now?
function needsMyAction(info) {
  const t = info?.table;
  const seat = seatOf(info);
  if (!t || !seat || seat.sittingOut) return false;
  if (t.phase === "betting") return !seat.ready;
  if (["preflop", "flop", "river"].includes(t.phase)) {
    return seat.inHand && !seat.folded && !seat.acted && (t.phase === "preflop" || seat.playBet === 0);
  }
  return false;
}

// ── Boot ─────────────────────────────────────────────────────────────────────

if (!urlCode) location.replace("index.html");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    showOverlay(`
      <h2>Sign in to join the table</h2>
      <p class="uth-muted">Room ${esc(urlCode)}</p>
      <button class="uth-btn uth-btn-primary" data-action="sign-in">Sign in with Google</button>
    `);
    return;
  }
  if (!myUid) {
    myUid = user.uid;
    boot();
  }
});

async function boot() {
  showOverlay(`<h2>Joining table ${esc(urlCode)}…</h2>`);
  const ok = await openTable(urlCode, { fatalOnError: true });
  if (!ok) return;
  hideOverlay();
  if (inviteMode) {
    showToast(`Share code UTH-${urlCode} — friends join with it!`);
    el.roomCode.classList.add("pulse-invite");
  }
  // restore other tables from a previous session (already-seated is fine)
  let stored = [];
  try { stored = JSON.parse(localStorage.getItem(LS_OPEN_TABLES) || "[]"); } catch {}
  for (const code of stored) {
    if (code !== urlCode && tables.size < MAX_TABLES) await openTable(code, { silent: true });
  }
  setActive(urlCode);
  setInterval(tickLoop, 500);
}

// ── Multi-table management ───────────────────────────────────────────────────

async function openTable(code, { fatalOnError = false, silent = false } = {}) {
  if (tables.has(code)) {
    setActive(code);
    return true;
  }
  if (tables.size >= MAX_TABLES) {
    showToast(`You can play up to ${MAX_TABLES} tables at once.`);
    return false;
  }
  try {
    await uthCall("join-table", { code });
  } catch (err) {
    if (err.code !== "already-seated") {
      if (fatalOnError) {
        showOverlay(`
          <h2>Couldn't join</h2>
          <p class="uth-muted">${esc(errMsg(err))}</p>
          <a class="uth-btn uth-btn-primary" href="index.html">Back to lobby</a>
        `);
      } else if (!silent) {
        showToast(errMsg(err));
      }
      return false;
    }
  }
  tables.set(code, { table: null, myCards: null, lastTickAt: 0, pending: zeroBets() });
  unsubs.set(code, watchTable(code, myUid, {
    onTable: (t) => {
      const info = tables.get(code);
      if (!info) return;
      info.table = t;
      if (code === activeCode) render();
      renderTabs();
    },
    onMyCards: (d) => {
      const info = tables.get(code);
      if (!info) return;
      info.myCards = d;
      if (code === activeCode) render();
    },
    onError: (err) => {
      if (err.code === "no-table" || err.code === "permission-denied") {
        closeTable(code, { leave: false });
        showToast(`Table UTH-${code} was closed.`);
      }
    },
  }));
  persistOpenTables();
  renderTabs();
  return true;
}

function closeTable(code, { leave = true } = {}) {
  unsubs.get(code)?.();
  unsubs.delete(code);
  tables.delete(code);
  persistOpenTables();
  if (leave) uthCall("leave-table", { code }).catch(() => {});
  if (activeCode === code) {
    const next = tables.keys().next();
    if (next.done) {
      location.href = "index.html";
      return;
    }
    setActive(next.value);
  }
  renderTabs();
}

function setActive(code) {
  activeCode = code;
  render();
  renderTabs();
}

function persistOpenTables() {
  try { localStorage.setItem(LS_OPEN_TABLES, JSON.stringify([...tables.keys()])); } catch {}
}

function renderTabs() {
  const now = Date.now();
  let html = "";
  for (const [code, info] of tables) {
    const attention = needsMyAction(info);
    const urgent = attention && info.table?.actionDeadline && now > info.table.actionDeadline - 8000;
    html += `
      <button class="uth-tab${code === activeCode ? " active" : ""}${attention ? " attention" : ""}${urgent ? " urgent" : ""}"
              data-action="tab" data-code="${code}">
        <span class="uth-tab-dot"></span>${code}
      </button>`;
  }
  if (tables.size < MAX_TABLES) {
    html += `<button class="uth-tab uth-tab-add" data-action="tab-add" title="Open another table">+</button>`;
  }
  el.tabsBar.innerHTML = html;
  const anyAttention = [...tables.values()].some((i) => needsMyAction(i) && i.table?.code !== activeCode);
  document.title = `${anyAttention ? "● " : ""}Ultimate Texas Hold'em — Table`;
}

// ── Tick / timer loop ────────────────────────────────────────────────────────

function tickLoop() {
  const now = Date.now();
  for (const [code, info] of tables) {
    const deadline = info.table?.actionDeadline;
    if (deadline && now > deadline + 600 && now - info.lastTickAt > 2000) {
      info.lastTickAt = now;
      uthCall("tick", { code }).catch(() => {});
    }
  }
  const info = activeInfo();
  const deadline = info?.table?.actionDeadline;
  if (!deadline) {
    el.timerFill.style.width = "0%";
  } else {
    const total = PHASE_MS[info.table.phase] || 30000;
    const left = Math.max(0, deadline - now);
    el.timerFill.style.width = `${Math.min(100, (left / total) * 100)}%`;
    el.timerFill.classList.toggle("urgent", left < 8000 && info.table.phase !== "showdown");
  }
  renderTabs();
}

// ── Render ───────────────────────────────────────────────────────────────────

function render() {
  const info = activeInfo();
  if (!info?.table) {
    el.dockContent.innerHTML = `<p class="uth-muted">Connecting…</p>`;
    return;
  }
  const table = info.table;
  const seat = seatOf(info);

  el.roomCode.textContent = `UTH-${table.code}`;
  el.roundLabel.textContent = `Round ${table.roundNo} · ${table.seats.length}/6 seats`;

  renderDealer(table);
  renderCommunity(table);
  renderSeats(table, table.phase);
  renderDock(info, seat, table.phase);
}

function renderDealer(table) {
  const d = table.dealer;
  if (d.holeCards) {
    el.dealerCards.innerHTML = d.holeCards.map((c) => cardHtml(c)).join("");
    el.dealerStatus.innerHTML = d.qualifies
      ? `<span class="uth-dealer-hand">${esc(d.name)}</span>`
      : `<span class="uth-dealer-hand">${esc(d.name)}</span><span class="uth-noqualify">Dealer does not qualify — Antes push</span>`;
  } else if (table.phase === "betting") {
    el.dealerCards.innerHTML = cardHtml(0, { slot: true }) + cardHtml(0, { slot: true });
    el.dealerStatus.textContent = "";
  } else {
    el.dealerCards.innerHTML = cardHtml(0, { back: true }) + cardHtml(0, { back: true });
    el.dealerStatus.textContent = "";
  }
}

function renderCommunity(table) {
  const cc = table.community || [];
  let html = cc.map((c) => cardHtml(c)).join("");
  for (let i = cc.length; i < 5; i++) html += cardHtml(0, { slot: true });
  el.communityCards.innerHTML = html;
}

function renderSeats(table, phase) {
  const seats = [...table.seats].sort((a, b) => a.seatIndex - b.seatIndex);
  const myIdx = Math.max(0, seats.findIndex((s) => s.uid === myUid));
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

      const staked = s.bets.ante + s.bets.blind + s.bets.trips + s.bets.holeCard + s.bets.badBeat + (s.playBet || 0);
      const betLine =
        s.inHand || (phase === "betting" && s.ready)
          ? `<div class="uth-seat-bets">staked ${fmt(staked)}</div>`
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

// ── Dock (bet board + contextual controls) ──────────────────────────────────

function renderDock(info, seat, phase) {
  if (!seat) {
    el.dockContent.innerHTML = `<p class="uth-muted">Connecting…</p>`;
    return;
  }

  // sitting out (only meaningful surface during betting)
  if (seat.sittingOut && phase === "betting") {
    const broke = seat.stack < info.table.minAnte * 2;
    el.dockContent.innerHTML = `
      <p class="uth-muted">You're sitting out.</p>
      <div class="uth-actions">
        ${broke
          ? `<button class="uth-btn uth-btn-primary" data-action="rebuy">REBUY ${fmt(info.table.buyIn)}</button>`
          : `<button class="uth-btn uth-btn-primary" data-action="sit-in">SIT IN</button>`}
      </div>`;
    return;
  }

  // joined mid-hand: spectate until the next betting round
  if (!seat.inHand && phase !== "betting") {
    el.dockContent.innerHTML = `<p class="uth-muted">Hand in progress — you'll join the next round.</p>`;
    return;
  }

  const parts = [];

  // my cards + hint on decision streets and showdown
  const hole = myHole(info);
  if (hole && phase !== "betting") {
    parts.push(`<div class="uth-my-cards">${hole.map((c) => cardHtml(c)).join("")}</div>`);
    if (info.table.community.length && !seat.folded) {
      parts.push(`<div class="uth-hint">You have: <strong>${esc(handName([...hole, ...info.table.community]) || "")}</strong></div>`);
    }
  }

  if (phase === "showdown" && seat.result) {
    const r = seat.result;
    parts.push(`
      <div class="uth-result-banner ${r.net >= 0 ? "pos" : "neg"}">
        ${r.net > 0 ? "YOU WIN" : r.net === 0 ? "PUSH" : "YOU LOSE"}
        <strong>${r.net >= 0 ? "+" : "−"}${fmt(Math.abs(r.net))}</strong>
      </div>`);
  }

  parts.push(renderBoard(info, seat, phase));

  if (phase === "betting") {
    if (seat.ready) {
      parts.push(`<p class="uth-muted">Bets locked — waiting for the other players…</p>`);
    } else {
      const chips = CHIPS.map(
        (v) => `
          <button class="uth-chip uth-chip-${v}${selChip === v ? " selected" : ""}"
                  data-action="chip" data-chip="${v}">${v >= 1000 ? "1K" : v}</button>`
      ).join("");
      parts.push(`<div class="uth-chip-rack">${chips}</div>`);
      parts.push(`<div class="uth-bet-note uth-muted">Click a spot to add the selected chip · hold or right-click to remove</div>`);
      const p = info.pending;
      parts.push(`
        <div class="uth-actions">
          <button class="uth-btn uth-btn-ghost" data-action="clear-bets">CLEAR</button>
          <button class="uth-btn uth-btn-primary" data-action="ready" ${p.ante >= info.table.minAnte ? "" : "disabled"}>READY${p.ante ? ` · ${fmt(p.ante * 2 + p.trips + p.holeCard + p.badBeat)}` : ""}</button>
          <button class="uth-btn uth-btn-ghost" data-action="sit-out">SIT OUT</button>
        </div>`);
    }
  } else if (["preflop", "flop", "river"].includes(phase)) {
    if (seat.folded) {
      parts.push(`<p class="uth-muted">Folded — waiting for showdown.</p>`);
    } else if (!needsMyAction(info)) {
      parts.push(`<p class="uth-muted">${seat.playBet > 0 ? `Play bet ${fmt(seat.playBet)} placed.` : "Checked."} Waiting for other players…</p>`);
    }
  } else if (phase === "showdown") {
    const soloActive = info.table.seats.filter((s) => !s.sittingOut).length === 1;
    parts.push(
      soloActive
        ? `<div class="uth-actions"><button class="uth-btn uth-btn-primary" data-action="next-round">NEXT HAND →</button></div>`
        : `<p class="uth-muted">Next round starting soon…</p>`
    );
  }

  el.dockContent.innerHTML = parts.join("");
  if (coreJustChanged) coreJustChanged = false;
}

// The casino-style bet board, persistent across phases:
//   row 1 — side bets:      TRIPS · HOLE CARD · BAD BEAT
//   row 2 — core (equal):   ANTE = BLIND
//   row 3 — play spot:      CHECK / 3x·4x buttons, or the placed Play bet
function renderBoard(info, seat, phase) {
  const editing = phase === "betting" && !seat.ready && !seat.sittingOut;
  const src = editing ? info.pending : seat.bets;
  const results = phase === "showdown" && seat.inHand ? seat.result : null;

  const circle = (key, label, amount, { core = false, sub = "" } = {}) => {
    let cls = "uth-bet-circle";
    if (core) cls += " core required";
    if (amount) cls += " has-bet";
    if (editing) cls += " editable";
    else cls += " locked";
    if (core && coreJustChanged) cls += " just-changed";
    let resultHtml = "";
    if (results) {
      const delta = results[key === "blind" ? "blind" : key];
      const cat = delta > 0 ? "pos" : delta < 0 ? "neg" : amount ? "push" : "";
      if (cat) cls += ` res-${cat}`;
      if (amount || delta !== 0) {
        resultHtml = `<span class="uth-bet-delta ${cat}">${delta > 0 ? "+" + fmt(delta) : delta < 0 ? "−" + fmt(-delta) : "PUSH"}</span>`;
      }
    }
    const action = editing ? `data-action="add-bet" data-bet="${key}"` : "";
    return `
      <button class="${cls}" ${action} ${editing ? "" : "tabindex=\"-1\""}>
        <span class="uth-bet-label">${label}</span>
        <span class="uth-bet-amount">${amount ? fmt(amount) : "—"}</span>
        ${sub ? `<span class="uth-bet-sub">${sub}</span>` : ""}
        ${resultHtml}
      </button>`;
  };

  const sides = SIDE_BETS.map(({ key, label }) => circle(key, label, src[key])).join("");
  const core = `
    ${circle("ante", "ANTE", src.ante, { core: true })}
    <span class="uth-bet-link" title="Ante and Blind are always equal">=</span>
    ${circle("blind", "BLIND", src.ante, { core: true, sub: "= ANTE" })}`;

  // Play row: action buttons while it's my turn, else the play spot itself
  let playRow;
  const pendingMe = needsMyAction(info) && phase !== "betting";
  if (pendingMe) {
    let buttons = "";
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
    playRow = `<div class="uth-actions uth-play-actions">${buttons}</div>`;
  } else {
    const stageBadge = seat.playStage ? `<span class="uth-bet-sub">${{ preflop: "4x·3x", flop: "2x", river: "1x" }[seat.playStage] || ""}</span>` : "";
    let cls = "uth-bet-circle uth-play-spot locked";
    let resultHtml = "";
    if (seat.playBet) cls += " has-bet";
    if (results) {
      const delta = results.play;
      const cat = delta > 0 ? "pos" : delta < 0 ? "neg" : seat.playBet ? "push" : "";
      if (cat) cls += ` res-${cat}`;
      if (seat.playBet) resultHtml = `<span class="uth-bet-delta ${cat}">${delta > 0 ? "+" + fmt(delta) : delta < 0 ? "−" + fmt(-delta) : "PUSH"}</span>`;
    }
    playRow = `
      <button class="${cls}" tabindex="-1">
        <span class="uth-bet-label">PLAY</span>
        <span class="uth-bet-amount">${seat.playBet ? fmt(seat.playBet) : "—"}</span>
        ${seat.playBet ? stageBadge : `<span class="uth-bet-sub">4x·3x / 2x / 1x</span>`}
        ${resultHtml}
      </button>`;
  }

  return `
    <div class="uth-bet-board${editing ? "" : " locked"}">
      <div class="uth-bet-row uth-bet-row-sides">${sides}</div>
      <div class="uth-bet-row uth-bet-row-core">${core}</div>
      <div class="uth-bet-row uth-bet-row-play">${playRow}</div>
    </div>`;
}

// ── Bet editing ──────────────────────────────────────────────────────────────

function addBet(key) {
  const info = activeInfo();
  const seat = seatOf(info);
  if (!info || !seat) return;
  if (key === "blind") key = "ante"; // the pair moves together
  const p = { ...info.pending };
  if (key === "ante") {
    const next = p.ante + selChip;
    if (next > info.table.maxAnte) {
      showToast(`Max ante is ${fmt(info.table.maxAnte)}.`);
      return;
    }
    p.ante = next;
    coreJustChanged = true;
  } else {
    if (p.ante === 0) {
      showToast("Place your Ante first — side bets can't exceed it.");
      return;
    }
    const next = p[key] + selChip;
    if (next > p.ante) {
      showToast("Side bets can't exceed your Ante.");
      return;
    }
    p[key] = next;
  }
  const total = p.ante * 2 + p.trips + p.holeCard + p.badBeat;
  if (total > seat.stack) {
    showToast("Not enough chips (Blind matches your Ante).");
    return;
  }
  info.pending = p;
  render();
}

function removeBet(key) {
  const info = activeInfo();
  if (!info) return;
  if (key === "blind") key = "ante";
  const p = { ...info.pending };
  if (p[key] === 0) return;
  p[key] = Math.max(0, p[key] - selChip);
  if (key === "ante") {
    coreJustChanged = true;
    // side bets can never exceed the (new) ante
    for (const { key: sk } of SIDE_BETS) p[sk] = Math.min(p[sk], p.ante);
  }
  info.pending = p;
  render();
}

// ── Actions (event delegation) ───────────────────────────────────────────────

let lpTimer = null;
let lpFired = false;

document.addEventListener("pointerdown", (e) => {
  const btn = e.target.closest('[data-action="add-bet"]');
  if (!btn) return;
  lpFired = false;
  lpTimer = setTimeout(() => {
    lpFired = true;
    removeBet(btn.dataset.bet);
  }, 450);
});
document.addEventListener("pointerup", () => clearTimeout(lpTimer));
document.addEventListener("pointercancel", () => clearTimeout(lpTimer));

document.addEventListener("contextmenu", (e) => {
  const btn = e.target.closest('[data-action="add-bet"]');
  if (!btn) return;
  e.preventDefault();
  clearTimeout(lpTimer);
  removeBet(btn.dataset.bet);
});

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn || btn.disabled) return;
  const action = btn.dataset.action;
  const info = activeInfo();

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
      case "add-bet":
        if (lpFired) { lpFired = false; break; } // long-press already removed
        addBet(btn.dataset.bet);
        break;
      case "clear-bets":
        if (info) { info.pending = zeroBets(); coreJustChanged = true; render(); }
        break;
      case "ready": {
        if (sendingReady || !info) break;
        sendingReady = true;
        try {
          await uthCall("place-bets", { code: activeCode, ...info.pending });
        } finally {
          sendingReady = false;
        }
        break;
      }
      case "act":
        await uthCall("play-action", { code: activeCode, move: btn.dataset.move });
        break;
      case "next-round":
        await uthCall("next-round", { code: activeCode });
        break;
      case "sit-out":
        await uthCall("sit-out", { code: activeCode, sittingOut: true });
        break;
      case "sit-in":
        await uthCall("sit-out", { code: activeCode, sittingOut: false });
        break;
      case "rebuy":
        await uthCall("rebuy", { code: activeCode });
        break;
      case "tab":
        setActive(btn.dataset.code);
        break;
      case "tab-add":
        showOverlay(`
          <h2>Open another table</h2>
          <button class="uth-btn uth-btn-primary" data-action="add-new-table">NEW SOLO TABLE</button>
          <form class="uth-join-form" data-add-join>
            <input class="uth-code-input" id="addJoinCode" maxlength="8" placeholder="ROOM CODE" spellcheck="false" autocomplete="off">
            <button type="submit" class="uth-btn uth-btn-primary">JOIN</button>
          </form>
          <button class="uth-btn uth-btn-ghost" data-action="close-overlay">CANCEL</button>
        `);
        break;
      case "add-new-table": {
        btn.disabled = true;
        const { code } = await uthCall("create-table");
        hideOverlay();
        await openTable(code);
        break;
      }
      case "close-overlay":
        hideOverlay();
        break;
    }
  } catch (err) {
    hideOverlay();
    showToast(errMsg(err));
  }
});

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("[data-add-join]");
  if (!form) return;
  e.preventDefault();
  const code = (form.querySelector("#addJoinCode")?.value || "").trim().toUpperCase().replace(/^UTH-/, "");
  if (!code) return;
  hideOverlay();
  await openTable(code);
});

el.leaveBtn.addEventListener("click", () => {
  el.roomCode.classList.remove("pulse-invite");
  closeTable(activeCode, { leave: true });
});

el.roomCode.addEventListener("click", async () => {
  el.roomCode.classList.remove("pulse-invite");
  try {
    await navigator.clipboard.writeText(activeCode || urlCode);
    showToast("Room code copied — send it to a friend!");
  } catch {
    showToast(`Room code: ${activeCode || urlCode}`);
  }
});
