import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Layout from './Layout';
import MainContent from './MainContent';

function renderStandardPortfolio() {
  render(<MemoryRouter initialEntries={['/portfolio']}><Routes>
    <Route element={<Layout />}><Route path="/portfolio" element={<MainContent />} /></Route>
    <Route path="/room" element={<h1>Room preview destination</h1>} />
  </Routes></MemoryRouter>);
}

test('the standard desktop navigation opens the explicit room route', () => {
  renderStandardPortfolio();
  expect(screen.getByRole('link', { name: 'Hillman Chan', exact: true })).toHaveAttribute('href', '/');
  const roomLink = screen.getByRole('link', { name: '3D room', exact: true });
  expect(roomLink).toHaveAttribute('href', '/room');
  fireEvent.click(roomLink);
  expect(screen.getByRole('heading', { name: 'Room preview destination' })).toBeInTheDocument();
});

test('the mobile menu also opens the explicit room route', () => {
  renderStandardPortfolio();
  fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
  const roomLinks = screen.getAllByRole('link', { name: '3D room', exact: true });
  expect(roomLinks).toHaveLength(2);
  fireEvent.click(roomLinks[1]);
  expect(screen.getByRole('heading', { name: 'Room preview destination' })).toBeInTheDocument();
});

test('the standard portfolio hero offers room entry alongside professional experience', () => {
  renderStandardPortfolio();
  expect(screen.getByRole('link', { name: 'Explore my professional experience' })).toHaveAttribute('href', '/about');
  const roomLink = screen.getByRole('link', { name: 'Enter my 3D room', exact: true });
  expect(roomLink).toHaveAttribute('href', '/room');
  fireEvent.click(roomLink);
  expect(screen.getByRole('heading', { name: 'Room preview destination' })).toBeInTheDocument();
});
