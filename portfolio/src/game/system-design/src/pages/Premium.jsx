import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePremium } from '../context/PremiumContext';
import { STRIPE_URL as STRIPE_STANDARD, STRIPE_PRO_URL as STRIPE_PRO } from '../config/constants';

export default function Premium() {
  const { isPremium, activatePremium } = usePremium();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId && !isPremium) {
      activatePremium(sessionId);
    }
  }, [searchParams, isPremium, activatePremium]);

  if (isPremium) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 py-16 text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="text-2xl font-bold text-text-primary mb-3">Premium 已啟動！</h2>
        <p className="text-text-dim text-base leading-relaxed max-w-lg">
          你已經解鎖所有 Premium 內容。享受實戰練習同 AI Viber 模板！
        </p>
      </div>
    );
  }

  return (
    <div className="topic-container">
      <header className="topic-header">
        <h1>Premium 解鎖</h1>
        <p>早鳥限定優惠 · 一次性付款，永久解鎖所有進階內容</p>
      </header>

      {/* Urgency banner */}
      <div className="max-w-2xl mx-auto mb-6 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-center">
        <div className="text-sm font-semibold text-amber-400 mb-0.5">早鳥價 · 限時優惠 80% OFF</div>
        <div className="text-xs text-text-dim leading-relaxed">
          未來計劃轉為月費訂閱制。而家以一次性價格鎖定，即享永久存取權，唔受未來加價影響。
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-5 max-w-2xl mx-auto">
        {/* Standard Plan */}
        <div className="card flex-1 flex flex-col items-center text-center py-10 border-accent-indigo/30">
          <div className="text-3xl mb-3">🔓</div>
          <div className="text-xs font-semibold text-accent-indigo-light uppercase tracking-wider mb-2">Standard</div>
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-base text-text-dimmer line-through">HK$750</span>
            <h2 className="text-2xl font-bold text-text-primary">HK$150</h2>
          </div>
          <div className="inline-block px-2 py-0.5 rounded bg-accent-green/15 text-accent-green text-[0.65rem] font-semibold mb-1">慳 HK$600</div>
          <p className="text-text-dimmer text-xs mb-6">一次性付款 · 永久存取</p>

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
              <span className="text-text-dimmer text-sm">每日 20 次 AI 對話</span>
            </div>
          </div>

          <a
            href={STRIPE_STANDARD}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full px-6 py-3 bg-accent-indigo hover:bg-accent-indigo-hover text-white rounded-xl font-semibold text-sm transition-colors text-center"
          >
            立即鎖定早鳥價 — HK$150
          </a>
        </div>

        {/* Pro Plan */}
        <div className="card flex-1 flex flex-col items-center text-center py-10 border-amber-500/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-500 text-black text-[0.6rem] font-bold px-3 py-1 rounded-bl-lg">最抵</div>
          <div className="text-3xl mb-3">⚡</div>
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Pro</div>
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-base text-text-dimmer line-through">HK$1,999</span>
            <h2 className="text-2xl font-bold text-text-primary">HK$399</h2>
          </div>
          <div className="inline-block px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[0.65rem] font-semibold mb-1">慳 HK$1,600</div>
          <p className="text-text-dimmer text-xs mb-6">一次性付款 · 永久存取</p>

          <div className="w-full text-left mb-8 space-y-2">
            <div className="flex items-start gap-2.5">
              <span className="text-accent-green text-sm">✓</span>
              <span className="text-text-muted text-sm">Standard 所有功能</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-amber-400 text-sm">★</span>
              <span className="text-text-muted text-sm">每日 80 次 AI 對話</span>
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

          <a
            href={STRIPE_PRO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-semibold text-sm transition-colors text-center"
          >
            立即鎖定早鳥價 — HK$399
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto mt-5 text-center text-[0.7rem] text-text-darkest leading-relaxed">
        早鳥優惠隨時結束。一經購買即鎖定永久存取權，不受未來價格調整影響。
      </div>
    </div>
  );
}
