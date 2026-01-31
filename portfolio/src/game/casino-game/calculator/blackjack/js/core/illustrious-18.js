/**
 * Illustrious 18 Strategy Deviations
 * Count-based deviations from basic strategy
 */

const Illustrious18 = {
    /**
     * The 18 most valuable index plays
     * index: true count threshold for deviation
     * positive index: deviate when TC >= index
     * negative index: deviate when TC <= index
     */
    deviations: [
        {
            id: 1,
            hand: 'insurance',
            dealer: 'A',
            index: 3,
            basic: 'N',
            deviation: 'Y',
            description: 'Take insurance at TC >= +3',
            value: 1.32 // Estimated gain per 100 hands
        },
        {
            id: 2,
            hand: '16',
            handType: 'hard',
            dealer: '10',
            index: 0,
            basic: 'H',
            deviation: 'S',
            description: 'Stand on 16 vs 10 at TC >= 0',
            value: 0.56
        },
        {
            id: 3,
            hand: '15',
            handType: 'hard',
            dealer: '10',
            index: 4,
            basic: 'H',
            deviation: 'S',
            description: 'Stand on 15 vs 10 at TC >= +4',
            value: 0.41
        },
        {
            id: 4,
            hand: '10,10',
            handType: 'pair',
            dealer: '5',
            index: 5,
            basic: 'S',
            deviation: 'P',
            description: 'Split 10s vs 5 at TC >= +5',
            value: 0.39
        },
        {
            id: 5,
            hand: '10,10',
            handType: 'pair',
            dealer: '6',
            index: 4,
            basic: 'S',
            deviation: 'P',
            description: 'Split 10s vs 6 at TC >= +4',
            value: 0.37
        },
        {
            id: 6,
            hand: '10',
            handType: 'hard',
            dealer: '10',
            index: 4,
            basic: 'H',
            deviation: 'D',
            description: 'Double 10 vs 10 at TC >= +4',
            value: 0.32
        },
        {
            id: 7,
            hand: '12',
            handType: 'hard',
            dealer: '3',
            index: 2,
            basic: 'H',
            deviation: 'S',
            description: 'Stand on 12 vs 3 at TC >= +2',
            value: 0.30
        },
        {
            id: 8,
            hand: '12',
            handType: 'hard',
            dealer: '2',
            index: 3,
            basic: 'H',
            deviation: 'S',
            description: 'Stand on 12 vs 2 at TC >= +3',
            value: 0.28
        },
        {
            id: 9,
            hand: '11',
            handType: 'hard',
            dealer: 'A',
            index: 1,
            basic: 'H',
            deviation: 'D',
            description: 'Double 11 vs A at TC >= +1',
            value: 0.25
        },
        {
            id: 10,
            hand: '9',
            handType: 'hard',
            dealer: '2',
            index: 1,
            basic: 'H',
            deviation: 'D',
            description: 'Double 9 vs 2 at TC >= +1',
            value: 0.23
        },
        {
            id: 11,
            hand: '10',
            handType: 'hard',
            dealer: 'A',
            index: 4,
            basic: 'H',
            deviation: 'D',
            description: 'Double 10 vs A at TC >= +4',
            value: 0.21
        },
        {
            id: 12,
            hand: '9',
            handType: 'hard',
            dealer: '7',
            index: 3,
            basic: 'H',
            deviation: 'D',
            description: 'Double 9 vs 7 at TC >= +3',
            value: 0.19
        },
        {
            id: 13,
            hand: '16',
            handType: 'hard',
            dealer: '9',
            index: 5,
            basic: 'H',
            deviation: 'S',
            description: 'Stand on 16 vs 9 at TC >= +5',
            value: 0.17
        },
        {
            id: 14,
            hand: '13',
            handType: 'hard',
            dealer: '2',
            index: -1,
            basic: 'S',
            deviation: 'H',
            description: 'Hit 13 vs 2 at TC <= -1',
            value: 0.15
        },
        {
            id: 15,
            hand: '12',
            handType: 'hard',
            dealer: '4',
            index: 0,
            basic: 'S',
            deviation: 'H',
            description: 'Hit 12 vs 4 at TC < 0',
            value: 0.14
        },
        {
            id: 16,
            hand: '12',
            handType: 'hard',
            dealer: '5',
            index: -2,
            basic: 'S',
            deviation: 'H',
            description: 'Hit 12 vs 5 at TC <= -2',
            value: 0.12
        },
        {
            id: 17,
            hand: '12',
            handType: 'hard',
            dealer: '6',
            index: -1,
            basic: 'S',
            deviation: 'H',
            description: 'Hit 12 vs 6 at TC <= -1',
            value: 0.11
        },
        {
            id: 18,
            hand: '13',
            handType: 'hard',
            dealer: '3',
            index: -2,
            basic: 'S',
            deviation: 'H',
            description: 'Hit 13 vs 3 at TC <= -2',
            value: 0.10
        }
    ],

    /**
     * Check if a deviation applies to the current situation
     * @param {object} playerEval - Hand evaluation
     * @param {string} dealerUpcard - Dealer's visible card
     * @param {number} trueCount - Current true count
     * @param {boolean} enableDeviations - Whether deviations are enabled
     * @returns {object|null} Deviation info or null
     */
    checkDeviation(playerEval, dealerUpcard, trueCount, enableDeviations = true) {
        if (!enableDeviations) return null;

        const dealerNormalized = this.normalizeDealerCard(dealerUpcard);

        for (const deviation of this.deviations) {
            // Check if dealer matches
            if (deviation.dealer !== dealerNormalized) continue;

            // Check if hand matches
            if (!this.matchesHand(playerEval, deviation)) continue;

            // Check if count threshold is met
            const shouldDeviate = this.shouldDeviate(trueCount, deviation.index);

            if (shouldDeviate) {
                return {
                    action: deviation.deviation,
                    basicAction: deviation.basic,
                    index: deviation.index,
                    description: deviation.description,
                    id: deviation.id,
                    value: deviation.value
                };
            }
        }

        return null;
    },

    /**
     * Check if hand matches a deviation pattern
     * @param {object} playerEval - Hand evaluation
     * @param {object} deviation - Deviation to check
     * @returns {boolean} Whether hand matches
     */
    matchesHand(playerEval, deviation) {
        // Insurance is special case
        if (deviation.hand === 'insurance') {
            return false; // Handled separately
        }

        // Check pairs
        if (deviation.handType === 'pair') {
            if (!playerEval.isPair) return false;
            const pairPattern = deviation.hand; // e.g., '10,10'
            const pairRank = pairPattern.split(',')[0];
            let actualRank = playerEval.pairRank;
            if (['J', 'Q', 'K'].includes(actualRank)) actualRank = '10';
            return pairRank === actualRank;
        }

        // Check hard/soft totals
        const targetTotal = parseInt(deviation.hand);
        if (isNaN(targetTotal)) return false;

        if (deviation.handType === 'soft' && !playerEval.isSoft) return false;
        if (deviation.handType === 'hard' && playerEval.isSoft) return false;

        return playerEval.total === targetTotal;
    },

    /**
     * Determine if deviation threshold is met
     * @param {number} trueCount - Current true count
     * @param {number} index - Deviation index
     * @returns {boolean} Whether to deviate
     */
    shouldDeviate(trueCount, index) {
        if (index >= 0) {
            return trueCount >= index;
        } else {
            return trueCount <= index;
        }
    },

    /**
     * Normalize dealer card for comparison
     * @param {string} card - Dealer card
     * @returns {string} Normalized card
     */
    normalizeDealerCard(card) {
        const tenValueCards = ['J', 'Q', 'K'];
        if (tenValueCards.includes(card)) return '10';
        return card;
    },

    /**
     * Check if insurance is recommended
     * @param {number} trueCount - Current true count
     * @returns {object} Insurance recommendation
     */
    checkInsurance(trueCount) {
        const insuranceDeviation = this.deviations.find(d => d.hand === 'insurance');
        const shouldTake = trueCount >= insuranceDeviation.index;

        return {
            recommended: shouldTake,
            trueCount,
            threshold: insuranceDeviation.index,
            description: shouldTake
                ? 'Take insurance (TC >= +3)'
                : 'Decline insurance'
        };
    },

    /**
     * Get all applicable deviations for display
     * @param {number} trueCount - Current true count
     * @returns {Array} Active deviations
     */
    getActiveDeviations(trueCount) {
        return this.deviations.filter(deviation => {
            return this.shouldDeviate(trueCount, deviation.index);
        }).map(deviation => ({
            ...deviation,
            isActive: true
        }));
    },

    /**
     * Get deviation summary for HUD
     * @param {number} trueCount - Current true count
     * @returns {object} Summary of active deviations
     */
    getDeviationSummary(trueCount) {
        const activeCount = this.getActiveDeviations(trueCount).length;
        const insuranceRecommended = trueCount >= 3;

        return {
            activeDeviations: activeCount,
            totalDeviations: this.deviations.length,
            insuranceRecommended,
            topDeviation: this.getTopActiveDeviation(trueCount)
        };
    },

    /**
     * Get the most valuable active deviation
     * @param {number} trueCount - Current true count
     * @returns {object|null} Top deviation
     */
    getTopActiveDeviation(trueCount) {
        const active = this.getActiveDeviations(trueCount);
        if (active.length === 0) return null;
        return active.sort((a, b) => b.value - a.value)[0];
    }
};
