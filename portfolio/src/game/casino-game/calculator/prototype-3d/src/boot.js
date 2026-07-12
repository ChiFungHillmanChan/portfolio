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

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 6),
      new THREE.MeshStandardMaterial({ color: '#202020', roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    s.add(ground);

    // Front row: small props raised to table height on a pedestal so they
    // don't float. Back row: tall props that already stand on the floor
    // (dealer feet / stool legs / plaque pole all start at y=0).
    const frontItems = [
      A.makeCard({ r: 14, s: 0 }), A.makeCard({ r: 12, s: 1 }), A.makeCard(null),
      A.makeChipStack(100, 5), A.makeChipStack(5000, 9),
    ];
    frontItems.forEach((m, i) => {
      const x = (i - 2) * 0.8;
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3),
        new THREE.MeshStandardMaterial({ color: '#161616', roughness: 0.9 }));
      pedestal.position.set(x, 0.45, 0.4);
      pedestal.castShadow = true; pedestal.receiveShadow = true;
      s.add(pedestal);
      m.position.set(x, 0.9, 0.4);
      s.add(m);
    });

    const backItems = [
      A.makeStool(), A.makeDealer(),
      A.makePlaque(['ROULETTE', '100 – 5,000 PER SPOT', 'MAX 20,000 PER SPIN']),
      A.makeSign('BLACKJACK'),
    ];
    backItems.forEach((m, i) => {
      const x = (i - 1.5) * 1.2;
      // makeSign (last item) has no built-in stand (rooms will wall/pole-mount
      // it); here in the gallery, lift it so its bottom edge rests on the floor.
      const y = i === backItems.length - 1 ? 0.18 : 0;
      m.position.set(x, y, -0.8);
      s.add(m);
    });

    C.app.jumpTo({ pos: [0, 1.5, 3.4], look: [0, 0.9, -0.5] });
    return;
  }

  document.getElementById('enterBtn').addEventListener('click', () => {
    document.getElementById('splash').remove();
    document.getElementById('hud').hidden = false;
    C.app.init();
    C.app.switchRoom('lobby');
  });
})();
