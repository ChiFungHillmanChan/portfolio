// engine.mjs — Ultimate Texas Hold'em pure game engine.
//
// ⚠️ SYNC REQUIREMENT: a byte-identical copy of this file ships to the client
// at portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/js/core/engine.js
// (display hints only — the client never decides money). If you edit this
// file, re-copy it there and re-sync public/games/casino-game/.
//
// Environment-agnostic: no node imports, safe as a browser ES module.
//
// Card encoding: int 0–51. rank = c % 13 (0='2' … 12='A'),
// suit = Math.floor(c / 13) (0=♠, 1=♥, 2=♦, 3=♣; suits 1,2 render red).

export const RANKS = "23456789TJQKA";
export const SUITS = ["♠", "♥", "♦", "♣"];

export const CAT = {
  HIGH: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  TRIPS: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  QUADS: 7,
  STRAIGHT_FLUSH: 8,
  ROYAL: 9,
};

export const CAT_NAMES = [
  "High Card",
  "Pair",
  "Two Pair",
  "Three of a Kind",
  "Straight",
  "Flush",
  "Full House",
  "Four of a Kind",
  "Straight Flush",
  "Royal Flush",
];

export function cardRank(c) {
  return c % 13;
}

export function cardSuit(c) {
  return Math.floor(c / 13);
}

export function cardLabel(c) {
  return RANKS[cardRank(c)] + SUITS[cardSuit(c)];
}

// ── Pay tables (spec §2, verified vs Wizard of Odds 2026-07-10) ─────────────

export const BLIND_PAYS = {
  [CAT.ROYAL]: 500,
  [CAT.STRAIGHT_FLUSH]: 50,
  [CAT.QUADS]: 10,
  [CAT.FULL_HOUSE]: 3,
  [CAT.FLUSH]: 1.5,
  [CAT.STRAIGHT]: 1,
};

export const TRIPS_PAYS = {
  [CAT.ROYAL]: 50,
  [CAT.STRAIGHT_FLUSH]: 40,
  [CAT.QUADS]: 30,
  [CAT.FULL_HOUSE]: 9,
  [CAT.FLUSH]: 7,
  [CAT.STRAIGHT]: 4,
  [CAT.TRIPS]: 3,
};

// Bad Beat Bonus — pays when the player LOSES the showdown holding three of a
// kind or better. A losing royal pays the straight-flush row.
export const BBB_PAYS = {
  [CAT.ROYAL]: 7500,
  [CAT.STRAIGHT_FLUSH]: 7500,
  [CAT.QUADS]: 500,
  [CAT.FULL_HOUSE]: 50,
  [CAT.FLUSH]: 30,
  [CAT.STRAIGHT]: 20,
  [CAT.TRIPS]: 9,
};

// ── Hand evaluation ──────────────────────────────────────────────────────────

// evaluate5: exact 5 cards → { cat, value }.
// value is a single comparable integer: cat * 13^5 + five base-13 tie-break
// digits (higher value = better hand, across and within categories).
export function evaluate5(five) {
  const rs = five.map(cardRank).sort((a, b) => b - a);
  const flush = five.every((c) => cardSuit(c) === cardSuit(five[0]));

  const counts = new Map();
  for (const r of rs) counts.set(r, (counts.get(r) || 0) + 1);
  // groups: by count desc, then rank desc — e.g. full house → [trips, pair]
  const groups = [...counts.entries()]
    .map(([r, n]) => ({ r, n }))
    .sort((a, b) => b.n - a.n || b.r - a.r);

  // straight high card (-1 = none); wheel A-2-3-4-5 → high '5' (rank 3)
  let straight = -1;
  if (counts.size === 5) {
    if (rs[0] - rs[4] === 4) straight = rs[0];
    else if (rs[0] === 12 && rs[1] === 3) straight = 3;
  }

  let cat;
  let tie;
  if (flush && straight >= 0) {
    cat = straight === 12 ? CAT.ROYAL : CAT.STRAIGHT_FLUSH;
    tie = [straight];
  } else if (groups[0].n === 4) {
    cat = CAT.QUADS;
    tie = [groups[0].r, groups[1].r];
  } else if (groups[0].n === 3 && groups[1].n >= 2) {
    cat = CAT.FULL_HOUSE;
    tie = [groups[0].r, groups[1].r];
  } else if (flush) {
    cat = CAT.FLUSH;
    tie = rs;
  } else if (straight >= 0) {
    cat = CAT.STRAIGHT;
    tie = [straight];
  } else if (groups[0].n === 3) {
    cat = CAT.TRIPS;
    tie = [groups[0].r, groups[1].r, groups[2].r];
  } else if (groups[0].n === 2 && groups[1].n === 2) {
    cat = CAT.TWO_PAIR;
    tie = [groups[0].r, groups[1].r, groups[2].r];
  } else if (groups[0].n === 2) {
    cat = CAT.PAIR;
    tie = [groups[0].r, groups[1].r, groups[2].r, groups[3].r];
  } else {
    cat = CAT.HIGH;
    tie = rs;
  }

  let value = cat;
  for (let i = 0; i < 5; i++) value = value * 13 + (tie[i] ?? 0);
  return { cat, value };
}

