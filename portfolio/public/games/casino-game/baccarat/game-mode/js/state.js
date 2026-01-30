// =====================================================
// BACCARAT GAME MODE - STATE MANAGEMENT
// =====================================================

// =====================================================
// GAME STATE
// =====================================================

let gameState = createInitialGameState();

/**
 * Create initial game state
 * @returns {Object} Fresh game state object
 */
function createInitialGameState() {
    return {
        phase: GAME_PHASES.SETUP,
        config: {
            initialStack: DEFAULT_CONFIG.initialStack,
            minBet: DEFAULT_CONFIG.minBet,
            maxBet: DEFAULT_CONFIG.maxBet
        },
        bankroll: {
            initial: 0,
            current: 0,
            sessionProfit: 0
        },
        shoe: {
            cards: [],
            dealt: 0
        },
        currentHand: {
            playerCards: [],
            bankerCards: [],
            playerTotal: 0,
            bankerTotal: 0,
            dealPosition: 0,  // 0-3 for initial 4 cards, then 4-5 for third cards
            isComplete: false,
            winner: null,
            isNatural: false
        },
        lastBets: null,
        selectedChip: CHIP_DENOMINATIONS[0],
        roundNumber: 0,
        history: []  // Previous hand results
    };
}

/**
 * Reset game state to initial values
 */
function resetGameState() {
    gameState = createInitialGameState();
}

/**
 * Set the game phase
 * @param {string} phase - New phase (from GAME_PHASES)
 */
function setGamePhase(phase) {
    gameState.phase = phase;
}

/**
 * Get current game phase
 * @returns {string} Current phase
 */
function getGamePhase() {
    return gameState.phase;
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
 * Update bankroll after a hand
 * @param {number} change - Amount won (positive) or lost (negative)
 */
function updateBankroll(change) {
    gameState.bankroll.current += change;
    gameState.bankroll.sessionProfit = gameState.bankroll.current - gameState.bankroll.initial;
    saveToStorage();
}

/**
 * Get current bankroll
 * @returns {number} Current bankroll
 */
function getCurrentBankroll() {
    return gameState.bankroll.current;
}

/**
 * Get session profit/loss
 * @returns {number} Session profit (can be negative)
 */
function getSessionProfit() {
    return gameState.bankroll.sessionProfit;
}

/**
 * Check if player is bankrupt
 * @returns {boolean} True if bankroll is 0 or less
 */
function isBankrupt() {
    return gameState.bankroll.current <= 0;
}

/**
 * Set the selected chip denomination
 * @param {number} value - Chip value
 */
function setSelectedChip(value) {
    if (CHIP_DENOMINATIONS.includes(value)) {
        gameState.selectedChip = value;
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
 * Get affordable chip denominations based on current bankroll and total wagered
 * @returns {Array} Array of affordable chip values
 */
function getAvailableChips() {
    const available = getCurrentBankroll() - getTotalWagered();
    return CHIP_DENOMINATIONS.filter(chip => chip <= available);
}

/**
 * Store current bets as last bets (for repeat feature)
 * @param {Object} bets - Current placed bets
 */
function storeLastBets(bets) {
    gameState.lastBets = JSON.parse(JSON.stringify(bets));
}

/**
 * Get last placed bets
 * @returns {Object|null} Last placed bets or null
 */
function getLastBets() {
    return gameState.lastBets;
}

/**
 * Initialize a new shoe
 */
function initializeShoe() {
    const cards = [];
    // Create 8 decks
    for (let deck = 0; deck < TOTAL_DECKS; deck++) {
        for (let suit = 0; suit < 4; suit++) {
            for (let rank = 0; rank < 13; rank++) {
                cards.push({ rank, suit });
            }
        }
    }
    // Shuffle using Fisher-Yates
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    gameState.shoe.cards = cards;
    gameState.shoe.dealt = 0;
}

/**
 * Draw a card from the shoe
 * @returns {Object|null} Card object {rank, suit} or null if shoe is empty
 */
function drawCard() {
    if (gameState.shoe.dealt >= gameState.shoe.cards.length) {
        return null;
    }
    const card = gameState.shoe.cards[gameState.shoe.dealt];
    gameState.shoe.dealt++;
    return card;
}

/**
 * Get remaining cards in shoe
 * @returns {number} Number of cards remaining
 */
function getCardsRemaining() {
    return gameState.shoe.cards.length - gameState.shoe.dealt;
}

/**
 * Check if shoe needs reshuffle (less than 10% remaining)
 * @returns {boolean} True if reshuffle needed
 */
function needsReshuffle() {
    return getCardsRemaining() < TOTAL_CARDS * 0.1;
}

/**
 * Reset current hand for new round
 */
function resetCurrentHand() {
    gameState.currentHand = {
        playerCards: [],
        bankerCards: [],
        playerTotal: 0,
        bankerTotal: 0,
        dealPosition: 0,
        isComplete: false,
        winner: null,
        isNatural: false
    };
}

/**
 * Get current hand state
 * @returns {Object} Current hand state
 */
function getCurrentHand() {
    return gameState.currentHand;
}

/**
 * Add hand result to history
 * @param {Object} result - Hand result to store
 */
function addToHistory(result) {
    gameState.history.push(result);
    gameState.roundNumber++;
}

/**
 * Get hand history
 * @returns {Array} Array of previous hand results
 */
function getHistory() {
    return gameState.history;
}

// =====================================================
// BET STATE
// =====================================================

let betState = createInitialBetState();

/**
 * Create initial bet state
 * @returns {Object} Fresh bet state object
 */
function createInitialBetState() {
    return {
        // Main bets
        player: 0,
        banker: 0,
        tie: 0,
        // Pair bets
        playerPair: 0,
        bankerPair: 0,
        // Dragon Bonus
        dragonPlayer: 0,
        dragonBanker: 0,
        // Egalité (Tie 0-9)
        egalite0: 0,
        egalite1: 0,
        egalite2: 0,
        egalite3: 0,
        egalite4: 0,
        egalite5: 0,
        egalite6: 0,
        egalite7: 0,
        egalite8: 0,
        egalite9: 0
    };
}

/**
 * Reset bet state to initial values
 */
function resetBetState() {
    betState = createInitialBetState();
}

/**
 * Add a bet
 * @param {string} betType - Type of bet (from BET_TYPES)
 * @param {number} amount - Amount to add
 * @returns {boolean} Success
 */
function addBet(betType, amount) {
    if (amount <= 0) return false;
    if (betState[betType] === undefined) return false;

    // Check affordability
    const totalAfterBet = getTotalWagered() + amount;
    if (totalAfterBet > getCurrentBankroll()) {
        return false;
    }

    betState[betType] += amount;
    return true;
}

/**
 * Remove a bet
 * @param {string} betType - Type of bet
 * @param {number} amount - Amount to remove
 * @returns {boolean} Success
 */
function removeBet(betType, amount) {
    if (amount <= 0) return false;
    if (betState[betType] === undefined) return false;

    betState[betType] = Math.max(0, betState[betType] - amount);
    return true;
}

/**
 * Clear a specific bet completely
 * @param {string} betType - Type of bet
 */
function clearBet(betType) {
    if (betState[betType] !== undefined) {
        betState[betType] = 0;
    }
}

/**
 * Clear all bets
 */
function clearAllBets() {
    betState = createInitialBetState();
}

/**
 * Get amount on a specific bet
 * @param {string} betType - Type of bet
 * @returns {number} Amount on bet
 */
function getBetAmount(betType) {
    return betState[betType] || 0;
}

/**
 * Get total wagered amount
 * @returns {number} Total of all bets
 */
function getTotalWagered() {
    let total = 0;
    for (const key in betState) {
        total += betState[key];
    }
    return total;
}

/**
 * Check if any bets are placed
 * @returns {boolean} True if at least one bet is placed
 */
function hasBets() {
    return getTotalWagered() > 0;
}

/**
 * Get copy of all bets
 * @returns {Object} Copy of bet state
 */
function getAllBets() {
    return { ...betState };
}

/**
 * Restore bets from saved state
 * @param {Object} savedBets - Previously saved bets
 * @returns {boolean} Success
 */
function restoreBets(savedBets) {
    if (!savedBets) return false;

    // Calculate total of saved bets
    let savedTotal = 0;
    for (const key in savedBets) {
        savedTotal += savedBets[key] || 0;
    }

    // Check affordability
    if (savedTotal > getCurrentBankroll()) {
        return false;
    }

    // Restore bets
    for (const key in savedBets) {
        if (betState[key] !== undefined) {
            betState[key] = savedBets[key];
        }
    }
    return true;
}

/**
 * Double all current bets (if affordable)
 * @returns {boolean} Success
 */
function doubleAllBets() {
    const currentTotal = getTotalWagered();
    if (currentTotal * 2 > getCurrentBankroll()) {
        return false;
    }

    for (const key in betState) {
        betState[key] *= 2;
    }
    return true;
}

// =====================================================
// STORAGE
// =====================================================

/**
 * Save current state to localStorage
 */
function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify({
            phase: gameState.phase,
            config: gameState.config,
            bankroll: gameState.bankroll,
            selectedChip: gameState.selectedChip,
            roundNumber: gameState.roundNumber,
            history: gameState.history.slice(-50), // Keep last 50 hands
            lastBets: gameState.lastBets,
            timestamp: Date.now()
        }));
        localStorage.setItem(STORAGE_KEYS.BET_STATE, JSON.stringify(betState));
    } catch (e) {
        console.warn('Failed to save state to localStorage:', e);
    }
}

