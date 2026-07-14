# Realistic Dealer Characters — 3D Lobby (GLB + mocap + IK)

**Date:** 2026-07-14
**Area:** `portfolio/src/game/casino-game/calculator/lobby-3d/` (mirrored to `portfolio/public/games/casino-game/lobby-3d/`)
**Status:** Approved design, pre-implementation

## Problem

The lobby's dealers are procedural figures built from rigid primitives
(`src/engine/rig.js`): capsules/spheres/boxes parented to joint groups. Joints
don't deform (segments gap/intersect), motion comes from hand-authored 3–4-key
euler clips (`src/logic/gestures.js`), and "reaching" is aim-the-shoulder with
no elbow solve. The result reads as a robot with wrong physics. Goal: dealers
that look and move like believable game humans (GTA-style quality bar within a
stylized art direction), across shuffle, dealing, chip work, and roulette.

## Decisions (locked with user)

1. **External assets allowed** — rigged character GLBs fetched at runtime
   (~1–5 MB total); the single-file `index.html` build otherwise unchanged.
2. **All dealers, one shared system** — every table + baccarat show +
   vestibule receptionist swap to the new system in this project.
3. **Physics-flavored animation, no physics library** — props (cards, chips,
   ball, dolly) follow deterministic ballistic arcs / spin / settle
   simulations synced to the hands; no rigid-body engine dependency.
4. **CC0 Quaternius assets** — Universal Base Characters (6 rigged humans,
   glTF) + Universal Animation Library (120+ clips, GLB, same universal rig,
   no retargeting needed). Both CC0. Sources:
   - https://quaternius.com/packs/universalbasecharacters.html
   - https://quaternius.com/packs/universalanimationlibrary.html
5. **Layered animation architecture** — mocap clips drive the body via
   `THREE.AnimationMixer`; a runtime two-bone IK layer drives the arms for
   precise object interaction; a clamped look-at layer drives the head.

## Architecture

