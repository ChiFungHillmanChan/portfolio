import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUITS,
  RANKS,
  CATEGORY,
  createDeck,
  shuffle,
  evaluateHand,
  compareScores,
  rankLabel,
} from './hand-eval.js';

// --- helpers -------------------------------------------------------------

const c = (rank, suit = 'spades') => ({ rank, suit });
const joker = () => ({ joker: true });

// Build a hand of ranks with suits cycled so no accidental flush appears.
const mixed = (...ranks) =>
  ranks.map((rank, i) => c(rank, SUITS[i % SUITS.length]));

// Deterministic rng (mulberry32) so shuffle tests are reproducible.
const seededRng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// --- deck integrity ------------------------------------------------------

test('createDeck without jokers has exactly 52 unique cards, 13 ranks x 4 suits', () => {
  const deck = createDeck({ includeJokers: false });
  assert.equal(deck.length, 52);
  const ids = new Set(deck.map((card) => card.id));
  assert.equal(ids.size, 52);
  for (const suit of SUITS) {
    const ofSuit = deck.filter((card) => card.suit === suit);
    assert.equal(ofSuit.length, 13);
    assert.deepEqual(
      [...new Set(ofSuit.map((card) => card.rank))].sort((a, b) => a - b),
      RANKS.slice().sort((a, b) => a - b)
    );
  }
  assert.equal(deck.filter((card) => card.joker).length, 0);
});

test('createDeck with jokers has 54 unique cards including exactly 2 jokers', () => {
  const deck = createDeck({ includeJokers: true });
  assert.equal(deck.length, 54);
  const ids = new Set(deck.map((card) => card.id));
  assert.equal(ids.size, 54);
  assert.equal(deck.filter((card) => card.joker).length, 2);
});

test('shuffle returns a permutation of the same cards without mutating the input', () => {
  const deck = createDeck({ includeJokers: true });
  const before = deck.map((card) => card.id).join(',');
  const shuffled = shuffle(deck, seededRng(42));
  assert.equal(deck.map((card) => card.id).join(','), before, 'input mutated');
  assert.equal(shuffled.length, deck.length);
  assert.deepEqual(
    shuffled.map((card) => card.id).sort(),
    deck.map((card) => card.id).sort()
  );
});

test('shuffle is deterministic for a given rng', () => {
  const deck = createDeck({ includeJokers: false });
  const a = shuffle(deck, seededRng(7)).map((card) => card.id);
  const b = shuffle(deck, seededRng(7)).map((card) => card.id);
  assert.deepEqual(a, b);
});

// --- rank labels ---------------------------------------------------------

test('rankLabel maps ranks to display symbols', () => {
  assert.equal(rankLabel(14), 'A');
  assert.equal(rankLabel(13), 'K');
  assert.equal(rankLabel(12), 'Q');
  assert.equal(rankLabel(11), 'J');
  assert.equal(rankLabel(10), '10');
  assert.equal(rankLabel(2), '2');
});

// --- plain hands (no wilds) ----------------------------------------------

test('empty pile evaluates to null', () => {
  assert.equal(evaluateHand([]), null);
});

test('spec: {3,4,5} is 5 high, never a straight', () => {
  const hand = evaluateHand(mixed(3, 4, 5));
  assert.equal(hand.category, CATEGORY.HIGH_CARD);
  assert.deepEqual(hand.score, [CATEGORY.HIGH_CARD, 5, 4, 3]);
  assert.equal(hand.name, '5 high');
});

test('single ace is A high', () => {
  const hand = evaluateHand([c(14, 'hearts')]);
  assert.deepEqual(hand.score, [CATEGORY.HIGH_CARD, 14]);
  assert.equal(hand.name, 'A high');
});

test('four-card run {2,3,4,5} is high card, not a straight', () => {
  const hand = evaluateHand(mixed(2, 3, 4, 5));
  assert.equal(hand.category, CATEGORY.HIGH_CARD);
  assert.deepEqual(hand.score, [CATEGORY.HIGH_CARD, 5, 4, 3, 2]);
});

test('three suited cards are high card, not a flush', () => {
  const hand = evaluateHand([c(14, 'hearts'), c(13, 'hearts'), c(9, 'hearts')]);
  assert.equal(hand.category, CATEGORY.HIGH_CARD);
});

test('pair with kickers', () => {
  const hand = evaluateHand(mixed(13, 13, 8, 6, 2));
  assert.equal(hand.category, CATEGORY.PAIR);
  assert.deepEqual(hand.score, [CATEGORY.PAIR, 13, 8, 6, 2]);
  assert.equal(hand.name, 'Pair of Kings');
});

