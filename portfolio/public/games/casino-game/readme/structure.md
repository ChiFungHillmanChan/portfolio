# Casino Game Calculator - Code Structure

This document tracks all functions, components, and modules in the codebase to prevent duplication and promote reuse.

---

## Roulette Module (`/roulette`)

### Core Functions (`/roulette/js/core/`)

#### constants.js
| Function/Constant | Purpose | Location |
|------------------|---------|----------|
| `ROULETTE_TYPES` | European and American roulette configurations | constants.js |
| `PAYOUTS` | Payout ratios for all bet types | constants.js |
| `BET_COVERAGE` | Number of winning pockets per bet type | constants.js |
| `RED_NUMBERS` | Set of red numbers (1-36) | constants.js |
| `BLACK_NUMBERS` | Set of black numbers (1-36) | constants.js |
| `CHIP_DENOMINATIONS` | Available chip values | constants.js |
| `TABLE_LAYOUT` | Number arrangement for table rendering | constants.js |
| `COLUMNS` | Column bet number groups | constants.js |
| `DOZENS` | Dozen bet number groups | constants.js |
| `STREETS` | Street bet definitions | constants.js |
| `CORNERS` | Corner bet definitions | constants.js |
| `LINES` | Line bet definitions | constants.js |
| `TRIO_BETS` | Trio bets including zero (0-1-2, 0-2-3), pays 11:1 | constants.js |
| `VOISINS_DU_ZERO` | Voisins du Zéro call bet definition (17 numbers, 9 chips) | constants.js |
| `TIERS_DU_CYLINDRE` | Tiers du Cylindre call bet definition (12 numbers, 6 chips) | constants.js |
| `ORPHELINS` | Orphelins call bet definition (8 numbers, 5 chips) | constants.js |
| `JEU_ZERO` | Jeu Zéro call bet definition (7 numbers, 4 chips) | constants.js |
| `CALL_BETS` | All call bets combined for easy iteration | constants.js |
| `NEIGHBOUR_BET_CONFIG` | Neighbour bet configuration (min/max/default range) | constants.js |
| `getWheelNeighbours(number, range, sequence)` | Get neighbours of a number on the wheel | constants.js |
| `getWheelSection(number)` | Get wheel section for a number (voisins/tiers/orphelins) | constants.js |

#### calculations.js
| Function | Purpose | Location |
|----------|---------|----------|
| `getNumberColor(num)` | Get color (red/black/green) for a number | calculations.js |
| `isEven(num)` | Check if number is even | calculations.js |
| `isOdd(num)` | Check if number is odd | calculations.js |
| `isLow(num)` | Check if number is 1-18 | calculations.js |
| `isHigh(num)` | Check if number is 19-36 | calculations.js |
| `getColumn(num)` | Get column (1/2/3) for a number | calculations.js |
| `getDozen(num)` | Get dozen (1/2/3) for a number | calculations.js |
| `calculateProbability(winning, total)` | Calculate win probability | calculations.js |
| `calculateExpectedValue(payout, winning, total)` | Calculate EV for a bet | calculations.js |
| `calculateWinnings(betAmount, payoutRatio)` | Calculate total return | calculations.js |
| `calculateProfit(betAmount, payoutRatio)` | Calculate profit only | calculations.js |
| `isBetWinner(result, betType, betValue, type)` | Check if bet wins | calculations.js |
| `getPayoutForBet(betType)` | Get payout ratio for bet type | calculations.js |
| `resolveAllBets(result, placedBets, type)` | Resolve all bets for a spin | calculations.js |
| `calculateTotalWagered(placedBets)` | Sum all wagered amounts | calculations.js |
| `validateBetAmount(amount, min, max)` | Validate bet within limits | calculations.js |
| `canAffordBet(amount, stack, wagered)` | Check if player can afford bet | calculations.js |

#### wheel-physics.js
| Function | Purpose | Location |
|----------|---------|----------|
| `generateRandomResult(wheelSequence)` | Generate cryptographic random result | wheel-physics.js |
| `getPocketIndex(pocket, sequence)` | Get index of pocket in wheel | wheel-physics.js |
| `getPocketAngle(pocket, sequence)` | Calculate angle for pocket position | wheel-physics.js |
| `generateSpinParams()` | Generate realistic spin animation params | wheel-physics.js |
| `calculateFinalWheelAngle(target, sequence, rotations)` | Calculate final rotation angle | wheel-physics.js |
| `calculateBallAngle(target, sequence, rotations, wheelAngle)` | Calculate ball rotation | wheel-physics.js |
| `generateSpinData(wheelSequence)` | Generate complete spin animation data | wheel-physics.js |
| `getNeighborPockets(pocket, sequence, count)` | Get neighboring pockets | wheel-physics.js |
| `getWheelSector(pocket)` | Get wheel sector (Voisins, Tiers, etc.) | wheel-physics.js |

