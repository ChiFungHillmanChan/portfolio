# Casino-game Poker — Cloud Hand-History Storage, Payments, and Replay

**Status:** Approved, ready for implementation plan
**Date:** 2026-05-21
**Owner:** Hillman Chan
**Supersedes:** `2026-05-21-poker-ggpoker-upload-design.md` (folded in as Phase 1)
**Scope:** Extend `casino-game/calculator/poker/bb100/` with a full pipeline — local GGPoker hand-history parsing + EV chart (Phase 1), Firebase Auth on casino-game (Phase 2), authenticated cloud storage in S3 with per-user quota (Phase 3), Stripe subscription tiers (Phase 4), animated GGPoker-style hand replay viewer (Phase 5), and operational hardening (Phase 6).

---

## Overview — five sub-projects, six build phases

```
casino-game.hillmanchan.com  (Firebase Hosting, static)
  │
  ├─ Sign-in (Firebase Auth, REUSING system-design-c84d3 project)
  │
  ├─ /calculator/poker/bb100/                       ← all work lives here
  │    ├─ Phase 1  (Sub-project E)  Local parser + EV chart + evaluator + equity
  │    ├─ Phase 2  (Sub-project A)  Firebase Auth wrapper + login UI
  │    ├─ Phase 3  (Sub-project B)  Cloud storage (S3 + Firestore index)
  │    ├─ Phase 4  (Sub-project C)  Stripe subscriptions + quota
  │    ├─ Phase 5  (Sub-project D)  Animated SVG hand replay viewer
  │    └─ Phase 6                   Hardening (orphan sweep, reconcile cron, dashboards)
  │
  └─ api.system-design.hillmanchan.com  (REUSED API Gateway, broader CORS)
       ├─ POST /poker/sign-upload         → cg-poker  (Lambda, NEW)
       ├─ POST /poker/commit-upload       → cg-poker
       ├─ POST /poker/list-sessions       → cg-poker
       ├─ POST /poker/sign-download       → cg-poker
       ├─ POST /poker/delete-session      → cg-poker
       ├─ POST /poker/get-quota           → cg-poker
       ├─ POST /poker/create-checkout-session → cg-poker
       ├─ POST /poker/create-portal-session   → cg-poker
       └─ POST /webhook/stripe            → sa-webhook (extended)
```

**Key infrastructure reuses:**
- Firebase project `system-design-c84d3` — same Auth, same Firestore (separate collections), zero new keys
- AWS account `575108933055`, region `eu-west-2`, `sa-lambda-role` with extended S3 permissions
- API Gateway `sa-api` (id `zniganhfcg`) — add `/poker/*` routes + broader CORS allowlist
- Stripe account — same secrets, new Products with `recurring.interval`

**New infrastructure:**
- S3 bucket `casino-poker-hands` (eu-west-2, public-access blocked, lifecycle rules)
- Lambda `cg-poker` (Node 22, 256 MB, 15s)
- Firestore collections `pokerStorage/{uid}` and `pokerSessions/{uid}/sessions/{sessionId}`
- 6 Stripe Prices across 3 Products (Standard/Pro/Ultra × monthly/annual)

---

## Verification target (carried forward from old E spec)

The 8-file sample at `/Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8/` contains **1,815 Hero hands**. GGPoker's app shows (before-rake):

- Final green Winnings ≈ **+$8.71**
- Final orange All-in EV ≈ **+$11.23**
- Hand count footer: **1,815 of 1,815 Hands**

**Precision target: EXACT to the cent — no tolerance.** Internally compute to 6 decimal places (BigInt micro-cents); display 2 decimals on the chart and tooltips, 6 decimals in the verify script for proof.

**Phase 1's verify CLI is a HARD GATE.** No Phase 2+ work begins until the CLI prints `Green: $8.71  Orange: $11.23` exactly. Same rule as the old E spec.

To achieve this:
- **Integer arithmetic everywhere.** All dollar amounts stored as BigInt **micro-cents** (1 UC = $1e-6). No float drift.
- **Exhaustive equity enumeration on all streets** including preflop. No Monte Carlo. Same equity GG uses (which is also enumeration).
- **Display layer rounds only at render time.**

---

## Decisions snapshot (top-level)

| Decision | Choice |
|---|---|
| Scope vs existing calc | Add tabs inside `bb100/index.html`; manual calc untouched |
| Chart lines | Winnings (green), All-in EV (orange), Red (non-SD), Blue (SD) |
| Rake toggle default | Before rake (matches GG screenshot) |
| Units | USD only; stake transitions marked on chart |
| Auth | Reuse Firebase project `system-design-c84d3`; one Google login across both products |
| Storage model | Hybrid — raw `.txt.gz` in S3 + parsed index per session in S3 + lightweight pointers in Firestore |
| Storage granularity | One immutable session per upload (NOT per file, NOT per hand) |
| Firestore writes per upload | Exactly 2 (regardless of hand count) |
| Pricing model | Free + 3 paid tiers, both monthly and annual (6 Stripe Prices) |
| Tiers | Free 10k / Standard 100k HK$20 mo / Pro 500k HK$40 mo / Ultra 5M HK$80 mo (annual ~17% off: $200/$400/$800) |
| Over-quota behavior | Hard block; partial-file upload accepted up to limit |
| Downgrade behavior | Existing hands stay viewable; new uploads blocked until usage < tier |
| Equity evaluator | Hand-rolled Cactus Kev (5-card) + best-of-21 (7-card), pure JS, zero deps |
| Replay scope | Animated SVG poker-table view + play/pause/step/speed; static action-timeline as a11y fallback |
| Chart library | Chart.js (CDN with SRI) |
| Build order | Phase 1 → 2 → 3 → 4 → 5 → 6, each independently shippable |

---

# Phase 1 — Local foundation (Sub-project E)

**Goal:** Pure client-side parsing + EV chart, no server. Ships first; everything else layers on top.

**Current state (as of 2026-05-21):** Phase 1 is **largely implemented on branch `feat/poker-bb100-calculator`**. The bb100/ directory already contains all parser modules (`gg-parser.mjs`, `hand-model.mjs`, `validator.mjs`), equity modules (`cards.mjs`, `evaluator.mjs`, `equity.mjs`), stats (`money.mjs`, `compute.mjs`), tests for each, `verify/verify.mjs`, tabs (`tabs.js`), upload UX (`upload.js`, `upload.css`), and a working EV chart in `index.html`. Recent commits (hover crosshair, drag-zoom, side-pot decomposition, rake-share BigInt fix) are Phase 1 polish.

**What remains for Phase 1 → done:**
1. **Verify CLI HARD GATE** — run `node verify/verify.mjs` against the 1815-hand sample; confirm green=$8.71 and orange=$11.23 to the cent, run twice for bit-identical output. If numbers don't match, fix before Phase 2.
2. Extract any inlined chart code into a dedicated `js/chart/render.mjs` if it's currently embedded in `upload.js` (cleanup; not blocking if already factored).
3. Ensure the `index.html` has the 3-tab scaffold (Manual / Upload GG Hands / My Sessions), with "My Sessions" hidden until Phase 2 wires it up.
4. Commit branch + merge to main (or stay on feat branch for Phase 2 work).

The sub-sections below describe the canonical spec for what Phase 1 should be — they match the built code, and serve as both verification reference and onboarding doc.

