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
  advanceDraw,
  applyTarget,
  undoRecord,
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

test('advanceDraw: plain card resolves with no extra steps', () => {
  const state = makeState({ players: [seat(1, 'Anna', ['KC']), seat(2, 'Ben', ['3H'])] });
  const record = beginRecord(1, 'deal', 'KC', 0);
  assert.deepEqual(advanceDraw(state, record), { status: 'done' });
  assert.equal(record.steps.length, 1);
  assert.deepEqual(record.queue, []);
});

test('advanceDraw: bonus chain 7 -> 7 -> 2 pauses on need-target', () => {
  // Deck bottom->top: 2S, 7D. Bonus pops 7D first (another bonus), then 2S
  // (sabotage) which needs a target because Ben holds a card.
  const state = makeState({
    players: [seat(1, 'Anna', ['7H']), seat(2, 'Ben', ['KH'])],
    deck: [card('2S'), card('7D')],
  });
  const record = beginRecord(1, 'deal', '7H', 2);
  const result = advanceDraw(state, record);
  assert.deepEqual(result, { status: 'need-target', effect: 'sabotage', cardId: '2S' });
  assert.deepEqual(state.players[0].cards.map((c) => c.id), ['7H', '7D', '2S']);
  assert.equal(state.deck.length, 0);
  assert.deepEqual(record.steps.map((s) => s.kind), ['draw', 'bonus-draw', 'bonus-draw']);
  assert.deepEqual(record.steps[1], { kind: 'bonus-draw', cardId: '7D', deckIndex: 1 });
  assert.deepEqual(record.steps[2], { kind: 'bonus-draw', cardId: '2S', deckIndex: 0 });
  assert.deepEqual(record.queue, ['2S']);
});

test('advanceDraw: bonus with empty deck fizzles', () => {
  const state = makeState({ players: [seat(1, 'Anna', ['7H']), seat(2, 'Ben', ['KH'])] });
  const record = beginRecord(1, 'deal', '7H', 0);
  assert.deepEqual(advanceDraw(state, record), { status: 'done' });
  assert.deepEqual(record.steps[1], { kind: 'fizzle', effect: 'bonus', cardId: '7H' });
});

test('advanceDraw: burn destroys a rigged deck card into the graveyard', () => {
  const state = makeState({
    players: [seat(1, 'Anna', ['JD']), seat(2, 'Ben', ['KH'])],
    deck: [card('4C'), card('9S'), card('QH')],
  });
  const record = beginRecord(1, 'deal', 'JD', 3);
  // rng 0.5 * 3 = index 1 -> 9S
  assert.deepEqual(advanceDraw(state, record, rig(0.5)), { status: 'done' });
  assert.deepEqual(state.deck.map((c) => c.id), ['4C', 'QH']);
  assert.deepEqual(state.graveyard.map((c) => c.id), ['9S']);
  assert.deepEqual(record.steps[1], { kind: 'burn', cardId: 'JD', burnedId: '9S', deckIndex: 1 });
});

test('advanceDraw: burn with empty deck fizzles', () => {
  const state = makeState({ players: [seat(1, 'Anna', ['JD']), seat(2, 'Ben', ['KH'])] });
  const record = beginRecord(1, 'deal', 'JD', 0);
  assert.deepEqual(advanceDraw(state, record), { status: 'done' });
  assert.deepEqual(record.steps[1], { kind: 'fizzle', effect: 'burn', cardId: 'JD' });
});

test('advanceDraw: shield gained once, noop while already shielded', () => {
  const state = makeState({
    effectMap: { 5: 'shield' },
    players: [seat(1, 'Anna', ['5C', '5D']), seat(2, 'Ben', ['KH'])],
  });
  const first = beginRecord(1, 'deal', '5C', 1);
  assert.deepEqual(advanceDraw(state, first), { status: 'done' });
  assert.equal(state.players[0].shield, true);
  assert.deepEqual(first.steps[1], { kind: 'shield-gain', cardId: '5C' });

  const second = beginRecord(1, 'deal', '5D', 0);
  assert.deepEqual(advanceDraw(state, second), { status: 'done' });
  assert.equal(state.players[0].shield, true);
  assert.deepEqual(second.steps[1], { kind: 'shield-noop', cardId: '5D' });
});

test('advanceDraw: targeted effect with no legal target auto-fizzles', () => {
  const state = makeState({ players: [seat(1, 'Anna', ['2S']), seat(2, 'Ben', [])] });
  const record = beginRecord(1, 'deal', '2S', 0);
  assert.deepEqual(advanceDraw(state, record), { status: 'done' });
  assert.deepEqual(record.steps[1], { kind: 'fizzle', effect: 'sabotage', cardId: '2S' });
});

