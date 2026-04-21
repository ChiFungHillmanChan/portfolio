// Extend the ai-first opening book using the PERFECT solver (solve_perfect).
//
// Walks the reachable game tree starting from the empty board with AI to
// move. At every AI-on-move position it records the provably-optimal
// column returned by the wasm perfect solver; at every human-to-move
// position it branches on all 7 legal columns. Stops at MAX_PLY.
//
// Output: book-ai-first-extended.json — a flat {history_string: column}
// map suitable for merging into the OPENING_BOOK inside index.html.
//
// Runtime:
//   MAX_PLY=10  ~2 800 → ~13 000 entries, ~2-5 hours on M-series
//   MAX_PLY=12  ~13 000 → ~80 000 entries, ~15-30 hours (two overnight runs)
//
// Run:
//   MAX_PLY=10 node extend-book-ai-first.mjs
//   MAX_PLY=12 caffeinate -s -i node extend-book-ai-first.mjs
//
// Kill-safe: progress is flushed to disk every CHECKPOINT_EVERY unique new
// entries. Re-running picks up from the latest flushed state.
//
// After generation finishes, an AUDIT PASS replays the whole tree a second
// time, calling solve_perfect on every position AFTER the AI's recorded
// move to confirm AI still holds a forced-win value. Any audit failure
// prints the losing history and exits non-zero — do not deploy the book
// if the audit fails.

import { readFileSync, writeFileSync, existsSync } from 'fs';

const MAX_PLY = parseInt(process.env.MAX_PLY || '10', 10);
const CHECKPOINT_EVERY = 500;
const OUT_FILE = './book-ai-first-extended.json';
const AUDIT = (process.env.AUDIT || 'on') !== 'off';

// -------- wasm --------
const wasmBytes = readFileSync('./connect4-solver.wasm');
const { instance } = await WebAssembly.instantiate(wasmBytes);
const solve_perfect = instance.exports.solve_perfect;
if (!solve_perfect) {
  throw new Error('wasm does not export solve_perfect — rebuild it:\n'
    + '  (cd ../../../scripts/connect4-wasm && cargo build --release --target wasm32-unknown-unknown)\n'
    + '  cp ../../../scripts/connect4-wasm/target/wasm32-unknown-unknown/release/connect4_solver.wasm ./connect4-solver.wasm');
}

// -------- bitboard --------
const COLS = 7, ROWS = 6, H1 = 7;
const COL_BOTTOM = [0,1,2,3,4,5,6].map(c => 1n << BigInt(c * H1));
const COL_TOP    = [0,1,2,3,4,5,6].map(c => 1n << BigInt(c * H1 + ROWS - 1));
const B_H1 = BigInt(H1), B_2H1 = BigInt(2*H1);
const B_H1M1 = BigInt(H1-1), B_2H1M1 = BigInt(2*(H1-1));
const B_H1P1 = BigInt(H1+1), B_2H1P1 = BigInt(2*(H1+1));

class Pos {
  constructor() {
    this.mask = 0n; this.current = 0n; this.moves = 0; this.history = [];
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
  justWon() { return Pos.hasFour(this.mask ^ this.current); }
}

// -------- resume state --------
// If book-ai-first-extended.json exists, pick up where we left off.
const book = existsSync(OUT_FILE)
  ? JSON.parse(readFileSync(OUT_FILE, 'utf8'))
  : {};

// Seed from index.html's inline OPENING_BOOK — reuses ply 0-8 entries
// without re-solving them (the ply-0 empty-board solve alone is 30-60s
// from cold TT).
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
        const len = k === '' ? 0 : k.split(',').length;
        if (len % 2 === 0) { book[k] = v; seeded++; }
      }
      console.log(`Seeded ${seeded} ai-first entries from index.html`);
    }
  } catch (e) {
    console.warn('Could not seed from index.html:', e.message);
  }
}

// -------- counters --------
let newEntries = 0;
let solvesThisRun = 0;
let skippedCached = 0;
const t0 = Date.now();

function flush() {
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
  if (book[key] !== undefined) {
    skippedCached++;
    return book[key];
  }
  const ts = Date.now();
  const col = Number(solve_perfect(pos.mask, pos.current, pos.moves));
  const dt = Date.now() - ts;
  book[key] = col;
  newEntries++;
  solvesThisRun++;

  const isNoisy = solvesThisRun % 25 === 0 || dt > 2000;
  if (isNoisy) {
    const elapsedS = ((Date.now() - t0) / 1000);
    const rate = solvesThisRun / elapsedS;   // solves/s
    const pSuffix = `solves=${solvesThisRun} rate=${rate.toFixed(2)}/s elapsed=${elapsedS.toFixed(0)}s`;
    console.log(`  [${String(solvesThisRun).padStart(5)}] ply=${String(pos.moves).padStart(2)} key="${key}" -> ${col}  (${String(dt).padStart(6)}ms) | ${pSuffix}`);
  }
  if (newEntries % CHECKPOINT_EVERY === 0) {
    flush();
    console.log(`  ... checkpoint: ${Object.keys(book).length} entries total, ${newEntries} new this run`);
  }
  return col;
}

