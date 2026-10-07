import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrameScheduler } from './frame-scheduler.mjs';

test('invalidations coalesce and idle stops; pause cancels pending frame', () => {
  let serial = 0; const queued = new Map(); let frames = 0; let animate = true;
  const scheduler = createFrameScheduler({ request: fn => {queued.set(++serial, fn);return serial;}, cancel: id => queued.delete(id), frame: () => {frames++;return animate;} });
  const tick = time => {const [id,fn] = queued.entries().next().value;queued.delete(id);fn(time);};
  scheduler.invalidate(); scheduler.invalidate(); assert.equal(queued.size,1);
  tick(0); assert.equal(queued.size,1);
  animate=false; tick(16); assert.equal(frames,2);assert.equal(queued.size,0);
  scheduler.invalidate();scheduler.setPaused(true);assert.equal(queued.size,0);
  scheduler.invalidate();assert.equal(queued.size,0);
  scheduler.setPaused(false);assert.equal(queued.size,1);
  scheduler.dispose();assert.equal(queued.size,0);scheduler.invalidate();assert.equal(queued.size,0);
});
