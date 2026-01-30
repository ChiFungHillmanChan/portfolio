// =====================================================
// EVENT HANDLERS - All click/touch event bindings
// =====================================================

// Auto-spin state
let autoSpinState = {
    enabled: false,
    interval: null,
    countdown: 0,
    duration: 30, // default 30 seconds
    countdownInterval: null
};

// Auto-repeat state
let autoRepeatState = {
    enabled: false,
    remaining: 0,      // 0 = forever, positive = count remaining
    isForever: false,
    betsSnapshot: null // Store bets to repeat
};

// Result auto-dismiss state
let resultDismissTimeout = null;
let resultProgressInterval = null;

/**
 * Initialize all event handlers
 */
function initEventHandlers() {
    // Header menu handlers
    initHamburgerMenu();

    // Setup form handlers
    initSetupHandlers();

    // Game control handlers
    initGameControlHandlers();

    // Betting table handlers (initialized after table is rendered)
    // initBettingTableHandlers();

    // Stats panel handlers
    initStatsHandlers();

    // Auto-spin handlers
    initAutoSpinHandlers();
    
    // Auto-repeat handlers
    initAutoRepeatHandlers();

    // Chip preview for touch devices
    initChipPreviewHandlers();
    
    // Betting tab handlers (Table/Racetrack switcher)
    initBettingTabHandlers();
}

// =====================================================
// VIEW TOGGLE HANDLERS (Table / Table+Racetrack Switcher)
// =====================================================

/**
 * Initialize view toggle button handler
 */
function initBettingTabHandlers() {
    const toggleBtn = document.getElementById('viewToggleBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', handleViewToggle);
    }
}

/**
 * Handle toggling between Table-only and Table+Racetrack views
 */
function handleViewToggle() {
    const bettingInterface = document.getElementById('bettingInterface');
    const racetrackContainer = document.getElementById('racetrackContainer');
    
    if (!bettingInterface) return;
    
    const isRacetrackMode = bettingInterface.classList.contains('racetrack-mode');
    
    if (isRacetrackMode) {
        // Switch to table-only mode
        bettingInterface.classList.remove('racetrack-mode');
    } else {
        // Switch to racetrack mode (table + racetrack)
        bettingInterface.classList.add('racetrack-mode');
        
        // Render racetrack if not already rendered
        if (racetrackContainer && !racetrackContainer.dataset.rendered) {
            renderRacetrack();
            racetrackContainer.dataset.rendered = 'true';
        }
    }
}

/**
 * Check if racetrack view is active
 * @returns {boolean} True if racetrack mode is active
 */
function isRacetrackModeActive() {
    const bettingInterface = document.getElementById('bettingInterface');
    return bettingInterface && bettingInterface.classList.contains('racetrack-mode');
}

/**
 * Get current betting view mode
 * @returns {string} 'table' or 'racetrack'
 */
function getCurrentBettingTab() {
    return isRacetrackModeActive() ? 'racetrack' : 'table';
}

/**
 * Initialize hamburger menu functionality
 */
function initHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (!hamburgerBtn || !dropdownMenu) return;

    // Toggle menu on hamburger click
    hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdownMenu();
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdownMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            closeDropdownMenu();
        }
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDropdownMenu();
        }
    });
}

/**
 * Toggle dropdown menu open/closed
 */
function toggleDropdownMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (!hamburgerBtn || !dropdownMenu) return;

    const isOpen = dropdownMenu.classList.contains('open');

    if (isOpen) {
        closeDropdownMenu();
    } else {
        openDropdownMenu();
    }
}

/**
 * Open dropdown menu
 */
function openDropdownMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (!hamburgerBtn || !dropdownMenu) return;

    hamburgerBtn.setAttribute('aria-expanded', 'true');
    dropdownMenu.classList.add('open');
    dropdownMenu.setAttribute('aria-hidden', 'false');
}

/**
 * Close dropdown menu
 */
function closeDropdownMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (!hamburgerBtn || !dropdownMenu) return;

    hamburgerBtn.setAttribute('aria-expanded', 'false');
    dropdownMenu.classList.remove('open');
    dropdownMenu.setAttribute('aria-hidden', 'true');
}

/**
 * Setup screen event handlers
 */
function initSetupHandlers() {
    // Roulette type radio buttons
    const typeRadios = document.querySelectorAll('input[name="rouletteType"]');
    typeRadios.forEach(radio => {
        radio.addEventListener('change', handleRouletteTypeChange);
    });
    
    // Stack preset buttons
    const presetBtns = document.querySelectorAll('#stackPresets .preset-btn');
    presetBtns.forEach(btn => {
        btn.addEventListener('click', handleStackPresetClick);
    });
    
    // Custom stack input
    const customStack = document.getElementById('customStack');
    if (customStack) {
        customStack.addEventListener('input', handleCustomStackInput);
    }
    
    // Setup form submission
    const setupForm = document.getElementById('setupForm');
    if (setupForm) {
        setupForm.addEventListener('submit', handleSetupSubmit);
    }
}

/**
 * Handle roulette type change
 */
function handleRouletteTypeChange(e) {
    const type = e.target.value;
    const infoEl = document.getElementById('houseEdgeInfo');
    
    if (type === 'european') {
        infoEl.textContent = 'European roulette has a 2.70% house edge due to the single zero. All standard bets have the same expected return of -2.70%.';
    } else {
        infoEl.textContent = 'American roulette has a 5.26% house edge due to the double zero (0 and 00). The "Top Line" bet has the worst odds at 7.89% house edge.';
    }
}

