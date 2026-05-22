// action-extractor.js — Hand text → ordered array of structured events.
// Used by static-replay.js (Phase 5a) and animated replay (Phase 5b).
// Pure function, no DOM, no state.

const STREET_RE = /^\*\*\* (?:FIRST |SECOND )?(HOLE CARDS|FLOP|TURN|RIVER|SHOWDOWN|SUMMARY) \*\*\*/;
const BOARD_FLOP_RE = /^\*\*\* (?:FIRST )?FLOP \*\*\* \[([^\]]+)\]/;
const BOARD_TURN_RE = /^\*\*\* (?:FIRST )?TURN \*\*\* \[[^\]]+\] \[([^\]]+)\]/;
const BOARD_RIVER_RE = /^\*\*\* (?:FIRST )?RIVER \*\*\* \[[^\]]+\] \[([^\]]+)\]/;
const HEADER_RE = /^Poker Hand #([\w]+):\s*(.+?)\s+\(\$([0-9.]+)\/\$([0-9.]+)\)\s+-\s+(.+)$/;
const TABLE_RE = /^Table '(.+?)' (\d+)-max\s+Seat #(\d+) is the button/;
const SEAT_RE = /^Seat (\d+): (.+?) \(\$([0-9.]+) in chips\)/;
const POST_BLIND_RE = /^(.+?): posts (small blind|big blind|small & big blinds|ante) \$([0-9.]+)/;
const DEALT_HERO_RE = /^Dealt to Hero \[([^\]]+)\]/;
const ACTION_RE = /^(.+?): (folds|checks|calls|bets|raises)(?:\s+\$([0-9.]+))?(?:\s+to\s+\$([0-9.]+))?(?:\s+and is all-in)?/;
const UNCALLED_RE = /^Uncalled bet \(\$([0-9.]+)\) returned to (.+)$/;
const COLLECT_RE = /^(.+?) collected \$([0-9.]+) from(?:\s+(main|side) pot[\s-]*\d*)? *pot?/i;
const SHOWS_RE = /^(.+?): shows \[([^\]]+)\]/;
const MUCKS_RE = /^(.+?): mucks hand/;
const CASH_DROP_RE = /^Cash Drop to Pot : total \$([0-9.]+)/;

/**
 * Extract structured events from a single GGPoker hand's raw text.
 * @param {string} text  Raw text for ONE hand (between blank-line separators)
 * @returns {{
 *   meta: {handId, gameType, stake:{sb, bb}, date, tableName, maxSeats, buttonSeat},
 *   seats: Array<{seat, name, stack}>,
 *   events: Array<Object>,
 *   summary: {totalPot, rake, jackpot, cashDrop}
 * }}
 */
