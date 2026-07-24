# 打小人 — Illustrated Granny Scene

**Date:** 2026-07-23
**Status:** Approved (user: "do it")
**Branch:** feat/da-siu-yan

## Goal

The current scene renderer draws everything procedurally (flat shapes,
gradients). The user wants the game to look like their hand-illustrated
references: a warm daylight scene where a visible granny character sits by a
brick stack, slipper raised, and physically swings it at the 小人 paper when
the player taps. Name/photo personalisation, one-minute auto-recorded ritual,
and native share must keep working unchanged.

## Approach (chosen)

**SVG-sprite layers composited onto the existing 720×1280 canvas.**

- All rendering stays on the one `<canvas>` so `canvas.captureStream()`
  recording and the share pipeline are untouched.
- Illustration-quality art (bold ink outlines, flat warm colours, simple
  shading) is authored as SVG files loaded as `Image` objects and drawn with
  `drawImage`. The granny's striking arm is a separate SVG layer rotated
  around a documented shoulder pivot.
- The illustrated scene is a **second renderer** (`scene-illustrated.js`)
  with the same `draw(state)` interface as `scene.js`. The entry screen gets
  a 畫風 toggle (插畫 default / 經典), so both looks stay comparable.

Alternatives rejected:

- *Upgrade the procedural renderer* — cannot reach the hand-drawn look;
  enormous drawing code.
- *DOM/CSS layers with animation* — breaks single-canvas recording.
- *Use the Canva reference images directly* — watermarked stock; not
  licensed. All art is authored in-repo as original SVG.

## Scene layout (stage coords, 720×1280)

| Layer (back→front) | Placement |
|---|---|
| Warm cream backdrop `#f2e3c8` + soft vignette + floor line | full stage |
| Incense smoke wisps (subtle, code-drawn) | top-left |
| Brick stack (3 textured bricks, SVG) | lower-left, ~(30..470, 850..1210) |
| 小人 paper — tilted ≈ −10°, ~300×460, centred ≈ (250, 800) | leaning on bricks |
| Paper contents: effigy silhouette or user photo (ellipse-clipped), vertical name in 楷體, damage creases/tears, slipper prints, burn overlay | clipped/rotated with paper |
| Granny body (seated on wooden stool, no right arm, SVG) | right side, ~(360..710, 430..1170) |
| Granny arm + red slipper (SVG), rotates at shoulder pivot | pivot ≈ (505, 640) |
| Impact star + dust particles at hit point | tap position |
| Tap target ring (replaces the follow-finger slipper cursor) | pointer position |
| HUD: hit count, ritual countdown, combo flash | unchanged from classic |

## Animation model

Pure function `armAngle(sinceStrike)` (exported for tests):

- Idle: raised at −0.55 rad with a slow ±0.04 rad breathing waggle.
- Strike: 0→90 ms swing down to +1.05 rad (ease-in, accelerating),
  90→350 ms return to raised with ease-out overshoot.
- Body gets a small forward lean driven by the same envelope.

Hit detection: taps are mapped into paper-local space by inverse-rotating
about the paper centre (`paperLocal(p)`, pure, tested), so the tilted paper's
hit area matches its pixels. A hit triggers `scene.strike(nowS)` plus the
existing damage-model/audio/haptics path.

## Files

| File | Change |
|---|---|
| `public/games/da-siu-yan/art/granny-body.svg` | new — seated granny + stool |
| `public/games/da-siu-yan/art/granny-arm.svg` | new — arm + slipper, pivot documented in file comment |
| `public/games/da-siu-yan/art/bricks.svg` | new — brick stack |
| `public/games/da-siu-yan/scene-illustrated.js` | new renderer + pure helpers |
| `public/games/da-siu-yan/scene-illustrated.test.js` | new — node --test for armAngle / paperLocal |
| `public/games/da-siu-yan/game.js` | style toggle, scene routing, strike wiring |
| `public/games/da-siu-yan/styles.css` | toggle styling reuse; cursor handling |
| `public/games/da-siu-yan/sw.js` | CACHE → v3, add new assets |

## Error handling

- SVG assets load via `Promise.all`; until loaded the scene draws the
  backdrop + paper only (no broken sprites). A failed load logs a warning and
  the entry stays usable — the 經典 renderer is always available.
- Everything else (recording unsupported, offline voice fetch) already
  handled by the existing orchestrator.

## Testing

- `node --test` on new pure helpers (swing envelope monotonicity/return,
  paper-local mapping round-trip) plus all existing da-siu-yan tests and the
  shared `pwa.test.mjs`.
- Manual/browser: full ritual run in Chrome — granny swing on tap, prints on
  tilted paper, burn phase, recording playback, share buttons — verified with
  screenshots/GIF before showing the user.
