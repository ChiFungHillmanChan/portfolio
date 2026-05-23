// video-export.js — Render the replay's SVG table into a video file
// (WebM on Chrome/Firefox, MP4 on Safari) using an off-screen canvas +
// MediaRecorder. All work happens client-side — no server cost.
//
// Public API:
//   exportReplayVideo({ snapshots, extracted, speed, unit, bbDollars,
//                       title, orientation, onProgress }) →
//      Promise<{ blob, mimeType, extension }>
//
// Pipeline (per snapshot):
//   1. Apply the snapshot to a hidden copy of the live table SVG.
//   2. Serialize the SVG (with inlined .poker-table CSS rules) → blob URL.
//   3. Load that blob as an <img>, drawImage() onto an off-screen canvas
//      at the target orientation (16:9 = 1920×1080, 9:16 = 1080×1920).
//   4. canvas.captureStream(30) is attached to a MediaRecorder; the stream
//      samples the canvas as we hold each frame for the user's chosen
//      per-event duration (matches the live playback at the same speed).
//
// The Image() loader uses the SVG in isolation — external stylesheets do
// NOT apply, so we walk document.styleSheets and inline every rule whose
// selector touches `.poker-table` (and a few descendants). We also force
// `transition: none` so per-snapshot updates render instantly instead of
// being smeared across the frame.

import { buildTable, renderSnapshot } from "./table-renderer.js";

const SOURCE_W = 720;
const SOURCE_H = 460;

const ORIENTATIONS = {
  "16:9": { width: 1920, height: 1080, label: "Landscape (16:9)" },
  "9:16": { width: 1080, height: 1920, label: "Portrait (9:16)"  },
};

// Cap individual-frame holds so a single deal/showdown can't blow past
// Instagram Reels' 90s cap or make the file huge. The live UI tops out
// around 1.2s per event; we mirror that.
const MAX_FRAME_DUR_MS = 1400;
const FINAL_HOLD_MS = 1500;     // Linger on the last frame so the result reads
const RECORDER_BITRATE = 5_000_000;
const CAPTURE_FPS = 30;

export function listOrientations() {
  return Object.entries(ORIENTATIONS).map(([key, v]) => ({
    key,
    label: v.label,
    width: v.width,
    height: v.height,
  }));
}

// Pick the best MIME type the browser advertises for MediaRecorder.
// Safari ships H.264 MP4; Chrome / Firefox ship VP9 / VP8 WebM. We try
// Safari's MP4 first so iOS users get an Instagram-uploadable file
// without a wasm transcode step. Returns null if MediaRecorder is
// entirely unsupported (then the caller falls back to the static export).
export function pickSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    'video/mp4;codecs="avc1.42E01E"',
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const m of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {}
  }
  return null;
}

function extensionFor(mimeType) {
  if (mimeType.includes("mp4")) return "mp4";
  return "webm";
}

// ── CSS inlining ────────────────────────────────────────────────────────────

// Walk every stylesheet on the page and pull out rules whose selector
// touches anything inside .poker-table. We can't include the whole
// document stylesheet because the SVG-loaded-as-image renders in an
// isolated tree that doesn't have body classes, our layout, etc.
function collectTableCss() {
  const buckets = [];
  const sheets = Array.from(document.styleSheets || []);
  for (const sheet of sheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      // Cross-origin stylesheet — we can't read its rules. The replay CSS
      // is same-origin so this isn't expected to bite in production.
      continue;
    }
    if (!rules) continue;
    for (const rule of rules) {
      if (!rule.cssText) continue;
      // Coarse match: any rule mentioning poker-table or our card / chip
      // class names. False positives are harmless (they target elements
      // that don't exist in the standalone SVG, so they no-op).
      if (
        rule.cssText.includes("poker-table") ||
        rule.cssText.includes(".suit-") ||
        rule.cssText.includes(".card-") ||
        rule.cssText.includes(".chip") ||
        rule.cssText.includes(".pot")
      ) {
        buckets.push(rule.cssText);
      }
    }
  }
  return buckets.join("\n");
}

