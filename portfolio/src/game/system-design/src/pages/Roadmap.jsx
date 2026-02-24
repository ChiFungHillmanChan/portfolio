import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import { usePremium } from '../context/PremiumContext';
import topicData from '../data/topics.json';
import roadmapData from '../data/roadmap.json';

const NEW_BADGE_DAYS = 30;
function isNewTopic(addedDate) {
  if (!addedDate) return false;
  const added = new Date(addedDate);
  const now = new Date();
  return (now - added) / (1000 * 60 * 60 * 24) <= NEW_BADGE_DAYS;
}

/* ── Topological sort (Kahn's) within a group ── */
function topoSortGroup(slugs, edges) {
  const slugSet = new Set(slugs);
  const adj = {};
  const inDeg = {};
  slugs.forEach(s => { adj[s] = []; inDeg[s] = 0; });

  edges.forEach(([from, to]) => {
    if (slugSet.has(from) && slugSet.has(to)) {
      adj[from].push(to);
      inDeg[to]++;
    }
  });

  const orderIndex = {};
  slugs.forEach((s, i) => { orderIndex[s] = i; });

  const queue = slugs.filter(s => inDeg[s] === 0)
    .sort((a, b) => orderIndex[a] - orderIndex[b]);
  const sorted = [];

  while (queue.length) {
    const node = queue.shift();
    sorted.push(node);
    for (const next of adj[node]) {
      inDeg[next]--;
      if (inDeg[next] === 0) {
        let inserted = false;
        for (let i = 0; i < queue.length; i++) {
          if (orderIndex[next] < orderIndex[queue[i]]) {
            queue.splice(i, 0, next);
            inserted = true;
            break;
          }
        }
        if (!inserted) queue.push(next);
      }
    }
  }

  return sorted;
}

/* ── Inline SVG icons (no emoji) ── */
const CheckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const LockIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CrownIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" opacity="0.7">
    <path d="M2.5 18.5l2-10 5 4 2.5-6 2.5 6 5-4 2 10z" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

/* ── Node index label (1, 2, 3...) for unlocked nodes ── */
const NodeNumber = ({ n }) => (
  <span className="text-base font-bold leading-none">{n}</span>
);

/* ── Offsets ── */
const OFFSETS_DESKTOP = [0, 64, 0, -64];
const OFFSETS_MOBILE = [0, 40, 0, -40];

