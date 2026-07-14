(() => {
  const C = (globalThis.CASINO ??= {});
  // sound.js — procedural casino audio + dealer voice. Zero asset files: every
  // effect is synthesised with the Web Audio API (same philosophy as the
  // canvas-drawn textures) and the dealer voice uses the browser TTS.
  // Autoplay policy: nothing can start before a user gesture, so everything
  // no-ops until unlock() runs from the ENTER button. Also import-safe in
  // node (tests) — no browser API is touched at module load.
  const KEY = 'cg3d.soundMuted';
  const LS = typeof localStorage !== 'undefined' ? localStorage : null;
  const AC = typeof AudioContext !== 'undefined' ? AudioContext
    : typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null;
  const TTS = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;

  let muted = LS ? LS.getItem(KEY) === '1' : false;
  let ctx = null, master = null, noiseBuf = null;
  let ambienceWanted = false, ambienceNodes = null, visibilityHooked = false;

  const ready = () => !!ctx && !muted;

  function ensureNoise() {
    if (!noiseBuf) {
      const len = Math.floor(ctx.sampleRate * 1.2);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  function env(g, t0, peak, dur) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  function noiseHit({ delay = 0, dur = 0.06, peak = 0.25, freq = 4000, q = 1.2, type = 'bandpass', rate = 1 } = {}) {
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = ensureNoise();
    src.playbackRate.value = rate;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    env(g, t0, peak, dur);
    src.connect(f).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  function tone({ delay = 0, dur = 0.18, peak = 0.12, freq = 660, type = 'sine', slide = 0 } = {}) {
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    const g = ctx.createGain();
    env(g, t0, peak, dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  const SFX = {
    chip()  { noiseHit({ dur: 0.035, peak: 0.35, freq: 5200, q: 2.5 }); noiseHit({ delay: 0.045, dur: 0.03, peak: 0.22, freq: 6400, q: 2.5 }); },
    chipSweep() { for (let i = 0; i < 5; i++) noiseHit({ delay: i * 0.035, dur: 0.03, peak: 0.16, freq: 4800 + i * 350, q: 2 }); },
    card()  { noiseHit({ dur: 0.09, peak: 0.18, freq: 2400, q: 0.7, rate: 0.8 }); },
    win()   { [523, 659, 784].forEach((f, i) => tone({ delay: i * 0.09, dur: 0.22, peak: 0.14, freq: f, type: 'triangle' })); },
    lose()  { tone({ dur: 0.3, peak: 0.12, freq: 196, type: 'triangle', slide: -60 }); },
    push()  { tone({ dur: 0.15, peak: 0.1, freq: 440 }); },
    step()  { noiseHit({ dur: 0.05, peak: 0.045, freq: 240, q: 0.8, type: 'lowpass' }); },
    buzz()  { tone({ dur: 0.16, peak: 0.08, freq: 110, type: 'square' }); tone({ delay: 0.19, dur: 0.16, peak: 0.08, freq: 110, type: 'square' }); },
    sting() { [392, 523, 659, 784].forEach((f, i) => tone({ delay: i * 0.07, dur: 0.3, peak: 0.1, freq: f, type: 'triangle' })); },
  };

  function play(name) {
    if (!ready()) return;
    try { SFX[name] && SFX[name](); } catch { /* audio must never break gameplay */ }
  }

  // Ball circling the rim: looping noise whose pitch/level fall as it slows,
  // then a pocket rattle over the last 28% (matches spinTo's drop window).
  function ballSpin(ms = 5000) {
    if (!ready()) return { stop() {} };
    try {
      const t0 = ctx.currentTime, sec = ms / 1000;
      const src = ctx.createBufferSource();
      src.buffer = ensureNoise();
      src.loop = true;
      src.playbackRate.setValueAtTime(1.5, t0);
      src.playbackRate.linearRampToValueAtTime(0.55, t0 + sec);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.Q.value = 3;
      f.frequency.setValueAtTime(3200, t0);
      f.frequency.exponentialRampToValueAtTime(900, t0 + sec);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.11, t0);
      g.gain.linearRampToValueAtTime(0.03, t0 + sec * 0.72);
      g.gain.linearRampToValueAtTime(0.0001, t0 + sec);
      src.connect(f).connect(g).connect(master);
      src.start(t0);
      src.stop(t0 + sec + 0.1);
      for (let i = 0; i < 7; i++) {
        const frac = i / 7;
        noiseHit({ delay: sec * 0.72 + frac * sec * 0.26, dur: 0.03, peak: 0.2 * (1 - frac * 0.5), freq: 2600, q: 4 });
      }
      let stopped = false;
      return {
        stop() {
          if (stopped) return;
          stopped = true;
          try {
            g.gain.cancelScheduledValues(ctx.currentTime);
            g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
            src.stop(ctx.currentTime + 0.25);
          } catch { /* already ended */ }
        },
      };
    } catch { return { stop() {} }; }
  }

  function startAmbience() {
    if (ambienceNodes || !ambienceWanted || !ready()) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = ensureNoise();
      src.loop = true;
      src.playbackRate.value = 0.35;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 0.4;
      const g = ctx.createGain();
      g.gain.value = 0.03;
      src.connect(f).connect(g).connect(master);
      src.start();
      ambienceNodes = { src };
    } catch { /* no ambience */ }
  }
  function stopAmbience() {
    if (!ambienceNodes) return;
    try { ambienceNodes.src.stop(); } catch { /* already stopped */ }
    ambienceNodes = null;
  }
  function ambience(on) {
    ambienceWanted = !!on;
    if (ambienceWanted) startAmbience(); else stopAmbience();
  }

  function say(text, { lang = 'en-US', rate = 0.95 } = {}) {
    if (muted || !TTS) return;
    try {
      TTS.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = rate;
      TTS.speak(u);
    } catch { /* TTS is best-effort */ }
  }
  const sayResult = (num, color, parity) => say([num, color, parity].filter(Boolean).join(', '));
  const sayNoMoreBets = () => say('No more bets');

  // Call from a user gesture (the ENTER button): creates/resumes the
  // AudioContext even while muted, so unmuting later needs no new gesture.
  function unlock() {
    if (!ctx && AC) {
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.9;
        master.connect(ctx.destination);
      } catch { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (TTS) { try { TTS.getVoices(); } catch { /* voices load async */ } }
    if (!visibilityHooked && typeof document !== 'undefined') {
      visibilityHooked = true;
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAmbience();
        else if (ambienceWanted) startAmbience();
      });
    }
    startAmbience();
    C.music?.start();
  }

  function setMuted(m) {
    muted = !!m;
    if (LS) { try { LS.setItem(KEY, muted ? '1' : '0'); } catch { /* private mode */ } }
    if (muted) {
      stopAmbience();
      if (TTS) { try { TTS.cancel(); } catch { /* best-effort */ } }
    } else if (ambienceWanted) startAmbience();
    C.music?.setMuted(muted);
  }

  // Shared audio bus for sibling modules (music.js) — null before unlock.
  const bus = () => (ctx ? { ctx, master } : null);

  C.sound = {
    unlock, play, say, sayResult, sayNoMoreBets, ballSpin, ambience, setMuted, bus,
    get muted() { return muted; },
  };
})();
