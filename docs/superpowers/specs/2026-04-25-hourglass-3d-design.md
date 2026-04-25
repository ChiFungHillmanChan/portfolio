# Hourglass — 3D Realistic Timer Design

**Date:** 2026-04-25
**Status:** Awaiting user review
**Live URL target:** `https://hourglass.hillmanchan.com`
**Portfolio embed route:** `/hourglass`

## Goal

Ship an ultra-realistic 3D hourglass timer at `hourglass.hillmanchan.com`, embedded into the portfolio at `/hourglass` via iframe (mirroring the existing `system-design` integration pattern). The visual target is the user-supplied reference photo: a turned-walnut frame with four spindles, two glass bulbs joined at a thin neck, fine white sand draining between them, sitting on a wooden table against a dark moody backdrop. Functions as a real Pomodoro/meditation timer — user picks a duration, sand drains in real time matched to that duration.

## User Requirements

1. **3D, ultra-realistic.** Comparable in feel to the supplied reference photo (wood + glass + sand + dark backdrop).
2. **Stand on a table in a room.** Visible wooden table; backdrop dark and unobtrusive.
3. **Spinnable.** User can rotate the camera to view the hourglass from any side.
4. **Functional timer**, not just a 3D ornament. Set a duration, watch sand drain in real time.
5. **Hosted at `hourglass.hillmanchan.com`** (DNS already provisioned by user).
6. **Treated as a "game" entry** in the portfolio, alongside chatbot/connect4/card-game.

## Decisions Made During Brainstorming

| Question | Decision |
|---|---|
| Purpose | **Functional timer** with real countdown |
| Scene composition | **Hourglass on wooden table, dark backdrop** (not full furnished room) |
| Realism budget | **Max realism, desktop-first** (~7–8MB total first load, mobile degrades gracefully) |
| Sand simulation | **Hybrid: morphing meshes for top/bottom bulk + GPU particle stream for falling grains** |
| Controls | **Minimal HUD + click-to-flip** (small floating bar, click hourglass to flip & start) |
| Audio | **Subtle sand whoosh + soft chime at end**, off by default |
| Deployment | **One Vite build → Firebase Hosting → `hourglass.hillmanchan.com`**; portfolio embed = iframe to subdomain (mirrors `SystemDesignGame.jsx`) |

## Technical Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | React 18 + Vite | Fast dev/build, matches `system-design` standalone pattern |
| 3D rendering | `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing` | Declarative R3F fits React stack; drei provides `MeshTransmissionMaterial`, `Environment`, `ContactShadows` — exactly the realism primitives needed |
| Hourglass geometry | Code-authored with `LatheGeometry` | No licensing risk, fully tweakable, ~50KB code vs ~5MB glTF; lathe is the right primitive for turned-wood + bulbous glass |
| Materials | PBR with CC0 textures from polyhaven.com | ~3–6MB total; drop-in PBR maps for walnut wood, oak table, sand grain |
| Glass | drei `MeshTransmissionMaterial` (transmission 1.0, roughness 0.05, thickness 0.3, IOR 1.5, distortion 0.1) | Real refraction — the secret sauce of photoreal glass |
| Lighting | drei `Environment` with CC0 studio HDR (~1MB, 2K) + one warm directional key light + low ambient fill | Image-based lighting reflects realistically on glass and wood |
| Ground & shadow | Textured plane + `ContactShadows` + one-shot `AccumulativeShadows` baked at first frame | Soft, photoreal grounding shadow |
| Post-processing | `Bloom` (intensity 0.3, threshold 0.9) + `Vignette` (0.4) + ACES filmic tone mapping | Cinematic finish |
| State | React state for timer/UI; refs and shader uniforms for animation values | Avoids React re-renders inside the render loop |
| Audio | `howler` (~10KB) | Best browser audio lib, handles autoplay-policy gracefully |
| Hosting | Firebase Hosting (reuse `system-design-c84d3` project, add second site `hourglass`) | One fewer console to manage; existing CLI/credentials |
| DNS | Cloudflare CNAME → Firebase Hosting target (DNS-only, grey cloud, TLS via Firebase) | Same pattern as `api.system-design.hillmanchan.com` |

## Architecture & File Layout

