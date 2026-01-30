/**
 * Table Renderer
 * Renders the blackjack table UI
 */

const TableRenderer = {
    /**
     * Render the entire table
     */
    renderTable() {
        const tableContainer = document.getElementById('blackjack-table');
        if (!tableContainer) return;

        // Clear existing content
        tableContainer.textContent = '';

        // Create dealer area
        const dealerArea = document.createElement('div');
        dealerArea.className = 'dealer-area';

        const dealerLabel = document.createElement('div');
        dealerLabel.className = 'dealer-label';
        dealerLabel.textContent = 'DEALER';

        const dealerCards = document.createElement('div');
        dealerCards.className = 'dealer-cards';
        dealerCards.id = 'dealer-cards';

        const dealerTotal = document.createElement('div');
        dealerTotal.className = 'dealer-total';
        dealerTotal.id = 'dealer-total';

        dealerArea.appendChild(dealerLabel);
        dealerArea.appendChild(dealerCards);
        dealerArea.appendChild(dealerTotal);

        // Create seats container
        const seatsContainer = document.createElement('div');
        seatsContainer.className = 'seats-container';
        seatsContainer.id = 'seats-container';

        tableContainer.appendChild(dealerArea);
        tableContainer.appendChild(seatsContainer);

        this.renderDealerCards();
        this.renderSeats();
    },

    /**
     * Render dealer's cards
     */
    renderDealerCards() {
        const container = document.getElementById('dealer-cards');
        const totalDisplay = document.getElementById('dealer-total');
        if (!container) return;

        container.textContent = '';
        const dealer = gameState.table.dealer;

        // Render visible cards
        for (const card of dealer.cards) {
            container.appendChild(this.createCardElement(card));
        }

        // Render hole card
        if (dealer.holeCard && !dealer.holeCardRevealed) {
            container.appendChild(this.createCardElement(null, true));
        } else if (dealer.holeCard && dealer.holeCardRevealed) {
            container.appendChild(this.createCardElement(dealer.holeCard));
        }

        // Empty slots if no cards
        if (dealer.cards.length === 0 && !dealer.holeCard) {
            container.appendChild(this.createCardElement(null));
            container.appendChild(this.createCardElement(null));
        }

        // Update total
        if (totalDisplay) {
            if (dealer.cards.length > 0 || dealer.holeCardRevealed) {
                const allCards = dealer.holeCardRevealed
                    ? [...dealer.cards, dealer.holeCard].filter(Boolean)
                    : dealer.cards;

                if (allCards.length > 0) {
                    const evaluation = HandEvaluation.evaluateHand(allCards);
                    totalDisplay.textContent = 'Total: ' + evaluation.total;
                    totalDisplay.style.display = 'block';
                }
            } else {
                totalDisplay.style.display = 'none';
            }
        }
    },

    /**
     * Render all seats
     */
    renderSeats() {
        const container = document.getElementById('seats-container');
        if (!container) return;

        container.textContent = '';
        for (let i = 0; i < TOTAL_SEATS; i++) {
            const seat = gameState.table.seats[i];
            container.appendChild(this.createSeatElement(seat, i));
        }
    },

    /**
     * Create a seat element
     * @param {object} seat - Seat data
     * @param {number} index - Seat index
     * @returns {HTMLElement} Seat element
     */
    createSeatElement(seat, index) {
        const isActive = gameState.table.currentSeatIndex === index;

        const seatDiv = document.createElement('div');
        seatDiv.className = 'seat ' + seat.status + (isActive ? ' active' : '');
        seatDiv.dataset.seatIndex = index;

        // Seat circle
        const circle = document.createElement('div');
        circle.className = 'seat-circle';

        const number = document.createElement('span');
        number.className = 'seat-number';
        number.textContent = String(index + 1);

        const icon = document.createElement('span');
        icon.className = 'seat-status-icon';
        icon.textContent = this.getSeatIcon(seat.status);

        circle.appendChild(number);
        circle.appendChild(icon);

        // Seat cards
        const cardsDiv = document.createElement('div');
        cardsDiv.className = 'seat-cards';
        this.populateSeatCards(cardsDiv, seat);

        // Seat info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'seat-info';
        this.populateSeatInfo(infoDiv, seat);

        seatDiv.appendChild(circle);
        seatDiv.appendChild(cardsDiv);
        seatDiv.appendChild(infoDiv);

        // Click handler
        seatDiv.addEventListener('click', () => {
            this.handleSeatClick(index);
        });

        return seatDiv;
    },

    /**
     * Get icon for seat status
     */
    getSeatIcon(status) {
        switch (status) {
            case SEAT_STATUSES.EMPTY: return '';
            case SEAT_STATUSES.OCCUPIED: return '\u25CF';
            case SEAT_STATUSES.MINE: return '\u2605';
            default: return '';
        }
    },

    /**
     * Populate seat cards
     */
    populateSeatCards(container, seat) {
        if (seat.status === SEAT_STATUSES.EMPTY) return;

        const activeHand = seat.hands[seat.activeHandIndex];
        if (!activeHand || activeHand.cards.length === 0) return;

        for (const card of activeHand.cards) {
            container.appendChild(this.createCardElement(card));
        }
    },

    /**
     * Populate seat info
     */
    populateSeatInfo(container, seat) {
        if (seat.status === SEAT_STATUSES.EMPTY) return;

        const activeHand = seat.hands[seat.activeHandIndex];
        if (!activeHand || activeHand.cards.length === 0) return;

        const totalText = HandEvaluation.getHandDescription(activeHand.cards);

        const totalDiv = document.createElement('div');
        totalDiv.className = 'seat-total';
        totalDiv.textContent = totalText;
        container.appendChild(totalDiv);

        if (seat.bet > 0) {
            const betDiv = document.createElement('div');
            betDiv.className = 'seat-bet';
            betDiv.textContent = formatCurrency(seat.bet);
            container.appendChild(betDiv);
        }
    },

    /**
     * Create a card element
     */
    createCardElement(card, faceDown = false) {
        const cardDiv = document.createElement('div');

        if (faceDown) {
            cardDiv.className = 'card face-down';
            return cardDiv;
        }

        if (!card) {
            cardDiv.className = 'card empty';
            return cardDiv;
        }

        const rank = typeof card === 'string' ? card : card.rank;
        const suit = typeof card === 'object' ? card.suit : null;
        const suitSymbol = suit ? getSuitSymbol(suit) : '';
        const colorClass = this.getCardColorClass(suit);

        cardDiv.className = 'card ' + colorClass;

        const rankSpan = document.createElement('span');
        rankSpan.className = 'card-rank';
        rankSpan.textContent = rank;

        const suitSpan = document.createElement('span');
        suitSpan.className = 'card-suit';
        suitSpan.textContent = suitSymbol;

        cardDiv.appendChild(rankSpan);
        cardDiv.appendChild(suitSpan);

        return cardDiv;
    },

    /**
     * Get color class for card
     */
    getCardColorClass(suit) {
        if (!suit) return 'black';
        return (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
    },

    /**
     * Handle seat click
     */
    handleSeatClick(index) {
        if (gameState.phase === GAME_PHASES.SETUP) {
            const seat = gameState.table.seats[index];
            const statuses = [SEAT_STATUSES.EMPTY, SEAT_STATUSES.OCCUPIED, SEAT_STATUSES.MINE];
            const currentIndex = statuses.indexOf(seat.status);
            const nextIndex = (currentIndex + 1) % statuses.length;
            setSeatStatus(index, statuses[nextIndex]);
            this.renderSeats();
            if (typeof updateSetupUI === 'function') {
                updateSetupUI();
            }
        }
    },

    /**
     * Highlight active seat
     */
    highlightActiveSeat(index) {
        document.querySelectorAll('.seat').forEach(seat => {
            seat.classList.remove('active');
        });

        const activeSeat = document.querySelector('.seat[data-seat-index="' + index + '"]');
        if (activeSeat) {
            activeSeat.classList.add('active');
        }
    }
};
