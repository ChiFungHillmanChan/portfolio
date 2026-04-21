// Web Worker host for the Connect 4 wasm engine.
//
// Motivation: the perfect solver's cold-start bisection can run for several
// seconds. On the main thread that blocks every microtask — animations
// freeze, clicks queue up, and Chrome eventually pops a "Page Unresponsive"
// dialog. Running the wasm here keeps the main thread's event loop free so
// the status-pill pulse + stage-swap animations keep running while the AI
// thinks.
//
// Message protocol (all BigInt fields serialise fine via structured clone):
//
//   main -> worker   { id, op: 'perfect',      mask, current, moves }
//                    { id, op: 'depth-limited', mask, current, moves, maxDepth }
//                    { id, op: 'reset-tt' }
//   worker -> main   { type: 'ready' }                      (once, after wasm load)
//                    { id, col }                            (solve result)
//                    { id, error }                          (solve threw)
//                    { type: 'error', error }               (wasm load failed)

let solvePerfect = null;
let solveBestMove = null;
let resetPerfectTt = null;

// Messages that arrive before the wasm is ready sit here and run once it is.
const pending = [];

function handle(msg) {
  const { id, op } = msg;
  try {
    if (op === 'perfect') {
      const col = Number(solvePerfect(msg.mask, msg.current, msg.moves));
      self.postMessage({ id, col });
    } else if (op === 'depth-limited') {
      const col = Number(solveBestMove(msg.mask, msg.current, msg.moves, msg.maxDepth | 0));
      self.postMessage({ id, col });
    } else if (op === 'reset-tt') {
      if (resetPerfectTt) resetPerfectTt();
      self.postMessage({ id, col: -1 });
    } else {
      self.postMessage({ id, error: 'unknown op: ' + op });
    }
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
}

self.onmessage = (e) => {
  if (!solvePerfect) { pending.push(e.data); return; }
  handle(e.data);
};

(async () => {
  try {
    const resp = await fetch('./connect4-solver.wasm');
    if (!resp.ok) throw new Error('wasm fetch failed: ' + resp.status);
    const bytes = await resp.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes);
    solvePerfect    = instance.exports.solve_perfect;
    solveBestMove   = instance.exports.solve_best_move;
    resetPerfectTt  = instance.exports.reset_perfect_tt;
    if (!solvePerfect || !solveBestMove) {
      throw new Error('wasm missing expected exports');
    }
    self.postMessage({ type: 'ready' });
    while (pending.length) handle(pending.shift());
  } catch (err) {
    self.postMessage({ type: 'error', error: String(err && err.message || err) });
  }
})();
