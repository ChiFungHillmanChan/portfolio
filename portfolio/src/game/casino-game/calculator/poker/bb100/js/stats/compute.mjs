// js/stats/compute.mjs
// Turns Hand[] into cumulative chart series + summary stats.

import { equity, multiwaySidePotEV } from '../equity/equity.mjs';
import { encodeHand } from '../equity/cards.mjs';

// Street → number of board cards already out when all-in was made
const STREET_BOARD_LEN = {
  preflop: 0,
  flop: 3,
  turn: 4,
  river: 5,
};

/**
 * Compute Hero's per-hand result in micro-cents (BigInt).
 * If beforeRake=true and Hero won something, add back Hero's fee share (rake + jackpot).
 */
function perHandResult(hand, beforeRake) {
  let result = hand.collectedUC - hand.contributedUC;

  if (beforeRake) {
    // heroWonFromPot = amount Hero won from the contested pot (excluding uncalled returns)
    const heroWonFromPot = hand.collectedUC - hand.uncalledUC;
    if (heroWonFromPot > 0n && hand.totalPotUC > hand.rakeUC) {
      // grossPotDenom = totalPot - rake  (denominator: what was truly contested)
      const grossPotDenom = hand.totalPotUC - hand.rakeUC;
      // totalFees = rake + jackpot (all fees taken from the pot)
      const totalFees = hand.rakeUC + (hand.jackpotUC ?? 0n);
      const rakeShare = (totalFees * heroWonFromPot) / grossPotDenom;
      result += rakeShare;
    }
    // For losing hands: rakeShare = 0n (no change)
  }

  return result;
}

/**
 * Compute EV-adjusted result for one hand.
 * Falls back to result_i if all-in EV can't be computed.
 */
function evResult(hand, result, beforeRake) {
  // No all-in → EV = actual result
  if (!hand.heroAllIn) return result;

  // All-in but no showdown data → fall back
  if (!hand.showdown) return result;

  const villainNames = Object.keys(hand.showdown.villains ?? {});
  const heroCards = hand.showdown.hero;
  const board = hand.showdown.board ?? [];

  if (!heroCards || heroCards.length !== 2) return result;

  // Determine how many board cards were out at the time of all-in
  const streetLen = STREET_BOARD_LEN[hand.allInStreet] ?? null;
  if (streetLen === null) return result;

  // ── Heads-up, no uncalled bet ──────────────────────────────────────────────
  // Use the original direct formula (matches GGPoker exactly, verified $8.71/$11.23)
  if (villainNames.length === 1 && hand.uncalledUC === 0n) {
    const villainCards = hand.showdown.villains[villainNames[0]];
    if (!villainCards || villainCards.length !== 2) return result;

    try {
      const heroInts     = encodeHand(heroCards);
      const villainInts  = encodeHand(villainCards);
      const partialBoard = encodeHand(board.slice(0, streetLen));

      const eq = equity(heroInts, villainInts, partialBoard);

      const effectiveContribUC = hand.contributedUC - hand.uncalledUC;
      const potAtRiskUC = beforeRake
        ? hand.totalPotUC
        : hand.totalPotUC - hand.rakeUC;

      const eqMicros  = BigInt(Math.round(eq * 1_000_000));
      const evShareUC = (eqMicros * potAtRiskUC) / 1_000_000n;
      return evShareUC - effectiveContribUC;
    } catch {
      return result;
    }
  }

  // ── Multi-way all-in (or heads-up with uncalled — GGPoker skips these) ────
  // GGPoker does NOT compute All-in EV when an uncalled bet was returned to Hero
  // (heads-up: Hero shoved over villain's effective stack). Fall back for heads-up uncalled.
  if (villainNames.length === 1 && hand.uncalledUC > 0n) return result;

  // Multi-way (2+ villains): use side-pot decomposition
  // Requires contribution data for each showdown player
  if (villainNames.length < 1) return result;

  const contributions = hand.contributions ?? {};

  try {
    const partialBoardCards = encodeHand(board.slice(0, streetLen));
    const heroInts = encodeHand(heroCards);

    // Build the players map with encoded cards and effective contributions
    const players = new Map();

    // Hero's effective contribution
    const heroContribUC = contributions['Hero'] ?? (hand.contributedUC - hand.uncalledUC);
    players.set('Hero', { cards: heroInts, contributionUC: heroContribUC });

    // Each villain that showed cards and has contribution data
    for (const name of villainNames) {
      const cards = hand.showdown.villains[name];
      if (!cards || cards.length !== 2) continue;
      const contribUC = contributions[name];
      if (contribUC === undefined || contribUC <= 0n) continue;
      players.set(name, { cards: encodeHand(cards), contributionUC: contribUC });
    }

    // Need at least Hero + 1 villain
    if (players.size < 2) return result;

    // Dead money = total pot − sum of player contribs − rake − jackpot
    // (totalPotUC already has uncalled bets removed by GGPoker)
    let sumContribs = 0n;
    for (const p of players.values()) sumContribs += p.contributionUC;
    const fees = hand.rakeUC + (hand.jackpotUC ?? 0n);
    const deadMoneyUC = hand.totalPotUC - sumContribs - fees;

    // For beforeRake: include fees in the pot (they're part of the total at-risk)
    const effectiveDeadUC = beforeRake ? deadMoneyUC + fees : deadMoneyUC;

    const heroEvShareUC = multiwaySidePotEV('Hero', players, partialBoardCards, effectiveDeadUC);
    return heroEvShareUC - heroContribUC;
  } catch {
    return result;
  }
}

