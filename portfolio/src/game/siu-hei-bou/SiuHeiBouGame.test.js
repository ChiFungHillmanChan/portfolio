// 開簿 —— 成條線由頭行到尾：Firebase 話你係邊個 → sync.js 攞返本簿 →
// projectBook 砌好 → Book 畫出嚟。IndexedDB 係真嘅（fake-indexeddb），
// 淨係 Worker 同 Firebase 係假。單元測試證明唔到「本簿真係開得到」，呢個先至證明到。
import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