### State Management (`/roulette/js/state/`)

#### game-state.js
| Function | Purpose | Location |
|----------|---------|----------|
| `createInitialGameState()` | Create fresh game state | game-state.js |
| `resetGameState()` | Reset to initial state | game-state.js |
| `updateGameConfig(config)` | Update configuration | game-state.js |
| `setGamePhase(phase)` | Set current game phase | game-state.js |
| `initializeBankroll(amount)` | Set starting bankroll | game-state.js |
| `updateBankroll(change)` | Update bankroll after spin | game-state.js |
| `setSelectedChip(value)` | Set selected chip denomination | game-state.js |
| `getSelectedChip()` | Get current selected chip | game-state.js |
| `storeLastBets(bets)` | Store bets for repeat feature | game-state.js |
| `getLastBets()` | Get stored last bets | game-state.js |
| `setSpinData(spinData)` | Set current spin data | game-state.js |
| `clearSpinData()` | Clear spin data | game-state.js |
| `getSpinResult()` | Get current spin result | game-state.js |
| `isSpinning()` | Check if wheel is spinning | game-state.js |
| `getCurrentBankroll()` | Get current bankroll | game-state.js |
| `getSessionProfit()` | Get session profit/loss | game-state.js |
| `getRouletteConfig()` | Get active roulette type config | game-state.js |
| `getGamePhase()` | Get current game phase | game-state.js |
| `isBankrupt()` | Check if player is bankrupt | game-state.js |
| `getAvailableChips()` | Get affordable chip denominations | game-state.js |
| `startGame(config)` | Start new game with config | game-state.js |
| `endGame()` | End current game | game-state.js |

#### bet-state.js
| Function | Purpose | Location |
|----------|---------|----------|
| `createInitialBetState()` | Create fresh bet state | bet-state.js |
| `resetBetState()` | Reset all bets | bet-state.js |
| `addBet(type, value, amount)` | Add a bet | bet-state.js |
| `removeBet(type, value, amount)` | Remove a bet | bet-state.js |
| `clearBet(type, value)` | Clear specific bet | bet-state.js |
| `clearAllBets()` | Clear all bets | bet-state.js |
| `doubleAllBets(maxBankroll)` | Double all current bets | bet-state.js |
| `getBetAmount(type, value)` | Get amount on a bet | bet-state.js |
| `getTotalWagered()` | Get total wagered | bet-state.js |
| `hasBets()` | Check if any bets placed | bet-state.js |
| `getAllBets()` | Get copy of all bets | bet-state.js |
| `restoreBets(savedBets, maxBankroll)` | Restore saved bets | bet-state.js |
| `getBetCounts()` | Get count by bet type | bet-state.js |
| `getStraightBetNumbers()` | Get numbers with straight bets | bet-state.js |
| `validateAllBets(min, max)` | Validate against limits | bet-state.js |
| `placeNeighbourBet(number, range, chip, sequence)` | Place neighbour bet on wheel | bet-state.js |
| `removeNeighbourBet(number, range, chip, sequence)` | Remove neighbour bet | bet-state.js |
| `placeCallBet(betName, chipValue)` | Place call bet (Voisins/Tiers/Orphelins) | bet-state.js |
| `removeCallBet(betName, chipValue)` | Remove call bet | bet-state.js |
| `canAffordCallBet(betName, chipValue)` | Check if can afford call bet | bet-state.js |
| `canAffordNeighbourBet(range, chipValue)` | Check if can afford neighbour bet | bet-state.js |
| `undoLastBet()` | Undo the last bet action (supports grouped racetrack bets) | bet-state.js |
| `undoSingleAdd(betType, betValue, amount)` | Helper to undo a single add action | bet-state.js |
| `canUndo()` | Check if undo stack has items | bet-state.js |

