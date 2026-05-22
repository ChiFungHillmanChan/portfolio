// migrate-stale-cache.js — bulk-refresh the chart cache for every cloud
// session whose computeFingerprint predates the current algorithm version.
//
// Why a bulk migrator (vs. the auto-refresh in load-session.js):
//   load-session.js refreshes a session's cache when the user OPENS it. After
//   a fingerprint bump the user still pays the recompute cost on every untouched
//   session until they open it once. With 20+ saved sessions that's annoying.
//   This module migrates ALL stale sessions in a single batch, headlessly:
//   parse → compute → upload new series.json.gz → stamp Firestore. The chart
//   UI is untouched (no thrashing), and the migration shows live progress so
//   the user can see it running.
//
// Cost shape: compute is the heavy part (~5–15s per 1K hands depending on
// equity-cache locality). We yield to the UI every ~250 hands so the page
// stays responsive throughout.

import { apiCall } from "../auth/api-client.js";
import { COMPUTE_FINGERPRINT, computeSeries } from "../stats/compute.mjs";
import { parseHand, splitIntoHands } from "../parser/gg-parser.mjs";
import { refreshSeriesForExistingSession } from "./upload.js";

const FILE_SENTINEL_RE = /\n=== FILE: ([^=]+) ===\n/g;
const POLITE_DELAY_MS = 250;   // breather between sessions so we don't pummel the Lambda
const COMPUTE_YIELD_EVERY = 250;

async function fetchAndUngzipText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  const ds = new DecompressionStream("gzip");
  return new Response(res.body.pipeThrough(ds)).text();
}

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

function parseAllHands(files) {
  const hands = [];
  for (const f of files) {
    const chunks = splitIntoHands(f.text);
    for (const chunk of chunks) {
      try {
        const hand = parseHand(chunk);
        hand.text = chunk;
        hand.fileName = f.name;
        hands.push(hand);
      } catch (_) {
        // skip unparseable hands (same tolerant behaviour as upload.js)
      }
    }
  }
  // upload.js sorts chronologically before computing; mirror that so the
  // resulting series matches what a fresh upload would produce.
  hands.sort((a, b) => {
    const ta = a.timestamp || a.date || 0;
    const tb = b.timestamp || b.date || 0;
    return ta - tb;
  });
  return hands;
}

/** Returns sessions whose cached series fingerprint is stale (or null). */
export async function listStaleSessions() {
  const resp = await apiCall("list-sessions", {});
  if (!resp.ok) throw new Error(resp.error || "list-sessions failed");
  const sessions = resp.sessions || [];
  return sessions.filter(
    (s) => s.hasSeries && s.computeFingerprint && s.computeFingerprint !== COMPUTE_FINGERPRINT
  );
}

/** Migrate one session. Throws on failure; caller decides whether to continue. */
async function migrateOneSession(session, onProgress) {
  onProgress?.({ phase: "downloading", session });
  const sign = await apiCall("sign-download", { sessionId: session.sessionId, file: "hands" });
  if (!sign.ok) throw new Error(sign.error || "sign-download-hands failed");
  const text = await fetchAndUngzipText(sign.url);
  const files = splitConcatenatedFiles(text);

  onProgress?.({ phase: "parsing", session });
  const hands = parseAllHands(files);
  if (hands.length === 0) throw new Error("no hands parsed from session");

  onProgress?.({ phase: "computing", session, handCount: hands.length });
  const { seriesBefore, seriesAfter, summary } = await computeSeries(
    hands,
    { beforeRake: false },
    {
      yieldEvery: COMPUTE_YIELD_EVERY,
      onProgress: (p) => onProgress?.({ phase: "computing", session, handCount: hands.length, progress: p }),
    }
  );

  onProgress?.({ phase: "uploading", session });
  await refreshSeriesForExistingSession({
    sessionId: session.sessionId,
    seriesBefore,
    seriesAfter,
    summary,
  });
}

/**
 * Migrate every stale session in series.
 *
 * @param {Object} args
 * @param {(evt: {phase: string, current?: number, total?: number, session?: Object, handCount?: number, progress?: number, error?: string}) => void} [args.onProgress]
 * @param {{aborted: boolean}} [args.abortFlag] mutate `.aborted = true` to stop after the current session.
 * @returns {Promise<{migrated: number, failed: number, total: number, errors: Array}>}
 */
export async function migrateAllStaleSessions({ onProgress, abortFlag } = {}) {
  const stale = await listStaleSessions();
  const total = stale.length;
  onProgress?.({ phase: "start", total });
  if (total === 0) return { migrated: 0, failed: 0, total: 0, errors: [] };

  let migrated = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < total; i++) {
    if (abortFlag?.aborted) {
      onProgress?.({ phase: "aborted", current: i, total });
      break;
    }
    const session = stale[i];
    onProgress?.({ phase: "session-start", current: i + 1, total, session });
    try {
      await migrateOneSession(session, (evt) =>
        onProgress?.({ ...evt, current: i + 1, total })
      );
      migrated++;
      onProgress?.({ phase: "session-done", current: i + 1, total, session });
    } catch (err) {
      failed++;
      errors.push({ sessionId: session.sessionId, error: err.message });
      console.warn(`[poker cloud migrate] session ${session.sessionId.slice(-8)} failed:`, err.message);
      onProgress?.({ phase: "session-error", current: i + 1, total, session, error: err.message });
    }
    await new Promise((r) => setTimeout(r, POLITE_DELAY_MS));
  }

  onProgress?.({ phase: "done", current: total, total, migrated, failed });
  return { migrated, failed, total, errors };
}
