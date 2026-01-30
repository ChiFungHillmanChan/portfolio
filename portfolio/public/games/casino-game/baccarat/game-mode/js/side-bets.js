// =====================================================
// BACCARAT GAME MODE - SIDE BETS EVALUATION
// =====================================================

/**
 * Evaluate all side bets for a completed hand
 * @param {Object} handResult - Complete hand result with cards and totals
 * @returns {Object} Results for all side bets
 */
function evaluateAllSideBets(handResult) {
    return {
        playerPair: evaluatePairBet(handResult.playerCards),
        bankerPair: evaluatePairBet(handResult.bankerCards),
        dragonPlayer: evaluateDragonBonus(handResult, 'player'),
        dragonBanker: evaluateDragonBonus(handResult, 'banker'),
        egalite: evaluateEgalite(handResult)
    };
}

// =====================================================
// PAIR BET EVALUATION
// =====================================================

/**
 * Evaluate if first two cards form a pair
 * @param {Array} cards - Array of card objects [{rank, suit}, ...]
 * @returns {Object} {win: boolean, payout: number, description: string}
 */
function evaluatePairBet(cards) {
    if (!cards || cards.length < 2) {
        return { win: false, payout: 0, description: null };
    }

    const card1 = cards[0];
    const card2 = cards[1];

    // Check if same rank (pair)
    if (card1.rank === card2.rank) {
        return {
            win: true,
            payout: PAIR_BET_PAYOUTS.playerPair, // 11:1
            description: `Pair of ${CARD_LABELS[card1.rank]}s`
        };
    }

    return { win: false, payout: 0, description: null };
}

// =====================================================
// DRAGON BONUS EVALUATION
// =====================================================

/**
 * Evaluate Dragon Bonus bet
 * Dragon Bonus wins if:
 * - The chosen side wins with a natural (8 or 9 with 2 cards)
 * - The chosen side wins by 4+ points margin
 * 
 * @param {Object} handResult - Complete hand result
 * @param {string} side - 'player' or 'banker'
 * @returns {Object} {win: boolean, payout: number, description: string, type: string}
 */
function evaluateDragonBonus(handResult, side) {
    const { winner, playerTotal, bankerTotal, playerCards, bankerCards } = handResult;

    // Dragon Bonus only wins if the chosen side wins
    if (winner !== side) {
        // Special case: Dragon Bonus pushes on a tie (some casinos)
        // Here we treat tie as a loss for Dragon Bonus
        return { win: false, payout: 0, description: null, type: null };
    }

    const winningTotal = side === 'player' ? playerTotal : bankerTotal;
    const losingTotal = side === 'player' ? bankerTotal : playerTotal;
    const winningCards = side === 'player' ? playerCards : bankerCards;
    const margin = winningTotal - losingTotal;

    // Check for natural win (8 or 9 with only 2 cards)
    const isNatural = winningCards.length === 2 && (winningTotal === 8 || winningTotal === 9);

    if (isNatural) {
        return {
            win: true,
            payout: DRAGON_BONUS_PAYOUTS.natural, // 1:1
            description: `Natural ${winningTotal}`,
            type: 'natural'
        };
    }

    // Check winning margin
    if (margin >= 9) {
        return {
            win: true,
            payout: DRAGON_BONUS_PAYOUTS.margin9, // 30:1
            description: `Win by 9`,
            type: 'margin9'
        };
    }
    if (margin === 8) {
        return {
            win: true,
            payout: DRAGON_BONUS_PAYOUTS.margin8, // 10:1
            description: `Win by 8`,
            type: 'margin8'
        };
    }
    if (margin === 7) {
        return {
            win: true,
            payout: DRAGON_BONUS_PAYOUTS.margin7, // 6:1
            description: `Win by 7`,
            type: 'margin7'
        };
    }
    if (margin === 6) {
        return {
            win: true,
            payout: DRAGON_BONUS_PAYOUTS.margin6, // 4:1
            description: `Win by 6`,
            type: 'margin6'
        };
    }
    if (margin === 5) {
        return {
            win: true,
            payout: DRAGON_BONUS_PAYOUTS.margin5, // 2:1
            description: `Win by 5`,
            type: 'margin5'
        };
    }
    if (margin === 4) {
        return {
            win: true,
            payout: DRAGON_BONUS_PAYOUTS.margin4, // 1:1
            description: `Win by 4`,
            type: 'margin4'
        };
    }

    // Win by 0-3 (non-natural): Dragon Bonus loses
    return { win: false, payout: 0, description: null, type: null };
}

// =====================================================
// EGALITÉ (TIE 0-9) EVALUATION
// =====================================================

/**
 * Evaluate Egalité bets (specific tie values 0-9)
 * @param {Object} handResult - Complete hand result
 * @returns {Object} Results for each tie value {0: {win, payout}, 1: {...}, ...}
 */
function evaluateEgalite(handResult) {
    const { winner, playerTotal } = handResult;
    const results = {};

    // Egalité only wins on a tie
    const isTie = winner === 'tie';

    for (let i = 0; i <= 9; i++) {
        if (isTie && playerTotal === i) {
            results[i] = {
                win: true,
                payout: EGALITE_PAYOUTS[i],
                description: `Tie ${i}`
            };
        } else {
            results[i] = {
                win: false,
                payout: 0,
                description: null
            };
        }
    }

    return results;
}

