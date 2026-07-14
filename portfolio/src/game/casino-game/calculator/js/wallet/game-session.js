// game-session.js — reusable glue between a wallet game page and the wallet
// platform. sessionCore() is pure (tested with a fake wallet client); the
// default createGameSession() wires the real singleton + DOM gate + HUD.
//
// Each game supplies a pure mapBets(gameBetState) → { serverBetType: amount }
// that collapses the game's rich bet keys into the server's payout-class
// buckets (only positive integer amounts included). The client keeps computing
// payouts; settle() sends the computed number and the server caps it.
//
// createGameSession() is DOM/Firebase-only (dynamic-imports wallet-bootstrap.js,
// game-gate.js, wallet-hud.js) so this top-level module stays importable under
// `node --test` without ever touching the browser or the Firebase CDN.

import { WalletError } from "./wallet-client.js";

export function sessionCore({ gameId, mapBets, walletClient }) {
  const buildBreakdown = (gameBets) => {
    const raw = mapBets(gameBets) || {};
    const breakdown = {};
    let total = 0;
    for (const [type, amount] of Object.entries(raw)) {
      if (Number.isInteger(amount) && amount > 0) { breakdown[type] = amount; total += amount; }
    }
    return { breakdown, total };
  };

  return {
    getBalance() { return walletClient.getBalance(); },
    hasOpenRound() { return walletClient.openRound(gameId) !== null; },
    openRound() { return walletClient.openRound(gameId); },

    async commitBet(gameBets) {
      const { breakdown, total } = buildBreakdown(gameBets);
      if (total <= 0) throw new WalletError("empty-bet", { status: 0 });
      return walletClient.bet(gameId, breakdown);
    },

    async topUp(gameBets) {
      const { breakdown, total } = buildBreakdown(gameBets);
      if (total <= 0) throw new WalletError("empty-bet", { status: 0 });
      return walletClient.topUp(gameId, breakdown);
    },

    async settle(payout) {
      const p = Number.isInteger(payout) && payout > 0 ? payout : 0;
      return walletClient.payout(gameId, p);
    },
  };
}

// Real wiring: gate + HUD + auth, returning the sessionCore plus mount helpers.
// gameEl = the game's root; hudHost = where the balance pill goes; onReady is
// called with the session once signed in + wallet loaded (balance known).
// lobbyHref is forwarded to mountGameGate's "Back to lobby" link — callers must
// pass the correct relative path for their own directory depth (the game-gate
// default of "../index.html" is only correct one directory below the lobby).
export async function createGameSession({ gameId, mapBets, minBet, gameEl, hudHost, lobbyHref, onReady, onSignedOut }) {
  const bootstrap = (await import("./wallet-bootstrap.js")).default;
  const { walletClient } = bootstrap;
  const { mountGameGate, computeGateState } = await import("./game-gate.js");
  const { mountWalletHud } = await import("./wallet-hud.js");

  const core = sessionCore({ gameId, mapBets, walletClient });

  // One reset handler shared by the gate's bust button and the HUD's reset
  // button. Declared before mountGameGate so it is initialized when the gate's
  // onReset reads it (a const referenced before its declaration would throw).
  const doReset = () => walletClient.reset().catch((e) => {
    const when = e && e.retryAt ? ` (try again after ${new Date(e.retryAt).toLocaleTimeString()})` : "";
    alert("Reset unavailable" + when);
  });

  // NOTE: wallet-bootstrap.js already calls walletClient.load() on sign-in and
  // walletClient.clear() on sign-out internally (see onAuthStateChanged there).
  // This function only DRIVES the gate/HUD off onAuth + walletClient.subscribe
  // — it must never call load()/clear() itself, or it would race/duplicate the
  // bootstrap's own lifecycle management.
  const gate = mountGameGate({
    container: gameEl,
    onSignIn: () => bootstrap.signIn().catch((e) => { console.error(e); alert("Sign-in failed: " + (e?.code || e?.message || "try again")); }),
    onReset: doReset,
    onBuyIn: (amount) => walletClient.buyIn(amount).catch((e) => {
      alert("Buy-in failed: " + (e?.code || e?.message || "try again"));
    }),
    ...(lobbyHref ? { lobbyHref } : {}),
  });

  // authReady/signedIn are tracked from the auth stream, not inferred from the
  // wallet balance — a signed-in user with balance 0 must still read as
  // signed-in (the brief's `!!balance || balance === 0` inference is fragile).
  let authReady = false;
  let signedIn = false;
  let hudMounted = false;
  let readyFired = false;

  const refresh = () => {
    const state = computeGateState({
      authReady,
      signedIn,
      balance: walletClient.getBalance(),
      cash: walletClient.getCash ? walletClient.getCash() : null,
      minBet,
    });
    gate.update(state);

    if (signedIn && hudHost && !hudMounted) {
      mountWalletHud(hudHost, walletClient, { onReset: doReset });
      hudMounted = true;
    }
    if (state.mode === "ready" && !readyFired) {
      readyFired = true;
      onReady && onReady(core);
    }
    if (!signedIn && readyFired) {
      readyFired = false;
      onSignedOut && onSignedOut();
    }
  };

  // Synchronous initial paint: show the "loading" overlay immediately so there
  // is no empty-overlay flash before onAuth fires asynchronously.
  gate.update(computeGateState({ authReady: false, signedIn: false, balance: null, minBet }));

  bootstrap.onAuth(({ signedIn: s }) => {
    authReady = true;
    signedIn = s;
    refresh();
  });
  walletClient.subscribe(() => refresh());

  return core;
}
