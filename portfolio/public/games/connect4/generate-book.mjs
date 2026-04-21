// Build-time script. Run from this folder:
//   node generate-book.mjs
//
// Produces book-human-first.json mapping "h1", "h1,a1,h2", "h1,a1,h2,a2,h3"
// to the AI's optimal column response at depth 14. Uses the same negamax
// logic as the live engine, so the generated entries are, by construction,
// identical to what the live engine would compute. Inlining them into
// index.html turns a ~15s first-AI-move wait into an instant response.

import { writeFileSync, readFileSync, existsSync } from 'fs';

// ============================================================
// ENGINE — verbatim from index.html (kept simple/slow; it runs once)
// ============================================================
const COLS = 7;
const ROWS = 6;
const H1 = ROWS + 1;
const SIZE = ROWS * COLS;
const COL_ORDER = [3, 2, 4, 1, 5, 0, 6];
const WIN_SCORE = 100000;

const B_H1 = BigInt(H1);
const B_2H1 = BigInt(2 * H1);
const B_H1M1 = BigInt(H1 - 1);
const B_2H1M1 = BigInt(2 * (H1 - 1));
const B_H1P1 = BigInt(H1 + 1);
const B_2H1P1 = BigInt(2 * (H1 + 1));
const B_ROWS_MASK = (1n << BigInt(ROWS)) - 1n;
const COL_SHIFT = [0,1,2,3,4,5,6].map(c => BigInt(c * H1));
const COL_BOTTOM = [0,1,2,3,4,5,6].map(c => 1n << COL_SHIFT[c]);
const COL_TOP = [0,1,2,3,4,5,6].map(c => 1n << BigInt(c * H1 + ROWS - 1));

class Position {
  constructor() {
    this.current = 0n;
    this.mask = 0n;
    this.moves = 0;
    this.history = [];
  }
  canPlay(col) { return (this.mask & COL_TOP[col]) === 0n; }
  play(col) {
    const newMask = this.mask | (this.mask + COL_BOTTOM[col]);
    this.current ^= this.mask;
    this.mask = newMask;
    this.moves++;
    const colBits = (this.mask >> COL_SHIFT[col]) & B_ROWS_MASK;
    let row = -1; let b = colBits;
    while (b) { row++; b >>= 1n; }
    this.history.push({ col, row });
    return row;
  }
  undo() {
    if (this.history.length === 0) return null;
    const last = this.history.pop();
    const col = last.col;
    const colMask = B_ROWS_MASK << COL_SHIFT[col];
    const colBits = this.mask & colMask;
    let highest = 0n;
    let bit = COL_BOTTOM[col];
    for (let r = 0; r < ROWS; r++) {
      if (colBits & bit) highest = bit;
      bit <<= 1n;
    }
    this.mask ^= highest;
    this.current ^= this.mask;
    this.moves--;
    return last;
  }
  static hasFourInARow(pos) {
    let m = pos & (pos >> B_H1);
    if (m & (m >> B_2H1)) return true;
    m = pos & (pos >> B_H1M1);
    if (m & (m >> B_2H1M1)) return true;
    m = pos & (pos >> B_H1P1);
    if (m & (m >> B_2H1P1)) return true;
    m = pos & (pos >> 1n);
    if (m & (m >> 2n)) return true;
    return false;
  }
  wouldWin(col) {
    const newMask = this.mask | (this.mask + COL_BOTTOM[col]);
    const newPieceBit = newMask & ~this.mask;
    const playerAfter = this.current | newPieceBit;
    return Position.hasFourInARow(playerAfter);
  }
  isDraw() { return this.moves === SIZE; }
  key() { return (this.mask + this.current).toString(); }
}

const WINDOW_CACHE = (() => {
  const windows = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (r + 3 < ROWS)                      windows.push([0,1,2,3].map(k => 1n << BigInt(c * H1 + r + k)));
      if (c + 3 < COLS)                      windows.push([0,1,2,3].map(k => 1n << BigInt((c + k) * H1 + r)));
      if (c + 3 < COLS && r + 3 < ROWS)      windows.push([0,1,2,3].map(k => 1n << BigInt((c + k) * H1 + r + k)));
      if (c + 3 < COLS && r - 3 >= 0)        windows.push([0,1,2,3].map(k => 1n << BigInt((c + k) * H1 + r - k)));
    }
  }
  return windows;
})();

