import React, { useEffect, useRef } from 'react';
import './cardDrawerStyles.css';

const CardDrawerGame = () => {
  const iframeRef = useRef(null);

  useEffect(() => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    htmlElement.classList.add('card-drawer-mode');
    bodyElement.classList.add('card-drawer-mode');
    bodyElement.style.overflow = 'hidden';

    return () => {
      htmlElement.classList.remove('card-drawer-mode');
      bodyElement.classList.remove('card-drawer-mode');
      bodyElement.style.overflow = '';
    };
  }, []);

  return (
    <div className="card-drawer-container">
      <iframe
        title="Card Drawer"
        src="/games/card-drawer/index.html"
        className="card-drawer-iframe"
        allow="fullscreen"
        ref={iframeRef}
      />
    </div>
  );
};

export default CardDrawerGame;
