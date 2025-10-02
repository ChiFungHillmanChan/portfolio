import { Helpers } from '../utils/helpers';
import ApiClient from '../utils/apiClient';
import { CONFIG } from '../config';

class ThemeManager {
    constructor() {
        this.currentTheme = 'main';
        this.themeData = {};
        this.isTransitioning = false;
        this.videoModal = null;
    }

    async loadAllThemes() {
        try {
            this.themeData = await ApiClient.fetchAllThemeData();
            return this.themeData;
        } catch (error) {
            console.error('Failed to load theme data:', error);
            return {};
        }
    }

    async switchToTheme(themeName) {
        if (this.isTransitioning) return;
        
        const themeData = this.themeData[themeName];
        if (!themeData) return;
        
        this.isTransitioning = true;
        this.currentTheme = themeName;
        
        await this.showThemeTransition(themeData);
        this.applyThemeStyles(themeData);
        this.updateExistingInputAreas(themeData);
        
        // Special handling for secret theme
        if (themeName === 'secret-theme') {
            this.applySecretThemeStyles(themeData);
            this.createVideoModal();
        }
        
        window.topicManager.showThemeTopics(themeData);
        
        setTimeout(async () => {
            await window.messageRenderer.addMessageWithTyping('ai', themeData.welcomeMessage);
            this.isTransitioning = false;
        }, CONFIG.TIMING.MESSAGE_COMPLETION_DELAY);
    }

    async showThemeTransition(themeData) {
        const transitionOverlay = Helpers.createElement('div', 'theme-transition-overlay');
        transitionOverlay.style.background = themeData.theme.background;
        transitionOverlay.innerHTML = `
            <div class="transition-content">
                <div class="transition-text">Entering ${themeData.theme.name}...</div>
            </div>
        `;
        
        document.body.appendChild(transitionOverlay);
        
        setTimeout(() => {
            transitionOverlay.classList.add('fade-out');
            setTimeout(() => {
                if (document.body.contains(transitionOverlay)) {
                    document.body.removeChild(transitionOverlay);
                }
            }, 800);
        }, CONFIG.TIMING.THEME_TRANSITION_DELAY);
        
        await Helpers.delay(CONFIG.TIMING.THEME_TRANSITION_DELAY);
    }

