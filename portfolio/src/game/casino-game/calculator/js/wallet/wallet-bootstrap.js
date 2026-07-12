// wallet-bootstrap.js — constructs the real, shared wallet client from Firebase
// auth + the deployed cg-poker wallet API, and broadcasts auth changes. Browser
// only (imports the Firebase CDN). Game pages and the lobby import this.
//
// postWallet() intentionally does NOT use api-client.js#apiCall — that helper
// throws away 4xx bodies, but the wallet needs the {error, retryAt} payload on
// every status. So it does its own token + fetch and returns {status, body}.

import { onAuthStateChanged, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { auth, googleProvider, POKER_API_BASE } from "../auth/firebase-init.js";
import { getIdToken } from "../auth/api-client.js";
import { createWalletClient } from "./wallet-client.js";

async function postWallet(action, payload) {
  const token = await getIdToken();
  if (!token) return { status: 401, body: { ok: false, error: "not-signed-in" } };
  let res;
  try {
    res = await fetch(`${POKER_API_BASE}/poker/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return { status: 0, body: { ok: false, error: "network-error" } };
  }
  let body = {};
  try { body = await res.json(); } catch { body = { ok: false, error: `http-${res.status}` }; }
  return { status: res.status, body };
}

const ROUND_PREFIX = "casinoWallet:round:";
function clearLocalRounds() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(ROUND_PREFIX)) localStorage.removeItem(k);
    }
  } catch { /* storage unavailable — nothing to clear */ }
}

export const walletClient = createWalletClient({
  post: postWallet,
  storage: {
    getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
    removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  },
  now: () => Date.now(),
  randomId: () => (crypto?.randomUUID ? crypto.randomUUID() : `r${Date.now()}${Math.random().toString(36).slice(2)}`),
});

const authSubs = new Set();
let lastUid = null;

onAuthStateChanged(auth, (user) => {
  const signedIn = !!user;
  if (user && user.uid !== lastUid) {
    lastUid = user.uid;
    walletClient.load().catch((err) => console.error("[casino wallet] load failed:", err));
  }
  if (!user) {
    lastUid = null;
    clearLocalRounds();
  }
  for (const cb of authSubs) cb({ signedIn, user: user || null });
});

export function onAuth(cb) { authSubs.add(cb); return () => authSubs.delete(cb); }
export function signIn() { return signInWithPopup(auth, googleProvider); }

export default { walletClient, onAuth, signIn };
