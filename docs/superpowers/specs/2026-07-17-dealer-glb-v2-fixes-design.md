# Dealer GLB v2 — dressed, dealing properly, walking

**Date:** 2026-07-17
**Area:** `portfolio/src/game/casino-game/calculator/lobby-3d/` (mirrored to `portfolio/public/games/casino-game/lobby-3d/`)
**Branch:** `feat/dealer-glb-characters` (worktree `.claude/worktrees/dealer-glb`)
**Status:** Approved design (user confirmed 2026-07-17), follow-up to
`2026-07-14-realistic-dealer-characters-design.md`

## Problem (user-reported, reproduced)

The v1 GLB dealers shipped on this branch have three visible failures:

1. **"Naked" dealers.** The free tier of the Quaternius Universal Base
   Characters pack only ships `Superhero_Male_FullBody` — a muscled,
   shirtless base body. v1 "dressed" it with per-vertex colors: paint, not
   clothing. Pecs/abs/bare back read through; the shirt bib is a blurry
   blob (vertex interpolation); the figure reads as a naked dark-painted
   man in a gold bow tie.
2. **Broken deal motion.** Hand-bone sampling shows the two-bone IK targets
   (shoe, player card spots) sit up to ~1.4 m from a ~0.55 m arm. The
   solver clamps, so the "deal" is a ~15 cm chest-height wobble. Real
   blackjack deals fire cards every ~420 ms while each dealCard path runs
   520 ms — every gesture is superseded mid-flight, so the arm looks
   frozen, then teleports. Fingers hold the raw mocap pose; the wrist is
   never oriented.
3. **Ugly face.** v1 stripped all textures for the 5 MB budget. That
   deleted the eye texture (blank white "zombie" eyeballs) and all face
   shading; the model is also bald (no hair mesh in the pack).

## Decisions (locked with user)

- Fix the current GLB system; no new asset packs, no paid tier, no Mixamo.
- Walking ships in this round, scoped to a **dealer shift-change walk**
  (dealer walks in along the pit lane and takes position when the player
  arrives at a table).
- Re-download of `Universal Base Characters[Standard].zip` (~129 MB,
  quaternius.itch.io, $0/CC0) approved — source of the original textures.

## 1. Asset repair — face + tuxedo

**Pipeline** (offline, committed as `tools/bake-dealer-texture.mjs`; the
big zip and intermediates stay in scratchpad, never committed):

1. Re-convert `Superhero_Male_FullBody.gltf` + `.bin` **keeping UVs and
   textures**, then downsize: body base-color to 1024 px, eyes texture
   restored as-is (small). Face/skin shading and pupils return.
2. **Bake a tuxedo into the body base-color texture.** Rasterize the
   mesh's UV triangles carrying interpolated bind-pose 3D positions →
   per-texel position map → classify each texel with crisp 3D rules:
   - jacket: torso above waist line + arms up to wrist cuffs
   - shirt front: V-shaped opening under the collar, with painted
     buttons + collar line
   - trousers below waist; shoes below ankle; skin above collar and
     beyond cuffs
   Paint final colors per variant. **3 pre-baked variants** (suit shade ×
   skin tone), picked by the existing seed hash. If 3 variants blow the
   budget, fall back to 1 neutral-tone texture multiplied by the existing
   per-vertex region tints (same 3D rules on vertices so boundaries
   align).
3. **Hair caps:** 2–3 simple scalp meshes (cap / side-part / bun) built
   procedurally at runtime, rigidly attached to the `Head` bone (same
   trick as the existing bow tie), tinted from the existing HAIRS palette,
   seed-picked (including a "bald" outcome so not every dealer has hair).
4. **Budget:** `dealer-clips.glb` drops Punch_*, Spell_*, Sitting_*,
   Dance_Loop, Hit_*, Idle_Torch_Loop, Jog_Fwd_Loop, Sprint_Loop, A_TPose
   — keeps `Idle_Loop`, `Idle_Talking_Loop`, `Interact`, `PickUp_Table`,
   `Walk_Formal_Loop`, `Walk_Loop` (~6 clips). Frees ≈1.5 MB for textures.
   The committed 5 MB combined-budget test stays and must pass.