#### stats-state.js
| Function | Purpose | Location |
|----------|---------|----------|
| `createInitialStatsState()` | Create fresh stats state | stats-state.js |
| `resetStatsState()` | Reset all stats | stats-state.js |
| `recordSpin(result, wagered, won)` | Record a spin result | stats-state.js |
| `updateStreak(type, value, isValid)` | Update streak tracking | stats-state.js |
| `updateColdNumbers(hitNumber)` | Update cold numbers tracking | stats-state.js |
| `getHotNumbers(count)` | Get most frequent numbers | stats-state.js |
| `getColdNumbers(count)` | Get least frequent numbers | stats-state.js |
| `getRecentHistory(count)` | Get recent spin history | stats-state.js |
| `getFullHistory()` | Get all spin history | stats-state.js |
| `getDistributionPercentages()` | Get distribution as percentages | stats-state.js |
| `getCurrentStreaks()` | Get current streak info | stats-state.js |
| `getSessionStats()` | Get session statistics | stats-state.js |
| `getNumberHits(number)` | Get hit count for number | stats-state.js |
| `getExpectedVsActual(category, expected)` | Compare expected vs actual | stats-state.js |

#### storage.js
| Function | Purpose | Location |
|----------|---------|----------|
| `saveGameStateToStorage()` | Save game state to localStorage | storage.js |
| `saveStatsStateToStorage()` | Save stats state to localStorage | storage.js |
| `saveBetStateToStorage()` | Save bet state to localStorage | storage.js |
| `saveAllStateToStorage()` | Save all state to localStorage | storage.js |
| `loadGameStateFromStorage()` | Load game state from localStorage | storage.js |
| `loadStatsStateFromStorage()` | Load stats state from localStorage | storage.js |
| `loadBetStateFromStorage()` | Load bet state from localStorage | storage.js |
| `restoreGameState()` | Restore game state (checks for bust, clears if bankroll<=0) | storage.js |
| `clearAllStorage()` | Clear all saved data from localStorage | storage.js |
| `hasSavedGame()` | Check if there's a valid saved game (not bust) | storage.js |
| `getSavedGameSummary()` | Get saved game summary for display | storage.js |

### UI Functions (`/roulette/js/ui/`)

#### render-wheel.js
| Function | Purpose | Location |
|----------|---------|----------|
| `renderWheel()` | Render the roulette wheel | render-wheel.js |
| `animateWheelSpin(spinData, callback)` | Animate wheel spin | render-wheel.js |
| `positionBallAtPocket(number)` | Position ball at result | render-wheel.js |
| `highlightWinningPocket(number)` | Highlight winning pocket | render-wheel.js |
| `clearWheelWinningState()` | Clear winning highlights | render-wheel.js |
| `resetWheel()` | Reset wheel to initial state | render-wheel.js |

#### render-table.js
| Function | Purpose | Location |
|----------|---------|----------|
| `renderBettingTable()` | Render the betting table | render-table.js |
| `renderZeroSection(isAmerican)` | Render zero section | render-table.js |
| `renderNumbersGrid()` | Render numbers 1-36 | render-table.js |
| `renderColumnBets()` | Render column bet areas | render-table.js |
| `renderDozenBets()` | Render dozen bet areas | render-table.js |
| `renderEvenMoneyBets()` | Render even money bets | render-table.js |
| `initBettingTableHandlers()` | Init table click handlers | render-table.js |
| `renderPlacedChips()` | Render chips on table | render-table.js |
| `renderChipOnElement(element, amount)` | Place chip stack on cell | render-table.js |
| `getChipBreakdown(amount)` | Get chips for amount | render-table.js |
| `highlightWinningNumber(number)` | Highlight winning on table | render-table.js |
| `clearWinningHighlight()` | Clear table highlights | render-table.js |
| `placeWinningMarker(number)` | Place dolly marker on winning number | render-table.js |
| `removeWinningMarker()` | Remove dolly marker with animation | render-table.js |
| `isWinningMarkerVisible()` | Check if dolly marker is displayed | render-table.js |

#### render-chips.js
| Function | Purpose | Location |
|----------|---------|----------|
| `createChipElement(value, size, selected)` | Create chip DOM element | render-chips.js |
| `renderChipRack()` | Render chip selector | render-chips.js |
| `updateChipSelector()` | Update chip selection | render-chips.js |
| `createPlacedChipStack(amount)` | Create placed chip visual | render-chips.js |
| `positionChipStack(stack, cell, table)` | Position chip on cell | render-chips.js |
| `getChipColor(value)` | Get chip color | render-chips.js |
| `clearAllPlacedChips()` | Remove all placed chips | render-chips.js |

