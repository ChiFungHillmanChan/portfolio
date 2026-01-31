// =====================================================
// RENDER RACETRACK - Classic French Casino Style
// Elegant SVG-based oval racetrack with luxury aesthetics
// =====================================================

// Current neighbour range selection (2-7)
let currentNeighbourRange = NEIGHBOUR_BET_CONFIG.defaultNeighbours;

// Track hovered number for highlighting
let hoveredRacetrackNumber = null;

// ====== SVG Dimensions ======
const SVG_WIDTH = 960;
const SVG_HEIGHT = 160;
const PADDING = 4;

// Oval dimensions
const OVAL_HEIGHT = SVG_HEIGHT - PADDING * 2;
const OVAL_WIDTH = SVG_WIDTH - PADDING * 2;
const CURVE_RADIUS = OVAL_HEIGHT / 2;

// Cell dimensions - numbers on edge, no overlap
const CELL_HEIGHT = 36;
const CELL_GAP = 2;
const CELL_RADIUS = 4;
const FONT_SIZE = 13;

// Center positions for curves
const LEFT_CENTER_X = PADDING + CURVE_RADIUS;
const RIGHT_CENTER_X = SVG_WIDTH - PADDING - CURVE_RADIUS;
const CENTER_Y = SVG_HEIGHT / 2;

// ====== Number Layout Configuration - European Wheel Sequence ======
// European wheel sequence (clockwise): 0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
// 
// ROTATED 3 positions clockwise to center ORPHELINS dividers:
// New start: 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12
//
// Visual layout (continuous clockwise):
// - Right curve: renders top→bottom (index 0=top, 3=bottom)
// - Bottom row: renders left→right, wheel flows right→left, so REVERSED
// - Left curve: renders bottom→top (index 0=bottom, 3=top)
// - Top row: renders left→right (matches wheel flow)

// Right curve (top to bottom): 35→3→26→0
const RIGHT_CURVE_NUMBERS = [35, 3, 26, 0];

// Bottom row: wheel sequence 32→15→19→4→21→2→25→17→34→6→27→13→36
// Displayed left-to-right, reverse for visual flow
const BOTTOM_ROW_NUMBERS = [36, 13, 27, 6, 34, 17, 25, 2, 21, 4, 19, 15, 32];

// Left curve (bottom to top): 11→30→8→23
// 11 at bottom (connects to 36), 23 at top (connects to 10)
const LEFT_CURVE_NUMBERS = [11, 30, 8, 23];

// Top row (left to right): 10→5→24→16→33→1→20→14→31→9→22→18→29→7→28→12
// 10 on left (connects to 23), 12 on right (connects to 35)
const TOP_ROW_NUMBERS = [10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12];

// Section definitions (French call bets)
const VOISINS_NUMBERS = [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25];
const TIERS_NUMBERS = [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33];
const ORPHELINS_NUMBERS = [17, 34, 6, 1, 20, 14, 31, 9];

// Classic French Casino Color Palette
const COLORS = {
    red: '#c01818',
    black: '#1a1a1a',
    green: '#1a8f3a',
    gold: '#d4b07a',
    goldBright: '#e0c38c',
    centerBg: '#0b2a1a',
    trackBg: '#000000',
    outerStroke: '#d4b07a',
    textWhite: '#ffffff'
};

/**
 * Convert degrees to radians
 */
function degToRad(deg) {
    return deg * Math.PI / 180;
}

/**
 * Get point on circle
 */
function getCirclePoint(cx, cy, radius, angleDeg) {
    const rad = degToRad(angleDeg);
    return {
        x: cx + radius * Math.cos(rad),
        y: cy + radius * Math.sin(rad)
    };
}

/**
 * Create wedge path for curved sections
 */
function createWedgePath(cx, cy, innerRadius, outerRadius, startAngle, endAngle) {
    const innerStart = getCirclePoint(cx, cy, innerRadius, startAngle);
    const innerEnd = getCirclePoint(cx, cy, innerRadius, endAngle);
    const outerStart = getCirclePoint(cx, cy, outerRadius, startAngle);
    const outerEnd = getCirclePoint(cx, cy, outerRadius, endAngle);
    
    const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    
    return `M ${innerStart.x} ${innerStart.y} 
            A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}
            L ${outerEnd.x} ${outerEnd.y}
            A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${outerStart.x} ${outerStart.y}
            Z`;
}

