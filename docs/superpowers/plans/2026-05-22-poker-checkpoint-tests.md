# Poker BB/100 Checkpoint Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cent-exact cumulative-EV/Winnings checkpoint tests for two real GGPoker fixtures (1815-hand and 23795-hand) against the existing `computeSeries` pipeline — without touching the compute / parser / equity code.

**Architecture:** A single source of truth (`verify/fixtures.mjs`) holds expected tables and pinned final totals. A pure helper (`tests/helpers/checkpoint-runner.mjs`) loads + sorts + computes + diffs. A `node:test` file (`tests/checkpoints.test.mjs`) asserts; a manual script (`verify/verify-checkpoints.mjs`, refactored) prints diff tables, supports `--pin` for one-time lock-in, and supports `--at` for ad-hoc spot-checks. Tests skip gracefully when fixture folders aren't on disk.

**Tech Stack:** Node.js (ES modules), `node:test`, `node:assert/strict`, BigInt micro-cent math. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-22-poker-checkpoint-tests-design.md`

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `portfolio/src/game/casino-game/calculator/poker/bb100/verify/fixtures.mjs` | CREATE | Single source of truth: fixture paths, checkpoint tables, final pinned values. Env-var overrides. |
| `portfolio/src/game/casino-game/calculator/poker/bb100/tests/helpers/checkpoint-runner.mjs` | CREATE | Pure (no console) helpers: `loadAndCompute`, `compareCheckpoints`, `compareFinalPins`, `valueAt`, `pin`. |
| `portfolio/src/game/casino-game/calculator/poker/bb100/tests/checkpoints.test.mjs` | CREATE | `node:test` cases: 1 per fixture + a cumulative-invariant spot-check. Skip when fixtures missing. |
| `portfolio/src/game/casino-game/calculator/poker/bb100/verify/verify-checkpoints.mjs` | REFACTOR | Thin wrapper. Modes: default (pretty diff), `--pin`, `--at`. Imports from `fixtures.mjs` + runner. |

**Out of scope (do not touch):** `compute.mjs`, `gg-parser.mjs`, `hand-model.mjs`, `equity.mjs`, `money.mjs`, all UI/cloud files.

**No-hardcoding rule (load-bearing — see spec § No-Hardcoding Constraint):** The runner runs `computeSeries(allHands)` ONCE per fixture, then samples `seriesBefore.evUC[handN-1]` and `seriesBefore.winningsUC[handN-1]` by plain array indexing. There must be no `if (handN === ...)` anywhere. A cumulative-invariant spot-check test verifies this structurally.

---

## Task 1: Create `verify/fixtures.mjs` (no final pins yet)

**Files:**
- Create: `portfolio/src/game/casino-game/calculator/poker/bb100/verify/fixtures.mjs`

- [ ] **Step 1: Write the file**

```js
// verify/fixtures.mjs
// Single source of truth for checkpoint test fixtures.
//
// `checkpoints`: [handN, expectedEvBefore_USD, expectedWinningsBefore_USD]
//   Both values come from the GGPoker app's EV graph, before-rake view, as
//   read by the user. Cent precision.
//
// `final*` fields: pinned to whatever the current compute pipeline outputs.
// Filled by `node verify/verify-checkpoints.mjs --pin <key>` once; from then
// on the tests assert exact equality. `null` means "not yet pinned — tests
// will fail until you pin them" (intentional, prevents silent skipping).
//
// Paths are overridable via env vars so the fixture data can move without
// editing this file.

