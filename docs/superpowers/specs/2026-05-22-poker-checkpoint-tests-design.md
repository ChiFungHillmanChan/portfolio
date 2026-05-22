# Poker BB/100 Checkpoint Tests — Design

**Date:** 2026-05-22
**Author:** Hillman Chan (brainstormed with Claude)
**Status:** Approved design — implementation pending
**Scope:** Tests + verify scripts only. **No edits to `compute.mjs`, parser, equity, or money modules in this round.**

## Goal

Lock cumulative EV and Winnings (before-rake) to cent-exact values at regular intervals, against two real GGPoker hand-history fixtures. Also pin final `bbPer100` (both views) and absolute `rakePaidUC`. If any future change to compute / parser / equity drifts the numbers by one cent at any checkpoint, the tests must fail.

The user's words: *"poker cash slightly different will affect a lot in rake, long terms and bb/100 calculations"* — these tests are the regression net for that.

## Non-Goals

- No changes to `compute.mjs`, parser, equity, or money modules in this round.
- Not trying to derive the expected numbers from first principles — they come from the GGPoker app's own EV graph as read by the user.
- Not shipping the hand-history files into git (too large, private data). Fixtures stay on the user's local Desktop; tests skip when absent.

## No-Hardcoding Constraint (load-bearing)

The implementation MUST NOT special-case the checkpoint hand indices in any way. The test must be able to swap any other hand index in (e.g. 1546 in fixture A, 18232 in fixture B) and the asserted value must come from the same generic cumulative pipeline — never from a lookup table keyed on hand number.

Concretely this means:

