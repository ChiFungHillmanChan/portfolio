// =====================================================
// ROAD RENDERING
// =====================================================

function renderBeadRoad() {
    const beadRoad = document.getElementById('beadRoad');
    beadRoad.innerHTML = '';

    // Fixed grid size - same as real baccarat tables
    const cols = 20;
    const rows = 6;
    const totalCells = cols * rows;

    for (let i = 0; i < totalCells; i++) {
        const cell = document.createElement('div');
        cell.className = 'bead-cell';
        
        if (i < gameHistory.length) {
            const game = gameHistory[i];
            cell.classList.add(game.result);
            cell.textContent = game.result === 'player' ? 'P' : game.result === 'banker' ? 'B' : 'T';
        } else {
            cell.classList.add('empty');
        }
        beadRoad.appendChild(cell);
    }

    document.getElementById('playerWins').textContent = playerWins;
    document.getElementById('bankerWins').textContent = bankerWins;
    document.getElementById('tieWins').textContent = tieWins;
}

function renderBigRoad() {
    const bigRoad = document.getElementById('bigRoad');
    bigRoad.innerHTML = '';

    // Fixed grid size - same as real baccarat tables
    const cols = 35;
    const rows = 6;
    const grid = Array(rows).fill(null).map(() => Array(cols).fill(null));

    bigRoadData.forEach(entry => {
        if (entry.col < cols && entry.row < rows) {
            grid[entry.row][entry.col] = entry;
        }
    });

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'big-road-cell';
            
            const entry = grid[r][c];
            if (entry) {
                cell.classList.add(entry.result);
                
                if (entry.ties > 0) {
                    const slash = document.createElement('div');
                    slash.className = 'tie-slash';
                    cell.appendChild(slash);
                    
                    if (entry.ties > 1) {
                        const count = document.createElement('div');
                        count.className = 'tie-count';
                        count.textContent = entry.ties;
                        cell.appendChild(count);
                    }
                }
            }
            bigRoad.appendChild(cell);
        }
    }
}

function renderHistory() {
    const historyList = document.getElementById('historyList');
    
    if (gameHistory.length === 0) {
        historyList.innerHTML = '<div style="color: var(--text-dim); font-style: italic; text-align: center; padding: 15px;">No hands recorded yet</div>';
        return;
    }

    historyList.innerHTML = '';
    [...gameHistory].reverse().slice(0, 15).forEach(game => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        const pCards = game.playerCards.map(i => CARD_LABELS[i]).join(',');
        const bCards = game.bankerCards.map(i => CARD_LABELS[i]).join(',');
        
        item.innerHTML = `
            <span class="history-round">#${game.round}</span>
            <span class="history-result ${game.result}">${game.result[0].toUpperCase()}</span>
            <span class="history-cards">P[${pCards}] B[${bCards}]</span>
            <span class="history-score">${game.playerTotal}-${game.bankerTotal}</span>
        `;
        historyList.appendChild(item);
    });
}
