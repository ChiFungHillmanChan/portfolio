/**
 * Progress Page - Statistics Display
 */

const ProgressPage = {
    elements: {},

    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadStats();
    },

    cacheElements() {
        this.elements = {
            // Summary
            totalSessions: document.getElementById('total-sessions'),
            overallAccuracy: document.getElementById('overall-accuracy'),
            bestStreak: document.getElementById('best-streak'),
            totalCards: document.getElementById('total-cards'),
            // Easy stats
            easySessions: document.getElementById('easy-sessions'),
            easyAccuracy: document.getElementById('easy-accuracy'),
            easyBestScore: document.getElementById('easy-best-score'),
            easyFastest: document.getElementById('easy-fastest'),
            // Medium stats
            mediumSessions: document.getElementById('medium-sessions'),
            mediumAccuracy: document.getElementById('medium-accuracy'),
            mediumHands: document.getElementById('medium-hands'),
            mediumWinrate: document.getElementById('medium-winrate'),
            // Hard stats
            hardSessions: document.getElementById('hard-sessions'),
            hardAccuracy: document.getElementById('hard-accuracy'),
            hardHands: document.getElementById('hard-hands'),
            hardTimeouts: document.getElementById('hard-timeouts'),
            // Sessions list
            sessionsList: document.getElementById('sessions-list'),
            // Buttons
            exportBtn: document.getElementById('export-btn'),
            clearBtn: document.getElementById('clear-btn'),
            confirmModal: document.getElementById('confirm-modal'),
            confirmClear: document.getElementById('confirm-clear'),
            cancelClear: document.getElementById('cancel-clear')
        };
    },

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.mode-stats').forEach(s => s.classList.remove('active'));

                tab.classList.add('active');
                document.getElementById(tab.dataset.mode + '-stats').classList.add('active');
            });
        });

        // Export
        this.elements.exportBtn.addEventListener('click', () => {
            PracticeStats.exportData();
        });

        // Clear
        this.elements.clearBtn.addEventListener('click', () => {
            this.elements.confirmModal.classList.add('active');
        });

        this.elements.confirmClear.addEventListener('click', () => {
            PracticeStats.clearAllData();
            this.elements.confirmModal.classList.remove('active');
            this.loadStats();
        });

        this.elements.cancelClear.addEventListener('click', () => {
            this.elements.confirmModal.classList.remove('active');
        });
    },

    loadStats() {
        this.loadSummary();
        this.loadEasyStats();
        this.loadMediumStats();
        this.loadHardStats();
        this.loadRecentSessions();
    },

    loadSummary() {
        const summary = PracticeStats.getSummaryStats();

        this.elements.totalSessions.textContent = summary.totalSessions;
        this.elements.overallAccuracy.textContent = summary.overallAccuracy + '%';
        this.elements.bestStreak.textContent = summary.bestStreak;
        this.elements.totalCards.textContent = this.formatNumber(summary.totalCards);
    },

    loadEasyStats() {
        const stats = PracticeStats.getModeStats(PRACTICE_MODES.EASY);

        this.elements.easySessions.textContent = stats.totalSessions || 0;

        if (stats.totalCards && stats.totalCards > 0) {
            const accuracy = ((stats.totalCorrect || 0) / stats.totalCards * 100).toFixed(1);
            this.elements.easyAccuracy.textContent = accuracy + '%';
        } else {
            this.elements.easyAccuracy.textContent = '-';
        }

        this.elements.easyBestScore.textContent = stats.bestScore || 0;

        if (stats.fastestSpeed && stats.fastestSpeed !== Infinity) {
            this.elements.easyFastest.textContent = (stats.fastestSpeed / 1000).toFixed(2) + 's';
        } else {
            this.elements.easyFastest.textContent = '-';
        }
    },

    loadMediumStats() {
        const stats = PracticeStats.getModeStats(PRACTICE_MODES.MEDIUM);

        this.elements.mediumSessions.textContent = stats.totalSessions || 0;

        if (stats.totalCards && stats.totalCards > 0) {
            const accuracy = ((stats.totalCorrect || 0) / stats.totalCards * 100).toFixed(1);
            this.elements.mediumAccuracy.textContent = accuracy + '%';
        } else {
            this.elements.mediumAccuracy.textContent = '-';
        }

        this.elements.mediumHands.textContent = stats.handsPlayed || 0;

        if (stats.handsPlayed && stats.handsPlayed > 0) {
            const winrate = ((stats.handsWon || 0) / stats.handsPlayed * 100).toFixed(1);
            this.elements.mediumWinrate.textContent = winrate + '%';
        } else {
            this.elements.mediumWinrate.textContent = '-';
        }
    },

    loadHardStats() {
        const stats = PracticeStats.getModeStats(PRACTICE_MODES.HARD);

        this.elements.hardSessions.textContent = stats.totalSessions || 0;

        if (stats.totalCards && stats.totalCards > 0) {
            const accuracy = ((stats.totalCorrect || 0) / stats.totalCards * 100).toFixed(1);
            this.elements.hardAccuracy.textContent = accuracy + '%';
        } else {
            this.elements.hardAccuracy.textContent = '-';
        }

        this.elements.hardHands.textContent = stats.handsPlayed || 0;
        this.elements.hardTimeouts.textContent = stats.timeouts || 0;
    },

    loadRecentSessions() {
        const sessions = PracticeStats.getAllSessions().slice(-20).reverse();

        // Clear existing content
        while (this.elements.sessionsList.firstChild) {
            this.elements.sessionsList.removeChild(this.elements.sessionsList.firstChild);
        }

        if (sessions.length === 0) {
            const noSessionsMessage = document.createElement('p');
            noSessionsMessage.className = 'no-sessions';
            noSessionsMessage.textContent = 'No sessions recorded yet. Start practicing!';
            this.elements.sessionsList.appendChild(noSessionsMessage);
            return;
        }

        sessions.forEach(session => {
            const item = this.createSessionItem(session);
            this.elements.sessionsList.appendChild(item);
        });
    },

    createSessionItem(session) {
        const item = document.createElement('div');
        item.className = 'session-item';

        // Session info container
        const sessionInfo = document.createElement('div');
        sessionInfo.className = 'session-info';

        // Mode badge
        const modeBadge = document.createElement('span');
        modeBadge.className = 'session-mode ' + session.mode;
        modeBadge.textContent = session.mode.toUpperCase();
        sessionInfo.appendChild(modeBadge);

        // Date
        const date = new Date(session.date);
        const dateSpan = document.createElement('span');
        dateSpan.className = 'session-date';
        dateSpan.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        sessionInfo.appendChild(dateSpan);

        item.appendChild(sessionInfo);

        // Session stats container
        const sessionStats = document.createElement('div');
        sessionStats.className = 'session-stats';

        // Cards stat
        const cardsStat = this.createStatElement(
            String(session.cardsCount || 0),
            'Cards'
        );
        sessionStats.appendChild(cardsStat);

        // Accuracy stat
        const accuracy = session.cardsCount && session.cardsCount > 0
            ? ((session.correctCount || 0) / session.cardsCount * 100).toFixed(0) + '%'
            : '-';
        const accuracyStat = this.createStatElement(accuracy, 'Accuracy');
        sessionStats.appendChild(accuracyStat);

        // Streak stat
        const streakStat = this.createStatElement(
            String(session.bestStreak || 0),
            'Streak'
        );
        sessionStats.appendChild(streakStat);

        item.appendChild(sessionStats);

        return item;
    },

    createStatElement(value, label) {
        const statDiv = document.createElement('div');
        statDiv.className = 'session-stat';

        const valueSpan = document.createElement('span');
        valueSpan.className = 'session-stat-value';
        valueSpan.textContent = value;
        statDiv.appendChild(valueSpan);

        const labelSpan = document.createElement('span');
        labelSpan.className = 'session-stat-label';
        labelSpan.textContent = label;
        statDiv.appendChild(labelSpan);

        return statDiv;
    },

    formatNumber(num) {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toString();
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => ProgressPage.init());
