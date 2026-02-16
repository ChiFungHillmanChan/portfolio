import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

function getScrollParent(el) {
  let node = el?.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY)) return node;
    node = node.parentElement;
  }
  return null;
}

export default function TableOfContents({ blocks }) {
  const [activeId, setActiveId] = useState('');
  const scrollParentRef = useRef(null);

  const headings = useMemo(() => {
    return blocks
      .filter(b => b.type === 'heading' && b.level >= 1 && b.level <= 4)
      .map(b => ({
        id: b.id || b.content?.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-').replace(/-+$/, ''),
        text: b.content,
        level: b.level,
      }));
  }, [blocks]);

  const resolveScrollParent = useCallback(() => {
    if (scrollParentRef.current) return scrollParentRef.current;
    const firstHeading = headings.length > 0 ? document.getElementById(headings[0].id) : null;
    if (firstHeading) {
      scrollParentRef.current = getScrollParent(firstHeading);
    }
    return scrollParentRef.current;
  }, [headings]);

  useEffect(() => {
    if (headings.length === 0) return;

    // Small delay so DOM is ready and scroll parent can be found
    const timer = setTimeout(() => {
      const root = resolveScrollParent();

      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries.filter(e => e.isIntersecting);
          if (visible.length > 0) {
            setActiveId(visible[0].target.id);
          }
        },
        { root: root || null, rootMargin: '-88px 0px -60% 0px', threshold: 0 }
      );

      headings.forEach(h => {
        const el = document.getElementById(h.id);
        if (el) observer.observe(el);
      });

      // Store cleanup
      timer._observer = observer;
    }, 100);

    return () => {
      clearTimeout(timer);
      if (timer._observer) timer._observer.disconnect();
    };
  }, [headings, resolveScrollParent]);

  if (headings.length < 2) return null;

  const handleClick = (id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const scrollContainer = resolveScrollParent();
    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset = elRect.top - containerRect.top + scrollContainer.scrollTop - 88;
      scrollContainer.scrollTo({ top: offset, behavior: 'smooth' });
    } else {
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