```
portfolio/src/game/hourglass/
├── HourglassGame.jsx          # iframe wrapper for portfolio embed
├── hourglassGameStyles.css    # full-bleed iframe styles
├── package.json               # vite, react, three, @react-three/fiber, @react-three/drei,
│                              # @react-three/postprocessing, howler
├── vite.config.js             # single build target → dist/
├── firebase.json              # hosting config → dist/, SPA rewrite, asset cache headers
├── index.html                 # entry, dark background, no-FOUC inline styles
├── public/
│   ├── hdr/studio_2k.hdr      # 2K HDR for desktop
│   ├── hdr/studio_1k.hdr      # 1K HDR fallback for mobile
│   ├── textures/wood/         # color, normal, roughness for hourglass frame (walnut)
│   ├── textures/table/        # color, normal, roughness for table (oak)
│   ├── textures/sand/         # grain pattern + normal map
│   └── audio/{sand-loop.mp3, chime.mp3}
└── src/
    ├── main.jsx               # root mount
    ├── App.jsx                # mounts <Scene/>, <HUD/>, audio host; WebGL-availability check
    ├── scene/
    │   ├── Scene.jsx          # <Canvas>, lights, environment, post-processing, OrbitControls
    │   ├── Hourglass.jsx      # composes frame + bulbs + sand into one group; owns flip animation
    │   ├── HourglassFrame.jsx # turned-wood top/bottom plates + 4 spindles (LatheGeometry × 6)
    │   ├── GlassBulbs.jsx     # the two glass bulbs joined at the neck (single LatheGeometry)
    │   ├── SandBulk.jsx       # top sand cone + bottom pile, lathe profiles recomputed from progress
    │   ├── SandStream.jsx     # ~2000 instanced particles falling through the neck
    │   └── Table.jsx          # textured plane + ContactShadows
    ├── hooks/
    │   ├── useTimer.js        # duration, elapsed, running, paused, flipState — pure logic
    │   └── useAudio.js        # howler instances, autoplay-safe init on first user gesture
    ├── ui/
    │   ├── HUD.jsx            # bottom bar: duration chips, time remaining, play/pause/reset, mute
    │   ├── FallbackTimer.jsx  # HTML/CSS-only timer for WebGL-disabled browsers
    │   └── hud.css
    └── lib/
        ├── easing.js          # easeInOutCubic for flip animation
        └── sandProfile.js     # pure functions: profile(progress) → array of { y, radius } for lathe
```

**Boundary discipline:**
- `useTimer.js` is pure logic, fully testable without R3F.
- `Scene.jsx` knows about lights/camera/post-processing but not hourglass internals.
- `Hourglass.jsx` composes frame/bulbs/sand but doesn't know about the timer — it only receives `progress` (0–1) and `flipState` (-1 | 1) as props.
- `sandProfile.js` is pure: `(progress: number) => Vector2[]`. Easy to unit-test for mass conservation.

**Routing in the portfolio (CRA):**
- Add `/hourglass` route in `portfolio/src/App.js` rendering `<HourglassGame/>`
- `HourglassGame.jsx` is just an iframe to `https://hourglass.hillmanchan.com`, mirroring `SystemDesignGame.jsx`
- Add a project entry to `portfolio/src/projectData.json` (image, short/full description, `demoUrl: "/hourglass"`, `url: "https://hourglass.hillmanchan.com"`, technologies tags)

## 3D Scene Specification

### Camera
- `PerspectiveCamera`, FOV ~35°, positioned ~1.2m from hourglass center, slight downward angle (mimics looking at a desk object)
- `OrbitControls` (drei) with damping enabled, polar angle clamped (no view from below the table), no panning, zoom range 0.6m–2.5m
- On idle (no input for 8s), slow auto-rotate (~3s/360°), disabled instantly on any interaction

### Lighting
- `<Environment files="/hdr/studio_2k.hdr" />` — image-based lighting (the bulk of realism)
- One warm `<directionalLight>` from upper-front-left, intensity 2.0, color `#ffd9a8`, casts the contact shadow
- Subtle blue-ish `<ambientLight>` at intensity 0.05 for fill on the dark side

### Hourglass anatomy (units: 1 = 10cm)

