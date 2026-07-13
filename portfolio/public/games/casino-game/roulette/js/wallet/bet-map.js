// bet-map.js — collapses roulette's rich betState into the server's 8
// payout-class buckets (pure; unit-tested). Object-map bet types
// (straight/split/street/trio/corner/line/column/dozen) hold {spotKey: amount};
// firstFour/topLine and the even-money flags hold flat amounts.
// Grouping is by payout class:
//   straight→straight, split→split, street&trio→street,
//   corner&firstFour&topLine→corner, line→sixline, column→column,
//   dozen→dozen, red/black/even/odd/low/high→evenMoney.

const sumMap = (m) => Object.values(m || {}).reduce((a, b) => a + (b > 0 ? b : 0), 0);

export function mapRouletteBets(betState) {
  const b = betState || {};
  const buckets = {
    straight: sumMap(b.straight),
    split: sumMap(b.split),
    street: sumMap(b.street) + sumMap(b.trio),
    corner: sumMap(b.corner) + (b.firstFour > 0 ? b.firstFour : 0) + (b.topLine > 0 ? b.topLine : 0),
    sixline: sumMap(b.line),
    column: sumMap(b.column),
    dozen: sumMap(b.dozen),
    evenMoney: ["red", "black", "even", "odd", "low", "high"].reduce((a, k) => a + (b[k] > 0 ? b[k] : 0), 0),
  };
  const out = {};
  for (const [k, v] of Object.entries(buckets)) if (v > 0) out[k] = v;
  return out;
}
