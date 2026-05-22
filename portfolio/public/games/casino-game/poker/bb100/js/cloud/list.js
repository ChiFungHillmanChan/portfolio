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
    item.innerHTML = `
      <div class="session-meta">
        <div class="session-date">${fmtDate(s.createdAt)}</div>
        <div class="session-files">${s.fileNames.length} file${s.fileNames.length === 1 ? "" : "s"} · ${s.handCount.toLocaleString()} hands · ${fmtBytes(s.bytesCompressed)}</div>
      </div>
      <div class="session-actions">
        <button type="button" class="btn-secondary" data-action="restore">Restore</button>
        <button type="button" class="btn-danger" data-action="delete">Delete</button>
      </div>
    `;
    item.querySelector('[data-action="restore"]').addEventListener("click", () => onRestore(s.sessionId));
    item.querySelector('[data-action="delete"]').addEventListener("click", () => onDelete(s.sessionId, item));
    list.appendChild(item);
  }
  container.appendChild(list);
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
