// quota.js — fetches and renders the user's storage quota.
// API: /poker/get-quota → { tier, handCount, limit, ... }

import { apiCall } from "../auth/api-client.js";

const TIER_LABELS = {
  free: "Free",
  standard: "Standard",
  pro: "Pro",
  ultra: "Ultra",
  superadmin: "Superadmin",
};

// Limits at or above this threshold are treated as unbounded — the backend
// uses Number.MAX_SAFE_INTEGER as the sentinel for unlimited (superadmin),
// but any limit beyond a realistic plan ceiling (Ultra=5M) is "unlimited".
const UNLIMITED_THRESHOLD = 100_000_000;

let cachedQuota = null;
let cacheExpiresAt = 0;

export async function getQuota({ force = false } = {}) {
  const now = Date.now();
  if (!force && cachedQuota && cacheExpiresAt > now) return cachedQuota;
  try {
    const q = await apiCall("get-quota", {});
    cachedQuota = q;
    cacheExpiresAt = now + 30_000; // 30s cache
    return q;
  } catch (err) {
    console.warn("[poker quota] get-quota failed:", err.message);
    return null;
  }
}

export function invalidateQuotaCache() {
  cachedQuota = null;
  cacheExpiresAt = 0;
}

export function renderQuotaMeter(container, quota) {
  if (!container) return;
  if (!quota || !quota.ok) {
    container.replaceChildren();
    return;
  }
  const used = quota.handCount || 0;
  const limit = quota.limit || 1;
  // Treat superadmin as unlimited regardless of the numeric limit the
  // backend sends (it uses Number.MAX_SAFE_INTEGER as the sentinel — which
  // looks like "9,007,199,254,740,991" when rendered with toLocaleString).
  const isUnlimited = quota.tier === "superadmin" || limit >= UNLIMITED_THRESHOLD;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const tier = TIER_LABELS[quota.tier] || "Free";
  const barClass = isUnlimited
    ? "qm-unlimited"
    : pct >= 95 ? "qm-red" : pct >= 80 ? "qm-orange" : "qm-green";

  const limitDisplay = isUnlimited ? "∞" : limit.toLocaleString();

  container.replaceChildren();
  const wrap = document.createElement("div");
  wrap.className = "quota-meter";
  wrap.innerHTML = `
    <div class="qm-label">
      <span class="qm-tier">${tier}</span>
      <span class="qm-count">${used.toLocaleString()} / ${limitDisplay} hands</span>
    </div>
    <div class="qm-track"><div class="qm-fill ${barClass}" style="width:${isUnlimited ? 100 : pct}%"></div></div>
  `;
  container.appendChild(wrap);
}
