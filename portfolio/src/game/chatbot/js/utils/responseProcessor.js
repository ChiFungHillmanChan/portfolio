import { Helpers } from './helpers';

export const ResponseProcessor = {
    detectSecretWords(input, themeData) {
        const lowercaseInput = Helpers.sanitizeInput(input);
        
        if (themeData['secret-theme'] && themeData['secret-theme'].secretWords) {
            const secretWords = themeData['secret-theme'].secretWords;
            const foundSecretPhrase = secretWords.find(phrase => 
                lowercaseInput.includes(phrase.toLowerCase())
            );
            
            if (foundSecretPhrase) {
                return 'secret-theme';
            }
        }
        
        for (const [themeName, data] of Object.entries(themeData)) {
            if (themeName === 'secret-theme') continue; 
            
            if (data && data.secretWords) {
                const foundWords = data.secretWords.filter(word => 
                    lowercaseInput.includes(word.toLowerCase())
                );
                
                if (foundWords.length > 0) {
                    return themeName;
                }
            }
        }
        
        return null;
    },

    getThemeResponse(input, themeData) {
        const lowercaseInput = Helpers.sanitizeInput(input);
        
        if (window.themeManager.getCurrentTheme() === 'secret-theme' && lowercaseInput.includes('memory')) {
            setTimeout(() => {
                window.themeManager.showVideoModal();
            }, 1000);
            return this.getResponseByCategory('memory', themeData) || "🎥 Seems like you want to look for our memory... I prepared something special for you, my bb 💕✨";
        }
        
        if (themeData.private_commands) {
            for (const command of themeData.private_commands) {
                if (lowercaseInput.includes(command.trigger)) {
                    if (command.action === 'showVideo') {
                        setTimeout(() => {
                            window.themeManager.showVideoModal();
                        }, 1000);
                    }
                    return command.response;
                }
            }
        }
        
        for (const [category, responses] of Object.entries(themeData.responses)) {
            if (responses && responses.length > 0) {
                const categoryKeywords = category.split('_');
                const hasMatchingKeyword = categoryKeywords.some(keyword => 
                    lowercaseInput.includes(keyword)
                );
                
                if (hasMatchingKeyword) {
                    const randomResponse = Helpers.getRandomItem(responses);
                    return Helpers.formatResponse(randomResponse);
                }
            }
        }
        
        if (themeData.fallbacks && themeData.fallbacks.length > 0) {
            return Helpers.getRandomItem(themeData.fallbacks);
        }
        
        return "That's interesting! Tell me more about that...";
    },

    getResponseByCategory(category, themeData) {
        if (themeData.responses && themeData.responses[category]) {
            const responses = themeData.responses[category];
            if (responses.length > 0) {
                const randomResponse = Helpers.getRandomItem(responses);
                return Helpers.formatResponse(randomResponse);
            }
        }
        return null;
    },

    getRandomResponse(category, trainingData) {
        if (!trainingData || !trainingData.responses) {
            return "I'm not sure about that. Could you try asking something else?";
        }
        
        const responses = trainingData.responses[category];
        if (!responses || responses.length === 0) {
            return "I'm not sure about that. Could you try asking something else?";
        }
        
        const responseObj = Helpers.getRandomItem(responses);
        return Helpers.formatResponse(responseObj);
    },

    checkEasterEggs(input, trainingData) {
        if (!trainingData.easterEggs) return null;
        
        const lowercaseInput = Helpers.sanitizeInput(input);
        
        for (const [trigger, eggData] of Object.entries(trainingData.easterEggs)) {
            if (lowercaseInput.includes(trigger.toLowerCase())) {
                return eggData;
            }
        }
        
        return null;
    },

    processFailedAttempt(failedAttempts, themeData, maxAttempts) {
        if (failedAttempts >= maxAttempts) {
            const themes = Object.keys(themeData);
            const randomTheme = Helpers.getRandomItem(themes);
            const randomThemeData = themeData[randomTheme];
            
            if (randomThemeData && randomThemeData.hints) {
                const hint = Helpers.getRandomItem(randomThemeData.hints);
                return `🤔 ${hint} Try again!`;
            }
            
            return 'Hmm... that doesn\'t seem to unlock anything. Keep trying! 🔍';
        }
        
        const responses = [
            'Interesting... but not quite right! 🤔',
            'Close, but not the secret I\'m looking for! 😉',
            'Keep trying! You\'re on the right track... 🌟'
        ];
        
        return Helpers.getRandomItem(responses);
    }
};

export default ResponseProcessor;
