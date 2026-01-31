# Blackjack Card Counting Application - Design Document

**Date:** 2026-01-28
**Status:** Approved
**Author:** Brainstorming Session

---

## 1. Overview

A comprehensive blackjack card counting tool with three game modes:
1. **Normal Shoe** - Standard card counting for shoe games
2. **Smart Shuffler** - Continuous shuffle machine (CSM) tracking with pattern detection
3. **Free Bet Blackjack** - Push-22 variant with free doubles/splits

### Design Goals
- Accurate Hi-Lo card counting calculations
- Real-time EV and optimal bet recommendations
- Interactive table simulation with multi-seat tracking
- Comprehensive session analytics
- Full responsive parity (desktop & mobile)

---

## 2. Architecture

### File Structure

```
/blackjack/
├── index.html                    # Game mode selector
├── css/
│   ├── variables.css             # Shared design tokens
│   ├── layout.css                # Common layout styles
│   ├── table.css                 # Table and seat styling
│   ├── cards.css                 # Card visuals
│   ├── hud.css                   # Counting HUD styles
│   └── responsive.css            # Mobile breakpoints
├── js/
│   ├── core/
│   │   ├── card-counting.js      # Hi-Lo calculation engine
│   │   ├── basic-strategy.js     # Optimal play decisions
│   │   ├── illustrious-18.js     # Strategy deviations
│   │   ├── kelly-criterion.js    # Bankroll calculations
│   │   └── ev-calculator.js      # Expected value per action
│   ├── shared/
│   │   ├── constants.js          # Game constants
│   │   ├── state.js              # State management
│   │   ├── storage.js            # localStorage utilities
│   │   └── utils.js              # Helper functions
│   └── ui/
│       ├── table-renderer.js     # Table UI rendering
│       ├── card-input.js         # Card selector logic
│       ├── hud-renderer.js       # Count display
│       └── session-summary.js    # End session reports
├── normal-shoe/
│   ├── index.html
│   └── js/
│       └── normal-shoe-game.js   # Normal shoe specific logic
├── smart-shuffler/
│   ├── index.html
│   └── js/
│       ├── smart-shuffler-game.js
│       ├── pattern-detector.js   # Pattern analysis
│       └── shuffle-tracker.js    # Shuffle-back handling
└── free-bet/
    ├── index.html
    └── js/
        ├── free-bet-game.js
        └── free-bet-strategy.js  # Push-22 adjusted strategy
```

### Data Persistence

| Data Type | Storage | Backup |
|-----------|---------|--------|
| Session state | localStorage | Auto-save every hand |
| Smart Shuffler patterns | localStorage | JSON export |
| Session history | localStorage | JSON/PDF export |
| User preferences | localStorage | Included in JSON |

---

## 3. Core Calculations

### 3.1 Hi-Lo Card Counting System

**Card Values:**
```javascript
const HI_LO_VALUES = {
  '2': +1, '3': +1, '4': +1, '5': +1, '6': +1,  // Low cards
  '7': 0,  '8': 0,  '9': 0,                      // Neutral
  '10': -1, 'J': -1, 'Q': -1, 'K': -1, 'A': -1  // High cards
};
```

**Running Count:**
```javascript
function updateRunningCount(card, currentCount) {
  return currentCount + HI_LO_VALUES[card.rank];
}
```

**True Count:**
```javascript
function calculateTrueCount(runningCount, decksRemaining) {
  // decksRemaining = (totalCards - dealtCards) / 52
  if (decksRemaining <= 0) return runningCount; // Edge case
  return runningCount / decksRemaining;
}

function getDecksRemaining(totalDecks, cardsDealt) {
  const totalCards = totalDecks * 52;
  const cardsRemaining = totalCards - cardsDealt;
  return cardsRemaining / 52;
}
```

**Deck Penetration:**
```javascript
function getDeckPenetration(totalDecks, cardsDealt) {
  const totalCards = totalDecks * 52;
  return cardsDealt / totalCards; // Returns 0.0 to 1.0
}
```

