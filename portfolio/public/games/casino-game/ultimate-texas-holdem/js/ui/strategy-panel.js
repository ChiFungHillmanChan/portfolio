// strategy-panel.js — the shared "Settings & Strategy" panel: coach toggle,
// the pre-flop 4X raise chart, street rules and the odds numbers.
//
// Used by BOTH surfaces:
//   • table-main.js — the gear chip on the table opens it in the game overlay
//   • lobby.js — injected as a section of the global casino Settings modal
//
// The 4X chart is GENERATED from js/core/strategy.js (preflopAdvice), so the
// picture can never drift from what the coach actually recommends.

import { preflopAdvice } from "../core/strategy.js";
import { CAT, CAT_NAMES, BLIND_PAYS, TRIPS_PAYS, BBB_PAYS } from "../core/engine.js";

// ── SVG icons (suite style: stroke currentColor, 24-box, 1em) ────────────────

const icon = (inner, extra = "") =>
  `<svg class="uth-ic" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra}>${inner}</svg>`;

export const CAP_SVG = icon(
  `<path d="M22 9L12 4 2 9l10 5 10-5z"/><path d="M6 11.5V16c0 1.6 2.7 3 6 3s6-1.4 6-3v-4.5"/><path d="M22 9v5"/>`
);

export const CROWN_SVG = icon(
  `<path d="M11.56 3.27a.5.5 0 0 1 .88 0l2.95 5.6a1 1 0 0 0 1.52.3l4.27-3.67a.5.5 0 0 1 .8.52l-2.83 10.25a1 1 0 0 1-.96.73H5.81a1 1 0 0 1-.96-.73L2.02 6.02a.5.5 0 0 1 .8-.52l4.27 3.67a1 1 0 0 0 1.52-.3z"/>`
);

export const TREND_DOWN_SVG = icon(
  `<polyline points="1 6 8.5 13.5 13.5 8.5 23 18"/><polyline points="17 18 23 18 23 12"/>`
);

export const INFO_SVG = icon(
  `<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><line x1="12" y1="7.5" x2="12.01" y2="7.5"/>`
);

export const CHECK_SVG = icon(`<polyline points="20 6 9 17 4 12"/>`);

// same gear as the suite's settings-modal.js
export const GEAR_SVG = icon(
  `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`
);

export const EYE_SVG = icon(
  `<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>`
);

// ── Pre-flop 4X raise chart (Wizard of Odds layout: Y / S / N grid) ──────────

const CHART_RANKS = "23456789TJQKA"; // rank index 0..12
const label = (r) => (r === 8 ? "10" : CHART_RANKS[r]);
const card = (suit, rank) => suit * 13 + rank;

// Y = always raise 4x · S = raise only when suited · N = never (check)
function cellVerdict(hiRank, loRank) {
  const suited = preflopAdvice([card(0, hiRank), card(0, loRank)]).move === "4x";
  const offsuit = preflopAdvice([card(0, hiRank), card(1, loRank)]).move === "4x";
  return suited && offsuit ? "Y" : suited ? "S" : "N";
}

export function raiseChartHtml() {
  const CELL_TITLES = { Y: "Always raise 4x", S: "Raise 4x only when suited", N: "Never raise — check" };
  let head = `<th class="uth-chart-corner">Hi \\ Lo</th>`;
  for (let lo = 0; lo <= 11; lo++) head += `<th>${label(lo)}</th>`;

  let rows = "";
  for (let hi = 12; hi >= 1; hi--) {
    let cells = `<th>${label(hi)}</th>`;
    for (let lo = 0; lo <= 11; lo++) {
      if (lo >= hi) {
        cells += `<td class="uth-chart-void"></td>`;
      } else {
        const v = cellVerdict(hi, lo);
        cells += `<td class="uth-chart-${v.toLowerCase()}" title="${label(hi)}-${label(lo)}: ${CELL_TITLES[v]}">${v}</td>`;
      }
    }
    rows += `<tr>${cells}</tr>`;
  }

  return `
    <div class="uth-chart-scroll">
      <table class="uth-chart" aria-label="Pre-flop 4x raise chart: higher card by lower card">
        <thead><tr>${head}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="uth-chart-pairs">Pairs: <strong>raise 3-3 or higher</strong> (only 2-2 checks)</div>
    <div class="uth-chart-legend">
      <span><i class="uth-chart-key uth-chart-y">Y</i> Always raise</span>
      <span><i class="uth-chart-key uth-chart-s">S</i> Raise when suited only</span>
      <span><i class="uth-chart-key uth-chart-n">N</i> Never raise</span>
    </div>
    <div class="uth-chart-source">Source: wizardofodds.com — the coach applies this chart for you</div>`;
}

