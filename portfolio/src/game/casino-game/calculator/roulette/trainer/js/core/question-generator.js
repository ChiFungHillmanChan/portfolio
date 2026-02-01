// =====================================================
// QUESTION GENERATOR - Generate training questions
// =====================================================

import { WHEEL_SEQUENCE, expandCallBet, getCallBetBaseChips, getWheelNeighbours } from './call-bets.js';
import { calculateTotalPayouts, calculateCallBetPayout, isOutsideBet, COLUMNS, DOZENS, RED_NUMBERS, BLACK_NUMBERS } from './payout-calculator.js';

// Bet type configurations for generation
const SIMPLE_INSIDE_BETS = ['straight', 'split', 'corner', 'street', 'line'];
const OUTSIDE_BETS_1TO1 = ['red', 'black', 'even', 'odd', 'low', 'high'];
const OUTSIDE_BETS_2TO1 = ['column', 'dozen'];
const CALL_BET_TYPES = ['orphelins', 'tiers', 'voisins', 'jeuZero', 'neighbours'];

/**
 * Get a random element from an array
 */
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get a random integer between min and max (inclusive)
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate numbers for a bet type based on winning number or random
 * @param {string} betType - Type of bet
 * @param {number} winningNumber - The winning number (for creating winning bets)
 * @param {boolean} mustWin - Whether this bet must win
 * @returns {object} Bet details with numbers
 */
function generateBetNumbers(betType, winningNumber, mustWin = true) {
    switch (betType) {
        case 'straight':
            if (mustWin) {
                return { type: 'straight', numbers: [winningNumber], position: winningNumber };
            }
            // Random non-winning straight
            let num;
            do {
                num = randomInt(0, 36);
            } while (num === winningNumber);
            return { type: 'straight', numbers: [num], position: num };

        case 'split':
            return generateSplit(winningNumber, mustWin);

        case 'corner':
            return generateCorner(winningNumber, mustWin);

        case 'street':
            return generateStreet(winningNumber, mustWin);

        case 'line':
            return generateLine(winningNumber, mustWin);

        case 'column':
            return generateColumn(winningNumber, mustWin);

        case 'dozen':
            return generateDozen(winningNumber, mustWin);

        case 'red':
            if (mustWin && !RED_NUMBERS.has(winningNumber)) return null;
            if (!mustWin && RED_NUMBERS.has(winningNumber)) return null;
            return { type: 'red', numbers: Array.from(RED_NUMBERS), position: 'red' };

        case 'black':
            if (mustWin && !BLACK_NUMBERS.has(winningNumber)) return null;
            if (!mustWin && BLACK_NUMBERS.has(winningNumber)) return null;
            return { type: 'black', numbers: Array.from(BLACK_NUMBERS), position: 'black' };

        case 'even':
            if (mustWin && (winningNumber === 0 || winningNumber % 2 !== 0)) return null;
            if (!mustWin && winningNumber !== 0 && winningNumber % 2 === 0) return null;
            return { type: 'even', numbers: Array.from({ length: 18 }, (_, i) => (i + 1) * 2), position: 'even' };

        case 'odd':
            if (mustWin && (winningNumber === 0 || winningNumber % 2 !== 1)) return null;
            if (!mustWin && winningNumber !== 0 && winningNumber % 2 === 1) return null;
            return { type: 'odd', numbers: Array.from({ length: 18 }, (_, i) => i * 2 + 1), position: 'odd' };

        case 'low':
            if (mustWin && (winningNumber < 1 || winningNumber > 18)) return null;
            if (!mustWin && winningNumber >= 1 && winningNumber <= 18) return null;
            return { type: 'low', numbers: Array.from({ length: 18 }, (_, i) => i + 1), position: 'low' };

        case 'high':
            if (mustWin && (winningNumber < 19 || winningNumber > 36)) return null;
            if (!mustWin && winningNumber >= 19 && winningNumber <= 36) return null;
            return { type: 'high', numbers: Array.from({ length: 18 }, (_, i) => i + 19), position: 'high' };

        default:
            return null;
    }
}

/**
 * Generate a split bet
 */
