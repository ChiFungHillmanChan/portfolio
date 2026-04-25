# Hourglass 3D Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an ultra-realistic 3D hourglass timer at `hourglass.hillmanchan.com` (with portfolio embed at `/hourglass`), driven by a real countdown matched to a user-selected duration, comparable in feel to the supplied reference photo.

**Architecture:** Standalone React + Vite app at `portfolio/src/game/hourglass/` building to `dist/`, deployed to a new Firebase Hosting site within the existing `system-design-c84d3` project. Portfolio embed is a thin React iframe wrapper at `/hourglass` (mirrors `SystemDesignGame.jsx`). 3D scene built with React Three Fiber + drei + postprocessing. Timer logic is a pure hook (`useTimer`) that produces a `progress` value (0–1) consumed by hourglass meshes via shader uniforms; sand bulk is morphing `LatheGeometry`; falling sand is a GPU particle system; glass uses `MeshTransmissionMaterial` for real refraction.

**Tech Stack:** React 18, Vite 5, three ^0.160, @react-three/fiber 8, @react-three/drei 9, @react-three/postprocessing 2, howler 2, vitest, @testing-library/react, happy-dom, firebase-tools (devDep).

**Spec:** `docs/superpowers/specs/2026-04-25-hourglass-3d-design.md`

---

## File Structure

**Create (standalone Vite app):**
- `portfolio/src/game/hourglass/package.json` — Vite app with all 3D + audio + test deps
- `portfolio/src/game/hourglass/vite.config.js` — single-target build → `dist/`, vitest config
- `portfolio/src/game/hourglass/index.html` — root HTML, dark background, no-FOUC inline styles
- `portfolio/src/game/hourglass/firebase.json` — Hosting config, target `hourglass`, SPA rewrite, asset cache headers
- `portfolio/src/game/hourglass/.firebaserc` — project + target alias
- `portfolio/src/game/hourglass/src/main.jsx` — React root mount
- `portfolio/src/game/hourglass/src/App.jsx` — composes Scene + HUD; WebGL availability check
- `portfolio/src/game/hourglass/src/scene/Scene.jsx` — `<Canvas>`, lighting, environment, camera/controls, post-processing
- `portfolio/src/game/hourglass/src/scene/Hourglass.jsx` — composes frame + bulbs + sand; flip animation; click-to-flip
- `portfolio/src/game/hourglass/src/scene/HourglassFrame.jsx` — turned-wood plates + 4 spindles via `LatheGeometry`
- `portfolio/src/game/hourglass/src/scene/GlassBulbs.jsx` — joined-bulb glass mesh + `MeshTransmissionMaterial`
- `portfolio/src/game/hourglass/src/scene/SandBulk.jsx` — top dome + bottom pile, lathe profiles re-derived per frame from `progress`
- `portfolio/src/game/hourglass/src/scene/SandStream.jsx` — instanced `Points` falling-grain stream
- `portfolio/src/game/hourglass/src/scene/Table.jsx` — wood table plane + `ContactShadows`
- `portfolio/src/game/hourglass/src/hooks/useTimer.js` — pure timer state machine (RAF-driven)
- `portfolio/src/game/hourglass/src/hooks/useAudio.js` — Howler-backed sand-loop + chime, autoplay-safe
- `portfolio/src/game/hourglass/src/ui/HUD.jsx` — bottom bar: chips + time + play/pause/reset/mute
- `portfolio/src/game/hourglass/src/ui/HUD.css`
- `portfolio/src/game/hourglass/src/ui/FallbackTimer.jsx` — HTML/CSS-only timer for WebGL-disabled
- `portfolio/src/game/hourglass/src/ui/FallbackTimer.css`
- `portfolio/src/game/hourglass/src/lib/easing.js` — `easeInOutCubic`
- `portfolio/src/game/hourglass/src/lib/sandProfile.js` — pure profile-points + volume math
- `portfolio/src/game/hourglass/src/lib/webgl.js` — WebGL availability check
- `portfolio/src/game/hourglass/src/lib/device.js` — mobile / low-power detection
- `portfolio/src/game/hourglass/src/__tests__/useTimer.test.js`
- `portfolio/src/game/hourglass/src/__tests__/sandProfile.test.js`
- `portfolio/src/game/hourglass/src/__tests__/easing.test.js`
- `portfolio/src/game/hourglass/src/__tests__/HUD.test.jsx`

**Create (portfolio embed):**
- `portfolio/src/game/hourglass/HourglassGame.jsx` — iframe wrapper for portfolio (mirrors `SystemDesignGame.jsx`)
- `portfolio/src/game/hourglass/hourglassGameStyles.css` — full-bleed iframe styling

**Create (assets — downloaded from polyhaven.com, all CC0):**
- `portfolio/src/game/hourglass/public/hdr/studio_2k.hdr` — `studio_small_03` 2K HDRI
- `portfolio/src/game/hourglass/public/hdr/studio_1k.hdr` — same asset, 1K version (mobile)
- `portfolio/src/game/hourglass/public/textures/wood/walnut_diff_1k.jpg`
- `portfolio/src/game/hourglass/public/textures/wood/walnut_nor_gl_1k.jpg`
- `portfolio/src/game/hourglass/public/textures/wood/walnut_rough_1k.jpg`
- `portfolio/src/game/hourglass/public/textures/table/oak_diff_1k.jpg`
- `portfolio/src/game/hourglass/public/textures/table/oak_nor_gl_1k.jpg`
- `portfolio/src/game/hourglass/public/textures/table/oak_rough_1k.jpg`
- `portfolio/src/game/hourglass/public/textures/sand/sand_diff_512.jpg`
- `portfolio/src/game/hourglass/public/textures/sand/sand_nor_gl_512.jpg`
- `portfolio/src/game/hourglass/public/audio/sand-loop.mp3` — short loopable sand-falling sound
- `portfolio/src/game/hourglass/public/audio/chime.mp3` — short soft bell on completion
- `portfolio/src/game/hourglass/public/fallback.jpg` — captured screenshot of the rendered scene (added in Task 19)
- `portfolio/src/game/hourglass/public/og.jpg` — Open Graph card (captured screenshot, 1200×630)

**Modify:**
- `portfolio/src/App.js` — import `HourglassGame`, register in game-component map, add `/hourglass` route
- `portfolio/src/projectData.json` — add new project entry for the hourglass
- `.gitignore` — add `portfolio/src/game/hourglass/dist/`, `portfolio/src/game/hourglass/node_modules/`, and `.superpowers/`

---

## Task 1: Bootstrap the Vite app + commit

**Files:**
- Create: `portfolio/src/game/hourglass/package.json`
- Create: `portfolio/src/game/hourglass/vite.config.js`
- Create: `portfolio/src/game/hourglass/index.html`
- Create: `portfolio/src/game/hourglass/src/main.jsx`
- Create: `portfolio/src/game/hourglass/src/App.jsx`
- Modify: `.gitignore` (root)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "hourglass",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@react-three/drei": "^9.105.0",
    "@react-three/fiber": "^8.16.0",
    "@react-three/postprocessing": "^2.16.0",
    "howler": "^2.2.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "three": "^0.163.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^14.2.0",
    "@vitejs/plugin-react": "^4.3.0",
    "firebase-tools": "^13.10.0",
    "happy-dom": "^14.0.0",
    "vite": "^5.2.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
  },
});
```

- [ ] **Step 3: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Hourglass</title>
    <meta name="description" content="A real-time 3D hourglass timer." />
    <meta property="og:title" content="Hourglass" />
    <meta property="og:image" content="/og.jpg" />
    <meta name="theme-color" content="#0a0807" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <style>
      html, body, #root { margin: 0; padding: 0; height: 100%; width: 100%; background: #0a0807; color: #f4eee0; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; }
      #root { display: block; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `src/main.jsx`**

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: Create minimal `src/App.jsx` (smoke test)**

```jsx
export default function App() {
  return (
    <div style={{ width: '100%', height: '100vh', display: 'grid', placeItems: 'center' }}>
      <p style={{ opacity: 0.5 }}>Hourglass loading…</p>
    </div>
  );
}
```

- [ ] **Step 6: Update root `.gitignore`**

Append the following block to `/Users/hillmanchan/Desktop/HillmanChan_portfolio/.gitignore`:

```
# Hourglass app build/deps
portfolio/src/game/hourglass/dist/
portfolio/src/game/hourglass/node_modules/
portfolio/src/game/hourglass/.firebase/

# Superpowers brainstorm scratch
.superpowers/
```

- [ ] **Step 7: Install deps and run dev server**

```bash
cd portfolio/src/game/hourglass
npm install
npm run dev
```
Expected: Vite prints local URL (typically `http://localhost:5173`); browser shows "Hourglass loading…" on a near-black background. Stop with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/hourglass/package.json \
        portfolio/src/game/hourglass/package-lock.json \
        portfolio/src/game/hourglass/vite.config.js \
        portfolio/src/game/hourglass/index.html \
        portfolio/src/game/hourglass/src/main.jsx \
        portfolio/src/game/hourglass/src/App.jsx \
        .gitignore
git commit -m "feat(hourglass): bootstrap Vite app skeleton"
```

---

## Task 2: Pure `useTimer` hook (TDD)

**Files:**
- Create: `portfolio/src/game/hourglass/src/__tests__/setup.js`
- Create: `portfolio/src/game/hourglass/src/__tests__/useTimer.test.js`
- Create: `portfolio/src/game/hourglass/src/hooks/useTimer.js`

- [ ] **Step 1: Create test setup file**

```js
import '@testing-library/jest-dom';
```

- [ ] **Step 2: Write failing tests for `useTimer`**

Create `src/__tests__/useTimer.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from '../hooks/useTimer.js';

