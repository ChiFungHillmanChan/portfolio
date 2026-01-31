/**
 * Card Counting Engine
 * Hi-Lo System Implementation
 */

const CardCounting = {
    /**
     * Get Hi-Lo value for a card rank
     * @param {string} rank - Card rank (A, 2-10, J, Q, K)
     * @returns {number} Hi-Lo value (-1, 0, or +1)
     */
    getHiLoValue(rank) {
        return HI_LO_VALUES[rank] || 0;
    },

    /**
     * Update running count with a new card
     * @param {string} rank - Card rank
     * @param {number} currentCount - Current running count
     * @returns {number} Updated running count
     */
    updateRunningCount(rank, currentCount) {
        return currentCount + this.getHiLoValue(rank);
    },

    /**
     * Calculate decks remaining in shoe
     * @param {number} totalDecks - Total decks in shoe
     * @param {number} cardsDealt - Number of cards dealt
     * @returns {number} Estimated decks remaining
     */
    getDecksRemaining(totalDecks, cardsDealt) {
        const totalCards = totalDecks * 52;
        const cardsRemaining = totalCards - cardsDealt;
        return Math.max(0.5, cardsRemaining / 52); // Minimum 0.5 to avoid division issues
    },

    /**
     * Calculate true count from running count
     * @param {number} runningCount - Current running count
     * @param {number} decksRemaining - Decks remaining in shoe
     * @returns {number} True count (rounded to 1 decimal)
     */
    calculateTrueCount(runningCount, decksRemaining) {
        if (decksRemaining <= 0) return runningCount;
        const trueCount = runningCount / decksRemaining;
        return Math.round(trueCount * 10) / 10; // Round to 1 decimal
    },

    /**
     * Get deck penetration percentage
     * @param {number} totalDecks - Total decks in shoe
     * @param {number} cardsDealt - Number of cards dealt
     * @returns {number} Penetration as decimal (0.0 to 1.0)
     */
    getDeckPenetration(totalDecks, cardsDealt) {
        const totalCards = totalDecks * 52;
        return Math.min(1, cardsDealt / totalCards);
    },

    /**
     * Calculate player edge based on true count
     * @param {number} trueCount - Current true count
     * @param {number} baseEdge - Base house edge (default 0.5%)
     * @returns {number} Player edge as decimal (negative = house edge)
     */
    calculatePlayerEdge(trueCount, baseEdge = BASE_HOUSE_EDGE) {
        // Each +1 true count adds ~0.5% player edge
        const countBonus = trueCount * EDGE_PER_TRUE_COUNT;
        return -baseEdge + countBonus;
    },

    /**
     * Get recommended bet based on true count and Kelly Criterion
     * @param {number} trueCount - Current true count
     * @param {number} minBet - Minimum bet allowed
     * @param {number} maxBet - Maximum bet allowed
     * @param {number} bankroll - Current bankroll
     * @param {number} kellyFraction - Kelly fraction to use (0.25, 0.5, or 1.0)
     * @returns {number} Recommended bet amount
     */
    getRecommendedBet(trueCount, minBet, maxBet, bankroll, kellyFraction = KELLY_FRACTIONS.standard) {
        // No edge or negative count = minimum bet
        if (trueCount <= 0) {
            return minBet;
        }

        // Calculate edge
        const edge = this.calculatePlayerEdge(trueCount);

        // If no positive edge, bet minimum
        if (edge <= 0) {
            return minBet;
        }

        // Kelly bet sizing
        // Simplified: bet = edge * bankroll * kellyFraction
        // Capped by reasonable percentage of bankroll
        const kellyBet = edge * bankroll * kellyFraction;

        // Apply bet spread based on true count
        // TC 1: 2 units, TC 2: 4 units, TC 3: 6 units, TC 4+: 8 units
        const unit = minBet;
        let spreadBet;

        if (trueCount >= 4) {
            spreadBet = unit * 8;
        } else if (trueCount >= 3) {
            spreadBet = unit * 6;
        } else if (trueCount >= 2) {
            spreadBet = unit * 4;
        } else {
            spreadBet = unit * 2;
        }

        // Use the smaller of Kelly bet and spread bet
        let recommendedBet = Math.min(kellyBet, spreadBet);

        // Never bet more than 5% of bankroll
        const maxBankrollBet = bankroll * 0.05;
        recommendedBet = Math.min(recommendedBet, maxBankrollBet);

        // Ensure within table limits
        recommendedBet = Math.max(minBet, Math.min(maxBet, recommendedBet));

        // Round to nearest 5
        return Math.round(recommendedBet / 5) * 5;
    },

    /**
     * Get bet spread description
     * @param {number} trueCount - Current true count
     * @returns {string} Description of bet sizing
     */
    getBetSpreadDescription(trueCount) {
        if (trueCount <= 0) return '1 unit (minimum)';
        if (trueCount < 2) return '2 units';
        if (trueCount < 3) return '4 units';
        if (trueCount < 4) return '6 units';
        return '8 units (maximum spread)';
    },

    /**
     * Calculate buyin recommendations using Kelly Criterion
     * @param {number} minBet - Minimum bet
     * @param {number} maxBet - Maximum bet
     * @returns {object} Buyin recommendations for each tier
     */
    getBuyinRecommendations(minBet, maxBet) {
        // Simplified risk of ruin calculations
        // Based on typical blackjack variance of ~1.15

        return {
            conservative: {
                label: 'Conservative (0.25 Kelly)',
                buyin: Math.round(maxBet * 100),
                riskOfRuin: '~2%',
                description: 'Low risk, longer sessions'
            },
            standard: {
                label: 'Standard (0.5 Kelly)',
                buyin: Math.round(maxBet * 50),
                riskOfRuin: '~8%',
                description: 'Balanced risk/reward'
            },
            aggressive: {
                label: 'Aggressive (Full Kelly)',
                buyin: Math.round(maxBet * 25),
                riskOfRuin: '~13%',
                description: 'Maximum growth potential'
            }
        };
    },

    /**
     * Track cards remaining by rank
     * @param {number} totalDecks - Total decks in shoe
     * @param {object} dealtCards - Map of rank to count dealt
     * @returns {object} Remaining cards by rank
     */
    getCardsRemaining(totalDecks, dealtCards) {
        const remaining = {};

        for (const rank of CARD_RANKS) {
            const totalForRank = (rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K')
                ? totalDecks * 4  // Each 10-value card has 4 per deck
                : totalDecks * 4; // All other ranks

            const dealt = dealtCards[rank] || 0;
            remaining[rank] = Math.max(0, totalForRank - dealt);
        }

        return remaining;
    }
};
