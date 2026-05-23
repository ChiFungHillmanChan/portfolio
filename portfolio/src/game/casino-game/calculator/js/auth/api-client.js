// api-client.js — Firebase-ID-token-bearing fetch wrapper for /poker/* API.
// Shared by the whole casino-game suite. bb100's local api-client.js
// re-exports from here.

import { auth, POKER_API_BASE } from "./firebase-init.js";

export async function getIdToken({ forceRefresh = false } = {}) {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch (err) {
    console.error("[casino auth] getIdToken failed:", err);
    return null;
  }
}

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