describe('useTimer', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('initialises with default duration, not running, progress 0', () => {
    const { result } = renderHook(() => useTimer({ defaultDuration: 300 }));
    expect(result.current.duration).toBe(300);
    expect(result.current.running).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.remainingMs).toBe(300_000);
    expect(result.current.flipState).toBe(1);
    expect(result.current.done).toBe(false);
  });

  it('start() begins counting, advances progress over time', () => {
    const { result } = renderHook(() => useTimer({ defaultDuration: 10 }));
    act(() => { result.current.start(); });
    expect(result.current.running).toBe(true);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.progress).toBeGreaterThan(0.4);
    expect(result.current.progress).toBeLessThan(0.6);
  });

  it('pause() stops advancing; resume continues from where it left off', () => {
    const { result } = renderHook(() => useTimer({ defaultDuration: 10 }));
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(3000); });
    act(() => { result.current.pause(); });
    const pausedProgress = result.current.progress;
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.progress).toBe(pausedProgress);
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.progress).toBeGreaterThan(0.55);
    expect(result.current.progress).toBeLessThan(0.65);
  });

  it('reaches done=true when elapsed >= duration; clamps progress to 1', () => {
    const { result } = renderHook(() => useTimer({ defaultDuration: 2 }));
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(2500); });
    expect(result.current.progress).toBe(1);
    expect(result.current.done).toBe(true);
    expect(result.current.running).toBe(false);
    expect(result.current.remainingMs).toBe(0);
  });

  it('reset() returns elapsed to 0 and stops the timer', () => {
    const { result } = renderHook(() => useTimer({ defaultDuration: 10 }));
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(5000); });
    act(() => { result.current.reset(); });
    expect(result.current.progress).toBe(0);
    expect(result.current.running).toBe(false);
    expect(result.current.remainingMs).toBe(10_000);
  });

  it('setDuration() updates duration and resets elapsed', () => {
    const { result } = renderHook(() => useTimer({ defaultDuration: 10 }));
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(3000); });
    act(() => { result.current.setDuration(60); });
    expect(result.current.duration).toBe(60);
    expect(result.current.progress).toBe(0);
    expect(result.current.running).toBe(false);
  });

  it('flip() toggles flipState (-1 ↔ 1) and resets progress', () => {
    const { result } = renderHook(() => useTimer({ defaultDuration: 10 }));
    expect(result.current.flipState).toBe(1);
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(4000); });
    act(() => { result.current.flip(); });
    expect(result.current.flipState).toBe(-1);
    expect(result.current.progress).toBe(0);
    expect(result.current.running).toBe(false);
    act(() => { result.current.flip(); });
    expect(result.current.flipState).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

```bash
cd portfolio/src/game/hourglass
npm test
```
Expected: `useTimer` tests all FAIL with "Cannot find module '../hooks/useTimer.js'".

- [ ] **Step 4: Implement `src/hooks/useTimer.js`**

```js
import { useCallback, useEffect, useRef, useState } from 'react';

export function useTimer({ defaultDuration = 300 } = {}) {
  const [duration, setDurationState] = useState(defaultDuration);
  const [running, setRunning] = useState(false);
  const [flipState, setFlipState] = useState(1);

  // Timer math is reference-based to stay accurate across pauses + tab throttling.
  const startTimestampRef = useRef(null);
  const pausedAccumulatedMsRef = useRef(0);
  const [tick, setTick] = useState(0);
  const rafRef = useRef(null);

  const elapsedMs = (() => {
    if (!running && startTimestampRef.current === null) return pausedAccumulatedMsRef.current;
    if (!running) return pausedAccumulatedMsRef.current;
    const now = performance.now();
    return pausedAccumulatedMsRef.current + (now - startTimestampRef.current);
  })();

  const totalMs = duration * 1000;
  const progress = Math.max(0, Math.min(1, totalMs === 0 ? 1 : elapsedMs / totalMs));
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const done = progress >= 1;

  // RAF loop drives the re-renders while running. We don't use setInterval to avoid jitter.
  useEffect(() => {
    if (!running) return;
    const loop = () => {
      setTick((t) => (t + 1) % 1000000);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running]);

  // Auto-stop when done.
  useEffect(() => {
    if (done && running) {
      setRunning(false);
      pausedAccumulatedMsRef.current = totalMs;
      startTimestampRef.current = null;
    }
  }, [done, running, totalMs]);

  const start = useCallback(() => {
    if (running) return;
    if (pausedAccumulatedMsRef.current >= totalMs) pausedAccumulatedMsRef.current = 0;
    startTimestampRef.current = performance.now();
    setRunning(true);
  }, [running, totalMs]);

  const pause = useCallback(() => {
    if (!running) return;
    pausedAccumulatedMsRef.current += performance.now() - startTimestampRef.current;
    startTimestampRef.current = null;
    setRunning(false);
  }, [running]);

  const reset = useCallback(() => {
    pausedAccumulatedMsRef.current = 0;
    startTimestampRef.current = null;
    setRunning(false);
    setTick((t) => t + 1);
  }, []);

  const setDuration = useCallback((seconds) => {
    pausedAccumulatedMsRef.current = 0;
    startTimestampRef.current = null;
    setRunning(false);
    setDurationState(seconds);
  }, []);

  const flip = useCallback(() => {
    pausedAccumulatedMsRef.current = 0;
    startTimestampRef.current = null;
    setRunning(false);
    setFlipState((s) => -s);
  }, []);

  return { duration, elapsedMs, progress, remainingMs, running, done, flipState,
           start, pause, reset, setDuration, flip };
}
```

- [ ] **Step 5: Run tests, verify they pass**

```bash
npm test
```
Expected: all `useTimer` tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/__tests__/setup.js src/__tests__/useTimer.test.js src/hooks/useTimer.js
git commit -m "feat(hourglass): add useTimer hook with full state machine + tests"
```

---

## Task 3: Pure `sandProfile` module (TDD)

**Files:**
- Create: `portfolio/src/game/hourglass/src/__tests__/sandProfile.test.js`
- Create: `portfolio/src/game/hourglass/src/lib/sandProfile.js`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/sandProfile.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { topProfile, bottomProfile, volumeOfRevolution, BULB_RADIUS, BULB_HEIGHT } from '../lib/sandProfile.js';

const totalSand = volumeOfRevolution(topProfile(0));

describe('sandProfile', () => {
  it('topProfile at progress=0 contains a non-trivial volume', () => {
    expect(volumeOfRevolution(topProfile(0))).toBeGreaterThan(0.01);
  });

  it('topProfile at progress=1 collapses to ~zero volume', () => {
    expect(volumeOfRevolution(topProfile(1))).toBeLessThan(0.001);
  });

  it('bottomProfile at progress=0 is ~zero', () => {
    expect(volumeOfRevolution(bottomProfile(0))).toBeLessThan(0.001);
  });

  it('bottomProfile at progress=1 holds the same total as top at progress=0 (mass conserved)', () => {
    const v = volumeOfRevolution(bottomProfile(1));
    expect(v).toBeGreaterThan(totalSand * 0.95);
    expect(v).toBeLessThan(totalSand * 1.05);
  });

  it('mass is conserved across the sweep', () => {
    for (const p of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const v = volumeOfRevolution(topProfile(p)) + volumeOfRevolution(bottomProfile(p));
      expect(v).toBeGreaterThan(totalSand * 0.85);
      expect(v).toBeLessThan(totalSand * 1.15);
    }
  });

  it('all profile points fit inside the bulb radius', () => {
    for (const p of [0, 0.5, 1]) {
      for (const pt of topProfile(p)) expect(pt[0]).toBeLessThanOrEqual(BULB_RADIUS + 1e-6);
      for (const pt of bottomProfile(p)) expect(pt[0]).toBeLessThanOrEqual(BULB_RADIUS + 1e-6);
    }
  });

  it('exposes constants', () => {
    expect(BULB_RADIUS).toBeGreaterThan(0);
    expect(BULB_HEIGHT).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npm test sandProfile
```
Expected: FAIL with "Cannot find module '../lib/sandProfile.js'".

- [ ] **Step 3: Implement `src/lib/sandProfile.js`**

