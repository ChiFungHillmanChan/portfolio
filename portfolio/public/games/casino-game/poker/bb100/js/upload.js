// js/upload.js
import { parseFile, splitIntoHands, parseHand } from './parser/gg-parser.mjs';
import { validateFile } from './parser/validator.mjs';
import { computeSeries } from './stats/compute.mjs';
import { ucToDollars, formatUSD } from './stats/money.mjs';
import { showProgress, hideProgress, nextFrame } from './progress-bar.js';

const els = {
  zone: document.getElementById('uploadZone'),
  pickBtn: document.getElementById('uploadPickBtn'),
  fileInput: document.getElementById('uploadFileInput'),
  status: document.getElementById('uploadStatus'),
  results: document.getElementById('uploadResults'),
  chartCanvas: document.getElementById('evChart'),
  chartFooter: document.getElementById('chartFooter'),
  chartControls: document.getElementById('chartControls'),
  summary: document.getElementById('uploadSummary'),
  position: document.getElementById('positionCard'),
  handBrowser: document.getElementById('handBrowser'),
  filterBar: document.getElementById('filterBar'),
  replayFilterBar: document.getElementById('replayFilterBar'),
  uploadSummaryBanner: document.getElementById('uploadSummaryBanner'),
  chartSpinner: document.getElementById('chartSpinner'),
  chartSpinnerLabel: document.getElementById('chartSpinnerLabel'),
  chartSpinnerProgress: document.getElementById('chartSpinnerProgress'),
  compactPill: document.getElementById('uploadCompactPill'),
  pillLabel: document.getElementById('uploadPillLabel'),
  zoneCollapseBtn: document.getElementById('uploadZoneCollapse'),
};

// Collapse the drop-zone to a compact "Add more files" pill once the user has
// loaded at least one hand. Free up vertical space for the chart + tabs.
function collapseUploadZone() {
  if (els.zone) els.zone.hidden = true;
  if (els.compactPill) els.compactPill.hidden = false;
  if (els.zoneCollapseBtn) els.zoneCollapseBtn.hidden = true;
}
function expandUploadZone() {
  if (els.zone) els.zone.hidden = false;
  if (els.compactPill) els.compactPill.hidden = true;
  // Show the in-zone collapse button once user has hands loaded
  if (els.zoneCollapseBtn && allHandsById.size > 0) els.zoneCollapseBtn.hidden = false;
}
function updateCompactPillLabel() {
  if (!els.pillLabel) return;
  const n = allHandsById.size;
  els.pillLabel.textContent = n > 0
    ? `Add more files · ${n.toLocaleString()} hands loaded`
    : 'Add more files';
}
if (els.compactPill) els.compactPill.addEventListener('click', expandUploadZone);
if (els.zoneCollapseBtn) els.zoneCollapseBtn.addEventListener('click', collapseUploadZone);

function showChartSpinner(label, progressText) {
  if (!els.chartSpinner) return;
  els.chartSpinner.hidden = false;
  if (els.chartSpinnerLabel && label) els.chartSpinnerLabel.textContent = label;
  if (els.chartSpinnerProgress) els.chartSpinnerProgress.textContent = progressText || '';
}

function hideChartSpinner() {
  if (els.chartSpinner) els.chartSpinner.hidden = true;
}

const COLORS = {
  winnings: '#4ade80',
  ev: '#fb923c',
  red: '#ef4444',
  blue: '#3b82f6',
};
// Display order for "By position" stats + position-filter chips.
// Canonical pre-flop action order: earliest seat → latest. Blinds last.
const POS_ORDER = ['UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const SESSION_KEY = 'poker-upload-session-v1';

// Master store — keyed by hand.id so re-uploads dedupe naturally.
const allHandsById = new Map();
// Sorted view (chronological); rebuilt lazily after any merge/clear.
let parsedHands = [];
// Files seen, deduped by name+size+lastModified key.
const allFiles = new Map();
let originalFiles = [];
let lastSummary = null;
// Cached compute result: { filteredHandsRef, seriesBefore, seriesAfter, summary }.
// Reused when only the rake toggle changes — no recompute, just re-pick the
// pre-built series array and re-render the chart.
let lastCompute = null;
// opts.filter: dateMode ∈ ['all','today','last-1h','last-3h','last-24h','custom'].
// positions: Set<string>|null  (null = any)
// rank1/rank2: 'A'|'K'..'2'|null  (null = any)
// kind: 'any'|'pair'|'suited'|'offsuit'
let opts = {
  beforeRake: true,
  lines: { winnings: true, ev: true, red: true, blue: true },
  filter: {
    dateMode: 'all', customStart: null, customEnd: null, stakes: null,
    positions: null, rank1: null, rank2: null, kind: 'any',
  },
};

const RANK_ORDER = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const HAND_KINDS = [
  ['any',     'Any'],
  ['pair',    'Pair'],
  ['suited',  'Suited'],
  ['offsuit', 'Offsuit'],
];
let chartInstance = null;

// Notify cloud bootstrap when a session is loaded (no hard dependency — cloud module is loaded as a sibling script)
function notifyCloudSessionLoaded() {
  if (parsedHands.length === 0) return;
  // Dynamic import keeps cloud code out of the critical path for logged-out users.
  import('./cloud/session-state.js')
    .then(({ setCurrentSession }) => {
      setCurrentSession({
        hands: parsedHands,
        files: originalFiles,
        summary: lastSummary,
        // Pass the pre-computed chart series too — cloud/upload.js will save
        // them alongside hands.txt.gz so re-opens skip the compute pipeline.
        seriesBefore: lastCompute?.seriesBefore || null,
        seriesAfter: lastCompute?.seriesAfter || null,
      });
    })
    .catch(() => {}); // cloud module missing is fine — local-only mode still works
}

// === File intake ===

els.pickBtn.addEventListener('click', () => els.fileInput.click());
els.fileInput.addEventListener('change', () => handleFiles(Array.from(els.fileInput.files)));

els.zone.addEventListener('dragover', e => {
  e.preventDefault();
  els.zone.classList.add('drag-active');
});
els.zone.addEventListener('dragleave', () => els.zone.classList.remove('drag-active'));
els.zone.addEventListener('drop', async e => {
  e.preventDefault();
  els.zone.classList.remove('drag-active');
  const files = await collectFilesFromDrop(e.dataTransfer);
  await handleFiles(files);
});

async function collectFilesFromDrop(dt) {
  const items = dt.items;
  if (items && items.length && items[0].webkitGetAsEntry) {
    const out = [];
    const entries = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) entries.push(entry);
    }
    for (const e of entries) await walkEntry(e, out);
    return out;
  }
  return Array.from(dt.files);
}

async function walkEntry(entry, out) {
  if (entry.isFile) {
    const file = await new Promise((res, rej) => entry.file(res, rej));
    out.push(file);
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    const readBatch = () => new Promise((res, rej) => reader.readEntries(res, rej));
    while (true) {
      const batch = await readBatch();
      if (batch.length === 0) break;
      for (const e of batch) await walkEntry(e, out);
    }
  }
}

