import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { FACE_ORDER, makeCase } from './cube-engine.js';
import { colors, defaultScheme } from './cube-view.js';

const cases = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
let importId = 0;

// Only browser scheduling, layout observation, workers, network and canvas drawing are
// substituted. The actual app, DOM events, engine and playback controller run.
async function browser(t, { language, practice, exam, navigation, clipboard, Worker, date } = {}) {
  const dom = new JSDOM('<div id="app"></div>', { url: 'https://rubiks-cube-practice.hillmanchan.com/' });
  const { window } = dom;
  const { document } = window;
  if (language) window.localStorage.setItem('rubiks-practice-language', language);
  if (practice) window.localStorage.setItem('rubiks-practice-v1', JSON.stringify(practice));
  if (exam) window.localStorage.setItem('rubiks-daily-exam-v1', JSON.stringify(exam));
  if (navigation) window.localStorage.setItem('rubiks-navigation-v1', JSON.stringify(navigation));
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
  const scrolls = [];
  window.scrollTo = options => { scrolls.push(options); Object.defineProperty(window, 'scrollY', { configurable: true, value: options.top || 0 }); };
  window.Element.prototype.scrollIntoView = () => {};
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  window.HTMLCanvasElement.prototype.getContext = () => ({
    clearRect() { paintCount += 1; },
    setTransform() {}, beginPath() {}, ellipse() {}, fill() {}, moveTo() {},
    quadraticCurveTo() {}, lineTo() {}, closePath() {}, stroke() {},
  });
  install('window', window);
  install('document', document);
  if (clipboard) {
    Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: clipboard });
    install('navigator', window.navigator);
  }
  install('localStorage', window.localStorage);
  let calendarDate = date;
  if (date) install('Date', class extends Date {
    constructor(...args) { super(...(args.length ? args : [calendarDate])); }
  });
  install('IntersectionObserver', IntersectionObserver);
  install('ResizeObserver', ResizeObserver);
  if (Worker) install('Worker', Worker);
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
    window, document, frames, intersections, scrolls,
    setDate(value) { calendarDate = value; },
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
  await h.click('.case-card[data-id="f2l-1"]');
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

for (const language of ['en', 'zh-HK']) {
  test(`${language}: the timer opens alone with a back button and portrait rotation guidance`, async (t) => {
    const h = await browser(t, { language });
    await h.click('[data-action="mode"][data-value="timer"]');
    assert.ok(h.find('#app').classList.contains('timer-screen'));
    const main = h.find('main');
    assert.equal(h.document.querySelectorAll('main').length, 1);
    assert.ok(main.contains(h.find('.solve-timer')), 'The dedicated main contains the working timer');
    assert.equal(h.find('.sidebar'), null, 'Timer use does not mount the chapter sidebar');
    assert.equal(h.find('.topbar'), null, 'Timer use does not mount the workspace header');
    assert.equal(h.find('footer'), null, 'Timer use does not mount the workspace footer');
    assert.equal(h.find('.mobile-nav-trigger'), null);
    assert.equal(h.find('.turn-canvas'), null);
    assert.equal(h.find('#library-cards'), null);
    assert.equal(h.document.querySelectorAll('[data-timer-pad]').length, 2);
    const back = h.find('main [data-action="mode"][data-value="practice"]');
    assert.ok(back, 'A direct route back to practice is available without opening navigation');
    assert.equal(h.document.querySelectorAll('[data-action="mode"][data-value="practice"]').length, 1);
    assert.match(back.textContent, language === 'en' ? /Back to practice/ : /返回練習/);
    const rotationHint = h.find('.timer-rotate-hint');
    assert.ok(rotationHint, 'Portrait users receive a rotate-phone reminder');
    assert.match(rotationHint.textContent, language === 'en' ? /rotate|landscape/i : /橫向|橫放|旋轉/);
    assert.equal(h.find('[data-timer-time]').textContent, '0.00');
    await h.click('main [data-action="mode"][data-value="practice"]');
    assert.equal(h.find('#app').classList.contains('timer-screen'), false, 'Back removes the fullscreen layout');
    assert.ok(h.find('.turn-canvas'));
    assert.equal(h.find('.solve-timer'), null);
    assert.ok(h.find('.sidebar'));
  });
}

