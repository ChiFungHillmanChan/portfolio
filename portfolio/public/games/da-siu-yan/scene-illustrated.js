// Illustrated scene renderer: warm daylight, SVG-sprite granny who swings her
// slipper at the paper. Same draw(state) contract as scene.js. Pure helpers
// (swing envelope, rotated-paper hit test) are exported for node --test.
import { STAGE_W, STAGE_H } from './scene.js';

const KAI = '"Kaiti TC","楷體","DFKai-SB","BiauKai",serif';
const INK = '#3a2317';

// ── pure: arm swing ────────────────────────────────────────────────────────
export const ARM_IDLE = 0;          // authored pose: slipper raised overhead
export const ARM_STRIKE = -1.15;    // counterclockwise sweep down onto the paper
export const SWING_DOWN_S = 0.09;
export const SWING_BACK_S = 0.26;

// 0 = raised/idle, 1 = slipper on the paper. NaN/negative/ancient → 0.
export function swingPhase(since) {
  if (!(since >= 0)) return 0;
  if (since <= SWING_DOWN_S) {
    const u = since / SWING_DOWN_S;
    return u * u;                            // ease-in: the arm accelerates
  }
  const b = (since - SWING_DOWN_S) / SWING_BACK_S;
  if (b >= 1) return 0;
  const e = 1 - b;
  return e * e;                              // fast recoil, soft settle
}

export function armAngle(t, sinceStrike) {
  const phase = swingPhase(sinceStrike);
  const waggle = (Math.sin(t * 1.7) * 0.035 + Math.sin(t * 4.3) * 0.012) * (1 - phase);
  return ARM_IDLE + waggle + (ARM_STRIKE - ARM_IDLE) * phase;
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
const PIVOT = { x: 640, y: 640 };            // her right shoulder, stage coords
const ARM = { w: 380, h: 420, shx: 300, shy: 360 }; // shoulder point inside the SVG
const HIP = { x: 620, y: 980 };              // lean pivot
const BRICKS = { x: 0, y: 858, w: 432, h: 356 };

export function createIllustratedScene(canvas) {
  const ctx = canvas.getContext('2d');
  let name = '';
  let photo = null;
  let strikeAt = -Infinity;                  // seconds, performance.now()/1000
  let strikeX = IPAPER.cx, strikeY = IPAPER.cy;
  const art = {};

  const ready = Promise.all(
    ['granny-body', 'granny-arm', 'bricks'].map((n) => new Promise((resolve, reject) => {
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

  function strike(x, y, nowS) {
    strikeAt = nowS;
    strikeX = x; strikeY = y;
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
    const phase = swingPhase(sinceStrike);
    ctx.save();
    // whole granny (body + arm pivot) leans into the blow
    ctx.translate(HIP.x, HIP.y);
    ctx.rotate(-0.05 * phase);
    ctx.translate(-HIP.x, -HIP.y);
    // gentle breathing bob while idle
    const bob = Math.sin(t * 1.7) * 3 * (1 - phase);
    if (art['granny-body']) {
      ctx.drawImage(art['granny-body'], BODY.x, BODY.y + bob, BODY.w, BODY.h);
    }
    if (art['granny-arm']) {
      ctx.save();
      ctx.translate(PIVOT.x, PIVOT.y + bob);
      ctx.rotate(armAngle(t, sinceStrike));
      ctx.drawImage(art['granny-arm'], -ARM.shx, -ARM.shy, ARM.w, ARM.h);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawImpact(nowS) {
    const since = nowS - strikeAt - SWING_DOWN_S;   // star lands with the arm
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
