// =====================================================
// GAME STATE - Main game state management
// =====================================================

let gameState = createInitialGameState();

/**
 * Create initial game state
 * @returns {object} Fresh game state object
 */
function createInitialGameState() {
    return {
        phase: GAME_PHASES.SETUP,
        config: {
            rouletteType: DEFAULT_CONFIG.rouletteType,
            initialStack: DEFAULT_CONFIG.initialStack,
            minBet: DEFAULT_CONFIG.minBet,
            maxBet: DEFAULT_CONFIG.maxBet
        },
        bankroll: {
            initial: 0,
            current: 0,
            sessionProfit: 0
        },
        currentSpin: {
            result: null,
            isSpinning: false,
            spinData: null
        },
        lastBets: null,  // Store last bets for "Repeat" feature
        selectedChip: CHIP_DENOMINATIONS[0]  // Currently selected chip value
    };
}

/**
 * Reset game state to initial values
 */
function resetGameState() {
    gameState = createInitialGameState();
}

/**
 * Update game configuration
 * @param {object} newConfig - New configuration values
 */
function updateGameConfig(newConfig) {
    gameState.config = { ...gameState.config, ...newConfig };
}

/**
 * Set the game phase
 * @param {string} phase - New phase (from GAME_PHASES)
 */
function setGamePhase(phase) {
    gameState.phase = phase;
}

/**
 * Initialize bankroll for a new game
 * @param {number} amount - Starting bankroll
 */
function initializeBankroll(amount) {
    gameState.bankroll.initial = amount;
    gameState.bankroll.current = amount;
    gameState.bankroll.sessionProfit = 0;
}

/**
 * Update bankroll after a spin
 * @param {number} change - Amount won (positive) or lost (negative)
 */
function updateBankroll(change) {
    gameState.bankroll.current += change;
    gameState.bankroll.sessionProfit = gameState.bankroll.current - gameState.bankroll.initial;
    // Save to localStorage
    saveGameStateToStorage();
}

/**
 * Set the selected chip denomination
 * @param {number} value - Chip value
 */
function setSelectedChip(value) {
    if (CHIP_DENOMINATIONS.includes(value)) {
        gameState.selectedChip = value;
        saveGameStateToStorage();
    }
}

/**
 * Get the currently selected chip value
 * @returns {number} Selected chip value
 */
function getSelectedChip() {
    return gameState.selectedChip;
}

/**
 * Store current bets as last bets (for repeat feature)
 * @param {object} bets - Current placed bets
 */
function storeLastBets(bets) {
    gameState.lastBets = JSON.parse(JSON.stringify(bets));
    saveGameStateToStorage();
}

/**
 * Get stored last bets
 * @returns {object|null} Last bets or null
 */
function getLastBets() {
    return gameState.lastBets;
}

/**
 * Clear last bets (when user spins without placing bets)
 */
function clearLastBets() {
    gameState.lastBets = null;
    saveGameStateToStorage();
}

/**
 * Set spin result data
 * @param {object} spinData - Spin animation and result data
 */
function setSpinData(spinData) {
    gameState.currentSpin.spinData = spinData;
    gameState.currentSpin.result = spinData.result;
    gameState.currentSpin.isSpinning = true;
}

/**
 * Clear spin data after spin completes
 */
function clearSpinData() {
    gameState.currentSpin.isSpinning = false;
}

/**
 * Get current spin result
 * @returns {number|string|null} The winning number
 */
function getSpinResult() {
    return gameState.currentSpin.result;
}

/**
 * Check if currently spinning
 * @returns {boolean}
 */
function isSpinning() {
    return gameState.currentSpin.isSpinning;
}

/**
 * Get current bankroll
 * @returns {number}
 */
function getCurrentBankroll() {
    return gameState.bankroll.current;
}

/**
 * Get session profit/loss
 * @returns {number}
 */
function getSessionProfit() {
    return gameState.bankroll.sessionProfit;
}

/**
 * Get roulette type configuration
 * @returns {object} Roulette type config object
 */
function getRouletteConfig() {
    return ROULETTE_TYPES[gameState.config.rouletteType];
}

/**
 * Get current game phase
 * @returns {string}
 */
function getGamePhase() {
    return gameState.phase;
}

/**
 * Check if player is bankrupt
 * @returns {boolean}
 */
function isBankrupt() {
    return gameState.bankroll.current <= 0;
}

/**
 * Get available chip denominations based on bankroll
 * @returns {array} Available chip values
 */
function getAvailableChips() {
    return CHIP_DENOMINATIONS.filter(chip => chip <= gameState.bankroll.current);
}

/**
 * Start a new game with configuration
 * @param {object} config - Game configuration
 */
function startGame(config) {
    updateGameConfig(config);
    initializeBankroll(config.initialStack);
    resetBetState();
    resetStatsState();
    setGamePhase(GAME_PHASES.BETTING);
}

/**
 * End current game and return to setup
 */
function endGame() {
    setGamePhase(GAME_PHASES.SETUP);
}