### 3.2 Kelly Criterion Bankroll Management

**Edge Calculation (approximate):**
```javascript
function calculatePlayerEdge(trueCount) {
  // Base house edge for 6-deck, S17, DAS: approximately -0.5%
  // Each +1 true count adds ~0.5% player edge
  const baseEdge = -0.005; // -0.5%
  const countBonus = trueCount * 0.005; // +0.5% per TC
  return baseEdge + countBonus;
}
```

**Kelly Bet Sizing:**
```javascript
function calculateKellyBet(edge, bankroll, kellyFraction = 1.0) {
  // Full Kelly: bet = edge / variance
  // For blackjack, simplified: bet = edge * bankroll
  // Using fractional Kelly for safety

  if (edge <= 0) return 0; // No edge, minimum bet

  const kellyBet = (edge * bankroll) * kellyFraction;
  return Math.max(0, kellyBet);
}

// Tiered recommendations
function getBuyinRecommendations(minBet, maxBet, hoursOfPlay = 4) {
  const handsPerHour = 60;
  const totalHands = handsPerHour * hoursOfPlay;
  const variance = 1.15; // Blackjack variance per hand

  // Risk of ruin calculation (simplified)
  function riskOfRuin(bankroll, avgBet, hands, variance) {
    const stdDev = avgBet * Math.sqrt(variance * hands);
    // Probability of losing entire bankroll
    return Math.exp(-2 * bankroll * 0.005 / (stdDev * stdDev / hands));
  }

  const avgBet = (minBet + maxBet) / 2;

  return {
    conservative: {
      label: 'Conservative (0.25 Kelly)',
      buyin: Math.round(maxBet * 100),
      riskOfRuin: '~2%',
      description: 'Low risk, longer sessions'
    },
    standard: {
      label: 'Standard (0.5 Kelly)',
      buyin: Math.round(maxBet * 50),
      riskOfRuin: '~8%',
      description: 'Balanced risk/reward'
    },
    aggressive: {
      label: 'Aggressive (Full Kelly)',
      buyin: Math.round(maxBet * 25),
      riskOfRuin: '~13%',
      description: 'Maximum growth potential'
    }
  };
}
```

**Bet Spread Calculation:**
```javascript
function getRecommendedBet(trueCount, minBet, maxBet, bankroll) {
  // Spread betting based on true count
  // TC <= 0: min bet
  // TC 1: 2 units
  // TC 2: 4 units
  // TC 3: 6 units
  // TC 4+: 8 units (or max)

  const unit = minBet;
  let betUnits;

  if (trueCount <= 0) {
    betUnits = 1;
  } else if (trueCount === 1) {
    betUnits = 2;
  } else if (trueCount === 2) {
    betUnits = 4;
  } else if (trueCount === 3) {
    betUnits = 6;
  } else {
    betUnits = 8;
  }

  const calculatedBet = unit * betUnits;

  // Cap at max bet and reasonable bankroll percentage
  const maxBankrollBet = bankroll * 0.05; // Never bet more than 5% of bankroll

  return Math.min(calculatedBet, maxBet, maxBankrollBet);
}
```

### 3.3 Basic Strategy Engine

**Hand Evaluation:**
```javascript
function evaluateHand(cards) {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === 'A') {
      aces++;
      total += 11;
    } else if (['K', 'Q', 'J'].includes(card.rank)) {
      total += 10;
    } else if (card.rank === '10') {
      total += 10;
    } else {
      total += parseInt(card.rank);
    }
  }

  // Adjust for aces
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return {
    total,
    isSoft: aces > 0 && total <= 21,
    isBust: total > 21,
    isBlackjack: cards.length === 2 && total === 21,
    isPair: cards.length === 2 && cards[0].rank === cards[1].rank
  };
}
```

