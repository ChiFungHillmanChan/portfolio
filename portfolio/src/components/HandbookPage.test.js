import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import HandbookIndexPage from './HandbookIndexPage';
import HandbookPage from './HandbookPage';
import handbook from '../data/handbook';
import handbooks from '../data/handbooks';
import supportLinks, { isStripeCheckoutUrl } from '../data/supportLinks';
import { hasSupported, rememberPendingDownload } from '../handbookSupport';

const SLUG = 'ai-engineer';
const PENDING_KEY = 'handbook-pending-download';
const RELEASED = [1, 2, 3];
const released = handbook.parts.filter((part) => part.released);
// Every file a reader can download straight away: the intro booklet (Part 00) and the released parts.
const downloadable = [handbook.intro, ...released];
const english = (part) => ({ ...part, ...part.en });
const chooseEnglish = () => userEvent.click(screen.getByRole('radio', { name: 'English' }));
const upcoming = handbook.parts.filter((part) => !part.released);
const hrefOf = (part) => `${handbook.basePath}${part.file}?v=${part.version}`;
// The download links: topic links point into the same PDFs but end in #page=<n>.
const pdfLinks = () => [...document.querySelectorAll('a[href*=".pdf"]:not([href*="#page="])')];
const partCard = (part) => document.querySelector(`[data-part="${part.number}"]`);
const openDialog = async (part) => {
  await userEvent.click(within(partCard(part)).getByRole('button', { name: /^Download Part/ }));
  return screen.getByRole('dialog');
};

const Address = () => {
  const { pathname, search } = useLocation();
  return <output data-testid="address">{pathname}{search}</output>;
};

const renderAt = (entry = '/handbook/ai-engineer') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/handbook" element={<HandbookIndexPage />} />
        <Route path="/handbook/:slug" element={<HandbookPage />} />
      </Routes>
      <Address />
    </MemoryRouter>,
  );

