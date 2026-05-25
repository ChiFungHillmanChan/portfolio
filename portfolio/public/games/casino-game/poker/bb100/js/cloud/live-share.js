// live-share.js — Thin owner-side wrappers around the cg-poker live-share
// Lambda actions. Used by:
//   - bootstrap.js's post-save hook (fire-and-forget update on every save)
//   - Settings drawer "Live share" card (enable/disable/password)
//
// All actions require the user to be signed in (apiCall attaches a Firebase
// ID token automatically). The Lambda enforces tier checks server-side; this
// module trusts the response and surfaces 403s to the caller as the raw
// "poker-api-403: <body>" error from apiCall.
//
// The payload sanitiser is shared with snapshot shares via share-stats.js —
// both code paths must produce byte-identical R2 payloads so the public
// viewer page renders the same chart whether it loaded from a snapshot key
// or the live `live/{shareId}.json` key.

import { apiCall } from "../auth/api-client.js";
import { buildShareSummary, downsampleShareSeries } from "./share-stats.js";

// ── Payload prep ─────────────────────────────────────────────────────────────
// Mirrors buildSharePayload's series + summary sanitisation but drops the
// snapshot-only fields (type/title/expireDays). The Lambda's enable + update
// handlers expect this exact shape: { password?, summary, seriesBefore,
// seriesAfter, meta? }.
function buildLiveSharePayload({ password, summary, seriesBefore, seriesAfter, meta }) {
  if (!summary) throw new Error("summary-missing");
  if (!seriesAfter && !seriesBefore) throw new Error("series-missing");

  const payload = {
    summary:      buildShareSummary({ summary, meta }),
    seriesBefore: downsampleShareSeries(seriesBefore),
    seriesAfter:  downsampleShareSeries(seriesAfter),
  };

  // Only forward `password` when caller explicitly supplied it — for
  // update-live-share, an undefined password means "leave password
  // unchanged", whereas null/string means "set this exact value". The
  // Lambda treats absent password as no-op on the password field.
  if (password !== undefined) {
    payload.password = password;
  }
  return payload;
}

// ── API wrappers ─────────────────────────────────────────────────────────────

export async function enableLiveShare({ password, summary, seriesBefore, seriesAfter, meta }) {
  return apiCall(
    "enable-live-share",
    buildLiveSharePayload({ password, summary, seriesBefore, seriesAfter, meta }),
  );
}

export async function updateLiveShare({ summary, seriesBefore, seriesAfter, meta }) {
  // Note: update-live-share does NOT accept `password` — use
  // updateLiveSharePassword() to change the password.
  return apiCall(
    "update-live-share",
    buildLiveSharePayload({ summary, seriesBefore, seriesAfter, meta }),
  );
}

export async function disableLiveShare() {
  return apiCall("disable-live-share", {});
}

export async function getMyLiveShare() {
  return apiCall("get-my-live-share", {});
}

export async function updateLiveSharePassword(password) {
  // Pass null to remove the password, or a string to set it. Lambda
  // validates length / hashes via scrypt.
  return apiCall("update-live-share-password", { password: password ?? null });
}