/**
 * Get text position for wedge
 */
function getWedgeTextPosition(cx, cy, radius, startAngle, endAngle) {
    const midAngle = (startAngle + endAngle) / 2;
    return getCirclePoint(cx, cy, radius, midAngle);
}

/**
 * Render the racetrack betting interface using SVG
 * Classic French Casino style with luxury gold accents
 */
function renderRacetrack() {
    const container = document.getElementById('racetrackContainer');
    if (!container) return;
    
    // Key measurements for perfect alignment - like real casino racetrack
    const outerBorderWidth = 3;
    const edgeMargin = outerBorderWidth + 1; // Numbers sit just inside the gold border
    
    // Calculate row positions - numbers at the very edge of the oval
    const topRowY = PADDING + edgeMargin;
    const bottomRowY = SVG_HEIGHT - PADDING - CELL_HEIGHT - edgeMargin;
    
    // Center section overlaps slightly with number rows to eliminate visual gaps
    // This creates a seamless appearance like real casino racetracks
    const overlapAmount = 1; // 1px overlap to eliminate anti-aliasing gaps
    const centerTopY = topRowY + CELL_HEIGHT - overlapAmount;
    const centerBottomY = bottomRowY + overlapAmount;
    
    // Curve wedge radii - outer at oval edge, inner touches center
    const outerRadius = CURVE_RADIUS - edgeMargin;
    const innerRadius = outerRadius - CELL_HEIGHT;
    const wedgeAngle = 180 / LEFT_CURVE_NUMBERS.length;
    
    // Row start/end X - connected to curve wedges
    const rowStartX = LEFT_CENTER_X;
    const rowEndX = RIGHT_CENTER_X;
    const rowWidth = rowEndX - rowStartX;
    
    // Calculate divider positions for French sections
    const topCellWidth = (rowWidth - (TOP_ROW_NUMBERS.length - 1) * CELL_GAP) / TOP_ROW_NUMBERS.length;
    const bottomCellWidth = (rowWidth - (BOTTOM_ROW_NUMBERS.length - 1) * CELL_GAP) / BOTTOM_ROW_NUMBERS.length;
    
    // Section boundaries based on rotated wheel sequence:
    // Top row (L→R): [10,5,24,16,33]=TIERS | [1,20,14,31,9]=ORPHELINS | [22,18,29,7,28,12]=VOISINS
    // Bottom row (L→R): [36,13,27]=TIERS | [6,34,17]=ORPHELINS | [25,2,21,4,19,15,32]=VOISINS
    
    // Divider 1: TIERS | ORPHELINS boundary
    // Top: after 33 (index 4), so after 5 cells
    // Bottom: after 27 (index 2), so after 3 cells
    const divider1TopX = rowStartX + 5 * (topCellWidth + CELL_GAP) - CELL_GAP / 2;
    const divider1BottomX = rowStartX + 3 * (bottomCellWidth + CELL_GAP) - CELL_GAP / 2;
    
    // Divider 2: ORPHELINS | VOISINS DU ZERO boundary
    // Top: after 9 (index 9), so after 10 cells
    // Bottom: after 17 (index 5), so after 6 cells
    const divider2TopX = rowStartX + 10 * (topCellWidth + CELL_GAP) - CELL_GAP / 2;
    const divider2BottomX = rowStartX + 6 * (bottomCellWidth + CELL_GAP) - CELL_GAP / 2;
    
    container.innerHTML = `
        <div class="racetrack-wrapper">
            <!-- Neighbour Range Selector -->
            <div class="neighbour-selector">
                <span class="neighbour-label">Neighbours:</span>
                <div class="neighbour-buttons">
                    ${renderNeighbourButtons()}
                </div>
            </div>
            
            <!-- SVG Racetrack - Classic French Casino Style -->
            <svg class="racetrack-svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <!-- Number cell gradients with subtle depth -->
                    <linearGradient id="frenchRedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#d42020"/>
                        <stop offset="50%" style="stop-color:#c01818"/>
                        <stop offset="100%" style="stop-color:#a01010"/>
                    </linearGradient>
                    <linearGradient id="frenchBlackGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#2a2a2a"/>
                        <stop offset="50%" style="stop-color:#1a1a1a"/>
                        <stop offset="100%" style="stop-color:#0a0a0a"/>
                    </linearGradient>
                    <linearGradient id="frenchGreenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#22a044"/>
                        <stop offset="50%" style="stop-color:#1a8f3a"/>
                        <stop offset="100%" style="stop-color:#107028"/>
                    </linearGradient>
                    
                    <!-- Gold glow filter for hover effects -->
                    <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feFlood flood-color="${COLORS.goldBright}" flood-opacity="0.6"/>
                        <feComposite in2="blur" operator="in"/>
                        <feMerge>
                            <feMergeNode/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    
                    <!-- Subtle inner shadow for depth -->
                    <filter id="innerShadow" x="-10%" y="-10%" width="120%" height="120%">
                        <feOffset dx="0" dy="1"/>
                        <feGaussianBlur stdDeviation="1" result="shadow"/>
                        <feComposite in="SourceGraphic" in2="shadow" operator="over"/>
                    </filter>
                </defs>
                
                <!-- Outer track background with gold border -->
                <rect x="${PADDING}" y="${PADDING}" 
                      width="${OVAL_WIDTH}" height="${OVAL_HEIGHT}" 
                      rx="${CURVE_RADIUS}" ry="${CURVE_RADIUS}"
                      fill="${COLORS.trackBg}" 
                      stroke="${COLORS.outerStroke}" 
                      stroke-width="3"/>
                
                <!-- Center section background (stadium shape) -->
                ${renderCenterSection(rowStartX, rowEndX, centerTopY, centerBottomY, divider1TopX, divider1BottomX, divider2TopX, divider2BottomX, innerRadius)}
                
                <!-- Left curve wedges -->
                ${LEFT_CURVE_NUMBERS.map((num, i) => {
                    const startAngle = 90 + i * wedgeAngle;
                    const endAngle = 90 + (i + 1) * wedgeAngle;
                    const path = createWedgePath(LEFT_CENTER_X, CENTER_Y, innerRadius, outerRadius, startAngle, endAngle);
                    const textPos = getWedgeTextPosition(LEFT_CENTER_X, CENTER_Y, (innerRadius + outerRadius) / 2, startAngle, endAngle);
                    const gradientId = getNumberGradientId(num);
                    return `
                        <g class="track-cell" data-racetrack-number="${num}">
                            <path d="${path}" fill="url(#${gradientId})" stroke="${COLORS.gold}" stroke-width="1"/>
                            <text x="${textPos.x}" y="${textPos.y}" 
                                  text-anchor="middle" dominant-baseline="middle"
                                  fill="${COLORS.textWhite}" 
                                  font-family="Georgia, 'Times New Roman', serif" 
                                  font-size="${FONT_SIZE}" 
                                  font-weight="bold">${num}</text>
                        </g>
                    `;
                }).join('')}
                
                <!-- Right curve wedges -->
                ${RIGHT_CURVE_NUMBERS.map((num, i) => {
                    const startAngle = -90 + i * wedgeAngle;
                    const endAngle = -90 + (i + 1) * wedgeAngle;
                    const path = createWedgePath(RIGHT_CENTER_X, CENTER_Y, innerRadius, outerRadius, startAngle, endAngle);
                    const textPos = getWedgeTextPosition(RIGHT_CENTER_X, CENTER_Y, (innerRadius + outerRadius) / 2, startAngle, endAngle);
                    const gradientId = getNumberGradientId(num);
                    return `
                        <g class="track-cell" data-racetrack-number="${num}">
                            <path d="${path}" fill="url(#${gradientId})" stroke="${COLORS.gold}" stroke-width="1"/>
                            <text x="${textPos.x}" y="${textPos.y}" 
                                  text-anchor="middle" dominant-baseline="middle"
                                  fill="${COLORS.textWhite}" 
                                  font-family="Georgia, 'Times New Roman', serif" 
                                  font-size="${FONT_SIZE}" 
                                  font-weight="bold">${num}</text>
                        </g>
                    `;
                }).join('')}
                
                <!-- Top row cells -->
                ${TOP_ROW_NUMBERS.map((num, i) => {
                    const x = rowStartX + i * (topCellWidth + CELL_GAP);
                    const gradientId = getNumberGradientId(num);
                    return `
                        <g class="track-cell" data-racetrack-number="${num}">
                            <rect x="${x}" y="${topRowY}" 
                                  width="${topCellWidth}" height="${CELL_HEIGHT}" 
                                  rx="${CELL_RADIUS}" 
                                  fill="url(#${gradientId})" 
                                  stroke="${COLORS.gold}" 
                                  stroke-width="0.5"/>
                            <text x="${x + topCellWidth / 2}" y="${topRowY + CELL_HEIGHT / 2}" 
                                  text-anchor="middle" dominant-baseline="middle"
                                  fill="${COLORS.textWhite}" 
                                  font-family="Georgia, 'Times New Roman', serif" 
                                  font-size="${FONT_SIZE}" 
                                  font-weight="bold">${num}</text>
                        </g>
                    `;
                }).join('')}
                
                <!-- Bottom row cells -->
                ${BOTTOM_ROW_NUMBERS.map((num, i) => {
                    const x = rowStartX + i * (bottomCellWidth + CELL_GAP);
                    const gradientId = getNumberGradientId(num);
                    return `
                        <g class="track-cell" data-racetrack-number="${num}">
                            <rect x="${x}" y="${bottomRowY}" 
                                  width="${bottomCellWidth}" height="${CELL_HEIGHT}" 
                                  rx="${CELL_RADIUS}" 
                                  fill="url(#${gradientId})" 
                                  stroke="${COLORS.gold}" 
                                  stroke-width="0.5"/>
                            <text x="${x + bottomCellWidth / 2}" y="${bottomRowY + CELL_HEIGHT / 2}" 
                                  text-anchor="middle" dominant-baseline="middle"
                                  fill="${COLORS.textWhite}" 
                                  font-family="Georgia, 'Times New Roman', serif" 
                                  font-size="${FONT_SIZE}" 
                                  font-weight="bold">${num}</text>
                        </g>
                    `;
                }).join('')}
            </svg>
        </div>
    `;
    
    initRacetrackHandlers();
}

