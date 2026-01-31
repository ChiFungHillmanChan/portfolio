// =====================================================
// ROULETTE CONSTANTS & CONFIGURATION
// =====================================================

// Roulette type configurations (verified mathematical values)
const ROULETTE_TYPES = {
    european: {
        id: 'european',
        name: 'European',
        totalPockets: 37,
        zeros: [0],
        houseEdge: 1 / 37,  // 0.02702702702... (2.70%)
        // Clockwise sequence starting from 0
        wheelSequence: [
            0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
            24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
        ]
    },
    american: {
        id: 'american',
        name: 'American',
        totalPockets: 38,
        zeros: [0, '00'],
        houseEdge: 2 / 38,  // 0.05263157894... (5.26%)
        topLineEdge: 3 / 38, // 0.07894736842... (7.89%) - worst bet
        // Clockwise sequence starting from 0
        wheelSequence: [
            0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1,
            '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2
        ]
    }
};

// Verified payout ratios (X to 1)
const PAYOUTS = {
    straight: 35,    // 1 number
    split: 17,       // 2 numbers
    street: 11,      // 3 numbers
    trio: 11,        // 3 numbers including zero (0-1-2 or 0-2-3), same payout as street
    corner: 8,       // 4 numbers
    firstFour: 8,    // EU only: 0,1,2,3
    topLine: 6,      // US only: 0,00,1,2,3 (worst house edge)
    line: 5,         // 6 numbers (double street)
    column: 2,       // 12 numbers
    dozen: 2,        // 12 numbers
    evenMoney: 1     // 18 numbers (red/black, even/odd, low/high)
};

// Number of winning pockets for each bet type
const BET_COVERAGE = {
    straight: 1,
    split: 2,
    street: 3,
    trio: 3,         // 3 numbers including zero (0-1-2 or 0-2-3)
    corner: 4,
    firstFour: 4,
    topLine: 5,
    line: 6,
    column: 12,
    dozen: 12,
    red: 18,
    black: 18,
    even: 18,
    odd: 18,
    low: 18,
    high: 18
};

// Number properties - verified color assignments
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const BLACK_NUMBERS = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);

// Pattern explanation:
// Numbers 1-10 and 19-28: Odd = Red, Even = Black
// Numbers 11-18 and 29-36: Odd = Black, Even = Red

// Default game configuration
const DEFAULT_CONFIG = {
    rouletteType: 'european',
    initialStack: 1000,
    minBet: 1,
    maxBet: 500,
    maxBuyIn: 100000000  // 100M
};

// Available chip denominations
const CHIP_DENOMINATIONS = [1, 5, 10, 25, 100, 500, 1000, 5000, 25000, 100000];

// Chip colors for each denomination
const CHIP_COLORS = {
    1: '#ffffff',      // White
    5: '#e63946',      // Red
    10: '#3498db',     // Blue
    25: '#2ecc71',     // Green
    100: '#1a1a1a',    // Black
    500: '#9b59b6',    // Purple
    1000: '#f39c12',   // Orange/Gold
    5000: '#e74c3c',   // Crimson
    25000: '#1abc9c',  // Teal
    100000: '#f1c40f'  // Bright Gold
};

// Game phases
const GAME_PHASES = {
    SETUP: 'setup',
    BETTING: 'betting',
    SPINNING: 'spinning',
    RESULT: 'result',
    GAME_OVER: 'game_over'
};

// Bet types for categorization
const BET_TYPES = {
    // Inside bets
    STRAIGHT: 'straight',
    SPLIT: 'split',
    STREET: 'street',
    TRIO: 'trio',        // 3 numbers including zero (0-1-2 or 0-2-3)
    CORNER: 'corner',
    FIRST_FOUR: 'firstFour',
    TOP_LINE: 'topLine',
    LINE: 'line',
    // Outside bets
    COLUMN: 'column',
    DOZEN: 'dozen',
    RED: 'red',
    BLACK: 'black',
    EVEN: 'even',
    ODD: 'odd',
    LOW: 'low',
    HIGH: 'high'
};