export function extractActions(text) {
  const lines = text.split(/\r?\n/);
  const meta = { handId: null, gameType: null, stake: { sb: 0, bb: 0 }, date: null, tableName: null, maxSeats: 9, buttonSeat: null };
  const seats = [];
  const events = [];
  const summary = { totalPot: 0, rake: 0, jackpot: 0, cashDrop: 0 };
  let phase = 'preamble';
  let board = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Header
    const headerMatch = HEADER_RE.exec(line);
    if (headerMatch && !meta.handId) {
      meta.handId = headerMatch[1];
      meta.gameType = headerMatch[2];
      meta.stake.sb = parseFloat(headerMatch[3]);
      meta.stake.bb = parseFloat(headerMatch[4]);
      meta.date = headerMatch[5];
      continue;
    }

    // Table line
    const tableMatch = TABLE_RE.exec(line);
    if (tableMatch) {
      meta.tableName = tableMatch[1];
      meta.maxSeats = parseInt(tableMatch[2], 10);
      meta.buttonSeat = parseInt(tableMatch[3], 10);
      continue;
    }

    // Seat assignment
    if (phase === 'preamble') {
      const seatMatch = SEAT_RE.exec(line);
      if (seatMatch) {
        seats.push({ seat: parseInt(seatMatch[1], 10), name: seatMatch[2], stack: parseFloat(seatMatch[3]) });
        continue;
      }
    }

    // Cash Drop
    const cashDropMatch = CASH_DROP_RE.exec(line);
    if (cashDropMatch) {
      summary.cashDrop += parseFloat(cashDropMatch[1]);
      events.push({ type: 'cash-drop', amount: parseFloat(cashDropMatch[1]) });
      continue;
    }

    // Street transitions
    const streetMatch = STREET_RE.exec(line);
    if (streetMatch) {
      const m = streetMatch[1];
      if (m === 'HOLE CARDS') { phase = 'preflop'; events.push({ type: 'street', name: 'preflop' }); }
      else if (m === 'FLOP') {
        phase = 'flop';
        const bm = BOARD_FLOP_RE.exec(line);
        const flopCards = bm ? bm[1].split(/\s+/) : [];
        board = [...flopCards];
        events.push({ type: 'street', name: 'flop', cards: flopCards, board: [...board] });
      } else if (m === 'TURN') {
        phase = 'turn';
        const bm = BOARD_TURN_RE.exec(line);
        const turnCard = bm ? bm[1] : null;
        if (turnCard) board.push(turnCard);
        events.push({ type: 'street', name: 'turn', card: turnCard, board: [...board] });
      } else if (m === 'RIVER') {
        phase = 'river';
        const bm = BOARD_RIVER_RE.exec(line);
        const riverCard = bm ? bm[1] : null;
        if (riverCard) board.push(riverCard);
        events.push({ type: 'street', name: 'river', card: riverCard, board: [...board] });
      } else if (m === 'SHOWDOWN') {
        phase = 'showdown';
        events.push({ type: 'street', name: 'showdown' });
      } else if (m === 'SUMMARY') {
        phase = 'summary';
      }
      continue;
    }

    // Hero dealt cards
    const dealtMatch = DEALT_HERO_RE.exec(line);
    if (dealtMatch) {
      events.push({ type: 'deal-hole', player: 'Hero', cards: dealtMatch[1].split(/\s+/) });
      continue;
    }

    // Blind posts
    const postMatch = POST_BLIND_RE.exec(line);
    if (postMatch) {
      events.push({ type: 'post-blind', player: postMatch[1], blind: postMatch[2], amount: parseFloat(postMatch[3]) });
      continue;
    }

    // Player actions
    const actionMatch = ACTION_RE.exec(line);
    if (actionMatch) {
      const verb = actionMatch[2];
      const evt = { type: 'action', player: actionMatch[1], verb, allIn: /and is all-in/.test(line) };
      if (verb === 'bets' || verb === 'calls') evt.amount = parseFloat(actionMatch[3]);
      else if (verb === 'raises') {
        evt.raiseBy = parseFloat(actionMatch[3]);
        evt.to = parseFloat(actionMatch[4]);
      }
      events.push(evt);
      continue;
    }

    // Uncalled bet returned
    const uncalledMatch = UNCALLED_RE.exec(line);
    if (uncalledMatch) {
      events.push({ type: 'uncalled', player: uncalledMatch[2], amount: parseFloat(uncalledMatch[1]) });
      continue;
    }

    // Collect from pot
    const collectMatch = COLLECT_RE.exec(line);
    if (collectMatch && phase !== 'summary') {
      events.push({ type: 'collect', player: collectMatch[1], amount: parseFloat(collectMatch[2]), pot: collectMatch[3] || 'main' });
      continue;
    }

    // Shows
    const showsMatch = SHOWS_RE.exec(line);
    if (showsMatch) {
      events.push({ type: 'shows', player: showsMatch[1], cards: showsMatch[2].split(/\s+/) });
      continue;
    }

    // Mucks
    const mucksMatch = MUCKS_RE.exec(line);
    if (mucksMatch) {
      events.push({ type: 'mucks', player: mucksMatch[1] });
      continue;
    }

    // Summary line — parse Total pot + Rake + Jackpot
    if (phase === 'summary') {
      const sumMatch = /^Total pot \$([0-9.]+).+?Rake \$([0-9.]+)(?:.+?Jackpot \$([0-9.]+))?/.exec(line);
      if (sumMatch) {
        summary.totalPot = parseFloat(sumMatch[1]);
        summary.rake = parseFloat(sumMatch[2]);
        summary.jackpot = sumMatch[3] ? parseFloat(sumMatch[3]) : 0;
      }
    }
  }

  return { meta, seats, events, summary };
}
