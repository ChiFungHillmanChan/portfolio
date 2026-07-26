// Three-bone arm rig: shoulder -> elbow -> wrist -> slipper. The granny is
// five sprites sharing one 525x799 frame cut from the source painting. The
// strike pose is SOLVED by IK against the flat sheet, not hand-tuned: the old
// hand-tuned constants folded the elbow 97deg and laid it on the paper.
import { planeToScreen } from './plane.js';

const SCALE = 0.95;
export const FRAME = { x: 220, y: 440, w: 525 * SCALE, h: 799 * SCALE };

// measured joints in image coords (see cut-granny-sprites.py)
const J = { sh: [190, 345], el: [82, 235], wr: [61, 196], sl: [100, 72] };
const S = (p) => ({ x: p[0] * SCALE, y: p[1] * SCALE });

export const UPPERA = { shx: S(J.sh).x, shy: S(J.sh).y, ex: S(J.el).x, ey: S(J.el).y };
export const FOREA  = { ex: S(J.el).x, ey: S(J.el).y, wx: S(J.wr).x, wy: S(J.wr).y };
export const HANDA  = { wx: S(J.wr).x, wy: S(J.wr).y, slx: S(J.sl).x, sly: S(J.sl).y };

export const PIVOT = { x: FRAME.x + UPPERA.shx, y: FRAME.y + UPPERA.shy };
export const HIP   = { x: FRAME.x + 260 * SCALE, y: FRAME.y + 500 * SCALE };

const seg = (ax, ay, bx, by) => ({ len: Math.hypot(bx - ax, by - ay), ang: Math.atan2(by - ay, bx - ax) });
const U = seg(UPPERA.shx, UPPERA.shy, UPPERA.ex, UPPERA.ey);
const F = seg(FOREA.ex, FOREA.ey, FOREA.wx, FOREA.wy);
const H = seg(HANDA.wx, HANDA.wy, HANDA.slx, HANDA.sly);

// upper 146.4, fore 42.1, hand 123.5 — most of what the old code called
// "forearm" was actually fist + slipper, which is why the wrist split matters
export const BONES = { upper: U.len, fore: F.len, hand: H.len };

const norm = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const lerp = (a, b, u) => a + (b - a) * u;

// Joint positions. Each depends only on the angles above it in the chain,
// which is what lets the tests assert elbow clearance from a shoulder alone.
export function elbowAt(shoulder) {
  const a = U.ang + shoulder;
  return { x: PIVOT.x + Math.cos(a) * U.len, y: PIVOT.y + Math.sin(a) * U.len };
}
export function wristAt(shoulder, elbow) {
  const e = elbowAt(shoulder), a = F.ang + shoulder + elbow;
  return { x: e.x + Math.cos(a) * F.len, y: e.y + Math.sin(a) * F.len };
}
export function slipperPoint({ shoulder, elbow, wrist, lean = 0 }) {
  const w = wristAt(shoulder, elbow), a = H.ang + shoulder + elbow + wrist;
  const p = { x: w.x + Math.cos(a) * H.len, y: w.y + Math.sin(a) * H.len };
  if (!lean) return p;
  const c = Math.cos(lean), s = Math.sin(lean);
  const dx = p.x - HIP.x, dy = p.y - HIP.y;
  return { x: HIP.x + dx * c - dy * s, y: HIP.y + dx * s + dy * c };
}

// Place the wrist directly above the target by one hand-length, then solve the
// two-bone chain to it. The elbow-up branch is the one that clears the sheet —
// the other lands the elbow on the paper, which is the bug we are fixing.
export function solveArm(target) {
  const wx = target.x, wy = target.y - BONES.hand;
  const dx = wx - PIVOT.x, dy = wy - PIVOT.y, d = Math.hypot(dx, dy);
  if (d > BONES.upper + BONES.fore || d < Math.abs(BONES.upper - BONES.fore)) return null;
  const x = (d * d + BONES.upper ** 2 - BONES.fore ** 2) / (2 * d);
  const h = Math.sqrt(Math.max(0, BONES.upper ** 2 - x * x));
  const ux = dx / d, uy = dy / d;
  // both IK branches; keep the one whose elbow sits higher on screen
  const cands = [
    { x: PIVOT.x + x * ux - h * uy, y: PIVOT.y + x * uy + h * ux },
    { x: PIVOT.x + x * ux + h * uy, y: PIVOT.y + x * uy - h * ux }
  ];
  const elbowPt = cands[0].y <= cands[1].y ? cands[0] : cands[1];
  const wristPt = { x: wx, y: wy };
  const shoulder = norm(Math.atan2(elbowPt.y - PIVOT.y, elbowPt.x - PIVOT.x) - U.ang);
  const elbow = norm(Math.atan2(wristPt.y - elbowPt.y, wristPt.x - elbowPt.x) - F.ang - shoulder);
  const wrist = norm(Math.atan2(target.y - wristPt.y, target.x - wristPt.x) - H.ang - shoulder - elbow);
  return { shoulder, elbow, wrist, elbowPt, wristPt };
}

