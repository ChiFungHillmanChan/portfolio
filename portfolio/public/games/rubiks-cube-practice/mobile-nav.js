import { t } from './i18n.js';

const MOBILE_QUERY = '(max-width: 700px), (max-width: 980px) and (max-height: 520px)';
const svg = (path) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="${path}"/></svg>`;

export function mobileNavTrigger() {
  return `<button type="button" class="mobile-nav-trigger" aria-label="${t('Navigation menu')}" aria-controls="site-navigation" aria-expanded="false">${svg('M4 6h16M4 12h16M4 18h16')}<span>${t('Menu')}</span></button>`;
}

// The desktop rail is also the mobile drawer, so chapters and progress never
// need a second copy or a separate synchronization step.
export function createMobileNav(appRoot) {
  const document = appRoot.ownerDocument;
  const window = document.defaultView;
  const sidebar = appRoot.querySelector('#site-navigation');
  const trigger = appRoot.querySelector('.mobile-nav-trigger');
  const main = appRoot.querySelector('.main-shell');
  if (!sidebar || !trigger || !main) return { close() {}, destroy() {} };
  const media = window.matchMedia(MOBILE_QUERY);
  const attributes = new Map(['role', 'aria-modal', 'aria-label', 'aria-hidden', 'inert'].map((name) => [name, sidebar.getAttribute(name)]));
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'mobile-nav-close';
  closeButton.setAttribute('aria-label', t('Close navigation'));
  closeButton.innerHTML = svg('m6 6 12 12M18 6 6 18');
  sidebar.prepend(closeButton);
  const backdrop = document.createElement('div');
  backdrop.className = 'mobile-nav-backdrop';
  backdrop.hidden = true;
  backdrop.setAttribute('aria-hidden', 'true');
  appRoot.append(backdrop);
  let open = false;
  let destroyed = false;
  let previousOverflow;
  let previousMainInert;

  function restoreSidebar() {
    for (const [name, value] of attributes) {
      if (value === null) sidebar.removeAttribute(name);
      else sidebar.setAttribute(name, value);
    }
  }

  function updateSidebar() {
    restoreSidebar();
    if (media.matches && !open) {
      sidebar.setAttribute('inert', '');
      sidebar.setAttribute('aria-hidden', 'true');
    } else if (open) {
      sidebar.removeAttribute('inert');
      sidebar.removeAttribute('aria-hidden');
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
      sidebar.setAttribute('aria-label', t('Navigation menu'));
    }
  }

  function show() {
    if (destroyed || open || !media.matches) return;
    open = true;
    previousOverflow = document.body.style.overflow;
    previousMainInert = main.getAttribute('inert');
    document.body.style.overflow = 'hidden';
    appRoot.classList.add('mobile-nav-open');
    trigger.setAttribute('aria-expanded', 'true');
    backdrop.hidden = false;
    updateSidebar();
    closeButton.focus();
    main.setAttribute('inert', '');
  }

  function close(returnFocus = true) {
    if (!open) return;
    open = false;
    appRoot.classList.remove('mobile-nav-open');
    trigger.setAttribute('aria-expanded', 'false');
    backdrop.hidden = true;
    document.body.style.overflow = previousOverflow;
    if (previousMainInert === null) main.removeAttribute('inert');
    else main.setAttribute('inert', previousMainInert);
    if (returnFocus && media.matches && trigger.isConnected) trigger.focus();
    updateSidebar();
  }

  function onClick(event) {
    if (trigger.contains(event.target)) {
      if (open) close();
      else show();
    } else if (closeButton.contains(event.target) || event.target === backdrop) close();
    else if (open && sidebar.contains(event.target) && event.target.closest('a[href], [data-action="mode"], [data-action="chapter"]')) close();
  }

  function onKeyDown(event) {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      const focusable = [...sidebar.querySelectorAll('a[href], button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex="0"]')]
        .filter((element) => !element.closest('[hidden], [inert]'));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function onFocus(event) {
    if (open && !sidebar.contains(event.target)) closeButton.focus();
  }

  function onViewportChange() {
    if (!media.matches) {
      const focusWasClose = document.activeElement === closeButton;
      close(false);
      if (focusWasClose) (sidebar.querySelector('.mode-nav [aria-current="page"], .mode-nav .active') || sidebar.querySelector('.mode-nav button') || sidebar.querySelector('.brand'))?.focus();
    }
    updateSidebar();
  }

  // Capture runs before the app's delegated click handler replaces the DOM.
  appRoot.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('focusin', onFocus);
  media.addEventListener('change', onViewportChange);
  updateSidebar();

  return {
    close,
    destroy() {
      if (destroyed) return;
      close();
      destroyed = true;
      appRoot.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocus);
      media.removeEventListener('change', onViewportChange);
      restoreSidebar();
      closeButton.remove();
      backdrop.remove();
    },
  };
}
