import { Helpers } from '../utils/helpers';
import { CONFIG } from '../config';

class SecurityManager {
    constructor() {
        this.isSecurityMode = false;
        this.currentSecurityQuestion = 0;
        this.securityAnswers = [];
        this.secretAttempts = 0;
        this.pendingSecretTheme = null;
    }

    async startSecurityCheck() {
        const secretTheme = window.themeManager.getThemeData('secret-theme');
        if (!secretTheme) return;
        
        this.isSecurityMode = true;
        this.currentSecurityQuestion = 0;
        this.securityAnswers = [];
        this.pendingSecretTheme = 'secret-theme';
        
        window.messageRenderer.showTyping();
        await Helpers.delay(1500);
        window.messageRenderer.hideTyping();
        
        // Use the custom trigger response if available
        const triggerResponse = secretTheme.securityTriggerResponse || 
            '🔒 Hold on... I need to confirm if you are actually my bb. This space is very special to me. Let me ask you a few questions... 💕';
        
        await window.messageRenderer.addMessageWithTyping('ai', triggerResponse);
        
        await Helpers.delay(1000);
        this.askSecurityQuestion();
    }

    async askSecurityQuestion() {
        const secretTheme = window.themeManager.getThemeData('secret-theme');
        const questions = secretTheme.securityQuestions;
        
        if (this.currentSecurityQuestion >= questions.length) {
            await this.completeSecurityCheck();
            return;
        }
        
        const question = questions[this.currentSecurityQuestion];
        
        window.messageRenderer.showTyping();
        await Helpers.delay(1000);
        window.messageRenderer.hideTyping();
        
        await window.messageRenderer.addMessageWithTyping('ai', `Question ${this.currentSecurityQuestion + 1}/${questions.length}: ${question.question}`);
    }

    async handleSecurityAnswer(answer) {
        const secretTheme = window.themeManager.getThemeData('secret-theme');
        const questions = secretTheme.securityQuestions;
        const currentQuestion = questions[this.currentSecurityQuestion];
        
        const isCorrect = Helpers.sanitizeInput(answer) === currentQuestion.answer.toLowerCase().trim();
        
        if (isCorrect) {
            this.securityAnswers.push({ questionId: currentQuestion.id, correct: true });
            
            window.messageRenderer.showTyping();
            await Helpers.delay(800);
            window.messageRenderer.hideTyping();
            
            await window.messageRenderer.addMessageWithTyping('ai', '✅ Correct! ✨');
            
            this.currentSecurityQuestion++;
            await Helpers.delay(1000);
            await this.askSecurityQuestion();
        } else {
            this.secretAttempts++;
            this.securityAnswers.push({ questionId: currentQuestion.id, correct: false });
            
            window.messageRenderer.showTyping();
            await Helpers.delay(1000);
            window.messageRenderer.hideTyping();
            
            if (this.secretAttempts >= CONFIG.SECURITY.MAX_SECRET_ATTEMPTS) {
                await window.messageRenderer.addMessageWithTyping('ai', secretTheme.lockoutMessage);
                this.resetSecurityMode();
            } else {
                const hintsText = currentQuestion.hints ? ` Hint: ${Helpers.getRandomItem(currentQuestion.hints)}` : '';
                await window.messageRenderer.addMessageWithTyping('ai', `❌ Not quite right...${hintsText} Try again!`);
            }
        }
    }

    async completeSecurityCheck() {
        const correctAnswers = this.securityAnswers.filter(a => a.correct).length;
        const totalQuestions = window.themeManager.getThemeData('secret-theme').securityQuestions.length;
        
        if (correctAnswers === totalQuestions) {
            window.messageRenderer.showTyping();
            await Helpers.delay(2000);
            window.messageRenderer.hideTyping();
            
            await window.messageRenderer.addMessageWithTyping('ai', '🎉 Welcome home, bb臭... I knew it was you! 💕✨ Entering our secret space...');
            
            await Helpers.delay(1500);
            this.resetSecurityMode();
            await window.themeManager.switchToTheme('secret-theme');
        } else {
            const secretTheme = window.themeManager.getThemeData('secret-theme');
            await window.messageRenderer.addMessageWithTyping('ai', secretTheme.lockoutMessage);
            this.resetSecurityMode();
        }
    }

    resetSecurityMode() {
        this.isSecurityMode = false;
        this.currentSecurityQuestion = 0;
        this.securityAnswers = [];
        this.secretAttempts = 0;
        this.pendingSecretTheme = null;
    }

    getIsSecurityMode() {
        return this.isSecurityMode;
    }

    getSecurityProgress() {
        return {
            currentQuestion: this.currentSecurityQuestion,
            totalQuestions: this.securityAnswers.length,
            attempts: this.secretAttempts
        };
    }
}

export { SecurityManager };
export default SecurityManager;
