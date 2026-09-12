# Rubik's Cube Practice implementation plan

**Goal:** Publish a complete CFOP reading and case-practice tool at rubiks-cube-practice.hillmanchan.com.

**Architecture:** A standalone browser application under `portfolio/public/games/rubiks-cube-practice`, with a small React route wrapper matching this repository's other games. No account or server data is needed. Chapter completion and learned cases are stored locally. A dedicated Cloudflare static-assets Worker serves the custom domain; the same files also ship with the normal portfolio build.

**Design:** A quiet, cool-white study workspace with blue navigation, large readable move tokens, and the cube's six colors reserved for instructional diagrams. A persistent chapter rail and Read / Practice switch share the same C/F/O/P stages. The practice viewport puts the cube, case, and playback controls first. Mobile stacks those panels and keeps stage controls visible.

## Work and verification

- [x] Research complete 41 F2L / 57 OLL / 21 PLL sequences with attribution; write original instructional chapters on notation, Cross, F2L, OLL, PLL, including two-look learning paths.
- [x] Implement and test the facelet engine: legal moves and inverses, physical validity, Cross search, case matching including upper-face adjustments, and preserving earlier CFOP stages.
- [x] Build Read mode with chapter completion, complete searchable algorithm library, case diagrams and links into practice.
- [x] Build Practice mode with stage selection, six-face color entry, case selection, recognition, clear prerequisite errors, scramble/setup, per-move replay, and applying the result to continue to the next stage.
- [x] Register the portfolio route. Verify all dataset cases against the engine, invalid states, rotations, and stage matching; run the main production build.
- [x] Inspect desktop and mobile in the browser; exercise reading, color input, matching, playback, and persistence.
- [x] Deploy only the new static app; verify the requested HTTPS custom domain and document the deployment command and research sources.

## Accuracy boundaries

Cross is calculated from the entered state, not presented as a fixed algorithm set. Algorithms are recommended starting choices, not a universal fastest ranking. F2L uses a selected corner/edge pair and preserves solved slots. OLL recognition ignores last-layer permutation; PLL requires the top face already oriented. Physical validation precedes matching. The displayed cube, setup moves, and solution must use one consistent holding orientation. All research prose is original; move sequences and case names are attributed to source references.

## Delivery evidence

- Published at https://rubiks-cube-practice.hillmanchan.com with Cloudflare Worker `rubiks-cube-practice`.
- Initial deployment version: `1d0fe1f0-2e31-408d-a539-4157d7756b54`.
- 13 engine tests passed, covering all 119 cases, all 95 alternatives, 216 OLL orientations, 288 PLL permutations and 100 complete CFOP solves.
- Portfolio production build passed.
- Desktop and 390px/320px mobile checks passed; final 320px read mode had identical document client/scroll widths (305px, accounting for scrollbar).
- Browser checks passed for invalid color counts, custom top color wording, Cross worker, F2L continuation, move stepping, case alignment, chapter completion, two-look filtering and read/practice mode changes.
- Live HTTPS browser loaded the 57-case OLL library and calculated a 6-move Cross solution without console errors.
- Live JavaScript, CSS and case data returned HTTP 200 and matched local files byte-for-byte; the development test file returned HTTP 404.

## Animated playback and mobile update

Published version `b1660f7c-578f-4514-afda-a48df324022b` adds physical cubie rotations for every supported move and the requested 0.25×, 0.5×, 0.75×, 1×, 1.25×, 1.5× and 2× speeds. The default is 0.5×. Pause/resume retains the current turning angle; Next/Previous animate one move; a readable dwell separates consecutive turns. An optional back view exposes hidden layers without changing the grip. Reduced-motion settings use discrete states.

Performance changes: one canvas, cached sequence states, no page or library rebuilds during playback, no DOM mutations on intermediate frames, capped pixel density, no redraws while paused or between turns, and automatic pausing when hidden/offscreen. Libraries render 12 cases initially, with additional cases available on demand.

Mobile changes: controls beside/below the cube, 44px playback buttons, larger painted stickers, sticky color selection, 16px input text, bounded algorithm lists, and landscape layout only where the panel has enough room. Color editing now replaces the cube array so empty solutions cannot display stale cached states.

Validation: all 47 engine, renderer, playback and app integration tests passed; portfolio production build passed. Browser checks covered 320px, 375px, 390px and 430px portrait widths, 720×400 and 844×390 phone landscape, and 1024×500 desktop. No horizontal page or player overflow was found. A paused intermediate face turn was inspected visually, and live playback loaded without console errors. The five changed/new public assets match the tested files byte-for-byte; all three new development test files return HTTP 404.

## English and Hong Kong Traditional Chinese

Add an English / 繁體中文 language selector, default from the browser and remember explicit selection. Use Hong Kong written Chinese for all five CFOP chapters, navigation, practice controls, case groups, cube labels, move explanations, validation and playback status. Preserve standard move notation, case IDs, research links, the selected case, cube input, playback position, speed and learning progress. Use small local dictionaries and chapter modules without a framework or per-frame translation work. Verify both languages, persistence, interpolation, no missing chapter sections, language switching during playback and mobile layout before publishing the update to the existing custom domain.

Delivered in deployment `15473432-3469-4ab2-8c79-95ea6dcdcbc1`. All 62 tests passed, including 12 locale tests and three additional full-app language regressions. The portfolio production build passed. Chinese reading/practice layouts were checked at 320px, 390px, 768px and 1024px widths and 844×390 landscape, with no page, header or player overflow. Language survives reload; live Chinese OLL reading mode loaded all four sections without console errors. All seven changed/new hosted assets match tested source bytes, and `i18n.test.mjs` returns HTTP 404.

## Photos and top-layer input

Delivered in deployment `7a6da8be-9be5-457f-a356-5bc326f5aa1d`. Add camera still photos plus an existing photo/screenshot picker, a four-corner perspective guide, fixed-cost local color sampling, manual review/correction, rotation, progress and face retakes. OLL/PLL need five faces (top and four side top rows), omit the bottom and darken the lower two rows. Full Cross/F2L input remains available. Keep center references and physical legality checks; explain that lower layers must already be solved. Lazy-load photo controls, bound image dimensions, release image/canvas resources on close, and avoid continuous camera/rendering work.

Validation: 87 tests passed and the portfolio production build passed. Added tests cover photo sampling, brightness/ambiguity, every catalog last-layer reconstruction, native capture/gallery wiring, real dialog review/correction, cancellation and stale callbacks, image bounds, locales, and app input/reading transitions. Five synthetic face photos were loaded in the actual browser guide from a solved reset; progress reached 5/5 and the resulting cube correctly matched OLL 27 (Sune). Chinese review/capture and editor layouts passed at 390px/320px portrait and 844×390 landscape, with no horizontal overflow. English capture controls and the live Chinese capture dialog loaded without console errors. All 12 changed/new hosted assets match tested source bytes; the three new test files return HTTP 404. Physical phone cameras and uncontrolled real-world lighting were not available for hardware testing; users can review and correct every sampled color.
