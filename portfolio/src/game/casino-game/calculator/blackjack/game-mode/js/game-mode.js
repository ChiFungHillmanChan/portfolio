/**
 * Blackjack Game Mode
 * Visual chip betting on table felt
 */

// =====================================================
// GAME STATE
// =====================================================

const GameState = {
    config: {
        decks: 6,
        minBet: 5,
        maxBet: 100000000,      // 100M max bet
        maxSideBet: 1000000,    // 1M max side bet
        dealerRule: 'S17',
        blackjackPays: 1.5,
        autoNextDelay: 3000
    },
    bankroll: {
        initial: 1000,
        current: 1000
    },
    shoe: {
        cards: [],
        dealt: 0
    },
    table: {
        seats: [],
        dealer: {
            cards: [],
            total: 0,
            isSoft: false,
            hasBlackjack: false
        },
        currentSeatIndex: -1,
        currentHandIndex: 0
    },
    sideBets: {
        perfectPair: 0,
        twentyOnePlus3: 0,
        top3: 0
    },
    sideBetResults: {
        perfectPair: null,
        twentyOnePlus3: null,
        top3: null
    },
    selectedChip: 25,
    phase: 'setup',
    lastRoundResults: null
};

const CHIP_VALUES = [1, 5, 10, 25, 100, 500, 1000, 5000, 25000, 100000];
const STORAGE_KEY = 'blackjack_game_mode_settings';
const GAME_STATE_KEY = 'blackjack_game_mode_state';

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    if (hasSavedGameState()) {
        if (restoreSavedGameState()) {
            showGameScreen();
            renderGame();
        } else {
            initializeSetup();
        }
    } else {
        initializeSetup();
    }
});

function initializeSetup() {
    loadSavedSettings();
    
    var setupForm = document.getElementById('setupForm');
    if (setupForm) {
        setupForm.addEventListener('submit', handleSetupSubmit);
    }
    
    document.querySelectorAll('.seat-select-btn').forEach(function(btn) {
        btn.addEventListener('click', handleSeatSelect);
    });
    
    var buyinInput = document.getElementById('buyin');
    if (buyinInput) {
        buyinInput.addEventListener('input', updateBuyinDisplay);
    }
    
    updateSeatCount();
}

function handleSeatSelect(e) {
    var btn = e.target;
    var selectedCount = document.querySelectorAll('.seat-select-btn.selected').length;
    
    if (btn.classList.contains('selected')) {
        btn.classList.remove('selected');
    } else if (selectedCount < 3) {
        btn.classList.add('selected');
    }
    
    updateSeatCount();
}

function updateSeatCount() {
    var count = document.querySelectorAll('.seat-select-btn.selected').length;
    var countEl = document.getElementById('selectedSeatCount');
    if (countEl) {
        countEl.textContent = count;
    }
}

function updateBuyinDisplay() {
    var buyinInput = document.getElementById('buyin');
    var displayEl = document.getElementById('buyinDisplay');
    if (buyinInput && displayEl) {
        displayEl.textContent = '$' + parseInt(buyinInput.value || 0).toLocaleString();
    }
}

function handleSetupSubmit(e) {
    e.preventDefault();
    
    var selectedSeats = document.querySelectorAll('.seat-select-btn.selected');
    if (selectedSeats.length === 0) {
        showToast('Please select at least one seat');
        return;
    }
    
    var buyin = parseInt(document.getElementById('buyin').value) || 1000;
    GameState.bankroll.initial = buyin;
    GameState.bankroll.current = buyin;
    
    GameState.table.seats = [];
    selectedSeats.forEach(function(btn) {
        var seatNum = parseInt(btn.dataset.seat);
        GameState.table.seats.push({
            id: seatNum,
            hands: [createEmptyHand()],
            bet: 0,
            activeHandIndex: 0
        });
    });
    
    GameState.table.seats.sort(function(a, b) { return a.id - b.id; });
    
    initializeShoe();
    saveSettings();
    
    GameState.phase = 'betting';
    showGameScreen();
    renderGame();
    saveGameState();
}

function createEmptyHand() {
    return {
        cards: [],
        bet: 0,
        total: 0,
        isSoft: false,
        isDoubled: false,
        isSplit: false,
        isComplete: false,
        isBusted: false,
        isBlackjack: false,
        result: null
    };
}

// =====================================================
// SCREEN MANAGEMENT
// =====================================================

function showGameScreen() {
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';
    
    setupGameEventListeners();
}

function showSetupScreen() {
    document.getElementById('setupScreen').style.display = 'flex';
    document.getElementById('gameScreen').style.display = 'none';
}

