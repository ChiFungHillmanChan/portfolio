// Card Drawer — UI + state. Pure logic lives in hand-eval.js (poker) and
// card-svg.js (rendering); this module only composes them and manages state.

import { createDeck, shuffle, evaluateHand, compareScores, countOuts } from './hand-eval.js';
import { renderCardSVG } from './card-svg.js';

const STORAGE_KEY = 'card-drawer:v1';
const MAX_PLAYERS = 10;
const MIN_PLAYERS = 2;

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

function defaultState() {
  return {
    phase: 'setup',
    includeJokers: false,
    drawMode: 'random',
    players: [],
    deck: [],
    history: [],
  };
}

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
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return normalizeState(parsed);
}

// Validate the shape and card integrity of a stored state; returns a clean
// state (cards re-mapped onto canonical deck objects) or null.
function normalizeState(s) {
  if (!s || typeof s !== 'object') return null;
  if (s.phase !== 'setup' && s.phase !== 'playing') return null;
  if (s.drawMode !== 'random' && s.drawMode !== 'manual') return null;
  if (typeof s.includeJokers !== 'boolean') return null;
  if (!Array.isArray(s.players) || s.players.length > MAX_PLAYERS) return null;
  if (!Array.isArray(s.deck) || !Array.isArray(s.history)) return null;

  const universe = new Map(
    createDeck({ includeJokers: s.includeJokers }).map((card) => [card.id, card])
  );
  const seen = new Set();
  const mapCard = (card) => {
    if (!card || typeof card.id !== 'string') return null;
    if (!universe.has(card.id) || seen.has(card.id)) return null;
    seen.add(card.id);
    return universe.get(card.id);
  };

  const players = [];
  for (const p of s.players) {
    if (!p || typeof p.id !== 'number' || typeof p.name !== 'string' || !p.name.trim()) return null;
    if (!Array.isArray(p.cards)) return null;
    const cards = p.cards.map(mapCard);
    if (cards.some((card) => card === null)) return null;
    players.push({ id: p.id, name: p.name.trim().slice(0, 24), cards });
  }
  if (new Set(players.map((p) => p.id)).size !== players.length) return null;

  const deck = s.deck.map(mapCard);
  if (deck.some((card) => card === null)) return null;

  if (s.phase === 'playing') {
    if (players.length < MIN_PLAYERS) return null;
    if (seen.size !== universe.size) return null; // every card accounted for
  }

  const history = [];
  for (const h of s.history) {
    if (!h || typeof h.cardId !== 'string' || !players.some((p) => p.id === h.playerId)) return null;
    history.push({ playerId: h.playerId, cardId: h.cardId });
  }

  return {
    phase: s.phase,
    includeJokers: s.includeJokers,
    drawMode: s.drawMode,
    players,
    deck,
    history,
  };
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
  state.players.push({ id: nextPlayerId(), name: trimmed, cards: [] });
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
  });
  state.deck = shuffle(createDeck({ includeJokers: state.includeJokers }));
  state.history = [];
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

function dealRandom(playerId) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || state.deck.length === 0) return;
  const prevLeader = currentLeader();
  const card = state.deck.pop();
  player.cards.push(card);
  state.history.push({ playerId, cardId: card.id });
  if (tookLeadAfterDraw(prevLeader, player)) {
    ui.leadGlow = playerId;
  }
  ui.justDrawn = { playerId, cardId: card.id };
  saveState();
  render();
  ui.justDrawn = null;
  ui.leadGlow = null;
}

function pickCard(playerId, index) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || index < 0 || index >= state.deck.length) return;
  const prevLeader = currentLeader();
  const [card] = state.deck.splice(index, 1);
  player.cards.push(card);
  state.history.push({ playerId, cardId: card.id });
  const tookLead = tookLeadAfterDraw(prevLeader, player);
  ui.sheetFor = null;
  ui.reveal = { playerId, cardId: card.id, stage: 1, tookLead };
  clearTimeout(revealTimer);
  revealTimer = setTimeout(() => {
    if (ui.reveal && ui.reveal.stage === 1) {
      ui.reveal.stage = 2;
      render();
    }
  }, 900);
  saveState();
  render();
}

function dismissReveal() {
  clearTimeout(revealTimer);
  const reveal = ui.reveal;
  ui.reveal = null;
  if (reveal && reveal.tookLead) {
    ui.leadGlow = reveal.playerId;
  }
  render();
  ui.leadGlow = null;
}

