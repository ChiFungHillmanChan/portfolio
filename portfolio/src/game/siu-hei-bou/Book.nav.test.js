import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Book from './Book';
import { api } from './api';

jest.mock('./api', () => ({
  SHARE_BASE: 'https://example.test',
  SUPERADMIN_EMAIL: 'boss@x.com',
  api: { grudges: jest.fn(), me: jest.fn(), deleteMe: jest.fn() },
}));

const PROFILE = {
  email: 'man@x.com', name: '陳大文', created_at: '2026-08-08 10:00:00',
  counts: { friends: 2, grudges: 5, cards: 1 },
};

// CRA sets resetMocks:true, so implementations have to be re-applied per test.
beforeEach(() => {
  api.grudges.mockResolvedValue([]);
  api.me.mockResolvedValue(PROFILE);
  api.deleteMe.mockResolvedValue({ deleted: true });
  // Flips resolve instantly under reduced motion, so nav is synchronous here.
  window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
});

const USER = { displayName: '陳大文', email: 'man@x.com', photoURL: null };
const friend = (id, name) => ({ id, name, colour: '#e8a0a0', threshold: 10, reward: '請食飯', stamps: 1 });

const renderBook = (friends, extra = {}) => render(
  <Book
    user={USER} loginBusy={false} onLogin={jest.fn()} onLogout={jest.fn()}
    state={{ friends, openCards: [] }} refresh={jest.fn()} toast={jest.fn()}
    {...extra}
  />,
);

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

test('撕爛本簿 wipes the server first, then signs out', async () => {
  const onLogout = jest.fn();
  renderBook([friend(1, '阿明')], { onLogout });

  click('管理書本');
  await waitFor(() => expect(screen.getByText('書末 ·個人檔案')).toBeInTheDocument());

  click('撕爛本簿，刪清所有嘢');
  click('真係撕爛佢');

  await waitFor(() => expect(api.deleteMe).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
});

test('a failed wipe keeps you signed in rather than stranding the data', async () => {
  const onLogout = jest.fn();
  const toast = jest.fn();
  api.deleteMe.mockRejectedValue(new Error('boom'));
  renderBook([friend(1, '阿明')], { onLogout, toast });

  click('管理書本');
  await waitFor(() => expect(screen.getByText('書末 ·個人檔案')).toBeInTheDocument());
  click('撕爛本簿，刪清所有嘢');
  click('真係撕爛佢');

  await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining('撕唔爛')));
  expect(onLogout).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: '真係撕爛佢' })).not.toBeDisabled();  // retryable
});

test('closed cover exposes 條款 and 私隱條款 before you agree to anything', () => {
  render(
    <Book
      user={null} loginBusy={false} onLogin={jest.fn()} onLogout={jest.fn()}
      state={null} refresh={jest.fn()} toast={jest.fn()}
    />,
  );
  click('私隱條款');
  expect(screen.getByRole('heading', { name: '私隱條款' })).toBeInTheDocument();
  expect(screen.getByText(/唔使登入都入得/)).toBeInTheDocument();
});
