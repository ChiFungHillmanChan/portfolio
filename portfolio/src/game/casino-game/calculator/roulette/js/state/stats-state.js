// =====================================================
// STATS STATE - Statistics tracking and analysis
// =====================================================

let statsState = createInitialStatsState();

/**
 * Create initial stats state
 * @returns {object} Fresh stats state object
 */
function createInitialStatsState() {
    return {
        // Spin history (most recent first)
        history: [],
        
        // Number frequency tracking
        numberFrequency: {},
        
        // Streak tracking
        colorStreak: { current: 0, longest: 0, type: null },
        parityStreak: { current: 0, longest: 0, type: null },   // even/odd
        rangeStreak: { current: 0, longest: 0, type: null },    // low/high
        
        // Distribution counters
        distribution: {
            red: 0,
            black: 0,
            green: 0,
            even: 0,
            odd: 0,
            low: 0,
            high: 0,
            column1: 0,
            column2: 0,
            column3: 0,
            dozen1: 0,
            dozen2: 0,
            dozen3: 0
        },
        
        // Session statistics
        session: {
            totalSpins: 0,
            totalWagered: 0,
            totalWon: 0,
            netProfit: 0,
            biggestWin: 0,
            biggestLoss: 0
        },
        
        // Cold numbers tracking (spins since last hit)
        spinsSinceHit: {}
    };
}

/**
 * Reset stats state
 */
function resetStatsState() {
    statsState = createInitialStatsState();
}

/**
 * Record a spin result
 * @param {number|string} result - The winning number
 * @param {number} wagered - Amount wagered
 * @param {number} won - Amount won (including returned bets)
 */
function recordSpin(result, wagered, won) {
    const color = getNumberColor(result);
    const parity = isEven(result) ? 'even' : (isOdd(result) ? 'odd' : null);
    const range = isLow(result) ? 'low' : (isHigh(result) ? 'high' : null);
    const column = getColumn(result);
    const dozen = getDozen(result);
    
    // Add to history
    statsState.history.unshift({
        number: result,
        color: color,
        parity: parity,
        range: range,
        column: column,
        dozen: dozen,
        timestamp: Date.now()
    });
    
    // Update number frequency
    const key = result.toString();
    statsState.numberFrequency[key] = (statsState.numberFrequency[key] || 0) + 1;
    
    // Update distribution counters
    statsState.distribution[color]++;
    if (parity) statsState.distribution[parity]++;
    if (range) statsState.distribution[range]++;
    if (column) statsState.distribution[`column${column}`]++;
    if (dozen) statsState.distribution[`dozen${dozen}`]++;
    
    // Update streaks
    updateStreak('colorStreak', color, color !== 'green');
    updateStreak('parityStreak', parity, parity !== null);
    updateStreak('rangeStreak', range, range !== null);
    
    // Update session stats
    statsState.session.totalSpins++;
    statsState.session.totalWagered += wagered;
    statsState.session.totalWon += won;
    statsState.session.netProfit = statsState.session.totalWon - statsState.session.totalWagered;
    
    const spinResult = won - wagered;
    if (spinResult > statsState.session.biggestWin) {
        statsState.session.biggestWin = spinResult;
    }
    if (spinResult < statsState.session.biggestLoss) {
        statsState.session.biggestLoss = spinResult;
    }
    
    // Update cold numbers tracking
    updateColdNumbers(result);

    // Save to localStorage
    if (typeof saveStatsStateToStorage === 'function') {
        saveStatsStateToStorage();
    }
}

/**
 * Record a spin result for statistics only (no wagering)
 * Used for simulating casino history before player starts betting
 * @param {number|string} result - The winning number
 */
function recordSpinOnly(result) {
    const color = getNumberColor(result);
    const parity = isEven(result) ? 'even' : (isOdd(result) ? 'odd' : null);
    const range = isLow(result) ? 'low' : (isHigh(result) ? 'high' : null);
    const column = getColumn(result);
    const dozen = getDozen(result);
    
    // Add to history
    statsState.history.unshift({
        number: result,
        color: color,
        parity: parity,
        range: range,
        column: column,
        dozen: dozen,
        timestamp: Date.now(),
        simulated: true  // Mark as simulated
    });
    
    // Update number frequency
    const key = result.toString();
    statsState.numberFrequency[key] = (statsState.numberFrequency[key] || 0) + 1;
    
    // Update distribution counters
    statsState.distribution[color]++;
    if (parity) statsState.distribution[parity]++;
    if (range) statsState.distribution[range]++;
    if (column) statsState.distribution[`column${column}`]++;
    if (dozen) statsState.distribution[`dozen${dozen}`]++;
    
    // Update streaks
    updateStreak('colorStreak', color, color !== 'green');
    updateStreak('parityStreak', parity, parity !== null);
    updateStreak('rangeStreak', range, range !== null);
    
    // Update spin count only (no money tracking for simulated spins)
    statsState.session.totalSpins++;
    
    // Update cold numbers tracking
    updateColdNumbers(result);
}

