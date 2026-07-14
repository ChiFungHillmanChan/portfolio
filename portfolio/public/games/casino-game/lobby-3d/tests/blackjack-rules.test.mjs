import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeShoe, handValue, isBlackjack, dealerPlay, canSplit,
  settleMain, perfectPairReturn, twentyOnePlus3Return, validateBets, chipRack,
} from '../blackjack-rules.js';

const c = (r, s = 0) => ({ r, s });

test('handValue: aces flex, soft flag', () => {
  assert.deepEqual(handValue([c(14), c(13)]), { total: 21, soft: true });
  assert.deepEqual(handValue([c(14), c(14)]), { total: 12, soft: true });
  assert.deepEqual(handValue([c(14), c(5), c(13)]), { total: 16, soft: false });
  assert.deepEqual(handValue([c(5), c(9), c(13)]), { total: 24, soft: false });
  assert.deepEqual(handValue([c(11), c(12)]), { total: 20, soft: false }); // J+Q
});

test('isBlackjack: 2-card 21 only', () => {
  assert.ok(isBlackjack([c(14), c(10)]));
  assert.ok(!isBlackjack([c(7), c(7), c(7)]));
  assert.ok(!isBlackjack([c(10), c(9)]));
});

test('dealerPlay stands on ALL 17s including soft 17', () => {
  const soft17 = [c(14), c(6)];
  dealerPlay(soft17, [c(5)]);
  assert.equal(soft17.length, 2);            // did not draw
  const sixteen = [c(10), c(6)];
  dealerPlay(sixteen, [c(2)].reverse());
  assert.equal(sixteen.length, 3);           // drew once to 18
});

test('canSplit: equal blackjack value incl mixed tens', () => {
  assert.ok(canSplit([c(13), c(10)]));       // K + 10
  assert.ok(canSplit([c(14), c(14)]));
  assert.ok(!canSplit([c(9), c(10)]));
  assert.ok(!canSplit([c(8), c(8), c(8)]));
});

test('settleMain: European matrix', () => {
  const D21 = [c(14), c(13)];                // dealer blackjack
  const D20 = [c(10), c(13)];
  const D17_3 = [c(5), c(6), c(6)];
  const DBUST = [c(10), c(6), c(9)];
  const h = (cards, stake = 500, isSplit = false) => ({ cards, stake, isSplit });
  assert.equal(settleMain(h([c(14), c(13)]), D21), 500);          // BJ vs BJ push
  assert.equal(settleMain(h([c(14), c(13)]), D20), 1250);         // BJ pays 3:2
  assert.equal(settleMain(h([c(7), c(7), c(7)]), D21), 0);        // dealer BJ wins
  assert.equal(settleMain(h([c(10), c(9)]), DBUST), 1000);        // dealer bust
  assert.equal(settleMain(h([c(10), c(13)]), D20), 500);          // 20 v 20 push
  assert.equal(settleMain(h([c(10), c(9)]), D17_3), 1000);        // 19 beats 17
  assert.equal(settleMain(h([c(10), c(6), c(13)]), DBUST), 0);    // player bust loses even v bust
  assert.equal(settleMain(h([c(14), c(13)], 500, true), D20), 1000); // split 21 is NOT blackjack
  assert.equal(settleMain(h([c(10), c(9)], 1000), D20), 0);       // doubled stake loses whole stake
});

test('perfectPair paytable 25/12/6', () => {
  assert.equal(perfectPairReturn(100, [c(13, 0), c(13, 0)]), 2600); // perfect
  assert.equal(perfectPairReturn(100, [c(13, 0), c(13, 3)]), 1300); // colored (both black)
  assert.equal(perfectPairReturn(100, [c(13, 1), c(13, 2)]), 1300); // colored (both red)
  assert.equal(perfectPairReturn(100, [c(13, 0), c(13, 1)]), 700);  // mixed
  assert.equal(perfectPairReturn(100, [c(13, 0), c(12, 0)]), 0);
  assert.equal(perfectPairReturn(0, [c(13, 0), c(13, 0)]), 0);
});

test('21+3 paytable 100/40/30/10/5', () => {
  assert.equal(twentyOnePlus3Return(100, c(9, 2), c(9, 2), c(9, 2)), 10100); // suited trips
  assert.equal(twentyOnePlus3Return(100, c(7, 2), c(8, 2), c(9, 2)), 4100);  // straight flush
  assert.equal(twentyOnePlus3Return(100, c(9, 0), c(9, 1), c(9, 2)), 3100);  // trips
  assert.equal(twentyOnePlus3Return(100, c(7, 0), c(8, 1), c(9, 2)), 1100);  // straight
  assert.equal(twentyOnePlus3Return(100, c(2, 3), c(9, 3), c(13, 3)), 600);  // flush
  assert.equal(twentyOnePlus3Return(100, c(12, 0), c(13, 1), c(14, 2)), 1100); // QKA straight
  assert.equal(twentyOnePlus3Return(100, c(14, 0), c(2, 1), c(3, 2)), 1100);   // A23 straight
  assert.equal(twentyOnePlus3Return(100, c(2, 0), c(9, 1), c(13, 2)), 0);
});

const MICRO = {
  main:           { min: 50, max: 1000, maxReturn: 2.5, mergeFactor: 8 },
  perfectPair:    { min: 50, max: 250, maxReturn: 26, mergeFactor: 1 },
  twentyOnePlus3: { min: 50, max: 250, maxReturn: 101, mergeFactor: 1 },
};

test('validateBets against tier betTypes', () => {
  assert.deepEqual(validateBets({ main: 100 }, MICRO, 5000, 1750), { ok: true, total: 100 });
  assert.equal(validateBets({ main: 25 }, MICRO, 5000, 1750).reason, 'main-range');
  assert.equal(validateBets({ main: 0, perfectPair: 100 }, MICRO, 5000, 1750).reason, 'main-range');
  assert.equal(validateBets({ main: 100, twentyOnePlus3: 300 }, MICRO, 5000, 1750).reason, 'side-range');
  assert.equal(validateBets({ main: 1000, perfectPair: 250, twentyOnePlus3: 250 }, MICRO, 1200, 1750).reason, 'balance');
  assert.equal(validateBets({ main: 1000, perfectPair: 250, twentyOnePlus3: 250 }, MICRO, 99999, 1400).reason, 'table-max');
});

test('chipRack scales with the tier', () => {
  assert.deepEqual(chipRack(MICRO), [50, 100, 500, 1000]);
  assert.deepEqual(chipRack({ main: { min: 1000, max: 20000 } }), [50, 100, 500, 1000, 5000]);
});

test('makeShoe: 6 decks, injectable rand is deterministic', () => {
  const shoe = makeShoe(6);
  assert.equal(shoe.length, 312);
  const a = makeShoe(1, (n) => 0);
  const b = makeShoe(1, (n) => 0);
  assert.deepEqual(a, b);
  assert.equal(new Set(a.map((k) => k.r + ':' + k.s)).size, 52);
});
