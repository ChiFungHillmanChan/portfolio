import {
  OPS, classify, coalesce, poison, backoffMs, BACKOFF_BASE_MS, BACKOFF_MAX_MS,
} from './outbox';

const item = (seq, op, extra = {}) => ({
  seq, uid: 'u1', op, payload: {}, clientId: null, targetId: null, friendClientId: null,
  tries: 0, nextTryAt: 0, state: 'pending', lastError: null, createdAt: '2026-08-08T00:00:00.000Z',
  ...extra,
});

const UPDATES = ['updateFriend', 'updateGrudge'];
const DELETES = ['deleteFriend', 'deleteGrudge'];

describe('OPS', () => {
  it('is the closed set of things that can be queued — 開卡/找數/撕爛本簿 are online-only', () => {
    expect(OPS).toEqual([
      'createFriend', 'updateFriend', 'deleteFriend',
      'createGrudge', 'updateGrudge', 'deleteGrudge',
    ]);
  });
});

describe('classify', () => {
  it('2xx is applied', () => {
    expect(classify(200, 'createGrudge')).toBe('done');
    expect(classify(201, 'createFriend')).toBe('done');
    expect(classify(204, 'deleteGrudge')).toBe('done');
  });

  it('401 pauses — the caller must not consume the item', () => {
    OPS.forEach((op) => expect(classify(401, op, 'unauthorized')).toBe('pause'));
  });

  it('404 on an update or delete means the job is already done', () => {
    [...UPDATES, ...DELETES].forEach((op) => expect(classify(404, op, 'not-found')).toBe('done'));
  });

  it('404 on a create means the parent is gone, and no retry can bring it back', () => {
    expect(classify(404, 'createGrudge', 'not-found')).toBe('permanent');
    expect(classify(404, 'createFriend', 'not-found')).toBe('permanent');
  });

  it('409 card-claimed is permanent — the other phone swept it into a 找數卡', () => {
    expect(classify(409, 'updateGrudge', 'card-claimed')).toBe('permanent');
    expect(classify(409, 'deleteGrudge', 'card-claimed')).toBe('permanent');
  });

  it('400 is a client bug, not something to retry forever', () => {
    OPS.forEach((op) => expect(classify(400, op, 'bad-request')).toBe('permanent'));
  });

  it('429 and 5xx are transient', () => {
    expect(classify(429, 'createGrudge', 'rate-limited')).toBe('retry');
    [500, 502, 503, 504].forEach((s) => expect(classify(s, 'createGrudge', 'internal')).toBe('retry'));
  });

  it('a fetch that never got a status is transient — that is what being offline looks like', () => {
    expect(classify(0, 'createGrudge', 'network')).toBe('retry');
    expect(classify(undefined, 'deleteGrudge', 'network')).toBe('retry');
  });

  it('treats any other 4xx as permanent rather than looping', () => {
    expect(classify(403, 'updateFriend', 'forbidden')).toBe('permanent');
    expect(classify(422, 'createGrudge', 'bad-request')).toBe('permanent');
  });
});

describe('coalesce', () => {
  it('folds an update into the create it is editing, enqueuing nothing', () => {
    const create = item(1, 'createGrudge', {
      clientId: 'c1', payload: { friend_id: 3, content: '遲到', severity: 1, occurred_at: '2026-08-08' },
    });
    const edit = item(null, 'updateGrudge', { targetId: 'c1', payload: { content: '遲到成粒鐘', severity: 2 } });

    const next = coalesce([create], edit);

    expect(next).toHaveLength(1);
    expect(next[0].op).toBe('createGrudge');
    expect(next[0].payload).toEqual({
      friend_id: 3, content: '遲到成粒鐘', severity: 2, occurred_at: '2026-08-08',
    });
    expect(create.payload.content).toBe('遲到');           // the input queue is untouched
  });

  it('drops the create entirely when the row is deleted before it was ever sent', () => {
    const create = item(1, 'createGrudge', { clientId: 'c1' });
    const next = coalesce([create], item(null, 'deleteGrudge', { targetId: 'c1' }));
    expect(next).toEqual([]);
  });

  it('deleting an unsent 罪人 takes their unsent 嬲爆事 with them', () => {
    const queue = [
      item(1, 'createFriend', { clientId: 'f1' }),
      item(2, 'createGrudge', { clientId: 'g1', friendClientId: 'f1', payload: { friend_id: 'f1' } }),
      item(3, 'createGrudge', { clientId: 'g2', friendClientId: 'f2', payload: { friend_id: 'f2' } }),
    ];
    const next = coalesce(queue, item(null, 'deleteFriend', { targetId: 'f1' }));
    expect(next.map((i) => i.clientId)).toEqual(['g2']);   // the other friend's grudge survives
  });

  it('appends when the target is a row the server already knows about', () => {
    const queue = [item(1, 'createGrudge', { clientId: 'c1' })];
    const edit = item(null, 'updateGrudge', { targetId: 42, payload: { content: '改咗' } });
    expect(coalesce(queue, edit)).toEqual([...queue, edit]);
  });

  it('appends a create', () => {
    const create = item(null, 'createFriend', { clientId: 'f9' });
    expect(coalesce([], create)).toEqual([create]);
  });

  it('will not fold into a create that is already dead', () => {
    const dead = item(1, 'createGrudge', { clientId: 'c1', state: 'permanent' });
    const edit = item(null, 'updateGrudge', { targetId: 'c1', payload: { content: '改咗' } });
    expect(coalesce([dead], edit)).toEqual([dead, edit]);
  });

  it('matches only the same kind of row', () => {
    const friend = item(1, 'createFriend', { clientId: 'x1' });
    const edit = item(null, 'updateGrudge', { targetId: 'x1', payload: { content: '改咗' } });
    expect(coalesce([friend], edit)).toHaveLength(2);
  });
});

