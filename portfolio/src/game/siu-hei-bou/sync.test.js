// sync.js against a real (fake) IndexedDB and a stubbed Worker. The pure rules are
// pinned in outbox.test.js / project.test.js; what is left to get wrong here is
// ordering, id resolution and what the queue does when the server says no — so that
// is what this covers.
import 'fake-indexeddb/auto';
import { api, ApiError } from './api';
import { enqueueMutation, flush, pull, sync, readState, clearBook, clearMirror } from './sync';
import { projectBook } from './project';

// Hoisted above the imports above by babel-plugin-jest-hoist, so `api` here is the
// stub. The Worker is the one thing these tests must not reach; IndexedDB is real.
jest.mock('./api', () => {
  class StubApiError extends Error {
    constructor(status, code) { super(code); this.status = status; this.code = code; }
  }
  return {
    ApiError: StubApiError,
    api: {
      state: jest.fn(), createFriend: jest.fn(), updateFriend: jest.fn(), deleteFriend: jest.fn(),
      addGrudge: jest.fn(), editGrudge: jest.fn(), removeGrudge: jest.fn(),
    },
  };
});

const UID = 'u1';

beforeEach(async () => {
  jest.clearAllMocks();
  await clearBook(UID);
});

test('flush sends in seq order and resolves friend_id from an offline-created friend', async () => {
  const { item: f } = await enqueueMutation(UID, 'createFriend', { payload: { name: '阿明', colour: '#a0c8e8' } });
  await enqueueMutation(UID, 'createGrudge', {
    payload: { friend_id: f.clientId, content: '爽約', severity: 2, occurred_at: '2026-08-08' },
  });

  api.createFriend.mockResolvedValue({ id: 77, name: '阿明', client_id: f.clientId });
  api.addGrudge.mockResolvedValue({ id: 500, friend_id: 77 });

  const res = await flush(UID);

  expect(res).toMatchObject({ sent: 2, dead: 0, paused: false, blocked: false });
  expect(api.createFriend).toHaveBeenCalledWith({ name: '阿明', colour: '#a0c8e8', client_id: f.clientId });
  expect(api.addGrudge.mock.calls[0][0].friend_id).toBe(77);          // resolved, not the uuid
  expect(await readState(UID).then((s) => s.outbox)).toEqual([]);
});

test('an edit of an unsent grudge costs zero requests', async () => {
  const { item: g } = await enqueueMutation(UID, 'createGrudge', {
    payload: { friend_id: 3, content: '遲到', severity: 1, occurred_at: '2026-08-08' },
  });
  const { coalesced } = await enqueueMutation(UID, 'updateGrudge', {
    targetId: g.clientId, payload: { content: '遲到成粒鐘', severity: 3 },
  });
  expect(coalesced).toBe(true);

  api.addGrudge.mockResolvedValue({ id: 9 });
  const res = await flush(UID);

  expect(res.sent).toBe(1);
  expect(api.editGrudge).not.toHaveBeenCalled();
  expect(api.addGrudge.mock.calls[0][0]).toMatchObject({ content: '遲到成粒鐘', severity: 3 });
});

test('409 buries the item and the queue keeps moving', async () => {
  await enqueueMutation(UID, 'updateGrudge', { targetId: 10, payload: { content: '改' } });
  await enqueueMutation(UID, 'deleteGrudge', { targetId: 11 });

  api.editGrudge.mockRejectedValue(new ApiError(409, 'card-claimed'));
  api.removeGrudge.mockResolvedValue({ deleted: true });

  const res = await flush(UID);

  expect(res).toMatchObject({ sent: 1, dead: 1 });
  const { outbox } = await readState(UID);
  expect(outbox).toHaveLength(1);
  expect(outbox[0]).toMatchObject({ op: 'updateGrudge', state: 'permanent' });
  expect(outbox[0].lastError).toEqual({ status: 409, code: 'card-claimed', op: 'updateGrudge' });
});

test('401 stops without consuming anything', async () => {
  await enqueueMutation(UID, 'deleteGrudge', { targetId: 10 });
  await enqueueMutation(UID, 'deleteGrudge', { targetId: 11 });
  api.removeGrudge.mockRejectedValue(new ApiError(401, 'unauthorized'));

  const res = await flush(UID);

  expect(res).toMatchObject({ sent: 0, paused: true });
  expect(api.removeGrudge).toHaveBeenCalledTimes(1);
  expect((await readState(UID)).outbox).toHaveLength(2);
});