```js
// Hourglass internal geometry (scene units; 1 unit ≈ 10cm)
export const BULB_RADIUS = 0.5;     // max radius of the glass bulb interior
export const BULB_HEIGHT = 0.55;    // half-height of one bulb (top OR bottom)
export const NECK_RADIUS = 0.04;    // radius at the narrowest point
const SEGMENTS = 32;                // profile resolution

const lerp = (a, b, t) => a + (b - a) * t;

// Volume of revolution around the y-axis using disc summation: ∑ π r² dy.
// Profile is array of [r, y] pairs ordered by y ascending.
export function volumeOfRevolution(profile) {
  if (profile.length < 2) return 0;
  let v = 0;
  for (let i = 1; i < profile.length; i++) {
    const [r0, y0] = profile[i - 1];
    const [r1, y1] = profile[i];
    const dy = Math.abs(y1 - y0);
    // Average disc area (frustum approx)
    const area = Math.PI * (r0 * r0 + r0 * r1 + r1 * r1) / 3;
    v += area * dy;
  }
  return v;
}

// Top sand: spherical-cap dome shrinking with progress, surface lowering toward the neck.
// At progress=0: full bulb volume. At progress=1: collapses to a point above the neck.
export function topProfile(progress) {
  const p = Math.max(0, Math.min(1, progress));
  const radiusScale = Math.pow(1 - p, 0.6);
  const surfaceY = lerp(BULB_HEIGHT * 0.95, NECK_RADIUS * 1.2, p);

  const points = [];
  // Bottom of dome at the neck
  points.push([NECK_RADIUS, NECK_RADIUS * 1.1]);
  // Walk up the dome interior to the current surface
  for (let i = 1; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const y = lerp(NECK_RADIUS * 1.1, surfaceY, t);
    // Distance from neck up to surfaceY along normalised t
    const interiorR = BULB_RADIUS * Math.sin(t * Math.PI * 0.5) * radiusScale;
    points.push([Math.max(NECK_RADIUS, interiorR), y]);
  }
  // Close the surface back to the y-axis with a flat top so the lathe forms a sealed cap
  const last = points[points.length - 1];
  points.push([0, last[1]]);
  return points;
}

// Bottom sand: cone growing from the neck downward, base capped at the bulb interior.
export function bottomProfile(progress) {
  const p = Math.max(0, Math.min(1, progress));
  const heightScale = Math.pow(p, 0.7);
  const tipY = -NECK_RADIUS * 1.1;
  const baseY = lerp(tipY, -BULB_HEIGHT * 0.85, heightScale);
  const baseR = BULB_RADIUS * heightScale;

  const points = [];
  // Tip at the neck (top of the cone)
  points.push([0, tipY]);
  for (let i = 1; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const y = lerp(tipY, baseY, t);
    // Slight noise on the cone tip for a less perfect look
    const wobble = 1 + 0.04 * Math.sin(t * Math.PI * 4);
    points.push([baseR * t * wobble, y]);
  }
  // Close the base back to the axis so the lathe forms a sealed pile
  points.push([0, baseY]);
  return points;
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
npm test sandProfile
```
Expected: all `sandProfile` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/sandProfile.test.js src/lib/sandProfile.js
git commit -m "feat(hourglass): pure sandProfile module with mass-conservation tests"
```

---

## Task 4: `easing` module (TDD)

**Files:**
- Create: `portfolio/src/game/hourglass/src/__tests__/easing.test.js`
- Create: `portfolio/src/game/hourglass/src/lib/easing.js`

- [ ] **Step 1: Write failing tests**

```js
import { describe, it, expect } from 'vitest';
import { easeInOutCubic, clamp01 } from '../lib/easing.js';

describe('easeInOutCubic', () => {
  it('boundaries map to 0 and 1', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });
  it('midpoint maps to 0.5', () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 6);
  });
  it('clamps inputs outside [0,1]', () => {
    expect(easeInOutCubic(-0.5)).toBe(0);
    expect(easeInOutCubic(1.5)).toBe(1);
  });
});

