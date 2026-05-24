// share-dialog.js — Single-purpose dialog for sharing a session's graphs.
//
// Opens from the main chart card's "Share session" button. Lets the owner:
//   • Create a new public link to /p/{shareId}
//   • See their existing active shares (title, dates, password flag, views)
//   • Copy a link, open it, or delete it (revoke + remove from server)
//
// Everything renders ONLY after the initial network calls (quota + my-shares)
// resolve — no flash of optimistic state when the user re-opens the dialog
// after creating a share. SVG icons used throughout; no emoji.

import {
  buildSharePayload,
  createStatsShare,
  listMyShares,
  revokeStatsShare,
} from "../cloud/share-stats.js";

const DIALOG_ID = "replayShareDialog";

// Mirrors backend SHARE_LIMITS in share-stats.mjs — UX only; backend re-validates.
const PLAN_OPTS = {
  free:       { perMonth: 4,                       expireDays: 7,   passwordAllowed: false },
  standard:   { perMonth: 30,                      expireDays: 90,  passwordAllowed: true  },
  pro:        { perMonth: 100,                     expireDays: 365, passwordAllowed: true  },
  ultra:      { perMonth: Number.POSITIVE_INFINITY, expireDays: 0,   passwordAllowed: true },
  superadmin: { perMonth: Number.POSITIVE_INFINITY, expireDays: 0,   passwordAllowed: true },
};

function planFor(quota) {
  if (!quota?.ok) return PLAN_OPTS.free;
  if (quota.superadmin) return PLAN_OPTS.superadmin;
  return PLAN_OPTS[quota.tier] || PLAN_OPTS.free;
}

// ── Inline SVG icons (matches the codebase's `ui-svg-icon` convention) ──────

const ICON = {
  close:      `<svg class="ui-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`,
  send:       `<svg class="ui-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  check:      `<svg class="ui-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5 12 10 17 19 7"/></svg>`,
  copy:       `<svg class="ui-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  open:       `<svg class="ui-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/></svg>`,
  share:      `<svg class="ui-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
  trash:      `<svg class="ui-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  refresh:    `<svg class="ui-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>`,
  lock:       `<svg class="ui-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  warn:       `<svg class="ui-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
};

// ── Module state ────────────────────────────────────────────────────────────

let dialogEl = null;
let ctx = null;          // { getGraphsState }
let cachedQuota = null;  // Refreshed every dialog open
let creatingShare = false;
let revokingShareId = null;