// evaluate7: best 5-of-7 → { cat, value, name }. C(7,5)=21 combinations.
export function evaluate7(seven) {
  let best = null;
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 7; j++) {
      const five = seven.filter((_, k) => k !== i && k !== j);
      const e = evaluate5(five);
      if (!best || e.value > best.value) best = e;
    }
  }
  return { ...best, name: CAT_NAMES[best.cat] };
}

// ── Hole Card Bonus ──────────────────────────────────────────────────────────

// → multiplier (win) or -1 (lose). Top award needs dealer pocket aces too.
export function holeCardBonusMult(playerHole, dealerHole) {
  const A = 12;
  const r1 = cardRank(playerHole[0]);
  const r2 = cardRank(playerHole[1]);
  const suited = cardSuit(playerHole[0]) === cardSuit(playerHole[1]);
  const hi = Math.max(r1, r2);
  const lo = Math.min(r1, r2);
  const isPair = r1 === r2;

  if (isPair && r1 === A) {
    const dealerAces =
      dealerHole &&
      cardRank(dealerHole[0]) === A &&
      cardRank(dealerHole[1]) === A;
    return dealerAces ? 1000 : 30;
  }
  if (hi === A && lo === 11) return suited ? 25 : 15; // AK
  if (hi === A && (lo === 10 || lo === 9)) return suited ? 20 : 5; // AQ, AJ
  if (isPair && r1 >= 9) return 10; // JJ–KK
  if (isPair) return 3; // 22–TT
  return -1;
}

// ── Settlement ───────────────────────────────────────────────────────────────

// settleSeat(seat, playerEval, dealerEval, playerHole, dealerHole)
//   seat: { bets: {ante, blind, trips, holeCard, badBeat}, playBet, folded }
//   → per-bet deltas (+profit / 0 push / -stake lost) + net.
// Stack credit for the caller = totalStaked + net (losing bets contribute 0).
export function settleSeat(seat, playerEval, dealerEval, playerHole, dealerHole) {
  const { ante, blind, trips, holeCard, badBeat } = seat.bets;
  const playBet = seat.playBet || 0;
  const r = { ante: 0, blind: 0, play: 0, trips: 0, holeCard: 0, badBeat: 0 };

  // Hole Card Bonus is fixed at the deal — resolves even on a fold.
  if (holeCard > 0) {
    const m = holeCardBonusMult(playerHole, dealerHole);
    r.holeCard = m > 0 ? holeCard * m : -holeCard;
  }

  if (seat.folded) {
    r.ante = -ante;
    r.blind = -blind;
    r.trips = -trips;
    r.badBeat = -badBeat;
  } else {
    const win = playerEval.value > dealerEval.value;
    const tie = playerEval.value === dealerEval.value;
    const qualified = dealerEval.cat >= CAT.PAIR;

    // Ante: pushes whenever the dealer doesn't open (pair or better).
    if (qualified) r.ante = win ? ante : tie ? 0 : -ante;

    // Play: always action, qualification irrelevant.
    r.play = win ? playBet : tie ? 0 : -playBet;

    // Blind: pays the table on a winning straight+; pushes on smaller wins.
    if (win) {
      const mult = BLIND_PAYS[playerEval.cat];
      r.blind = mult ? Math.floor(blind * mult) : 0;
    } else if (!tie) {
      r.blind = -blind;
    }

    // Trips: player's own hand only.
    if (trips > 0) {
      const mult = TRIPS_PAYS[playerEval.cat];
      r.trips = mult ? trips * mult : -trips;
    }

    // Bad Beat: consolation — lose the showdown with trips or better.
    if (badBeat > 0) {
      const lost = !win && !tie;
      const mult = lost ? BBB_PAYS[playerEval.cat] : undefined;
      r.badBeat = mult ? badBeat * mult : -badBeat;
    }
  }

  r.net = r.ante + r.blind + r.play + r.trips + r.holeCard + r.badBeat;
  return r;
}
