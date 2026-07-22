// Pure hit-accumulation model: paper damage stage, shoe prints, combo streaks.
const STAGE_AT = [15, 40, 80];
const PRINT_CAP = 14;
const COMBO_GAP_MS = 450;
const BURSTS = new Set([5, 10, 20, 40, 80]);

export function createDamage() {
  let count = 0, combo = 0, lastHitAt = -Infinity, seq = 0;
  const prints = [];
  const stage = () => STAGE_AT.filter((n) => count >= n).length;
  return {
    hit(x, y, now) {
      count += 1;
      combo = (now - lastHitAt) <= COMBO_GAP_MS ? combo + 1 : 1;
      lastHitAt = now;
      const print = { x, y, angle: ((seq * 137) % 60 - 30) * Math.PI / 180, seq: seq++ };
      prints.push(print);
      if (prints.length > PRINT_CAP) prints.shift();
      return { count, stage: stage(), combo, comboBurst: BURSTS.has(combo), print };
    },
    state: () => ({ count, stage: stage(), prints: [...prints], combo })
  };
}
