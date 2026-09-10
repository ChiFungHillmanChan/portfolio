# Casino 3D realism rebuild

The user authorized rebuilding dealers, table models and movements across the casino, with priority on roulette, blackjack and baccarat. Work remains in the existing vanilla Three.js engine and keeps the wallet and game rules intact.

## Findings

- The canonical source lives in `portfolio/src/game/casino-game/calculator/lobby-3d`; deployment uses the public mirror and its inlined `index.html`.
- Two dealer implementations share a facade, but hand contact and constraints differ. Existing IK clamps distant table points toward the shoulder, visibly lifting the hand off the felt.
- Cards use a 25 cm arc and a back-overshoot easing curve. Chips also fly and disappear by shrinking.
- Roulette uses a flat rotor with inconsistent pocket and ball heights, then reparents the ball at a discontinuous endpoint.
- Blackjack explicitly follows European no-hole-card rules. Preserve that policy. Baccarat already alternates Player/Banker in its initial four-card sequence.
- Baseline: 130 Node tests passing.

## Implementation

1. Dealer rig: improve professional clothing, face and articulated hand presentation; maintain consistent palm contact and table-height reach, with a usable procedural fallback. Verify real GLB bones and transformed/rotated rigs.
2. Card tables: derive painted card areas, shoe mouth, card destinations and discard positions from shared layout coordinates. Use hand contact through release, low felt slides and correct game-specific dealing order. Verify positions and procedure.
3. Roulette: share dimensions between bowl/track/pockets and the time-based motion model; independent rotor/ball speed, counter-rotation, drag, descent and damped pocket capture. Resolve the already-authoritative result continuously. Verify all 37 pocket outcomes and phase boundaries.
4. Chips: improve clay-chip materials, stable stack spacing, low contact-plane sliding and lifecycle cancellation. Keep payouts from spawning unmanaged timers or scale-away effects.
5. Integration: rebuild source entry, sync changed source into public, run the entire casino suite and frontend production build. Inspect all three games through localhost with the existing stub wallet. Save evidence and remaining limitations.

## Reference boundaries

Wheel construction reference: [roulette wheel patent US20200211327A1](https://patents.google.com/patent/US20200211327A1/en), describing an upper running track, lower inclined track, deflectors and rotor pockets.

Dealing procedure reference: [New Jersey approved casino game rules, Chapter 69F](https://www.state.nj.us/oag/ge/docs/Regulations/CHAPTER69F.pdf). Procedures vary by game variant and venue; the local European no-hole-card rule is retained.

Roulette presentation is a constrained simulation of a supplied outcome, not an independent physics-based random number generator. The implementation must describe this honestly.
