import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const NUDGE_KEY = 'sd_login_nudge_shown';
const DELAY_MS = 15000;
const SCROLL_THRESHOLD = 0.5;

export default function LoginNudge({ mainRef }) {
  const { user, signInWithGoogle } = useAuth();
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (user) return;
    if (sessionStorage.getItem(NUDGE_KEY)) return;

    const show = () => {
      if (triggeredRef.current) return;
      triggeredRef.current = true;
      sessionStorage.setItem(NUDGE_KEY, '1');
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    };

    const timer = setTimeout(show, DELAY_MS);

    const mainEl = mainRef?.current;
    const onScroll = () => {
      if (!mainEl || triggeredRef.current) return;
      const ratio = mainEl.scrollTop / (mainEl.scrollHeight - mainEl.clientHeight);
      if (ratio >= SCROLL_THRESHOLD) show();
    };

    if (mainEl) mainEl.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      if (mainEl) mainEl.removeEventListener('scroll', onScroll);
    };
  }, [user, mainRef]);

  if (!visible || user) return null;

  const dismiss = () => {
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 300);
  };

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      dismiss();
    } catch {}
  };

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 z-[35] max-w-md mx-auto transition-all duration-300 ease-out ${
        animateIn ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
    >
      <div className="bg-bg-secondary border border-border rounded-xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary">
              登入記住你嘅學習進度 📚
            </p>
            <p className="text-xs text-text-dim mt-1">
              我哋唔會寄spam俾你，淨係用Google帳號記住你學到邊
            </p>
            <button
              onClick={handleLogin}
              className="mt-3 px-4 py-1.5 bg-accent text-white text-xs font-medium rounded-lg hover:brightness-110 transition-all"
            >
              使用 Google 登入
            </button>
          </div>
          <button
            onClick={dismiss}
            className="text-text-dim hover:text-text-primary transition-colors text-lg leading-none p-1 -mt-1 -mr-1"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
