(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};
  C.floor.tables = C.floor.tables || {};

  // Baccarat ellipse table (ported from the v1 room, demo round stripped).
  // Group origin = table center at floor level; +Z = seats/aisle side.
  const RAIL_H = 0.8, FELT_Y = 0.82;
  const RAIL_RX = 1.8, RAIL_RZ = 0.85, FELT_FRAC = 0.94;
  const FELT_RX = RAIL_RX * FELT_FRAC, FELT_RZ = RAIL_RZ * FELT_FRAC;
  const GHOST_ANGLES_DEG = [40, 75, 105, 140];
  const SEAT_RX = 2.15, SEAT_RZ = 1.3, CHIP_RX = 1.35, CHIP_RZ = 0.62;

  function makeFeltTexture() {
    const W = 1024, H = 512, cx = W / 2, cy = H / 2;
    return C.assets.canvasTexture(W, H, (ctx) => {
      ctx.fillStyle = '#0b5d3b';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = 'rgba(46,109,180,.38)';   // PLAYER tint (left)
      ctx.fillRect(0, 0, W * 0.37, H);
      ctx.fillStyle = 'rgba(163,22,33,.38)';    // BANKER tint (right)
      ctx.fillRect(W * 0.63, 0, W * 0.37, H);
      ctx.fillStyle = 'rgba(14,107,69,.5)';     // TIE tint (center)
      ctx.fillRect(W * 0.37, 0, W * 0.26, H);

      ctx.strokeStyle = 'rgba(240,216,120,.7)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(cx, cy, W / 2 - 14, H / 2 - 14, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(240,216,120,.5)'; ctx.lineWidth = 3;
      [0.37, 0.63].forEach((f) => {
        ctx.beginPath(); ctx.moveTo(W * f, 40); ctx.lineTo(W * f, H - 40); ctx.stroke();
      });

      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 58px Georgia, serif';
      ctx.fillText('PLAYER', W * 0.185, cy - 20);
      ctx.fillText('BANKER', W * 0.815, cy - 20);
      ctx.font = 'bold 42px Georgia, serif';
      ctx.fillText('TIE', cx, cy - 14);
      ctx.font = '22px Georgia, serif';
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillText('PAYS 1 TO 1', W * 0.185, cy + 34);
      ctx.fillText('PAYS 0.95 TO 1', W * 0.815, cy + 34);
      ctx.fillText('PAYS 8 TO 1', cx, cy + 30);
    });
  }

  // opts: { tierName, limitsText, minChipLabel, accent, withDealer }
  C.floor.tables.baccarat = (opts = {}) => {
    const A = C.assets;
    const L = C.layouts.baccarat;
    const g = new THREE.Group();

    // elliptical rail: unit cylinder scaled (v1 technique)
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, RAIL_H, 56), A.woodMaterial('#3a2214'));
    rail.scale.set(RAIL_RX, 1, RAIL_RZ);
    rail.position.y = RAIL_H / 2;
    rail.castShadow = true; rail.receiveShadow = true;
    g.add(rail);

    // felt ellipse (unit circle scaled; UVs stay the unit-circle mapping)
    const felt = new THREE.Mesh(
      new THREE.CircleGeometry(1, 64),
      new THREE.MeshStandardMaterial({ map: makeFeltTexture(), roughness: 0.9 }),
    );
    felt.rotation.x = -Math.PI / 2;
    felt.scale.set(FELT_RX, FELT_RZ, 1);
    felt.position.y = FELT_Y;
    felt.receiveShadow = true;
    g.add(felt);

    // card boxes (index 2 = sideways third card) + bet spot decals
    [L.playerSlots, L.bankerSlots].forEach((slots) => {
      slots.forEach((slot, idx) => {
        const box = C.cards.makeCardBoxDecal({ sideways: idx === 2 });
        box.position.set(slot[0], FELT_Y + 0.004, slot[2]);
        g.add(box);
      });
    });
    Object.values(L.spots).forEach(({ pos, r, label }) => {
      const decal = C.chips.makeSpotDecal({ label, r });
      decal.position.set(pos[0], FELT_Y + 0.004, pos[2]);
      g.add(decal);
    });

    // shoe
    const shoeGroup = new THREE.Group();
    const shoeBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.16, 0.22),
      new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4, metalness: 0.3 }),
    );
    shoeBody.rotation.x = -0.35;
    shoeBody.castShadow = true;
    shoeGroup.add(shoeBody);
    const shoeTrim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.24), A.goldMaterial());
    shoeTrim.rotation.x = -0.35;
    shoeTrim.position.y = 0.09;
    shoeGroup.add(shoeTrim);
    shoeGroup.position.set(...L.shoePos);
    g.add(shoeGroup);

    // ghost seats: stools + chips + face-down card
    GHOST_ANGLES_DEG.forEach((deg) => {
      const a = (deg * Math.PI) / 180;
      const stool = A.makeStool();
      stool.position.set(Math.cos(a) * SEAT_RX, 0, Math.sin(a) * SEAT_RZ);
      g.add(stool);
      const chips = C.chips.makeChipStack(500, 4);
      chips.position.set(Math.cos(a) * CHIP_RX, FELT_Y + 0.02, Math.sin(a) * CHIP_RZ);
      g.add(chips);
      const card = C.cards.makeCard(null);
      card.rotation.x = -Math.PI / 2;
      card.position.set(Math.cos(a) * CHIP_RX * 0.7, FELT_Y + 0.015, Math.sin(a) * CHIP_RZ * 0.7);
      g.add(card);
    });

    if (opts.withDealer) {
      const dealer = A.makeDealer();
      dealer.position.set(0, 0, -1.25);
      g.add(dealer);
      dealer.userData.idle(C.app);
    }

    if (opts.tierName) {
      const plaque = A.makePlaque([opts.tierName.toUpperCase(), opts.limitsText, 'MIN CHIP ' + opts.minChipLabel]);
      plaque.position.set(2.25, 0, 0.6);
      plaque.rotation.y = -0.25;
      g.add(plaque);
    }

    const pad = A.makeGlowPad(4.8, 3.0, opts.accent || '#ffb040');
    g.add(pad);
    g.userData.highlight = (on) => pad.userData.setBright(on);
    g.userData.radius = 2.3;

    return g;
  };
})();
