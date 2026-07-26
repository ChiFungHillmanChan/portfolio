# 打小人 — flat altar recomposition + 3-bone arm rig

Date: 2026-07-26
Status: approved (design), pending implementation plan

## 1. Problem

The illustrated scene's swing is broken in three linked ways. All three come
from one root cause, verified by geometry rather than by eye.

**Measured** (`scene-illustrated.js` as of `74d15c1`):

| Pose | Shoulder | Elbow (stage) | Slipper (stage) |
|------|----------|---------------|-----------------|
| Authored (painted) | 0° | (298, 663) | (315, 508) |
| READY | +34° | (375, 624) | (440, 482) |
| STRIKE | −97° | **(310, 883)** | **(219, 757)** |

The sheet (`IPAPER`) occupies x 100→364, y 600→1024. At contact **both** the
elbow and the slipper are inside that rectangle, so the forearm sprite lies
diagonally across the whole sheet from t≈0.05 to t≈0.20 — the entire visible
strike. The player never sees the blow land on the effigy.

**Root cause:** the shoulder pivot is at (400.5, 767.75) but the bones are
146.4 + 155.8 = **302px** long, while the sheet centre is only **174px** away.
The arm is far too long for the distance, so it must fold ~97° to reach — and
it folds *over the sheet*. The same fold forces 131° of total sleeve rotation
(+49° cock → −97° strike), which tears the painted shoulder open: the arm reads
correctly at t=0 and t=0.035 (near its painted pose) and as a detached limb by
t=0.16.

This is a stance-geometry defect, not an easing-curve defect. No amount of
tuning `swingPose()` fixes it.

## 2. Goals

- The forearm must not blanket the sheet during the strike.
- The shoulder and elbow must stay visually connected at every pose.
- The blow must read as a real downward spank, not a rotate-and-return.
- The scene should resemble the actual Causeway Bay ritual: effigy paper laid
  flat on a brick, beaten downward with a shoe.

### Non-goals

- The classic (經典版) vector scene — `scene.js` is untouched.
- Replacing the Canva painting with procedural geometry.
- Any change to ritual/free mode structure, recording, or the chant sequencer.

## 3. Design

### 3.1 The sheet becomes a ground plane

`drawPaper()` currently does `translate(cx,cy) → rotate(rot)`, and everything
inside it — effigy, name, damage creases, slipper prints, burn — is drawn in
paper-local coordinates. Replacing the single rotation with a **2×3 affine
matrix** lays the sheet into the ground plane while leaving all of that local
drawing untouched:

```
M = T(cx, cy) · R(rot) · S(1, tilt)        tilt ≈ 0.5 (vertical foreshortening)
```

Canvas 2D cannot do true perspective (near edge wider than far edge), but at
this size and viewing angle the affine approximation reads correctly as "lying
flat". This is a deliberate trade: it buys us zero changes to the effigy,
name, damage, and print rendering.

- `paperLocal()` becomes an inverse-affine instead of an inverse-rotation.
- `inPaper()` stays a rectangle test in local space.
- `PLANE = { cx, cy, w, h, rot, tilt }` replaces `IPAPER`.

**Verified candidate:** `{cx:245, cy:975, w:340, h:500, rot:-0.12, tilt:0.5}`
→ screen quad (61,871) (399,831) (429,1079) (91,1119).

### 3.2 Altar

A brick slab drawn procedurally with its top face **coplanar with the sheet**,
so the paper visibly rests on it instead of floating. The existing incense
stick and smoke stay, planted beside the slab. `bricks.svg` is retired from the
illustrated scene (it is a front-facing block that cannot sit in the plane).

### 3.3 Three-bone arm rig, five sprites

**Why a wrist joint is required.** Solving IK to the new contact point on the
elbow-up branch gives `SHOULDER = −1.162, ELBOW = −1.968` — a forearm rotated
~180° from its painted pose. That rotation is physically correct (a shoe swung
from overhead to the ground really does rotate ~180°), but the current
`granny-arm-fore.png` fuses forearm + hand + slipper into one sprite, so the
painted slipper would render sole-up.

Splitting at the wrist fixes it: the forearm is a plain tapered bare limb and
is very forgiving under large rotation, while the hand+slipper becomes its own
sprite whose angle is chosen to keep the sole aimed at the sheet.

