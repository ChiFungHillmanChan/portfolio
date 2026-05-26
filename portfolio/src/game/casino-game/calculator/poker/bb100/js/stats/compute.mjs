// js/stats/compute.mjs
// Turns Hand[] into cumulative chart series + summary stats.

import { equity, equityMultiway } from '../equity/equity.mjs';
import { encodeHand } from '../equity/cards.mjs';

// Identifier for the current compute algorithm. Bump whenever the math
// changes (rake-share formula, EV multi-way decomposition, banker rounding…).
// Used as the cache-invalidation key for pre-computed cloud-session series:
// when a saved series.json.gz has an older fingerprint, the client recomputes
// from raw hands instead of trusting the stored chart.
export const COMPUTE_FINGERPRINT = 'compute-v2-rake-only-denom-2026-05-22';

// Street → number of board cards already out when all-in was made
const STREET_BOARD_LEN = {
  preflop: 0,
  flop: 3,
  turn: 4,
  river: 5,
};

// ─── Fee helpers ──────────────────────────────────────────────────────────────
// Total fees taken OUT of the pot. Rake + Jackpot are universal; Tax is the
// EU regulatory fee (FR/IT/ES). Bingo & Fortune are GG promo BONUSES (money
// added IN to the pot, like Cash Drop) so they go in bonusInjections, not fees.
function totalFeesUC(hand) {
  return (hand.rakeUC ?? 0n) + (hand.jackpotUC ?? 0n) + (hand.taxUC ?? 0n);
}
function bonusInjectionsUC(hand) {
  return (hand.cashDropUC ?? 0n) + (hand.bingoUC ?? 0n) + (hand.fortuneUC ?? 0n);
}

// Banker's rounding (round-half-to-even) on BigInt division num / denom.
// Matches GGPoker App's internal rounding — eliminates a systematic 1 micro-cent
// drift per hand that compounds to several cents over 20K+ hands.
function bankerRound(num, denom) {
  if (denom === 0n) return 0n;
  if (num === 0n) return 0n;
  const negative = (num < 0n) !== (denom < 0n);
  const absNum = num < 0n ? -num : num;
  const absDen = denom < 0n ? -denom : denom;
  const q = absNum / absDen;
  const r = absNum % absDen;
  const doubleR = r * 2n;
  let out = q;
  if (doubleR > absDen) out = q + 1n;
  else if (doubleR === absDen) out = (q % 2n === 0n) ? q : q + 1n;
  return negative ? -out : out;
}

/**
 * Hero's pro-rata share of total fees by CONTRIBUTION — used for the "rake paid"
 * stat (matches GG App's dashboard rake stat + Hand2Note + PokerTracker):
 *
 *   share = totalFees × heroContribution / (totalPot − bonusInjections)
 *
 * Counts on every hand Hero put chips in (win or lose), not just winning hands.
 * Banker's-rounded. Use for `rakePaidUC` aggregation only.
 */
function heroRakeShareByContribution(hand) {
  const heroContrib = hand.contributedUC - hand.uncalledUC;
  if (heroContrib <= 0n) return 0n;
  const fees = totalFeesUC(hand);
  if (fees <= 0n) return 0n;
  const sumContribs = hand.totalPotUC - bonusInjectionsUC(hand);
  if (sumContribs <= 0n) return 0n;
  return bankerRound(fees * heroContrib, sumContribs);
}

/**
 * Hero's rake share by WIN (= how much rake comes "off Hero's winnings") — used
 * to convert realized P&L into "before rake" P&L.
 *
 *   share = totalFees × heroWonFromPot / SHARE_DENOM
 *   SHARE_DENOM = totalPot − rake − bonusInjections
 *
 * Empirically matches GGPoker App's "before rake" P&L view to ≤±1¢ on long
 * samples (1815 + 23795-hand fixtures, fixture A drift is within the ±1¢
 * rendering noise of GG's chart). The semantic peculiarity:
 *
 * Why subtract ONLY rake from the denominator (not jackpot + tax)?
 *   GG App's "before rake" view treats Jackpot money as still being inside the
 *   pot for share-allocation purposes, even though it's a fee in the numerator.
 *   Subtracting all fees from the denominator (NET pot semantics) produced a
 *   systematic +3¢/1815-hand drift vs GG's reading. Keeping jackpot in the
 *   denominator matches GG.
 *
 * Why win-share, not contribution-share, for "before rake":
 *   Rake is taken out of the pot before distribution. The winner is the one who
 *   would have collected those chips if no rake existed; losing players' results
 *   are unchanged whether rake exists or not (they paid what they paid). So
 *   "before-rake P&L = realized P&L + (Hero's slice of what the winner got back)".
 *
 * Banker's-rounded.
 */
