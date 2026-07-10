// table-main.js — the Ultimate Texas Hold'em live table(s).
//
// Two kinds of table share one UI:
//   • LOCAL solo tables (codes SOLO..SOLO4) — the pure state machine in
//     js/core/logic.js runs in-browser, persists to localStorage, and never
//     touches the network. No sign-in, no Lambda, no Firestore.
//   • ONLINE tables — clients hold Firestore onSnapshot listeners and write
//     ONLY via POST /uth/* (all money decisions are server-side). The whole
//     Firebase stack is loaded lazily the first time an online table opens,
//     so pure-solo sessions download zero networking code.
//
// Supports up to MAX_TABLES concurrent tables (multi-tabling): each open
// table keeps its own subscription; a tab strip switches which one is
// rendered. Badges light up when a table needs your action.
//
// Reveal pacing: the server resolves instantly (an all-in 4x preflop jumps
// straight to showdown in one snapshot), so presentation is staged here —
// flop (3 cards), then turn+river, then the dealer's hand, then results.

import { cardLabel, cardSuit, evaluate5, evaluate7 } from "../core/engine.js";
import { adviceFor } from "../core/strategy.js";
import {
  settingsPanelHtml,
  switchSettingsTab,
  isCoachOn,
  setCoachOn,
  CAP_SVG,
  CROWN_SVG,
  TREND_DOWN_SVG,
  CHECK_SVG,
  GEAR_SVG,
  EYE_SVG,
} from "./strategy-panel.js";
import {
  localCall,
  watchLocalTable,
  isLocalCode,
  nextLocalCode,
  LOCAL_UID,
} from "../state/local-table.js";

const CHIPS = [25, 100, 500, 1000];
const SIDE_BETS = [
  { key: "trips", label: "TRIPS" },
  { key: "holeCard", label: "HOLE CARD" },
  { key: "badBeat", label: "BAD BEAT" },
];
const PHASE_MS = { betting: 30000, preflop: 30000, flop: 30000, river: 30000, showdown: 10000 };
const MAX_TABLES = 4;
const LS_OPEN_TABLES = "uthOpenTables";
const REVEAL_MS = 900; // pause between reveal steps (flop → turn+river → dealer → results)

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
  boardZone: $("boardZone"),
  seatsArc: $("seatsArc"),
  dock: $("dock"),
  dockContent: $("dockContent"),
  timerFill: $("timerFill"),
  toast: $("toast"),
  overlay: $("overlay"),
  overlayCard: $("overlayCard"),
};

// table.html ships static skeletons for instant first paint — reuse them as
// the "connecting" state so there's no layout jump.
const DOCK_SKELETON = el.dockContent.innerHTML;
const BOARD_SKELETON = el.boardZone.innerHTML;

let myUid = null; // online identity (Firebase uid) — local tables use LOCAL_UID
let activeCode = null;
let selChip = 100;
let coachOn = isCoachOn(); // strategy coach, default on (toggled in Settings)
let sendingReady = false;
let coreJustChanged = false; // pulse ante+blind together on change
let toastTimer = null;
let domCode = null; // which table's cards the felt DOM currently shows

// code → { local, table, myCards, lastTickAt, pending, shown, revealTimer,
//          optimistic, fatal, joinTried, dom* render memos }
const tables = new Map();
// code → unsubscribe()
const unsubs = new Map();

// ── Lazy network stack (Firebase auth + Firestore + Lambda API) ──────────────

let netPromise = null;

function ensureNet() {
  if (!netPromise) {
    netPromise = Promise.all([
      import("../../../js/auth/firebase-init.js"),
      import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js"),
      import("../net/uth-api.js"),
      import("../state/table-store.js"),
    ]).then(([fb, fbAuth, api, store]) => {
      const net = {
        auth: fb.auth,
        googleProvider: fb.googleProvider,
        onAuthStateChanged: fbAuth.onAuthStateChanged,
        signInWithPopup: fbAuth.signInWithPopup,
        uthCall: api.uthCall,
        watchTable: store.watchTable,
      };
      // resolves once Firebase has restored (or ruled out) a session
      net.authReady = new Promise((resolve) => {
        const un = net.onAuthStateChanged(net.auth, () => {
          un();
          resolve();
        });
      });
      return net;
    });
  }
  return netPromise;
}

// Sign-in gate for online-only features. Returns net, or null if declined.
async function ensureSignedIn() {
  const net = await ensureNet();
  await net.authReady;
  if (!net.auth.currentUser) {
    try {
      await net.signInWithPopup(net.auth, net.googleProvider);
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") showToast(errMsg(err));
      return null;
    }
  }
  myUid = net.auth.currentUser.uid;
  return net;
}

// Route an action to the right backend for this table.
function tableCall(code, action, payload = {}) {
  if (isLocalCode(code)) return localCall(code, action, payload);
  return ensureNet().then((net) => net.uthCall(action, { code, ...payload }));
}

// ── Small helpers ────────────────────────────────────────────────────────────

