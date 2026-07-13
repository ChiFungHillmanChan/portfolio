// verify/dump-30k.mjs — dump per-hand details for the 30k dataset.
// Writes /tmp/poker-30k-perhand.tsv with one row per hand.
//
// Columns:
//   idx, handId, date, position, allIn, anyAllIn, showdown, allInStreet
//   contribUC, collectUC, uncalledUC, rakeUC, jackpotUC, taxUC, bonusesUC, totalPotUC
//   numVillains, resultBeforeUC, resultAfterUC, evBeforeUC, evAfterUC, evAdjBeforeUC

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFile } from '../js/parser/gg-parser.mjs';
import { computeSeries } from '../js/stats/compute.mjs';
import { FIXTURES } from './fixtures.mjs';

const fixture = FIXTURES['30125'];

function bigOrZero(v) {
  return typeof v === 'bigint' ? v : 0n;
}
function bonuses(h) {
  return bigOrZero(h.cashDropUC) + bigOrZero(h.bingoUC) + bigOrZero(h.fortuneUC);
}

async function main() {
  const byId = new Map();
  for (const dir of fixture.folders) {
    const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.txt'));
    for (const f of files) {
      const content = readFileSync(join(dir, f), 'utf8');
      const r = parseFile(f, content);
      const validationError = r.errors && r.errors.find((e) => e.startsWith('Validation failed:'));
      if (validationError) continue;
      for (const h of r.hands) {
        if (!byId.has(h.id)) byId.set(h.id, h);
      }
    }
  }
  const allHands = [...byId.values()];
  allHands.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.id.localeCompare(b.id);
  });
  console.log(`Loaded ${allHands.length} hands.`);

  const { seriesBefore, seriesAfter } = await computeSeries(allHands, { beforeRake: true });

  // Per-hand result deltas (incremental, not cumulative)
  const lines = [
    [
      'idx', 'handId', 'date', 'position', 'allIn', 'anyAllIn', 'showdown', 'allInStreet',
      'contribUC', 'collectUC', 'uncalledUC', 'rakeUC', 'jackpotUC', 'taxUC', 'bonusesUC', 'totalPotUC',
      'numVillains', 'resultBeforeUC', 'resultAfterUC', 'evBeforeUC', 'evAfterUC', 'evAdjBeforeUC',
    ].join('\t'),
  ];
  for (let i = 0; i < allHands.length; i++) {
    const h = allHands[i];
    const resultBefore = i === 0 ? seriesBefore.winningsUC[0] : seriesBefore.winningsUC[i] - seriesBefore.winningsUC[i - 1];
    const resultAfter  = i === 0 ? seriesAfter.winningsUC[0]  : seriesAfter.winningsUC[i]  - seriesAfter.winningsUC[i - 1];
    const evBefore     = i === 0 ? seriesBefore.evUC[0]       : seriesBefore.evUC[i]       - seriesBefore.evUC[i - 1];
    const evAfter      = i === 0 ? seriesAfter.evUC[0]        : seriesAfter.evUC[i]        - seriesAfter.evUC[i - 1];
    const evAdj = evBefore - resultBefore;
    const numV = h.showdown ? Object.keys(h.showdown.villains ?? {}).length : 0;
    lines.push([
      i + 1,
      h.id,
      h.date,
      h.hero.position,
      h.heroAllIn ? 1 : 0,
      h.anyAllIn ? 1 : 0,
      h.reachedShowdown ? 1 : 0,
      h.allInStreet ?? h.anyAllInStreet ?? '',
      h.contributedUC, h.collectedUC, h.uncalledUC,
      h.rakeUC ?? 0n, h.jackpotUC ?? 0n, h.taxUC ?? 0n, bonuses(h), h.totalPotUC,
      numV,
      resultBefore, resultAfter, evBefore, evAfter, evAdj,
    ].join('\t'));
  }
  writeFileSync('/tmp/poker-30k-perhand.tsv', lines.join('\n'));
  console.log(`Wrote /tmp/poker-30k-perhand.tsv (${allHands.length} rows)`);

  // Also write cumulative-at-each-1000 file for fast lookup
  const ckLines = ['handN\tevBeforeUSD\twinBeforeUSD\tevAfterUSD\twinAfterUSD'];
  for (let n = 100; n <= allHands.length; n += 100) {
    const idx = n - 1;
    const evB  = Number(seriesBefore.evUC[idx])       / 1_000_000;
    const winB = Number(seriesBefore.winningsUC[idx]) / 1_000_000;
    const evA  = Number(seriesAfter.evUC[idx])        / 1_000_000;
    const winA = Number(seriesAfter.winningsUC[idx])  / 1_000_000;
    ckLines.push(`${n}\t${evB.toFixed(6)}\t${winB.toFixed(6)}\t${evA.toFixed(6)}\t${winA.toFixed(6)}`);
  }
  writeFileSync('/tmp/poker-30k-checkpoints.tsv', ckLines.join('\n'));
  console.log(`Wrote /tmp/poker-30k-checkpoints.tsv`);
}

main().catch((e) => { console.error(e); process.exit(1); });