function generateSplit(winningNumber, mustWin) {
    // Adjacent number pairs for splits
    const splits = [];

    // Vertical splits (within same column)
    for (let col = 1; col <= 12; col++) {
        const base = (col - 1) * 3 + 1;
        splits.push([base, base + 1]);       // row 1-2
        splits.push([base + 1, base + 2]);   // row 2-3
    }

    // Horizontal splits (adjacent columns)
    for (let col = 1; col <= 11; col++) {
        for (let row = 0; row < 3; row++) {
            const num1 = (col - 1) * 3 + row + 1;
            const num2 = col * 3 + row + 1;
            splits.push([num1, num2]);
        }
    }

    // Zero splits
    splits.push([0, 1], [0, 2], [0, 3]);

    if (mustWin) {
        const winningSplits = splits.filter(s => s.includes(winningNumber));
        if (winningSplits.length === 0) return null;
        const chosen = randomChoice(winningSplits);
        return { type: 'split', numbers: chosen, position: chosen.join('-') };
    } else {
        const losingSplits = splits.filter(s => !s.includes(winningNumber));
        const chosen = randomChoice(losingSplits);
        return { type: 'split', numbers: chosen, position: chosen.join('-') };
    }
}

/**
 * Generate a corner bet
 */
function generateCorner(winningNumber, mustWin) {
    const corners = [];

    // Generate all valid corners
    for (let col = 0; col < 11; col++) {
        for (let row = 0; row < 2; row++) {
            const base = col * 3 + row + 1;
            corners.push([base, base + 1, base + 3, base + 4]);
        }
    }

    if (mustWin) {
        const winningCorners = corners.filter(c => c.includes(winningNumber));
        if (winningCorners.length === 0) return null;
        const chosen = randomChoice(winningCorners);
        return { type: 'corner', numbers: chosen, position: chosen.join('-') };
    } else {
        const losingCorners = corners.filter(c => !c.includes(winningNumber));
        const chosen = randomChoice(losingCorners);
        return { type: 'corner', numbers: chosen, position: chosen.join('-') };
    }
}

/**
 * Generate a street bet
 */
function generateStreet(winningNumber, mustWin) {
    const streets = [];
    for (let i = 0; i < 12; i++) {
        streets.push([i * 3 + 1, i * 3 + 2, i * 3 + 3]);
    }

    if (mustWin) {
        const winningStreets = streets.filter(s => s.includes(winningNumber));
        if (winningStreets.length === 0) return null;
        const chosen = randomChoice(winningStreets);
        return { type: 'street', numbers: chosen, position: `${chosen[0]}-${chosen[2]}` };
    } else {
        const losingStreets = streets.filter(s => !s.includes(winningNumber));
        const chosen = randomChoice(losingStreets);
        return { type: 'street', numbers: chosen, position: `${chosen[0]}-${chosen[2]}` };
    }
}

/**
 * Generate a line (sixline) bet
 */
function generateLine(winningNumber, mustWin) {
    const lines = [];
    for (let i = 0; i < 11; i++) {
        const start = i * 3 + 1;
        lines.push([start, start + 1, start + 2, start + 3, start + 4, start + 5]);
    }

    if (mustWin) {
        const winningLines = lines.filter(l => l.includes(winningNumber));
        if (winningLines.length === 0) return null;
        const chosen = randomChoice(winningLines);
        return { type: 'line', numbers: chosen, position: `${chosen[0]}-${chosen[5]}` };
    } else {
        const losingLines = lines.filter(l => !l.includes(winningNumber));
        const chosen = randomChoice(losingLines);
        return { type: 'line', numbers: chosen, position: `${chosen[0]}-${chosen[5]}` };
    }
}

/**
 * Generate a column bet
 */
function generateColumn(winningNumber, mustWin) {
    const winningCol = winningNumber > 0 ? ((winningNumber - 1) % 3) + 1 : null;

    if (mustWin) {
        if (winningCol === null) return null;
        return { type: 'column', numbers: COLUMNS[winningCol], position: winningCol };
    } else {
        const losingCols = [1, 2, 3].filter(c => c !== winningCol);
        const col = randomChoice(losingCols);
        return { type: 'column', numbers: COLUMNS[col], position: col };
    }
}

/**
 * Generate a dozen bet
 */
