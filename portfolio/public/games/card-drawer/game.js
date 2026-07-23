// Card Drawer — UI + state wiring. Pure logic lives in hand-eval.js (poker),
// effects.js (card effects), state.js (shape + persistence) and card-svg.js
// (rendering); this module only composes them and manages the DOM.

import { createDeck, shuffle, evaluateHand, compareScores, countOuts, rankLabel, RANKS } from './hand-eval.js';
import { renderCardSVG } from './card-svg.js';
import {
  EFFECTS,
  EFFECT_IDS,
  effectForCard,
  legalTargets,
  beginRecord,
  advanceDraw,
  applyTarget,
  undoRecord,
} from './effects.js';
import {
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  MAX_PLAYERS,
  MIN_PLAYERS,
  defaultState,
  normalizeState,
  migrateLegacy,
} from './state.js';

// Hand-drawn UI glyphs — inline SVG paths, never emoji.
const ICONS = {
  crown:
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
    '<path d="M3 16 L3 8 L8 11.5 L12 5 L16 11.5 L21 8 L21 16 Z" fill="currentColor"/>' +
    '<path d="M4 18 H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  cross:
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
    '<path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>',
  plus:
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
    '<path d="M12 4 V20 M4 12 H20" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>',
  undo:
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
    '<path d="M8 4 L3 9 L8 14" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M3 9 H14 a6 6 0 0 1 6 6 v2" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
  ornament:
    '<svg class="ornament" width="132" height="14" viewBox="0 0 132 14" aria-hidden="true">' +
    '<path d="M0 7 H54 M78 7 H132" stroke="currentColor" stroke-width="1"/>' +
    '<path d="M66 1 L72 7 L66 13 L60 7 Z" fill="currentColor"/></svg>',
  shield:
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">' +
    '<path d="M12 3 L19 6 V11 C19 15.5 16 19.5 12 21 C8 19.5 5 15.5 5 11 V6 Z" ' +
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
};

// Celebration sparkles — 4-point-star paths generated from fixed positions.
const SPARKLES =
  '<svg class="sparkles" viewBox="0 0 320 320" aria-hidden="true">' +
  ['160 34 18', '58 84 12', '258 72 14', '36 190 10', '284 196 12', '104 262 12', '216 272 14', '160 132 8']
    .map((s) => {
      const [x, y, r] = s.split(' ').map(Number);
      return (
        `<path d="M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} ` +
        `Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z" fill="currentColor"/>`
      );
    })
    .join('') +
  '</svg>';

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// --- state -----------------------------------------------------------------

let state = defaultState();
// Transient UI state — never persisted.
const ui = {
  sheetFor: null,
  justDrawn: null,
  confirmReset: false,
  resume: null,
  viewerFor: null,
  reveal: null,
  leadGlow: null,
  fxPickerFor: null,
  target: null,
  fxQueue: null,
  prevLeader: null,
};
let resetTimer = null;
let revealTimer = null;

const nextPlayerId = () => state.players.reduce((m, p) => Math.max(m, p.id), 0) + 1;

// --- persistence (localStorage may be absent or corrupt — never crash) ------

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* in-memory only */
  }
}

