// Illustrated scene renderer: warm daylight, sprite granny (cut from the Canva
// artwork) who swings her slipper at the 小人紙 lying FLAT on the altar. Same
// draw(state) contract as scene.js.
//
// The geometry is no longer in this file: plane.js owns the ground plane the
// sheet lies in, rig.js owns the three-bone arm (shoulder → elbow → wrist →
// slipper) and its IK-solved strike pose. This file is only the paint pass, so
// the pure-function tests live in plane.test.js / rig.test.js.
import { STAGE_W, STAGE_H } from './scene.js';
import { PLANE, planeMatrix, planeToScreen, screenToPlane } from './plane.js';
import {
  FRAME, PIVOT, HIP, UPPERA, FOREA, HANDA,
  elbowAt, wristAt, armPose, swingActivity, aimFor,
  ANTICIPATE_S, DRIVE_S, AIM_LIMIT
} from './rig.js';

// game.js hit-tests the sheet through this module; the test itself is the
// plane's, so just pass it through.
export { inPaper } from './plane.js';

const KAI = '"Kaiti TC","楷體","DFKai-SB","BiauKai",serif';
const INK = '#3a2317';

// ── the altar ──────────────────────────────────────────────────────────────
// A slab whose TOP FACE IS THE SHEET'S OWN PLANE, oversailing it, with
// verticals dropped from the near edge for the front face. Built this way the
// paper cannot help but read as lying on the brick — the two come out of one
// matrix, so they foreshorten together.
// The oversail is deliberately asymmetric: you see much more of a table top in
// FRONT of what is on it than behind, and that unequal band is most of what
// tells the eye the brick is horizontal rather than a wall behind the sheet.
const ALTAR = { u: 58, vFar: 46, vNear: 96, drop: 100 };
// Chips and speckle scattered on the top face, in sheet-plane units. Courses
// deliberately do NOT go here: a brick GRID in this plane is indistinguishable
// from a brick wall behind the sheet, which is exactly the misread we are
// fixing. Courses belong on the front face, where a vertical surface is
// actually what we mean.
const SPECKLE = [
  [-196, -270, 34], [-96, -286, 22], [64, -292, 28], [176, -262, 24],
  [-210, 268, 30], [-104, 292, 26], [40, 286, 34], [178, 262, 22],
  [-208, 40, 26], [190, -60, 26], [-204, -120, 20], [196, 150, 30]
];
const BRICK_TOP = '#8a5a3b';
const BRICK_FRONT = '#6d4529';
const BRICK_LINE = 'rgba(58,35,23,0.45)';

// Where the wall stops and the ground begins. This HAS to sit above the
// altar's far corner (y≈812): a sheet lying on the ground cannot cross the
// horizon, and while it did, the whole slab read as a framed poster propped
// against a wall no matter how correct the plane maths was.
const FLOOR_Y = 780;

// ── the arm ────────────────────────────────────────────────────────────────
// Discs painted UNDER each sprite at its joint. They do two jobs: fill the
// wedge a rotation opens between two sprites, and — where the sprite has
// swung clear altogether — put a ROUND cap where the cutter's polygon edge
// would otherwise show as a torn-paper silhouette. So each radius is the
// limb's own half-width at that joint, not a token few pixels: measured off
// the sprites, the sleeve is ~98px across at the shoulder and the arm ~44px
// at the elbow. Colours sampled from the sprites (cut-granny-sprites.py).
const SKIN = 'rgb(219,102,32)';
const SLEEVE = 'rgb(210,159,2)';
const ELBOW_R = 22;
const SHOULDER_R = 46;

// At contact the hand's world rotation is shoulder+elbow+wrist ≈ -3.45 rad
// (~-197°), which is forced by the IK — the wrist has no freedom left once the
// two-bone solve has pinned the other joints. So the painted slipper arrives
// sole-up. FLIP_HAND mirrors the sprite across its own wrist→slipper axis,
// which turns the sole back down WITHOUT moving the slipper: the axis is
// fixed by the mirror, so the landing point rig.test.js guards is untouched.
// Flip it here to switch the whole scene.
const FLIP_HAND = false;
const HAND_ANG = Math.atan2(HANDA.sly - HANDA.wy, HANDA.slx - HANDA.wx);

