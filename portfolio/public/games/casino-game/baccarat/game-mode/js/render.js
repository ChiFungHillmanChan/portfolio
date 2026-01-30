// =====================================================
// BACCARAT GAME MODE - UI RENDERING
// =====================================================

// =====================================================
// CHIP RENDERING
// =====================================================

/**
 * Render the chip rack
 */
function renderChipRack() {
    const rack = document.getElementById('chipRack');
    if (!rack) return;

    const availableChips = getAvailableChips();
    const selectedChip = getSelectedChip();

    rack.innerHTML = CHIP_DENOMINATIONS.map(value => {
        const isAvailable = availableChips.includes(value);
        const isSelected = value === selectedChip;
        const displayValue = formatChipValue(value);

        return `
            <button class="chip chip-${value} ${isSelected ? 'selected' : ''}" 
                    data-value="${value}"
                    ${!isAvailable ? 'disabled' : ''}>
                ${displayValue}
            </button>
        `;
    }).join('');

    // Add click handlers
    rack.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const value = parseInt(chip.dataset.value);
            if (!chip.disabled) {
                setSelectedChip(value);
                renderChipRack();
            }
        });
    });
}

/**
 * Format chip value for display
 * @param {number} value - Chip value
 * @returns {string} Formatted value
 */
function formatChipValue(value) {
    if (value >= 1000) {
        return (value / 1000) + 'K';
    }
    return value.toString();
}

/**
 * Format currency for display
 * @param {number} amount - Amount
 * @returns {string} Formatted amount
 */
function formatCurrency(amount) {
    return '$' + amount.toLocaleString();
}

/**
 * Render chip stack on a bet spot
 * @param {string} betType - Bet type
 * @param {number} amount - Bet amount
 */
function renderChipOnBet(betType, amount) {
    const chipId = 'chip' + betType.charAt(0).toUpperCase() + betType.slice(1);
    const container = document.getElementById(chipId);
    if (!container) return;

    if (amount <= 0) {
        container.innerHTML = '';
        return;
    }

    // Get the largest chip that fits
    const chipValue = getTopChipValue(amount);
    const chipClass = `chip-${chipValue}`;

    container.innerHTML = `
        <div class="chip chip-sm ${chipClass}">
            ${formatChipValue(chipValue)}
        </div>
        <div class="chip-amount">${formatCurrency(amount)}</div>
    `;
}

/**
 * Get the largest chip value that fits the amount
 * @param {number} amount - Total amount
 * @returns {number} Chip value
 */
function getTopChipValue(amount) {
    for (let i = CHIP_DENOMINATIONS.length - 1; i >= 0; i--) {
        if (CHIP_DENOMINATIONS[i] <= amount) {
            return CHIP_DENOMINATIONS[i];
        }
    }
    return CHIP_DENOMINATIONS[0];
}

// =====================================================
// HUD RENDERING
// =====================================================

/**
 * Render all HUD displays
 */
function renderHUD() {
    renderBankroll();
    renderTotalBet();
    renderProfit();
    renderRound();
}

/**
 * Render bankroll display
 */
function renderBankroll() {
    const el = document.getElementById('bankrollDisplay');
    if (el) {
        el.textContent = formatCurrency(getCurrentBankroll());
    }
}

/**
 * Render total bet display
 */
function renderTotalBet() {
    const el = document.getElementById('totalBetDisplay');
    if (el) {
        el.textContent = formatCurrency(getTotalWagered());
    }
}

/**
 * Render profit display
 */
function renderProfit() {
    const el = document.getElementById('profitDisplay');
    if (el) {
        const profit = getSessionProfit();
        el.textContent = formatCurrency(profit);
        el.classList.remove('positive', 'negative');
        if (profit > 0) {
            el.textContent = '+' + el.textContent;
            el.classList.add('positive');
        } else if (profit < 0) {
            el.classList.add('negative');
        }
    }
}

/**
 * Render round number
 */
function renderRound() {
    const el = document.getElementById('roundDisplay');
    if (el) {
        el.textContent = '#' + (gameState.roundNumber + 1);
    }
}

// =====================================================
// CARD RENDERING
// =====================================================

/**
 * Render all cards
 */
function renderCards() {
    const hand = getCurrentHand();
    renderPlayerCards(hand.playerCards);
    renderBankerCards(hand.bankerCards);
    renderTotals(hand.playerTotal, hand.bankerTotal);
}

/**
 * Render player cards
 * @param {Array} cards - Player's cards
 */
function renderPlayerCards(cards) {
    const container = document.getElementById('playerCards');
    if (!container) return;

    container.innerHTML = '';

    // Always show 3 card positions
    for (let i = 0; i < 3; i++) {
        if (i < cards.length) {
            const card = cards[i];
            const isThird = i === 2;
            container.appendChild(createCardElement(card, true, isThird));
        } else if (i < 2) {
            // Show placeholder for first 2 cards
            container.appendChild(createCardPlaceholder());
        }
    }
}

/**
 * Render banker cards
 * @param {Array} cards - Banker's cards
 */
