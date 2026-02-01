// =====================================================
// CALL BETS - Definitions and expansion for trainer
// =====================================================

// European wheel sequence
const WHEEL_SEQUENCE = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
    24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

// Call bet definitions with chip distributions
const CALL_BET_DEFINITIONS = {
    orphelins: {
        name: 'Orphelins',
        baseChips: 5,
        bets: [
            { type: 'straight', numbers: [1], chips: 1 },
            { type: 'split', numbers: [6, 9], chips: 1 },
            { type: 'split', numbers: [14, 17], chips: 1 },
            { type: 'split', numbers: [17, 20], chips: 1 },
            { type: 'split', numbers: [31, 34], chips: 1 }
        ]
    },
    tiers: {
        name: 'Tiers du Cylindre',
        baseChips: 6,
        bets: [
            { type: 'split', numbers: [5, 8], chips: 1 },
            { type: 'split', numbers: [10, 11], chips: 1 },
            { type: 'split', numbers: [13, 16], chips: 1 },
            { type: 'split', numbers: [23, 24], chips: 1 },
            { type: 'split', numbers: [27, 30], chips: 1 },
            { type: 'split', numbers: [33, 36], chips: 1 }
        ]
    },
    voisins: {
        name: 'Voisins du Zero',
        baseChips: 9,
        bets: [
            { type: 'trio', numbers: [0, 2, 3], chips: 2 },
            { type: 'split', numbers: [4, 7], chips: 1 },
            { type: 'split', numbers: [12, 15], chips: 1 },
            { type: 'split', numbers: [18, 21], chips: 1 },
            { type: 'split', numbers: [19, 22], chips: 1 },
            { type: 'corner', numbers: [25, 26, 28, 29], chips: 2 },
            { type: 'split', numbers: [32, 35], chips: 1 }
        ]
    },
    jeuZero: {
        name: 'Jeu Zero',
        baseChips: 4,
        bets: [
            { type: 'split', numbers: [0, 3], chips: 1 },
            { type: 'split', numbers: [12, 15], chips: 1 },
            { type: 'straight', numbers: [26], chips: 1 },
            { type: 'split', numbers: [32, 35], chips: 1 }
        ]
    }
};

/**
 * Get neighbours of a number on the European wheel
 * @param {number} centerNumber - The center number
 * @param {number} range - How many neighbours on each side (default 2)
 * @returns {array} Array of numbers including center and neighbours
 */
function getWheelNeighbours(centerNumber, range = 2) {
    const index = WHEEL_SEQUENCE.indexOf(centerNumber);
    if (index === -1) return [];

    const len = WHEEL_SEQUENCE.length;
    const neighbours = [];

    for (let i = -range; i <= range; i++) {
        const neighbourIndex = (index + i + len) % len;
        neighbours.push(WHEEL_SEQUENCE[neighbourIndex]);
    }

    return neighbours;
}

/**
 * Expand a call bet into individual bets with chip amounts
 * @param {string} callBetType - Type of call bet (orphelins, tiers, voisins, jeuZero, neighbours)
 * @param {number} totalAmount - Total amount wagered on the call bet
 * @param {object} options - Additional options (e.g., centerNumber for neighbours)
 * @returns {array} Array of expanded bets [{type, numbers, chips, amount}, ...]
 */
function expandCallBet(callBetType, totalAmount, options = {}) {
    // Handle neighbours bet separately
    if (callBetType === 'neighbours') {
        const centerNumber = options.centerNumber;
        const range = options.range || 2;
        const numbers = getWheelNeighbours(centerNumber, range);
        const chipCount = numbers.length;
        const chipValue = totalAmount / chipCount;

        return numbers.map(num => ({
            type: 'straight',
            numbers: [num],
            chips: 1,
            amount: chipValue
        }));
    }

    const definition = CALL_BET_DEFINITIONS[callBetType];
    if (!definition) {
        throw new Error(`Unknown call bet type: ${callBetType}`);
    }

    const chipValue = totalAmount / definition.baseChips;

    return definition.bets.map(bet => ({
        type: bet.type,
        numbers: [...bet.numbers],
        chips: bet.chips,
        amount: chipValue * bet.chips
    }));
}

/**
 * Get all numbers covered by a call bet
 * @param {string} callBetType - Type of call bet
 * @param {object} options - Additional options for neighbours bet
 * @returns {Set} Set of covered numbers
 */
function getCallBetNumbers(callBetType, options = {}) {
    if (callBetType === 'neighbours') {
        return new Set(getWheelNeighbours(options.centerNumber, options.range || 2));
    }

    const definition = CALL_BET_DEFINITIONS[callBetType];
    if (!definition) return new Set();

    const numbers = new Set();
    definition.bets.forEach(bet => {
        bet.numbers.forEach(n => numbers.add(n));
    });
    return numbers;
}

/**
 * Check if a call bet type is valid
 * @param {string} callBetType - Type to check
 * @returns {boolean}
 */
function isValidCallBet(callBetType) {
    return callBetType === 'neighbours' || callBetType in CALL_BET_DEFINITIONS;
}

/**
 * Get the base chip count for a call bet
 * @param {string} callBetType - Type of call bet
 * @param {object} options - Additional options for neighbours bet
 * @returns {number} Base chip count
 */
function getCallBetBaseChips(callBetType, options = {}) {
    if (callBetType === 'neighbours') {
        const range = options.range || 2;
        return range * 2 + 1; // e.g., range 2 = 5 chips
    }

    const definition = CALL_BET_DEFINITIONS[callBetType];
    return definition ? definition.baseChips : 0;
}

export {
    WHEEL_SEQUENCE,
    CALL_BET_DEFINITIONS,
    getWheelNeighbours,
    expandCallBet,
    getCallBetNumbers,
    isValidCallBet,
    getCallBetBaseChips
};