function setupGameEventListeners() {
    // Info button
    document.getElementById('infoBtn').addEventListener('click', showPayoutModal);
    document.getElementById('closePayoutModal').addEventListener('click', hidePayoutModal);
    document.getElementById('payoutModal').addEventListener('click', function(e) {
        if (e.target === this) hidePayoutModal();
    });
    
    // New game button
    document.getElementById('newGameBtn').addEventListener('click', newGame);
    
    // Control buttons
    document.getElementById('clearBetsBtn').addEventListener('click', clearBets);
    document.getElementById('dealBtn').addEventListener('click', startDeal);
    
    // Chip rack
    setupChipRack();
}

function showPayoutModal() {
    document.getElementById('payoutModal').style.display = 'flex';
}

function hidePayoutModal() {
    document.getElementById('payoutModal').style.display = 'none';
}

// =====================================================
// CHIP SELECTION & PLACEMENT
// =====================================================

function setupChipRack() {
    var chips = document.querySelectorAll('.chip-rack .chip');
    chips.forEach(function(chip) {
        chip.addEventListener('click', function() {
            selectChip(parseInt(this.dataset.value));
        });
    });
}

function selectChip(value) {
    GameState.selectedChip = value;
    
    // Update visual selection
    document.querySelectorAll('.chip-rack .chip').forEach(function(chip) {
        chip.classList.remove('selected');
        if (parseInt(chip.dataset.value) === value) {
            chip.classList.add('selected');
        }
    });
}

function placeBetOnSpot(spotType, seatIndex) {
    if (GameState.phase !== 'betting') return;
    
    var chipValue = GameState.selectedChip;
    
    // Check if can afford
    if (!canAffordBet(chipValue)) {
        showToast('Not enough funds');
        return;
    }
    
    if (spotType === 'main') {
        var seat = GameState.table.seats[seatIndex];
        var newBet = seat.bet + chipValue;
        if (newBet > GameState.config.maxBet) {
            showToast('Max bet is $' + GameState.config.maxBet.toLocaleString());
            return;
        }
        seat.bet = newBet;
        seat.hands[0].bet = newBet;
    } else {
        // Side bet
        var currentBet = GameState.sideBets[spotType] || 0;
        var newBet = currentBet + chipValue;
        if (newBet > GameState.config.maxSideBet) {
            showToast('Max side bet is $' + GameState.config.maxSideBet.toLocaleString());
            return;
        }
        GameState.sideBets[spotType] = newBet;
    }
    
    renderBettingArea();
    updateTotalBetDisplay();
    saveGameState();
}

function removeBetFromSpot(spotType, seatIndex) {
    if (GameState.phase !== 'betting') return;
    
    var chipValue = GameState.selectedChip;
    
    if (spotType === 'main') {
        var seat = GameState.table.seats[seatIndex];
        seat.bet = Math.max(0, seat.bet - chipValue);
        seat.hands[0].bet = seat.bet;
    } else {
        var currentBet = GameState.sideBets[spotType] || 0;
        GameState.sideBets[spotType] = Math.max(0, currentBet - chipValue);
    }
    
    renderBettingArea();
    updateTotalBetDisplay();
    saveGameState();
}

function canAffordBet(additionalAmount) {
    var totalBets = getTotalBets();
    return totalBets + additionalAmount <= GameState.bankroll.current;
}

function getTotalBets() {
    var total = 0;
    GameState.table.seats.forEach(function(s) {
        total += s.bet || 0;
    });
    total += GameState.sideBets.perfectPair || 0;
    total += GameState.sideBets.twentyOnePlus3 || 0;
    total += GameState.sideBets.top3 || 0;
    return total;
}

function clearBets() {
    GameState.table.seats.forEach(function(seat) {
        seat.bet = 0;
        seat.hands[0].bet = 0;
    });
    GameState.sideBets.perfectPair = 0;
    GameState.sideBets.twentyOnePlus3 = 0;
    GameState.sideBets.top3 = 0;
    
    renderBettingArea();
    updateTotalBetDisplay();
    saveGameState();
}

function updateTotalBetDisplay() {
    var totalEl = document.getElementById('totalBetDisplay');
    if (totalEl) {
        totalEl.textContent = '$' + getTotalBets();
    }
    
    // Update deal button state
    var dealBtn = document.getElementById('dealBtn');
    if (dealBtn) {
        var hasMainBet = GameState.table.seats.some(function(s) { return s.bet > 0; });
        dealBtn.disabled = !hasMainBet;
    }
}

// =====================================================
// CHIP STACK RENDERING
// =====================================================

function renderChipStack(amount, small) {
    if (amount <= 0) return '';
    
    var chips = getChipBreakdown(amount);
    var html = '<div class="chip-stack">';
    
    chips.forEach(function(chip) {
        var displayValue = chip.value;
        if (chip.value >= 1000) {
            displayValue = (chip.value / 1000) + 'K';
        }
        html += '<div class="chip-placed chip-' + chip.value + '">' + displayValue + '</div>';
    });
    
    html += '</div>';
    return html;
}

