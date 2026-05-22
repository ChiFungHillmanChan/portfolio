// js/equity/evaluator.mjs
// Cactus Kev 5-card hand evaluator.
// Returns rank 1 (royal flush, best) to 7462 (worst high card).
// Lower rank = better hand. Reference: http://suffe.cool/poker/evaluator.html

// === Tables (generated at load) ===
const FLUSH_TABLE = new Map();   // rank-bit XOR → rank value (flushes only)
const UNIQUE5_TABLE = new Map(); // rank-bit XOR → rank value (5 distinct, non-flush)
const PRODUCT_TABLE = new Map(); // prime product → rank value (pairs, trips, etc.)

// Hand-class boundaries (from Cactus Kev):
//   1     = royal/straight flush
//   11..  = quads
//   167.. = full house
//   323.. = flush
//   1610..= straight
//   1610..= trips
//   2468..= two pair
//   3326..= pair
//   6186..= high card
//   7462  = worst

// Initialization runs once. Generate all ~7462 hand classes from the 5-card combinatorial space.
function initTables() {
  // Straight flushes: 10 ranks (A-high down to 5-high). Map rank-bit pattern → rank value 1..10.
  const SF_BITS = [0x1F00, 0x0F80, 0x07C0, 0x03E0, 0x01F0, 0x00F8, 0x007C, 0x003E, 0x001F, 0x100F /* wheel */];
  SF_BITS.forEach((b, i) => FLUSH_TABLE.set(b, i + 1));

  // Flushes (non-straight): enumerate all C(13,5)=1287 5-card rank combos, exclude straights.
  // Assign rank values 323..1599 ordered by hand strength (highest card, then second-highest, etc.).
  const FLUSH_RANKS = [];
  for (let i = 0; i < 13; i++)
    for (let j = i + 1; j < 13; j++)
      for (let k = j + 1; k < 13; k++)
        for (let l = k + 1; l < 13; l++)
          for (let m = l + 1; m < 13; m++) {
            const bits = (1 << i) | (1 << j) | (1 << k) | (1 << l) | (1 << m);
            FLUSH_RANKS.push(bits);
          }
  // Sort high → low (highest card-bit first)
  FLUSH_RANKS.sort((a, b) => b - a);
  let rank = 323;
  for (const bits of FLUSH_RANKS) {
    // Exclude any straight (already in FLUSH_TABLE)
    if (FLUSH_TABLE.has(bits)) continue;
    FLUSH_TABLE.set(bits, rank++);
  }

  // Straights (non-flush): rank 1600..1609
  const STRAIGHT_BITS = [0x1F00, 0x0F80, 0x07C0, 0x03E0, 0x01F0, 0x00F8, 0x007C, 0x003E, 0x001F, 0x100F];
  STRAIGHT_BITS.forEach((b, i) => UNIQUE5_TABLE.set(b, 1600 + i));

  // 5 distinct ranks, non-straight: rank 6186..7461 (high cards)
  const HC_RANKS = [];
  for (let i = 0; i < 13; i++)
    for (let j = i + 1; j < 13; j++)
      for (let k = j + 1; k < 13; k++)
        for (let l = k + 1; l < 13; l++)
          for (let m = l + 1; m < 13; m++) {
            const bits = (1 << i) | (1 << j) | (1 << k) | (1 << l) | (1 << m);
            HC_RANKS.push(bits);
          }
  HC_RANKS.sort((a, b) => b - a);
  rank = 6186;
  for (const bits of HC_RANKS) {
    if (UNIQUE5_TABLE.has(bits)) continue; // skip straights
    UNIQUE5_TABLE.set(bits, rank++);
  }

  // Pairs / trips / quads / full house / two pair — keyed by prime product.
  const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41];

  // Quads: 13 quad ranks × 12 kicker ranks = 156 combos
  let qRank = 11;
  for (let q = 12; q >= 0; q--)
    for (let k = 12; k >= 0; k--) {
      if (k === q) continue;
      const prod = PRIMES[q] ** 4 * PRIMES[k];
      PRODUCT_TABLE.set(prod, qRank++);
    }

  // Full house: 13 trips × 12 pair = 156
  let fhRank = 167;
  for (let t = 12; t >= 0; t--)
    for (let p = 12; p >= 0; p--) {
      if (p === t) continue;
      const prod = PRIMES[t] ** 3 * PRIMES[p] ** 2;
      PRODUCT_TABLE.set(prod, fhRank++);
    }

  // Trips: 13 trip ranks × C(12,2) kickers = 858
  let tRank = 1610;
  for (let t = 12; t >= 0; t--)
    for (let k1 = 12; k1 >= 0; k1--)
      for (let k2 = k1 - 1; k2 >= 0; k2--) {
        if (k1 === t || k2 === t) continue;
        const prod = PRIMES[t] ** 3 * PRIMES[k1] * PRIMES[k2];
        PRODUCT_TABLE.set(prod, tRank++);
      }

  // Two pair: C(13,2) pair-pairs × 11 kickers = 858
  let tpRank = 2468;
  for (let hp = 12; hp >= 1; hp--)
    for (let lp = hp - 1; lp >= 0; lp--)
      for (let k = 12; k >= 0; k--) {
        if (k === hp || k === lp) continue;
        const prod = PRIMES[hp] ** 2 * PRIMES[lp] ** 2 * PRIMES[k];
        PRODUCT_TABLE.set(prod, tpRank++);
      }

  // Pair: 13 pair ranks × C(12,3) kickers = 2860
  let pRank = 3326;
  for (let p = 12; p >= 0; p--)
    for (let k1 = 12; k1 >= 0; k1--)
      for (let k2 = k1 - 1; k2 >= 0; k2--)
        for (let k3 = k2 - 1; k3 >= 0; k3--) {
          if (k1 === p || k2 === p || k3 === p) continue;
          const prod = PRIMES[p] ** 2 * PRIMES[k1] * PRIMES[k2] * PRIMES[k3];
          PRODUCT_TABLE.set(prod, pRank++);
        }
}

