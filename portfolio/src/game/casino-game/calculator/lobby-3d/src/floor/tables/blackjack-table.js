(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};
  C.floor.tables = C.floor.tables || {};

  // Blackjack arc table. v2 upgrade over the v1 room: the felt is a PRINTED
  // layout (arc lettering + insurance band + seat circles) instead of plain
  // green. Group origin = table center at floor level; +Z = player arc side.
  const TABLE_R = 1.6, APRON_H = 0.18, FELT_Y = 0.83;
  // Geometry lives in C.layouts.blackjack.seat — but layouts.js loads first
  // in SRC_ORDER, so read it lazily inside the builder, not at module scope.
  const seatSpin = (a) => Math.PI / 2 - a;

  // Half-disc UV mapping (CircleGeometry): canvas px = (512 + cos(a)·R·320,
  // 512 + sin(a)·R·320) for a world point at polar (a, R) on the felt —
  // the playable half lives in the canvas' LOWER half.
  const CX = 512, CY = 512;

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

      // House procedure is European (no hole card), with S17 retained.
      ctx.fillStyle = 'rgba(240,216,120,0.6)';
      ctx.font = '18px Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText('DEALER STANDS ON ALL 17', CX, CY + 176);

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

    // CylinderGeometry starts on +Z and sweeps toward +X. Rotate its half
    // cylinder so the straight dealer edge and +Z felt semicircle coincide.
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(TABLE_R, TABLE_R, APRON_H, 32, 1, false, 0, Math.PI),
      A.woodMaterial('#241408'),
    );
    skirt.rotation.y = -Math.PI / 2;
    skirt.position.y = FELT_Y - APRON_H / 2;
    skirt.castShadow = true; skirt.receiveShadow = true;
    g.add(skirt);
    // flat back panel closing the half cylinder
    const back = new THREE.Mesh(new THREE.BoxGeometry(TABLE_R * 2, APRON_H, 0.06),
      A.woodMaterial('#241408'));
    back.position.set(0, FELT_Y - APRON_H / 2, -0.03);
    back.castShadow = true; back.receiveShadow = true;
    g.add(back);

    // A shallow apron over inset pedestals leaves the rail clear for knees
    // and feet, instead of filling the whole half-disc down to the floor.
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, FELT_Y - APRON_H, 20),
        A.woodMaterial('#241408'));
      post.name = 'blackjack-pedestal';
      post.position.set(side * 0.55, (FELT_Y - APRON_H) / 2, 0.59);
      post.castShadow = true; post.receiveShadow = true; g.add(post);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.31, 0.045, 20),
        A.woodMaterial('#241408'));
      foot.name = 'blackjack-pedestal-foot';
      foot.position.set(side * 0.55, 0.0225, 0.59);
      foot.castShadow = true; foot.receiveShadow = true; g.add(foot);
    }

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
      const [cardX, cardZ] = seatPoint(a, CARDS_R);
      const handZone = C.cards.makeCardBoxDecal();
      handZone.rotation.set(-Math.PI / 2, 0, spin);
      handZone.position.set(cardX, FELT_Y + 0.002, cardZ);
      g.add(handZone);
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

    const shoeGroup = C.cards.makeShoe();
    shoeGroup.position.set(...L.shoePos);
    shoeGroup.rotation.y = L.shoeYaw;
    g.add(shoeGroup);
    const discard = C.cards.makeDiscardTray();
    discard.position.set(...L.discardPos);
    g.add(discard);

    // Low chip rack inset at the dealer edge, leaving the card row clear.
    const station = new THREE.Group();
    const trayMat = new THREE.MeshStandardMaterial({ color: '#201a14', roughness: 0.5, metalness: 0.3 });
    const trayBase = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.018, 0.19), trayMat);
    trayBase.position.y = 0.009; trayBase.receiveShadow = true; station.add(trayBase);
    for (const side of [-1, 1]) {
      const lip = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.024, 0.008), trayMat);
      lip.position.set(0, 0.023, side * 0.095); station.add(lip);
    }
    [25, 100, 100, 500, 500, 1000, 1000, 5000].forEach((value, i) => {
      const stack = C.chips.makeChipStack(value, 8);
      stack.position.set(-0.315 + i * 0.09, 0.020, 0); station.add(stack);
      const divider = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.025, 0.19), trayMat);
      divider.position.set(-0.36 + i * 0.09, 0.026, 0); station.add(divider);
    });
    station.position.set(...L.rackPos); g.add(station);

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
      // west pit-lane entry, short enough to stay clear of the neighbouring
      // table's dealer (row spacing 3.9m — the old 3.2m walked through him)
      const dealer = A.makeDealer({ seed: opts.dealerSeed, walkIn: [-2.4, 0] });
      dealer.position.set(0, 0, -0.18);
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
      dealerSlots: L.dealerSlots, fanDx: L.fanDx, shoeLocal: L.shoeMouth, discardLocal: L.discardPos,
      trayLocal: [L.rackPos[0], FELT_Y + 0.020, L.rackPos[2]],
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
