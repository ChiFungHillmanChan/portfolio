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
      // grossPotDenom = totalPot - rake - cashDrop
      // Cash Drop is GG bonus money injected into the pot that no player contributed,
      // so it shouldn't be in the denominator when computing each player's rake share.
      const cashDrop = hand.cashDropUC ?? 0n;
      const grossPotDenom = hand.totalPotUC - hand.rakeUC - cashDrop;
      // totalFees = rake + jackpot (all fees taken from the pot)
      const totalFees = hand.rakeUC + (hand.jackpotUC ?? 0n);
      if (grossPotDenom > 0n) {
        // Round-half-up BigInt division: (a + c/2) / c instead of a / c
        // Eliminates the systematic downward truncation that costs ~1¢ across many hands.
        const num = totalFees * heroWonFromPot;
        const rakeShare = (num + grossPotDenom / 2n) / grossPotDenom;
        result += rakeShare;
      }
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
 * computeSeries(hands, opts, control?) → Promise<{ series, summary }>
 *
 * opts.beforeRake: boolean
 *   true  → add Hero's rake share back on winning hands (gross view)
 *   false → report net-of-rake results (default)
 *
 * control: { yieldEvery?: number, onProgress?: (i, total) => void }
 *   When yieldEvery > 0, the function yields to the event loop after that
 *   many hands so the browser stays responsive on large datasets. Each yield
 *   first calls onProgress(i, total). When yieldEvery = 0 (default), no
 *   yielding happens — the function returns a resolved Promise immediately.
 *   Useful for Node scripts that don't need to share the event loop.
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
export async function computeSeries(hands, opts = {}, control = {}) {
  const beforeRake = Boolean(opts.beforeRake);
  const yieldEvery = control.yieldEvery | 0;
  const onProgress = control.onProgress || null;

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
  // We track BOTH "before rake" and "after rake" totals + bb/100 in one pass
  // so the UI can show both side-by-side without a second compute call.
  // The equity work inside evResult is shared via the cache, so calling
  // evResult twice per hand is essentially the same cost as once.
  const byPosition = {};  // { [pos]: { count, totalUC } } — uses requested mode
  let bbWeightedBefore = 0;
  let bbWeightedAfter = 0;
  let evBbWeightedBefore = 0;
  let evBbWeightedAfter = 0;
  let totalBeforeUC = 0n;
  let totalAfterUC = 0n;
  let evTotalBeforeUC = 0n;
  let evTotalAfterUC = 0n;
  let rakePaidUC   = 0n;

  const total = hands.length;
  for (let i = 0; i < total; i++) {
    const hand = hands[i];
    // Compute both modes — equity work inside evResult is cache-shared so
    // the second pair is ~free.
    const resultBefore = perHandResult(hand, true);
    const resultAfter  = perHandResult(hand, false);
    const evBefore     = evResult(hand, resultBefore, true);
    const evAfter      = evResult(hand, resultAfter, false);

    // What goes on the chart (cumulative series) is the user-toggled mode.
    const result = beforeRake ? resultBefore : resultAfter;
    const ev     = beforeRake ? evBefore     : evAfter;

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

    // Totals + bb-weighted sums for both modes
    totalBeforeUC  += resultBefore;
    totalAfterUC   += resultAfter;
    evTotalBeforeUC += evBefore;
    evTotalAfterUC  += evAfter;
    const bbUC = hand.stake.bbUC;
    if (bbUC > 0n) {
      const bbF = Number(bbUC);
      bbWeightedBefore += Number(resultBefore) / bbF;
      bbWeightedAfter  += Number(resultAfter)  / bbF;
      evBbWeightedBefore += Number(evBefore) / bbF;
      evBbWeightedAfter  += Number(evAfter)  / bbF;
    }

    // Position breakdown — uses the user-toggled mode for the dollar column
    const pos = hand.hero.position;
    if (!byPosition[pos]) {
      byPosition[pos] = { count: 0, totalUC: 0n };
    }
    byPosition[pos].count++;
    byPosition[pos].totalUC += result;

    // Rake paid (Hero's share on winning hands, always after-rake perspective)
    // Same round-half-up formula as the per-hand result; same Cash Drop adjustment.
    const heroWonFromPotRake = hand.collectedUC - hand.uncalledUC;
    if (heroWonFromPotRake > 0n && hand.totalPotUC > hand.rakeUC) {
      const cashDrop = hand.cashDropUC ?? 0n;
      const grossPotDenom = hand.totalPotUC - hand.rakeUC - cashDrop;
      const totalFees = hand.rakeUC + (hand.jackpotUC ?? 0n);
      if (grossPotDenom > 0n) {
        const num = totalFees * heroWonFromPotRake;
        rakePaidUC += (num + grossPotDenom / 2n) / grossPotDenom;
      }
    }

    // Yield to event loop periodically so the browser stays responsive on
    // large datasets. The slow part is evResult()'s exhaustive equity enum
    // (~1.1s/hand for preflop all-ins, hits cache after first occurrence).
    //
    // Two triggers:
    //   1. every `yieldEvery` hands (covers steady-state)
    //   2. immediately after any hand that hit the equity path (anyAllIn +
    //      showdown). One uncached preflop matchup can be 1.1s on its own;
    //      if several cluster in one yieldEvery window, the gap exceeds
    //      Chrome's 5s "page unresponsive" threshold. Yielding right after
    //      each suspected-heavy hand bounds the gap to ~one hand's work.
    const didEquityWork = hand.anyAllIn && hand.reachedShowdown && hand.showdown;
    const shouldYield =
      yieldEvery > 0 &&
      i + 1 < total &&
      ((i + 1) % yieldEvery === 0 || didEquityWork);
    if (shouldYield) {
      if (onProgress) onProgress(i + 1, total);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  if (onProgress) onProgress(total, total);

  // --- Summary ---
  const n = hands.length;
  const totalUC   = cumWin;          // matches the user-toggled mode (legacy)
  const evTotalUC = cumEv;            // matches the user-toggled mode (legacy)

  // bb/100 for both modes; bb/100 ≈ avg(result_i / bb_i) × 100
  const bbPer100Before = n > 0 ? (bbWeightedBefore / n) * 100 : 0;
  const bbPer100After  = n > 0 ? (bbWeightedAfter  / n) * 100 : 0;
  const evBbPer100Before = n > 0 ? (evBbWeightedBefore / n) * 100 : 0;
  const evBbPer100After  = n > 0 ? (evBbWeightedAfter  / n) * 100 : 0;
  // Legacy field: matches user-toggled mode
  const bbPer100 = beforeRake ? bbPer100Before : bbPer100After;

  // Rake bb/100 — same denominator (avg bb across hands), numerator = rake paid
  let avgBbUC = 0;
  if (n > 0) {
    avgBbUC = Number(hands.reduce((s, h) => s + h.stake.bbUC, 0n)) / n;
  }
  const rakeBbPer100 = avgBbUC > 0
    ? (Number(rakePaidUC) / avgBbUC / n) * 100
    : 0;

  const summary = {
    hands: n,
    // Legacy fields (preserve existing callers/tests)
    totalUC,
    evTotalUC,
    evMinusWinUC: evTotalUC - totalUC,
    bbPer100,
    byPosition,
    rakePaidUC,
    rakeBbPer100,
    // New: both modes available simultaneously
    totalBeforeUC,
    totalAfterUC,
    evTotalBeforeUC,
    evTotalAfterUC,
    bbPer100Before,
    bbPer100After,
    evBbPer100Before,
    evBbPer100After,
  };

  const series = { winningsUC, redUC, blueUC, evUC };

  return { series, summary };
}
