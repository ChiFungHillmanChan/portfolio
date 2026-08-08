import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFirebase } from './firebase';
import { setTokenGetter } from './api';
import { projectBook } from './project';
import {
  subscribe, readState, enqueueMutation, discard, clearBook, clearMirror,
  sync, getSyncStatus, startAutoSync,
} from './sync';
import Book from './Book';
import PublicCardPage from './PublicCardPage';
import './siuHeiBouStyles.css';

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&display=swap';

const EMPTY = { book: null, outbox: [] };

function getBase() {
  return window.location.pathname.startsWith('/siu-hei-bou') ? '/siu-hei-bou' : '';
}

function parsePath() {
  const base = getBase();
  const rest = window.location.pathname.slice(base.length) || '/';
  const cardMatch = rest.match(/^\/card\/([A-Za-z0-9_-]+)/);
  if (cardMatch) return { page: 'card', token: cardMatch[1] };
  return { page: 'app' };
}

// 本簿嘅資料喺呢度出入，Book.jsx 淨係負責畫。落到 Book 手嘅係一本已經砌好嘅簿
// （server 嘅鏡 + 仲未寄出嘅嘢），佢唔知道「sync」係乜。
export default function SiuHeiBouGame() {
  const [route, setRoute] = useState(parsePath);
  const [user, setUser] = useState(undefined);     // undefined=loading, null=signed out
  const [snapshot, setSnapshot] = useState(EMPTY); // {book, outbox} — projectBook 出嚟嗰本
  const [status, setStatus] = useState(getSyncStatus);
  const [onlineHint, setOnlineHint] = useState(() => navigator.onLine !== false);
  const [toastMsg, setToastMsg] = useState(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const readSeq = useRef(0);

  const uid = user ? user.uid : null;

  useEffect(() => {
    document.title = '小氣簿';
    // 舊版本嘅 cache。冇 uid、冇 outbox，IndexedDB 已經取代咗佢；掃走佢好過留低
    // 一份唔知邊個嘅簿喺 localStorage 度。
    try { localStorage.removeItem('shb-state'); } catch { /* private mode */ }
    if (!document.querySelector(`link[href="${FONT_HREF}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONT_HREF;
      document.head.appendChild(link);
    }
    const onPop = () => setRoute(parsePath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (route.page === 'card') return undefined; // public page never loads Firebase
    let unsub = () => {};
    getFirebase().then(({ auth, onAuthStateChanged }) => {
      unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        if (u) setTokenGetter(() => u.getIdToken());
      });
    });
    return () => unsub();
  }, [route.page]);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  // 讀返本地嗰份，再砌成一本簿。冇 push、冇第二份真相：sync.js 一嗌，呢度就重讀。
  const reload = useCallback(async () => {
    if (!uid) return;
    const seq = readSeq.current + 1;
    readSeq.current = seq;
    try {
      const { mirror, outbox } = await readState(uid);
      if (seq !== readSeq.current) return;      // 遲到嘅讀取唔可以蓋過新嗰次
      setSnapshot({ book: projectBook(mirror, outbox), outbox });
    } catch {
      // IndexedDB 開唔到（例如 Safari 私密瀏覽）。開返一本空簿好過白畫面。
      if (seq === readSeq.current) {
        setSnapshot((s) => (s.book ? s : { book: { friends: [], grudges: [], cards: [] }, outbox: [] }));
      }
    }
    setStatus(getSyncStatus());
  }, [uid]);

  useEffect(() => {
    if (!uid) { setSnapshot(EMPTY); return undefined; }
    const off = subscribe(reload);
    const stop = startAutoSync(uid);   // 開簿、返到前台、有返網 都會試寄
    reload();
    return () => { off(); stop(); };
  }, [uid, reload]);

  useEffect(() => {
    const update = () => setOnlineHint(navigator.onLine !== false);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // 「有得同 server 講嘢」。navigator.onLine 淨係 false 嗰陣先信得過 —— 佢喺酒店
  // wifi 嘅登入頁度都照報 true，所以「有網」要靠上一次真係 pull 到嘢先算數。
  // 未試過（status.at === 0）就當有，唔好開簿頭半秒就灰晒啲掣。
  //
  // status.pulled 有四個值：null（根本覆唔到）· 'fresh' · 'unchanged' ·
  // 'discarded'（覆咗，但期間本簿被合埋咗所以掉咗個答案）。頭三個以外都算係
  // 「講得通」—— 'discarded' 嗰次個 request 係行完成個來回嘅，只不過答案冇用。
  const connected = onlineHint && (status.at === 0 || status.pulled !== null);

  const mutate = useCallback(async (op, opts) => {
    if (!uid) return null;
    const res = await enqueueMutation(uid, op, opts);
    await reload();                 // 即刻上頁（鉛筆），寄唔寄得出係第二件事
    sync(uid).catch(() => {});
    return res;
  }, [uid, reload]);

  const discardPending = useCallback(async (seq) => {
    await discard(seq);
    await reload();
  }, [reload]);

  const refresh = useCallback(() => (uid ? sync(uid) : Promise.resolve()), [uid]);

  // 撕爛本簿：server 嗰邊清完，部機呢邊嘅鏡同未寄出嘅嘢都要一齊清。
  const wipeLocal = useCallback(async () => {
    if (uid) await clearBook(uid);
    setSnapshot(EMPTY);
  }, [uid]);

  // 登出：本簿嘅內容唔留喺部機（共用電話嘅話，合埋咗就係合埋咗），但未寄出
  // 嗰啲嘢一定要留返 —— 佢哋跟住 uid 收埋，下次同一個帳戶喺呢部機登入就會寄。
  // 呢個分別係寫咗落私隱條款度嘅（legal.js §二），改呢度就要改埋嗰度。
  const forgetBook = useCallback(async () => {
    if (uid) await clearMirror(uid);
    setSnapshot(EMPTY);
  }, [uid]);

  const login = useCallback(async () => {
    setLoginBusy(true);
    try {
      const { auth, provider, signInWithPopup } = await getFirebase();
      await signInWithPopup(auth, provider);
    } catch {
      toast('登入唔到，再試多次');
    } finally {
      setLoginBusy(false);
    }
  }, [toast]);

  const logout = useCallback(async () => {
    const { auth, signOut } = await getFirebase();
    await signOut(auth);
    setSnapshot(EMPTY);
  }, []);

  const bookProps = useMemo(() => ({
    book: snapshot.book, outbox: snapshot.outbox, connected,
  }), [snapshot, connected]);

  return (
    <div className="shb-root">
      {route.page === 'card' ? (
        <PublicCardPage token={route.token} />
      ) : (
        <Book
          user={user} loginBusy={loginBusy} onLogin={login} onLogout={logout}
          {...bookProps}
          onMutate={mutate} onDiscard={discardPending}
          onWipeLocal={wipeLocal} onForgetBook={forgetBook}
          refresh={refresh} toast={toast}
        />
      )}
      {toastMsg && <div className="shb-toast">{toastMsg}</div>}
    </div>
  );
}
