import { CONFIG } from '../config';

export const Helpers = {
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    scrollToBottom(element) {
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    },

    getRandomItem(array) {
        if (!array || array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    },

    createElement(tag, className = '', content = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (content) {
            if (content.includes('<')) {
                element.innerHTML = content;
            } else {
                element.textContent = content;
            }
        }
        return element;
    },

    isMobile() {
        return window.innerWidth <= CONFIG.UI.MOBILE_BREAKPOINT;
    },

    isSmallMobile() {
        return window.innerWidth <= CONFIG.UI.SMALL_MOBILE_BREAKPOINT;
    },

    sanitizeInput(input) {
        return input.trim().toLowerCase();
    },

    extractTextFromHTML(html) {
        return html.replace(/<[^>]*>/g, '');
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    formatResponse(responseObj) {
        if (typeof responseObj === 'string') {
            return responseObj;
        } else if (responseObj && responseObj.text) {
            return responseObj.text;
        }
        return "I'm not sure about that. Could you try asking something else?";
    },

    updateCSSVariable(property, value) {
        document.documentElement.style.setProperty(property, value);
    },

    removeCSSVariable(property) {
        document.documentElement.style.removeProperty(property);
    },

    addGlobalClass(className) {
        document.body.classList.add(className);
    },

    removeGlobalClass(className) {
        document.body.classList.remove(className);
    }
};

export default Helpers;
