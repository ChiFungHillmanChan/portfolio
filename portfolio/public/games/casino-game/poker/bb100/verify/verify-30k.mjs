// verify-30k.mjs — one-off: compute cumulative EV + winnings every 1000 hands
// across two GGPoker folders that together hold ~30 122 hands.
//
// Run from repo root (or anywhere — paths are absolute):
//   node portfolio/src/game/casino-game/calculator/poker/bb100/verify/verify-30k.mjs

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseFile } from '../js/parser/gg-parser.mjs';
import { computeSeries } from '../js/stats/compute.mjs';

const FOLDERS = [
  '/Users/hillmanchan/Downloads/0000019e-5ad9-b554-0000-0000280dc4e8',
  '/Users/hillmanchan/Downloads/0000019e-5ada-9f72-0000-0000280dc4e8',
];

function ucToUsd(uc) {
  // micro-cent BigInt → USD Number, 2-dp half-up
  const sign = uc < 0n ? -1n : 1n;
  const abs = uc < 0n ? -uc : uc;
  const cents = (abs + 5000n) / 10000n;
  return Number(sign * cents) / 100;
}

function fmt(n) {
  const s = n.toFixed(2);
  return s.padStart(12);
}

async function main() {
  const byId = new Map();
  let parseErrors = 0;
  for (const dir of FOLDERS) {
    const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.txt'));
    for (const f of files) {
      const content = readFileSync(join(dir, f), 'utf8');
      const r = parseFile(f, content);
      const validationError =
        r.errors && r.errors.find((e) => e.startsWith('Validation failed:'));
      if (validationError) {
        parseErrors++;
        continue;
      }
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
  console.log(`Loaded ${allHands.length} unique hands (parse errors: ${parseErrors})`);

  const { seriesBefore, seriesAfter, summary } = await computeSeries(allHands, { beforeRake: true });

  // Print headers
  console.log('');
  console.log('Hand   |    EV (before)   |   Win (before)   |    EV (after)    |   Win (after)    |  Red (after)    |  Blue (after)');
  console.log('-------+------------------+------------------+------------------+------------------+-----------------+-----------------');
  const N = allHands.length;
  for (let n = 1000; n <= N; n += 1000) {
    if (n > N) break;
    const idx = n - 1;
    const evB  = ucToUsd(seriesBefore.evUC[idx]);
    const winB = ucToUsd(seriesBefore.winningsUC[idx]);
    const evA  = ucToUsd(seriesAfter.evUC[idx]);
    const winA = ucToUsd(seriesAfter.winningsUC[idx]);
    const redA = ucToUsd(seriesAfter.redUC[idx]);
    const blueA = ucToUsd(seriesAfter.blueUC[idx]);
    console.log(
      `${String(n).padStart(6)} | ${fmt(evB)}     | ${fmt(winB)}     | ${fmt(evA)}     | ${fmt(winA)}     | ${fmt(redA)}    | ${fmt(blueA)}`
    );
  }
  // Final row (if last full-thousand isn't the last hand)
  if (N % 1000 !== 0) {
    const idx = N - 1;
    const evB  = ucToUsd(seriesBefore.evUC[idx]);
    const winB = ucToUsd(seriesBefore.winningsUC[idx]);
    const evA  = ucToUsd(seriesAfter.evUC[idx]);
    const winA = ucToUsd(seriesAfter.winningsUC[idx]);
    const redA = ucToUsd(seriesAfter.redUC[idx]);
    const blueA = ucToUsd(seriesAfter.blueUC[idx]);
    console.log(
      `${String(N).padStart(6)} | ${fmt(evB)}     | ${fmt(winB)}     | ${fmt(evA)}     | ${fmt(winA)}     | ${fmt(redA)}    | ${fmt(blueA)}`
    );
  }

  console.log('');
  console.log('=== Final summary ===');
  console.log(`Hands:                   ${summary.hands}`);
  console.log(`Total (before rake):     $${ucToUsd(summary.totalBeforeUC).toFixed(2)}`);
  console.log(`Total (after rake):      $${ucToUsd(summary.totalAfterUC).toFixed(2)}`);
  console.log(`EV total (before rake):  $${ucToUsd(summary.evTotalBeforeUC).toFixed(2)}`);
  console.log(`EV total (after rake):   $${ucToUsd(summary.evTotalAfterUC).toFixed(2)}`);
  console.log(`Rake paid:               $${ucToUsd(summary.rakePaidUC).toFixed(2)}`);
  console.log(`bb/100 (before):         ${summary.bbPer100Before.toFixed(2)}`);
  console.log(`bb/100 (after):          ${summary.bbPer100After.toFixed(2)}`);
  console.log(`EV bb/100 (before):      ${summary.evBbPer100Before.toFixed(2)}`);
  console.log(`EV bb/100 (after):       ${summary.evBbPer100After.toFixed(2)}`);
  console.log(`Rake bb/100:             ${summary.rakeBbPer100.toFixed(2)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
