import { SessionManager } from './utils/sessionManager';
import NavigationManager from './modules/navigation';
import ThemeManager from './modules/themeManager';
import MessageRenderer from './modules/messageRenderer';
import TopicManager from './modules/topicManager';
import SecurityManager from './modules/securityManager';
import ChatManager from './modules/chatManager';
import { Helpers } from './utils/helpers';
import { CONFIG } from './config';

class HillmanChatbot {
    constructor() {
        this.welcomeOverlay = null;
        this.welcomeText = null;
        this.chatContainer = null;
        this.isInitialized = false;
    }

    async init() {
        this.welcomeOverlay = document.getElementById('welcomeOverlay');
        this.welcomeText = document.getElementById('welcomeText');
        this.chatContainer = document.getElementById('chatContainer');
        
        await this.showWelcomeAnimation();
        
        window.sessionManager = SessionManager;
        window.sessionManager.init();
        
        window.navigationManager = new NavigationManager();
        window.themeManager = new ThemeManager();
        window.messageRenderer = new MessageRenderer();
        window.topicManager = new TopicManager();
        window.securityManager = new SecurityManager();
        window.chatManager = new ChatManager();
        
        window.navigationManager.init();
        window.messageRenderer.init();
        window.topicManager.init();
        
        await Promise.all([
            window.chatManager.init(),
            window.themeManager.loadAllThemes()
        ]);
        
        if (!window.chatManager.getIsMaintenanceMode()) {
            setTimeout(() => {
                window.messageRenderer.addMessage('ai', this.getRandomGreeting());
                window.topicManager.showMainTopics();
                this.isInitialized = true;
            }, 1000);
        }
    }

    async showWelcomeAnimation() {
        const welcomeMessage = "Welcome Human, This is Hillman, come chat with me";
        let displayText = "";
        
        for (let i = 0; i < welcomeMessage.length; i++) {
            displayText += welcomeMessage[i];
            this.welcomeText.textContent = displayText;
            await Helpers.delay(CONFIG.TIMING.WELCOME_ANIMATION_CHAR_DELAY);
        }
        
        await Helpers.delay(CONFIG.TIMING.WELCOME_ANIMATION_END_DELAY);
        
        this.welcomeOverlay.classList.add('fade-out');
        this.chatContainer.classList.add('visible');
        
        setTimeout(() => {
            this.welcomeOverlay.style.display = 'none';
        }, 800);
    }

    getRandomGreeting() {
        const greetings = [
            "Hey there! I'm Hillman. What would you like to know about me?",
            "Hello! This is Hillman! Why are you here? You think of me?",
            "Hi! I'm Hillman.",
            "Yo! Welcome to my little corner of the internet! 🌐"
        ];
        
        return Helpers.getRandomItem(greetings);
    }

    getIsInitialized() {
        return this.isInitialized;
    }
}

export const createHillmanChatbot = () => new HillmanChatbot();

export default HillmanChatbot;
