import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import handbooks, { releasedParts } from '../data/handbooks';
import supportLinks, { isStripeCheckoutUrl } from '../data/supportLinks';
import { hasSupported, markSupported, rememberPendingDownload, takePendingDownload } from '../handbookSupport';

const megabytes = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`;
const partNumber = (part) => String(part.number).padStart(2, '0');
const partRange = (parts) => (parts.length === 0
  ? ''
  : parts.length === 1
    ? `Part ${partNumber(parts[0])}`
    : `Parts ${partNumber(parts[0])}–${partNumber(parts[parts.length - 1])}`);

const TopicList = ({ topics, muted }) => (
  <ul className={`grid md:grid-cols-2 gap-x-6 gap-y-1 text-sm ${muted ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
    {topics.map((topic, index) => (
      <li key={topic} className="flex gap-2">
        <span className="font-mono text-xs leading-5 text-gray-400">{index + 1}</span>
        <span lang="zh-HK">{topic}</span>
      </li>
    ))}
  </ul>
);

const primaryAction = 'block w-full rounded-lg px-6 py-3 text-center font-semibold text-white bg-gray-800 hover:bg-gray-900 dark:text-gray-900 dark:bg-white dark:hover:bg-gray-200 transition-colors';
const quietAction = 'mt-3 block w-full text-center text-sm text-gray-600 dark:text-gray-300 hover:underline';

// Starts a download without a click, used on the way back from checkout.
const startDownload = (href) => {
  const link = document.createElement('a');
  link.href = href;
  link.download = '';
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const Modal = ({ titleId, onClose, children }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    dialogRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-2xl p-6 md:p-8 outline-none"
      >
        {children}
      </div>
    </div>
  );
};

// The pop-up shown before a download: an optional one-off contribution, or straight to the file.
// The download is never gated: "Just Download" gives the same file without paying.
const DownloadDialog = ({ part, href, tiers, currencySymbol, onPay, onClose }) => (
  <Modal titleId="download-dialog-title" onClose={onClose}>
    <h2 id="download-dialog-title" className="text-xl font-semibold mb-1 dark:text-white">
      Download Part {partNumber(part)}
    </h2>
    <p className="text-gray-600 dark:text-gray-300 mb-4">
      {part.title} · {part.pages} pages · {megabytes(part.bytes)}
    </p>
    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
      This part is free. If it helps you, you can add an optional one-off contribution.
      There is no subscription and no account, and you get the same file either way.
    </p>

    <div className="grid grid-cols-3 gap-3 mb-3" role="group" aria-label="Optional contribution">
      {tiers.map((tier) => (
        <a
          key={tier.amount}
          href={tier.url}
          rel="noreferrer"
          onClick={onPay}
          aria-label={`Support with ${currencySymbol}${tier.amount}, then download`}
          className="rounded-lg border border-gray-300 dark:border-gray-500 px-3 py-3 text-center font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {currencySymbol}{tier.amount}
        </a>
      ))}
    </div>
    <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
      Choosing an amount takes you to Stripe’s secure checkout, so your card details never reach
      this site. Your download starts as soon as you come back.
    </p>

    <a href={href} download onClick={onClose} className={primaryAction}>
      Just Download
    </a>
    <button type="button" onClick={onClose} className={quietAction}>
      Cancel
    </button>
  </Modal>
);

// Shown on the way back from checkout. The part chosen before paying is already downloading.
const ThanksDialog = ({ part, href, onClose }) => (
  <Modal titleId="thanks-dialog-title" onClose={onClose}>
    <h2 id="thanks-dialog-title" className="text-xl font-semibold mb-2 dark:text-white">
      Thank you for your support
    </h2>
    <p className="text-gray-600 dark:text-gray-300 mb-4">
      Your contribution helps keep this handbook free for everyone.
    </p>
    {part ? (
      <>
        <p className="text-gray-800 dark:text-gray-100 mb-4">
          Part {partNumber(part)} · {part.title} is downloading now.
        </p>
        <a href={href} download className={primaryAction}>
          Download Part {partNumber(part)}
        </a>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Use this button if the download did not start by itself.
        </p>
      </>
    ) : (
      <p className="text-gray-800 dark:text-gray-100">Every released part is ready to download on this page.</p>
    )}
    <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
      From now on, downloads on this device start straight away.
    </p>
    <button type="button" onClick={onClose} className={quietAction}>
      Close
    </button>
  </Modal>
);

