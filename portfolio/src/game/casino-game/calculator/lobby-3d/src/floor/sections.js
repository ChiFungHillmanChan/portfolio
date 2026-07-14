(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};

  // Sections: one physical table per stake tier, driven ENTIRELY by the
  // floor model (which mirrors GAME_STAKES). North rows face the aisle at
  // rotation 0 (table-local +Z = aisle); south rows are rotated π.
  //
  // Layout: cheapest tier sits nearest the vestibule — you meet the micro
  // table first as you walk in, high limits live deeper in the room.
  // Roulette tables sit PERPENDICULAR to the aisle (wheel toward the wall,
  // betting layout toward the player) — that's how real floors rack them and
  // it's the only way four 4.7m-long tables fit the section. The other games
  // face the aisle directly.
  const ROWS = {
    roulette:  { z: -6.3, dir: 1,  xs: [-12.8, -8.8, -4.8, -0.8], yaw: -Math.PI / 2 },
    blackjack: { z: -6.5, dir: 1,  xs: [4.2, 8.1, 12.0, 15.9] },
    baccarat:  { z: 6.5,  dir: -1, xs: [-13.4, -9.0, -4.6, -0.2] },
    uth:       { z: 6.5,  dir: -1, xs: [5.2], reserved: [8.8, 11.4, 14.0, 16.6] },
  };
  // Maintenance enclosure for the closed UTH table — hugs the table footprint
  // (stools reach x 3.24–7.16, z 5.21; dealer at z 7.75) so the cage reads as
  // wrapping THE table, not fencing floor space near it. West rail (x0 3.45)
  // stays outside the cashier corridor (the table's own obstacle already
  // blocks x > 2.65 at z 6.5); east rail (x1 7.3) clears the OPENING-SOON
  // dais at 7.6.
  const CLOSED_ZONE = {
    rect: { x0: 3.45, x1: 7.3, z0: 4.95, z1: 8.35 },
    signDx: -1.35,
    signLines: [
      { text: 'DEALER TRAINING', size: 56, color: '#b3541e' },
      { text: '荷官培訓中', size: 60, color: '#b3541e' },
      { text: 'TABLE CLOSED', size: 50 },
      { text: '暫停開放', size: 54 },
      { text: 'Sorry for the inconvenience', size: 22, weight: 'normal' },
      { text: '不便之處，敬請原諒', size: 26, weight: 'normal' },
    ],
    trainer: { pos: [6.3, 7.6], lookAt: [5.2, 7.75] },
  };
  // uth neon hangs OVER the (closed) table itself — at 8.4 it hung over the
  // reserved pads, which read as "the UTH area is open floor, the cage is
  // something else off to the side".
  const SIGN_X = { roulette: -6.8, blackjack: 10.0, baccarat: -6.8, uth: 5.4 };

  const highlights = new Map();   // table.id → group.userData.highlight

  function buildReservedPad(s, A, x, z) {
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.2, 0.06, 32),
      new THREE.MeshStandardMaterial({ color: '#15171e', roughness: 0.85 }));
    dais.position.set(x, 0.03, z);
    dais.receiveShadow = true;
    s.add(dais);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.95, 10), A.goldMaterial());
      post.position.set(x + Math.cos(a) * 1.05, 0.475, z + Math.sin(a) * 1.05);
      post.castShadow = true;
      s.add(post);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), A.goldMaterial());
      knob.position.set(x + Math.cos(a) * 1.05, 0.98, z + Math.sin(a) * 1.05);
      s.add(knob);
    }
    const plaque = A.makePlaque(['OPENING SOON', 'NEW ANTE TIERS']);
    plaque.position.set(x, 0, z - 1.5);
    plaque.rotation.y = Math.PI;
    s.add(plaque);
    C.world.addObstacle({ x, z, r: 1.35 });
  }

  C.floor.buildSections = (model) => {
    const s = C.app.scene, A = C.assets;
    const TINTS = C.floor.SECTION_TINTS;
    const TIER_TINTS = { micro: '#3aa0ff', mini: '#2ecc71', std: '#ffb040', high: '#ff4060' };

    for (const section of model.sections) {
      const row = ROWS[section.id];
      if (!row) continue;

      // overhead neon section sign, hung from the ceiling over the row
      const sign = A.makeNeonSign(section.label, TINTS[section.id], { w: 4.2, h: 0.85 });
      sign.position.set(SIGN_X[section.id], 4.35, row.z);
      if (row.dir === -1) sign.rotation.y = Math.PI;
      s.add(sign);
      for (const dx of [-1.6, 1.6]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.75, 8), A.steelMaterial());
        rod.position.set(SIGN_X[section.id] + dx, 5.15, row.z);
        s.add(rod);
      }
      C.app.addPickable(sign, () => C.stage.goTo(section.id));

      section.tables.forEach((table, i) => {
        const x = row.xs[i];
        if (x === undefined) return;
        const accent = table.closed ? '#ffb040' : (table.key ? TIER_TINTS[table.key] : TINTS.uth);
        const rotated = !!row.yaw;
        const group = C.floor.tables[section.id]({
          tierName: table.tierName,
          limitsText: table.limitsText,
          minChipLabel: table.minBet.toLocaleString('en-US'),
          accent,
          withDealer: true,
          dealerSeed: table.id,
          // rotated roulette: counter-rotate the plaque so it faces the aisle
          plaqueYaw: rotated ? Math.PI / 2 + 0.15 : undefined,
        });
        group.position.set(x, 0, row.z);
        group.rotation.y = row.yaw ?? (row.dir === -1 ? Math.PI : 0);
        s.add(group);
        highlights.set(table.id, group.userData.highlight);
        // live-play rigs: roulette tables expose spinTo/pushResult/setBets
        // on their group userData for the in-place session (roulette-live.js)
        if (section.id === 'roulette') (C.floor.rouletteRigs ??= new Map()).set(table.id, group);
        if (section.id === 'blackjack') (C.floor.blackjackRigs ??= new Map()).set(table.id, group);
        if (section.id === 'baccarat') C.floor.attachBaccaratShow?.(group);

        // dedicated warm pool over every table (desktop; mobile uses the
        // shell's four wide washes instead — light count budget)
        if (!C.app.IS_MOBILE) {
          const tz = rotated ? row.z - 0.4 : row.z;
          const sp = new THREE.SpotLight(0xffdcaa, 1.5, 9, 0.6, 0.5, 1.1);
          sp.position.set(x, 4.6, tz);
          sp.target.position.set(x, 0.82, tz);
          sp.castShadow = false;
          s.add(sp, sp.target);
        }

        if (rotated) {
          // Rotated roulette: capsule of small circles down the table's long
          // axis (+ tote board + dealer) instead of one fat r-2.5 circle —
          // that circle kept players 1.7m off the rail, so nobody could
          // actually stand AT the table.
          C.world.addObstacle({ x, z: row.z - 2.35, r: 1.15 });           // wheel bowl
          C.world.addObstacle({ x, z: row.z - 0.7, r: 1.1 });             // rail west half
          C.world.addObstacle({ x, z: row.z + 0.95, r: 1.1 });            // rail east half
          C.world.addObstacle({ x: x + 1.25, z: row.z - 1.75, r: 0.55 }); // tote board
          if (table.key === 'std') C.world.addObstacle({ x: x + 1.15, z: row.z + 0.2, r: 0.45 }); // dealer
        } else {
          // obstacle center follows the footprint: aisle-facing roulette
          // would shift x toward its wheel end.
          const ox = section.id === 'roulette' ? x - 0.4 * row.dir : x;
          C.world.addObstacle({ x: ox, z: row.z, r: group.userData.radius });
        }

        // closed table: build the maintenance enclosure (rails + sign +
        // collision chain) — the anchor stays, but its approach pulls back
        // so the camera lands OUTSIDE the barrier looking through it.
        if (table.closed) C.floor.buildMaintenanceZone(CLOSED_ZONE);

        if (rotated) {
          // Approach = the players' long side, across the felt facing the
          // dealer (not parked at the aisle end). Clamped off the west wall
          // for the table nearest it. The anchor sits between the aisle and
          // that spot so the card triggers walking past AND at the rail.
          const floorRect = C.floorplan.WALK_RECTS.find((r) => r.id === 'floor');
          const standX = Math.max(x - 1.9, floorRect.x0 + 0.35);
          C.world.addAnchor({
            id: table.id, kind: 'table', table,
            pos: [x - 0.9, row.z + 1.6], radius: 2.2,
            approach: {
              pos: [standX, 1.6, row.z + 0.2],
              look: [x + 1.0, 1.1, row.z + 0.2],
            },
          });
        } else {
          // anchor on the aisle side of the table
          const az = row.z + row.dir * 2.35;
          C.world.addAnchor({
            id: table.id, kind: 'table', table,
            pos: [x, az], radius: 2.0,
            approach: {
              pos: [x, 1.6, row.z + row.dir * (table.closed ? 3.9 : 2.7)],
              look: [x, 0.95, row.z],
            },
          });
        }
        C.app.addPickable(group, () => {
          const a = C.world.anchorById(table.id);
          if (a) C.app.goToAnchor(a);
        });
      });

      (row.reserved || []).forEach((x) => buildReservedPad(s, A, x, row.z));
    }

    C.stage.setHighlight = (id) => {
      for (const [tid, fn] of highlights) fn(tid === id);
    };
  };
})();