/**
 * Get gradient ID for a number based on its color
 */
function getNumberGradientId(num) {
    const color = getNumberColor(num);
    if (color === 'red') return 'frenchRedGradient';
    if (color === 'green') return 'frenchGreenGradient';
    return 'frenchBlackGradient';
}

/**
 * Render the center section with TIER, ORPHELINS, VOISINS DU ZERO
 * French labels with elegant serif typography
 * Center panel fits exactly between number rows - no gap, no overlap
 */
function renderCenterSection(startX, endX, topY, bottomY, div1TopX, div1BottomX, div2TopX, div2BottomX, innerRadius) {
    const height = bottomY - topY;
    const centerY = (topY + bottomY) / 2;
    
    // Stadium-shaped center that connects to the curved wedges
    // Left semicircle connects to left curve inner edge
    // Right semicircle connects to right curve inner edge
    const centerPath = `
        M ${startX} ${topY}
        L ${endX} ${topY}
        A ${innerRadius} ${innerRadius} 0 0 1 ${endX} ${bottomY}
        L ${startX} ${bottomY}
        A ${innerRadius} ${innerRadius} 0 0 1 ${startX} ${topY}
        Z
    `;
    
    // Calculate center positions for labels
    const tierCenterX = (startX + 20 + div1TopX) / 2;
    const orphelinsCenterX = (div1TopX + div2TopX) / 2;
    const voisinsCenterX = (div2TopX + endX - 20) / 2;
    const labelY = centerY;
    
    return `
        <!-- Center background - stadium shape connecting to curves -->
        <path d="${centerPath}" 
              fill="${COLORS.centerBg}"/>
        
        <!-- Top edge gold line -->
        <line x1="${startX}" y1="${topY}" x2="${endX}" y2="${topY}" 
              stroke="${COLORS.gold}" stroke-width="1"/>
        
        <!-- Bottom edge gold line -->
        <line x1="${startX}" y1="${bottomY}" x2="${endX}" y2="${bottomY}" 
              stroke="${COLORS.gold}" stroke-width="1"/>
        
        <!-- Vertical divider 1: TIER | ORPHELINS -->
        <line x1="${div1TopX}" y1="${topY}" 
              x2="${div1BottomX}" y2="${bottomY}" 
              stroke="${COLORS.gold}" stroke-width="1.5"/>
        
        <!-- Vertical divider 2: ORPHELINS | VOISINS DU ZERO -->
        <line x1="${div2TopX}" y1="${topY}" 
              x2="${div2BottomX}" y2="${bottomY}" 
              stroke="${COLORS.gold}" stroke-width="1.5"/>
        
        <!-- TIER section (left) -->
        <g class="track-section" data-call-bet="tiers">
            <rect x="${startX}" y="${topY}" 
                  width="${div1TopX - startX}" height="${height}"
                  fill="transparent" class="section-hitbox"/>
            <text x="${tierCenterX}" y="${labelY}" 
                  text-anchor="middle" dominant-baseline="middle"
                  fill="${COLORS.textWhite}" 
                  font-family="Georgia, 'Times New Roman', serif" 
                  font-size="14" 
                  font-weight="bold" 
                  letter-spacing="2"
                  class="section-label">TIER</text>
        </g>
        
        <!-- ORPHELINS section (center) -->
        <g class="track-section" data-call-bet="orphelins">
            <rect x="${div1TopX}" y="${topY}" 
                  width="${div2TopX - div1TopX}" height="${height}"
                  fill="transparent" class="section-hitbox"/>
            <text x="${orphelinsCenterX}" y="${labelY}" 
                  text-anchor="middle" dominant-baseline="middle"
                  fill="${COLORS.textWhite}" 
                  font-family="Georgia, 'Times New Roman', serif" 
                  font-size="14" 
                  font-weight="bold" 
                  letter-spacing="2"
                  class="section-label">ORPHELINS</text>
        </g>
        
        <!-- VOISINS DU ZERO section (right) -->
        <g class="track-section" data-call-bet="voisins">
            <rect x="${div2TopX}" y="${topY}" 
                  width="${endX - div2TopX}" height="${height}"
                  fill="transparent" class="section-hitbox"/>
            <text x="${voisinsCenterX}" y="${labelY}" 
                  text-anchor="middle" dominant-baseline="middle"
                  fill="${COLORS.textWhite}" 
                  font-family="Georgia, 'Times New Roman', serif" 
                  font-size="12" 
                  font-weight="bold" 
                  letter-spacing="1"
                  class="section-label">VOISINS DU ZERO</text>
        </g>
    `;
}