function clearSaved() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function loadSaved() {
  const readJson = (key) => {
    let raw;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };
  const v2 = normalizeState(readJson(STORAGE_KEY));
  if (v2) return v2;
  const migrated = migrateLegacy(readJson(LEGACY_STORAGE_KEY));
  if (migrated) {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  return migrated;
}

// --- actions ------------------------------------------------------------------

// First "Player N" not already in use — shown as the input placeholder and
// assigned when the host adds a seat without typing a name.
function defaultPlayerName() {
  const taken = new Set(state.players.map((p) => p.name));
  let n = 1;
  while (taken.has(`Player ${n}`)) n++;
  return `Player ${n}`;
}

function addPlayer(name) {
  if (state.players.length >= MAX_PLAYERS) return false;
  const trimmed = name.trim().slice(0, 24) || defaultPlayerName();
  state.players.push({ id: nextPlayerId(), name: trimmed, cards: [], shield: false });
  saveState();
  return true;
}

function renamePlayer(id, name) {
  const player = state.players.find((p) => p.id === id);
  if (!player) return;
  const trimmed = name.trim().slice(0, 24);
  if (trimmed) player.name = trimmed;
  saveState();
  render();
}

function removePlayer(id) {
  state.players = state.players.filter((p) => p.id !== id);
  saveState();
  render();
}

function startGame() {
  if (state.players.length < MIN_PLAYERS) return;
  state.players.forEach((p) => {
    p.cards = [];
    p.shield = false;
  });
  state.deck = shuffle(createDeck({ includeJokers: state.includeJokers }));
  state.graveyard = [];
  state.history = [];
  state.pending = null;
  state.phase = 'playing';
  saveState();
  render();
}

// Leader snapshot { id, score } or null. Ties keep the earlier player,
// matching rankedEntries' stable sort.
function currentLeader() {
  let best = null;
  for (const p of state.players) {
    const hand = evaluateHand(p.cards);
    if (!hand) continue;
    if (!best || compareScores(hand.score, best.score) > 0) best = { id: p.id, score: hand.score };
  }
  return best;
}

// A draw "takes the lead" only when someone else genuinely led before and the
// drawer's new hand STRICTLY beats that score — a tie never celebrates.
function tookLeadAfterDraw(prevLeader, player) {
  if (!prevLeader || prevLeader.id === player.id) return false;
  return compareScores(evaluateHand(player.cards).score, prevLeader.score) > 0;
}

// Shared driver: the card is already in the drawer's hand and the record
// begun. Advances until done or a target is needed; on done, commits history
// and starts the resolution reveal queue.
function advanceRecord(record, viaTarget = false, targetId = null) {
  const result = viaTarget
    ? applyTarget(state, record, targetId)
    : advanceDraw(state, record);
  if (result.status === 'need-target') {
    state.pending = record;
    ui.target = { effect: result.effect, cardId: result.cardId };
    saveState();
    render();
    return;
  }
  state.pending = null;
  ui.target = null;
  state.history.push(record);
  const fxSteps = record.steps.filter((s) => s.kind !== 'draw');
  ui.fxQueue = fxSteps.length ? fxSteps : null;
  if (!ui.fxQueue) celebrateIfLeadTaken(record.playerId);
  saveState();
  render();
  ui.justDrawn = null;
  ui.leadGlow = null;
}

// The celebration is judged AFTER full resolution (a sabotage can change the
// leader as much as the draw itself).
function celebrateIfLeadTaken(playerId) {
  const player = state.players.find((p) => p.id === playerId);
  if (player && tookLeadAfterDraw(ui.prevLeader, player)) ui.leadGlow = playerId;
  ui.prevLeader = null;
}

function dealRandom(playerId) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || state.deck.length === 0 || state.pending) return;
  ui.prevLeader = currentLeader();
  const card = state.deck.pop();
  player.cards.push(card);
  ui.justDrawn = { playerId, cardId: card.id };
  advanceRecord(beginRecord(playerId, 'deal', card.id, state.deck.length));
}

function pickCard(playerId, index) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || index < 0 || index >= state.deck.length || state.pending) return;
  ui.prevLeader = currentLeader();
  const [card] = state.deck.splice(index, 1);
  player.cards.push(card);
  const record = beginRecord(playerId, 'pick', card.id, index);
  ui.sheetFor = null;
  // Two-stage flip reveal first; effects resolve when it's dismissed.
  ui.reveal = { playerId, cardId: card.id, stage: 1, record };
  clearTimeout(revealTimer);
  revealTimer = setTimeout(() => {
    if (ui.reveal && ui.reveal.stage === 1) {
      ui.reveal.stage = 2;
      render();
    }
  }, 900);
  state.pending = record;
  saveState();
  render();
}

function dismissReveal() {
  clearTimeout(revealTimer);
  const reveal = ui.reveal;
  ui.reveal = null;
  if (reveal && reveal.record) {
    advanceRecord(reveal.record);
    return;
  }
  render();
}

function undoLastDraw() {
  if (state.pending) return; // mid-choice; resolve or reset first
  const record = state.history.pop();
  if (!record) return;
  undoRecord(state, record);
  const viewed = state.players.find((p) => p.id === ui.viewerFor);
  if (viewed && viewed.cards.length === 0) ui.viewerFor = null;
  saveState();
  render();
}

