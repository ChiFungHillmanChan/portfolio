// auto-merge.js — when the user clicks "Save to cloud" on a session that has
// no linked cloud sourceSessionId, transparently combine the in-memory hands
// with ALL the user's prior cloud sessions before saving. End result: one
// growing cloud snapshot instead of an accumulating pile of small sessions.
//
// Why this lives in its own module:
//   bootstrap.js's save handler is already long; this lets it stay focused on
//   upload orchestration. The merge is also expensive (downloads + parses +
//   recomputes the series for the combined set), so isolating it makes the
//   cost obvious to anyone reading the save flow.
//
// Behavior contract:
//   - Returns null when no merge applies (already linked OR no prior cloud
//     sessions exist). Caller proceeds with the unmerged session as-is.
//   - On success returns a session-shaped object the caller passes straight
//     to saveSessionToCloud. `sourceSessionId` is set to the most recent
//     merged-from session (back-compat), and `mergedFromSessionIds` is the
//     full list of merged-from session ids so the caller can delete every
//     superseded snapshot after the new combined one commits.
//   - Aborts cleanly: pass an AbortSignal and every fetch + parse-loop yields
//     bail with DOMException(name='AbortError').
//
// Cost shape (typical N prior sessions + new local upload):
//   - 1 list-sessions Lambda call (cheap)
//   - N sign-download Lambda calls + N R2 GETs of each hands.txt.gz
//     (capped at 4 in-flight to avoid R2 throttling)
//   - Parse all merged files
//   - Recompute series ONCE on the full combined set
//
// Failure modes (per spec):
//   - If ANY R2 download fails → abort the multi-merge, fall back to a
//     single-session merge with just the latest prior session. The user's
//     local upload is never lost.
//   - If signal.aborted during downloads → throw AbortError; all in-flight
//     fetches are passed the same signal so they cancel together.

import { apiCall } from "../auth/api-client.js";

const FILE_SENTINEL_RE = /\n=== FILE: ([^=]+) ===\n/g;
const PARSE_YIELD_EVERY = 500;
const COMPUTE_YIELD_EVERY = 250;
const DOWNLOAD_CONCURRENCY = 4;

function throwIfAborted(signal) {
  if (signal?.aborted) throw new DOMException("aborted", "AbortError");
}

async function fetchAndUngzipText(url, { signal } = {}) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`merge download HTTP ${res.status}`);
  const ds = new DecompressionStream("gzip");
  return new Response(res.body.pipeThrough(ds)).text();
}

function splitConcatenatedFiles(text) {
  const matches = [...text.matchAll(FILE_SENTINEL_RE)];
  if (matches.length === 0) return [{ name: "session.txt", text }];
  const out = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    out.push({ name: matches[i][1].trim(), text: text.slice(start, end) });
  }
  return out;
}

/**
 * Run an async worker over `items` with at most `limit` in-flight at once.
 * Results array preserves input order. Throws on the first rejection (after
 * the in-flight set drains; subsequent items are not started).
 */
async function parallelLimit(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let failed = null;

  async function runOne() {
    while (failed === null) {
      const i = nextIndex++;
      if (i >= items.length) return;
      try {
        results[i] = await worker(items[i], i);
      } catch (err) {
        if (failed === null) failed = err;
        return;
      }
    }
  }

  const workers = [];
  const workerCount = Math.min(limit, items.length);
  for (let i = 0; i < workerCount; i++) workers.push(runOne());
  await Promise.all(workers);
  if (failed) throw failed;
  return results;
}

/**
 * Download + ungzip + split the hands.txt.gz file for one cloud session.
 * Returns the list of {name, text} file splits stored inside it.
 *
 * Per-session failure raises — the caller is responsible for deciding whether
 * to abort the whole multi-merge or fall back.
 */
async function downloadSessionSplits(sessionMeta, { signal }) {
  throwIfAborted(signal);
  const sign = await apiCall("sign-download", {
    sessionId: sessionMeta.sessionId,
    file: "hands",
  });
  if (!sign?.ok) {
    throw new Error(sign?.error || "sign-download failed");
  }
  throwIfAborted(signal);
  const text = await fetchAndUngzipText(sign.url, { signal });
  throwIfAborted(signal);
  return splitConcatenatedFiles(text);
}

/**
 * Core merge pipeline shared by `mergeWithLatestIfNeeded` (which folds an
 * in-memory upload into all prior cloud sessions) and `consolidateAllSessions`
 * (which merges all prior cloud sessions together with no local upload).
 *
 * Inputs:
 *   priorSessions     — sorted oldest → newest list of cloud session metas to merge.
 *   localSession      — optional, the in-memory session-state shape; null when
 *                       there's no local upload (consolidate-only path).
 *
 * Returns the same shape both callers expose to bootstrap.js / list.js.
 */
