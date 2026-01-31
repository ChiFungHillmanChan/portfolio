/**
 * Easy Mode - Flash Card Training
 */

const EasyMode = {
    // State
    pacing: 'auto',
    isRunning: false,
    timer: null,
    autoTimer: null,

    // Session data
    cardsCount: 0,
    correctCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    currentCard: null,
    currentSpeed: EASY_MODE_CONFIG.initialSpeed,
    consecutiveCorrect: 0,

    // DOM elements
    elements: {},

    init() {
        this.cacheElements();
        this.bindEvents();
        this.showScreen('setup');
    },

    cacheElements() {
        this.elements = {
            setupScreen: document.getElementById('setup-screen'),
            gameScreen: document.getElementById('game-screen'),
            resultsScreen: document.getElementById('results-screen'),
            startBtn: document.getElementById('start-btn'),
            retryBtn: document.getElementById('retry-btn'),
            timerDisplay: document.getElementById('timer-display'),
            scoreDisplay: document.getElementById('score-display'),
            streakDisplay: document.getElementById('streak-display'),
            cardDisplay: document.getElementById('card-display'),
            feedbackDisplay: document.getElementById('feedback-display'),
            speedIndicator: document.getElementById('speed-indicator'),
            speedValue: document.getElementById('speed-value'),
            answerBtns: document.querySelectorAll('.answer-btn'),
            pacingBtns: document.querySelectorAll('.pacing-btn')
        };
    },

    bindEvents() {
        // Pacing selection
        this.elements.pacingBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.pacingBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.pacing = btn.dataset.pacing;
            });
        });

        // Start button
        this.elements.startBtn.addEventListener('click', () => this.startGame());

        // Answer buttons
        this.elements.answerBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isRunning && this.currentCard) {
                    this.handleAnswer(parseInt(btn.dataset.value));
                }
            });
        });

        // Retry button
        this.elements.retryBtn.addEventListener('click', () => {
            this.showScreen('setup');
        });

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (!this.isRunning || !this.currentCard) return;

            if (e.key === '1' || e.key === '+') this.handleAnswer(1);
            else if (e.key === '0') this.handleAnswer(0);
            else if (e.key === '-' || e.key === '2') this.handleAnswer(-1);
        });
    },

    showScreen(screen) {
        this.elements.setupScreen.classList.remove('active');
        this.elements.gameScreen.classList.remove('active');
        this.elements.resultsScreen.classList.remove('active');

        if (screen === 'setup') this.elements.setupScreen.classList.add('active');
        else if (screen === 'game') this.elements.gameScreen.classList.add('active');
        else if (screen === 'results') this.elements.resultsScreen.classList.add('active');
    },

    startGame() {
        // Reset state
        this.cardsCount = 0;
        this.correctCount = 0;
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.currentCard = null;
        this.currentSpeed = EASY_MODE_CONFIG.initialSpeed;
        this.consecutiveCorrect = 0;
        this.isRunning = true;

        // Update UI
        this.updateScore();
        this.updateStreak();
        this.updateSpeedDisplay();
        this.elements.feedbackDisplay.textContent = '';
        this.elements.feedbackDisplay.className = 'feedback-display';

        // Show/hide speed indicator based on pacing
        this.elements.speedIndicator.style.display =
            this.pacing === 'auto' ? 'block' : 'none';

        // Show game screen
        this.showScreen('game');

        // Start timer
        this.timer = new CountdownTimer({
            duration: EASY_MODE_CONFIG.sessionDuration,
            onTick: (data) => {
                this.elements.timerDisplay.textContent = data.seconds;
            },
            onComplete: () => this.endGame()
        });
        this.timer.start();

        // Deal first card
        this.dealCard();
    },

    dealCard() {
        if (!this.isRunning) return;

        // Clear auto timer
        if (this.autoTimer) {
            clearTimeout(this.autoTimer);
            this.autoTimer = null;
        }

        // Generate random card
        const rank = CARD_RANKS[Math.floor(Math.random() * CARD_RANKS.length)];
        const suit = CARD_SUITS[Math.floor(Math.random() * CARD_SUITS.length)];

        this.currentCard = {
            rank: rank,
            suit: suit,
            value: HI_LO_VALUES[rank]
        };

        // Update display
        this.renderCard();

        // Auto-deal timer
        if (this.pacing === 'auto') {
            this.autoTimer = setTimeout(() => {
                if (this.isRunning && this.currentCard) {
                    // Time ran out - count as wrong
                    this.handleAnswer(null);
                }
            }, this.currentSpeed);
        }
    },

    renderCard() {
        const card = this.currentCard;
        const cardEl = this.elements.cardDisplay;

        // Add flip animation
        cardEl.classList.add('flip');

        setTimeout(() => {
            // Update card content
            const rankEl = cardEl.querySelector('.card-rank');
            const suitEl = cardEl.querySelector('.card-suit');

            rankEl.textContent = card.rank;
            suitEl.textContent = this.getSuitSymbol(card.suit);

            // Set color
            cardEl.classList.remove('red');
            if (card.suit === 'hearts' || card.suit === 'diamonds') {
                cardEl.classList.add('red');
            }

            cardEl.classList.remove('flip');
        }, 150);
    },

    getSuitSymbol(suit) {
        const symbols = {
            spades: '♠',
            hearts: '♥',
            diamonds: '♦',
            clubs: '♣'
        };
        return symbols[suit] || '';
    },

    handleAnswer(answer) {
        if (!this.currentCard) return;

        const correct = answer === this.currentCard.value;
        this.cardsCount++;

        if (correct) {
            this.correctCount++;
            this.currentStreak++;
            this.consecutiveCorrect++;
            this.bestStreak = Math.max(this.bestStreak, this.currentStreak);

            // Speed up on consecutive correct (auto mode only)
            if (this.pacing === 'auto' &&
                this.consecutiveCorrect >= EASY_MODE_CONFIG.correctStreakForSpeedup) {
                this.currentSpeed = Math.max(
                    EASY_MODE_CONFIG.minSpeed,
                    this.currentSpeed - EASY_MODE_CONFIG.speedDecrement
                );
                this.consecutiveCorrect = 0;
                this.updateSpeedDisplay();
            }

            this.showFeedback('correct', '✓ Correct!');
        } else {
            this.currentStreak = 0;
            this.consecutiveCorrect = 0;

            // Reset speed on wrong answer (auto mode)
            if (this.pacing === 'auto') {
                this.currentSpeed = EASY_MODE_CONFIG.initialSpeed;
                this.updateSpeedDisplay();
            }

            const correctValue = this.currentCard.value > 0 ? '+1' :
                                 this.currentCard.value < 0 ? '-1' : '0';
            this.showFeedback('wrong', `✗ Was ${correctValue}`);
        }

        this.updateScore();
        this.updateStreak();
        this.currentCard = null;

        // Deal next card after brief delay
        setTimeout(() => this.dealCard(), 300);
    },

    showFeedback(type, message) {
        this.elements.feedbackDisplay.textContent = message;
        this.elements.feedbackDisplay.className = 'feedback-display ' + type;
    },

    updateScore() {
        this.elements.scoreDisplay.textContent =
            `${this.correctCount}/${this.cardsCount}`;
    },

    updateStreak() {
        this.elements.streakDisplay.textContent = this.currentStreak;
    },

    updateSpeedDisplay() {
        this.elements.speedValue.textContent =
            (this.currentSpeed / 1000).toFixed(2) + 's';
    },

    endGame() {
        this.isRunning = false;

        if (this.autoTimer) {
            clearTimeout(this.autoTimer);
            this.autoTimer = null;
        }

        // Calculate results
        const accuracy = this.cardsCount > 0
            ? (this.correctCount / this.cardsCount * 100).toFixed(1)
            : 0;

        // Update results display
        document.getElementById('result-cards').textContent = this.cardsCount;
        document.getElementById('result-correct').textContent = this.correctCount;
        document.getElementById('result-accuracy').textContent = accuracy + '%';
        document.getElementById('result-streak').textContent = this.bestStreak;

        // Save session
        PracticeStats.saveSession(PRACTICE_MODES.EASY, {
            cardsCount: this.cardsCount,
            correctCount: this.correctCount,
            bestStreak: this.bestStreak,
            pacing: this.pacing,
            maxSpeedReached: this.pacing === 'auto' ? this.currentSpeed : null
        });

        // Show results
        this.showScreen('results');
    }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => EasyMode.init());