#### render-racetrack.js (SVG-based)
| Function/Constant | Purpose | Location |
|------------------|---------|----------|
| `SVG_WIDTH`, `SVG_HEIGHT` | SVG viewBox dimensions (1020x280) | render-racetrack.js |
| `LEFT_CURVE_NUMBERS` | Numbers on left semi-circle (10,23,8,30) | render-racetrack.js |
| `TOP_ROW_NUMBERS` | Numbers in top row (5,24,16,33...35) | render-racetrack.js |
| `RIGHT_CURVE_NUMBERS` | Numbers on right semi-circle including 0 (3,26,0,32) | render-racetrack.js |
| `BOTTOM_ROW_NUMBERS` | Numbers in bottom row (11,36,13...15) | render-racetrack.js |
| `VOISINS_NUMBERS` | Voisins du Zero section numbers | render-racetrack.js |
| `TIERS_NUMBERS` | Tiers section numbers | render-racetrack.js |
| `ORPHELINS_NUMBERS` | Orphelins section numbers | render-racetrack.js |
| `COLORS` | Color constants for track elements | render-racetrack.js |
| `degToRad(deg)` | Convert degrees to radians | render-racetrack.js |
| `getCirclePoint(cx, cy, radius, angleDeg)` | Get point on circle at angle | render-racetrack.js |
| `arcPath(cx, cy, radius, startAngle, endAngle)` | Create SVG arc path command | render-racetrack.js |
| `createWedgePath(cx, cy, innerR, outerR, start, end)` | Create SVG wedge/pie-slice path | render-racetrack.js |
| `getWedgeTextPosition(cx, cy, r, start, end)` | Get center position for wedge text | render-racetrack.js |
| `getNumberFill(num)` | Get fill color for a number | render-racetrack.js |
| `renderRacetrack()` | Render SVG racetrack with curved wedges | render-racetrack.js |
| `renderCenterSection(startX, endX, topY, bottomY)` | Render stadium-shaped center section | render-racetrack.js |
| `renderNeighbourButtons()` | Render neighbour range buttons (2-7) | render-racetrack.js |
| `initRacetrackHandlers()` | Initialize racetrack event handlers | render-racetrack.js |
| `handleCallBetClick(betName)` | Handle call bet section click | render-racetrack.js |
| `handleCallBetRemove(betName)` | Handle call bet removal | render-racetrack.js |
| `handleNeighbourBetClick(number)` | Handle neighbour bet click | render-racetrack.js |
| `handleNeighbourBetRemove(number)` | Handle neighbour bet removal | render-racetrack.js |
| `setNeighbourRange(range)` | Set the neighbour range (2-7) | render-racetrack.js |
| `getNeighbourRange()` | Get current neighbour range | render-racetrack.js |
| `highlightNeighbours(number)` | Highlight neighbours on racetrack | render-racetrack.js |
| `highlightCallBetNumbers(betName)` | Highlight numbers for a call bet | render-racetrack.js |
| `clearRacetrackHighlights()` | Clear all racetrack highlights | render-racetrack.js |
| `showCallBetFeedback(betName, success)` | Show visual feedback for call bet | render-racetrack.js |
| `showNeighbourBetFeedback(number, success)` | Show visual feedback for neighbour bet | render-racetrack.js |
| `updateRacetrackBetDisplay()` | Update racetrack to show placed bets | render-racetrack.js |

#### render-stats.js
| Function | Purpose | Location |
|----------|---------|----------|
| `renderAllStats()` | Render all statistics | render-stats.js |
| `renderHistoryDisplay()` | Render spin history | render-stats.js |
| `renderHotNumbers()` | Render hot numbers | render-stats.js |
| `renderColdNumbers()` | Render cold numbers | render-stats.js |
| `renderDistribution()` | Render distribution bars | render-stats.js |
| `renderStreaks()` | Render streak info | render-stats.js |
| `renderSessionStats()` | Render session stats | render-stats.js |

