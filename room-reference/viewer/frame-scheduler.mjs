/** One demand-driven clock for camera, furniture, controls and rendering. */
export function createFrameScheduler({ frame, request = requestAnimationFrame, cancel = cancelAnimationFrame }) {
  let pending = null, previous = null, paused = false, disposed = false;
  function invalidate() {
    if (!paused && !disposed && pending === null) pending = request(tick);
  }
  function tick(time) {
    pending = null;
    const dt = previous === null ? 1 / 60 : Math.min(.05, Math.max(0, (time - previous) / 1000));
    previous = time;
    if (frame(dt, time)) invalidate();
    else previous = null;
  }
  return {
    invalidate,
    setPaused(value) {
      paused = value; previous = null;
      if (paused && pending !== null) {cancel(pending);pending = null;}
      if (!paused) invalidate();
    },
    dispose() {disposed = true;if (pending !== null) cancel(pending);pending = null;},
    get pending() {return pending !== null;},
  };
}
