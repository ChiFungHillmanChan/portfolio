// share.js — Renders the public poker stats share page at /p/{id}.
//
// Built to look IDENTICAL to the main recorder's results layout:
// .chart-card + .upload-summary + .position-card use the same class names
// and the same renderControls / renderSummary / renderPosition DOM shape
// as upload.js. The CSS is mirrored from upload.css so the viewer reads
// exactly like the owner's own page (minus per-hand replay).
//
// Snapshot semantics: data is fetched once from /poker/get-stats-share,
// frozen at share-create time, and never updated. Owner deleting their
// session in the recorder does NOT affect this view.

const API = "https://api.system-design.hillmanchan.com/poker";

const $ = (sel) => document.querySelector(sel);

const COLORS = {
  winnings: "#4ade80",
  ev:       "#fb923c",
  red:      "#ef4444",
  blue:     "#3b82f6",
};

// Same order the main app uses to sort the by-position table.
const POS_ORDER = ["UTG", "UTG+1", "UTG+2", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"];

const state = {
  payload: null,
  shareId: null,
  // Toggle defaults match the main recorder:
  //   • beforeRake = false (After-rake by default)
  //   • lines.winnings + lines.ev on; red/blue off
  beforeRake: false,
  lines: { winnings: true, ev: true, red: false, blue: false },
  chart: null,
};

// ── Boot ────────────────────────────────────────────────────────────────────

// The share viewer is reached via CloudFront URL rewrite /p/{id} → the
// static HTML on the origin. The browser still sees /p/{id}, so we read
// the ID from location.pathname (with ?id= as a dev fallback).
const params = new URLSearchParams(location.search);
const pathMatch = /^\/p\/([A-Za-z0-9_-]{8,32})\/?$/.exec(location.pathname);
state.shareId = pathMatch ? pathMatch[1] : params.get("id");

if (!state.shareId || !/^[A-Za-z0-9_-]{8,32}$/.test(state.shareId)) {
  showError("Invalid share link", "The URL doesn't look like a real share ID.");
} else {
  loadShare(null);
}

$("#passwordForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const pw = $("#passwordInput").value;
  if (!pw || pw.length < 4) return;
  loadShare(pw);
});

// ── Fetch + render ──────────────────────────────────────────────────────────

async function loadShare(passwordAttempt) {
  showLoading();
  let res;
  try {
    res = await fetch(`${API}/get-stats-share`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ shareId: state.shareId, password: passwordAttempt || undefined }),
    });
  } catch {
    return showError("Connection error", "Could not reach the server. Check your network and try again.");
  }

  if (res.status === 404) return showError("Not found", "This share link doesn't exist or never did.");
  if (res.status === 410) {
    const body = await safeJson(res);
    if (body?.error === "revoked") return showError("Revoked", "The owner has revoked this share link.");
    if (body?.error === "expired") return showError("Expired", "This share link has expired.");
    return showError("Gone", "This share is no longer available.");
  }
  if (res.status === 403) {
    const body = await safeJson(res);
    if (body?.error === "wrong_password") {
      $("#passwordError").hidden = false;
      $("#passwordError").textContent = "Wrong password. Try again.";
      showPasswordGate();
      $("#passwordInput").value = "";
      $("#passwordInput").focus();
      return;
    }
    return showError("Access denied", "You don't have access to this share.");
  }
  if (res.status === 429) {
    // Lambda locks the share after 5 wrong password attempts. Surface the
    // remaining wait so the visitor knows it's not their network.
    const body = await safeJson(res);
    const wait = Math.max(1, Number(body?.retryAfter) || 60);
    $("#passwordError").hidden = false;
    $("#passwordError").textContent =
      `Too many wrong attempts. Try again in ${wait} second${wait === 1 ? "" : "s"}.`;
    showPasswordGate();
    $("#passwordInput").value = "";
    $("#passwordInput").focus();
    return;
  }
  if (!res.ok) return showError("Could not load", "Server returned an error. Try again later.");

  const data = await res.json();

  if (data.requiresPassword) {
    $("#passwordTitle").textContent = data.title ? `"${data.title}"` : "Enter the password to view this share.";
    $("#passwordError").hidden = true;
    showPasswordGate();
    setTimeout(() => $("#passwordInput").focus(), 80);
    return;
  }

  state.payload = data;
  showContent();
  renderTitleBlock(data);
  renderControls();
  renderChart();
  renderSummary(data.summary);
  renderPosition(data.summary?.byPosition || {});
  renderFooter(data);
  bindChartButtons();
}