function countLines(me, opp) {
  let s = 0;
  for (let i = 0; i < WINDOW_CACHE.length; i++) {
    const w = WINDOW_CACHE[i];
    let mine = 0, theirs = 0;
    for (let k = 0; k < 4; k++) {
      const bit = w[k];
      if (me & bit) mine++; else if (opp & bit) theirs++;
    }
    if (mine && theirs) continue;
    if (mine === 3) s += 5; else if (mine === 2) s += 2; else if (mine === 1) s += 1;
    if (theirs === 3) s -= 5; else if (theirs === 2) s -= 2; else if (theirs === 1) s -= 1;
  }
  return s;
}

function evaluate(pos) {
  const me = pos.current;
  const opp = pos.mask ^ pos.current;
  let score = 0;
  for (let r = 0; r < ROWS; r++) {
    const bit = 1n << BigInt(3 * H1 + r);
    if (me & bit) score += 3;
    if (opp & bit) score -= 3;
  }
  score += countLines(me, opp);
  return score;
}

// Transposition table with proper alpha-beta bounds so we can safely reuse
// entries across iterative-deepening depths (and across games).
const TT_EXACT = 0, TT_LOWER = 1, TT_UPPER = 2;
const transTable = new Map();

function negamax(pos, depth, alpha, beta) {
  const alphaOrig = alpha;

  if (pos.isDraw()) return 0;
  for (let i = 0; i < COLS; i++) {
    const c = COL_ORDER[i];
    if (pos.canPlay(c) && pos.wouldWin(c)) return WIN_SCORE - pos.moves;
  }
  if (depth === 0) return evaluate(pos);

  const key = pos.key();
  const entry = transTable.get(key);
  if (entry !== undefined && entry.depth >= depth) {
    if (entry.bound === TT_EXACT) return entry.value;
    if (entry.bound === TT_LOWER && entry.value > alpha) alpha = entry.value;
    else if (entry.bound === TT_UPPER && entry.value < beta) beta = entry.value;
    if (alpha >= beta) return entry.value;
  }

  const max = WIN_SCORE - pos.moves - 2;
  if (beta > max) { beta = max; if (alpha >= beta) return beta; }

  let best = -Infinity;
  for (let i = 0; i < COLS; i++) {
    const c = COL_ORDER[i];
    if (!pos.canPlay(c)) continue;
    pos.play(c);
    const score = -negamax(pos, depth - 1, -beta, -alpha);
    pos.undo();
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }

  let bound;
  if (best <= alphaOrig) bound = TT_UPPER;
  else if (best >= beta) bound = TT_LOWER;
  else bound = TT_EXACT;
  transTable.set(key, { value: best, depth, bound });

  if (transTable.size > 400000) {
    const it = transTable.keys();
    for (let i = 0; i < 100000; i++) transTable.delete(it.next().value);
  }
  return best;
}

function searchDepth(pos, depth) {
  let localBest = COL_ORDER.find(c => pos.canPlay(c));
  let localScore = -Infinity;
  for (let i = 0; i < COLS; i++) {
    const c = COL_ORDER[i];
    if (!pos.canPlay(c)) continue;
    pos.play(c);
    const score = -negamax(pos, depth - 1, -Infinity, Infinity);
    pos.undo();
    if (score > localScore) { localScore = score; localBest = c; }
  }
  return { col: localBest, score: localScore };
}

function findBestMove(pos, maxDepth) {
  // Tactical
  for (let i = 0; i < COLS; i++) {
    const c = COL_ORDER[i];
    if (pos.canPlay(c) && pos.wouldWin(c)) return c;
  }
  // Block
  pos.current ^= pos.mask;
  let blockCol = null;
  for (let i = 0; i < COLS; i++) {
    const c = COL_ORDER[i];
    if (pos.canPlay(c) && pos.wouldWin(c)) { blockCol = c; break; }
  }
  pos.current ^= pos.mask;
  if (blockCol !== null) return blockCol;

  transTable.clear();   // fresh search per book entry — isolated & reproducible
  let bestCol = COL_ORDER.find(c => pos.canPlay(c));
  let bestScore = -Infinity;
  for (let depth = 1; depth <= maxDepth; depth++) {
    const r = searchDepth(pos, depth);
    bestCol = r.col; bestScore = r.score;
    if (bestScore >= WIN_SCORE - 50) break;
  }
  return bestCol;
}

