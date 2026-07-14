# Card Drawer — Design Spec

**Date:** 2026-07-13
**Status:** Approved for planning
**Subdomain:** `card-drawer.hillmanchan.com`

## 1. Summary

A local, pass-and-play "card drawer" game. The host adds up to 10 players, then
hands out cards from a single shuffled deck (52 or 54 with jokers) — either by
random deal or by manually picking a specific card. Every card a player receives
is stored in their pile. A live leaderboard ranks players by the strength of
their best 5-card poker hand and highlights the current winner.

There is **no game AI, no betting, and no turn enforcement** — every decision
(who draws, when, which card in manual mode) is made by the human host. The app
is purely a dealer + scorekeeper.

**No backend.** No Firebase, no auth, no wallet, no network calls. All state is
in-memory plus `localStorage`. This matches the existing simple-game pattern
(`connect4`, `math-memory`).

## 2. Goals / Non-goals

**Goals**
- Add/remove/rename up to 10 players before starting.
- Include or exclude jokers at setup (52 or 54 card deck).
- Two draw modes: random deal off the top, or manual pick from remaining cards.
- Single deck, drawn without replacement — one player can take all 52/54.
- Live leaderboard ranking players by best 5-card poker hand.
- Mobile-first (portrait) UI.
- Resume an in-progress game after reload.

**Non-goals (YAGNI)**
- No online / real-time multiplayer.
- No accounts, no persistence beyond this browser's `localStorage`.
- No enforced turn order, no auto-draw, no bots.
- No chips / money / betting.
- No sound (light card-flip animation only).

## 3. Architecture & file layout

The portfolio SPA already resolves game subdomains itself. In
`portfolio/src/App.js`, `GAME_SUBDOMAIN_COMPONENTS` maps the first hostname label
to a game component, and `getGameComponentFromHostname()` renders it full-screen.
`connect4.hillmanchan.com`, `math-memory.hillmanchan.com`, etc. all use this.

We follow the established **static-game-in-an-iframe** pattern rather than a
separate React app or Firebase-hosted site (both overkill for a no-backend game).

### Files to add

```
portfolio/public/games/card-drawer/
  index.html          # markup + <script type="module" src="game.js">
  styles.css          # mobile-first styling + card color tokens (CSS vars)
  hand-eval.js        # PURE poker logic (ES module) — deck, ranking, comparison
  card-svg.js         # PURE renderCardSVG(card, opts) — detailed SVG card faces/back/joker
  game.js             # UI + state (ES module) — imports hand-eval.js + card-svg.js
  hand-eval.test.js   # node --test unit tests for hand-eval.js
  card-svg.test.js    # node --test — every rank/suit + joker + back produce valid <svg>
  package.json        # { "type": "module" } so node parses .js as ESM for tests

portfolio/src/game/card-drawer/
  CardDrawerGame.jsx     # thin iframe wrapper (mirrors MathMemoryGame.jsx)
  cardDrawerStyles.css   # full-screen iframe container styles
```

### Files to edit

`portfolio/src/App.js`:
- `import CardDrawerGame from './game/card-drawer/CardDrawerGame';`
- Add `'card-drawer': CardDrawerGame` to `GAME_SUBDOMAIN_COMPONENTS`.
- Add `<Route path="/card-drawer" element={<CardDrawerGame />} />` to the
  standalone routes block (so `hillmanchan.com/card-drawer` also works).

### Why a folder-local `package.json`

`hand-eval.js` is written as an ES module so both the browser
(`<script type="module">`) and `node --test` can load it. Node treats `.js` as
CommonJS unless a `package.json` with `"type": "module"` is present in the
directory. The file is a static asset copied to S3 by the build but is never
fetched by the game — harmless. This keeps the pure logic in one place, testable
by `node --test`, and MIME-safe (plain `.js`, not `.mjs`).

### Build & serve

CRA copies `public/**` verbatim into `build/**`, which the GitHub Actions
workflow uploads to the S3 bucket `hillmanportfolio1` (see `DEPLOYMENT.md`). The
iframe loads `/games/card-drawer/index.html` from the same origin. No new build
step.

## 4. Deck & draw mechanics

- **Deck:** standard 52 cards; +2 jokers when "Include Jokers" is on (54).
- **Shuffle:** Fisher–Yates on Start.
- **Random deal:** pop the top card of the shuffled deck → assign to the tapped
  player. Reveal it with a flip animation.
- **Manual pick:** open a bottom-sheet grid of the **remaining** cards (52/54
  minus already-drawn); tapping one assigns it to the player and removes it from
  the deck. Taken cards are not shown.
- **Draw mode toggle** `[ Random | Manual ]` at the top of the game screen;
  switchable at any time.
