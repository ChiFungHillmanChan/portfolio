// Illustrated scene renderer: warm daylight, SVG-sprite granny who swings her
// slipper at the paper. Same draw(state) contract as scene.js. Pure helpers
// (swing envelope, rotated-paper hit test) are exported for node --test.
import { STAGE_W, STAGE_H } from './scene.js';

const KAI = '"Kaiti TC","楷體","DFKai-SB","BiauKai",serif';
const INK = '#3a2317';

// ── pure: two-bone arm rig ─────────────────────────────────────────────────
// The arm is two sprites hinged at the elbow: granny-arm-upper.svg pivots at
// the shoulder, granny-arm-fore.svg pivots at the elbow and inherits the
// shoulder's rotation. Angles below are canvas rotations in radians — a MORE
// NEGATIVE elbow folds the forearm back (flexes), 0 is the authored pose.

// Skeleton, in the shared 380x420 sprite coordinate system.
export const PIVOT = { x: 640, y: 640 };     // her right shoulder, stage coords
export const HIP = { x: 620, y: 980 };       // lean pivot, stage coords
export const UPPER = { w: 380, h: 420, shx: 300, shy: 360, ex: 242, ey: 232 };
export const FORE = { w: 380, h: 420, ex: 242, ey: 232, slx: 100, sly: 60 };

// Swing timing. The smack is scheduled to land at contact, so this doubles as
// the tap-to-sound latency — kept at 0.09s because touch players feel anything
// past ~0.1s as lag, while still leaving the wind-up two frames to read.
export const ANTICIPATE_S = 0.035;  // rock back
export const DRIVE_S = 0.055;       // accelerate onto the paper
export const CONTACT_S = ANTICIPATE_S + DRIVE_S;
export const HOLD_S = 0.035;        // slipper pressed on the paper
export const RECOIL_S = 0.13;
export const SETTLE_S = 0.26;
export const SWING_S = CONTACT_S + HOLD_S + RECOIL_S + SETTLE_S;

// Poses. READY holds the slipper loaded with the elbow bent ~50° — the old rig
// idled at the top of the swing with the arm locked straight, which is what
// made her look broken. COCK lifts it further back so the wind-up reads.
export const SHOULDER_READY = 0.30;
export const SHOULDER_COCK = 0.48;
export const SHOULDER_STRIKE = -1.15;
export const ELBOW_READY = -0.62;
export const ELBOW_COCK = -0.56;
export const ELBOW_STRIKE = 0;
export const ELBOW_GIVE = 0.05;     // the joint absorbing the blow on contact
export const LEAN_STRIKE = -0.085;
export const AIM_LIMIT = 0.25;      // how far a tap may swing the strike angle

const lerp = (a, b, u) => a + (b - a) * u;

// Where the slipper ends up for a given pose, in stage coords. Forward
// kinematics for the exact transform chain drawGranny applies, minus the
// ±3px idle bob (which is ~0 during a swing). This is the guard on the
// landing-point contract — see scene-illustrated.test.js.
export function slipperPoint({ shoulder, elbow, lean = 0 }) {
  const ux = UPPER.ex - UPPER.shx, uy = UPPER.ey - UPPER.shy;
  const fx = FORE.slx - FORE.ex, fy = FORE.sly - FORE.ey;
  const c1 = Math.cos(shoulder), s1 = Math.sin(shoulder);
  const c2 = Math.cos(shoulder + elbow), s2 = Math.sin(shoulder + elbow);
  const x = PIVOT.x + ux * c1 - uy * s1 + fx * c2 - fy * s2;
  const y = PIVOT.y + ux * s1 + uy * c1 + fx * s2 + fy * c2;
  const cl = Math.cos(lean), sl = Math.sin(lean);
  const dx = x - HIP.x, dy = y - HIP.y;
  return { x: HIP.x + dx * cl - dy * sl, y: HIP.y + dx * sl + dy * cl };
}

