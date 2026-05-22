// api-client.js — Firebase-ID-token-bearing fetch wrapper for /poker/* API.
// Phase 3+ Lambda actions consume this. In Phase 2 there's no Lambda yet,
// so apiCall() is exported but only used in Phase 3.

import { auth, POKER_API_BASE } from "./firebase-init.js";

/**
 * Get the current user's Firebase ID token, auto-refreshing if near expiry.
 * Returns null if no user is signed in.
 */
export async function getIdToken({ forceRefresh = false } = {}) {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch (err) {
    console.error("[poker auth] getIdToken failed:", err);
    return null;
  }
}

/**
 * POST to api.system-design.hillmanchan.com/poker/<action> with the user's
 * Firebase ID token in the Authorization header. Throws on network errors
 * or non-2xx responses; returns the parsed JSON body otherwise.
 */
export async function apiCall(action, payload = {}) {
  const token = await getIdToken();
  if (!token) {
    throw new Error("not-signed-in");
  }
  const url = `${POKER_API_BASE}/poker/${action}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch {}
    throw new Error(`poker-api-${res.status}: ${detail.slice(0, 200)}`);
  }
  return res.json();
}
