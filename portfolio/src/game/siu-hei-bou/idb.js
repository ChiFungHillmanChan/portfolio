// IndexedDB plumbing for the offline book. Deliberately dumb: this file knows how
// to put a record somewhere and get it back, and nothing whatsoever about sync,
// coalescing or conflicts — those live in outbox.js / project.js / sync.js, where
// they can be unit-tested without a database.
//
//   mirror  (keyPath uid)               a disposable wholesale copy of the server's
//                                       answer. Replaced, never merged into.
//   outbox  (keyPath seq, autoIncrement) the ordered log of local writes. The only
//                                       precious data on the device.
//   meta    (keyPath k)                 reserved for small per-book scalars. Created
//                                       in v1 on purpose: adding a store later costs
//                                       a version bump on every installed device.

const DB_NAME = 'shb';
const DB_VERSION = 1;

export const MIRROR = 'mirror';
export const OUTBOX = 'outbox';
export const META = 'meta';

const BY_UID = 'by_uid';

let dbPromise = null;

export function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(MIRROR)) db.createObjectStore(MIRROR, { keyPath: 'uid' });
        if (!db.objectStoreNames.contains(OUTBOX)) {
          const store = db.createObjectStore(OUTBOX, { keyPath: 'seq', autoIncrement: true });
          store.createIndex(BY_UID, 'uid');
        }
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'k' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('idb-blocked'));
    }).catch((err) => { dbPromise = null; throw err; });
  }
  return dbPromise;
}

// Resolve a single IDBRequest. Awaiting one of these inside a transaction is safe:
// it settles in the microtask that follows onsuccess, so the transaction has not
// yet reached its auto-commit checkpoint.
function req(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Resolves once the transaction has actually committed, not merely once the last
// request came back — a queued write that never reached disk is a lost grudge.
async function withStore(name, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, mode);
    let value;
    Promise.resolve(fn(tx.objectStore(name))).then((v) => { value = v; }, reject);
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getMirror(uid) {
  const row = await withStore(MIRROR, 'readonly', (store) => req(store.get(uid)));
  return row || null;
}

export function putMirror(mirror) {
  return withStore(MIRROR, 'readwrite', (store) => req(store.put(mirror)));
}

// Returns the assigned seq — the outbox's ordering, and the handle everything else
// uses to address an item.
export function enqueue(item) {
  return withStore(OUTBOX, 'readwrite', (store) => req(store.add(item)));
}

// Index reads come back in (uid, seq) order, so this is already the flush order.
export function listOutbox(uid) {
  return withStore(OUTBOX, 'readonly', (store) => req(store.index(BY_UID).getAll(uid)));
}

export function updateOutboxItem(seq, patch) {
  return withStore(OUTBOX, 'readwrite', async (store) => {
    const current = await req(store.get(seq));
    if (!current) return null;
    const next = { ...current, ...patch };
    await req(store.put(next));
    return next;
  });
}

export function removeOutboxItem(seq) {
  return withStore(OUTBOX, 'readwrite', (store) => req(store.delete(seq)));
}

// One transaction, so a coalescing rewrite can never half-apply. Items keep their
// existing seq (put honours the keyPath value), which is what preserves the order
// of the writes that survive the rewrite.
export function replaceOutbox(uid, items) {
  return withStore(OUTBOX, 'readwrite', async (store) => {
    const keys = await req(store.index(BY_UID).getAllKeys(uid));
    keys.forEach((key) => store.delete(key));
    items.forEach((item) => store.put({ ...item, uid }));
  });
}

// 登出 — the server's copy of the book leaves the device. The outbox deliberately
// does NOT: unsent writes are the user's own, and they flush when that same uid
// signs back in.
export function clearMirror(uid) {
  return withStore(MIRROR, 'readwrite', (store) => req(store.delete(uid)));
}

// 撕爛本簿. Only this uid's records go — another account signed in on the same
// device keeps its own book.
export async function clearAll(uid) {
  await clearMirror(uid);
  await withStore(OUTBOX, 'readwrite', async (store) => {
    const keys = await req(store.index(BY_UID).getAllKeys(uid));
    keys.forEach((key) => store.delete(key));
  });
  await withStore(META, 'readwrite', async (store) => {
    const keys = await req(store.getAllKeys());
    keys.filter((k) => typeof k === 'string' && k.startsWith(`${uid}:`)).forEach((k) => store.delete(k));
  });
}
