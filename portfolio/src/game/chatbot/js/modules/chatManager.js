import { Helpers } from '../utils/helpers';
import ApiClient from '../utils/apiClient';
import { ResponseProcessor } from '../utils/responseProcessor';
import { CONFIG } from '../config';

class ChatManager {
    constructor() {
        this.trainingData = null;
        this.isMaintenanceMode = false;
        this.failedAttempts = 0;
        this.currentHintIndex = 0;
    }

    async init() {
        try {
            this.trainingData = await ApiClient.fetchTrainingData();
        } catch (error) {
            console.error('Failed to load training data:', error);
            this.isMaintenanceMode = true;
            this.showMaintenanceMode();
        }
    }

    showMaintenanceMode() {
        window.messageRenderer.addMessage('ai', '🔧 Sorry, I\'m currently in maintenance mode. Please check back later!');
        window.topicManager.topicSelection.style.display = 'none';
    }

    async handleMainTextInput() {
        const input = window.topicManager.getUserInput();
        if (!input) return;
        
        window.messageRenderer.addMessage('user', input);
        
        if (window.securityManager.getIsSecurityMode()) {
            window.securityManager.handleSecurityAnswer(input);
            return;
        }
        
        const detectedTheme = ResponseProcessor.detectSecretWords(input, window.themeManager.getThemeData());
        
        if (detectedTheme) {
            if (detectedTheme === 'secret-theme') {
                window.securityManager.startSecurityCheck();
            } else {
                window.themeManager.triggerThemeDiscovery(detectedTheme);
            }
        } else {
            this.handleFailedAttempt(input);
        }
    }

    async handleThemeTextInput(themeData) {
        const input = window.topicManager.getUserInput();
        if (!input) return;
        
        window.messageRenderer.addMessage('user', input);
        
        window.messageRenderer.showTyping();
        await Helpers.delay(CONFIG.TIMING.TYPING_RESPONSE_MIN + Math.random() * CONFIG.TIMING.TYPING_RESPONSE_MAX);
        window.messageRenderer.hideTyping();
        
        const response = ResponseProcessor.getThemeResponse(input, themeData);
        await window.messageRenderer.addMessageWithTyping('ai', response);
    }

    async handleFailedAttempt(input) {
        this.failedAttempts++;
        
        window.messageRenderer.showTyping();
        await Helpers.delay(1200);
        window.messageRenderer.hideTyping();
        
        const response = ResponseProcessor.processFailedAttempt(
            this.failedAttempts, 
            window.themeManager.getThemeData(), 
            CONFIG.SECURITY.MAX_FAILED_ATTEMPTS
        );
        
        await window.messageRenderer.addMessageWithTyping('ai', response);
        
        if (this.failedAttempts >= CONFIG.SECURITY.MAX_FAILED_ATTEMPTS) {
            this.failedAttempts = 0;
            this.currentHintIndex = (this.currentHintIndex + 1) % 4;
        }
    }

    getTrainingData() {
        return this.trainingData;
    }

    getFailedAttempts() {
        return this.failedAttempts;
    }

    resetFailedAttempts() {
        this.failedAttempts = 0;
        this.currentHintIndex = 0;
    }

    setMaintenanceMode(enabled) {
        this.isMaintenanceMode = enabled;
        if (enabled) {
            this.showMaintenanceMode();
        }
    }

    getIsMaintenanceMode() {
        return this.isMaintenanceMode;
    }
}

export { ChatManager };
export default ChatManager;
