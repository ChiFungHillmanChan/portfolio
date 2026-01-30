// =====================================================
// BET STATE - Placed bets tracking
// =====================================================

let betState = createInitialBetState();

// Undo stack to track bet actions for undo functionality
let betUndoStack = [];

/**
 * Create initial bet state
 * @returns {object} Fresh bet state object
 */
function createInitialBetState() {
    return {
        // Inside bets (keyed by bet identifier)
        straight: {},    // { "17": 25, "23": 50 }
        split: {},       // { "17-20": 10, "0-1": 25 }
        street: {},      // { "1-2-3": 25 }
        trio: {},        // { "0-1-2": 25, "0-2-3": 50 } - 3 numbers including zero, pays 11:1
        corner: {},      // { "1-2-4-5": 10 }
        firstFour: 0,    // European only (0,1,2,3)
        topLine: 0,      // American only (0,00,1,2,3)
        line: {},        // { "1-2-3-4-5-6": 15 }

        // Outside bets
        column: {},      // { "1": 50, "2": 25, "3": 30 }
        dozen: {},       // { "1": 100, "2": 50 }

        // Even money bets (simple number values)
        red: 0,
        black: 0,
        even: 0,
        odd: 0,
        low: 0,
        high: 0
    };
}

/**
 * Reset bet state to initial values
 */
function resetBetState() {
    betState = createInitialBetState();
    betUndoStack = [];
}

/**
 * Add a bet to the state
 * @param {string} betType - Type of bet (from BET_TYPES)
 * @param {string|null} betValue - Specific value for the bet (number, combination, etc.)
 * @param {number} amount - Amount to add
 * @param {boolean} recordUndo - Whether to record to undo stack (default: true)
 * @returns {boolean} Success
 */
function addBet(betType, betValue, amount, recordUndo = true) {
    if (amount <= 0) return false;

    // Even money bets (no betValue needed)
    if (['red', 'black', 'even', 'odd', 'low', 'high', 'firstFour', 'topLine'].includes(betType)) {
        betState[betType] += amount;
        // Record action for undo (unless explicitly disabled for grouped bets)
        if (recordUndo) {
            betUndoStack.push({ action: 'add', betType, betValue: null, amount });
        }
        return true;
    }

    // Object-based bets
    if (betState[betType] !== undefined && typeof betState[betType] === 'object') {
        if (!betState[betType][betValue]) {
            betState[betType][betValue] = 0;
        }
        betState[betType][betValue] += amount;
        // Record action for undo (unless explicitly disabled for grouped bets)
        if (recordUndo) {
            betUndoStack.push({ action: 'add', betType, betValue, amount });
        }
        return true;
    }

    return false;
}

/**
 * Remove a bet from the state
 * @param {string} betType - Type of bet
 * @param {string|null} betValue - Specific value for the bet
 * @param {number} amount - Amount to remove
 * @returns {boolean} Success
 */
function removeBet(betType, betValue, amount) {
    if (amount <= 0) return false;
    
    // Even money bets
    if (['red', 'black', 'even', 'odd', 'low', 'high', 'firstFour', 'topLine'].includes(betType)) {
        betState[betType] = Math.max(0, betState[betType] - amount);
        return true;
    }
    
    // Object-based bets
    if (betState[betType] !== undefined && typeof betState[betType] === 'object') {
        if (betState[betType][betValue]) {
            betState[betType][betValue] = Math.max(0, betState[betType][betValue] - amount);
            if (betState[betType][betValue] === 0) {
                delete betState[betType][betValue];
            }
            return true;
        }
    }
    
    return false;
}

/**
 * Clear a specific bet completely
 * @param {string} betType - Type of bet
 * @param {string|null} betValue - Specific value for the bet
 */
function clearBet(betType, betValue) {
    // Even money bets
    if (['red', 'black', 'even', 'odd', 'low', 'high', 'firstFour', 'topLine'].includes(betType)) {
        betState[betType] = 0;
        return;
    }
    
    // Object-based bets
    if (betState[betType] !== undefined && typeof betState[betType] === 'object') {
        if (betValue && betState[betType][betValue]) {
            delete betState[betType][betValue];
        }
    }
}