/**
 * Handle stack preset button click
 */
function handleStackPresetClick(e) {
    const btn = e.target;
    const value = parseInt(btn.dataset.value);
    
    // Update active state
    document.querySelectorAll('#stackPresets .preset-btn').forEach(b => {
        b.classList.remove('active');
    });
    btn.classList.add('active');
    
    // Clear custom input
    const customInput = document.getElementById('customStack');
    if (customInput) {
        customInput.value = '';
    }
}

/**
 * Handle custom stack input
 */
function handleCustomStackInput(e) {
    const value = e.target.value;
    
    if (value) {
        // Clear preset selection
        document.querySelectorAll('#stackPresets .preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }
}

/**
 * Handle setup form submission
 */
function handleSetupSubmit(e) {
    e.preventDefault();
    
    // Get form values
    const rouletteType = document.querySelector('input[name="rouletteType"]:checked').value;
    const customStack = document.getElementById('customStack').value;
    const activePreset = document.querySelector('#stackPresets .preset-btn.active');
    const minBet = parseInt(document.getElementById('minBet').value);
    const maxBet = parseInt(document.getElementById('maxBet').value);
    
    // Determine stack value
    let initialStack;
    if (customStack) {
        initialStack = parseInt(customStack);
    } else if (activePreset) {
        initialStack = parseInt(activePreset.dataset.value);
    } else {
        initialStack = 1000; // Default
    }
    
    // Validate
    if (initialStack < minBet) {
        alert('Starting bankroll must be at least the minimum bet.');
        return;
    }
    
    if (minBet >= maxBet) {
        alert('Maximum bet must be greater than minimum bet.');
        return;
    }
    
    // Start game with config
    const config = {
        rouletteType,
        initialStack,
        minBet,
        maxBet
    };
    
    startGame(config);
    
    // Switch to game screen
    showGameScreen();
}

/**
 * Game control event handlers
 */
function initGameControlHandlers() {
    // Spin button
    const spinBtn = document.getElementById('spinBtn');
    if (spinBtn) {
        spinBtn.addEventListener('click', handleSpinClick);
    }
    
    // Clear bets button
    const clearBtn = document.getElementById('clearBetsBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClearBets);
    }
    
    // Undo button
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) {
        undoBtn.addEventListener('click', handleUndo);
    }
    
    // Repeat button
    const repeatBtn = document.getElementById('repeatBtn');
    if (repeatBtn) {
        repeatBtn.addEventListener('click', handleRepeatBets);
    }
    
    // Double bets button
    const doubleBtn = document.getElementById('doubleBtn');
    if (doubleBtn) {
        doubleBtn.addEventListener('click', handleDoubleBets);
    }
    
    // Skip button (simulate 100 spins)
    const skipBtn = document.getElementById('skipBtn');
    if (skipBtn) {
        skipBtn.addEventListener('click', handleSkipSpins);
    }
    
    // Result overlay buttons
    const newBetsBtn = document.getElementById('newBetsBtn');
    if (newBetsBtn) {
        newBetsBtn.addEventListener('click', handleNewBets);
    }
    
    const sameBetsBtn = document.getElementById('sameBetsBtn');
    if (sameBetsBtn) {
        sameBetsBtn.addEventListener('click', handleSameBets);
    }
    
    // Game over - new game button
    const newGameBtn = document.getElementById('newGameBtn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', handleNewGame);
    }
}

/**
 * Handle spin button click
 */
function handleSpinClick() {
    if (isSpinning()) return;
    
    // Store current bets for repeat feature
    // IMPORTANT: Always store the current bets (even if empty/null)
    // This ensures "Repeat" only repeats the LAST spin's bets, not older bets
    if (hasBets()) {
        storeLastBets(getAllBets());
    } else {
        // Clear last bets if user spins without placing any bets
        clearLastBets();
    }
    
    // Stop auto-spin countdown if running
    stopAutoSpinCountdown();
    
    // Clear previous winning marker before new spin
    if (isWinningMarkerVisible()) {
        clearWinningHighlight();
    }
    
    // Disable betting during spin
    setGamePhase(GAME_PHASES.SPINNING);
    updateButtonStates();
    
    // Show "No More Bets" overlay
    showNoMoreBets();
    
    // Generate spin and animate
    const rouletteConfig = getRouletteConfig();
    const spinData = generateSpinData(rouletteConfig.wheelSequence);
    setSpinData(spinData);
    
    // Start wheel animation
    animateWheelSpin(spinData, () => {
        // Hide "No More Bets" overlay
        hideNoMoreBets();
        
        // Animation complete - resolve bets
        const resolution = resolveAllBets(spinData.result, getAllBets(), gameState.config.rouletteType);
        
        // Record in stats
        recordSpin(spinData.result, resolution.totalWagered, resolution.totalWinnings);
        
        // Update bankroll
        updateBankroll(resolution.netResult);
        
        // Clear bets after resolution
        clearAllBets();
        
        // Clear spin state
        clearSpinData();
        
        // Update displays
        renderBankroll();
        renderStats();
        renderPlacedChips(); // Clear chips from table
        
        // Check for game over (bankroll <= 0 after the round)
        if (isBankrupt()) {
            // Show result briefly, then show game over
            showResult(spinData.result, resolution);
            setGamePhase(GAME_PHASES.GAME_OVER);
            
            // Clear localStorage immediately - game is over
            // This ensures navigating away won't restore a bust game
            clearAllStorage();
            
            // After a short delay, show game over overlay
            setTimeout(() => {
                hideResultOverlay();
                showGameOver();
            }, 2000);
        } else {
            // Normal result display with auto-dismiss
            showResultWithAutoDismiss(spinData.result, resolution);
            setGamePhase(GAME_PHASES.RESULT);
        }
    });
}