initTables();

export function evaluate5(cards) {
  if (cards.length !== 5) throw new Error('evaluate5 needs 5 cards');
  const [a, b, c, d, e] = cards;
  // Flush check: AND of suit bits must be non-zero
  const flush = a & b & c & d & e & 0xF000;
  // Rank-bit XOR of high 13 bits
  const rankBits = (a | b | c | d | e) >>> 16;
  if (flush) return FLUSH_TABLE.get(rankBits);
  const unique = UNIQUE5_TABLE.get(rankBits);
  if (unique !== undefined) return unique;
  // Has pair: use prime product
  const prod = (a & 0xFF) * (b & 0xFF) * (c & 0xFF) * (d & 0xFF) * (e & 0xFF);
  return PRODUCT_TABLE.get(prod);
}

// 7-card: best of all C(7,5)=21 5-card subsets
const COMBOS_7_5 = [
  [0,1,2,3,4],[0,1,2,3,5],[0,1,2,3,6],[0,1,2,4,5],[0,1,2,4,6],
  [0,1,2,5,6],[0,1,3,4,5],[0,1,3,4,6],[0,1,3,5,6],[0,1,4,5,6],
  [0,2,3,4,5],[0,2,3,4,6],[0,2,3,5,6],[0,2,4,5,6],[0,3,4,5,6],
  [1,2,3,4,5],[1,2,3,4,6],[1,2,3,5,6],[1,2,4,5,6],[1,3,4,5,6],
  [2,3,4,5,6],
];

export function evaluate7(cards) {
  if (cards.length !== 7) throw new Error('evaluate7 needs 7 cards');
  let best = 7463;
  for (const [i, j, k, l, m] of COMBOS_7_5) {
    const r = evaluate5([cards[i], cards[j], cards[k], cards[l], cards[m]]);
    if (r < best) best = r;
  }
  return best;
}
