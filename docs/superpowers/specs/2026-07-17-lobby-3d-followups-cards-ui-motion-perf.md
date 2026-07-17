# Lobby-3D follow-ups — cards visibility, action-bar UI, movement, performance

**Date:** 2026-07-17
**Area:** `portfolio/src/game/casino-game/calculator/lobby-3d/`
**Branch context:** `feat/dealer-glb-characters` (dealer GLB v2 already landed)
**Status:** Investigation + spec only — NO fixes in this document's commit.
User-reported after playing the v2 build:

> 1) now i cannot even see the cards. and dealing motions.
> 2) the hit, stand button is very ugly, no border and paddings.
> 3) movement are gone.
> 4) it uses a lot of memory and every time i open the 3D browser, my
>    macbook heat sink CPU is very high.

---

## 1 + 3. "Cards/dealing motions invisible" and "movement gone"

### What reproduction showed

Full round driven end-to-end on the current worktree build (Chrome, CDP):
walk to the Standard blackjack table → join → bet → DEAL → HIT bar → STAND
→ settle → leave → tap-to-walk away. **Everything animated correctly**:
cards flew from the dealer's hand and sat visible on the felt (screenshot
`repro-cards-1.png`: dealer K♦ + player 5♦/Q, "YOU: 15 · DEALER: 10"),
the pitch motion played, and both programmatic `walkTo` and a real canvas
click moved the player afterwards. Console clean. So the failure is
**conditional**, not present in the build itself.

### Root-cause candidates, ranked

**(a) `prefers-reduced-motion` — one flag kills all three symptoms at
once. Most likely.**
`src/engine/app.js:8`:

```js
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
```

macOS System Settings → Accessibility → Display → **Reduce Motion**
propagates straight into Chrome's media query. When it is on:

- `app.walkTo()` **teleports** (`app.js` REDUCED branch calls `tryMove`
  directly — no glide). Tap-to-walk "does nothing visible" → *"movement
  are gone."*
- Every rig/character animation returns immediately (`play()`, `walkIn()`,
  IK paths all early-return on `app.REDUCED`) → *"no dealing motions."*
- Card flight tweens snap to their end state → cards appear only at the
  instant the round state changes, with zero motion → easily read as
  *"cannot even see the cards."*

Users sometimes enable Reduce Motion precisely when a laptop runs hot
(complaint 4), which would make all four complaints one story.
**Verification step (user, 10s):** System Settings → Accessibility →
Display → check "Reduce Motion". If on, turn off and reload the lobby.

**(b) WebGL context loss under memory/thermal pressure.** Ruled out as an
explanation for a frozen 3D view: `app.js:83` handles `webglcontextlost`
by redirecting to the 2D lobby (`to2D()`), so the user would have landed
on a different page, not a dead scene.

**(c) Deal-during-walk-in window.** If the player joins fast enough that
the round starts while the dealer is still walking in, pitch points are
computed from the displaced shoulder. Cards still spawn and land on the
correct spots (targets are table-anchored), so this is cosmetic, not an
invisibility cause.

### Fix directions (later work)

- Decouple **gameplay-critical motion** from the OS flag: under REDUCED,
  keep card flights (perhaps 2× faster) and player glides; reserve the
  flag for ambient/decorative motion (idle sway, walk-ins, ambient shows).
  Alternatively an in-app "Animations: full / minimal" toggle that
  defaults from the media query but is overridable.
- Suppress the deal loop until `walkIn()` resolves (dealer must be at
  post before the first card leaves the shoe).

---

## 2. HIT / STAND action bar — unstyled buttons

Confirmed and quantified. The bar `#bjActions` (created in
`blackjack-live.js#actionBar`) is styled as a container
(`rgba(12,10,8,.9)` pill, 10×16 padding, radius 12), but **the `<button>`
elements inside have no CSS rule at all** — computed style shows raw UA
defaults:

| property | value (computed) |
|---|---|
| padding | `0px` |
| border | `2px outset black` (UA default) |
| border-radius | `0px` |
| font | `13.3px Arial` (UA default — rest of the lobby uses Rajdhani/Georgia) |

`src/style.css` has rules for `#bjActions` itself but none for
`#bjActions button`. The HIT highlight is an inline gradient only.