/**
 * Handle clear bets button
 */
function handleClearBets() {
    clearAllBets();
    renderPlacedChips();
    updateTotalBetDisplay();
    updateButtonStates();
}

/**
 * Handle undo button (remove last bet)
 */
function handleUndo() {
    if (getGamePhase() !== GAME_PHASES.BETTING) return;

    if (undoLastBet()) {
        renderPlacedChips();
        updateTotalBetDisplay();
        updateButtonStates();
    }
}

/**
 * Handle skip button - simulate 100 random spins for statistics
 * This simulates casino history without affecting bankroll
 */
function handleSkipSpins() {
    if (getGamePhase() !== GAME_PHASES.BETTING) return;
    
    const skipBtn = document.getElementById('skipBtn');
    if (skipBtn) {
        skipBtn.disabled = true;
        skipBtn.textContent = 'Simulating...';
    }
    
    const rouletteConfig = getRouletteConfig();
    const wheelSequence = rouletteConfig.wheelSequence;
    
    // Simulate 100 spins
    let simulated = 0;
    const totalToSimulate = 100;
    
    // Use small batches to allow UI updates
    function simulateBatch() {
        const batchSize = 10;
        for (let i = 0; i < batchSize && simulated < totalToSimulate; i++) {
            // Generate random result
            const result = generateRandomResult(wheelSequence);
            
            // Record in stats (no wagering, just the spin result)
            recordSpinOnly(result);
            
            simulated++;
        }
        
        // Update stats display
        renderStats();
        
        if (simulated < totalToSimulate) {
            // Continue with next batch
            setTimeout(simulateBatch, 10);
        } else {
            // Done
            if (skipBtn) {
                skipBtn.disabled = false;
                skipBtn.textContent = 'Skip 100';
            }
        }
    }
    
    // Start simulation
    simulateBatch();
}

/**
 * Handle repeat bets button
 */
function handleRepeatBets() {
    const lastBets = getLastBets();
    if (!lastBets) return;
    
    const success = restoreBets(lastBets, getCurrentBankroll());
    if (success) {
        renderPlacedChips();
        updateTotalBetDisplay();
        updateButtonStates();
    } else {
        alert('Cannot afford to repeat last bets.');
    }
}

/**
 * Handle double bets button (x2)
 */
function handleDoubleBets() {
    if (getGamePhase() !== GAME_PHASES.BETTING) return;
    if (!hasBets()) return;
    
    const success = doubleAllBets(getCurrentBankroll());
    if (success) {
        renderPlacedChips();
        updateTotalBetDisplay();
        updateButtonStates();
    } else {
        alert('Cannot afford to double bets.');
    }
}

/**
 * Handle new bets after result
 */
function handleNewBets() {
    // Clear any pending auto-dismiss
    if (resultDismissTimeout) clearTimeout(resultDismissTimeout);
    if (resultProgressInterval) clearInterval(resultProgressInterval);
    
    hideResultOverlay();
    clearAllBets();
    renderPlacedChips();
    updateTotalBetDisplay();
    setGamePhase(GAME_PHASES.BETTING);
    
    // Stop auto-repeat when user chooses new bets
    if (isAutoRepeatEnabled()) {
        stopAutoRepeat();
    }
    
    updateButtonStates();
    
    // Restart auto-spin countdown if enabled
    if (autoSpinState.enabled) {
        startAutoSpinCountdown();
    }
}

/**
 * Handle same bets after result
 */
function handleSameBets() {
    // Clear any pending auto-dismiss
    if (resultDismissTimeout) clearTimeout(resultDismissTimeout);
    if (resultProgressInterval) clearInterval(resultProgressInterval);
    
    hideResultOverlay();
    
    // Process auto-repeat if enabled (this handles bet restoration)
    if (isAutoRepeatEnabled()) {
        processAutoRepeat();
        renderPlacedChips();
        updateTotalBetDisplay();
    } else {
        const lastBets = getLastBets();
        if (lastBets && restoreBets(lastBets, getCurrentBankroll())) {
            renderPlacedChips();
            updateTotalBetDisplay();
        } else {
            clearAllBets();
            renderPlacedChips();
            updateTotalBetDisplay();
        }
    }
    
    setGamePhase(GAME_PHASES.BETTING);
    updateButtonStates();
    
    // Restart auto-spin countdown if enabled
    if (autoSpinState.enabled) {
        startAutoSpinCountdown();
    }
}

/**
 * Handle new game from game over
 */
function handleNewGame() {
    hideGameOverOverlay();
    showSetupScreen();
    resetGameState();
    resetBetState();
    resetStatsState();
    
    // Stop any auto-repeat
    if (isAutoRepeatEnabled()) {
        stopAutoRepeat();
    }
}

/**
 * Stats panel event handlers
 */