// Compare hands chronologically — date string is ISO-Z so lex == chrono. Tiebreak by id.
function chronoCompare(a, b) {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return a.id.localeCompare(b.id);
}

// Rebuild the sorted view from the master Map. Cheap relative to parse.
function rebuildSorted() {
  parsedHands = Array.from(allHandsById.values()).sort(chronoCompare);
}

function fileKey(f) {
  return `${f.name}|${f.size}|${f.lastModified}`;
}

// Exported so cloud/load-session.js can feed it the un-gzipped hands.txt as
// File objects when a saved session has no series cache (or a stale one) and
// has to be recomputed locally.
export async function handleFiles(files) {
  if (files.length === 0) return;
  const totalBefore = allHandsById.size;
  showStatus(`Reading ${files.length} files...`);
  const rejected = [];
  let skippedHands = 0;
  let newHands = 0;
  let dupHands = 0;

  try {
    // Phase A: read all file texts (cheap, but yields per file so progress bar paints)
    showProgress({ stage: 'Reading files', current: 0, total: files.length });
    await nextFrame();
    const fileTexts = [];
    for (let i = 0; i < files.length; i++) {
      try {
        fileTexts.push({ name: files[i].name, file: files[i], text: await files[i].text() });
      } catch (e) {
        rejected.push({ name: files[i].name, reason: `read error: ${e.message}` });
        fileTexts.push(null);
      }
      showProgress({ stage: 'Reading files', current: i + 1, total: files.length });
      await nextFrame();
    }

    // Phase B: split each file into hand-text chunks, then parse hand-by-hand
    // yielding every PARSE_YIELD_EVERY hands so the browser stays responsive
    // on very large files (e.g. one 10MB file with 5K hands would otherwise
    // block ~5s — past the "page unresponsive" threshold).
    const PARSE_YIELD_EVERY = 200;
    let totalChunksToParse = 0;
    const perFileChunks = [];
    for (const ft of fileTexts) {
      if (!ft) { perFileChunks.push(null); continue; }
      const validation = validateFile(ft.name, ft.text);
      if (!validation.valid) {
        rejected.push({ name: ft.name, reason: `Validation failed: ${validation.reason}` });
        perFileChunks.push(null);
        continue;
      }
      const chunks = splitIntoHands(ft.text);
      perFileChunks.push({ ft, chunks });
      totalChunksToParse += chunks.length;
    }
    showProgress({ stage: 'Parsing hands', current: 0, total: totalChunksToParse });
    await nextFrame();

    let parsedSoFar = 0;
    for (const pf of perFileChunks) {
      if (!pf) continue;
      const { ft, chunks } = pf;
      let fileHadAnyHand = false;
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
          const hand = parseHand(chunk);
          hand.text = chunk;
          hand.fileName = ft.name;
          if (allHandsById.has(hand.id)) {
            dupHands++;
          } else {
            allHandsById.set(hand.id, hand);
            newHands++;
          }
          fileHadAnyHand = true;
        } catch (_) {
          skippedHands++;
        }
        parsedSoFar++;
        if (parsedSoFar % PARSE_YIELD_EVERY === 0) {
          showProgress({
            stage: `Parsing hands — ${newHands.toLocaleString()} new, ${dupHands.toLocaleString()} duplicate`,
            current: parsedSoFar,
            total: totalChunksToParse,
          });
          await nextFrame();
        }
      }
      if (fileHadAnyHand) {
        const key = fileKey(ft.file);
        if (!allFiles.has(key)) allFiles.set(key, ft.file);
      } else {
        rejected.push({ name: ft.name, reason: 'no Hero hands parsed from file' });
      }
    }

    if (allHandsById.size === 0) {
      const reasons = rejected.map(r => `• ${r.name}: ${r.reason}`).join('\n');
      showStatus(`No valid hands parsed.\n${reasons}`, 'error');
      return;
    }

    // Rebuild sorted view (chronological, tie-break by id)
    rebuildSorted();
    originalFiles = Array.from(allFiles.values());

    // Phase C: compute series + render. renderAll() now drives its own
    // determinate progress bar (yielding every 50 hands) since the equity
    // calculation on cold cache can take 8s for ~7 preflop all-ins.
    const parts = [];
    if (newHands > 0) parts.push(`✓ Added ${newHands.toLocaleString()} new hands`);
    if (dupHands > 0) parts.push(`${dupHands.toLocaleString()} duplicates skipped`);
    if (skippedHands > 0) parts.push(`${skippedHands} malformed skipped`);
    if (rejected.length > 0) parts.push(`${rejected.length} files rejected`);
    const summaryStatus = parts.join(' · ') + ` · Total: ${parsedHands.length.toLocaleString()} hands across ${originalFiles.length} files`;
    showStatus(summaryStatus, newHands > 0 ? 'ok' : 'info');

    els.results.hidden = false;
    // Collapse the drop-zone to a compact pill so the chart/tabs get the
    // vertical space. User clicks the pill to re-open and add more files.
    if (allHandsById.size > 0) {
      updateCompactPillLabel();
      collapseUploadZone();
    }
    await renderAll();
  } finally {
    // Guarantee the progress bar always clears even if compute throws.
    hideProgress();
  }
}

// Clear all uploaded hands and reset state.
export function clearAllUploads() {
  // A cached cloud-session is shown when parsedHands is empty but the chart
  // is populated. Allow Clear in that case too — it just unloads the view.
  const viewingCachedSession = !!(lastCompute && lastCompute.isCachedSession);
  if (allHandsById.size === 0 && !viewingCachedSession) return;
  if (!viewingCachedSession) {
    if (!confirm(`Clear all ${allHandsById.size.toLocaleString()} uploaded hands?`)) return;
  }
  allHandsById.clear();
  allFiles.clear();
  parsedHands = [];
  originalFiles = [];
  lastSummary = null;
  lastCompute = null;  // drop the cached compute so a fresh upload recomputes
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  els.results.hidden = true;
  showStatus('Cleared. Upload hand-history files to start over.', 'info');
  if (els.filterBar) els.filterBar.replaceChildren();
  if (els.replayFilterBar) { els.replayFilterBar.replaceChildren(); els.replayFilterBar.hidden = true; }
  if (els.handBrowser) { els.handBrowser.replaceChildren(); els.handBrowser.hidden = true; }
  // Restore the drop-zone view (collapse pill was hiding it post-upload)
  if (els.zone) els.zone.hidden = false;
  if (els.compactPill) els.compactPill.hidden = true;
  if (els.zoneCollapseBtn) els.zoneCollapseBtn.hidden = true;
}

function showStatus(msg, kind = 'info') {
  els.status.hidden = false;
  els.status.textContent = msg;
  els.status.dataset.kind = kind;
}

// === Render ===

// === Filtering ===

