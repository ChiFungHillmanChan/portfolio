// inline-restore.js — renders a "Restore from cloud" panel inside the Upload
// tab so signed-in users can re-open a saved session without leaving the tab.
//
// Mounted/unmounted by cloud/bootstrap.js on auth state change. The full
// session manager (delete / archival restore / bulk migrate) still lives in
// the Settings drawer; this panel is the one-click shortcut.
//
// Cost model: opening a session pays a Lambda + R2 GET for the small
// series.json.gz (chart cache). The big hands.txt.gz download — multi-MB on
// 20K+ hand sessions — is gated behind an opt-in "Load replay data" button
// rendered after the chart appears. All in-flight fetches are tied to per-
// panel AbortControllers and cancelled when the user navigates away
// (pagehide/visibilitychange) or starts a new open before the previous one
// finishes.

import { apiCall } from "../auth/api-client.js";
import { CLOUD_SESSION_OPENED_EVENT } from "./load-session.js";

const PANEL_ID = "uploadCloudRestore";

let panelEl = null;
let cachedSessions = null;
let cacheLoadedAt = 0;
let listExpanded = false;
let inFlight = null;

// In-flight controllers — exactly one of each at a time, owned by this panel.
// `openController` covers chart load (series.json.gz). `replayController`
// covers the opt-in hands.txt.gz download triggered by the user.
let openController = null;
let replayController = null;
let currentOpenedMeta = null;     // { sessionMeta, handCount, bytesCompressed } of last successful open
let openedEventBound = false;     // window-level listeners are mounted once

