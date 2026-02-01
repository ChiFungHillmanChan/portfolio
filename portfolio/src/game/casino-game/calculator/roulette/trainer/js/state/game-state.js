// =====================================================
// GAME STATE - Centralized state management
// =====================================================

import { generateEasyQuestion, generateMediumQuestion, generateHardQuestion, generateExamQuestions } from '../core/question-generator.js';
import { validateAnswer } from '../core/answer-validator.js';
import { saveSessionStats } from './storage.js';

/**
 * Game state singleton
 */
const gameState = {
    mode: null,              // 'easy', 'medium', 'hard', 'exam'
    questions: [],           // Array of question objects
    currentIndex: 0,         // Current question index
    answers: [],             // Array of {question, userAnswer, validation, time}
    timer: {
        questionStart: null, // Timestamp when current question started
        sessionStart: null   // Timestamp when session started
    },
    notes: '',               // User's notes (Easy/Medium only)
    phase: 'idle',           // 'idle', 'playing', 'awaitingInside', 'result', 'finished'
    currentOutsideAnswer: null
};

/**
 * Initialize a new game session
 * @param {string} mode - Game mode ('easy', 'medium', 'hard', 'exam')
 * @param {number} questionCount - Number of questions (default varies by mode)
 */
function initializeGame(mode, questionCount) {
    // Reset state
    gameState.mode = mode;
    gameState.currentIndex = 0;
    gameState.answers = [];
    gameState.notes = '';
    gameState.phase = 'idle';
    gameState.currentOutsideAnswer = null;

    // Set default question count by mode
    const defaultCounts = {
        easy: 20,
        medium: 20,
        hard: 20,
        exam: 50
    };
    const count = questionCount ?? defaultCounts[mode] ?? 20;

    // Generate questions based on mode
    switch (mode) {
        case 'easy':
            gameState.questions = Array.from({ length: count }, () => generateEasyQuestion());
            break;
        case 'medium':
            gameState.questions = Array.from({ length: count }, () => generateMediumQuestion());
            break;
        case 'hard':
            gameState.questions = Array.from({ length: count }, () => generateHardQuestion());
            break;
        case 'exam':
            gameState.questions = generateExamQuestions(count);
            break;
        default:
            throw new Error(`Unknown mode: ${mode}`);
    }

    // Start timers
    gameState.timer.sessionStart = Date.now();
    gameState.timer.questionStart = Date.now();
    gameState.phase = 'playing';

    return getCurrentQuestion();
}

/**
 * Get current question
 * @returns {object|null} Current question or null if finished
 */
function getCurrentQuestion() {
    if (gameState.currentIndex >= gameState.questions.length) {
        return null;
    }
    return gameState.questions[gameState.currentIndex];
}

/**
 * Submit outside bet answer (first step)
 * @param {number} answer - User's answer for outside bets
 * @returns {boolean} Whether to proceed to inside answer
 */
function submitOutsideAnswer(answer) {
    gameState.currentOutsideAnswer = parseInt(answer) || 0;
    gameState.phase = 'awaitingInside';
    return true;
}

/**
 * Submit inside bet answer and complete the question
 * @param {number} answer - User's answer for inside bets
 * @returns {object} Validation result
 */
function submitInsideAnswer(answer) {
    const question = getCurrentQuestion();
    if (!question) return null;

    const userInside = parseInt(answer) || 0;
    const userOutside = gameState.currentOutsideAnswer ?? 0;

    // Calculate time for this question
    const questionTime = (Date.now() - gameState.timer.questionStart) / 1000;

    // Validate answer
    const validation = validateAnswer(userOutside, userInside, question);

    // Store answer
    gameState.answers.push({
        question,
        userAnswer: {
            outside: userOutside,
            inside: userInside
        },
        validation,
        time: questionTime
    });

    gameState.phase = 'result';
    gameState.currentOutsideAnswer = null;

    return validation;
}

/**
 * Move to next question
 * @returns {object|null} Next question or null if finished
 */
