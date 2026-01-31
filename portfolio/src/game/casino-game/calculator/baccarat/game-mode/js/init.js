// =====================================================
// BACCARAT GAME MODE - INITIALIZATION
// =====================================================

/**
 * Initialize the application
 */
async function init() {
    // Load HTML components
    await loadComponents();

    // Check for saved game
    if (hasSavedGame()) {
        showSavedGamePrompt();
    } else {
        showSetupScreen();
    }

    // Initialize event handlers
    initEventHandlers();
}

/**
 * Load HTML components
 */
async function loadComponents() {
    try {
        // Load setup panel
        const setupResponse = await fetch('html/setup-panel.html');
        const setupHtml = await setupResponse.text();
        document.getElementById('setupContainer').innerHTML = setupHtml;

        // Load betting table
        const tableResponse = await fetch('html/betting-table.html');
        const tableHtml = await tableResponse.text();
        document.getElementById('gameContainer').innerHTML = tableHtml;

        // Load result overlay
        const resultResponse = await fetch('html/result-overlay.html');
        const resultHtml = await resultResponse.text();
        document.getElementById('overlayContainer').innerHTML = resultHtml;
    } catch (error) {
        console.error('Failed to load components:', error);
    }
}

/**
 * Show saved game prompt
 */
function showSavedGamePrompt() {
    showSetupScreen();

    const savedGameInfo = document.getElementById('savedGameInfo');
    const savedGameDetails = document.getElementById('savedGameDetails');

    if (savedGameInfo && savedGameDetails) {
        // Load to get details
        loadFromStorage();
        savedGameDetails.textContent = `Bankroll: ${formatCurrency(getCurrentBankroll())} | Round: ${gameState.roundNumber}`;
        savedGameInfo.classList.remove('hidden');
    }
}

/**
 * Initialize all event handlers
 */
function initEventHandlers() {
    // Setup form submission
    document.addEventListener('submit', (e) => {
        if (e.target.id === 'setupForm') {
            e.preventDefault();
            handleStartGame();
        }
    });

    // Stack preset buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('preset-btn')) {
            const value = parseInt(e.target.dataset.value);
            selectStackPreset(value);
        }
    });

    // Continue/New game buttons
    document.addEventListener('click', (e) => {
        if (e.target.id === 'continueGameBtn') {
            handleContinueGame();
        }
        if (e.target.id === 'newGameBtn') {
            handleNewGame();
        }
    });

    // Action buttons
    document.addEventListener('click', (e) => {
        if (e.target.id === 'clearBetsBtn') {
            handleClearBets();
        }
        if (e.target.id === 'repeatBetsBtn') {
            handleRepeatBets();
        }
        if (e.target.id === 'dealBtn') {
            handleDeal();
        }
    });

    // Result overlay buttons
    document.addEventListener('click', (e) => {
        if (e.target.id === 'newBetsBtn') {
            handleNewBets();
        }
        if (e.target.id === 'sameBetsBtn') {
            handleSameBets();
        }
        if (e.target.id === 'playAgainBtn') {
            handlePlayAgain();
        }
    });

    // Navigation buttons
    document.addEventListener('click', (e) => {
        if (e.target.id === 'restartBtn') {
            handleRestart();
        }
    });
}

/**
 * Select stack preset
 * @param {number} value - Stack value
 */
function selectStackPreset(value) {
    // Update button states
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.value) === value) {
            btn.classList.add('active');
        }
    });

    // Update custom input
    const customInput = document.getElementById('customStack');
    if (customInput) {
        customInput.value = '';
    }
}

/**
 * Handle start game
 */
function handleStartGame() {
    // Get selected stack
    let stack = 1000; // Default

    const activePreset = document.querySelector('.preset-btn.active');
    if (activePreset) {
        stack = parseInt(activePreset.dataset.value);
    }

    const customInput = document.getElementById('customStack');
    if (customInput && customInput.value) {
        stack = parseInt(customInput.value);
    }

    // Validate
    if (stack < 10) stack = 10;
    if (stack > 10000000) stack = 10000000;

    // Start game
    startNewGame(stack);

    // Show game screen
    showGameScreen();
    renderAll();

    // Initialize betting table handlers
    initBettingTableHandlers();
}

