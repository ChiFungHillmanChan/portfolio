// share.js — Renders a poker stats share page.
//
// URL: https://casino-game.hillmanchan.com/p/{shareId}
//
// The Cloudflare Worker at /p/{id} rewrites to /bb100/share/index.html?id={id}.
// On load we fetch /poker/get-stats-share, render the chart + summary, and
// wire the same before/after-rake and BB/$ toggles the main recorder uses.
//
// Anything the owner does AFTER pressing Share — editing, deleting,
// re-uploading — has no effect on this view, because the snapshot is an
// immutable R2 object the backend writes once and never touches again.

const API = "https://api.system-design.hillmanchan.com/poker";

const $ = (sel) => document.querySelector(sel);

const COLORS = {
  winnings: "#4ade80",
  ev:       "#fb923c",
  red:      "#ef4444",
  blue:     "#3b82f6",
};

const POSITIONS_ORDER = ["UTG", "UTG+1", "UTG+2", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"];

const state = {
  payload: null,
  shareId: null,
  // UI toggles — mirror main app defaults
  rake: "after",        // "before" | "after"
  unit: "bb",           // "bb" | "usd"
  lines: { winnings: true, ev: true, red: false, blue: false },
  chart: null,
};

// ── Boot ────────────────────────────────────────────────────────────────────

const params = new URLSearchParams(location.search);
state.shareId = params.get("id");

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

  if (res.status === 404) {
    return showError("Not found", "This share link doesn't exist or never did.");
  }
  if (res.status === 410) {
    const body = await safeJson(res);
    if (body?.error === "revoked")  return showError("Revoked", "The owner has revoked this share link.");
    if (body?.error === "expired")  return showError("Expired", "This share link has expired.");
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
  if (!res.ok) {
    return showError("Could not load", "Server returned an error. Try again later.");
  }

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
  renderSummary(data.summary);
  renderPosition(data.summary?.byPosition || {});
  renderFooter(data);
  wireToggles();
  renderChart();
}

// ── Render: Title block ─────────────────────────────────────────────────────

function renderTitleBlock(p) {
  document.getElementById("pageTitle").textContent = `${p.title} — Poker Stats`;
  document.getElementById("title").textContent = p.title || "Shared poker stats";
  document.getElementById("handsChip").textContent = `${p.handsLabel || (p.summary?.hands ?? 0).toLocaleString()} hands`;
  const period = p.summary?.period;
  document.getElementById("periodChip").textContent = period || "Period: unspecified";
  document.getElementById("stakesChip").textContent = p.summary?.stakesBucket
    ? `Stakes: ${p.summary.stakesBucket}`
    : "Stakes: unspecified";
}

// ── Render: Summary cards ───────────────────────────────────────────────────

function renderSummary(s) {
  if (!s) return;
  const root = document.getElementById("summary");
  root.replaceChildren();

  // Header row: hands + rake
  const header = document.createElement("div");
  header.className = "share-summary-header";
  header.appendChild(statTile("Total hands", s.hands.toLocaleString()));
  header.appendChild(statTile(
    "Rake paid",
    `${formatBb(s.rakePaidBb)} bb · ${s.rakeBbPer100.toFixed(2)} bb/100`,
    "rake"
  ));
  if (s.rakeAsPercentOfWin != null && Number.isFinite(s.rakeAsPercentOfWin)) {
    header.appendChild(statTile("Rake / gross win", `${s.rakeAsPercentOfWin.toFixed(1)}%`, "rake"));
  }
  root.appendChild(header);

  // Comparison cards
  const cards = document.createElement("div");
  cards.className = "share-summary-cards";
  cards.appendChild(buildModeCard("Before rake", "before", s.bbPer100Before, s.evBbPer100Before, s.totalBefore));
  cards.appendChild(buildModeCard("After rake",  "after",  s.bbPer100After,  s.evBbPer100After,  s.totalAfter));
  root.appendChild(cards);
}

function statTile(label, value, kind) {
  const block = document.createElement("div");
  block.className = "share-stat-tile" + (kind ? ` share-stat-${kind}` : "");
  const v = document.createElement("div");
  v.className = "share-stat-value";
  v.textContent = value;
  const l = document.createElement("div");
  l.className = "share-stat-label";
  l.textContent = label;
  block.appendChild(v);
  block.appendChild(l);
  return block;
}

function buildModeCard(heading, kind, bbPer100, evBbPer100, total) {
  const card = document.createElement("div");
  card.className = "share-summary-card share-summary-" + kind;
  const h = document.createElement("div");
  h.className = "share-summary-card-title";
  h.textContent = heading;
  card.appendChild(h);
  const grid = document.createElement("div");
  grid.className = "share-summary-card-grid";
  grid.appendChild(statTile("Total ($)", formatUsd(total)));
  grid.appendChild(statTile("bb/100", bbPer100.toFixed(2)));
  grid.appendChild(statTile("All-in EV bb/100", evBbPer100.toFixed(2)));
  card.appendChild(grid);
  return card;
}

// ── Render: Position table ──────────────────────────────────────────────────

function renderPosition(byPos) {
  const card = document.getElementById("positionCard");
  card.replaceChildren();
  if (!byPos || Object.keys(byPos).length === 0) {
    card.hidden = true;
    return;
  }
  card.hidden = false;

  const title = document.createElement("h3");
  title.className = "share-section-title";
  title.textContent = "By position";
  card.appendChild(title);

  const table = document.createElement("table");
  table.className = "share-pos-table";
  const head = document.createElement("tr");
  ["Position", "Hands", "bb/100"].forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    head.appendChild(th);
  });
  table.appendChild(head);

  const ordered = POSITIONS_ORDER
    .filter((p) => byPos[p])
    .concat(Object.keys(byPos).filter((p) => !POSITIONS_ORDER.includes(p)));

  for (const pos of ordered) {
    const row = byPos[pos];
    if (!row) continue;
    const tr = document.createElement("tr");
    const tdPos = document.createElement("td");
    tdPos.textContent = pos;
    tr.appendChild(tdPos);
    const tdHands = document.createElement("td");
    tdHands.textContent = (row.hands || 0).toLocaleString();
    tr.appendChild(tdHands);
    const tdRate = document.createElement("td");
    const rate = Number(row.bbPer100) || 0;
    tdRate.textContent = rate.toFixed(2);
    tdRate.className = rate >= 0 ? "share-pos-positive" : "share-pos-negative";
    tr.appendChild(tdRate);
    table.appendChild(tr);
  }
  card.appendChild(table);
}

