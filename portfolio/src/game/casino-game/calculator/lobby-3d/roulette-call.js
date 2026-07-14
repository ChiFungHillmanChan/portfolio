// roulette-call.js — pure phrase/label logic for announcing a roulette result.
// Shared by roulette-live.js (banner + dealer voice via CASINO.sound) and the
// node tests. No DOM, no THREE, no globals.
//
// House convention: zero is neither even nor odd — even-money bets lose on 0,
// so the display and the dealer call must never say "Even" for it.

export const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export const colorOf = (n) => (n === 0 ? 'Green' : RED.has(n) ? 'Red' : 'Black');

export const parityOf = (n) => (n === 0 ? null : n % 2 === 0 ? 'Even' : 'Odd');

// Banner subtitle: "Red · Even" / "Black · Odd" / "Green" (zero has no parity).
export function bannerSub(n) {
  const p = parityOf(n);
  return p ? `${colorOf(n)} · ${p}` : colorOf(n);
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen', 'twenty'];

export function numberWords(n) {
  if (n <= 20) return ONES[n];
  const tens = n < 30 ? 'twenty' : 'thirty';
  const rest = n % 10;
  return rest ? `${tens}-${ONES[rest]}` : tens;
}

// Dealer call: "thirty-two, red, even" / "zero, green".
export function resultSpeech(n) {
  const parts = [numberWords(n), colorOf(n).toLowerCase()];
  const p = parityOf(n);
  if (p) parts.push(p.toLowerCase());
  return parts.join(', ');
}

export const NO_MORE_BETS = 'No more bets';