test('a deferred clipboard completion cannot crash the dedicated timer screen', async (t) => {
  let finishCopy;
  let copiedAlgorithm;
  const h = await browser(t, { clipboard: {
    writeText(algorithm) {
      copiedAlgorithm = algorithm;
      return new Promise((resolve) => { finishCopy = resolve; });
    },
  } });
  await h.click('[data-action="copy"]');
  assert.equal(typeof finishCopy, 'function', 'The copy request is pending');
  assert.ok(copiedAlgorithm.length > 0);
  await h.click('[data-action="mode"][data-value="timer"]');
  assert.equal(h.find('#toast'), null);
  finishCopy();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(h.find('.solve-timer'));
  assert.equal(h.find('[data-timer-time]').textContent, '0.00');
  await h.click('main [data-action="mode"][data-value="practice"]');
  assert.ok(h.find('.move-list'));
  assert.ok(h.find('.turn-canvas'));
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
  await h.click('[data-action="stage"][data-value="F"]');
  await h.click('[data-action="reset-cube"]');
  await paintSticker(h, 0, 'R');
  await paintSticker(h, 19, 'B');
  await paintSticker(h, 24, 'D');
  await paintSticker(h, 27, 'L');
  const enteredColors = () => [...h.document.querySelectorAll('.cube-editor .sticker')].map((sticker) => sticker.style.getPropertyValue('--sticker'));
  const entered = enteredColors();
  for (const mode of ['algorithms', 'read', 'timer', 'algorithms']) {
    await h.click(`[data-action="mode"][data-value="${mode}"]`);
    await h.click('[data-action="mode"][data-value="practice"]');
    assert.ok(h.find('[data-action="source"][data-value="mine"].active'), `${mode} retains manual entry`);
    assert.equal(h.document.querySelectorAll('.cube-editor .sticker').length, 54, `${mode} retains full-cube input`);
    assert.deepEqual(enteredColors(), entered, `${mode} preserves every entered sticker`);
    assert.equal(h.find('.alert.error'), null);
  }
});

