# Card Drawer — UI/UX Round (v2.1) Design Spec

**Date:** 2026-07-17
**Status:** Approved (design walked through with user; all three recommended options chosen)
**Baseline:** Card Drawer v2 as merged in PR #66 (spec `2026-07-17-card-drawer-v2-design.md`)

## 1. Summary

Three presentation-layer changes; no rules/logic changes:

1. **Readable spare cards** — the not-in-best-five cards stop being tiny and
   faded; full size, light dimming, relaxed overlap, divider between groups.
2. **Tap-to-view card viewer** — tapping a player's fan opens a full-screen
   overlay showing all their cards large, wrapped (mobile-first).
3. **Pick reveal sequence + take-the-lead celebration** — Pick mode flips the
   chosen card large in a centered overlay, then shows the player's new best
   five with the hand name; if the draw takes the lead, a gold SVG sparkle
   burst + "Takes the lead" ribbon appear, and the leaderboard row glow-pulses
   (the glow also fires on Random-mode leader changes).

**Scope:** `portfolio/public/games/card-drawer/game.js` + `styles.css` only.
`hand-eval.js` and both test suites untouched (66 tests stay green).
All new UI state is transient (`ui.*`) — the `card-drawer:v1` localStorage
schema is unchanged; v2 saves resume as-is.

## 2. Feature 1 — Readable spare cards

- Spares render at the same width as best cards (64px; 56px ≤380px) — the
  52px/46px overrides are removed.
- Dimming softened: `opacity 0.82`, `saturate(0.85)` (was 0.55 / 0.7).
- Fan overlap relaxed from `-36px` to `-28px` (`-26px` on small screens) so
  every index corner reads.
- Group divider: the first spare gets `margin-left: 18px` and a 1px vertical
  rule (`::before`, `var(--ink-faint)`) in the gap.
- Best five keep the brass ring + lift, unchanged.

## 3. Feature 2 — Full-screen card viewer

- The fan (`.fan`) becomes tappable when the player has cards:
  `data-action="view-cards" data-player role="button" tabindex="0"` with
  `aria-label="View [name]'s cards"`; cursor pointer. Enter/Space activate it
  via a delegated keydown handler.
- New transient `ui.viewerFor: playerId | null` (never persisted).
- `viewerHTML()`: full-screen fixed panel (z-index 55, felt background,
  subtle scale-in):
  - Header: player name, "[hand name] — N cards" subline, close X.
  - Body (scrolls vertically): **Best hand** section — the `bestFive` in a
    wrapped grid (min 96px columns) with a brass ring applied by the grid
    class (no sideways scrolling); **Other cards** section — spares sorted
    rank-descending (jokers first), min 84px columns. A full-width Close
    button at the bottom.
- Close paths: X, bottom Close button, Escape. The viewer reads live state,
  so draws/undo while open stay correct; if the shown player's pile empties,
  it renders nothing.
- `resetGame()` clears `viewerFor`.

## 4. Feature 3 — Pick reveal sequence + celebration

**Leader detection** — new light helper (no outs computation):

```js
function currentLeaderId() { /* max evaluateHand score over players; ties keep the earlier player, matching rankedEntries order */ }
```

`tookLead` = there was a leader before the draw, AND the new leader is the
drawing player, AND the leader changed. (Tying the leader is NOT taking the
lead — consistent with `rankedEntries` tie ranks.)

**Pick mode (`pickCard`)** — instead of the fan flip:
- Compute `prev`/`next` leader around the splice; set transient
  `ui.reveal = { playerId, cardId, stage: 1, tookLead }`, close the sheet,
  render. A module-level `revealTimer` auto-advances stage 1 → 2 after 900ms.
- **Stage 1:** centered overlay (z-index 60): the picked card flips over
  large (`min(46vw, 210px)`) using the existing flip animation, caption
  "[name] draws…". Tapping anywhere advances immediately.
- **Stage 2:** the player's current best five, staggered rise-in, ranked,
  with the hand name large; caption with player name; a Done button.
  If `tookLead`: a "Takes the lead" brass ribbon (crown icon + text) pops in
  and a hand-drawn SVG sparkle burst (4-point-star paths, brass, CSS
  twinkle loop) sits behind the cards. Dismiss via Done / tap / Escape.
- On dismiss, if `tookLead`, set transient `ui.leadGlow = playerId` for one
  render — the new leader's row plays a 1.5s gold glow pulse.

**Random mode (`dealRandom`)** — no overlay; same leader detection sets
`ui.leadGlow` directly so the leaderboard row pulses on a lead change. The
existing in-fan flip stays.

**Cleanup:** `resetGame()` clears `revealTimer`, `ui.reveal`, `ui.leadGlow`.
Escape priority: reveal → viewer → sheet. `prefers-reduced-motion` already
collapses all animations globally.

**No emoji** — ribbon, sparkles, and all glyphs are hand-drawn inline SVG.

## 5. Edge cases

- Picked card not in the best five (a dud draw): stage 2 still shows the best
  five — the drawn card was already shown large in stage 1. The drawn card
  gets a stronger ring in stage 2 only when it IS in the best five.
- First card of the game (no leader before): no celebration.
- Deal/undo while viewer open: viewer re-renders from live state.
- Reveal overlay covers the dealer bar, so undo/reset can't race it; reset
  from any state clears every transient.
- Viewer for a player whose cards emptied (undo): renders nothing.

## 6. Verification

- `node --test portfolio/public/games/card-drawer/*.test.js` — 66/66 still
  green (no logic files touched).
- `node --input-type=module --check < portfolio/public/games/card-drawer/game.js`.
- Browser drive: spare readability, viewer open/close (tap, Enter, X, bottom
  button, Escape), reveal stages 1→2 (auto + tap-to-skip), took-the-lead
  ribbon + sparkles + leaderboard glow in Pick mode, glow-only in Random
  mode, no-celebration on tie, reset mid-reveal, resume unaffected, zero
  console errors.

## 7. Ship

Worktree branch `worktree-card-drawer-uiux` → PR → merge to main
(pre-authorized by user: "merge to main once done") → S3 deploy →
live check on card-drawer.hillmanchan.com.