const HandbookPage = () => {
  const { slug } = useParams();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(null);
  const closeDialog = useCallback(() => setDownloading(null), []);
  const [thanks, setThanks] = useState(null);
  const closeThanks = useCallback(() => setThanks(null), []);
  const handledReturn = useRef(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const toggle = (number) => setExpanded((current) => {
    const next = new Set(current);
    if (!next.delete(number)) next.add(number);
    return next;
  });
  const handbook = handbooks.find((entry) => entry.slug === slug);
  // Stripe sends a supporter back here with ?thanks=1 once the payment has gone through.
  const returned = new URLSearchParams(search).get('thanks') === '1';

  useEffect(() => {
    if (!returned) {
      handledReturn.current = false;
      return;
    }
    if (handledReturn.current || !handbook) return;
    handledReturn.current = true;
    markSupported(slug);
    const number = takePendingDownload(slug);
    const part = releasedParts(handbook.book).find((entry) => entry.number === number) || null;
    setThanks({ part });
    if (part) startDownload(`${handbook.book.basePath}${part.file}`);
    // Drop ?thanks=1 so a reload or a shared link does not thank or download again.
    navigate(pathname, { replace: true });
  }, [returned, handbook, slug, pathname, navigate]);

  if (!handbook) return <Navigate to="/handbook" replace />;

  const { book, titleLines, lang, summary, goal, access } = handbook;
  const supported = hasSupported(slug);
  const { currencySymbol } = supportLinks;
  // A tier that does not point at Stripe's hosted checkout is never offered.
  const tiers = supportLinks.handbookTiers.filter((option) => isStripeCheckoutUrl(option.url));
  const fileUrl = (part) => `${book.basePath}${part.file}`;
  const released = releasedParts(book);
  const upcoming = book.parts.filter((part) => !part.released);
  const checkedDate = new Date(`${book.checked}T00:00:00Z`)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  const stats = [
    [book.stats.parts, 'parts'],
    [book.stats.topics, 'topics'],
    [book.stats.diagrams, 'diagrams'],
    [book.stats.questions, 'interview Q&As', 'Q&As'],
  ];
  const availability = `${partRange(released)} ${released.length === 1 ? 'is' : 'are'} available now`
    + `${upcoming.length > 0 ? `, and ${partRange(upcoming)} ${upcoming.length === 1 ? 'is' : 'are'} coming soon` : ''}.`;
  const downloadClass = 'inline-flex shrink-0 items-center justify-center rounded-lg px-3 md:px-5 py-2 text-sm md:text-base font-semibold text-white bg-gray-800 hover:bg-gray-900 dark:text-gray-900 dark:bg-white dark:hover:bg-gray-200 transition-colors';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-20">
      <p className="mb-3 md:mb-6 text-sm">
        <Link to="/handbook" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">← All handbooks</Link>
      </p>

      {/* Kept short on a phone so the downloads sit on the first screen. */}
      <header className="md:text-center mb-4 md:mb-10">
        <p className="text-xs md:text-sm font-semibold tracking-widest uppercase text-gray-500 dark:text-gray-400 mb-1 md:mb-3">
          {access === 'free' ? 'Free handbook' : 'Handbook'}
        </p>
        <h1 lang={lang} className="text-2xl md:text-5xl font-bold mb-2 md:mb-5 dark:text-white">
          {titleLines.map((line) => <span key={line} className="inline-block">{line}</span>)}
        </h1>
        <p lang={lang} style={{ textWrap: 'balance' }} className="text-base md:text-2xl text-gray-800 dark:text-gray-100">
          <span className="font-semibold">{goal.label}</span>：{goal.lead}
        </p>
        <p lang={lang} className="hidden md:block mt-3 text-lg text-gray-600 dark:text-gray-300">{goal.text}</p>
      </header>

      <dl className="grid grid-cols-4 gap-2 md:gap-4 mb-5 md:mb-4">
        {stats.map(([value, label, shortLabel]) => (
          <div key={label} className="rounded-lg md:rounded-xl bg-white dark:bg-gray-700 shadow px-1 py-2 md:p-4 text-center">
            <dd className="text-lg md:text-3xl font-bold dark:text-white">{value}</dd>
            <dt className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
              <span className="md:hidden">{shortLabel || label}</span>
              <span className="hidden md:inline">{label}</span>
            </dt>
          </div>
        ))}
      </dl>
      <p className="hidden md:block text-center text-gray-600 dark:text-gray-300 mb-10">
        {availability} Each part is a separate PDF booklet.
      </p>

      <section aria-labelledby="handbook-contents" className="mb-8 md:mb-10">
        <h2 id="handbook-contents" className="text-xl md:text-2xl font-semibold mb-1 md:mb-2 dark:text-white">Contents</h2>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mb-3 md:mb-4">
          <span className="md:hidden">{availability} </span>
          <span className="hidden md:inline">Every part and the topics it covers. </span>
          {supported
            ? 'Thank you for supporting this handbook. Downloads start straight away.'
            : 'Downloads are free, and a contribution is optional and one-off.'}
        </p>
        <ol className="space-y-3 md:space-y-4">
          {book.parts.map((part) => {
            const open = expanded.has(part.number);
            const detailsId = `part-${part.number}-details`;
            return (
              <li
                key={part.number}
                data-part={part.number}
                className={`rounded-xl md:rounded-2xl shadow p-4 md:p-6 ${part.released ? 'bg-white dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-800'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className={`text-base md:text-lg font-semibold leading-snug ${part.released ? 'dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                      <span className="font-mono text-sm text-gray-500 dark:text-gray-400 mr-2 md:mr-3">{partNumber(part)}</span>
                      {part.title}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                      {part.topics.length} topics · {part.pages} pages{part.released && ` · ${megabytes(part.bytes)}`}
                    </p>
                  </div>
                  {!part.released && (
                    <span className="shrink-0 rounded-full border border-gray-300 dark:border-gray-500 px-3 md:px-4 py-1 text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300">
                      Coming soon
                    </span>
                  )}
                  {part.released && tiers.length > 0 && !supported && (
                    <button type="button" onClick={() => setDownloading(part)} className={downloadClass} aria-label={`Download Part ${partNumber(part)}: ${part.title}`}>
                      Download PDF
                    </button>
                  )}
                  {part.released && (tiers.length === 0 || supported) && (
                    <a href={fileUrl(part)} download className={downloadClass} aria-label={`Download Part ${partNumber(part)}: ${part.title}`}>
                      Download PDF
                    </a>
                  )}
                </div>

                {/* On a phone the topics are tucked away until asked for; on wider screens they always show. */}
                <button
                  type="button"
                  onClick={() => toggle(part.number)}
                  aria-expanded={open}
                  aria-controls={detailsId}
                  className="md:hidden mt-2 text-sm text-gray-600 dark:text-gray-300 underline underline-offset-2"
                >
                  {open ? 'Hide topics' : `What is inside (${part.topics.length} topics)`}
                </button>
                <div id={detailsId} className={`${open ? 'block' : 'hidden'} md:block mt-3`}>
                  <p lang={lang} className={`text-sm mb-3 ${part.released ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                    {part.intro}
                  </p>
                  <TopicList topics={part.topics} muted={!part.released} />
                </div>
              </li>
            );
          })}
        </ol>
        {tiers.length === 0 && (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            Want to say thanks?{' '}
            <a href={supportLinks.buyMeACoffee} target="_blank" rel="noopener noreferrer" className="text-gray-700 dark:text-gray-200 underline">
              Buy me a coffee
            </a>.
          </p>
        )}
      </section>

      <section aria-labelledby="handbook-about" className="text-gray-700 dark:text-gray-200">
        <h2 id="handbook-about" className="text-xl md:text-2xl font-semibold mb-3 dark:text-white">About this handbook</h2>
        <p lang={lang} className="md:hidden mb-3">{goal.text}</p>
        <p className="mb-3">{summary}</p>
        <p className="mb-2">Each topic gives you:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>The concept, a diagram, the key points and how the industry actually uses it.</li>
          <li>Common mistakes, with what goes wrong and what to do instead.</li>
          <li>Interview questions, each with a short answer and an in-depth one.</li>
        </ul>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          Model names, prices and regulation dates were last checked on {checkedDate}. They change quickly, so confirm them against official documentation before relying on them.
        </p>
      </section>

      {downloading && (
        <DownloadDialog
          part={downloading}
          href={fileUrl(downloading)}
          tiers={tiers}
          currencySymbol={currencySymbol}
          onPay={() => rememberPendingDownload(slug, downloading.number)}
          onClose={closeDialog}
        />
      )}
      {thanks && (
        <ThanksDialog
          part={thanks.part}
          href={thanks.part ? fileUrl(thanks.part) : undefined}
          onClose={closeThanks}
        />
      )}
    </div>
  );
};

export default HandbookPage;
