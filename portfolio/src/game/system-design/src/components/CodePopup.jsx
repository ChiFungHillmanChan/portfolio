import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export default function CodePopup({ title, description, code, language }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.body.style.overflow = original;
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  return (
    <>
      <button className="code-popup-trigger" onClick={() => setOpen(true)}>
        <div className="font-semibold text-text-primary text-sm mb-1">{title}</div>
        {description && <div className="text-text-dimmer text-xs">{description}</div>}
        <div className="text-accent-indigo text-xs mt-2">點擊查看代碼 →</div>
      </button>

      {open && createPortal(
        <div className="code-popup-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="code-popup-content">
            <button className="code-popup-close" onClick={() => setOpen(false)}>×</button>
            <h3 className="text-lg font-bold text-text-primary mb-4">{title}</h3>
            <div className="content-code-block">
              <div className="content-code-header">
                <div className="content-code-dots"><span /><span /><span /></div>
                {language && <span className="content-code-lang">{language}</span>}
                <button
                  onClick={handleCopy}
                  className={`content-code-copy ${copied ? 'copied' : ''}`}
                >
                  {copied ? '已複製' : '複製'}
                </button>
              </div>
              <pre><code>{code}</code></pre>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
