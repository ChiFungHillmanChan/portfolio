// list.js — renders the "My Sessions" tab content.
// Fetches paginated sessions via /poker/list-sessions and renders a table.

import { apiCall } from "../auth/api-client.js";

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

async function onOpen(session, itemEl) {
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
    const closeBtn = document.querySelector('#settingsDrawer [data-settings-action="close"]');
    if (closeBtn) closeBtn.click();
    await openCloudSession(session, {
      onStatus: (msg) => console.log("[poker cloud open]", msg),
    });
  } catch (err) {
    console.error("[poker cloud open] failed:", err);
    alert("Open failed: " + err.message);
  } finally {
    if (openBtn) {
      openBtn.disabled = false;
      // Re-inject the trusted SVG-containing label.
      openBtn.innerHTML = prevLabel || `<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="6" y1="20" x2="6" y2="11"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="14"/></svg> Open`;
    }
  }
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
