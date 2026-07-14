(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};

  // Vestibule: reception desk + receptionist (the diegetic ID check), the
  // glass turnstile that gates the main floor, and the Practice corner that
  // needs no login (it sits BEFORE reception on purpose — same rule as 2D).

  let receptionist = null;
  let turnstile = null;   // { setOpen(open) }
  let stamp = null;       // { play() → Promise, reset() } member-card stamp moment

  function buildDesk(s, A) {
    const g = new THREE.Group();
    // Off-axis, angled toward the entrance: the desk must NOT block the
    // aisle to the turnstile (its obstacle circle + the gate corridor
    // previously had no walkable gap).
    g.position.set(-19.3, 0, -1.5);
    g.rotation.y = 0.3;

    // counter: dark wood front + white marble slab + gold LED underglow
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.02, 2.6), A.woodMaterial('#1d1712'));
    body.position.y = 0.51;
    body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.05, 2.76),
      new THREE.MeshStandardMaterial({ color: '#d9dade', roughness: 0.25, metalness: 0.1 }));
    top.position.y = 1.045;
    top.castShadow = true; top.receiveShadow = true;
    g.add(top);
    const glow = A.ledStrip('#8a6c3a', 0.03, 0.05, 2.5);
    glow.position.set(-0.37, 0.22, 0);
    g.add(glow);

    // brass bell
    const bellBase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.02, 16), A.goldMaterial());
    bellBase.position.set(0, 1.08, 0.75);
    const bellDome = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), A.goldMaterial());
    bellDome.position.set(0, 1.09, 0.75);
    bellDome.castShadow = true;
    g.add(bellBase, bellDome);

    // member-card prop + hidden VERIFIED decal + stamp block
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.004, 0.13),
      new THREE.MeshStandardMaterial({ color: '#efe9d8', roughness: 0.6 }));
    card.position.set(-0.12, 1.073, 0.18);
    card.rotation.y = 0.3;
    g.add(card);
    const decalTx = A.canvasTexture(256, 160, (ctx) => {
      ctx.clearRect(0, 0, 256, 160);
      ctx.strokeStyle = 'rgba(38,166,91,0.9)'; ctx.lineWidth = 8;
      ctx.strokeRect(14, 14, 228, 132);
      ctx.fillStyle = 'rgba(38,166,91,0.95)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 44px "Segoe UI", sans-serif';
      ctx.fillText('VERIFIED', 128, 68);
      ctx.font = 'bold 36px "Segoe UI", sans-serif';
      ctx.fillText('✓', 128, 116);
    });
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.105),
      new THREE.MeshBasicMaterial({ map: decalTx, transparent: true, depthWrite: false }));
    decal.rotation.x = -Math.PI / 2;
    decal.rotation.z = -0.3;
    decal.position.set(-0.12, 1.0765, 0.18);
    decal.visible = false;
    g.add(decal);

    const stampG = new THREE.Group();
    const stampHead = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.09),
      new THREE.MeshStandardMaterial({ color: '#22262e', roughness: 0.5, metalness: 0.2 }));
    stampHead.position.y = 0.025;
    const stampHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.08, 10),
      new THREE.MeshStandardMaterial({ color: '#8a6c3a', roughness: 0.4, metalness: 0.5 }));
    stampHandle.position.y = 0.09;
    stampG.add(stampHead, stampHandle);
    const stampRest = new THREE.Vector3(0.14, 1.07, -0.12);
    stampG.position.copy(stampRest);
    g.add(stampG);

    s.add(g);

    // Stamp moment: hop to the card, press, reveal VERIFIED, hop back.
    stamp = {
      play() {
        if (C.app.REDUCED) { decal.visible = true; return Promise.resolve(); }
        return new Promise((res) => {
          C.tween.to(stampG.position, { x: -0.12, y: 1.16, z: 0.18 }, 240, 'outCubic', () => {
            C.tween.to(stampG.position, { y: 1.079 }, 120, 'inOutCubic', () => {
              decal.visible = true;
              C.tween.to(stampG.position, { y: 1.16 }, 140, 'outCubic', () => {
                C.tween.to(stampG.position, { x: stampRest.x, y: stampRest.y, z: stampRest.z }, 240, 'inOutCubic', res);
              });
            });
          });
        });
      },
      reset() { decal.visible = false; },
    };
  }

  function buildTurnstile(s, A) {
    const gx = C.floorplan.GATE_X;
    const group = new THREE.Group();
    const steel = A.steelMaterial();

    const lampMats = [], stripMats = [];
    const wings = [];
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.15, 0.14), steel);
      post.position.set(gx, 0.575, side * 0.8);
      post.castShadow = true;
      group.add(post);
      const lampMat = new THREE.MeshBasicMaterial({ color: '#ff2233', fog: false });
      lampMats.push(lampMat);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), lampMat);
      lamp.position.set(gx, 1.2, side * 0.8);
      group.add(lamp);

      // glass wing hinged at the post, spanning toward the center
      const pivot = new THREE.Group();
      pivot.position.set(gx, 0.66, side * 0.8);
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.95), A.glassMaterial(0.22));
      wing.rotation.y = Math.PI / 2;              // spans the z axis, normal +x
      wing.position.z = -side * 0.36;
      pivot.add(wing);
      const stripMat = new THREE.MeshBasicMaterial({ color: '#ff2233', fog: false });
      stripMats.push(stripMat);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.95, 0.03), stripMat);
      edge.position.set(0, 0, -side * 0.7);
      pivot.add(edge);
      group.add(pivot);
      wings.push({ pivot, side });
    }

    // status glow light at the gate
    const glow = new THREE.PointLight(0xff2233, 0.6, 5, 2);
    glow.position.set(gx, 1.6, 0);
    group.add(glow);

    // glass partition either side of the gate + steel mullions and top rail
    for (const side of [-1, 1]) {
      const span = 5.4 - 0.87;                      // from post to vestibule wall
      const mid = side * (0.87 + span / 2);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(span, 2.6), A.glassMaterial(0.13));
      pane.rotation.y = Math.PI / 2;
      pane.position.set(gx, 1.3, mid);
      group.add(pane);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, span), steel);
      rail.position.set(gx, 2.62, mid);
      group.add(rail);
      for (let i = 0; i <= 3; i++) {
        const mz = side * (0.87 + (span * i) / 3);
        const mull = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.6, 0.06), steel);
        mull.position.set(gx, 1.3, mz);
        mull.castShadow = true;
        group.add(mull);
      }
    }

    s.add(group);
    C.world.addObstacle({ x: gx, z: -0.8, r: 0.3 });
    C.world.addObstacle({ x: gx, z: 0.8, r: 0.3 });

    turnstile = {
      setOpen(open) {
        C.world.gateOpen = open;
        const color = open ? '#35e07c' : '#ff2233';
        lampMats.forEach((m) => m.color.set(color));
        stripMats.forEach((m) => m.color.set(color));
        glow.color.set(color);
        for (const { pivot, side } of wings) {
          const target = open ? -side * 1.31 : 0;   // swing INTO the floor side
          if (C.app.REDUCED) pivot.rotation.y = target;
          else C.tween.to(pivot.rotation, { y: target }, 600, 'inOutCubic');
        }
      },
    };
  }

  function buildPracticeCorner(s, A) {
    const screenTx = A.canvasTexture(256, 192, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 192);
      g.addColorStop(0, '#0a2a38'); g.addColorStop(1, '#0d3d52');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 192);
      ctx.fillStyle = '#59d8ff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 34px "Segoe UI", sans-serif';
      ctx.fillText('PRACTICE', 128, 78);
      ctx.font = '22px "Segoe UI", sans-serif';
      ctx.fillStyle = '#bdeeff';
      ctx.fillText('FREE PLAY', 128, 118);
      ctx.strokeStyle = 'rgba(89,216,255,0.6)'; ctx.lineWidth = 5;
      ctx.strokeRect(10, 10, 236, 172);
    });
    const mkCabinet = (x, z, ry) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.12, 0.6),
        new THREE.MeshStandardMaterial({ color: '#0c0e13', roughness: 0.8 }));
      base.position.y = 0.06;
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.75, 0.55),
        new THREE.MeshStandardMaterial({ color: '#14161c', roughness: 0.7, metalness: 0.2 }));
      body.position.y = 0.995;
      body.castShadow = true; body.receiveShadow = true;
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.34),
        new THREE.MeshBasicMaterial({ map: screenTx, fog: false }));
      screen.position.set(0, 1.28, 0.297);
      screen.rotation.x = -0.07;
      const marquee = A.ledStrip('#59d8ff', 0.58, 0.07, 0.1);
      marquee.position.set(0, 1.92, 0.2);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 0.3),
        new THREE.MeshStandardMaterial({ color: '#1b1e26', roughness: 0.5 }));
      deck.position.set(0, 0.98, 0.38);
      deck.rotation.x = 0.25;
      g.add(base, body, screen, marquee, deck);
      g.position.set(x, 0, z);
      g.rotation.y = ry;
      s.add(g);
      C.world.addObstacle({ x, z, r: 0.65 });
    };
    mkCabinet(-26.2, -5.1, 0.1);
    mkCabinet(-25.1, -5.25, -0.08);

    const sign = A.makeNeonSign('PRACTICE ZONE', '#59d8ff', { w: 2.3, h: 0.42 });
    sign.position.set(-25.6, 2.7, -5.9);
    s.add(sign);
    C.app.addPickable(sign, () => C.stage.goTo('practice'));

    const mat = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.2),
      new THREE.MeshStandardMaterial({ color: '#10222c', roughness: 0.9 }));
    mat.rotation.x = -Math.PI / 2;
    mat.position.set(-25.6, 0.012, -4.2);
    s.add(mat);

    const fill = new THREE.PointLight(0x59d8ff, 0.85, 8, 2);
    fill.position.set(-25.6, 2.9, -4.0);
    s.add(fill);
  }

  C.floor.buildVestibule = () => {
    const s = C.app.scene, A = C.assets;

    buildDesk(s, A);
    buildTurnstile(s, A);
    buildPracticeCorner(s, A);

    // receptionist behind the desk, facing the entrance (far enough back
    // that the resting hands don't clip into the counter slab)
    receptionist = A.makeDealer({ suit: '#1c2a44' });
    receptionist.position.set(-18.35, 0, -1.85);
    receptionist.rotation.y = -Math.PI / 2 + 0.3;
    s.add(receptionist);
    receptionist.userData.idle(C.app);

    // signage above the desk (angled with it, facing the entrance)
    const sign = A.makeNeonSign('RECEPTION — ID CHECK', '#ffd27f', { w: 2.5, h: 0.38 });
    sign.position.set(-19.1, 2.72, -1.5);
    sign.rotation.y = -Math.PI / 2 + 0.3;
    s.add(sign);
    for (const dz of [-1.0, 1.0]) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.6, 8), A.steelMaterial());
      rod.position.set(-19.1 - dz * 0.3, 4.2, -1.5 + dz);
      s.add(rod);
    }

    // desk key light — the vestibule's shadow caster
    const key = new THREE.SpotLight(0xfff0d8, 1.5, 10, 0.62, 0.5, 1.1);
    key.position.set(-21.0, 4.9, -0.4);
    key.target.position.set(-19.3, 1.0, -1.5);
    key.castShadow = !C.app.IS_MOBILE;
    if (key.castShadow) key.shadow.mapSize.set(1024, 1024);
    s.add(key, key.target);

    // anchors + obstacles
    C.world.addObstacle({ x: -19.3, z: -1.5, r: 1.45 });   // desk (receptionist stands inside it)
    C.world.addAnchor({
      id: 'reception', kind: 'reception', pos: [-20.1, -1.0], radius: 2.2,
      approach: C.floorplan.ANCHOR_POSES.reception,
    });
    C.world.addAnchor({
      id: 'practice', kind: 'practice', pos: [-25.4, -4.3], radius: 2.5,
      approach: C.floorplan.ANCHOR_POSES.practice,
    });

    // reception sign is clickable → walk to the counter (platform opens the card)
    C.app.addPickable(sign, () => C.stage.walkToDesk());

    // ---- stage API pieces owned by the vestibule ----
    C.stage.setAccess = (open) => turnstile.setOpen(open);
    C.stage.walkToDesk = () => {
      const p = C.floorplan.ANCHOR_POSES.reception;
      return C.app.glideTo(p.pos, p.look, 900);
    };
    C.stage.playHeadShake = () => receptionist.userData.headShake(C.app);
    C.stage.playWelcome = () => {
      receptionist.userData.lookToward(C.app, [C.app.player.x, 1.5, C.app.player.z]);
      return stamp.play();
    };
    C.stage.resetWelcome = () => stamp.reset();
    C.stage.playWaveThrough = () => {
      if (C.app.REDUCED) {
        const f = C.floorplan.ANCHOR_POSES.floor;
        return C.app.glideTo(f.pos, f.look, 0);
      }
      return new Promise((res) => {
        let skipped = false;
        const finish = () => {
          removeEventListener('pointerup', skip);
          res();
        };
        const skip = () => {
          skipped = true;
          const f = C.floorplan.ANCHOR_POSES.floor;
          C.app.glideTo(f.pos, f.look, 220).then(finish);
        };
        addEventListener('pointerup', skip, { once: true });
        receptionist.userData.lookToward(C.app, [-24, 1.5, 0]);
        receptionist.userData.dealGesture(C.app, [C.floorplan.GATE_X, 1.2, 0], 900);
        const byDesk = { pos: [-19.6, 1.6, 0.2], look: [-16.2, 1.35, 0] };
        C.app.glideTo(byDesk.pos, byDesk.look, 650)
          .then(() => {
            if (skipped) return;
            const f = C.floorplan.ANCHOR_POSES.floor;
            C.app.glideTo(f.pos, f.look, 900).then(() => { if (!skipped) finish(); });
          });
      });
    };
  };
})();