// Direction from the shoulder to the unaimed landing point, so aimFor can
// express a tap as an offset from it rather than a magic bearing.
const STRIKE_DIR = (() => {
  const p = slipperPoint({ shoulder: SHOULDER_STRIKE, elbow: ELBOW_STRIKE });
  return Math.atan2(p.y - PIVOT.y, p.x - PIVOT.x);
})();

// Extra shoulder rotation that swings the blow toward a tap. Her reach is only
// ~360px from the shoulder, so most of the paper is physically out of range —
// the clamp means a far tap leans the strike that way rather than pretending
// she can get there.
export function aimFor(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
  let bias = Math.atan2(y - PIVOT.y, x - PIVOT.x) - STRIKE_DIR;
  while (bias > Math.PI) bias -= Math.PI * 2;
  while (bias < -Math.PI) bias += Math.PI * 2;
  return Math.max(-AIM_LIMIT, Math.min(AIM_LIMIT, bias));
}

// 1 while the blow is being thrown, fading out through the recoil so the idle
// breathing can fade back in. NaN/negative/ancient → 0.
export function swingActivity(since, anticipate = ANTICIPATE_S) {
  const total = anticipate + DRIVE_S + HOLD_S + RECOIL_S + SETTLE_S;
  if (!(since >= 0) || since >= total) return 0;
  return Math.min(1, (total - since) / (RECOIL_S + SETTLE_S));
}

// The blow itself, as joint angles. Every phase hands off continuously to the
// next. `anticipate` drops to 0 when a strike lands mid-swing, so mash-tapping
// re-drives from the current pose instead of visibly rewinding.
export function swingPose(since, aim = 0, anticipate = ANTICIPATE_S) {
  const ready = { shoulder: SHOULDER_READY, elbow: ELBOW_READY, lean: 0 };
  if (!(since >= 0)) return ready;
  const strike = SHOULDER_STRIKE + aim;

  if (since < anticipate) {                    // wind-up: rock back, fold the elbow
    const u = Math.sin((since / anticipate) * Math.PI / 2);
    return { shoulder: lerp(SHOULDER_READY, SHOULDER_COCK, u),
             elbow: lerp(ELBOW_READY, ELBOW_COCK, u), lean: 0 };
  }
  const t = since - anticipate;
  if (t < DRIVE_S) {                           // drive: the forearm trails, then whips open
    const p = (t / DRIVE_S) ** 2;              // ease-in — the blow gathers speed
    return { shoulder: lerp(SHOULDER_COCK, strike, p),
             elbow: lerp(ELBOW_COCK, ELBOW_STRIKE, p ** 2.2),
             lean: LEAN_STRIKE * p };
  }
  const h = t - DRIVE_S;
  if (h < HOLD_S) {                            // contact: slipper stays on the paper
    return { shoulder: strike,
             elbow: ELBOW_STRIKE - ELBOW_GIVE * Math.sin((h / HOLD_S) * Math.PI),
             lean: LEAN_STRIKE };
  }
  const r = h - HOLD_S;
  if (r >= RECOIL_S + SETTLE_S) return ready;
  // recoil past neutral, then a damped settle back to the ready stance
  const u = r / (RECOIL_S + SETTLE_S);
  const k = Math.exp(-5.2 * u) * Math.cos(u * Math.PI * 2.3);
  return { shoulder: lerp(SHOULDER_READY, strike, k),
           elbow: lerp(ELBOW_READY, ELBOW_STRIKE, k),
           lean: LEAN_STRIKE * k };
}

// Swing plus idle life. The two joints breathe on different frequencies so the
// stance never freezes into a pose.
export function armPose(t, since, aim = 0, anticipate = ANTICIPATE_S) {
  const pose = swingPose(since, aim, anticipate);
  const idle = 1 - swingActivity(since, anticipate);
  return {
    shoulder: pose.shoulder + (Math.sin(t * 1.6) * 0.030 + Math.sin(t * 3.7 + 1.1) * 0.011) * idle,
    elbow: pose.elbow + (Math.sin(t * 1.15 + 0.6) * 0.035 + Math.sin(t * 2.9) * 0.013) * idle,
    lean: pose.lean
  };
}

