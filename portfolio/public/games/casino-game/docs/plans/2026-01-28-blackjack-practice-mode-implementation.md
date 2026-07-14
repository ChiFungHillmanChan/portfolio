# Blackjack Practice Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add card counting practice mode with Easy (flash cards), Medium (1v1), and Hard (5-player) difficulty levels.

**Architecture:** Separate practice folder with shared JS utilities. Reuses existing constants, card-counting, and basic-strategy modules. Each mode has its own HTML/CSS/JS.

**Tech Stack:** Vanilla JS, CSS, localStorage for stats persistence

---

## Task 1: Create Directory Structure

**Files:**
- Create: `blackjack/practice/index.html`
- Create: `blackjack/practice/css/shared.css`
- Create: `blackjack/practice/js/practice-constants.js`

**Step 1: Create directories**

```bash
mkdir -p blackjack/practice/{easy,medium,hard,progress}/{css,js}
mkdir -p blackjack/practice/{css,js}
```

**Step 2: Create practice-constants.js**

```javascript
// Practice Mode Constants
const PRACTICE_MODES = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
};

const PRACTICE_STORAGE_KEYS = {
    EASY_STATS: 'blackjack_practice_easy_stats',
    MEDIUM_STATS: 'blackjack_practice_medium_stats',
    HARD_STATS: 'blackjack_practice_hard_stats',
    SESSIONS: 'blackjack_practice_sessions'
};

const EASY_MODE_CONFIG = {
    sessionDuration: 60,
    initialSpeed: 3000,
    minSpeed: 750,
    speedDecrement: 250,
    correctStreakForSpeedup: 5
};

const HARD_MODE_CONFIG = {
    countAnswerTimeout: 5000,
    totalSeats: 5,
    playerSeatIndex: 4
};
```

**Step 3: Create shared.css with common variables**

```css
/* Practice Mode Shared Styles */
.practice-container {
    max-width: 900px;
    margin: 0 auto;
    padding: var(--spacing-lg);
}

.practice-header {
    text-align: center;
    margin-bottom: var(--spacing-xl);
}

.practice-title {
    font-family: var(--font-display);
    font-size: 1.8rem;
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);
}

.practice-subtitle {
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.practice-btn {
    padding: 12px 24px;
    border-radius: var(--radius-md);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
    border: none;
}

.practice-btn-primary {
    background: var(--accent-gold);
    color: var(--bg-dark);
}

.practice-btn-primary:hover {
    background: var(--accent-gold-light);
    transform: translateY(-2px);
}

.practice-btn-secondary {
    background: var(--bg-card);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
}

.back-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.85rem;
    margin-bottom: var(--spacing-md);
}

.back-link:hover {
    color: var(--accent-gold);
}
```

**Step 4: Verify files exist**

```bash
ls -la blackjack/practice/
ls -la blackjack/practice/js/
```

**Step 5: Commit**

```bash
git add blackjack/practice/
git commit -m "feat(practice): create directory structure and shared constants"
```

---

## Task 2: Create Practice Mode Selection Page

**Files:**
- Create: `blackjack/practice/index.html`
- Create: `blackjack/practice/css/index.css`

**Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#0a0a0f">
    <title>Card Counting Practice | Blackjack</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Rajdhani:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../../css/variables.css">
    <link rel="stylesheet" href="../../css/main.css">
    <link rel="stylesheet" href="../../css/hamburger-menu.css">
    <link rel="stylesheet" href="css/shared.css">
    <link rel="stylesheet" href="css/index.css">
