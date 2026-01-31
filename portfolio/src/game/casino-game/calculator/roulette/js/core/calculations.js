// =====================================================
// ROULETTE CALCULATIONS - Pure functions, no DOM dependencies
// =====================================================

/**
 * Get the color of a number
 * @param {number|string} num - The number to check
 * @returns {string} 'red', 'black', or 'green'
 */
function getNumberColor(num) {
    if (num === 0 || num === '00') return 'green';
    if (RED_NUMBERS.has(num)) return 'red';
    return 'black';
}

/**
 * Check if a number is even (excluding 0 and 00)
 * @param {number|string} num - The number to check
 * @returns {boolean}
 */
function isEven(num) {
    if (num === 0 || num === '00') return false;
    return num % 2 === 0;
}

/**
 * Check if a number is odd
 * @param {number|string} num - The number to check
 * @returns {boolean}
 */
function isOdd(num) {
    if (num === 0 || num === '00') return false;
    return num % 2 === 1;
}

/**
 * Check if a number is in the low range (1-18)
 * @param {number|string} num - The number to check
 * @returns {boolean}
 */
function isLow(num) {
    if (num === 0 || num === '00') return false;
    return num >= 1 && num <= 18;
}

/**
 * Check if a number is in the high range (19-36)
 * @param {number|string} num - The number to check
 * @returns {boolean}
 */
function isHigh(num) {
    if (num === 0 || num === '00') return false;
    return num >= 19 && num <= 36;
}

/**
 * Get the column number (1, 2, or 3) for a given number
 * @param {number|string} num - The number to check
 * @returns {number|null} Column number or null for zeros
 */
function getColumn(num) {
    if (num === 0 || num === '00') return null;
    const remainder = num % 3;
    if (remainder === 1) return 1;
    if (remainder === 2) return 2;
    return 3; // remainder === 0
}

/**
 * Get the dozen (1, 2, or 3) for a given number
 * @param {number|string} num - The number to check
 * @returns {number|null} Dozen number or null for zeros
 */
function getDozen(num) {
    if (num === 0 || num === '00') return null;
    if (num >= 1 && num <= 12) return 1;
    if (num >= 13 && num <= 24) return 2;
    return 3;
}

/**
 * Calculate probability of winning a bet
 * @param {number} winningPockets - Number of pockets that win
 * @param {number} totalPockets - Total pockets (37 EU, 38 US)
 * @returns {number} Probability between 0 and 1
 */
function calculateProbability(winningPockets, totalPockets) {
    return winningPockets / totalPockets;
}

/**
 * Calculate expected value for a bet
 * Formula: EV = (Payout × P(Win)) + (-Bet × P(Loss))
 * @param {number} payout - Payout ratio (e.g., 35 for straight)
 * @param {number} winningPockets - Number of winning pockets
 * @param {number} totalPockets - Total pockets on wheel
 * @returns {number} Expected value per unit bet (negative = house edge)
 */
function calculateExpectedValue(payout, winningPockets, totalPockets) {
    const pWin = winningPockets / totalPockets;
    const pLose = 1 - pWin;
    return (payout * pWin) - (1 * pLose);
}

/**
 * Calculate winnings for a winning bet (includes original bet return)
 * @param {number} betAmount - Amount wagered
 * @param {number} payoutRatio - Payout ratio (e.g., 35 for straight)
 * @returns {number} Total return (original bet + winnings)
 */
function calculateWinnings(betAmount, payoutRatio) {
    return betAmount + (betAmount * payoutRatio);
}

/**
 * Calculate just the profit from a winning bet
 * @param {number} betAmount - Amount wagered
 * @param {number} payoutRatio - Payout ratio
 * @returns {number} Profit only (not including original bet)
 */
function calculateProfit(betAmount, payoutRatio) {
    return betAmount * payoutRatio;
}

/**
 * Check if a bet wins for a given result
 * @param {number|string} result - The winning number
 * @param {string} betType - Type of bet (from BET_TYPES)
 * @param {*} betValue - The specific bet value (number, array, etc.)
 * @param {string} rouletteType - 'european' or 'american'
 * @returns {boolean} Whether the bet wins
 */
