import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BackMatter, { BACK_PAGES } from './BackMatter';

const USER = { displayName: '陳大文', email: 'man@x.com', photoURL: null };
const ME = { name: '陳大文', email: 'man@x.com', created_at: '2026-08-08 10:00:00', counts: { friends: 3, grudges: 12, cards: 2 } };

const setup = (props = {}) => {
  const onDeleteAll = jest.fn();
  const onLogout = jest.fn();
  render(
    <BackMatter
      pageIdx={0} user={USER} me={ME} interactive
      onLogout={onLogout} onDeleteAll={onDeleteAll} deleting={false}
      onGoPage={jest.fn()} onIndex={jest.fn()}
      {...props}
    />,
  );
  return { onDeleteAll, onLogout };
};

test('個人檔案 shows who you are and what the book holds', () => {
  setup();
  expect(screen.getByText('陳大文')).toBeInTheDocument();
  expect(screen.getByText('man@x.com')).toBeInTheDocument();
  expect(screen.getByText('開簿日：2026-08-08')).toBeInTheDocument();
  expect(screen.getByText('3')).toBeInTheDocument();
  expect(screen.getByText('12')).toBeInTheDocument();
  expect(screen.getByText('2')).toBeInTheDocument();
});

test('撕爛本簿 takes two deliberate taps, and names the exact damage first', () => {
  const { onDeleteAll } = setup();

  fireEvent.click(screen.getByText('撕爛本簿，刪清所有嘢'));
  expect(onDeleteAll).not.toHaveBeenCalled();          // first tap only arms it

  expect(screen.getByText(/3 個罪人、12 單嬲爆事、2 張找數卡/)).toBeInTheDocument();
  expect(screen.getByText(/Google 帳戶.*共用/)).toBeInTheDocument();

  fireEvent.click(screen.getByText('真係撕爛佢'));
  expect(onDeleteAll).toHaveBeenCalledTimes(1);
});

test('唔撕住 backs out without deleting', () => {
  const { onDeleteAll } = setup();
  fireEvent.click(screen.getByText('撕爛本簿，刪清所有嘢'));
  fireEvent.click(screen.getByText('唔撕住'));
  expect(onDeleteAll).not.toHaveBeenCalled();
  expect(screen.getByText('撕爛本簿，刪清所有嘢')).toBeInTheDocument();
});

test('a failed profile fetch never invents a zero count in the warning', () => {
  setup({ me: { failed: true } });
  fireEvent.click(screen.getByText('撕爛本簿，刪清所有嘢'));
  expect(screen.getByText(/你本簿入面所有嘢/)).toBeInTheDocument();
  expect(screen.queryByText(/0 個罪人/)).not.toBeInTheDocument();
});

test('page 1 and 2 are the two legal documents', () => {
  const { unmount } = render(<BackMatter pageIdx={1} user={USER} me={ME} interactive onIndex={jest.fn()} />);
  expect(screen.getByText('書末 ·私隱條款')).toBeInTheDocument();
  expect(screen.getByText(/最後更新：/)).toBeInTheDocument();
  unmount();

  render(<BackMatter pageIdx={2} user={USER} me={ME} interactive onIndex={jest.fn()} />);
  expect(screen.getByText('書末 ·條款及細則')).toBeInTheDocument();
});

test('an out-of-range page clamps instead of rendering blank', () => {
  render(<BackMatter pageIdx={99} user={USER} me={ME} interactive onIndex={jest.fn()} />);
  expect(screen.getByText(`書末 ·${'條款及細則'}`)).toBeInTheDocument();
  expect(BACK_PAGES).toBe(3);
});

test('the privacy page discloses the public share link and the admin user list', () => {
  render(<BackMatter pageIdx={1} user={USER} me={ME} interactive onIndex={jest.fn()} />);
  expect(screen.getByText(/唔使登入都入得/)).toBeInTheDocument();
  expect(screen.getByText(/你寫嘅嬲爆事.*站長一律睇唔到/)).toBeInTheDocument();
});
