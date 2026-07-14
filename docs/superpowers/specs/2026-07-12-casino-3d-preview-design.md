# Casino 3D Preview — "Grand Hall" Prototype

**Date:** 2026-07-12
**Status:** Approved design, pending implementation plan
**Relates to:** 2026-07-12-casino-lobby-credits-design.md (this prototype is the
future visual skin of that lobby; the wallet spec is unchanged by this work)

## Summary

A standalone, self-contained HTML prototype of a 3D casino: a luxury lobby hall
with four rooms (Roulette, Blackjack, Baccarat, Ultimate Hold'em), each with a
dealer, seats, and a playable demo round. Betting happens in a 2D DOM overlay;
confirming bets transitions into a 3D play phase rendered with Three.js
(WebGL). **No existing game code is touched** — this is a look-and-feel
prototype the user reviews before any real integration is planned.

## Decisions (with rationale)

| Decision | Choice |
|---|---|
| Preview depth | Playable demo rounds — lobby + 4 rooms navigable, each game plays one fake round (2D chips → 3D spin/deal with dummy outcomes). Chosen so the 2D→3D transition can be judged for real. |
| Visual style | Classic luxury (Macau/Vegas high-roller): green felt, mahogany rails, gold/brass trim, warm spotlights, red-carpet lobby. |
| Devices | Desktop-first; mobile gets a simplified but functional layout (reduced pixel ratio, scrollable betting overlay). |
| Lobby spec tie-in | Full — wallet HUD everywhere, fixed table limits from the lobby+credits spec on brass plaques, demo balance starts at 100,000 chips. |
| Rendering | **Three.js WebGL** (user choice over CSS-3D and 2.5D art). True 3D room, camera fly-in, lit wheel/cards/chips. Accepted costs: ~700KB single file with the library inlined; later real integration means a new rendering layer per game (game logic like `wheel-physics.js` is reused as-is). |
| Assets | 100% procedural — primitive geometries + canvas-generated textures (felt, card faces, chip tops, wheel number ring). No GLTF models, no image files, no font downloads inside the canvas. Keeps the file self-contained and offline-capable. |
| Betting UI | Always 2D DOM overlay (per user requirement) — WebGL only carries rooms + play phase. |

## 1. Deliverable & Location

- **File:** `portfolio/src/game/casino-game/calculator/prototype-3d/index.html`
  — one self-contained file. Three.js (module build, minified) is inlined in
  the same `<script type="module">` as the app code, so the file opens via
  double-click (`file://`) with no server and no network.
- Optionally published as a **private Artifact** for quick viewing (the file is
  CSP-safe because nothing is fetched externally).
- New folder only; zero edits to existing game files. Committed on
  `feat/casino-lobby-credits` (docs + prototype folder).

## 2. Scene: Lobby (Grand Hall)

- Interior hall: red carpet floor, marble columns, warm chandelier key light +
  spot accents, subtle fog for depth.
- **4 archway doors** with glowing brass signs: Roulette, Blackjack, Baccarat,
  Ultimate Hold'em. Clicking a door flies the camera through the archway into
  the room (scene transition hidden by the doorway pass-through).
- A 5th smaller corridor door labeled **"Practice Zone"** — non-functional
  placeholder marking where the practice split will live.
- Idle camera drift + mouse-position parallax so the hall feels alive.
- **Wallet HUD** (DOM, top of screen): chip-balance pill, starts at 100,000
  demo chips, persists across rooms; debits on bet confirm, credits on payout.

## 3. Scenes: Four Rooms

Common to every room: private salon walls, spotlit table, stylized **low-poly
dealer** built from procedural geometry (tuxedo vest, bow tie, idle sway
animation — no rigged model), brass **table-limits plaque** with the approved
lobby-spec numbers, DOM "Back to lobby" control, ghost chips/cards at empty
seats so tables don't feel abandoned. Player "sits": camera drops to a seated
POV at one seat.

| Room | Contents | Plaque limits (from lobby spec) |
|---|---|---|
| Roulette | 37-pocket wheel (number ring, separators, ball), full betting layout on felt | 100–5,000 per spot · 20,000 max per spin |
| Blackjack | Arc table, dealer behind, **6 seats**, card shoe | main 500–10,000 · side bets 100–2,500 |
| Baccarat | Big-table layout, dealer, player seats | main 500–10,000 · side bets 100–1,000 |
| Ultimate Hold'em | Dealer, **6 seats**, ante/blind/trips circles, deck | ante = blind 100–1,000 · trips 100–5,000 · jackpot flat 100 |

## 4. Flow: 2D Betting → 3D Play

1. **Betting phase (2D DOM overlay):** luxury-styled top-down felt layout
   slides up over the dimmed (still-rendering) 3D room. Chip selector
   100 / 500 / 1,000 / 5,000; click to place; per-spot and total limits
   enforced against the demo wallet balance.
2. **Confirm → transition:** overlay slides away, wager debits the HUD, camera
   animates from overview into the action in one continuous move (no cut — the
   room never stopped rendering behind the overlay).
3. **Play phase (3D):**
   - *Roulette:* wheel spin reuses the feel of `roulette/js/core/wheel-physics.js`
     — integer wheel/ball rotations, 4–6s duration, natural deceleration; ball
     orbits, drops, settles in the winning pocket.
   - *Blackjack:* cards fly from the shoe with 3D flip; simple hit/stand DOM
     buttons; dealer draws to 17 (simplified demo rules).
   - *Baccarat / UTH:* scripted auto-play round (deal, reveal, result) — no
     player decisions in the preview.
4. **Result:** banner announces outcome, payout credits the HUD, return to
   betting phase.

Dummy outcomes: `crypto.getRandomValues`-seeded randomness, simplified pay
logic — enough to make the HUD move believably; not a rules-complete engine.

## 5. Out of Scope (explicit)

- Real wallet backend (no Firebase/Lambda calls — demo wallet is in-memory).
- Sound design (later).
- Multiplayer, practice tools, poker bb100.
- Rules-complete game engines (existing games already have them; the preview
  fakes outcomes).
- A Blackjack Normal Shoe room — the lobby spec lists 5 playable entries, but
  the preview covers the four requested rooms (normal shoe would reuse the
  Blackjack room's visuals anyway).
- Any modification of existing game files or navigation.

## 6. Performance & Compatibility

- Target 60fps desktop; `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`,
  shadows on key lights only, single canvas, scenes swapped (not stacked).
- Mobile: functional, reduced DPR, simplified/scrollable betting overlay;
  desktop is the showcase.
- Reduced-motion: respects `prefers-reduced-motion` by shortening camera
  flights.

## 7. Verification

- Open the file in Chrome via browser tools; play one full round in each of
  the four rooms.
- Check: console free of errors, wallet HUD debits/credits correctly, limits
  enforced in the betting overlay, all four camera transitions smooth.
- Screenshot each scene (lobby + 4 rooms + betting overlay + play phase) for
  the user's review.

## 8. After the Preview

If the look is approved, follow-up projects (separately specced) would:
1. Extract the room/table renderers into per-game modules.
2. Integrate with the real games' logic + the lobby/credits wallet
   (2026-07-12-casino-lobby-credits-design.md).
3. Add sound, mobile polish, and the practice-zone door.
