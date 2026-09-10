(() => {
  const C = (globalThis.CASINO ??= {});

  // Pure analytic two-bone IK (shoulder→elbow→hand). Plain [x,y,z] arrays,
  // no THREE — node-tested. The THREE side (engine/character.js) converts the
  // returned positions into bone quaternions.
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = len(a); return l < 1e-9 ? [0, 0, 0] : mul(a, 1 / l); };

  // A card is pitched across a horizontal table. A radial clamp raises a
  // distant target toward the shoulder, turning a deal into a chest-height
  // gesture. Keep its height and shorten only the horizontal reach instead.
  function clampTableReach(shoulder, target, reach) {
    const delta = sub(target, shoulder);
    if (len(delta) <= reach) return [...target];
    const dy = Math.max(-reach * 0.90, Math.min(reach * 0.90, delta[1]));
    const horizontal = Math.hypot(delta[0], delta[2]);
    const radius = Math.sqrt(Math.max(0, reach * reach - dy * dy));
    const scale = horizontal > 1e-9 ? Math.min(1, radius / horizontal) : 0;
    return [shoulder[0] + delta[0] * scale, shoulder[1] + dy, shoulder[2] + delta[2] * scale];
  }

  function solveTwoBone({ shoulder, target, upperLen, foreLen, pole }) {
    const toT = sub(target, shoulder);
    let d = len(toT);
    const maxR = (upperLen + foreLen) * 0.9999;      // never fully lock straight
    const minR = Math.abs(upperLen - foreLen) + 1e-6;
    const clamped = d > maxR || d < minR;
    const dir = d < 1e-9 ? [1, 0, 0] : mul(toT, 1 / d);
    d = Math.min(Math.max(d, minR), maxR);
    const hand = add(shoulder, mul(dir, d));
    // law of cosines: distance from shoulder to elbow's projection on dir
    const a = (d * d + upperLen * upperLen - foreLen * foreLen) / (2 * d);
    const h = Math.sqrt(Math.max(0, upperLen * upperLen - a * a));
    // bend direction = pole component perpendicular to dir (with fallbacks)
    let bend = sub(pole, mul(dir, dot(pole, dir)));
    if (len(bend) < 1e-6) bend = cross(dir, [0, 1, 0]);
    if (len(bend) < 1e-6) bend = cross(dir, [1, 0, 0]);
    bend = norm(bend);
    const elbow = add(add(shoulder, mul(dir, a)), mul(bend, h));
    return { elbow, hand, clamped };
  }

  C.ik = { solveTwoBone, clampTableReach };
})();
