// =====================================================
// STATS & BETS DISPLAY
// =====================================================

function updateAllDisplays() {
    renderCardGrid();
    
    document.getElementById('cardsDealt').textContent = totalDealt;
    document.getElementById('cardsRemaining').textContent = TOTAL_CARDS - totalDealt;
    document.getElementById('decksRemaining').textContent = getDecksRemaining().toFixed(1);

    const mainTC = getTrueCount(mainRC);
    const d7TC = getTrueCount(dragon7RC);
    const p8TC = getTrueCount(panda8RC);

    document.getElementById('mainTC').textContent = (mainTC >= 0 ? '+' : '') + mainTC.toFixed(1);
    document.getElementById('dragon7TC').textContent = (d7TC >= 0 ? '+' : '') + d7TC.toFixed(1);
    document.getElementById('panda8TC').textContent = (p8TC >= 0 ? '+' : '') + p8TC.toFixed(1);

    document.getElementById('dragon7TC').style.color = d7TC >= 4 ? 'var(--accent-green)' : 'var(--accent-gold)';
    document.getElementById('panda8TC').style.color = p8TC >= 11 ? 'var(--accent-green)' : 'var(--accent-gold)';

    updateBetsDisplay();
    updateRecommendations();
}

function updateBetsDisplay() {
    const evs = calculateEVs();
    const recommended = mainRC <= -4 ? 'player' : 'banker';

    // Main bets
    const mainContainer = document.getElementById('mainBetsContainer');
    mainContainer.innerHTML = '';
    
    ['banker', 'player', 'tie'].forEach(bet => {
        const d = evs[bet];
        const isBest = bet === recommended && bet !== 'tie';
        const change = (d.ev - d.baseEV) * 100;
        
        const card = document.createElement('div');
        card.className = 'bet-card' + (isBest ? ' best-main' : '');
        
        let tag = '';
        if (isBest) tag = '<span class="bet-tag best">BEST</span>';
        
        const changeClass = change > 0.001 ? 'positive' : change < -0.001 ? 'negative' : '';
        const changeText = change > 0 ? `+${change.toFixed(3)}%` : `${change.toFixed(3)}%`;
        const currentClass = d.ev > d.baseEV + 0.0001 ? 'better' : d.ev < d.baseEV - 0.0001 ? 'worse' : 'same';
        
        card.innerHTML = `
            <div class="bet-header">
                <span class="bet-name">${d.name}</span>
                ${tag}
            </div>
            <div class="ev-comparison">
                <span class="ev-original">${(d.baseEV * 100).toFixed(2)}%</span>
                <span class="ev-arrow">→</span>
                <span class="ev-current ${currentClass}">${(d.ev * 100).toFixed(3)}%</span>
                ${changeClass ? `<span class="ev-change ${changeClass}">${changeText}</span>` : ''}
            </div>
        `;
        mainContainer.appendChild(card);
    });

    // Side bets
    const sideContainer = document.getElementById('sideBetsContainer');
    sideContainer.innerHTML = '';
    
    ['dragon7', 'panda8'].forEach(bet => {
        const d = evs[bet];
        const hasEdge = d.ev >= 0;
        const change = (d.ev - d.baseEV) * 100;
        
        const card = document.createElement('div');
        card.className = 'bet-card' + (hasEdge ? ' positive-ev' : '');
        
        const changeClass = change > 0.1 ? 'positive' : '';
        const changeText = change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
        
        card.innerHTML = `
            <div class="bet-header">
                <span class="bet-name">${d.name}</span>
                ${hasEdge ? '<span class="bet-tag positive">+EV!</span>' : `<span style="font-size:0.5rem;color:var(--text-dim)">TC≥${d.trigger}</span>`}
            </div>
            <div class="ev-comparison">
                <span class="ev-original">${(d.baseEV * 100).toFixed(1)}%</span>
                <span class="ev-arrow">→</span>
                <span class="ev-current ${hasEdge ? 'better' : 'same'}">${(d.ev * 100).toFixed(1)}%</span>
                ${changeClass ? `<span class="ev-change ${changeClass}">${changeText}</span>` : ''}
            </div>
        `;
        sideContainer.appendChild(card);
    });
}

function updateRecommendations() {
    const evs = calculateEVs();
    
    // Collect all positive EV bets
    const positiveEVBets = [];
    
    // Check main bets and side bets
    ['banker', 'player', 'tie', 'dragon7', 'panda8'].forEach(bet => {
        if (evs[bet].ev >= 0) {
            positiveEVBets.push({ name: evs[bet].name, ev: evs[bet].ev });
        }
    });
    
    // Check egalité bets
    for (let i = 0; i <= 9; i++) {
        const egEV = evs.egalite[i];
        if (egEV >= 0) {
            positiveEVBets.push({ name: `Tie ${i}-${i}`, ev: egEV });
        }
    }
    
    // Sort by EV descending
    positiveEVBets.sort((a, b) => b.ev - a.ev);

    const container = document.getElementById('alertContainer');
    const positiveList = document.getElementById('positiveEvList');
    
    if (positiveEVBets.length > 0) {
        const best = positiveEVBets[0];
        container.innerHTML = `
            <div class="alert-box positive">
                <div class="alert-title">🎯 +EV OPPORTUNITY!</div>
                <div class="alert-bet" style="color:var(--accent-green)">${best.name.toUpperCase()}</div>
                <div class="alert-ev positive">+${(best.ev*100).toFixed(2)}%</div>
            </div>
        `;

        // Show all positive EV bets
        if (positiveEVBets.length > 1) {
            let listHTML = '<div class="positive-ev-list"><div class="positive-ev-list-title">All +EV Bets</div>';
            positiveEVBets.forEach(bet => {
                listHTML += `<div class="positive-ev-item">
                    <span class="positive-ev-item-name">${bet.name}</span>
                    <span class="positive-ev-item-ev">+${(bet.ev*100).toFixed(2)}%</span>
                </div>`;
            });
            listHTML += '</div>';
            positiveList.innerHTML = listHTML;
        } else {
            positiveList.innerHTML = '';
        }
    } else {
        const rec = mainRC <= -4 ? evs.player : evs.banker;
        const change = (rec.ev - rec.baseEV) * 100;
        const changeText = change >= 0 ? `+${change.toFixed(3)}%` : `${change.toFixed(3)}%`;
        
        container.innerHTML = `
            <div class="alert-box neutral">
                <div class="alert-title">BEST MAIN BET</div>
                <div class="alert-bet" style="color:var(--accent-gold)">${rec.name.toUpperCase()}</div>
                <div class="alert-ev negative">${(rec.ev*100).toFixed(3)}%</div>
                <div style="font-size:0.7rem;color:var(--text-secondary);margin-top:4px">
                    Δ: <span style="color:${change > 0 ? 'var(--accent-green)' : 'var(--text-dim)'}">${changeText}</span>
                </div>
            </div>
        `;
        positiveList.innerHTML = '';
    }
}