function initStatsHandlers() {
    // Collapsible sections
    const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
    collapsibleHeaders.forEach(header => {
        header.addEventListener('click', handleCollapsibleToggle);
    });

    // Mobile tab bar handlers
    initMobileTabHandlers();
}

/**
 * Initialize mobile tab bar handlers
 */
function initMobileTabHandlers() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', handleTabSwitch);
    });
}

/**
 * Handle mobile tab switching between Game and Stats
 */
function handleTabSwitch(e) {
    const btn = e.currentTarget;
    const tab = btn.dataset.tab;

    // Update button states
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
    });
    btn.classList.add('active');

    // Get elements
    const gameArea = document.getElementById('gameArea');
    const statsPanel = document.getElementById('statsPanel');
    const actionBar = document.getElementById('actionBar');
    const chipSelector = document.getElementById('chipSelector');
    const mobileTopStack = document.getElementById('mobileTopStack');
    const gameScreen = document.getElementById('gameScreen');
    const statsContainer = document.getElementById('stats-container');

    if (tab === 'game') {
        // Show game, hide stats
        if (gameArea) gameArea.classList.remove('tab-hidden');
        if (statsPanel) statsPanel.classList.remove('tab-active');
        if (statsContainer) statsContainer.classList.remove('active');
        if (actionBar) actionBar.style.display = '';
        if (chipSelector) chipSelector.style.display = '';

        // Move bankroll + tabs back to game screen (at the beginning)
        if (gameScreen && mobileTopStack) {
            gameScreen.insertBefore(mobileTopStack, gameScreen.firstChild);
        }
    } else if (tab === 'stats') {
        // Show stats, hide game
        if (gameArea) gameArea.classList.add('tab-hidden');
        if (statsPanel) statsPanel.classList.add('tab-active');
        if (statsContainer) statsContainer.classList.add('active');
        if (actionBar) actionBar.style.display = 'none';
        if (chipSelector) chipSelector.style.display = 'none';

        // Move bankroll + tabs to stats container (at the beginning)
        if (statsContainer && mobileTopStack) {
            statsContainer.insertBefore(mobileTopStack, statsContainer.firstChild);
        }
    }
}

/**
 * Handle collapsible section toggle
 */
function handleCollapsibleToggle(e) {
    const header = e.currentTarget;
    const section = header.dataset.section;
    const content = document.getElementById(`${section}Content`);
    const toggle = header.querySelector('.collapsible-toggle');
    
    if (content) {
        content.classList.toggle('open');
        toggle.textContent = content.classList.contains('open') ? '▲' : '▼';
    }
}

/**
 * Handle chip selection
 */
function handleChipSelect(value) {
    setSelectedChip(value);
    renderChipSelector();
}

/**
 * Handle bet placement on table
 */
function handleBetPlacement(betType, betValue, e) {
    if (getGamePhase() !== GAME_PHASES.BETTING) return;
    
    // Remove winning marker when user starts placing new bets
    if (isWinningMarkerVisible()) {
        clearWinningHighlight();
    }
    
    const chipValue = getSelectedChip();
    const totalWagered = getTotalWagered();
    const currentBankroll = getCurrentBankroll();
    const remainingBankroll = currentBankroll - totalWagered;
    
    // Check if can afford this bet
    if (!canAffordBet(chipValue, currentBankroll, totalWagered)) {
        // Try to find a smaller chip that we can afford
        const available = getAvailableChips();
        const affordable = available.filter(c => canAffordBet(c, currentBankroll, totalWagered));
        
        if (affordable.length === 0) {
            // Can't afford any bet - show visual feedback
            showBetError('Cannot place bet - bankroll limit reached');
            return;
        }
        
        // Auto-select largest affordable chip and place bet
        const largestAffordable = Math.max(...affordable);
        setSelectedChip(largestAffordable);
        renderChipSelector();
        
        // Place the bet with the affordable chip
        addBet(betType, betValue, largestAffordable);
    } else {
        // Add the bet with selected chip
        addBet(betType, betValue, chipValue);
    }
    
    // Update display
    renderPlacedChips();
    updateTotalBetDisplay();
    updateButtonStates();
}

/**
 * Show bet error message briefly
 */
function showBetError(message) {
    // Check if error element exists, create if not
    let errorEl = document.getElementById('betError');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.id = 'betError';
        errorEl.className = 'bet-error-message';
        document.body.appendChild(errorEl);
    }
    
    errorEl.textContent = message;
    errorEl.classList.add('visible');
    
    // Hide after 2 seconds
    setTimeout(() => {
        errorEl.classList.remove('visible');
    }, 2000);
}

/**
 * Handle bet removal (right-click)
 */
function handleBetRemoval(betType, betValue, e) {
    // Ensure context menu is completely blocked
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    if (getGamePhase() !== GAME_PHASES.BETTING) return;
    
    const chipValue = getSelectedChip();
    removeBet(betType, betValue, chipValue);
    
    renderPlacedChips();
    updateTotalBetDisplay();
    updateButtonStates();
}

/**
 * Update button states based on game state
 */
