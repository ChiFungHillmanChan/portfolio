import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import Seo from './Seo';

function Navigate() {
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate('/projects?category=fullstack')}>Projects</button>
      <button onClick={() => navigate('/project/17?ref=home')}>Project detail</button>
      <button onClick={() => navigate('/project/99999')}>Missing project</button>
    </>
  );
}

const meta = (selector) => document.head.querySelector(selector)?.getAttribute('content');

test('updates portfolio route metadata and canonical URL without query parameters', async () => {
  render(<MemoryRouter initialEntries={['/']}><Seo /><Navigate /></MemoryRouter>);

  expect(document.title).toBe('Hillman Chan | Junior Software Engineer');
  expect(meta('meta[name="description"]')).toContain('working with clients');
  expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://hillmanchan.com/');
  expect(meta('meta[property="og:url"]')).toBe('https://hillmanchan.com/');
  expect(meta('meta[name="twitter:card"]')).toBe('summary');

  await userEvent.click(screen.getByRole('button', { name: 'Projects' }));
  expect(document.title).toBe('Projects | Hillman Chan');
  expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://hillmanchan.com/projects');
  expect(meta('meta[property="og:title"]')).toBe('Projects | Hillman Chan');
});

test('uses project details and clears noindex when navigating away from a missing project', async () => {
  render(<MemoryRouter initialEntries={['/project/99999']}><Seo /><Navigate /></MemoryRouter>);

  expect(meta('meta[name="robots"]')).toBe('noindex');
  await userEvent.click(screen.getByRole('button', { name: 'Project detail' }));
  expect(document.title).toBe('JARVIS AI | Hillman Chan');
  expect(meta('meta[name="description"]')).toContain('AI automation startup');
  expect(meta('meta[property="og:description"]')).toContain('AI automation startup');
  expect(meta('meta[name="twitter:description"]')).toContain('AI automation startup');
  expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://hillmanchan.com/project/17');
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
});

test('restores prior head metadata when the portfolio layout unmounts', () => {
  const previousTitle = document.title;
  const existingDescription = document.createElement('meta');
  existingDescription.name = 'description';
  existingDescription.content = 'Original shell description';
  document.head.appendChild(existingDescription);

  const { unmount } = render(<MemoryRouter><Seo /></MemoryRouter>);
  expect(existingDescription.content).toContain('junior software engineer');
  unmount();

  expect(document.title).toBe(previousTitle);
  expect(existingDescription.content).toBe('Original shell description');
  expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  expect(document.head.querySelector('meta[property="og:url"]')).toBeNull();
  existingDescription.remove();
});

test('keeps the coming-soon placeholder out of search results', () => {
  render(<MemoryRouter initialEntries={['/project/12']}><Seo /></MemoryRouter>);

  expect(meta('meta[name="robots"]')).toBe('noindex');
});
