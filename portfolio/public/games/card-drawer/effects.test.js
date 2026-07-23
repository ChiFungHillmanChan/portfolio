// Tests for the effects engine. States are hand-built plain objects — the
// engine must never touch DOM or module state.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck } from './hand-eval.js';
import {
  EFFECTS,
  EFFECT_IDS,
  DEFAULT_EFFECT_MAP,
  effectForCard,
  legalTargets,
  beginRecord,
} from './effects.js';

const FULL_DECK = createDeck({ includeJokers: true });
export const card = (id) => {
  const found = FULL_DECK.find((c) => c.id === id);
  assert.ok(found, `unknown card id ${id}`);
  return found;
};

export function makeState(overrides = {}) {
  return {
    phase: 'playing',
    includeJokers: false,
    drawMode: 'random',
    effectsEnabled: true,
    effectMap: { ...DEFAULT_EFFECT_MAP },
    players: [],
    deck: [],
    graveyard: [],
    history: [],
    pending: null,
    ...overrides,
  };
}

export const seat = (id, name, ids = [], shield = false) => ({
  id,
  name,
  cards: ids.map(card),
  shield,
});

// Deterministic rng: yields the given values in order, repeats the last.
export const rig = (...vals) => {
  let i = 0;
  return () => vals[Math.min(i++, vals.length - 1)];
};

test('catalog: six effects, picker order, default preset', () => {
  assert.deepEqual(EFFECT_IDS, ['sabotage', 'bonus', 'burn', 'steal', 'swap', 'shield']);
  for (const id of EFFECT_IDS) {
    assert.ok(EFFECTS[id].label && EFFECTS[id].desc, `${id} needs label + desc`);
    assert.equal(typeof EFFECTS[id].needsTarget, 'boolean');
  }
  assert.equal(EFFECTS.sabotage.needsTarget, true);
  assert.equal(EFFECTS.steal.needsTarget, true);
  assert.equal(EFFECTS.swap.needsTarget, true);
  assert.equal(EFFECTS.bonus.needsTarget, false);
  assert.equal(EFFECTS.burn.needsTarget, false);
  assert.equal(EFFECTS.shield.needsTarget, false);
  assert.deepEqual(DEFAULT_EFFECT_MAP, { 2: 'sabotage', 7: 'bonus', 11: 'burn' });
});

test('effectForCard: mapped rank, unmapped rank, joker, disabled', () => {
  const state = makeState();
  assert.equal(effectForCard(state, card('2S')), 'sabotage');
  assert.equal(effectForCard(state, card('7H')), 'bonus');
  assert.equal(effectForCard(state, card('JD')), 'burn');
  assert.equal(effectForCard(state, card('KC')), null);
  assert.equal(effectForCard(state, card('JOKER-1')), null);
  assert.equal(effectForCard(makeState({ effectsEnabled: false }), card('2S')), null);
});

test('legalTargets: excludes drawer and empty hands, includes shielded', () => {
  const state = makeState({
    players: [
      seat(1, 'Anna', ['2S']),
      seat(2, 'Ben', ['KH'], true),
      seat(3, 'Carol', []),
    ],
  });
  assert.deepEqual(legalTargets(state, 1).map((p) => p.id), [2]);
});

test('beginRecord: draw step + queue seeded with the drawn card', () => {
  assert.deepEqual(beginRecord(1, 'pick', '2S', 7), {
    playerId: 1,
    via: 'pick',
    steps: [{ kind: 'draw', cardId: '2S', deckIndex: 7 }],
    queue: ['2S'],
  });
});