test('two pair with kicker', () => {
  const hand = evaluateHand(mixed(14, 14, 9, 9, 5));
  assert.equal(hand.category, CATEGORY.TWO_PAIR);
  assert.deepEqual(hand.score, [CATEGORY.TWO_PAIR, 14, 9, 5]);
  assert.equal(hand.name, 'Two Pair, Aces & 9s');
});

test('three of a kind', () => {
  const hand = evaluateHand(mixed(12, 12, 12, 7, 2));
  assert.equal(hand.category, CATEGORY.TRIPS);
  assert.deepEqual(hand.score, [CATEGORY.TRIPS, 12, 7, 2]);
  assert.equal(hand.name, 'Three of a Kind, Queens');
});

test('straight (mixed suits)', () => {
  const hand = evaluateHand(mixed(5, 6, 7, 8, 9));
  assert.equal(hand.category, CATEGORY.STRAIGHT);
  assert.deepEqual(hand.score, [CATEGORY.STRAIGHT, 9]);
  assert.equal(hand.name, 'Straight, 9 high');
});

test('broadway straight is ace high', () => {
  const hand = evaluateHand(mixed(10, 11, 12, 13, 14));
  assert.deepEqual(hand.score, [CATEGORY.STRAIGHT, 14]);
});

test('wheel straight A-2-3-4-5 is 5 high', () => {
  const hand = evaluateHand(mixed(14, 2, 3, 4, 5));
  assert.deepEqual(hand.score, [CATEGORY.STRAIGHT, 5]);
  assert.equal(hand.name, 'Straight, 5 high');
});

test('flush picks the top five of the suit', () => {
  const hand = evaluateHand([
    c(14, 'hearts'),
    c(11, 'hearts'),
    c(9, 'hearts'),
    c(6, 'hearts'),
    c(3, 'hearts'),
  ]);
  assert.equal(hand.category, CATEGORY.FLUSH);
  assert.deepEqual(hand.score, [CATEGORY.FLUSH, 14, 11, 9, 6, 3]);
  assert.equal(hand.name, 'Flush, A high');
});

test('full house', () => {
  const hand = evaluateHand(mixed(13, 13, 13, 9, 9));
  assert.equal(hand.category, CATEGORY.FULL_HOUSE);
  assert.deepEqual(hand.score, [CATEGORY.FULL_HOUSE, 13, 9]);
  assert.equal(hand.name, 'Full House, Kings over 9s');
});

test('four of a kind with kicker', () => {
  const hand = evaluateHand(mixed(9, 9, 9, 9, 13));
  assert.equal(hand.category, CATEGORY.QUADS);
  assert.deepEqual(hand.score, [CATEGORY.QUADS, 9, 13]);
  assert.equal(hand.name, 'Four of a Kind, 9s');
});

test('straight flush', () => {
  const hand = evaluateHand([
    c(9, 'hearts'),
    c(8, 'hearts'),
    c(7, 'hearts'),
    c(6, 'hearts'),
    c(5, 'hearts'),
  ]);
  assert.equal(hand.category, CATEGORY.STRAIGHT_FLUSH);
  assert.deepEqual(hand.score, [CATEGORY.STRAIGHT_FLUSH, 9]);
  assert.equal(hand.name, 'Straight Flush, 9 high');
});

test('royal flush', () => {
  const hand = evaluateHand([
    c(14, 'spades'),
    c(13, 'spades'),
    c(12, 'spades'),
    c(11, 'spades'),
    c(10, 'spades'),
  ]);
  assert.equal(hand.category, CATEGORY.ROYAL_FLUSH);
  assert.equal(hand.name, 'Royal Flush');
});

// --- best 5 from larger piles --------------------------------------------

test('best five chosen from eight cards (two pair with best kicker)', () => {
  const hand = evaluateHand([
    c(13, 'hearts'),
    c(13, 'diamonds'),
    c(9, 'spades'),
    c(9, 'clubs'),
    c(3, 'hearts'),
    c(7, 'diamonds'),
    c(12, 'diamonds'),
    c(2, 'spades'),
  ]);
  assert.deepEqual(hand.score, [CATEGORY.TWO_PAIR, 13, 9, 12]);
});

test('straight found inside seven cards', () => {
  const hand = evaluateHand(mixed(2, 3, 4, 5, 6, 9, 11));
  assert.deepEqual(hand.score, [CATEGORY.STRAIGHT, 6]);
});

// --- jokers are wild -------------------------------------------------------

