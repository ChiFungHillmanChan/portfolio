import React, { useEffect } from 'react';
import './promptHunterStyles.css';

const PromptHunterGame = () => {
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

  return (
    <div className="prompt-hunter-container">
      <iframe
        title="Prompt Hunter Game"
        src="/games/prompt-hunter/index.html"
        className="prompt-hunter-iframe"
        allow="clipboard-write; fullscreen"
      />
    </div>
  );
};

export default PromptHunterGame;
