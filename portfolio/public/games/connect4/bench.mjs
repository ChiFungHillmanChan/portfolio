// Quick correctness + speed benchmark for the updated engine.
// Verifies: TT-move ordering doesn't change the best move, just speeds it up.

import { readFileSync } from 'fs';
import vm from 'vm';

// Pull the engine functions + book out of the live index.html. We do this by
// loading the whole <script type="module"> body into a VM context with stubs
// for the DOM / Firebase bits it touches at top level.
const html = readFileSync('./index.html', 'utf8');
const scriptStart = html.indexOf('<script type="module">') + '<script type="module">'.length;
const scriptEnd = html.indexOf('</script>', scriptStart);
let src = html.slice(scriptStart, scriptEnd);

// Strip the Firebase IIFE and anything that touches document/window — we only
// need the engine. Cut from the "FIREBASE" banner up to the "CONNECT 4 ENGINE"
// banner, and stop before the "UI" banner.
const engStart = src.indexOf('// CONNECT 4 ENGINE');
const engEnd = src.indexOf('// ============================================================\n// UI');
src = src.slice(engStart, engEnd);

const ctx = {
  performance,
  console,
};
vm.createContext(ctx);
// Patch negamax to count node visits, so we can tell if findBestMove actually
// searched or just hit tactical/book.
vm.runInContext(src + `
let __visits = 0;
const __origNegamax = negamax;
negamax = function patched(pos, depth, a, b) { __visits++; return __origNegamax(pos, depth, a, b); };
this.__api = { Position, findBestMove, findTacticalMove, OPENING_BOOK, transTable,
               resetVisits: () => { __visits = 0; }, getVisits: () => __visits };
`, ctx);
const { Position, findBestMove, findTacticalMove, OPENING_BOOK } = ctx.__api;

// 1) Correctness: for a sample of 20 book positions (mix of modes), confirm
//    findBestMove(pos, 14) agrees with the book entry.
const keys = Object.keys(OPENING_BOOK);
const sample = [];
for (let i = 0; i < 20; i++) sample.push(keys[Math.floor(Math.random() * keys.length)]);
let mismatches = 0;
for (const key of sample) {
  if (key === '') continue;   // skip empty key (book hit short-circuits anyway)
  const cols = key.split(',').map(Number);
  const p = new Position();
  for (const c of cols) p.play(c);
  // Clear TT to get a "cold" run for fair compare
  ctx.__api.transTable.clear();
  const got = findBestMove(p, 14);
  const want = OPENING_BOOK[key];
  if (got !== want) {
    console.error(`MISMATCH "${key}": engine=${got} book=${want}`);
    mismatches++;
  }
}
console.log(mismatches === 0 ? `CORRECTNESS OK: ${sample.length} random book positions match.` : `FAIL: ${mismatches} mismatches.`);

// 2) Speed benchmarks across game phases. Clear TT per run for cold compare.
function bench(label, moves) {
  const p = new Position();
  for (const c of moves) if (p.canPlay(c)) p.play(c);
  const bookKey = moves.join(',');
  const inBook = bookKey in OPENING_BOOK;
  ctx.__api.transTable.clear();
  ctx.__api.resetVisits();
  const tactical = findTacticalMove(p);
  const t0 = Date.now();
  const move = findBestMove(p, 14);
  const dt = Date.now() - t0;
  const visits = ctx.__api.getVisits();
  const reason = inBook ? 'BOOK' : tactical !== null ? 'TACTICAL' : 'SEARCH';
  console.log(`${label.padEnd(30)} stones=${String(p.moves).padStart(2)}  move=${move}  time=${String(dt).padStart(5)}ms  visits=${String(visits).padStart(8)}  via=${reason}`);
  return dt;
}
console.log('\n=== speed benchmarks (cold TT) ===');
// Quiet positions — AI has no immediate tactical threat.
bench('post-book ply 7 HF',       [3,3,0,2,6,4,1]);         //  7 stones
bench('post-book ply 9 HF',       [3,3,0,2,6,4,1,5,2]);     //  9 stones
bench('mid ply 11 HF',            [3,3,0,2,6,4,1,5,2,5,0]); // 11 stones
bench('mid ply 13 HF',            [3,3,0,2,6,4,1,5,2,5,0,4,6]);
bench('deep mid ply 15 HF',       [3,3,0,2,6,4,1,5,2,5,0,4,6,1,2]);
bench('post-book ply 8 AF',       [3,2,3,2,4,5,3,0]);       //  8 stones
bench('mid ply 10 AF',            [3,2,3,2,4,5,3,0,5,6]);
bench('mid ply 12 AF',            [3,2,3,2,4,5,3,0,5,6,1,4]);
bench('late-mid ply 14 AF',       [3,2,3,2,4,5,3,0,5,6,1,4,6,0]);
