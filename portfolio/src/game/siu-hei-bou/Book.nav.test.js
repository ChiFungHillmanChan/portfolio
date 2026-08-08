import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Book from './Book';
import { api } from './api';
import { BACK_PAGES } from './BackMatter';

jest.mock('./api', () => ({
  SHARE_BASE: 'https://example.test',
  SUPERADMIN_EMAIL: 'boss@x.com',
  api: { me: jest.fn(), deleteMe: jest.fn(), openCard: jest.fn(), settleCard: jest.fn() },
}));

const PROFILE = {
  email: 'man@x.com', name: '陳大文', created_at: '2026-08-08 10:00:00',
  counts: { friends: 2, grudges: 5, cards: 1 },
};

// CRA sets resetMocks:true, so implementations have to be re-applied per test.
beforeEach(() => {
  api.me.mockResolvedValue(PROFILE);
  api.deleteMe.mockResolvedValue({ deleted: true });
  // Flips resolve instantly under reduced motion, so nav is synchronous here.
  window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
});

const USER = { displayName: '陳大文', email: 'man@x.com', photoURL: null };
const friend = (id, name, extra = {}) => ({
  id, name, colour: '#e8a0a0', threshold: 10, reward: '請食飯', stamps: 1, ...extra,
});
const grudge = (id, friendId, content, extra = {}) => ({
  id, friend_id: friendId, content, severity: 1,
  occurred_at: '2026-08-01', card_id: null, ...extra,
});

// 排隊寫嘅嘢，同 sync.js enqueueMutation 出嚟嗰個 shape 一樣。
const queued = (seq, op, payload, extra = {}) => ({
  seq, uid: 'u1', op, payload, clientId: `c${seq}`, targetId: null,
  tries: 0, state: 'pending', lastError: null, createdAt: '2026-08-08T00:00:00.000Z', ...extra,
});

const renderBook = (friends, extra = {}) => {
  const props = {
    user: USER,
    loginBusy: false,
    onLogin: jest.fn(),
    onLogout: jest.fn(),
    book: { friends, grudges: [], cards: [] },
    outbox: [],
    connected: true,
    onMutate: jest.fn().mockResolvedValue({ item: { clientId: 'new' }, coalesced: false }),
    onDiscard: jest.fn(),
    onWipeLocal: jest.fn().mockResolvedValue(undefined),   // 撕爛本簿：鏡 + 未寄出 一齊清
    onForgetBook: jest.fn().mockResolvedValue(undefined),  // 登出：淨係清個鏡
    refresh: jest.fn(),
    toast: jest.fn(),
    ...extra,
  };
  return { props, ...render(<Book {...props} />) };
};

const click = (name) => fireEvent.click(screen.getByRole('button', { name }));
const next = () => screen.getByRole('button', { name: /下一頁|下頁仲有/ });
const prev = () => screen.getByRole('button', { name: /上一頁/ });

test('書末 sits after the last friend chapter in the reading order', async () => {
  renderBook([friend(1, '阿明'), friend(2, '阿珍')]);

  expect(screen.getByText('目錄 1/1')).toBeInTheDocument();
  fireEvent.click(next());
  await waitFor(() => expect(screen.getByRole('heading', { name: '阿明' })).toBeInTheDocument());

  fireEvent.click(next());
  await waitFor(() => expect(screen.getByRole('heading', { name: '阿珍' })).toBeInTheDocument());

  fireEvent.click(next());   // past the last friend → 書末
  await waitFor(() => expect(screen.getByText('書末 ·個人檔案')).toBeInTheDocument());
});

test('an empty book can still reach 書末 — the old friends-only check dead-ended here', async () => {
  renderBook([]);

  expect(screen.getByText('目錄 1/1')).toBeInTheDocument();
  expect(next()).not.toBeDisabled();

  fireEvent.click(next());
  await waitFor(() => expect(screen.getByText('書末 ·個人檔案')).toBeInTheDocument());
});

test('管理書本 on the 目錄 footer jumps straight to 書末', async () => {
  renderBook([friend(1, '阿明')]);
  click('管理書本');
  await waitFor(() => expect(screen.getByText('書末 ·個人檔案')).toBeInTheDocument());
});

test('書末 walks its three pages and stops at the back cover', async () => {
  renderBook([]);
  click('管理書本');
  await waitFor(() => expect(screen.getByText('書末 ·個人檔案')).toBeInTheDocument());
  expect(screen.getByText('第 1/3 頁')).toBeInTheDocument();

  fireEvent.click(next());
  await waitFor(() => expect(screen.getByText('書末 ·私隱條款')).toBeInTheDocument());

  fireEvent.click(next());
  await waitFor(() => expect(screen.getByText('書末 ·條款及細則')).toBeInTheDocument());
  expect(screen.getByText('第 3/3 頁')).toBeInTheDocument();
  expect(next()).toBeDisabled();          // nothing after the last page
  expect(prev()).not.toBeDisabled();
});

