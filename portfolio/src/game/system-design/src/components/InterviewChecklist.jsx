import { usePremium } from '../context/PremiumContext';

export default function InterviewChecklist({ items }) {
  const { isPremium } = usePremium();

  if (!items || items.length === 0) return null;

  return (
    <div className="card mt-6">
      <h2 className="text-lg font-bold text-text-primary mb-4">✅ 面試 Checklist</h2>
      <div className={isPremium ? '' : 'blur-sm select-none pointer-events-none'}>
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 py-2 border-b border-border last:border-b-0"
          >
            <span className="text-accent-green mt-0.5">☐</span>
            <span className="text-text-muted text-[0.9rem] leading-relaxed">
              {item}
            </span>
          </div>
        ))}
      </div>
      {!isPremium && (
        <p className="mt-3 text-center text-text-dimmer text-[0.8rem]">
          解鎖 Premium 睇完整 Checklist
        </p>
      )}
    </div>
  );
}
