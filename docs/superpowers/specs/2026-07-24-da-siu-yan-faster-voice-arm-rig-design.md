# 打小人 — faster granny voice + two-bone arm rig

**Date:** 2026-07-24
**Scope:** `portfolio/public/games/da-siu-yan/` (100% client-side) + `scripts/`

Two independent changes to the shipped game:

1. The Gemini granny voice reads at 2× the current speed.
2. The 插畫版 (illustrated) granny's striking arm gets a real elbow, so the
   swing reads as a human slap rather than a windmill on a stick.

---

## 1. Voice: 2× speed

### Problem

The clips are good quality but slow. `std` lines run 3.6–5.9s, `low` lines
6–10s. The ritual is 60s, so `chant-sequencer.js` can only fit a handful of
lines and the pacing drags.

### Approach

Time-stretch the existing mp3s offline with ffmpeg `atempo=2.0` — pitch and
timbre preserved, no chipmunk. Rejected alternatives:

| Option | Why not |
|---|---|
| `AudioBufferSourceNode.playbackRate = 2` at runtime | Shifts pitch up an octave. Destroys the granny voice. |
| Re-prompt Gemini to "speak faster" | Needs `GEMINI_API_KEY`, 56 API calls, and the model does not honour speed reliably. |

Measured on real clips: `std/line-01` 5.42s → 2.69s, `low/line-06` 6.02s →
2.99s. Single `atempo` pass (valid range 0.5–2.0 per pass, so 2.0 needs no
chaining).

### Re-tunability

The speed-up is destructive to the shipped mp3s, so a new script derives them
from the **pristine originals in git** rather than from whatever is on disk:

```
scripts/respeed-granny-voice.mjs [--tempo 2] [--from <git-ref>]
```

Default `--from` is the commit that introduced the originals. Every run starts
from the same source, so `--tempo 1.6` later produces 1.6× of the original, not
1.6× of an already-2× file. Idempotent, no API key, no network.

`scripts/generate-granny-voice.mjs` gains the same `TEMPO` constant applied at
its ffmpeg encode step, so a full regeneration from Gemini yields identical
pacing.

Both scripts rewrite `voice/manifest.json` durations, which is what
`buildRitualSchedule` budgets against — halved durations mean roughly twice as
many chant lines fit the 60s ritual. That is the intended effect.

### Padding

`generate-granny-voice.mjs` pads each clip with `PAD_S = 0.4s` of silence at
head and tail. Speeding up halves that to 0.2s. Acceptable: the sequencer
already inserts `LINE_GAP = 0.9s` between lines.

---

## 2. Arm: two-bone rig

### Problem

`scene-illustrated.js` draws `art/granny-arm.svg` as one rigid sprite rotated
about the shoulder. Six specific defects, all visible in a frame-by-frame
render:

1. **No elbow.** Shoulder rotation only — a windmill.
2. **Idle pose is the top of the swing.** `ARM_IDLE = 0` holds the slipper
   straight overhead permanently, with a small sine waggle.
3. **Mechanical envelope.** `swingPhase` is `u²` down over `SWING_DOWN_S =
   0.09` then `(1-b)²` back over `SWING_BACK_S = 0.26`. No anticipation, no
   impact hold, no overshoot, no settle.
4. **Body barely participates.** 3px bob, 0.05 rad hip lean.
5. **Every strike is pixel-identical.** No variation reads as robotic.
6. **Audio leads video by 90ms.** `audio.smack()` fires on `pointerdown`
   (`game.js:138`); the slipper contacts at `+SWING_DOWN_S`.

### Art split

`art/granny-arm.svg` splits into two files by **moving existing paths
verbatim** — no redrawing:

| File | Contents | Anchors (source viewBox coords) |
|---|---|---|
| `granny-arm-upper.svg` | sleeve, rolled cuff band, shoulder cap | shoulder (300,360), elbow (243,232) |
| `granny-arm-fore.svg` | slipper, forearm, hand | elbow (243,232) |