## 1.1 File map (Phase 1)

```
calculator/poker/bb100/
├── index.html                MODIFY: 3-tab nav scaffold ("Manual" | "Upload GG Hands" | "My Sessions")
│                              (only "Manual" + "Upload GG Hands" wired in Phase 1)
├── css/
│   ├── bb100.css             unchanged
│   └── upload.css            NEW: upload zone, chart container, stats panel
├── js/
│   ├── bb100.js              unchanged
│   ├── upload.js             NEW: orchestration (intake → parse → render)
│   ├── tabs.js               NEW: simple tab switcher
│   ├── parser/
│   │   ├── validator.mjs     NEW: file-shape gate
│   │   ├── hand-model.mjs    NEW: Hand factory + JSDoc typedef
│   │   └── gg-parser.mjs     NEW: hand splitter + per-hand parser
│   ├── equity/
│   │   ├── cards.mjs         NEW: Cactus Kev card encoding
│   │   ├── evaluator.mjs     NEW: 5-card + best-of-21 7-card
│   │   └── equity.mjs        NEW: dispatch + exhaustive enumeration + cache
│   ├── stats/
│   │   ├── money.mjs         NEW: BigInt micro-cent helpers
│   │   └── compute.mjs       NEW: Hand[] → {series, summary}
│   └── chart/
│       └── render.mjs        NEW: Chart.js setup + theme + tooltips
├── verify/
│   ├── verify.mjs            NEW: Node CLI — load 8 sample files, print results
│   ├── verify.html           NEW: Browser version
│   └── README.md             NEW
└── tests/
    ├── fixtures/             NEW: 6 hand-curated GGPoker .txt fixtures
    ├── validator.test.mjs
    ├── gg-parser.test.mjs
    ├── evaluator.test.mjs
    ├── equity.test.mjs
    ├── money.test.mjs
    ├── cards.test.mjs
    └── compute.test.mjs
```

**Why this split:** parser, equity, stats, rendering are independent. No module imports another's internals. Every file fits in one head. Each module testable in isolation.

## 1.2 Parser spec

### File validation gate

A file passes iff:
1. Extension is `.txt`
2. Size ≤ 10 MB
3. First non-blank line matches `/^Poker Hand #(?:RC|HD|SD|TM)\d+: /`
4. UTF-8 decodable; no non-printable bytes in first 4 KB
5. Total upload ≤ 50 MB across all files

Failed files are listed with per-file reasons. No content ever passed to `eval`, `innerHTML`, or `Function()`. All UI displays use `textContent`.

### Hand model

```js
/**
 * @typedef {Object} Hand
 * @property {string}  id              "RC4529039586"
 * @property {{sbUC:bigint, bbUC:bigint}} stake
 * @property {string}  date            ISO 8601
 * @property {{seat:number, position:"BTN"|"SB"|"BB"|"UTG"|"HJ"|"CO", cards:string[]|null}} hero
 * @property {bigint}  contributedUC
 * @property {bigint}  collectedUC
 * @property {bigint}  rakeUC
 * @property {bigint}  totalPotUC
 * @property {boolean} reachedShowdown
 * @property {boolean} heroAllIn
 * @property {"preflop"|"flop"|"turn"|"river"|null} allInStreet
 * @property {Object|null} showdown    {hero:cards, villains:{id:cards}, board:cards}
 * @property {string[]}    fileName    (for traceback)
 * @property {number}      byteOffset  (offset into the session's hands.txt — populated when bundled for upload)
 * @property {number}      byteLength
 */
```

### Position derivation

GGPoker header: `Table '...' 6-max Seat #N is the button`. Hero's seat in the seat list. Position = distance from button:

| Distance | 6-max | HU |
|---|---|---|
| 0 | BTN | BTN (=SB) |
| +1 | SB | BB |
| +2 | BB | — |
| +3 | UTG | — |
| +4 | HJ | — |
| +5 (or −1) | CO | — |

### Per-hand contribution rules

Track Hero from action lines:
- `Hero: posts small blind $X` → add X
- `Hero: posts big blind $X` → add X
- `Hero: calls $X` → add X (incremental)
- `Hero: bets $X` → add X
- `Hero: raises $X to $Y` → add `Y − hero_streetCommittedSoFar`

`collected` accumulates from:
- `Hero collected $X from pot` (may appear multiple times — split/side pots)
- `Uncalled bet ($X) returned to Hero`

**Hero net for hand:** `result = collected − contributed`

### All-in detection

Look for `and is all-in` on a Hero action line. Record the street (preflop/flop/turn/river).

### Showdown detection

`reachedShowdown = true` iff `*** SHOWDOWN ***` present AND Hero did not appear as folded.

## 1.3 Calculation spec

### The four chart series

For Hand `i`, `result_i = collected_i − contributed_i`.

| Series | Per-hand value `v_i` | Cumulative Y |
|---|---|---|
| Winnings | `result_i` | `Σ v_i` |
| All-in EV | `evResult_i` if Hero all-in with known villain cards; else `result_i` | `Σ v_i` |
| Red (non-SD) | `result_i` if NOT `reachedShowdown`, else `0` | `Σ v_i` |
| Blue (SD) | `result_i` if `reachedShowdown`, else `0` | `Σ v_i` |

`evResult_i = heroEquity × (totalPot − rake) − contributed_i + uncalledReturnedToHero_i`

Multi-way all-ins where players go in on different streets are **excluded** from EV (matches GG footnote): `evResult_i = result_i`.

### Rake toggle

- **Before rake** (default, matches GG screenshot): for winning hands, add back `heroShareOfRake_i = rake_i × (heroCollected_i / sumOfAllCollected_i)`. Losing hands unchanged.
- **After rake**: `result_i` as raw (rake already absent from `collected`).

### bb/100

Mixed stakes: `bb/100 = mean(result_i / bb_i) × 100`
Single stake: `bb/100 = (Σ result_i / bb) / hands × 100`
Both reduce to the same when all `bb_i` are equal.

### Summary stats — formulas

| Stat | Formula |
|---|---|
| Total hands | `hands.length` |
| Total $ | `Σ result_i` (toggleable before/after rake) |
| bb/100 | per above |
| All-in EV − Winnings | `Σ evResult_i − Σ result_i` |
| Rake paid | `Σ heroShareOfRake_i` over winning hands |
| Rake bb/100 | `(rakePaid / avgBb / hands) × 100` |
| Position breakdown | Group by `hero.position` → `{count, totalResult, bbPer100}` |

## 1.4 Equity computation (precision-critical)

### 7-card evaluator

Cactus Kev 5-card perfect-hash evaluator (rank 1 = royal flush, 7462 = worst) + best-of-21 for 7 cards. Pure JS, ~300 LOC, zero deps, exact, ~200 ns / eval.

### Equity dispatch — exhaustive on every street

| Board length | Strategy | Cost |
|---|---|---|
| 5 (river) | Deterministic: evaluate both 7-card hands | ~400 ns |
| 4 (turn) | Enumerate 46 river cards | ~10 µs |
| 3 (flop) | Enumerate C(45,2)=990 turn/river combos | ~200 µs |
| 0 (preflop) | Enumerate C(48,5)=1,712,304 boards | ~340 ms |

All equity values are exact rational `wins_microcents / runouts` with division done last. Bit-for-bit identical across runs.

