// bootstrap.js — orchestrates cloud features once the user is signed in.
//
// On auth state change:
//   signed-in  → show quota meter, show Save-to-cloud button (when a session is loaded),
//                populate My Sessions tab
//   signed-out → hide quota meter, hide Save button, clear sessions tab

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { auth } from "../auth/firebase-init.js";
import { getQuota, renderQuotaMeter, invalidateQuotaCache } from "./quota.js";
import { saveSessionToCloud } from "./upload.js";
import { renderSessions } from "./list.js";
import { getCurrentSession, onSessionChange } from "./session-state.js";
import { showProgress, hideProgress } from "../progress-bar.js";
import { renderTierBanner, maybeShowUpgradedToast } from "./tier-banner.js";
import {
  mountInlineRestore,
  unmountInlineRestore,
  invalidateInlineRestoreCache,
  refreshInlineRestore,
} from "./inline-restore.js";

const SAVE_BUTTON_ID = "saveToCloudBtn";
const SAVE_STATUS_ID = "saveToCloudStatus";
const QUOTA_METER_ID = "quotaMeter";
const TIER_BANNER_ID = "tierBanner";
const UPGRADE_TOAST_ID = "upgradeToast";
const SESSIONS_PANEL_SELECTOR = '[data-tab-panel="sessions"]';
const SAVE_CONTAINER_ID = "saveToCloudContainer";

// Polling state for post-checkout return — webhook may take a few seconds
let upgradePollingState = { active: false, timer: null, startTier: null };

let currentUser = null;
let sessionsRenderedFor = null; // uid we last rendered sessions for

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return node;
}

function ensureSaveButtonSlot() {
  if (document.getElementById(SAVE_CONTAINER_ID)) return;
  const uploadResults = document.getElementById("uploadResults");
  if (!uploadResults) return;
  const wrap = el("div", { id: SAVE_CONTAINER_ID, class: "save-to-cloud-wrap" });
  uploadResults.insertBefore(wrap, uploadResults.firstChild);
}

function ensureQuotaSlot() {
  if (document.getElementById(QUOTA_METER_ID)) return;
  const uploadResults = document.getElementById("uploadResults");
  if (!uploadResults) return;
  const wrap = el("div", { id: QUOTA_METER_ID, class: "quota-meter-wrap" });
  uploadResults.insertBefore(wrap, uploadResults.firstChild);
}

function ensureTierBannerSlot() {
  if (document.getElementById(TIER_BANNER_ID)) return;
  const uploadResults = document.getElementById("uploadResults");
  if (!uploadResults) return;
  ensureQuotaSlot();
  const meter = document.getElementById(QUOTA_METER_ID);
  const wrap = el("div", { id: TIER_BANNER_ID, class: "tier-banner-wrap" });
  // Insert right after the quota meter
  if (meter && meter.parentNode === uploadResults) {
    uploadResults.insertBefore(wrap, meter.nextSibling);
  } else {
    uploadResults.insertBefore(wrap, uploadResults.firstChild);
  }
}

function ensureUpgradeToastSlot() {
  if (document.getElementById(UPGRADE_TOAST_ID)) return;
  const uploadResults = document.getElementById("uploadResults");
  if (!uploadResults) return;
  const wrap = el("div", { id: UPGRADE_TOAST_ID, class: "upgrade-toast-wrap" });
  uploadResults.insertBefore(wrap, uploadResults.firstChild);
}

async function refreshQuotaMeter() {
  if (!currentUser) {
    const c = document.getElementById(QUOTA_METER_ID);
    if (c) c.replaceChildren();
    const tb = document.getElementById(TIER_BANNER_ID);
    if (tb) tb.replaceChildren();
    return;
  }
  ensureQuotaSlot();
  ensureTierBannerSlot();
  const q = await getQuota({ force: true });
  renderQuotaMeter(document.getElementById(QUOTA_METER_ID), q);
  renderTierBanner(document.getElementById(TIER_BANNER_ID), q);
  return q;
}

