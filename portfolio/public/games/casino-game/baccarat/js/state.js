// =====================================================
// GAME STATE
// =====================================================

let cardCounts = new Array(13).fill(CARDS_PER_RANK);
let totalDealt = 0;
let mainRC = 0, dragon7RC = 0, panda8RC = 0;

// Current hand
let currentHand = {
    playerCards: [],
    bankerCards: [],
    dealPosition: 0,
    isComplete: false
};

// History
let gameHistory = [];
let playerWins = 0, bankerWins = 0, tieWins = 0;
let tieValueCounts = new Array(10).fill(0); // Track tie values 0-9

// Big Road tracking
let bigRoadData = [];

// Egalité panel state
let egaliteOpen = false;

// Current payouts (user adjustable)
let egalitePayouts = {...DEFAULT_EGALITE_PAYOUTS};

// =====================================================
// STATE UTILITIES
// =====================================================

function resetGameState() {
    cardCounts = new Array(13).fill(CARDS_PER_RANK);
    totalDealt = 0;
    mainRC = 0;
    dragon7RC = 0;
    panda8RC = 0;
    currentHand = { playerCards: [], bankerCards: [], dealPosition: 0, isComplete: false };
    gameHistory = [];
    bigRoadData = [];
    playerWins = 0;
    bankerWins = 0;
    tieWins = 0;
    tieValueCounts = new Array(10).fill(0);
}

function resetCurrentHand() {
    currentHand = {
        playerCards: [],
        bankerCards: [],
        dealPosition: 0,
        isComplete: false
    };
}