// ── The full panel ───────────────────────────────────────────────────────────

// isCoachOn/setCoachOn — one place owns the localStorage contract.
export const isCoachOn = () => localStorage.getItem("uthCoach") !== "0";
export function setCoachOn(on) {
  try {
    localStorage.setItem("uthCoach", on ? "1" : "0");
  } catch {
    /* storage blocked — session keeps the in-memory value */
  }
}

export function coachSwitchHtml(on) {
  return `
    <button type="button" class="uth-switch${on ? " on" : ""}" data-action="coach-toggle"
            role="switch" aria-checked="${on}" aria-label="Strategy coach">
      <span class="uth-switch-knob"></span>
    </button>`;
}

// ── Info subpage: payouts & odds (pay tables generated from the engine) ──────

const payRatio = (mult) => (Number.isInteger(mult) ? `${mult} : 1` : `${mult * 2} : 2`);

// rows for a {CAT: multiplier} pay table, best hand first
function payTableHtml(pays, { belowLabel = null } = {}) {
  const cats = Object.keys(pays).map(Number).sort((a, b) => b - a);
  const rows = cats
    .map((cat) => `<tr><td>${CAT_NAMES[cat]}</td><td class="uth-num-cell">${payRatio(pays[cat])}</td></tr>`)
    .join("");
  return `<table class="uth-info-table">${rows}${belowLabel ? `<tr><td>${belowLabel}</td><td class="uth-num-cell">Push</td></tr>` : ""}</table>`;
}

export function infoPanelHtml() {
  // Bad Beat shows a single straight-flush row (royal pays the same 7500)
  const bbbPays = { ...BBB_PAYS };
  delete bbbPays[CAT.ROYAL];
  return `
    <section class="uth-settings-block">
      <h3>HOW EACH BET SETTLES</h3>
      <ul>
        <li><strong>Ante</strong> — even money vs the dealer; pushes when the dealer doesn't open with a pair (dealer qualifies <span class="uth-num">82.6%</span> of hands)</li>
        <li><strong>Play</strong> — even money, always in action</li>
        <li><strong>Blind</strong> — wins only when you beat the dealer; pays the table below with a straight or better, pushes on smaller wins</li>
      </ul>
    </section>
    <section class="uth-settings-block">
      <h3>BLIND PAY TABLE</h3>
      ${payTableHtml(BLIND_PAYS, { belowLabel: "Less than a straight (win)" })}
    </section>
    <section class="uth-settings-block">
      <h3>TRIPS (your hand only)</h3>
      ${payTableHtml(TRIPS_PAYS)}
    </section>
    <section class="uth-settings-block">
      <h3>HOLE CARD BONUS (your two hole cards)</h3>
      <table class="uth-info-table">
        <tr><td>You &amp; dealer both pocket Aces</td><td class="uth-num-cell">1000 : 1</td></tr>
        <tr><td>Pocket Aces</td><td class="uth-num-cell">30 : 1</td></tr>
        <tr><td>A-K suited</td><td class="uth-num-cell">25 : 1</td></tr>
        <tr><td>A-Q / A-J suited</td><td class="uth-num-cell">20 : 1</td></tr>
        <tr><td>A-K offsuit</td><td class="uth-num-cell">15 : 1</td></tr>
        <tr><td>Pair J-J to K-K</td><td class="uth-num-cell">10 : 1</td></tr>
        <tr><td>A-Q / A-J offsuit</td><td class="uth-num-cell">5 : 1</td></tr>
        <tr><td>Pair 2-2 to T-T</td><td class="uth-num-cell">3 : 1</td></tr>
      </table>
    </section>
    <section class="uth-settings-block">
      <h3>BAD BEAT BONUS (lose at showdown with…)</h3>
      ${payTableHtml(bbbPays)}
    </section>
    <section class="uth-settings-block">
      <h3>HOUSE EDGE PER BET</h3>
      <table class="uth-info-table">
        <tr><td>Main game (Ante + Blind + Play)</td><td class="uth-num-cell">2.19% of Ante</td></tr>
        <tr><td>&nbsp;&nbsp;…per chip wagered</td><td class="uth-num-cell">0.53%</td></tr>
        <tr><td>Trips (wins 15.3% of hands)</td><td class="uth-num-cell">0.90%</td></tr>
        <tr><td>Hole Card Bonus (hits 9.5%)</td><td class="uth-num-cell">8.54%</td></tr>
        <tr><td>Bad Beat Bonus (hits 2.0%)</td><td class="uth-num-cell">57.1%</td></tr>
      </table>
      <p><a class="uth-info-more" href="odds.html">Full odds, win frequencies &amp; hand distribution →</a></p>
    </section>`;
}

