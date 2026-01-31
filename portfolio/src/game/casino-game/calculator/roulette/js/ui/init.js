// =====================================================
// INIT - Bootstrap and component loading
// =====================================================

/**
 * Initialize the roulette application
 */
async function init() {
    try {
        // Load HTML components
        await loadComponents();

        // Initialize event handlers
        initEventHandlers();

        // Initialize chip selector
        renderChipSelector();

        // Check for saved game and auto-continue without prompt
        if (hasSavedGame()) {
            // Automatically restore and continue the game
            if (restoreGameState()) {
                showGameScreen();
                renderPlacedChips();
                console.log('Roulette game restored and continued');
            } else {
                // Failed to restore, start fresh
                showSetupScreen();
            }
        } else {
            showSetupScreen();
        }

        console.log('Roulette initialized successfully');
    } catch (error) {
        console.error('Failed to initialize roulette:', error);
    }
}

/**
 * Show prompt to continue saved game or start new
 */
function showSavedGamePrompt(summary) {
    showSetupScreen();

    // Show saved game info in setup panel
    const savedGameInfo = document.getElementById('savedGameInfo');
    if (savedGameInfo && summary) {
        const profit = summary.profit >= 0 ? '+$' + summary.profit : '-$' + Math.abs(summary.profit);
        const profitClass = summary.profit >= 0 ? 'positive' : 'negative';
        const rouletteLabel = summary.rouletteType === 'european' ? 'European' : 'American';
        const lastPlayed = new Date(summary.lastPlayed).toLocaleDateString();

        savedGameInfo.innerHTML = `
            <div class="saved-game-card">
                <h3 class="saved-game-title">Continue Previous Game?</h3>
                <div class="saved-game-details">
                    <div class="saved-game-row">
                        <span>Type:</span>
                        <span class="font-mono">${rouletteLabel}</span>
                    </div>
                    <div class="saved-game-row">
                        <span>Bankroll:</span>
                        <span class="font-mono text-gold">$${summary.bankroll.toLocaleString()}</span>
                    </div>
                    <div class="saved-game-row">
                        <span>Session Profit:</span>
                        <span class="font-mono ${profitClass}">${profit}</span>
                    </div>
                    <div class="saved-game-row">
                        <span>Total Spins:</span>
                        <span class="font-mono">${summary.totalSpins}</span>
                    </div>
                    <div class="saved-game-row">
                        <span>Last Played:</span>
                        <span class="font-mono text-dim">${lastPlayed}</span>
                    </div>
                </div>
                <div class="saved-game-actions">
                    <button class="btn btn-primary" onclick="continueSavedGame()">Continue Game</button>
                    <button class="btn btn-secondary" onclick="startFreshGame()">New Game</button>
                </div>
            </div>
        `;
        savedGameInfo.classList.remove('hidden');
    }
}

/**
 * Continue with saved game
 */
function continueSavedGame() {
    if (restoreGameState()) {
        // Hide saved game prompt
        const savedGameInfo = document.getElementById('savedGameInfo');
        if (savedGameInfo) savedGameInfo.classList.add('hidden');

        // Show game screen with restored state
        showGameScreen();

        // Re-render placed chips
        renderPlacedChips();
    } else {
        // Failed to restore, start fresh
        startFreshGame();
    }
}

/**
 * Start a fresh game (clears saved data)
 */
function startFreshGame() {
    clearAllStorage();
    resetGameState();
    resetStatsState();
    resetBetState();

    // Hide saved game prompt
    const savedGameInfo = document.getElementById('savedGameInfo');
    if (savedGameInfo) savedGameInfo.classList.add('hidden');

    showSetupScreen();
}

/**
 * Load HTML components
 */
async function loadComponents() {
    const components = [
        { id: 'setup-container', path: 'html/setup-panel.html' },
        { id: 'game-container', path: 'html/game-panel.html' },
        { id: 'stats-container', path: 'html/stats-panel.html' }
    ];
    
    for (const component of components) {
        const container = document.getElementById(component.id);
        if (container) {
            const html = await fetch(component.path).then(r => r.text());
            container.innerHTML = html;
        }
    }
}

/**
 * Show setup screen, hide game screen
 */
function showSetupScreen() {
    const setupScreen = document.getElementById('setupScreen');
    const gameScreen = document.getElementById('gameScreen');
    const statsPanel = document.getElementById('statsPanel');
    const setupContainer = document.getElementById('setup-container');
    const gameContainer = document.getElementById('game-container');
    
    if (setupScreen) setupScreen.classList.remove('hidden');
    if (gameScreen) gameScreen.classList.add('hidden');
    if (statsPanel) statsPanel.classList.add('hidden');
    if (setupContainer) setupContainer.classList.remove('hidden');
    if (gameContainer) gameContainer.classList.add('hidden');
}

/**
 * Show game screen, hide setup screen
 */
