// =====================================================
// RENDER TABLE - Betting table DOM updates
// =====================================================

/**
 * Render the complete betting table
 */
function renderBettingTable() {
    const container = document.getElementById('bettingTable');
    if (!container) return;
    
    const rouletteConfig = getRouletteConfig();
    const isAmerican = gameState.config.rouletteType === 'american';
    
    container.innerHTML = `
        <!-- Main table section -->
        <div class="table-main">
            <!-- Zero section -->
            <div class="zero-section">
                ${renderZeroSection(isAmerican)}
            </div>
            
            <!-- Numbers grid with inside bets overlay -->
            <div class="numbers-area">
                <div class="numbers-grid">
                    ${renderNumbersGrid()}
                </div>
                <!-- Inside bet areas (splits, corners, streets, lines) -->
                <div class="inside-bets-overlay">
                    ${renderInsideBetAreas(isAmerican)}
                </div>
            </div>
            
            <!-- Column bets -->
            <div class="column-section">
                ${renderColumnBets()}
            </div>
        </div>
        
        <!-- Dozen bets -->
        <div class="dozen-bets">
            ${renderDozenBets()}
        </div>
        
        <!-- Even money bets -->
        <div class="outside-bets">
            ${renderEvenMoneyBets()}
        </div>
    `;
    
    // Initialize betting table event handlers
    initBettingTableHandlers();
}

/**
 * Render zero section
 */
function renderZeroSection(isAmerican) {
    if (isAmerican) {
        return `
            <div class="zero-cell american" data-bet-type="straight" data-bet-value="0">0</div>
            <div class="zero-cell american" data-bet-type="straight" data-bet-value="00">00</div>
        `;
    }
    return `
        <div class="zero-cell" data-bet-type="straight" data-bet-value="0">0</div>
    `;
}

/**
 * Render numbers grid (1-36)
 */
function renderNumbersGrid() {
    let html = '';
    
    // Grid goes: row 3 (3,6,9...), row 2 (2,5,8...), row 1 (1,4,7...)
    // But displayed as: row 1 on top (3,6,9...), row 2 middle (2,5,8...), row 3 bottom (1,4,7...)
    const rows = [
        TABLE_LAYOUT.row1, // 3, 6, 9, 12...
        TABLE_LAYOUT.row2, // 2, 5, 8, 11...
        TABLE_LAYOUT.row3  // 1, 4, 7, 10...
    ];
    
    rows.forEach((row, rowIndex) => {
        row.forEach(num => {
            const color = getNumberColor(num);
            html += `
                <div class="number-cell ${color}" 
                     data-number="${num}"
                     data-bet-type="straight" 
                     data-bet-value="${num}">
                    ${num}
                </div>
            `;
        });
    });
    
    return html;
}

/**
 * Render column bets
 */
function renderColumnBets() {
    return `
        <div class="column-bet" data-bet-type="column" data-bet-value="3">2:1</div>
        <div class="column-bet" data-bet-type="column" data-bet-value="2">2:1</div>
        <div class="column-bet" data-bet-type="column" data-bet-value="1">2:1</div>
    `;
}

/**
 * Render dozen bets
 */
function renderDozenBets() {
    return `
        <div class="dozen-bet" data-bet-type="dozen" data-bet-value="1">1st 12</div>
        <div class="dozen-bet" data-bet-type="dozen" data-bet-value="2">2nd 12</div>
        <div class="dozen-bet" data-bet-type="dozen" data-bet-value="3">3rd 12</div>
    `;
}

/**
 * Render even money bets
 */
function renderEvenMoneyBets() {
    return `
        <div class="even-money-bet" data-bet-type="low" data-bet-value="low">1-18</div>
        <div class="even-money-bet" data-bet-type="even" data-bet-value="even">EVEN</div>
        <div class="even-money-bet red-bet" data-bet-type="red" data-bet-value="red">RED</div>
        <div class="even-money-bet black-bet" data-bet-type="black" data-bet-value="black">BLACK</div>
        <div class="even-money-bet" data-bet-type="odd" data-bet-value="odd">ODD</div>
        <div class="even-money-bet" data-bet-type="high" data-bet-value="high">19-36</div>
    `;
}

/**
 * Render inside bet areas (splits, corners, streets, lines)
 * These are positioned on top of the numbers grid
 */
