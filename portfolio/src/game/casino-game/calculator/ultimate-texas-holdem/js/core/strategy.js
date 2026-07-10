// strategy.js — Ultimate Texas Hold'em basic ("perfect practical") strategy.
//
// ⚠️ SYNC REQUIREMENT: copy of system-architecture/lambda/uth/strategy.mjs,
// identical except this header and the engine import extension (.mjs → .js).
// Display/coaching only — it never decides money.
// If you edit the Lambda file, re-copy it here and re-sync public/games/casino-game/.
//
// Rules follow the Wizard of Odds basic strategy (verified 2026-07-10):
//   Pre-flop — raise 4x with: any pair 33+, any Ace, any suited King,
//     K5 offsuit+, Q6 suited+ / Q8 offsuit+, J8 suited / JT offsuit.
//     Otherwise check (the 3x raise is never used).
//   Flop — raise 2x with: two pair or better · a hidden pair (a pair using a
//     hole card) except pocket 22 · four to a flush with a hole card T+ of
//     that suit. Otherwise check.
//   River — bet 1x with a hidden pair or better, OR when fewer than 21 of the
//     45 unseen cards would beat you as a single dealer card + the board.
//     Otherwise fold.
//
// House edge ≈ 2.185% of the Ante optimal; this chart plays to ≈ 2.43%.

import { cardRank, cardSuit, evaluate5, evaluate7 } from "./engine.js";

// rank indices (rank = c % 13): 0='2' … 8='T', 9='J', 10='Q', 11='K', 12='A'
const R = { T: 8, J: 9, Q: 10, K: 11, A: 12 };

const RANK_WORDS = "23456789TJQKA";
const rankWord = (r) => RANK_WORDS[r];

// ── Pre-flop ─────────────────────────────────────────────────────────────────

// preflopAdvice([c, c]) → { move: '4x'|'check', reason }
export function preflopAdvice(hole) {
  const r1 = cardRank(hole[0]);
  const r2 = cardRank(hole[1]);
  const suited = cardSuit(hole[0]) === cardSuit(hole[1]);
  const hi = Math.max(r1, r2);
  const lo = Math.min(r1, r2);

  if (r1 === r2) {
    return r1 >= 1
      ? { move: "4x", reason: `Pair of ${rankWord(r1)}s — any pair 3s or better raises 4x` }
      : { move: "check", reason: "Pocket 2s — the only pair that checks" };
  }
  if (hi === R.A) return { move: "4x", reason: "Any Ace raises 4x" };
  if (hi === R.K) {
    if (suited) return { move: "4x", reason: "Any suited King raises 4x" };
    if (lo >= 3) return { move: "4x", reason: "K5 offsuit or better raises 4x" };
  }
  if (hi === R.Q) {
    if (suited && lo >= 4) return { move: "4x", reason: "Q6 suited or better raises 4x" };
    if (!suited && lo >= 6) return { move: "4x", reason: "Q8 offsuit or better raises 4x" };
  }
  if (hi === R.J) {
    if (suited && lo >= 6) return { move: "4x", reason: "J8 suited or better raises 4x" };
    if (!suited && lo === R.T) return { move: "4x", reason: "JT offsuit raises 4x" };
  }
  return { move: "check", reason: "Not on the 4x chart — check and see the flop for free" };
}

// ── Flop ─────────────────────────────────────────────────────────────────────

// A pair (or pocket pair) that uses at least one of your hole cards.
function hasHiddenPair(hole, board) {
  const r1 = cardRank(hole[0]);
  const r2 = cardRank(hole[1]);
  if (r1 === r2) return true;
  const boardRanks = new Set(board.map(cardRank));
  return boardRanks.has(r1) || boardRanks.has(r2);
}