function filterDateRange() {
  const now = new Date();
  const f = opts.filter;
  switch (f.dateMode) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return [start, null];
    }
    case 'last-1h':  return [new Date(now - 1 * 3600_000), null];
    case 'last-3h':  return [new Date(now - 3 * 3600_000), null];
    case 'last-24h': return [new Date(now - 24 * 3600_000), null];
    case 'custom':   return [f.customStart, f.customEnd];
    case 'all':
    default:         return [null, null];
  }
}

// Global filter — applies to chart, summary, by-position table, AND the hand
// browser's input set. Date + stakes only. These are the filters that change
// "what session am I looking at".
function getFilteredHands() {
  if (parsedHands.length === 0) return parsedHands;
  const [start, end] = filterDateRange();
  const f = opts.filter;
  const stakeFilter = f.stakes;
  if (!start && !end && (!stakeFilter || stakeFilter.size === 0)) {
    return parsedHands;
  }
  return parsedHands.filter((h) => {
    if (start || end) {
      const d = new Date(h.date);
      if (start && d < start) return false;
      if (end && d > end) return false;
    }
    if (stakeFilter && stakeFilter.size > 0) {
      const bbCents = Number(h.stake.bbUC / 10000n);
      if (!stakeFilter.has(bbCents)) return false;
    }
    return true;
  });
}

// Hand-browser-only filter applied AFTER getFilteredHands. Position + rank1
// + rank2 + kind. These are the "what specific hands am I drilling into"
// filters — they narrow the table view only, never the chart/summary.
function applyReplayFilter(hands) {
  const f = opts.filter;
  const posFilter = f.positions;
  const cardFilterActive = !!f.rank1 || !!f.rank2 || (f.kind && f.kind !== 'any');
  if ((!posFilter || posFilter.size === 0) && !cardFilterActive) return hands;
  return hands.filter((h) => {
    if (posFilter && posFilter.size > 0) {
      if (!posFilter.has(h.hero.position)) return false;
    }
    if (cardFilterActive && !matchesCardFilter(h.hero.cards, f)) return false;
    return true;
  });
}

// Return true if the hero's hand matches the rank/kind filter.
// rank1/rank2: when both set, they describe a specific two-rank combo (e.g. AK).
// When only rank1 is set, "any hand containing rank1".
// kind: 'pair' | 'suited' | 'offsuit' | 'any'.
function matchesCardFilter(cards, filter) {
  if (!cards || cards.length < 2) return false;
  const c1 = cards[0], c2 = cards[1];
  if (c1.length < 2 || c2.length < 2) return false;
  const r1 = c1.slice(0, -1).toUpperCase();
  const r2 = c2.slice(0, -1).toUpperCase();
  const s1 = c1[c1.length - 1];
  const s2 = c2[c2.length - 1];
  const isPair    = r1 === r2;
  const isSuited  = !isPair && s1 === s2;
  const isOffsuit = !isPair && s1 !== s2;

  const kind = filter.kind || 'any';
  if (kind === 'pair'    && !isPair)    return false;
  if (kind === 'suited'  && !isSuited)  return false;
  if (kind === 'offsuit' && !isOffsuit) return false;

  const want = [];
  if (filter.rank1) want.push(filter.rank1);
  if (filter.rank2) want.push(filter.rank2);
  if (want.length === 0) return true;
  if (want.length === 1) return r1 === want[0] || r2 === want[0];
  // Both ranks specified: need both present (order-independent).
  if (want[0] === want[1]) return r1 === want[0] && r2 === want[0];
  return (r1 === want[0] && r2 === want[1]) || (r1 === want[1] && r2 === want[0]);
}

// Build the list of unique stakes present in parsedHands, with hand-counts.
function uniqueStakes() {
  const counts = new Map(); // bbCents → count
  for (const h of parsedHands) {
    const bbCents = Number(h.stake.bbUC / 10000n);
    counts.set(bbCents, (counts.get(bbCents) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => a[0] - b[0]);
}

function stakeLabel(bbCents) {
  const bb = bbCents / 100;
  // NL2 = 0.01/0.02, NL5 = 0.02/0.05, NL10 = 0.05/0.10, NL25 = 0.10/0.25, NL50 = 0.25/0.50, NL100 = 0.50/1, NL200 = 1/2
  return `NL${Math.round(bb * 100)} ($${bb.toFixed(2)})`;
}

function renderFilterBar() {
  if (!els.filterBar) return;
  els.filterBar.replaceChildren();
  if (parsedHands.length === 0) {
    els.filterBar.hidden = true;
    return;
  }
  els.filterBar.hidden = false;

  // Global filter — Date + Stakes. Affects chart + summary + by-position
  // table + the hand-browser's input set. (Position / rank / kind filters
  // live in the Hand Replay tab's own filter bar — see renderReplayFilterBar.)

  // Row 1: date presets
  const dateRow = document.createElement('div');
  dateRow.className = 'filter-row';
  const dateLabel = document.createElement('span');
  dateLabel.className = 'filter-row-label';
  dateLabel.textContent = 'Date:';
  dateRow.appendChild(dateLabel);
  const presets = [
    ['all', 'All'],
    ['today', 'Today'],
    ['last-1h', 'Last 1h'],
    ['last-3h', 'Last 3h'],
    ['last-24h', 'Last 24h'],
    ['custom', 'Custom'],
  ];
  for (const [key, label] of presets) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-chip' + (opts.filter.dateMode === key ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      opts = { ...opts, filter: { ...opts.filter, dateMode: key } };
      renderAll();
    });
    dateRow.appendChild(btn);
  }
  els.filterBar.appendChild(dateRow);

  // Optional custom-range inputs
  if (opts.filter.dateMode === 'custom') {
    const customRow = document.createElement('div');
    customRow.className = 'filter-row filter-custom-row';
    const fromLbl = document.createElement('label');
    fromLbl.className = 'filter-input-label';
    fromLbl.textContent = 'From';
    const fromInput = document.createElement('input');
    fromInput.type = 'datetime-local';
    fromInput.className = 'filter-input';
    if (opts.filter.customStart) fromInput.value = toDatetimeLocalValue(opts.filter.customStart);
    fromInput.addEventListener('change', () => {
      opts = { ...opts, filter: { ...opts.filter, customStart: fromInput.value ? new Date(fromInput.value) : null } };
      renderAll();
    });
    const toLbl = document.createElement('label');
    toLbl.className = 'filter-input-label';
    toLbl.textContent = 'To';
    const toInput = document.createElement('input');
    toInput.type = 'datetime-local';
    toInput.className = 'filter-input';
    if (opts.filter.customEnd) toInput.value = toDatetimeLocalValue(opts.filter.customEnd);
    toInput.addEventListener('change', () => {
      opts = { ...opts, filter: { ...opts.filter, customEnd: toInput.value ? new Date(toInput.value) : null } };
      renderAll();
    });
    customRow.appendChild(fromLbl);
    customRow.appendChild(fromInput);
    customRow.appendChild(toLbl);
    customRow.appendChild(toInput);
    els.filterBar.appendChild(customRow);
  }

  // Row 2: stake chips (auto from data; multi-select)
  const stakes = uniqueStakes();
  if (stakes.length > 0) {
    const stakeRow = document.createElement('div');
    stakeRow.className = 'filter-row';
    const stakeLabelEl = document.createElement('span');
    stakeLabelEl.className = 'filter-row-label';
    stakeLabelEl.textContent = 'Stakes:';
    stakeRow.appendChild(stakeLabelEl);
    const selected = opts.filter.stakes || new Set();

    // "All stakes" toggle — clears the selection
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'filter-chip' + (selected.size === 0 ? ' active' : '');
    allBtn.textContent = `All (${parsedHands.length.toLocaleString()})`;
    allBtn.addEventListener('click', () => {
      opts = { ...opts, filter: { ...opts.filter, stakes: null } };
      renderAll();
    });
    stakeRow.appendChild(allBtn);

    for (const [bbCents, count] of stakes) {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isOn = selected.has(bbCents);
      btn.className = 'filter-chip' + (isOn ? ' active' : '');
      btn.textContent = `${stakeLabel(bbCents)} (${count.toLocaleString()})`;
      btn.addEventListener('click', () => {
        const next = new Set(selected);
        if (isOn) next.delete(bbCents);
        else next.add(bbCents);
        opts = { ...opts, filter: { ...opts.filter, stakes: next.size === 0 ? null : next } };
        renderAll();
      });
      stakeRow.appendChild(btn);
    }
    els.filterBar.appendChild(stakeRow);
  }

  // Row 3: result counter + clear-all button
  const actionsRow = document.createElement('div');
  actionsRow.className = 'filter-row filter-actions-row';
  const filtered = getFilteredHands();
  const counter = document.createElement('span');
  counter.className = 'filter-counter';
  counter.textContent = filtered.length === parsedHands.length
    ? `Showing all ${parsedHands.length.toLocaleString()} hands`
    : `Showing ${filtered.length.toLocaleString()} of ${parsedHands.length.toLocaleString()} hands`;
  actionsRow.appendChild(counter);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'filter-clear-btn';
  clearBtn.textContent = 'Clear all uploaded hands';
  clearBtn.addEventListener('click', clearAllUploads);
  actionsRow.appendChild(clearBtn);

  els.filterBar.appendChild(actionsRow);
}

