// =====================================================
// BACCARAT GAME MODE - CONSTANTS & CONFIGURATION
// =====================================================

// Game Phases
const GAME_PHASES = {
    SETUP: 'setup',
    BETTING: 'betting',
    DEALING: 'dealing',
    RESULT: 'result',
    GAME_OVER: 'game_over'
};

// Deck Configuration
const TOTAL_DECKS = 8;
const CARDS_PER_DECK = 52;
const TOTAL_CARDS = TOTAL_DECKS * CARDS_PER_DECK;

// Card Labels and Values
const CARD_LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const CARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0, 0, 0]; // Baccarat values
const CARD_SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_NAMES = ['spades', 'hearts', 'diamonds', 'clubs'];

// Chip Denominations
const CHIP_DENOMINATIONS = [1, 5, 10, 25, 100, 500, 1000, 5000];

// Default Game Configuration
const DEFAULT_CONFIG = {
    initialStack: 1000,
    minBet: 1,
    maxBet: 10000
};

// Stack Presets for Setup
const STACK_PRESETS = [100, 500, 1000, 5000, 10000];

// =====================================================
// MAIN BET PAYOUTS
// =====================================================

const MAIN_BET_PAYOUTS = {
    player: 1,      // 1:1
    banker: 0.95,   // 1:1 minus 5% commission
    tie: 8          // 8:1
};

// =====================================================
// PAIR BET PAYOUTS
// =====================================================

const PAIR_BET_PAYOUTS = {
    playerPair: 11,  // 11:1
    bankerPair: 11   // 11:1
};

// =====================================================
// DRAGON BONUS PAYOUTS
// =====================================================

// Dragon Bonus pays based on winning margin or natural win
const DRAGON_BONUS_PAYOUTS = {
    natural: 1,     // Natural win (8 or 9 with 2 cards): 1:1
    margin9: 30,    // Win by 9 points: 30:1
    margin8: 10,    // Win by 8 points: 10:1
    margin7: 6,     // Win by 7 points: 6:1
    margin6: 4,     // Win by 6 points: 4:1
    margin5: 2,     // Win by 5 points: 2:1
    margin4: 1      // Win by 4 points: 1:1
    // Win by 0-3 points with non-natural: lose
};

// =====================================================
// EGALITÉ (TIE 0-9) PAYOUTS
// =====================================================

// Default payouts (standard UK casinos)
const EGALITE_PAYOUTS = {
    0: 150,
    1: 215,
    2: 225,
    3: 200,
    4: 120,
    5: 110,
    6: 45,
    7: 45,
    8: 80,
    9: 80
};

// Egalité base probabilities (8 deck) - from Wizard of Odds
const EGALITE_BASE_PROB = {
    0: 0.0057978534,
    1: 0.0041012676,
    2: 0.0040027882,
    3: 0.0044516969,
    4: 0.0072613513,
    5: 0.0079393629,
    6: 0.0192398659,
    7: 0.0203501471,
    8: 0.0109791551,
    9: 0.0110324873
};

// =====================================================
// BET TYPES
// =====================================================

const BET_TYPES = {
    // Main bets
    PLAYER: 'player',
    BANKER: 'banker',
    TIE: 'tie',
    // Pair bets
    PLAYER_PAIR: 'playerPair',
    BANKER_PAIR: 'bankerPair',
    // Dragon Bonus
    DRAGON_PLAYER: 'dragonPlayer',
    DRAGON_BANKER: 'dragonBanker',
    // Egalité (Tie 0-9)
    EGALITE_0: 'egalite0',
    EGALITE_1: 'egalite1',
    EGALITE_2: 'egalite2',
    EGALITE_3: 'egalite3',
    EGALITE_4: 'egalite4',
    EGALITE_5: 'egalite5',
    EGALITE_6: 'egalite6',
    EGALITE_7: 'egalite7',
    EGALITE_8: 'egalite8',
    EGALITE_9: 'egalite9'
};

// All bet types grouped
const MAIN_BETS = [BET_TYPES.PLAYER, BET_TYPES.BANKER, BET_TYPES.TIE];
const PAIR_BETS = [BET_TYPES.PLAYER_PAIR, BET_TYPES.BANKER_PAIR];
const DRAGON_BETS = [BET_TYPES.DRAGON_PLAYER, BET_TYPES.DRAGON_BANKER];
const EGALITE_BETS = [
    BET_TYPES.EGALITE_0, BET_TYPES.EGALITE_1, BET_TYPES.EGALITE_2,
    BET_TYPES.EGALITE_3, BET_TYPES.EGALITE_4, BET_TYPES.EGALITE_5,
    BET_TYPES.EGALITE_6, BET_TYPES.EGALITE_7, BET_TYPES.EGALITE_8,
    BET_TYPES.EGALITE_9
];

// =====================================================
// RESULT TYPES
// =====================================================

const RESULT_TYPES = {
    PLAYER: 'player',
    BANKER: 'banker',
    TIE: 'tie'
};

// =====================================================
// ANIMATION TIMINGS (ms)
// =====================================================

const TIMING = {
    CARD_DEAL_DELAY: 300,
    CARD_FLIP_DURATION: 400,
    RESULT_DISPLAY: 2000,
    AUTO_DISMISS: 3000
};

// =====================================================
// STORAGE KEYS
// =====================================================

const STORAGE_KEYS = {
    GAME_STATE: 'baccarat_game_mode_state',
    BET_STATE: 'baccarat_game_mode_bets',
    SETTINGS: 'baccarat_game_mode_settings'
};
