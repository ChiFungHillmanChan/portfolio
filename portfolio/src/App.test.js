import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

// The bug-reporting widget is a dev-only side effect (enabled via .env) and is
// not part of what these smoke tests cover.
jest.mock('@bugspark/widget', () => ({ __esModule: true, default: { init: jest.fn() } }));

test('keeps the standard portfolio as the main home page', async () => {
  window.history.replaceState({}, '', '/');
  render(<App />);
  expect(await screen.findByRole('heading', { level: 1, name: /Hillman Chan.*Software Engineer/i })).toBeInTheDocument();
  expect(screen.queryByTitle('Explore Hillman’s interactive room')).not.toBeInTheDocument();
});

test('links from the top 3 projects to the full projects page', async () => {
  window.history.replaceState({}, '', '/portfolio');
  render(<App />);
  const viewMore = await screen.findByRole('link', { name: /View more projects/i });
  expect(viewMore).toHaveAttribute('href', '/projects?category=all');
  fireEvent.click(screen.getByRole('button', { name: 'Game', exact: true }));
  expect(viewMore).toHaveAttribute('href', '/projects?category=game');
});


test('keeps the 3D room on its own direct route with a return to the main portfolio', async () => {
  window.history.replaceState({}, '', '/room');
  render(<App />);
  expect(await screen.findByRole('heading', { level: 1, name: /Welcome to my house/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Standard portfolio/i })).toHaveAttribute('href', '/');
});
