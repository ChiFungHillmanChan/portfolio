/**
 * Normal Shoe Blackjack Game
 * Realistic dealing flow with proper game phases
 */

// Game State
const GameState = {
    config: {
        decks: 6,
        dealerStyle: 'american',  // american (hole card) or european (no hole card)
        dealerRule: 'S17',        // S17 or H17
        surrenderAllowed: true,
        showDeviations: true,
        minBet: 25,
        maxBet: 300,
        dealDirection: 'left'     // left-to-right or right-to-left
    },
    bankroll: {
        initial: 1600,
        current: 1600
    },
    count: {
        running: 0,
        cardsDealt: 0,
        dealtByRank: {}
    },
    table: {
        seats: [],
        dealer: { cards: [], total: 0, isSoft: false },
        activeSeats: [],          // indices of non-empty seats
        currentDealIndex: 0,      // current position in deal sequence
        currentPlayerIndex: 0,    // current player making decisions
        dealPhase: 0              // 0=first round, 1=second round, 2=dealer cards
    },
    session: {
        hands: [],
        startTime: null
    },
    phase: 'setup'  // setup, betting, dealing, player_turn, dealer_turn, resolution
};

// Track dealt cards history for display
var dealtCardsHistory = [];

// LocalStorage key for settings
var STORAGE_KEY = 'blackjack_normal_shoe_settings';
var GAME_STATE_KEY = 'blackjack_normal_shoe_game_state';

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if there's a saved game in progress
    if (hasSavedGameState()) {
        // Restore and continue the game
        if (restoreSavedGameState()) {
            document.getElementById('setupScreen').style.display = 'none';
            document.getElementById('gameScreen').style.display = 'block';
            initializeGameUI();
            console.log('Blackjack game restored and continued');
        } else {
            initializeSetup();
        }
    } else {
        initializeSetup();
    }
});

function initializeSetup() {
    var setupForm = document.getElementById('setupForm');
    setupForm.addEventListener('submit', handleSetupSubmit);

    var seatToggles = document.querySelectorAll('.seat-toggle');
    seatToggles.forEach(function(btn) {
        btn.addEventListener('click', handleSeatToggle);
    });

    document.getElementById('minBet').addEventListener('change', updateBuyinRecommendations);
    document.getElementById('maxBet').addEventListener('change', updateBuyinRecommendations);

    // Load saved settings from localStorage
    loadSavedSettings();

    updateBuyinRecommendations();
}

// Save settings to localStorage
function saveSettings() {
    var seatToggles = document.querySelectorAll('.seat-toggle');
    var seats = [];
    seatToggles.forEach(function(btn) {
        var status = btn.classList.contains('mine') ? 'mine' :
                    btn.classList.contains('active') ? 'occupied' : 'empty';
        seats.push(status);
    });

    var settings = {
        decks: document.getElementById('decks').value,
        dealerStyle: document.getElementById('dealerStyle').value,
        dealerRule: document.getElementById('dealerRule').value,
        surrender: document.getElementById('surrender').value,
        showDeviations: document.getElementById('showDeviations').checked,
        minBet: document.getElementById('minBet').value,
        maxBet: document.getElementById('maxBet').value,
        buyinTier: document.querySelector('input[name="buyinTier"]:checked')?.value || 'standard',
        actualBuyin: document.getElementById('actualBuyin').value,
        seats: seats
    };

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
        console.warn('Could not save settings to localStorage:', e);
    }
}

// =====================================================
// GAME STATE PERSISTENCE
// =====================================================

// Check if there's a saved game in progress
function hasSavedGameState() {
    try {
        var saved = localStorage.getItem(GAME_STATE_KEY);
        if (!saved) return false;
        var state = JSON.parse(saved);
        // Only restore if game was in progress (not setup phase)
        return state && state.phase && state.phase !== 'setup';
    } catch (e) {
        return false;
    }
}