// ── pure: tilted paper geometry ────────────────────────────────────────────
export const IPAPER = { cx: 250, cy: 800, w: 300, h: 460, rot: -0.17 };

export function paperLocal(x, y, paper = IPAPER) {
  const dx = x - paper.cx, dy = y - paper.cy;
  const c = Math.cos(-paper.rot), s = Math.sin(-paper.rot);
  return { x: dx * c - dy * s + paper.cx, y: dx * s + dy * c + paper.cy };
}

export function inPaper(x, y, paper = IPAPER) {
  const p = paperLocal(x, y, paper);
  return Math.abs(p.x - paper.cx) <= paper.w / 2 && Math.abs(p.y - paper.cy) <= paper.h / 2;
}

// ── renderer ───────────────────────────────────────────────────────────────
const BODY = { x: 350, y: 425, w: 360, h: 780 };
const BRICKS = { x: 0, y: 858, w: 432, h: 356 };

export function createIllustratedScene(canvas) {
  const ctx = canvas.getContext('2d');
  let name = '';
  let photo = null;
  let strikeAt = -Infinity;                  // seconds, performance.now()/1000
  let strikeX = IPAPER.cx, strikeY = IPAPER.cy;
  let strikeAim = 0;
  let strikeAnticipate = ANTICIPATE_S;
  const art = {};

  const ready = Promise.all(
    ['granny-body', 'granny-arm-fore', 'granny-arm-upper', 'bricks'].map((n) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { art[n] = img; resolve(); };
      img.onerror = () => reject(new Error(`art/${n}.svg failed to load`));
      img.src = `./art/${n}.svg`;
    }))
  ).catch((err) => console.warn('[illustrated scene]', err));

  function setEffigy(e) {
    name = (e.name || '').trim();
    photo = e.photo || null;
  }

  // Throws a blow at (x,y). Returns how many seconds until the slipper lands,
  // so the caller can schedule the smack to hit at contact instead of at tap.
  function strike(x, y, nowS, rng = Math.random) {
    const mid = swingActivity(nowS - strikeAt, strikeAnticipate) > 0;
    strikeAnticipate = mid ? 0 : ANTICIPATE_S;   // no visible rewind when mashing
    const jitter = (rng() - 0.5) * 0.06;         // no two blows land identically
    strikeAim = Math.max(-AIM_LIMIT, Math.min(AIM_LIMIT, aimFor(x, y) + jitter));
    strikeAt = nowS;
    strikeX = x; strikeY = y;
    return strikeAnticipate + DRIVE_S;
  }

  function drawBackdrop(t) {
    ctx.fillStyle = '#f2e3c8';
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    // floor
    ctx.fillStyle = '#e6d1ab';
    ctx.fillRect(0, 1105, STAGE_W, STAGE_H - 1105);
    ctx.strokeStyle = 'rgba(58,35,23,0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 1105); ctx.lineTo(STAGE_W, 1105); ctx.stroke();
    // soft vignette
    const g = ctx.createRadialGradient(360, 620, 260, 360, 640, 900);
    g.addColorStop(0, 'rgba(255,246,224,0.28)');
    g.addColorStop(1, 'rgba(140,90,40,0.16)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    // one incense stick planted at the left, thin smoke curling up
    ctx.strokeStyle = '#8a2b1e'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(38, 1105); ctx.lineTo(44, 890); ctx.stroke();
    ctx.fillStyle = `rgba(255,${150 + Math.floor(Math.sin(t * 5) * 50 + 50)},60,0.95)`;
    ctx.beginPath(); ctx.arc(44, 888, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(120,110,100,0.30)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(44, 882);
    for (let i = 1; i <= 5; i++) {
      ctx.lineTo(44 + Math.sin(t * 1.2 + i * 1.6) * (6 + i * 5), 882 - i * 30);
    }
    ctx.stroke();
    // contact shadows
    ctx.fillStyle = 'rgba(90,60,30,0.18)';
    ctx.beginPath(); ctx.ellipse(255, 1195, 235, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(560, 1180, 170, 26, 0, 0, Math.PI * 2); ctx.fill();
  }

  function paperPathLocal(inset) {
    ctx.beginPath();
    ctx.roundRect(-IPAPER.w / 2 + inset, -IPAPER.h / 2 + inset,
      IPAPER.w - inset * 2, IPAPER.h - inset * 2, 8);
  }

  function drawVillainLocal() {
    // paper-local coords: origin at paper centre
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    ctx.lineCap = 'round';
    if (photo) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(-16, -50, 76, 108, 0, 0, Math.PI * 2);
      ctx.clip();
      const s = Math.max(152 / photo.width, 216 / photo.height);
      ctx.drawImage(photo, -16 - (photo.width * s) / 2, -50 - (photo.height * s) / 2,
        photo.width * s, photo.height * s);
      ctx.restore();
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(-16, -50, 76, 108, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(-16, 58); ctx.lineTo(-54, 150); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-16, 58); ctx.lineTo(22, 150); ctx.stroke();
    } else {
      // classic effigy: head, straight trunk, spread limbs
      ctx.beginPath(); ctx.arc(-18, -112, 34, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-46, -70); ctx.lineTo(10, -70);
      ctx.lineTo(18, 60); ctx.lineTo(-54, 60);
      ctx.closePath(); ctx.fill();
      ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(-44, -54); ctx.lineTo(-96, 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, -54); ctx.lineTo(52, 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-38, 60); ctx.lineTo(-56, 158); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, 60); ctx.lineTo(22, 158); ctx.stroke();
    }
    if (name) {
      ctx.fillStyle = INK;
      ctx.font = `40px ${KAI}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const chars = [...name].slice(0, 8);
      const gap = Math.min(46, (IPAPER.h - 120) / chars.length);
      chars.forEach((ch, i) => ctx.fillText(ch, IPAPER.w / 2 - 34, -IPAPER.h / 2 + 96 + i * gap));
    }
  }

  function drawDamageLocal(stage) {
    if (stage < 1) return;
    ctx.strokeStyle = 'rgba(122,90,48,0.55)';
    ctx.lineWidth = 2;
    const creases = [
      [-110, -140, -10, -165], [90, -90, 10, -40], [-100, 60, 0, 95],
      [95, 115, 15, 165], [-85, 175, -25, 140], [65, -170, 105, -130]
    ];
    const n = stage === 1 ? 2 : stage === 2 ? 4 : 6;
    for (let i = 0; i < n; i++) {
      const [a, b, c, d] = creases[i];
      ctx.beginPath(); ctx.moveTo(a, b);
      ctx.lineTo((a + c) / 2 + 10, (b + d) / 2 - 7);
      ctx.lineTo(c, d); ctx.stroke();
    }
    if (stage >= 2) {
      // torn corners — backdrop-coloured bites
      ctx.fillStyle = '#f2e3c8';
      ctx.beginPath();
      ctx.moveTo(-IPAPER.w / 2 - 2, -IPAPER.h / 2 - 2);
      ctx.lineTo(-IPAPER.w / 2 + 40, -IPAPER.h / 2 - 2);
      ctx.lineTo(-IPAPER.w / 2 - 2, -IPAPER.h / 2 + 34);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(IPAPER.w / 2 + 2, IPAPER.h / 2 + 2);
      ctx.lineTo(IPAPER.w / 2 - 44, IPAPER.h / 2 + 2);
      ctx.lineTo(IPAPER.w / 2 + 2, IPAPER.h / 2 - 36);
      ctx.closePath(); ctx.fill();
    }
    if (stage >= 3) {
      ctx.fillStyle = 'rgba(90,60,30,0.16)';
      for (const [bx, by, br] of [[-40, -80, 56], [45, 40, 70], [-55, 130, 48]]) {
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawPrintsLocal(prints) {
    for (let i = 0; i < prints.length; i++) {
      const p = prints[i];
      const local = paperLocal(p.x, p.y);
      const lx = local.x - IPAPER.cx, ly = local.y - IPAPER.cy;
      const alpha = 0.12 + 0.26 * ((i + 1) / prints.length);
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(p.angle);
      ctx.fillStyle = `rgba(96,44,26,${alpha})`;
      ctx.beginPath(); ctx.ellipse(0, 0, 27, 50, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(58,35,23,${alpha})`;
      for (let b = -1; b <= 1; b++) ctx.fillRect(-19, b * 21 - 4, 38, 8);
      ctx.restore();
    }
  }

  function drawFlame(x, y, s, t, seed) {
    const j = Math.sin(t * 11 + seed) * 2.5 + Math.sin(t * 27 + seed * 3) * 1.2;
    const g = ctx.createRadialGradient(x + j * 0.4, y - 8 * s, 1, x + j * 0.4, y - 8 * s, 22 * s);
    g.addColorStop(0, 'rgba(255,240,180,0.95)');
    g.addColorStop(0.4, 'rgba(255,170,60,0.75)');
    g.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x + j * 0.4, y - 10 * s, 9 * s, 20 * s, j * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPaper(state) {
    ctx.save();
    ctx.translate(IPAPER.cx, IPAPER.cy);
    ctx.rotate(IPAPER.rot + (state.stage - 1.5) * 0.005 * Math.min(state.stage, 1));
    ctx.shadowColor = 'rgba(58,35,23,0.35)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#eed155';
    paperPathLocal(0);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    const pg = ctx.createLinearGradient(-IPAPER.w / 2, -IPAPER.h / 2, IPAPER.w / 2, IPAPER.h / 2);
    pg.addColorStop(0, 'rgba(255,244,196,0.5)');
    pg.addColorStop(1, 'rgba(190,140,50,0.25)');
    ctx.fillStyle = pg;
    paperPathLocal(0);
    ctx.fill();
    // double red talisman border + header
    ctx.strokeStyle = '#b3261e';
    ctx.lineWidth = 5;
    paperPathLocal(10);
    ctx.stroke();
    ctx.lineWidth = 2;
    paperPathLocal(20);
    ctx.stroke();
    ctx.fillStyle = '#b3261e';
    ctx.font = `34px ${KAI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('打小人', 0, -IPAPER.h / 2 + 44);
    drawVillainLocal();
    drawDamageLocal(state.stage);
    drawPrintsLocal(state.prints);
    if (state.burnT > 0) {
      const burnH = state.burnT * (IPAPER.h + 40);
      const edgeY = IPAPER.h / 2 - burnH;
      ctx.save();
      paperPathLocal(0);
      ctx.clip();
      ctx.fillStyle = 'rgba(24,12,7,0.94)';
      ctx.beginPath();
      ctx.moveTo(-IPAPER.w / 2 - 10, IPAPER.h / 2 + 20);
      ctx.lineTo(-IPAPER.w / 2 - 10, edgeY);
      for (let x = -IPAPER.w / 2 - 10; x <= IPAPER.w / 2 + 10; x += 20) {
        ctx.lineTo(x, edgeY + Math.sin(x * 0.13 + state.t * 2.2) * 12 - (Math.round(x) % 40 ? 6 : -6));
      }
      ctx.lineTo(IPAPER.w / 2 + 10, IPAPER.h / 2 + 20);
      ctx.closePath();
      ctx.fill();
      for (let x = -IPAPER.w / 2 + 6; x < IPAPER.w / 2; x += 34) {
        const fy = edgeY + Math.sin(x * 0.13 + state.t * 2.2) * 12;
        ctx.fillStyle = 'rgba(255,120,30,0.55)';
        ctx.fillRect(x - 12, fy - 3, 26, 6);
        drawFlame(x, fy, 0.8 + (Math.abs(Math.round(x)) % 3) * 0.3, state.t, x);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawGranny(t, sinceStrike) {
    const pose = armPose(t, sinceStrike, strikeAim, strikeAnticipate);
    ctx.save();
    // whole granny (body + arm pivot) leans into the blow
    ctx.translate(HIP.x, HIP.y);
    ctx.rotate(pose.lean);
    ctx.translate(-HIP.x, -HIP.y);
    // gentle breathing bob while idle
    const bob = Math.sin(t * 1.7) * 3 * (1 - swingActivity(sinceStrike, strikeAnticipate));
    if (art['granny-body']) {
      ctx.drawImage(art['granny-body'], BODY.x, BODY.y + bob, BODY.w, BODY.h);
    }
    // forearm first, upper arm over it — the rolled cuff hides the elbow seam
    const c = Math.cos(pose.shoulder), s = Math.sin(pose.shoulder);
    const ux = UPPER.ex - UPPER.shx, uy = UPPER.ey - UPPER.shy;
    if (art['granny-arm-fore']) {
      ctx.save();
      ctx.translate(PIVOT.x + ux * c - uy * s, PIVOT.y + bob + ux * s + uy * c);
      ctx.rotate(pose.shoulder + pose.elbow);
      ctx.drawImage(art['granny-arm-fore'], -FORE.ex, -FORE.ey, FORE.w, FORE.h);
      ctx.restore();
    }
    if (art['granny-arm-upper']) {
      ctx.save();
      ctx.translate(PIVOT.x, PIVOT.y + bob);
      ctx.rotate(pose.shoulder);
      ctx.drawImage(art['granny-arm-upper'], -UPPER.shx, -UPPER.shy, UPPER.w, UPPER.h);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawImpact(nowS) {
    // star lands with the slipper, whatever wind-up this blow was given
    const since = nowS - strikeAt - strikeAnticipate - DRIVE_S;
    if (since < 0 || since > 0.16) return;
    const k = 1 - since / 0.16;
    ctx.save();
    ctx.translate(strikeX, strikeY);
    ctx.strokeStyle = `rgba(179,38,30,${0.85 * k})`;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.4;
      const r1 = 20 + 10 * (1 - k), r2 = 52 + 26 * (1 - k);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(179,38,30,${k})`;
    ctx.font = `bold 54px ${KAI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('啪!', 6, -66);
    ctx.restore();
  }

  function drawDust(dust) {
    for (const p of dust) {
      ctx.fillStyle = `rgba(150,110,70,${p.life * 0.45})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTarget(pointer, mode) {
    if (!mode || !Number.isFinite(pointer.x)) return;
    ctx.strokeStyle = 'rgba(58,35,23,0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(58,35,23,0.45)';
    ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 4, 0, Math.PI * 2); ctx.fill();
  }

  function drawHud(state) {
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    ctx.font = `34px ${KAI}`;
    ctx.textAlign = 'right';
    ctx.fillText(`打咗 ${state.count} 下`, STAGE_W - 26, 26);
    if (state.mode === 'ritual') {
      ctx.textAlign = 'left';
      ctx.fillText(`淨返 ${Math.max(0, Math.ceil(state.remain))} 秒`, 26, 70);
    }
    if (state.comboFlash > 0 && state.combo >= 5) {
      ctx.globalAlpha = Math.min(1, state.comboFlash);
      ctx.textAlign = 'center';
      ctx.font = `64px ${KAI}`;
      ctx.strokeStyle = '#f2e3c8';
      ctx.lineWidth = 8;
      ctx.strokeText(`連環摑 ×${state.combo}!`, 360, 150);
      ctx.fillStyle = '#b3261e';
      ctx.fillText(`連環摑 ×${state.combo}!`, 360, 150);
      ctx.globalAlpha = 1;
    }
  }

  function draw(state) {
    const sinceStrike = state.t - strikeAt;
    drawBackdrop(state.t);
    if (art.bricks) ctx.drawImage(art.bricks, BRICKS.x, BRICKS.y, BRICKS.w, BRICKS.h);
    drawPaper(state);
    drawGranny(state.t, sinceStrike);
    drawImpact(state.t);
    drawDust(state.dust);
    drawTarget(state.pointer, state.mode);
    drawHud(state);
  }

  return { setEffigy, draw, strike, ready };
}
