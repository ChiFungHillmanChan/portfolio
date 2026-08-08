import { projectBook } from './project';

const friend = (id, extra = {}) => ({
  id, uid: 'u1', name: `罪人${id}`, colour: '#e8a0a0', threshold: 10,
  reward: '請食飯', archived: 0, stamps: 0, client_id: null, ...extra,
});

const grudge = (id, friendId, extra = {}) => ({
  id, uid: 'u1', friend_id: friendId, content: `第${id}單`, severity: 1,
  occurred_at: '2026-08-01', card_id: null, created_at: '2026-08-01 00:00:00', client_id: null, ...extra,
});

const mirror = (over = {}) => ({
  uid: 'u1', etag: '"e"', pulledAt: 1, friends: [friend(1)], grudges: [grudge(10, 1)], cards: [], ...over,
});

const item = (seq, op, extra = {}) => ({
  seq, uid: 'u1', op, payload: {}, clientId: null, targetId: null, friendClientId: null,
  tries: 0, nextTryAt: 0, state: 'pending', lastError: null, createdAt: '2026-08-08T09:00:00.000Z',
  ...extra,
});

describe('projectBook — nothing queued', () => {
  it('is the mirror, untouched and unmarked', () => {
    const book = projectBook(mirror(), []);
    expect(book.friends).toEqual([friend(1)]);
    expect(book.grudges).toEqual([grudge(10, 1)]);
    expect(book.friends[0].pending).toBeUndefined();
  });

  it('survives a book that has never been pulled', () => {
    expect(projectBook(null, [])).toEqual({ friends: [], grudges: [], cards: [] });
  });
});

describe('projectBook — pending creates appear', () => {
  it('shows an offline 罪人 with the schema defaults, so the stamp card can render', () => {
    const queue = [item(1, 'createFriend', { clientId: 'f-new', payload: { name: '阿明', colour: '#a0c8e8' } })];
    const { friends } = projectBook(mirror(), queue);

    expect(friends).toHaveLength(2);
    expect(friends[1]).toMatchObject({
      id: 'f-new', client_id: 'f-new', name: '阿明', colour: '#a0c8e8',
      threshold: 10, reward: '請食飯', stamps: 0, pending: true,
    });
  });

  it('shows an offline 嬲爆事 and moves the stamp card', () => {
    const queue = [item(1, 'createGrudge', {
      clientId: 'g-new',
      payload: { friend_id: 1, content: '尋日爽約', severity: 2, occurred_at: '2026-08-08' },
    })];
    const { friends, grudges } = projectBook(mirror({ friends: [friend(1, { stamps: 3 })] }), queue);

    expect(grudges[0]).toMatchObject({
      id: 'g-new', friend_id: 1, content: '尋日爽約', severity: 2, card_id: null, pending: true,
    });
    expect(friends[0].stamps).toBe(5);
  });

  it('hangs a 嬲爆事 off a 罪人 who is also still queued', () => {
    const queue = [
      item(1, 'createFriend', { clientId: 'f-new', payload: { name: '阿明' } }),
      item(2, 'createGrudge', {
        clientId: 'g-new', friendClientId: 'f-new',
        payload: { friend_id: 'f-new', content: '第一單', severity: 3, occurred_at: '2026-08-08' },
      }),
    ];
    const { friends, grudges } = projectBook(mirror(), queue);

    expect(grudges[0].friend_id).toBe('f-new');
    expect(friends[1].stamps).toBe(3);
  });

  it('puts a new entry at the top of its day, where the server would have put it', () => {
    const base = mirror({
      grudges: [grudge(10, 1, { occurred_at: '2026-08-08' }), grudge(9, 1, { occurred_at: '2026-08-07' })],
    });
    const queue = [item(1, 'createGrudge', {
      clientId: 'g-new', payload: { friend_id: 1, content: '啱啱', severity: 1, occurred_at: '2026-08-08' },
    })];
    expect(projectBook(base, queue).grudges.map((g) => g.id)).toEqual(['g-new', 10, 9]);
  });
});

