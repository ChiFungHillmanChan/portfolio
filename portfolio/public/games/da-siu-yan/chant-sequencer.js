// Ritual timeline + generic time-based clip sequencer. Pure; times in seconds.
// Scheduling is duration-aware: clips are placed sequentially with a smack gap
// between them, so the slow low-register variant simply chants fewer lines in
// the minute instead of overlapping itself.
export const RITUAL_SECONDS = 60;
export const BURN_AT = 53;
const INTRO_AT = 0.8;
const FINALE_AT = 52.5;
// Silence BETWEEN clips. Each clip is generated with ~0.2s of padding at each
// end (PAD_S in generate-granny-voice.mjs, halved by the 2x atempo), so what a
// player actually hears is this + 0.4s. Keep the audible hole around 0.5–1s so
// she sounds like she is chanting continuously rather than trailing off.
export const LINE_GAP = 0.35;

export function buildRitualSchedule(clips, rng) {
  const lines = clips.filter((c) => c.id.startsWith('line-'));
  const intro = clips.find((c) => c.id === 'intro');
  const order = new Map(lines.map((c, i) => [c.id, i]));
  const shuffled = [...lines];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // The chanting window is bounded by the clips either side of it, not by fixed
  // offsets — those left a 4s hole after the intro once the clips got faster.
  const from = INTRO_AT + (intro ? intro.duration : 0) + LINE_GAP;
  const budget = FINALE_AT - LINE_GAP - from;
  // Greedily take shuffled candidates while their total time fits the window.
  const picked = [];
  let used = 0;
  for (const c of shuffled) {
    const cost = c.duration + (picked.length ? LINE_GAP : 0);
    if (used + cost > budget) continue;
    used += cost;
    picked.push(c);
  }
  picked.sort((a, b) => order.get(a.id) - order.get(b.id));
  // Packing greedily leaves a leftover shorter than any unused clip. Spread it
  // evenly across every gap rather than letting it pool into one silent hole
  // before the finale. Never capped: one uniform 1.3s breath beats a run of
  // 0.7s breaths plus a 4s void.
  const introEnd = INTRO_AT + (intro ? intro.duration : 0);
  const spoken = picked.reduce((sum, c) => sum + c.duration, 0);
  const gap = picked.length
    ? (FINALE_AT - introEnd - spoken) / (picked.length + 1)
    : LINE_GAP;
  const schedule = [{ id: 'intro', at: Math.round(INTRO_AT * 100) / 100 }];
  let at = introEnd + gap;
  for (const c of picked) {
    schedule.push({ id: c.id, at: Math.round(at * 100) / 100 });
    at += c.duration + gap;
  }
  schedule.push({ id: 'finale', at: FINALE_AT });
  return schedule;
}

export function createSequencer(schedule) {
  let startedAt = null, pausedAt = null, pausedTotal = 0, next = 0;
  const elapsed = (now) => (pausedAt !== null ? pausedAt : now) - startedAt - pausedTotal;
  return {
    start(now) { startedAt = now; pausedAt = null; pausedTotal = 0; next = 0; },
    pause(now) { if (pausedAt === null) pausedAt = now; },
    resume(now) { if (pausedAt !== null) { pausedTotal += now - pausedAt; pausedAt = null; } },
    tick(now) {
      if (startedAt === null || pausedAt !== null) return [];
      const t = elapsed(now), fired = [];
      while (next < schedule.length && schedule[next].at <= t) fired.push(schedule[next++].id);
      return fired;
    },
    done: () => next >= schedule.length,
    elapsed
  };
}

// Endless mode: shuffle all ids, yield one at a time, reshuffle when exhausted.
export function createShuffleLooper(ids, rng) {
  let bag = [];
  return () => {
    if (!bag.length) {
      bag = [...ids];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop();
  };
}
