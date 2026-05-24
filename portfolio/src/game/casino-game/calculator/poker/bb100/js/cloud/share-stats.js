// share-stats.js — Frontend wrapper for the stats-share API + payload
// preparation. Two responsibilities:
//   1. Convert the live `summary` + `series` objects (which contain BigInt UC
//      amounts) into the JSON-serialisable shapes the Lambda expects.
//   2. Wrap the 4 owner-facing API calls in functions that the share-dialog
//      and "My shares" dashboard can use.
//
// The public read endpoints (`get-stats-share`, `get-share-meta`) are called
// directly by the share-page bundle on casino-game.hillmanchan.com/p/{id} —
// they're not in this file because they don't need auth and live outside
// the recorder app.

import { apiCall } from "../auth/api-client.js";

const SERIES_KEYS = ["winningsUC", "redUC", "blueUC", "evUC"];
// Matches MAX_POINTS in backend share-stats.mjs — keep in sync.
const MAX_POINTS = 5000;

// ── Payload prep ─────────────────────────────────────────────────────────────
// Converts BigInt UC values to plain Number UC values. Lossy at extreme
// magnitudes (Number.MAX_SAFE_INTEGER ≈ 9e15 UC ≈ $9 billion) — fine for any
// realistic poker session.

function ucToNumber(v) {
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  return 0;
}

function flattenSeries(series) {
  if (!series) return null;
  const out = {};
  for (const k of SERIES_KEYS) {
    const arr = series[k];
    if (!Array.isArray(arr)) {
      out[k] = [];
      continue;
    }
    out[k] = arr.map(ucToNumber);
  }
  return out;
}

// Downsample to MAX_POINTS so the backend doesn't reject + the share-page
// loads fast. Mirrors upload.js's downsampleSeries() shape but lives here so
// the share-pipeline doesn't depend on upload.js internals.
function downsampleForShare(series) {
  if (!series) return null;
  const flat = flattenSeries(series);
  const len = SERIES_KEYS.reduce((m, k) => Math.max(m, flat[k].length), 0);
  if (len <= MAX_POINTS) return flat;
  const stride = len / MAX_POINTS;
  const out = {};
  for (const k of SERIES_KEYS) out[k] = [];
  for (let i = 0; i < MAX_POINTS; i++) {
    const idx = Math.min(len - 1, Math.floor(i * stride));
    for (const k of SERIES_KEYS) out[k].push(flat[k][idx] ?? 0);
  }
  // Always include the final point so cumulative end is exact.
  for (const k of SERIES_KEYS) {
    if (out[k].length && out[k][out[k].length - 1] !== flat[k][len - 1]) {
      out[k].push(flat[k][len - 1]);
    }
  }
  return out;
}

// Convert micro-cents → BB count, given the average BB-size for the session.
// We get this from summary.rakePaidUC ÷ summary.rakeBbPer100 ÷ 100 ÷ hands
// implicitly — but easier: the backend computes rakePaidBb later from the
// `rakePaidUC` + `bbPer100*` if you want. Here we just precompute it.
function ucToBb(uc, bbPer100, hands, totalUC) {
  // If we have bbPer100 (Number) and totalUC (BigInt-as-Number) of the same
  // mode, then 1 bb = totalUC / (bbPer100 * hands / 100). Defensive against
  // divide-by-zero.
  const total = ucToNumber(uc);
  if (!hands || !bbPer100 || Math.abs(bbPer100) < 0.0001) return 0;
  const bbValueUC = ucToNumber(totalUC) / (bbPer100 * hands / 100);
  if (!Number.isFinite(bbValueUC) || Math.abs(bbValueUC) < 0.0001) return 0;
  return total / bbValueUC;
}

