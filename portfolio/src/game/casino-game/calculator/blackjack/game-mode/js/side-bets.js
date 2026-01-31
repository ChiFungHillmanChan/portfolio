/**
 * Side Bets Module for Blackjack Game Mode
 * Handles Perfect Pair, 21+3, and Top 3 side bet evaluations
 */

// =====================================================
// SIDE BET PAYOUT TABLES
// =====================================================

const PERFECT_PAIR_PAYOUTS = {
    PERFECT_PAIR: 25,    // Same rank + same suit
    COLORED_PAIR: 12,    // Same rank + same color (different suit)
    MIXED_PAIR: 6        // Same rank + different color
};

const TWENTY_ONE_PLUS_3_PAYOUTS = {
    SUITED_THREE_OF_KIND: 100,  // Same rank + same suit
    STRAIGHT_FLUSH: 40,          // Sequential + same suit
    THREE_OF_KIND: 30,           // Same rank, different suits
    STRAIGHT: 10,                // Sequential, any suits
    FLUSH: 5                     // Same suit, not sequential
};

const TOP_3_PAYOUTS = {
    SUITED_THREE_OF_KIND: 270,  // Same rank + same suit
    STRAIGHT_FLUSH: 180,         // Sequential + same suit
    THREE_OF_KIND: 90,           // Same rank, different suits
    STRAIGHT: 10,                // Sequential, any suits
    FLUSH: 5                     // Same suit, not sequential
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get the numeric value of a card rank for straight detection
 * @param {string} rank - Card rank (A, 2-10, J, Q, K)
 * @returns {number} Numeric value (A=1 or 14, 2-10=face value, J=11, Q=12, K=13)
 */
function getRankValue(rank) {
    if (rank === 'A') return 1; // Ace can also be 14 for high straights
    if (rank === 'J') return 11;
    if (rank === 'Q') return 12;
    if (rank === 'K') return 13;
    return parseInt(rank);
}

/**
 * Get the color of a suit
 * @param {string} suit - Card suit (spades, hearts, diamonds, clubs)
 * @returns {string} 'red' or 'black'
 */
function getSuitColor(suit) {
    return (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
}

/**
 * Check if three cards form a straight
 * @param {Array} cards - Array of card objects with {rank, suit}
 * @returns {boolean}
 */
function isStraight(cards) {
    if (cards.length !== 3) return false;
    
    const values = cards.map(c => getRankValue(c.rank)).sort((a, b) => a - b);
    
    // Check normal straight (e.g., 5-6-7)
    if (values[1] === values[0] + 1 && values[2] === values[1] + 1) {
        return true;
    }
    
    // Check Ace-high straight (Q-K-A)
    const valuesWithHighAce = cards.map(c => {
        const v = getRankValue(c.rank);
        return v === 1 ? 14 : v;
    }).sort((a, b) => a - b);
    
    if (valuesWithHighAce[1] === valuesWithHighAce[0] + 1 && 
        valuesWithHighAce[2] === valuesWithHighAce[1] + 1) {
        return true;
    }
    
    // Check wrap-around straight (K-A-2)
    const ranks = cards.map(c => c.rank);
    if (ranks.includes('K') && ranks.includes('A') && ranks.includes('2')) {
        return true;
    }
    
    return false;
}

/**
 * Check if three cards are all the same suit
 * @param {Array} cards - Array of card objects with {rank, suit}
 * @returns {boolean}
 */
function isFlush(cards) {
    if (cards.length !== 3) return false;
    const firstSuit = cards[0].suit;
    return cards.every(c => c.suit === firstSuit);
}

/**
 * Check if three cards are all the same rank
 * @param {Array} cards - Array of card objects with {rank, suit}
 * @returns {boolean}
 */
function isThreeOfAKind(cards) {
    if (cards.length !== 3) return false;
    const firstRank = cards[0].rank;
    return cards.every(c => c.rank === firstRank);
}

// =====================================================
// PERFECT PAIR EVALUATION
// =====================================================

/**
 * Evaluate Perfect Pair side bet
 * @param {Array} playerCards - Player's first two cards [{rank, suit}, {rank, suit}]
 * @returns {Object} {win: boolean, type: string|null, payout: number}
 */
function evaluatePerfectPair(playerCards) {
    if (playerCards.length < 2) {
        return { win: false, type: null, payout: 0 };
    }
    
    const card1 = playerCards[0];
    const card2 = playerCards[1];
    
    // Check if same rank
    if (card1.rank !== card2.rank) {
        return { win: false, type: null, payout: 0 };
    }
    
    // Perfect Pair - same rank AND same suit
    if (card1.suit === card2.suit) {
        return { 
            win: true, 
            type: 'PERFECT_PAIR', 
            payout: PERFECT_PAIR_PAYOUTS.PERFECT_PAIR,
            description: 'Perfect Pair'
        };
    }
    
    // Colored Pair - same rank AND same color (different suit)
    if (getSuitColor(card1.suit) === getSuitColor(card2.suit)) {
        return { 
            win: true, 
            type: 'COLORED_PAIR', 
            payout: PERFECT_PAIR_PAYOUTS.COLORED_PAIR,
            description: 'Colored Pair'
        };
    }
    
    // Mixed Pair - same rank, different color
    return { 
        win: true, 
        type: 'MIXED_PAIR', 
        payout: PERFECT_PAIR_PAYOUTS.MIXED_PAIR,
        description: 'Mixed Pair'
    };
}

// =====================================================
// 21+3 EVALUATION
// =====================================================

/**
 * Evaluate 21+3 side bet (player's first 2 cards + dealer upcard)
 * @param {Array} playerCards - Player's first two cards
 * @param {Object} dealerUpcard - Dealer's face-up card {rank, suit}
 * @returns {Object} {win: boolean, type: string|null, payout: number}
 */
function evaluate21Plus3(playerCards, dealerUpcard) {
    if (playerCards.length < 2 || !dealerUpcard) {
        return { win: false, type: null, payout: 0 };
    }
    
    const threeCards = [playerCards[0], playerCards[1], dealerUpcard];
    
    const flush = isFlush(threeCards);
    const straight = isStraight(threeCards);
    const threeOfKind = isThreeOfAKind(threeCards);
    
    // Suited Three of a Kind - same rank, same suit (only possible with multiple decks)
    if (threeOfKind && flush) {
        return {
            win: true,
            type: 'SUITED_THREE_OF_KIND',
            payout: TWENTY_ONE_PLUS_3_PAYOUTS.SUITED_THREE_OF_KIND,
            description: 'Suited Three of a Kind'
        };
    }
    
    // Straight Flush - sequential and same suit
    if (straight && flush) {
        return {
            win: true,
            type: 'STRAIGHT_FLUSH',
            payout: TWENTY_ONE_PLUS_3_PAYOUTS.STRAIGHT_FLUSH,
            description: 'Straight Flush'
        };
    }
    
    // Three of a Kind - same rank, different suits
    if (threeOfKind) {
        return {
            win: true,
            type: 'THREE_OF_KIND',
            payout: TWENTY_ONE_PLUS_3_PAYOUTS.THREE_OF_KIND,
            description: 'Three of a Kind'
        };
    }
    
    // Straight - sequential, any suits
    if (straight) {
        return {
            win: true,
            type: 'STRAIGHT',
            payout: TWENTY_ONE_PLUS_3_PAYOUTS.STRAIGHT,
            description: 'Straight'
        };
    }
    
    // Flush - same suit, not sequential
    if (flush) {
        return {
            win: true,
            type: 'FLUSH',
            payout: TWENTY_ONE_PLUS_3_PAYOUTS.FLUSH,
            description: 'Flush'
        };
    }
    
    return { win: false, type: null, payout: 0 };
}

// =====================================================
// TOP 3 EVALUATION
// =====================================================

/**
 * Evaluate Top 3 side bet (dealer's first 3 cards)
 * @param {Array} dealerCards - Dealer's cards (needs at least 3)
 * @returns {Object} {win: boolean, type: string|null, payout: number}
 */
function evaluateTop3(dealerCards) {
    if (dealerCards.length < 3) {
        return { win: false, type: null, payout: 0, pending: true };
    }
    
    const threeCards = [dealerCards[0], dealerCards[1], dealerCards[2]];
    
    const flush = isFlush(threeCards);
    const straight = isStraight(threeCards);
    const threeOfKind = isThreeOfAKind(threeCards);
    
    // Suited Three of a Kind
    if (threeOfKind && flush) {
        return {
            win: true,
            type: 'SUITED_THREE_OF_KIND',
            payout: TOP_3_PAYOUTS.SUITED_THREE_OF_KIND,
            description: 'Suited Three of a Kind'
        };
    }
    
    // Straight Flush
    if (straight && flush) {
        return {
            win: true,
            type: 'STRAIGHT_FLUSH',
            payout: TOP_3_PAYOUTS.STRAIGHT_FLUSH,
            description: 'Straight Flush'
        };
    }
    
    // Three of a Kind
    if (threeOfKind) {
        return {
            win: true,
            type: 'THREE_OF_KIND',
            payout: TOP_3_PAYOUTS.THREE_OF_KIND,
            description: 'Three of a Kind'
        };
    }
    
    // Straight
    if (straight) {
        return {
            win: true,
            type: 'STRAIGHT',
            payout: TOP_3_PAYOUTS.STRAIGHT,
            description: 'Straight'
        };
    }
    
    // Flush
    if (flush) {
        return {
            win: true,
            type: 'FLUSH',
            payout: TOP_3_PAYOUTS.FLUSH,
            description: 'Flush'
        };
    }
    
    return { win: false, type: null, payout: 0 };
}

// =====================================================
// SIDE BETS MANAGER
// =====================================================

const SideBets = {
    PERFECT_PAIR_PAYOUTS,
    TWENTY_ONE_PLUS_3_PAYOUTS,
    TOP_3_PAYOUTS,
    
    evaluatePerfectPair,
    evaluate21Plus3,
    evaluateTop3,
    
    /**
     * Calculate winnings for a side bet
     * @param {number} betAmount - Amount wagered
     * @param {number} payout - Payout multiplier
     * @returns {number} Total return (bet + winnings)
     */
    calculateWinnings(betAmount, payout) {
        return betAmount * payout + betAmount;
    },
    
    /**
     * Get payout table for display
     * @param {string} betType - 'perfectPair', '21plus3', or 'top3'
     * @returns {Array} Array of {name, payout} objects
     */
    getPayoutTable(betType) {
        switch (betType) {
            case 'perfectPair':
                return [
                    { name: 'Perfect Pair', payout: '25:1' },
                    { name: 'Colored Pair', payout: '12:1' },
                    { name: 'Mixed Pair', payout: '6:1' }
                ];
            case '21plus3':
                return [
                    { name: 'Suited Trips', payout: '100:1' },
                    { name: 'Straight Flush', payout: '40:1' },
                    { name: 'Three of a Kind', payout: '30:1' },
                    { name: 'Straight', payout: '10:1' },
                    { name: 'Flush', payout: '5:1' }
                ];
            case 'top3':
                return [
                    { name: 'Suited Trips', payout: '270:1' },
                    { name: 'Straight Flush', payout: '180:1' },
                    { name: 'Three of a Kind', payout: '90:1' },
                    { name: 'Straight', payout: '10:1' },
                    { name: 'Flush', payout: '5:1' }
                ];
            default:
                return [];
        }
    }
};