// Replay-tab filter — Position + Rank 1 + Rank 2 + Kind. Narrows the hand
// browser only. Does NOT trigger a recompute of the chart; just re-renders
// the hand list. The chart-cache key intentionally excludes these fields.
function renderReplayFilterBar() {
  if (!els.replayFilterBar) return;
  els.replayFilterBar.replaceChildren();
  if (parsedHands.length === 0) {
    els.replayFilterBar.hidden = true;
    return;
  }
  els.replayFilterBar.hidden = false;

  // Position chips (multi-select, OR semantics)
  const posRow = document.createElement('div');
  posRow.className = 'filter-row';
  const posLbl = document.createElement('span');
  posLbl.className = 'filter-row-label';
  posLbl.textContent = 'Position:';
  posRow.appendChild(posLbl);
  const selectedPositions = opts.filter.positions || new Set();
  const anyPosBtn = document.createElement('button');
  anyPosBtn.type = 'button';
  anyPosBtn.className = 'filter-chip' + (selectedPositions.size === 0 ? ' active' : '');
  anyPosBtn.textContent = 'Any';
  anyPosBtn.addEventListener('click', () => {
    opts = { ...opts, filter: { ...opts.filter, positions: null } };
    refreshReplay();
  });
  posRow.appendChild(anyPosBtn);
  for (const pos of POS_ORDER) {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isOn = selectedPositions.has(pos);
    btn.className = 'filter-chip' + (isOn ? ' active' : '');
    btn.textContent = pos;
    btn.addEventListener('click', () => {
      const next = new Set(selectedPositions);
      if (isOn) next.delete(pos); else next.add(pos);
      opts = { ...opts, filter: { ...opts.filter, positions: next.size === 0 ? null : next } };
      refreshReplay();
    });
    posRow.appendChild(btn);
  }
  els.replayFilterBar.appendChild(posRow);

  // Rank pickers (single-select)
  function buildRankRow(label, currentValue, onPick) {
    const row = document.createElement('div');
    row.className = 'filter-row';
    const lbl = document.createElement('span');
    lbl.className = 'filter-row-label';
    lbl.textContent = label;
    row.appendChild(lbl);
    const anyBtn = document.createElement('button');
    anyBtn.type = 'button';
    anyBtn.className = 'filter-chip' + (currentValue == null ? ' active' : '');
    anyBtn.textContent = 'Any';
    anyBtn.addEventListener('click', () => onPick(null));
    row.appendChild(anyBtn);
    for (const r of RANK_ORDER) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-chip filter-chip-rank' + (currentValue === r ? ' active' : '');
      btn.textContent = r;
      btn.addEventListener('click', () => onPick(currentValue === r ? null : r));
      row.appendChild(btn);
    }
    return row;
  }
  els.replayFilterBar.appendChild(buildRankRow('Rank 1:', opts.filter.rank1, (r) => {
    opts = { ...opts, filter: { ...opts.filter, rank1: r } };
    refreshReplay();
  }));
  els.replayFilterBar.appendChild(buildRankRow('Rank 2:', opts.filter.rank2, (r) => {
    opts = { ...opts, filter: { ...opts.filter, rank2: r } };
    refreshReplay();
  }));

  // Kind chips (single-select)
  const kindRow = document.createElement('div');
  kindRow.className = 'filter-row';
  const kindLbl = document.createElement('span');
  kindLbl.className = 'filter-row-label';
  kindLbl.textContent = 'Kind:';
  kindRow.appendChild(kindLbl);
  for (const [key, label] of HAND_KINDS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-chip' + ((opts.filter.kind || 'any') === key ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      opts = { ...opts, filter: { ...opts.filter, kind: key } };
      refreshReplay();
    });
    kindRow.appendChild(btn);
  }
  els.replayFilterBar.appendChild(kindRow);

  // Hand-browser counter
  const counter = document.createElement('div');
  counter.className = 'filter-row filter-actions-row';
  const span = document.createElement('span');
  span.className = 'filter-counter';
  const globalFiltered = getFilteredHands();
  const replayFiltered = applyReplayFilter(globalFiltered);
  span.textContent = replayFiltered.length === globalFiltered.length
    ? `${replayFiltered.length.toLocaleString()} hands in browser`
    : `${replayFiltered.length.toLocaleString()} of ${globalFiltered.length.toLocaleString()} hands match`;
  counter.appendChild(span);
  els.replayFilterBar.appendChild(counter);
}

