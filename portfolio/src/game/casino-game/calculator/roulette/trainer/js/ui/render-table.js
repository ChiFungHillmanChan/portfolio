// =====================================================
// RENDER TABLE - Roulette table with chip display
// =====================================================

import { RED_NUMBERS, BLACK_NUMBERS, isOutsideBet } from '../core/payout-calculator.js';

// Table layout constants
const TABLE_ROWS = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],  // Top row
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],  // Middle row
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]   // Bottom row
];

/**
 * Get number color
 * @param {number} num - Number
 * @returns {string} Color class
 */
function getNumberColor(num) {
    if (num === 0) return 'green';
    if (RED_NUMBERS.has(num)) return 'red';
    return 'black';
}

/**
 * Get chip color class based on amount
 * @param {number} amount - Chip amount
 * @returns {string} CSS class
 */
function getChipColorClass(amount) {
    if (amount >= 500) return 'chip-500';
    if (amount >= 100) return 'chip-100';
    if (amount >= 25) return 'chip-25';
    if (amount >= 10) return 'chip-10';
    if (amount >= 5) return 'chip-5';
    return 'chip-1';
}

/**
 * Render the roulette table with bets
 * @param {object} question - Question object with bets and winning number
 */
function renderTable(question) {
    const container = document.getElementById('table-container');
    if (!container) return;

    const { winningNumber, bets } = question;

    // Create bet lookup for easy chip placement
    const betsByPosition = groupBetsByPosition(bets);

    // Build table HTML
    let html = `
        <div class="roulette-table">
            <div class="table-inner">
                <!-- Zero -->
                <div class="zero-section">
                    <div class="table-cell green ${winningNumber === 0 ? 'winner' : ''}" data-number="0">
                        0
                        ${renderChipsForPosition(betsByPosition, 'straight-0', winningNumber)}
                    </div>
                </div>

                <!-- Main grid -->
                <div class="number-grid">
    `;

    // Render number grid
    for (let row = 0; row < 3; row++) {
        html += '<div class="table-row">';
        for (let col = 0; col < 12; col++) {
            const num = TABLE_ROWS[row][col];
            const color = getNumberColor(num);
            const isWinner = num === winningNumber;

            html += `
                <div class="table-cell ${color} ${isWinner ? 'winner' : ''}" data-number="${num}">
                    ${num}
                    ${renderChipsForPosition(betsByPosition, `straight-${num}`, winningNumber)}
                </div>
            `;
        }
        html += '</div>';
    }

    html += `
                </div>

                <!-- Column bets -->
                <div class="column-bets">
                    <div class="outside-area" data-bet="column-1">
                        2:1
                        ${renderChipsForPosition(betsByPosition, 'column-1', winningNumber)}
                    </div>
                    <div class="outside-area" data-bet="column-2">
                        2:1
                        ${renderChipsForPosition(betsByPosition, 'column-2', winningNumber)}
                    </div>
                    <div class="outside-area" data-bet="column-3">
                        2:1
                        ${renderChipsForPosition(betsByPosition, 'column-3', winningNumber)}
                    </div>
                </div>

                <!-- Dozen bets -->
                <div class="dozen-bets">
                    <div class="outside-area" data-bet="dozen-1">
                        1st 12
                        ${renderChipsForPosition(betsByPosition, 'dozen-1', winningNumber)}
                    </div>
                    <div class="outside-area" data-bet="dozen-2">
                        2nd 12
                        ${renderChipsForPosition(betsByPosition, 'dozen-2', winningNumber)}
                    </div>
                    <div class="outside-area" data-bet="dozen-3">
                        3rd 12
                        ${renderChipsForPosition(betsByPosition, 'dozen-3', winningNumber)}
                    </div>
                </div>

                <!-- Even money bets -->
                <div class="even-money-bets">
                    <div class="outside-area" data-bet="low">
                        1-18
                        ${renderChipsForPosition(betsByPosition, 'low', winningNumber)}
                    </div>
                    <div class="outside-area" data-bet="even">
                        EVEN
                        ${renderChipsForPosition(betsByPosition, 'even', winningNumber)}
                    </div>
                    <div class="outside-area red-area" data-bet="red">
                        RED
                        ${renderChipsForPosition(betsByPosition, 'red', winningNumber)}
                    </div>
                    <div class="outside-area black-area" data-bet="black">
                        BLACK
                        ${renderChipsForPosition(betsByPosition, 'black', winningNumber)}
                    </div>
                    <div class="outside-area" data-bet="odd">
                        ODD
                        ${renderChipsForPosition(betsByPosition, 'odd', winningNumber)}
                    </div>
                    <div class="outside-area" data-bet="high">
                        19-36
                        ${renderChipsForPosition(betsByPosition, 'high', winningNumber)}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add bet list below table
    html += renderBetList(bets, winningNumber);

    container.innerHTML = html;

    // Update winning number display
    updateWinningNumberDisplay(winningNumber);
}

/**
 * Group bets by their position on the table
 * @param {array} bets - Array of bets
 * @returns {object} Bets grouped by position
 */
function groupBetsByPosition(bets) {
    const grouped = {};

    for (const bet of bets) {
        let position;

        switch (bet.type) {
            case 'straight':
                position = `straight-${bet.numbers[0]}`;
                break;
            case 'split':
                position = `split-${bet.numbers.sort((a, b) => a - b).join('-')}`;
                break;
            case 'street':
                position = `street-${bet.numbers[0]}`;
                break;
            case 'corner':
                position = `corner-${bet.numbers.sort((a, b) => a - b).join('-')}`;
                break;
            case 'line':
                position = `line-${bet.numbers[0]}`;
                break;
            case 'column':
                position = `column-${bet.position}`;
                break;
            case 'dozen':
                position = `dozen-${bet.position}`;
                break;
            default:
                position = bet.type;
        }

        if (!grouped[position]) {
            grouped[position] = [];
        }
        grouped[position].push(bet);
    }

    return grouped;
}

/**
 * Render chips for a specific position
 * @param {object} betsByPosition - Grouped bets
 * @param {string} position - Position key
 * @param {number} winningNumber - Winning number
 * @returns {string} Chip HTML
 */
function renderChipsForPosition(betsByPosition, position, winningNumber) {
    const bets = betsByPosition[position];
    if (!bets || bets.length === 0) return '';

    // Sum up chips at this position
    const totalAmount = bets.reduce((sum, bet) => sum + (bet.amount ?? bet.chips ?? 0), 0);
    const isWinning = bets.some(bet => !bet.isLoser && bet.numbers?.includes(winningNumber));
    const colorClass = getChipColorClass(totalAmount);
    const losingClass = bets.every(bet => bet.isLoser) ? 'losing' : '';

    return `
        <div class="chip-stack">
            <div class="chip ${colorClass} ${losingClass}" title="${totalAmount}">
                ${formatChipAmount(totalAmount)}
            </div>
        </div>
    `;
}

/**
 * Format chip amount for display
 * @param {number} amount - Amount
 * @returns {string} Formatted string
 */
function formatChipAmount(amount) {
    if (amount >= 1000) return Math.floor(amount / 1000) + 'K';
    return amount.toString();
}

/**
 * Render bet list
 * @param {array} bets - Array of bets
 * @param {number} winningNumber - Winning number
 * @returns {string} HTML for bet list
 */
function renderBetList(bets, winningNumber) {
    const outsideBets = bets.filter(b => isOutsideBet(b.type));
    const insideBets = bets.filter(b => !isOutsideBet(b.type));

    let html = '<div class="bet-list">';

    if (outsideBets.length > 0) {
        html += '<h3>Outside Bets</h3>';
        html += '<div class="bet-items">';
        for (const bet of outsideBets) {
            html += renderBetItem(bet, winningNumber);
        }
        html += '</div>';
    }

    if (insideBets.length > 0) {
        html += '<h3>Inside Bets</h3>';
        html += '<div class="bet-items">';
        for (const bet of insideBets) {
            html += renderBetItem(bet, winningNumber);
        }
        html += '</div>';
    }

    html += '</div>';
    return html;
}

/**
 * Render a single bet item
 * @param {object} bet - Bet object
 * @param {number} winningNumber - Winning number
 * @returns {string} HTML
 */
function renderBetItem(bet, winningNumber) {
    const amount = bet.amount ?? bet.chips ?? 0;
    const isWinning = checkBetWins(bet, winningNumber);
    const statusClass = isWinning ? 'winning' : (bet.isLoser ? 'losing' : '');
    const outsideClass = isOutsideBet(bet.type) ? 'outside' : '';

    let description = getBetDescription(bet);

    // Add call bet badge if applicable
    if (bet.callBetType) {
        description += `<span class="call-bet-badge">${bet.callBetType}</span>`;
    }

    return `
        <div class="bet-item ${statusClass} ${outsideClass}">
            <span class="bet-type">${description}</span>
            <span class="bet-amount">${amount}</span>
        </div>
    `;
}

/**
 * Check if a bet wins
 * @param {object} bet - Bet object
 * @param {number} winningNumber - Winning number
 * @returns {boolean}
 */
function checkBetWins(bet, winningNumber) {
    if (bet.isLoser) return false;
    if (bet.numbers && bet.numbers.includes(winningNumber)) return true;

    // Check outside bets
    switch (bet.type) {
        case 'column':
            const col = (winningNumber - 1) % 3 + 1;
            return winningNumber > 0 && col === bet.position;
        case 'dozen':
            if (winningNumber === 0) return false;
            const doz = Math.ceil(winningNumber / 12);
            return doz === bet.position;
        case 'red':
            return RED_NUMBERS.has(winningNumber);
        case 'black':
            return BLACK_NUMBERS.has(winningNumber);
        case 'even':
            return winningNumber > 0 && winningNumber % 2 === 0;
        case 'odd':
            return winningNumber > 0 && winningNumber % 2 === 1;
        case 'low':
            return winningNumber >= 1 && winningNumber <= 18;
        case 'high':
            return winningNumber >= 19 && winningNumber <= 36;
        default:
            return false;
    }
}

/**
 * Get human-readable bet description
 * @param {object} bet - Bet object
 * @returns {string} Description
 */
function getBetDescription(bet) {
    switch (bet.type) {
        case 'straight':
            return `Straight ${bet.numbers[0]}`;
        case 'split':
            return `Split ${bet.numbers.join('-')}`;
        case 'street':
            return `Street ${bet.numbers[0]}-${bet.numbers[2]}`;
        case 'trio':
            return `Trio ${bet.numbers.join('-')}`;
        case 'corner':
            return `Corner ${bet.numbers[0]}-${bet.numbers[3]}`;
        case 'line':
            return `Six Line ${bet.numbers[0]}-${bet.numbers[5]}`;
        case 'column':
            return `${getOrdinal(bet.position)} Column`;
        case 'dozen':
            return `${getOrdinal(bet.position)} Dozen`;
        case 'red':
            return 'Red';
        case 'black':
            return 'Black';
        case 'even':
            return 'Even';
        case 'odd':
            return 'Odd';
        case 'low':
            return 'Low (1-18)';
        case 'high':
            return 'High (19-36)';
        default:
            return bet.type;
    }
}

/**
 * Get ordinal suffix
 */
function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Update winning number display
 * @param {number} winningNumber - Winning number
 */
function updateWinningNumberDisplay(winningNumber) {
    const display = document.getElementById('winning-number');
    if (display) {
        display.textContent = winningNumber;
        display.className = 'winning-number ' + getNumberColor(winningNumber);
    }
}

export { renderTable, getNumberColor };
