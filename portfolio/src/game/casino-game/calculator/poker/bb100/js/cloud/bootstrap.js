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

const SAVE_BUTTON_ID = "saveToCloudBtn";
const SAVE_STATUS_ID = "saveToCloudStatus";
const QUOTA_METER_ID = "quotaMeter";
const SESSIONS_PANEL_SELECTOR = '[data-tab-panel="sessions"]';
const SAVE_CONTAINER_ID = "saveToCloudContainer";

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

async function refreshQuotaMeter() {
  if (!currentUser) {
    const c = document.getElementById(QUOTA_METER_ID);
    if (c) c.replaceChildren();
    return;
  }
  ensureQuotaSlot();
  const q = await getQuota();
  renderQuotaMeter(document.getElementById(QUOTA_METER_ID), q);
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
      try {
        const r = await saveSessionToCloud({
          hands: session.hands,
          originalFiles: session.files,
          summary: session.summary,
          onProgress: ({ stage, progress }) => {
            setStatus(`${stage} (${Math.round(progress * 100)}%)`, "info");
          },
        });
        setStatus(`✓ Saved ${r.handCount.toLocaleString()} hands (session ${r.sessionId.slice(-8)})`, "ok");
        refreshQuotaMeter();
        // If My Sessions tab is currently visible, refresh it
        if (isSessionsTabActive()) {
          maybeRenderSessions(true);
        }
      } catch (err) {
        console.error("[poker cloud] save failed:", err);
        setStatus(`✗ ${err.message}`, "err");
      } finally {
        btn.disabled = false;
      }
    },
  }, [`☁️  Save ${session.hands.length.toLocaleString()} hands to cloud`]);
  const status = el("div", { id: SAVE_STATUS_ID, class: "save-status" });
  slot.appendChild(btn);
  slot.appendChild(status);
}

function setStatus(text, kind = "info") {
  const s = document.getElementById(SAVE_STATUS_ID);
  if (!s) return;
  s.className = "save-status " + kind;
  s.textContent = text;
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

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    sessionsRenderedFor = null;
    invalidateQuotaCache();
    if (user) {
      refreshQuotaMeter();
      renderSaveButton();
      if (isSessionsTabActive()) maybeRenderSessions();
    } else {
      // Clean up
      const meter = document.getElementById(QUOTA_METER_ID);
      if (meter) meter.replaceChildren();
      const slot = document.getElementById(SAVE_CONTAINER_ID);
      if (slot) slot.replaceChildren();
      const panel = document.querySelector(SESSIONS_PANEL_SELECTOR);
      if (panel) {
        panel.replaceChildren();
        const ph = document.createElement("div");
        ph.className = "sessions-placeholder";
        ph.innerHTML = `
          <p>Sign in to save and view your uploaded hand histories.</p>
          <p class="placeholder-hint">Cloud storage launches with Phase 2 — Firebase Auth.</p>
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