// The effigy art was laid out for the old upright 264×424 poster. The flat
// sheet is 340×500 in its own plane, so scale the figure to keep it filling
// the same share of the paper — foreshortening already costs it half its
// screen height.
const EFFIGY_SCALE = 1.22;

const ART_FILES = {
  'granny-body': 'granny-body.png',
  'granny-arm-fore': 'granny-arm-fore.png',
  'granny-hand': 'granny-hand.png',
  'granny-arm-upper': 'granny-arm-upper.png',
  'granny-head': 'granny-head.png'
};

export function createIllustratedScene(canvas) {
  const ctx = canvas.getContext('2d');
  let name = '';
  let photo = null;
  let strikeAt = -Infinity;                  // seconds, performance.now()/1000
  let strikeX = PLANE.cx, strikeY = PLANE.cy;
  let strikeAim = 0;
  let strikeAnticipate = ANTICIPATE_S;
  const art = {};

  const ready = Promise.all(
    Object.entries(ART_FILES).map(([n, file]) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { art[n] = img; resolve(); };
      img.onerror = () => reject(new Error(`art/${file} failed to load`));
      img.src = `./art/${file}`;
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
    ctx.fillRect(0, FLOOR_Y, STAGE_W, STAGE_H - FLOOR_Y);
    ctx.strokeStyle = 'rgba(58,35,23,0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, FLOOR_Y); ctx.lineTo(STAGE_W, FLOOR_Y); ctx.stroke();
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
    ctx.beginPath(); ctx.ellipse(475, 1190, 235, 28, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawAltar() {
    const hu = PLANE.w / 2 + ALTAR.u;
    const vFar = -(PLANE.h / 2 + ALTAR.vFar), vNear = PLANE.h / 2 + ALTAR.vNear;
    const bl = planeToScreen(-hu, vNear), br = planeToScreen(hu, vNear);
    ctx.save();                                  // lineJoin/lineCap stay local
    // front face, in screen space: verticals dropped from the near edge
    ctx.fillStyle = BRICK_FRONT;
    ctx.beginPath();
    ctx.moveTo(bl.x, bl.y); ctx.lineTo(br.x, br.y);
    ctx.lineTo(br.x, br.y + ALTAR.drop); ctx.lineTo(bl.x, bl.y + ALTAR.drop);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = BRICK_LINE; ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.stroke();
    // two courses and staggered joints — this face IS vertical, so brick
    // coursing is the right texture for it
    ctx.lineWidth = 3;
    for (const k of [1 / 3, 2 / 3]) {
      ctx.beginPath();
      ctx.moveTo(bl.x, bl.y + ALTAR.drop * k);
      ctx.lineTo(br.x, br.y + ALTAR.drop * k);
      ctx.stroke();
    }
    for (const [s, k0, k1] of [[0.18, 0, 1 / 3], [0.46, 0, 1 / 3], [0.74, 0, 1 / 3],
      [0.32, 1 / 3, 2 / 3], [0.62, 1 / 3, 2 / 3], [0.88, 1 / 3, 2 / 3],
      [0.2, 2 / 3, 1], [0.5, 2 / 3, 1], [0.8, 2 / 3, 1]]) {
      const px = bl.x + (br.x - bl.x) * s, py = bl.y + (br.y - bl.y) * s;
      ctx.beginPath();
      ctx.moveTo(px, py + ALTAR.drop * k0);
      ctx.lineTo(px, py + ALTAR.drop * k1);
      ctx.stroke();
    }
    // top face, drawn INSIDE the plane transform: it and the sheet come out of
    // the same matrix, so the paper cannot help but sit ON it
    ctx.save();
    ctx.transform(...planeMatrix());
    ctx.beginPath();
    ctx.rect(-hu, vFar, hu * 2, vNear - vFar);
    ctx.fillStyle = BRICK_TOP;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // worn chips, foreshortened with the surface — texture, not architecture
    ctx.strokeStyle = 'rgba(58,35,23,0.28)';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    for (const [u, v, len] of SPECKLE) {
      ctx.beginPath(); ctx.moveTo(u, v); ctx.lineTo(u + len, v - 6); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(217,144,108,0.40)';
    ctx.lineWidth = 6;
    for (const [u, v, len] of SPECKLE) {
      ctx.beginPath(); ctx.moveTo(u + 6, v + 16); ctx.lineTo(u + len - 4, v + 11); ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.rect(-hu, vFar, hu * 2, vNear - vFar);
    ctx.strokeStyle = BRICK_LINE;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();                               // plane transform
    ctx.restore();                               // lineJoin/lineCap
  }

  function paperPathLocal(inset) {
    ctx.beginPath();
    ctx.roundRect(-PLANE.w / 2 + inset, -PLANE.h / 2 + inset,
      PLANE.w - inset * 2, PLANE.h - inset * 2, 8);
  }

  function drawVillainLocal() {
    // sheet-local coords: origin at the sheet centre, y already foreshortened
    // by the plane matrix the caller installed
    ctx.save();
    ctx.scale(EFFIGY_SCALE, EFFIGY_SCALE);
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
    ctx.restore();
    if (name) {
      ctx.fillStyle = INK;
      ctx.font = `40px ${KAI}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const chars = [...name].slice(0, 8);
      const gap = Math.min(46, (PLANE.h - 120) / chars.length);
      chars.forEach((ch, i) => ctx.fillText(ch, PLANE.w / 2 - 34, -PLANE.h / 2 + 96 + i * gap));
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
      // torn corners — the bite now reveals the brick under the sheet
      ctx.fillStyle = BRICK_TOP;
      ctx.beginPath();
      ctx.moveTo(-PLANE.w / 2 - 2, -PLANE.h / 2 - 2);
      ctx.lineTo(-PLANE.w / 2 + 40, -PLANE.h / 2 - 2);
      ctx.lineTo(-PLANE.w / 2 - 2, -PLANE.h / 2 + 34);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(PLANE.w / 2 + 2, PLANE.h / 2 + 2);
      ctx.lineTo(PLANE.w / 2 - 44, PLANE.h / 2 + 2);
      ctx.lineTo(PLANE.w / 2 + 2, PLANE.h / 2 - 36);
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
      const { u, v } = screenToPlane(p.x, p.y);
      const alpha = 0.12 + 0.26 * ((i + 1) / prints.length);
      ctx.save();
      ctx.translate(u, v);
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
    // Flames belong to the air, not to the sheet: collect them in sheet-local
    // coords, then draw them in SCREEN space once the plane transform is off,
    // so the tongues rise vertically instead of leaning with the paper.
    const flames = [];
    ctx.save();
    const [a, b, c, d, e, f] = planeMatrix();
    ctx.transform(a, b, c, d, e, f);
    ctx.rotate((state.stage - 1.5) * 0.005 * Math.min(state.stage, 1));
    ctx.shadowColor = 'rgba(58,35,23,0.35)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#eed155';
    paperPathLocal(0);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    const pg = ctx.createLinearGradient(-PLANE.w / 2, -PLANE.h / 2, PLANE.w / 2, PLANE.h / 2);
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
    ctx.fillText('打小人', 0, -PLANE.h / 2 + 44);
    drawVillainLocal();
    drawDamageLocal(state.stage);
    drawPrintsLocal(state.prints);
    if (state.burnT > 0) {
      const burnH = state.burnT * (PLANE.h + 40);
      const edgeY = PLANE.h / 2 - burnH;
      ctx.save();
      paperPathLocal(0);
      ctx.clip();
      ctx.fillStyle = 'rgba(24,12,7,0.94)';
      ctx.beginPath();
      ctx.moveTo(-PLANE.w / 2 - 10, PLANE.h / 2 + 20);
      ctx.lineTo(-PLANE.w / 2 - 10, edgeY);
      for (let x = -PLANE.w / 2 - 10; x <= PLANE.w / 2 + 10; x += 20) {
        ctx.lineTo(x, edgeY + Math.sin(x * 0.13 + state.t * 2.2) * 12 - (Math.round(x) % 40 ? 6 : -6));
      }
      ctx.lineTo(PLANE.w / 2 + 10, PLANE.h / 2 + 20);
      ctx.closePath();
      ctx.fill();
      for (let x = -PLANE.w / 2 + 6; x < PLANE.w / 2; x += 34) {
        const fy = edgeY + Math.sin(x * 0.13 + state.t * 2.2) * 12;
        ctx.fillStyle = 'rgba(255,120,30,0.55)';
        ctx.fillRect(x - 12, fy - 3, 26, 6);       // the ember line is on the sheet
        const p = planeToScreen(x, fy);
        flames.push({ x: p.x, y: p.y, s: 0.8 + (Math.abs(Math.round(x)) % 3) * 0.3, seed: x });
      }
      ctx.restore();
    }
    ctx.restore();
    for (const fl of flames) drawFlame(fl.x, fl.y, fl.s, state.t, fl.seed);
  }

  // Shared per-frame granny numbers so the behind-the-altar body pass and the
  // in-front arm pass stay in lockstep.
  function grannyFrame(t, sinceStrike) {
    const pose = armPose(t, sinceStrike, strikeAim, strikeAnticipate);
    const bob = Math.sin(t * 1.7) * 3 * (1 - swingActivity(sinceStrike, strikeAnticipate));
    return { pose, bob };
  }

  function leanIn(pose) {
    // whole granny (body + arm pivot) leans into the blow
    ctx.save();
    ctx.translate(HIP.x, HIP.y);
    ctx.rotate(pose.lean);
    ctx.translate(-HIP.x, -HIP.y);
  }

  function jointDisc(x, y, r, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Body only — drawn before the altar and sheet so she sits behind them,
  // exactly like the source artwork's composition.
  function drawGrannyBack(t, sinceStrike) {
    if (!art['granny-body']) return;
    const { pose, bob } = grannyFrame(t, sinceStrike);
    leanIn(pose);
    ctx.drawImage(art['granny-body'], FRAME.x, FRAME.y + bob, FRAME.w, FRAME.h);
    ctx.restore();
  }

  // The swinging arm and the head overlay — drawn after the sheet so the
  // slipper lands ON it. Order is forearm → hand → sleeve → head: each sprite
  // covers the seam of the one before it, and the sleeve tucks under her jaw.
  function drawGrannyFront(t, sinceStrike) {
    const { pose, bob } = grannyFrame(t, sinceStrike);
    leanIn(pose);
    const el = elbowAt(pose.shoulder);
    const wr = wristAt(pose.shoulder, pose.elbow);
    if (art['granny-arm-fore']) {
      jointDisc(el.x, el.y + bob, ELBOW_R, SKIN);
      ctx.save();
      ctx.translate(el.x, el.y + bob);
      ctx.rotate(pose.shoulder + pose.elbow);
      ctx.drawImage(art['granny-arm-fore'], -FOREA.ex, -FOREA.ey, FRAME.w, FRAME.h);
      ctx.restore();
    }
    if (art['granny-hand']) {
      ctx.save();
      ctx.translate(wr.x, wr.y + bob);
      ctx.rotate(pose.shoulder + pose.elbow + pose.wrist);
      if (FLIP_HAND) {
        // mirror across the wrist→slipper axis: the sole turns over, the
        // slipper does not move
        ctx.rotate(HAND_ANG);
        ctx.scale(1, -1);
        ctx.rotate(-HAND_ANG);
      }
      ctx.drawImage(art['granny-hand'], -HANDA.wx, -HANDA.wy, FRAME.w, FRAME.h);
      ctx.restore();
    }
    if (art['granny-arm-upper']) {
      jointDisc(PIVOT.x, PIVOT.y + bob, SHOULDER_R, SLEEVE);
      ctx.save();
      ctx.translate(PIVOT.x, PIVOT.y + bob);
      ctx.rotate(pose.shoulder);
      ctx.drawImage(art['granny-arm-upper'], -UPPERA.shx, -UPPERA.shy, FRAME.w, FRAME.h);
      ctx.restore();
    }
    if (art['granny-head']) {
      ctx.drawImage(art['granny-head'], FRAME.x, FRAME.y + bob, FRAME.w, FRAME.h);
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
    } else if (state.mode === 'free') {
      ctx.textAlign = 'left';
      ctx.fillText(`打咗 ${Math.max(0, Math.floor(state.elapsed || 0))} 秒`, 26, 70);
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
    drawGrannyBack(state.t, sinceStrike);
    drawAltar();
    drawPaper(state);
    drawGrannyFront(state.t, sinceStrike);
    drawImpact(state.t);
    drawDust(state.dust);
    drawTarget(state.pointer, state.mode);
    drawHud(state);
  }

  return { setEffigy, draw, strike, ready };
}
