// live-share-ui.js — Settings drawer "Live share" card.
//
// Renders one of four states based on the user's tier + the live-share status
// returned by `get-my-live-share`:
//
//   A. tier === "free"           → upsell card
//   B. paid, no live share yet   → "Enable live share" CTA
//   C. paid, enabled, NOT frozen → URL + last-updated + password + disable
//   D. paid, enabled, FROZEN     → frozen banner + URL (most controls disabled)
//
// The viewer URL is whatever the Lambda returns (`live.url`). For UI fallback
// only, we rebuild from shareId using the canonical casino-game origin.
//
// Mounted from cloud/bootstrap.js when the user signs in and we have their
// quota (which carries `tier`). Unmounted on sign-out. The card refreshes
// itself when:
//   - the Settings drawer opens (`settings:open` event)
//   - the user just saved a session (bootstrap calls `refreshLiveShareCard`)
//   - the user just toggled enable / disable / password (internal)
//
// All user-supplied strings hit the DOM via `textContent` or `value`; only the
// inline SVG icons are inserted as HTML via `createContextualFragment`.

import {
  getMyLiveShare,
  enableLiveShare,
  updateLiveSharePassword,
  disableLiveShare,
} from "./live-share.js";
import { startCheckout } from "./checkout.js";

const CARD_ID = "liveShareCard";
const FALLBACK_VIEWER_ORIGIN = "https://casino-game.hillmanchan.com";
const PAID_TIERS = new Set(["standard", "pro", "ultra", "superadmin"]);

// Mount-side state. Only one card lives at a time (the drawer is a singleton),
// so module-level state is fine.
let mountedRoot = null;          // the outer container we render into
let mountedCtx = null;            // { tier, getCurrentSession }
let lastStatus = null;            // last `get-my-live-share` payload
let inFlight = false;             // toggling state for buttons
let pendingPwUiOpen = false;      // toggles the inline password input

// ── DOM helpers ──────────────────────────────────────────────────────────────

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k.startsWith("on") && typeof v === "function") {
        node.addEventListener(k.slice(2), v);
      } else if (k === "value") {
        node.value = v;
      } else if (k === "disabled") {
        if (v) node.setAttribute("disabled", "");
      } else {
        node.setAttribute(k, v);
      }
    }
  }
  if (children) {
    for (const c of children) {
      if (c == null || c === false) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
  }
  return node;
}

function svgFrag(markup) {
  return document.createRange().createContextualFragment(markup);
}

