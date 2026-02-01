// =====================================================
// RENDER RESULTS - End of session results display
// =====================================================

import { generateErrorBreakdown } from '../core/answer-validator.js';
import { formatTime } from './render-timer.js';
import { getNumberColor } from './render-table.js';

/**
 * Render session results
 * @param {object} results - Session results object
 */
function renderResults(results) {
    const container = document.getElementById('results-container');
    if (!container) return;

    const {
        mode,
        totalQuestions,
        correct,
        outsideCorrect,
        insideCorrect,
        totalTime,
        averageTime,
        answers,
        accuracy
    } = results;

    const grade = getGrade(accuracy);
    const gradeClass = getGradeClass(accuracy);

    let html = `
        <div class="results-header">
            <h1>Session Complete</h1>
            <p class="subtitle">${getModeLabel(mode)} Mode - ${totalQuestions} Questions</p>
        </div>

        <div class="score-card">
            <div class="score-main">${correct}/${totalQuestions}</div>
            <div class="score-label">Questions Correct</div>
            <div class="score-grade ${gradeClass}">${grade}</div>

            <div class="stats-grid">
                <div class="stat-box highlight">
                    <div class="value">${accuracy}%</div>
                    <div class="label">Accuracy</div>
                </div>
                <div class="stat-box">
                    <div class="value">${outsideCorrect}/${totalQuestions}</div>
                    <div class="label">Outside Correct</div>
                </div>
                <div class="stat-box">
                    <div class="value">${insideCorrect}/${totalQuestions}</div>
                    <div class="label">Inside Correct</div>
                </div>
                <div class="stat-box">
                    <div class="value">${formatTime(totalTime)}</div>
                    <div class="label">Total Time</div>
                </div>
                <div class="stat-box">
                    <div class="value">${formatTime(averageTime)}</div>
                    <div class="label">Avg per Question</div>
                </div>
            </div>
        </div>
    `;

    // Error analysis if there were mistakes
    const incorrectAnswers = answers.filter(a => !a.validation.allCorrect);
    if (incorrectAnswers.length > 0) {
        html += renderErrorAnalysis(incorrectAnswers);
    }

    // Detailed breakdown
    html += renderQuestionBreakdown(answers);

    // Actions
    html += `
        <div class="results-actions">
            <button class="btn btn-primary btn-lg" id="results-restart">Try Again</button>
            <button class="btn btn-secondary btn-lg" id="results-menu">Back to Menu</button>
        </div>
    `;

    container.innerHTML = html;

    // Setup expansion listeners
    setupBreakdownListeners();
}

/**
 * Render error analysis section
 * @param {array} incorrectAnswers - Array of incorrect answer objects
 * @returns {string} HTML
 */
function renderErrorAnalysis(incorrectAnswers) {
    // Count error types
    const errorTypes = {
        outside: 0,
        inside: 0
    };

    for (const answer of incorrectAnswers) {
        if (!answer.validation.outsideCorrect) errorTypes.outside++;
        if (!answer.validation.insideCorrect) errorTypes.inside++;
    }

    const total = incorrectAnswers.length;

    return `
        <div class="error-analysis">
            <h2>Error Analysis</h2>
            <div class="error-type-item">
                <span>Outside Bet Errors</span>
                <div class="error-bar">
                    <div class="error-fill" style="width: ${(errorTypes.outside / total * 100)}%"></div>
                </div>
                <span>${errorTypes.outside}</span>
            </div>
            <div class="error-type-item">
                <span>Inside Bet Errors</span>
                <div class="error-bar">
                    <div class="error-fill" style="width: ${(errorTypes.inside / total * 100)}%"></div>
                </div>
                <span>${errorTypes.inside}</span>
            </div>
        </div>
    `;
}

/**
 * Render question breakdown section
 * @param {array} answers - All answer objects
 * @returns {string} HTML
 */
