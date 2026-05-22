// sub-tabs.js — manages the Board / Replay / Details sub-tab switcher
// inside the upload-results panel. Plain ES5, loaded as a regular script.
(function () {
  function bindSubTabs() {
    var bar = document.getElementById('resultsSubTabs');
    if (!bar) return;
    bar.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.sub-tab-btn');
      if (!btn) return;
      var target = btn.getAttribute('data-sub-tab');
      if (!target) return;
      // Toggle button states
      var buttons = bar.querySelectorAll('.sub-tab-btn');
      for (var i = 0; i < buttons.length; i++) {
        var b = buttons[i];
        var active = b.getAttribute('data-sub-tab') === target;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      }
      // Toggle panels
      var panels = document.querySelectorAll('[data-sub-tab-panel]');
      for (var j = 0; j < panels.length; j++) {
        var p = panels[j];
        p.hidden = p.getAttribute('data-sub-tab-panel') !== target;
      }
      // When the chart tab becomes visible, Chart.js may need a resize so it
      // adapts to the now-visible canvas. Dispatch a window resize event so
      // chart.js's responsive logic picks it up. Fire on next frame.
      if (target === 'board') {
        requestAnimationFrame(function () {
          try { window.dispatchEvent(new Event('resize')); } catch (_) {}
        });
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSubTabs);
  } else {
    bindSubTabs();
  }
})();
