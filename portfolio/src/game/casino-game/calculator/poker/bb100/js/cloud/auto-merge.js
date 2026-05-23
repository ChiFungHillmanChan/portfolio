// auto-merge.js — when the user clicks "Save to cloud" on a session that has
// no linked cloud sourceSessionId, transparently combine the in-memory hands
// with the user's most recent cloud session before saving. End result: one
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
//     to saveSessionToCloud. `sourceSessionId` is set to the merged-from
//     session, so bootstrap.js's existing delete-previous logic deletes the
//     old snapshot after the new combined one commits.
//   - Aborts cleanly: pass an AbortSignal and every fetch + parse-loop yields
//     bail with DOMException(name='AbortError').
//
// Cost shape (typical 26K-old + 4K-new merge):
//   - 1 list-sessions Lambda call (cheap)
//   - 1 sign-download Lambda + 1 R2 GET of the old hands.txt.gz (multi-MB)
//   - Parse all merged files (≈ 1-3s for 30K hands)
//   - Recompute series (≈ 5-15s for 30K hands depending on equity-cache hits)
//
// The R2 GET is the dominant cost but only paid when the user actively saves
// AND the merge actually applies — never on page entry, never per-open.

import { apiCall } from "../auth/api-client.js";

const FILE_SENTINEL_RE = /\n=== FILE: ([^=]+) ===\n/g;
const PARSE_YIELD_EVERY = 500;
const COMPUTE_YIELD_EVERY = 250;

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
 * If the in-memory session is not already linked to a cloud session AND the
 * user has at least one cloud session saved, combine the two and return the
 * merged result. Otherwise returns null and the caller proceeds with the
 * unmerged session.
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

  const latest = list.sessions
    .slice()
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
  if (!latest?.sessionId) return null;

  onStatus?.(`Merging with previous cloud session (${(latest.handCount || 0).toLocaleString()} hands)…`);

  throwIfAborted(signal);
  const sign = await apiCall("sign-download", { sessionId: latest.sessionId, file: "hands" });
  if (!sign?.ok) {
    // Old session with no hands.txt — can't merge, surface as "no merge".
    console.warn("[poker cloud merge] sign-download failed; saving as-is:", sign?.error);
    return null;
  }

  throwIfAborted(signal);
  onProgress?.({ stage: "downloading-previous", progress: 0.05 });
  const oldText = await fetchAndUngzipText(sign.url, { signal });
  throwIfAborted(signal);

  const oldSplits = splitConcatenatedFiles(oldText);
  if (oldSplits.length === 0) return null;

  // File-name dedup — current local files always win. Filenames are
  // case-insensitive on most operating systems users will be running, so
  // normalise before comparing.
  const currentNamesLower = new Set(
    (session.files || []).map((f) => (f.file?.name || f.name || "").toLowerCase())
  );
  const stableMs = Number(latest.createdAt) || 0;
  const mergedFiles = [];
  for (const split of oldSplits) {
    if (currentNamesLower.has(split.name.toLowerCase())) continue;
    const file = new File([split.text], split.name, {
      type: "text/plain",
      lastModified: stableMs,
    });
    mergedFiles.push({ file, text: split.text });
  }
  // Then append the user's freshly-uploaded local files so a deterministic
  // sort lands the new hands at the end of the timeline before the chrono
  // sort below.
  for (const f of session.files || []) mergedFiles.push(f);

  // Parse every hand in the combined file set. We re-parse the old hands
  // (vs. carrying parsed objects across) so id/date/text shapes match the
  // current parser exactly — avoids subtle drift after parser updates.
  onStatus?.("Parsing combined hand history…");
  onProgress?.({ stage: "merging-parse", progress: 0.2 });
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

  // Hand-level dedup safety net. If a hand somehow appears in both old and
  // new (e.g. user re-imported a file under a different name), the new copy
  // overwrites the old since it was appended last.
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
    // Old session was unparseable AND the user's new local set is empty? The
    // outer guard already rejected an empty `session.hands`, so this is a
    // degenerate state — bail to a non-merged save so the user still gets
    // their data uploaded.
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

  return {
    hands: dedupedHands,
    files: mergedFiles,
    summary,
    seriesBefore,
    seriesAfter,
    sourceSessionId: latest.sessionId,
    mergedFromHandCount: latest.handCount || 0,
    mergedFromSessionId: latest.sessionId,
  };
}
