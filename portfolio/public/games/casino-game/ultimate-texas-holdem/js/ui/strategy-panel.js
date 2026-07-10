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