async function runMergePipeline({ priorSessions, localSession, signal, onStatus, onProgress }) {
  if (!priorSessions.length && !localSession) return null;

  const totalPriorHands = priorSessions.reduce((sum, s) => sum + (s.handCount || 0), 0);
  onStatus?.(
    priorSessions.length > 1
      ? `Merging ${priorSessions.length} prior cloud sessions (${totalPriorHands.toLocaleString()} hands)…`
      : `Merging with previous cloud session (${totalPriorHands.toLocaleString()} hands)…`
  );

  // Download all prior sessions' hands.txt.gz with bounded concurrency. Any
  // failure rejects — the caller decides whether to fall back.
  onProgress?.({ stage: "downloading-previous", progress: 0.05 });
  let completed = 0;
  const splitsBySession = await parallelLimit(
    priorSessions,
    DOWNLOAD_CONCURRENCY,
    async (meta) => {
      const splits = await downloadSessionSplits(meta, { signal });
      completed += 1;
      // Map [0..N] downloads into the 5-20% slot of the overall progress.
      const ratio = completed / priorSessions.length;
      onProgress?.({ stage: "downloading-previous", progress: 0.05 + 0.15 * ratio });
      return splits;
    }
  );

  throwIfAborted(signal);

  // Build the merged file list. Local files win the filename dedup so the
  // user's freshly-uploaded copy supersedes any same-named copy stored in a
  // prior cloud session. When there's no local session, no dedup needed.
  const currentNamesLower = new Set(
    (localSession?.files || []).map((f) => (f.file?.name || f.name || "").toLowerCase())
  );
  const seenNamesLower = new Set(currentNamesLower);
  const mergedFiles = [];
  for (let i = 0; i < priorSessions.length; i++) {
    const sessionMeta = priorSessions[i];
    const splits = splitsBySession[i] || [];
    const stableMs = Number(sessionMeta.createdAt) || 0;
    for (const split of splits) {
      const nameLower = split.name.toLowerCase();
      // Cross-session dedup: if two prior cloud sessions both contain a file
      // with the same name, the later (newer) one wins. We iterate oldest →
      // newest so check-and-record this set as we go.
      if (currentNamesLower.has(nameLower)) continue;
      if (seenNamesLower.has(nameLower)) {
        // Replace the earlier instance — find and remove it, then append the
        // newer one below.
        const existingIdx = mergedFiles.findIndex(
          (f) => (f.file?.name || f.name || "").toLowerCase() === nameLower
        );
        if (existingIdx >= 0) mergedFiles.splice(existingIdx, 1);
      }
      seenNamesLower.add(nameLower);
      const file = new File([split.text], split.name, {
        type: "text/plain",
        lastModified: stableMs,
      });
      mergedFiles.push({ file, text: split.text });
    }
  }
  // Append the user's freshly-uploaded local files last so the hand-level
  // dedup pass picks them as the canonical copy for any colliding ids.
  for (const f of localSession?.files || []) mergedFiles.push(f);

  // Parse every hand in the combined file set. We re-parse the prior cloud
  // hands (vs. carrying parsed objects across) so id/date/text shapes match
  // the current parser exactly — avoids subtle drift after parser updates.
  onStatus?.("Parsing combined hand history…");
  onProgress?.({ stage: "merging-parse", progress: 0.25 });
  const { parseHand, splitIntoHands } = await import("../parser/gg-parser.mjs");
  const allHands = [];
  let parseCounter = 0;
  for (const f of mergedFiles) {
    const chunks = splitIntoHands(f.text);
    for (const chunk of chunks) {
      try {
        const hand = parseHand(chunk);
        hand.text = chunk;
        hand.fileName = f.file?.name || f.name || "";
        allHands.push(hand);
      } catch (_) {
        // Same tolerant behaviour as upload.js — skip unparseable chunks.
      }
      if (++parseCounter % PARSE_YIELD_EVERY === 0) {
        throwIfAborted(signal);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  }

  // Hand-level dedup safety net. If a hand somehow appears in multiple
  // sources (e.g. user re-imported a file under a different name, or two
  // prior sessions overlap), the later copy wins — we iterate in source
  // order so the later .set() overwrites.
  const byId = new Map();
  for (const h of allHands) {
    if (!h?.id) continue;
    byId.set(h.id, h);
  }
  const dedupedHands = Array.from(byId.values());
  dedupedHands.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.id.localeCompare(b.id);
  });

  if (dedupedHands.length === 0) {
    // All sources unparseable AND no local hands. Caller will fall back to a
    // non-merged save so the user's data (if any) still gets uploaded.
    return null;
  }

  onStatus?.(`Recomputing chart on ${dedupedHands.length.toLocaleString()} combined hands…`);
  onProgress?.({ stage: "merging-compute", progress: 0.45 });

  throwIfAborted(signal);
  const { computeSeries } = await import("../stats/compute.mjs");
  const { seriesBefore, seriesAfter, summary } = await computeSeries(
    dedupedHands,
    { beforeRake: false },
    {
      yieldEvery: COMPUTE_YIELD_EVERY,
      onProgress: (p) => {
        if (signal?.aborted) return;
        // computeSeries reports 0..1 — map into the merge phase's slot of the
        // overall save progress bar (45% → 70%).
        onProgress?.({ stage: "merging-compute", progress: 0.45 + 0.25 * p });
      },
    }
  );

  // Source ids in oldest-first order; the back-compat single id points at the
  // newest (last) one so any existing "replaced previous version (xxxx)" UI
  // surfaces a sensible value.
  const mergedFromSessionIds = priorSessions.map((s) => s.sessionId);
  const newestSessionId = mergedFromSessionIds[mergedFromSessionIds.length - 1] || null;

  return {
    hands: dedupedHands,
    files: mergedFiles,
    summary,
    seriesBefore,
    seriesAfter,
    sourceSessionId: newestSessionId,
    mergedFromHandCount: totalPriorHands,
    mergedFromSessionId: newestSessionId, // back-compat alias
    mergedFromSessionIds,
  };
}

