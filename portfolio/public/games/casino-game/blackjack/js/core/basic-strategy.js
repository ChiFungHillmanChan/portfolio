/**
 * Basic Strategy Engine
 * Complete lookup tables for optimal blackjack play
 * Based on 6-deck, S17, DAS rules
 */

const BasicStrategy = {
    /**
     * Hard hand strategy table
     * Player total vs Dealer upcard
     * H=Hit, S=Stand, D=Double, Rs=Surrender/Stand, Rh=Surrender/Hit
     */
    hard: {
        17: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 'A': 'S' },
        16: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'Rs', 'A': 'Rh' },
        15: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'Rh', 'A': 'H' },
        14: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
        13: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
        12: { 2: 'H', 3: 'H', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
        11: { 2: 'D', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'D', 8: 'D', 9: 'D', 10: 'D', 'A': 'H' },
        10: { 2: 'D', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'D', 8: 'D', 9: 'D', 10: 'H', 'A': 'H' },
        9:  { 2: 'H', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
        8:  { 2: 'H', 3: 'H', 4: 'H', 5: 'H', 6: 'H', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
        7:  { 2: 'H', 3: 'H', 4: 'H', 5: 'H', 6: 'H', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
        6:  { 2: 'H', 3: 'H', 4: 'H', 5: 'H', 6: 'H', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
        5:  { 2: 'H', 3: 'H', 4: 'H', 5: 'H', 6: 'H', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' }
    },

    /**
     * Soft hand strategy table (hands with Ace counting as 11)
     * Soft total vs Dealer upcard
     */
    soft: {
        20: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 'A': 'S' },
        19: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 'A': 'S' },
        18: { 2: 'S', 3: 'Ds', 4: 'Ds', 5: 'Ds', 6: 'Ds', 7: 'S', 8: 'S', 9: 'H', 10: 'H', 'A': 'H' },
        17: { 2: 'H', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
        16: { 2: 'H', 3: 'H', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
        15: { 2: 'H', 3: 'H', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
        14: { 2: 'H', 3: 'H', 4: 'H', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
        13: { 2: 'H', 3: 'H', 4: 'H', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' }
    },

    /**
     * Pair splitting strategy table
     * Pair rank vs Dealer upcard
     */
    pairs: {
        'A':  { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P', 9: 'P', 10: 'P', 'A': 'P' },
        '10': { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 'A': 'S' },
        '9':  { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'S', 8: 'P', 9: 'P', 10: 'S', 'A': 'S' },
        '8':  { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P', 9: 'P', 10: 'P', 'A': 'Rp' },
        '7':  { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
        '6':  { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
        '5':  { 2: 'D', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'D', 8: 'D', 9: 'D', 10: 'H', 'A': 'H' },
        '4':  { 2: 'H', 3: 'H', 4: 'H', 5: 'P', 6: 'P', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
        '3':  { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
        '2':  { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' }
    },

    /**
     * Normalize dealer upcard to strategy table key
     * @param {string} dealerCard - Dealer's upcard rank
     * @returns {string|number} Normalized key
     */
    normalizeDealerCard(dealerCard) {
        const tenValueCards = ['10', 'J', 'Q', 'K'];
        if (tenValueCards.includes(dealerCard)) {
            return 10;
        }
        if (dealerCard === 'A') {
            return 'A';
        }
        return parseInt(dealerCard);
    },

    /**
     * Get optimal action for a hand
     * @param {Array} playerCards - Player's cards
     * @param {string} dealerUpcard - Dealer's visible card rank
     * @param {object} options - Game options
     * @returns {object} Recommended action and metadata
     */
    getOptimalAction(playerCards, dealerUpcard, options = {}) {
        const {
            canDoubleAfterSplit = true,
            surrenderAllowed = true,
            isAfterSplit = false
        } = options;

        const evaluation = HandEvaluation.evaluateHand(playerCards);
        const dealerKey = this.normalizeDealerCard(dealerUpcard);

        // Check for blackjack
        if (evaluation.isBlackjack) {
            return { action: 'S', actionName: 'Stand', reason: 'Blackjack' };
        }

        // Check for bust
        if (evaluation.isBust) {
            return { action: 'S', actionName: 'Stand', reason: 'Bust' };
        }

        let action;
        let table;
        let lookupKey;

        // Check pairs first (if splittable)
        if (evaluation.isPair && playerCards.length === 2) {
            table = 'pairs';
            let pairRank = HandEvaluation.getCardRank(playerCards[0]);
            // Normalize 10-value pair ranks
            if (['J', 'Q', 'K'].includes(pairRank)) {
                pairRank = '10';
            }
            lookupKey = pairRank;
            action = this.pairs[pairRank]?.[dealerKey];
        }

        // If no pair action or pair says don't split, check soft/hard
        if (!action || (action !== 'P' && action !== 'Rp')) {
            if (evaluation.isSoft && evaluation.total >= 13 && evaluation.total <= 20) {
                table = 'soft';
                lookupKey = evaluation.total;
                action = this.soft[evaluation.total]?.[dealerKey];
            } else {
                table = 'hard';
                lookupKey = Math.min(17, Math.max(5, evaluation.total));
                action = this.hard[lookupKey]?.[dealerKey];
            }
        }

        // Default to hit if no action found
        if (!action) {
            action = 'H';
        }

        // Handle composite actions
        return this.resolveAction(action, {
            canDouble: playerCards.length === 2 && (!isAfterSplit || canDoubleAfterSplit),
            surrenderAllowed,
            table,
            lookupKey,
            dealerKey
        });
    },

    /**
     * Resolve composite actions (Ds, Rh, Rs, Rp)
     * @param {string} action - Raw action code
     * @param {object} options - Available options
     * @returns {object} Resolved action
     */
    resolveAction(action, options) {
        const { canDouble, surrenderAllowed, table, lookupKey, dealerKey } = options;

        const actionMap = {
            'H': { action: 'H', actionName: 'Hit' },
            'S': { action: 'S', actionName: 'Stand' },
            'D': canDouble ? { action: 'D', actionName: 'Double' } : { action: 'H', actionName: 'Hit' },
            'P': { action: 'P', actionName: 'Split' },
            'Ds': canDouble ? { action: 'D', actionName: 'Double' } : { action: 'S', actionName: 'Stand' },
            'Rh': surrenderAllowed ? { action: 'R', actionName: 'Surrender' } : { action: 'H', actionName: 'Hit' },
            'Rs': surrenderAllowed ? { action: 'R', actionName: 'Surrender' } : { action: 'S', actionName: 'Stand' },
            'Rp': surrenderAllowed ? { action: 'R', actionName: 'Surrender' } : { action: 'P', actionName: 'Split' }
        };

        const result = actionMap[action] || { action: 'H', actionName: 'Hit' };
        result.rawAction = action;
        result.table = table;
        result.lookupKey = lookupKey;
        result.dealerKey = dealerKey;

        return result;
    },

    /**
     * Get action description for display
     * @param {string} action - Action code
     * @returns {string} Human-readable action
     */
    getActionDescription(action) {
        const descriptions = {
            'H': 'Hit',
            'S': 'Stand',
            'D': 'Double Down',
            'P': 'Split',
            'R': 'Surrender',
            'Ds': 'Double if allowed, otherwise Stand',
            'Rh': 'Surrender if allowed, otherwise Hit',
            'Rs': 'Surrender if allowed, otherwise Stand',
            'Rp': 'Surrender if allowed, otherwise Split'
        };
        return descriptions[action] || action;
    }
};
