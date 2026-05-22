// per-hand-debug.mjs — dump each hand's per-hand contribution + sub-cent fraction
// to identify hands where our calculation produces non-whole-cent values
// (where rounding mode and quantization order matter most).
//
// Run: node verify/per-hand-debug.mjs [hand-history-dir]

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseFile } from '../js/parser/gg-parser.mjs';

const DEFAULT_DIR = '/Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8';
const DIR = process.argv[2] || DEFAULT_DIR;

const files = readdirSync(DIR).filter(f => f.toLowerCase().endsWith('.txt'));
const allHands = [];
for (const f of files) {
  const r = parseFile(f, readFileSync(join(DIR, f), 'utf8'));
  allHands.push(...r.hands);
}
allHands.sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : a.id.localeCompare(b.id));

console.log(`Total hands: ${allHands.length}`);

// Inline copy of the BEFORE-RAKE per-hand formula (matches compute.mjs)
function perHandResultBeforeRake(hand) {
  const baseResult = hand.collectedUC - hand.contributedUC;
  let result = baseResult;
  const heroWonFromPot = hand.collectedUC - hand.uncalledUC;
  if (heroWonFromPot > 0n && hand.totalPotUC > hand.rakeUC) {
    const cashDrop = hand.cashDropUC ?? 0n;
    const grossPotDenom = hand.totalPotUC - hand.rakeUC - cashDrop;
    const totalFees = hand.rakeUC + (hand.jackpotUC ?? 0n);
    if (grossPotDenom > 0n) {
      const num = totalFees * heroWonFromPot;
      const rakeShare = (num + grossPotDenom / 2n) / grossPotDenom;
      result += rakeShare;
    }
  }
  return result;
}

// Find hands where the per-hand result has a fractional sub-cent component
// (i.e. result_UC % 10000 != 0 — means it's NOT a clean integer cent value)
let cumUC = 0n;
let subCentCount = 0;
let cumSubCentDelta = 0n;
const TARGET_HANDS = new Set([99, 199, 299, 399, 499, 799, 999, 1499]); // 0-based indices for hand 100, 200, ...

console.log('Hands with fractional sub-cent in per-hand contribution (first 40):');
console.log('idx | id            | resultUC      | sub¢ | cum after, cum-UC');

for (let i = 0; i < allHands.length; i++) {
  const r = perHandResultBeforeRake(allHands[i]);
  cumUC += r;
  const subCent = r % 10000n;  // micro-cents per cent = 10000
  if (subCent !== 0n) {
    subCentCount++;
    cumSubCentDelta += subCent;
    if (subCentCount <= 40) {
      console.log(
        `${String(i+1).padStart(4)} | ${allHands[i].id.padEnd(15)} | ` +
        `${r.toString().padStart(10)} | ${subCent.toString().padStart(5)} | ` +
        `${Number(cumUC) / 1e6}`
      );
    }
  }
  if (TARGET_HANDS.has(i)) {
    console.log(`  >>> CUMULATIVE at hand ${i+1}: ${Number(cumUC) / 1e6} UC  (subCent count so far: ${subCentCount}, sum of subCents: ${cumSubCentDelta} UC)`);
  }
}

console.log(`\nTotal hands with sub-cent component: ${subCentCount}`);
console.log(`Sum of sub-cent micro-cents (positive=adds, negative=subtracts): ${cumSubCentDelta} UC = $${Number(cumSubCentDelta) / 1e6}`);
console.log(`Final cumulative: $${Number(cumUC) / 1e6}`);
