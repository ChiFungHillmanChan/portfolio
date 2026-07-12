// lobby.js — landing-page entry. Mounts the wallet HUD in the GAME LOBBY zone
// and makes that zone sign-in-aware: signed out shows a "Sign in to play"
// prompt; signed in shows the live balance HUD. Practice zone is untouched
// (always open). Game-card internals are unchanged here — Plan 3 converts them.

import bootstrap, { walletClient } from "./wallet-bootstrap.js";
import { mountWalletHud } from "./wallet-hud.js";

function init() {
  const zone = document.getElementById("gameLobbyAccount");
  if (!zone) return;

  const signedOut = zone.querySelector(".lobby-signin");
  const hudHost = zone.querySelector(".lobby-hud-host");
  let unmountHud = null;

  const signInBtn = zone.querySelector(".lobby-signin-btn");
  if (signInBtn) signInBtn.addEventListener("click", () => bootstrap.signIn().catch((e) => console.error(e)));

  bootstrap.onAuth(({ signedIn }) => {
    if (signedOut) signedOut.hidden = signedIn;
    if (hudHost) hudHost.hidden = !signedIn;
    if (signedIn && !unmountHud && hudHost) {
      unmountHud = mountWalletHud(hudHost, walletClient, {
        onReset: () => walletClient.reset().catch((e) => {
          const when = e && e.retryAt ? ` (try again after ${new Date(e.retryAt).toLocaleTimeString()})` : "";
          alert("Reset unavailable" + when);
        }),
      });
    }
    if (!signedIn && unmountHud) { unmountHud(); unmountHud = null; }
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
