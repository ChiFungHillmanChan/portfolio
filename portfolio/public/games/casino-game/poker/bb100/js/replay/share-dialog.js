// share-dialog.js — Sub-dialog with two tabs:
//
//   • Graphs  Snapshot of session stats (summary + before/after series) to a
//             public URL on casino-game.hillmanchan.com/p/{id}. No hand data
//             leaves the browser. Owner picks title, expiry, and (paid only)
//             a password. Snapshot is IMMUTABLE — later edits/deletes don't
//             touch the shared payload.
//
//   • Hands   Existing per-hand video export. Records the live replay canvas
//             via MediaRecorder, hands the blob to Web Share API or downloads.
//             Free users see this tab locked with an upgrade nudge — gating
//             matches the user's spec ("share hands for paid or superadmin").
//
// Entry points:
//   • Main chart → openShareDialog({ defaultTab: "graphs", getGraphsState })
//   • Replay modal → openShareDialog({ defaultTab: "hands", getReplayState, durationFn })
//
// Either state can be omitted; the dialog disables tabs whose state is missing
// and explains why in-panel.

import { getShareQuota, recordVideoShare, isUnlimited } from "../cloud/share-quota.js";
import { exportReplayVideo, listOrientations, pickSupportedMimeType } from "./video-export.js";
import { buildSharePayload, createStatsShare } from "../cloud/share-stats.js";

const DIALOG_ID = "replayShareDialog";

// Mirrors backend SHARE_LIMITS in share-stats.mjs. Used for dropdown choices
// and locking the password toggle — backend re-validates so this is purely UX.
const PLAN_OPTS = {
  free:       { graphs: { perMonth: 4,    expireDays: 7,   passwordAllowed: false } },
  standard:   { graphs: { perMonth: 30,   expireDays: 90,  passwordAllowed: true  } },
  pro:        { graphs: { perMonth: 100,  expireDays: 365, passwordAllowed: true  } },
  ultra:      { graphs: { perMonth: Infinity, expireDays: 0, passwordAllowed: true } },
  superadmin: { graphs: { perMonth: Infinity, expireDays: 0, passwordAllowed: true } },
};

function planFor(quota) {
  if (!quota?.ok) return PLAN_OPTS.free;
  if (quota.superadmin) return PLAN_OPTS.superadmin;
  return PLAN_OPTS[quota.tier] || PLAN_OPTS.free;
}

