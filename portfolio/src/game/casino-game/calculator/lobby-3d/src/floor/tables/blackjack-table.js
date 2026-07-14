(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};
  C.floor.tables = C.floor.tables || {};

  // Blackjack arc table. v2 upgrade over the v1 room: the felt is a PRINTED
  // layout (arc lettering + insurance band + seat circles) instead of plain
  // green. Group origin = table center at floor level; +Z = player arc side.
  const TABLE_R = 1.6, RAIL_H = 0.8, FELT_Y = 0.83;
  const SEAT_COUNT = 6, SEAT_ANGLE_START = 160, SEAT_ANGLE_STEP = 28, SEAT_R = 1.95;
  const GHOST_SEATS = [1, 4], GHOST_R = 1.28;
  const seatAngle = (i) => ((SEAT_ANGLE_START - i * SEAT_ANGLE_STEP) * Math.PI) / 180;

  // Half-disc UV mapping (CircleGeometry): canvas px = (512 + cos(a)·R·320,
  // 512 + sin(a)·R·320) for a world point at polar (a, R) on the felt —
  // the playable half lives in the canvas' LOWER half.
  const PX = 320, CX = 512, CY = 512;

  function arcText(ctx, text, r, a0, a1, font, fill) {
    ctx.font = font;
    ctx.fillStyle = fill;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const chars = [...text];
    const total = a0 - a1; // sweep (a0 > a1, reading left→right through the bottom)
    chars.forEach((ch, i) => {
      const a = a0 - (total * (i + 0.5)) / chars.length;
      ctx.save();
      ctx.translate(CX + Math.cos(a) * r, CY + Math.sin(a) * r);
      ctx.rotate(a - Math.PI / 2);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
  }

  function makeBlackjackFeltTexture() {
    return C.assets.canvasTexture(1024, 1024, (ctx) => {
      ctx.fillStyle = '#0b5d3b';
      ctx.fillRect(0, 0, 1024, 1024);
      for (let i = 0; i < 3000; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`;
        ctx.fillRect(Math.random() * 1024, 512 + Math.random() * 512, 1, 1);
      }

      // insurance band (closest to the dealer)
      ctx.strokeStyle = 'rgba(240,216,120,0.55)';
      ctx.lineWidth = 3;
      for (const r of [195, 245]) {
        ctx.beginPath();
        ctx.arc(CX, CY, r, (22 * Math.PI) / 180, (158 * Math.PI) / 180);
        ctx.stroke();
      }
      arcText(ctx, 'INSURANCE PAYS 2 TO 1', 220,
        (148 * Math.PI) / 180, (32 * Math.PI) / 180,
        'bold 26px Georgia, serif', 'rgba(240,216,120,0.7)');

      // main arc lettering between the band and the seat circles
      arcText(ctx, 'BLACKJACK PAYS 3 TO 2', 305,
        (150 * Math.PI) / 180, (30 * Math.PI) / 180,
        'bold 40px Georgia, serif', 'rgba(240,216,120,0.85)');

      // seat bet circles out by the player arc, matching the stools
      for (let i = 0; i < SEAT_COUNT; i++) {
        const a = seatAngle(i);
        const px = CX + Math.cos(a) * 1.28 * PX;
        const py = CY + Math.sin(a) * 1.28 * PX;
        ctx.strokeStyle = 'rgba(240,216,120,0.65)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(px, py, 0.1 * PX, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }

  // opts: { tierName, limitsText, minChipLabel, accent, withDealer }
  C.floor.tables.blackjack = (opts = {}) => {
    const A = C.assets;
    const L = C.layouts.blackjack;
    const g = new THREE.Group();

    // half-cylinder skirt (bulges +Z for thetaStart=0 — v1 verified)
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(TABLE_R, TABLE_R, RAIL_H, 32, 1, false, 0, Math.PI),
      A.woodMaterial('#241408'),
    );
    skirt.position.y = RAIL_H / 2;
    skirt.castShadow = true; skirt.receiveShadow = true;
    g.add(skirt);
    // flat back panel closing the half cylinder
    const back = new THREE.Mesh(new THREE.BoxGeometry(TABLE_R * 2, RAIL_H, 0.06),
      A.woodMaterial('#241408'));
    back.position.set(0, RAIL_H / 2, -0.03);
    back.castShadow = true; back.receiveShadow = true;
    g.add(back);

    // felt half-disc with the printed layout (thetaStart=π + rot.x=-π/2
    // lands the arc on +Z face-up — v1 verified)
    const felt = new THREE.Mesh(
      new THREE.CircleGeometry(TABLE_R, 48, Math.PI, Math.PI),
      new THREE.MeshStandardMaterial({ map: makeBlackjackFeltTexture(), roughness: 0.92 }),
    );
    felt.rotation.x = -Math.PI / 2;
    felt.position.y = FELT_Y;
    felt.receiveShadow = true;
    g.add(felt);

    // wood rim: half-torus traces the same arc (rot.x=+π/2 — v1 verified)
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(TABLE_R, 0.05, 10, 48, Math.PI),
      A.woodMaterial('#3a2214'),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = FELT_Y;
    rim.castShadow = true; rim.receiveShadow = true;
    g.add(rim);
    const rimBack = new THREE.Mesh(new THREE.BoxGeometry(TABLE_R * 2 + 0.1, 0.05, 0.08),
      A.woodMaterial('#3a2214'));
    rimBack.position.set(0, FELT_Y, -0.02);
    g.add(rimBack);

    // ghost hand: card boxes + bet spot decals at the hero seat
    [...L.playerSlots, ...L.dealerSlots].forEach((slot) => {
      const box = C.cards.makeCardBoxDecal();
      box.position.set(slot[0], FELT_Y + 0.004, slot[2]);
      g.add(box);
    });
    Object.values(L.spots).forEach(({ pos, r, label }) => {
      const decal = C.chips.makeSpotDecal({ label, r });
      decal.position.set(pos[0], FELT_Y + 0.004, pos[2]);
      g.add(decal);
    });

    // card shoe
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

    // dealer chip tray on the flat edge
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 0.2),
      new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.5, metalness: 0.3 }));
    tray.position.set(-0.55, FELT_Y + 0.025, 0.12);
    g.add(tray);
    [500, 1000, 5000].forEach((v, i) => {
      const stk = C.chips.makeChipStack(v, 7);
      stk.position.set(-0.7 + i * 0.16, FELT_Y + 0.05, 0.12);
      g.add(stk);
    });

    // stools + ghost occupants
    for (let i = 0; i < SEAT_COUNT; i++) {
      const stool = A.makeStool();
      const a = seatAngle(i);
      stool.position.set(Math.cos(a) * SEAT_R, 0, Math.sin(a) * SEAT_R);
      g.add(stool);
    }
    GHOST_SEATS.forEach((i) => {
      const a = seatAngle(i);
      const chips = C.chips.makeChipStack(500, 4);
      chips.position.set(Math.cos(a) * GHOST_R, FELT_Y + 0.02, Math.sin(a) * GHOST_R);
      g.add(chips);
      const card = C.cards.makeCard(null);
      card.rotation.x = -Math.PI / 2;
      const cardR = GHOST_R - 0.2;
      card.position.set(Math.cos(a) * cardR, FELT_Y + 0.015, Math.sin(a) * cardR);
      g.add(card);
    });

    if (opts.withDealer) {
      const dealer = A.makeDealer();
      dealer.position.set(0, 0, -0.55);
      g.add(dealer);
      dealer.userData.idle(C.app);
    }

    if (opts.tierName) {
      const plaque = A.makePlaque([opts.tierName.toUpperCase(), opts.limitsText, 'MIN CHIP ' + opts.minChipLabel]);
      plaque.position.set(1.6, 0, 1.55);
      plaque.rotation.y = -0.3;
      g.add(plaque);
    }

    const pad = A.makeGlowPad(4.6, 4.2, opts.accent || '#ffb040');
    pad.position.z = 0.4;
    g.add(pad);
    g.userData.highlight = (on) => pad.userData.setBright(on);
    g.userData.radius = 2.2;

    return g;
  };
})();