/**
 * Load state from localStorage
 * @returns {boolean} Success
 */
function loadFromStorage() {
    try {
        const savedGame = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
        const savedBets = localStorage.getItem(STORAGE_KEYS.BET_STATE);

        if (savedGame) {
            const parsed = JSON.parse(savedGame);
            
            // Don't restore if bankrupt or in transient state
            if (parsed.bankroll.current <= 0 || 
                parsed.phase === GAME_PHASES.DEALING) {
                clearStorage();
                return false;
            }

            gameState.phase = parsed.phase;
            gameState.config = parsed.config;
            gameState.bankroll = parsed.bankroll;
            gameState.selectedChip = parsed.selectedChip || CHIP_DENOMINATIONS[0];
            gameState.roundNumber = parsed.roundNumber || 0;
            gameState.history = parsed.history || [];
            gameState.lastBets = parsed.lastBets;
            
            // Reinitialize shoe
            initializeShoe();
        }

        if (savedBets && gameState.phase === GAME_PHASES.BETTING) {
            const parsedBets = JSON.parse(savedBets);
            for (const key in parsedBets) {
                if (betState[key] !== undefined) {
                    betState[key] = parsedBets[key];
                }
            }
        }

        return !!savedGame;
    } catch (e) {
        console.warn('Failed to load state from localStorage:', e);
        return false;
    }
}

/**
 * Clear all storage
 */
function clearStorage() {
    try {
        localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
        localStorage.removeItem(STORAGE_KEYS.BET_STATE);
        localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    } catch (e) {
        console.warn('Failed to clear localStorage:', e);
    }
}

/**
 * Check if there's a saved game
 * @returns {boolean} True if valid saved game exists
 */
function hasSavedGame() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
        if (!saved) return false;
        const parsed = JSON.parse(saved);
        return parsed.bankroll && parsed.bankroll.current > 0;
    } catch {
        return false;
    }
}
