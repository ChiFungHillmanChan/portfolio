// upload.js (cloud) — saves the currently-loaded session to R2 + Firestore.
// Flow: bundle hands.txt + index.json → gzip → sign-upload → PUT both → commit-upload
//
// Caller hands us the parsed Hand[] + the original File objects + a summary.
// We re-construct hands.txt by concatenating the original file contents with a
// sentinel separator, and we build index.json from the parsed hand metadata.

import { apiCall } from "../auth/api-client.js";
import { invalidateQuotaCache } from "./quota.js";

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

function buildIndexBlob(hands, summary) {
  // Per-hand lightweight metadata. We DO NOT store full action lines here; that
  // stays in hands.txt.gz. This index is the fast-listing payload.
  return JSON.stringify({
    version: 1,
    summary,
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

export async function saveSessionToCloud({ hands, originalFiles, summary, onProgress }) {
  if (!hands || hands.length === 0) throw new Error("no hands to save");
  if (!originalFiles || originalFiles.length === 0) throw new Error("missing original files");

  const sessionId = generateSessionId();
  const handCount = hands.length;

  onProgress?.({ stage: "reading", progress: 0 });
  const fileTexts = await readFilesAsText(originalFiles);

  onProgress?.({ stage: "bundling", progress: 0.2 });
  const handsText = buildHandsBlob(fileTexts);
  const indexText = buildIndexBlob(hands, summary);
  const bytesUncompressed = new Blob([handsText]).size;

  onProgress?.({ stage: "compressing", progress: 0.35 });
  const [handsGz, indexGz] = await Promise.all([
    gzipBlob(handsText),
    gzipBlob(indexText),
  ]);
  const bytesCompressed = handsGz.size + indexGz.size;

  onProgress?.({ stage: "signing", progress: 0.5 });
  const sign = await apiCall("sign-upload", { sessionId, handCount, bytesCompressed });
  if (!sign.ok) {
    if (sign.reason === "partial-quota" || sign.reason === "over-quota") {
      throw new Error(`quota-exceeded: ${sign.reason}. Allowed: ${sign.allowedHandCount} hands of ${handCount}. Current ${sign.currentHandCount}/${sign.limit}.`);
    }
    throw new Error(`sign-upload failed: ${sign.error || JSON.stringify(sign)}`);
  }

  onProgress?.({ stage: "uploading-hands", progress: 0.6 });
  await putToPresignedUrl(sign.uploadUrls.hands, handsGz);

  onProgress?.({ stage: "uploading-index", progress: 0.85 });
  await putToPresignedUrl(sign.uploadUrls.index, indexGz);

  onProgress?.({ stage: "committing", progress: 0.95 });
  const commit = await apiCall("commit-upload", {
    sessionId,
    handCount,
    bytesUncompressed,
    bytesCompressed,
    summary,
    fileNames: fileTexts.map((f) => f.name),
  });
  if (!commit.ok) {
    throw new Error(`commit-upload failed: ${commit.reason || commit.error || "unknown"}`);
  }

  invalidateQuotaCache();
  onProgress?.({ stage: "done", progress: 1.0 });
  return { sessionId, handCount, bytesCompressed };
}
