import { useNavigate } from 'react-router-dom';
import { PREMIUM_PLANS, formatHKD } from '../data/premiumPlans';

export default function PremiumGate() {
  const navigate = useNavigate();
  const standard = PREMIUM_PLANS.standard;

  return (
    <div className="card flex flex-col items-center text-center py-16">
      <div className="text-5xl mb-4">🔒</div>
      <h3 className="text-xl font-bold text-text-primary mb-2">Premium 內容</h3>
      <p className="text-text-muted text-sm leading-relaxed max-w-md mb-2">
        呢個部分包含實戰練習同 AI 提示模板。
      </p>
      <div className="flex items-baseline justify-center gap-2 mb-1">
        <span className="text-sm text-text-dimmer line-through">{formatHKD(standard.listPrice)}</span>
        <span className="text-lg font-bold text-text-primary">{formatHKD(standard.salePrice)}</span>
      </div>
      <div className="inline-block px-2 py-0.5 rounded bg-accent-green/15 text-accent-green text-[0.65rem] font-semibold mb-1">早鳥價 · 慳 {formatHKD(standard.savings)}</div>
      <p className="text-[0.72rem] text-text-dimmer mb-1">比其他平台平 90%+ · AI 互動 + 廣東話</p>
      <p className="text-[0.65rem] text-text-darkest mb-6">一次性付款 · 永久存取 · 未來將轉月費制</p>
      <div className="flex gap-3">
        {standard.comingSoon ? (
          <span className="px-6 py-3 bg-gray-600 text-gray-300 rounded-lg font-medium text-sm cursor-not-allowed">
            Coming Soon
          </span>
        ) : (
          <a
            href={standard.stripeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-accent-indigo hover:bg-accent-indigo-hover text-white rounded-lg font-medium text-sm transition-colors"
          >
            {standard.ctaText} — {formatHKD(standard.salePrice)}
          </a>
        )}
        <button
          onClick={() => navigate('/premium')}
          className="px-6 py-3 bg-transparent border border-border hover:border-border-hover text-text-dim hover:text-text-secondary rounded-lg font-medium text-sm transition-all"
        >
          了解更多
        </button>
      </div>
    </div>
  );
}
