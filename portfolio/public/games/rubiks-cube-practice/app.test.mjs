import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { FACE_ORDER, makeCase } from './cube-engine.js';
import { colors, defaultScheme } from './cube-view.js';

const cases = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
let importId = 0;

// Only browser scheduling, layout observation, network and canvas drawing are
// substituted. The actual app, DOM events, engine and playback controller run.
async function browser(t, { language, practice } = {}) {
  const dom = new JSDOM('<div id="app"></div>', { url: 'https://rubiks-cube-practice.hillmanchan.com/' });
  const { window } = dom;
  const { document } = window;
  if (language) window.localStorage.setItem('rubiks-practice-language', language);
  if (practice) window.localStorage.setItem('rubiks-practice-v1', JSON.stringify(practice));
  let time = 0;
  let hidden = false;
  let paintCount = 0;
  let frameId = 0;
  const frames = new Map();
  const intersections = [];
  const originalGlobals = new Map();
  function install(name, value) {
    originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  class IntersectionObserver {
    constructor(callback) { this.callback = callback; intersections.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.target = null; }
    emit(target, isIntersecting) { this.callback([{ target, isIntersecting }]); }
  }
  class ResizeObserver {
    observe() {}
    disconnect() {}
  }
  const media = new window.EventTarget();
  media.matches = false;
  window.matchMedia = () => media;
  window.scrollTo = () => {};
  window.Element.prototype.scrollIntoView = () => {};
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  window.HTMLCanvasElement.prototype.getContext = () => ({
    clearRect() { paintCount += 1; },
    setTransform() {}, beginPath() {}, ellipse() {}, fill() {}, moveTo() {},
    quadraticCurveTo() {}, lineTo() {}, closePath() {}, stroke() {},
  });
  install('window', window);
  install('document', document);
  install('localStorage', window.localStorage);
  install('IntersectionObserver', IntersectionObserver);
  install('ResizeObserver', ResizeObserver);
  install('performance', { now: () => time });
  install('requestAnimationFrame', (callback) => { frames.set(++frameId, callback); return frameId; });
  install('cancelAnimationFrame', (id) => frames.delete(id));
  install('fetch', async (url) => {
    assert.equal(new URL(url).pathname.endsWith('/cases.json'), true);
    return { ok: true, json: async () => cases };
  });
  t.after(() => {
    window.dispatchEvent(new window.Event('pagehide'));
    window.close();
    for (const [name, descriptor] of originalGlobals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  await import(`${new URL('./app.js', import.meta.url).href}?integration=${++importId}`);
  return {
    window, document, frames, intersections,
    get paints() { return paintCount; },
    find(selector) { return document.querySelector(selector); },
    async click(selector) {
      const element = document.querySelector(selector);
      assert.ok(element, `Expected an element matching ${selector}`);
      element.click();
      await Promise.resolve();
    },
    speed(value) {
      const select = document.querySelector('#speed');
      select.value = String(value);
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
    },
    language(value) {
      const select = document.querySelector('#language-select');
      assert.ok(select, 'The language control must be available');
      select.value = value;
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
    },
    advance(ms) {
      time += ms;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(time));
    },
    setHidden(value) {
      hidden = value;
      document.dispatchEvent(new window.Event('visibilitychange'));
    },
  };
}

test('editing a solved cube refreshes its preview even when the solution is empty', async (t) => {
  const h = await browser(t);
  await h.click('[data-action="source"][data-value="mine"]');
  for (const [faceIndex, face] of FACE_ORDER.entries()) {
    await h.click(`[data-action="color"][data-value="${face}"]`);
    for (let cell = 0; cell < 9; cell += 1) {
      const selector = `[data-action="paint"][data-index="${faceIndex * 9 + cell}"]`;
      if (cell !== 4 && h.find(selector)) await h.click(selector);
    }
  }
  await h.click('[data-action="analyze"]');
  assert.equal(h.find('.alert.error'), null);
  assert.ok(h.find('.turn-canvas'));
  assert.equal(h.find('[data-action="play"]').disabled, true);
  const stickers = [...h.document.querySelectorAll('.all-faces .sticker')];
  assert.equal(stickers.length, 54);
  stickers.forEach((sticker, index) => {
    const expected = colors[defaultScheme[FACE_ORDER[Math.floor(index / 9)]]];
    assert.equal(sticker.style.getPropertyValue('--sticker'), expected, `Preview sticker ${index} must match the edited cube`);
  });
});

test('turn frames draw the canvas without rebuilding the app or player, or mounting a case library', async (t) => {
  const h = await browser(t);
  const app = h.find('#app');
  const canvas = h.find('.turn-canvas');
  const player = h.find('.player');
  const play = h.find('[data-action="play"]');
  assert.equal(h.find('#library-cards'), null);
  assert.equal(h.find('.case-card'), null);
  h.speed(1);
  play.focus();
  await h.click('[data-action="play"]');
  const mutations = new h.window.MutationObserver(() => {});
  mutations.observe(app, { childList: true, subtree: true, attributes: true, characterData: true });
  const paints = h.paints;
  h.advance(200);
  h.advance(200);
  assert.equal(h.paints, paints + 2);
  assert.equal(mutations.takeRecords().length, 0, 'Intermediate animation frames must not mutate the DOM');
  h.advance(600);
  const settledMutations = mutations.takeRecords();
  assert.equal(settledMutations.some((record) => record.target === app), false);
  assert.equal(h.find('.turn-canvas'), canvas);
  assert.equal(h.find('.player'), player);
  assert.equal(h.find('[data-action="play"]'), play);
  assert.equal(h.find('#library-cards'), null);
  assert.equal(h.find('.case-card'), null);
  assert.equal(h.document.activeElement, play);
  assert.match(h.find('.live-move').textContent, /Move 1 of \d+ complete/);
  mutations.disconnect();
});

test('hiding the page pauses at the current turn and returning does not autoplay', async (t) => {
  const h = await browser(t);
  h.speed(1);
  await h.click('[data-action="play"]');
  h.advance(300);
  h.setHidden(true);
  assert.equal(h.frames.size, 0);
  assert.match(h.find('.live-move').textContent, /Paused during/);
  assert.equal(h.find('[data-action="play"]').textContent.trim(), 'Resume');
  const paints = h.paints;
  h.advance(10000);
  h.setHidden(false);
  assert.equal(h.paints, paints);
  assert.equal(h.frames.size, 0);
  await h.click('[data-action="play"]');
  h.advance(700);
  assert.match(h.find('.live-move').textContent, /Move 1 of \d+ complete/);
  h.window.dispatchEvent(new h.window.Event('pagehide'));
  assert.equal(h.frames.size, 0);
});

test('offscreen previews pause while stale observations from a replaced case are ignored', async (t) => {
  const h = await browser(t);
  const observer = h.intersections[0];
  const oldPreview = h.find('#cube-practice');
  await h.click('[data-action="stage"][data-value="F"]');
  const currentPreview = h.find('#cube-practice');
  assert.notEqual(currentPreview, oldPreview);
  await h.click('[data-action="play"]');
  h.advance(100);
  observer.emit(oldPreview, false);
  assert.equal(h.frames.size, 1);
  assert.equal(h.find('[data-action="play"]').textContent.trim(), 'Pause');
  observer.emit(currentPreview, false);
  assert.equal(h.frames.size, 0);
  assert.equal(h.find('[data-action="play"]').textContent.trim(), 'Resume');
});

test('speed and view changes preserve the mounted player during an active turn', async (t) => {
  const h = await browser(t);
  const canvas = h.find('.turn-canvas');
  const player = h.find('.player');
  assert.deepEqual([...h.find('#speed').options].map((option) => Number(option.value)), [.25, .5, .75, 1, 1.25, 1.5, 2]);
  h.speed(1);
  await h.click('[data-action="play"]');
  h.advance(500);
  h.speed(2);
  await h.click('[data-action="view"]');
  assert.match(h.find('.view-caption').textContent, /back and left/);
  h.advance(250);
  assert.match(h.find('.live-move').textContent, /Move 1 of \d+ complete/);
  assert.equal(h.find('.turn-canvas'), canvas);
  assert.equal(h.find('.player'), player);
  assert.equal(JSON.parse(h.window.localStorage.getItem('rubiks-practice-v1')).speed, 2);
});

test('language switching preserves the partial turn, case, speed and learning progress', async (t) => {
  const h = await browser(t, { practice: { learned: ['oll-27'], completed: ['N'], speed: 1 } });
  const moves = h.find('.move-list').textContent;
  await h.click('[data-action="play"]');
  h.advance(400);
  h.language('zh-HK');
  assert.equal(h.document.documentElement.lang, 'zh-Hant-HK');
  assert.equal(h.frames.size, 0, 'Switching language pauses without discarding the turn');
  assert.match(h.find('.live-move').textContent, /[\u3400-\u9fff]/);
  assert.match(h.find('.live-move').textContent, /R/);
  assert.equal(h.find('.move-list').textContent, moves);
  assert.equal(h.find('.case-badge').textContent, 'OLL 27');
  assert.equal(h.find('#speed').value, '1');
  assert.ok(h.find('[data-action="learned"].is-learned'));
  assert.equal(h.window.localStorage.getItem('rubiks-practice-language'), 'zh-HK');
  assert.deepEqual(JSON.parse(h.window.localStorage.getItem('rubiks-practice-v1')), { learned: ['oll-27'], completed: ['N'], speed: 1 });
  await h.click('[data-action="play"]');
  h.advance(600);
  h.language('en');
  assert.equal(h.document.documentElement.lang, 'en');
  assert.match(h.find('.live-move').textContent, /Move 1 of 7 complete/);
  assert.equal(h.find('.move-list').textContent, moves);
});

test('saved Chinese preference loads complete chapters and supports Chinese case search', async (t) => {
  const h = await browser(t, { language: 'zh-HK' });
  assert.equal(h.find('#language-select').value, 'zh-HK');
  assert.equal(h.document.documentElement.lang, 'zh-Hant-HK');
  for (const chapter of ['N', 'C', 'F', 'O', 'P']) {
    await h.click(`[data-action="chapter"][data-value="${chapter}"]`);
    assert.match(h.find('h1').textContent, /[\u3400-\u9fff]/);
    const sections = [...h.document.querySelectorAll('.chapter-content > section > p')];
    assert.ok(sections.length >= 4);
    sections.forEach((p) => assert.match(p.textContent, /[\u3400-\u9fff]/));
  }
  await h.click('[data-action="chapter"][data-value="O"]');
  await h.click('[data-action="mode"][data-value="algorithms"]');
  const search = h.find('#case-search');
  search.value = '點';
  search.dispatchEvent(new h.window.Event('input', { bubbles: true }));
  assert.deepEqual([...h.document.querySelectorAll('.case-card')].map((card) => card.dataset.id), cases.filter((record) => record.stage === 'O' && record.group === 'Dot').map((record) => record.id));
});

test('reading, algorithms and practice have separate content with direct chapter shortcuts', async (t) => {
  const h = await browser(t);
  assert.ok(h.find('.turn-canvas'));
  assert.ok(h.find('.move-list'));
  assert.equal(h.find('.chapter-content'), null);
  assert.equal(h.find('#library-cards'), null);
  assert.ok(h.find('main [data-action="mode"][data-value="algorithms"]'), 'Practice exposes a direct algorithm browser shortcut');

  await h.click('[data-action="chapter"][data-value="O"]');
  const reading = h.find('.chapter-content');
  assert.ok(reading);
  assert.equal(h.find('#library-cards'), null);
  assert.equal(h.find('.turn-canvas'), null);
  for (const action of ['chapter-algorithms', 'practice-chapter']) {
    const shortcut = h.find(`[data-action="${action}"]`);
    assert.ok(shortcut, `Reading offers ${action}`);
    assert.ok(shortcut.compareDocumentPosition(reading) & h.window.Node.DOCUMENT_POSITION_FOLLOWING, `${action} is available before the chapter text`);
  }

  await h.click('[data-action="chapter-algorithms"]');
  assert.ok(h.find('#library-cards'));
  assert.ok(h.find('.case-card'));
  assert.equal(h.document.querySelectorAll('.stage-tabs [data-action="stage"]').length, 4);
  assert.equal(h.find('.chapter-content'), null);
  assert.equal(h.find('.turn-canvas'), null);
  assert.equal(h.find('.move-list'), null);

  const card = h.find('.case-card');
  const selected = cases.find((item) => item.id === card.dataset.id);
  await h.click(`.case-card[data-id="${selected.id}"]`);
  assert.equal(h.find('.case-badge').textContent, selected.name);
  assert.ok(h.find('.turn-canvas'));
  assert.ok(h.find('.move-list'));
  assert.equal(h.find('#library-cards'), null);
  assert.equal(h.find('.chapter-content'), null);
});

test('mode navigation retains the selected case and entered colors', async (t) => {
  const h = await browser(t);
  await h.click('[data-action="source"][data-value="library"]');
  assert.ok(h.find('#library-cards'), 'The cube source library button opens the standalone algorithm browser');
  const selected = cases.find((item) => item.id === h.find('.case-card').dataset.id);
  await h.click(`.case-card[data-id="${selected.id}"]`);
  const moves = h.find('.move-list').textContent;
  h.speed(1);
  await h.click('[data-action="step"]');
  h.advance(1000);
  const moveStatus = h.find('.live-move').textContent;
  for (const mode of ['read', 'algorithms', 'timer', 'read', 'algorithms']) {
    await h.click(`[data-action="mode"][data-value="${mode}"]`);
    await h.click('[data-action="mode"][data-value="practice"]');
    assert.equal(h.find('.case-badge').textContent, selected.name, `${mode} preserves the selected case`);
    assert.equal(h.find('.move-list').textContent, moves, `${mode} preserves its algorithm`);
    assert.equal(h.find('.live-move').textContent, moveStatus, `${mode} preserves the current move`);
  }

  await h.click('[data-action="source"][data-value="mine"]');
  await h.click('[data-action="reset-cube"]');
  await paintSticker(h, 0, 'R');
  await paintSticker(h, 19, 'B');
  const enteredColors = () => [...h.document.querySelectorAll('.cube-editor .sticker')].map((sticker) => sticker.style.getPropertyValue('--sticker'));
  const entered = enteredColors();
  for (const mode of ['algorithms', 'read', 'timer', 'algorithms']) {
    await h.click(`[data-action="mode"][data-value="${mode}"]`);
    await h.click('[data-action="mode"][data-value="practice"]');
    assert.ok(h.find('[data-action="source"][data-value="mine"].active'), `${mode} retains manual entry`);
    assert.deepEqual(enteredColors(), entered, `${mode} preserves every entered sticker`);
    assert.equal(h.find('.alert.error'), null);
  }
});

test('chapter and case progress restore after reloading and timer navigation adds no stored history', async (t) => {
  let savedPractice;
  await t.test('mark a case and chapter, then use the timer view', async (context) => {
    const h = await browser(context);
    await h.click('[data-action="learned"]');
    await h.click('[data-action="chapter"][data-value="N"]');
    await h.click('[data-action="complete"]');
    assert.match(h.find('.progress-box').textContent, /1\/5 chapters/);
    assert.match(h.find('.progress-box p').textContent, /1 of 119 cases marked learned/);
    assert.ok(h.find('.chapter-nav [data-value="N"] .chapter-number.done'));
    savedPractice = JSON.parse(h.window.localStorage.getItem('rubiks-practice-v1'));
    assert.deepEqual(savedPractice.learned, ['oll-27']);
    assert.deepEqual(savedPractice.completed, ['N']);
    const stored = { ...h.window.localStorage };
    await h.click('[data-action="mode"][data-value="timer"]');
    h.advance(12000);
    await h.click('[data-action="mode"][data-value="practice"]');
    assert.deepEqual({ ...h.window.localStorage }, stored, 'The timer does not add timing records or overwrite learning progress');
  });

  await t.test('a fresh page restores progress and checkmarks', async (context) => {
    const h = await browser(context, { language: 'zh-HK', practice: savedPractice });
    assert.equal(h.document.querySelectorAll('.progress-box').length, 1, 'Desktop and mobile share one progress display');
    assert.match(h.find('.progress-box').textContent, /1\/5/);
    assert.match(h.find('.progress-box p').textContent, /119/);
    assert.ok(h.find('.chapter-nav [data-value="N"] .chapter-number.done'));
    assert.ok(h.find('[data-action="learned"].is-learned'));
    await h.click('[data-action="mode"][data-value="algorithms"]');
    const search = h.find('#case-search');
    search.value = 'OLL 27';
    search.dispatchEvent(new h.window.Event('input', { bubbles: true }));
    assert.ok(h.find('.case-card[data-id="oll-27"] .learned-check'));
    await h.click('[data-action="chapter"][data-value="N"]');
    assert.ok(h.find('[data-action="complete"].is-learned'));
    assert.deepEqual(JSON.parse(h.window.localStorage.getItem('rubiks-practice-v1')), savedPractice);
  });
});

test('switching language preserves color entry and translates validation errors', async (t) => {
  const h = await browser(t);
  await h.click('[data-action="source"][data-value="mine"]');
  await h.click('[data-action="color"][data-value="D"]');
  await h.click('[data-action="paint"][data-index="0"]');
  const stickers = () => [...h.document.querySelectorAll('.cube-net .sticker')].map((sticker) => sticker.style.getPropertyValue('--sticker'));
  const entered = stickers();
  h.language('zh-HK');
  assert.deepEqual(stickers(), entered);
  assert.match(h.find('[data-index="0"]').getAttribute('aria-label'), /白色/);
  await h.click('[data-action="analyze"]');
  assert.match(h.find('.alert.error').textContent, /9/);
  assert.match(h.find('.alert.error').textContent, /[\u3400-\u9fff]/);
  assert.doesNotMatch(h.find('.alert.error').textContent, /Each color/);
  h.language('en');
  assert.match(h.find('.alert.error').textContent, /Each color needs exactly 9 stickers/);
  assert.deepEqual(stickers(), entered);
});

async function paintSticker(h, index, color) {
  await h.click(`[data-action="color"][data-value="${color}"]`);
  await h.click(`[data-action="paint"][data-index="${index}"]`);
}

function editorColor(h, face, index) {
  const sticker = h.find(`.cube-editor .face-${face} .sticker:nth-child(${index + 1})`);
  assert.ok(sticker, `Expected ${face} sticker ${index}`);
  return sticker.style.getPropertyValue('--sticker');
}

test('O/P editors show five faces with disabled lower rows while C/F retain complete color entry', async (t) => {
  const h = await browser(t);
  await h.click('[data-action="source"][data-value="mine"]');
  for (const stage of ['O', 'P', 'C', 'F']) {
    await h.click(`[data-action="stage"][data-value="${stage}"]`);
    const lastLayer = stage === 'O' || stage === 'P';
    assert.equal(h.document.querySelectorAll('.cube-editor .net-face').length, lastLayer ? 5 : 6);
    assert.equal(h.document.querySelectorAll('.cube-editor .sticker').length, lastLayer ? 45 : 54);
    assert.equal(h.document.querySelectorAll('[data-action="capture-face"]').length, lastLayer ? 5 : 6);
    assert.equal(Boolean(h.find('.cube-editor .face-D')), !lastLayer);
    assert.match(h.find('.photo-progress').textContent, lastLayer ? /0\/5/ : /0\/6/);
    if (lastLayer) {
      assert.match(h.find('.editor-intro').textContent, /lower two layers must already be solved/);
      assert.match(h.find('.input-scope').textContent, /Top layer only/);
      assert.equal(h.document.querySelectorAll('.cube-editor .ignored-sticker').length, 20);
      for (const face of ['F', 'R', 'B', 'L']) {
        const cells = [...h.document.querySelectorAll(`.cube-editor .face-${face} .sticker`)];
        assert.ok(cells.slice(0, 3).every(cell => !cell.disabled && cell.dataset.action === 'paint'));
        assert.ok(cells.slice(3).filter((_, index) => index !== 1).every(cell => cell.disabled && !cell.dataset.action));
        assert.equal(cells[4].disabled, false, 'Dimmed side centers still configure the physical color scheme');
        assert.match(cells[4].getAttribute('aria-label'), /color reference/);
      }
      if (stage === 'P') assert.match(h.find('.scope-detail').textContent, /top face must already be one color/);
    } else {
      assert.equal(h.document.querySelectorAll('.cube-editor .sticker:disabled').length, 0);
      assert.equal(h.document.querySelectorAll('[data-action="paint"]').length, 54);
      assert.equal(h.find('.input-scope'), null);
      assert.match(h.find('.editor-intro').textContent, /all six faces/);
    }
  }
  await h.click('[data-action="stage"][data-value="O"]');
  h.language('zh-HK');
  assert.equal(h.find('.input-scope').textContent, '只需輸入頂層');
  assert.match(h.find('.photo-entry').textContent, /毋須拍攝底面/);
  assert.match(h.find('[data-action="capture-face"][data-face="F"]').textContent, /拍攝正面/);
});

test('stage switches retain entered top stickers and reconstruct omitted layers only for O/P', async (t) => {
  const h = await browser(t);
  await h.click('[data-action="source"][data-value="mine"]');
  await h.click('[data-action="stage"][data-value="F"]');
  await h.click('[data-action="reset-cube"]');
  await paintSticker(h, 0, 'R');
  await paintSticker(h, 19, 'B');
  await paintSticker(h, 21, 'U');
  await paintSticker(h, 27, 'R');
  await h.click('[data-action="stage"][data-value="C"]');
  assert.equal(editorColor(h, 'F', 3), colors.yellow, 'Switching between full-cube stages retains unsolved lower stickers');
  assert.equal(editorColor(h, 'D', 0), colors.red);
  for (const stage of ['O', 'P']) {
    await h.click(`[data-action="stage"][data-value="${stage}"]`);
    assert.equal(editorColor(h, 'U', 0), colors.red);
    assert.equal(editorColor(h, 'F', 1), colors.blue);
    assert.equal(editorColor(h, 'F', 3), colors.green, 'Ignored lower stickers are assumed solved');
    assert.equal(h.find('.cube-editor .face-D'), null);
  }
  await h.click('[data-action="stage"][data-value="F"]');
  assert.equal(editorColor(h, 'U', 0), colors.red);
  assert.equal(editorColor(h, 'F', 1), colors.blue);
  assert.equal(editorColor(h, 'F', 3), colors.green);
  assert.equal(editorColor(h, 'D', 0), colors.white);
});

test('chapter buttons, mobile chapter selection and next-chapter navigation apply the same input scope', async (t) => {
  const h = await browser(t);
  await h.click('[data-action="source"][data-value="mine"]');
  for (const route of ['chapter-button', 'chapter-select', 'next-chapter']) {
    await h.click('[data-action="stage"][data-value="F"]');
    await h.click('[data-action="reset-cube"]');
    await paintSticker(h, 2, 'R');
    await paintSticker(h, 24, 'B');
    await h.click('[data-action="chapter"][data-value="F"]');
    if (route === 'chapter-button') await h.click('[data-action="chapter"][data-value="O"]');
    else if (route === 'next-chapter') await h.click('[data-action="next-chapter"]');
    else {
      const select = h.find('#chapter-select');
      select.value = 'O';
      select.dispatchEvent(new h.window.Event('change', { bubbles: true }));
    }
    await h.click('[data-action="mode"][data-value="practice"]');
    assert.ok(h.find('[data-action="source"][data-value="mine"].active'), route);
    assert.equal(h.document.querySelectorAll('.cube-editor .net-face').length, 5, route);
    assert.equal(editorColor(h, 'U', 2), colors.red, `${route} retains entered top colors`);
    assert.equal(editorColor(h, 'F', 6), colors.green, `${route} reconstructs the ignored lower layers`);
    await h.click('[data-action="chapter"][data-value="F"]');
    await h.click('[data-action="mode"][data-value="practice"]');
    assert.equal(h.document.querySelectorAll('.cube-editor .net-face').length, 6, route);
    assert.equal(editorColor(h, 'U', 2), colors.red, `${route} retains colors when returning to the full editor`);
  }
});

test('reading O/P chapters preserves a full-cube entry until last-layer practice is selected', async (t) => {
  const h = await browser(t);
  await h.click('[data-action="source"][data-value="mine"]');
  await h.click('[data-action="stage"][data-value="F"]');
  await h.click('[data-action="reset-cube"]');
  await paintSticker(h, 2, 'L');
  await paintSticker(h, 24, 'B');
  await paintSticker(h, 27, 'R');

  for (const chapter of ['O', 'P', 'F']) {
    await h.click(`[data-action="chapter"][data-value="${chapter}"]`);
    assert.ok(h.find('.chapter-content'), 'Reading a chapter does not opt into its practice assumptions');
  }
  await h.click('[data-action="mode"][data-value="practice"]');
  assert.equal(h.document.querySelectorAll('.cube-editor .net-face').length, 6);
  assert.equal(editorColor(h, 'F', 6), colors.blue, 'Reading last-layer chapters must not solve entered lower stickers');
  assert.equal(editorColor(h, 'D', 0), colors.red, 'Reading last-layer chapters must not replace the entered bottom face');
  assert.equal(editorColor(h, 'U', 2), colors.orange);

  await h.click('[data-action="stage"][data-value="O"]');
  assert.equal(editorColor(h, 'F', 6), colors.green, 'Selecting last-layer practice explicitly applies its solved-lower-layer assumption');
  assert.equal(editorColor(h, 'U', 2), colors.orange);
  await h.click('[data-action="stage"][data-value="F"]');
  assert.equal(editorColor(h, 'D', 0), colors.white);
});

test('entering only top-layer stickers finds OLL and PLL algorithms without a bottom face', async (t) => {
  const h = await browser(t);
  await h.click('[data-action="source"][data-value="mine"]');
  for (const id of ['oll-27', 'pll-t']) {
    const item = cases.find(record => record.id === id);
    assert.ok(item);
    await h.click(`[data-action="stage"][data-value="${item.stage}"]`);
    await h.click('[data-action="reset-cube"]');
    const cube = makeCase(item.algorithm);
    for (const face of ['U', 'F', 'R', 'B', 'L']) {
      const offset = FACE_ORDER.indexOf(face) * 9;
      for (let index = 0; index < (face === 'U' ? 9 : 3); index++) {
        if (index !== 4) await paintSticker(h, offset + index, cube[offset + index]);
      }
    }
    assert.equal(h.find('.cube-editor .face-D'), null);
    await h.click('[data-action="analyze"]');
    assert.equal(h.find('.alert.error'), null, id);
    assert.equal(h.find('.case-badge').textContent, item.name);
    assert.ok(h.find('.turn-canvas'));
    assert.equal(h.find('[data-action="play"]').disabled, false);
    if (id === 'oll-27') await h.click('[data-action="edit-cube"]');
  }
});