function renderBankerCards(cards) {
    const container = document.getElementById('bankerCards');
    if (!container) return;

    container.innerHTML = '';

    // Always show 3 card positions
    for (let i = 0; i < 3; i++) {
        if (i < cards.length) {
            const card = cards[i];
            const isThird = i === 2;
            container.appendChild(createCardElement(card, true, isThird));
        } else if (i < 2) {
            // Show placeholder for first 2 cards
            container.appendChild(createCardPlaceholder());
        }
    }
}

/**
 * Create a card element
 * @param {Object} card - Card object {rank, suit}
 * @param {boolean} faceUp - Whether card is face up
 * @param {boolean} isThird - Whether this is a third card
 * @returns {HTMLElement} Card element
 */
function createCardElement(card, faceUp = true, isThird = false) {
    const el = document.createElement('div');
    el.className = 'card';

    if (faceUp) {
        const isRed = card.suit === 1 || card.suit === 2; // hearts or diamonds
        el.classList.add('face-up');
        if (isRed) el.classList.add('red');
        if (isThird) el.classList.add('third-card');
        el.textContent = getCardLabel(card);
    } else {
        el.classList.add('face-down');
    }

    return el;
}

/**
 * Create a card placeholder element
 * @returns {HTMLElement} Placeholder element
 */
function createCardPlaceholder() {
    const el = document.createElement('div');
    el.className = 'card-placeholder';
    return el;
}

/**
 * Render hand totals
 * @param {number} playerTotal - Player's total
 * @param {number} bankerTotal - Banker's total
 */
function renderTotals(playerTotal, bankerTotal) {
    const playerEl = document.getElementById('playerTotal');
    const bankerEl = document.getElementById('bankerTotal');

    if (playerEl) playerEl.textContent = playerTotal;
    if (bankerEl) bankerEl.textContent = bankerTotal;
}

// =====================================================
// BETTING TABLE RENDERING
// =====================================================

/**
 * Render all bet chips on the table
 */
function renderAllBetChips() {
    const bets = getAllBets();

    // Main bets
    renderChipOnBet('player', bets.player);
    renderChipOnBet('banker', bets.banker);
    renderChipOnBet('tie', bets.tie);

    // Pair bets
    renderChipOnBet('playerPair', bets.playerPair);
    renderChipOnBet('bankerPair', bets.bankerPair);

    // Dragon bonus
    renderChipOnBet('dragonPlayer', bets.dragonPlayer);
    renderChipOnBet('dragonBanker', bets.dragonBanker);

    // Egalité bets
    for (let i = 0; i <= 9; i++) {
        renderChipOnBet(`egalite${i}`, bets[`egalite${i}`]);
    }

    // Update bet spot highlighting
    document.querySelectorAll('.bet-spot').forEach(spot => {
        const betType = spot.dataset.bet;
        const amount = bets[betType] || 0;
        spot.classList.toggle('has-bet', amount > 0);
    });
}

/**
 * Initialize betting table handlers
 */
function initBettingTableHandlers() {
    document.querySelectorAll('.bet-spot').forEach(spot => {
        // Left click to add bet
        spot.addEventListener('click', (e) => {
            if (getGamePhase() !== GAME_PHASES.BETTING) return;

            const betType = spot.dataset.bet;
            const chipValue = getSelectedChip();

            if (addBet(betType, chipValue)) {
                renderAllBetChips();
                renderHUD();
                renderChipRack();
                updateActionButtons();
            }
        });

        // Right click to remove bet
        spot.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (getGamePhase() !== GAME_PHASES.BETTING) return;

            const betType = spot.dataset.bet;
            const chipValue = getSelectedChip();

            if (removeBet(betType, chipValue)) {
                renderAllBetChips();
                renderHUD();
                renderChipRack();
                updateActionButtons();
            }
        });
    });
}

// =====================================================
// BUTTON STATE MANAGEMENT
// =====================================================

/**
 * Update action button states
 */
function updateActionButtons() {
    const clearBtn = document.getElementById('clearBetsBtn');
    const repeatBtn = document.getElementById('repeatBetsBtn');
    const dealBtn = document.getElementById('dealBtn');

    const phase = getGamePhase();
    const hasBetsPlaced = hasBets();
    const hasLastBets = getLastBets() !== null;

    if (phase === GAME_PHASES.BETTING) {
        if (clearBtn) clearBtn.disabled = !hasBetsPlaced;
        if (repeatBtn) repeatBtn.disabled = !hasLastBets;
        if (dealBtn) {
            dealBtn.disabled = !hasBetsPlaced;
            dealBtn.textContent = 'Deal';
        }
    } else if (phase === GAME_PHASES.DEALING) {
        if (clearBtn) clearBtn.disabled = true;
        if (repeatBtn) repeatBtn.disabled = true;
        if (dealBtn) {
            dealBtn.disabled = false;
            const dest = getNextCardDestination();
            if (dest === 'none') {
                dealBtn.textContent = 'Show Result';
            } else {
                dealBtn.textContent = `Deal ${dest.charAt(0).toUpperCase() + dest.slice(1)}`;
            }
        }
    } else {
        if (clearBtn) clearBtn.disabled = true;
        if (repeatBtn) repeatBtn.disabled = true;
        if (dealBtn) dealBtn.disabled = true;
    }
}

