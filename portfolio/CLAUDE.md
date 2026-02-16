# Hillman Chan Portfolio

## Project Structure

```
portfolio/
├── src/game/casino-game/calculator/    # Casino games (vanilla JS)
├── src/game/system-design/             # System Design 教室 (React SPA)
├── public/games/casino-game/           # Casino production build
└── build/games/casino-game/            # Alternative build
```

## System Design 教室

**Location:** `src/game/system-design/`
**Stack:** React 18 + Vite 6 + Tailwind 3 + Firebase Auth/Firestore
**Deploy:** Dual build — Firebase Hosting (standalone) + portfolio iframe embed

### Architecture

- **Frontend:** React SPA (`src/`) — topics, coaching, projects, AI chat
- **Backend API:** `api.system-design.hillmanchan.com` — AI chat, auth, Stripe webhooks
- **Auth:** Firebase Google Sign-In → ID token → backend Bearer auth (both sa-auth and sa-chat verify Firebase ID tokens via Admin SDK)
- **Premium:** Stripe payment → webhook → backend Admin SDK → Firestore `users/{uid}.premium` + `users/{uid}.tier`
- **Tiers:** free (5 AI/day) | standard HK$150 (20 AI/day) | pro HK$399 (80 AI/day)
- **Rate Limiting:** Backend-authoritative via Firestore `aiUsage/{uid}_{date}` counters (tier-aware: free=5, standard=20, pro=80 daily AI calls)
- **State:** localStorage for progress/cache, Firestore for premium status + rate limits (source of truth)
- **Content Security:** Premium AI-core topics use `React.lazy()` code-splitting — JS chunks only fetched when component renders, page-level gate prevents rendering for non-premium users

### Key Files

| File | Purpose |
|------|---------|
| `src/config/firebase.js` | Firebase init (env vars, no fallbacks) |
| `src/config/constants.js` | API_BASE, STRIPE_URL |
| `src/context/AuthContext.jsx` | Google auth + token refresh |
| `src/context/PremiumContext.jsx` | Premium status + tier, TIER_LIMITS, `confirmStripeSession()` for Stripe redirect flow |
| `src/context/ProgressContext.jsx` | Topic view tracking (localStorage) |
| `src/components/Layout.jsx` | Sidebar + main layout, desktop collapse |
| `src/components/Sidebar.jsx` | Nav, horizontal-scroll filters, fixed footer with plan badge |
| `src/components/ChatWidget.jsx` | AI chat (search/viber/suggest), daily usage tracking, full-screen mobile |
| `src/components/PremiumGate.jsx` | Lock screen with discount pricing for premium content |
| `src/components/AuthGate.jsx` | Login/premium gate modal with pricing |
| `src/pages/Premium.jsx` | Two-tier pricing page (Standard/Pro) with early-bird discount |
| `src/pages/Settings.jsx` | Profile, plan status, upgrade cards, admin panel (superadmin user list with tier/superadmin badges), progress |
| `src/pages/AIPlanner.jsx` | AI learning plan generator (mode: guide) |
| `src/topics/index.js` | Topic registry — React.lazy() for premium, static for free |
| `src/pages/TopicPage.jsx` | Topic renderer with page-level premium gate + Suspense |
| `src/data/topics.json` | Master topic registry (order, categories, free/premium flags) |

### Environment Variables (`.env`, gitignored)

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_SUPERADMIN_EMAILS          # comma-separated, no fallback
```

### Security Rules

- Firestore rules block client-side writes to `premium`, `tier`, `activatedAt`, `sessionId`, `superadmin`
- Only backend Admin SDK (bypasses rules) can write premium status + tier
- `activatePremium()` refreshes from Firestore; actual write is server-side only
- `confirmStripeSession(sessionId)` calls backend `confirm-session` action — never trusts URL params directly
- Superadmin emails loaded from env var, not hardcoded
- Premium AI-core topics lazy-loaded — non-premium users never download the JS chunks

### Build & Deploy

```bash
cd portfolio/src/game/system-design

# Standalone (system-design.hillmanchan.com via Firebase Hosting)
STANDALONE_BUILD=1 npm run build    # → dist/
firebase deploy --only hosting

# Portfolio embed (hillmanchan.com/games/system-design/)
npm run build                       # → dist-portfolio/
rm -rf ../../public/games/system-design/assets
cp -r dist-portfolio/* ../../public/games/system-design/
```

### Pricing (Early-Bird)

| Plan | Price | Original | Discount | Daily AI |
|------|-------|----------|----------|----------|
| Free | $0 | — | — | 5 |
| Standard | HK$150 | HK$750 | 80% OFF | 20 |
| Pro | HK$399 | HK$1,999 | 80% OFF | 80 |

Pricing shown across: Premium.jsx, Settings.jsx, PremiumGate.jsx, ChatWidget.jsx, AuthGate.jsx.
All display strikethrough original price + urgency about future monthly subscription switch.

### Scale Plans

See `docs/plans/system-design/future-plan-1000users.md` for:
- AI response caching (50-70% cost reduction)
- Tiered AI models (GPT-4o-mini for search, GPT-4 for coaching)
- Rate limiting (implemented: free 5/day, standard 20/day, pro 80/day — backend Firestore counters)
- Firebase Hosting (migrated from Cloudflare Pages)

---

## Casino Games Collection

A collection of casino game training tools and calculators built with vanilla JavaScript.

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
