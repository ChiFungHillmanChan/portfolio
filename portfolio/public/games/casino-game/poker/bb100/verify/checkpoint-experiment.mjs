// checkpoint-experiment.mjs — try multiple per-hand quantization strategies
// against the 18 user-supplied GG checkpoints. For each strategy, count how
// many checkpoints (green + orange) match to the cent.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseFile } from '../js/parser/gg-parser.mjs';

const DEFAULT_DIR = '/Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8';
const DIR = process.argv[2] || DEFAULT_DIR;

const EXPECTED = [
  [100,  +0.81,  +0.81], [200,  +1.31,  +1.31], [300,  -0.28,  +0.15],
  [400,  +0.61,  +0.27], [500,  -0.33,  -2.17], [600,  -0.84,  -1.46],
  [700,  -1.22,  -3.25], [800,  +1.15,  -0.88], [900,  +1.04,  -0.99],
  [1000, +1.13,  -3.55], [1100, +2.35,  -1.33], [1200, +1.01,  -2.67],
  [1300, +0.17,  -3.51], [1400, +2.30,  -1.38], [1500, +1.10,  -1.41],
  [1600, +1.83,  -0.68], [1700, +8.82,  +6.31], [1800, +11.04, +8.53],
];

const files = readdirSync(DIR).filter(f => f.toLowerCase().endsWith('.txt'));
const allHands = [];
for (const f of files) {
  const r = parseFile(f, readFileSync(join(DIR, f), 'utf8'));
  allHands.push(...r.hands);
}
allHands.sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : a.id.localeCompare(b.id));

// Per-hand BEFORE-RAKE result computation, parameterized by rounding strategy
function perHandResult(hand, strategy) {
  let result = hand.collectedUC - hand.contributedUC;
  const heroWonFromPot = hand.collectedUC - hand.uncalledUC;
  if (heroWonFromPot > 0n && hand.totalPotUC > hand.rakeUC) {
    const cashDrop = hand.cashDropUC ?? 0n;
    const grossPotDenom = hand.totalPotUC - hand.rakeUC - cashDrop;
    const totalFees = hand.rakeUC + (hand.jackpotUC ?? 0n);
    if (grossPotDenom > 0n) {
      const num = totalFees * heroWonFromPot;
      // Apply chosen rounding strategy to (num / grossPotDenom)
      const rakeShare = divide(num, grossPotDenom, strategy);
      result += rakeShare;
    }
  }
  return quantize(result, strategy);
}

// Apply a rounding strategy to a BigInt division a/b producing micro-cents
function divide(a, b, strategy) {
  switch (strategy) {
    case 'sum-then-display':       // baseline: round-half-up at micro-cent level
    case 'half-up-per-hand':
    case 'truncate-per-hand':
    case 'half-up-then-truncate':
    case 'half-up-cents-per-hand':
    case 'half-up-then-half-up-cents':
      return (a + b / 2n) / b;     // round-half-up micro-cents
    case 'truncate-then-truncate-cents':
      return a / b;                 // truncate micro-cents
    case 'ceiling-per-hand':
      return (a + b - 1n) / b;     // ceiling micro-cents
    default:
      return (a + b / 2n) / b;
  }
}

// After computing a per-hand result, apply post-quantization to cents (10000 UC = 1¢)
function quantize(uc, strategy) {
  const CENT = 10000n;
  switch (strategy) {
    case 'sum-then-display':
      return uc;                                          // no quantization
    case 'half-up-per-hand':
    case 'half-up-then-truncate':                         // misnomer; not used
    case 'half-up-cents-per-hand':
      return roundHalfUpToCents(uc, CENT);
    case 'truncate-per-hand':
    case 'truncate-then-truncate-cents':
      return truncateToCents(uc, CENT);
    case 'ceiling-per-hand':
      return ceilingToCents(uc, CENT);
    default:
      return uc;
  }
}

function roundHalfUpToCents(uc, CENT) {
  // Round-half-up to nearest cent, but on absolute value (so -1.005 → -1.01 magnitude-wise)
  const neg = uc < 0n;
  const abs = neg ? -uc : uc;
  const cents = (abs + CENT / 2n) / CENT;
  const out = cents * CENT;
  return neg ? -out : out;
}

function truncateToCents(uc, CENT) {
  // Truncate TOWARD ZERO
  const neg = uc < 0n;
  const abs = neg ? -uc : uc;
  const cents = abs / CENT;
  const out = cents * CENT;
  return neg ? -out : out;
}

function ceilingToCents(uc, CENT) {
  // Round away from zero
  const neg = uc < 0n;
  const abs = neg ? -uc : uc;
  const cents = (abs + CENT - 1n) / CENT;
  const out = cents * CENT;
  return neg ? -out : out;
}

function ucToCentsDisplay(uc) {
  const CENT = 10000n;
  const neg = uc < 0n;
  const abs = neg ? -uc : uc;
  const cents = (abs + CENT / 2n) / CENT;
  return Number(neg ? -cents : cents);
}

function evalStrategy(name) {
  let cumUC = 0n;
  const cumByHand = [0n];
  for (const h of allHands) {
    const r = perHandResult(h, name);
    cumUC += r;
    cumByHand.push(cumUC);
  }

  // Compare to expected (only green; orange would require EV recompute too)
  let greenMatches = 0;
  let greenSumAbsDelta = 0;
  for (const [handN, , expGreen] of EXPECTED) {
    const actualCents = ucToCentsDisplay(cumByHand[handN]);
    const expCents = Math.round(expGreen * 100);
    const delta = actualCents - expCents;
    if (delta === 0) greenMatches++;
    greenSumAbsDelta += Math.abs(delta);
  }
  const finalUC = cumByHand[allHands.length];
  const finalCents = ucToCentsDisplay(finalUC);
  return { name, greenMatches, greenSumAbsDelta, finalCents, finalUC };
}

const strategies = [
  'sum-then-display',
  'half-up-per-hand',
  'truncate-per-hand',
  'ceiling-per-hand',
];

console.log('Strategy comparison vs user-supplied 18 GREEN checkpoints + final target $8.72:\n');
console.log('Strategy                       | Green matches / 18 | Σ|Δ|¢ | Final¢ (target 872¢)');
console.log('-------------------------------+--------------------+-------+----------------------');
for (const s of strategies) {
  const r = evalStrategy(s);
  console.log(
    `${s.padEnd(30)} | ${String(r.greenMatches).padStart(6)} / 18         | ${String(r.greenSumAbsDelta).padStart(5)} | ${String(r.finalCents).padStart(4)}¢  (${r.finalUC} UC)`
  );
}
