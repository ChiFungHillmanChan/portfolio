// 支筆真係寫緊字 —— 由撳「記低佢」到隻字一個一個浮出嚟，行足成條線。
//
// 點解要獨立一個 file：其他 test 都係 matchMedia matches:true（即係
// prefers-reduced-motion），而 reduceMotion() 一 true 支筆根本唔會架起。
// 即係話寫字動畫由頭到尾冇一條 test 覆蓋過 —— 之前壞咗都冇人知，就係因為咁。
import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import SiuHeiBouGame from './SiuHeiBouGame';
import { api } from './api';
import { getFirebase } from './firebase';
import { clearBook } from './sync';

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

// 每條 test 一個新 uid。上一條 test 未收工嘅 pull 有機會喺呢條 test 途中先返到
// 嚟，而 pull 見到 mirrorEpoch 郁咗（beforeEach 嘅 clearBook 會郁）就會清個鏡 ——
// 喺產品度嗰個正正係登出要嘅保護，喺 test 度就變成清咗隔籬條 test 本簿。
// 換個 uid，兩條 test 就完全冇得撞。
let uidSeq = 0;
let UID = 'u0';
const USER = { displayName: '陳大文', email: 'man@x.com', photoURL: null, getIdToken: async () => 'token' };
const FRIEND = { id: 1, name: '阿明', colour: '#e8a0a0', threshold: 10, reward: '請食飯', stamps: 0 };
// 揀呢個長度係有計過嘅：長過短句（penSteps 至少 30 格，呢度 ~72 格 ≈ 3.2 秒），
// 個窗口闊到成個 suite 一齊跑、CPU 爭崩頭都唔會喺兩次 poll 之間行完；但又短到
// 唔會爆版跨頁 —— 一跨頁，follower 就要揭書，支筆會暫時唔喺當前頁度，條 test
// 就變成喺度等揭書而唔係等寫字。
const TEXT = '佢今次真係過咗火，成個鐘都唔覆機，仲要話係我搞錯咗，我企咗成個鐘';

beforeEach(async () => {
  uidSeq += 1;
  UID = `u${uidSeq}`;
  await clearBook(UID);
  localStorage.clear();
  // 呢個先係重點：唔開 reduced-motion，支筆先至郁。
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  getFirebase.mockResolvedValue({
    auth: {},
    provider: {},
    onAuthStateChanged: (auth, cb) => { cb({ ...USER, uid: UID }); return () => {}; },
    signInWithPopup: jest.fn(),
    signOut: jest.fn(),
  });
  // 一個好細嘅假 server：addGrudge 真係「收咗」，之後 /api/state 就答返有嗰筆嘢。
  // 用 mockResolvedValue 交唔到呢件事 —— 一個乜都唔覆嘅 jest.fn() 會 resolve
  // undefined，flush 當佢成功，跟住 pull 又話冇嗰筆嘢，於是啱啱寫低嘅嘢蒸發咗。
  // 個 bug 正正就係喺呢條罅度，所以個假 server 要老實。
  const server = { friends: [{ ...FRIEND }], grudges: [], cards: [] };
  let nextId = 100;
  api.addGrudge.mockImplementation(async (body) => {
    const rowOut = { ...body, id: nextId, card_id: null, created_at: '2026-08-09' };
    nextId += 1;
    server.grudges = [...server.grudges, rowOut];
    server.friends = server.friends.map((f) => (f.id === rowOut.friend_id
      ? { ...f, stamps: (f.stamps || 0) + rowOut.severity } : f));
    return rowOut;
  });
  api.state.mockImplementation(async () => ({
    status: 200, etag: `"e${server.grudges.length}"`,
    data: { friends: server.friends, grudges: server.grudges, cards: server.cards },
  }));
});

// 由目錄揭入去阿明嗰章，寫低一筆。
async function writeOne() {
  render(<SiuHeiBouGame />);
  fireEvent.click(await screen.findByRole('button', { name: /阿明/ }));
  fireEvent.click(await screen.findByRole('button', { name: '記一筆' }));
  fireEvent.change(await screen.findByPlaceholderText('佢今次做咗啲乜⋯'), { target: { value: TEXT } });
  // 包住 act 等成條 promise chain（排隊 → 架筆 → 重讀 → 重畫）行完先返嚟。
  // 咁下面就 assert 得第一格 render，唔使等任何一個 interval tick —— 條 test
  // 就唔再同動畫賽跑，成個 suite 一齊跑都好，答案都係同一個。
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: '記低佢' }));
  });
}

// 個 bug 嘅樣：成句嘢一次過彈晒出嚟。所以要證明嘅係「一開頭見唔到成句」。
/* ---- 空白章：撳嗰行就寫得 ---- */

test('未有紀錄嗰章，撳嗰行就開到「記一筆」', async () => {
  render(<SiuHeiBouGame />);
  fireEvent.click(await screen.findByRole('button', { name: /阿明/ }));

  const empty = await screen.findByRole('button', { name: /未有紀錄/ });
  fireEvent.click(empty);

  expect(await screen.findByPlaceholderText('佢今次做咗啲乜⋯')).toBeInTheDocument();
});
