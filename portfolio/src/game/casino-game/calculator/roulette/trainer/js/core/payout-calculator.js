// =====================================================
// PAYOUT CALCULATOR - Calculate payouts for all bet types
// =====================================================

import { expandCallBet, getCallBetBaseChips, isValidCallBet } from './call-bets.js';

// Payout ratios (X to 1) - excludes original bet
const PAYOUTS = {
    straight: 35,    // 1 number
    split: 17,       // 2 numbers
    street: 11,      // 3 numbers
    trio: 11,        // 3 numbers including zero (same as street)
    corner: 8,       // 4 numbers
    firstFour: 8,    // 0,1,2,3
    line: 5,         // 6 numbers (double street/sixline)
    column: 2,       // 12 numbers
    dozen: 2,        // 12 numbers
    red: 1,          // 18 numbers
    black: 1,
    even: 1,
    odd: 1,
    low: 1,          // 1-18
    high: 1          // 19-36
};

// Number properties
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const BLACK_NUMBERS = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);

// Column definitions
const COLUMNS = {
    1: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
    2: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    3: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]
};

// Dozen definitions
const DOZENS = {
    1: Array.from({ length: 12 }, (_, i) => i + 1),      // 1-12
    2: Array.from({ length: 12 }, (_, i) => i + 13),     // 13-24
    3: Array.from({ length: 12 }, (_, i) => i + 25)      // 25-36
};

/**
 * Check if a number wins for a specific bet
 * @param {object} bet - The bet object {type, numbers, position, value}
 * @param {number} winningNumber - The winning number
 * @returns {boolean} Whether the bet wins
 */
function isBetWinner(bet, winningNumber) {
    const { type, numbers, position, value } = bet;

    switch (type) {
        case 'straight':
            return numbers.includes(winningNumber);

        case 'split':
            return numbers.includes(winningNumber);

        case 'street':
            return numbers.includes(winningNumber);

        case 'trio':
            return numbers.includes(winningNumber);

        case 'corner':
            return numbers.includes(winningNumber);

        case 'firstFour':
            return [0, 1, 2, 3].includes(winningNumber);

        case 'line':
        case 'sixline':
            return numbers.includes(winningNumber);

        case 'column':
            return COLUMNS[position]?.includes(winningNumber) || false;

        case 'dozen':
            return DOZENS[position]?.includes(winningNumber) || false;

        case 'red':
            return RED_NUMBERS.has(winningNumber);

        case 'black':
            return BLACK_NUMBERS.has(winningNumber);

        case 'even':
            return winningNumber > 0 && winningNumber % 2 === 0;

        case 'odd':
            return winningNumber > 0 && winningNumber % 2 === 1;

        case 'low':
            return winningNumber >= 1 && winningNumber <= 18;

        case 'high':
            return winningNumber >= 19 && winningNumber <= 36;

        default:
            // If numbers array is provided, check if winning number is in it
            if (numbers && Array.isArray(numbers)) {
                return numbers.includes(winningNumber);
            }
            return false;
    }
}

/**
 * Get the payout ratio for a bet type
 * @param {string} betType - The type of bet
 * @returns {number} Payout ratio
 */
function getPayoutRatio(betType) {
    // Normalize bet type
    const normalized = betType.toLowerCase();

    // Handle sixline alias
    if (normalized === 'sixline') return PAYOUTS.line;

    return PAYOUTS[normalized] ?? 0;
}

/**
 * Calculate the payout for a single bet (excludes original bet)
 * @param {object} bet - The bet object {type, chips/amount, numbers, position}
 * @param {number} winningNumber - The winning number
 * @returns {number} Payout amount (0 if bet loses)
 */
function calculateBetPayout(bet, winningNumber) {
    if (!isBetWinner(bet, winningNumber)) {
        return 0;
    }

    const amount = bet.amount ?? bet.chips ?? 0;
    const ratio = getPayoutRatio(bet.type);
    return amount * ratio;
}

/**
 * Categorize a bet as outside or inside
 * @param {string} betType - The type of bet
 * @returns {boolean} True if outside bet, false if inside bet
 */
function isOutsideBet(betType) {
    const outsideBets = ['column', 'dozen', 'red', 'black', 'even', 'odd', 'low', 'high'];
    return outsideBets.includes(betType.toLowerCase());
}

/**
 * Check if a bet type is an even money bet (1:1)
 * @param {string} betType - The type of bet
 * @returns {boolean}
 */
function isEvenMoneyBet(betType) {
    const evenMoneyBets = ['red', 'black', 'even', 'odd', 'low', 'high'];
    return evenMoneyBets.includes(betType.toLowerCase());
}