// ── Tabbed settings: COACH | INFO sub-pages with a horizontal slide ─────────

export function settingsPanelHtml(coachOn, activeTab = "coach") {
  const info = activeTab === "info";
  return `
    <div class="uth-settings-wrap">
      <div class="uth-settings-tabs" role="tablist">
        <button type="button" class="uth-settings-tab${info ? "" : " active"}" data-action="settings-tab" data-tab="coach" role="tab" aria-selected="${!info}">${CAP_SVG} COACH</button>
        <button type="button" class="uth-settings-tab${info ? " active" : ""}" data-action="settings-tab" data-tab="info" role="tab" aria-selected="${info}">${INFO_SVG} INFO</button>
      </div>
      <div class="uth-subpages-clip">
        <div class="uth-subpages${info ? " show-info" : ""}">
          <div class="uth-subpage">${strategyPanelHtml(coachOn)}</div>
          <div class="uth-subpage"><div class="uth-settings">${infoPanelHtml()}</div></div>
        </div>
      </div>
    </div>`;
}

// Slide an already-rendered panel to a tab (no re-render → CSS transition runs).
export function switchSettingsTab(rootEl, tab) {
  const wrap = rootEl.querySelector(".uth-settings-wrap");
  if (!wrap) return;
  wrap.querySelector(".uth-subpages")?.classList.toggle("show-info", tab === "info");
  for (const btn of wrap.querySelectorAll(".uth-settings-tab")) {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", String(active));
  }
}

export function strategyPanelHtml(coachOn) {
  return `
    <div class="uth-settings">
      <section class="uth-settings-block">
        <h3>${CAP_SVG} STRATEGY COACH</h3>
        <div class="uth-switch-row">
          <span>Recommend the mathematically best move on every decision, with the reason.</span>
          ${coachSwitchHtml(coachOn)}
        </div>
      </section>
      <section class="uth-settings-block">
        <h3>PRE-FLOP — WHEN TO RAISE 4X</h3>
        ${raiseChartHtml()}
        <p>Everything not on the chart: <strong>check</strong>. The 3x raise is never correct — it's 4x or wait.</p>
      </section>
      <section class="uth-settings-block">
        <h3>FLOP — BET 2X WITH</h3>
        <ul>
          <li>Two pair or better</li>
          <li>A hidden pair — a pair using one of YOUR cards (except pocket 2-2)</li>
          <li>Four to a flush with a hole card <span class="uth-num">T</span> or higher of that suit</li>
        </ul>
      </section>
      <section class="uth-settings-block">
        <h3>RIVER — BET 1X OR FOLD</h3>
        <ul>
          <li>A hidden pair or better: always bet</li>
          <li>Otherwise count the "dealer outs" — single cards that would beat you.
              Fewer than <span class="uth-num">21</span> of the 45 unseen cards: bet; else fold.
              (The coach counts them for you.)</li>
        </ul>
      </section>
      <section class="uth-settings-block">
        <h3>YOUR EXPECTED WIN RATE</h3>
        <p>Played perfectly the house keeps <span class="uth-num">2.19%</span> of your Ante per hand
        (this chart plays to about <span class="uth-num">2.4%</span>) — roughly
        <span class="uth-num">0.5%</span> of all money you put on the table. Short-term swings are
        huge; the Blind's big bonuses arrive rarely but pay for many small losses.</p>
      </section>
      <section class="uth-settings-block">
        <h3>SHARING HANDS WITH 6 PLAYERS</h3>
        <p><strong>It does not beat the house.</strong> Wizard of Odds simulated seeing all
        <span class="uth-num">10</span> other hole cards at a full table with computer-perfect play —
        the house still wins about <span class="uth-num">0.64%</span> of the Ante. A real edge needs
        ~<span class="uth-num">16</span> known cards, impossible at a 6-max table. Use the
        ${EYE_SVG} card-share feature for the table talk, not for profit.</p>
      </section>
    </div>`;
}
