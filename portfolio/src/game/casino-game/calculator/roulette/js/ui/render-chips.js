// =====================================================
// RENDER CHIPS - Chip placement DOM updates
// =====================================================

// This file is primarily handled by render-table.js for placed chips
// This file contains additional chip-related rendering utilities

/**
 * Create a chip element
 * @param {number} value - Chip denomination
 * @param {string} size - Size class ('', 'sm', 'xs')
 * @param {boolean} selected - Whether chip is selected
 * @returns {HTMLElement} Chip element
 */
function createChipElement(value, size = '', selected = false) {
    const chip = document.createElement('button');
    chip.className = `chip chip-${value}`;
    
    if (size) {
        chip.classList.add(`chip-${size}`);
    }
    
    if (selected) {
        chip.classList.add('selected');
    }
    
    // Format display value
    let displayValue = value;
    if (value >= 1000) {
        displayValue = (value / 1000) + 'K';
    }
    
    chip.textContent = displayValue;
    chip.dataset.value = value;
    
    return chip;
}

/**
 * Render the chip selector in the chip rack
 */
function renderChipRack() {
    const rack = document.getElementById('chipRack');
    if (!rack) return;
    
    const available = getAvailableChips();
    const selected = getSelectedChip();
    
    rack.innerHTML = '';
    
    CHIP_DENOMINATIONS.forEach(value => {
        const isAvailable = available.includes(value);
        const isSelected = value === selected;
        
        const chip = createChipElement(value, '', isSelected);
        
        if (!isAvailable) {
            chip.disabled = true;
            chip.classList.add('disabled');
        }
        
        chip.addEventListener('click', () => {
            if (isAvailable) {
                handleChipSelect(value);
            }
        });
        
        rack.appendChild(chip);
    });
}

/**
 * Update chip selector to reflect current selection and availability
 */
function updateChipSelector() {
    const rack = document.getElementById('chipRack');
    if (!rack) return;
    
    const available = getAvailableChips();
    const selected = getSelectedChip();
    
    rack.querySelectorAll('.chip').forEach(chip => {
        const value = parseInt(chip.dataset.value);
        const isAvailable = available.includes(value);
        const isSelected = value === selected;
        
        chip.classList.toggle('selected', isSelected);
        chip.classList.toggle('disabled', !isAvailable);
        chip.disabled = !isAvailable;
    });
}

/**
 * Create a placed chip visual for the table
 * @param {number} amount - Total bet amount
 * @returns {HTMLElement} Chip stack element
 */
function createPlacedChipStack(amount) {
    const stack = document.createElement('div');
    stack.className = 'chip-stack-container';
    
    // Get chip breakdown
    const chips = getChipBreakdown(amount);
    
    // Only show top 5 chips visually
    const displayChips = chips.slice(0, 5);
    
    displayChips.forEach((chipValue, index) => {
        const chip = createChipElement(chipValue, 'sm');
        chip.style.position = 'absolute';
        chip.style.top = (-index * 3) + 'px';
        chip.style.left = '0';
        chip.style.cursor = 'default';
        stack.appendChild(chip);
    });
    
    // Add value tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'chip-value-tooltip';
    tooltip.textContent = '$' + amount.toLocaleString();
    stack.appendChild(tooltip);
    
    return stack;
}

/**
 * Position a chip stack on a table cell
 * @param {HTMLElement} stack - Chip stack element
 * @param {HTMLElement} cell - Table cell to position on
 * @param {HTMLElement} table - Parent table element
 */
function positionChipStack(stack, cell, table) {
    const cellRect = cell.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();
    
    const x = cellRect.left - tableRect.left + cellRect.width / 2;
    const y = cellRect.top - tableRect.top + cellRect.height / 2;
    
    stack.style.left = x + 'px';
    stack.style.top = y + 'px';
}

/**
 * Animate chip being placed
 * @param {HTMLElement} chip - Chip element
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position
 * @param {number} endX - Ending X position
 * @param {number} endY - Ending Y position
 */
function animateChipPlacement(chip, startX, startY, endX, endY) {
    // Set initial position
    chip.style.transform = `translate(${startX}px, ${startY}px)`;
    chip.style.transition = 'none';
    
    // Force reflow
    chip.offsetHeight;
    
    // Animate to final position
    chip.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    chip.style.transform = `translate(${endX}px, ${endY}px)`;
}

/**
 * Flash a chip to indicate it was added
 * @param {HTMLElement} stack - Chip stack element
 */
function flashChipStack(stack) {
    stack.classList.add('chip-flash');
    
    setTimeout(() => {
        stack.classList.remove('chip-flash');
    }, 300);
}

/**
 * Get the primary color for a chip denomination
 * @param {number} value - Chip denomination
 * @returns {string} CSS color value
 */
function getChipColor(value) {
    const colors = {
        1: '#ffffff',
        5: '#e63946',
        10: '#3498db',
        25: '#2ecc71',
        100: '#1a1a1a',
        500: '#9b59b6',
        1000: '#f39c12',
        5000: '#e74c3c',
        25000: '#1abc9c',
        100000: '#f1c40f'
    };
    
    return colors[value] || '#ffffff';
}

/**
 * Clear all placed chips from the table
 */
function clearAllPlacedChips() {
    document.querySelectorAll('.chip-stack-container').forEach(el => el.remove());
}
