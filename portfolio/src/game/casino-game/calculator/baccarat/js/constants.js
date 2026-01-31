// =====================================================
// CONSTANTS & CONFIGURATION
// =====================================================

const TOTAL_DECKS = 8;
const CARDS_PER_DECK = 52;
const TOTAL_CARDS = TOTAL_DECKS * CARDS_PER_DECK;
const CARDS_PER_RANK = TOTAL_DECKS * 4;

const CARD_LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const CARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0, 0, 0];

// Count systems
const MAIN_BET_TAGS = [1, 1, 1, 1, -1, -1, -1, -1, 0, 0, 0, 0, 0];
const DRAGON7_TAGS = [0, 0, 0, -1, -1, -1, -1, 2, 2, 0, 0, 0, 0];
const PANDA8_TAGS = [1, 1, 1, -2, -2, -2, -1, -1, -2, 1, 1, 1, 1];

// Base EVs (8 deck)
const BASE_EV = {
    banker: -0.0106,
    player: -0.0124,
    tie: -0.1436,
    dragon7: -0.0761,
    panda8: -0.1019
};

// Egalité base probabilities (8 deck) - from Wizard of Odds
// Source: https://wizardofodds.com/games/baccarat/side-bets/egalite
// Total combinations: 4,998,398,275,503,360
const EGALITE_COMBINATIONS = {
    0: 28979901420544,   // 0-0 tie combinations
    1: 20499217668352,   // 1-1 tie combinations
    2: 20006606104576,   // 2-2 tie combinations
    3: 22250510129408,   // 3-3 tie combinations
    4: 36294133463040,   // 4-4 tie combinations
    5: 39684046743808,   // 5-5 tie combinations
    6: 96170001308416,   // 6-6 tie combinations
    7: 101717538899968,  // 7-7 tie combinations (most common)
    8: 54879416675072,   // 8-8 tie combinations
    9: 55146054060032    // 9-9 tie combinations
};
const EGALITE_TOTAL_COMBINATIONS = 4998398275503360;

// Exact probabilities calculated from combinations
const EGALITE_BASE_PROB = {
    0: 0.0057978534,  // 0-0 tie (28,979,901,420,544 / total)
    1: 0.0041012676,  // 1-1 tie (20,499,217,668,352 / total)
    2: 0.0040027882,  // 2-2 tie (20,006,606,104,576 / total)
    3: 0.0044516969,  // 3-3 tie (22,250,510,129,408 / total)
    4: 0.0072613513,  // 4-4 tie (36,294,133,463,040 / total)
    5: 0.0079393629,  // 5-5 tie (39,684,046,743,808 / total)
    6: 0.0192398659,  // 6-6 tie (96,170,001,308,416 / total)
    7: 0.0203501471,  // 7-7 tie (101,717,538,899,968 / total) - most common
    8: 0.0109791551,  // 8-8 tie (54,879,416,675,072 / total)
    9: 0.0110324873   // 9-9 tie (55,146,054,060,032 / total)
};

// Default payouts (standard UK casinos)
const DEFAULT_EGALITE_PAYOUTS = {
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