test('spec: {9,9,9,9,Joker} is Five of a Kind', () => {
  const hand = evaluateHand([
    c(9, 'spades'),
    c(9, 'hearts'),
    c(9, 'diamonds'),
    c(9, 'clubs'),
    joker(),
  ]);
  assert.equal(hand.category, CATEGORY.FIVE_OF_A_KIND);
  assert.deepEqual(hand.score, [CATEGORY.FIVE_OF_A_KIND, 9]);
  assert.equal(hand.name, 'Five of a Kind, 9s');
});

test('spec: {K,Joker} is a pair of kings', () => {
  const hand = evaluateHand([c(13, 'hearts'), joker()]);
  assert.equal(hand.category, CATEGORY.PAIR);
  assert.deepEqual(hand.score, [CATEGORY.PAIR, 13]);
  assert.equal(hand.name, 'Pair of Kings');
});

test('spec: {Joker,Joker} is a pair of aces', () => {
  const hand = evaluateHand([joker(), joker()]);
  assert.deepEqual(hand.score, [CATEGORY.PAIR, 14]);
  assert.equal(hand.name, 'Pair of Aces');
});

test('spec: single {Joker} is A high', () => {
  const hand = evaluateHand([joker()]);
  assert.deepEqual(hand.score, [CATEGORY.HIGH_CARD, 14]);
  assert.equal(hand.name, 'A high');
});

test('spec: {A,2,3,4,Joker} completes the 5-high wheel straight', () => {
  const hand = evaluateHand([
    c(14, 'spades'),
    c(2, 'hearts'),
    c(3, 'diamonds'),
    c(4, 'clubs'),
    joker(),
  ]);
  assert.deepEqual(hand.score, [CATEGORY.STRAIGHT, 5]);
});

test('joker completes a flush when that beats the pair option', () => {
  const hand = evaluateHand([
    c(14, 'hearts'),
    c(13, 'hearts'),
    c(9, 'hearts'),
    c(4, 'hearts'),
    joker(),
  ]);
  assert.equal(hand.category, CATEGORY.FLUSH);
  assert.equal(hand.score[1], 14);
});

test('joker upgrades two pair to a full house', () => {
  const hand = evaluateHand([
    c(13, 'spades'),
    c(13, 'hearts'),
    c(9, 'diamonds'),
    c(9, 'clubs'),
    joker(),
  ]);
  assert.deepEqual(hand.score, [CATEGORY.FULL_HOUSE, 13, 9]);
  assert.equal(hand.name, 'Full House, Kings over 9s');
});

// --- comparison -------------------------------------------------------------

test('spec: {A,K} beats {A,Q,4,5,6}', () => {
  const a = evaluateHand(mixed(14, 13));
  const b = evaluateHand(mixed(14, 12, 4, 5, 6));
  assert.ok(compareScores(a.score, b.score) > 0);
});

test('spec: extra present kicker wins — {A,K,2} beats {A,K}', () => {
  const a = evaluateHand(mixed(14, 13, 2));
  const b = evaluateHand(mixed(14, 13));
  assert.ok(compareScores(a.score, b.score) > 0);
  assert.ok(compareScores(b.score, a.score) < 0);
});

test('identical hands tie', () => {
  const a = evaluateHand([c(9, 'hearts'), c(9, 'spades')]);
  const b = evaluateHand([c(9, 'diamonds'), c(9, 'clubs')]);
  assert.equal(compareScores(a.score, b.score), 0);
});

test('full category ladder orders correctly, high to low', () => {
  const ladder = [
    evaluateHand([c(9, 'spades'), c(9, 'hearts'), c(9, 'diamonds'), c(9, 'clubs'), joker()]), // five of a kind
    evaluateHand([c(14, 'spades'), c(13, 'spades'), c(12, 'spades'), c(11, 'spades'), c(10, 'spades')]), // royal
    evaluateHand([c(9, 'hearts'), c(8, 'hearts'), c(7, 'hearts'), c(6, 'hearts'), c(5, 'hearts')]), // straight flush
    evaluateHand(mixed(9, 9, 9, 9, 13)), // quads
    evaluateHand(mixed(13, 13, 13, 9, 9)), // full house
    evaluateHand([c(14, 'hearts'), c(11, 'hearts'), c(9, 'hearts'), c(6, 'hearts'), c(3, 'hearts')]), // flush
    evaluateHand(mixed(5, 6, 7, 8, 9)), // straight
    evaluateHand(mixed(12, 12, 12, 7, 2)), // trips
    evaluateHand(mixed(14, 14, 9, 9, 5)), // two pair
    evaluateHand(mixed(13, 13, 8, 6, 2)), // pair
    evaluateHand(mixed(14, 12, 9, 6, 3)), // high card
  ];
  for (let i = 0; i < ladder.length - 1; i++) {
    assert.ok(
      compareScores(ladder[i].score, ladder[i + 1].score) > 0,
      `ladder[${i}] (${ladder[i].name}) should beat ladder[${i + 1}] (${ladder[i + 1].name})`
    );
  }
});

