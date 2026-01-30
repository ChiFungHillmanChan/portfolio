// =====================================================
// RENDER WHEEL - SVG-based wheel with mathematically perfect geometry
// =====================================================

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Calculate SVG arc path for a pocket sector
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} innerRadius - Inner radius of the sector
 * @param {number} outerRadius - Outer radius of the sector
 * @param {number} startAngle - Start angle in degrees (0 = top, clockwise)
 * @param {number} endAngle - End angle in degrees
 * @returns {string} SVG path data
 */
function createSectorPath(cx, cy, innerRadius, outerRadius, startAngle, endAngle) {
    // Convert angles to radians, offset by -90 degrees so 0 = top
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    
    // Calculate points
    const x1 = cx + outerRadius * Math.cos(startRad);
    const y1 = cy + outerRadius * Math.sin(startRad);
    const x2 = cx + outerRadius * Math.cos(endRad);
    const y2 = cy + outerRadius * Math.sin(endRad);
    const x3 = cx + innerRadius * Math.cos(endRad);
    const y3 = cy + innerRadius * Math.sin(endRad);
    const x4 = cx + innerRadius * Math.cos(startRad);
    const y4 = cy + innerRadius * Math.sin(startRad);
    
    // Large arc flag (0 for arcs less than 180 degrees)
    const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
    
    // Create path: outer arc, line to inner, inner arc (reverse), close
    return `M ${x1} ${y1} 
            A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} 
            L ${x3} ${y3} 
            A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} 
            Z`;
}

/**
 * Get color values for pocket
 * @param {number|string} number - Pocket number
 * @returns {object} Fill and stroke colors
 */
function getPocketColors(number) {
    const color = getNumberColor(number);
    const colors = {
        red: { fill: '#C41E3A', stroke: '#8B0000', highlight: '#FF4444' },
        black: { fill: '#1a1a1a', stroke: '#0D0D0D', highlight: '#444444' },
        green: { fill: '#006400', stroke: '#004D00', highlight: '#00AA00' }
    };
    return colors[color] || colors.green;
}

/**
 * Render the roulette wheel using SVG
 */
