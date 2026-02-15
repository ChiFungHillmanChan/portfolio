import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import topicComponents from '../topics';

export default function TopicPage() {
  const { slug } = useParams();
  const { markViewed } = useProgress();

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

  return <TopicComponent />;
}