// Save current game state to localStorage
function saveGameState() {
    if (GameState.phase === 'setup') return;
    
    try {
        var stateToSave = {
            config: GameState.config,
            bankroll: GameState.bankroll,
            count: GameState.count,
            table: {
                seats: GameState.table.seats,
                dealer: GameState.table.dealer,
                activeSeats: GameState.table.activeSeats,
                currentDealIndex: GameState.table.currentDealIndex,
                currentPlayerIndex: GameState.table.currentPlayerIndex,
                dealPhase: GameState.table.dealPhase
            },
            session: {
                hands: GameState.session.hands,
                startTime: GameState.session.startTime
            },
            phase: GameState.phase,
            dealtCardsHistory: dealtCardsHistory,
            timestamp: Date.now()
        };
        localStorage.setItem(GAME_STATE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
        console.warn('Could not save game state:', e);
    }
}

// Restore game state from localStorage
function restoreSavedGameState() {
    try {
        var saved = localStorage.getItem(GAME_STATE_KEY);
        if (!saved) return false;
        
        var state = JSON.parse(saved);
        
        // Restore GameState
        GameState.config = state.config;
        GameState.bankroll = state.bankroll;
        GameState.count = state.count;
        GameState.table.seats = state.table.seats;
        GameState.table.dealer = state.table.dealer;
        GameState.table.activeSeats = state.table.activeSeats;
        GameState.table.currentDealIndex = state.table.currentDealIndex;
        GameState.table.currentPlayerIndex = state.table.currentPlayerIndex;
        GameState.table.dealPhase = state.table.dealPhase;
        GameState.session = state.session;
        GameState.phase = state.phase;
        
        // Restore dealt cards history
        dealtCardsHistory = state.dealtCardsHistory || [];
        
        return true;
    } catch (e) {
        console.warn('Could not restore game state:', e);
        return false;
    }
}

// Clear saved game state (called when starting new game or finishing session)
function clearSavedGameState() {
    try {
        localStorage.removeItem(GAME_STATE_KEY);
    } catch (e) {
        console.warn('Could not clear game state:', e);
    }
}

// Initialize game UI without going through setup form
function initializeGameUI() {
    updateSettingsBar();
    renderSeats();
    renderCardInput();
    renderDealtCards();
    updateCountDisplay();
    updateRecommendationPanel();
    renderActionButtons();
    updateDealingIndicator();
    
    // Set up event listeners
    document.getElementById('undoBtn').addEventListener('click', undoLastCard);
    document.getElementById('newShoeBtn').addEventListener('click', newShoe);
    document.getElementById('newRoundBtn').addEventListener('click', startNewRound);
    document.getElementById('finishBtn').addEventListener('click', finishSession);
    document.getElementById('settingsBtn').addEventListener('click', showSettings);
}

// Load settings from localStorage
function loadSavedSettings() {
    try {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;

        var settings = JSON.parse(saved);

        // Restore form values
        if (settings.decks) {
            document.getElementById('decks').value = settings.decks;
        }
        if (settings.dealerStyle) {
            document.getElementById('dealerStyle').value = settings.dealerStyle;
        }
        if (settings.dealerRule) {
            document.getElementById('dealerRule').value = settings.dealerRule;
        }
        if (settings.surrender) {
            document.getElementById('surrender').value = settings.surrender;
        }
        if (typeof settings.showDeviations === 'boolean') {
            document.getElementById('showDeviations').checked = settings.showDeviations;
        }
        if (settings.minBet) {
            document.getElementById('minBet').value = settings.minBet;
        }
        if (settings.maxBet) {
            document.getElementById('maxBet').value = settings.maxBet;
        }
        if (settings.buyinTier) {
            var tierRadio = document.querySelector('input[name="buyinTier"][value="' + settings.buyinTier + '"]');
            if (tierRadio) {
                tierRadio.checked = true;
            }
        }
        if (settings.actualBuyin) {
            var buyinInput = document.getElementById('actualBuyin');
            buyinInput.value = settings.actualBuyin;
            buyinInput.dataset.userModified = 'true';
        }

        // Restore seat selections
        if (settings.seats && settings.seats.length === 7) {
            var seatToggles = document.querySelectorAll('.seat-toggle');
            seatToggles.forEach(function(btn, index) {
                btn.classList.remove('active', 'mine');
                if (settings.seats[index] === 'occupied') {
                    btn.classList.add('active');
                } else if (settings.seats[index] === 'mine') {
                    btn.classList.add('mine');
                }
            });
        }

    } catch (e) {
        console.warn('Could not load settings from localStorage:', e);
    }
}

function handleSeatToggle(e) {
    var btn = e.target;
    var currentState = btn.classList.contains('mine') ? 'mine' :
                       btn.classList.contains('active') ? 'active' : 'empty';
    var mineSeats = document.querySelectorAll('.seat-toggle.mine').length;

    if (currentState === 'empty') {
        btn.classList.add('active');
    } else if (currentState === 'active') {
        if (mineSeats < 3) {
            btn.classList.remove('active');
            btn.classList.add('mine');
        } else {
            btn.classList.remove('active');
        }
    } else {
        btn.classList.remove('mine');
    }
}

function updateBuyinRecommendations() {
    var minBet = parseInt(document.getElementById('minBet').value) || 25;
    var maxBet = parseInt(document.getElementById('maxBet').value) || 300;

    var recommendations = {
        conservative: Math.round(maxBet * 100),
        standard: Math.round(maxBet * 50),
        aggressive: Math.round(maxBet * 25)
    };

    document.getElementById('conservativeBuyin').textContent = '$' + recommendations.conservative.toLocaleString();
    document.getElementById('standardBuyin').textContent = '$' + recommendations.standard.toLocaleString();
    document.getElementById('aggressiveBuyin').textContent = '$' + recommendations.aggressive.toLocaleString();

    var buyinInput = document.getElementById('actualBuyin');
    if (!buyinInput.dataset.userModified) {
        buyinInput.value = recommendations.standard;
    }
}

// Track when user modifies buyin input
document.addEventListener('DOMContentLoaded', function() {
    var buyinInput = document.getElementById('actualBuyin');
    if (buyinInput) {
        buyinInput.addEventListener('input', function() {
            this.dataset.userModified = 'true';
        });
    }
});

function handleSetupSubmit(e) {
    e.preventDefault();

    GameState.config.decks = parseInt(document.getElementById('decks').value);
    GameState.config.dealerStyle = document.getElementById('dealerStyle').value;
    GameState.config.dealerRule = document.getElementById('dealerRule').value;
    GameState.config.surrenderAllowed = document.getElementById('surrender').value === 'yes';
    GameState.config.showDeviations = document.getElementById('showDeviations').checked;
    GameState.config.minBet = parseInt(document.getElementById('minBet').value);
    GameState.config.maxBet = parseInt(document.getElementById('maxBet').value);

    var seatToggles = document.querySelectorAll('.seat-toggle');
    GameState.table.seats = [];
    GameState.table.activeSeats = [];

    seatToggles.forEach(function(btn, index) {
        var status = btn.classList.contains('mine') ? 'mine' :
                    btn.classList.contains('active') ? 'occupied' : 'empty';
        GameState.table.seats.push({
            id: index + 1,
            status: status,
            cards: [],
            total: 0,
            isSoft: false,
            isBlackjack: false,
            isBusted: false,
            isStanding: false,
            bet: 0,
            result: null
        });

        if (status !== 'empty') {
            GameState.table.activeSeats.push(index);
        }
    });

    GameState.bankroll.initial = parseInt(document.getElementById('actualBuyin').value);
    GameState.bankroll.current = GameState.bankroll.initial;
    GameState.session.startTime = new Date();
    GameState.session.hands = [];

    // Save settings to localStorage for next time
    saveSettings();

    resetCount();

    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';

    initializeGame();
}

function resetCount() {
    GameState.count.running = 0;
    GameState.count.cardsDealt = 0;
    GameState.count.dealtByRank = {};
    CARD_RANKS.forEach(function(rank) {
        GameState.count.dealtByRank[rank] = 0;
    });
}

function initializeGame() {
    updateSettingsBar();
    renderSeats();
    renderCardInput();
    updateCountDisplay();
    updateRecommendationPanel();

    // Start with dealing phase
    startNewRound();

    document.getElementById('undoBtn').addEventListener('click', undoLastCard);
    document.getElementById('newShoeBtn').addEventListener('click', newShoe);
    document.getElementById('newRoundBtn').addEventListener('click', startNewRound);
    document.getElementById('finishBtn').addEventListener('click', finishSession);
    document.getElementById('settingsBtn').addEventListener('click', showSettings);
}

function startNewRound() {
    // Clear all hands
    GameState.table.dealer.cards = [];
    GameState.table.dealer.total = 0;
    GameState.table.dealer.isSoft = false;

    GameState.table.seats.forEach(function(seat) {
        seat.cards = [];
        seat.total = 0;
        seat.isSoft = false;
        seat.isBlackjack = false;
        seat.isBusted = false;
        seat.isStanding = false;
        seat.result = null;
    });

    // Reset deal tracking
    GameState.table.currentDealIndex = 0;
    GameState.table.dealPhase = 0;
    GameState.phase = 'dealing';

    renderSeats();
    renderActionButtons();
    updateDealingIndicator();
    
    // Save game state
    saveGameState();
}

function updateSettingsBar() {
    document.getElementById('displayDecks').textContent = GameState.config.decks;
    document.getElementById('displayBetRange').textContent =
        '$' + GameState.config.minBet + '-$' + GameState.config.maxBet;
    updateBankrollDisplay();
}

function updateBankrollDisplay() {
    var bankrollEl = document.getElementById('displayBankroll');
    bankrollEl.textContent = '$' + GameState.bankroll.current.toLocaleString();

    var profit = GameState.bankroll.current - GameState.bankroll.initial;
    bankrollEl.classList.remove('profit', 'loss');
    if (profit > 0) {
        bankrollEl.classList.add('profit');
    } else if (profit < 0) {
        bankrollEl.classList.add('loss');
    }
}

// Get current deal target based on phase (READ-ONLY - no side effects!)
function getCurrentDealTarget() {
    var activeSeats = GameState.table.activeSeats;
    var dealIndex = GameState.table.currentDealIndex;
    var dealPhase = GameState.table.dealPhase;

    if (activeSeats.length === 0) {
        return { type: 'dealer', index: -1 };
    }

    // Deal order for left-to-right:
    // Phase 0: Players left to right (first card)
    // Phase 1: Dealer first card
    // Phase 2: Players left to right (second card)
    // Phase 3: Dealer second card (American only)

    if (dealPhase === 0) {
        if (dealIndex < activeSeats.length) {
            return { type: 'player', index: activeSeats[dealIndex] };
        }
    } else if (dealPhase === 1) {
        return { type: 'dealer', index: -1 };
    } else if (dealPhase === 2) {
        if (dealIndex < activeSeats.length) {
            return { type: 'player', index: activeSeats[dealIndex] };
        }
    } else if (dealPhase === 3) {
        return { type: 'dealer', index: -1 };
    }

    return null;
}

// Advance deal position AFTER a card is dealt (called only from dealCard)
function advanceDealPosition() {
    var activeSeats = GameState.table.activeSeats;
    var dealPhase = GameState.table.dealPhase;

    if (dealPhase === 0) {
        GameState.table.currentDealIndex++;
        if (GameState.table.currentDealIndex >= activeSeats.length) {
            GameState.table.dealPhase = 1;
            GameState.table.currentDealIndex = 0;
        }
    } else if (dealPhase === 1) {
        GameState.table.dealPhase = 2;
        GameState.table.currentDealIndex = 0;
    } else if (dealPhase === 2) {
        GameState.table.currentDealIndex++;
        if (GameState.table.currentDealIndex >= activeSeats.length) {
            if (GameState.config.dealerStyle === 'american') {
                GameState.table.dealPhase = 3;
                GameState.table.currentDealIndex = 0;
            } else {
                startPlayerDecisions();
            }
        }
    } else if (dealPhase === 3) {
        startPlayerDecisions();
    }
}

function startPlayerDecisions() {
    GameState.phase = 'player_turn';
    // Start from rightmost player (last in activeSeats)
    GameState.table.currentPlayerIndex = GameState.table.activeSeats.length - 1;

    // Check for blackjacks first
    GameState.table.activeSeats.forEach(function(seatIndex) {
        var seat = GameState.table.seats[seatIndex];
        if (seat.total === 21 && seat.cards.length === 2) {
            seat.isBlackjack = true;
            seat.isStanding = true;
        }
    });

    // Find first player who needs to act
    advanceToNextPlayer();

    renderSeats();
    renderActionButtons();
    updateDealingIndicator();
}

function advanceToNextPlayer() {
    var activeSeats = GameState.table.activeSeats;

    // Find next player who hasn't stood or busted
    while (GameState.table.currentPlayerIndex >= 0) {
        var seatIndex = activeSeats[GameState.table.currentPlayerIndex];
        var seat = GameState.table.seats[seatIndex];

        if (!seat.isStanding && !seat.isBusted) {
            // This player needs to act
            renderSeats();
            renderActionButtons();
            updateDealingIndicator();
            return;
        }

        GameState.table.currentPlayerIndex--;
    }

    // All players done, dealer's turn
    startDealerTurn();
}

function startDealerTurn() {
    GameState.phase = 'dealer_turn';
    renderSeats();
    renderActionButtons();
    updateDealingIndicator();
}

function updateDealingIndicator() {
    var indicator = document.getElementById('dealingIndicator');
    if (!indicator) return;

    if (GameState.phase === 'dealing') {
        var target = getCurrentDealTarget();
        if (target) {
            if (target.type === 'dealer') {
                indicator.textContent = 'Deal card to: DEALER';
                indicator.className = 'dealing-indicator dealer';
            } else {
                var seat = GameState.table.seats[target.index];
                var cardNum = GameState.table.dealPhase < 2 ? '1st' : '2nd';
                indicator.textContent = 'Deal ' + cardNum + ' card to: Seat ' + seat.id;
                indicator.className = 'dealing-indicator ' + (seat.status === 'mine' ? 'mine' : 'other');
            }
        }
    } else if (GameState.phase === 'player_turn') {
        var activeSeats = GameState.table.activeSeats;
        if (GameState.table.currentPlayerIndex >= 0 && GameState.table.currentPlayerIndex < activeSeats.length) {
            var seatIndex = activeSeats[GameState.table.currentPlayerIndex];
            var seat = GameState.table.seats[seatIndex];
            indicator.textContent = 'Seat ' + seat.id + ' - Choose action';
            indicator.className = 'dealing-indicator ' + (seat.status === 'mine' ? 'mine' : 'other');
        }
    } else if (GameState.phase === 'dealer_turn') {
        indicator.textContent = 'DEALER\'s turn - Click cards as dealer draws';
        indicator.className = 'dealing-indicator dealer';
    } else if (GameState.phase === 'resolution') {
        indicator.textContent = 'Round complete - Click New Round to continue';
        indicator.className = 'dealing-indicator';
    }
}

function renderSeats() {
    var container = document.getElementById('seatsContainer');
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    GameState.table.seats.forEach(function(seat, index) {
        var seatEl = document.createElement('div');
        seatEl.className = 'seat ' + seat.status;

        // Highlight current player during player_turn
        if (GameState.phase === 'player_turn') {
            var activeSeats = GameState.table.activeSeats;
            if (GameState.table.currentPlayerIndex >= 0 &&
                activeSeats[GameState.table.currentPlayerIndex] === index) {
                seatEl.classList.add('active-player');
            }
        }

        // Highlight current deal target during dealing
        if (GameState.phase === 'dealing') {
            var target = getCurrentDealTarget();
            if (target && target.type === 'player' && target.index === index) {
                seatEl.classList.add('dealing-active');
            }
        }

        seatEl.dataset.seatId = seat.id;

        var circleEl = document.createElement('div');
        circleEl.className = 'seat-circle';

        var numberEl = document.createElement('span');
        numberEl.className = 'seat-number';
        numberEl.textContent = seat.id;
        circleEl.appendChild(numberEl);

        var iconEl = document.createElement('span');
        iconEl.className = 'seat-status-icon';
        iconEl.textContent = getSeatIcon(seat.status);
        circleEl.appendChild(iconEl);

        seatEl.appendChild(circleEl);

        // Seat cards display
        var cardsEl = document.createElement('div');
        cardsEl.className = 'seat-cards';
        cardsEl.id = 'seatCards' + seat.id;

        seat.cards.forEach(function(card, cardIndex) {
            var cardEl = createSeatCardElement(card, seat.status, cardIndex);
            cardsEl.appendChild(cardEl);
        });

        seatEl.appendChild(cardsEl);

        // Seat info (total)
        var infoEl = document.createElement('div');
        infoEl.className = 'seat-info';

        var totalEl = document.createElement('div');
        totalEl.className = 'seat-total';
        totalEl.id = 'seatTotal' + seat.id;

        if (seat.cards.length > 0) {
            var totalText = seat.total.toString();
            if (seat.isSoft && seat.total <= 21) {
                totalText += ' (soft)';
            }
            totalEl.textContent = totalText;

            if (seat.isBusted) {
                totalEl.classList.add('bust');
                totalEl.textContent = seat.total + ' BUST';
            } else if (seat.isBlackjack) {
                totalEl.classList.add('blackjack');
                totalEl.textContent = 'BLACKJACK!';
            } else if (seat.isStanding) {
                totalEl.classList.add('standing');
            }
        } else {
            totalEl.textContent = '-';
        }
        infoEl.appendChild(totalEl);

        seatEl.appendChild(infoEl);
        container.appendChild(seatEl);
    });

    renderDealerCards();
}

function createSeatCardElement(rank, seatStatus, cardIndex) {
    var cardEl = document.createElement('div');
    cardEl.className = 'seat-card';

    if (seatStatus === 'mine') {
        cardEl.classList.add('mine-card');
    } else {
        cardEl.classList.add('other-card');
    }

    var hiLoValue = HI_LO_VALUES[rank];
    if (hiLoValue > 0) {
        cardEl.classList.add('low-card');
    } else if (hiLoValue < 0) {
        cardEl.classList.add('high-card');
    }

    cardEl.textContent = rank;

    if (cardIndex > 0) {
        cardEl.style.marginLeft = '-12px';
    }

    return cardEl;
}

function renderDealerCards() {
    var container = document.getElementById('dealerCards');
    if (!container) return;

    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    GameState.table.dealer.cards.forEach(function(rank, index) {
        var cardEl = document.createElement('div');
        cardEl.className = 'dealer-card';

        var hiLoValue = HI_LO_VALUES[rank];
        if (hiLoValue > 0) {
            cardEl.classList.add('low-card');
        } else if (hiLoValue < 0) {
            cardEl.classList.add('high-card');
        }

        cardEl.textContent = rank;

        if (index > 0) {
            cardEl.style.marginLeft = '-12px';
        }

        container.appendChild(cardEl);
    });

    var totalEl = document.getElementById('dealerTotal');
    if (totalEl) {
        if (GameState.table.dealer.cards.length > 0) {
            var result = calculateHandTotal(GameState.table.dealer.cards);
            var totalText = result.total.toString();
            if (result.isSoft && result.total <= 21) {
                totalText += ' (soft)';
            }
            if (result.total > 21) {
                totalText = result.total + ' BUST';
                totalEl.classList.add('bust');
            }
            totalEl.textContent = totalText;
            GameState.table.dealer.total = result.total;
            GameState.table.dealer.isSoft = result.isSoft;
        } else {
            totalEl.textContent = '-';
            totalEl.classList.remove('bust');
        }
    }
}

function renderActionButtons() {
    var container = document.getElementById('actionButtons');
    if (!container) return;

    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // Update optimal move banner
    updateOptimalMoveBanner();

    if (GameState.phase === 'player_turn') {
        var activeSeats = GameState.table.activeSeats;
        if (GameState.table.currentPlayerIndex >= 0 &&
            GameState.table.currentPlayerIndex < activeSeats.length) {

            var seatIndex = activeSeats[GameState.table.currentPlayerIndex];
            var seat = GameState.table.seats[seatIndex];

            // Only show action buttons for "mine" seats
            if (seat.status === 'mine') {
                // Stand button
                var standBtn = document.createElement('button');
                standBtn.className = 'action-btn stand';
                standBtn.textContent = 'Stand';
                standBtn.onclick = function() { playerStand(); };
                container.appendChild(standBtn);

                // Double button (only on first 2 cards)
                if (seat.cards.length === 2) {
                    var doubleBtn = document.createElement('button');
                    doubleBtn.className = 'action-btn double';
                    doubleBtn.textContent = 'Double';
                    doubleBtn.onclick = function() { playerDouble(); };
                    container.appendChild(doubleBtn);

                    // Split button (only if pair)
                    var firstCard = seat.cards[0];
                    var secondCard = seat.cards[1];
                    var firstValue = getCardValue(firstCard);
                    var secondValue = getCardValue(secondCard);

                    if (firstValue === secondValue) {
                        var splitBtn = document.createElement('button');
                        splitBtn.className = 'action-btn split';
                        splitBtn.textContent = 'Split';
                        splitBtn.onclick = function() { playerSplit(); };
                        container.appendChild(splitBtn);
                    }
                }

                var hitLabel = document.createElement('div');
                hitLabel.className = 'hit-label';
                hitLabel.textContent = '← Click a card to HIT';
                container.appendChild(hitLabel);
            } else {
                // Other player - just show action labels
                var otherLabel = document.createElement('div');
                otherLabel.className = 'other-player-label';
                otherLabel.textContent = 'Other player\'s turn - Click Stand when done, or click card if they hit';
                container.appendChild(otherLabel);

                var standBtn = document.createElement('button');
                standBtn.className = 'action-btn stand';
                standBtn.textContent = 'Stand';
                standBtn.onclick = function() { playerStand(); };
                container.appendChild(standBtn);
            }
        }
    } else if (GameState.phase === 'dealer_turn') {
        var dealerLabel = document.createElement('div');
        dealerLabel.className = 'dealer-turn-label';
        dealerLabel.textContent = 'Click cards as dealer draws. Click "Done" when dealer stands.';
        container.appendChild(dealerLabel);

        var doneBtn = document.createElement('button');
        doneBtn.className = 'action-btn done';
        doneBtn.textContent = 'Dealer Done';
        doneBtn.onclick = function() { dealerDone(); };
        container.appendChild(doneBtn);
    } else if (GameState.phase === 'resolution') {
        var resultLabel = document.createElement('div');
        resultLabel.className = 'result-label';
        resultLabel.textContent = 'Round complete!';
        container.appendChild(resultLabel);
    }
}

/**
 * Update the optimal move banner with current best play recommendation
 */
function updateOptimalMoveBanner() {
    var banner = document.getElementById('optimalMoveBanner');
    var actionEl = document.getElementById('optimalMoveAction');
    var textEl = document.getElementById('optimalMoveText');
    var contextEl = document.getElementById('optimalMoveContext');

    if (!banner) return;

    // Only show during player_turn for "mine" seats
    if (GameState.phase !== 'player_turn') {
        banner.classList.remove('visible');
        return;
    }

    var activeSeats = GameState.table.activeSeats;
    if (GameState.table.currentPlayerIndex < 0 ||
        GameState.table.currentPlayerIndex >= activeSeats.length) {
        banner.classList.remove('visible');
        return;
    }

    var seatIndex = activeSeats[GameState.table.currentPlayerIndex];
    var seat = GameState.table.seats[seatIndex];

    // Only show for player's own seats
    if (seat.status !== 'mine' || seat.cards.length < 2) {
        banner.classList.remove('visible');
        return;
    }

    // Get dealer upcard
    var dealerUpcard = GameState.table.dealer.cards[0];
    if (!dealerUpcard) {
        banner.classList.remove('visible');
        return;
    }

    // Calculate optimal action using basic strategy
    var optimalAction = getBasicStrategyAction(seat, dealerUpcard);

    // Update banner content
    textEl.textContent = optimalAction.toUpperCase();

    // Update action class for color coding
    actionEl.className = 'optimal-move-action ' + optimalAction.toLowerCase();

    // Update context using safe DOM methods
    var playerTotal = seat.total;
    var softIndicator = seat.isSoft ? ' (soft)' : '';

    // Clear existing content
    while (contextEl.firstChild) {
        contextEl.removeChild(contextEl.firstChild);
    }

    // Create span element safely
    var handVsSpan = document.createElement('span');
    handVsSpan.className = 'hand-vs';
    handVsSpan.textContent = playerTotal + softIndicator + ' vs Dealer ' + dealerUpcard;
    contextEl.appendChild(handVsSpan);

    // Show banner
    banner.classList.add('visible');
}

/**
 * Get basic strategy action for current hand
 * @param {object} seat - Player seat object
 * @param {string} dealerUpcard - Dealer's visible card
 * @returns {string} Recommended action: 'Hit', 'Stand', 'Double', 'Split', 'Surrender'
 */
function getBasicStrategyAction(seat, dealerUpcard) {
    var playerTotal = seat.total;
    var isSoft = seat.isSoft;
    var cards = seat.cards;
    var dealerValue = getDealerUpcardValue(dealerUpcard);

    // Check for pair (split opportunity)
    if (cards.length === 2) {
        var firstValue = getCardValue(cards[0]);
        var secondValue = getCardValue(cards[1]);

        if (firstValue === secondValue) {
            var splitAction = getPairStrategy(cards[0], dealerValue);
            if (splitAction === 'P') return 'Split';
        }
    }

    // Soft hands (contains Ace counted as 11)
    if (isSoft) {
        return getSoftHandStrategy(playerTotal, dealerValue, cards.length === 2);
    }

    // Hard hands
    return getHardHandStrategy(playerTotal, dealerValue, cards.length === 2);
}

/**
 * Get dealer upcard value (2-11)
 */
function getDealerUpcardValue(card) {
    if (card === 'A') return 11;
    if (['K', 'Q', 'J', '10'].indexOf(card) !== -1) return 10;
    return parseInt(card);
}

/**
 * Basic strategy for pairs
 */
function getPairStrategy(card, dealerValue) {
    var cardValue = getCardValue(card);

    // Aces and 8s - always split
    if (card === 'A' || cardValue === 8) return 'P';

    // 10s, Jacks, Queens, Kings - never split
    if (cardValue === 10) return 'S';

    // 9s - split except vs 7, 10, A
    if (cardValue === 9) {
        if ([7, 10, 11].indexOf(dealerValue) !== -1) return 'S';
        return 'P';
    }

    // 7s - split vs 2-7
    if (cardValue === 7) {
        if (dealerValue <= 7) return 'P';
        return 'H';
    }

    // 6s - split vs 2-6
    if (cardValue === 6) {
        if (dealerValue >= 2 && dealerValue <= 6) return 'P';
        return 'H';
    }

    // 5s - never split, double vs 2-9
    if (cardValue === 5) {
        if (dealerValue >= 2 && dealerValue <= 9) return 'D';
        return 'H';
    }

    // 4s - split vs 5-6 only
    if (cardValue === 4) {
        if (dealerValue === 5 || dealerValue === 6) return 'P';
        return 'H';
    }

    // 3s and 2s - split vs 2-7
    if (cardValue <= 3) {
        if (dealerValue >= 2 && dealerValue <= 7) return 'P';
        return 'H';
    }

    return 'H';
}

/**
 * Basic strategy for soft hands
 */
function getSoftHandStrategy(total, dealerValue, canDouble) {
    // Soft 20 (A,9) - always stand
    if (total === 20) return 'Stand';

    // Soft 19 (A,8) - stand, double vs 6 if allowed
    if (total === 19) {
        if (canDouble && dealerValue === 6) return 'Double';
        return 'Stand';
    }

    // Soft 18 (A,7)
    if (total === 18) {
        if (dealerValue >= 9 || dealerValue === 11) return 'Hit';
        if (canDouble && dealerValue >= 3 && dealerValue <= 6) return 'Double';
        return 'Stand';
    }

    // Soft 17 (A,6)
    if (total === 17) {
        if (canDouble && dealerValue >= 3 && dealerValue <= 6) return 'Double';
        return 'Hit';
    }

    // Soft 16 (A,5)
    if (total === 16) {
        if (canDouble && dealerValue >= 4 && dealerValue <= 6) return 'Double';
        return 'Hit';
    }

    // Soft 15 (A,4)
    if (total === 15) {
        if (canDouble && dealerValue >= 4 && dealerValue <= 6) return 'Double';
        return 'Hit';
    }

    // Soft 14 (A,3)
    if (total === 14) {
        if (canDouble && dealerValue >= 5 && dealerValue <= 6) return 'Double';
        return 'Hit';
    }

    // Soft 13 (A,2)
    if (total === 13) {
        if (canDouble && dealerValue >= 5 && dealerValue <= 6) return 'Double';
        return 'Hit';
    }

    return 'Hit';
}

/**
 * Basic strategy for hard hands
 */
function getHardHandStrategy(total, dealerValue, canDouble) {
    // 17+ always stand
    if (total >= 17) return 'Stand';

    // 16
    if (total === 16) {
        // Surrender vs 9, 10, A if allowed
        if (GameState.config.surrenderAllowed && [9, 10, 11].indexOf(dealerValue) !== -1) {
            return 'Surrender';
        }
        if (dealerValue >= 2 && dealerValue <= 6) return 'Stand';
        return 'Hit';
    }

    // 15
    if (total === 15) {
        // Surrender vs 10 if allowed
        if (GameState.config.surrenderAllowed && dealerValue === 10) {
            return 'Surrender';
        }
        if (dealerValue >= 2 && dealerValue <= 6) return 'Stand';
        return 'Hit';
    }

    // 13-14
    if (total >= 13 && total <= 14) {
        if (dealerValue >= 2 && dealerValue <= 6) return 'Stand';
        return 'Hit';
    }

    // 12
    if (total === 12) {
        if (dealerValue >= 4 && dealerValue <= 6) return 'Stand';
        return 'Hit';
    }

    // 11
    if (total === 11) {
        if (canDouble) return 'Double';
        return 'Hit';
    }

    // 10
    if (total === 10) {
        if (canDouble && dealerValue >= 2 && dealerValue <= 9) return 'Double';
        return 'Hit';
    }

    // 9
    if (total === 9) {
        if (canDouble && dealerValue >= 3 && dealerValue <= 6) return 'Double';
        return 'Hit';
    }

    // 8 or less - always hit
    return 'Hit';
}

function getCardValue(rank) {
    if (rank === 'A') return 11;
    if (['K', 'Q', 'J', '10'].indexOf(rank) !== -1) return 10;
    return parseInt(rank);
}

function playerStand() {
    var activeSeats = GameState.table.activeSeats;
    var seatIndex = activeSeats[GameState.table.currentPlayerIndex];
    var seat = GameState.table.seats[seatIndex];

    seat.isStanding = true;
    GameState.table.currentPlayerIndex--;
    advanceToNextPlayer();
    
    // Save game state
    saveGameState();
}

function playerDouble() {
    // Mark that next card will end the hand
    var activeSeats = GameState.table.activeSeats;
    var seatIndex = activeSeats[GameState.table.currentPlayerIndex];
    var seat = GameState.table.seats[seatIndex];
    seat.isDoubling = true;

    // Update indicator to show waiting for card
    updateDealingIndicator();
    renderActionButtons();
}

function playerSplit() {
    alert('Split functionality coming soon');
}

function dealerDone() {
    GameState.phase = 'resolution';
    renderSeats();
    renderActionButtons();
    updateDealingIndicator();
    
    // Save game state
    saveGameState();
}

function getSeatIcon(status) {
    switch (status) {
        case 'mine': return '\u2605';
        case 'occupied': return '\u25CF';
        default: return '';
    }
}

function renderCardInput() {
    var grid = document.getElementById('cardInputGrid');
    while (grid.firstChild) {
        grid.removeChild(grid.firstChild);
    }

    CARD_RANKS.forEach(function(rank) {
        var maxCards = rank === '10' ? GameState.config.decks * 16 : GameState.config.decks * 4;
        var dealt = GameState.count.dealtByRank[rank] || 0;
        var remaining = maxCards - dealt;
        var hiLoValue = HI_LO_VALUES[rank];

        var btn = document.createElement('button');
        btn.className = 'card-btn' + (remaining === 0 ? ' depleted' : '');
        btn.disabled = remaining === 0;
        btn.onclick = function() { dealCard(rank); };

        var hiLoClass = hiLoValue > 0 ? 'plus' : hiLoValue < 0 ? 'minus' : 'zero';
        var hiLoDisplay = hiLoValue > 0 ? '+1' : hiLoValue < 0 ? '-1' : '0';

        var hiLoEl = document.createElement('span');
        hiLoEl.className = 'hilo-value ' + hiLoClass;
        hiLoEl.textContent = hiLoDisplay;
        btn.appendChild(hiLoEl);

        var rankEl = document.createElement('span');
        rankEl.className = 'card-rank';
        rankEl.textContent = rank;
        btn.appendChild(rankEl);

        var countEl = document.createElement('span');
        countEl.className = 'card-count';
        countEl.textContent = remaining;
        btn.appendChild(countEl);

        grid.appendChild(btn);
    });
}

function dealCard(rank) {
    // Update count
    GameState.count.running += HI_LO_VALUES[rank];
    GameState.count.cardsDealt++;
    GameState.count.dealtByRank[rank] = (GameState.count.dealtByRank[rank] || 0) + 1;

    var targetInfo = null;

    if (GameState.phase === 'dealing') {
        var target = getCurrentDealTarget();
        if (target) {
            if (target.type === 'dealer') {
                GameState.table.dealer.cards.push(rank);
                targetInfo = { type: 'dealer' };
            } else {
                var seat = GameState.table.seats[target.index];
                seat.cards.push(rank);
                var result = calculateHandTotal(seat.cards);
                seat.total = result.total;
                seat.isSoft = result.isSoft;
                targetInfo = { type: 'player', index: target.index, status: seat.status };
            }
            // Advance to next deal position after the card is dealt
            advanceDealPosition();
        }
    } else if (GameState.phase === 'player_turn') {
        // Hit for current player
        var activeSeats = GameState.table.activeSeats;
        var seatIndex = activeSeats[GameState.table.currentPlayerIndex];
        var seat = GameState.table.seats[seatIndex];

        seat.cards.push(rank);
        var result = calculateHandTotal(seat.cards);
        seat.total = result.total;
        seat.isSoft = result.isSoft;
        targetInfo = { type: 'player', index: seatIndex, status: seat.status };

        // Check for bust
        if (seat.total > 21) {
            seat.isBusted = true;
            GameState.table.currentPlayerIndex--;
            advanceToNextPlayer();
        } else if (seat.isDoubling) {
            // After double, player stands
            seat.isStanding = true;
            seat.isDoubling = false;
            GameState.table.currentPlayerIndex--;
            advanceToNextPlayer();
        }
    } else if (GameState.phase === 'dealer_turn') {
        GameState.table.dealer.cards.push(rank);
        var result = calculateHandTotal(GameState.table.dealer.cards);
        GameState.table.dealer.total = result.total;
        GameState.table.dealer.isSoft = result.isSoft;
        targetInfo = { type: 'dealer' };

        // Check if dealer busts
        if (result.total > 21) {
            dealerDone();
        }
    }

    // Add to history
    if (targetInfo) {
        dealtCardsHistory.push({
            rank: rank,
            target: targetInfo
        });
    }

    renderCardInput();
    renderSeats();
    renderActionButtons();
    renderDealtCards();
    updateCountDisplay();
    updateRecommendationPanel();
    updateDealingIndicator();
    
    // Save game state after card is dealt
    saveGameState();
}

function calculateHandTotal(cards) {
    var total = 0;
    var aces = 0;

    cards.forEach(function(rank) {
        if (rank === 'A') {
            aces++;
            total += 11;
        } else if (['K', 'Q', 'J', '10'].indexOf(rank) !== -1) {
            total += 10;
        } else {
            total += parseInt(rank);
        }
    });

    var isSoft = aces > 0 && total <= 21;
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
        if (aces === 0) {
            isSoft = false;
        }
    }

    return { total: total, isSoft: isSoft };
}