function renderWheel() {
    const container = document.getElementById('wheel');
    const wheelWrapper = document.querySelector('.wheel-wrapper');
    if (!container) return;

    const rouletteConfig = getRouletteConfig();
    const sequence = rouletteConfig.wheelSequence;
    const pocketCount = sequence.length;
    const degreesPerPocket = 360 / pocketCount;
    const halfPocketAngle = degreesPerPocket / 2;

    // Use fixed viewBox size - SVG will scale to fit container via CSS
    // This ensures consistent geometry regardless of container size
    const size = 300;
    const cx = size / 2;
    const cy = size / 2;
    
    // Calculate radii as percentages of viewBox size for perfect scaling
    // Layout from outside to inside:
    // 1. Outer edge (outerRadius) - edge of wheel
    // 2. Number area - numbers at 44% (pushed slightly out)
    // 3. Gap - clear space
    // 4. Ball landing area - gold ring at 110px (36.6%)
    // 5. Inner hub area
    const outerRadius = size * 0.48;          // 48% - outer edge of pockets
    const numberRadius = size * 0.44;         // 44% - numbers pushed out slightly
    const innerRadius = size * 0.33;          // 33% - inner edge of pocket area
    
    // Gold dividers/Ring - sit at requested 110px (36.6%)
    const dividerOuterRadius = size * 0.366;  // 36.6% - dividers top / ring position (r=110)
    const dividerInnerRadius = size * 0.33;   // 33% - dividers bottom

    // Set CSS variables for ball animation
    if (wheelWrapper) {
        const wrapperRect = wheelWrapper.getBoundingClientRect();
        const wrapperSize = Math.min(wrapperRect.width, wrapperRect.height) || 340;
        wheelWrapper.style.setProperty('--half-pocket-angle', halfPocketAngle + 'deg');
        // Ball orbit radius based on actual wrapper size
        wheelWrapper.style.setProperty('--ball-orbit-radius', (wrapperSize * 0.33) + 'px');
    }

    // Clear existing content
    container.innerHTML = '';

    // Create SVG element with fixed viewBox - preserveAspectRatio centers it
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('class', 'wheel-svg');
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.display = 'block';

    // Create defs for gradients and filters
    const defs = document.createElementNS(SVG_NS, 'defs');
    
    // Gold gradient for dividers
    const goldGradient = document.createElementNS(SVG_NS, 'linearGradient');
    goldGradient.setAttribute('id', 'goldDivider');
    goldGradient.setAttribute('x1', '0%');
    goldGradient.setAttribute('y1', '0%');
    goldGradient.setAttribute('x2', '0%');
    goldGradient.setAttribute('y2', '100%');
    goldGradient.innerHTML = `
        <stop offset="0%" stop-color="#D4AF37"/>
        <stop offset="30%" stop-color="#B8860B"/>
        <stop offset="70%" stop-color="#8B6914"/>
        <stop offset="100%" stop-color="#5C4A1F"/>
    `;
    defs.appendChild(goldGradient);

    // Wood/brown gradient for inner ring
    const woodGradient = document.createElementNS(SVG_NS, 'radialGradient');
    woodGradient.setAttribute('id', 'woodInner');
    woodGradient.setAttribute('cx', '40%');
    woodGradient.setAttribute('cy', '40%');
    woodGradient.setAttribute('r', '60%');
    woodGradient.innerHTML = `
        <stop offset="0%" stop-color="#5D4037"/>
        <stop offset="50%" stop-color="#4E342E"/>
        <stop offset="100%" stop-color="#3E2723"/>
    `;
    defs.appendChild(woodGradient);

    // Drop shadow filter for pockets
    const dropShadow = document.createElementNS(SVG_NS, 'filter');
    dropShadow.setAttribute('id', 'pocketShadow');
    dropShadow.innerHTML = `
        <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="rgba(0,0,0,0.5)"/>
    `;
    defs.appendChild(dropShadow);
    
    svg.appendChild(defs);

    // Create wheel-outer group (this will rotate)
    const wheelOuter = document.createElementNS(SVG_NS, 'g');
    wheelOuter.setAttribute('class', 'wheel-outer');
    // Set transform origin to center of viewBox (150px for 300x300 viewBox)
    wheelOuter.style.transformOrigin = `${cx}px ${cy}px`;

    // Background circle for pocket area
    const bgCircle = document.createElementNS(SVG_NS, 'circle');
    bgCircle.setAttribute('cx', cx);
    bgCircle.setAttribute('cy', cy);
    bgCircle.setAttribute('r', outerRadius);
    bgCircle.setAttribute('fill', '#1a1a1a');
    wheelOuter.appendChild(bgCircle);

    // Create pockets group
    const pocketsGroup = document.createElementNS(SVG_NS, 'g');
    pocketsGroup.setAttribute('class', 'wheel-pockets');

    // Create each pocket
    sequence.forEach((number, index) => {
        const startAngle = index * degreesPerPocket;
        const endAngle = startAngle + degreesPerPocket;
        const midAngle = startAngle + halfPocketAngle;
        
        // Pocket group
        const pocketGroup = document.createElementNS(SVG_NS, 'g');
        pocketGroup.setAttribute('class', 'wheel-pocket');
        pocketGroup.setAttribute('data-number', number);
        
        // Colored sector path - the full pocket from outer to inner
        const colors = getPocketColors(number);
        const sectorPath = document.createElementNS(SVG_NS, 'path');
        sectorPath.setAttribute('d', createSectorPath(cx, cy, innerRadius, outerRadius, startAngle, endAngle));
        sectorPath.setAttribute('fill', colors.fill);
        sectorPath.setAttribute('stroke', colors.stroke);
        sectorPath.setAttribute('stroke-width', '0.5');
        sectorPath.setAttribute('class', 'wheel-pocket-sector ' + getNumberColor(number));
        pocketGroup.appendChild(sectorPath);
        
        // Number text - positioned near the OUTER edge (top of pocket)
        const textAngleRad = (midAngle - 90) * Math.PI / 180;
        const textX = cx + numberRadius * Math.cos(textAngleRad);
        const textY = cy + numberRadius * Math.sin(textAngleRad);
        
        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', textX);
        text.setAttribute('y', textY);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('class', 'wheel-pocket-number');
        // Rotate text to be radial - pointing outward from center (readable from outside)
        text.setAttribute('transform', `rotate(${midAngle}, ${textX}, ${textY})`);
        text.textContent = number;
        pocketGroup.appendChild(text);
        
        pocketsGroup.appendChild(pocketGroup);
    });

    wheelOuter.appendChild(pocketsGroup);

    // Inner wood circle - covers the inner area inside the pockets
    const innerWoodCircle = document.createElementNS(SVG_NS, 'circle');
    innerWoodCircle.setAttribute('cx', cx);
    innerWoodCircle.setAttribute('cy', cy);
    innerWoodCircle.setAttribute('r', innerRadius);
    innerWoodCircle.setAttribute('fill', 'url(#woodInner)');
    wheelOuter.appendChild(innerWoodCircle);

    // Create dividers group - these go in the ball landing zone (UNDER the numbers)
    const dividersGroup = document.createElementNS(SVG_NS, 'g');
    dividersGroup.setAttribute('class', 'wheel-dividers');

    // Create dividers between each pocket
    sequence.forEach((number, index) => {
        const angle = index * degreesPerPocket;
        const angleRad = (angle - 90) * Math.PI / 180;
        
        const x1 = cx + dividerInnerRadius * Math.cos(angleRad);
        const y1 = cy + dividerInnerRadius * Math.sin(angleRad);
        const x2 = cx + dividerOuterRadius * Math.cos(angleRad);
        const y2 = cy + dividerOuterRadius * Math.sin(angleRad);
        
        const divider = document.createElementNS(SVG_NS, 'line');
        divider.setAttribute('x1', x1);
        divider.setAttribute('y1', y1);
        divider.setAttribute('x2', x2);
        divider.setAttribute('y2', y2);
        divider.setAttribute('stroke', 'url(#goldDivider)');
        divider.setAttribute('stroke-width', '2');
        divider.setAttribute('class', 'wheel-divider');
        dividersGroup.appendChild(divider);
    });

    wheelOuter.appendChild(dividersGroup);

    // Gold ring connecting the dividers (at the outer edge of dividers, below numbers)
    const goldRing = document.createElementNS(SVG_NS, 'circle');
    goldRing.setAttribute('cx', cx);
    goldRing.setAttribute('cy', cy);
    goldRing.setAttribute('r', 115); // Gold ring radius
    goldRing.setAttribute('fill', 'none');
    goldRing.setAttribute('stroke', 'url(#goldDivider)'); // Use gradient for gold effect
    goldRing.setAttribute('stroke-width', '3');
    goldRing.setAttribute('class', 'wheel-gold-ring');
    wheelOuter.appendChild(goldRing);

    // Outer gold ring - handled by CSS .wheel::before
    /*
    const outerRing = document.createElementNS(SVG_NS, 'circle');
    outerRing.setAttribute('cx', cx);
    outerRing.setAttribute('cy', cy);
    outerRing.setAttribute('r', outerRadius);
    outerRing.setAttribute('fill', 'none');
    outerRing.setAttribute('stroke', '#D4AF37');
    outerRing.setAttribute('stroke-width', '2');
    outerRing.setAttribute('class', 'wheel-outer-gold-ring');
    wheelOuter.appendChild(outerRing);
    */

    svg.appendChild(wheelOuter);
    container.appendChild(svg);

    // Initialize ball
    const ball = document.getElementById('ball');
    if (ball) {
        ball.classList.remove('visible', 'spinning');
    }

    // Clear result indicator
    const indicator = document.getElementById('resultIndicator');
    if (indicator) {
        indicator.textContent = '';
    }
}

