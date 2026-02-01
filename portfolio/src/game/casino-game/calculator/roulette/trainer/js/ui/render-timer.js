// =====================================================
// RENDER TIMER - Timer display and management
// =====================================================

let questionStartTime = null;
let sessionStartTime = null;
let timerInterval = null;

/**
 * Start the timer
 */
function startTimer() {
    if (!sessionStartTime) {
        sessionStartTime = Date.now();
    }
    questionStartTime = Date.now();

    // Clear any existing interval
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    // Update every 100ms for smooth display
    timerInterval = setInterval(updateTimerDisplay, 100);
    updateTimerDisplay();
}

/**
 * Stop the timer (pauses updates but keeps values)
 */
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

/**
 * Reset all timers
 */
function resetTimers() {
    stopTimer();
    questionStartTime = null;
    sessionStartTime = null;

    updateTimerDisplay();
}

/**
 * Get current question time in seconds
 * @returns {number}
 */
function getQuestionTime() {
    if (!questionStartTime) return 0;
    return (Date.now() - questionStartTime) / 1000;
}

/**
 * Get total session time in seconds
 * @returns {number}
 */
function getSessionTime() {
    if (!sessionStartTime) return 0;
    return (Date.now() - sessionStartTime) / 1000;
}

/**
 * Format seconds to MM:SS
 * @param {number} totalSeconds - Time in seconds
 * @returns {string}
 */
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format seconds to MM:SS.s (with tenths)
 * @param {number} totalSeconds - Time in seconds
 * @returns {string}
 */
function formatTimeWithTenths(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const tenths = Math.floor((totalSeconds * 10) % 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
}

/**
 * Update the timer display elements
 */
function updateTimerDisplay() {
    const questionTimerEl = document.getElementById('question-timer');
    const sessionTimerEl = document.getElementById('session-timer');

    if (questionTimerEl) {
        const questionTime = getQuestionTime();
        questionTimerEl.textContent = formatTimeWithTenths(questionTime);

        // Add warning class if taking too long (over 30 seconds)
        if (questionTime > 30) {
            questionTimerEl.classList.add('warning');
        } else {
            questionTimerEl.classList.remove('warning');
        }
    }

    if (sessionTimerEl) {
        sessionTimerEl.textContent = formatTime(getSessionTime());
    }
}

/**
 * Reset question timer (for new question)
 */
function resetQuestionTimer() {
    questionStartTime = Date.now();
    updateTimerDisplay();
}

/**
 * Create timer HTML
 * @returns {string}
 */
function createTimerHTML() {
    return `
        <div class="timer-display">
            <div class="timer-item">
                <div class="timer-value" id="question-timer">0:00.0</div>
                <div class="timer-label">Question</div>
            </div>
            <div class="timer-item">
                <div class="timer-value" id="session-timer">0:00</div>
                <div class="timer-label">Total</div>
            </div>
        </div>
    `;
}

export {
    startTimer,
    stopTimer,
    resetTimers,
    getQuestionTime,
    getSessionTime,
    formatTime,
    formatTimeWithTenths,
    updateTimerDisplay,
    resetQuestionTimer,
    createTimerHTML
};