/**
 * Handle continue saved game
 */
function handleContinueGame() {
    loadFromStorage();
    setGamePhase(GAME_PHASES.BETTING);
    showGameScreen();
    renderAll();
    initBettingTableHandlers();
}

/**
 * Handle new game (discard saved)
 */
function handleNewGame() {
    clearStorage();
    const savedGameInfo = document.getElementById('savedGameInfo');
    if (savedGameInfo) {
        savedGameInfo.classList.add('hidden');
    }
}

/**
 * Handle clear bets
 */
function handleClearBets() {
    clearAllBets();
    renderAllBetChips();
    renderHUD();
    renderChipRack();
    updateActionButtons();
}

/**
 * Handle repeat bets
 */
function handleRepeatBets() {
    if (repeatLastBets()) {
        renderAllBetChips();
        renderHUD();
        renderChipRack();
        updateActionButtons();
    }
}

// Flag to track if auto-dealing is in progress
let isAutoDealing = false;

/**
 * Auto-deal all cards with animation delays
 * @param {number} cardDelay - Delay between cards in ms
 */
async function autoDealAllCards(cardDelay = 600) {
    isAutoDealing = true;
    updateActionButtons();

    // Deal cards until hand is complete
    while (true) {
        const dest = getNextCardDestination();

        if (dest === 'none') {
            // All cards dealt, complete the hand
            const handResult = completeHand();
            const resolution = resolveRound(handResult);

            renderCards();
            renderHUD();

            // Show result after a short delay
            await new Promise(resolve => setTimeout(resolve, 500));

            isAutoDealing = false;

            if (isBankrupt()) {
                showGameOverOverlay();
            } else {
                showResultOverlay(handResult, resolution);
            }
            return;
        }

        // Deal next card
        const card = dealNextCard();
        if (card) {
            renderCards();
            updateActionButtons();

            // Wait before dealing next card
            await new Promise(resolve => setTimeout(resolve, cardDelay));
        } else {
            // No more cards (shouldn't happen)
            break;
        }
    }

    isAutoDealing = false;
    updateActionButtons();
}

/**
 * Handle deal button
 */
function handleDeal() {
    const phase = getGamePhase();

    // Prevent action if auto-dealing is in progress
    if (isAutoDealing) return;

    if (phase === GAME_PHASES.BETTING) {
        // Start dealing
        if (startNewRound()) {
            renderHUD();
            updateActionButtons();

            // Auto-deal all cards
            autoDealAllCards();
        }
    } else if (phase === GAME_PHASES.DEALING) {
        // Manual dealing fallback (in case auto-deal is disabled or interrupted)
        const dest = getNextCardDestination();

        if (dest === 'none') {
            // Complete the hand
            const handResult = completeHand();
            const resolution = resolveRound(handResult);

            renderCards();
            renderHUD();

            // Show result after a short delay
            setTimeout(() => {
                if (isBankrupt()) {
                    showGameOverOverlay();
                } else {
                    showResultOverlay(handResult, resolution);
                }
            }, 500);
        } else {
            // Deal next card
            const card = dealNextCard();
            if (card) {
                renderCards();
                updateActionButtons();
            }
        }
    }
}

/**
 * Handle new bets button from result overlay
 */
function handleNewBets() {
    hideResultOverlay();
    newRound();
    renderAll();
}

/**
 * Handle same bets button from result overlay
 */
function handleSameBets() {
    hideResultOverlay();
    newRound();

    // Restore last bets if possible
    if (repeatLastBets()) {
        renderAll();
    } else {
        renderAll();
    }
}

/**
 * Handle play again from game over
 */
function handlePlayAgain() {
    hideGameOverOverlay();
    resetGameState();
    resetBetState();
    showSetupScreen();
}

/**
 * Handle restart - clear all data and start fresh
 */
function handleRestart() {
    if (confirm('Are you sure you want to restart? All progress will be lost.')) {
        clearStorage();
        resetGameState();
        resetBetState();
        hideResultOverlay();
        hideGameOverOverlay();
        showSetupScreen();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