test('a network failure blocks the queue behind a backoff and sends nothing after it', async () => {
  await enqueueMutation(UID, 'deleteGrudge', { targetId: 10 });
  await enqueueMutation(UID, 'deleteGrudge', { targetId: 11 });
  api.removeGrudge.mockRejectedValue(new TypeError('Failed to fetch'));

  const res = await flush(UID);

  expect(res).toMatchObject({ sent: 0, blocked: true });
  expect(res.retryAt).toBeGreaterThan(Date.now());
  expect(api.removeGrudge).toHaveBeenCalledTimes(1);
  const { outbox } = await readState(UID);
  expect(outbox[0]).toMatchObject({ tries: 1, state: 'pending' });

  const again = await flush(UID);                       // still inside the backoff window
  expect(again).toMatchObject({ sent: 0, blocked: true });
  expect(api.removeGrudge).toHaveBeenCalledTimes(1);
});

test('404 on a delete means it is already done', async () => {
  await enqueueMutation(UID, 'deleteGrudge', { targetId: 10 });
  api.removeGrudge.mockRejectedValue(new ApiError(404, 'not-found'));

  expect(await flush(UID)).toMatchObject({ sent: 1, dead: 0 });
  expect((await readState(UID)).outbox).toEqual([]);
});

test('404 on a createGrudge poisons it', async () => {
  await enqueueMutation(UID, 'createGrudge', {
    payload: { friend_id: 3, content: '孤兒', severity: 1, occurred_at: '2026-08-08' },
  });
  api.addGrudge.mockRejectedValue(new ApiError(404, 'not-found'));

  expect(await flush(UID)).toMatchObject({ sent: 0, dead: 1 });
  expect((await readState(UID)).outbox[0]).toMatchObject({ state: 'permanent' });
});

test('a dead createFriend takes its queued grudges down with it', async () => {
  const { item: f } = await enqueueMutation(UID, 'createFriend', { payload: { name: '阿明' } });
  await enqueueMutation(UID, 'createGrudge', {
    payload: { friend_id: f.clientId, content: '爽約', severity: 2, occurred_at: '2026-08-08' },
  });
  api.createFriend.mockRejectedValue(new ApiError(400, 'bad-request'));

  const res = await flush(UID);

  expect(api.addGrudge).not.toHaveBeenCalled();
  expect(res.dead).toBe(2);
  expect((await readState(UID)).outbox.map((i) => i.state)).toEqual(['permanent', 'permanent']);
});

test('never sends another account\'s queued writes', async () => {
  await enqueueMutation('someone-else', 'deleteGrudge', { targetId: 10 });
  const res = await flush(UID);
  expect(res.sent).toBe(0);
  expect(api.removeGrudge).not.toHaveBeenCalled();
});

// The crash-recovery path: the createFriend landed and was consumed, then the app
// died before the pull. Its queued 嬲爆事 can only find friend_id 77 again because
// /api/state rows carry client_id — the Worker's getState/listAllGrudges do SELECT *.
// Field-project that response and this is the test that goes red.
test('resolves an already-flushed create from the mirror client_id after a crash', async () => {
  api.state.mockResolvedValue({
    status: 200,
    etag: '"v1"',
    data: {
      friends: [{ id: 77, name: '阿明', stamps: 0, threshold: 10, client_id: 'f-crash' }],
      openCards: [], grudges: [], cards: [],
    },
  });
  await pull(UID);

  await enqueueMutation(UID, 'createGrudge', {
    payload: { friend_id: 'f-crash', content: '爽約', severity: 2, occurred_at: '2026-08-08' },
  });
  api.addGrudge.mockResolvedValue({ id: 500, friend_id: 77 });

  const res = await flush(UID);

  expect(res).toMatchObject({ sent: 1, dead: 0 });
  expect(api.createFriend).not.toHaveBeenCalled();
  expect(api.addGrudge.mock.calls[0][0].friend_id).toBe(77);
});