function resetGame() {
  clearTimeout(resetTimer);
  ui.confirmReset = false;
  ui.sheetFor = null;
  ui.viewerFor = null;
  clearTimeout(revealTimer);
  ui.reveal = null;
  ui.leadGlow = null;
  ui.target = null;
  ui.fxQueue = null;
  ui.prevLeader = null;
  const names = state.players.map((p) => ({ id: p.id, name: p.name, cards: [], shield: false }));
  state = {
    ...defaultState(),
    includeJokers: state.includeJokers,
    drawMode: state.drawMode,
    effectsEnabled: state.effectsEnabled,
    effectMap: { ...state.effectMap },
    players: names,
  };
  saveState();
  render();
}

// --- leaderboard -----------------------------------------------------------------

function rankedEntries() {
  const entries = state.players.map((p) => ({ player: p, hand: evaluateHand(p.cards) }));
  entries.sort((a, b) => {
    if (!a.hand && !b.hand) return 0;
    if (!a.hand) return 1;
    if (!b.hand) return -1;
    return compareScores(b.hand.score, a.hand.score);
  });
  entries.forEach((entry, i) => {
    if (i === 0) {
      entry.rank = 1;
      return;
    }
    const prev = entries[i - 1];
    const tied =
      (!entry.hand && !prev.hand) ||
      (entry.hand && prev.hand && compareScores(entry.hand.score, prev.hand.score) === 0);
    entry.rank = tied ? prev.rank : i + 1;
  });
  const leader = entries[0];
  if (leader && leader.hand && state.deck.length) {
    for (const entry of entries) {
      if (entry.rank > 1) {
        entry.outs = countOuts(entry.player.cards, leader.hand.score, state.deck);
      }
    }
  }
  return entries;
}

// --- rendering ----------------------------------------------------------------------

const app = document.getElementById('app');

function cardWrap(card, { flip = false, group = '' } = {}) {
  const cls = `card-wrap${group ? ` ${group}` : ''}`;
  if (flip) {
    return (
      `<span class="${cls} flip"><span class="flip-inner">` +
      `<span class="flip-face">${renderCardSVG(card)}</span>` +
      `<span class="flip-back">${renderCardSVG('back')}</span>` +
      '</span></span>'
    );
  }
  return `<span class="${cls}">${renderCardSVG(card)}</span>`;
}

function setupScreen() {
  const count = state.players.length;
  const canStart = count >= MIN_PLAYERS;
  const full = count >= MAX_PLAYERS;

  const rows = state.players
    .map(
      (p, i) => `
      <li class="player-row">
        <span class="seat">${i + 1}</span>
        <input type="text" value="${esc(p.name)}" maxlength="24" aria-label="Rename ${esc(p.name)}"
               data-rename="${p.id}" enterkeyhint="done" />
        <button class="btn btn-quiet btn-icon" data-action="remove-player" data-player="${p.id}"
                aria-label="Remove ${esc(p.name)}">${ICONS.cross}</button>
      </li>`
    )
    .join('');

  return `
    <header class="masthead">
      <p class="eyebrow">Pass &amp; play</p>
      <h1>Card Drawer</h1>
      <p class="tagline">One deck, your table, best hand on top.</p>
      ${ICONS.ornament}
    </header>

    <section class="panel" aria-labelledby="players-h">
      <h2 id="players-h">Players</h2>
      <form class="add-player-form" data-form="add-player">
        <input type="text" name="playerName" maxlength="24" autocomplete="off"
               placeholder="${full ? 'Table is full' : esc(defaultPlayerName())}"
               aria-label="New player name" ${full ? 'disabled' : ''} />
        <button class="btn btn-icon" type="submit" aria-label="Add player" ${full ? 'disabled' : ''}>${ICONS.plus}</button>
      </form>
      ${rows ? `<ul class="player-list">${rows}</ul>` : ''}
      <p class="setup-hint">${
        full
          ? 'Table is full — ten seats taken.'
          : canStart
            ? `${count} of ${MAX_PLAYERS} seats taken.`
            : 'Add at least 2 players to start.'
      }</p>
    </section>

    <section class="panel" aria-labelledby="mode-h">
      <h2 id="mode-h">Draw mode</h2>
      <div class="mode-toggle" role="group" aria-label="Draw mode">
        <button class="btn" data-action="set-mode" data-mode="random" aria-pressed="${state.drawMode === 'random'}">Random</button>
        <button class="btn" data-action="set-mode" data-mode="manual" aria-pressed="${state.drawMode === 'manual'}">Pick</button>
      </div>
      <p class="setup-hint">${
        state.drawMode === 'random'
          ? 'Cards are dealt from the top of the shuffled deck.'
          : 'The deck fans out face-down and each player taps a card.'
      }</p>
    </section>

    <section class="panel" aria-labelledby="deck-h">
      <h2 id="deck-h">Deck</h2>
      <div class="toggle-row">
        <div class="toggle-copy">
          <strong>Include jokers</strong>
          <p>Two wild cards — 54 instead of 52.</p>
        </div>
        <label class="switch">
          <input type="checkbox" data-toggle="jokers" ${state.includeJokers ? 'checked' : ''}
                 aria-label="Include jokers" />
          <span class="track"></span><span class="thumb"></span>
        </label>
      </div>
    </section>

    ${effectsSection()}

    <button class="btn btn-primary btn-block" data-action="start" ${canStart ? '' : 'disabled'}>
      Start game
    </button>
  `;
}