    applyThemeStyles(themeData) {
        Helpers.updateCSSVariable('--theme-primary', themeData.theme.primaryColor);
        Helpers.updateCSSVariable('--theme-secondary', themeData.theme.secondaryColor);
        Helpers.updateCSSVariable('--theme-accent', themeData.theme.accentColor);
        Helpers.updateCSSVariable('--theme-bg', themeData.theme.background);
        Helpers.updateCSSVariable('--theme-text-shadow', themeData.theme.textShadow);
        
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            if (themeData.theme.background.includes('url(')) {
                chatContainer.style.background = themeData.theme.background;
                chatContainer.style.backgroundSize = themeData.theme.backgroundSize || 'cover';
                chatContainer.style.backgroundPosition = themeData.theme.backgroundPosition || 'center';
                chatContainer.style.backgroundBlendMode = themeData.theme.backgroundBlendMode || 'overlay';
            } else {
                chatContainer.style.background = `${themeData.theme.background}, rgba(13, 15, 26, 0.3)`;
                chatContainer.style.backgroundBlendMode = 'overlay';
            }
        }
    }

    applySecretThemeStyles(themeData) {
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.classList.add('secret-theme');
            chatContainer.classList.add('secret-theme-bg');
        }
    }

    createVideoModal() {
        if (this.videoModal) return;
        
        this.videoModal = Helpers.createElement('div', 'video-modal');
        this.videoModal.innerHTML = `
            <div class="video-modal-content">
                <button class="video-modal-close">&times;</button>
                <div class="video-modal-header">Our Special Memory 💕</div>
                <video controls autoplay>
                    <source src="/secret-memory.mp4" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
        `;
        
        document.body.appendChild(this.videoModal);
        
        // Close modal events
        const closeBtn = this.videoModal.querySelector('.video-modal-close');
        closeBtn.addEventListener('click', () => this.hideVideoModal());
        
        this.videoModal.addEventListener('click', (e) => {
            if (e.target === this.videoModal) {
                this.hideVideoModal();
            }
        });
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.videoModal.classList.contains('show')) {
                this.hideVideoModal();
            }
        });
    }

    showVideoModal() {
        if (!this.videoModal) {
            this.createVideoModal();
        }
        
        this.videoModal.classList.add('show');
        const video = this.videoModal.querySelector('video');
        if (video) {
            video.currentTime = 0; // Reset video to beginning
            video.play();
        }
    }

    hideVideoModal() {
        if (this.videoModal) {
            this.videoModal.classList.remove('show');
            const video = this.videoModal.querySelector('video');
            if (video) {
                video.pause();
            }
        }
    }

    updateExistingInputAreas(themeData) {
        const existingInputs = document.querySelectorAll('.chat-input');
        const existingSendButtons = document.querySelectorAll('.send-button');
        const existingButtons = document.querySelectorAll('.topic-button');
        
        existingInputs.forEach(input => {
            input.style.borderColor = themeData.theme.primaryColor;
        });
        
        existingSendButtons.forEach(button => {
            button.style.backgroundColor = themeData.theme.primaryColor;
        });
        
        existingButtons.forEach(button => {
            button.style.borderColor = themeData.theme.primaryColor;
        });
    }

    switchToMainTheme() {
        if (this.isTransitioning) return;
        
        this.currentTheme = 'main';
        this.resetThemeStyles();
        
        // Remove secret theme classes
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.classList.remove('secret-theme', 'secret-theme-bg');
        }
        
        // Hide video modal if open
        this.hideVideoModal();
        
        setTimeout(() => {
            window.messageRenderer.addMessage('ai', 'Welcome back to the main chat! 👋');
            window.topicManager.showMainTopics();
        }, 500);
    }

    resetThemeStyles() {
        Helpers.removeCSSVariable('--theme-primary');
        Helpers.removeCSSVariable('--theme-secondary');
        Helpers.removeCSSVariable('--theme-accent');
        Helpers.removeCSSVariable('--theme-bg');
        Helpers.removeCSSVariable('--theme-text-shadow');
        
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.style.background = 'rgba(13, 15, 26, 0.3)';
            chatContainer.style.backgroundBlendMode = 'normal';
            chatContainer.style.backgroundSize = '';
            chatContainer.style.backgroundPosition = '';
        }
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    getThemeData(themeName = null) {
        if (themeName) {
            return this.themeData[themeName];
        }
        return this.themeData;
    }

    async triggerThemeDiscovery(themeName) {
        const themeData = this.themeData[themeName];
        if (!themeData) return;
        
        window.messageRenderer.showTyping();
        await Helpers.delay(1000);
        window.messageRenderer.hideTyping();
        
        await window.messageRenderer.addMessageWithTyping('ai', `🎉 Congratulations! You've discovered: ${themeData.theme.name}! 🌟`);
        
        window.navigationManager.addDiscoveredTheme(themeName, this.themeData);
        
        await Helpers.delay(1500);
        
        this.isTransitioning = true;
        this.currentTheme = themeName;
        await this.showThemeTransition(themeData);
        this.applyThemeStyles(themeData);
        this.updateExistingInputAreas(themeData);
        
        // Special handling for secret theme
        if (themeName === 'secret-theme') {
            this.applySecretThemeStyles(themeData);
            this.createVideoModal();
        }
        
        window.topicManager.showThemeTopics(themeData);
        
        setTimeout(async () => {
            await window.messageRenderer.addMessageWithTyping('ai', themeData.welcomeMessage);
            this.isTransitioning = false;
        }, CONFIG.TIMING.MESSAGE_COMPLETION_DELAY);
    }
}

export { ThemeManager };
export default ThemeManager;