/**
 * Animate wheel spin
 * @param {object} spinData - Spin data from generateSpinData
 * @param {function} onComplete - Callback when animation completes
 */
function animateWheelSpin(spinData, onComplete) {
    const wheel = document.getElementById('wheel');
    const wheelOuter = wheel ? wheel.querySelector('.wheel-outer') : null;
    const wheelWrapper = document.querySelector('.wheel-wrapper');
    const ball = document.getElementById('ball');
    const indicator = document.getElementById('resultIndicator');

    if (!wheel || !wheelOuter || !ball) {
        onComplete();
        return;
    }

    // Clear previous state
    wheelOuter.classList.remove('spinning');
    ball.classList.remove('spinning', 'visible');
    if (indicator) indicator.textContent = '';

    // Force reflow
    wheelOuter.getBoundingClientRect();

    // Get ball orbit radius from CSS or calculate it
    let ballOrbitRadius = 120; // default
    if (wheelWrapper) {
        const wrapperWidth = wheelWrapper.getBoundingClientRect().width;
        // Ball lands in pocket area
        ballOrbitRadius = wrapperWidth * 0.33; // 33% of wheel width
        ball.style.setProperty('--ball-orbit-radius', ballOrbitRadius + 'px');
    }

    // Set CSS variables for animation
    const wheelRotation = spinData.wheelAngle;
    const ballRotation = spinData.ballAngle;
    const duration = spinData.duration;

    wheelOuter.style.setProperty('--wheel-rotation', wheelRotation + 'deg');
    wheelOuter.style.setProperty('--wheel-duration', duration + 'ms');
    ball.style.setProperty('--ball-rotation', ballRotation + 'deg');
    ball.style.setProperty('--ball-duration', duration + 'ms');

    // Start animations
    ball.classList.add('visible');

    // Small delay before starting spin
    setTimeout(() => {
        wheelOuter.classList.add('spinning');
        ball.classList.add('spinning');

        // Update spin button
        const spinBtn = document.getElementById('spinBtn');
        if (spinBtn) {
            spinBtn.textContent = 'SPINNING...';
            spinBtn.classList.add('spinning');
        }
    }, 100);

    // Handle animation completion
    setTimeout(() => {
        // Calculate ball's final position BEFORE removing animation class
        const wrapperWidth = wheelWrapper ? wheelWrapper.getBoundingClientRect().width : 340;
        const finalBallOrbitRadius = wrapperWidth * 0.33;

        // Ball's final angle is at TOP (12 o'clock position)
        const finalBallX = 0;
        const finalBallY = -finalBallOrbitRadius;

        // Set the ball's final position BEFORE removing spinning class
        ball.style.transform = `translate(calc(-50% + ${finalBallX}px), calc(-50% + ${finalBallY}px))`;

        // Now safely remove spinning classes
        wheelOuter.classList.remove('spinning');
        ball.classList.remove('spinning');

        // Set final rotation state on wheel-outer (center of 300x300 viewBox)
        wheelOuter.style.transform = `rotate(${wheelRotation}deg)`;
        wheelOuter.style.transformOrigin = '150px 150px';

        // Show result and highlights
        requestAnimationFrame(() => {
            // Show result in center
            if (indicator) {
                indicator.textContent = spinData.result;
                indicator.className = 'result-indicator ' + getNumberColor(spinData.result);
            }

            // Highlight winning pocket
            highlightWinningPocket(spinData.result);
            highlightWinningNumber(spinData.result);

            // Reset spin button
            const spinBtn = document.getElementById('spinBtn');
            if (spinBtn) {
                spinBtn.textContent = 'SPIN';
                spinBtn.classList.remove('spinning');
            }

            // Callback
            onComplete();
        });

    }, spinData.duration + 100);
}