#### event-handlers.js
| Function | Purpose | Location |
|----------|---------|----------|
| `initEventHandlers()` | Initialize all handlers | event-handlers.js |
| `initSetupHandlers()` | Setup screen handlers | event-handlers.js |
| `handleRouletteTypeChange(e)` | Handle type radio change | event-handlers.js |
| `handleStackPresetClick(e)` | Handle stack preset click | event-handlers.js |
| `handleCustomStackInput(e)` | Handle custom stack input | event-handlers.js |
| `handleSetupSubmit(e)` | Handle form submission | event-handlers.js |
| `initGameControlHandlers()` | Game control handlers | event-handlers.js |
| `handleSpinClick()` | Handle spin button | event-handlers.js |
| `handleClearBets()` | Handle clear button | event-handlers.js |
| `handleDoubleBets()` | Handle double (x2) button | event-handlers.js |
| `handleRepeatBets()` | Handle repeat button | event-handlers.js |
| `handleNewBets()` | Handle new bets button | event-handlers.js |
| `handleSameBets()` | Handle same bets button | event-handlers.js |
| `handleNewGame()` | Handle new game button | event-handlers.js |
| `handleChipSelect(value)` | Handle chip selection | event-handlers.js |
| `handleBetPlacement(type, value, e)` | Handle bet placement | event-handlers.js |
| `handleBetRemoval(type, value, e)` | Handle bet removal | event-handlers.js |
| `updateButtonStates()` | Update button enabled states | event-handlers.js |
| `updateTotalBetDisplay()` | Update total bet display | event-handlers.js |
| `initAutoRepeatHandlers()` | Initialize auto-repeat handlers | event-handlers.js |
| `selectAutoRepeatCount(count)` | Start auto-repeat for N spins (0=forever) | event-handlers.js |
| `stopAutoRepeat()` | Stop auto-repeat mode | event-handlers.js |
| `processAutoRepeat()` | Process auto-repeat after spin | event-handlers.js |
| `isAutoRepeatEnabled()` | Check if auto-repeat is active | event-handlers.js |
| `initBettingTabHandlers()` | Initialize view toggle button handler | event-handlers.js |
| `handleViewToggle()` | Toggle between Table-only and Table+Racetrack views | event-handlers.js |
| `isRacetrackModeActive()` | Check if racetrack mode is active | event-handlers.js |
| `getCurrentBettingTab()` | Get current betting view mode (table/racetrack) | event-handlers.js |

#### init.js
| Function | Purpose | Location |
|----------|---------|----------|
| `init()` | Initialize application | init.js |
| `loadComponents()` | Load HTML components | init.js |
| `showSetupScreen()` | Show setup, hide game | init.js |
| `showGameScreen()` | Show game, hide setup | init.js |
| `showResult(result, resolution)` | Show result overlay | init.js |
| `hideResultOverlay()` | Hide result overlay | init.js |
| `showGameOver()` | Show game over overlay | init.js |
| `hideGameOverOverlay()` | Hide game over overlay | init.js |
| `renderBankroll()` | Render bankroll display | init.js |
| `renderChipSelector()` | Render chip selector | init.js |
| `renderStats()` | Render all stats | init.js |

---

## Shared CSS Variables (`/roulette/css/variables.css`)

| Variable | Purpose |
|----------|---------|
| `--bg-primary`, `--bg-secondary`, `--bg-card` | Background colors |
| `--accent-gold`, `--accent-red`, etc. | Accent colors |
| `--text-primary`, `--text-secondary`, `--text-dim` | Text colors |
| `--roulette-red`, `--roulette-black`, `--roulette-green` | Roulette-specific colors |
| `--chip-1` through `--chip-100000` | Chip colors (1, 5, 10, 25, 100, 500, 1K, 5K, 25K, 100K) |
| `--spacing-xs` through `--spacing-2xl` | Spacing scale |
| `--radius-sm` through `--radius-full` | Border radius scale |
| `--transition-fast`, `--transition-normal`, `--transition-slow` | Transition durations |

---

## Blackjack Module (`/blackjack`)

### Shared Modules (`/blackjack/js/shared/`)

#### constants.js
| Function/Constant | Purpose | Location |
|------------------|---------|----------|
| `CARD_RANKS` | Array of card ranks (A-K) | constants.js |
| `CARD_SUITS` | Array of suits (spades, hearts, diamonds, clubs) | constants.js |
| `HI_LO_VALUES` | Hi-Lo card counting values (+1/-1/0) | constants.js |
| `CARD_BJ_VALUES` | Blackjack card values | constants.js |
| `DEFAULT_CONFIG` | Default game configuration | constants.js |
| `DECK_OPTIONS` | Available deck counts | constants.js |
| `ACTIONS` | Action codes (H, S, D, P, etc.) | constants.js |
| `ACTION_NAMES` | Human-readable action names | constants.js |
| `GAME_PHASES` | Game phase constants | constants.js |