test('applyTarget: sabotage destroys a rigged card from the chosen hand', () => {
  const state = makeState({
    players: [seat(1, 'Anna', ['2S']), seat(2, 'Ben', ['KH', 'QD', '9C'])],
  });
  const record = beginRecord(1, 'deal', '2S', 0);
  assert.equal(advanceDraw(state, record).status, 'need-target');
  // rng 0.5 * 3 = index 1 -> QD
  assert.deepEqual(applyTarget(state, record, 2, rig(0.5)), { status: 'done' });
  assert.deepEqual(state.players[1].cards.map((c) => c.id), ['KH', '9C']);
  assert.deepEqual(state.graveyard.map((c) => c.id), ['QD']);
  assert.deepEqual(record.steps[1], {
    kind: 'sabotage', cardId: '2S', targetId: 2, destroyedId: 'QD', targetIndex: 1,
  });
  assert.deepEqual(record.queue, []);
});

test('applyTarget: steal moves a rigged card into the drawer hand', () => {
  const state = makeState({
    effectMap: { 10: 'steal' },
    players: [seat(1, 'Anna', ['10S']), seat(2, 'Ben', ['KH', 'QD'])],
  });
  const record = beginRecord(1, 'deal', '10S', 0);
  assert.equal(advanceDraw(state, record).status, 'need-target');
  assert.deepEqual(applyTarget(state, record, 2, rig(0)), { status: 'done' });
  assert.deepEqual(state.players[0].cards.map((c) => c.id), ['10S', 'KH']);
  assert.deepEqual(state.players[1].cards.map((c) => c.id), ['QD']);
  assert.deepEqual(record.steps[1], {
    kind: 'steal', cardId: '10S', targetId: 2, stolenId: 'KH', targetIndex: 0,
  });
});

test('applyTarget: swap trades entire hands and records both id lists', () => {
  const state = makeState({
    effectMap: { 12: 'swap' },
    players: [seat(1, 'Anna', ['QS', '3C']), seat(2, 'Ben', ['KH'])],
  });
  const record = beginRecord(1, 'deal', 'QS', 0);
  assert.equal(advanceDraw(state, record).status, 'need-target');
  assert.deepEqual(applyTarget(state, record, 2), { status: 'done' });
  assert.deepEqual(state.players[0].cards.map((c) => c.id), ['KH']);
  assert.deepEqual(state.players[1].cards.map((c) => c.id), ['QS', '3C']);
  assert.deepEqual(record.steps[1], {
    kind: 'swap', cardId: 'QS', targetId: 2,
    drawerCardIds: ['QS', '3C'], targetCardIds: ['KH'],
  });
});

test('applyTarget: shield absorbs the hit and breaks', () => {
  const state = makeState({
    players: [seat(1, 'Anna', ['2S']), seat(2, 'Ben', ['KH'], true)],
  });
  const record = beginRecord(1, 'deal', '2S', 0);
  assert.equal(advanceDraw(state, record).status, 'need-target');
  assert.deepEqual(applyTarget(state, record, 2), { status: 'done' });
  assert.equal(state.players[1].shield, false);
  assert.deepEqual(state.players[1].cards.map((c) => c.id), ['KH']);
  assert.deepEqual(record.steps[1], { kind: 'blocked', effect: 'sabotage', cardId: '2S', targetId: 2 });
});

test('applyTarget: invalid target keeps the prompt open, mutates nothing', () => {
  const state = makeState({
    players: [seat(1, 'Anna', ['2S']), seat(2, 'Ben', ['KH']), seat(3, 'Carol', [])],
  });
  const record = beginRecord(1, 'deal', '2S', 0);
  assert.equal(advanceDraw(state, record).status, 'need-target');
  // Carol has no cards; the drawer can't target themself either.
  assert.equal(applyTarget(state, record, 3).status, 'need-target');
  assert.equal(applyTarget(state, record, 1).status, 'need-target');
  assert.equal(record.steps.length, 1);
  assert.deepEqual(record.queue, ['2S']);
});

test('applyTarget: chain continues after the target resolves', () => {
  // Mid-chain state: Anna's 7H already bonus-drew 2S (sabotage), which is the
  // queue head. After the target resolves, advanceDraw finishes the record
  // without touching the rest of the deck.
  const state = makeState({
    players: [seat(1, 'Anna', ['7H', '2S']), seat(2, 'Ben', ['KH', 'QD'])],
    deck: [card('4C')],
  });
  const record = beginRecord(1, 'deal', '7H', 1);
  // Simulate mid-chain: 7H drew 2S already, 2S is queue head, 7H consumed.
  record.steps.push({ kind: 'bonus-draw', cardId: '2S', deckIndex: 1 });
  record.queue = ['2S'];
  assert.equal(advanceDraw(state, record).status, 'need-target');
  assert.deepEqual(applyTarget(state, record, 2, rig(0)), { status: 'done' });
  // Sabotage took KH, then nothing else was queued, done with 4C untouched.
  assert.deepEqual(state.graveyard.map((c) => c.id), ['KH']);
  assert.deepEqual(state.deck.map((c) => c.id), ['4C']);
});

