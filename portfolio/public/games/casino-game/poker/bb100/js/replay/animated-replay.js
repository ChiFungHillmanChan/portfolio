// animated-replay.js — Modal that plays a hand's action sequence as an animated SVG table.
//
// Public API:
//   showReplay(handText, { title }) — replaces the static-replay export of the same name.
//   closeModal()
//
// Architecture:
//   handText → extractActions() → buildSnapshots() → buildTable() → renderSnapshot per step
//   Playback loop walks the snapshot[] driven by a setTimeout clock.
//
// All wiring (close, tabs, controls, scrubber, unit toggle, keyboard) goes
// through a single delegated click handler on the modal root so it survives
// re-renders and works on the first open. Earlier versions wired listeners
// in `ensureModal` (one-time setup) and the close button silently failed
// when DOM ordering / [hidden] attribute interactions left a stale layer.

import { extractActions } from "./action-extractor.js";
import { buildSnapshots } from "./state-engine.js";
import { buildTable, renderSnapshot } from "./table-renderer.js";

const MODAL_ID = "animatedReplayModal";

// Per-action durations (ms). Some actions are quick (folds/checks), others are
// "weighty" (deals, all-ins, showdown). Speed multiplier scales these.
const BASE_DURATION = {
  "post-blind": 600,
  "deal-hole": 800,
  "street": 1100,
  "action": 850,
  "uncalled": 800,
  "shows": 900,
  "mucks": 500,
  "collect": 1200,
  "cash-drop": 600,
};
const DEFAULT_DURATION = 700;

function durationForEvent(ev) {
  return BASE_DURATION[ev?.type] ?? DEFAULT_DURATION;
}

// Module-level state — single replay at a time.
let state = null;

// ── DOM template ────────────────────────────────────────────────────────────

function ensureModal() {
  let modal = document.getElementById(MODAL_ID);
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = MODAL_ID;
  modal.className = "replay-modal replay-modal-animated";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="replay-modal-backdrop" data-replay-action="close"></div>
    <div class="replay-modal-panel replay-modal-panel-wide" role="dialog" aria-modal="true">
      <div class="replay-modal-header">
        <h3 class="replay-modal-title">Hand Replay</h3>
        <div class="replay-unit-toggle" role="group" aria-label="Display unit">
          <button type="button" data-unit="dollars" class="active">$</button>
          <button type="button" data-unit="bb">BB</button>
        </div>
        <div class="replay-view-tabs" role="tablist">
          <button type="button" class="replay-view-tab active" data-view="table" role="tab" aria-selected="true">Table</button>
          <button type="button" class="replay-view-tab" data-view="log" role="tab" aria-selected="false">Text log</button>
        </div>
        <button type="button" class="replay-modal-close" data-replay-action="close" aria-label="Close"><svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>
      </div>
      <div class="replay-modal-body replay-modal-body-animated">
        <div class="replay-table-mount" data-view-panel="table"></div>
        <div class="replay-log-mount" data-view-panel="log" hidden></div>
      </div>
      <div class="replay-modal-footer">
        <div class="replay-progress">
          <span class="replay-progress-pos">—</span>
          <div class="replay-scrubber" role="slider" aria-label="Replay position">
            <div class="replay-scrubber-fill"></div>
            <input type="range" min="0" max="0" value="0" class="replay-scrubber-input">
          </div>
          <span class="replay-progress-total">—</span>
        </div>
        <div class="replay-controls">
          <button type="button" class="replay-ctl" data-act="prev" title="Previous (←)" aria-label="Previous step">◀</button>
          <button type="button" class="replay-ctl replay-ctl-play" data-act="play" title="Play / Pause (Space)" aria-label="Play">▶</button>
          <button type="button" class="replay-ctl" data-act="next" title="Next (→)" aria-label="Next step">▶</button>
          <span class="replay-ctl-sep"></span>
          <button type="button" class="replay-speed" data-speed="1">1×</button>
          <button type="button" class="replay-speed active" data-speed="2">2×</button>
          <button type="button" class="replay-speed" data-speed="4">4×</button>
          <span class="replay-ctl-sep"></span>
          <button type="button" class="replay-ctl" data-act="restart" title="Restart" aria-label="Restart">⟲</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  // SINGLE delegated click handler — survives any re-rendering of internals.
  modal.addEventListener("click", onModalClick);
  // Scrubber needs `input` event (continuous as user drags), not click.
  modal.querySelector(".replay-scrubber-input").addEventListener("input", onScrubInput);
  document.addEventListener("keydown", onKeyDown);
  return modal;
}

