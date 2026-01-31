/**
 * HUD Renderer
 * Renders the count HUD with running count, true count, and statistics
 */

const HUDRenderer = {
    isExpanded: false,

    /**
     * Render the complete HUD
     * @param {string} containerId - Container element ID
     */
    renderHUD(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.textContent = '';
        container.className = 'count-hud';

        // Header
        const header = this.createHeader();
        container.appendChild(header);

        // Compact view
        const compact = this.createCompactView();
        container.appendChild(compact);

        // Expanded view
        const expanded = this.createExpandedView();
        container.appendChild(expanded);
    },

    /**
     * Create HUD header
     * @returns {HTMLElement} Header element
     */
    createHeader() {
        const header = document.createElement('div');
        header.className = 'hud-header';

        const title = document.createElement('span');
        title.className = 'hud-title';
        title.textContent = 'COUNT';

        const toggle = document.createElement('span');
        toggle.className = 'hud-toggle';
        toggle.textContent = '\u25BC';
        toggle.id = 'hud-toggle';

        header.appendChild(title);
        header.appendChild(toggle);

        header.addEventListener('click', () => {
            this.toggleExpanded();
        });

        return header;
    },

    /**
     * Create compact view (always visible)
     * @returns {HTMLElement} Compact view element
     */
    createCompactView() {
        const compact = document.createElement('div');
        compact.className = 'hud-compact';
        compact.id = 'hud-compact';

        const summary = this.getCountSummary();

        // Running Count
        const rcStat = this.createStatElement('RC', this.formatCount(summary.runningCount), summary.runningCount);
        compact.appendChild(rcStat);

        // True Count
        const tcStat = this.createStatElement('TC', formatTrueCount(summary.trueCount), summary.trueCount);
        compact.appendChild(tcStat);

        // Decks Remaining
        const decksStat = this.createStatElement('DECKS', summary.decksRemaining.toFixed(1), 0);
        compact.appendChild(decksStat);

        return compact;
    },

    /**
     * Create a stat element
     * @param {string} label - Stat label
     * @param {string} value - Stat value
     * @param {number} colorValue - Value for determining color
     * @returns {HTMLElement} Stat element
     */
    createStatElement(label, value, colorValue) {
        const stat = document.createElement('div');
        stat.className = 'hud-stat';

        const labelDiv = document.createElement('div');
        labelDiv.className = 'hud-stat-label';
        labelDiv.textContent = label;

        const valueDiv = document.createElement('div');
        valueDiv.className = 'hud-stat-value';
        valueDiv.textContent = value;

        if (colorValue > 0) {
            valueDiv.classList.add('positive');
        } else if (colorValue < 0) {
            valueDiv.classList.add('negative');
        } else {
            valueDiv.classList.add('neutral');
        }

        stat.appendChild(labelDiv);
        stat.appendChild(valueDiv);

        return stat;
    },

    /**
     * Create expanded view
     * @returns {HTMLElement} Expanded view element
     */
    createExpandedView() {
        const expanded = document.createElement('div');
        expanded.className = 'hud-expanded';
        expanded.id = 'hud-expanded';

        // Card counts grid
        const cardCountsLabel = document.createElement('div');
        cardCountsLabel.className = 'hud-section-label';
        cardCountsLabel.textContent = 'Cards Remaining';
        cardCountsLabel.style.cssText = 'font-size: 0.65rem; color: var(--text-dim); margin-bottom: 8px; text-transform: uppercase;';

        const cardCountsGrid = this.createCardCountsGrid();
        expanded.appendChild(cardCountsLabel);
        expanded.appendChild(cardCountsGrid);

        // Penetration bar
        const penetration = this.createPenetrationBar();
        expanded.appendChild(penetration);

        // Stats grid
        const statsGrid = this.createStatsGrid();
        expanded.appendChild(statsGrid);

        // Edge indicator
        const edgeIndicator = this.createEdgeIndicator();
        expanded.appendChild(edgeIndicator);

        // Bet recommendation
        const betRec = this.createBetRecommendation();
        expanded.appendChild(betRec);

        return expanded;
    },

    /**
     * Create card counts grid
     * @returns {HTMLElement} Card counts grid
     */
    createCardCountsGrid() {
        const grid = document.createElement('div');
        grid.className = 'card-counts-grid';

        for (const rank of CARD_RANKS) {
            const item = document.createElement('div');
            item.className = 'card-count-item';

            const remaining = gameState.count.cardCounts[rank] || 0;
            const maxPerRank = gameState.config.decks * 4;

            if (remaining <= 0) {
                item.classList.add('depleted');
            } else if (remaining <= maxPerRank * 0.25) {
                item.classList.add('low');
            }

            const rankDiv = document.createElement('div');
            rankDiv.className = 'card-count-rank';
            rankDiv.textContent = rank;

            const remainingDiv = document.createElement('div');
            remainingDiv.className = 'card-count-remaining';
            remainingDiv.textContent = String(remaining);

            item.appendChild(rankDiv);
            item.appendChild(remainingDiv);
            grid.appendChild(item);
        }

        return grid;
    },

    /**
     * Create penetration bar
     * @returns {HTMLElement} Penetration bar
     */
    createPenetrationBar() {
        const container = document.createElement('div');
        container.className = 'penetration-bar';

        const label = document.createElement('div');
        label.className = 'penetration-label';

        const labelText = document.createElement('span');
        labelText.textContent = 'Penetration';

        const penetration = getDeckPenetration() * 100;
        const percentText = document.createElement('span');
        percentText.textContent = Math.round(penetration) + '%';

        label.appendChild(labelText);
        label.appendChild(percentText);

        const track = document.createElement('div');
        track.className = 'penetration-track';

        const fill = document.createElement('div');
        fill.className = 'penetration-fill';
        fill.style.width = penetration + '%';

        track.appendChild(fill);
        container.appendChild(label);
        container.appendChild(track);

        return container;
    },

    /**
     * Create stats grid
     * @returns {HTMLElement} Stats grid
     */
    createStatsGrid() {
        const grid = document.createElement('div');
        grid.className = 'hud-stats-grid';

        const summary = this.getCountSummary();

        // Cards Dealt
        grid.appendChild(this.createStatBox('Dealt', String(summary.cardsDealt)));

        // Cards Remaining
        grid.appendChild(this.createStatBox('Remaining', String(summary.cardsRemaining)));

        return grid;
    },

    /**
     * Create a stat box
     * @param {string} label - Box label
     * @param {string} value - Box value
     * @returns {HTMLElement} Stat box
     */
    createStatBox(label, value) {
        const box = document.createElement('div');
        box.className = 'hud-stat-box';

        const labelDiv = document.createElement('div');
        labelDiv.className = 'hud-stat-box-label';
        labelDiv.textContent = label;

        const valueDiv = document.createElement('div');
        valueDiv.className = 'hud-stat-box-value';
        valueDiv.textContent = value;

        box.appendChild(labelDiv);
        box.appendChild(valueDiv);

        return box;
    },

    /**
     * Create edge indicator
     * @returns {HTMLElement} Edge indicator
     */
    createEdgeIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'edge-indicator';

        const summary = this.getCountSummary();
        const hasEdge = summary.playerEdge > 0;

        if (hasEdge) {
            indicator.classList.add('player-edge');
        } else {
            indicator.classList.add('house-edge');
        }

        const icon = document.createElement('span');
        icon.className = 'edge-icon';
        icon.textContent = hasEdge ? '\u2191' : '\u2193';

        const text = document.createElement('span');
        text.className = 'edge-text';
        text.textContent = hasEdge
            ? 'Player Edge: ' + formatEV(summary.playerEdge)
            : 'House Edge: ' + formatEV(Math.abs(summary.playerEdge));

        indicator.appendChild(icon);
        indicator.appendChild(text);

        return indicator;
    },

    /**
     * Create bet recommendation
     * @returns {HTMLElement} Bet recommendation
     */
    createBetRecommendation() {
        const container = document.createElement('div');
        container.className = 'bet-recommendation';

        const summary = this.getCountSummary();
        const recommendedBet = CardCounting.getRecommendedBet(
            summary.trueCount,
            gameState.config.minBet,
            gameState.config.maxBet,
            gameState.bankroll.current || 10000,
            KELLY_FRACTIONS.standard
        );

        const label = document.createElement('div');
        label.className = 'bet-recommendation-label';
        label.textContent = 'Recommended Bet';

        const value = document.createElement('div');
        value.className = 'bet-recommendation-value';
        value.textContent = formatCurrency(recommendedBet);

        const units = document.createElement('div');
        units.className = 'bet-recommendation-units';
        units.textContent = CardCounting.getBetSpreadDescription(summary.trueCount);

        container.appendChild(label);
        container.appendChild(value);
        container.appendChild(units);

        return container;
    },

    /**
     * Toggle expanded view
     */
    toggleExpanded() {
        this.isExpanded = !this.isExpanded;

        const expanded = document.getElementById('hud-expanded');
        const toggle = document.getElementById('hud-toggle');

        if (expanded) {
            if (this.isExpanded) {
                expanded.classList.add('open');
            } else {
                expanded.classList.remove('open');
            }
        }

        if (toggle) {
            if (this.isExpanded) {
                toggle.classList.add('expanded');
            } else {
                toggle.classList.remove('expanded');
            }
        }
    },

    /**
     * Update HUD with current values
     */
    updateHUD() {
        const compactContainer = document.getElementById('hud-compact');
        const expandedContainer = document.getElementById('hud-expanded');

        if (compactContainer) {
            const newCompact = this.createCompactView();
            newCompact.id = 'hud-compact';
            compactContainer.replaceWith(newCompact);
        }

        if (expandedContainer && this.isExpanded) {
            const wasOpen = expandedContainer.classList.contains('open');
            const newExpanded = this.createExpandedView();
            newExpanded.id = 'hud-expanded';
            if (wasOpen) {
                newExpanded.classList.add('open');
            }
            expandedContainer.replaceWith(newExpanded);
        }
    },

    /**
     * Get count summary
     * @returns {object} Count summary
     */
    getCountSummary() {
        const trueCount = CardCounting.calculateTrueCount(
            gameState.count.running,
            CardCounting.getDecksRemaining(gameState.config.decks, gameState.count.cardsDealt)
        );

        return {
            runningCount: gameState.count.running,
            trueCount: trueCount,
            decksRemaining: CardCounting.getDecksRemaining(gameState.config.decks, gameState.count.cardsDealt),
            cardsDealt: gameState.count.cardsDealt,
            cardsRemaining: (gameState.config.decks * 52) - gameState.count.cardsDealt,
            playerEdge: CardCounting.calculatePlayerEdge(trueCount)
        };
    },

    /**
     * Format count for display
     * @param {number} count - Count value
     * @returns {string} Formatted count
     */
    formatCount(count) {
        const sign = count >= 0 ? '+' : '';
        return sign + count;
    }
};
