// state-engine.js — Pure fold of replay actions into a sequence of snapshots.
//
// Input:  the { meta, seats, events, summary } object produced by action-extractor.js.
// Output: an array `snapshots` where snapshots[i] is the table state AFTER event i.
//         snapshots[0] is the pre-deal initial state.
//
// All amounts are plain JS numbers (dollars) for ease of rendering. The
// underlying replay text is the source of truth and rounding loss here is at
// most ~1 cent per step — acceptable for visualization (not for accounting).

const INITIAL_STREET = "preflop";

function clonePlayers(players) {
  const out = {};
  for (const [k, v] of Object.entries(players)) out[k] = { ...v };
  return out;
}

function cloneSnap(s) {
  return {
    street: s.street,
    board: [...s.board],
    pot: s.pot,
    sidePotInfo: s.sidePotInfo, // optional string for SUMMARY-style highlight
    toAct: s.toAct,
    players: clonePlayers(s.players),
    lastEventIndex: s.lastEventIndex,
    eventDescription: s.eventDescription,
    showdownReveal: s.showdownReveal,
  };
}

function makeInitialSnapshot({ meta, seats }) {
  const players = {};
  for (const s of seats) {
    players[s.name] = {
      seat: s.seat,
      name: s.name,
      isHero: s.name === "Hero",
      isButton: s.seat === meta.buttonSeat,
      stack: s.stack,
      committedStreet: 0,
      committedTotal: 0,
      cards: null,
      folded: false,
      allIn: false,
      lastAction: null,
      revealed: false,
      collectedThisHand: 0,
    };
  }
  return {
    street: INITIAL_STREET,
    board: [],
    pot: 0,
    sidePotInfo: null,
    toAct: null,
    players,
    lastEventIndex: -1,
    eventDescription: "Hand starting…",
    showdownReveal: false,
  };
}

function resetStreetCommitments(players) {
  for (const p of Object.values(players)) {
    p.committedStreet = 0;
  }
}

/**
 * Apply a single event to a snapshot and return the next snapshot.
 * Pure: never mutates `prev`.
 */
