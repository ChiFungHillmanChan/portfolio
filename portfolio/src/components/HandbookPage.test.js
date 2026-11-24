import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import HandbookIndexPage from './HandbookIndexPage';
import HandbookPage from './HandbookPage';
import handbook from '../data/handbook';
import handbooks from '../data/handbooks';
import supportLinks, { isStripeCheckoutUrl } from '../data/supportLinks';

const RELEASED = [1, 2, 3];
const released = handbook.parts.filter((part) => part.released);
const upcoming = handbook.parts.filter((part) => !part.released);
const hrefOf = (part) => `${handbook.basePath}${part.file}`;
const pdfLinks = () => [...document.querySelectorAll('a[href$=".pdf"]')];
const partCard = (part) => document.querySelector(`[data-part="${part.number}"]`);
const openDialog = async (part) => {
  await userEvent.click(within(partCard(part)).getByRole('button', { name: /^Download Part/ }));
  return screen.getByRole('dialog');
};

const renderAt = (entry = '/handbook/ai-engineer') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/handbook" element={<HandbookIndexPage />} />
        <Route path="/handbook/:slug" element={<HandbookPage />} />
      </Routes>
    </MemoryRouter>,
  );

const configuredTiers = supportLinks.handbookTiers;
const configuredHandbooks = [...handbooks];
let openSpy;
beforeEach(() => {
  openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
});
afterEach(() => {
  supportLinks.handbookTiers = configuredTiers;
  handbooks.splice(0, handbooks.length, ...configuredHandbooks);
  openSpy.mockRestore();
});