// Table layout - numbers arranged in columns (for rendering)
const TABLE_LAYOUT = {
    // Row 1 (top): 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
    row1: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    // Row 2 (middle): 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35
    row2: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    // Row 3 (bottom): 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
    row3: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
};

// Column definitions (for column bets)
const COLUMNS = {
    1: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
    2: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    3: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]
};

// Dozen definitions
const DOZENS = {
    1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    2: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
    3: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36]
};

// Split bet adjacencies (which numbers can be split)
const SPLIT_ADJACENCIES = {
    // Horizontal splits (same row, adjacent columns)
    horizontal: [],
    // Vertical splits (same column, adjacent rows)
    vertical: []
};

// Generate horizontal splits
for (let col = 1; col <= 11; col++) {
    for (let row = 1; row <= 3; row++) {
        const num1 = (col - 1) * 3 + row;
        const num2 = col * 3 + row;
        SPLIT_ADJACENCIES.horizontal.push([num1, num2]);
    }
}

// Generate vertical splits
for (let col = 1; col <= 12; col++) {
    const base = (col - 1) * 3 + 1;
    SPLIT_ADJACENCIES.vertical.push([base, base + 1]);
    SPLIT_ADJACENCIES.vertical.push([base + 1, base + 2]);
}

// Zero splits (European)
const ZERO_SPLITS_EU = [[0, 1], [0, 2], [0, 3]];

// Zero splits (American - includes 00)
const ZERO_SPLITS_US = [[0, 1], [0, 2], ['00', 2], ['00', 3], [0, '00']];

// Trio bets - 3 numbers including zero, pays 11:1 (same as street)
// These are special bets unique to European roulette
const TRIO_BETS = {
    '0-1-2': [0, 1, 2],
    '0-2-3': [0, 2, 3]
};

// Street definitions (rows of 3)
const STREETS = [];
for (let i = 0; i < 12; i++) {
    STREETS.push([i * 3 + 1, i * 3 + 2, i * 3 + 3]);
}

// Corner definitions (4 adjacent numbers)
const CORNERS = [];
for (let col = 0; col < 11; col++) {
    for (let row = 0; row < 2; row++) {
        const base = col * 3 + row + 1;
        CORNERS.push([base, base + 1, base + 3, base + 4]);
    }
}

// Line definitions (6 numbers - two adjacent streets)
const LINES = [];
for (let i = 0; i < 11; i++) {
    const start = i * 3 + 1;
    LINES.push([start, start + 1, start + 2, start + 3, start + 4, start + 5]);
}

// First Four (European only): 0, 1, 2, 3
const FIRST_FOUR = [0, 1, 2, 3];

// Top Line (American only): 0, 00, 1, 2, 3
const TOP_LINE = [0, '00', 1, 2, 3];

// =====================================================
// FRENCH/CALL BETS - Racetrack betting (European only)
// =====================================================

/**
 * Voisins du Zéro (Neighbours of Zero)
 * Covers 17 numbers: 22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25
 * Uses 9 chips total
 */
const VOISINS_DU_ZERO = {
    name: 'Voisins du Zéro',
    shortName: 'Voisins',
    chips: 9,
    numbers: [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25],
    bets: [
        { type: 'trio', value: '0-2-3', amount: 2 },        // 0/2/3 trio (2 chips) - pays 11:1
        { type: 'split', value: '4-7', amount: 1 },         // 4/7 split
        { type: 'split', value: '12-15', amount: 1 },       // 12/15 split
        { type: 'split', value: '18-21', amount: 1 },       // 18/21 split
        { type: 'split', value: '19-22', amount: 1 },       // 19/22 split
        { type: 'corner', value: '25-26-28-29', amount: 2 }, // 25/26/28/29 corner (2 chips)
        { type: 'split', value: '32-35', amount: 1 }        // 32/35 split
    ]
};

