// 開簿 —— 成條線由頭行到尾：Firebase 話你係邊個 → sync.js 攞返本簿 →
// projectBook 砌好 → Book 畫出嚟。IndexedDB 係真嘅（fake-indexeddb），
// 淨係 Worker 同 Firebase 係假。單元測試證明唔到「本簿真係開得到」，呢個先至證明到。
import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import SiuHeiBouGame from './SiuHeiBouGame';
import { api } from './api';
import { getFirebase } from './firebase';
import { clearBook, readState } from './sync';

jest.mock('./firebase', () => ({ getFirebase: jest.fn() }));

jest.mock('./api', () => {
  class StubApiError extends Error {
    constructor(status, code) { super(code); this.status = status; this.code = code; }
  }
  return {
    API_BASE: 'https://api.test',
    SHARE_BASE: 'https://share.test',
    SUPERADMIN_EMAIL: 'boss@x.com',
    ApiError: StubApiError,
    setTokenGetter: jest.fn(),
    api: {
      state: jest.fn(), me: jest.fn(), deleteMe: jest.fn(),
      createFriend: jest.fn(), updateFriend: jest.fn(), deleteFriend: jest.fn(),
      addGrudge: jest.fn(), editGrudge: jest.fn(), removeGrudge: jest.fn(),
      openCard: jest.fn(), settleCard: jest.fn(), adminUsers: jest.fn(),
    },
  };
});

const USER = {
  uid: 'u1', displayName: '陳大文', email: 'man@x.com', photoURL: null,
  getIdToken: async () => 'token',
};

const friend = (id, name, extra = {}) => ({
  id, name, colour: '#e8a0a0', threshold: 10, reward: '請食飯', stamps: 0, ...extra,
});

beforeEach(async () => {
  await clearBook('u1');
  localStorage.clear();   // shb-last-uid 會喺 test 之間漏過去，逐個 test 自己擺
  window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
  getFirebase.mockResolvedValue({
    auth: {},
    provider: {},
    onAuthStateChanged: (auth, cb) => { cb(USER); return () => {}; },
    signInWithPopup: jest.fn(),
    signOut: jest.fn(),
  });
  api.state.mockResolvedValue({
    status: 200,
    etag: '"e1"',
    data: { friends: [friend(1, '阿明', { stamps: 2 })], grudges: [], cards: [] },
  });
});

test('開簿：登入之後本簿自己攞返嗮啲嘢，舊嗰個 localStorage cache 掃走', async () => {
  localStorage.setItem('shb-state', '{"friends":[]}');
  render(<SiuHeiBouGame />);

  expect(await screen.findByText('阿明')).toBeInTheDocument();
  expect(screen.getByText('共 1 個罪人 ·目錄')).toBeInTheDocument();
  // IndexedDB 取代咗佢，舊 cache 冇 uid 又冇 outbox，唔應該留低
  expect(localStorage.getItem('shb-state')).toBeNull();
});

test('冇網一樣寫得入簿：加咗嘅罪人即刻用鉛筆上頁，而且入咗未寄出', async () => {
  api.state.mockRejectedValue(new Error('offline'));
  api.createFriend.mockRejectedValue(new Error('offline'));
  render(<SiuHeiBouGame />);

  const input = await screen.findByPlaceholderText('邊個激嬲你？寫低個名⋯');
  fireEvent.change(input, { target: { value: '阿強' } });
  fireEvent.click(screen.getByRole('button', { name: '記入簿' }));

  const line = await screen.findByText('阿強');
  expect(line.closest('button').className).toContain('shb-pending');

  // 寄唔出就會有條路搵得返佢 —— 但要真係有嘢寄唔出先出現
  await waitFor(() => expect(screen.getByRole('button', { name: /未寄出 \(1\)/ })).toBeInTheDocument());
});

