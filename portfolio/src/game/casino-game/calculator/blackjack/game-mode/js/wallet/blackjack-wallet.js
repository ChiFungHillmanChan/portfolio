// blackjack-wallet.js — wires the blackjack game-mode to the shared wallet
// (mirrors baccarat-wallet.js) AND picks the stake tier from ?stake=. Missing/
// unknown ?stake= mounts the shared stake picker instead of booting — picking
// a tier navigates to ?stake=<key> and this module re-runs with a real table.
// Exposes window.blackjackWallet (the session) and window.blackjackTable (the
// active tier's limits) for the classic (non-module) game-mode.js to use at
// the commit/topUp/settle seams. Blackjack is the first topUp (double/split)
// user of the wallet platform.

import { createGameSession } from "../../../../js/wallet/game-session.js";
import bootstrap from "../../../../js/wallet/wallet-bootstrap.js";
import { mapBlackjackBets } from "./bet-map.js";
import { getTable, betTypeSpec } from "../../../../js/wallet/table-config.js";
import { stakeFromUrl, mountStakePicker } from "../../../../js/wallet/stake-picker.js";

window.blackjackWallet = null;
window.blackjackTable = null;

const stake = stakeFromUrl("blackjack", location.search);

if (!stake) {
  // No (valid) tier picked yet — show the picker, don't boot the wallet.
  // game-mode/ is two directories below the lobby (see lobbyHref note below).
  mountStakePicker({
    game: "blackjack",
    title: "Blackjack — Choose Your Stakes",
    container: document.body,
    lobbyHref: "../../index.html",
  });
} else {
  const table = getTable(stake.gameId);
  // The active tier's limits, read by game-mode.js instead of its old
  // hardcoded config.minBet/maxBet/maxSideBet. main.max caps the SUM of all
  // seats' base bets (the server merges seats into one `main` bucket).
  window.blackjackTable = {
    gameId: stake.gameId,
    stakeKey: stake.key,
    stakeName: stake.name,
    maxTotalBet: table.maxTotalBet,
    main: table.betTypes.main,
    perfectPair: table.betTypes.perfectPair,
    twentyOnePlus3: table.betTypes.twentyOnePlus3,
    top3: table.betTypes.top3,
  };

  createGameSession({
    gameId: stake.gameId,
    mapBets: mapBlackjackBets,
    minBet: betTypeSpec(stake.gameId, "main").min,
    gameEl: document.body,
    hudHost: document.getElementById("walletHudHost"),
    // blackjack/game-mode/ is two directories below the lobby; the game-gate's
    // default lobbyHref ("../index.html") would resolve to blackjack/index.html
    // (the card-counting practice hub), not the credits lobby — must be passed.
    lobbyHref: "../../index.html",
    onReady: (session) => {
      window.blackjackWallet = session;
      // If the server had an open round we didn't finish (e.g. a tab crash
      // mid-hand), the hand is gone — true recovery isn't possible in Plan 3.
      // Surface it loudly rather than silently eating the stuck stake; the
      // next commitBet will throw "round-in-progress" until it's resolved.
      if (session.hasOpenRound()) {
        console.warn("[blackjack] resuming with an open wallet round:", session.openRound());
      }
      document.dispatchEvent(new CustomEvent("wallet:ready"));
    },
    onSignedOut: () => {
      window.blackjackWallet = null;
      document.dispatchEvent(new CustomEvent("wallet:signedout"));
    },
  }).catch((e) => console.error("[blackjack] wallet session failed:", e));

  // Keep the in-game bankroll display mirrored to the wallet's server-
  // confirmed balance for changes the game itself didn't just cause (e.g. a
  // bust-reset from the HUD's own Reset button). commitBet()/topUp()/settle()
  // already resolve with the fresh balance for the changes the game DOES
  // cause; this covers the rest. bootstrap.walletClient is the same singleton
  // createGameSession wires internally — an additional observer, not a
  // duplicate load()/clear() driver.
  bootstrap.walletClient.subscribe(() => {
    if (window.blackjackWallet) document.dispatchEvent(new CustomEvent("wallet:balance"));
  });
}