| Part | Geometry | Material | Notes |
|---|---|---|---|
| Top plate | `LatheGeometry` (turned profile, ~6cm thick disc, rounded edge) | Walnut PBR | Receives + casts shadow |
| Bottom plate + base | `LatheGeometry` (matches top, slightly thicker base) | Walnut PBR | Receives + casts shadow |
| 4 spindles | `LatheGeometry` × 4, distributed at 90° around bulbs | Walnut PBR | Profile has the bulges + rings visible in reference photo |
| Glass bulbs | One `LatheGeometry` whose profile traces both bulbs joined at thin neck | `MeshTransmissionMaterial` | Single mesh, single material — simpler refraction than two separate meshes |
| Top sand bulk | `LatheGeometry` recomputed each frame from `progress` | Sand PBR (light beige) | Spherical-cap dome shrinking with `(1−progress)^0.6` |
| Bottom sand bulk | `LatheGeometry` recomputed each frame from `progress` | Sand PBR | Cone profile growing with `progress^0.7`, slight asymmetric noise on tip |
| Falling stream | `Points` with ~2000 instances + custom shader | Small white-yellow point sprite | Only renders when `0 < progress < 1` AND `running` |

### Table
- Large rounded plane below hourglass
- Oak PBR (low metalness, ~0.4 roughness for "polished but not glossy" sheen)
- `Environment` reflects subtly in the wood

### Shadows
- `<ContactShadows>` from drei (cheap, soft, perfect for product shots)
- One-shot `<AccumulativeShadows>` baked at first frame for soft shadow under base, then frozen

### Post-processing
- `Bloom` (intensity 0.3, threshold 0.9 — only brightest highlights bloom)
- `Vignette` (offset 0.5, darkness 0.4)
- `ToneMapping` ACES filmic

### Backdrop
- Canvas clear color: dark warm gradient (`#1a1410` → `#000`) via `<color attach="background">` and a back-facing tinted plane behind the camera frustum (no skybox visible)

## Sand Simulation & Timer Logic

### Interface
The interface between timer and sand is exactly two values:
- `progress ∈ [0, 1]` — `0` = top full / bottom empty, `1` = top empty / bottom full
- `flipState ∈ {-1, 1}` — which way the hourglass is up; flipping inverts and resets `progress`

All visual behaviour derives from these. Timer logic stays pure; rendering stays stateless.

### `useTimer` hook (pure logic, no R3F)

```
state:    { duration, elapsedMs, running, flipState, startTimestamp, pausedAccumulatedMs }
actions:  setDuration(seconds), start(), pause(), reset(), flip()
derived:  progress = clamp(elapsedMs / (duration * 1000), 0, 1)
          remainingMs = max(duration * 1000 - elapsedMs, 0)
          done = progress >= 1
```

- Driven by `requestAnimationFrame` while `running` (jitter-free, pauses on hidden tabs naturally).
- Stores `startTimestamp` and computes `elapsed = (now - startTimestamp) + pausedAccumulated` so accuracy holds even if the tab is throttled.

### Sand bulk meshes (`SandBulk.jsx`)
- Recompute lathe profile each frame from `progress`:
  - **Top:** spherical-cap dome with radius `r0 * (1 − progress)^0.6` (non-linear so last 10% drains faster, like real sand). Surface inset down by `progress × neckHeight`.
  - **Bottom:** cone with height `h_max * progress^0.7`, base radius capped at bulb interior, slight noise on tip.
- Mass conservation enforced as a unit test on `sandProfile.js`: `volumeTop(p) + volumeBottom(p) === volumeTop(0) ± ε` for `p ∈ [0, 1]`.

### Sand stream (`SandStream.jsx`)
- Renders only when `0 < progress < 1` AND `running`.
- 2000 instanced points, each with per-particle phase offset.
- Vertex shader: `y = lerp(streamTop, streamBottom, fract(time*speed + phase))`, `x,z = jitter * sin(phase * 7.13)`.
- Fades in/out at the ends so particles don't pop.
- Width visibly tapers near the neck.

### Flip animation (`Hourglass.jsx`)
- Triggered by clicking hourglass mesh OR pressing F.
- `flipState` toggles, `progress` resets to 0.
- Group rotates 180° on Z over 800ms with `easeInOutCubic`.
- During flip: `running = false`, sand stream hidden, `progress` frozen.
- Once flip completes: if a `pendingStart` flag was set, auto-start.

