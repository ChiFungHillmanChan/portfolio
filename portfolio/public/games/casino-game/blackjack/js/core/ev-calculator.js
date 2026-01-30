/**
 * Expected Value Calculator
 * Calculates EV for different actions
 */

const EVCalculator = {
    /**
     * Base EV tables for actions (simplified from full simulation)
     * Values represent approximate EV change vs basic strategy
     */
    baseEV: {
        // Hard hand EVs vs dealer 2-A (approximate per-action EV)
        hard: {
            17: { stand: -0.04, hit: -0.47 },
            16: { stand: -0.29, hit: -0.41, surrender: -0.50 },
            15: { stand: -0.26, hit: -0.37, surrender: -0.50 },
            14: { stand: -0.23, hit: -0.34 },
            13: { stand: -0.20, hit: -0.30 },
            12: { stand: -0.17, hit: -0.25 },
            11: { stand: -0.05, hit: 0.05, double: 0.24 },
            10: { stand: -0.08, hit: 0.04, double: 0.18 },
            9:  { stand: -0.14, hit: 0.01, double: 0.08 }
        }
    },

    /**
     * True count EV adjustment per action
     * Each TC adds approximately this much EV
     */
    tcAdjustment: {
        stand: 0.005,
        hit: 0.004,
        double: 0.012,
        split: 0.008,
        surrender: 0.003
    },

    /**
     * Calculate EV for a specific action
     * @param {object} playerEval - Player hand evaluation
     * @param {string} dealerUpcard - Dealer upcard
     * @param {string} action - Action to evaluate
     * @param {number} trueCount - Current true count
     * @returns {number} Estimated EV as decimal
     */
    calculateActionEV(playerEval, dealerUpcard, action, trueCount) {
        // Get base EV from tables or estimate
        let baseEV = this.getBaseEV(playerEval, dealerUpcard, action);

        // Adjust for true count
        const tcAdjust = (this.tcAdjustment[action.toLowerCase()] || 0.004) * trueCount;
        baseEV += tcAdjust;

        // Additional adjustments for specific situations
        if (action === 'double' || action === 'D') {
            // Doubling amplifies the EV
            baseEV *= 1.8;
        }

        if (action === 'split' || action === 'P') {
            // Splitting depends heavily on pair type
            baseEV = this.getSplitEV(playerEval, dealerUpcard, trueCount);
        }

        if (action === 'surrender' || action === 'R') {
            // Surrender is always -0.50 base
            baseEV = -0.50 + (trueCount * 0.002);
        }

        return Math.round(baseEV * 10000) / 10000;
    },

    /**
     * Get base EV from tables
     * @param {object} playerEval - Hand evaluation
     * @param {string} dealerUpcard - Dealer card
     * @param {string} action - Action
     * @returns {number} Base EV
     */
    getBaseEV(playerEval, dealerUpcard, action) {
        const total = playerEval.total;
        const actionKey = action.toLowerCase().replace('d', 'double').replace('p', 'split');

        // Look up in hard table
        if (this.baseEV.hard[total] && this.baseEV.hard[total][actionKey]) {
            return this.baseEV.hard[total][actionKey];
        }

        // Default estimates based on action type
        const defaults = {
            stand: -0.15,
            hit: -0.10,
            double: 0.05,
            split: 0.00,
            surrender: -0.50
        };

        return defaults[actionKey] || -0.10;
    },

    /**
     * Calculate split EV
     * @param {object} playerEval - Hand evaluation
     * @param {string} dealerUpcard - Dealer card
     * @param {number} trueCount - True count
     * @returns {number} Split EV
     */
    getSplitEV(playerEval, dealerUpcard, trueCount) {
        const pairRank = playerEval.pairRank;
        const dealerVal = this.getDealerValue(dealerUpcard);

        // Base split EVs by pair (approximate)
        const splitEVs = {
            'A': 0.40,   // Always split aces
            '8': 0.10,   // Always split 8s
            '9': 0.05,   // Split 9s vs most
            '7': -0.02,  // Split 7s vs 2-7
            '6': -0.05,  // Split 6s vs 2-6
            '4': -0.10,  // Rarely split 4s
            '3': -0.05,  // Split 3s vs 2-7
            '2': -0.05,  // Split 2s vs 2-7
            '10': -0.05, // Rarely split 10s
            'J': -0.05,
            'Q': -0.05,
            'K': -0.05,
            '5': -0.15   // Never split 5s (double instead)
        };

        let baseEV = splitEVs[pairRank] || 0;

        // Adjust for dealer upcard
        if (dealerVal >= 2 && dealerVal <= 6) {
            baseEV += 0.05; // Better against weak dealer
        } else if (dealerVal >= 9 || dealerUpcard === 'A') {
            baseEV -= 0.05; // Worse against strong dealer
        }

        // TC adjustment
        baseEV += trueCount * 0.008;

        return baseEV;
    },

    /**
     * Get numeric value for dealer card
     * @param {string} card - Dealer card
     * @returns {number} Card value
     */
    getDealerValue(card) {
        if (card === 'A') return 11;
        if (['10', 'J', 'Q', 'K'].includes(card)) return 10;
        return parseInt(card);
    },

    /**
     * Get all action EVs for a hand
     * @param {object} playerEval - Player hand evaluation
     * @param {string} dealerUpcard - Dealer upcard
     * @param {number} trueCount - Current true count
     * @param {object} options - Available actions
     * @returns {Array} Actions sorted by EV
     */
    getAllActionsEV(playerEval, dealerUpcard, trueCount, options = {}) {
        const {
            canDouble = playerEval.cardCount === 2,
            canSplit = playerEval.isPair && playerEval.cardCount === 2,
            canSurrender = playerEval.cardCount === 2
        } = options;

        const actions = [];

        // Always calculate hit and stand
        actions.push({
            action: 'HIT',
            actionCode: 'H',
            ev: this.calculateActionEV(playerEval, dealerUpcard, 'hit', trueCount)
        });

        actions.push({
            action: 'STAND',
            actionCode: 'S',
            ev: this.calculateActionEV(playerEval, dealerUpcard, 'stand', trueCount)
        });

        if (canDouble) {
            actions.push({
                action: 'DOUBLE',
                actionCode: 'D',
                ev: this.calculateActionEV(playerEval, dealerUpcard, 'double', trueCount)
            });
        }

        if (canSplit) {
            actions.push({
                action: 'SPLIT',
                actionCode: 'P',
                ev: this.calculateActionEV(playerEval, dealerUpcard, 'split', trueCount)
            });
        }

        if (canSurrender) {
            actions.push({
                action: 'SURRENDER',
                actionCode: 'R',
                ev: this.calculateActionEV(playerEval, dealerUpcard, 'surrender', trueCount)
            });
        }

        // Sort by EV descending
        actions.sort((a, b) => b.ev - a.ev);

        // Mark optimal action
        if (actions.length > 0) {
            actions[0].isOptimal = true;
        }

        return actions;
    },

    /**
     * Get EV difference between optimal and suboptimal actions
     * @param {Array} actions - Sorted actions from getAllActionsEV
     * @returns {object} EV comparison
     */
    getEVComparison(actions) {
        if (actions.length < 2) {
            return { differential: 0, description: '' };
        }

        const optimal = actions[0];
        const suboptimal = actions[1];
        const differential = optimal.ev - suboptimal.ev;

        return {
            optimalAction: optimal.action,
            suboptimalAction: suboptimal.action,
            differential: Math.round(differential * 10000) / 10000,
            description: `${optimal.action} is ${formatEV(differential)} better than ${suboptimal.action}`
        };
    },

    /**
     * Calculate overall hand EV
     * @param {object} playerEval - Hand evaluation
     * @param {string} dealerUpcard - Dealer card
     * @param {number} trueCount - True count
     * @returns {number} Overall hand EV
     */
    getHandEV(playerEval, dealerUpcard, trueCount) {
        const actions = this.getAllActionsEV(playerEval, dealerUpcard, trueCount);
        if (actions.length === 0) return 0;
        return actions[0].ev; // Return optimal EV
    }
};
