// Ritual timeline + generic time-based clip sequencer. Pure; times in seconds.
// Scheduling is duration-aware: clips are placed sequentially with a smack gap
// between them, so the slow low-register variant simply chants fewer lines in
// the minute instead of overlapping itself.
export const RITUAL_SECONDS = 60;
export const BURN_AT = 53;
const INTRO_AT = 0.8;
const FINALE_AT = 52.5;
const LINES_FROM = 7;
const LINES_END = 51;
const LINE_GAP = 0.9;

export function buildRitualSchedule(clips, rng) {
  const lines = clips.filter((c) => c.id.startsWith('line-'));
  const order = new Map(lines.map((c, i) => [c.id, i]));
  const shuffled = [...lines];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Greedily take shuffled candidates while their total time fits the window.
  const budget = LINES_END - LINES_FROM;
  const picked = [];
  let used = 0;
  for (const c of shuffled) {
    const cost = c.duration + (picked.length ? LINE_GAP : 0);
    if (used + cost > budget) continue;
    used += cost;
    picked.push(c);
  }
  picked.sort((a, b) => order.get(a.id) - order.get(b.id));
  const schedule = [{ id: 'intro', at: INTRO_AT }];
  let at = LINES_FROM;
  for (const c of picked) {
    schedule.push({ id: c.id, at: Math.round(at * 100) / 100 });
    at += c.duration + LINE_GAP;
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