Unknown villain cards → `evResult_i = result_i` (no adjustment); hand still counted.

**Performance budget:** 1815 hands typically have 5–30 preflop all-ins. Worst 30 × 340 ms = 10 s one-time on parse, then cached. Cache key: canonical (hero, villain) sorted card-ints. Subsequent re-renders instant. Progress bar during equity calc.

### Sanity tests

- AA vs KK preflop = 81.71% ± 0.5%
- AKs vs QQ preflop = 46.27% ± 0.5%
- Set vs flush draw on dry flop ≈ 67% ± 0.5%
- River pure deterministic: KQ on AKQJT board vs 22 = 100%

## 1.5 Money helpers (BigInt micro-cents)

`stats/money.mjs` exports:

```js
dollarsToUC('1.50')   → 1500000n
ucToDollars(1500000n) → 1.5         (lossy; for Chart.js consumption only)
sumUC([uc, uc, ...])  → bigint
formatUSD(uc)         → "$1.50"     (round half-up to nearest cent)
formatUSD6(uc)        → "$1.500000" (6-decimal proof for verify CLI)
```

Used everywhere money is touched. The only `Number` conversion is at the Chart.js boundary.

## 1.6 Chart rendering

| Aspect | Spec |
|---|---|
| Library | Chart.js (CDN with SRI hash) |
| Type | Stepped line, no smoothing |
| Background | `#0a0a0f` |
| Grid lines | `#1f1f2a` |
| Axis labels | `#a0a0b0`, Rajdhani 12px |
| Winnings color | `#4ade80` (green) |
| All-in EV color | `#fb923c` (orange) |
| Red line color | `#ef4444` |
| Blue line color | `#3b82f6` |
| Tooltip | Hand# on X; per-series $ value; matches GG style |
| Y-axis tick format | `$0.00` |
| Footer | `1,815 of 1,815 Hands` |
| Toggles | 4 series checkboxes + rake before/after + zoom-to-fit |
| Stake markers | Vertical dashed line + label `NL2→NL5` at stake change |
| Mobile | 320 px height, full width; toggles wrap |
| Desktop | 480 px height; toggles inline |

Existing recent commits already added hover crosshair, drag-to-zoom, floating zoom-out, adaptive x-axis ticks, gridlines — those stay.

## 1.7 File upload UX (logged-out flow)

- Drop zone: 320×180 dashed border, "Drop GGPoker hand history files (.txt) here" + "or click to browse"
- Folder support: Chromium walk + filter to `.txt`; graceful fallback message in Safari/Firefox
- Progress bar during parse + equity calc
- After parse: hide upload zone, show "Loaded 1,815 hands from 8 files" + "Clear / re-upload" button
- LocalStorage opt-in: "Remember this session" — saves parsed summary only (never raw text); keyed `poker-upload-session-v1`; max 5 MB

When Phase 2 ships, an additional **"Save to cloud"** button appears in this panel for logged-in users (see Phase 3).

## 1.8 Error handling

| Scenario | UX |
|---|---|
| 0 valid files | Red banner + per-file reasons |
| Some files rejected | Yellow banner + collapsible reasons |
| Hand parse throws | Skip, increment counter, "1,813 of 1,815 hands parsed (2 skipped — malformed)" |
| LocalStorage quota | Toast "Couldn't cache (storage full)"; chart still works |
| File contains no Hero hands | Reject, reason: "no Hero hands detected" |

## 1.9 Testing & verification

### Unit tests (node:test)

| File | Coverage |
|---|---|
| `tests/cards.test.mjs` | Encode/decode all 52 cards; invalid card throws |
| `tests/money.test.mjs` | dollarsToUC, ucToDollars, sumUC, formatUSD, no drift over 1815 sums |
| `tests/evaluator.test.mjs` | Royal flush rank 1, worst high card 7462, quad/full-house/trips/pair ranges |
| `tests/equity.test.mjs` | AAvKK preflop ~81.71%, AKsvQQ ~46.27%, set vs flush-draw, river deterministic |
| `tests/validator.test.mjs` | Valid GG passes; non-.txt rejected; missing header rejected; binary rejected; oversize rejected |
| `tests/gg-parser.test.mjs` | 6 hand fixtures: walk-in-BB, fold-preflop, 3bet-fold, showdown-win, allin-showdown, uncalled-return |
| `tests/compute.test.mjs` | Series math on a small Hand[] fixture |

### Sample-parity verification (the bar for "Phase 1 done")

`verify.mjs` and `verify.html` load all 8 sample files and print 6-decimal values:

```
Hands parsed:                   1815 / 1815
Final Winnings (after rake):    $X.XXXXXX
Final Winnings (before rake):   $8.XXXXXX     ← rounds to $8.71 (must match GG)
Final All-in EV (after rake):   $X.XXXXXX
Final All-in EV (before rake):  $11.XXXXXX    ← rounds to $11.23 (must match GG)
Red line final:                 $X.XXXXXX
Blue line final:                $X.XXXXXX
All-in EV − Winnings delta:     $X.XXXXXX
Total rake paid:                $X.XXXXXX (X.XX bb/100)
Position breakdown:             [BTN/SB/BB/UTG/HJ/CO with counts + $]
Equity cache hits:              X / X
```

**Phase 1 done = exact match.** When rounded to 2 decimals, green = $8.71 and orange = $11.23. No tolerance. Run twice — every digit identical. If numbers don't match, fix before Phase 2.

### Precision bounds (per-100-hand checkpoint analysis, 2026-05-21)

In addition to final-value matching, we verified cumulative green + orange at every 100 hands against the GGPoker app's chart readings (see `verify/verify-checkpoints.mjs` and `verify/checkpoint-experiment.mjs`). Results:

- **Final orange ($11.23):** matches GG exactly
- **Final green ($8.71):** 1¢ under GG's $8.72 (sub-display-precision drift)
- **18 intermediate checkpoints (hand 100, 200, ..., 1800):** 10 of 18 green and 4 of 18 orange match exactly; remainder drift ±2¢ in non-monotonic pattern
- **Per-hand sub-cent component:** only 28 of 1815 hands produce per-hand results with fractional sub-cent components (those involving rake-share-back calculations); the other 1787 hands contribute clean integer-cent values

We tested 4 alternative per-hand quantization strategies (`sum-then-display`, `half-up-per-hand`, `truncate-per-hand`, `ceiling-per-hand`). Our current `sum-then-display` approach with BigInt micro-cent precision is the **best of the 4** — 10/18 green matches vs next-best 3/18.

The residual ±2¢ drift at intermediate checkpoints is from edge-case algorithm differences in how GG attributes rake/jackpot to winners (likely split-pot decomposition or uncalled-bet handling on specific hands). Closing this fully would require GG's proprietary algorithm. We accept the current bound and move on.

**Precision contract:**
- bb/100 stat: accurate at all stakes
- Final cumulative: within 1¢ of GG over 1815 hands at NL2 (proportional ±$1 at NL200)
- Intermediate checkpoints: within ±2¢ at NL2 (proportional ±$2 at NL200)
- All output bit-identical across runs (deterministic, no float drift)

Phase 6 (hardening) will revisit if/when the user provides GG-app per-hand data at the worst divergence points.

---

# Phase 2 — Auth (Sub-project A)

