import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getFirebase } from './firebase';
import { api, setTokenGetter } from './api';
import CoverPage from './CoverPage';
import HomePage from './HomePage';
import FriendPage from './FriendPage';
import PublicCardPage from './PublicCardPage';
import './siuHeiBouStyles.css';

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&display=swap';

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

export default function SiuHeiBouGame() {
  const [route, setRoute] = useState(parsePath);
  const [user, setUser] = useState(undefined);     // undefined=loading, null=signed out
  const [state, setState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shb-state')) || null; } catch { return null; }
  });
  const [friendId, setFriendId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [loginBusy, setLoginBusy] = useState(false);

  useEffect(() => {
    document.title = '小氣簿';
    if (!document.querySelector(`link[href="${FONT_HREF}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONT_HREF;
      document.head.appendChild(link);
    }
    const onPop = () => { setRoute(parsePath()); setFriendId(null); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (route.page === 'card') return; // public page never loads Firebase
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

  const refresh = useCallback(async () => {
    try {
      const s = await api.state();
      setState(s);
      localStorage.setItem('shb-state', JSON.stringify(s));
    } catch {
      toast('load 唔到，遲啲再試');
    }
  }, [toast]);

  useEffect(() => { if (user) refresh(); }, [user, refresh]);

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
    setState(null);
    localStorage.removeItem('shb-state');
    setFriendId(null);
  }, []);

  const friend = useMemo(
    () => (state && friendId ? state.friends.find((f) => f.id === friendId) || null : null),
    [state, friendId],
  );

  let content;
  if (route.page === 'card') {
    content = <PublicCardPage token={route.token} />;
  } else if (user === undefined) {
    content = <div className="shb-loading">開緊本簿⋯</div>;
  } else if (!user) {
    content = <CoverPage onLogin={login} busy={loginBusy} />;
  } else if (friend) {
    content = (
      <FriendPage friend={friend} openCards={state ? state.openCards : []}
        onBack={() => setFriendId(null)} refresh={refresh} toast={toast} />
    );
  } else {
    content = <HomePage state={state} onSelect={setFriendId} refresh={refresh} toast={toast} onLogout={logout} />;
  }

  return (
    <div className="shb-root">
      {content}
      {toastMsg && <div className="shb-toast">{toastMsg}</div>}
    </div>
  );
}
