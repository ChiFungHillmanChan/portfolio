# HillmanChan Gym

## Design and scope

Build the supplied Cantonese training guide into a standalone, mobile-first training journal at gym.hillmanchan.com. Keep English exercise and equipment names for UK gyms. Preserve all source exercises and useful trainer phrases; correct contradictory schedules and overly absolute form instructions using attributable sources.

The visual direction is a training notebook: chalk #f5f5ef, white #ffffff, ink #20271f, olive #57623b, lime #d9f277, and grey #6c7468. System Cantonese typography remains legible offline; condensed English display type gives headings a gym identity. Left-aligned content, a large training-day heading, quiet ruled sections, and a compact calendar avoid a generic dashboard appearance.

## Architecture

Static ES modules in portfolio/public/gym, automatically included in the existing CRA build. No account or API required. Date-keyed localStorage records keep workout choice, sets, kg/reps, completion, body weight, and notes. A versioned JSON export/import supports backup. A service worker precaches the complete app and locally hosted demonstration media. Cloudflare routes the new hostname to the existing AWS S3 gym prefix, without changing existing application routes.

## Implementation sequence

- [x] Extract and correct exercise/programme content; obtain licensed moving demos with attribution.
- [x] Test and implement date-safe storage, validation, calendar calculation, backup and recovery.
- [x] Implement today, calendar, exercise library and UK phrasebook views; responsive layout, per-set logging, notes and programme selection.
- [x] Add offline caching with truthful download/readiness feedback, install metadata and icons.
- [x] Run storage/deployment tests, production build, desktop/mobile browser flows and offline reload/media checks.
- [x] Upload only the gym prefix to AWS, deploy a dedicated Cloudflare hostname, and verify the live app.

## Verification requirements

Records survive reload and remain separate per calendar date. Month navigation handles leap years and local time. Invalid imports do not change stored data. Storage failures are visible. All demonstrations are locally packaged and attributable; no two-frame still-image morph is described as an accurate motion reference. Offline readiness appears only after all assets finish caching. New app does not introduce runtime external dependencies or affect existing apps.

## Decisions

The user's request authorizes implementation and deployment; proceed with concrete defaults. Keep source under the existing frontend public directory so future normal portfolio builds retain the app. Default to three nonconsecutive full-body days; optional split plans remain available. Local records are specific to each browser/origin, not automatically synced.

## Verification, 19 September 2026

- 36 Node tests passed: data/media completeness, programme references, storage/import recovery, calendar dates, service-worker caching/ranges and Cloudflare routing.
- All 29 animated GIFs decode (21–70 frames). Every exercise has a moving demo and still poster. There are 23 filmed demos, one sourced continuous animation and five clearly labelled original movement schematics.
- Browser confirmed 29 moving previews and zero placeholder tiles; global pause stops playback.
- Browser confirmed set kg/reps/completion and notes survive reload and stay separate across dates; previous completed sets appear as reference.
- Backup UI imported a new date and preserved an existing date without overwriting its notes.
- With the isolated preview server stopped, the app reopened, a cached bench-press MP4 played, and notes could be edited and read after another reload.
- Mobile layout checked at 390 px with no horizontal overflow. Manifest and local icons support installation.
- Normal CRA production build passes. Existing Browserslist database-age warning is unrelated to this app.
- Live deployment verified at https://gym.hillmanchan.com/: valid DNS/TLS, exact published app files, video byte ranges and genuine 404s. All 96 AWS objects match the local release. Cloudflare Worker version: `21b59626-512e-4011-8089-cd5d19efbd33`.
