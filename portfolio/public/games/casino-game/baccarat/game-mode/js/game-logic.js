// =====================================================
// BACCARAT GAME MODE - GAME LOGIC
// =====================================================

// =====================================================
// CARD UTILITIES
// =====================================================

/**
 * Get baccarat value of a card
 * @param {Object} card - Card object {rank, suit}
 * @returns {number} Baccarat value (0-9)
 */
function getCardValue(card) {
    return CARD_VALUES[card.rank];
}

/**
 * Calculate hand total (mod 10)
 * @param {Array} cards - Array of card objects
 * @returns {number} Hand total (0-9)
 */
function calculateHandTotal(cards) {
    let total = 0;
    for (const card of cards) {
        total += getCardValue(card);
    }
    return total % 10;
}

/**
 * Get card display label
 * @param {Object} card - Card object {rank, suit}
 * @returns {string} Display label (e.g., "K♠")
 */
function getCardLabel(card) {
    return CARD_LABELS[card.rank] + CARD_SUITS[card.suit];
}

/**
 * Check if hand is a natural (8 or 9 with 2 cards)
 * @param {Array} cards - Array of card objects
 * @returns {boolean} True if natural
 */
function isNatural(cards) {
    if (cards.length !== 2) return false;
    const total = calculateHandTotal(cards);
    return total === 8 || total === 9;
}

// =====================================================
// BACCARAT RULES
// =====================================================

/**
 * Determine if a third card is needed
 * @returns {string} 'player', 'banker', or 'none'
 */
function determineThirdCardNeeded() {
    const hand = getCurrentHand();
    const pTotal = calculateHandTotal(hand.playerCards);
    const bTotal = calculateHandTotal(hand.bankerCards);

    // Natural - no third cards
    if (pTotal >= 8 || bTotal >= 8) return 'none';

    // Player's turn first
    if (hand.playerCards.length === 2) {
        if (pTotal <= 5) return 'player';
    }

    // Player stood (6 or 7), check if banker draws
    if (hand.playerCards.length === 2 && pTotal >= 6) {
        if (bTotal <= 5) return 'banker';
        return 'none';
    }

    // Player took third card, check banker drawing rules
    if (hand.playerCards.length === 3) {
        const player3rdCard = getCardValue(hand.playerCards[2]);
        return shouldBankerDraw(bTotal, player3rdCard) ? 'banker' : 'none';
    }

    return 'none';
}

/**
 * Check if banker should draw based on player's third card
 * @param {number} bankerTotal - Banker's current total
 * @param {number} player3rdCard - Value of player's third card
 * @returns {boolean} True if banker should draw
 */
function shouldBankerDraw(bankerTotal, player3rdCard) {
    if (bankerTotal <= 2) return true;
    if (bankerTotal === 3 && player3rdCard !== 8) return true;
    if (bankerTotal === 4 && [2, 3, 4, 5, 6, 7].includes(player3rdCard)) return true;
    if (bankerTotal === 5 && [4, 5, 6, 7].includes(player3rdCard)) return true;
    if (bankerTotal === 6 && [6, 7].includes(player3rdCard)) return true;
    return false;
}

/**
 * Check if hand is complete
 * @returns {boolean} True if hand is complete
 */
function checkHandComplete() {
    const hand = getCurrentHand();
    const pLen = hand.playerCards.length;
    const bLen = hand.bankerCards.length;

    // Need at least 2 cards each
    if (pLen < 2 || bLen < 2) return false;

    const pTotal = calculateHandTotal(hand.playerCards);
    const bTotal = calculateHandTotal(hand.bankerCards);

    // Natural - complete
    if (pTotal >= 8 || bTotal >= 8) return true;

    // Player stood (6+), banker may need third card
    if (pLen === 2 && pTotal >= 6) {
        if (bLen === 2 && bTotal >= 6) return true;
        if (bLen === 3) return true;
        if (bTotal <= 5 && bLen === 2) return false;
        return true;
    }

    // Player took third card
    if (pLen === 3) {
        const p3rd = getCardValue(hand.playerCards[2]);
        const bankerShouldDraw = shouldBankerDraw(bTotal, p3rd);
        
        if (!bankerShouldDraw) return true;
        if (bLen === 3) return true;
        return false;
    }

    return false;
}

// =====================================================
// GAME FLOW
// =====================================================

/**
 * Start a new game
 * @param {number} initialStack - Starting bankroll
 */
function startNewGame(initialStack) {
    resetGameState();
    resetBetState();
    initializeBankroll(initialStack);
    initializeShoe();
    setGamePhase(GAME_PHASES.BETTING);
    saveToStorage();
}

/**
 * Start a new round (after placing bets)
 */
function startNewRound() {
    if (!hasBets()) return false;

    // Check if shoe needs reshuffle
    if (needsReshuffle()) {
        initializeShoe();
    }

    resetCurrentHand();
    storeLastBets(getAllBets());
    setGamePhase(GAME_PHASES.DEALING);
    
    return true;
}

