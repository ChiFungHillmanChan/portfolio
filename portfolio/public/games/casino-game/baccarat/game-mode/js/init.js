// =====================================================
// BACCARAT GAME MODE - INITIALIZATION
// =====================================================

// Friendly copy for wallet-backend error codes surfaced from commitBet/settle
// (see js/wallet/game-session.js). Anything not in this map falls back to a
// generic "Bet rejected" message rather than showing the raw code to the user.
const WALLET_ERR_MSG = {
    'insufficient-balance': 'Not enough chips for that bet',
    'too-fast': 'Slow down — wait a moment before the next round',
    'round-in-progress': 'Finish the current round first',
    'over-table-max': 'That bet is over the table limit',
    'bad-bets': "That bet isn't allowed here",
    'empty-bet': 'Place a bet first',
};

// True while a wallet bet-commit request is awaiting the server's response.
// isAutoDealing only flips true once the commit resolves and startNewRound()
// flips the phase to DEALING, leaving a gap where a rapid double-click on
// Deal could fire a second commitBet() for the same round before the first
// response lands. This flag closes that gap synchronously (mirrors
// roulette's betCommitInFlight).
let betCommitInFlight = false;

/**
 * Initialize the application
 */
async function init() {
    // Load HTML components (betting table + result overlay only — the setup
    // panel is retired; the game screen stays behind the wallet's game-gate
    // overlay, mounted on document.body by baccarat-wallet.js, until the
    // player is signed in and their chip balance is known. See the
    // 'wallet:ready' listener below, which auto-starts the game).
    await loadComponents();

    // Initialize event handlers
    initEventHandlers();
}

/**
 * Load HTML components
 */
async function loadComponents() {
    try {
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

// Wallet is ready (signed in, balance known): auto-start the game using the
// wallet balance as the bankroll, replacing the old setup-form submit flow.
document.addEventListener('wallet:ready', () => {
    startNewGame(window.baccaratWallet.getBalance());
    // The rack only deals the tier's denominations — a restored selection
    // (or the pre-wallet default) below the table min must snap to the
    // smallest chip the table deals in.
    const denoms = tableChipDenominations();
    if (!denoms.includes(getSelectedChip())) setSelectedChip(denoms[0]);
    showGameScreen();
    renderAll();
    initBettingTableHandlers();
});

// Mirror the wallet's confirmed balance into the in-game bankroll display
// whenever it changes for a reason this page didn't itself just cause (e.g. a
// bust-reset from the HUD's Reset button). commitBet()/settle() already sync
// the balance for changes this page DOES cause (see handleDeal / resolveRound
// in game-logic.js).
document.addEventListener('wallet:balance', () => {
    if (!window.baccaratWallet) return;
    syncBankrollFromWallet(window.baccaratWallet.getBalance());
    renderHUD();
});

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

            // Bust handling is owned by the wallet's game-gate overlay (see
            // baccarat-wallet.js), which reacts to the server-confirmed
            // balance via its own subscription — not this local isBankrupt()
            // snapshot, which can be stale mid-settle (see resolveRound in
            // game-logic.js). Always show the normal result overlay.
            showResultOverlay(handResult, resolution);
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
async function handleDeal() {
    const phase = getGamePhase();

    // Prevent action if auto-dealing is in progress, or a wallet commitBet
    // request from a previous click is still in flight.
    if (isAutoDealing || betCommitInFlight) return;

    if (phase === GAME_PHASES.BETTING) {
        // The wallet gate (mounted on document.body) covers the whole page
        // until sign-in + balance are ready, so this should be unreachable
        // while null — but guard defensively rather than throw if it is.
        const session = window.baccaratWallet;
        if (!session) return;

        // Wallet debit at bet-lock. The Deal button is only enabled once bets
        // are placed (updateActionButtons), and startNewRound() itself
        // refuses to start with no bets — hasBets() here is a belt-and-braces
        // guard so we never call commitBet() with an empty bet map.
        if (hasBets()) {
            // Set synchronously (before the first await) and disable the
            // button so a rapid double-click can't fire a second commitBet
            // for this same round while the first request is in flight.
            betCommitInFlight = true;
            const dealBtn = document.getElementById('dealBtn');
            if (dealBtn) dealBtn.disabled = true;
            try {
                const { balance } = await session.commitBet(getAllBets());
                syncBankrollFromWallet(balance);
                renderHUD();
            } catch (err) {
                // insufficient-balance / too-fast / over-table-max /
                // round-in-progress → stay in BETTING, do not start the round.
                showBetError(WALLET_ERR_MSG[err.code] || 'Bet rejected');
                betCommitInFlight = false;
                updateActionButtons(); // phase is still BETTING — re-enable Deal
                return;
            }
            betCommitInFlight = false;
        }

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

            // Show result after a short delay. Bust handling is owned by the
            // wallet's game-gate overlay (server-confirmed balance), not a
            // local isBankrupt() snapshot — see resolveRound in game-logic.js.
            setTimeout(() => {
                showResultOverlay(handResult, resolution);
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
 * Handle play again from game over.
 *
 * DEAD CODE as of the wallet conversion: showGameOverOverlay() (render.js) is
 * no longer called anywhere (see the two isBankrupt() removals above and in
 * game-logic.js resolveRound), so #gameOverOverlay/#playAgainBtn are never
 * shown/clickable — the wallet's game-gate overlay is the sole bust
 * authority now. Left in place (harmless, unreachable) rather than deleted,
 * matching the roulette conversion's parity choice of leaving retired
 * setup/game-over wiring inert instead of excising it.
 */
function handlePlayAgain() {
    hideGameOverOverlay();
    resetGameState();
    resetBetState();
    showSetupScreen();
}

/**
 * Handle restart - clear local session progress (shoe/history/round) and
 * start fresh at the table.
 *
 * NOTE: this used to route to showSetupScreen() (the setup panel that let
 * players pick a fresh custom bankroll). That panel is retired — the
 * setupScreen element no longer exists in the DOM (loadComponents() stopped
 * fetching setup-panel.html), so showSetupScreen() would silently hide the
 * game screen and show nothing, stranding the user on a blank page with the
 * #restartBtn button in the header always reachable regardless of game phase.
 * Chips ARE the wallet balance now, so "restart" re-seeds the local session
 * (shoe/history/round count) from the current wallet balance instead — it
 * does not touch the server balance.
 */
function handleRestart() {
    // A wallet round is mid-flight if we're dealing or awaiting the debit
    // response — restarting now would forfeit the debited stake or strand the
    // open round (round-in-progress) forever. Only allow restart when idle.
    if (betCommitInFlight || getGamePhase() === GAME_PHASES.DEALING) {
        showBetError("Finish the current hand first");
        return;
    }

    if (confirm('Are you sure you want to restart? All progress will be lost.')) {
        hideResultOverlay();
        hideGameOverOverlay();
        if (window.baccaratWallet) {
            startNewGame(window.baccaratWallet.getBalance());
            renderAll();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