</head>
<body>
    <button class="hamburger-btn" id="hamburgerBtn" aria-label="Menu">
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
    </button>
    <nav class="dropdown-menu" id="dropdownMenu" aria-hidden="true">
        <div class="dropdown-section">
            <a href="../index.html" class="dropdown-item">
                <span class="dropdown-icon">🃏</span>
                <span>Blackjack Home</span>
            </a>
        </div>
    </nav>

    <div class="container">
        <a href="../index.html" class="back-link">← Back to Blackjack</a>

        <header class="practice-header">
            <div class="practice-icon">🎯</div>
            <h1 class="practice-title">CARD COUNTING PRACTICE</h1>
            <p class="practice-subtitle">Master the Hi-Lo System</p>
        </header>

        <div class="hi-lo-info">
            <h3>Hi-Lo Card Values</h3>
            <div class="hi-lo-grid">
                <div class="hi-lo-item plus">
                    <span class="hi-lo-cards">2 3 4 5 6</span>
                    <span class="hi-lo-value">+1</span>
                </div>
                <div class="hi-lo-item zero">
                    <span class="hi-lo-cards">7 8 9</span>
                    <span class="hi-lo-value">0</span>
                </div>
                <div class="hi-lo-item minus">
                    <span class="hi-lo-cards">10 J Q K A</span>
                    <span class="hi-lo-value">-1</span>
                </div>
            </div>
        </div>

        <section class="mode-selection">
            <a href="easy/index.html" class="practice-mode-card easy">
                <div class="mode-icon">🎴</div>
                <h2 class="mode-title">EASY</h2>
                <p class="mode-label">Flash Cards</p>
                <p class="mode-description">
                    Cards appear one by one. Identify if each card is +1, 0, or -1.
                    Speed adapts to your accuracy.
                </p>
                <div class="mode-details">
                    <span>60 seconds</span>
                    <span>Adaptive speed</span>
                </div>
            </a>

            <a href="medium/index.html" class="practice-mode-card medium">
                <div class="mode-icon">🎰</div>
                <h2 class="mode-title">MEDIUM</h2>
                <p class="mode-label">1v1 Dealer</p>
                <p class="mode-description">
                    Play heads-up blackjack against the dealer.
                    After each hand, enter the running count.
                </p>
                <div class="mode-details">
                    <span>Real gameplay</span>
                    <span>Count after each hand</span>
                </div>
            </a>

            <a href="hard/index.html" class="practice-mode-card hard">
                <div class="mode-icon">🏆</div>
                <h2 class="mode-title">HARD</h2>
                <p class="mode-label">Full Table</p>
                <p class="mode-description">
                    5 players at the table. You sit last.
                    Answer the count within 5 seconds after each round.
                </p>
                <div class="mode-details">
                    <span>5 players</span>
                    <span>5 second timer</span>
                </div>
            </a>
        </section>

        <div class="progress-link-container">
            <a href="progress/index.html" class="progress-link">
                <span class="progress-icon">📊</span>
                <span>View Progress & Statistics</span>
            </a>
        </div>
    </div>

    <script src="../../js/hamburger-menu.js"></script>
</body>
</html>
```

**Step 2: Create css/index.css**

```css
/* Practice Mode Selection Page */
.practice-icon {
    font-size: 4rem;
    margin-bottom: var(--spacing-md);
}

.hi-lo-info {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
    border: 1px solid var(--border-subtle);
}

.hi-lo-info h3 {
    text-align: center;
    font-family: var(--font-display);
    color: var(--text-primary);
    margin-bottom: var(--spacing-md);
    font-size: 1rem;
    letter-spacing: 2px;
}

.hi-lo-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-md);
}

.hi-lo-item {
    text-align: center;
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    background: var(--bg-darker);
}

.hi-lo-cards {
    display: block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.1rem;
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
}

.hi-lo-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
}

.hi-lo-item.plus .hi-lo-value { color: var(--accent-green); }
.hi-lo-item.zero .hi-lo-value { color: var(--text-dim); }
.hi-lo-item.minus .hi-lo-value { color: var(--accent-red); }

.mode-selection {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
}

.practice-mode-card {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);
    text-decoration: none;
    border: 1px solid var(--border-subtle);
    transition: all var(--transition-normal);
    position: relative;
    overflow: hidden;
}

.practice-mode-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--mode-color);
}

