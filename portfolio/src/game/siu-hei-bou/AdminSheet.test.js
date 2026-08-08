import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AdminSheet, { clearAdminCache } from './AdminSheet';
import { api } from './api';

jest.mock('./api', () => ({ api: { adminUsers: jest.fn() } }));

const PAGE_SIZE = 20;
const ALL = Array.from({ length: 46 }, (_, i) => (
  { name: `阿${i}`, email: `u${i}@x.com`, created_at: '2026-08-08 09:00:00' }));

// Stand-in for the Worker: same clamping and shape the real handler returns.
const fakeServer = ({ page = 1, q = '' } = {}) => {
  const hits = ALL.filter((u) => !q || u.email.includes(q) || u.name.includes(q));
  const pages = Math.max(1, Math.ceil(hits.length / PAGE_SIZE));
  const safe = Math.min(Math.max(1, page), pages);
  return Promise.resolve({
    total: hits.length, q, pages, pageSize: PAGE_SIZE, page: safe,
    users: hits.slice((safe - 1) * PAGE_SIZE, safe * PAGE_SIZE),
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  api.adminUsers.mockReset();
  api.adminUsers.mockImplementation(fakeServer);
  clearAdminCache();   // the cache is module-level and outlives each render
});
afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); });

const mount = async () => {
  const view = render(<AdminSheet onClose={() => {}} />);
  await act(async () => {});
  return view;
};

test('shows the first 20 users and the real total', async () => {
  await mount();
  await screen.findByText('阿0');
  expect(screen.getByText(/總用戶：46 人/)).toBeInTheDocument();
  expect(screen.getByText('第 1 / 3 頁')).toBeInTheDocument();
  expect(document.querySelectorAll('.shb-admin-list li')).toHaveLength(20);
  expect(screen.getByText('上一頁')).toBeDisabled();
});

test('下一頁 loads the next slice, and flipping back is served from cache', async () => {
  await mount();
  await screen.findByText('阿0');
  const callsAfterFirstPage = api.adminUsers.mock.calls.length;

  fireEvent.click(screen.getByText('下一頁'));
  await act(async () => {});
  expect(screen.getByText('第 2 / 3 頁')).toBeInTheDocument();
  expect(await screen.findByText('阿20')).toBeInTheDocument();
  expect(screen.queryByText('阿0')).not.toBeInTheDocument();
  expect(api.adminUsers.mock.calls.length).toBe(callsAfterFirstPage + 1);

  fireEvent.click(screen.getByText('上一頁'));
  await act(async () => {});
  expect(screen.getByText('阿0')).toBeInTheDocument();
  expect(api.adminUsers.mock.calls.length).toBe(callsAfterFirstPage + 1);  // cache hit, no refetch
});

test('last page is short and 下一頁 is disabled there', async () => {
  await mount();
  await screen.findByText('阿0');
  fireEvent.click(screen.getByText('下一頁'));
  await act(async () => {});
  fireEvent.click(screen.getByText('下一頁'));
  await act(async () => {});
  expect(screen.getByText('第 3 / 3 頁')).toBeInTheDocument();
  expect(document.querySelectorAll('.shb-admin-list li')).toHaveLength(6);
  expect(screen.getByText('下一頁')).toBeDisabled();
});

test('search is debounced, resets to page 1 and narrows the total', async () => {
  await mount();
  await screen.findByText('阿0');
  fireEvent.click(screen.getByText('下一頁'));
  await act(async () => {});
  expect(screen.getByText('第 2 / 3 頁')).toBeInTheDocument();

  const box = screen.getByPlaceholderText('搵用戶（名或者 email）');
  fireEvent.change(box, { target: { value: 'u4' } });
  expect(api.adminUsers).not.toHaveBeenCalledWith({ page: 1, q: 'u4' });  // still debouncing

  await act(async () => { jest.advanceTimersByTime(300); });
  await act(async () => {});
  expect(api.adminUsers).toHaveBeenCalledWith({ page: 1, q: 'u4' });
  expect(screen.getByText(/搵到 7 人/)).toBeInTheDocument();   // u4, u40..u45
  expect(screen.getByText('第 1 / 1 頁')).toBeInTheDocument();
});

test('a search with no hits says so instead of showing stale rows', async () => {
  await mount();
  await screen.findByText('阿0');
  fireEvent.change(screen.getByPlaceholderText('搵用戶（名或者 email）'), { target: { value: 'nobody' } });
  await act(async () => { jest.advanceTimersByTime(300); });
  await act(async () => {});
  expect(screen.getByText('搵唔到呢個用戶')).toBeInTheDocument();
  expect(screen.queryByText('阿0')).not.toBeInTheDocument();
});

test('a non-superadmin sees the refusal, not an empty list', async () => {
  api.adminUsers.mockRejectedValue(new Error('forbidden'));
  render(<AdminSheet onClose={() => {}} />);
  await act(async () => {});
  expect(await screen.findByText('睇唔到喎，你唔係管理員？')).toBeInTheDocument();
  expect(screen.queryByText('下一頁')).not.toBeInTheDocument();
});

test('重新載入 refetches the page it is on', async () => {
  await mount();
  await screen.findByText('阿0');
  const before = api.adminUsers.mock.calls.length;
  fireEvent.click(screen.getByText('重新載入'));
  await act(async () => {});
  expect(api.adminUsers.mock.calls.length).toBe(before + 1);
  expect(screen.getByText('阿0')).toBeInTheDocument();
});