function showGameScreen() {
    const setupScreen = document.getElementById('setupScreen');
    const gameScreen = document.getElementById('gameScreen');
    const statsPanel = document.getElementById('statsPanel');
    const setupContainer = document.getElementById('setup-container');
    const gameContainer = document.getElementById('game-container');
    
    if (setupScreen) setupScreen.classList.add('hidden');
    if (gameScreen) gameScreen.classList.remove('hidden');
    if (statsPanel) statsPanel.classList.remove('hidden');
    if (setupContainer) setupContainer.classList.add('hidden');
    if (gameContainer) gameContainer.classList.remove('hidden');
    
    // Render game components
    renderWheel();
    renderBettingTable();
    renderChipSelector();
    renderBankroll();
    renderStats();
    updateButtonStates();
}

/**
 * Show result overlay
 */
function showResult(result, resolution) {
    const overlay = document.getElementById('resultOverlay');
    const numberEl = document.getElementById('resultNumber');
    const textEl = document.getElementById('resultText');
    const amountEl = document.getElementById('resultAmount');
    
    if (!overlay) return;
    
    // Set result number
    const color = getNumberColor(result);
    numberEl.textContent = result;
    numberEl.className = 'result-number ' + color;
    
    // Set result text
    const colorText = color.charAt(0).toUpperCase() + color.slice(1);
    textEl.textContent = colorText + (result !== 0 && result !== '00' ? 
        (isEven(result) ? ' Even' : ' Odd') : '');
    
    // Set amount
    if (resolution.netResult > 0) {
        amountEl.textContent = '+$' + resolution.netResult.toLocaleString();
        amountEl.className = 'result-amount win';
    } else if (resolution.netResult < 0) {
        amountEl.textContent = '-$' + Math.abs(resolution.netResult).toLocaleString();
        amountEl.className = 'result-amount lose';
    } else {
        amountEl.textContent = '$0';
        amountEl.className = 'result-amount';
    }
    
    // Show overlay
    overlay.classList.add('active');
}

/**
 * Hide result overlay
 */
