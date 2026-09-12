import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mobileNavTrigger, createMobileNav } from './mobile-nav.js';

function setup(t, mobile = true) {
  const dom = new JSDOM(`<div id="app"><aside class="sidebar" id="site-navigation"><a class="brand" href="/">Cube practice</a><nav class="mode-nav"><button data-action="mode" data-value="practice">Practice mode</button><button data-action="mode" data-value="read">Read mode</button></nav><nav class="chapter-nav"><button data-action="chapter" data-value="O">OLL</button></nav><div class="progress-box">2/5 chapters</div><a class="last-link" href="https://example.com">Author</a></aside><div class="main-shell"><header class="topbar">${mobileNavTrigger()}</header><main><button class="outside">Practice</button></main></div></div>`, { url: 'https://example.com' });
  const { window } = dom;
  const { document } = window;
  const media = new window.EventTarget();
  media.matches = mobile;
  window.matchMedia = () => media;
  const root = document.querySelector('#app');
  const controller = createMobileNav(root);
  t.after(() => { controller.destroy(); window.close(); });
  return {
    window, document, root, controller, media,
    sidebar: root.querySelector('.sidebar'),
    main: root.querySelector('.main-shell'),
    trigger: root.querySelector('.mobile-nav-trigger'),
    key(key, shiftKey = false) {
      document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }));
    },
  };
}

test('mobile navigation exposes the existing chapters and progress inside a modal drawer', (t) => {
  const h = setup(t);
  const progress = h.root.querySelector('.progress-box');
  h.document.body.style.overflow = 'clip';
  assert.equal(h.sidebar.getAttribute('aria-hidden'), 'true');
  h.trigger.focus();
  h.trigger.click();
  assert.equal(h.trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(h.sidebar.getAttribute('role'), 'dialog');
  assert.equal(h.sidebar.getAttribute('aria-modal'), 'true');
  assert.equal(h.sidebar.getAttribute('aria-label'), 'Navigation menu');
  assert.equal(h.main.hasAttribute('inert'), true);
  assert.equal(h.document.body.style.overflow, 'hidden');
  assert.equal(h.document.activeElement, h.root.querySelector('.mobile-nav-close'));
  assert.equal(h.root.querySelector('.progress-box'), progress, 'Progress must use the original live DOM');
  h.key('Escape');
  assert.equal(h.trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(h.main.hasAttribute('inert'), false);
  assert.equal(h.document.body.style.overflow, 'clip');
  assert.equal(h.document.activeElement, h.trigger);
});

test('keyboard focus stays inside the open drawer and a backdrop click returns it', (t) => {
  const h = setup(t);
  h.trigger.click();
  const first = h.root.querySelector('.mobile-nav-close');
  const last = h.root.querySelector('.last-link');
  h.key('Tab', true);
  assert.equal(h.document.activeElement, last);
  h.key('Tab');
  assert.equal(h.document.activeElement, first);
  h.root.querySelector('.outside').focus();
  assert.equal(h.document.activeElement, first);
  h.root.querySelector('.mobile-nav-backdrop').click();
  assert.equal(h.document.activeElement, h.trigger);
  assert.equal(h.main.hasAttribute('inert'), false);
});

test('selecting navigation closes before the app handles a mode or chapter change', (t) => {
  const h = setup(t);
  let navigationHandled = false;
  h.root.addEventListener('click', (event) => {
    if (event.target.matches('[data-action="chapter"]')) {
      navigationHandled = true;
      assert.equal(h.root.classList.contains('mobile-nav-open'), false);
      assert.equal(h.main.hasAttribute('inert'), false);
    }
  });
  h.trigger.click();
  h.root.querySelector('[data-action="chapter"]').click();
  assert.equal(navigationHandled, true);
});

test('moving to desktop restores normal sidebar semantics and scroll', (t) => {
  const h = setup(t);
  h.trigger.click();
  h.media.matches = false;
  h.media.dispatchEvent(new h.window.Event('change'));
  assert.equal(h.main.hasAttribute('inert'), false);
  assert.equal(h.sidebar.hasAttribute('inert'), false);
  assert.equal(h.sidebar.hasAttribute('aria-hidden'), false);
  assert.equal(h.sidebar.hasAttribute('role'), false);
  assert.equal(h.document.body.style.overflow, '');
  assert.equal(h.document.activeElement, h.root.querySelector('.mode-nav button'), 'Desktop focus must not remain on the now-hidden close button');
  h.trigger.click();
  assert.equal(h.trigger.getAttribute('aria-expanded'), 'false');
});

test('destroy while open preserves pre-existing page attributes and removes listeners', (t) => {
  const h = setup(t);
  h.main.setAttribute('inert', '');
  h.document.body.style.overflow = 'scroll';
  h.trigger.click();
  h.controller.destroy();
  assert.equal(h.main.hasAttribute('inert'), true);
  assert.equal(h.sidebar.hasAttribute('inert'), false);
  assert.equal(h.document.body.style.overflow, 'scroll');
  assert.equal(h.root.querySelector('.mobile-nav-close'), null);
  assert.equal(h.root.querySelector('.mobile-nav-backdrop'), null);
  h.trigger.click();
  assert.equal(h.trigger.getAttribute('aria-expanded'), 'false');
});
