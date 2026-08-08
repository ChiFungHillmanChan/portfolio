import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, SHARE_BASE, SUPERADMIN_EMAIL } from './api';
import { unitLen, continuesOverleaf } from './paginate';
import { computeGeom, buildChapter, entryLineMap, indexLinesPerPage } from './geometry';
import { CoverFront } from './CoverPage';
import IndexPage from './IndexPage';
import ChapterPage from './FriendChapter';
import AddGrudgeSheet from './AddGrudgeSheet';
import SettingsSheet from './SettingsSheet';
import AdminSheet, { clearAdminCache } from './AdminSheet';
import BackMatter, { BACK_PAGES } from './BackMatter';
import PendingPage from './PendingPage';
import LegalSheet from './LegalDoc';
import { LEGAL_DOCS } from './legal';

const COLOURS = ['#e8a0a0', '#a0c8e8', '#a8d8b0', '#e8d3a0', '#c9aee5', '#f0b8d0'];
const FLIP_MS = 520;

// 書末 — a section id that can never collide with a friend id (those are integers).
const BACK = '__back__';

const reduceMotion = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The physical book. Cover and pages are stacked layers in one fixed-size box, so
// closed and open are exactly the same size; auth state alone swings the cover.
//
// 呢個 component 淨係識畫。`book` 已經係砌好嘅一本簿（server 嗰份 + 未寄出嗰啲），
// 而所有寫入都係交返俾 onMutate 排隊 —— Book 唔知道乜嘢叫 sync。
export default function Book({
  user, loginBusy, onLogin, onLogout,
  book, outbox, connected, onMutate, onDiscard, onWipeLocal, onForgetBook, refresh, toast,
}) {
  const [geom, setGeom] = useState(computeGeom);
  const [nav, setNav] = useState({ section: 'index', page: 0 });
  const [leaf, setLeaf] = useState(null); // {dir:'fwd'|'back', nav, key}
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState(null); // 'add' | 'settings' | 'admin'
  const [pen, setPen] = useState(null); // {friendId, entryId, progress, total}
  const [busyCard, setBusyCard] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [me, setMe] = useState(null);       // null=未攞 · {failed:true}=攞唔到
  const [deleting, setDeleting] = useState(false);
  const [logoutWarn, setLogoutWarn] = useState(false); // 仲有嘢未寄出就登出？
  const [legalKey, setLegalKey] = useState(null); // 封面撳條款/私隱
  const leafRef = useRef(null);
  const leafKey = useRef(0);
  const flipTimer = useRef();

  useEffect(() => { leafRef.current = leaf; }, [leaf]);

  useEffect(() => {
    const onResize = () => setGeom(computeGeom());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const friends = book ? book.friends : null;
  const cards = useMemo(() => (book ? book.cards : []), [book]);
  // 找數卡：一個罪人最多一張未找嘅。settled 嗰啲淨係喺設定嗰度嘅「找數紀錄」出現。
  const openCards = useMemo(() => cards.filter((c) => c.status !== 'settled'), [cards]);
  const pending = useMemo(() => outbox || [], [outbox]);

  // 成本簿嘅嬲爆事一次過落嚟（server 嗰份 + 未寄出嗰啲），所以揭到邊章都唔使再攞。
  const grudgesOf = useMemo(() => {
    const map = new Map();
    (book ? book.grudges : []).forEach((g) => {
      const list = map.get(g.friend_id);
      if (list) list.push(g); else map.set(g.friend_id, [g]);
    });
    return map;
  }, [book]);

  // 個人檔案 只喺你真係揭到書末先攞 — 開簿唔使多一個 request。
  useEffect(() => {
    if (user && nav.section === BACK && me === null) {
      api.me().then(setMe).catch(() => setMe({ failed: true }));
    }
  }, [user, nav.section, me]);

  // 冇網嗰陣攞唔到個人檔案係正常嘅。有返網就當未攞過，唔好成日都掛住個「⋯」。
  const wasConnected = useRef(connected);
  useEffect(() => {
    if (connected && !wasConnected.current) setMe(null);
    wasConnected.current = connected;
  }, [connected]);

  // 一個喺冇網嗰陣寫低嘅罪人，寄咗出去之後個 id 會由 client_id 變成 server 派嘅
  // 號碼。你啱啱睇緊佢嗰章嘅話就要跟住轉章，唔係嗰版會突然變咗白紙。個罪人真係
  // 冇咗（另一部機刪咗）就退返去目錄。
  useEffect(() => {
    if (leaf || !friends || nav.section === 'index' || nav.section === BACK) return;
    if (friends.some((f) => f.id === nav.section)) return;
    const adopted = friends.find((f) => f.client_id && f.client_id === nav.section);
    setNav(adopted ? { section: adopted.id, page: nav.page } : { section: 'index', page: 0 });
  }, [leaf, friends, nav.section, nav.page]);

  const getChapter = useMemo(() => {
    const cache = new Map();
    return (friendId) => {
      if (!cache.has(friendId)) {
        const friend = (friends || []).find((f) => f.id === friendId);
        if (!friend) return null;
        const card = openCards.find((c) => c.friend_id === friendId) || null;
        cache.set(friendId, buildChapter(friend, grudgesOf.get(friendId) || [], card, geom));
      }
      return cache.get(friendId);
    };
  }, [friends, openCards, grudgesOf, geom]);

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

  // 目錄 → 每個罪人 → 書末. Reading order, and the order the corners walk.
  const sectionOrder = useMemo(
    () => ['index', ...(friends || []).map((f) => f.id), BACK],
    [friends],
  );

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
  const isChapter = nav.section !== 'index' && nav.section !== BACK;
  const activeChapter = isChapter ? getChapter(nav.section) : null;

  // 未寄出 排喺書末最尾，所以佢出現或者消失都唔會推走你正喺度睇緊嗰頁。
  const pendingPage = pending.length ? BACK_PAGES : -1;

  let pageCount;
  if (nav.section === 'index') {
    pageCount = Math.max(1, Math.ceil((filtered ? filtered.length : 0) / linesPerPage) || 1);
  } else if (nav.section === BACK) {
    pageCount = BACK_PAGES + (pending.length ? 1 : 0);
  } else {
    pageCount = activeChapter ? activeChapter.pages.length : 1;
  }
  const pageIdx = Math.min(nav.page, pageCount - 1);

  // One position in the reading order drives both corners, so every section —
  // 目錄, chapters, 書末 — turns the same way. (A book with no friends yet still
  // flips 目錄 → 書末; the old friends-only check dead-ended it.)
  const sectionPos = sectionOrder.indexOf(nav.section);
  const hasNext = pageIdx < pageCount - 1
    || (sectionPos >= 0 && sectionPos < sectionOrder.length - 1);
  const hasPrev = pageIdx > 0 || nav.section !== 'index';
  const moreOverleaf = !!activeChapter && continuesOverleaf(activeChapter.pages, pageIdx);

  const goNext = () => {
    if (pageIdx < pageCount - 1) flipTo({ section: nav.section, page: pageIdx + 1 }, 'fwd');
    else if (sectionPos >= 0 && sectionPos < sectionOrder.length - 1) {
      flipTo({ section: sectionOrder[sectionPos + 1], page: 0 }, 'fwd');
    }
  };
  const goPrev = () => {
    if (pageIdx > 0) flipTo({ section: nav.section, page: pageIdx - 1 }, 'back');
    else if (nav.section !== 'index') flipTo({ section: 'index', page: 0 }, 'back');
  };

  /* ---- actions ---- */

  // 加罪人、記一筆、改設定、刪嘢 —— 全部係排隊寫落部機，唔使等網絡。
  const addFriend = async (name) => {
    setAddBusy(true);
    try {
      await onMutate('createFriend', {
        payload: { name, colour: COLOURS[(friends ? friends.length : 0) % COLOURS.length] },
      });
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
    } catch { /* list refresh best-effort */ }
    setBusyCard(false);
  };

  const settleCard = async (card) => {
    try {
      await api.settleCard(card.id);
      await refresh();
      toast('一筆勾銷！');
    } catch { toast('搞唔掂，遲啲再試'); }
  };

  const deleteGrudge = async (grudge) => {
    try {
      await onMutate('deleteGrudge', { targetId: grudge.id });
    } catch { toast('刪唔到，遲啲再試'); }
  };

  // 支筆跟住寫嘅係鉛筆稿：排咗隊就即刻上頁，唔使等 server 派 id 落嚟。
  const onGrudgeSaved = async (friendId, values) => {
    setSheet(null);
    let queued;
    try {
      queued = await onMutate('createGrudge', { payload: { friend_id: friendId, ...values } });
    } catch {
      toast('記唔到，遲啲再試');
      return;
    }
    const entryId = queued && queued.item ? queued.item.clientId : null;
    if (entryId && !reduceMotion()) {
      setPen({ friendId, entryId, progress: -1, total: unitLen(values.content || '') });
    }
  };

  const saveFriend = async (friendId, values) => {
    await onMutate('updateFriend', { targetId: friendId, payload: values });
  };

  const deleteFriend = async (friendId) => {
    await onMutate('deleteFriend', { targetId: friendId });
  };

  // UI 歸零 —— 幾時真係登出、幾時清部機嗰份，由下面兩個 flow 排次序。
  const resetBook = () => {
    clearAdminCache();
    setNav({ section: 'index', page: 0 });
    setSearch('');
    setSheet(null);
    setPen(null);
    setMe(null);          // never let the next account on this tab see this one's profile
    setDeleting(false);
    setLogoutWarn(false);
  };

  // 合埋本簿 —— 私隱條款（legal.js §二）應承咗兩件事，兩件都要做到：
  //   一、登出之後，本簿嘅內容唔會再留喺部機（共用電話就係為咗呢個）；
  //   二、未寄出嗰啲嘢唔會就咁唔見咗，留喺部機等同一個帳戶下次登入再寄。
  // 所以永遠淨係清個鏡，outbox 一律唔掂；有嘢未寄出就要話你知先，唔好靜雞雞
  // 登出咗，等啲字困喺一個要重新登入先見返到嘅地方。
  // 次序係緊要嘅：先真係登出，之後先清個鏡。倒轉嘅話，由清完到登出之間仲有一
  // 剎那自動同步係行緊嘅，佢隨時再 pull 多次，成本簿即刻返晒嚟。
  const signOutNow = async () => {
    resetBook();
    try {
      await onLogout();
    } catch { /* 登出唔到都要收返個 UI，唔好停喺一半 */ }
    try {
      await onForgetBook();
    } catch { /* 清唔到都唔可以卡死喺度 */ }
  };

  const handleLogout = () => {
    if (pending.length) { setLogoutWarn(true); return; }
    signOutNow();
  };

  // 撕爛本簿 — D1 嗰邊清 → 登出 → 先清部機嗰份。三步嘅次序都係有理由嘅：
  //   · server 行先：清唔到嘅話冇人登出過，亦都冇嘢蒸發咗，撳多次就得。
  //   · 跟住登出：唔登出嘅話 /api/state 一 pull 就會再開返個 users row 出嚟。
  //   · 部機最後：同登出唔同，呢度連未寄出嘅嘢都要清 —— 撕爛咗嘅簿唔應該仲有
  //     半截喺部機度等有網再寄返上去。
  const deleteEverything = async () => {
    setDeleting(true);
    try {
      await api.deleteMe();
    } catch {
      toast('撕唔爛喎，遲啲再試');
      setDeleting(false);
      return;
    }
    toast('本簿撕爛晒喇，多謝你用過');
    resetBook();
    try {
      await onLogout();          // 撕完唔使再問「有嘢未寄出喎」——已經冇簿好寄
    } catch { /* 同上 */ }
    try {
      await onWipeLocal();       // 鏡同未寄出嘅嘢一次過清，同登出唔同
    } catch { /* server 已經冇嘢，部機嗰份跟住登出都會冇人再讀 */ }
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
          isAdmin={!!user && user.email === SUPERADMIN_EMAIL && connected}
          onAdmin={() => setSheet('admin')}
          onBackMatter={() => flipToAuto({ section: BACK, page: 0 })}
          pendingCount={pending.length}
          onPending={() => flipToAuto({ section: BACK, page: pendingPage })}
        />
      );
    }
    if (loc.section === BACK) {
      if (pendingPage >= 0 && loc.page >= pendingPage) {
        return (
          <PendingPage
            items={pending} onDiscard={onDiscard} interactive={interactive}
            onIndex={() => flipToAuto({ section: 'index', page: 0 })}
          />
        );
      }
      return (
        <BackMatter
          pageIdx={loc.page} user={user} me={me} interactive={interactive} connected={connected}
          onLogout={handleLogout} onDeleteAll={deleteEverything} deleting={deleting}
          onGoPage={(p) => flipToAuto({ section: BACK, page: p })}
          onIndex={() => flipToAuto({ section: 'index', page: 0 })}
        />
      );
    }
    const chapter = getChapter(loc.section);
    if (!chapter) return <div className="shb-bpage" />;
    return (
      <ChapterPage
        chapter={chapter} pageIdx={loc.page} geom={geom}
        pen={pen && pen.friendId === loc.section ? pen : null}
        interactive={interactive} busyCard={busyCard} connected={connected}
        onGear={() => setSheet('settings')}
        onOpenCard={() => openCardNow(loc.section)}
        onShare={(card) => share(card)}
        onSettle={(card) => settleCard(card)}
        onDeleteGrudge={(g) => deleteGrudge(g)}
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
            <CoverFront
              onLogin={onLogin} busy={loginBusy} loading={user === undefined}
              connected={connected} onLegal={setLegalKey}
            />
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
          onSaved={(values) => onGrudgeSaved(activeFriend.id, values)}
        />
      )}
      {sheet === 'admin' && (
        <AdminSheet onClose={() => setSheet(null)} />
      )}
      {logoutWarn && (
        <div className="shb-sheet-mask" onClick={() => setLogoutWarn(false)}>
          <div className="shb-sheet" onClick={(e) => e.stopPropagation()}>
            <h3>仲有 {pending.length} 樣嘢未寄出</h3>
            <p className="shb-logout-warn">
              登出之後，要下次喺呢部機用返同一個帳戶登入，先寄得到。
              嗰啲嘢會留喺部機，唔會就咁唔見咗；本簿其他內容就會喺呢部機度清走。
            </p>
            <p className="shb-logout-warn shb-logout-warn-hint">
              想而家寄出嘅話，撳「唔登住」，等有網絡佢哋就會自己寄。
            </p>
            <div className="shb-sheet-actions">
              <button type="button" className="shb-link" onClick={() => setLogoutWarn(false)}>
                唔登住
              </button>
              <button type="button" className="shb-big-btn" onClick={signOutNow}>
                照登出
              </button>
            </div>
          </div>
        </div>
      )}
      {legalKey && (
        <LegalSheet doc={LEGAL_DOCS[legalKey]} onClose={() => setLegalKey(null)} />
      )}
      {sheet === 'settings' && activeFriend && (
        <SettingsSheet
          friend={activeFriend} onClose={() => setSheet(null)}
          cards={cards.filter((c) => c.friend_id === activeFriend.id)}
          onSave={(values) => saveFriend(activeFriend.id, values)}
          onDelete={() => deleteFriend(activeFriend.id)}
          toast={toast}
          onDeleted={() => { setSheet(null); setNav({ section: 'index', page: 0 }); }}
        />
      )}
    </div>
  );
}
