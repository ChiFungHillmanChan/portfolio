(() => {
  const C = (globalThis.CASINO ??= {});

  if (location.hash === '#gallery') {
    document.getElementById('splash').remove();
    document.getElementById('hud').hidden = false;
    C.app.init();
    const s = C.app.scene;
    s.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 0.8); key.position.set(3, 6, 4); s.add(key);
    const A = C.assets, O = C.outcomes;
    const items = [
      A.makeCard({ r: 14, s: 0 }), A.makeCard({ r: 12, s: 1 }), A.makeCard(null),
      A.makeChipStack(100, 5), A.makeChipStack(5000, 9),
      A.makeStool(), A.makeDealer(),
      A.makePlaque(['ROULETTE', '100 – 5,000 PER SPOT', 'MAX 20,000 PER SPIN']),
      A.makeSign('BLACKJACK'),
    ];
    items.forEach((m, i) => { m.position.set((i % 5) * 0.8 - 1.6, 0.8, -Math.floor(i / 5) * 0.8); s.add(m); });
    C.app.jumpTo({ pos: [0, 1.4, 2.6], look: [0, 0.7, -0.4] });
    return;
  }

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
