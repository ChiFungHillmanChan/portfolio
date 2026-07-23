// Orchestrator: screens, input, modes, recording. All gameplay renders into
// the fixed 720x1280 stage canvas; DOM overlays handle entry/end screens.
import { createScene, PAPER, STAGE_W, STAGE_H } from './scene.js';
import { createIllustratedScene, inPaper as inIllustratedPaper } from './scene-illustrated.js';
import { createDamage } from './damage-model.js';
import { buildRitualSchedule, createSequencer, createShuffleLooper, RITUAL_SECONDS, BURN_AT } from './chant-sequencer.js';
import { createRecorder, extFor } from './recorder.js';
import { createAudioEngine } from './audio.js';
import { INTRO, LINES } from './chant-lines.js';

const app = document.getElementById('app');
app.innerHTML = `
  <div id="stage-wrap">
    <canvas id="stage" width="${STAGE_W}" height="${STAGE_H}"></canvas>
    <button id="hud-stop" hidden>收手</button>
    <div id="entry" class="overlay">
      <h1>打小人</h1>
      <p class="sub">寫低個小人係邊個,或者上載佢張相,<br>等阿婆同你出啖氣。</p>
      <input id="name-input" type="text" maxlength="12" placeholder="小人姓名(可留空)" />
      <button id="photo-btn" class="file-btn" type="button">上載小人相(可留空)</button>
      <input id="photo-input" type="file" accept="image/*" />
      <div class="toggle" role="group" aria-label="聲線">
        <button id="voice-std" type="button" aria-pressed="true">標準阿婆</button>
        <button id="voice-low" type="button" aria-pressed="false">低沉版</button>
      </div>
      <div class="toggle" role="group" aria-label="畫風">
        <button id="style-illu" type="button" aria-pressed="true">插畫版</button>
        <button id="style-classic" type="button" aria-pressed="false">經典版</button>
      </div>
      <button id="start-ritual" class="mode-btn primary" type="button">開壇(一分鐘・自動錄影)</button>
      <button id="start-free" class="mode-btn" type="button">任摑(無限熱身)</button>
      <p class="fineprint">名同相只喺你部機處理,唔會上載去任何地方。<br>娛樂用途,旨在祈福減壓。聲音由 AI 生成。</p>
    </div>
    <div id="end" class="overlay" hidden></div>
  </div>`;

const canvas = document.getElementById('stage');
const entryEl = document.getElementById('entry');
const endEl = document.getElementById('end');
const stopBtn = document.getElementById('hud-stop');
const nameInput = document.getElementById('name-input');
const photoBtn = document.getElementById('photo-btn');
const photoInput = document.getElementById('photo-input');
const voiceBtns = { std: document.getElementById('voice-std'), low: document.getElementById('voice-low') };
const styleBtns = { illu: document.getElementById('style-illu'), classic: document.getElementById('style-classic') };

const scenes = { classic: createScene(canvas), illu: createIllustratedScene(canvas) };
let style = 'illu';
const scene = () => scenes[style];
let audio = null;               // created on first user gesture
let variant = 'std';
let photoCanvas = null;

let mode = null;                // null | 'ritual' | 'free'
let damage = null;
let seq = null;
let looper = null;
let nextFreeClipAt = 0;
let rec = null;
let recBlob = null;
let rafId = 0;
let comboFlash = 0;
let lastCombo = 0;
let burnT = 0;
let lastFrame = 0;
const pointer = { x: NaN, y: NaN, down: false };
const dust = [];

// ── entry screen wiring ────────────────────────────────────────────────────
photoBtn.addEventListener('click', () => photoInput.click());
photoInput.addEventListener('change', async () => {
  const file = photoInput.files && photoInput.files[0];
  if (!file) return;
  try {
    photoCanvas = await downscale(file, 1024);
    photoBtn.textContent = '相已上載(撳一下再換)';
  } catch (err) {
    console.warn('photo decode failed', err);
    photoBtn.textContent = '張相讀唔到,試過另一張';
    photoCanvas = null;
  }
});

