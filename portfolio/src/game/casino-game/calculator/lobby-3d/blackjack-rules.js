// blackjack-rules.js — pure rules for the 3D lobby's live blackjack round.
// European no-hole-card game, S17, BJ 3:2, one split, no double-after-split.
// No DOM, no THREE, no globals — imported by blackjack-live.js AND node tests.

const defaultRand = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;

export function makeDeck() {
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s });
  return d;
}

export function makeShoe(decks = 6, rand = defaultRand) {
  const cards = Array.from({ length: decks }, makeDeck).flat();
  for (let i = cards.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function handValue(cards) {
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.r === 14) { aces++; total += 11; } else total += Math.min(c.r, 10);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}

export const isBlackjack = (cards) => cards.length === 2 && handValue(cards).total === 21;

// S17: dealer draws to 17 and stands on ALL 17s (soft included) — same as 2D.
export function dealerPlay(hand, shoe) {
  while (handValue(hand).total < 17) hand.push(shoe.pop());
  return hand;
}

const bjVal = (r) => Math.min(r, 10) + (r === 14 ? 1 : 0); // 14→11, 10..13→10
export const canSplit = (cards) =>
  cards.length === 2 && bjVal(cards[0].r) === bjVal(cards[1].r);

// One hand's return (chips back, stake included). stake already includes any
// double top-up. European: dealer blackjack (2-card 21) beats everything but
// pushes a player blackjack; a 3+ card dealer 21 is an ordinary 21.
export function settleMain({ cards, stake, isSplit = false }, dealerCards) {
  const p = handValue(cards).total;
  if (p > 21) return 0;
  const pBJ = !isSplit && isBlackjack(cards);
  const dBJ = isBlackjack(dealerCards);
  if (pBJ && dBJ) return stake;
  if (pBJ) return stake + Math.floor(stake * 1.5);
  if (dBJ) return 0;
  const d = handValue(dealerCards).total;
  if (d > 21 || p > d) return stake * 2;
  if (p === d) return stake;
  return 0;
}

// Perfect Pair: 25:1 same rank+suit, 12:1 same rank+color, 6:1 mixed pair.
const RED_SUITS = new Set([1, 2]);
export function perfectPairReturn(stake, [a, b]) {
  if (!stake || a.r !== b.r) return 0;
  if (a.s === b.s) return stake * 26;
  if (RED_SUITS.has(a.s) === RED_SUITS.has(b.s)) return stake * 13;
  return stake * 7;
}

// 21+3 (player's two + dealer up): suited trips 100, straight flush 40,
// trips 30, straight 10, flush 5 — the 2D side-bets.js paytable.
export function twentyOnePlus3Return(stake, c1, c2, dUp) {
  if (!stake) return 0;
  const cs = [c1, c2, dUp];
  const trips = cs.every((k) => k.r === cs[0].r);
  const flush = cs.every((k) => k.s === cs[0].s);
  const rs = cs.map((k) => k.r).sort((x, y) => x - y);
  const straight = (rs[1] === rs[0] + 1 && rs[2] === rs[1] + 1) ||
                   (rs[0] === 2 && rs[1] === 3 && rs[2] === 14);
  if (trips && flush) return stake * 101;
  if (straight && flush) return stake * 41;
  if (trips) return stake * 31;
  if (straight) return stake * 11;
  if (flush) return stake * 6;
  return 0;
}

// Board validation against the tier's real betTypes (table-config shapes).
export function validateBets(bets, betTypes, balance, maxTotalBet = Infinity) {
  const main = bets.main || 0;
  const pp = bets.perfectPair || 0;
  const tpt = bets.twentyOnePlus3 || 0;
  const inR = (a, t) => a >= t.min && a <= t.max;
  if (!inR(main, betTypes.main)) return { ok: false, reason: 'main-range' };
  if (pp !== 0 && !inR(pp, betTypes.perfectPair)) return { ok: false, reason: 'side-range' };
  if (tpt !== 0 && !inR(tpt, betTypes.twentyOnePlus3)) return { ok: false, reason: 'side-range' };
  const total = main + pp + tpt;
  if (total > maxTotalBet) return { ok: false, reason: 'table-max' };
  if (total > balance) return { ok: false, reason: 'balance' };
  return { ok: true, total };
}

// Chip rack denominations for the tier (chip meshes exist for all of these).
// No chip below the main-bet min: every stack of rack chips is a clean
// multiple of a playable amount, and one chip of the smallest denom is
// already a valid main bet.
export const chipRack = ({ main }) => {
  const fit = [50, 100, 500, 1000, 5000].filter((v) => v >= main.min && v <= main.max);
  return fit.length ? fit : [5000];
};
