// Extend the ai-first opening book using the PERFECT solver (solve_perfect).
//
// Walks the reachable game tree starting from the empty board with AI to
// move. At every AI-on-move position it records the provably-optimal
// column returned by the wasm perfect solver; at every human-to-move
// position it branches on all 7 legal columns. Stops at MAX_PLY.
//
// Output: book-ai-first-extended.json — a flat {history_string: column}
// map suitable for merging into the OPENING_BOOK inside index.html. The
// existing 8-ply entries are overwritten where the perfect solver gives a
// different (but equally-winning) move, so the resulting book is coherent
// with itself (AI's recorded move actually leads to positions recorded
// in the book).
//
// Run:
//   MAX_PLY=10 node extend-book-ai-first.mjs
//
// Progress is streamed to stdout and the current book is flushed to the
// output file every CHECKPOINT_EVERY unique new entries, so a long run can
// be killed and resumed.

import { readFileSync, writeFileSync, existsSync } from 'fs';

const MAX_PLY = parseInt(process.env.MAX_PLY || '10', 10);
const CHECKPOINT_EVERY = 500;
const OUT_FILE = './book-ai-first-extended.json';

// -------- wasm ----------
const wasmBytes = readFileSync('./connect4-solver.wasm');
const { instance } = await WebAssembly.instantiate(wasmBytes);
const solve_perfect = instance.exports.solve_perfect;
if (!solve_perfect) {
  throw new Error('wasm does not export solve_perfect — rebuild first');
}

// -------- bitboard ----------
const COLS = 7, ROWS = 6, H1 = 7;
const COL_BOTTOM = [0,1,2,3,4,5,6].map(c => 1n << BigInt(c * H1));
const COL_TOP    = [0,1,2,3,4,5,6].map(c => 1n << BigInt(c * H1 + ROWS - 1));
const B_H1 = BigInt(H1), B_2H1 = BigInt(2*H1);
const B_H1M1 = BigInt(H1-1), B_2H1M1 = BigInt(2*(H1-1));
const B_H1P1 = BigInt(H1+1), B_2H1P1 = BigInt(2*(H1+1));

class Pos {
  constructor() {
    this.mask = 0n;
    this.current = 0n;
    this.moves = 0;
    this.history = [];
  }
  canPlay(c) { return (this.mask & COL_TOP[c]) === 0n; }
  play(c) {
    this.current ^= this.mask;
    this.mask |= (this.mask + COL_BOTTOM[c]);
    this.moves++;
    this.history.push(c);
  }
  undo() {
    if (this.history.length === 0) return;
    // Reverse the play: clear the topmost bit of the column and swap current.
    const c = this.history.pop();
    const colMask = ((1n << BigInt(ROWS)) - 1n) << BigInt(c * H1);
    const colBits = this.mask & colMask;
    let highest = 0n;
    let bit = COL_BOTTOM[c];
    for (let r = 0; r < ROWS; r++) {
      if (colBits & bit) highest = bit;
      bit <<= 1n;
    }
    this.mask ^= highest;
    this.current ^= this.mask;
    this.moves--;
  }
  static hasFour(p) {
    let m = p & (p >> B_H1);    if (m & (m >> B_2H1))   return true;
    m = p & (p >> B_H1M1);      if (m & (m >> B_2H1M1)) return true;
    m = p & (p >> B_H1P1);      if (m & (m >> B_2H1P1)) return true;
    m = p & (p >> 1n);          if (m & (m >> 2n))      return true;
    return false;
  }
  justWon() {
    // The player who JUST moved has their bitboard in (mask ^ current).
    return Pos.hasFour(this.mask ^ this.current);
  }
}

// -------- generator ----------

// Resume from existing output if present — lets a long run be interrupted.
const book = existsSync(OUT_FILE)
  ? JSON.parse(readFileSync(OUT_FILE, 'utf8'))
  : {};

// Seed from the INLINE book in index.html — reuses every ply 0–8 entry we
// already have (those were verified with the depth-14 engine and agree with
// the perfect solver in simple tests). This skips re-solving the first few
// plies, which are the most expensive from cold TT (empty-board solve alone
// is >30 s without a pre-warmed table). Without the seed the first entry
// takes ~1 minute just to return "3" for the empty position.
if (Object.keys(book).length === 0 && existsSync('./index.html')) {
  try {
    const html = readFileSync('./index.html', 'utf8');
    const start = html.indexOf('const OPENING_BOOK = {');
    const end   = html.indexOf('};', start);
    if (start >= 0 && end > start) {
      const lit = html.slice(start + 'const OPENING_BOOK = '.length, end + 1);
      const parsed = new Function('return (' + lit + ');')();
      let seeded = 0;
      for (const [k, v] of Object.entries(parsed)) {
        // Seed only AI-first entries (even-length keys: "", "3,0", "3,0,3,0"…).
        const len = k === '' ? 0 : k.split(',').length;
        if (len % 2 === 0) { book[k] = v; seeded++; }
      }
      console.log(`Seeded ${seeded} ai-first entries from index.html`);
    }
  } catch (e) {
    console.warn('Could not seed from index.html:', e.message);
  }
}

let newEntries = 0;
let solvesThisRun = 0;
let walkCount = 0;
const t0 = Date.now();

function flush() {
  // Sort keys: by history length first (matches the style in index.html),
  // then lexicographically — gives a stable diff.
  const sorted = {};
  Object.keys(book)
    .sort((a, b) => {
      const la = a === '' ? 0 : a.split(',').length;
      const lb = b === '' ? 0 : b.split(',').length;
      return la !== lb ? la - lb : a.localeCompare(b);
    })
    .forEach(k => { sorted[k] = book[k]; });
  writeFileSync(OUT_FILE, JSON.stringify(sorted, null, 2));
}

function aiOptimal(pos) {
  const key = pos.history.join(',');
  if (book[key] !== undefined) return book[key];
  const t = Date.now();
  const col = Number(solve_perfect(pos.mask, pos.current, pos.moves));
  const dt = Date.now() - t;
  book[key] = col;
  newEntries++;
  solvesThisRun++;
  if (solvesThisRun % 25 === 0 || dt > 2000) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  [${String(solvesThisRun).padStart(5)}] ply=${String(pos.moves).padStart(2)} key="${key}" -> ${col}  (${dt}ms)  total=${elapsed}s`);
  }
  if (newEntries % CHECKPOINT_EVERY === 0) {
    flush();
    console.log(`  ... checkpoint: ${Object.keys(book).length} entries, ${newEntries} new this run`);
  }
  return col;
}

function walk(pos, mode /* 'ai' | 'human' */) {
  walkCount++;
  if (pos.moves > MAX_PLY) return;
  if (mode === 'ai') {
    const col = aiOptimal(pos);
    if (col < 0 || !pos.canPlay(col)) return;
    pos.play(col);
    if (!pos.justWon() && pos.moves <= MAX_PLY) {
      walk(pos, 'human');
    }
    pos.undo();
  } else {
    for (let c = 0; c < COLS; c++) {
      if (!pos.canPlay(c)) continue;
      pos.play(c);
      if (!pos.justWon()) walk(pos, 'ai');
      pos.undo();
    }
  }
}

console.log(`Extending ai-first opening book to ply ${MAX_PLY}.`);
console.log(`Existing book has ${Object.keys(book).length} entries.`);
console.log('');
const root = new Pos();
walk(root, 'ai');

flush();
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log('');
console.log(`Done. Total entries: ${Object.keys(book).length} (${newEntries} new this run)`);
console.log(`Wall time: ${elapsed}s`);
console.log(`Wrote: ${OUT_FILE}`);
