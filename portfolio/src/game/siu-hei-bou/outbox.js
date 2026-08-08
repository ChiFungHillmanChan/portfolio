// 未寄出 — every decision the queue makes, as pure functions. No IndexedDB, no
// fetch, no clock: what the app does with a queued write on a train with no signal
// is decided here and pinned by outbox.test.js, not discovered on a phone.
//
// An outbox item:
//   { seq, uid, op, payload, clientId, targetId, friendClientId,
//     tries, nextTryAt, state, lastError, createdAt }
//
//   clientId       create* only — the row's own client_id, minted before any
//                  server id can exist. Also the id the projection gives the row,
//                  so the UI addresses pending rows without knowing they are pending.
//   targetId       update*/delete* — the server id, or the clientId of a create
//                  that has not landed yet (a string).
//   friendClientId createGrudge under a friend that is itself still queued.
//   state          'pending' (will retry) | 'permanent' (dead, listed on 未寄出)

export const OPS = [
  'createFriend', 'updateFriend', 'deleteFriend',
  'createGrudge', 'updateGrudge', 'deleteGrudge',
];

const CREATES = new Set(['createFriend', 'createGrudge']);

// Which create an update/delete would be rewriting, if that create is still queued.
const CREATE_OF = {
  updateFriend: 'createFriend', deleteFriend: 'createFriend',
  updateGrudge: 'createGrudge', deleteGrudge: 'createGrudge',
};

export const BACKOFF_BASE_MS = 2000;
export const BACKOFF_MAX_MS = 5 * 60 * 1000;

// What to do with an item the server has answered.
//
//   done       applied (or already applied by the other phone) — drop it
//   retry      transient — leave it at the head of the queue and wait
//   permanent  it can never succeed — bury it and let 未寄出 explain
//   pause      the token is dead — stop, and do NOT consume the item
//
// 404 is the subtle row, because it means opposite things by op: on an update or
// delete the row is already gone, which is exactly the outcome we wanted; on a
// create the *parent* is gone (the other phone deleted the 罪人) and no amount of
// retrying will bring it back.
//
// Classification is by HTTP status; `code` is the Worker's error string, carried
// so the caller can store it for the 未寄出 copy, and used here only for the
// no-status case (fetch rejects outright when the radio is off).
export function classify(status, op, code) {
  if (status >= 200 && status < 300) return 'done';
  if (!status || code === 'network') return 'retry';
  if (status === 401) return 'pause';
  if (status === 404) return CREATES.has(op) ? 'permanent' : 'done';
  if (status === 429 || status >= 500) return 'retry';
  return 'permanent';   // 400 bad-request, 403 forbidden, 409 card-claimed …
}

// Writing a 嬲爆事 offline, fixing the typo, then deleting it must cost zero network
// operations, not three. Folding an edit into the create it edits also removes the
// entire category of "update a row the server has never heard of".
export function coalesce(queue, newItem) {
  const createOp = CREATE_OF[newItem.op];
  const idx = createOp === undefined ? -1 : queue.findIndex(
    (it) => it.op === createOp && it.state === 'pending' && it.clientId === newItem.targetId,
  );
  if (idx === -1) return [...queue, newItem];

  if (newItem.op.startsWith('delete')) {
    // Deleting a 罪人 who was never sent takes their unsent 嬲爆事 with them —
    // otherwise those grudges outlive the friend and can never resolve a friend_id.
    const gone = queue[idx].clientId;
    return queue.filter((it, i) => i !== idx
      && it.friendClientId !== gone && it.targetId !== gone);
  }
  const next = queue.slice();
  next[idx] = { ...queue[idx], payload: { ...queue[idx].payload, ...newItem.payload } };
  return next;
}

// Bury a dead item, and everything that depended on it. A createFriend that can
// never land leaves its 嬲爆事 with no friend_id to resolve, so they are dead too —
// otherwise they sit at the head of the queue forever, each retry asking the server
// about a 罪人 who does not exist.
//
// Order and length are preserved 1:1 with the input, which is what lets the flusher
// keep iterating by index across a poisoning.
export function poison(queue, failedItem) {
  const isFailed = (it) => (failedItem.seq != null ? it.seq === failedItem.seq : it === failedItem);
  const cascades = failedItem.op === 'createFriend' && !!failedItem.clientId;
  return queue.map((it) => {
    if (isFailed(it)) return { ...it, state: 'permanent', lastError: failedItem.lastError || it.lastError };
    if (!cascades || it.state === 'permanent') return it;
    if (it.friendClientId !== failedItem.clientId && it.targetId !== failedItem.clientId) return it;
    return { ...it, state: 'permanent', lastError: { status: 404, code: 'parent-gone', op: it.op } };
  });
}

// Exponential from 2s, capped at 5 minutes. `tries` is the number of failures so
// far, so the first wait is BACKOFF_BASE_MS. No jitter: this is one phone talking
// to its own row, not a thundering herd.
export function backoffMs(tries) {
  const n = Math.max(0, Math.floor(Number(tries) || 0));
  if (n > 30) return BACKOFF_MAX_MS;                 // 2 ** big is Infinity, not a delay
  return Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** n);
}
