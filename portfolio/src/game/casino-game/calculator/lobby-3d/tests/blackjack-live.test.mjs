import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planPlayerCard, planDealerCard, settleTitle } from '../blackjack-live.js';

const seat = { angle: Math.PI / 2, cardsR: 1.02, stackDr: 0.062, splitDx: 0.14, feltY: 0.83 };

test('planPlayerCard: hits stack TOWARD the dealer, newest on top', () => {
  const c0 = planPlayerCard(seat, { card: 0 });
  const c1 = planPlayerCard(seat, { card: 1 });
  const c4 = planPlayerCard(seat, { card: 4 });
  assert.ok(c1.pos[2] < c0.pos[2]);                    // closer to dealer (z shrinks at 90°)
  assert.ok(c1.pos[1] > c0.pos[1]);                    // physically on top
  assert.ok(Math.abs(c4.pos[2] - (1.02 - 4 * 0.062)) < 1e-9);
  assert.ok(Math.abs(c0.pos[0]) < 1e-9);               // seat at 90° is centered
});

test('planPlayerCard: double is sideways, split hands mirror left/right', () => {
  const dbl = planPlayerCard(seat, { card: 2, sideways: true });
  const flat = planPlayerCard(seat, { card: 2 });
  assert.ok(Math.abs(dbl.spin - flat.spin - Math.PI / 2) < 1e-9);
  const right = planPlayerCard(seat, { hand: 0, hands: 2, card: 0 });
  const left = planPlayerCard(seat, { hand: 1, hands: 2, card: 0 });
  assert.ok(Math.abs(right.pos[0] + left.pos[0]) < 1e-9); // symmetric about the radial
  assert.notEqual(Math.sign(right.pos[0]), Math.sign(left.pos[0]));
});

test('planDealerCard: two boxes then fans right, all face up', () => {
  const L = { dealerSlots: [[-0.085, 0.86, 0.16], [0.085, 0.86, 0.16]], fanDx: 0.17 };
  assert.deepEqual(planDealerCard(L, 0).pos.map((v) => +v.toFixed(4)), [-0.085, 0.86, 0.16]);
  const c2 = planDealerCard(L, 2);
  assert.ok(Math.abs(c2.pos[0] - (0.085 + 0.17)) < 1e-9);
  const c3 = planDealerCard(L, 3);
  assert.ok(c3.pos[0] > c2.pos[0]);
  assert.ok(c3.pos[1] > c2.pos[1]);                    // no z-fighting
});

// ---------- settleTitle: the round banner headline ----------
// Cards are {r, s}: r 2..14 (14 = ace), s 0..3.
const c = (r, s = 0) => ({ r, s });
const hand = (ranks, { stake = 500, isSplit = false } = {}) =>
  ({ cards: ranks.map((r, i) => c(r, i % 4)), stake, isSplit });

test('settleTitle: BUST only when every hand busted', () => {
  const busted = hand([10, 8, 7]);                       // 25
  assert.equal(settleTitle([busted], [0], [c(10), c(9)]), 'BUST');
});

test('settleTitle: split with one bust and one winner is not BUST', () => {
  const h1 = hand([8, 10, 7], { isSplit: true });        // 25 — busted
  const h2 = hand([8, 10, 2], { isSplit: true });        // 20 — beats dealer 19
  // rets: bust returns 0, winner returns 2x stake → main money is a push
  assert.equal(settleTitle([h1, h2], [0, 1000], [c(10), c(9)]), 'PUSH');
});

test('settleTitle: split with one bust and one loser is DEALER WINS', () => {
  const h1 = hand([8, 10, 7], { isSplit: true });        // 25 — busted
  const h2 = hand([8, 10], { isSplit: true });           // 18 — loses to 20
  assert.equal(settleTitle([h1, h2], [0, 0], [c(10), c(10, 1)]), 'DEALER WINS');
});

test('settleTitle: natural blackjack, plain win, push, dealer wins', () => {
  const bj = hand([14, 13]);                             // A + K
  assert.equal(settleTitle([bj], [1250], [c(10), c(9)]), 'BLACKJACK!');
  const twenty = hand([10, 10]);
  assert.equal(settleTitle([twenty], [1000], [c(10), c(8)]), 'YOU WIN');
  assert.equal(settleTitle([twenty], [500], [c(10), c(4, 1), c(6, 2)]), 'PUSH');
  const eighteen = hand([10, 8]);
  assert.equal(settleTitle([eighteen], [1000], [c(10), c(6, 1), c(9, 2)]), 'YOU WIN'); // dealer 25 busts
  assert.equal(settleTitle([eighteen], [0], [c(10), c(10, 1)]), 'DEALER WINS');        // dealer 20
});
