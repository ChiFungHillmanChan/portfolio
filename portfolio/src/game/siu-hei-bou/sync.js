// The only impure part of the offline engine: it moves queued writes to the Worker
// and the Worker's answer into the mirror. Every decision it makes is delegated to
// outbox.js, so what is left here is ordering, id resolution and plumbing.
//
// The bearer token is not a parameter — api.js already holds it via setTokenGetter,
// wired once in SiuHeiBouGame.jsx. `uid` is passed so a queued write can never be
// sent under a different account's token.

import { api, ApiError } from './api';
import { classify, poison, coalesce, backoffMs } from './outbox';
import {
  getMirror, putMirror, enqueue, listOutbox, updateOutboxItem,
  removeOutboxItem, replaceOutbox, clearAll, clearMirror as idbClearMirror,
} from './idb';

/* ---- local change notifications ---- */

const listeners = new Set();

// Called after anything that changes what the book should render. The React layer
// re-reads with readState() and re-projects; nothing is pushed to it, so there is
// no second copy of the truth to drift.
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => { try { fn(); } catch { /* a bad listener is not a lost write */ } });
}

/* ---- queueing ---- */

// v4 UUID — the shape siu-hei-bou-api/src/logic.mjs validates. crypto.randomUUID is
// Safari 15.4+, so older iOS falls back to getRandomValues, and an environment with
// no WebCrypto at all falls back to Math.random rather than refusing to write: a
// client_id is a dedup key, unique-per-uid in SQL and never a secret.
function newClientId() {
  // window, not globalThis: CRA's eslint env has no globalThis, so referencing it
  // fails the build with no-undef even behind a typeof guard. This module is
  // browser-only anyway — startAutoSync already binds window/document listeners.
  const webcrypto = typeof window === 'undefined' ? undefined : window.crypto;
  if (webcrypto && webcrypto.randomUUID) return webcrypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (webcrypto && webcrypto.getRandomValues) webcrypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Queue one write. `targetId` is whatever id the projection gave the row, so the UI
// passes `row.id` and never learns that a pending row's id is a client id.
// Returns { item, coalesced } — coalesced means it folded into a queued create and
// nothing new was enqueued.
export async function enqueueMutation(uid, op, { payload = {}, targetId = null } = {}) {
  const item = {
    uid,
    op,
    payload,
    clientId: op.startsWith('create') ? newClientId() : null,
    targetId,
    friendClientId: op === 'createGrudge' && typeof payload.friend_id === 'string' ? payload.friend_id : null,
    tries: 0,
    nextTryAt: 0,
    state: 'pending',
    lastError: null,
    createdAt: new Date().toISOString(),
  };

  const queue = await listOutbox(uid);
  const next = coalesce(queue, item);
  const appended = next[next.length - 1] === item;
  if (appended) item.seq = await enqueue(item);
  else await replaceOutbox(uid, next);
  notify();
  return { item, coalesced: !appended };
}

// 唔要 on the 未寄出 page: the user gives up on a write that can never land.
export async function discard(seq) {
  await removeOutboxItem(seq);
  notify();
}

// Bumped every time the answer to "should this device still remember this book?"
// becomes no. A pull that was already on the wire captures this before it leaves and
// refuses to write its answer if the number moved while it was out.
let mirrorEpoch = 0;

// Anything in flight belongs to a book that no longer exists, so stop coalescing
// behind it too — otherwise a request that never comes back (a dead radio holds a
// fetch open indefinitely) wedges every later sync behind a promise that will never
// settle. The abandoned run cannot do damage on its way out: it only ever removes or
// patches outbox rows by seq, and both are no-ops once the row is gone.
function abandonInFlight() {
  mirrorEpoch += 1;
  inFlight = null;
  syncing = null;
}

// 登出 — 本簿內容唔留喺部機，但未寄出嘅嘢要等佢下次登入再寄. The outbox survives,
// still uid-tagged, and runFlush only ever sends items whose uid matches the token,
// so another account signing in on this device can neither see nor send them.
export async function clearMirror(uid) {
  abandonInFlight();
  await idbClearMirror(uid);
  notify();
}

// 撕爛本簿 — everything, including the queue.
export async function clearBook(uid) {
  abandonInFlight();
  await clearAll(uid);
  notify();
}

export async function readState(uid) {
  if (!uid) return { mirror: null, outbox: [] };
  const [mirror, outbox] = await Promise.all([getMirror(uid), listOutbox(uid)]);
  return { mirror, outbox };
}

/* ---- flush ---- */

function send(item) {
  const body = { ...item.payload, client_id: item.clientId };
  switch (item.op) {
    case 'createFriend': return api.createFriend(body);
    case 'updateFriend': return api.updateFriend(item.targetId, item.payload);
    case 'deleteFriend': return api.deleteFriend(item.targetId);
    case 'createGrudge': return api.addGrudge(body);
    case 'updateGrudge': return api.editGrudge(item.targetId, item.payload);
    case 'deleteGrudge': return api.removeGrudge(item.targetId);
    default: return Promise.reject(new ApiError(400, 'bad-op'));
  }
}

// A create that lands teaches every later item what its server id is. Written back
// to IndexedDB straight away, not just held in memory: force-quitting the app here
// must not orphan the 嬲爆事 queued under a 罪人 who now exists.
async function adopt(queue, fromIdx, clientId, serverId) {
  for (let i = fromIdx + 1; i < queue.length; i += 1) {
    const it = queue[i];
    const patch = {};
    if (it.targetId === clientId) patch.targetId = serverId;
    if (it.friendClientId === clientId) patch.payload = { ...it.payload, friend_id: serverId };
    if (Object.keys(patch).length) {
      await updateOutboxItem(it.seq, patch);
      Object.assign(it, patch);
    }
  }
}

// poison() preserves order and length 1:1, so the flusher can keep walking by index
// across a burial and still see the states it just wrote. `result.dead` counts the
// items that just died, which for a createFriend is the friend plus its dependents.
async function bury(result, queue, failedItem) {
  const next = poison(queue, failedItem);
  for (let i = 0; i < next.length; i += 1) {
    if (queue[i].state !== next[i].state) {
      await updateOutboxItem(next[i].seq, { state: next[i].state, lastError: next[i].lastError });
      result.dead += 1;
    }
  }
  return next;
}

const errorOf = (e) => (e instanceof ApiError
  ? { status: e.status, code: e.code }
  : { status: 0, code: 'network' });

async function runFlush(uid) {
  const result = { sent: 0, dead: 0, paused: false, blocked: false, retryAt: null, error: null };
  // Items belonging to another account can only exist if this device signed in as
  // someone else; they are never sent under this token, and never dropped either.
  let queue = (await listOutbox(uid)).filter((it) => it.uid === uid);
  if (!queue.length) return result;

  const mirror = await getMirror(uid);
  const idMap = new Map();
  // Survives a crash between a successful create and the pull that would have put
  // its client_id in the mirror.
  const serverIdOf = (op, clientId) => {
    if (idMap.has(clientId)) return idMap.get(clientId);
    const rows = (mirror && (op.endsWith('Friend') ? mirror.friends : mirror.grudges)) || [];
    const row = rows.find((r) => r.client_id === clientId);
    return row ? row.id : null;
  };

  for (let i = 0; i < queue.length; i += 1) {
    const item = queue[i];
    if (item.state === 'permanent') continue;         // already buried — never blocks the queue
    if (item.nextTryAt > Date.now()) {                // still serving its backoff
      result.blocked = true;
      result.retryAt = item.nextTryAt;
      break;
    }

    // Leave the item queued and back off. Order matters, so this blocks everything
    // behind it too.
    const blockOn = async (err) => {
      const nextTryAt = Date.now() + backoffMs(item.tries || 0);
      await updateOutboxItem(item.seq, {
        tries: (item.tries || 0) + 1, nextTryAt, lastError: { ...err, op: item.op },
      });
      result.blocked = true;
      result.retryAt = nextTryAt;
      result.error = err;
    };

    // Fill in the ids an offline write could not know.
    const resolved = { ...item };
    if (typeof item.targetId === 'string') resolved.targetId = serverIdOf(item.op, item.targetId);
    if (item.friendClientId) {
      const friendId = serverIdOf('createFriend', item.friendClientId);
      resolved.payload = { ...item.payload, friend_id: friendId };
    }
    const needsTarget = !item.op.startsWith('create');
    if ((needsTarget && resolved.targetId == null)
      || (item.friendClientId && resolved.payload.friend_id == null)) {
      // "I cannot resolve this id" is not the same as "the parent is gone". With no
      // mirror to look in — signed out, or evicted under storage pressure — we
      // cannot tell the two apart, so block and let a later sync judge against a
      // freshly pulled book rather than destroying the write. Only a mirror that HAS
      // been pulled and still does not know this client_id proves the 罪人 was
      // deleted on another device.
      if (!mirror) {
        await blockOn({ status: 0, code: 'unresolved' });
        break;
      }
      queue = await bury(result, queue, { ...item, state: 'permanent', lastError: { status: 404, code: 'parent-gone', op: item.op } });
      continue;
    }

    let row;
    try {
      row = await send(resolved);
    } catch (e) {
      const err = errorOf(e);
      const verdict = classify(err.status, item.op, err.code);
      if (verdict === 'pause') {                       // token expired: stop, consume nothing
        result.paused = true;
        result.error = err;
        break;
      }
      if (verdict === 'retry') {
        await blockOn(err);
        break;
      }
      if (verdict === 'permanent') {
        queue = await bury(result, queue, { ...item, state: 'permanent', lastError: { ...err, op: item.op } });
        continue;
      }
      row = null;                                      // 'done' — already applied elsewhere
    }

    await removeOutboxItem(item.seq);
    result.sent += 1;
    if (item.clientId && row && row.id != null) {
      idMap.set(item.clientId, row.id);
      await adopt(queue, i, item.clientId, row.id);
    }
  }

  if (result.sent || result.dead) notify();
  return result;
}

// Single-flight: two triggers (app open and a reconnect in the same second) must
// not both walk the queue, or a write goes twice. Same uid joins the run in
// progress; a different uid queues behind it rather than interleaving.
let inFlight = null;

export function flush(uid) {
  if (inFlight && inFlight.uid === uid) return inFlight.promise;
  const prior = inFlight ? inFlight.promise.catch(() => {}) : Promise.resolve();
  const promise = prior.then(() => runFlush(uid));
  const entry = { uid, promise };
  inFlight = entry;
  promise.then(
    () => { if (inFlight === entry) inFlight = null; },
    () => { if (inFlight === entry) inFlight = null; },
  );
  return promise;
}

/* ---- pull ---- */

// The mirror is replaced wholesale, never merged into — there is no code path that
// can leave it half server truth and half something this device made up.
export async function pull(uid) {
  // Read before the mirror and before the request. A 合埋本簿 that lands while this
  // request is on the wire must beat the answer coming back — otherwise the reply
  // writes the whole book to a device the user just signed out of, and 私隱條款 §二
  // becomes a lie. Both branches below have to honour it, including 304, whose body
  // is the mirror we read a moment ago.
  const epoch = mirrorEpoch;
  const current = await getMirror(uid);
  const res = await api.state(current && current.etag);
  const abandoned = () => epoch !== mirrorEpoch;
  const dropped = { changed: false, mirror: null, discarded: true };

  // Write only if the book is still wanted — and check again afterwards, because the
  // 合埋 delete could have landed while this very put was in flight and the put would
  // have won. Converging on "gone" makes the guarantee unconditional: if a 合埋
  // happened at ANY point during this pull, no mirror survives it.
  const keep = async (record) => {
    if (abandoned()) return false;
    await putMirror(record);
    if (!abandoned()) return true;
    await idbClearMirror(uid);
    return false;
  };

  if (res.status === 304) {
    if (!current) return { changed: false, mirror: null };   // nothing was asked, nothing to keep
    const kept = { ...current, pulledAt: Date.now() };
    return (await keep(kept)) ? { changed: false, mirror: kept } : dropped;
  }

  const data = res.data || {};
  const mirror = {
    uid,
    etag: res.etag || null,
    pulledAt: Date.now(),
    friends: data.friends || [],
    grudges: data.grudges || [],
    // openCards is the older, still-supported shape: during a rollout where the
    // Worker has not shipped yet, the book keeps its 找數卡 instead of losing them.
    cards: data.cards || data.openCards || [],
  };
  if (!(await keep(mirror))) return dropped;
  notify();
  return { changed: true, mirror };
}

/* ---- sync ---- */

let lastStatus = { at: 0, ok: false, sent: 0, dead: 0, paused: false, blocked: false, pulled: null, retryAt: null, error: null };
let syncing = null;

export function getSyncStatus() {
  return lastStatus;
}

// flush, then pull. Never throws: being offline is the normal case, and the UI
// reads whether the last attempt actually succeeded rather than navigator.onLine,
// which cheerfully reports true on a captive portal.
async function runSync(uid) {
  const status = {
    at: Date.now(), ok: false, sent: 0, dead: 0,
    paused: false, blocked: false, pulled: null, retryAt: null, error: null,
  };
  if (!uid) return status;

  // Flushing resolves the ids of writes queued under a create that already landed by
  // looking them up in the mirror, and signing out drops the mirror while keeping
  // the outbox. Prime it first, so the sync after a sign-in sends those writes
  // straight away instead of blocking for a cycle. Offline this just fails and the
  // flush blocks — which is the right answer, not a reason to stop.
  try {
    if (!(await getMirror(uid))) await pull(uid);
  } catch { /* no book yet; flush will do what it can without one */ }

  try {
    const flushed = await flush(uid);
    Object.assign(status, {
      sent: flushed.sent, dead: flushed.dead, paused: flushed.paused,
      blocked: flushed.blocked, retryAt: flushed.retryAt, error: flushed.error,
    });
  } catch (e) {
    status.error = errorOf(e);
  }

  // A dead token makes the pull a guaranteed 401 too, and a failed pull would
  // otherwise look like a network problem.
  if (!status.paused) {
    try {
      const pulled = await pull(uid);
      // 'discarded' — the answer arrived after the book was 合埋'd and was thrown
      // away. Reporting that as 'unchanged' would claim a mirror we do not have.
      if (pulled.discarded) status.pulled = 'discarded';
      else status.pulled = pulled.changed ? 'fresh' : 'unchanged';
      status.ok = !status.blocked && !status.error;
    } catch (e) {
      status.error = status.error || errorOf(e);
    }
  }

  lastStatus = status;
  notify();
  return status;
}

export function sync(uid) {
  if (syncing && syncing.uid === uid) return syncing.promise;
  const prior = syncing ? syncing.promise.catch(() => {}) : Promise.resolve();
  const entry = { uid, promise: prior.then(() => runSync(uid)) };
  syncing = entry;
  entry.promise.finally(() => { if (syncing === entry) syncing = null; });
  return entry.promise;
}

/* ---- triggers ---- */

// App open, foreground, reconnect — plus a timer for whatever the queue is waiting
// on, so a transient failure heals itself instead of waiting for the user to
// background the app. navigator.onLine is only ever a reason to try, never the
// state shown to the reader.
export function startAutoSync(uid) {
  if (!uid) return () => {};
  let stopped = false;
  let timer = null;

  const run = () => {
    if (stopped) return;
    sync(uid).then((status) => {
      clearTimeout(timer);
      if (stopped || !status.retryAt) return;
      timer = setTimeout(run, Math.max(1000, status.retryAt - Date.now()));
    });
  };
  const onVisible = () => { if (document.visibilityState === 'visible') run(); };

  window.addEventListener('online', run);
  document.addEventListener('visibilitychange', onVisible);
  run();

  return () => {
    stopped = true;
    clearTimeout(timer);
    window.removeEventListener('online', run);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