function updateButtonStates() {
    const phase = getGamePhase();
    const hasBetsPlaced = hasBets();
    const hasLastBets = getLastBets() !== null;
    const canAfford = getCurrentBankroll() > 0;
    const hasUndoActions = canUndo();

    const spinBtn = document.getElementById('spinBtn');
    const clearBtn = document.getElementById('clearBetsBtn');
    const undoBtn = document.getElementById('undoBtn');
    const doubleBtn = document.getElementById('doubleBtn');
    const repeatBtn = document.getElementById('repeatBtn');
    const autoRepeatBtn = document.getElementById('autoRepeatBtn');

    if (spinBtn) {
        // Allow spinning without bets (for statistics/practice)
        spinBtn.disabled = phase !== GAME_PHASES.BETTING;
        spinBtn.classList.toggle('spinning', phase === GAME_PHASES.SPINNING);
    }

    if (clearBtn) {
        clearBtn.disabled = phase !== GAME_PHASES.BETTING || !hasBetsPlaced;
    }

    if (undoBtn) {
        undoBtn.disabled = phase !== GAME_PHASES.BETTING || !hasUndoActions;
    }

    if (doubleBtn) {
        // Can double if there are bets and player can afford to double
        const currentTotal = getTotalWagered();
        const canAffordDouble = currentTotal * 2 <= getCurrentBankroll();
        doubleBtn.disabled = phase !== GAME_PHASES.BETTING || !hasBetsPlaced || !canAffordDouble;
    }

    if (repeatBtn) {
        repeatBtn.disabled = phase !== GAME_PHASES.BETTING || !hasLastBets || !canAfford;
    }
    
    if (autoRepeatBtn) {
        // Enable auto-repeat if we have bets placed or have last bets to repeat
        // Don't disable if auto-repeat is already active
        if (!isAutoRepeatEnabled()) {
            autoRepeatBtn.disabled = phase !== GAME_PHASES.BETTING || (!hasBetsPlaced && !hasLastBets);
        }
    }
}

/**
 * Format large numbers compactly (e.g., $1.5M, $250K)
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount
 */
function formatCompactAmount(amount) {
    if (amount >= 1000000) {
        const millions = amount / 1000000;
        return '$' + (millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)) + 'M';
    } else if (amount >= 10000) {
        const thousands = amount / 1000;
        return '$' + (thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)) + 'K';
    }
    return '$' + amount.toLocaleString();
}

/**
 * Update total bet display
 */
function updateTotalBetDisplay() {
    const totalEl = document.getElementById('totalBetAmount');
    if (totalEl) {
        totalEl.textContent = formatCompactAmount(getTotalWagered());
    }
}

// =====================================================
// NO MORE BETS OVERLAY
// =====================================================

/**
 * Show "No More Bets" overlay during spin
 */
function showNoMoreBets() {
    const overlay = document.getElementById('noMoreBetsOverlay');
    if (overlay) {
        overlay.classList.add('active');
    }
}

/**
 * Hide "No More Bets" overlay
 */
function hideNoMoreBets() {
    const overlay = document.getElementById('noMoreBetsOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// =====================================================
// RESULT AUTO-DISMISS
// =====================================================

/**
 * Show result with auto-dismiss after 1 second
 * Auto-selects "Same Bets" if available, otherwise "New Bets"
 */
function showResultWithAutoDismiss(result, resolution) {
    const overlay = document.getElementById('resultOverlay');
    const numberEl = document.getElementById('resultNumber');
    const textEl = document.getElementById('resultText');
    const amountEl = document.getElementById('resultAmount');
    const progressBar = document.getElementById('actionProgressBar');
    const actionNewBets = document.getElementById('actionNewBets');
    const actionSameBets = document.getElementById('actionSameBets');
    
    if (!overlay) return;
    
    // Clear any existing timeouts
    if (resultDismissTimeout) clearTimeout(resultDismissTimeout);
    if (resultProgressInterval) clearInterval(resultProgressInterval);
    
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
    
    // Update action indicators - New Bets is always the default action
    if (actionNewBets && actionSameBets) {
        actionNewBets.classList.add('active');
        actionSameBets.classList.remove('active');
    }
    
    // Show overlay
    overlay.classList.add('active');
    
    // Animate progress bar over 1 second
    let progress = 0;
    const duration = 1000; // 1 second
    const interval = 50; // Update every 50ms
    const increment = (interval / duration) * 100;
    
    if (progressBar) {
        progressBar.style.width = '0%';
        
        resultProgressInterval = setInterval(() => {
            progress += increment;
            progressBar.style.width = Math.min(progress, 100) + '%';
        }, interval);
    }
    
    // Auto-dismiss after 1 second
    resultDismissTimeout = setTimeout(() => {
        if (resultProgressInterval) clearInterval(resultProgressInterval);
        
        hideResultOverlay();
        
        // Always clear bets after spin - user must press Repeat to restore
        clearAllBets();
        renderPlacedChips();
        updateTotalBetDisplay();
        
        setGamePhase(GAME_PHASES.BETTING);
        updateButtonStates();
        
        // Restart auto-spin countdown if enabled
        if (autoSpinState.enabled) {
            startAutoSpinCountdown();
        }
    }, duration);
    
    // Allow clicking on action options to change selection
    if (actionNewBets) {
        actionNewBets.onclick = () => {
            if (resultDismissTimeout) clearTimeout(resultDismissTimeout);
            if (resultProgressInterval) clearInterval(resultProgressInterval);
            handleNewBets();
        };
    }
    
    if (actionSameBets) {
        actionSameBets.onclick = () => {
            if (resultDismissTimeout) clearTimeout(resultDismissTimeout);
            if (resultProgressInterval) clearInterval(resultProgressInterval);
            handleSameBets();
        };
    }
}

/**
 * Check if we can afford last bets
 */
function canAffordLastBets(lastBets) {
    if (!lastBets) return false;
    
    let total = 0;
    
    // Sum all bet types
    for (const [type, bets] of Object.entries(lastBets)) {
        if (typeof bets === 'object' && bets !== null) {
            for (const amount of Object.values(bets)) {
                total += amount;
            }
        } else if (typeof bets === 'number') {
            total += bets;
        }
    }
    
    return total <= getCurrentBankroll();
}

// =====================================================
// AUTO-SPIN FUNCTIONALITY
// =====================================================

/**
 * Initialize auto-spin handlers
 */
function initAutoSpinHandlers() {
    const autoSpinBtn = document.getElementById('autoSpinBtn');
    const autoSpinDropdown = document.getElementById('autoSpinDropdown');
    const stopAutoBtn = document.getElementById('stopAutoBtn');
    const cancelAutoSpinBtn = document.getElementById('cancelAutoSpinBtn');
    
    if (autoSpinBtn) {
        autoSpinBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleAutoSpinDropdown();
        });
    }
    
    // Time option buttons
    const timeOptions = document.querySelectorAll('.auto-spin-option');
    timeOptions.forEach(btn => {
        btn.addEventListener('click', () => {
            const time = parseInt(btn.dataset.time);
            selectAutoSpinTime(time);
        });
    });
    
    if (stopAutoBtn) {
        stopAutoBtn.addEventListener('click', () => {
            stopAutoSpin();
        });
    }
    
    if (cancelAutoSpinBtn) {
        cancelAutoSpinBtn.addEventListener('click', () => {
            stopAutoSpinCountdown();
            stopAutoSpin();
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.auto-spin-control')) {
            closeAutoSpinDropdown();
        }
    });
}

