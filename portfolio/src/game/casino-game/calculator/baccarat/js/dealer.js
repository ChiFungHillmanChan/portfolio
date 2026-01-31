// =====================================================
// DEALER ACTIONS
// =====================================================

function dealCard(cardIndex) {
    if (cardCounts[cardIndex] <= 0 || currentHand.isComplete) return;

    cardCounts[cardIndex]--;
    totalDealt++;

    mainRC += MAIN_BET_TAGS[cardIndex];
    dragon7RC += DRAGON7_TAGS[cardIndex];
    panda8RC += PANDA8_TAGS[cardIndex];

    const pos = currentHand.dealPosition;
    
    if (pos < 4) {
        if (pos % 2 === 0) {
            currentHand.playerCards.push(cardIndex);
        } else {
            currentHand.bankerCards.push(cardIndex);
        }
        currentHand.dealPosition++;
    } else {
        const needsThirdCard = determineThirdCardNeeded();
        if (needsThirdCard === 'player' && currentHand.playerCards.length === 2) {
            currentHand.playerCards.push(cardIndex);
        } else if (needsThirdCard === 'banker' && currentHand.bankerCards.length < 3) {
            currentHand.bankerCards.push(cardIndex);
        }
    }

    checkHandComplete();
    updateHandDisplay();
    updateAllDisplays();

    if (currentHand.isComplete) {
        setTimeout(() => {
            autoFinishHand();
        }, 300);
    }
}

function undoLastCard() {
    if (currentHand.playerCards.length === 0 && currentHand.bankerCards.length === 0) {
        return;
    }

    if (currentHand.bankerCards.length > 0 && 
        (currentHand.bankerCards.length > currentHand.playerCards.length || 
         (currentHand.bankerCards.length === currentHand.playerCards.length && 
          (currentHand.dealPosition > 3 || currentHand.dealPosition % 2 === 0)))) {
        const cardIndex = currentHand.bankerCards.pop();
        restoreCard(cardIndex);
    } else if (currentHand.playerCards.length > 0) {
        const cardIndex = currentHand.playerCards.pop();
        restoreCard(cardIndex);
    }
    
    if (currentHand.dealPosition > 0 && currentHand.dealPosition <= 4) {
        currentHand.dealPosition--;
    }
    
    currentHand.isComplete = false;
    checkHandComplete();
    updateHandDisplay();
    updateAllDisplays();
}

function autoFinishHand() {
    if (currentHand.playerCards.length < 2 || currentHand.bankerCards.length < 2) return;

    const pTotal = calculateHandTotal(currentHand.playerCards);
    const bTotal = calculateHandTotal(currentHand.bankerCards);
    
    let result;
    if (pTotal > bTotal) {
        result = 'player';
        playerWins++;
    } else if (bTotal > pTotal) {
        result = 'banker';
        bankerWins++;
    } else {
        result = 'tie';
        tieWins++;
        tieValueCounts[pTotal]++; // Track which tie value occurred
    }

    gameHistory.push({
        round: gameHistory.length + 1,
        result: result,
        playerCards: [...currentHand.playerCards],
        bankerCards: [...currentHand.bankerCards],
        playerTotal: pTotal,
        bankerTotal: bTotal
    });

    updateBigRoadData(result);

    resetCurrentHand();

    renderBeadRoad();
    renderBigRoad();
    renderEgaliteGrid();
    renderHistory();
    updateHandDisplay();
    updateAllDisplays();
}

function newShoe() {
    if (gameHistory.length > 0 && !confirm('Start a new shoe? This will reset all counts and history.')) return;
    
    resetGameState();

    renderCardGrid();
    renderBeadRoad();
    renderBigRoad();
    renderEgaliteGrid();
    renderHistory();
    updateHandDisplay();
    updateAllDisplays();
}