// --- bestFive --------------------------------------------------------------

test('bestFive: full house from seven cards picks the trips then the pair', () => {
  const pile = [
    c(2, 'clubs'),
    c(13, 'hearts'),
    c(9, 'hearts'),
    c(13, 'diamonds'),
    c(7, 'diamonds'),
    c(13, 'spades'),
    c(9, 'clubs'),
  ];
  const hand = evaluateHand(pile);
  assert.deepEqual(hand.score, [CATEGORY.FULL_HOUSE, 13, 9]);
  assert.deepEqual(hand.bestFive.map((card) => card.rank), [13, 13, 13, 9, 9]);
  assert.equal(new Set(hand.bestFive).size, 5);
  for (const card of hand.bestFive) assert.ok(pile.includes(card));
});

test('bestFive: flush returns five cards of the flush suit, best first', () => {
  const hand = evaluateHand([
    c(14, 'hearts'),
    c(2, 'spades'),
    c(11, 'hearts'),
    c(9, 'hearts'),
    c(6, 'hearts'),
    c(3, 'hearts'),
  ]);
  assert.equal(hand.category, CATEGORY.FLUSH);
  assert.deepEqual(hand.bestFive.map((card) => card.rank), [14, 11, 9, 6, 3]);
  assert.ok(hand.bestFive.every((card) => card.suit === 'hearts'));
});

test('bestFive: straight is ordered high to low', () => {
  const hand = evaluateHand(mixed(2, 9, 5, 6, 7, 8, 11));
  assert.deepEqual(hand.score, [CATEGORY.STRAIGHT, 9]);
  assert.deepEqual(hand.bestFive.map((card) => card.rank), [9, 8, 7, 6, 5]);
});

test('bestFive: wheel straight ends with the ace card', () => {
  const hand = evaluateHand(mixed(14, 2, 3, 4, 5));
  assert.deepEqual(hand.score, [CATEGORY.STRAIGHT, 5]);
  assert.deepEqual(hand.bestFive.map((card) => card.rank), [5, 4, 3, 2, 14]);
});

test('bestFive: joker object itself appears in the winning five', () => {
  const w = joker();
  const pile = [c(9, 'spades'), c(9, 'hearts'), c(9, 'diamonds'), c(9, 'clubs'), w];
  const hand = evaluateHand(pile);
  assert.equal(hand.category, CATEGORY.FIVE_OF_A_KIND);
  assert.ok(hand.bestFive.includes(w));
  assert.equal(new Set(hand.bestFive).size, 5);
});

test('bestFive: joker completing the wheel is in the five', () => {
  const w = joker();
  const pile = [c(14, 'spades'), c(2, 'hearts'), c(3, 'diamonds'), c(4, 'clubs'), w];
  const hand = evaluateHand(pile);
  assert.deepEqual(hand.score, [CATEGORY.STRAIGHT, 5]);
  assert.ok(hand.bestFive.includes(w));
  assert.equal(hand.bestFive.length, 5);
});

test('bestFive: fewer than five cards returns the whole pile, best first', () => {
  const kh = c(13, 'hearts');
  const qs = c(12, 'spades');
  const hand = evaluateHand([qs, kh]);
  assert.deepEqual(hand.bestFive, [kh, qs]);
});

test('bestFive: pair {K, Joker} returns both cards', () => {
  const w = joker();
  const kh = c(13, 'hearts');
  const hand = evaluateHand([kh, w]);
  assert.deepEqual(hand.score, [CATEGORY.PAIR, 13]);
  assert.equal(hand.bestFive.length, 2);
  assert.ok(hand.bestFive.includes(kh));
  assert.ok(hand.bestFive.includes(w));
});

test('bestFive: royal flush picks the suited run even among distractors', () => {
  const suited = [c(14, 'spades'), c(13, 'spades'), c(12, 'spades'), c(11, 'spades'), c(10, 'spades')];
  const pile = [c(14, 'hearts'), ...suited, c(9, 'clubs')];
  const hand = evaluateHand(pile);
  assert.equal(hand.category, CATEGORY.ROYAL_FLUSH);
  assert.deepEqual(hand.bestFive, suited);
});