// ── Title block ─────────────────────────────────────────────────────────────

function renderTitleBlock(p) {
  document.getElementById("pageTitle").textContent = `${p.title} — Poker Stats`;
  document.getElementById("title").textContent = p.title || "Shared poker stats";
  document.getElementById("handsChip").textContent =
    `${p.handsLabel || (p.summary?.hands ?? 0).toLocaleString()} hands`;
  const period = p.summary?.period;
  document.getElementById("periodChip").textContent = period || "Period: unspecified";
  document.getElementById("stakesChip").textContent = p.summary?.stakesBucket
    ? `Stakes: ${p.summary.stakesBucket}`
    : "Stakes: unspecified";
}

// ── Chart controls — mirrors upload.js#renderControls exactly ───────────────

function renderControls() {
  const root = document.getElementById("chartControls");
  root.replaceChildren();
  const lines = [
    ["winnings", "Winnings",      COLORS.winnings],
    ["ev",       "All-in EV",     COLORS.ev],
    ["red",      "Red (non-SD)",  COLORS.red],
    ["blue",     "Blue (SD)",     COLORS.blue],
  ];
  // Allow ALL toggles in the legend, even if the snapshot has an empty
  // series for that line — we just won't draw it (allZero check below).
  for (const [key, label, color] of lines) {
    root.appendChild(makeToggle(label, color, state.lines[key], (checked) => {
      state.lines[key] = checked;
      renderChart();
    }));
  }
  // Rake toggle — same DOM shape as the main app.
  root.appendChild(makeToggle("Before rake", null, state.beforeRake, (checked) => {
    state.beforeRake = checked;
    renderChart();
  }));
}

function makeToggle(label, color, checked, onChange) {
  const lbl = document.createElement("label");
  lbl.className = "series-toggle";
  if (color) lbl.style.color = color;
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = checked;
  cb.addEventListener("change", () => onChange(cb.checked));
  lbl.appendChild(cb);
  lbl.appendChild(document.createTextNode(" " + label));
  return lbl;
}

// ── Summary — mirrors upload.js#renderSummary exactly ───────────────────────

function renderSummary(summary) {
  const root = document.getElementById("summary");
  root.replaceChildren();
  if (!summary) return;

  const title = document.createElement("h3");
  title.className = "summary-title";
  title.textContent = "Summary";
  root.appendChild(title);

  const header = document.createElement("div");
  header.className = "summary-header-row";
  header.appendChild(statBlock("Total hands", (summary.hands || 0).toLocaleString()));
  // Rake paid: use the exact dollar amount from the owner's recorder. Older
  // snapshots (created before this field was added) fall back to the derived
  // totalBefore - totalAfter, which can drift a few cents but is still
  // better than showing $0 for legacy shares.
  const rakePaidUsd = Number.isFinite(Number(summary.rakePaidUsd)) && summary.rakePaidUsd !== 0
    ? Number(summary.rakePaidUsd)
    : (Number(summary.totalBefore) || 0) - (Number(summary.totalAfter) || 0);
  header.appendChild(statBlock(
    "Rake paid",
    `${formatUsd(rakePaidUsd)}  ·  ${(summary.rakeBbPer100 || 0).toFixed(2)} bb/100`,
    { kind: "rake" },
  ));
  root.appendChild(header);

  const cards = document.createElement("div");
  cards.className = "summary-cards-row";
  cards.appendChild(buildCard("Before rake", "before", summary.totalBefore, summary.bbPer100Before, summary.evBbPer100Before));
  cards.appendChild(buildCard("After rake",  "after",  summary.totalAfter,  summary.bbPer100After,  summary.evBbPer100After));
  root.appendChild(cards);
}