function renderInsideBetAreas(isAmerican) {
    let html = '';
    
    // Streets (bottom edge of each column - covers 3 numbers vertically) - 12 streets
    // Each street covers one column: 1-2-3, 4-5-6, 7-8-9, etc.
    for (let i = 0; i < 12; i++) {
        const street = STREETS[i];
        const streetKey = street.join('-');
        // Position at center of column, at the bottom edge
        const colCenterPercent = ((i + 0.5) / 12) * 100;
        html += `<div class="street-bet" data-bet-type="street" data-bet-value="${streetKey}"
                     style="left: calc(${colCenterPercent}% - 10px); bottom: -10px;"
                     title="Street: ${street.join(', ')} (11:1)"></div>`;
    }

    // Lines (six-line bets) - between streets - 11 lines
    // Each line covers two adjacent streets (6 numbers)
    for (let i = 0; i < 11; i++) {
        const line = LINES[i];
        const lineKey = line.join('-');
        // Position between columns i and i+1, at the bottom edge
        const leftPercent = ((i + 1) / 12) * 100;
        html += `<div class="line-bet" data-bet-type="line" data-bet-value="${lineKey}"
                     style="left: calc(${leftPercent}% - 10px); bottom: -10px;"
                     title="Line: ${line.join(', ')} (5:1)"></div>`;
    }
    
    // Vertical splits (between rows in same column)
    // These are positioned at the border between two vertically adjacent numbers
    for (let col = 0; col < 12; col++) {
        // Split between row 0 (top) and row 1 (middle): numbers row1[col] and row2[col]
        const num1 = TABLE_LAYOUT.row1[col]; // e.g., 3
        const num2 = TABLE_LAYOUT.row2[col]; // e.g., 2
        const splitKey1 = [Math.min(num1, num2), Math.max(num1, num2)].join('-');
        // Center of column, at the border between rows (33.33%)
        const colCenterPercent = ((col + 0.5) / 12) * 100;
        html += `<div class="split-bet vertical" data-bet-type="split" data-bet-value="${splitKey1}"
                     style="left: ${colCenterPercent}%; top: 33.33%;"
                     title="Split: ${num2}, ${num1}"></div>`;

        // Split between row 1 (middle) and row 2 (bottom): numbers row2[col] and row3[col]
        const num3 = TABLE_LAYOUT.row3[col]; // e.g., 1
        const splitKey2 = [Math.min(num2, num3), Math.max(num2, num3)].join('-');
        html += `<div class="split-bet vertical" data-bet-type="split" data-bet-value="${splitKey2}"
                     style="left: ${colCenterPercent}%; top: 66.66%;"
                     title="Split: ${num3}, ${num2}"></div>`;
    }

    // Horizontal splits (between adjacent columns in same row)
    // These are positioned at the border between two horizontally adjacent numbers
    for (let col = 0; col < 11; col++) {
        for (let row = 0; row < 3; row++) {
            const rowData = row === 0 ? TABLE_LAYOUT.row1 : (row === 1 ? TABLE_LAYOUT.row2 : TABLE_LAYOUT.row3);
            const num1 = rowData[col];
            const num2 = rowData[col + 1];
            const splitKey = [Math.min(num1, num2), Math.max(num1, num2)].join('-');
            // At column border, center of row
            const leftPercent = ((col + 1) / 12) * 100;
            const topPercent = ((row + 0.5) / 3) * 100;
            html += `<div class="split-bet horizontal" data-bet-type="split" data-bet-value="${splitKey}"
                         style="left: ${leftPercent}%; top: ${topPercent}%;"
                         title="Split: ${num1}, ${num2}"></div>`;
        }
    }
    
    // Corners (intersection of 4 numbers)
    // Each corner is at the intersection between 4 adjacent numbers in a 2x2 square
    // Grid layout:
    //   Row 0 (top):    3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
    //   Row 1 (middle): 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35
    //   Row 2 (bottom): 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
    for (let col = 0; col < 11; col++) {
        for (let row = 0; row < 2; row++) {
            const topRow = row === 0 ? TABLE_LAYOUT.row1 : TABLE_LAYOUT.row2;
            const bottomRow = row === 0 ? TABLE_LAYOUT.row2 : TABLE_LAYOUT.row3;
            // Get the 4 numbers that form this corner
            const topLeft = topRow[col];
            const topRight = topRow[col + 1];
            const bottomLeft = bottomRow[col];
            const bottomRight = bottomRow[col + 1];
            const nums = [topLeft, topRight, bottomLeft, bottomRight].sort((a, b) => a - b);
            const cornerKey = nums.join('-');
            
            // Position at the intersection point between the 4 cells
            // The corner is between columns (col) and (col+1), and between row (row) and (row+1)
            // Horizontal: right edge of column col = (col+1) * columnWidth
            // Vertical: bottom edge of row = (row+1) * rowHeight
            const leftPercent = ((col + 1) / 12) * 100;
            const topPercent = ((row + 1) / 3) * 100;
            
            html += `<div class="corner-bet" data-bet-type="corner" data-bet-value="${cornerKey}"
                         style="left: calc(${leftPercent}% - 10px); top: calc(${topPercent}% - 10px);"
                         title="Corner: ${nums.join(', ')}"></div>`;
        }
    }
    
    // Zero splits (between 0 and 1, 2, 3)
    if (!isAmerican) {
        // European: 0-1, 0-2, 0-3
        html += `<div class="split-bet zero-split" data-bet-type="split" data-bet-value="0-3"
                     style="left: 0; top: 16.66%;" title="Split: 0, 3"></div>`;
        html += `<div class="split-bet zero-split" data-bet-type="split" data-bet-value="0-2"
                     style="left: 0; top: 50%;" title="Split: 0, 2"></div>`;
        html += `<div class="split-bet zero-split" data-bet-type="split" data-bet-value="0-1"
                     style="left: 0; top: 83.33%;" title="Split: 0, 1"></div>`;
        
        // Trio bets (0-1-2 and 0-2-3) - pays 11:1, same as street
        // Positioned at row borders (corners between 0 and adjacent numbers)
        // 0-2-3 trio: at the border between row 1 (3) and row 2 (2)
        html += `<div class="trio-bet" data-bet-type="trio" data-bet-value="0-2-3"
                     style="left: -8px; top: 33.33%;" title="Trio: 0, 2, 3 (11:1)"></div>`;
        // 0-1-2 trio: at the border between row 2 (2) and row 3 (1) - slightly above 66.66% to avoid overlap with 0-1 split
        html += `<div class="trio-bet" data-bet-type="trio" data-bet-value="0-1-2"
                     style="left: -8px; top: 60%;" title="Trio: 0, 1, 2 (11:1)"></div>`;
        
        // First Four (0,1,2,3)
        html += `<div class="first-four-bet" data-bet-type="firstFour" data-bet-value="firstFour"
                     style="left: -15px; top: calc(100% - 8px);" title="First Four: 0, 1, 2, 3"></div>`;
    } else {
        // American: 0-00 split, plus zero splits
        html += `<div class="split-bet zero-split" data-bet-type="split" data-bet-value="0-00"
                     style="left: -45px; top: 50%;" title="Split: 0, 00"></div>`;
        // Top Line (0, 00, 1, 2, 3)
        html += `<div class="top-line-bet" data-bet-type="topLine" data-bet-value="topLine"
                     style="left: -15px; top: calc(100% - 8px);" title="Top Line: 0, 00, 1, 2, 3"></div>`;
    }
    
    return html;
}

