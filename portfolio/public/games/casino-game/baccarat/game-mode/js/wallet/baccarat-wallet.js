// baccarat-wallet.js — wires the baccarat game to the shared wallet (mirrors
// roulette-wallet.js) AND picks the stake tier from ?stake=. Missing/unknown
// ?stake= mounts the shared stake picker instead of booting — picking a tier
// navigates to ?stake=<key> and this module re-runs with a real table.
// Replaces the old setup panel: the game gate handles sign-in/insufficient/
// bust, and the player's chips ARE the wallet balance. Exposes
// window.baccaratWallet for the classic (non-module) game scripts (state.js,
// init.js, game-logic.js, render.js) to call at the debit/settle seams, and
// window.baccaratTable for the active tier's limits (state.js derives its
// per-spot caps from it).

import { createGameSession } from "../../../../js/wallet/game-session.js";
import bootstrap from "../../../../js/wallet/wallet-bootstrap.js";
import { mapBaccaratBets } from "./bet-map.js";
import { getTable } from "../../../../js/wallet/table-config.js";
import { stakeFromUrl, mountStakePicker } from "../../../../js/wallet/stake-picker.js";

window.baccaratWallet = null;
window.baccaratTable = null;

const stake = stakeFromUrl("baccarat", location.search);

if (!stake) {
  // No (valid) tier picked yet — show the picker, don't boot the wallet.
  // game-mode/ is two directories below the lobby (see lobbyHref note below).
  mountStakePicker({
    game: "baccarat",
    title: "Baccarat — Choose Your Stakes",
    container: document.body,
    lobbyHref: "../../index.html",
  });
} else {
  const table = getTable(stake.gameId);
  window.baccaratTable = {
    gameId: stake.gameId,
    stakeKey: stake.key,
    stakeName: stake.name,
    maxTotalBet: table.maxTotalBet,
    betTypes: table.betTypes,
  };

  createGameSession({
    gameId: stake.gameId,
    mapBets: mapBaccaratBets,
    // Lowest bucket minimum (tie/pairs/dragon/egalité share it) — the cheapest
    // playable bet on this tier, which is what the gate's "insufficient"
    // threshold should reflect.
    minBet: table.betTypes.tie.min,
    gameEl: document.body,
    hudHost: document.getElementById("walletHudHost"),
    // baccarat/game-mode/ is two directories below the lobby; the game-gate's
    // default lobbyHref ("../index.html") would resolve to baccarat/index.html
    // (the practice/card-counting hub), not the credits lobby — must be passed.
    lobbyHref: "../../index.html",
    onReady: (session) => {
      window.baccaratWallet = session;
      // If the server had an open round we didn't finish (e.g. a tab crash mid-
      // hand), the hand result is gone — true recovery isn't possible in Plan 3.
      // Surface it loudly rather than silently eating the stuck stake; the next
      // commitBet will throw "round-in-progress" until it's resolved server-side.
      if (session.hasOpenRound()) {
        console.warn("[baccarat] resuming with an open wallet round:", session.openRound());
      }
      document.dispatchEvent(new CustomEvent("wallet:ready"));
    },
    onSignedOut: () => {
      window.baccaratWallet = null;
      document.dispatchEvent(new CustomEvent("wallet:signedout"));
    },
  }).catch((e) => console.error("[baccarat] wallet session failed:", e));

  // Keep the in-game bankroll display mirrored to the wallet's server-confirmed
  // balance for changes the game itself didn't just cause (e.g. a bust-reset
  // from the HUD's own Reset button). commitBet()/settle() already resolve with
  // the fresh balance for the changes the game DOES cause; this covers the rest.
  // bootstrap.walletClient is the same singleton instance createGameSession
  // wires up internally, so this is an additional observer, not a duplicate
  // load()/clear() driver.
  bootstrap.walletClient.subscribe(() => {
    if (window.baccaratWallet) document.dispatchEvent(new CustomEvent("wallet:balance"));
  });
}
