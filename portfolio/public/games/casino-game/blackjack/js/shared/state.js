// =====================================================
// BLACKJACK GAME STATE
// =====================================================

let gameState = createInitialState();

function createInitialState() {
    return {
        config: { ...DEFAULT_CONFIG },
        phase: GAME_PHASES.SETUP,
        count: {
            running: 0,
            cardsDealt: 0,
            cardCounts: createCardCountArray()
        },
        bankroll: {
            initial: 0,
            current: 0,
            sessionProfit: 0
        },
        table: {
            seats: createInitialSeats(),
            dealer: {
                cards: [],
                holeCard: null,
                holeCardRevealed: false
            },
            currentSeatIndex: -1,
            currentHandIndex: 0
        },
        history: {
            hands: [],
            totalHands: 0,
            wins: 0,
            losses: 0,
            pushes: 0,
            blackjacks: 0
        },
        ui: {
            showDeviations: true,
            hudExpanded: false,
            activeInput: null
        }
    };
}

function createCardCountArray() {
    const counts = {};
    for (const rank of CARD_RANKS) {
        counts[rank] = DEFAULT_CONFIG.decks * 4;
    }
    return counts;
}

function createInitialSeats() {
    const seats = [];
    for (let i = 1; i <= TOTAL_SEATS; i++) {
        seats.push({
            id: i,
            status: SEAT_STATUSES.EMPTY,
            hands: [createEmptyHand()],
            bet: 0,
            activeHandIndex: 0
        });
    }
    return seats;
}

function createEmptyHand() {
    return {
        cards: [],
        bet: 0,
        isDoubled: false,
        isSplit: false,
        isComplete: false,
        result: null
    };
}

// =====================================================
// STATE UTILITIES
// =====================================================

function resetGameState() {
    gameState = createInitialState();
}

function resetShoe() {
    const counts = {};
    for (const rank of CARD_RANKS) {
        counts[rank] = gameState.config.decks * 4;
    }
    gameState.count = {
        running: 0,
        cardsDealt: 0,
        cardCounts: counts
    };
}

function resetCurrentHand() {
    for (const seat of gameState.table.seats) {
        seat.hands = [createEmptyHand()];
        seat.bet = 0;
        seat.activeHandIndex = 0;
    }
    gameState.table.dealer = {
        cards: [],
        holeCard: null,
        holeCardRevealed: false
    };
    gameState.table.currentSeatIndex = -1;
    gameState.table.currentHandIndex = 0;
}

function updateConfig(newConfig) {
    gameState.config = { ...gameState.config, ...newConfig };
    if (newConfig.decks !== undefined) {
        resetShoe();
    }
}

function setSeatStatus(seatIndex, status) {
    if (seatIndex >= 0 && seatIndex < TOTAL_SEATS) {
        gameState.table.seats[seatIndex].status = status;
    }
}

function setPhase(phase) {
    gameState.phase = phase;
}

function setBankroll(amount) {
    gameState.bankroll.initial = amount;
    gameState.bankroll.current = amount;
    gameState.bankroll.sessionProfit = 0;
}

function updateBankroll(change) {
    gameState.bankroll.current += change;
    gameState.bankroll.sessionProfit = gameState.bankroll.current - gameState.bankroll.initial;
}

// =====================================================
// STATE GETTERS
// =====================================================

function getTotalCards() {
    return gameState.config.decks * CARDS_PER_DECK;
}

function getCardsRemaining() {
    return getTotalCards() - gameState.count.cardsDealt;
}

function getDecksRemaining() {
    return getCardsRemaining() / CARDS_PER_DECK;
}

function getDeckPenetration() {
    return gameState.count.cardsDealt / getTotalCards();
}

function getOccupiedSeats() {
    return gameState.table.seats.filter(seat => seat.status !== SEAT_STATUSES.EMPTY);
}

function getMySeats() {
    return gameState.table.seats.filter(seat => seat.status === SEAT_STATUSES.MINE);
}

function getCurrentSeat() {
    const index = gameState.table.currentSeatIndex;
    if (index >= 0 && index < TOTAL_SEATS) {
        return gameState.table.seats[index];
    }
    return null;
}

function getCurrentHand() {
    const seat = getCurrentSeat();
    if (seat) {
        return seat.hands[seat.activeHandIndex];
    }
    return null;
}

function getDealerUpcard() {
    if (gameState.table.dealer.cards.length > 0) {
        return gameState.table.dealer.cards[0];
    }
    return null;
}

function getDealerHoleCard() {
    return gameState.table.dealer.holeCard;
}

function isSetupComplete() {
    const hasOccupiedSeats = gameState.table.seats.some(s => s.status !== SEAT_STATUSES.EMPTY);
    const hasBankroll = gameState.bankroll.initial > 0;
    return hasOccupiedSeats && hasBankroll;
}