/**
 * Update streak tracking
 * @param {string} streakType - Which streak to update
 * @param {string} value - Current value
 * @param {boolean} isValid - Whether this counts for streak
 */
function updateStreak(streakType, value, isValid) {
    const streak = statsState[streakType];
    
    if (!isValid) {
        // Green doesn't break or continue streaks, just skip
        return;
    }
    
    if (streak.type === value) {
        // Continue streak
        streak.current++;
        if (streak.current > streak.longest) {
            streak.longest = streak.current;
        }
    } else {
        // New streak
        streak.current = 1;
        streak.type = value;
        if (streak.longest === 0) {
            streak.longest = 1;
        }
    }
}

/**
 * Update cold numbers tracking
 * @param {number|string} hitNumber - The number that just hit
 */
function updateColdNumbers(hitNumber) {
    // Increment all numbers
    for (const key of Object.keys(statsState.spinsSinceHit)) {
        statsState.spinsSinceHit[key]++;
    }
    
    // Reset the hit number
    statsState.spinsSinceHit[hitNumber.toString()] = 0;
    
    // Initialize any numbers we haven't seen yet
    const rouletteConfig = getRouletteConfig();
    for (const num of rouletteConfig.wheelSequence) {
        const key = num.toString();
        if (statsState.spinsSinceHit[key] === undefined) {
            statsState.spinsSinceHit[key] = statsState.session.totalSpins;
        }
    }
}

/**
 * Get hot numbers (most frequent)
 * @param {number} count - How many to return
 * @returns {array} Array of { number, hits } sorted by frequency
 */
function getHotNumbers(count = 5) {
    const entries = Object.entries(statsState.numberFrequency);
    return entries
        .map(([number, hits]) => ({ number: number === '00' ? '00' : parseInt(number), hits }))
        .sort((a, b) => b.hits - a.hits)
        .slice(0, count);
}

/**
 * Get cold numbers (least frequent or longest since hit)
 * @param {number} count - How many to return
 * @returns {array} Array of { number, spinsSince } sorted by coldness
 */
function getColdNumbers(count = 5) {
    const entries = Object.entries(statsState.spinsSinceHit);
    return entries
        .map(([number, spins]) => ({ number: number === '00' ? '00' : parseInt(number), spinsSince: spins }))
        .sort((a, b) => b.spinsSince - a.spinsSince)
        .slice(0, count);
}

/**
 * Get recent history
 * @param {number} count - How many results to return
 * @returns {array} Recent spin results
 */
function getRecentHistory(count = 20) {
    return statsState.history.slice(0, count);
}

/**
 * Get full history
 * @returns {array} All spin results
 */
function getFullHistory() {
    return [...statsState.history];
}

/**
 * Get distribution percentages
 * @returns {object} Distribution as percentages
 */
function getDistributionPercentages() {
    const total = statsState.session.totalSpins;
    if (total === 0) return null;
    
    const percentages = {};
    for (const [key, value] of Object.entries(statsState.distribution)) {
        percentages[key] = (value / total) * 100;
    }
    
    return percentages;
}

/**
 * Get current streak info
 * @returns {object} Current streaks
 */
function getCurrentStreaks() {
    return {
        color: { ...statsState.colorStreak },
        parity: { ...statsState.parityStreak },
        range: { ...statsState.rangeStreak }
    };
}

/**
 * Get session statistics
 * @returns {object} Session stats
 */
function getSessionStats() {
    return { ...statsState.session };
}

/**
 * Get number frequency for a specific number
 * @param {number|string} number - The number to check
 * @returns {number} Hit count
 */
function getNumberHits(number) {
    return statsState.numberFrequency[number.toString()] || 0;
}

/**
 * Calculate expected vs actual for a category
 * @param {string} category - Distribution category (e.g., 'red', 'column1')
 * @param {number} expectedPercent - Expected percentage
 * @returns {object} Comparison data
 */
function getExpectedVsActual(category, expectedPercent) {
    const total = statsState.session.totalSpins;
    if (total === 0) return null;
    
    const actual = statsState.distribution[category] || 0;
    const actualPercent = (actual / total) * 100;
    const expected = (expectedPercent / 100) * total;
    
    return {
        actual: actual,
        expected: Math.round(expected * 10) / 10,
        actualPercent: Math.round(actualPercent * 100) / 100,
        expectedPercent: expectedPercent,
        deviation: Math.round((actualPercent - expectedPercent) * 100) / 100
    };
}
