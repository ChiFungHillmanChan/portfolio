# Casino 3D Prototype — Card Clarity, Real Chip Placement, Motion Polish

**Date:** 2026-07-13
**Status:** Approved design, pending implementation plan
**Relates to:** 2026-07-12-casino-3d-preview-design.md (this iterates on that
prototype; same file, same constraints — self-contained, no existing game code
touched)

## Summary

Three user-reported gaps in the shipped 3D prototype, one guiding principle:
**the page should read as a clean, realistic casino — a tidy table with real
chips on it, like watching a real game being played.**

1. **Cards** are too small, too blurry, and don't land in marked boxes on the
   felt the way a real dealer places them.
2. **Chips** never appear: betting is a number badge in the 2D overlay and
   nothing at all on the 3D table.
3. **Motion** is stiff: cards fly in a straight line with a hop, and the
   dealer never moves his arms.

Scope is the `prototype-3d` folder only (blackjack, baccarat, UTH for cards;
all four rooms for chips). Demo wallet only; no backend, no real-wallet
integration, no edits outside the prototype.

## Decisions (with rationale)

| Decision | Choice |
|---|---|
| Card clarity strategy | **3D improvements + 2D hand mirror** (user choice over 3D-only). Oversized cards in painted boxes for immersion, plus a crisp DOM panel mirroring hands so totals/ranks are always readable regardless of camera. This matches Evolution live-dealer UI layered over a first-person-style 3D scene. |
| Card boxes | Painted on the felt at **exactly the card footprint**; deal targets derive from the same constants so cards always land centered in their box. |
| 3D chip placement timing | **Live** — every tap in the 2D overlay immediately flies a chip onto the 3D felt (user: "actually placing on the table"), not deferred to DEAL. |
| Chip stack composition | One tap = one chip of the tapped denomination (the 3D stack mirrors the taps exactly). Payouts use a greedy denomination breakdown (1,600 → 1000+500+100). |
| Dealer animation | Procedural pose tweens on the existing shoulder/elbow group hierarchy — no rigged model, keeps the file self-contained. |
| Reduced motion | All new animation honors the existing `REDUCED` path (shortened or skipped). |

## 1. Cards — bigger, sharper, in painted boxes (3D)

- **Scale:** card plane grows from 0.09 × 0.126 to **0.14 × 0.196** world units
  (~1.55×) — the oversized-prop trick used by first-person RNG casinos.
- **Texture:** faces/backs redrawn at **512 × 716** (up from 256 × 358) with
  jumbo corner indices (rank glyph ≈ 30% of card height), bolder suit pips,
  heavier border. Anisotropy raised where cheap.
- **Painted card boxes** on each felt, outlined in the felt-marking style
  (thin cream/gold line), sized to the new card footprint plus a small margin:
  - **Blackjack:** 2 dealer slots + 2 player slots; hit cards fan to the right
    of the player boxes (as on real tables — only the first two are boxed).
  - **Baccarat:** PLAYER and BANKER boxes, 3 slots each; the third-card slot is
    drawn **rotated 90°** and the third card lands sideways, as dealt in real
    baccarat.
  - **UTH:** 2 dealer slots, 2 player slots, 5 community slots labeled
    COMMUNITY CARDS.
- Blackjack's plain-color felt becomes a canvas-textured felt (like roulette's)
  carrying the boxes, bet spots (section 4), and a game-name arc.
- **Camera:** each card room gets a closer, lower play-phase pose so boxes fill
  more of the frame. Betting-phase and wide poses unchanged.
- Deal-target constants and painted-box positions come from **one shared
  layout table per room** (exported for tests) so they cannot drift apart.

## 2. 2D hand mirror (HUD)

A DOM panel — top-right on desktop, top strip on mobile — that appears when
the first card flies and is removed between rounds and on room exit:

- **Blackjack:** dealer up-card (hole card added at reveal) + running total;
  player cards + total with soft-hand flag. Replaces the current text-only
  total in `#bj-actions` as the primary readout (buttons stay where they are).
- **Baccarat:** PLAYER cards/total vs BANKER cards/total, updating per draw
  (replaces the floating `.bac-tag` totals).
- **UTH:** player hole cards, board as it reveals, dealer cards at showdown,
  plus both hand names at showdown.
- Mini-cards are **pure CSS/DOM** (white rounded rect, rank + suit character,
  red/black) — pixel-sharp at any size, no canvas. One shared builder used by
  all three rooms.

## 3. Chips in the 2D overlay

- Tapping a bet spot **stacks a CSS chip** inside the circle/spot:
  denomination color, dashed edge ring (matching the existing chip-button
  look), slight vertical offset per chip, visual stack capped at ~8 chips with
  the existing total badge always exact.
- UNDO pops the top chip; CLEAR sweeps the stack with a short fade.
- Applies to blackjack circles, baccarat circles, UTH spots. **Roulette grid**
  spots are too small for stacks: one chip icon + amount per bet spot.

## 4. Chips on the 3D table — live placement

- **Painted bet spots** on each felt where the player's chips belong:
  blackjack MAIN / PERFECT PAIR / 21+3 circles at the player's seat; baccarat
  PLAYER / BANKER / TIE zones + side rectangles; UTH ANTE / BLIND / TRIPS
  circles; roulette reuses its existing painted layout (each 2D grid spot maps
  to a felt coordinate via one tested mapping function).
- **Every 2D tap immediately flies a 3D chip** from the near table edge onto
  that spot's stack — small arc, slight rotation, landing wobble. UNDO flies
  the top chip back off; CLEAR sweeps all stacks off toward the player.
- Chip meshes stay on the felt for the whole round (they are the wager).
- **Settlement:** win → payout chips (greedy breakdown) slide in from the
  dealer side to join the stack, then the whole pile glides toward the camera
  and fades as the wallet credits; loss → the stack slides toward the dealer
  and fades (dealer pulls the bet). Push → stack slides back to the player.
- Chip meshes are pooled/disposed with the same `roomGen` guard discipline as
  cards.

## 5. Card flight & dealer motion

- **`dealCardTo` v2:** card leaves the shoe with a short slide along the shoe
  axis, flies with a slight Y-spin (~25°) and a tilt that settles to flat,
  lands with a tiny overshoot-and-settle. Same total duration class as today;
  `REDUCED` keeps the current fast/minimal path.
- **Dealer arms:** on each deal the right arm tweens rest → reach-to-shoe →
  sweep-toward-landing-box → rest, synced to the card flight (pose targets on
  the existing shoulder/elbow groups; solved the same way as the current
  static pose, no new rig). Deals overlap: the arm follows the **latest** card.
- **Dealer head** turns toward the most recent card target / active phase.
  Idle torso sway stays.
- Settlement chip pushes (section 4) read as coming from the dealer's side of
  the table.

## 6. Testing & verification

- `node --test` for the new pure logic: per-room layout tables (box/slot
  positions vs card size), roulette spot→felt mapping, greedy payout chip
  breakdown, 2D stack cap math.
- Browser verification per room: one full round each (bet → deal → play →
  settle), chips visible on felt from first tap to settlement, hand mirror
  matches the 3D cards, zero console errors.
- `#gallery` gains the new props: boxed felt panels, chip stacks, jumbo card
  faces.
- Rebuild `index.html` via `build.mjs`; verify via double-click `file://` open.

## Non-goals

- No integration with the real wallet backend or existing 2D game engines.
- No new practice-zone content, no mobile-specific redesign beyond the
  existing responsive CSS.
- No rigged/GLTF dealer model — procedural only, file stays self-contained.