/**
 * Calculate total payouts for a list of bets
 * @param {array} bets - Array of bet objects
 * @param {number} winningNumber - The winning number
 * @returns {object} {outsidePayout, insidePayout, total, winningBets}
 */
function calculateTotalPayouts(bets, winningNumber) {
    let outsidePayout = 0;
    let insidePayout = 0;
    const winningBets = [];

    for (const bet of bets) {
        const payout = calculateBetPayout(bet, winningNumber);

        if (payout > 0) {
            winningBets.push({ ...bet, payout });

            if (isOutsideBet(bet.type)) {
                outsidePayout += payout;
            } else {
                insidePayout += payout;
            }
        }
    }

    return {
        outsidePayout,
        insidePayout,
        total: outsidePayout + insidePayout,
        winningBets
    };
}

/**
 * Calculate payouts for a call bet
 * @param {string} callBetType - Type of call bet
 * @param {number} totalAmount - Total amount wagered
 * @param {number} winningNumber - The winning number
 * @param {object} options - Additional options (e.g., centerNumber for neighbours)
 * @returns {object} {payout, expandedBets, winningBets}
 */
function calculateCallBetPayout(callBetType, totalAmount, winningNumber, options = {}) {
    if (!isValidCallBet(callBetType)) {
        throw new Error(`Unknown call bet type: ${callBetType}`);
    }

    const expandedBets = expandCallBet(callBetType, totalAmount, options);
    let payout = 0;
    const winningBets = [];

    for (const bet of expandedBets) {
        const betPayout = calculateBetPayout(bet, winningNumber);
        if (betPayout > 0) {
            payout += betPayout;
            winningBets.push({ ...bet, payout: betPayout });
        }
    }

    return {
        payout,
        expandedBets,
        winningBets
    };
}

/**
 * Get numbers for a bet based on type and position
 * @param {string} betType - The type of bet
 * @param {*} position - Position/value identifier
 * @returns {array} Array of covered numbers
 */
function getBetNumbers(betType, position) {
    switch (betType.toLowerCase()) {
        case 'straight':
            return [position];
        case 'column':
            return COLUMNS[position] || [];
        case 'dozen':
            return DOZENS[position] || [];
        case 'red':
            return Array.from(RED_NUMBERS);
        case 'black':
            return Array.from(BLACK_NUMBERS);
        case 'even':
            return Array.from({ length: 18 }, (_, i) => (i + 1) * 2);
        case 'odd':
            return Array.from({ length: 18 }, (_, i) => i * 2 + 1);
        case 'low':
            return Array.from({ length: 18 }, (_, i) => i + 1);
        case 'high':
            return Array.from({ length: 18 }, (_, i) => i + 19);
        default:
            return [];
    }
}

/**
 * Format a bet for display
 * @param {object} bet - The bet object
 * @returns {string} Human-readable bet description
 */
function formatBetDescription(bet) {
    const { type, numbers, position, amount, chips } = bet;
    const chipAmount = amount ?? chips ?? 0;

    switch (type.toLowerCase()) {
        case 'straight':
            return `Straight ${numbers[0]} = ${chipAmount}`;
        case 'split':
            return `Split ${numbers.join('-')} = ${chipAmount}`;
        case 'street':
            return `Street ${numbers[0]}-${numbers[2]} = ${chipAmount}`;
        case 'trio':
            return `Trio ${numbers.join('-')} = ${chipAmount}`;
        case 'corner':
            return `Corner ${numbers.join('-')} = ${chipAmount}`;
        case 'line':
        case 'sixline':
            return `Six Line ${numbers[0]}-${numbers[5]} = ${chipAmount}`;
        case 'column':
            return `${getOrdinal(position)} Column = ${chipAmount}`;
        case 'dozen':
            return `${getOrdinal(position)} Dozen = ${chipAmount}`;
        case 'red':
            return `Red = ${chipAmount}`;
        case 'black':
            return `Black = ${chipAmount}`;
        case 'even':
            return `Even = ${chipAmount}`;
        case 'odd':
            return `Odd = ${chipAmount}`;
        case 'low':
            return `Low (1-18) = ${chipAmount}`;
        case 'high':
            return `High (19-36) = ${chipAmount}`;
        default:
            return `${type} = ${chipAmount}`;
    }
}

/**
 * Get ordinal suffix
 * @param {number} n - Number
 * @returns {string} Number with ordinal suffix
 */
function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export {
    PAYOUTS,
    RED_NUMBERS,
    BLACK_NUMBERS,
    COLUMNS,
    DOZENS,
    isBetWinner,
    getPayoutRatio,
    calculateBetPayout,
    isOutsideBet,
    isEvenMoneyBet,
    calculateTotalPayouts,
    calculateCallBetPayout,
    getBetNumbers,
    formatBetDescription
};
