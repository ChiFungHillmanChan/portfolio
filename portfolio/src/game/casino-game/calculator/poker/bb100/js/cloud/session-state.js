// session-state.js — module-level holder for the currently-loaded session.
// upload.js populates this after parsing; cloud/bootstrap.js reads it when
// the user clicks "Save to cloud".

let _state = null;
const _listeners = new Set();

// `seriesBefore`/`seriesAfter` are the pre-computed cumulative charts from
// stats/compute.mjs (BigInt arrays). Captured here at compute time so the
// "Save to cloud" button can upload them too, letting future opens skip the
// 30-90s parse+equity+compute pipeline.
export function setCurrentSession({ hands, files, summary, seriesBefore, seriesAfter }) {
  _state = { hands, files, summary, seriesBefore, seriesAfter };
  for (const fn of _listeners) try { fn(_state); } catch {}
}

export function getCurrentSession() {
  return _state;
}

export function clearCurrentSession() {
  _state = null;
  for (const fn of _listeners) try { fn(null); } catch {}
}

export function onSessionChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
