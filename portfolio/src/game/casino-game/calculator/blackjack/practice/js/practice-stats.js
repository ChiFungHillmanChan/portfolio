/**
 * Practice Statistics Manager
 * Handles saving/loading practice session data
 */

const PracticeStats = {
    /**
     * Save a practice session
     */
    saveSession(mode, sessionData) {
        try {
            const sessions = this.getAllSessions();
            const session = {
                id: Date.now(),
                mode: mode,
                date: new Date().toISOString(),
                ...sessionData
            };
            sessions.push(session);
            // Keep last 100 sessions
            const trimmed = sessions.slice(-100);
            localStorage.setItem(PRACTICE_STORAGE_KEYS.SESSIONS, JSON.stringify(trimmed));
            this.updateModeStats(mode, sessionData);
            return true;
        } catch (error) {
            console.error('Failed to save session:', error);
            return false;
        }
    },

    /**
     * Update aggregate stats for a mode
     */
    updateModeStats(mode, sessionData) {
        const key = this.getStorageKey(mode);
        const stats = this.getModeStats(mode);

        stats.totalSessions = (stats.totalSessions || 0) + 1;
        stats.totalCards = (stats.totalCards || 0) + (sessionData.cardsCount || 0);
        stats.totalCorrect = (stats.totalCorrect || 0) + (sessionData.correctCount || 0);
        stats.bestStreak = Math.max(stats.bestStreak || 0, sessionData.bestStreak || 0);

        if (mode === PRACTICE_MODES.EASY) {
            stats.bestScore = Math.max(stats.bestScore || 0, sessionData.correctCount || 0);
            if (sessionData.maxSpeedReached) {
                stats.fastestSpeed = Math.min(
                    stats.fastestSpeed || Infinity,
                    sessionData.maxSpeedReached
                );
            }
        }

        if (mode === PRACTICE_MODES.MEDIUM || mode === PRACTICE_MODES.HARD) {
            stats.handsPlayed = (stats.handsPlayed || 0) + (sessionData.handsPlayed || 0);
            stats.handsWon = (stats.handsWon || 0) + (sessionData.handsWon || 0);
        }

        if (mode === PRACTICE_MODES.HARD) {
            stats.timeouts = (stats.timeouts || 0) + (sessionData.timeouts || 0);
        }

        localStorage.setItem(key, JSON.stringify(stats));
    },

    /**
     * Get storage key for mode
     */
    getStorageKey(mode) {
        const keyMap = {
            [PRACTICE_MODES.EASY]: PRACTICE_STORAGE_KEYS.EASY_STATS,
            [PRACTICE_MODES.MEDIUM]: PRACTICE_STORAGE_KEYS.MEDIUM_STATS,
            [PRACTICE_MODES.HARD]: PRACTICE_STORAGE_KEYS.HARD_STATS
        };
        return keyMap[mode];
    },

    /**
     * Get stats for a specific mode
     */
    getModeStats(mode) {
        try {
            const key = this.getStorageKey(mode);
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Failed to load mode stats:', error);
            return {};
        }
    },

    /**
     * Get all sessions
     */
    getAllSessions() {
        try {
            const saved = localStorage.getItem(PRACTICE_STORAGE_KEYS.SESSIONS);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Failed to load sessions:', error);
            return [];
        }
    },

    /**
     * Get sessions for a specific mode
     */
    getModeSessions(mode, limit = 20) {
        const sessions = this.getAllSessions();
        return sessions
            .filter(s => s.mode === mode)
            .slice(-limit);
    },

    /**
     * Get overall accuracy percentage
     */
    getOverallAccuracy() {
        let totalCorrect = 0;
        let totalCards = 0;

        for (const mode of Object.values(PRACTICE_MODES)) {
            const stats = this.getModeStats(mode);
            totalCorrect += stats.totalCorrect || 0;
            totalCards += stats.totalCards || 0;
        }

        return totalCards > 0 ? (totalCorrect / totalCards * 100).toFixed(1) : 0;
    },

    /**
     * Get summary stats for progress page
     */
    getSummaryStats() {
        let totalSessions = 0;
        let totalCards = 0;
        let bestStreak = 0;

        for (const mode of Object.values(PRACTICE_MODES)) {
            const stats = this.getModeStats(mode);
            totalSessions += stats.totalSessions || 0;
            totalCards += stats.totalCards || 0;
            bestStreak = Math.max(bestStreak, stats.bestStreak || 0);
        }

        return {
            totalSessions,
            totalCards,
            bestStreak,
            overallAccuracy: this.getOverallAccuracy()
        };
    },

    /**
     * Clear all practice data
     */
    clearAllData() {
        try {
            localStorage.removeItem(PRACTICE_STORAGE_KEYS.SESSIONS);
            localStorage.removeItem(PRACTICE_STORAGE_KEYS.EASY_STATS);
            localStorage.removeItem(PRACTICE_STORAGE_KEYS.MEDIUM_STATS);
            localStorage.removeItem(PRACTICE_STORAGE_KEYS.HARD_STATS);
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            return false;
        }
    },

    /**
     * Export all data as JSON
     */
    exportData() {
        const data = {
            sessions: this.getAllSessions(),
            easyStats: this.getModeStats(PRACTICE_MODES.EASY),
            mediumStats: this.getModeStats(PRACTICE_MODES.MEDIUM),
            hardStats: this.getModeStats(PRACTICE_MODES.HARD),
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `practice_stats_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};
