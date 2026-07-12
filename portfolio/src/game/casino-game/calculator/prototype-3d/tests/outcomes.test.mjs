import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/outcomes.js');
const O = globalThis.CASINO.outcomes;
const c = (r, s = 0) => ({ r, s });

test('deck and wheel are well-formed', () => {
  assert.equal(O.makeDeck().length, 52);
  assert.equal(O.makeShoe(6).length, 312);
  assert.equal(O.EU_WHEEL.length, 37);
  assert.equal(new Set(O.EU_WHEEL).size, 37);
  assert.equal(O.EU_WHEEL[0], 0);
  assert.equal(O.RED.size, 18);
});

test('roulette returns', () => {
  assert.equal(O.rouletteReturn({ n17: 100 }, 17), 3600);       // straight 35:1 + stake
  assert.equal(O.rouletteReturn({ n17: 100 }, 18), 0);
  assert.equal(O.rouletteReturn({ red: 200 }, 1), 400);          // 1 is red
  assert.equal(O.rouletteReturn({ black: 200 }, 1), 0);
  assert.equal(O.rouletteReturn({ red: 200, odd: 100 }, 0), 0);  // zero kills outside
  assert.equal(O.rouletteReturn({ d1: 300 }, 12), 900);          // dozen 2:1
  assert.equal(O.rouletteReturn({ c3: 300 }, 12), 900);          // 12 is col 3
  assert.equal(O.rouletteReturn({ low: 100, even: 100 }, 12), 400);
});

test('blackjack hand values', () => {
  assert.deepEqual(O.handValue([c(14), c(9)]), { total: 20, soft: true });
  assert.deepEqual(O.handValue([c(14), c(9), c(5)]), { total: 15, soft: false });
  assert.deepEqual(O.handValue([c(14), c(14), c(9)]), { total: 21, soft: true });
  assert.deepEqual(O.handValue([c(13), c(12)]), { total: 20, soft: false });
});

test('blackjack settle', () => {
  assert.equal(O.settleBlackjack({ main: 1000 }, [c(14), c(13)], [c(10), c(9), c(2)]), 2500); // BJ 3:2
  assert.equal(O.settleBlackjack({ main: 1000 }, [c(14), c(13)], [c(14), c(12)]), 1000);       // BJ push
  assert.equal(O.settleBlackjack({ main: 1000 }, [c(10), c(9), c(5)], [c(10), c(8)]), 0);      // bust
  assert.equal(O.settleBlackjack({ main: 1000 }, [c(10), c(9)], [c(10), c(6), c(10)]), 2000);  // dealer bust
  assert.equal(O.settleBlackjack({ main: 1000 }, [c(10), c(9)], [c(10), c(8)]), 2000);         // 19>18
  assert.equal(O.settleBlackjack({ main: 1000 }, [c(10), c(8)], [c(10), c(8)]), 1000);         // push
});

test('blackjack side bets', () => {
  assert.equal(O.perfectPairReturn(100, [c(8, 0), c(8, 1)]), 1200);
  assert.equal(O.perfectPairReturn(100, [c(8), c(9)]), 0);
  assert.equal(O.twentyOnePlusThreeReturn(100, c(5, 0), c(6, 1), c(7, 2)), 1000);  // straight
  assert.equal(O.twentyOnePlusThreeReturn(100, c(2, 1), c(9, 1), c(13, 1)), 1000); // flush
  assert.equal(O.twentyOnePlusThreeReturn(100, c(2, 0), c(3, 1), c(14, 2)), 1000); // A-2-3 wheel
  assert.equal(O.twentyOnePlusThreeReturn(100, c(2, 0), c(9, 1), c(13, 2)), 0);
});

test('baccarat third-card rule + returns', () => {
  // Stacked shoe (pop() deals from the END): P=9,6 (natural 15→5? no: 9+6=15→5)…
  // Use explicit naturals: P gets K,9 (9 natural) B gets 4,4 (8 natural) → both stand, player wins 9>8.
  const shoe = [c(2), c(3), c(4, 1), c(9), c(4, 2), c(13)];   // pops: K,9? order: pop→c(13) first
  const round = O.playBaccarat(shoe);
  // deal order: P1=K, P2=4♦(? see implementation: P,B,P,B) — assert via totals instead:
  assert.ok(['player', 'banker', 'tie'].includes(round.winner));
  assert.equal(round.pT, O.bacTotal(round.P));
  assert.equal(round.bT, O.bacTotal(round.B));
  // Deterministic return check:
  assert.equal(O.baccaratReturn({ banker: 1000 }, { winner: 'banker', P: [c(2), c(3)], B: [c(4), c(4)] }), 1950);
  assert.equal(O.baccaratReturn({ player: 1000 }, { winner: 'player', P: [c(2), c(3)], B: [c(4), c(4)] }), 2000);
  assert.equal(O.baccaratReturn({ player: 500, tie: 100 }, { winner: 'tie', P: [c(2), c(3)], B: [c(4), c(4)] }), 1400); // tie 8:1 + player pushes
  assert.equal(O.baccaratReturn({ banker: 500, bPair: 100 }, { winner: 'player', P: [c(2), c(3)], B: [c(4, 0), c(4, 1)] }), 1200); // bPair 11:1
});