### Fix directions

- Style `#bjActions button` to match the betting board's `.bj3-*`
  buttons: dark ground, 1px `#c9a227` border, 8–14px padding, 8px radius,
  Rajdhani 600, letter-spacing, hover + `:disabled` states.
- Add a **pending/disabled state** while the dealer plays out (buttons
  currently stay clickable-looking during the dealer's turn).
- Consider count-based layout (SPLIT appears/disappears) so the bar
  doesn't reflow-jump.

---

## 4. Performance / heat

### Measurements (Chrome CDP, 1200×1043 css window, dpr 2, M-series Mac)

Same walk-up scene, ~8s samples, `renderer.info` + `performance.memory`:

| metric | v1 procedural (main) | v2 GLB (this branch) |
|---|---|---|
| fps (rAF rate) | 120 | 120 |
| JS heap used | 113 MB | 93 MB |
| draw calls / frame | 252 | 220 |
| triangles / frame | 13.5k | 26.7k |
| geometries | 1894 | 1891 |
| textures | 810 | 854 |
| shader programs | 11 | 16 |
| shadow-casting meshes | 1588 | 1239 |
| skinned meshes | 0 | 45 |
| lights (14 spotlights, 1 with shadow) | 24 | 23 |

**Conclusion: the GLB dealers are not the regression** — v2 actually has
fewer shadow casters, fewer draw calls, and a smaller heap than v1. The
heat is a **pre-existing whole-lobby cost**, and it is dominated by:

1. **Uncapped rAF on ProMotion displays** — the loop runs at native
   120Hz, doubling every per-frame cost (render, mixers, hooks) vs 60Hz.
2. **Uncapped `devicePixelRatio` 2** — a 2400×2086 (5MP) framebuffer,
   shaded twice per frame (shadow pass + main pass), 120 times a second.
3. **Shadow pass re-renders ~1.2–1.6k casters every frame** for the one
   shadow-mapped SpotLight, even when the scene is completely static
   (`renderer.shadowMap.autoUpdate` defaults to true).
4. **~850 textures / ~1890 geometries resident** — the base lobby's
   per-card/per-chip/per-sign canvas textures, not the dealers (counts
   are nearly identical in v1).
5. **No demand rendering** — the scene renders full-rate even when
   nothing on screen changes.

v2-specific additions are modest but real: 17 skeletons × 65 bones of
matrix math + one boneTexture upload each per frame (the distance LOD
only throttles mixers beyond 10m *and* idle), ~12MB of per-dealer cloned
geometry (vertex-tint requirement), one shared 2048² tuxedo texture
(~5.5MB GPU + mips), 3.1MB GLB fetch + parse on boot.

### Fix directions (in expected impact order)

- **Cap the frame rate at 60** (skip alternate rAF ticks on >90Hz
  displays) — halves everything on ProMotion MacBooks. Biggest single
  lever, zero visual cost at this art style.
- **Cap pixel ratio**: `renderer.setPixelRatio(Math.min(devicePixelRatio,
  1.5))` (or 2 → 1.5 only when the canvas exceeds ~2.5MP). ~45% fewer
  shaded pixels on a 5MP retina canvas at 1.5.
- **Freeze the shadow map**: `shadowMap.autoUpdate = false` +
  `needsUpdate = true` only when something that casts shadows actually
  moves (dealer gestures near the shadow spotlight, card/chip motion) —
  or restrict `castShadow` to the hero table's meshes.
- **Battery/thermal mode**: when `navigator.getBattery()` reports
  discharging (or a UI toggle), drop to 30fps + pixelRatio 1 + shadows
  off. Cheap to wire through the existing REDUCED plumbing.
- Texture/geometry dedup (shared card-face atlas instead of per-card
  canvases) — larger refactor, lower priority.
- v2 micro-items: extend mixer LOD to nearer distances when idle; skip
  `applyFingerCurl` beyond 10m; share cloned geometry between dealers
  with identical tint groups (hash the tint tuple).

---

## Out of scope for this spec

- Any code changes (this is documentation of findings only).
- The athletic body silhouette under the suit (asset-tier limitation,
  noted in the v2 design doc).