// Poll quota repeatedly after a Stripe checkout return until the webhook has
// upgraded the user's tier (or we time out). Webhook landing typically takes
// 1-5s but allow 60s of polling.
async function pollForTierUpgrade(startTier) {
  if (upgradePollingState.active) return;
  upgradePollingState = { active: true, timer: null, startTier };
  const startMs = Date.now();
  const POLL_MS = 2500;
  const TIMEOUT_MS = 60_000;

  const tick = async () => {
    if (!upgradePollingState.active) return;
    const q = await refreshQuotaMeter();
    const newTier = q?.tier || "free";
    if (newTier !== startTier && newTier !== "free") {
      // Tier changed → done
      console.log(`[poker upgrade] tier changed: ${startTier} → ${newTier}`);
      upgradePollingState.active = false;
      return;
    }
    if (Date.now() - startMs > TIMEOUT_MS) {
      console.warn("[poker upgrade] poll timed out; user may need to refresh");
      upgradePollingState.active = false;
      return;
    }
    upgradePollingState.timer = setTimeout(tick, POLL_MS);
  };
  tick();
}

function renderSaveButton() {
  ensureSaveButtonSlot();
  const slot = document.getElementById(SAVE_CONTAINER_ID);
  if (!slot) return;

  if (!currentUser) {
    slot.replaceChildren();
    return;
  }

  const session = getCurrentSession();
  if (!session || !session.hands || session.hands.length === 0) {
    slot.replaceChildren();
    return;
  }

  slot.replaceChildren();
  const btn = el("button", {
    id: SAVE_BUTTON_ID,
    type: "button",
    class: "save-to-cloud-btn",
    onclick: async () => {
      btn.disabled = true;
      setStatus("Preparing upload…", "info");
      const handCount = session.hands.length;
      const stageLabel = {
        reading: "Reading files",
        bundling: "Bundling hands",
        compressing: "Compressing",
        signing: "Requesting upload URL",
        "uploading-hands": "Uploading hands",
        "uploading-index": "Uploading index",
        "uploading-series": "Uploading series cache",
        committing: "Saving to cloud",
        done: "Done",
      };
      // Capture before save so a delete-after-save can target the right id
      // even if the user navigated away or session state updated mid-flight.
      const previousCloudSessionId = session.sourceSessionId || null;
      try {
        const r = await saveSessionToCloud({
          hands: session.hands,
          originalFiles: session.files,
          summary: session.summary,
          // Forward the pre-computed BigInt series so re-opens can render
          // instantly. session-state.js captured these from `lastCompute`.
          seriesBefore: session.seriesBefore || null,
          seriesAfter: session.seriesAfter || null,
          onProgress: ({ stage, progress }) => {
            const label = stageLabel[stage] || stage;
            showProgress({
              stage: `${label} — ${handCount.toLocaleString()} hands`,
              current: Math.round(progress * 1000),
              total: 1000,
            });
            setStatus(`${label} (${Math.round(progress * 100)}%)`, "info");
          },
        });
        hideProgress();

        // If this view came from a previous cloud session, delete it now that
        // the combined snapshot is committed — the new session is a strict
        // superset, so keeping the old one would just leave a duplicate.
        // Best-effort: the new save is already safe in S3 so a transient
        // delete failure isn't fatal; we surface it as a soft warning.
        let replacedPreviousNote = "";
        if (previousCloudSessionId && previousCloudSessionId !== r.sessionId) {
          try {
            const { deleteSession } = await import("./delete.js");
            await deleteSession(previousCloudSessionId);
            replacedPreviousNote = ` · replaced previous version (${escapeHtml(previousCloudSessionId.slice(-8))})`;
          } catch (delErr) {
            console.warn("[poker cloud] previous session delete failed:", delErr.message);
            replacedPreviousNote = ` · previous version (${escapeHtml(previousCloudSessionId.slice(-8))}) could not be deleted — remove it manually from My Sessions`;
          }
        }

        // Point the in-memory source at the just-saved session so a follow-up
        // save (without re-opening anything) also replaces rather than
        // accumulates. Mirrors what loadCachedSession would do.
        try {
          const { setSourceCloudSessionId } = await import("../upload.js");
          setSourceCloudSessionId(r.sessionId);
        } catch (_) {
          // upload.js may have been hot-reloaded / older — non-fatal.
        }

        setStatus(`<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="5 12 10 17 19 7"/></svg> Saved ${r.handCount.toLocaleString()} hands (session ${escapeHtml(r.sessionId.slice(-8))})${replacedPreviousNote}`, "ok");
        refreshQuotaMeter();
        // Refresh the inline restore dropdown so the newly-saved session is
        // immediately reachable without a page reload.
        invalidateInlineRestoreCache();
        refreshInlineRestore().catch(() => {});
        // If My Sessions tab is currently visible, refresh it
        if (isSessionsTabActive()) {
          maybeRenderSessions(true);
        }
      } catch (err) {
        hideProgress();
        console.error("[poker cloud] save failed:", err);
        setStatus(`<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg> ${escapeHtml(err.message)}`, "err");
      } finally {
        btn.disabled = false;
      }
    },
  }, [
    // Inline cloud SVG icon — built via createContextualFragment so the
    // existing `el()` helper (which appendChilds a textNode for strings)
    // doesn't render the markup as literal text.
    document.createRange().createContextualFragment(
      `<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 19H6a4 4 0 0 1 0-8 6 6 0 0 1 11.66-2A4 4 0 0 1 18 19z"/></svg>`
    ),
    `  Save ${session.hands.length.toLocaleString()} hands to cloud`,
  ]);
  const status = el("div", { id: SAVE_STATUS_ID, class: "save-status" });
  slot.appendChild(btn);
  slot.appendChild(status);
}