/**
 * Render neighbour range buttons (2-7)
 */
function renderNeighbourButtons() {
    let html = '';
    for (let i = NEIGHBOUR_BET_CONFIG.minNeighbours; i <= NEIGHBOUR_BET_CONFIG.maxNeighbours; i++) {
        const isActive = i === currentNeighbourRange;
        const totalChips = i * 2 + 1;
        html += `
            <button class="neighbour-btn ${isActive ? 'active' : ''}" 
                    data-neighbour-range="${i}"
                    title="${totalChips} chips total">
                ${i}
            </button>
        `;
    }
    return html;
}

/**
 * Initialize racetrack event handlers
 * Supports both mouse and touch events for mobile
 */
function initRacetrackHandlers() {
    const container = document.getElementById('racetrackContainer');
    if (!container) return;
    
    if (container.dataset.handlersInitialized === 'true') return;
    container.dataset.handlersInitialized = 'true';
    
    // Detect if device supports touch
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Click handler for placing bets
    container.addEventListener('click', (e) => {
        const callBetSection = e.target.closest('[data-call-bet]');
        if (callBetSection) {
            handleCallBetClick(callBetSection.dataset.callBet);
            return;
        }
        
        const numberEl = e.target.closest('[data-racetrack-number]');
        if (numberEl) {
            const number = numberEl.dataset.racetrackNumber;
            handleNeighbourBetClick(number === '00' ? '00' : parseInt(number));
            return;
        }
        
        const rangeBtn = e.target.closest('[data-neighbour-range]');
        if (rangeBtn) {
            setNeighbourRange(parseInt(rangeBtn.dataset.neighbourRange));
            return;
        }
    });
    
    // Right-click handler for removing bets
    container.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const callBetSection = e.target.closest('[data-call-bet]');
        if (callBetSection) {
            handleCallBetRemove(callBetSection.dataset.callBet);
            return;
        }
        
        const numberEl = e.target.closest('[data-racetrack-number]');
        if (numberEl) {
            const number = numberEl.dataset.racetrackNumber;
            handleNeighbourBetRemove(number === '00' ? '00' : parseInt(number));
            return;
        }
        return false;
    });
    
    // Mouse hover handlers (desktop only)
    if (!isTouchDevice) {
        container.addEventListener('mouseover', (e) => {
            const numberEl = e.target.closest('[data-racetrack-number]');
            if (numberEl) {
                const number = numberEl.dataset.racetrackNumber;
                highlightNeighbours(number === '00' ? '00' : parseInt(number));
            }
            
            const callBetSection = e.target.closest('[data-call-bet]');
            if (callBetSection) {
                highlightCallBetNumbers(callBetSection.dataset.callBet);
            }
        });
        
        container.addEventListener('mouseout', (e) => {
            const numberEl = e.target.closest('[data-racetrack-number]');
            const callBetSection = e.target.closest('[data-call-bet]');
            if (numberEl || callBetSection) {
                clearRacetrackHighlights();
            }
        });
    }
    
    // Touch handlers for mobile - show neighbours on touch start, hide on touch end
    if (isTouchDevice) {
        container.addEventListener('touchstart', (e) => {
            const numberEl = e.target.closest('[data-racetrack-number]');
            if (numberEl) {
                const number = numberEl.dataset.racetrackNumber;
                highlightNeighbours(number === '00' ? '00' : parseInt(number));
            }
            
            const callBetSection = e.target.closest('[data-call-bet]');
            if (callBetSection) {
                highlightCallBetNumbers(callBetSection.dataset.callBet);
            }
        }, { passive: true });
        
        container.addEventListener('touchend', () => {
            // Small delay before clearing to let user see the selection
            setTimeout(() => {
                clearRacetrackHighlights();
            }, 300);
        }, { passive: true });
        
        // Clear highlights when touching outside racetrack
        container.addEventListener('touchcancel', () => {
            clearRacetrackHighlights();
        }, { passive: true });
    }
}

