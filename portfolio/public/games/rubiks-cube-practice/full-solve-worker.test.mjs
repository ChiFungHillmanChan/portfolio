import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Worker as NodeWorker } from 'node:worker_threads';

const moduleUrls = new Map();
async function browserModule(path) {
  if (moduleUrls.has(path)) return moduleUrls.get(path);
  const file = new URL(path, import.meta.url);
  let source = await readFile(file, 'utf8');
  const relativeImports = [...source.matchAll(/^import .*?['"]([^'"]+)['"];$/gm)];
  for (const [, dependency] of relativeImports) {
    const relative = new URL(dependency, file).pathname;
    source = source.replaceAll(`'${dependency}'`, `'${await browserModule(relative)}'`);
  }
  source = source.replaceAll('import.meta.url', JSON.stringify(file.href));
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  moduleUrls.set(path, url);
  return url;
}

const engine = await import(await browserModule('./cube-engine.js'));
const { createFullSolver } = await import(await browserModule('./full-solver-client.js'));
let workerUrl;
try { workerUrl = await browserModule('./full-solve-worker.js'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }

test('a browser module worker prepares tables and solves through the real client', async t => {
  assert.equal(typeof workerUrl, 'string', 'The full cube worker must exist.');
  const original = globalThis.Worker;
  const threads = [];
  globalThis.Worker = class BrowserWorker {
    constructor(url, options) {
      assert.match(url.pathname, /full-solve-worker\.js$/);
      assert.equal(options.type, 'module');
      const source = `import { parentPort } from 'node:worker_threads';
        globalThis.self = { postMessage: data => parentPort.postMessage(data) };
        parentPort.on('message', data => self.onmessage({ data }));
        await import(${JSON.stringify(workerUrl)});`;
      this.thread = new NodeWorker(new URL(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`));
      threads.push(this.thread);
      this.thread.on('message', data => this.onmessage?.({ data }));
      this.thread.on('error', error => this.onerror?.(error));
    }
    postMessage(data) { this.thread.postMessage(data); }
    terminate() { return this.thread.terminate(); }
  };
  const statuses = [];
  const client = createFullSolver({ onStatus: status => statuses.push(status) });
  t.after(async () => {
    client.destroy();
    globalThis.Worker = original;
    await Promise.all(threads.map(thread => thread.terminate()));
  });
  await client.warmup();
  const input = engine.applyAlgorithm(engine.solvedCube(), "R U2 F' L D B2 R2 U' F2 D2 L' B R U F D' R' B' U2 L2 F' D y");
  const result = await client.solve(input);
  assert.equal(engine.isSolved(engine.applyAlgorithm(input, result.algorithm)), true);
  await assert.rejects(client.solve(['U']), /54 stickers/i);
  client.cancel();
  assert.deepEqual(await client.solve(engine.solvedCube()), { algorithm: '', moves: 0, solved: true });
  assert.equal(threads.length, 1, 'Recoverable input errors should preserve prepared tables.');
  assert.equal(statuses[0], 'initializing');
  assert.equal(statuses.at(-1), 'ready');
});
