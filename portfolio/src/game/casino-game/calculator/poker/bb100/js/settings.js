// settings.js — open/close the Settings drawer (gear button → slide-in panel
// containing auth + quota + tier + My Sessions). Plain ES5 script so it loads
// before the ES modules; bootstrap.js still renders auth/quota into the same
// element IDs (#authSlot, #quotaMeter, #tierBanner, etc.) which now live in
// the drawer instead of inline.
(function () {
  var DRAWER_ID = 'settingsDrawer';
  var BTN_ID = 'settingsBtn';
  var OPEN_CLASS = 'is-open';

  function openDrawer() {
    var d = document.getElementById(DRAWER_ID);
    if (!d) return;
    d.hidden = false;
    d.setAttribute('aria-hidden', 'false');
    // Animate in on the next frame so the [hidden]→visible transition runs.
    requestAnimationFrame(function () { d.classList.add(OPEN_CLASS); });
    document.body.classList.add('settings-open');
    // If the sessions panel is now visible, trigger any "render-on-visible"
    // logic via a custom event the cloud bootstrap listens for.
    try { window.dispatchEvent(new Event('settings:open')); } catch (_) {}
  }

  function closeDrawer() {
    var d = document.getElementById(DRAWER_ID);
    if (!d) return;
    d.classList.remove(OPEN_CLASS);
    document.body.classList.remove('settings-open');
    // After the transition finishes, hide so it's removed from the a11y tree
    // and from layout. Match the CSS animation duration (~220ms).
    setTimeout(function () {
      if (!d.classList.contains(OPEN_CLASS)) {
        d.hidden = true;
        d.setAttribute('aria-hidden', 'true');
      }
    }, 250);
  }

  function bind() {
    var btn = document.getElementById(BTN_ID);
    if (btn) btn.addEventListener('click', openDrawer);
    var d = document.getElementById(DRAWER_ID);
    if (d) {
      d.addEventListener('click', function (e) {
        var t = e.target;
        if (t && (t.matches && t.matches('[data-settings-action="close"]') || (t.closest && t.closest('[data-settings-action="close"]')))) {
          closeDrawer();
        }
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var dd = document.getElementById(DRAWER_ID);
        if (dd && dd.classList.contains(OPEN_CLASS)) closeDrawer();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
