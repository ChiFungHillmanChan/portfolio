# Ultimate Texas Hold'em — Jackpot Side Bet + Topbar Cleanup

**Date:** 2026-07-11
**Status:** Approved — ready for implementation plan
**Scope:** Solo (client) **and** Online (cg-uth Lambda), per user choice.

---

## 1. Goals

Two changes to the Ultimate Texas Hold'em casino game:

1. **Remove the redundant ⓘ info button** in the table topbar. It only opens
   Settings → INFO, which is already reachable from the gear (`SETTINGS`) in the
   tab bar.
2. **Add a "Jackpot" side bet** — a flat **$1** opt-in wager settled from the
   player's **two hole cards + the three flop cards** (a 5-card hand), with a
   fixed pay table topping out at a **400,000 Royal-Flush MEGA jackpot** that
   triggers a full-screen celebration.

Both solo tables and online multiplayer tables get the feature. Solo runs the
pure state machine in-browser (`js/core/logic.js`); online is server-authoritative
and settles in the `cg-uth` Lambda. The client `logic.js`/`engine.js` are
byte-identical copies of the Lambda's `logic.mjs`/`engine.mjs` (SYNC
REQUIREMENT), so every logic change is made in all copies and the Lambda is
redeployed.

---

## 2. Task 1 — Remove the topbar info button

**File:** `table.html` (both `src` and `public` copies).

- Delete the `<button … data-action="settings-info" …>` on line 27 inside
  `.uth-topbar-right`. The `.uth-round-label` stays.
- **File:** `js/ui/table-main.js` — remove the now-dead `case "settings-info":`
  in the click handler. The `settingsOverlayHtml("info")` helper and the
  Settings → INFO tab remain (reached via the gear).

No CSS removal required (`.uth-odds-link` may remain unused or be pruned; not
load-bearing).

---

## 3. Task 2 — Jackpot side bet

### 3.1 Pay table

Evaluated from **exactly 5 cards**: the player's 2 hole cards + the 3 flop cards
(`community5.slice(0, 3)`), scored with the existing `evaluate5`. Only a flush or
better pays; everything below loses the $1.

| Hand category (`CAT`) | Pays (profit on the $1) |
|---|---|
| `FLUSH` (5) | 50 |
| `FULL_HOUSE` (6) | 500 |
| `QUADS` (7) | 1,500 |
| `STRAIGHT_FLUSH` (8) | 20,000 |
| `ROYAL` (9) — **MEGA** | 400,000 |

- The bet is a **flat 1 chip** ("$1"), not chip-step-scaled and not tied to the
  ante size. Toggle on/off during betting.
- **Pays even on a fold** — the outcome is fixed the instant the flop is known, so
  like the Hole Card bonus it resolves regardless of the main-hand decisions.
- **Deliberately player-favorable.** With fake practice chips this pay table has a
  positive expected value for the player; it is a fun jackpot, not a balanced
  casino edge. The INFO panel shows the pay table + hit frequencies but **no
  "house edge" row** for the jackpot (that number would be negative/confusing).

Hit frequencies (standard 5-card poker, shown in INFO / `odds.html`):

| Hand | Combinations / 2,598,960 | ≈ Probability |
|---|---|---|
| Flush (non-SF) | 5,108 | 0.197% |
| Full House | 3,744 | 0.144% |
| Four of a Kind | 624 | 0.024% |
| Straight Flush (non-royal) | 36 | 0.00139% |
| Royal Flush | 4 | 0.000154% |

### 3.2 Shared engine (`engine.mjs` / `engine.js`)

Add constants:

```js
export const JACKPOT_BET = 1;              // flat wager
export const JACKPOT_PAYS = {
  [CAT.ROYAL]: 400000,
  [CAT.STRAIGHT_FLUSH]: 20000,
  [CAT.QUADS]: 1500,
  [CAT.FULL_HOUSE]: 500,
  [CAT.FLUSH]: 50,
};
export const JACKPOT_MEGA_CAT = CAT.ROYAL; // full-screen celebration threshold
```

