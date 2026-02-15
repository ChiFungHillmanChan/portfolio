import { useState } from 'react';
import { usePremium } from '../context/PremiumContext';
import PremiumGate from './PremiumGate';

export default function TopicTabs({ title, subtitle, tabs }) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');
  const { isPremium } = usePremium();

  return (
    <div className="topic-container">
      <header className="topic-header">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>

      {/* Tab buttons */}
      <div className="flex gap-1 bg-bg-secondary rounded-xl p-1 mb-6 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 border-none rounded-lg text-[0.78rem] sm:text-[0.9rem] font-medium cursor-pointer transition-all whitespace-nowrap font-[inherit] ${
              activeTab === tab.id
                ? 'bg-accent-indigo text-text-primary font-semibold'
                : 'bg-transparent text-text-dim hover:text-text-secondary hover:bg-white/5'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.premium && !isPremium && ' 🔒'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={activeTab === tab.id ? 'block animate-fade-in' : 'hidden'}
        >
          {tab.premium && !isPremium ? (
            <PremiumGate />
          ) : (
            tab.content
          )}
        </div>
      ))}
    </div>
  );
}
