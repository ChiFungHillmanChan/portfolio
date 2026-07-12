// baccarat-wallet.js — wires the baccarat game to the shared wallet (mirrors
// roulette-wallet.js). Replaces the old setup panel: the game gate handles
// sign-in/insufficient/bust, and the player's chips ARE the wallet balance.
// Exposes window.baccaratWallet for the classic (non-module) game scripts
// (state.js, init.js, game-logic.js, render.js) to call at the debit/settle
// seams and to read the confirmed balance from.

import { createGameSession } from "../../../../js/wallet/game-session.js";
import bootstrap from "../../../../js/wallet/wallet-bootstrap.js";
import { mapBaccaratBets } from "./bet-map.js";

const LOWEST_MIN = 100; // lowest bucket minimum (tie/pairs/dragon/egalite — see table-config.js GAME_TABLES.baccarat)

window.baccaratWallet = null;

createGameSession({
  gameId: "baccarat",
  mapBets: mapBaccaratBets,
  minBet: LOWEST_MIN,
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
