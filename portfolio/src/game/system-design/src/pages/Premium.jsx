import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePremium } from '../context/PremiumContext';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { PREMIUM_COPY, PREMIUM_PLANS, COMPETITOR_COMPARISON, VALUE_STACK, DAILY_COST_REFRAME, formatHKD } from '../data/premiumPlans';

export default function Premium() {
  const { isPremium, confirmStripeSession, loadingEntitlement } = usePremium();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [confirmStatus, setConfirmStatus] = useState('idle');
  const [confirmMessage, setConfirmMessage] = useState('');
  const standard = PREMIUM_PLANS.standard;
  const pro = PREMIUM_PLANS.pro;

  const sessionId = useMemo(() => {
    const fromRouter = searchParams.get('session_id');
    if (fromRouter) return fromRouter;
    const fromWindow = new URLSearchParams(window.location.search).get('session_id');
    return fromWindow || '';
  }, [searchParams]);

  const clearSessionIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('session_id')) return;
    params.delete('session_id');
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
  };

  useEffect(() => {
    if (!sessionId) return;
    if (isPremium) {
      setConfirmStatus('success');
      clearSessionIdFromUrl();
      return;
    }
    if (!user) {
      setConfirmStatus('needs-login');
      setConfirmMessage('已偵測到付款返回，請先登入原本付款電郵嘅 Google 帳號完成解鎖。');
      return;
    }

    let cancelled = false;
    (async () => {
      setConfirmStatus('confirming');
      setConfirmMessage('');
      try {
        await confirmStripeSession(sessionId);
        if (cancelled) return;
        setConfirmStatus('success');
        clearSessionIdFromUrl();
      } catch (err) {
        if (cancelled) return;
        if (err?.status === 403) {
          setConfirmStatus('failed');
          setConfirmMessage('付款電郵與目前登入帳號不一致，請切換到付款用嘅帳號再試。');
        } else if (err?.status === 404) {
          setConfirmStatus('pending');
          setConfirmMessage('暫時未找到付款記錄，請等 1-2 分鐘後重新整理。');
        } else if (err?.status === 409) {
          setConfirmStatus('failed');
          setConfirmMessage(err?.message || '付款記錄狀態未就緒，請稍後再試。');
        } else {
          setConfirmStatus('failed');
          setConfirmMessage(err?.message || '付款確認失敗，請稍後再試。');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, isPremium, user, confirmStripeSession]);

  if (loadingEntitlement || (confirmStatus === 'confirming' && !isPremium)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 py-16 text-center">
        <div className="text-4xl mb-4 animate-pulse">⏳</div>
        <h2 className="text-xl font-bold text-text-primary mb-2">確認付款中...</h2>
        <p className="text-text-dim text-sm max-w-lg">
          正在向伺服器核實付款狀態，請稍候。
        </p>
      </div>
    );
  }

  if (isPremium && confirmStatus !== 'failed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 py-16 text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="text-2xl font-bold text-text-primary mb-3">Premium 已啟動！</h2>
        <p className="text-text-dim text-base leading-relaxed max-w-lg">
          你已經解鎖所有 Premium 內容。享受實戰練習同 AI Viber 模板！
        </p>
        {confirmStatus === 'success' && (
          <p className="text-accent-green text-sm mt-3">付款已由後端確認完成。</p>
        )}
      </div>
    );
  }

  return (
    <div className="topic-container">
      <header className="topic-header">
        <h1>Premium 解鎖</h1>
        <p>早鳥限定優惠 · 一次性付款，永久解鎖所有進階內容</p>
      </header>

      {confirmStatus === 'needs-login' && (
        <div className="max-w-2xl mx-auto mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
          <div className="text-sm text-amber-300 mb-2">{confirmMessage}</div>
          <GoogleSignInButton />
        </div>
      )}

      {confirmStatus === 'pending' && (
        <div className="max-w-2xl mx-auto mb-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/25 text-sm text-blue-300">
          {confirmMessage}
        </div>
      )}

      {confirmStatus === 'failed' && (
        <div className="max-w-2xl mx-auto mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-sm text-red-300">
          {confirmMessage}
        </div>
      )}

      {/* Urgency banner */}
      <div className="max-w-2xl mx-auto mb-6 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-center">
        <div className="text-sm font-semibold text-amber-400 mb-0.5">{PREMIUM_COPY.urgencyTitle}</div>
        <div className="text-xs text-text-dim leading-relaxed">
          {PREMIUM_COPY.urgencyBody}
        </div>
      </div>

      {/* 市場對比 */}
      <div className="max-w-2xl mx-auto mb-6">
        <h3 className="text-sm font-semibold text-text-secondary mb-3 text-center">市場對比</h3>
        <div className="grid grid-cols-4 text-[0.75rem] border border-border rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-white/[0.04] text-text-dimmer font-semibold">平台</div>
          <div className="px-3 py-2 bg-white/[0.04] text-text-dimmer font-semibold">價格</div>
          <div className="px-3 py-2 bg-white/[0.04] text-text-dimmer font-semibold">HKD</div>
          <div className="px-3 py-2 bg-white/[0.04] text-text-dimmer font-semibold">特點</div>
          {COMPETITOR_COMPARISON.map((c) => (
            <div key={c.name} className={`contents ${c.highlight ? '[&>div]:bg-accent-indigo/[0.08]' : ''}`}>
              <div className={`px-3 py-2.5 text-text-secondary border-t border-border flex items-center gap-1 ${c.highlight ? 'border-l-2 border-l-accent-indigo font-semibold' : ''}`}>
                {c.flag} {c.name}
              </div>
              <div className="px-3 py-2.5 text-text-dim border-t border-border">{c.price}</div>
              <div className={`px-3 py-2.5 border-t border-border ${c.highlight ? 'text-accent-green font-semibold' : 'text-text-dim'}`}>{c.hkd}</div>
              <div className="px-3 py-2.5 text-text-dim border-t border-border">{c.type}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 你實際得到咩 */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-text-secondary mb-4 text-center">你實際得到咩</h3>
          <div className="flex flex-col gap-2.5 mb-4">
            {VALUE_STACK.map((v) => (
              <div key={v.item} className="flex items-center gap-2.5">
                <span className="text-accent-green text-sm">✓</span>
                <span className="flex-1 text-[0.82rem] text-text-muted">{v.item}</span>
                <span className="text-[0.75rem] text-text-dimmer line-through">{formatHKD(v.value)}{v.suffix}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 text-center">
            <div className="text-xs text-text-dimmer mb-1">
              市場總值 <span className="line-through">{formatHKD(VALUE_STACK.reduce((sum, v) => sum + v.value, 0))}+</span>
            </div>
            <div className="text-lg font-bold text-accent-green mb-1">早鳥價 {formatHKD(standard.salePrice)}</div>
            <div className="text-[0.72rem] text-text-dimmer">{DAILY_COST_REFRAME}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-5 max-w-2xl mx-auto">
        {/* Standard Plan */}
        <div className="card flex-1 flex flex-col items-center text-center py-10 border-accent-indigo/30">
          <div className="text-3xl mb-3">{standard.icon}</div>
          <div className="text-xs font-semibold text-accent-indigo-light uppercase tracking-wider mb-2">{standard.name}</div>
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-base text-text-dimmer line-through">{formatHKD(standard.listPrice)}</span>
            <h2 className="text-2xl font-bold text-text-primary">{formatHKD(standard.salePrice)}</h2>
          </div>
          <div className="inline-block px-2 py-0.5 rounded bg-accent-green/15 text-accent-green text-[0.65rem] font-semibold mb-1">慳 {formatHKD(standard.savings)}</div>
          <p className="text-text-dimmer text-xs mb-6">{standard.billing}</p>

          <div className="w-full text-left mb-8 space-y-2">
            <div className="flex items-start gap-2.5">
              <span className="text-accent-green text-sm">✓</span>
              <span className="text-text-muted text-sm">AI 助手：智能搜尋 + Prompt 生成器</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-accent-green text-sm">✓</span>
              <span className="text-text-muted text-sm">AI 教練模式</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-accent-green text-sm">✓</span>
              <span className="text-text-muted text-sm">實戰項目</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-accent-green text-sm">✓</span>
              <span className="text-text-muted text-sm">所有 ③ 實戰要點 + ④ AI Viber 模板</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-accent-green text-sm">✓</span>
              <span className="text-text-muted text-sm">互動小測驗 + 面試 Checklist</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-text-dimmer text-sm">—</span>
              <span className="text-text-dimmer text-sm">每日 {standard.dailyAiLimit} 次 AI 對話</span>
            </div>
          </div>

          {!user ? (
            <div className="w-full flex flex-col items-center gap-2">
              <p className="text-xs text-text-dim">請先登入再購買</p>
              <GoogleSignInButton />
            </div>
          ) : standard.comingSoon ? (
            <span className="inline-block w-full px-6 py-3 bg-gray-600 text-gray-300 rounded-xl font-semibold text-sm text-center cursor-not-allowed">
              Coming Soon
            </span>
          ) : (
            <a
              href={standard.stripeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full px-6 py-3 bg-accent-indigo hover:bg-accent-indigo-hover text-white rounded-xl font-semibold text-sm transition-colors text-center"
            >
              {standard.ctaText} — {formatHKD(standard.salePrice)}
            </a>
          )}
        </div>

        {/* Pro Plan */}
        <div className="card flex-1 flex flex-col items-center text-center py-10 border-amber-500/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-500 text-black text-[0.6rem] font-bold px-3 py-1 rounded-bl-lg">最抵</div>
          <div className="text-3xl mb-3">{pro.icon}</div>
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">{pro.name}</div>
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-base text-text-dimmer line-through">{formatHKD(pro.listPrice)}</span>
            <h2 className="text-2xl font-bold text-text-primary">{formatHKD(pro.salePrice)}</h2>
          </div>
          <div className="inline-block px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[0.65rem] font-semibold mb-1">慳 {formatHKD(pro.savings)}</div>
          <p className="text-text-dimmer text-xs mb-6">{pro.billing}</p>

          <div className="w-full text-left mb-8 space-y-2">
            <div className="flex items-start gap-2.5">
              <span className="text-accent-green text-sm">✓</span>
              <span className="text-text-muted text-sm">Standard 所有功能</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-amber-400 text-sm">★</span>
              <span className="text-text-muted text-sm">每日 {pro.dailyAiLimit} 次 AI 對話</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-amber-400 text-sm">★</span>
              <span className="text-text-muted text-sm">進階版實戰項目</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-amber-400 text-sm">★</span>
              <span className="text-text-muted text-sm">AI 基礎課題（Pro Only）</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-amber-400 text-sm">★</span>
              <span className="text-text-muted text-sm">踩坑故事</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-amber-400 text-sm">★</span>
              <span className="text-text-muted text-sm">未來所有新功能優先存取</span>
            </div>
          </div>

          {!user ? (
            <div className="w-full flex flex-col items-center gap-2">
              <p className="text-xs text-text-dim">請先登入再購買</p>
              <GoogleSignInButton />
            </div>
          ) : pro.comingSoon ? (
            <span className="inline-block w-full px-6 py-3 bg-gray-600 text-gray-300 rounded-xl font-semibold text-sm text-center cursor-not-allowed">
              Coming Soon
            </span>
          ) : (
            <a
              href={pro.stripeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-semibold text-sm transition-colors text-center"
            >
              {pro.ctaText} — {formatHKD(pro.salePrice)}
            </a>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto mt-5 text-center text-[0.7rem] text-text-darkest leading-relaxed">
        {PREMIUM_COPY.footerNote}
      </div>
    </div>
  );
}
