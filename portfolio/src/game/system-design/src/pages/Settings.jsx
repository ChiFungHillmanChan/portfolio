import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../context/PremiumContext';
import { useProgress } from '../context/ProgressContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import topicData from '../data/topics.json';
import { API_BASE, STRIPE_URL } from '../config/constants';

export default function Settings() {
  const { user, token, signOut } = useAuth();
  const { isPremium, isSuperAdmin, activatePremium } = usePremium();
  const { viewed, total } = useProgress();

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeSuccess, setCodeSuccess] = useState(false);

  const enabledTopics = topicData.topics.filter((t) => !t.disabled);
  const totalTopics = enabledTopics.length;
  const progressPercent = totalTopics > 0 ? Math.round((total / totalTopics) * 100) : 0;

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

      await activatePremium(trimmed);
      setCodeSuccess(true);
    } catch {
      setCodeError('網絡錯誤，請稍後再試');
    } finally {
      setCodeLoading(false);
    }
  };

  // Not logged in
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">請先登入</h2>
          <p className="text-sm text-text-dim mb-6">登入後即可查看你嘅設定同學習進度。</p>
          <GoogleSignInButton />
        </div>
      </div>
    );
  }

  const planLabel = isSuperAdmin ? 'Superadmin' : isPremium ? 'Premium' : 'Free';
  const planColor = isSuperAdmin
    ? 'bg-[rgba(251,191,36,0.2)] text-[#fbbf24]'
    : isPremium
    ? 'bg-[rgba(167,139,250,0.2)] text-[#a78bfa]'
    : 'bg-white/[0.06] text-text-dim';

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-text-primary mb-8">設定</h1>

        {/* Profile */}
        <section className="mb-8 p-5 rounded-xl border border-border bg-bg-secondary">
          <h2 className="text-sm font-semibold text-text-dimmer uppercase tracking-wider mb-4">個人檔案</h2>
          <div className="flex items-center gap-4">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt=""
                className="w-14 h-14 rounded-full flex-shrink-0"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold text-text-primary truncate">
                {user.displayName || '未設定名稱'}
              </div>
              <div className="text-sm text-text-dim truncate">{user.email}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[0.7rem] px-2 py-0.5 rounded-full font-medium ${planColor}`}>
                  {planLabel}
                </span>
                {isSuperAdmin && (
                  <span className="text-[0.7rem] px-2 py-0.5 rounded-full font-medium bg-[rgba(239,68,68,0.2)] text-[#ef4444]">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Plan Status */}
        <section className="mb-8 p-5 rounded-xl border border-border bg-bg-secondary">
          <h2 className="text-sm font-semibold text-text-dimmer uppercase tracking-wider mb-4">訂閱狀態</h2>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{isSuperAdmin ? '🛡️' : isPremium ? '👑' : '🆓'}</span>
            <div>
              <div className="text-base font-semibold text-text-primary">
                {isSuperAdmin ? 'Superadmin 權限' : isPremium ? 'Premium 會員' : '免費版'}
              </div>
              <div className="text-xs text-text-dim">
                {isSuperAdmin
                  ? '擁有所有功能同管理權限'
                  : isPremium
                  ? '已解鎖所有 Premium 功能'
                  : '升級 Premium 解鎖更多內容'}
              </div>
            </div>
          </div>

          {!isPremium && (
            <>
              <a
                href={STRIPE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-accent-indigo/10 border border-accent-indigo/30 text-text-primary no-underline mb-4 hover:bg-accent-indigo/20 transition-colors"
              >
                <span className="text-xl">🔓</span>
                <div className="flex-1">
                  <div className="text-sm font-bold">HK$150 一次性解鎖</div>
                  <div className="text-[0.7rem] text-text-dim">付款後即時解鎖所有 Premium 功能</div>
                </div>
                <span className="text-text-dim">&rarr;</span>
              </a>

              {codeSuccess ? (
                <div className="p-3 rounded-lg bg-accent-green/10 border border-accent-green/30 text-center">
                  <span className="text-sm text-accent-green font-medium">🎉 Premium 已解鎖！</span>
                </div>
              ) : (
                <form onSubmit={handleCodeSubmit}>
                  <label className="block text-xs text-text-dim mb-1.5">已有存取碼？</label>
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
                  {codeError && <p className="text-xs text-accent-red mt-1.5">{codeError}</p>}
                </form>
              )}
            </>
          )}
        </section>

        {/* Learning Progress */}
        <section className="mb-8 p-5 rounded-xl border border-border bg-bg-secondary">
          <h2 className="text-sm font-semibold text-text-dimmer uppercase tracking-wider mb-4">學習進度</h2>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold text-text-primary">{total}</span>
            <span className="text-sm text-text-dim">/ {totalTopics} 課已閱讀</span>
            <span className="text-sm text-accent-indigo-light font-medium ml-auto">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-indigo transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {viewed.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-text-dimmer mb-2">已閱讀嘅課題：</div>
              <div className="flex flex-wrap gap-1.5">
                {viewed.map((slug) => {
                  const topic = topicData.topics.find((t) => t.slug === slug);
                  return (
                    <span
                      key={slug}
                      className="text-[0.7rem] px-2 py-1 rounded bg-white/[0.06] text-text-dim"
                    >
                      {topic?.title || slug}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Actions */}
        <section className="p-5 rounded-xl border border-border bg-bg-secondary">
          <h2 className="text-sm font-semibold text-text-dimmer uppercase tracking-wider mb-4">帳戶</h2>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-transparent text-text-secondary text-sm cursor-pointer hover:bg-white/[0.04] hover:border-border-hover transition-colors"
          >
            <span>🚪</span>
            登出
          </button>
        </section>
      </div>
    </div>
  );
}
