(() => {
  const C = (globalThis.CASINO ??= {});

  const DOORS = [
    { name: 'roulette', x: -9, label: 'ROULETTE' },
    { name: 'blackjack', x: -3, label: 'BLACKJACK' },
    { name: 'baccarat', x: 3, label: 'BACCARAT' },
    { name: 'uth', x: 9, label: "ULTIMATE HOLD'EM" },
  ];

  let flying = false; // true while a door fly-through tween owns the camera

  function enterRoom(name) {
    if (!C.rooms[name]) return C.app.banner('COMING SOON', 'This salon is not open yet');
    flying = true;
    const doorX = { roulette: -9, blackjack: -3, baccarat: 3, uth: 9 }[name];
    C.app.flyTo({ pos: [doorX, 1.7, -6.2], look: [doorX, 1.7, -9] }, 1400, () => {
      C.app.fade(() => C.app.switchRoom(name));
    });
  }

  function buildArchway(app, scene, door, mats) {
    const { x, name, label } = door;
    const W = 2.2, H = 3.2, D = 0.4;
    const pillarOffset = W / 2, pillarW = 0.28, archRadius = pillarOffset, tube = 0.12;
    const pillarH = H - archRadius;
    const wallZ = -8, frontZ = wallZ + D / 2;

    const group = new THREE.Group();

    for (const side of [-1, 1]) {
      const px = x + side * pillarOffset;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(pillarW, pillarH, D), mats.wood);
      pillar.position.set(px, pillarH / 2, frontZ);
      pillar.castShadow = true; pillar.receiveShadow = true;
      group.add(pillar);

      const capTop = new THREE.Mesh(new THREE.BoxGeometry(pillarW + 0.1, 0.08, D + 0.08), mats.gold);
      capTop.position.set(px, pillarH, frontZ);
      capTop.castShadow = true;
      group.add(capTop);

      const capBase = new THREE.Mesh(new THREE.BoxGeometry(pillarW + 0.1, 0.1, D + 0.08), mats.gold);
      capBase.position.set(px, 0.05, frontZ);
      capBase.castShadow = true;
      group.add(capBase);
    }

    const arch = new THREE.Mesh(new THREE.TorusGeometry(archRadius, tube, 10, 24, Math.PI), mats.gold);
    arch.position.set(x, pillarH, frontZ);
    arch.castShadow = true;
    group.add(arch);

    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.6), mats.glow);
    glow.position.set(x, 1.4, wallZ + 0.02);
    group.add(glow);

    const sign = C.assets.makeSign(label);
    sign.position.set(x, 3.6, wallZ + 0.05);
    group.add(sign);

    scene.add(group);
    app.addPickable(glow, () => enterRoom(name));
    app.addPickable(sign, () => enterRoom(name));
  }

  function buildPracticeDoor(app, scene, mats) {
    const W = 1.6, H = 2.4, D = 0.3;
    const pillarOffset = W / 2, archRadius = pillarOffset, tube = 0.08;
    const pillarH = H - archRadius;
    const wallX = 12, frontX = wallX - D / 2;

    const group = new THREE.Group();

    for (const side of [-1, 1]) {
      const pz = side * pillarOffset;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(D, pillarH, 0.22), mats.wood);
      pillar.position.set(frontX, pillarH / 2, pz);
      pillar.castShadow = true; pillar.receiveShadow = true;
      group.add(pillar);
    }

    const arch = new THREE.Mesh(new THREE.TorusGeometry(archRadius, tube, 8, 20, Math.PI), mats.gold);
    arch.rotation.y = Math.PI / 2; // reorients the ring from the XY plane into the wall's YZ plane
    arch.position.set(frontX, pillarH, 0);
    arch.castShadow = true;
    group.add(arch);

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 1.8),
      // unlit, like the main doors, but a dimmer/muted tone + lower opacity since this
      // salon is minor (MeshBasicMaterial has no emissiveIntensity to dial down instead)
      new THREE.MeshBasicMaterial({ color: '#a9773f', transparent: true, opacity: 0.55, fog: false }),
    );
    glow.rotation.y = -Math.PI / 2; // faces -X, into the hall, matching the right wall's own orientation
    glow.position.set(wallX - 0.02, 1.15, 0);
    group.add(glow);

    const sign = C.assets.makeSign('PRACTICE ZONE');
    sign.rotation.y = -Math.PI / 2;
    sign.scale.setScalar(0.78);
    sign.position.set(wallX - 0.05, H + 0.45, 0);
    group.add(sign);

    scene.add(group);
    const goBanner = () => C.app.banner('PRACTICE ZONE', 'Trainers & tools — coming soon');
    app.addPickable(glow, goBanner);
    app.addPickable(sign, goBanner);
  }

  function buildChandelier(scene, x, goldMat, candleMat) {
    const group = new THREE.Group();

    const ringR = 0.6;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.055, 8, 20), goldMat);
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = true;
    group.add(ring);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const candle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), candleMat);
      candle.position.set(Math.cos(a) * ringR, 0.14, Math.sin(a) * ringR);
      group.add(candle);
    }

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), goldMat);
    stem.position.y = 0.52;
    group.add(stem);

    // tight, local pool of light rather than a flood -- the chandeliers themselves
    // (unlit candle spheres above) are what reads as "the light", not this PointLight
    const light = new THREE.PointLight(0xffe9c4, 0.3, 7, 2);
    light.castShadow = false; // makeRoomShell's p1 is the hall's one shadow-caster
    group.add(light);

    group.position.set(x, 5, 0);
    scene.add(group);
  }

  function buildColumn(scene, x, z, marbleMat, goldMat) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 6, 16), marbleMat);
    col.position.set(x, 3, z);
    col.castShadow = true; col.receiveShadow = true;
    scene.add(col);

    const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.36, 0.14, 16), goldMat);
    capital.position.set(x, 5.93, z);
    capital.castShadow = true;
    scene.add(capital);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.46, 0.14, 16), goldMat);
    base.position.set(x, 0.07, z);
    base.castShadow = true;
    scene.add(base);
  }

  let driftHook = null;
  let pointerHandler = null;

  C.rooms.lobby = {
    title: 'GRAND CASINO',

    enter(app) {
      flying = false;
      const A = C.assets;
      const scene = app.scene;

      scene.fog = new THREE.Fog(0x120b06, 8, 26);
      scene.add(A.makeRoomShell({
        w: 24, d: 16, h: 6, wallColor: '#3a2418', floorMat: A.carpetMaterial(),
        ceilingColor: '#241610', coveColor: '#2a1a10', coveEmissiveIntensity: 0.15,
        ambientIntensity: 0.15, p1Intensity: 0.35, p2Intensity: 0.28, pointDistance: 14,
      }));

      const mats = {
        wood: A.woodMaterial('#4a2c17'),
        gold: A.goldMaterial(),
        // unlit so the doors read as glowing portals regardless of the hall's dim, foggy lighting
        glow: new THREE.MeshBasicMaterial({ color: '#ffd27f', transparent: true, opacity: 0.85, fog: false }),
      };
      const marbleMat = new THREE.MeshStandardMaterial({ color: '#d8d2c4', roughness: 0.4 });
      const candleMat = new THREE.MeshBasicMaterial({ color: '#ffdf9e', fog: false });

      DOORS.forEach((door) => buildArchway(app, scene, door, mats));
      buildPracticeDoor(app, scene, mats);
      [-6, 0, 6].forEach((x) => buildChandelier(scene, x, mats.gold, candleMat));
      [[5, 3], [5, -3], [-5, 3], [-5, -3]].forEach(([x, z]) => buildColumn(scene, x, z, marbleMat, mats.gold));

      app.jumpTo({ pos: [0, 1.7, 6.5], look: [0, 1.8, -8] });

      if (!app.REDUCED) {
        let mouseNX = 0, mouseNY = 0;
        pointerHandler = (e) => {
          mouseNX = (e.clientX / innerWidth) * 2 - 1;
          mouseNY = (e.clientY / innerHeight) * 2 - 1;
        };
        window.addEventListener('pointermove', pointerHandler);

        driftHook = (dt, elapsed) => {
          if (flying) return; // let the flyTo tween own the camera during a door transition
          app.camera.position.x = 0.35 * Math.sin(elapsed * 0.13);
          const tx = mouseNX * 1.2, ty = 1.8 - mouseNY * 0.4;
          app.camTarget.x += (tx - app.camTarget.x) * dt * 2;
          app.camTarget.y += (ty - app.camTarget.y) * dt * 2;
        };
        app.onFrame(driftHook);
      }
    },

    exit() {
      if (driftHook) { C.app.offFrame(driftHook); driftHook = null; }
      if (pointerHandler) { window.removeEventListener('pointermove', pointerHandler); pointerHandler = null; }
      C.app.scene.fog = null; // switchRoom only disposes scene.children, not scene-level state
    },
  };
})();