/**
 * Clear all bets
 */
function clearAllBets() {
    betState = createInitialBetState();
    betUndoStack = [];
}

/**
 * Double all current bets
 * @param {number} maxBankroll - Maximum amount available to bet
 * @returns {boolean} True if successful, false if cannot afford
 */
function doubleAllBets(maxBankroll) {
    const currentTotal = calculateTotalWagered(betState);
    
    // Check if player can afford to double
    if (currentTotal * 2 > maxBankroll) {
        return false;
    }
    
    // Double all even money bets
    const evenMoneyBets = ['red', 'black', 'even', 'odd', 'low', 'high', 'firstFour', 'topLine'];
    evenMoneyBets.forEach(betType => {
        if (betState[betType] > 0) {
            betState[betType] *= 2;
        }
    });
    
    // Double all object-based bets
    const objectBets = ['straight', 'split', 'street', 'trio', 'corner', 'line', 'column', 'dozen'];
    objectBets.forEach(betType => {
        if (betState[betType] && typeof betState[betType] === 'object') {
            for (const betValue in betState[betType]) {
                betState[betType][betValue] *= 2;
            }
        }
    });
    
    // Record as a single undo action (doubling all bets)
    betUndoStack.push({ action: 'double', previousTotal: currentTotal });
    
    return true;
}

/**
 * Undo the last bet action
 * @returns {boolean} True if undo was successful, false if nothing to undo
 */
function undoLastBet() {
    if (betUndoStack.length === 0) return false;

    const lastAction = betUndoStack.pop();

    if (lastAction.action === 'add') {
        // Reverse an add by removing the amount
        undoSingleAdd(lastAction.betType, lastAction.betValue, lastAction.amount);
    } else if (lastAction.action === 'double') {
        // Reverse a double by halving all bets
        const evenMoneyBets = ['red', 'black', 'even', 'odd', 'low', 'high', 'firstFour', 'topLine'];
        evenMoneyBets.forEach(betType => {
            if (betState[betType] > 0) {
                betState[betType] = Math.floor(betState[betType] / 2);
            }
        });
        
        const objectBets = ['straight', 'split', 'street', 'trio', 'corner', 'line', 'column', 'dozen'];
        objectBets.forEach(betType => {
            if (betState[betType] && typeof betState[betType] === 'object') {
                for (const betValue in betState[betType]) {
                    betState[betType][betValue] = Math.floor(betState[betType][betValue] / 2);
                    if (betState[betType][betValue] <= 0) {
                        delete betState[betType][betValue];
                    }
                }
            }
        });
    } else if (lastAction.action === 'group') {
        // Reverse a group of bets (neighbour bet or call bet)
        lastAction.bets.forEach(bet => {
            undoSingleAdd(bet.betType, bet.betValue, bet.amount);
        });
    }

    return true;
}

/**
 * Helper to undo a single add action
 * @param {string} betType - Type of bet
 * @param {string|null} betValue - Bet value
 * @param {number} amount - Amount to remove
 */
function undoSingleAdd(betType, betValue, amount) {
    if (['red', 'black', 'even', 'odd', 'low', 'high', 'firstFour', 'topLine'].includes(betType)) {
        betState[betType] = Math.max(0, betState[betType] - amount);
    } else if (betState[betType] && typeof betState[betType] === 'object') {
        if (betState[betType][betValue]) {
            betState[betType][betValue] -= amount;
            if (betState[betType][betValue] <= 0) {
                delete betState[betType][betValue];
            }
        }
    }
}

/**
 * Check if there are any actions to undo
 * @returns {boolean} True if undo stack has items
 */
function canUndo() {
    return betUndoStack.length > 0;
}

/**
 * Get a specific bet amount
 * @param {string} betType - Type of bet
 * @param {string|null} betValue - Specific value for the bet
 * @returns {number} Bet amount
 */
function getBetAmount(betType, betValue) {
    // Even money bets
    if (['red', 'black', 'even', 'odd', 'low', 'high', 'firstFour', 'topLine'].includes(betType)) {
        return betState[betType] || 0;
    }
    
    // Object-based bets
    if (betState[betType] !== undefined && typeof betState[betType] === 'object') {
        return betState[betType][betValue] || 0;
    }
    
    return 0;
}

