// verify/verify-checkpoints.mjs
// Manual verification driver. Three modes:
//
//   node verify/verify-checkpoints.mjs [1815|23795]
//     Run a fixture's checkpoint comparison. Pretty diff table. Exits 0 on
//     all-match, 2 on any mismatch.
//
//   node verify/verify-checkpoints.mjs --pin [1815|23795]
//     Compute the fixture, print the observed final values that should be
//     pasted into verify/fixtures.mjs. Also prints the checkpoint diff table
//     so you can confirm cent-exact match BEFORE pinning final values.
//     Does not modify fixtures.mjs.
//
//   node verify/verify-checkpoints.mjs --at [1815|23795] <handN> [<handN> ...]
//     Print computed cumulative EV / Winnings at arbitrary hand indices,
//     both before-rake and after-rake. No comparison — for ad-hoc spot-checks
//     against the GGPoker app.

import { FIXTURES } from './fixtures.mjs';
import { formatUSD, formatUSD6 } from '../js/stats/money.mjs';
import {
  loadAndCompute,
  compareCheckpoints,
  compareFinalPins,
  valueAt,
  ucToCentsRoundHalfUp,
  usdToCents,
} from '../tests/helpers/checkpoint-runner.mjs';

const args = process.argv.slice(2);
const mode = args[0]?.startsWith('--') ? args[0] : null;
const positional = mode ? args.slice(1) : args;
const key = positional[0] ?? '1815';

if (!FIXTURES[key]) {
  console.error(`Unknown fixture: ${key}. Available: ${Object.keys(FIXTURES).join(', ')}`);
  process.exit(1);
}
const fixture = FIXTURES[key];

console.log(`Loading fixture "${key}" — ${fixture.label}`);
for (const dir of fixture.folders) console.log(`  folder: ${dir}`);

const t0 = performance.now();
const { allHands, seriesBefore, seriesAfter, summary } = await loadAndCompute(fixture);
const dur = performance.now() - t0;
console.log(`Parsed + computed ${allHands.length} hands in ${dur.toFixed(0)} ms\n`);

if (allHands.length !== fixture.expectedHands) {
  console.error(`ERROR: expected ${fixture.expectedHands} hands, got ${allHands.length}`);
  process.exit(2);
}

// ── Mode dispatch ────────────────────────────────────────────────────────────
if (mode === '--at') {
  const handNs = positional.slice(1).map(s => parseInt(s, 10));
  if (handNs.length === 0 || handNs.some(n => !Number.isFinite(n) || n < 1 || n > allHands.length)) {
    console.error(`--at requires one or more hand indices in [1, ${allHands.length}]`);
    process.exit(1);
  }
  console.log(`Hand  | EV before | Win before | EV after | Win after`);
  console.log(`------+-----------+------------+----------+----------`);
  for (const row of valueAt(seriesBefore, seriesAfter, handNs)) {
    console.log(
      `${String(row.handN).padStart(5)} | ` +
      `${formatUSD(row.evBeforeUC).padStart(9)} | ${formatUSD(row.winBeforeUC).padStart(10)} | ` +
      `${formatUSD(row.evAfterUC).padStart(8)}  | ${formatUSD(row.winAfterUC).padStart(8)}`
    );
  }
  process.exit(0);
}

// ── Default + --pin modes share the checkpoint diff table ────────────────────
console.log(`Hand   | Win expect | Win actual         | Δ¢ |   | EV expect | EV actual          | Δ¢`);
console.log(`-------+------------+--------------------+----+   +-----------+--------------------+----`);
const fmtCents = c => (c >= 0 ? '+' : '-') + '$' + (Math.abs(c) / 100).toFixed(2);
const fmtMark = (delta, ok) => ok ? '   ' : ((delta > 0 ? '+' + delta : String(delta)).padStart(3));

const cp = compareCheckpoints(fixture, seriesBefore);
for (const [handN, expEv, expWin] of fixture.checkpoints) {
  const idx = handN - 1;
  const actWinUC = seriesBefore.winningsUC[idx];
  const actEvUC  = seriesBefore.evUC[idx];
  const actWinCents = ucToCentsRoundHalfUp(actWinUC);
  const actEvCents  = ucToCentsRoundHalfUp(actEvUC);
  const expWinCents = usdToCents(expWin);
  const expEvCents  = usdToCents(expEv);
  const dW = actWinCents - expWinCents;
  const dE = actEvCents  - expEvCents;
  const okW = dW === 0;
  const okE = dE === 0;
  console.log(
    `${String(handN).padStart(5)}  | ` +
    `${fmtCents(expWinCents).padStart(7)} | ${fmtCents(actWinCents).padStart(7)} ${formatUSD6(actWinUC).padStart(12)} | ${fmtMark(dW, okW)}${okW ? '' : '✗'}  || ` +
    `${fmtCents(expEvCents).padStart(7)} | ${fmtCents(actEvCents).padStart(7)} ${formatUSD6(actEvUC).padStart(12)} | ${fmtMark(dE, okE)}${okE ? '' : '✗'}`
  );
}
console.log();

if (mode === '--pin') {
  // Pretty diff already printed above. Now print pinning block.
  console.log(`Observed final values (paste into verify/fixtures.mjs '${key}' entry):`);
  console.log(`  finalBbPer100Before: ${summary.bbPer100Before},`);
  console.log(`  finalBbPer100After:  ${summary.bbPer100After},`);
  console.log(`  finalRakePaidUC:     ${summary.rakePaidUC}n,`);
  console.log();
  if (!cp.ok) {
    console.log(`⚠️  ${cp.mismatches.length} checkpoint mismatch(es) above — DO NOT pin until you understand why.`);
    process.exit(2);
  }
  console.log(`✅ All ${fixture.checkpoints.length} checkpoints match. Safe to pin final values.`);
  process.exit(0);
}

// Default mode — also check final pins if they're populated.
if (fixture.finalBbPer100Before == null) {
  console.log(`(Final pins not set — run with --pin ${key} to record them.)`);
  process.exit(cp.ok ? 0 : 2);
}
const pin = compareFinalPins(fixture, summary);

if (cp.ok && pin.ok) {
  console.log(`✅ All ${fixture.checkpoints.length} checkpoints match. Final pins match.`);
  console.log(`   Final at hand ${allHands.length}: green ${formatUSD(seriesBefore.winningsUC.at(-1))}, orange ${formatUSD(seriesBefore.evUC.at(-1))}`);
  process.exit(0);
}

if (!cp.ok) console.log(`❌ ${cp.mismatches.length} of ${fixture.checkpoints.length * 2} checkpoint comparisons failed`);
if (!pin.ok) {
  console.log(`❌ ${pin.mismatches.length} final pin mismatch(es):`);
  for (const m of pin.mismatches) console.log(`     ${m.field}: expected ${m.expected}, got ${m.actual}`);
}
process.exit(2);