.practice-mode-card:hover {
    transform: translateY(-5px);
    border-color: var(--mode-color);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.practice-mode-card.easy { --mode-color: #2ecc71; }
.practice-mode-card.medium { --mode-color: #f39c12; }
.practice-mode-card.hard { --mode-color: #e74c3c; }

.practice-mode-card .mode-icon {
    font-size: 2.5rem;
    margin-bottom: var(--spacing-md);
}

.practice-mode-card .mode-title {
    font-family: var(--font-display);
    font-size: 1.4rem;
    color: var(--text-primary);
    letter-spacing: 3px;
    margin-bottom: var(--spacing-xs);
}

.practice-mode-card .mode-label {
    color: var(--mode-color);
    font-weight: 600;
    font-size: 0.85rem;
    margin-bottom: var(--spacing-md);
}

.practice-mode-card .mode-description {
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.6;
    margin-bottom: var(--spacing-md);
}

.mode-details {
    display: flex;
    gap: var(--spacing-md);
    font-size: 0.75rem;
    color: var(--text-dim);
}

.mode-details span {
    padding: 4px 10px;
    background: var(--bg-darker);
    border-radius: var(--radius-sm);
}

.progress-link-container {
    text-align: center;
}

.progress-link {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    text-decoration: none;
    transition: all var(--transition-fast);
}

.progress-link:hover {
    border-color: var(--accent-gold);
    color: var(--accent-gold);
}

.progress-icon {
    font-size: 1.2rem;
}

@media (max-width: 600px) {
    .hi-lo-grid {
        grid-template-columns: 1fr;
    }

    .mode-selection {
        grid-template-columns: 1fr;
    }
}
```

**Step 3: Verify in browser**

Open `blackjack/practice/index.html` in browser and verify layout.

**Step 4: Commit**

```bash
git add blackjack/practice/index.html blackjack/practice/css/
git commit -m "feat(practice): add mode selection page with styling"
```

---

## Task 3: Add Practice Mode Link to Blackjack Landing Page

**Files:**
- Modify: `blackjack/index.html`

**Step 1: Add practice mode card after existing modes**

In `blackjack/index.html`, after the "Free Double Blackjack" mode card (around line 129), add:

```html
            <!-- Practice Mode -->
            <a href="practice/index.html" class="mode-card practice-mode available">
                <div class="mode-icon">🎯</div>
                <h2 class="mode-title">Practice Mode</h2>
                <p class="mode-description">
                    Master card counting with the Hi-Lo system. Three difficulty levels
                    from flash cards to full table chaos.
                </p>
                <div class="mode-features">
                    <span class="feature-tag">Flash Cards</span>
                    <span class="feature-tag">1v1 Training</span>
                    <span class="feature-tag">Full Table</span>
                    <span class="feature-tag">Progress Tracking</span>
                </div>
                <div class="mode-status">
                    <span class="status-dot"></span>
                    Available Now
                </div>
            </a>
```

**Step 2: Add CSS for practice mode color**

In `blackjack/css/index.css`, add:

```css
.mode-card.practice-mode { --mode-color: #9b59b6; }
```

**Step 3: Verify link works**

**Step 4: Commit**

```bash
git add blackjack/index.html blackjack/css/index.css
git commit -m "feat(practice): add practice mode link to blackjack landing page"
```

---

## Task 4: Create Practice Stats Module

**Files:**
- Create: `blackjack/practice/js/practice-stats.js`

**Step 1: Create practice-stats.js**

```javascript
/**
 * Practice Statistics Manager
 * Handles saving/loading practice session data
 */

const PracticeStats = {
    /**
     * Save a practice session
     */
    saveSession(mode, sessionData) {
        try {
            const sessions = this.getAllSessions();
            const session = {
                id: Date.now(),
                mode: mode,
                date: new Date().toISOString(),
                ...sessionData
            };
            sessions.push(session);
            // Keep last 100 sessions
            const trimmed = sessions.slice(-100);
            localStorage.setItem(PRACTICE_STORAGE_KEYS.SESSIONS, JSON.stringify(trimmed));
            this.updateModeStats(mode, sessionData);
            return true;
        } catch (error) {
            console.error('Failed to save session:', error);
            return false;
        }
    },

    /**
     * Update aggregate stats for a mode
     */
    updateModeStats(mode, sessionData) {
        const key = this.getStorageKey(mode);
        const stats = this.getModeStats(mode);

        stats.totalSessions = (stats.totalSessions || 0) + 1;
        stats.totalCards = (stats.totalCards || 0) + (sessionData.cardsCount || 0);
        stats.totalCorrect = (stats.totalCorrect || 0) + (sessionData.correctCount || 0);
        stats.bestStreak = Math.max(stats.bestStreak || 0, sessionData.bestStreak || 0);

        if (mode === PRACTICE_MODES.EASY) {
            stats.bestScore = Math.max(stats.bestScore || 0, sessionData.correctCount || 0);
            if (sessionData.maxSpeedReached) {
                stats.fastestSpeed = Math.min(
                    stats.fastestSpeed || Infinity,
                    sessionData.maxSpeedReached
                );
            }
        }

        if (mode === PRACTICE_MODES.MEDIUM || mode === PRACTICE_MODES.HARD) {
            stats.handsPlayed = (stats.handsPlayed || 0) + (sessionData.handsPlayed || 0);
            stats.handsWon = (stats.handsWon || 0) + (sessionData.handsWon || 0);
        }

        if (mode === PRACTICE_MODES.HARD) {
            stats.timeouts = (stats.timeouts || 0) + (sessionData.timeouts || 0);
        }

        localStorage.setItem(key, JSON.stringify(stats));
    },

    /**
     * Get storage key for mode
     */
    getStorageKey(mode) {
        const keyMap = {
            [PRACTICE_MODES.EASY]: PRACTICE_STORAGE_KEYS.EASY_STATS,
            [PRACTICE_MODES.MEDIUM]: PRACTICE_STORAGE_KEYS.MEDIUM_STATS,
            [PRACTICE_MODES.HARD]: PRACTICE_STORAGE_KEYS.HARD_STATS
        };
        return keyMap[mode];
    },

    /**
     * Get stats for a specific mode
     */
    getModeStats(mode) {
        try {
            const key = this.getStorageKey(mode);
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Failed to load mode stats:', error);
            return {};
        }
    },

    /**
     * Get all sessions
     */
    getAllSessions() {
        try {
            const saved = localStorage.getItem(PRACTICE_STORAGE_KEYS.SESSIONS);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Failed to load sessions:', error);
            return [];
        }
    },

    /**
     * Get sessions for a specific mode
     */
    getModeSessions(mode, limit = 20) {
        const sessions = this.getAllSessions();
        return sessions
            .filter(s => s.mode === mode)
            .slice(-limit);
    },

    /**
     * Get overall accuracy percentage
     */
    getOverallAccuracy() {
        let totalCorrect = 0;
        let totalCards = 0;

        for (const mode of Object.values(PRACTICE_MODES)) {
            const stats = this.getModeStats(mode);
            totalCorrect += stats.totalCorrect || 0;
            totalCards += stats.totalCards || 0;
        }

        return totalCards > 0 ? (totalCorrect / totalCards * 100).toFixed(1) : 0;
    },

    /**
     * Get summary stats for progress page
     */
    getSummaryStats() {
        let totalSessions = 0;
        let totalCards = 0;
        let bestStreak = 0;

        for (const mode of Object.values(PRACTICE_MODES)) {
            const stats = this.getModeStats(mode);
            totalSessions += stats.totalSessions || 0;
            totalCards += stats.totalCards || 0;
            bestStreak = Math.max(bestStreak, stats.bestStreak || 0);
        }

        return {
            totalSessions,
            totalCards,
            bestStreak,
            overallAccuracy: this.getOverallAccuracy()
        };
    },

    /**
     * Clear all practice data
     */
    clearAllData() {
        try {
            localStorage.removeItem(PRACTICE_STORAGE_KEYS.SESSIONS);
            localStorage.removeItem(PRACTICE_STORAGE_KEYS.EASY_STATS);
            localStorage.removeItem(PRACTICE_STORAGE_KEYS.MEDIUM_STATS);
            localStorage.removeItem(PRACTICE_STORAGE_KEYS.HARD_STATS);
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            return false;
        }
    },

    /**
     * Export all data as JSON
     */
    exportData() {
        const data = {
            sessions: this.getAllSessions(),
            easyStats: this.getModeStats(PRACTICE_MODES.EASY),
            mediumStats: this.getModeStats(PRACTICE_MODES.MEDIUM),
            hardStats: this.getModeStats(PRACTICE_MODES.HARD),
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `practice_stats_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};
```

**Step 2: Commit**

```bash
git add blackjack/practice/js/practice-stats.js
git commit -m "feat(practice): add practice statistics manager"
```

---

## Task 5: Create Countdown Timer Component

**Files:**
- Create: `blackjack/practice/js/countdown-timer.js`

**Step 1: Create countdown-timer.js**

```javascript
/**
 * Countdown Timer Component
 * Reusable timer for practice modes
 */

class CountdownTimer {
    constructor(options = {}) {
        this.duration = options.duration || 60;
        this.onTick = options.onTick || (() => {});
        this.onComplete = options.onComplete || (() => {});
        this.tickInterval = options.tickInterval || 100;

        this.remaining = this.duration * 1000;
        this.isRunning = false;
        this.intervalId = null;
        this.startTime = null;
        this.pausedTime = null;
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.startTime = Date.now();

        if (this.pausedTime !== null) {
            // Resume from pause
            this.startTime = Date.now() - (this.duration * 1000 - this.remaining);
        }

        this.intervalId = setInterval(() => this.tick(), this.tickInterval);
        this.tick();
    }

    tick() {
        const elapsed = Date.now() - this.startTime;
        this.remaining = Math.max(0, this.duration * 1000 - elapsed);

        this.onTick({
            remaining: this.remaining,
            seconds: Math.ceil(this.remaining / 1000),
            progress: this.remaining / (this.duration * 1000)
        });

        if (this.remaining <= 0) {
            this.stop();
            this.onComplete();
        }
    }

    pause() {
        if (!this.isRunning) return;

        this.isRunning = false;
        this.pausedTime = this.remaining;
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    stop() {
        this.isRunning = false;
        this.pausedTime = null;
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    reset(newDuration = null) {
        this.stop();
        if (newDuration !== null) {
            this.duration = newDuration;
        }
        this.remaining = this.duration * 1000;
        this.pausedTime = null;
    }

    getRemaining() {
        return this.remaining;
    }

    getSeconds() {
        return Math.ceil(this.remaining / 1000);
    }
}

/**
 * Quick countdown for count check (5 seconds)
 */
class QuickCountdown {
    constructor(options = {}) {
        this.duration = options.duration || 5;
        this.onTick = options.onTick || (() => {});
        this.onComplete = options.onComplete || (() => {});

        this.remaining = this.duration;
        this.intervalId = null;
    }

    start() {
        this.remaining = this.duration;
        this.onTick(this.remaining);

        this.intervalId = setInterval(() => {
            this.remaining--;
            this.onTick(this.remaining);

            if (this.remaining <= 0) {
                this.stop();
                this.onComplete();
            }
        }, 1000);
    }

    stop() {
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    reset() {
        this.stop();
        this.remaining = this.duration;
    }
}
```

**Step 2: Commit**

```bash
git add blackjack/practice/js/countdown-timer.js
git commit -m "feat(practice): add countdown timer components"
```

---

## Task 6: Create Easy Mode - HTML Structure

**Files:**
- Create: `blackjack/practice/easy/index.html`

**Step 1: Create easy/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#0a0a0f">
    <title>Easy Mode - Card Counting Practice</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Rajdhani:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../../../css/variables.css">
    <link rel="stylesheet" href="../../../css/main.css">
    <link rel="stylesheet" href="../css/shared.css">
    <link rel="stylesheet" href="css/easy.css">
</head>
<body>
    <div class="container practice-container">
        <a href="../index.html" class="back-link">← Back to Practice</a>

        <!-- Setup Screen -->
        <div id="setup-screen" class="screen active">
            <header class="practice-header">
                <h1 class="practice-title">EASY MODE</h1>
                <p class="practice-subtitle">Flash Card Training</p>
            </header>

            <div class="setup-options">
                <h3>Choose Pacing</h3>
                <div class="pacing-options">
                    <button class="pacing-btn active" data-pacing="auto">
                        <span class="pacing-icon">⚡</span>
                        <span class="pacing-name">Auto-Deal</span>
                        <span class="pacing-desc">Adaptive speed - gets faster as you improve</span>
                    </button>
                    <button class="pacing-btn" data-pacing="manual">
                        <span class="pacing-icon">👆</span>
                        <span class="pacing-name">Manual</span>
                        <span class="pacing-desc">You control the pace, 60s total time</span>
                    </button>
                </div>
            </div>

            <button id="start-btn" class="practice-btn practice-btn-primary start-btn">
                Start Practice
            </button>
        </div>

        <!-- Game Screen -->
        <div id="game-screen" class="screen">
            <div class="game-header">
                <div class="stat-box timer-box">
                    <span class="stat-label">Time</span>
                    <span id="timer-display" class="stat-value">60</span>
                </div>
                <div class="stat-box score-box">
                    <span class="stat-label">Score</span>
                    <span id="score-display" class="stat-value">0/0</span>
                </div>
                <div class="stat-box streak-box">
                    <span class="stat-label">Streak</span>
                    <span id="streak-display" class="stat-value">0</span>
                </div>
            </div>

            <div class="card-display-area">
                <div id="card-display" class="card-display">
                    <span class="card-rank">?</span>
                    <span class="card-suit"></span>
                </div>
                <div id="feedback-display" class="feedback-display"></div>
            </div>

            <div class="answer-buttons">
                <button class="answer-btn plus" data-value="1">+1</button>
                <button class="answer-btn zero" data-value="0">0</button>
                <button class="answer-btn minus" data-value="-1">-1</button>
            </div>

            <div id="speed-indicator" class="speed-indicator">
                Speed: <span id="speed-value">3.0s</span>
            </div>
        </div>

        <!-- Results Screen -->
        <div id="results-screen" class="screen">
            <header class="practice-header">
                <h1 class="practice-title">SESSION COMPLETE</h1>
            </header>

            <div class="results-grid">
                <div class="result-card">
                    <span class="result-label">Cards Seen</span>
                    <span id="result-cards" class="result-value">0</span>
                </div>
                <div class="result-card">
                    <span class="result-label">Correct</span>
                    <span id="result-correct" class="result-value">0</span>
                </div>
                <div class="result-card">
                    <span class="result-label">Accuracy</span>
                    <span id="result-accuracy" class="result-value">0%</span>
                </div>
                <div class="result-card">
                    <span class="result-label">Best Streak</span>
                    <span id="result-streak" class="result-value">0</span>
                </div>
            </div>

            <div class="results-actions">
                <button id="retry-btn" class="practice-btn practice-btn-primary">Try Again</button>
                <a href="../index.html" class="practice-btn practice-btn-secondary">Back to Menu</a>
            </div>
        </div>
    </div>

    <script src="../../js/shared/constants.js"></script>
    <script src="../js/practice-constants.js"></script>
    <script src="../js/practice-stats.js"></script>
    <script src="../js/countdown-timer.js"></script>
    <script src="js/easy-mode.js"></script>
</body>
</html>
```

**Step 2: Commit**

```bash
git add blackjack/practice/easy/index.html
git commit -m "feat(practice): add easy mode HTML structure"
```

---

## Task 7: Create Easy Mode - CSS

**Files:**
- Create: `blackjack/practice/easy/css/easy.css`

**Step 1: Create easy.css**

```css
/* Easy Mode Styles */
.screen {
    display: none;
}

.screen.active {
    display: block;
}

/* Setup Screen */
.setup-options {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);
    margin-bottom: var(--spacing-xl);
    border: 1px solid var(--border-subtle);
}

.setup-options h3 {
    text-align: center;
    font-family: var(--font-display);
    margin-bottom: var(--spacing-lg);
    color: var(--text-primary);
}

.pacing-options {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
}

.pacing-btn {
    background: var(--bg-darker);
    border: 2px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: center;
}

.pacing-btn:hover {
    border-color: var(--accent-gold);
}

.pacing-btn.active {
    border-color: var(--accent-green);
    background: rgba(46, 204, 113, 0.1);
}

.pacing-icon {
    display: block;
    font-size: 2rem;
    margin-bottom: var(--spacing-sm);
}

.pacing-name {
    display: block;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);
}

.pacing-desc {
    display: block;
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.start-btn {
    display: block;
    width: 100%;
    max-width: 300px;
    margin: 0 auto;
    font-size: 1.1rem;
    padding: var(--spacing-md) var(--spacing-xl);
}

/* Game Screen */
.game-header {
    display: flex;
    justify-content: center;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
}

.stat-box {
    background: var(--bg-card);
    border-radius: var(--radius-md);
    padding: var(--spacing-md) var(--spacing-lg);
    text-align: center;
    min-width: 100px;
    border: 1px solid var(--border-subtle);
}

.stat-label {
    display: block;
    font-size: 0.7rem;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: var(--spacing-xs);
}

.stat-value {
    display: block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
}

.timer-box .stat-value {
    color: var(--accent-gold);
}

.streak-box .stat-value {
    color: var(--accent-green);
}

/* Card Display */
.card-display-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: var(--spacing-xl);
    min-height: 250px;
}

.card-display {
    width: 140px;
    height: 200px;
    background: white;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s ease;
}

.card-display.flip {
    animation: cardFlip 0.3s ease;
}

@keyframes cardFlip {
    0% { transform: rotateY(0deg) scale(1); }
    50% { transform: rotateY(90deg) scale(0.9); }
    100% { transform: rotateY(0deg) scale(1); }
}

.card-rank {
    font-size: 4rem;
    font-weight: 700;
    color: #1a1a1a;
    line-height: 1;
}

.card-suit {
    font-size: 3rem;
    margin-top: var(--spacing-sm);
}

.card-display.red .card-rank,
.card-display.red .card-suit {
    color: #c0392b;
}

.feedback-display {
    margin-top: var(--spacing-md);
    font-size: 1.2rem;
    font-weight: 700;
    min-height: 30px;
    transition: opacity 0.2s ease;
}

.feedback-display.correct {
    color: var(--accent-green);
}

.feedback-display.wrong {
    color: var(--accent-red);
}

/* Answer Buttons */
.answer-buttons {
    display: flex;
    justify-content: center;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
}

.answer-btn {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 3px solid;
    font-size: 2rem;
    font-weight: 700;
    cursor: pointer;
    transition: all var(--transition-fast);
    background: var(--bg-card);
}

.answer-btn.plus {
    border-color: var(--accent-green);
    color: var(--accent-green);
}

.answer-btn.zero {
    border-color: var(--text-dim);
    color: var(--text-dim);
}

.answer-btn.minus {
    border-color: var(--accent-red);
    color: var(--accent-red);
}

.answer-btn:hover {
    transform: scale(1.1);
}

.answer-btn:active {
    transform: scale(0.95);
}

.answer-btn.plus:hover { background: rgba(46, 204, 113, 0.2); }
.answer-btn.zero:hover { background: rgba(127, 140, 141, 0.2); }
.answer-btn.minus:hover { background: rgba(231, 76, 60, 0.2); }

.answer-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

/* Speed Indicator */
.speed-indicator {
    text-align: center;
    font-size: 0.85rem;
    color: var(--text-dim);
}

#speed-value {
    color: var(--accent-gold);
    font-family: 'JetBrains Mono', monospace;
}

/* Results Screen */
.results-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
}

.result-card {
    background: var(--bg-card);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);
    text-align: center;
    border: 1px solid var(--border-subtle);
}

.result-label {
    display: block;
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-sm);
}

.result-value {
    display: block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 2rem;
    font-weight: 700;
    color: var(--accent-gold);
}

.results-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: center;
}

@media (max-width: 500px) {
    .pacing-options {
        grid-template-columns: 1fr;
    }

    .game-header {
        flex-wrap: wrap;
    }

    .stat-box {
        min-width: 80px;
        padding: var(--spacing-sm) var(--spacing-md);
    }

    .answer-btn {
        width: 80px;
        height: 80px;
        font-size: 1.5rem;
    }

    .card-display {
        width: 120px;
        height: 170px;
    }

    .card-rank {
        font-size: 3rem;
    }
}
```

**Step 2: Commit**

```bash
git add blackjack/practice/easy/css/easy.css
git commit -m "feat(practice): add easy mode styling"
```

---

## Task 8: Create Easy Mode - JavaScript Logic

**Files:**
- Create: `blackjack/practice/easy/js/easy-mode.js`

**Step 1: Create easy-mode.js**

```javascript
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
```

**Step 2: Test in browser**

Open `blackjack/practice/easy/index.html` and verify:
- Pacing selection works
- Start button begins game
- Cards display correctly
- Answer buttons work
- Timer counts down
- Results show at end

**Step 3: Commit**

```bash
git add blackjack/practice/easy/js/easy-mode.js
git commit -m "feat(practice): add easy mode game logic"
```

---

## Remaining Tasks (Summary)

The plan continues with these additional tasks:

- **Task 9:** Medium Mode - HTML structure
- **Task 10:** Medium Mode - CSS styling
- **Task 11:** Medium Mode - JavaScript (game logic, count check modal, card replay)
- **Task 12:** Hard Mode - HTML structure
- **Task 13:** Hard Mode - CSS styling
- **Task 14:** Hard Mode - JavaScript (AI player logic, 5-second timer)
- **Task 15:** Progress Page - HTML/CSS
- **Task 16:** Progress Page - JavaScript (charts, stats display)
- **Task 17:** Integration testing and bug fixes
- **Task 18:** Final commit and cleanup

Each task follows the same pattern: exact file paths, complete code, verification steps, and atomic commits.

---

## Execution Notes

After completing Tasks 1-8 (Easy Mode), verify:
1. Practice mode accessible from blackjack landing page
2. Easy mode fully functional with both pacing options
3. Stats saving to localStorage
4. No console errors

Then proceed with Medium and Hard modes following the same pattern.