function heroRakeShareByWin(hand) {
  const heroWonFromPot = hand.collectedUC - hand.uncalledUC;
  if (heroWonFromPot <= 0n) return 0n;
  const fees = totalFeesUC(hand);
  if (fees <= 0n) return 0n;
  const denom = hand.totalPotUC - (hand.rakeUC ?? 0n) - bonusInjectionsUC(hand);
  if (denom <= 0n) return 0n;
  return bankerRound(fees * heroWonFromPot, denom);
}

/**
 * Compute Hero's per-hand result in micro-cents (BigInt).
 * If beforeRake=true and Hero won something, add back Hero's win-share of fees.
 */
function perHandResult(hand, beforeRake) {
  const result = hand.collectedUC - hand.contributedUC;
  return beforeRake ? result + heroRakeShareByWin(hand) : result;
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
  //   beforeRake=true  → full pot (fees still inside)
  //   beforeRake=false → net pot (rake + jackpot + tax removed)
  // Bonuses (Cash Drop / Bingo / Fortune) stay in BOTH views — they were really
  // added to the pot and Hero's equity captures them.
  const fees = totalFeesUC(hand);
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
 * prepareHands(hands, control?) → Promise<{ hands, records }>
 *
 * Runs the slow per-hand work once — `perHandResult` and `evResult` (which
 * may invoke an exhaustive equity enumeration on all-in showdowns) — and
 * returns a per-hand record array aligned with `hands`. Filter changes can
 * then call `foldPrepared` to produce series + summary without redoing any
 * equity work; only blind addition over the kept records.
 *
 * control: { yieldEvery?: number, onProgress?: (i, total) => void }
 *   Same semantics as computeSeries — yields the event loop so the browser
 *   stays responsive on large datasets.
 *
 * Returns:
 *   hands:   reference-preserved copy of the input array (identity used as
 *            a cache key by callers).
 *   records: Array<{
 *     resultBeforeUC, resultAfterUC, evBeforeUC, evAfterUC: BigInt
 *     reachedShowdown: boolean
 *     bbUC: BigInt
 *     position: string
 *     rakeShareUC: BigInt
 *   }>
 */
export async function prepareHands(hands, control = {}) {
  const yieldEvery = control.yieldEvery | 0;
  const onProgress = control.onProgress || null;
  const total = hands.length;
  const records = new Array(total);

  for (let i = 0; i < total; i++) {
    const hand = hands[i];
    // Compute both modes — equity work inside evResult is cache-shared so
    // the second pair is ~free.
    const resultBeforeUC = perHandResult(hand, true);
    const resultAfterUC  = perHandResult(hand, false);
    const evBeforeUC     = evResult(hand, resultBeforeUC, true);
    const evAfterUC      = evResult(hand, resultAfterUC, false);
    records[i] = {
      resultBeforeUC,
      resultAfterUC,
      evBeforeUC,
      evAfterUC,
      reachedShowdown: hand.reachedShowdown,
      bbUC: hand.stake.bbUC,
      position: hand.hero.position,
      rakeShareUC: heroRakeShareByContribution(hand),
    };

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
  return { hands, records };
}

/**
 * foldPrepared(prepared, opts?, predicate?) → { series, seriesBefore, seriesAfter, summary }
 *
 * Synchronous fold over a `prepareHands` result. Pure addition over the
 * subset of records where `predicate(hand)` returns true (or all records
 * if predicate is null). Producing the chart for 30k hands here is ~10ms;
 * the slow work was paid for in prepareHands.
 *
 * Output shape is identical to computeSeries — the chart code and tests
 * see no difference.
 */
export function foldPrepared(prepared, opts = {}, predicate = null) {
  const beforeRake = Boolean(opts.beforeRake);
  const { hands, records } = prepared;
  const total = records.length;

  // --- Series accumulators (BOTH modes simultaneously) ---
  // Storing both up-front means the rake toggle in the UI just swaps which
  // pre-computed series the chart draws — no re-iteration, no progress bar.
  const winningsBeforeUC = [];
  const redBeforeUC      = [];
  const blueBeforeUC     = [];
  const evBeforeUC       = [];
  const winningsAfterUC = [];
  const redAfterUC      = [];
  const blueAfterUC     = [];
  const evAfterUC       = [];

  let cumWinBefore = 0n,  cumWinAfter = 0n;
  let cumRedBefore = 0n,  cumRedAfter = 0n;
  let cumBlueBefore = 0n, cumBlueAfter = 0n;
  let cumEvBefore = 0n,   cumEvAfter = 0n;

  // --- Summary accumulators ---
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
  let keptCount = 0;
  let bbUCSum = 0n;

  for (let i = 0; i < total; i++) {
    if (predicate && !predicate(hands[i])) continue;
    const r = records[i];
    const resultBefore = r.resultBeforeUC;
    const resultAfter  = r.resultAfterUC;
    const evBefore     = r.evBeforeUC;
    const evAfter      = r.evAfterUC;

    cumWinBefore += resultBefore;
    cumWinAfter  += resultAfter;
    cumEvBefore  += evBefore;
    cumEvAfter   += evAfter;
    if (r.reachedShowdown) {
      cumBlueBefore += resultBefore;
      cumBlueAfter  += resultAfter;
    } else {
      cumRedBefore  += resultBefore;
      cumRedAfter   += resultAfter;
    }
    winningsBeforeUC.push(cumWinBefore);
    redBeforeUC.push(cumRedBefore);
    blueBeforeUC.push(cumBlueBefore);
    evBeforeUC.push(cumEvBefore);
    winningsAfterUC.push(cumWinAfter);
    redAfterUC.push(cumRedAfter);
    blueAfterUC.push(cumBlueAfter);
    evAfterUC.push(cumEvAfter);

    // Legacy "active mode" used for position breakdown total column
    const result = beforeRake ? resultBefore : resultAfter;

    totalBeforeUC  += resultBefore;
    totalAfterUC   += resultAfter;
    evTotalBeforeUC += evBefore;
    evTotalAfterUC  += evAfter;
    if (r.bbUC > 0n) {
      const bbF = Number(r.bbUC);
      bbWeightedBefore += Number(resultBefore) / bbF;
      bbWeightedAfter  += Number(resultAfter)  / bbF;
      evBbWeightedBefore += Number(evBefore) / bbF;
      evBbWeightedAfter  += Number(evAfter)  / bbF;
    }

    const pos = r.position;
    if (!byPosition[pos]) {
      byPosition[pos] = { count: 0, totalUC: 0n };
    }
    byPosition[pos].count++;
    byPosition[pos].totalUC += result;

    rakePaidUC += r.rakeShareUC;
    bbUCSum    += r.bbUC;
    keptCount++;
  }

  // --- Summary ---
  const n = keptCount;
  // Legacy fields: matches the user-toggled mode (kept for back-compat with
  // older callers and tests).
  const totalUC   = beforeRake ? cumWinBefore : cumWinAfter;
  const evTotalUC = beforeRake ? cumEvBefore  : cumEvAfter;

  // bb/100 for both modes; bb/100 ≈ avg(result_i / bb_i) × 100
  const bbPer100Before = n > 0 ? (bbWeightedBefore / n) * 100 : 0;
  const bbPer100After  = n > 0 ? (bbWeightedAfter  / n) * 100 : 0;
  const evBbPer100Before = n > 0 ? (evBbWeightedBefore / n) * 100 : 0;
  const evBbPer100After  = n > 0 ? (evBbWeightedAfter  / n) * 100 : 0;
  // Legacy field: matches user-toggled mode
  const bbPer100 = beforeRake ? bbPer100Before : bbPer100After;

  // Rake bb/100 — same denominator (avg bb across hands), numerator = rake paid
  const avgBbUC = n > 0 ? Number(bbUCSum) / n : 0;
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

  // Build both series objects; "series" key (legacy) points at the toggled mode.
  const seriesBefore = {
    winningsUC: winningsBeforeUC,
    redUC: redBeforeUC,
    blueUC: blueBeforeUC,
    evUC:  evBeforeUC,
  };
  const seriesAfter = {
    winningsUC: winningsAfterUC,
    redUC: redAfterUC,
    blueUC: blueAfterUC,
    evUC:  evAfterUC,
  };
  const series = beforeRake ? seriesBefore : seriesAfter;

  return { series, seriesBefore, seriesAfter, summary };
}

/**
 * computeSeries(hands, opts, control?) → Promise<{ series, seriesBefore, seriesAfter, summary }>
 *
 * Composition of prepareHands + foldPrepared. Kept as a stable entry point
 * for callers that compute once and don't need to swap filters
 * (auto-merge.js post-merge recompute, migrate-stale-cache.js cache rebuild,
 * tests). The UI uses prepareHands + foldPrepared directly so filter
 * changes don't pay for the per-hand equity work twice.
 *
 * Output shape is unchanged.
 */
export async function computeSeries(hands, opts = {}, control = {}) {
  const prepared = await prepareHands(hands, control);
  return foldPrepared(prepared, opts);
}
