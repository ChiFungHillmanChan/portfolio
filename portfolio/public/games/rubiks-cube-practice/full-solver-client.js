const TIMEOUT_MS = 45000;

function aborted() {
  return new DOMException('The cube calculation was cancelled.', 'AbortError');
}

export function createFullSolver({ onStatus = () => {} } = {}) {
  let worker = null;
  let initialized = false;
  let initialization = null;
  let resolveInitialization, rejectInitialization, initializationTimer;
  let active = null;
  let nextId = 0;
  let destroyed = false;

  function close(error) {
    worker?.terminate();
    worker = null;
    initialized = false;
    clearTimeout(initializationTimer);
    rejectInitialization?.(error);
    resolveInitialization = rejectInitialization = null;
    initialization = null;
    if (active) {
      clearTimeout(active.timer);
      active.reject(error);
      active = null;
    }
  }

  function timeout() {
    close(new Error('The cube calculation took too long. Please try again.'));
  }

  function warmup() {
    if (destroyed) return Promise.reject(aborted());
    if (initialization) return initialization;
    initialization = new Promise((resolve, reject) => {
      resolveInitialization = resolve;
      rejectInitialization = reject;
    });
    const pending = initialization;
    try {
      const current = new Worker(new URL('./full-solve-worker.js', import.meta.url), { type: 'module' });
      worker = current;
      initializationTimer = setTimeout(timeout, TIMEOUT_MS);
      onStatus('initializing');
      current.onmessage = ({ data }) => {
        if (worker !== current) return;
        if (data.type === 'ready') {
          initialized = true;
          clearTimeout(initializationTimer);
          const resolve = resolveInitialization;
          resolveInitialization = rejectInitialization = null;
          onStatus('ready');
          resolve?.();
        } else if (data.type === 'error' && data.id === undefined) {
          close(new Error(data.error || 'The cube solver could not start. Reload the page and try again.'));
        } else if (active && data.id === active.id && ['result', 'error'].includes(data.type)) {
          const job = active;
          active = null;
          clearTimeout(job.timer);
          onStatus('ready');
          if (data.type === 'error') job.reject(new Error(data.error));
          else job.resolve(data.result);
        }
      };
      current.onerror = (event) => {
        if (worker !== current) return;
        event.preventDefault?.();
        close(new Error('The cube solver could not start. Reload the page and try again.'));
      };
      current.onmessageerror = () => {
        if (worker === current) close(new Error('The cube solution could not be read. Please try again.'));
      };
    } catch {
      close(new Error('The cube solver could not start. Use a browser that supports Web Workers and try again.'));
    }
    return pending;
  }

  function solve(cube) {
    if (destroyed) return Promise.reject(aborted());
    if (active) close(aborted());
    const snapshot = Array.isArray(cube) ? [...cube] : cube;
    const ready = warmup();
    return new Promise((resolve, reject) => {
      const job = { id: ++nextId, resolve, reject, timer: setTimeout(timeout, TIMEOUT_MS) };
      active = job;
      ready.then(() => {
        if (active !== job) return;
        onStatus('solving');
        try { worker.postMessage({ type: 'solve', id: job.id, cube: snapshot }); }
        catch { close(new Error('The cube could not be sent to the solver. Please try again.')); }
      }, (error) => {
        if (active !== job) return;
        clearTimeout(job.timer);
        active = null;
        reject(error);
      });
    });
  }

  // An idle worker retains its tables. In-progress CPU work can only be cancelled
  // by terminating the worker; stale replies cannot affect a subsequent request.
  function cancel() {
    if (active || (worker && !initialized)) close(aborted());
  }

  function destroy() {
    destroyed = true;
    close(aborted());
  }

  return { warmup, solve, cancel, destroy };
}
