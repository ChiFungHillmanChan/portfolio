// bet-map.js — collapses baccarat's flat betState into the server's buckets
// (pure; unit-tested). player/banker/tie/playerPair/bankerPair map 1:1;
// dragonPlayer + dragonBanker aggregate into dragonBonus; egalite0..egalite9
// aggregate into egalite.

const pos = (n) => (typeof n === "number" && n > 0 ? n : 0);

export function mapBaccaratBets(betState) {
  const b = betState || {};
  let egalite = 0;
  for (let i = 0; i <= 9; i++) egalite += pos(b["egalite" + i]);
  const buckets = {
    player: pos(b.player),
    banker: pos(b.banker),
    tie: pos(b.tie),
    playerPair: pos(b.playerPair),
    bankerPair: pos(b.bankerPair),
    dragonBonus: pos(b.dragonPlayer) + pos(b.dragonBanker),
    egalite,
  };
  const out = {};
  for (const [k, v] of Object.entries(buckets)) if (v > 0) out[k] = v;
  return out;
}
