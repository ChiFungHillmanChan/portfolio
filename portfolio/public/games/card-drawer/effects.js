// Card Drawer — effects engine. Pure logic: no DOM, no module state. Operates
// on the state shape owned by state.js; every mutation is captured as a step
// in an ActionRecord so undoRecord can reverse it exactly.

export const EFFECTS = {
  sabotage: {
    label: 'Sabotage',
    desc: 'Destroy a random card from a player you choose.',
    needsTarget: true,
  },
  bonus: {
    label: 'Bonus draw',
    desc: 'Immediately draw one extra card.',
    needsTarget: false,
  },
  burn: {
    label: 'Deck burn',
    desc: 'Reveal and destroy a random card from the deck.',
    needsTarget: false,
  },
  steal: {
    label: 'Steal',
    desc: 'Take a random card from a player you choose.',
    needsTarget: true,
  },
  swap: {
    label: 'Swap hands',
    desc: 'Trade entire hands with a player you choose.',
    needsTarget: true,
  },
  shield: {
    label: 'Shield',
    desc: 'Block the next effect aimed at you.',
    needsTarget: false,
  },
};

export const EFFECT_IDS = ['sabotage', 'bonus', 'burn', 'steal', 'swap', 'shield'];

// 11 = J. Loaded the first time effects are enabled; users tweak from there.
export const DEFAULT_EFFECT_MAP = { 2: 'sabotage', 7: 'bonus', 11: 'burn' };

const findPlayer = (state, id) => state.players.find((p) => p.id === id);

// Effect id carried by a drawn card, or null. Jokers never carry effects.
export function effectForCard(state, card) {
  if (!state.effectsEnabled || !card || card.joker) return null;
  return state.effectMap[card.rank] || null;
}

// Opponents choosable for sabotage / steal / swap: anyone else holding at
// least one card. Shielded players ARE legal — the shield absorbs the hit.
export function legalTargets(state, drawerId) {
  return state.players.filter((p) => p.id !== drawerId && p.cards.length > 0);
}

// Start an ActionRecord for a card just moved from deck into the drawer's
// hand. deckIndex = the deck position it was removed from (deck.length after
// a top deal), so undo can splice it back exactly.
export function beginRecord(playerId, via, cardId, deckIndex) {
  return {
    playerId,
    via,
    steps: [{ kind: 'draw', cardId, deckIndex }],
    queue: [cardId],
  };
}

// Process the record's queue until every drawn card's effect is resolved or a
// target choice is required. Immediate effects (bonus/burn/shield) apply here;
// bonus chains by drawing again and queueing the new card.
export function advanceDraw(state, record, rng = Math.random) {
  const player = findPlayer(state, record.playerId);
  while (record.queue.length) {
    const cardId = record.queue[0];
    const drawn = player.cards.find((c) => c.id === cardId);
    const effect = drawn ? effectForCard(state, drawn) : null;
    if (!effect) {
      record.queue.shift();
      continue;
    }
    if (EFFECTS[effect].needsTarget) {
      if (legalTargets(state, record.playerId).length === 0) {
        record.steps.push({ kind: 'fizzle', effect, cardId });
        record.queue.shift();
        continue;
      }
      return { status: 'need-target', effect, cardId };
    }
    if (effect === 'bonus') {
      if (state.deck.length === 0) {
        record.steps.push({ kind: 'fizzle', effect, cardId });
      } else {
        const extra = state.deck.pop();
        player.cards.push(extra);
        record.steps.push({ kind: 'bonus-draw', cardId: extra.id, deckIndex: state.deck.length });
        record.queue.push(extra.id);
      }
    } else if (effect === 'burn') {
      if (state.deck.length === 0) {
        record.steps.push({ kind: 'fizzle', effect, cardId });
      } else {
        const i = Math.floor(rng() * state.deck.length);
        const [burned] = state.deck.splice(i, 1);
        state.graveyard.push(burned);
        record.steps.push({ kind: 'burn', cardId, burnedId: burned.id, deckIndex: i });
      }
    } else if (effect === 'shield') {
      record.steps.push({ kind: player.shield ? 'shield-noop' : 'shield-gain', cardId });
      player.shield = true;
    }
    record.queue.shift();
  }
  return { status: 'done' };
}

// Resolve the queue-head targeted effect with the chosen opponent, then
// continue the chain via advanceDraw. An illegal target (self, empty hand,
// unknown id) returns need-target unchanged so the prompt stays open.
export function applyTarget(state, record, targetId, rng = Math.random) {
  const player = findPlayer(state, record.playerId);
  const cardId = record.queue[0];
  const drawn = player.cards.find((c) => c.id === cardId);
  const effect = drawn ? effectForCard(state, drawn) : null;
  const target = legalTargets(state, record.playerId).find((p) => p.id === targetId);
  if (!effect || !EFFECTS[effect].needsTarget || !target) {
    return { status: 'need-target', effect, cardId };
  }
  if (target.shield) {
    target.shield = false;
    record.steps.push({ kind: 'blocked', effect, cardId, targetId });
  } else if (effect === 'sabotage') {
    const i = Math.floor(rng() * target.cards.length);
    const [destroyed] = target.cards.splice(i, 1);
    state.graveyard.push(destroyed);
    record.steps.push({ kind: 'sabotage', cardId, targetId, destroyedId: destroyed.id, targetIndex: i });
  } else if (effect === 'steal') {
    const i = Math.floor(rng() * target.cards.length);
    const [stolen] = target.cards.splice(i, 1);
    player.cards.push(stolen);
    record.steps.push({ kind: 'steal', cardId, targetId, stolenId: stolen.id, targetIndex: i });
  } else if (effect === 'swap') {
    const drawerCardIds = player.cards.map((c) => c.id);
    const targetCardIds = target.cards.map((c) => c.id);
    const tmp = player.cards;
    player.cards = target.cards;
    target.cards = tmp;
    record.steps.push({ kind: 'swap', cardId, targetId, drawerCardIds, targetCardIds });
  }
  record.queue.shift();
  return advanceDraw(state, record, rng);
}
