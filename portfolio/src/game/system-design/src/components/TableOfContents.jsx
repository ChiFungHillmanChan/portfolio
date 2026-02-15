import { useState, useEffect, useMemo } from 'react';

export default function TableOfContents({ blocks }) {
  const [activeId, setActiveId] = useState('');

  const headings = useMemo(() => {
    return blocks
      .filter(b => b.type === 'heading' && b.level >= 1 && b.level <= 4)
      .map(b => ({
        id: b.id || b.content?.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-').replace(/-+$/, ''),
        text: b.content,
        level: b.level,
      }));
  }, [blocks]);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-88px 0px -60% 0px', threshold: 0 }
    );

    headings.forEach(h => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  const handleClick = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <nav className="toc-container hidden">
      <div className="toc-title">目錄</div>
      {headings.map(h => (
        <button
          key={h.id}
          onClick={() => handleClick(h.id)}
          className={`toc-item ${h.level >= 3 ? 'toc-item-h3' : ''} ${activeId === h.id ? 'active' : ''}`}
        >
          {h.text}
        </button>
      ))}
    </nav>
  );
}
