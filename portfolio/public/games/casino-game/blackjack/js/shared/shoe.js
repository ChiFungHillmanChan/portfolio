/**
 * Shoe - Manages a multi-deck shuffled shoe for blackjack
 * 
 * Provides realistic card dealing from a shuffled shoe with
 * penetration tracking for card counting practice.
 */

const Shoe = {
    cards: [],
    decks: 6,
    totalCards: 0,
    cutCardPosition: 0, // Position where reshuffle is needed

    /**
     * Initialize the shoe with specified number of decks
     * @param {number} deckCount - Number of decks (default: 6)
     * @param {number} penetration - Percentage to deal before reshuffle (default: 75)
     */
    init(deckCount = 6, penetration = 75) {
        this.decks = deckCount;
        this.cards = [];
        
        // Build the shoe with all decks
        for (let d = 0; d < this.decks; d++) {
            for (const suit of CARD_SUITS) {
                for (const rank of CARD_RANKS) {
                    this.cards.push({ rank, suit });
                }
            }
        }
        
        this.totalCards = this.cards.length;
        this.cutCardPosition = Math.floor(this.totalCards * (penetration / 100));
        
        this.shuffle();
    },

    /**
     * Fisher-Yates shuffle algorithm
     * Provides cryptographically fair shuffle
     */
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    },

    /**
     * Draw a single card from the shoe
     * @returns {Object|null} Card object {rank, suit} or null if empty
     */
    drawCard() {
        if (this.cards.length === 0) {
            return null;
        }
        return this.cards.pop();
    },

    /**
     * Get the number of cards remaining in the shoe
     * @returns {number} Remaining card count
     */
    getRemaining() {
        return this.cards.length;
    },

    /**
     * Get the number of cards dealt from the shoe
     * @returns {number} Dealt card count
     */
    getDealt() {
        return this.totalCards - this.cards.length;
    },

    /**
     * Get the penetration percentage (how much of the shoe has been dealt)
     * @returns {number} Penetration as percentage (0-100)
     */
    getPenetration() {
        return Math.round((this.getDealt() / this.totalCards) * 100);
    },

    /**
     * Get the number of decks remaining (approximate)
     * @returns {number} Approximate decks remaining
     */
    getDecksRemaining() {
        return (this.cards.length / 52).toFixed(1);
    },

    /**
     * Check if the shoe needs to be reshuffled (past cut card)
     * @returns {boolean} True if reshuffle needed
     */
    needsReshuffle() {
        return this.getDealt() >= this.cutCardPosition;
    },

    /**
     * Reset and reshuffle the shoe
     */
    reshuffle() {
        this.init(this.decks);
    }
};
