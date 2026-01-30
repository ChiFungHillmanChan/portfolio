/**
 * Decision Overlay
 * Shows optimal play recommendations with EV for player actions
 */

const DecisionOverlay = {
    /**
     * Show decision overlay for a seat
     * @param {number} seatIndex - Seat index
     */
    showDecision(seatIndex) {
        const seat = gameState.table.seats[seatIndex];
        if (!seat || seat.status !== SEAT_STATUSES.MINE) return;

        const hand = seat.hands[seat.activeHandIndex];
        if (!hand || hand.cards.length < 2) return;

        const dealerUpcard = getDealerUpcard();
        if (!dealerUpcard) return;

        // Get hand evaluation
        const playerEval = HandEvaluation.evaluateHand(hand.cards);

        // Get true count
        const trueCount = CardCounting.calculateTrueCount(
            gameState.count.running,
            CardCounting.getDecksRemaining(gameState.config.decks, gameState.count.cardsDealt)
        );

        // Get basic strategy action
        const basicAction = BasicStrategy.getOptimalAction(
            hand.cards,
            dealerUpcard.rank,
            {
                canDoubleAfterSplit: gameState.config.doubleAfterSplit,
                surrenderAllowed: gameState.config.surrenderAllowed,
                isAfterSplit: hand.isSplit
            }
        );

        // Check for deviations
        const deviation = Illustrious18.checkDeviation(
            playerEval,
            dealerUpcard.rank,
            trueCount,
            gameState.ui.showDeviations
        );

        // Get all actions with EV
        const actionsEV = EVCalculator.getAllActionsEV(
            playerEval,
            dealerUpcard.rank,
            trueCount,
            {
                canDouble: hand.cards.length === 2 && (!hand.isSplit || gameState.config.doubleAfterSplit),
                canSplit: playerEval.isPair && hand.cards.length === 2,
                canSurrender: hand.cards.length === 2 && gameState.config.surrenderAllowed
            }
        );

        // Render overlay
        this.renderOverlay(seatIndex, {
            playerEval,
            dealerUpcard,
            basicAction,
            deviation,
            actionsEV,
            trueCount,
            bet: hand.bet || seat.bet
        });
    },

    /**
     * Render the decision overlay
     * @param {number} seatIndex - Seat index
     * @param {object} data - Decision data
     */
    renderOverlay(seatIndex, data) {
        // Remove existing overlay
        this.hideDecision();

        const overlay = document.createElement('div');
        overlay.className = 'decision-overlay-container';
        overlay.id = 'decision-overlay';

        // Header
        const header = document.createElement('div');
        header.className = 'decision-header';

        const seatLabel = document.createElement('span');
        seatLabel.className = 'decision-seat-label';
        seatLabel.textContent = 'Seat ' + (seatIndex + 1);

        const betLabel = document.createElement('span');
        betLabel.className = 'decision-bet-label';
        betLabel.textContent = data.bet > 0 ? formatCurrency(data.bet) + ' bet' : '';

        header.appendChild(seatLabel);
        header.appendChild(betLabel);
        overlay.appendChild(header);

        // Hand info
        const handInfo = document.createElement('div');
        handInfo.className = 'decision-hand-info';

        const handTotal = document.createElement('div');
        handTotal.className = 'decision-hand-total';
        handTotal.textContent = HandEvaluation.getHandDescription(
            gameState.table.seats[seatIndex].hands[
                gameState.table.seats[seatIndex].activeHandIndex
            ].cards
        );

        const vsDealer = document.createElement('div');
        vsDealer.className = 'decision-vs-dealer';
        vsDealer.textContent = 'vs Dealer: ' + data.dealerUpcard.rank;

        handInfo.appendChild(handTotal);
        handInfo.appendChild(vsDealer);
        overlay.appendChild(handInfo);

        // Action buttons
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'decision-actions';

        for (const action of data.actionsEV) {
            const btn = this.createActionButton(action, data.basicAction, data.deviation);
            actionsContainer.appendChild(btn);
        }

        overlay.appendChild(actionsContainer);

        // Deviation alert
        if (data.deviation) {
            const alert = document.createElement('div');
            alert.className = 'decision-deviation-alert';

            const icon = document.createElement('span');
            icon.className = 'deviation-icon';
            icon.textContent = '\u26A1';

            const text = document.createElement('span');
            text.className = 'deviation-text';
            text.textContent = data.deviation.description;

            alert.appendChild(icon);
            alert.appendChild(text);
            overlay.appendChild(alert);
        }

        // Add to page
        const container = document.getElementById('decision-panel') || document.body;
        container.appendChild(overlay);
    },

    /**
     * Create an action button
     * @param {object} action - Action data
     * @param {object} basicAction - Basic strategy action
     * @param {object} deviation - Active deviation
     * @returns {HTMLElement} Button element
     */
    createActionButton(action, basicAction, deviation) {
        const btn = document.createElement('button');
        btn.className = 'decision-action-btn';

        // Determine if optimal
        const isOptimal = action.isOptimal;
        const isBasicStrategy = action.actionCode === basicAction.action;
        const isDeviation = deviation && action.actionCode === deviation.action;

        if (isOptimal) {
            btn.classList.add('optimal');
        }

        // Action name
        const name = document.createElement('span');
        name.className = 'action-name';
        name.textContent = action.action;
        btn.appendChild(name);

        // EV display
        const ev = document.createElement('span');
        ev.className = 'action-ev';
        ev.textContent = formatEV(action.ev);

        if (action.ev >= 0) {
            ev.classList.add('positive');
        } else {
            ev.classList.add('negative');
        }

        btn.appendChild(ev);

        // Optimal indicator
        if (isOptimal) {
            const indicator = document.createElement('span');
            indicator.className = 'optimal-indicator';
            indicator.textContent = '\u2713 OPTIMAL';
            btn.appendChild(indicator);
        }

        // Click handler
        btn.addEventListener('click', () => {
            this.handleActionClick(action.actionCode);
        });

        return btn;
    },

    /**
     * Handle action button click
     * @param {string} actionCode - Action code
     */
    handleActionClick(actionCode) {
        const seatIndex = gameState.table.currentSeatIndex;
        const seat = gameState.table.seats[seatIndex];
        const hand = seat.hands[seat.activeHandIndex];

        switch (actionCode) {
            case 'H':
                // Hit - wait for card input
                this.hideDecision();
                break;

            case 'S':
                // Stand - move to next hand/seat
                hand.isComplete = true;
                this.hideDecision();
                this.moveToNextAction();
                break;

            case 'D':
                // Double - double bet, wait for one card, then complete
                hand.isDoubled = true;
                hand.bet = (hand.bet || seat.bet) * 2;
                // Player will input one card, then hand is complete
                this.hideDecision();
                break;

            case 'P':
                // Split - create two hands
                this.handleSplit(seatIndex);
                break;

            case 'R':
                // Surrender - lose half bet
                hand.isComplete = true;
                hand.result = 'surrender';
                updateBankroll(-(hand.bet || seat.bet) / 2);
                this.hideDecision();
                this.moveToNextAction();
                break;

            default:
                this.hideDecision();
        }

        saveGameState();
    },

    /**
     * Handle split action
     * @param {number} seatIndex - Seat index
     */
    handleSplit(seatIndex) {
        const seat = gameState.table.seats[seatIndex];
        const hand = seat.hands[seat.activeHandIndex];

        // Create second hand
        const secondHand = createEmptyHand();
        secondHand.cards = [hand.cards.pop()];
        secondHand.bet = hand.bet || seat.bet;
        secondHand.isSplit = true;
        hand.isSplit = true;

        seat.hands.push(secondHand);

        // Re-render and show decision
        TableRenderer.renderSeats();
        this.showDecision(seatIndex);
    },

    /**
     * Move to next action (next hand or dealer)
     */
    moveToNextAction() {
        const seatIndex = gameState.table.currentSeatIndex;
        const seat = gameState.table.seats[seatIndex];

        // Check if current seat has more hands
        if (seat.activeHandIndex < seat.hands.length - 1) {
            seat.activeHandIndex++;
            TableRenderer.highlightActiveSeat(seatIndex);
            this.showDecision(seatIndex);
            return;
        }

        // Find next seat with incomplete hands
        for (let i = seatIndex + 1; i < TOTAL_SEATS; i++) {
            const nextSeat = gameState.table.seats[i];
            if (nextSeat.status === SEAT_STATUSES.MINE) {
                const hasIncomplete = nextSeat.hands.some(h => !h.isComplete);
                if (hasIncomplete) {
                    gameState.table.currentSeatIndex = i;
                    nextSeat.activeHandIndex = 0;
                    TableRenderer.highlightActiveSeat(i);
                    this.showDecision(i);
                    return;
                }
            }
        }

        // All player actions complete, move to dealer
        setPhase(GAME_PHASES.DEALER_ACTION);
        this.hideDecision();
        // Dealer will now draw cards
    },

    /**
     * Hide the decision overlay
     */
    hideDecision() {
        const overlay = document.getElementById('decision-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
};