// Effect chips are colored per effect id via the fx-<id> class; the picker
// opens inline under the grid for the tapped rank.
function effectsSection() {
  const grid = RANKS.map((rank) => {
    const fx = state.effectMap[rank];
    return (
      `<button class="rank-chip${fx ? ` has-fx fx-${fx}` : ''}${ui.fxPickerFor === rank ? ' open' : ''}"` +
      ` data-action="fx-chip" data-rank="${rank}"` +
      ` aria-label="${rankLabel(rank)}: ${fx ? EFFECTS[fx].label : 'no effect'}">` +
      `${rankLabel(rank)}${fx ? '<span class="fx-dot"></span>' : ''}</button>`
    );
  }).join('');

  let picker = '';
  if (ui.fxPickerFor !== null) {
    const rank = ui.fxPickerFor;
    const current = state.effectMap[rank] || null;
    const options = [
      `<button class="fx-opt${current === null ? ' sel' : ''}" data-action="fx-assign" data-rank="${rank}" data-fx="">` +
        '<strong>None</strong><span>Just a normal card.</span></button>',
      ...EFFECT_IDS.map(
        (id) =>
          `<button class="fx-opt fx-${id}${current === id ? ' sel' : ''}" data-action="fx-assign" data-rank="${rank}" data-fx="${id}">` +
          `<strong>${EFFECTS[id].label}</strong><span>${EFFECTS[id].desc}</span></button>`
      ),
    ].join('');
    picker = `
      <div class="fx-picker" role="group" aria-label="Effect for ${rankLabel(rank)}">
        <p class="fx-picker-title">Effect for <strong>${rankLabel(rank)}</strong></p>
        ${options}
      </div>`;
  }

  return `
    <section class="panel" aria-labelledby="fx-h">
      <h2 id="fx-h">Card effects</h2>
      <div class="toggle-row">
        <div class="toggle-copy">
          <strong>Enable effects</strong>
          <p>Ranks carry abilities that fire when drawn.</p>
        </div>
        <label class="switch">
          <input type="checkbox" data-toggle="effects" ${state.effectsEnabled ? 'checked' : ''}
                 aria-label="Enable card effects" />
          <span class="track"></span><span class="thumb"></span>
        </label>
      </div>
      ${state.effectsEnabled ? `<div class="rank-grid">${grid}</div>${picker}` : ''}
    </section>
  `;
}