/**
 * Get total amount wagered
 * @returns {number} Total wagered
 */
function getTotalWagered() {
    return calculateTotalWagered(betState);
}

/**
 * Check if any bets are placed
 * @returns {boolean}
 */
function hasBets() {
    return getTotalWagered() > 0;
}

/**
 * Get all placed bets
 * @returns {object} Copy of bet state
 */
function getAllBets() {
    return JSON.parse(JSON.stringify(betState));
}

/**
 * Restore bets from a previous state (for repeat feature)
 * @param {object} savedBets - Previously saved bets
 * @param {number} maxBankroll - Current bankroll to validate against
 * @returns {boolean} Success
 */
function restoreBets(savedBets, maxBankroll) {
    if (!savedBets) return false;
    
    // Calculate total of saved bets
    const total = calculateTotalWagered(savedBets);
    
    // Check if player can afford it
    if (total > maxBankroll) {
        return false;
    }
    
    betState = JSON.parse(JSON.stringify(savedBets));
    return true;
}

/**
 * Get bet count by type
 * @returns {object} Count of each bet type
 */
function getBetCounts() {
    const counts = {};
    
    for (const [betType, value] of Object.entries(betState)) {
        if (typeof value === 'object') {
            counts[betType] = Object.keys(value).length;
        } else if (value > 0) {
            counts[betType] = 1;
        } else {
            counts[betType] = 0;
        }
    }
    
    return counts;
}

/**
 * Get all straight bets (for highlighting on wheel/table)
 * @returns {array} Array of numbers with straight bets
 */
function getStraightBetNumbers() {
    return Object.keys(betState.straight).map(n => n === '00' ? '00' : parseInt(n));
}

/**
 * Validate all bets against table limits
 * @param {number} minBet - Minimum bet
 * @param {number} maxBet - Maximum bet
 * @returns {object} Validation result with any errors
 */
