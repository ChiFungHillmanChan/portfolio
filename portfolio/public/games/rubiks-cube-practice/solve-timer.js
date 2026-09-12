import { t } from './i18n.js';

const HOLD_MS = 550;
const DISPLAY_INTERVAL = 40;

export function formatSolveTime(milliseconds) {
  const centiseconds = Math.max(0, Math.floor(milliseconds / 10));
  const seconds = Math.floor(centiseconds / 100);
  const fraction = String(centiseconds % 100).padStart(2, '0');
  if (seconds < 60) return `${seconds}.${fraction}`;
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  if (minutes < 60) return `${minutes}:${remainder}.${fraction}`;
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${remainder}.${fraction}`;
}

// The clock has no rendering loop. A mounted view subscribes to input changes
// and reads the monotonic elapsed time only while it is visible and running.
export function createSolveTimer({
  now = () => performance.now(),
  setTimer = (callback, delay) => setTimeout(callback, delay),
  clearTimer = (id) => clearTimeout(id),
} = {}) {
  const contacts = new Map();
  const listeners = new Set();
  let phase = 'idle';
  let lastElapsed = 0;
  let startedAt = 0;
  let holdStartedAt = 0;
  let holdTimer = null;
  let hasResult = false;
  let latched = false;
  let destroyed = false;

  function pressed() {
    const sides = new Set(contacts.values());
    return { left: sides.has('left'), right: sides.has('right') };
  }
  function both() { const held = pressed(); return held.left && held.right; }
  function elapsed() { return phase === 'running' ? Math.max(0, now() - startedAt) : phase === 'ready' ? 0 : lastElapsed; }
  function snapshot() { return { phase, elapsed: elapsed(), pressed: pressed(), latched }; }
  function notify() { const state = snapshot(); listeners.forEach((listener) => listener(state)); }
  function clearHold() { if (holdTimer !== null) clearTimer(holdTimer); holdTimer = null; }
  function armIfDue() {
    if (phase !== 'holding' || !both() || now() - holdStartedAt < HOLD_MS) return;
    clearHold();
    phase = 'ready';
  }
  function cancel() {
    if (destroyed) return;
    clearHold();
    contacts.clear();
    latched = false;
    if (phase === 'holding' || phase === 'ready') phase = hasResult ? 'stopped' : 'idle';
    notify();
  }

  return {
    snapshot,
    press(side, contact = side) {
      if (destroyed || !['left', 'right'].includes(side) || contacts.has(contact)) return;
      contacts.set(contact, side);
      if (both() && phase === 'running') {
        lastElapsed = elapsed();
        hasResult = true;
        phase = 'stopped';
        latched = true;
      } else if (both() && !latched && (phase === 'idle' || phase === 'stopped')) {
        phase = 'holding';
        holdStartedAt = now();
        holdTimer = setTimer(() => { holdTimer = null; armIfDue(); notify(); }, HOLD_MS);
      }
      notify();
    },
    release(side, contact = side) {
      if (destroyed || contacts.get(contact) !== side) return;
      // A heavily loaded browser may deliver the release before the hold timer.
      armIfDue();
      contacts.delete(contact);
      if (phase === 'ready' && !both()) {
        phase = 'running';
        startedAt = now();
      } else if (phase === 'holding' && !both()) {
        clearHold();
        phase = hasResult ? 'stopped' : 'idle';
      }
      if (!contacts.size) latched = false;
      notify();
    },
    cancel,
    subscribe(listener) {
      if (destroyed) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      if (destroyed) return;
      cancel();
      if (phase === 'running') { lastElapsed = elapsed(); phase = 'stopped'; }
      listeners.clear();
      destroyed = true;
    },
  };
}

const handIcon = '<svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M9 17V9a2 2 0 0 1 4 0V6a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v3a2 2 0 0 1 4 0v11a8 8 0 0 1-8 8h-1a8 8 0 0 1-6-3L4 18a2 2 0 0 1 3-3l3 3M13 7v9m4-9v9m4-6v6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function timerView() {
  return `<section class="panel solve-timer" data-phase="idle" aria-label="${t('Two-hand timer')}">
    <div class="solve-timer-heading"><h1>${t('Two-hand timer')}</h1><span>${t('No saved times')}</span></div>
    <div class="solve-timer-readout"><span class="solve-timer-light" aria-hidden="true"></span><output data-timer-time role="timer" aria-live="off" aria-label="${t('Elapsed time')}">0.00</output><p data-timer-status role="status" aria-live="polite">${t('Hold both pads to get ready')}</p></div>
    <p class="solve-timer-instructions" id="solve-timer-instructions">${t('Hold both pads until green. Release to start. Touch both to stop.')}</p>
    <div class="solve-timer-pads">${[['left', 'Left hand', 'A'], ['right', 'Right hand', 'L']].map(([side, label, key]) => `<button type="button" class="solve-timer-pad" data-timer-pad="${side}" aria-pressed="false" aria-describedby="solve-timer-instructions">${handIcon}<span>${t(label)}</span><kbd>${key}</kbd></button>`).join('')}</div>
    <p class="solve-timer-restart">${t('Hold both again to reset and start another solve.')}</p>
    <p class="solve-timer-keyboard">${t('Desktop: hold A + L, then release to start.')}</p>
  </section>`;
}

function statusText(state) {
  if (state.phase === 'running') return t('Solving… touch both pads to stop');
  if (state.phase === 'ready') return t('Ready — release to start');
  if (state.phase === 'holding') return t('Keep holding both pads…');
  if (state.phase === 'stopped') return t('Stopped at {time}', { time: formatSolveTime(state.elapsed) });
  return t('Hold both pads to get ready');
}

export function mountSolveTimer(element, timer) {
  const document = element.ownerDocument;
  const view = document.defaultView;
  const output = element.querySelector('[data-timer-time]');
  const status = element.querySelector('[data-timer-status]');
  const pads = [...element.querySelectorAll('[data-timer-pad]')];
  const pointers = new Map();
  const keys = new Set();
  const cleanups = [];
  let tick = null;
  let destroyed = false;
  let pageHidden = false;

  function listen(target, type, callback, options) {
    target.addEventListener(type, callback, options);
    cleanups.push(() => target.removeEventListener(type, callback, options));
  }
  function stopTick() { if (tick !== null) view.clearTimeout(tick); tick = null; }
  function updateText(target, text) { if (target.textContent !== text) target.textContent = text; }
  function render() {
    if (destroyed) return;
    const state = timer.snapshot();
    if (element.dataset.phase !== state.phase) element.dataset.phase = state.phase;
    updateText(output, formatSolveTime(state.elapsed));
    updateText(status, statusText(state));
    for (const pad of pads) {
      const value = String(state.pressed[pad.dataset.timerPad]);
      if (pad.getAttribute('aria-pressed') !== value) pad.setAttribute('aria-pressed', value);
    }
    stopTick();
    if (state.phase === 'running' && !document.hidden && !pageHidden) {
      tick = view.setTimeout(() => { tick = null; render(); }, DISPLAY_INTERVAL);
    }
  }
  function clearContacts() { pointers.clear(); keys.clear(); timer.cancel(); }
  function blocked() { return document.hidden || pageHidden || !!element.closest('[inert]'); }
  function pointerDown(event) {
    if (blocked() || event.button !== 0 || pointers.has(event.pointerId)) return;
    event.preventDefault();
    const pad = event.currentTarget;
    const side = pad.dataset.timerPad;
    pointers.set(event.pointerId, side);
    try { pad.setPointerCapture(event.pointerId); } catch { /* Window listeners still release the contact. */ }
    timer.press(side, `pointer:${event.pointerId}`);
  }
  function pointerUp(event) {
    const side = pointers.get(event.pointerId);
    if (!side) return;
    event.preventDefault();
    if (blocked()) { clearContacts(); return; }
    pointers.delete(event.pointerId);
    timer.release(side, `pointer:${event.pointerId}`);
  }
  function pointerCancel(event) { if (pointers.has(event.pointerId)) clearContacts(); }
  function sideForKey(event) {
    const code = event.code || `Key${event.key?.toUpperCase()}`;
    return code === 'KeyA' ? 'left' : code === 'KeyL' ? 'right' : null;
  }
  function keyDown(event) {
    const side = sideForKey(event);
    if (!side || blocked() || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    if (event.target.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    if (keys.has(side)) return;
    event.preventDefault();
    keys.add(side);
    timer.press(side, `key:${side}`);
  }
  function keyUp(event) {
    const side = sideForKey(event);
    if (!keys.has(side)) return;
    event.preventDefault();
    if (blocked()) { clearContacts(); return; }
    keys.delete(side);
    timer.release(side, `key:${side}`);
  }
  for (const pad of pads) {
    listen(pad, 'pointerdown', pointerDown);
    listen(pad, 'lostpointercapture', pointerCancel);
    listen(pad, 'contextmenu', (event) => event.preventDefault());
  }
  listen(view, 'pointerup', pointerUp);
  listen(view, 'pointercancel', pointerCancel);
  listen(document, 'keydown', keyDown);
  listen(document, 'keyup', keyUp);
  listen(view, 'blur', clearContacts);
  listen(document, 'visibilitychange', () => { if (document.hidden) clearContacts(); render(); });
  listen(view, 'pagehide', () => { pageHidden = true; clearContacts(); stopTick(); });
  listen(view, 'pageshow', () => { pageHidden = false; render(); });
  const unsubscribe = timer.subscribe(render);
  render();

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      cleanups.forEach((cleanup) => cleanup());
      stopTick();
      clearContacts();
    },
  };
}
