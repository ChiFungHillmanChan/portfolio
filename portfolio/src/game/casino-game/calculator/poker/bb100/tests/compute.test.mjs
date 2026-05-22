// tests/compute.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dollarsToUC } from '../js/stats/money.mjs';
import { newHand } from '../js/parser/hand-model.mjs';
import { computeSeries } from '../js/stats/compute.mjs';

function h({ contributed = '0', collected = '0', rake = '0', jackpot = '0', totalPot, showdown = false, position = 'BTN', bb = '0.02', heroAllIn = false, uncalled = '0' } = {}) {
  const contUC = dollarsToUC(contributed);
  const collUC = dollarsToUC(collected);
  const rakeUC = dollarsToUC(rake);
  const jackpotUC = dollarsToUC(jackpot);
  const uncalledUC = dollarsToUC(uncalled);
  // Default totalPot: if no rake, contUC + collUC; otherwise caller must specify
  const potUC = totalPot ? dollarsToUC(totalPot) : (contUC + collUC);
  return newHand({
    contributedUC: contUC,
    collectedUC: collUC,
    uncalledUC,
    rakeUC,
    jackpotUC,
    totalPotUC: potUC,
    reachedShowdown: showdown,
    heroAllIn,
    hero: { seat: 1, position, cards: null },
    stake: { sbUC: dollarsToUC('0.01'), bbUC: dollarsToUC(bb) },
  });
}

test('computeSeries: cumulative winnings sum correctly', async () => {
  const hands = [
    h({ contributed: '0.02', collected: '0.05', showdown: false }), // +0.03
    h({ contributed: '0.10', collected: '0.00', showdown: true }),  // -0.10
    h({ contributed: '0.05', collected: '0.20', showdown: true }),  // +0.15
  ];
  const { series } = await computeSeries(hands, { beforeRake: false });
  assert.equal(series.winningsUC.at(-1), dollarsToUC('0.08'));
  assert.equal(series.winningsUC.length, 3);
});

test('computeSeries: red line accumulates non-showdown results', async () => {
  const hands = [
    h({ contributed: '0.02', collected: '0.05', showdown: false }), // +0.03 → red
    h({ contributed: '0.10', collected: '0.00', showdown: true }),  // -0.10 → blue
    h({ contributed: '0.05', collected: '0.20', showdown: true }),  // +0.15 → blue
  ];
  const { series } = await computeSeries(hands, { beforeRake: false });
  assert.equal(series.redUC.at(-1),  dollarsToUC('0.03'));
  assert.equal(series.blueUC.at(-1), dollarsToUC('0.05'));
});

test('computeSeries: blue + red = winnings invariant', async () => {
  const hands = [
    h({ contributed: '0.02', collected: '0.05', showdown: false }),
    h({ contributed: '0.10', collected: '0.30', showdown: true }),
  ];
  const { series } = await computeSeries(hands, { beforeRake: false });
  assert.equal(series.redUC.at(-1) + series.blueUC.at(-1), series.winningsUC.at(-1));
});

test('computeSeries: beforeRake adds Hero rake share back on winning hands', async () => {
  const hands = [
    h({ contributed: '0.02', collected: '0.10', totalPot: '0.20', rake: '0.02' }),
    // result after-rake = +0.08
    // grossPot = 0.20 - 0.02 = 0.18
    // heroShareOfRake = 0.02 * 0.10 / 0.18 → UC: 20000n * 100000n / 180000n = 11111n
    // before-rake result = 80000n + 11111n = 91111n
    h({ contributed: '0.10', collected: '0.00', totalPot: '0.20', rake: '0.05' }),
    // hero lost; rake unchanged: -0.10
  ];
  const after = await computeSeries(hands, { beforeRake: false });
  assert.equal(after.series.winningsUC.at(-1), dollarsToUC('-0.02'));  // 0.08 - 0.10 = -0.02

  const before = await computeSeries(hands, { beforeRake: true });
  // First hand: +0.08 + 11111 UC = 91111 UC, second: -0.10 = -100000 UC, total = -8889 UC
  assert.equal(before.series.winningsUC.at(-1), 91111n - 100000n);
});

