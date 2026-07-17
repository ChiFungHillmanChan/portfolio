(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};
  C.floor.tables = C.floor.tables || {};

  // Blackjack arc table. v2 upgrade over the v1 room: the felt is a PRINTED
  // layout (arc lettering + insurance band + seat circles) instead of plain
  // green. Group origin = table center at floor level; +Z = player arc side.
  const TABLE_R = 1.6, RAIL_H = 0.8, FELT_Y = 0.83;
  // Geometry lives in C.layouts.blackjack.seat — but layouts.js loads first
  // in SRC_ORDER, so read it lazily inside the builder, not at module scope.
  const seatSpin = (a) => Math.PI / 2 - a;

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

      // main arc lettering between the band and the seat circles. Bet circles
      // are NOT painted here — they are decals placed by the table code with
      // the same polar math as the chips, so chips always land dead-center.
      arcText(ctx, 'BLACKJACK PAYS 3 TO 2', 275,
        (155 * Math.PI) / 180, (25 * Math.PI) / 180,
        'bold 38px Georgia, serif', 'rgba(240,216,120,0.85)');
    });
  }

  // opts: { tierName, limitsText, minChipLabel, accent, withDealer }
  C.floor.tables.blackjack = (opts = {}) => {
    const A = C.assets;
    const L = C.layouts.blackjack;
    const S = L.seat;
    const seatPoint = L.seatPoint;
    const seatAngle = (i) => ((S.angleStart - i * S.angleStep) * Math.PI) / 180;
    const SEAT_COUNT = S.count, SEAT_R = S.stoolR;
    const MAIN_R = S.mainR, SIDE_R = S.sideR, SIDE_DX = S.sideDx, CARDS_R = S.cardsR;
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

    // dealer card boxes on the flat-edge side of the insurance band
    L.dealerSlots.forEach((slot) => {
      const box = C.cards.makeCardBoxDecal();
      box.position.set(slot[0], FELT_Y + 0.004, slot[2]);
      g.add(box);
    });

    // per-seat bet spots: main circle nearest the player, PP + 21+3 side bets
    // in a row directly above it, everything oriented toward that seat
    for (let i = 0; i < SEAT_COUNT; i++) {
      const a = seatAngle(i);
      const spin = seatSpin(a);
      [
        { radius: MAIN_R, tangent: 0,        r: 0.095, label: 'MAIN' },
        { radius: SIDE_R, tangent: -SIDE_DX, r: 0.055, label: 'PP' },
        { radius: SIDE_R, tangent: SIDE_DX,  r: 0.055, label: '21+3' },
      ].forEach(({ radius, tangent, r, label }) => {
        const [x, z] = seatPoint(a, radius, tangent);
        const decal = C.chips.makeSpotDecal({ label, r });
        decal.rotation.set(-Math.PI / 2, 0, spin);
        decal.position.set(x, FELT_Y + 0.004, z);
        g.add(decal);
      });
    }

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
    // flush against the tilted body's top face (0.08 up along the tilted normal)
    shoeTrim.position.set(0, 0.08 * Math.cos(0.35), -0.08 * Math.sin(0.35));
    shoeGroup.add(shoeTrim);
    shoeGroup.position.set(...L.shoePos);
    // face the shoe LEFT (toward the dealer's dealing hand at table center,
    // slightly angled to the arc) so both dealer and players see its mouth
    shoeGroup.rotation.y = -Math.PI / 2 + 0.32;
    g.add(shoeGroup);

    // dealer chip station: a rimmed rack on its own console shelf BETWEEN the
    // dealer and the table's flat edge — chips never sit on the playing felt
    const station = new THREE.Group();
    const PED_TOP = FELT_Y + 0.03;   // rack surface clears the table's back rim
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.8, PED_TOP, 0.26),
      A.woodMaterial('#241408'));
    pedestal.position.y = PED_TOP / 2;
    pedestal.castShadow = true; pedestal.receiveShadow = true;
    station.add(pedestal);
    const trayMat = new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.5, metalness: 0.3 });
    const trayBase = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.02, 0.24), trayMat);
    trayBase.position.y = PED_TOP + 0.01;
    station.add(trayBase);
    [-1, 1].forEach((s) => {
      const lip = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.035, 0.02), trayMat);
      lip.position.set(0, PED_TOP + 0.028, s * 0.11);
      station.add(lip);
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.035, 0.24), trayMat);
      side.position.set(s * 0.37, PED_TOP + 0.028, 0);
      station.add(side);
    });
    [100, 500, 1000, 5000].forEach((v, i) => {
      const stk = C.chips.makeChipStack(v, 8);
      stk.position.set(-0.27 + i * 0.18, PED_TOP + 0.024, 0);
      station.add(stk);
    });
    station.position.set(0, 0, -0.19);
    g.add(station);

    // stools — every seat is open for a real player; no demo props on the
    // felt (cards/chips only appear from actual live play)
    for (let i = 0; i < SEAT_COUNT; i++) {
      const stool = A.makeStool();
      const a = seatAngle(i);
      stool.position.set(Math.cos(a) * SEAT_R, 0, Math.sin(a) * SEAT_R);
      g.add(stool);
    }

    let dealerRig = null;
    if (opts.withDealer) {
      const dealer = A.makeDealer({ seed: opts.dealerSeed, walkIn: true });
      dealer.position.set(0, 0, -0.55);
      g.add(dealer);
      dealer.userData.idle(C.app);
      dealerRig = dealer.userData.rig;
    }
    g.userData.dealerRig = dealerRig;

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

    // live-play rig: everything blackjack-live.js needs, in TABLE-LOCAL coords
    // (convert with group.localToWorld). main2 = the split hand's bet stack.
    g.userData.bj = {
      seat: S, feltY: FELT_Y, seatAngle, seatPoint,
      dealerSlots: L.dealerSlots, fanDx: L.fanDx, shoeLocal: L.shoePos,
      trayLocal: [0, FELT_Y + 0.054, -0.19],
      freeSeats: [0, 1, 2, 3, 4, 5],
      get dealerRig() { return g.userData.dealerRig; },
      spotLocal(i, id) {
        const a = seatAngle(i);
        const at = (radius, tangent) => {
          const [x, z] = seatPoint(a, radius, tangent);
          return [x, FELT_Y + 0.004, z];
        };
        if (id === 'main') return at(MAIN_R, 0);
        if (id === 'main2') return at(MAIN_R, -S.splitDx);
        if (id === 'perfectPair') return at(SIDE_R, -SIDE_DX);
        return at(SIDE_R, SIDE_DX);            // twentyOnePlus3
      },
    };

    return g;
  };
})();
