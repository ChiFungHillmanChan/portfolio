// Pure poker hand evaluation for Card Drawer. No DOM, no state — safe for
// both the browser (<script type="module">) and node --test.

export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 11=J 12=Q 13=K 14=A

export const CATEGORY = {
  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  TRIPS: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  QUADS: 7,
  STRAIGHT_FLUSH: 8,
  ROYAL_FLUSH: 9,
  FIVE_OF_A_KIND: 10,
};

const SUIT_LETTERS = { spades: 'S', hearts: 'H', diamonds: 'D', clubs: 'C' };

export function rankLabel(rank) {
  if (rank === 14) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  return String(rank);
}

function rankPlural(rank) {
  if (rank === 14) return 'Aces';
  if (rank === 13) return 'Kings';
  if (rank === 12) return 'Queens';
  if (rank === 11) return 'Jacks';
  return `${rank}s`;
}

export function createDeck({ includeJokers = false } = {}) {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${rankLabel(rank)}${SUIT_LETTERS[suit]}`, rank, suit });
    }
  }
  if (includeJokers) {
    deck.push({ id: 'JOKER-1', joker: true });
    deck.push({ id: 'JOKER-2', joker: true });
  }
  return deck;
}

export function shuffle(deck, rng = Math.random) {
  const out = deck.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Compare score tuples element by element; on a shared-prefix tie the hand
// with an extra present tie-break rank wins ({A,K,2} > {A,K}).
export function compareScores(a, b) {
  const shared = Math.min(a.length, b.length);
  for (let i = 0; i < shared; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

// Highest straight top-rank in a set of distinct ranks (ace also plays low),
// or 0 if none. Requires the full 5-card run to be present.
function bestStraightHigh(rankSet) {
  const set = new Set(rankSet);
  if (set.has(14)) set.add(1); // wheel: ace plays low
  for (let high = 14; high >= 5; high--) {
    let run = true;
    for (let r = high - 4; r <= high; r++) {
      if (!set.has(r)) {
        run = false;
        break;
      }
    }
    if (run) return high;
  }
  return 0;
}

function descending(a, b) {
  return b - a;
}

// Best 5-card hand from concrete cards only (no wilds). Duplicate cards are
// allowed (a wild may have become a copy); rank counts may reach 5+.
function evaluatePlain(cards) {
  const counts = new Map();
  const bySuit = new Map();
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
    if (!bySuit.has(card.suit)) bySuit.set(card.suit, []);
    bySuit.get(card.suit).push(card.rank);
  }
  const distinct = [...counts.keys()].sort(descending);
  const withCount = (n) => distinct.filter((r) => counts.get(r) >= n);
  const kickersExcluding = (excluded, howMany) => {
    const out = [];
    for (const r of distinct) {
      if (excluded.includes(r)) continue;
      out.push(r);
      if (out.length === howMany) break;
    }
    return out;
  };

  // Five of a Kind
  const fives = withCount(5);
  if (fives.length) return [CATEGORY.FIVE_OF_A_KIND, fives[0]];

  // Straight flush / Royal flush
  let bestSfHigh = 0;
  for (const ranks of bySuit.values()) {
    if (ranks.length < 5) continue;
    const high = bestStraightHigh(ranks);
    if (high > bestSfHigh) bestSfHigh = high;
  }
  if (bestSfHigh === 14) return [CATEGORY.ROYAL_FLUSH];
  if (bestSfHigh) return [CATEGORY.STRAIGHT_FLUSH, bestSfHigh];

  // Four of a Kind
  const quads = withCount(4);
  if (quads.length) {
    return [CATEGORY.QUADS, quads[0], ...kickersExcluding([quads[0]], 1)];
  }

  // Full House
  const trips = withCount(3);
  if (trips.length) {
    const pairMate = withCount(2).find((r) => r !== trips[0]);
    if (pairMate !== undefined) return [CATEGORY.FULL_HOUSE, trips[0], pairMate];
  }

  // Flush — top 5 of the suit (duplicates from wilds allowed)
  let bestFlush = null;
  for (const ranks of bySuit.values()) {
    if (ranks.length < 5) continue;
    const top5 = ranks.slice().sort(descending).slice(0, 5);
    if (!bestFlush || compareScores(top5, bestFlush) > 0) bestFlush = top5;
  }
  if (bestFlush) return [CATEGORY.FLUSH, ...bestFlush];

  // Straight
  const straightHigh = bestStraightHigh(distinct);
  if (straightHigh) return [CATEGORY.STRAIGHT, straightHigh];

  // Three of a Kind
  if (trips.length) {
    return [CATEGORY.TRIPS, trips[0], ...kickersExcluding([trips[0]], 2)];
  }

  // Two Pair / Pair
  const pairs = withCount(2);
  if (pairs.length >= 2) {
    return [
      CATEGORY.TWO_PAIR,
      pairs[0],
      pairs[1],
      ...kickersExcluding([pairs[0], pairs[1]], 1),
    ];
  }
  if (pairs.length === 1) {
    return [CATEGORY.PAIR, pairs[0], ...kickersExcluding([pairs[0]], 3)];
  }

  // High Card
  return [CATEGORY.HIGH_CARD, ...distinct.slice(0, 5)];
}

export function handName(score) {
  const [category, ...ranks] = score;
  switch (category) {
    case CATEGORY.FIVE_OF_A_KIND:
      return `Five of a Kind, ${rankPlural(ranks[0])}`;
    case CATEGORY.ROYAL_FLUSH:
      return 'Royal Flush';
    case CATEGORY.STRAIGHT_FLUSH:
      return `Straight Flush, ${rankLabel(ranks[0])} high`;
    case CATEGORY.QUADS:
      return `Four of a Kind, ${rankPlural(ranks[0])}`;
    case CATEGORY.FULL_HOUSE:
      return `Full House, ${rankPlural(ranks[0])} over ${rankPlural(ranks[1])}`;
    case CATEGORY.FLUSH:
      return `Flush, ${rankLabel(ranks[0])} high`;
    case CATEGORY.STRAIGHT:
      return `Straight, ${rankLabel(ranks[0])} high`;
    case CATEGORY.TRIPS:
      return `Three of a Kind, ${rankPlural(ranks[0])}`;
    case CATEGORY.TWO_PAIR:
      return `Two Pair, ${rankPlural(ranks[0])} & ${rankPlural(ranks[1])}`;
    case CATEGORY.PAIR:
      return `Pair of ${rankPlural(ranks[0])}`;
    default:
      return `${rankLabel(ranks[0])} high`;
  }
}

// Given concrete cards (no jokers; wild substitutes allowed as tagged copies)
// and the score evaluatePlain produced for them, pick the actual card objects
// that form the hand, in score-priority order. Each object is used at most
// once. Deterministic: naturals listed before wild extras are preferred.
function selectFive(cards, score) {
  const [category, ...ranks] = score;
  const pool = cards.slice();
  const takeByRank = (rank, howMany, suit = null) => {
    const out = [];
    for (let i = 0; i < pool.length && out.length < howMany; i++) {
      if (pool[i].rank === rank && (suit === null || pool[i].suit === suit)) {
        out.push(pool[i]);
        pool.splice(i, 1);
        i--;
      }
    }
    return out;
  };
  const straightRanks = (high) =>
    high === 5 ? [5, 4, 3, 2, 14] : [high, high - 1, high - 2, high - 3, high - 4];

  switch (category) {
    case CATEGORY.FIVE_OF_A_KIND:
      return takeByRank(ranks[0], 5);
    case CATEGORY.ROYAL_FLUSH:
    case CATEGORY.STRAIGHT_FLUSH: {
      const run = straightRanks(category === CATEGORY.ROYAL_FLUSH ? 14 : ranks[0]);
      const suit = SUITS.find((s) =>
        run.every((r) => pool.some((card) => card.suit === s && card.rank === r))
      );
      return run.map((r) => takeByRank(r, 1, suit)[0]);
    }
    case CATEGORY.QUADS:
      return [...takeByRank(ranks[0], 4), ...ranks.slice(1).map((r) => takeByRank(r, 1)[0])];
    case CATEGORY.FULL_HOUSE:
      return [...takeByRank(ranks[0], 3), ...takeByRank(ranks[1], 2)];
    case CATEGORY.FLUSH: {
      const suit = SUITS.find((s) => {
        const bag = new Map();
        for (const card of pool) {
          if (card.suit !== s) continue;
          bag.set(card.rank, (bag.get(card.rank) || 0) + 1);
        }
        const need = new Map();
        for (const r of ranks) need.set(r, (need.get(r) || 0) + 1);
        return [...need].every(([r, n]) => (bag.get(r) || 0) >= n);
      });
      return ranks.map((r) => takeByRank(r, 1, suit)[0]);
    }
    case CATEGORY.STRAIGHT:
      return straightRanks(ranks[0]).map((r) => takeByRank(r, 1)[0]);
    case CATEGORY.TRIPS:
      return [...takeByRank(ranks[0], 3), ...ranks.slice(1).map((r) => takeByRank(r, 1)[0])];
    case CATEGORY.TWO_PAIR:
      return [
        ...takeByRank(ranks[0], 2),
        ...takeByRank(ranks[1], 2),
        ...ranks.slice(2).map((r) => takeByRank(r, 1)[0]),
      ];
    case CATEGORY.PAIR:
      return [...takeByRank(ranks[0], 2), ...ranks.slice(1).map((r) => takeByRank(r, 1)[0])];
    default:
      return ranks.map((r) => takeByRank(r, 1)[0]);
  }
}

// Best 5-card hand of a pile that may contain wild jokers. Each wild is
// brute-forced over all 52 concrete card values (duplicates allowed); with a
// single deck W <= 2, so at most 52x52 = 2704 plain evaluations. The brute
// force is score-only; card selection runs once, on the winning assignment.
export function evaluateHand(cards) {
  if (!cards || cards.length === 0) return null;
  const naturals = cards.filter((card) => !card.joker);
  const wilds = cards.filter((card) => card.joker);

  let best = null;
  let bestExtras = [];
  const consider = (score, extras) => {
    if (!best || compareScores(score, best) > 0) {
      best = score;
      bestExtras = extras.slice();
    }
  };
  const assign = (wildsLeft, extras) => {
    if (wildsLeft === 0) {
      consider(evaluatePlain(naturals.concat(extras)), extras);
      return;
    }
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        extras.push({ rank, suit, wildOf: wilds[extras.length] });
        assign(wildsLeft - 1, extras);
        extras.pop();
      }
    }
  };
  assign(wilds.length, []);

  const bestFive = selectFive(naturals.concat(bestExtras), best).map(
    (card) => card.wildOf || card
  );
  return { category: best[0], score: best, name: handName(best), bestFive };
}
