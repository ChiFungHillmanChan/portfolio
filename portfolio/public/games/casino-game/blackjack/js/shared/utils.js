// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function formatCurrency(amount, currency = '$') {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    return `${sign}${currency}${absAmount.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })}`;
}

function formatPercentage(value, decimals = 1) {
    const percentage = value * 100;
    const sign = percentage > 0 ? '+' : '';
    return `${sign}${percentage.toFixed(decimals)}%`;
}

function formatEV(ev) {
    const percentage = ev * 100;
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
}

function formatTrueCount(tc) {
    const sign = tc >= 0 ? '+' : '';
    return `${sign}${tc.toFixed(1)}`;
}

function createCard(rank, suit = null) {
    return {
        rank: rank,
        suit: suit,
        value: CARD_BJ_VALUES[rank],
        countValue: HI_LO_VALUES[rank]
    };
}

function getSuitSymbol(suit) {
    const symbols = {
        'spades': '\u2660',
        'hearts': '\u2665',
        'diamonds': '\u2666',
        'clubs': '\u2663'
    };
    return symbols[suit] || '';
}

function getSuitColorClass(suit) {
    return (suit === 'hearts' || suit === 'diamonds') ? 'red-suit' : 'black-suit';
}

function formatCardDisplay(card) {
    if (!card) return '';
    const suitSymbol = card.suit ? getSuitSymbol(card.suit) : '';
    return `${card.rank}${suitSymbol}`;
}

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function roundTo(value, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function isMobileViewport() {
    return window.innerWidth < 768;
}
