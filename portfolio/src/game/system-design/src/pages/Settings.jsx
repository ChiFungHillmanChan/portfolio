import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../context/PremiumContext';
import { useProgress } from '../context/ProgressContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import topicData from '../data/topics.json';
import { API_BASE, STRIPE_URL, STRIPE_PRO_URL } from '../config/constants';
import { PREMIUM_PLANS, PREMIUM_COPY, formatHKD, tierDisplayName } from '../data/premiumPlans';

// ─── Superadmin Panel (cached — only fetches once) ───
function SuggestionsSection({ token }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetched = useRef(false);

  const fetchSuggestions = useCallback(async (force = false) => {
    if (fetched.current && !force) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'admin-list-suggestions' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '無法取得建議列表');
        return;
      }
      setSuggestions(data.suggestions || []);
      fetched.current = true;
    } catch {
      setError('網絡錯誤');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  if (loading) return <div className="text-sm text-text-dim py-4 text-center">載入建議中...</div>;
  if (error) return <div className="text-sm text-accent-red py-4 text-center">{error}</div>;

  return (
    <div className="mt-6 p-4 rounded-xl border border-border bg-bg-secondary">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">💡</span>
          <span className="text-sm font-semibold text-text-primary">用戶建議</span>
          <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-white/[0.06] text-text-dim">{suggestions.length}</span>
        </div>
        <button
          onClick={() => fetchSuggestions(true)}
          className="px-2 py-1 rounded-lg border border-border bg-transparent text-text-dim text-xs cursor-pointer hover:bg-white/[0.04] hover:border-border-hover transition-colors"
        >
          重新載入
        </button>
      </div>
      {suggestions.length === 0 ? (
        <div className="text-xs text-text-dimmer text-center py-4">暫無建議</div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {suggestions.map((s, i) => (
            <div key={i} className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
              <div className="text-sm text-text-secondary mb-1">{s.suggestion || s.text || JSON.stringify(s)}</div>
              <div className="flex items-center gap-3 text-[0.65rem] text-text-dimmer">
                {s.email && <span>{s.email}</span>}
                {s.createdAt && <span>{new Date(s.createdAt).toLocaleDateString('zh-HK', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Superadmin Panel (cached — only fetches once) ───
function AdminPanel({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState(null);
  const fetched = useRef(false);

  const fetchUsers = useCallback(async (force = false) => {
    if (fetched.current && !force) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'admin-list-users' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '無法取得用戶列表');
        return;
      }
      setUsers(data.users || []);
      fetched.current = true;
    } catch {
      setError('網絡錯誤');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUserTier = async (uid, tier) => {
    const premium = tier !== 'free';
    const label = tierDisplayName(tier);
    if (!window.confirm(`確定要將呢個用戶設為 ${label}？`)) return;

    setUpdating(uid);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'admin-update-user',
          targetUid: uid,
          premium,
          tier,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || '更新失敗');
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === uid ? { ...u, premium, tier: premium ? tier : null, activatedAt: premium ? new Date().toISOString() : u.activatedAt } : u
        )
      );
    } catch {
      alert('網絡錯誤');
    } finally {
      setUpdating(null);
    }
  };

  const filtered = users.filter((u) =>
    !search || (u.email || u.displayName || '').toLowerCase().includes(search.toLowerCase())
  );
  const premiumCount = users.filter((u) => u.premium).length;

  if (loading) return <div className="text-sm text-text-dim py-8 text-center">載入用戶列表中...</div>;
  if (error) return <div className="text-sm text-accent-red py-8 text-center">{error}</div>;

  return (
    <div>
      {/* Stats */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 px-3 py-3 rounded-lg bg-white/[0.04] text-center">
          <div className="text-2xl font-bold text-text-primary">{users.length}</div>
          <div className="text-[0.65rem] text-text-dimmer">總用戶</div>
        </div>
        <div className="flex-1 px-3 py-3 rounded-lg bg-white/[0.04] text-center">
          <div className="text-2xl font-bold text-[#a78bfa]">{premiumCount}</div>
          <div className="text-[0.65rem] text-text-dimmer">Premium</div>
        </div>
        <div className="flex-1 px-3 py-3 rounded-lg bg-white/[0.04] text-center">
          <div className="text-2xl font-bold text-text-dim">{users.length - premiumCount}</div>
          <div className="text-[0.65rem] text-text-dimmer">Free</div>
        </div>
      </div>

      {/* Search + Refresh */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋 email / 名稱..."
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-secondary text-sm outline-none focus:border-accent-indigo placeholder:text-text-darkest"
        />
        <button
          onClick={() => fetchUsers(true)}
          className="px-3 py-2 rounded-lg border border-border bg-transparent text-text-dim text-xs cursor-pointer hover:bg-white/[0.04] hover:border-border-hover transition-colors"
        >
          重新載入
        </button>
      </div>

      {/* User table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-dimmer text-xs border-b border-border">
              <th className="pb-2 pr-2">用戶</th>
              <th className="pb-2 pr-2">狀態</th>
              <th className="pb-2 pr-2 hidden sm:table-cell">最後登入</th>
              <th className="pb-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.uid} className="border-b border-white/[0.04]">
                <td className="py-2.5 pr-2">
                  <div className="flex items-center gap-2">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt="" className="w-7 h-7 rounded-full flex-shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-accent-indigo/20 flex items-center justify-center text-[0.6rem] text-accent-indigo-light flex-shrink-0">
                        {(u.displayName || u.email || '?')[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      {u.displayName && <div className="text-xs text-text-secondary truncate max-w-[160px]">{u.displayName}</div>}
                      <div className="text-[0.65rem] text-text-dimmer truncate max-w-[160px]">{u.email || u.uid}</div>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-2">
                  <span className={`text-[0.65rem] px-2 py-0.5 rounded-full ${u.superadmin ? 'bg-[rgba(251,191,36,0.2)] text-[#fbbf24]' : u.premium ? 'bg-[rgba(167,139,250,0.2)] text-[#a78bfa]' : 'bg-white/[0.06] text-text-dim'}`}>
                    {u.superadmin ? 'Superadmin' : u.premium ? (u.tier === 'pro' ? 'Pro' : 'Standard') : 'Free'}
                  </span>
                </td>
                <td className="py-2.5 pr-2 text-text-dimmer text-[0.65rem] hidden sm:table-cell">
                  {u.lastSignIn ? new Date(u.lastSignIn).toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
                <td className="py-2.5">
                  {updating === u.uid ? (
                    <span className="text-[0.65rem] text-text-dimmer">...</span>
                  ) : (
                    <select
                      value={u.superadmin ? 'superadmin' : u.premium ? (u.tier === 'pro' ? 'pro' : 'standard') : 'free'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'superadmin') return;
                        updateUserTier(u.uid, val);
                      }}
                      disabled={u.superadmin}
                      className="text-[0.65rem] px-2 py-1 rounded-lg border border-border bg-bg-primary text-text-secondary cursor-pointer outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {u.superadmin && <option value="superadmin">Superadmin</option>}
                      <option value="free">Free</option>
                      <option value="standard">Standard ({formatHKD(PREMIUM_PLANS.standard.salePrice)})</option>
                      <option value="pro">Pro ({formatHKD(PREMIUM_PLANS.pro.salePrice)})</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-text-dimmer text-xs">無結果</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Suggestions section */}
      <SuggestionsSection token={token} />
    </div>
  );
}

// ─── Profile Tab ───
function ProfileTab({ user, planLabel, planColor, isSuperAdmin, signOut }) {
  return (
    <>
      <section className="mb-6 p-5 rounded-xl border border-border bg-bg-secondary">
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

      <section className="p-5 rounded-xl border border-border bg-bg-secondary">
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-transparent text-text-secondary text-sm cursor-pointer hover:bg-white/[0.04] hover:border-border-hover transition-colors"
        >
          <span>🚪</span>
          登出
        </button>
      </section>

      <section className="mt-4 text-center">
        <Link
          to="/changelog"
          className="text-xs text-text-dimmer hover:text-text-dim transition-colors"
        >
          📋 更新日誌
        </Link>
      </section>
    </>
  );
}

// ─── Plan Tab ───
function PlanTab({ isPremium, isSuperAdmin, token, activatePremium }) {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeSuccess, setCodeSuccess] = useState(false);
  const standard = PREMIUM_PLANS.standard;
  const pro = PREMIUM_PLANS.pro;

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

  return (
    <section className="p-5 rounded-xl border border-border bg-bg-secondary">
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
          {/* Urgency note */}
          <div className="mb-4 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
            <div className="text-xs font-semibold text-amber-400 mb-0.5">{PREMIUM_COPY.urgencyTitle}</div>
            <div className="text-[0.65rem] text-text-dimmer leading-relaxed">
              {PREMIUM_COPY.urgencyBody}
            </div>
          </div>

          {/* Plan Cards */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {/* Standard */}
            <a
              href={STRIPE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 p-4 rounded-xl border border-accent-indigo/30 bg-accent-indigo/5 no-underline hover:bg-accent-indigo/10 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🔓</span>
                <span className="text-xs font-semibold text-accent-indigo-light uppercase tracking-wider">Standard</span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <span className="text-xs text-text-dimmer line-through">{formatHKD(standard.listPrice)}</span>
                <span className="text-xl font-bold text-text-primary">{formatHKD(standard.salePrice)}</span>
              </div>
              <div className="inline-block px-1.5 py-0.5 rounded bg-accent-green/15 text-accent-green text-[0.6rem] font-semibold mb-1">慳 {formatHKD(standard.savings)}</div>
              <div className="text-[0.65rem] text-text-dimmer mb-3">一次性付款 · 永久存取</div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span className="text-accent-green">✓</span> AI 助手 + 教練模式
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span className="text-accent-green">✓</span> 實戰項目 + Viber 模板
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span className="text-accent-green">✓</span> 小測驗 + 面試 Checklist
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-dimmer">
                  <span>—</span> 每日 {standard.dailyAiLimit} 次 AI 對話
                </div>
              </div>
              <div className="mt-3 text-center text-sm font-semibold text-accent-indigo">
                鎖定早鳥價 &rarr;
              </div>
            </a>

            {/* Pro */}
            <a
              href={STRIPE_PRO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 p-4 rounded-xl border border-amber-500/40 bg-amber-500/5 no-underline hover:bg-amber-500/10 transition-colors relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-amber-500 text-black text-[0.55rem] font-bold px-2 py-0.5 rounded-bl-lg">推薦</div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">⚡</span>
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Pro</span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <span className="text-xs text-text-dimmer line-through">{formatHKD(pro.listPrice)}</span>
                <span className="text-xl font-bold text-text-primary">{formatHKD(pro.salePrice)}</span>
              </div>
              <div className="inline-block px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[0.6rem] font-semibold mb-1">慳 {formatHKD(pro.savings)}</div>
              <div className="text-[0.65rem] text-text-dimmer mb-3">一次性付款 · 永久存取</div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span className="text-accent-green">✓</span> Standard 所有功能
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span className="text-amber-400">★</span> 每日 {pro.dailyAiLimit} 次 AI 對話
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span className="text-amber-400">★</span> 進階實戰 + AI 課題
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span className="text-amber-400">★</span> 未來新功能優先存取
                </div>
              </div>
              <div className="mt-3 text-center text-sm font-semibold text-amber-400">
                鎖定早鳥價 &rarr;
              </div>
            </a>
          </div>

          {/* Access Code Form */}
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
  );
}

// ─── Progress Tab ───
function ProgressTab() {
  const { viewed, total } = useProgress();
  const enabledTopics = topicData.topics.filter((t) => !t.disabled);
  const totalTopics = enabledTopics.length;
  const progressPercent = totalTopics > 0 ? Math.round((total / totalTopics) * 100) : 0;

  return (
    <section className="p-5 rounded-xl border border-border bg-bg-secondary">
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
  );
}

// ─── Main Settings Page ───
export default function Settings() {
  const { user, token, signOut } = useAuth();
  const { isPremium, isSuperAdmin, activatePremium } = usePremium();

  // Tabs: profile, plan, progress, admin (if superadmin)
  const tabs = [
    { id: 'profile', label: '個人檔案', icon: '👤' },
    { id: 'plan', label: '訂閱方案', icon: '💎' },
    { id: 'progress', label: '學習進度', icon: '📊' },
    ...(isSuperAdmin ? [{ id: 'admin', label: '管理面板', icon: '🛡️' }] : []),
  ];

  const [activeTab, setActiveTab] = useState(tabs[0].id);

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
        <h1 className="text-2xl font-bold text-text-primary mb-6">設定</h1>

        {/* Tab bar */}
        <div className={`grid gap-1 bg-bg-secondary rounded-xl p-1.5 mb-6 ${tabs.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`px-2 py-2.5 border-none rounded-lg text-[0.72rem] sm:text-[0.82rem] font-medium cursor-pointer transition-all text-center leading-tight font-[inherit] ${
                activeTab === tab.id
                  ? 'bg-accent-indigo text-text-primary font-semibold'
                  : 'bg-transparent text-text-dim hover:text-text-secondary hover:bg-white/5'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content — all rendered, hidden when inactive (caching) */}
        <div className={activeTab === 'profile' ? 'block animate-fade-in' : 'hidden'}>
          <ProfileTab user={user} planLabel={planLabel} planColor={planColor} isSuperAdmin={isSuperAdmin} signOut={signOut} />
        </div>

        <div className={activeTab === 'plan' ? 'block animate-fade-in' : 'hidden'}>
          <PlanTab isPremium={isPremium} isSuperAdmin={isSuperAdmin} token={token} activatePremium={activatePremium} />
        </div>

        <div className={activeTab === 'progress' ? 'block animate-fade-in' : 'hidden'}>
          <ProgressTab />
        </div>

        {isSuperAdmin && (
          <div className={activeTab === 'admin' ? 'block animate-fade-in' : 'hidden'}>
            <AdminPanel token={token} />
          </div>
        )}
      </div>
    </div>
  );
}
