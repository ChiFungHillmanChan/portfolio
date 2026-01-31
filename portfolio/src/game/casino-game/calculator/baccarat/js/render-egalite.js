// =====================================================
// EGALITÉ RENDERING
// =====================================================

function toggleEgalite() {
    egaliteOpen = !egaliteOpen;
    document.getElementById('egaliteContent').className = egaliteOpen ? 'egalite-content open' : 'egalite-content';
    document.getElementById('egaliteToggle').textContent = egaliteOpen ? '▲ Close Settings' : '▼ Open Settings';
}

function renderEgaliteGrid() {
    const grid = document.getElementById('egaliteGrid');
    grid.innerHTML = '';

    for (let i = 0; i <= 9; i++) {
        const ev = calculateEgaliteEV(i);
        const isPositive = ev >= 0;
        const fairOdds = calculateFairOdds(i);
        const currentProb = getAdjustedEgaliteProb(i);
        const houseEdge = calculateHouseEdge(i);

        const bet = document.createElement('div');
        bet.className = 'egalite-bet' + (isPositive ? ' positive-ev' : '');
        bet.innerHTML = `
            <div class="egalite-bet-title">${i}-${i}</div>
            <div class="egalite-payout">
                <input type="number" id="egalitePayout${i}" value="${egalitePayouts[i]}" 
                       onchange="updateEgalitePayout(${i}, this.value)" min="1" max="9999">
                <span class="egalite-payout-label">:1</span>
            </div>
            <div class="egalite-ev ${isPositive ? 'positive' : 'negative'}">
                EV: ${isPositive ? '+' : ''}${(ev * 100).toFixed(2)}%
            </div>
            <div class="egalite-house-edge">
                Edge: ${houseEdge.toFixed(2)}%
            </div>
            <div class="egalite-prob">Prob: ${(currentProb * 100).toFixed(4)}%</div>
            <div class="egalite-fair">Fair: ${fairOdds.toFixed(1)}:1</div>
        `;
        grid.appendChild(bet);
    }
}
