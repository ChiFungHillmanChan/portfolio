// portal.js — opens the Stripe Customer Portal so the user can manage
// their subscription (cancel, upgrade, switch payment method).
// Backend: POST /poker/create-portal-session {} → { ok, url }

import { apiCall } from "../auth/api-client.js";

/**
 * Open the Stripe Customer Portal in the same tab (redirect).
 * Throws if the user has no Stripe customer record yet (i.e. never subscribed).
 */
export async function openPortal() {
  const resp = await apiCall("create-portal-session", {});
  if (!resp.ok || !resp.url) {
    throw new Error(resp.error || "portal creation failed");
  }
  window.location.href = resp.url;
}
