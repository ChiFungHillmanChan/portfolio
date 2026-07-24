// All game sound in one WebAudio graph so recording captures the same mix.
export function createAudioEngine() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const dest = ctx.createMediaStreamDestination();
  master.connect(ctx.destination);
  master.connect(dest);

  const buffers = new Map();      // id -> AudioBuffer (current variant)
  let ambient = null;
  const live = new Set();

  async function loadVariant(name) {
    const manifest = await (await fetch('./voice/manifest.json')).json();
    buffers.clear();
    await Promise.all(manifest[name].map(async (c) => {
      const raw = await (await fetch(`./voice/${c.file}`)).arrayBuffer();
      buffers.set(c.id, await ctx.decodeAudioData(raw));
    }));
  }

  function playClip(id) {
    const buf = buffers.get(id);
    if (!buf) return 0;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(master);
    src.start();
    live.add(src);
    src.onended = () => live.delete(src);
    return buf.duration;
  }

  function smack() {
    const t = ctx.currentTime, vary = () => 0.8 + Math.random() * 0.4;
    const noise = ctx.createBufferSource();
    const len = Math.floor(ctx.sampleRate * 0.09);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    noise.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(1400 * vary(), t);
    bp.frequency.exponentialRampToValueAtTime(500 * vary(), t + 0.07);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    noise.connect(bp).connect(g).connect(master);
    const thump = ctx.createOscillator();
    thump.frequency.setValueAtTime(65 * vary(), t);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.6, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    thump.connect(tg).connect(master);
    noise.start(t); thump.start(t); thump.stop(t + 0.13);
  }

  function startAmbient() {
    if (ambient) return;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + (Math.random() * 2 - 1) * 0.02) * 0.995; d[i] = last; }
    ambient = ctx.createBufferSource();
    ambient.buffer = buf; ambient.loop = true;
    const g = ctx.createGain(); g.gain.value = 0.5;
    ambient.connect(g).connect(master);
    ambient.start();
  }

  return {
    ctx, dest,
    unlock: () => (ctx.state === 'suspended' ? ctx.resume() : Promise.resolve()),
    loadVariant, playClip, smack, startAmbient,
    stopAll: () => { live.forEach((s) => { try { s.stop(); } catch { /* already ended */ } }); if (ambient) { ambient.stop(); ambient = null; } }
  };
}