### End-of-timer behaviour (`done === true`)
- Sand stream stops; last particles complete their fall.
- `running` flips to false; HUD's primary button changes from "Pause" to "Flip & Restart".
- Soft chime plays (if not muted).
- If `document.hidden`, fire a Notification (after asking permission on first start) — `"Hourglass: 25:00 done"`.
- Subtle camera ease-in zoom (~5% closer over 1.5s) draws attention.

## UI, Controls & Error Handling

### HUD layout
Single floating bar at bottom-center, ~640px wide on desktop, full-width on mobile. Glass-morphism (10px backdrop-blur, 6% white tint, 1px hairline border). Auto-fades to 30% opacity after 4s of inactivity; full opacity returns on mouse-move/touch.

```
┌──────────────────────────────────────────────────────────────┐
│  [1m] [3m] [5m] [10m] [25m] [60m]    24:38    [⏸] [↻]   [🔇] │
└──────────────────────────────────────────────────────────────┘
```

- **Duration chips:** click sets `duration` and resets `elapsedMs` to 0; leaves `running` false until next flip/start. Active chip highlighted. **Custom duration is out of scope for v1** — presets cover the 90% case (YAGNI).
- **Time display:** big mono digits, `M:SS` for ≤1h, `H:MM:SS` for 1h+. Pulses subtly when paused.
- **Pause/play button:** primary action while running.
- **Reset button:** sets `progress=0`; doesn't flip.
- **Mute toggle:** persisted to `localStorage`; default = muted (autoplay policy).

### Direct interactions
- Click hourglass mesh → flip + start with current duration
- Drag → orbit camera
- Scroll/pinch → zoom (clamped)
- **Spacebar** → pause/resume (only when timer is set)
- **R** → reset
- **F** → flip & restart
- **M** → mute toggle

### Default state on load
- 5-minute preset selected
- Hourglass full at top, not running
- Tooltip shown once near hourglass on first visit ("Click to flip and start • Drag to spin"), dismissed on first interaction, never shown again (`localStorage.hourglass.tutorialSeen`)

### Mobile considerations
- HUD becomes full-width sticky bottom bar
- Auto-rotate disabled (saves battery)
- HDR downgrades to `studio_1k.hdr` (smaller file)
- Bloom/vignette intensity reduced ~30%
- Detection: `matchMedia('(max-width: 768px)') || navigator.hardwareConcurrency < 8`

### Error handling — at real boundaries only

| Failure | Handling |
|---|---|
| WebGL unavailable | `App.jsx` checks `WebGLRenderingContext` before mounting `<Canvas>`. Falls back to `<FallbackTimer/>`: a static screenshot captured from the actual 3D scene during dev (saved as `public/fallback.jpg`, ~80KB) + fully-functional HTML/CSS timer with the same controls and keyboard shortcuts. |
| HDR or texture asset 404 | drei `Suspense` boundary shows dark loading screen; if load throws, falls back to procedural (non-HDR) lighting setup with a console warning. App still works, just less photoreal. |
| Audio file fails to load | Audio silently disabled; chime/whoosh become no-ops. No user-facing error. |
| Notification permission denied | Don't ask again. On-screen "done" state is enough. |
| Page hidden during timer | Timer keeps accurate via timestamp math; RAF pauses naturally; sand stream pauses; chime fires when complete; Notification fires if granted. |

**No error handling for things that can't fail:** timer math, internal hourglass props, React state transitions. Validate `duration > 0` once at the HUD boundary, not six times downstream.

## Deployment

### Build & deploy
```bash
cd portfolio/src/game/hourglass
npm install
npm run build                                          # → dist/

# One-time setup (when first creating the Hosting site):
#   1. firebase login
#   2. In the Firebase console, add a new Hosting site to system-design-c84d3
#      called "hourglass" (final URL: hourglass-<hash>.web.app)
#   3. npx firebase target:apply hosting hourglass hourglass
#   4. firebase.json includes  "target": "hourglass"  on the hosting block

npx firebase deploy --only hosting:hourglass
```

### Firebase Hosting
- **Project:** reuse `system-design-c84d3` (avoid second console)
- **Site:** new site named `hourglass` within that project
- **Public dir:** `dist/`
- **Rewrites:** `/** → /index.html` (SPA)
- **Cache headers:**
  - `/assets/**`, `/textures/**`, `/hdr/**`, `/audio/**` → `public, max-age=31536000, immutable`
  - `index.html` → `no-cache, no-store, must-revalidate`