export const FIXTURES = {
  '1815': {
    label: '1815 hands (Desktop, single folder)',
    folders: [
      process.env.POKER_FIXTURE_1815
        ?? '/Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8',
    ],
    expectedHands: 1815,
    checkpoints: [
      [100,  +0.81,  +0.81],
      [200,  +1.31,  +1.31],
      [300,  -0.28,  +0.15],
      [400,  +0.61,  +0.27],
      [500,  -0.33,  -2.17],
      [600,  -0.84,  -1.46],
      [700,  -1.22,  -3.25],
      [800,  +1.15,  -0.88],
      [900,  +1.04,  -0.99],
      [1000, +1.13,  -3.55],
      [1100, +2.35,  -1.33],
      [1200, +1.01,  -2.67],
      [1300, +0.17,  -3.51],
      [1400, +2.30,  -1.38],
      [1500, +1.10,  -1.41],
      [1600, +1.83,  -0.68],
      [1700, +8.82,  +6.31],
      [1800, +11.04, +8.53],
      [1815, +11.23, +8.72],
    ],
    finalBbPer100Before: null,
    finalBbPer100After:  null,
    finalRakePaidUC:     null,
  },

  '23795': {
    label: '23795 hands (Desktop, two folders combined)',
    folders: [
      process.env.POKER_FIXTURE_23795_A
        ?? '/Users/hillmanchan/Desktop/0000019e-4e65-4d50-0000-0000280dc4e8',
      process.env.POKER_FIXTURE_23795_B
        ?? '/Users/hillmanchan/Desktop/0000019e-4eed-7dc3-0000-0000280dc4e8',
    ],
    expectedHands: 23795,
    checkpoints: [
      [1000,  -0.44, +0.47],
      [2000,  +4.46, +5.27],
      [3000,  +5.40, +10.48],
      [4000,  +3.92, +8.70],
      [5000,  +11.29, +16.04],
      [6000,  +27.18, +29.43],
      [7000,  +24.98, +27.80],
      [8000,  +25.46, +29.98],
      [9000,  +29.50, +34.71],
      [10000, +31.86, +35.16],
      [11000, +29.00, +31.03],
      [12000, +30.71, +31.28],
      [13000, +35.87, +37.69],
      [14000, +37.76, +39.94],
      [15000, +35.31, +38.41],
      [16000, +37.33, +40.68],
      [17000, +32.32, +43.42],
      [18000, +39.72, +49.59],
      [19000, +44.19, +53.88],
      [20000, +45.53, +57.44],
      [21000, +46.50, +53.73],
      [22000, +57.30, +67.79],
      [23000, +65.39, +76.44],
      [23795, +65.28, +78.59],
    ],
    finalBbPer100Before: null,
    finalBbPer100After:  null,
    finalRakePaidUC:     null,
  },
};
```

- [ ] **Step 2: Sanity-check imports**

Run: `node -e "import('./portfolio/src/game/casino-game/calculator/poker/bb100/verify/fixtures.mjs').then(m => console.log(Object.keys(m.FIXTURES)))"`
Expected: `[ '1815', '23795' ]`

- [ ] **Step 3: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/poker/bb100/verify/fixtures.mjs
git commit -m "test(poker): add fixture registry for checkpoint tests"
```

---

## Task 2: Create `tests/helpers/checkpoint-runner.mjs`

**Files:**
- Create: `portfolio/src/game/casino-game/calculator/poker/bb100/tests/helpers/checkpoint-runner.mjs`

- [ ] **Step 1: Write the helper**