describe('projectBook — pending updates overlay', () => {
  it('paints the edit over the mirror row and marks it pending', () => {
    const queue = [item(1, 'updateGrudge', { targetId: 10, payload: { content: '改咗做呢句', severity: 3 } })];
    const { grudges, friends } = projectBook(mirror({ friends: [friend(1, { stamps: 1 })] }), queue);

    expect(grudges[0]).toMatchObject({ id: 10, content: '改咗做呢句', severity: 3, pending: true });
    expect(grudges[0].friend_id).toBe(1);          // untouched fields keep server truth
    expect(friends[0].stamps).toBe(3);             // 1 → 3 印 moves the stamp card by 2
  });

  it('renames a 罪人 without disturbing their stamps', () => {
    const queue = [item(1, 'updateFriend', { targetId: 1, payload: { name: '衰人', threshold: 5 } })];
    const { friends } = projectBook(mirror({ friends: [friend(1, { stamps: 4 })] }), queue);

    expect(friends[0]).toMatchObject({ id: 1, name: '衰人', threshold: 5, stamps: 4, pending: true });
    expect(friends).toHaveLength(1);
  });

  it('ignores an update whose row is not in the book', () => {
    const queue = [item(1, 'updateGrudge', { targetId: 999, payload: { content: '幽靈' } })];
    expect(projectBook(mirror(), queue).grudges).toEqual([grudge(10, 1)]);
  });

  it('leaves the stamp card alone for an edit that does not change 印數', () => {
    const queue = [item(1, 'updateGrudge', { targetId: 10, payload: { content: '執錯字' } })];
    const { friends } = projectBook(mirror({ friends: [friend(1, { stamps: 1 })] }), queue);
    expect(friends[0].stamps).toBe(1);
  });
});

describe('projectBook — pending deletes hide', () => {
  it('hides a deleted 嬲爆事 and takes its 印 back', () => {
    const base = mirror({ friends: [friend(1, { stamps: 2 })], grudges: [grudge(10, 1, { severity: 2 })] });
    const { grudges, friends } = projectBook(base, [item(1, 'deleteGrudge', { targetId: 10 })]);

    expect(grudges).toEqual([]);
    expect(friends[0].stamps).toBe(0);
  });

  it('does not take back 印 that a 找數卡 already claimed', () => {
    const base = mirror({
      friends: [friend(1, { stamps: 2 })],
      grudges: [grudge(10, 1, { severity: 2, card_id: 5 })],
    });
    const { friends } = projectBook(base, [item(1, 'deleteGrudge', { targetId: 10 })]);
    expect(friends[0].stamps).toBe(2);
  });

  it('a deleted 罪人 takes their chapter and their 找數卡 with them', () => {
    const base = mirror({
      friends: [friend(1), friend(2)],
      grudges: [grudge(10, 1), grudge(11, 2)],
      cards: [{ id: 5, friend_id: 1, status: 'open' }, { id: 6, friend_id: 2, status: 'open' }],
    });
    const book = projectBook(base, [item(1, 'deleteFriend', { targetId: 1 })]);

    expect(book.friends.map((f) => f.id)).toEqual([2]);
    expect(book.grudges.map((g) => g.id)).toEqual([11]);
    expect(book.cards.map((c) => c.id)).toEqual([6]);
  });
});

describe('projectBook — permanent items are excluded', () => {
  it('leaves a dead create out of the book entirely', () => {
    const queue = [item(1, 'createGrudge', {
      clientId: 'g-dead', state: 'permanent',
      lastError: { status: 404, code: 'not-found', op: 'createGrudge' },
      payload: { friend_id: 1, content: '寄唔出', severity: 3, occurred_at: '2026-08-08' },
    })];
    const { grudges, friends } = projectBook(mirror({ friends: [friend(1, { stamps: 1 })] }), queue);

    expect(grudges.map((g) => g.id)).toEqual([10]);
    expect(friends[0].stamps).toBe(1);          // its 印 never counted
  });

  it('shows server truth for a dead edit, not the edit', () => {
    const queue = [item(1, 'updateGrudge', {
      targetId: 10, state: 'permanent',
      lastError: { status: 409, code: 'card-claimed', op: 'updateGrudge' },
      payload: { content: '改唔到' },
    })];
    expect(projectBook(mirror(), queue).grudges[0].content).toBe('第10單');
  });

  it('keeps a row a dead delete failed to remove', () => {
    const queue = [item(1, 'deleteGrudge', { targetId: 10, state: 'permanent' })];
    expect(projectBook(mirror(), queue).grudges.map((g) => g.id)).toEqual([10]);
  });

  it('still applies the live items around a dead one', () => {
    const queue = [
      item(1, 'updateGrudge', { targetId: 10, state: 'permanent', payload: { content: '死咗' } }),
      item(2, 'createGrudge', {
        clientId: 'g-new', payload: { friend_id: 1, content: '生猛', severity: 1, occurred_at: '2026-08-09' },
      }),
    ];
    const { grudges } = projectBook(mirror(), queue);
    expect(grudges.map((g) => g.content)).toEqual(['生猛', '第10單']);
  });
});
