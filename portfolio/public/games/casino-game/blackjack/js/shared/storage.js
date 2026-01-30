// =====================================================
// LOCAL STORAGE UTILITIES
// =====================================================

const STORAGE_KEYS = {
    GAME_STATE: 'blackjack_game_state',
    SESSION_HISTORY: 'blackjack_session_history',
    USER_PREFERENCES: 'blackjack_user_preferences'
};

// =====================================================
// SAVE FUNCTIONS
// =====================================================

function saveGameState() {
    try {
        const stateToSave = {
            config: gameState.config,
            count: gameState.count,
            bankroll: gameState.bankroll,
            table: {
                seats: gameState.table.seats.map(seat => ({
                    id: seat.id,
                    status: seat.status,
                    hands: seat.hands,
                    bet: seat.bet,
                    activeHandIndex: seat.activeHandIndex
                })),
                dealer: gameState.table.dealer
            },
            history: gameState.history,
            phase: gameState.phase,
            timestamp: Date.now()
        };
        localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(stateToSave));
        return true;
    } catch (error) {
        console.error('Failed to save game state:', error);
        return false;
    }
}

function saveUserPreferences(preferences) {
    try {
        localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
        return true;
    } catch (error) {
        console.error('Failed to save user preferences:', error);
        return false;
    }
}

function saveSessionToHistory(sessionReport) {
    try {
        const history = loadSessionHistory() || [];
        history.push({
            ...sessionReport,
            id: Date.now(),
            savedAt: new Date().toISOString()
        });
        const trimmedHistory = history.slice(-100);
        localStorage.setItem(STORAGE_KEYS.SESSION_HISTORY, JSON.stringify(trimmedHistory));
        return true;
    } catch (error) {
        console.error('Failed to save session to history:', error);
        return false;
    }
}

// =====================================================
// LOAD FUNCTIONS
// =====================================================

function loadGameState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
        if (saved) {
            return JSON.parse(saved);
        }
        return null;
    } catch (error) {
        console.error('Failed to load game state:', error);
        return null;
    }
}

function loadUserPreferences() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
        if (saved) {
            return JSON.parse(saved);
        }
        return null;
    } catch (error) {
        console.error('Failed to load user preferences:', error);
        return null;
    }
}

function loadSessionHistory() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.SESSION_HISTORY);
        if (saved) {
            return JSON.parse(saved);
        }
        return [];
    } catch (error) {
        console.error('Failed to load session history:', error);
        return [];
    }
}

// =====================================================
// CLEAR FUNCTIONS
// =====================================================

function clearGameState() {
    try {
        localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
        return true;
    } catch (error) {
        console.error('Failed to clear game state:', error);
        return false;
    }
}

function clearSessionHistory() {
    try {
        localStorage.removeItem(STORAGE_KEYS.SESSION_HISTORY);
        return true;
    } catch (error) {
        console.error('Failed to clear session history:', error);
        return false;
    }
}

function clearAllData() {
    try {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        return true;
    } catch (error) {
        console.error('Failed to clear all data:', error);
        return false;
    }
}

// =====================================================
// EXPORT FUNCTIONS
// =====================================================

function exportSessionAsJSON(sessionReport) {
    const dataStr = JSON.stringify(sessionReport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `blackjack_session_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportAllHistoryAsJSON() {
    const history = loadSessionHistory();
    const dataStr = JSON.stringify(history, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `blackjack_history_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
