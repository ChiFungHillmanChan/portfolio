import { loadWithReload } from './lazyWithReload';

const memoryStorage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};
const settled = (promise) => Promise.race([
  promise.then(() => 'resolved', () => 'rejected'),
  new Promise((resolve) => setTimeout(() => resolve('pending'), 20)),
]);
const chunkError = Object.assign(new Error('Loading chunk 2 failed.'), { name: 'ChunkLoadError' });

test('passes a loaded page through without reloading', async () => {
  const reload = jest.fn();
  const page = { default: () => null };

  await expect(loadWithReload(() => Promise.resolve(page), { storage: memoryStorage(), reload, page: {} })).resolves.toBe(page);
  expect(reload).not.toHaveBeenCalled();
});

test('reloads once when a page script fails to load, and keeps showing the loading state', async () => {
  const reload = jest.fn();

  const result = loadWithReload(() => Promise.reject(chunkError), { storage: memoryStorage(), reload, now: () => 1000000, page: {} });

  await expect(settled(result)).resolves.toBe('pending');
  expect(reload).toHaveBeenCalledTimes(1);
});

test('does not reload again straight after a reload, so it cannot loop', async () => {
  const reload = jest.fn();
  const storage = memoryStorage();
  await settled(loadWithReload(() => Promise.reject(chunkError), { storage, reload, now: () => 1000000, page: {} }));

  await expect(loadWithReload(() => Promise.reject(chunkError), { storage, reload, now: () => 1005000, page: {} })).rejects.toBe(chunkError);
  expect(reload).toHaveBeenCalledTimes(1);
});

test('reloads again for a later, separate failure', async () => {
  const reload = jest.fn();
  const storage = memoryStorage();
  await settled(loadWithReload(() => Promise.reject(chunkError), { storage, reload, now: () => 1000000, page: {} }));
  await settled(loadWithReload(() => Promise.reject(chunkError), { storage, reload, now: () => 1000000 + 60000, page: {} }));

  expect(reload).toHaveBeenCalledTimes(2);
});

test('surfaces the error when the reload cannot be recorded', async () => {
  const reload = jest.fn();
  const storage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };

  await expect(loadWithReload(() => Promise.reject(chunkError), { storage, reload, page: {} })).rejects.toBe(chunkError);
  expect(reload).not.toHaveBeenCalled();
});

test('scripts that fail together cause one reload and none of them shows an error', async () => {
  const reload = jest.fn();
  const options = { storage: memoryStorage(), reload, now: () => 1000000, page: {} };

  const results = [1, 2, 3].map(() => loadWithReload(() => Promise.reject(chunkError), options));

  await expect(Promise.all(results.map(settled))).resolves.toEqual(['pending', 'pending', 'pending']);
  expect(reload).toHaveBeenCalledTimes(1);
});