function getChipBreakdown(amount) {
    var chips = [];
    var remaining = amount;
    var values = [100000, 25000, 5000, 1000, 500, 100, 25, 10, 5, 1];
    
    values.forEach(function(value) {
        while (remaining >= value && chips.length < 8) {
            chips.push({ value: value });
            remaining -= value;
        }
    });
    
    // Return with larger chips first (they'll be at bottom of stack visually)
    return chips;
}

// =====================================================
// SHOE MANAGEMENT
// =====================================================

function initializeShoe() {
    GameState.shoe.cards = [];
    
    for (var d = 0; d < GameState.config.decks; d++) {
        for (var s = 0; s < CARD_SUITS.length; s++) {
            for (var r = 0; r < CARD_RANKS.length; r++) {
                GameState.shoe.cards.push({
                    rank: CARD_RANKS[r],
                    suit: CARD_SUITS[s]
                });
            }
        }
    }
    
    shuffleShoe();
}

function shuffleShoe() {
    var cards = GameState.shoe.cards;
    for (var i = cards.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = cards[i];
        cards[i] = cards[j];
        cards[j] = temp;
    }
    GameState.shoe.dealt = 0;
    showToast('Shoe shuffled');
}

function drawCard() {
    if (GameState.shoe.dealt >= GameState.shoe.cards.length) {
        shuffleShoe();
    }
    var card = GameState.shoe.cards[GameState.shoe.dealt];
    GameState.shoe.dealt++;
    return card;
}

function needsReshuffle() {
    return GameState.shoe.dealt / GameState.shoe.cards.length > 0.75;
}

// =====================================================
// DEALING
// =====================================================

function startDeal() {
    var hasMainBet = GameState.table.seats.some(function(s) { return s.bet > 0; });
    if (!hasMainBet) {
        showToast('Place at least one main bet');
        return;
    }
    
    if (needsReshuffle()) {
        shuffleShoe();
    }
    
    // Deduct bets
    GameState.bankroll.current -= getTotalBets();
    
    // Reset hands
    GameState.table.seats.forEach(function(seat) {
        seat.hands = [createEmptyHand()];
        seat.hands[0].bet = seat.bet;
        seat.activeHandIndex = 0;
    });
    
    GameState.table.dealer = {
        cards: [],
        total: 0,
        isSoft: false,
        hasBlackjack: false
    };
    
    GameState.sideBetResults = {
        perfectPair: null,
        twentyOnePlus3: null,
        top3: null
    };
    
    GameState.phase = 'dealing';
    renderGame();
    
    dealInitialCards();
}

function dealInitialCards() {
    var dealSequence = [];
    
    GameState.table.seats.forEach(function(seat, index) {
        if (seat.bet > 0) {
            dealSequence.push({ type: 'player', seatIndex: index });
        }
    });
    
    dealSequence.push({ type: 'dealer' });
    
    GameState.table.seats.forEach(function(seat, index) {
        if (seat.bet > 0) {
            dealSequence.push({ type: 'player', seatIndex: index });
        }
    });
    
    dealSequence.push({ type: 'dealer' });
    
    var dealIndex = 0;
    var dealInterval = setInterval(function() {
        if (dealIndex >= dealSequence.length) {
            clearInterval(dealInterval);
            afterInitialDeal();
            return;
        }
        
        var deal = dealSequence[dealIndex];
        var card = drawCard();
        
        if (deal.type === 'player') {
            var seat = GameState.table.seats[deal.seatIndex];
            seat.hands[0].cards.push(card);
            updateHandTotal(seat.hands[0]);
        } else {
            GameState.table.dealer.cards.push(card);
            updateDealerTotal();
        }
        
        renderGame();
        dealIndex++;
    }, 180);
}

function afterInitialDeal() {
    evaluateImmediateSideBets();
    
    if (GameState.table.dealer.total === 21 && GameState.table.dealer.cards.length === 2) {
        GameState.table.dealer.hasBlackjack = true;
        GameState.phase = 'dealer_turn';
        renderGame();
        setTimeout(resolveDealerBlackjack, 600);
        return;
    }
    
    GameState.table.seats.forEach(function(seat) {
        var hand = seat.hands[0];
        if (hand.cards.length > 0 && hand.total === 21) {
            hand.isBlackjack = true;
            hand.isComplete = true;
        }
    });
    
    startPlayerTurn();
}