/**
 * Handle call bet section click
 */
function handleCallBetClick(betName) {
    if (getGamePhase() !== GAME_PHASES.BETTING) return;
    
    const chipValue = getSelectedChip();
    const success = placeCallBet(betName, chipValue);
    
    if (success) {
        renderPlacedChips();
        updateTotalBetDisplay();
        updateButtonStates();
        showCallBetFeedback(betName, true);
    } else {
        showCallBetFeedback(betName, false);
    }
}

/**
 * Handle call bet removal
 */
function handleCallBetRemove(betName) {
    if (getGamePhase() !== GAME_PHASES.BETTING) return;
    
    const chipValue = getSelectedChip();
    removeCallBet(betName, chipValue);
    
    renderPlacedChips();
    updateTotalBetDisplay();
    updateButtonStates();
}

/**
 * Handle neighbour bet click
 */
function handleNeighbourBetClick(number) {
    if (getGamePhase() !== GAME_PHASES.BETTING) return;
    
    const chipValue = getSelectedChip();
    const wheelSequence = getRouletteConfig().wheelSequence;
    const success = placeNeighbourBet(number, currentNeighbourRange, chipValue, wheelSequence);
    
    if (success) {
        renderPlacedChips();
        updateTotalBetDisplay();
        updateButtonStates();
        showNeighbourBetFeedback(number, true);
    } else {
        showNeighbourBetFeedback(number, false);
    }
}