#### shoe.js
| Function | Purpose | Location |
|----------|---------|----------|
| `Shoe.init(deckCount, penetration)` | Initialize shoe with specified decks and penetration | shoe.js |
| `Shoe.shuffle()` | Fisher-Yates shuffle the shoe | shoe.js |
| `Shoe.drawCard()` | Draw single card from shoe, returns {rank, suit} | shoe.js |
| `Shoe.getRemaining()` | Get remaining card count | shoe.js |
| `Shoe.getDealt()` | Get dealt card count | shoe.js |
| `Shoe.getPenetration()` | Get percentage of shoe dealt (0-100) | shoe.js |
| `Shoe.getDecksRemaining()` | Get approximate decks remaining | shoe.js |
| `Shoe.needsReshuffle()` | Check if shoe needs reshuffle (past cut card) | shoe.js |
| `Shoe.reshuffle()` | Reset and reshuffle the shoe | shoe.js |

### Core Functions (`/blackjack/js/core/`)

#### hand-evaluation.js
| Function | Purpose | Location |
|----------|---------|----------|
| `HandEvaluation.evaluateHand(cards)` | Evaluate hand total, soft/hard, bust status | hand-evaluation.js |

#### basic-strategy.js
| Function | Purpose | Location |
|----------|---------|----------|
| `BasicStrategy.getOptimalAction(playerCards, dealerUpcard)` | Get optimal action using basic strategy | basic-strategy.js |

### Practice Mode (`/blackjack/practice/`)

#### Medium Mode (`medium/js/medium-mode.js`)
| Function | Purpose | Location |
|----------|---------|----------|
| `MediumMode.init()` | Initialize medium mode | medium-mode.js |
| `MediumMode.startNewShoe()` | Start new shoe (6 decks) | medium-mode.js |
| `MediumMode.startNewHand()` | Start new hand with auto-deal | medium-mode.js |
| `MediumMode.autoDealInitialCards()` | Auto-deal 4 initial cards with delays | medium-mode.js |
| `MediumMode.dealCardToPlayer()` | Deal card to player from shoe | medium-mode.js |
| `MediumMode.dealCardToDealer()` | Deal card to dealer from shoe | medium-mode.js |
| `MediumMode.autoDealDealer()` | Auto-deal dealer cards until 17+ | medium-mode.js |
| `MediumMode.playerAction(action)` | Handle player action (hit/stand/double) | medium-mode.js |
| `MediumMode.checkCount()` | Verify user's running count answer | medium-mode.js |

#### Hard Mode (`hard/js/hard-mode.js`)
| Function | Purpose | Location |
|----------|---------|----------|
| `HardMode.init()` | Initialize hard mode | hard-mode.js |
| `HardMode.startNewShoe()` | Start new shoe (6 decks) | hard-mode.js |
| `HardMode.startNewRound()` | Start new round with auto-deal | hard-mode.js |
| `HardMode.autoDealAllSeats()` | Auto-deal to all 5 seats + dealer | hard-mode.js |
| `HardMode.autoPlayAISeat(seatIndex)` | AI seat auto-plays using BasicStrategy | hard-mode.js |
| `HardMode.processAISeats()` | Process all AI seats sequentially | hard-mode.js |
| `HardMode.autoDealDealer()` | Auto-deal dealer cards until 17+ | hard-mode.js |
| `HardMode.playerAction(action)` | Handle player action (hit/stand/double) | hard-mode.js |
| `HardMode.showCountCheck()` | Show 5-second count verification modal | hard-mode.js |
| `HardMode.submitCount()` | Verify user's running count answer | hard-mode.js |

### Game Mode (`/blackjack/game-mode/`)

Play realistic blackjack with side bets (Perfect Pair, 21+3, Top 3).

#### side-bets.js
| Function/Constant | Purpose | Location |
|-------------------|---------|----------|
| `PERFECT_PAIR_PAYOUTS` | Payout table for Perfect Pair (25:1, 12:1, 6:1) | side-bets.js |
| `TWENTY_ONE_PLUS_3_PAYOUTS` | Payout table for 21+3 (100:1 to 5:1) | side-bets.js |
| `TOP_3_PAYOUTS` | Payout table for Top 3 (270:1 to 5:1) | side-bets.js |
| `SideBets.evaluatePerfectPair(playerCards)` | Check for pair combinations in player's first 2 cards | side-bets.js |
| `SideBets.evaluate21Plus3(playerCards, dealerUpcard)` | Check for poker hands with player's 2 cards + dealer upcard | side-bets.js |
| `SideBets.evaluateTop3(dealerCards)` | Check for poker hands in dealer's first 3 cards | side-bets.js |
| `SideBets.calculateWinnings(betAmount, payout)` | Calculate total return for winning side bet | side-bets.js |
| `SideBets.getPayoutTable(betType)` | Get payout table for display | side-bets.js |

