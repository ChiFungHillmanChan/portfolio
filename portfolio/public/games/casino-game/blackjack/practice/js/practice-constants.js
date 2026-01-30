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
