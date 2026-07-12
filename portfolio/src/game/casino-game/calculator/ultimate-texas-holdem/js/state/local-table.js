// local-table.js — fully offline solo tables: no sign-in, no Lambda, no
// Firestore. The same pure state machine the server runs (js/core/logic.js)
// executes right here, and the whole table persists in localStorage so your
// stack survives reloads.
//
// Mirrors the online interface so table-main.js treats both alike:
//   localCall(code, action, payload) → Promise (rejects with .code errors)
//   watchLocalTable(code, {onTable, onMyCards}) → unsubscribe()
//
// Local room codes are SOLO / SOLO2..SOLO4. The letters O and L are excluded
// from the server's room-code alphabet, so these can never collide with (or
// be mistaken for) a real online table.

import {
  newTable,
  placeBets,
  playAction,
  rebuy,
  sitOut,
  nextRound,
  UthError,
} from "../core/logic.js";

export const LOCAL_UID = "local";
export const LOCAL_CODES = ["SOLO", "SOLO2", "SOLO3", "SOLO4"];
export const isLocalCode = (code) => LOCAL_CODES.includes(code);

const LS_KEY = (code) => `uthSoloTable:${code}`;

// code → { table, dealerDoc, myCards }
const games = new Map();
// code → Set<{onTable, onMyCards}>
const watchers = new Map();

// ── Persistence ──────────────────────────────────────────────────────────────

function save(code) {
  const g = games.get(code);
  try {
    if (g) localStorage.setItem(LS_KEY(code), JSON.stringify(g));
    else localStorage.removeItem(LS_KEY(code));
  } catch {
    /* storage full/blocked — play on in memory */
  }
}

function restore(code) {
  try {
    const raw = localStorage.getItem(LS_KEY(code));
    if (!raw) return null;
    const g = JSON.parse(raw);
    if (g?.table?.code !== code || !g.table.phase || !Array.isArray(g.table.seats)) return null;
    return g;
  } catch {
    return null;
  }
}

// ── Game lifecycle ───────────────────────────────────────────────────────────

// Solo plays at your pace: no shared clock, so no deadline and no auto-fold.
function freezeClock(table) {
  if (table) table.actionDeadline = null;
  return table;
}

function ensureGame(code) {
  if (!isLocalCode(code)) throw new UthError("bad-code");
  let g = games.get(code);
  if (g) return g;
  g = restore(code);
  if (!g) {
    const { table } = newTable({
      code,
      host: { uid: LOCAL_UID, name: "You", photoURL: null },
      now: Date.now(),
    });
    g = { table: freezeClock(table), dealerDoc: null, myCards: null };
  }
  freezeClock(g.table);
  games.set(code, g);
  save(code);
  return g;
}

function notify(code) {
  const g = games.get(code);
  const subs = watchers.get(code);
  if (!g || !subs) return;
  // clone so render code can never mutate canonical state
  const table = structuredClone(g.table);
  const myCards = g.myCards ? structuredClone(g.myCards) : null;
  for (const cb of subs) {
    cb.onTable?.(table);
    cb.onMyCards?.(myCards);
  }
}

// ── Public interface (mirrors uth-api / table-store) ─────────────────────────

export function watchLocalTable(code, { onTable, onMyCards }) {
  ensureGame(code);
  let set = watchers.get(code);
  if (!set) watchers.set(code, (set = new Set()));
  const cb = { onTable, onMyCards };
  set.add(cb);
  queueMicrotask(() => set.has(cb) && notify(code));
  return () => set.delete(cb);
}

export async function localCall(code, action, payload = {}) {
  const g = ensureGame(code);
  const now = Date.now();
  const { table, dealerDoc } = g;

  switch (action) {
    case "join-table": // already seated by construction
      break;
    case "place-bets": {
      const out = placeBets(table, LOCAL_UID, {
        ante: payload.ante,
        trips: payload.trips || 0,
        holeCard: payload.holeCard || 0,
        badBeat: payload.badBeat || 0,
        jackpot: payload.jackpot ? 1 : 0,
      }, now);
      if (out.dealt) {
        g.dealerDoc = out.dealerDoc;
        g.myCards = { holeCards: out.privateWrites[LOCAL_UID], roundNo: out.table.roundNo };
      }
      break;
    }
    case "play-action":
      if (!dealerDoc) throw new UthError("bad-phase");
      playAction(table, dealerDoc, LOCAL_UID, String(payload.move), now);
      break;
    case "next-round":
      nextRound(table, LOCAL_UID, now);
      g.dealerDoc = null;
      break;
    case "rebuy":
      rebuy(table, LOCAL_UID, now);
      break;
    case "sit-out":
      sitOut(table, LOCAL_UID, !!payload.sittingOut, now);
      break;
    case "leave-table": // keep the bankroll — reopening SOLO resumes it
      break;
    case "reveal-cards": // nobody else at a solo table — nothing to show
      break;
    case "tick": // no shared clock in solo
      break;
    case "reset-session": {
      // Full wipe — chips, stats and deal — as if this SOLO code were opened fresh.
      const fresh = newTable({
        code,
        host: { uid: LOCAL_UID, name: "You", photoURL: null },
        now,
      });
      g.table = fresh.table;
      g.dealerDoc = null;
      g.myCards = null;
      break;
    }
    default:
      throw new UthError("bad-move");
  }

  freezeClock(g.table);
  save(code);
  notify(code);
  return { ok: true, code };
}

// First unused local code, for the "+ new solo table" tab.
export function nextLocalCode(openCodes) {
  return LOCAL_CODES.find((c) => !openCodes.includes(c)) || null;
}
