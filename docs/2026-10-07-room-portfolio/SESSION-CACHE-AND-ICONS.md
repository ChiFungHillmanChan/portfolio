# Same-visit room reuse and SVG controls

Approved behavior: keep the prepared room while visitors switch between the standard portfolio and `/room` in the same tab. Release it when the document is left or closed. A new visit starts fresh.

## Implementation

- `RoomSession` wraps the main-domain routes. The initial standard homepage mounts no viewer and downloads no room model. The first `/room` visit mounts one iframe; internal links retain the same React component, iframe document, WebGL scene and physical drawer state.
- The retained room is hidden and inert on other routes. The host explicitly pauses rendering and input, removes computer/game overlays, and stops the music player. Returning shows the prepared scene immediately; music requires another deliberate Play click.
- `pagehide` synchronously removes the iframe. Viewer cleanup cancels preparation frames and pending model requests and disposes geometry, textures, materials, controls and renderer resources. A `pageshow` restored from the browser's back-forward cache creates a fresh room only if `/room` is active. A restored standard page does not preload it.
- Hidden zero-size resize notifications no longer change camera framing. Context loss becomes a latched error with Retry, and asynchronous preparation cannot announce readiness after disposal or context loss.
- Room control arrows use decorative inline SVG with `currentColor`, fixed geometry and accessible text labels. This avoids iOS emoji presentation. The monitor's close cross remains unchanged.

## Cache policy

The prepared scene lives only in the current document's memory. No room model or viewer file is added to Cache Storage, IndexedDB or localStorage. The existing shell service worker already excludes `/room-viewer/`; its normal portfolio/game behavior remains unchanged.

`roomAssetRevision.json` selects `/room-viewer/v2/`. Preparation emits the complete relative-import tree and model at this path, while keeping the legacy viewer path available. **Bump this revision for future viewer releases** to avoid stale intermediary caches. Deployment sends `Cache-Control: no-store` for all viewer assets, including nested JS/MJS and GLB files. Hashed CRA bundles keep their existing immutable HTTP caching.

`pagehide` is compatible with back-forward caching, but browsers do not guarantee a final event when a mobile process is killed. In that case browser/process teardown releases the document; there is no persistent room data cache to clear. This does not promise to erase unrelated browser caches or browser-managed historical entries.

Lifecycle references: [React state preservation](https://react.dev/learn/preserving-and-resetting-state), [MDN pagehide](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event), [MDN pageshow](https://developer.mozilla.org/en-US/docs/Web/API/Window/pageshow_event).

## Verification

- All 21 React suites / 222 tests pass, including first-visit laziness, identical iframe on internal navigation, departure/restoration, hidden load timeout handling and SVG accessibility.
- All 111 Node tests pass, including 54 viewer tests, cancellation during preparation, hidden resizing, context loss and a self-contained versioned delivery tree.
- Optimized production build compiled successfully.
- Session checks passed at 1440×900 and 390×844: zero initial viewer requests, one GLB across internal links/history, same iframe/window and open drawer, no requests on reentry, no hidden render frames (55→55 desktop; 53→53 phone), and music player removed with no automatic restart.
- Both browser runs observed real back-forward restoration (`persisted: true`), removed the old iframe before departure, showed a fresh loading screen/model request on return and reset the drawer. A fresh browser context mounted no room on its standard homepage.
- The full room-screen regression passed at 1440×900, 320×740, 390×844 and 768×1024 with no page errors. Phone welcome and computer controls were visually checked for SVG arrows. Browser results are recorded in `session-browser.json` and `immersive-browser.json`. Chrome viewport/touch emulation is not physical iPhone testing; music checks stub the official player response and do not claim audible playback.
- Independent source and deployment review found no actionable issues. The upload dry run covered all 64 room asset paths exactly once, with `no-store` on every group.

Run the session browser check after building and starting the preview:

```sh
ROOM_URL=http://127.0.0.1:4176 ROOM_PLAYWRIGHT_PATH=/path/to/playwright node scripts/verify-room-session.cjs
```

It checks network requests, iframe/window identity, physical state, paused frame counts, explicit music playback, internal history and full-document departure. Screenshots are written to ignored `output/playwright/`.
