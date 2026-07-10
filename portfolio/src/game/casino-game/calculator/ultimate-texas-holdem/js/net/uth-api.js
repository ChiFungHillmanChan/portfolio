// uth-api.js — Firebase-ID-token-bearing fetch wrapper for /uth/* actions.
// Mirrors ../../js/auth/api-client.js but targets the cg-uth Lambda routes.
//
// UTH is real-time: every action is a Firestore transaction the UI waits on,
// so the Lambda MUST sit next to the database. Firestore lives in asia-east1
// (Taiwan); this endpoint is the cg-uth Lambda in ap-northeast-1 (Tokyo),
// ~35 ms from Firestore. Routing writes through the London sa-api gateway
// instead cost ~600-850 ms per action (two intercontinental hops) — this
// direct regional endpoint brings it to ~90-100 ms server-side.

import { auth } from "../../../js/auth/firebase-init.js";

const UTH_API_BASE = "https://841ze82i0b.execute-api.ap-northeast-1.amazonaws.com";

export async function uthCall(action, payload = {}) {
  const user = auth.currentUser;
  if (!user) {
    const err = new Error("not-signed-in");
    err.code = "not-signed-in";
    throw err;
  }
  const token = await user.getIdToken();
  const res = await fetch(`${UTH_API_BASE}/uth/${action}`, {
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
