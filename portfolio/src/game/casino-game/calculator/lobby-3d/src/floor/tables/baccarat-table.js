(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};
  C.floor.tables = C.floor.tables || {};

  // Baccarat ellipse table (ported from the v1 room, demo round stripped).
  // Group origin = table center at floor level; +Z = seats/aisle side.
  const RAIL_H = 0.8, FELT_Y = 0.82;
  const RAIL_RX = 1.8, RAIL_RZ = 0.85, FELT_FRAC = 0.94;
  const FELT_RX = RAIL_RX * FELT_FRAC, FELT_RZ = RAIL_RZ * FELT_FRAC;
  const SEAT_RX = 2.15, SEAT_RZ = 1.3;

  const CJK = "'PingFang TC','Microsoft JhengHei','Noto Sans TC',sans-serif";

  // Macau-style felt, module-cached — the four floor tables share one
  // 2048x1024 texture. Canvas top = dealer edge (-z); pt(f, deg) uses the
  // same parametrisation as layouts.baccarat.seatSpot (90° = player edge).
  let feltTexture = null;
  function makeFeltTexture() {
    if (feltTexture) return feltTexture;
    const L = C.layouts.baccarat;
    const W = 2048, H = 1024, cx = W / 2, cy = H / 2;
    const px = (x) => cx + (x / L.feltRx) * (W / 2);
    const py = (z) => cy + (z / L.feltRz) * (H / 2);
    const pt = (f, deg) => {
      const a = (deg * Math.PI) / 180;
      return [cx + Math.cos(a) * f * (W / 2), cy + Math.sin(a) * f * (H / 2)];
    };

    feltTexture = C.assets.canvasTexture(W, H, (ctx) => {
      const R = C.assets.roundRect;
      ctx.fillStyle = '#0b5d3b';
      ctx.fillRect(0, 0, W, H);

      // gold border ring
      ctx.strokeStyle = 'rgba(240,216,120,.7)'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.ellipse(cx, cy, W / 2 - 14, H / 2 - 14, 0, 0, Math.PI * 2); ctx.stroke();

      // dealer strip: outline where the physical chip rack sits
      ctx.strokeStyle = 'rgba(240,216,120,.5)'; ctx.lineWidth = 4;
      R(ctx, px(-0.42), py(-0.66), px(0.42) - px(-0.42), py(-0.38) - py(-0.66), 14); ctx.stroke();

      // card-dealing area: 閒 PLAYER (left, yellow) | 庄 BANKER (right, red)
      const cardBox = (x0, x1, color, label) => {
        ctx.strokeStyle = color; ctx.lineWidth = 5;
        R(ctx, px(x0), py(-0.30), px(x1) - px(x0), py(0.02) - py(-0.30), 16); ctx.stroke();
        ctx.fillStyle = color;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold 34px ${CJK}`;
        ctx.fillText(label, (px(x0) + px(x1)) / 2, py(-0.25));
      };
      cardBox(-0.78, -0.16, '#f0d878', '閒 PLAYER');
      cardBox(0.16, 0.78, '#e05555', '庄 BANKER');
      ctx.strokeStyle = 'rgba(240,216,120,.8)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx, py(-0.30)); ctx.lineTo(cx, py(0.02)); ctx.stroke();

      // rotated text helper: upright for a viewer at that seat
      const arcText = (text, f, deg, font, fill) => {
        const [x, y] = pt(f, deg);
        ctx.save(); ctx.translate(x, y); ctx.rotate(((deg - 90) * Math.PI) / 180);
        ctx.font = font; ctx.fillStyle = fill;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0);
        ctx.restore();
      };
      // closed band between fractions f0..f1, angles a0..a1
      const bandPath = (f0, f1, a0, a1) => {
        ctx.beginPath();
        for (let a = a0; a <= a1; a += 2) { const [x, y] = pt(f1, a); a === a0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        for (let a = a1; a >= a0; a -= 2) { const [x, y] = pt(f0, a); ctx.lineTo(x, y); }
        ctx.closePath();
      };

      // commission boxes 1..6 (dealer tracks 5% commission per seat)
      L.seatAngles.forEach((deg, i) => {
        const [bx, by] = pt(0.30, deg);
        ctx.save(); ctx.translate(bx, by); ctx.rotate(((deg - 90) * Math.PI) / 180);
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3;
        R(ctx, -30, -24, 60, 48, 8); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.font = 'bold 30px Georgia, serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), 0, 0);
        ctx.restore();
      });

      // radial sector dividers
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3;
      for (let i = 0; i <= 6; i++) {
        const deg = 15 + i * 25;
        const [x0, y0] = pt(0.40, deg), [x1, y1] = pt(0.90, deg);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }

      // per-seat betting arcs: TIE(+pairs) inner, BANKER middle, PLAYER outer
      L.seatAngles.forEach((deg, i) => {
        // TIE box
        ctx.strokeStyle = '#59d98e'; ctx.lineWidth = 4;
        bandPath(0.43, 0.56, deg - 6.5, deg + 6.5); ctx.stroke();
        arcText('和 TIE', 0.515, deg, `bold 26px ${CJK}`, '#59d98e');
        arcText('8:1', 0.455, deg, 'bold 20px Georgia, serif', 'rgba(89,217,142,.9)');
        // pair circles flanking the tie box
        [['庄對', '#e05555', -10.2], ['閒對', '#f0d878', 10.2]].forEach(([t, col, da]) => {
          const [ox, oy] = pt(0.50, deg + da);
          ctx.strokeStyle = col; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(ox, oy, 26, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = col;
          ctx.font = `bold 16px ${CJK}`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(t, ox, oy);
        });
        // BANKER arc
        ctx.strokeStyle = '#e05555'; ctx.lineWidth = 4;
        bandPath(0.60, 0.72, deg - 11, deg + 11); ctx.stroke();
        arcText('庄 BANKER', 0.66, deg, `bold 30px ${CJK}`, '#e05555');
        // PLAYER arc
        ctx.strokeStyle = '#f0d878'; ctx.lineWidth = 4;
        bandPath(0.75, 0.87, deg - 11, deg + 11); ctx.stroke();
        arcText('閒 PLAYER', 0.81, deg, `bold 30px ${CJK}`, '#f0d878');
        // seat number at the rim
        arcText(String(i + 1), 0.93, deg, 'bold 44px Georgia, serif', 'rgba(255,255,255,.9)');
      });
    });
    return feltTexture;
  }

  // dealer chip rack: dark tray, gold dividers, 8 chip stacks
  function makeChipRack() {
    const g = new THREE.Group();
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.045, 0.26),
      new THREE.MeshStandardMaterial({ color: '#1a120b', roughness: 0.45, metalness: 0.25 }),
    );
    tray.position.y = 0.0225;
    tray.castShadow = true; tray.receiveShadow = true;
    g.add(tray);
    for (let i = 0; i <= 8; i++) {
      const div = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.052, 0.26), C.assets.goldMaterial());
      div.position.set(-0.36 + i * 0.09, 0.028, 0);
      g.add(div);
    }
    [5000, 1000, 1000, 500, 500, 100, 100, 25].forEach((v, i) => {
      const stack = C.chips.makeChipStack(v, 5 + (i % 3));
      stack.position.set(-0.315 + i * 0.09, 0.048, 0);
      g.add(stack);
    });
    return g;
  }

  // discard holder: shallow tray with a few face-down cards
  function makeDiscardTray() {
    const g = new THREE.Group();
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.03, 0.3),
      new THREE.MeshStandardMaterial({ color: '#14100c', roughness: 0.5, metalness: 0.2 }),
    );
    tray.position.y = 0.015;
    tray.castShadow = true;
    g.add(tray);
    for (let i = 0; i < 3; i++) {
      const card = C.cards.makeCard(null);
      card.rotation.x = -Math.PI / 2;
      card.rotation.z = (Math.random() - 0.5) * 0.3;
      card.position.set(0, 0.033 + i * 0.002, 0);
      g.add(card);
    }
    return g;
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

    // one simulated shoe per table: the same history drives the felt cards
    // and the scoreboard, so everything on this table is self-consistent
    const rounds = C.baccaratRoads.simulateShoe();
    const lastRound = rounds[rounds.length - 1];

    // card-dealing area: printed boxes + the final round's actual cards
    [[L.playerSlots, lastRound.playerCards], [L.bankerSlots, lastRound.bankerCards]]
      .forEach(([slots, cards]) => {
        slots.forEach((slot, idx) => {
          const box = C.cards.makeCardBoxDecal({ sideways: idx === 2 });
          box.position.set(slot[0], FELT_Y + 0.004, slot[2]);
          g.add(box);
        });
        cards.forEach((cardDef, idx) => {
          const card = C.cards.makeCard(cardDef);
          card.rotation.x = -Math.PI / 2;
          if (idx === 2) card.rotation.z = Math.PI / 2;
          card.position.set(slots[idx][0], FELT_Y + 0.006 + idx * 0.0005, slots[idx][2]);
          g.add(card);
        });
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
    shoeGroup.position.set(L.shoePos[0], FELT_Y, L.shoePos[2]);
    g.add(shoeGroup);

    // dealer strip props
    const rack = makeChipRack();
    rack.position.set(L.rackPos[0], FELT_Y, L.rackPos[2]);
    g.add(rack);
    const discard = makeDiscardTray();
    discard.position.set(L.discardPos[0], FELT_Y, L.discardPos[2]);
    g.add(discard);

    // six seats matching the felt sectors; some "occupied" with ghost bets
    const kinds = ['player', 'banker', 'banker', 'player', 'tie'];
    const occupied = new Set();
    while (occupied.size < 3 + Math.floor(Math.random() * 2))
      occupied.add(Math.floor(Math.random() * 6));
    L.seatAngles.forEach((deg, i) => {
      const a = (deg * Math.PI) / 180;
      const stool = A.makeStool();
      stool.position.set(Math.cos(a) * SEAT_RX, 0, Math.sin(a) * SEAT_RZ);
      g.add(stool);
      if (!occupied.has(i)) return;
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const [bx, bz] = L.seatSpot(i, kind);
      const chips = C.chips.makeChipStack([100, 500, 1000][i % 3], 3 + (i % 4));
      chips.position.set(bx, FELT_Y + 0.005, bz);
      g.add(chips);
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
