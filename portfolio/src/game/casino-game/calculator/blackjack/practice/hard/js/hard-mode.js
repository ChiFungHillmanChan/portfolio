/**
 * Hard Mode - Full Table with Auto-Deal and 5-Second Timer
 * 
 * Cards are automatically dealt to all 5 seats (4 AI + 1 player).
 * AI players auto-play using BasicStrategy. User verifies running count
 * within 5 seconds at the end of each round.
 */

const HardMode = {
    // Game state
    phase: 'waiting', // waiting, dealing, ai_turn, player_turn, dealer_turn, count_check
    currentSeat: 0,
    runningCount: 0,
    cardsDealtThisRound: [],
    isDealing: false,

    // Configuration
    dealSpeed: 400, // ms between cards (faster for full table)
    aiPlaySpeed: 600, // ms between AI decisions

    // Session stats
    roundsPlayed: 0,
    countChecks: 0,
    countCorrect: 0,
    timeouts: 0,
    totalCardsDealt: 0,

    // Seats state (0-3 = AI, 4 = Player)
    seats: [],
    dealerCards: [],
    dealerHoleCard: null,

    // Timer
    countdownTimer: null,

    // DOM elements
    elements: {},

    init() {
        this.cacheElements();
        this.bindEvents();
        this.updateStats();
        this.elements.shoeStatus.textContent = 'Click "New Shoe" to start';
    },

    cacheElements() {
        this.elements = {
            shoeStatus: document.getElementById('shoe-status'),
            dealerCards: document.getElementById('dealer-cards'),
            dealerTotal: document.getElementById('dealer-total'),
            handsPlayed: document.getElementById('hands-played'),
            countAccuracy: document.getElementById('count-accuracy'),
            timeoutCount: document.getElementById('timeout-count'),
            cardsDealt: document.getElementById('cards-dealt'),
            // Action buttons
            btnHit: document.getElementById('btn-hit'),
            btnStand: document.getElementById('btn-stand'),
            btnDouble: document.getElementById('btn-double'),
            btnSplit: document.getElementById('btn-split'),
            btnNewRound: document.getElementById('btn-new-round'),
            btnNewShoe: document.getElementById('btn-new-shoe'),
            // Modals
            countModal: document.getElementById('count-modal'),
            countInput: document.getElementById('count-input'),
            timerCircle: document.getElementById('timer-circle'),
            timerSeconds: document.getElementById('timer-seconds'),
            submitCount: document.getElementById('submit-count'),
            resultModal: document.getElementById('result-modal'),
            resultIcon: document.getElementById('result-icon'),
            resultTitle: document.getElementById('result-title'),
            resultMessage: document.getElementById('result-message'),
            cardReplay: document.getElementById('card-replay'),
            replayCards: document.getElementById('replay-cards'),
            continueBtn: document.getElementById('continue-btn'),
            sessionModal: document.getElementById('session-modal'),
            playAgainBtn: document.getElementById('play-again-btn')
        };

        // Cache seat elements
        for (let i = 0; i < 5; i++) {
            this.elements[`seat${i}Cards`] = document.getElementById(`seat-${i}-cards`);
            this.elements[`seat${i}Total`] = document.getElementById(`seat-${i}-total`);
            this.elements[`seat${i}Action`] = document.getElementById(`seat-${i}-action`);
        }
    },

    bindEvents() {
        // Action buttons
        this.elements.btnHit.addEventListener('click', () => this.playerAction('hit'));
        this.elements.btnStand.addEventListener('click', () => this.playerAction('stand'));
        this.elements.btnDouble.addEventListener('click', () => this.playerAction('double'));
        this.elements.btnSplit.addEventListener('click', () => this.playerAction('split'));

        // Game controls
        this.elements.btnNewRound.addEventListener('click', () => this.startNewRound());
        this.elements.btnNewShoe.addEventListener('click', () => this.startNewShoe());

        // Count modal
        document.querySelectorAll('.count-adjust').forEach(btn => {
            btn.addEventListener('click', () => {
                const adjust = parseInt(btn.dataset.adjust);
                this.elements.countInput.value = parseInt(this.elements.countInput.value || 0) + adjust;
            });
        });
        this.elements.submitCount.addEventListener('click', () => this.submitCount());
        this.elements.countInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.submitCount();
        });

        // Result modal
        this.elements.continueBtn.addEventListener('click', () => this.closeResultModal());

        // Session modal
        this.elements.playAgainBtn.addEventListener('click', () => {
            this.elements.sessionModal.classList.remove('active');
            this.startNewShoe();
        });
    },

    startNewShoe() {
        Shoe.init(6, 75); // 6 decks, 75% penetration
        this.runningCount = 0;
        this.roundsPlayed = 0;
        this.countChecks = 0;
        this.countCorrect = 0;
        this.timeouts = 0;
        this.totalCardsDealt = 0;
        this.updateStats();
        this.updateShoeStatus();
        this.phase = 'waiting';
        this.clearTable();
        this.elements.shoeStatus.textContent = 'Ready - Click "Deal Round"';
        this.elements.btnNewRound.disabled = false;
    },

    async startNewRound() {
        if (this.isDealing) return;

        // Check if shoe needs reshuffle
        if (Shoe.needsReshuffle()) {
            this.showReshuffleMessage();
            return;
        }

        // Initialize seats
        this.seats = [];
        for (let i = 0; i < 5; i++) {
            this.seats.push({
                cards: [],
                isStanding: false,
                isBust: false
            });
        }
        this.dealerCards = [];
        this.dealerHoleCard = null;
        this.cardsDealtThisRound = [];
        this.currentSeat = 0;
        this.phase = 'dealing';
        this.isDealing = true;

        this.clearTable();
        this.elements.btnNewRound.disabled = true;
        this.updateActionButtons();

        // Auto-deal initial cards to all seats
        await this.autoDealAllSeats();
    },

    clearTable() {
        for (let i = 0; i < 5; i++) {
            this.elements[`seat${i}Cards`].innerHTML = '';
            this.elements[`seat${i}Total`].textContent = '';
            this.elements[`seat${i}Action`].textContent = '';
            document.querySelector(`.seat[data-seat="${i}"]`).classList.remove('active');
        }
        this.elements.dealerCards.innerHTML = '';
        this.elements.dealerTotal.textContent = '';
    },

    /**
     * Auto-deal initial 2 cards to all 5 seats + dealer
     * Order: S1, S2, S3, S4, S5, Dealer(hole), S1, S2, S3, S4, S5, Dealer(up)
     */
    async autoDealAllSeats() {
        const delay = ms => new Promise(r => setTimeout(r, ms));

        // First card to each seat
        for (let i = 0; i < 5; i++) {
            await this.dealCardToSeat(i);
            await delay(this.dealSpeed);
        }

        // Dealer hole card
        this.dealerHoleCard = Shoe.drawCard();
        this.trackCard(this.dealerHoleCard);
        this.renderTable();
        await delay(this.dealSpeed);

        // Second card to each seat
        for (let i = 0; i < 5; i++) {
            await this.dealCardToSeat(i);
            await delay(this.dealSpeed);
        }

        // Dealer up card
        await this.dealCardToDealer();

        this.isDealing = false;
        this.updateShoeStatus();

        // Start AI turns
        this.phase = 'ai_turn';
        this.currentSeat = 0;
        await this.processAISeats();
    },

    /**
     * Deal a card to a specific seat
     */
    async dealCardToSeat(seatIndex) {
        const card = Shoe.drawCard();
        if (!card) return;

        this.seats[seatIndex].cards.push(card);
        this.trackCard(card);
        this.renderTable();
    },

    /**
     * Deal a card to the dealer (face up)
     */
    async dealCardToDealer() {
        const card = Shoe.drawCard();
        if (!card) return;

        this.dealerCards.push(card);
        this.trackCard(card);
        this.renderTable();
    },

    /**
     * Track a dealt card for counting
     */
    trackCard(card) {
        const countValue = HI_LO_VALUES[card.rank];
        this.runningCount += countValue;
        this.totalCardsDealt++;
        this.cardsDealtThisRound.push({ ...card, countValue });
    },

    /**
     * Process all AI seats (0-3) automatically
     */
    async processAISeats() {
        const delay = ms => new Promise(r => setTimeout(r, ms));

        for (let i = 0; i < 4; i++) {
            this.currentSeat = i;
            this.highlightSeat(i);
            await this.autoPlayAISeat(i);
            await delay(this.aiPlaySpeed);
        }

        // Move to player turn
        this.currentSeat = 4;
        this.phase = 'player_turn';
        this.highlightSeat(4);
        this.updateActionButtons();
    },

    /**
     * Auto-play a single AI seat using BasicStrategy
     */
    async autoPlayAISeat(seatIndex) {
        const delay = ms => new Promise(r => setTimeout(r, ms));
        const seat = this.seats[seatIndex];

        while (!seat.isStanding && !seat.isBust) {
            const eval_ = HandEvaluation.evaluateHand(seat.cards);

            // Check for bust
            if (eval_.isBust) {
                seat.isBust = true;
                this.showSeatAction(seatIndex, 'BUST');
                break;
            }

            // Check for 21
            if (eval_.total === 21) {
                seat.isStanding = true;
                this.showSeatAction(seatIndex, '21');
                break;
            }

            // Get AI decision
            const dealerUpcard = this.dealerCards[0]?.rank || 'A';
            const decision = BasicStrategy.getOptimalAction(seat.cards, dealerUpcard);

            if (decision.action === 'S') {
                seat.isStanding = true;
                this.showSeatAction(seatIndex, 'STAND');
            } else if (decision.action === 'H') {
                this.showSeatAction(seatIndex, 'HIT');
                await delay(this.aiPlaySpeed);
                await this.dealCardToSeat(seatIndex);
            } else if (decision.action === 'D') {
                this.showSeatAction(seatIndex, 'DOUBLE');
                await delay(this.aiPlaySpeed);
                await this.dealCardToSeat(seatIndex);
                seat.isStanding = true;
            } else if (decision.action === 'P') {
                // Simplified: treat split as hit for practice
                this.showSeatAction(seatIndex, 'HIT');
                await delay(this.aiPlaySpeed);
                await this.dealCardToSeat(seatIndex);
            }

            this.updateShoeStatus();
        }
    },

    showSeatAction(seatIndex, action) {
        this.elements[`seat${seatIndex}Action`].textContent = action;
    },

    highlightSeat(seatIndex) {
        for (let i = 0; i < 5; i++) {
            document.querySelector(`.seat[data-seat="${i}"]`).classList.remove('active');
        }
        document.querySelector(`.seat[data-seat="${seatIndex}"]`).classList.add('active');
    },

    async playerAction(action) {
        if (this.phase !== 'player_turn' || this.isDealing) return;

        const seat = this.seats[4];

        if (action === 'stand') {
            seat.isStanding = true;
            this.showSeatAction(4, 'STAND');
            await this.startDealerTurn();
        } else if (action === 'hit') {
            this.showSeatAction(4, 'HIT');
            this.isDealing = true;
            await this.dealCardToSeat(4);
            this.isDealing = false;

            const eval_ = HandEvaluation.evaluateHand(seat.cards);
            if (eval_.isBust) {
                seat.isBust = true;
                this.showSeatAction(4, 'BUST');
                await this.startDealerTurn();
            } else if (eval_.total === 21) {
                await this.playerAction('stand');
            }
        } else if (action === 'double') {
            this.showSeatAction(4, 'DOUBLE');
            this.isDealing = true;
            await this.dealCardToSeat(4);
            this.isDealing = false;

            const eval_ = HandEvaluation.evaluateHand(seat.cards);
            if (eval_.isBust) {
                seat.isBust = true;
                this.showSeatAction(4, 'BUST');
            } else {
                seat.isStanding = true;
            }
            await this.startDealerTurn();
        }

        this.updateActionButtons();
        this.updateShoeStatus();
    },

    updateActionButtons() {
        const isPlayerTurn = this.phase === 'player_turn' && !this.isDealing;
        const playerCards = this.seats[4]?.cards || [];
        const canDouble = isPlayerTurn && playerCards.length === 2;
        const eval_ = playerCards.length > 0 ? HandEvaluation.evaluateHand(playerCards) : null;
        const canSplit = canDouble && eval_ && eval_.isPair;

        this.elements.btnHit.disabled = !isPlayerTurn;
        this.elements.btnStand.disabled = !isPlayerTurn;
        this.elements.btnDouble.disabled = !canDouble;
        this.elements.btnSplit.disabled = !canSplit;
    },

    async startDealerTurn() {
        this.phase = 'dealer_turn';
        this.revealHoleCard();
        this.updateActionButtons();
        await this.autoDealDealer();
    },

    revealHoleCard() {
        if (this.dealerHoleCard) {
            this.dealerCards.unshift(this.dealerHoleCard);
            this.dealerHoleCard = null;
            this.renderTable();
        }
    },

    /**
     * Auto-deal dealer cards until 17+
     */
    async autoDealDealer() {
        const delay = ms => new Promise(r => setTimeout(r, ms));
        this.isDealing = true;

        while (true) {
            const eval_ = HandEvaluation.evaluateHand(this.dealerCards);

            if (eval_.isBust || eval_.total >= 17) {
                break;
            }

            await delay(this.dealSpeed);
            await this.dealCardToDealer();
        }

        this.isDealing = false;
        this.updateShoeStatus();

        // Round complete, show count check
        this.roundsPlayed++;
        this.showCountCheck();
    },

    showCountCheck() {
        this.phase = 'count_check';
        this.elements.countInput.value = '0';
        this.elements.timerCircle.classList.remove('warning');
        this.elements.timerSeconds.textContent = '5';
        this.elements.countModal.classList.add('active');
        this.elements.countInput.focus();

        // Start 5-second countdown
        this.countdownTimer = new QuickCountdown({
            duration: 5,
            onTick: (remaining) => {
                this.elements.timerSeconds.textContent = remaining;
                if (remaining <= 2) {
                    this.elements.timerCircle.classList.add('warning');
                }
            },
            onComplete: () => {
                this.handleTimeout();
            }
        });
        this.countdownTimer.start();
    },

    submitCount() {
        if (this.countdownTimer) {
            this.countdownTimer.stop();
        }

        const userCount = parseInt(this.elements.countInput.value) || 0;
        const isCorrect = userCount === this.runningCount;

        this.countChecks++;
        if (isCorrect) this.countCorrect++;

        this.elements.countModal.classList.remove('active');
        this.showResult(isCorrect ? 'correct' : 'wrong', userCount);
    },

    handleTimeout() {
        this.countChecks++;
        this.timeouts++;
        this.elements.countModal.classList.remove('active');
        this.showResult('timeout', null);
    },

    showResult(resultType, userCount) {
        this.elements.resultIcon.className = 'result-icon ' + resultType;

        if (resultType === 'correct') {
            this.elements.resultTitle.textContent = 'Correct!';
            this.elements.resultMessage.textContent = `Running count is ${this.runningCount}`;
            this.elements.cardReplay.classList.remove('show');
        } else if (resultType === 'wrong') {
            this.elements.resultTitle.textContent = 'Incorrect';
            this.elements.resultMessage.textContent = `You answered ${userCount}, correct is ${this.runningCount}`;
            this.elements.cardReplay.classList.add('show');
            this.renderCardReplay();
        } else {
            this.elements.resultTitle.textContent = 'Time\'s Up!';
            this.elements.resultMessage.textContent = `The running count was ${this.runningCount}`;
            this.elements.cardReplay.classList.add('show');
            this.renderCardReplay();
        }

        this.elements.resultModal.classList.add('active');
        this.updateStats();
    },

    renderCardReplay() {
        this.elements.replayCards.innerHTML = '';

        this.cardsDealtThisRound.forEach(card => {
            const div = document.createElement('div');
            div.className = 'replay-card';

            const rankSpan = document.createElement('span');
            rankSpan.className = 'card-rank';
            rankSpan.textContent = card.rank;
            if (card.suit === 'hearts' || card.suit === 'diamonds') {
                rankSpan.style.color = '#c0392b';
            }

            const valueSpan = document.createElement('span');
            valueSpan.className = 'card-value';
            if (card.countValue > 0) {
                valueSpan.classList.add('plus');
                valueSpan.textContent = '+1';
            } else if (card.countValue < 0) {
                valueSpan.classList.add('minus');
                valueSpan.textContent = '-1';
            } else {
                valueSpan.classList.add('zero');
                valueSpan.textContent = '0';
            }

            div.appendChild(rankSpan);
            div.appendChild(valueSpan);
            this.elements.replayCards.appendChild(div);
        });
    },

    closeResultModal() {
        this.elements.resultModal.classList.remove('active');
        this.phase = 'waiting';
        this.clearTable();
        this.elements.btnNewRound.disabled = false;

        // Check if shoe needs reshuffle
        if (Shoe.needsReshuffle()) {
            this.showReshuffleMessage();
        } else {
            this.elements.shoeStatus.textContent = 'Ready - Click "Deal Round"';
        }
    },

    showReshuffleMessage() {
        this.elements.shoeStatus.textContent = 'Shoe depleted - Click "New Shoe"';
        this.elements.btnNewRound.disabled = true;
    },

    renderTable() {
        // Render each seat
        for (let i = 0; i < 5; i++) {
            const container = this.elements[`seat${i}Cards`];
            container.innerHTML = '';

            if (this.seats[i]) {
                this.seats[i].cards.forEach(card => {
                    container.appendChild(this.createCardElement(card));
                });

                if (this.seats[i].cards.length > 0) {
                    const eval_ = HandEvaluation.evaluateHand(this.seats[i].cards);
                    this.elements[`seat${i}Total`].textContent = eval_.total;
                }
            }
        }

        // Render dealer
        this.elements.dealerCards.innerHTML = '';
        this.dealerCards.forEach(card => {
            this.elements.dealerCards.appendChild(this.createCardElement(card));
        });
        if (this.dealerHoleCard) {
            this.elements.dealerCards.appendChild(this.createCardElement(null, true));
        }

        if (this.dealerCards.length > 0) {
            const eval_ = HandEvaluation.evaluateHand(this.dealerCards);
            this.elements.dealerTotal.textContent = eval_.total;
        }
    },

    createCardElement(card, faceDown = false) {
        const div = document.createElement('div');
        div.className = 'card';

        if (faceDown) {
            div.classList.add('face-down');
            return div;
        }

        if (!card) {
            div.classList.add('empty');
            return div;
        }

        if (card.suit === 'hearts' || card.suit === 'diamonds') {
            div.classList.add('red');
        }

        const rankSpan = document.createElement('span');
        rankSpan.className = 'rank';
        rankSpan.textContent = card.rank;

        const suitSpan = document.createElement('span');
        suitSpan.className = 'suit';
        const suitSymbols = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
        suitSpan.textContent = suitSymbols[card.suit] || '';

        div.appendChild(rankSpan);
        div.appendChild(suitSpan);

        return div;
    },

    updateShoeStatus() {
        const remaining = Shoe.getRemaining();
        const penetration = Shoe.getPenetration();
        this.elements.shoeStatus.textContent = `${remaining} cards (${penetration}% dealt)`;
    },

    updateStats() {
        this.elements.handsPlayed.textContent = this.roundsPlayed;
        this.elements.cardsDealt.textContent = this.totalCardsDealt;
        this.elements.timeoutCount.textContent = this.timeouts;

        if (this.countChecks > 0) {
            const accuracy = Math.round((this.countCorrect / this.countChecks) * 100);
            this.elements.countAccuracy.textContent = accuracy + '%';
        } else {
            this.elements.countAccuracy.textContent = '-';
        }
    },

    endSession() {
        PracticeStats.saveSession(PRACTICE_MODES.HARD, {
            handsPlayed: this.roundsPlayed,
            cardsCount: this.totalCardsDealt,
            correctCount: this.countCorrect,
            timeouts: this.timeouts,
            bestStreak: 0
        });

        document.getElementById('session-hands').textContent = this.roundsPlayed;
        document.getElementById('session-accuracy').textContent =
            this.countChecks > 0 ? Math.round((this.countCorrect / this.countChecks) * 100) + '%' : '-';
        document.getElementById('session-timeouts').textContent = this.timeouts;

        this.elements.sessionModal.classList.add('active');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => HardMode.init());
