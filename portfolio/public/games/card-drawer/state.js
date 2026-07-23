// Card Drawer — state shape, save validation, legacy migration. Pure: no DOM,
// no storage access (game.js owns localStorage and rendering).

import { createDeck } from './hand-eval.js';
import { EFFECTS, DEFAULT_EFFECT_MAP } from './effects.js';

export const STORAGE_KEY = 'card-drawer:v2';
export const LEGACY_STORAGE_KEY = 'card-drawer:v1';
export const MAX_PLAYERS = 10;
export const MIN_PLAYERS = 2;

export function defaultState() {
  return {
    phase: 'setup',
    includeJokers: false,
    drawMode: 'random',
    effectsEnabled: false,
    effectMap: { ...DEFAULT_EFFECT_MAP },
    players: [],
    deck: [],
    graveyard: [],
    history: [],
    pending: null,
  };
}

const STEP_KINDS = new Set([
  'draw', 'bonus-draw', 'burn', 'sabotage', 'steal', 'swap',
  'shield-gain', 'shield-noop', 'blocked', 'fizzle',
]);

function normalizeEffectMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const map = {};
  for (const [key, value] of Object.entries(raw)) {
    const rank = Number(key);
    if (!Number.isInteger(rank) || rank < 2 || rank > 14) return null;
    if (!EFFECTS[value]) return null;
    map[rank] = value;
  }
  return map;
}

// Structural check of an ActionRecord. Card ids are only matched against
// piles at undo time (defensively), so this validates shape + indices.
function normalizeRecord(raw, playerIds) {
  if (!raw || typeof raw !== 'object') return null;
  if (!playerIds.has(raw.playerId)) return null;
  if (raw.via !== 'deal' && raw.via !== 'pick') return null;
  if (!Array.isArray(raw.steps) || !raw.steps.length || !Array.isArray(raw.queue)) return null;
  if (!raw.queue.every((id) => typeof id === 'string')) return null;
  for (const step of raw.steps) {
    if (!step || !STEP_KINDS.has(step.kind)) return null;
    if (typeof step.cardId !== 'string') return null;
    if (['sabotage', 'steal', 'swap', 'blocked'].includes(step.kind)) {
      if (!playerIds.has(step.targetId)) return null;
    } else if (step.targetId !== undefined) return null;
    if (['draw', 'bonus-draw', 'burn'].includes(step.kind)) {
      if (!Number.isInteger(step.deckIndex) || step.deckIndex < 0) return null;
    }
    if (['sabotage', 'steal'].includes(step.kind)) {
      if (!Number.isInteger(step.targetIndex) || step.targetIndex < 0) return null;
    }
    if (step.kind === 'burn' && typeof step.burnedId !== 'string') return null;
    if (step.kind === 'sabotage' && typeof step.destroyedId !== 'string') return null;
    if (step.kind === 'steal' && typeof step.stolenId !== 'string') return null;
    if (step.kind === 'swap') {
      const strings = (a) => Array.isArray(a) && a.every((id) => typeof id === 'string');
      if (!strings(step.drawerCardIds) || !strings(step.targetCardIds)) return null;
    }
  }
  return {
    playerId: raw.playerId,
    via: raw.via,
    steps: raw.steps.map((s) => ({ ...s })),
    queue: raw.queue.slice(),
  };
}

// Validate the shape and card integrity of a stored v2 state; returns a clean
// state (cards re-mapped onto canonical deck objects) or null.
export function normalizeState(s) {
  if (!s || typeof s !== 'object') return null;
  if (s.phase !== 'setup' && s.phase !== 'playing') return null;
  if (s.drawMode !== 'random' && s.drawMode !== 'manual') return null;
  if (typeof s.includeJokers !== 'boolean') return null;
  if (typeof s.effectsEnabled !== 'boolean') return null;
  const effectMap = normalizeEffectMap(s.effectMap);
  if (!effectMap) return null;
  if (!Array.isArray(s.players) || s.players.length > MAX_PLAYERS) return null;
  if (!Array.isArray(s.deck) || !Array.isArray(s.graveyard) || !Array.isArray(s.history)) return null;

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
    players.push({ id: p.id, name: p.name.trim().slice(0, 24), cards, shield: p.shield === true });
  }
  if (new Set(players.map((p) => p.id)).size !== players.length) return null;

  const deck = s.deck.map(mapCard);
  if (deck.some((card) => card === null)) return null;
  const graveyard = s.graveyard.map(mapCard);
  if (graveyard.some((card) => card === null)) return null;

  if (s.phase === 'playing') {
    if (players.length < MIN_PLAYERS) return null;
    if (seen.size !== universe.size) return null; // deck + hands + graveyard = every card
  }

  const playerIds = new Set(players.map((p) => p.id));
  const history = [];
  for (const h of s.history) {
    const record = normalizeRecord(h, playerIds);
    if (!record || record.queue.length) return null; // history records are complete
    history.push(record);
  }

  let pending = null;
  if (s.pending !== null && s.pending !== undefined) {
    if (s.phase !== 'playing') return null;
    pending = normalizeRecord(s.pending, playerIds);
    if (!pending || !pending.queue.length) return null;
  }

  return {
    phase: s.phase,
    includeJokers: s.includeJokers,
    drawMode: s.drawMode,
    effectsEnabled: s.effectsEnabled,
    effectMap,
    players,
    deck,
    graveyard,
    history,
    pending,
  };
}

// One-time upgrade of a card-drawer:v1 save: effects off, empty graveyard, no
// shields. Legacy {playerId, cardId} history entries become single-step draw
// records whose deckIndex clamps to the deck end — undo pushes the card back
// on top, exactly the v1 behavior.
export function migrateLegacy(v1) {
  if (!v1 || typeof v1 !== 'object') return null;
  const deckLength = Array.isArray(v1.deck) ? v1.deck.length : 0;
  return normalizeState({
    phase: v1.phase,
    includeJokers: v1.includeJokers,
    drawMode: v1.drawMode,
    effectsEnabled: false,
    effectMap: { ...DEFAULT_EFFECT_MAP },
    players: Array.isArray(v1.players)
      ? v1.players.map((p) => (p && typeof p === 'object' ? { ...p, shield: false } : p))
      : v1.players,
    deck: v1.deck,
    graveyard: [],
    history: Array.isArray(v1.history)
      ? v1.history.map((h) => ({
          playerId: h ? h.playerId : undefined,
          via: 'deal',
          steps: [{ kind: 'draw', cardId: h ? h.cardId : undefined, deckIndex: deckLength }],
          queue: [],
        }))
      : v1.history,
    pending: null,
  });
}
