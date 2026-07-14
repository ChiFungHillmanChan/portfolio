(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};

  // Ambient décor — atmosphere only, deliberately simple, no interactions:
  // a bar along the east wall, the cashier cage on the south wall, plants
  // and columns. The cashier registers an anchor (its DOM card is wallet
  // services); everything else is scenery.

  function buildBar(s, A) {
    // counter along the east wall
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.05, 6.2), A.woodMaterial('#1d1712'));
    front.position.set(16.6, 0.525, 0);
    front.castShadow = true; front.receiveShadow = true;
    s.add(front);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.05, 6.4),
      new THREE.MeshStandardMaterial({ color: '#d9dade', roughness: 0.22, metalness: 0.1 }));
    top.position.set(16.6, 1.075, 0);
    s.add(top);
    const glow = A.ledStrip('#8a6c3a', 0.03, 0.05, 6.0);
    glow.position.set(16.3, 0.25, 0);
    s.add(glow);

    // back shelf + emissive bottles
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 5.4),
      new THREE.MeshStandardMaterial({ color: '#14161c', roughness: 0.7 }));
    shelf.position.set(17.8, 1.2, 0);
    s.add(shelf);
    const bottleColors = ['#59d8ff', '#ffd75e', '#ff79c6', '#8dffb0', '#c479ff'];
    for (let i = 0; i < 12; i++) {
      const h = 0.22 + (i % 3) * 0.05;
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.045, h, 8),
        new THREE.MeshBasicMaterial({ color: bottleColors[i % bottleColors.length], fog: false }),
      );
      bottle.position.set(17.62, 1.35 + (i % 2) * 0.5 + h / 2, -2.2 + i * 0.4);
      s.add(bottle);
    }
    const shelfStrip = A.ledStrip('#d7b45c', 0.04, 0.03, 5.2);
    shelfStrip.position.set(17.6, 1.32, 0);
    s.add(shelfStrip);
    const shelfStrip2 = A.ledStrip('#d7b45c', 0.04, 0.03, 5.2);
    shelfStrip2.position.set(17.6, 1.82, 0);
    s.add(shelfStrip2);

    // stools + pendants + a warm light
    for (let i = 0; i < 4; i++) {
      const stool = A.makeStool();
      stool.position.set(15.9, 0, -2.2 + i * 1.45);
      s.add(stool);
    }
    for (let i = 0; i < 3; i++) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.6, 6), A.steelMaterial());
      cord.position.set(16.6, 4.7, -1.8 + i * 1.8);
      s.add(cord);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10),
        new THREE.MeshBasicMaterial({ color: '#ffdf9e', fog: false }));
      lamp.position.set(16.6, 3.9, -1.8 + i * 1.8);
      s.add(lamp);
    }
    const warm = new THREE.PointLight(0xffd9a0, 0.7, 8, 2);
    warm.position.set(16.2, 3.4, 0);
    s.add(warm);

    const sign = A.makeNeonSign('BAR', '#ffd75e', { w: 1.1, h: 0.5 });
    sign.position.set(17.9, 3.4, 0);
    sign.rotation.y = -Math.PI / 2;
    s.add(sign);

    C.world.addObstacle({ x: 16.9, z: 0, r: 3.4 });
  }

  function buildCashier(s, A) {
    const X = 2.6, WALL = 10.5;
    // counter facing north + marble top
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.02, 0.6), A.woodMaterial('#1d1712'));
    counter.position.set(X, 0.51, WALL - 0.85);
    counter.castShadow = true; counter.receiveShadow = true;
    s.add(counter);
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.05, 0.75),
      new THREE.MeshStandardMaterial({ color: '#d9dade', roughness: 0.25, metalness: 0.1 }));
    top.position.set(X, 1.045, WALL - 0.85);
    s.add(top);

    // brass cage bars with a central service window
    const barMat = A.goldMaterial();
    for (let i = 0; i <= 11; i++) {
      const bx = X - 1.5 + i * (3.0 / 11);
      const inWindow = Math.abs(bx - X) < 0.5;
      const y0 = inWindow ? 2.15 : 1.07;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 3.05 - y0, 8), barMat);
      bar.position.set(bx, y0 + (3.05 - y0) / 2, WALL - 0.85);
      bar.castShadow = true;
      s.add(bar);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.1), barMat);
    lintel.position.set(X, 3.05, WALL - 0.85);
    s.add(lintel);
    const windowSill = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.05, 0.12), barMat);
    windowSill.position.set(X, 2.12, WALL - 0.85);
    s.add(windowSill);

    // side panels
    for (const sx of [-1.65, 1.65]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.05, 0.5),
        new THREE.MeshStandardMaterial({ color: '#14161c', roughness: 0.7 }));
      panel.position.set(X + sx, 1.525, WALL - 0.85);
      panel.castShadow = true;
      s.add(panel);
    }

    const sign = A.makeNeonSign('CASHIER', '#ffd27f', { w: 2.0, h: 0.5 });
    sign.position.set(X, 3.6, WALL - 0.6);
    s.add(sign);

    const down = new THREE.PointLight(0xffe2b0, 0.8, 7, 2);
    down.position.set(X, 3.9, WALL - 1.6);
    s.add(down);

    C.world.addObstacle({ x: X, z: WALL - 0.85, r: 1.9 });
    C.world.addAnchor({
      id: 'cashier', kind: 'cashier', pos: [X, WALL - 2.1], radius: 2.2,
      approach: C.floorplan.ANCHOR_POSES.cashier,
    });
    C.app.addPickable(sign, () => C.stage.goTo('cashier'));
  }

  function buildPlantsAndColumns(s, A) {
    const potMat = new THREE.MeshStandardMaterial({ color: '#23262e', roughness: 0.6, metalness: 0.2 });
    const leafMat = new THREE.MeshStandardMaterial({ color: '#173a26', roughness: 0.9 });
    const mkPlant = (x, z) => {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.5, 12), potMat);
      pot.position.set(x, 0.25, z);
      pot.castShadow = true;
      s.add(pot);
      for (let i = 0; i < 3; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.34 - i * 0.07, 10, 8), leafMat);
        puff.position.set(x + (i - 1) * 0.12, 0.85 + i * 0.35, z + (i % 2) * 0.1 - 0.05);
        puff.castShadow = true;
        s.add(puff);
      }
      C.world.addObstacle({ x, z, r: 0.5 });
    };
    [[-15.4, -9.6], [17.1, -9.6], [-15.4, 9.6], [16.9, 8.4], [-27.2, 5.2], [-27.2, -5.2], [6.9, 9.8]]
      .forEach(([x, z]) => mkPlant(x, z));

    const marble = A.marbleMaterial('#b9bdc4');
    const mkColumn = (x, z) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 5.5, 18), marble);
      col.position.set(x, 2.75, z);
      col.castShadow = true; col.receiveShadow = true;
      s.add(col);
      for (const cy of [0.09, 5.38]) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.14, 18), A.steelMaterial());
        cap.position.set(x, cy, z);
        s.add(cap);
      }
      // thin LED collar around the column
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.018, 8, 24),
        new THREE.MeshBasicMaterial({ color: '#d7b45c', fog: false }));
      collar.rotation.x = Math.PI / 2;
      collar.position.set(x, 2.6, z);
      s.add(collar);
      C.world.addObstacle({ x, z, r: 0.55 });
    };
    [[-10, -3.8], [-10, 3.8], [8, -3.8], [8, 3.8]].forEach(([x, z]) => mkColumn(x, z));
  }

  C.floor.buildDecor = () => {
    const s = C.app.scene, A = C.assets;
    buildBar(s, A);
    buildCashier(s, A);
    buildPlantsAndColumns(s, A);
  };
})();
