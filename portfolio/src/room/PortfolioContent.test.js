import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RoomGuideContent } from './PortfolioContent';

test('room guide opens each physical computer through its explicit action and keeps the About route', () => {
  const explore = jest.fn();
  render(<RoomGuideContent onExplore={explore} />);
  fireEvent.click(screen.getByRole('button', { name: 'Explore Experience on the MacBook' }));
  fireEvent.click(screen.getByRole('button', { name: 'Explore Projects on the Dell monitor' }));
  expect(explore.mock.calls).toEqual([['experience'], ['projects']]);
  expect(screen.getByRole('link', { name: /More about me/ })).toHaveAttribute('href', '/about');
  expect(screen.getByRole('heading', { name: 'Make your own house' })).toBeInTheDocument();
});
