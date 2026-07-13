// bet-map.js — collapses blackjack's bet state into the server's payout-class
// buckets (pure; unit-tested), mirroring roulette/baccarat bet-map.js. The
// server table is the same shape across every stake tier, so this map is
// tier-independent — the tier only changes the min/max the caller enforces.
//
// Blackjack buckets: `main` = the sum of all seats' base bets (the caller
// aggregates seats before calling); `perfectPair` / `twentyOnePlus3` / `top3`
// are the three global side bets, mapped 1:1. Only positive integer amounts are
// emitted. Double/split are same-round top-ups of `main` only (not this map's
// job — the caller sends { main: delta } straight to session.topUp).

const pos = (n) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0);

export function mapBlackjackBets(bets) {
  const b = bets || {};
  const buckets = {
    main: pos(b.main),
    perfectPair: pos(b.perfectPair),
    twentyOnePlus3: pos(b.twentyOnePlus3),
    top3: pos(b.top3),
  };
  const out = {};
  for (const [k, v] of Object.entries(buckets)) if (v > 0) out[k] = v;
  return out;
}
