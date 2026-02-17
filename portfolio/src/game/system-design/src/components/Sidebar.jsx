import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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

const PLAN_KEY = 'sd_learning_plan';

export default function Sidebar({ isOpen, onClose, desktopCollapsed, onToggleDesktop, filter, onFilterChange, scrollToSlug, onScrollComplete, onNavigate }) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const navigate = useNavigate();
  const location = useLocation();
  const { isViewed, total } = useProgress();
  const { user, signInWithGoogle, signOut } = useAuth();
  const { isPremium, tier } = usePremium();
  const filterScrollRef = useRef(null);
  const navRef = useRef(null);

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

  // Scroll to active topic when triggered by Layout (direct URL nav)
  useEffect(() => {
    if (!scrollToSlug) return;
    // Small delay to let DOM update after section expand
    const timer = setTimeout(() => {
      const el = navRef.current?.querySelector(`[data-slug="${CSS.escape(scrollToSlug)}"]`);
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      onScrollComplete?.();
    }, 150);
    return () => clearTimeout(timer);
  }, [scrollToSlug, onScrollComplete]);

  // Check if learning plan exists for roadmap filter
  const hasLearningPlan = useMemo(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PLAN_KEY));
      return !!(saved?.pathDetails?.length);
    } catch { return false; }
  }, []);

  const roadmapTopics = useMemo(() => {
    if (filter !== 'roadmap') return null;
    try {
      const saved = JSON.parse(localStorage.getItem(PLAN_KEY));
      if (!saved?.pathDetails) return null;
      return saved.pathDetails.map((item, idx) => {
        const topic = topicData.topics.find((t) => t.slug === item.id);
        return {
          ...topic,
          slug: item.id,
          title: item.titleZh || item.title || topic?.title || item.id,
          sub: topic?.sub || '',
          icon: topic?.icon || '📖',
          roadmapIndex: idx,
          roadmapCompleted: (saved.completed || []).includes(idx),
        };
      }).filter((t) => t);
    } catch { return null; }
  }, [filter]);

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
    onNavigate?.();
    navigate(`/topic/${slug}`);
    onClose?.();
  };

  const handleHomeClick = () => {
    navigate('/');
    onClose?.();
  };

  const totalTopics = topicData.topics.filter((t) => !t.disabled).length;

  const planLabel = tier === 'pro' ? 'Pro' : tier === 'standard' ? 'Standard' : 'Free';
  const planBg = tier === 'pro'
    ? 'bg-[rgba(251,191,36,0.2)] text-[#fbbf24]'
    : tier === 'standard'
    ? 'bg-[rgba(167,139,250,0.2)] text-[#a78bfa]'
    : 'bg-white/[0.06] text-text-dim';

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
          className="px-5 pt-5 pb-4 border-b border-border cursor-pointer hover:bg-white/[0.02] transition-colors flex items-center gap-3"
          onClick={handleHomeClick}
        >
          <div className="flex-1 min-w-0">
            <h1 className="text-[1.15rem] font-bold text-text-primary mb-0.5 tracking-tight">
              系統架構圖解教室
            </h1>
            <p className="text-[0.72rem] text-text-dimmer leading-relaxed">
              輕鬆學系統設計 · {total}/{totalTopics} 課
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

        {/* Filters — wrap to show all */}
        <div className="border-b border-border px-2.5 py-2">
          <div className="flex flex-wrap gap-1.5">
            {hasLearningPlan && (
              <button
                className={`px-2 py-1 rounded-full border text-[0.65rem] font-medium cursor-pointer transition-all whitespace-nowrap ${
                  filter === 'roadmap'
                    ? 'bg-accent-indigo/15 border-accent-indigo text-accent-indigo-light'
                    : 'bg-transparent border-border text-text-dimmer hover:border-border-hover hover:text-text-dim'
                }`}
                onClick={() => onFilterChange(filter === 'roadmap' ? 'all' : 'roadmap')}
              >
                🗺️ 我嘅路線
              </button>
            )}
            {topicData.filters.map((f) => (
              <button
                key={f.id}
                className={`px-2 py-1 rounded-full border text-[0.65rem] font-medium cursor-pointer transition-all whitespace-nowrap ${
                  filter === f.id
                    ? 'bg-accent-indigo/15 border-accent-indigo text-accent-indigo-light'
                    : 'bg-transparent border-border text-text-dimmer hover:border-border-hover hover:text-text-dim'
                }`}
                onClick={() => onFilterChange(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
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

        {/* Nav — takes remaining space minus the fixed footer */}
        <nav ref={navRef} className="flex-1 overflow-y-auto px-2.5 py-3">
          {filter === 'roadmap' && roadmapTopics ? (
            /* Roadmap view — flat list in learning plan order */
            roadmapTopics.map((item) => {
              const isActive = currentSlug === item.slug;
              const viewed = isViewed(item.slug);
              return (
                <button
                  key={item.slug}
                  data-slug={item.slug}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-all relative group cursor-pointer ${
                    isActive
                      ? 'bg-accent-indigo/10 text-text-primary border-l-2 border-accent-indigo'
                      : 'text-text-dim hover:bg-white/[0.03] hover:text-text-secondary'
                  }`}
                  onClick={() => handleTopicClick(item.slug, false)}
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[0.65rem] font-bold"
                    style={{
                      background: item.roadmapCompleted ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.15)',
                      color: item.roadmapCompleted ? '#22c55e' : '#818cf8',
                    }}
                  >
                    {item.roadmapCompleted ? '✓' : item.roadmapIndex + 1}
                  </span>
                  <span
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{ background: 'rgba(99,102,241,0.15)' }}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[0.88rem] truncate">{item.title}</span>
                    <span className="block text-[0.72rem] text-text-dimmer truncate">{item.sub}</span>
                  </span>
                  {viewed && <span className="w-2 h-2 rounded-full bg-accent-green flex-shrink-0" />}
                </button>
              );
            })
          ) : (
            /* Default category-grouped view */
            groupedTopics.map((item, i) => {
              if (item.type === 'section') {
                const isClosed = !isSearching && collapsed[item.id];
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

              const sectionId = item.category;
              if (!isSearching && collapsed[sectionId]) return null;

              const isActive = currentSlug === item.slug;
              const viewed = isViewed(item.slug);
              const diff = item.difficulty ? difficultyColors[item.difficulty] : null;

              return (
                <button
                  key={item.slug}
                  data-slug={item.slug}
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
            })
          )}
        </nav>

        {/* Fixed footer — login / user + settings */}
        <div className="border-t border-border bg-bg-primary flex-shrink-0">
          {user ? (
            <div className="px-3 py-3">
              {/* User row */}
              <div className="flex items-center gap-3 mb-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="w-9 h-9 rounded-full flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-accent-indigo/20 flex items-center justify-center text-sm text-accent-indigo-light flex-shrink-0">
                    {(user.displayName || user.email || '?')[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[0.82rem] text-text-secondary truncate leading-tight">
                    {user.displayName || '未設定名稱'}
                  </div>
                  <div className="text-[0.7rem] text-text-dimmer truncate">{user.email}</div>
                </div>
                <span className={`text-[0.6rem] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${planBg}`}>
                  {planLabel}
                </span>
              </div>
              {/* Settings + Changelog buttons */}
              <div className="flex gap-2">
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-transparent text-text-dim text-[0.78rem] font-medium cursor-pointer hover:bg-white/[0.04] hover:border-border-hover hover:text-text-secondary transition-colors"
                  onClick={() => { navigate('/settings'); onClose?.(); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  設定
                </button>
                <button
                  className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg border border-border bg-transparent text-text-dimmer text-[0.72rem] cursor-pointer hover:bg-white/[0.04] hover:border-border-hover hover:text-text-dim transition-colors"
                  onClick={() => { navigate('/changelog'); onClose?.(); }}
                  title="更新日誌"
                >
                  📋
                </button>
              </div>
            </div>
          ) : (
            <div className="px-3 py-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  signInWithGoogle().catch(() => {});
                }}
                className="flex items-center justify-center gap-2.5 w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-border text-text-secondary text-[0.84rem] font-medium cursor-pointer hover:bg-white/[0.1] hover:border-border-hover transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 48 48" className="flex-shrink-0">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                使用 Google 登入
              </button>
            </div>
          )}

          {/* Desktop collapse button */}
          <button
            onClick={() => { onToggleDesktop?.(); onClose?.(); }}
            className="hidden lg:flex items-center justify-center gap-1.5 w-full py-2 border-t border-border text-[0.72rem] text-text-dimmer hover:text-text-dim hover:bg-white/[0.03] transition-colors"
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