/**
 * Tiers du Cylindre (Thirds of the Wheel)
 * Covers 12 numbers: 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33
 * Uses 6 chips total (6 splits)
 */
const TIERS_DU_CYLINDRE = {
    name: 'Tiers du Cylindre',
    shortName: 'Tiers',
    chips: 6,
    numbers: [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33],
    bets: [
        { type: 'split', value: '5-8', amount: 1 },
        { type: 'split', value: '10-11', amount: 1 },
        { type: 'split', value: '13-16', amount: 1 },
        { type: 'split', value: '23-24', amount: 1 },
        { type: 'split', value: '27-30', amount: 1 },
        { type: 'split', value: '33-36', amount: 1 }
    ]
};

/**
 * Orphelins (Orphans)
 * Covers 8 numbers: 1, 20, 14, 31, 9, 6, 34, 17
 * Uses 5 chips total (1 straight + 4 splits)
 * Note: 17 appears in two splits (14/17 and 17/20)
 */
const ORPHELINS = {
    name: 'Orphelins',
    shortName: 'Orphelins',
    chips: 5,
    numbers: [1, 20, 14, 31, 9, 6, 34, 17],
    bets: [
        { type: 'straight', value: '1', amount: 1 },        // 1 straight up
        { type: 'split', value: '6-9', amount: 1 },         // 6/9 split
        { type: 'split', value: '14-17', amount: 1 },       // 14/17 split
        { type: 'split', value: '17-20', amount: 1 },       // 17/20 split
        { type: 'split', value: '31-34', amount: 1 }        // 31/34 split
    ]
};

/**
 * Jeu Zéro (Zero Game) - Optional smaller version of Voisins
 * Covers 7 numbers: 12, 35, 3, 26, 0, 32, 15
 * Uses 4 chips total
 */
const JEU_ZERO = {
    name: 'Jeu Zéro',
    shortName: 'Zero',
    chips: 4,
    numbers: [12, 35, 3, 26, 0, 32, 15],
    bets: [
        { type: 'split', value: '0-3', amount: 1 },
        { type: 'split', value: '12-15', amount: 1 },
        { type: 'straight', value: '26', amount: 1 },
        { type: 'split', value: '32-35', amount: 1 }
    ]
};

// All call bets for easy iteration
const CALL_BETS = {
    voisins: VOISINS_DU_ZERO,
    tiers: TIERS_DU_CYLINDRE,
    orphelins: ORPHELINS,
    jeuZero: JEU_ZERO
};

// Neighbour bet configuration
const NEIGHBOUR_BET_CONFIG = {
    minNeighbours: 2,
    maxNeighbours: 7,
    defaultNeighbours: 2
};

/**
 * Get neighbours of a number on the wheel
 * @param {number|string} number - The center number
 * @param {number} range - How many neighbours on each side (2-7)
 * @param {array} wheelSequence - The wheel sequence to use
 * @returns {array} Array of numbers including center and neighbours
 */
function getWheelNeighbours(number, range, wheelSequence) {
    const index = wheelSequence.indexOf(number === '00' ? '00' : parseInt(number));
    if (index === -1) return [];
    
    const len = wheelSequence.length;
    const neighbours = [];
    
    // Get neighbours on both sides
    for (let i = -range; i <= range; i++) {
        const neighbourIndex = (index + i + len) % len;
        neighbours.push(wheelSequence[neighbourIndex]);
    }
    
    return neighbours;
}

/**
 * Get the wheel section for a number (for highlighting on racetrack)
 * @param {number|string} number - The number to check
 * @returns {string|null} Section name or null
 */
function getWheelSection(number) {
    const num = number === '00' ? '00' : parseInt(number);
    
    if (VOISINS_DU_ZERO.numbers.includes(num)) return 'voisins';
    if (TIERS_DU_CYLINDRE.numbers.includes(num)) return 'tiers';
    if (ORPHELINS.numbers.includes(num)) return 'orphelins';
    
    return null;
}