function generateDozen(winningNumber, mustWin) {
    let winningDoz = null;
    if (winningNumber >= 1 && winningNumber <= 12) winningDoz = 1;
    else if (winningNumber >= 13 && winningNumber <= 24) winningDoz = 2;
    else if (winningNumber >= 25 && winningNumber <= 36) winningDoz = 3;

    if (mustWin) {
        if (winningDoz === null) return null;
        return { type: 'dozen', numbers: DOZENS[winningDoz], position: winningDoz };
    } else {
        const losingDozs = [1, 2, 3].filter(d => d !== winningDoz);
        const doz = randomChoice(losingDozs);
        return { type: 'dozen', numbers: DOZENS[doz], position: doz };
    }
}

/**
 * Generate an easy question (1-2 simple bets, max 10 chips)
 * @returns {object} Question with bets and correct answers
 */
function generateEasyQuestion() {
    // Pick a winning number (1-36, avoid 0 for easier calculations)
    const winningNumber = randomInt(1, 36);

    const bets = [];
    const numBets = randomInt(1, 2);
    const usedTypes = new Set();

    // Easy mode uses simple inside bets and 2:1 outside bets
    const easyBetTypes = ['column', 'corner', 'split'];

    for (let i = 0; i < numBets; i++) {
        let attempts = 0;
        let bet = null;

        while (attempts < 20 && !bet) {
            const availableTypes = easyBetTypes.filter(t => !usedTypes.has(t));
            if (availableTypes.length === 0) break;

            const betType = randomChoice(availableTypes);
            bet = generateBetNumbers(betType, winningNumber, true);

            if (bet) {
                usedTypes.add(betType);
                // Easy mode: 1-10 chips
                bet.chips = randomInt(1, 10);
                bet.amount = bet.chips;
                bets.push(bet);
            }
            attempts++;
        }
    }

    // Calculate correct answers
    const { outsidePayout, insidePayout } = calculateTotalPayouts(bets, winningNumber);

    return {
        winningNumber,
        bets,
        correctOutside: outsidePayout,
        correctInside: insidePayout,
        showNotes: true,
        difficulty: 'easy'
    };
}

/**
 * Generate a medium question (3-6 bets including losers, 10-100 chips)
 * @returns {object} Question with bets and correct answers
 */
function generateMediumQuestion() {
    // Pick a winning number
    const winningNumber = randomInt(1, 36);

    const bets = [];
    const numWinningBets = randomInt(2, 4);
    const numLosingBets = randomInt(1, 2);
    const usedTypes = new Set();
    const usedPositions = new Set();

    // Medium mode bet types
    const mediumBetTypes = ['straight', 'split', 'corner', 'street', 'line', 'column', 'dozen', 'red', 'black', 'even', 'odd', 'low', 'high'];

    // Generate winning bets
    for (let i = 0; i < numWinningBets; i++) {
        let attempts = 0;
        let bet = null;

        while (attempts < 30 && !bet) {
            const availableTypes = mediumBetTypes.filter(t => !usedTypes.has(t));
            if (availableTypes.length === 0) break;

            const betType = randomChoice(availableTypes);
            bet = generateBetNumbers(betType, winningNumber, true);

            if (bet && !usedPositions.has(bet.position)) {
                usedTypes.add(betType);
                usedPositions.add(bet.position);
                // Medium mode: 10-100 chips
                bet.chips = randomInt(1, 10) * 10;
                bet.amount = bet.chips;
                bets.push(bet);
            } else {
                bet = null;
            }
            attempts++;
        }
    }

    // Generate losing bets (distractors)
    for (let i = 0; i < numLosingBets; i++) {
        let attempts = 0;
        let bet = null;

        while (attempts < 30 && !bet) {
            const betType = randomChoice(mediumBetTypes);
            bet = generateBetNumbers(betType, winningNumber, false);

            if (bet && !usedPositions.has(bet.position)) {
                usedPositions.add(bet.position);
                // Medium mode: 10-100 chips
                bet.chips = randomInt(1, 10) * 10;
                bet.amount = bet.chips;
                bet.isLoser = true;
                bets.push(bet);
            } else {
                bet = null;
            }
            attempts++;
        }
    }

    // Shuffle bets so losers aren't always at the end
    shuffleArray(bets);

    // Calculate correct answers
    const { outsidePayout, insidePayout } = calculateTotalPayouts(bets, winningNumber);

    return {
        winningNumber,
        bets,
        correctOutside: outsidePayout,
        correctInside: insidePayout,
        showNotes: true,
        difficulty: 'medium'
    };
}