// Click debounce state for preventing rapid double-clicks
let lastBetClickTime = 0;
const BET_CLICK_DEBOUNCE = 80; // 80ms debounce

/**
 * Initialize betting table click handlers
 * Uses touch-action: manipulation CSS for fast touch response
 */
function initBettingTableHandlers() {
    const table = document.getElementById('bettingTable');
    if (!table) return;

    // Prevent duplicate handlers - check if already initialized
    if (table.dataset.handlersInitialized === 'true') return;
    table.dataset.handlersInitialized = 'true';

    // Handle clicks on bet areas (touch-action: manipulation in CSS eliminates 300ms delay)
    table.addEventListener('click', (e) => {
        // Debounce rapid clicks
        const now = Date.now();
        if (now - lastBetClickTime < BET_CLICK_DEBOUNCE) return;
        lastBetClickTime = now;
        
        const betElement = e.target.closest('[data-bet-type]');
        if (betElement) {
            const betType = betElement.dataset.betType;
            const betValue = betElement.dataset.betValue;
            handleBetPlacement(betType, betValue, e);
        }
    });

    // Completely prevent native context menu and handle right-clicks for bet removal
    // Using capture phase to ensure we intercept before browser default
    table.addEventListener('contextmenu', (e) => {
        // Always prevent default to stop native context menu
        e.preventDefault();
        e.stopPropagation();
        
        // Debounce rapid clicks
        const now = Date.now();
        if (now - lastBetClickTime < BET_CLICK_DEBOUNCE) return false;
        lastBetClickTime = now;
        
        const betElement = e.target.closest('[data-bet-type]');
        if (betElement) {
            const betType = betElement.dataset.betType;
            const betValue = betElement.dataset.betValue;
            handleBetRemoval(betType, betValue, e);
        }
        
        return false;
    }, { capture: true });

    // Setup chip preview on hover/touch
    setupChipPreviewOnTable();
}