| Piece | Role |
|---|---|
| `src/engine/character.js` | GLB character system: preload, per-dealer skeleton clone, AnimationMixer, IK application, look-at, layer blending. Exposes the same rig API as `rig.js` (`play`, `say`, `lookAt`, `setIdle`) |
| `src/logic/hand-paths.js` | Pure data + validation for IK hand paths (world-ref waypoints, easing, wrist orientation, two-hand support, timeline events). Node-tested; the successor of `gestures.js` clip data |
| `src/logic/ik.js` | Pure two-bone IK math (chain lengths + target + pole hint → rotations). No THREE; node-tested |
| `vendor/GLTFLoader-0.149.js` | Official three r149 GLTFLoader mechanically wrapped for the global-`THREE` classic-script build, plus a `SkeletonUtils.clone` helper (skinned meshes can't be naively cloned) |
| `assets/dealer-characters.glb`, `assets/dealer-clips.glb` | Committed binaries: 2–3 Quaternius base characters + a stripped ~10-clip subset of the animation library. A one-time node prep script trims the packs and emits a bone-name manifest JSON (committed) |

**Progressive swap, no API change.** `makeDealer()` stays synchronous and
returns the procedural rig immediately. `C.character.preload()` starts at
boot; when assets arrive each dealer's visuals swap to a GLB character in
place behind the same rig facade. Load failure (offline / timeout 10s / parse
error / bone mismatch) → procedural dealer stays, one `console.warn`, zero
gameplay impact. No call-site changes in the four tables, `baccarat-show.js`,
or `vestibule.js`.

**Variation.** Per-dealer `seed` picks the character model and tints
skin/hair/outfit materials using the existing palettes, plus small height
scale variation.

**Build.** `build.mjs` JS inlining untouched; the `.glb` files sit next to
`index.html`, fetched at runtime. Sync-to-public copies them like other files.

## Animation system

Three layers composed per frame, in order:

1. **Base (mocap, AnimationMixer):** looping idle with real breathing/weight
   shift (replaces procedural sway), occasional idle variations; `wave`,
   `nod`, `headShake`, `welcomeSweep` map to library clips with ~0.25s
   crossfade.
2. **Action (IK arms over mocap body):** `dealCard`, `washCards`,
   `shuffleRiffle`, `sweepChips`, `payChips`, `spinReach`, `spinFollow`,
   `placeDolly`, `tapRack` drive clavicle→upperarm→forearm→hand chains along
   authored hand paths resolved against the existing `refs` API
   (`{shoe, target, rack, rim}`). Arm control ramps in/out over ~120 ms; elbow
   pole vectors point down-and-out.
3. **Look-at (head/neck):** clamped yaw/pitch applied after the mixer, same
   API/feel as today.

All existing clip names keep working through `rig.play(app, name, {refs, ms})`.
Cancellation preserves current idioms exactly: per-track tokens, `roomGen`
guard, `hook.cancel`. `REDUCED` mode: no mixer, no frame hooks, static pose.
Speech bubbles unchanged; mouth flap becomes a subtle head-bob (morph targets
only if the pack has them).

## Props — physics-flavored, hand-synced

Hand paths expose named timeline events (`grab`, `contact`, `release`); prop
animations subscribe. All motion is deterministic — gameplay outcomes are
unchanged; only the journey gets physical.

- **Card dealing:** card spawns at the hand bone world position on `release`,
  flies a gravity-shaped arc with in-flight spin, lands with 2–3 cm
  slide-and-settle (~80 ms rotation snap). Replaces straight-line tweens in
  `cards.js`.
- **Baccarat ritual:** wash — smeared cards follow the two palm-bone positions
  sampled live per frame; riffle — two half-stacks interleave with per-card
  flip timing driven by the hand-cycle phase plus slight randomness.
- **Chips:** movement starts at `contact`, staggered, tiny arc, settle wobble.
- **Roulette:** wrist flick fires the wheel's angular-velocity kick on the
  contact frame; ball launches from the hand into the existing spiral sim;
  dolly parents to the hand bone between `grab` and `release`.

## Error handling

| Failure | Behavior |
|---|---|
| GLB fetch fail / 10s timeout / parse error | Procedural dealer stays; `console.warn`; gameplay unaffected |
| Bone-name mismatch vs committed manifest | Treated as load failure (full fallback), never a half-broken skeleton |
| IK target out of reach | Clamp to max reach along target direction; never invert a joint |
| Room switch mid-animation | Existing `roomGen` + track-token cancellation, preserved |
| `REDUCED` mode | Static neutral pose, no per-frame work |
| No finger bones in pack | Cards/dolly parent to the hand bone; grip pose only if fingers exist |

## Testing & performance

- **Node tests** (extend `lobby-3d/tests/`): `ik.js` geometric cases
  (reachable, out-of-range clamp, pole orientation); `hand-paths.js`
  structural validation (monotonic timing, known event names/ref keys,
  `validateClip`-style); bone-mapping table vs committed manifest JSON.
- **Visual:** drive the lobby via the scoped `calculator:verify` skill — every
  table's dealer actions + full baccarat ritual; console clean.
- **Performance:** ~6–8 skinned characters visible. Shared geometry via
  skeleton clones; mixer throttled to 15 Hz beyond ~10 m; `castShadow` off for
  far dealers. Target: no regression below 60 fps desktop / 30 fps mobile.
- **Fallback test:** block the asset fetch; confirm the procedural dealer
  still runs everything.

## Risks

- **Finger bones unconfirmed** in the Quaternius rig — design does not depend
  on them (props parent to the hand bone).
- **GLTFLoader wrap for r149** — examples/js builds were removed by r149; the
  module source must be mechanically wrapped to the global-`THREE` style. If
  the wrap fights back, fallback is vendoring the r147 examples/js loader
  (format-compatible for our asset subset) — verify against our actual GLBs.
- **Asset download mechanics** — quaternius.com/itch.io downloads may need a
  manual click; worst case the user downloads two zips.
- **Perf on low-end mobile** — mitigations above; if still heavy, drop to 1
  shared character model and cap visible skinned dealers, rest stay
  procedural.

## Out of scope

- Player/patron NPCs walking the floor (dealers + receptionist only).
- Facial animation / lip sync.
- Physics library integration.
- Any gameplay/logic change — outcomes, timings of game state machines, and
  the wallet flows are untouched.
