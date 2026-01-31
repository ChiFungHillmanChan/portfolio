/**
 * Hand Evaluation Engine
 * Calculates hand totals and determines hand properties
 */

const HandEvaluation = {
    /**
     * Evaluate a blackjack hand
     * @param {Array} cards - Array of card objects with rank property
     * @returns {object} Hand evaluation result
     */
    evaluateHand(cards) {
        let total = 0;
        let aces = 0;

        for (const card of cards) {
            const rank = typeof card === 'string' ? card : card.rank;

            if (rank === 'A') {
                aces++;
                total += 11;
            } else if (['K', 'Q', 'J'].includes(rank)) {
                total += 10;
            } else if (rank === '10') {
                total += 10;
            } else {
                total += parseInt(rank);
            }
        }

        // Adjust for aces (count as 1 instead of 11 if bust)
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        return {
            total,
            softAces: aces, // Number of aces still counting as 11
            isSoft: aces > 0 && total <= 21,
            isBust: total > 21,
            isBlackjack: cards.length === 2 && total === 21,
            isPair: cards.length === 2 && this.getCardRank(cards[0]) === this.getCardRank(cards[1]),
            pairRank: cards.length === 2 ? this.getCardRank(cards[0]) : null,
            canSplit: cards.length === 2 && this.getCardRank(cards[0]) === this.getCardRank(cards[1]),
            cardCount: cards.length
        };
    },

    /**
     * Get the rank of a card
     * @param {string|object} card - Card or card rank
     * @returns {string} Card rank
     */
    getCardRank(card) {
        return typeof card === 'string' ? card : card.rank;
    },

    /**
     * Check if hand can double
     * @param {Array} cards - Hand cards
     * @param {boolean} afterSplit - Whether this is after a split
     * @returns {boolean} Can double
     */
    canDouble(cards, afterSplit = false) {
        // Most casinos allow double on first two cards only
        // Some allow after split (DAS)
        if (cards.length !== 2) return false;
        return true;
    },

    /**
     * Check if hand can split
     * @param {Array} cards - Hand cards
     * @param {number} splitCount - Number of times already split
     * @param {number} maxSplits - Maximum splits allowed (default 3)
     * @returns {boolean} Can split
     */
    canSplit(cards, splitCount = 0, maxSplits = 3) {
        if (cards.length !== 2) return false;
        if (splitCount >= maxSplits) return false;

        const rank1 = this.getCardRank(cards[0]);
        const rank2 = this.getCardRank(cards[1]);

        // Check if same rank or both 10-value
        if (rank1 === rank2) return true;

        const tenValues = ['10', 'J', 'Q', 'K'];
        if (tenValues.includes(rank1) && tenValues.includes(rank2)) return true;

        return false;
    },

    /**
     * Check if surrender is advisable
     * @param {Array} playerCards - Player's cards
     * @param {string} dealerUpcard - Dealer's visible card rank
     * @param {boolean} surrenderAllowed - Whether surrender is allowed
     * @returns {boolean} Should consider surrender
     */
    canSurrender(playerCards, dealerUpcard, surrenderAllowed = true) {
        if (!surrenderAllowed) return false;
        if (playerCards.length !== 2) return false;
        return true;
    },

    /**
     * Determine if dealer must hit
     * @param {Array} dealerCards - Dealer's cards
     * @param {string} dealerRule - S17 or H17
     * @returns {boolean} Dealer must hit
     */
    dealerMustHit(dealerCards, dealerRule = DEALER_RULE.S17) {
        const evaluation = this.evaluateHand(dealerCards);

        if (evaluation.isBust) return false;
        if (evaluation.total < 17) return true;
        if (evaluation.total > 17) return false;

        // Total is exactly 17
        if (dealerRule === DEALER_RULE.H17 && evaluation.isSoft) {
            return true; // Hit on soft 17
        }

        return false; // Stand on 17
    },

    /**
     * Compare player hand to dealer hand
     * @param {object} playerEval - Player hand evaluation
     * @param {object} dealerEval - Dealer hand evaluation
     * @returns {string} 'win', 'lose', 'push', or 'blackjack'
     */
    compareHands(playerEval, dealerEval) {
        // Player busts
        if (playerEval.isBust) return 'lose';

        // Dealer busts
        if (dealerEval.isBust) return 'win';

        // Blackjack comparisons
        if (playerEval.isBlackjack && dealerEval.isBlackjack) return 'push';
        if (playerEval.isBlackjack) return 'blackjack';
        if (dealerEval.isBlackjack) return 'lose';

        // Compare totals
        if (playerEval.total > dealerEval.total) return 'win';
        if (playerEval.total < dealerEval.total) return 'lose';

        return 'push';
    },

    /**
     * Get hand description for display
     * @param {Array} cards - Hand cards
     * @returns {string} Hand description
     */
    getHandDescription(cards) {
        const evaluation = this.evaluateHand(cards);

        if (evaluation.isBlackjack) return 'Blackjack!';
        if (evaluation.isBust) return `Bust (${evaluation.total})`;

        const softPrefix = evaluation.isSoft ? 'Soft ' : '';
        return `${softPrefix}${evaluation.total}`;
    },

    /**
     * Calculate payout multiplier
     * @param {string} result - Result type
     * @param {boolean} isBlackjack - Whether player has blackjack
     * @returns {number} Payout multiplier
     */
    getPayoutMultiplier(result, isBlackjack = false) {
        switch (result) {
            case 'blackjack': return 1.5; // 3:2 payout
            case 'win': return 1;
            case 'push': return 0;
            case 'lose': return -1;
            default: return 0;
        }
    }
};