/**
 * Render placed chips on the table
 */
function renderPlacedChips() {
    // Remove existing placed chips
    document.querySelectorAll('.chip-stack-container').forEach(el => el.remove());
    
    const bets = getAllBets();
    const table = document.getElementById('bettingTable');
    if (!table) return;
    
    // Render straight bets
    for (const [value, amount] of Object.entries(bets.straight)) {
        if (amount > 0) {
            const cell = table.querySelector(`[data-bet-type="straight"][data-bet-value="${value}"]`);
            if (cell) {
                renderChipOnElement(cell, amount);
            }
        }
    }
    
    // Render split bets
    for (const [value, amount] of Object.entries(bets.split)) {
        if (amount > 0) {
            const cell = table.querySelector(`[data-bet-type="split"][data-bet-value="${value}"]`);
            if (cell) {
                renderChipOnElement(cell, amount);
            }
        }
    }
    
    // Render street bets
    for (const [value, amount] of Object.entries(bets.street)) {
        if (amount > 0) {
            const cell = table.querySelector(`[data-bet-type="street"][data-bet-value="${value}"]`);
            if (cell) {
                renderChipOnElement(cell, amount);
            }
        }
    }
    
    // Render trio bets (0-1-2, 0-2-3) - placed on the trio bet areas near zero
    if (bets.trio) {
        for (const [value, amount] of Object.entries(bets.trio)) {
            if (amount > 0) {
                const cell = table.querySelector(`[data-bet-type="trio"][data-bet-value="${value}"]`);
                if (cell) {
                    renderChipOnElement(cell, amount);
                }
            }
        }
    }
    
    // Render corner bets
    for (const [value, amount] of Object.entries(bets.corner)) {
        if (amount > 0) {
            const cell = table.querySelector(`[data-bet-type="corner"][data-bet-value="${value}"]`);
            if (cell) {
                renderChipOnElement(cell, amount);
            }
        }
    }
    
    // Render line bets (six-line)
    for (const [value, amount] of Object.entries(bets.line)) {
        if (amount > 0) {
            const cell = table.querySelector(`[data-bet-type="line"][data-bet-value="${value}"]`);
            if (cell) {
                renderChipOnElement(cell, amount);
            }
        }
    }
    
    // Render First Four (European) or Top Line (American)
    if (bets.firstFour > 0) {
        const cell = table.querySelector(`[data-bet-type="firstFour"]`);
        if (cell) {
            renderChipOnElement(cell, bets.firstFour);
        }
    }
    if (bets.topLine > 0) {
        const cell = table.querySelector(`[data-bet-type="topLine"]`);
        if (cell) {
            renderChipOnElement(cell, bets.topLine);
        }
    }
    
    // Render column bets
    for (const [value, amount] of Object.entries(bets.column)) {
        if (amount > 0) {
            const cell = table.querySelector(`[data-bet-type="column"][data-bet-value="${value}"]`);
            if (cell) {
                renderChipOnElement(cell, amount);
            }
        }
    }
    
    // Render dozen bets
    for (const [value, amount] of Object.entries(bets.dozen)) {
        if (amount > 0) {
            const cell = table.querySelector(`[data-bet-type="dozen"][data-bet-value="${value}"]`);
            if (cell) {
                renderChipOnElement(cell, amount);
            }
        }
    }
    
    // Render even money bets
    const evenMoneyBets = ['red', 'black', 'even', 'odd', 'low', 'high'];
    evenMoneyBets.forEach(betType => {
        if (bets[betType] > 0) {
            const cell = table.querySelector(`[data-bet-type="${betType}"]`);
            if (cell) {
                renderChipOnElement(cell, bets[betType]);
            }
        }
    });
}

/**
 * Render chip stack on a table element
 * Chips are placed inside the cell element directly
 */
