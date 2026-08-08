// fake-indexeddb is pinned to ^4 on purpose: 5+ delegates cloning to a global
// `structuredClone`, which CRA 5's jsdom 16 does not provide, so every put/add
// throws ReferenceError. 4.x brings its own structured clone.
import 'fake-indexeddb/auto';
import {
  getMirror, putMirror, enqueue, listOutbox, updateOutboxItem,
  removeOutboxItem, replaceOutbox, clearAll, clearMirror,
} from './idb';

const A = 'uid-a';
const B = 'uid-b';

const item = (uid, op, extra = {}) => ({
  uid, op, payload: {}, clientId: null, targetId: null, friendClientId: null,
  tries: 0, state: 'pending', lastError: null, createdAt: '2026-08-08T00:00:00.000Z', ...extra,
});

beforeEach(async () => {
  await clearAll(A);
  await clearAll(B);
});

describe('mirror', () => {
  it('round-trips a whole book and is keyed by uid', async () => {
    await putMirror({
      uid: A, etag: '"abc"', pulledAt: 1,
      friends: [{ id: 1, name: '阿明' }], grudges: [{ id: 9, friend_id: 1 }], cards: [],
    });
    const back = await getMirror(A);
    expect(back.etag).toBe('"abc"');
    expect(back.friends[0].name).toBe('阿明');
    expect(back.grudges[0].id).toBe(9);
    expect(await getMirror(B)).toBeNull();
  });

  it('replaces wholesale rather than merging', async () => {
    await putMirror({ uid: A, friends: [{ id: 1 }, { id: 2 }], grudges: [], cards: [] });
    await putMirror({ uid: A, friends: [{ id: 2 }], grudges: [], cards: [] });
    expect((await getMirror(A)).friends).toEqual([{ id: 2 }]);
  });

  it('returns null before the first pull', async () => {
    expect(await getMirror('never-opened')).toBeNull();
  });
});

describe('outbox', () => {
  it('hands back an increasing seq and lists in that order', async () => {
    const first = await enqueue(item(A, 'createFriend'));
    const second = await enqueue(item(A, 'createGrudge'));
    expect(second).toBeGreaterThan(first);
    expect((await listOutbox(A)).map((i) => i.op)).toEqual(['createFriend', 'createGrudge']);
  });

  it('never mixes two accounts on the same device', async () => {
    await enqueue(item(A, 'createFriend'));
    await enqueue(item(B, 'createGrudge'));
    expect((await listOutbox(A)).map((i) => i.uid)).toEqual([A]);
    expect((await listOutbox(B)).map((i) => i.uid)).toEqual([B]);
  });

  it('patches one item and leaves the rest alone', async () => {
    const seq = await enqueue(item(A, 'createGrudge', { payload: { content: '遲到' } }));
    await enqueue(item(A, 'deleteGrudge'));
    const patched = await updateOutboxItem(seq, { tries: 2, state: 'permanent', lastError: { status: 409 } });
    expect(patched).toMatchObject({ seq, tries: 2, state: 'permanent' });
    expect(patched.payload).toEqual({ content: '遲到' });   // untouched fields survive
    const list = await listOutbox(A);
    expect(list.map((i) => i.state)).toEqual(['permanent', 'pending']);
  });

  it('patching a seq that is already gone is a no-op, not a throw', async () => {
    expect(await updateOutboxItem(9999, { tries: 1 })).toBeNull();
  });

  it('removes a single item', async () => {
    const seq = await enqueue(item(A, 'createFriend'));
    await enqueue(item(A, 'createGrudge'));
    await removeOutboxItem(seq);
    expect((await listOutbox(A)).map((i) => i.op)).toEqual(['createGrudge']);
  });

  it('replaceOutbox rewrites this uid keeping seq order, and never touches the other', async () => {
    const keep = await enqueue(item(A, 'createFriend'));
    await enqueue(item(A, 'updateFriend'));
    await enqueue(item(B, 'createGrudge'));

    const queue = await listOutbox(A);
    await replaceOutbox(A, [{ ...queue[0], payload: { name: '改咗名' } }]);

    const after = await listOutbox(A);
    expect(after).toHaveLength(1);
    expect(after[0].seq).toBe(keep);              // the surviving write keeps its place in line
    expect(after[0].payload).toEqual({ name: '改咗名' });
    expect(await listOutbox(B)).toHaveLength(1);
  });
});

describe('clearMirror', () => {
  it('drops the book but keeps the queue — 登出 must not throw away unsent writes', async () => {
    await putMirror({ uid: A, friends: [{ id: 1 }], grudges: [{ id: 9 }], cards: [] });
    await putMirror({ uid: B, friends: [{ id: 2 }], grudges: [], cards: [] });
    await enqueue(item(A, 'createGrudge', { payload: { content: '未寄出' } }));

    await clearMirror(A);

    expect(await getMirror(A)).toBeNull();
    const queue = await listOutbox(A);
    expect(queue).toHaveLength(1);
    expect(queue[0].payload).toEqual({ content: '未寄出' });
    expect((await getMirror(B)).friends).toEqual([{ id: 2 }]);
  });
});

describe('clearAll', () => {
  it('wipes one account and leaves the other book intact', async () => {
    await putMirror({ uid: A, friends: [{ id: 1 }], grudges: [], cards: [] });
    await putMirror({ uid: B, friends: [{ id: 2 }], grudges: [], cards: [] });
    await enqueue(item(A, 'createGrudge'));
    await enqueue(item(B, 'createGrudge'));

    await clearAll(A);

    expect(await getMirror(A)).toBeNull();
    expect(await listOutbox(A)).toEqual([]);
    expect((await getMirror(B)).friends).toEqual([{ id: 2 }]);
    expect(await listOutbox(B)).toHaveLength(1);
  });
});