function evaluateImmediateSideBets() {
    var resultsContainer = document.getElementById('sideBetResults');
    resultsContainer.style.display = 'flex';
    
    if (GameState.sideBets.perfectPair > 0) {
        var firstSeat = GameState.table.seats.find(function(s) { return s.bet > 0; });
        if (firstSeat && firstSeat.hands[0].cards.length >= 2) {
            GameState.sideBetResults.perfectPair = SideBets.evaluatePerfectPair(firstSeat.hands[0].cards);
            showSideBetResult('perfectPair', GameState.sideBetResults.perfectPair);
        }
    }
    
    if (GameState.sideBets.twentyOnePlus3 > 0) {
        var firstSeat = GameState.table.seats.find(function(s) { return s.bet > 0; });
        var dealerUpcard = GameState.table.dealer.cards[0];
        if (firstSeat && firstSeat.hands[0].cards.length >= 2 && dealerUpcard) {
            GameState.sideBetResults.twentyOnePlus3 = SideBets.evaluate21Plus3(
                firstSeat.hands[0].cards, 
                dealerUpcard
            );
            showSideBetResult('twentyOnePlus3', GameState.sideBetResults.twentyOnePlus3);
        }
    }
}

function showSideBetResult(betType, result) {
    var el = document.getElementById(betType + 'Result');
    if (!el) return;
    
    if (result && result.win) {
        el.className = 'side-bet-result win';
        el.textContent = result.description + ' (' + result.payout + ':1)';
    } else if (GameState.sideBets[betType] > 0) {
        el.className = 'side-bet-result lose';
        el.textContent = (betType === 'perfectPair' ? 'No Pair' : 'No Hand');
    }
}

// =====================================================
// PLAYER TURN
// =====================================================

function startPlayerTurn() {
    GameState.phase = 'player_turn';
    GameState.table.currentSeatIndex = GameState.table.seats.length - 1;
    advanceToNextHand();
}

function advanceToNextHand() {
    while (GameState.table.currentSeatIndex >= 0) {
        var seat = GameState.table.seats[GameState.table.currentSeatIndex];
        
        if (seat.bet === 0) {
            GameState.table.currentSeatIndex--;
            continue;
        }
        
        var hand = seat.hands[seat.activeHandIndex];
        
        if (!hand.isComplete && !hand.isBusted && !hand.isBlackjack) {
            renderGame();
            renderActionButtons();
            return;
        }
        
        if (seat.activeHandIndex < seat.hands.length - 1) {
            seat.activeHandIndex++;
            continue;
        }
        
        seat.activeHandIndex = 0;
        GameState.table.currentSeatIndex--;
    }
    
    startDealerTurn();
}

function playerHit() {
    var seat = GameState.table.seats[GameState.table.currentSeatIndex];
    var hand = seat.hands[seat.activeHandIndex];
    
    var card = drawCard();
    hand.cards.push(card);
    updateHandTotal(hand);
    
    if (hand.total > 21) {
        hand.isBusted = true;
        hand.isComplete = true;
        hand.result = 'lose';
    } else if (hand.total === 21) {
        hand.isComplete = true;
    }
    
    renderGame();
    
    if (hand.isComplete || hand.isBusted) {
        setTimeout(advanceToNextHand, 300);
    } else {
        renderActionButtons();
    }
    
    saveGameState();
}

function playerStand() {
    var seat = GameState.table.seats[GameState.table.currentSeatIndex];
    var hand = seat.hands[seat.activeHandIndex];
    
    hand.isComplete = true;
    renderGame();
    setTimeout(advanceToNextHand, 300);
    saveGameState();
}

function playerDouble() {
    var seat = GameState.table.seats[GameState.table.currentSeatIndex];
    var hand = seat.hands[seat.activeHandIndex];
    
    if (GameState.bankroll.current < hand.bet) {
        showToast('Not enough funds');
        return;
    }
    
    GameState.bankroll.current -= hand.bet;
    hand.bet *= 2;
    hand.isDoubled = true;
    
    var card = drawCard();
    hand.cards.push(card);
    updateHandTotal(hand);
    
    hand.isComplete = true;
    if (hand.total > 21) {
        hand.isBusted = true;
        hand.result = 'lose';
    }
    
    renderGame();
    setTimeout(advanceToNextHand, 300);
    saveGameState();
}

function playerSplit() {
    var seat = GameState.table.seats[GameState.table.currentSeatIndex];
    var hand = seat.hands[seat.activeHandIndex];
    
    if (hand.cards.length !== 2) return;
    if (getCardValue(hand.cards[0].rank) !== getCardValue(hand.cards[1].rank)) return;
    
    if (GameState.bankroll.current < hand.bet) {
        showToast('Not enough funds');
        return;
    }
    
    GameState.bankroll.current -= hand.bet;
    
    var secondCard = hand.cards.pop();
    var newHand = createEmptyHand();
    newHand.cards.push(secondCard);
    newHand.bet = hand.bet;
    newHand.isSplit = true;
    hand.isSplit = true;
    
    var card1 = drawCard();
    var card2 = drawCard();
    hand.cards.push(card1);
    newHand.cards.push(card2);
    
    updateHandTotal(hand);
    updateHandTotal(newHand);
    
    seat.hands.push(newHand);
    
    if (hand.total === 21) hand.isComplete = true;
    if (newHand.total === 21) newHand.isComplete = true;
    
    renderGame();
    
    if (hand.isComplete) {
        setTimeout(advanceToNextHand, 300);
    } else {
        renderActionButtons();
    }
    
    saveGameState();
}