function fmtDate(ms) {
  if (!ms) return "—";
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function fmtBytes(n) {
  if (!n || n <= 0) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function abortIfActive(controller) {
  if (controller && !controller.signal.aborted) {
    try { controller.abort(); } catch (_) { /* noop */ }
  }
}

function isAbortError(err) {
  return err?.name === "AbortError";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setStatus(text, kind = "info") {
  const s = panelEl?.querySelector(".cloud-restore-status");
  if (!s) return;
  s.dataset.kind = kind;
  s.innerHTML = String(text);
}

function renderShell() {
  if (!panelEl) return;
  panelEl.replaceChildren();
  panelEl.hidden = false;
  panelEl.innerHTML = `
    <div class="cloud-restore-header">
      <span class="cloud-restore-title">
        <svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 19H6a4 4 0 0 1 0-8 6 6 0 0 1 11.66-2A4 4 0 0 1 18 19z"/></svg>
        Restore from cloud
      </span>
      <span class="cloud-restore-spacer"></span>
      <button type="button" class="cloud-restore-btn" data-action="open-latest" disabled>
        <svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polygon points="6 4 20 12 6 20 6 4"/></svg>
        Open last saved
      </button>
      <button type="button" class="cloud-restore-btn cloud-restore-btn--ghost" data-action="toggle-list" disabled>
        Choose from list <span data-role="chevron">▾</span>
      </button>
    </div>
    <div class="cloud-restore-status" data-kind="info">Loading saved sessions…</div>
    <div class="cloud-restore-replay" data-role="replay-row" hidden></div>
    <ul class="cloud-restore-list" hidden></ul>
  `;

  panelEl.querySelector('[data-action="open-latest"]').addEventListener("click", onOpenLatest);
  panelEl.querySelector('[data-action="toggle-list"]').addEventListener("click", onToggleList);
}

// Bind once per page lifetime. Aborting in-flight fetches when the tab is
// hidden saves bandwidth + R2 egress when users open then immediately switch
// tabs. The listeners stay bound across mount/unmount cycles — they only act
// when a controller is live, so binding more than once is a leak risk.
function ensureLifecycleListenersBound() {
  if (openedEventBound) return;
  openedEventBound = true;
  window.addEventListener(CLOUD_SESSION_OPENED_EVENT, onSessionOpenedEvent);
  window.addEventListener("pagehide", abortAllInFlight);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") abortAllInFlight();
  });
}

function abortAllInFlight() {
  abortIfActive(openController);
  abortIfActive(replayController);
}

async function loadSessions(force = false) {
  if (inFlight) return inFlight;
  const fresh = Date.now() - cacheLoadedAt < 30_000;
  if (!force && cachedSessions && fresh) return cachedSessions;

  inFlight = (async () => {
    try {
      const resp = await apiCall("list-sessions", {});
      if (!resp.ok) throw new Error(resp.error || "list-sessions failed");
      const sessions = (resp.sessions || []).slice().sort((a, b) => {
        // Newest first (createdAt is epoch ms).
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      cachedSessions = sessions;
      cacheLoadedAt = Date.now();
      return sessions;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function renderList(sessions) {
  const list = panelEl?.querySelector(".cloud-restore-list");
  if (!list) return;
  list.replaceChildren();
  if (sessions.length === 0) {
    const empty = document.createElement("li");
    empty.className = "cloud-restore-empty";
    empty.textContent = "No saved sessions yet. Upload hands → click \"Save to cloud\" to back them up.";
    list.appendChild(empty);
    return;
  }
  for (const s of sessions) {
    const li = document.createElement("li");
    li.className = "cloud-restore-item";
    li.innerHTML = `
      <div class="cloud-restore-item-meta">
        <span class="cloud-restore-item-date">${escapeHtml(fmtDate(s.createdAt))}</span>
        <span class="cloud-restore-item-sub">${(s.handCount || 0).toLocaleString()} hands · ${(s.fileNames || []).length} file${(s.fileNames || []).length === 1 ? "" : "s"}</span>
      </div>
      <button type="button" class="cloud-restore-btn" data-action="open-one">
        Open
      </button>
    `;
    li.querySelector('[data-action="open-one"]').addEventListener("click", () => onOpenSession(s, li));
    list.appendChild(li);
  }
}

async function refresh(force = false) {
  if (!panelEl) return;
  setStatus("Loading saved sessions…", "info");
  const latestBtn = panelEl.querySelector('[data-action="open-latest"]');
  const toggleBtn = panelEl.querySelector('[data-action="toggle-list"]');
  if (latestBtn) latestBtn.disabled = true;
  if (toggleBtn) toggleBtn.disabled = true;

  let sessions;
  try {
    sessions = await loadSessions(force);
  } catch (err) {
    setStatus(`Could not load sessions: ${escapeHtml(err.message)}`, "err");
    return;
  }

  renderList(sessions);

  if (sessions.length === 0) {
    setStatus("No saved sessions yet — click \"Save to cloud\" after an upload to back them up.", "info");
    return;
  }

  if (latestBtn) latestBtn.disabled = false;
  if (toggleBtn) toggleBtn.disabled = false;
  setStatus(
    `${sessions.length.toLocaleString()} saved session${sessions.length === 1 ? "" : "s"} available · latest ${escapeHtml(fmtDate(sessions[0].createdAt))}`,
    "info",
  );
}

function onToggleList() {
  if (!panelEl) return;
  const list = panelEl.querySelector(".cloud-restore-list");
  const chev = panelEl.querySelector('[data-action="toggle-list"] [data-role="chevron"]');
  if (!list) return;
  listExpanded = !listExpanded;
  list.hidden = !listExpanded;
  if (chev) chev.textContent = listExpanded ? "▴" : "▾";
}

async function onOpenLatest() {
  const sessions = cachedSessions;
  if (!sessions || sessions.length === 0) {
    setStatus("Nothing to restore yet.", "info");
    return;
  }
  return openSessionRow(sessions[0]);
}

async function onOpenSession(session) {
  return openSessionRow(session);
}

async function openSessionRow(session) {
  if (!session?.sessionId) return;
  // Cancel any open / replay still in flight from a previous click before
  // starting fresh — saves bandwidth and prevents the previous session's
  // late-arriving data from clobbering the new view.
  abortAllInFlight();
  const controller = new AbortController();
  openController = controller;

  // Clear the replay slot — even if the previous session had its replay
  // loaded, this new open invalidates that state.
  renderReplayRow(null);
  currentOpenedMeta = null;

  const buttons = panelEl?.querySelectorAll("button");
  buttons?.forEach((b) => (b.disabled = true));
  setStatus(`Opening session ${escapeHtml(session.sessionId.slice(-8))}…`, "info");
  try {
    const { openCloudSession } = await import("./load-session.js");
    await openCloudSession(session, {
      signal: controller.signal,
      onStatus: (msg) => console.log("[poker inline restore]", msg),
    });
    // Success status is rendered by `onSessionOpenedEvent` — fired from
    // load-session.js once the chart is up. That keeps a single code path
    // regardless of who triggered the open (this panel, the Settings drawer
    // list, or any future caller).
  } catch (err) {
    if (isAbortError(err)) {
      setStatus("Open cancelled.", "info");
    } else {
      console.error("[poker inline restore] open failed:", err);
      setStatus(`Open failed: ${escapeHtml(err.message)}`, "err");
    }
  } finally {
    if (openController === controller) openController = null;
    buttons?.forEach((b) => (b.disabled = false));
  }
}

// Listener for the `poker:cloud-session-opened` window event. Fires whenever a
// session opens successfully — from this panel OR from the Settings drawer
// list. Updates the status banner and renders the opt-in "Load replay data"
// button when replay data hasn't been pulled yet.
function onSessionOpenedEvent(evt) {
  if (!panelEl) return;
  const { sessionMeta, handCount = 0, bytesCompressed = 0, replayPending } = evt.detail || {};
  if (!sessionMeta?.sessionId) return;

  currentOpenedMeta = { sessionMeta, handCount, bytesCompressed };

  if (replayPending) {
    setStatus(
      `<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="5 12 10 17 19 7"/></svg> Chart ready · ${handCount.toLocaleString()} hands · scroll down to view it.`,
      "ok",
    );
    renderReplayRow(currentOpenedMeta);
  } else {
    // Slow-path opens already include replay data — nothing extra to offer.
    setStatus(
      `<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="5 12 10 17 19 7"/></svg> Opened ${handCount.toLocaleString()} hands · chart and replay browser ready below.`,
      "ok",
    );
    renderReplayRow(null);
  }
}

function renderReplayRow(meta) {
  const row = panelEl?.querySelector('[data-role="replay-row"]');
  if (!row) return;
  row.replaceChildren();
  if (!meta) {
    row.hidden = true;
    return;
  }
  row.hidden = false;
  const sizeLabel = fmtBytes(meta.bytesCompressed);
  const sizeHint = sizeLabel ? ` · ~${escapeHtml(sizeLabel)} download` : "";
  row.innerHTML = `
    <span class="cloud-restore-replay-hint">
      Per-hand replays are not loaded yet${sizeHint}.
    </span>
    <button type="button" class="cloud-restore-btn" data-action="load-replays">
      <svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      Load replay data
    </button>
  `;
  row.querySelector('[data-action="load-replays"]').addEventListener("click", onLoadReplays);
}

function renderReplayRowLoading() {
  const row = panelEl?.querySelector('[data-role="replay-row"]');
  if (!row) return;
  row.hidden = false;
  row.replaceChildren();
  row.innerHTML = `
    <span class="cloud-restore-replay-hint">Loading replay data…</span>
    <button type="button" class="cloud-restore-btn cloud-restore-btn--ghost" data-action="cancel-replays">
      Cancel
    </button>
  `;
  row.querySelector('[data-action="cancel-replays"]').addEventListener("click", () => abortIfActive(replayController));
}

async function onLoadReplays() {
  if (!currentOpenedMeta?.sessionMeta) return;
  abortIfActive(replayController);
  const controller = new AbortController();
  replayController = controller;
  renderReplayRowLoading();
  setStatus("Downloading replay data…", "info");
  try {
    const { hydrateReplayForSession } = await import("./load-session.js");
    const result = await hydrateReplayForSession(currentOpenedMeta.sessionMeta, {
      signal: controller.signal,
    });
    // Replay browser is now live; clear the row + reflect in status banner.
    renderReplayRow(null);
    setStatus(
      `<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="5 12 10 17 19 7"/></svg> Replay ready · ${(result?.handCount || currentOpenedMeta.handCount || 0).toLocaleString()} hands available below.`,
      "ok",
    );
  } catch (err) {
    if (isAbortError(err)) {
      setStatus("Replay download cancelled.", "info");
    } else {
      console.error("[poker inline restore] replay load failed:", err);
      setStatus(`Replay load failed: ${escapeHtml(err.message)}`, "err");
    }
    // Keep the button available so the user can retry.
    renderReplayRow(currentOpenedMeta);
  } finally {
    if (replayController === controller) replayController = null;
  }
}

/**
 * Show the inline restore panel and (re-)fetch the user's sessions.
 * Idempotent — safe to call repeatedly on auth state changes.
 */
export async function mountInlineRestore() {
  panelEl = document.getElementById(PANEL_ID);
  if (!panelEl) return;
  ensureLifecycleListenersBound();
  renderShell();
  await refresh(true);
}

/**
 * Hide the panel and clear cached sessions (called on sign-out).
 * Any in-flight chart or replay fetch is aborted so the user doesn't pay
 * for downloads that have no UI to land in.
 */
export function unmountInlineRestore() {
  abortAllInFlight();
  panelEl = document.getElementById(PANEL_ID);
  if (!panelEl) return;
  panelEl.hidden = true;
  panelEl.replaceChildren();
  cachedSessions = null;
  cacheLoadedAt = 0;
  listExpanded = false;
  currentOpenedMeta = null;
}

/**
 * Invalidate the local list cache so the next mount/refresh fetches fresh
 * data. Called by bootstrap.js after a successful "Save to cloud" so the
 * newly-saved session appears in the dropdown without reloading the page.
 */
export function invalidateInlineRestoreCache() {
  cachedSessions = null;
  cacheLoadedAt = 0;
}

/**
 * Re-fetch the saved-sessions list and re-render the inline panel. Safe to
 * call when the panel is unmounted — it just does nothing.
 */
export async function refreshInlineRestore() {
  if (!panelEl || panelEl.hidden) return;
  await refresh(true);
}