test('baccarat draw rules (fixed shoes)', () => {
  // Player 5 (2+3) draws; banker 7 stands. Shoe pops from end: [.., B2, P2, B1, P1]
  const s1 = [c(9, 3), c(8), c(4), c(3), c(3, 1), c(2)];
  // deal: P1=c(2), B1=c(3,1), P2=c(3), B2=c(4) → P=5 draws c(8) → P total 3; B=7 stands
  const r1 = O.playBaccarat(s1);
  assert.equal(r1.P.length, 3);
  assert.equal(r1.B.length, 2);
  assert.equal(r1.bT, 7);
});

test('poker evaluator', () => {
  assert.equal(O.eval5([c(14,0), c(13,0), c(12,0), c(11,0), c(10,0)]).cat, 9);  // royal
  assert.equal(O.eval5([c(9,1), c(8,1), c(7,1), c(6,1), c(5,1)]).cat, 8);       // SF
  assert.equal(O.eval5([c(9,0), c(9,1), c(9,2), c(9,3), c(5,1)]).cat, 7);       // quads
  assert.equal(O.eval5([c(9,0), c(9,1), c(9,2), c(5,3), c(5,1)]).cat, 6);       // boat
  assert.equal(O.eval5([c(2,1), c(9,1), c(13,1), c(4,1), c(7,1)]).cat, 5);      // flush
  assert.equal(O.eval5([c(14,0), c(2,1), c(3,2), c(4,3), c(5,1)]).cat, 4);      // wheel straight
  assert.equal(O.eval5([c(9,0), c(9,1), c(9,2), c(4,3), c(5,1)]).cat, 3);
  assert.equal(O.eval5([c(9,0), c(9,1), c(4,2), c(4,3), c(5,1)]).cat, 2);
  assert.equal(O.eval5([c(9,0), c(9,1), c(4,2), c(7,3), c(5,1)]).cat, 1);
  assert.equal(O.eval5([c(13,0), c(9,1), c(4,2), c(7,3), c(5,1)]).cat, 0);
  // kicker comparison: pair of 9s K-kicker beats pair of 9s Q-kicker
  const a = O.eval5([c(9,0), c(9,1), c(13,2), c(7,3), c(5,1)]);
  const b = O.eval5([c(9,2), c(9,3), c(12,2), c(7,0), c(5,0)]);
  assert.ok(O.cmpEval(a, b) > 0);
});

test('evaluate7 finds best five', () => {
  const seven = [c(14,0), c(13,0), c(12,0), c(11,0), c(10,0), c(2,1), c(3,2)];
  assert.equal(O.evaluate7(seven).cat, 9);
});

test('UTH settle', () => {
  const board = [c(14,0), c(13,0), c(12,0), c(7,1), c(2,2)];
  const playerRoyal = [c(11,0), c(10,0)];
  const dealerPair = [c(7,2), c(7,3)];
  const r = O.settleUTH({ ante: 100, blind: 100, trips: 100, jackpot: true }, board, playerRoyal, dealerPair);
  // ante 1:1 → 200; blind royal 500:1 → 100 + 50000; trips royal 50:1 → 5100; jackpot demo always loses
  assert.equal(r.ret, 200 + 50100 + 5100);
  assert.ok(r.cmp > 0);
  const loss = O.settleUTH({ ante: 100, blind: 100, trips: 0, jackpot: false }, board, dealerPair, playerRoyal);
  assert.equal(loss.ret, 0);
});

test('UTH trips pays even when the main hand loses', () => {
  // player: trips of 2s (cat 3). dealer: 9-K straight (cat 4) → player LOSES main.
  const board = [c(2, 0), c(2, 1), c(9, 2), c(10, 3), c(11, 0)];
  const playerHole = [c(2, 2), c(3, 3)];
  const dealerHole = [c(12, 1), c(13, 2)];
  const r = O.settleUTH({ ante: 100, blind: 100, trips: 100, jackpot: false }, board, playerHole, dealerHole);
  assert.ok(r.cmp < 0);
  assert.equal(r.ret, 400);   // ante+blind lost; trips 3:1 → 100×(3+1)
});

test('blackjack dealer stands on soft 17', () => {
  const hand = [c(14), c(6)];          // A+6 = soft 17
  O.dealerPlay(hand, [c(10)]);         // shoe available but must not be drawn
  assert.equal(hand.length, 2);
  assert.deepEqual(O.handValue(hand), { total: 17, soft: true });
});

test('baccarat banker on 6 draws only against player third card 6 or 7', () => {
  // Shoe pops from the END. Deal order: P1, B1, P2, B2, then player third, then banker third.
  // Case 1: player 4 draws a 6 → banker 6 must DRAW.
  const draws = O.playBaccarat([c(9, 1), c(6, 2), c(4, 0), c(2, 2), c(2, 1), c(2, 0)]);
  // pops: P1=2, B1=2, P2=2, B2=4 → pT=4 draws c(6); v3=6, bT=6 → banker draws c(9).
  assert.equal(draws.B.length, 3);
  // Case 2: identical except player third is 5 → banker 6 must STAND.
  const stands = O.playBaccarat([c(9, 1), c(5, 2), c(4, 0), c(2, 2), c(2, 1), c(2, 0)]);
  assert.equal(stands.B.length, 2);
  assert.equal(stands.bT, 6);
});
