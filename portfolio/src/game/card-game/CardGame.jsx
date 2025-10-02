import React, { useEffect } from 'react';
import './cardGameStyles.css';

const CardGame = () => {
  useEffect(() => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    htmlElement.classList.add('card-game-mode');
    bodyElement.classList.add('card-game-mode');
    bodyElement.style.overflow = 'hidden';

    return () => {
      htmlElement.classList.remove('card-game-mode');
      bodyElement.classList.remove('card-game-mode');
      bodyElement.style.overflow = '';
    };
  }, []);

  return (
    <div className="card-game-container">
      <iframe
        title="Never Have I Ever Card Game"
        src="/games/card-game/index.html"
        className="card-game-iframe"
        allow="clipboard-write; fullscreen"
      />
    </div>
  );
};

export default CardGame;