// One tile per seat. Rank/crown/outs come from rankedEntries so the tiles ARE
// the leaderboard; seat order never changes, only the badges update.
function playerTile(player, meta) {
  const hand = evaluateHand(player.cards);
  const deckEmpty = state.deck.length === 0;
  const locked = state.pending !== null;
  let fan = '<span class="fan-empty">No cards yet</span>';
  if (player.cards.length) {
    const bestSet = new Set(hand.bestFive);
    const spares = player.cards
      .filter((card) => !bestSet.has(card))
      .sort((a, b) => (b.rank || 15) - (a.rank || 15));
    const wrap = (card, group) =>
      cardWrap(card, { flip: ui.justDrawn && ui.justDrawn.cardId === card.id, group });
    fan =
      hand.bestFive.map((card) => wrap(card, 'best')).join('') +
      spares.map((card) => wrap(card, 'spare')).join('');
  }
  const isLeader = meta.rank === 1 && hand;
  const actionLabel = state.drawMode === 'random' ? 'Deal' : 'Pick';
  const action = state.drawMode === 'random' ? 'deal' : 'open-sheet';
  const fanAttrs = player.cards.length
    ? ` data-action="view-cards" data-player="${player.id}" role="button" tabindex="0"` +
      ` aria-label="View ${esc(player.name)}'s cards"`
    : '';
  const outs =
    meta.outs === undefined
      ? ''
      : `<span class="tile-outs">${
          meta.outs
            ? `${meta.outs} card${meta.outs === 1 ? '' : 's'} can take the lead`
            : 'No single card takes the lead'
        }</span>`;

  return `
    <section class="tile${isLeader ? ' tile-leader' : ''}${ui.leadGlow === player.id ? ' tile-glow' : ''}">
      <div class="tile-head">
        <span class="tile-rank${isLeader ? ' lead' : ''}">${meta.rank}</span>
        ${isLeader ? `<span class="tile-crown">${ICONS.crown}</span>` : ''}
        <h3 class="tile-name">${esc(player.name)}</h3>
        ${player.shield ? `<span class="tile-shield" aria-label="Shielded">${ICONS.shield}</span>` : ''}
        <span class="tile-count">${player.cards.length}c</span>
      </div>
      <div class="fan tile-fan"${fanAttrs}>${fan}</div>
      <p class="tile-hand">${hand ? esc(hand.name) : '&nbsp;'}</p>
      ${outs}
      <button class="btn tile-btn" data-action="${action}" data-player="${player.id}"
              ${deckEmpty || locked ? 'disabled' : ''}>
        ${deckEmpty ? 'Deck empty' : actionLabel}
      </button>
    </section>
  `;
}