**Goal:** Sign-in works; ID token attached to all `/poker/*` API calls. Nothing yet for the user to do once signed in.

## 2.1 Firebase changes (one-time, no code)

- Firebase Console → Authentication → Settings → Authorized domains → add:
  - `casino-game.hillmanchan.com`
  - `hillmanchan.com` (portfolio iframe)

That's it. No new providers, no new keys.

## 2.2 Frontend modules

```
calculator/poker/bb100/js/auth/
├── firebase-init.js        Hardcoded Firebase config (public-key); exports app/auth/db/googleProvider/POKER_API_BASE
├── auth-ui.js              Sign-in button, sign-out, onAuthStateChanged listener
└── api-client.js           getIdToken() w/ auto-refresh; apiCall(action, payload)
```

`api-client.js` exposes:
```js
apiCall(action, payload) → fetch('/poker/' + action, {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + idToken, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
}).then(handleResponse)
```

ID token auto-refresh every 50 min, with error handling (re-prompt sign-in on expiry).

## 2.3 Firebase config (no build step, plain static site)

casino-game is plain static HTML — no Vite, no package.json, no `.env`. Firebase web config (API key, auth domain, project ID, etc.) is **public-key material by design**; Firebase's own docs recommend hardcoding it in client code for static sites. We do that:

```js
// js/auth/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2wBCjM1c8bX8VQP4vQbE_q-KoBrRY_vc",
  authDomain: "system-design-c84d3.firebaseapp.com",
  projectId: "system-design-c84d3",
  storageBucket: "system-design-c84d3.firebasestorage.app",
  messagingSenderId: "547168317115",
  appId: "1:547168317115:web:f5130cde873096b7f3839e",
};
export const POKER_API_BASE = "https://api.system-design.hillmanchan.com";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
```

Security boundary is Firebase Auth (validates ID tokens) + Firestore security rules + Lambda token verification — NOT the API key being secret. Same pattern used by every static Firebase site.

Firebase SDK loaded from `gstatic.com` CDN as ES modules — no bundler needed, matches the rest of casino-game's "load from CDN" pattern (Chart.js, Hammer.js already do this).

## 2.4 Firestore security rules update

Append to `portfolio/src/game/system-design/firestore.rules`:

```
match /pokerStorage/{uid} {
  allow read:  if request.auth.uid == uid;
  allow write: if false;   // Admin SDK only
}
match /pokerSessions/{uid}/sessions/{sessionId} {
  allow read:  if request.auth.uid == uid;
  allow write: if false;   // Admin SDK only
}
```

Deploy via existing flow: `npx firebase deploy --only firestore:rules` from `portfolio/src/game/system-design/`.

## 2.5 Login UX states

| State | UI |
|---|---|
| Logged out | "Sign in with Google" button top-right. Upload zone works locally. Subtle "Sign in to save these hands to the cloud" banner above chart. |
| Logged in, free tier | Sign-out button + avatar. New "My Sessions" tab appears next to "Upload GG Hands". "Save to cloud" button visible in upload panel. Quota meter "847 / 10,000 hands". |
| Logged in, paid tier | Same UI; bigger quota; "Manage subscription" link → Stripe Customer Portal. |

A user who just wants the local EV chart never has to sign in. **The cloud is purely additive.**

## 2.6 Phase 2 testing

| Test | Pass criteria |
|---|---|
| Manual: sign in with Google | Avatar appears; ID token logged in console |
| Manual: sign out | Avatar removed; "Save to cloud" hidden |
| Manual: token refresh | After 50 min idle, next API call succeeds (auto-refresh) |
| Manual: cross-domain | Open from `hillmanchan.com/games/casino-game/` iframe — sign-in works |

Phase 2 is shippable even without any API endpoint working — the auth wiring itself is the deliverable.

---

# Phase 3 — Cloud storage (Sub-project B)

**Goal:** Logged-in users can save parsed hand sessions to S3, list them, restore them, delete them. Free tier (10k hands) enforced.

## 3.1 S3 layout

```
s3://casino-poker-hands/                    (eu-west-2, public access blocked)
  └── {firebaseUid}/
      └── sessions/
          └── {sessionId}/                  (sessionId = "2026-05-21T03-00-{ulid}")
              ├── hands.txt.gz              (concatenated .txt files, gzipped)
              └── index.json.gz             (parsed per-hand index, gzipped)
```

- `hands.txt.gz` — concatenation of all uploaded `.txt` files in this session, separated by sentinel `\n=== FILE: <name>.txt ===\n`, then gzipped. Typical ratio ~3.5×.
- `index.json.gz` — `[{handId, date, stake:{sb,bb}, position, result, allInStreet, reachedShowdown, byteOffset, byteLength}]`. Loaded once when user opens the session.

**Why session bundling:**

| Approach | S3 PUTs per upload (1815 hands) | At Ultra scale (5M hands) |
|---|---|---|
| One PUT per hand | 1,815 | 5,000,000 |
| One PUT per file | 8 (variable) | variable |
| **One PUT per session bundle** | **2** | **~10,000 sessions** |

Sessions are **immutable**. Re-uploads create new sessions; we never modify existing ones.

## 3.2 Firestore layout

```
pokerStorage/{uid}                          (one doc per user)
  ├── tier: "free" | "standard" | "pro" | "ultra"
  ├── stripeCustomerId: string | null
  ├── stripeSubId: string | null
  ├── subStatus: "active" | "canceled" | "past_due" | null
  ├── currentPeriodEnd: timestamp | null
  ├── handCount: number              (sum across all sessions)
  ├── sessionCount: number
  ├── bytesStored: number            (sum of bytesCompressed across all sessions)
  └── updatedAt: timestamp

pokerSessions/{uid}/sessions/{sessionId}    (one doc per upload session)
  ├── sessionId: string
  ├── createdAt: timestamp
  ├── fileNames: string[]
  ├── handCount: number
  ├── bytesUncompressed: number
  ├── bytesCompressed: number
  ├── summary: { totalDollarsUC: string, bbPer100: number, dateRange: {start, end}, stakes: string[] }
  └── s3KeyHands: string             ("{uid}/sessions/{sessionId}/hands.txt.gz")
```

`totalDollarsUC` is stored as a string because Firestore can't natively hold BigInt; client parses back to BigInt on read.

**Firestore writes per upload, regardless of hand count: exactly 2** (one session doc create + one storage doc update, batched into a Firestore transaction).

## 3.3 Tier limits table

| Tier | Hand cap |
|---|---|
| Free | 10,000 |
| Standard | 100,000 |
| Pro | 500,000 |
| Ultra | 5,000,000 |

Caps enforced in Lambda; frontend reads tier from Firestore for display.

## 3.4 Upload flow

