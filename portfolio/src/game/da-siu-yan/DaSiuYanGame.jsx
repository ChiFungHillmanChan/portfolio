import React, { useEffect, useRef } from 'react';
import './daSiuYanStyles.css';

const DaSiuYanGame = () => {
  const iframeRef = useRef(null);

  useEffect(() => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    htmlElement.classList.add('da-siu-yan-mode');
    bodyElement.classList.add('da-siu-yan-mode');
    bodyElement.style.overflow = 'hidden';

    return () => {
      htmlElement.classList.remove('da-siu-yan-mode');
      bodyElement.classList.remove('da-siu-yan-mode');
      bodyElement.style.overflow = '';
    };
  }, []);

  return (
    <div className="da-siu-yan-container">
      <iframe
        title="打小人"
        src="/games/da-siu-yan/index.html"
        className="da-siu-yan-iframe"
        allow="fullscreen"
        ref={iframeRef}
      />
    </div>
  );
};

export default DaSiuYanGame;
