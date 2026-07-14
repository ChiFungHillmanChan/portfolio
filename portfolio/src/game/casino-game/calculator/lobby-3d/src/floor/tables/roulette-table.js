(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};
  C.floor.tables = C.floor.tables || {};

  // Static roulette table: rail box + printed felt layout + full wheel
  // assembly (ported from the v1 room, spin logic removed — the 3D hub never
  // plays). Group origin = rail center at floor level; +Z faces the aisle.
  const RAIL_H = 0.82, FELT_Y = 0.84, STEP = (Math.PI * 2) / 37;
  const EU_WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

  function makeFeltLayoutTexture() {
    return C.assets.canvasTexture(1024, 512, (ctx) => {
      ctx.fillStyle = '#0b5d3b';
      ctx.fillRect(0, 0, 1024, 512);

      const gx = 40, gy = 30, gw = 940, gh = 380, zeroW = 70;
      const cellW = (gw - zeroW) / 12, cellH = gh / 3;

      ctx.fillStyle = '#0e6b45';
      ctx.fillRect(gx, gy, zeroW, gh);
      ctx.strokeStyle = 'rgba(240,216,120,.6)'; ctx.lineWidth = 2;
      ctx.strokeRect(gx, gy, zeroW, gh);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 34px Georgia, serif';
      ctx.fillText('0', gx + zeroW / 2, gy + gh / 2);

      const ROWS = [
        [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
        [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
        [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
      ];
      ROWS.forEach((row, r) => {
        row.forEach((n, c) => {
          const x = gx + zeroW + c * cellW, y = gy + r * cellH;
          ctx.fillStyle = RED.has(n) ? '#a31621' : '#111';
          ctx.fillRect(x, y, cellW, cellH);
          ctx.strokeStyle = 'rgba(240,216,120,.4)'; ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, cellW, cellH);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 24px Georgia, serif';
          ctx.fillText(String(n), x + cellW / 2, y + cellH / 2);
        });
      });

      const oy = gy + gh + 24, oh = 56;
      const labels = ['1-18', 'EVEN', 'RED', 'BLACK', 'ODD', '19-36'];
      const ow = gw / labels.length;
      labels.forEach((label, i) => {
        const x = gx + i * ow;
        ctx.fillStyle = label === 'RED' ? '#a31621' : label === 'BLACK' ? '#111' : 'rgba(0,0,0,.28)';
        ctx.fillRect(x, oy, ow, oh);
        ctx.strokeStyle = 'rgba(240,216,120,.4)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(x, oy, ow, oh);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px Georgia, serif';
        ctx.fillText(label, x + ow / 2, oy + oh / 2);
      });
    });
  }

  // Wheel number ring — the canvas-arc angle convention lands at the same
  // group-local angle as the separators after RingGeometry UV + rotation.x=-π/2
  // (verified empirically in v1).
  function makeNumberRingTexture() {
    const W = 1024, cx = 512, cy = 512;
    return C.assets.canvasTexture(W, W, (ctx) => {
      ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, W);
      for (let i = 0; i < 37; i++) {
        const n = EU_WHEEL[i];
        const a0 = i * STEP - STEP / 2, a1 = i * STEP + STEP / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, 500, a0, a1);
        ctx.closePath();
        ctx.fillStyle = n === 0 ? '#0e6b45' : RED.has(n) ? '#a31621' : '#111';
        ctx.fill();
        ctx.strokeStyle = 'rgba(240,216,120,.5)'; ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(i * STEP);
        ctx.translate(410, 0);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 44px Georgia, serif';
        ctx.fillText(String(n), 0, 0);
        ctx.restore();
      }
    });
  }

  function buildWheel(mount) {
    const gold = C.assets.goldMaterial();
    const darkWood = new THREE.MeshStandardMaterial({ color: '#241408', roughness: 0.55, metalness: 0.1 });
    const group = new THREE.Group();

    const base = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.16, 64), darkWood);
    base.rotation.x = Math.PI;   // wide flat face up
    base.position.y = 0.08;
    base.castShadow = true; base.receiveShadow = true;
    group.add(base);

    const RING_Y = 0.161;
    const hubCone = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.10, 0.06, 24), gold);
    hubCone.position.y = RING_Y + 0.03;
    hubCone.castShadow = true;
    group.add(hubCone);
    const hubFinial = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), gold);
    hubFinial.position.y = RING_Y + 0.09;
    hubFinial.castShadow = true;
    group.add(hubFinial);

    const ringMat = new THREE.MeshStandardMaterial({ map: makeNumberRingTexture(), roughness: 0.4, metalness: 0.1 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.30, 0.52, 148), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = RING_Y;
    ring.receiveShadow = true;
    group.add(ring);

    const SEP_RADIUS = 0.44, SEP_H = 0.014;
    const sepGeo = new THREE.BoxGeometry(0.10, SEP_H, 0.008);
    for (let i = 0; i < 37; i++) {
      // pivot.rotation.y = -angle keeps position + radial orientation in sync
      const angle = (i + 0.5) * STEP;
      const pivot = new THREE.Group();
      pivot.rotation.y = -angle;
      const box = new THREE.Mesh(sepGeo, gold);
      box.position.set(SEP_RADIUS, RING_Y + SEP_H / 2, 0);
      box.castShadow = true;
      pivot.add(box);
      group.add(pivot);
    }

    // static ball parked in a pocket + fixed drop marker (no spins in the hub)
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 16, 12),
      new THREE.MeshStandardMaterial({ color: '#fdfdf5', roughness: 0.25, metalness: 0.05 }),
    );
    ball.castShadow = true;
    ball.position.set(0.36, 0.055, 0);
    group.add(ball);
    const marker = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 8), gold);
    marker.rotation.x = Math.PI;
    marker.position.set(0.50, 0.22, 0);
    mount.add(marker);

    mount.add(group);
  }

  // opts: { tierName, limitsText, minChipLabel, accent, withDealer }
  C.floor.tables.roulette = (opts = {}) => {
    const A = C.assets;
    const g = new THREE.Group();

    // rail + felt top (printed layout on the +Y face, material index 2)
    const rail = new THREE.Mesh(new THREE.BoxGeometry(3.4, RAIL_H, 1.6), A.woodMaterial('#3a2214'));
    rail.position.y = RAIL_H / 2;
    rail.castShadow = true; rail.receiveShadow = true;
    g.add(rail);

    const wood = A.woodMaterial('#3a2214');
    const feltMat = new THREE.MeshStandardMaterial({ map: makeFeltLayoutTexture(), roughness: 0.9, metalness: 0 });
    const feltTop = new THREE.Mesh(new THREE.BoxGeometry(3.28, 0.04, 1.48),
      [wood, wood, feltMat, wood, wood, wood]);
    feltTop.position.y = FELT_Y;
    feltTop.receiveShadow = true;
    g.add(feltTop);

    // wheel bowl on a pedestal at the west end of the table
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.34, 48),
      A.woodMaterial('#241408'));
    bowl.position.set(-2.35, 0.61, 0);
    bowl.castShadow = true; bowl.receiveShadow = true;
    g.add(bowl);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.46, 24),
      A.woodMaterial('#241408'));
    pedestal.position.set(-2.35, 0.22, 0);
    pedestal.castShadow = true; pedestal.receiveShadow = true;
    g.add(pedestal);
    const wheelMount = new THREE.Group();
    wheelMount.position.set(-2.35, 0.78, 0);
    buildWheel(wheelMount);
    g.add(wheelMount);

    // ghost chips so the table never looks abandoned
    const c1 = C.chips.makeChipStack(500, 6);
    c1.position.set(0.9, 0.86, 0.45);
    g.add(c1);
    const c2 = C.chips.makeChipStack(100, 4);
    c2.position.set(1.25, 0.86, 0.35);
    g.add(c2);

    // dealer-side chip bank: tray + four denomination stacks
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.24),
      new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.5, metalness: 0.3 }));
    rack.position.set(0.2, FELT_Y + 0.03, -0.56);
    g.add(rack);
    [100, 500, 1000, 5000].forEach((v, i) => {
      const stk = C.chips.makeChipStack(v, 8);
      stk.position.set(-0.04 + i * 0.16, FELT_Y + 0.055, -0.56);
      g.add(stk);
    });

    if (opts.withDealer) {
      const dealer = A.makeDealer();
      dealer.position.set(0.2, 0, -1.15);
      g.add(dealer);
      dealer.userData.idle(C.app);
    }

    // tier sign at the aisle-side corner (plaqueYaw lets a rotated table
    // keep its sign facing the aisle)
    if (opts.tierName) {
      const plaque = A.makePlaque([opts.tierName.toUpperCase(), opts.limitsText, 'MIN CHIP ' + opts.minChipLabel]);
      plaque.position.set(2.45, 0, 1.0);
      plaque.rotation.y = opts.plaqueYaw ?? 0.25;
      g.add(plaque);
    }

    // LED base glow — doubles as the proximity-highlight rig
    const pad = A.makeGlowPad(5.6, 3.0, opts.accent || '#ffb040');
    pad.position.x = -0.35;
    g.add(pad);
    g.userData.highlight = (on) => pad.userData.setBright(on);
    g.userData.radius = 2.5;

    return g;
  };
})();
