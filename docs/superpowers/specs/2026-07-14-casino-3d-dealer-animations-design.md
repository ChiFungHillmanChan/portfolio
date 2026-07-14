# Casino 3D Lobby — Realistic Animated Dealers & Receptionist

**Date:** 2026-07-14
**Status:** Approved (design), pending implementation plan
**Code base:** `portfolio/src/game/casino-game/calculator/lobby-3d/` (source of truth; synced to `portfolio/public/games/casino-game/lobby-3d/` via the usual copy + `build.mjs`)

## Goal

Make the human figures in the 3D lobby feel alive and professional:

1. The **receptionist** talks (speech bubble + mouth motion) and moves richly in place.
2. The **roulette dealer** spins the wheel, exchanges buy-in chips, places the dolly, pays winning bets and sweeps losing bets.
3. The **blackjack dealer** draws cards from the shoe, deals them, takes and pays bets — synced to the existing live round.
4. The **baccarat dealer** performs a continuous ambient show (deal, flip, third-card rules, announce, pay/sweep, roads update) at the display table.

## Decisions (settled with the user)

| Question | Decision |
|---|---|
| Art direction | **Upgraded procedural** — no GLTF/external assets; keeps the single-file inline build (`build.mjs`) and mobile performance |
| "Talk" | **Speech bubble + mouth motion** — no audio |
| Receptionist movement | **Rich in-place motion** — no walking/pathfinding |
| Baccarat scope | **Ambient dealer show** at the static table; full baccarat live play is a separate future project |
| Animation architecture | **Rig + pose-clip engine** — one generic clip player, gestures as declarative pose data |

## Current state (analysis summary)

- `src/engine/assets.js#makeDealer`: primitive figure (box legs, cylinder torso, vest shell, bow tie, sphere head + hair cap, articulated shoulder→elbow arms). `userData` hooks: `dealGesture(app, target)`, `lookToward(app, target)`, `headShake(app)`, `idle(app)` — all token-guarded, roomGen-guarded, reduced-motion-aware.
- **The live games never call the gestures.** Blackjack (`blackjack-live.js`) flies cards/chips on their own; roulette (`roulette-live.js`) spins the wheel and wholesale-replaces bet stacks via `setBets`; baccarat is display-only; the receptionist only head-looks, stamps, and does one wave-through.
- Build constraint: `build.mjs` inlines vendor + all `src/` into one `index.html` — no external asset pipeline, no GLTFLoader.
- Engine facilities to reuse: frame hooks + `roomGen` guards (`app.js`), tween easings (`tween.js`), card flights (`cards.js#dealCardTo`), chip flights/settle (`chips3d.js#createBetStacks`), wheel `spinTo` (roulette-table), roads scoreboard (baccarat-table), proximity anchors at 10 Hz.

## Section 1 — Figure upgrade & rig engine

### Visual upgrade (keeps the suit/bow-tie casino look)

- **Legs:** thigh + shin capsules with a knee joint each (replaces box slabs).
- **Arms:** existing shoulder→elbow chain + **wrist joint** + **mitt hand with thumb** (grip poses read).
- **Head:** canvas-textured face (eyes + brows), blink lids, separate **mouth mesh** animated during speech; **neck joint** so nods/tilts compose with yaw.
- **Variation:** skin tone, hair color/style (incl. long-hair option), vest color — seeded per character so dealers aren't clones.

### Rig + clip engine (`src/engine/rig.js`, new)

- `makeHumanRig(opts)` → `{ group, joints, api }`. Joints are named `THREE.Group`s with stored rest quaternions: `head, neck, jaw, spine, shoulderL/R, elbowL/R, wristL/R, kneeL/R, hipL/R`.
- **Clip player** (single implementation of all guards): a clip is keyframe data
  `[{ at: 0.3, ease: 'inOutCubic', joints: { shoulderR: {aimAt: [x,y,z]} | {euler: [x,y,z]} } }, …]`.
  The player owns slerping, per-track cancellation tokens, `roomGen` guards, and reduced-motion snapping — the same idioms proven in `dealGesture` / `dealCardTo`, written once.
- **Tracks:** `arms`, `head`, `mouth`, `body`. A new clip supersedes only its own track, so talk + head-track + arm gesture overlap cleanly.
- `aimAt` solves the joint quaternion the way `armQuat` does today (align local −Y to the joint→target vector, in rig-local space).
- **`say(app, text, ms)`**: camera-facing `THREE.Sprite` speech bubble (lazy 256 px canvas, word-wrapped) above the head + mouth-track oscillation; multiple lines queue.
- **Back-compat:** `makeDealer` remains and reimplements its existing `userData` API on top of the rig, so `vestibule.js` / `uth-table.js` work unchanged until their choreography lands.
- **Pure data:** pose/clip definitions live in `src/logic/gestures.js` (no THREE dependency in the data itself) → node-testable.