/**
 * Handle neighbour bet removal
 */
function handleNeighbourBetRemove(number) {
    if (getGamePhase() !== GAME_PHASES.BETTING) return;
    
    const chipValue = getSelectedChip();
    const wheelSequence = getRouletteConfig().wheelSequence;
    removeNeighbourBet(number, currentNeighbourRange, chipValue, wheelSequence);
    
    renderPlacedChips();
    updateTotalBetDisplay();
    updateButtonStates();
}

/**
 * Set the neighbour range
 */
function setNeighbourRange(range) {
    currentNeighbourRange = Math.max(
        NEIGHBOUR_BET_CONFIG.minNeighbours,
        Math.min(NEIGHBOUR_BET_CONFIG.maxNeighbours, range)
    );
    
    document.querySelectorAll('.neighbour-btn').forEach(btn => {
        const btnRange = parseInt(btn.dataset.neighbourRange);
        btn.classList.toggle('active', btnRange === currentNeighbourRange);
    });
    
    if (hoveredRacetrackNumber !== null) {
        highlightNeighbours(hoveredRacetrackNumber);
    }
}

/**
 * Get current neighbour range
 */
function getNeighbourRange() {
    return currentNeighbourRange;
}

/**
 * Highlight neighbours of a number on the racetrack
 */