**Basic Strategy Lookup:**
```javascript
// Strategy tables based on number of decks, S17/H17, DAS, etc.
const BASIC_STRATEGY = {
  // Hard totals: [playerTotal][dealerUpcard] = action
  hard: {
    17: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 'A': 'S' },
    16: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'Rs', 'A': 'Rh' },
    15: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'Rh', 'A': 'H' },
    14: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
    13: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
    12: { 2: 'H', 3: 'H', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
    11: { 2: 'D', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'D', 8: 'D', 9: 'D', 10: 'D', 'A': 'H' },
    10: { 2: 'D', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'D', 8: 'D', 9: 'D', 10: 'H', 'A': 'H' },
    9:  { 2: 'H', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
    8:  { 2: 'H', 3: 'H', 4: 'H', 5: 'H', 6: 'H', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
    // 5-7 always hit
  },

  // Soft totals
  soft: {
    20: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 'A': 'S' },
    19: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 'A': 'S' },
    18: { 2: 'S', 3: 'Ds', 4: 'Ds', 5: 'Ds', 6: 'Ds', 7: 'S', 8: 'S', 9: 'H', 10: 'H', 'A': 'H' },
    17: { 2: 'H', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
    16: { 2: 'H', 3: 'H', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
    15: { 2: 'H', 3: 'H', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
    14: { 2: 'H', 3: 'H', 4: 'H', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
    13: { 2: 'H', 3: 'H', 4: 'H', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
  },

  // Pairs
  pairs: {
    'A': { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P', 9: 'P', 10: 'P', 'A': 'P' },
    '10': { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 'A': 'S' },
    '9': { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'S', 8: 'P', 9: 'P', 10: 'S', 'A': 'S' },
    '8': { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P', 9: 'P', 10: 'P', 'A': 'Rp' },
    '7': { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
    '6': { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
    '5': { 2: 'D', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'D', 8: 'D', 9: 'D', 10: 'H', 'A': 'H' },
    '4': { 2: 'H', 3: 'H', 4: 'H', 5: 'P', 6: 'P', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
    '3': { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
    '2': { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'H', 9: 'H', 10: 'H', 'A': 'H' },
  }
};

// Legend: H=Hit, S=Stand, D=Double, P=Split, Rs=Surrender/Stand, Rh=Surrender/Hit, Rp=Surrender/Split, Ds=Double/Stand
```

### 3.4 Illustrious 18 Deviations