test('undoRecord: plain draw returns the card to its deck position', () => {
  const state = makeState({
    players: [seat(1, 'Anna', ['KC']), seat(2, 'Ben', ['3H'])],
    deck: [card('4C'), card('9S')],
  });
  // KC was picked from index 1 (between 4C and 9S).
  const record = beginRecord(1, 'pick', 'KC', 1);
  advanceDraw(state, record);
  undoRecord(state, record);
  assert.deepEqual(state.players[0].cards, []);
  assert.deepEqual(state.deck.map((c) => c.id), ['4C', 'KC', '9S']);
});

test('undoRecord: full chain (bonus, bonus, sabotage) restores everything', () => {
  const state = makeState({
    players: [seat(1, 'Anna', ['7H']), seat(2, 'Ben', ['KH'])],
    deck: [card('2S'), card('7D')],
  });
  const record = beginRecord(1, 'deal', '7H', 2);
  assert.equal(advanceDraw(state, record).status, 'need-target');
  assert.deepEqual(applyTarget(state, record, 2, rig(0)), { status: 'done' });
  assert.deepEqual(state.graveyard.map((c) => c.id), ['KH']);

  undoRecord(state, record);
  assert.deepEqual(state.players[0].cards, []);
  assert.deepEqual(state.players[1].cards.map((c) => c.id), ['KH']);
  assert.deepEqual(state.graveyard, []);
  // 2S and 7D back at their original indices, 7H back on top.
  assert.deepEqual(state.deck.map((c) => c.id), ['2S', '7D', '7H']);
});

test('undoRecord: swap restores both hands in original order', () => {
  const state = makeState({
    effectMap: { 12: 'swap' },
    players: [seat(1, 'Anna', ['QS', '3C']), seat(2, 'Ben', ['KH'])],
    deck: [],
  });
  const record = beginRecord(1, 'deal', 'QS', 0);
  advanceDraw(state, record);
  applyTarget(state, record, 2);
  undoRecord(state, record);
  assert.deepEqual(state.players[0].cards.map((c) => c.id), ['3C']);
  assert.deepEqual(state.players[1].cards.map((c) => c.id), ['KH']);
  assert.deepEqual(state.deck.map((c) => c.id), ['QS']);
});

test('undoRecord: blocked restores the broken shield; shield-gain removes it', () => {
  const state = makeState({
    players: [seat(1, 'Anna', ['2S']), seat(2, 'Ben', ['KH'], true)],
  });
  const record = beginRecord(1, 'deal', '2S', 0);
  advanceDraw(state, record);
  applyTarget(state, record, 2);
  assert.equal(state.players[1].shield, false);
  undoRecord(state, record);
  assert.equal(state.players[1].shield, true);

  const state2 = makeState({
    effectMap: { 5: 'shield' },
    players: [seat(1, 'Anna', ['5C']), seat(2, 'Ben', ['KH'])],
  });
  const record2 = beginRecord(1, 'deal', '5C', 0);
  advanceDraw(state2, record2);
  assert.equal(state2.players[0].shield, true);
  undoRecord(state2, record2);
  assert.equal(state2.players[0].shield, false);
});

test('undoRecord: steal returns the card to its original slot', () => {
  const state = makeState({
    effectMap: { 10: 'steal' },
    players: [seat(1, 'Anna', ['10S']), seat(2, 'Ben', ['KH', 'QD'])],
  });
  const record = beginRecord(1, 'deal', '10S', 0);
  advanceDraw(state, record);
  applyTarget(state, record, 2, rig(0.9)); // index 1 -> QD
  assert.deepEqual(state.players[0].cards.map((c) => c.id), ['10S', 'QD']);
  undoRecord(state, record);
  assert.deepEqual(state.players[0].cards, []);
  assert.deepEqual(state.players[1].cards.map((c) => c.id), ['KH', 'QD']);
});

test('undoRecord: missing drawer is a no-op, never throws', () => {
  const state = makeState({ players: [seat(2, 'Ben', ['KH'])] });
  const record = beginRecord(1, 'deal', '2S', 0); // player 1 absent
  assert.doesNotThrow(() => undoRecord(state, record));
  assert.deepEqual(state.players[0].cards.map((c) => c.id), ['KH']);
});

test('undoRecord: missing target leaves the moved card in place (no vanish)', () => {
  const state = makeState({
    players: [seat(1, 'Anna', ['2S'])],
    graveyard: [card('KH')],
  });
  const record = beginRecord(1, 'deal', '2S', 0);
  record.steps.push({ kind: 'sabotage', cardId: '2S', targetId: 9, destroyedId: 'KH', targetIndex: 0 });
  record.queue = [];
  undoRecord(state, record);
  assert.deepEqual(state.graveyard.map((c) => c.id), ['KH']); // untouched
  assert.deepEqual(state.deck.map((c) => c.id), ['2S']); // draw still reversed
});
