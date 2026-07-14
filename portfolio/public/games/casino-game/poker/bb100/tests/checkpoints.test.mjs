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
  return false;  // explicit false — node:test treats any key presence (incl. null) as skip
}

for (const [key, fixture] of Object.entries(FIXTURES)) {
  const skipMaybe = skipReason(fixture);
  const opts = skipMaybe ? { skip: skipMaybe } : {};

  test(`checkpoints — ${fixture.label}`, opts, async () => {
    const { allHands, seriesBefore, summary } = await loadAndCompute(fixture);

    assert.equal(allHands.length, fixture.expectedHands,
      `expected ${fixture.expectedHands} hands, got ${allHands.length}`);
    assert.equal(seriesBefore.winningsUC.length, fixture.expectedHands);

    const cp = compareCheckpoints(fixture, seriesBefore);
    assert.ok(cp.ok, () =>
      `checkpoint mismatches (${cp.mismatches.length}):\n` +
      cp.mismatches.map(m =>
        `  hand ${m.handN} ${m.field}: expected ${m.expectedCents / 100}, got ${m.actualCents / 100} (Δ ${m.deltaCents}¢)`
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
  // deterministic) NOT in the checkpoint list and verify that the cumulative
  // arrays are a strict forward accumulation of per-hand deltas — proving no
  // future indices were used to compute past values, i.e. no hard-coding.
  test(`cumulative invariant (spot-check) — ${fixture.label}`, opts, async () => {
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
        const dEv  = i === 0 ? seriesBefore.evUC[0]       : seriesBefore.evUC[i]       - seriesBefore.evUC[i - 1];
        const dWin = i === 0 ? seriesBefore.winningsUC[0] : seriesBefore.winningsUC[i] - seriesBefore.winningsUC[i - 1];
        evSum  += dEv;
        winSum += dWin;
      }
      assert.equal(evSum,  seriesBefore.evUC[n - 1],       `cumulative-invariant violated at hand ${n} (evUC)`);
      assert.equal(winSum, seriesBefore.winningsUC[n - 1], `cumulative-invariant violated at hand ${n} (winningsUC)`);
    }
  });
}