// 寫低一單寄唔出嘅嘢，然後撳到「照登出」為止。createFriend 係「永遠唔覆」而唔係
// 「覆錯」—— 咁 flush 就會停喺度，唔會再拉多次 pull，個 test 先冇時序運氣可言。
const queueOneAndLogout = async () => {
  const input = await screen.findByPlaceholderText('邊個激嬲你？寫低個名⋯');
  fireEvent.change(input, { target: { value: '阿強' } });
  fireEvent.click(screen.getByRole('button', { name: '記入簿' }));
  await screen.findByText('阿強');

  // 登出之前個鏡真係存在過 —— 唔係就下面「清走咗」嗰句係空頭支票
  await waitFor(async () => {
    const before = await readState('u1');
    expect(before.mirror).not.toBeNull();
    expect(before.mirror.friends).toHaveLength(1);
  });

  fireEvent.click(screen.getByRole('button', { name: '合埋本簿（登出）' }));
  fireEvent.click(await screen.findByRole('button', { name: '照登出' }));
};

test('登出：本簿內容唔留喺部機，但未寄出嘅嘢照留返喺 IndexedDB 等下次登入', async () => {
  const signOut = jest.fn().mockResolvedValue(undefined);
  getFirebase.mockResolvedValue({
    auth: {}, provider: {}, signInWithPopup: jest.fn(), signOut,
    onAuthStateChanged: (auth, cb) => { cb(USER); return () => {}; },
  });
  api.createFriend.mockReturnValue(new Promise(() => {}));   // 寄緊，永遠未覆
  render(<SiuHeiBouGame />);

  await queueOneAndLogout();
  await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));

  const { mirror, outbox } = await readState('u1');
  expect(mirror).toBeNull();                       // 合埋咗就唔應該仲揭得到
  expect(outbox).toHaveLength(1);                  // 但未寄出嗰單唔可以蒸發
  expect(outbox[0].payload.name).toBe('阿強');
  expect(outbox[0].uid).toBe('u1');                // 跟住 uid，第二個帳戶寄唔到佢
});

test('登出嗰刻個 pull 仲喺半空：佢返到嚟唔可以扶返起本已經合埋咗嘅簿', async () => {
  const signOut = jest.fn().mockResolvedValue(undefined);
  getFirebase.mockResolvedValue({
    auth: {}, provider: {}, signInWithPopup: jest.fn(), signOut,
    onAuthStateChanged: (auth, cb) => { cb(USER); return () => {}; },
  });

  // 開簿嗰次照覆；第二次 pull 我哋捉住佢，等登出之後先放佢返嚟。
  let releasePull;
  const book = { friends: [friend(1, '阿明', { stamps: 2 })], grudges: [], cards: [] };
  api.state
    .mockResolvedValueOnce({ status: 200, etag: '"e1"', data: book })
    .mockImplementationOnce(() => new Promise((resolve) => {
      releasePull = () => resolve({ status: 200, etag: '"e2"', data: book });
    }));
  api.createFriend.mockRejectedValue(new Error('offline'));   // flush 失敗 → 行到 pull
  render(<SiuHeiBouGame />);

  await queueOneAndLogout();
  await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(releasePull).toBeDefined());

  releasePull();                                   // 條網終於覆返嚟，但你已經合埋咗本簿
  await waitFor(async () => {
    const { mirror, outbox } = await readState('u1');
    expect(mirror).toBeNull();
    expect(outbox).toHaveLength(1);
  });
});

// 「先登出、後清個鏡」呢個次序，靠嘅係登出之後真係冇人再 pull。auto-sync 係喺
// uid 變嗰陣拆（唔係淨係 unmount 先拆）—— 唔係嘅話，個 online listener 同 retry
// timer 仲喺度，隨時再拉一次，本簿就會喺一部已經登咗出嘅機度返晒嚟。
test('登出之後 auto-sync 真係拆咗：再有網都唔會自己拉多次', async () => {
  let authCb;
  getFirebase.mockResolvedValue({
    auth: {},
    provider: {},
    signInWithPopup: jest.fn(),
    signOut: jest.fn().mockResolvedValue(undefined),
    onAuthStateChanged: (auth, cb) => { authCb = cb; cb(USER); return () => {}; },
  });
  render(<SiuHeiBouGame />);

  await screen.findByText('阿明');
  await waitFor(() => expect(api.state).toHaveBeenCalled());

  // 未登出之前，同一個事件係真係會拉多一次嘅 —— 唔先證明呢樣，下面嗰句
  // 「冇再拉」就淨係證明到個 event 冇用，證明唔到個 listener 拆咗。
  const beforeOnline = api.state.mock.calls.length;
  await act(async () => { window.dispatchEvent(new Event('online')); });
  await waitFor(() => expect(api.state.mock.calls.length).toBeGreaterThan(beforeOnline));
  const pullsWhileOpen = api.state.mock.calls.length;

  // Firebase 話你登咗出（真實情況：signOut 之後 onAuthStateChanged 派 null 落嚟）
  await act(async () => { authCb(null); });

  // 有返網。startAutoSync 個 listener 如果仲喺度，佢即刻就會再拉一次。
  await act(async () => { window.dispatchEvent(new Event('online')); });
  document.dispatchEvent(new Event('visibilitychange'));

  expect(api.state).toHaveBeenCalledTimes(pullsWhileOpen);
});

