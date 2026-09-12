import { applyAlgorithm, invertAlgorithm, parseAlgorithm, solvedCube } from './cube-engine.js';

export const SPEEDS = Object.freeze([.25, .5, .75, 1, 1.25, 1.5, 2]);
const QUARTER_TURN_MS = 1000;
const HALF_TURN_MS = 1400;
const DWELL_MS = 450;

// Cube positions are computed only when the sequence changes. Animation frames
// describe one physical turn from a cached position; they never solve the cube.
export function createPlayback({
  onFrame = () => {},
  onChange = () => {},
  requestFrame = (callback) => globalThis.requestAnimationFrame(callback),
  cancelFrame = (id) => globalThis.cancelAnimationFrame(id),
  now = () => performance.now(),
  reducedMotion = false,
} = {}) {
  let moves = Object.freeze([]);
  let states = [Object.freeze(solvedCube())];
  let step = 0;
  let speed = .5;
  let active = null;
  let dwell = null;
  let mode = null;
  let running = false;
  let frameId = null;
  let lastTime = 0;
  let generation = 0;
  let destroyed = false;

  function snapshot() {
    return {
      step,
      total: moves.length,
      moves,
      cube: states[step],
      activeIndex: active?.index ?? null,
      move: active?.move ?? null,
      progress: active ? Math.min(1, active.elapsed / active.duration) : 0,
      playing: running && mode === 'play',
      animating: running && active !== null,
      speed,
      reducedMotion,
    };
  }

  function changed() { if (!destroyed) onChange(snapshot()); }
  function draw() {
    if (!destroyed) {
      const frame = snapshot();
      onFrame(reducedMotion ? { ...frame, move: null } : frame);
    }
  }

  function cancelScheduled() {
    generation += 1;
    if (frameId !== null) cancelFrame(frameId);
    frameId = null;
  }

  function schedule() {
    if (!running || destroyed || frameId !== null) return;
    const currentGeneration = generation;
    frameId = requestFrame(() => {
      if (destroyed || currentGeneration !== generation) return;
      frameId = null;
      advanceTo(now());
      schedule();
    });
  }

  function begin(direction = 1) {
    const index = direction === 1 ? step : step - 1;
    if (index < 0 || index >= moves.length) return false;
    const move = direction === 1 ? moves[index] : invertAlgorithm(moves[index]);
    active = {
      index, move, destination: step + direction, elapsed: 0,
      duration: move.includes('2') ? HALF_TURN_MS : QUARTER_TURN_MS,
    };
    dwell = null;
    draw();
    changed();
    return true;
  }

  function advanceTo(time) {
    if (!running) return;
    const elapsed = Math.max(0, time - lastTime) * speed;
    lastTime = time;
    if (!elapsed) return;
    if (active) {
      active.elapsed = Math.min(active.duration, active.elapsed + elapsed);
      if (active.elapsed + 1e-6 < active.duration) {
        if (!reducedMotion) draw();
        return;
      }
      step = active.destination;
      active = null;
      if (mode === 'play' && step < moves.length) dwell = 0;
      else {
        running = false;
        mode = null;
        dwell = null;
        cancelScheduled();
      }
      draw();
      changed();
    } else if (dwell !== null) {
      dwell += elapsed;
      if (dwell + 1e-6 >= DWELL_MS) begin();
    }
    // Discard time beyond a phase boundary so a delayed frame cannot skip moves
    // or erase the readable pause between them.
  }

  function setSequence(cube, algorithm = '') {
    if (destroyed) return;
    const nextMoves = Object.freeze(parseAlgorithm(algorithm));
    const nextStates = [Object.freeze(applyAlgorithm(cube, ''))];
    for (const move of nextMoves) {
      nextStates.push(Object.freeze(applyAlgorithm(nextStates.at(-1), move)));
    }
    cancelScheduled();
    moves = nextMoves;
    states = nextStates;
    step = 0;
    active = null;
    dwell = null;
    mode = null;
    running = false;
    draw();
    changed();
  }

  function play() {
    if (destroyed || !moves.length || (running && mode === 'play')) return;
    if (running) advanceTo(now());
    if (!active && dwell === null && step === moves.length) step = 0;
    mode = 'play';
    running = true;
    lastTime = now();
    if (!active && dwell === null) begin();
    else { draw(); changed(); }
    schedule();
  }

  function pause() {
    if (destroyed || !running) return;
    advanceTo(now());
    running = false;
    cancelScheduled();
    changed();
  }

  function stop() {
    if (destroyed) return;
    cancelScheduled();
    running = false;
    mode = null;
    active = null;
    dwell = null;
    draw();
    changed();
  }

  function seek(nextStep) {
    if (destroyed || !Number.isFinite(Number(nextStep))) return;
    cancelScheduled();
    running = false;
    mode = null;
    active = null;
    dwell = null;
    step = Math.max(0, Math.min(moves.length, Math.trunc(Number(nextStep))));
    draw();
    changed();
  }

  function single(direction) {
    if (destroyed) return;
    cancelScheduled();
    active = null;
    dwell = null;
    mode = 'single';
    running = true;
    lastTime = now();
    if (!begin(direction)) {
      running = false;
      mode = null;
      draw();
      changed();
    }
    schedule();
  }

  function setSpeed(multiplier) {
    if (destroyed || !SPEEDS.includes(multiplier) || multiplier === speed) return;
    advanceTo(now());
    speed = multiplier;
    changed();
  }

  function setReducedMotion(value) {
    if (destroyed || Boolean(value) === reducedMotion) return;
    advanceTo(now());
    reducedMotion = Boolean(value);
    draw();
    changed();
  }

  function destroy() {
    cancelScheduled();
    running = false;
    destroyed = true;
  }

  return {
    setSequence, play, pause, stop, destroy, seek, setSpeed, setReducedMotion, snapshot,
    next: () => single(1),
    previous: () => single(-1),
  };
}
