// =====================================================
// BLACKJACK CONSTANTS & CONFIGURATION
// =====================================================

// Card ranks and values
const CARD_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const CARD_SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];

// Hi-Lo card counting values
const HI_LO_VALUES = {
    'A': -1,
    '2': +1,
    '3': +1,
    '4': +1,
    '5': +1,
    '6': +1,
    '7': 0,
    '8': 0,
    '9': 0,
    '10': -1,
    'J': -1,
    'Q': -1,
    'K': -1
};

// Card blackjack values
const CARD_BJ_VALUES = {
    'A': 11,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 10,
    'Q': 10,
    'K': 10
};

// Game configuration defaults
const DEFAULT_CONFIG = {
    decks: 6,
    dealerStyle: 'american',
    dealerHits: 'S17',
    surrenderAllowed: true,
    doubleAfterSplit: true,
    minBet: 25,
    maxBet: 300
};

// Deck configurations
const DECK_OPTIONS = [1, 2, 4, 6, 8];
const CARDS_PER_DECK = 52;

// Seat configuration
const TOTAL_SEATS = 7;
const SEAT_STATUSES = {
    EMPTY: 'empty',
    OCCUPIED: 'occupied',
    MINE: 'mine'
};

// Action codes
const ACTIONS = {
    HIT: 'H',
    STAND: 'S',
    DOUBLE: 'D',
    SPLIT: 'P',
    SURRENDER_STAND: 'Rs',
    SURRENDER_HIT: 'Rh',
    SURRENDER_SPLIT: 'Rp',
    DOUBLE_STAND: 'Ds'
};

// Action display names
const ACTION_NAMES = {
    'H': 'Hit',
    'S': 'Stand',
    'D': 'Double',
    'P': 'Split',
    'Rs': 'Surrender',
    'Rh': 'Surrender',
    'Rp': 'Surrender',
    'Ds': 'Double'
};

// Base house edge (6-deck, S17, DAS)
const BASE_HOUSE_EDGE = 0.005;

// Edge per true count
const EDGE_PER_TRUE_COUNT = 0.005;

// Kelly criterion fractions
const KELLY_FRACTIONS = {
    conservative: 0.25,
    standard: 0.5,
    aggressive: 1.0
};

// Bet spread by true count
const BET_SPREAD = {
    0: 1,
    1: 2,
    2: 4,
    3: 6,
    4: 8
};

// Game phases
const GAME_PHASES = {
    SETUP: 'setup',
    BETTING: 'betting',
    DEALING: 'dealing',
    PLAYER_ACTION: 'player_action',
    DEALER_ACTION: 'dealer_action',
    RESOLUTION: 'resolution',
    BETWEEN_HANDS: 'between_hands'
};

// Dealer rules
const DEALER_RULE = {
    S17: 'S17',
    H17: 'H17'
};