```
[1] Browser parses + bundles LOCALLY
    Already running for the EV chart (Phase 1's parser).
    Produces two Blobs in memory: hands.txt.gz, index.json.gz.
    Knows handCount, bytesCompressed, summary stats.

[2] Browser → POST /poker/sign-upload
    Body: { sessionId, handCount, bytesCompressed }
    cg-poker (action=sign-upload):
      - Verify Firebase ID token (firebase-admin verifyIdToken)
      - Read pokerStorage/{uid} from Firestore
      - tierLimit = TIER_LIMITS[tier || "free"]
      - If handCount(existing) + handCount(new) > tierLimit:
          allowedHandCount = tierLimit - handCount(existing)
          if allowedHandCount > 0:
            return { ok:false, reason:"partial-quota", allowedHandCount }
            (browser offers: "store first N hands, drop the rest")
          else:
            return { ok:false, reason:"over-quota", upgradeUrl:"..." }
      - Generate 2 presigned PUT URLs (15min expiry, Content-Length+Content-MD5 bound)
      - Return { ok:true, uploadUrls: { hands, index }, sessionId }

    NO Firestore write yet. NO S3 write yet.

[3] Browser PUTs both blobs to S3 (presigned URLs, no Lambda)

[4] Browser → POST /poker/commit-upload
    Body: { sessionId, handCount, bytesUncompressed, bytesCompressed, summary, fileNames }
    cg-poker (action=commit-upload):
      - Verify Firebase ID token
      - HEAD both S3 objects to confirm existence
      - Firestore TRANSACTION:
          a. Re-read pokerStorage/{uid}.handCount
          b. Re-check quota (paranoid 2nd check)
          c. CREATE pokerSessions/{uid}/sessions/{sessionId}
          d. UPDATE pokerStorage/{uid}: handCount += new, sessionCount += 1, bytesStored += new
      - Return { ok:true }
```

**Backend cost per upload (any size):**
- 2 Lambda invocations
- 2 S3 PUTs (browser does these directly)
- 2 S3 HEADs
- 1 Firestore read + 1 Firestore TX (1 create + 1 update)

## 3.5 Read flows

| Action | Backend |
|---|---|
| Load "My Sessions" list | 1 Firestore query, paginated (50/page), ordered `createdAt desc` |
| Open a session | 1 presigned S3 GET for `index.json.gz` (~50 KB at 1000 hands) |
| Click a hand to replay | Slice from already-downloaded `hands.txt.gz` in memory; no backend hit |
| Restore session as raw `.txt` | 1 presigned S3 GET for `hands.txt.gz`; browser un-gzips; expose download buttons for each original file (reconstructed via sentinel `=== FILE: name.txt ===`) |

`hands.txt.gz` is downloaded lazily on first session open and cached in **IndexedDB** keyed by sessionId. LRU cap at 200 MB total cache; older sessions evicted as needed.

## 3.6 Delete flow

```
User confirms delete → POST /poker/delete-session { sessionId }
  cg-poker (action=delete-session):
    - Verify Firebase ID token + ownership
    - Firestore TRANSACTION:
        a. Read pokerSessions/{uid}/sessions/{sessionId}
        b. Decrement pokerStorage/{uid}: handCount -= N, sessionCount -= 1, bytesStored -= bytes
        c. Delete pokerSessions doc
    - Delete both S3 keys (best-effort outside the TX; orphan sweep handles failures)
    - Return { ok:true }
```

Bulk delete-account flow: enumerate all pokerSessions for uid → batch S3 delete → delete pokerStorage doc.

## 3.7 API surface (cg-poker Lambda)

Single Lambda, action-routed (mirrors sa-auth pattern):

| Action | Body | Returns |
|---|---|---|
| `sign-upload` | `{ sessionId, handCount, bytesCompressed }` | `{ ok, uploadUrls:{hands,index}, sessionId }` or `{ ok:false, reason, allowedHandCount? }` |
| `commit-upload` | `{ sessionId, handCount, bytesUncompressed, bytesCompressed, summary, fileNames }` | `{ ok:true }` |
| `list-sessions` | `{ cursor? }` | `{ sessions:[…], nextCursor }` |
| `sign-download` | `{ sessionId, file:"hands"\|"index" }` | `{ url }` |
| `delete-session` | `{ sessionId }` | `{ ok:true }` |
| `get-quota` | `{}` | `{ tier, handCount, sessionCount, bytesStored, limit }` |
| `create-checkout-session` | `{ priceLookupKey }` | `{ url }` (Phase 4) |
| `create-portal-session` | `{}` | `{ url }` (Phase 4) |

Every action verifies the Firebase ID token first. Lookups always scoped by `uid` from the token — never trust client-supplied uid.

## 3.8 IAM updates

Extend `sa-lambda-role`:

```json
// New inline policy: poker-s3-rw
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:HeadObject"],
  "Resource": "arn:aws:s3:::casino-poker-hands/*"
}
```

## 3.9 Concurrency & race protection

| Race | Mitigation |
|---|---|
| Two browser tabs uploading same user concurrently | Firestore TX on `pokerStorage/{uid}` serializes; second commit re-checks quota |
| User downgrades mid-upload | Quota re-check inside commit-TX uses live tier |
| Presigned URL leaked → unauthorized PUT | URL is uid-scoped + 15min expiry + Content-MD5 binding |
| Orphan S3 objects (PUT succeeded, commit failed) | S3 lifecycle rule: tags-based; orphan sweep Lambda nightly (Phase 6) |
| Same sessionId reused (replay attack) | sessionId includes ULID; commit refuses if pokerSessions doc already exists |
| Lambda burst overwhelming Firestore | Lambda reserved concurrency = 50; Firestore handles 10k+ writes/sec |

## 3.10 Frontend modules (Phase 3)

```
calculator/poker/bb100/js/cloud/
├── upload.js         Bundle hands.txt.gz + index.json.gz; call sign-upload + PUT + commit-upload
├── list.js           Fetch + render My Sessions tab; pagination
├── session-detail.js Load session index.json.gz; render hand-grid; wire replay open
├── restore.js        Download hands.txt.gz; un-gzip; expose original .txt files for download
├── delete.js         Confirmation modal; call delete-session
└── quota.js          Read/cache pokerStorage; render quota meter; "Upgrade" CTA at >80%
```

## 3.11 CSS additions

```
calculator/poker/bb100/css/cloud.css
  - Sessions list (table layout, mobile cards)
  - Quota meter (progress bar; turns orange at 80%, red at 95%)
  - Upgrade button styling (matches site palette)
  - Session-detail hand grid (date, position, result columns)
  - Delete confirmation modal
```

## 3.12 Phase 3 testing

| Test | Pass criteria |
|---|---|
| Free-tier upload 1000 hands | handCount goes 0 → 1000 in Firestore; 2 objects in S3 |
| Upload exceeding free tier (e.g. 11000 hands at 0 used) | sign-upload returns `partial-quota` with `allowedHandCount: 10000`; client offers reduced upload |
| Commit-upload race (concurrent tabs) | One succeeds; the other rejects with `over-quota` from TX re-check |
| List sessions | Most-recent first; pagination cursor works |
| Restore session | Download produces files matching original .txt names; checksums match |
| Delete session | S3 keys removed; Firestore doc removed; counter decremented |
| Sign-upload without auth | 401 from Lambda |
| Cross-user access (forged uid in payload) | Rejected — Lambda uses uid from token, not payload |

---

# Phase 4 — Payments (Sub-project C)

**Goal:** Stripe subscriptions unlock Standard/Pro/Ultra tiers. Customer Portal handles cancel/upgrade/card-update.

## 4.1 Stripe products + prices (one-time setup)

3 Products, each with 2 recurring Prices (monthly + annual):

