// tier-banner.js — renders the tier upgrade card + "Manage subscription" link.
// Lives under the quota meter inside the upload-results panel.
//
// States:
//   tier="free"                       → show 3 tier cards w/ monthly+annual options + Upgrade buttons
//   tier="standard"/"pro"             → show current tier badge + upgrade buttons for HIGHER tiers + "Manage" link
//   tier="ultra"                      → show current tier badge + "Manage subscription" link only

import { startCheckout } from "./checkout.js";
import { openPortal } from "./portal.js";

const TIERS = [
  { key: "standard", label: "Standard", hands: 100000, monthly: 20, yearly: 200 },
  { key: "pro",      label: "Pro",      hands: 500000, monthly: 40, yearly: 400 },
  { key: "ultra",    label: "Ultra",    hands: 5000000, monthly: 80, yearly: 800 },
];

const TIER_ORDER = ["free", "standard", "pro", "ultra"];

function tierIndex(tier) {
  const i = TIER_ORDER.indexOf(tier || "free");
  return i < 0 ? 0 : i;
}

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

async function onUpgradeClick(priceLookupKey, btn) {
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Opening Stripe…";
  try {
    await startCheckout(priceLookupKey);
    // Browser navigates away on success
  } catch (err) {
    console.error("[poker upgrade] startCheckout failed:", err);
    btn.disabled = false;
    btn.textContent = orig;
    alert("Could not start checkout: " + err.message);
  }
}

async function onManageClick(btn) {
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Opening portal…";
  try {
    await openPortal();
  } catch (err) {
    console.error("[poker portal] openPortal failed:", err);
    btn.disabled = false;
    btn.textContent = orig;
    alert("Could not open subscription portal: " + err.message);
  }
}

function tierCard(tier, currentTier) {
  const currentIdx = tierIndex(currentTier);
  const thisIdx = TIER_ORDER.indexOf(tier.key);
  const isCurrent = tier.key === currentTier;
  const isLower = thisIdx < currentIdx;

  const card = el("div", { class: "tier-card" + (isCurrent ? " tier-current" : "") });

  card.appendChild(el("div", { class: "tier-card-name" }, [tier.label]));
  card.appendChild(el("div", { class: "tier-card-hands" }, [`${fmt(tier.hands)} hands`]));

  const priceRow = el("div", { class: "tier-card-prices" });
  priceRow.appendChild(el("div", { class: "tier-card-price" }, [
    el("span", { class: "tier-card-amount" }, [`HK$${tier.monthly}`]),
    el("span", { class: "tier-card-period" }, ["/month"]),
  ]));
  priceRow.appendChild(el("div", { class: "tier-card-price annual" }, [
    el("span", { class: "tier-card-amount" }, [`HK$${tier.yearly}`]),
    el("span", { class: "tier-card-period" }, [`/year (save ~17%)`]),
  ]));
  card.appendChild(priceRow);

  if (isCurrent) {
    card.appendChild(el("div", { class: "tier-card-status" }, ["Your current plan"]));
  } else if (isLower) {
    card.appendChild(el("div", { class: "tier-card-status muted" }, ["(downgrade via Manage)"]));
  } else {
    const btnRow = el("div", { class: "tier-card-buttons" });
    const monthBtn = el("button", {
      type: "button",
      class: "tier-btn tier-btn-month",
      onclick: (e) => onUpgradeClick(`poker_${tier.key}_month`, e.currentTarget),
    }, [`Subscribe monthly`]);
    const yearBtn = el("button", {
      type: "button",
      class: "tier-btn tier-btn-year",
      onclick: (e) => onUpgradeClick(`poker_${tier.key}_year`, e.currentTarget),
    }, [`Subscribe yearly`]);
    btnRow.appendChild(monthBtn);
    btnRow.appendChild(yearBtn);
    card.appendChild(btnRow);
  }

  return card;
}

/**
 * Render the tier-options card into the given container.
 * @param {HTMLElement} container
 * @param {{tier?:string, subStatus?:string, currentPeriodEnd?:number|null}} quota
 */
export function renderTierBanner(container, quota) {
  if (!container) return;
  container.replaceChildren();
  if (!quota || !quota.ok) return;

  const tier = quota.tier || "free";
  const hasSub = !!quota.subStatus && quota.subStatus !== "canceled";
  const periodEnd = quota.currentPeriodEnd ? new Date(quota.currentPeriodEnd) : null;

  const wrap = el("div", { class: "tier-banner" });

  // Header row — current tier summary + Manage subscription button (if applicable)
  const header = el("div", { class: "tier-banner-header" });
  const lead = tier === "free"
    ? "Need more storage? Pick a plan:"
    : `You're on the ${tier[0].toUpperCase() + tier.slice(1)} plan.`;
  header.appendChild(el("div", { class: "tier-banner-lead" }, [lead]));
  if (hasSub) {
    const right = el("div", { class: "tier-banner-actions" });
    if (periodEnd && !isNaN(periodEnd.getTime())) {
      right.appendChild(el("span", { class: "tier-banner-period" }, [
        `Renews ${periodEnd.toLocaleDateString()}`,
      ]));
    }
    const manageBtn = el("button", {
      type: "button",
      class: "tier-manage-btn",
      onclick: (e) => onManageClick(e.currentTarget),
    }, ["Manage subscription"]);
    right.appendChild(manageBtn);
    header.appendChild(right);
  }
  wrap.appendChild(header);

  // Tier cards row
  const cards = el("div", { class: "tier-card-row" });
  for (const t of TIERS) cards.appendChild(tierCard(t, tier));
  wrap.appendChild(cards);

  container.appendChild(wrap);
}

/**
 * Show a one-time success banner if the URL has ?upgraded=1 (Stripe success_url callback).
 * Removes the query param from the URL after display.
 *
 * @param {HTMLElement} container
 * @returns {boolean} true if the banner was shown
 */
export function maybeShowUpgradedToast(container) {
  if (!container) return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("upgraded") !== "1") return false;
  const toast = el("div", { class: "upgrade-toast" }, [
    el("strong", {}, [
      // Inline check SVG built via createContextualFragment so the existing
      // `el()` helper (which uses createTextNode for string children) doesn't
      // render the markup as literal text.
      document.createRange().createContextualFragment(
        `<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="5 12 10 17 19 7"/></svg>`
      ),
      " Payment succeeded.",
    ]),
    el("span", {}, [" Your new plan is activating now. Quota will update in a few seconds."]),
  ]);
  container.appendChild(toast);
  // Auto-dismiss after 10s
  setTimeout(() => toast.remove(), 10_000);
  // Strip the ?upgraded=1 param so a reload doesn't re-trigger the toast
  params.delete("upgraded");
  const newUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "") + window.location.hash;
  window.history.replaceState({}, "", newUrl);
  return true;
}
