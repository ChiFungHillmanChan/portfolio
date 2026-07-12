// roulette-wallet.js — wires the roulette game to the shared wallet. Replaces
// the old setup panel: the game gate handles sign-in/insufficient/bust, and the
// player's chips ARE the wallet balance. Exposes window.rouletteWallet for the
// classic (non-module) game scripts (event-handlers.js, init.js) to call at the
// debit/settle seams and to read the confirmed balance from.

import { createGameSession } from "../../../js/wallet/game-session.js";
import bootstrap from "../../../js/wallet/wallet-bootstrap.js";
import { mapRouletteBets } from "./bet-map.js";

const LOWEST_MIN = 100; // lowest per-spot minimum (see table-config.js GAME_TABLES.roulette)

window.rouletteWallet = null;

createGameSession({
  gameId: "roulette",
  mapBets: mapRouletteBets,
  minBet: LOWEST_MIN,
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
