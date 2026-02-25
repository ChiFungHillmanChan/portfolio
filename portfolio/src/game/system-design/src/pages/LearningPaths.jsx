import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import { usePremium } from '../context/PremiumContext';
import usePathsProgress from '../hooks/usePathsProgress';
import pathsData from '../data/paths.json';
import topicData from '../data/topics.json';

const COMPLETED_KEY_PREFIX = 'sd_path_completed_';

function loadChallengeStatus() {
  try { return JSON.parse(localStorage.getItem('sd_challenge_status') || '{}'); } catch { return {}; }
}

export default function LearningPaths() {
  const navigate = useNavigate();
  const { isViewed } = useProgress();
  const { isPremium } = usePremium();
  const progress = usePathsProgress();
  const [expandedPath, setExpandedPath] = useState(null);
  const [completedPaths, setCompletedPaths] = useState({});
  const challengeStatus = loadChallengeStatus();

  const topicMap = {};
  topicData.topics.forEach((t) => { topicMap[t.slug] = t; });

  // Load completed state
  useEffect(() => {
    const completed = {};
    for (const path of pathsData) {
      const key = `${COMPLETED_KEY_PREFIX}${path.id}`;
      const date = localStorage.getItem(key);
      if (date) completed[path.id] = date;
    }
    setCompletedPaths(completed);
  }, []);

  // Check for newly completed paths
  useEffect(() => {
    for (const path of pathsData) {
      const p = progress[path.id];
      if (p?.isComplete && !completedPaths[path.id]) {
        const key = `${COMPLETED_KEY_PREFIX}${path.id}`;
        const date = new Date().toISOString().split('T')[0];
        localStorage.setItem(key, date);
        setCompletedPaths((prev) => ({ ...prev, [path.id]: date }));
      }
    }
  }, [progress, completedPaths]);

  return (
    <div className="h-full overflow-auto">
      <div className="topic-container">
        <header className="topic-header">
          <h1>Learning Paths</h1>
          <p>跟住路徑學，完成所有步驟拎證書</p>
        </header>

        <div className="flex flex-col gap-6">
          {pathsData.map((path) => {
            const p = progress[path.id];
            const isExpanded = expandedPath === path.id;
            const completedDate = completedPaths[path.id];

            return (
              <div key={path.id} className="card relative overflow-hidden">
                {/* Path header */}
                <div
                  className="flex items-start gap-4 cursor-pointer"
                  onClick={() => setExpandedPath(isExpanded ? null : path.id)}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: `${path.color}20` }}
                  >
                    {path.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-text-primary">{path.title}</h3>
                      {path.requiresPremium && !isPremium && (
                        <span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-[rgba(167,139,250,0.2)] text-[#a78bfa]">Premium</span>
                      )}
                      {completedDate && (
                        <span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-accent-green/15 text-accent-green-light">Done</span>
                      )}
                    </div>
                    <p className="text-[0.82rem] text-text-dim mb-2">{path.description}</p>
                    <div className="flex items-center gap-3 text-xs text-text-dimmer">
                      <span>{path.topics.length} 課題</span>
                      {path.requiredProjects.length > 0 && <span>{path.requiredProjects.length} 項目</span>}
                      {path.requiredCoachingSessions > 0 && <span>{path.requiredCoachingSessions} 教練對話</span>}
                      <span>~{path.estimatedHours}h</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-sm font-bold" style={{ color: path.color }}>{p?.percent || 0}%</span>
                    <svg
                      width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                      className={`text-text-dimmer transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${p?.percent || 0}%`, background: path.color }}
                  />
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-5 flex flex-col gap-4">
                    {/* Topic checklist */}
                    <div>
                      <h4 className="text-xs font-semibold text-text-dimmer uppercase tracking-wider mb-2">課題</h4>
                      <div className="flex flex-col gap-1.5">
                        {path.topics.map((slug) => {
                          const t = topicMap[slug];
                          const viewed = isViewed(slug);
                          return (
                            <button
                              key={slug}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all hover:bg-white/[0.03] cursor-pointer bg-transparent border-none w-full"
                              onClick={(e) => { e.stopPropagation(); navigate(`/topic/${slug}`); }}
                            >
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.65rem] flex-shrink-0 ${viewed ? 'bg-accent-green/20 text-accent-green' : 'bg-white/[0.06] text-text-darkest'}`}>
                                {viewed ? '✓' : ''}
                              </span>
                              <span className="text-sm flex-shrink-0">{t?.icon || '📖'}</span>
                              <span className={`text-[0.82rem] ${viewed ? 'text-text-secondary' : 'text-text-dim'}`}>
                                {t?.title || slug}
                              </span>
                              {t?.premium && !isPremium && (
                                <span className="text-[0.55rem] px-1 py-0.5 rounded bg-[rgba(167,139,250,0.15)] text-[#a78bfa] ml-auto flex-shrink-0">Premium</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Projects */}
                    {path.requiredProjects.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-text-dimmer uppercase tracking-wider mb-2">實戰項目</h4>
                        <div className="flex flex-col gap-1.5">
                          {path.requiredProjects.map((projectId) => {
                            const passed = challengeStatus[projectId] === 'passed';
                            return (
                              <button
                                key={projectId}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all hover:bg-white/[0.03] cursor-pointer bg-transparent border-none w-full"
                                onClick={(e) => { e.stopPropagation(); navigate('/projects'); }}
                              >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.65rem] flex-shrink-0 ${passed ? 'bg-accent-green/20 text-accent-green' : 'bg-white/[0.06] text-text-darkest'}`}>
                                  {passed ? '✓' : ''}
                                </span>
                                <span className={`text-[0.82rem] ${passed ? 'text-text-secondary' : 'text-text-dim'}`}>
                                  {projectId.replace(/-challenge$/, '').replace(/-/g, ' ')}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Coaching requirement */}
                    {path.requiredCoachingSessions > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-text-dimmer uppercase tracking-wider mb-2">教練對話</h4>
                        <div className="flex items-center gap-2.5 px-3 py-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.65rem] flex-shrink-0 ${p?.coachingDone >= p?.coachingRequired ? 'bg-accent-green/20 text-accent-green' : 'bg-white/[0.06] text-text-darkest'}`}>
                            {p?.coachingDone >= p?.coachingRequired ? '✓' : ''}
                          </span>
                          <span className="text-[0.82rem] text-text-dim">
                            完成 {p?.coachingDone || 0}/{p?.coachingRequired || 0} 次教練對話
                          </span>
                          <button
                            className="ml-auto text-xs text-accent-indigo-light hover:text-accent-indigo transition-colors bg-transparent border-none cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); navigate('/coaching'); }}
                          >
                            開始
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Premium banner for locked paths */}
                    {path.requiresPremium && !isPremium && (
                      <div
                        className="px-4 py-3 rounded-xl text-center"
                        style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}
                      >
                        <p className="text-sm text-[#a78bfa] mb-2">呢條路徑需要 Premium 先可以完成所有課題</p>
                        <button
                          className="px-4 py-1.5 rounded-lg bg-[#a78bfa] text-white text-xs font-medium border-none cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); navigate('/premium'); }}
                        >
                          了解 Premium
                        </button>
                      </div>
                    )}

                    {/* Certificate */}
                    {completedDate && (
                      <div
                        className="relative px-6 py-5 rounded-xl text-center overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, ${path.color}15, ${path.color}08)`,
                          border: `1px solid ${path.color}40`,
                        }}
                      >
                        <div className="text-4xl mb-2">{path.certificate.badge}</div>
                        <h4 className="text-base font-bold text-text-primary mb-1">{path.certificate.title}</h4>
                        <p className="text-xs text-text-dimmer">完成日期：{completedDate}</p>
                        <div className="confetti-container">
                          {[...Array(12)].map((_, i) => (
                            <div key={i} className="confetti-piece" style={{ '--i': i, '--color': path.color }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .confetti-container { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .confetti-piece {
          position: absolute;
          width: 6px; height: 6px;
          background: var(--color);
          opacity: 0;
          border-radius: 1px;
          animation: confetti-fall 2s ease-out forwards;
          animation-delay: calc(var(--i) * 0.1s);
          left: calc(10% + var(--i) * 7%);
          top: -10px;
        }
        @keyframes confetti-fall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(120px) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
