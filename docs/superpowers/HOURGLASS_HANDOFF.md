# Hourglass 3D Timer — Handoff & Resume Notes

**Last session:** 2026-04-25
**Resume:** 2026-04-26
**Branch:** `feat/hourglass-3d` (pushed to `origin/feat/hourglass-3d`)
**Working dir:** `portfolio/src/game/hourglass/`

## TL;DR — Where we are

A 3D hourglass timer is **functionally complete** in dev. All timer logic, controls, audio, post-processing, fallback, and model integration are in. **30 commits** on the feature branch. **27/27 unit tests pass**. The dev server runs cleanly at `http://localhost:5173`.

**Visually:** the user-supplied ornate glTF model (`hourglass.glb`, 4MB) loads and renders correctly. The wood frame + glass look great. Our animated sand drives the timer. **One blocker remains:** the model has baked-in static sand meshes that visually duplicate our animated sand. We need to identify which `Object_N` they are and add to the hide list.

**Not started:** Firebase deploy, Cloudflare DNS, portfolio embed, final QA verification.

## Resume tomorrow — start here

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git checkout feat/hourglass-3d
git pull --ff-only origin feat/hourglass-3d
cd portfolio/src/game/hourglass
npm run dev   # → http://localhost:5173
```

### First action: identify the model's baked sand mesh

The model has 5 meshes named `Object_2`–`Object_6`. We currently hide `Object_2` by default (best guess). Open browser DevTools console at `localhost:5173` and run:

```js
toggleMesh()              // lists all meshes with current visibility
toggleMesh('Object_3')    // flips visibility of Object_3 — try each one
```

Cycle through `Object_2` → `Object_6` and find the one whose visibility toggle removes the **dark static sand band** in the upper bulb. Add that name to `ALWAYS_HIDE` in `src/scene/HourglassModel.jsx:11`. There may be a SECOND mesh for the bottom pile — check that too.

**Mesh material clue:**
- 4 of 5 meshes share `aiStandardSurface1SG` (probably wood/frame)
- 1 mesh has unique `aiStandardSurface2SG` (probably glass OR sand)

If `Object_2` (currently hidden) was the **glass**, you'll see straight through where the bulbs were — toggle it back on and try a different one.

## What's done — by category

### Foundation (Tasks 1–6 from plan)
- Vite + React + Vitest skeleton at `portfolio/src/game/hourglass/`
- Dependencies: three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, howler
- TDD-tested pure modules:
  - `src/hooks/useTimer.js` — RAF-driven, accurate-to-the-ms timer state machine (7 tests)
  - `src/lib/sandProfile.js` — iso-volume mass-conservation math for top/bottom sand profiles (7 tests)
  - `src/lib/easing.js` — easeInOutCubic + clamp01 (5 tests)
  - `src/lib/webgl.js` — `isWebGLAvailable()` for fallback detection
  - `src/lib/device.js` — `isLowPower()` + `isCoarsePointer()` for mobile degradation
- **Asset acquisition skipped** — no PBR textures or HDR files; using drei's built-in environment + plain colors. (You can add real PBR later without touching code structure — see `docs/superpowers/specs/2026-04-25-hourglass-3d-design.md` for the original asset list.)

### 3D Scene (Tasks 7–12)
- `src/scene/Scene.jsx` — Canvas, lighting (3-point studio rig via Lightformers), OrbitControls, post-processing
- `src/scene/Table.jsx` — large reflective stone-floor plane via `MeshReflectorMaterial`
- `src/scene/HourglassFrame.jsx` — turned-wood lathe frame (NOT currently used; replaced by glTF model below)
- `src/scene/GlassBulbs.jsx` — joined-bulb glass with `MeshTransmissionMaterial` (NOT currently used; replaced)
- `src/scene/HourglassModel.jsx` — **NEW**, loads `public/models/hourglass.glb`, auto-fits to scene
- `src/scene/SandBulk.jsx` — top dome + bottom pile, lathe profile recomputed per frame from `progress`
- `src/scene/SandStream.jsx` — 1200 instanced points falling in a thin coherent column with gravity acceleration
- `src/scene/Hourglass.jsx` — composes model + sand sub-group, flip animation, click-to-flip handler
  - Sand sub-group is counter-rotated so gravity always pulls down regardless of `flipState`
  - Sand sub-group scaled `[0.42, 0.45, 0.42]` to fit inside model's bulb interior

### UI & UX (Tasks 13–16)
- `src/ui/HUD.jsx` + `HUD.css` — bottom bar: 6 duration chips (1m/3m/5m/10m/25m/60m), time display (M:SS or H:MM:SS), play/pause/reset/mute icons (8 tests)
- Auto-fade HUD opacity to 30% after 4s of inactivity
- `localStorage` persistence for `muted` and `tutorialSeen`
- First-visit tooltip "Click the hourglass to flip and start • Drag to spin"
- Keyboard shortcuts: Space (play/pause), R (reset), F (flip+start), M (mute)
- `src/hooks/useAudio.js` — Howler-backed sand loop + completion chime, autoplay-safe init on first user gesture
- Notification API ping when timer completes in a hidden tab
- Camera attention zoom on completion (5% closer over 1.5s, eased)

### Polish (Tasks 17–19)
- Bloom + Vignette post-processing (intensity 0.18, threshold 0.85, vignette darkness 0.45)
- Mobile detection drops DPR to [1, 1.5], reduces bloom + vignette
- WebGL availability check; falls back to `src/ui/FallbackTimer.jsx` (HTML/CSS-only timer with 1×1 placeholder background image)

### Cinematic look pass (post-plan)
After original plan completion, the user requested a more accurate match to a fantasy reference image. We:
- Tried glowing amber sand + cathedral lighting → too stylized
- Reverted to realistic beige sand + 3-point studio lighting + reflective stone floor + atmospheric Sparkles dust
- Tightened the sand stream from a wide cone of particles to a thin coherent column (real hourglass physics)
- Lowered `VOLUME_EPSILON` to `5e-6` so the bottom pile becomes visible immediately when the timer starts
- Loaded the user-supplied `hourglass.glb` model with auto-fit transform + material polish
- Discovered the model has baked-in static sand meshes that need to be hidden (open issue, see Resume section)

### Bug fixes worth noting
- **Vitest fake timers** don't auto-patch `performance.now()` and `requestAnimationFrame` on vitest 1.6 + happy-dom 14. Added explicit `fakeTimers.toFake` to `vite.config.js`. Without this, `useTimer` tests fail nondeterministically.
- **Flip rotation gravity bug** — rotating the entire hourglass group 180° also rotated the sand profile, so after a flip the sand visually drained UPWARD. Fixed by counter-rotating the sand sub-group in `Hourglass.jsx`.
- **Plan's sandProfile math was broken** — the original parametric formulas didn't conserve mass. Implementer rewrote with iso-volume cumulative table + binary search; mass conservation now ±0.04% across the sweep (spec required ±15%).

## Files & locations

```
portfolio/src/game/hourglass/
├── package.json                   # vite, three, @react-three/fiber, drei, postprocessing, howler
├── vite.config.js                 # fakeTimers.toFake bug fix is here
├── index.html                     # dark background, no-FOUC inline styles
├── public/
│   ├── models/hourglass.glb       # 4MB ornate model (Z-up, 32 unit tall)
│   ├── fallback.jpg               # 135-byte 1×1 placeholder
│   └── audio/                     # MISSING — paths exist, files don't (graceful no-op)
├── src/
│   ├── main.jsx                   # React root
│   ├── App.jsx                    # composes everything; WebGL guard; keyboard shortcuts; notification
│   ├── hooks/
│   │   ├── useTimer.js            # RAF + performance.now() state machine
│   │   └── useAudio.js            # Howler instances, autoplay-safe
│   ├── lib/
│   │   ├── sandProfile.js         # iso-volume math (DO NOT TOUCH without re-running tests)
│   │   ├── easing.js
│   │   ├── webgl.js
│   │   └── device.js
│   ├── scene/
│   │   ├── Scene.jsx              # Canvas, lights, controls, post-processing
│   │   ├── Hourglass.jsx          # model + sand composition + flip animation
│   │   ├── HourglassModel.jsx     # glb loader with auto-fit + ALWAYS_HIDE list  ← TOMORROW
│   │   ├── HourglassFrame.jsx     # legacy lathe frame (unused, kept as backup)
│   │   ├── GlassBulbs.jsx         # legacy transmission glass (unused, kept as backup)
│   │   ├── SandBulk.jsx           # top + bottom morphing sand
│   │   ├── SandStream.jsx         # thin coherent particle column
│   │   └── Table.jsx              # MeshReflectorMaterial floor
│   ├── ui/
│   │   ├── HUD.jsx + HUD.css
│   │   └── FallbackTimer.jsx + .css
│   └── __tests__/                 # 27 tests
```

## What's left

### Blocker (do first tomorrow)
1. **Identify the model's baked sand mesh names** and add to `ALWAYS_HIDE` in `HourglassModel.jsx:11`. See "Resume tomorrow — start here" above. Should take 2–5 minutes with the `toggleMesh()` console helper.

### Polish (after the blocker is resolved)
2. **Fine-tune sand sub-group scale** if the new clean view shows misalignment between our sand and the model's bulb interior. Edit `Hourglass.jsx`'s `<group scale={[0.42, 0.45, 0.42]}>`.
3. **Camera framing tweak** if needed once the duplicate sand is gone — currently `[2.2, 0.8, 3.4]` with FOV 35 in `Scene.jsx`. AutoRotate is OFF (was distracting).
4. **Real audio files** — drop `sand-loop.mp3` and `chime.mp3` into `public/audio/`. Currently the audio system is wired but the files 404 silently. CC0 sources: freesound.org filtered to "Creative Commons 0".

### Deployment (Tasks 20–23 from plan, all need user action)
5. **Firebase Hosting** — interactive `firebase login`, then create a "hourglass" site within project `system-design-c84d3`. See `docs/superpowers/plans/2026-04-25-hourglass-3d.md` Task 20 for exact commands. After login I (Claude) can run `npm run build && npx firebase deploy --only hosting:hourglass`.
6. **Cloudflare DNS** — pure web-UI work. In Cloudflare for `hillmanchan.com`: add CNAME `hourglass` → Firebase target hostname (DNS-only / grey cloud). Plus the verification TXT record Firebase prompts for. See plan Task 21.
7. **Portfolio embed** — add an iframe wrapper at `portfolio/src/game/hourglass/HourglassGame.jsx` (mirrors `SystemDesignGame.jsx` pattern), register a `/hourglass` route in `portfolio/src/App.js`, add a project entry to `portfolio/src/projectData.json`. See plan Task 22.
8. **Definition of Done verification** — load on iPhone Safari + Android Chrome, time accuracy with stopwatch, WebGL fallback test, etc. See plan Task 23.

### Performance budget concerns
- Current model is **4 MB** — over the 8 MB total budget when combined with deps + textures. Probably fine for desktop-first; consider Draco compression (`gltf-pipeline -i hourglass.glb -o hourglass.drc.glb -d`) before deploy if mobile load time is an issue.
- The 21 MB version of the model was tested earlier and proved too heavy (CDP timeouts during dev, would be terrible on 4G). The 4MB version is what's in the repo.

## Reference docs

- **Spec:** `docs/superpowers/specs/2026-04-25-hourglass-3d-design.md` — complete design doc, what we promised
- **Plan:** `docs/superpowers/plans/2026-04-25-hourglass-3d.md` — original 23-task implementation plan
- **This handoff:** `docs/superpowers/HOURGLASS_HANDOFF.md` — what's actually in the repo, where to resume

## Quick sanity-check commands

```bash
# All tests pass?
cd portfolio/src/game/hourglass && npm test

# Dev server starts clean?
cd portfolio/src/game/hourglass && npm run dev

# Build succeeds + bundle sizes OK?
cd portfolio/src/game/hourglass && npm run build && ls -lh dist/assets/

# Branch is up to date with remote?
git fetch origin feat/hourglass-3d && git log --oneline feat/hourglass-3d ^origin/feat/hourglass-3d
```