function hideResultOverlay() {
    const overlay = document.getElementById('resultOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

/**
 * Show game over overlay
 */
function showGameOver() {
    const overlay = document.getElementById('gameOverOverlay');
    const stats = getSessionStats();
    
    if (!overlay) return;
    
    // Update stats display
    const totalSpinsEl = document.getElementById('goTotalSpins');
    const totalWageredEl = document.getElementById('goTotalWagered');
    const biggestWinEl = document.getElementById('goBiggestWin');
    
    if (totalSpinsEl) totalSpinsEl.textContent = stats.totalSpins;
    if (totalWageredEl) totalWageredEl.textContent = '$' + stats.totalWagered.toLocaleString();
    if (biggestWinEl) biggestWinEl.textContent = '$' + Math.max(0, stats.biggestWin).toLocaleString();
    
    overlay.classList.add('active');
}

/**
 * Hide game over overlay
 */
function hideGameOverOverlay() {
    const overlay = document.getElementById('gameOverOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

/**
 * Render bankroll display
 */
function renderBankroll() {
    const amountEl = document.getElementById('bankrollAmount');
    const profitEl = document.getElementById('profitAmount');
    const actionBarBankrollEl = document.getElementById('actionBarBankroll');
    
    const currentBankroll = getCurrentBankroll();
    
    if (amountEl) {
        amountEl.textContent = '$' + currentBankroll.toLocaleString();
    }
    
    // Update action bar bankroll (always visible on mobile)
    if (actionBarBankrollEl) {
        actionBarBankrollEl.textContent = '$' + currentBankroll.toLocaleString();
    }
    
    if (profitEl) {
        const profit = getSessionProfit();
        if (profit >= 0) {
            profitEl.textContent = '+$' + profit.toLocaleString();
            profitEl.className = 'positive';
        } else {
            profitEl.textContent = '-$' + Math.abs(profit).toLocaleString();
            profitEl.className = 'negative';
        }
    }
}

/**
 * Render chip selector
 */
function renderChipSelector() {
    const rack = document.getElementById('chipRack');
    if (!rack) return;
    
    const available = getAvailableChips();
    const selected = getSelectedChip();
    
    rack.innerHTML = CHIP_DENOMINATIONS.map(value => {
        const isAvailable = available.includes(value);
        const isSelected = value === selected;
        
        return `
            <button class="chip chip-${value} ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}"
                    data-value="${value}"
                    ${!isAvailable ? 'disabled' : ''}
                    onclick="handleChipSelect(${value})">
                ${value >= 1000 ? (value / 1000) + 'K' : value}
            </button>
        `;
    }).join('');
}

/**
 * Render statistics panel
 */
function renderStats() {
    renderHistoryDisplay();
    renderHotNumbers();
    renderColdNumbers();
    renderDistribution();
    renderStreaks();
    renderSessionStats();
}

/**
 * Render history display
 */
function renderHistoryDisplay() {
    const container = document.getElementById('historyNumbers');
    if (!container) return;
    
    const history = getRecentHistory(20);
    
    if (history.length === 0) {
        container.innerHTML = '<div class="text-dim text-center">No spins yet</div>';
        return;
    }
    
    container.innerHTML = history.map(spin => `
        <span class="history-number ${spin.color}">${spin.number}</span>
    `).join('');
}

/**
 * Render hot numbers
 */
function renderHotNumbers() {
    const container = document.getElementById('hotNumbersList');
    if (!container) return;
    
    const hot = getHotNumbers(5);
    
    if (hot.length === 0) {
        container.innerHTML = '<div class="text-dim text-center">No data yet</div>';
        return;
    }
    
    container.innerHTML = hot.map((item, index) => {
        const color = getNumberColor(item.number);
        return `
            <div class="hot-number-item">
                <span class="hot-rank">${index + 1}</span>
                <span class="number-badge ${color}">${item.number}</span>
                <span class="hit-count">${item.hits} hits</span>
            </div>
        `;
    }).join('');
}

/**
 * Render cold numbers
 */
function renderColdNumbers() {
    const container = document.getElementById('coldNumbersList');
    if (!container) return;
    
    const cold = getColdNumbers(5);
    
    if (cold.length === 0 || statsState.session.totalSpins === 0) {
        container.innerHTML = '<div class="text-dim text-center">No data yet</div>';
        return;
    }
    
    container.innerHTML = cold.map((item, index) => {
        const color = getNumberColor(item.number);
        return `
            <div class="cold-number-item">
                <span class="cold-rank">${index + 1}</span>
                <span class="number-badge ${color}">${item.number}</span>
                <span class="spins-since">${item.spinsSince} spins ago</span>
            </div>
        `;
    }).join('');
}

/**
 * Render distribution bars
 */
function renderDistribution() {
    const dist = statsState.distribution;
    const total = statsState.session.totalSpins;
    
    if (total === 0) return;
    
    // Red/Black
    const redPct = (dist.red / total) * 100;
    const blackPct = (dist.black / total) * 100;
    document.getElementById('redFill')?.style.setProperty('width', redPct + '%');
    document.getElementById('blackFill')?.style.setProperty('width', blackPct + '%');
    document.getElementById('redBlackRatio').textContent = `${dist.red} - ${dist.black}`;
    
    // Even/Odd
    const evenPct = (dist.even / total) * 100;
    const oddPct = (dist.odd / total) * 100;
    document.getElementById('evenFill')?.style.setProperty('width', evenPct + '%');
    document.getElementById('oddFill')?.style.setProperty('width', oddPct + '%');
    document.getElementById('evenOddRatio').textContent = `${dist.even} - ${dist.odd}`;
    
    // Low/High
    const lowPct = (dist.low / total) * 100;
    const highPct = (dist.high / total) * 100;
    document.getElementById('lowFill')?.style.setProperty('width', lowPct + '%');
    document.getElementById('highFill')?.style.setProperty('width', highPct + '%');
    document.getElementById('lowHighRatio').textContent = `${dist.low} - ${dist.high}`;
    
    // Dozens
    const d1Pct = (dist.dozen1 / total) * 100;
    const d2Pct = (dist.dozen2 / total) * 100;
    const d3Pct = (dist.dozen3 / total) * 100;
    document.getElementById('dozen1Fill')?.style.setProperty('width', d1Pct + '%');
    document.getElementById('dozen2Fill')?.style.setProperty('width', d2Pct + '%');
    document.getElementById('dozen3Fill')?.style.setProperty('width', d3Pct + '%');
    document.getElementById('dozen1Count').textContent = dist.dozen1;
    document.getElementById('dozen2Count').textContent = dist.dozen2;
    document.getElementById('dozen3Count').textContent = dist.dozen3;
}

/**
 * Render streaks
 */
function renderStreaks() {
    const streaks = getCurrentStreaks();
    
    const colorEl = document.getElementById('colorStreak');
    const parityEl = document.getElementById('parityStreak');
    const rangeEl = document.getElementById('rangeStreak');
    
    if (colorEl && streaks.color.type) {
        colorEl.textContent = `${streaks.color.current} ${streaks.color.type} (longest: ${streaks.color.longest})`;
    }
    
    if (parityEl && streaks.parity.type) {
        parityEl.textContent = `${streaks.parity.current} ${streaks.parity.type} (longest: ${streaks.parity.longest})`;
    }
    
    if (rangeEl && streaks.range.type) {
        rangeEl.textContent = `${streaks.range.current} ${streaks.range.type} (longest: ${streaks.range.longest})`;
    }
}

/**
 * Render session stats
 */
function renderSessionStats() {
    const stats = getSessionStats();
    
    document.getElementById('totalSpins').textContent = stats.totalSpins;
    document.getElementById('totalWagered').textContent = '$' + stats.totalWagered.toLocaleString();
    document.getElementById('totalWon').textContent = '$' + stats.totalWon.toLocaleString();
    
    const netEl = document.getElementById('netProfit');
    if (netEl) {
        if (stats.netProfit >= 0) {
            netEl.textContent = '+$' + stats.netProfit.toLocaleString();
            netEl.className = 'info-value font-mono positive';
        } else {
            netEl.textContent = '-$' + Math.abs(stats.netProfit).toLocaleString();
            netEl.className = 'info-value font-mono negative';
        }
    }
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', init);