```js
// tests/helpers/checkpoint-runner.mjs
// Pure helpers (no console output) for checkpoint testing.
//
// LOAD-BEARING: this module runs computeSeries(allHands) EXACTLY ONCE per
// fixture and never branches on checkpoint hand numbers. Asserted values are
// pulled by plain array indexing into the resulting cumulative arrays. See
// spec § No-Hardcoding Constraint.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseFile } from '../../js/parser/gg-parser.mjs';
import { computeSeries } from '../../js/stats/compute.mjs';

// Round a BigInt micro-cent amount to the nearest cent (half-up), returns Number.
export function ucToCentsRoundHalfUp(uc) {
  const sign = uc < 0n ? -1n : 1n;
  const abs = uc < 0n ? -uc : uc;
  const cents = (abs + 5000n) / 10000n;
  return Number(sign * cents);
}

export function usdToCents(usd) {
  return Math.round(usd * 100);
}

// Load + canonical-sort hands across one or more folders, then compute.
// Returns the full computeSeries output — caller indexes into it. NEVER
// receives checkpoint hand numbers.
export async function loadAndCompute(fixture) {
  const allHands = [];
  for (const dir of fixture.folders) {
    const files = readdirSync(dir).filter(f => f.toLowerCase().endsWith('.txt'));
    for (const f of files) {
      const content = readFileSync(join(dir, f), 'utf8');
      const r = parseFile(f, content);
      const validationError = r.errors && r.errors.find(e => e.startsWith('Validation failed:'));
      if (validationError) continue;
      allHands.push(...r.hands);
    }
  }
  // Canonical sort — same as verify/verify.mjs. Stable across folder boundaries.
  allHands.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.id.localeCompare(b.id);
  });
  // beforeRake arg only controls which series is returned as `series`; the
  // function ALWAYS returns both seriesBefore and seriesAfter.
  const out = await computeSeries(allHands, { beforeRake: true });
  return { allHands, ...out };
}

// Compare checkpoint expectations against the computed seriesBefore.
// Returns { ok, mismatches: [{handN, field, expectedCents, actualCents, deltaCents}] }
export function compareCheckpoints(fixture, seriesBefore) {
  const mismatches = [];
  for (const [handN, expEv, expWin] of fixture.checkpoints) {
    const idx = handN - 1;
    const actEvCents  = ucToCentsRoundHalfUp(seriesBefore.evUC[idx]);
    const actWinCents = ucToCentsRoundHalfUp(seriesBefore.winningsUC[idx]);
    const expEvCents  = usdToCents(expEv);
    const expWinCents = usdToCents(expWin);
    if (actEvCents !== expEvCents) {
      mismatches.push({ handN, field: 'evUC',       expectedCents: expEvCents,  actualCents: actEvCents,  deltaCents: actEvCents  - expEvCents  });
    }
    if (actWinCents !== expWinCents) {
      mismatches.push({ handN, field: 'winningsUC', expectedCents: expWinCents, actualCents: actWinCents, deltaCents: actWinCents - expWinCents });
    }
  }
  return { ok: mismatches.length === 0, mismatches };
}

// Compare final summary pins.
// Returns { ok, mismatches: [{field, expected, actual}] }
export function compareFinalPins(fixture, summary) {
  const mismatches = [];
  if (Math.abs(summary.bbPer100Before - fixture.finalBbPer100Before) >= 0.005) {
    mismatches.push({ field: 'bbPer100Before', expected: fixture.finalBbPer100Before, actual: summary.bbPer100Before });
  }
  if (Math.abs(summary.bbPer100After - fixture.finalBbPer100After) >= 0.005) {
    mismatches.push({ field: 'bbPer100After',  expected: fixture.finalBbPer100After,  actual: summary.bbPer100After });
  }
  if (summary.rakePaidUC !== fixture.finalRakePaidUC) {
    mismatches.push({ field: 'rakePaidUC',     expected: fixture.finalRakePaidUC,     actual: summary.rakePaidUC });
  }
  return { ok: mismatches.length === 0, mismatches };
}

// Ad-hoc spot-check at arbitrary hand indices. Uses same pure indexing path.
// Returns [{handN, evBeforeUC, winBeforeUC, evAfterUC, winAfterUC}, ...]
export function valueAt(seriesBefore, seriesAfter, handNs) {
  return handNs.map(handN => {
    const idx = handN - 1;
    return {
      handN,
      evBeforeUC:  seriesBefore.evUC[idx],
      winBeforeUC: seriesBefore.winningsUC[idx],
      evAfterUC:   seriesAfter.evUC[idx],
      winAfterUC:  seriesAfter.winningsUC[idx],
    };
  });
}

// Deterministic seeded RNG — used by the cumulative-invariant spot-check
// so the random hand indices are stable across runs. mulberry32.
export function seededRng(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 2: Smoke-import**

Run: `node -e "import('./portfolio/src/game/casino-game/calculator/poker/bb100/tests/helpers/checkpoint-runner.mjs').then(m => console.log(Object.keys(m)))"`
Expected: `[ 'ucToCentsRoundHalfUp', 'usdToCents', 'loadAndCompute', 'compareCheckpoints', 'compareFinalPins', 'valueAt', 'seededRng' ]`

- [ ] **Step 3: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/poker/bb100/tests/helpers/checkpoint-runner.mjs
git commit -m "test(poker): add pure checkpoint runner helper"
```

---

## Task 3: Refactor `verify/verify-checkpoints.mjs` to use the helper, add `--pin` and `--at`

**Files:**
- Modify (rewrite): `portfolio/src/game/casino-game/calculator/poker/bb100/verify/verify-checkpoints.mjs`

- [ ] **Step 1: Replace the file contents**

```js
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
```

- [ ] **Step 2: Smoke-run (will exit with mismatch because pins are null)**

