import { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import TableOfContents from './TableOfContents';
import CodePopup from './CodePopup';

/* ── Inline Markdown Parser ── */
function parseInline(text) {
  if (!text) return null;
  const parts = [];
  let remaining = text;
  let key = 0;

  const patterns = [
    { regex: /\*\*(.+?)\*\*/, render: (m) => <strong key={key++}>{m[1]}</strong> },
    { regex: /\*(.+?)\*/, render: (m) => <em key={key++}>{m[1]}</em> },
    { regex: /~~(.+?)~~/, render: (m) => <del key={key++}>{m[1]}</del> },
    { regex: /==(.+?)==/, render: (m) => <mark key={key++} className="content-highlight">{m[1]}</mark> },
    { regex: /`(.+?)`/, render: (m) => <code key={key++} className="content-inline-code">{m[1]}</code> },
    { regex: /\[(.+?)\]\((.+?)\)/, render: (m) => <a key={key++} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-accent-indigo-light hover:underline">{m[1]}</a> },
  ];

  while (remaining.length > 0) {
    let earliest = null;
    let earliestIdx = Infinity;
    let matchedPattern = null;

    for (const p of patterns) {
      const match = remaining.match(p.regex);
      if (match && match.index < earliestIdx) {
        earliest = match;
        earliestIdx = match.index;
        matchedPattern = p;
      }
    }

    if (!earliest) {
      parts.push(remaining);
      break;
    }

    if (earliestIdx > 0) {
      parts.push(remaining.slice(0, earliestIdx));
    }
    parts.push(matchedPattern.render(earliest));
    remaining = remaining.slice(earliestIdx + earliest[0].length);
  }

  return parts;
}

/* ── Copy Button ── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`content-code-copy ${copied ? 'copied' : ''}`}
    >
      {copied ? '已複製' : '複製'}
    </button>
  );
}

/* ── Image with Zoom ── */
function ZoomImage({ src, alt, size = 10 }) {
  const [zoomed, setZoomed] = useState(false);
  const widthMap = { 1: '10%', 2: '20%', 3: '30%', 4: '40%', 5: '50%', 6: '60%', 7: '70%', 8: '80%', 9: '90%', 10: '100%' };
  const maxW = widthMap[size] || '100%';

  return (
    <>
      <img
        src={src}
        alt={alt || ''}
        loading="lazy"
        className="content-image"
        style={{ maxWidth: maxW }}
        onClick={() => setZoomed(true)}
      />
      {zoomed && createPortal(
        <div className="content-image-zoom" onClick={() => setZoomed(false)}>
          <img src={src} alt={alt || ''} />
        </div>,
        document.body
      )}
    </>
  );
}

/* ── Block Renderers ── */
function renderBlock(block, index, allBlocks, searchFilter) {
  const key = `block-${index}`;

  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level || 2}`;
      const id = block.id || block.content?.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-').replace(/-+$/, '');
      const sizeMap = { 1: 'text-2xl', 2: 'text-xl', 3: 'text-lg', 4: 'text-base' };
      return (
        <Tag key={key} id={id} className={`${sizeMap[block.level] || 'text-xl'} font-bold text-text-primary mt-8 mb-4 scroll-mt-24`}>
          {parseInline(block.content)}
        </Tag>
      );
    }

    case 'text':
      return (
        <p key={key} className="text-[0.95rem] text-text-muted leading-[1.8] mb-3">
          {parseInline(block.content)}
        </p>
      );

    case 'blockquote':
      return (
        <blockquote key={key} className="content-blockquote">
          {parseInline(block.content)}
        </blockquote>
      );

    case 'line-break':
      return <div key={key} className="h-4" />;

    case 'horizontal-rule':
      return <hr key={key} className="border-border my-6" />;

    case 'code': {
      const codeText = Array.isArray(block.content) ? block.content.join('\n') : block.content;
      return (
        <div key={key} className="content-code-block">
          <div className="content-code-header">
            <div className="content-code-dots"><span /><span /><span /></div>
            {block.language && <span className="content-code-lang">{block.language}</span>}
            <CopyButton text={codeText} />
          </div>
          <pre><code>{codeText}</code></pre>
        </div>
      );
    }

    case 'terminal': {
      const text = Array.isArray(block.content) ? block.content.join('\n') : block.content;
      return <div key={key} className="terminal">{text}</div>;
    }

    case 'code_popup':
    case 'code_pop_up': {
      if (searchFilter && !block.title?.toLowerCase().includes(searchFilter.toLowerCase())) {
        return null;
      }
      const codeText = Array.isArray(block.content) ? block.content.join('\n') : block.content;
      return (
        <CodePopup
          key={key}
          title={block.title}
          description={block.description}
          code={codeText}
          language={block.language}
        />
      );
    }

    case 'table':
      return (
        <div key={key} className="content-table-wrapper">
          <table className="content-table">
            {block.headers && (
              <thead>
                <tr>{block.headers.map((h, i) => <th key={i}>{parseInline(h)}</th>)}</tr>
              </thead>
            )}
            <tbody>
              {block.rows?.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => <td key={ci}>{parseInline(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag key={key} className={`${block.ordered ? 'list-decimal' : 'list-disc'} pl-6 mb-4 space-y-1 text-[0.95rem] text-text-muted`}>
          {block.items?.map((item, i) => (
            <li key={i} className="leading-[1.8]">{parseInline(item)}</li>
          ))}
        </Tag>
      );
    }

    case 'task-list':
      return (
        <ul key={key} className="pl-2 mb-4 space-y-2 text-[0.95rem]">
          {block.items?.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-text-muted">
              <span className={`mt-1 text-sm ${item.checked ? 'text-accent-green' : 'text-text-dimmer'}`}>
                {item.checked ? '✅' : '⬜'}
              </span>
              <span className="leading-[1.8]">{parseInline(item.text || item.content)}</span>
            </li>
          ))}
        </ul>
      );

    case 'definition-list':
      return (
        <dl key={key} className="mb-4 space-y-3">
          {block.items?.map((item, i) => (
            <div key={i}>
              <dt className="font-semibold text-accent-indigo-light text-[0.95rem]">{parseInline(item.term)}</dt>
              <dd className="pl-4 text-text-muted text-[0.9rem] leading-[1.8]">{parseInline(item.definition)}</dd>
            </div>
          ))}
        </dl>
      );

    case 'card':
      return (
        <div key={key} className="card">
          {block.icon && <div className="text-2xl mb-2">{block.icon}</div>}
          {block.title && <h3 className="text-lg font-bold text-text-primary mb-2">{parseInline(block.title)}</h3>}
          {block.content && <p className="text-[0.95rem] text-text-muted leading-[1.8] mb-0">{parseInline(block.content)}</p>}
          {block.link && (
            <button
              onClick={() => {
                if (block.link.startsWith('/')) {
                  window.location.hash = `#${block.link}`;
                } else {
                  window.open(block.link, '_blank');
                }
              }}
              className="mt-3 text-accent-indigo-light text-sm hover:underline bg-transparent border-none cursor-pointer"
            >
              {block.linkText || '了解更多 →'}
            </button>
          )}
        </div>
      );

    case 'card-grid':
      return (
        <div key={key} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {block.cards?.map((card, i) => renderBlock({ ...card, type: 'card' }, `${index}-card-${i}`, allBlocks))}
        </div>
      );

    case 'callout': {
      const variant = block.variant || 'info';
      const icons = { info: 'ℹ️', warning: '⚠️', success: '✅', error: '❌' };
      return (
        <div key={key} className={`callout callout-${variant}`}>
          <div className="flex items-start gap-3">
            <span className="text-lg flex-shrink-0">{block.icon || icons[variant]}</span>
            <div>
              {block.title && <div className="font-semibold mb-1">{parseInline(block.title)}</div>}
              <div>{parseInline(block.content)}</div>
            </div>
          </div>
        </div>
      );
    }

    case 'image':
      return <ZoomImage key={key} src={block.src} alt={block.alt} size={block.size} />;

    case 'video':
      return (
        <video key={key} controls className="rounded-xl max-w-full my-4" poster={block.poster}>
          <source src={block.src} type={block.mimeType || 'video/mp4'} />
        </video>
      );

    case 'youtube_video':
      return (
        <div key={key} className="relative w-full aspect-video my-4 rounded-xl overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/${block.videoId}`}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            loading="lazy"
          />
        </div>
      );

    case 'link':
      return (
        <a key={key} href={block.url} target="_blank" rel="noopener noreferrer" className="text-accent-indigo-light hover:underline block mb-2">
          {parseInline(block.content || block.url)}
        </a>
      );

    case 'download-link':
      return (
        <a key={key} href={block.url} download className="inline-flex items-center gap-2 text-accent-indigo-light hover:underline mb-2">
          📥 {parseInline(block.content || '下載')}
        </a>
      );

    case 'footnote':
      return (
        <div key={key} className="text-xs text-text-dimmer mt-4 pt-4 border-t border-border">
          <sup>{block.id}</sup> {parseInline(block.content)}
        </div>
      );

    case 'search_bar':
      return null; // Handled at top level

    default:
      return null;
  }
}

/* ── Main ContentRenderer ── */
export default function ContentRenderer({ blocks, showTOC = false, className = '' }) {
  const [searchFilter, setSearchFilter] = useState('');

  const hasSearchBar = useMemo(() => blocks.some(b => b.type === 'search_bar'), [blocks]);

  const rendered = useMemo(() => {
    return blocks.map((block, i) => {
      if (block.type === 'search_bar') {
        return (
          <div key={`search-${i}`} className="mb-6">
            <input
              type="text"
              placeholder={block.placeholder || '搜尋...'}
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-text-secondary placeholder:text-text-dimmer focus:outline-none focus:border-accent-indigo"
            />
          </div>
        );
      }
      return renderBlock(block, i, blocks, hasSearchBar ? searchFilter : null);
    });
  }, [blocks, searchFilter, hasSearchBar]);

  return (
    <div className={`relative ${className}`}>
      {showTOC && <TableOfContents blocks={blocks} />}
      <div>{rendered}</div>
    </div>
  );
}