describe('handbook catalogue', () => {
  test('lists only the AI engineer handbook, under Free, linking to its own page', () => {
    renderAt('/handbook');

    expect(screen.getByRole('heading', { name: 'Free' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Paid' })).not.toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/handbook/ai-engineer');
    expect(links[0]).toHaveTextContent('AI 軟件工程師完整學習手冊');
    expect(links[0]).toHaveTextContent('3 of 10 parts available now');
    expect(links[0]).toHaveTextContent('目標：成為 Software Engineer 或 AI Engineer 之路');
    expect(pdfLinks()).toHaveLength(0);
  });

  test('a paid handbook appears in its own Paid section', () => {
    handbooks.push({ ...configuredHandbooks[0], slug: 'another', access: 'paid', title: 'Another handbook' });
    renderAt('/handbook');

    const paid = screen.getByRole('heading', { name: 'Paid' }).closest('section');
    expect(within(paid).getByRole('link')).toHaveTextContent('Another handbook');
    const free = screen.getByRole('heading', { name: 'Free' }).closest('section');
    expect(within(free).getAllByRole('link')).toHaveLength(1);
  });

  test('an unknown handbook address goes back to the catalogue', () => {
    renderAt('/handbook/does-not-exist');

    expect(screen.getByRole('heading', { name: 'Handbooks' })).toBeInTheDocument();
  });
});

describe('handbook page', () => {
  test('only Parts 01 to 03 are released, and unreleased parts carry no file', () => {
    expect(released.map((part) => part.number)).toEqual(RELEASED);
    released.forEach((part) => expect(part.file).toMatch(/\.pdf$/));
    upcoming.forEach((part) => {
      expect(part).not.toHaveProperty('file');
      expect(part).not.toHaveProperty('bytes');
    });
  });

  test('shows the contents: every part with every topic title', () => {
    renderAt();

    expect(screen.getByRole('heading', { name: 'Contents' })).toBeInTheDocument();
    handbook.parts.forEach((part) => {
      const card = within(partCard(part));
      expect(card.getByRole('heading', { name: new RegExp(part.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toBeInTheDocument();
      part.topics.forEach((topic) => expect(card.getByText(topic)).toBeInTheDocument());
    });
  });

  test('shows the 目標 of the handbook', () => {
    renderAt();
    const { goal } = configuredHandbooks[0];

    expect(screen.getByRole('banner')).toHaveTextContent(`目標：${goal.lead}`);
    expect(screen.getAllByText(goal.text).length).toBeGreaterThan(0);
  });

  test('each part shows what it is for', () => {
    renderAt();

    handbook.parts.forEach((part) => {
      expect(part.intro.length).toBeGreaterThan(20);
      expect(within(partCard(part)).getByText(part.intro)).toBeInTheDocument();
    });
  });

  test('on a phone a part opens and closes its topics', async () => {
    renderAt();
    const card = within(partCard(released[1]));
    const toggle = card.getByRole('button', { name: /^What is inside \(9 topics\)$/ });
    const details = document.getElementById(toggle.getAttribute('aria-controls'));

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(details).toHaveClass('hidden', 'md:block');
    await userEvent.click(toggle);
    expect(card.getByRole('button', { name: 'Hide topics' })).toHaveAttribute('aria-expanded', 'true');
    expect(details).not.toHaveClass('hidden');
    await userEvent.click(card.getByRole('button', { name: 'Hide topics' }));
    expect(details).toHaveClass('hidden');
  });

  test('released parts can be downloaded and the rest say coming soon', () => {
    renderAt();

    released.forEach((part) => {
      expect(within(partCard(part)).getByRole('button', { name: /^Download Part/ })).toBeInTheDocument();
      expect(within(partCard(part)).queryByText('Coming soon')).not.toBeInTheDocument();
    });
    upcoming.forEach((part) => {
      expect(within(partCard(part)).getByText('Coming soon')).toBeInTheDocument();
      expect(within(partCard(part)).queryByRole('button', { name: /download/i })).not.toBeInTheDocument();
      expect(within(partCard(part)).queryByRole('link')).not.toBeInTheDocument();
    });
    expect(screen.getAllByText(/Parts 01–03 are available now, and Parts 04–10 are coming soon/).length).toBeGreaterThan(0);
  });

  test('there is no full-book download and no file link before the pop-up opens', () => {
    renderAt();

    expect(pdfLinks()).toHaveLength(0);
    expect(screen.queryByText(/full book/i)).not.toBeInTheDocument();
  });

  test.each(RELEASED)('Part %i: the pop-up offers a free download that does not open Stripe', async (number) => {
    renderAt();
    const part = handbook.parts.find((entry) => entry.number === number);
    const dialog = await openDialog(part);

    expect(dialog).toHaveTextContent(`Download Part 0${number}`);
    expect(dialog).toHaveTextContent('optional one-off contribution');
    const free = within(dialog).getByRole('link', { name: 'Just Download' });
    expect(free).toHaveAttribute('href', hrefOf(part));
    expect(free).toHaveAttribute('download');

    expect(fireEvent.click(free)).toBe(true);
    expect(openSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test.each(RELEASED)('Part %i: each amount opens its Stripe link and still downloads that part', async (number) => {
    renderAt();
    const part = handbook.parts.find((entry) => entry.number === number);

    for (const tier of configuredTiers) {
      const dialog = await openDialog(part);
      const pay = within(dialog).getByRole('link', { name: `Support with HK$${tier.amount} and download` });
      expect(pay).toHaveAttribute('href', hrefOf(part));
      expect(pay).toHaveAttribute('download');

      expect(fireEvent.click(pay)).toBe(true);
      expect(openSpy).toHaveBeenLastCalledWith(tier.url, '_blank', 'noopener,noreferrer');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }
    expect(openSpy).toHaveBeenCalledTimes(configuredTiers.length);
  });

  test('the pop-up closes with Cancel or Escape without downloading or paying', async () => {
    renderAt();

    let dialog = await openDialog(released[0]);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    dialog = await openDialog(released[0]);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
  });

  test('every configured tier is a distinct Stripe checkout link', () => {
    const urls = configuredTiers.map((tier) => tier.url);

    expect(configuredTiers.map((tier) => tier.amount)).toEqual([10, 20, 50]);
    expect(new Set(urls).size).toBe(urls.length);
    urls.forEach((url) => expect(isStripeCheckoutUrl(url)).toBe(true));
  });

  test('a tier that does not point at Stripe checkout is never offered', () => {
    supportLinks.handbookTiers = [
      { amount: 10, url: 'https://buy.stripe.com.example.net/abc' },
      { amount: 20, url: 'http://buy.stripe.com/abc' },
      { amount: 50, url: 'not a url' },
    ];
    renderAt();

    // With nothing to offer there is no pop-up: each released part is a plain download link.
    expect(pdfLinks().map((link) => link.getAttribute('href'))).toEqual(released.map(hrefOf));
    pdfLinks().forEach((link) => expect(link).toHaveAttribute('download'));
    expect(screen.getByRole('link', { name: 'Buy me a coffee' })).toHaveAttribute('href', supportLinks.buyMeACoffee);
    expect(fireEvent.click(pdfLinks()[0])).toBe(true);
    expect(openSpy).not.toHaveBeenCalled();
  });

  test('shows a thank-you message after returning from payment', () => {
    renderAt('/handbook/ai-engineer?thanks=1');

    expect(screen.getByRole('status')).toHaveTextContent('Thank you for supporting the handbook');
  });
});