function renderQuestionBreakdown(answers) {
    let html = `
        <div class="breakdown-section">
            <h2>Question Breakdown</h2>
            <div class="filter-tabs">
                <button class="filter-tab active" data-filter="all">All</button>
                <button class="filter-tab" data-filter="correct">Correct</button>
                <button class="filter-tab" data-filter="incorrect">Incorrect</button>
            </div>
            <div class="question-breakdown">
    `;

    for (let i = 0; i < answers.length; i++) {
        const answer = answers[i];
        const isCorrect = answer.validation.allCorrect;
        const winningNumber = answer.question.winningNumber;
        const color = getNumberColor(winningNumber);

        html += `
            <div class="question-item ${isCorrect ? 'correct' : 'incorrect'}" data-correct="${isCorrect}">
                <div class="question-summary">
                    <span class="question-number">#${i + 1}</span>
                    <span class="question-winning">
                        <span class="mini-number ${color}">${winningNumber}</span>
                    </span>
                    <div class="question-answers">
                        <span class="answer-pair">
                            <span class="label">Out:</span>
                            <span class="user-value ${answer.validation.outsideCorrect ? 'correct-value' : 'incorrect-value'}">
                                ${answer.userAnswer.outside}
                            </span>
                            ${!answer.validation.outsideCorrect ? `<span class="correct-value">(${answer.validation.correctOutside})</span>` : ''}
                        </span>
                        <span class="answer-pair">
                            <span class="label">In:</span>
                            <span class="user-value ${answer.validation.insideCorrect ? 'correct-value' : 'incorrect-value'}">
                                ${answer.userAnswer.inside}
                            </span>
                            ${!answer.validation.insideCorrect ? `<span class="correct-value">(${answer.validation.correctInside})</span>` : ''}
                        </span>
                    </div>
                    <span class="question-time">${formatTime(answer.time)}</span>
                    <span class="question-status">${isCorrect ? '&#10003;' : '&#10007;'}</span>
                    <span class="expand-icon">&#9662;</span>
                </div>
                <div class="question-detail">
                    ${renderQuestionDetail(answer)}
                </div>
            </div>
        `;
    }

    html += `
            </div>
        </div>
    `;

    return html;
}

/**
 * Render detailed breakdown for a question
 * @param {object} answer - Answer object
 * @returns {string} HTML
 */
function renderQuestionDetail(answer) {
    const breakdown = generateErrorBreakdown(answer.question, answer.userAnswer);

    let html = '<div class="detail-bets">';

    // Outside bets
    if (breakdown.outsideBets.length > 0) {
        html += '<h4>Outside Bets</h4><div class="detail-bet-list">';
        for (const bet of breakdown.outsideBets) {
            html += `
                <div class="detail-bet ${bet.wins ? 'winner' : 'loser'}">
                    <span>${bet.description}</span>
                    <span class="bet-calc">${bet.calculation}</span>
                    <span class="bet-payout ${bet.payout === 0 ? 'zero' : ''}">${bet.payout}</span>
                </div>
            `;
        }
        html += `</div><div class="detail-total">Total Outside: ${breakdown.outsideTotal}</div>`;
    }

    // Inside bets
    if (breakdown.insideBets.length > 0) {
        html += '<h4>Inside Bets</h4><div class="detail-bet-list">';
        for (const bet of breakdown.insideBets) {
            html += `
                <div class="detail-bet ${bet.wins ? 'winner' : 'loser'}">
                    <span>${bet.description}</span>
                    <span class="bet-calc">${bet.calculation}</span>
                    <span class="bet-payout ${bet.payout === 0 ? 'zero' : ''}">${bet.payout}</span>
                </div>
            `;
        }
        html += `</div><div class="detail-total">Total Inside: ${breakdown.insideTotal}</div>`;
    }

    html += '</div>';
    return html;
}

/**
 * Setup event listeners for breakdown expansion
 */
function setupBreakdownListeners() {
    // Question expansion
    const summaries = document.querySelectorAll('.question-summary');
    summaries.forEach(summary => {
        summary.addEventListener('click', () => {
            const item = summary.closest('.question-item');
            item.classList.toggle('expanded');
        });
    });

    // Filter tabs
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Filter items
            const filter = tab.dataset.filter;
            const items = document.querySelectorAll('.question-item');

            items.forEach(item => {
                const isCorrect = item.dataset.correct === 'true';

                if (filter === 'all') {
                    item.style.display = '';
                } else if (filter === 'correct') {
                    item.style.display = isCorrect ? '' : 'none';
                } else if (filter === 'incorrect') {
                    item.style.display = !isCorrect ? '' : 'none';
                }
            });
        });
    });
}

/**
 * Get grade based on accuracy
 * @param {number} accuracy - Accuracy percentage
 * @returns {string}
 */
function getGrade(accuracy) {
    if (accuracy >= 95) return 'Excellent!';
    if (accuracy >= 80) return 'Good Job!';
    if (accuracy >= 60) return 'Needs Practice';
    return 'Keep Trying';
}

/**
 * Get grade CSS class
 * @param {number} accuracy - Accuracy percentage
 * @returns {string}
 */
function getGradeClass(accuracy) {
    if (accuracy >= 95) return 'excellent';
    if (accuracy >= 80) return 'good';
    if (accuracy >= 60) return 'needs-work';
    return 'poor';
}

/**
 * Get mode display label
 * @param {string} mode - Mode ID
 * @returns {string}
 */
function getModeLabel(mode) {
    const labels = {
        easy: 'Easy',
        medium: 'Medium',
        hard: 'Hard',
        exam: 'Exam'
    };
    return labels[mode] || mode;
}

export { renderResults };