#### game-mode.js
| Function | Purpose | Location |
|----------|---------|----------|
| `initializeSetup()` | Initialize setup screen with event listeners | game-mode.js |
| `handleSetupSubmit(e)` | Process setup form and start game | game-mode.js |
| `initializeShoe()` | Create and shuffle 6-deck shoe | game-mode.js |
| `shuffleShoe()` | Fisher-Yates shuffle the shoe | game-mode.js |
| `drawCard()` | Draw single card from shoe | game-mode.js |
| `setupChipRack()` | Initialize chip rack click handlers | game-mode.js |
| `selectChip(value)` | Select chip denomination (1/5/25/100/500) | game-mode.js |
| `placeBetOnSpot(spotType, seatIndex)` | Place selected chip on betting spot (click) | game-mode.js |
| `removeBetFromSpot(spotType, seatIndex)` | Remove chip from betting spot (right-click) | game-mode.js |
| `renderChipStack(amount, small)` | Render visual chip stack for amount | game-mode.js |
| `getChipBreakdown(amount)` | Get array of chips that make up amount | game-mode.js |
| `createBettingSpot(spotType, seatIndex, labelText, betAmount)` | Create betting spot element with chips | game-mode.js |
| `startDeal()` | Begin dealing phase after bets are placed | game-mode.js |
| `dealInitialCards()` | Deal 2 cards to each player and dealer | game-mode.js |
| `evaluateImmediateSideBets()` | Evaluate Perfect Pair and 21+3 after initial deal | game-mode.js |
| `startPlayerTurn()` | Begin player action phase | game-mode.js |
| `advanceToNextHand()` | Move to next player hand needing action | game-mode.js |
| `playerHit()` | Handle player hit action | game-mode.js |
| `playerStand()` | Handle player stand action | game-mode.js |
| `playerDouble()` | Handle player double down action | game-mode.js |
| `playerSplit()` | Handle player split action | game-mode.js |
| `startDealerTurn()` | Begin dealer action phase | game-mode.js |
| `dealerDraw()` | Dealer draws cards until 17+ | game-mode.js |
| `evaluateTop3SideBet()` | Evaluate Top 3 bet after dealer has 3 cards | game-mode.js |
| `resolveRound()` | Calculate all wins/losses and update bankroll | game-mode.js |
| `startNewRound()` | Reset for next round, preserve bets | game-mode.js |
| `showResultOverlay(netResult)` | Show round result with countdown | game-mode.js |
| `renderGame()` | Render all game UI elements | game-mode.js |
| `renderBettingArea()` | Render visual betting spots on table | game-mode.js |
| `renderDealer()` | Render dealer cards and total | game-mode.js |
| `renderPlayerCards()` | Render player cards during play | game-mode.js |
| `renderActionButtons()` | Render Hit/Stand/Double/Split buttons | game-mode.js |
| `showSideBetResult(betType, result)` | Display side bet outcome | game-mode.js |

---

## Baccarat Module (`/baccarat`)

### Structure

The baccarat module follows the same pattern as blackjack with an options page and sub-modes:

- `/baccarat/index.html` - Options page (mode selection)
- `/baccarat/card-counting/` - Card counting and EV calculator mode
- `/baccarat/game-mode/` - Game play mode with betting

### Card Counting Mode (`/baccarat/card-counting/`)

Uses the core baccarat JS files from `/baccarat/js/`:

| File | Purpose |
|------|---------|
| `constants.js` | Game constants, deck configuration |
| `state.js` | Game state management |
| `cards.js` | Card tracking and shoe management |
| `rules.js` | Baccarat drawing rules |
| `roads.js` | Road map (Big Road, Bead Road, etc.) calculations |
| `egalite.js` | Egalité side bet calculations |
| `calculations.js` | EV and probability calculations |
| `dealer.js` | Dealer logic and hand resolution |
| `render-cards.js` | Card UI rendering |
| `render-roads.js` | Road map UI rendering |
| `render-egalite.js` | Egalité panel rendering |
| `render-stats.js` | Statistics panel rendering |
| `init.js` | Application initialization |
| `ui-helpers.js` | UI utility functions |

### Game Mode (`/baccarat/game-mode/`)