// Re-render replay filter UI + hand browser without recomputing the chart.
// Fast path for position/rank/kind chip clicks.
function refreshReplay() {
  renderReplayFilterBar();
  const globalFiltered = getFilteredHands();
  renderHandBrowserFiltered(applyReplayFilter(globalFiltered));
}

function toDatetimeLocalValue(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pickSeriesForMode(compute) {
  return opts.beforeRake ? compute.seriesBefore : compute.seriesAfter;
}

// Stable hash of the inputs that affect what computeSeries returns.
// (beforeRake is NOT in this key — both modes are computed in one pass and
// cached together, so the toggle is a free pivot via pickSeriesForMode.)
function computeCacheKey() {
  // Only GLOBAL filter fields (date + stakes) feed the chart compute. Position
  // and rank/kind filters narrow only the hand-browser display — they don't
  // require a recompute, so they're absent from the key on purpose.
  return JSON.stringify({
    n: parsedHands.length,
    parsedHandsRef: !!parsedHands,
    dateMode: opts.filter.dateMode,
    customStart: opts.filter.customStart instanceof Date ? opts.filter.customStart.getTime() : null,
    customEnd: opts.filter.customEnd instanceof Date ? opts.filter.customEnd.getTime() : null,
    stakes: opts.filter.stakes ? [...opts.filter.stakes].sort((a,b)=>a-b) : null,
  });
}

// Fast path: re-render chart/controls only, no compute. Used when the user
// flips the rake toggle or changes a line-visibility checkbox; compute results
// are cached in `lastCompute` for the current filter set.
function rerenderFromCache() {
  if (!lastCompute) return false;
  const series = pickSeriesForMode(lastCompute);
  try { renderChart(series); } catch (e) { console.error('[poker] rerender chart failed:', e); return false; }
  renderControls();
  renderSummary(lastCompute.summary);
  // For a cached cloud-session view, `parsedHands` is empty — saveSession
  // would write hands=0 + zeroed finals to localStorage, clobbering the real
  // session snapshot. Skip the write; the cloud copy is the source of truth.
  if (!lastCompute.isCachedSession) {
    saveSession(series, lastCompute.summary);
  }
  return true;
}

async function renderAll() {
  // Cached-session view: a series.json.gz was downloaded into `lastCompute`
  // and `parsedHands` is empty by design (no per-hand metadata available).
  // Filtering, hand browser, replay are disabled in this mode — only the
  // rake toggle and line-visibility checkboxes apply, and both are free
  // pivots through rerenderFromCache().
  if (lastCompute && lastCompute.isCachedSession) {
    rerenderFromCache();
    renderPosition(lastCompute.summary);
    return;
  }

  const filtered = getFilteredHands();
  if (filtered.length === 0) {
    // Nothing to chart but still render both filter bars so user can change filter
    renderFilterBar();
    renderReplayFilterBar();
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    els.summary.replaceChildren();
    els.position.replaceChildren();
    if (els.handBrowser) { els.handBrowser.replaceChildren(); els.handBrowser.hidden = true; }
    els.chartFooter.textContent = parsedHands.length > 0 ? 'No hands match the current filter.' : '';
    hideChartSpinner();
    lastCompute = null;
    return;
  }

  // CACHE FAST-PATH: if the parsed-hand store + GLOBAL filter is the same as
  // last compute, the cached seriesBefore/seriesAfter are still valid. The
  // rake toggle becomes a free pivot — no recompute, no progress bar.
  const cacheKey = computeCacheKey();
  if (lastCompute && lastCompute.parsedHandsRef === parsedHands && lastCompute.cacheKey === cacheKey) {
    rerenderFromCache();
    renderFilterBar();
    renderReplayFilterBar();
    renderPosition(lastCompute.summary);
    renderHandBrowserFiltered(applyReplayFilter(filtered));
    return;
  }

  // Yield-aware compute path (cold or filter-changed).
  const tStart = performance.now();
  let maxGapMs = 0;
  let lastTick = tStart;
  let slowHandCount = 0;
  for (const h of filtered) { if (h.anyAllIn) slowHandCount++; }
  console.log(`[poker] renderAll start: ${filtered.length.toLocaleString()} hands, ${slowHandCount} potential all-in equity calcs`);

  showProgress({ stage: `Computing chart for ${filtered.length.toLocaleString()} hands`, current: 0, total: filtered.length });
  showChartSpinner(`Computing chart for ${filtered.length.toLocaleString()} hands`, '0%');
  await nextFrame();

  let compute;
  try {
    compute = await computeSeries(filtered, opts, {
      yieldEvery: 10,
      onProgress: (i, n) => {
        const now = performance.now();
        const gap = now - lastTick;
        if (gap > maxGapMs) maxGapMs = gap;
        lastTick = now;
        const label = `Computing chart — hand ${i.toLocaleString()} / ${n.toLocaleString()}`;
        showProgress({ stage: label, current: i, total: n });
        const pct = n > 0 ? Math.round((i / n) * 100) : 0;
        showChartSpinner(label, `${pct}%`);
      },
    });
  } catch (err) {
    console.error('[poker] computeSeries failed:', err);
    hideProgress();
    hideChartSpinner();
    showStatus(`Compute failed: ${err.message}`, 'error');
    return;
  }
  // Cache for subsequent rake-toggle / line-visibility re-renders.
  lastCompute = {
    parsedHandsRef: parsedHands,
    cacheKey: cacheKey,
    seriesBefore: compute.seriesBefore,
    seriesAfter:  compute.seriesAfter,
    summary:      compute.summary,
  };
  const series = pickSeriesForMode(lastCompute);
  const summary = compute.summary;

  const computeMs = performance.now() - tStart;
  console.log(`[poker] compute done: ${computeMs.toFixed(0)}ms total, max gap ${maxGapMs.toFixed(0)}ms between yields`);
  if (maxGapMs > 4000) {
    console.warn(`[poker] long single-block detected (${maxGapMs.toFixed(0)}ms). One hand had heavy uncached equity work — investigate hand range near hand ${Math.floor((maxGapMs / computeMs) * filtered.length)} / ${filtered.length}`);
  }

  hideProgress();
  showChartSpinner('Drawing chart…', '');
  await nextFrame();

  const tChart = performance.now();
  try {
    renderChart(series);
  } catch (err) {
    console.error('[poker] renderChart failed:', err);
    hideChartSpinner();
    showStatus(`Chart render failed: ${err.message}`, 'error');
    return;
  }
  console.log(`[poker] renderChart: ${(performance.now() - tChart).toFixed(0)}ms`);
  hideChartSpinner();

  await nextFrame();
  renderControls();
  renderSummary(summary);
  await nextFrame();
  renderPosition(summary);
  renderFilterBar();
  renderReplayFilterBar();
  await nextFrame();
  renderHandBrowserFiltered(applyReplayFilter(filtered));
  saveSession(series, summary);
  notifyCloudSessionLoaded();
  lastSummary = summary;
  console.log(`[poker] renderAll total: ${(performance.now() - tStart).toFixed(0)}ms`);
}

// === Hand browser (Phase 5a — click any hand to replay) ===

const HAND_PAGE_SIZE = 50;
let handPage = 0;

function handResultUC(h) {
  return h.collectedUC - h.contributedUC;
}

const SUIT_GLYPH = { h: '♥', d: '♦', s: '♠', c: '♣' };

function renderMiniCards(cards) {
  const wrap = document.createElement('span');
  wrap.className = 'mini-cards';
  for (const card of cards) {
    if (!card || card.length < 2) continue;
    const suit = card[card.length - 1];
    const rank = card.slice(0, -1);
    const c = document.createElement('span');
    c.className = 'mini-card suit-' + suit;
    const r = document.createElement('span');
    r.className = 'mini-card-rank';
    r.textContent = rank;
    const s = document.createElement('span');
    s.className = 'mini-card-suit';
    s.textContent = SUIT_GLYPH[suit] || suit;
    c.appendChild(r);
    c.appendChild(s);
    wrap.appendChild(c);
  }
  return wrap;
}

function renderHandBrowserFiltered(filtered) {
  const el = els.handBrowser;
  if (!el) return;
  el.replaceChildren();
  if (filtered.length === 0) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  handPage = Math.min(handPage, Math.floor((filtered.length - 1) / HAND_PAGE_SIZE));
  // Use `filtered` instead of the global `parsedHands` so the browser respects filters.
  const hands = filtered;

  const title = document.createElement('h3');
  title.textContent = `Hand browser — click any hand to replay`;
  el.appendChild(title);

  const pager = document.createElement('div');
  pager.className = 'hand-pager';
  el.appendChild(pager);

  const list = document.createElement('div');
  list.className = 'hand-list';
  el.appendChild(list);

  function renderPage() {
    const totalPages = Math.max(1, Math.ceil(hands.length / HAND_PAGE_SIZE));
    const start = handPage * HAND_PAGE_SIZE;
    const end = Math.min(start + HAND_PAGE_SIZE, hands.length);

    pager.replaceChildren();
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'hand-pager-btn';
    prev.textContent = '‹ Prev';
    prev.disabled = handPage === 0;
    prev.addEventListener('click', () => { handPage = Math.max(0, handPage - 1); renderPage(); });

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'hand-pager-btn';
    next.textContent = 'Next ›';
    next.disabled = handPage >= totalPages - 1;
    next.addEventListener('click', () => { handPage = Math.min(totalPages - 1, handPage + 1); renderPage(); });

    const info = document.createElement('span');
    info.className = 'hand-pager-info';
    info.textContent = `Hands ${(start + 1).toLocaleString()}–${end.toLocaleString()} of ${hands.length.toLocaleString()} · Page ${handPage + 1} / ${totalPages}`;

    pager.append(prev, info, next);

    list.replaceChildren();
    for (let i = start; i < end; i++) {
      const h = hands[i];
      const row = document.createElement('div');
      row.className = 'hand-row';
      const resultUC = handResultUC(h);
      const resultCls = resultUC > 0n ? 'win' : resultUC < 0n ? 'loss' : 'neutral';

      const handNum = document.createElement('span');
      handNum.className = 'hand-num';
      handNum.textContent = `#${(i + 1).toLocaleString()}`;

      const idCell = document.createElement('span');
      idCell.className = 'hand-id';
      idCell.textContent = h.id;

      const dateCell = document.createElement('span');
      dateCell.className = 'hand-date';
      dateCell.textContent = formatDateShort(h.date);

      const posCell = document.createElement('span');
      posCell.className = 'hand-pos';
      posCell.textContent = h.hero.position || '?';

      const cardsCell = document.createElement('span');
      cardsCell.className = 'hand-cards';
      if (h.hero.cards && h.hero.cards.length > 0) {
        cardsCell.appendChild(renderMiniCards(h.hero.cards));
      } else {
        cardsCell.textContent = '—';
      }

      const resultCell = document.createElement('span');
      resultCell.className = 'hand-result ' + resultCls;
      resultCell.textContent = formatUSD(resultUC);

      const replayBtn = document.createElement('button');
      replayBtn.type = 'button';
      replayBtn.className = 'hand-replay-btn';
      replayBtn.textContent = '▶ Replay';
      replayBtn.addEventListener('click', () => openReplay(h, i));

      row.append(handNum, idCell, dateCell, posCell, cardsCell, resultCell, replayBtn);
      list.appendChild(row);
    }
  }

  renderPage();
}

function formatDateShort(iso) {
  // "2026-05-21T03:18:50Z" → "05-21 03:18"
  if (!iso) return '';
  return iso.slice(5, 10) + ' ' + iso.slice(11, 16);
}

async function openReplay(hand, index) {
  try {
    // Phase 5b: animated SVG viewer (with a text-log tab as fallback).
    const { showReplay } = await import('./replay/animated-replay.js');
    showReplay(hand.text, { title: `Hand #${(index + 1).toLocaleString()} — ${hand.id}` });
  } catch (err) {
    console.error('replay open failed', err);
    alert('Could not open replay: ' + err.message);
  }
}

// Custom plugin: draw a thick, prominent horizontal line at y=0 so the
// win/loss boundary is unambiguous. Renders BEFORE datasets so data lines
// stay on top.
const zeroLinePlugin = {
  id: 'zeroLine',
  beforeDatasetsDraw(chart) {
    const yScale = chart.scales?.y;
    if (!yScale) return;
    // Skip if zero is outside the visible y-range
    const yMin = yScale.min, yMax = yScale.max;
    if (yMin > 0 || yMax < 0) return;
    const y = yScale.getPixelForValue(0);
    const { left, right } = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.stroke();
    // Soft halo for extra emphasis without being garish
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.stroke();
    ctx.restore();
  },
};

// Custom plugin: draw a vertical crosshair line at the hovered hand position
const crosshairPlugin = {
  id: 'crosshair',
  afterDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.();
    if (!active || active.length === 0) return;
    const x = active[0].element.x;
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.restore();
  },
};