const STRIKE = solveArm(planeToScreen(0, 0));
if (!STRIKE) throw new Error('sheet centre is out of arm reach — check PLANE vs FRAME');
export const SHOULDER_STRIKE = STRIKE.shoulder;
export const ELBOW_STRIKE = STRIKE.elbow;
export const WRIST_STRIKE = STRIKE.wrist;

// READY holds the slipper high, near the painted pose so the sleeve barely
// rotates; COCK pulls a little further back behind her crown.
export const SHOULDER_READY = 0.20;
export const ELBOW_READY = -0.15;
export const WRIST_READY = 0.0;
export const SHOULDER_COCK = SHOULDER_READY + 0.22;
export const ELBOW_COCK = ELBOW_READY - 0.20;
export const WRIST_COCK = -0.18;
export const ELBOW_GIVE = 0.10;
export const LEAN_STRIKE = -0.085;
export const AIM_LIMIT = 0.22;

export const ANTICIPATE_S = 0.035;
export const DRIVE_S = 0.055;
export const CONTACT_S = ANTICIPATE_S + DRIVE_S;
export const HOLD_S = 0.035;
export const RECOIL_S = 0.13;
export const SETTLE_S = 0.26;
export const SWING_S = CONTACT_S + HOLD_S + RECOIL_S + SETTLE_S;

const STRIKE_DIR = (() => {
  const p = slipperPoint({ shoulder: SHOULDER_STRIKE, elbow: ELBOW_STRIKE, wrist: WRIST_STRIKE });
  return Math.atan2(p.y - PIVOT.y, p.x - PIVOT.x);
})();

export function aimFor(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
  const bias = norm(Math.atan2(y - PIVOT.y, x - PIVOT.x) - STRIKE_DIR);
  return Math.max(-AIM_LIMIT, Math.min(AIM_LIMIT, bias));
}

export function swingActivity(since, anticipate = ANTICIPATE_S) {
  const total = anticipate + DRIVE_S + HOLD_S + RECOIL_S + SETTLE_S;
  if (!(since >= 0) || since >= total) return 0;
  return Math.min(1, (total - since) / (RECOIL_S + SETTLE_S));
}

export function swingPose(since, aim = 0, anticipate = ANTICIPATE_S) {
  const ready = { shoulder: SHOULDER_READY, elbow: ELBOW_READY, wrist: WRIST_READY, lean: 0 };
  if (!(since >= 0)) return ready;
  const strike = SHOULDER_STRIKE + aim;

  if (since < anticipate) {                       // wind-up
    const u = Math.sin((since / anticipate) * Math.PI / 2);
    return { shoulder: lerp(SHOULDER_READY, SHOULDER_COCK, u),
             elbow: lerp(ELBOW_READY, ELBOW_COCK, u),
             wrist: lerp(WRIST_READY, WRIST_COCK, u), lean: 0 };
  }
  const t = since - anticipate;
  if (t < DRIVE_S) {                              // drive
    const p = (t / DRIVE_S) ** 2;                 // ease-in: the blow gathers speed
    return { shoulder: lerp(SHOULDER_COCK, strike, p),
             elbow: lerp(ELBOW_COCK, ELBOW_STRIKE, p ** 1.15),
             // the wrist leads last so the slipper snaps — this is the whip
             wrist: lerp(WRIST_COCK, WRIST_STRIKE, p ** 1.6),
             lean: LEAN_STRIKE * p };
  }
  const h = t - DRIVE_S;
  if (h < HOLD_S) {                               // contact
    return { shoulder: strike,
             elbow: ELBOW_STRIKE - ELBOW_GIVE * Math.sin((h / HOLD_S) * Math.PI),
             wrist: WRIST_STRIKE, lean: LEAN_STRIKE };
  }
  const r = h - HOLD_S;
  if (r >= RECOIL_S + SETTLE_S) return ready;
  const u = r / (RECOIL_S + SETTLE_S);
  const k = Math.exp(-5.2 * u) * Math.cos(u * Math.PI * 2.3);
  return { shoulder: lerp(SHOULDER_READY, strike, k),
           elbow: lerp(ELBOW_READY, ELBOW_STRIKE, k),
           wrist: lerp(WRIST_READY, WRIST_STRIKE, k),
           lean: LEAN_STRIKE * k };
}

export function armPose(t, since, aim = 0, anticipate = ANTICIPATE_S) {
  const pose = swingPose(since, aim, anticipate);
  const idle = 1 - swingActivity(since, anticipate);
  return {
    shoulder: pose.shoulder + (Math.sin(t * 1.6) * 0.030 + Math.sin(t * 3.7 + 1.1) * 0.011) * idle,
    elbow: pose.elbow + (Math.sin(t * 1.15 + 0.6) * 0.035 + Math.sin(t * 2.9) * 0.013) * idle,
    wrist: pose.wrist + Math.sin(t * 2.1 + 0.3) * 0.020 * idle,
    lean: pose.lean
  };
}
