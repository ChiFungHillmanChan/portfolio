import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import topicData from '../data/topics.json';
import roadmapData from '../data/roadmap.json';

function TopicNode({ topic, viewed, onClick, side }) {
  return (
    <div className={`flex items-center gap-0 w-full ${side === 'left' ? 'flex-row' : 'flex-row-reverse'}`}>
      <button
        onClick={onClick}
        className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border text-left transition-all text-[0.9rem] font-medium hover:scale-[1.02] shadow-sm flex-shrink-0 ${
          viewed
            ? 'bg-accent-green/10 border-accent-green/30 text-accent-green-light'
            : 'bg-bg-secondary border-border text-text-secondary hover:border-border-hover hover:bg-bg-tertiary'
        }`}
      >
        <span className="text-lg">{topic.icon}</span>
        <span>{topic.title}</span>
        {viewed && <span className="text-accent-green text-sm flex-shrink-0">✓</span>}
      </button>
      {/* Dashed connector line — stretches to fill gap to center spine */}
      <div
        className={`h-px border-t border-dashed flex-1 min-w-[20px] ${
          viewed ? 'border-accent-green/25' : 'border-white/15'
        }`}
      />
    </div>
  );
}

function MobileTopicNode({ topic, viewed, onClick }) {
  return (
    <div className="flex items-center gap-0">
      {/* Dashed connector to left spine */}
      <div
        className={`h-px border-t border-dashed flex-shrink-0 ${
          viewed ? 'border-accent-green/25' : 'border-white/15'
        }`}
        style={{ width: 24 }}
      />
      <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all text-[0.82rem] font-medium w-full ${
          viewed
            ? 'bg-accent-green/10 border-accent-green/30 text-accent-green-light'
            : 'bg-bg-secondary border-border text-text-secondary hover:border-border-hover hover:bg-bg-tertiary'
        }`}
      >
        <span className="text-base">{topic.icon}</span>
        <span className="flex-1 truncate">{topic.title}</span>
        {viewed && <span className="text-accent-green text-xs flex-shrink-0">✓</span>}
      </button>
    </div>
  );
}

export default function Roadmap() {
  const navigate = useNavigate();
  const { isViewed } = useProgress();

  const topicMap = useMemo(() => {
    const map = {};
    topicData.topics.forEach((t) => { map[t.slug] = t; });
    return map;
  }, []);

  return (
    <div className="h-full overflow-auto">
      <div className="topic-container">
        <header className="topic-header">
          <h1>學習路線圖</h1>
          <p>系統設計學習路徑，按順序學習效果最佳</p>
        </header>
      </div>

      {/* ── Desktop: vertical tree diagram ── */}
      <div className="hidden sm:block relative pb-16 px-4" style={{ maxWidth: 760, margin: '0 auto' }}>
        {roadmapData.groups.map((group, gi) => {
          const viewedCount = group.topics.filter((s) => isViewed(s)).length;
          const left = group.topics.slice(0, Math.ceil(group.topics.length / 2));
          const right = group.topics.slice(Math.ceil(group.topics.length / 2));
          const maxRows = Math.max(left.length, right.length);

          return (
            <div key={group.id} className="relative">
              {/* Vertical spine segment above group header */}
              {gi > 0 && (
                <div
                  className="mx-auto border-l-2 border-dashed border-white/10"
                  style={{ width: 0, height: 28 }}
                />
              )}

              {/* Group header badge */}
              <div className="flex justify-center relative z-10 mb-2">
                <div
                  className="px-6 py-3 rounded-xl text-base font-bold text-white shadow-lg flex items-center gap-3"
                  style={{ background: group.color }}
                >
                  <span>{group.label}</span>
                  <span className="text-xs opacity-70 font-normal">
                    {viewedCount}/{group.topics.length}
                  </span>
                </div>
              </div>

              {/* Spine below header to topics */}
              <div
                className="mx-auto border-l-2 border-dashed"
                style={{ width: 0, height: 12, borderColor: `${group.color}40` }}
              />

              {/* Topic rows: left | spine | right */}
              <div className="relative">
                {/* Vertical spine through topic rows */}
                <div
                  className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 border-l-2 border-dashed"
                  style={{ borderColor: `${group.color}25` }}
                />

                {Array.from({ length: maxRows }).map((_, ri) => {
                  const lSlug = left[ri];
                  const rSlug = right[ri];
                  const lTopic = lSlug ? topicMap[lSlug] : null;
                  const rTopic = rSlug ? topicMap[rSlug] : null;

                  return (
                    <div
                      key={ri}
                      className="grid items-center mb-2.5"
                      style={{ gridTemplateColumns: '1fr 0px 1fr' }}
                    >
                      {/* Left topic */}
                      <div className="flex justify-end">
                        {lTopic && (
                          <TopicNode
                            topic={lTopic}
                            viewed={isViewed(lSlug)}
                            onClick={() => navigate(`/topic/${lSlug}`)}
                            side="left"
                          />
                        )}
                      </div>

                      {/* Center spine placeholder */}
                      <div />

                      {/* Right topic */}
                      <div className="flex justify-start">
                        {rTopic && (
                          <TopicNode
                            topic={rTopic}
                            viewed={isViewed(rSlug)}
                            onClick={() => navigate(`/topic/${rSlug}`)}
                            side="right"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Spine below topics to next group */}
              <div
                className="mx-auto border-l-2 border-dashed border-white/10"
                style={{ width: 0, height: 10 }}
              />
            </div>
          );
        })}
      </div>

      {/* ── Mobile: vertical tree (single-column) ── */}
      <div className="sm:hidden relative pb-12 pl-6 pr-4">
        {roadmapData.groups.map((group, gi) => {
          const viewedCount = group.topics.filter((s) => isViewed(s)).length;

          return (
            <div key={group.id} className="relative">
              {/* Vertical spine on the left side */}
              {gi > 0 && (
                <div
                  className="border-l-2 border-dashed border-white/10"
                  style={{ marginLeft: 0, height: 20 }}
                />
              )}

              {/* Group header badge */}
              <div className="relative z-10 mb-1.5 flex items-center gap-0">
                {/* Horizontal connector from spine to badge */}
                <div
                  className="h-px border-t-2 border-dashed flex-shrink-0"
                  style={{ width: 16, borderColor: `${group.color}50` }}
                />
                <div
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white shadow-md flex items-center gap-2"
                  style={{ background: group.color }}
                >
                  <span>{group.label}</span>
                  <span className="text-[0.65rem] opacity-70 font-normal">
                    {viewedCount}/{group.topics.length}
                  </span>
                </div>
              </div>

              {/* Topics branching from left spine */}
              <div className="relative">
                {/* Vertical spine through topics */}
                <div
                  className="absolute left-0 top-0 bottom-0 border-l-2 border-dashed"
                  style={{ borderColor: `${group.color}25` }}
                />

                <div className="flex flex-col gap-1.5 pl-0">
                  {group.topics.map((slug) => {
                    const topic = topicMap[slug];
                    if (!topic) return null;
                    const viewed = isViewed(slug);
                    return (
                      <MobileTopicNode
                        key={slug}
                        topic={topic}
                        viewed={viewed}
                        onClick={() => navigate(`/topic/${slug}`)}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Spine below topics */}
              <div
                className="border-l-2 border-dashed border-white/10"
                style={{ marginLeft: 0, height: 8 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
