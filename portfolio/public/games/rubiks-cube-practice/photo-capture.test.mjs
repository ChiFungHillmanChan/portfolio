import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { openPhotoCapture } from './photo-capture.js';
import { defaultScheme } from './cube-view.js';
import { setLocale, t as translate } from './i18n.js';

const RGB = { U: [246, 216, 22], R: [205, 35, 42], F: [27, 151, 69], D: [238, 238, 238], L: [244, 114, 23], B: [31, 87, 211] };
const STICKERS = ['U', 'R', 'F', 'D', 'F', 'L', 'B', 'R', 'U'];

// The DOM, dialog controller, perspective sampling and color classification are
// real. Only file decoding and canvas APIs unavailable in jsdom are substituted.
function browser(testContext, { language = 'en', nativeDialog = true, size = [90, 90] } = {}) {
  const dom = new JSDOM('<main id="app"><button id="opener">Photograph</button></main>', { url: 'https://rubiks-cube-practice.hillmanchan.com/' });
  const { window } = dom;
  const { document } = window;
  const globals = new Map();
  const images = [];
  const contexts = new Map();
  const created = [];
  const revoked = [];
  let controller;
  const install = (name, value) => {
    globals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  };
  class MockImage {
    constructor() {
      this.naturalWidth = size[0];
      this.naturalHeight = size[1];
      images.push(this);
    }
  }
  class PhotoURL extends globalThis.URL {
    static createObjectURL() {
      const url = `blob:photo-${created.length + 1}`;
      created.push(url);
      return url;
    }
    static revokeObjectURL(url) { revoked.push(url); }
  }
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  if (nativeDialog) window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  else delete window.HTMLDialogElement.prototype.showModal;
  window.HTMLCanvasElement.prototype.getContext = function () {
    if (contexts.has(this)) return contexts.get(this);
    const canvas = this;
    const context = {
      fills: [],
      drawImage() {}, beginPath() {}, rect() {}, moveTo() {}, lineTo() {},
      closePath() {}, stroke() {}, translate() {}, rotate() {},
      fill() { this.fills.push(this.fillStyle); },
      getImageData() {
        const { width, height } = canvas;
        const data = new Uint8ClampedArray(width * height * 4);
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          const index = Math.min(2, Math.floor(y / height * 3)) * 3 + Math.min(2, Math.floor(x / width * 3));
          data.set([...RGB[STICKERS[index]], 255], (y * width + x) * 4);
        }
        return { width, height, data };
      },
    };
    contexts.set(canvas, context);
    return context;
  };
  install('window', window);
  install('document', document);
  install('localStorage', window.localStorage);
  install('Image', MockImage);
  install('URL', PhotoURL);
  setLocale(language);
  document.body.style.overflow = 'auto';
  document.querySelector('#opener').focus();
  testContext.after(() => {
    controller?.close();
    setLocale('en');
    window.close();
    for (const [name, descriptor] of globals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  return {
    window, document, images, contexts, created, revoked,
    find: selector => document.querySelector(selector),
    open(options = {}) { controller = openPhotoCapture({ face: 'F', scheme: defaultScheme, ...options }); return controller; },
    click(label) {
      const button = [...document.querySelectorAll('button')].find(element => element.textContent === translate(label));
      assert.ok(button, `Expected button: ${label}`);
      button.click();
    },
    choose({ gallery = false, type = 'image/png', bytes = 100 } = {}) {
      const input = document.querySelector(`input[type="file"]${gallery ? ':not([capture])' : '[capture]'}`);
      const file = new window.File([new Uint8Array(bytes)], 'cube.png', { type });
      Object.defineProperty(input, 'files', { configurable: true, value: [file] });
      input.dispatchEvent(new window.Event('change'));
      return images.at(-1);
    },
    decode() { const image = images.at(-1); assert.equal(typeof image.onload, 'function'); image.onload(); },
  };
}

test('camera and gallery are separate still-image pickers and the modal uses the current Chinese locale', (context) => {
  const h = browser(context, { language: 'zh-HK' });
  h.open({ face: 'U', topLayerOnly: true });
  const camera = h.find('input[capture="environment"]');
  const gallery = h.find('input[type="file"]:not([capture])');
  assert.ok(camera && gallery);
  assert.equal(camera.accept, 'image/*');
  assert.equal(gallery.accept, 'image/*');
  assert.equal(camera.hidden, true);
  assert.equal(gallery.hidden, true);
  let cameraClicks = 0;
  let galleryClicks = 0;
  camera.addEventListener('click', () => cameraClicks++);
  gallery.addEventListener('click', () => galleryClicks++);
  h.click('Take a photo');
  h.click('Choose a photo or screenshot');
  assert.equal(cameraClicks, 1);
  assert.equal(galleryClicks, 1);
  assert.match(h.find('h2').textContent, /頂面/);
  assert.match(h.find('.photo-copy').textContent, /照片/);
  h.choose({ gallery: true });
  h.decode();
  h.click('Read colors');
  assert.match(h.find('.photo-review h3').textContent, /顏色/);
  assert.match(h.find('.photo-swatch').getAttribute('aria-label'), /頂面/);
  assert.equal(h.find('.photo-use').textContent, '使用這些顏色');
});

test('side last-layer photos darken unused rows and apply reviewed corrections only after cleanup', (context) => {
  const h = browser(context);
  const order = [];
  let applied;
  const controller = h.open({ topLayerOnly: true,
    onClose() { order.push('close'); },
    onApply(value) {
      order.push('apply');
      assert.equal(h.find('dialog'), null);
      assert.equal(h.document.body.style.overflow, 'auto');
      assert.equal(h.document.activeElement.id, 'opener');
      for (const canvas of h.contexts.keys()) assert.deepEqual([canvas.width, canvas.height], [0, 0]);
      assert.deepEqual(h.revoked, h.created);
      applied = value;
    },
  });
  h.choose();
  h.decode();
  const preview = h.find('.photo-preview');
  assert.ok(h.contexts.get(preview).fills.includes('rgba(9, 17, 32, .7)'), 'The lower two rows are darkened in the photo preview');
  h.click('Read colors');
  const swatches = [...h.document.querySelectorAll('.photo-swatch')];
  assert.equal(swatches.filter(button => !button.disabled).length, 3);
  assert.equal(h.find('.photo-review-grid').classList.contains('top-row-only'), true);
  assert.equal(swatches[4].disabled, true);
  assert.match(swatches[4].getAttribute('aria-label'), /Fixed center/);
  assert.ok(swatches.slice(3).every(button => button.classList.contains('inactive')));
  swatches[1].click();
  h.find('.photo-color-choice[data-color="L"]').click();
  assert.match(swatches[1].getAttribute('aria-label'), /orange/);
  h.click('Use these colors');
  assert.deepEqual(applied, { face: 'F', colors: ['U', 'L', 'F', 'F', 'F', 'F', 'F', 'F', 'F'], sampleCenter: RGB.F });
  assert.deepEqual(order, ['close', 'apply']);
  controller.close();
  assert.deepEqual(order, ['close', 'apply'], 'Closing an already closed dialog is harmless');
});

test('whole-face and top-face photos sample all nine grid positions with eight editable stickers', (context) => {
  const h = browser(context);
  for (const [face, topLayerOnly] of [['F', false], ['U', true]]) {
    let applied;
    h.open({ face, topLayerOnly, onApply(value) { applied = value; } });
    h.choose({ gallery: true });
    h.decode();
    h.click('Read colors');
    assert.equal(h.document.querySelectorAll('.photo-swatch:not(:disabled)').length, 8);
    assert.equal(h.document.querySelectorAll('.photo-swatch:disabled').length, 1);
    assert.equal(h.find('.photo-review-grid').classList.contains('top-row-only'), false);
    assert.equal(h.contexts.get(h.find('.photo-preview')).fills.includes('rgba(9, 17, 32, .7)'), false);
    h.click('Use these colors');
    const expected = [...STICKERS];
    expected[4] = face;
    assert.deepEqual(applied.colors, expected, 'Real sampling reads all colors from the synthetic grid, preserving face orientation');
    assert.deepEqual(applied.sampleCenter, face === 'F' ? RGB.F : null, 'A mismatched center is never used for calibration');
  }
});

test('cancellation invalidates pending image callbacks and releases the object URL without applying', (context) => {
  const h = browser(context);
  let closeCount = 0;
  let applyCount = 0;
  h.open({ onClose() { closeCount++; }, onApply() { applyCount++; } });
  const image = h.choose();
  const staleLoad = image.onload;
  const staleError = image.onerror;
  assert.equal(h.created.length, 1);
  h.click('Cancel photo input');
  assert.equal(image.onload, null);
  assert.equal(image.onerror, null);
  assert.equal(image.src, '');
  assert.deepEqual(h.revoked, h.created);
  staleLoad();
  staleError();
  assert.equal(h.find('dialog'), null);
  assert.equal(closeCount, 1);
  assert.equal(applyCount, 0);
  assert.equal(h.contexts.size, 0, 'A canceled decode must not allocate a canvas');
});

test('replacement photos ignore stale decodes, large photos are bounded, and close releases both canvases', (context) => {
  const h = browser(context, { size: [4000, 3000] });
  const controller = h.open();
  const firstImage = h.choose();
  const staleLoad = firstImage.onload;
  h.choose({ gallery: true });
  staleLoad();
  assert.equal(h.find('.photo-alignment').hidden, true);
  assert.equal(h.contexts.size, 0);
  h.decode();
  assert.deepEqual([h.find('.photo-preview').width, h.find('.photo-preview').height], [1200, 900]);
  h.click('Rotate photo 90°');
  assert.deepEqual([h.find('.photo-preview').width, h.find('.photo-preview').height], [900, 1200]);
  controller.close();
  assert.deepEqual(h.revoked, h.created);
  for (const canvas of h.contexts.keys()) assert.deepEqual([canvas.width, canvas.height], [0, 0]);
});

test('unsupported files never decode and fallback dialog restores background and focus on Escape', (context) => {
  const h = browser(context, { nativeDialog: false });
  h.open();
  const dialog = h.find('dialog');
  assert.equal(dialog.dataset.fallback, 'true');
  assert.equal(dialog.getAttribute('aria-modal'), 'true');
  assert.equal(h.find('#app').inert, true);
  h.choose({ type: 'application/pdf' });
  assert.match(h.find('.photo-status').textContent, /photo or image file/);
  h.choose({ bytes: 21 * 1024 * 1024 });
  assert.match(h.find('.photo-status').textContent, /20 MB/);
  assert.equal(h.images.length, 0);
  assert.equal(h.created.length, 0);
  dialog.dispatchEvent(new h.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(h.find('dialog'), null);
  assert.notEqual(h.find('#app').inert, true);
  assert.equal(h.document.activeElement.id, 'opener');
  assert.equal(h.document.body.style.overflow, 'auto');
});