/**
 * Toggle auto-spin dropdown
 */
function toggleAutoSpinDropdown() {
    const dropdown = document.getElementById('autoSpinDropdown');
    if (dropdown) {
        dropdown.classList.toggle('open');
    }
}

/**
 * Close auto-spin dropdown
 */
function closeAutoSpinDropdown() {
    const dropdown = document.getElementById('autoSpinDropdown');
    if (dropdown) {
        dropdown.classList.remove('open');
    }
}

/**
 * Select auto-spin time and start
 */
function selectAutoSpinTime(seconds) {
    autoSpinState.duration = seconds;
    autoSpinState.enabled = true;
    
    // Update UI
    const autoSpinBtn = document.getElementById('autoSpinBtn');
    const autoSpinLabel = document.getElementById('autoSpinLabel');
    const stopAutoBtn = document.getElementById('stopAutoBtn');
    
    if (autoSpinBtn) autoSpinBtn.classList.add('active');
    if (autoSpinLabel) autoSpinLabel.textContent = seconds + 's';
    if (stopAutoBtn) stopAutoBtn.style.display = 'block';
    
    // Update selected state
    document.querySelectorAll('.auto-spin-option').forEach(btn => {
        btn.classList.toggle('selected', parseInt(btn.dataset.time) === seconds);
    });
    
    closeAutoSpinDropdown();
    
    // Start countdown if in betting phase
    if (getGamePhase() === GAME_PHASES.BETTING) {
        startAutoSpinCountdown();
    }
}

/**
 * Stop auto-spin
 */
function stopAutoSpin() {
    autoSpinState.enabled = false;
    stopAutoSpinCountdown();
    
    // Update UI
    const autoSpinBtn = document.getElementById('autoSpinBtn');
    const autoSpinLabel = document.getElementById('autoSpinLabel');
    const stopAutoBtn = document.getElementById('stopAutoBtn');
    
    if (autoSpinBtn) autoSpinBtn.classList.remove('active');
    if (autoSpinLabel) autoSpinLabel.textContent = 'Auto';
    if (stopAutoBtn) stopAutoBtn.style.display = 'none';
    
    // Clear selected state
    document.querySelectorAll('.auto-spin-option').forEach(btn => {
        btn.classList.remove('selected');
    });
}

/**
 * Start auto-spin countdown
 */
function startAutoSpinCountdown() {
    if (!autoSpinState.enabled) return;
    
    autoSpinState.countdown = autoSpinState.duration;
    
    const countdownDisplay = document.getElementById('autoSpinCountdown');
    const countdownTimer = document.getElementById('countdownTimer');
    
    if (countdownDisplay) {
        countdownDisplay.classList.add('active');
        countdownDisplay.classList.remove('warning');
    }
    
    if (countdownTimer) {
        countdownTimer.textContent = autoSpinState.countdown;
    }
    
    // Clear any existing interval
    if (autoSpinState.countdownInterval) {
        clearInterval(autoSpinState.countdownInterval);
    }
    
    autoSpinState.countdownInterval = setInterval(() => {
        autoSpinState.countdown--;
        
        if (countdownTimer) {
            countdownTimer.textContent = autoSpinState.countdown;
        }
        
        // Warning at 5 seconds or less
        if (autoSpinState.countdown <= 5 && countdownDisplay) {
            countdownDisplay.classList.add('warning');
        }
        
        if (autoSpinState.countdown <= 0) {
            stopAutoSpinCountdown();
            
            // Trigger spin if in betting phase
            if (getGamePhase() === GAME_PHASES.BETTING) {
                handleSpinClick();
            }
        }
    }, 1000);
}

