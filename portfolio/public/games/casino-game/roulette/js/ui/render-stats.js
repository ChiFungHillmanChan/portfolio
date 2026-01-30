// =====================================================
// RENDER STATS - Statistics panel DOM updates
// =====================================================

/**
 * Render all statistics displays
 */
function renderAllStats() {
    renderHistoryDisplay();
    renderHotNumbers();
    renderColdNumbers();
    renderDistribution();
    renderStreaks();
    renderSessionStats();
}

/**
 * Render recent spin history
 */
function renderHistoryDisplay() {
    const container = document.getElementById('historyNumbers');
    if (!container) return;
    
    const history = getRecentHistory(20);
    
    if (history.length === 0) {
        container.innerHTML = '<div class="text-dim text-center">No spins yet</div>';
        return;
    }
    
    container.innerHTML = history.map(spin => {
        const colorClass = spin.color;
        return `<span class="history-number ${colorClass}">${spin.number}</span>`;
    }).join('');
}

/**
 * Render hot numbers list
 */
function renderHotNumbers() {
    const container = document.getElementById('hotNumbersList');
    if (!container) return;
    
    const hot = getHotNumbers(5);
    
    if (hot.length === 0) {
        container.innerHTML = '<div class="text-dim text-center">No data yet</div>';
        return;
    }
    
    container.innerHTML = hot.map((item, index) => {
        const color = getNumberColor(item.number);
        return `
            <div class="hot-number-item">
                <span class="hot-rank">#${index + 1}</span>
                <span class="number-badge ${color}">${item.number}</span>
                <span class="hit-count">${item.hits} hit${item.hits !== 1 ? 's' : ''}</span>
            </div>
        `;
    }).join('');
}

/**
 * Render cold numbers list
 */
function renderColdNumbers() {
    const container = document.getElementById('coldNumbersList');
    if (!container) return;
    
    const cold = getColdNumbers(5);
    const totalSpins = statsState.session.totalSpins;
    
    if (cold.length === 0 || totalSpins === 0) {
        container.innerHTML = '<div class="text-dim text-center">No data yet</div>';
        return;
    }
    
    container.innerHTML = cold.map((item, index) => {
        const color = getNumberColor(item.number);
        const spinsText = item.spinsSince === totalSpins ? 'Never hit' : `${item.spinsSince} spin${item.spinsSince !== 1 ? 's' : ''} ago`;
        return `
            <div class="cold-number-item">
                <span class="cold-rank">#${index + 1}</span>
                <span class="number-badge ${color}">${item.number}</span>
                <span class="spins-since">${spinsText}</span>
            </div>
        `;
    }).join('');
}

/**
 * Render distribution bars
 */
function renderDistribution() {
    const dist = statsState.distribution;
    const total = statsState.session.totalSpins;
    
    // Default to 50/50 if no spins
    if (total === 0) {
        setDistributionBar('red', 'black', 50, 50, '0 - 0');
        setDistributionBar('even', 'odd', 50, 50, '0 - 0');
        setDistributionBar('low', 'high', 50, 50, '0 - 0');
        setDozenDistribution(0, 0, 0);
        return;
    }
    
    // Red/Black
    const redPct = (dist.red / (dist.red + dist.black)) * 100 || 50;
    const blackPct = (dist.black / (dist.red + dist.black)) * 100 || 50;
    setDistributionBar('red', 'black', redPct, blackPct, `${dist.red} - ${dist.black}`);
    
    // Even/Odd
    const evenPct = (dist.even / (dist.even + dist.odd)) * 100 || 50;
    const oddPct = (dist.odd / (dist.even + dist.odd)) * 100 || 50;
    setDistributionBar('even', 'odd', evenPct, oddPct, `${dist.even} - ${dist.odd}`);
    
    // Low/High
    const lowPct = (dist.low / (dist.low + dist.high)) * 100 || 50;
    const highPct = (dist.high / (dist.low + dist.high)) * 100 || 50;
    setDistributionBar('low', 'high', lowPct, highPct, `${dist.low} - ${dist.high}`);
    
    // Dozens
    setDozenDistribution(dist.dozen1, dist.dozen2, dist.dozen3);
}

/**
 * Set distribution bar widths
 */