// flopAdvice([c, c], [c, c, c]) → { move: '2x'|'check', reason }
export function flopAdvice(hole, flop) {
  const made = evaluate5([...hole, ...flop]);
  // Trips entirely on the board belong to the dealer too — only raise a
  // tripled flop when a hole card improves it (full house / quads).
  const boardTrips = flop.every((c) => cardRank(c) === cardRank(flop[0]));
  if (made.cat >= 2 /* CAT.TWO_PAIR */ && !(boardTrips && made.cat === 3 /* CAT.TRIPS */)) {
    return { move: "2x", reason: "Two pair or better — bet 2x" };
  }

  const pocketDeuces = cardRank(hole[0]) === 0 && cardRank(hole[1]) === 0;
  if (hasHiddenPair(hole, flop) && !pocketDeuces) {
    return { move: "2x", reason: "Hidden pair (your hole card plays) — bet 2x" };
  }

  // four to a flush with a hidden T or better of that suit
  const suitCounts = [0, 0, 0, 0];
  for (const c of [...hole, ...flop]) suitCounts[cardSuit(c)]++;
  const flushSuit = suitCounts.findIndex((n) => n >= 4);
  if (flushSuit >= 0) {
    const bigHidden = hole.some((c) => cardSuit(c) === flushSuit && cardRank(c) >= R.T);
    if (bigHidden) {
      return { move: "2x", reason: "Four to a flush with a hidden T or higher — bet 2x" };
    }
  }

  if (pocketDeuces) return { move: "check", reason: "Pocket 2s — the one hidden pair that checks" };
  return { move: "check", reason: "No hidden pair or big flush draw — check" };
}

// ── River ────────────────────────────────────────────────────────────────────

// Best 5-of-6 value (the board plus one hypothetical dealer card).
function bestOf6Value(six) {
  let best = 0;
  for (let i = 0; i < 6; i++) {
    const e = evaluate5(six.filter((_, k) => k !== i));
    if (e.value > best) best = e.value;
  }
  return best;
}

// How many of the 45 unseen cards, taken alone with the board, beat your hand?
export function countDealerOuts(hole, board) {
  const seen = new Set([...hole, ...board]);
  const player = evaluate7([...hole, ...board]);
  let outs = 0;
  for (let c = 0; c < 52; c++) {
    if (seen.has(c)) continue;
    if (bestOf6Value([...board, c]) > player.value) outs++;
  }
  return outs;
}

export const RIVER_OUTS_THRESHOLD = 21;

// A hidden pair "plays" unless two higher board pairs counterfeit it
// (e.g. pocket 2s on a Q-Q-9-9-5 board — your best five is the board).
function hiddenPairPlays(hole, board) {
  if (!hasHiddenPair(hole, board)) return false;
  const r1 = cardRank(hole[0]);
  const r2 = cardRank(hole[1]);
  const boardRanks = board.map(cardRank);
  const pairRank =
    r1 === r2 ? r1 : Math.max(boardRanks.includes(r1) ? r1 : -1, boardRanks.includes(r2) ? r2 : -1);
  const counts = new Map();
  for (const r of boardRanks) counts.set(r, (counts.get(r) || 0) + 1);
  let higherBoardPairs = 0;
  for (const [r, n] of counts) if (n >= 2 && r > pairRank) higherBoardPairs++;
  return higherBoardPairs < 2;
}

// riverAdvice([c, c], [c, c, c, c, c]) → { move: '1x'|'fold', outs, reason }
export function riverAdvice(hole, board) {
  const outs = countDealerOuts(hole, board);
  if (hiddenPairPlays(hole, board)) {
    return { move: "1x", outs, reason: "Hidden pair or better — always bet 1x" };
  }
  if (outs < RIVER_OUTS_THRESHOLD) {
    return { move: "1x", outs, reason: `Only ${outs} of 45 dealer outs beat you (fewer than 21) — bet 1x` };
  }
  return { move: "fold", outs, reason: `${outs} of 45 dealer outs beat you (21 or more) — fold` };
}

// adviceFor(phase, hole, community) — one entry point for the UI coach.
export function adviceFor(phase, hole, community) {
  if (phase === "preflop") return preflopAdvice(hole);
  if (phase === "flop") return flopAdvice(hole, community.slice(0, 3));
  if (phase === "river") return riverAdvice(hole, community.slice(0, 5));
  return null;
}