async function downscale(file, cap) {
  let bmp;
  if ('createImageBitmap' in window) {
    bmp = await createImageBitmap(file);
  } else {
    bmp = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
  const s = Math.min(1, cap / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}

for (const [key, btn] of Object.entries(voiceBtns)) {
  btn.addEventListener('click', () => {
    variant = key;
    voiceBtns.std.setAttribute('aria-pressed', String(key === 'std'));
    voiceBtns.low.setAttribute('aria-pressed', String(key === 'low'));
  });
}

for (const [key, btn] of Object.entries(styleBtns)) {
  btn.addEventListener('click', () => {
    style = key;
    styleBtns.illu.setAttribute('aria-pressed', String(key === 'illu'));
    styleBtns.classic.setAttribute('aria-pressed', String(key === 'classic'));
  });
}

document.getElementById('start-ritual').addEventListener('click', () => start('ritual'));
document.getElementById('start-free').addEventListener('click', () => start('free'));
stopBtn.addEventListener('click', () => stop());

// ── input on the stage ─────────────────────────────────────────────────────
function toStage(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (STAGE_W / r.width), y: (e.clientY - r.top) * (STAGE_H / r.height) };
}
canvas.addEventListener('pointermove', (e) => {
  const p = toStage(e);
  pointer.x = p.x; pointer.y = p.y;
});
canvas.addEventListener('pointerdown', (e) => {
  const p = toStage(e);
  pointer.x = p.x; pointer.y = p.y;
  if (!mode) return;
  pointer.down = true;
  audio.smack();
  if (navigator.vibrate) navigator.vibrate(30);
  spawnDust(p.x, p.y);
  const inPaper = style === 'illu'
    ? inIllustratedPaper(p.x, p.y)
    : p.x >= PAPER.x && p.x <= PAPER.x + PAPER.w && p.y >= PAPER.y && p.y <= PAPER.y + PAPER.h;
  if (inPaper) {
    const r = damage.hit(p.x, p.y, performance.now());
    lastCombo = r.combo;
    if (r.comboBurst) comboFlash = 1.4;
    if (style === 'illu') scenes.illu.strike(p.x, p.y, performance.now() / 1000);
  }
});
canvas.addEventListener('pointerup', () => { pointer.down = false; });
canvas.addEventListener('pointercancel', () => { pointer.down = false; });

function spawnDust(x, y) {
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    dust.push({ x, y, vx: Math.cos(a) * (60 + Math.random() * 160), vy: Math.sin(a) * (60 + Math.random() * 160) - 60, r: 2 + Math.random() * 4, life: 1 });
  }
}

// ── mode lifecycle ─────────────────────────────────────────────────────────
async function start(which) {
  if (mode) return;
  if (!audio) audio = createAudioEngine();
  await audio.unlock();                       // must stay inside the gesture
  entryEl.hidden = true;
  stopBtn.textContent = which === 'ritual' ? '早收陣' : '收手';
  stopBtn.hidden = false;
  scene().setEffigy({ name: nameInput.value, photo: photoCanvas });
  if (style === 'illu') await scenes.illu.ready;   // sprites in before first frame
  try {
    await audio.loadVariant(variant);
  } catch (err) {
    console.warn('voice load failed (offline first visit?)', err);
  }
  audio.startAmbient();
  damage = createDamage();
  comboFlash = 0; lastCombo = 0; burnT = 0; recBlob = null;
  mode = which;
  const nowS = performance.now() / 1000;
  if (which === 'ritual') {
    const manifest = await (await fetch('./voice/manifest.json')).json();
    seq = createSequencer(buildRitualSchedule(manifest[variant], Math.random));
    seq.start(nowS);
    const stream = new MediaStream([
      ...canvas.captureStream(30).getVideoTracks(),
      ...audio.dest.stream.getAudioTracks()
    ]);
    rec = createRecorder(stream);
    if (rec) rec.start();
  } else {
    const ids = [INTRO.id, ...LINES.map((l) => l.id)];
    looper = createShuffleLooper(ids, Math.random);
    nextFreeClipAt = nowS + 0.6;
  }
  lastFrame = performance.now();
  rafId = requestAnimationFrame(frame);
}

async function stop() {
  if (!mode) return;
  const finished = mode;
  mode = null;
  cancelAnimationFrame(rafId);
  stopBtn.hidden = true;
  audio.stopAll();
  seq = null; looper = null;
  if (rec) {
    recBlob = await rec.stop();
    rec = null;
  }
  showEnd(finished);
}