describe('poison', () => {
  it('buries a dead createFriend and every 嬲爆事 queued under it', () => {
    const failed = item(1, 'createFriend', {
      clientId: 'f1', state: 'permanent', lastError: { status: 404, code: 'not-found', op: 'createFriend' },
    });
    const queue = [
      item(1, 'createFriend', { clientId: 'f1' }),
      item(2, 'createGrudge', { clientId: 'g1', friendClientId: 'f1' }),
      item(3, 'updateFriend', { targetId: 'f1', payload: { name: '改名' } }),
      item(4, 'createGrudge', { clientId: 'g2', friendClientId: 'f2' }),
    ];

    const next = poison(queue, failed);

    expect(next.map((i) => i.state)).toEqual(['permanent', 'permanent', 'permanent', 'pending']);
    expect(next[1].lastError).toEqual({ status: 404, code: 'parent-gone', op: 'createGrudge' });
    expect(next[0].lastError.code).toBe('not-found');
    expect(queue.map((i) => i.state)).toEqual(['pending', 'pending', 'pending', 'pending']);
  });

  it('keeps order and length so the flusher can keep walking by index', () => {
    const queue = [item(1, 'createFriend', { clientId: 'f1' }), item(2, 'createGrudge', { friendClientId: 'f1' })];
    const next = poison(queue, { ...queue[0], state: 'permanent' });
    expect(next.map((i) => i.seq)).toEqual([1, 2]);
  });

  it('buries only the failed item when nothing depends on it', () => {
    const queue = [
      item(1, 'updateGrudge', { targetId: 7, lastError: null }),
      item(2, 'createGrudge', { clientId: 'g1', friendClientId: 'f1' }),
    ];
    const failed = { ...queue[0], state: 'permanent', lastError: { status: 409, code: 'card-claimed', op: 'updateGrudge' } };

    const next = poison(queue, failed);

    expect(next.map((i) => i.state)).toEqual(['permanent', 'pending']);
    expect(next[0].lastError.code).toBe('card-claimed');
  });

  it('never resurrects an item that was already dead', () => {
    const queue = [
      item(1, 'createFriend', { clientId: 'f1' }),
      item(2, 'createGrudge', {
        friendClientId: 'f1', state: 'permanent', lastError: { status: 400, code: 'bad-request', op: 'createGrudge' },
      }),
    ];
    const next = poison(queue, { ...queue[0], state: 'permanent' });
    expect(next[1].lastError.code).toBe('bad-request');   // keeps its own reason on 未寄出
  });
});

describe('backoffMs', () => {
  it('starts at 2s and doubles', () => {
    expect(backoffMs(0)).toBe(BACKOFF_BASE_MS);
    expect(backoffMs(1)).toBe(4000);
    expect(backoffMs(2)).toBe(8000);
  });

  it('never goes backwards', () => {
    for (let tries = 0; tries < 40; tries += 1) {
      expect(backoffMs(tries + 1)).toBeGreaterThanOrEqual(backoffMs(tries));
    }
  });

  it('caps at 5 minutes, however many times it has failed', () => {
    expect(backoffMs(8)).toBe(BACKOFF_MAX_MS);
    expect(backoffMs(100)).toBe(BACKOFF_MAX_MS);
    expect(backoffMs(Number.MAX_SAFE_INTEGER)).toBe(BACKOFF_MAX_MS);
    expect(BACKOFF_MAX_MS).toBe(5 * 60 * 1000);
  });

  it('treats junk as no failures yet rather than returning NaN', () => {
    expect(backoffMs(undefined)).toBe(BACKOFF_BASE_MS);
    expect(backoffMs(-3)).toBe(BACKOFF_BASE_MS);
  });
});
