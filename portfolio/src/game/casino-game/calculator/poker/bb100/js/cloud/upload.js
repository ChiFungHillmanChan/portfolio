// upload.js (cloud) — saves the currently-loaded session to R2 + Firestore.
// Flow: bundle hands.txt + index.json → gzip → sign-upload → PUT both → commit-upload
//
// Caller hands us the parsed Hand[] + the original File objects + a summary.
// We re-construct hands.txt by concatenating the original file contents with a
// sentinel separator, and we build index.json from the parsed hand metadata.

import { apiCall } from "../auth/api-client.js";
import { invalidateQuotaCache } from "./quota.js";
import { COMPUTE_FINGERPRINT } from "../stats/compute.mjs";

const FILE_SENTINEL = (name) => `\n=== FILE: ${name} ===\n`;

function generateSessionId() {
  // Sortable ISO-like prefix + 8 random base32 chars; URL/S3-safe
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(5)))
    .map((b) => "0123456789abcdefghijklmnopqrstuv"[b & 31])
    .join("");
  return `${ts}-${rand}`;
}

async function gzipBlob(text) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Response(stream).blob();
}

async function readFilesAsText(files) {
  // Read all File objects into strings (preserves the exact bytes the user dropped).
  return Promise.all(
    Array.from(files).map(async (f) => ({ name: f.name, text: await f.text() }))
  );
}

function buildHandsBlob(originalFiles) {
  // Concatenate file contents with sentinels so we can split them on restore.
  return originalFiles
    .map((f) => `${FILE_SENTINEL(f.name)}${f.text}`)
    .join("");
}

// Recursively convert BigInt values to strings so the result is JSON-safe.
// Summary objects contain BigInts everywhere (totalUC, rakePaidUC, byPosition
// totals, the new totalBefore/AfterUC and evTotal*UC fields), and JSON.stringify
// throws "Do not know how to serialize a BigInt" on the first one it hits.
function sanitizeForJson(v) {
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(sanitizeForJson);
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = sanitizeForJson(val);
    return out;
  }
  return v;
}

// Pre-computed chart series, gzipped per session. Opening the session later
// rehydrates this directly into the chart — no parse, no equity, no compute.
// `seriesBefore` / `seriesAfter` are { winningsUC, evUC, redUC, blueUC } where
// each *UC is a BigInt[] of cumulative micro-cents (one entry per hand). We
// stringify each BigInt — JSON can't carry them natively, the client casts back
// on read. `computeFingerprint` is the algorithm version; if it mismatches the
// client's current COMPUTE_FINGERPRINT at open time, the client falls back to a
// fresh recompute from hands.txt.gz.
function buildSeriesBlob({ seriesBefore, seriesAfter, summary }) {
  return JSON.stringify({
    schemaVersion: 1,
    computeFingerprint: COMPUTE_FINGERPRINT,
    summary: sanitizeForJson(summary),
    seriesBefore: sanitizeForJson(seriesBefore),
    seriesAfter: sanitizeForJson(seriesAfter),
  });
}

function buildIndexBlob(hands, summary) {
  // Per-hand lightweight metadata. We DO NOT store full action lines here; that
  // stays in hands.txt.gz. This index is the fast-listing payload.
  return JSON.stringify({
    version: 1,
    summary: sanitizeForJson(summary),
    hands: hands.map((h) => ({
      id: h.id,
      date: h.date,
      stake: { sb: h.stake?.sbUC?.toString() || "0", bb: h.stake?.bbUC?.toString() || "0" },
      position: h.hero?.position || null,
      // Result in micro-cents as string (BigInt JSON-incompatible)
      resultUC: ((h.collectedUC ?? 0n) - (h.contributedUC ?? 0n)).toString(),
      allInStreet: h.allInStreet || null,
      reachedShowdown: !!h.reachedShowdown,
    })),
  });
}