function renderDealtCards() {
    var container = document.getElementById('dealtCardsDisplay');
    if (!container) return;

    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    var cardsToShow = dealtCardsHistory.slice(-20);

    cardsToShow.forEach(function(card) {
        var cardEl = document.createElement('div');
        cardEl.className = 'dealt-card-mini';

        var hiLoValue = HI_LO_VALUES[card.rank];
        var hiLoClass = hiLoValue > 0 ? 'low' : hiLoValue < 0 ? 'high' : 'neutral';
        cardEl.classList.add(hiLoClass);

        if (card.target.type === 'dealer') {
            cardEl.classList.add('dealer-dealt');
        } else if (card.target.status === 'mine') {
            cardEl.classList.add('mine-dealt');
        } else {
            cardEl.classList.add('other-dealt');
        }

        cardEl.textContent = card.rank;
        container.appendChild(cardEl);
    });

    var countLabel = document.getElementById('dealtCardsCount');
    if (countLabel) {
        countLabel.textContent = dealtCardsHistory.length + ' cards dealt';
    }
}

function undoLastCard() {
    if (dealtCardsHistory.length === 0) return;

    var lastCard = dealtCardsHistory.pop();
    var rank = lastCard.rank;

    GameState.count.running -= HI_LO_VALUES[rank];
    GameState.count.cardsDealt--;
    GameState.count.dealtByRank[rank]--;

    if (lastCard.target.type === 'dealer') {
        GameState.table.dealer.cards.pop();
        var result = calculateHandTotal(GameState.table.dealer.cards);
        GameState.table.dealer.total = result.total;
        GameState.table.dealer.isSoft = result.isSoft;
    } else {
        var seat = GameState.table.seats[lastCard.target.index];
        seat.cards.pop();
        var result = calculateHandTotal(seat.cards);
        seat.total = result.total;
        seat.isSoft = result.isSoft;
        seat.isBusted = result.total > 21;
    }

    renderCardInput();
    renderSeats();
    renderDealtCards();
    updateCountDisplay();
    updateRecommendationPanel();
    
    // Save game state after undo
    saveGameState();
}

