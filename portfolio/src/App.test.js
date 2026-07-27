import { render, screen } from '@testing-library/react';
import App from './App';

// The bug-reporting widget is a dev-only side effect (enabled via .env) and is
// not part of what these smoke tests cover.
jest.mock('@bugspark/widget', () => ({ __esModule: true, default: { init: jest.fn() } }));

test('renders the portfolio home page', async () => {
  render(<App />);
  expect(await screen.findByRole('heading', { name: /Top 3 Delighted Projects/i })).toBeInTheDocument();
});

test('links from the top 3 projects to the full projects page', async () => {
  render(<App />);
  const viewMore = await screen.findByRole('button', { name: /View more projects/i });
  expect(viewMore).toBeInTheDocument();
});
