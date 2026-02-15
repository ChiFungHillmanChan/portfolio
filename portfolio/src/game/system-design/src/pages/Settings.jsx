import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../context/PremiumContext';
import { useProgress } from '../context/ProgressContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import topicData from '../data/topics.json';
import { API_BASE, STRIPE_URL, STRIPE_PRO_URL } from '../config/constants';

// ─── Superadmin Panel ───
function AdminPanel({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState(null);

  const fetchUsers = useCallback(async () => {
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
    } catch {
      setError('網絡錯誤');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const togglePremium = async (uid, currentPremium) => {
    const newPremium = !currentPremium;
    const action = newPremium ? '啟動' : '停用';
    if (!window.confirm(`確定要${action} Premium 畀呢個用戶？`)) return;

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
          premium: newPremium,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || '更新失敗');
        return;
      }
      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === uid ? { ...u, premium: newPremium, activatedAt: newPremium ? new Date().toISOString() : u.activatedAt } : u
        )
      );
    } catch {
      alert('網絡錯誤');
    } finally {
      setUpdating(null);
    }
  };

  const filtered = users.filter((u) =>
    !search || (u.email || '').toLowerCase().includes(search.toLowerCase())
  );
  const premiumCount = users.filter((u) => u.premium).length;

  return (
    <section className="mb-8 p-5 rounded-xl border border-amber-500/30 bg-bg-secondary">
      <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4">管理面板</h2>

      {loading ? (
        <div className="text-sm text-text-dim">載入中...</div>
      ) : error ? (
        <div className="text-sm text-accent-red">{error}</div>
      ) : (
        <>
          {/* Stats */}
          <div className="flex gap-4 mb-4">
            <div className="px-3 py-2 rounded-lg bg-white/[0.04] text-center">
              <div className="text-lg font-bold text-text-primary">{users.length}</div>
              <div className="text-[0.65rem] text-text-dimmer">總用戶</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white/[0.04] text-center">
              <div className="text-lg font-bold text-[#a78bfa]">{premiumCount}</div>
              <div className="text-[0.65rem] text-text-dimmer">Premium</div>
            </div>
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋 email..."
            className="w-full px-3 py-2 mb-3 rounded-lg border border-border bg-bg-primary text-text-secondary text-sm outline-none focus:border-accent-indigo placeholder:text-text-darkest"
          />

          {/* User table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-dimmer text-xs border-b border-border">
                  <th className="pb-2 pr-3">Email</th>
                  <th className="pb-2 pr-3">Premium</th>
                  <th className="pb-2 pr-3">啟動日期</th>
                  <th className="pb-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.uid} className="border-b border-white/[0.04]">
                    <td className="py-2 pr-3 text-text-secondary truncate max-w-[200px]">{u.email || u.uid}</td>
                    <td className="py-2 pr-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.premium ? 'bg-[rgba(167,139,250,0.2)] text-[#a78bfa]' : 'bg-white/[0.06] text-text-dim'}`}>
                        {u.premium ? 'Premium' : 'Free'}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-text-dim text-xs">
                      {u.activatedAt ? new Date(u.activatedAt).toLocaleDateString('zh-HK') : '—'}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => togglePremium(u.uid, u.premium)}
                        disabled={updating === u.uid}
                        className={`text-xs px-3 py-1 rounded-lg border cursor-pointer transition-colors ${
                          u.premium
                            ? 'border-accent-red/30 text-accent-red hover:bg-accent-red/10'
                            : 'border-accent-green/30 text-accent-green hover:bg-accent-green/10'
                        } bg-transparent disabled:opacity-40`}
                      >
                        {updating === u.uid ? '...' : u.premium ? '停用' : '啟動'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-text-dimmer text-xs">無結果</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchUsers}
            className="mt-3 text-xs text-text-dim hover:text-text-secondary transition-colors cursor-pointer bg-transparent border-none"
          >
            重新載入
          </button>
        </>
      )}
    </section>
  );
}

// ─── Main Settings Page ───
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

        {/* Superadmin Panel */}
        {isSuperAdmin && <AdminPanel token={token} />}

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

        {/* Plan Status / Upgrade */}
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
                  <div className="text-xl font-bold text-text-primary mb-1">HK$150</div>
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
                      <span>—</span> 每日 20 次 AI 對話
                    </div>
                  </div>
                  <div className="mt-3 text-center text-sm font-semibold text-accent-indigo">
                    解鎖 Standard &rarr;
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
                  <div className="text-xl font-bold text-text-primary mb-1">HK$399</div>
                  <div className="text-[0.65rem] text-text-dimmer mb-3">一次性付款 · 永久存取</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <span className="text-accent-green">✓</span> Standard 所有功能
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <span className="text-amber-400">★</span> 每日 80 次 AI 對話
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <span className="text-amber-400">★</span> 進階實戰 + AI 課題
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <span className="text-amber-400">★</span> 未來新功能優先存取
                    </div>
                  </div>
                  <div className="mt-3 text-center text-sm font-semibold text-amber-400">
                    解鎖 Pro &rarr;
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