**Key Deviations by True Count:**
```javascript
const ILLUSTRIOUS_18 = [
  // Format: { hand, dealer, index, basicAction, deviationAction, description }
  { hand: 'insurance', dealer: 'A', index: 3, basic: 'N', deviation: 'Y', desc: 'Take insurance at TC >= +3' },
  { hand: '16', dealer: '10', index: 0, basic: 'H', deviation: 'S', desc: 'Stand on 16 vs 10 at TC >= 0' },
  { hand: '15', dealer: '10', index: 4, basic: 'H', deviation: 'S', desc: 'Stand on 15 vs 10 at TC >= +4' },
  { hand: '10,10', dealer: '5', index: 5, basic: 'S', deviation: 'P', desc: 'Split 10s vs 5 at TC >= +5' },
  { hand: '10,10', dealer: '6', index: 4, basic: 'S', deviation: 'P', desc: 'Split 10s vs 6 at TC >= +4' },
  { hand: '10', dealer: '10', index: 4, basic: 'H', deviation: 'D', desc: 'Double 10 vs 10 at TC >= +4' },
  { hand: '12', dealer: '3', index: 2, basic: 'H', deviation: 'S', desc: 'Stand on 12 vs 3 at TC >= +2' },
  { hand: '12', dealer: '2', index: 3, basic: 'H', deviation: 'S', desc: 'Stand on 12 vs 2 at TC >= +3' },
  { hand: '11', dealer: 'A', index: 1, basic: 'H', deviation: 'D', desc: 'Double 11 vs A at TC >= +1' },
  { hand: '9', dealer: '2', index: 1, basic: 'H', deviation: 'D', desc: 'Double 9 vs 2 at TC >= +1' },
  { hand: '10', dealer: 'A', index: 4, basic: 'H', deviation: 'D', desc: 'Double 10 vs A at TC >= +4' },
  { hand: '9', dealer: '7', index: 3, basic: 'H', deviation: 'D', desc: 'Double 9 vs 7 at TC >= +3' },
  { hand: '16', dealer: '9', index: 5, basic: 'H', deviation: 'S', desc: 'Stand on 16 vs 9 at TC >= +5' },
  { hand: '13', dealer: '2', index: -1, basic: 'S', deviation: 'H', desc: 'Hit 13 vs 2 at TC <= -1' },
  { hand: '12', dealer: '4', index: 0, basic: 'S', deviation: 'H', desc: 'Hit 12 vs 4 at TC < 0' },
  { hand: '12', dealer: '5', index: -2, basic: 'S', deviation: 'H', desc: 'Hit 12 vs 5 at TC <= -2' },
  { hand: '12', dealer: '6', index: -1, basic: 'S', deviation: 'H', desc: 'Hit 12 vs 6 at TC <= -1' },
  { hand: '13', dealer: '3', index: -2, basic: 'S', deviation: 'H', desc: 'Hit 13 vs 3 at TC <= -2' },
];

function checkDeviation(playerHand, dealerUpcard, trueCount, enableDeviations) {
  if (!enableDeviations) return null;

  for (const deviation of ILLUSTRIOUS_18) {
    if (matchesHand(playerHand, deviation.hand) && matchesDealer(dealerUpcard, deviation.dealer)) {
      const isPositiveDeviation = deviation.index >= 0;
      const shouldDeviate = isPositiveDeviation
        ? trueCount >= deviation.index
        : trueCount <= deviation.index;

      if (shouldDeviate) {
        return {
          action: deviation.deviation,
          basicAction: deviation.basic,
          index: deviation.index,
          description: deviation.desc
        };
      }
    }
  }
  return null;
}
```

### 3.5 EV Calculation Per Action

**Simplified EV Estimation:**
```javascript
function calculateActionEV(playerHand, dealerUpcard, action, trueCount, deckComposition) {
  // This uses pre-computed EV tables adjusted for true count
  // Full implementation would use Monte Carlo simulation

  const baseEV = getBaseEV(playerHand, dealerUpcard, action);
  const countAdjustment = getCountAdjustment(action, trueCount);

  return baseEV + countAdjustment;
}

// Returns EV for all possible actions
function getAllActionsEV(playerHand, dealerUpcard, trueCount, canDouble, canSplit, canSurrender) {
  const actions = [];

  actions.push({ action: 'HIT', ev: calculateActionEV(playerHand, dealerUpcard, 'HIT', trueCount) });
  actions.push({ action: 'STAND', ev: calculateActionEV(playerHand, dealerUpcard, 'STAND', trueCount) });

  if (canDouble) {
    actions.push({ action: 'DOUBLE', ev: calculateActionEV(playerHand, dealerUpcard, 'DOUBLE', trueCount) });
  }

  if (canSplit) {
    actions.push({ action: 'SPLIT', ev: calculateActionEV(playerHand, dealerUpcard, 'SPLIT', trueCount) });
  }

  if (canSurrender) {
    actions.push({ action: 'SURRENDER', ev: calculateActionEV(playerHand, dealerUpcard, 'SURRENDER', trueCount) });
  }

  // Sort by EV descending
  actions.sort((a, b) => b.ev - a.ev);

  return actions;
}
```

---

## 4. Game Mode Specifications

### 4.1 Normal Shoe Mode

**Configuration:**
- Decks: 1, 2, 4, 6, 8
- Dealer style: European (No Hole Card) / American (Hole Card)
- Dealer rule: Stand on 17 (S17) / Hit on 17 (H17)
- Surrender: Yes / No
- Double After Split (DAS): Yes / No

