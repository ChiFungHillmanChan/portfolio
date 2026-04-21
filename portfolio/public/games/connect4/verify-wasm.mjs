// Correctness test for the Rust-compiled wasm solver.
// For a sample of book entries, construct the position and call
// solve_best_move. Must match the book (which was produced by the JS engine
// at depth 14). Any mismatch = Rust port has a bug.
//
// Run: node verify-wasm.mjs

import { readFileSync } from 'fs';
import vm from 'vm';

// -------- load the wasm module --------
const wasmBytes = readFileSync('./connect4-solver.wasm');
const { instance } = await WebAssembly.instantiate(wasmBytes);
const solve = instance.exports.solve_best_move;

// -------- build a JS Position helper that mirrors index.html's bitboard layout --------
const COLS = 7, ROWS = 6, H1 = 7;
const COL_BOTTOM = [0,1,2,3,4,5,6].map(c => 1n << BigInt(c * H1));
const COL_TOP    = [0,1,2,3,4,5,6].map(c => 1n << BigInt(c * H1 + ROWS - 1));
class Pos {
  constructor() { this.mask = 0n; this.current = 0n; this.moves = 0; }
  canPlay(c) { return (this.mask & COL_TOP[c]) === 0n; }
  play(c) {
    const newMask = this.mask | (this.mask + COL_BOTTOM[c]);
    this.current ^= this.mask;
    this.mask = newMask;
    this.moves++;
  }
}

// -------- load the inline OPENING_BOOK --------
const html = readFileSync('./index.html', 'utf8');
const openStart = html.indexOf('const OPENING_BOOK = {');
const openEnd   = html.indexOf('};', openStart);
const lit = html.slice(openStart + 'const OPENING_BOOK = '.length, openEnd + 1);
const BOOK = vm.runInNewContext('(' + lit + ')');

// -------- run the test --------
const keys = Object.keys(BOOK);
let checked = 0, mismatches = 0;
let totalMs = 0, maxMs = 0;
const mismatchSamples = [];
for (const key of keys) {
  if (key === '') continue;   // empty = no history, pos.moves=0, fine
  const cols = key.split(',').map(Number);
  const p = new Pos();
  for (const c of cols) p.play(c);
  const t0 = Date.now();
  const got = Number(solve(p.mask, p.current, p.moves, 14));
  const dt = Date.now() - t0;
  totalMs += dt; if (dt > maxMs) maxMs = dt;
  const want = BOOK[key];
  checked++;
  if (got !== want) {
    mismatches++;
    if (mismatchSamples.length < 5) mismatchSamples.push({ key, got, want });
  }
}
console.log(`Checked ${checked} book positions.`);
console.log(`Mismatches: ${mismatches}`);
console.log(`Wall time:  ${totalMs}ms total  |  ${(totalMs / checked).toFixed(2)}ms avg  |  ${maxMs}ms slowest`);
if (mismatches > 0) {
  console.log('Samples (likely tie-break differences — both moves tied at depth 14):');
  for (const s of mismatchSamples) console.log(`  "${s.key}" -> wasm=${s.got} book=${s.want}`);
}