function statBlock(label, value, opts = {}) {
  const block = document.createElement("div");
  block.className = "stat-block" + (opts.kind ? ` stat-${opts.kind}` : "");
  const v = document.createElement("div");
  v.className = "stat-value";
  v.textContent = value;
  const l = document.createElement("div");
  l.className = "stat-label";
  l.textContent = label;
  block.appendChild(v);
  block.appendChild(l);
  return block;
}

function buildCard(heading, kind, total, bbPer100, evBbPer100) {
  const card = document.createElement("div");
  card.className = "summary-card stat-" + kind;
  const h = document.createElement("div");
  h.className = "summary-card-title";
  h.textContent = heading;
  card.appendChild(h);
  const grid = document.createElement("div");
  grid.className = "summary-card-grid";
  grid.appendChild(statBlock("Total", formatUsd(total)));
  grid.appendChild(statBlock("bb/100", (Number(bbPer100) || 0).toFixed(2)));
  grid.appendChild(statBlock("All-in EV bb/100", (Number(evBbPer100) || 0).toFixed(2)));
  card.appendChild(grid);
  return card;
}

// ── Position table — mirrors upload.js#renderPosition exactly ──────────────

function renderPosition(byPos) {
  const card = document.getElementById("positionCard");
  card.replaceChildren();
  if (!byPos || Object.keys(byPos).length === 0) {
    card.hidden = true;
    return;
  }
  card.hidden = false;

  const title = document.createElement("h3");
  title.textContent = "By position";
  card.appendChild(title);

  const table = document.createElement("table");
  table.className = "pos-table";
  const head = document.createElement("tr");
  ["Position", "Hands", "Total"].forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    head.appendChild(th);
  });
  table.appendChild(head);

  // Use the EXACT { count, totalUsd } the owner's recorder sees. The share
  // payload carries those numbers unchanged from compute.mjs — no derivation
  // on this end, so the table reads identically to the main app.
  const entries = Object.entries(byPos).sort((a, b) => {
    const ai = POS_ORDER.indexOf(a[0]); const bi = POS_ORDER.indexOf(b[0]);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });

  for (const [pos, row] of entries) {
    // Accept either the current shape ({count, totalUsd}) or the legacy
    // {hands, bbPer100} from earlier snapshots (no perfect $ recovery for
    // those — they were never sent — so totalUsd falls back to 0).
    const count = Number(row.count ?? row.hands) || 0;
    const totalUsd = Number(row.totalUsd) || 0;
    const tr = document.createElement("tr");
    [pos, count.toLocaleString(), formatUsd(totalUsd)].forEach((t) => {
      const td = document.createElement("td");
      td.textContent = t;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  }
  card.appendChild(table);
}

// ── Footer (created/expires meta) ───────────────────────────────────────────

function renderFooter(p) {
  const created = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—";
  const exp = p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : null;
  const views = typeof p.views === "number" ? `${p.views.toLocaleString()} views` : null;
  const parts = [`Created ${created}`];
  if (exp) parts.push(`Expires ${exp}`);
  else parts.push("No expiry");
  if (views) parts.push(views);
  document.getElementById("footerMeta").textContent = parts.join(" · ");
}

// ── Chart buttons ───────────────────────────────────────────────────────────

function bindChartButtons() {
  document.getElementById("zoomOutBtn").addEventListener("click", () => {
    if (state.chart && state.chart.resetZoom) {
      state.chart.resetZoom();
      document.getElementById("zoomOutBtn").hidden = true;
    }
  });
  document.getElementById("fullscreenBtn").addEventListener("click", () => {
    const wrap = document.querySelector(".chart-wrap");
    if (!document.fullscreenElement) wrap.requestFullscreen?.();
    else document.exitFullscreen?.();
  });
}

// ── Chart ───────────────────────────────────────────────────────────────────

function renderChart() {
  const p = state.payload;
  if (!p) return;
  const series = state.beforeRake ? p.seriesBefore : p.seriesAfter;
  if (!series || !series.winningsUC) return;

  const n = series.winningsUC.length;
  const handsTotal = p.summary.hands || n;
  // Approximate hand-number labels — used by pickNiceXTicks to anchor
  // gridlines at round hand counts (5,000 / 10,000…).
  const labels = Array.from({ length: n }, (_, i) => Math.round(((i + 1) / n) * handsTotal));

  // Chart always renders in $ to match the main app. UC → $ is just /1e6.
  const toY = (uc) => (uc || 0) / 1e6;

  // Build all FOUR datasets in a stable order — visibility flips via the
  // `hidden` flag instead of removing entries. This is what lets Chart.js
  // tween in place: the rake toggle keeps all four indices populated so
  // every point lerps from before-rake to after-rake smoothly. Dropping
  // entries would make Chart.js (index-matched) tween mismatched series.
  const allDatasets = [
    { ...mkDataset("Winnings",     (series.winningsUC || []).map(toY), COLORS.winnings), hidden: !state.lines.winnings },
    { ...mkDataset("All-in EV",    (series.evUC       || []).map(toY), COLORS.ev),       hidden: !state.lines.ev },
    { ...mkDataset("Red (non-SD)", (series.redUC      || []).map(toY), COLORS.red),      hidden: !state.lines.red },
    { ...mkDataset("Blue (SD)",    (series.blueUC     || []).map(toY), COLORS.blue),     hidden: !state.lines.blue },
  ];

  // Update in place when the x-axis is unchanged (rake / line toggle).
  // Destroy + recreate only on first render — the share payload is frozen
  // so subsequent toggles always reuse the same chart.
  if (state.chart && state.chart.data.labels.length === labels.length) {
    state.chart.data.labels = labels;
    state.chart.data.datasets.forEach((ds, i) => {
      const next = allDatasets[i];
      ds.data = next.data;
      ds.hidden = next.hidden;
    });
    state.chart.update();
    document.getElementById("chartFooter").textContent =
      `${handsTotal.toLocaleString()} hands · ${n.toLocaleString()} sample points · drag to zoom · shift+wheel to zoom · alt+drag to pan`;
    return;
  }
  if (state.chart) state.chart.destroy();

  state.chart = new Chart(document.getElementById("evChart").getContext("2d"), {
    type: "line",
    data: { labels, datasets: allDatasets },
    plugins: [zeroLinePlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      // Smooth tween for rake / line toggles. 450ms easeInOutCubic lets the
      // eye follow each point shifting from before-rake to after-rake.
      animation: { duration: 450, easing: "easeInOutCubic" },
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          afterBuildTicks: (scale) => {
            const labelArr = scale.chart.data.labels;
            const nice = pickNiceXTicks(labelArr, 7);
            if (nice.length > 0) scale.ticks = nice;
          },
          ticks: {
            color: "#a0a0b0",
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
            callback: function(value, index, allTicks) {
              const t = allTicks && allTicks[index];
              if (t && typeof t.displayLabel === "string") return t.displayLabel;
              const arr = this.chart.data.labels;
              const hand = arr ? arr[value] : value + 1;
              if (hand == null) return "";
              return Number(hand).toLocaleString();
            },
          },
          grid: { color: "rgba(255,255,255,0.04)", drawTicks: true, tickColor: "rgba(255,255,255,0.15)" },
        },
        y: {
          position: "right",
          ticks: {
            color: "#a0a0b0",
            callback: (v) => "$" + Number(v).toFixed(2),
            maxTicksLimit: 10,
          },
          grid: { color: "rgba(255,255,255,0.12)", lineWidth: 1, drawTicks: true, tickColor: "rgba(255,255,255,0.25)" },
          border: { color: "rgba(255,255,255,0.2)" },
        },
      },
      plugins: {
        legend: { labels: { color: "#a0a0b0" } },
        tooltip: {
          callbacks: {
            title: (ctx) => `Hand ${ctx[0].label}`,
            label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`,
          },
        },
        zoom: {
          zoom: {
            drag: { enabled: true, backgroundColor: "rgba(74,222,128,0.15)", borderColor: "rgba(74,222,128,0.6)", borderWidth: 1 },
            wheel: { enabled: true, modifierKey: "shift" },
            pinch: { enabled: true },
            mode: "x",
            onZoomComplete: ({ chart }) => updateZoomBtn(chart),
          },
          pan: {
            enabled: true,
            mode: "x",
            modifierKey: "alt",
            onPanComplete: ({ chart }) => updateZoomBtn(chart),
          },
          limits: { x: { min: "original", max: "original", minRange: 5 } },
        },
      },
    },
  });

  document.getElementById("chartFooter").textContent =
    `${handsTotal.toLocaleString()} hands · ${n.toLocaleString()} sample points · drag to zoom · shift+wheel to zoom · alt+drag to pan`;
}

// Same y=0 reference line the main app draws. Ported from upload.js so the
// chart visually matches the owner's view pixel-for-pixel.
const zeroLinePlugin = {
  id: "zeroLine",
  beforeDatasetsDraw(chart) {
    const yScale = chart.scales?.y;
    if (!yScale) return;
    if (yScale.min > 0 || yScale.max < 0) return;
    const y = yScale.getPixelForValue(0);
    const ctx = chart.ctx;
    const xLeft = chart.chartArea.left;
    const xRight = chart.chartArea.right;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xLeft, y);
    ctx.lineTo(xRight, y);
    ctx.stroke();
    ctx.restore();
  },
};

function updateZoomBtn(chart) {
  const btn = document.getElementById("zoomOutBtn");
  const x = chart.scales.x;
  const total = chart.data.labels.length;
  btn.hidden = !(x.min > 0 || x.max < total - 1);
}

function mkDataset(label, data, color) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    borderWidth: 1.5,
    pointRadius: 0,
    pointHoverRadius: 3,
    stepped: "before",
    tension: 0,
  };
}

// ── X-axis nice ticks (ported from upload.js) ───────────────────────────────

function niceStep(range, targetTicks = 7) {
  if (!Number.isFinite(range) || range <= 0 || targetTicks <= 0) return 1;
  const rough = range / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  let nice;
  if (norm < 1.5) nice = 1;
  else if (norm < 3.5) nice = 2;
  else if (norm < 7.5) nice = 5;
  else nice = 10;
  return Math.max(1, nice * mag);
}

function pickNiceXTicks(labels, targetTicks = 7) {
  if (!Array.isArray(labels) || labels.length === 0) return [];
  const lastHand = labels[labels.length - 1];
  if (!Number.isFinite(lastHand) || lastHand <= 1) return [{ value: 0, displayLabel: "1" }];
  const step = niceStep(lastHand, targetTicks);
  if (step <= 0) return [{ value: 0, displayLabel: "1" }];
  const ticks = [];
  const firstHand = labels[0] || 1;
  let hand = Math.max(step, Math.ceil(firstHand / step) * step);
  while (hand <= lastHand) {
    let lo = 0, hi = labels.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (labels[mid] < hand) lo = mid + 1;
      else hi = mid;
    }
    let idx = lo;
    if (idx > 0 && Math.abs(labels[idx - 1] - hand) < Math.abs(labels[idx] - hand)) {
      idx = idx - 1;
    }
    if (ticks.length === 0 || ticks[ticks.length - 1].value !== idx) {
      ticks.push({ value: idx, displayLabel: hand.toLocaleString() });
    }
    hand += step;
  }
  return ticks;
}

// ── Formatting ──────────────────────────────────────────────────────────────

function formatUsd(v) {
  const n = Number(v) || 0;
  return (n >= 0 ? "$" : "-$") + Math.abs(n).toFixed(2);
}

// ── State helpers ───────────────────────────────────────────────────────────

function showLoading() {
  $("#loadingState").hidden = false;
  $("#errorState").hidden = true;
  $("#passwordState").hidden = true;
  $("#content").hidden = true;
}
function showError(title, msg) {
  $("#loadingState").hidden = true;
  $("#errorState").hidden = false;
  $("#passwordState").hidden = true;
  $("#content").hidden = true;
  $("#errorTitle").textContent = title;
  $("#errorMsg").textContent = msg;
}
function showPasswordGate() {
  $("#loadingState").hidden = true;
  $("#errorState").hidden = true;
  $("#passwordState").hidden = false;
  $("#content").hidden = true;
}
function showContent() {
  $("#loadingState").hidden = true;
  $("#errorState").hidden = true;
  $("#passwordState").hidden = true;
  $("#content").hidden = false;
}

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}