function onModalClick(e) {
  const target = e.target;
  if (!(target instanceof Element)) return;

  // Close: anything tagged data-replay-action="close" (backdrop OR close button)
  if (target.matches('[data-replay-action="close"]') || target.closest('[data-replay-action="close"]')) {
    closeModal();
    return;
  }
  // Tab switch
  const tab = target.closest(".replay-view-tab");
  if (tab) {
    switchView(tab.dataset.view);
    return;
  }
  // Unit toggle ($ / BB)
  const unitBtn = target.closest(".replay-unit-toggle button");
  if (unitBtn) {
    setUnit(unitBtn.dataset.unit);
    return;
  }
  // Speed
  const speedBtn = target.closest(".replay-speed");
  if (speedBtn) {
    setSpeed(parseInt(speedBtn.dataset.speed, 10));
    return;
  }
  // Playback controls
  const ctl = target.closest(".replay-ctl");
  if (ctl) {
    const act = ctl.dataset.act;
    if (act === "prev")    { setPlaying(false); step(-1); }
    else if (act === "next") { setPlaying(false); step(+1); }
    else if (act === "play") { togglePlay(); }
    else if (act === "restart") { setPlaying(false); jumpTo(0); }
    return;
  }
}

function onScrubInput(e) {
  setPlaying(false);
  jumpTo(parseInt(e.target.value, 10));
}

function onKeyDown(e) {
  const modal = document.getElementById(MODAL_ID);
  if (!modal || modal.hidden) return;
  if (e.key === "Escape") {
    e.preventDefault();
    closeModal();
  } else if (e.key === " ") {
    e.preventDefault();
    togglePlay();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    step(-1);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    step(+1);
  } else if (e.key === "1") setSpeed(1);
  else if (e.key === "2") setSpeed(2);
  else if (e.key === "4") setSpeed(4);
}

// ── Playback control ───────────────────────────────────────────────────────

function updateScrubber() {
  if (!state) return;
  const { modal, idx, snapshots } = state;
  const total = snapshots.length - 1;
  modal.querySelector(".replay-progress-pos").textContent = `Step ${idx} / ${total}`;
  modal.querySelector(".replay-progress-total").textContent = `${total} steps`;
  const input = modal.querySelector(".replay-scrubber-input");
  input.max = String(total);
  input.value = String(idx);
  const fill = modal.querySelector(".replay-scrubber-fill");
  fill.style.width = total > 0 ? `${(idx / total) * 100}%` : "0%";
  modal.querySelector('[data-act="prev"]').disabled = idx === 0;
  modal.querySelector('[data-act="next"]').disabled = idx === total;
}

function applySnapshot(instant = false) {
  if (!state) return;
  const snap = state.snapshots[state.idx];
  renderSnapshot(state.tableRefs, snap, { instant, unit: state.unit, bbDollars: state.bbDollars });
  updateScrubber();
  updateLogHighlight();
}

function step(delta) {
  if (!state) return;
  const total = state.snapshots.length - 1;
  const next = Math.max(0, Math.min(total, state.idx + delta));
  if (next === state.idx) return;
  state.idx = next;
  applySnapshot(false);
}

function jumpTo(idx) {
  if (!state) return;
  const total = state.snapshots.length - 1;
  state.idx = Math.max(0, Math.min(total, idx));
  applySnapshot(true);
}

