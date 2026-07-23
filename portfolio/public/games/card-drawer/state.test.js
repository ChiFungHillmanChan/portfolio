import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, shuffle } from './hand-eval.js';
import { DEFAULT_EFFECT_MAP } from './effects.js';
import {
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  MAX_PLAYERS,
  MIN_PLAYERS,
  defaultState,
  normalizeState,
  migrateLegacy,
} from './state.js';

test('constants and default state shape', () => {
  assert.equal(STORAGE_KEY, 'card-drawer:v2');
  assert.equal(LEGACY_STORAGE_KEY, 'card-drawer:v1');
  assert.equal(MAX_PLAYERS, 10);
  assert.equal(MIN_PLAYERS, 2);
  const s = defaultState();
  assert.equal(s.phase, 'setup');
  assert.equal(s.effectsEnabled, false);
  assert.deepEqual(s.effectMap, DEFAULT_EFFECT_MAP);
  assert.deepEqual(s.graveyard, []);
  assert.equal(s.pending, null);
});

// A valid mid-game v2 state: every card in exactly one pile.
function playingState() {
  const deck = createDeck();
  const hand1 = deck.slice(0, 3);
  const hand2 = deck.slice(3, 5);
  const grave = deck.slice(5, 6);
  const rest = deck.slice(6);
  return {
    phase: 'playing',
    includeJokers: false,
    drawMode: 'random',
    effectsEnabled: true,
    effectMap: { ...DEFAULT_EFFECT_MAP },
    players: [
      { id: 1, name: 'Anna', cards: hand1, shield: true },
      { id: 2, name: 'Ben', cards: hand2, shield: false },
    ],
    deck: rest,
    graveyard: grave,
    history: [
      {
        playerId: 1,
        via: 'deal',
        steps: [{ kind: 'draw', cardId: hand1[0].id, deckIndex: 51 }],
        queue: [],
      },
    ],
    pending: null,
  };
}

test('normalizeState: accepts a valid playing state round-trip', () => {
  const clean = normalizeState(JSON.parse(JSON.stringify(playingState())));
  assert.ok(clean);
  assert.equal(clean.players[0].shield, true);
  assert.equal(clean.graveyard.length, 1);
  assert.equal(clean.history.length, 1);
});

test('normalizeState: rejects a card present in both hand and graveyard', () => {
  const s = playingState();
  s.graveyard = [s.players[0].cards[0]];
  assert.equal(normalizeState(JSON.parse(JSON.stringify(s))), null);
});

test('normalizeState: rejects playing state with a missing card', () => {
  const s = playingState();
  s.deck = s.deck.slice(1); // one card vanished entirely
  assert.equal(normalizeState(JSON.parse(JSON.stringify(s))), null);
});

test('normalizeState: rejects unknown effect ids and bad ranks', () => {
  const good = playingState();
  const bad1 = { ...good, effectMap: { 2: 'explode' } };
  const bad2 = { ...good, effectMap: { 99: 'sabotage' } };
  assert.equal(normalizeState(JSON.parse(JSON.stringify(bad1))), null);
  assert.equal(normalizeState(JSON.parse(JSON.stringify(bad2))), null);
});

test('normalizeState: history record with unfinished queue is rejected', () => {
  const s = playingState();
  s.history[0].queue = [s.players[0].cards[0].id];
  assert.equal(normalizeState(JSON.parse(JSON.stringify(s))), null);
});

test('normalizeState: valid pending record is kept', () => {
  const s = playingState();
  s.pending = {
    playerId: 1,
    via: 'deal',
    steps: [{ kind: 'draw', cardId: s.players[0].cards[0].id, deckIndex: 51 }],
    queue: [s.players[0].cards[0].id],
  };
  const clean = normalizeState(JSON.parse(JSON.stringify(s)));
  assert.ok(clean);
  assert.equal(clean.pending.playerId, 1);
  assert.deepEqual(clean.pending.queue, [s.players[0].cards[0].id]);
});

test('migrateLegacy: v1 save becomes v2 with effects off and typed history', () => {
  const deck = shuffle(createDeck());
  const drawn = deck.pop();
  const v1 = {
    phase: 'playing',
    includeJokers: false,
    drawMode: 'manual',
    players: [
      { id: 1, name: 'Anna', cards: [drawn] },
      { id: 2, name: 'Ben', cards: deck.splice(0, 1) },
    ],
    deck,
    history: [{ playerId: 1, cardId: drawn.id }],
  };
  const v2 = migrateLegacy(JSON.parse(JSON.stringify(v1)));
  assert.ok(v2);
  assert.equal(v2.effectsEnabled, false);
  assert.deepEqual(v2.effectMap, DEFAULT_EFFECT_MAP);
  assert.deepEqual(v2.graveyard, []);
  assert.equal(v2.pending, null);
  assert.equal(v2.players[0].shield, false);
  assert.equal(v2.history.length, 1);
  assert.equal(v2.history[0].steps[0].kind, 'draw');
  assert.equal(v2.history[0].steps[0].cardId, drawn.id);
});

test('migrateLegacy: garbage input returns null', () => {
  assert.equal(migrateLegacy(null), null);
  assert.equal(migrateLegacy({ phase: 'nope' }), null);
});
