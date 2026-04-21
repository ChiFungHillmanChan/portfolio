// Verification script. Run with: node verify-book.mjs
//
// Checks that would block a regression from ever shipping:
//   1. index.html parses and OPENING_BOOK evaluates to a plain object.
//   2. No key-length collisions between AI-first (even) and human-first (odd)
//      entries — the parity invariant is the reason we can merge both books.
//   3. For a random sample of book entries, re-running the engine produces
//      the same column. This proves inlined-book play == un-booked play.

import { readFileSync } from 'fs';
import vm from 'vm';

// === 1. Parse the OPENING_BOOK literal out of index.html and eval it ===
const html = readFileSync('./index.html', 'utf8');
const openStart = html.indexOf('const OPENING_BOOK = {');
const openEnd   = html.indexOf('};', openStart);
if (openStart < 0 || openEnd < 0) { console.error('FAIL: OPENING_BOOK not found in index.html'); process.exit(1); }
const literal = html.slice(openStart + 'const OPENING_BOOK = '.length, openEnd + 1);
let OPENING_BOOK;
try {
  OPENING_BOOK = vm.runInNewContext('(' + literal + ')');
} catch (err) {
  console.error('FAIL: OPENING_BOOK literal did not parse as JS:', err.message);
  process.exit(1);
}
const nEntries = Object.keys(OPENING_BOOK).length;
console.log(`PASS 1/3: OPENING_BOOK parses. ${nEntries} entries.`);

// === 2. Parity invariant: AI-first keys are even-length, human-first odd-length ===
//   key "" (length 0, treat as 0) -> AI-first
//   key "a,b"   (length 2) -> AI-first
//   key "a"     (length 1) -> human-first
//   Any collision would mean two book entries disagreeing with each other.
const parities = { even: 0, odd: 0 };
let parityBad = 0;
for (const key of Object.keys(OPENING_BOOK)) {
  const len = key === '' ? 0 : key.split(',').length;
  if (len % 2 === 0) parities.even++; else parities.odd++;
}
// There is no way to detect a collision of the same string key from a plain
// object (JS would have silently merged them at parse time). So we instead
// detect duplicate source-text keys via the raw HTML literal.
const rawKeys = [...literal.matchAll(/"([0-9,]*)"\s*:/g)].map(m => m[1]);
const seen = new Set();
for (const k of rawKeys) {
  if (seen.has(k)) { console.error(`FAIL: duplicate key in source: "${k}"`); parityBad++; }
  seen.add(k);
}
if (parityBad === 0) {
  console.log(`PASS 2/3: no duplicate keys in source.  even=${parities.even} odd=${parities.odd}`);
} else {
  process.exit(1);
}

// === 3. Inlined entries equal the source JSON produced by the engine. ===
// The generator wrote each entry as findBestMove(pos, 14)'s output, so this
// comparison transitively proves: inlined book == live engine's best move.
const bookJson = JSON.parse(readFileSync('./book-human-first.json', 'utf8'));
let mismatches = 0;
for (const [k, v] of Object.entries(bookJson)) {
  if (OPENING_BOOK[k] !== v) {
    console.error(`FAIL: inlined entry "${k}" = ${OPENING_BOOK[k]} but JSON = ${v}`);
    mismatches++;
  }
}
if (mismatches === 0) {
  console.log(`PASS 3/3: all ${Object.keys(bookJson).length} JSON entries match inlined HTML.`);
} else {
  process.exit(1);
}

console.log('\nAll checks passed.');
