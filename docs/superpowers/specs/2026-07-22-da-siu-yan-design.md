# 打小人 (Da Siu Yan) — Design Spec

**Date:** 2026-07-22
**Status:** Approved for planning
**Target:** `da-siu-yan.hillmanchan.com` + `hillmanchan.com/games/da-siu-yan/`

## 1. Summary

A standalone, 100% client-side web game recreating the Hong Kong 打小人
(villain-hitting) folk ritual. The player writes a villain's name and/or
uploads a photo, then spanks a paper effigy on the ground with a slipper while
a pre-generated "granny" voice chants traditional-style curses. A one-minute
ritual mode records itself into a shareable 9:16 video; nothing is ever
uploaded or stored server-side.

- Vanilla JS + Canvas, zero backend, zero runtime API calls, zero monthly cost.
- Lives at `portfolio/public/games/da-siu-yan/` (same pattern as card-drawer).
- Offline PWA following the existing games' service-worker conventions.
- All art is SVG/canvas-drawn — no emoji (house rule).
- UI language: Traditional Chinese (Cantonese), targeting HK audience.

## 2. Game flow

```
Entry screen
  ├─ villain name input (optional)
  ├─ photo upload (optional; client-side only, downscaled to ≤1024px)
  ├─ voice toggle: 標準阿婆 | 低沉版
  ├─ privacy note: 「名同相只喺你部機處理,唔會上載去任何地方」
  ├─ fun-only disclaimer: 娛樂用途,旨在祈福減壓
  └─ mode select:
       ├─ 開壇 — 60-second ritual, auto-recorded
       └─ 任摑 — endless free-spank warm-up, NOT recorded
Gameplay (either mode)
  └─ slipper follows pointer; tap/click = spank
Ritual mode end (60s)
  └─ paper-burning finale animation → hit-count summary
     → video preview → [儲存] [分享] [唔要喇]
Freeform mode
  └─ stop button → hit-count summary → back to menu
```

If neither name nor photo is given, the paper shows the traditional villain
silhouette only. Name is rendered on the yellow paper in a kaiti brush-style
system font stack (`"Kaiti TC", 楷體, DFKai-SB, BiauKai, serif` — no webfont
download; arbitrary user input makes subsetting impossible and full TC brush
fonts are multi-MB). Photo is drawn clipped into the effigy's head/torso area.

## 3. Granny voice — one-time asset pipeline

**Decision trail:** ElevenLabs free tier cannot produce Cantonese (v3 reads
the characters as Mandarin; HK community voices are paid-only). Gemini 3.1
Flash TTS (`gemini-3.1-flash-tts-preview`) with the **Gacrux** prebuilt voice,
prompted to perform as an angry Canal Road granny, produced genuine Cantonese
with the right energy — verified by ear on 2026-07-22.

- Generation script `scripts/generate-granny-voice.mjs` (repo, dev-time only):
  reads `GEMINI_API_KEY` from env, generates **one mp3 per chant line**,
  writes to `portfolio/public/games/da-siu-yan/assets/voice/`.
  Output PCM 24kHz → encode mp3 (or keep wav→mp3 via afconvert/ffmpeg).
- **Two voice variants per line** (user feedback 2026-07-22): 標準阿婆
  (Gacrux, the approved take) and 低沉版 (same voice prompted lower-pitched
  and hoarser). Entry screen has a voice toggle; both variant sets ship as
  assets (`assets/voice/std/`, `assets/voice/low/`).
- **Clip padding** (user feedback 2026-07-22): post-process every clip —
  trim raw silence, then pad ~0.4s of silence at head and tail so lines
  never feel butted together; the sequencer adds its own inter-line spacing
  on top.
- Clips are committed to the repo as static assets. Runtime never calls any
  TTS API. One-time generation cost: well under US$1.
- Each line generated with a style prompt (angry, rhythmic, drawn-out 呀
  endings, pauses between phrases). Every clip is auditioned by the user
  before being accepted; rejected lines are re-generated or reworded.
- Gemini API terms permit use of generated audio output; a small "voice:
  AI-generated" credit goes in the about/footer.

### Chant script (updated 2026-07-22, second revision)

The classic 打小人口訣 as circulated in HK internet folklore — user supplied
the full transcript of the well-known version and asked to use it verbatim.
28 lines curated for a public game (a handful of crude/dated lines dropped:
娼妓/絕後/葉利欽 etc.). No 呀 particles — user feedback: they sound off in
the AI voice. Canonical source of truth: `chant-lines.js`.

**Intro:** 今日打小人!等我幫你出啖氣!
**Lines 1–10 (basic body parts):** 頭/手/腳/口/鼻/肚/胸/耳/眼/腦 — e.g.
打你個頭,打你個死人頭!/ 打你隻手,打到你有氣無定抖!
**Lines 11–20 (organs, rhyming):** 腰/胃/頸/腸/牙/肝/脾/肺/腎/喉 — e.g.
打你條腰,打到你發高燒!/ 打你條腸,打到你放屁特別響!
**Lines 21–28 (limbs + modern):** 膝頭哥/排骨/髀/左右臂/腮/皮/背脊骨/支氣管 —
e.g. 打你層皮,打到你唔死就出奇!/ 打你條支氣管,打到你食飯打爛碗!
**Finale:** 打完小人!化走是非!出入平安!貴人扶持!

