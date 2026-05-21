// js/parser/gg-parser.mjs
// GGPoker hand history parser — strict calculation rules

import { newHand } from './hand-model.mjs';
import { validateFile } from './validator.mjs';
import { dollarsToUC } from '../stats/money.mjs';

// ─── Splitter ──────────────────────────────────────────────────────────────────

const HAND_START_RE = /^Poker Hand #(?:RC|HD|SD|TM)\d+:/;

/**
 * Split a raw file string into individual hand blocks.
 * @param {string} content
 * @returns {string[]}
 */
export function splitIntoHands(content) {
  // Normalise line endings
  const normalised = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalised.split('\n');

  const chunks = [];
  let current = [];

  for (const line of lines) {
    if (HAND_START_RE.test(line)) {
      if (current.length > 0) {
        const text = current.join('\n').trimEnd();
        if (text) chunks.push(text);
      }
      current = [line];
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) {
    const text = current.join('\n').trimEnd();
    if (text) chunks.push(text);
  }

  return chunks;
}

// ─── Header parsing ────────────────────────────────────────────────────────────

// Poker Hand #RC4529039613: Hold'em No Limit ($0.01/$0.02) - 2026/05/21 03:18:50
const HEADER_RE =
  /^Poker Hand #((RC|HD|SD|TM)\d+): .+\(\$([^/]+)\/\$([^)]+)\) - (\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})/;

function parseHeader(line) {
  const m = HEADER_RE.exec(line);
  if (!m) return null;
  // Groups: [0]=full, [1]=full id (e.g. RC1000001), [2]=prefix, [3]=sb, [4]=bb, [5]=yr, [6]=mo, [7]=dy, [8]=hh, [9]=mm, [10]=ss
  const [, id, , sb, bb, yr, mo, dy, hh, mm, ss] = m;
  return {
    id,
    stake: { sbUC: dollarsToUC(sb), bbUC: dollarsToUC(bb) },
    date: `${yr}-${mo}-${dy}T${hh}:${mm}:${ss}Z`,
  };
}

// ─── Seat + button parsing ─────────────────────────────────────────────────────

// Table 'RushAndCash32413741' 6-max Seat #1 is the button
const BUTTON_RE = /Seat #(\d+) is the button/;

// Seat 5: Hero ($2.15 in chips)
const SEAT_RE = /^Seat (\d+): (.+?) \(/;

/**
 * Returns { heroSeat, buttonSeat, seats: [{seat, name}] }
 */
function parseSeatsSection(lines) {
  let heroSeat = -1;
  let buttonSeat = -1;
  const seats = [];

  for (const line of lines) {
    const bm = BUTTON_RE.exec(line);
    if (bm) {
      buttonSeat = parseInt(bm[1], 10);
      continue;
    }
    const sm = SEAT_RE.exec(line);
    if (sm) {
      const seat = parseInt(sm[1], 10);
      const name = sm[2].trim();
      seats.push({ seat, name });
      if (name === 'Hero') heroSeat = seat;
    }
  }

  return { heroSeat, buttonSeat, seats };
}

/**
 * Determine Hero's position from:
 *  - which player posts SB vs BB
 *  - Hero's seat relative to the button
 *  - number of players
 */
function determinePosition(heroSeat, buttonSeat, seats, actionLines) {
  // Find who posts SB and BB from action lines
  let sbSeat = -1;
  let bbSeat = -1;

  const seatByName = {};
  for (const s of seats) seatByName[s.name] = s.seat;

  for (const line of actionLines) {
    const sbM = /^(.+): posts small blind /.exec(line);
    if (sbM) { sbSeat = seatByName[sbM[1].trim()] ?? -1; continue; }
    const bbM = /^(.+): posts big blind /.exec(line);
    if (bbM) { bbSeat = seatByName[bbM[1].trim()] ?? -1; continue; }
  }

  if (heroSeat === bbSeat) return 'BB';
  if (heroSeat === sbSeat) return 'SB';
  if (heroSeat === buttonSeat) return 'BTN';

  // For multi-way: determine CO, HJ, UTG etc. based on seat order from button
  // Seat order clockwise: seats after button first, then wrap
  const seatNumbers = seats.map(s => s.seat).sort((a, b) => a - b);
  const totalSeats = seatNumbers.length;

  // Determine position by distance from button (going clockwise)
  // BTN = button seat, SB = button+1, BB = button+2
  // UTG = BB+1, then HJ, CO...
  const getNext = (seat) => {
    const idx = seatNumbers.indexOf(seat);
    return seatNumbers[(idx + 1) % totalSeats];
  };

  // Build order starting from seat after button (= SB)
  const order = [];
  let cur = getNext(buttonSeat);
  for (let i = 0; i < totalSeats; i++) {
    order.push(cur);
    cur = getNext(cur);
  }
  // order[0]=SB, order[1]=BB, order[2]=UTG (or UTG+1...), order[last-1]=CO, order[last]=BTN
  // Note: buttonSeat == order[totalSeats-1] should hold

  const heroIdx = order.indexOf(heroSeat);
  const remainingAfterBlinds = totalSeats - 2; // positions after BB

  if (heroIdx === 0) return 'SB';
  if (heroIdx === 1) return 'BB';

  // After BB, positions from button counting back:
  // totalSeats-1 = BTN, totalSeats-2 = CO, totalSeats-3 = HJ, etc.
  const posFromBtn = totalSeats - 1 - heroIdx; // 0=BTN, 1=CO, 2=HJ, ...
  if (posFromBtn === 0) return 'BTN';
  if (posFromBtn === 1) return 'CO';
  if (posFromBtn === 2) return 'HJ';
  if (posFromBtn === 3) return 'LJ';
  if (remainingAfterBlinds <= 2) return 'UTG'; // short-handed
  if (heroIdx === 2) {
    if (totalSeats <= 4) return 'UTG';
    return 'UTG';
  }
  return 'UTG';
}

// ─── Card parsing ──────────────────────────────────────────────────────────────

const DEALT_TO_HERO_RE = /^Dealt to Hero \[([^\]]+)\]/;
const CARD_SPLIT_RE = /\s+/;

function parseCards(cardStr) {
  return cardStr.trim().split(CARD_SPLIT_RE).filter(Boolean);
}

// ─── Action loop ───────────────────────────────────────────────────────────────

const STREETS = ['preflop', 'flop', 'turn', 'river'];

// Matches: *** FLOP *** [Kc 7d 2c]  or  *** TURN *** [Kc 7d 2c] [3h]  etc.
const STREET_RE = /^\*\*\* (HOLE CARDS|FLOP|TURN|RIVER|SHOWDOWN|SUMMARY) \*\*\*/;
const BOARD_FLOP_RE = /^\*\*\* FLOP \*\*\* \[([^\]]+)\]/;
const BOARD_TURN_RE = /^\*\*\* TURN \*\*\* \[[^\]]+\] \[([^\]]+)\]/;
const BOARD_RIVER_RE = /^\*\*\* RIVER \*\*\* \[[^\]]+\] \[([^\]]+)\]/;

