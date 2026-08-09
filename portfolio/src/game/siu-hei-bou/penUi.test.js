// 支筆喺畫面上面真係企咗喺行頭，一個字都未落。
//
// 點解唔喺 SiuHeiBouGame 度整成條線嚟試：嗰度要行埋 auth、IndexedDB、sync，
// 而支筆係靠 setInterval 行嘅 —— 成個 suite 一齊跑嗰陣，「而家寫到邊」就變成
// 同一個 45ms 嘅 interval 賽跑，紅定綠靠彩數。Book 係受控 component（本簿由
// 外面餵落嚟），所以喺呢度可以一格 render 就答到問題，冇 timer、冇 IDB。
//
// 底下嗰兩件事分別喺第度守：
//   · outbox 交接去個鏡冇窿 → sync.test.js
//   · 支筆跨得過 client id → server id → pen.test.js（isPenEntry）
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Book from './Book';
import { api } from './api';

jest.mock('./api', () => ({
  SHARE_BASE: 'https://example.test',
  SUPERADMIN_EMAIL: 'boss@x.com',
  api: { me: jest.fn(), deleteMe: jest.fn(), openCard: jest.fn(), settleCard: jest.fn() },
}));

const USER = { displayName: '陳大文', email: 'man@x.com', photoURL: null };
const FRIEND = { id: 1, name: '阿明', colour: '#e8a0a0', threshold: 10, reward: '請食飯', stamps: 0 };
const TEXT = '佢今次真係過咗火，成個鐘都唔覆機';
const CID = 'c-new';

const motion = (on) => {
  window.matchMedia = () => ({ matches: !on, addListener() {}, removeListener() {} });
};

beforeEach(() => {
  api.me.mockResolvedValue({ email: 'man@x.com', name: '陳大文', counts: {} });
  motion(false);   // 揭書即時完成，導航一步到位
});

const props = (over = {}) => ({
  user: USER, signedIn: true, loginBusy: false, onLogin: jest.fn(), onLogout: jest.fn(),
  book: { friends: [FRIEND], grudges: [], cards: [] },
  outbox: [], connected: true,
  onMutate: jest.fn().mockResolvedValue({ item: { clientId: CID }, coalesced: false }),
  onDiscard: jest.fn(), onWipeLocal: jest.fn(), onForgetBook: jest.fn(),
  refresh: jest.fn(), toast: jest.fn(), ...over,
});

test('撳完「記低佢」，支筆企咗喺行頭，一個字都未落', async () => {
  // onMutate 要好似真嘢咁：喺 reload 之前嗌返 onQueued，支筆先架得起。
  const onMutate = jest.fn(async (op, opts, onQueued) => {
    const res = { item: { clientId: CID }, coalesced: false };
    if (onQueued) onQueued(res);
    return res;
  });
  const p = props({ onMutate });
  const { rerender } = render(<Book {...p} />);

  fireEvent.click(screen.getByRole('button', { name: /阿明/ }));
  fireEvent.click(await screen.findByRole('button', { name: '記一筆' }));
  fireEvent.change(screen.getByPlaceholderText('佢今次做咗啲乜⋯'), { target: { value: TEXT } });

  motion(true);    // 由呢刻開始先好郁 —— 唔係嘅話 reduceMotion() 會唔架支筆
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: '記低佢' }));
  });

  // 排咗隊，本簿就會由外面餵返落嚟（真實情況係 projectBook 砌嘅鉛筆稿）
  const pendingGrudge = {
    id: CID, client_id: CID, friend_id: 1, content: TEXT,
    severity: 1, occurred_at: '2026-08-09', card_id: null, pending: true,
  };
  rerender(<Book {...p} onMutate={onMutate}
    book={{ friends: [{ ...FRIEND, stamps: 1 }], grudges: [pendingGrudge], cards: [] }} />);

  expect(onMutate).toHaveBeenCalledWith('createGrudge', expect.anything(), expect.any(Function));
  // 支筆喺度，但成句嘢一個字都未寫落去 —— 個 bug 就係呢句一次過彈晒出嚟。
  expect(document.querySelector('.shb-pen')).toBeInTheDocument();
  expect(document.body.textContent).not.toContain(TEXT);
});

test('reduced-motion 開咗就唔會有支筆，成句嘢直接上頁', async () => {
  const onMutate = jest.fn(async (op, opts, onQueued) => {
    const res = { item: { clientId: CID }, coalesced: false };
    if (onQueued) onQueued(res);
    return res;
  });
  const p = props({ onMutate });
  const { rerender } = render(<Book {...p} />);

  fireEvent.click(screen.getByRole('button', { name: /阿明/ }));
  fireEvent.click(await screen.findByRole('button', { name: '記一筆' }));
  fireEvent.change(screen.getByPlaceholderText('佢今次做咗啲乜⋯'), { target: { value: TEXT } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: '記低佢' }));
  });

  rerender(<Book {...p} onMutate={onMutate}
    book={{
      friends: [{ ...FRIEND, stamps: 1 }],
      grudges: [{
        id: CID, client_id: CID, friend_id: 1, content: TEXT,
        severity: 1, occurred_at: '2026-08-09', card_id: null, pending: true,
      }],
      cards: [],
    }} />);

  expect(document.querySelector('.shb-pen')).not.toBeInTheDocument();
  expect(document.body.textContent).toContain(TEXT);
});
