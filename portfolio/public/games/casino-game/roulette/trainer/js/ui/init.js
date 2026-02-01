// =====================================================
// UI INIT - Initialize application
// =====================================================

import { initializeGame, getState, submitOutsideAnswer, submitInsideAnswer, nextQuestion, getSessionResults, resetGame } from '../state/game-state.js';
import { renderQuestion, updateAnswerUI } from './render-question.js';
import { renderTable } from './render-table.js';
import { startTimer, stopTimer, resetTimers } from './render-timer.js';
import { renderNotes, initNotes } from './render-notes.js';
import { renderResults } from './render-results.js';

let currentMode = null;

/**
 * Initialize the game for a specific mode
 * @param {string} mode - Game mode
 * @param {number} questionCount - Number of questions (optional)
 */
function initGame(mode, questionCount) {
    currentMode = mode;
    resetGame();

    // Initialize game state
    const question = initializeGame(mode, questionCount);

    // Show game UI, hide mode selection
    document.getElementById('mode-selection')?.classList.add('hidden');
    document.getElementById('game-section')?.classList.remove('hidden');
    document.getElementById('results-section')?.classList.add('hidden');

    // Initialize components
    resetTimers();
    startTimer();

    if (mode === 'easy' || mode === 'medium') {
        initNotes();
        document.getElementById('notes-section')?.classList.remove('hidden');
    } else {
        document.getElementById('notes-section')?.classList.add('hidden');
    }

    // Render first question
    renderCurrentQuestion();
}

/**
 * Render the current question
 */
function renderCurrentQuestion() {
    const state = getState();

    if (!state.currentQuestion) {
        showResults();
        return;
    }

    renderQuestion(state);
    renderTable(state.currentQuestion);
    updateProgress(state.progress);

    if (state.showNotes) {
        renderNotes(state.notes);
    }
}

/**
 * Update progress bar
 * @param {object} progress - Progress info
 */
function updateProgress(progress) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    if (progressFill) {
        progressFill.style.width = `${progress.percentage}%`;
    }

    if (progressText) {
        progressText.textContent = `${progress.current} / ${progress.total}`;
    }
}

/**
 * Handle outside answer submission
 * @param {number} value - User's answer
 */
function handleOutsideSubmit(value) {
    const result = submitOutsideAnswer(value);
    if (result) {
        updateAnswerUI('outside', value, true);
    }
}

/**
 * Handle inside answer submission
 * @param {number} value - User's answer
 */
function handleInsideSubmit(value) {
    stopTimer();
    const validation = submitInsideAnswer(value);

    if (validation) {
        updateAnswerUI('inside', value, true);
        showFeedback(validation.allCorrect);

        // Auto advance after short delay
        setTimeout(() => {
            advanceToNext();
        }, 1500);
    }
}

/**
 * Show feedback for answer
 * @param {boolean} isCorrect - Whether answer was correct
 */
function showFeedback(isCorrect) {
    const feedbackEl = document.getElementById('feedback');
    if (feedbackEl) {
        feedbackEl.classList.remove('hidden', 'correct', 'incorrect');
        feedbackEl.classList.add(isCorrect ? 'correct' : 'incorrect');
        feedbackEl.textContent = isCorrect ? 'Correct!' : 'Incorrect';
    }
}

/**
 * Advance to next question
 */
function advanceToNext() {
    const question = nextQuestion();

    if (!question) {
        showResults();
        return;
    }

    // Hide feedback
    document.getElementById('feedback')?.classList.add('hidden');

    // Reset answer inputs
    resetAnswerInputs();

    // Start timer for new question
    startTimer();

    // Render next question
    renderCurrentQuestion();
}

/**
 * Reset answer input fields
 */
function resetAnswerInputs() {
    const outsideInput = document.getElementById('outside-input');
    const insideInput = document.getElementById('inside-input');
    const outsideSubmit = document.getElementById('outside-submit');
    const insideSubmit = document.getElementById('inside-submit');

    if (outsideInput) {
        outsideInput.value = '';
        outsideInput.disabled = false;
        outsideInput.focus();
    }

    if (insideInput) {
        insideInput.value = '';
        insideInput.disabled = true;
    }

    if (outsideSubmit) {
        outsideSubmit.disabled = false;
    }

    if (insideSubmit) {
        insideSubmit.disabled = true;
    }

    // Reset step indicators
    document.getElementById('step-1')?.classList.remove('completed');
    document.getElementById('step-2')?.classList.add('waiting');
}

/**
 * Show results screen
 */
function showResults() {
    stopTimer();

    document.getElementById('game-section')?.classList.add('hidden');
    document.getElementById('results-section')?.classList.remove('hidden');

    const results = getSessionResults();
    renderResults(results);
}

/**
 * Return to mode selection
 */
function returnToMenu() {
    resetGame();
    resetTimers();

    document.getElementById('game-section')?.classList.add('hidden');
    document.getElementById('results-section')?.classList.add('hidden');
    document.getElementById('mode-selection')?.classList.remove('hidden');
}

/**
 * Restart current mode
 */
function restartGame() {
    if (currentMode) {
        initGame(currentMode);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Outside answer submit
    const outsideSubmit = document.getElementById('outside-submit');
    const outsideInput = document.getElementById('outside-input');

    if (outsideSubmit) {
        outsideSubmit.addEventListener('click', () => {
            const value = parseInt(outsideInput?.value) || 0;
            handleOutsideSubmit(value);
        });
    }

    if (outsideInput) {
        outsideInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !outsideInput.disabled) {
                const value = parseInt(outsideInput.value) || 0;
                handleOutsideSubmit(value);
            }
        });
    }

    // Inside answer submit
    const insideSubmit = document.getElementById('inside-submit');
    const insideInput = document.getElementById('inside-input');

    if (insideSubmit) {
        insideSubmit.addEventListener('click', () => {
            const value = parseInt(insideInput?.value) || 0;
            handleInsideSubmit(value);
        });
    }

    if (insideInput) {
        insideInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !insideInput.disabled) {
                const value = parseInt(insideInput.value) || 0;
                handleInsideSubmit(value);
            }
        });
    }

    // Menu and restart buttons
    document.getElementById('btn-menu')?.addEventListener('click', returnToMenu);
    document.getElementById('btn-restart')?.addEventListener('click', restartGame);
    document.getElementById('results-menu')?.addEventListener('click', returnToMenu);
    document.getElementById('results-restart')?.addEventListener('click', restartGame);
}

// Export for use in HTML
export {
    initGame,
    handleOutsideSubmit,
    handleInsideSubmit,
    advanceToNext,
    returnToMenu,
    restartGame,
    setupEventListeners
};
