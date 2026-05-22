// load-session.js — opens a saved cloud session and re-renders the chart.
//
// Fast path: download series.json.gz, JSON.parse, rehydrate BigInts, hand off
// to upload.js#loadCachedSession. No parse, no equity, no compute. Sub-second
// even on 20K-hand sessions.
//
// Slow fallback (fingerprint mismatch, missing series object, or HTTP 4xx for
// the series file): download hands.txt.gz, ungzip, split into the original
// per-file blobs, construct File objects, and feed them to upload.js#handleFiles
// — same path as a fresh local upload, just with the files pre-fetched.

import { apiCall } from "../auth/api-client.js";
import { COMPUTE_FINGERPRINT } from "../stats/compute.mjs";
import { showProgress, hideProgress } from "../progress-bar.js";

// Per-key signal that this string value should be rehydrated to BigInt. The
// JSON shape mirrors stats/compute.mjs's summary + the gzipped series — both
// flatten BigInt to decimal strings via sanitizeForJson in cloud/upload.js.
// We rehydrate by walking the tree and casting any *UC-keyed numeric string
// (and any array of all-numeric-strings — that's a series).
const NUMERIC_STR = /^-?\d+$/;

function rehydrateBigInts(node) {
  if (Array.isArray(node)) {
    if (node.length > 0 && node.every((v) => typeof v === "string" && NUMERIC_STR.test(v))) {
      return node.map((s) => BigInt(s));
    }
    return node.map(rehydrateBigInts);
  }
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string" && k.endsWith("UC") && NUMERIC_STR.test(v)) {
        out[k] = BigInt(v);
      } else {
        out[k] = rehydrateBigInts(v);
      }
    }
    return out;
  }
  return node;
}

async function fetchAndUngzipText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const ds = new DecompressionStream("gzip");
  return new Response(res.body.pipeThrough(ds)).text();
}

// Reverse of cloud/upload.js#buildHandsBlob — splits the concatenated
// .txt body back into the original named files.
const FILE_SENTINEL_RE = /\n=== FILE: ([^=]+) ===\n/g;
function splitConcatenatedFiles(text) {
  const matches = [...text.matchAll(FILE_SENTINEL_RE)];
  if (matches.length === 0) return [{ name: "session.txt", text }];
  const files = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    files.push({ name: matches[i][1].trim(), text: text.slice(start, end) });
  }
  return files;
}

async function loadFromSeries(sessionMeta) {
  // 1. Ask the Lambda for a presigned GET on series.json.gz.
  const sign = await apiCall("sign-download", { sessionId: sessionMeta.sessionId, file: "series" });
  if (!sign.ok) {
    // Either an older session (no series stored) or backend hasn't shipped
    // the "series" file kind yet. Caller falls back to recompute.
    throw new Error(sign.error || "sign-download-series-failed");
  }

  // 2. Download + ungzip + parse.
  const text = await fetchAndUngzipText(sign.url);
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (err) {
    throw new Error(`series payload invalid JSON: ${err.message}`);
  }

  // 3. Fingerprint check. Newer compute algorithms invalidate the cache;
  // returning null tells the caller to take the recompute fallback rather
  // than rendering numbers from an obsolete formula.
  if (!payload.computeFingerprint) {
    console.warn("[poker cloud] cached series has no fingerprint — treating as stale");
    return null;
  }
  if (payload.computeFingerprint !== COMPUTE_FINGERPRINT) {
    console.warn(
      `[poker cloud] cached series fingerprint mismatch (${payload.computeFingerprint} → ${COMPUTE_FINGERPRINT}); recomputing.`
    );
    return null;
  }

  // 4. Rehydrate BigInts. Both `summary` and the two series live under the
  // top level; the helper recurses to nested *UC keys (e.g. byPosition.X.totalUC).
  const summary = rehydrateBigInts(payload.summary);
  const seriesBefore = rehydrateBigInts(payload.seriesBefore);
  const seriesAfter = rehydrateBigInts(payload.seriesAfter);

  if (!seriesBefore.winningsUC || !Array.isArray(seriesBefore.winningsUC)) {
    throw new Error("series payload missing winningsUC array");
  }

  return { summary, seriesBefore, seriesAfter };
}

async function recomputeFromHands(sessionMeta, onStatus) {
  onStatus?.("Series cache unavailable — downloading hands.txt for recompute…");
  const sign = await apiCall("sign-download", { sessionId: sessionMeta.sessionId, file: "hands" });
  if (!sign.ok) throw new Error(sign.error || "sign-download-hands-failed");
  const text = await fetchAndUngzipText(sign.url);
  const splits = splitConcatenatedFiles(text);
  if (splits.length === 0) throw new Error("session had no files");

  // Reconstruct File objects so upload.js#handleFiles handles them through
  // its normal parse + compute + render pipeline.
  const files = splits.map((s) => new File([s.text], s.name, { type: "text/plain" }));
  const { handleFiles } = await import("../upload.js");
  onStatus?.(`Recomputing chart from ${splits.length} file${splits.length === 1 ? "" : "s"}…`);
  await handleFiles(files);
}

/**
 * Open a saved cloud session and render its chart.
 *
 * @param {Object} session  Row from list-sessions: { sessionId, fileNames, handCount, createdAt, ... }
 * @param {Object} [opts]
 * @param {Function} [opts.onStatus]  (msg: string) => void, for status banner updates
 */
export async function openCloudSession(session, opts = {}) {
  const onStatus = opts.onStatus || (() => {});
  const sessionMeta = {
    sessionId: session.sessionId,
    createdAt: session.createdAt,
    fileNames: session.fileNames || [],
  };

  // Fast path. If anything goes wrong (no series object, fingerprint
  // mismatch, network glitch on the series GET) we drop through to the
  // recompute fallback rather than failing the open.
  let cached = null;
  try {
    onStatus("Loading cached chart…");
    showProgress({ stage: "Loading cached chart", current: 1, total: 2 });
    cached = await loadFromSeries(sessionMeta);
  } catch (err) {
    console.warn("[poker cloud] series fast-path failed, will recompute:", err.message);
  } finally {
    hideProgress();
  }

  if (cached) {
    const { loadCachedSession } = await import("../upload.js");
    await loadCachedSession({
      summary: cached.summary,
      seriesBefore: cached.seriesBefore,
      seriesAfter: cached.seriesAfter,
      handCount: session.handCount || 0,
      sessionMeta,
    });
    // onStatus is a console-log sink in current callers; keep text plain.
    onStatus(`Opened session ${sessionMeta.sessionId.slice(-8)} (${(session.handCount || 0).toLocaleString()} hands)`);
    return { mode: "cached" };
  }

  // Slow path: pull raw hands and re-run parse + compute.
  await recomputeFromHands(sessionMeta, onStatus);
  onStatus(`Recomputed session ${sessionMeta.sessionId.slice(-8)}`);
  return { mode: "recomputed" };
}