Extend `settleSeat` to take the flop and settle the jackpot **before** the
fold/no-fold branch (alongside the Hole Card bonus, which also resolves on a
fold):

```js
export function settleSeat(seat, playerEval, dealerEval, playerHole, dealerHole, flop) {
  const { ante, blind, trips, holeCard, badBeat, jackpot = 0 } = seat.bets;
  …
  r.jackpotCat = null;
  if (jackpot > 0 && flop && flop.length === 3) {
    const jEval = evaluate5([...playerHole, ...flop]);
    const pay = JACKPOT_PAYS[jEval.cat];
    r.jackpot = pay ? pay : -jackpot;
    if (pay) r.jackpotCat = jEval.cat;   // surfaced to the UI for the win/mega banner
  } else {
    r.jackpot = 0;
  }
  …
  r.net = r.ante + r.blind + r.play + r.trips + r.holeCard + r.badBeat + r.jackpot;
  return r;
}
```

`r.jackpotCat` is a category (or null) for display only; it is **not** summed into
`r.net`.

### 3.3 Shared state machine (`logic.mjs` / `logic.js`)

- `newSeat` → `bets: { ante, blind, trips, holeCard, badBeat, jackpot: 0 }`.
- `placeBets` → read `const jackpot = bets.jackpot ? 1 : 0;`, validate it is 0 or
  1, add to the stack total: `ante*2 + trips + holeCard + badBeat + jackpot`,
  and store `seat.bets = { …, jackpot }`.
- `maybeDeal` → deduction includes `+ jackpot`.
- `showdown` → pass the flop to `settleSeat`:
  `settleSeat(seat, playerEval, dealerEval, hole, dealerHole, community5.slice(0, 3))`;
  `staked` includes `+ (seat.bets.jackpot || 0)`; `seat.result` carries the
  `jackpotCat` through (`seat.result = { ...result, hand: … }` already spreads it).
- `resetRound` → reset `bets.jackpot = 0`.

Backward-compatible: old localStorage solo saves lack `jackpot`; every read uses
`|| 0`, so restored tables keep working.

### 3.4 Tests (`engine.test.mjs`, `logic.test.mjs` — Lambda repo, `node --test`)

- Flush on hole+flop → `r.jackpot === 50`, `r.jackpotCat === CAT.FLUSH`.
- Royal on hole+flop → `r.jackpot === 400000`, `r.jackpotCat === CAT.ROYAL`.
- Sub-flush (e.g. a straight) → `r.jackpot === -1`, `r.jackpotCat === null`.
- **Flop-only:** a board where hole+flop is a flush but hole+all-5 is *not* still
  pays the flush (proves the turn/river are ignored).
- Pays on a folded seat (`seat.folded = true`) — jackpot still settles.
- `jackpot === 0` → `r.jackpot === 0`, no effect on net.

### 3.5 Client UI (`table-main.js`, `uth.css`, `table.html`)

**Bet placement.** `zeroBets()` gains `jackpot: 0`. A distinct **gold JACKPOT
spot** renders on the felt bet board (in `renderBoard`, near the sides row),
showing `$1` when on and `—` when off. It is a **toggle**: `data-action="toggle-jackpot"`
flips `info.pending.jackpot` between 0 and 1 (it does not use the chip rack). The
READY/DEAL total and the stack-affordability check include the $1.

**Result display.** At showdown the jackpot spot shows its delta like the other
spots: `+50` … `+400,000`, or `−1` on a miss (gold `res-pos` styling on a win).

**MEGA celebration.** A new full-screen overlay element (`#megaOverlay` in
`table.html`, `.uth-mega` in CSS) fires when the results step reveals and *my*
seat's `result.jackpotCat === JACKPOT_MEGA_CAT` (Royal). It shows:

