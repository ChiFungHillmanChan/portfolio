import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

let createFullSolver;
try {
  const url = new URL('./full-solver-client.js', import.meta.url);
  const source = (await readFile(url, 'utf8')).replaceAll('import.meta.url', JSON.stringify(url.href));
  ({ createFullSolver } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`));
} catch (error) { if (error.code !== 'ENOENT') throw error; }

// Only the browser boundary is controlled here. The actual worker and cube search
// run separately in full-solve-worker.test.mjs and full-solver.test.mjs.
class ControlledWorker {
  static instances = [];
  constructor() { this.messages = []; this.terminated = false; ControlledWorker.instances.push(this); }
  postMessage(message) { this.messages.push(message); }
  terminate() { this.terminated = true; }
  emit(data) { this.onmessage?.({ data }); }
}

function environment(t) {
  const original = globalThis.Worker;
  globalThis.Worker = ControlledWorker;
  ControlledWorker.instances = [];
  t.after(() => { globalThis.Worker = original; });
  const statuses = [];
  const client = createFullSolver({ onStatus: status => statuses.push(status) });
  t.after(() => client.destroy());
  return { client, statuses, worker: () => ControlledWorker.instances.at(-1) };
}

test('full solver exposes a browser worker client', () => {
  assert.equal(typeof createFullSolver, 'function');
});

test('warmup shares initialization and idle cancellation preserves prepared tables', async t => {
  const { client, statuses, worker } = environment(t);
  const first = client.warmup();
  const second = client.warmup();
  worker().emit({ type: 'ready' });
  await Promise.all([first, second]);
  const prepared = worker();
  client.cancel();
  await client.warmup();
  assert.equal(worker(), prepared);
  assert.equal(prepared.terminated, false);
  assert.deepEqual(statuses, ['initializing', 'ready']);
});

test('solve waits for initialization and resolves only its matching result', async t => {
  const { client, statuses, worker } = environment(t);
  const cube = Array(54).fill('U');
  const promise = client.solve(cube);
  assert.equal(worker().messages.length, 0);
  worker().emit({ type: 'ready' });
  await Promise.resolve();
  const message = worker().messages.at(-1);
  assert.equal(message.type, 'solve');
  assert.deepEqual(message.cube, cube);
  worker().emit({ type: 'result', id: message.id - 1, result: { algorithm: 'wrong' } });
  const result = { algorithm: "U'", moves: 1, solved: false };
  worker().emit({ type: 'result', id: message.id, result });
  assert.deepEqual(await promise, result);
  assert.deepEqual(statuses, ['initializing', 'ready', 'solving', 'ready']);
});

test('cancelling initialization rejects warmup and permits a fresh solve', async t => {
  const { client, worker } = environment(t);
  const warming = client.warmup();
  const rejected = assert.rejects(warming, { name: 'AbortError' });
  const oldWorker = worker();
  client.cancel();
  await rejected;
  assert.equal(oldWorker.terminated, true);
  const promise = client.solve([]);
  const fresh = worker();
  assert.notEqual(fresh, oldWorker);
  oldWorker.emit({ type: 'ready' });
  fresh.emit({ type: 'ready' });
  await Promise.resolve();
  const message = fresh.messages.at(-1);
  fresh.emit({ type: 'result', id: message.id, result: { algorithm: '', moves: 0, solved: true } });
  assert.equal((await promise).solved, true);
});

test('cancelling an active search rejects it and ignores late results', async t => {
  const { client, worker } = environment(t);
  const pending = client.solve([]);
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  worker().emit({ type: 'ready' });
  await Promise.resolve();
  const oldWorker = worker();
  const { id } = oldWorker.messages.at(-1);
  client.cancel();
  oldWorker.emit({ type: 'result', id, result: { algorithm: 'stale' } });
  await rejected;
  assert.equal(oldWorker.terminated, true);
});

test('worker errors reach the caller and the next attempt can restart', async t => {
  const { client, worker } = environment(t);
  const pending = client.solve([]);
  const rejected = assert.rejects(pending, /could not start|load|worker/i);
  worker().onerror?.({ preventDefault() {} });
  await rejected;
  const restarted = client.warmup();
  worker().emit({ type: 'ready' });
  await restarted;
});

test('a hung worker times out and is terminated, including table initialization', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, worker } = environment(t);
  const pending = client.solve([]);
  const rejected = assert.rejects(pending, /too long|timed out/i);
  t.mock.timers.tick(45001);
  await rejected;
  assert.equal(worker().terminated, true);
});

test('destroy aborts active work and prevents reopening the disposed client', async t => {
  const { client } = environment(t);
  const pending = client.warmup();
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  client.destroy();
  await rejected;
  await assert.rejects(client.warmup(), { name: 'AbortError' });
  await assert.rejects(client.solve([]), { name: 'AbortError' });
});
