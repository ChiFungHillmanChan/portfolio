import { useState } from 'react';
import { usePremium } from '../context/PremiumContext';
import PremiumGate from './PremiumGate';

// Desktop grid: always N columns matching tab count
// Mobile grid: 2 cols for 4 tabs, 3 cols for 5-6 tabs
const GRID_CLASSES = {
  4: 'grid grid-cols-2 sm:grid-cols-4',
  5: 'grid grid-cols-3 sm:grid-cols-5',
  6: 'grid grid-cols-3 sm:grid-cols-6',
};

export default function TopicTabs({ title, subtitle, tabs }) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');
  const { isPremium } = usePremium();

  const count = tabs.length;
  const gridClass = GRID_CLASSES[count] || `grid grid-cols-2 sm:grid-cols-${count}`;

  return (
    <div className="topic-container">
      <header className="topic-header">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>

      {/* Tab buttons — grid on mobile, row on desktop */}
      <div className={`${gridClass} gap-1 bg-bg-secondary rounded-xl p-1.5 mb-6`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isLocked = tab.premium && !isPremium;

          return (
            <button
              key={tab.id}
              className={`min-w-0 px-1.5 sm:px-3 py-2 sm:py-2.5 border-none rounded-lg text-[0.7rem] sm:text-[0.82rem] font-medium cursor-pointer transition-all font-[inherit] text-center leading-snug ${
                isActive
                  ? 'bg-accent-indigo text-text-primary font-semibold'
                  : 'bg-transparent text-text-dim hover:text-text-secondary hover:bg-white/5'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {isLocked && <span className="inline-block ml-0.5 text-[0.6rem] sm:text-[0.7rem] opacity-70">🔒</span>}
            </button>
          );
        })}
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