Bone lengths follow from the anchors: upper 140px, forearm 224px, total reach
364px from the shoulder.

Draw order is **forearm first, then upper arm on top**, matching the original
file's z-order (sleeve and cuff are painted after the forearm). The existing
rolled cuff band therefore covers the forearm's proximal end and hides the
elbow seam — the same trick the shoulder cap already plays at the shoulder. No
new art is needed to conceal the joint.

Composing the two pieces at `elbowAngle = 0` must reproduce today's artwork
exactly; that is the acceptance check for the split.

### Rig

Pure functions, exported for `node --test`:

- `swingPose(since, seed)` → `{ shoulder, elbow, lean, contact }`
- `slipperPoint(shoulder, elbow)` → forward kinematics, stage coords

Phases (seconds from `pointerdown`):

| t | Phase | Shoulder | Elbow |
|---|---|---|---|
| 0 → 0.04 | anticipation | cocks back | flexes tighter |
| 0.04 → 0.11 | drive | accelerates down | whips open, **lagging** the shoulder |
| 0.11 | **contact** | at strike angle | extended |
| 0.11 → 0.14 | impact hold | ~still | ~still |
| 0.14 → 0.40 | recoil + settle | overshoots, damped | leads the shoulder back |

The elbow lagging on the way down and leading on the way back is what produces
the whip. Time-to-contact stays ~0.11s so the tap still feels responsive.

### Idle

`ARM_IDLE` moves from 0 (slipper straight overhead) to a lowered, relaxed
cocked pose with the elbow bent. Idle animation keeps two incommensurate sine
frequencies on both joints plus the breathing bob, so the pose never freezes.

### Per-strike variation

Each strike draws a small seeded jitter on strike angle, timing and lean, so no
two slaps are identical. Deterministic given the seed, therefore testable.

### Aim

The strike angle takes a modest bias from the tap's Y position, clamped to the
reachable arc. Measured: max reach 364px from the shoulder at (640,640) means
only the paper's right band (x≈285, y≈560–720) is physically reachable, so this
is variation rather than true aiming. Taps outside the arc clamp toward it.

### Mash-tapping

A strike arriving mid-swing blends from the current pose instead of hard-cutting
`strikeAt`. Prevents the jitter that anticipation would otherwise introduce when
the player mashes.

### Audio/visual sync

`audio.smack(delayS)` gains an optional delay so the slap lands at contact
rather than at `pointerdown`. `drawImpact` already offsets by `SWING_DOWN_S`
and follows the new contact time. Dust and haptics still fire instantly on tap,
so input still feels immediate.

### Contract protection

The memory note warns that the strike landing point (~stage (285,700)) is a hard
contract — moving the anchors breaks where the slipper lands. The rig therefore
ships with an FK test asserting `slipperPoint(...)` at the contact frame lands
inside `IPAPER`. Any future anchor edit fails the test instead of silently
breaking the game.

---

## Service worker

`sw.js` `CACHE` bumps `v3` → `v4` (voice mp3 contents change even though the
filenames do not). `ASSETS` gains `./art/granny-arm-upper.svg` and
`./art/granny-arm-fore.svg`. `art/granny-arm.svg` is removed from `ASSETS` once
nothing references it.

`portfolio/public/games/pwa.test.mjs` parses `CACHE`/`ASSETS` as strict JSON —
both stay double-quoted.

---

## Testing

| Layer | How |
|---|---|
| Rig maths | `node --test scene-illustrated.test.js` — envelope monotonicity, contact timing, FK landing point inside the paper, jitter determinism |
| Voice durations | `ffprobe` every clip after respeed, assert ≈ original/2 and manifest matches disk |
| PWA manifest | `node --test portfolio/public/games/pwa.test.mjs` |
| Visual | Headless-Chrome contact sheet of the swing, before/after; then a real browser pass in both 插畫版 and 經典版 |

## Out of scope

- 經典版 (`scene.js`) is untouched.
- Chant text, ritual length, recording, damage model unchanged.
- The granny body art is unchanged.
