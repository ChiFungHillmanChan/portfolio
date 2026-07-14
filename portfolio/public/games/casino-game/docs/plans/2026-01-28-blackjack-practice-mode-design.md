# Blackjack Practice Mode Design

## Overview

Add a Practice Mode to the blackjack game for training card counting skills using the Hi-Lo system. Three difficulty levels progressively build counting ability from basic recognition to full-table chaos.

## Navigation & Entry Point

### Main Landing Page (`blackjack/index.html`)
- Add "Practice Mode" card/button alongside existing game modes
- Links to `blackjack/practice/index.html`

### Practice Mode Selection (`blackjack/practice/index.html`)
- Title: "Card Counting Practice"
- Description: "Master the Hi-Lo system"
- Three mode cards:
  - **Easy** - "Flash Cards" - "Identify card values one by one"
  - **Medium** - "1v1 Dealer" - "Play heads-up while tracking count"
  - **Hard** - "Full Table" - "5-player chaos, 5-second answers"
- Progress button linking to stats screen

## File Structure

```
blackjack/practice/
├── index.html              # Mode selection
├── easy/
│   ├── index.html
│   └── css/easy.css
├── medium/
│   ├── index.html
│   └── css/medium.css
├── hard/
│   ├── index.html
│   └── css/hard.css
├── progress/
│   ├── index.html
│   └── css/progress.css
├── css/
│   └── shared.css          # Shared styles (buttons, colors, variables)
└── js/
    ├── practice-state.js   # Practice-specific state management
    ├── practice-stats.js   # Stats tracking & localStorage
    └── countdown-timer.js  # Shared timer component
```

---

## Easy Mode

### Purpose
Train card value recognition (Hi-Lo: 2-6 = +1, 7-9 = 0, 10-A = -1)

### Screen Layout
- **Top bar**: Timer (60s countdown), Score (correct/total), Current streak
- **Center**: Large card display (rank + suit, styled like real card)
- **Bottom**: Three buttons - `+1` (green), `0` (gray), `-1` (red)

### Pacing Options (user selects before starting)
1. **Auto-deal (Adaptive Speed)**
   - Starts at 3 seconds per card
   - Consecutive correct answers (5+) reduce interval by 0.25s
   - Minimum interval: 0.75s
   - Wrong answer resets speed to initial

2. **Manual (User-paced)**
   - User clicks to reveal next card
   - Unlimited time per card
   - 60-second overall timer still applies

### Flow
1. Select Auto-deal or Manual
2. Press "Start"
3. Card appears → User taps +1/0/-1
4. Feedback:
   - Correct: Green flash, streak increases
   - Wrong: Red flash, show correct value briefly, streak resets
5. Timer hits 0 → Session ends → Results screen

### Results Screen
- Cards seen, correct answers, accuracy %
- Best streak, average speed
- "Try Again" / "Back to Menu" buttons

---

## Medium Mode

### Purpose
Practice counting during actual 1v1 blackjack play

### Screen Layout
- **Top bar**: Running count (hidden until asked), Cards dealt counter, Hands played
- **Center**: Standard blackjack table - dealer top, single player seat bottom
- **Bottom**: Action buttons (Hit, Stand, Double, Split, Surrender)
- **Card input**: Reuse existing card picker from normal-shoe mode

### Flow
1. User deals cards using card picker
2. User plays hand normally (hit/stand/double/split)
3. User deals dealer cards
4. Hand resolves → **Count Check Modal**:
   - "What is the running count?"
   - Number input field (or +/- stepper)
   - Submit button
5. Feedback:
   - **Correct**: Green checkmark, "Correct! Running count: +4"
   - **Wrong**: Red X, correct count shown, **Card Replay**:
     - All cards from hand shown with Hi-Lo values
     - e.g., "Player: K(-1), 5(+1), 8(0) | Dealer: 6(+1), 10(-1), 7(0)"
6. Click "Continue" → Next hand
7. 75% deck penetration → Option to reshuffle