// Downsample a BigInt[] series + index labels to at most MAX_CHART_POINTS,
// always preserving the final point so the cumulative end value stays exact.
// 'min-max' style: bucket the series and pick one representative per bucket.
const MAX_CHART_POINTS = 5000;

function downsampleSeries(series, n) {
  if (n <= MAX_CHART_POINTS) {
    const labels = Array.from({ length: n }, (_, i) => i + 1);
    return { labels, series, downsampled: false };
  }
  const targetPoints = MAX_CHART_POINTS;
  const stride = n / targetPoints; // float stride for even spacing
  const labels = [];
  const out = {};
  for (const k of Object.keys(series)) out[k] = [];
  for (let i = 0; i < targetPoints; i++) {
    const idx = Math.min(n - 1, Math.floor(i * stride));
    labels.push(idx + 1);
    for (const k of Object.keys(series)) out[k].push(series[k][idx]);
  }
  // Always include the final point so the cumulative end stays exact.
  if (labels[labels.length - 1] !== n) {
    labels.push(n);
    for (const k of Object.keys(series)) out[k].push(series[k][n - 1]);
  }
  return { labels, series: out, downsampled: true };
}

function renderChart(rawSeries) {
  if (chartInstance) chartInstance.destroy();
  const rawN = rawSeries.winningsUC.length;
  const { labels, series, downsampled } = downsampleSeries(rawSeries, rawN);
  const n = labels.length;

  const datasets = [];
  if (opts.lines.winnings) datasets.push(mkDataset('Winnings', series.winningsUC, COLORS.winnings));
  if (opts.lines.ev)       datasets.push(mkDataset('All-in EV', series.evUC, COLORS.ev));
  if (opts.lines.red)      datasets.push(mkDataset('Red (non-SD)', series.redUC, COLORS.red));
  if (opts.lines.blue)     datasets.push(mkDataset('Blue (SD)', series.blueUC, COLORS.blue));

  chartInstance = new Chart(els.chartCanvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets },
    plugins: [zeroLinePlugin, crosshairPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          ticks: {
            color: '#a0a0b0',
            // Chart.js picks ~maxTicksLimit evenly-spaced ticks from the
            // visible index range and rotates labels as needed. Robust to
            // downsampling because we no longer require labels to be exact
            // multiples of a step — we just stamp whatever hand-number the
            // label-array carries at each chosen index.
            autoSkip: true,
            maxRotation: 0,
            minRotation: 0,
            maxTicksLimit: 12,
            callback: function(value) {
              // `value` is the absolute data index (0..n-1). The label at
              // that index is the actual hand number (= index+1 when not
              // downsampled, sparser when downsampled to <=5000 chart points).
              const labelArr = this.chart.data.labels;
              const handNum = labelArr ? labelArr[value] : value + 1;
              if (handNum == null) return '';
              return handNum.toLocaleString();
            },
          },
          grid: { color: 'rgba(255,255,255,0.04)', drawTicks: true, tickColor: 'rgba(255,255,255,0.15)' },
        },
        y: {
          position: 'right',
          ticks: { color: '#a0a0b0', callback: v => '$' + v.toFixed(2), maxTicksLimit: 10 },
          grid: {
            color: 'rgba(255,255,255,0.12)',
            lineWidth: 1,
            drawTicks: true,
            tickColor: 'rgba(255,255,255,0.25)',
            // Highlight the $0 line — important reference
            z: 1,
          },
          border: { color: 'rgba(255,255,255,0.2)' },
        },
      },
      plugins: {
        legend: { labels: { color: '#a0a0b0' } },
        tooltip: {
          callbacks: {
            title: ctx => `Hand ${ctx[0].label}`,
            label: ctx => {
              const uc = BigInt(Math.round(ctx.parsed.y * 1e6));
              return `${ctx.dataset.label}: ${formatUSD(uc)}`;
            },
          },
        },
        zoom: {
          zoom: {
            drag: {
              enabled: true,
              backgroundColor: 'rgba(74,222,128,0.15)',
              borderColor: 'rgba(74,222,128,0.6)',
              borderWidth: 1,
            },
            wheel: { enabled: true, modifierKey: 'shift' },
            pinch: { enabled: true },
            mode: 'x',
            onZoomComplete: ({ chart }) => updateZoomOutButton(chart),
          },
          pan: {
            enabled: true,
            mode: 'x',
            modifierKey: 'alt',
            onPanComplete: ({ chart }) => updateZoomOutButton(chart),
          },
          limits: { x: { min: 'original', max: 'original', minRange: 5 } },
        },
      },
    },
  });

  const handCountRaw = rawN.toLocaleString();
  const downsampleNote = downsampled
    ? `  •  showing ${n.toLocaleString()} sample points (auto-downsampled from ${handCountRaw} for performance — final value exact)`
    : '';
  els.chartFooter.textContent = `${handCountRaw} of ${handCountRaw} Hands${downsampleNote}  •  drag to zoom range  •  shift+wheel to zoom  •  alt+drag to pan`;
}

