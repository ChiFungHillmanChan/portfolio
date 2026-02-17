import { Suspense, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import { usePremium } from '../context/PremiumContext';
import topicComponents from '../topics';
import topicData from '../data/topics.json';
import PremiumGate from '../components/PremiumGate';
import TopicNavButtons from '../components/TopicNavButtons';

export default function TopicPage() {
  const { slug } = useParams();
  const { markViewed } = useProgress();
  const { isPremium } = usePremium();

  useEffect(() => {
    if (slug) markViewed(slug);
  }, [slug, markViewed]);

  const TopicComponent = topicComponents[slug];

  if (!TopicComponent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 py-16 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-text-primary mb-2">搵唔到呢個課題</h2>
        <p className="text-text-dim text-sm">slug: {slug}</p>
      </div>
    );
  }

  // Page-level premium gate: if topic is premium and user hasn't unlocked,
  // don't render the component at all. This prevents the lazy-loaded chunk
  // from being downloaded, so content can't be seen in DevTools.
  const topicMeta = topicData.topics.find((t) => t.slug === slug);
  if (topicMeta?.premium && !isPremium) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-6 text-center">
          <span className="text-4xl">{topicMeta.icon}</span>
          <h2 className="text-xl font-bold text-text-primary mt-3">{topicMeta.title}</h2>
          <p className="text-text-muted text-sm mt-1">{topicMeta.sub}</p>
        </div>
        <PremiumGate />
      </div>
    );
  }

  return (
    <>
      <TopicNavButtons currentSlug={slug} variant="compact" />
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="text-text-muted text-sm">載入中⋯</div>
          </div>
        }
      >
        <TopicComponent />
      </Suspense>
      <TopicNavButtons currentSlug={slug} variant="full" />
    </>
  );
}