### Stats Tracked
- Count accuracy %
- Hands played
- Blackjack win/loss record

---

## Hard Mode

### Purpose
Count cards under real casino conditions - multiple players, time pressure

### Screen Layout
- **Top bar**: Running count (hidden), Cards dealt, Hands played, 5-second countdown
- **Center**: Full table with 5 seats
  - Seats 1-4: AI players (auto-play with basic strategy)
  - Seat 5 (far right): User's seat
- **Bottom**: Action buttons for user's hand, card input picker

### Flow
1. User deals 2 cards to each of 5 seats + dealer (10 player cards + 1 upcard)
2. **AI Seats Play (Seats 1-4)**:
   - Each seat plays using basic strategy
   - Decisions shown briefly ("Seat 1: Hit → 7")
   - User deals cards as AI requests them
3. **User Plays Seat 5**: Normal blackjack decisions
4. **Dealer Plays**: User deals cards
5. Hand resolves → **5-Second Count Check**:
   - Modal with prominent countdown (5...4...3...2...1)
   - Number input field
   - Auto-submits when timer expires (empty = wrong)
6. Feedback:
   - **Correct**: Quick green flash
   - **Wrong/Timeout**: Red flash, correct count, **Card Replay** showing all 5 hands + dealer with Hi-Lo values
7. "Continue" → Next round

### AI Decision Display
- Small text above each AI seat showing action: "Hit", "Stand", "Double", "Split"
- Maintains pace while showing all cards dealt

---

## Progress & Statistics Screen

### Location
`blackjack/practice/progress/index.html`

### Summary Cards (top row)
- Total practice sessions
- Overall accuracy %
- Best streak (all-time)
- Total cards counted

### Mode-Specific Stats (tabbed sections)

| Easy Mode | Medium Mode | Hard Mode |
|-----------|-------------|-----------|
| Avg cards/minute | Count accuracy % | Count accuracy % |
| Best 60s score | Hands played | Hands played |
| Max adaptive speed reached | Blackjack win rate | Blackjack win rate |
| Accuracy % | Avg response time | Timeout rate |

### Session History
- List of recent sessions (date, mode, score, accuracy)
- Click for session details

### Progress Chart
- Line graph: accuracy % over time (last 10-20 sessions)
- Separate lines per mode

### Actions
- "Clear History" button (with confirmation)
- "Export Stats" (optional - JSON download)

### Storage Keys
```javascript
localStorage:
  - blackjack_practice_easy_stats
  - blackjack_practice_medium_stats
  - blackjack_practice_hard_stats
  - blackjack_practice_sessions  // array of session records
```

---

## Technical Notes

### Card Counting System
- **Hi-Lo only** (already implemented in `blackjack/js/core/card-counting.js`)
- 2-6 = +1, 7-9 = 0, 10-A = -1

### Reusable Components from Existing Codebase
- `TableRenderer` - Table display (medium/hard modes)
- `HandEvaluation` - Calculate hand totals
- `BasicStrategy` - AI player decisions (hard mode)
- `CardCounting` - Hi-Lo calculations
- Card input picker UI
- Card styling/display

### New Components Needed
- Countdown timer with visual display
- Count check modal
- Card replay component
- Adaptive speed controller
- Stats persistence layer
- Progress charts (simple CSS or Chart.js)

---

## Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Entry point | Separate page on landing | Keeps normal game uncluttered |
| Counting system | Hi-Lo only | Already implemented, most common |
| Easy mode pacing | User choice: auto or manual | Flexibility for different learning styles |
| Auto-deal speed | Adaptive (speeds up with streaks) | Natural progression, gamification |
| Wrong answer handling | Show correct + card replay | Turns errors into learning moments |
| User role in Medium/Hard | Plays their hand | Trains real dual-task skill |
| Hard mode AI | Basic strategy auto-play | Realistic card volume and pace |
| Stats | Persistent with history | Motivates improvement over time |
