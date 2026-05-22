// js/equity/equity.mjs
import { evaluate5, evaluate7 } from './evaluator.mjs';
import { allCards } from './cards.mjs';

const ALL_CARDS = allCards();

// ─── Multi-way equity ──────────────────────────────────────────────────────────

// Multiway preflop cache (keyed by sorted all-cards list)
const MULTIWAY_CACHE = new Map();

function canonicalMultiwayKey(hero, villainsArray, board) {
  const all = [...hero, ...villainsArray.flat(), ...board].slice().sort((a, b) => a - b);
  return all.join(',');
}

/**
 * equityMultiway(heroCards, villainsCardsArray, board) → number in [0, 1]
 *
 * Returns Hero's equity vs N villains simultaneously.
 * For each board runout:
 *   - Evaluate Hero's 7-card hand → heroRank
 *   - For each villain, evaluate their 7-card hand → villainRank
 *   - Find the minimum rank (lowest = best in Cactus Kev evaluator)
 *   - If Hero is the sole minimum: Hero wins (1 / total runouts)
 *   - If Hero ties with K-1 others: Hero gets (1 / K) / total runouts
 *   - If Hero is not at the minimum: Hero gets 0
 *
 * Board length: 5=river, 4=turn, 3=flop, 0=preflop (same dispatch as equity()).
 */
export function equityMultiway(hero, villainsArray, board) {
  const cacheKey = canonicalMultiwayKey(hero, villainsArray, board);
  const cached = MULTIWAY_CACHE.get(cacheKey);
  if (cached !== undefined) return cached;

  const used = new Set([...hero, ...villainsArray.flat(), ...board]);
  const deck = ALL_CARDS.filter(c => !used.has(c));

  let result;
  if (board.length === 5) {
    result = resolveOneMultiway(hero, villainsArray, board);
  } else if (board.length === 4) {
    result = enumerateMultiway1(hero, villainsArray, board, deck);
  } else if (board.length === 3) {
    result = enumerateMultiway2(hero, villainsArray, board, deck);
  } else if (board.length === 0) {
    result = enumerateMultiway5(hero, villainsArray, deck);
  } else {
    throw new Error(`unsupported board length: ${board.length}`);
  }

  MULTIWAY_CACHE.set(cacheKey, result);
  return result;
}

function resolveOneMultiway(hero, villainsArray, board) {
  const heroRank = evaluate7([...hero, ...board]);
  const villainRanks = villainsArray.map(v => evaluate7([...v, ...board]));
  const minRank = Math.min(heroRank, ...villainRanks);
  if (heroRank !== minRank) return 0.0;
  // Count ties including hero
  let tieCount = 1; // hero
  for (const vr of villainRanks) {
    if (vr === minRank) tieCount++;
  }
  return 1 / tieCount;
}

function enumerateMultiway1(hero, villainsArray, board, deck) {
  let total = 0;
  let heroShare = 0;
  for (const c of deck) {
    heroShare += resolveOneMultiway(hero, villainsArray, [...board, c]);
    total++;
  }
  return total > 0 ? heroShare / total : 0;
}

function enumerateMultiway2(hero, villainsArray, board, deck) {
  let total = 0;
  let heroShare = 0;
  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      heroShare += resolveOneMultiway(hero, villainsArray, [...board, deck[i], deck[j]]);
      total++;
    }
  }
  return total > 0 ? heroShare / total : 0;
}

function enumerateMultiway5(hero, villainsArray, deck) {
  let total = 0;
  let heroShare = 0;
  const n = deck.length;
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      for (let c = b + 1; c < n; c++) {
        for (let d = c + 1; d < n; d++) {
          for (let e = d + 1; e < n; e++) {
            const board = [deck[a], deck[b], deck[c], deck[d], deck[e]];
            heroShare += resolveOneMultiway(hero, villainsArray, board);
            total++;
          }
        }
      }
    }
  }
  return total > 0 ? heroShare / total : 0;
}

// ─── Heads-up equity ───────────────────────────────────────────────────────────

// equity(hero, villain, board) → number in [0, 1]
// Auto-dispatches by board length: 5=river, 4=turn, 3=flop, 0=preflop.
export function equity(hero, villain, board) {
  const used = new Set([...hero, ...villain, ...board]);
  const deck = ALL_CARDS.filter(c => !used.has(c));

  if (board.length === 5) {
    return resolveOne(hero, villain, board);
  }
  if (board.length === 4) {
    return enumerate1(hero, villain, board, deck);
  }
  if (board.length === 3) {
    return enumerate2(hero, villain, board, deck);
  }
  if (board.length === 0) {
    return enumerate5(hero, villain, deck); // to be added in Task 6
  }
  throw new Error(`unsupported board length: ${board.length}`);
}

function resolveOne(hero, villain, board) {
  const h = evaluate7([...hero, ...board]);
  const v = evaluate7([...villain, ...board]);
  if (h < v) return 1.0;
  if (h > v) return 0.0;
  return 0.5;
}

function enumerate1(hero, villain, board, deck) {
  let wins = 0, ties = 0, total = 0;
  for (const c of deck) {
    const r = resolveOne(hero, villain, [...board, c]);
    if (r === 1.0) wins++;
    else if (r === 0.5) ties++;
    total++;
  }
  return (wins + ties * 0.5) / total;
}

function enumerate2(hero, villain, board, deck) {
  let wins = 0, ties = 0, total = 0;
  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      const r = resolveOne(hero, villain, [...board, deck[i], deck[j]]);
      if (r === 1.0) wins++;
      else if (r === 0.5) ties++;
      total++;
    }
  }
  return (wins + ties * 0.5) / total;
}

// Preflop cache: avoids re-enumerating 1.7M boards for the same hole cards.
const PREFLOP_CACHE = new Map();

function canonicalPreflopKey(hero, villain) {
  // Key is the sorted 4 card ints — same exact cards → same equity.
  const cards = [...hero, ...villain].slice().sort((a, b) => a - b);
  return cards.join(',');
}

function enumerate5(hero, villain, deck) {
  const key = canonicalPreflopKey(hero, villain);
  const cached = PREFLOP_CACHE.get(key);
  if (cached !== undefined) return cached;

  let wins = 0, ties = 0, total = 0;
  const n = deck.length; // 48
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      for (let c = b + 1; c < n; c++) {
        for (let d = c + 1; d < n; d++) {
          for (let e = d + 1; e < n; e++) {
            const board = [deck[a], deck[b], deck[c], deck[d], deck[e]];
            const r = resolveOne(hero, villain, board);
            if (r === 1.0) wins++;
            else if (r === 0.5) ties++;
            total++;
          }
        }
      }
    }
  }
  const result = (wins + ties * 0.5) / total;
  PREFLOP_CACHE.set(key, result);
  return result;
}

export function clearEquityCache() {
  PREFLOP_CACHE.clear();
  MULTIWAY_CACHE.clear();
}

export function equityCacheSize() {
  return PREFLOP_CACHE.size;
}

export function multiwayCacheSize() {
  return MULTIWAY_CACHE.size;
}