5. Regenerate `assets/manifest.json`; extend its test to require the
   texture images and the kept clip set.

**Runtime changes (`character.js`):** body material gets `map` +
`vertexColors` off (or tint-multiply in fallback mode); eye material
untouched (texture back); v1's `bakeUniformColors`/bib code goes away or
becomes the fallback tint path; hair cap attach added next to
`attachBowTie`.

## 2. Deal motion — pitch, don't reach

- **Reach clamp ("pitch point").** New waypoint flag in
  `hand-paths.js` (`pitch: true` on ref waypoints). `character.js`
  resolves it as: shoulder + dir(actual target) × min(dist, 0.8 × arm
  reach), biased slightly down-forward. The card still flies to the real
  spot from the hand's `release` event (Task 9 wiring, already live). The
  arm now articulates through its full span instead of clamping frozen.
- **Rhythm, not restarts.** `dealCard` becomes shoe-grab → pitch →
  **back-to-shoe hover** (no rest key), duration ≈ 420 ms to match the
  card cadence, so consecutive deals chain into one continuous pitching
  rhythm (same chaining idiom as washCards). The table's existing
  `armsRest` calls end the sequence after the round; verify blackjack-live
  fires one after initial deal + outcomes (add if missing — table files
  may change for this, they are not frozen).
- **Fingers.** The skeleton has all 48 finger joints, currently frozen in
  the mocap splay. Store a relaxed-curl pose at build time and re-apply it
  post-mixer every frame in `driveFrame` (same layering rule as
  look-at/IK). During a path's grab→release window, blend to a light
  pinch.
- **Wrist.** Orient the hand bone palm-down along the current path
  direction while a path is active (post-IK, weight-ramped like the arm).
- **Torso lean.** Small additive `spine_02` pitch/yaw toward the active
  IK target (clamped ±0.15 rad, ramped by the same weight), applied
  post-mixer.

## 3. Shift-change walk

New capability on the character impl:
`walkTo(worldWaypoints, {clip = 'Walk_Formal_Loop'})`:

- Root group translates along the waypoint polyline at the clip's natural
  stride speed (~1.4 m/s); yaw eases toward travel direction; crossfade
  idle ↔ walk (0.25 s); on arrival snap-face the table and resume idle.
- **Trigger:** when the player's sit-down proximity card appears for a
  table whose dealer hasn't "arrived" yet this room generation, the dealer
  starts 3–4 m away along the **pit lane behind the table row** (straight,
  obstacle-free by construction of the layout) and walks in. Runs at most
  once per dealer per roomGen; players who never approach never pay the
  cost.
- Guards: roomGen token idiom; `REDUCED` → instant placement, no
  animation; procedural-rig fallback unaffected (walk is GLB-impl only,
  facade no-ops it when procedural).

## 4. Testing & verification

- **Node tests** (`lobby-3d/tests/`): pitch-point clamp math (in-range
  passthrough, out-of-range clamp, direction preserved); dealCard path
  structure (chains: last key not rest); walk pathing pure logic
  (arrival detection, segment speeds); manifest test v2 (textures
  present, kept-clip set exact, ≤5 MB combined).
- **Live** (scoped `calculator:verify` skill): front + back dealer
  screenshots (dressed, eyes with pupils); full blackjack round watching
  the arm rhythm; walk-in on table approach; baccarat show ritual intact;
  console clean; fallback run with assets blocked (procedural rig still
  fully functional).
- **Mirror:** sync every changed file to `public/games/casino-game/`.

## Out of scope

- Photoreal assets / new packs (rejected: style clash, weight).
- Patron NPCs, multi-dealer choreography, facial animation.
- Any gameplay/wallet/timing logic change.
