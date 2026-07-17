(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};

  // Maintenance enclosure around a closed table: steel stanchions joined by
  // yellow/black hazard rails, an A-frame "DEALER TRAINING" signboard with a
  // pulsing amber beacon, cones, and an optional supervisor figure. The rails
  // are REAL walls: a chain of collision obstacles (r 0.35 at ≤0.9 m spacing)
  // runs under every edge — with player radius 0.35, threading between two
  // obstacles needs ≥1.4 m centre spacing, so the perimeter cannot be crossed
  // by WASD, tap-to-move or glide.
  const POST_H = 0.95, POST_R = 0.03, BASE_R = 0.16;
  const RAIL_YS = [0.82, 0.45], RAIL_H = 0.1, RAIL_D = 0.028;
  const OBSTACLE_R = 0.35, OBSTACLE_STEP = 0.9, POST_STEP = 0.96;

  // Dense 45° stripes: 1024px wide so a rail stretched to ~4.5 m still reads
  // as ~28 cm barricade stripes, not four fat wedges.
  function hazardTexture(A) {
    return A.canvasTexture(1024, 64, (ctx) => {
      ctx.fillStyle = '#e8b820';
      ctx.fillRect(0, 0, 1024, 64);
      ctx.fillStyle = '#17181c';
      for (let x = -64; x < 1024 + 64; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 64); ctx.lineTo(x + 32, 64);
        ctx.lineTo(x + 96, 0); ctx.lineTo(x + 64, 0);
        ctx.closePath(); ctx.fill();
      }
      // grime so the boards don't read as flat vector art
      for (let i = 0; i < 800; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
        ctx.fillRect(Math.random() * 1024, Math.random() * 64, 2, 1);
      }
    });
  }

  function signTexture(A, lines) {
    return A.canvasTexture(512, 640, (ctx) => {
      ctx.fillStyle = '#f5f2ea';
      ctx.fillRect(0, 0, 512, 640);
      // hazard header band
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, 512, 84); ctx.clip();
      ctx.fillStyle = '#e8b820'; ctx.fillRect(0, 0, 512, 84);
      ctx.fillStyle = '#17181c';
      for (let x = -84; x < 512 + 84; x += 84) {
        ctx.beginPath();
        ctx.moveTo(x, 84); ctx.lineTo(x + 42, 84);
        ctx.lineTo(x + 126, 0); ctx.lineTo(x + 84, 0);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = '#17181c'; ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 630);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      // lines: [{ text, size, color?, weight? }]
      let y = 84;
      for (const line of lines) {
        y += line.size * 0.98;
        ctx.font = `${line.weight || 'bold'} ${line.size}px 'Segoe UI', system-ui, sans-serif`;
        ctx.fillStyle = line.color || '#17181c';
        ctx.fillText(line.text, 256, y);
        y += line.size * 0.42;
      }
    });
  }

  // Evenly spaced points from a to b (inclusive) at ≤ step apart.
  function chain(a, b, step) {
    const n = Math.max(1, Math.ceil(Math.abs(b - a) / step));
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push(a + ((b - a) * i) / n);
    return pts;
  }

  // ---- ambient training show ----
  // The cage says DEALER TRAINING — so train. When the player is near, the
  // closed table's dealer (the trainee) runs randomized dealing drills —
  // card wash, riffle, pitching real cards to the slots, rack taps — while
  // the supervisor watches, nods or shakes their head, and coaches through
  // speech bubbles. Same proximity-gated loop idiom as baccarat-show.js;
  // every rig call carries its own roomGen guard so a room rebuild mid-
  // drill just falls through.
  const TRAIN_NEAR = 9, TRAIN_CHECK = 0.8;
  const TRAINER_OPEN = {
    wash: '洗牌 Wash — big circles',
    riffle: 'Riffle — even halves',
    pitch: 'Pitch drill — keep it low',
    rack: 'Rack drill — count them out',
  };
  const TRAINER_PRAISE = ['Good rhythm — keep it', '幾好 Nice hands', 'Clean — again', '好 Smooth'];
  const TRAINER_FIX = ['再嚟一次 Again', 'Keep the deck low', '大圈啲 Bigger circles', 'Slow down — accuracy first'];
  const TRAINEE_REPLY = ['明白 Got it', '收到 Yes', 'Ready — again'];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function startTrainingShow(opts, trainerRoot) {
    const app = C.app;
    const tableGroup = opts.tableGroup;
    const trainee = tableGroup?.userData.dealerRig;
    const trainerRig = trainerRoot.userData.rig;
    if (!trainee || !trainerRig || app.REDUCED) return;
    const gen = app.roomGen;
    const alive = () => app.roomGen === gen;
    const L = C.layouts.uth;
    tableGroup.updateMatrixWorld(true);
    const toW = (p) => tableGroup.localToWorld(new THREE.Vector3(p[0], p[1], p[2])).toArray();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    const trainerHead = [opts.trainer.pos[0], 1.55, opts.trainer.pos[1]];
    const traineeHead = toW([0, 1.55, -1.05]);
    const feltTarget = toW([0, L.feltY, -0.30]);
    const deckRef = toW(L.deckPos);
    const rackRef = toW(L.dealerChipPos);

    // four reusable face-down practice cards — never disposed, just
    // parked back at the deck between pitch drills (dealCardTo re-adds
    // them to the scene each flight)
    let cards = null;
    const practiceCards = () => (cards ??= [0, 1, 2, 3].map(() => {
      const m = C.cards.makeCard(null);
      m.rotation.set(-Math.PI / 2, 0, 0);
      m.rotateY(Math.PI);
      return m;
    }));
    const collectCards = async () => {
      if (!cards) return;
      await Promise.all(cards.filter((m) => m.parent).map((m) => new Promise((res) =>
        C.tween.to(m.position, { x: deckRef[0], y: deckRef[1] + 0.05, z: deckRef[2] }, 300, 'inOutCubic', res))));
      cards.forEach((m) => m.parent && m.parent.remove(m));
    };

    const drills = {
      wash: async () => {
        for (let i = 0; i < 2 && alive(); i++) {
          // eslint-disable-next-line no-await-in-loop
          await trainee.play(app, 'washCards', { refs: { target: feltTarget } });
        }
        await trainee.play(app, 'armsRest');
      },
      riffle: async () => {
        for (let i = 0; i < 2 && alive(); i++) {
          // eslint-disable-next-line no-await-in-loop
          await trainee.play(app, 'shuffleRiffle', { refs: { target: feltTarget } });
        }
        await trainee.play(app, 'armsRest');
      },
      pitch: async () => {
        const slots = [L.playerSlots[0], L.playerSlots[1], L.dealerSlots[0], L.dealerSlots[1]];
        const meshes = practiceCards();
        for (let i = 0; i < slots.length && alive(); i++) {
          const slot = toW(slots[i]);
          trainee.play(app, 'dealCard', { refs: { shoe: deckRef, target: slot } });
          // eslint-disable-next-line no-await-in-loop
          await C.cards.dealCardTo(app, meshes[i], deckRef, [slot[0], slot[1] + 0.004, slot[2]], { ms: 430 });
          // eslint-disable-next-line no-await-in-loop
          await wait(150);
        }
        await wait(900);
        await trainee.play(app, 'armsRest');
        await collectCards();
      },
      rack: async () => {
        await trainee.play(app, 'tapRack', { refs: { rack: rackRef } });
      },
    };
    const drillKeys = Object.keys(drills);

    async function verdict() {
      trainerRig.lookAt(app, traineeHead);
      if (Math.random() < 0.6) {
        trainerRig.play(app, 'nod');
        trainerRig.say(app, pick(TRAINER_PRAISE), { ms: 2200 });
      } else {
        trainerRig.play(app, 'headShake');
        trainerRig.say(app, pick(TRAINER_FIX), { ms: 2200 });
        trainee.lookAt(app, trainerHead);
        trainee.play(app, 'nod');
        trainee.say(app, pick(TRAINEE_REPLY), { ms: 1800 });
      }
      await wait(1400);
      trainee.lookAt(app, feltTarget);
    }

    let running = false, wantRun = false, acc = 0;
    async function loop() {
      running = true;
      await wait(2600);
      while (wantRun && alive()) {
        const key = pick(drillKeys);
        trainerRig.say(app, TRAINER_OPEN[key], { ms: 2200 });
        // eslint-disable-next-line no-await-in-loop
        await drills[key]().catch((err) => { console.error('[training]', err); return wait(1500); });
        if (!alive()) break;
        // eslint-disable-next-line no-await-in-loop
        await verdict();
        // eslint-disable-next-line no-await-in-loop
        await wait(1200 + Math.random() * 1800);
      }
      running = false;
    }

    const cx = (opts.rect.x0 + opts.rect.x1) / 2, cz = (opts.rect.z0 + opts.rect.z1) / 2;
    const hook = (dt) => {
      if (!alive()) return app.offFrame(hook);
      acc += dt;
      if (acc < TRAIN_CHECK) return;
      acc = 0;
      const p = app.player;
      wantRun = Math.hypot(p.x - cx, p.z - cz) < TRAIN_NEAR;
      if (wantRun && !running) loop();
    };
    hook.cancel = () => app.offFrame(hook);
    app.onFrame(hook);
  }

  // opts: { rect: {x0,x1,z0,z1}, signLines, trainer: {pos:[x,z], lookAt:[x,z]},
  //         tableGroup } — tableGroup is the closed table's own group; its
  //         dealerRig becomes the trainee for the ambient training show.
  C.floor.buildMaintenanceZone = (opts) => {
    const s = C.app.scene, A = C.assets;
    const { x0, x1, z0, z1 } = opts.rect;
    const g = new THREE.Group();

    const postMat = new THREE.MeshStandardMaterial({ color: '#23262c', metalness: 0.75, roughness: 0.4 });
    const railMat = new THREE.MeshStandardMaterial({ map: hazardTexture(A), roughness: 0.6, metalness: 0.05 });
    railMat.map.wrapS = THREE.RepeatWrapping;

    // edges as [ax, az, bx, bz]
    const edges = [
      [x0, z0, x1, z0],   // front (aisle)
      [x1, z0, x1, z1],   // east
      [x1, z1, x0, z1],   // back
      [x0, z1, x0, z0],   // west
    ];

    for (const [ax, az, bx, bz] of edges) {
      const horizontal = az === bz;
      const len = Math.abs(horizontal ? bx - ax : bz - az);

      // posts (corners included; shared corners just get two coincident posts
      // merged visually by identical position — skip the duplicate)
      const ts = chain(0, len, POST_STEP);
      for (const t of ts.slice(0, -1)) {   // last post is the next edge's first
        const px = horizontal ? ax + Math.sign(bx - ax) * t : ax;
        const pz = horizontal ? az : az + Math.sign(bz - az) * t;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(POST_R, POST_R, POST_H, 10), postMat);
        post.position.set(px, POST_H / 2, pz);
        post.castShadow = true;
        g.add(post);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(BASE_R, BASE_R * 1.15, 0.05, 14), postMat);
        base.position.set(px, 0.025, pz);
        base.receiveShadow = true;
        g.add(base);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), postMat);
        cap.position.set(px, POST_H, pz);
        g.add(cap);
      }

      // striped rails spanning the whole edge (one box per height, not per bay
      // — fewer meshes, and the stripe texture repeats along the length)
      for (const ry of RAIL_YS) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(horizontal ? len : RAIL_D, RAIL_H, horizontal ? RAIL_D : len),
          railMat,
        );
        rail.position.set((ax + bx) / 2, ry, (az + bz) / 2);
        rail.castShadow = true;
        g.add(rail);
      }

      // collision chain under the rail
      for (const t of chain(0, len, OBSTACLE_STEP)) {
        const ox = horizontal ? ax + Math.sign(bx - ax) * t : ax;
        const oz = horizontal ? az : az + Math.sign(bz - az) * t;
        C.world.addObstacle({ x: ox, z: oz, r: OBSTACLE_R });
      }
    }

    // ---- "TABLE CLOSED" placard hung on the top front rail, dead-centre in
    // front of the table and facing the aisle — the cage must read as closing
    // THIS table even before the A-frame sign is in view.
    const placTx = A.canvasTexture(512, 176, (ctx) => {
      ctx.fillStyle = '#f5f2ea'; ctx.fillRect(0, 0, 512, 176);
      ctx.strokeStyle = '#17181c'; ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, 504, 168);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#b3231e';
      ctx.font = "bold 58px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText('TABLE CLOSED', 256, 58);
      ctx.fillStyle = '#17181c';
      ctx.font = "bold 50px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText('荷官培訓中', 256, 128);
    });
    const placard = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.25),
      new THREE.MeshStandardMaterial({ map: placTx, roughness: 0.55, metalness: 0.05 }),
    );
    placard.position.set((x0 + x1) / 2, 0.64, z0 - 0.03);
    placard.rotation.y = Math.PI;   // face the aisle (-z)
    g.add(placard);

    // ---- A-frame signboard on the aisle side of the front rail. Offset off
    // the table's centre line (signDx) so the camera's approach pose never
    // lands inside the board.
    const cx = (x0 + x1) / 2 + (opts.signDx || 0);
    const signTx = signTexture(A, opts.signLines);
    const boardMat = new THREE.MeshStandardMaterial({ map: signTx, roughness: 0.55, metalness: 0.05 });
    const backMat = new THREE.MeshStandardMaterial({ color: '#d9d5ca', roughness: 0.7 });
    const BW = 0.78, BH = 0.98, LEAN = 0.24;
    const sign = new THREE.Group();
    // Two panels meeting at the top (bases spread ±sin(LEAN)·BH/2). BoxGeometry
    // material order is [+x,-x,+y,-y,+z,-z]: the aisle-side panel (side −1)
    // shows its −z face (index 5) to the aisle, the other its +z face (index 4).
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, 0.02),
        side === -1
          ? [backMat, backMat, backMat, backMat, backMat, boardMat]
          : [backMat, backMat, backMat, backMat, boardMat, backMat]);
      panel.position.set(0, BH / 2 * Math.cos(LEAN), side * (BH / 2) * Math.sin(LEAN));
      panel.rotation.x = -side * LEAN;
      panel.castShadow = true;
      sign.add(panel);
    }
    // pulsing amber beacon on top — animated via the shared onFrame idiom
    const beaconMat = new THREE.MeshBasicMaterial({ color: '#ffb020', fog: false });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), beaconMat);
    beacon.position.y = BH * Math.cos(LEAN) + 0.07;
    sign.add(beacon);
    const beaconStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06, 8), postMat);
    beaconStem.position.y = BH * Math.cos(LEAN) + 0.02;
    sign.add(beaconStem);
    C.app.onFrame((dt, t) => {
      beaconMat.color.setHSL(0.09, 1, 0.42 + 0.22 * Math.sin(t * 3.2));
    });
    // the sign faces -z (aisle side of the front rail): panel textures face
    // ±z already, so no yaw — just place it a step outside the rail line.
    sign.position.set(cx, 0, z0 - 0.55);
    g.add(sign);
    C.world.addObstacle({ x: cx, z: z0 - 0.55, r: 0.5 });

    // ---- traffic cones: one outside the front-east corner (inside the
    // corner post's blocked radius, so players can't clip it), one inside
    // near the back — the tight rect leaves no stool-free room at the front.
    const coneMat = new THREE.MeshStandardMaterial({ color: '#e8641e', roughness: 0.55 });
    const bandMat = new THREE.MeshStandardMaterial({ color: '#f2f0e8', roughness: 0.4 });
    for (const [px, pz] of [[x1 - 0.15, z0 - 0.45], [x1 - 0.5, z1 - 0.55]]) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.3), coneMat);
      base.position.set(px, 0.015, pz);
      g.add(base);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 14), coneMat);
      cone.position.set(px, 0.24, pz);
      cone.castShadow = true;
      g.add(cone);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.085, 0.09, 14), bandMat);
      band.position.set(px, 0.25, pz);
      g.add(band);
    }

    // ---- supervisor watching the dealer — it IS dealer training
    if (opts.trainer) {
      const t = A.makeDealer({ seed: 'trainer-supervisor', suit: '#2a3247', shirt: '#e8e4d8' });
      const [tx, tz] = opts.trainer.pos;
      const [lx, lz] = opts.trainer.lookAt;
      t.position.set(tx, 0, tz);
      t.rotation.y = Math.atan2(lx - tx, lz - tz);
      g.add(t);
      t.userData.idle(C.app);
      startTrainingShow(opts, t);
    }

    s.add(g);
    return g;
  };
})();