- Animated gold rays + CSS confetti (pure CSS keyframes — no external libs, CSP-safe).
- Heading "MEGA JACKPOT" / "ROYAL FLUSH".
- The 5 cards that made the hand (2 hole + 3 flop).
- The **400,000** amount counting up.
- A **COLLECT** button (`data-action="mega-collect"`) that dismisses the overlay.
  Chips are already credited at settlement; COLLECT is the ceremonial "take".

Guarded to fire once per hand via a memo (e.g. `info.megaShownRound === roundNo`).
Lesser jackpots (flush → straight flush) get the gold board glow + an in-dock win
banner, **not** the full-screen takeover.

Trigger point: `stepReveal`, in the `resultsJustShown` branch (where results
first become visible), for the active table.

### 3.6 Info & odds surfaces

- **`strategy-panel.js` → `infoPanelHtml()`** — add a
  `JACKPOT (your 2 cards + the flop)` block with the pay table (custom rows, flat
  `$1 →` amounts, not `X:1` ratios) and a one-line note that it settles on the
  flop and pays even if you fold.
- **`odds.html`** — add the jackpot hit-frequency table (§3.1).

---

## 4. File change list

**Portfolio repo (this repo), each in BOTH `src/game/casino-game/calculator/…`
and `public/games/casino-game/…`:**

| File | Change |
|---|---|
| `ultimate-texas-holdem/table.html` | Remove ⓘ button; add `#megaOverlay` element |
| `.../js/core/engine.js` | `JACKPOT_*` constants; `settleSeat` flop arg + jackpot |
| `.../js/core/logic.js` | seat/bets/deal/showdown/reset wiring |
| `.../js/ui/table-main.js` | Remove `settings-info` case; jackpot toggle, board render, mega overlay, `zeroBets` |
| `.../js/ui/strategy-panel.js` | INFO jackpot pay-table block |
| `.../css/uth.css` | Jackpot spot + MEGA overlay/confetti styles |
| `.../odds.html` | Jackpot hit-frequency table |

**Backend repo (`/Users/hillmanchan/Desktop/system-architecture/lambda/uth/`):**

| File | Change |
|---|---|
| `engine.mjs` | Mirror of `engine.js` logic changes |
| `logic.mjs` | Mirror of `logic.js` logic changes |
| `engine.test.mjs` | Jackpot settlement tests |
| `logic.test.mjs` | Jackpot deal/deduct/reset tests (if applicable) |

### Sync discipline

`engine`/`logic` differ across copies ONLY in the header comment and the import
extension (`.mjs` ↔ `.js`). The logical edits are identical, applied to all three
copies of each file (Lambda `.mjs`, client `src` `.js`, client `public` `.js`).

---

## 5. Deploy

1. `cd /Users/hillmanchan/Desktop/system-architecture/lambda/uth && node --test` — all green.
2. Package + deploy cg-uth:
   ```bash
   npm install --omit=dev
   zip -r /tmp/cg-uth.zip index.mjs engine.mjs logic.mjs package.json node_modules/
   aws lambda update-function-code --function-name cg-uth --zip-file "fileb:///tmp/cg-uth.zip" --region eu-west-2
   ```
3. Portfolio: `src` and `public` are edited together (no build step for the
   vanilla-JS casino game — files are served statically). Verify solo play in a
   browser.
4. Git: feature branch `feat/uth-jackpot-side-bet` → PR → merge (never push main
   directly). The backend repo is committed separately per its own workflow.

---

## 6. Non-goals / YAGNI

- No progressive/shared jackpot pool — the payout is a fixed table, not a growing
  meter.
- No jackpot recommendation from the strategy coach (it's a pure gamble).
- No separate celebration for straight flush (20,000) — only the Royal (MEGA)
  gets the full-screen takeover; the rest reuse the standard win styling.
- No change to the existing Trips / Hole Card / Bad Beat side bets.