describe('clamp01', () => {
  it('passes values through inside [0,1]', () => {
    expect(clamp01(0.3)).toBe(0.3);
  });
  it('clamps below 0 and above 1', () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(2)).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npm test easing
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/easing.js`**

```js
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function easeInOutCubic(t) {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npm test easing
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/easing.test.js src/lib/easing.js
git commit -m "feat(hourglass): easing helpers"
```

---

## Task 5: WebGL detection + device detection helpers

**Files:**
- Create: `portfolio/src/game/hourglass/src/lib/webgl.js`
- Create: `portfolio/src/game/hourglass/src/lib/device.js`

- [ ] **Step 1: Implement `src/lib/webgl.js`**

```js
export function isWebGLAvailable() {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!gl;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Implement `src/lib/device.js`**

```js
export function isLowPower() {
  if (typeof window === 'undefined') return false;
  const smallScreen = window.matchMedia('(max-width: 768px)').matches;
  const fewCores = (navigator.hardwareConcurrency || 8) < 8;
  return smallScreen || fewCores;
}

export function isCoarsePointer() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/webgl.js src/lib/device.js
git commit -m "feat(hourglass): WebGL + device-class detection helpers"
```

---

## Task 6: Download CC0 textures and HDRI assets

**Files (created via download, not authored):**
- All under `portfolio/src/game/hourglass/public/{hdr,textures,audio}/`

This is a **manual asset acquisition** task. Each step is a download, not code.

- [ ] **Step 1: Create asset directories**

```bash
cd portfolio/src/game/hourglass
mkdir -p public/hdr public/textures/wood public/textures/table public/textures/sand public/audio
```

- [ ] **Step 2: Download HDRI from polyhaven.com**

Visit `https://polyhaven.com/a/studio_small_03`. Download the **HDR** format at **2K** and **1K** resolutions.
Save as:
- `public/hdr/studio_2k.hdr`
- `public/hdr/studio_1k.hdr`

Acceptance: both files exist, each ≤ 6 MB.

- [ ] **Step 3: Download walnut wood texture from polyhaven.com**

Visit `https://polyhaven.com/a/dark_wood_diff` (or `wood_table_001` if that one is unavailable). Download at **1K**, **JPG** format, with **Diffuse**, **Normal_GL**, and **Roughness** maps.
Save as:
- `public/textures/wood/walnut_diff_1k.jpg`
- `public/textures/wood/walnut_nor_gl_1k.jpg`
- `public/textures/wood/walnut_rough_1k.jpg`

- [ ] **Step 4: Download oak table texture from polyhaven.com**

Visit `https://polyhaven.com/a/wood_table_001`. Download at **1K**, **JPG** format, **Diffuse**, **Normal_GL**, **Roughness**.
Save as:
- `public/textures/table/oak_diff_1k.jpg`
- `public/textures/table/oak_nor_gl_1k.jpg`
- `public/textures/table/oak_rough_1k.jpg`

- [ ] **Step 5: Download sand texture**

Visit `https://polyhaven.com/a/aerial_beach_03` (or any fine-sand asset). Download at **512px**, **JPG**, **Diffuse** + **Normal_GL** only.
Save as:
- `public/textures/sand/sand_diff_512.jpg`
- `public/textures/sand/sand_nor_gl_512.jpg`

- [ ] **Step 6: Acquire audio**

Source two short royalty-free clips (e.g. from `https://freesound.org` filtered to Creative Commons 0):
- `public/audio/sand-loop.mp3` — ~3 seconds, loopable, gentle whoosh, ≤ 30 KB
- `public/audio/chime.mp3` — single soft bell, ≤ 30 KB

If acceptable clips can't be found, generate them with any tool (e.g., a sine envelope for the chime). The audio is muted by default; treat this as polish.

- [ ] **Step 7: Verify total asset size**

```bash
du -sh public/hdr public/textures public/audio
```
Expected: total ≤ 8 MB.

- [ ] **Step 8: Commit**

```bash
git add public/
git commit -m "chore(hourglass): add CC0 HDR + PBR textures + audio assets"
```

---

## Task 7: Scene shell — Canvas, environment, lights, camera, table

**Files:**
- Create: `portfolio/src/game/hourglass/src/scene/Scene.jsx`
- Create: `portfolio/src/game/hourglass/src/scene/Table.jsx`
- Modify: `portfolio/src/game/hourglass/src/App.jsx`

- [ ] **Step 1: Create `src/scene/Table.jsx`**

```jsx
import { useTexture } from '@react-three/drei';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

export default function Table() {
  const [color, normal, rough] = useTexture([
    '/textures/table/oak_diff_1k.jpg',
    '/textures/table/oak_nor_gl_1k.jpg',
    '/textures/table/oak_rough_1k.jpg',
  ]);
  [color, normal, rough].forEach((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
  });
  color.colorSpace = THREE.SRGBColorSpace;

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}>
        <circleGeometry args={[6, 64]} />
        <meshStandardMaterial map={color} normalMap={normal} roughnessMap={rough} roughness={0.55} metalness={0} />
      </mesh>
      <ContactShadows position={[0, -0.69, 0]} opacity={0.55} scale={6} blur={2.4} far={2.5} />
    </group>
  );
}
```

- [ ] **Step 2: Create `src/scene/Scene.jsx`**

```jsx
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { Suspense } from 'react';
import * as THREE from 'three';
import Table from './Table.jsx';

export default function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
      camera={{ fov: 35, position: [0.9, 0.15, 1.4], near: 0.05, far: 40 }}
    >
      <color attach="background" args={['#0a0807']} />
      <fog attach="fog" args={['#0a0807', 6, 12]} />
      <Suspense fallback={null}>
        <Environment files="/hdr/studio_2k.hdr" background={false} />
        <ambientLight intensity={0.05} color="#88a8ff" />
        <directionalLight
          castShadow
          position={[2.4, 3, 2]}
          intensity={2.2}
          color="#ffd9a8"
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0005}
        />
        <Table />
      </Suspense>
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={0.6}
        maxDistance={2.5}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.55}
        enablePan={false}
        target={[0, -0.05, 0]}
      />
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
```

- [ ] **Step 3: Replace `src/App.jsx` to mount the scene**

```jsx
import Scene from './scene/Scene.jsx';

export default function App() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Scene />
    </div>
  );
}
```

- [ ] **Step 4: Run dev server and visually verify**

```bash
npm run dev
```
Expected: dark scene with a wooden circular table, soft contact shadow at the centre, draggable camera. No errors in console. Stop with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add src/scene/Scene.jsx src/scene/Table.jsx src/App.jsx
git commit -m "feat(hourglass): scene shell with environment lighting and table"
```

---

## Task 8: Hourglass frame (turned-wood plates + 4 spindles)

**Files:**
- Create: `portfolio/src/game/hourglass/src/scene/HourglassFrame.jsx`

- [ ] **Step 1: Create `src/scene/HourglassFrame.jsx`**

```jsx
import { useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';

const PLATE_PROFILE = [
  // [r, y]
  [0.0,  0.0],
  [0.65, 0.0],
  [0.66, 0.005],
  [0.66, 0.05],
  [0.65, 0.06],
  [0.0,  0.06],
];

const SPINDLE_PROFILE = [
  [0.00, 0.00],
  [0.04, 0.00],
  [0.05, 0.02],
  [0.07, 0.05],
  [0.05, 0.10],
  [0.04, 0.20],
  [0.06, 0.28],
  [0.05, 0.36],
  [0.04, 0.50],
  [0.06, 0.58],
  [0.05, 0.66],
  [0.04, 0.80],
  [0.05, 0.90],
  [0.07, 0.95],
  [0.05, 0.98],
  [0.04, 1.00],
  [0.00, 1.00],
];

function profileToVec2(arr) {
  return arr.map(([r, y]) => new THREE.Vector2(r, y));
}

export default function HourglassFrame() {
  const [color, normal, rough] = useTexture([
    '/textures/wood/walnut_diff_1k.jpg',
    '/textures/wood/walnut_nor_gl_1k.jpg',
    '/textures/wood/walnut_rough_1k.jpg',
  ]);
  color.colorSpace = THREE.SRGBColorSpace;

  const plateGeom = useMemo(() => new THREE.LatheGeometry(profileToVec2(PLATE_PROFILE), 64), []);
  const spindleGeom = useMemo(() => {
    const g = new THREE.LatheGeometry(profileToVec2(SPINDLE_PROFILE), 32);
    g.scale(1, 1.3, 1);
    return g;
  }, []);

  const woodMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: color, normalMap: normal, roughnessMap: rough,
    roughness: 0.7, metalness: 0,
  }), [color, normal, rough]);

  // Spindles arranged at 90° around the bulbs, offset just outside the bulb radius
  const spindleAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  const SPINDLE_OFFSET = 0.62;
  const SPINDLE_BOTTOM_Y = -0.65;

  return (
    <group>
      {/* Bottom plate (base) */}
      <mesh castShadow receiveShadow geometry={plateGeom} material={woodMat} position={[0, -0.7, 0]} />
      {/* Top plate */}
      <mesh castShadow receiveShadow geometry={plateGeom} material={woodMat} position={[0, 0.65, 0]} rotation={[Math.PI, 0, 0]} />
      {/* Spindles */}
      {spindleAngles.map((a, i) => (
        <mesh
          key={i}
          castShadow
          geometry={spindleGeom}
          material={woodMat}
          position={[Math.cos(a) * SPINDLE_OFFSET, SPINDLE_BOTTOM_Y, Math.sin(a) * SPINDLE_OFFSET]}
        />
      ))}
    </group>
  );
}
```

- [ ] **Step 2: Mount it in `Scene.jsx`** (add inside `<Suspense>`)

In `src/scene/Scene.jsx`, replace the `<Suspense>` block contents with:
```jsx
<Suspense fallback={null}>
  <Environment files="/hdr/studio_2k.hdr" background={false} />
  <ambientLight intensity={0.05} color="#88a8ff" />
  <directionalLight
    castShadow
    position={[2.4, 3, 2]}
    intensity={2.2}
    color="#ffd9a8"
    shadow-mapSize={[2048, 2048]}
    shadow-bias={-0.0005}
  />
  <Table />
  <HourglassFrame />
</Suspense>
```
And add the import:
```jsx
import HourglassFrame from './HourglassFrame.jsx';
```

- [ ] **Step 3: Run dev and visually inspect**

```bash
npm run dev
```
Expected: walnut plates top and bottom; four turned spindles between them; can rotate around the structure. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/scene/HourglassFrame.jsx src/scene/Scene.jsx
git commit -m "feat(hourglass): turned-wood frame (plates + 4 lathe spindles)"
```

---

## Task 9: Glass bulbs with `MeshTransmissionMaterial`

**Files:**
- Create: `portfolio/src/game/hourglass/src/scene/GlassBulbs.jsx`

- [ ] **Step 1: Create `src/scene/GlassBulbs.jsx`**

```jsx
import { useMemo } from 'react';
import * as THREE from 'three';
import { MeshTransmissionMaterial } from '@react-three/drei';
import { BULB_RADIUS, BULB_HEIGHT, NECK_RADIUS } from '../lib/sandProfile.js';

// Profile traces both bulbs joined at the neck, from bottom-of-bottom-bulb to top-of-top-bulb.
const SEGMENTS = 64;
function buildBulbProfile() {
  const pts = [];
  // Bottom bulb (y from -BULB_HEIGHT to 0)
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const y = -BULB_HEIGHT + t * BULB_HEIGHT;
    // Smooth bulb curve: lerp from BULB_RADIUS at bottom to NECK_RADIUS at top
    const bulb = Math.sin((1 - t) * Math.PI * 0.5);
    const r = NECK_RADIUS + (BULB_RADIUS - NECK_RADIUS) * bulb;
    pts.push(new THREE.Vector2(r, y));
  }
  // Top bulb (y from 0 to BULB_HEIGHT)
  for (let i = 1; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const y = t * BULB_HEIGHT;
    const bulb = Math.sin(t * Math.PI * 0.5);
    const r = NECK_RADIUS + (BULB_RADIUS - NECK_RADIUS) * bulb;
    pts.push(new THREE.Vector2(r, y));
  }
  return pts;
}

export default function GlassBulbs() {
  const geom = useMemo(() => new THREE.LatheGeometry(buildBulbProfile(), 64), []);
  return (
    <mesh geometry={geom} castShadow={false} receiveShadow={false}>
      <MeshTransmissionMaterial
        transmission={1}
        thickness={0.3}
        roughness={0.05}
        ior={1.5}
        chromaticAberration={0.02}
        anisotropy={0.1}
        distortion={0.1}
        distortionScale={0.3}
        temporalDistortion={0.1}
        backside
        backsideThickness={0.2}
        attenuationDistance={1.5}
        attenuationColor="#f7f0e1"
      />
    </mesh>
  );
}
```

- [ ] **Step 2: Mount it in `Scene.jsx`**

Add `<GlassBulbs />` inside `<Suspense>` after `<HourglassFrame />` and import:
```jsx
import GlassBulbs from './GlassBulbs.jsx';
```

- [ ] **Step 3: Run dev and visually verify**

```bash
npm run dev
```
Expected: two glass bulbs with real refraction visible; subtle warm tint; you can see the spindles slightly distorted through the glass. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/scene/GlassBulbs.jsx src/scene/Scene.jsx
git commit -m "feat(hourglass): joined-bulb glass with MeshTransmissionMaterial"
```

---

## Task 10: Sand bulk — top dome + bottom pile driven by progress

**Files:**
- Create: `portfolio/src/game/hourglass/src/scene/SandBulk.jsx`

- [ ] **Step 1: Create `src/scene/SandBulk.jsx`**

```jsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { topProfile, bottomProfile } from '../lib/sandProfile.js';

function profilePointsToVec2(pts) {
  return pts.map(([r, y]) => new THREE.Vector2(r, y));
}

export default function SandBulk({ progress = 0 }) {
  const topRef = useRef();
  const botRef = useRef();
  const lastProgressRef = useRef(-1);

  const [color, normal] = useTexture([
    '/textures/sand/sand_diff_512.jpg',
    '/textures/sand/sand_nor_gl_512.jpg',
  ]);
  color.colorSpace = THREE.SRGBColorSpace;
  [color, normal].forEach((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
  });

  const sandMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: color, normalMap: normal, color: '#efe3c8',
    roughness: 0.95, metalness: 0,
  }), [color, normal]);

  // Initial geometries — replaced each frame.
  const topGeom = useMemo(() => new THREE.LatheGeometry(profilePointsToVec2(topProfile(0)), 32), []);
  const botGeom = useMemo(() => new THREE.LatheGeometry(profilePointsToVec2(bottomProfile(0)), 32), []);

  useFrame(() => {
    if (Math.abs(progress - lastProgressRef.current) < 0.001) return;
    lastProgressRef.current = progress;

    const newTop = new THREE.LatheGeometry(profilePointsToVec2(topProfile(progress)), 32);
    const newBot = new THREE.LatheGeometry(profilePointsToVec2(bottomProfile(progress)), 32);

    if (topRef.current) {
      topRef.current.geometry.dispose();
      topRef.current.geometry = newTop;
    }
    if (botRef.current) {
      botRef.current.geometry.dispose();
      botRef.current.geometry = newBot;
    }
  });

  return (
    <group>
      <mesh ref={topRef} geometry={topGeom} material={sandMat} castShadow={false} />
      <mesh ref={botRef} geometry={botGeom} material={sandMat} castShadow={false} />
    </group>
  );
}
```

- [ ] **Step 2: Temporarily mount with hard-coded progress in `Scene.jsx`** (for visual smoke test)

Add a `useState` slider hack for now to visually verify the sand morphs. In `Scene.jsx`, do **not** add a slider; instead, add `<SandBulk progress={0.3} />` inside `<Suspense>` after `<GlassBulbs />`. Add the import:
```jsx
import SandBulk from './SandBulk.jsx';
```

- [ ] **Step 3: Run dev and visually verify**

```bash
npm run dev
```
Expected: top bulb has a sand dome; bottom has a small pile. Sand surface is slightly below the bulb crest. Manually edit the prop to `0.0`, `0.5`, `0.95` and refresh between each — the volumes should shift convincingly. Stop with Ctrl+C.

- [ ] **Step 4: Restore `<SandBulk progress={0} />` and commit**

```bash
git add src/scene/SandBulk.jsx src/scene/Scene.jsx
git commit -m "feat(hourglass): morphing top + bottom sand meshes driven by progress"
```

---

## Task 11: Sand stream — instanced falling-grain particles

**Files:**
- Create: `portfolio/src/game/hourglass/src/scene/SandStream.jsx`

- [ ] **Step 1: Create `src/scene/SandStream.jsx`**

```jsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NECK_RADIUS, BULB_HEIGHT } from '../lib/sandProfile.js';

