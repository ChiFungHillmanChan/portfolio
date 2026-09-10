(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};

  // Service stations own their local geometry and prop choreography. This
  // file places them in the floor and connects their existing navigation.
  function buildServiceStations(scene) {
    const app = C.app, gen = app.roomGen;
    const bar = C.floor.buildBarStation({ app });
    bar.position.set(-11.9, 0, -9.65); scene.add(bar);
    const cashier = C.floor.buildCashierStation({ app });
    cashier.position.set(16.75, 0, 0); cashier.rotation.y = -Math.PI / 2; scene.add(cashier);
    const bs = bar.userData.service, cs = cashier.userData.service;
    C.stage.barOrder = drink => bs.demo(drink);
    C.stage.cashierExchange = (kind, amount) => cs.demo(kind, amount);
    C.stage.barSay = text => {
      if (!bs.busy) bs.rig.say(app, text, { ms: 2800 });
    };
    let elapsed = 0;
    const watch = dt => {
      if (app.roomGen !== gen) {
        app.offFrame(watch); bs.dispose?.(); cs.dispose?.(); return;
      }
      elapsed += dt; if (elapsed < 0.5) return; elapsed = 0;
      const player = app.player;
      for (const station of [bar, cashier]) {
        const service = station.userData.service;
        if (!service.busy && Math.hypot(player.x - station.position.x, player.z - station.position.z) < 6) {
          service.rig.lookAt(app, [player.x, 1.5, player.z]);
        }
      }
    };
    watch.cancel = () => { app.offFrame(watch); bs.dispose?.(); cs.dispose?.(); };
    app.onFrame(watch);
    C.world.addObstacle({ x: -11.9, z: -9.5, r: 1.7 });
    C.world.addAnchor({ id: 'bar', kind: 'bar', pos: [-11.9, -8.05], radius: 2.6, approach: C.floorplan.ANCHOR_POSES.bar });
    C.world.addObstacle({ x: 16.7, z: 0, r: 2.3 });
    C.world.addObstacle({ x: 17.15, z: -2.7, r: 1 });
    C.world.addObstacle({ x: 17.15, z: 2.7, r: 1 });
    C.world.addAnchor({ id: 'cashier', kind: 'cashier', pos: [15, 0], radius: 2.8, approach: C.floorplan.ANCHOR_POSES.cashier });
    if (bar.userData.sign) app.addPickable(bar.userData.sign, () => C.stage.goTo('bar'));
    if (cashier.userData.sign) app.addPickable(cashier.userData.sign, () => C.stage.goTo('cashier'));
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
    [[-14.2, -9.7], [17.1, -9.6], [-15.4, 9.6], [16.9, 8.4], [-27.2, 5.2], [-27.2, -5.2], [6.9, 9.8]]
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
    buildServiceStations(s);
    buildPlantsAndColumns(s, A);
  };
})();
