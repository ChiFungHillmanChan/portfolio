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
  const SIGN_X = { roulette: -6.8, blackjack: 10.0, baccarat: -6.8, uth: 8.4 };

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
        const accent = table.key ? TIER_TINTS[table.key] : TINTS.uth;
        const rotated = !!row.yaw;
        const group = C.floor.tables[section.id]({
          tierName: table.tierName,
          limitsText: table.limitsText,
          minChipLabel: table.minBet.toLocaleString('en-US'),
          accent,
          withDealer: table.key === 'std' || section.id === 'uth',
          // rotated roulette: counter-rotate the plaque so it faces the aisle
          plaqueYaw: rotated ? Math.PI / 2 + 0.15 : undefined,
        });
        group.position.set(x, 0, row.z);
        group.rotation.y = row.yaw ?? (row.dir === -1 ? Math.PI : 0);
        s.add(group);
        highlights.set(table.id, group.userData.highlight);

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

        // obstacle center follows the footprint: rotated roulette extends its
        // wheel toward the wall (world -z); aisle-facing roulette would shift x.
        const ox = rotated ? x : (section.id === 'roulette' ? x - 0.4 * row.dir : x);
        const oz = rotated ? row.z - 0.45 : row.z;
        C.world.addObstacle({ x: ox, z: oz, r: group.userData.radius });

        // anchor on the aisle side of the table
        const az = row.z + row.dir * (rotated ? 2.6 : 2.35);
        C.world.addAnchor({
          id: table.id, kind: 'table', table,
          pos: [x, az], radius: 2.0,
          approach: {
            pos: [x, 1.6, row.z + row.dir * (rotated ? 3.0 : 2.7)],
            look: [x, 0.95, row.z],
          },
        });
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