function nextQuestion() {
    gameState.currentIndex++;
    gameState.timer.questionStart = Date.now();
    gameState.phase = 'playing';

    const question = getCurrentQuestion();
    if (!question) {
        gameState.phase = 'finished';
        // Save stats when session ends
        saveSessionToStorage();
    }

    return question;
}

/**
 * Check if session is finished
 * @returns {boolean}
 */
function isSessionFinished() {
    return gameState.phase === 'finished' ||
           gameState.currentIndex >= gameState.questions.length;
}

/**
 * Get session progress
 * @returns {object} Progress info
 */
function getProgress() {
    return {
        current: gameState.currentIndex + 1,
        total: gameState.questions.length,
        correct: gameState.answers.filter(a => a.validation.allCorrect).length,
        percentage: Math.round((gameState.currentIndex / gameState.questions.length) * 100)
    };
}

/**
 * Get elapsed time since session start
 * @returns {number} Time in seconds
 */
function getSessionTime() {
    if (!gameState.timer.sessionStart) return 0;
    return (Date.now() - gameState.timer.sessionStart) / 1000;
}

/**
 * Get elapsed time for current question
 * @returns {number} Time in seconds
 */
function getQuestionTime() {
    if (!gameState.timer.questionStart) return 0;
    return (Date.now() - gameState.timer.questionStart) / 1000;
}

/**
 * Get/set notes
 */
function getNotes() {
    return gameState.notes;
}

function setNotes(notes) {
    gameState.notes = notes;
}

/**
 * Check if notes should be shown for current mode
 * @returns {boolean}
 */
function shouldShowNotes() {
    return gameState.mode === 'easy' || gameState.mode === 'medium';
}

/**
 * Get current game state (for UI)
 * @returns {object} Current state snapshot
 */
function getState() {
    return {
        mode: gameState.mode,
        phase: gameState.phase,
        currentIndex: gameState.currentIndex,
        totalQuestions: gameState.questions.length,
        currentQuestion: getCurrentQuestion(),
        progress: getProgress(),
        sessionTime: getSessionTime(),
        questionTime: getQuestionTime(),
        showNotes: shouldShowNotes(),
        notes: gameState.notes
    };
}

/**
 * Get all answers for results display
 * @returns {array}
 */
function getAnswers() {
    return [...gameState.answers];
}

/**
 * Get session results
 * @returns {object} Session results with stats
 */
function getSessionResults() {
    const totalTime = getSessionTime();
    const answers = getAnswers();

    let correct = 0;
    let outsideCorrect = 0;
    let insideCorrect = 0;

    for (const answer of answers) {
        if (answer.validation.allCorrect) correct++;
        if (answer.validation.outsideCorrect) outsideCorrect++;
        if (answer.validation.insideCorrect) insideCorrect++;
    }

    const avgTime = answers.length > 0 ?
        answers.reduce((sum, a) => sum + a.time, 0) / answers.length : 0;

    return {
        mode: gameState.mode,
        totalQuestions: gameState.questions.length,
        correct,
        outsideCorrect,
        insideCorrect,
        totalTime,
        averageTime: avgTime,
        answers,
        accuracy: answers.length > 0 ? (correct / answers.length * 100).toFixed(1) : 0
    };
}

/**
 * Save session stats to localStorage
 */
function saveSessionToStorage() {
    const results = getSessionResults();
    saveSessionStats(results);
}

/**
 * Reset game state
 */
function resetGame() {
    gameState.mode = null;
    gameState.questions = [];
    gameState.currentIndex = 0;
    gameState.answers = [];
    gameState.timer.questionStart = null;
    gameState.timer.sessionStart = null;
    gameState.notes = '';
    gameState.phase = 'idle';
    gameState.currentOutsideAnswer = null;
}

export {
    initializeGame,
    getCurrentQuestion,
    submitOutsideAnswer,
    submitInsideAnswer,
    nextQuestion,
    isSessionFinished,
    getProgress,
    getSessionTime,
    getQuestionTime,
    getNotes,
    setNotes,
    shouldShowNotes,
    getState,
    getAnswers,
    getSessionResults,
    resetGame
};