- **Deck empty:** draws disabled; show "Deck empty".
- **Undo:** reverts the single most recent draw (card returns to the deck).
  Disabled when there is nothing to undo. (Undo restores the card to the deck; it
  does not attempt to preserve prior shuffle order — the next random draw re-pops
  the top.)
- **Reset:** returns to the setup screen and clears the current game.

## 5. Winning logic (`hand-eval.js`, TDD)

Evaluate each player's **best 5-card hand** from all cards they hold (choose the
best 5 if they hold more). Category ranking, **high → low**:

| Rank | Category | Notes |
|------|----------|-------|
| 10 | Five of a Kind | Only reachable with a wild joker; new top rank |
| 9 | Royal Flush | Highest straight flush (A-K-Q-J-10 suited) |
| 8 | Straight Flush | |
| 7 | Four of a Kind | |
| 6 | Full House | |
| 5 | Flush | |
| 4 | Straight | A plays high (Broadway) and low (A-2-3-4-5 wheel) |
| 3 | Three of a Kind | |
| 2 | Two Pair | |
| 1 | Pair | |
| 0 | High Card | Ace is the highest card |

### Rules from the spec

- **Straight & Flush (and straight/royal flush) require ≥5 cards.** This falls
  out for free: a 5-card straight or flush is impossible with fewer than 5 cards.
  So `{3,4,5}` evaluates as **5-high** (high card), never a straight. `{A}`
  (single card) is **A high**.
- **Ace is high** for high-card/pairs, and also plays low for the wheel straight.
- **Jokers are wild.** A joker becomes whatever card yields the best hand,
  enabling Five of a Kind.

### Wild-card algorithm (chosen for provable correctness)

Because the deck is a single deck, a player can hold **at most 2 jokers**
(W ≤ 2). Implementation:

1. Split the player's cards into naturals (real cards) and W wild jokers.
2. A "plain" evaluator (no wilds) computes the best 5-card hand of a set of
   concrete cards and returns a comparable score. It supports rank counts up to 5
   (Five of a Kind) so a wild-substituted set scores correctly.
3. For W wilds, brute-force each wild over all 52 concrete card values
   (duplicates allowed — a wild may become a 5th ace), run the plain evaluator on
   naturals + assigned wilds, and keep the maximum score. W=2 → ≤ 52×52 = 2704
   evaluations; microseconds in JS, run per leaderboard update.

This is chosen over an analytic per-category wild solver because it is far easier
to verify: the plain evaluator is unit-tested directly, and brute-forcing wild
assignments is the literal definition of "best hand with wilds".

### Score representation & comparison

Each evaluated hand returns a tuple: `[categoryRank, ...tieBreakRanks]`
(tie-break ranks are the relevant card ranks in descending priority order).
Compare two hands element-by-element:

- Higher `categoryRank` wins.
- Then compare tie-break ranks in order; higher wins.
- **Different lengths (players with different card counts):** compare shared
  positions first. If all shared positions are equal, the hand with an **extra
  present tie-break rank wins** — e.g. `{A,K,2}` beats `{A,K}`. (Decision: extra
  kicker wins rather than tie. Reversible if desired.)

### Worked examples (encoded as tests)

- `{3,4,5}` → high card, `[0, 5,4,3]` → displayed "5 high". Not a straight.
- Player A `{A,K}` = `[0, 14,13]`; Player B `{A,Q,4,5,6}` = `[0, 14,12,6,5,4]`.
  Compare: category tie, 14=14, 13 > 12 → **A wins** (A-K high beats A-Q high).
- `{9,9,9,9,Joker}` → Five of a Kind (nines), top rank.
- `{K,Joker}` → Pair of kings. `{Joker,Joker}` → Pair of aces. `{Joker}` → A high.
- `{A,2,3,4,Joker}` → 5-high straight (wheel) — 5 cards, joker completes it.

## 6. Leaderboard

- Sorted by hand score, descending. Winner shown with a highlighted "Leader"
  marker (SVG crown/laurel glyph — no emoji).
