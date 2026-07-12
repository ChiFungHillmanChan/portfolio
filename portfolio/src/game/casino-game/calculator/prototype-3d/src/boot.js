(() => {
  const C = (globalThis.CASINO ??= {});
  document.getElementById('enterBtn').addEventListener('click', () => {
    document.getElementById('splash').remove();
    document.getElementById('hud').hidden = false;
    console.log('CASINO boot ok, THREE r' + THREE.REVISION);
  });
})();
