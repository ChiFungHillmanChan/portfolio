# Hillman Chan Portfolio

## Project Structure

```
portfolio/
├── src/game/casino-game/calculator/    # Casino games (vanilla JS)
├── src/game/system-design/             # System Design 教室 (React SPA)
├── src/game/siu-hei-bou/               # 小氣簿 grudge notebook (React, Cantonese)
├── public/games/casino-game/           # Casino production build
└── build/games/casino-game/            # Alternative build
```

## 小氣簿 (Siu Hei Bou)

**Location:** `src/game/siu-hei-bou/` (React components in the main portfolio CRA build — hostname-routed via `App.js`, same pattern as card-drawer)
**Live:** `siu-hei-bou.hillmanchan.com` (Cloudflare grey-cloud CNAME → CloudFront `E2SYHEFLV89R32` alias) · dev route `hillmanchan.com/siu-hei-bou`
**Stack:** React 18 (CRA) + Firebase Google auth (shared project `system-design-c84d3`, lazy dynamic import) + Cloudflare Worker + D1

Cantonese-only grudge notebook: log 嬲爆事件 per friend, severity stamps (小嬲/中嬲/勁嬲 = 1/2/3 印), full card (per-friend threshold, default 10) opens a 找數卡 with a public share link (`/card/<token>`, no login) demanding 請食飯; friend can 認數, owner settles.

**Real-book UI (2026-08-08):** the whole app is one fixed-size book — cover swings on auth state (Book.jsx), searchable 目錄 index, per-friend chapters, CJK pagination engine (paginate.js + geometry.js: 18 units/line on a 32px ruled grid; entries split mid-sentence across pages), pen-writing animation on save, （下頁仲有）corner marker. Geometry contract: `LINE_PX`/`H` block heights in geometry.js must mirror the fixed CSS block heights or the ink drifts off the rules.

**書末 — settings/profile/legal (2026-08-09):** the last three pages of the book,
appended to `sectionOrder` after the friend chapters as section id `'__back__'`,
so the ordinary ‹ 上一頁 / 下一頁 › corners walk into them. Reached directly via
管理書本 on the 目錄 footer (the superadmin link there is now 用戶一覽, to stop the
two reading as the same thing). Page 1 個人檔案 (Google avatar/名/email/開簿日 +
罪人/嬲爆事/找數卡 counts from `GET /api/me`, 登出, 撕爛本簿), page 2 私隱條款, page 3
條款及細則. The legal copy is data in `legal.js`, rendered by `LegalDoc.jsx` both
here and in a sheet linked from the **closed cover** — a privacy policy you can
only read after logging in isn't one. Fine print does NOT use the 32px ruled
grid: it scrolls inside `.shb-legal-page`, whose `left: 30px` clears the 目錄
bookmark tab (0–22px) that would otherwise clip it.

**撕爛本簿:** `DELETE /api/me` wipes every D1 row for the uid, then the client
signs out (that order matters — `/api/state` upserts the user row, so refreshing
in between resurrects an empty account). The shared Google account is
deliberately **not** deleted; it carries paid System Design tiers and poker/casino
data. That promise is made in three places — `legal.js`, the in-app confirm in
`BackMatter.jsx`, and `siu-hei-bou-api/README.md` — keep them in sync.
Tests: `npx react-scripts test --testPathPattern siu-hei-bou` (paginate,
BackMatter, Book.nav — the last covers 書末 ordering + the delete flow).

**Superadmin:** `GET /api/admin/users?page=&q=` on the Worker returns `{total, q, page, pages, pageSize, users:[…]}` — gated server-side on the *verified* token email matching the `SUPERADMIN_EMAIL` wrangler var (hillmanchan709@gmail.com) plus `email_verified`. The 用戶一覽 link on the 目錄 footer (AdminSheet.jsx) is a cosmetic client gate only; the Worker is the enforcement point. There is NO write path to superadmin — it lives solely in the Worker env, never in the database or client.

AdminSheet shows 20 users a page (上一頁/下一頁 + debounced 搵用戶 box, both paged in SQL) and memoises each `q|page` response in a **module-level** cache for 5 min, so reopening the sheet or flipping back costs no D1 read. That cache outlives the component — `Book.handleLogout` must keep calling `clearAdminCache()` or the next account signing in on the same tab could be served the previous admin's list. Tests: `npx react-scripts test AdminSheet`.