- `cut-granny-sprites.py` gains `POLY_HAND`; `POLY_FORE` is trimmed to end at
  the wrist. Same polygon-cut + alpha-multiply technique already in the script.
- New anchor `WRIST` in image coords (~(60, 178); to be pinned exactly using
  the script's existing `debug-polys.png` mode).
- Sprites become: body, upper (sleeve), fore, **hand**, head — all still
  sharing the one 525×799 frame.
- Draw order: body → altar → sheet → fore → hand → upper → head.

**Joint discs.** A skin-toned disc at the elbow and a sleeve-toned disc at the
shoulder, drawn between the layers, so any gap opened by rotation fills with
skin/sleeve instead of background. This is what makes the connection
unconditional rather than pose-dependent.

### 3.4 Strike choreography

The strike pose is **solved by IK once at module init** from the contact point,
not hand-tuned — then held as constants. Per-tap aiming keeps the existing
model (a clamped aim bias, `AIM_LIMIT`), because full per-tap IK would need
reachability handling: the sheet's far-left corner measures 104% of arm length
(unreachable) and its near-right corner puts the elbow back over the sheet.

`AIM_LIMIT` must be re-derived so that across its **full** range the elbow
stays clear of the sheet's top edge.

Reference solution at sheet centre (245, 975): reach 259px = 86% extension,
elbow (264, 820) versus a sheet top edge of y=847 → **27px clearance**.
Sleeve travel drops from 131° to ~78°.

### 3.5 Contact feedback

Fast anticipation → ease-in drive → hard stop → recoil → damped settle, plus:

- slipper squash on impact,
- sheet ripple and a small recoil of the plane,
- dust burst at the contact point,
- subtle stage shake,
- body lean and head snap following the blow.

### 3.6 Cantonese clip review tool (separate workstream)

Gemini TTS falls back to Mandarin on some characters (燒 → "shāo" instead of
siu1). Jyutping input is not a fix — the engine would read the letters.

Before changing the voice pipeline we need to know *which* clips are actually
wrong, and that requires listening, which the assistant cannot do. So:

- A dev-only local page listing all 60 clips (2 variants × 30) with a play
  button and 啱音/走音 radios per clip.
- Exports the failing ids, which feed `generate-granny-voice.mjs --only`.

Switching engine (Azure `zh-HK`, Google `yue-HK`) stays on the table but is
deferred until we know the real failure rate.

## 4. Verification

The project memory records that point-clearance checks gave false passes twice
on this rig ("the hand graphic is ~35px wide; point clearance lied twice").
Therefore:

- **Occlusion is verified by sprite alpha, not joint coordinates** — sample the
  rendered forearm/hand pixels against the sheet quad across the whole swing
  and the whole aim range.
- **Filmstrip harness** (`scratchpad/dsy/filmstrip.html`) rerun after each
  change; it renders the real scene at successive swing timestamps into one
  image.
- `scene-illustrated.test.js` (22 tests) is re-derived test-first for the plane
  transform and the 3-bone rig.

## 5. Risks

| Risk | Mitigation |
|------|-----------|
| Re-cutting art was not in the approved scope | Flagged to user; required by the 180° forearm rotation |
| Flat sheet has a smaller screen footprint — effigy and tap target shrink | Widen the sheet in local coords; iterate visually on the filmstrip |
| Burn flames drawn in sheet space would lean with the plane | Draw flames in screen space at transformed positions |
| Affine ≠ true perspective; a large tilt may look sheared | Keep tilt ≥ 0.45 and validate visually |
| 22 existing tests encode the old geometry | Re-derive test-first, not after |
| `sw.js` cache | Bump `CACHE` to v8 — art and JS both change |

## 6. Files touched

- `portfolio/public/games/da-siu-yan/scene-illustrated.js` (main)
- `portfolio/public/games/da-siu-yan/scene-illustrated.test.js`
- `portfolio/public/games/da-siu-yan/art/granny-arm-fore.png` (re-cut) + new
  `granny-hand.png`
- `portfolio/public/games/da-siu-yan/sw.js` (CACHE v8 + new asset)
- `scripts/da-siu-yan/cut-granny-sprites.py`
- `game.js` only if the hit-test import surface changes
- Mirror everything into `portfolio/build/games/da-siu-yan/`

## 7. Open question deferred to implementation

Exact `WRIST` image coordinate — pinned from `debug-polys.png` rather than
guessed.