// ── Render: Footer (created/expires meta) ───────────────────────────────────

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

// ── Toggle wiring ───────────────────────────────────────────────────────────

function wireToggles() {
  document.querySelectorAll('input[name="rake"]').forEach((el) => {
    el.addEventListener("change", () => { state.rake = el.value; renderChart(); });
  });
  document.querySelectorAll('input[name="unit"]').forEach((el) => {
    el.addEventListener("change", () => { state.unit = el.value; renderChart(); });
  });
  document.querySelectorAll('input[data-line]').forEach((el) => {
    el.addEventListener("change", () => {
      state.lines[el.dataset.line] = el.checked;
      renderChart();
    });
  });
  document.getElementById("zoomOutBtn").addEventListener("click", () => {
    if (state.chart && state.chart.resetZoom) {
      state.chart.resetZoom();
      document.getElementById("zoomOutBtn").hidden = true;
    }
  });
  document.getElementById("fullscreenBtn").addEventListener("click", () => {
    const wrap = document.getElementById("chartWrap");
    if (!document.fullscreenElement) {
      wrap.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });
}

// ── Chart ───────────────────────────────────────────────────────────────────

function renderChart() {
  const p = state.payload;
  if (!p) return;
  const series = state.rake === "before" ? p.seriesBefore : p.seriesAfter;
  if (!series || !series.winningsUC) return;

  const n = series.winningsUC.length;
  const labels = Array.from({ length: n }, (_, i) => Math.round(((i + 1) / n) * (p.summary.hands || n)));
  // ↑ Maps the downsampled chart-index back onto an approximate "hand number"
  // for the x-axis labels, so the gridlines read "10,000 / 20,000" like the
  // main recorder.

  // Pick a sensible BB anchor:
  //   total$ = bbPer100 * hands / 100 * bbValue  →  bbValue = total$ / (bbPer100 * hands / 100)
  // We use After-rake totals as the anchor; if user toggles Before-rake the
  // line values shift but the BB axis stays calibrated to the same "1 BB =
  // $X" assumption — that mirrors how the main recorder behaves.
  const anchorTotal = p.summary.totalAfter || 1;
  const anchorBbPer100 = p.summary.bbPer100After || 1;
  const handsTotal = p.summary.hands || n;
  const bbValueUsd = anchorBbPer100 !== 0
    ? anchorTotal / (anchorBbPer100 * handsTotal / 100)
    : 0.01;

  const toY = (uc) => {
    const dollars = (uc || 0) / 1e6;
    if (state.unit === "usd") return dollars;
    return bbValueUsd > 0 ? dollars / bbValueUsd : 0;
  };

  const datasets = [];
  if (state.lines.winnings) datasets.push(mkDataset("Winnings", series.winningsUC.map(toY), COLORS.winnings));
  if (state.lines.ev)       datasets.push(mkDataset("All-in EV", series.evUC.map(toY), COLORS.ev));
  if (state.lines.red)      datasets.push(mkDataset("Red (non-SD)", series.redUC.map(toY), COLORS.red));
  if (state.lines.blue)     datasets.push(mkDataset("Blue (SD)",   series.blueUC.map(toY), COLORS.blue));

  if (state.chart) state.chart.destroy();
  state.chart = new Chart(document.getElementById("evChart").getContext("2d"), {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          ticks: {
            color: "#a0a0b0",
            autoSkip: true,
            maxTicksLimit: 8,
            maxRotation: 0,
            callback: function(_v, index) {
              const arr = this.chart.data.labels;
              const hand = arr ? arr[index] : index + 1;
              return Number(hand).toLocaleString();
            },
          },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        y: {
          position: "right",
          ticks: {
            color: "#a0a0b0",
            callback: (v) => state.unit === "usd"
              ? `$${Number(v).toFixed(2)}`
              : `${Number(v).toFixed(1)} bb`,
            maxTicksLimit: 10,
          },
          grid: { color: "rgba(255,255,255,0.10)", drawTicks: true, tickColor: "rgba(255,255,255,0.2)" },
        },
      },
      plugins: {
        legend: { labels: { color: "#a0a0b0" } },
        tooltip: {
          callbacks: {
            title: (ctx) => `Hand ${ctx[0].label}`,
            label: (ctx) => {
              const val = ctx.parsed.y;
              if (state.unit === "usd") return `${ctx.dataset.label}: $${val.toFixed(2)}`;
              return `${ctx.dataset.label}: ${val.toFixed(2)} bb`;
            },
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
    `${(p.summary.hands || n).toLocaleString()} hands · ${n.toLocaleString()} sample points · drag to zoom · shift+wheel to zoom · alt+drag to pan`;
}

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

// ── Formatting helpers ──────────────────────────────────────────────────────

function formatUsd(v) {
  const n = Number(v) || 0;
  return (n >= 0 ? "$" : "-$") + Math.abs(n).toFixed(2);
}

function formatBb(v) {
  const n = Number(v) || 0;
  return n.toFixed(1);
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
