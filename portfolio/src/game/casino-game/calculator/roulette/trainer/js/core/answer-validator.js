// =====================================================
// ANSWER VALIDATOR - Validate user answers and generate breakdowns
// =====================================================

import { calculateBetPayout, isOutsideBet, getPayoutRatio, formatBetDescription } from './payout-calculator.js';

/**
 * Validate user's answer against correct values
 * @param {number} userOutside - User's outside bet answer
 * @param {number} userInside - User's inside bet answer
 * @param {object} correct - Correct answers {correctOutside, correctInside}
 * @returns {object} Validation result
 */
function validateAnswer(userOutside, userInside, correct) {
    const outsideCorrect = userOutside === correct.correctOutside;
    const insideCorrect = userInside === correct.correctInside;

    return {
        outsideCorrect,
        insideCorrect,
        allCorrect: outsideCorrect && insideCorrect,
        userOutside,
        userInside,
        correctOutside: correct.correctOutside,
        correctInside: correct.correctInside
    };
}

/**
 * Generate detailed error breakdown for a question
 * @param {object} question - The question object
 * @param {object} userAnswer - User's answer {outside, inside}
 * @returns {object} Detailed breakdown of calculations
 */
function generateErrorBreakdown(question, userAnswer) {
    const { winningNumber, bets } = question;
    const breakdown = {
        winningNumber,
        outsideBets: [],
        insideBets: [],
        outsideTotal: 0,
        insideTotal: 0,
        userOutside: userAnswer.outside,
        userInside: userAnswer.inside,
        outsideError: false,
        insideError: false
    };

    // Categorize and calculate each bet
    for (const bet of bets) {
        const payout = calculateBetPayout(bet, winningNumber);
        const ratio = getPayoutRatio(bet.type);
        const amount = bet.amount ?? bet.chips ?? 0;

        const betInfo = {
            description: formatBetDescription(bet),
            type: bet.type,
            numbers: bet.numbers,
            position: bet.position,
            amount,
            ratio,
            wins: payout > 0,
            payout,
            calculation: payout > 0 ? `${amount} x ${ratio} = ${payout}` : 'Loses'
        };

        // Add call bet info if present
        if (bet.callBetType) {
            betInfo.callBetType = bet.callBetType;
            betInfo.callBetTotal = bet.callBetTotal;
        }

        if (isOutsideBet(bet.type)) {
            breakdown.outsideBets.push(betInfo);
            breakdown.outsideTotal += payout;
        } else {
            breakdown.insideBets.push(betInfo);
            breakdown.insideTotal += payout;
        }
    }

    // Check for errors
    breakdown.outsideError = userAnswer.outside !== breakdown.outsideTotal;
    breakdown.insideError = userAnswer.inside !== breakdown.insideTotal;

    return breakdown;
}

/**
 * Generate a summary of session performance
 * @param {array} answers - Array of answer results
 * @returns {object} Performance summary
 */
function generateSessionSummary(answers) {
    const total = answers.length;
    let outsideCorrect = 0;
    let insideCorrect = 0;
    let allCorrect = 0;

    // Track errors by bet type
    const errorsByType = {};
    const totalByType = {};

    for (const answer of answers) {
        if (answer.validation.outsideCorrect) outsideCorrect++;
        if (answer.validation.insideCorrect) insideCorrect++;
        if (answer.validation.allCorrect) allCorrect++;

        // Track bet type performance
        if (answer.question && answer.question.bets) {
            for (const bet of answer.question.bets) {
                const type = bet.type;
                totalByType[type] = (totalByType[type] || 0) + 1;

                // If this bet contributed to an error
                const payout = calculateBetPayout(bet, answer.question.winningNumber);
                const isOutside = isOutsideBet(type);

                if ((isOutside && !answer.validation.outsideCorrect) ||
                    (!isOutside && !answer.validation.insideCorrect)) {
                    errorsByType[type] = (errorsByType[type] || 0) + 1;
                }
            }
        }
    }

    // Calculate accuracy rates
    const betTypeAccuracy = {};
    for (const type of Object.keys(totalByType)) {
        const errors = errorsByType[type] || 0;
        const total = totalByType[type];
        betTypeAccuracy[type] = {
            total,
            errors,
            accuracy: ((total - errors) / total * 100).toFixed(1)
        };
    }

    return {
        total,
        outsideCorrect,
        insideCorrect,
        allCorrect,
        outsideAccuracy: (outsideCorrect / total * 100).toFixed(1),
        insideAccuracy: (insideCorrect / total * 100).toFixed(1),
        overallAccuracy: (allCorrect / total * 100).toFixed(1),
        betTypeAccuracy,
        passed: (allCorrect / total) >= 0.8 // 80% pass threshold
    };
}

/**
 * Format time in seconds to MM:SS or HH:MM:SS
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate average time per question
 * @param {number} totalTime - Total time in seconds
 * @param {number} questionCount - Number of questions
 * @returns {string} Formatted average time
 */
function calculateAverageTime(totalTime, questionCount) {
    if (questionCount === 0) return '0:00';
    const avgSeconds = totalTime / questionCount;
    return formatTime(avgSeconds);
}

export {
    validateAnswer,
    generateErrorBreakdown,
    generateSessionSummary,
    formatTime,
    calculateAverageTime
};
