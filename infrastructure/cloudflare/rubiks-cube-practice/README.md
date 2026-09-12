# Rubik's Cube Practice hosting

Standalone static-assets Worker for `rubiks-cube-practice.hillmanchan.com`. Source lives at `portfolio/public/games/rubiks-cube-practice/`; the portfolio also has a `/rubiks-cube-practice` route to the same app.

The deployment is independent of the main S3/CloudFront portfolio. `workers_dev` and preview URLs are disabled; the public endpoint is the requested custom domain. There is no database or account system. Progress stays in localStorage on each device.

## Verify

From repository root:

```sh
node --test portfolio/public/games/rubiks-cube-practice/*.test.mjs
cd portfolio
npm run build
```

## Deploy

With the authorized Cloudflare account authenticated in Wrangler, from repository root:

```sh
WRANGLER_LOG_PATH=/tmp/rubiks-wrangler.log wrangler deploy --config infrastructure/cloudflare/rubiks-cube-practice/wrangler.jsonc
```

Wrangler creates the custom-domain routing, DNS and TLS association. The `.assetsignore` file excludes tests. Source maps, credentials and build outputs are not required. Assets use real 404 behavior for missing paths because the app has no URL-based client routes.

## Verification scope

Engine tests cover the 119 primary algorithms, 95 variations, legality and impossible cube states, shortest Cross solutions on known small cases, all 216 OLL orientations and 288 PLL permutations, and 100 complete deterministic CFOP solves with center normalization after each stage. Browser checks exercise color entry, validation, recognition, move playback, carrying state into the next stage, chapter completion, case filtering, and desktop/mobile layouts.

Research sources and MIT attribution are in the app's `ATTRIBUTION.md`.

## Animated playback

The lightweight canvas renderer rotates actual cubie geometry for face, wide, slice and whole-cube moves. The playback controller caches move states once per sequence and draws only the active turn. At 1×, quarter turns take 1 second, half turns 1.4 seconds, with a 450 ms pause between moves. All timing scales with the seven available speeds; the default is 0.5× and the choice is saved locally. Pause preserves the current angle, and Next/Previous animate a single turn.

Playback does not rebuild the page or library. Rendering stops while paused, hidden or outside the preview; pixel density is capped at 2×. Case lists start with 12 items and offer more on demand. Mobile layouts keep the cube and controls together, enlarge sticker targets, and support a sticky color palette. Reduced-motion preferences preserve readable steps without intermediate turn frames.

Renderer tests compare every supported move and every catalog sequence against the cube engine. Playback tests use a controlled clock to cover all seven speeds, pauses, reverse turns, sequence changes and reduced motion. App integration tests require the existing `portfolio/node_modules` dependencies (`cd portfolio && npm ci`).

## Languages

English and Hong Kong Traditional Chinese written language are available from the header selector. `i18n.js` handles locale selection, interpolation, shared diagram terminology and validation errors; `ui-translations.js` contains interface messages; `chapters-zh-HK.js` mirrors every English chapter. The page uses `zh-Hant-HK` for Chinese content. Standard cube notation and case IDs remain unchanged.

The first visit follows the browser’s primary language (Chinese/Cantonese selects Chinese, otherwise English). Explicit selection is saved separately in `rubiks-practice-language`, preserving existing practice progress. Changing language pauses an active animation at its current angle and preserves the cube, case, speed and learned cases. No translation work is performed on intermediate animation frames.

Locale tests cover detection and persistence, unavailable browser storage, metadata, every chapter and case group, notation/placeholder parity and all engine errors. Integration tests cover switching during playback, Chinese case search, saved language restoration and retaining painted colors across language changes.

## Photo input and last-layer practice

Color entry offers still photos from the phone camera and an existing photo/screenshot picker. Camera selection uses the standard [`capture="environment"` hint](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture); the exact picker depends on the device/browser. The gallery option remains available. No live camera stream, uploads, external recognition service or image persistence is used.

For OLL/PLL, enter the top face and the top row of each side: five photos, with no bottom photo. The lower two layers must already be solved; the editor reconstructs those omitted stickers, darkens the lower rows and retains the normal physical legality checks. Side centers are dimmed color references. Cross/F2L retain full six-face entry. Reading chapters does not alter an entered cube.

The photo dialog loads on demand, scales images to a maximum 1200px dimension, and samples a fixed number of pixels per sticker. Users align four corners of one face, rotate the photo if necessary, inspect the detected colors and correct any errors before applying them. Confidence warnings and center-color checks help avoid bad calibration. The five/six-face guide records confirmed faces and supports individual retakes. Cancellation releases object URLs and canvas buffers; no idle rendering runs.

Tests cover perspective sampling, brightness changes, color ambiguity, ignored-layer reconstruction for all last-layer algorithms, partial-input recognition, photo review/correction, locale consistency, input cancellation and cleanup. Browser verification uses synthetic cube photos and responsive viewports; physical phone-camera quality and lighting remain device-dependent.

## Workspace navigation and timer

Practice, Algorithms, Read and Timer are separate views. The algorithm catalog is only mounted in Algorithms; reading chapters have shortcuts above the text, and selecting a catalog case opens its practice view directly. Browsing other chapters or algorithm groups preserves the current practice cube and move position. Explicitly choosing a new practice stage or case still changes the exercise.

On mobile, the menu button opens the existing sidebar as a drawer with all views, all chapters and progress. It traps focus, supports Escape/backdrop dismissal and restores page scrolling/focus on close. Chapter completion and learned cases continue to use `rubiks-practice-v1` in localStorage; the menu reads that same state.

The timer uses two touch pads, or A and L keys on desktop. Hold both for 550ms until green; releasing a hand starts the monotonic clock. Touch both again to stop. Both hands must be released before a fresh hold can reset/arm the next attempt, preventing a stop from immediately erasing its result. Timing continues across view/language changes, but held contacts are canceled when focus is lost, the page becomes hidden, a view unmounts, or a modal makes the timer inactive. It stores no history and persists no times. Visible running digits update at 25Hz; there is no idle or hidden display loop. Landscape places the readout between the pads so all three fit on screen.

Focused tests cover timer state transitions, actual DOM pointer/keyboard handlers, cancellation and cleanup, modal input guards, drawer accessibility/lifecycle, independent views, and saved-progress restoration in a fresh page. Multi-touch input is covered with synthetic DOM events; physical touchscreen hardware was not available for testing.

The timer uses a dedicated viewport-filling screen with a top-left Back to practice button, two blue hand pads and a central LCD-style readout based on the supplied physical-timer reference. Workspace navigation and the footer are not mounted in this view. Portrait phones show a landscape-rotation reminder, in the selected language; it disappears when the phone rotates. Safe-area padding keeps the exit and controls clear of display cutouts. Back restores the previous practice state. This fills the website viewport without requesting browser fullscreen or orientation-lock APIs.
