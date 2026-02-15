import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import topicData from '../data/topics.json';

const difficultyColors = {
  beginner: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', label: '初級' },
  intermediate: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', label: '中級' },
  advanced: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', label: '高級' },
};

export default function Sidebar({ isOpen, onClose }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { isViewed, total } = useProgress();

  const currentSlug = location.pathname.startsWith('/topic/')
    ? location.pathname.replace('/topic/', '')
    : null;

  const filteredTopics = useMemo(() => {
    return topicData.topics.filter((t) => {
      if (filter !== 'all' && t.category !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.sub.toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filter, search]);

  const groupedTopics = useMemo(() => {
    const groups = [];
    let currentCategory = null;
    for (const topic of filteredTopics) {
      if (topic.category !== currentCategory) {
        currentCategory = topic.category;
        const cat = topicData.categories.find((c) => c.id === currentCategory);
        groups.push({ type: 'section', label: cat?.label || currentCategory, color: cat?.color });
      }
      groups.push({ type: 'topic', ...topic });
    }
    return groups;
  }, [filteredTopics]);

  const handleTopicClick = (slug, disabled) => {
    if (disabled) return;
    navigate(`/topic/${slug}`);
    onClose?.();
  };

  const handleHomeClick = () => {
    navigate('/');
    onClose?.();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static z-50 w-[280px] min-w-[280px] h-screen bg-bg-primary border-r border-border flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div
          className="px-5 pt-6 pb-5 border-b border-border cursor-pointer hover:bg-white/[0.02] transition-colors flex items-center gap-3"
          onClick={handleHomeClick}
        >
          <div className="flex-1 min-w-0">
            <h1 className="text-[1.15rem] font-bold text-text-primary mb-1 tracking-tight">
              系統架構圖解教室
            </h1>
            <p className="text-[0.78rem] text-text-dimmer leading-relaxed">
              輕鬆學系統設計
            </p>
          </div>
          <a
            className="coffee-btn"
            href="https://buymeacoffee.com/hillmanchan709"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Buy me a coffee"
            onClick={(e) => e.stopPropagation()}
          >
            ☕
          </a>
        </div>

        {/* Filters */}
        <div className="px-2.5 pt-2.5 pb-1 border-b border-border flex flex-wrap gap-1.5">
          {topicData.filters.map((f) => (
            <button
              key={f.id}
              className={`px-2.5 py-1 rounded-full border text-[0.68rem] font-medium cursor-pointer transition-all whitespace-nowrap ${
                filter === f.id
                  ? 'bg-accent-indigo/15 border-accent-indigo text-accent-indigo-light'
                  : 'bg-transparent border-border text-text-dimmer hover:border-border-hover hover:text-text-dim'
              }`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-2.5 py-2 border-b border-border">
          <input
            type="text"
            placeholder="搜尋課題..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-secondary text-[0.84rem] outline-none focus:border-accent-indigo placeholder:text-text-darkest"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          {groupedTopics.map((item, i) => {
            if (item.type === 'section') {
              return (
                <div
                  key={`section-${i}`}
                  className="text-[0.7rem] font-semibold uppercase tracking-wider px-2.5 pt-4 pb-2"
                  style={{ color: item.color || '#4b5563' }}
                >
                  {item.label}
                </div>
              );
            }

            const isActive = currentSlug === item.slug;
            const viewed = isViewed(item.slug);
            const diff = item.difficulty ? difficultyColors[item.difficulty] : null;

            return (
              <button
                key={item.slug}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-all relative group ${
                  item.disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer'
                } ${
                  isActive
                    ? 'bg-accent-indigo/10 text-text-primary border-l-2 border-accent-indigo'
                    : 'text-text-dim hover:bg-white/[0.03] hover:text-text-secondary'
                } ${item.highlight ? 'border border-accent-indigo/30 mt-2' : ''}`}
                onClick={() => handleTopicClick(item.slug, item.disabled)}
                disabled={item.disabled}
              >
                <span
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{
                    background: item.category === 'ai-core'
                      ? 'rgba(167,139,250,0.2)'
                      : 'rgba(99,102,241,0.15)',
                  }}
                >
                  {item.icon}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[0.88rem] truncate">
                    {item.title}
                  </span>
                  <span className="block text-[0.72rem] text-text-dimmer truncate">
                    {item.sub}
                  </span>
                </span>
                {viewed && (
                  <span className="w-2 h-2 rounded-full bg-accent-green flex-shrink-0" />
                )}
                {item.premium && (
                  <span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-[rgba(167,139,250,0.2)] text-[#a78bfa] flex-shrink-0">
                    Premium
                  </span>
                )}
                {diff && (
                  <span
                    className="text-[0.6rem] px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: diff.bg, color: diff.text }}
                  >
                    {diff.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border text-center">
          <div className="text-[0.78rem] text-accent-indigo-light mb-1">
            已閱讀 {total} / {topicData.topics.filter((t) => !t.disabled).length} 課
          </div>
          <div className="text-[0.68rem] text-text-dimmer">
            用最簡單嘅方式學最複雜嘅概念
          </div>
        </div>
      </aside>
    </>
  );
}