function newShoe() {
    if (confirm('Start a new shoe? This will reset the count and all hands.')) {
        resetCount();
        dealtCardsHistory = [];
        startNewRound();
        renderCardInput();
        renderDealtCards();
        updateCountDisplay();
        updateRecommendationPanel();
        
        // Save game state
        saveGameState();
    }
}

function updateCountDisplay() {
    var totalCards = GameState.config.decks * 52;
    var decksRemaining = (totalCards - GameState.count.cardsDealt) / 52;
    var trueCount = decksRemaining > 0 ? GameState.count.running / decksRemaining : 0;
    var penetration = (GameState.count.cardsDealt / totalCards) * 100;

    var rcEl = document.getElementById('runningCount');
    rcEl.textContent = (GameState.count.running >= 0 ? '+' : '') + GameState.count.running;
    rcEl.className = 'count-value ' + (GameState.count.running > 0 ? 'positive' : GameState.count.running < 0 ? 'negative' : 'neutral');

    var tcEl = document.getElementById('trueCount');
    var tcValue = Math.round(trueCount * 10) / 10;
    tcEl.textContent = (tcValue >= 0 ? '+' : '') + tcValue.toFixed(1);
    tcEl.className = 'count-value ' + (tcValue > 0 ? 'positive' : tcValue < 0 ? 'negative' : 'neutral');

    document.getElementById('decksRemaining').textContent = decksRemaining.toFixed(1);
    document.getElementById('cardsDealt').textContent = GameState.count.cardsDealt;
    document.getElementById('penetrationFill').style.width = penetration + '%';
}