TTS note: the generation prompt hard-requires Cantonese pronunciation for
every syllable (user reported line-final words like 發燒 slipping into
Mandarin without it).

**Sequencing:** ritual mode plays intro → ~12 lines spaced across ~50s →
finale in the last ~8s. Freeform mode shuffles all 17 lines and loops.
Gaps between lines are deliberate — the slipper smacks provide the rhythm.
A chant-sequencer state machine owns the timeline (pure module, unit-tested).

## 4. Visuals

- **Stage:** fixed 720×1280 (9:16) canvas. Mobile: full-screen fit. Desktop:
  centered column, ambient brick-wall background filling the sides.
  Responsive is presentation-only; stage coordinates and recorded video are
  always 720×1280.
- **Scene:** dim candle-lit brick ground under the flyover; yellow 小人紙
  center-stage with name + photo; incense pot and candles at the edges
  (hand-drawn SVG, warm flicker).
- **Slipper:** follows pointer/touch; tap = smack: slipper presses down,
  smack SFX, shoe print stamped on paper, dust particles,
  `navigator.vibrate(30)` on supporting devices.
- **Progressive damage:** paper advances through ~4 states (fresh → wrinkled
  → torn edges → battered) by cumulative hits; shoe prints accumulate
  (capped, oldest fade).
- **Hit counter + combo:** brush-style「連環摑!」flourishes on fast streaks.
- **Burn finale (ritual only):** paper chars, curls, flame + ash particles.

## 5. Audio graph

All sound flows through one Web Audio graph (required for recording):

```
voice clips (HTMLAudio/buffer) ─┐
smack SFX (3–4 variations)     ─┼─→ master gain ─→ ctx.destination (speakers)
ambient street loop (quiet)    ─┘        └───────→ MediaStreamDestination (recorder)
```

Smack SFX: royalty-free/CC0 or self-recorded slipper slaps. AudioContext is
created/resumed inside the 開壇/任摑 button handler (iOS gesture requirement).

## 6. Recording (ritual mode)

- `canvas.captureStream(30)` + audio `MediaStreamDestination` →
  `MediaRecorder`.
- MimeType picked at runtime via `isTypeSupported`, preference order:
  `video/mp4` (Safari) → `video/webm;codecs=vp9,opus` → `video/webm`.
- ~60s of 720×1280 ≈ 10–20MB in memory — acceptable.
- End screen: `<video>` replay preview → **儲存** (anchor download) →
  **分享** (`navigator.share({files})` where `canShare` passes; otherwise
  the share button is hidden and only download shows) → **唔要喇** discards.
- The video exists only as an in-memory Blob; closing the page loses it.
  Nothing is uploaded anywhere.

## 7. Edge cases

- iOS audio unlock: AudioContext resumed on the mode-select tap.
- Photo handling: EXIF-safe decode via `createImageBitmap` (fallback:
  Image + canvas), downscale to ≤1024px before use.
- `navigator.share` without file support → download-only UI.
- `MediaRecorder` absent (very old browsers) → ritual mode still plays,
  end screen says recording unsupported, offers replay-less summary.
- No name + no photo → traditional silhouette effigy.
- Page backgrounded mid-ritual: `visibilitychange` pauses chant timeline and
  recorder (`MediaRecorder.pause()`), resumes on return.

## 8. Testing

- Pure modules with `node --test`: chant sequencer (timeline scheduling,
  shuffle-loop), damage-state progression, recorder state machine
  (idle→recording→preview→saved/discarded), mimeType selection.
- Manual browser verification on desktop Chrome + iOS Safari (audio unlock,
  share sheet, video plays in WhatsApp).
- PWA: follow existing games' sw.js CACHE-bump convention; keep
  `portfolio/public/games/pwa.test.mjs` guards passing (add this game to its
  scope the same way the other games are covered).

## 9. Deployment

1. Game ships at `portfolio/public/games/da-siu-yan/` via the normal
   portfolio deploy.
2. Subdomain `da-siu-yan.hillmanchan.com`: Cloudflare CNAME **plus**
   CloudFront alias on distribution `E2SYHEFLV89R32` (wildcard cert already
   covers `*.hillmanchan.com`) — per the new-subdomain checklist; follow
   card-drawer's host→path mapping.
3. Portfolio Games section: add a 打小人 card (same shape as card-drawer's,
   PR #65 pattern).

## 10. Out of scope (v1)

- Granny voice calling the villain's name aloud (would require runtime TTS +
  key proxy; name appears written on the paper instead — authentic to the
  real ritual).
- Web Speech API name-shout easter egg (possible v2).
- Leaderboards, accounts, any server-side anything.