// ============================================================
// BOOK GENERATION — mode-aware, level-by-level enumeration of reachable
// AI-to-move positions up to a target ply.
//
//   C4_BOOK_MODE  = 'human-first' | 'ai-first'   (default: human-first)
//   C4_BOOK_PLIES = max target ply              (default: 5 for human-first,
//                                                          6 for ai-first)
//   C4_BOOK_DEPTH = negamax depth per entry     (default: 14 — same as live)
//
// Levels are generated shallow → deep so deeper levels can reuse the
// already-built book to pick AI's in-game moves. That restricts the
// enumeration to the realistic game tree — the one the live engine would
// actually walk — instead of exploding over arbitrary AI choices.
// ============================================================
const DEPTH = parseInt(process.env.C4_BOOK_DEPTH || '14', 10);
const MODE = process.env.C4_BOOK_MODE || 'human-first';
const DEFAULT_PLIES = MODE === 'ai-first' ? 6 : 5;
const MAX_PLIES = parseInt(process.env.C4_BOOK_PLIES || String(DEFAULT_PLIES), 10);

if (MODE !== 'human-first' && MODE !== 'ai-first') {
  console.error(`Unknown C4_BOOK_MODE=${MODE}. Use 'human-first' or 'ai-first'.`);
  process.exit(1);
}

const book = {};
// Optional seed: JSON file of {key: col} entries to treat as already-known.
// When extending an existing deployed book, seed it so (a) we don't waste time
// recomputing entries we already have, and (b) deeper levels walk the SAME
// game tree the live engine walks (preserves existing play).
const SEED_FILE = process.env.C4_BOOK_SEED;
if (SEED_FILE) {
  if (!existsSync(SEED_FILE)) {
    console.error(`Seed file not found: ${SEED_FILE}`);
    process.exit(1);
  }
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'));
  for (const [k, v] of Object.entries(seed)) book[k] = v;
  console.log(`Seeded ${Object.keys(seed).length} entries from ${SEED_FILE}`);
}

function keyFromHistory(hist) { return hist.map(m => m.col).join(','); }

// Plies at which the AI is on-move. Human-first: 1, 3, 5, ... (odd).
// AI-first: 0, 2, 4, ... (even).
const plies = [];
const startPly = MODE === 'ai-first' ? 0 : 1;
for (let p = startPly; p <= MAX_PLIES; p += 2) plies.push(p);

// Walk the realistic game tree to targetPly, calling cb on each unique
// AI-to-move position. Human's side fans out; AI's side follows `book`.
function enumerate(targetPly, cb) {
  const seen = new Set();
  const pos = new Position();
  (function walk() {
    if (pos.moves === targetPly) {
      const k = keyFromHistory(pos.history);
      if (seen.has(k)) return;
      seen.add(k);
      cb(k, pos);
      return;
    }
    const aiOnMove = (MODE === 'ai-first') ? (pos.moves % 2 === 0) : (pos.moves % 2 === 1);
    if (aiOnMove) {
      const aiCol = book[keyFromHistory(pos.history)];
      if (aiCol === undefined || !pos.canPlay(aiCol)) return;   // shallower book missing
      pos.play(aiCol); walk(); pos.undo();
    } else {
      for (let c = 0; c < COLS; c++) {
        if (!pos.canPlay(c)) continue;
        pos.play(c); walk(); pos.undo();
      }
    }
  })();
}

const t0 = Date.now();
console.log(`Generating opening book. mode=${MODE}  depth=${DEPTH}  plies=${plies.join(',')}`);

let totalDone = 0;
for (const ply of plies) {
  const positions = [];
  enumerate(ply, (key, pos) => positions.push({ key, hist: pos.history.slice() }));
  console.log(`\n== ${ply}-ply: ${positions.length} reachable AI-to-move positions ==`);
  for (const { key, hist } of positions) {
    if (book[key] !== undefined) continue;
    const pos = new Position();
    for (const m of hist) pos.play(m.col);
    const ts = Date.now();
    const aiCol = findBestMove(pos, DEPTH);
    const dt = ((Date.now() - ts) / 1000).toFixed(1);
    book[key] = aiCol;
    totalDone++;
    console.log(`[${totalDone}] ${ply}-ply "${key}" -> ${aiCol}  (${dt}s)`);
  }
}

console.log(`\nTotal wall time: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`Entries: ${Object.keys(book).length}`);

// Write JSON, sorted by history length then lexicographic (stable diffs).
const sorted = {};
Object.keys(book)
  .sort((a, b) => {
    const la = a === '' ? 0 : a.split(',').length;
    const lb = b === '' ? 0 : b.split(',').length;
    return la !== lb ? la - lb : a.localeCompare(b);
  })
  .forEach(k => { sorted[k] = book[k]; });
const outFile = `./book-${MODE}.json`;
writeFileSync(outFile, JSON.stringify(sorted, null, 2));
console.log(`Wrote ${outFile}`);