async function putToPresignedUrl(url, blob) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "content-type": blob.type || "application/gzip" },
    body: blob,
  });
  if (!res.ok) {
    let text = "";
    try { text = await res.text(); } catch {}
    throw new Error(`presigned PUT failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
}

export async function saveSessionToCloud({
  hands,
  originalFiles,
  summary,
  seriesBefore,
  seriesAfter,
  onProgress,
}) {
  if (!hands || hands.length === 0) throw new Error("no hands to save");
  if (!originalFiles || originalFiles.length === 0) throw new Error("missing original files");

  const sessionId = generateSessionId();
  const handCount = hands.length;
  // The series payload is optional — older callers (or recompute fallbacks)
  // may not have it. When present the saved session can be re-opened instantly
  // without re-parsing hands.txt + re-running equity.
  const hasSeries = seriesBefore && seriesAfter;

  onProgress?.({ stage: "reading", progress: 0 });
  const fileTexts = await readFilesAsText(originalFiles);

  onProgress?.({ stage: "bundling", progress: 0.2 });
  const handsText = buildHandsBlob(fileTexts);
  const indexText = buildIndexBlob(hands, summary);
  const seriesText = hasSeries ? buildSeriesBlob({ seriesBefore, seriesAfter, summary }) : null;
  const bytesUncompressed = new Blob([handsText]).size;

  onProgress?.({ stage: "compressing", progress: 0.35 });
  const gzipJobs = [gzipBlob(handsText), gzipBlob(indexText)];
  if (seriesText) gzipJobs.push(gzipBlob(seriesText));
  const gzipped = await Promise.all(gzipJobs);
  const handsGz = gzipped[0];
  const indexGz = gzipped[1];
  const seriesGz = seriesText ? gzipped[2] : null;
  const bytesCompressed = handsGz.size + indexGz.size + (seriesGz ? seriesGz.size : 0);

  onProgress?.({ stage: "signing", progress: 0.5 });
  const sign = await apiCall("sign-upload", {
    sessionId,
    handCount,
    bytesCompressed,
    // Tell the Lambda we want a 3rd presigned URL for series.json.gz. Older
    // Lambdas ignore this and return only hands+index URLs — we handle that
    // case below by skipping the series PUT.
    wantSeries: !!seriesGz,
  });
  if (!sign.ok) {
    if (sign.reason === "partial-quota" || sign.reason === "over-quota") {
      throw new Error(`quota-exceeded: ${sign.reason}. Allowed: ${sign.allowedHandCount} hands of ${handCount}. Current ${sign.currentHandCount}/${sign.limit}.`);
    }
    throw new Error(`sign-upload failed: ${sign.error || JSON.stringify(sign)}`);
  }

  onProgress?.({ stage: "uploading-hands", progress: 0.6 });
  await putToPresignedUrl(sign.uploadUrls.hands, handsGz);

  onProgress?.({ stage: "uploading-index", progress: 0.78 });
  await putToPresignedUrl(sign.uploadUrls.index, indexGz);

  // Only PUT the series object if the Lambda actually returned a URL for it
  // (forward-compatible with the old 2-URL signing contract).
  const seriesUrl = sign.uploadUrls?.series || null;
  const uploadedSeries = !!(seriesUrl && seriesGz);
  if (uploadedSeries) {
    onProgress?.({ stage: "uploading-series", progress: 0.88 });
    await putToPresignedUrl(seriesUrl, seriesGz);
  }

  onProgress?.({ stage: "committing", progress: 0.95 });
  const commit = await apiCall("commit-upload", {
    sessionId,
    handCount,
    bytesUncompressed,
    bytesCompressed,
    // summary contains BigInts (rakePaidUC, totalBefore/AfterUC, byPosition…).
    // apiCall serializes its body as JSON, so we must sanitize first.
    summary: sanitizeForJson(summary),
    fileNames: fileTexts.map((f) => f.name),
    // Signal to the Lambda that a series.json.gz also landed in S3 so the
    // session doc records s3KeySeries — frontend uses that to decide whether
    // to try the fast-open path. Omitted when no series uploaded.
    hasSeries: uploadedSeries,
    computeFingerprint: uploadedSeries ? COMPUTE_FINGERPRINT : null,
  });
  if (!commit.ok) {
    throw new Error(`commit-upload failed: ${commit.reason || commit.error || "unknown"}`);
  }

  invalidateQuotaCache();
  onProgress?.({ stage: "done", progress: 1.0 });
  return { sessionId, handCount, bytesCompressed, hasSeries: uploadedSeries };
}
