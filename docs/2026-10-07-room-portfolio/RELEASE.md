# Interactive room release — 7 October 2026

The standard portfolio stays at `/`. Its homepage and navigation link to `/room`, where visitors can enter the interactive room and return through “Back to portfolio”. `/portfolio` remains a standard-portfolio alias. The room begins at standing height; “Back to room” appears only after focusing an object or opening a computer.

The release includes readable MacBook Experience and Dell Projects screens, the sliding webcam shutter, room guide, furniture interactions, drawer game discoveries, and an optional official YouTube music player. Existing game routes and independent deployments remain intact. Career and JARVIS project content preserve the latest upstream update (`ad6d7b2`). The character routine stays disabled.

## Source and build

- `portfolio/src/room/` contains the React room shell, accessible content, computer screens and validated iframe bridge.
- `room-reference/viewer/` contains the scene source, original model and licensed vendored Three.js modules.
- `scripts/prepare-room.mjs` builds the public viewer and reduces model delivery from 28,131,688 to 14,907,988 bytes by replacing hidden geometry. Tests verify that visible geometry and embedded texture pixels are preserved.
- Generated `portfolio/public/room-viewer/` and `portfolio/build/` are ignored. No additional npm packages are required.
- The public website has no CV link or PDF copy. An older PDF already exists in upstream repository history; this release does not rewrite that history.

Install/build from the repository root:

```sh
cd portfolio
npm ci
npm run build
npm test -- --watchAll=false --runInBand
cd ..
node --test room-reference/viewer/*.test.mjs scripts/prepare-room.test.mjs scripts/generate-portfolio-sitemap.test.mjs scripts/tests/*.test.mjs
python3 scripts/serve-room-portfolio.py --port 4175
```

Browser acceptance helpers are `scripts/verify-room-screens.cjs`, `scripts/verify-room-webcam.cjs`, `scripts/verify-room-interior.cjs` and `scripts/verify-room-music.cjs`. They require a separately installed Playwright package (`ROOM_PLAYWRIGHT_PATH`) and Chrome. Set `ROOM_URL` to the local preview. Outputs go to `output/` and this documentation folder. Run them after the production build has finished.

## Deployment

The existing `Deploy Portfolio to S3` GitHub workflow publishes pushes to `main`. The verified target is bucket `hillmanportfolio1` in `eu-west-2`, behind CloudFront `E2SYHEFLV89R32` for `hillmanchan.com`. Existing SPA routing handles `/room` and other React routes; DNS and origin configuration are unchanged.

The workflow preserves shared bucket assets, explicitly sets JavaScript MIME types for native `.mjs` modules, revalidates mutable room files, uploads the portfolio shell last, then invalidates CloudFront and waits for completion. Hashed CRA assets retain immutable caching. A workflow-dispatch run alone remains build-only.

## Release verification

- Fresh npm install and optimized production build succeeded.
- All 19 React suites / 215 tests passed.
- All 99 room, model preparation, sitemap, gym and service-worker tests passed.
- Production browser acceptance passed at 1440×900, 320×740, 390×844 and 768×1024 with Playwright 1.62.1 / Chrome: homepage round trip, both physical computer screens, enlarged content, orientation changes, conditional return controls, guide callbacks, aligned project cards and drawer discoveries. See `immersive-browser.json`.
- Webcam acceptance passed on desktop and phone: physical toggle, vertically sliding leaves, computer-screen hotspot and camera/scroll preservation. See `webcam-browser.json`.
- Upload dry runs contain no deletions; runtime uploads include all 26 JS/MJS modules.
- Separate source/content and deployment reviews found no release blockers. The existing external System Design site and its main JS/CSS assets return HTTP 200.

Phone and tablet browser checks emulate viewport and touch input, not physical devices. Official YouTube playback availability can vary; its direct YouTube fallback remains available. No audible playback claim is made by the browser lifecycle checks.
