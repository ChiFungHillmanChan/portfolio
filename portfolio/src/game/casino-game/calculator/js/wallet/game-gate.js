// game-gate.js — the full-screen overlay a wallet game shows until the player
// is signed in AND has enough chips for the table. computeGateState() is pure
// (tested); mountGameGate() renders the overlay and is wired by Plan 3 game
// pages. Below 100 chips is "bust" (offer reset); 100..minBet is "insufficient"
// (send them to a cheaper table); >= minBet is "ready" (dismiss).

const BUST_THRESHOLD = 100;

export function computeGateState({ authReady, signedIn, balance, minBet }) {
  if (!authReady) return { mode: "loading", message: "Loading…" };
  if (!signedIn) return { mode: "signin", message: "Sign in with Google to play with chips." };
  if (typeof balance !== "number") return { mode: "loading", message: "Loading your chips…" };
  if (balance < BUST_THRESHOLD) return { mode: "bust", message: "You're out of chips. Claim a free reset to keep playing." };
  if (balance < minBet) return { mode: "insufficient", message: `You need at least ${minBet.toLocaleString("en-US")} chips for this table. Try a lower-limit game.` };
  return { mode: "ready", message: "" };
}

// Overlay renderer. `opts`: { container, onSignIn, onReset, lobbyHref }.
// Returns { update(state), unmount() }. `state` is a computeGateState() result.
export function mountGameGate({ container, onSignIn, onReset, lobbyHref = "../index.html" }) {
  const overlay = document.createElement("div");
  overlay.className = "game-gate-overlay";
  container.appendChild(overlay);

  const update = (state) => {
    overlay.dataset.mode = state.mode;
    overlay.hidden = state.mode === "ready";
    if (state.mode === "ready") { overlay.innerHTML = ""; return; }
    const action =
      state.mode === "signin" ? `<button type="button" class="game-gate-btn" data-act="signin">Sign in with Google</button>`
      : state.mode === "bust" ? `<button type="button" class="game-gate-btn" data-act="reset">Reset +5,000 chips</button>`
      : state.mode === "insufficient" ? `<a class="game-gate-btn" href="${lobbyHref}">Back to lobby</a>`
      : "";
    overlay.innerHTML = `<div class="game-gate-card"><p class="game-gate-msg">${state.message}</p>${action}</div>`;
    const signinBtn = overlay.querySelector('[data-act="signin"]');
    if (signinBtn && onSignIn) signinBtn.addEventListener("click", () => onSignIn());
    const resetBtn = overlay.querySelector('[data-act="reset"]');
    if (resetBtn && onReset) resetBtn.addEventListener("click", () => onReset());
  };

  return { update, unmount: () => overlay.remove() };
}