// `text` may contain pre-built trusted HTML (inline SVG icons). Callers must
// HTML-escape any user-supplied substrings (e.g. err.message) before passing.
function setStatus(text, kind = "info") {
  const s = document.getElementById(SAVE_STATUS_ID);
  if (!s) return;
  s.className = "save-status " + kind;
  s.innerHTML = String(text);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSessionsTabActive() {
  const panel = document.querySelector(SESSIONS_PANEL_SELECTOR);
  return panel && !panel.hidden;
}

async function maybeRenderSessions(force = false) {
  if (!currentUser) return;
  if (sessionsRenderedFor === currentUser.uid && !force) return;
  const panel = document.querySelector(SESSIONS_PANEL_SELECTOR);
  if (!panel) return;
  await renderSessions(panel);
  sessionsRenderedFor = currentUser.uid;
}

function watchTabActivation() {
  // The tab buttons toggle hidden on panels. When the sessions panel becomes visible, render it.
  const observer = new MutationObserver(() => {
    if (isSessionsTabActive()) maybeRenderSessions();
  });
  const panel = document.querySelector(SESSIONS_PANEL_SELECTOR);
  if (panel) observer.observe(panel, { attributes: true, attributeFilter: ["hidden"] });
}

function init() {
  watchTabActivation();
  onSessionChange(() => renderSaveButton());

  // The sessions panel now lives inside the Settings drawer. When the user
  // opens the drawer, refresh + render their session list.
  window.addEventListener("settings:open", () => {
    if (currentUser) maybeRenderSessions(true);
  });

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    sessionsRenderedFor = null;
    invalidateQuotaCache();
    if (user) {
      // Reveal the upload-results panel so the quota/tier slots can render
      // even before the user uploads any files. (Otherwise quota/banner hide
      // behind the still-hidden uploadResults element.)
      const uploadResults = document.getElementById("uploadResults");
      if (uploadResults) uploadResults.hidden = false;

      ensureUpgradeToastSlot();
      const toastSlot = document.getElementById(UPGRADE_TOAST_ID);
      const cameFromCheckout = maybeShowUpgradedToast(toastSlot);

      const q = await refreshQuotaMeter();
      renderSaveButton();
      // Mount the inline cloud-restore panel inside the Upload tab so the
      // user can re-open a saved session in one click without navigating to
      // Settings → My Sessions. Failure is non-fatal — the Settings panel
      // remains the canonical session manager.
      mountInlineRestore().catch((err) => {
        console.warn("[poker cloud] inline restore mount failed:", err.message);
      });
      if (isSessionsTabActive()) maybeRenderSessions();

      // If user just returned from Stripe Checkout, poll until the webhook
      // upgrades their tier in Firestore (1-5s typical, 60s timeout).
      if (cameFromCheckout && q) {
        pollForTierUpgrade(q.tier || "free");
      }
    } else {
      // Clean up
      const meter = document.getElementById(QUOTA_METER_ID);
      if (meter) meter.replaceChildren();
      const tb = document.getElementById(TIER_BANNER_ID);
      if (tb) tb.replaceChildren();
      const toast = document.getElementById(UPGRADE_TOAST_ID);
      if (toast) toast.replaceChildren();
      const slot = document.getElementById(SAVE_CONTAINER_ID);
      if (slot) slot.replaceChildren();
      unmountInlineRestore();
      const panel = document.querySelector(SESSIONS_PANEL_SELECTOR);
      if (panel) {
        panel.replaceChildren();
        const ph = document.createElement("div");
        ph.className = "sessions-placeholder";
        ph.innerHTML = `
          <p>Sign in to save your uploaded hand histories.</p>
        `;
        panel.appendChild(ph);
      }
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