**Flow:**
1. Setup screen with configuration
2. Deal cards to occupied seats + dealer
3. Player actions for "My Seats"
4. Auto-track other players' cards
5. Dealer plays per rules
6. Results and bankroll update
7. Recommendation panel for next hand

### 4.2 Smart Shuffler Mode

**Additional Configuration:**
- Load previous session data
- Pattern detection sensitivity

**Shuffle-Back Logic:**
```javascript
const shuffleState = {
  cardsInShoe: [],        // Cards currently in shuffler
  cardsInDiscard: [],     // Dead cards on table
  cardsInBuffer: [],      // 3-card buffer (unaffected by shuffle)
  bufferRemaining: 0,     // Countdown of buffer cards
  totalHandsTracked: 0,
  shuffleEvents: [],
  detectedPatterns: []
};

function shuffleBack(includeCurrentRound) {
  const cardsToReturn = includeCurrentRound
    ? [...shuffleState.cardsInDiscard, ...getCurrentRoundCards()]
    : [...shuffleState.cardsInDiscard];

  // Mark next 3 cards as buffered (unaffected)
  shuffleState.bufferRemaining = 3;

  // Return cards to shoe (marked as "shuffled")
  for (const card of cardsToReturn) {
    card.status = 'shuffled';
    shuffleState.cardsInShoe.push(card);
  }

  // Clear discard
  if (includeCurrentRound) {
    shuffleState.cardsInDiscard = [];
  } else {
    shuffleState.cardsInDiscard = getCurrentRoundCards();
  }

  // Log shuffle event for pattern detection
  shuffleState.shuffleEvents.push({
    timestamp: Date.now(),
    cardsReturned: cardsToReturn.length,
    includeCurrentRound,
    nextCardsDealt: [] // Will be filled as cards are dealt
  });

  analyzePatterns();
}

function dealCard(card) {
  // Track buffer
  if (shuffleState.bufferRemaining > 0) {
    shuffleState.bufferRemaining--;
    card.wasBuffered = true;
  }

  // Log for pattern analysis
  const lastShuffle = shuffleState.shuffleEvents[shuffleState.shuffleEvents.length - 1];
  if (lastShuffle && lastShuffle.nextCardsDealt.length < 20) {
    lastShuffle.nextCardsDealt.push(card);
  }
}
```

**Pattern Detection (Future AI Enhancement Ready):**
```javascript
function analyzePatterns() {
  const patterns = [];

  // Check for card clustering after shuffles
  // Check for position bias
  // Check for sequential patterns
  // Calculate randomness score

  const randomnessScore = calculateRandomnessScore(shuffleState.shuffleEvents);

  shuffleState.detectedPatterns = patterns;
  shuffleState.randomnessScore = randomnessScore;
}
```

### 4.3 Free Bet Blackjack Mode

**Rule Differences:**
- Free double on hard 9, 10, 11 (house covers the bet)
- Free split on all pairs EXCEPT 10-value cards
- Dealer 22 pushes all hands (except blackjack still pays)
- Blackjack pays 3:2

**Adjusted Strategy:**
```javascript
const FREE_BET_STRATEGY = {
  // More aggressive doubling since it's free
  freeDoubleHands: [9, 10, 11], // Hard totals that get free doubles
  freeSplitPairs: ['A', '2', '3', '4', '5', '6', '7', '8', '9'], // Not 10s

  // Adjustments for push-22 rule
  // Player should be slightly more aggressive knowing dealer 22 = push
};

function isFreeBetAvailable(hand, action) {
  if (action === 'DOUBLE') {
    const { total, isSoft } = evaluateHand(hand);
    return !isSoft && FREE_BET_STRATEGY.freeDoubleHands.includes(total);
  }
  if (action === 'SPLIT') {
    if (hand.length !== 2) return false;
    const rank = hand[0].rank;
    return FREE_BET_STRATEGY.freeSplitPairs.includes(rank);
  }
  return false;
}
```

---