function setDistributionBar(type1, type2, pct1, pct2, ratioText) {
    const fill1 = document.getElementById(type1 + 'Fill');
    const fill2 = document.getElementById(type2 + 'Fill');
    const ratio = document.getElementById(type1 + type2.charAt(0).toUpperCase() + type2.slice(1) + 'Ratio');
    
    if (fill1) fill1.style.width = pct1 + '%';
    if (fill2) fill2.style.width = pct2 + '%';
    if (ratio) ratio.textContent = ratioText;
}

/**
 * Set dozen distribution
 */
function setDozenDistribution(d1, d2, d3) {
    const total = d1 + d2 + d3;
    
    const fill1 = document.getElementById('dozen1Fill');
    const fill2 = document.getElementById('dozen2Fill');
    const fill3 = document.getElementById('dozen3Fill');
    const count1 = document.getElementById('dozen1Count');
    const count2 = document.getElementById('dozen2Count');
    const count3 = document.getElementById('dozen3Count');
    
    if (total > 0) {
        if (fill1) fill1.style.width = (d1 / total) * 100 + '%';
        if (fill2) fill2.style.width = (d2 / total) * 100 + '%';
        if (fill3) fill3.style.width = (d3 / total) * 100 + '%';
    } else {
        if (fill1) fill1.style.width = '33.33%';
        if (fill2) fill2.style.width = '33.33%';
        if (fill3) fill3.style.width = '33.33%';
    }
    
    if (count1) count1.textContent = d1;
    if (count2) count2.textContent = d2;
    if (count3) count3.textContent = d3;
}

/**
 * Render streaks
 */
function renderStreaks() {
    const streaks = getCurrentStreaks();
    
    const colorEl = document.getElementById('colorStreak');
    const parityEl = document.getElementById('parityStreak');
    const rangeEl = document.getElementById('rangeStreak');
    
    if (colorEl) {
        if (streaks.color.type) {
            const typeDisplay = streaks.color.type.charAt(0).toUpperCase() + streaks.color.type.slice(1);
            colorEl.innerHTML = `<span class="text-${streaks.color.type === 'red' ? 'red' : ''}">${streaks.color.current} ${typeDisplay}</span> <span class="text-dim">(best: ${streaks.color.longest})</span>`;
        } else {
            colorEl.textContent = '-';
        }
    }
    
    if (parityEl) {
        if (streaks.parity.type) {
            const typeDisplay = streaks.parity.type.charAt(0).toUpperCase() + streaks.parity.type.slice(1);
            parityEl.innerHTML = `${streaks.parity.current} ${typeDisplay} <span class="text-dim">(best: ${streaks.parity.longest})</span>`;
        } else {
            parityEl.textContent = '-';
        }
    }
    
    if (rangeEl) {
        if (streaks.range.type) {
            const typeDisplay = streaks.range.type === 'low' ? '1-18' : '19-36';
            rangeEl.innerHTML = `${streaks.range.current} ${typeDisplay} <span class="text-dim">(best: ${streaks.range.longest})</span>`;
        } else {
            rangeEl.textContent = '-';
        }
    }
}

/**
 * Render session statistics
 */
function renderSessionStats() {
    const stats = getSessionStats();
    
    // Update individual stat elements
    const totalSpinsEl = document.getElementById('totalSpins');
    const totalWageredEl = document.getElementById('totalWagered');
    const totalWonEl = document.getElementById('totalWon');
    const netProfitEl = document.getElementById('netProfit');
    
    if (totalSpinsEl) {
        totalSpinsEl.textContent = stats.totalSpins.toLocaleString();
    }
    
    if (totalWageredEl) {
        totalWageredEl.textContent = '$' + stats.totalWagered.toLocaleString();
    }
    
    if (totalWonEl) {
        totalWonEl.textContent = '$' + stats.totalWon.toLocaleString();
    }
    
    if (netProfitEl) {
        if (stats.netProfit >= 0) {
            netProfitEl.textContent = '+$' + stats.netProfit.toLocaleString();
            netProfitEl.className = 'info-value font-mono positive';
        } else {
            netProfitEl.textContent = '-$' + Math.abs(stats.netProfit).toLocaleString();
            netProfitEl.className = 'info-value font-mono negative';
        }
    }
}

/**
 * Format percentage display
 */
function formatPercent(value, decimals = 1) {
    return value.toFixed(decimals) + '%';
}

/**
 * Animate stat update
 */
function animateStatUpdate(element) {
    if (!element) return;
    
    element.classList.add('count-animate');
    setTimeout(() => {
        element.classList.remove('count-animate');
    }, 300);
}
