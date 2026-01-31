// =====================================================
// EV CALCULATIONS
// =====================================================

function calculateEVs() {
    const mainTC = getTrueCount(mainRC);
    const dragon7TC = getTrueCount(dragon7RC);
    const panda8TC = getTrueCount(panda8RC);

    const EOR_BANKER = [188, 440, 522, 649, 1157, -827, -1132, -827, -502, -231, -231, -231, -231];
    const EOR_PLAYER = [-178, -448, -543, -672, -1195, 841, 1128, 817, 533, 249, 249, 249, 249];

    let bankerAdj = 0, playerAdj = 0;
    for (let i = 0; i < 13; i++) {
        const removed = CARDS_PER_RANK - cardCounts[i];
        bankerAdj += removed * EOR_BANKER[i] / 10000000;
        playerAdj += removed * EOR_PLAYER[i] / 10000000;
    }

    const bankerEV = BASE_EV.banker + bankerAdj;
    const playerEV = BASE_EV.player + playerAdj;
    const tieEV = BASE_EV.tie;

    let dragon7EV = dragon7TC >= 4 ? 0.0803 + (dragon7TC - 4) * 0.02 : BASE_EV.dragon7 + dragon7TC * 0.039;

    let panda8EV;
    if (panda8TC >= 11) {
        panda8EV = 0.0634 + (panda8TC - 11) * 0.01;
    } else {
        const lookup = {1:-0.087,2:-0.078,3:-0.068,4:-0.059,5:-0.049,6:-0.039,7:-0.030,8:-0.021,9:-0.011,10:-0.001};
        panda8EV = lookup[Math.floor(panda8TC)] || BASE_EV.panda8;
    }

    // Egalité EVs
    const egaliteEVs = {};
    for (let i = 0; i <= 9; i++) {
        egaliteEVs[i] = calculateEgaliteEV(i);
    }

    return {
        banker: { ev: bankerEV, baseEV: BASE_EV.banker, name: 'Banker', payout: '0.95:1', tc: mainTC },
        player: { ev: playerEV, baseEV: BASE_EV.player, name: 'Player', payout: '1:1', tc: mainTC },
        tie: { ev: tieEV, baseEV: BASE_EV.tie, name: 'Tie', payout: '8:1', tc: 0 },
        dragon7: { ev: dragon7EV, baseEV: BASE_EV.dragon7, name: 'Dragon 7', payout: '40:1', tc: dragon7TC, trigger: 4 },
        panda8: { ev: panda8EV, baseEV: BASE_EV.panda8, name: 'Panda 8', payout: '25:1', tc: panda8TC, trigger: 11 },
        egalite: egaliteEVs
    };
}
