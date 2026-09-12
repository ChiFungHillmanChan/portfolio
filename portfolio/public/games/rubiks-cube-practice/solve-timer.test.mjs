import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createSolveTimer, formatSolveTime, mountSolveTimer, timerView } from './solve-timer.js';

function clock() {
  let time = 0;
  let id = 0;
  const pending = new Map();
  const options = {
    now: () => time,
    setTimer: (callback, delay) => { pending.set(++id, { callback, at: time + delay }); return id; },
    clearTimer: (timer) => pending.delete(timer),
  };
  return {
    ...options, pending,
    advance(ms) {
      time += ms;
      for (const [timer, task] of [...pending]) {
        if (task.at > time || !pending.has(timer)) continue;
        pending.delete(timer);
        task.callback();
      }
    },
  };
}

function harness() {
  const time = clock();
  const timer = createSolveTimer(time);
  return { ...time, timer, both() { timer.press('left'); timer.press('right'); },
    start() { this.both(); time.advance(550); timer.release('left'); timer.release('right'); } };
}

test('both pads must remain held for 550 ms before release starts the clock', () => {
  const h = harness();
  h.timer.press('left');
  h.advance(1000);
  assert.equal(h.timer.snapshot().phase, 'idle');
  h.timer.press('right');
  h.advance(549);
  assert.equal(h.timer.snapshot().phase, 'holding');
  h.advance(1);
  assert.equal(h.timer.snapshot().phase, 'ready');
  h.timer.release('left');
  assert.equal(h.timer.snapshot().phase, 'running');
  h.advance(1234);
  assert.equal(h.timer.snapshot().elapsed, 1234);
  assert.equal(h.pending.size, 0, 'The model never schedules running or idle redraws');
});

test('an early release cancels arming and cannot start after the old deadline', () => {
  const h = harness();
  h.both();
  h.advance(549);
  h.timer.release('right');
  h.advance(1000);
  assert.equal(h.timer.snapshot().phase, 'idle');
  assert.equal(h.timer.snapshot().elapsed, 0);
  assert.equal(h.pending.size, 0);
});

test('stopping requires both pads and latches the result until both have released', () => {
  const h = harness();
  h.start();
  h.advance(2000);
  h.timer.press('left');
  assert.equal(h.timer.snapshot().phase, 'running');
  h.advance(345);
  h.timer.press('right');
  assert.equal(h.timer.snapshot().elapsed, 2345);
  assert.equal(h.timer.snapshot().phase, 'stopped');
  h.advance(9000);
  assert.equal(h.timer.snapshot().elapsed, 2345);
  h.timer.release('left');
  h.timer.press('left');
  h.advance(1000);
  assert.equal(h.timer.snapshot().phase, 'stopped', 'One released hand cannot reset the result');
  h.timer.release('left');
  h.timer.release('right');
  h.both();
  h.advance(549);
  assert.equal(h.timer.snapshot().elapsed, 2345);
  h.advance(1);
  assert.equal(h.timer.snapshot().phase, 'ready');
  assert.equal(h.timer.snapshot().elapsed, 0);
  h.timer.release('right');
  h.advance(800);
  assert.equal(h.timer.snapshot().elapsed, 800);
});

test('canceling a ready hold restores the last result instead of starting a solve', () => {
  const h = harness();
  h.start();
  h.advance(4567);
  h.both();
  h.timer.release('left');
  h.timer.release('right');
  h.both();
  h.advance(550);
  assert.equal(h.timer.snapshot().elapsed, 0);
  h.timer.cancel();
  assert.equal(h.timer.snapshot().phase, 'stopped');
  assert.equal(h.timer.snapshot().elapsed, 4567);
  assert.deepEqual(h.timer.snapshot().pressed, { left: false, right: false });
});

test('canceling held contacts while running keeps monotonic elapsed time', () => {
  const h = harness();
  h.start();
  h.timer.press('left');
  h.timer.cancel();
  h.advance(60000);
  assert.equal(h.timer.snapshot().phase, 'running');
  assert.equal(h.timer.snapshot().elapsed, 60000);
  assert.deepEqual(h.timer.snapshot().pressed, { left: false, right: false });
});