function isBetWinner(result, betType, betValue, rouletteType) {
    // Straight up - single number
    if (betType === BET_TYPES.STRAIGHT) {
        return result === betValue || result === parseInt(betValue);
    }
    
    // Split - two adjacent numbers
    if (betType === BET_TYPES.SPLIT) {
        const numbers = betValue.split('-').map(n => n === '00' ? '00' : parseInt(n));
        return numbers.includes(result) || numbers.includes(result.toString());
    }
    
    // Street - three numbers in a row
    if (betType === BET_TYPES.STREET) {
        const numbers = betValue.split('-').map(n => parseInt(n));
        return numbers.includes(result);
    }
    
    // Trio - three numbers including zero (0-1-2 or 0-2-3), pays 11:1
    if (betType === BET_TYPES.TRIO) {
        const numbers = betValue.split('-').map(n => parseInt(n));
        return numbers.includes(result);
    }
    
    // Corner - four numbers in a square
    if (betType === BET_TYPES.CORNER) {
        const numbers = betValue.split('-').map(n => parseInt(n));
        return numbers.includes(result);
    }
    
    // First Four (European only)
    if (betType === BET_TYPES.FIRST_FOUR) {
        return FIRST_FOUR.includes(result);
    }
    
    // Top Line (American only)
    if (betType === BET_TYPES.TOP_LINE) {
        return TOP_LINE.includes(result) || TOP_LINE.includes(result.toString());
    }
    
    // Line - six numbers (double street)
    if (betType === BET_TYPES.LINE) {
        const numbers = betValue.split('-').map(n => parseInt(n));
        return numbers.includes(result);
    }
    
    // Column bet
    if (betType === BET_TYPES.COLUMN) {
        return getColumn(result) === parseInt(betValue);
    }
    
    // Dozen bet
    if (betType === BET_TYPES.DOZEN) {
        return getDozen(result) === parseInt(betValue);
    }
    
    // Even money bets
    if (betType === BET_TYPES.RED) return RED_NUMBERS.has(result);
    if (betType === BET_TYPES.BLACK) return BLACK_NUMBERS.has(result);
    if (betType === BET_TYPES.EVEN) return isEven(result);
    if (betType === BET_TYPES.ODD) return isOdd(result);
    if (betType === BET_TYPES.LOW) return isLow(result);
    if (betType === BET_TYPES.HIGH) return isHigh(result);
    
    return false;
}

/**
 * Get the payout ratio for a bet type
 * @param {string} betType - Type of bet
 * @returns {number} Payout ratio
 */
function getPayoutForBet(betType) {
    switch (betType) {
        case BET_TYPES.STRAIGHT:
            return PAYOUTS.straight;
        case BET_TYPES.SPLIT:
            return PAYOUTS.split;
        case BET_TYPES.STREET:
            return PAYOUTS.street;
        case BET_TYPES.TRIO:
            return PAYOUTS.trio;  // 11:1, same as street
        case BET_TYPES.CORNER:
            return PAYOUTS.corner;
        case BET_TYPES.FIRST_FOUR:
            return PAYOUTS.firstFour;
        case BET_TYPES.TOP_LINE:
            return PAYOUTS.topLine;
        case BET_TYPES.LINE:
            return PAYOUTS.line;
        case BET_TYPES.COLUMN:
        case BET_TYPES.DOZEN:
            return PAYOUTS.column;
        case BET_TYPES.RED:
        case BET_TYPES.BLACK:
        case BET_TYPES.EVEN:
        case BET_TYPES.ODD:
        case BET_TYPES.LOW:
        case BET_TYPES.HIGH:
            return PAYOUTS.evenMoney;
        default:
            return 0;
    }
}

/**
 * Check if a bet type is an even money bet
 * @param {string} betType - The bet type
 * @returns {boolean}
 */
function isEvenMoneyBet(betType) {
    return [
        BET_TYPES.RED,
        BET_TYPES.BLACK,
        BET_TYPES.EVEN,
        BET_TYPES.ODD,
        BET_TYPES.LOW,
        BET_TYPES.HIGH
    ].includes(betType);
}

