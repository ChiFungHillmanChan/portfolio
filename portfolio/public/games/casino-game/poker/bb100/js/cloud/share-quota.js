// share-quota.js — daily video-share quota for the replay share feature.
// API:
//   /poker/get-share-quota      → { ok, tier, limit, used, remaining, unlimited }
//   /poker/record-video-share   → 200 { ok, used, remaining, ... }
//                                  403 { ok:false, error:"quota-exceeded", limit, used }
//
// Free plan = 1 video share / day. Paid tiers + superadmin = unlimited
// (the limit is Number.MAX_SAFE_INTEGER on the wire; treat it as ∞).

import { apiCall } from "../auth/api-client.js";

// Backend uses Number.MAX_SAFE_INTEGER as the sentinel for unlimited; treat
// anything past a sane usage ceiling the same way (mirrors quota.js).
const UNLIMITED_THRESHOLD = 100_000_000;

export function isUnlimited(quota) {
  if (!quota) return false;
  if (quota.unlimited) return true;
  if (quota.tier === "superadmin") return true;
  return (quota.limit || 0) >= UNLIMITED_THRESHOLD;
}

export async function getShareQuota() {
  try {
    return await apiCall("get-share-quota", {});
  } catch (err) {
    console.warn("[share-quota] get-share-quota failed:", err.message);
    return null;
  }
}

// Reserves one share slot. Throws on network failure; returns { ok:false,
// error:"quota-exceeded", ... } when the user is at their daily cap (the
// fetch wrapper turns 403 into an error, so we have to inspect the message).
export async function recordVideoShare() {
  try {
    return await apiCall("record-video-share", {});
  } catch (err) {
    // apiCall throws "poker-api-403: <body>" for non-2xx. Parse the body so
    // callers can branch on quota-exceeded vs auth / network failures.
    const m = /^poker-api-(\d+):\s*(.*)$/.exec(err.message || "");
    if (m && m[1] === "403") {
      try {
        const parsed = JSON.parse(m[2]);
        return { ...parsed, statusCode: 403 };
      } catch {
        return { ok: false, error: "quota-exceeded", statusCode: 403 };
      }
    }
    throw err;
  }
}
