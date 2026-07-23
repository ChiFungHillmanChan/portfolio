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