test('computeSummary: hands, totalDollars, bb/100', async () => {
  const hands = [
    h({ contributed: '0.02', collected: '0.05' }), // +0.03 → 0.03/0.02 = 1.5 bb
    h({ contributed: '0.10', collected: '0.00' }), // -0.10 → -5 bb
    h({ contributed: '0.05', collected: '0.20' }), // +0.15 → 7.5 bb
  ];
  const { summary } = await computeSeries(hands, { beforeRake: false });
  assert.equal(summary.hands, 3);
  assert.equal(summary.totalUC, dollarsToUC('0.08'));
  // bb/100 = (1.5 - 5 + 7.5) / 3 * 100 = 4 / 3 * 100 ≈ 133.33
  assert.ok(Math.abs(summary.bbPer100 - 133.33) < 0.01);
});

test('computeSummary: position breakdown groups by Hero position', async () => {
  const hands = [
    h({ contributed: '0.02', collected: '0.05', position: 'BB' }),
    h({ contributed: '0.10', collected: '0.00', position: 'BTN' }),
    h({ contributed: '0.05', collected: '0.20', position: 'BTN' }),
  ];
  const { summary } = await computeSeries(hands, { beforeRake: false });
  assert.equal(summary.byPosition.BTN.count, 2);
  assert.equal(summary.byPosition.BTN.totalUC, dollarsToUC('0.05')); // -0.10 + 0.15
  assert.equal(summary.byPosition.BB.count, 1);
  assert.equal(summary.byPosition.BB.totalUC, dollarsToUC('0.03'));
});

test('computeSummary: rakePaid = sum of Hero share on winning hands', async () => {
  const hands = [
    h({ contributed: '0.02', collected: '0.10', totalPot: '0.20', rake: '0.02' }),
    // shareOfRake = 0.02 * 0.10 / 0.18 → UC: 20000n * 100000n / 180000n = 11111n
    h({ contributed: '0.10', collected: '0.00', totalPot: '0.20', rake: '0.05' }),
    // hero lost; no rake share
  ];
  const { summary } = await computeSeries(hands, { beforeRake: false });
  assert.equal(summary.rakePaidUC, 11111n);
});

test('computeSeries on empty input returns empty series', async () => {
  const { series, summary } = await computeSeries([], { beforeRake: false });
  assert.equal(series.winningsUC.length, 0);
  assert.equal(summary.hands, 0);
  assert.equal(summary.totalUC, 0n);
});

test('computeSeries: beforeRake includes jackpot in fee total on winning hands', async () => {
  // rake=$0.01, jackpot=$0.02 → totalFees=$0.03
  // collected=$0.10 (all from pot, uncalled=$0), totalPot=$0.20
  // grossPotDenom = 0.20 - 0.01 = 0.19
  // heroWonFromPot = 0.10
  // rakeShare = (30000n * 100000n) / 190000n = 15789n
  // result after-rake = 100000n - <contributed>, before-rake = after + 15789n
  const hands = [
    h({ contributed: '0.10', collected: '0.10', totalPot: '0.20', rake: '0.01', jackpot: '0.02' }),
  ];
  const after = await computeSeries(hands, { beforeRake: false });
  const before = await computeSeries(hands, { beforeRake: true });
  const afterResult = after.series.winningsUC.at(-1);
  const beforeResult = before.series.winningsUC.at(-1);
  // Before-rake should be larger than after-rake (fee share added back)
  assert.ok(beforeResult > afterResult, 'before-rake result should be greater than after-rake');
  // rakeShare = round((30000n * 100000n) / 190000n) = 15789n
  const expectedRakeShare = (30000n * 100000n) / 190000n;
  assert.equal(beforeResult - afterResult, expectedRakeShare);
});

test('computeSeries: EV is NOT computed for hands with uncalled bet returned (falls back to actual)', async () => {
  // heroAllIn=true, uncalledUC > 0 → evResult should equal perHandResult (no equity adjustment)
  // Even without showdown data, this tests the uncalled short-circuit
  const hands = [
    h({ contributed: '1.00', collected: '0.50', rake: '0.02', totalPot: '1.98',
        heroAllIn: true, uncalled: '0.50', showdown: false }),
  ];
  const { series } = await computeSeries(hands, { beforeRake: false });
  // winningsUC = collectedUC - contributedUC = 0.50 - 1.00 = -0.50 (500000n loss)
  // evUC should equal winningsUC because uncalledUC > 0 forces fallback
  assert.equal(series.evUC.at(-1), series.winningsUC.at(-1),
    'EV should equal actual result when uncalledUC > 0');
});