/**
 * computeSeries(hands, opts) → { series, summary }
 *
 * opts.beforeRake: boolean
 *   true  → add Hero's rake share back on winning hands (gross view)
 *   false → report net-of-rake results (default)
 *
 * series: {
 *   winningsUC: BigInt[]   cumulative total result
 *   redUC:      BigInt[]   cumulative non-showdown result
 *   blueUC:     BigInt[]   cumulative showdown result
 *   evUC:       BigInt[]   cumulative EV-adjusted result
 * }
 *
 * summary: { hands, totalUC, evTotalUC, evMinusWinUC, bbPer100,
 *            byPosition, rakePaidUC, rakeBbPer100 }
 */
export function computeSeries(hands, opts = {}) {
  const beforeRake = Boolean(opts.beforeRake);

  // --- Series accumulators ---
  const winningsUC = [];
  const redUC      = [];
  const blueUC     = [];
  const evUC       = [];

  let cumWin = 0n;
  let cumRed = 0n;
  let cumBlue = 0n;
  let cumEv  = 0n;

  // --- Summary accumulators ---
  const byPosition = {};  // { [pos]: { count, totalUC } }
  let bbWeightedSum = 0;  // for bb/100 calculation (Number arithmetic)
  let rakePaidUC   = 0n;

  for (const hand of hands) {
    const result = perHandResult(hand, beforeRake);
    const ev     = evResult(hand, result, beforeRake);

    // Cumulative series
    cumWin  += result;
    cumEv   += ev;

    if (hand.reachedShowdown) {
      cumBlue += result;
    } else {
      cumRed  += result;
    }

    winningsUC.push(cumWin);
    redUC.push(cumRed);
    blueUC.push(cumBlue);
    evUC.push(cumEv);

    // bb/100 per hand
    const bbUC = hand.stake.bbUC;
    if (bbUC > 0n) {
      bbWeightedSum += Number(result) / Number(bbUC);
    }

    // Position breakdown
    const pos = hand.hero.position;
    if (!byPosition[pos]) {
      byPosition[pos] = { count: 0, totalUC: 0n };
    }
    byPosition[pos].count++;
    byPosition[pos].totalUC += result;

    // Rake paid (Hero's share on winning hands, always after-rake perspective)
    // Exclude uncalled returns from numerator — they are returned pre-contest
    // Include jackpot in total fees (matches the before-rake formula)
    const heroWonFromPotRake = hand.collectedUC - hand.uncalledUC;
    if (heroWonFromPotRake > 0n && hand.totalPotUC > hand.rakeUC) {
      const grossPotDenom = hand.totalPotUC - hand.rakeUC;
      const totalFees = hand.rakeUC + (hand.jackpotUC ?? 0n);
      rakePaidUC += grossPotDenom > 0n
        ? (totalFees * heroWonFromPotRake) / grossPotDenom
        : 0n;
    }
  }

  // --- Summary ---
  const n = hands.length;
  const totalUC   = cumWin;
  const evTotalUC = cumEv;

  const bbPer100 = n > 0 ? (bbWeightedSum / n) * 100 : 0;

  // Rake bb/100
  let avgBbUC = 0;
  if (n > 0) {
    avgBbUC = Number(hands.reduce((s, h) => s + h.stake.bbUC, 0n)) / n;
  }
  const rakeBbPer100 = avgBbUC > 0
    ? (Number(rakePaidUC) / avgBbUC / n) * 100
    : 0;

  const summary = {
    hands: n,
    totalUC,
    evTotalUC,
    evMinusWinUC: evTotalUC - totalUC,
    bbPer100,
    byPosition,
    rakePaidUC,
    rakeBbPer100,
  };

  const series = { winningsUC, redUC, blueUC, evUC };

  return { series, summary };
}