// =====================================================
// RESULT OVERLAY
// =====================================================

/**
 * Show result overlay
 * @param {Object} handResult - Hand result
 * @param {Object} resolution - Bet resolution with winnings
 */
function showResultOverlay(handResult, resolution) {
    const overlay = document.getElementById('resultOverlay');
    if (!overlay) return;

    // Winner text
    const winnerEl = document.getElementById('resultWinner');
    if (winnerEl) {
        winnerEl.className = 'result-winner';
        if (handResult.winner === 'player') {
            winnerEl.textContent = 'PLAYER WINS';
            winnerEl.classList.add('player-wins');
        } else if (handResult.winner === 'banker') {
            winnerEl.textContent = 'BANKER WINS';
            winnerEl.classList.add('banker-wins');
        } else {
            winnerEl.textContent = `TIE ${handResult.playerTotal}`;
            winnerEl.classList.add('tie-wins');
        }
    }

    // Scores
    const playerScoreEl = document.getElementById('resultPlayerScore');
    const bankerScoreEl = document.getElementById('resultBankerScore');
    if (playerScoreEl) playerScoreEl.textContent = handResult.playerTotal;
    if (bankerScoreEl) bankerScoreEl.textContent = handResult.bankerTotal;

    // Natural badge
    const naturalEl = document.getElementById('resultNatural');
    if (naturalEl) {
        naturalEl.classList.toggle('hidden', !handResult.isNatural);
    }

    // Winnings
    const winningsEl = document.getElementById('winningsAmount');
    if (winningsEl) {
        winningsEl.classList.remove('loss');
        if (resolution.netResult >= 0) {
            winningsEl.textContent = '+' + formatCurrency(resolution.totalWin);
        } else {
            winningsEl.textContent = formatCurrency(resolution.netResult);
            winningsEl.classList.add('loss');
        }
    }

    // Details
    const detailsEl = document.getElementById('resultDetails');
    if (detailsEl) {
        detailsEl.innerHTML = resolution.details
            .filter(d => d.amount > 0)
            .map(d => {
                const betName = formatBetName(d.type);
                const resultClass = d.win ? 'win' : (d.push ? '' : 'loss');
                const resultText = d.win 
                    ? `+${formatCurrency(d.winAmount)}` 
                    : (d.push ? 'Push' : `-${formatCurrency(d.amount)}`);
                return `
                    <div class="result-detail-item ${resultClass}">
                        <span>${betName}</span>
                        <span>${resultText}</span>
                    </div>
                `;
            }).join('');
    }

    overlay.classList.remove('hidden');
}

/**
 * Hide result overlay
 */
function hideResultOverlay() {
    const overlay = document.getElementById('resultOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

/**
 * Format bet type name for display
 * @param {string} betType - Bet type
 * @returns {string} Formatted name
 */
function formatBetName(betType) {
    const names = {
        player: 'Player',
        banker: 'Banker',
        tie: 'Tie',
        playerPair: 'Player Pair',
        bankerPair: 'Banker Pair',
        dragonPlayer: 'Dragon Player',
        dragonBanker: 'Dragon Banker'
    };

    if (names[betType]) return names[betType];

    // Egalité bets
    if (betType.startsWith('egalite')) {
        const num = betType.replace('egalite', '');
        return `Tie ${num}`;
    }

    return betType;
}

// =====================================================
// GAME OVER OVERLAY
// =====================================================

/**
 * Show game over overlay
 */
function showGameOverOverlay() {
    const overlay = document.getElementById('gameOverOverlay');
    if (!overlay) return;

    const roundsEl = document.getElementById('gameOverRounds');
    const startingEl = document.getElementById('gameOverStarting');

    if (roundsEl) roundsEl.textContent = gameState.roundNumber;
    if (startingEl) startingEl.textContent = formatCurrency(gameState.bankroll.initial);

    overlay.classList.remove('hidden');
}

/**
 * Hide game over overlay
 */
function hideGameOverOverlay() {
    const overlay = document.getElementById('gameOverOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// =====================================================
// SCREEN MANAGEMENT
// =====================================================

/**
 * Show setup screen, hide game screen
 */
function showSetupScreen() {
    const setupScreen = document.getElementById('setupScreen');
    const gameScreen = document.getElementById('gameScreen');

    if (setupScreen) setupScreen.classList.remove('hidden');
    if (gameScreen) gameScreen.classList.add('hidden');
}

/**
 * Show game screen, hide setup screen
 */
function showGameScreen() {
    const setupScreen = document.getElementById('setupScreen');
    const gameScreen = document.getElementById('gameScreen');

    if (setupScreen) setupScreen.classList.add('hidden');
    if (gameScreen) gameScreen.classList.remove('hidden');
}

/**
 * Render all game displays
 */
function renderAll() {
    renderHUD();
    renderChipRack();
    renderCards();
    renderAllBetChips();
    updateActionButtons();
}