| Piece | Where |
|---|---|
| Frontend | `src/game/siu-hei-bou/` — SiuHeiBouGame.jsx (root + path routing), Book.jsx (book shell: cover swings on auth, leaf flips, nav, pen ticker), IndexPage (目錄 + search), FriendChapter (chapter pages), BackMatter.jsx + legal.js + LegalDoc.jsx (書末: 個人檔案/私隱/條款), paginate.js + geometry.js (32px ruled-line grid — LINE_PX/H must stay in sync with the CSS block heights), AddGrudgeSheet, PublicCardPage, SettingsSheet (per-friend, not app settings), svgs.jsx, firebase.js, api.js. Jest: `npx react-scripts test --testPathPattern siu-hei-bou` |
| Backend | REPO ROOT `siu-hei-bou-api/` — Cloudflare Worker (`src/index.mjs` router, `auth.mjs` WebCrypto JWT verify, `db.mjs` SQL, `handlers.mjs`, `logic.mjs` pure), tests `npm test` (`node --test`) |
| Database | Cloudflare D1 `siu-hei-bou-db` (id `67932535-b39a-4a1f-b7ae-a4fafc9b466d`) — tables users/friends/grudges/cards, schema in `siu-hei-bou-api/schema.sql` |
| API | `https://siu-hei-bou-api.hillmanchan.com` (Workers custom domain) — `/api/*` Bearer Firebase ID token, `/public/cards/:token` no auth (responses field-projected, never leak uid) |
| Deploy backend | `cd siu-hei-bou-api && npx wrangler deploy` (account hillmanchan709@gmail.com) |
| Deploy frontend | normal portfolio push-to-main → S3 + CloudFront |
| Spec / plan | `docs/superpowers/specs/2026-08-08-siu-hei-bou-design.md`, `docs/superpowers/plans/2026-08-08-siu-hei-bou.md` |

Rules: ALL copy Cantonese; NO emoji (hand-drawn inline SVG only); CSS scoped `.shb-*`; Firebase only via lazy `getFirebase()` (keeps it out of the main bundle and App.test's jsdom); the portfolio CSP (`public/index.html`) must keep `https://siu-hei-bou-api.hillmanchan.com` in `connect-src`.

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

### 4. Poker — Hand Recorder (bb100)

**Location:** `poker/bb100/`
**Embed URL:** `casino-game.hillmanchan.com/calculator/poker/bb100/`
**Stack:** Vanilla JS + Chart.js + Firebase Auth (shared with system-design) + cg-poker Lambda

Drag-and-drop GGPoker hand histories → parses in-browser, plots cumulative winnings + EV curves, computes bb/100 + by-position breakdown. Cloud save via Firebase Auth → Lambda → Cloudflare R2.

**Per-tier storage limits** (cumulative hands stored):

| Tier | Hands | Daily AI / Video shares |
|---|---|---|
| Free | 10,000 | 1 video/day |
| Standard | 100,000 | unlimited |
| Pro | 500,000 | unlimited |
| Ultra | 5,000,000 | unlimited |

**Share session graphs feature** (added 2026-05-24):

Public URL: `https://casino-game.hillmanchan.com/p/{shareId}` — opens an immutable snapshot of the session's summary + Chart.js curves. Contains ZERO hand-level data (raw stakes / dates / hole cards all stripped or bucketed).

| Layer | Where |
|---|---|
| Share dialog | `bb100/js/replay/share-dialog.js` (two tabs: Graphs / Hands) |
| Entry: chart card | "📤 Share session" button in `bb100/js/upload.js#renderControls` |
| Entry: replay modal | Existing "Share" button → defaults to Hands tab (video export) |
| API wrapper | `bb100/js/cloud/share-stats.js` |
| Viewer page | `bb100/share/{index.html,share.js,share.css}` |
| URL routing | CloudFront Function `portfolio-subdomain-rewrite` rewrites `/p/{id}` → `share/index.html?id={id}` |
| Backend Lambda actions | `cg-poker`: create-stats-share, get-stats-share, get-share-meta, list-my-shares, revoke-stats-share |
| R2 storage | bucket `casino-poker-hands`, prefix `shared-stats/{shareId}.json` (immutable) |
| Metadata | Firestore `pokerShares/{shareId}` (Admin SDK only — clients never read/write) |
| Monthly counters | `pokerStorage/{uid}.shareGraphs` + `.shareHands` (UTC-month reset) |

**Quotas:**

| Tier | Graphs/month | Hands/month | Expiry | Password |
|---|---|---|---|---|
| Free | 4 | ❌ | 7 days locked | ❌ |
| Standard | 30 | 30 | 7/30/90 days | ✅ |
| Pro | 100 | 100 | 7/30/90/365 days | ✅ |
| Ultra | unlimited | unlimited | + Forever | ✅ |
| Superadmin | unlimited | unlimited | + Forever | ✅ |

**Snapshot semantics:** R2 object is written once, never modified. Owner deleting / re-uploading their session does NOT affect the shared payload. Revocation flips Firestore `revoked: true` + deletes R2 object → readers get HTTP 410. Daily cleanup script GC's expired shares (`lambda/poker/scripts/cleanup-expired-shares.mjs`, not yet on a schedule — invoke manually or wire EventBridge).

**Password gate:** scrypt hash + per-share salt stored in Firestore. `get-stats-share` returns `{requiresPassword: true, title}` before the payload (so the viewer can prompt without leaking stats). Wrong attempts → 403. The Lambda uses `timingSafeEqual`.

**Privacy by design:**
- Sanitiser allowlist drops anything not on the public schema, even if client tries.
- Stakes anonymised to "Micro/Low/Mid/High" buckets, dates to "Last week" … "Over a year".
- X-axis labels = hand index (1, 2, …N), never timestamps.
- Cloudfront Function `portfolio-subdomain-rewrite` enforces the URL format `/p/{base64url 12-32}` — invalid IDs fall through to the SPA 404 fallback rather than hitting the Lambda.

**Deploy:** see `docs/casino-game/poker-share-setup.md` for the full deploy checklist (Lambda, API Gateway, Firestore rules, S3, CloudFront Function).

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
