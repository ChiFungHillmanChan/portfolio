// =====================================================
// STORAGE - LocalStorage persistence for game state
// Saves and restores game progress across page refreshes
// =====================================================

const STORAGE_KEYS = {
    GAME_STATE: 'roulette_game_state',
    STATS_STATE: 'roulette_stats_state',
    BET_STATE: 'roulette_bet_state'
};

const STORAGE_VERSION = '1.0';

/**
 * Save game state to localStorage
 */
function saveGameStateToStorage() {
    try {
        const stateToSave = {
            version: STORAGE_VERSION,
            timestamp: Date.now(),
            phase: gameState.phase,
            config: gameState.config,
            bankroll: gameState.bankroll,
            lastBets: gameState.lastBets,
            selectedChip: gameState.selectedChip
        };
        localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(stateToSave));
    } catch (e) {
        console.warn('Failed to save game state to localStorage:', e);
    }
}

/**
 * Save stats state to localStorage
 */
function saveStatsStateToStorage() {
    try {
        const stateToSave = {
            version: STORAGE_VERSION,
            timestamp: Date.now(),
            history: statsState.history.slice(0, 100), // Keep last 100 spins
            numberFrequency: statsState.numberFrequency,
            colorStreak: statsState.colorStreak,
            parityStreak: statsState.parityStreak,
            rangeStreak: statsState.rangeStreak,
            distribution: statsState.distribution,
            session: statsState.session,
            spinsSinceHit: statsState.spinsSinceHit
        };
        localStorage.setItem(STORAGE_KEYS.STATS_STATE, JSON.stringify(stateToSave));
    } catch (e) {
        console.warn('Failed to save stats state to localStorage:', e);
    }
}

/**
 * Save bet state to localStorage
 */
function saveBetStateToStorage() {
    try {
        const bets = getAllBets();
        const stateToSave = {
            version: STORAGE_VERSION,
            timestamp: Date.now(),
            bets: bets
        };
        localStorage.setItem(STORAGE_KEYS.BET_STATE, JSON.stringify(stateToSave));
    } catch (e) {
        console.warn('Failed to save bet state to localStorage:', e);
    }
}

/**
 * Save all state to localStorage
 */
function saveAllStateToStorage() {
    saveGameStateToStorage();
    saveStatsStateToStorage();
    saveBetStateToStorage();
}

/**
 * Load game state from localStorage
 * @returns {object|null} Saved state or null
 */
function loadGameStateFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
        if (!saved) return null;

        const parsed = JSON.parse(saved);

        // Version check
        if (parsed.version !== STORAGE_VERSION) {
            console.log('Storage version mismatch, clearing old data');
            clearAllStorage();
            return null;
        }

        return parsed;
    } catch (e) {
        console.warn('Failed to load game state from localStorage:', e);
        return null;
    }
}

/**
 * Load stats state from localStorage
 * @returns {object|null} Saved state or null
 */
function loadStatsStateFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.STATS_STATE);
        if (!saved) return null;

        const parsed = JSON.parse(saved);

        // Version check
        if (parsed.version !== STORAGE_VERSION) {
            return null;
        }

        return parsed;
    } catch (e) {
        console.warn('Failed to load stats state from localStorage:', e);
        return null;
    }
}

/**
 * Load bet state from localStorage
 * @returns {object|null} Saved state or null
 */
function loadBetStateFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.BET_STATE);
        if (!saved) return null;

        const parsed = JSON.parse(saved);

        // Version check
        if (parsed.version !== STORAGE_VERSION) {
            return null;
        }

        return parsed;
    } catch (e) {
        console.warn('Failed to load bet state from localStorage:', e);
        return null;
    }
}

/**
 * Restore game state from localStorage
 * @returns {boolean} True if state was restored
 */
function restoreGameState() {
    const savedGame = loadGameStateFromStorage();
    const savedStats = loadStatsStateFromStorage();
    const savedBets = loadBetStateFromStorage();

    if (!savedGame || savedGame.phase === GAME_PHASES.SETUP) {
        // No saved game or was in setup phase, start fresh
        return false;
    }

    // Check if bankroll is zero or negative (bust state)
    // If so, clear storage and start fresh - game is over
    if (savedGame.bankroll && savedGame.bankroll.current <= 0) {
        console.log('Saved game has zero bankroll (bust), clearing storage');
        clearAllStorage();
        return false;
    }

    // Restore game state
    // Always restore to BETTING phase since SPINNING/RESULT are transient states
    // that should not persist across page refreshes
    gameState.phase = GAME_PHASES.BETTING;
    gameState.config = savedGame.config;
    gameState.bankroll = savedGame.bankroll;
    gameState.lastBets = savedGame.lastBets;
    gameState.selectedChip = savedGame.selectedChip || CHIP_DENOMINATIONS[0];

    // Restore stats state
    if (savedStats) {
        statsState.history = savedStats.history || [];
        statsState.numberFrequency = savedStats.numberFrequency || {};
        statsState.colorStreak = savedStats.colorStreak || { current: 0, longest: 0, type: null };
        statsState.parityStreak = savedStats.parityStreak || { current: 0, longest: 0, type: null };
        statsState.rangeStreak = savedStats.rangeStreak || { current: 0, longest: 0, type: null };
        statsState.distribution = savedStats.distribution || createInitialStatsState().distribution;
        statsState.session = savedStats.session || createInitialStatsState().session;
        statsState.spinsSinceHit = savedStats.spinsSinceHit || {};
    }

    // Restore bet state
    if (savedBets && savedBets.bets) {
        restoreBetsFromStorage(savedBets.bets);
    }

    console.log('Game state restored from localStorage');
    return true;
}

/**
 * Clear all saved data from localStorage
 */
function clearAllStorage() {
    try {
        localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
        localStorage.removeItem(STORAGE_KEYS.STATS_STATE);
        localStorage.removeItem(STORAGE_KEYS.BET_STATE);
        console.log('All saved data cleared');
    } catch (e) {
        console.warn('Failed to clear localStorage:', e);
    }
}

/**
 * Check if there's saved game data that can be restored
 * @returns {boolean}
 */
function hasSavedGame() {
    const saved = loadGameStateFromStorage();
    // No saved game, or was in setup phase, or bankroll is zero (bust)
    if (!saved || saved.phase === GAME_PHASES.SETUP) {
        return false;
    }
    // Check if bankroll is zero (bust state) - can't restore a bust game
    if (saved.bankroll && saved.bankroll.current <= 0) {
        return false;
    }
    return true;
}

/**
 * Get saved game summary for display
 * @returns {object|null}
 */
function getSavedGameSummary() {
    const savedGame = loadGameStateFromStorage();
    const savedStats = loadStatsStateFromStorage();

    if (!savedGame || savedGame.phase === GAME_PHASES.SETUP) {
        return null;
    }

    return {
        rouletteType: savedGame.config.rouletteType,
        bankroll: savedGame.bankroll.current,
        initialStack: savedGame.bankroll.initial,
        profit: savedGame.bankroll.sessionProfit,
        totalSpins: savedStats ? savedStats.session.totalSpins : 0,
        lastPlayed: savedGame.timestamp
    };
}
