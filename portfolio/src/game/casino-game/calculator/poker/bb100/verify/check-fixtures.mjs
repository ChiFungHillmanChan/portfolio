// verify/check-fixtures.mjs — print deltas for all FIXTURES vs checkpoints
import { FIXTURES } from './fixtures.mjs';
import { loadAndCompute, ucToCentsRoundHalfUp, usdToCents } from '../tests/helpers/checkpoint-runner.mjs';

for (const [key, fixture] of Object.entries(FIXTURES)) {
  console.log(`\n=== ${key}: ${fixture.label} ===`);
  let allOk = true;
  try {
    const { allHands, seriesBefore } = await loadAndCompute(fixture);
    console.log(`Loaded ${allHands.length} hands (expected ${fixture.expectedHands})`);
    for (const [handN, expEv, expWin] of fixture.checkpoints) {
      const idx = handN - 1;
      const actEv  = ucToCentsRoundHalfUp(seriesBefore.evUC[idx]);
      const actWin = ucToCentsRoundHalfUp(seriesBefore.winningsUC[idx]);
      const expEvC  = usdToCents(expEv);
      const expWinC = usdToCents(expWin);
      const dEv  = actEv  - expEvC;
      const dWin = actWin - expWinC;
      const flag = (dEv !== 0 || dWin !== 0) ? '❌' : '✓';
      if (flag === '❌') allOk = false;
      console.log(
        `  ${String(handN).padStart(6)}  EV exp=${(expEvC/100).toFixed(2).padStart(8)} got=${(actEv/100).toFixed(2).padStart(8)} Δ=${(dEv).toString().padStart(4)}¢   Win exp=${(expWinC/100).toFixed(2).padStart(8)} got=${(actWin/100).toFixed(2).padStart(8)} Δ=${(dWin).toString().padStart(4)}¢  ${flag}`
      );
    }
    console.log(allOk ? '  ALL CHECKPOINTS MATCH' : '  HAS MISMATCHES');
  } catch (e) {
    console.log(`  SKIPPED: ${e.message}`);
  }
}