function renderActionButtons() {
    var container = document.getElementById('actionButtons');
    container.innerHTML = '';
    
    if (GameState.phase !== 'player_turn') return;
    
    var seat = GameState.table.seats[GameState.table.currentSeatIndex];
    if (!seat || seat.bet === 0) return;
    
    var hand = seat.hands[seat.activeHandIndex];
    if (!hand || hand.isComplete) return;
    
    var hitBtn = document.createElement('button');
    hitBtn.className = 'action-btn hit';
    hitBtn.textContent = 'HIT';
    hitBtn.onclick = playerHit;
    container.appendChild(hitBtn);
    
    var standBtn = document.createElement('button');
    standBtn.className = 'action-btn stand';
    standBtn.textContent = 'STAND';
    standBtn.onclick = playerStand;
    container.appendChild(standBtn);
    
    if (hand.cards.length === 2 && !hand.isSplit) {
        var doubleBtn = document.createElement('button');
        doubleBtn.className = 'action-btn double';
        doubleBtn.textContent = 'DOUBLE';
        doubleBtn.onclick = playerDouble;
        doubleBtn.disabled = GameState.bankroll.current < hand.bet;
        container.appendChild(doubleBtn);
    }
    
    if (hand.cards.length === 2 && 
        getCardValue(hand.cards[0].rank) === getCardValue(hand.cards[1].rank) &&
        seat.hands.length < 7) {
        var splitBtn = document.createElement('button');
        splitBtn.className = 'action-btn split';
        splitBtn.textContent = 'SPLIT';
        splitBtn.onclick = playerSplit;
        splitBtn.disabled = GameState.bankroll.current < hand.bet;
        container.appendChild(splitBtn);
    }
}

// =====================================================
// DEALER TURN
// =====================================================

function startDealerTurn() {
    GameState.phase = 'dealer_turn';
    document.getElementById('actionButtons').innerHTML = '';
    renderGame();
    
    var hasActiveHands = GameState.table.seats.some(function(seat) {
        return seat.hands.some(function(hand) {
            return hand.bet > 0 && !hand.isBusted;
        });
    });
    
    if (!hasActiveHands) {
        evaluateTop3SideBet();
        setTimeout(resolveRound, 500);
        return;
    }
    
    setTimeout(dealerDraw, 500);
}

function dealerDraw() {
    var dealer = GameState.table.dealer;
    
    if (dealer.total >= 17) {
        evaluateTop3SideBet();
        setTimeout(resolveRound, 500);
        return;
    }
    
    var card = drawCard();
    dealer.cards.push(card);
    updateDealerTotal();
    renderGame();
    
    if (dealer.total > 21) {
        evaluateTop3SideBet();
        setTimeout(resolveRound, 500);
    } else {
        setTimeout(dealerDraw, 400);
    }
}

function evaluateTop3SideBet() {
    if (GameState.sideBets.top3 > 0 && GameState.table.dealer.cards.length >= 3) {
        GameState.sideBetResults.top3 = SideBets.evaluateTop3(GameState.table.dealer.cards);
        showSideBetResult('top3', GameState.sideBetResults.top3);
    }
}

function resolveDealerBlackjack() {
    GameState.table.seats.forEach(function(seat) {
        seat.hands.forEach(function(hand) {
            if (hand.bet > 0) {
                if (hand.isBlackjack) {
                    hand.result = 'push';
                } else {
                    hand.result = 'lose';
                }
                hand.isComplete = true;
            }
        });
    });
    
    evaluateTop3SideBet();
    resolveRound();
}

// =====================================================
// RESOLUTION
// =====================================================

