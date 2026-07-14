import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planPlayerCard, planDealerCard } from '../blackjack-live.js';

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
