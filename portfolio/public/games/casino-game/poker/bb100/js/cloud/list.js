// list.js — renders the "My Sessions" tab content.
// Fetches paginated sessions via /poker/list-sessions and renders a table.

import { apiCall } from "../auth/api-client.js";
import { COMPUTE_FINGERPRINT } from "../stats/compute.mjs";

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}

export async function renderSessions(container) {
  if (!container) return;
  container.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "sessions-loading";
  loading.textContent = "Loading your sessions…";
  container.appendChild(loading);

  let listResp;
  try {
    listResp = await apiCall("list-sessions", {});
  } catch (err) {
    loading.textContent = `Could not load sessions: ${err.message}`;
    loading.classList.add("sessions-error");
    return;
  }

  if (!listResp.ok) {
    loading.textContent = `list-sessions failed: ${listResp.error || "unknown"}`;
    loading.classList.add("sessions-error");
    return;
  }

  if (listResp.sessions.length === 0) {
    loading.textContent = "No saved sessions yet. Upload GG hands → click 'Save to cloud' to back them up.";
    return;
  }

  container.replaceChildren();

  // Stale-cache banner: count sessions whose cached chart was computed with
  // an older COMPUTE_FINGERPRINT. The next open of each would otherwise
  // re-trigger the recompute path. The banner lets the user batch-refresh
  // them all up-front so subsequent opens are sub-second.
  const staleSessions = (listResp.sessions || []).filter(
    (s) => s.hasSeries && s.computeFingerprint && s.computeFingerprint !== COMPUTE_FINGERPRINT
  );
  if (staleSessions.length > 0) {
    container.appendChild(buildStaleBanner(staleSessions, container));
  }

  const list = document.createElement("ul");
  list.className = "sessions-list";

  for (const s of listResp.sessions) {
    const item = document.createElement("li");
    item.className = "session-item";
    item.dataset.sessionId = s.sessionId;
    // "Open" is the new fast-render flow (downloads the pre-computed
    // series.json.gz and re-hydrates straight into the chart). "Restore" is
    // the existing archival flow (downloads the original .txt files to disk).
    // Keep both — they serve different intents.
    item.innerHTML = `
      <div class="session-meta">
        <div class="session-date">${fmtDate(s.createdAt)}</div>
        <div class="session-files">${s.fileNames.length} file${s.fileNames.length === 1 ? "" : "s"} · ${s.handCount.toLocaleString()} hands · ${fmtBytes(s.bytesCompressed)}</div>
      </div>
      <div class="session-actions">
        <button type="button" class="btn-primary" data-action="open"><svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="6" y1="20" x2="6" y2="11"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="14"/></svg> Open</button>
        <button type="button" class="btn-secondary" data-action="restore">Restore</button>
        <button type="button" class="btn-danger" data-action="delete">Delete</button>
      </div>
    `;
    item.querySelector('[data-action="open"]').addEventListener("click", () => onOpen(s, item));
    item.querySelector('[data-action="restore"]').addEventListener("click", () => onRestore(s.sessionId));
    item.querySelector('[data-action="delete"]').addEventListener("click", () => onDelete(s.sessionId, item));
    list.appendChild(item);
  }
  container.appendChild(list);
}

// Module-level controller for the Settings-drawer Open click. Cancelled when
// the user opens a different row OR closes the drawer mid-load — saves the
// multi-MB hands.txt.gz download in the slow-path recompute case.
let drawerOpenController = null;

async function onOpen(session, itemEl) {
  // Cancel any previous in-flight drawer open before starting a new one.
  if (drawerOpenController && !drawerOpenController.signal.aborted) {
    try { drawerOpenController.abort(); } catch (_) {}
  }
  const controller = new AbortController();
  drawerOpenController = controller;

  const { openCloudSession } = await import("./load-session.js");
  const openBtn = itemEl.querySelector('[data-action="open"]');
  // Preserve the full innerHTML (including the inline icon SVG) so we can
  // restore it after the loading state. Using textContent would strip the
  // SVG and leave the button without its icon on subsequent loads.
  const prevLabel = openBtn?.innerHTML;
  if (openBtn) { openBtn.disabled = true; openBtn.textContent = "Loading…"; }
  try {
    // Switch back to the Upload tab so the chart container is visible.
    // tabs.js wires .tab-btn[data-tab] → panel[data-tab-panel].
    const uploadTabBtn = document.querySelector('.tab-btn[data-tab="upload"]');
    if (uploadTabBtn) uploadTabBtn.click();
    // Close the Settings drawer so the chart isn't behind the overlay.
    // settings.js wires any `[data-settings-action="close"]` child of the
    // drawer to close it — easier to click that than to plumb a new event.
    // The close event itself aborts the controller (see DOMContentLoaded
    // listener below), so any user who closes mid-download stops paying.
    const closeBtn = document.querySelector('#settingsDrawer [data-settings-action="close"]');
    if (closeBtn) closeBtn.click();
    await openCloudSession(session, {
      signal: controller.signal,
      onStatus: (msg) => console.log("[poker cloud open]", msg),
    });
    // Replay-row UI is rendered by inline-restore.js via the
    // `poker:cloud-session-opened` event — nothing to do here.
  } catch (err) {
    if (err?.name === "AbortError") {
      console.log("[poker cloud open] cancelled");
    } else {
      console.error("[poker cloud open] failed:", err);
      alert("Open failed: " + err.message);
    }
  } finally {
    if (drawerOpenController === controller) drawerOpenController = null;
    if (openBtn) {
      openBtn.disabled = false;
      // Re-inject the trusted SVG-containing label.
      openBtn.innerHTML = prevLabel || `<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="6" y1="20" x2="6" y2="11"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="14"/></svg> Open`;
    }
  }
}

