import React, { Suspense, lazy } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';
import Layout from './Layout';

// A page whose script arrives a moment after the tap, like every lazily loaded page of the site.
const slowPage = (text) => lazy(() => new Promise((resolve) => {
  setTimeout(() => resolve({ default: () => <h1>{text}</h1> }), 60);
}));

const renderSite = () => {
  const About = slowPage('About page');
  const router = createMemoryRouter(
    createRoutesFromElements(
      <Route element={<Layout />}>
        <Route path="/handbook" element={<h1>Handbook page</h1>} />
        <Route path="/about" element={<About />} />
      </Route>,
    ),
    { initialEntries: ['/handbook'] },
  );
  return render(
    <Suspense fallback={<p>whole screen replaced</p>}>
      <RouterProvider router={router} />
    </Suspense>,
  );
};

const mobileMenu = () => document.querySelector('nav .fixed.w-64');

beforeEach(() => window.localStorage.clear());

test('the header stays on screen while the next page loads', async () => {
  renderSite();

  await userEvent.click(screen.getAllByRole('link', { name: 'About' })[0]);

  expect(screen.queryByText('whole screen replaced')).not.toBeInTheDocument();
  expect(screen.getByRole('banner')).toBeVisible();
  expect(screen.getByRole('status')).toHaveTextContent('Opening page');
  expect(await screen.findByRole('heading', { name: 'About page' })).toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('tapping a page in the phone menu closes the menu', async () => {
  renderSite();

  await userEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
  expect(mobileMenu()).toBeInTheDocument();
  await userEvent.click(mobileMenu().querySelector('a[href="/about"]'));

  expect(await screen.findByRole('heading', { name: 'About page' })).toBeInTheDocument();
  await waitFor(() => expect(mobileMenu()).not.toBeInTheDocument());
});

test('only the current page is highlighted in the phone menu', async () => {
  renderSite();

  await userEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
  await userEvent.click(mobileMenu().querySelector('a[href="/about"]'));
  await screen.findByRole('heading', { name: 'About page' });
  await waitFor(() => expect(mobileMenu()).not.toBeInTheDocument());

  await userEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
  const highlighted = [...mobileMenu().querySelectorAll('a')]
    .filter((link) => link.className.split(' ').includes('text-blue-500'))
    .map((link) => link.getAttribute('href'));
  expect(highlighted).toEqual(['/about']);
});
