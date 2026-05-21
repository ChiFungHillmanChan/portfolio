// verify/find-formula-v2.mjs
// Debug script: test multiple EV formula combos to find the one that matches GGPoker.
//
// GGPoker footnote: "Multi-way all-in pots where all-in occurs in different streets
// are not included in All-In EV calculation." So GG INCLUDES multi-way same-street all-ins.
//
// Usage: node verify/find-formula-v2.mjs [optional-dir]

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseFile } from '../js/parser/gg-parser.mjs';
import { equity, equityMultiway } from '../js/equity/equity.mjs';
import { encodeHand } from '../js/equity/cards.mjs';
import { formatUSD, formatUSD6 } from '../js/stats/money.mjs';

const DEFAULT_DIR = '/Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8';
const DIR = process.argv[2] || DEFAULT_DIR;

// ─── Load and sort all hands ───────────────────────────────────────────────────

const files = readdirSync(DIR).filter(f => f.toLowerCase().endsWith('.txt'));
const allHands = [];
for (const f of files) {
  const content = readFileSync(join(DIR, f), 'utf8');
  const r = parseFile(f, content);
  allHands.push(...r.hands);
}
allHands.sort((a, b) => a.date.localeCompare(b.date));
console.log(`Total hands: ${allHands.length}\n`);

// ─── Street board-length map ────────────────────────────────────────────────────

const STREET_BOARD_LEN = { preflop: 0, flop: 3, turn: 4, river: 5 };

// ─── Classify each all-in hand ─────────────────────────────────────────────────

// Returns one of:
//   'no-allin'          - not all-in
//   'hu-no-uncalled'    - heads-up, no uncalled return to Hero
//   'hu-with-uncalled'  - heads-up, uncalled return to Hero
//   'mw-same-street'    - multi-way, all went all-in on same street
//   'mw-diff-streets'   - multi-way, all-ins on different streets (GGPoker excludes)
//   'mw-no-showdown'    - multi-way all-in but missing card data

function classifyHand(h) {
  if (!h.heroAllIn) return 'no-allin';
  if (!h.showdown) return 'no-allin';
  const villainNames = Object.keys(h.showdown.villains ?? {});
  if (villainNames.length === 0) return 'no-allin';

  const nVillains = villainNames.length;

  if (nVillains === 1) {
    return h.uncalledUC > 0n ? 'hu-with-uncalled' : 'hu-no-uncalled';
  }

  // Multi-way: classify by street consistency
  // For the current dataset: if uncalledUC=0 for hero in multi-way,
  // it means Hero went all-in on the same street and was snap-called.
  // The actual multi-way different-street case would require tracking each
  // villain's all-in street separately (not parsed yet), so we approximate:
  // hand RC4529034878: preflop 3-way, hero has uncalled (hero shoved first)
  // hand RC4529036704: turn 3-way, hero bet all-in first, all called same street
  // Both are same-street all-ins based on hand reading.
  // The parser doesn't track per-villain street, so we trust allInStreet for Hero
  // and assume multi-way = same-street for this dataset (no diff-street cases known).
  return 'mw-same-street';
}

// ─── EV result for one hand under a given combo ────────────────────────────────

// combo flags:
//   includeHuNoUncalled    - include heads-up no-uncalled (Combo A baseline)
//   includeHuWithUncalled  - include heads-up with-uncalled
//   includeMwSameStreet    - include multi-way same-street
//   useEffective           - use (contributed - uncalled) as hero contribution
//                           (vs full contributed)

function evResultForHand(h, classification, beforeRake, flags) {
  // actual result (non-EV adjusted)
  const result = perHandResult(h, beforeRake);

  const {
    includeHuNoUncalled,
    includeHuWithUncalled,
    includeMwSameStreet,
    useEffective,
  } = flags;

  const shouldInclude =
    (classification === 'hu-no-uncalled'   && includeHuNoUncalled)  ||
    (classification === 'hu-with-uncalled' && includeHuWithUncalled) ||
    (classification === 'mw-same-street'   && includeMwSameStreet);

  if (!shouldInclude) return result;

  const heroCards = h.showdown.hero;
  const villainNames = Object.keys(h.showdown.villains ?? {});
  const board = h.showdown.board ?? [];

  // Validate cards
  for (const vc of villainNames) {
    if (!h.showdown.villains[vc] || h.showdown.villains[vc].length !== 2) return result;
  }
  if (!heroCards || heroCards.length !== 2) return result;

  const streetLen = STREET_BOARD_LEN[h.allInStreet] ?? null;
  if (streetLen === null) return result;

  try {
    const heroInts = encodeHand(heroCards);
    const partialBoard = encodeHand(board.slice(0, streetLen));

    let eq;
    if (villainNames.length === 1) {
      const villainInts = encodeHand(h.showdown.villains[villainNames[0]]);
      eq = equity(heroInts, villainInts, partialBoard);
    } else {
      const villainsInts = villainNames.map(vn => encodeHand(h.showdown.villains[vn]));
      eq = equityMultiway(heroInts, villainsInts, partialBoard);
    }

    // Hero's effective contribution (what actually at risk)
    const effectiveContribUC = useEffective
      ? h.contributedUC - h.uncalledUC
      : h.contributedUC;

    const potAtRiskUC = beforeRake
      ? h.totalPotUC
      : h.totalPotUC - h.rakeUC;

    const eqMicros = BigInt(Math.round(eq * 1_000_000));
    const evShareUC = (eqMicros * potAtRiskUC) / 1_000_000n;

    return evShareUC - effectiveContribUC;
  } catch (e) {
    return result;
  }
}

