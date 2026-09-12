import './vendor/cubejs/cube.js';
import './vendor/cubejs/solve.js';
import { applyAlgorithm, isSolved, normalizeCenters, parseAlgorithm, validateCube } from './cube-engine.js';

const Cube = globalThis.Cube;
let initialized = false;

// This synchronous work belongs in a worker. Keep its lookup tables for later solves.
export function initializeFullSolver() {
  if (initialized) return;
  Cube.initSolver();
  initialized = true;
}

export function solveFullCube(cube) {
  const validation = validateCube(cube);
  if (!validation.valid) throw new Error(validation.error);
  if (isSolved(cube)) return { algorithm: '', moves: 0, solved: true };
  initializeFullSolver();
  // Relabeling by center preserves the user's grip and commutes with every turn.
  const algorithm = Cube.fromString(normalizeCenters(cube).join('')).solve(22);
  if (typeof algorithm !== 'string' || !isSolved(applyAlgorithm(cube, algorithm))) {
    throw new Error('The solution could not be verified. Check the entered colors and try again.');
  }
  return { algorithm, moves: parseAlgorithm(algorithm).length, solved: false };
}