const PAUSE_SVG = `<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
const PLAY_SVG = `<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><polygon points="7 4 20 12 7 20"/></svg>`;

function setPlaying(playing) {
  if (!state) return;
  state.playing = playing;
  const btn = state.modal.querySelector('[data-act="play"]');
  if (btn) {
    // Switched from textContent to innerHTML so the SVG icons render
    // instead of appearing as literal markup.
    btn.innerHTML = playing ? PAUSE_SVG : PLAY_SVG;
    btn.setAttribute("aria-label", playing ? "Pause" : "Play");
  }
  if (playing) {
    if (state.idx >= state.snapshots.length - 1) state.idx = 0;
    scheduleNext();
  } else {
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
  }
}

function togglePlay() {
  if (!state) return;
  setPlaying(!state.playing);
}

function scheduleNext() {
  if (!state || !state.playing) return;
  const nextIdx = state.idx + 1;
  if (nextIdx >= state.snapshots.length) {
    setPlaying(false);
    return;
  }
  const ev = state.extracted.events[state.idx];
  const dur = durationForEvent(ev) / state.speed;
  state.timer = setTimeout(() => {
    if (!state || !state.playing) return;
    state.idx = nextIdx;
    applySnapshot(false);
    scheduleNext();
  }, dur);
}

function setSpeed(mult) {
  if (!state) return;
  state.speed = mult;
  state.modal.querySelectorAll(".replay-speed").forEach((b) => {
    b.classList.toggle("active", parseInt(b.dataset.speed, 10) === mult);
  });
  if (state.playing) {
    if (state.timer) clearTimeout(state.timer);
    scheduleNext();
  }
}

function setUnit(unit) {
  if (!state) return;
  if (unit !== "dollars" && unit !== "bb") return;
  state.unit = unit;
  state.modal.querySelectorAll(".replay-unit-toggle button").forEach((b) => {
    b.classList.toggle("active", b.dataset.unit === unit);
  });
  // Re-render current snapshot AND text log with new unit
  applySnapshot(true);
  const logMount = state.modal.querySelector(".replay-log-mount");
  if (logMount) renderTextLog(logMount, state.extracted, state.unit, state.bbDollars);
  updateLogHighlight();
}

// ── Text log fallback (a11y view) ──────────────────────────────────────────

function fmtMoney(amount, unit, bbDollars) {
  if (unit === "bb" && bbDollars > 0) {
    const bb = amount / bbDollars;
    return `${bb >= 0 ? "" : "-"}${Math.abs(bb).toFixed(1)}bb`;
  }
  return `${amount < 0 ? "-" : ""}$${Math.abs(amount).toFixed(2)}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Inline star icon for all-in markers. Trusted markup.
const STAR_SVG = `<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><polygon points="12 2 14.85 8.5 22 9.27 16.5 14 18 21 12 17.5 6 21 7.5 14 2 9.27 9.15 8.5"/></svg>`;
// Sentinel: emitted by describeEvent for all-in lines, replaced by the
// trusted STAR_SVG markup inside makeLogLine (after txt is HTML-escaped).
const ALLIN_TOKEN = "ALLIN";

function renderTextLog(mount, extracted, unit = "dollars", bbDollars = 0) {
  mount.replaceChildren();
  const list = document.createElement("div");
  list.className = "replay-log-list";
  list.appendChild(makeLogLine(`Hand #${extracted.meta.handId}`, "log-header"));
  list.appendChild(makeLogLine(
    `${extracted.meta.gameType || "Hold'em"} · Blinds $${extracted.meta.stake.sb.toFixed(2)}/$${extracted.meta.stake.bb.toFixed(2)} · ${extracted.meta.date}`,
    "log-meta"
  ));
  for (let i = 0; i < extracted.events.length; i++) {
    const ev = extracted.events[i];
    const line = makeLogLine(describeEvent(ev, unit, bbDollars), "log-event");
    line.dataset.eventIdx = String(i);
    list.appendChild(line);
  }
  mount.appendChild(list);
}

