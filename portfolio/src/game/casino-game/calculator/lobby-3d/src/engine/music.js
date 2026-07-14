(() => {
  const C = (globalThis.CASINO ??= {});

  // Generative lounge music renderer — zero asset files, same philosophy as
  // sound.js. Track plans come from the pure C.musicPlan module; this file
  // owns the Web Audio side: EP chords, walking bass, brushed ride, track
  // scheduling with rest gaps, plus duck / mute / tab-visibility handling.
  // Import-safe in node — no browser API is touched at module load.

  const BASE_GAIN = 0.5, DUCK_FACTOR = 0.4;
  let bus = null;        // { ctx, master } borrowed from C.sound.bus()
  let out = null;        // music output gain (under sound's master)
  let noiseBuf = null;
  let running = false, muted = false, ducked = false;
  let timer = 0, trackGain = null, visHooked = false;

  function ensureOut() {
    if (!bus) bus = C.sound?.bus?.() || null;
    if (!bus || !bus.ctx) return false;
    if (!out) {
      out = bus.ctx.createGain();
      out.gain.value = BASE_GAIN * (ducked ? DUCK_FACTOR : 1);
      out.connect(bus.master);
    }
    return true;
  }

  function ensureNoise() {
    if (!noiseBuf) {
      const len = Math.floor(bus.ctx.sampleRate * 1.0);
      noiseBuf = bus.ctx.createBuffer(1, len, bus.ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  // ---- instruments (everything scheduled on the audio timeline) ----
  function epChord(t, freqs, dur) {
    const { ctx } = bus;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.5;
    lp.connect(trackGain);
    for (const f of freqs) {
      // soft electric piano: triangle + slightly detuned sine per voice
      for (const [type, mul, peak] of [['triangle', 1, 0.040], ['sine', 1.004, 0.018]]) {
        const o = ctx.createOscillator();
        o.type = type; o.frequency.value = f * mul;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + 0.04);
        g.gain.setTargetAtTime(peak * 0.5, t + 0.15, 0.6);
        g.gain.setTargetAtTime(0.0001, t + Math.max(0.3, dur - 0.3), 0.12);
        o.connect(g).connect(lp);
        o.start(t); o.stop(t + dur + 0.6);
      }
    }
  }

  function bassNote(t, freq, dur) {
    const { ctx } = bus;
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.10, t + 0.02);
    g.gain.setTargetAtTime(0.0001, t + dur * 0.7, 0.08);
    o.connect(g).connect(trackGain);
    o.start(t); o.stop(t + dur + 0.3);
  }

  function brush(t, accent) {
    const { ctx } = bus;
    const src = ctx.createBufferSource();
    src.buffer = ensureNoise();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 7200; f.Q.value = 1.4;
    const g = ctx.createGain();
    const peak = accent ? 0.030 : 0.016;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(f).connect(g).connect(trackGain);
    src.start(t, Math.random() * 0.4);
    src.stop(t + 0.15);
  }

  // Schedule one whole track; returns its length in seconds.
  function scheduleTrack(plan) {
    const { ctx } = bus;
    trackGain = ctx.createGain();
    trackGain.gain.value = 1;
    trackGain.connect(out);
    const spb = 60 / plan.bpm;
    const t0 = ctx.currentTime + 0.15;
    const passLen = plan.bars * plan.beatsPerBar * spb;
    for (let rep = 0; rep < plan.repeats; rep++) {
      const base = t0 + rep * passLen;
      for (const e of plan.events) {
        const t = base + e.at * spb;
        if (e.type === 'chord') epChord(t, e.freqs, e.dur * spb);
        else if (e.type === 'bass') bassNote(t, e.freq, e.dur * spb);
        else brush(t, e.accent);
      }
    }
    return plan.repeats * passLen + 0.3;
  }

  function nextTrack() {
    if (!running || muted) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!ensureOut()) return;
    try {
      const len = scheduleTrack(C.musicPlan.buildTrackPlan(Math.random));
      const gap = 3000 + Math.random() * 5000;           // breathe between tracks
      timer = setTimeout(nextTrack, len * 1000 + gap);
    } catch { /* music must never break gameplay */ }
  }

  // Fade + drop the in-flight track (mute, tab hidden, stop).
  function killCurrent() {
    clearTimeout(timer);
    if (trackGain && bus) {
      const tg = trackGain;
      try {
        tg.gain.setTargetAtTime(0.0001, bus.ctx.currentTime, 0.1);
        setTimeout(() => { try { tg.disconnect(); } catch { /* gone */ } }, 800);
      } catch { /* gone */ }
    }
    trackGain = null;
  }

  function start() {
    if (running) return;
    running = true;
    muted = !!C.sound?.muted;
    if (!visHooked && typeof document !== 'undefined') {
      visHooked = true;
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) killCurrent();
        else if (running && !muted) nextTrack();
      });
    }
    nextTrack();
  }

  function stop() { running = false; killCurrent(); }

  function setMuted(m) {
    muted = !!m;
    if (muted) killCurrent();
    else if (running) nextTrack();
  }

  // Live-play ducking: music sits back so cards/chips/dealer voice read clearly.
  function duck(on) {
    ducked = !!on;
    if (out && bus) {
      try {
        out.gain.setTargetAtTime(BASE_GAIN * (ducked ? DUCK_FACTOR : 1), bus.ctx.currentTime, 0.4);
      } catch { /* best-effort */ }
    }
  }

  C.music = { start, stop, duck, setMuted };
})();
