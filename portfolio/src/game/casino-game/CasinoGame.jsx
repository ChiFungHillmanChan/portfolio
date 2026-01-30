import React, { useEffect, useRef } from 'react';
import './casinoGameStyles.css';

const CasinoGame = () => {
  const iframeRef = useRef(null);

  useEffect(() => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    htmlElement.classList.add('casino-game-mode');
    bodyElement.classList.add('casino-game-mode');
    bodyElement.style.overflow = 'hidden';

    return () => {
      htmlElement.classList.remove('casino-game-mode');
      bodyElement.classList.remove('casino-game-mode');
      bodyElement.style.overflow = '';
    };
  }, []);

  return (
    <div className="casino-game-container">
      <iframe
        title="Casino Game Calculator"
        src="/games/casino-game/index.html"
        className="casino-game-iframe"
        allow="fullscreen"
        ref={iframeRef}
      />
    </div>
  );
};

export default CasinoGame;
