import React, { useEffect, useRef } from 'react';
import './systemDesignStyles.css';

const SystemDesignGame = () => {
  const iframeRef = useRef(null);

  useEffect(() => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    htmlElement.classList.add('system-design-mode');
    bodyElement.classList.add('system-design-mode');
    bodyElement.style.overflow = 'hidden';

    return () => {
      htmlElement.classList.remove('system-design-mode');
      bodyElement.classList.remove('system-design-mode');
      bodyElement.style.overflow = '';
    };
  }, []);

  return (
    <div className="system-design-container">
      <iframe
        title="System Design"
        src="https://system-design.hillmanchan.com"
        className="system-design-iframe"
        allow="fullscreen"
        ref={iframeRef}
      />
    </div>
  );
};

export default SystemDesignGame;