const fmt = (n) => n.toLocaleString("en-US");
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const zeroBets = () => ({ ante: 0, trips: 0, holeCard: 0, badBeat: 0 });

const EYE_BADGE = `<span class="uth-eye" title="Cards shown to the table">${EYE_SVG}</span>`;

function cardHtml(c, { back = false, slot = false, flip = -1 } = {}) {
  const anim = flip >= 0 ? ` uth-card-flip" style="animation-delay:${flip * 130}ms` : "";
  if (slot) return `<div class="uth-card uth-card-slot"></div>`;
  if (back) return `<div class="uth-card uth-card-back${anim}"></div>`;
  const red = cardSuit(c) === 1 || cardSuit(c) === 2;
  return `<div class="uth-card${red ? " red" : ""}${anim}">${cardLabel(c)}</div>`;
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
  "not-signed-in": "Please sign in first.",
  "bad-phase": "You can't do that right now.",
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
const uidFor = (info) => (info?.local ? LOCAL_UID : myUid);
const seatOf = (info) => info?.table?.seats.find((s) => s.uid === uidFor(info)) || null;

// My seat with any optimistic (not-yet-confirmed) action layered on top, so
// clicks feel instant while the server round-trip is in flight.
function viewSeat(info) {
  const seat = seatOf(info);
  return seat && info.optimistic ? { ...seat, ...info.optimistic } : seat;
}

function myHole(info) {
  const seat = seatOf(info);
  return info?.myCards && info.myCards.roundNo === info.table?.roundNo && seat?.inHand
    ? info.myCards.holeCards
    : null;
}

// What raises can the stack still cover after posting these bets?
// The river 1x is the minimum the game requires (fold-only otherwise), so a
// bet that can't cover it is blocked; missing 3x/4x is only worth a warning.
function raiseAffordability(seat, p) {
  const remaining = seat.stack - (p.ante * 2 + p.trips + p.holeCard + p.badBeat);
  return {
    remaining,
    can1x: remaining >= p.ante,
    can3x: remaining >= p.ante * 3,
    can4x: remaining >= p.ante * 4,
  };
}

// Community cards currently *presented* (reveal pacing may lag the server).
function visCommunity(info) {
  const cc = info.table?.community || [];
  return info.shown ? cc.slice(0, info.shown.community) : cc;
}

// Is a decision/bet owed by me at this table right now?
function needsMyAction(info) {
  const t = info?.table;
  const seat = viewSeat(info);
  if (!t || !seat || seat.sittingOut) return false;
  if (t.phase === "betting") return !seat.ready;
  if (["preflop", "flop", "river"].includes(t.phase)) {
    return seat.inHand && !seat.folded && !seat.acted && (t.phase === "preflop" || seat.playBet === 0);
  }
  return false;
}

// ── Reveal sequencer ─────────────────────────────────────────────────────────
//
// info.shown = what the player currently sees; targetShown() = server truth.
// One step per REVEAL_MS: flop (3 cards) → turn+river (2 cards) → dealer's
// hand → results. Reconnects/first snapshots fast-forward with no drama.

function targetShown(t) {
  return {
    community: (t.community || []).length,
    dealer: !!t.dealer?.holeCards,
    results: t.phase === "showdown",
  };
}

function revealCaughtUp(info) {
  if (!info.shown || !info.table) return true;
  const tgt = targetShown(info.table);
  return (
    info.shown.community >= tgt.community &&
    info.shown.dealer === tgt.dealer &&
    info.shown.results === tgt.results
  );
}

function syncReveal(code, fastForward) {
  const info = tables.get(code);
  const t = info?.table;
  if (!t) return;
  if (t.phase === "betting" || fastForward || !info.shown) {
    clearTimeout(info.revealTimer);
    info.revealTimer = null;
    info.shown = targetShown(t);
    return;
  }
  stepReveal(code);
}

function stepReveal(code) {
  const info = tables.get(code);
  if (!info?.table || info.revealTimer) return;
  const tgt = targetShown(info.table);
  const s = info.shown;
  let resultsJustShown = false;
  if (s.community < tgt.community) {
    // flop flips as a group of 3, then turn+river together
    s.community = s.community < 3 ? Math.min(3, tgt.community) : tgt.community;
  } else if (tgt.dealer && !s.dealer) {
    s.dealer = true;
  } else if (tgt.results && !s.results) {
    s.results = true;
    resultsJustShown = true;
  } else {
    return; // caught up
  }
  if (code === activeCode) {
    render();
    // small screens: the felt scrolls — bring the per-bet payouts into view
    if (resultsJustShown) el.boardZone.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  renderTabs();
  info.revealTimer = setTimeout(() => {
    info.revealTimer = null;
    stepReveal(code);
  }, REVEAL_MS);
}

// ── Boot ─────────────────────────────────────────────────────────────────────

if (!urlCode) location.replace("index.html");

function readStoredCodes() {
  try {
    const list = JSON.parse(localStorage.getItem(LS_OPEN_TABLES) || "[]");
    return Array.isArray(list) ? list.filter((c) => typeof c === "string") : [];
  } catch {
    return [];
  }
}

async function boot() {
  const stored = readStoredCodes();

  // Local tables first: they render instantly, before any network work.
  if (isLocalCode(urlCode)) {
    await openTable(urlCode);
    setActive(urlCode);
  }
  for (const code of stored) {
    if (code !== urlCode && isLocalCode(code) && tables.size < MAX_TABLES) {
      await openTable(code, { silent: true });
    }
  }

  const onlineCodes = [urlCode, ...stored.filter((c) => c !== urlCode)]
    .filter((c) => c && !isLocalCode(c))
    .filter((c, i, a) => a.indexOf(c) === i);

  setInterval(tickLoop, 500);
  if (onlineCodes.length === 0) return;

  if (!isLocalCode(urlCode)) showOverlay(`<h2>Joining table ${esc(urlCode)}…</h2>`);
  const net = await ensureNet();
  net.onAuthStateChanged(net.auth, (user) => {
    if (!user) {
      if (!isLocalCode(urlCode)) {
        showOverlay(`
          <h2>Sign in to join the table</h2>
          <p class="uth-muted">Room ${esc(urlCode)}</p>
          <button class="uth-btn uth-btn-primary" data-action="sign-in">Sign in with Google</button>
        `);
      }
      return;
    }
    if (myUid) return;
    myUid = user.uid;
    openOnlineTables(onlineCodes);
  });
}

async function openOnlineTables(codes) {
  for (const code of codes) {
    if (tables.size >= MAX_TABLES) break;
    const isUrl = code === urlCode;
    await openTable(code, { fatalOnError: isUrl, silent: !isUrl });
  }
  if (!isLocalCode(urlCode) && tables.has(urlCode)) {
    hideOverlay();
    setActive(urlCode);
    if (inviteMode) {
      showToast(`Share code UTH-${urlCode} — friends join with it!`);
      el.roomCode.classList.add("pulse-invite");
    }
  }
}

boot();

// ── Multi-table management ───────────────────────────────────────────────────

function newInfo(local) {
  return {
    local,
    table: null,
    myCards: null,
    lastTickAt: 0,
    pending: zeroBets(),
    shown: null,
    revealTimer: null,
    optimistic: null,
    fatal: false,
    joinTried: false,
  };
}

function tableCallbacks(code) {
  return {
    onTable: (t) => {
      const info = tables.get(code);
      if (!info) return;
      const firstSnapshot = info.table === null;
      info.table = t;
      reconcileOptimistic(info);
      syncReveal(code, firstSnapshot);
      if (code === activeCode) render();
      renderTabs();
    },
    onMyCards: (d) => {
      const info = tables.get(code);
      if (!info) return;
      info.myCards = d;
      if (code === activeCode) render();
    },
  };
}

// Attach the Firestore listeners for an online table. Security rules only
// allow reads once you're in seatUids — in every normal path (created the
// table, joined via the lobby, restoring after a reload) you already are, so
// we subscribe FIRST and only fall back to join-table if reads are denied.
// That keeps a full Lambda round-trip off the critical path.
function subscribeOnline(code, net) {
  const cbs = tableCallbacks(code);
  unsubs.set(
    code,
    net.watchTable(code, myUid, {
      ...cbs,
      onError: async (err) => {
        const info = tables.get(code);
        if (!info) return;
        if (err.code === "permission-denied" && !info.joinTried) {
          info.joinTried = true;
          unsubs.get(code)?.(); // dead listener — Firestore won't retry it
          try {
            await net.uthCall("join-table", { code });
          } catch (joinErr) {
            if (joinErr.code !== "already-seated") {
              failTable(code, joinErr);
              return;
            }
          }
          subscribeOnline(code, net);
          return;
        }
        if (err.code === "no-table" || err.code === "permission-denied") {
          failTable(code, { code: "no-table" });
        }
      },
    })
  );
}

function failTable(code, err) {
  const info = tables.get(code);
  if (!info) return;
  const fatal = info.fatal && tables.size === 1;
  clearTimeout(info.revealTimer);
  unsubs.get(code)?.();
  unsubs.delete(code);
  tables.delete(code);
  persistOpenTables();
  renderTabs();
  if (fatal) {
    // the page has nothing else to show — explain instead of bouncing away
    showOverlay(`
      <h2>Couldn't join</h2>
      <p class="uth-muted">${esc(errMsg(err))}</p>
      <a class="uth-btn uth-btn-primary" href="index.html">Back to lobby</a>
    `);
    return;
  }
  showToast(`Table UTH-${code}: ${errMsg(err)}`);
  if (activeCode === code) {
    const next = tables.keys().next();
    if (next.done) {
      location.href = "index.html";
      return;
    }
    setActive(next.value);
  }
}

async function openTable(code, { fatalOnError = false, silent = false } = {}) {
  if (tables.has(code)) {
    setActive(code);
    return true;
  }
  if (tables.size >= MAX_TABLES) {
    if (!silent) showToast(`You can play up to ${MAX_TABLES} tables at once.`);
    return false;
  }

  const local = isLocalCode(code);
  const info = newInfo(local);
  info.fatal = fatalOnError;
  tables.set(code, info);

  if (local) {
    unsubs.set(code, watchLocalTable(code, tableCallbacks(code)));
  } else {
    const net = await ensureNet();
    if (!myUid) {
      // online table without a session (e.g. "+ join" while playing solo)
      tables.delete(code);
      const signedIn = await ensureSignedIn();
      if (!signedIn) return false;
      tables.set(code, info);
    }
    subscribeOnline(code, net);
  }
  persistOpenTables();
  renderTabs();
  return true;
}

function closeTable(code, { leave = true } = {}) {
  const info = tables.get(code);
  if (info) clearTimeout(info.revealTimer);
  unsubs.get(code)?.();
  unsubs.delete(code);
  tables.delete(code);
  persistOpenTables();
  if (leave) tableCall(code, "leave-table").catch(() => {});
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
  html += `<button class="uth-tab uth-tab-settings" data-action="settings" title="Settings & perfect strategy">${GEAR_SVG} SETTINGS</button>`;
  el.tabsBar.innerHTML = html;
  const anyAttention = [...tables.entries()].some(([code, i]) => needsMyAction(i) && code !== activeCode);
  document.title = `${anyAttention ? "● " : ""}Ultimate Texas Hold'em — Table`;
}

// ── Tick / timer loop ────────────────────────────────────────────────────────

function tickLoop() {
  const now = Date.now();
  for (const [code, info] of tables) {
    if (info.local) continue; // solo has no shared clock
    const deadline = info.table?.actionDeadline;
    if (deadline && now > deadline + 600 && now - info.lastTickAt > 2000) {
      info.lastTickAt = now;
      tableCall(code, "tick").catch(() => {});
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
  const freshDom = domCode !== activeCode;
  domCode = activeCode;

  if (!info?.table) {
    el.boardZone.innerHTML = BOARD_SKELETON;
    el.dockContent.innerHTML = DOCK_SKELETON;
    return;
  }
  const table = info.table;
  const seat = viewSeat(info);

  el.roomCode.textContent = info.local ? "SOLO PLAY" : `UTH-${table.code}`;
  el.roundLabel.textContent = info.local
    ? `Round ${table.roundNo} · practice chips`
    : `Round ${table.roundNo} · ${table.seats.length}/6 seats`;

  renderDealer(info, freshDom);
  renderCommunity(info, freshDom);
  renderSeats(info, table.phase);
  el.boardZone.innerHTML = seat ? renderBoard(info, seat, table.phase) : BOARD_SKELETON;
  renderDock(info, seat, table.phase);
}

function renderDealer(info, freshDom) {
  const table = info.table;
  const d = table.dealer;
  const revealed = d.holeCards && info.shown?.dealer;
  const state = revealed ? `up:${d.holeCards.join(",")}` : table.phase === "betting" ? "slots" : "backs";
  const changed = freshDom || info.domDealer !== state;
  if (changed) {
    const flipOK = !freshDom && info.domDealer === "backs";
    if (revealed) {
      el.dealerCards.innerHTML = d.holeCards.map((c, i) => cardHtml(c, { flip: flipOK ? i : -1 })).join("");
    } else if (table.phase === "betting") {
      el.dealerCards.innerHTML = cardHtml(0, { slot: true }) + cardHtml(0, { slot: true });
    } else {
      el.dealerCards.innerHTML = cardHtml(0, { back: true }) + cardHtml(0, { back: true });
    }
    info.domDealer = state;
  }
  el.dealerStatus.innerHTML = revealed
    ? d.qualifies
      ? `<span class="uth-dealer-hand">${esc(d.name)}</span>`
      : `<span class="uth-dealer-hand">${esc(d.name)}</span><span class="uth-noqualify">Dealer does not qualify — Antes push</span>`
    : "";
}

function renderCommunity(info, freshDom) {
  const cc = visCommunity(info);
  const key = cc.join(",");
  if (!freshDom && info.domCommunityKey === key) return; // keep running flips alive
  const from = freshDom ? cc.length : (info.domCommunityCount ?? 0);
  let html = cc.map((c, i) => cardHtml(c, { flip: i >= from ? i - from : -1 })).join("");
  for (let i = cc.length; i < 5; i++) html += cardHtml(0, { slot: true });
  el.communityCards.innerHTML = html;
  info.domCommunityKey = key;
  info.domCommunityCount = cc.length;
}

function renderSeats(info, phase) {
  const table = info.table;
  const uid = uidFor(info);
  const resultsShown = !!info.shown?.results;
  const seats = [...table.seats].sort((a, b) => a.seatIndex - b.seatIndex);
  const myIdx = Math.max(0, seats.findIndex((s) => s.uid === uid));
  const ordered = seats.map((_, i) => seats[(myIdx + i) % seats.length]);

  el.seatsArc.innerHTML = ordered
    .map((sRaw, pos) => {
      const isMe = sRaw.uid === uid;
      const s = isMe && info.optimistic ? { ...sRaw, ...info.optimistic } : sRaw;
      const badges = [];
      if (s.sittingOut) badges.push(`<span class="uth-badge">SITTING OUT</span>`);
      else if (phase === "betting" && s.ready) badges.push(`<span class="uth-badge ok">READY</span>`);
      else if (s.inHand && s.folded) badges.push(`<span class="uth-badge bad">FOLDED</span>`);
      else if (s.inHand && s.playBet > 0) badges.push(`<span class="uth-badge gold">BET ${fmt(s.playBet)}</span>`);
      else if (["preflop", "flop", "river"].includes(phase) && s.inHand && s.acted)
        badges.push(`<span class="uth-badge ok">${CHECK_SVG}</span>`);

      // my own cards + result live in the dock, bigger — the pill stays
      // compact so it never crowds the felt spots. A player who chose to
      // SHOW their cards (revealed flag) is face-up for everyone, eye-badged.
      let cardsHtml = "";
      let resultHtml = "";
      if (!isMe && s.inHand && phase !== "betting") {
        const faceUp = s.holeCards && (s.revealed || (phase === "showdown" && resultsShown));
        if (faceUp) {
          cardsHtml = `<div class="uth-seat-cards">${s.holeCards.map((c) => cardHtml(c)).join("")}${s.revealed ? EYE_BADGE : ""}</div>`;
        } else if (!s.folded) {
          cardsHtml = `<div class="uth-seat-cards">${cardHtml(0, { back: true })}${cardHtml(0, { back: true })}</div>`;
        }
        if (phase === "showdown" && s.result && resultsShown) {
          const net = s.result.net;
          resultHtml = `<div class="uth-seat-result ${net >= 0 ? "pos" : "neg"}">${net >= 0 ? "+" : "−"}${fmt(Math.abs(net))}${s.result.hand ? ` · ${esc(s.result.hand)}` : ""}</div>`;
        }
      }

      // everyone sees everyone's bets: ante+blind · play · side bets
      const sides = s.bets.trips + s.bets.holeCard + s.bets.badBeat;
      const betBits = [];
      if (s.bets.ante) betBits.push(`A+B ${fmt(s.bets.ante + s.bets.blind)}`);
      if (s.playBet) betBits.push(`PLAY ${fmt(s.playBet)}`);
      if (sides) betBits.push(`SIDE ${fmt(sides)}`);
      const betTitle = `Ante ${s.bets.ante} · Blind ${s.bets.blind} · Play ${s.playBet || 0} · Trips ${s.bets.trips} · Hole Card ${s.bets.holeCard} · Bad Beat ${s.bets.badBeat}`;
      const betLine =
        (s.inHand || (phase === "betting" && s.ready)) && betBits.length
          ? `<div class="uth-seat-bets" title="${betTitle}">${betBits.join(" · ")}</div>`
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
    el.dockContent.innerHTML = DOCK_SKELETON;
    return;
  }
  const resultsShown = !!info.shown?.results;

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

  // my cards + hint on decision streets and showdown; online, tapping your
  // own cards offers to SHOW them to the whole table (eye badge once shared)
  const hole = myHole(info);
  if (hole && phase !== "betting") {
    const freshDeal = info.domHoleRound !== info.table.roundNo;
    info.domHoleRound = info.table.roundNo;
    const shared = !info.local && seat.revealed;
    const canReveal = !info.local && !seat.revealed && (phase !== "showdown" || seat.folded);
    parts.push(`
      <div class="uth-my-cards${canReveal ? " can-reveal" : ""}"${canReveal ? ` data-action="reveal-ask" role="button" title="Show your cards to the table"` : ""}>
        ${hole.map((c, i) => cardHtml(c, { flip: freshDeal ? i : -1 })).join("")}
        ${shared ? EYE_BADGE : ""}
      </div>`);
    if (canReveal) {
      parts.push(`<button class="uth-reveal-link" data-action="reveal-ask">${EYE_SVG} Show my cards to the table</button>`);
    } else if (shared) {
      parts.push(`<div class="uth-reveal-note">${EYE_SVG} Your cards are face-up for everyone this hand</div>`);
    }
    const visCC = visCommunity(info);
    if (visCC.length && !seat.folded) {
      parts.push(`<div class="uth-hint">You have: <strong>${esc(handName([...hole, ...visCC]) || "")}</strong></div>`);
    }
  }

  if (phase === "showdown" && seat.result && resultsShown) {
    const r = seat.result;
    parts.push(`
      <div class="uth-result-banner ${r.net >= 0 ? "pos" : "neg"}">
        ${r.net > 0 ? "YOU WIN" : r.net === 0 ? "PUSH" : "YOU LOSE"}
        <strong>${r.net >= 0 ? "+" : "−"}${fmt(Math.abs(r.net))}</strong>
      </div>`);
  }

  if (phase === "betting") {
    if (seat.ready) {
      parts.push(`<p class="uth-muted">${info.local ? "Bets locked — dealing…" : "Bets locked — waiting for the other players…"}</p>`);
    } else {
      const chips = CHIPS.map(
        (v) => `
          <button class="uth-chip uth-chip-${v}${selChip === v ? " selected" : ""}"
                  data-action="chip" data-chip="${v}">${v >= 1000 ? "1K" : v}</button>`
      ).join("");
      parts.push(`<div class="uth-chip-rack">${chips}</div>`);
      parts.push(`<div class="uth-bet-note uth-muted">Click a spot to add the selected chip · hold or right-click to remove</div>`);
      const p = info.pending;
      const afford = raiseAffordability(seat, p);
      if (p.ante > 0) {
        if (!afford.can1x) {
          parts.push(`<p class="uth-bet-warning block">Not enough chips left for the required 1x Play bet (${fmt(p.ante)}) — lower your Ante or side bets.</p>`);
        } else if (!afford.can3x) {
          parts.push(`<p class="uth-bet-warning">Heads up: after these bets you can't afford a 3x or 4x raise — only check, 2x or 1x.</p>`);
        } else if (!afford.can4x) {
          parts.push(`<p class="uth-bet-warning">Heads up: you can afford a 3x raise, but not 4x.</p>`);
        }
      }
      const readyOk = p.ante >= info.table.minAnte && afford.can1x;
      parts.push(`
        <div class="uth-actions">
          <button class="uth-btn uth-btn-ghost" data-action="clear-bets">CLEAR</button>
          <button class="uth-btn uth-btn-primary" data-action="ready" ${readyOk ? "" : "disabled"}>${info.local ? "DEAL" : "READY"}${p.ante ? ` · ${fmt(p.ante * 2 + p.trips + p.holeCard + p.badBeat)}` : ""}</button>
          <button class="uth-btn uth-btn-ghost" data-action="sit-out">SIT OUT</button>
        </div>`);
    }
  } else if (["preflop", "flop", "river"].includes(phase)) {
    if (seat.folded) {
      parts.push(`<p class="uth-muted">Folded — waiting for showdown.</p>`);
    } else if (needsMyAction(info) && revealCaughtUp(info)) {
      // strategy coach: recommend the Wizard-of-Odds play for MY cards only
      const advice = hole ? adviceFor(phase, hole, visCommunity(info)) : null;
      parts.push(coachHtml(advice));
      const pick = coachOn && advice ? advice.move : null;
      const btn = (move, label, cls) =>
        `<button class="uth-btn ${cls}${pick === move ? " coach-pick" : ""}" data-action="act" data-move="${move}">${label}</button>`;
      // decision buttons live here, in the thumb zone — never mid-felt
      let buttons = "";
      if (phase === "preflop") {
        buttons = btn("check", "CHECK", "uth-btn-act") + btn("3x", "BET 3x", "uth-btn-raise") + btn("4x", "BET 4x", "uth-btn-raise");
      } else if (phase === "flop") {
        buttons = btn("check", "CHECK", "uth-btn-act") + btn("2x", "BET 2x", "uth-btn-raise");
      } else {
        buttons = btn("fold", "FOLD", "uth-btn-fold") + btn("1x", "BET 1x", "uth-btn-raise");
      }
      parts.push(`<div class="uth-actions uth-play-actions">${buttons}</div>`);
    } else if (!needsMyAction(info)) {
      parts.push(`<p class="uth-muted">${seat.playBet > 0 ? `Play bet ${fmt(seat.playBet)} placed.` : "Checked."}${info.local ? "" : " Waiting for other players…"}</p>`);
    }
  } else if (phase === "showdown" && resultsShown) {
    parts.push(renderLeaderboard(info));
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

// ── Strategy coach, guide & leaderboard ─────────────────────────────────────

const MOVE_LABELS = { "4x": "BET 4x", "3x": "BET 3x", "2x": "BET 2x", "1x": "BET 1x", check: "CHECK", fold: "FOLD" };

function coachHtml(advice) {
  if (!coachOn) {
    return `<button class="uth-coach-off" data-action="coach-toggle" title="Turn the strategy coach on">${CAP_SVG} Coach off</button>`;
  }
  if (!advice) return "";
  return `
    <div class="uth-coach">
      <button class="uth-coach-toggle" data-action="coach-toggle" title="Turn the strategy coach off">${CAP_SVG}</button>
      <span class="uth-coach-text">Coach says <strong>${MOVE_LABELS[advice.move]}</strong> — ${esc(advice.reason)}</span>
    </div>`;
}

// Ranked session net (wins − losses) across every hand played at this table.
function renderLeaderboard(info) {
  const uid = uidFor(info);
  const rows = info.table.seats
    .filter((s) => (s.handsPlayed || 0) > 0)
    .sort((a, b) => (b.sessionNet || 0) - (a.sessionNet || 0) || a.seatIndex - b.seatIndex);
  if (rows.length === 0) return "";
  if (rows.length === 1) {
    const s = rows[0];
    const net = s.sessionNet || 0;
    return `<div class="uth-lb-solo ${net >= 0 ? "pos" : "neg"}">Session: ${net >= 0 ? "+" : "−"}${fmt(Math.abs(net))} over ${s.handsPlayed} hand${s.handsPlayed === 1 ? "" : "s"} · won ${s.handsWon || 0}</div>`;
  }
  const last = rows.length - 1;
  const rowHtml = rows
    .map((s, i) => {
      const net = s.sessionNet || 0;
      const tag =
        i === 0 && net > 0
          ? `<span class="uth-lb-ic pos" title="Biggest winner">${CROWN_SVG}</span> `
          : i === last && net < 0
            ? `<span class="uth-lb-ic neg" title="Biggest loser">${TREND_DOWN_SVG}</span> `
            : "";
      return `
        <div class="uth-lb-row${s.uid === uid ? " me" : ""}">
          <span class="uth-lb-rank">${i + 1}</span>
          <span class="uth-lb-name">${tag}${esc(s.uid === uid ? "You" : s.name)}</span>
          <span class="uth-lb-hands">won ${s.handsWon || 0}/${s.handsPlayed || 0}</span>
          <span class="uth-lb-net ${net > 0 ? "pos" : net < 0 ? "neg" : ""}">${net >= 0 ? "+" : "−"}${fmt(Math.abs(net))}</span>
        </div>`;
    })
    .join("");
  return `
    <div class="uth-leaderboard">
      <div class="uth-lb-title">SESSION LEADERBOARD — MOST WON &amp; LOST</div>
      ${rowHtml}
    </div>`;
}

function settingsOverlayHtml(tab = "coach") {
  return `
    <h2>${GEAR_SVG} Settings</h2>
    <div class="uth-guide">${settingsPanelHtml(coachOn, tab)}</div>
    <button class="uth-btn uth-btn-primary" data-action="close-overlay">GOT IT</button>`;
}

// The casino-style bet board painted on the felt, persistent across phases:
//   row 1 — side bets:      TRIPS · HOLE CARD · BAD BEAT
//   row 2 — core (equal):   ANTE = BLIND
//   row 3 — play spot:      the Play bet (decision buttons live in the dock)
function renderBoard(info, seat, phase) {
  const editing = phase === "betting" && !seat.ready && !seat.sittingOut;
  const src = editing ? info.pending : seat.bets;
  const results = phase === "showdown" && seat.inHand && info.shown?.results ? seat.result : null;

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

  // Play spot: lights up while a decision is owed; the buttons themselves
  // render in the dock so they always sit in the thumb zone.
  const pendingMe = needsMyAction(info) && phase !== "betting" && revealCaughtUp(info);
  const stageBadge = seat.playStage ? `<span class="uth-bet-sub">${{ preflop: "4x·3x", flop: "2x", river: "1x" }[seat.playStage] || ""}</span>` : "";
  let cls = "uth-bet-circle uth-play-spot locked";
  let playResultHtml = "";
  if (seat.playBet) cls += " has-bet";
  if (pendingMe) cls += " awaiting";
  if (results) {
    const delta = results.play;
    const cat = delta > 0 ? "pos" : delta < 0 ? "neg" : seat.playBet ? "push" : "";
    if (cat) cls += ` res-${cat}`;
    if (seat.playBet) playResultHtml = `<span class="uth-bet-delta ${cat}">${delta > 0 ? "+" + fmt(delta) : delta < 0 ? "−" + fmt(-delta) : "PUSH"}</span>`;
  }
  const playRow = `
    <button class="${cls}" tabindex="-1">
      <span class="uth-bet-label">PLAY</span>
      <span class="uth-bet-amount">${seat.playBet ? fmt(seat.playBet) : "—"}</span>
      ${seat.playBet ? stageBadge : `<span class="uth-bet-sub">4x·3x / 2x / 1x</span>`}
      ${playResultHtml}
    </button>`;

  return `
    <div class="uth-bet-board${editing ? "" : " locked"}">
      <div class="uth-bet-row uth-bet-row-sides">${sides}</div>
      <div class="uth-bet-row uth-bet-row-core">${core}</div>
      <div class="uth-bet-row uth-bet-row-play">${playRow}</div>
    </div>`;
}

// ── Optimistic action echo ───────────────────────────────────────────────────

function setOptimistic(info, patch) {
  if (info.local) return; // local calls resolve synchronously — no need
  info.optimistic = { ...(info.optimistic || {}), ...patch };
}

function reconcileOptimistic(info) {
  const seat = seatOf(info);
  const o = info.optimistic;
  if (!seat || !o) return;
  if ((o.ready && seat.ready) || (o.acted && seat.acted) || (o.revealed && seat.revealed)) {
    info.optimistic = null;
  }
}

// ── Bet editing ──────────────────────────────────────────────────────────────

function addBet(key) {
  const info = activeInfo();
  const seat = viewSeat(info);
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
      case "sign-in": {
        const net = await ensureNet();
        await net.signInWithPopup(net.auth, net.googleProvider).catch((err) => {
          if (err.code !== "auth/popup-closed-by-user") showToast(errMsg(err));
        });
        break;
      }
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
        const seatNow = viewSeat(info);
        if (seatNow && !raiseAffordability(seatNow, info.pending).can1x) {
          showToast("Not enough chips left for the required 1x Play bet — lower your Ante or side bets.");
          break;
        }
        sendingReady = true;
        const bets = { ...info.pending };
        setOptimistic(info, { ready: true, bets: { ...bets, blind: bets.ante } });
        render();
        try {
          await tableCall(activeCode, "place-bets", bets);
        } catch (err) {
          info.optimistic = null;
          render();
          throw err;
        } finally {
          sendingReady = false;
        }
        break;
      }
      case "act": {
        const move = btn.dataset.move;
        const seat = seatOf(info);
        if (seat && info.table) {
          const mult = { check: 0, "4x": 4, "3x": 3, "2x": 2, "1x": 1, fold: -1 }[move];
          const patch = { acted: true };
          if (mult > 0) {
            patch.playBet = seat.bets.ante * mult;
            patch.playStage = info.table.phase;
            patch.stack = seat.stack - seat.bets.ante * mult;
          } else if (mult === -1) {
            patch.folded = true;
          }
          setOptimistic(info, patch);
          render();
        }
        try {
          await tableCall(activeCode, "play-action", { move });
        } catch (err) {
          info.optimistic = null;
          render();
          throw err;
        }
        break;
      }
      case "next-round":
        await tableCall(activeCode, "next-round");
        break;
      case "coach-toggle": {
        coachOn = !coachOn;
        setCoachOn(coachOn);
        // update the overlay switch in place (keeps tab + scroll position)
        const sw = el.overlayCard.querySelector(".uth-switch");
        if (sw) {
          sw.classList.toggle("on", coachOn);
          sw.setAttribute("aria-checked", String(coachOn));
        }
        render();
        break;
      }
      case "settings":
        showOverlay(settingsOverlayHtml("coach"));
        break;
      case "settings-info":
        showOverlay(settingsOverlayHtml("info"));
        break;
      case "settings-tab":
        switchSettingsTab(el.overlayCard, btn.dataset.tab);
        break;
      case "reveal-ask":
        showOverlay(`
          <h2>${EYE_SVG} Show your cards?</h2>
          <p class="uth-muted">Everyone at this table will see your two hole cards for the
          rest of this hand. You can't hide them again once shown.</p>
          <div class="uth-actions">
            <button class="uth-btn uth-btn-primary" data-action="reveal-confirm">SHOW MY CARDS</button>
            <button class="uth-btn uth-btn-ghost" data-action="close-overlay">CANCEL</button>
          </div>`);
        break;
      case "reveal-confirm": {
        hideOverlay();
        if (!info) break;
        const hole = myHole(info);
        if (hole) {
          setOptimistic(info, { revealed: true, holeCards: hole });
          render();
        }
        try {
          await tableCall(activeCode, "reveal-cards");
        } catch (err) {
          info.optimistic = null;
          render();
          throw err;
        }
        break;
      }
      case "sit-out":
        await tableCall(activeCode, "sit-out", { sittingOut: true });
        break;
      case "sit-in":
        await tableCall(activeCode, "sit-out", { sittingOut: false });
        break;
      case "rebuy":
        await tableCall(activeCode, "rebuy");
        break;
      case "tab":
        setActive(btn.dataset.code);
        break;
      case "tab-add":
        showOverlay(`
          <h2>Open another table</h2>
          <button class="uth-btn uth-btn-primary" data-action="add-new-table">NEW SOLO TABLE</button>
          <button class="uth-btn uth-btn-ghost" data-action="add-new-online">NEW ONLINE TABLE (invite friends)</button>
          <form class="uth-join-form" data-add-join>
            <input class="uth-code-input" id="addJoinCode" maxlength="8" placeholder="ROOM CODE" spellcheck="false" autocomplete="off">
            <button type="submit" class="uth-btn uth-btn-primary">JOIN</button>
          </form>
          <button class="uth-btn uth-btn-ghost" data-action="close-overlay">CANCEL</button>
        `);
        break;
      case "add-new-table": {
        const code = nextLocalCode([...tables.keys()]);
        hideOverlay();
        if (!code) {
          showToast("All solo table slots are in use.");
          break;
        }
        await openTable(code);
        setActive(code);
        break;
      }
      case "add-new-online": {
        btn.disabled = true;
        const net = await ensureSignedIn();
        if (!net) { btn.disabled = false; break; }
        const { code } = await net.uthCall("create-table");
        hideOverlay();
        await openTable(code);
        setActive(code);
        showToast(`Share code UTH-${code} — friends join with it!`);
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
  const opened = await openTable(code);
  if (opened) setActive(code);
});

el.leaveBtn.addEventListener("click", () => {
  el.roomCode.classList.remove("pulse-invite");
  closeTable(activeCode, { leave: true });
});

el.roomCode.addEventListener("click", async () => {
  const info = activeInfo();
  if (info?.local) return; // nothing to share for a solo table
  el.roomCode.classList.remove("pulse-invite");
  try {
    await navigator.clipboard.writeText(activeCode || urlCode);
    showToast("Room code copied — send it to a friend!");
  } catch {
    showToast(`Room code: ${activeCode || urlCode}`);
  }
});
