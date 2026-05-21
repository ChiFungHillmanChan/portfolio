// js/upload.js
import { parseFile } from './parser/gg-parser.mjs';
import { computeSeries } from './stats/compute.mjs';
import { ucToDollars, formatUSD } from './stats/money.mjs';

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
};

const COLORS = {
  winnings: '#4ade80',
  ev: '#fb923c',
  red: '#ef4444',
  blue: '#3b82f6',
};
const POS_ORDER = ['BTN', 'SB', 'BB', 'UTG', 'LJ', 'HJ', 'CO'];
const SESSION_KEY = 'poker-upload-session-v1';

let parsedHands = [];
let opts = { beforeRake: true, lines: { winnings: true, ev: true, red: true, blue: true } };
let chartInstance = null;

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

async function handleFiles(files) {
  if (files.length === 0) return;
  showStatus(`Reading ${files.length} files...`);
  parsedHands = [];
  const rejected = [];
  let skippedHands = 0;
  for (const f of files) {
    try {
      const text = await f.text();
      const r = parseFile(f.name, text);
      if (r.hands.length === 0 && r.errors && r.errors.length > 0) {
        rejected.push({ name: f.name, reason: r.errors[0] });
        continue;
      }
      parsedHands.push(...r.hands);
      skippedHands += r.skipped;
    } catch (e) {
      rejected.push({ name: f.name, reason: `read error: ${e.message}` });
    }
  }
  if (parsedHands.length === 0) {
    const reasons = rejected.map(r => `• ${r.name}: ${r.reason}`).join('\n');
    showStatus(`No valid hands parsed.\n${reasons}`, 'error');
    return;
  }
  // Sort hands chronologically so the chart matches GGPoker's display
  // (8 files of overlapping time windows must be interleaved by timestamp)
  parsedHands.sort((a, b) => a.date.localeCompare(b.date));
  const skipMsg = skippedHands ? `, skipped ${skippedHands} malformed` : '';
  const rejMsg = rejected.length ? `, rejected ${rejected.length} files` : '';
  showStatus(`Parsed ${parsedHands.length.toLocaleString()} hands from ${files.length - rejected.length} files${skipMsg}${rejMsg}`);
  // Defer render so the status message paints first (equity calc may take a few seconds)
  setTimeout(() => {
    renderAll();
    els.results.hidden = false;
  }, 16);
}

function showStatus(msg, kind = 'info') {
  els.status.hidden = false;
  els.status.textContent = msg;
  els.status.dataset.kind = kind;
}

// === Render ===

function renderAll() {
  const { series, summary } = computeSeries(parsedHands, opts);
  renderChart(series);
  renderControls();
  renderSummary(summary);
  renderPosition(summary);
  saveSession(series, summary);
}

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
            callback: function(value, index) {
              // Show only every 100th hand label (100, 200, ..., 1800)
              const handNum = index + 1; // labels are 1..n
              return handNum % 100 === 0 ? handNum : '';
            },
          },
          grid: { color: '#1f1f2a' },
        },
        y: { position: 'right', ticks: { color: '#a0a0b0', callback: v => '$' + v.toFixed(2) }, grid: { color: '#1f1f2a' } },
      },
      plugins: {
        legend: { labels: { color: '#a0a0b0' } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const uc = BigInt(Math.round(ctx.parsed.y * 1e6));
              return `${ctx.dataset.label}: ${formatUSD(uc)}`;
            },
          },
        },
      },
    },
  });

  const handCount = n.toLocaleString();
  els.chartFooter.textContent = `${handCount} of ${handCount} Hands`;
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
