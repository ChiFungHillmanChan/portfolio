// share-dialog.js — Sub-dialog inside the replay modal that gathers
// export options (orientation, speed, unit), checks the user's daily
// share quota, drives video-export.js, then hands the resulting blob to
// the Web Share API (or falls back to a direct download).
//
// Public API:
//   openShareDialog({ host, getState, durationFn })
//   closeShareDialog()
//
// `host` is the parent modal element; `getState()` returns the live
// replay state { snapshots, extracted, speed, unit, bbDollars, title }.
// `durationFn(event)` mirrors animated-replay.js's per-event duration so
// the exported video matches the live playback timing exactly.

import { getShareQuota, recordVideoShare, isUnlimited } from "../cloud/share-quota.js";
import { exportReplayVideo, listOrientations, pickSupportedMimeType } from "./video-export.js";

const DIALOG_ID = "replayShareDialog";

let dialogEl = null;
let ctx = null;          // { host, getState, durationFn }
let exporting = false;

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
        <h4 id="replayShareTitle">Share replay as video</h4>
        <button type="button" class="replay-share-close" data-share-action="close" aria-label="Close">×</button>
      </div>
      <div class="replay-share-body">
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
          The video uses your current speed and $/BB toggle. Change them in the
          main controls before exporting if you want the recording to differ.
        </p>
        <div class="replay-share-quota" data-quota>
          <span class="replay-share-quota-label">Daily share quota</span>
          <span class="replay-share-quota-value">Loading…</span>
        </div>
        <div class="replay-share-progress" hidden>
          <div class="replay-share-progress-bar"><div class="replay-share-progress-fill" style="width:0%"></div></div>
          <span class="replay-share-progress-label">Preparing…</span>
        </div>
        <div class="replay-share-error" data-error hidden></div>
      </div>
      <div class="replay-share-footer">
        <button type="button" class="replay-share-cancel" data-share-action="close">Cancel</button>
        <button type="button" class="replay-share-export" data-share-action="export" disabled>Export video</button>
      </div>
    </div>
  `;
  document.body.appendChild(dialogEl);

  // Populate orientation pills once.
  const orientWrap = dialogEl.querySelector(".replay-share-orient");
  for (const o of listOrientations()) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "replay-share-orient-btn";
    btn.dataset.orient = o.key;
    btn.textContent = o.label;
    if (o.key === "9:16") btn.classList.add("active"); // default to vertical
    orientWrap.appendChild(btn);
  }

  dialogEl.addEventListener("click", onDialogClick);
  document.addEventListener("keydown", onKeyDown);
  return dialogEl;
}

function onDialogClick(e) {
  const target = e.target;
  if (!(target instanceof Element)) return;
  if (exporting && target.closest('[data-share-action="close"]')) return; // can't bail mid-encode

  const closeTarget = target.closest('[data-share-action="close"]');
  if (closeTarget) { closeShareDialog(); return; }

  const exportBtn = target.closest('[data-share-action="export"]');
  if (exportBtn) { startExport(); return; }

  const orientBtn = target.closest(".replay-share-orient-btn");
  if (orientBtn && !exporting) {
    dialogEl.querySelectorAll(".replay-share-orient-btn").forEach((b) =>
      b.classList.toggle("active", b === orientBtn)
    );
  }
}

function onKeyDown(e) {
  if (!dialogEl || dialogEl.hidden) return;
  if (e.key === "Escape" && !exporting) {
    e.preventDefault();
    closeShareDialog();
  }
}

function setError(msg) {
  const box = dialogEl.querySelector("[data-error]");
  if (!box) return;
  if (!msg) { box.hidden = true; box.textContent = ""; return; }
  box.hidden = false;
  box.textContent = msg;
}

function renderQuota(quota) {
  const box = dialogEl.querySelector("[data-quota]");
  const value = box.querySelector(".replay-share-quota-value");
  const exportBtn = dialogEl.querySelector('[data-share-action="export"]');
  if (!quota || !quota.ok) {
    value.textContent = "Sign in to share.";
    exportBtn.disabled = true;
    return;
  }
  const unlimited = isUnlimited(quota);
  if (unlimited) {
    value.textContent = "Unlimited";
    value.dataset.state = "ok";
    exportBtn.disabled = false;
  } else {
    value.textContent = `${quota.remaining} / ${quota.limit} left today`;
    value.dataset.state = quota.remaining > 0 ? "ok" : "spent";
    exportBtn.disabled = quota.remaining <= 0;
  }
}

function renderCurrentSettings(state) {
  const speedChip = dialogEl.querySelector('[data-chip="speed"]');
  const unitChip = dialogEl.querySelector('[data-chip="unit"]');
  speedChip.textContent = `Speed: ${state.speed}×`;
  unitChip.textContent = `Unit: ${state.unit === "bb" ? "BB" : "$"}`;
}

function setProgress(visible, pct, label) {
  const wrap = dialogEl.querySelector(".replay-share-progress");
  wrap.hidden = !visible;
  if (!visible) return;
  wrap.querySelector(".replay-share-progress-fill").style.width = `${Math.round(pct * 100)}%`;
  wrap.querySelector(".replay-share-progress-label").textContent = label || "";
}

function setExporting(on) {
  exporting = on;
  dialogEl.querySelector('[data-share-action="export"]').disabled = on;
  dialogEl.querySelector(".replay-share-cancel").disabled = on;
  dialogEl.querySelector(".replay-share-close").disabled = on;
  dialogEl.querySelectorAll(".replay-share-orient-btn").forEach((b) => (b.disabled = on));
}

async function startExport() {
  if (exporting) return;
  setError("");

  if (!pickSupportedMimeType()) {
    setError("This browser can't record video. Try the latest Chrome, Edge, Safari, or Firefox.");
    return;
  }

  const orient = dialogEl.querySelector(".replay-share-orient-btn.active")?.dataset.orient || "9:16";
  const state = ctx.getState();
  if (!state || !state.snapshots?.length) {
    setError("No replay loaded.");
    return;
  }

  setExporting(true);
  setProgress(true, 0, "Reserving share slot…");

  // Reserve a slot up-front so we never encode then-fail at the network
  // edge. The transaction increments the daily counter; if encoding
  // somehow crashes after this point, the user loses 1 share for the
  // day — acceptable for v1 (paid tiers are unlimited anyway).
  let reservation;
  try {
    reservation = await recordVideoShare();
  } catch (err) {
    setExporting(false);
    setProgress(false, 0, "");
    if (err.message === "not-signed-in") {
      setError("Sign in to share a video.");
    } else {
      setError("Could not reserve a share slot. Check your connection and try again.");
    }
    return;
  }
  if (!reservation?.ok) {
    setExporting(false);
    setProgress(false, 0, "");
    if (reservation?.error === "quota-exceeded") {
      setError("You've used today's free share. Upgrade for unlimited.");
    } else {
      setError("Could not reserve a share slot. Try again.");
    }
    // Refresh quota display so the user sees 0 left
    getShareQuota().then(renderQuota).catch(() => {});
    return;
  }

  setProgress(true, 0, "Rendering frames…");

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
      onProgress: (p) => setProgress(true, p, `Rendering frames… ${Math.round(p * 100)}%`),
    });
  } catch (err) {
    console.error("[share-dialog] export failed:", err);
    setExporting(false);
    setProgress(false, 0, "");
    setError("Video export failed. Try a different orientation or browser.");
    return;
  }

  setProgress(true, 1, "Done. Opening share sheet…");

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
      await navigator.share({
        files: [file],
        title: "Poker Hand Replay",
        text: "Watch this hand replay",
      });
      shared = true;
    } catch (err) {
      // User cancelled the share sheet — not an error from our side.
      if (err && err.name !== "AbortError") {
        console.warn("[share-dialog] navigator.share failed:", err);
      }
    }
  }

  if (!shared) {
    // Fallback: trigger a regular download. Desktop browsers don't
    // surface the OS share sheet, so this is the right path there.
    const a = document.createElement("a");
    const url = URL.createObjectURL(result.blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  }

  setExporting(false);
  setProgress(false, 0, "");

  // Refresh quota so the user sees the new "remaining" number.
  const refreshed = await getShareQuota();
  renderQuota(refreshed);
}

// ── Public API ──────────────────────────────────────────────────────────────

export function openShareDialog({ host, getState, durationFn }) {
  ensureDialog();
  ctx = { host, getState, durationFn };

  setError("");
  setProgress(false, 0, "");
  renderCurrentSettings(getState());

  // Default to 9:16; reset any prior active state.
  dialogEl.querySelectorAll(".replay-share-orient-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.orient === "9:16");
    b.disabled = false;
  });

  // Show first, then fetch quota so the panel renders quickly.
  dialogEl.hidden = false;

  const value = dialogEl.querySelector(".replay-share-quota-value");
  value.textContent = "Loading…";
  delete value.dataset.state;
  dialogEl.querySelector('[data-share-action="export"]').disabled = true;

  getShareQuota()
    .then((q) => renderQuota(q))
    .catch(() => {
      value.textContent = "Sign in to share.";
      dialogEl.querySelector('[data-share-action="export"]').disabled = true;
    });
}

export function closeShareDialog() {
  if (exporting) return;
  if (dialogEl) dialogEl.hidden = true;
  ctx = null;
}