test('browsing other algorithm stages preserves the current case, move and full-cube entry', async (t) => {
  const h = await browser(t);
  await h.click('[data-action="mode"][data-value="algorithms"]');
  const selected = cases.find((item) => item.id === h.find('.case-card').dataset.id);
  assert.notEqual(selected.id, 'oll-27', 'Use a non-default case so unintended resets are visible');
  await h.click(`.case-card[data-id="${selected.id}"]`);
  h.speed(1);
  await h.click('[data-action="step"]');
  h.advance(1000);
  const moves = h.find('.move-list').textContent;
  const moveStatus = h.find('.live-move').textContent;

  for (const stage of ['P', 'F', 'C']) {
    await h.click('[data-action="mode"][data-value="algorithms"]');
    await h.click(`[data-action="stage"][data-value="${stage}"]`);
    assert.ok(h.find(`.stage-tabs [data-value="${stage}"].active`));
    await h.click('main [data-action="mode"][data-value="practice"]');
    assert.ok(h.find('.stage-tabs [data-value="O"].active'), 'Back to practice returns to the current solve stage');
    assert.equal(h.find('.case-badge').textContent, selected.name);
    assert.equal(h.find('.move-list').textContent, moves);
    assert.equal(h.find('.live-move').textContent, moveStatus);
  }
  await h.click('[data-action="chapter"][data-value="P"]');
  await h.click('[data-action="mode"][data-value="practice"]');
  assert.equal(h.find('.case-badge').textContent, selected.name, 'Reading a different chapter also preserves the current case');
  assert.equal(h.find('.live-move').textContent, moveStatus);

  await h.click('[data-action="source"][data-value="mine"]');
  await h.click('[data-action="stage"][data-value="F"]');
  await h.click('[data-action="reset-cube"]');
  await paintSticker(h, 2, 'L');
  await paintSticker(h, 24, 'B');
  await paintSticker(h, 27, 'R');
  const enteredColors = () => [...h.document.querySelectorAll('.cube-editor .sticker')].map((sticker) => sticker.style.getPropertyValue('--sticker'));
  const entered = enteredColors();
  for (const stage of ['O', 'P', 'C']) {
    await h.click('[data-action="mode"][data-value="algorithms"]');
    await h.click(`[data-action="stage"][data-value="${stage}"]`);
    await h.click('main [data-action="mode"][data-value="practice"]');
    assert.ok(h.find('.stage-tabs [data-value="F"].active'));
    assert.ok(h.find('[data-action="source"][data-value="mine"].active'));
    assert.equal(h.document.querySelectorAll('.cube-editor .net-face').length, 6);
    assert.deepEqual(enteredColors(), entered, `Browsing ${stage} leaves all 54 entered colors intact`);
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
    const withoutNavigation = storage => Object.fromEntries(Object.entries(storage).filter(([key]) => key !== 'rubiks-navigation-v1'));
    assert.deepEqual(withoutNavigation({ ...h.window.localStorage }), withoutNavigation(stored), 'The timer does not add timing records or overwrite learning progress');
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

test('all chapter browsing routes preserve full input until a last-layer practice stage is explicitly selected', async (t) => {
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
    assert.ok(h.find('.stage-tabs [data-value="F"].active'), route);
    assert.equal(h.document.querySelectorAll('.cube-editor .net-face').length, 6, route);
    assert.equal(editorColor(h, 'U', 2), colors.red, `${route} retains entered top colors`);
    assert.equal(editorColor(h, 'F', 6), colors.blue, `${route} leaves entered lower layers untouched`);
    await h.click('[data-action="stage"][data-value="O"]');
    assert.equal(h.document.querySelectorAll('.cube-editor .net-face').length, 5, route);
    assert.equal(editorColor(h, 'U', 2), colors.red);
    assert.equal(editorColor(h, 'F', 6), colors.green, `${route} applies the solved-lower-layer assumption only after selecting O practice`);
    await h.click('[data-action="stage"][data-value="F"]');
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

test('full solve has all six faces and preserves the separate practice workspace', async (t) => {
  const h = await browser(t);
  const caseName = h.find('.case-badge').textContent;
  await h.click('[data-action="mode"][data-value="solve"]');
  assert.match(h.find('h1').textContent, /I just want to solve it/);
  assert.equal(h.find('.stage-tabs'), null);
  assert.equal(h.document.querySelectorAll('.cube-editor .net-face').length, 6);
  await paintSticker(h, 27, 'R');
  await h.click('[data-action="mode"][data-value="practice"]');
  assert.equal(h.find('.case-badge').textContent, caseName);
  await h.click('[data-action="mode"][data-value="solve"]');
  assert.equal(editorColor(h, 'D', 0), colors.red);
  h.language('zh-HK');
  assert.equal(h.find('h1').textContent, '我唔想學呀');
  assert.equal(editorColor(h, 'D', 0), colors.red);
});

test('typed full cube import validates before replacing stickers and solves an already solved cube', async (t) => {
  const h = await browser(t);
  await h.click('[data-action="mode"][data-value="solve"]');
  const input = h.find('#cube-text');
  input.value = 'YYYYYYYYY RRRRRRRRR GGGGGGGGG WWWWWWWWW OOOOOOOOO BBBBBBBBB';
  input.dispatchEvent(new h.window.Event('input', { bubbles: true }));
  await h.click('[data-action="import-cube-text"]');
  assert.equal(h.find('.alert.error'), null);
  assert.equal(editorColor(h, 'D', 0), colors.white);
  h.find('#cube-text').value = 'invalid';
  h.find('#cube-text').dispatchEvent(new h.window.Event('input', { bubbles: true }));
  await h.click('[data-action="import-cube-text"]');
  assert.ok(h.find('.alert.error'));
  assert.equal(editorColor(h, 'D', 0), colors.white);
  await h.click('[data-action="analyze"]');
  assert.equal(h.find('.alert.error'), null);
  assert.match(h.find('.algorithm-panel').textContent, /Already solved/);
  assert.ok(h.find('.turn-canvas'));
  assert.equal(h.find('[data-action="play"]').disabled, true);
  assert.equal(h.find('[data-action="apply"]'), null);
});

test('full solve rejects impossible painted input and keeps the editor available', async (t) => {
  const h = await browser(t);
  await h.click('[data-action="mode"][data-value="solve"]');
  await paintSticker(h, 27, 'R');
  await h.click('[data-action="analyze"]');
  assert.match(h.find('.alert.error').textContent, /9 stickers/);
  assert.equal(h.document.querySelectorAll('.cube-editor .net-face').length, 6);
  assert.equal(h.find('.turn-canvas'), null);
});

// Control only the browser worker boundary; the app still validates the returned
// algorithm and runs the real playback controller against the imported stickers.
function solverBoundary() {
  const workers = [];
  class Worker {
    constructor() { this.messages = []; workers.push(this); }
    postMessage(message) { this.messages.push(message); }
    terminate() {}
    emit(data) { this.onmessage?.({ data }); }
    reply() {
      const request = this.messages.findLast(message => message.type === 'solve');
      this.emit({ type: 'result', id: request.id, result: { algorithm: "U'", moves: 1, solved: false } });
    }
  }
  return { Worker, latest: () => workers.at(-1) };
}

const settleBrowser = () => new Promise(resolve => setImmediate(resolve));

async function importFullSolveFixture(h) {
  await h.click('[data-action="mode"][data-value="solve"]');
  const input = h.find('#cube-text');
  // A solved cube after one U turn, in U R F D L B face order.
  input.value = 'UUUUUUUUUBBBRRRRRRRRRFFFFFFDDDDDDDDDFFFLLLLLLLLLBBBBBB';
  input.dispatchEvent(new h.window.Event('input', { bubbles: true }));
  await h.click('[data-action="import-cube-text"]');
  assert.equal(h.find('.alert.error'), null);
}

async function startFullSolve(h, boundary) {
  await h.click('[data-action="analyze"]');
  assert.equal(h.find('[data-action="analyze"]').disabled, true);
  assert.equal(h.find('.full-solution-panel').getAttribute('aria-busy'), 'true');
  const worker = boundary.latest();
  worker.emit({ type: 'ready' });
  await settleBrowser();
  return worker;
}

test('an asynchronous full solution animates the imported cube and retains playback across modes', async (t) => {
  const boundary = solverBoundary();
  const h = await browser(t, boundary);
  await h.click('[data-action="jump"][data-index="2"]');
  await importFullSolveFixture(h);
  const worker = await startFullSolve(h, boundary);
  worker.reply();
  await settleBrowser();
  assert.equal(h.find('.alert.error'), null);
  assert.equal(h.find('.full-solution-panel').getAttribute('aria-busy'), 'false');
  assert.equal(h.find('.move-token').textContent, 'U′');
  assert.equal(h.find('[data-action="play"]').disabled, false);
  assert.equal(h.find('[data-action="step"]').disabled, false);

  const inspection = h.find('.all-faces');
  inspection.open = true;
  inspection.dispatchEvent(new h.window.Event('toggle'));
  h.speed(1);
  await h.click('[data-action="step"]');
  h.advance(1000);
  assert.match(h.find('.live-move').textContent, /Sequence complete/);
  assert.equal(h.find('[data-action="step"]').disabled, true);
  assert.equal(h.find('[data-action="step-back"]').disabled, false);
  [...h.document.querySelectorAll('.all-faces .sticker')].forEach((sticker, index) => {
    assert.equal(sticker.style.getPropertyValue('--sticker'), colors[defaultScheme[FACE_ORDER[Math.floor(index / 9)]]], `Completed solution sticker ${index}`);
  });

  await h.click('[data-action="mode"][data-value="practice"]');
  assert.match(h.find('.live-move').textContent, /Move 2 of 7 complete/);
  await h.click('[data-action="mode"][data-value="solve"]');
  assert.match(h.find('.live-move').textContent, /Sequence complete/);
  assert.equal(h.find('[data-action="step"]').disabled, true);
});

test('leaving during a full solve ignores late results and permits a new calculation', async (t) => {
  const boundary = solverBoundary();
  const h = await browser(t, boundary);
  const practiceCase = h.find('.case-badge').textContent;
  await importFullSolveFixture(h);
  const oldWorker = await startFullSolve(h, boundary);
  await h.click('[data-action="mode"][data-value="practice"]');
  oldWorker.reply();
  await settleBrowser();
  assert.equal(h.find('.case-badge').textContent, practiceCase);
  assert.equal(h.find('.full-solution-panel'), null);

  await h.click('[data-action="mode"][data-value="solve"]');
  assert.equal(h.document.querySelectorAll('.cube-editor .net-face').length, 6);
  assert.equal(h.find('[data-action="analyze"]').disabled, false);
  assert.equal(h.find('.move-token'), null);
  assert.equal(editorColor(h, 'R', 0), colors.blue);
  const worker = await startFullSolve(h, boundary);
  worker.reply();
  await settleBrowser();
  assert.equal(h.find('.move-token').textContent, 'U′');
  assert.equal(h.find('[data-action="play"]').disabled, false);
});

test('restoring the page during a full solve clears busy controls and permits retry', async (t) => {
  const boundary = solverBoundary();
  const h = await browser(t, boundary);
  await importFullSolveFixture(h);
  const oldWorker = await startFullSolve(h, boundary);
  h.window.dispatchEvent(new h.window.Event('pagehide'));
  h.window.dispatchEvent(new h.window.Event('pageshow'));
  oldWorker.reply();
  await settleBrowser();
  assert.equal(h.find('.full-solution-panel').getAttribute('aria-busy'), 'false');
  assert.equal(h.find('[data-action="analyze"]').disabled, false);
  assert.equal(h.find('[data-action="cancel-solve"]'), null);
  assert.equal(h.find('.move-token'), null);
  assert.equal(editorColor(h, 'R', 0), colors.blue);

  const worker = await startFullSolve(h, boundary);
  worker.reply();
  await settleBrowser();
  assert.equal(h.find('.alert.error'), null);
  assert.equal(h.find('.move-token').textContent, 'U′');
  assert.equal(h.find('[data-action="play"]').disabled, false);
});

test('closing photo input during a full solve restores an enabled solve button', async (t) => {
  await import('./photo-capture.js');
  const boundary = solverBoundary();
  const h = await browser(t, boundary);
  await importFullSolveFixture(h);
  await startFullSolve(h, boundary);
  await h.click('[data-action="capture"]');
  await settleBrowser();
  assert.ok(h.find('.photo-dialog[open]'));
  await h.click('.photo-close');
  assert.equal(h.find('.photo-dialog'), null);
  assert.equal(h.find('[data-action="analyze"]').disabled, false);
  assert.equal(h.find('.full-solution-panel').getAttribute('aria-busy'), 'false');
  assert.equal(h.find('[data-action="cancel-solve"]'), null);
  assert.equal(editorColor(h, 'R', 0), colors.blue);
  const worker = await startFullSolve(h, boundary);
  worker.reply();
  await settleBrowser();
  assert.equal(h.find('[data-action="play"]').disabled, false);
});

test('memorised cases are permanently checked and excluded from random practice', async (t) => {
  const unknown = cases.find(c => c.id === 'oll-1');
  const h = await browser(t, { practice: { learned: cases.filter(c => c.stage === 'O' && c.id !== unknown.id).map(c => c.id) } });
  assert.equal(h.find('[data-action="learned"]').disabled, true);
  await h.click('[data-action="learned"]');
  assert.ok(JSON.parse(h.window.localStorage.getItem('rubiks-practice-v1')).learned.includes('oll-27'));
  await h.click('[data-action="random"]');
  assert.equal(h.find('.case-badge').textContent, unknown.name);
  await h.click('[data-action="learned"]');
  assert.equal(h.find('[data-action="learned"]').disabled, true);
  await h.click('[data-action="random"]');
  assert.match(h.find('#toast').textContent, /memorised/i);
});

test('algorithm library has direct memorisation controls and a stage completion tick', async (t) => {
  const h = await browser(t, { practice: { learned: cases.filter(c => c.stage === 'O' && c.id !== 'oll-1').map(c => c.id) } });
  await h.click('[data-action="mode"][data-value="algorithms"]');
  await h.click('[data-action="learned"][data-id="oll-1"]');
  assert.equal(h.find('[data-action="learned"][data-id="oll-1"]').disabled, true);
  assert.match(h.find('.mastery-summary').textContent, /57.*57|57\/57/);
  assert.ok(h.find('.stage-tabs [data-value="O"] .stage-complete'));
});

test('daily exam hides answers, saves a question across navigation, and locks confirmed mastery', async (t) => {
  const h = await browser(t, { practice: { learned: cases.filter(c => c.id !== 'oll-1').map(c => c.id) } });
  const previous = h.find('.move-list').textContent;
  await h.click('[data-action="mode"][data-value="exam"]');
  assert.ok(h.find('#exam-count'));
  await h.click('[data-action="exam-start"]');
  assert.ok(h.find('.exam-scramble'));
  assert.equal(h.find('.move-list'), null, 'Solution moves must not appear before reveal');
  assert.equal(h.find('[data-action="play"]'), null, 'Playback cannot give away the answer');
  const scramble = h.find('.exam-scramble').textContent;
  await h.click('[data-action="mode"][data-value="practice"]');
  assert.equal(h.find('.move-list').textContent, previous, 'Exam has an independent cube workspace');
  await h.click('[data-action="mode"][data-value="exam"]');
  assert.equal(h.find('.exam-scramble').textContent, scramble);
  await h.click('[data-action="exam-reveal"]');
  assert.equal(h.find('.move-list').textContent.replaceAll('′', "'"), cases.find(c => c.id === 'oll-1').algorithm.replaceAll(' ', ''));
  await h.click('[data-action="exam-answer"][data-value="learned"]');
  assert.ok(JSON.parse(h.window.localStorage.getItem('rubiks-practice-v1')).learned.includes('oll-1'));
  assert.match(h.find('.exam-finished').textContent, /complete|memorised/i);
  assert.equal(h.find('[data-action="exam-start"]').disabled, true);
  const savedExam = JSON.parse(h.window.localStorage.getItem('rubiks-daily-exam-v1'));
  assert.equal(Object.values(savedExam.days)[0].answers[0].outcome, 'learned');
});

test('daily exam preferences, unfinished attempts, and historical results survive reload', async (t) => {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const h = await browser(t, { exam: { stages: ['P'], count: 5, days: {
    '2020-01-01': { queue: [], answers: [{ id: 'pll-t', stage: 'P', outcome: 'again' }] },
    [date]: { queue: [{ id: 'pll-t', stage: 'P', caseId: 'pll-t' }], answers: [] },
  } } });
  await h.click('[data-action="mode"][data-value="exam"]');
  assert.equal(h.find('#exam-count').value, '5');
  assert.equal(h.find('[data-exam-stage="P"]').checked, true);
  assert.equal(h.find('[data-exam-stage="F"]').checked, false);
  assert.ok(h.find('.exam-scramble'), 'Saved unfinished question resumes automatically');
  await h.click('[data-action="exam-answer"][data-value="again"]');
  assert.equal(JSON.parse(h.window.localStorage.getItem('rubiks-practice-v1'))?.learned?.includes('pll-t') || false, false);
  assert.match(h.find('.exam-history').textContent, /2020-01-01/);
  const input = h.find('#exam-date');
  input.value = '2020-01-01';
  input.dispatchEvent(new h.window.Event('change', { bubbles: true }));
  assert.equal(h.find('[data-action="exam-start"]'), null, 'Past days are read-only history');
  assert.match(h.find('.exam-daily-summary').textContent, /1/);
});

test('all cube side controls and keyboard orbit preserve the displayed algorithm and move', async (t) => {
  const h = await browser(t);
  const canvas = h.find('.turn-canvas');
  const moves = h.find('.move-list').textContent;
  for (const side of ['right', 'back', 'left', 'top', 'bottom', 'front']) {
    await h.click(`[data-action="cube-view"][data-value="${side}"]`);
    assert.equal(h.find(`[data-action="cube-view"][data-value="${side}"]`).getAttribute('aria-pressed'), 'true');
    assert.equal(h.find('.turn-canvas'), canvas);
    assert.equal(h.find('.move-list').textContent, moves);
  }
  canvas.dispatchEvent(new h.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
  assert.equal(h.find('[data-action="cube-view"][aria-pressed="true"]'), null);
  assert.equal(h.find('.move-list').textContent, moves);
  canvas.dispatchEvent(new h.window.KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
  assert.equal(h.find('[data-action="cube-view"][data-value="front"]').getAttribute('aria-pressed'), 'true');
});

test('resuming an exam skips cases memorised elsewhere and preserves Chinese labels', async (t) => {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const h = await browser(t, { language: 'zh-HK', practice: { learned: ['pll-t'] }, exam: { stages: ['P'], count: 5, days: {
    [date]: { queue: [{ id: 'pll-t', stage: 'P' }, { id: 'pll-ua', stage: 'P' }], answers: [] },
  } } });
  await h.click('[data-action="mode"][data-value="exam"]');
  assert.match(h.find('h1').textContent, /每日測驗/);
  assert.equal(JSON.parse(h.window.localStorage.getItem('rubiks-daily-exam-v1')).days[date].queue[0].id, 'pll-ua');
  assert.match(h.find('.exam-assessment').textContent, /鎖定/);
});

test('cross exam waits for its worker, supports retry, and ignores answers after navigation', async (t) => {
  const boundary = solverBoundary();
  const h = await browser(t, { Worker: boundary.Worker, exam: { stages: ['C'], count: 5, days: {} } });
  await h.click('[data-action="mode"][data-value="exam"]');
  await h.click('[data-action="exam-start"]');
  await h.click('[data-action="exam-reveal"]');
  assert.equal(h.find('[data-action="exam-reveal"]').disabled, true);
  const worker = boundary.latest();
  assert.equal(worker.messages[0].length, 54);
  worker.onerror();
  assert.ok(h.find('.alert.error'));
  assert.equal(h.find('[data-action="exam-reveal"]').disabled, false);
  await h.click('[data-action="exam-reveal"]');
  const nextWorker = boundary.latest();
  nextWorker.emit({ result: { algorithm: 'R' } });
  assert.ok(h.find('.move-list'));
  await h.click('[data-action="exam-answer"][data-value="solved"]');
  assert.match(h.find('.exam-results').textContent, /Solved this cross/);
  await h.click('[data-action="exam-reveal"]');
  const stale = boundary.latest();
  await h.click('[data-action="mode"][data-value="practice"]');
  const moves = h.find('.move-list').textContent;
  stale.emit({ result: { algorithm: 'F2' } });
  assert.equal(h.find('.move-list').textContent, moves);
});

test('returning to an interrupted cross exam restores a working reveal button', async (t) => {
  const boundary = solverBoundary();
  const h = await browser(t, { Worker: boundary.Worker, exam: { stages: ['C'], count: 5, days: {} } });
  await h.click('[data-action="mode"][data-value="exam"]');
  await h.click('[data-action="exam-start"]');
  await h.click('[data-action="exam-reveal"]');
  h.window.dispatchEvent(new h.window.Event('pagehide'));
  h.window.dispatchEvent(new h.window.Event('pageshow'));
  assert.equal(h.find('[data-action="exam-reveal"]').disabled, false);
  assert.ok(h.find('.exam-scramble'));
});

for (const action of ['exam-start', 'exam-reveal', 'exam-answer']) {
  test(`midnight makes yesterday’s exam read-only before ${action}`, async (t) => {
    const h = await browser(t, { date: '2026-09-17T23:59:00' });
    await h.click('[data-action="mode"][data-value="exam"]');
    await h.click('[data-action="exam-start"]');
    const saved = h.window.localStorage.getItem('rubiks-daily-exam-v1');
    h.setDate('2026-09-18T00:01:00');
    await h.click(`[data-action="${action}"]`);
    assert.equal(h.find('.exam-scramble'), null, 'Yesterday is history, not an active exam');
    assert.equal(h.find('[data-action="exam-answer"]'), null);
    assert.equal(h.find('#exam-date').value, '2026-09-17');
    assert.equal(h.window.localStorage.getItem('rubiks-daily-exam-v1'), saved, 'No yesterday answer or today record is invented');
    await h.click('[data-action="exam-date"][data-value="2026-09-18"]');
    assert.ok(h.find('[data-action="exam-start"]'));
    assert.equal(h.find('.exam-scramble'), null);
  });
}

test('a language rerender after midnight hides yesterday’s revealed question', async (t) => {
  const h = await browser(t, { date: '2026-09-17T23:59:00' });
  await h.click('[data-action="mode"][data-value="exam"]');
  await h.click('[data-action="exam-start"]');
  await h.click('[data-action="exam-reveal"]');
  h.setDate('2026-09-18T00:01:00');
  h.language('zh-HK');
  assert.equal(h.find('.exam-scramble'), null);
  assert.equal(h.find('.move-list'), null);
  assert.ok(h.find('[data-action="exam-date"][data-value="2026-09-18"]'));
});

for (const storageKey of ['rubiks-practice-v1', 'rubiks-daily-exam-v1']) {
  test(`a failed ${storageKey} save leaves a visible warning across modes and languages`, async (t) => {
    const h = await browser(t);
    const setItem = h.window.Storage.prototype.setItem;
    t.mock.method(h.window.Storage.prototype, 'setItem', function (key, value) {
      if (key === storageKey) throw new Error('Storage unavailable');
      return setItem.call(this, key, value);
    });
    if (storageKey === 'rubiks-practice-v1') await h.click('[data-action="learned"]');
    else {
      await h.click('[data-action="mode"][data-value="exam"]');
      await h.click('[data-action="exam-start"]');
    }
    assert.match(h.find('.storage-warning')?.textContent || '', /Progress could not be saved on this device/);
    await h.click('[data-action="mode"][data-value="practice"]');
    assert.match(h.find('.storage-warning').textContent, /Progress could not be saved/);
    await h.click('[data-action="mode"][data-value="exam"]');
    assert.match(h.find('.storage-warning').textContent, /Progress could not be saved/);
    h.language('zh-HK');
    assert.match(h.find('.storage-warning').textContent, /[\u3400-\u9fff]/);
  });
}

test('an exam preference save failure appears immediately without another navigation', async (t) => {
  const h = await browser(t);
  await h.click('[data-action="mode"][data-value="exam"]');
  t.mock.method(h.window.Storage.prototype, 'setItem', () => { throw new Error('Storage unavailable'); });
  const count = h.find('#exam-count');
  count.value = '5';
  count.dispatchEvent(new h.window.Event('change', { bubbles: true }));
  assert.match(h.find('.storage-warning')?.textContent || '', /Progress could not be saved/);
});

test('choosing daily exam stages retains focus on the changed checkbox', async (t) => {
  const h = await browser(t);
  await h.click('[data-action="mode"][data-value="exam"]');
  const checkbox = h.find('[data-exam-stage="F"]');
  checkbox.focus();
  checkbox.click();
  assert.equal(h.find('[data-exam-stage="F"]').checked, false);
  assert.equal(h.document.activeElement, h.find('[data-exam-stage="F"]'));
});

test('rerendering a top, bottom or freely rotated view keeps its neutral grip caption', async (t) => {
  const h = await browser(t);
  for (const side of ['top', 'bottom', null]) {
    if (side) await h.click(`[data-action="cube-view"][data-value="${side}"]`);
    else h.find('.turn-canvas').dispatchEvent(new h.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    h.language('en');
    assert.equal(h.find('.view-caption').textContent, 'Viewing only — keep your original grip.');
  }
});

test('stage tabs in a library practice case return to that formula library instead of loading a default', async (t) => {
  const h = await browser(t);
  for (const stage of ['P', 'O', 'F', 'F']) {
    const oldCase = h.find('.case-badge')?.textContent;
    await h.click(`[data-action="stage"][data-value="${stage}"]`);
    assert.ok(h.find('.mode-nav [data-value="algorithms"].active'));
    assert.ok(h.find(`.stage-tabs [data-value="${stage}"].active`));
    assert.equal(h.find('.turn-canvas'), null);
    assert.equal(h.find('.move-list'), null);
    const record = cases.filter(c => c.stage === stage).at(-1);
    await h.click(`.case-card[data-id="${record.id}"]`);
    assert.equal(h.find('.case-badge').textContent, record.name);
    assert.ok(oldCase, 'Started from a specific practice formula');
  }
  await h.click('[data-action="stage"][data-value="C"]');
  assert.ok(h.find('.mode-nav [data-value="algorithms"].active'));
  assert.ok(h.find('.cross-tip'));
});

test('every formula is visible in its pattern chapter without load-more controls', async (t) => {
  const h = await browser(t, { language: 'zh-HK' });
  await h.click('[data-action="mode"][data-value="algorithms"]');
  for (const stage of ['F', 'O', 'P']) {
    await h.click(`[data-action="stage"][data-value="${stage}"]`);
    const expected = cases.filter(c => c.stage === stage);
    assert.equal(h.document.querySelectorAll('.case-card').length, expected.length);
    assert.equal(h.find('[data-action="load-cases"]'), null);
    const sections = [...h.document.querySelectorAll('.library-group')];
    assert.equal(sections.length, new Set(expected.map(c => c.group)).size);
    assert.equal(h.find('#library-cards details'), null, 'All groups remain expanded');
    for (const section of sections) {
      assert.match(section.querySelector('h3').textContent, /[\u3400-\u9fff]/);
      assert.deepEqual([...section.querySelectorAll('.case-card')].map(c => c.dataset.id), expected.filter(c => c.group === section.dataset.group).map(c => c.id));
    }
    const jump = h.find('[data-action="library-group"]');
    const targetId = jump.dataset.value;
    jump.click();
    assert.equal(h.document.activeElement.id, targetId);
  }
});

test('refresh restores the exact nondefault formula variation and its playback position', async (t) => {
  let navigation, expectedMoves, expectedName;
  await t.test('select a variation and save the page', async context => {
    const h = await browser(context);
    await h.click('[data-action="mode"][data-value="algorithms"]');
    await h.click('[data-action="stage"][data-value="P"]');
    const record = cases.find(c => c.stage === 'P' && c.alternatives?.length);
    await h.click(`.case-card[data-id="${record.id}"]`);
    await h.click('[data-action="mode"][data-value="algorithms"]');
    await h.click(`[data-action="alternative"][data-id="${record.id}"][data-index="0"]`);
    h.speed(1);
    await h.click('[data-action="jump"][data-index="2"]');
    assert.match(h.find('.live-move').textContent, /Move 2 of/);
    expectedName = record.name; expectedMoves = h.find('.move-list').textContent;
    h.window.dispatchEvent(new h.window.Event('pagehide'));
    navigation = JSON.parse(h.window.localStorage.getItem('rubiks-navigation-v1'));
    assert.equal(navigation.caseId, record.id);
    assert.equal(navigation.algorithm, record.alternatives[0]);
  });
  await t.test('reload returns to the same formula', async context => {
    const h = await browser(context, { navigation });
    assert.equal(h.find('.case-badge').textContent, expectedName);
    assert.equal(h.find('.move-list').textContent, expectedMoves);
    assert.match(h.find('.live-move').textContent, /Move 2 of/);
  });
});

test('refresh restores a filtered formula chapter and library scroll position', async (t) => {
  let navigation;
  await t.test('remember the chapter filter', async context => {
    const h = await browser(context);
    await h.click('[data-action="mode"][data-value="algorithms"]');
    await h.click('[data-action="stage"][data-value="O"]');
    const group = h.find('#group'); group.value = 'Corners Oriented';
    group.dispatchEvent(new h.window.Event('change', { bubbles: true }));
    const search = h.find('#case-search'); search.value = '57';
    search.dispatchEvent(new h.window.Event('input', { bubbles: true }));
    h.window.scrollTo({ top: 640 });
    h.window.dispatchEvent(new h.window.Event('pagehide'));
    navigation = JSON.parse(h.window.localStorage.getItem('rubiks-navigation-v1'));
    assert.equal(navigation.group, 'Corners Oriented');
  });
  await t.test('restore chapter and scroll', async context => {
    const h = await browser(context, { navigation });
    assert.ok(h.find('.mode-nav [data-value="algorithms"].active'));
    assert.equal(h.find('#group').value, 'Corners Oriented');
    assert.equal(h.find('#case-search').value, '57');
    assert.deepEqual([...h.document.querySelectorAll('.case-card')].map(c => c.dataset.id), ['oll-57']);
    assert.equal(h.scrolls.at(-1).top, 640);
  });
});

test('leaving for Daily Exam saves the latest formula position without replacing it with an exam case', async (t) => {
  const h = await browser(t);
  await h.click('[data-action="jump"][data-index="2"]');
  await h.click('[data-action="cube-view"][data-value="bottom"]');
  h.window.scrollTo({ top: 480 });
  await h.click('[data-action="mode"][data-value="exam"]');
  await h.click('[data-action="exam-start"]');
  h.window.dispatchEvent(new h.window.Event('pagehide'));
  const navigation = JSON.parse(h.window.localStorage.getItem('rubiks-navigation-v1'));
  assert.equal(navigation.caseId, 'oll-27');
  assert.equal(navigation.step, 2);
  assert.equal(navigation.view, 'bottom');
  assert.equal(navigation.scrollY, 480);
});