function resolveRound() {
    GameState.phase = 'resolution';
    
    var dealerTotal = GameState.table.dealer.total;
    var dealerBusted = dealerTotal > 21;
    var totalWinnings = 0;
    
    GameState.table.seats.forEach(function(seat) {
        seat.hands.forEach(function(hand) {
            if (hand.bet === 0) return;
            
            if (hand.result) {
                if (hand.result === 'push') {
                    totalWinnings += hand.bet;
                }
            } else if (hand.isBusted) {
                hand.result = 'lose';
            } else if (hand.isBlackjack) {
                hand.result = 'blackjack';
                totalWinnings += hand.bet + (hand.bet * GameState.config.blackjackPays);
            } else if (dealerBusted) {
                hand.result = 'win';
                totalWinnings += hand.bet * 2;
            } else if (hand.total > dealerTotal) {
                hand.result = 'win';
                totalWinnings += hand.bet * 2;
            } else if (hand.total < dealerTotal) {
                hand.result = 'lose';
            } else {
                hand.result = 'push';
                totalWinnings += hand.bet;
            }
        });
    });
    
    if (GameState.sideBets.perfectPair > 0 && GameState.sideBetResults.perfectPair?.win) {
        totalWinnings += SideBets.calculateWinnings(
            GameState.sideBets.perfectPair, 
            GameState.sideBetResults.perfectPair.payout
        );
    }
    
    if (GameState.sideBets.twentyOnePlus3 > 0 && GameState.sideBetResults.twentyOnePlus3?.win) {
        totalWinnings += SideBets.calculateWinnings(
            GameState.sideBets.twentyOnePlus3, 
            GameState.sideBetResults.twentyOnePlus3.payout
        );
    }
    
    if (GameState.sideBets.top3 > 0 && GameState.sideBetResults.top3?.win) {
        totalWinnings += SideBets.calculateWinnings(
            GameState.sideBets.top3, 
            GameState.sideBetResults.top3.payout
        );
    }
    
    GameState.bankroll.current += totalWinnings;
    
    var netResult = totalWinnings - getTotalBetsForLastRound();
    GameState.lastRoundResults = { netResult: netResult, totalWinnings: totalWinnings };
    
    renderGame();
    showResultOverlay(netResult);
    saveGameState();
}

function getTotalBetsForLastRound() {
    var total = 0;
    GameState.table.seats.forEach(function(seat) {
        seat.hands.forEach(function(hand) {
            total += hand.bet || 0;
        });
    });
    total += GameState.sideBets.perfectPair || 0;
    total += GameState.sideBets.twentyOnePlus3 || 0;
    total += GameState.sideBets.top3 || 0;
    return total;
}

function showResultOverlay(netResult) {
    var overlay = document.getElementById('resultOverlay');
    var amountEl = document.getElementById('resultAmount');
    var countdownEl = document.getElementById('countdown');
    
    if (netResult > 0) {
        amountEl.textContent = '+$' + netResult.toFixed(0);
        amountEl.className = 'result-amount win';
    } else if (netResult < 0) {
        amountEl.textContent = '-$' + Math.abs(netResult).toFixed(0);
        amountEl.className = 'result-amount lose';
    } else {
        amountEl.textContent = '$0';
        amountEl.className = 'result-amount push';
    }
    
    overlay.style.display = 'flex';
    
    var count = 3;
    countdownEl.textContent = count;
    
    var countdownInterval = setInterval(function() {
        count--;
        countdownEl.textContent = count;
        
        if (count <= 0) {
            clearInterval(countdownInterval);
            overlay.style.display = 'none';
            startNewRound();
        }
    }, 1000);
}

function startNewRound() {
    GameState.table.seats.forEach(function(seat) {
        seat.hands = [createEmptyHand()];
        seat.hands[0].bet = seat.bet;
        seat.activeHandIndex = 0;
    });
    
    GameState.table.dealer = {
        cards: [],
        total: 0,
        isSoft: false,
        hasBlackjack: false
    };
    
    GameState.sideBetResults = {
        perfectPair: null,
        twentyOnePlus3: null,
        top3: null
    };
    
    document.getElementById('sideBetResults').style.display = 'none';
    document.querySelectorAll('.side-bet-result').forEach(function(el) {
        el.className = 'side-bet-result';
        el.textContent = '';
    });
    
    GameState.lastRoundResults = null;
    GameState.phase = 'betting';
    
    renderGame();
    saveGameState();
}

// =====================================================
// HAND CALCULATIONS
// =====================================================

function updateHandTotal(hand) {
    var total = 0;
    var aces = 0;
    
    hand.cards.forEach(function(card) {
        if (card.rank === 'A') {
            aces++;
            total += 11;
        } else {
            total += getCardValue(card.rank);
        }
    });
    
    hand.isSoft = aces > 0 && total <= 21;
    
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }
    
    if (aces === 0) hand.isSoft = false;
    hand.total = total;
}

function updateDealerTotal() {
    var dealer = GameState.table.dealer;
    var total = 0;
    var aces = 0;
    
    dealer.cards.forEach(function(card) {
        if (card.rank === 'A') {
            aces++;
            total += 11;
        } else {
            total += getCardValue(card.rank);
        }
    });
    
    dealer.isSoft = aces > 0 && total <= 21;
    
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }
    
    if (aces === 0) dealer.isSoft = false;
    dealer.total = total;
}

function getCardValue(rank) {
    if (rank === 'A') return 11;
    if (['K', 'Q', 'J'].indexOf(rank) !== -1) return 10;
    return parseInt(rank);
}

