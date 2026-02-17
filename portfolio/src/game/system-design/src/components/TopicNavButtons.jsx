import { useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import topicData from '../data/topics.json';

const PLAN_KEY = 'sd_learning_plan';

function getTopicList(filter) {
  if (filter === 'roadmap') {
    try {
      const saved = JSON.parse(localStorage.getItem(PLAN_KEY));
      if (saved?.pathDetails?.length) {
        return saved.pathDetails.map((item) => {
          const topic = topicData.topics.find((t) => t.slug === item.id);
          return {
            slug: item.id,
            title: item.titleZh || item.title || topic?.title || item.id,
            icon: topic?.icon || '',
          };
        });
      }
    } catch { /* fall through */ }
  }
  // Default: all non-disabled topics in order
  return topicData.topics
    .filter((t) => !t.disabled)
    .map((t) => ({ slug: t.slug, title: t.title, icon: t.icon }));
}

export default function TopicNavButtons({ currentSlug, variant = 'compact' }) {
  const navigate = useNavigate();
  const context = useOutletContext();
  const filter = context?.filter || 'all';

  const { prev, next } = useMemo(() => {
    const list = getTopicList(filter);
    const idx = list.findIndex((t) => t.slug === currentSlug);
    return {
      prev: idx > 0 ? list[idx - 1] : null,
      next: idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null,
    };
  }, [filter, currentSlug]);

  if (!prev && !next) return null;

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2 border-b border-border bg-bg-primary/50">
        {prev ? (
          <button
            onClick={() => navigate(`/topic/${prev.slug}`)}
            className="flex items-center gap-1.5 text-[0.78rem] text-text-dim hover:text-text-secondary transition-colors min-w-0"
          >
            <span className="flex-shrink-0">&larr;</span>
            <span className="truncate">{prev.title}</span>
          </button>
        ) : <span />}
        {next ? (
          <button
            onClick={() => navigate(`/topic/${next.slug}`)}
            className="flex items-center gap-1.5 text-[0.78rem] text-text-dim hover:text-text-secondary transition-colors min-w-0"
          >
            <span className="truncate">{next.title}</span>
            <span className="flex-shrink-0">&rarr;</span>
          </button>
        ) : <span />}
      </div>
    );
  }

  // Full variant — card-style buttons at bottom
  return (
    <div className="flex flex-row gap-3 px-4 sm:px-6 py-6 border-t border-border mt-8">
      {prev ? (
        <button
          onClick={() => navigate(`/topic/${prev.slug}`)}
          className="flex-1 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 rounded-lg border border-border bg-white/[0.02] hover:bg-white/[0.05] hover:border-border-hover transition-colors text-left group min-w-0"
        >
          <span className="text-text-dimmer group-hover:text-text-dim transition-colors flex-shrink-0">&larr;</span>
          <span className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-lg items-center justify-center text-sm bg-[rgba(99,102,241,0.15)]">
            {prev.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-[0.68rem] text-text-dimmer">上一課</span>
            <span className="block text-[0.78rem] sm:text-[0.84rem] text-text-secondary truncate">{prev.title}</span>
          </span>
        </button>
      ) : <span className="flex-1" />}
      {next ? (
        <button
          onClick={() => navigate(`/topic/${next.slug}`)}
          className="flex-1 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 rounded-lg border border-border bg-white/[0.02] hover:bg-white/[0.05] hover:border-border-hover transition-colors text-right group justify-end min-w-0"
        >
          <span className="min-w-0">
            <span className="block text-[0.68rem] text-text-dimmer">下一課</span>
            <span className="block text-[0.78rem] sm:text-[0.84rem] text-text-secondary truncate">{next.title}</span>
          </span>
          <span className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-lg items-center justify-center text-sm bg-[rgba(99,102,241,0.15)]">
            {next.icon}
          </span>
          <span className="text-text-dimmer group-hover:text-text-dim transition-colors flex-shrink-0">&rarr;</span>
        </button>
      ) : <span className="flex-1" />}
    </div>
  );
}
