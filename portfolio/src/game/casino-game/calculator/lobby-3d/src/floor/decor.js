(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};

  // Ambient décor: the cashier cage (recessed into the east wall, dead-ahead
  // down the aisle) and the bar lounge (north wall by the gate, on your left
  // as you enter). Both register anchors — the cashier's DOM card is wallet
  // services, the bar's is the bartender's tip. Plants and columns are scenery.

  function buildBar(s, A) {
    // NW lounge: counter along the north wall in the bar bay (roulette is
    // shifted east in sections.js to open it). First thing on your left as you
    // enter the floor. A bartender serves a rotating strategy tip when you walk
    // up — platform.js shows the tip card (anchor kind: 'bar').
    const CX = -11.9;        // bar centre (x)
    const NWALL = -10.5;     // north wall z
    const FRONT = -9.15;     // counter front face (south side, faces the player)

    // counter: dark wood front + pale stone top + gold underglow
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.9, 1.05, 0.5), A.woodMaterial('#1d1712'));
    counter.position.set(CX, 0.525, FRONT - 0.25);
    counter.castShadow = true; counter.receiveShadow = true;
    s.add(counter);
    const top = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.05, 0.68),
      new THREE.MeshStandardMaterial({ color: '#d9dade', roughness: 0.22, metalness: 0.1 }));
    top.position.set(CX, 1.075, FRONT - 0.25);
    top.castShadow = true; top.receiveShadow = true;
    s.add(top);
    const glow = A.ledStrip('#8a6c3a', 3.7, 0.05, 0.03);
    glow.position.set(CX, 0.25, FRONT + 0.02);
    s.add(glow);

    // back shelf against the north wall + emissive bottles
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.4, 0.3),
      new THREE.MeshStandardMaterial({ color: '#14161c', roughness: 0.7 }));
    shelf.position.set(CX, 1.2, NWALL + 0.15);
    s.add(shelf);
    const bottleColors = ['#59d8ff', '#ffd75e', '#ff79c6', '#8dffb0', '#c479ff'];
    for (let i = 0; i < 12; i++) {
      const h = 0.22 + (i % 3) * 0.05;
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.045, h, 8),
        new THREE.MeshBasicMaterial({ color: bottleColors[i % bottleColors.length], fog: false }),
      );
      bottle.position.set(CX - 1.9 + i * 0.35, 1.35 + (i % 2) * 0.5 + h / 2, NWALL + 0.34);
      s.add(bottle);
    }
    for (const y of [1.32, 1.82]) {
      const strip = A.ledStrip('#d7b45c', 3.6, 0.03, 0.04);
      strip.position.set(CX, y, NWALL + 0.36);
      s.add(strip);
    }

    // stools along the aisle side + pendants + a warm light
    for (let i = 0; i < 4; i++) {
      const stool = A.makeStool();
      stool.position.set(CX - 1.5 + i * 1.0, 0, FRONT + 0.55);
      s.add(stool);
    }
    for (let i = 0; i < 3; i++) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.6, 6), A.steelMaterial());
      cord.position.set(CX - 1.4 + i * 1.4, 4.7, FRONT - 0.1);
      s.add(cord);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10),
        new THREE.MeshBasicMaterial({ color: '#ffdf9e', fog: false }));
      lamp.position.set(CX - 1.4 + i * 1.4, 3.9, FRONT - 0.1);
      s.add(lamp);
    }
    const warm = new THREE.PointLight(0xffd9a0, 0.7, 8, 2);
    warm.position.set(CX, 3.4, FRONT - 0.4);
    s.add(warm);

    // BAR neon faces the player (+Z, south) — no rotation needed
    const sign = A.makeNeonSign('BAR', '#ffd75e', { w: 1.1, h: 0.5 });
    sign.position.set(CX, 3.4, NWALL + 0.5);
    s.add(sign);

    // bartender behind the counter, facing the player (+Z south = default)
    const tender = A.makeDealer({ suit: '#3a1712', seed: 'bartender-v1' });
    tender.position.set(CX + 0.25, 0, NWALL + 0.5);
    s.add(tender);
    tender.userData.idle(C.app);
    const rig = tender.userData.rig;

    // Proximity host: bartender tracks the player near the bar and waves the
    // first time (re-arms after they leave), same pattern as the receptionist.
    let greetedAt = -Infinity, wasNear = false, proxT = 0;
    C.app.onFrame((dt, elapsed) => {
      proxT += dt;
      if (proxT < 0.5) return;
      proxT = 0;
      const p = C.app.player;
      const near = Math.hypot(p.x - CX, p.z - FRONT) < 4.5;
      if (near) rig.lookAt(C.app, [p.x, 1.4, p.z]);
      else if (wasNear) rig.lookAt(C.app, [CX, 1.4, 0]);
      if (near && !wasNear && elapsed - greetedAt > 30) {
        greetedAt = elapsed;
        rig.play(C.app, 'wave');
      }
      wasNear = near;
    });

    // platform.js calls this with the tip it's showing on the bar card, so the
    // spoken line and the card match.
    C.stage.barSay = (text) => {
      rig.lookAt(C.app, [C.app.player.x, 1.4, C.app.player.z]);
      rig.say(C.app, text, { ms: 4200 });
    };

    C.world.addObstacle({ x: CX, z: FRONT - 0.35, r: 1.7 });
    C.world.addAnchor({
      id: 'bar', kind: 'bar', pos: [CX, FRONT + 1.1], radius: 2.6,
      approach: C.floorplan.ANCHOR_POSES.bar,
    });
    C.app.addPickable(sign, () => C.stage.goTo('bar'));
  }

  function buildCashier(s, A) {
    // Recessed cage set into the east wall, centred on the aisle — the focal
    // point straight down the aisle as you enter. Real-casino "cage at the
    // back" format: a teller behind a brass grille, a wall of chip trays in the
    // vault behind. Same wallet card as before (anchor kind: 'cashier').
    const EWALL = 18.0;      // east wall x
    const CFRONT = 16.45;    // counter west face (faces the player)
    const HALF = 2.7;        // cage half-width (z)
    const dark = () => new THREE.MeshStandardMaterial({ color: '#14161c', roughness: 0.7 });
    const barMat = A.goldMaterial();

    // recessed back wall (vault backdrop) + soffit ceiling over the opening
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.3, HALF * 2 + 0.4), dark());
    back.position.set(EWALL - 0.2, 1.65, 0);
    back.receiveShadow = true;
    s.add(back);
    const soffit = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, HALF * 2 + 0.4), dark());
    soffit.position.set(EWALL - 1.0, 3.2, 0);
    s.add(soffit);

    // chip vault: three lit shelves of stacked chips behind the teller
    const chipCols = ['#c0392b', '#2c7a3f', '#2b4a8b', '#26262e', '#b58a2e'];
    for (let row = 0; row < 3; row++) {
      const y = 1.15 + row * 0.72;
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, HALF * 2 - 0.2),
        new THREE.MeshStandardMaterial({ color: '#0e1015', roughness: 0.8 }));
      shelf.position.set(EWALL - 0.4, y - 0.16, 0);
      s.add(shelf);
      for (let i = 0; i < 11; i++) {
        const z = -HALF + 0.35 + i * ((HALF * 2 - 0.7) / 10);
        const n = 3 + ((i + row) % 4);   // stack height varies
        const stack = new THREE.Mesh(
          new THREE.CylinderGeometry(0.075, 0.075, 0.028 * n, 16),
          new THREE.MeshStandardMaterial({ color: chipCols[(i + row) % chipCols.length], roughness: 0.45 }),
        );
        stack.position.set(EWALL - 0.4, y + 0.028 * n / 2, z);
        stack.castShadow = true;
        s.add(stack);
      }
      const led = A.ledStrip('#d7b45c', 0.05, 0.02, HALF * 2 - 0.3);
      led.position.set(EWALL - 0.6, y + 0.34, 0);
      s.add(led);
    }

    // counter + pale stone top + gold underglow
    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.02, HALF * 2), A.woodMaterial('#1d1712'));
    counter.position.set(CFRONT + 0.3, 0.51, 0);
    counter.castShadow = true; counter.receiveShadow = true;
    s.add(counter);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.05, HALF * 2 + 0.2),
      new THREE.MeshStandardMaterial({ color: '#d9dade', roughness: 0.25, metalness: 0.1 }));
    top.position.set(CFRONT + 0.3, 1.045, 0);
    s.add(top);
    const glow = A.ledStrip('#8a6c3a', 0.03, 0.05, HALF * 2 - 0.2);
    glow.position.set(CFRONT + 0.02, 0.25, 0);
    s.add(glow);

    // brass grille with a central service window (vertical bars run along z)
    const N = 15;
    for (let i = 0; i <= N; i++) {
      const bz = -HALF + i * (HALF * 2 / N);
      const inWindow = Math.abs(bz) < 0.55;
      const y0 = inWindow ? 2.15 : 1.07;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 3.05 - y0, 8), barMat);
      bar.position.set(CFRONT, y0 + (3.05 - y0) / 2, bz);
      bar.castShadow = true;
      s.add(bar);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, HALF * 2 + 0.1), barMat);
    lintel.position.set(CFRONT, 3.05, 0);
    s.add(lintel);
    const windowSill = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 1.16), barMat);
    windowSill.position.set(CFRONT, 2.12, 0);
    s.add(windowSill);

    // side pillars framing the cage
    for (const sz of [-HALF - 0.05, HALF + 0.05]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.05, 0.4), dark());
      pillar.position.set(EWALL - 0.85, 1.525, sz);
      pillar.castShadow = true;
      s.add(pillar);
    }

    // teller inside the cage, facing the player (west)
    const teller = A.makeDealer({ suit: '#1c2440', seed: 'cashier-teller-v1' });
    teller.position.set(EWALL - 1.0, 0, 0);
    teller.rotation.y = -Math.PI / 2;   // faces -X (west)
    s.add(teller);
    teller.userData.idle(C.app);
    const trig = teller.userData.rig;
    let proxT = 0;
    C.app.onFrame((dt) => {
      proxT += dt; if (proxT < 0.4) return; proxT = 0;
      const p = C.app.player;
      if (Math.hypot(p.x - EWALL, p.z) < 6) trig.lookAt(C.app, [p.x, 1.5, p.z]);
      else trig.lookAt(C.app, [CFRONT - 3, 1.5, 0]);
    });

    const sign = A.makeNeonSign('CASHIER', '#ffd27f', { w: 2.0, h: 0.5 });
    sign.position.set(CFRONT - 0.05, 3.55, 0);
    sign.rotation.y = -Math.PI / 2;     // faces west
    s.add(sign);

    for (const dz of [-1.5, 1.5]) {
      const downlight = new THREE.PointLight(0xffe2b0, 0.6, 6, 2);
      downlight.position.set(EWALL - 1.2, 3.4, dz);
      s.add(downlight);
    }

    C.world.addObstacle({ x: CFRONT + 0.25, z: 0, r: 2.3 });
    C.world.addObstacle({ x: EWALL - 0.85, z: -HALF, r: 1.0 });
    C.world.addObstacle({ x: EWALL - 0.85, z: HALF, r: 1.0 });
    C.world.addAnchor({
      id: 'cashier', kind: 'cashier', pos: [15.0, 0], radius: 2.8,
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
    buildBar(s, A);
    buildCashier(s, A);
    buildPlantsAndColumns(s, A);
  };
})();