const STREAM_COUNT = 2000;
const STREAM_TOP = NECK_RADIUS * 0.9;
const STREAM_BOTTOM = -BULB_HEIGHT * 0.7;
const STREAM_LENGTH = STREAM_TOP - STREAM_BOTTOM;

export default function SandStream({ progress = 0, running = false }) {
  const ref = useRef();
  const visible = running && progress > 0 && progress < 1;

  const { positions, phases } = useMemo(() => {
    const positions = new Float32Array(STREAM_COUNT * 3);
    const phases = new Float32Array(STREAM_COUNT);
    for (let i = 0; i < STREAM_COUNT; i++) {
      phases[i] = Math.random();
      const jitter = (Math.random() - 0.5) * NECK_RADIUS * 0.4;
      positions[i * 3] = jitter;
      positions[i * 3 + 1] = STREAM_TOP - phases[i] * STREAM_LENGTH;
      positions[i * 3 + 2] = (Math.random() - 0.5) * NECK_RADIUS * 0.4;
    }
    return { positions, phases };
  }, []);

  useFrame((state) => {
    if (!ref.current || !visible) return;
    const time = state.clock.elapsedTime;
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < STREAM_COUNT; i++) {
      const phase = (phases[i] + time * 0.45) % 1;
      const y = STREAM_TOP - phase * STREAM_LENGTH;
      // Cone-shaped jitter: tightest at the neck, widening below
      const widthAtY = NECK_RADIUS * (0.25 + 0.6 * (1 - (y - STREAM_BOTTOM) / STREAM_LENGTH));
      const angle = phase * 13.7 + i * 0.001;
      arr[i * 3] = Math.cos(angle * 6) * widthAtY * 0.5;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = Math.sin(angle * 6) * widthAtY * 0.5;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref} visible={visible} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={STREAM_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#f4ecd0"
        size={0.012}
        sizeAttenuation
        transparent
        opacity={0.95}
        depthWrite={false}
      />
    </points>
  );
}
```

- [ ] **Step 2: Temporarily mount with `progress={0.5}` and `running={true}` in `Scene.jsx`**

Add inside `<Suspense>` after `<SandBulk>`:
```jsx
<SandStream progress={0.5} running={true} />
```
Add the import:
```jsx
import SandStream from './SandStream.jsx';
```

- [ ] **Step 3: Run dev and verify**

```bash
npm run dev
```
Expected: a tapering stream of fine grains visibly falling through the neck of the hourglass, animating smoothly. Stop with Ctrl+C.

- [ ] **Step 4: Restore `progress={0}` `running={false}` and commit**

```bash
git add src/scene/SandStream.jsx src/scene/Scene.jsx
git commit -m "feat(hourglass): GPU particle sand stream"
```

---

## Task 12: Compose `Hourglass.jsx` with flip animation + click handler

**Files:**
- Create: `portfolio/src/game/hourglass/src/scene/Hourglass.jsx`
- Modify: `portfolio/src/game/hourglass/src/scene/Scene.jsx`

- [ ] **Step 1: Create `src/scene/Hourglass.jsx`**

```jsx
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { easeInOutCubic } from '../lib/easing.js';
import HourglassFrame from './HourglassFrame.jsx';
import GlassBulbs from './GlassBulbs.jsx';
import SandBulk from './SandBulk.jsx';
import SandStream from './SandStream.jsx';

const FLIP_DURATION_MS = 800;

export default function Hourglass({ progress, running, flipState, onFlip }) {
  const groupRef = useRef();
  const flipStartRef = useRef(null);
  const fromRef = useRef(0);
  const toRef = useRef(0);

  useEffect(() => {
    // flipState changed → start a new tween from current rotation to flipState's target.
    const target = flipState === 1 ? 0 : Math.PI;
    fromRef.current = groupRef.current ? groupRef.current.rotation.z : 0;
    toRef.current = target;
    flipStartRef.current = performance.now();
  }, [flipState]);

  useFrame(() => {
    if (!groupRef.current || flipStartRef.current === null) return;
    const t = (performance.now() - flipStartRef.current) / FLIP_DURATION_MS;
    if (t >= 1) {
      groupRef.current.rotation.z = toRef.current;
      flipStartRef.current = null;
      return;
    }
    groupRef.current.rotation.z =
      fromRef.current + (toRef.current - fromRef.current) * easeInOutCubic(t);
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onFlip?.(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'default'; }}
    >
      <HourglassFrame />
      <GlassBulbs />
      <SandBulk progress={progress} />
      <SandStream progress={progress} running={running} />
    </group>
  );
}
```

- [ ] **Step 2: Replace direct child mounts in `Scene.jsx` with `<Hourglass>`**

In `src/scene/Scene.jsx`:
- Remove individual imports of `HourglassFrame`, `GlassBulbs`, `SandBulk`, `SandStream`
- Remove their `<...>` mounts inside `<Suspense>`
- Add `import Hourglass from './Hourglass.jsx';`
- Accept props on `Scene`: `export default function Scene({ progress = 0, running = false, flipState = 1, onFlip }) {`
- Add inside `<Suspense>` after `<Table />`:
```jsx
<Hourglass progress={progress} running={running} flipState={flipState} onFlip={onFlip} />
```

- [ ] **Step 3: Wire `App.jsx` to `useTimer` and pass props down**

Replace `src/App.jsx`:
```jsx
import Scene from './scene/Scene.jsx';
import { useTimer } from './hooks/useTimer.js';

export default function App() {
  const timer = useTimer({ defaultDuration: 300 });

  const handleFlip = () => {
    timer.flip();
    // Defer start until flip animation completes (800ms).
    setTimeout(() => timer.start(), 850);
  };

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Scene
        progress={timer.progress}
        running={timer.running}
        flipState={timer.flipState}
        onFlip={handleFlip}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run dev and verify**

```bash
npm run dev
```
Expected: full hourglass renders. Clicking the hourglass flips it 180° over 800ms, then the timer starts and sand begins falling. After 5 minutes the sand should fully drain. (For impatience, change `defaultDuration` to `15` to test in 15 seconds.)
Stop with Ctrl+C and revert to 300.

- [ ] **Step 5: Commit**

```bash
git add src/scene/Hourglass.jsx src/scene/Scene.jsx src/App.jsx
git commit -m "feat(hourglass): compose hourglass with flip animation + click-to-flip"
```

---

## Task 13: HUD component with duration chips, time display, controls (TDD on logic)

**Files:**
- Create: `portfolio/src/game/hourglass/src/ui/HUD.jsx`
- Create: `portfolio/src/game/hourglass/src/ui/HUD.css`
- Create: `portfolio/src/game/hourglass/src/__tests__/HUD.test.jsx`

- [ ] **Step 1: Write failing tests**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HUD from '../ui/HUD.jsx';

const baseProps = {
  duration: 300,
  remainingMs: 300_000,
  running: false,
  muted: true,
  onSetDuration: vi.fn(),
  onPlayPause: vi.fn(),
  onReset: vi.fn(),
  onToggleMute: vi.fn(),
};

describe('HUD', () => {
  it('renders all preset chips and highlights the active one', () => {
    render(<HUD {...baseProps} />);
    for (const label of ['1m', '3m', '5m', '10m', '25m', '60m']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: '5m' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking a chip calls onSetDuration with seconds', () => {
    const onSetDuration = vi.fn();
    render(<HUD {...baseProps} onSetDuration={onSetDuration} />);
    fireEvent.click(screen.getByRole('button', { name: '10m' }));
    expect(onSetDuration).toHaveBeenCalledWith(600);
  });

  it('renders remaining time as M:SS for short durations', () => {
    render(<HUD {...baseProps} remainingMs={65_000} />);
    expect(screen.getByText('1:05')).toBeInTheDocument();
  });

  it('renders remaining time as H:MM:SS for ≥1h', () => {
    render(<HUD {...baseProps} remainingMs={3_725_000} />);
    expect(screen.getByText('1:02:05')).toBeInTheDocument();
  });

  it('play button calls onPlayPause when not running', () => {
    const onPlayPause = vi.fn();
    render(<HUD {...baseProps} onPlayPause={onPlayPause} />);
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(onPlayPause).toHaveBeenCalled();
  });

  it('shows pause icon when running', () => {
    render(<HUD {...baseProps} running={true} />);
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('reset button fires onReset', () => {
    const onReset = vi.fn();
    render(<HUD {...baseProps} onReset={onReset} />);
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(onReset).toHaveBeenCalled();
  });

  it('mute toggle fires onToggleMute', () => {
    const onToggleMute = vi.fn();
    render(<HUD {...baseProps} onToggleMute={onToggleMute} />);
    fireEvent.click(screen.getByRole('button', { name: /mute|sound/i }));
    expect(onToggleMute).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npm test HUD
```
Expected: FAIL with "Cannot find module '../ui/HUD.jsx'".

- [ ] **Step 3: Create `src/ui/HUD.css`**

```css
.hud {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #f4eee0;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
  font-size: 14px;
  z-index: 10;
  transition: opacity 400ms ease;
}
.hud.idle { opacity: 0.3; }
.hud .chips { display: flex; gap: 6px; }
.hud .chip {
  padding: 6px 10px;
  border-radius: 10px;
  background: transparent;
  color: rgba(244,238,224,0.7);
  border: 1px solid rgba(255,255,255,0.06);
  font: inherit;
  cursor: pointer;
}
.hud .chip[aria-pressed="true"] {
  background: rgba(244,238,224,0.15);
  color: #fff;
  border-color: rgba(255,255,255,0.25);
}
.hud .time {
  font-variant-numeric: tabular-nums;
  font-size: 20px;
  min-width: 92px;
  text-align: center;
}
.hud .time.paused { animation: pulse 1.6s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.5; } }
.hud .icon-btn {
  width: 36px; height: 36px;
  border: none; background: transparent; cursor: pointer;
  color: #f4eee0; font-size: 18px;
  border-radius: 10px;
  display: grid; place-items: center;
}
.hud .icon-btn:hover { background: rgba(255,255,255,0.06); }
@media (max-width: 768px) {
  .hud {
    left: 8px; right: 8px; bottom: 8px;
    transform: none;
    flex-wrap: wrap;
    justify-content: center;
  }
}
```

- [ ] **Step 4: Implement `src/ui/HUD.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react';
import './HUD.css';

const PRESETS = [
  { label: '1m', seconds: 60 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
  { label: '25m', seconds: 1500 },
  { label: '60m', seconds: 3600 },
];

function formatTime(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function HUD({
  duration, remainingMs, running, muted,
  onSetDuration, onPlayPause, onReset, onToggleMute,
}) {
  const [idle, setIdle] = useState(false);
  const idleTimerRef = useRef(null);

  useEffect(() => {
    const wake = () => {
      setIdle(false);
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setIdle(true), 4000);
    };
    wake();
    window.addEventListener('mousemove', wake);
    window.addEventListener('touchstart', wake);
    window.addEventListener('keydown', wake);
    return () => {
      clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('touchstart', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  return (
    <div className={`hud ${idle ? 'idle' : ''}`}>
      <div className="chips">
        {PRESETS.map(({ label, seconds }) => (
          <button
            key={label}
            className="chip"
            aria-pressed={duration === seconds}
            onClick={() => onSetDuration(seconds)}
          >{label}</button>
        ))}
      </div>
      <div className={`time ${!running && remainingMs < duration * 1000 ? 'paused' : ''}`}>
        {formatTime(remainingMs)}
      </div>
      <button className="icon-btn" aria-label={running ? 'Pause' : 'Play'} onClick={onPlayPause}>
        {running ? '⏸' : '▶'}
      </button>
      <button className="icon-btn" aria-label="Reset" onClick={onReset}>↻</button>
      <button className="icon-btn" aria-label={muted ? 'Unmute sound' : 'Mute sound'} onClick={onToggleMute}>
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Run tests, verify they pass**

```bash
npm test HUD
```
Expected: all `HUD` tests PASS.

- [ ] **Step 6: Mount HUD in `App.jsx`**

Replace `src/App.jsx`:
```jsx
import { useEffect, useState } from 'react';
import Scene from './scene/Scene.jsx';
import HUD from './ui/HUD.jsx';
import { useTimer } from './hooks/useTimer.js';

export default function App() {
  const timer = useTimer({ defaultDuration: 300 });
  const [muted, setMuted] = useState(() => localStorage.getItem('hourglass.muted') !== '0');

  useEffect(() => {
    localStorage.setItem('hourglass.muted', muted ? '1' : '0');
  }, [muted]);

  const handleFlip = () => {
    timer.flip();
    setTimeout(() => timer.start(), 850);
  };

  const handlePlayPause = () => (timer.running ? timer.pause() : timer.start());

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Scene
        progress={timer.progress}
        running={timer.running}
        flipState={timer.flipState}
        onFlip={handleFlip}
      />
      <HUD
        duration={timer.duration}
        remainingMs={timer.remainingMs}
        running={timer.running}
        muted={muted}
        onSetDuration={timer.setDuration}
        onPlayPause={handlePlayPause}
        onReset={timer.reset}
        onToggleMute={() => setMuted((m) => !m)}
      />
    </div>
  );
}
```

- [ ] **Step 7: Run dev and verify**

```bash
npm run dev
```
Expected: HUD bar at the bottom; chip selection updates duration; play/pause works; reset returns sand to top; mute icon toggles. Stop with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add src/ui/HUD.jsx src/ui/HUD.css src/__tests__/HUD.test.jsx src/App.jsx
git commit -m "feat(hourglass): HUD with presets, controls, and tests"
```

---

## Task 14: Keyboard shortcuts (Space, R, F, M)

**Files:**
- Modify: `portfolio/src/game/hourglass/src/App.jsx`

- [ ] **Step 1: Add a keyboard effect to `App.jsx`**

Inside `App()`, after the `useEffect` that persists `muted`, add:
```jsx
useEffect(() => {
  const onKey = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.key.toLowerCase()) {
      case ' ':
        e.preventDefault();
        if (timer.running) timer.pause(); else timer.start();
        break;
      case 'r':
        timer.reset();
        break;
      case 'f':
        timer.flip();
        setTimeout(() => timer.start(), 850);
        break;
      case 'm':
        setMuted((m) => !m);
        break;
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [timer]);
```

- [ ] **Step 2: Run dev and verify**

```bash
npm run dev
```
Expected: pressing Space toggles play/pause; R resets; F flips and starts; M toggles mute. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat(hourglass): keyboard shortcuts for timer controls"
```

---

## Task 15: Audio system (`useAudio` hook + chime + sand loop)

**Files:**
- Create: `portfolio/src/game/hourglass/src/hooks/useAudio.js`
- Modify: `portfolio/src/game/hourglass/src/App.jsx`

- [ ] **Step 1: Create `src/hooks/useAudio.js`**

```js
import { Howl } from 'howler';
import { useEffect, useRef } from 'react';

export function useAudio({ muted, running, done }) {
  const sandRef = useRef(null);
  const chimeRef = useRef(null);
  const initialisedRef = useRef(false);
  const doneFiredRef = useRef(false);

  // Lazy-initialise on first user interaction (autoplay policy).
  useEffect(() => {
    const init = () => {
      if (initialisedRef.current) return;
      initialisedRef.current = true;
      sandRef.current = new Howl({ src: ['/audio/sand-loop.mp3'], loop: true, volume: 0.25 });
      chimeRef.current = new Howl({ src: ['/audio/chime.mp3'], volume: 0.7 });
    };
    const on = () => init();
    window.addEventListener('pointerdown', on, { once: true });
    window.addEventListener('keydown', on, { once: true });
    return () => {
      window.removeEventListener('pointerdown', on);
      window.removeEventListener('keydown', on);
    };
  }, []);

  // Sand loop follows running + muted.
  useEffect(() => {
    const sand = sandRef.current;
    if (!sand) return;
    if (running && !muted) {
      if (!sand.playing()) sand.play();
      sand.fade(0, 0.25, 800);
    } else {
      if (sand.playing()) sand.fade(sand.volume(), 0, 400);
      setTimeout(() => sand.stop(), 450);
    }
  }, [running, muted]);

  // Chime fires once per "done" transition.
  useEffect(() => {
    if (done && !doneFiredRef.current) {
      doneFiredRef.current = true;
      if (!muted && chimeRef.current) chimeRef.current.play();
    }
    if (!done) doneFiredRef.current = false;
  }, [done, muted]);
}
```

- [ ] **Step 2: Wire `useAudio` into `App.jsx`**

Add the import:
```jsx
import { useAudio } from './hooks/useAudio.js';
```
Inside `App()`, after `const [muted, setMuted] = ...`:
```jsx
useAudio({ muted, running: timer.running, done: timer.done });
```

- [ ] **Step 3: Run dev and verify**

```bash
npm run dev
```
Expected: with mute off (click 🔊), starting the timer plays a soft sand whoosh that fades in; pausing fades it out; chime plays exactly once when the sand finishes. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useAudio.js src/App.jsx
git commit -m "feat(hourglass): audio system with sand loop + completion chime"
```

---

## Task 16: End-of-timer Notification API + camera attention zoom

**Files:**
- Modify: `portfolio/src/game/hourglass/src/App.jsx`
- Modify: `portfolio/src/game/hourglass/src/scene/Scene.jsx`

- [ ] **Step 1: Add notification helper inside `App.jsx`**

Inside `App()`, add a one-shot effect that fires when `timer.done` becomes true:
```jsx
useEffect(() => {
  if (!timer.done) return;
  if (!('Notification' in window)) return;
  if (document.visibilityState === 'visible') return;
  const fire = () => {
    new Notification('Hourglass', { body: 'Your timer has finished.', silent: true });
  };
  if (Notification.permission === 'granted') fire();
  else if (Notification.permission !== 'denied') Notification.requestPermission().then((p) => p === 'granted' && fire());
}, [timer.done]);
```

- [ ] **Step 2: Add camera attention zoom to `Scene.jsx`**

In `src/scene/Scene.jsx`, add state for a camera target distance and tween it when `done` flips true. Inside the `<Canvas>` add a small inner component that uses `useThree` + `useFrame` to nudge the camera 5% closer over 1.5s on `done` going true. Implement as follows:

Add at top of `Scene.jsx`:
```jsx
import { useThree, useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { easeInOutCubic } from '../lib/easing.js';
```

Add this component **inside the same file** (above `Scene`):
```jsx
function AttentionZoom({ done }) {
  const { camera } = useThree();
  const startRef = useRef(null);
  const fromRef = useRef(0);
  const toRef = useRef(0);

  useEffect(() => {
    if (!done) return;
    fromRef.current = camera.position.length();
    toRef.current = fromRef.current * 0.95;
    startRef.current = performance.now();
  }, [done, camera]);

  useFrame(() => {
    if (startRef.current === null) return;
    const t = (performance.now() - startRef.current) / 1500;
    if (t >= 1) {
      const dir = camera.position.clone().normalize();
      camera.position.copy(dir.multiplyScalar(toRef.current));
      startRef.current = null;
      return;
    }
    const targetLen = fromRef.current + (toRef.current - fromRef.current) * easeInOutCubic(t);
    const dir = camera.position.clone().normalize();
    camera.position.copy(dir.multiplyScalar(targetLen));
  });

  return null;
}
```

Update `Scene` to accept `done`:
```jsx
export default function Scene({ progress = 0, running = false, flipState = 1, done = false, onFlip }) {
```
And mount `<AttentionZoom done={done} />` inside `<Canvas>` (after the controls is fine).

In `App.jsx`, pass `done={timer.done}` to `<Scene>`.

- [ ] **Step 3: Run dev and verify**

```bash
npm run dev
```
With `defaultDuration={15}` (temporarily for testing), wait for completion: camera should ease ~5% closer over 1.5s; if you switch to another tab during the countdown, a notification should appear when complete. Restore `defaultDuration` to `300` afterward.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/scene/Scene.jsx
git commit -m "feat(hourglass): completion notification + subtle camera attention zoom"
```

---

## Task 17: Post-processing (Bloom + Vignette + ToneMapping)

**Files:**
- Modify: `portfolio/src/game/hourglass/src/scene/Scene.jsx`

- [ ] **Step 1: Add post-processing imports to `Scene.jsx`**

```jsx
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
```

- [ ] **Step 2: Add `<EffectComposer>` after the controls inside `<Canvas>`**

```jsx
<EffectComposer multisampling={4}>
  <Bloom intensity={0.3} luminanceThreshold={0.9} luminanceSmoothing={0.2} mipmapBlur />
  <Vignette eskil={false} offset={0.5} darkness={0.4} />
</EffectComposer>
```

- [ ] **Step 3: Run dev and verify**

```bash
npm run dev
```
Expected: subtle bloom on the brightest highlights of the glass and wood; gentle dark vignette around the edges. The scene should look noticeably more "cinematic". Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/scene/Scene.jsx
git commit -m "feat(hourglass): bloom + vignette post-processing"
```

---

## Task 18: Mobile detection + asset/effect degradation

**Files:**
- Modify: `portfolio/src/game/hourglass/src/scene/Scene.jsx`
- Modify: `portfolio/src/game/hourglass/src/App.jsx`

- [ ] **Step 1: Pass `lowPower` from App to Scene**

In `src/App.jsx` add the import + state:
```jsx
import { isLowPower } from './lib/device.js';
```
At the top of `App()`:
```jsx
const lowPower = isLowPower();
```
Pass it to `<Scene>`: `<Scene ... lowPower={lowPower} />`.

- [ ] **Step 2: In `Scene.jsx`, use `lowPower` for HDR + bloom + DPR**

Update the `Scene` function signature: `export default function Scene({ progress, running, flipState, done, onFlip, lowPower = false }) {`

Change the `<Environment>` line:
```jsx
<Environment files={lowPower ? '/hdr/studio_1k.hdr' : '/hdr/studio_2k.hdr'} background={false} />
```

Change `<Bloom>` intensity:
```jsx
<Bloom intensity={lowPower ? 0.2 : 0.3} luminanceThreshold={0.9} luminanceSmoothing={0.2} mipmapBlur />
```

Change `<Vignette>` darkness:
```jsx
<Vignette offset={0.5} darkness={lowPower ? 0.3 : 0.4} />
```

Change DPR cap:
```jsx
dpr={lowPower ? [1, 1.5] : [1, 2]}
```

Disable orbit auto-rotate on mobile (we haven't enabled it yet — see Step 3).

- [ ] **Step 3: Add idle auto-rotate (desktop only)**

In `<OrbitControls ...>` add:
```jsx
autoRotate={!lowPower}
autoRotateSpeed={0.4}
```

- [ ] **Step 4: Run dev with `?stats=1` on a real phone (manual)**

Build and serve preview, then visit on a phone:
```bash
npm run build
npm run preview -- --host 0.0.0.0
```
Expected: app loads on phone Safari/Chrome; runs ≥30 fps; HDR file is `studio_1k.hdr` (check Network tab from desktop devtools mirror).

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/scene/Scene.jsx
git commit -m "feat(hourglass): mobile detection with HDR/bloom/DPR degradation"
```

---

## Task 19: WebGL fallback + first-visit tooltip

**Files:**
- Create: `portfolio/src/game/hourglass/src/ui/FallbackTimer.jsx`
- Create: `portfolio/src/game/hourglass/src/ui/FallbackTimer.css`
- Modify: `portfolio/src/game/hourglass/src/App.jsx`
- Create: `portfolio/src/game/hourglass/public/fallback.jpg` (manual capture)
- Create: `portfolio/src/game/hourglass/public/og.jpg` (manual capture)

- [ ] **Step 1: Capture the fallback image**

Run dev, frame the hourglass nicely (slight angle, default 5m duration, full at top), and use OS screenshot tools to capture a 1200×800 region. Optimise (~80KB JPG) and save:
- `public/fallback.jpg` (1200×800)
- `public/og.jpg` (1200×630, cropped)

- [ ] **Step 2: Create `src/ui/FallbackTimer.css`**

```css
.fallback {
  position: fixed; inset: 0;
  background: #0a0807 url('/fallback.jpg') center/contain no-repeat;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 40px;
  color: #f4eee0;
}
.fallback .panel {
  background: rgba(0,0,0,0.55);
  padding: 16px 24px;
  border-radius: 14px;
  display: flex; gap: 12px; align-items: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
}
.fallback select, .fallback button {
  font: inherit; color: #f4eee0; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
  padding: 6px 10px; cursor: pointer;
}
.fallback .time { font-variant-numeric: tabular-nums; min-width: 80px; text-align: center; }
```

- [ ] **Step 3: Implement `src/ui/FallbackTimer.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useTimer } from '../hooks/useTimer.js';
import './FallbackTimer.css';

const PRESETS = [60, 180, 300, 600, 1500, 3600];
const fmt = (ms) => {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
};

export default function FallbackTimer() {
  const t = useTimer({ defaultDuration: 300 });
  return (
    <div className="fallback">
      <noscript>This timer requires JavaScript.</noscript>
      <div className="panel">
        <select value={t.duration} onChange={(e) => t.setDuration(Number(e.target.value))}>
          {PRESETS.map((sec) => <option key={sec} value={sec}>{fmt(sec * 1000)}</option>)}
        </select>
        <span className="time">{fmt(t.remainingMs)}</span>
        <button onClick={() => (t.running ? t.pause() : t.start())}>{t.running ? 'Pause' : 'Start'}</button>
        <button onClick={t.reset}>Reset</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire WebGL detection into `App.jsx`**

Add the import:
```jsx
import { isWebGLAvailable } from './lib/webgl.js';
import FallbackTimer from './ui/FallbackTimer.jsx';
```

Inside `App()`, before the existing returns, add:
```jsx
const [webglOk] = useState(() => isWebGLAvailable());
if (!webglOk) return <FallbackTimer />;
```

- [ ] **Step 5: Add first-visit tooltip**

In `App.jsx` add another effect + state:
```jsx
const [showTip, setShowTip] = useState(() => !localStorage.getItem('hourglass.tutorialSeen'));
useEffect(() => {
  if (!showTip) return;
  const dismiss = () => {
    setShowTip(false);
    localStorage.setItem('hourglass.tutorialSeen', '1');
  };
  window.addEventListener('pointerdown', dismiss, { once: true });
  window.addEventListener('keydown', dismiss, { once: true });
  return () => {
    window.removeEventListener('pointerdown', dismiss);
    window.removeEventListener('keydown', dismiss);
  };
}, [showTip]);
```

Add the tooltip JSX next to `<Scene>` mount:
```jsx
{showTip && (
  <div style={{
    position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)',
    color: 'rgba(244,238,224,0.7)', fontSize: 13, pointerEvents: 'none', zIndex: 5,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
  }}>
    Click the hourglass to flip and start • Drag to spin
  </div>
)}
```

- [ ] **Step 6: Verify WebGL fallback manually**

In Chrome DevTools, open Settings → Rendering → enable "Disable WebGL". Reload. Expected: `FallbackTimer` renders with the still image and a working HTML timer. Re-enable WebGL afterward.

- [ ] **Step 7: Commit**

```bash
git add public/fallback.jpg public/og.jpg src/ui/FallbackTimer.jsx src/ui/FallbackTimer.css src/App.jsx
git commit -m "feat(hourglass): WebGL fallback + first-visit tooltip"
```

---

## Task 20: Firebase Hosting setup + first deploy

**Files:**
- Create: `portfolio/src/game/hourglass/firebase.json`
- Create: `portfolio/src/game/hourglass/.firebaserc`

- [ ] **Step 1: Confirm/install Firebase CLI**

```bash
cd portfolio/src/game/hourglass
npx firebase --version
```
Expected: prints a version. If not installed, `npm install` should already pull it via `firebase-tools` devDep.

- [ ] **Step 2: Log in (interactive — user runs)**

```bash
npx firebase login
```
Expected: opens a browser; user authenticates with the same Google account as `system-design-c84d3`.

- [ ] **Step 3: Create the Hosting site (one-time, in browser)**

In the Firebase console for project `system-design-c84d3`:
- Hosting → Add another site → site ID: `hourglass`
- Firebase will create `hourglass.web.app` and `hourglass.firebaseapp.com`.

- [ ] **Step 4: Create `firebase.json`**

```json
{
  "hosting": {
    "target": "hourglass",
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      {
        "source": "/assets/**",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      },
      {
        "source": "/textures/**",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      },
      {
        "source": "/hdr/**",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      },
      {
        "source": "/audio/**",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      },
      {
        "source": "/index.html",
        "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }]
      }
    ]
  }
}
```

- [ ] **Step 5: Create `.firebaserc`**

```json
{
  "projects": { "default": "system-design-c84d3" },
  "targets": {
    "system-design-c84d3": {
      "hosting": {
        "hourglass": ["hourglass"]
      }
    }
  }
}
```

- [ ] **Step 6: Build and deploy**

```bash
npm run build
npx firebase deploy --only hosting:hourglass
```
Expected: deploy succeeds; CLI prints the live URL `https://hourglass.web.app`. Visit and confirm it works.

- [ ] **Step 7: Commit**

```bash
git add firebase.json .firebaserc
git commit -m "build(hourglass): firebase hosting config + first deploy"
```

---

## Task 21: Cloudflare DNS for `hourglass.hillmanchan.com`

This task uses the Firebase + Cloudflare web UIs — no code.

- [ ] **Step 1: In Firebase console, add the custom domain**

`Hosting → hourglass site → Add custom domain → hourglass.hillmanchan.com`. Firebase will display a target hostname (e.g. `1234abcd.firebasehosting.app`) and a TXT verification record.

- [ ] **Step 2: In Cloudflare DNS for `hillmanchan.com`**

- Add a TXT record exactly as Firebase asked (verification).
- Wait for Firebase to verify (~1–10 min).
- Once verified, add a CNAME: name `hourglass` → target `<the firebasehosting.app target>`, **DNS-only / grey cloud** (NOT proxied — TLS is handled by Firebase).

- [ ] **Step 3: Wait for cert provisioning + verify**

Firebase will issue a cert automatically (~5–30 min). Once status shows "Connected", visit `https://hourglass.hillmanchan.com` — expected: same as `hourglass.web.app`, with valid TLS.

(No git changes for this task.)

---

## Task 22: Portfolio embed + project entry

**Files:**
- Create: `portfolio/src/game/hourglass/HourglassGame.jsx`
- Create: `portfolio/src/game/hourglass/hourglassGameStyles.css`
- Modify: `portfolio/src/App.js`
- Modify: `portfolio/src/projectData.json`

- [ ] **Step 1: Create `portfolio/src/game/hourglass/hourglassGameStyles.css`**

```css
html.hourglass-mode, body.hourglass-mode {
  margin: 0; padding: 0; overflow: hidden; background: #0a0807;
}
.hourglass-container {
  position: fixed; inset: 0; background: #0a0807;
}
.hourglass-iframe {
  width: 100%; height: 100%; border: 0; display: block;
}
```

- [ ] **Step 2: Create `portfolio/src/game/hourglass/HourglassGame.jsx`**

```jsx
import React, { useEffect } from 'react';
import './hourglassGameStyles.css';

const HourglassGame = () => {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.classList.add('hourglass-mode');
    body.classList.add('hourglass-mode');
    body.style.overflow = 'hidden';
    return () => {
      html.classList.remove('hourglass-mode');
      body.classList.remove('hourglass-mode');
      body.style.overflow = '';
    };
  }, []);

  return (
    <div className="hourglass-container">
      <iframe
        title="Hourglass"
        src="https://hourglass.hillmanchan.com"
        className="hourglass-iframe"
        allow="fullscreen"
      />
    </div>
  );
};

export default HourglassGame;
```

- [ ] **Step 3: Register in `portfolio/src/App.js`**

In `portfolio/src/App.js`, where the other game components are imported and routed:

Add import alongside others:
```jsx
import HourglassGame from './game/hourglass/HourglassGame';
```
Add to the game-component map (alongside `'card-game': CardGame`, etc.):
```jsx
'hourglass': HourglassGame,
```
Add a route alongside `<Route path="/connect4" ...>`:
```jsx
<Route path="/hourglass" element={<HourglassGame />} />
```

- [ ] **Step 4: Add project entry to `portfolio/src/projectData.json`**

Append a new entry (use the next free `id`, e.g. `16` — verify by reading the file):

```json
{
  "id": 16,
  "title": "Hourglass — 3D Realistic Timer",
  "shortDescription": "An ultra-realistic 3D hourglass timer in the browser. Pick a duration, click to flip, watch the sand drain in real time. Real glass refraction, GPU particle sand, ambient sound, and a soft chime when done.",
  "fullDescription": "Hourglass is a real-time 3D timer built with React Three Fiber. The hourglass sits on a wooden table against a dark moody backdrop; the user picks a duration (1m to 60m), clicks the hourglass to flip and start, and watches sand drain through the neck in real time. Glass uses MeshTransmissionMaterial for true refraction; the falling sand is a GPU-instanced particle stream; the sand bulk is morphing LatheGeometry recomputed each frame from the timer's progress value. Lit by a polyhaven HDR environment, post-processed with subtle bloom and ACES tone mapping. Full keyboard support (Space pause, R reset, F flip, M mute), Notification API for background-tab completion alerts, and a static HTML/CSS fallback for browsers without WebGL. Deployed as a standalone Vite app on Firebase Hosting at hourglass.hillmanchan.com.",
  "image": "hourglass.jpg",
  "url": "https://hourglass.hillmanchan.com",
  "category": "program",
  "sourceCode": "no-source-code",
  "demoUrl": "/hourglass",
  "liveDemo": "no-demo",
  "technologies": [
    "React",
    "Vite",
    "Three.js",
    "React Three Fiber",
    "WebGL",
    "GLSL"
  ]
}
```

- [ ] **Step 5: Add the project card image**

Save a 1200×800 JPG of the rendered hourglass to `portfolio/public/images/hourglass.jpg` (or wherever other project images live — verify by inspecting another existing entry's `image` field path). Use the same screenshot from Task 19.

- [ ] **Step 6: Verify portfolio dev**

```bash
cd portfolio
npm run dev
```
Visit `http://localhost:3000/hourglass` — expected: the iframe loads `hourglass.hillmanchan.com` and shows the full app. The new project should also appear on the projects page. Stop with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/hourglass/HourglassGame.jsx \
        portfolio/src/game/hourglass/hourglassGameStyles.css \
        portfolio/src/App.js \
        portfolio/src/projectData.json \
        portfolio/public/images/hourglass.jpg
git commit -m "feat(portfolio): add hourglass embed at /hourglass + project entry"
```

---

## Task 23: Verify Definition of Done + redeploy

This task is verification, not new code. Each step is a check from the spec's DOD.

- [ ] **Step 1: Cold-cache load time on desktop fast 3G ≤ 4 s**

Open Chrome DevTools → Network → throttle to "Fast 3G" → Disable cache → reload `https://hourglass.hillmanchan.com`. Expected: time to interactive ≤ 4 s.

- [ ] **Step 2: Comparable in feel to the reference photo**

Open the spec's reference image side-by-side with the live app. Wood frame visible, glass refracts, sand drains, dark moody backdrop, table grounding. If anything feels off (e.g., glass too clear, sand too cartoonish), tweak in `GlassBulbs.jsx` / `SandBulk.jsx` material params and redeploy.

- [ ] **Step 3: 1m timer accuracy**

Set 1m, click to flip, time with a phone stopwatch. Expected: chime fires within ±1 s of 60 s.

- [ ] **Step 4: Drag rotates smoothly**

In Chrome devtools → Performance → record while dragging for 3 s. Expected: ≥ 60 fps, no long tasks.

- [ ] **Step 5: Mobile**

Test on real iPhone Safari and Android Chrome. Expected: ≥ 30 fps; HDR is the 1k version (Network tab); chips and click-to-flip work via touch.

- [ ] **Step 6: WebGL fallback works**

Disable WebGL in DevTools (Settings → Rendering). Expected: HTML fallback renders with the still image and the timer counts down.

- [ ] **Step 7: No console errors in production build**

Open `https://hourglass.hillmanchan.com` in a clean Chrome profile. Expected: no red errors or warnings (except the one expected message about Firebase reserved URLs if any).

- [ ] **Step 8: Routes resolve**

- `https://hourglass.hillmanchan.com` → loads
- `https://hillmanchan.com/hourglass` → portfolio embed loads (iframe to subdomain)
- Projects page lists the new entry

- [ ] **Step 9: Final redeploy if anything was tweaked**

```bash
cd portfolio/src/game/hourglass
npm run build
npx firebase deploy --only hosting:hourglass
```

- [ ] **Step 10: Final commit + push**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git status   # should be clean if only material tweaks were made; otherwise commit them
git push origin main
```