function describeEvent(ev, unit, bbDollars) {
  const M = (a) => fmtMoney(a, unit, bbDollars);
  switch (ev.type) {
    case "street":
      if (ev.name === "flop") return `*** FLOP *** [${(ev.cards || []).join(" ")}]`;
      if (ev.name === "turn") return `*** TURN *** [${ev.card}]`;
      if (ev.name === "river") return `*** RIVER *** [${ev.card}]`;
      if (ev.name === "showdown") return `*** SHOWDOWN ***`;
      return `*** ${ev.name.toUpperCase()} ***`;
    case "deal-hole":
      return `${ev.player} dealt [${(ev.cards || []).join(" ")}]`;
    case "post-blind":
      return `${ev.player} posts ${ev.blind} ${M(ev.amount)}`;
    case "action":
      if (ev.verb === "folds") return `${ev.player} folds`;
      if (ev.verb === "checks") return `${ev.player} checks`;
      if (ev.verb === "calls") return `${ev.player} calls ${M(ev.amount || 0)}${ev.allIn ? ` ${ALLIN_TOKEN} ALL-IN` : ""}`;
      if (ev.verb === "bets") return `${ev.player} bets ${M(ev.amount || 0)}${ev.allIn ? ` ${ALLIN_TOKEN} ALL-IN` : ""}`;
      if (ev.verb === "raises") return `${ev.player} raises ${M(ev.raiseBy || 0)} to ${M(ev.to || 0)}${ev.allIn ? ` ${ALLIN_TOKEN} ALL-IN` : ""}`;
      return `${ev.player} ${ev.verb}`;
    case "uncalled": return `Uncalled bet (${M(ev.amount)}) returned to ${ev.player}`;
    case "shows":    return `${ev.player} shows [${(ev.cards || []).join(" ")}]`;
    case "mucks":    return `${ev.player} mucks`;
    case "collect":  return `${ev.player} collected ${M(ev.amount)} from ${ev.pot} pot`;
    case "cash-drop":return `Cash Drop: +${M(ev.amount)} into pot`;
    default: return `(${ev.type})`;
  }
}

function makeLogLine(text, cls) {
  const d = document.createElement("div");
  d.className = "replay-log-line " + (cls || "");
  // Escape user-derived text first, then swap the trusted sentinel for our
  // inline star SVG. This lets describeEvent emit a plain string while
  // letting the all-in marker render as an icon instead of literal HTML.
  if (text.indexOf(ALLIN_TOKEN) !== -1) {
    d.innerHTML = escapeHtml(text).split(ALLIN_TOKEN).join(STAR_SVG);
  } else {
    d.textContent = text;
  }
  return d;
}

function updateLogHighlight() {
  if (!state) return;
  const log = state.modal.querySelector(".replay-log-list");
  if (!log) return;
  const targetIdx = state.idx - 1;
  log.querySelectorAll(".replay-log-line.active").forEach((n) => n.classList.remove("active"));
  if (targetIdx >= 0) {
    const line = log.querySelector(`.replay-log-line[data-event-idx="${targetIdx}"]`);
    if (line) {
      line.classList.add("active");
      line.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }
}

function switchView(view) {
  if (!state) return;
  state.modal.querySelectorAll(".replay-view-tab").forEach((t) => {
    const active = t.dataset.view === view;
    t.classList.toggle("active", active);
    t.setAttribute("aria-selected", active ? "true" : "false");
  });
  state.modal.querySelectorAll("[data-view-panel]").forEach((p) => {
    p.hidden = p.dataset.viewPanel !== view;
  });
  if (view === "log") updateLogHighlight();
}

// ── Public API ──────────────────────────────────────────────────────────────

export function showReplay(handText, { title } = {}) {
  const modal = ensureModal();
  const extracted = extractActions(handText);
  const { snapshots } = buildSnapshots(extracted);
  const bbDollars = Number(extracted.meta?.stake?.bb || 0);

  modal.querySelector(".replay-modal-title").textContent =
    title || `Hand Replay — #${extracted.meta.handId || ""}`;

  const tableMount = modal.querySelector(".replay-table-mount");
  const tableRefs = buildTable(tableMount, snapshots[0]);

  const logMount = modal.querySelector(".replay-log-mount");
  renderTextLog(logMount, extracted, "dollars", bbDollars);

  // Reset state (kills any previous timer first)
  if (state?.timer) clearTimeout(state.timer);
  state = {
    modal,
    extracted,
    snapshots,
    tableRefs,
    idx: 0,
    playing: false,
    speed: 2,
    timer: null,
    unit: "dollars",  // user-toggleable via $/BB pill
    bbDollars,        // for BB conversion
  };

  // Reset UI to defaults via the same code paths the buttons use
  switchView("table");
  setSpeed(2);
  setUnit("dollars");
  applySnapshot(true);

  modal.hidden = false;
  document.body.style.overflow = "hidden";

  // Auto-play after a short pause so the user sees the initial frame
  setTimeout(() => {
    if (state && !state.playing) setPlaying(true);
  }, 600);
}

export function closeModal() {
  const modal = document.getElementById(MODAL_ID);
  if (!modal) return;
  if (state?.timer) clearTimeout(state.timer);
  state = null;
  modal.hidden = true;
  document.body.style.overflow = "";
}
