/**
 * Medium Mode - 1v1 Dealer Training with Auto-Deal and Count Verification
 * 
 * Cards are automatically dealt from a shoe. User plays blackjack normally
 * and verifies the running count at the end of each hand.
 */

const MediumMode = {
    // Game state
    phase: 'waiting', // waiting, dealing, player_turn, dealer_turn, resolution, count_check
    runningCount: 0,
    cardsDealtThisHand: [],
    isDealing: false,

    // Configuration
    dealSpeed: 600, // ms between cards

    // Session stats
    handsPlayed: 0,
    handsWon: 0,
    countChecks: 0,
    countCorrect: 0,
    totalCardsDealt: 0,

    // Hand state
    playerCards: [],
    dealerCards: [],
    dealerHoleCard: null,

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
            playerCards: document.getElementById('player-cards'),
            dealerCards: document.getElementById('dealer-cards'),
            playerTotal: document.getElementById('player-total'),
            dealerTotal: document.getElementById('dealer-total'),
            shoeStatus: document.getElementById('shoe-status'),
            handsPlayed: document.getElementById('hands-played'),
            countAccuracy: document.getElementById('count-accuracy'),
            cardsDealt: document.getElementById('cards-dealt'),
            // Buttons
            btnHit: document.getElementById('btn-hit'),
            btnStand: document.getElementById('btn-stand'),
            btnDouble: document.getElementById('btn-double'),
            btnSplit: document.getElementById('btn-split'),
            btnNewHand: document.getElementById('btn-new-hand'),
            btnNewShoe: document.getElementById('btn-new-shoe'),
            // Modals
            countModal: document.getElementById('count-modal'),
            countInput: document.getElementById('count-input'),
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
    },

    bindEvents() {
        // Action buttons
        this.elements.btnHit.addEventListener('click', () => this.playerAction('hit'));
        this.elements.btnStand.addEventListener('click', () => this.playerAction('stand'));
        this.elements.btnDouble.addEventListener('click', () => this.playerAction('double'));
        this.elements.btnSplit.addEventListener('click', () => this.playerAction('split'));

        // Game controls
        this.elements.btnNewHand.addEventListener('click', () => this.startNewHand());
        this.elements.btnNewShoe.addEventListener('click', () => this.startNewShoe());

        // Count modal
        document.querySelectorAll('.count-adjust').forEach(btn => {
            btn.addEventListener('click', () => {
                const adjust = parseInt(btn.dataset.adjust);
                this.elements.countInput.value = parseInt(this.elements.countInput.value || 0) + adjust;
            });
        });
        this.elements.submitCount.addEventListener('click', () => this.checkCount());
        this.elements.countInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.checkCount();
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
        this.handsPlayed = 0;
        this.handsWon = 0;
        this.countChecks = 0;
        this.countCorrect = 0;
        this.totalCardsDealt = 0;
        this.updateStats();
        this.updateShoeStatus();
        this.startNewHand();
    },

    async startNewHand() {
        if (this.isDealing) return;

        // Check if shoe needs reshuffle
        if (Shoe.needsReshuffle()) {
            this.showReshuffleMessage();
            return;
        }

        this.playerCards = [];
        this.dealerCards = [];
        this.dealerHoleCard = null;
        this.cardsDealtThisHand = [];
        this.phase = 'dealing';
        this.isDealing = true;

        this.renderTable();
        this.updateActionButtons();
        this.elements.btnNewHand.disabled = true;

        // Auto-deal initial cards
        await this.autoDealInitialCards();
    },

    /**
     * Automatically deal the initial 4 cards with delays
     * Order: Player, Dealer (hole), Player, Dealer (up)
     */
    async autoDealInitialCards() {
        const delay = ms => new Promise(r => setTimeout(r, ms));

        // Player card 1
        await this.dealCardToPlayer();
        await delay(this.dealSpeed);

        // Dealer hole card (face down)
        this.dealerHoleCard = Shoe.drawCard();
        this.trackCard(this.dealerHoleCard);
        this.renderTable();
        await delay(this.dealSpeed);

        // Player card 2
        await this.dealCardToPlayer();
        await delay(this.dealSpeed);

        // Dealer up card
        await this.dealCardToDealer();

        this.isDealing = false;
        this.phase = 'player_turn';
        this.updateActionButtons();
        this.updateShoeStatus();

        // Check for blackjack
        this.checkForBlackjack();
    },

    /**
     * Deal a card to the player
     */
    async dealCardToPlayer() {
        const card = Shoe.drawCard();
        if (!card) return;

        this.playerCards.push(card);
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
        this.cardsDealtThisHand.push({ ...card, countValue });
    },

    checkForBlackjack() {
        const playerEval = HandEvaluation.evaluateHand(this.playerCards);

        if (playerEval.isBlackjack) {
            this.revealHoleCard();
            const dealerEval = HandEvaluation.evaluateHand([...this.dealerCards, this.dealerHoleCard]);
            if (dealerEval.isBlackjack) {
                this.resolveHand('push');
            } else {
                this.resolveHand('blackjack');
            }
        }
    },

    async playerAction(action) {
        if (this.phase !== 'player_turn' || this.isDealing) return;

        if (action === 'stand') {
            this.phase = 'dealer_turn';
            this.revealHoleCard();
            await this.autoDealDealer();
        } else if (action === 'hit') {
            this.isDealing = true;
            await this.dealCardToPlayer();
            this.isDealing = false;
            this.checkPlayerHand();
        } else if (action === 'double') {
            this.isDealing = true;
            await this.dealCardToPlayer();
            this.isDealing = false;
            
            const eval_ = HandEvaluation.evaluateHand(this.playerCards);
            if (eval_.isBust) {
                this.resolveHand('bust');
            } else {
                // Auto-stand after double
                this.phase = 'dealer_turn';
                this.revealHoleCard();
                await this.autoDealDealer();
            }
        }

        this.updateActionButtons();
        this.updateShoeStatus();
    },

    checkPlayerHand() {
        const eval_ = HandEvaluation.evaluateHand(this.playerCards);
        if (eval_.isBust) {
            this.resolveHand('bust');
        } else if (eval_.total === 21) {
            this.playerAction('stand');
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

            if (eval_.isBust) {
                this.isDealing = false;
                this.resolveHand('dealer_bust');
                return;
            }

            if (eval_.total >= 17) {
                break;
            }

            await delay(this.dealSpeed);
            await this.dealCardToDealer();
        }

        this.isDealing = false;
        this.compareHands();
    },

    revealHoleCard() {
        if (this.dealerHoleCard) {
            this.dealerCards.unshift(this.dealerHoleCard);
            this.dealerHoleCard = null;
            this.renderTable();
        }
    },

    compareHands() {
        const playerEval = HandEvaluation.evaluateHand(this.playerCards);
        const dealerEval = HandEvaluation.evaluateHand(this.dealerCards);

        if (playerEval.total > dealerEval.total) {
            this.resolveHand('win');
        } else if (playerEval.total < dealerEval.total) {
            this.resolveHand('lose');
        } else {
            this.resolveHand('push');
        }
    },

    resolveHand(result) {
        this.phase = 'resolution';
        this.handsPlayed++;

        if (result === 'win' || result === 'blackjack' || result === 'dealer_bust') {
            this.handsWon++;
        }

        this.elements.btnNewHand.disabled = false;

        // Show count check modal
        setTimeout(() => {
            this.elements.countInput.value = '0';
            this.elements.countModal.classList.add('active');
            this.elements.countInput.focus();
        }, 500);
    },

    checkCount() {
        const userCount = parseInt(this.elements.countInput.value) || 0;
        const isCorrect = userCount === this.runningCount;

        this.countChecks++;
        if (isCorrect) this.countCorrect++;

        this.elements.countModal.classList.remove('active');
        this.showResult(isCorrect, userCount);
    },

    showResult(isCorrect, userCount) {
        this.elements.resultIcon.className = 'result-icon ' + (isCorrect ? 'correct' : 'wrong');
        this.elements.resultTitle.textContent = isCorrect ? 'Correct!' : 'Incorrect';
        this.elements.resultMessage.textContent = isCorrect
            ? `Running count is ${this.runningCount}`
            : `You answered ${userCount}, but the running count is ${this.runningCount}`;

        // Show card replay on wrong answer
        if (!isCorrect) {
            this.elements.cardReplay.classList.add('show');
            this.renderCardReplay();
        } else {
            this.elements.cardReplay.classList.remove('show');
        }

        this.elements.resultModal.classList.add('active');
        this.updateStats();
    },

    renderCardReplay() {
        const container = this.elements.replayCards;
        container.innerHTML = '';

        this.cardsDealtThisHand.forEach(card => {
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
            container.appendChild(div);
        });
    },

    closeResultModal() {
        this.elements.resultModal.classList.remove('active');
        
        // Check if shoe needs reshuffle before next hand
        if (Shoe.needsReshuffle()) {
            this.showReshuffleMessage();
        }
    },

    showReshuffleMessage() {
        this.elements.shoeStatus.textContent = 'Shoe depleted - Click "New Shoe"';
        this.elements.btnNewHand.disabled = true;
        this.phase = 'waiting';
    },

    renderTable() {
        // Render player cards
        const playerContainer = this.elements.playerCards;
        playerContainer.innerHTML = '';
        this.playerCards.forEach(card => {
            playerContainer.appendChild(this.createCardElement(card));
        });
        if (this.playerCards.length === 0) {
            playerContainer.appendChild(this.createCardElement(null));
            playerContainer.appendChild(this.createCardElement(null));
        }

        // Render dealer cards
        const dealerContainer = this.elements.dealerCards;
        dealerContainer.innerHTML = '';
        this.dealerCards.forEach(card => {
            dealerContainer.appendChild(this.createCardElement(card));
        });
        if (this.dealerHoleCard) {
            dealerContainer.appendChild(this.createCardElement(null, true));
        }
        if (this.dealerCards.length === 0 && !this.dealerHoleCard) {
            dealerContainer.appendChild(this.createCardElement(null));
            dealerContainer.appendChild(this.createCardElement(null));
        }

        // Update totals
        if (this.playerCards.length > 0) {
            const eval_ = HandEvaluation.evaluateHand(this.playerCards);
            this.elements.playerTotal.textContent = eval_.total + (eval_.isSoft ? ' (soft)' : '');
        } else {
            this.elements.playerTotal.textContent = '';
        }

        if (this.dealerCards.length > 0) {
            const eval_ = HandEvaluation.evaluateHand(this.dealerCards);
            this.elements.dealerTotal.textContent = eval_.total;
        } else {
            this.elements.dealerTotal.textContent = '';
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

    updateActionButtons() {
        const isPlayerTurn = this.phase === 'player_turn' && !this.isDealing;
        const canDouble = isPlayerTurn && this.playerCards.length === 2;
        const playerEval = this.playerCards.length > 0 ? HandEvaluation.evaluateHand(this.playerCards) : null;
        const canSplit = canDouble && playerEval && playerEval.isPair;

        this.elements.btnHit.disabled = !isPlayerTurn;
        this.elements.btnStand.disabled = !isPlayerTurn;
        this.elements.btnDouble.disabled = !canDouble;
        this.elements.btnSplit.disabled = !canSplit;
    },

    updateShoeStatus() {
        const remaining = Shoe.getRemaining();
        const penetration = Shoe.getPenetration();
        this.elements.shoeStatus.textContent = `${remaining} cards (${penetration}% dealt)`;
    },

    updateStats() {
        this.elements.handsPlayed.textContent = this.handsPlayed;
        this.elements.cardsDealt.textContent = this.totalCardsDealt;

        if (this.countChecks > 0) {
            const accuracy = Math.round((this.countCorrect / this.countChecks) * 100);
            this.elements.countAccuracy.textContent = accuracy + '%';
        } else {
            this.elements.countAccuracy.textContent = '-';
        }
    },

    endSession() {
        // Save session stats
        PracticeStats.saveSession(PRACTICE_MODES.MEDIUM, {
            handsPlayed: this.handsPlayed,
            handsWon: this.handsWon,
            cardsCount: this.totalCardsDealt,
            correctCount: this.countCorrect,
            bestStreak: 0
        });

        // Show session modal
        document.getElementById('session-hands').textContent = this.handsPlayed;
        document.getElementById('session-accuracy').textContent =
            this.countChecks > 0 ? Math.round((this.countCorrect / this.countChecks) * 100) + '%' : '-';
        document.getElementById('session-winrate').textContent =
            this.handsPlayed > 0 ? Math.round((this.handsWon / this.handsPlayed) * 100) + '%' : '-';

        this.elements.sessionModal.classList.add('active');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => MediumMode.init());
