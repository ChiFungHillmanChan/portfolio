// logic.js — Ultimate Texas Hold'em table state machine (pure).
//
// ⚠️ SYNC REQUIREMENT: copy of system-architecture/lambda/uth/logic.mjs,
// identical except this header and the engine import extension (.mjs → .js).
// It drives the LOCAL solo mode — online tables still only trust the Lambda.
// If you edit the Lambda file, re-copy it here and re-sync public/games/casino-game/.
//
// Environment-agnostic: no node imports (WebCrypto exists in Node 19+ and
// browsers), safe as a browser ES module.
//
// Every function takes plain objects and returns new/mutated plain objects —
// no Firestore, no clocks, no ambient randomness. index.mjs wraps these in
// Firestore transactions; tests drive them with injected `now` and `rng`.
//
// Return shape: { table, dealerDoc?, privateWrites?, dealt?, changed? }
//   table        — the (mutated) public table object, or null → delete table
//   dealerDoc    — contents of uthTables/{code}/private/_dealer (null → delete)
//   privateWrites— { [uid]: [c, c] } hole cards to write to private/{uid}
//
// Timing model: `actionDeadline` (ms epoch) is written on each phase change;
// clients call the `tick` action after it passes. Auto-actions: betting →
// sit out, preflop/flop → check, river → fold, showdown → next round.

import { evaluate7, settleSeat, CAT } from "./engine.js";

export const PHASE = {
  BETTING: "betting",
  PREFLOP: "preflop",
  FLOP: "flop",
  RIVER: "river",
  SHOWDOWN: "showdown",
};

export const MAX_SEATS = 6;
export const BUY_IN = 10000;
export const MIN_ANTE = 25;
export const MAX_ANTE = 1000;
export const CHIP_STEP = 25;
export const DECISION_MS = 30000;
export const SHOWDOWN_MS = 10000;
// consecutive timeouts before a seat is parked sitting-out at round reset
export const TIMEOUT_LIMIT = 2;

export class UthError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const defaultRng = () => {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] / 4294967296;
};

const DECISION_PHASES = new Set([PHASE.PREFLOP, PHASE.FLOP, PHASE.RIVER]);

// ── Construction ─────────────────────────────────────────────────────────────

function newSeat(user, seatIndex) {
  return {
    uid: user.uid,
    seatIndex,
    name: user.name || "Player",
    photoURL: user.photoURL || null,
    stack: BUY_IN,
    sittingOut: false,
    ready: false,
    inHand: false,
    bets: { ante: 0, blind: 0, trips: 0, holeCard: 0, badBeat: 0 },
    playBet: 0,
    playStage: null,
    folded: false,
    acted: false,
    timeoutsInARow: 0,
    holeCards: null,
    result: null,
  };
}

export function newTable({ code, host, now }) {
  const table = {
    code,
    status: "open",
    hostUid: host.uid,
    createdAt: now,
    lastActivityAt: now,
    roundNo: 1,
    buyIn: BUY_IN,
    minAnte: MIN_ANTE,
    maxAnte: MAX_ANTE,
    phase: PHASE.BETTING,
    actionDeadline: null,
    seatUids: [host.uid],
    seats: [newSeat(host, 0)],
    community: [],
    dealer: { holeCards: null, name: null, qualifies: null },
  };
  return { table };
}

// ── Seat management ──────────────────────────────────────────────────────────

function findSeat(table, uid) {
  return table.seats.find((s) => s.uid === uid);
}

export function joinTable(table, user, now) {
  if (table.status !== "open") throw new UthError("table-closed");
  if (findSeat(table, user.uid)) throw new UthError("already-seated");
  if (table.seats.length >= MAX_SEATS) throw new UthError("table-full");
  const taken = new Set(table.seats.map((s) => s.seatIndex));
  let idx = 0;
  while (taken.has(idx)) idx++;
  table.seats.push(newSeat(user, idx));
  table.seatUids.push(user.uid);
  // give the newcomer a fair betting window
  if (table.phase === PHASE.BETTING && table.actionDeadline !== null) {
    table.actionDeadline = Math.max(table.actionDeadline, now + DECISION_MS);
  }
  table.lastActivityAt = now;
  return { table };
}

export function leaveTable(table, uid, now, dealerDoc = null) {
  const seat = findSeat(table, uid);
  if (!seat) throw new UthError("not-seated");
  table.seats = table.seats.filter((s) => s.uid !== uid);
  table.seatUids = table.seatUids.filter((u) => u !== uid);
  table.lastActivityAt = now;
  if (table.seats.length === 0) {
    return { table: null, dealerDoc: null };
  }
  if (table.hostUid === uid) table.hostUid = table.seats[0].uid;
  // a leaver's staked chips are simply gone (already deducted at deal);
  // their absence may complete the current street
  if (DECISION_PHASES.has(table.phase) && dealerDoc) {
    advanceWhileSettled(table, dealerDoc, now);
  }
  return { table, dealerDoc };
}