function undoLastDraw() {
  const last = state.history.pop();
  if (!last) return;
  const player = state.players.find((p) => p.id === last.playerId);
  // Piles are append-only, so the most recent draw is that player's last card.
  if (player && player.cards.length && player.cards[player.cards.length - 1].id === last.cardId) {
    state.deck.push(player.cards.pop());
  }
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
  const names = state.players.map((p) => ({ id: p.id, name: p.name, cards: [] }));
  state = { ...defaultState(), includeJokers: state.includeJokers, players: names };
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

    <button class="btn btn-primary btn-block" data-action="start" ${canStart ? '' : 'disabled'}>
      Start game
    </button>
  `;
}

function playerPanel(player) {
  const hand = evaluateHand(player.cards);
  const deckEmpty = state.deck.length === 0;
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
  const actionLabel = state.drawMode === 'random' ? `Deal to ${esc(player.name)}` : `Pick for ${esc(player.name)}`;
  const action = state.drawMode === 'random' ? 'deal' : 'open-sheet';
  const fanAttrs = player.cards.length
    ? ` data-action="view-cards" data-player="${player.id}" role="button" tabindex="0"` +
      ` aria-label="View ${esc(player.name)}'s cards"`
    : '';

  return `
    <section class="panel player-panel">
      <div class="player-head">
        <h3 class="player-name">${esc(player.name)}</h3>
        <span class="card-count">${player.cards.length} card${player.cards.length === 1 ? '' : 's'}</span>
      </div>
      <div class="fan"${fanAttrs}>${fan}</div>
      ${hand ? `<p class="hand-label">${esc(hand.name)}</p>` : ''}
      <button class="btn btn-block" data-action="${action}" data-player="${player.id}" ${deckEmpty ? 'disabled' : ''}>
        ${deckEmpty ? 'Deck empty' : actionLabel}
      </button>
    </section>
  `;
}

function leaderboardHTML() {
  const rows = rankedEntries()
    .map((entry) => {
      const leader = entry.rank === 1 && entry.hand;
      return `
      <li class="${leader ? 'lb-leader' : ''}${ui.leadGlow === entry.player.id ? ' lb-glow' : ''}">
        <span class="lb-rank">${entry.rank}</span>
        ${leader ? `<span class="lb-crown">${ICONS.crown}</span>` : ''}
        <span class="lb-body">
          <span class="lb-name">${esc(entry.player.name)}</span>
          <span class="lb-hand">${entry.hand ? esc(entry.hand.name) : 'No cards yet'}</span>
          ${
            entry.outs === undefined
              ? ''
              : `<span class="lb-outs">${
                  entry.outs
                    ? `${entry.outs} card${entry.outs === 1 ? '' : 's'} can take the lead`
                    : 'No single card takes the lead'
                }</span>`
          }
        </span>
        <span class="lb-count">${entry.player.cards.length}c</span>
      </li>`;
    })
    .join('');
  return `
    <section class="panel leaderboard" aria-labelledby="lb-h">
      <h2 id="lb-h">Leaderboard</h2>
      <ol>${rows}</ol>
    </section>
  `;
}

function dealerBar() {
  const left = state.deck.length;
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
            ${empty ? 'Deck empty' : `${left} <span class="unit">card${left === 1 ? '' : 's'} left</span>`}
          </span>
        </div>
        <div class="dealer-actions">
          <button class="btn btn-quiet btn-icon" data-action="undo" aria-label="Undo last draw"
                  ${state.history.length ? '' : 'disabled'}>${ICONS.undo}</button>
          <button class="btn ${ui.confirmReset ? 'btn-danger' : 'btn-quiet'}" data-action="reset">
            ${ui.confirmReset ? 'Confirm' : 'Reset'}
          </button>
        </div>
      </div>
      <div class="mode-toggle" role="group" aria-label="Draw mode">
        <button class="btn" data-action="mode" data-mode="random" aria-pressed="${state.drawMode === 'random'}">Random</button>
        <button class="btn" data-action="mode" data-mode="manual" aria-pressed="${state.drawMode === 'manual'}">Pick</button>
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
        ${ui.reveal.tookLead ? SPARKLES : ''}
        ${ui.reveal.tookLead ? `<div class="lead-ribbon">${ICONS.crown}<span>Takes the lead</span></div>` : ''}
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
  const overlayOpen = ui.viewerFor !== null || ui.sheetFor !== null || ui.reveal !== null;
  return `
    <div class="board"${overlayOpen ? ' inert' : ''}>
      ${dealerBar()}
      ${state.players.map(playerPanel).join('')}
      ${leaderboardHTML()}
    </div>
    ${ui.viewerFor !== null ? viewerHTML() : ''}
    ${ui.sheetFor !== null ? sheetHTML() : ''}
    ${ui.reveal ? revealOverlayHTML() : ''}
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
    case 'mode':
      state.drawMode = target.dataset.mode === 'manual' ? 'manual' : 'random';
      saveState();
      render();
      break;
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