const configuredTiers = supportLinks.handbookTiers;
const configuredCustom = supportLinks.handbookCustom;
const configuredHandbooks = [...handbooks];
let openSpy;
let autoDownloads;
let autoDownloadSpy;
beforeEach(() => {
  window.localStorage.clear();
  openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
  // A download the page starts by itself calls click() on a link it made; a person's click does not.
  autoDownloads = [];
  autoDownloadSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function recordClick() {
    autoDownloads.push({ href: this.getAttribute('href'), download: this.getAttribute('download') });
  });
});
afterEach(() => {
  supportLinks.handbookTiers = configuredTiers;
  supportLinks.handbookCustom = configuredCustom;
  handbooks.splice(0, handbooks.length, ...configuredHandbooks);
  openSpy.mockRestore();
  autoDownloadSpy.mockRestore();
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
  test('every downloadable file carries its own version, so an updated PDF gets a new address', () => {
    const files = downloadable.flatMap((part) => [part, part.en]);
    files.forEach((file) => expect(file.version).toMatch(/^[0-9a-f]{10}$/));
    expect(new Set(files.map((file) => file.version)).size).toBe(files.length);
    upcoming.forEach((part) => expect(part).not.toHaveProperty('version'));
  });

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
    const toggle = card.getByRole('button', { name: `What is inside (${released[1].topics.length} topics)` });
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

  test('the pop-up thanks the reader, says support is optional, and offers HK$0, HK$10, HK$20 and Customise', async () => {
    renderAt();
    const dialog = await openDialog(released[0]);

    expect(dialog).toHaveTextContent('Thank you so much for your interest!');
    expect(dialog).toHaveTextContent('completely optional');
    expect(dialog).toHaveTextContent('I will keep doing my best to improve it and help you learn more');
    expect(within(dialog).getAllByRole('radio').map((option) => option.textContent))
      .toEqual(['HK$0', 'HK$10', 'HK$20', 'Customise']);
    within(dialog).getAllByRole('radio').forEach((option) => expect(option).toHaveAttribute('aria-checked', 'false'));
    expect(dialog).not.toHaveTextContent('HK$50');
    expect(dialog).not.toHaveTextContent('Just Download');
  });

  test('Download is disabled, and there is no file link, until an amount is chosen', async () => {
    renderAt();
    const dialog = await openDialog(released[0]);

    expect(within(dialog).getByRole('button', { name: 'Download' })).toBeDisabled();
    expect(within(dialog).queryByRole('link')).not.toBeInTheDocument();
    expect(pdfLinks()).toHaveLength(0);
    expect(dialog).toHaveTextContent('Choose an amount to download. HK$0 is perfectly fine.');
  });

  test.each(RELEASED)('Part %i: choosing HK$0 downloads the file without going to Stripe', async (number) => {
    renderAt();
    const part = handbook.parts.find((entry) => entry.number === number);
    const dialog = await openDialog(part);

    expect(dialog).toHaveTextContent(`Download Part 0${number}`);
    await userEvent.click(within(dialog).getByRole('radio', { name: 'HK$0' }));
    expect(within(dialog).getByRole('radio', { name: 'HK$0' })).toHaveAttribute('aria-checked', 'true');
    expect(dialog).toHaveTextContent('No payment. Your download starts straight away.');
    const free = within(dialog).getByRole('link', { name: 'Download' });
    expect(free).toHaveAttribute('href', hrefOf(part));
    expect(free).toHaveAttribute('download', part.file);

    expect(fireEvent.click(free)).toBe(true);
    expect(openSpy).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(PENDING_KEY)).toBeNull();
    expect(hasSupported(SLUG)).toBe(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test.each(RELEASED)('Part %i: each paid amount goes to its Stripe checkout and remembers that part', async (number) => {
    renderAt();
    const part = handbook.parts.find((entry) => entry.number === number);
    const dialog = await openDialog(part);
    const paid = [
      ...configuredTiers.map((tier) => [`HK$${tier.amount}`, tier.url]),
      ['Customise', configuredCustom.url],
    ];

    for (const [label, url] of paid) {
      await userEvent.click(within(dialog).getByRole('radio', { name: label }));
      expect(within(dialog).getAllByRole('radio').filter((option) => option.getAttribute('aria-checked') === 'true'))
        .toHaveLength(1);
      const pay = within(dialog).getByRole('link', { name: 'Support and download' });
      const checkout = new URL(pay.getAttribute('href'));
      expect(`${checkout.origin}${checkout.pathname}`).toBe(url);
      expect(checkout.searchParams.get('client_reference_id')).toBe(`${SLUG}__p0${number}__zh`);
      expect(pay).not.toHaveAttribute('target');
      expect(pay).not.toHaveAttribute('download');
      expect(pdfLinks()).toHaveLength(0);

      window.localStorage.clear();
      expect(fireEvent.click(pay)).toBe(true);
      expect(JSON.parse(window.localStorage.getItem(PENDING_KEY))).toMatchObject({ slug: SLUG, number });
    }
    expect(openSpy).not.toHaveBeenCalled();
    expect(autoDownloads).toEqual([]);
    expect(hasSupported(SLUG)).toBe(false);
  });

  test('Customise explains that the amount is set on Stripe, from the smallest amount it accepts', async () => {
    renderAt();
    const dialog = await openDialog(released[0]);

    await userEvent.click(within(dialog).getByRole('radio', { name: 'Customise' }));
    expect(dialog).toHaveTextContent(`each unit is HK$1 (from HK$${configuredCustom.minimum})`);
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

  test('every configured amount, and Customise, is a distinct Stripe checkout link', () => {
    const urls = [...configuredTiers.map((tier) => tier.url), configuredCustom.url];

    expect(configuredTiers.map((tier) => tier.amount)).toEqual([10, 20]);
    expect(configuredCustom.minimum).toBe(5);
    expect(new Set(urls).size).toBe(urls.length);
    urls.forEach((url) => expect(isStripeCheckoutUrl(url)).toBe(true));
  });

  test('a Customise link that does not point at Stripe checkout is left out', async () => {
    supportLinks.handbookCustom = { url: 'https://buy.stripe.com.example.net/abc', minimum: 5 };
    renderAt();
    const dialog = await openDialog(released[0]);

    expect(within(dialog).getAllByRole('radio').map((option) => option.textContent)).toEqual(['HK$0', 'HK$10', 'HK$20']);
  });

  test('a tier that does not point at Stripe checkout is never offered', () => {
    supportLinks.handbookTiers = [
      { amount: 10, url: 'https://buy.stripe.com.example.net/abc' },
      { amount: 20, url: 'http://buy.stripe.com/abc' },
      { amount: 50, url: 'not a url' },
    ];
    supportLinks.handbookCustom = { url: 'javascript:alert(1)', minimum: 5 };
    renderAt();

    // With nothing to offer there is no pop-up: each released part is a plain download link.
    expect(pdfLinks().map((link) => link.getAttribute('href'))).toEqual(downloadable.map(hrefOf));
    pdfLinks().forEach((link, index) => expect(link).toHaveAttribute('download', downloadable[index].file));
    expect(screen.getByRole('link', { name: 'Buy me a coffee' })).toHaveAttribute('href', supportLinks.buyMeACoffee);
    expect(fireEvent.click(pdfLinks()[0])).toBe(true);
    expect(openSpy).not.toHaveBeenCalled();
  });

  describe('coming back from checkout', () => {
    const thanksDialog = () => screen.getByRole('dialog', { name: 'Thank you for your support' });

    test.each(RELEASED)('thanks the supporter and downloads Part %i, the part chosen before paying', (number) => {
      const part = handbook.parts.find((entry) => entry.number === number);
      rememberPendingDownload(SLUG, number);
      renderAt('/handbook/ai-engineer?thanks=1');

      expect(thanksDialog()).toHaveTextContent(`Part 0${number} · ${part.title} is downloading now`);
      expect(autoDownloads).toEqual([{ href: hrefOf(part), download: part.file }]);
      const again = within(thanksDialog()).getByRole('link', { name: `Download Part 0${number}` });
      expect(again).toHaveAttribute('href', hrefOf(part));
      expect(again).toHaveAttribute('download', part.file);
    });

    test('the address is cleaned and the chosen part forgotten, so a reload does not download again', () => {
      rememberPendingDownload(SLUG, 2);
      const first = renderAt('/handbook/ai-engineer?thanks=1');

      expect(screen.getByTestId('address').textContent).toBe('/handbook/ai-engineer');
      expect(window.localStorage.getItem(PENDING_KEY)).toBeNull();
      first.unmount();

      renderAt('/handbook/ai-engineer?thanks=1');
      expect(thanksDialog()).toBeInTheDocument();
      expect(autoDownloads).toHaveLength(1);
    });

    test('with no part chosen it still says thank you and points at the parts', () => {
      renderAt('/handbook/ai-engineer?thanks=1');

      expect(thanksDialog()).toHaveTextContent('Every released part is ready to download on this page');
      expect(within(thanksDialog()).queryByRole('link')).not.toBeInTheDocument();
      expect(autoDownloads).toEqual([]);
    });

    test.each([
      ['a part that is not released', () => rememberPendingDownload(SLUG, upcoming[0].number)],
      ['a choice made for another handbook', () => rememberPendingDownload('another', 1)],
      ['a choice made long ago', () => rememberPendingDownload(SLUG, 1, Date.now() - 7 * 60 * 60 * 1000)],
      ['a damaged record', () => window.localStorage.setItem(PENDING_KEY, '{not json')],
      ['a record with a made-up part', () => window.localStorage.setItem(PENDING_KEY, JSON.stringify({ slug: SLUG, number: '../x', at: Date.now() }))],
    ])('never downloads for %s', (_, arrange) => {
      arrange();
      renderAt('/handbook/ai-engineer?thanks=1');

      expect(thanksDialog()).toBeInTheDocument();
      expect(autoDownloads).toEqual([]);
    });

    test('after the thank-you closes, every released part downloads straight away with no pop-up', async () => {
      rememberPendingDownload(SLUG, 1);
      renderAt('/handbook/ai-engineer?thanks=1');

      await userEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(hasSupported(SLUG)).toBe(true);
      expect(pdfLinks().map((link) => link.getAttribute('href'))).toEqual(downloadable.map(hrefOf));
      pdfLinks().forEach((link, index) => expect(link).toHaveAttribute('download', downloadable[index].file));
      expect(screen.queryByRole('button', { name: /^Download Part/ })).not.toBeInTheDocument();
      expect(screen.getByText(/Thank you for supporting this handbook\. Downloads start straight away\./)).toBeInTheDocument();
    });

    test('a supporter who comes back later still downloads straight away, and nothing starts by itself', () => {
      rememberPendingDownload(SLUG, 1);
      renderAt('/handbook/ai-engineer?thanks=1').unmount();
      autoDownloads.length = 0;

      renderAt();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(pdfLinks().map((link) => link.getAttribute('href'))).toEqual(downloadable.map(hrefOf));
      expect(autoDownloads).toEqual([]);
    });

    test('someone who has not supported still gets the pop-up, with the free download in it', async () => {
      renderAt();

      expect(pdfLinks()).toHaveLength(0);
      const dialog = await openDialog(released[0]);
      await userEvent.click(within(dialog).getByRole('radio', { name: 'HK$0' }));
      expect(within(dialog).getByRole('link', { name: 'Download' })).toHaveAttribute('href', hrefOf(released[0]));
    });
  });
});

describe('PDF language', () => {

  test('every part has an English edition with the same number of topics, and released parts have an English file', () => {
    for (const part of handbook.parts) {
      expect(part.en.topics).toHaveLength(part.topics.length);
      if (part.released) {
        expect(part.en.file).toMatch(/_EN\.pdf$/);
        expect(part.en.file).not.toBe(part.file);
      } else {
        expect(part.en.file).toBeUndefined();
      }
    }
  });

  test('Traditional Chinese is chosen by default and the Chinese file downloads', async () => {
    renderAt();

    expect(screen.getByRole('radio', { name: '繁體中文' })).toHaveAttribute('aria-checked', 'true');
    const dialog = await openDialog(released[0]);
    expect(dialog).toHaveTextContent('Traditional Chinese');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'HK$0' }));
    expect(within(dialog).getByRole('link', { name: 'Download' })).toHaveAttribute('href', hrefOf(released[0]));
  });

  test('choosing English shows the English topics, including for parts still to come', async () => {
    renderAt();
    await chooseEnglish();

    expect(screen.getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true');
    for (const part of handbook.parts) {
      const card = partCard(part);
      expect(card).toHaveTextContent(part.en.title);
      for (const topic of part.en.topics) expect(card).toHaveTextContent(topic);
    }
  });

  test.each(RELEASED)('Part %i: with English chosen, HK$0 downloads the English file', async (number) => {
    renderAt();
    await chooseEnglish();
    const part = handbook.parts.find((entry) => entry.number === number);
    const dialog = await openDialog(part);

    expect(dialog).toHaveTextContent(`${part.en.title} · English · ${part.en.pages} pages`);
    await userEvent.click(within(dialog).getByRole('radio', { name: 'HK$0' }));
    expect(within(dialog).getByRole('link', { name: 'Download' })).toHaveAttribute('href', hrefOf(english(part)));
  });

  test('the choice is remembered, so the English file is the one delivered after checkout', async () => {
    const first = renderAt();
    await chooseEnglish();
    first.unmount();

    const part = released[1];
    rememberPendingDownload(SLUG, part.number);
    renderAt('/handbook/ai-engineer?thanks=1');

    expect(autoDownloads).toEqual([{ href: hrefOf(english(part)), download: english(part).file }]);
    expect(screen.getByRole('dialog', { name: 'Thank you for your support' }))
      .toHaveTextContent(`Part 0${part.number} · ${part.en.title} is downloading now`);
  });

  test('a supporter downloads the English files straight away', async () => {
    markSupportedForTest();
    renderAt();
    await chooseEnglish();

    expect(pdfLinks().map((link) => link.getAttribute('href'))).toEqual(downloadable.map((part) => hrefOf(english(part))));
  });
});

describe('file sizes', () => {
  test('the page shows topics and pages for every part, and never a file size', async () => {
    renderAt();
    for (const part of handbook.parts) {
      expect(partCard(part)).toHaveTextContent(`${part.topics.length} topics · ${part.pages} pages`);
    }
    expect(document.body).not.toHaveTextContent(/\d MB/);
    const dialog = await openDialog(released[0]);
    expect(dialog).toHaveTextContent(`${released[0].pages} pages`);
    expect(dialog).not.toHaveTextContent(/MB/);
  });
});

function markSupportedForTest() {
  window.localStorage.setItem(`handbook-supported:${SLUG}`, '1');
}

describe('intro booklet', () => {
  test('Part 00 is listed first, in both languages, with its sections and pages', async () => {
    renderAt();
    const cards = [...document.querySelectorAll('[data-part]')];
    expect(cards[0]).toBe(partCard(handbook.intro));
    expect(cards[0]).toHaveTextContent(`00${handbook.intro.title}`);
    expect(cards[0]).toHaveTextContent(`${handbook.intro.topics.length} sections · ${handbook.intro.pages} pages`);
    handbook.intro.topics.forEach((section) => expect(cards[0]).toHaveTextContent(section));

    await chooseEnglish();
    handbook.intro.en.topics.forEach((section) => expect(partCard(handbook.intro)).toHaveTextContent(section));
  });

  test('Part 00 downloads through the same pop-up, in the chosen language', async () => {
    renderAt();
    let dialog = await openDialog(handbook.intro);
    expect(dialog).toHaveTextContent('Download Part 00');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'HK$0' }));
    expect(within(dialog).getByRole('link', { name: 'Download' })).toHaveAttribute('href', hrefOf(handbook.intro));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await chooseEnglish();
    dialog = await openDialog(handbook.intro);
    await userEvent.click(within(dialog).getByRole('radio', { name: 'HK$0' }));
    expect(within(dialog).getByRole('link', { name: 'Download' })).toHaveAttribute('href', hrefOf(handbook.intro.en));
  });

  test('coming back from checkout after choosing Part 00 downloads the intro', () => {
    rememberPendingDownload(SLUG, 0);
    renderAt('/handbook/ai-engineer?thanks=1');
    expect(autoDownloads).toEqual([{ href: hrefOf(handbook.intro), download: handbook.intro.file }]);
  });
});

