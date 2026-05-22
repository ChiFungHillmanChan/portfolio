// verify/verify.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseFile } from '../js/parser/gg-parser.mjs';
import { computeSeries } from '../js/stats/compute.mjs';
import { formatUSD, formatUSD6 } from '../js/stats/money.mjs';
import { equityCacheSize } from '../js/equity/equity.mjs';

const DEFAULT_DIR = '/Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8';
const DIR = process.argv[2] || DEFAULT_DIR;

console.log(`Loading hand histories from: ${DIR}\n`);

let files;
try {
  files = readdirSync(DIR).filter(f => f.toLowerCase().endsWith('.txt'));
} catch (e) {
  console.error(`Error: could not read ${DIR}: ${e.message}`);
  process.exit(1);
}

if (files.length === 0) {
  console.error('No .txt files found');
  process.exit(1);
}

const allHands = [];
let totalSkipped = 0;
let totalRejected = 0;
const startParse = performance.now();

for (const f of files) {
  const content = readFileSync(join(DIR, f), 'utf8');
  const r = parseFile(f, content);
  // Validation failure is signalled by an error starting with "Validation failed:"
  const validationError = r.errors && r.errors.find(e => e.startsWith('Validation failed:'));
  if (validationError) {
    console.log(`  REJECTED ${f}: ${validationError}`);
    totalRejected++;
    continue;
  }
  console.log(`  ${f}: ${r.hands.length} hands (${r.skipped} skipped)`);
  allHands.push(...r.hands);
  totalSkipped += r.skipped;
}

allHands.sort((a, b) => {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return a.id.localeCompare(b.id);
});

const parseDuration = performance.now() - startParse;

console.log(`\n========================================`);
console.log(`Hands parsed:               ${allHands.length}`);
console.log(`Hands skipped:              ${totalSkipped}`);
console.log(`Files rejected:             ${totalRejected}`);
console.log(`Parse + equity duration:    ${parseDuration.toFixed(0)} ms`);
console.log(`========================================\n`);

for (const beforeRake of [false, true]) {
  console.log(`=== ${beforeRake ? 'BEFORE RAKE' : 'AFTER RAKE'} ===`);
  const t0 = performance.now();
  const { series, summary } = await computeSeries(allHands, { beforeRake });
  const dur = performance.now() - t0;
  console.log(`(compute duration: ${dur.toFixed(0)} ms)`);

  if (series.winningsUC.length === 0) {
    console.log(`(no hands)`);
    continue;
  }

  console.log(`Final Winnings (green):     ${formatUSD(series.winningsUC.at(-1)).padEnd(10)}  ${formatUSD6(series.winningsUC.at(-1))}`);
  console.log(`Final All-in EV (orange):   ${formatUSD(series.evUC.at(-1)).padEnd(10)}  ${formatUSD6(series.evUC.at(-1))}`);
  console.log(`Red line final:             ${formatUSD(series.redUC.at(-1)).padEnd(10)}  ${formatUSD6(series.redUC.at(-1))}`);
  console.log(`Blue line final:            ${formatUSD(series.blueUC.at(-1)).padEnd(10)}  ${formatUSD6(series.blueUC.at(-1))}`);
  console.log(`bb/100:                     ${summary.bbPer100.toFixed(2)}`);
  console.log(`All-in EV − Winnings:       ${formatUSD(summary.evMinusWinUC)}`);
  console.log(`Rake paid (absolute):       ${formatUSD(summary.rakePaidUC)} (${summary.rakeBbPer100.toFixed(2)} bb/100)`);
  console.log(`Position breakdown:`);
  // Sort positions in canonical order
  const POS_ORDER = ['UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  const positions = Object.entries(summary.byPosition).sort((a, b) => {
    const ai = POS_ORDER.indexOf(a[0]); const bi = POS_ORDER.indexOf(b[0]);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
  for (const [pos, { count, totalUC }] of positions) {
    console.log(`  ${pos.padEnd(4)}: ${String(count).padStart(4)} hands, ${formatUSD(totalUC)}`);
  }
  console.log();
}

console.log(`Equity cache size (preflop matchups): ${equityCacheSize()}`);