export function sitOut(table, uid, flag, now, rng = defaultRng) {
  const seat = findSeat(table, uid);
  if (!seat) throw new UthError("not-seated");
  seat.sittingOut = !!flag;
  if (flag) seat.ready = false;
  table.lastActivityAt = now;
  if (table.phase === PHASE.BETTING) return maybeDeal(table, now, rng);
  return { table };
}

export function rebuy(table, uid, now) {
  const seat = findSeat(table, uid);
  if (!seat) throw new UthError("not-seated");
  if (table.phase !== PHASE.BETTING || seat.inHand) throw new UthError("cannot-rebuy");
  if (seat.stack >= table.minAnte * 2) throw new UthError("cannot-rebuy");
  seat.stack = table.buyIn;
  seat.sittingOut = false;
  seat.timeoutsInARow = 0;
  table.lastActivityAt = now;
  return { table };
}

// ── Betting & dealing ────────────────────────────────────────────────────────

function validAmount(n, max) {
  return Number.isInteger(n) && n >= 0 && n <= max && n % CHIP_STEP === 0;
}

export function placeBets(table, uid, bets, now, rng = defaultRng) {
  if (table.phase !== PHASE.BETTING) throw new UthError("bad-phase");
  const seat = findSeat(table, uid);
  if (!seat) throw new UthError("not-seated");

  const ante = bets.ante;
  const trips = bets.trips || 0;
  const holeCard = bets.holeCard || 0;
  const badBeat = bets.badBeat || 0;
  if (!Number.isInteger(ante) || ante < table.minAnte || ante > table.maxAnte || ante % CHIP_STEP !== 0) {
    throw new UthError("bad-bet");
  }
  // side bets: 0..ante each, chip-step multiples
  for (const side of [trips, holeCard, badBeat]) {
    if (!validAmount(side, ante)) throw new UthError("bad-bet");
  }
  const total = ante * 2 + trips + holeCard + badBeat;
  if (total > seat.stack) throw new UthError("insufficient-stack");

  seat.bets = { ante, blind: ante, trips, holeCard, badBeat };
  seat.ready = true;
  seat.sittingOut = false;
  seat.timeoutsInARow = 0;
  table.lastActivityAt = now;

  // first ready seat opens the betting window for everyone else
  if (table.actionDeadline === null) table.actionDeadline = now + DECISION_MS;

  return maybeDeal(table, now, rng);
}

