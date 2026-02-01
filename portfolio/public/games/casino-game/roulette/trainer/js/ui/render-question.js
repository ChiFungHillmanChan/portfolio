// =====================================================
// RENDER QUESTION - Question flow and answer handling
// =====================================================

import { getNumberColor } from './render-table.js';

/**
 * Render the question UI
 * @param {object} state - Current game state
 */
function renderQuestion(state) {
    const { currentQuestion, progress } = state;

    if (!currentQuestion) return;

    // Update winning number display
    const winningDisplay = document.getElementById('winning-number');
    if (winningDisplay) {
        winningDisplay.textContent = currentQuestion.winningNumber;
        winningDisplay.className = 'winning-number ' + getNumberColor(currentQuestion.winningNumber);
    }

    // Update question number
    const questionNum = document.getElementById('question-number');
    if (questionNum) {
        questionNum.textContent = `Question ${progress.current}`;
    }

    // Reset answer inputs
    resetInputs();

    // Set focus on outside input
    setTimeout(() => {
        document.getElementById('outside-input')?.focus();
    }, 100);
}

/**
 * Reset answer input fields to initial state
 */
function resetInputs() {
    const outsideInput = document.getElementById('outside-input');
    const insideInput = document.getElementById('inside-input');
    const outsideSubmit = document.getElementById('outside-submit');
    const insideSubmit = document.getElementById('inside-submit');
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const feedback = document.getElementById('feedback');

    // Clear inputs
    if (outsideInput) {
        outsideInput.value = '';
        outsideInput.disabled = false;
    }

    if (insideInput) {
        insideInput.value = '';
        insideInput.disabled = true;
    }

    // Reset buttons
    if (outsideSubmit) outsideSubmit.disabled = false;
    if (insideSubmit) insideSubmit.disabled = true;

    // Reset step indicators
    if (step1) {
        step1.classList.remove('completed');
        step1.textContent = '1';
    }

    if (step2) {
        step2.classList.add('waiting');
        step2.classList.remove('completed');
        step2.textContent = '2';
    }

    // Hide feedback
    if (feedback) {
        feedback.classList.add('hidden');
        feedback.classList.remove('correct', 'incorrect');
    }
}

/**
 * Update answer UI after submission
 * @param {string} step - 'outside' or 'inside'
 * @param {number} value - Submitted value
 * @param {boolean} moveToNext - Whether to move to next step
 */
function updateAnswerUI(step, value, moveToNext) {
    if (step === 'outside') {
        const outsideInput = document.getElementById('outside-input');
        const outsideSubmit = document.getElementById('outside-submit');
        const insideInput = document.getElementById('inside-input');
        const insideSubmit = document.getElementById('inside-submit');
        const step1 = document.getElementById('step-1');
        const step2 = document.getElementById('step-2');

        // Mark step 1 as completed
        if (step1) {
            step1.classList.add('completed');
            step1.innerHTML = '&#10003;'; // Checkmark
        }

        // Disable outside input
        if (outsideInput) outsideInput.disabled = true;
        if (outsideSubmit) outsideSubmit.disabled = true;

        // Enable inside input
        if (insideInput) {
            insideInput.disabled = false;
            insideInput.focus();
        }
        if (insideSubmit) insideSubmit.disabled = false;

        // Activate step 2
        if (step2) {
            step2.classList.remove('waiting');
        }
    } else if (step === 'inside') {
        const insideInput = document.getElementById('inside-input');
        const insideSubmit = document.getElementById('inside-submit');
        const step2 = document.getElementById('step-2');

        // Mark step 2 as completed
        if (step2) {
            step2.classList.add('completed');
            step2.innerHTML = '&#10003;';
        }

        // Disable inside input
        if (insideInput) insideInput.disabled = true;
        if (insideSubmit) insideSubmit.disabled = true;
    }
}

/**
 * Show answer feedback
 * @param {boolean} isCorrect - Whether answer was correct
 * @param {object} validation - Validation details (optional)
 */
function showAnswerFeedback(isCorrect, validation = null) {
    const feedback = document.getElementById('feedback');

    if (feedback) {
        feedback.classList.remove('hidden', 'correct', 'incorrect');
        feedback.classList.add(isCorrect ? 'correct' : 'incorrect');

        if (isCorrect) {
            feedback.textContent = 'Correct!';
        } else if (validation) {
            let msg = 'Incorrect: ';
            const errors = [];

            if (!validation.outsideCorrect) {
                errors.push(`Outside should be ${validation.correctOutside}`);
            }
            if (!validation.insideCorrect) {
                errors.push(`Inside should be ${validation.correctInside}`);
            }

            feedback.textContent = msg + errors.join(', ');
        } else {
            feedback.textContent = 'Incorrect';
        }
    }
}

/**
 * Create the question section HTML
 * @returns {string} HTML string
 */
function createQuestionHTML() {
    return `
        <div class="question-container">
            <!-- Progress -->
            <div class="progress-bar">
                <div class="progress-track">
                    <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
                </div>
                <span class="progress-text" id="progress-text">1 / 20</span>
            </div>

            <!-- Timer -->
            <div class="timer-display">
                <div class="timer-item">
                    <div class="timer-value" id="question-timer">0:00</div>
                    <div class="timer-label">Question</div>
                </div>
                <div class="timer-item">
                    <div class="timer-value" id="session-timer">0:00</div>
                    <div class="timer-label">Total</div>
                </div>
            </div>

            <!-- Winning Number -->
            <div class="winning-number-display">
                <div class="winning-number-label">Winning Number</div>
                <div class="winning-number green" id="winning-number">0</div>
            </div>

            <!-- Table Container -->
            <div id="table-container"></div>

            <!-- Answer Section -->
            <div class="answer-section">
                <!-- Step 1: Outside -->
                <div class="answer-step">
                    <div class="answer-step-header">
                        <div class="step-number" id="step-1">1</div>
                        <div>
                            <div class="step-label">Outside Bets Payout</div>
                            <div class="step-hint">1:1 and 2:1 bets (Red/Black, Columns, Dozens)</div>
                        </div>
                    </div>
                    <div class="answer-input-group">
                        <input type="number"
                               class="answer-input"
                               id="outside-input"
                               placeholder="0"
                               min="0"
                               autocomplete="off">
                        <button class="btn btn-primary" id="outside-submit">Submit</button>
                    </div>
                </div>

                <!-- Step 2: Inside -->
                <div class="answer-step">
                    <div class="answer-step-header">
                        <div class="step-number waiting" id="step-2">2</div>
                        <div>
                            <div class="step-label">Inside Bets Payout</div>
                            <div class="step-hint">Straight, Split, Corner, Street, Line bets</div>
                        </div>
                    </div>
                    <div class="answer-input-group">
                        <input type="number"
                               class="answer-input"
                               id="inside-input"
                               placeholder="0"
                               min="0"
                               disabled
                               autocomplete="off">
                        <button class="btn btn-primary" id="inside-submit" disabled>Submit</button>
                    </div>
                </div>

                <!-- Feedback -->
                <div class="feedback hidden" id="feedback"></div>
            </div>
        </div>
    `;
}

export {
    renderQuestion,
    updateAnswerUI,
    showAnswerFeedback,
    createQuestionHTML,
    resetInputs
};