### DNS (Cloudflare)
- `hourglass.hillmanchan.com` → CNAME → Firebase Hosting target (provided after site creation)
- DNS-only / grey cloud (TLS handled by Firebase, same pattern as `api.system-design.hillmanchan.com`)

### Portfolio integration
- New file `portfolio/src/game/hourglass/HourglassGame.jsx` — iframe wrapper, mirrors `SystemDesignGame.jsx`
- New file `portfolio/src/game/hourglass/hourglassGameStyles.css` — full-bleed iframe styling
- `portfolio/src/App.js`:
  - Import `HourglassGame`
  - Add to game routing map: `'hourglass': HourglassGame`
  - Add route: `<Route path="/hourglass" element={<HourglassGame />} />`
- `portfolio/src/projectData.json` — append project entry (image, descriptions, `demoUrl: "/hourglass"`, `url: "https://hourglass.hillmanchan.com"`, technologies: `["React", "Three.js", "React Three Fiber", "Vite", "WebGL"]`)

### Repo hygiene
- Add `.superpowers/` to `.gitignore` (currently missing)
- `portfolio/src/game/hourglass/node_modules/` and `dist/` already covered by existing patterns

## Performance Budgets

| Metric | Budget | Measured how |
|---|---|---|
| Total first load (cold cache, gzip) | ≤ 8 MB | Network panel, "Disable cache" |
| JS bundle (gzip) | ≤ 700 KB | Vite build output report |
| Time to interactive (desktop, fast 3G throttled) | ≤ 4 s | Lighthouse |
| Sustained FPS desktop (M1 / RTX 3060 class) | ≥ 60 | `stats.js` overlay (gated `?stats=1`) |
| Sustained FPS mobile (iPhone 12 / Pixel 6) | ≥ 30 | Real device testing |
| Frame budget while sand falling, desktop | ≤ 8 ms CPU | Performance panel |

If any budget breaks during implementation, we revisit (e.g., bake a smaller HDR, drop transmission distortion on mobile).

## Testing Strategy

| Layer | How tested |
|---|---|
| `useTimer` hook | Vitest with fake timers — start/pause/reset/flip transitions, accuracy after pause-resume, behaviour at `done`, `progress` clamping |
| `easing.js` | Trivial unit tests on edge values |
| `sandProfile.js` | Unit test: mass conservation across progress sweep (`volumeTop + volumeBottom` constant ± ε) |
| Visual scene (`Hourglass`, `Scene`, etc.) | **Not unit-tested.** R3F components don't unit-test meaningfully. Manual visual validation against reference photo. |
| HUD components | React Testing Library — chips set duration, pause toggles state, mute persists to localStorage, keyboard shortcuts fire |
| End-to-end timer accuracy | Manual stopwatch: set 1m, walk away, verify chime fires within ±1s |
| WebGL fallback | Manually disable WebGL in DevTools; verify `FallbackTimer` renders and works |
| Mobile feel | Real iPhone Safari + real Android Chrome before declaring done — not just devtools emulation |

## Definition of Done

(Per the project's BrainSpark rule: "works for a user" ≠ "no errors on save")

1. Loads in under 4s on desktop fast-3G simulation
2. Looks materially comparable to the reference photo (side-by-side, same vibe — wood, glass, sand, dark moody lighting)
3. Picking 1m and walking away → chime fires within ±1s
4. Drag rotates smoothly, no janky frames
5. Works on iPhone Safari + Android Chrome at ≥30fps
6. WebGL-disabled fallback renders and HTML timer still works
7. Zero console errors or warnings in production build
8. Deployed to `hourglass.hillmanchan.com` AND showing inside the portfolio at `/hourglass` AND listed on the projects page

## Out of Scope (v1)

- Custom (non-preset) durations
- Saving timer history / Pomodoro cycle tracking
- Multiple themes (only one wood + sand combination ships)
- Multiple hourglass models / sizes
- Background music or ambient room sounds
- Sharing / OG images / social previews
- User accounts, persistence beyond `localStorage`
- Server-side anything (no Lambda, no Firestore — purely static)
