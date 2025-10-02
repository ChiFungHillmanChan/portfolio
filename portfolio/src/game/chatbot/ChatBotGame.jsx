import React, { useEffect, useRef } from 'react';
import './styles.css';
import { createHillmanChatbot } from './js/main';

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600&display=swap';

const ChatBotGame = () => {
  const fontLinkRef = useRef(null);
  const chatbotInstanceRef = useRef(null);

  useEffect(() => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    htmlElement.classList.add('chatbot-mode');
    bodyElement.classList.add('chatbot-mode');
    bodyElement.style.overflow = 'hidden';

    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = FONT_URL;
    document.head.appendChild(fontLink);
    fontLinkRef.current = fontLink;

    const chatbot = createHillmanChatbot();
    chatbotInstanceRef.current = chatbot;

    window.hillmanBot = chatbot;

    chatbot.init().catch((error) => {
      console.error('Failed to initialize chatbot:', error);
    });

    return () => {
      if (fontLinkRef.current && fontLinkRef.current.parentNode) {
        fontLinkRef.current.parentNode.removeChild(fontLinkRef.current);
      }

      document.querySelectorAll('.theme-transition-overlay, .video-modal').forEach((element) => {
        element.remove();
      });

      htmlElement.classList.remove('chatbot-mode');
      bodyElement.classList.remove('chatbot-mode');
      bodyElement.style.overflow = '';

      if (window.sessionManager && typeof window.sessionManager.reset === 'function') {
        window.sessionManager.reset();
      }

      window.navigationManager = undefined;
      window.themeManager = undefined;
      window.messageRenderer = undefined;
      window.topicManager = undefined;
      window.securityManager = undefined;
      window.chatManager = undefined;
      window.hillmanBot = undefined;

      chatbotInstanceRef.current = null;
    };
  }, []);

  return (
    <div className="chatbot-root">
      <div className="welcome-overlay" id="welcomeOverlay">
        <div className="welcome-content">
          <div className="welcome-text" id="welcomeText" />
        </div>
      </div>

      <div className="circuit-bg" />

      <div className="nav-controls">
        <button className="nav-toggle" id="navToggle" aria-label="Toggle navigation">
          <span className="hamburger" />
          <span className="hamburger" />
          <span className="hamburger" />
        </button>
        <a
          className="coffee-support-btn"
          href="https://buymeacoffee.com/hillmanchan709"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Buy me a coffee"
          title="Buy me a coffee"
        >
          ☕
        </a>
      </div>

      <div className="sidebar-overlay" id="sidebarOverlay" />

      <div className="sidebar" id="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">Navigation</div>
          <button className="sidebar-close" id="sidebarClose" aria-label="Close navigation">
            &times;
          </button>
        </div>
        <button className="main-theme-btn" id="mainThemeBtn">🏠 Back to Main Chat</button>
        <div className="discovered-themes">
          <div className="themes-section-title">Discovered Themes</div>
          <div id="discoveredThemes" />
        </div>
      </div>

      <div className="chat-container" id="chatContainer">
        <div className="chat-header">
          <h1>Chat with Me</h1>
          <p>Holaaa. This is Hillman. You interesting in getting know about me? Just pick a topic!</p>
        </div>

        <div className="chat-messages" id="chatMessages" />

        <div className="typing-indicator" id="typingIndicator">
          <div className="typing-dots">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="topic-selection" id="topicSelection">
          <div className="topics-grid" id="topicsGrid" />
        </div>
      </div>
    </div>
  );
};

export default ChatBotGame;