// Abort the drawer's in-flight open when the user navigates away from the
// tab — saves bandwidth + R2 egress when somebody clicks Open then closes
// the tab before the slow-path recompute finishes downloading hands.txt.gz.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    if (drawerOpenController && !drawerOpenController.signal.aborted) {
      try { drawerOpenController.abort(); } catch (_) {}
    }
  });
}

async function onRestore(sessionId) {
  const { restoreSessionToBrowser } = await import("./restore.js");
  try {
    await restoreSessionToBrowser(sessionId);
  } catch (err) {
    alert("Restore failed: " + err.message);
  }
}

async function onDelete(sessionId, itemEl) {
  const { deleteSession } = await import("./delete.js");
  if (!confirm("Delete this session permanently? This cannot be undone.")) return;
  try {
    await deleteSession(sessionId);
    itemEl.remove();
  } catch (err) {
    alert("Delete failed: " + err.message);
  }
}

// ─── Stale-cache batch refresh banner ─────────────────────────────────────
// One banner that owns its own progress state. Clicking "Refresh now" walks
// each stale session through download → parse → compute → upload via the
// migrate-stale-cache module. We don't touch the chart UI during migration —
// just update the banner text and progress bar.

function buildStaleBanner(staleSessions, sessionsContainer) {
  const wrap = document.createElement("div");
  wrap.className = "sessions-stale-banner";
  // innerHTML is built from trusted literals + numeric counts only.
  wrap.innerHTML = `
    <div class="sessions-stale-banner__icon" aria-hidden="true">
      <svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
    </div>
    <div class="sessions-stale-banner__body">
      <div class="sessions-stale-banner__title">${staleSessions.length} session${staleSessions.length === 1 ? "" : "s"} have an outdated chart cache</div>
      <div class="sessions-stale-banner__sub">Refresh now and future opens become sub-second. Otherwise each session recomputes once on its next open.</div>
      <div class="sessions-stale-banner__progress" hidden>
        <div class="sessions-stale-banner__bar"><div class="sessions-stale-banner__fill"></div></div>
        <div class="sessions-stale-banner__status">Preparing…</div>
      </div>
    </div>
    <div class="sessions-stale-banner__actions">
      <button type="button" class="btn-primary" data-stale-action="run">Refresh ${staleSessions.length}</button>
      <button type="button" class="btn-secondary" data-stale-action="stop" hidden>Stop</button>
    </div>
  `;

  const runBtn = wrap.querySelector('[data-stale-action="run"]');
  const stopBtn = wrap.querySelector('[data-stale-action="stop"]');
  const progressWrap = wrap.querySelector(".sessions-stale-banner__progress");
  const fill = wrap.querySelector(".sessions-stale-banner__fill");
  const status = wrap.querySelector(".sessions-stale-banner__status");
  const sub = wrap.querySelector(".sessions-stale-banner__sub");

  const abortFlag = { aborted: false };

  runBtn.addEventListener("click", async () => {
    runBtn.disabled = true;
    runBtn.hidden = true;
    stopBtn.hidden = false;
    progressWrap.hidden = false;

    const { migrateAllStaleSessions } = await import("./migrate-stale-cache.js");
    let result;
    try {
      result = await migrateAllStaleSessions({
        abortFlag,
        onProgress: (evt) => {
          const total = evt.total || staleSessions.length;
          const current = evt.current || 0;
          const pct = total > 0 ? Math.round((current / total) * 100) : 0;
          fill.style.width = `${pct}%`;
          const last8 = evt.session ? evt.session.sessionId.slice(-8) : "";
          if (evt.phase === "downloading") {
            status.textContent = `(${current}/${total}) Downloading hands for ${last8}…`;
          } else if (evt.phase === "parsing") {
            status.textContent = `(${current}/${total}) Parsing ${last8}…`;
          } else if (evt.phase === "computing") {
            const handCount = evt.handCount ? ` (${evt.handCount.toLocaleString()} hands)` : "";
            const inner = typeof evt.progress === "number" ? ` ${Math.round(evt.progress * 100)}%` : "";
            status.textContent = `(${current}/${total}) Computing ${last8}${handCount}${inner}…`;
          } else if (evt.phase === "uploading") {
            status.textContent = `(${current}/${total}) Saving fresh cache for ${last8}…`;
          } else if (evt.phase === "session-error") {
            status.textContent = `(${current}/${total}) ${last8}: ${evt.error}`;
          }
        },
      });
    } catch (err) {
      status.textContent = `Migration failed: ${err.message}`;
      console.error("[poker cloud migrate] aborted with error:", err);
      stopBtn.hidden = true;
      return;
    }

    stopBtn.hidden = true;
    if (result.failed === 0 && !abortFlag.aborted) {
      sub.textContent = `All ${result.migrated} session${result.migrated === 1 ? "" : "s"} refreshed. Future opens are now fast.`;
      status.textContent = "Done.";
    } else if (abortFlag.aborted) {
      sub.textContent = `Stopped after ${result.migrated}/${result.total}. Remaining sessions still recompute on first open.`;
      status.textContent = "Stopped.";
    } else {
      sub.textContent = `Refreshed ${result.migrated}/${result.total}. ${result.failed} failed — check console for details.`;
      status.textContent = "Done with errors.";
    }

    // Re-render the list so the banner disappears for newly-fresh sessions.
    setTimeout(() => renderSessions(sessionsContainer), 2500);
  });

  stopBtn.addEventListener("click", () => {
    abortFlag.aborted = true;
    stopBtn.disabled = true;
    status.textContent = "Stopping after current session…";
  });

  return wrap;
}