// Format an ISO timestamp into a relative string like "5m ago", "2h ago",
// "3d ago", or an absolute YYYY-MM-DD for anything older than a week.
function fmtRelative(iso) {
  if (!iso) return "—";
  const t = typeof iso === "number" ? iso : Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 0) return "just now";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return sec < 5 ? "just now" : `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day <= 7) return `${day}d ago`;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

function buildViewerUrl(status) {
  if (status?.url) return status.url;
  if (!status?.shareId) return null;
  return `${FALLBACK_VIEWER_ORIGIN}/p/${status.shareId}`;
}

function setStatusLine(kind, text) {
  if (!mountedRoot) return;
  const slot = mountedRoot.querySelector("[data-role=\"status-line\"]");
  if (!slot) return;
  slot.className = "live-share-card__status live-share-card__" + (kind === "err" ? "error" : "success");
  slot.textContent = text || "";
  slot.hidden = !text;
}

function clearStatusLine() {
  setStatusLine("ok", "");
}

async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    // Fallback: hidden textarea + execCommand. Safe because `text` is the
    // viewer URL we built locally — never user-supplied DOM.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (_) { /* noop */ }
    ta.remove();
  }
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = "Copied!";
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = orig;
      btn.disabled = false;
    }, 1200);
  }
}

// ── Action handlers ──────────────────────────────────────────────────────────

async function handleEnable() {
  if (inFlight) return;
  const session = mountedCtx?.getCurrentSession?.();
  if (!session || !session.summary || (!session.seriesBefore && !session.seriesAfter)) {
    setStatusLine("err", "Upload + save a session first to enable live share.");
    return;
  }
  inFlight = true;
  setStatusLine("ok", "Enabling live share…");
  try {
    const meta = {
      stakes: session.summary?.stakesBucket ?? null,
      firstHandAt: session.summary?.firstHandAt ?? null,
      lastHandAt: session.summary?.lastHandAt ?? null,
    };
    await enableLiveShare({
      summary: session.summary,
      seriesBefore: session.seriesBefore,
      seriesAfter: session.seriesAfter,
      meta,
    });
    await refreshLiveShareCard();
    setStatusLine("ok", "Live share enabled. Share the link with anyone.");
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg.includes("live_share_requires_paid")) {
      setStatusLine("err", "Live share is a paid feature. Upgrade to enable.");
    } else {
      console.warn("[poker live-share-ui] enable failed:", msg);
      setStatusLine("err", "Could not enable live share. Please try again.");
    }
  } finally {
    inFlight = false;
  }
}

async function handleDisable() {
  if (inFlight) return;
  const confirmed = window.confirm(
    "Disable live share? Your URL will return HTTP 410 to viewers until you re-enable. Your shareId is preserved so re-enabling restores the same URL.",
  );
  if (!confirmed) return;
  inFlight = true;
  setStatusLine("ok", "Disabling live share…");
  try {
    await disableLiveShare();
    await refreshLiveShareCard();
    setStatusLine("ok", "Live share disabled.");
  } catch (err) {
    console.warn("[poker live-share-ui] disable failed:", err.message);
    setStatusLine("err", "Could not disable live share. Please try again.");
  } finally {
    inFlight = false;
  }
}

async function handleSetPassword(rawPw) {
  if (inFlight) return;
  const pw = typeof rawPw === "string" ? rawPw.trim() : "";
  if (!pw) {
    setStatusLine("err", "Password cannot be empty.");
    return;
  }
  inFlight = true;
  setStatusLine("ok", "Updating password…");
  try {
    await updateLiveSharePassword(pw);
    pendingPwUiOpen = false;
    await refreshLiveShareCard();
    setStatusLine("ok", "Password updated. Viewers will be prompted.");
  } catch (err) {
    console.warn("[poker live-share-ui] set-password failed:", err.message);
    setStatusLine("err", "Could not update password. Please try again.");
  } finally {
    inFlight = false;
  }
}

async function handleRemovePassword() {
  if (inFlight) return;
  const confirmed = window.confirm(
    "Remove the password? Anyone with the link will be able to view your live share.",
  );
  if (!confirmed) return;
  inFlight = true;
  setStatusLine("ok", "Removing password…");
  try {
    await updateLiveSharePassword(null);
    pendingPwUiOpen = false;
    await refreshLiveShareCard();
    setStatusLine("ok", "Password removed.");
  } catch (err) {
    console.warn("[poker live-share-ui] remove-password failed:", err.message);
    setStatusLine("err", "Could not remove password. Please try again.");
  } finally {
    inFlight = false;
  }
}

async function handleUpgrade(btn) {
  if (inFlight) return;
  inFlight = true;
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Opening Stripe…";
  try {
    await startCheckout("poker_standard_month");
    // Browser navigates away on success.
  } catch (err) {
    console.error("[poker live-share-ui] startCheckout failed:", err);
    btn.disabled = false;
    btn.textContent = orig;
    setStatusLine("err", "Could not start checkout: " + (err?.message || "unknown"));
    inFlight = false;
  }
}

// ── State-specific renderers ─────────────────────────────────────────────────

function renderFree() {
  const card = el("div", { class: "live-share-card live-share-card--free" }, [
    el("div", { class: "live-share-card__title" }, ["Live share"]),
    el("div", { class: "live-share-card__subtitle" }, [
      "Share a live, always-up-to-date view of your stats. Available on Standard, Pro, and Ultra plans.",
    ]),
    el("div", { class: "live-share-card__upgrade-cta" }, [
      el("button", {
        type: "button",
        class: "live-share-card__btn live-share-card__btn--primary",
        onclick: (e) => handleUpgrade(e.currentTarget),
      }, ["Upgrade"]),
    ]),
    el("div", { "data-role": "status-line", class: "live-share-card__status", hidden: true }, []),
  ]);
  return card;
}

function renderDisabled() {
  const session = mountedCtx?.getCurrentSession?.();
  const hasSession = !!(session && session.summary && (session.seriesBefore || session.seriesAfter));

  const card = el("div", { class: "live-share-card" }, [
    el("div", { class: "live-share-card__title" }, ["Live share"]),
    el("div", { class: "live-share-card__subtitle" }, [
      "One URL that auto-updates whenever you save new hands. Viewers always see your latest.",
    ]),
    el("div", { class: "live-share-card__row" }, [
      el("button", {
        type: "button",
        class: "live-share-card__btn live-share-card__btn--primary",
        disabled: !hasSession || inFlight,
        title: hasSession ? null : "Upload + save a session first to enable live share.",
        onclick: handleEnable,
      }, ["Enable live share"]),
    ]),
    !hasSession
      ? el("div", { class: "live-share-card__meta" }, [
        "Upload + save a session first to enable live share.",
      ])
      : null,
    el("div", { "data-role": "status-line", class: "live-share-card__status", hidden: true }, []),
  ]);
  return card;
}

function renderEnabled(status) {
  const frozen = !!status.frozenAt;
  const url = buildViewerUrl(status);
  const card = el("div", {
    class: "live-share-card" + (frozen ? " live-share-card--frozen" : ""),
  });

  // Title
  card.appendChild(el("div", { class: "live-share-card__title" }, [
    frozen ? "Live share — Frozen" : "Live share — Active",
  ]));

  // Frozen banner
  if (frozen) {
    const banner = el("div", { class: "live-share-card__frozen-banner" }, [
      el("strong", {}, ["Your live share is frozen — "]),
      "viewers see your last snapshot. ",
      el("button", {
        type: "button",
        class: "live-share-card__link",
        onclick: (e) => handleUpgrade(e.currentTarget),
      }, ["Upgrade to resume updates"]),
      ".",
    ]);
    card.appendChild(banner);
  }

  // URL row
  if (url) {
    const urlInput = el("input", {
      type: "text",
      readonly: "",
      class: "live-share-card__url-input",
      value: url,
      "aria-label": "Live share URL",
    });
    const copyBtn = el("button", {
      type: "button",
      class: "live-share-card__btn live-share-card__btn--secondary",
      onclick: (e) => {
        try { urlInput.select(); } catch (_) { /* noop */ }
        copyToClipboard(url, e.currentTarget);
      },
    }, ["Copy"]);
    const openBtn = el("a", {
      href: url,
      target: "_blank",
      rel: "noopener noreferrer",
      class: "live-share-card__btn live-share-card__btn--secondary",
    }, ["Open"]);
    card.appendChild(el("div", { class: "live-share-card__url-row" }, [urlInput, copyBtn, openBtn]));
  }

  // Meta line — only when NOT frozen (frozen "last updated" would mislead).
  if (!frozen) {
    const views = Number.isFinite(status.views) ? status.views : 0;
    const updated = fmtRelative(status.lastUpdatedAt);
    card.appendChild(el("div", { class: "live-share-card__meta" }, [
      "Last updated: " + updated + " · " + views.toLocaleString() + " " + (views === 1 ? "view" : "views"),
    ]));
  }

  // Password row
  card.appendChild(renderPasswordRow(status, frozen));

  // Destructive action — disable.
  const disableBtn = el("button", {
    type: "button",
    class: "live-share-card__btn live-share-card__btn--danger",
    disabled: inFlight,
    onclick: handleDisable,
  }, ["Disable live share"]);
  card.appendChild(el("div", { class: "live-share-card__row live-share-card__row--end" }, [disableBtn]));

  card.appendChild(el("div", {
    "data-role": "status-line",
    class: "live-share-card__status",
    hidden: true,
  }, []));

  return card;
}

function renderPasswordRow(status, frozen) {
  const row = el("div", { class: "live-share-card__password-row" });
  // When frozen, the share is still readable so the password gate still makes
  // sense. Keep controls available unless server says otherwise.
  if (status.passwordProtected) {
    row.appendChild(el("span", { class: "live-share-card__password-label" }, [
      el("span", { class: "live-share-card__badge" }, ["Password set"]),
    ]));
    row.appendChild(el("button", {
      type: "button",
      class: "live-share-card__link",
      disabled: inFlight || frozen,
      onclick: () => {
        pendingPwUiOpen = true;
        renderCurrentState();
      },
    }, ["Change"]));
    row.appendChild(el("button", {
      type: "button",
      class: "live-share-card__link live-share-card__link--danger",
      disabled: inFlight || frozen,
      onclick: handleRemovePassword,
    }, ["Remove"]));
  } else if (!pendingPwUiOpen) {
    row.appendChild(el("button", {
      type: "button",
      class: "live-share-card__link",
      disabled: inFlight || frozen,
      onclick: () => {
        pendingPwUiOpen = true;
        renderCurrentState();
      },
    }, ["Add password"]));
  }

  if (pendingPwUiOpen) {
    const input = el("input", {
      type: "password",
      class: "live-share-card__password-input",
      placeholder: "New password",
      autocomplete: "new-password",
    });
    const saveBtn = el("button", {
      type: "button",
      class: "live-share-card__btn live-share-card__btn--primary live-share-card__btn--small",
      disabled: inFlight,
      onclick: () => handleSetPassword(input.value),
    }, ["Save"]);
    const cancelBtn = el("button", {
      type: "button",
      class: "live-share-card__link",
      onclick: () => {
        pendingPwUiOpen = false;
        renderCurrentState();
      },
    }, ["Cancel"]);
    // Submit on Enter for keyboard users.
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSetPassword(input.value);
      } else if (e.key === "Escape") {
        e.preventDefault();
        pendingPwUiOpen = false;
        renderCurrentState();
      }
    });
    row.appendChild(el("div", { class: "live-share-card__password-inline" }, [
      input,
      saveBtn,
      cancelBtn,
    ]));
  }
  return row;
}

// ── Render orchestrator ──────────────────────────────────────────────────────

function isPaid(tier) {
  return PAID_TIERS.has(tier);
}

function renderCurrentState() {
  if (!mountedRoot) return;
  mountedRoot.replaceChildren();

  const tier = mountedCtx?.tier || "free";
  if (!isPaid(tier)) {
    mountedRoot.appendChild(renderFree());
    return;
  }
  const status = lastStatus;
  if (!status || !status.enabled) {
    mountedRoot.appendChild(renderDisabled());
    return;
  }
  mountedRoot.appendChild(renderEnabled(status));
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Mount the Live share card into the given container element.
 *
 * @param {HTMLElement} container          The DOM node we own and render into.
 * @param {object}      ctx
 * @param {string}      ctx.tier           "free" | "standard" | "pro" | "ultra" | "superadmin"
 * @param {Function}    ctx.getCurrentSession  Returns the in-memory session (or null).
 *                                         Used for the "Enable" payload.
 */
export function mountLiveShareCard(container, ctx) {
  if (!container) return;
  unmountLiveShareCard();
  mountedRoot = container;
  mountedRoot.id = mountedRoot.id || CARD_ID;
  mountedRoot.classList.add("live-share-card-mount");
  mountedCtx = {
    tier: ctx?.tier || "free",
    getCurrentSession: ctx?.getCurrentSession || (() => null),
  };
  lastStatus = null;
  pendingPwUiOpen = false;
  inFlight = false;
  // Initial render with whatever we know synchronously. Free users get the
  // upsell immediately; paid users see a brief loading state until the
  // async refresh below lands.
  renderCurrentState();
  // Don't block the mount on the network — refresh in the background.
  if (isPaid(mountedCtx.tier)) {
    refreshLiveShareCard().catch((err) => {
      console.warn("[poker live-share-ui] initial refresh failed:", err.message);
    });
  }
}

export function unmountLiveShareCard() {
  if (mountedRoot) {
    mountedRoot.replaceChildren();
    mountedRoot.classList.remove("live-share-card-mount");
  }
  mountedRoot = null;
  mountedCtx = null;
  lastStatus = null;
  pendingPwUiOpen = false;
  inFlight = false;
}

/**
 * Fetch the current `get-my-live-share` payload and re-render.
 * Safe to call repeatedly; no-ops when the card isn't mounted.
 */
export async function refreshLiveShareCard() {
  if (!mountedRoot || !mountedCtx) return;
  if (!isPaid(mountedCtx.tier)) {
    // Free users don't have a live share doc; nothing to fetch.
    renderCurrentState();
    return;
  }
  try {
    const status = await getMyLiveShare();
    // The Lambda returns `{ enabled, exists, ... }` — accept the payload as-is.
    lastStatus = status && typeof status === "object" ? status : null;
  } catch (err) {
    const msg = String(err?.message || "");
    // Don't blow up the UI on a transient network failure; just keep the
    // last-known state and log.
    console.warn("[poker live-share-ui] refresh failed:", msg);
  }
  renderCurrentState();
}