// =====================================================
// RENDERING
// =====================================================

function renderGame() {
    renderBankroll();
    renderDealer();
    renderBettingArea();
    
    var controlBar = document.querySelector('.control-bar');
    
    if (GameState.phase === 'betting') {
        document.getElementById('playerCardsArea').innerHTML = '';
        document.getElementById('actionButtons').innerHTML = '';
        if (controlBar) controlBar.style.display = 'flex';
    } else {
        renderPlayerCards();
        if (controlBar) controlBar.style.display = 'none';
    }
    
    updateTotalBetDisplay();
}

function renderBankroll() {
    var el = document.getElementById('bankrollDisplay');
    if (el) {
        el.textContent = '$' + GameState.bankroll.current.toLocaleString();
        
        var profit = GameState.bankroll.current - GameState.bankroll.initial;
        el.classList.remove('profit', 'loss');
        if (profit > 0) el.classList.add('profit');
        if (profit < 0) el.classList.add('loss');
    }
}

function renderDealer() {
    var container = document.getElementById('dealerCards');
    if (!container) return;
    
    container.innerHTML = '';
    
    var dealer = GameState.table.dealer;
    var showHoleCard = GameState.phase === 'dealer_turn' || GameState.phase === 'resolution';
    
    dealer.cards.forEach(function(card, index) {
        var cardEl = createCardElement(card, index === 1 && !showHoleCard);
        container.appendChild(cardEl);
    });
    
    var totalEl = document.getElementById('dealerTotal');
    if (totalEl) {
        if (dealer.cards.length === 0) {
            totalEl.textContent = '';
            totalEl.className = 'dealer-total';
        } else if (!showHoleCard && dealer.cards.length > 1) {
            totalEl.textContent = getCardValue(dealer.cards[0].rank);
            totalEl.className = 'dealer-total';
        } else {
            var text = dealer.total.toString();
            if (dealer.isSoft && dealer.total <= 21) text += ' (soft)';
            if (dealer.total > 21) {
                text = 'BUST';
                totalEl.className = 'dealer-total bust';
            } else {
                totalEl.className = 'dealer-total';
            }
            totalEl.textContent = text;
        }
    }
}

function renderBettingArea() {
    var container = document.getElementById('bettingArea');
    if (!container) return;
    
    container.innerHTML = '';
    var isBetting = GameState.phase === 'betting';
    
    GameState.table.seats.forEach(function(seat, seatIndex) {
        var group = document.createElement('div');
        group.className = 'seat-betting-group';
        group.dataset.seatIndex = seatIndex;
        
        // Side bets top row (PP and 21+3)
        var sideBetsTop = document.createElement('div');
        sideBetsTop.className = 'side-bets-top';
        
        // Perfect Pair
        var ppSpot = createBettingSpot('perfectPair', seatIndex, 'PP', GameState.sideBets.perfectPair, isBetting);
        sideBetsTop.appendChild(ppSpot);
        
        // 21+3
        var tp3Spot = createBettingSpot('twentyOnePlus3', seatIndex, '21+3', GameState.sideBets.twentyOnePlus3, isBetting);
        sideBetsTop.appendChild(tp3Spot);
        
        group.appendChild(sideBetsTop);
        
        // Main bet
        var mainSpot = createBettingSpot('main', seatIndex, '', seat.bet, isBetting);
        mainSpot.classList.add('main-bet');
        group.appendChild(mainSpot);
        
        // Top 3 below main
        var t3Container = document.createElement('div');
        t3Container.className = 'side-bet-bottom';
        var t3Spot = createBettingSpot('top3', seatIndex, 'TOP3', GameState.sideBets.top3, isBetting);
        t3Container.appendChild(t3Spot);
        group.appendChild(t3Container);
        
        // Seat label
        var label = document.createElement('div');
        label.className = 'seat-label';
        label.textContent = 'Seat ' + seat.id;
        group.appendChild(label);
        
        container.appendChild(group);
    });
}

function createBettingSpot(spotType, seatIndex, labelText, betAmount, interactive) {
    var spot = document.createElement('div');
    spot.className = 'betting-spot' + (spotType !== 'main' ? ' side-bet' : '');
    
    if (betAmount > 0) {
        spot.classList.add('has-bet');
    }
    
    // Disable when not in betting phase or can't afford
    if (!interactive) {
        spot.classList.add('locked');
    } else if (!canAffordBet(GameState.selectedChip)) {
        spot.classList.add('disabled');
    }
    
    // Label (show only when no chips)
    if (labelText && betAmount === 0) {
        var label = document.createElement('span');
        label.className = 'spot-label';
        label.textContent = labelText;
        spot.appendChild(label);
    }
    
    // Chip stack
    if (betAmount > 0) {
        spot.innerHTML += renderChipStack(betAmount, true);
    }
    
    // Only add click handlers if interactive
    if (interactive) {
        // Click to place bet
        spot.addEventListener('click', function(e) {
            e.preventDefault();
            placeBetOnSpot(spotType, seatIndex);
        });
        
        // Right-click to remove bet
        spot.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            removeBetFromSpot(spotType, seatIndex);
        });
    }
    
    return spot;
}