function validateAllBets(minBet, maxBet) {
    const errors = [];

    for (const [betType, value] of Object.entries(betState)) {
        if (typeof value === 'object') {
            for (const [betValue, amount] of Object.entries(value)) {
                if (amount > 0 && amount < minBet) {
                    errors.push(`${betType} on ${betValue}: below minimum bet`);
                }
                if (amount > maxBet) {
                    errors.push(`${betType} on ${betValue}: exceeds maximum bet`);
                }
            }
        } else if (value > 0) {
            if (value < minBet) {
                errors.push(`${betType}: below minimum bet`);
            }
            if (value > maxBet) {
                errors.push(`${betType}: exceeds maximum bet`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors: errors
    };
}

/**
 * Restore bets from storage (used when loading saved game)
 * @param {object} savedBets - Bets object from storage
 */
function restoreBetsFromStorage(savedBets) {
    if (!savedBets) return;

    // Restore all bet types
    betState.straight = savedBets.straight || {};
    betState.split = savedBets.split || {};
    betState.street = savedBets.street || {};
    betState.trio = savedBets.trio || {};
    betState.corner = savedBets.corner || {};
    betState.firstFour = savedBets.firstFour || 0;
    betState.topLine = savedBets.topLine || 0;
    betState.line = savedBets.line || {};
    betState.column = savedBets.column || {};
    betState.dozen = savedBets.dozen || {};
    betState.red = savedBets.red || 0;
    betState.black = savedBets.black || 0;
    betState.even = savedBets.even || 0;
    betState.odd = savedBets.odd || 0;
    betState.low = savedBets.low || 0;
    betState.high = savedBets.high || 0;
}

// =====================================================
// CALL BETS & NEIGHBOUR BETS (Racetrack)
// =====================================================

/**
 * Place a neighbour bet (straight bets on a number and its wheel neighbours)
 * @param {number|string} centerNumber - The center number
 * @param {number} range - How many neighbours on each side (2-7)
 * @param {number} chipValue - Value of each chip to place
 * @param {array} wheelSequence - The wheel sequence to use
 * @returns {boolean} Success
 */
function placeNeighbourBet(centerNumber, range, chipValue, wheelSequence) {
    const neighbours = getWheelNeighbours(centerNumber, range, wheelSequence);
    if (neighbours.length === 0) return false;
    
    const totalCost = neighbours.length * chipValue;
    const totalWagered = getTotalWagered();
    const currentBankroll = getCurrentBankroll();
    
    // Check if player can afford all the bets
    if (totalCost > (currentBankroll - totalWagered)) {
        return false;
    }
    
    // Collect all bets for grouped undo
    const groupedBets = [];
    
    // Place straight bets on all neighbours (including center) - don't record individual undos
    neighbours.forEach(num => {
        const betValue = num.toString();
        addBet('straight', betValue, chipValue, false); // false = don't record to undo stack
        groupedBets.push({ betType: 'straight', betValue, amount: chipValue });
    });
    
    // Record as a single grouped undo action
    betUndoStack.push({ 
        action: 'group', 
        groupType: 'neighbour',
        centerNumber,
        range,
        bets: groupedBets 
    });
    
    return true;
}

/**
 * Remove a neighbour bet
 * @param {number|string} centerNumber - The center number
 * @param {number} range - How many neighbours on each side
 * @param {number} chipValue - Value of each chip to remove
 * @param {array} wheelSequence - The wheel sequence to use
 */
function removeNeighbourBet(centerNumber, range, chipValue, wheelSequence) {
    const neighbours = getWheelNeighbours(centerNumber, range, wheelSequence);
    
    neighbours.forEach(num => {
        removeBet('straight', num.toString(), chipValue);
    });
}

/**
 * Place a call bet (Voisins, Tiers, Orphelins, Jeu Zero)
 * @param {string} betName - Name of the call bet (voisins, tiers, orphelins, jeuZero)
 * @param {number} chipValue - Value of each chip unit
 * @returns {boolean} Success
 */
function placeCallBet(betName, chipValue) {
    const callBet = CALL_BETS[betName];
    if (!callBet) return false;
    
    const totalCost = callBet.chips * chipValue;
    const totalWagered = getTotalWagered();
    const currentBankroll = getCurrentBankroll();
    
    // Check if player can afford the bet
    if (totalCost > (currentBankroll - totalWagered)) {
        return false;
    }
    
    // Collect all bets for grouped undo
    const groupedBets = [];
    
    // Place all the component bets - don't record individual undos
    callBet.bets.forEach(bet => {
        const amount = bet.amount * chipValue;
        addBet(bet.type, bet.value, amount, false); // false = don't record to undo stack
        groupedBets.push({ betType: bet.type, betValue: bet.value, amount });
    });
    
    // Record as a single grouped undo action
    betUndoStack.push({ 
        action: 'group', 
        groupType: 'callBet',
        betName,
        bets: groupedBets 
    });
    
    return true;
}

/**
 * Remove a call bet
 * @param {string} betName - Name of the call bet
 * @param {number} chipValue - Value of each chip unit to remove
 */
function removeCallBet(betName, chipValue) {
    const callBet = CALL_BETS[betName];
    if (!callBet) return;
    
    callBet.bets.forEach(bet => {
        const amount = bet.amount * chipValue;
        removeBet(bet.type, bet.value, amount);
    });
}

/**
 * Check if player can afford a call bet
 * @param {string} betName - Name of the call bet
 * @param {number} chipValue - Value of each chip unit
 * @returns {boolean} True if affordable
 */
function canAffordCallBet(betName, chipValue) {
    const callBet = CALL_BETS[betName];
    if (!callBet) return false;
    
    const totalCost = callBet.chips * chipValue;
    const totalWagered = getTotalWagered();
    const currentBankroll = getCurrentBankroll();
    
    return totalCost <= (currentBankroll - totalWagered);
}

/**
 * Check if player can afford a neighbour bet
 * @param {number} range - How many neighbours on each side
 * @param {number} chipValue - Value of each chip
 * @returns {boolean} True if affordable
 */
function canAffordNeighbourBet(range, chipValue) {
    const totalChips = range * 2 + 1; // neighbours on each side + center
    const totalCost = totalChips * chipValue;
    const totalWagered = getTotalWagered();
    const currentBankroll = getCurrentBankroll();
    
    return totalCost <= (currentBankroll - totalWagered);
}
