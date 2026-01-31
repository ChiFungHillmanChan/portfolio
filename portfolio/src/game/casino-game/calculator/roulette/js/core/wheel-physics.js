// =====================================================
// WHEEL PHYSICS - RNG and spin parameter generation
// Pure functions, no DOM dependencies
// =====================================================

/**
 * Generate cryptographically secure random result
 * @param {array} wheelSequence - The wheel sequence array
 * @returns {number|string} Winning pocket (0-36 or '00')
 */
function generateRandomResult(wheelSequence) {
    const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % wheelSequence.length;
    return wheelSequence[randomIndex];
}

/**
 * Get the index of a pocket number in the wheel sequence
 * @param {number|string} pocketNumber - The pocket to find
 * @param {array} wheelSequence - The wheel sequence
 * @returns {number} Index in the sequence
 */
function getPocketIndex(pocketNumber, wheelSequence) {
    return wheelSequence.findIndex(p => p === pocketNumber || p.toString() === pocketNumber.toString());
}

/**
 * Calculate wheel angle for a specific pocket
 * @param {number|string} pocketNumber - Target pocket
 * @param {array} wheelSequence - Ordered sequence of pockets
 * @returns {number} Angle in degrees (0-360)
 */
function getPocketAngle(pocketNumber, wheelSequence) {
    const index = getPocketIndex(pocketNumber, wheelSequence);
    if (index === -1) return 0;
    const degreesPerPocket = 360 / wheelSequence.length;
    return index * degreesPerPocket;
}

/**
 * Generate realistic spin parameters
 * @returns {object} Animation parameters for the spin
 */
function generateSpinParams() {
    // Use INTEGER rotations to ensure precise landing
    // Random integer between 4-7 for wheel, 6-10 for ball
    const wheelRotations = 4 + Math.floor(Math.random() * 4);  // 4, 5, 6, or 7 full spins
    const ballRotations = 6 + Math.floor(Math.random() * 5);   // 6, 7, 8, 9, or 10 orbits

    return {
        wheelRotations: wheelRotations,
        ballRotations: ballRotations,
        spinDuration: 4000 + Math.random() * 2000,  // 4-6 seconds total
        // Easing for natural deceleration
        easingFunction: 'cubic-bezier(0.17, 0.67, 0.12, 0.99)'
    };
}

/**
 * Calculate the final wheel rotation angle to land on a specific pocket
 *
 * Coordinate system:
 * - Pockets are rendered starting from TOP (12 o'clock) at rotation 0
 * - Ball CSS animation reference is from RIGHT (3 o'clock) at rotation 0
 * - We rotate the wheel so the CENTER of target pocket ends up at TOP (12 o'clock)
 * - Ball animation ends at TOP to match the winning pocket center
 *
 * @param {number|string} targetPocket - The pocket to land on
 * @param {array} wheelSequence - The wheel sequence
 * @param {number} baseRotations - Number of full rotations before landing
 * @returns {number} Final rotation angle in degrees
 */
function calculateFinalWheelAngle(targetPocket, wheelSequence, baseRotations) {
    const index = getPocketIndex(targetPocket, wheelSequence);
    const pocketCount = wheelSequence.length;
    const degreesPerPocket = 360 / pocketCount;
    const halfPocket = degreesPerPocket / 2;

    // The pocket's CENTER angle from TOP (12 o'clock)
    // Each pocket starts at index * degreesPerPocket, center is at start + half
    const pocketCenterAngle = index * degreesPerPocket + halfPocket;

    // Rotate wheel so target pocket CENTER ends at TOP (12 o'clock / 0 degrees)
    // Wheel rotates clockwise (positive degrees)
    // To bring a pocket center from angle A to 0: rotate by (baseRotations * 360) - A
    const finalAngle = (baseRotations * 360) - pocketCenterAngle;

    return finalAngle;
}

