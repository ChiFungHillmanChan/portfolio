import { useNavigate } from 'react-router-dom';

export default function RelatedTopics({ topics }) {
  const navigate = useNavigate();

  if (!topics || topics.length === 0) return null;

  return (
    <div className="related-topics">
      <h3>相關課題</h3>
      <div className="related-links">
        {topics.map((t) => (
          <button
            key={t.slug}
            className="related-link"
            onClick={() => navigate(`/topic/${t.slug}`)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