/**
 * Deal the next card in sequence
 * @returns {Object|null} The dealt card or null if hand is complete
 */
function dealNextCard() {
    const hand = getCurrentHand();

    // Check if hand is already complete
    if (hand.isComplete) return null;

    // Initial 4 cards: P-B-P-B
    if (hand.dealPosition < 4) {
        const card = drawCard();
        if (!card) return null;

        if (hand.dealPosition % 2 === 0) {
            // Player's card (position 0, 2)
            hand.playerCards.push(card);
        } else {
            // Banker's card (position 1, 3)
            hand.bankerCards.push(card);
        }

        hand.playerTotal = calculateHandTotal(hand.playerCards);
        hand.bankerTotal = calculateHandTotal(hand.bankerCards);
        hand.dealPosition++;

        // After 4 cards, check for natural
        if (hand.dealPosition === 4) {
            hand.isNatural = isNatural(hand.playerCards) || isNatural(hand.bankerCards);
            if (hand.isNatural) {
                hand.isComplete = true;
            }
        }

        return card;
    }

    // Third cards (position 4+)
    const thirdCardNeeded = determineThirdCardNeeded();
    
    if (thirdCardNeeded === 'none') {
        hand.isComplete = true;
        return null;
    }

    const card = drawCard();
    if (!card) return null;

    if (thirdCardNeeded === 'player') {
        hand.playerCards.push(card);
        hand.playerTotal = calculateHandTotal(hand.playerCards);
    } else if (thirdCardNeeded === 'banker') {
        hand.bankerCards.push(card);
        hand.bankerTotal = calculateHandTotal(hand.bankerCards);
    }

    hand.dealPosition++;

    // Check if complete after third card
    if (checkHandComplete()) {
        hand.isComplete = true;
    }

    return card;
}

/**
 * Get the next card destination
 * @returns {string} 'player', 'banker', or 'none'
 */
function getNextCardDestination() {
    const hand = getCurrentHand();

    if (hand.isComplete) return 'none';

    // Initial 4 cards
    if (hand.dealPosition < 4) {
        return hand.dealPosition % 2 === 0 ? 'player' : 'banker';
    }

    // Third cards
    return determineThirdCardNeeded();
}

/**
 * Complete the hand and determine winner
 * @returns {Object} Hand result
 */
function completeHand() {
    const hand = getCurrentHand();

    // Calculate final totals
    hand.playerTotal = calculateHandTotal(hand.playerCards);
    hand.bankerTotal = calculateHandTotal(hand.bankerCards);

    // Determine winner
    if (hand.playerTotal > hand.bankerTotal) {
        hand.winner = RESULT_TYPES.PLAYER;
    } else if (hand.bankerTotal > hand.playerTotal) {
        hand.winner = RESULT_TYPES.BANKER;
    } else {
        hand.winner = RESULT_TYPES.TIE;
    }

    hand.isComplete = true;

    // Create result object
    const result = {
        roundNumber: gameState.roundNumber + 1,
        winner: hand.winner,
        playerCards: [...hand.playerCards],
        bankerCards: [...hand.bankerCards],
        playerTotal: hand.playerTotal,
        bankerTotal: hand.bankerTotal,
        isNatural: hand.isNatural
    };

    return result;
}

/**
 * Resolve all bets and update bankroll
 * @param {Object} handResult - The completed hand result
 * @returns {Object} Resolution details with winnings
 */
function resolveRound(handResult) {
    const placedBets = getAllBets();
    const totalWagered = getTotalWagered();
    
    // Calculate winnings
    const winnings = calculateWinnings(placedBets, handResult);

    // Update bankroll: subtract wagered, add winnings
    const netChange = winnings.totalWin - totalWagered;
    updateBankroll(netChange);

    // Add to history
    addToHistory({
        ...handResult,
        bets: placedBets,
        wagered: totalWagered,
        won: winnings.totalWin,
        netResult: netChange
    });

    // Clear bets
    clearAllBets();

    // Check for bankruptcy
    if (isBankrupt()) {
        setGamePhase(GAME_PHASES.GAME_OVER);
        clearStorage();
    } else {
        setGamePhase(GAME_PHASES.RESULT);
    }

    saveToStorage();

    return {
        ...winnings,
        totalWagered,
        newBankroll: getCurrentBankroll(),
        isBankrupt: isBankrupt()
    };
}

/**
 * Return to betting phase for new round
 */
function newRound() {
    resetCurrentHand();
    setGamePhase(GAME_PHASES.BETTING);
}

/**
 * Repeat last bets and start new round
 * @returns {boolean} Success
 */
function repeatLastBets() {
    const lastBets = getLastBets();
    if (!lastBets) return false;

    clearAllBets();
    if (!restoreBets(lastBets)) {
        return false;
    }

    return true;
}