## 5. User Interface Specifications

### 5.1 Initial Setup Screen

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                    BLACKJACK SETUP                          │
│                    [Normal Shoe]                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GAME RULES                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Decks: [6 ▼]    │  │ Dealer: [S17 ▼] │                  │
│  └─────────────────┘  └─────────────────┘                  │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Style: [American ▼] │ Surrender: [Yes ▼] │               │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  BETTING LIMITS                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Min Bet: [$25]  │  │ Max Bet: [$300] │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  TABLE SETUP                                                │
│  Active Doors: [○ ○ ● ● ● ○ ○]  (3 occupied)               │
│                                                             │
│  ADVANCED                                                   │
│  [✓] Show Illustrious 18 Deviations                        │
│                                                             │
│  BUYIN RECOMMENDATION                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Conservative  $7,500   ~2% risk    [Recommended]  │   │
│  │ ○ Standard      $3,750   ~8% risk                   │   │
│  │ ○ Aggressive    $1,875   ~13% risk                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Your Buyin: [$________]                                    │
│                                                             │
│                    [START GAME]                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Table Layout

**Desktop View (1200px+):**
```
┌──────────────────────────────────────────────────────────────────────────┐
│  6 Decks │ S17 │ American │ Min $25 │ Max $300 │ Bankroll: $1,847    ⚙️  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                              DEALER                                      │
│                          ┌────┐ ┌────┐                                  │
│                          │ 10 │ │ ?? │                                  │
│                          └────┘ └────┘                                  │
│                           Total: 10                                      │
│                                                                          │
│    ┌───┐   ┌───┐   ┌───┐   ┌───┐   ┌───┐   ┌───┐   ┌───┐              │
│    │ 1 │   │ 2 │   │ 3 │   │ 4 │   │ 5 │   │ 6 │   │ 7 │              │
│    │   │   │ ★ │   │   │   │───│   │ ★ │   │───│   │   │              │
│    │ ⬡ │   │$50│   │ ⬡ │   │   │   │$75│   │   │   │ ⬡ │              │
│    └───┘   └───┘   └───┘   └───┘   └───┘   └───┘   └───┘              │
│            K♠ 6♦           empty   Q♥ Q♦          empty   8♣ 3♦        │
│             =16                     =20                    =11          │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                          ┌─────────────┐ │
│  ┌──────────────────────────────────────────────────┐   │ RC: +7      │ │
│  │  A   2   3   4   5   6   7   8   9   10  J  Q  K │   │ TC: +3.5    │ │
│  │ [4] [3] [4] [2] [3] [4] [4] [4] [4] [14][4][4][4]│   │ Decks: 4.2  │ │
│  └──────────────────────────────────────────────────┘   │ ████████░░  │ │
│                                                          └─────────────┘ │
├──────────────────────────────────────────────────────────────────────────┤
│  ▼ History (12 hands)                                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Decision Overlay

**When it's your turn:**
```
┌─────────────────────────────────────────────────────────────┐
│  SEAT 2 - YOUR HAND                           $50 bet      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│        ┌────┐ ┌────┐                                       │
│        │ K♠ │ │ 6♦ │         = 16                          │
│        └────┘ └────┘                                       │
│                                                             │
│                    vs Dealer: 10                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ✓ [STAND]     +0.8% EV   ← OPTIMAL                       │
│     [HIT]       -2.1% EV                                   │
│     [SURRENDER] -4.0% EV                                   │
│                                                             │
│   ⚡ DEVIATION ALERT                                        │
│   Basic strategy says HIT, but TC +4 says STAND            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Between-Hands Recommendation Panel

