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
  const byId = new Map();
  for (const dir of fixture.folders) {
    const files = readdirSync(dir).filter(f => f.toLowerCase().endsWith('.txt'));
    for (const f of files) {
      const content = readFileSync(join(dir, f), 'utf8');
      const r = parseFile(f, content);
      const validationError = r.errors && r.errors.find(e => e.startsWith('Validation failed:'));
      if (validationError) continue;
      for (const h of r.hands) {
        // Dedup by hand.id across folders. GG can export the same session into
        // multiple folders, so two-folder fixtures (like 23795) routinely have
        // overlapping files. First occurrence wins; identical hands by ID are
        // identical hands by content.
        if (!byId.has(h.id)) byId.set(h.id, h);
      }
    }
  }
  const allHands = [...byId.values()];
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
  if (fixture.finalBbPer100Before == null || fixture.finalBbPer100After == null || fixture.finalRakePaidUC == null) {
    throw new Error(`compareFinalPins called on unpinned fixture "${fixture.label ?? '?'}" — run --pin first`);
  }
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
