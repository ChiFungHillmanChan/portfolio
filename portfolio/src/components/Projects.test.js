import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Projects from './Projects';

jest.mock('../projectData.json', () => {
  const projects = jest.requireActual('../projectData.json');
  return [
    projects[0],
    { ...projects[projects.length - 1], category: 'none' },
  ];
});

test('project cards expose crawlable detail links with project-specific names', () => {
  render(<MemoryRouter><Projects /></MemoryRouter>);

  expect(screen.getByRole('heading', { level: 1, name: 'My Projects' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View details for JARVIS AI' })).toHaveAttribute('href', '/project/17');
});

test('unavailable projects keep a disabled control without a detail link', () => {
  render(<MemoryRouter><Projects /></MemoryRouter>);

  expect(screen.getByRole('button', { name: 'View Details' })).toBeDisabled();
  expect(document.querySelector('a[href="/project/12"]')).not.toBeInTheDocument();
});