test('the profile is fetched only once you actually turn to 書末', async () => {
  renderBook([friend(1, '阿明')]);
  expect(api.me).not.toHaveBeenCalled();   // opening the book costs no extra request

  click('管理書本');
  await waitFor(() => expect(api.me).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByText('man@x.com')).toBeInTheDocument());
});

test('書末 shows no 記一筆 FAB and no per-friend settings gear', async () => {
  renderBook([friend(1, '阿明')]);
  click('管理書本');
  await waitFor(() => expect(screen.getByText('書末 ·個人檔案')).toBeInTheDocument());
  expect(screen.queryByRole('button', { name: '記一筆' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '設定' })).not.toBeInTheDocument();
});

test('撕爛本簿 wipes the server first, then the device, then signs out', async () => {
  const onLogout = jest.fn();
  const { props } = renderBook([friend(1, '阿明')], { onLogout });

  click('管理書本');
  await waitFor(() => expect(screen.getByText('書末 ·個人檔案')).toBeInTheDocument());

  click('撕爛本簿，刪清所有嘢');
  click('真係撕爛佢');

  await waitFor(() => expect(api.deleteMe).toHaveBeenCalledTimes(1));
  // 部機嗰份鏡同未寄出嘅嘢都要清，唔係一有網就會寄返上去一本已經撕爛咗嘅簿。
  await waitFor(() => expect(props.onWipeLocal).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
});

test('a failed wipe keeps you signed in rather than stranding the data', async () => {
  const onLogout = jest.fn();
  const toast = jest.fn();
  api.deleteMe.mockRejectedValue(new Error('boom'));
  const { props } = renderBook([friend(1, '阿明')], { onLogout, toast });

  click('管理書本');
  await waitFor(() => expect(screen.getByText('書末 ·個人檔案')).toBeInTheDocument());
  click('撕爛本簿，刪清所有嘢');
  click('真係撕爛佢');

  await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining('撕唔爛')));
  expect(onLogout).not.toHaveBeenCalled();
  expect(props.onWipeLocal).not.toHaveBeenCalled();   // server 仲有嘢，部機嗰份唔可以清
  expect(screen.getByRole('button', { name: '真係撕爛佢' })).not.toBeDisabled();  // retryable
});

test('closed cover exposes 條款 and 私隱條款 before you agree to anything', () => {
  render(
    <Book
      user={null} loginBusy={false} onLogin={jest.fn()} onLogout={jest.fn()}
      book={null} outbox={[]} connected onMutate={jest.fn()} onDiscard={jest.fn()}
      onWipeLocal={jest.fn()} onForgetBook={jest.fn()} refresh={jest.fn()} toast={jest.fn()}
    />,
  );
  click('私隱條款');
  expect(screen.getByRole('heading', { name: '私隱條款' })).toBeInTheDocument();
  expect(screen.getByText(/唔使登入都入得/)).toBeInTheDocument();
});

/* ---- 鉛筆同墨水 ---- */

test('未寄出嘅嬲爆事寫成鉛筆稿，寄咗嗰啲照樣落墨', async () => {
  const { container } = renderBook([friend(1, '阿明')], {
    book: {
      friends: [friend(1, '阿明')],
      grudges: [
        grudge(2, 1, '成日遲到'),                       // 已經寄咗 → 墨水
        grudge('c9', 1, '飲咗我枝嘢', { pending: true }), // 未寄出 → 鉛筆
      ],
      cards: [],
    },
  });

  fireEvent.click(next());
  await waitFor(() => expect(screen.getByRole('heading', { name: '阿明' })).toBeInTheDocument());

  expect(screen.getByText('飲咗我枝嘢').className).toContain('shb-pending');
  expect(screen.getByText('成日遲到').className).not.toContain('shb-pending');
  // 一單嘢兩行（日期果行 + 內容果行）都要係鉛筆色
  expect(container.querySelectorAll('.shb-line.shb-pending').length).toBe(2);
});