- Each row: rank, player name, best-hand label (e.g. "Full House, Kings over
  9s"), and card count.
- **Ties** share the same rank number.
- **0-card players** show "No cards yet" and sort last.
- Updates live after every draw and every undo.

## 7. UI / UX (mobile-first)

- Portrait-first single-column layout; ≥44px touch targets; bottom-sheet for the
  manual-pick grid.
- **No emoji anywhere** in the UI — all glyphs (suits, joker, winner marker,
  control icons) are hand-drawn SVG vectors.
- **Setup screen:** player name input + Add; player list with rename/remove;
  Include-Jokers toggle; Start (enabled at **≥2 players**).
- **Game screen:** draw-mode toggle, deck counter, per-player panels (name,
  fanned cards, current best-hand label, Draw button in random mode), leaderboard,
  Undo, Reset.
- Distinctive visual direction (apply the frontend-design skill during build) —
  not a templated default.

### Card rendering — detailed SVG "designer" cards (no emoji, no image files)

Every card is a **self-contained inline SVG** generated by a
`renderCardSVG(card, opts)` helper (a pure function in its own module, e.g.
`card-svg.js`) — scalable, crisp on retina, styled with a small set of tokens.
No `<img>`, no emoji, no external font for glyphs.

A card face SVG contains:
- **Face:** rounded-corner white panel (rx ≈ 8% of width), 1px hairline border,
  subtle inner drop-shadow; portrait aspect ≈ 2.5 : 3.5 (standard poker card).
- **Corner indices:** rank + a small suit symbol in the **top-left**, mirrored
  (rotated 180°) in the **bottom-right** — exactly like a real card. Reds
  (hearts, diamonds) use a red token; blacks (spades, clubs) a near-black token.
- **Suit pips as SVG paths** (hand-authored vector paths, NOT Unicode/emoji):
  - Number cards **2–10:** the traditional pip layout at the correct canonical
    positions for each rank, with the middle-column pips on 7/8/9/10 flipped
    (rotated 180°) as on real cards.
  - **Ace:** one large ornate central pip.
- **Court cards J / Q / K:** a "designer" treatment that reads as a real court
  card without needing photoreal illustration — a large ornamental letter (J/Q/K)
  paired with the suit, framed by a decorative border/guilloche motif and drawn
  with **rotational (180°) symmetry** so the top and bottom halves mirror, like a
  genuine court card. Each of J/Q/K has a distinct emblem/flourish.
- **Joker:** a dedicated designer joker card — a stylized jester/harlequin motif
  (diamond-lattice cap or masked emblem) with a "JOKER" wordmark and its own
  accent color, clearly distinct from the four suits.
- **Card back:** a designer back pattern (geometric guilloche / diamond lattice)
  used for the face-down deck stack and the random-draw flip animation.
- **States:** faces support a "dimmed/taken" style (for the manual-pick grid) and
  a compact "fanned" variant (overlapping) for a player's pile on small screens.

Keep the SVG generator a **pure, testable module** (given a card → returns an SVG
string / element); the game UI only composes these. Colors come from CSS custom
properties so the whole deck restyles from one place.

### Decisions on open flags

- **Minimum players: 2.** A leaderboard needs someone to rank against.
- **Extra-kicker tie-break: extra present kicker wins** (`{A,K,2}` > `{A,K}`).

## 8. Persistence

- Serialize `{ phase, players, deck, drawnHistory, drawMode, includeJokers }` to
  `localStorage` under a versioned key (e.g. `card-drawer:v1`) on every state
  change.
- On load, validate the shape; if a valid in-progress game exists, offer
  **Resume** or **New game**. Corrupt/absent state → fresh setup screen.

## 9. Error handling & edge cases

- Deck empty → draws disabled with a clear message.
- Manual mode → only remaining cards are selectable.
- Duplicate player names allowed (host's choice); empty names rejected.
- Undo with empty history → disabled.
- `localStorage` unavailable/corrupt → fall back to in-memory only, no crash.
- All hand evaluation is defensive against 0-card and 1-card piles.

## 10. Cloudflare DNS (host performs; steps provided post-merge)

No Cloudflare credentials exist in the dev environment, so the host creates the
record. The new subdomain serves the **same origin** as the existing game
subdomains and the SPA self-routes on hostname, so the only change is one DNS
record that **mirrors the existing `connect4` record** (same type, target, and
proxy/orange-cloud setting) with the name `card-drawer`. Exact dashboard
click-path is delivered after the code is merged. No Worker, no S3, no cert work.

## 11. Verification (done = works for a user)

- `node --test portfolio/public/games/card-drawer/hand-eval.test.js` — every
  category, wild-joker cases, the wheel, <5-card cases, and the two spec examples
  in §5, plus comparison/ordering and deck-integrity (no dup cards, 52/54 count).
- `node --test portfolio/public/games/card-drawer/card-svg.test.js` — every
  rank/suit, joker, and card back return well-formed `<svg>` markup; no emoji
  code points anywhere in the output.
- Drive the game in a real browser: add players, both draw modes, jokers-wild,
  undo, reset, resume after reload — confirm **no console errors**, the SVG cards
  render correctly (indices, pips, court, joker, back), and the leaderboard
  matches hand-eval.
- `npm run build` in `portfolio/` to confirm the `App.js` edit compiles.

## 12. Out-of-scope follow-ups (not in this build)

- Listing Card Drawer in the portfolio games grid / `projectData.json`.
- Any analytics or sharing.