function dealerBar() {
  const left = state.deck.length;
  const burned = state.graveyard.length;
  const empty = left === 0;
  return `
    <div class="dealer-bar">
      <div class="dealer-row">
        <div class="deck-stack${empty ? ' deck-empty' : ''}" aria-hidden="true">
          ${renderCardSVG('back')}${renderCardSVG('back')}
        </div>
        <div class="deck-meta" aria-live="polite">
          <p class="eyebrow" style="margin:0">Card Drawer</p>
          <span class="deck-count${empty ? ' deck-empty-note' : ''}">
            ${empty ? 'Deck empty' : `${left} <span class="unit">left</span>`}
            ${burned ? `<span class="burned-count">&middot; ${burned} burned</span>` : ''}
          </span>
        </div>
        <div class="dealer-actions">
          <button class="btn btn-quiet btn-icon" data-action="undo" aria-label="Undo last draw"
                  ${state.history.length && !state.pending ? '' : 'disabled'}>${ICONS.undo}</button>
          <button class="btn ${ui.confirmReset ? 'btn-danger' : 'btn-quiet'}" data-action="reset">
            ${ui.confirmReset ? 'Confirm' : 'Reset'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function sheetHTML() {
  const player = state.players.find((p) => p.id === ui.sheetFor);
  if (!player) return '';
  const left = state.deck.length;
  const backs = state.deck
    .map(
      (_, i) =>
        `<button class="pick-card" data-action="pick" data-index="${i}" ` +
        `aria-label="Face-down card ${i + 1} of ${left}">${renderCardSVG('back')}</button>`
    )
    .join('');
  return `
    <div class="sheet-backdrop" data-action="close-sheet"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Pick a card for ${esc(player.name)}">
      <div class="sheet-head">
        <h2>Pick a card for ${esc(player.name)}
          <span class="sheet-sub">${left} face-down card${left === 1 ? '' : 's'} — tap one</span>
        </h2>
        <button class="btn btn-quiet btn-icon" data-action="close-sheet" aria-label="Close">${ICONS.cross}</button>
      </div>
      <div class="sheet-body"><div class="pick-grid">${backs}</div></div>
    </div>
  `;
}

function viewerHTML() {
  const player = state.players.find((p) => p.id === ui.viewerFor);
  if (!player || !player.cards.length) return '';
  const hand = evaluateHand(player.cards);
  const bestSet = new Set(hand.bestFive);
  const spares = player.cards
    .filter((card) => !bestSet.has(card))
    .sort((a, b) => (b.rank || 15) - (a.rank || 15));
  return `
    <div class="viewer" role="dialog" aria-modal="true" aria-label="${esc(player.name)}'s cards">
      <div class="viewer-head">
        <div>
          <h2 class="viewer-name">${esc(player.name)}</h2>
          <p class="viewer-sub">${esc(hand.name)} — ${player.cards.length} card${player.cards.length === 1 ? '' : 's'}</p>
        </div>
        <button class="btn btn-quiet btn-icon" data-action="close-viewer" aria-label="Close">${ICONS.cross}</button>
      </div>
      <div class="viewer-body">
        <h3 class="viewer-section">Best hand</h3>
        <div class="viewer-grid viewer-grid-best">${hand.bestFive.map((card) => cardWrap(card)).join('')}</div>
        ${
          spares.length
            ? `<h3 class="viewer-section">Other cards</h3>
        <div class="viewer-grid">${spares.map((card) => cardWrap(card)).join('')}</div>`
            : ''
        }
        <button class="btn btn-block" data-action="close-viewer">Close</button>
      </div>
    </div>
  `;
}

function revealOverlayHTML() {
  const player = state.players.find((p) => p.id === ui.reveal.playerId);
  if (!player) return '';
  const card = player.cards.find((c) => c.id === ui.reveal.cardId);
  if (!card) return '';
  if (ui.reveal.stage === 1) {
    return `
    <div class="overlay reveal-overlay" role="dialog" aria-modal="true"
         aria-label="${esc(player.name)} draws" data-action="reveal-continue">
      <div class="reveal-stage">
        <div class="reveal-card">${cardWrap(card, { flip: true })}</div>
        <p class="reveal-caption">${esc(player.name)} draws…</p>
      </div>
    </div>`;
  }
  const hand = evaluateHand(player.cards);
  return `
    <div class="overlay reveal-overlay" role="dialog" aria-modal="true"
         aria-label="${esc(player.name)}'s best hand" data-action="reveal-done">
      <div class="reveal-stage">
        <div class="reveal-best">${hand.bestFive
          .map((c) => cardWrap(c, { group: c.id === ui.reveal.cardId ? 'just' : '' }))
          .join('')}</div>
        <p class="reveal-hand">${esc(hand.name)}</p>
        <p class="reveal-caption">${esc(player.name)}</p>
        <button class="btn btn-primary" data-action="reveal-done">Done</button>
      </div>
    </div>`;
}

function gameScreen() {
  const metas = new Map(
    rankedEntries().map((entry) => [entry.player.id, { rank: entry.rank, outs: entry.outs }])
  );
  const overlayOpen =
    ui.viewerFor !== null || ui.sheetFor !== null || ui.reveal !== null ||
    ui.target !== null || ui.fxQueue !== null;
  return `
    <div class="board board-play"${overlayOpen ? ' inert' : ''}>
      ${dealerBar()}
      <div class="tile-grid tile-grid-${Math.min(state.players.length, 10)}">
        ${state.players.map((p) => playerTile(p, metas.get(p.id))).join('')}
      </div>
    </div>
    ${ui.viewerFor !== null ? viewerHTML() : ''}
    ${ui.sheetFor !== null ? sheetHTML() : ''}
    ${ui.reveal ? revealOverlayHTML() : ''}
    ${ui.target ? targetOverlayHTML() : ''}
    ${ui.fxQueue ? fxOverlayHTML() : ''}
  `;
}

function targetOverlayHTML() {
  const record = state.pending;
  if (!record || !ui.target) return '';
  const drawer = state.players.find((p) => p.id === record.playerId);
  const fx = EFFECTS[ui.target.effect];
  const card = drawer.cards.find((c) => c.id === ui.target.cardId);
  const rows = legalTargets(state, record.playerId)
    .map(
      (p) => `
      <li>
        <button class="btn target-row" data-action="choose-target" data-target="${p.id}">
          <span class="target-name">${esc(p.name)}</span>
          ${p.shield ? `<span class="target-shield">${ICONS.shield} shielded</span>` : ''}
          <span class="target-count">${p.cards.length}c</span>
        </button>
      </li>`
    )
    .join('');
  return `
    <div class="overlay target-overlay" role="dialog" aria-modal="true" aria-label="${esc(fx.label)}">
      <div class="panel">
        <h2 class="fx-title fx-${ui.target.effect}">${esc(fx.label)}</h2>
        <div class="target-card">${card ? cardWrap(card) : ''}</div>
        <p class="target-copy">${esc(drawer.name)} — choose an opponent.</p>
        <ul class="target-list">${rows}</ul>
      </div>
    </div>
  `;
}

// One overlay per resolution step; tap advances the queue.
function fxOverlayHTML() {
  const step = ui.fxQueue[0];
  const record = state.history[state.history.length - 1];
  const drawer = state.players.find((p) => p.id === record.playerId);
  const targetPlayer =
    step.targetId !== undefined ? state.players.find((p) => p.id === step.targetId) : null;
  const cardById = (id) => {
    const all = state.players.flatMap((p) => p.cards).concat(state.deck, state.graveyard);
    return all.find((c) => c.id === id) || null;
  };
  let effect = '';
  let shown = null;
  let caption = '';
  switch (step.kind) {
    case 'bonus-draw':
      effect = 'bonus';
      shown = cardById(step.cardId);
      caption = `${esc(drawer.name)} draws again`;
      break;
    case 'burn':
      effect = 'burn';
      shown = cardById(step.burnedId);
      caption = 'Burned from the deck';
      break;
    case 'sabotage':
      effect = 'sabotage';
      shown = cardById(step.destroyedId);
      caption = `${esc(targetPlayer.name)}'s card is destroyed`;
      break;
    case 'steal':
      effect = 'steal';
      shown = cardById(step.stolenId);
      caption = `${esc(drawer.name)} steals from ${esc(targetPlayer.name)}`;
      break;
    case 'swap':
      effect = 'swap';
      caption = `${esc(drawer.name)} swaps hands with ${esc(targetPlayer.name)}`;
      break;
    case 'shield-gain':
      effect = 'shield';
      caption = `${esc(drawer.name)} raises a shield`;
      break;
    case 'shield-noop':
      effect = 'shield';
      caption = `${esc(drawer.name)} is already shielded`;
      break;
    case 'blocked':
      effect = 'shield';
      caption = `${esc(targetPlayer.name)}'s shield blocks it`;
      break;
    case 'fizzle':
      effect = step.effect;
      caption = 'No effect';
      break;
    default:
      break;
  }
  const label = EFFECTS[effect] ? EFFECTS[effect].label : '';
  return `
    <div class="overlay reveal-overlay fx-overlay" role="dialog" aria-modal="true"
         aria-label="${esc(label)}" data-action="fx-continue">
      <div class="reveal-stage">
        <p class="fx-title fx-${effect}">${esc(label)}</p>
        ${shown ? `<div class="reveal-card">${cardWrap(shown)}</div>` : ''}
        ${effect === 'shield' && !shown ? `<div class="fx-big-shield">${ICONS.shield}</div>` : ''}
        <p class="reveal-caption">${caption}</p>
        <button class="btn btn-primary" data-action="fx-continue">
          ${ui.fxQueue.length > 1 ? 'Next' : 'Done'}
        </button>
      </div>
    </div>
  `;
}

