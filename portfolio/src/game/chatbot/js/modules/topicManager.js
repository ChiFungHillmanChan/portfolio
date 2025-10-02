import { Helpers } from '../utils/helpers';
import { CONFIG } from '../config';
import { ResponseProcessor } from '../utils/responseProcessor';

class TopicManager {
    constructor() {
        this.topicSelection = null;
        this.topicsGrid = null;
        this.isTextMode = false;
        this.currentContext = null;
        this.chatInput = null;
        this.sendButton = null;
        this.isMobile = window.innerWidth <= 768;
    }

    init() {
        this.topicSelection = document.getElementById('topicSelection');
        this.topicsGrid = document.getElementById('topicsGrid');
        
        // Listen for orientation changes and resize events
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleMobileViewportFix(), 500);
        });
        
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
        });
    }

    showMainTopics() {
        this.isTextMode = false;
        this.topicsGrid.innerHTML = '';
        
        Object.entries(CONFIG.TOPICS).forEach(([key, config]) => {
            if (window.chatManager.trainingData.responses[config.category]) {
                const button = this.createTopicButton(config.label, () => {
                    this.handleMainTopicSelection(config.category, config.label);
                });
                this.topicsGrid.appendChild(button);
            }
        });

        const tryChatButton = this.createTopicButton('💬 Try Chat', () => {
            this.showMainTextMode();
        }, false, 'try-chat-btn');
        this.topicsGrid.appendChild(tryChatButton);
    }

    showMainTextMode() {
        this.isTextMode = true;
        this.topicsGrid.innerHTML = '';
        
        const textContainer = this.createTextInputContainer('Type your message...', () => this.showMainTopics());
        this.topicsGrid.appendChild(textContainer);
        
        this.bindTextModeEvents(() => window.chatManager.handleMainTextInput());
        
        if (window.sessionManager.shouldShowFirstTryChatMessage()) {
            window.sessionManager.markTryChatClicked();
            
            setTimeout(() => {
                window.messageRenderer.showTyping();
                setTimeout(() => {
                    window.messageRenderer.hideTyping();
                    window.messageRenderer.addMessageWithTyping('ai', CONFIG.SESSION.FIRST_TRY_CHAT_MESSAGE);
                }, 500);
            }, 500);
        }
        
        this.focusInputSafely();
    }

    showThemeTopics(themeData) {
        this.isTextMode = false;
        this.topicsGrid.innerHTML = '';
        
        if (themeData.conversation_starters) {
            themeData.conversation_starters.forEach(starter => {
                const button = this.createTopicButton(starter, () => {
                    this.handleThemeTopicSelection(starter, themeData);
                });
                this.topicsGrid.appendChild(button);
            });
        }
        
        const tryChatButton = this.createTopicButton('💬 Keep Chatting', () => {
            this.showThemeTextMode(themeData);
        }, false, 'try-chat-btn');
        this.topicsGrid.appendChild(tryChatButton);
    }

    showThemeTextMode(themeData) {
        this.isTextMode = true;
        this.topicsGrid.innerHTML = '';
        
        const textContainer = this.createTextInputContainer('Continue the conversation...', () => this.showThemeTopics(themeData));
        this.topicsGrid.appendChild(textContainer);
        
        this.bindTextModeEvents(() => window.chatManager.handleThemeTextInput(themeData));
        this.focusInputSafely();
    }

    showFollowUpTopics(currentCategory) {
        this.topicsGrid.innerHTML = '';
        
        const followUpTopics = CONFIG.FOLLOW_UP_TOPICS[currentCategory] || [];
        
        followUpTopics.forEach(topic => {
            const button = this.createTopicButton(topic.label, () => {
                this.handleMainTopicSelection(topic.category, topic.label);
            });
            this.topicsGrid.appendChild(button);
        });

        const backButton = this.createTopicButton('🔄 More Topics', () => {
            this.showMainTopics();
        });
        this.topicsGrid.appendChild(backButton);
        
        const tryChatButton = this.createTopicButton('💬 Try Chat', () => {
            this.showMainTextMode();
        }, false, 'try-chat-btn');
        this.topicsGrid.appendChild(tryChatButton);
    }

    createTopicButton(label, onClick, isEasterEgg = false, extraClass = '') {
        const button = Helpers.createElement('div', `topic-button ${isEasterEgg ? 'easter-egg' : ''} ${extraClass}`, label);
        button.addEventListener('click', onClick);
        return button;
    }

    createTextInputContainer(placeholder, backCallback) {
        const textContainer = Helpers.createElement('div', 'text-input-container');
        textContainer.innerHTML = `
            <div class="text-input-wrapper">
                <input type="text" id="chatInput" placeholder="${placeholder}" class="chat-input" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                <button id="sendButton" class="send-button">Send</button>
            </div>
            <button id="backToTopics" class="back-button">🔄 Back to Topics</button>
        `;
        
        const backButton = textContainer.querySelector('#backToTopics');
        backButton.addEventListener('click', backCallback);
        
        return textContainer;
    }

    bindTextModeEvents(handleInputCallback) {
        this.chatInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('sendButton');
        
        if (this.chatInput) {
            // Handle mobile-specific input events
            this.chatInput.addEventListener('focus', () => {
                if (this.isMobile) {
                    this.handleMobileInputFocus();
                }
            });
            
            this.chatInput.addEventListener('blur', () => {
                if (this.isMobile) {
                    this.handleMobileInputBlur();
                }
            });
            
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleInputSubmission(handleInputCallback);
                }
            });
        }
        
        if (this.sendButton) {
            this.sendButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleInputSubmission(handleInputCallback);
            });
        }
    }

    handleInputSubmission(handleInputCallback) {
        if (this.isMobile) {
            // Blur input first to trigger viewport reset
            if (this.chatInput) {
                this.chatInput.blur();
            }
            
            // Small delay to ensure blur completes
            setTimeout(() => {
                handleInputCallback();
                this.handleMobileViewportFix();
            }, 100);
        } else {
            handleInputCallback();
        }
    }

    handleMobileInputFocus() {
        // Scroll to ensure input is visible
        setTimeout(() => {
            if (this.chatInput) {
                this.chatInput.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
        }, 300);
    }

    handleMobileInputBlur() {
        // Force viewport reset on mobile
        setTimeout(() => {
            this.handleMobileViewportFix();
        }, 100);
    }

    handleMobileViewportFix() {
        if (!this.isMobile) return;
        
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        }
        
        setTimeout(() => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }, 300);
    }

    focusInputSafely() {
        if (this.chatInput) {
            if (this.isMobile) {
                // Delay focus on mobile to prevent immediate zoom
                setTimeout(() => {
                    this.chatInput.focus();
                }, 300);
            } else {
                setTimeout(() => {
                    this.chatInput.focus();
                }, 100);
            }
        }
    }

    handleMainTopicSelection(category, topicLabel) {
        window.messageRenderer.addMessage('user', topicLabel);
        this.currentContext = category;
        
        window.messageRenderer.showTyping();
        setTimeout(() => {
            window.messageRenderer.hideTyping();
            const response = ResponseProcessor.getRandomResponse(category, window.chatManager.trainingData);
            window.messageRenderer.addMessageWithTyping('ai', response);
            this.showFollowUpTopics(category);
            
            // Fix mobile viewport after AI response
            if (this.isMobile) {
                setTimeout(() => {
                    this.handleMobileViewportFix();
                }, 1000);
            }
        }, CONFIG.TIMING.TYPING_RESPONSE_MIN + Math.random() * CONFIG.TIMING.TYPING_RESPONSE_MAX);
    }

    handleThemeTopicSelection(starter, themeData) {
        window.messageRenderer.addMessage('user', starter);
        
        window.messageRenderer.showTyping();
        setTimeout(() => {
            window.messageRenderer.hideTyping();
            const response = ResponseProcessor.getThemeResponse(starter, themeData);
            window.messageRenderer.addMessageWithTyping('ai', response);
            this.showThemeTopics(themeData);
            
            // Fix mobile viewport after AI response
            if (this.isMobile) {
                setTimeout(() => {
                    this.handleMobileViewportFix();
                }, 1000);
            }
        }, CONFIG.TIMING.TYPING_RESPONSE_MIN + Math.random() * CONFIG.TIMING.TYPING_RESPONSE_MAX);
    }

    getUserInput() {
        if (this.chatInput) {
            const input = this.chatInput.value.trim();
            this.chatInput.value = '';
            return input;
        }
        return '';
    }

    getIsTextMode() {
        return this.isTextMode;
    }

    getCurrentContext() {
        return this.currentContext;
    }
}

export { TopicManager };
export default TopicManager;