function shuffledDeck(rng) {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Deals when every non-sitting-out seat is ready. Returns {table} or the full
// deal payload {table, dealerDoc, privateWrites, dealt: true}.
function maybeDeal(table, now, rng) {
  const active = table.seats.filter((s) => !s.sittingOut);
  if (active.length === 0 || !active.every((s) => s.ready)) return { table };

  const deck = shuffledDeck(rng);
  let top = 0;
  const privateWrites = {};
  const holes = {};
  for (const seat of active) {
    const hole = [deck[top++], deck[top++]];
    privateWrites[seat.uid] = hole;
    holes[seat.uid] = hole;
    const { ante, blind, trips, holeCard, badBeat } = seat.bets;
    seat.stack -= ante + blind + trips + holeCard + badBeat;
    seat.inHand = true;
    seat.folded = false;
    seat.acted = false;
    seat.playBet = 0;
    seat.playStage = null;
    seat.holeCards = null;
    seat.result = null;
    seat.ready = false;
  }
  for (const seat of table.seats) {
    if (seat.sittingOut) seat.inHand = false;
  }
  const dealerHole = [deck[top++], deck[top++]];
  const community5 = [deck[top++], deck[top++], deck[top++], deck[top++], deck[top++]];

  table.phase = PHASE.PREFLOP;
  table.actionDeadline = now + DECISION_MS;
  table.community = [];
  table.dealer = { holeCards: null, name: null, qualifies: null };
  table.lastActivityAt = now;

  return { table, dealerDoc: { dealerHole, community5, holes }, privateWrites, dealt: true };
}

// ── Decisions ────────────────────────────────────────────────────────────────

const MOVES = {
  [PHASE.PREFLOP]: { check: 0, "4x": 4, "3x": 3 },
  [PHASE.FLOP]: { check: 0, "2x": 2 },
  [PHASE.RIVER]: { "1x": 1, fold: -1 },
};

// A seat still owes a decision on the current street?
function pendingSeat(seat, phase) {
  if (!seat.inHand || seat.folded || seat.acted) return false;
  if (phase !== PHASE.PREFLOP && seat.playBet > 0) return false; // already raised
  return true;
}

export function playAction(table, dealerDoc, uid, move, now) {
  if (!DECISION_PHASES.has(table.phase)) throw new UthError("bad-phase");
  const seat = findSeat(table, uid);
  if (!seat) throw new UthError("not-seated");
  if (!pendingSeat(seat, table.phase)) throw new UthError("bad-move");

  const mult = MOVES[table.phase][move];
  if (mult === undefined) throw new UthError("bad-move");

  if (mult > 0) {
    const amount = seat.bets.ante * mult;
    if (amount > seat.stack) throw new UthError("insufficient-stack");
    seat.stack -= amount;
    seat.playBet = amount;
    seat.playStage = table.phase;
  } else if (mult === -1) {
    seat.folded = true;
  }
  seat.acted = true;
  seat.timeoutsInARow = 0;
  table.lastActivityAt = now;

  advanceWhileSettled(table, dealerDoc, now);
  return { table, dealerDoc };
}

// Advance streets while nobody owes a decision (e.g. everyone raised preflop
// → flop and river reveal back-to-back into showdown).
function advanceWhileSettled(table, dealerDoc, now) {
  while (
    DECISION_PHASES.has(table.phase) &&
    !table.seats.some((s) => pendingSeat(s, table.phase))
  ) {
    if (table.phase === PHASE.PREFLOP) {
      table.phase = PHASE.FLOP;
      table.community = dealerDoc.community5.slice(0, 3);
    } else if (table.phase === PHASE.FLOP) {
      table.phase = PHASE.RIVER;
      table.community = dealerDoc.community5.slice(0, 5);
    } else {
      showdown(table, dealerDoc, now);
      return;
    }
    for (const s of table.seats) if (s.inHand) s.acted = false;
    table.actionDeadline = now + DECISION_MS;
  }
}

function showdown(table, dealerDoc, now) {
  const { dealerHole, community5, holes } = dealerDoc;
  const dealerEval = evaluate7([...dealerHole, ...community5]);

  for (const seat of table.seats) {
    if (!seat.inHand) continue;
    const hole = holes[seat.uid];
    const playerEval = evaluate7([...hole, ...community5]);
    const result = settleSeat(seat, playerEval, dealerEval, hole, dealerHole);
    const { ante, blind, trips, holeCard, badBeat } = seat.bets;
    const staked = ante + blind + trips + holeCard + badBeat + seat.playBet;
    seat.stack += staked + result.net;
    seat.result = { ...result, hand: seat.folded ? null : playerEval.name };
    seat.holeCards = seat.folded ? null : hole;
  }

  table.community = community5.slice(0, 5);
  table.dealer = {
    holeCards: dealerHole,
    name: dealerEval.name,
    qualifies: dealerEval.cat >= CAT.PAIR,
  };
  table.phase = PHASE.SHOWDOWN;
  table.actionDeadline = now + SHOWDOWN_MS;
  table.lastActivityAt = now;
}

// ── Tick (timeout driver) ────────────────────────────────────────────────────

export function tick(table, dealerDoc, now, rng = defaultRng) {
  if (table.actionDeadline === null || now < table.actionDeadline) {
    return { table, dealerDoc, changed: false };
  }
  table.lastActivityAt = now;

  if (table.phase === PHASE.BETTING) {
    for (const seat of table.seats) {
      if (!seat.sittingOut && !seat.ready) {
        seat.sittingOut = true;
        seat.timeoutsInARow += 1;
      }
    }
    const dealt = maybeDeal(table, now, rng);
    if (dealt.dealt) return { ...dealt, changed: true };
    table.actionDeadline = null; // idle — wait for the next ready player
    return { table, dealerDoc, changed: true };
  }

  if (DECISION_PHASES.has(table.phase)) {
    for (const seat of table.seats) {
      if (pendingSeat(seat, table.phase)) {
        if (table.phase === PHASE.RIVER) seat.folded = true;
        seat.acted = true;
        seat.timeoutsInARow += 1;
      }
    }
    advanceWhileSettled(table, dealerDoc, now);
    return { table, dealerDoc, changed: true };
  }

  // SHOWDOWN → reset for the next round
  resetRound(table);
  return { table, dealerDoc: null, changed: true };
}

function resetRound(table) {
  table.roundNo += 1;
  table.phase = PHASE.BETTING;
  table.actionDeadline = null;
  table.community = [];
  table.dealer = { holeCards: null, name: null, qualifies: null };
  for (const seat of table.seats) {
    seat.bets = { ante: 0, blind: 0, trips: 0, holeCard: 0, badBeat: 0 };
    seat.ready = false;
    seat.inHand = false;
    seat.playBet = 0;
    seat.playStage = null;
    seat.folded = false;
    seat.acted = false;
    seat.holeCards = null;
    seat.result = null;
    if (seat.timeoutsInARow >= TIMEOUT_LIMIT) seat.sittingOut = true;
    if (seat.stack < table.minAnte * 2) seat.sittingOut = true; // must rebuy
  }
}

// Solo quality-of-life: the lone active player can skip the 10 s showdown
// display and start the next hand immediately. With other active players at
// the table the shared timer stays authoritative.
export function nextRound(table, uid, now) {
  const seat = findSeat(table, uid);
  if (!seat) throw new UthError("not-seated");
  if (table.phase !== PHASE.SHOWDOWN) throw new UthError("bad-phase");
  const active = table.seats.filter((s) => !s.sittingOut);
  if (active.length > 1) throw new UthError("not-solo");
  resetRound(table);
  table.lastActivityAt = now;
  return { table, dealerDoc: null };
}