export function resetChartZoom() {
  if (chartInstance && typeof chartInstance.resetZoom === 'function') {
    chartInstance.resetZoom();
    updateZoomOutButton(chartInstance);
  }
}

function updateZoomOutButton(chart) {
  const btn = document.getElementById('chartZoomOutBtn');
  if (!btn || !chart) return;
  const xScale = chart.scales.x;
  const totalLen = chart.data.labels.length;
  const isZoomed = xScale.min > 0 || xScale.max < totalLen - 1;
  btn.hidden = !isZoomed;
}

// Wire the zoom-out button once
const zoomOutBtn = document.getElementById('chartZoomOutBtn');
if (zoomOutBtn) {
  zoomOutBtn.addEventListener('click', () => {
    if (chartInstance && typeof chartInstance.resetZoom === 'function') {
      chartInstance.resetZoom();
      updateZoomOutButton(chartInstance);
    }
  });
}

function mkDataset(label, ucSeries, color) {
  return {
    label,
    data: ucSeries.map(uc => ucToDollars(uc)),
    borderColor: color,
    backgroundColor: color,
    borderWidth: 1.5,
    pointRadius: 0,
    pointHoverRadius: 3,
    stepped: 'before',
    tension: 0,
  };
}

function renderControls() {
  els.chartControls.replaceChildren();
  const lines = [
    ['winnings', 'Winnings', COLORS.winnings],
    ['ev',       'All-in EV', COLORS.ev],
    ['red',      'Red (non-SD)', COLORS.red],
    ['blue',     'Blue (SD)', COLORS.blue],
  ];
  for (const [key, label, color] of lines) {
    els.chartControls.appendChild(makeToggle(label, color, opts.lines[key], (checked) => {
      opts = { ...opts, lines: { ...opts.lines, [key]: checked } };
      renderAll();
    }));
  }
  // Rake toggle
  els.chartControls.appendChild(makeToggle('Before rake', null, opts.beforeRake, (checked) => {
    opts = { ...opts, beforeRake: checked };
    renderAll();
  }));
}

function makeToggle(label, color, checked, onChange) {
  const lbl = document.createElement('label');
  lbl.className = 'series-toggle';
  if (color) lbl.style.color = color;
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = checked;
  cb.addEventListener('change', () => onChange(cb.checked));
  lbl.appendChild(cb);
  lbl.appendChild(document.createTextNode(' ' + label));
  return lbl;
}

