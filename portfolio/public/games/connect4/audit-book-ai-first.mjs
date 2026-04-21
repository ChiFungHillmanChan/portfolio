// Pre-flight correctness audit for the ai-first opening book, using the
// PERFECT solver (solve_perfect) as the ground-truth oracle.
//
// For each sampled ai-first book entry:
//   1. Replay the history → position where AI is to move.
//   2. Play the column the book tells AI to play.
//   3. Ask the perfect solver: from the OPPONENT's POV, what's the value?
//        score  >  0  → opponent wins        → book is WRONG (losing move)
//        score  =  0  → opponent forces draw → book is WRONG (drawing move)
//        score  <  0  → opponent loses       → book is CORRECT (AI wins)
//
// If any entry at any ply fails, do NOT proceed to the extender — the
// extender seeds from the inline book and would propagate the bug.
//
// Runtime on M5, fresh wasm instance (cold TT):
//   SAMPLES_PER_PLY=30  → ~10–25 min (recommended default)
//   SAMPLES_PER_PLY=50  → ~15–40 min
//   SAMPLES_PER_PLY=200 → ~1–2 h (exhaustive for plies ≤ 6)
//
// Usage:
//   cd portfolio/public/games/connect4
//   node audit-book-ai-first.mjs
//   SAMPLES_PER_PLY=50 node audit-book-ai-first.mjs
//
// Exit code 0 = safe to run extend-book-ai-first.mjs. 1 = bug found.

import { readFileSync } from 'fs';

const SAMPLES_PER_PLY = parseInt(process.env.SAMPLES_PER_PLY || '30', 10);

// -------- wasm --------
const wasmBytes = readFileSync('./connect4-solver.wasm');
const { instance } = await WebAssembly.instantiate(wasmBytes);
const solve_perfect = instance.exports.solve_perfect;
if (!solve_perfect) {
  console.error('ERROR: wasm does not export solve_perfect.');
  console.error('Rebuild with the upgraded lib.rs:');
  console.error('  (cd ../../../scripts/connect4-wasm && cargo build --release --target wasm32-unknown-unknown)');
  console.error('  cp ../../../scripts/connect4-wasm/target/wasm32-unknown-unknown/release/connect4_solver.wasm ./connect4-solver.wasm');
  process.exit(2);
}

// -------- pull OPENING_BOOK out of index.html --------
const html = readFileSync('./index.html', 'utf8');
const start = html.indexOf('const OPENING_BOOK = {');
const end   = html.indexOf('};', start);
if (start < 0 || end < 0) { console.error('ERROR: OPENING_BOOK not found in index.html'); process.exit(2); }
const lit = html.slice(start + 'const OPENING_BOOK = '.length, end + 1);
const BOOK = new Function('return (' + lit + ');')();

// -------- bitboard (mirrors the Rust Position) --------
const COLS = 7, ROWS = 6, H1 = 7;
const COL_BOTTOM = [0,1,2,3,4,5,6].map(c => 1n << BigInt(c * H1));
const COL_TOP    = [0,1,2,3,4,5,6].map(c => 1n << BigInt(c * H1 + ROWS - 1));

class Pos {
  constructor() { this.mask = 0n; this.current = 0n; this.moves = 0; }
  canPlay(c) { return (this.mask & COL_TOP[c]) === 0n; }
  play(c) {
    this.current ^= this.mask;
    this.mask |= (this.mask + COL_BOTTOM[c]);
    this.moves++;
  }
}

// -------- group ai-first entries by ply, then sample --------
const byPly = {};
for (const key of Object.keys(BOOK)) {
  const ply = key === '' ? 0 : key.split(',').length;
  if (ply % 2 !== 0) continue;   // human-first entries use odd-length keys
  (byPly[ply] = byPly[ply] || []).push(key);
}
const plies = Object.keys(byPly).map(Number).sort((a, b) => a - b);
console.log(`AI-first book cohorts: ${plies.map(p => `ply${p}:${byPly[p].length}`).join('  ')}`);

const sample = [];
for (const ply of plies) {
  if (ply === 0) continue;       // "" → 3 is trivially correct, skip
  const all = byPly[ply];
  if (all.length <= SAMPLES_PER_PLY) {
    all.forEach(k => sample.push({ ply, key: k }));
  } else {
    const stride = all.length / SAMPLES_PER_PLY;
    for (let i = 0; i < SAMPLES_PER_PLY; i++) {
      sample.push({ ply, key: all[Math.floor(i * stride)] });
    }
  }
}
console.log(`Auditing ${sample.length} entries (${SAMPLES_PER_PLY}/ply, stride-sampled).\n`);

// -------- per-entry check --------
let ok = 0, bad = 0;
const bugs = [];
const t0 = Date.now();
let lastLog = t0;

for (let i = 0; i < sample.length; i++) {
  const { ply, key } = sample[i];
  const cols = key === '' ? [] : key.split(',').map(Number);
  const bookCol = BOOK[key];

  const p = new Pos();
  for (const c of cols) p.play(c);

  if (!p.canPlay(bookCol)) {
    bad++;
    bugs.push({ key, ply, bookCol, reason: 'illegal move in this position' });
    continue;
  }
  p.play(bookCol);

  // solve_perfect returns score from CURRENT player's POV. After AI's
  // book move, current player is the human. Score < 0 ⇒ human is forced
  // to lose ⇒ AI is winning from where it started.
  const ts = Date.now();
  const humanScore = Number(solve_perfect(p.mask, p.current, p.moves));
  const dt = Date.now() - ts;

  if (humanScore < 0) {
    ok++;
  } else {
    bad++;
    bugs.push({ key, ply, bookCol, humanScore, reason: humanScore === 0 ? 'draws' : 'loses' });
    console.log(`  ❌ ply=${ply} key="${key}" book=${bookCol} → humanPOV=${humanScore}  (${dt}ms)`);
  }

  const now = Date.now();
  if (now - lastLog > 15000 || i === sample.length - 1) {
    const secs = ((now - t0) / 1000).toFixed(1);
    const rate = (i + 1) / ((now - t0) / 1000);
    const etaS = ((sample.length - i - 1) / rate).toFixed(0);
    console.log(`  [${i + 1}/${sample.length}]  ok=${ok}  bad=${bad}  elapsed=${secs}s  eta~${etaS}s`);
    lastLog = now;
  }
}

const tot = ((Date.now() - t0) / 1000).toFixed(1);
console.log('');
console.log('==================================================');
console.log(`  sampled:      ${sample.length}`);
console.log(`  correct:      ${ok}`);
console.log(`  losing/draw:  ${bad}`);
console.log(`  wall time:    ${tot}s`);
console.log('==================================================');

if (bad === 0) {
  console.log('\n  ✅ Every sampled book entry preserves AI\'s winning value.');
  console.log('     Safe to run extend-book-ai-first.mjs.');
  process.exit(0);
} else {
  console.log('\n  ❌ Book contains losing/drawing entries. Extension would propagate the bug.');
  for (const b of bugs) {
    console.log(`    ply=${b.ply}  key="${b.key}"  book=${b.bookCol}  →  ${b.reason}${b.humanScore !== undefined ? `  (humanPOV=${b.humanScore})` : ''}`);
  }
  process.exit(1);
}
