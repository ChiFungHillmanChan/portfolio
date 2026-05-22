// checkout.js — initiates a Stripe Checkout for a poker subscription tier.
// Backend: POST /poker/create-checkout-session { priceLookupKey } → { ok, url }
// On success, redirects the browser to the returned Stripe Checkout URL.

import { apiCall } from "../auth/api-client.js";

const VALID_LOOKUP_KEYS = new Set([
  "poker_standard_month",
  "poker_standard_year",
  "poker_pro_month",
  "poker_pro_year",
  "poker_ultra_month",
  "poker_ultra_year",
]);

/**
 * Start a Stripe Checkout flow for the given price lookup key.
 * Redirects to Stripe on success; throws on failure (caller shows error).
 *
 * @param {string} priceLookupKey  e.g. "poker_pro_month"
 */
export async function startCheckout(priceLookupKey) {
  if (!VALID_LOOKUP_KEYS.has(priceLookupKey)) {
    throw new Error(`unknown priceLookupKey: ${priceLookupKey}`);
  }
  const resp = await apiCall("create-checkout-session", { priceLookupKey });
  if (!resp.ok || !resp.url) {
    throw new Error(resp.error || "checkout creation failed");
  }
  window.location.href = resp.url;
}