/**
 * Get the payout for a specific egalité value
 * @param {number} tieValue - The tie value (0-9)
 * @returns {number} The payout multiplier
 */
function getEgalitePayout(tieValue) {
    return EGALITE_PAYOUTS[tieValue] || 0;
}

// =====================================================
// MAIN BET EVALUATION
// =====================================================

/**
 * Evaluate main bets (Player, Banker, Tie)
 * @param {Object} handResult - Complete hand result
 * @returns {Object} Results for main bets
 */
function evaluateMainBets(handResult) {
    const { winner } = handResult;

    return {
        player: {
            win: winner === 'player',
            payout: winner === 'player' ? MAIN_BET_PAYOUTS.player : 0,
            description: winner === 'player' ? 'Player Wins' : null
        },
        banker: {
            win: winner === 'banker',
            payout: winner === 'banker' ? MAIN_BET_PAYOUTS.banker : 0,
            description: winner === 'banker' ? 'Banker Wins' : null
        },
        tie: {
            win: winner === 'tie',
            payout: winner === 'tie' ? MAIN_BET_PAYOUTS.tie : 0,
            description: winner === 'tie' ? 'Tie' : null
        }
    };
}

// =====================================================
// WINNINGS CALCULATOR
// =====================================================

/**
 * Calculate total winnings for all placed bets
 * @param {Object} placedBets - Object with bet amounts keyed by bet type
 * @param {Object} handResult - Complete hand result
 * @returns {Object} {totalWin, totalLoss, netResult, details}
 */
function calculateWinnings(placedBets, handResult) {
    const mainResults = evaluateMainBets(handResult);
    const sideResults = evaluateAllSideBets(handResult);

    let totalWin = 0;
    let totalLoss = 0;
    const details = [];

    // Process main bets
    for (const betType of MAIN_BETS) {
        const amount = placedBets[betType] || 0;
        if (amount > 0) {
            const result = mainResults[betType];
            if (result.win) {
                const winAmount = amount * result.payout;
                totalWin += winAmount + amount; // Return original bet + winnings
                details.push({
                    type: betType,
                    amount,
                    win: true,
                    payout: result.payout,
                    winAmount: winAmount + amount,
                    description: result.description
                });
            } else if (handResult.winner === 'tie' && (betType === 'player' || betType === 'banker')) {
                // Main bets push on tie
                totalWin += amount;
                details.push({
                    type: betType,
                    amount,
                    win: false,
                    push: true,
                    payout: 0,
                    winAmount: amount,
                    description: 'Push (Tie)'
                });
            } else {
                totalLoss += amount;
                details.push({
                    type: betType,
                    amount,
                    win: false,
                    payout: 0,
                    winAmount: 0,
                    description: 'Lost'
                });
            }
        }
    }

    // Process pair bets
    for (const betType of PAIR_BETS) {
        const amount = placedBets[betType] || 0;
        if (amount > 0) {
            const result = betType === BET_TYPES.PLAYER_PAIR 
                ? sideResults.playerPair 
                : sideResults.bankerPair;
            if (result.win) {
                const winAmount = amount * result.payout;
                totalWin += winAmount + amount;
                details.push({
                    type: betType,
                    amount,
                    win: true,
                    payout: result.payout,
                    winAmount: winAmount + amount,
                    description: result.description
                });
            } else {
                totalLoss += amount;
                details.push({
                    type: betType,
                    amount,
                    win: false,
                    payout: 0,
                    winAmount: 0,
                    description: 'Lost'
                });
            }
        }
    }

    // Process dragon bonus bets
    for (const betType of DRAGON_BETS) {
        const amount = placedBets[betType] || 0;
        if (amount > 0) {
            const result = betType === BET_TYPES.DRAGON_PLAYER 
                ? sideResults.dragonPlayer 
                : sideResults.dragonBanker;
            if (result.win) {
                const winAmount = amount * result.payout;
                totalWin += winAmount + amount;
                details.push({
                    type: betType,
                    amount,
                    win: true,
                    payout: result.payout,
                    winAmount: winAmount + amount,
                    description: result.description
                });
            } else {
                totalLoss += amount;
                details.push({
                    type: betType,
                    amount,
                    win: false,
                    payout: 0,
                    winAmount: 0,
                    description: 'Lost'
                });
            }
        }
    }

    // Process egalité bets
    for (let i = 0; i <= 9; i++) {
        const betType = `egalite${i}`;
        const amount = placedBets[betType] || 0;
        if (amount > 0) {
            const result = sideResults.egalite[i];
            if (result.win) {
                const winAmount = amount * result.payout;
                totalWin += winAmount + amount;
                details.push({
                    type: betType,
                    amount,
                    win: true,
                    payout: result.payout,
                    winAmount: winAmount + amount,
                    description: result.description
                });
            } else {
                totalLoss += amount;
                details.push({
                    type: betType,
                    amount,
                    win: false,
                    payout: 0,
                    winAmount: 0,
                    description: 'Lost'
                });
            }
        }
    }

    return {
        totalWin,
        totalLoss,
        netResult: totalWin - totalLoss,
        details
    };
}
