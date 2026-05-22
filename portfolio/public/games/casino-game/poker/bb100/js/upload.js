// js/upload.js
import { parseFile } from './parser/gg-parser.mjs';
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
  uploadSummaryBanner: document.getElementById('uploadSummaryBanner'),
};

const COLORS = {
  winnings: '#4ade80',
  ev: '#fb923c',
  red: '#ef4444',
  blue: '#3b82f6',
};
const POS_ORDER = ['BTN', 'SB', 'BB', 'UTG', 'LJ', 'HJ', 'CO'];
const SESSION_KEY = 'poker-upload-session-v1';

// Master store — keyed by hand.id so re-uploads dedupe naturally.
const allHandsById = new Map();
// Sorted view (chronological); rebuilt lazily after any merge/clear.
let parsedHands = [];
// Files seen, deduped by name+size+lastModified key.
const allFiles = new Map();
let originalFiles = [];
let lastSummary = null;
// opts.filter: dateMode ∈ ['all','today','last-1h','last-3h','last-24h','custom'].
let opts = {
  beforeRake: true,
  lines: { winnings: true, ev: true, red: true, blue: true },
  filter: { dateMode: 'all', customStart: null, customEnd: null, stakes: null },
};
let chartInstance = null;

// Notify cloud bootstrap when a session is loaded (no hard dependency — cloud module is loaded as a sibling script)
function notifyCloudSessionLoaded() {
  if (parsedHands.length === 0) return;
  // Dynamic import keeps cloud code out of the critical path for logged-out users.
  import('./cloud/session-state.js')
    .then(({ setCurrentSession }) => {
      setCurrentSession({ hands: parsedHands, files: originalFiles, summary: lastSummary });
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

async function handleFiles(files) {
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

    // Phase B: parse each file, merge into master Map (dedup by hand.id)
    showProgress({ stage: 'Parsing hands', current: 0, total: 0, indeterminate: true });
    await nextFrame();
    for (let i = 0; i < fileTexts.length; i++) {
      const ft = fileTexts[i];
      if (!ft) continue;
      try {
        const r = parseFile(ft.name, ft.text);
        if (r.hands.length === 0 && r.errors && r.errors.length > 0) {
          rejected.push({ name: ft.name, reason: r.errors[0] });
          continue;
        }
        for (const hand of r.hands) {
          if (allHandsById.has(hand.id)) {
            dupHands++;
            continue;
          }
          allHandsById.set(hand.id, hand);
          newHands++;
        }
        // Track the source File so cloud save can include it
        const key = fileKey(ft.file);
        if (!allFiles.has(key)) allFiles.set(key, ft.file);
        skippedHands += r.skipped;
        showProgress({
          stage: `Parsing hands — ${newHands.toLocaleString()} new, ${dupHands.toLocaleString()} duplicate`,
          indeterminate: true,
        });
        await nextFrame();
      } catch (e) {
        rejected.push({ name: ft.name, reason: `parse error: ${e.message}` });
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

    // Phase C: compute series + render
    showProgress({ stage: `Computing chart for ${parsedHands.length.toLocaleString()} hands`, indeterminate: true });
    await nextFrame();

    const parts = [];
    if (newHands > 0) parts.push(`✓ Added ${newHands.toLocaleString()} new hands`);
    if (dupHands > 0) parts.push(`${dupHands.toLocaleString()} duplicates skipped`);
    if (skippedHands > 0) parts.push(`${skippedHands} malformed skipped`);
    if (rejected.length > 0) parts.push(`${rejected.length} files rejected`);
    const summaryStatus = parts.join(' · ') + ` · Total: ${parsedHands.length.toLocaleString()} hands across ${originalFiles.length} files`;
    showStatus(summaryStatus, newHands > 0 ? 'ok' : 'info');

    await nextFrame();
    renderAll();
    els.results.hidden = false;
  } finally {
    // Guarantee the progress bar always clears even if compute throws.
    hideProgress();
  }
}

// Clear all uploaded hands and reset state.
export function clearAllUploads() {
  if (allHandsById.size === 0) return;
  if (!confirm(`Clear all ${allHandsById.size.toLocaleString()} uploaded hands?`)) return;
  allHandsById.clear();
  allFiles.clear();
  parsedHands = [];
  originalFiles = [];
  lastSummary = null;
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  els.results.hidden = true;
  showStatus('Cleared. Upload hand-history files to start over.', 'info');
  if (els.filterBar) els.filterBar.replaceChildren();
  if (els.handBrowser) { els.handBrowser.replaceChildren(); els.handBrowser.hidden = true; }
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

function getFilteredHands() {
  if (parsedHands.length === 0) return parsedHands;
  const [start, end] = filterDateRange();
  const stakeFilter = opts.filter.stakes;
  if (!start && !end && (!stakeFilter || stakeFilter.size === 0)) return parsedHands;
  return parsedHands.filter((h) => {
    if (start || end) {
      const d = new Date(h.date);
      if (start && d < start) return false;
      if (end && d > end) return false;
    }
    if (stakeFilter && stakeFilter.size > 0) {
      // Stake key: bb amount in micro-cents (BigInt) → cents for comparison
      const bbCents = Number(h.stake.bbUC / 10000n);
      if (!stakeFilter.has(bbCents)) return false;
    }
    return true;
  });
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

function toDatetimeLocalValue(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderAll() {
  const filtered = getFilteredHands();
  if (filtered.length === 0) {
    // Nothing to chart but still render the filter bar so user can change filter
    renderFilterBar();
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    els.summary.replaceChildren();
    els.position.replaceChildren();
    if (els.handBrowser) { els.handBrowser.replaceChildren(); els.handBrowser.hidden = true; }
    els.chartFooter.textContent = parsedHands.length > 0 ? 'No hands match the current filter.' : '';
    return;
  }
  const { series, summary } = computeSeries(filtered, opts);
  lastSummary = summary;
  renderChart(series);
  renderControls();
  renderSummary(summary);
  renderPosition(summary);
  renderFilterBar();
  renderHandBrowserFiltered(filtered);
  saveSession(series, summary);
  notifyCloudSessionLoaded();
}

// === Hand browser (Phase 5a — click any hand to replay) ===

const HAND_PAGE_SIZE = 50;
let handPage = 0;

function handResultUC(h) {
  return h.collectedUC - h.contributedUC;
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
      cardsCell.textContent = h.hero.cards ? h.hero.cards.join(' ') : '— —';

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

function renderChart(series) {
  if (chartInstance) chartInstance.destroy();
  const n = series.winningsUC.length;
  const labels = Array.from({ length: n }, (_, i) => i + 1);

  const datasets = [];
  if (opts.lines.winnings) datasets.push(mkDataset('Winnings', series.winningsUC, COLORS.winnings));
  if (opts.lines.ev)       datasets.push(mkDataset('All-in EV', series.evUC, COLORS.ev));
  if (opts.lines.red)      datasets.push(mkDataset('Red (non-SD)', series.redUC, COLORS.red));
  if (opts.lines.blue)     datasets.push(mkDataset('Blue (SD)', series.blueUC, COLORS.blue));

  chartInstance = new Chart(els.chartCanvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets },
    plugins: [crosshairPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          ticks: {
            color: '#a0a0b0',
            autoSkip: false,
            callback: function(value) {
              // `value` is the absolute data index (0..n-1). Hand number = value + 1.
              // Adapt tick label density to visible range so labels are useful when zoomed.
              const handNum = value + 1;
              const visible = (this.max ?? 0) - (this.min ?? 0) + 1;
              let step;
              if (visible > 1000)      step = 100;
              else if (visible > 400)  step = 50;
              else if (visible > 200)  step = 25;
              else if (visible > 100)  step = 10;
              else if (visible > 40)   step = 5;
              else if (visible > 15)   step = 2;
              else                     step = 1;
              return handNum % step === 0 ? handNum : '';
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

  const handCount = n.toLocaleString();
  els.chartFooter.textContent = `${handCount} of ${handCount} Hands  •  drag to zoom range  •  shift+wheel to zoom  •  alt+drag to pan`;
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
  const rows = [
    ['Hands', summary.hands.toLocaleString()],
    [`Total ${opts.beforeRake ? '(before rake)' : '(after rake)'}`, formatUSD(summary.totalUC)],
    ['bb/100', summary.bbPer100.toFixed(2)],
    ['All-in EV − Winnings', formatUSD(summary.evMinusWinUC)],
    ['Rake paid', `${formatUSD(summary.rakePaidUC)} (${summary.rakeBbPer100.toFixed(2)} bb/100)`],
  ];
  for (const [label, value] of rows) {
    const row = document.createElement('div');
    row.className = 'summary-row';
    const l = document.createElement('span'); l.className = 'summary-label'; l.textContent = label;
    const v = document.createElement('span'); v.className = 'summary-value'; v.textContent = value;
    row.appendChild(l); row.appendChild(v);
    els.summary.appendChild(row);
  }
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
