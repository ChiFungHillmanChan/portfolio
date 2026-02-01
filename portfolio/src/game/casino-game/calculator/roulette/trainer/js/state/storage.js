// =====================================================
// STORAGE - Lightweight localStorage stats management
// =====================================================

const STORAGE_KEY = 'roulette-trainer-stats';

/**
 * Default stats structure (< 1KB)
 */
const DEFAULT_STATS = {
    stats: {
        easy: { played: 0, correct: 0, totalTime: 0 },
        medium: { played: 0, correct: 0, totalTime: 0 },
        hard: { played: 0, correct: 0, totalTime: 0 },
        exam: { played: 0, bestScore: 0, bestTime: null }
    },
    lastSession: null,
    totalSessions: 0
};

/**
 * Get stats from localStorage
 * @returns {object} Stats object
 */
function getStats() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return { ...DEFAULT_STATS };

        const parsed = JSON.parse(stored);
        // Merge with defaults in case of missing fields
        return {
            ...DEFAULT_STATS,
            ...parsed,
            stats: {
                ...DEFAULT_STATS.stats,
                ...parsed.stats
            }
        };
    } catch (e) {
        console.warn('Failed to load stats from localStorage:', e);
        return { ...DEFAULT_STATS };
    }
}

/**
 * Save stats to localStorage
 * @param {object} stats - Stats object to save
 */
function saveStats(stats) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {
        console.warn('Failed to save stats to localStorage:', e);
    }
}

/**
 * Save session results and update stats
 * @param {object} results - Session results
 */
function saveSessionStats(results) {
    const stats = getStats();
    const { mode, totalQuestions, correct, totalTime } = results;

    // Update mode-specific stats
    if (mode === 'exam') {
        stats.stats.exam.played++;
        // Track best score
        if (correct > stats.stats.exam.bestScore) {
            stats.stats.exam.bestScore = correct;
            stats.stats.exam.bestTime = totalTime;
        }
    } else {
        stats.stats[mode].played += totalQuestions;
        stats.stats[mode].correct += correct;
        stats.stats[mode].totalTime += totalTime;
    }

    // Update global stats
    stats.lastSession = new Date().toISOString().split('T')[0];
    stats.totalSessions++;

    saveStats(stats);
}

/**
 * Get accuracy for a mode
 * @param {string} mode - Game mode
 * @returns {string} Accuracy percentage string
 */
function getModeAccuracy(mode) {
    const stats = getStats();
    const modeStats = stats.stats[mode];

    if (mode === 'exam') {
        return modeStats.played > 0 ?
            `Best: ${modeStats.bestScore}/50` : 'Not played';
    }

    if (modeStats.played === 0) return 'Not played';

    const accuracy = (modeStats.correct / modeStats.played * 100).toFixed(1);
    return `${accuracy}%`;
}

/**
 * Get average time per question for a mode
 * @param {string} mode - Game mode
 * @returns {string} Average time string
 */
function getModeAverageTime(mode) {
    const stats = getStats();
    const modeStats = stats.stats[mode];

    if (mode === 'exam') {
        return modeStats.bestTime ?
            formatSeconds(modeStats.bestTime) : '--:--';
    }

    if (modeStats.played === 0) return '--:--';

    const avgSeconds = modeStats.totalTime / modeStats.played;
    return formatSeconds(avgSeconds);
}

/**
 * Format seconds to MM:SS
 * @param {number} seconds
 * @returns {string}
 */
function formatSeconds(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get summary stats for display
 * @returns {object} Summary object
 */
function getStatsSummary() {
    const stats = getStats();

    return {
        totalSessions: stats.totalSessions,
        lastSession: stats.lastSession,
        modes: {
            easy: {
                played: stats.stats.easy.played,
                accuracy: getModeAccuracy('easy'),
                avgTime: getModeAverageTime('easy')
            },
            medium: {
                played: stats.stats.medium.played,
                accuracy: getModeAccuracy('medium'),
                avgTime: getModeAverageTime('medium')
            },
            hard: {
                played: stats.stats.hard.played,
                accuracy: getModeAccuracy('hard'),
                avgTime: getModeAverageTime('hard')
            },
            exam: {
                played: stats.stats.exam.played,
                bestScore: stats.stats.exam.bestScore,
                bestTime: stats.stats.exam.bestTime ?
                    formatSeconds(stats.stats.exam.bestTime) : null
            }
        }
    };
}

/**
 * Clear all stats
 */
function clearStats() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('Failed to clear stats:', e);
    }
}

export {
    getStats,
    saveStats,
    saveSessionStats,
    getModeAccuracy,
    getModeAverageTime,
    getStatsSummary,
    clearStats
};