function highlightNeighbours(number) {
    hoveredRacetrackNumber = number;
    const wheelSequence = getRouletteConfig().wheelSequence;
    const neighbours = getWheelNeighbours(number, currentNeighbourRange, wheelSequence);
    
    document.querySelectorAll('.track-cell').forEach(el => {
        el.classList.remove('highlight', 'center');
    });
    
    neighbours.forEach(num => {
        const el = document.querySelector(`[data-racetrack-number="${num}"]`);
        if (el) {
            el.classList.add('highlight');
            if (num === number || num.toString() === number.toString()) {
                el.classList.add('center');
            }
        }
    });
}

/**
 * Highlight numbers for a call bet
 */
function highlightCallBetNumbers(betName) {
    const callBet = CALL_BETS[betName];
    if (!callBet) return;
    
    document.querySelectorAll('.track-cell').forEach(el => {
        el.classList.remove('highlight', 'center');
    });
    
    callBet.numbers.forEach(num => {
        const el = document.querySelector(`[data-racetrack-number="${num}"]`);
        if (el) {
            el.classList.add('highlight');
        }
    });
}

/**
 * Clear all racetrack highlights
 */
function clearRacetrackHighlights() {
    hoveredRacetrackNumber = null;
    document.querySelectorAll('.track-cell').forEach(el => {
        el.classList.remove('highlight', 'center');
    });
}

/**
 * Show visual feedback for call bet placement
 */
function showCallBetFeedback(betName, success) {
    const section = document.querySelector(`[data-call-bet="${betName}"]`);
    if (!section) return;
    
    section.classList.add(success ? 'bet-placed' : 'bet-failed');
    setTimeout(() => {
        section.classList.remove('bet-placed', 'bet-failed');
    }, 400);
}

/**
 * Show visual feedback for neighbour bet placement
 */
function showNeighbourBetFeedback(number, success) {
    const el = document.querySelector(`[data-racetrack-number="${number}"]`);
    if (!el) return;
    
    el.classList.add(success ? 'bet-placed' : 'bet-failed');
    setTimeout(() => {
        el.classList.remove('bet-placed', 'bet-failed');
    }, 300);
}

/**
 * Update racetrack to show placed bets
 */
function updateRacetrackBetDisplay() {
    const bets = getAllBets();
    
    document.querySelectorAll('.track-cell').forEach(el => {
        const num = el.dataset.racetrackNumber;
        const hasBet = bets.straight[num] && bets.straight[num] > 0;
        el.classList.toggle('has-bet', hasBet);
    });
}