export default function Roadmap() {
  const navigate = useNavigate();
  const { isViewed } = useProgress();
  const { isPremium } = usePremium();
  const currentRef = useRef(null);

  const topicMap = useMemo(() => {
    const map = {};
    topicData.topics.forEach(t => { map[t.slug] = t; });
    return map;
  }, []);

  const prereqMap = useMemo(() => {
    const map = {};
    roadmapData.edges.forEach(([from, to]) => {
      if (!map[to]) map[to] = [];
      map[to].push(from);
    });
    return map;
  }, []);

  const orderedGroups = useMemo(() =>
    roadmapData.groups.map(group => ({
      ...group,
      sortedTopics: topoSortGroup(group.topics, roadmapData.edges),
    })),
  []);

  // Filter: premium topics are skipped for non-premium users
  const visibleGroups = useMemo(() =>
    orderedGroups.map(g => ({
      ...g,
      visibleTopics: g.sortedTopics.filter(slug => {
        const t = topicMap[slug];
        return t && (isPremium || !t.premium);
      }),
    })).filter(g => g.visibleTopics.length > 0),
  [orderedGroups, topicMap, isPremium]);

  const allSlugs = useMemo(() =>
    visibleGroups.flatMap(g => g.visibleTopics),
  [visibleGroups]);

  const totalViewed = useMemo(() =>
    allSlugs.filter(s => isViewed(s)).length,
  [allSlugs, isViewed]);

  const isUnlocked = useCallback((slug) => {
    const prereqs = (prereqMap[slug] || []).filter(p => {
      // Only consider non-premium prereqs for free users, or all for premium
      const t = topicMap[p];
      return t && (isPremium || !t.premium);
    });
    return prereqs.length === 0 || prereqs.every(p => isViewed(p));
  }, [prereqMap, isViewed, topicMap, isPremium]);

  const currentSlug = useMemo(() => {
    for (const slug of allSlugs) {
      if (!isViewed(slug) && isUnlocked(slug)) return slug;
    }
    return null;
  }, [allSlugs, isViewed, isUnlocked]);

  useEffect(() => {
    if (currentRef.current) {
      setTimeout(() => {
        currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [currentSlug]);

  const getNodeState = (slug) => {
    if (isViewed(slug)) return 'completed';
    if (slug === currentSlug) return 'current';
    if (isUnlocked(slug)) return 'unlocked';
    return 'locked';
  };

  // Count premium topics being hidden
  const hiddenPremiumCount = useMemo(() => {
    if (isPremium) return 0;
    return orderedGroups.reduce((sum, g) =>
      sum + g.sortedTopics.filter(s => topicMap[s]?.premium).length, 0);
  }, [orderedGroups, topicMap, isPremium]);

  // Running index across all visible topics
  let globalIndex = 0;

  return (
    <div className="h-full overflow-auto">
      <div className="topic-container">
        <header className="topic-header" style={{ paddingBottom: 8 }}>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">學習路線圖</h1>
          <p className="text-base text-text-secondary mt-1">
            系統設計完整學習路徑 — 跟住順序學效果最好
          </p>
          {/* Progress bar */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <div className="h-2.5 rounded-full bg-bg-tertiary overflow-hidden" style={{ width: 280 }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${allSlugs.length ? (totalViewed / allSlugs.length) * 100 : 0}%`,
                  background: 'linear-gradient(90deg, #10B981, #34d399)',
                }}
              />
            </div>
            <span className="text-sm font-semibold text-text-dim whitespace-nowrap">
              {totalViewed} / {allSlugs.length}
            </span>
          </div>
          {/* Premium topics hidden notice */}
          {hiddenPremiumCount > 0 && (
            <button
              onClick={() => navigate('/premium')}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 hover:bg-amber-400/15 transition-colors"
            >
              <CrownIcon size={12} />
              <span>{hiddenPremiumCount} 個付費課題已鎖定</span>
              <ArrowIcon />
            </button>
          )}
        </header>
      </div>

      {/* ── Desktop snake path ── */}
      <div className="hidden sm:block relative pb-20 px-4" style={{ maxWidth: 460, margin: '0 auto' }}>
        {visibleGroups.map((group, gi) => {
          const viewedCount = group.visibleTopics.filter(s => isViewed(s)).length;

          return (
            <div key={group.id}>
              {/* Group header */}
              <div className={`flex justify-center ${gi > 0 ? 'mt-8' : 'mt-2'} mb-5`}>
                <div
                  className="px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-lg flex items-center gap-3"
                  style={{
                    background: `linear-gradient(135deg, ${group.color}, ${group.color}cc)`,
                    boxShadow: `0 4px 20px ${group.color}30`,
                  }}
                >
                  <span className="text-base tracking-wide">{group.label}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/15 text-xs font-semibold">
                    {viewedCount}/{group.visibleTopics.length}
                  </span>
                </div>
              </div>

              {/* Nodes */}
              <div className="relative" style={{ maxWidth: 360, margin: '0 auto' }}>
                {group.visibleTopics.map((slug, i) => {
                  const topic = topicMap[slug];
                  if (!topic) return null;

                  globalIndex++;
                  const nodeNum = globalIndex;
                  const state = getNodeState(slug);
                  const offset = OFFSETS_DESKTOP[i % 4];
                  const containerCenter = 180;

                  const prevOffset = i > 0 ? OFFSETS_DESKTOP[(i - 1) % 4] : 0;
                  const prevSlug = i > 0 ? group.visibleTopics[i - 1] : null;
                  const prevCompleted = prevSlug && isViewed(prevSlug);
                  const prevX = containerCenter + prevOffset;
                  const currX = containerCenter + offset;
                  const midX = (prevX + currX) / 2;

                  const isCurrent = state === 'current';
                  const isLocked = state === 'locked';
                  const isCompleted = state === 'completed';

                  // Colors
                  const ringColor = isCompleted ? '#10B981' : isCurrent ? '#818cf8' : isLocked ? '#1e2030' : '#475569';
                  const bgColor = isCompleted
                    ? 'rgba(16,185,129,0.12)'
                    : isCurrent
                      ? 'rgba(129,140,248,0.15)'
                      : isLocked
                        ? 'rgba(20,22,36,0.7)'
                        : 'rgba(51,65,85,0.15)';

                  return (
                    <div key={slug}>
                      {/* Connector */}
                      {i > 0 && (
                        <svg width="100%" height="36" className="overflow-visible" style={{ display: 'block' }}>
                          <path
                            d={`M ${prevX} 0 Q ${midX} 18 ${currX} 36`}
                            stroke={prevCompleted ? '#10B981' : '#1e293b'}
                            strokeWidth={prevCompleted ? 3 : 2}
                            strokeDasharray={prevCompleted ? '' : '6 4'}
                            fill="none"
                          />
                        </svg>
                      )}

                      {/* Node */}
                      <div
                        className="flex flex-col items-center"
                        style={{ transform: `translateX(${offset}px)` }}
                        ref={isCurrent ? currentRef : undefined}
                      >
                        <button
                          onClick={() => !isLocked && navigate(`/topic/${slug}`)}
                          className={`group relative flex flex-col items-center ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          title={isLocked ? '需要先完成前置課題' : topic.title}
                        >
                          {/* Pulse for current */}
                          {isCurrent && (
                            <span
                              className="absolute w-16 h-16 rounded-full animate-ping"
                              style={{ backgroundColor: 'rgba(129,140,248,0.15)', animationDuration: '2.5s', top: -2, left: -2 }}
                            />
                          )}
                          {/* Outer glow for current */}
                          {isCurrent && (
                            <span
                              className="absolute w-[72px] h-[72px] rounded-full"
                              style={{
                                background: 'radial-gradient(circle, rgba(129,140,248,0.12) 0%, transparent 70%)',
                                top: -6, left: -6,
                              }}
                            />
                          )}
                          <div
                            className={`w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all duration-200 ${
                              isLocked ? '' : 'group-hover:scale-110 group-hover:shadow-lg'
                            }`}
                            style={{
                              border: `3px solid ${ringColor}`,
                              backgroundColor: bgColor,
                              boxShadow: isCurrent ? `0 0 20px rgba(129,140,248,0.3), 0 0 40px rgba(129,140,248,0.1)` : 'none',
                              opacity: isLocked ? 0.4 : 1,
                            }}
                          >
                            {isCompleted
                              ? <span className="text-[#10B981]"><CheckIcon /></span>
                              : isLocked
                                ? <span className="text-[#475569]"><LockIcon size={20} /></span>
                                : <span className={isCurrent ? 'text-[#a5b4fc]' : 'text-text-secondary'}><NodeNumber n={nodeNum} /></span>
                            }
                          </div>
                        </button>
                        <span
                          className={`text-[0.8rem] mt-2 text-center max-w-[160px] leading-snug font-medium ${
                            isCompleted ? 'text-[#6ee7b7]' :
                            isCurrent ? 'text-text-primary font-semibold' :
                            isLocked ? 'text-[#334155]' : 'text-text-secondary'
                          }`}
                        >
                          {topic.title}
                        </span>
                        {isNewTopic(topic.addedDate) && (
                          <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-[rgba(52,211,153,0.2)] text-[#34d399] font-semibold mt-1">
                            New
                          </span>
                        )}
                        {/* Group color dot */}
                        <span
                          className="w-1.5 h-1.5 rounded-full mt-1.5"
                          style={{ backgroundColor: group.color, opacity: isLocked ? 0.2 : 0.6 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div className="flex justify-center mt-12">
          <button
            onClick={() => navigate('/planner')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bg-secondary border border-border text-text-secondary hover:text-text-primary hover:border-border-hover text-sm font-medium transition-all"
          >
            <span>想要個人化學習計劃？試下 AI Planner</span>
            <ArrowIcon />
          </button>
        </div>
      </div>

      {/* ── Mobile snake path ── */}
      <MobilePath
        visibleGroups={visibleGroups}
        topicMap={topicMap}
        isViewed={isViewed}
        getNodeState={getNodeState}
        currentSlug={currentSlug}
        currentRef={currentRef}
        navigate={navigate}
        hiddenPremiumCount={hiddenPremiumCount}
      />
    </div>
  );
}

/* ── Mobile component (separate to keep globalIndex scoped) ── */
function MobilePath({ visibleGroups, topicMap, isViewed, getNodeState, currentSlug, currentRef, navigate }) {
  let globalIndex = 0;

  return (
    <div className="sm:hidden relative pb-14 px-3" style={{ maxWidth: 320, margin: '0 auto' }}>
      {visibleGroups.map((group, gi) => {
        const viewedCount = group.visibleTopics.filter(s => isViewed(s)).length;

        return (
          <div key={group.id}>
            {/* Group header */}
            <div className={`flex justify-center ${gi > 0 ? 'mt-6' : 'mt-1'} mb-3`}>
              <div
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${group.color}, ${group.color}cc)`,
                  boxShadow: `0 3px 12px ${group.color}25`,
                }}
              >
                <span className="tracking-wide">{group.label}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/15 text-[0.6rem] font-semibold">
                  {viewedCount}/{group.visibleTopics.length}
                </span>
              </div>
            </div>

            {/* Nodes */}
            <div className="relative" style={{ maxWidth: 280, margin: '0 auto' }}>
              {group.visibleTopics.map((slug, i) => {
                const topic = topicMap[slug];
                if (!topic) return null;

                globalIndex++;
                const nodeNum = globalIndex;
                const state = getNodeState(slug);
                const offset = OFFSETS_MOBILE[i % 4];
                const containerCenter = 140;

                const prevOffset = i > 0 ? OFFSETS_MOBILE[(i - 1) % 4] : 0;
                const prevSlug = i > 0 ? group.visibleTopics[i - 1] : null;
                const prevCompleted = prevSlug && isViewed(prevSlug);
                const prevX = containerCenter + prevOffset;
                const currX = containerCenter + offset;
                const midX = (prevX + currX) / 2;

                const isCurrent = state === 'current';
                const isLocked = state === 'locked';
                const isCompleted = state === 'completed';

                const ringColor = isCompleted ? '#10B981' : isCurrent ? '#818cf8' : isLocked ? '#1e2030' : '#475569';
                const bgColor = isCompleted
                  ? 'rgba(16,185,129,0.12)'
                  : isCurrent
                    ? 'rgba(129,140,248,0.15)'
                    : isLocked
                      ? 'rgba(20,22,36,0.7)'
                      : 'rgba(51,65,85,0.15)';

                return (
                  <div key={slug}>
                    {i > 0 && (
                      <svg width="100%" height="30" className="overflow-visible" style={{ display: 'block' }}>
                        <path
                          d={`M ${prevX} 0 Q ${midX} 15 ${currX} 30`}
                          stroke={prevCompleted ? '#10B981' : '#1e293b'}
                          strokeWidth={prevCompleted ? 2.5 : 1.5}
                          strokeDasharray={prevCompleted ? '' : '5 3'}
                          fill="none"
                        />
                      </svg>
                    )}

                    <div
                      className="flex flex-col items-center"
                      style={{ transform: `translateX(${offset}px)` }}
                      ref={isCurrent ? currentRef : undefined}
                    >
                      <button
                        onClick={() => !isLocked && navigate(`/topic/${slug}`)}
                        className={`group relative flex flex-col items-center ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {isCurrent && (
                          <span
                            className="absolute w-12 h-12 rounded-full animate-ping"
                            style={{ backgroundColor: 'rgba(129,140,248,0.15)', animationDuration: '2.5s', top: -1, left: -1 }}
                          />
                        )}
                        <div
                          className={`w-[42px] h-[42px] rounded-full flex items-center justify-center transition-transform ${
                            isLocked ? '' : 'group-hover:scale-110'
                          }`}
                          style={{
                            border: `2.5px solid ${ringColor}`,
                            backgroundColor: bgColor,
                            boxShadow: isCurrent ? `0 0 14px rgba(129,140,248,0.25)` : 'none',
                            opacity: isLocked ? 0.4 : 1,
                          }}
                        >
                          {isCompleted
                            ? <span className="text-[#10B981]"><CheckIcon /></span>
                            : isLocked
                              ? <span className="text-[#475569]"><LockIcon size={16} /></span>
                              : <span className={`text-sm font-bold ${isCurrent ? 'text-[#a5b4fc]' : 'text-text-secondary'}`}>{nodeNum}</span>
                          }
                        </div>
                      </button>
                      <span
                        className={`text-[0.68rem] mt-1 text-center max-w-[120px] leading-tight font-medium ${
                          isCompleted ? 'text-[#6ee7b7]' :
                          isCurrent ? 'text-text-primary font-semibold' :
                          isLocked ? 'text-[#334155]' : 'text-text-secondary'
                        }`}
                      >
                        {topic.title}
                      </span>
                      {isNewTopic(topic.addedDate) && (
                        <span className="text-[0.5rem] px-1 py-0.5 rounded-full bg-[rgba(52,211,153,0.2)] text-[#34d399] font-semibold mt-0.5">
                          New
                        </span>
                      )}
                      <span
                        className="w-1 h-1 rounded-full mt-1"
                        style={{ backgroundColor: group.color, opacity: isLocked ? 0.2 : 0.6 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div className="flex justify-center mt-8">
        <button
          onClick={() => navigate('/planner')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-bg-secondary border border-border text-text-secondary hover:text-text-primary text-xs font-medium transition-all"
        >
          <span>AI 學習計劃</span>
          <ArrowIcon />
        </button>
      </div>
    </div>
  );
}
