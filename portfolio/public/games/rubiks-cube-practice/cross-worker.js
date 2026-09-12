import { findCrossSolution } from './cube-engine.js';

self.onmessage = ({ data }) => {
  try {
    self.postMessage({ result: findCrossSolution(data) });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
