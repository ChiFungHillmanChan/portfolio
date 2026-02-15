import { useNavigate } from 'react-router-dom';

const STRIPE_URL = 'https://buy.stripe.com/6oU7sF6V20nA5Nhcip3Nm05';

export default function PremiumGate() {
  const navigate = useNavigate();

  return (
    <div className="card flex flex-col items-center text-center py-16">
      <div className="text-5xl mb-4">🔒</div>
      <h3 className="text-xl font-bold text-text-primary mb-2">Premium 內容</h3>
      <p className="text-text-muted text-sm leading-relaxed max-w-md mb-6">
        呢個部分包含實戰練習同 AI 提示模板。
        <br />
        付款 HK$150 即時解鎖全部 Premium 內容。
      </p>
      <div className="flex gap-3">
        <a
          href={STRIPE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 bg-accent-indigo hover:bg-accent-indigo-hover text-white rounded-lg font-medium text-sm transition-colors"
        >
          解鎖 Premium — HK$150
        </a>
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