test('each physical contact belongs to one pad and repeated presses cannot arm alone', () => {
  const h = harness();
  h.timer.press('left', 'touch:1');
  h.timer.press('left', 'touch:1');
  h.timer.press('right', 'touch:1');
  h.advance(1000);
  assert.equal(h.timer.snapshot().phase, 'idle');
  h.timer.press('right', 'touch:2');
  h.timer.press('right', 'key:L');
  h.advance(550);
  h.timer.release('right', 'touch:2');
  assert.equal(h.timer.snapshot().phase, 'ready', 'A pad with another contact is still held');
  h.timer.release('right', 'key:L');
  assert.equal(h.timer.snapshot().phase, 'running');
});

test('a delayed browser hold callback does not prevent a properly held release', () => {
  let time = 0;
  const timer = createSolveTimer({ now: () => time, setTimer: () => 1, clearTimer() {} });
  timer.press('left'); timer.press('right');
  time = 600;
  timer.release('left');
  assert.equal(timer.snapshot().phase, 'running');
  time = 800;
  assert.equal(timer.snapshot().elapsed, 200);
});

test('destroy cancels arming and blocks further input', () => {
  const h = harness();
  h.both();
  h.timer.destroy();
  h.advance(1000);
  h.timer.press('left'); h.timer.press('right');
  assert.equal(h.pending.size, 0);
  assert.equal(h.timer.snapshot().phase, 'idle');
});

test('time formatting preserves centiseconds and expands naturally through hours', () => {
  assert.equal(formatSolveTime(0), '0.00');
  assert.equal(formatSolveTime(59999), '59.99');
  assert.equal(formatSolveTime(60000), '1:00.00');
  assert.equal(formatSolveTime(3661234), '1:01:01.23');
});

function browser(t) {
  const h = harness();
  const dom = new JSDOM(`<div id="timer">${timerView()}</div>`, { pretendToBeVisual: true });
  const { window } = dom;
  const { document } = window;
  let hidden = false;
  Object.defineProperty(document, 'hidden', { get: () => hidden });
  window.setTimeout = h.setTimer;
  window.clearTimeout = h.clearTimer;
  const element = document.querySelector('.solve-timer');
  let mount = mountSolveTimer(element, h.timer);
  t.after(() => { mount.destroy(); h.timer.destroy(); window.close(); });
  return {
    ...h, window, document, element,
    pad(side) { return element.querySelector(`[data-timer-pad="${side}"]`); },
    pointer(side, type, id) {
      const event = new window.Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, { pointerId: id, pointerType: 'touch', button: 0 });
      this.pad(side).dispatchEvent(event);
    },
    key(type, key, options = {}, target = document) {
      const event = new window.KeyboardEvent(type, { key, code: `Key${key.toUpperCase()}`, bubbles: true, cancelable: true, ...options });
      target.dispatchEvent(event);
    },
    hide(value) { hidden = value; document.dispatchEvent(new window.Event('visibilitychange')); },
    unmount() { mount.destroy(); },
    remount() { const template = document.createElement('template'); template.innerHTML = timerView(); element.innerHTML = template.content.querySelector('.solve-timer').innerHTML; mount = mountSolveTimer(element, h.timer); },
  };
}

test('the mounted timer supports independent touch contacts and renders a live result', (t) => {
  const h = browser(t);
  h.pointer('left', 'pointerdown', 1);
  h.pointer('right', 'pointerdown', 2);
  h.advance(550);
  assert.equal(h.element.dataset.phase, 'ready');
  h.pointer('left', 'pointerup', 1);
  h.pointer('right', 'pointerup', 2);
  h.advance(1234);
  assert.equal(h.element.querySelector('[data-timer-time]').textContent, '1.23');
  h.pointer('left', 'pointerdown', 3);
  h.pointer('right', 'pointerdown', 4);
  assert.equal(h.element.dataset.phase, 'stopped');
  assert.match(h.element.querySelector('[data-timer-status]').textContent, /1\.23/);
  assert.equal(h.pending.size, 0);
});

test('pointer cancellation and unexpected lost capture never start the timer', (t) => {
  const h = browser(t);
  for (const type of ['pointercancel', 'lostpointercapture']) {
    h.pointer('left', 'pointerdown', 1);
    h.pointer('right', 'pointerdown', 2);
    h.advance(550);
    h.pointer('left', type, 1);
    h.pointer('right', 'pointerup', 2);
    assert.equal(h.timer.snapshot().phase, 'idle');
    assert.equal(h.pending.size, 0);
  }
});