function resumeOverlay() {
  return `
    <div class="overlay">
      <div class="panel" role="dialog" aria-modal="true" aria-labelledby="resume-h">
        <h2 id="resume-h">Game in progress</h2>
        <p>A saved game with ${ui.resume.players.length} players was found on this device.</p>
        <div class="overlay-actions">
          <button class="btn btn-primary" data-action="resume">Resume</button>
          <button class="btn btn-quiet" data-action="discard-resume">Start over</button>
        </div>
      </div>
    </div>
  `;
}

function render() {
  document.body.classList.toggle('in-game', state.phase === 'playing' && !ui.resume);
  const screen = state.phase === 'setup' ? setupScreen() : gameScreen();
  app.innerHTML = ui.resume ? `<div class="board" inert>${screen}</div>${resumeOverlay()}` : screen;
}

// --- events (delegated once) -----------------------------------------------------

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled) return;
  const playerId = Number(target.dataset.player);

  switch (target.dataset.action) {
    case 'remove-player':
      removePlayer(playerId);
      break;
    case 'start':
      startGame();
      break;
    case 'deal':
      dealRandom(playerId);
      break;
    case 'open-sheet':
      ui.sheetFor = playerId;
      render();
      break;
    case 'close-sheet':
      ui.sheetFor = null;
      render();
      break;
    case 'pick': {
      const sheetPlayer = ui.sheetFor;
      if (sheetPlayer !== null) pickCard(sheetPlayer, Number(target.dataset.index));
      break;
    }
    case 'view-cards':
      ui.viewerFor = playerId;
      render();
      break;
    case 'close-viewer':
      ui.viewerFor = null;
      render();
      break;
    case 'reveal-continue':
      clearTimeout(revealTimer);
      if (ui.reveal) {
        ui.reveal.stage = 2;
        render();
      }
      break;
    case 'reveal-done':
      dismissReveal();
      break;
    case 'undo':
      undoLastDraw();
      break;
    case 'choose-target': {
      const record = state.pending;
      if (record) advanceRecord(record, true, Number(target.dataset.target));
      break;
    }
    case 'fx-continue': {
      ui.fxQueue = ui.fxQueue && ui.fxQueue.length > 1 ? ui.fxQueue.slice(1) : null;
      if (!ui.fxQueue) {
        const last = state.history[state.history.length - 1];
        if (last) celebrateIfLeadTaken(last.playerId);
      }
      render();
      ui.leadGlow = null;
      break;
    }
    case 'set-mode':
      state.drawMode = target.dataset.mode === 'manual' ? 'manual' : 'random';
      saveState();
      render();
      break;
    case 'fx-chip': {
      const rank = Number(target.dataset.rank);
      ui.fxPickerFor = ui.fxPickerFor === rank ? null : rank;
      render();
      break;
    }
    case 'fx-assign': {
      const rank = Number(target.dataset.rank);
      if (target.dataset.fx) state.effectMap[rank] = target.dataset.fx;
      else delete state.effectMap[rank];
      ui.fxPickerFor = null;
      saveState();
      render();
      break;
    }
    case 'reset':
      if (ui.confirmReset) {
        resetGame();
      } else {
        ui.confirmReset = true;
        render();
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          ui.confirmReset = false;
          render();
        }, 2600);
      }
      break;
    case 'resume':
      state = ui.resume;
      ui.resume = null;
      if (state.pending) {
        const result = advanceDraw(state, state.pending);
        if (result.status === 'need-target') {
          ui.target = { effect: result.effect, cardId: result.cardId };
        } else {
          state.history.push(state.pending);
          state.pending = null;
        }
      }
      saveState();
      render();
      break;
    case 'discard-resume':
      ui.resume = null;
      saveState();
      render();
      break;
    default:
      break;
  }
});