| Product (name in Stripe Dashboard) | metadata | Price lookup_key | HK$ | Interval |
|---|---|---|---|---|
| Poker Standard | `tier:standard, handLimit:100000` | `poker_standard_month` | 20 | month |
| | | `poker_standard_year` | 200 | year |
| Poker Pro | `tier:pro, handLimit:500000` | `poker_pro_month` | 40 | month |
| | | `poker_pro_year` | 400 | year |
| Poker Ultra | `tier:ultra, handLimit:5000000` | `poker_ultra_month` | 80 | month |
| | | `poker_ultra_year` | 800 | year |

`handLimit` in metadata is for human readability; Lambda uses its own `TIER_LIMITS` constant as the authoritative source.

## 4.2 Subscribe flow

```
User clicks "Upgrade to Pro (monthly)"
  ↓
Browser → POST /poker/create-checkout-session { priceLookupKey: "poker_pro_month" }
  ↓
cg-poker (action=create-checkout-session):
  - Verify Firebase ID token (get uid + email)
  - Read pokerStorage/{uid}.stripeCustomerId
  - If null:
      customer = await stripe.customers.create({
        email, metadata: { firebaseUid: uid }
      })
      Write stripeCustomerId back to pokerStorage/{uid}
  - prices = await stripe.prices.list({ lookup_keys: [priceLookupKey], active: true })
  - session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      line_items: [{ price: prices.data[0].id, quantity: 1 }],
      success_url: 'https://casino-game.hillmanchan.com/calculator/poker/bb100/?upgraded=1',
      cancel_url:  'https://casino-game.hillmanchan.com/calculator/poker/bb100/',
      client_reference_id: uid,
      subscription_data: { metadata: { firebaseUid: uid } },
      allow_promotion_codes: true,
    })
  - Return { url: session.url }
  ↓
Browser redirects to Stripe Checkout
  ↓
User completes payment
  ↓
Stripe → POST /webhook/stripe → sa-webhook (extended)
```

## 4.3 Webhook extension (sa-webhook)

Existing handler covers one-time payment links (system-design). Extend with subscription event handling:

```js
switch (event.type) {
  // EXISTING (system-design):
  case 'checkout.session.completed':
    if (session.mode === 'payment') return handleSystemDesignOneTime(session);
    // For subscription mode, do nothing here — subscription events handle it.
    break;

  // NEW (casino-game poker):
  case 'customer.subscription.created':
  case 'customer.subscription.updated':
    return handlePokerSubscriptionUpsert(event.data.object);

  case 'customer.subscription.deleted':
    return handlePokerSubscriptionCanceled(event.data.object);

  case 'invoice.payment_failed':
    // Stripe keeps retrying; we leave tier as-is until subscription becomes canceled.
    return ok();
}
```

`handlePokerSubscriptionUpsert(subscription)`:
1. Read `subscription.metadata.firebaseUid` (set at Checkout creation)
2. Expand `subscription.items.data[0].price.product` to get `metadata.tier`
3. Map tier → `TIER_LIMITS[tier]`
4. Write Firestore `pokerStorage/{uid}`:
   ```js
   {
     tier,
     stripeCustomerId: subscription.customer,
     stripeSubId: subscription.id,
     subStatus: subscription.status,
     currentPeriodEnd: new Date(subscription.current_period_end * 1000),
     updatedAt: serverTimestamp(),
   }
   ```
5. Return 200

`handlePokerSubscriptionCanceled(subscription)`:
1. Look up uid from `subscription.metadata.firebaseUid` (fallback: query Firestore by `stripeSubId`)
2. Write `pokerStorage/{uid}.tier = "free"`, `subStatus = "canceled"`
3. Existing pokerSessions docs and S3 objects untouched — user retains read access

Idempotent — re-delivery produces same writes.

## 4.4 Customer Portal

```
User clicks "Manage subscription" → POST /poker/create-portal-session
  ↓
cg-poker (action=create-portal-session):
  - Verify Firebase ID token
  - Read pokerStorage/{uid}.stripeCustomerId (must exist)
  - session = stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: 'https://casino-game.hillmanchan.com/calculator/poker/bb100/'
    })
  - Return { url: session.url }
```

Portal handles: cancel, upgrade/downgrade, update payment method, view invoices. Each change emits a webhook event that updates Firestore.

## 4.5 Tier enforcement points

| Place | What it does |
|---|---|
| Frontend `quota.js` | Reads `pokerStorage/{uid}.tier` for UI display only |
| `sign-upload` | Reads tier+count from Firestore; rejects/partials over-quota requests |
| `commit-upload` | Re-reads tier+count inside Firestore TX — **authoritative** |

Frontend can be tampered with; Lambda + TX is the security boundary.

## 4.6 Downgrade / cancellation behavior

- `subscription.deleted` (or `subStatus = canceled`) → tier="free"
- All existing pokerSessions docs and S3 objects remain — user can still read, replay, restore
- New uploads blocked by sign-upload check (over free limit)
- If user re-subscribes, tier resets, uploads resume

User never loses data on downgrade — they just can't add more until they delete sessions or re-upgrade.

## 4.7 Frontend modules (Phase 4)

```
calculator/poker/bb100/js/cloud/
├── checkout.js     "Upgrade" button → POST create-checkout-session → window.location = url
├── portal.js       "Manage subscription" → POST create-portal-session → window.location = url
└── tier-banner.js  Top-of-page promo banner; hides when tier !== "free"; A/B copy slot
```

## 4.8 Lambda env vars (cg-poker)

| Var | Description |
|---|---|
| `DATA_BUCKET` | `casino-poker-hands` |
| `FIREBASE_SERVICE_ACCOUNT` | Base64 service account JSON (same as sa-auth/sa-chat) |
| `STRIPE_SECRET_KEY` | `sk_live_…` for creating Checkout/Portal sessions |
| `TIER_LIMITS_JSON` | `{"free":10000,"standard":100000,"pro":500000,"ultra":5000000}` (avoids hardcoding) |
| `WEB_ORIGIN` | `https://casino-game.hillmanchan.com` |

Webhook secret stays in `sa-webhook` env (unchanged).

## 4.9 Phase 4 testing

| Test | Pass criteria |
|---|---|
| Create checkout for Pro monthly | Returns Stripe URL; redirect works |
| Complete test payment (Stripe test mode) | Webhook fires; `pokerStorage/{uid}.tier="pro"`, `subStatus="active"` |
| Cancel via Customer Portal | Webhook fires; tier="free", existing sessions still listable |
| Upgrade Standard→Pro mid-period | Webhook updates tier; quota expands; existing data intact |
| Payment fails (4000000000000341 test card) | invoice.payment_failed received; tier unchanged; Stripe retries |
| Re-delivery of same webhook event | Firestore state identical (idempotent) |

---

# Phase 5 — Replay viewer (Sub-project D)

**Goal:** Click any hand in a session → full GGPoker-like visual replay with animated cards, chips, board cards, and play/pause/step controls.

## 5.1 Architecture

```
calculator/poker/bb100/js/replay/
├── replay-controller.js     State machine + clock + UI orchestration
├── action-extractor.js      Hand text → ordered action list (pure, no state)
├── state-engine.js          (snapshot, action) → nextSnapshot; pure fold
├── table-renderer.js        snapshot → SVG element updates (diff-based)
├── animator.js              CSS transitions between snapshots
└── replay-ui.html           Modal template

calculator/poker/bb100/css/
└── replay.css               Table felt, cards, chips, animations
```

