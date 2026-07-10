// uth-api.js — Firebase-ID-token-bearing fetch wrapper for /uth/* actions.
// Mirrors ../../js/auth/api-client.js but targets the cg-uth Lambda routes.

import { auth, POKER_API_BASE } from "../../../js/auth/firebase-init.js";

export async function uthCall(action, payload = {}) {
  const user = auth.currentUser;
  if (!user) {
    const err = new Error("not-signed-in");
    err.code = "not-signed-in";
    throw err;
  }
  const token = await user.getIdToken();
  const res = await fetch(`${POKER_API_BASE}/uth/${action}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const err = new Error(data.error || `uth-${res.status}`);
    err.code = data.error || `http-${res.status}`;
    err.status = res.status;
    throw err;
  }
  return data;
}