// Action regexes for Hero
const HERO_POSTS_SB_RE = /^Hero: posts small blind \$([0-9.]+)/;
const HERO_POSTS_BB_RE = /^Hero: posts big blind \$([0-9.]+)/;
const HERO_CALLS_RE = /^Hero: calls \$([0-9.]+)/;
const HERO_BETS_RE = /^Hero: bets \$([0-9.]+)/;
const HERO_RAISES_RE = /^Hero: raises \$[0-9.]+ to \$([0-9.]+)/;
const HERO_ALLIN_RE = /^Hero:.*and is all-in/;

// Collection lines
const HERO_COLLECTED_RE = /^Hero collected \$([0-9.]+) from (pot|side pot|main pot|pot \d+)/;
const UNCALLED_HERO_RE = /^Uncalled bet \(\$([0-9.]+)\) returned to Hero/;

// Showdown action section: "Name: shows [cards]" (before *** SHOWDOWN ***)
const PLAYER_SHOWS_RE = /^(.+?): shows \[([^\]]+)\]/;
const HERO_SHOWS_INLINE_RE = /^Hero: shows \[([^\]]+)\]/;

// Summary parsing
const TOTAL_POT_RE = /^Total pot \$([0-9.]+) \| Rake \$([0-9.]+)/;
const HERO_SUMMARY_RE = /^Seat \d+: Hero(?:\s+\([^)]+\))*\s+(showed|mucked|folded|collected|won)/;
// More flexible hero summary to capture cards if shown
const HERO_SUMMARY_SHOWED_RE = /^Seat \d+: Hero(?:\s+\([^)]+\))*\s+showed \[([^\]]+)\]/;
const VILLAIN_SUMMARY_SHOWED_RE = /^Seat \d+: (.+?)(?:\s+\([^)]+\))*\s+showed \[([^\]]+)\]/;

/**
 * Parse a single hand block (raw text) into a Hand object.
 * @param {string} text
 * @returns {import('./hand-model.mjs').Hand}
 */