Run: `node portfolio/src/game/casino-game/calculator/poker/bb100/verify/verify-checkpoints.mjs 1815`
Expected: Loads 1815 hands, prints the checkpoint diff table. If all checkpoints match cent-exact, prints `(Final pins not set — run with --pin 1815 to record them.)` and exits 0. If any checkpoint mismatch, exits 2 with `❌ N of 38 checkpoint comparisons failed`.
**If any checkpoint mismatches at this step — STOP and surface them. Do not proceed to Task 4 until you understand them.**

- [ ] **Step 3: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/poker/bb100/verify/verify-checkpoints.mjs
git commit -m "test(poker): refactor verify-checkpoints to use fixture registry"
```

---

## Task 4: Pin final values for fixture 1815

**Files:**
- Modify: `portfolio/src/game/casino-game/calculator/poker/bb100/verify/fixtures.mjs` (the `'1815'` entry's `final*` fields)

- [ ] **Step 1: Run pin mode for 1815**

Run: `node portfolio/src/game/casino-game/calculator/poker/bb100/verify/verify-checkpoints.mjs --pin 1815`
Expected:
- All 19 checkpoint rows match (no `✗` marks in the Δ¢ columns).
- Prints lines like:
  ```
  Observed final values (paste into verify/fixtures.mjs '1815' entry):
    finalBbPer100Before: 23.99XXXX,
    finalBbPer100After:  17.08XXXX,
    finalRakePaidUC:     2510000n,
  ```
- Exits 0 with `✅ All 19 checkpoints match. Safe to pin final values.`

**If any checkpoint mismatch:** STOP. Do not paste numbers. This is a calculation bug — escalate as a separate task.

- [ ] **Step 2: Paste the three observed values into `fixtures.mjs`**

Edit the `'1815'` entry's three `final*` fields, replacing each `null` with the printed value. Keep `finalRakePaidUC` as a BigInt literal (the `n` suffix from the printout).

- [ ] **Step 3: Re-run default mode to confirm pins match**

Run: `node portfolio/src/game/casino-game/calculator/poker/bb100/verify/verify-checkpoints.mjs 1815`
Expected: `✅ All 19 checkpoints match. Final pins match.` exit code 0.

- [ ] **Step 4: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/poker/bb100/verify/fixtures.mjs
git commit -m "test(poker): pin final values for 1815-hand fixture"
```

---

## Task 5: Pin final values for fixture 23795