Play baccarat with virtual chips, main bets, and side bets.

#### constants.js
| Function/Constant | Purpose | Location |
|-------------------|---------|----------|
| `GAME_PHASES` | Game state phases (SETUP, BETTING, DEALING, RESULT, GAME_OVER) | constants.js |
| `CHIP_DENOMINATIONS` | Available chip values [1, 5, 10, 25, 100, 500, 1000, 5000] | constants.js |
| `MAIN_BET_PAYOUTS` | Payouts for Player (1:1), Banker (0.95:1), Tie (8:1) | constants.js |
| `PAIR_BET_PAYOUTS` | Payouts for Player/Banker Pair (11:1) | constants.js |
| `DRAGON_BONUS_PAYOUTS` | Dragon Bonus payouts (1:1 to 30:1) | constants.js |
| `EGALITE_PAYOUTS` | Tie 0-9 payouts (45:1 to 225:1) | constants.js |
| `BET_TYPES` | All available bet type constants | constants.js |

#### side-bets.js
| Function | Purpose | Location |
|----------|---------|----------|
| `evaluateAllSideBets(handResult)` | Evaluate all side bets for completed hand | side-bets.js |
| `evaluatePairBet(cards)` | Check for pair in first 2 cards | side-bets.js |
| `evaluateDragonBonus(handResult, side)` | Evaluate Dragon Bonus for player/banker | side-bets.js |
| `evaluateEgalite(handResult)` | Evaluate all Tie 0-9 bets | side-bets.js |
| `evaluateMainBets(handResult)` | Evaluate Player/Banker/Tie main bets | side-bets.js |
| `calculateWinnings(placedBets, handResult)` | Calculate total winnings for all bets | side-bets.js |

#### state.js
| Function | Purpose | Location |
|----------|---------|----------|
| `createInitialGameState()` | Create fresh game state | state.js |
| `setGamePhase(phase)` | Set current game phase | state.js |
| `initializeBankroll(amount)` | Set starting bankroll | state.js |
| `updateBankroll(change)` | Update after hand | state.js |
| `getCurrentBankroll()` | Get current bankroll | state.js |
| `initializeShoe()` | Create and shuffle 8-deck shoe | state.js |
| `drawCard()` | Draw card from shoe | state.js |
| `addBet(betType, amount)` | Place a bet | state.js |
| `removeBet(betType, amount)` | Remove a bet | state.js |
| `clearAllBets()` | Clear all bets | state.js |
| `getTotalWagered()` | Get total wagered amount | state.js |
| `saveToStorage()` | Save state to localStorage | state.js |
| `loadFromStorage()` | Load state from localStorage | state.js |

#### game-logic.js
| Function | Purpose | Location |
|----------|---------|----------|
| `getCardValue(card)` | Get baccarat value of card | game-logic.js |
| `calculateHandTotal(cards)` | Calculate hand total (mod 10) | game-logic.js |
| `determineThirdCardNeeded()` | Determine if third card needed | game-logic.js |
| `shouldBankerDraw(total, player3rd)` | Check banker drawing rules | game-logic.js |
| `startNewGame(initialStack)` | Start new game with bankroll | game-logic.js |
| `startNewRound()` | Start dealing after bets placed | game-logic.js |
| `dealNextCard()` | Deal next card in sequence | game-logic.js |
| `completeHand()` | Complete hand and determine winner | game-logic.js |
| `resolveRound(handResult)` | Resolve bets and update bankroll | game-logic.js |

#### render.js
| Function | Purpose | Location |
|----------|---------|----------|
| `renderChipRack()` | Render chip selector | render.js |
| `renderHUD()` | Render bankroll/profit/round display | render.js |
| `renderCards()` | Render player and banker cards | render.js |
| `renderAllBetChips()` | Render chips on betting table | render.js |
| `showResultOverlay(handResult, resolution)` | Show result modal | render.js |
| `showGameOverOverlay()` | Show game over modal | render.js |

#### init.js
| Function | Purpose | Location |
|----------|---------|----------|
| `init()` | Initialize application | init.js |
| `loadComponents()` | Load HTML panels | init.js |
| `initEventHandlers()` | Initialize all event handlers | init.js |
| `handleStartGame()` | Handle game start | init.js |
| `handleDeal()` | Handle deal button | init.js |

---

## Notes

- All core calculation functions are pure (no side effects, no DOM access)
- State is managed centrally in state modules
- UI rendering is separated from logic
- CSS uses custom properties for theming