// -------- walker --------
function walk(pos, mode /* 'ai' | 'human' */) {
  if (pos.moves > MAX_PLY) return;
  if (mode === 'ai') {
    const col = aiOptimal(pos);
    if (col < 0 || !pos.canPlay(col)) return;
    pos.play(col);
    if (!pos.justWon() && pos.moves <= MAX_PLY) walk(pos, 'human');
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

// -------- audit pass --------
// Walk the same tree again. At every AI-on-move node, play the recorded
// book move and confirm solve_perfect on the resulting position returns
// a NEGATIVE score (= opponent loses = AI wins). Any failure is a bug.
function audit() {
  let checked = 0, failed = 0;
  const failures = [];
  const tA = Date.now();
  let lastLog = tA;

  function walkAudit(pos, mode) {
    if (failed > 10) return;             // bail early on obvious disasters
    if (pos.moves > MAX_PLY) return;
    if (mode === 'ai') {
      const key = pos.history.join(',');
      const col = book[key];
      if (col === undefined) {
        failed++;
        failures.push({ key, reason: 'missing from book' });
        return;
      }
      if (!pos.canPlay(col)) {
        failed++;
        failures.push({ key, bookCol: col, reason: 'book move is illegal' });
        return;
      }
      pos.play(col);
      if (pos.justWon()) {
        // Instant-win move: always fine. No further verification needed.
      } else {
        const score = Number(solve_perfect(pos.mask, pos.current, pos.moves));
        // After AI's move, it's opponent's turn. opponent score < 0 ⇒ AI wins.
        if (score >= 0) {
          failed++;
          failures.push({ key, bookCol: col, humanScore: score, reason: score === 0 ? 'draws' : 'loses' });
          console.log(`  ❌ AUDIT FAIL  ply=${pos.moves - 1}  key="${key}"  book=${col}  humanPOV=${score}`);
        }
      }
      checked++;
      if (pos.moves <= MAX_PLY && !pos.justWon()) walkAudit(pos, 'human');
      pos.undo();

      const now = Date.now();
      if (now - lastLog > 30000) {
        const secs = ((now - tA) / 1000).toFixed(0);
        console.log(`  audit progress: ${checked} checked  ${failed} failed  elapsed=${secs}s`);
        lastLog = now;
      }
    } else {
      for (let c = 0; c < COLS; c++) {
        if (!pos.canPlay(c)) continue;
        pos.play(c);
        if (!pos.justWon()) walkAudit(pos, 'ai');
        pos.undo();
      }
    }
  }

  console.log('\n---- AUDIT PASS ----');
  console.log('Re-walking the tree, verifying every book move preserves AI\'s forced win.');
  const root = new Pos();
  walkAudit(root, 'ai');
  const secs = ((Date.now() - tA) / 1000).toFixed(1);
  console.log(`audit finished in ${secs}s — checked=${checked}  failed=${failed}`);
  return { checked, failed, failures };
}

// -------- main --------
console.log(`Extending ai-first opening book to ply ${MAX_PLY}.`);
console.log(`Existing book has ${Object.keys(book).length} entries.`);
console.log('');
const root = new Pos();
walk(root, 'ai');

flush();
const elapsedTot = ((Date.now() - t0) / 1000).toFixed(1);
console.log('');
console.log(`Generation done. Total entries: ${Object.keys(book).length}  (${newEntries} new this run, ${skippedCached} book hits)`);
console.log(`Wall time: ${elapsedTot}s`);
console.log(`Wrote: ${OUT_FILE}`);

if (!AUDIT) {
  console.log('\n(audit skipped via AUDIT=off)');
  process.exit(0);
}

const result = audit();
console.log('');
console.log('==================================================');
if (result.failed === 0) {
  console.log('  ✅ AUDIT CLEAN — every book move preserves AI forced-win.');
  console.log(`     Book is ready to inline. File: ${OUT_FILE}`);
  console.log('==================================================');
  process.exit(0);
} else {
  console.log(`  ❌ AUDIT FAILED — ${result.failed} book move(s) do not preserve AI\'s win.`);
  console.log('     Do NOT inline this book. Failing entries:');
  for (const f of result.failures.slice(0, 20)) {
    console.log(`       key="${f.key}"  book=${f.bookCol}  reason=${f.reason}`);
  }
  if (result.failures.length > 20) console.log(`     ... and ${result.failures.length - 20} more`);
  console.log('==================================================');
  process.exit(1);
}
