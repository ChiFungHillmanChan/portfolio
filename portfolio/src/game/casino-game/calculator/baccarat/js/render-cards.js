// =====================================================
// CARD GRID RENDERING
// =====================================================

function renderCardGrid() {
    const grid = document.getElementById('cardGrid');
    grid.innerHTML = '';
    CARD_LABELS.forEach((label, index) => {
        const btn = document.createElement('button');
        btn.className = 'card-btn' + (cardCounts[index] === 0 ? ' depleted' : '');
        btn.innerHTML = `${label}<span class="count-badge">${cardCounts[index]}</span>`;
        btn.onclick = () => dealCard(index);
        grid.appendChild(btn);
    });
}

function updateHandDisplay() {
    const playerCardsDiv = document.getElementById('playerCards');
    const bankerCardsDiv = document.getElementById('bankerCards');
    
    playerCardsDiv.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const card = document.createElement('div');
        if (i < currentHand.playerCards.length) {
            card.className = 'hand-card' + (i === 2 ? ' third' : '');
            card.textContent = CARD_LABELS[currentHand.playerCards[i]];
        } else {
            card.className = 'hand-card empty';
            card.textContent = i < 2 ? (i + 1) : '3rd';
        }
        playerCardsDiv.appendChild(card);
    }

    bankerCardsDiv.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const card = document.createElement('div');
        if (i < currentHand.bankerCards.length) {
            card.className = 'hand-card' + (i === 2 ? ' third' : '');
            card.textContent = CARD_LABELS[currentHand.bankerCards[i]];
        } else {
            card.className = 'hand-card empty';
            card.textContent = i < 2 ? (i + 1) : '3rd';
        }
        bankerCardsDiv.appendChild(card);
    }

    document.getElementById('playerTotal').textContent = 
        currentHand.playerCards.length > 0 ? calculateHandTotal(currentHand.playerCards) : '-';
    document.getElementById('bankerTotal').textContent = 
        currentHand.bankerCards.length > 0 ? calculateHandTotal(currentHand.bankerCards) : '-';

    updateDealingIndicator();
}

function updateDealingIndicator() {
    const indicator = document.getElementById('dealingIndicator');
    const pos = currentHand.dealPosition;

    if (currentHand.isComplete) {
        const pTotal = calculateHandTotal(currentHand.playerCards);
        const bTotal = calculateHandTotal(currentHand.bankerCards);
        let result = pTotal > bTotal ? 'PLAYER WINS!' : bTotal > pTotal ? 'BANKER WINS!' : 'TIE!';
        indicator.textContent = `${result} (P:${pTotal} vs B:${bTotal})`;
        indicator.className = 'dealing-indicator finished';
    } else if (pos === 0) {
        indicator.textContent = 'Deal: Player Card 1';
        indicator.className = 'dealing-indicator player-turn';
    } else if (pos === 1) {
        indicator.textContent = 'Deal: Banker Card 1';
        indicator.className = 'dealing-indicator banker-turn';
    } else if (pos === 2) {
        indicator.textContent = 'Deal: Player Card 2';
        indicator.className = 'dealing-indicator player-turn';
    } else if (pos === 3) {
        indicator.textContent = 'Deal: Banker Card 2';
        indicator.className = 'dealing-indicator banker-turn';
    } else {
        const needed = determineThirdCardNeeded();
        if (needed === 'player') {
            indicator.textContent = 'Deal: Player 3rd Card';
            indicator.className = 'dealing-indicator player-turn';
        } else if (needed === 'banker') {
            indicator.textContent = 'Deal: Banker 3rd Card';
            indicator.className = 'dealing-indicator banker-turn';
        }
    }
}
