/**
 * Card Input UI
 * Quick-tap card selector for tracking deals
 */

const CardInput = {
    /**
     * Render the card input grid
     * @param {string} containerId - Container element ID
     */
    renderCardInput(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.textContent = '';

        const grid = document.createElement('div');
        grid.className = 'card-input-grid';

        // First row: A, 2-6
        const row1Ranks = ['A', '2', '3', '4', '5', '6', '7'];
        for (const rank of row1Ranks) {
            grid.appendChild(this.createCardButton(rank));
        }

        // Second row: 8-K
        const row2Ranks = ['8', '9', '10', 'J', 'Q', 'K'];
        for (const rank of row2Ranks) {
            grid.appendChild(this.createCardButton(rank));
        }

        container.appendChild(grid);
    },

    /**
     * Create a card button element
     * @param {string} rank - Card rank
     * @returns {HTMLElement} Button element
     */
    createCardButton(rank) {
        const btn = document.createElement('button');
        btn.className = 'card-btn';
        btn.dataset.rank = rank;

        // Add count-based styling
        const countValue = HI_LO_VALUES[rank];
        if (countValue > 0) {
            btn.classList.add('positive-count');
        } else if (countValue < 0) {
            btn.classList.add('negative-count');
        }

        // Rank label
        const rankSpan = document.createElement('span');
        rankSpan.className = 'card-rank-label';
        rankSpan.textContent = rank;
        btn.appendChild(rankSpan);

        // Remaining count badge
        const remaining = gameState.count.cardCounts[rank] || 0;
        const badge = document.createElement('span');
        badge.className = 'count-badge';
        badge.textContent = String(remaining);
        btn.appendChild(badge);

        // Mark depleted
        if (remaining <= 0) {
            btn.classList.add('depleted');
        }

        // Click handler
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleCardClick(rank);
        });

        return btn;
    },

    /**
     * Handle card button click
     * @param {string} rank - Card rank
     */
    handleCardClick(rank) {
        // Update running count
        CardCounting.updateRunningCount(rank, gameState.count.running);
        gameState.count.running += HI_LO_VALUES[rank];
        gameState.count.cardsDealt++;

        // Decrement card count
        if (gameState.count.cardCounts[rank] > 0) {
            gameState.count.cardCounts[rank]--;
        }

        // Add card to appropriate location based on game phase
        this.addCardToActivePosition(rank);

        // Update UI
        this.updateCardButton(rank);
        HUDRenderer.updateHUD();

        // Save state
        saveGameState();

        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('cardDealt', {
            detail: { rank }
        }));
    },

    /**
     * Add card to the active dealing position
     * @param {string} rank - Card rank
     */
    addCardToActivePosition(rank) {
        const phase = gameState.phase;
        const card = { rank, suit: null };

        if (phase === GAME_PHASES.DEALING) {
            // During initial deal, add to current dealing position
            const dealingPosition = this.getCurrentDealingPosition();
            if (dealingPosition.type === 'dealer') {
                if (dealingPosition.cardIndex === 0) {
                    gameState.table.dealer.cards.push(card);
                } else {
                    gameState.table.dealer.holeCard = card;
                }
            } else {
                const seat = gameState.table.seats[dealingPosition.seatIndex];
                seat.hands[seat.activeHandIndex].cards.push(card);
            }
            this.advanceDealingPosition();
        } else if (phase === GAME_PHASES.PLAYER_ACTION) {
            // During player action, add to active player's hand
            const currentSeat = getCurrentSeat();
            if (currentSeat) {
                currentSeat.hands[currentSeat.activeHandIndex].cards.push(card);
            }
        } else if (phase === GAME_PHASES.DEALER_ACTION) {
            // During dealer action, add to dealer
            gameState.table.dealer.cards.push(card);
        }

        // Update table display
        TableRenderer.renderDealerCards();
        TableRenderer.renderSeats();
    },

    /**
     * Get current dealing position during initial deal
     * @returns {object} Current position info
     */
    getCurrentDealingPosition() {
        // Simple dealing sequence: all occupied seats first card, dealer, all seats second card, dealer
        const occupiedSeats = gameState.table.seats
            .map((seat, index) => ({ seat, index }))
            .filter(s => s.seat.status !== SEAT_STATUSES.EMPTY);

        if (occupiedSeats.length === 0) {
            return { type: 'dealer', cardIndex: 0 };
        }

        const totalCards = occupiedSeats.reduce((sum, s) => {
            return sum + s.seat.hands[0].cards.length;
        }, 0);

        const dealerCardCount = gameState.table.dealer.cards.length +
            (gameState.table.dealer.holeCard ? 1 : 0);

        const expectedPerSeat = Math.floor((totalCards + dealerCardCount) / (occupiedSeats.length + 1)) + 1;

        // Find first seat that needs a card
        for (const { seat, index } of occupiedSeats) {
            if (seat.hands[0].cards.length < expectedPerSeat) {
                return { type: 'seat', seatIndex: index, cardIndex: seat.hands[0].cards.length };
            }
        }

        // Dealer needs a card
        if (dealerCardCount < 2) {
            return { type: 'dealer', cardIndex: dealerCardCount };
        }

        // All dealt
        return { type: 'complete' };
    },

    /**
     * Advance to next dealing position
     */
    advanceDealingPosition() {
        const position = this.getCurrentDealingPosition();

        if (position.type === 'complete') {
            // Initial deal complete, move to player action
            setPhase(GAME_PHASES.PLAYER_ACTION);
            this.findFirstPlayerToAct();
        }
    },

    /**
     * Find the first player seat to act
     */
    findFirstPlayerToAct() {
        for (let i = 0; i < TOTAL_SEATS; i++) {
            const seat = gameState.table.seats[i];
            if (seat.status === SEAT_STATUSES.MINE && seat.hands[0].cards.length === 2) {
                gameState.table.currentSeatIndex = i;
                TableRenderer.highlightActiveSeat(i);
                DecisionOverlay.showDecision(i);
                return;
            }
        }
    },

    /**
     * Update a single card button
     * @param {string} rank - Card rank
     */
    updateCardButton(rank) {
        const btn = document.querySelector('.card-btn[data-rank="' + rank + '"]');
        if (!btn) return;

        const remaining = gameState.count.cardCounts[rank] || 0;
        const badge = btn.querySelector('.count-badge');
        if (badge) {
            badge.textContent = String(remaining);
        }

        if (remaining <= 0) {
            btn.classList.add('depleted');
        } else {
            btn.classList.remove('depleted');
        }
    },

    /**
     * Refresh all card buttons
     */
    refreshCardButtons() {
        for (const rank of CARD_RANKS) {
            this.updateCardButton(rank);
        }
    },

    /**
     * Handle undo - remove last dealt card
     */
    undoLastCard() {
        // This would require tracking the card history
        // For now, just refresh the display
        this.refreshCardButtons();
        HUDRenderer.updateHUD();
    }
};
