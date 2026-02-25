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
      className={`fixed inset-0 z-40 flex items-center justify-center transition-all duration-300 ease-out ${
        animateIn ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Darkened overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />

      {/* Modal content */}
      <div
        className={`relative bg-bg-secondary border border-border rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center transition-all duration-300 ease-out ${
          animateIn ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-text-dimmer hover:text-text-primary transition-colors text-lg leading-none p-1 bg-transparent border-none cursor-pointer"
          aria-label="Dismiss"
        >
          ✕
        </button>

        <div className="text-4xl mb-3">📚</div>
        <h3 className="text-lg font-bold text-text-primary mb-2">
          登入記住學習進度
        </h3>
        <p className="text-sm text-text-dim leading-relaxed mb-5">
          用 Google 帳號登入，我哋會幫你記住學到邊、AI 教練對話記錄同項目進度。
        </p>

        <button
          onClick={handleLogin}
          className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all border-none"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(167,139,250,0.1))',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#e2e8f0',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          使用 Google 登入
        </button>

        <p className="text-[0.68rem] text-text-darkest mt-3">
          唔會寄 spam · 只用嚟記住進度
        </p>
      </div>
    </div>
  );
}