function renderSummary(summary) {
  els.summary.replaceChildren();

  // Title at the top
  const title = document.createElement('h3');
  title.className = 'summary-title';
  title.textContent = 'Summary';
  els.summary.appendChild(title);

  // Helper to build one stat block
  function statBlock(label, value, opts = {}) {
    const block = document.createElement('div');
    block.className = 'stat-block' + (opts.kind ? ` stat-${opts.kind}` : '');
    const v = document.createElement('div');
    v.className = 'stat-value';
    v.textContent = value;
    const l = document.createElement('div');
    l.className = 'stat-label';
    l.textContent = label;
    block.appendChild(v);
    block.appendChild(l);
    return block;
  }

  // Header strip: Hands + Rake paid as compact stat tiles
  const header = document.createElement('div');
  header.className = 'summary-header-row';
  header.appendChild(statBlock('Total hands', summary.hands.toLocaleString()));
  header.appendChild(statBlock(
    'Rake paid',
    `${formatUSD(summary.rakePaidUC)}  ·  ${summary.rakeBbPer100.toFixed(2)} bb/100`,
    { kind: 'rake' },
  ));
  els.summary.appendChild(header);

  // Comparison cards: Before rake | After rake (side by side on desktop)
  const cards = document.createElement('div');
  cards.className = 'summary-cards-row';

  function buildCard(heading, kind, totalUC, bbPer100, evBbPer100) {
    const card = document.createElement('div');
    card.className = 'summary-card stat-' + kind;
    const h = document.createElement('div');
    h.className = 'summary-card-title';
    h.textContent = heading;
    card.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'summary-card-grid';
    grid.appendChild(statBlock('Total', formatUSD(totalUC)));
    grid.appendChild(statBlock('bb/100', bbPer100.toFixed(2)));
    grid.appendChild(statBlock('All-in EV bb/100', evBbPer100.toFixed(2)));
    card.appendChild(grid);
    return card;
  }

  cards.appendChild(buildCard(
    'Before rake',
    'before',
    summary.totalBeforeUC,
    summary.bbPer100Before,
    summary.evBbPer100Before,
  ));
  cards.appendChild(buildCard(
    'After rake',
    'after',
    summary.totalAfterUC,
    summary.bbPer100After,
    summary.evBbPer100After,
  ));
  els.summary.appendChild(cards);
}

function renderPosition(summary) {
  els.position.replaceChildren();
  const title = document.createElement('h3');
  title.textContent = 'By position';
  els.position.appendChild(title);
  const table = document.createElement('table');
  table.className = 'pos-table';
  const head = document.createElement('tr');
  ['Position', 'Hands', 'Total'].forEach(h => {
    const th = document.createElement('th'); th.textContent = h; head.appendChild(th);
  });
  table.appendChild(head);
  const positions = Object.entries(summary.byPosition).sort((a, b) => {
    const ai = POS_ORDER.indexOf(a[0]); const bi = POS_ORDER.indexOf(b[0]);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
  for (const [pos, { count, totalUC }] of positions) {
    const tr = document.createElement('tr');
    [pos, count.toLocaleString(), formatUSD(totalUC)].forEach(t => {
      const td = document.createElement('td'); td.textContent = t; tr.appendChild(td);
    });
    table.appendChild(tr);
  }
  els.position.appendChild(table);
}

// === LocalStorage session save ===

function saveSession(series, summary) {
  try {
    const payload = {
      ts: Date.now(),
      hands: parsedHands.length,
      opts,
      summary: {
        hands: summary.hands,
        totalUC: summary.totalUC.toString(),
        evTotalUC: summary.evTotalUC.toString(),
        evMinusWinUC: summary.evMinusWinUC.toString(),
        bbPer100: summary.bbPer100,
        rakePaidUC: summary.rakePaidUC.toString(),
        rakeBbPer100: summary.rakeBbPer100,
      },
      finals: {
        winnings: series.winningsUC.at(-1)?.toString() ?? '0',
        ev: series.evUC.at(-1)?.toString() ?? '0',
        red: series.redUC.at(-1)?.toString() ?? '0',
        blue: series.blueUC.at(-1)?.toString() ?? '0',
      },
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch (_) {
    // Quota — silently ignore
  }
}

// === Cached cloud-session rendering ===

/**
 * Populate the chart + summary + position panel from a pre-computed cloud
 * session (series.json.gz) without parsing any hands. The drop zone is
 * collapsed and the filter bar / hand browser are hidden because we don't
 * have the per-hand metadata that filters or replays would need.
 *
 * Rake toggle and line-visibility checkboxes still work — both `seriesBefore`
 * and `seriesAfter` are in the payload, so the toggle is a free pivot.
 *
 * @param {Object} args
 * @param {Object} args.summary       Rehydrated summary (BigInts already cast back)
 * @param {Object} args.seriesBefore  { winningsUC, evUC, redUC, blueUC } — BigInt[]
 * @param {Object} args.seriesAfter   same shape
 * @param {number} args.handCount     Total hands the session represented
 * @param {Object} [args.sessionMeta] { sessionId, createdAt, fileNames }
 */
export async function loadCachedSession({ summary, seriesBefore, seriesAfter, handCount, sessionMeta }) {
  if (!summary || !seriesBefore || !seriesAfter) {
    throw new Error('loadCachedSession: missing summary or series');
  }
  // Drop any locally-parsed hands — the cached view replaces them so the
  // chart, summary, and position card all refer to the same dataset.
  allHandsById.clear();
  allFiles.clear();
  parsedHands = [];
  originalFiles = [];
  lastSummary = summary;

  // Synthesize the cache record that rerenderFromCache + renderAll's
  // short-circuit branch both read from.
  lastCompute = {
    parsedHandsRef: null,
    cacheKey: `cached-session:${sessionMeta?.sessionId || 'unknown'}`,
    seriesBefore,
    seriesAfter,
    summary,
    isCachedSession: true,
    sessionMeta: sessionMeta || null,
    handCount,
  };

  // Show the results panel; hide both filter bars + hand browser (none has the
  // per-hand metadata it needs in this cached-session view).
  els.results.hidden = false;
  if (els.filterBar) { els.filterBar.replaceChildren(); els.filterBar.hidden = true; }
  if (els.replayFilterBar) { els.replayFilterBar.replaceChildren(); els.replayFilterBar.hidden = true; }
  if (els.handBrowser) { els.handBrowser.replaceChildren(); els.handBrowser.hidden = true; }

  // Collapse the drop-zone the same way a local upload does — keeps the chart
  // the dominant element on screen.
  collapseUploadZone();
  updateCompactPillLabel();

  // Status banner: cosmetic, mirrors what handleFiles writes after parse.
  const fileLabel = sessionMeta?.fileNames?.length
    ? `${sessionMeta.fileNames.length} file${sessionMeta.fileNames.length === 1 ? '' : 's'}`
    : 'cloud session';
  const idShort = sessionMeta?.sessionId ? ` · ${sessionMeta.sessionId.slice(-8)}` : '';
  showStatus(`☁ Opened cached session${idShort} · ${handCount.toLocaleString()} hands · ${fileLabel}`, 'ok');

  // Drive the actual draw via the existing renderAll path — its first guard
  // hits the cached-session branch and re-uses rerenderFromCache + renderPosition.
  await renderAll();
}