// Build the payload for create-stats-share.
//
//   src: { summary, seriesBefore, seriesAfter } — the same shapes that
//        upload.js stores in `lastCompute`.
//   meta: { stakes?, firstHandAt?, lastHandAt? } — optional context the
//         backend will bucket into "Mid"/"Last 6 months" labels.
export function buildSharePayload({ type, title, expireDays, password, summary, seriesBefore, seriesAfter, meta }) {
  if (!summary) throw new Error("summary-missing");
  if (!seriesAfter && !seriesBefore) throw new Error("series-missing");

  const hands = Number(summary.hands) || 0;

  // Convert BigInt totals to BB (the share viewer renders BB-first; $ is
  // derived). We use the AFTER-rake bb/100 + totalAfterUC pair as anchor.
  const rakePaidBb = ucToBb(summary.rakePaidUC, summary.bbPer100After, hands, summary.totalAfterUC);

  // $ value of 1 BB in this session. We try BEFORE-rake first because it
  // can't be zero (your gross winrate must be non-zero if you've actually
  // played hands — even pure flat-line is zero net of variance). Falls back
  // to after-rake then to the meta-supplied stake. Bounded so a malformed
  // session can't break the share page chart.
  const bbValueUsd = computeBbValueUsd(summary, hands, meta);

  const sanitisedSummary = {
    hands,
    bbPer100Before: Number(summary.bbPer100Before) || 0,
    bbPer100After:  Number(summary.bbPer100After)  || 0,
    evBbPer100Before: Number(summary.evBbPer100Before) || 0,
    evBbPer100After:  Number(summary.evBbPer100After)  || 0,
    rakeBbPer100:   Number(summary.rakeBbPer100)   || 0,
    rakePaidBb,
    bbValueUsd,
    totalBefore: ucToNumber(summary.totalBeforeUC) / 1e6,
    totalAfter:  ucToNumber(summary.totalAfterUC)  / 1e6,
    byPosition: flattenPositionMap(summary.byPosition),
    // raw fields for backend to bucket — never written to the public payload
    stakes:       meta?.stakes ?? null,
    firstHandAt:  meta?.firstHandAt ?? null,
    lastHandAt:   meta?.lastHandAt ?? null,
  };

  return {
    type,                                 // "graphs" | "hands"
    title: (title || "").slice(0, 80),
    expireDays: Number(expireDays) || 7,
    password: password || null,
    summary:      sanitisedSummary,
    seriesBefore: downsampleForShare(seriesBefore),
    seriesAfter:  downsampleForShare(seriesAfter),
  };
}

function computeBbValueUsd(summary, hands, meta) {
  // Anchor on whichever bb/100 + total pair is non-zero. Both before and
  // after rake should give the same answer (they reference the same BB),
  // so we just need ONE that doesn't divide by zero.
  const totalBeforeUsd = ucToNumber(summary.totalBeforeUC) / 1e6;
  const totalAfterUsd  = ucToNumber(summary.totalAfterUC)  / 1e6;
  const bb100Before = Number(summary.bbPer100Before) || 0;
  const bb100After  = Number(summary.bbPer100After)  || 0;

  const tryPair = (total, bb100) => {
    if (!hands || Math.abs(bb100) < 0.001) return null;
    const v = total / (bb100 * hands / 100);
    if (!Number.isFinite(v) || v <= 0) return null;
    return v;
  };

  return (
    tryPair(totalBeforeUsd, bb100Before) ??
    tryPair(totalAfterUsd, bb100After) ??
    Number(meta?.bbValueUsd) ||
    1                                  // Safe default; share page will treat as NL100-equivalent
  );
}

function flattenPositionMap(byPos) {
  if (!byPos || typeof byPos !== "object") return {};
  const out = {};
  for (const [pos, v] of Object.entries(byPos)) {
    if (!v || typeof v !== "object") continue;
    out[pos] = {
      hands: Number(v.hands) || 0,
      bbPer100: Number(v.bbPer100) || 0,
    };
  }
  return out;
}

// ── API wrappers ─────────────────────────────────────────────────────────────

export async function createStatsShare(payload) {
  // Throws "poker-api-403: <body>" on quota / plan errors; caller parses.
  return apiCall("create-stats-share", payload);
}

export async function listMyShares({ pageSize = 20, pageToken = null } = {}) {
  return apiCall("list-my-shares", { pageSize, pageToken });
}

export async function revokeStatsShare(shareId) {
  return apiCall("revoke-stats-share", { shareId });
}

// Owner-side preview: lightweight metadata used by share-dialog to render
// "you have N/M shares this month" without doing a full list. Reuses
// list-my-shares with pageSize=1 for now — cheap enough.
export async function previewMyShares() {
  return apiCall("list-my-shares", { pageSize: 1 });
}