function frame(nowMs) {
  if (!mode) return;
  const dt = Math.min(0.1, (nowMs - lastFrame) / 1000);
  lastFrame = nowMs;
  const nowS = nowMs / 1000;

  if (mode === 'ritual' && seq) {
    for (const id of seq.tick(nowS)) audio.playClip(id);
    const t = seq.elapsed(nowS);
    if (t >= BURN_AT) burnT = Math.min(1, (t - BURN_AT) / (RITUAL_SECONDS - BURN_AT));
    if (t >= RITUAL_SECONDS) { stop(); return; }
  } else if (mode === 'free' && nowS >= nextFreeClipAt) {
    const dur = audio.playClip(looper());
    nextFreeClipAt = nowS + dur + 1.2;
  }

  comboFlash = Math.max(0, comboFlash - dt * 0.9);
  for (const p of dust) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; p.life -= dt * 1.6;
  }
  for (let i = dust.length - 1; i >= 0; i--) if (dust[i].life <= 0) dust.splice(i, 1);

  const d = damage.state();
  scene().draw({
    t: nowS,
    pointer,
    prints: d.prints,
    stage: d.stage,
    count: d.count,
    combo: lastCombo,
    comboFlash,
    burnT,
    dust,
    mode,
    remain: mode === 'ritual' && seq ? RITUAL_SECONDS - seq.elapsed(nowS) : 0
  });
  rafId = requestAnimationFrame(frame);
}

// ── end screen ─────────────────────────────────────────────────────────────
let videoUrl = null;
function showEnd(finished) {
  const count = damage.state().count;
  endEl.innerHTML = '';
  const h = document.createElement('h1');
  h.textContent = `打咗 ${count} 下!`;
  endEl.appendChild(h);

  if (finished === 'ritual') {
    if (recBlob && recBlob.size > 0) {
      const video = document.createElement('video');
      video.id = 'end-video';
      video.controls = true;
      video.setAttribute('playsinline', '');
      videoUrl = URL.createObjectURL(recBlob);
      video.src = videoUrl;
      endEl.appendChild(video);

      const row = document.createElement('div');
      row.className = 'end-row';
      const ext = extFor(recBlob.type);
      const save = document.createElement('a');
      save.className = 'end-btn';
      save.textContent = '儲存';
      save.href = videoUrl;
      save.download = `da-siu-yan.${ext}`;
      row.appendChild(save);

      const file = new File([recBlob], `da-siu-yan.${ext}`, { type: recBlob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        const share = document.createElement('button');
        share.className = 'end-btn';
        share.textContent = '分享';
        share.addEventListener('click', () => {
          navigator.share({ files: [file], title: '打小人' }).catch(() => { /* user cancelled */ });
        });
        row.appendChild(share);
      }
      endEl.appendChild(row);
      const note = document.createElement('p');
      note.className = 'fineprint';
      note.textContent = '條片淨係喺你部機入面,唔儲存就會冇咗。';
      endEl.appendChild(note);
    } else {
      const p = document.createElement('p');
      p.className = 'sub';
      p.textContent = '此瀏覽器唔支援錄影,今次冇得儲低。';
      endEl.appendChild(p);
    }
  }

  const row2 = document.createElement('div');
  row2.className = 'end-row';
  const again = document.createElement('button');
  again.className = 'end-btn';
  again.textContent = '再打過';
  again.addEventListener('click', () => backToEntry());
  row2.appendChild(again);
  if (finished === 'ritual' && recBlob) {
    const discard = document.createElement('button');
    discard.className = 'end-btn';
    discard.textContent = '唔要喇';
    discard.addEventListener('click', () => backToEntry());
    row2.appendChild(discard);
  }
  endEl.appendChild(row2);
  endEl.hidden = false;
}

function backToEntry() {
  if (videoUrl) { URL.revokeObjectURL(videoUrl); videoUrl = null; }
  recBlob = null;
  endEl.hidden = true;
  entryEl.hidden = false;
}

// ── background/foreground ──────────────────────────────────────────────────
document.addEventListener('visibilitychange', () => {
  if (!mode) return;
  const nowS = performance.now() / 1000;
  if (document.hidden) {
    if (seq) seq.pause(nowS);
    if (rec) rec.pause();
    if (audio) audio.ctx.suspend();
  } else {
    if (seq) seq.resume(performance.now() / 1000);
    if (rec) rec.resume();
    if (audio) audio.ctx.resume();
    lastFrame = performance.now();
  }
});

// idle attract loop behind the entry overlay
(function idle() {
  if (!mode) {
    scene().draw({ t: performance.now() / 1000, pointer, prints: [], stage: 0, count: 0, combo: 0, comboFlash: 0, burnT: 0, dust, mode: null, remain: 0 });
    requestAnimationFrame(idle);
  } else {
    requestAnimationFrame(idle);
  }
})();
