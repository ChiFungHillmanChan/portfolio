// =====================================================
// CARD UTILITIES
// =====================================================

function getCardValue(cardIndex) {
    return CARD_VALUES[cardIndex];
}

function calculateHandTotal(cards) {
    if (cards.length === 0) return 0;
    return cards.reduce((sum, idx) => sum + getCardValue(idx), 0) % 10;
}

function getDecksRemaining() {
    return (TOTAL_CARDS - totalDealt) / CARDS_PER_DECK;
}

function getTrueCount(rc) {
    const d = getDecksRemaining();
    return d > 0 ? rc / d : 0;
}

function restoreCard(cardIndex) {
    cardCounts[cardIndex]++;
    totalDealt--;
    mainRC -= MAIN_BET_TAGS[cardIndex];
    dragon7RC -= DRAGON7_TAGS[cardIndex];
    panda8RC -= PANDA8_TAGS[cardIndex];
}