/**
 * Generate a hard question (includes call bets)
 * @returns {object} Question with bets and correct answers
 */
function generateHardQuestion() {
    // Pick a winning number
    const winningNumber = randomInt(0, 36);

    const bets = [];
    const usedPositions = new Set();

    // Decide whether to include call bets (70% chance)
    const includeCallBet = Math.random() < 0.7;

    if (includeCallBet) {
        // Pick a call bet type
        const callBetType = randomChoice(CALL_BET_TYPES);
        let callBetOptions = {};

        if (callBetType === 'neighbours') {
            // For neighbours, pick a center number close to winning number for better chance of winning
            const centerNumber = winningNumber;
            callBetOptions = { centerNumber, range: 2 };
        }

        // Get base chips and multiply by random factor to get total amount
        const baseChips = getCallBetBaseChips(callBetType, callBetOptions);
        const multiplier = randomInt(5, 50);
        const totalAmount = baseChips * multiplier;

        // Expand call bet into individual bets
        const expandedBets = expandCallBet(callBetType, totalAmount, callBetOptions);

        // Add call bet indicator
        for (const bet of expandedBets) {
            bet.callBetType = callBetType;
            bet.callBetTotal = totalAmount;
            bets.push(bet);
        }
    }

    // Add some regular bets (2-4)
    const numRegularBets = randomInt(2, 4);
    const regularBetTypes = ['straight', 'split', 'corner', 'street', 'line', 'column', 'dozen', 'red', 'black'];
    const usedTypes = new Set();

    for (let i = 0; i < numRegularBets; i++) {
        let attempts = 0;
        let bet = null;

        while (attempts < 30 && !bet) {
            const availableTypes = regularBetTypes.filter(t => !usedTypes.has(t));
            if (availableTypes.length === 0) break;

            const betType = randomChoice(availableTypes);
            // 70% chance of winning bet
            const mustWin = Math.random() < 0.7;
            bet = generateBetNumbers(betType, winningNumber, mustWin);

            if (bet && !usedPositions.has(bet.position)) {
                usedTypes.add(betType);
                usedPositions.add(bet.position);
                // Hard mode: various chip amounts
                bet.chips = randomInt(1, 20) * 10;
                bet.amount = bet.chips;
                bet.isLoser = !mustWin;
                bets.push(bet);
            } else {
                bet = null;
            }
            attempts++;
        }
    }

    // Shuffle bets
    shuffleArray(bets);

    // Calculate correct answers
    const { outsidePayout, insidePayout } = calculateTotalPayouts(bets, winningNumber);

    return {
        winningNumber,
        bets,
        correctOutside: outsidePayout,
        correctInside: insidePayout,
        showNotes: false,
        difficulty: 'hard'
    };
}

/**
 * Generate exam questions with progressive difficulty
 * @param {number} count - Total number of questions (default 50)
 * @returns {array} Array of questions
 */
function generateExamQuestions(count = 50) {
    const questions = [];

    // Distribution: 15 easy, 20 medium, 15 hard
    const easyCount = Math.floor(count * 0.3);
    const mediumCount = Math.floor(count * 0.4);
    const hardCount = count - easyCount - mediumCount;

    // Generate easy questions first
    for (let i = 0; i < easyCount; i++) {
        const q = generateEasyQuestion();
        q.showNotes = false; // No notes in exam mode
        q.questionNumber = i + 1;
        questions.push(q);
    }

    // Then medium
    for (let i = 0; i < mediumCount; i++) {
        const q = generateMediumQuestion();
        q.showNotes = false;
        q.questionNumber = easyCount + i + 1;
        questions.push(q);
    }

    // Then hard
    for (let i = 0; i < hardCount; i++) {
        const q = generateHardQuestion();
        q.questionNumber = easyCount + mediumCount + i + 1;
        questions.push(q);
    }

    return questions;
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export {
    generateEasyQuestion,
    generateMediumQuestion,
    generateHardQuestion,
    generateExamQuestions,
    generateBetNumbers
};
