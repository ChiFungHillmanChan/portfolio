import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import { Magnifier } from './svgs';

// Pages already fetched, kept OUTSIDE the component so they survive closing and
// reopening the sheet. Flipping back to a page you have seen is instant and
// costs no D1 read; 重新載入 (or a 5-minute age) is the only way to refetch.
const TTL_MS = 5 * 60 * 1000;
const pageCache = new Map();  // `${q}\n${page}` -> { at, data }
const cacheKey = (q, page) => `${q}\n${page}`;

// Must be called on logout: the cache outlives the component, so without this
// the next person to sign in on the same tab could be handed the previous
// admin's user list out of memory.
export function clearAdminCache() { pageCache.clear(); }

function readCache(q, page) {
  const hit = pageCache.get(cacheKey(q, page));
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) { pageCache.delete(cacheKey(q, page)); return null; }
  return hit.data;
}

// 管理 — superadmin-only bottom sheet: how many people use the app, and who.
// 20 users a page; the Worker enforces the gate and does the paging in SQL, so
// this sheet never holds more than one page in memory.
export default function AdminSheet({ onClose }) {
  const [search, setSearch] = useState('');   // what is typed
  const [q, setQ] = useState('');             // what has been sent (debounced)
  const [page, setPage] = useState(1);
  const [data, setData] = useState(() => readCache('', 1));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const reqId = useRef(0);                    // late responses from an old page must not win
  const sentQ = useRef('');

  // Debounce typing, and go back to page 1 — but only when the term really
  // changed, so a flip to page 3 right after mount is not yanked back to 1.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = search.trim();
      if (next === sentQ.current) return;
      sentQ.current = next;
      setQ(next);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback((nextQ, nextPage, { fresh = false } = {}) => {
    const cached = fresh ? null : readCache(nextQ, nextPage);
    if (cached) { setData(cached); setBusy(false); setFailed(false); return; }
    const id = reqId.current + 1;
    reqId.current = id;
    setBusy(true);
    api.adminUsers({ page: nextPage, q: nextQ })
      .then((res) => {
        // Key on res.page, not nextPage: asking past the end gets clamped by the
        // Worker, and caching it under the requested page would mislabel it.
        pageCache.set(cacheKey(nextQ, res.page), { at: Date.now(), data: res });
        if (reqId.current !== id) return;
        setData(res);
        if (res.page !== nextPage) setPage(res.page);   // follow the clamp
        setFailed(false);
        setBusy(false);
      })
      .catch(() => {
        if (reqId.current !== id) return;
        setFailed(true);
        setBusy(false);
      });
  }, []);

  useEffect(() => { load(q, page); }, [q, page, load]);

  const refresh = () => { pageCache.clear(); load(q, page, { fresh: true }); };

  // Only trust the last response if it belongs to the search term on screen —
  // otherwise the old result's rows and page count would label the new one.
  const forThisSearch = data && data.q === q ? data : null;
  const pages = forThisSearch ? forThisSearch.pages : 1;
  const shown = forThisSearch && forThisSearch.page === page ? forThisSearch : null;
  const flip = (delta) => setPage((p) => Math.min(Math.max(1, p + delta), pages));

  return (
    <div className="shb-sheet-mask" onClick={onClose}>
      <div className="shb-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>管理 ·用戶一覽</h3>

        {failed && <p className="shb-empty-small">睇唔到喎，你唔係管理員？</p>}

        {!failed && (
          <>
            <div className="shb-idx-search shb-admin-search">
              <Magnifier size={15} />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="搵用戶（名或者 email）" maxLength={60}
              />
            </div>

            <p className="shb-admin-total">
              {q ? `搵到 ${shown ? shown.total : '⋯'} 人` : `總用戶：${shown ? shown.total : '⋯'} 人`}
              {busy && <span className="shb-admin-busy"> ·數緊⋯</span>}
            </p>

            {shown && shown.users.length === 0 && (
              <p className="shb-empty-small">{q ? '搵唔到呢個用戶' : '一個用戶都未有'}</p>
            )}

            {shown && shown.users.length > 0 && (
              <ul className="shb-history shb-admin-list">
                {shown.users.map((u) => (
                  <li key={u.email}>
                    <span>{u.name || u.email}</span>
                    <span className="shb-admin-date">{(u.created_at || '').slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            )}

            {!shown && <div className="shb-empty-small">數緊⋯</div>}

            <div className="shb-admin-pager">
              <button type="button" className="shb-link" onClick={() => flip(-1)} disabled={page <= 1}>
                上一頁
              </button>
              <span>第 {page} / {pages} 頁</span>
              <button type="button" className="shb-link" onClick={() => flip(1)} disabled={page >= pages}>
                下一頁
              </button>
            </div>
          </>
        )}

        <div className="shb-sheet-actions">
          {!failed && (
            <button type="button" className="shb-link shb-admin-refresh" onClick={refresh}>重新載入</button>
          )}
          <button type="button" className="shb-big-btn" onClick={onClose}>收埋</button>
        </div>
      </div>
    </div>
  );
}