function updateRecommendationPanel() {
    var totalCards = GameState.config.decks * 52;
    var decksRemaining = Math.max(0.5, (totalCards - GameState.count.cardsDealt) / 52);
    var trueCount = GameState.count.running / decksRemaining;
    var tcRounded = Math.round(trueCount * 10) / 10;

    var baseEdge = 0.005;
    var edgePerTC = 0.005;
    var playerEdge = -baseEdge + (tcRounded * edgePerTC);

    var edgeBadge = document.getElementById('edgeBadge');
    if (playerEdge > 0) {
        edgeBadge.textContent = 'Player Edge: +' + (playerEdge * 100).toFixed(2) + '%';
        edgeBadge.className = 'edge-badge positive';
    } else {
        edgeBadge.textContent = 'House Edge: ' + Math.abs(playerEdge * 100).toFixed(2) + '%';
        edgeBadge.className = 'edge-badge negative';
    }

    var recommendedBet = GameState.config.minBet;
    var betUnits = '1 unit (minimum)';

    if (tcRounded >= 4) {
        recommendedBet = GameState.config.minBet * 8;
        betUnits = '8 units (max spread)';
    } else if (tcRounded >= 3) {
        recommendedBet = GameState.config.minBet * 6;
        betUnits = '6 units';
    } else if (tcRounded >= 2) {
        recommendedBet = GameState.config.minBet * 4;
        betUnits = '4 units';
    } else if (tcRounded >= 1) {
        recommendedBet = GameState.config.minBet * 2;
        betUnits = '2 units';
    }

    recommendedBet = Math.min(recommendedBet, GameState.config.maxBet);

    document.getElementById('recommendedBet').textContent = '$' + recommendedBet;
    document.getElementById('betUnits').textContent = betUnits;

    var profit = GameState.bankroll.current - GameState.bankroll.initial;
    var profitEl = document.getElementById('sessionProfit');
    profitEl.textContent = (profit >= 0 ? '+$' : '-$') + Math.abs(profit);
    profitEl.className = 'stat-value ' + (profit >= 0 ? 'positive' : 'negative');

    document.getElementById('handsPlayed').textContent = GameState.session.hands.length;
}

function finishSession() {
    if (confirm('End this session? Your progress will be saved in history.')) {
        // Clear saved game state so next load shows setup
        clearSavedGameState();
        
        // Reset to setup screen
        GameState.phase = 'setup';
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('setupScreen').style.display = 'block';
        
        // Show session summary (to be implemented)
        alert('Session complete! Returning to setup.');
    }
}

function showSettings() {
    alert('Settings panel coming soon');
}

function toggleHistory() {
    var content = document.getElementById('historyContent');
    var toggle = document.getElementById('historyToggle');

    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '▲';
    } else {
        content.style.display = 'none';
        toggle.textContent = '▼';
    }
}
