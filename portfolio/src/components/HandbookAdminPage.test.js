import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HandbookAdminPage, { STATS_URL, TOKEN_KEY } from './HandbookAdminPage';

const STATS = {
  generatedAt: '2026-11-24T21:00:00.000Z',
  totals: [{ handbook: 'ai-engineer', downloads: 42, people: 30, since: '2026-11-24' }],
  parts: [
    { handbook: 'ai-engineer', part: 0, lang: 'en', downloads: 5, people: 5, last7: 5, last30: 5 },
    { handbook: 'ai-engineer', part: 1, lang: 'zh', downloads: 37, people: 25, last7: 30, last30: 37 },
  ],
  daily: [{ day: '2026-11-24', downloads: 42, people: 30 }],
  payments: [{ handbook: 'ai-engineer', part: 2, lang: 'en', currency: 'HKD', payments: 3, amount: 5000 }],
  paymentTotals: [{ handbook: 'ai-engineer', currency: 'HKD', payments: 3, amount: 5000 }],
  recentPayments: [{ at: '2026-11-24T20:00:00.000Z', handbook: 'ai-engineer', part: 2, lang: 'en', amount: 2000, currency: 'HKD' }],
};

const respond = (status, body) => Promise.resolve({ status, ok: status >= 200 && status < 300, json: () => Promise.resolve(body) });
const renderPage = () => render(<MemoryRouter><HandbookAdminPage /></MemoryRouter>);

beforeEach(() => {
  window.localStorage.clear();
  global.fetch = jest.fn();
});
afterEach(() => {
  delete global.fetch;
});

test('asks for the token first and loads nothing without it', () => {
  renderPage();
  expect(screen.getByLabelText('Admin token')).toHaveAttribute('type', 'password');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('with the token it shows downloads, people and payments for each part', async () => {
  global.fetch.mockReturnValue(respond(200, STATS));
  renderPage();
  await userEvent.type(screen.getByLabelText('Admin token'), 'secret-token');
  await userEvent.click(screen.getByRole('button', { name: 'Show stats' }));

  expect(await screen.findByText('People who downloaded')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(STATS_URL, expect.objectContaining({ headers: { authorization: 'Bearer secret-token' } }));
  expect(window.localStorage.getItem(TOKEN_KEY)).toBe('secret-token');

  const section = screen.getByRole('region', { name: /AI/ });
  expect(section).toHaveTextContent('42');
  expect(section).toHaveTextContent('HKD 50');
  const downloads = within(section).getByRole('table', { name: 'Downloads by part' });
  expect(downloads).toHaveTextContent('Part 00');
  expect(downloads).toHaveTextContent('Part 01Software Fundamentals繁體中文37253037');
  expect(within(section).getByRole('table', { name: 'Payments by part' })).toHaveTextContent('Part 02');
  expect(screen.getByRole('table', { name: 'Latest payments' })).toHaveTextContent('HKD 20');
});

test('a rejected token is forgotten and the form comes back', async () => {
  window.localStorage.setItem(TOKEN_KEY, 'old');
  global.fetch.mockReturnValue(respond(401, { error: 'Unauthorised' }));
  renderPage();
  expect(await screen.findByRole('alert')).toHaveTextContent('That token was not accepted.');
  expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
  expect(screen.getByLabelText('Admin token')).toBeInTheDocument();
});

test('sign out forgets the token', async () => {
  window.localStorage.setItem(TOKEN_KEY, 'secret-token');
  global.fetch.mockReturnValue(respond(200, STATS));
  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
  expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
  expect(screen.getByLabelText('Admin token')).toBeInTheDocument();
});
