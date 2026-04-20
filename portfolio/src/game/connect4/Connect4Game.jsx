import React, { useEffect } from 'react';
import './connect4GameStyles.css';

const Connect4Game = () => {
  useEffect(() => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    htmlElement.classList.add('connect4-game-mode');
    bodyElement.classList.add('connect4-game-mode');
    bodyElement.style.overflow = 'hidden';

    return () => {
      htmlElement.classList.remove('connect4-game-mode');
      bodyElement.classList.remove('connect4-game-mode');
      bodyElement.style.overflow = '';
    };
  }, []);

  return (
    <div className="connect4-container">
      <iframe
        title="Connect 4 — Human vs Machine"
        src="/games/connect4/index.html"
        className="connect4-iframe"
        allow="fullscreen"
      />
    </div>
  );
};

export default Connect4Game;
