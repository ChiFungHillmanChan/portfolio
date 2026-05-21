// js/stats/compute.mjs
// Turns Hand[] into cumulative chart series + summary stats.

import { equity } from '../equity/equity.mjs';
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
 * If beforeRake=true and Hero won something, add back Hero's rake share.
 */
function perHandResult(hand, beforeRake) {
  let result = hand.collectedUC - hand.contributedUC;

  if (
    beforeRake &&
    hand.collectedUC > 0n &&
    hand.totalPotUC > hand.rakeUC
  ) {
    // grossPot = totalPot - rake  (what players put in before rake was taken)
    const grossPot = hand.totalPotUC - hand.rakeUC;
    // Hero's proportional share of rake — exclude uncalled returns from the numerator
    // because uncalled bets are returned pre-contest and don't represent won pot
    const heroWonFromPot = hand.collectedUC - hand.uncalledUC;
    const heroShareOfRake = grossPot > 0n
      ? (hand.rakeUC * heroWonFromPot) / grossPot
      : 0n;
    result += heroShareOfRake;
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

  // All-in but no showdown data or multi-way → fall back
  if (!hand.showdown) return result;

  const villainNames = Object.keys(hand.showdown.villains ?? {});
  if (villainNames.length !== 1) return result; // skip multi-way for v1

  const heroCards = hand.showdown.hero;
  const villainCards = hand.showdown.villains[villainNames[0]];
  const board = hand.showdown.board ?? [];

  if (!heroCards || heroCards.length !== 2 || !villainCards || villainCards.length !== 2) {
    return result;
  }

  // Determine how many board cards were out at the time of all-in
  const streetLen = STREET_BOARD_LEN[hand.allInStreet] ?? null;
  if (streetLen === null) return result;

  try {
    const heroInts    = encodeHand(heroCards);
    const villainInts = encodeHand(villainCards);
    const partialBoard = encodeHand(board.slice(0, streetLen));

    const eq = equity(heroInts, villainInts, partialBoard);

    // Effective contribution = what Hero actually had at risk in the contested pot.
    // When Hero raises over villain's stack, the uncalled excess is returned —
    // only the matched portion is truly committed to the pot.
    const effectiveContribUC = hand.contributedUC - hand.uncalledUC;

    // Pot at risk = the actual contested pot (GGPoker's totalPot already excludes
    // uncalled returns, so totalPotUC IS the contested pot):
    // - beforeRake=true  → use full pot (rake stays in)
    // - beforeRake=false → use net pot (after rake removed)
    const potAtRiskUC = beforeRake
      ? hand.totalPotUC
      : hand.totalPotUC - hand.rakeUC;

    // Convert equity fraction → BigInt micro-cent arithmetic
    const eqMicros  = BigInt(Math.round(eq * 1_000_000));
    const evShareUC = (eqMicros * potAtRiskUC) / 1_000_000n;

    return evShareUC - effectiveContribUC;
  } catch {
    // Any card-encoding or equity error → fall back
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
    if (hand.collectedUC > 0n && hand.totalPotUC > hand.rakeUC) {
      const grossPot = hand.totalPotUC - hand.rakeUC;
      const heroWonFromPot = hand.collectedUC - hand.uncalledUC;
      rakePaidUC += grossPot > 0n
        ? (hand.rakeUC * heroWonFromPot) / grossPot
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