app.addEventListener('submit', (event) => {
  const form = event.target.closest('[data-form="add-player"]');
  if (!form) return;
  event.preventDefault();
  const input = form.elements.playerName;
  if (addPlayer(input.value)) {
    render();
    const fresh = app.querySelector('.add-player-form input');
    if (fresh) fresh.focus();
  } else {
    input.focus();
  }
});

app.addEventListener('change', (event) => {
  const rename = event.target.closest('[data-rename]');
  if (rename) {
    renamePlayer(Number(rename.dataset.rename), rename.value);
    return;
  }
  if (event.target.closest('[data-toggle="jokers"]')) {
    state.includeJokers = event.target.checked;
    saveState();
    render();
  }
  if (event.target.closest('[data-toggle="effects"]')) {
    state.effectsEnabled = event.target.checked;
    ui.fxPickerFor = null;
    saveState();
    render();
  }
});

app.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const fan = event.target.closest('[data-action="view-cards"]');
  if (!fan) return;
  event.preventDefault();
  ui.viewerFor = Number(fan.dataset.player);
  render();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (ui.target) return;
  if (ui.fxQueue) {
    ui.fxQueue = ui.fxQueue.length > 1 ? ui.fxQueue.slice(1) : null;
    render();
    return;
  }
  if (ui.reveal) {
    dismissReveal();
    return;
  }
  if (ui.viewerFor !== null) {
    ui.viewerFor = null;
    render();
    return;
  }
  if (ui.sheetFor !== null) {
    ui.sheetFor = null;
    render();
  }
});

// --- boot -------------------------------------------------------------------------

const saved = loadSaved();
if (saved && saved.phase === 'playing') {
  ui.resume = saved; // offer Resume / Start over
} else if (saved) {
  state = saved; // quietly restore the setup screen (player list, joker toggle)
}
render();
