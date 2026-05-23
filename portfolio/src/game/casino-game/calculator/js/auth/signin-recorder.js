// signin-recorder.js — Fires a one-shot POST /poker/record-signin whenever
// auth state transitions to a signed-in user on a fresh page load. The
// Lambda uses this to maintain users/{uid}.lastSeen + signInCount and the
// cumulative metrics/userCounts counter.
//
// We deliberately do NOT call this on every onAuthStateChanged event —
// Firebase fires that callback on every token refresh too. We dedupe by uid
// and per-tab session storage so a single page session counts as one sign-in.

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { auth } from "./firebase-init.js";
import { apiCall } from "./api-client.js";

const SESSION_KEY = "cg.recordSignin.uid";

function alreadyRecordedThisSession(uid) {
  try {
    return sessionStorage.getItem(SESSION_KEY) === uid;
  } catch {
    return false;
  }
}

function markRecorded(uid) {
  try {
    sessionStorage.setItem(SESSION_KEY, uid);
  } catch {}
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  if (alreadyRecordedThisSession(user.uid)) return;
  try {
    await apiCall("record-signin", {});
    markRecorded(user.uid);
  } catch (err) {
    // Best-effort — never block the UI on this.
    console.warn("[casino auth] record-signin failed:", err.message);
  }
});
