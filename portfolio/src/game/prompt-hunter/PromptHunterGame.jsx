import React, { useEffect, useRef } from 'react';
import './promptHunterStyles.css';

const PromptHunterGame = () => {
  const iframeRef = useRef(null);

  useEffect(() => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    htmlElement.classList.add('prompt-hunter-mode');
    bodyElement.classList.add('prompt-hunter-mode');
    bodyElement.style.overflow = 'hidden';

    return () => {
      htmlElement.classList.remove('prompt-hunter-mode');
      bodyElement.classList.remove('prompt-hunter-mode');
      bodyElement.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return undefined;
    }

    let observer;

    const getIframeDoc = () => iframe.contentDocument || iframe.contentWindow?.document;

    const tagButtons = (doc) => {
      const buttons = Array.from(doc?.querySelectorAll('button') || []);

      const withIcon = (icon) =>
        buttons.find((button) => button.textContent && button.textContent.trim().includes(icon));

      const coffeeButton = withIcon('☕');
      if (coffeeButton) {
        coffeeButton.dataset.promptHunterRole = 'coffee';
      }

      const settingsButton = withIcon('⚙️');
      if (settingsButton) {
        settingsButton.dataset.promptHunterRole = 'settings';
      }
    };

    const ensureStyleSheet = (doc) => {
      if (!doc?.head || doc.getElementById('prompt-hunter-mobile-adjustments')) {
        return;
      }

      const style = doc.createElement('style');
      style.id = 'prompt-hunter-mobile-adjustments';
      style.textContent = `
        @media (max-width: 768px) {
          button[data-prompt-hunter-role="coffee"] {
            top: 8px !important;
            top: calc(env(safe-area-inset-top, 0px) + 8px) !important;
            right: 16px !important;
            right: calc(env(safe-area-inset-right, 0px) + 16px) !important;
          }

          button[data-prompt-hunter-role="settings"] {
            top: 8px !important;
            top: calc(env(safe-area-inset-top, 0px) + 8px) !important;
            left: 16px !important;
            left: calc(env(safe-area-inset-left, 0px) + 16px) !important;
          }
        }

        @media (max-width: 480px) {
          button[data-prompt-hunter-role="coffee"] {
            top: 6px !important;
            top: calc(env(safe-area-inset-top, 0px) + 6px) !important;
            right: 12px !important;
            right: calc(env(safe-area-inset-right, 0px) + 12px) !important;
          }

          button[data-prompt-hunter-role="settings"] {
            top: 6px !important;
            top: calc(env(safe-area-inset-top, 0px) + 6px) !important;
            left: 12px !important;
            left: calc(env(safe-area-inset-left, 0px) + 12px) !important;
          }
        }
      `;

      doc.head.appendChild(style);
    };

    const applyAdjustments = () => {
      try {
        const doc = getIframeDoc();
        if (!doc || !doc.body) {
          return;
        }

        ensureStyleSheet(doc);
        tagButtons(doc);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Prompt Hunter mobile adjustments failed', error);
      }
    };

    const handleLoad = () => {
      applyAdjustments();

      const doc = getIframeDoc();
      if (!doc || !doc.body) {
        return;
      }

      observer?.disconnect();
      observer = new MutationObserver(applyAdjustments);
      observer.observe(doc.body, { childList: true, subtree: true });
    };

    iframe.addEventListener('load', handleLoad);
    handleLoad();

    return () => {
      iframe.removeEventListener('load', handleLoad);
      observer?.disconnect();
    };
  }, []);

  return (
    <div className="prompt-hunter-container">
      <iframe
        title="Prompt Hunter Game"
        src="/games/prompt-hunter/index.html"
        className="prompt-hunter-iframe"
        allow="clipboard-write; fullscreen"
        ref={iframeRef}
      />
    </div>
  );
};

export default PromptHunterGame;