// …and if it ever does go missing, the dependent dies loudly onto 未寄出 rather than
// being written against a guessed friend_id.
test('a mirror without client_id buries the dependent instead of guessing', async () => {
  api.state.mockResolvedValue({
    status: 200,
    etag: '"v1"',
    data: {
      friends: [{ id: 77, name: '阿明', stamps: 0, threshold: 10 }],   // client_id projected away
      openCards: [], grudges: [], cards: [],
    },
  });
  await pull(UID);

  await enqueueMutation(UID, 'createGrudge', {
    payload: { friend_id: 'f-crash', content: '爽約', severity: 2, occurred_at: '2026-08-08' },
  });

  const res = await flush(UID);

  expect(api.addGrudge).not.toHaveBeenCalled();
  expect(res).toMatchObject({ sent: 0, dead: 1 });
  expect((await readState(UID)).outbox[0]).toMatchObject({ state: 'permanent' });
});

// 登出 keeps the outbox on purpose, which means the flusher can meet an item whose
// parent create already landed with no mirror to resolve it against. It must not
// mistake that for "the 罪人 was deleted elsewhere" and destroy the write.
test('with no mirror to resolve against, a dependent blocks instead of dying', async () => {
  await enqueueMutation(UID, 'createGrudge', {
    payload: { friend_id: 'f-gone', content: '未寄出', severity: 2, occurred_at: '2026-08-08' },
  });

  const res = await flush(UID);                    // no pull has ever run: mirror is null

  expect(api.addGrudge).not.toHaveBeenCalled();
  expect(res).toMatchObject({ sent: 0, dead: 0, blocked: true });
  const { outbox } = await readState(UID);
  expect(outbox[0]).toMatchObject({ state: 'pending', tries: 1 });
  expect(outbox[0].lastError.code).toBe('unresolved');
});

test('signing out drops the book but the unsent 嬲爆事 still flushes on next sign-in', async () => {
  api.state.mockResolvedValue({
    status: 200,
    etag: '"v1"',
    data: {
      friends: [{ id: 77, name: '阿明', stamps: 0, threshold: 10, client_id: 'f-kept' }],
      openCards: [], grudges: [], cards: [],
    },
  });
  await pull(UID);
  await enqueueMutation(UID, 'createGrudge', {
    payload: { friend_id: 'f-kept', content: '未寄出', severity: 2, occurred_at: '2026-08-08' },
  });

  await clearMirror(UID);                          // 登出
  expect(await readState(UID).then((s) => s.mirror)).toBeNull();
  expect(await readState(UID).then((s) => s.outbox)).toHaveLength(1);

  api.addGrudge.mockResolvedValue({ id: 500, friend_id: 77 });
  const status = await sync(UID);                  // signing back in

  expect(status.sent).toBe(1);
  expect(api.addGrudge.mock.calls[0][0].friend_id).toBe(77);   // resolved from the re-pulled book
  expect((await readState(UID)).outbox).toEqual([]);
});

test('撕爛本簿 takes the queue with it, unlike 登出', async () => {
  await enqueueMutation(UID, 'createGrudge', {
    payload: { friend_id: 1, content: '撕晒', severity: 1, occurred_at: '2026-08-08' },
  });
  await clearBook(UID);
  expect(await readState(UID)).toEqual({ mirror: null, outbox: [] });
});