/**
 * Resolve all bets for a spin result
 * Implements La Partage rule: when zero comes, even money bets return half
 * @param {number|string} result - The winning number
 * @param {object} placedBets - All placed bets object
 * @param {string} rouletteType - 'european' or 'american'
 * @returns {object} Resolution with winning bets and totals
 */
function resolveAllBets(result, placedBets, rouletteType) {
    const winningBets = [];
    const laPartageBets = []; // Bets that get half back due to zero
    let totalWinnings = 0;
    let totalWagered = 0;

    // Check if result is zero (La Partage rule applies)
    const isZeroResult = result === 0 || result === '0' || result === '00';

    // Process each bet category
    for (const [betType, bets] of Object.entries(placedBets)) {
        if (typeof bets === 'object' && bets !== null && !Array.isArray(bets)) {
            // Object-based bets (straight, split, street, corner, line, column, dozen)
            for (const [betValue, amount] of Object.entries(bets)) {
                if (amount > 0) {
                    totalWagered += amount;
                    if (isBetWinner(result, betType, betValue, rouletteType)) {
                        const payout = getPayoutForBet(betType);
                        const winAmount = calculateWinnings(amount, payout);
                        totalWinnings += winAmount;
                        winningBets.push({
                            type: betType,
                            value: betValue,
                            amount: amount,
                            payout: payout,
                            winnings: winAmount
                        });
                    }
                }
            }
        } else if (typeof bets === 'number' && bets > 0) {
            // Simple bets (red, black, even, odd, low, high)
            totalWagered += bets;

            if (isBetWinner(result, betType, null, rouletteType)) {
                // Normal win
                const payout = getPayoutForBet(betType);
                const winAmount = calculateWinnings(bets, payout);
                totalWinnings += winAmount;
                winningBets.push({
                    type: betType,
                    value: null,
                    amount: bets,
                    payout: payout,
                    winnings: winAmount
                });
            } else if (isZeroResult && isEvenMoneyBet(betType)) {
                // La Partage rule: return half the bet when zero comes
                const laPartageReturn = Math.floor(bets * 0.5);
                totalWinnings += laPartageReturn;
                laPartageBets.push({
                    type: betType,
                    value: null,
                    amount: bets,
                    payout: 0.5,
                    winnings: laPartageReturn,
                    isLaPartage: true
                });
            }
        }
    }

    return {
        result: result,
        winningBets: winningBets,
        laPartageBets: laPartageBets,
        totalWinnings: totalWinnings,
        totalWagered: totalWagered,
        netResult: totalWinnings - totalWagered
    };
}

/**
 * Calculate total amount wagered from placed bets
 * @param {object} placedBets - All placed bets
 * @returns {number} Total wagered
 */
function calculateTotalWagered(placedBets) {
    let total = 0;
    
    for (const [betType, bets] of Object.entries(placedBets)) {
        if (typeof bets === 'object' && bets !== null && !Array.isArray(bets)) {
            for (const amount of Object.values(bets)) {
                total += amount;
            }
        } else if (typeof bets === 'number') {
            total += bets;
        }
    }
    
    return total;
}

/**
 * Validate if a bet amount is within table limits
 * @param {number} amount - Bet amount
 * @param {number} minBet - Minimum allowed bet
 * @param {number} maxBet - Maximum allowed bet
 * @returns {object} Validation result
 */
function validateBetAmount(amount, minBet, maxBet) {
    if (amount < minBet) {
        return { valid: false, error: `Minimum bet is ${minBet}` };
    }
    if (amount > maxBet) {
        return { valid: false, error: `Maximum bet is ${maxBet}` };
    }
    return { valid: true };
}

/**
 * Check if player can afford a bet
 * @param {number} betAmount - Amount to bet
 * @param {number} currentStack - Player's current stack
 * @param {number} alreadyWagered - Amount already wagered this round
 * @returns {boolean}
 */
function canAffordBet(betAmount, currentStack, alreadyWagered) {
    return (alreadyWagered + betAmount) <= currentStack;
}
