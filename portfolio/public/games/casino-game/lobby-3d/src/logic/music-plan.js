(() => {
  const C = (globalThis.CASINO ??= {});

  // Pure generative lounge-track planner. No Web Audio/DOM — node-testable;
  // rendered by src/engine/music.js. A "track" is 8 bars of 4/4 (a 4-chord
  // progression played twice) with one EP chord per bar, a walking bass, and
  // a swing-brush ride. Every call randomises key, mode, tempo, swing and
  // progression, so no two tracks are alike.

  const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // chord qualities as semitone intervals from the chord root
  const QUALITY = { maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], 7: [0, 4, 7, 10] };

  // progressions: [degree above key root (semitones), quality] — lounge pool
  const PROGRESSIONS = {
    major: [
      [[2, 'm7'], [7, '7'], [0, 'maj7'], [9, 'm7']],      // ii V I vi
      [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, '7']],      // I vi ii V
      [[0, 'maj7'], [5, 'maj7'], [2, 'm7'], [7, '7']],    // I IV ii V
    ],
    minor: [
      [[0, 'm7'], [10, '7'], [8, 'maj7'], [7, '7']],      // i bVII bVI V
      [[0, 'm7'], [5, 'm7'], [10, '7'], [7, '7']],        // i iv bVII V
    ],
  };

  function buildTrackPlan(rng = Math.random) {
    const bpm = 72 + Math.floor(rng() * 21);              // 72..92
    const swing = 0.62 + rng() * 0.06;                    // off-beat placement
    const mode = rng() < 0.5 ? 'major' : 'minor';
    const rootPc = Math.floor(rng() * 12);                // key pitch class
    const pool = PROGRESSIONS[mode];
    const progression = pool[Math.floor(rng() * pool.length)];
    const beatsPerBar = 4, bars = 8;

    // chord roots in a fixed middle band (midi 55..66) so voicings stay warm
    const chordRoot = (deg) => 55 + ((rootPc + deg) % 12);

    const events = [];
    for (let bar = 0; bar < bars; bar++) {
      const [deg, quality] = progression[bar % progression.length];
      const [degNext] = progression[(bar + 1) % progression.length];
      const root = chordRoot(deg);
      const at = bar * beatsPerBar;

      // one sustained chord per bar (root/3rd/5th/7th)
      events.push({
        type: 'chord', at, dur: beatsPerBar - 0.5,
        freqs: QUALITY[quality].map((iv) => midiHz(root + iv)),
      });

      // walking bass: root · fifth · third · chromatic approach to next root
      const bassRoot = root - 24;
      const third = QUALITY[quality][1];
      const approach = chordRoot(degNext) - 24 - 1;
      [bassRoot, bassRoot + 7, bassRoot + third, approach].forEach((m, beat) => {
        events.push({ type: 'bass', at: at + beat, dur: 0.9, freq: midiHz(m) });
      });

      // swing ride: every beat, swung off-beats after 2 and 4, accents on 2/4
      for (let beat = 0; beat < beatsPerBar; beat++) {
        events.push({ type: 'brush', at: at + beat, dur: 0.08, accent: beat % 2 === 1 });
        if (beat % 2 === 1) events.push({ type: 'brush', at: at + beat + swing, dur: 0.05, accent: false });
      }
    }
    events.sort((a, b) => a.at - b.at);

    return { bpm, swing, mode, rootPc, progression, beatsPerBar, bars, repeats: 2, events };
  }

  C.musicPlan = { buildTrackPlan, midiHz, PROGRESSIONS };
})();