1. `loadAndCompute(fixture)` runs `computeSeries(allHands)` exactly once and exposes the full `seriesBefore` / `seriesAfter` / `summary`. The checkpoint hand numbers are NOT passed into this call. Compute is unaware of which hands the test will sample.
2. `compareCheckpoints(fixture, seriesBefore)` reads `seriesBefore.evUC[handN - 1]` and `seriesBefore.winningsUC[handN - 1]` — pure indexing into already-computed arrays. No branching on `handN`. No alternate code path.
3. The runner exposes a `valueAt(handN)` helper for ad-hoc spot-checks (used by the verify script's `--at` mode below). It must use the same generic indexing.
4. A **cumulative-invariant spot-check** test asserts, for 5 random hand indices `N` NOT in the checkpoint list:

       seriesBefore.evUC[N-1]       === seriesBefore.evUC[N-2] + perHandEv_before(hand_N)
       seriesBefore.winningsUC[N-1] === seriesBefore.winningsUC[N-2] + perHandResult_before(hand_N)

   This proves the cumulative arrays are a strict forward accumulation, not an alignment trick. Seeded random (deterministic).

## Fixtures

### Fixture A — 1815 hands (single folder)

| Field | Value |
|------|------|
| Path | `/Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8` |
| Override env var | `POKER_FIXTURE_1815` |
| Hand count | 1815 |
| Stake | 6-max NLHE $0.01/$0.02 (RushAndCash) |
| Checkpoint stride | every 100 hands, plus final at 1815 |

Expected (EV, Winnings) before-rake, USD, cent precision:

| Hand | EV ($) | Winloss ($) |
|------|-------|------|
| 100  | +0.81 | +0.81 |
| 200  | +1.31 | +1.31 |
| 300  | -0.28 | +0.15 |
| 400  | +0.61 | +0.27 |
| 500  | -0.33 | -2.17 |
| 600  | -0.84 | -1.46 |
| 700  | -1.22 | -3.25 |
| 800  | +1.15 | -0.88 |
| 900  | +1.04 | -0.99 |
| 1000 | +1.13 | -3.55 |
| 1100 | +2.35 | -1.33 |
| 1200 | +1.01 | -2.67 |
| 1300 | +0.17 | -3.51 |
| 1400 | +2.30 | -1.38 |
| 1500 | +1.10 | -1.41 |
| 1600 | +1.83 | -0.68 |
| 1700 | +8.82 | +6.31 |
| 1800 | +11.04 | +8.53 |
| 1815 | +11.23 | +8.72 |

### Fixture B — 23795 hands (two folders combined)

| Field | Value |
|------|------|
| Path A | `/Users/hillmanchan/Desktop/0000019e-4e65-4d50-0000-0000280dc4e8` |
| Path B | `/Users/hillmanchan/Desktop/0000019e-4eed-7dc3-0000-0000280dc4e8` |
| Override env vars | `POKER_FIXTURE_23795_A`, `POKER_FIXTURE_23795_B` |
| Hand count | 23795 |
| Stake | 6-max NLHE $0.01/$0.02 (RushAndCash) |
| Checkpoint stride | every 1000 hands, plus final at 23795 |
| Hand ordering | concatenate files from both folders, then canonical sort by `(date asc, id asc)` — same sort `verify/verify.mjs` already uses |

Expected (EV, Winnings) before-rake, USD, cent precision:

| Hand | EV ($) | Winloss ($) |
|------|-------|------|
| 1000  | -0.44 | +0.47 |
| 2000  | +4.46 | +5.27 |
| 3000  | +5.40 | +10.48 |
| 4000  | +3.92 | +8.70 |
| 5000  | +11.29 | +16.04 |
| 6000  | +27.18 | +29.43 |
| 7000  | +24.98 | +27.80 |
| 8000  | +25.46 | +29.98 |
| 9000  | +29.50 | +34.71 |
| 10000 | +31.86 | +35.16 |
| 11000 | +29.00 | +31.03 |
| 12000 | +30.71 | +31.28 |
| 13000 | +35.87 | +37.69 |
| 14000 | +37.76 | +39.94 |
| 15000 | +35.31 | +38.41 |
| 16000 | +37.33 | +40.68 |
| 17000 | +32.32 | +43.42 |
| 18000 | +39.72 | +49.59 |
| 19000 | +44.19 | +53.88 |
| 20000 | +45.53 | +57.44 |
| 21000 | +46.50 | +53.73 |
| 22000 | +57.30 | +67.79 |
| 23000 | +65.39 | +76.44 |
| 23795 | +65.28 | +78.59 |

## Architecture

```
poker/bb100/
├── tests/
│   ├── checkpoints.test.mjs          (NEW)
│   └── helpers/
│       └── checkpoint-runner.mjs     (NEW)
│
└── verify/
    ├── fixtures.mjs                  (NEW)
    └── verify-checkpoints.mjs        (REFACTOR)
```

### `verify/fixtures.mjs`

Single source of truth. Exports `FIXTURES = { '1815': {...}, '23795': {...} }`. Each entry:

```js
{
  label,
  folders: string[],               // 1 entry for A, 2 entries for B
  expectedHands: number,
  checkpoints: [handN, expEvBefore_USD, expWinningsBefore_USD][],
  // Pinned to current compute output. Filled by the `--pin` step (see below)
  // once before the tests start asserting. Tests fail if these are null.
  finalBbPer100Before: number | null,
  finalBbPer100After:  number | null,
  finalRakePaidUC:     bigint  | null,
}
```

### `tests/helpers/checkpoint-runner.mjs`

Pure (no console output). Exports:

```js
loadAndCompute(fixture)
  → { allHands, seriesBefore, seriesAfter, summary }

compareCheckpoints(fixture, seriesBefore)
  → { ok, mismatches: [{ handN, field, expected, actual, deltaCents }] }

compareFinalPins(fixture, summary)
  → { ok, mismatches: [{ field, expected, actual }] }

pin(fixtureKey)
  → prints observed final values; does NOT write to fixtures.mjs
```

`loadAndCompute` is responsible for: reading every `.txt` file in every fixture folder, parsing, rejecting validation failures, sorting by `(date, id)`, and running `computeSeries(allHands, {beforeRake: <ignored>})` once — `computeSeries` returns both `seriesBefore` and `seriesAfter` in a single pass.

Match rules:

| Field | Comparison |
|------|---|
| `seriesBefore.evUC[handN-1]` | `roundHalfUpToCents(actualUC) === Math.round(expEv * 100)` — exact |
| `seriesBefore.winningsUC[handN-1]` | `roundHalfUpToCents(actualUC) === Math.round(expWinnings * 100)` — exact |
| `summary.bbPer100Before` | `Math.abs(actual - exp) < 0.005` (matches 2-dp display) |
| `summary.bbPer100After`  | same |
| `summary.rakePaidUC` | exact BigInt equality |
| `seriesBefore.winningsUC.length` | `=== fixture.expectedHands` |

### `tests/checkpoints.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { FIXTURES } from '../verify/fixtures.mjs';
import { loadAndCompute, compareCheckpoints, compareFinalPins } from './helpers/checkpoint-runner.mjs';

function skipReason(fixture) {
  for (const folder of fixture.folders) {
    if (!existsSync(folder)) return `fixture folder not present: ${folder}`;
  }
  return null;
}

for (const [key, fixture] of Object.entries(FIXTURES)) {
  const skip = skipReason(fixture);
  test(`checkpoints — ${fixture.label}`, { skip }, async () => {
    const { seriesBefore, summary } = await loadAndCompute(fixture);
    assert.equal(seriesBefore.winningsUC.length, fixture.expectedHands,
      `expected ${fixture.expectedHands} hands, got ${seriesBefore.winningsUC.length}`);

    const cpResult = compareCheckpoints(fixture, seriesBefore);
    assert.ok(cpResult.ok, `checkpoint mismatches: ${JSON.stringify(cpResult.mismatches, null, 2)}`);

    if (fixture.finalRakePaidUC == null) {
      assert.fail(`fixture "${key}" has unpinned final values — run \`node verify/verify-checkpoints.mjs --pin ${key}\` and copy the printed values into verify/fixtures.mjs.`);
    }
    const pinResult = compareFinalPins(fixture, summary);
    assert.ok(pinResult.ok, `final pin mismatches: ${JSON.stringify(pinResult.mismatches, null, 2)}`);
  });
}
```

Skip-on-missing keeps `node --test` green on machines without the fixtures (CI, other developers). Env-var overrides handle moved data.

### `verify/verify-checkpoints.mjs` (refactor)

Thin wrapper. Three modes:

```
node verify/verify-checkpoints.mjs [1815|23795]      # default 1815; pretty diff table; exit 1 on any mismatch

node verify/verify-checkpoints.mjs --pin [1815|23795]
   # runs computeSeries and prints observed final values:
   #   finalBbPer100Before: 23.991234
   #   finalBbPer100After:  17.083100
   #   finalRakePaidUC:     2510000n
   # User copies these into verify/fixtures.mjs and commits.

node verify/verify-checkpoints.mjs --at [1815|23795] <handN> [<handN> ...]
   # ad-hoc spot-check at arbitrary hand indices, e.g.
   #   node verify/verify-checkpoints.mjs --at 1815 1546 1700
   #   node verify/verify-checkpoints.mjs --at 23795 18232
   # prints: handN | EV before | Winnings before | EV after | Winnings after
   # No comparison against expected values — just reports computed values so
   # the user can spot-check against the GGPoker app.
```

Existing pretty-print logic (table with Δ¢) is preserved. The script just delegates loading to the helper.

## Invariants the tests catch (the calculation analysis)

| # | Invariant | Where it lives | Locked by |
|---|---|---|---|
| 1 | Before-rake EV uses full pot; after-rake uses `totalPot − totalFees` | `evResult` (compute.mjs:117–158) | EV checkpoints in both fixtures |
| 2 | `heroRakeShareByWin` denominator = `totalPot − fees − bonuses`, banker-rounded | compute.mjs:87–95 | Winnings checkpoints (before-rake) |
| 3 | Multi-way side-pot decomposition uses `hand.contributions` per-villain | compute.mjs:160–234 | EV checkpoints, esp. 23795 (more multi-way all-ins) |
| 4 | `bbPer100 = mean(result_i / bb_i) × 100` (per-hand weighted, not bb-amount weighted) | compute.mjs:343–350 | Final `bbPer100Before/After` pin |
| 5 | Hand order = `(date asc, id asc)` after concatenating all source files | verify/verify.mjs:47–50 (replicated in runner) | Every checkpoint depends on order |
| 6 | `heroRakeShareByContribution` denominator = `totalPot − bonuses` (different from #2) | compute.mjs:60–68 | Final `rakePaidUC` pin |

If any of these drift, the corresponding lock fires.

## Implementation Order

1. Create `verify/fixtures.mjs` with paths + checkpoint tables + `null` final pins.
2. Create `tests/helpers/checkpoint-runner.mjs` with `loadAndCompute`, `compareCheckpoints`, `compareFinalPins`, `pin`.
3. Refactor `verify/verify-checkpoints.mjs` to be a thin wrapper.
4. Run `node verify/verify-checkpoints.mjs --pin 1815`, copy printed numbers into `fixtures.mjs`. **Verify checkpoint diff table is all-zero before pinning final values** — if not, stop and surface the mismatch; do not commit fudged pins.
5. Repeat (4) for `23795`.
6. Create `tests/checkpoints.test.mjs`.
7. Run `node --test tests/checkpoints.test.mjs` — both tests green.
8. Confirm tests skip gracefully when fixture paths don't exist (rename folder temporarily and re-run).

If step 4 or 5 produces any cent-level mismatch, that's a real bug — escalate as a follow-up task; do not pin to wrong numbers to make the test pass.

## Out of Scope (this design)

- Auto-pinning (writing back to `fixtures.mjs`) — kept manual on purpose.
- A third fixture or stake — schema already supports it; just add another key.
- Re-deriving the expected values from anything other than the user-supplied GGPoker readings.
- Touching `compute.mjs`, `gg-parser.mjs`, `hand-model.mjs`, `equity.mjs`, or `money.mjs`.

## Risks

- **Pin step finds mismatches** — possible because checkpoints reflect user's latest reading. If `--pin` shows the checkpoint diff isn't all-zero, the test isn't ready to lock; that becomes a separate calculation-fix task, not "adjust the expected values."
- **Equity cache cold start for 23795** — first run will be slow (multi-minute) because evResult does exhaustive equity enumeration on every preflop all-in. Subsequent runs in the same process use the in-memory cache; across runs the cache cold-starts again. Acceptable: tests aren't run on every save.
- **Fixture files moving** — env-var overrides cover this.
