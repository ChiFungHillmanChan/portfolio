import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, SHARE_BASE, SUPERADMIN_EMAIL } from './api';
import { unitLen, continuesOverleaf } from './paginate';
import { computeGeom, buildChapter, entryLineMap, indexLinesPerPage } from './geometry';
import { CoverFront } from './CoverPage';
import IndexPage from './IndexPage';
import ChapterPage from './FriendChapter';
import AddGrudgeSheet from './AddGrudgeSheet';
import SettingsSheet from './SettingsSheet';
import AdminSheet from './AdminSheet';

const COLOURS = ['#e8a0a0', '#a0c8e8', '#a8d8b0', '#e8d3a0', '#c9aee5', '#f0b8d0'];
const FLIP_MS = 520;

const reduceMotion = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The physical book. Cover and pages are stacked layers in one fixed-size box, so
// closed and open are exactly the same size; auth state alone swings the cover.
export default function Book({ user, loginBusy, onLogin, onLogout, state, refresh, toast }) {
  const [geom, setGeom] = useState(computeGeom);
  const [nav, setNav] = useState({ section: 'index', page: 0 });
  const [leaf, setLeaf] = useState(null); // {dir:'fwd'|'back', nav, key}
  const [search, setSearch] = useState('');
  const [grudgeMap, setGrudgeMap] = useState({});
  const [sheet, setSheet] = useState(null); // 'add' | 'settings'
  const [pen, setPen] = useState(null); // {friendId, entryId, progress, total}
  const [busyCard, setBusyCard] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const leafRef = useRef(null);
  const leafKey = useRef(0);
  const flipTimer = useRef();

  useEffect(() => { leafRef.current = leaf; }, [leaf]);

  useEffect(() => {
    const onResize = () => setGeom(computeGeom());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const friends = state ? state.friends : null;
  const openCards = useMemo(() => (state ? state.openCards : []), [state]);

  const loadGrudges = useCallback(async (friendId) => {
    try {
      const list = await api.grudges(friendId);
      setGrudgeMap((m) => ({ ...m, [friendId]: list }));
    } catch {
      toast('load 唔到，遲啲再試');
    }
  }, [toast]);

  useEffect(() => {
    if (user && nav.section !== 'index' && grudgeMap[nav.section] === undefined) {
      loadGrudges(nav.section);
    }
  }, [user, nav.section, grudgeMap, loadGrudges]);

  const getChapter = useMemo(() => {
    const cache = new Map();
    return (friendId) => {
      if (!cache.has(friendId)) {
        const friend = (friends || []).find((f) => f.id === friendId);
        if (!friend) return null;
        const card = (openCards || []).find((c) => c.friend_id === friendId) || null;
        cache.set(friendId, buildChapter(friend, grudgeMap[friendId] ?? null, card, geom));
      }
      return cache.get(friendId);
    };
  }, [friends, openCards, grudgeMap, geom]);

  /* ---- page turning ---- */

  const endFlip = useCallback(() => {
    clearTimeout(flipTimer.current);
    const l = leafRef.current;
    if (!l) return;
    if (l.dir === 'back') setNav(l.nav);
    setLeaf(null);
  }, []);

  // fwd: base shows the incoming page at once, the leaf carries the outgoing page away.
  // back: base keeps the outgoing page, the leaf lands with the incoming page on top.
  const flipTo = useCallback((target, dir) => {
    if (leafRef.current) return;
    if (reduceMotion()) { setNav(target); return; }
    leafKey.current += 1;
    if (dir === 'fwd') {
      setLeaf({ dir, nav, key: leafKey.current });
      setNav(target);
    } else {
      setLeaf({ dir, nav: target, key: leafKey.current });
    }
    clearTimeout(flipTimer.current);
    flipTimer.current = setTimeout(endFlip, FLIP_MS + 150);
  }, [nav, endFlip]);

  const sectionOrder = useMemo(() => ['index', ...(friends || []).map((f) => f.id)], [friends]);

  const flipToAuto = useCallback((target) => {
    let dir;
    if (nav.section === target.section) dir = target.page >= nav.page ? 'fwd' : 'back';
    else if (target.section === 'index') dir = 'back';
    else if (nav.section === 'index') dir = 'fwd';
    else dir = sectionOrder.indexOf(target.section) > sectionOrder.indexOf(nav.section) ? 'fwd' : 'back';
    flipTo(target, dir);
  }, [nav, sectionOrder, flipTo]);

  /* ---- derived paging ---- */

  const filtered = useMemo(() => {
    if (!friends) return null;
    const q = search.trim();
    return q ? friends.filter((f) => f.name.includes(q)) : friends;
  }, [friends, search]);

  const linesPerPage = indexLinesPerPage(geom);
  const activeChapter = nav.section !== 'index' ? getChapter(nav.section) : null;
  const pageCount = nav.section === 'index'
    ? Math.max(1, Math.ceil((filtered ? filtered.length : 0) / linesPerPage) || 1)
    : (activeChapter ? activeChapter.pages.length : 1);
  const pageIdx = Math.min(nav.page, pageCount - 1);
  const friendPos = nav.section === 'index' ? -1 : sectionOrder.indexOf(nav.section);

  const hasNext = pageIdx < pageCount - 1
    || (nav.section === 'index' ? !!(friends && friends.length) : friendPos < sectionOrder.length - 1);
  const hasPrev = pageIdx > 0 || nav.section !== 'index';
  const moreOverleaf = !!activeChapter && continuesOverleaf(activeChapter.pages, pageIdx);

  const goNext = () => {
    if (pageIdx < pageCount - 1) flipTo({ section: nav.section, page: pageIdx + 1 }, 'fwd');
    else if (nav.section === 'index' && friends && friends.length) flipTo({ section: friends[0].id, page: 0 }, 'fwd');
    else if (friendPos > 0 && friendPos < sectionOrder.length - 1) {
      flipTo({ section: sectionOrder[friendPos + 1], page: 0 }, 'fwd');
    }
  };
  const goPrev = () => {
    if (pageIdx > 0) flipTo({ section: nav.section, page: pageIdx - 1 }, 'back');
    else if (nav.section !== 'index') flipTo({ section: 'index', page: 0 }, 'back');
  };

  /* ---- actions ---- */

  const addFriend = async (name) => {
    setAddBusy(true);
    try {
      await api.createFriend({ name, colour: COLOURS[(friends ? friends.length : 0) % COLOURS.length] });
      await refresh();
    } catch {
      toast('加唔到，遲啲再試');
    } finally {
      setAddBusy(false);
    }
  };

  const share = useCallback(async (card) => {
    const url = `${SHARE_BASE}/card/${card.share_token}`;
    const text = `【小氣簿】你喺我本簿度已經儲滿 ${card.stamp_total} 個嬲爆印！睇下你做過啲乜 → ${url} 依家${card.reward}，一筆勾銷。`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        toast('已經 copy 咗，貼去 WhatsApp send 俾佢啦');
      }
    } catch (err) {
      if (!err || err.name !== 'AbortError') toast('分享唔到，撳「send 俾佢」再試多次');
    }
  }, [toast]);

  const openCardNow = async (friendId) => {
    setBusyCard(true);
    let card;
    try {
      card = await api.openCard(friendId);
    } catch (e) {
      toast(e.code === 'threshold-not-met' ? '未儲夠印住' : '開唔到卡，遲啲再試');
      setBusyCard(false);
      return;
    }
    await share(card);
    try {
      await refresh();
      await loadGrudges(friendId);
    } catch { /* list refresh best-effort */ }
    setBusyCard(false);
  };

  const settleCard = async (card, friendId) => {
    try {
      await api.settleCard(card.id);
      await refresh();
      await loadGrudges(friendId);
      toast('一筆勾銷！');
    } catch { toast('搞唔掂，遲啲再試'); }
  };

  const deleteGrudge = async (grudge, friendId) => {
    try {
      await api.removeGrudge(grudge.id);
      await refresh();
      await loadGrudges(friendId);
    } catch { toast('刪唔到，遲啲再試'); }
  };

  const onGrudgeSaved = async (friendId, created) => {
    setSheet(null);
    await Promise.all([refresh(), loadGrudges(friendId)]);
    if (created && created.id && !reduceMotion()) {
      setPen({ friendId, entryId: created.id, progress: -1, total: unitLen(created.content || '') });
    }
  };

  const handleLogout = () => {
    onLogout();
    setNav({ section: 'index', page: 0 });
    setSearch('');
    setGrudgeMap({});
    setSheet(null);
    setPen(null);
  };

  /* ---- pen writing ---- */

  // Ticker: advances the nib every 45ms. Keyed on the entry (not the whole pen
  // object) so the interval survives per-tick re-renders and the whole entry
  // lands in ≤ ~2.5s regardless of render latency.
  const penEntryId = pen ? pen.entryId : null;
  useEffect(() => {
    if (!penEntryId || leaf) return undefined;
    const t = setInterval(() => {
      setPen((p) => {
        if (!p) return p;
        const progress = Math.max(0, p.progress);
        if (progress >= p.total) return p;
        const step = Math.max(0.5, p.total / 55);
        return { ...p, progress: Math.min(p.total, progress + step) };
      });
    }, 45);
    return () => clearInterval(t);
  }, [penEntryId, leaf]);

  // Follower: keeps the book on the page under the nib (flipping forward when
  // the writing crosses a page boundary) and lifts the pen when done.
  useEffect(() => {
    if (!pen) return undefined;
    const chapter = getChapter(pen.friendId);
    if (!chapter || !chapter.loaded) return undefined;
    const lines = entryLineMap(chapter.pages, pen.entryId);
    if (!lines.length) { setPen(null); return undefined; }

    const progress = Math.max(0, pen.progress);
    const active = lines.find((l) => l.type === 'text' && progress < l.end) || lines[lines.length - 1];
    if (nav.section !== pen.friendId || Math.min(nav.page, chapter.pages.length - 1) !== active.pageIdx) {
      if (!leaf) flipToAuto({ section: pen.friendId, page: active.pageIdx });
      return undefined;
    }
    if (pen.progress >= pen.total && !leaf) {
      const t = setTimeout(() => setPen(null), 700);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [pen, nav, leaf, getChapter, flipToAuto]);

  /* ---- rendering ---- */

  const renderLocation = (loc, interactive) => {
    if (loc.section === 'index') {
      return (
        <IndexPage
          friends={friends || []} filtered={filtered} search={search} onSearch={setSearch}
          pageIdx={loc.section === nav.section ? Math.min(loc.page, pageCount - 1) : loc.page}
          linesPerPage={linesPerPage}
          onSelect={(id) => flipToAuto({ section: id, page: 0 })}
          onAddFriend={addFriend} addBusy={addBusy}
          onLogout={handleLogout} interactive={interactive}
          ownerName={user && user.displayName ? user.displayName : ''}
          isAdmin={!!user && user.email === SUPERADMIN_EMAIL}
          onAdmin={() => setSheet('admin')}
        />
      );
    }
    const chapter = getChapter(loc.section);
    if (!chapter) return <div className="shb-bpage" />;
    return (
      <ChapterPage
        chapter={chapter} pageIdx={loc.page} geom={geom}
        pen={pen && pen.friendId === loc.section ? pen : null}
        interactive={interactive} busyCard={busyCard}
        onGear={() => setSheet('settings')}
        onOpenCard={() => openCardNow(loc.section)}
        onShare={(card) => share(card)}
        onSettle={(card) => settleCard(card, loc.section)}
        onDeleteGrudge={(g) => deleteGrudge(g, loc.section)}
        onIndex={() => flipToAuto({ section: 'index', page: 0 })}
      />
    );
  };

  const open = !!user;
  const activeFriend = nav.section !== 'index' && friends
    ? friends.find((f) => f.id === nav.section) || null : null;

  return (
    <div className="shb-bookwrap">
      <div className="shb-book" style={{ width: geom.w, height: geom.h }}>
        <div className="shb-bpage-base">
          {open ? renderLocation({ section: nav.section, page: pageIdx }, !leaf) : null}
        </div>

        {leaf && (
          <div
            key={leaf.key}
            className={`shb-leaf shb-leaf-turn-${leaf.dir}`}
            onAnimationEnd={(e) => { if (e.target === e.currentTarget) endFlip(); }}
          >
            <div className="shb-leaf-face shb-leaf-face-front">{renderLocation(leaf.nav, false)}</div>
            <div className="shb-leaf-face shb-leaf-face-back" />
          </div>
        )}

        {open && !leaf && (
          <div className="shb-corners">
            <button type="button" className="shb-corner" onClick={goPrev} disabled={!hasPrev}>
              ‹ 上一頁
            </button>
            <span className="shb-pageno">
              {nav.section === 'index' ? `目錄 ${pageIdx + 1}/${pageCount}` : `第 ${pageIdx + 1}/${pageCount} 頁`}
            </span>
            <button
              type="button"
              className={moreOverleaf ? 'shb-corner shb-corner-more' : 'shb-corner'}
              onClick={goNext} disabled={!hasNext}
            >
              {moreOverleaf ? '（下頁仲有）›' : '下一頁 ›'}
            </button>
          </div>
        )}

        <div className={open ? 'shb-bcover shb-bcover-open' : 'shb-bcover'} aria-hidden={open}>
          <div className="shb-bcover-frontface">
            <CoverFront onLogin={onLogin} busy={loginBusy} loading={user === undefined} />
          </div>
          <div className="shb-bcover-backface" />

        </div>
      </div>

      {open && activeFriend && !sheet && !pen && (
        <button type="button" className="shb-fab" onClick={() => setSheet('add')}>記一筆</button>
      )}

      {sheet === 'add' && activeFriend && (
        <AddGrudgeSheet
          friend={activeFriend}
          onClose={() => setSheet(null)}
          onSaved={(created) => onGrudgeSaved(activeFriend.id, created)}
          toast={toast}
        />
      )}
      {sheet === 'admin' && (
        <AdminSheet onClose={() => setSheet(null)} />
      )}
      {sheet === 'settings' && activeFriend && (
        <SettingsSheet
          friend={activeFriend} onClose={() => setSheet(null)}
          refresh={refresh} toast={toast}
          onDeleted={() => { setSheet(null); setNav({ section: 'index', page: 0 }); }}
        />
      )}
    </div>
  );
}