/**
 * Position ball at TOP (12 o'clock) where winning pocket is located after wheel rotation
 * @param {number|string} number - Winning number (for reference, not used in positioning)
 * @param {number} wheelRotation - Final wheel rotation angle in degrees (for reference)
 */
function positionBallAtPocket(number, wheelRotation = 0) {
    const ball = document.getElementById('ball');
    const wheelWrapper = document.querySelector('.wheel-wrapper');

    if (!ball || !wheelWrapper) return;

    // Get the wheel wrapper dimensions
    const wrapperRect = wheelWrapper.getBoundingClientRect();
    const ballOrbitRadius = wrapperRect.width * 0.33;

    // Ball always lands at TOP (12 o'clock)
    const ballX = 0;
    const ballY = -ballOrbitRadius;

    ball.style.transform = `translate(calc(-50% + ${ballX}px), calc(-50% + ${ballY}px))`;
    ball.classList.add('visible');
    ball.classList.remove('spinning');
}

/**
 * Highlight winning pocket on wheel
 * @param {number|string} number - Winning number
 */
function highlightWinningPocket(number) {
    // Remove existing highlights
    document.querySelectorAll('.wheel-pocket.winning').forEach(el => {
        el.classList.remove('winning');
    });
    
    // Find and highlight winning pocket (SVG group)
    const pocket = document.querySelector(`.wheel-pocket[data-number="${number}"]`);
    if (pocket) {
        pocket.classList.add('winning');
    }
}

/**
 * Clear wheel winning state
 */
function clearWheelWinningState() {
    document.querySelectorAll('.wheel-pocket.winning').forEach(el => {
        el.classList.remove('winning');
    });
    
    const indicator = document.getElementById('resultIndicator');
    if (indicator) {
        indicator.textContent = '';
    }
}

/**
 * Reset wheel to initial state
 */
function resetWheel() {
    const wheel = document.getElementById('wheel');
    const wheelOuter = wheel ? wheel.querySelector('.wheel-outer') : null;
    const ball = document.getElementById('ball');
    const indicator = document.getElementById('resultIndicator');

    if (wheelOuter) {
        wheelOuter.classList.remove('spinning');
        wheelOuter.style.transform = 'rotate(0deg)';
        // Clear CSS animation variables
        wheelOuter.style.removeProperty('--wheel-rotation');
        wheelOuter.style.removeProperty('--wheel-duration');
    }

    if (ball) {
        ball.classList.remove('visible', 'spinning');
        ball.style.transform = 'translate(-50%, -50%)';
        // Clear CSS animation variables
        ball.style.removeProperty('--ball-rotation');
        ball.style.removeProperty('--ball-duration');
    }

    if (indicator) {
        indicator.textContent = '';
    }

    clearWheelWinningState();
    clearWinningHighlight();
}

/**
 * Create simple wheel visualization (CSS-only fallback)
 */
function renderSimpleWheel() {
    const container = document.getElementById('wheel');
    if (!container) return;
    
    container.innerHTML = '<div class="wheel-simple"></div>';
}

/**
 * Animate a quick flash on the wheel
 */
function flashWheel() {
    const wheel = document.getElementById('wheel');
    if (!wheel) return;
    
    wheel.classList.add('flash');
    setTimeout(() => {
        wheel.classList.remove('flash');
    }, 300);
}
