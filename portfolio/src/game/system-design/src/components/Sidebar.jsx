import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../context/PremiumContext';
import topicData from '../data/topics.json';

const STORAGE_KEY = 'sd-sidebar-collapsed';

function loadCollapsed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Default: all sections collapsed
  const defaults = {};
  topicData.categories.forEach((c) => { defaults[c.id] = true; });
  return defaults;
}

const difficultyColors = {
  beginner: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', label: '初級' },
  intermediate: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', label: '中級' },
  advanced: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', label: '高級' },
};

export default function Sidebar({ isOpen, onClose, desktopCollapsed, onToggleDesktop }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const navigate = useNavigate();
  const location = useLocation();
  const { isViewed, total } = useProgress();
  const { user, signInWithGoogle, signOut } = useAuth();
  const { isPremium } = usePremium();

  const toggleSection = useCallback((categoryId) => {
    setCollapsed((prev) => {
      const next = { ...prev, [categoryId]: !prev[categoryId] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const currentSlug = location.pathname.startsWith('/topic/')
    ? location.pathname.replace('/topic/', '')
    : null;

  // Auto-expand the section containing the current topic
  useEffect(() => {
    if (!currentSlug) return;
    const topic = topicData.topics.find((t) => t.slug === currentSlug);
    if (topic && collapsed[topic.category]) {
      setCollapsed((prev) => {
        const next = { ...prev, [topic.category]: false };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, [currentSlug]); // eslint-disable-line react-hooks/exhaustive-deps

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
        groups.push({ type: 'section', id: currentCategory, label: cat?.label || currentCategory, color: cat?.color });
      }
      groups.push({ type: 'topic', ...topic });
    }
    return groups;
  }, [filteredTopics]);

  // When searching, don't collapse anything so results are visible
  const isSearching = search.length > 0;

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
          className={`fixed inset-0 bg-black/50 z-40 ${desktopCollapsed ? '' : 'lg:hidden'}`}
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed z-50 w-[280px] min-w-[280px] h-screen bg-bg-primary border-r border-border flex flex-col transition-transform duration-300 ${
          desktopCollapsed ? '' : 'lg:static'
        } ${
          isOpen ? 'translate-x-0' : `-translate-x-full ${desktopCollapsed ? '' : 'lg:translate-x-0'}`
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

        {/* User info / Login */}
        {user ? (
          <div
            className="px-4 py-3 border-b border-border flex items-center gap-3 cursor-pointer hover:bg-white/[0.03] transition-colors"
            onClick={() => { navigate('/settings'); onClose?.(); }}
          >
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt=""
                className="w-8 h-8 rounded-full flex-shrink-0"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[0.82rem] text-text-secondary truncate">
                {user.displayName || user.email}
              </div>
              <div className="flex items-center gap-1.5">
                {isPremium && (
                  <span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-[rgba(167,139,250,0.2)] text-[#a78bfa]">
                    Premium
                  </span>
                )}
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-dimmer flex-shrink-0">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
        ) : (
          <div className="px-4 py-3 border-b border-border">
            <button
              onClick={(e) => {
                e.stopPropagation();
                signInWithGoogle().catch(() => {});
              }}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-border text-text-secondary text-[0.82rem] font-medium cursor-pointer hover:bg-white/[0.1] hover:border-border-hover transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 48 48" className="flex-shrink-0">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              登入
            </button>
          </div>
        )}

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
              const isClosed = !isSearching && collapsed[item.id];
              // Count topics in this section
              let topicCount = 0;
              for (let j = i + 1; j < groupedTopics.length && groupedTopics[j].type !== 'section'; j++) {
                topicCount++;
              }
              return (
                <button
                  key={`section-${item.id}`}
                  className="flex items-center gap-1.5 w-full text-left text-[0.7rem] font-semibold uppercase tracking-wider px-2.5 pt-4 pb-2 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ color: item.color || '#94a3b8' }}
                  onClick={() => toggleSection(item.id)}
                  aria-expanded={!isClosed}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    className={`flex-shrink-0 transition-transform duration-200 ${isClosed ? '-rotate-90' : ''}`}
                    fill="currentColor"
                  >
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                  <span className="flex-1">{item.label}</span>
                  <span className="text-[0.6rem] font-normal opacity-50">{topicCount}</span>
                </button>
              );
            }

            // Hide topics if their section is collapsed
            const sectionId = item.category;
            if (!isSearching && collapsed[sectionId]) return null;

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
        <div className="px-4 py-3 border-t border-border">
          <div className="text-[0.78rem] text-accent-indigo-light mb-1 text-center">
            已閱讀 {total} / {topicData.topics.filter((t) => !t.disabled).length} 課
          </div>
          <div className="text-[0.68rem] text-text-dimmer text-center mb-2">
            用最簡單嘅方式學最複雜嘅概念
          </div>
          {/* Desktop collapse button */}
          <button
            onClick={() => { onToggleDesktop?.(); onClose?.(); }}
            className="hidden lg:flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-[0.72rem] text-text-dimmer hover:text-text-dim hover:bg-white/[0.03] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
            收起側欄
          </button>
        </div>
      </aside>
    </>
  );
}
