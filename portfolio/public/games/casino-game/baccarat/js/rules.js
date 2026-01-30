// =====================================================
// BACCARAT RULES
// =====================================================

function determineThirdCardNeeded() {
    const pTotal = calculateHandTotal(currentHand.playerCards);
    const bTotal = calculateHandTotal(currentHand.bankerCards);

    if (pTotal >= 8 || bTotal >= 8) return 'none';

    if (currentHand.playerCards.length === 2) {
        if (pTotal <= 5) return 'player';
    }

    if (currentHand.playerCards.length === 2 && pTotal >= 6) {
        if (bTotal <= 5) return 'banker';
        return 'none';
    }

    if (currentHand.playerCards.length === 3) {
        const player3rdCard = getCardValue(currentHand.playerCards[2]);
        return shouldBankerDraw(bTotal, player3rdCard) ? 'banker' : 'none';
    }

    return 'none';
}

function shouldBankerDraw(bankerTotal, player3rdCard) {
    if (bankerTotal <= 2) return true;
    if (bankerTotal === 3 && player3rdCard !== 8) return true;
    if (bankerTotal === 4 && [2,3,4,5,6,7].includes(player3rdCard)) return true;
    if (bankerTotal === 5 && [4,5,6,7].includes(player3rdCard)) return true;
    if (bankerTotal === 6 && [6,7].includes(player3rdCard)) return true;
    return false;
}

function checkHandComplete() {
    const pLen = currentHand.playerCards.length;
    const bLen = currentHand.bankerCards.length;
    const pTotal = calculateHandTotal(currentHand.playerCards);
    const bTotal = calculateHandTotal(currentHand.bankerCards);

    if (pLen < 2 || bLen < 2) {
        currentHand.isComplete = false;
        return;
    }

    if (pTotal >= 8 || bTotal >= 8) {
        currentHand.isComplete = true;
        return;
    }

    if (pLen === 2 && pTotal >= 6) {
        if (bLen === 2 && bTotal >= 6) {
            currentHand.isComplete = true;
        } else if (bLen === 3) {
            currentHand.isComplete = true;
        } else if (bTotal <= 5 && bLen === 2) {
            currentHand.isComplete = false;
        }
        return;
    }

    if (pLen === 3) {
        const p3rd = getCardValue(currentHand.playerCards[2]);
        const bankerShouldDraw = shouldBankerDraw(bTotal, p3rd);
        
        if (!bankerShouldDraw) {
            currentHand.isComplete = true;
        } else if (bLen === 3) {
            currentHand.isComplete = true;
        }
        return;
    }
}