## Section 2 — Choreography

### Receptionist (`src/floor/vestibule.js`)

- Head tracks the player inside ~6 m; first approach → wave + bubble "Welcome!".
- ID check flow: "May I see your member card?" → stamp moment → "You're verified — enjoy the floor!" + arm sweep toward the turnstile (upgrades `playWaveThrough`); refusal → `headShake` + "You'll need to sign in first.".
- Idle: weight shift (hips/spine), blinks, occasional look-around.

### Roulette dealer (`roulette-live.js` + `roulette-table.js`)

1. **Buy-in moment** at session open: dealer taps the rack; a chip stack slides to the player's apron (bubble: chip change).
2. **Spin:** on the game's `spin` message the dealer turns to the wheel and performs a reach-and-flick timed so the hand meets the rim as `wheel.spinTo(result)` starts.
3. **Dolly:** after the ball lands, dealer places a dolly marker on the winning straight-up cell of the printed felt.
4. **Settle:** losing stacks fly to the rack under a rake/sweep arm gesture; winning spots get payout chips from the rack under a pay gesture. Requires a **pure bet-coverage function** (`src/logic/roulette-cover.js`): result number + bet map → per-spot won/lost. The 2D iframe stays authoritative for money; this is presentation only.
5. Dolly lifts, `setBets` resumes, betting reopens.

### Blackjack dealer (`blackjack-live.js`)

- Every `dealCardTo` gets an **overlapping** draw-from-shoe → sweep-to-spot arm clip (fire-and-forget; never delays the card promise).
- Head tracks the active seat/hand during player decisions.
- Settle: sweep gesture on losses, pay gesture on wins, synced with existing `stacks.settle` flights.

### Baccarat ambient show (new `src/floor/baccarat-show.js`)

- Runs only while the player is within the table's proximity radius; pauses when they leave.
- Loop: deal P/B/P/B from the shoe into the painted boxes → flip with a beat → apply **real third-card rules** (pure `src/logic/baccarat-deal.js`) → bubble announce ("Player wins, 8 over 6") → pay/sweep ghost chip stacks → push the result onto the roads scoreboard → pause → repeat. Meshes disposed per round.

### UTH dealer

Gets the upgraded rig + idle for free; no further choreography (out of scope).

## Section 3 — Performance, error handling, testing

### Performance

- **Proximity gating:** rich idles + ambient show only within ~10 m (reuse the existing 10 Hz anchor scan); distant dealers keep the cheap sway.
- Clips are quaternion slerps on a handful of Groups — negligible per frame. Speech bubbles created lazily.

### Reduced motion (`app.REDUCED`)

- Clips snap to end poses; bubbles still show (they carry information); ambient show reverts to today's static display.

### Error handling

- Choreography is a **visual overlay** — card/chip/wallet promises remain authoritative; a dropped gesture can't stall a round.
- All frame hooks carry `roomGen` guards + `cancel()` (existing idiom); superseded clips return joints to rest.

### Testing (node --test, like existing `tests/*.mjs`)

- Clip data validation (known joint names, monotonic keyframe times).
- `roulette-cover` bet coverage (straight/split/corner/street/line/dozen/column/even-money).
- Baccarat third-card rules table.
- Speech-bubble word-wrap planner.
- `build.mjs` `SRC_ORDER` gains `src/engine/rig.js`, `src/logic/gestures.js`, `src/logic/roulette-cover.js`, `src/logic/baccarat-deal.js`, `src/floor/baccarat-show.js`; build test updated.

## File plan

| File | Change |
|---|---|
| `src/engine/rig.js` | **new** — rig factory, clip player, `say()` |
| `src/logic/gestures.js` | **new** — pure pose/clip definitions |
| `src/logic/roulette-cover.js` | **new** — pure bet-coverage for settle choreography |
| `src/logic/baccarat-deal.js` | **new** — pure baccarat round generator (third-card rules) |
| `src/floor/baccarat-show.js` | **new** — ambient show loop |
| `src/engine/assets.js` | `makeDealer` becomes a thin wrapper over `makeHumanRig` (API-compatible) |
| `src/floor/vestibule.js` | receptionist choreography + speech |
| `roulette-live.js`, `src/floor/tables/roulette-table.js` | spin/dolly/settle/buy-in choreography, per-spot settle instead of wholesale `setBets` replace |
| `blackjack-live.js` | deal/settle arm clips, head tracking |
| `src/floor/tables/baccarat-table.js` | expose show rig (shoe/boxes/roads hooks) |
| `build.mjs` + `tests/build.test.mjs` | SRC_ORDER additions |
| `tests/*` | new pure-logic tests |

After implementation: sync `src/game/casino-game/calculator/lobby-3d/` → `public/games/casino-game/lobby-3d/` and run `build.mjs` as usual.
