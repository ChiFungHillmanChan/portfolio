// Apples-to-apples bench: wasm vs JS on the same non-book non-tactical
// positions used in bench.mjs. Instantiates fresh wasm per position so TT
// state doesn't leak between positions.

import { readFileSync } from 'fs';

const wasmBytes = readFileSync('./connect4-solver.wasm');

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

async function bench(label, moves) {
  const p = new Pos();
  for (const c of moves) if (p.canPlay(c)) p.play(c);
  // Fresh wasm instance per bench — isolates TT state.
  const { instance } = await WebAssembly.instantiate(wasmBytes);
  const solve = instance.exports.solve_best_move;
  // Warm up once so V8 JITs the boundary call.
  solve(p.mask, p.current, p.moves, 14);
  const N = 5;
  const t0 = Date.now();
  let move;
  for (let i = 0; i < N; i++) {
    const { instance: fresh } = await WebAssembly.instantiate(wasmBytes);
    move = Number(fresh.exports.solve_best_move(p.mask, p.current, p.moves, 14));
  }
  const dt = (Date.now() - t0) / N;
  console.log(`${label.padEnd(30)} stones=${String(p.moves).padStart(2)}  move=${move}  avg=${dt.toFixed(1)}ms (${N} fresh instances)`);
}

console.log('\n=== wasm speed on non-book non-tactical positions ===');
await bench('post-book ply 7 HF',       [3,3,0,2,6,4,1]);
await bench('post-book ply 9 HF',       [3,3,0,2,6,4,1,5,2]);
await bench('mid ply 11 HF',            [3,3,0,2,6,4,1,5,2,5,0]);
await bench('mid ply 13 HF',            [3,3,0,2,6,4,1,5,2,5,0,4,6]);
await bench('deep mid ply 15 HF',       [3,3,0,2,6,4,1,5,2,5,0,4,6,1,2]);
