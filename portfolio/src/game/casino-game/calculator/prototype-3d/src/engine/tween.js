(() => {
  const C = (globalThis.CASINO ??= {});
  const easings = {
    linear: (t) => t,
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    outBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  };
  C.tween = {
    easings,
    to(obj, props, ms, ease = 'inOutCubic', onDone) {
      const from = {};
      for (const k in props) from[k] = obj[k];
      const fn = easings[ease];
      const t0 = performance.now();
      const entry = { cancel: false };
      const tick = (now) => {
        if (entry.cancel) return;
        const t = Math.min(1, (now - t0) / ms);
        const e = fn(t);
        for (const k in props) obj[k] = from[k] + (props[k] - from[k]) * e;
        if (t < 1) requestAnimationFrame(tick);
        else if (onDone) onDone();
      };
      requestAnimationFrame(tick);
      return entry;
    },
  };
})();
