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
//
// Replay hydration (downloading hands.txt.gz so the per-hand replay browser
// works) is a SEPARATE opt-in step. The fast-path open returns once the chart
// is rendered; callers fire the `poker:cloud-session-opened` event listener in
// the UI layer (inline-restore.js) and the user clicks "Load replay data" if
// they want it. This avoids paying the multi-MB hands.txt.gz GET on every
// open — material when sessions are 20K+ hands.

import { apiCall } from "../auth/api-client.js";
import { COMPUTE_FINGERPRINT } from "../stats/compute.mjs";
import { showProgress, hideProgress } from "../progress-bar.js";
import { getCurrentSession } from "./session-state.js";

export const CLOUD_SESSION_OPENED_EVENT = "poker:cloud-session-opened";

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw new DOMException("aborted", "AbortError");
  }
}

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

async function fetchAndUngzipText(url, { signal } = {}) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const ds = new DecompressionStream("gzip");
  // The piped stream inherits cancellation: aborting `signal` rejects the
  // underlying fetch which propagates through DecompressionStream.
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

async function loadFromSeries(sessionMeta, { signal } = {}) {
  // 1. Ask the Lambda for a presigned GET on series.json.gz.
  throwIfAborted(signal);
  const sign = await apiCall("sign-download", { sessionId: sessionMeta.sessionId, file: "series" });
  if (!sign.ok) {
    // Either an older session (no series stored) or backend hasn't shipped
    // the "series" file kind yet. Caller falls back to recompute.
    throw new Error(sign.error || "sign-download-series-failed");
  }

  // 2. Download + ungzip + parse.
  throwIfAborted(signal);
  const text = await fetchAndUngzipText(sign.url, { signal });
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

/**
 * Pull hands.txt.gz for an already-chart-opened session, parse every hand
 * (skipping unparseable ones tolerantly), and hand them off to upload.js's
 * `hydrateHandsForReplay` so the hand browser + replay modal become available.
 *
 * Cancellable: pass an AbortSignal in `opts.signal` and the in-flight network
 * fetch / parse loop bails out cleanly. Aborts surface as DOMException
 * (`name: 'AbortError'`) so the UI layer can distinguish "user cancelled"
 * from "real failure".
 *
 * Guarded by sessionId — the matching guard inside `hydrateHandsForReplay`
 * drops the result if the user has since opened a different session, so
 * racing two Opens never crosses replay data.
 */
export async function hydrateReplayForSession(sessionMeta, { signal } = {}) {
  throwIfAborted(signal);
  const sign = await apiCall("sign-download", { sessionId: sessionMeta.sessionId, file: "hands" });
  if (!sign.ok) {
    // Old sessions saved before hands.txt.gz became mandatory, or backend
    // hiccup — surface to caller so the UI can show a clear message.
    throw new Error(sign.error || "no hands.txt.gz stored for this session");
  }

  throwIfAborted(signal);
  const text = await fetchAndUngzipText(sign.url, { signal });
  throwIfAborted(signal);
  const splits = splitConcatenatedFiles(text);
  if (splits.length === 0) return { handCount: 0 };

  // Seed `allFiles` BEFORE parsing so that even if the user starts adding new
  // local files in parallel with this background fetch, a subsequent "Save to
  // cloud" includes the cloud-side files in the new snapshot. Stable
  // lastModified (= session createdAt) makes the fileKey deterministic so
  // re-opening the same session won't double-count its own files.
  const { seedFilesForCachedSession, hydrateHandsForReplay } = await import("../upload.js");
  seedFilesForCachedSession(splits, Number(sessionMeta.createdAt) || 0);

  const { parseHand, splitIntoHands } = await import("../parser/gg-parser.mjs");
  const hands = [];
  let parseLoopCounter = 0;
  for (const split of splits) {
    const chunks = splitIntoHands(split.text);
    for (const chunk of chunks) {
      try {
        const hand = parseHand(chunk);
        hand.text = chunk;
        hand.fileName = split.name;
        hands.push(hand);
      } catch (_) {
        // Skip unparseable hands — same tolerant behaviour as upload.js.
      }
      // Yield + abort-check every ~500 hands so cancellation feels instant
      // even on 30K-hand sessions where parsing dominates the runtime.
      if (++parseLoopCounter % 500 === 0) {
        throwIfAborted(signal);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  }
  if (hands.length === 0) return { handCount: 0 };

  // Mirror upload.js's chronological sort so hand-browser ordering matches a
  // fresh local upload of the same files.
  hands.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.id.localeCompare(b.id);
  });

  throwIfAborted(signal);
  // hydrateHandsForReplay dedupes by hand.id — the cloud hands.txt.gz often
  // contains the same hand across multiple files (GG splits sessions when
  // tables/buy-ins change). Return the post-dedup count so the cloud-restore
  // status banner matches the number of hands actually rendered in the chart.
  const dedupedCount = await hydrateHandsForReplay(hands, { sessionId: sessionMeta.sessionId });
  return { handCount: dedupedCount || hands.length };
}

async function recomputeFromHands(sessionMeta, onStatus, { signal } = {}) {
  onStatus?.("Series cache unavailable — downloading hands.txt for recompute…");
  throwIfAborted(signal);
  const sign = await apiCall("sign-download", { sessionId: sessionMeta.sessionId, file: "hands" });
  if (!sign.ok) throw new Error(sign.error || "sign-download-hands-failed");
  throwIfAborted(signal);
  const text = await fetchAndUngzipText(sign.url, { signal });
  throwIfAborted(signal);
  const splits = splitConcatenatedFiles(text);
  if (splits.length === 0) throw new Error("session had no files");

  // Reconstruct File objects so upload.js#handleFiles handles them through
  // its normal parse + compute + render pipeline. Use the session createdAt
  // as a stable File.lastModified so re-opening this same session won't
  // double-count its own files against the name|size|lastModified dedup.
  const stableMs = Number(sessionMeta.createdAt) || 0;
  const files = splits.map((s) => new File([s.text], s.name, {
    type: "text/plain",
    lastModified: stableMs,
  }));
  const { handleFiles, setSourceCloudSessionId } = await import("../upload.js");
  onStatus?.(`Recomputing chart from ${splits.length} file${splits.length === 1 ? "" : "s"}…`);
  await handleFiles(files);

  // Mark the current view as having come from this cloud session so the next
  // "Save to cloud" merges back into the same session record (replaces it
  // server-side) instead of creating a duplicate. The fast path sets this in
  // loadCachedSession; the slow path used to leave sourceCloudSessionId
  // dangling, which caused duplicate sessions to accumulate when a user
  // recomputed + uploaded more files on top of an existing session.
  if (typeof setSourceCloudSessionId === "function") {
    setSourceCloudSessionId(sessionMeta.sessionId);
  }

  // Auto-refresh the cloud cache: silently write the freshly-computed
  // series.json.gz back to this same session so the next open takes the
  // fast path. Fire-and-forget — if the refresh fails (network, auth
  // expired, backend hasn't shipped the action yet) the chart already
  // rendered correctly and the user sees a recompute again next time,
  // exactly as today. We don't surface errors to the user.
  //
  // upload.js's notifyCloudSessionLoaded() lazily dynamic-imports
  // session-state.js, so `setCurrentSession` may not have run yet by
  // the time handleFiles resolves. Poll briefly until the series data
  // shows up (or bail after ~500ms).
  let session = null;
  for (let i = 0; i < 25; i++) {
    session = getCurrentSession();
    if (session?.seriesBefore && session?.seriesAfter) break;
    await new Promise((r) => setTimeout(r, 20));
  }
  if (session?.seriesBefore && session?.seriesAfter) {
    import("./upload.js")
      .then(({ refreshSeriesForExistingSession }) => {
        if (typeof refreshSeriesForExistingSession !== "function") return null;
        return refreshSeriesForExistingSession({
          sessionId: sessionMeta.sessionId,
          seriesBefore: session.seriesBefore,
          seriesAfter: session.seriesAfter,
          summary: session.summary,
        });
      })
      .then((r) => {
        if (r) console.log(`[poker cloud] series cache refreshed for ${sessionMeta.sessionId.slice(-8)} (${(r.bytesCompressed / 1024).toFixed(1)} KB)`);
      })
      .catch((err) => console.warn("[poker cloud] series cache auto-refresh failed:", err.message));
  }
}

/**
 * Open a saved cloud session and render its chart.
 *
 * Does NOT download per-hand data for the replay browser — that's a separate
 * opt-in step via `hydrateReplayForSession`. After the chart renders, this
 * function dispatches the `poker:cloud-session-opened` window event with
 * `{ sessionMeta, handCount, replayPending, bytesCompressed }` in `event.detail`
 * so the UI layer can render a "Load replay data" affordance.
 *
 * `replayPending` is `true` for the fast (cached) path — replay data hasn't
 * been downloaded yet. It's `false` for the slow recompute path — that path
 * already pulled hands.txt.gz to recompute the chart, so the replay browser
 * is populated as a side-effect of upload.js#handleFiles.
 *
 * @param {Object} session  Row from list-sessions: { sessionId, fileNames, handCount, bytesCompressed, createdAt, ... }
 * @param {Object} [opts]
 * @param {AbortSignal} [opts.signal]  Cancels in-flight Lambda/R2 fetches. Throws DOMException(name='AbortError').
 * @param {Function}    [opts.onStatus]  (msg: string) => void, for status banner updates
 */
export async function openCloudSession(session, opts = {}) {
  const { signal } = opts;
  const onStatus = opts.onStatus || (() => {});
  const sessionMeta = {
    sessionId: session.sessionId,
    createdAt: session.createdAt,
    fileNames: session.fileNames || [],
  };

  // Fast path. If anything goes wrong (no series object, fingerprint
  // mismatch, network glitch on the series GET) we drop through to the
  // recompute fallback rather than failing the open. We do NOT swallow
  // AbortError here — that's the user cancelling, not a missing series.
  let cached = null;
  try {
    onStatus("Loading cached chart…");
    showProgress({ stage: "Loading cached chart", current: 1, total: 2 });
    cached = await loadFromSeries(sessionMeta, { signal });
  } catch (err) {
    if (err?.name === "AbortError") {
      hideProgress();
      throw err;
    }
    console.warn("[poker cloud] series fast-path failed, will recompute:", err.message);
  } finally {
    hideProgress();
  }

  if (cached) {
    throwIfAborted(signal);
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

    dispatchOpenedEvent({
      sessionMeta,
      handCount: session.handCount || 0,
      bytesCompressed: session.bytesCompressed || 0,
      replayPending: true,
    });
    return { mode: "cached", sessionMeta, replayPending: true };
  }

  // Slow path: pull raw hands and re-run parse + compute. Replay data ends up
  // populated as a side effect of handleFiles, so no separate hydration step.
  await recomputeFromHands(sessionMeta, onStatus, { signal });
  onStatus(`Recomputed session ${sessionMeta.sessionId.slice(-8)}`);

  dispatchOpenedEvent({
    sessionMeta,
    handCount: session.handCount || 0,
    bytesCompressed: session.bytesCompressed || 0,
    replayPending: false,
  });
  return { mode: "recomputed", sessionMeta, replayPending: false };
}

function dispatchOpenedEvent(detail) {
  try {
    window.dispatchEvent(new CustomEvent(CLOUD_SESSION_OPENED_EVENT, { detail }));
  } catch (err) {
    // Headless test environments may not have CustomEvent; non-fatal.
    console.warn("[poker cloud] dispatchOpenedEvent failed:", err.message);
  }
}
