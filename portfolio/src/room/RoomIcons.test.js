import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ContactContent, RoomGuideContent } from './PortfolioContent';
import ComputerScreen from './ComputerScreen';

test('room links render geometric icons without adding symbols to accessible names', () => {
  render(<MemoryRouter><ContactContent /><RoomGuideContent onExplore={() => {}} /></MemoryRouter>);
  const linkedIn = screen.getByRole('link', { name: 'LinkedIn' });
  const github = screen.getByRole('link', { name: 'GitHub' });
  const experience = screen.getByRole('button', { name: 'Explore Experience on the MacBook' });
  for (const control of [linkedIn, github, experience]) {
    const icon = control.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveAttribute('focusable', 'false');
    expect(icon).toHaveAttribute('stroke', 'currentColor');
    expect(icon.querySelector('path')).toBeInTheDocument();
  }
});

test('computer size controls retain their labels and use SVG in both states', () => {
  render(<ComputerScreen action="projects" title="Projects" rect={{ x: 0, y: 0, width: 1, height: 1 }}>
    <p>Projects content</p>
  </ComputerScreen>);
  expect(screen.getByRole('button', { name: 'Back to room' }).querySelector('svg')).toBeInTheDocument();
  const enlarge = screen.getByRole('button', { name: 'Enlarge page' });
  expect(enlarge.querySelector('svg')).toBeInTheDocument();
  fireEvent.click(enlarge);
  const fit = screen.getByRole('button', { name: 'Fit to computer' });
  expect(fit).toHaveAttribute('aria-pressed', 'true');
  expect(fit.querySelector('svg')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Close computer page' })).toHaveTextContent('×');
});
