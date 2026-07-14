(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};
  C.floor.tables = C.floor.tables || {};

  // Ultimate Texas Hold'em ellipse table. v2 upgrade: the ANTE / BLIND /
  // TRIPS / JACKPOT circles are PRINTED into the felt (v1 used loose decals).
  // Group origin = table center at floor level; +Z = seats/aisle side.
  const RAIL_H = 0.8, FELT_Y = 0.82;
  const RAIL_RX = 1.6, RAIL_RZ = 0.9, FELT_FRAC = 0.94;
  const FELT_RX = RAIL_RX * FELT_FRAC, FELT_RZ = RAIL_RZ * FELT_FRAC;
  const SEAT_ANGLES_DEG = [160, 132, 104, 76, 48, 20];
  const SEAT_RX = 1.85, SEAT_RZ = 1.1;
  const GHOST_SEATS = [1, 4], CHIP_RX = 1.25, CHIP_RZ = 0.68;

  // world → canvas: px = 512 + x·340.4 · py = 288 + z·340.4 (1024×576 canvas
  // on a unit circle scaled to 1.504×0.846 — the x/z scales cancel equally).
  const PXW = 340.4;

  function makeFeltTexture() {
    const W = 1024, H = 576, cx = W / 2, cy = H / 2;
    const spots = C.layouts.uth.spots;
    return C.assets.canvasTexture(W, H, (ctx) => {
      ctx.fillStyle = '#0b5d3b';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(240,216,120,.6)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(cx, cy, W / 2 - 14, H / 2 - 14, 0, 0, Math.PI * 2); ctx.stroke();

      // community strip
      ctx.fillStyle = 'rgba(14,107,69,.55)';
      ctx.fillRect(W * 0.22, cy - 60, W * 0.56, 120);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '22px Georgia, serif';
      ctx.fillText('COMMUNITY CARDS', cx, cy - 90);

      // printed betting circles (world → canvas via PXW)
      const CIRCLES = [
        { key: 'ante', label: 'ANTE' },
        { key: 'blind', label: 'BLIND' },
        { key: 'trips', label: 'TRIPS' },
        { key: 'jackpot', label: 'JACKPOT', red: true },
      ];
      for (const { key, label, red } of CIRCLES) {
        const spot = spots[key];
        if (!spot) continue;
        const px = cx + spot.pos[0] * PXW;
        const py = cy + spot.pos[2] * PXW;
        const pr = spot.r * PXW;
        ctx.strokeStyle = red ? 'rgba(214,69,80,0.85)' : 'rgba(240,216,120,0.8)';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = red ? 'rgba(214,69,80,0.9)' : 'rgba(240,216,120,0.85)';
        ctx.font = `bold ${Math.max(15, Math.round(pr * 0.55))}px Georgia, serif`;
        ctx.fillText(label, px, py);
      }
    });
  }

  // opts: { tierName, limitsText, minChipLabel, accent, withDealer }
  C.floor.tables.uth = (opts = {}) => {
    const A = C.assets;
    const L = C.layouts.uth;
    const g = new THREE.Group();

    const rail = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, RAIL_H, 56), A.woodMaterial('#3a2214'));
    rail.scale.set(RAIL_RX, 1, RAIL_RZ);
    rail.position.y = RAIL_H / 2;
    rail.castShadow = true; rail.receiveShadow = true;
    g.add(rail);

    const felt = new THREE.Mesh(
      new THREE.CircleGeometry(1, 64),
      new THREE.MeshStandardMaterial({ map: makeFeltTexture(), roughness: 0.9 }),
    );
    felt.rotation.x = -Math.PI / 2;
    felt.scale.set(FELT_RX, FELT_RZ, 1);
    felt.position.y = FELT_Y;
    felt.receiveShadow = true;
    g.add(felt);

    // ghost card boxes: player, dealer, board
    [...L.playerSlots, ...L.dealerSlots, ...L.boardSlots].forEach((slot) => {
      const box = C.cards.makeCardBoxDecal();
      box.position.set(slot[0], FELT_Y + 0.004, slot[2]);
      g.add(box);
    });

    // deck stub (single deck, not a shoe)
    const deckBody = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.19),
      new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4, metalness: 0.2 }));
    deckBody.position.set(L.deckPos[0], L.deckPos[1] + 0.031, L.deckPos[2]);
    deckBody.castShadow = true;
    g.add(deckBody);
    const deckTrim = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.21), A.goldMaterial());
    deckTrim.position.set(L.deckPos[0], L.deckPos[1] + 0.006, L.deckPos[2]);
    g.add(deckTrim);

    // stools + ghost chips
    SEAT_ANGLES_DEG.forEach((deg, i) => {
      const a = (deg * Math.PI) / 180;
      const stool = A.makeStool();
      stool.position.set(Math.cos(a) * SEAT_RX, 0, Math.sin(a) * SEAT_RZ);
      g.add(stool);
      if (GHOST_SEATS.includes(i)) {
        const chips = C.chips.makeChipStack(500, 4);
        chips.position.set(Math.cos(a) * CHIP_RX, FELT_Y + 0.02, Math.sin(a) * CHIP_RZ);
        g.add(chips);
      }
    });

    let dealerRig = null;
    if (opts.withDealer) {
      const dealer = A.makeDealer({ seed: opts.dealerSeed });
      dealer.position.set(0, 0, -1.25);
      g.add(dealer);
      dealer.userData.idle(C.app);
      dealerRig = dealer.userData.rig;
    }
    g.userData.dealerRig = dealerRig;

    if (opts.tierName) {
      const plaque = A.makePlaque([opts.tierName.toUpperCase(), opts.limitsText, 'MIN CHIP ' + opts.minChipLabel]);
      plaque.position.set(2.05, 0, 0.7);
      plaque.rotation.y = -0.25;
      g.add(plaque);
    }

    const pad = A.makeGlowPad(4.4, 3.2, opts.accent || '#c479ff');
    g.add(pad);
    g.userData.highlight = (on) => pad.userData.setBright(on);
    g.userData.radius = 2.2;

    return g;
  };
})();
