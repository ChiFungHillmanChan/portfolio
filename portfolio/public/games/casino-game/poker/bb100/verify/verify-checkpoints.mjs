// verify-checkpoints.mjs — compare per-100-hand cumulative green + orange
// against the user-provided GGPoker app readings for the 1815-hand sample.
//
// Pass criteria: at every checkpoint, both green and orange round-to-cent
// match the expected value EXACTLY. Any mismatch is a real bug.
//
// Run:  node verify/verify-checkpoints.mjs [hand-history-dir]

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseFile } from '../js/parser/gg-parser.mjs';
import { computeSeries } from '../js/stats/compute.mjs';
import { formatUSD, formatUSD6 } from '../js/stats/money.mjs';

const DEFAULT_DIR = '/Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8';
const DIR = process.argv[2] || DEFAULT_DIR;

// User-provided expected values from the GGPoker app's EV graph, before-rake view,
// read at every 100 hands. Source: HillmanChan, 2026-05-22 (corrected reading).
// Each tuple: [handIndex (1-based), expectedOrangeUSD, expectedGreenUSD]
const EXPECTED = [
  [100,  +0.81,  +0.81],
  [200,  +1.30,  +1.30],
  [300,  -0.28,  +0.15],
  [400,  +0.55,  +0.21],
  [500,  -0.33,  -2.17],
  [600,  -0.78,  -1.40],
  [700,  -1.21,  -3.24],
  [800,  +1.10,  -0.93],
  [900,  +1.06,  -0.97],
  [1000, +1.10,  -3.58],
  [1100, +2.35,  -1.33],
  [1200, +1.01,  -2.67],
  [1300, +0.17,  -3.51],
  [1400, +2.30,  -1.38],
  [1500, +1.06,  -1.45],
  [1600, +1.85,  -0.66],
  [1700, +8.84,  +6.33],
  [1800, +11.01, +8.50],
  [1815, +11.23, +8.72],
];

console.log(`Loading hand histories from: ${DIR}\n`);

const files = readdirSync(DIR).filter(f => f.toLowerCase().endsWith('.txt'));
if (files.length === 0) {
  console.error('No .txt files found');
  process.exit(1);
}

const allHands = [];
for (const f of files) {
  const content = readFileSync(join(DIR, f), 'utf8');
  const r = parseFile(f, content);
  const validationError = r.errors && r.errors.find(e => e.startsWith('Validation failed:'));
  if (validationError) continue;
  allHands.push(...r.hands);
}

// Same canonical sort as verify.mjs
allHands.sort((a, b) => {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return a.id.localeCompare(b.id);
});

console.log(`Hands parsed: ${allHands.length}\n`);

if (allHands.length < 1800) {
  console.error(`ERROR: need at least 1800 hands for checkpoint verification; got ${allHands.length}`);
  process.exit(1);
}

const { series } = computeSeries(allHands, { beforeRake: true });

// Round BigInt micro-cents to nearest cent (display precision).
// formatUSD already does round-half-up; we need the rounded number for comparison.
function ucToCentsRoundHalfUp(uc) {
  const sign = uc < 0n ? -1n : 1n;
  const abs = uc < 0n ? -uc : uc;
  const cents = (abs + 5000n) / 10000n; // micro-cent → cent, round half up
  return Number(sign * cents);
}

function expectedToCents(usd) {
  // usd may be e.g. +0.81 or -3.55. Multiply by 100 + round to avoid float drift.
  return Math.round(usd * 100);
}

console.log('Hand   | Green expect | Green actual | Δ¢ |   | Orange expect | Orange actual | Δ¢');
console.log('-------+--------------+--------------+----+   +---------------+---------------+----');

let allMatch = true;
let mismatchCount = 0;

for (const [handN, expOrange, expGreen] of EXPECTED) {
  const idx = handN - 1; // 1-based hand number → 0-based index
  const actGreenUC = series.winningsUC[idx];
  const actOrangeUC = series.evUC[idx];

  const actGreenCents = ucToCentsRoundHalfUp(actGreenUC);
  const actOrangeCents = ucToCentsRoundHalfUp(actOrangeUC);
  const expGreenCents = expectedToCents(expGreen);
  const expOrangeCents = expectedToCents(expOrange);

  const greenDelta = actGreenCents - expGreenCents;
  const orangeDelta = actOrangeCents - expOrangeCents;
  const greenOK = greenDelta === 0;
  const orangeOK = orangeDelta === 0;
  if (!greenOK || !orangeOK) {
    allMatch = false;
    mismatchCount++;
  }

  const fmtCents = (c) => (c >= 0 ? '+' : '-') + '$' + (Math.abs(c) / 100).toFixed(2);
  const fmtMark = (delta, ok) => ok ? '   ' : ((delta > 0 ? '+' + delta : String(delta)).padStart(3));
  console.log(
    `${String(handN).padStart(5)}  | ` +
    `${fmtCents(expGreenCents).padStart(7)} | ${fmtCents(actGreenCents).padStart(7)} ${formatUSD6(actGreenUC).padStart(12)} | ${fmtMark(greenDelta, greenOK)}${greenOK ? '' : '✗'}  || ` +
    `${fmtCents(expOrangeCents).padStart(7)} | ${fmtCents(actOrangeCents).padStart(7)} ${formatUSD6(actOrangeUC).padStart(12)} | ${fmtMark(orangeDelta, orangeOK)}${orangeOK ? '' : '✗'}`
  );
}

console.log();
if (allMatch) {
  console.log('✅ ALL 18 CHECKPOINTS MATCH (green AND orange, to the cent)');
  console.log(`   Final at hand ${allHands.length}: green ${formatUSD(series.winningsUC.at(-1))} (${formatUSD6(series.winningsUC.at(-1))}), orange ${formatUSD(series.evUC.at(-1))} (${formatUSD6(series.evUC.at(-1))})`);
  process.exit(0);
} else {
  console.log(`❌ ${mismatchCount} of 18 checkpoints have mismatches`);
  console.log(`   Final at hand ${allHands.length}: green ${formatUSD(series.winningsUC.at(-1))} (${formatUSD6(series.winningsUC.at(-1))}), orange ${formatUSD(series.evUC.at(-1))} (${formatUSD6(series.evUC.at(-1))})`);
  process.exit(2);
}