function step(prev, ev, idx) {
  const s = cloneSnap(prev);
  s.lastEventIndex = idx;
  s.eventDescription = "";

  switch (ev.type) {
    case "cash-drop":
      s.pot += ev.amount;
      s.eventDescription = `Cash Drop +$${ev.amount.toFixed(2)}`;
      break;

    case "post-blind": {
      const p = s.players[ev.player];
      if (!p) break;
      const amount = ev.amount;
      p.stack -= amount;
      p.committedStreet += amount;
      p.committedTotal += amount;
      p.lastAction = `posts ${ev.blind}`;
      if (p.stack <= 0.0001) {
        p.stack = 0;
        p.allIn = true;
      }
      s.pot += amount;
      s.eventDescription = `${ev.player} posts ${ev.blind} $${amount.toFixed(2)}`;
      break;
    }

    case "deal-hole": {
      const p = s.players[ev.player];
      if (p) {
        p.cards = [...ev.cards];
      }
      s.eventDescription = `${ev.player} is dealt cards`;
      break;
    }

    case "street": {
      // Move into new street — reset per-street counters.
      resetStreetCommitments(s.players);
      for (const p of Object.values(s.players)) p.lastAction = null;
      s.street = ev.name;
      if (ev.name === "flop" && ev.cards) {
        s.board = [...ev.cards];
        s.eventDescription = `Flop`;
      } else if ((ev.name === "turn" || ev.name === "river") && ev.card) {
        s.board = [...(ev.board || s.board)];
        if (!s.board.includes(ev.card)) s.board.push(ev.card);
        s.eventDescription = ev.name === "turn" ? "Turn" : "River";
      } else if (ev.name === "showdown") {
        s.showdownReveal = true;
        s.eventDescription = "Showdown";
      } else if (ev.name === "preflop") {
        s.eventDescription = "Preflop";
      } else {
        s.eventDescription = ev.name;
      }
      break;
    }

    case "action": {
      const p = s.players[ev.player];
      if (!p) break;
      let amountAdded = 0;
      if (ev.verb === "folds") {
        p.folded = true;
        p.lastAction = "folds";
        s.eventDescription = `${ev.player} folds`;
      } else if (ev.verb === "checks") {
        p.lastAction = "checks";
        s.eventDescription = `${ev.player} checks`;
      } else if (ev.verb === "calls") {
        const amount = ev.amount || 0;
        amountAdded = amount;
        p.committedStreet += amount;
        p.committedTotal += amount;
        p.stack -= amount;
        p.lastAction = `calls $${amount.toFixed(2)}`;
        s.eventDescription = `${ev.player} calls $${amount.toFixed(2)}`;
      } else if (ev.verb === "bets") {
        const amount = ev.amount || 0;
        amountAdded = amount;
        p.committedStreet += amount;
        p.committedTotal += amount;
        p.stack -= amount;
        p.lastAction = `bets $${amount.toFixed(2)}`;
        s.eventDescription = `${ev.player} bets $${amount.toFixed(2)}`;
      } else if (ev.verb === "raises") {
        const to = ev.to || 0;
        const raiseBy = ev.raiseBy || 0;
        const delta = Math.max(0, to - p.committedStreet);
        amountAdded = delta;
        p.committedStreet = to;
        p.committedTotal += delta;
        p.stack -= delta;
        p.lastAction = `raises to $${to.toFixed(2)}`;
        s.eventDescription = `${ev.player} raises $${raiseBy.toFixed(2)} to $${to.toFixed(2)}`;
      }
      if (ev.allIn) {
        p.allIn = true;
        p.lastAction += " (all-in)";
        s.eventDescription += " ★ ALL-IN";
      }
      if (p.stack < 0.001) {
        p.stack = 0;
        p.allIn = true;
      }
      if (amountAdded > 0) s.pot += amountAdded;
      break;
    }

    case "uncalled": {
      const p = s.players[ev.player];
      if (!p) break;
      const amount = ev.amount;
      p.stack += amount;
      p.committedStreet = Math.max(0, p.committedStreet - amount);
      p.committedTotal = Math.max(0, p.committedTotal - amount);
      s.pot = Math.max(0, s.pot - amount);
      s.eventDescription = `Uncalled $${amount.toFixed(2)} returned to ${ev.player}`;
      break;
    }

    case "shows": {
      const p = s.players[ev.player];
      if (p) {
        p.cards = [...ev.cards];
        p.revealed = true;
      }
      s.eventDescription = `${ev.player} shows`;
      break;
    }

    case "mucks": {
      const p = s.players[ev.player];
      if (p) p.lastAction = "mucks";
      s.eventDescription = `${ev.player} mucks`;
      break;
    }

    case "collect": {
      const p = s.players[ev.player];
      if (!p) break;
      const amount = ev.amount;
      p.stack += amount;
      p.collectedThisHand += amount;
      p.lastAction = `wins $${amount.toFixed(2)}${ev.pot === "main" ? "" : ` (${ev.pot} pot)`}`;
      s.pot = Math.max(0, s.pot - amount);
      s.eventDescription = `${ev.player} collects $${amount.toFixed(2)}${ev.pot === "main" ? "" : ` (${ev.pot} pot)`}`;
      break;
    }

    default:
      // Unknown event — keep state unchanged but record the type for debugging
      s.eventDescription = `(${ev.type})`;
  }

  return s;
}

/**
 * Build the full snapshot sequence for a hand.
 *
 * @param {{meta:Object, seats:Array, events:Array, summary:Object}} extracted
 *   Output of action-extractor.extractActions().
 * @returns {{snapshots:Array, meta:Object, summary:Object}}
 *   snapshots[0] = initial pre-deal state; snapshots[i+1] = state after events[i].
 */
export function buildSnapshots(extracted) {
  const { meta, seats, events, summary } = extracted;
  const snapshots = [makeInitialSnapshot({ meta, seats })];
  let cur = snapshots[0];
  for (let i = 0; i < events.length; i++) {
    cur = step(cur, events[i], i);
    snapshots.push(cur);
  }
  return { snapshots, meta, summary };
}
