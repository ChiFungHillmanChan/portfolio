// js/equity/cards.mjs
// Cactus Kev card encoding: 32-bit int = xxxbbbbb_bbbbbbbb_cdhsrrrr_xxpppppp
// where: bits 16-28 = rank bit (one of 13), bits 12-15 = suit (cdhs), bits 8-11 = rank int (0-12), bits 0-7 = prime
const RANKS = '23456789TJQKA';
const SUITS = 'cdhs';
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41]; // 2..A
const SUIT_BITS = { c: 0x8000, d: 0x4000, h: 0x2000, s: 0x1000 };

export function encodeCard(s) {
  if (!s || s.length !== 2) throw new Error(`invalid card: ${s}`);
  const r = RANKS.indexOf(s[0]);
  const suitBit = SUIT_BITS[s[1]];
  if (r < 0 || suitBit === undefined) throw new Error(`invalid card: ${s}`);
  const prime = PRIMES[r];
  const rankBit = 1 << (16 + r);
  const rankInt = r << 8;
  return rankBit | suitBit | rankInt | prime;
}

export function decodeCard(card) {
  const r = (card >> 8) & 0xF;
  const suitBit = card & 0xF000;
  const s = Object.keys(SUIT_BITS).find(k => SUIT_BITS[k] === suitBit);
  return RANKS[r] + s;
}

export function encodeHand(cards) {
  return cards.map(encodeCard);
}

export function allCards() {
  const out = [];
  for (const r of RANKS) for (const s of SUITS) out.push(encodeCard(r + s));
  return out;
}