/**
 * Stop auto-spin countdown
 */
function stopAutoSpinCountdown() {
    if (autoSpinState.countdownInterval) {
        clearInterval(autoSpinState.countdownInterval);
        autoSpinState.countdownInterval = null;
    }
    
    const countdownDisplay = document.getElementById('autoSpinCountdown');
    if (countdownDisplay) {
        countdownDisplay.classList.remove('active');
        countdownDisplay.classList.remove('warning');
    }
}

// =====================================================
// AUTO-REPEAT HANDLERS
// =====================================================

/**
 * Initialize auto-repeat handlers
 */
function initAutoRepeatHandlers() {
    const autoRepeatBtn = document.getElementById('autoRepeatBtn');
    const autoRepeatDropdown = document.getElementById('autoRepeatDropdown');
    const stopAutoRepeatBtn = document.getElementById('stopAutoRepeatBtn');
    
    if (autoRepeatBtn) {
        autoRepeatBtn.addEventListener('click', toggleAutoRepeatDropdown);
    }
    
    // Count option buttons
    const countOptions = document.querySelectorAll('.auto-repeat-option');
    countOptions.forEach(btn => {
        btn.addEventListener('click', () => {
            const count = parseInt(btn.dataset.count);
            selectAutoRepeatCount(count);
        });
    });
    
    // Stop button
    if (stopAutoRepeatBtn) {
        stopAutoRepeatBtn.addEventListener('click', stopAutoRepeat);
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.auto-repeat-control')) {
            closeAutoRepeatDropdown();
        }
    });
}

/**
 * Toggle auto-repeat dropdown
 */
function toggleAutoRepeatDropdown() {
    const dropdown = document.getElementById('autoRepeatDropdown');
    if (dropdown) {
        dropdown.classList.toggle('open');
    }
}

/**
 * Close auto-repeat dropdown
 */
function closeAutoRepeatDropdown() {
    const dropdown = document.getElementById('autoRepeatDropdown');
    if (dropdown) {
        dropdown.classList.remove('open');
    }
}

/**
 * Select auto-repeat count and start
 * @param {number} count - Number of spins (0 = forever)
 */
function selectAutoRepeatCount(count) {
    // Capture current bets
    const currentBets = getAllBets();
    if (!hasBets()) {
        alert('Place some bets first before enabling auto-repeat.');
        return;
    }
    
    autoRepeatState.enabled = true;
    autoRepeatState.remaining = count;
    autoRepeatState.isForever = count === 0;
    autoRepeatState.betsSnapshot = currentBets;
    
    // Store as last bets for repeat
    storeLastBets(currentBets);
    
    // Update UI
    const autoRepeatBtn = document.getElementById('autoRepeatBtn');
    const autoRepeatLabel = document.getElementById('autoRepeatLabel');
    const stopAutoRepeatBtn = document.getElementById('stopAutoRepeatBtn');
    const statusDiv = document.getElementById('autoRepeatStatus');
    const remainingSpan = document.getElementById('autoRepeatRemaining');
    
    if (autoRepeatBtn) autoRepeatBtn.classList.add('active');
    if (autoRepeatLabel) autoRepeatLabel.textContent = count === 0 ? '∞' : count;
    if (stopAutoRepeatBtn) stopAutoRepeatBtn.style.display = 'block';
    if (statusDiv) statusDiv.style.display = 'block';
    if (remainingSpan) remainingSpan.textContent = count === 0 ? '∞' : count;
    
    // Update selected state
    document.querySelectorAll('.auto-repeat-option').forEach(btn => {
        btn.classList.toggle('selected', parseInt(btn.dataset.count) === count);
    });
    
    closeAutoRepeatDropdown();
}

/**
 * Stop auto-repeat
 */
function stopAutoRepeat() {
    autoRepeatState.enabled = false;
    autoRepeatState.remaining = 0;
    autoRepeatState.isForever = false;
    autoRepeatState.betsSnapshot = null;
    
    // Update UI
    const autoRepeatBtn = document.getElementById('autoRepeatBtn');
    const autoRepeatLabel = document.getElementById('autoRepeatLabel');
    const stopAutoRepeatBtn = document.getElementById('stopAutoRepeatBtn');
    const statusDiv = document.getElementById('autoRepeatStatus');
    
    if (autoRepeatBtn) autoRepeatBtn.classList.remove('active');
    if (autoRepeatLabel) autoRepeatLabel.textContent = 'Auto';
    if (stopAutoRepeatBtn) stopAutoRepeatBtn.style.display = 'none';
    if (statusDiv) statusDiv.style.display = 'none';
    
    // Clear selected state
    document.querySelectorAll('.auto-repeat-option').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    updateButtonStates();
}

/**
 * Process auto-repeat after a spin (called from handleSameBets/handleNewBets equivalent)
 * Should be called after each spin result is processed
 */