```
┌─────────────────────────────────────────────────────────────┐
│  NEXT HAND RECOMMENDATION                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TRUE COUNT: +3.5              PLAYER EDGE: +1.2%          │
│                                                             │
│  ╔═══════════════════════════════════════════════════════╗ │
│  ║  RECOMMENDED BET: $150                                ║ │
│  ║  (6 units • based on TC +3.5 and 1-8 spread)         ║ │
│  ╚═══════════════════════════════════════════════════════╝ │
│                                                             │
│  Session: +$247 (+15.4%)      Bankroll: $1,847             │
│  Hands: 47                    Win Rate: 52.3%              │
│                                                             │
│                     [DEAL NEXT HAND]                        │
└─────────────────────────────────────────────────────────────┘
```

### 5.5 Mobile Layout (< 768px)

```
┌────────────────────────────┐
│ RC:+7 │ TC:+3.5 │ $1,847 ⚙️│
├────────────────────────────┤
│       DEALER: 10 + ??      │
│                            │
│ [1] [2★] [3] [4] [5★] [6] [7]│
│      ↑              ↑       │
│    Your seats               │
├────────────────────────────┤
│  YOUR HAND: K♠ 6♦ = 16     │
│  vs Dealer: 10              │
│                             │
│  ✓[STAND]  [HIT]  [SURR]   │
│   +0.8%    -2.1%  -4.0%    │
│                             │
│  ⚡ TC+4: Stand beats Hit   │
├────────────────────────────┤
│ [A][2][3][4][5][6][7]      │
│ [8][9][10][J][Q][K]        │
├────────────────────────────┤
│ Bet: $150 │ Edge: +1.2%    │
│ ▼ History                   │
└────────────────────────────┘
```

---

## 6. Session Management

### 6.1 Session State

```javascript
const sessionState = {
  // Configuration
  config: {
    gameMode: 'normal-shoe', // 'smart-shuffler', 'free-bet'
    decks: 6,
    dealerStyle: 'american', // 'european'
    dealerHits: 'S17', // 'H17'
    surrenderAllowed: true,
    showDeviations: true,
    minBet: 25,
    maxBet: 300
  },

  // Bankroll
  bankroll: {
    initial: 1600,
    current: 1847,
    sessionProfit: 247
  },

  // Counting
  count: {
    running: 7,
    cardsDealt: 94,
    decksRemaining: 4.2
  },

  // Table
  table: {
    seats: [
      { id: 1, status: 'occupied', isMine: false, cards: [], bet: 0 },
      { id: 2, status: 'occupied', isMine: true, cards: ['K♠', '6♦'], bet: 50 },
      // ... etc
    ],
    dealer: {
      cards: ['10♣'],
      holeCard: null // Hidden until revealed
    }
  },

  // History
  history: {
    hands: [],
    totalHands: 47,
    wins: 24,
    losses: 17,
    pushes: 6
  }
};
```

### 6.2 Session Summary Report

**Exportable Data (JSON):**
```javascript
const sessionReport = {
  metadata: {
    date: '2026-01-28',
    duration: '2h 14m',
    gameMode: 'normal-shoe',
    config: { /* ... */ }
  },
  financial: {
    startingBankroll: 1600,
    endingBankroll: 2147,
    profitLoss: 547,
    profitPercent: 34.2,
    totalWagered: 12450
  },
  performance: {
    handsPlayed: 127,
    wins: 58,
    losses: 52,
    pushes: 17,
    blackjacks: 7,
    winRate: 0.523
  },
  decisions: {
    totalDecisions: 127,
    optimalPlays: 119,
    accuracy: 0.937,
    deviationsUsed: 9,
    correctDeviations: 8,
    estimatedCostOfErrors: 42
  },
  counting: {
    peakTrueCount: 5.2,
    lowestTrueCount: -3.8,
    avgBetAtPositiveTC: 187,
    avgBetAtNegativeTC: 31,
    betSpreadEfficiency: 0.87
  },
  handHistory: [
    // Full hand-by-hand log
  ]
};
```

---

## 7. Visual Design

### 7.1 Color Palette

