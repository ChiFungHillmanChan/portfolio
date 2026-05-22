// session-state.js — module-level holder for the currently-loaded session.
// upload.js populates this after parsing; cloud/bootstrap.js reads it when
// the user clicks "Save to cloud".

let _state = null;
const _listeners = new Set();

export function setCurrentSession({ hands, files, summary }) {
  _state = { hands, files, summary };
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
