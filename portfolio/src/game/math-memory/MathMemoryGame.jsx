import React, { useEffect, useRef } from 'react';
import './mathMemoryStyles.css';

const MathMemoryGame = () => {
  const iframeRef = useRef(null);

  useEffect(() => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    htmlElement.classList.add('math-memory-mode');
    bodyElement.classList.add('math-memory-mode');
    bodyElement.style.overflow = 'hidden';

    return () => {
      htmlElement.classList.remove('math-memory-mode');
      bodyElement.classList.remove('math-memory-mode');
      bodyElement.style.overflow = '';
    };
  }, []);

  return (
    <div className="math-memory-container">
      <iframe
        title="Maths Memory"
        src="/games/math-memory/index.html"
        className="math-memory-iframe"
        allow="fullscreen"
        ref={iframeRef}
      />
    </div>
  );
};

export default MathMemoryGame;