function processAutoRepeat() {
    if (!autoRepeatState.enabled) return;
    
    // Decrement counter if not forever
    if (!autoRepeatState.isForever && autoRepeatState.remaining > 0) {
        autoRepeatState.remaining--;
        
        // Update display
        const remainingSpan = document.getElementById('autoRepeatRemaining');
        const autoRepeatLabel = document.getElementById('autoRepeatLabel');
        if (remainingSpan) remainingSpan.textContent = autoRepeatState.remaining;
        if (autoRepeatLabel) autoRepeatLabel.textContent = autoRepeatState.remaining;
        
        // Stop if we've reached 0
        if (autoRepeatState.remaining <= 0) {
            stopAutoRepeat();
            return;
        }
    }
    
    // Restore the saved bets
    if (autoRepeatState.betsSnapshot) {
        const canRestore = restoreBets(autoRepeatState.betsSnapshot, getCurrentBankroll());
        if (!canRestore) {
            // Can't afford to continue, stop auto-repeat
            alert('Cannot afford to continue auto-repeat. Stopping.');
            stopAutoRepeat();
        }
    }
}

/**
 * Check if auto-repeat is enabled
 * @returns {boolean}
 */
function isAutoRepeatEnabled() {
    return autoRepeatState.enabled;
}

/**
 * Update auto-repeat button state based on whether bets are placed
 */
function updateAutoRepeatButtonState() {
    const autoRepeatBtn = document.getElementById('autoRepeatBtn');
    if (autoRepeatBtn) {
        const phase = getGamePhase();
        const hasLastBets = getLastBets() !== null;
        const hasBetsPlaced = hasBets();
        
        // Enable if we have bets placed or last bets to repeat from
        autoRepeatBtn.disabled = phase !== GAME_PHASES.BETTING || (!hasBetsPlaced && !hasLastBets);
    }
}

// =====================================================
// CHIP PREVIEW FOR HOVER/TOUCH
// =====================================================

// Track current hovered element for chip preview
let currentHoveredBetArea = null;

/**
 * Initialize chip preview handlers for both desktop and mobile/tablet
 */
function initChipPreviewHandlers() {
    // Will be initialized when betting table is rendered
    // Called from initBettingTableHandlers
}

/**
 * Setup chip preview on betting table using event delegation
 * Called after betting table is rendered
 */
function setupChipPreviewOnTable() {
    const bettingTable = document.getElementById('bettingTable');
    if (!bettingTable) return;

    // Prevent duplicate preview handlers
    if (bettingTable.dataset.previewInitialized === 'true') return;
    bettingTable.dataset.previewInitialized = 'true';

    // Desktop: Use mouseover/mouseout with event delegation
    bettingTable.addEventListener('mouseover', (e) => {
        const betArea = e.target.closest('[data-bet-type]');
        if (betArea && betArea !== currentHoveredBetArea) {
            currentHoveredBetArea = betArea;
            showChipPreviewOnElement(betArea);
        }
    });
    
    bettingTable.addEventListener('mouseout', (e) => {
        const betArea = e.target.closest('[data-bet-type]');
        const relatedBetArea = e.relatedTarget?.closest?.('[data-bet-type]');
        
        // Only hide if leaving bet area and not entering another bet area
        if (betArea && betArea !== relatedBetArea) {
            currentHoveredBetArea = null;
            hideChipPreview();
        }
    });
    
    bettingTable.addEventListener('mousemove', (e) => {
        if (currentHoveredBetArea) {
            updateChipPreviewPosition(e);
        }
    });
    
    // Mobile/Tablet: Show chip preview briefly on touch, then hide after placement
    // Use pointerdown for better cross-device support
    bettingTable.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') {
            const betArea = e.target.closest('[data-bet-type]');
            if (betArea) {
                showChipPreviewOnElement(betArea);
                // Hide preview after a short delay (after the visual feedback)
                setTimeout(hideChipPreview, 300);
            }
        }
    });
}

/**
 * Show chip preview on a specific bet element
 */
function showChipPreviewOnElement(element) {
    if (getGamePhase() !== GAME_PHASES.BETTING) return;
    
    const chipPreview = document.getElementById('chipPreview');
    const bettingTableContainer = document.getElementById('bettingTableContainer');
    
    if (!chipPreview || !bettingTableContainer) return;
    
    const selectedChip = getSelectedChip();
    
    // Create chip preview content
    chipPreview.innerHTML = `<div class="chip chip-${selectedChip} chip-preview-chip">${selectedChip >= 1000 ? (selectedChip / 1000) + 'K' : selectedChip}</div>`;
    
    // Get element position relative to container
    const containerRect = bettingTableContainer.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    // Position at center of element, above it
    const x = elementRect.left + elementRect.width / 2 - containerRect.left;
    const y = elementRect.top - containerRect.top - 20;
    
    chipPreview.style.left = x + 'px';
    chipPreview.style.top = y + 'px';
    chipPreview.classList.add('visible');
}

/**
 * Update chip preview position on mouse move
 */
function updateChipPreviewPosition(e) {
    if (getGamePhase() !== GAME_PHASES.BETTING) return;
    
    const chipPreview = document.getElementById('chipPreview');
    const bettingTableContainer = document.getElementById('bettingTableContainer');
    
    if (!chipPreview || !bettingTableContainer || !chipPreview.classList.contains('visible')) return;
    
    const containerRect = bettingTableContainer.getBoundingClientRect();
    
    // Follow mouse cursor
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top - 40;
    
    chipPreview.style.left = x + 'px';
    chipPreview.style.top = y + 'px';
}

/**
 * Hide chip preview
 */
function hideChipPreview() {
    const chipPreview = document.getElementById('chipPreview');
    if (chipPreview) {
        chipPreview.classList.remove('visible');
    }
    currentHoveredBetArea = null;
}