/**
 * Calculate ball rotation angle to land at the winning pocket
 * Ball spins counter-clockwise (opposite to wheel) and ends at TOP (12 o'clock)
 * where the winning pocket is positioned after wheel rotation
 *
 * @param {number} baseRotations - Number of full rotations
 * @returns {number} Ball rotation angle in degrees (negative for counter-clockwise)
 */
function calculateBallAngle(baseRotations) {
    // Ball spins opposite direction (counter-clockwise = negative)
    // CSS rotation reference: 0 degrees = RIGHT (3 o'clock)
    // We want ball to end at TOP (12 o'clock) = -90 degrees from right reference
    // Total rotation: multiple full rotations + final position at -90
    return -(baseRotations * 360) - 90;
}

/**
 * Generate complete spin animation data
 *
 * IMPORTANT: The result is determined FIRST using cryptographically secure RNG,
 * then the wheel and ball rotations are calculated to land EXACTLY on that result.
 * This ensures fair, predetermined outcomes with realistic animation.
 *
 * @param {array} wheelSequence - The wheel sequence
 * @returns {object} Complete spin data including result and animation params
 */
function generateSpinData(wheelSequence) {
    // Step 1: Determine the winning number FIRST (cryptographically secure)
    const result = generateRandomResult(wheelSequence);

    // Step 2: Generate random spin parameters (duration, rotations)
    const params = generateSpinParams();

    // Step 3: Calculate EXACT wheel rotation to land on the winning pocket
    // The wheel will rotate so the winning pocket ends at TOP (12 o'clock)
    const wheelAngle = calculateFinalWheelAngle(result, wheelSequence, params.wheelRotations);

    // Step 4: Calculate ball rotation to end at TOP (where winning pocket is)
    // Ball uses same number of rotations as wheel for visual synchronization
    const ballAngle = calculateBallAngle(params.wheelRotations);

    return {
        result: result,
        wheelAngle: wheelAngle,
        ballAngle: ballAngle,
        duration: params.spinDuration,
        easing: params.easingFunction,
        phases: {
            acceleration: params.spinDuration * 0.15,    // 15% - speed up
            fullSpeed: params.spinDuration * 0.35,       // 35% - maintain speed
            deceleration: params.spinDuration * 0.40,    // 40% - slow down
            landing: params.spinDuration * 0.10          // 10% - final settle
        }
    };
}

/**
 * Get neighboring pockets on the wheel
 * @param {number|string} pocketNumber - The center pocket
 * @param {array} wheelSequence - The wheel sequence
 * @param {number} neighbors - Number of neighbors on each side (default 2)
 * @returns {array} Array of neighboring pockets including the center
 */
function getNeighborPockets(pocketNumber, wheelSequence, neighbors = 2) {
    const index = getPocketIndex(pocketNumber, wheelSequence);
    if (index === -1) return [pocketNumber];
    
    const result = [];
    const total = wheelSequence.length;
    
    for (let i = -neighbors; i <= neighbors; i++) {
        const neighborIndex = (index + i + total) % total;
        result.push(wheelSequence[neighborIndex]);
    }
    
    return result;
}

/**
 * Get the wheel sector (Voisins, Orphelins, Tiers, Zero) for European roulette
 * @param {number|string} pocketNumber - The pocket number
 * @returns {string|null} Sector name or null
 */
function getWheelSector(pocketNumber) {
    // Voisins du Zéro (neighbors of zero) - 17 numbers
    const voisins = [0, 2, 3, 4, 7, 12, 15, 18, 19, 21, 22, 25, 26, 28, 29, 32, 35];
    
    // Tiers du Cylindre (thirds of the wheel) - 12 numbers
    const tiers = [5, 8, 10, 11, 13, 16, 23, 24, 27, 30, 33, 36];
    
    // Orphelins (orphans) - 8 numbers
    const orphelins = [1, 6, 9, 14, 17, 20, 31, 34];
    
    const num = typeof pocketNumber === 'string' ? pocketNumber : parseInt(pocketNumber);
    
    if (voisins.includes(num)) return 'voisins';
    if (tiers.includes(num)) return 'tiers';
    if (orphelins.includes(num)) return 'orphelins';
    
    return null;
}