describe('topic pages', () => {
  const topicLinks = (part) => [...partCard(part).querySelectorAll('a[href*="#page="]')];

  test('every topic shows the page it starts on, counted in its own booklet', () => {
    for (const part of [handbook.intro, ...handbook.parts]) {
      expect(part.topicPages).toHaveLength(part.topics.length);
      expect(part.en.topicPages).toHaveLength(part.en.topics.length);
      [[part.topicPages, part.pages], [part.en.topicPages, part.en.pages]].forEach(([pages, total]) => {
        expect([...pages].sort((a, b) => a - b)).toEqual(pages);
        expect(pages[0]).toBeGreaterThan(1);
        expect(pages[pages.length - 1]).toBeLessThanOrEqual(total);
      });
    }
  });

  test('a released topic opens its PDF at that page in a new tab; an unreleased one is not a link', () => {
    renderAt();
    for (const part of [handbook.intro, ...released]) {
      const links = topicLinks(part);
      expect(links.map((link) => link.getAttribute('href')))
        .toEqual(part.topicPages.map((page) => `${hrefOf(part)}#page=${page}`));
      links.forEach((link, index) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveTextContent(`p.${part.topicPages[index]}`);
      });
    }
    for (const part of upcoming) {
      expect(topicLinks(part)).toHaveLength(0);
      expect(partCard(part)).toHaveTextContent(`p.${part.topicPages[0]}`);
    }
  });

  test('in English the links go to the English booklet and its own page numbers', async () => {
    renderAt();
    await chooseEnglish();
    const part = released[0];
    expect(topicLinks(part).map((link) => link.getAttribute('href')))
      .toEqual(part.en.topicPages.map((page) => `${hrefOf(part.en)}#page=${page}`));
  });
});
