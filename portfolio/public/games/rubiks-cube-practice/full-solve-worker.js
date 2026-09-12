import { initializeFullSolver, solveFullCube } from './full-solver.js';

self.onmessage = ({ data }) => {
  if (data?.type !== 'solve') return;
  try {
    self.postMessage({ type: 'result', id: data.id, result: solveFullCube(data.cube) });
  } catch (error) {
    self.postMessage({ type: 'error', id: data.id, error: error.message });
  }
};

try {
  initializeFullSolver();
  self.postMessage({ type: 'ready' });
} catch (error) {
  self.postMessage({ type: 'error', error: error.message });
}
