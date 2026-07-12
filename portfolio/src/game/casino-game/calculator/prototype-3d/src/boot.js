(() => {
  const C = (globalThis.CASINO ??= {});
  document.getElementById('enterBtn').addEventListener('click', () => {
    document.getElementById('splash').remove();
    document.getElementById('hud').hidden = false;
    C.app.init();
    if (C.rooms.lobby) C.app.switchRoom('lobby');
    else {
      // pre-lobby smoke content (removed once Task 6 lands)
      const s = C.app.scene;
      s.add(new THREE.AmbientLight(0xffe9c4, 0.4));
      const key = new THREE.PointLight(0xffe9c4, 1.2); key.position.set(2, 4, 2); s.add(key);
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.6, roughness: 0.3 }));
      cube.position.y = 1.2; s.add(cube);
      C.app.jumpTo({ pos: [0, 1.7, 4], look: [0, 1.2, 0] });
      C.app.onFrame((dt) => (cube.rotation.y += dt));
      C.app.addPickable(cube, () => C.app.banner('PICKING WORKS', 'raycast OK'));
    }
  });
})();
