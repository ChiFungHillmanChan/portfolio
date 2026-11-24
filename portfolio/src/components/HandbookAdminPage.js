import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import handbooks from '../data/handbooks';

// Private stats page for the handbooks: downloads and support payments, served by the
// hillmanchan-handbook-downloads Cloudflare Worker. The page itself holds no data; without the
// admin token the API returns nothing.
export const STATS_URL = '/api/handbook/stats';
export const TOKEN_KEY = 'handbook-admin-token';

const readToken = () => {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
};
const saveToken = (token) => {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private browsing: the token lasts for this visit only.
  }
};

const partLabel = (part) => (part === null || part === undefined ? 'Not stated' : `Part ${String(part).padStart(2, '0')}`);
const langLabel = (lang) => ({ zh: '繁體中文', en: 'English' }[lang] || '—');
const money = (amount, currency) => `${currency} ${(amount / 100).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const number = (value) => (value || 0).toLocaleString('en-GB');

const partTitle = (slug, part) => {
  const handbook = handbooks.find((entry) => entry.slug === slug);
  if (!handbook || part === null || part === undefined) return '';
  if (part === 0) return handbook.book.intro ? handbook.book.intro.title : 'Intro';
  const found = handbook.book.parts.find((entry) => entry.number === part);
  return found ? found.title : '';
};
const handbookName = (slug) => {
  const handbook = handbooks.find((entry) => entry.slug === slug);
  return handbook ? handbook.titleLines.join('') : slug;
};

const cell = 'px-3 py-2 text-left';
const numberCell = 'px-3 py-2 text-right tabular-nums';
const Table = ({ caption, head, rows, empty }) => (
  <div className="overflow-x-auto rounded-xl bg-white dark:bg-gray-700 shadow mb-6">
    <table className="w-full text-sm text-gray-800 dark:text-gray-100">
      <caption className="text-left px-3 pt-3 pb-1 font-semibold dark:text-white">{caption}</caption>
      <thead className="text-gray-500 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
        <tr>{head.map(([label, numeric]) => <th key={label} scope="col" className={numeric ? numberCell : cell}>{label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={head.length} className={`${cell} text-gray-500 dark:text-gray-400`}>{empty}</td></tr>
        ) : rows.map((row) => (
          <tr key={row.key} className="border-b last:border-0 border-gray-100 dark:border-gray-600">
            {row.cells.map((value, index) => (
              <td key={head[index][0]} className={head[index][1] ? numberCell : cell}>{value}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const HandbookStats = ({ stats }) => {
  const slugs = [...new Set([
    ...stats.totals.map((row) => row.handbook),
    ...stats.paymentTotals.map((row) => row.handbook),
  ])];
  const maxDaily = Math.max(1, ...stats.daily.map((row) => row.downloads));
  return (
    <>
      {slugs.length === 0 && <p className="mb-6 text-gray-600 dark:text-gray-300">No downloads or payments recorded yet.</p>}
      {slugs.map((slug) => {
        const totals = stats.totals.find((row) => row.handbook === slug) || {};
        const paid = stats.paymentTotals.filter((row) => row.handbook === slug);
        const payers = paid.reduce((sum, row) => sum + row.payments, 0);
        return (
          <section key={slug} aria-label={handbookName(slug)} className="mb-8">
            <h2 className="text-xl font-semibold mb-3 dark:text-white">{handbookName(slug)}</h2>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                ['Downloads', number(totals.downloads)],
                ['People who downloaded', number(totals.people)],
                ['Payments', number(payers)],
                ['Paid in total', paid.length ? paid.map((row) => money(row.amount, row.currency)).join(' + ') : '—'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white dark:bg-gray-700 shadow p-4">
                  <dd className="text-2xl font-bold dark:text-white">{value}</dd>
                  <dt className="text-xs text-gray-600 dark:text-gray-300">{label}</dt>
                </div>
              ))}
            </dl>
            {totals.since && <p className="text-xs text-gray-500 dark:text-gray-400 -mt-4 mb-6">Counting since {totals.since} (UTC).</p>}
            <Table
              caption="Downloads by part"
              head={[['Part'], ['Title'], ['Language'], ['Downloads', true], ['People', true], ['Last 7 days', true], ['Last 30 days', true]]}
              rows={stats.parts.filter((row) => row.handbook === slug).map((row) => ({
                key: `${row.part}-${row.lang}`,
                cells: [partLabel(row.part), partTitle(slug, row.part), langLabel(row.lang), number(row.downloads), number(row.people), number(row.last7), number(row.last30)],
              }))}
              empty="No downloads yet."
            />
            <Table
              caption="Payments by part"
              head={[['Part'], ['Title'], ['Language'], ['Payments', true], ['Amount', true]]}
              rows={stats.payments.filter((row) => row.handbook === slug).map((row) => ({
                key: `${row.part}-${row.lang}-${row.currency}`,
                cells: [partLabel(row.part), partTitle(slug, row.part), langLabel(row.lang), number(row.payments), money(row.amount, row.currency)],
              }))}
              empty="No payments yet."
            />
          </section>
        );
      })}

      <Table
        caption="Last 30 days (all handbooks)"
        head={[['Day'], ['Downloads', true], ['People', true], ['']]}
        rows={[...stats.daily].reverse().map((row) => ({
          key: row.day,
          cells: [
            row.day,
            number(row.downloads),
            number(row.people),
            <span aria-hidden="true" className="inline-block h-2 rounded bg-gray-700 dark:bg-gray-200" style={{ width: `${Math.round((row.downloads / maxDaily) * 120)}px` }} />,
          ],
        }))}
        empty="No downloads in the last 30 days."
      />
      <Table
        caption="Latest payments"
        head={[['Time (UTC)'], ['Handbook'], ['Part'], ['Language'], ['Amount', true]]}
        rows={stats.recentPayments.map((row) => ({
          key: `${row.at}-${row.amount}`,
          cells: [row.at.replace('T', ' ').slice(0, 16), handbookName(row.handbook), partLabel(row.part), langLabel(row.lang), money(row.amount, row.currency)],
        }))}
        empty="No payments yet."
      />
    </>
  );
};

const HandbookAdminPage = () => {
  const [token, setToken] = useState(readToken);
  const [draft, setDraft] = useState('');
  const [state, setState] = useState({ status: 'idle' });

  const load = useCallback(async (current) => {
    if (!current) return;
    setState({ status: 'loading' });
    try {
      const response = await fetch(STATS_URL, { headers: { authorization: `Bearer ${current}` }, cache: 'no-store' });
      if (response.status === 401) {
        saveToken('');
        setToken('');
        setState({ status: 'error', message: 'That token was not accepted.' });
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setState({ status: 'ready', stats: await response.json() });
    } catch (error) {
      setState({ status: 'error', message: `Could not load the stats (${error.message}).` });
    }
  }, []);

  useEffect(() => {
    document.title = 'Handbook stats';
    load(token);
  }, [token, load]);

  const signIn = (event) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    saveToken(value);
    setDraft('');
    setToken(value);
  };
  const signOut = () => {
    saveToken('');
    setToken('');
    setState({ status: 'idle' });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
      <p className="mb-4 text-sm">
        <Link to="/handbook" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">← Handbooks</Link>
      </p>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold dark:text-white">Handbook stats</h1>
        {token && (
          <div className="flex gap-2">
            <button type="button" onClick={() => load(token)} className="rounded-lg border border-gray-300 dark:border-gray-500 px-3 py-1.5 text-sm dark:text-gray-100">Refresh</button>
            <button type="button" onClick={signOut} className="rounded-lg border border-gray-300 dark:border-gray-500 px-3 py-1.5 text-sm dark:text-gray-100">Sign out</button>
          </div>
        )}
      </div>

      {!token && (
        <form onSubmit={signIn} className="max-w-md rounded-xl bg-white dark:bg-gray-700 shadow p-5 mb-6">
          <label htmlFor="admin-token" className="block text-sm font-semibold mb-2 dark:text-white">Admin token</label>
          <input
            id="admin-token"
            type="password"
            autoComplete="current-password"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-500 px-3 py-2 mb-3 dark:bg-gray-800 dark:text-white"
          />
          <button type="submit" className="rounded-lg px-4 py-2 font-semibold text-white bg-gray-800 dark:text-gray-900 dark:bg-white">Show stats</button>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">The token is kept in this browser only.</p>
        </form>
      )}

      {state.status === 'loading' && <p className="text-gray-600 dark:text-gray-300">Loading…</p>}
      {state.status === 'error' && <p role="alert" className="mb-4 text-red-700 dark:text-red-300">{state.message}</p>}
      {state.status === 'ready' && (
        <>
          <HandbookStats stats={state.stats} />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            A download is a whole-file request; the same person fetching the same file again within 30 minutes counts once.
            People are counted by a salted hash of the IP address, so people sharing a network count as one.
            Updated {state.stats.generatedAt.replace('T', ' ').slice(0, 16)} UTC.
          </p>
        </>
      )}
    </div>
  );
};

export default HandbookAdminPage;
