// =====================================================
// EGALITÉ CALCULATIONS
// =====================================================
// 
// Egalite bets are side bets on specific tie values (0-9).
// Probabilities are from Wizard of Odds combinatorial analysis:
// https://wizardofodds.com/games/baccarat/side-bets/egalite
//
// EV Formula: EV = P(win) × Payout - P(lose) × Stake
//           = prob × payout - (1 - prob) × 1
//           = prob × (payout + 1) - 1
//
// House Edge = -EV (as a percentage)
//
// Fair Odds (break-even payout) = (1 / probability) - 1
// =====================================================

function getAdjustedEgaliteProb(tieValue) {
    // Returns the probability of a specific tie value
    // Currently returns base probability from Wizard of Odds data
    // Future: Could implement card-counting adjustments based on shoe composition
    
    const decksRemaining = (TOTAL_CARDS - totalDealt) / CARDS_PER_DECK;
    if (decksRemaining < 0.5) return EGALITE_BASE_PROB[tieValue]; // Too few cards for reliable counting
    
    // Return exact probability from combinatorial analysis
    return EGALITE_BASE_PROB[tieValue];
}

function calculateEgaliteEV(tieValue) {
    // Calculate Expected Value for an Egalite bet
    // 
    // Formula: EV = prob × (payout + 1) - 1
    //
    // Example for Tie 0 at 150:1:
    //   EV = 0.0057978534 × (150 + 1) - 1
    //   EV = 0.0057978534 × 151 - 1
    //   EV = 0.8754558634 - 1
    //   EV = -0.1245 (-12.45% house edge)
    //
    // A positive EV means player advantage (rare/impossible with standard payouts)
    // A negative EV means house advantage (typical)
    
    const prob = getAdjustedEgaliteProb(tieValue);
    const payout = egalitePayouts[tieValue];
    return prob * (payout + 1) - 1;
}

function calculateFairOdds(tieValue) {
    // Calculate the break-even payout (0% house edge)
    // Fair Odds = (1 / probability) - 1
    const prob = getAdjustedEgaliteProb(tieValue);
    return (1 / prob) - 1;
}

function calculateHouseEdge(tieValue) {
    // House edge is the negative of EV expressed as a percentage
    return -calculateEgaliteEV(tieValue) * 100;
}

function updateEgalitePayout(tieValue, payout) {
    const parsedPayout = parseInt(payout) || 1;
    egalitePayouts[tieValue] = Math.max(1, Math.min(9999, parsedPayout));
    renderEgaliteGrid();
    updateAllDisplays();
}
