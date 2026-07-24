// Canvas renderer for the 720x1280 stage. Pure drawing — all state comes in
// via draw(state); the only retained inputs are the effigy name/photo.
export const STAGE_W = 720;
export const STAGE_H = 1280;
export const PAPER = { x: 190, y: 420, w: 340, h: 560 };

const KAI = '"Kaiti TC","楷體","DFKai-SB","BiauKai",serif';
const INK = '#2a1a10';

export function createScene(canvas) {
  const ctx = canvas.getContext('2d');
  let name = '';
  let photo = null;

  function setEffigy(e) {
    name = (e.name || '').trim();
    photo = e.photo || null;
  }

  function drawGround(t) {
    ctx.fillStyle = '#241511';
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    // brick courses
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 3;
    for (let y = 0; y < STAGE_H; y += 80) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(STAGE_W, y); ctx.stroke();
      const off = (y / 80) % 2 ? 90 : 0;
      for (let x = off; x < STAGE_W; x += 180) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 80); ctx.stroke();
      }
    }
    // candle-light pool with a slow flicker
    const flick = 1 + Math.sin(t * 9) * 0.02 + Math.sin(t * 23) * 0.012;
    const g = ctx.createRadialGradient(360, 700, 80, 360, 700, 620 * flick);
    g.addColorStop(0, 'rgba(255,180,80,0.30)');
    g.addColorStop(0.55, 'rgba(255,140,50,0.10)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
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

  function drawCandles(t) {
    for (const [cx, seed] of [[74, 1], [646, 7]]) {
      ctx.fillStyle = '#c9302c';
      ctx.fillRect(cx - 13, 1010, 26, 92);
      ctx.fillStyle = '#8f1f1c';
      ctx.fillRect(cx - 13, 1010, 26, 8);
      ctx.strokeStyle = '#f3e6c8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, 1010); ctx.lineTo(cx, 1000); ctx.stroke();
      drawFlame(cx, 1000, 1, t, seed);
    }
  }

  function drawIncense(t) {
    // pot
    ctx.fillStyle = '#5d4a2f';
    ctx.beginPath();
    ctx.ellipse(360, 300, 60, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a6340';
    ctx.beginPath();
    ctx.ellipse(360, 288, 60, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d2f1c';
    ctx.beginPath();
    ctx.ellipse(360, 288, 46, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    // three sticks + embers + smoke
    for (const [dx, lean, seed] of [[-24, -0.06, 2], [0, 0, 5], [24, 0.06, 9]]) {
      const topX = 360 + dx + lean * 130, topY = 168;
      ctx.strokeStyle = '#8a2b1e'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(360 + dx, 288); ctx.lineTo(topX, topY); ctx.stroke();
      ctx.fillStyle = `rgba(255,${120 + Math.floor(Math.sin(t * 6 + seed) * 40 + 60)},60,0.95)`;
      ctx.beginPath(); ctx.arc(topX, topY, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(210,200,190,0.28)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(topX, topY - 4);
      for (let i = 1; i <= 5; i++) {
        ctx.lineTo(topX + Math.sin(t * 1.4 + seed + i * 1.7) * (5 + i * 4), topY - 4 - i * 22);
      }
      ctx.stroke();
    }
  }

  function paperPath(inset) {
    const { x, y, w, h } = PAPER;
    const r = 10;
    ctx.beginPath();
    ctx.roundRect(x + inset, y + inset, w - inset * 2, h - inset * 2, r);
  }

  function drawVillain() {
    const cx = 360;
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    if (photo) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx - 30, 640, 100, 150, 0, 0, Math.PI * 2);
      ctx.clip();
      const s = Math.max(200 / photo.width, 300 / photo.height);
      ctx.drawImage(photo, cx - 30 - (photo.width * s) / 2, 640 - (photo.height * s) / 2,
        photo.width * s, photo.height * s);
      ctx.restore();
      ctx.beginPath();
      ctx.ellipse(cx - 30, 640, 100, 150, 0, 0, Math.PI * 2);
      ctx.stroke();
      // stick limbs under the portrait keep it reading as the paper doll
      ctx.beginPath(); ctx.moveTo(cx - 30, 790); ctx.lineTo(cx - 80, 900); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 30, 790); ctx.lineTo(cx + 20, 900); ctx.stroke();
    } else {
      // classic effigy silhouette: head, trunk, straight limbs
      ctx.beginPath(); ctx.arc(cx - 30, 560, 48, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 75, 620); ctx.lineTo(cx + 15, 620);
      ctx.lineTo(cx + 32, 800); ctx.lineTo(cx - 92, 800);
      ctx.closePath(); ctx.fill();
      ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(cx - 72, 640); ctx.lineTo(cx - 128, 750); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 12, 640); ctx.lineTo(cx + 62, 750); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 62, 800); ctx.lineTo(cx - 74, 930); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 2, 800); ctx.lineTo(cx + 22, 930); ctx.stroke();
    }
    // vertical name down the right edge of the paper
    if (name) {
      ctx.fillStyle = INK;
      ctx.font = `54px ${KAI}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const chars = [...name].slice(0, 8);
      const startY = 480;
      const gap = Math.min(62, (PAPER.h - 120) / chars.length);
      chars.forEach((ch, i) => ctx.fillText(ch, PAPER.x + PAPER.w - 46, startY + i * gap));
    }
  }

  function drawDamage(stage) {
    if (stage < 1) return;
    ctx.strokeStyle = 'rgba(122,90,48,0.5)';
    ctx.lineWidth = 2;
    const creases = [
      [220, 500, 340, 470], [480, 560, 380, 620], [230, 760, 350, 800],
      [500, 820, 400, 880], [260, 900, 330, 860], [450, 470, 500, 520]
    ];
    const n = stage === 1 ? 2 : stage === 2 ? 4 : 6;
    for (let i = 0; i < n; i++) {
      const [a, b, c, d] = creases[i];
      ctx.beginPath(); ctx.moveTo(a, b);
      ctx.lineTo((a + c) / 2 + 12, (b + d) / 2 - 8);
      ctx.lineTo(c, d); ctx.stroke();
    }
    if (stage >= 2) {
      // torn corners — bg-colored bites over the paper corners
      ctx.fillStyle = '#241511';
      ctx.beginPath();
      ctx.moveTo(PAPER.x - 2, PAPER.y - 2); ctx.lineTo(PAPER.x + 46, PAPER.y - 2);
      ctx.lineTo(PAPER.x - 2, PAPER.y + 38); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(PAPER.x + PAPER.w + 2, PAPER.y + PAPER.h + 2);
      ctx.lineTo(PAPER.x + PAPER.w - 52, PAPER.y + PAPER.h + 2);
      ctx.lineTo(PAPER.x + PAPER.w + 2, PAPER.y + PAPER.h - 40);
      ctx.closePath(); ctx.fill();
    }
    if (stage >= 3) {
      ctx.fillStyle = 'rgba(90,60,30,0.18)';
      for (const [bx, by, br] of [[300, 600, 70], [430, 750, 90], [280, 860, 60]]) {
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawPrints(prints) {
    for (let i = 0; i < prints.length; i++) {
      const p = prints[i];
      const alpha = 0.12 + 0.26 * ((i + 1) / prints.length);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = `rgba(74,44,22,${alpha})`;
      ctx.beginPath(); ctx.ellipse(0, 0, 34, 62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(36,21,17,${alpha})`;
      for (let b = -1; b <= 1; b++) {
        ctx.fillRect(-24, b * 26 - 5, 48, 10);
      }
      ctx.restore();
    }
  }

  function drawPaper(state) {
    ctx.save();
    // battered paper sits slightly rotated as damage grows
    ctx.translate(360, 700);
    ctx.rotate((state.stage - 1.5) * 0.006 * Math.min(state.stage, 1));
    ctx.translate(-360, -700);
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#e8c95a';
    paperPath(0);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    const pg = ctx.createLinearGradient(PAPER.x, PAPER.y, PAPER.x + PAPER.w, PAPER.y + PAPER.h);
    pg.addColorStop(0, 'rgba(255,240,190,0.35)');
    pg.addColorStop(1, 'rgba(160,110,40,0.28)');
    ctx.fillStyle = pg;
    paperPath(0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(122,64,20,0.7)';
    ctx.lineWidth = 3;
    paperPath(4);
    ctx.stroke();
    drawVillain();
    drawDamage(state.stage);
    drawPrints(state.prints);
    // burn overlay: char creeping up from the bottom with a ragged edge
    if (state.burnT > 0) {
      const burnH = state.burnT * (PAPER.h + 40);
      const edgeY = PAPER.y + PAPER.h - burnH;
      ctx.save();
      paperPath(0);
      ctx.clip();
      ctx.fillStyle = 'rgba(20,10,6,0.94)';
      ctx.beginPath();
      ctx.moveTo(PAPER.x - 10, PAPER.y + PAPER.h + 20);
      ctx.lineTo(PAPER.x - 10, edgeY);
      for (let x = PAPER.x - 10; x <= PAPER.x + PAPER.w + 10; x += 20) {
        ctx.lineTo(x, edgeY + Math.sin(x * 0.13 + state.t * 2.2) * 12 - (x % 40 ? 6 : -6));
      }
      ctx.lineTo(PAPER.x + PAPER.w + 10, PAPER.y + PAPER.h + 20);
      ctx.closePath();
      ctx.fill();
      // glowing rim + flame tongues riding the char edge
      for (let x = PAPER.x + 6; x < PAPER.x + PAPER.w; x += 34) {
        const fy = edgeY + Math.sin(x * 0.13 + state.t * 2.2) * 12;
        ctx.fillStyle = 'rgba(255,120,30,0.55)';
        ctx.fillRect(x - 12, fy - 3, 26, 6);
        drawFlame(x, fy, 0.8 + (x % 3) * 0.3, state.t, x);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawDust(dust) {
    for (const p of dust) {
      ctx.fillStyle = `rgba(190,160,110,${p.life * 0.5})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSlipper(pointer) {
    if (!Number.isFinite(pointer.x)) return;
    const squash = pointer.down ? 0.85 : 1;
    ctx.save();
    ctx.translate(pointer.x, pointer.y);
    ctx.rotate(-0.28);
    ctx.scale(squash, squash);
    if (!pointer.down) {
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 18;
    }
    // sole
    ctx.fillStyle = '#8a2b1e';
    ctx.beginPath();
    ctx.moveTo(0, -96);
    ctx.bezierCurveTo(52, -96, 56, -30, 44, 40);
    ctx.bezierCurveTo(36, 92, -36, 92, -44, 40);
    ctx.bezierCurveTo(-56, -30, -52, -96, 0, -96);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#a8442f';
    ctx.beginPath();
    ctx.moveTo(0, -86);
    ctx.bezierCurveTo(44, -86, 48, -28, 37, 36);
    ctx.bezierCurveTo(30, 80, -30, 80, -37, 36);
    ctx.bezierCurveTo(-48, -28, -44, -86, 0, -86);
    ctx.closePath();
    ctx.fill();
    // cross strap
    ctx.strokeStyle = '#5d1c12';
    ctx.lineWidth = 20;
    ctx.beginPath(); ctx.moveTo(-40, -22); ctx.lineTo(38, -52); ctx.stroke();
    ctx.strokeStyle = '#71241a';
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(-40, -22); ctx.lineTo(38, -52); ctx.stroke();
    ctx.restore();
  }

  function drawHud(state) {
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#f3e6c8';
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
      ctx.strokeStyle = INK;
      ctx.lineWidth = 8;
      ctx.strokeText(`連環摑 ×${state.combo}!`, 360, 150);
      ctx.fillStyle = '#e8c95a';
      ctx.fillText(`連環摑 ×${state.combo}!`, 360, 150);
      ctx.globalAlpha = 1;
    }
  }

  function draw(state) {
    drawGround(state.t);
    drawIncense(state.t);
    drawPaper(state);
    drawCandles(state.t);
    drawDust(state.dust);
    drawSlipper(state.pointer);
    drawHud(state);
  }

  return { setEffigy, draw };
}
