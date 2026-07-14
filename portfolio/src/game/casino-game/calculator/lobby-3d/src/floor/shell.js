(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};

  // Shared section accent colors (coves, neon signage, tier LED tints reuse
  // these via C.floor.SECTION_TINTS).
  C.floor.SECTION_TINTS = {
    roulette: '#ff5d6c',
    blackjack: '#59d8ff',
    baccarat: '#ffd27f',
    uth: '#c479ff',
  };

  const H = 5.5; // ceiling height

  function buildShell() {
    const s = C.app.scene, A = C.assets;
    s.background = new THREE.Color(0x05060a);
    s.fog = new THREE.Fog(0x05060a, 26, 70);

    // ---- base light rig: dark ambient floor, warm pools come per-section ----
    s.add(new THREE.HemisphereLight(0x323a52, 0x101014, 0.85));
    s.add(new THREE.AmbientLight(0x222634, 0.5));

    // ---- floor slabs: carpet fields either side of a polished marble aisle ----
    const mkSlab = (w, d, x, z, mat) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0, z);
      m.receiveShadow = true;
      s.add(m);
    };
    const carpet = A.carpetModern();
    mkSlab(34.2, 7.3, 0.9, -6.85, carpet);              // north field (roulette/blackjack)
    mkSlab(34.2, 7.3, 0.9, 6.85, carpet);               // south field (baccarat/uth)
    const marble = A.marbleMaterial();
    mkSlab(34.2, 6.4, 0.9, 0, marble);                  // central aisle
    mkSlab(11.8, 12, -22.1, 0, A.marbleMaterial('#bfc3ca')); // vestibule

    // ---- walls: graphite, matte ----
    const wallMat = new THREE.MeshStandardMaterial({ color: '#111318', roughness: 0.92 });
    const mkWall = (w, x, z, ry) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, H), wallMat);
      m.position.set(x, H / 2, z);
      m.rotation.y = ry;
      m.receiveShadow = true;
      s.add(m);
    };
    mkWall(34.2, 0.9, -10.5, 0);              // hall north
    mkWall(34.2, 0.9, 10.5, Math.PI);         // hall south
    mkWall(21, 18, 0, -Math.PI / 2);          // hall east
    mkWall(4.5, -16.2, -8.25, Math.PI / 2);   // hall west, north of the vestibule opening
    mkWall(4.5, -16.2, 8.25, Math.PI / 2);    // hall west, south of the opening
    mkWall(12, -28, 0, Math.PI / 2);          // vestibule west
    mkWall(11.8, -22.1, -6, 0);               // vestibule north
    mkWall(11.8, -22.1, 6, Math.PI);          // vestibule south

    // Wall accent line: a dim warm LED reveal that defines the room bounds in
    // the dark (modern-casino wall feature). Inset 4 cm so it never z-fights.
    const accent = (w, x, z, ry) => {
      const m = A.ledStrip('#5c4b26', w, 0.05, 0.04);
      m.position.set(x, 3.35, z);
      m.rotation.y = ry;
      s.add(m);
    };
    accent(34.2, 0.9, -10.46, 0);
    accent(34.2, 0.9, 10.46, 0);
    accent(21, 17.96, 0, Math.PI / 2);
    accent(11.8, -22.1, -5.96, 0);
    accent(11.8, -22.1, 5.96, 0);

    // ---- ceiling ----
    const ceilMat = new THREE.MeshStandardMaterial({ color: '#0c0e14', roughness: 1 });
    const mkCeil = (w, d, x, z) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat);
      m.rotation.x = Math.PI / 2;
      m.position.set(x, H, z);
      s.add(m);
    };
    mkCeil(34.2, 21, 0.9, 0);
    mkCeil(11.8, 12, -22.1, 0);

    // ---- LED ceiling features: tinted cove frame per section + gold aisle spine ----
    // dim() works in DISPLAY space (plain 0-255 math). THREE.Color.multiplyScalar
    // would scale in linear space and the sRGB round-trip makes 0.045 render
    // like 25% brightness — panels stayed garish. Screen-space multiply is WYSIWYG.
    const dim = (hex, k) => {
      const n = parseInt(hex.slice(1), 16);
      const r = Math.round(((n >> 16) & 255) * k);
      const g = Math.round(((n >> 8) & 255) * k);
      const b = Math.round((n & 255) * k);
      return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    };
    const frame = (x0, x1, z0, z1, hex) => {
      const mat = new THREE.MeshBasicMaterial({ color: dim(hex, 0.42), fog: false });
      const t = 0.09, y = H - 0.18;
      const seg = (w, d, x, z) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), mat);
        m.position.set(x, y, z);
        s.add(m);
      };
      seg(x1 - x0, t, (x0 + x1) / 2, z0);
      seg(x1 - x0, t, (x0 + x1) / 2, z1);
      seg(t, z1 - z0, x0, (z0 + z1) / 2);
      seg(t, z1 - z0, x1, (z0 + z1) / 2);
    };
    // Backlit ceiling panel inside each cove frame — suggests an illuminated
    // feature so the frames don't float in blackness.
    const panel = (x0, x1, z0, z1, hex) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(x1 - x0 - 0.5, z1 - z0 - 0.5),
        new THREE.MeshBasicMaterial({ color: dim(hex, 0.10), fog: false }),
      );
      m.rotation.x = Math.PI / 2;
      m.position.set((x0 + x1) / 2, H - 0.05, (z0 + z1) / 2);
      s.add(m);
    };
    const T = C.floor.SECTION_TINTS;
    for (const [x0, x1, z0, z1, hex] of [
      [-14.4, 1.2, -10.0, -3.9, T.roulette],
      [2.4, 17.6, -10.0, -3.9, T.blackjack],
      [-14.4, 1.2, 3.9, 10.0, T.baccarat],
      [2.4, 17.6, 3.9, 10.0, T.uth],
    ]) {
      frame(x0, x1, z0, z1, hex);
      panel(x0, x1, z0, z1, hex);
    }
    // aisle spine: a run of repeating gold light bars (modern linear fixture)
    for (let x = -15; x <= 16.5; x += 3) {
      const bar = A.ledStrip('#d7b45c', 1.8, 0.04, 0.14);
      bar.position.set(x, H - 0.14, 0);
      s.add(bar);
      const housing = A.ledStrip(dim('#d7b45c', 0.25), 2.1, 0.07, 0.3);
      housing.position.set(x, H - 0.11, 0);
      s.add(housing);
    }

    // ---- warm light pools over each section's table row ----
    const pool = (x, z, shadow) => {
      const sp = new THREE.SpotLight(0xffdcaa, 1.7, 16, 0.72, 0.55, 1.1);
      sp.position.set(x, H - 0.3, z);
      sp.target.position.set(x, 0.8, z);
      sp.castShadow = shadow && !C.app.IS_MOBILE;
      if (sp.castShadow) sp.shadow.mapSize.set(1024, 1024);
      s.add(sp, sp.target);
    };
    // Mobile only: four wide section washes (desktop gets a dedicated pool
    // per table from sections.js instead — pooled light is the casino look).
    if (C.app.IS_MOBILE) {
      pool(-6.8, -6.3, false);
      pool(10, -6.5, false);
      pool(-6.8, 6.5, false);
      pool(7, 6.5, false);
    }

    // ---- soft aisle downlights so the marble walk reads ----
    if (!C.app.IS_MOBILE) {
      for (const x of [-10, 0, 10]) {
        const p = new THREE.PointLight(0xf2e6d0, 0.5, 13, 2);
        p.position.set(x, H - 1.2, 0);
        s.add(p);
      }
    }
  }

  C.floor.buildAll = (model) => {
    buildShell();
    C.floor.buildVestibule?.(model);
    C.floor.buildSections?.(model);
    C.floor.buildDecor?.(model);
  };
})();