test('罪人寄咗出去換咗 id，你揭緊嗰章要跟住轉，唔係變白紙', async () => {
  const pendingFriend = friend('c1', '阿強', { pending: true, client_id: 'c1' });
  const { rerender, props } = renderBook([], {
    book: { friends: [pendingFriend], grudges: [], cards: [] },
  });

  fireEvent.click(next());
  await waitFor(() => expect(screen.getByRole('heading', { name: '阿強' })).toBeInTheDocument());

  // 寄咗出去：server 派咗 id 7 落嚟，client_id 仲喺度認返係同一個人
  const synced = friend(7, '阿強', { client_id: 'c1' });
  rerender(<Book {...props} book={{ friends: [synced], grudges: [], cards: [] }} />);

  await waitFor(() => expect(screen.getByRole('heading', { name: '阿強' })).toBeInTheDocument());
  expect(screen.getByText('第 1/1 頁')).toBeInTheDocument();
});

test('個罪人喺另一部機刪咗，你嗰章就退返去目錄', async () => {
  const { rerender, props } = renderBook([friend(1, '阿明')]);

  fireEvent.click(next());
  await waitFor(() => expect(screen.getByRole('heading', { name: '阿明' })).toBeInTheDocument());

  rerender(<Book {...props} book={{ friends: [], grudges: [], cards: [] }} />);
  await waitFor(() => expect(screen.getByText('目錄 1/1')).toBeInTheDocument());
});

test('一個未寄出嘅罪人喺目錄都係鉛筆', () => {
  renderBook([], {
    book: { friends: [friend('c1', '阿強', { pending: true })], grudges: [], cards: [] },
  });
  expect(screen.getByText('阿強').closest('button').className).toContain('shb-pending');
});

/* ---- 未寄出 ---- */

test('冇嘢寄唔出嘅時候，本簿完全唔會提起「未寄出」', async () => {
  renderBook([friend(1, '阿明')]);
  expect(screen.queryByText(/未寄出/)).not.toBeInTheDocument();

  click('管理書本');
  await waitFor(() => expect(screen.getByText('書末 ·個人檔案')).toBeInTheDocument());
  expect(screen.getByText(`第 1/${BACK_PAGES} 頁`)).toBeInTheDocument();   // 書末 仍然係三頁
});

test('有嘢寄唔出就喺目錄見到 未寄出 (n)，撳落去係書末最尾嗰頁', async () => {
  renderBook([friend(1, '阿明')], {
    outbox: [
      queued(1, 'createGrudge', { friend_id: 1, content: '偷食我啲薯片' }),
      queued(2, 'createFriend', { name: '阿強' }),
    ],
  });

  click('未寄出 (2)');
  await waitFor(() => expect(screen.getByText('書末 ·未寄出')).toBeInTheDocument());
  // 排喺書末最尾 —— 佢出現或者消失都唔會推走你睇緊嗰頁
  expect(screen.getByText(`第 ${BACK_PAGES + 1}/${BACK_PAGES + 1} 頁`)).toBeInTheDocument();
  expect(next()).toBeDisabled();

  expect(screen.getByText('記一筆：偷食我啲薯片')).toBeInTheDocument();
  expect(screen.getByText('加罪人：阿強')).toBeInTheDocument();
});

test('等緊網絡嗰啲冇掣可撳；死咗嗰啲得一個「唔要」，冇「重試」', async () => {
  const { props } = renderBook([friend(1, '阿明')], {
    outbox: [
      queued(1, 'createGrudge', { friend_id: 1, content: '等緊嗰單' }),
      queued(7, 'updateGrudge', { severity: 3 }, {
        state: 'permanent', lastError: { status: 409, code: 'card-claimed', op: 'updateGrudge' },
      }),
    ],
  });

  click('未寄出 (2)');
  await waitFor(() => expect(screen.getByText('書末 ·未寄出')).toBeInTheDocument());

  expect(screen.getByText('等緊網絡')).toBeInTheDocument();
  expect(screen.getByText('呢單嬲爆已經入咗《找數卡》，改唔到')).toBeInTheDocument();

  // 撳極都寄唔出嘅嘢俾粒「重試」掣，就係呃人
  expect(screen.queryByRole('button', { name: '重試' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: '唔要' })).toHaveLength(1);

  click('唔要');
  expect(props.onDiscard).toHaveBeenCalledWith(7);
});

test('每種寄唔出嘅原因都有句人話', async () => {
  renderBook([friend(1, '阿明')], {
    outbox: [
      queued(3, 'createGrudge', { friend_id: 1, content: 'a' }, {
        state: 'permanent', lastError: { status: 404, code: 'not-found', op: 'createGrudge' },
      }),
      queued(4, 'createFriend', { name: 'b' }, {
        state: 'permanent', lastError: { status: 400, code: 'bad-request', op: 'createFriend' },
      }),
    ],
  });

  click('未寄出 (2)');
  await waitFor(() => expect(screen.getByText('書末 ·未寄出')).toBeInTheDocument());
  expect(screen.getByText('呢個罪人喺另一部機刪咗')).toBeInTheDocument();
  expect(screen.getByText('寫壞咗，寄唔出')).toBeInTheDocument();
});