test('冇網嗰陣封面唔會扮到撳得，因為登入真係要打得通 Google', async () => {
  api.state.mockRejectedValue(new Error('offline'));
  getFirebase.mockResolvedValue({
    auth: {},
    provider: {},
    onAuthStateChanged: (auth, cb) => { cb(null); return () => {}; },   // 未登入過
    signInWithPopup: jest.fn(),
    signOut: jest.fn(),
  });
  const onLine = jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

  render(<SiuHeiBouGame />);

  expect(await screen.findByText('冇網住 ·要開簿一次先')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /用 Google 開簿/ })).not.toBeInTheDocument();
  onLine.mockRestore();
});

/* ---- 自動登入返：Firebase 記得你，但佢答得慢 ---- */

// Firebase 本身已經會自動登入，問題係佢要行完一個 dynamic import 先答到你。
// 嗰段時間 user === undefined，本簿就一直合埋，用家每次開都以為要重新登入。
test('上次係登住嘅話，Firebase 未答之前本簿就已經揭得開', async () => {
  localStorage.setItem('shb-last-uid', 'u1');
  getFirebase.mockReturnValue(new Promise(() => {}));   // 永遠唔答，扮住仲 load 緊

  render(<SiuHeiBouGame />);

  // 揭開咗：見到目錄嘅「加罪人」，而唔係封面嗰個登入掣
  expect(await screen.findByPlaceholderText('邊個激嬲你？寫低個名⋯')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /用 Google 開簿/ })).not.toBeInTheDocument();
});

// 揭得開唔等於信得過。核實之前一個 request 都唔應該出街 —— 冇 token 去 pull
// 淨係換到個 401，仲要嘥個來回。
test('但核實之前唔會同 server 講嘢', async () => {
  localStorage.setItem('shb-last-uid', 'u1');
  getFirebase.mockReturnValue(new Promise(() => {}));

  render(<SiuHeiBouGame />);
  await screen.findByPlaceholderText('邊個激嬲你？寫低個名⋯');

  expect(api.state).not.toHaveBeenCalled();
});

test('Firebase 答返「冇登入」就即刻合返埋 —— 唔會因為個 key 就一直扮住揭開', async () => {
  localStorage.setItem('shb-last-uid', 'u1');
  getFirebase.mockResolvedValue({
    auth: {},
    provider: {},
    onAuthStateChanged: (auth, cb) => { cb(null); return () => {}; },
    signInWithPopup: jest.fn(),
    signOut: jest.fn(),
  });

  render(<SiuHeiBouGame />);

  expect(await screen.findByRole('button', { name: /用 Google 開簿/ })).toBeInTheDocument();
  expect(localStorage.getItem('shb-last-uid')).toBeNull();
});

test('登出之後個 key 就冇咗 —— 下次開簿見到嘅係合埋咗嘅封面', async () => {
  const signOut = jest.fn().mockResolvedValue(undefined);
  let authCb;
  getFirebase.mockResolvedValue({
    auth: {},
    provider: {},
    onAuthStateChanged: (auth, cb) => { authCb = cb; cb(USER); return () => {}; },
    signInWithPopup: jest.fn(),
    signOut,
  });

  render(<SiuHeiBouGame />);
  await screen.findByText('阿明');
  expect(localStorage.getItem('shb-last-uid')).toBe('u1');   // 登住嗰陣記低咗

  await act(async () => { authCb(null); });

  expect(localStorage.getItem('shb-last-uid')).toBeNull();
});