function renderChipOnElement(element, amount) {
    // Create chip stack - positioned inside the element
    const stack = document.createElement('div');
    stack.className = 'chip-stack-container';

    // Determine chip breakdown
    const chips = getChipBreakdown(amount);

    // Create visual chips (max 3 shown for cleaner look)
    const displayChips = chips.slice(0, 3);
    displayChips.forEach((chip, index) => {
        const chipEl = document.createElement('div');
        chipEl.className = `chip chip-${chip} chip-sm`;
        chipEl.style.position = 'absolute';
        chipEl.style.top = (-index * 3) + 'px';
        chipEl.style.left = '50%';
        chipEl.style.transform = 'translateX(-50%)';
        stack.appendChild(chipEl);
    });

    // Add bet amount label directly on top of the stack
    const amountLabel = document.createElement('div');
    amountLabel.className = 'chip-amount-label';
    amountLabel.textContent = amount >= 1000 ? Math.floor(amount / 1000) + 'K' : amount;
    amountLabel.style.position = 'absolute';
    amountLabel.style.top = (-displayChips.length * 3 - 2) + 'px';
    amountLabel.style.left = '50%';
    amountLabel.style.transform = 'translateX(-50%)';
    amountLabel.style.zIndex = '10';
    stack.appendChild(amountLabel);

    // Add chip stack directly to the cell
    element.appendChild(stack);
}

/**
 * Get chip breakdown for an amount
 */
function getChipBreakdown(amount) {
    const chips = [];
    let remaining = amount;
    
    // Work through denominations from highest to lowest
    const denoms = [...CHIP_DENOMINATIONS].reverse();
    
    for (const denom of denoms) {
        while (remaining >= denom) {
            chips.push(denom);
            remaining -= denom;
        }
    }
    
    return chips;
}

/**
 * Highlight winning number on table
 */
function highlightWinningNumber(number) {
    // Remove existing highlights
    document.querySelectorAll('.winning').forEach(el => el.classList.remove('winning'));
    
    // Find and highlight the winning cell
    const cell = document.querySelector(`[data-bet-value="${number}"]`);
    if (cell) {
        cell.classList.add('winning');
    }
    
    // Place the winning marker (dolly) on the number
    placeWinningMarker(number);
}

/**
 * Clear winning number highlight
 */
function clearWinningHighlight() {
    document.querySelectorAll('.winning').forEach(el => el.classList.remove('winning'));
    removeWinningMarker();
}

/**
 * Place the winning marker (dolly) on the winning number
 * Like in real casinos where a marker is placed on the winning number
 * @param {number|string} number - The winning number
 */
function placeWinningMarker(number) {
    const marker = document.getElementById('winningMarker');
    const container = document.getElementById('bettingTableContainer');
    const table = document.getElementById('bettingTable');
    
    if (!marker || !container || !table) return;
    
    // Find the winning cell - straight bet cell for the number
    let cell = table.querySelector(`.number-cell[data-bet-value="${number}"]`);
    
    // If not found in number cells, check zero cells
    if (!cell) {
        cell = table.querySelector(`.zero-cell[data-bet-value="${number}"]`);
    }
    
    if (!cell) return;
    
    // Get positions
    const containerRect = container.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    
    // Get dolly size for centering
    const dollySize = window.innerWidth <= 767 ? 22 : 28;
    
    // Calculate position - center of the cell
    const x = cellRect.left + cellRect.width / 2 - containerRect.left - dollySize / 2;
    const y = cellRect.top + cellRect.height / 2 - containerRect.top - dollySize / 2;
    
    // Position the marker
    marker.style.left = x + 'px';
    marker.style.top = y + 'px';
    
    // Remove any existing animation classes
    marker.classList.remove('removing');
    
    // Trigger reflow to ensure animation plays
    marker.offsetHeight;
    
    // Show marker with animation
    marker.classList.add('visible');
}

/**
 * Remove the winning marker with animation
 */
function removeWinningMarker() {
    const marker = document.getElementById('winningMarker');
    if (!marker) return;
    
    // Only animate removal if currently visible
    if (marker.classList.contains('visible')) {
        marker.classList.add('removing');
        marker.classList.remove('visible');
        
        // After animation completes, fully hide
        setTimeout(() => {
            marker.classList.remove('removing');
        }, 300);
    }
}

/**
 * Check if winning marker is currently displayed
 * @returns {boolean} True if marker is visible
 */
function isWinningMarkerVisible() {
    const marker = document.getElementById('winningMarker');
    return marker && marker.classList.contains('visible');
}
