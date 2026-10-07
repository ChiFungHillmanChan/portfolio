import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import RoomSession from './RoomSession';

jest.mock('./RoomPortfolio', () => function MockRoom({ active }) {
  const { Link: MockLink } = require('react-router-dom');
  return <section hidden={!active}><iframe title="Prepared room" /><MockLink to="/">Back to portfolio</MockLink></section>;
});

function setup(path = '/') {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route element={<RoomSession />}>
      <Route path="/" element={<Link to="/room">Enter my room</Link>} />
      <Route path="/room" element={null} />
    </Route>
  </Routes></MemoryRouter>);
}

function transition(type, persisted = false) {
  const event = new Event(type);
  Object.defineProperty(event, 'persisted', { value: persisted });
  act(() => window.dispatchEvent(event));
}

test('loads only on first room visit and reuses one iframe on internal round trips', () => {
  setup();
  expect(screen.queryByTitle('Prepared room')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Enter my room' }));
  const frame = screen.getByTitle('Prepared room');
  fireEvent.click(screen.getByRole('link', { name: 'Back to portfolio' }));
  expect(screen.getByTitle('Prepared room')).toBe(frame);
  expect(frame.closest('section')).toHaveAttribute('hidden');
  fireEvent.click(screen.getByRole('link', { name: 'Enter my room' }));
  expect(screen.getByTitle('Prepared room')).toBe(frame);
  expect(frame.closest('section')).not.toHaveAttribute('hidden');
});

test('releases the retained room on page departure and recreates it on browser restoration', () => {
  setup('/room');
  const frame = screen.getByTitle('Prepared room');
  transition('pagehide', true);
  expect(screen.queryByTitle('Prepared room')).not.toBeInTheDocument();
  transition('pageshow', true);
  const restoredFrame = screen.getByTitle('Prepared room');
  expect(restoredFrame).not.toBe(frame);
  fireEvent.click(screen.getByRole('link', { name: 'Back to portfolio' }));
  expect(screen.getByTitle('Prepared room')).toBe(restoredFrame);
  fireEvent.click(screen.getByRole('link', { name: 'Enter my room' }));
  expect(screen.getByTitle('Prepared room')).toBe(restoredFrame);
});

test('a restored standard page does not download the previous room in the background', () => {
  setup('/room');
  fireEvent.click(screen.getByRole('link', { name: 'Back to portfolio' }));
  transition('pagehide', true);
  transition('pageshow', true);
  expect(screen.queryByTitle('Prepared room')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Enter my room' }));
  expect(screen.getByTitle('Prepared room')).toBeInTheDocument();
});