// ── Dialog mount ────────────────────────────────────────────────────────────

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement("div");
  dialogEl.id = DIALOG_ID;
  dialogEl.className = "replay-share-dialog";
  dialogEl.hidden = true;
  dialogEl.innerHTML = `
    <div class="replay-share-backdrop" data-share-action="close"></div>
    <div class="replay-share-panel" role="dialog" aria-modal="true" aria-labelledby="replayShareTitle">
      <div class="replay-share-header">
        <h4 id="replayShareTitle">Share session</h4>
        <button type="button" class="replay-share-close" data-share-action="close" aria-label="Close">${ICON.close}</button>
      </div>

      <!-- Single full-panel loading state shown until quota + my-shares both resolve -->
      <div class="replay-share-loading" data-loading>
        <div class="replay-share-spinner" aria-hidden="true"></div>
        <p>Loading…</p>
      </div>

      <!-- Main content — hidden until both fetches resolve so the user never
           sees a flash of optimistic/stale state when re-opening the dialog. -->
      <div class="replay-share-body" data-content hidden>
        <section class="replay-share-row">
          <label class="replay-share-row-label" for="shareTitleInput">Title</label>
          <input
            type="text"
            class="replay-share-input replay-share-title-input"
            id="shareTitleInput"
            maxlength="80"
            placeholder="e.g. 100,000 hands recorder"
          />
          <p class="replay-share-hint">Leave blank to use the default — the total hand count.</p>
        </section>

        <section class="replay-share-row" data-row="expire">
          <label class="replay-share-row-label" for="shareExpireSelect">Expires in</label>
          <div class="replay-share-expire" data-expire-container></div>
        </section>

        <!-- Password gate field — wrapped in a form for browser warning
             compliance. The visually-hidden username field is required by
             accessibility heuristics (browsers + password managers expect
             every password input to have an associated username). It's
             never submitted (the form is onsubmit=return false) and is
             tab-skipped via aria-hidden + tabindex="-1". -->
        <form class="replay-share-row replay-share-pw-row" data-row="password" autocomplete="off"
              onsubmit="return false;">
          <input
            type="text"
            class="replay-share-pw-username"
            name="username"
            autocomplete="username"
            aria-hidden="true"
            tabindex="-1"
            value="share-owner"
            readonly
          />
          <label class="replay-share-toggle">
            <input type="checkbox" id="sharePasswordToggle" />
            <span>Protect with a password</span>
          </label>
          <input
            type="password"
            class="replay-share-input"
            id="sharePasswordInput"
            placeholder="4–64 characters"
            minlength="4"
            maxlength="64"
            autocomplete="new-password"
            hidden
          />
        </form>

        <div class="replay-share-quota" data-quota>
          <span class="replay-share-quota-label">Monthly quota</span>
          <span class="replay-share-quota-value">—</span>
        </div>

        <div class="replay-share-progress" data-progress hidden>
          <div class="replay-share-progress-bar"><div class="replay-share-progress-fill" style="width:0%"></div></div>
          <span class="replay-share-progress-label">Creating share…</span>
        </div>

        <div class="replay-share-error" data-error hidden></div>

        <!-- Created-share result panel -->
        <div class="replay-share-result" data-result hidden>
          <div class="replay-share-result-success">${ICON.check}<span>Share link created</span></div>
          <div class="replay-share-result-url-row">
            <input type="text" readonly class="replay-share-input replay-share-result-url" data-result-url />
            <button type="button" class="replay-share-icon-btn" data-share-action="copy-url" aria-label="Copy link">${ICON.copy}<span>Copy</span></button>
          </div>
          <div class="replay-share-result-actions">
            <button type="button" class="replay-share-icon-btn" data-share-action="open-url" aria-label="Open link">${ICON.open}<span>Open</span></button>
            <button type="button" class="replay-share-icon-btn" data-share-action="native-share" aria-label="Share via system">${ICON.share}<span>Share via…</span></button>
          </div>
          <div class="replay-share-result-meta" data-result-meta></div>
        </div>

        <!-- Existing shares list -->
        <section class="replay-share-list-section" data-shares-section>
          <header class="replay-share-list-header">
            <h5>Your shares <span class="replay-share-list-count" data-shares-count></span></h5>
            <button type="button" class="replay-share-icon-btn replay-share-icon-btn--ghost" data-share-action="refresh-shares" aria-label="Refresh shares list">${ICON.refresh}</button>
          </header>
          <div class="replay-share-list" data-shares-list></div>
        </section>
      </div>

      <div class="replay-share-footer">
        <button type="button" class="replay-share-cancel" data-share-action="close">Close</button>
        <button type="button" class="replay-share-primary" data-share-action="create" disabled>
          ${ICON.send}<span>Create share link</span>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(dialogEl);

  dialogEl.addEventListener("click", onDialogClick);
  document.addEventListener("keydown", onKeyDown);

  dialogEl.querySelector("#sharePasswordToggle").addEventListener("change", () => {
    const cb = dialogEl.querySelector("#sharePasswordToggle");
    const input = dialogEl.querySelector("#sharePasswordInput");
    input.hidden = !cb.checked;
    if (cb.checked) input.focus();
    clearError();
  });

  dialogEl.querySelector("#shareTitleInput").addEventListener("input", clearError);

  return dialogEl;
}

// ── Event handlers ──────────────────────────────────────────────────────────

function onDialogClick(e) {
  const target = e.target;
  if (!(target instanceof Element)) return;

  // Block close while a share is being created or revoked.
  const busy = creatingShare || !!revokingShareId;
  if (busy && target.closest('[data-share-action="close"]')) return;

  const action = target.closest("[data-share-action]")?.getAttribute("data-share-action")
              || target.closest("[data-row-action]")?.getAttribute("data-row-action");
  if (!action) return;

  switch (action) {
    case "close":
      closeShareDialog();
      return;
    case "create":
      if (!busy) onCreateShare();
      return;
    case "copy-url":
      copyShareUrl();
      return;
    case "open-url":
      openShareUrl();
      return;
    case "native-share":
      nativeShareUrl();
      return;
    case "refresh-shares":
      if (!busy) refreshSharesList();
      return;
    case "row-open":
    case "row-copy":
    case "row-delete": {
      if (busy) return;
      const row = target.closest("[data-share-row]");
      const id = row?.getAttribute("data-share-row");
      const url = row?.getAttribute("data-share-url");
      if (!id || !url) return;
      if (action === "row-open") window.open(url, "_blank", "noopener");
      if (action === "row-copy") copyToClipboard(url, target.closest("button"));
      if (action === "row-delete") confirmDeleteShare(id);
      return;
    }
  }
}

function onKeyDown(e) {
  if (!dialogEl || dialogEl.hidden) return;
  if (e.key === "Escape" && !(creatingShare || revokingShareId)) {
    e.preventDefault();
    closeShareDialog();
  }
}

// ── State setters ───────────────────────────────────────────────────────────

function showLoading() {
  dialogEl.querySelector("[data-loading]").hidden = false;
  dialogEl.querySelector("[data-content]").hidden = true;
  // Disable primary button while loading
  dialogEl.querySelector('[data-share-action="create"]').disabled = true;
}

function showContent() {
  dialogEl.querySelector("[data-loading]").hidden = true;
  dialogEl.querySelector("[data-content]").hidden = false;
}

function setError(msg) {
  const box = dialogEl.querySelector("[data-error]");
  if (!box) return;
  if (!msg) { box.hidden = true; box.textContent = ""; return; }
  box.hidden = false;
  box.innerHTML = `${ICON.warn}<span>${escapeHtml(msg)}</span>`;
}

function clearError() { setError(""); }

function setProgress(visible, pct, label) {
  const wrap = dialogEl.querySelector("[data-progress]");
  if (!wrap) return;
  wrap.hidden = !visible;
  if (!visible) return;
  wrap.querySelector(".replay-share-progress-fill").style.width = `${Math.round((pct || 0) * 100)}%`;
  wrap.querySelector(".replay-share-progress-label").textContent = label || "";
}

// ── Render: quota + expire dropdown + password row ──────────────────────────

function renderQuota(quota, usedOverride) {
  const box = dialogEl.querySelector("[data-quota]");
  const value = box.querySelector(".replay-share-quota-value");
  if (!quota || !quota.ok) {
    value.textContent = "Sign in to create a share.";
    value.dataset.state = "spent";
    return;
  }
  const plan = planFor(quota);
  if (!Number.isFinite(plan.perMonth) || plan.perMonth >= 1e9) {
    value.textContent = "Unlimited";
    value.dataset.state = "ok";
    return;
  }
  if (typeof usedOverride === "number") {
    const remaining = Math.max(0, plan.perMonth - usedOverride);
    value.textContent = `${remaining} / ${plan.perMonth} left this month`;
    value.dataset.state = remaining > 0 ? "ok" : "spent";
  } else {
    value.textContent = `${plan.perMonth} / month`;
    value.dataset.state = "ok";
  }
}

function renderExpireDropdown(quota) {
  const wrap = dialogEl.querySelector("[data-expire-container]");
  wrap.replaceChildren();
  const plan = planFor(quota);
  const isFree = !quota?.ok || (quota.tier === "free" && !quota.superadmin);

  if (isFree) {
    const fixed = document.createElement("div");
    fixed.className = "replay-share-static-value";
    fixed.innerHTML = `<strong>7 days</strong> <span class="replay-share-static-hint">(Free tier — paid plans get longer)</span>`;
    wrap.appendChild(fixed);
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.id = "shareExpireSelect";
    hidden.value = "7";
    wrap.appendChild(hidden);
    return;
  }

  const select = document.createElement("select");
  select.id = "shareExpireSelect";
  select.className = "replay-share-input";
  const choices = [7, 30, 90];
  if (plan.expireDays === 0 || plan.expireDays >= 365) choices.push(365);
  if (plan.expireDays === 0) choices.push(0); // 0 = forever
  for (const d of choices) {
    const opt = document.createElement("option");
    opt.value = String(d);
    opt.textContent = d === 0 ? "Never expires" : `${d} days`;
    if (d === 30) opt.selected = true;
    select.appendChild(opt);
  }
  wrap.appendChild(select);
}

function renderPasswordRow(quota) {
  const row = dialogEl.querySelector('[data-row="password"]');
  const plan = planFor(quota);
  const allowed = !!plan.passwordAllowed && !!quota?.ok;
  row.hidden = !allowed;
  if (!allowed) {
    dialogEl.querySelector("#sharePasswordToggle").checked = false;
    dialogEl.querySelector("#sharePasswordInput").hidden = true;
    dialogEl.querySelector("#sharePasswordInput").value = "";
  }
}

// ── Render: shares list ─────────────────────────────────────────────────────

function renderSharesList(items) {
  const list = dialogEl.querySelector("[data-shares-list]");
  const count = dialogEl.querySelector("[data-shares-count]");
  list.replaceChildren();

  const active = (items || []).filter((s) => !s.revoked);
  count.textContent = active.length > 0 ? `(${active.length})` : "";

  if (active.length === 0) {
    const empty = document.createElement("div");
    empty.className = "replay-share-list-empty";
    empty.textContent = "No active shares yet.";
    list.appendChild(empty);
    return;
  }

  for (const item of active) {
    list.appendChild(buildShareRow(item));
  }
}

function buildShareRow(item) {
  const row = document.createElement("div");
  row.className = "replay-share-list-row";
  row.setAttribute("data-share-row", item.shareId);
  row.setAttribute("data-share-url", item.url);

  const createdStr = item.createdAt ? formatRelativeDate(item.createdAt) : "—";
  const expiresStr = item.expiresAt ? `expires ${formatRelativeDate(item.expiresAt, true)}` : "no expiry";
  const viewsStr = (item.views || 0) > 0 ? `${item.views} view${item.views === 1 ? "" : "s"}` : "0 views";

  row.innerHTML = `
    <div class="replay-share-list-row-main">
      <div class="replay-share-list-row-title">
        <span class="replay-share-list-row-name">${escapeHtml(item.title || `${item.handsTotal?.toLocaleString?.() || "—"} hands recorder`)}</span>
        ${item.passwordProtected ? `<span class="replay-share-list-row-lock" title="Password protected">${ICON.lock}</span>` : ""}
      </div>
      <div class="replay-share-list-row-meta">
        Created ${escapeHtml(createdStr)} · ${escapeHtml(expiresStr)} · ${escapeHtml(viewsStr)}
      </div>
    </div>
    <div class="replay-share-list-row-actions">
      <button type="button" class="replay-share-icon-btn replay-share-icon-btn--ghost" data-row-action="row-open" aria-label="Open share">${ICON.open}</button>
      <button type="button" class="replay-share-icon-btn replay-share-icon-btn--ghost" data-row-action="row-copy" aria-label="Copy link">${ICON.copy}</button>
      <button type="button" class="replay-share-icon-btn replay-share-icon-btn--danger" data-row-action="row-delete" aria-label="Delete share">${ICON.trash}</button>
    </div>
  `;
  return row;
}

function formatRelativeDate(iso, isFuture) {
  const d = new Date(iso);
  const diffMs = d.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const minutes = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);

  if (minutes < 60) return isFuture ? `in ${minutes}m` : `${minutes}m ago`;
  if (hours < 24)   return isFuture ? `in ${hours}h`   : `${hours}h ago`;
  if (days < 7)     return isFuture ? `in ${days}d`    : `${days}d ago`;
  // For longer ranges, use locale date — still relative-ish but unambiguous.
  return d.toLocaleDateString();
}

// ── Actions ─────────────────────────────────────────────────────────────────

async function onCreateShare() {
  if (creatingShare) return;
  clearError();

  const state = typeof ctx?.getGraphsState === "function" ? ctx.getGraphsState() : null;
  if (!state || !state.summary) {
    setError("No session loaded — upload or restore one first.");
    return;
  }

  const title = dialogEl.querySelector("#shareTitleInput").value.trim();
  const expireDaysEl = dialogEl.querySelector("#shareExpireSelect");
  const expireDays = expireDaysEl ? Number(expireDaysEl.value) : 7;
  const usePassword = dialogEl.querySelector("#sharePasswordToggle").checked;
  const password = usePassword ? dialogEl.querySelector("#sharePasswordInput").value : null;

  if (usePassword) {
    if (!password || password.length < 4) { setError("Password must be at least 4 characters."); return; }
    if (password.length > 64)              { setError("Password must be 64 characters or fewer."); return; }
  }

  // Show progress IMMEDIATELY so the user sees feedback within one frame.
  // Building the payload (downsampling 30k+ point series, BigInt → Number
  // conversions across 4 series) is synchronous and can take ~500ms on a
  // typical laptop — without an explicit yield Chrome warns about the
  // click handler exceeding 100ms and the UI freezes silently.
  creatingShare = true;
  refreshPrimaryEnabled();
  setProgress(true, 0.1, "Preparing snapshot…");
  // Yield to the renderer so the progress bar actually paints before we
  // start the heavy CPU work.
  await new Promise((r) => requestAnimationFrame(r));

  let payload;
  try {
    payload = buildSharePayload({
      type: "graphs",
      title,
      expireDays,
      password,
      summary: state.summary,
      seriesBefore: state.seriesBefore,
      seriesAfter: state.seriesAfter,
      meta: state.meta || null,
    });
  } catch (err) {
    creatingShare = false;
    setProgress(false, 0, "");
    refreshPrimaryEnabled();
    setError(`Could not prepare snapshot: ${err.message}`);
    return;
  }

  setProgress(true, 0.5, "Uploading snapshot…");

  let result;
  try {
    result = await createStatsShare(payload);
  } catch (err) {
    creatingShare = false;
    setProgress(false, 0, "");
    refreshPrimaryEnabled();
    console.error("[share-dialog] createStatsShare failed:", err?.message || err);
    setError(explainCreateError(err));
    return;
  }

  creatingShare = false;
  setProgress(false, 0, "");
  showShareResult(result);

  if (Number.isFinite(result.quotaUsed) && result.quotaLimit) {
    renderQuota(cachedQuota, result.quotaUsed);
  }

  // Refresh the shares list so the new share appears at the top immediately.
  refreshSharesList().catch(() => {});
}

function refreshPrimaryEnabled() {
  const primary = dialogEl.querySelector('[data-share-action="create"]');
  const hasState = !!ctx?.getGraphsState && !!ctx.getGraphsState();
  const resultShown = !dialogEl.querySelector("[data-result]").hidden;
  primary.disabled = !hasState || resultShown || creatingShare;
}

function showShareResult(res) {
  const result = dialogEl.querySelector("[data-result]");
  result.hidden = false;
  result.querySelector("[data-result-url]").value = res.url;
  const meta = result.querySelector("[data-result-meta]");
  const parts = [];
  if (res.expiresAt) parts.push(`Expires ${new Date(res.expiresAt).toLocaleDateString()}`);
  else               parts.push("No expiry");
  if (res.passwordProtected) parts.push("Password protected");
  if (typeof res.quotaUsed === "number" && res.quotaLimit) {
    parts.push(`${res.quotaUsed}/${res.quotaLimit} used this month`);
  }
  meta.textContent = parts.join(" · ");

  dialogEl.querySelector("#shareTitleInput").disabled = true;
  const exp = dialogEl.querySelector("#shareExpireSelect");
  if (exp) exp.disabled = true;
  dialogEl.querySelector("#sharePasswordToggle").disabled = true;
  dialogEl.querySelector("#sharePasswordInput").disabled = true;

  refreshPrimaryEnabled();

  setTimeout(() => result.querySelector("[data-result-url]").select(), 80);
}

function explainCreateError(err) {
  const m = /^poker-api-(\d+):\s*(.*)$/.exec(err?.message || "");
  if (!m) return "Network error — check your connection and try again.";
  const status = m[1];
  let body = {};
  try { body = JSON.parse(m[2]); } catch {}
  if (status === "401") return "Sign in to create a share link.";
  if (body.error === "quota_exceeded_graphs") return "You've used all your share slots this month. Upgrade for more.";
  if (body.error === "password_requires_paid") return "Password protection is paid-only.";
  if (body.error === "forever_requires_paid") return "Forever expiry needs Ultra. Pick 7 / 30 / 90 / 365 days instead.";
  if (body.error === "expire_too_long")       return `Pick a shorter expiry — your plan caps at ${body.maxDays || 30} days.`;
  if (body.error === "invalid_password_length") return "Password must be 4–64 characters.";
  if (body.error?.startsWith?.("invalid_payload")) return "Snapshot data was invalid. Recompute your chart and try again.";
  return body.error || "Could not create share link. Try again.";
}

async function refreshSharesList() {
  try {
    const res = await listMyShares({ pageSize: 50 });
    renderSharesList(res?.items || []);
  } catch (err) {
    console.warn("[share-dialog] listMyShares failed:", err?.message || err);
    // Don't error-toast for the list — it's not critical. Just show empty.
    renderSharesList([]);
  }
}

function confirmDeleteShare(shareId) {
  // Inline confirm — simpler than a separate modal, matches existing toast feel.
  if (!confirm("Delete this share link? Anyone with the URL will see a 'gone' page.")) return;
  doDeleteShare(shareId);
}

async function doDeleteShare(shareId) {
  if (revokingShareId) return;
  revokingShareId = shareId;
  const row = dialogEl.querySelector(`[data-share-row="${cssEscape(shareId)}"]`);
  if (row) row.classList.add("replay-share-list-row--deleting");

  try {
    await revokeStatsShare(shareId);
    // Remove from DOM immediately + refresh the list to update count + free
    // up a quota slot in the displayed monthly counter.
    if (row) row.remove();
    const list = dialogEl.querySelector("[data-shares-list]");
    if (list.children.length === 0) renderSharesList([]);
    refreshSharesList().catch(() => {});
  } catch (err) {
    console.error("[share-dialog] revokeStatsShare failed:", err?.message || err);
    if (row) row.classList.remove("replay-share-list-row--deleting");
    alert("Could not delete that share. Please try again.");
  } finally {
    revokingShareId = null;
  }
}

// ── Copy / open / native share ──────────────────────────────────────────────

async function copyShareUrl() {
  const input = dialogEl.querySelector("[data-result-url]");
  const url = input?.value;
  if (!url) return;
  await copyToClipboard(url, dialogEl.querySelector('[data-share-action="copy-url"]'));
}

async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    if (button) {
      const labelEl = button.querySelector("span");
      if (labelEl) {
        const orig = labelEl.textContent;
        labelEl.textContent = "Copied!";
        setTimeout(() => { labelEl.textContent = orig; }, 1200);
      } else {
        button.classList.add("replay-share-copied");
        setTimeout(() => button.classList.remove("replay-share-copied"), 1200);
      }
    }
  } catch {
    // Older Safari fallback — select the input so the user can ⌘C.
    const input = dialogEl.querySelector("[data-result-url]");
    if (input) input.select();
  }
}

function openShareUrl() {
  const url = dialogEl.querySelector("[data-result-url]")?.value;
  if (!url) return;
  window.open(url, "_blank", "noopener");
}

async function nativeShareUrl() {
  const url = dialogEl.querySelector("[data-result-url]")?.value;
  if (!url) return;
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: "Poker session stats",
        text: "Look at my poker session stats — no hand details included.",
        url,
      });
    } catch (err) {
      if (err && err.name !== "AbortError") console.warn("[share-dialog] navigator.share failed:", err);
    }
    return;
  }
  copyShareUrl();
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cssEscape(s) {
  // Mirror CSS.escape() with a small polyfill for older Safari. Used so we
  // can construct a [data-share-row="…"] selector from an untrusted shareId.
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(s);
  return String(s).replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

// ── Public API ──────────────────────────────────────────────────────────────

export function openShareDialog({ getGraphsState } = {}) {
  ensureDialog();
  ctx = { getGraphsState };

  // Show the dialog immediately with the loading state so the user gets a
  // visible response to their click. Content stays hidden until both the
  // quota AND the shares list resolve — this prevents the "old state for
  // 1 frame then refresh" flash the user observed.
  resetForm();
  showLoading();
  dialogEl.hidden = false;

  // Default placeholder uses the current session's hand count if available.
  const gs = typeof getGraphsState === "function" ? getGraphsState() : null;
  if (gs?.summary?.hands) {
    const n = Number(gs.summary.hands) || 0;
    dialogEl.querySelector("#shareTitleInput").placeholder = `${n.toLocaleString()} hands recorder`;
  } else {
    dialogEl.querySelector("#shareTitleInput").placeholder = "e.g. 100,000 hands recorder";
  }

  // Parallel fetch — both must resolve before we reveal the form.
  Promise.all([
    fetchQuota(),
    listMyShares({ pageSize: 50 }).catch(() => ({ items: [] })),
  ]).then(([quota, sharesRes]) => {
    cachedQuota = quota;
    renderQuota(quota);
    renderExpireDropdown(quota);
    renderPasswordRow(quota);
    renderSharesList(sharesRes?.items || []);
    refreshPrimaryEnabled();
    showContent();
  }).catch((err) => {
    console.error("[share-dialog] init fetch failed:", err);
    // Even on failure, reveal the content so the user can read the error.
    renderQuota(null);
    renderExpireDropdown(null);
    renderPasswordRow(null);
    renderSharesList([]);
    showContent();
    setError("Could not load your account info. Sign in and try again.");
  });
}

// Wraps the existing get-share-quota endpoint so we can render the quota
// without exposing share-quota.js (now deleted) as a separate module.
async function fetchQuota() {
  try {
    // Lazy-import the auth client so the module-load cost is paid only when
    // the user actually opens the share dialog (consistent with the
    // dynamic-import entry point in upload.js).
    const { apiCall } = await import("../auth/api-client.js");
    return await apiCall("get-share-quota", {});
  } catch (err) {
    console.warn("[share-dialog] get-share-quota failed:", err?.message || err);
    return null;
  }
}

function resetForm() {
  creatingShare = false;
  revokingShareId = null;
  clearError();
  setProgress(false, 0, "");
  dialogEl.querySelector("[data-result]").hidden = true;
  const titleEl = dialogEl.querySelector("#shareTitleInput");
  titleEl.value = "";
  titleEl.disabled = false;
  const pwToggle = dialogEl.querySelector("#sharePasswordToggle");
  pwToggle.checked = false;
  pwToggle.disabled = false;
  const pwInput = dialogEl.querySelector("#sharePasswordInput");
  pwInput.value = "";
  pwInput.disabled = false;
  pwInput.hidden = true;
}

export function closeShareDialog() {
  if (creatingShare || revokingShareId) return;
  if (dialogEl) dialogEl.hidden = true;
  ctx = null;
}
