// roulette-wallet.js — wires the roulette game to the shared wallet AND picks
// the stake tier from ?stake=. Missing/unknown ?stake= mounts the shared stake
// picker instead of booting — picking a tier navigates to ?stake=<key> and
// this module re-runs with a real table. Replaces the old setup panel: the
// game gate handles sign-in/insufficient/bust, and the player's chips ARE the
// wallet balance. Exposes window.rouletteWallet for the classic (non-module)
// game scripts (event-handlers.js, init.js) to call at the debit/settle seams,
// and window.rouletteTable for the active tier's limits.

import { createGameSession } from "../../../js/wallet/game-session.js";
import bootstrap from "../../../js/wallet/wallet-bootstrap.js";
import { mapRouletteBets, findMinViolation } from "./bet-map.js";
import { getTable } from "../../../js/wallet/table-config.js";
import { stakeFromUrl, mountStakePicker } from "../../../js/wallet/stake-picker.js";

window.rouletteWallet = null;
window.rouletteTable = null;

const stake = stakeFromUrl("roulette", location.search);

if (!stake) {
  // No (valid) tier picked yet — show the picker, don't boot the wallet.
  mountStakePicker({
    game: "roulette",
    title: "Roulette — Choose Your Stakes",
    container: document.body,
    lobbyHref: "../index.html",
  });
} else {
  const table = getTable(stake.gameId);
  // How the per-class buckets read to a player, for min-violation messages.
  const CLASS_LABEL = {
    straight: "Straight-up", split: "Split", street: "Street/Trio",
    corner: "Corner/First-four", sixline: "Six-line", column: "Column",
    dozen: "Dozen", evenMoney: "Even-money",
  };
  // Active tier's limits for init.js/event-handlers.js: every roulette bet
  // class shares the tier min; perSpotMax is the client-only UX cap (the
  // server caps per-CLASS aggregates at maxTotalBet, not per spot).
  window.rouletteTable = {
    gameId: stake.gameId,
    stakeKey: stake.key,
    stakeName: stake.name,
    min: table.betTypes.straight.min,
    perSpotMax: stake.perSpotMax,
    maxTotalBet: table.maxTotalBet,
    // Spin-time mirror of the server's per-class MIN rule (chips are placed
    // one at a time from 0, so placement can't enforce it). Returns a friendly
    // message when the server would reject the bet as bad-bets, else null.
    checkBets(betState) {
      const v = findMinViolation(betState, table.betTypes);
      if (!v) return null;
      return `${CLASS_LABEL[v.type] || v.type} bets total ${v.amount.toLocaleString()} — table minimum is ${v.min.toLocaleString()} per bet type`;
    },
  };

  createGameSession({
    gameId: stake.gameId,
    mapBets: mapRouletteBets,
    minBet: table.betTypes.straight.min,
    gameEl: document.body,
    hudHost: document.getElementById("walletHudHost"),
    onReady: (session) => {
      window.rouletteWallet = session;
      // If the server had an open round we didn't finish (e.g. a tab crash mid-
      // spin), the spin result is gone — true recovery isn't possible in Plan 3.
      // Surface it loudly rather than silently eating the stuck stake; the next
      // commitBet will throw "round-in-progress" until it's resolved server-side.
      if (session.hasOpenRound()) {
        console.warn("[roulette] resuming with an open wallet round:", session.openRound());
      }
      document.dispatchEvent(new CustomEvent("wallet:ready"));
    },
    onSignedOut: () => {
      window.rouletteWallet = null;
      document.dispatchEvent(new CustomEvent("wallet:signedout"));
    },
  }).catch((e) => console.error("[roulette] wallet session failed:", e));

  // Keep the in-game bankroll display mirrored to the wallet's server-confirmed
  // balance for changes the game itself didn't just cause (e.g. a bust-reset
  // from the HUD's own Reset button). commitBet()/settle() already resolve with
  // the fresh balance for the changes the game DOES cause; this covers the rest.
  // bootstrap.walletClient is the same singleton instance createGameSession
  // wires up internally, so this is an additional observer, not a duplicate
  // load()/clear() driver.
  bootstrap.walletClient.subscribe(() => {
    if (window.rouletteWallet) document.dispatchEvent(new CustomEvent("wallet:balance"));
  });
}
