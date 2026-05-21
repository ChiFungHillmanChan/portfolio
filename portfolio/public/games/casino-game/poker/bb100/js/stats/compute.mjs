// js/stats/compute.mjs
// Turns Hand[] into cumulative chart series + summary stats.

import { equity, equityMultiway } from '../equity/equity.mjs';
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
      // Round-half-up BigInt division: (a + c/2) / c instead of a / c
      // Eliminates the systematic downward truncation that costs ~1¢ across many hands.
      const num = totalFees * heroWonFromPot;
      const rakeShare = (num + grossPotDenom / 2n) / grossPotDenom;
      result += rakeShare;
    }
    // For losing hands: rakeShare = 0n (no change)
  }

  return result;
}

/**
 * Compute EV-adjusted result for one hand.
 * Falls back to result_i if all-in EV can't be computed.
 *
 * Trigger: any hand where SOMEONE went all-in AND Hero reached showdown.
 * Four scenarios handled:
 *   1. Heads-up, Hero all-in, fully matched (uncalled=0)
 *   2. Heads-up, Hero all-in WITH uncalled return (Hero deeper than villain)
 *   3. Heads-up, villain-only all-in (Hero called for less than full stack)
 *   4. Multi-way, same-street all-in → side-pot decomposition
 */
function evResult(hand, result, beforeRake) {
  // Trigger: ANY player went all-in AND Hero reached showdown with cards known
  if (!hand.anyAllIn || !hand.reachedShowdown || !hand.showdown) return result;

  const villains = hand.showdown.villains ?? {};
  const villainNames = Object.keys(villains);
  if (villainNames.length === 0) return result;

  // Hero's effective contribution = what Hero actually had at risk (excluding returned excess)
  const heroEffective = hand.contributedUC - hand.uncalledUC;
  if (heroEffective <= 0n) return result;

  // Pot at risk:
  //   beforeRake=true  → full pot (rake still inside)
  //   beforeRake=false → net pot (rake removed)
  const fees = hand.rakeUC + (hand.jackpotUC ?? 0n);
  const potAtRiskUC = beforeRake
    ? hand.totalPotUC
    : hand.totalPotUC - fees;

  // Determine street at which money went all-in.
  // Prefer hand.allInStreet (Hero went all-in) over anyAllInStreet (villain went all-in).
  const street = hand.allInStreet ?? hand.anyAllInStreet;
  const streetLen = STREET_BOARD_LEN[street];
  if (streetLen == null) return result;

  const board = hand.showdown.board ?? [];

  try {
    const heroCards = encodeHand(hand.showdown.hero);
    const partialBoard = encodeHand(board.slice(0, streetLen));

    if (villainNames.length === 1) {
      // ── Heads-up (cases 1, 2, 3) ──
      const villainCards = encodeHand(villains[villainNames[0]]);
      const eq = equity(heroCards, villainCards, partialBoard);
      const eqMicros = BigInt(Math.round(eq * 1_000_000));
      const evShareUC = (eqMicros * potAtRiskUC) / 1_000_000n;
      return evShareUC - heroEffective;
    }

    // ── Multi-way (case 4) — side-pot decomposition ──
    // Build player list with their effective contributions at the time of all-in.
    // For Hero: heroEffective (contributedUC - uncalledUC).
    // For villains: use contributions tracked by parser (already net of uncalled returns).
    const players = [
      { name: 'Hero', cards: heroCards, contrib: heroEffective },
    ];
    for (const name of villainNames) {
      const contrib = hand.contributions?.[name] ?? 0n;
      if (contrib <= 0n) continue;
      players.push({ name, cards: encodeHand(villains[name]), contrib });
    }
    if (players.length < 2) return result;

    // Dead money = totalPot - sum of showdown players' contributions
    // (Dead = folded players' money + antes if any)
    let sumContribs = 0n;
    for (const p of players) sumContribs += p.contrib;
    // For after-rake: deduct fees from pot too
    const deadInPot = hand.totalPotUC - sumContribs - (beforeRake ? 0n : fees);

    // Sort by contribution ascending (lowest stack = main pot player first)
    players.sort((a, b) => {
      if (a.contrib < b.contrib) return -1;
      if (a.contrib > b.contrib) return 1;
      return 0;
    });

    let heroEv = 0n;
    let prevTier = 0n;
    let remainingPlayers = players.length;
    let firstPot = true;

    for (const p of players) {
      const tierContrib = p.contrib - prevTier;
      if (tierContrib <= 0n) {
        prevTier = p.contrib;
        remainingPlayers--;
        continue;
      }

      // Pot size for this tier = tierContrib × remaining players
      let potSize = tierContrib * BigInt(remainingPlayers);
      if (firstPot && deadInPot > 0n) {
        // Main pot absorbs all dead money from folded players
        potSize += deadInPot;
        firstPot = false;
      } else {
        firstPot = false;
      }

      // Contestants in this tier: players whose total contrib >= p.contrib
      const contestants = players.filter(x => x.contrib >= p.contrib);
      const heroInContestants = contestants.some(x => x.name === 'Hero');

      if (heroInContestants && potSize > 0n) {
        const others = contestants.filter(x => x.name !== 'Hero');
        let eq;
        if (others.length === 1) {
          eq = equity(heroCards, others[0].cards, partialBoard);
        } else if (others.length === 0) {
          // Hero is the only contestant — wins it all
          eq = 1.0;
        } else {
          eq = equityMultiway(heroCards, others.map(o => o.cards), partialBoard);
        }
        const eqMicros = BigInt(Math.round(eq * 1_000_000));
        heroEv += (eqMicros * potSize) / 1_000_000n;
      }

      prevTier = p.contrib;
      remainingPlayers--;
    }

    return heroEv - heroEffective;
  } catch {
    // Any card-encoding or equity error → fall back to actual result
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
    // Same round-half-up formula as the per-hand result.
    const heroWonFromPotRake = hand.collectedUC - hand.uncalledUC;
    if (heroWonFromPotRake > 0n && hand.totalPotUC > hand.rakeUC) {
      const grossPotDenom = hand.totalPotUC - hand.rakeUC;
      const totalFees = hand.rakeUC + (hand.jackpotUC ?? 0n);
      if (grossPotDenom > 0n) {
        const num = totalFees * heroWonFromPotRake;
        rakePaidUC += (num + grossPotDenom / 2n) / grossPotDenom;
      }
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