/* ---- 登出 ---- */

test('登出清走部機嗰份簿，但淨係清個鏡 —— 撕爛本簿先係清晒', async () => {
  const onLogout = jest.fn();
  const { props } = renderBook([friend(1, '阿明')], { onLogout });

  click('合埋本簿（登出）');
  await waitFor(() => expect(props.onForgetBook).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
  expect(props.onWipeLocal).not.toHaveBeenCalled();   // 唔可以連未寄出嘅嘢一齊掉
});

test('仲有嘢未寄出就唔會靜雞雞登出，撳「唔登住」就停得返', async () => {
  const onLogout = jest.fn();
  const { props } = renderBook([friend(1, '阿明')], {
    onLogout,
    outbox: [queued(1, 'createGrudge', { friend_id: 1, content: '未寄到嗰單' })],
  });

  click('合埋本簿（登出）');
  expect(await screen.findByText('仲有 1 樣嘢未寄出')).toBeInTheDocument();
  expect(onLogout).not.toHaveBeenCalled();
  expect(props.onForgetBook).not.toHaveBeenCalled();

  click('唔登住');
  expect(onLogout).not.toHaveBeenCalled();
  expect(screen.queryByText('仲有 1 樣嘢未寄出')).not.toBeInTheDocument();
});

test('撳「照登出」就走 —— 個鏡清走，但未寄出嘅嘢照留', async () => {
  const onLogout = jest.fn();
  const { props } = renderBook([friend(1, '阿明')], {
    onLogout,
    outbox: [queued(1, 'createGrudge', { friend_id: 1, content: '未寄到嗰單' })],
  });

  click('合埋本簿（登出）');
  await screen.findByText('仲有 1 樣嘢未寄出');
  click('照登出');

  await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
  expect(props.onForgetBook).toHaveBeenCalledTimes(1);
  expect(props.onWipeLocal).not.toHaveBeenCalled();
});

/* ---- 冇網嗰陣 ---- */

test('冇網：開卡灰咗同講明點解，記一筆照樣寫得', async () => {
  renderBook([], {
    connected: false,
    book: { friends: [friend(1, '阿明', { stamps: 10 })], grudges: [], cards: [] },
  });

  fireEvent.click(next());
  await waitFor(() => expect(screen.getByRole('heading', { name: '阿明' })).toBeInTheDocument());

  const openCard = screen.getByRole('button', { name: '開卡要有網絡' });
  expect(openCard).toBeDisabled();
  expect(screen.getByRole('button', { name: '記一筆' })).not.toBeDisabled();
});

test('冇網：分享照用得（copy 條 link 唔使網），找數就唔得', async () => {
  const card = {
    id: 5, friend_id: 1, status: 'open', stamp_total: 10,
    reward: '請食飯', share_token: 'tok',
  };
  renderBook([], {
    connected: false,
    book: { friends: [friend(1, '阿明', { stamps: 10 })], grudges: [], cards: [card] },
  });

  fireEvent.click(next());
  await waitFor(() => expect(screen.getByRole('heading', { name: '阿明' })).toBeInTheDocument());

  expect(screen.getByRole('button', { name: 'send 俾佢' })).not.toBeDisabled();
  expect(screen.getByRole('button', { name: '找數要有網絡' })).toBeDisabled();
});

test('冇網：撕爛本簿唔俾撳，因為 server 根本刪唔到嘢', async () => {
  renderBook([friend(1, '阿明')], { connected: false });
  click('管理書本');
  await waitFor(() => expect(screen.getByText('書末 ·個人檔案')).toBeInTheDocument());

  const tear = screen.getByRole('button', { name: '撕書要有網絡' });
  expect(tear).toBeDisabled();
  expect(screen.queryByRole('button', { name: '撕爛本簿，刪清所有嘢' })).not.toBeInTheDocument();
});

test('冇網：用戶一覽收埋（佢淨係讀 server 嘅嘢）', () => {
  const boss = { displayName: '老細', email: 'boss@x.com', photoURL: null };
  const { unmount } = renderBook([friend(1, '阿明')], { user: boss });
  expect(screen.getByRole('button', { name: '用戶一覽' })).toBeInTheDocument();
  unmount();

  renderBook([friend(1, '阿明')], { user: boss, connected: false });
  expect(screen.queryByRole('button', { name: '用戶一覽' })).not.toBeInTheDocument();
});
