/* =====================================================
   CASINO GAME CALCULATOR - MAIN PAGE SCRIPTS
   ===================================================== */

/**
 * Initialize the main page
 */
function init() {
    setupComingSoonCards();
    setupModeToggle();
}

/**
 * Landing has two options: "3D Lobby" (a real link) and "Practice Mode".
 * Practice Mode swaps the landing view for the practice trainers in-page,
 * with a back button to return. Keeps the first screen to just two choices.
 */
function setupModeToggle() {
    const landing = document.getElementById('landingZone');
    const practice = document.getElementById('practiceZone');
    const enter = document.getElementById('enterPracticeCard');
    const back = document.getElementById('backToLobby');
    if (!landing || !practice || !enter) return;

    const show = (view) => {
        const showPractice = view === 'practice';
        landing.hidden = showPractice;
        practice.hidden = !showPractice;
        window.scrollTo({ top: 0, behavior: 'auto' });
    };

    enter.addEventListener('click', (e) => {
        e.preventDefault();
        show('practice');
    });
    if (back) {
        back.addEventListener('click', (e) => {
            e.preventDefault();
            show('landing');
        });
    }
}

/**
 * Setup click handlers for coming soon cards
 * Prevents navigation and shows shake animation
 */
function setupComingSoonCards() {
    const comingSoonCards = document.querySelectorAll('.game-card.coming-soon');
    
    comingSoonCards.forEach(card => {
        card.addEventListener('click', handleComingSoonClick);
    });
}

/**
 * Handle click on coming soon cards
 * @param {Event} e - Click event
 */
function handleComingSoonClick(e) {
    e.preventDefault();
    
    const card = e.currentTarget;
    
    // Add shake animation
    card.style.animation = 'shake 0.3s ease';
    
    // Remove animation after it completes
    setTimeout(() => {
        card.style.animation = '';
    }, 300);
}

/**
 * Get game data by game type
 * @param {string} gameType - Type of game (roulette, blackjack, baccarat, poker)
 * @returns {Object} Game configuration object
 */
function getGameConfig(gameType) {
    const games = {
        roulette: {
            name: 'Roulette',
            path: 'roulette/index.html',
            available: false,
            features: ['Odds Calculator', 'Martingale Sim']
        },
        blackjack: {
            name: 'Blackjack',
            path: 'blackjack/index.html',
            available: false,
            features: ['Basic Strategy', 'Card Counting']
        },
        baccarat: {
            name: 'Baccarat',
            path: 'baccarat/index.html',
            available: true,
            features: ['Edge Calculator', 'Egalité Bets', 'Side Bets']
        },
        poker: {
            name: 'Poker',
            path: 'poker/index.html',
            available: true,
            features: ['BB/100', 'Win Rate', 'Sample Check']
        }
    };
    
    return games[gameType] || null;
}

/**
 * Navigate to a game
 * @param {string} gameType - Type of game to navigate to
 */
function navigateToGame(gameType) {
    const config = getGameConfig(gameType);
    
    if (config && config.available) {
        window.location.href = config.path;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