let dialogEl = null;
let ctx = null;       // { getReplayState?, durationFn?, getGraphsState?, defaultTab }
let activeTab = "graphs";
let exporting = false;     // true while a video export is mid-encode
let creatingGraph = false; // true while waiting on create-stats-share

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
        <h4 id="replayShareTitle">Share</h4>
        <button type="button" class="replay-share-close" data-share-action="close" aria-label="Close">×</button>
      </div>
      <div class="replay-share-tabs" role="tablist">
        <button type="button" class="replay-share-tab active" data-tab="graphs" role="tab" aria-selected="true">
          Share Graphs
        </button>
        <button type="button" class="replay-share-tab" data-tab="hands" role="tab" aria-selected="false">
          Share Hands
          <span class="replay-share-tab-badge" data-badge="hands"></span>
        </button>
      </div>

      <!-- ── Graphs tab ─────────────────────────────────────────────────── -->
      <div class="replay-share-body" data-tab-panel="graphs">
        <section class="replay-share-row">
          <span class="replay-share-row-label">Title</span>
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
          <span class="replay-share-row-label">Expires in</span>
          <div class="replay-share-expire" data-expire-container></div>
        </section>

        <section class="replay-share-row" data-row="password">
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
            hidden
          />
        </section>

        <div class="replay-share-quota" data-quota="graphs">
          <span class="replay-share-quota-label">Monthly quota</span>
          <span class="replay-share-quota-value">Loading…</span>
        </div>

        <div class="replay-share-progress" data-progress="graphs" hidden>
          <div class="replay-share-progress-bar"><div class="replay-share-progress-fill" style="width:0%"></div></div>
          <span class="replay-share-progress-label">Creating share…</span>
        </div>

        <div class="replay-share-error" data-error="graphs" hidden></div>

        <!-- Result panel shown after a share is created -->
        <div class="replay-share-result" data-result="graphs" hidden>
          <div class="replay-share-result-success">
            ✓ Share link created
          </div>
          <div class="replay-share-result-url-row">
            <input type="text" readonly class="replay-share-input replay-share-result-url" data-result-url />
            <button type="button" class="replay-share-result-copy" data-share-action="copy-url">Copy</button>
          </div>
          <div class="replay-share-result-actions">
            <button type="button" class="replay-share-result-open" data-share-action="open-url">Open ↗</button>
            <button type="button" class="replay-share-result-native" data-share-action="native-share">Share via…</button>
          </div>
          <div class="replay-share-result-meta" data-result-meta></div>
        </div>
      </div>

      <!-- ── Hands tab (existing video export flow) ────────────────────── -->
      <div class="replay-share-body" data-tab-panel="hands" hidden>
        <div class="replay-share-locked" data-hands-locked hidden>
          <p>
            🔒 <strong>Share Hands</strong> is available on paid plans (Standard, Pro, Ultra).
            Upgrade in Settings → Storage to enable hand-replay video sharing.
          </p>
        </div>
        <div class="replay-share-needs-state" data-hands-needs-state hidden>
          <p>
            Pick a specific hand from the <em>Hand Replay</em> tab and press <kbd>Share</kbd>
            inside the replay modal — that's where hand-video sharing lives.
          </p>
        </div>
        <div data-hands-content>
          <section class="replay-share-row" aria-label="Orientation">
            <span class="replay-share-row-label">Orientation</span>
            <div class="replay-share-orient" role="group"></div>
          </section>
          <section class="replay-share-row" aria-label="Current settings">
            <span class="replay-share-row-label">Settings</span>
            <div class="replay-share-current">
              <span class="replay-share-chip" data-chip="speed">Speed: —</span>
              <span class="replay-share-chip" data-chip="unit">Unit: —</span>
            </div>
          </section>
          <p class="replay-share-hint">
            Uses your current speed and $/BB toggle — change those first if needed.
            <br>
            <strong>4:3</strong> shows the table largest (best for reading on phone).
            <strong>9:16</strong> is for Reels / TikTok.
          </p>
          <div class="replay-share-quota" data-quota="hands">
            <span class="replay-share-quota-label">Daily video-share quota</span>
            <span class="replay-share-quota-value">Loading…</span>
          </div>
          <div class="replay-share-progress" data-progress="hands" hidden>
            <div class="replay-share-progress-bar"><div class="replay-share-progress-fill" style="width:0%"></div></div>
            <span class="replay-share-progress-label">Preparing…</span>
          </div>
          <div class="replay-share-error" data-error="hands" hidden></div>
        </div>
      </div>

      <div class="replay-share-footer">
        <button type="button" class="replay-share-cancel" data-share-action="close">Close</button>
        <button type="button" class="replay-share-primary" data-share-action="primary" disabled>Create share link</button>
      </div>
    </div>
  `;
  document.body.appendChild(dialogEl);

  // Populate orientation pills once (Hands tab).
  const orientWrap = dialogEl.querySelector(".replay-share-orient");
  for (const o of listOrientations()) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "replay-share-orient-btn";
    btn.dataset.orient = o.key;
    btn.textContent = o.label;
    if (o.key === "9:16") btn.classList.add("active");
    orientWrap.appendChild(btn);
  }

  dialogEl.addEventListener("click", onDialogClick);
  document.addEventListener("keydown", onKeyDown);

  // Title input — live update of preview default in the placeholder.
  const titleInput = dialogEl.querySelector("#shareTitleInput");
  titleInput.addEventListener("input", () => clearError("graphs"));

  // Password toggle wiring.
  const pwToggle = dialogEl.querySelector("#sharePasswordToggle");
  pwToggle.addEventListener("change", () => {
    const input = dialogEl.querySelector("#sharePasswordInput");
    input.hidden = !pwToggle.checked;
    if (pwToggle.checked) input.focus();
    clearError("graphs");
  });

  return dialogEl;
}

function onDialogClick(e) {
  const target = e.target;
  if (!(target instanceof Element)) return;
  const busy = exporting || creatingGraph;

  // Block close while a long-running export is in flight.
  if (busy && target.closest('[data-share-action="close"]')) return;

  const closeTarget = target.closest('[data-share-action="close"]');
  if (closeTarget) { closeShareDialog(); return; }

  const tabBtn = target.closest(".replay-share-tab");
  if (tabBtn && !busy) {
    switchTab(tabBtn.dataset.tab);
    return;
  }

  const primary = target.closest('[data-share-action="primary"]');
  if (primary && !busy) {
    if (activeTab === "graphs") onCreateShare();
    else onExportVideo();
    return;
  }

  const orientBtn = target.closest(".replay-share-orient-btn");
  if (orientBtn && !busy) {
    dialogEl.querySelectorAll(".replay-share-orient-btn").forEach((b) =>
      b.classList.toggle("active", b === orientBtn)
    );
    return;
  }

  if (target.closest('[data-share-action="copy-url"]')) { copyShareUrl(); return; }
  if (target.closest('[data-share-action="open-url"]')) { openShareUrl(); return; }
  if (target.closest('[data-share-action="native-share"]')) { nativeShareUrl(); return; }
}

function onKeyDown(e) {
  if (!dialogEl || dialogEl.hidden) return;
  if (e.key === "Escape" && !(exporting || creatingGraph)) {
    e.preventDefault();
    closeShareDialog();
  }
}

// ── Tabs ────────────────────────────────────────────────────────────────────

function switchTab(tab) {
  if (tab !== "graphs" && tab !== "hands") return;
  activeTab = tab;
  dialogEl.querySelectorAll(".replay-share-tab").forEach((b) => {
    const isActive = b.dataset.tab === tab;
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  dialogEl.querySelectorAll("[data-tab-panel]").forEach((p) => {
    p.hidden = p.getAttribute("data-tab-panel") !== tab;
  });
  // Footer primary-button label changes per tab.
  const primary = dialogEl.querySelector('[data-share-action="primary"]');
  if (tab === "graphs") {
    primary.textContent = "Create share link";
    refreshGraphsPrimaryEnabled();
  } else {
    primary.textContent = "Export video";
    refreshHandsPrimaryEnabled();
  }
}

// ── Render: Graphs tab quota + expire + password availability ───────────────

function renderGraphsQuota(quota, currentUsed) {
  const box = dialogEl.querySelector('[data-quota="graphs"]');
  const value = box.querySelector(".replay-share-quota-value");
  if (!quota || !quota.ok) {
    value.textContent = "Sign in to create a share link.";
    value.dataset.state = "spent";
    return;
  }
  const plan = planFor(quota);
  const limit = plan.graphs.perMonth;
  if (!Number.isFinite(limit) || limit >= 1e9) {
    value.textContent = "Unlimited";
    value.dataset.state = "ok";
  } else {
    // `currentUsed` is optional; once the user creates a share we know the
    // freshly-incremented count and update the label live. Before that we
    // only know "≤ limit" — render as the limit until we hear otherwise.
    if (typeof currentUsed === "number") {
      const remaining = Math.max(0, limit - currentUsed);
      value.textContent = `${remaining} / ${limit} left this month`;
      value.dataset.state = remaining > 0 ? "ok" : "spent";
    } else {
      value.textContent = `${limit} / month`;
      value.dataset.state = "ok";
    }
  }
}

function renderExpireDropdown(quota) {
  const wrap = dialogEl.querySelector("[data-expire-container]");
  wrap.replaceChildren();
  const plan = planFor(quota);
  const maxDays = plan.graphs.expireDays;

  if (!quota || !quota.ok || quota.tier === "free") {
    // Free tier (or unauthenticated) is locked to 7 days with an upgrade nudge.
    const fixed = document.createElement("div");
    fixed.className = "replay-share-static-value";
    fixed.innerHTML = `<strong>7 days</strong> <span class="replay-share-static-hint">(Free tier — paid plans get longer / forever)</span>`;
    wrap.appendChild(fixed);
    // Hidden control to read on submit.
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
  if (maxDays === 0 || maxDays >= 365) choices.push(365);
  if (maxDays === 0) choices.push(0); // Forever
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
  const allowed = !!plan.graphs.passwordAllowed && !!quota?.ok;
  row.hidden = !allowed;
  if (!allowed) {
    const cb = dialogEl.querySelector("#sharePasswordToggle");
    cb.checked = false;
    dialogEl.querySelector("#sharePasswordInput").hidden = true;
  }
}

// ── Render: Hands tab — quota + lock state ──────────────────────────────────

function renderHandsAvailability(quota) {
  const lockedBox = dialogEl.querySelector("[data-hands-locked]");
  const needsState = dialogEl.querySelector("[data-hands-needs-state]");
  const content = dialogEl.querySelector("[data-hands-content]");
  const badge = dialogEl.querySelector('[data-badge="hands"]');

  const tier = quota?.tier || "free";
  const isPaid = tier !== "free" && quota?.ok;
  const isSuper = !!quota?.superadmin;
  const hasReplay = !!ctx?.getReplayState;

  // Tier lock first (free user — no path to hands sharing).
  if (!isPaid && !isSuper) {
    lockedBox.hidden = false;
    needsState.hidden = true;
    content.hidden = true;
    badge.textContent = "🔒";
    return;
  }

  // Paid but didn't open from a replay modal → friendly nudge.
  if (!hasReplay) {
    lockedBox.hidden = true;
    needsState.hidden = false;
    content.hidden = true;
    badge.textContent = "";
    return;
  }

  // All good — show the full export controls.
  lockedBox.hidden = true;
  needsState.hidden = true;
  content.hidden = false;
  badge.textContent = "";
  renderHandsCurrentSettings(ctx.getReplayState());
  renderHandsQuota(quota);
}

function renderHandsCurrentSettings(state) {
  const speedChip = dialogEl.querySelector('[data-chip="speed"]');
  const unitChip = dialogEl.querySelector('[data-chip="unit"]');
  if (speedChip) speedChip.textContent = `Speed: ${state.speed}×`;
  if (unitChip) unitChip.textContent = `Unit: ${state.unit === "bb" ? "BB" : "$"}`;
}

function renderHandsQuota(quota) {
  const box = dialogEl.querySelector('[data-quota="hands"]');
  const value = box.querySelector(".replay-share-quota-value");
  if (!quota || !quota.ok) {
    value.textContent = "Sign in to share a video.";
    value.dataset.state = "spent";
    return;
  }
  if (isUnlimited(quota)) {
    value.textContent = "Unlimited";
    value.dataset.state = "ok";
  } else {
    value.textContent = `${quota.remaining} / ${quota.limit} left today`;
    value.dataset.state = quota.remaining > 0 ? "ok" : "spent";
  }
}

// ── Primary button enable logic ──────────────────────────────────────────────

function refreshGraphsPrimaryEnabled() {
  const primary = dialogEl.querySelector('[data-share-action="primary"]');
  if (activeTab !== "graphs") return;
  // Disabled when not signed in OR no graphs state OR result already shown.
  const hasState = !!ctx?.getGraphsState && !!ctx.getGraphsState();
  const resultShown = !dialogEl.querySelector('[data-result="graphs"]').hidden;
  primary.disabled = !hasState || resultShown || creatingGraph;
  primary.title = !hasState
    ? "Load a session first (Online Poker Records tab)."
    : "";
}

function refreshHandsPrimaryEnabled() {
  const primary = dialogEl.querySelector('[data-share-action="primary"]');
  if (activeTab !== "hands") return;
  const hasState = !!ctx?.getReplayState;
  const lockedHidden = dialogEl.querySelector("[data-hands-locked]").hidden;
  const needsHidden = dialogEl.querySelector("[data-hands-needs-state]").hidden;
  primary.disabled = !hasState || !lockedHidden || !needsHidden || exporting;
}

// ── Error / progress helpers ────────────────────────────────────────────────

function setError(tab, msg) {
  const box = dialogEl.querySelector(`[data-error="${tab}"]`);
  if (!box) return;
  if (!msg) { box.hidden = true; box.textContent = ""; return; }
  box.hidden = false;
  box.textContent = msg;
}

function clearError(tab) { setError(tab, ""); }

function setProgress(tab, visible, pct, label) {
  const wrap = dialogEl.querySelector(`[data-progress="${tab}"]`);
  if (!wrap) return;
  wrap.hidden = !visible;
  if (!visible) return;
  wrap.querySelector(".replay-share-progress-fill").style.width = `${Math.round((pct || 0) * 100)}%`;
  wrap.querySelector(".replay-share-progress-label").textContent = label || "";
}

// ── Graphs: create share ────────────────────────────────────────────────────

async function onCreateShare() {
  if (creatingGraph) return;
  clearError("graphs");

  const getState = ctx?.getGraphsState;
  const state = typeof getState === "function" ? getState() : null;
  if (!state || !state.summary) {
    setError("graphs", "No session loaded — upload or restore one first.");
    return;
  }

  const title = dialogEl.querySelector("#shareTitleInput").value.trim();
  const expireDaysEl = dialogEl.querySelector("#shareExpireSelect");
  const expireDays = expireDaysEl ? Number(expireDaysEl.value) : 7;
  const usePassword = dialogEl.querySelector("#sharePasswordToggle").checked;
  const password = usePassword ? dialogEl.querySelector("#sharePasswordInput").value : null;

  if (usePassword) {
    if (!password || password.length < 4) {
      setError("graphs", "Password must be at least 4 characters.");
      return;
    }
    if (password.length > 64) {
      setError("graphs", "Password must be 64 characters or fewer.");
      return;
    }
  }

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
    setError("graphs", `Could not prepare snapshot: ${err.message}`);
    return;
  }

  creatingGraph = true;
  refreshGraphsPrimaryEnabled();
  setProgress("graphs", true, 0.4, "Uploading snapshot…");

  let result;
  try {
    result = await createStatsShare(payload);
  } catch (err) {
    creatingGraph = false;
    setProgress("graphs", false, 0, "");
    refreshGraphsPrimaryEnabled();
    setError("graphs", explainCreateError(err));
    return;
  }

  creatingGraph = false;
  setProgress("graphs", false, 0, "");
  showShareResult(result);
  // Refresh the quota line so the user sees the new remaining count.
  // Re-using getShareQuota would only refresh VIDEO quota — for graphs we
  // already have the authoritative count in the response.
  if (Number.isFinite(result.quotaUsed) && result.quotaLimit) {
    renderGraphsQuota({ ok: true, tier: cachedQuota?.tier, superadmin: cachedQuota?.superadmin }, result.quotaUsed);
  }
}

function explainCreateError(err) {
  const m = /^poker-api-(\d+):\s*(.*)$/.exec(err?.message || "");
  if (!m) return "Network error — check your connection and try again.";
  const status = m[1];
  let body = {};
  try { body = JSON.parse(m[2]); } catch {}
  if (status === "401") return "Sign in to create a share link.";
  if (body.error === "quota_exceeded_graphs") return "You've used all your share-graphs slots this month. Upgrade for more.";
  if (body.error === "quota_exceeded_hands")  return "You've used all your share-hands slots this month.";
  if (body.error === "hands_share_requires_paid") return "Hands sharing is paid-only.";
  if (body.error === "password_requires_paid") return "Password protection is paid-only.";
  if (body.error === "forever_requires_paid") return "Forever expiry needs Ultra. Pick 7/30/90/365 days instead.";
  if (body.error === "expire_too_long")       return `Pick a shorter expiry — your plan caps at ${body.maxDays || 30} days.`;
  if (body.error === "invalid_password_length") return "Password must be 4–64 characters.";
  if (body.error?.startsWith?.("invalid_payload")) return "Snapshot data was invalid. Recompute your chart and try again.";
  return body.error || "Could not create share link. Try again.";
}

function showShareResult(res) {
  const result = dialogEl.querySelector('[data-result="graphs"]');
  result.hidden = false;
  result.querySelector("[data-result-url]").value = res.url;
  const meta = result.querySelector("[data-result-meta]");
  const parts = [];
  if (res.expiresAt) parts.push(`Expires ${new Date(res.expiresAt).toLocaleDateString()}`);
  else parts.push("No expiry");
  if (res.passwordProtected) parts.push("Password protected");
  if (typeof res.quotaUsed === "number" && res.quotaLimit) {
    parts.push(`${res.quotaUsed}/${res.quotaLimit} used this month`);
  }
  meta.textContent = parts.join(" · ");

  // Lock the form to make it clear the share is created. The Close button
  // is the way out; another share would re-open the dialog.
  dialogEl.querySelector("#shareTitleInput").disabled = true;
  const exp = dialogEl.querySelector("#shareExpireSelect");
  if (exp) exp.disabled = true;
  dialogEl.querySelector("#sharePasswordToggle").disabled = true;
  dialogEl.querySelector("#sharePasswordInput").disabled = true;

  refreshGraphsPrimaryEnabled();

  // Focus the URL so screen readers announce it.
  setTimeout(() => result.querySelector("[data-result-url]").select(), 80);
}

async function copyShareUrl() {
  const input = dialogEl.querySelector("[data-result-url]");
  const url = input?.value;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    const btn = dialogEl.querySelector('[data-share-action="copy-url"]');
    const orig = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = orig; }, 1200);
  } catch {
    // Fall back to selecting the input so the user can ⌘C.
    input.select();
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
  // Desktop fallback: copy to clipboard.
  copyShareUrl();
}

// ── Hands: video export (preserved from previous implementation) ─────────────

async function onExportVideo() {
  if (exporting) return;
  setError("hands", "");

  if (!pickSupportedMimeType()) {
    setError("hands", "This browser can't record video. Try the latest Chrome, Edge, Safari, or Firefox.");
    return;
  }

  const getState = ctx?.getReplayState;
  const state = typeof getState === "function" ? getState() : null;
  if (!state || !state.snapshots?.length) {
    setError("hands", "No replay loaded.");
    return;
  }
  const orient = dialogEl.querySelector(".replay-share-orient-btn.active")?.dataset.orient || "9:16";

  exporting = true;
  refreshHandsPrimaryEnabled();
  setProgress("hands", true, 0, "Reserving share slot…");

  let reservation;
  try {
    reservation = await recordVideoShare();
  } catch (err) {
    exporting = false;
    setProgress("hands", false, 0, "");
    refreshHandsPrimaryEnabled();
    if (err.message === "not-signed-in") {
      setError("hands", "Sign in to share a video.");
    } else {
      setError("hands", "Could not reserve a share slot. Check your connection and try again.");
    }
    return;
  }
  if (!reservation?.ok) {
    exporting = false;
    setProgress("hands", false, 0, "");
    refreshHandsPrimaryEnabled();
    if (reservation?.error === "quota-exceeded") {
      setError("hands", "You've used today's free share. Upgrade for unlimited.");
    } else {
      setError("hands", "Could not reserve a share slot. Try again.");
    }
    getShareQuota().then((q) => renderHandsQuota(q)).catch(() => {});
    return;
  }

  setProgress("hands", true, 0, "Rendering frames…");

  let result;
  try {
    result = await exportReplayVideo({
      snapshots: state.snapshots,
      extracted: state.extracted,
      durationFn: ctx.durationFn,
      orientation: orient,
      speed: state.speed,
      unit: state.unit,
      bbDollars: state.bbDollars,
      title: state.title || "Poker Hand Replay",
      onProgress: (p) => setProgress("hands", true, p, `Rendering frames… ${Math.round(p * 100)}%`),
    });
  } catch (err) {
    console.error("[share-dialog] export failed:", err);
    exporting = false;
    setProgress("hands", false, 0, "");
    refreshHandsPrimaryEnabled();
    setError("hands", "Video export failed. Try a different orientation or browser.");
    return;
  }

  setProgress("hands", true, 1, "Done. Opening share sheet…");

  const filename = `poker-replay-${Date.now()}.${result.extension}`;
  const file = new File([result.blob], filename, { type: result.mimeType });

  let shared = false;
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title: "Poker Hand Replay", text: "Watch this hand replay" });
      shared = true;
    } catch (err) {
      if (err && err.name !== "AbortError") console.warn("[share-dialog] navigator.share failed:", err);
    }
  }

  if (!shared) {
    const a = document.createElement("a");
    const url = URL.createObjectURL(result.blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  }

  exporting = false;
  setProgress("hands", false, 0, "");
  refreshHandsPrimaryEnabled();

  const refreshed = await getShareQuota();
  renderHandsQuota(refreshed);
}

// ── Public API ──────────────────────────────────────────────────────────────

let cachedQuota = null;

export function openShareDialog({ host, defaultTab, getReplayState, durationFn, getGraphsState } = {}) {
  ensureDialog();
  ctx = { host, getReplayState, durationFn, getGraphsState };

  // Reset all transient UI state from any previous open.
  exporting = false;
  creatingGraph = false;
  setError("graphs", "");
  setError("hands", "");
  setProgress("graphs", false, 0, "");
  setProgress("hands", false, 0, "");
  dialogEl.querySelector('[data-result="graphs"]').hidden = true;
  dialogEl.querySelector("#shareTitleInput").value = "";
  dialogEl.querySelector("#shareTitleInput").disabled = false;
  dialogEl.querySelector("#sharePasswordToggle").checked = false;
  dialogEl.querySelector("#sharePasswordToggle").disabled = false;
  const pwInput = dialogEl.querySelector("#sharePasswordInput");
  pwInput.value = "";
  pwInput.disabled = false;
  pwInput.hidden = true;
  dialogEl.querySelectorAll(".replay-share-orient-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.orient === "9:16");
    b.disabled = false;
  });

  // Default the title placeholder to the current session's hand count.
  const graphsState = typeof getGraphsState === "function" ? getGraphsState() : null;
  if (graphsState?.summary?.hands) {
    const n = Number(graphsState.summary.hands) || 0;
    dialogEl.querySelector("#shareTitleInput").placeholder =
      `${n.toLocaleString()} hands recorder`;
  }

  // Initial tab — caller's request, OR sensible default per available state.
  const wantsTab = defaultTab === "graphs" || defaultTab === "hands"
    ? defaultTab
    : (getReplayState ? "hands" : "graphs");
  switchTab(wantsTab);

  dialogEl.hidden = false;

  // Show loading placeholders, then fetch the quota+tier and re-render.
  const v = dialogEl.querySelector('[data-quota="graphs"] .replay-share-quota-value');
  v.textContent = "Loading…";
  renderExpireDropdown(null);
  renderPasswordRow(null);

  getShareQuota()
    .then((q) => {
      cachedQuota = q;
      renderGraphsQuota(q);
      renderExpireDropdown(q);
      renderPasswordRow(q);
      renderHandsAvailability(q);
      refreshGraphsPrimaryEnabled();
      refreshHandsPrimaryEnabled();
    })
    .catch(() => {
      cachedQuota = null;
      renderGraphsQuota(null);
      renderExpireDropdown(null);
      renderPasswordRow(null);
      renderHandsAvailability(null);
    });
}

export function closeShareDialog() {
  if (exporting || creatingGraph) return;
  if (dialogEl) dialogEl.hidden = true;
  ctx = null;
}
