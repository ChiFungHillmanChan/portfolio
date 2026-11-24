import React from 'react';
import { Link } from 'react-router-dom';
import handbooks, { ACCESS_SECTIONS, releasedParts } from '../data/handbooks';

const availability = (book) => {
  const released = releasedParts(book).length;
  return released === book.parts.length
    ? `All ${book.parts.length} parts available`
    : `${released} of ${book.parts.length} parts available now`;
};

const HandbookIndexPage = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-20">
    <header className="text-center mb-8 md:mb-10">
      <h1 className="text-3xl md:text-5xl font-bold mb-4 dark:text-white">Handbooks</h1>
      <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
        Study guides I have written, as PDF booklets you can download one part at a time.
      </p>
    </header>

    {ACCESS_SECTIONS.map(({ access, heading }) => {
      const items = handbooks.filter((handbook) => handbook.access === access);
      if (items.length === 0) return null;
      return (
        <section key={access} aria-labelledby={`handbooks-${access}`} className="mb-10">
          <h2 id={`handbooks-${access}`} className="text-sm font-semibold tracking-widest uppercase text-gray-500 dark:text-gray-400 mb-4">
            {heading}
          </h2>
          <ul className="grid gap-6">
            {items.map(({ slug, title, lang, summary, goal, book }) => (
              <li key={slug}>
                <Link
                  to={`/handbook/${slug}`}
                  className="block rounded-2xl bg-white dark:bg-gray-700 shadow-lg p-6 md:p-8 hover:shadow-xl transition-shadow"
                >
                  <h3 lang={lang} className="text-2xl md:text-3xl font-bold mb-3 dark:text-white">{title}</h3>
                  <p lang={lang} className="text-gray-800 dark:text-gray-100 mb-3">
                    <span className="font-semibold">{goal.label}</span>：{goal.lead}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">{summary}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    {book.stats.parts} parts · {book.stats.topics} topics · {availability(book)}
                  </p>
                  <span className="font-semibold text-gray-800 dark:text-gray-100">See what is inside →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      );
    })}
  </div>
);

export default HandbookIndexPage;