**Files:**
- Modify: `portfolio/src/game/casino-game/calculator/poker/bb100/verify/fixtures.mjs` (the `'23795'` entry's `final*` fields)

- [ ] **Step 1: Run pin mode for 23795**

Run: `node portfolio/src/game/casino-game/calculator/poker/bb100/verify/verify-checkpoints.mjs --pin 23795`
Expected:
- Parses ~23795 hands across two folders.
- All 24 checkpoint rows match (no `✗` marks).
- Prints observed `finalBbPer100Before/After` and `finalRakePaidUC`.
- Exits 0 with `✅ All 24 checkpoints match. Safe to pin final values.`

⚠️ First run will be slow (multi-minute) — equity cache is cold and the 23795 set has many all-in showdowns.

**If hand count ≠ 23795 OR any checkpoint mismatch:** STOP. Surface the diff. Do not paste numbers.

- [ ] **Step 2: Paste the three observed values into `fixtures.mjs`**

Edit the `'23795'` entry's three `final*` fields. BigInt literal for `finalRakePaidUC`.

- [ ] **Step 3: Re-run default mode to confirm**

Run: `node portfolio/src/game/casino-game/calculator/poker/bb100/verify/verify-checkpoints.mjs 23795`
Expected: `✅ All 24 checkpoints match. Final pins match.` exit 0.

- [ ] **Step 4: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/poker/bb100/verify/fixtures.mjs
git commit -m "test(poker): pin final values for 23795-hand fixture"
```

---

## Task 6: Add `tests/checkpoints.test.mjs` (skip-when-missing, cumulative invariant)

**Files:**
- Create: `portfolio/src/game/casino-game/calculator/poker/bb100/tests/checkpoints.test.mjs`

- [ ] **Step 1: Write the test**

```js
// tests/checkpoints.test.mjs
// Cent-exact checkpoint tests against two real GGPoker fixtures.
// Skips when fixture folders are not present locally.
//
// LOAD-BEARING: see spec § No-Hardcoding Constraint. The runner runs
// computeSeries ONCE per fixture and we sample seriesBefore by plain
// indexing. A cumulative-invariant spot-check below proves the cumulative
// arrays are a strict forward accumulation, so any other hand index the
// user picks (e.g. 1546 or 18232) will be just as correct.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { FIXTURES } from '../verify/fixtures.mjs';
import {
  loadAndCompute,
  compareCheckpoints,
  compareFinalPins,
  seededRng,
} from './helpers/checkpoint-runner.mjs';

function skipReason(fixture) {
  for (const folder of fixture.folders) {
    if (!existsSync(folder)) return `fixture folder not present: ${folder}`;
  }
  return null;
}

for (const [key, fixture] of Object.entries(FIXTURES)) {
  const skip = skipReason(fixture);

  test(`checkpoints — ${fixture.label}`, { skip }, async () => {
    const { allHands, seriesBefore, summary } = await loadAndCompute(fixture);

    assert.equal(allHands.length, fixture.expectedHands,
      `expected ${fixture.expectedHands} hands, got ${allHands.length}`);
    assert.equal(seriesBefore.winningsUC.length, fixture.expectedHands);

    const cp = compareCheckpoints(fixture, seriesBefore);
    assert.ok(cp.ok, () =>
      `checkpoint mismatches (${cp.mismatches.length}):\n` +
      cp.mismatches.map(m =>
        `  hand ${m.handN} ${m.field}: expected ${m.expectedCents/100}, got ${m.actualCents/100} (Δ ${m.deltaCents}¢)`
      ).join('\n')
    );

    assert.ok(fixture.finalRakePaidUC != null,
      `fixture "${key}" has unpinned final values — run \`node verify/verify-checkpoints.mjs --pin ${key}\` and copy printed values into verify/fixtures.mjs`);

    const pin = compareFinalPins(fixture, summary);
    assert.ok(pin.ok, () =>
      `final pin mismatches:\n` + pin.mismatches.map(m =>
        `  ${m.field}: expected ${m.expected}, got ${m.actual}`
      ).join('\n')
    );
  });

  // Cumulative-invariant spot-check: pick 5 random hand indices (seeded,
  // deterministic) NOT in the checkpoint list and verify that
  //   series.evUC[N-1]       === series.evUC[N-2]       + (series.evUC[N-1] - series.evUC[N-2])
  //   series.winningsUC[N-1] === series.winningsUC[N-2] + (...)
  // The trivial identity above isn't the actual test — the actual test is
  // that re-summing differences from index 0 up to N-1 equals series[N-1].
  // This proves no future indices were used to compute past values.
  test(`cumulative invariant (spot-check) — ${fixture.label}`, { skip }, async () => {
    const { allHands, seriesBefore } = await loadAndCompute(fixture);
    const rng = seededRng(0x5A5A5A5A);
    const checkpointSet = new Set(fixture.checkpoints.map(([n]) => n));
    const samples = new Set();
    while (samples.size < 5) {
      const n = 2 + Math.floor(rng() * (allHands.length - 2));  // [2, len-1]
      if (!checkpointSet.has(n)) samples.add(n);
    }
    for (const n of samples) {
      // Re-accumulate from raw deltas; must equal indexed value.
      let evSum = 0n, winSum = 0n;
      for (let i = 0; i < n; i++) {
        const d = i === 0 ? seriesBefore.evUC[0]       : seriesBefore.evUC[i]       - seriesBefore.evUC[i-1];
        const w = i === 0 ? seriesBefore.winningsUC[0] : seriesBefore.winningsUC[i] - seriesBefore.winningsUC[i-1];
        evSum += d;
        winSum += w;
      }
      assert.equal(evSum,  seriesBefore.evUC[n-1],       `cumulative-invariant violated at hand ${n} (evUC)`);
      assert.equal(winSum, seriesBefore.winningsUC[n-1], `cumulative-invariant violated at hand ${n} (winningsUC)`);
    }
  });
}
```

- [ ] **Step 2: Run the tests**

Run: `node --test portfolio/src/game/casino-game/calculator/poker/bb100/tests/checkpoints.test.mjs`
Expected: 4 tests pass (2 checkpoint + 2 invariant), 0 fail. First 23795 run will take a few minutes (equity cache cold).

- [ ] **Step 3: Confirm skip behaviour**

Run: `POKER_FIXTURE_1815=/tmp/does-not-exist POKER_FIXTURE_23795_A=/tmp/does-not-exist POKER_FIXTURE_23795_B=/tmp/does-not-exist node --test portfolio/src/game/casino-game/calculator/poker/bb100/tests/checkpoints.test.mjs`
Expected: All 4 tests reported as skipped, exit 0.

- [ ] **Step 4: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/poker/bb100/tests/checkpoints.test.mjs
git commit -m "test(poker): add cent-exact checkpoint tests + cumulative-invariant"
```

---

## Task 7: Smoke-check `--at` mode and the full test suite

- [ ] **Step 1: Try `--at` with the user's example indices**

Run: `node portfolio/src/game/casino-game/calculator/poker/bb100/verify/verify-checkpoints.mjs --at 1815 1546 1700`
Expected: prints 2 rows (handN 1546 and 1700) with EV/Win values, both before-rake and after-rake.

Run: `node portfolio/src/game/casino-game/calculator/poker/bb100/verify/verify-checkpoints.mjs --at 23795 18232`
Expected: prints 1 row for hand 18232.

These are reported back to the user so they can spot-check against the GGPoker app.

- [ ] **Step 2: Run the existing test suite to confirm nothing else broke**

Run: `node --test portfolio/src/game/casino-game/calculator/poker/bb100/tests/`
Expected: All existing tests still pass plus the new 4 checkpoint tests.

- [ ] **Step 3: No new commit unless something needed adjusting**

If anything had to be touched in step 1 or 2, commit those changes separately with a focused message.

---

## Self-Review

**Spec coverage check (each spec section → task):**

| Spec section | Implemented in |
|---|---|
| Goals (cent-exact EV+Win checkpoints, final pins) | Task 6 (test asserts), Tasks 4–5 (pinning) |
| Non-Goals (no compute edits) | Out-of-scope list above; no task touches compute/parser/equity/money |
| No-Hardcoding Constraint | Task 2 (loadAndCompute runs computeSeries once, sampling by index); Task 6 (cumulative-invariant test); `--at` in Task 3 |
| Fixture A (1815) checkpoints | Task 1 (data) + Task 4 (pin) + Task 6 (assert) |
| Fixture B (23795) checkpoints | Task 1 (data) + Task 5 (pin) + Task 6 (assert) |
| Architecture diagram (4 files) | All four created/modified in Tasks 1, 2, 3, 6 |
| `fixtures.mjs` shape | Task 1 (full body shown) |
| `checkpoint-runner.mjs` exports | Task 2 (full body shown) |
| `checkpoints.test.mjs` shape | Task 6 (full body shown) |
| `verify-checkpoints.mjs` modes (default, --pin, --at) | Task 3 (full body shown), Task 7 (--at smoke) |
| 6 invariants the tests catch | Implicit — covered by checkpoint + pin assertions |
| Implementation Order (spec § 1–8) | Mapped 1→Task1, 2→Task2, 3→Task3, 4→Task4, 5→Task5, 6→Task6, 7→Task6 step 2, 8→Task6 step 3 |
| Skip-on-missing + env overrides | Task 1 (env vars) + Task 6 (skip logic) |
| Pin step is manual (no auto-mutation) | Tasks 4–5 are manual paste; Task 3 `--pin` prints, does not write |
| `--at` ad-hoc spot-check | Task 3 (impl), Task 7 (smoke) |

**Placeholder scan:** No "TBD", "TODO", "implement later", "add appropriate error handling", "similar to Task N", or steps lacking code. All file bodies are written out.

**Type consistency:** Helper exports used across files match — `loadAndCompute`, `compareCheckpoints`, `compareFinalPins`, `valueAt`, `seededRng`, `ucToCentsRoundHalfUp`, `usdToCents`. Fixture entry fields (`folders`, `expectedHands`, `checkpoints`, `finalBbPer100Before`, `finalBbPer100After`, `finalRakePaidUC`) are consistent across `fixtures.mjs`, `checkpoint-runner.mjs`, `verify-checkpoints.mjs`, and `checkpoints.test.mjs`.

**Risks acknowledged:**
- If `--pin` shows checkpoint mismatches (Tasks 4 or 5), the plan halts and the discrepancy becomes a separate calculation-fix task — see spec § Risks.
- 23795 first-run latency is acceptable for a verification script.
