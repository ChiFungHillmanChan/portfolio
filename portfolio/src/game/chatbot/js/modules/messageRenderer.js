import { Helpers } from '../utils/helpers';
import { CONFIG } from '../config';

class MessageRenderer {
    constructor() {
        this.chatMessages = null;
        this.typingIndicator = null;
        this.conversationHistory = [];
        this.isMobile = window.innerWidth <= 768;
    }

    init() {
        this.chatMessages = document.getElementById('chatMessages');
        this.typingIndicator = document.getElementById('typingIndicator');
        
        // Listen for resize events
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
        });
    }

    addMessage(type, content) {
        if (!this.chatMessages) {
            return;
        }
        const messageDiv = Helpers.createElement('div', `message ${type}`);
        const bubbleDiv = Helpers.createElement('div', 'message-bubble');
        bubbleDiv.innerHTML = content;
        messageDiv.appendChild(bubbleDiv);
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottomSmooth();

        this.conversationHistory.push({ 
            role: type === 'user' ? 'user' : 'assistant', 
            content: content, 
            timestamp: new Date() 
        });
    }

    async addMessageWithTyping(type, content) {
        if (!this.chatMessages) {
            return;
        }
        const messageDiv = Helpers.createElement('div', `message ${type}`);
        const bubbleDiv = Helpers.createElement('div', 'message-bubble typing-effect');
        messageDiv.appendChild(bubbleDiv);
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottomSmooth();

        const plainContent = Helpers.extractTextFromHTML(content);
        let displayContent = '';
        
        for (let i = 0; i < plainContent.length; i++) {
            const char = plainContent[i];
            displayContent += char;
            
            if (content.includes('<')) {
                let fullContent = content;
                let plainIndex = 0;
                let result = '';
                let inTag = false;
                
                for (let j = 0; j < fullContent.length; j++) {
                    if (fullContent[j] === '<') {
                        inTag = true;
                        result += fullContent[j];
                    } else if (fullContent[j] === '>') {
                        inTag = false;
                        result += fullContent[j];
                    } else if (inTag) {
                        result += fullContent[j];
                    } else {
                        if (plainIndex < displayContent.length) {
                            result += fullContent[j];
                        }
                        plainIndex++;
                    }
                }
                bubbleDiv.innerHTML = result;
            } else {
                bubbleDiv.textContent = displayContent;
            }
            
            this.scrollToBottomSmooth();
            await Helpers.delay(CONFIG.TIMING.TYPING_CHAR_DELAY);
        }
        
        bubbleDiv.classList.remove('typing-effect');
        bubbleDiv.innerHTML = content;

        this.conversationHistory.push({ 
            role: type === 'user' ? 'user' : 'assistant', 
            content: content, 
            timestamp: new Date() 
        });

        // Mobile viewport fix after message completion
        if (this.isMobile && type === 'ai') {
            setTimeout(() => {
                if (!this.chatMessages) {
                    return;
                }
                this.handleMobileMessageComplete();
            }, 500);
        }
    }

    handleMobileMessageComplete() {
        if (!this.isMobile) return;
        
        // Ensure smooth scroll to show new content
        this.scrollToBottomSmooth();
        
        // Reset viewport if needed
        setTimeout(() => {
            if (window.topicManager && typeof window.topicManager.handleMobileViewportFix === 'function') {
                window.topicManager.handleMobileViewportFix();
            }
        }, 200);
    }

    showTyping() {
        if (!this.typingIndicator) {
            return;
        }
        this.typingIndicator.classList.add('show');
        this.scrollToBottomSmooth();
    }

    hideTyping() {
        if (!this.typingIndicator) {
            return;
        }
        this.typingIndicator.classList.remove('show');
    }

    scrollToBottom() {
        if (this.chatMessages) {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    scrollToBottomSmooth() {
        if (this.chatMessages) {
            if (this.isMobile) {
                // Gentler scrolling for mobile
                this.chatMessages.scrollTo({
                    top: this.chatMessages.scrollHeight,
                    behavior: 'smooth'
                });
            } else {
                Helpers.scrollToBottom(this.chatMessages);
            }
        }
    }

    getConversationHistory() {
        return [...this.conversationHistory];
    }

    clearConversationHistory() {
        this.conversationHistory = [];
    }

    clearMessages() {
        if (this.chatMessages) {
            this.chatMessages.innerHTML = '';
        }
        this.clearConversationHistory();
    }

    getLastMessage() {
        return this.conversationHistory[this.conversationHistory.length - 1] || null;
    }

    removeLastMessage() {
        if (this.conversationHistory.length > 0) {
            this.conversationHistory.pop();
            const messages = this.chatMessages.querySelectorAll('.message');
            if (messages.length > 0) {
                this.chatMessages.removeChild(messages[messages.length - 1]);
            }
        }
    }
}

export { MessageRenderer };
export default MessageRenderer;