/**
 * If the in-memory session is not already linked to a cloud session AND the
 * user has at least one cloud session saved, combine the local upload with
 * ALL prior cloud sessions and return the merged result. Otherwise returns
 * null and the caller proceeds with the unmerged session.
 *
 * @param {Object} session  Output of session-state.getCurrentSession() —
 *                          { hands, files, summary, seriesBefore, seriesAfter, sourceSessionId }
 * @param {Object} [opts]
 * @param {AbortSignal} [opts.signal]
 * @param {(msg:string) => void} [opts.onStatus]    — status banner sink
 * @param {(evt:Object) => void} [opts.onProgress]  — progress-bar sink (mirror of saveSessionToCloud's shape)
 * @returns {Promise<null | {
 *   hands: Array,
 *   files: Array<{file: File, text: string}>,
 *   summary: Object,
 *   seriesBefore: Object,
 *   seriesAfter: Object,
 *   sourceSessionId: string,
 *   mergedFromHandCount: number,
 *   mergedFromSessionId: string,
 *   mergedFromSessionIds: string[],
 * }>}
 */
export async function mergeWithLatestIfNeeded(session, opts = {}) {
  const { signal, onStatus, onProgress } = opts;
  if (!session || !session.hands || session.hands.length === 0) return null;
  if (session.sourceSessionId) return null;

  throwIfAborted(signal);
  const list = await apiCall("list-sessions", {});
  if (!list?.ok || !Array.isArray(list.sessions) || list.sessions.length === 0) {
    return null;
  }

  // Oldest → newest. Cross-session dedup later assumes this ordering so newer
  // duplicates win over older ones.
  const priorSessions = list.sessions
    .slice()
    .filter((s) => s?.sessionId)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  if (priorSessions.length === 0) return null;

  try {
    return await runMergePipeline({
      priorSessions,
      localSession: session,
      signal,
      onStatus,
      onProgress,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    // Per spec: any R2 download (or other multi-merge) failure falls back to
    // a single-session merge with just the latest prior session — the user's
    // local upload still lands in the cloud, just paired with one snapshot
    // instead of N. We deliberately retry the pipeline with N=1 so the
    // existing single-merge path is exercised end-to-end.
    console.warn(
      "[poker cloud merge] multi-session merge failed; falling back to latest-only:",
      err?.message
    );
    const latest = priorSessions[priorSessions.length - 1];
    if (!latest) return null;
    try {
      return await runMergePipeline({
        priorSessions: [latest],
        localSession: session,
        signal,
        onStatus,
        onProgress,
      });
    } catch (fallbackErr) {
      if (fallbackErr?.name === "AbortError") throw fallbackErr;
      console.warn(
        "[poker cloud merge] fallback single-session merge also failed; saving as-is:",
        fallbackErr?.message
      );
      return null;
    }
  }
}

/**
 * Merge ALL of the user's prior cloud sessions together (with no local
 * upload). Used by the "Consolidate all into one" button in My Sessions when
 * the user has multiple legacy snapshots but nothing currently loaded in
 * memory. The caller is responsible for uploading the result and deleting
 * the source sessions afterwards.
 *
 * Returns null when fewer than 2 prior sessions exist (nothing to consolidate)
 * or when the merge produces no parseable hands.
 *
 * @param {Object} [opts]
 * @param {AbortSignal} [opts.signal]
 * @param {(msg:string) => void} [opts.onStatus]
 * @param {(evt:Object) => void} [opts.onProgress]
 */
export async function consolidateAllSessions(opts = {}) {
  const { signal, onStatus, onProgress } = opts;
  throwIfAborted(signal);
  const list = await apiCall("list-sessions", {});
  if (!list?.ok || !Array.isArray(list.sessions) || list.sessions.length < 2) {
    return null;
  }

  const priorSessions = list.sessions
    .slice()
    .filter((s) => s?.sessionId)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  if (priorSessions.length < 2) return null;

  // No local session — the consolidate button only runs when no in-memory
  // upload exists (otherwise the regular Save handler's auto-merge already
  // covers the case). Errors propagate to the caller; unlike the save path,
  // there's no "user's new hands to protect", so a hard failure is fine.
  return await runMergePipeline({
    priorSessions,
    localSession: null,
    signal,
    onStatus,
    onProgress,
  });
}