test('one pointer cannot press both rendered pads', (t) => {
  const h = browser(t);
  h.pointer('left', 'pointerdown', 1);
  h.pointer('right', 'pointerdown', 1);
  h.advance(700);
  assert.equal(h.timer.snapshot().phase, 'idle');
  assert.equal(h.pad('left').getAttribute('aria-pressed'), 'true');
  assert.equal(h.pad('right').getAttribute('aria-pressed'), 'false');
  h.pointer('right', 'pointerup', 1);
  assert.deepEqual(h.timer.snapshot().pressed, { left: false, right: false });
});

test('A and L hold/release works and ignores repeated, modified, or typing events', (t) => {
  const h = browser(t);
  const input = h.document.createElement('input'); h.element.append(input);
  h.key('keydown', 'a', {}, input);
  h.key('keydown', 'a', { metaKey: true });
  h.key('keydown', 'a', { repeat: true });
  h.key('keydown', 'l');
  h.advance(550);
  assert.equal(h.timer.snapshot().phase, 'idle');
  h.key('keydown', 'a');
  h.advance(550);
  h.key('keyup', 'a'); h.key('keyup', 'l');
  assert.equal(h.timer.snapshot().phase, 'running');
  h.advance(250);
  h.key('keydown', 'a'); h.key('keydown', 'l');
  assert.equal(h.timer.snapshot().elapsed, 250);
  assert.equal(h.timer.snapshot().phase, 'stopped');
});

test('a navigation modal makes the timer inert and cannot start a held solve behind it', (t) => {
  const h = browser(t);
  h.key('keydown', 'a'); h.key('keydown', 'l');
  h.advance(550);
  h.element.parentElement.setAttribute('inert', '');
  h.key('keyup', 'a'); h.key('keyup', 'l');
  assert.equal(h.timer.snapshot().phase, 'idle');
  h.key('keydown', 'a'); h.key('keydown', 'l');
  h.pointer('left', 'pointerdown', 1); h.pointer('right', 'pointerdown', 2);
  h.advance(1000);
  assert.deepEqual(h.timer.snapshot().pressed, { left: false, right: false });
  assert.equal(h.pending.size, 0);
});

test('hidden timers stop drawing but include hidden time when visible again', (t) => {
  const h = browser(t);
  h.start();
  h.advance(500);
  h.hide(true);
  const before = h.element.querySelector('[data-timer-time]').textContent;
  assert.equal(h.pending.size, 0);
  h.advance(12000);
  assert.equal(h.element.querySelector('[data-timer-time]').textContent, before);
  h.hide(false);
  assert.equal(h.element.querySelector('[data-timer-time]').textContent, '12.50');
  assert.equal(h.pending.size, 1);
});

test('hiding or blurring the window cancels an armed hold without starting', (t) => {
  const h = browser(t);
  for (const cancel of [() => h.hide(true), () => h.window.dispatchEvent(new h.window.Event('blur'))]) {
    h.hide(false);
    h.key('keydown', 'a'); h.key('keydown', 'l');
    h.advance(550);
    assert.equal(h.timer.snapshot().phase, 'ready');
    cancel();
    h.key('keyup', 'a'); h.key('keyup', 'l');
    assert.equal(h.timer.snapshot().phase, 'idle');
    assert.equal(h.pending.size, 0);
  }
});

test('unmount preserves elapsed time and remount resumes without stale held contacts', (t) => {
  const h = browser(t);
  h.start();
  h.advance(1000);
  h.unmount();
  assert.equal(h.pending.size, 0);
  h.advance(2000);
  h.remount();
  assert.equal(h.element.querySelector('[data-timer-time]').textContent, '3.00');
  h.timer.press('left'); h.timer.press('right');
  h.timer.release('left'); h.timer.release('right');
  h.timer.press('left'); h.timer.press('right');
  h.advance(550);
  h.unmount();
  h.timer.release('left');
  assert.equal(h.timer.snapshot().phase, 'stopped');
  assert.equal(h.timer.snapshot().elapsed, 3000);
});

test('unmount removes input handlers and all idle scheduling', (t) => {
  const h = browser(t);
  h.unmount();
  h.key('keydown', 'a'); h.key('keydown', 'l');
  h.pointer('left', 'pointerdown', 1); h.pointer('right', 'pointerdown', 2);
  h.advance(1000);
  assert.equal(h.timer.snapshot().phase, 'idle');
  assert.deepEqual(h.timer.snapshot().pressed, { left: false, right: false });
  assert.equal(h.pending.size, 0);
});