function renderPlayerCards() {
    var container = document.getElementById('playerCardsArea');
    if (!container) return;
    
    container.innerHTML = '';
    
    GameState.table.seats.forEach(function(seat, seatIndex) {
        if (seat.bet === 0) return;
        
        var seatEl = document.createElement('div');
        seatEl.className = 'player-seat';
        
        var isActive = GameState.phase === 'player_turn' && GameState.table.currentSeatIndex === seatIndex;
        if (isActive) {
            seatEl.classList.add('active');
        }
        
        seat.hands.forEach(function(hand, handIndex) {
            if (hand.cards.length === 0) return;
            
            var handEl = document.createElement('div');
            handEl.className = 'hand';
            if (seat.hands.length > 1 && seat.activeHandIndex === handIndex && isActive) {
                handEl.classList.add('active-hand');
            }
            
            var cardsEl = document.createElement('div');
            cardsEl.className = 'hand-cards';
            hand.cards.forEach(function(card) {
                cardsEl.appendChild(createCardElement(card, false));
            });
            handEl.appendChild(cardsEl);
            
            var infoEl = document.createElement('div');
            infoEl.className = 'hand-info';
            
            var totalEl = document.createElement('div');
            totalEl.className = 'hand-total';
            if (hand.isBusted) {
                totalEl.textContent = 'BUST';
                totalEl.classList.add('bust');
            } else if (hand.isBlackjack) {
                totalEl.textContent = 'BJ!';
                totalEl.classList.add('blackjack');
            } else {
                var text = hand.total.toString();
                if (hand.isSoft && hand.total <= 21) text += ' (s)';
                totalEl.textContent = text;
            }
            infoEl.appendChild(totalEl);
            
            if (hand.result) {
                var resultEl = document.createElement('div');
                resultEl.className = 'hand-result ' + hand.result;
                resultEl.textContent = hand.result.toUpperCase();
                infoEl.appendChild(resultEl);
            }
            
            handEl.appendChild(infoEl);
            seatEl.appendChild(handEl);
        });
        
        container.appendChild(seatEl);
    });
}

function createCardElement(card, faceDown) {
    var cardEl = document.createElement('div');
    cardEl.className = 'card';
    
    if (faceDown) {
        cardEl.classList.add('face-down');
    } else {
        var color = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black';
        cardEl.classList.add(color);
        cardEl.innerHTML = '<span class="rank">' + card.rank + '</span>' +
                          '<span class="suit">' + getSuitSymbol(card.suit) + '</span>';
    }
    
    return cardEl;
}

function getSuitSymbol(suit) {
    switch (suit) {
        case 'spades': return '♠';
        case 'hearts': return '♥';
        case 'diamonds': return '♦';
        case 'clubs': return '♣';
        default: return '';
    }
}

function showToast(message) {
    var toast = document.getElementById('gameToast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function() {
        toast.classList.remove('show');
    }, 2000);
}

// =====================================================
// STORAGE
// =====================================================

function saveSettings() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            seats: GameState.table.seats.map(function(s) { return s.id; }),
            buyin: GameState.bankroll.initial
        }));
    } catch (e) { }
}

function loadSavedSettings() {
    try {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            var settings = JSON.parse(saved);
            if (settings.buyin) {
                var buyinInput = document.getElementById('buyin');
                if (buyinInput) buyinInput.value = settings.buyin;
                updateBuyinDisplay();
            }
        }
    } catch (e) { }
}

function hasSavedGameState() {
    try {
        var saved = localStorage.getItem(GAME_STATE_KEY);
        if (!saved) return false;
        var state = JSON.parse(saved);
        return state && state.phase && state.phase !== 'setup';
    } catch (e) {
        return false;
    }
}

function saveGameState() {
    if (GameState.phase === 'setup') return;
    try {
        localStorage.setItem(GAME_STATE_KEY, JSON.stringify(GameState));
    } catch (e) { }
}

function restoreSavedGameState() {
    try {
        var saved = localStorage.getItem(GAME_STATE_KEY);
        if (!saved) return false;
        Object.assign(GameState, JSON.parse(saved));
        return true;
    } catch (e) {
        return false;
    }
}

function clearSavedGameState() {
    try {
        localStorage.removeItem(GAME_STATE_KEY);
    } catch (e) { }
}

function newGame() {
    if (confirm('Start a new game?')) {
        clearSavedGameState();
        GameState.phase = 'setup';
        showSetupScreen();
    }
}