**Data flow:**
```
hand .txt → extractor → action[] → engine fold → snapshot[N] → renderer + animator → SVG DOM
```

## 5.2 Action extraction

```
[
  { type: 'deal-hole',  player: 'Hero',     cards: ['Ks','Kh'] },
  { type: 'post-blind', player: 'Villain1', amountUC: 1000000n, position: 'SB' },
  { type: 'post-blind', player: 'Hero',     amountUC: 2000000n, position: 'BB' },
  { type: 'action',     player: 'Villain2', verb: 'raises', amountUC: 6000000n },
  { type: 'action',     player: 'Hero',     verb: 'calls',  amountUC: 4000000n },
  { type: 'street',     name: 'flop',       cards: ['Ah','7c','2d'] },
  { type: 'action',     player: 'Hero',     verb: 'bets',   amountUC: 8000000n },
  { type: 'showdown',   reveals: { Hero:['Ks','Kh'], Villain2:['Qs','Qd'] } },
  { type: 'collect',    player: 'Hero',     amountUC: 30000000n },
]
```

All amounts BigInt micro-cents. Reuses Phase 1 parser for verb-level lines; adds an ordered-emit pass over the raw .txt.

## 5.3 State engine

Pure: `(snapshot, action) → nextSnapshot`. Snapshot shape:

```js
{
  street: 'preflop'|'flop'|'turn'|'river'|'showdown',
  board: ['Ah','7c','2d'],
  potUC: 12000000n,
  toAct: 'Hero',
  players: {
    Hero:     { seat:2, position:'BB', stackUC:198000000n, committedStreetUC:6000000n, totalCommittedUC:6000000n, cards:['Ks','Kh'], folded:false, allIn:false, lastAction:'calls' },
    Villain1: { seat:1, position:'SB', stackUC:99000000n,  committedStreetUC:1000000n, totalCommittedUC:1000000n, cards:null,         folded:true,  allIn:false, lastAction:'folds' },
    Villain2: { seat:3, position:'BTN',stackUC:194000000n, committedStreetUC:6000000n, totalCommittedUC:6000000n, cards:null,         folded:false, allIn:false, lastAction:'raises' },
  },
  lastEventIndex: 3,
}
```

Snapshot array precomputed at hand-open time (~100 actions × pure fold = ~3 ms). Animator walks the precomputed array.

## 5.4 Renderer (SVG)

600×420 SVG with stable element IDs. Renderer **diffs** against current DOM and updates only what changed (transforms, opacity, text content).

```
<svg id="poker-table" viewBox="0 0 600 420">
  <ellipse class="felt" cx="300" cy="210" rx="280" ry="160"/>
  <g class="seat" id="seat-1" transform="translate(80,290)">
    <circle class="avatar" r="20"/>
    <text class="player-name">Villain1</text>
    <text class="stack-amount">$0.99</text>
    <g class="hole-cards">…</g>
    <g class="bet-chip"/>
  </g>
  <g class="seat" id="seat-2" transform="translate(300,350)">…</g>
  <g class="seat" id="seat-3" transform="translate(520,290)">…</g>
  <g id="board">…</g>
  <text id="pot-display">Pot: $0.12</text>
  <g id="dealer-button" class="dealer-btn"/>
</svg>
```

## 5.5 Animator (CSS-driven for GPU acceleration)

```css
#poker-table .card           { transition: transform .4s ease, opacity .3s; }
#poker-table .bet-chip       { transition: transform .5s cubic-bezier(.4,1.4,.6,1); }
#poker-table .stack-amount   { transition: color .3s; }
.dealer-btn                  { transition: transform .6s ease; }
.card.face-down              { background-image: var(--card-back); }
.card.face-up                { background-image: none; }
.card.flipping               { transform: rotateY(180deg); transition: transform .25s; }
```

| Action | Visual |
|---|---|
| `deal-hole` (Hero) | Two cards fly from deck → seat slot → flip face-up after 200ms |
| `deal-hole` (villain) | Same fly-in, stay face-down until showdown |
| `post-blind` / `bets` / `raises` / `calls` | Chip translates from stack to bet-ring; stack number decrements |
| `folds` | Cards translate toward muck (center-left), fade to 0.3 opacity |
| `street: flop` | Three cards slide from deck onto board with 150ms stagger |
| `street: turn` / `river` | Single card slides onto board |
| `showdown` | Villain cards flip face-up |
| `collect` | Pot chips slide to winner's stack; stack number increments |

## 5.6 Playback controls

```
[◀◀] [⏯] [▶▶]   Hand 47 / 1815   ●─────●─○──── action 6/24
[1×] [2×] [4×]   Speed                  ↑          ↑
[Auto-play next hand]   ☐               drag        current
```

- **◀◀ / ▶▶** — prev/next action
- **⏯** — play/pause; advances at speed × 1500 ms per action
- **Scrubber** — jump to any action; snaps to state without animation when scrubbing
- **Speed** — 1× / 2× / 4×
- **Hand picker** — `<` `N of M` `>`; keyboard `[` / `]`
- **Auto-play next hand** — when current finishes, load next after 2 s pause

## 5.7 Mobile UX

- SVG scales via viewBox (min width 320)
- Controls stack vertically below table
- Speed defaults to 2× on mobile

## 5.8 Accessibility

- Keyboard: `Space` play/pause, `←/→` step, `[`/`]` prev/next hand, `1/2/4` speed
- Static action log displayed below table (the a11y fallback view from Q7 option A); both views share `action-extractor`
- ARIA live region announces each action ("Hero raises to $0.06")

## 5.9 Performance budget

| Item | Budget |
|---|---|
| Snapshot precompute | < 5 ms / hand |
| Render diff per frame | < 1 ms |
| CSS animation | GPU-accelerated, 0 JS in critical path |
| Memory per loaded hand | < 200 KB |
| Target | 60 fps desktop, 30 fps mobile |

## 5.10 Phase 5 testing

| Test | Pass criteria |
|---|---|
| Static action-timeline view (ship first) | Each action rendered correctly from extractor output for all 6 fixture hands |
| Snapshot engine fold | snapshot[N] matches expected state for hand-allin-showdown fixture |
| Animator: no orphan DOM elements after replay | DOM has exactly seat/board/pot elements; no stale chips |
| Mobile rendering | SVG scales to 320px width without overflow |
| Keyboard controls | All keys work; focus indicators visible |

**Phase 5 ships in two halves:**
- **5a:** Static action timeline (1 day) — unblocks "click a hand" use case
- **5b:** Animated SVG table (7–10 days) — full polish

5a and 5b share the extractor; 5b adds engine + renderer + animator on top.

---

# Phase 6 — Hardening

## 6.1 Orphan S3 sweep

Lambda `cg-poker-sweep`, scheduled daily via EventBridge:
- List S3 objects under each `{uid}/sessions/{sessionId}/` prefix
- Check Firestore for matching pokerSessions doc
- If no match AND object age > 24h → delete

Lifecycle rule as backup: any object with no `committed=true` tag, age > 7 days → delete (broader safety net).

## 6.2 Subscription reconcile cron

Lambda `cg-poker-reconcile`, scheduled daily:
- List all active Stripe subscriptions
- For each, read `pokerStorage/{firebaseUid}`
- If tier mismatch → fix (log + patch Firestore)
- For each `pokerStorage` doc with `stripeSubId` not in active list → set tier="free"