// A pull already on the wire when the user taps 登出 must not put the book back.
// On a shared phone that is the whole point of the promise in 私隱條款 §二.
describe('a pull in flight when the book is 合埋', () => {
  const BOOK = {
    friends: [{ id: 1, name: '阿明', stamps: 2, threshold: 10 }],
    openCards: [], grudges: [], cards: [],
  };

  // pull() does an IndexedDB read before it reaches api.state, so the released-only
  // -after-it-is-on-the-wire handshake has to be explicit or the control case fires
  // release() before the request exists.
  const heldPull = (answer) => {
    let release;
    let onTheWire;
    const airborne = new Promise((ready) => { onTheWire = ready; });
    api.state.mockImplementationOnce(() => new Promise((resolve) => {
      release = () => resolve(answer);
      onTheWire();
    }));
    return {
      inFlight: pull(UID),
      release: async () => { await airborne; release(); },
    };
  };

  it('throws away a 200 that lands after 登出', async () => {
    api.state.mockResolvedValueOnce({ status: 200, etag: '"v1"', data: BOOK });
    await pull(UID);
    expect((await readState(UID)).mirror).not.toBeNull();

    const { inFlight, release } = heldPull({ status: 200, etag: '"v2"', data: BOOK });
    await clearMirror(UID);
    await release();

    expect(await inFlight).toMatchObject({ changed: false, mirror: null, discarded: true });
    expect((await readState(UID)).mirror).toBeNull();
  });

  it('throws away a 304 that lands after 登出 — its body is the book we just dropped', async () => {
    api.state.mockResolvedValueOnce({ status: 200, etag: '"v1"', data: BOOK });
    await pull(UID);

    const { inFlight, release } = heldPull({ status: 304, etag: '"v1"', data: null });
    await clearMirror(UID);
    await release();

    expect(await inFlight).toMatchObject({ mirror: null, discarded: true });
    expect((await readState(UID)).mirror).toBeNull();
  });

  it('throws away a 200 that lands after 撕爛本簿 — that book is gone from the server too', async () => {
    api.state.mockResolvedValueOnce({ status: 200, etag: '"v1"', data: BOOK });
    await pull(UID);

    const { inFlight, release } = heldPull({ status: 200, etag: '"v2"', data: BOOK });
    await clearBook(UID);
    await release();

    await inFlight;
    expect(await readState(UID)).toEqual({ mirror: null, outbox: [] });
  });

  it('keeps a pull that was never interrupted', async () => {
    const { inFlight, release } = heldPull({ status: 200, etag: '"v1"', data: BOOK });
    await release();
    expect(await inFlight).toMatchObject({ changed: true });
    expect((await readState(UID)).mirror.friends).toHaveLength(1);
  });
});

// A request that never comes back must not wedge every later sync behind it. This is
// exactly the shape of a dead radio: the fetch is still open, so the promise every
// later trigger coalesces onto can never settle.
test('a sync wedged on a request that never returns does not block the next one', async () => {
  const { item } = await enqueueMutation(UID, 'createFriend', { payload: { name: '阿強' } });
  api.state.mockResolvedValue({
    status: 200, etag: '"v9"', data: { friends: [], openCards: [], grudges: [], cards: [] },
  });
  api.createFriend.mockReturnValue(new Promise(() => {}));      // 永遠唔覆

  sync(UID);                                                    // deliberately not awaited
  await Promise.resolve();
  await clearMirror(UID);                                       // 登出 abandons it

  api.createFriend.mockResolvedValue({ id: 5, name: '阿強', client_id: item.clientId });
  const status = await sync(UID);                               // must actually run, not join the corpse

  expect(status.sent).toBe(1);
  expect(status.pulled).toBe('fresh');
});

test('pull replaces the mirror on 200 and keeps it on 304', async () => {
  api.state.mockResolvedValueOnce({
    status: 200,
    etag: '"v1"',
    data: { friends: [{ id: 1, name: '阿明', stamps: 0, threshold: 10 }], openCards: [], grudges: [{ id: 9, friend_id: 1 }], cards: [] },
  });
  const first = await pull(UID);
  expect(first.changed).toBe(true);
  expect(first.mirror.etag).toBe('"v1"');

  api.state.mockResolvedValueOnce({ status: 304, etag: '"v1"', data: null });
  const second = await pull(UID);

  expect(api.state).toHaveBeenLastCalledWith('"v1"');
  expect(second.changed).toBe(false);
  expect(second.mirror.friends[0].name).toBe('阿明');
});

test('the projection of what sync stored is what the book renders', async () => {
  api.state.mockResolvedValue({
    status: 200,
    etag: '"v1"',
    data: { friends: [{ id: 1, name: '阿明', stamps: 1, threshold: 10 }], openCards: [], grudges: [], cards: [] },
  });
  await pull(UID);
  await enqueueMutation(UID, 'createGrudge', {
    payload: { friend_id: 1, content: 'offline 寫嘅', severity: 2, occurred_at: '2026-08-09' },
  });

  const { mirror, outbox } = await readState(UID);
  const book = projectBook(mirror, outbox);

  expect(book.grudges[0]).toMatchObject({ content: 'offline 寫嘅', pending: true });
  expect(book.friends[0].stamps).toBe(3);
});