export function parseHand(text) {
  // Normalise line endings
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = raw.split('\n');

  const hand = newHand();

  // ── Header (line 0) ──
  const headerData = parseHeader(lines[0]);
  if (!headerData) throw new Error(`Bad header: ${lines[0]}`);
  hand.id = headerData.id;
  hand.stake = headerData.stake;
  hand.date = headerData.date;

  // ── Phase tracking ──
  let phase = 'preamble'; // preamble → preflop → flop → turn → river → showdown → summary
  let heroStreetCommitted = 0n;

  // Seats and board
  const boardCards = [];
  let heroCards = null;
  let heroSeat = -1;
  let buttonSeat = -1;
  const seats = [];
  const seatByName = {};

  // For showdown card extraction (from action section, before *** SHOWDOWN ***)
  const playerCardsShown = {}; // name → cards[]

  // ── Main parse loop ──
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ── Seat table (preamble) ──
    if (phase === 'preamble') {
      const bm = BUTTON_RE.exec(line);
      if (bm) { buttonSeat = parseInt(bm[1], 10); continue; }

      const sm = SEAT_RE.exec(line);
      if (sm) {
        const seat = parseInt(sm[1], 10);
        const name = sm[2].trim();
        seats.push({ seat, name });
        seatByName[name] = seat;
        if (name === 'Hero') heroSeat = seat;
        continue;
      }
    }

    // ── Street transitions ──
    const streetM = STREET_RE.exec(line);
    if (streetM) {
      const marker = streetM[1];
      if (marker === 'HOLE CARDS') {
        phase = 'preflop';
        // Do NOT reset heroStreetCommitted here — blind posts are pre-flop commitments.
        // A raise to $Y means "total street commitment = $Y", so extra = $Y - blind_amount.
        continue;
      }
      if (marker === 'FLOP') {
        phase = 'flop';
        heroStreetCommitted = 0n;
        const m = BOARD_FLOP_RE.exec(line);
        if (m) boardCards.push(...parseCards(m[1]));
        continue;
      }
      if (marker === 'TURN') {
        phase = 'turn';
        heroStreetCommitted = 0n;
        const m = BOARD_TURN_RE.exec(line);
        if (m) boardCards.push(...parseCards(m[1]));
        continue;
      }
      if (marker === 'RIVER') {
        phase = 'river';
        heroStreetCommitted = 0n;
        const m = BOARD_RIVER_RE.exec(line);
        if (m) boardCards.push(...parseCards(m[1]));
        continue;
      }
      if (marker === 'SHOWDOWN') {
        phase = 'showdown';
        continue;
      }
      if (marker === 'SUMMARY') {
        phase = 'summary';
        continue;
      }
    }

    // ── SUMMARY section ──
    if (phase === 'summary') {
      // Total pot + rake
      const potM = TOTAL_POT_RE.exec(line);
      if (potM) {
        hand.totalPotUC = dollarsToUC(potM[1]);
        hand.rakeUC = dollarsToUC(potM[2]);
        continue;
      }

      // Hero summary line for showdown detection
      // e.g. "Seat 2: Hero (big blind) showed [As Ks] and won..."
      // e.g. "Seat 2: Hero (big blind) collected ($0.02)"
      // e.g. "Seat 2: Hero (button) (small blind) showed ..."  ← heads-up double label
      const heroSumM = HERO_SUMMARY_RE.exec(line);
      if (heroSumM) {
        const verb = heroSumM[1];
        hand.reachedShowdown = (verb === 'showed' || verb === 'mucked');

        // Extract shown cards from summary line if showed
        if (verb === 'showed') {
          const shownM = HERO_SUMMARY_SHOWED_RE.exec(line);
          if (shownM) playerCardsShown['Hero'] = parseCards(shownM[1]);
        }
        continue;
      }

      // Villain showed in summary (for showdown.villains)
      // e.g. "Seat 2: Villain1 (big blind) showed [Qh Qd] and lost..."
      const villainSumM = VILLAIN_SUMMARY_SHOWED_RE.exec(line);
      if (villainSumM) {
        const name = villainSumM[1].trim();
        if (name !== 'Hero') {
          playerCardsShown[name] = playerCardsShown[name] || parseCards(villainSumM[2]);
        }
        continue;
      }

      continue;
    }

    // ── HOLE CARDS dealt ──
    const dealtM = DEALT_TO_HERO_RE.exec(line);
    if (dealtM) {
      heroCards = parseCards(dealtM[1]);
      continue;
    }

    // ── Collection lines (can appear in any phase before summary) ──
    const collectedM = HERO_COLLECTED_RE.exec(line);
    if (collectedM) {
      hand.collectedUC += dollarsToUC(collectedM[1]);
      continue;
    }
    const uncalledM = UNCALLED_HERO_RE.exec(line);
    if (uncalledM) {
      hand.collectedUC += dollarsToUC(uncalledM[1]);
      continue;
    }

    // ── Inline shows (before *** SHOWDOWN ***, e.g. all-in run-out or river) ──
    const heroShowsM = HERO_SHOWS_INLINE_RE.exec(line);
    if (heroShowsM && phase !== 'summary') {
      playerCardsShown['Hero'] = parseCards(heroShowsM[1]);
      continue;
    }
    const playerShowsM = PLAYER_SHOWS_RE.exec(line);
    if (playerShowsM && phase !== 'summary') {
      const name = playerShowsM[1].trim();
      if (!playerCardsShown[name]) {
        playerCardsShown[name] = parseCards(playerShowsM[2]);
      }
      continue;
    }

    // ── Hero blind posts (preamble or preflop phase) ──
    const sbPostM = HERO_POSTS_SB_RE.exec(line);
    if (sbPostM) {
      const amt = dollarsToUC(sbPostM[1]);
      hand.contributedUC += amt;
      heroStreetCommitted = amt;
      continue;
    }
    const bbPostM = HERO_POSTS_BB_RE.exec(line);
    if (bbPostM) {
      const amt = dollarsToUC(bbPostM[1]);
      hand.contributedUC += amt;
      heroStreetCommitted = amt;
      continue;
    }

    // ── Hero actions ──
    const callsM = HERO_CALLS_RE.exec(line);
    if (callsM) {
      const amt = dollarsToUC(callsM[1]);
      hand.contributedUC += amt;
      heroStreetCommitted += amt;
      // all-in check on same line
      if (HERO_ALLIN_RE.test(line) && !hand.heroAllIn) {
        hand.heroAllIn = true;
        hand.allInStreet = phase === 'preflop' || phase === 'preamble' ? 'preflop' : phase;
      }
      continue;
    }
    const betsM = HERO_BETS_RE.exec(line);
    if (betsM) {
      const amt = dollarsToUC(betsM[1]);
      hand.contributedUC += amt;
      heroStreetCommitted = amt;
      if (HERO_ALLIN_RE.test(line) && !hand.heroAllIn) {
        hand.heroAllIn = true;
        hand.allInStreet = phase === 'preflop' || phase === 'preamble' ? 'preflop' : phase;
      }
      continue;
    }
    const raisesM = HERO_RAISES_RE.exec(line);
    if (raisesM) {
      const newTotal = dollarsToUC(raisesM[1]);
      const extra = newTotal - heroStreetCommitted;
      hand.contributedUC += extra;
      heroStreetCommitted = newTotal;
      if (HERO_ALLIN_RE.test(line) && !hand.heroAllIn) {
        hand.heroAllIn = true;
        hand.allInStreet = phase === 'preflop' || phase === 'preamble' ? 'preflop' : phase;
      }
      continue;
    }
  }

  // ── Hero cards ──
  hand.hero.seat = heroSeat;
  hand.hero.cards = heroCards;

  // ── Position ──
  hand.hero.position = determinePosition(heroSeat, buttonSeat, seats, lines);

  // ── Showdown object ──
  if (hand.reachedShowdown) {
    const heroCards_ = playerCardsShown['Hero'] || hand.hero.cards;
    const villains = {};
    for (const [name, cards] of Object.entries(playerCardsShown)) {
      if (name !== 'Hero') villains[name] = cards;
    }
    hand.showdown = {
      hero: heroCards_,
      villains,
      board: boardCards,
    };
  }

  return hand;
}

// ─── parseFile ─────────────────────────────────────────────────────────────────

/**
 * Parse a full GGPoker hand history file.
 * @param {string} fileName
 * @param {string} content
 * @returns {{ hands: import('./hand-model.mjs').Hand[], skipped: number, errors: string[] }}
 */
export function parseFile(fileName, content) {
  const validation = validateFile(fileName, content);
  if (!validation.valid) {
    return { hands: [], skipped: 0, errors: [`Validation failed: ${validation.reason}`] };
  }

  const chunks = splitIntoHands(content);
  const hands = [];
  const errors = [];
  let skipped = 0;

  for (const chunk of chunks) {
    try {
      const hand = parseHand(chunk);
      hands.push(hand);
    } catch (e) {
      skipped++;
      errors.push(`Hand parse error: ${e.message}`);
    }
  }

  return { hands, skipped, errors };
}
