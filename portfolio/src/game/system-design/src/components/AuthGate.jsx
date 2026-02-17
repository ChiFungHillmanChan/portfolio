import { useState } from 'react';
import GoogleSignInButton from './GoogleSignInButton';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../context/PremiumContext';
import { API_BASE } from '../config/constants';
import { PREMIUM_PLANS, formatHKD } from '../data/premiumPlans';

export default function AuthGate({ onDismiss, requirePremium, featureName }) {
  const { user, token } = useAuth();
  const { activatePremium } = usePremium();
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeSuccess, setCodeSuccess] = useState(false);

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setCodeError('');
    setCodeLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCodeError(data.error || '驗證失敗');
        return;
      }

      await activatePremium();
      setCodeSuccess(true);
    } catch {
      setCodeError('網絡錯誤，請稍後再試');
    } finally {
      setCodeLoading(false);
    }
  };

  // If user is logged in and premium was just activated, show success
  if (codeSuccess) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-bg-secondary border border-border rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-lg font-bold text-text-primary mb-2">Premium 已解鎖！</h3>
          <p className="text-sm text-text-dim mb-4">你已經可以使用所有 Premium 功能。</p>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="px-6 py-2 rounded-lg bg-accent-indigo text-white text-sm font-medium border-none cursor-pointer hover:bg-accent-indigo-hover transition-colors"
            >
              開始使用
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-bg-secondary border border-border rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">{requirePremium ? '👑' : '🔒'}</div>
          <h3 className="text-lg font-bold text-text-primary mb-1">
            {requirePremium ? '呢個功能需要 Premium' : '請先登入'}
          </h3>
          <p className="text-sm text-text-dim leading-relaxed">
            {featureName
              ? `登入後即可使用${featureName}`
              : '登入以繼續使用此功能'}
          </p>
        </div>

        {requirePremium && (() => {
          const standard = PREMIUM_PLANS.standard;
          return standard.comingSoon ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-500/10 border border-gray-500/30 text-text-primary mb-5 opacity-60">
              <span className="text-xl">🔓</span>
              <div className="flex-1">
                <div className="text-sm font-bold">Coming Soon</div>
                <div className="text-[0.7rem] text-text-dim">Premium 訂閱即將推出</div>
              </div>
            </div>
          ) : (
            <a
              href={standard.stripeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-accent-indigo/10 border border-accent-indigo/30 text-text-primary no-underline mb-5 hover:bg-accent-indigo/20 transition-colors"
            >
              <span className="text-xl">🔓</span>
              <div className="flex-1">
                <div className="text-sm font-bold"><span className="line-through text-text-dimmer font-normal">{formatHKD(standard.listPrice)}</span> {formatHKD(standard.salePrice)} 一次性解鎖</div>
                <div className="text-[0.7rem] text-text-dim">早鳥價優惠 · 永久存取</div>
              </div>
              <span className="text-text-dim">&rarr;</span>
            </a>
          );
        })()}

        {/* Access code entry — only shown when user is logged in and premium is required */}
        {requirePremium && user && (
          <form onSubmit={handleCodeSubmit} className="mb-5">
            <label className="block text-xs text-text-dim mb-1.5">
              已有存取碼？
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value); setCodeError(''); }}
                placeholder="SA-XXXXXX"
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-secondary text-sm outline-none focus:border-accent-indigo placeholder:text-text-darkest"
                maxLength={20}
              />
              <button
                type="submit"
                disabled={codeLoading || !code.trim()}
                className="px-4 py-2 rounded-lg bg-accent-indigo text-white text-sm font-medium border-none cursor-pointer hover:bg-accent-indigo-hover transition-colors disabled:opacity-40"
              >
                {codeLoading ? '...' : '驗證'}
              </button>
            </div>
            {codeError && (
              <p className="text-xs text-accent-red mt-1.5">{codeError}</p>
            )}
          </form>
        )}

        {!user && <GoogleSignInButton />}

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="w-full text-center text-xs text-text-dimmer hover:text-text-dim transition-colors cursor-pointer bg-transparent border-none py-2 mt-3"
          >
            先睇下 &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