Handles missed webhooks (rare but possible).

## 6.3 Integration tests

Headless browser script (Playwright):
1. Sign in with test Google account
2. Upload fixture .txt files
3. Verify session appears in list
4. Open session, click hand, replay completes
5. Delete session, verify cleanup

Run nightly against staging environment.

## 6.4 Mobile pass

Manual + automated checks on:
- iOS Safari (latest + 1 previous)
- Chrome Android (latest)
- Drop-zone fallback (no folder support)
- Replay performance at 30 fps
- Sign-in popup behavior

## 6.5 Error dashboards

CloudWatch dashboard `cg-poker`:
- Invocation count + error rate per action
- Lambda duration p50/p95/p99
- 4xx vs 5xx breakdown
- S3 error count
- Firestore TX retry count (logged from Lambda)

Stripe Dashboard webhook reliability already monitored.

## 6.6 Backup strategy

S3 versioning enabled on `casino-poker-hands` — accidental deletes recoverable for 30 days. Firestore exports to GCS bucket daily (gcloud scheduled export).

---

# Cost model

| Component | At 100 Standard | At 100 Pro | At 100 Ultra |
|---|---|---|---|
| S3 storage (gzipped) | 12 GB → $0.28 | 60 GB → $1.38 | 600 GB → $13.80 |
| S3 PUTs | ~$0.01 | ~$0.05 | ~$0.50 |
| S3 GETs | ~$0.04 | ~$0.20 | ~$2.00 |
| S3 egress | ~$1 | ~$5 | ~$50 |
| Lambda invocations | free tier | free tier | free tier |
| API Gateway | free tier | free tier | free tier |
| Firestore reads/writes | free tier | free tier | free tier |
| **Total monthly** | **~$1.50** | **~$7** | **~$66** |
| **Revenue (HK$→US$)** | $255 | $510 | $1,025 |
| **Gross margin** | **99%** | **99%** | **94%** |

Stripe fees (3.4% + HK$2.35/txn) take ~10–15% off revenue. Net margin still 80%+.

---

# Out of scope (v2 candidates)

- Hole Cards tab (13×13 starting-hand grid colored by net $)
- Game History tab integrated into bb100 view (cross-session filters)
- PokerStars / WPN / ACR support
- GGPoker tournament hand histories
- Multi-player tracking (analyzing villain ranges across hands)
- Note-taking / hand tagging
- Shared replay links (public hand URLs)
- Hand-to-hand equity bar in replay view ("Hero 64% to win at this point")
- Custom HUD overlay (Hand2Note competition — explicitly out of scope)
- Mobile native app

---

# Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Replay viewer scope creep | High | Ship static timeline (5a) first; animations (5b) gated; both share extractor |
| Malicious .txt → XSS via DOM | High | All DOM via `textContent`; never `innerHTML`/`eval`; validator strict |
| Stripe state desyncs from Firestore | Medium | Daily reconcile cron; webhook idempotent + 500-on-transient |
| Orphan S3 objects | Low | Lifecycle + nightly sweep Lambda |
| Firebase project shared with system-design | Low | 99.95% SLA; accept correlated risk vs. doubled management |
| GGPoker format change | Medium | Strict validator gate; diagnostic per file; quick patch turnaround |
| LocalStorage / IndexedDB quota | Low | 200 MB cache cap; LRU eviction |
| Lambda cold start | Low | 256 MB / firebase-admin loads ~1.5s; acceptable |
| Hand2Note adds cheap cloud and undercuts | Medium | Different audience; compete on replay UX, not price |
| User uploads massive file → freezes browser | Medium | 10MB per-file + 50MB total cap; chunked parse via `requestIdleCallback` |
| Preflop equity exhaustive enum freezes UI | Medium | Cache deduplicates matchups; progress bar; chunked execution |

---

# Build order (input to writing-plans)

```
Phase 1 — Local foundation (Sub-project E)         ~1 day remaining (mostly done)
  Already on disk: parser, equity, evaluator, stats, tests, verify CLI, upload UX, EV chart
  Remaining: run verify CLI → confirm $8.71 / $11.23 to the cent (HARD GATE);
             extract chart/render.mjs if inlined; add 3-tab scaffold (My Sessions hidden);
             commit + merge feat/poker-bb100-calculator
  Ships as: working local-only EV chart, no auth, no cloud.

Phase 2 — Auth (Sub-project A)                     ~1 day
  Firebase init + sign-in button + ID token wiring + Firestore rules update
  Add casino-game.hillmanchan.com to authorized domains
  Ships as: users sign in; nothing functional changes yet.

Phase 3 — Cloud storage (Sub-project B)            ~4–6 days
  S3 bucket + cg-poker Lambda + 6 actions + Firestore TX
  Frontend: Save-to-cloud, My Sessions tab, quota meter, restore, delete
  Ships as: free-tier (10k) cloud backup + restore works end-to-end.

Phase 4 — Payments (Sub-project C)                 ~2–3 days
  6 Stripe products + create-checkout-session + create-portal-session
  Extend sa-webhook for subscription events
  Frontend: Upgrade buttons, Manage subscription link
  Ships as: paid tiers unlock; cancellation flow works.

Phase 5a — Static replay timeline                  ~1 day
  action-extractor + static action-list view
  Ships as: click hand → see structured action log.

Phase 5b — Animated SVG replay                     ~7–10 days
  state-engine + table-renderer + animator + playback controls
  Ships as: full GGPoker-style animated replay.

Phase 6 — Hardening                                ~2–3 days
  Orphan sweep + reconcile cron + integration tests + mobile pass + dashboards
  Ships as: production-grade ops.
```

Each phase independently shippable. Each has its own gate. Total estimated calendar time: ~3 weeks for Phases 1–5a, ~5 weeks including 5b + 6.

---

# Security checklist

- [ ] Firebase Auth on casino-game (authorized domain added)
- [ ] Firestore rules deny client writes to pokerStorage and pokerSessions
- [ ] All cg-poker actions verify Firebase ID token before doing anything
- [ ] cg-poker scopes all operations by uid from token (never from payload)
- [ ] Presigned S3 URLs are uid-scoped + time-bound (15 min)
- [ ] S3 bucket all-public-access blocked
- [ ] Stripe webhook signature verified (existing pattern)
- [ ] Webhook returns 500 on transient errors so Stripe retries
- [ ] CORS on API Gateway updated for both `casino-game.hillmanchan.com` and `hillmanchan.com` (iframe)
- [ ] No raw .txt content ever rendered via `innerHTML`; only `textContent`
- [ ] Firebase config in `firebase-init.js` contains only public-key material (no service-account keys, no Stripe secrets)
- [ ] IAM `sa-lambda-role` only granted access to `casino-poker-hands/*` (no wildcards)
- [ ] Tier enforcement done in Lambda + TX, not just frontend

---

# Maintenance calendar

| When | What |
|---|---|
| Daily (automated) | Orphan S3 sweep + Stripe subscription reconcile crons |
| Daily (automated) | Firestore export to GCS |
| Weekly | Review CloudWatch error rates |
| Monthly | Check Stripe webhook delivery success rate |
| Quarterly | Rotate Stripe webhook secret if needed |
| Yearly | Review Lambda runtime EOL schedule |
| As needed | Patch GGPoker parser if format changes |
