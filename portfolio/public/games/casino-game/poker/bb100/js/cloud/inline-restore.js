// inline-restore.js — renders a "Restore from cloud" panel inside the Upload
// tab so signed-in users can re-open a saved session without leaving the tab.
//
// Mounted/unmounted by cloud/bootstrap.js on auth state change. The full
// session manager (delete / archival restore / bulk migrate) still lives in
// the Settings drawer; this panel is the one-click shortcut.

import { apiCall } from "../auth/api-client.js";

const PANEL_ID = "uploadCloudRestore";

let panelEl = null;
let cachedSessions = null;
let cacheLoadedAt = 0;
let listExpanded = false;
let inFlight = null;

function fmtDate(ms) {
  if (!ms) return "—";
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString();
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
    <ul class="cloud-restore-list" hidden></ul>
  `;

  panelEl.querySelector('[data-action="open-latest"]').addEventListener("click", onOpenLatest);
  panelEl.querySelector('[data-action="toggle-list"]').addEventListener("click", onToggleList);
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
  const buttons = panelEl?.querySelectorAll("button");
  buttons?.forEach((b) => (b.disabled = true));
  setStatus(`Opening session ${escapeHtml(session.sessionId.slice(-8))}…`, "info");
  try {
    const { openCloudSession } = await import("./load-session.js");
    await openCloudSession(session, {
      onStatus: (msg) => console.log("[poker inline restore]", msg),
    });
    setStatus(
      `<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="5 12 10 17 19 7"/></svg> Opened ${(session.handCount || 0).toLocaleString()} hands · scroll down for the chart and replay browser.`,
      "ok",
    );
  } catch (err) {
    console.error("[poker inline restore] open failed:", err);
    setStatus(`Open failed: ${escapeHtml(err.message)}`, "err");
  } finally {
    buttons?.forEach((b) => (b.disabled = false));
  }
}

/**
 * Show the inline restore panel and (re-)fetch the user's sessions.
 * Idempotent — safe to call repeatedly on auth state changes.
 */
export async function mountInlineRestore() {
  panelEl = document.getElementById(PANEL_ID);
  if (!panelEl) return;
  renderShell();
  await refresh(true);
}

/**
 * Hide the panel and clear cached sessions (called on sign-out).
 */
export function unmountInlineRestore() {
  panelEl = document.getElementById(PANEL_ID);
  if (!panelEl) return;
  panelEl.hidden = true;
  panelEl.replaceChildren();
  cachedSessions = null;
  cacheLoadedAt = 0;
  listExpanded = false;
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
