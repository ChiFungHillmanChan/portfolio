# Hillman Chan Portfolio - Casino Games Collection

A comprehensive collection of casino game training tools and calculators built with vanilla JavaScript.

## Project Structure

```
portfolio/
├── src/game/casino-game/calculator/    # Source files
├── public/games/casino-game/           # Production build
└── build/games/casino-game/            # Alternative build
```

## Games

### 1. Roulette

**Location:** `roulette/`

**Features:**
- European & American roulette support
- Interactive betting table with chip placement
- Racetrack betting (French bets)
- Real-time wheel animation with physics
- Comprehensive statistics tracking:
  - Hot/Cold numbers
  - Color/Parity/Range distributions
  - Streak tracking
  - Session profit/loss
- Game state persistence (localStorage)
- La Partage rule support (European)

**Dealer Trainer** (`roulette/trainer/`)
- Practice calculating payouts like a professional dealer
- Four difficulty modes:
  - **Easy:** 1-2 simple bets (columns, corners, splits), max 10 chips, notes available
  - **Medium:** 3-6 bets with losing distractors, 10-100 chips, notes available
  - **Hard:** Includes call bets (Tiers, Voisins, Orphelins, Neighbours), no notes
  - **Exam:** 50 questions, progressive difficulty (Easy→Medium→Hard), no notes
- Two-step answer input: Outside bets (1:1, 2:1) then Inside bets
- Per-question and total session timer
- Detailed results breakdown with error analysis
- Lightweight stats persistence (~1KB localStorage)

**Call Bets Supported:**
- Orphelins (5 chips)
- Tiers du Cylindre (6 chips)
- Voisins du Zero (9 chips)
- Jeu Zero (4 chips)
- Neighbours (5 consecutive wheel numbers)

### 2. Blackjack

**Location:** `blackjack/`

**Features:**
- Standard blackjack rules with configurable options
- Multiple game modes:
  - Normal shoe play
  - Game mode with enhanced features
- Practice mode with difficulty levels:
  - Easy
  - Medium
  - Hard
  - Progress tracking
- Split hands support
- Auto-deal functionality
- Statistics tracking

### 3. Baccarat

**Location:** `baccarat/`

**Features:**
- Standard baccarat gameplay
- Card counting trainer
- Game mode with statistics
- Banker/Player/Tie betting

## Shared Components

### Hamburger Navigation Menu
All games share a consistent navigation menu (`css/hamburger-menu.css`) providing:
- Quick switching between games
- Back navigation
- Support link (Buy Me a Coffee)
- Mobile-responsive design

### CSS Architecture
- CSS Variables for theming (`variables.css`)
- Modular CSS files per component
- Mobile-first responsive design
- Touch-friendly UI elements (min 44px touch targets)
- Reduced motion support
- High contrast mode support

## Technical Stack

- **Frontend:** Vanilla JavaScript (ES6+)
- **Styling:** CSS3 with custom properties
- **Fonts:** Google Fonts (Orbitron, Rajdhani, JetBrains Mono)
- **State:** localStorage for persistence
- **Build:** Create React App (for portfolio wrapper)

## Payout Reference (Roulette)

| Bet Type | Payout | Coverage |
|----------|--------|----------|
| Straight | 35:1 | 1 number |
| Split | 17:1 | 2 numbers |
| Street | 11:1 | 3 numbers |
| Corner | 8:1 | 4 numbers |
| Six Line | 5:1 | 6 numbers |
| Column/Dozen | 2:1 | 12 numbers |
| Even Money | 1:1 | 18 numbers |

## Development

### File Naming Conventions
- Core logic: `js/core/` (constants, calculations, pure functions)
- State management: `js/state/` (game state, storage)
- UI rendering: `js/ui/` (DOM manipulation, event handlers)
- Styles: `css/` (component-based CSS files)
- HTML templates: `html/` (reusable HTML components)

### Adding New Features
1. Add source files to `src/game/casino-game/calculator/`
2. Sync to `public/games/casino-game/` for production

## Recent Updates

- **Roulette Dealer Trainer:** Complete training system for dealer payout calculations
- **Hamburger Menu:** Consistent navigation across all games
- **Split Hands:** Enhanced blackjack with split hand support
- **Auto-deal:** Automatic card dealing option in blackjack

## Author

Hillman Chan

## Support

[Buy Me a Coffee](https://buymeacoffee.com/hillmanchan709)