function inlineSvgStyles(svg, cssText) {
  // Reset any existing <style> we previously injected.
  Array.from(svg.querySelectorAll("style[data-export-inlined]")).forEach((n) =>
    n.remove()
  );
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.setAttribute("data-export-inlined", "true");
  // Force-disable transitions so every frame snaps to its end-state.
  style.textContent =
    `* { transition: none !important; animation: none !important; }\n` + cssText;
  svg.insertBefore(style, svg.firstChild);
}

// ── SVG → Image → Canvas ────────────────────────────────────────────────────

function serializeSvg(svg) {
  // Ensure xmlns is present — required for the SVG to render via Image().
  const clone = svg.cloneNode(true);
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  if (!clone.getAttribute("xmlns:xlink")) {
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  }
  return new XMLSerializer().serializeToString(clone);
}

function svgToImage(svg) {
  const str = serializeSvg(svg);
  const blob = new Blob([str], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function paintBackground(ctx, w, h) {
  // Deep felt-green gradient that matches the modal backdrop. Subtle
  // enough not to fight the table render but darker than pure black so
  // letterbox bands feel intentional, not broken.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0c1a12");
  g.addColorStop(1, "#040907");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function paintHeader(ctx, { width, title, subtitle }) {
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  // Title — scales with width so the same code works at 1080 and 1920.
  const titleSize = Math.round(width * 0.034);
  ctx.font = `700 ${titleSize}px "Inter","Segoe UI",system-ui,sans-serif`;
  ctx.fillText(title, width / 2, Math.round(width * 0.025));
  if (subtitle) {
    const subSize = Math.round(width * 0.022);
    ctx.font = `500 ${subSize}px "Inter","Segoe UI",system-ui,sans-serif`;
    ctx.fillStyle = "rgba(180, 220, 195, 0.85)";
    ctx.fillText(
      subtitle,
      width / 2,
      Math.round(width * 0.025) + titleSize + 8
    );
  }
  ctx.restore();
}

function paintFooter(ctx, { width, height, speed, unit }) {
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const size = Math.round(width * 0.02);
  ctx.font = `500 ${size}px "Inter","Segoe UI",system-ui,sans-serif`;
  const speedLabel = `${speed}× speed`;
  const unitLabel = unit === "bb" ? "BB" : "$";
  ctx.fillText(
    `${speedLabel} • ${unitLabel} • hillmanchan.com`,
    width / 2,
    height - Math.round(width * 0.02)
  );
  ctx.restore();
}

// Compute the table's drawing rect inside the target canvas. Both
// orientations letterbox the source SVG (16:9 with side bars because the
// SVG is slightly taller than 16:9; 9:16 with big top/bottom bars). We
// leave reserve space for header + footer so they don't clip the table.
function computeTableRect(orientation) {
  const { width, height } = ORIENTATIONS[orientation];
  // Vertical reserve for header + footer (proportional to width so it
  // tracks the text sizes we paint).
  const headerReserve = Math.round(width * 0.12);
  const footerReserve = Math.round(width * 0.06);
  const availH = height - headerReserve - footerReserve;
  const availW = width - Math.round(width * 0.04); // small side padding

  const srcRatio = SOURCE_W / SOURCE_H;     // ≈ 1.565
  let dW = availW;
  let dH = dW / srcRatio;
  if (dH > availH) {
    dH = availH;
    dW = dH * srcRatio;
  }
  return {
    x: Math.round((width - dW) / 2),
    y: headerReserve + Math.round((availH - dH) / 2),
    w: Math.round(dW),
    h: Math.round(dH),
  };
}

// ── Frame loop ─────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Build a hidden off-screen container hosting its own copy of the table.
// We never disturb the live modal's SVG — closing the modal mid-export
// would otherwise tear the source out from under us.
function buildOffscreenTable(snap0) {
  const wrap = document.createElement("div");
  wrap.setAttribute("aria-hidden", "true");
  wrap.style.cssText = [
    "position:fixed",
    "left:-99999px",
    "top:0",
    `width:${SOURCE_W}px`,
    `height:${SOURCE_H}px`,
    "pointer-events:none",
    "opacity:0",
  ].join(";");
  document.body.appendChild(wrap);
  const refs = buildTable(wrap, snap0);
  const svg = wrap.querySelector("svg");
  return { wrap, refs, svg };
}

export async function exportReplayVideo({
  snapshots,
  extracted,
  durationFn,
  orientation = "9:16",
  speed = 2,
  unit = "dollars",
  bbDollars = 0,
  title,
  onProgress,
}) {
  if (!ORIENTATIONS[orientation]) {
    throw new Error(`unknown orientation: ${orientation}`);
  }
  const mimeType = pickSupportedMimeType();
  if (!mimeType) throw new Error("media-recorder-unsupported");
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    throw new Error("no snapshots");
  }

  const { width, height } = ORIENTATIONS[orientation];
  const tableRect = computeTableRect(orientation);

  // Build off-screen DOM
  const { wrap, refs, svg } = buildOffscreenTable(snapshots[0]);
  const cssText = collectTableCss();
  inlineSvgStyles(svg, cssText);

  // Canvas + recorder
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  paintBackground(ctx, width, height); // initial fill so frame 0 isn't black

  const stream = canvas.captureStream(CAPTURE_FPS);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: RECORDER_BITRATE,
  });
  const chunks = [];
  recorder.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);

  const subtitle = buildSubtitle(extracted);

  recorder.start(100);

  // Tiny opening hold so the very first state reads before the first action.
  await drawFrame({
    ctx, svg, refs, snap: snapshots[0], width, height, tableRect,
    title, subtitle, speed, unit, bbDollars,
  });
  await sleep(700);

  // Walk snapshots. Snapshot[i] is the table state AFTER event i-1 (so
  // snapshot[0] is the pre-deal state). Frame duration is derived from
  // the event the snapshot represents (i.e. event index = i - 1).
  for (let i = 0; i < snapshots.length; i++) {
    await drawFrame({
      ctx, svg, refs, snap: snapshots[i], width, height, tableRect,
      title, subtitle, speed, unit, bbDollars,
    });

    // Event leading INTO this snapshot determines the hold duration.
    // (Snapshot 0 has no preceding event — we already held 700ms above.)
    if (i > 0) {
      const ev = extracted.events[i - 1];
      const raw = ev && durationFn ? durationFn(ev) : 700;
      const dur = Math.min(MAX_FRAME_DUR_MS, raw / Math.max(1, speed));
      await sleep(Math.max(60, dur));
    }
    if (onProgress) {
      try { onProgress(i / Math.max(1, snapshots.length - 1)); } catch {}
    }
  }

  // Final hold so the showdown / collect frame is readable in still
  // previews on WhatsApp / IG.
  await sleep(FINAL_HOLD_MS);

  recorder.stop();
  await new Promise((resolve) => {
    recorder.onstop = () => resolve();
  });

  // Cleanup
  try { document.body.removeChild(wrap); } catch {}

  const blob = new Blob(chunks, { type: mimeType });
  return {
    blob,
    mimeType,
    extension: extensionFor(mimeType),
  };
}

function buildSubtitle(extracted) {
  if (!extracted?.meta) return "";
  const game = extracted.meta.gameType || "Hold'em";
  const sb = extracted.meta.stake?.sb;
  const bb = extracted.meta.stake?.bb;
  if (typeof sb === "number" && typeof bb === "number") {
    return `${game} • $${sb.toFixed(2)} / $${bb.toFixed(2)}`;
  }
  return game;
}

async function drawFrame({
  ctx, svg, refs, snap, width, height, tableRect,
  title, subtitle, speed, unit, bbDollars,
}) {
  // Apply snapshot to the hidden SVG, then rasterize.
  renderSnapshot(refs, snap, { instant: true, unit, bbDollars });
  // One animation frame so any DOM updates land before serialization.
  await new Promise((r) => requestAnimationFrame(r));
  const img = await svgToImage(svg);

  paintBackground(ctx, width, height);
  paintHeader(ctx, { width, title, subtitle });
  ctx.drawImage(img, tableRect.x, tableRect.y, tableRect.w, tableRect.h);
  paintFooter(ctx, { width, height, speed, unit });
}