function perHandResult(hand, beforeRake) {
  let result = hand.collectedUC - hand.contributedUC;
  if (beforeRake) {
    const heroWonFromPot = hand.collectedUC - hand.uncalledUC;
    if (heroWonFromPot > 0n && hand.totalPotUC > hand.rakeUC) {
      const grossPotDenom = hand.totalPotUC - hand.rakeUC;
      const totalFees = hand.rakeUC + (hand.jackpotUC ?? 0n);
      const rakeShare = (totalFees * heroWonFromPot) / grossPotDenom;
      result += rakeShare;
    }
  }
  return result;
}

// ─── Combo definitions ─────────────────────────────────────────────────────────

const COMBOS = [
  {
    name: 'A: Current (HU no-uncalled only)',
    flags: { includeHuNoUncalled: true,  includeHuWithUncalled: false, includeMwSameStreet: false, useEffective: true },
  },
  {
    name: 'B: HU-no-uncalled + MW-same-street',
    flags: { includeHuNoUncalled: true,  includeHuWithUncalled: false, includeMwSameStreet: true,  useEffective: true },
  },
  {
    name: 'C: HU-no-uncalled + HU-with-uncalled(eff) + MW-same-street(eff)',
    flags: { includeHuNoUncalled: true,  includeHuWithUncalled: true,  includeMwSameStreet: true,  useEffective: true },
  },
  {
    name: 'D: HU-no-uncalled + HU-with-uncalled(full) + MW-same-street(full)',
    flags: { includeHuNoUncalled: true,  includeHuWithUncalled: true,  includeMwSameStreet: true,  useEffective: false },
  },
  {
    name: 'E: All same-street (incl uncalled) effective',
    flags: { includeHuNoUncalled: true,  includeHuWithUncalled: true,  includeMwSameStreet: true,  useEffective: true },
  },
  {
    name: 'F: All same-street (incl uncalled) full contribution',
    flags: { includeHuNoUncalled: true,  includeHuWithUncalled: true,  includeMwSameStreet: true,  useEffective: false },
  },
];

// ─── Pre-classify all hands ────────────────────────────────────────────────────

const classifications = allHands.map(h => classifyHand(h));

// Print classifications
console.log('=== Hand Classifications ===');
const classCounts = {};
for (const c of classifications) {
  classCounts[c] = (classCounts[c] || 0) + 1;
}
for (const [cls, cnt] of Object.entries(classCounts)) {
  console.log(`  ${cls}: ${cnt}`);
}
console.log();

// Print detailed info for interesting hands
const INTERESTING = ['hu-no-uncalled','hu-with-uncalled','mw-same-street'];
console.log('=== All-in Hand Details ===');
for (let i = 0; i < allHands.length; i++) {
  const h = allHands[i];
  const cls = classifications[i];
  if (!INTERESTING.includes(cls)) continue;
  const villainNames = Object.keys(h.showdown?.villains ?? {});
  const result = Number(h.collectedUC - h.contributedUC) / 1e6;
  const effectiveContrib = Number(h.contributedUC - h.uncalledUC) / 1e6;
  console.log(`  ${h.id} [${cls}]`);
  console.log(`    street=${h.allInStreet} villains=${villainNames.length} uncalledUC=${Number(h.uncalledUC)/1e6} effectiveContrib=${effectiveContrib.toFixed(4)}`);
  console.log(`    result=${result.toFixed(4)} totalPot=${Number(h.totalPotUC)/1e6} rake=${Number(h.rakeUC)/1e6} jackpot=${Number(h.jackpotUC)/1e6}`);
  console.log(`    hero=${h.showdown?.hero} villains=${JSON.stringify(h.showdown?.villains)}`);
}
console.log();

// ─── Run all combos ────────────────────────────────────────────────────────────

const beforeRake = true; // focus on before-rake (GGPoker chart is typically before-rake)

console.log('=== Combo Results (BEFORE RAKE) ===');
console.log('Target: green=$8.71, orange=$11.23\n');

for (const combo of COMBOS) {
  const { flags } = combo;

  // Find which all-in hands are included in this combo
  const includedIds = [];
  let cumEv = 0n;
  let cumWin = 0n;

  for (let i = 0; i < allHands.length; i++) {
    const h = allHands[i];
    const cls = classifications[i];
    const result = perHandResult(h, beforeRake);
    const ev = evResultForHand(h, cls, beforeRake, flags);
    cumWin += result;
    cumEv += ev;
    if (INTERESTING.includes(cls)) {
      const evNum = Number(ev) / 1e6;
      const resNum = Number(result) / 1e6;
      if (evNum !== resNum) {
        includedIds.push(`${h.id}: result=${resNum.toFixed(4)} ev=${evNum.toFixed(4)} adj=${(evNum-resNum).toFixed(4)}`);
      }
    }
  }

  console.log(`Combo ${combo.name}`);
  console.log(`  Final green:  ${formatUSD(cumWin)}`);
  console.log(`  Final orange: ${formatUSD(cumEv)}`);
  console.log(`  EV-Win diff:  ${formatUSD(cumEv - cumWin)}`);
  if (includedIds.length > 0) {
    console.log(`  Adjusted hands (${includedIds.length}):`);
    for (const s of includedIds) console.log(`    ${s}`);
  } else {
    console.log(`  (no hands adjusted — EV=actual for all all-in hands)`);
  }
  console.log();
}