```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-card: #1a1a25;
  --bg-card-hover: #22222f;

  /* Accent Colors */
  --accent-gold: #d4af37;
  --accent-gold-dim: #b8960c;
  --accent-red: #e63946;
  --accent-blue: #3498db;
  --accent-green: #2ecc71;
  --accent-purple: #9b59b6;

  /* Text */
  --text-primary: #f0f0f0;
  --text-secondary: #a0a0a0;
  --text-dim: #606070;

  /* Semantic */
  --positive-ev: #2ecc71;
  --negative-ev: #e63946;
  --neutral: #a0a0a0;
  --my-seat: #d4af37;
  --other-seat: #3498db;
  --empty-seat: #404050;
}
```

### 7.2 Typography

```css
:root {
  --font-display: 'Orbitron', sans-serif;   /* Titles, headers */
  --font-body: 'Rajdhani', sans-serif;       /* Body text, UI */
  --font-mono: 'JetBrains Mono', monospace;  /* Numbers, stats, counts */
}
```

### 7.3 Card Design

**Digital/Modern Style:**
- Dark card background (#1a1a25) with gold border
- Large, clear rank in center
- Suit icon in corners
- Face cards: Stylized geometric designs in gold/purple
- Subtle glow effect on dealt cards

---

## 8. Implementation Phases

### Phase 1: Core Infrastructure
- [ ] File structure setup
- [ ] CSS variables and base styles
- [ ] Card counting engine (Hi-Lo)
- [ ] Basic strategy lookup tables
- [ ] Hand evaluation logic

### Phase 2: Normal Shoe Mode
- [ ] Setup screen UI
- [ ] Table rendering
- [ ] Card input selector
- [ ] Seat management (toggle occupied/mine/empty)
- [ ] Dealing flow
- [ ] Decision overlay with EV
- [ ] Count HUD
- [ ] Basic strategy recommendations

### Phase 3: Illustrious 18 & Bet Sizing
- [ ] Deviation detection
- [ ] Kelly Criterion calculations
- [ ] Bet recommendations
- [ ] Bankroll tracking

### Phase 4: Session Management
- [ ] Hand history tracking
- [ ] Session state persistence
- [ ] End session summary
- [ ] Export (JSON/PDF)
- [ ] Historical comparison

### Phase 5: Smart Shuffler Mode
- [ ] Exact card tracking (rank + suit)
- [ ] Shuffle-back buttons
- [ ] 3-card buffer logic
- [ ] Pattern detection framework
- [ ] Long-term data persistence

### Phase 6: Free Bet Mode
- [ ] Push-22 rule implementation
- [ ] Free double/split detection
- [ ] Adjusted strategy tables
- [ ] Free bet UI indicators

### Phase 7: Polish & Mobile
- [ ] Responsive breakpoints
- [ ] Touch optimizations
- [ ] Animations and transitions
- [ ] Cross-browser testing

---

## 9. Testing Requirements

### Calculation Accuracy Tests
- [ ] Hi-Lo count values correct for all cards
- [ ] True count division accurate
- [ ] Basic strategy matches published charts
- [ ] Illustrious 18 triggers at correct indices
- [ ] Kelly bet sizing within expected ranges
- [ ] EV calculations match reference tables

### UI/UX Tests
- [ ] All seat states toggle correctly
- [ ] Card input updates count in real-time
- [ ] Recommendations display correctly
- [ ] Responsive layouts work on all breakpoints
- [ ] Session data persists across page reloads

---

## 10. Sources & References

- [Wizard of Odds - Hi-Lo Card Counting](https://wizardofodds.com/games/blackjack/card-counting/high-low/)
- [Blackjack Apprenticeship - How to Count Cards](https://www.blackjackapprenticeship.com/how-to-count-cards/)
- [Wizard of Odds - Free Bet Blackjack](https://wizardofodds.com/games/free-bet-blackjack/)
- [Wikipedia - Card Counting](https://en.wikipedia.org/wiki/Card_counting)
- Don Schlesinger - "Blackjack Attack"
- Stanford Wong - "Professional Blackjack"

---

**Document Status:** Approved and ready for implementation
