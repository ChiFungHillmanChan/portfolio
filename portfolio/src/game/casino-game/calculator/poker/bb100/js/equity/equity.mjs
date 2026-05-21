// js/equity/equity.mjs
import { evaluate5, evaluate7 } from './evaluator.mjs';
import { allCards } from './cards.mjs';

const ALL_CARDS = allCards();

// equity(hero, villain, board) → number in [0, 1]
// Auto-dispatches by board length: 5=river, 4=turn, 3=flop, 0=preflop.
export function equity(hero, villain, board) {
  const used = new Set([...hero, ...villain, ...board]);
  const deck = ALL_CARDS.filter(c => !used.has(c));

  if (board.length === 5) {
    return resolveOne(hero, villain, board);
  }
  if (board.length === 4) {
    return enumerate1(hero, villain, board, deck);
  }
  if (board.length === 3) {
    return enumerate2(hero, villain, board, deck);
  }
  if (board.length === 0) {
    return enumerate5(hero, villain, deck); // to be added in Task 6
  }
  throw new Error(`unsupported board length: ${board.length}`);
}

function resolveOne(hero, villain, board) {
  const h = evaluate7([...hero, ...board]);
  const v = evaluate7([...villain, ...board]);
  if (h < v) return 1.0;
  if (h > v) return 0.0;
  return 0.5;
}

function enumerate1(hero, villain, board, deck) {
  let wins = 0, ties = 0, total = 0;
  for (const c of deck) {
    const r = resolveOne(hero, villain, [...board, c]);
    if (r === 1.0) wins++;
    else if (r === 0.5) ties++;
    total++;
  }
  return (wins + ties * 0.5) / total;
}

function enumerate2(hero, villain, board, deck) {
  let wins = 0, ties = 0, total = 0;
  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      const r = resolveOne(hero, villain, [...board, deck[i], deck[j]]);
      if (r === 1.0) wins++;
      else if (r === 0.5) ties++;
      total++;
    }
  }
  return (wins + ties * 0.5) / total;
}

function enumerate5(hero, villain, deck) {
  throw new Error('preflop equity not implemented yet (Task 6)');
}
