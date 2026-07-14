# 3D Lobby Sound Logic + Generative Music

**Date:** 2026-07-14
**Scope:** `portfolio/src/game/casino-game/calculator/lobby-3d/` (synced to public mirror)

## Problem

1. The card blip fires inside `dealCardTo` (`src/engine/cards.js`) for EVERY
   card animation. The ambient baccarat shows run at up to 4 tables at once,
   so walking near the baccarat row produces a constant context-free
   "ta ta ta". There is no distance or ownership logic.
2. There is no background music — only a very quiet low-pass noise room tone
   (`C.sound.ambience`).

## Decisions (confirmed with user)

- **Dealing sounds only from the table the user is actually playing** —
  ambient dealer shows are fully silent.
- **Music: generative Web Audio synth** (zero assets, matches the project's
  procedural philosophy). "Random musics" = every track randomises key,
  tempo, and chord progression.
- **Music ducks to ~40% during live play**, returns after.

## Design

### A. Sound ownership (the "ta ta ta" fix)
- `dealCardTo(app, mesh, from, to, opts)` gains `opts.sound` (default
  **false**). The card blip plays only when the caller opts in.
- `blackjack-live.js` deal wrapper passes `sound: true` (user's own game).
- `baccarat-show.js`: remove the explicit riffle blips (ambient theatre).
- `roulette-live.js`: dedupe the manual `play('chip')` if the chips3d spot
  manager already blips per chip (verify at implementation).
- Unchanged: footsteps, win/lose/push, UI sting/buzz, ballSpin, dealer TTS,
  room-tone ambience.

### B. Generative music
- `src/logic/music-plan.js` (pure, node-tested): `buildTrackPlan(rng)` →
  `{ bpm (72–92), swing, root, mode, beatsPerBar: 4, bars: 8, repeats: 2,
  events: [{at, type: 'chord'|'bass'|'brush', freqs?|freq?, dur, accent?}] }`.
  Chord progressions drawn from a lounge/jazz pool (major: ii7–V7–Imaj7–vi7,
  Imaj7–vi7–ii7–V7, Imaj7–IVmaj7–ii7–V7; minor: i7–bVII7–bVImaj7–V7,
  i7–iv7–bVII7–V7). One chord per bar; walking bass quarter notes on chord
  tones + chromatic approach into the next bar; swing-brush ride with 2/4
  accents. All frequencies precomputed in Hz (renderer stays dumb).
- `src/engine/music.js` (Web Audio renderer): schedules one full track on the
  audio timeline (soft EP chords = detuned triangle+sine through a lowpass;
  sine walking bass; brushed ride = band-passed noise), rests 3–8 s, then
  builds the next random track. Runs through its own gain node into
  `C.sound`'s master (exposed via a small `C.sound.bus()` bridge).
- Lifecycle: `C.music.start()` after the ENTER unlock; obeys the existing
  mute toggle (`sound.setMuted` notifies `C.music`); pauses when the tab is
  hidden, resumes on visible; `C.music.duck(on)` ramps the gain to 40%.
- Loudness: subtle — sits under the room tone; SFX and TTS stay on top.

### C. Duck wiring
- `openRouletteLive`/`openBlackjackLive` → `C.music?.duck(true)`;
  their `close*` → `duck(false)`.

### D. Plumbing
- `build.mjs` `SRC_ORDER` gains `src/logic/music-plan.js` (after
  gestures.js) and `src/engine/music.js` (after sound.js); `index.html`
  rebuilt; public mirror synced.

## Error handling
- All Web Audio calls wrapped like sound.js (`try/catch`, audio must never
  break gameplay); `C.music` no-ops before unlock or without AudioContext;
  import-safe in node.

## Testing
- `tests/music-plan.test.mjs`: bpm/swing in range, 8 bars, events sorted,
  chord/bass frequencies within 30–2000 Hz, progression from the pool,
  deterministic under a seeded rng.
- Full lobby suite stays green; browser verify: silence near the baccarat
  row, audible music after ENTER (AnalyserNode RMS > 0), duck on live open.
